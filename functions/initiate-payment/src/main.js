import { Client, Databases, ID, Query } from 'node-appwrite';
import { MtnMomoClient } from './mtn-momo.js';

export default async ({ req, res, log, error }) => {
  // --- Input Validation ---
  let body;
  try {
    body = JSON.parse(req.body);
  } catch {
    return res.json({ message: 'Invalid JSON body' }, 400);
  }

  const { bookingId, amount, method, phone } = body;

  if (!bookingId || !amount || !method || !phone) {
    return res.json(
      { message: 'Missing required fields: bookingId, amount, method, phone' },
      400
    );
  }

  if (method !== 'mtn_money') {
    return res.json(
      { message: 'Only mtn_money is currently supported' },
      400
    );
  }

  // --- Appwrite Client Setup ---
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');

  const databases = new Databases(client);
  const databaseId = process.env.APPWRITE_DATABASE_ID || '231booking_db';

  try {
    // --- Booking Verification ---
    log(`Fetching booking: ${bookingId}`);
    let booking;
    try {
      booking = await databases.getDocument(databaseId, 'bookings', bookingId);
    } catch (err) {
      error(`Booking not found: ${bookingId} - ${err.message}`);
      return res.json({ message: 'Booking not found' }, 404);
    }

    // --- Idempotency Check ---
    log(`Checking for existing payments for booking: ${bookingId}`);
    const existingPayments = await databases.listDocuments(
      databaseId,
      'payments',
      [Query.equal('bookingId', bookingId)]
    );

    if (existingPayments.total > 0) {
      const existing = existingPayments.documents[0];

      if (existing.paymentStatus === 'completed') {
        return res.json(
          { message: 'Payment already completed for this booking' },
          409
        );
      }

      if (existing.paymentStatus === 'pending' || existing.paymentStatus === 'processing') {
        log(`Returning existing ${existing.paymentStatus} payment: ${existing.$id}`);
        return res.json({
          id: existing.$id,
          bookingId: existing.bookingId,
          amount: existing.amount,
          currency: existing.currency,
          method: existing.paymentMethod,
          status: existing.paymentStatus,
          phone: existing.phone,
          transactionId: existing.transactionId || undefined,
          createdAt: existing.$createdAt,
        });
      }
    }

    // --- Create Payment Record ---
    const currency = process.env.MTN_MOMO_CURRENCY || 'EUR';

    log(`Creating payment record for booking: ${bookingId}`);
    const paymentDoc = await databases.createDocument(
      databaseId,
      'payments',
      ID.unique(),
      {
        bookingId,
        userId: booking.userId,
        amount,
        totalAmount: amount,
        paymentMethod: 'mtn_money',
        currency,
        paymentStatus: 'pending',
        phone,
      }
    );

    log(`Payment record created: ${paymentDoc.$id}`);

    // --- Call MTN MoMo API ---
    const momoClient = new MtnMomoClient({
      baseUrl: process.env.MTN_MOMO_BASE_URL,
      userId: process.env.MTN_MOMO_USER_ID,
      apiKey: process.env.MTN_MOMO_API_KEY,
      subscriptionKey: process.env.MTN_MOMO_SUBSCRIPTION_KEY,
      targetEnvironment: process.env.MTN_MOMO_TARGET_ENVIRONMENT,
      currency,
      callbackUrl: process.env.MTN_MOMO_CALLBACK_URL || '',
    });

    let mtnResult;
    try {
      log(`Initiating MTN requestToPay for payment: ${paymentDoc.$id}`);
      mtnResult = await momoClient.requestToPay({
        amount,
        phone: phone.replace('+', ''),
        externalId: paymentDoc.$id,
        payerMessage: `Payment for booking ${bookingId}`,
        payeeNote: `231Booking payment ${paymentDoc.$id}`,
      });
    } catch (err) {
      error(`MTN requestToPay failed: ${err.message}`);
      await databases.updateDocument(databaseId, 'payments', paymentDoc.$id, {
        paymentStatus: 'failed',
        errorMessage: err.message,
        paymentProviderResponse: JSON.stringify({ error: err.message }),
      });
      return res.json(
        { message: 'Payment provider error. Please try again.' },
        502
      );
    }

    // --- Update Payment & Return ---
    log(`MTN requestToPay successful. Reference: ${mtnResult.referenceId}`);
    await databases.updateDocument(databaseId, 'payments', paymentDoc.$id, {
      transactionId: mtnResult.referenceId,
      paymentStatus: 'processing',
    });

    return res.json({
      id: paymentDoc.$id,
      bookingId,
      amount,
      currency,
      method: 'mtn_money',
      status: 'processing',
      phone,
      transactionId: mtnResult.referenceId,
      createdAt: paymentDoc.$createdAt,
    });
  } catch (err) {
    error(`Unexpected error: ${err.message}`);
    return res.json({ message: 'Internal server error' }, 500);
  }
};
