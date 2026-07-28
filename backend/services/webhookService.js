// services/webhookService.js — Sends events to bot's registered webhook URL
const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');

const WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET || 'webhook-secret-change-in-production';

/**
 * Retrieve the bot's registered webhook URL from the database.
 * We store it in bot_settings table with key='bot_webhook_url'.
 */
async function getWebhookUrl() {
  try {
    const { data } = await supabaseAdmin
      .from('bot_settings')
      .select('value')
      .eq('key', 'bot_webhook_url')
      .maybeSingle();

    return data?.value || null;
  } catch (err) {
    console.error('[WEBHOOK] Error fetching webhook URL:', err.message);
    return null;
  }
}

/**
 * Emit an event to the bot's webhook.
 *
 * @param {string} event - Event name (e.g. 'competition.status_changed')
 * @param {object} payload - Data to send with the event
 */
async function emitWebhook(event, payload) {
  const webhookUrl = await getWebhookUrl();
  if (!webhookUrl) {
    // No webhook registered — silently skip
    return;
  }

  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  // Create HMAC signature for the bot to verify the request came from us
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event,
      },
      body,
      // Timeout after 10 seconds so we don't slow down the main request
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`[WEBHOOK] Bot returned ${response.status} for event "${event}"`);
    }
  } catch (err) {
    // Webhook failures must never crash the main operation
    console.error(`[WEBHOOK] Failed to send event "${event}": ${err.message}`);
  }
}

module.exports = { emitWebhook, getWebhookUrl };