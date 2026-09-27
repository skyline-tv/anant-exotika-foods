const crypto = require('crypto');
const WebhookEvent = require('../models/WebhookEvent');

const claimWebhookEvent = async (provider, eventId) => {
  const id = String(eventId || '').trim().slice(0, 200);
  if (!id) return { claimed: true, key: '' };

  const key = `${provider}:${id}`;
  try {
    await WebhookEvent.create({ provider, eventId: key });
    return { claimed: true, key };
  } catch (error) {
    if (error.code === 11000) return { claimed: false, key };
    throw error;
  }
};

const releaseWebhookEvent = async (key) => {
  if (!key) return;
  await WebhookEvent.deleteOne({ eventId: key });
};

const hashEvent = (value) =>
  crypto.createHash('sha256').update(String(value || '')).digest('hex');

module.exports = {
  claimWebhookEvent,
  releaseWebhookEvent,
  hashEvent,
};
