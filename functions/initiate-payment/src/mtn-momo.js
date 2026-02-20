import { v4 as uuidv4 } from 'uuid';

let cachedToken = null;
let tokenExpiresAt = 0;

export class MtnMomoClient {
  constructor({ baseUrl, userId, apiKey, subscriptionKey, targetEnvironment, currency, callbackUrl }) {
    this.baseUrl = baseUrl;
    this.userId = userId;
    this.apiKey = apiKey;
    this.subscriptionKey = subscriptionKey;
    this.targetEnvironment = targetEnvironment;
    this.currency = currency;
    this.callbackUrl = callbackUrl;
  }

  async getToken() {
    if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
      return cachedToken;
    }

    const credentials = Buffer.from(`${this.userId}:${this.apiKey}`).toString('base64');

    const response = await fetch(`${this.baseUrl}/collection/token/`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Ocp-Apim-Subscription-Key': this.subscriptionKey,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`MTN token request failed: ${response.status} ${body}`);
    }

    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in * 1000);
    return cachedToken;
  }

  async requestToPay({ amount, phone, externalId, payerMessage, payeeNote }) {
    const token = await this.getToken();
    const referenceId = uuidv4();

    const headers = {
      'Authorization': `Bearer ${token}`,
      'X-Reference-Id': referenceId,
      'X-Target-Environment': this.targetEnvironment,
      'Ocp-Apim-Subscription-Key': this.subscriptionKey,
      'Content-Type': 'application/json',
    };

    if (this.callbackUrl) {
      headers['X-Callback-Url'] = this.callbackUrl;
    }

    const body = {
      amount: String(amount),
      currency: this.currency,
      externalId: externalId,
      payer: {
        partyIdType: 'MSISDN',
        partyId: phone.replace('+', ''),
      },
      payerMessage: payerMessage || 'Payment for 231Booking',
      payeeNote: payeeNote || 'Booking payment',
    };

    const response = await fetch(`${this.baseUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (response.status !== 202) {
      const errorBody = await response.text();
      throw new Error(`MTN requestToPay failed: ${response.status} ${errorBody}`);
    }

    return { referenceId };
  }

  async getTransactionStatus(referenceId) {
    const token = await this.getToken();

    const response = await fetch(
      `${this.baseUrl}/collection/v1_0/requesttopay/${referenceId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Target-Environment': this.targetEnvironment,
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`MTN status check failed: ${response.status} ${errorBody}`);
    }

    return await response.json();
  }
}
