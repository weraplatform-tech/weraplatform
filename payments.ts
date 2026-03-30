import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../lib/supabase';
import { initiateStkPush, queryMpesaStatus } from '../services/mpesa';
import { AuthRequest } from '../middleware/auth';

export const paymentsRouter = Router();

// ── Initiate M-Pesa STK Push ──────────────────────────────────
paymentsRouter.post('/mpesa/stk-push', [
  body('booking_id').isUUID(),
  body('phone').matches(/^(254|0)[7][0-9]{8}$/),
], async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { booking_id, phone } = req.body;
  const userId = req.user!.id;

  try {
    // Fetch booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('id, booking_ref, quoted_amount_kes, status, client_id')
      .eq('id', booking_id)
      .eq('client_id', userId)
      .single();

    if (bookingError || !booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'accepted') return res.status(400).json({ error: 'Booking must be accepted before payment' });

    const amount = parseFloat(booking.quoted_amount_kes);

    // Initiate STK Push
    const stkResult = await initiateStkPush({
      phone,
      amount,
      accountRef: booking.booking_ref,
      description: `Wera Service Payment - ${booking.booking_ref}`,
    });

    if (stkResult.ResponseCode !== '0') {
      return res.status(400).json({ error: 'STK Push failed', details: stkResult.ResponseDescription });
    }

    // Record pending payment
    const { data: payment } = await supabaseAdmin.from('payments').insert({
      booking_id,
      payer_id: userId,
      recipient_id: booking.client_id,
      amount_kes: amount,
      platform_fee_kes: amount * 0.15,
      net_amount_kes: amount * 0.85,
      method: 'mpesa',
      status: 'processing',
      metadata: {
        checkout_request_id: stkResult.CheckoutRequestID,
        merchant_request_id: stkResult.MerchantRequestID,
        phone,
      },
    }).select().single();

    return res.json({
      message: 'STK Push sent. Waiting for customer confirmation.',
      checkout_request_id: stkResult.CheckoutRequestID,
      payment_id: payment?.id,
    });
  } catch (err) {
    console.error('[M-Pesa Error]', err);
    return res.status(500).json({ error: 'Payment initiation failed' });
  }
});

// ── M-Pesa Callback (Safaricom → Wera) ───────────────────────
paymentsRouter.post('/mpesa/callback', async (req, res) => {
  const { Body } = req.body;
  const result = Body?.stkCallback;

  if (!result) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  try {
    const checkoutId = result.CheckoutRequestID;
    const success = result.ResultCode === 0;

    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('id, booking_id, amount_kes, payer_id')
      .contains('metadata', { checkout_request_id: checkoutId })
      .single();

    if (!payment) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    if (success) {
      const items = result.CallbackMetadata?.Item || [];
      const mpesaRef = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;

      // Update payment
      await supabaseAdmin.from('payments').update({
        status: 'escrowed',
        mpesa_ref: checkoutId,
        mpesa_receipt: mpesaRef,
      }).eq('id', payment.id);

      // Update booking status
      await supabaseAdmin.from('bookings').update({ status: 'in_progress' }).eq('id', payment.booking_id);

      // Escrow: hold in platform
      await supabaseAdmin.from('wallet_transactions').insert({
        wallet_id: (await supabaseAdmin.from('wallets').select('id').eq('user_id', payment.payer_id).single()).data?.id,
        type: 'escrow_hold',
        amount_kes: payment.amount_kes,
        balance_after_kes: 0,
        reference: mpesaRef,
        description: 'Payment escrowed for service',
        booking_id: payment.booking_id,
      });

      // Notify provider
      const { data: booking } = await supabaseAdmin
        .from('bookings').select('provider_id, booking_ref').eq('id', payment.booking_id).single();
      if (booking) {
        await supabaseAdmin.from('notifications').insert({
          user_id: booking.provider_id,
          type: 'payment',
          title: 'Payment Received',
          body: `Payment of KES ${payment.amount_kes.toLocaleString()} received for booking ${booking.booking_ref}.`,
          action_url: `/bookings/${payment.booking_id}`,
        });
      }
    } else {
      await supabaseAdmin.from('payments').update({ status: 'failed' }).eq('id', payment.id);
    }

    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('[M-Pesa Callback Error]', err);
    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' }); // Always 200 to Safaricom
  }
});

// ── Release escrow (on booking completion) ───────────────────
paymentsRouter.post('/release-escrow/:booking_id', async (req: AuthRequest, res) => {
  const { booking_id } = req.params;
  const userId = req.user!.id;

  try {
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('*, payments(id, net_amount_kes, status)')
      .eq('id', booking_id)
      .eq('client_id', userId)
      .single();

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'completed') return res.status(400).json({ error: 'Booking must be marked complete first' });

    const payment = booking.payments?.[0];
    if (!payment || payment.status !== 'escrowed') {
      return res.status(400).json({ error: 'No escrowed payment found' });
    }

    // Release to provider wallet
    await supabaseAdmin.from('payments').update({
      status: 'completed',
      escrow_released: true,
      escrow_release_at: new Date().toISOString(),
    }).eq('id', payment.id);

    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id, balance_kes')
      .eq('user_id', booking.provider_id)
      .single();

    if (wallet) {
      const newBalance = parseFloat(wallet.balance_kes) + parseFloat(payment.net_amount_kes);
      await supabaseAdmin.from('wallets').update({
        balance_kes: newBalance,
        total_earned_kes: supabaseAdmin.rpc('increment', { x: payment.net_amount_kes }),
      }).eq('id', wallet.id);

      await supabaseAdmin.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        type: 'escrow_release',
        amount_kes: payment.net_amount_kes,
        balance_after_kes: newBalance,
        reference: booking.booking_ref,
        description: 'Escrow released after service completion',
        booking_id,
      });
    }

    return res.json({ message: 'Escrow released. Provider has been paid.', net_amount_kes: payment.net_amount_kes });
  } catch (err) {
    return res.status(500).json({ error: 'Escrow release failed' });
  }
});

// ── Payment history ───────────────────────────────────────────
paymentsRouter.get('/history', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { page = '1', limit = '20' } = req.query as Record<string, string>;
  const pageNum = parseInt(page);
  const limitNum = Math.min(50, parseInt(limit));

  try {
    const { data, error, count } = await supabaseAdmin
      .from('payments')
      .select('*, bookings(booking_ref, title)', { count: 'exact' })
      .or(`payer_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .range((pageNum - 1) * limitNum, pageNum * limitNum - 1);

    if (error) throw error;
    return res.json({ payments: data, total: count });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});
