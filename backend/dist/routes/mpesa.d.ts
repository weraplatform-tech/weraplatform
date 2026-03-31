/**
 * WERA — M-Pesa Daraja API Service
 * Safaricom STK Push | Acuity Workspace
 * Currency: KES
 */
export interface StkPushParams {
    phone: string;
    amount: number;
    accountRef: string;
    description: string;
}
export declare function initiateStkPush(params: StkPushParams): Promise<any>;
export declare function queryMpesaStatus(checkoutRequestId: string): Promise<any>;
//# sourceMappingURL=mpesa.d.ts.map