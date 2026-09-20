const { Resend } = require('resend');

const BRAND = {
  name: 'Anant Exotika Foods',
  ivory: '#f8f5f0',
  cream: '#f3eee6',
  gold: '#c9a227',
  green: '#034a2a',
  muted: '#6b6b6b',
  dark: '#1a1a1a',
};

const getFromAddress = () =>
  process.env.EMAIL_FROM || 'Anant Exotika Foods <onboarding@resend.dev>';

const getClientUrl = () =>
  String(process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

const getResend = () => {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const emailShell = ({ title, preview, body }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.ivory};font-family:Georgia,'Times New Roman',serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.ivory};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid rgba(201,162,39,0.28);">
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid ${BRAND.cream};text-align:center;">
              <p style="margin:0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${BRAND.gold};">
                ${escapeHtml(BRAND.name)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:${BRAND.dark};font-size:16px;line-height:1.65;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;background:${BRAND.cream};border-top:1px solid rgba(201,162,39,0.2);text-align:center;">
              <p style="margin:0;font-size:12px;color:${BRAND.muted};letter-spacing:0.04em;">
                Premium dry fruits &amp; thoughtful gifting
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:${BRAND.green};">
                ${escapeHtml(BRAND.name)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const ctaButton = (href, label) => `
  <p style="margin:28px 0 8px;text-align:center;">
    <a href="${escapeHtml(href)}"
       style="display:inline-block;padding:14px 28px;background:${BRAND.green};color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;">
      ${escapeHtml(label)}
    </a>
  </p>
`;

const sendEmail = async ({ to, subject, html, text }) => {
  const resend = getResend();
  if (!resend) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[email] RESEND_API_KEY is not configured. Email not sent.');
      return { skipped: true };
    }
    console.info('[email] RESEND_API_KEY missing — email skipped in development.', { to, subject });
    return { skipped: true };
  }

  const result = await resend.emails.send({
    from: getFromAddress(),
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  });

  if (result.error) {
    const message = result.error.message || 'Failed to send email.';
    const error = new Error(message);
    error.code = result.error.name || 'RESEND_ERROR';
    throw error;
  }

  return result.data;
};

const sendPasswordResetEmail = async ({ to, name, resetToken }) => {
  const resetUrl = `${getClientUrl()}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const subject = 'Reset your Anant Exotika Foods password';
  const html = emailShell({
    title: subject,
    preview: 'Reset your password securely. This link expires in one hour.',
    body: `
      <p style="margin:0 0 12px;font-size:22px;color:${BRAND.green};">Hello ${escapeHtml(name || 'there')},</p>
      <p style="margin:0 0 12px;color:${BRAND.muted};font-family:Arial,Helvetica,sans-serif;font-size:15px;">
        We received a request to reset the password for your Anant Exotika Foods account.
        Use the button below to choose a new password. This link expires in one hour and can only be used once.
      </p>
      ${ctaButton(resetUrl, 'Reset password')}
      <p style="margin:20px 0 0;color:${BRAND.muted};font-family:Arial,Helvetica,sans-serif;font-size:13px;">
        If you did not request this, you can safely ignore this email. Your password will remain unchanged.
      </p>
      <p style="margin:16px 0 0;color:${BRAND.muted};font-family:Arial,Helvetica,sans-serif;font-size:12px;word-break:break-all;">
        Or open this link: ${escapeHtml(resetUrl)}
      </p>
    `,
  });
  const text = [
    `Hello ${name || 'there'},`,
    '',
    'Reset your Anant Exotika Foods password using this link (expires in one hour):',
    resetUrl,
    '',
    'If you did not request this, ignore this email.',
  ].join('\n');

  return sendEmail({ to, subject, html, text });
};

const formatMoney = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const formatAddressBlock = (address) => {
  if (!address) return '';
  const lines = [
    address.fullName,
    address.addressLine1,
    address.addressLine2,
    address.landmark,
    [address.city, address.state, address.postalCode].filter(Boolean).join(', '),
    address.phone ? `Phone: ${address.phone}` : '',
  ].filter(Boolean);
  return lines.map((line) => escapeHtml(line)).join('<br />');
};

const sendOrderConfirmationEmail = async ({ to, name, order }) => {
  if (!to || !order) return { skipped: true };
  const orderUrl = `${getClientUrl()}/account/orders/${order._id}`;
  const subject = `Order confirmed — ${order.orderNumber}`;
  const itemsHtml = (order.items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid ${BRAND.cream};font-family:Arial,Helvetica,sans-serif;font-size:14px;">
          ${escapeHtml(item.name)} × ${escapeHtml(item.quantity)}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid ${BRAND.cream};text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
          ${escapeHtml(formatMoney(item.total))}
        </td>
      </tr>`
    )
    .join('');

  const html = emailShell({
    title: subject,
    preview: `Thank you for your order ${order.orderNumber}.`,
    body: `
      <p style="margin:0 0 12px;font-size:22px;color:${BRAND.green};">Thank you, ${escapeHtml(name || 'there')}</p>
      <p style="margin:0 0 16px;color:${BRAND.muted};font-family:Arial,Helvetica,sans-serif;font-size:15px;">
        Your order <strong style="color:${BRAND.dark};">${escapeHtml(order.orderNumber)}</strong> has been received.
        We will keep you updated as it progresses.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemsHtml}</table>
      <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;">
        <strong>Total:</strong> ${escapeHtml(formatMoney(order.pricing?.total))}
      </p>
      <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.muted};">
        <strong style="color:${BRAND.dark};">Delivery address</strong><br />
        ${formatAddressBlock(order.shippingAddress)}
      </p>
      ${ctaButton(orderUrl, 'View order')}
    `,
  });
  const text = [
    `Thank you, ${name || 'there'}.`,
    `Your order ${order.orderNumber} has been received.`,
    `Total: ${formatMoney(order.pricing?.total)}`,
    `View order: ${orderUrl}`,
  ].join('\n');

  return sendEmail({ to, subject, html, text });
};

