import { Client, Databases } from 'node-appwrite';
import { MtnMomoClient } from './mtn-momo.js';

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const MTN_STATUS_MAP = {
  'SUCCESSFUL': 'completed',
  'FAILED': 'failed',
  'PENDING': 'processing',
  'EXPIRED': 'failed',
  'REJECTED': 'failed',
};

function toPaymentIntent(payment) {
  return {
    id: payment.$id,
    bookingId: payment.bookingId,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.paymentMethod,
    status: payment.paymentStatus,
    phone: payment.phone,
    transactionId: payment.transactionId || undefined,
    errorMessage: payment.errorMessage || undefined,
    createdAt: payment.$createdAt,
  };
}

export default async ({ req, res, log, error }) => {
  // --- Input Validation ---
  let body;
  try {
    body = JSON.parse(req.body);
  } catch {
    return res.json({ message: 'Missing paymentId' }, 400);
  }

  const { paymentId } = body;

  if (!paymentId) {
    return res.json({ message: 'Missing paymentId' }, 400);
  }

  // --- Appwrite Client Setup ---
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');

  const databases = new Databases(client);
  const databaseId = process.env.APPWRITE_DATABASE_ID || '231booking_db';

  try {
    // --- Fetch Payment ---
    log(`Fetching payment: ${paymentId}`);
    let payment;
    try {
      payment = await databases.getDocument(databaseId, 'payments', paymentId);
    } catch (err) {
      error(`Payment not found: ${paymentId} - ${err.message}`);
      return res.json({ message: 'Payment not found' }, 404);
    }

    // --- Short-Circuit for Terminal States ---
    if (['completed', 'failed', 'refunded'].includes(payment.paymentStatus)) {
      log(`Payment ${paymentId} already in terminal state: ${payment.paymentStatus}`);
      return res.json(toPaymentIntent(payment));
    }

    // --- Validate Transaction Reference ---
    if (!payment.transactionId) {
      return res.json({ message: 'Payment has no transaction reference' }, 400);
    }

    // --- Timeout Safety ---
    const createdAt = new Date(payment.$createdAt).getTime();
    if (Date.now() - createdAt > TIMEOUT_MS) {
      log(`Payment ${paymentId} timed out after 5 minutes`);
      await databases.updateDocument(databaseId, 'payments', paymentId, {
        paymentStatus: 'failed',
        errorMessage: 'Payment timed out — user did not approve within 5 minutes',
      });
      payment.paymentStatus = 'failed';
      payment.errorMessage = 'Payment timed out — user did not approve within 5 minutes';
      return res.json(toPaymentIntent(payment));
    }

    // --- Check MTN Status ---
    const momoClient = new MtnMomoClient({
      baseUrl: process.env.MTN_MOMO_BASE_URL,
      userId: process.env.MTN_MOMO_USER_ID,
      apiKey: process.env.MTN_MOMO_API_KEY,
      subscriptionKey: process.env.MTN_MOMO_SUBSCRIPTION_KEY,
      targetEnvironment: process.env.MTN_MOMO_TARGET_ENVIRONMENT,
      currency: process.env.MTN_MOMO_CURRENCY || 'EUR',
      callbackUrl: process.env.MTN_MOMO_CALLBACK_URL || '',
    });

    let mtnResponse;
    try {
      log(`Checking MTN status for transaction: ${payment.transactionId}`);
      mtnResponse = await momoClient.getTransactionStatus(payment.transactionId);
    } catch (err) {
      error(`MTN status check failed: ${err.message}`);
      // Don't fail — return current status so frontend keeps polling
      return res.json(toPaymentIntent(payment));
    }

    // --- Map MTN Status ---
    const newStatus = MTN_STATUS_MAP[mtnResponse.status] || 'processing';
    log(`MTN status: ${mtnResponse.status} → app status: ${newStatus}`);

    // --- Update Payment Record ---
    const updateData = {
      paymentStatus: newStatus,
      paymentProviderResponse: JSON.stringify(mtnResponse).substring(0, 5000),
    };

    if (newStatus === 'failed' && mtnResponse.reason) {
      updateData.errorMessage = `${mtnResponse.reason.code}: ${mtnResponse.reason.message}`;
    }

    await databases.updateDocument(databaseId, 'payments', paymentId, updateData);
    payment.paymentStatus = newStatus;
    payment.errorMessage = updateData.errorMessage || payment.errorMessage;

    // --- Update Booking on Success ---
    if (newStatus === 'completed') {
      log(`Payment completed. Confirming booking: ${payment.bookingId}`);
      try {
        await databases.updateDocument(databaseId, 'bookings', payment.bookingId, {
          status: 'confirmed',
          confirmedAt: new Date().toISOString(),
        });
        log(`Booking ${payment.bookingId} confirmed`);
      } catch (err) {
        error(`Failed to update booking ${payment.bookingId}: ${err.message}`);
      }
    }

    return res.json(toPaymentIntent(payment));
  } catch (err) {
    error(`Unexpected error: ${err.message}`);
    return res.json({ message: 'Internal server error' }, 500);
  }
};
