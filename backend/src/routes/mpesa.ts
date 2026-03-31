/**
 * WERA — M-Pesa Daraja API Service
 * Safaricom STK Push | Acuity Workspace
 * Currency: KES
 */

import axios from 'axios';

const MPESA_BASE = process.env.MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

async function getMpesaToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY!;
  const secret = process.env.MPESA_CONSUMER_SECRET!;
  const credentials = Buffer.from(`${key}:${secret}`).toString('base64');

  const { data } = await axios.get(
    `${MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${credentials}` } }
  );
  return data.access_token;
}

function getMpesaTimestamp(): string {
  return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
}

function getMpesaPassword(timestamp: string): string {
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey = process.env.MPESA_PASSKEY!;
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
}

export interface StkPushParams {
  phone: string;        // 254XXXXXXXXX format
  amount: number;       // KES
  accountRef: string;   // e.g. booking ref WR-XXXXXXXX
  description: string;
}

export async function initiateStkPush(params: StkPushParams) {
  const token = await getMpesaToken();
  const timestamp = getMpesaTimestamp();
  const password = getMpesaPassword(timestamp);

  const phone = params.phone.startsWith('0')
    ? '254' + params.phone.slice(1)
    : params.phone;

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.ceil(params.amount), // Always integer KES
    PartyA: phone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: params.accountRef,
    TransactionDesc: params.description,
  };

  const { data } = await axios.post(
    `${MPESA_BASE}/mpesa/stkpush/v1/processrequest`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return data;
}

export async function queryMpesaStatus(checkoutRequestId: string) {
  const token = await getMpesaToken();
  const timestamp = getMpesaTimestamp();
  const password = getMpesaPassword(timestamp);

  const { data } = await axios.post(
    `${MPESA_BASE}/mpesa/stkpushquery/v1/query`,
    {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}