const sendOrderStatusEmail = async ({ to, name, order, status }) => {
  if (!to || !order) return { skipped: true };
  const orderUrl = `${getClientUrl()}/account/orders/${order._id}`;
  const label = String(status || order.orderStatus || '').replace(/_/g, ' ');
  const subject = `Order ${order.orderNumber} — ${label}`;
  const html = emailShell({
    title: subject,
    preview: `Your order is now ${label}.`,
    body: `
      <p style="margin:0 0 12px;font-size:22px;color:${BRAND.green};">Hello ${escapeHtml(name || 'there')},</p>
      <p style="margin:0 0 16px;color:${BRAND.muted};font-family:Arial,Helvetica,sans-serif;font-size:15px;">
        An update on your order <strong style="color:${BRAND.dark};">${escapeHtml(order.orderNumber)}</strong>:
        it is now <strong style="color:${BRAND.gold};">${escapeHtml(label)}</strong>.
      </p>
      ${ctaButton(orderUrl, 'View order')}
    `,
  });
  const text = [
    `Hello ${name || 'there'},`,
    `Your order ${order.orderNumber} is now ${label}.`,
    `View order: ${orderUrl}`,
  ].join('\n');

  return sendEmail({ to, subject, html, text });
};

const sendWelcomeEmail = async ({ to, name }) => {
  if (!to) return { skipped: true };
  const shopUrl = `${getClientUrl()}/shop`;
  const subject = 'Welcome to Anant Exotika Foods';
  const html = emailShell({
    title: subject,
    preview: 'Your account is ready. Explore premium dry fruits and gifting.',
    body: `
      <p style="margin:0 0 12px;font-size:22px;color:${BRAND.green};">Welcome, ${escapeHtml(name || 'there')}</p>
      <p style="margin:0 0 16px;color:${BRAND.muted};font-family:Arial,Helvetica,sans-serif;font-size:15px;">
        Your Anant Exotika Foods account is ready. Discover premium dry fruits and thoughtfully curated hampers for every occasion.
      </p>
      ${ctaButton(shopUrl, 'Explore the collection')}
    `,
  });
  const text = [
    `Welcome, ${name || 'there'}.`,
    'Your Anant Exotika Foods account is ready.',
    `Shop: ${shopUrl}`,
  ].join('\n');

  return sendEmail({ to, subject, html, text });
};

const safeSend = async (fn, ...args) => {
  try {
    return await fn(...args);
  } catch (error) {
    console.error('[email] Failed to send email:', error.message || error);
    return { error: true, message: error.message };
  }
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendWelcomeEmail,
  safeSend,
  getClientUrl,
};
