const { log, redact } = require('../utils/logger');

const maskPhone = (phone) => {
  const value = String(phone || '');
  if (value.length < 4) return '[redacted]';
  return `******${value.slice(-4)}`;
};

const sendPhoneOtp = async ({ phone, code }) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (!authKey || !templateId) {
    log(process.env.NODE_ENV === 'production' ? 'warn' : 'info', 'sms skipped because MSG91 is not configured', {
      phone: maskPhone(phone),
    });
    return { skipped: true };
  }

  try {
    const response = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: {
        authkey: authKey,
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: templateId,
        mobile: `91${phone}`,
        otp: String(code),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.type === 'error') {
      log('error', 'sms send failed', {
        phone: maskPhone(phone),
        message: redact(payload.message || response.statusText || 'Failed to send SMS.'),
      });
      return { error: true };
    }
    return { sent: true };
  } catch (error) {
    log('error', 'sms send failed', {
      phone: maskPhone(phone),
      message: redact(error.message || 'Failed to send SMS.'),
    });
    return { error: true };
  }
};

module.exports = { sendPhoneOtp };
