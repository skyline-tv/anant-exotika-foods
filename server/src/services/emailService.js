const { Resend } = require('resend');
const { log, redact } = require('../utils/logger');

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

const SUPPORT_EMAIL = 'info@anantexotika.in';
const SUPPORT_PHONE = '+91 96230 79356';

const getResend = () => {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
};

const maskRecipient = (value) => {
  const email = String(value || '');
  const at = email.indexOf('@');
  if (at <= 0) return '[redacted]';
  return `${email.slice(0, 2)}***${email.slice(at)}`;
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
    log(
      process.env.NODE_ENV === 'production' ? 'warn' : 'info',
      'email skipped because RESEND_API_KEY is not configured',
      { subject, to: maskRecipient(Array.isArray(to) ? to[0] : to) }
    );
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
    const message = redact(result.error.message || 'Failed to send email.');
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

const formatWhen = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const paymentLabel = (method) => {
  if (method === 'cod') return 'Cash on Delivery';
  if (method === 'razorpay') return 'Online payment';
  return method ? String(method) : 'Payment';
};

const orderNumberLabel = (orderNumber) => {
  const value = String(orderNumber || '').replace(/^#/, '');
  return value ? `#${value}` : '';
};

const STATUS_COPY = {
  pending: {
    verb: 'has been received',
    detail: 'We have received your order and will confirm it shortly.',
  },
  confirmed: {
    verb: 'has been confirmed',
    detail: 'Your order is confirmed and will be prepared for dispatch.',
  },
  processing: {
    verb: 'is being prepared',
    detail: 'We are preparing your order.',
  },
  packed: {
    verb: 'has been packed',
    detail: 'Your order is packed and will be handed to the courier shortly.',
  },
  shipped: {
    verb: 'has been shipped',
    detail: 'Your order is on its way.',
  },
  out_for_delivery: {
    verb: 'is out for delivery',
    detail: 'Your order is out for delivery.',
  },
  delivered: {
    verb: 'has been delivered',
    detail: 'Your order has been delivered. We hope it is a pleasure to receive.',
  },
  cancelled: {
    verb: 'has been cancelled',
    detail: 'This order has been cancelled. If you did not request this, please contact us.',
  },
  returned: {
    verb: 'has been returned',
    detail: 'A return has been recorded for this order.',
  },
  refunded: {
    verb: 'has been refunded',
    detail: 'A refund has been recorded for this order and will return to the original payment method where applicable.',
  },
  failed: {
    verb: 'could not be completed',
    detail: 'This order was not completed.',
  },
};

const statusCopy = (status, orderNumber) => {
  const key = String(status || '').toLowerCase();
  const copy = STATUS_COPY[key] || {
    verb: `is now ${key.replace(/_/g, ' ') || 'updated'}`,
    detail: 'There is an update on your order.',
  };
  const number = orderNumberLabel(orderNumber);
  return {
    ...copy,
    label: key.replace(/_/g, ' '),
    subject: `Your order ${number} ${copy.verb}`.replace(/\s+/g, ' ').trim(),
  };
};

const shouldNotifyOrderStatus = (previousStatus, nextStatus) =>
  Boolean(nextStatus) && previousStatus !== nextStatus;

const paragraph = (text) =>
  `<p style="margin:0 0 12px;color:${BRAND.muted};font-family:Arial,Helvetica,sans-serif;font-size:15px;">${text}</p>`;

const summaryRow = (label, value) => `
  <tr>
    <td style="padding:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.muted};">${escapeHtml(label)}</td>
    <td style="padding:4px 0;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.dark};">${escapeHtml(value)}</td>
  </tr>`;

const selectionSummary = (item) =>
  (item.selections || [])
    .map((selection) => `${selection.slotLabel}: ${selection.name}`)
    .filter(Boolean)
    .join(' · ');

const orderItemsTable = (order) => {
  const rows = (order.items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${BRAND.cream};font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.dark};">
          <strong>${escapeHtml(item.name)}</strong><br />
          ${selectionSummary(item) ? `<span style="color:${BRAND.muted};">${escapeHtml(selectionSummary(item))}</span><br />` : ''}
          <span style="color:${BRAND.muted};">Qty ${escapeHtml(item.quantity)} · ${escapeHtml(formatMoney(item.price))} each</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid ${BRAND.cream};text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.dark};vertical-align:top;">
          ${escapeHtml(formatMoney(item.total))}
        </td>
      </tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
};

const pricingTable = (order) => {
  const pricing = order.pricing || {};
  const rows = [
    summaryRow('Subtotal', formatMoney(pricing.subtotal)),
    Number(pricing.discount) > 0 ? summaryRow('Discount', `-${formatMoney(pricing.discount)}`) : '',
    summaryRow('Shipping', Number(pricing.shipping) > 0 ? formatMoney(pricing.shipping) : 'Free'),
    Number(pricing.packaging) > 0 ? summaryRow('Packaging', formatMoney(pricing.packaging)) : '',
    Number(pricing.handling) > 0 ? summaryRow('Handling', formatMoney(pricing.handling)) : '',
    Number(pricing.codFee) > 0 ? summaryRow('COD fee', formatMoney(pricing.codFee)) : '',
    Number(pricing.tax) > 0 ? summaryRow('Tax', formatMoney(pricing.tax)) : '',
    summaryRow('Total', formatMoney(pricing.total)),
  ].join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">${rows}</table>`;
};

const orderFacts = (order, statusName = order?.orderStatus) => {
  const placed = formatWhen(order.createdAt);
  const status = statusCopy(statusName, order.orderNumber);
  return `
    ${paragraph(`Order <strong style="color:${BRAND.dark};">${escapeHtml(orderNumberLabel(order.orderNumber))}</strong>${placed ? ` · ${escapeHtml(placed)} IST` : ''}`)}
    ${paragraph(`Status: <strong style="color:${BRAND.gold};">${escapeHtml(status.label)}</strong>`)}
    ${paragraph(`Payment: ${escapeHtml(paymentLabel(order.payment?.method))}`)}
  `;
};

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
  const number = orderNumberLabel(order.orderNumber);
  const subject = `Order confirmed — ${number}`;
  const itemLines = (order.items || [])
    .map((item) => {
      const picks = selectionSummary(item);
      return `${item.name}${picks ? ` (${picks})` : ''} · Qty ${item.quantity} · ${formatMoney(item.price)} each · ${formatMoney(item.total)}`;
    })
    .join('\n');
  const html = emailShell({
    title: subject,
    preview: `Thank you. Order ${number} is confirmed.`,
    body: `
      <p style="margin:0 0 12px;font-size:22px;color:${BRAND.green};">Thank you, ${escapeHtml(name || 'there')}</p>
      ${paragraph(`Your order <strong style="color:${BRAND.dark};">${escapeHtml(number)}</strong> is confirmed. We will write again as it progresses.`)}
      ${orderFacts(order)}
      ${orderItemsTable(order)}
      ${pricingTable(order)}
      <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.muted};">
        <strong style="color:${BRAND.dark};">Delivery address</strong><br />
        ${formatAddressBlock(order.shippingAddress)}
      </p>
      ${ctaButton(orderUrl, 'View order')}
    `,
  });
  const pricing = order.pricing || {};
  const text = [
    `Thank you, ${name || 'there'}.`,
    `Order confirmed — ${number}`,
    `Placed: ${formatWhen(order.createdAt)} IST`,
    `Status: ${String(order.orderStatus || 'confirmed').replace(/_/g, ' ')}`,
    `Payment: ${paymentLabel(order.payment?.method)}`,
    '',
    itemLines,
    '',
    `Subtotal: ${formatMoney(pricing.subtotal)}`,
    Number(pricing.discount) > 0 ? `Discount: -${formatMoney(pricing.discount)}` : '',
    `Shipping: ${Number(pricing.shipping) > 0 ? formatMoney(pricing.shipping) : 'Free'}`,
    `Total: ${formatMoney(pricing.total)}`,
    '',
    'Delivery address:',
    [order.shippingAddress?.fullName, order.shippingAddress?.addressLine1, order.shippingAddress?.city, order.shippingAddress?.postalCode].filter(Boolean).join(', '),
    '',
    `View order: ${orderUrl}`,
  ].filter((line) => line !== '').join('\n');

  return sendEmail({ to, subject, html, text });
};

const sendOrderStatusEmail = async ({ to, name, order, status }) => {
  if (!to || !order) return { skipped: true };
  const orderUrl = `${getClientUrl()}/account/orders/${order._id}`;
  const current = status || order.orderStatus;
  const copy = statusCopy(current, order.orderNumber);
  const html = emailShell({
    title: copy.subject,
    preview: copy.subject,
    body: `
      <p style="margin:0 0 12px;font-size:22px;color:${BRAND.green};">Hello ${escapeHtml(name || 'there')},</p>
      ${paragraph(`${escapeHtml(copy.subject)}. ${escapeHtml(copy.detail)}`)}
      ${orderFacts(order, current)}
      ${orderItemsTable(order)}
      ${paragraph(`Total: <strong style="color:${BRAND.dark};">${escapeHtml(formatMoney(order.pricing?.total))}</strong>`)}
      ${ctaButton(orderUrl, 'View order')}
      ${paragraph(`Questions? Write to <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.green};">${SUPPORT_EMAIL}</a> or call ${escapeHtml(SUPPORT_PHONE)}.`)}
    `,
  });
  const text = [
    `Hello ${name || 'there'},`,
    copy.subject,
    copy.detail,
    `Order: ${orderNumberLabel(order.orderNumber)}`,
    `Status: ${copy.label}`,
    `Total: ${formatMoney(order.pricing?.total)}`,
    `View order: ${orderUrl}`,
    `Contact: ${SUPPORT_EMAIL} · ${SUPPORT_PHONE}`,
  ].join('\n');

  return sendEmail({ to, subject: copy.subject, html, text });
};

const sendWelcomeEmail = async ({ to, name }) => {
  if (!to) return { skipped: true };
  const storeUrl = getClientUrl();
  const subject = 'Welcome to Anant Exotika Foods';
  const html = emailShell({
    title: subject,
    preview: 'Your account is ready. Explore premium dry fruits and gifting.',
    body: `
      <p style="margin:0 0 12px;font-size:22px;color:${BRAND.green};">Welcome, ${escapeHtml(name || 'there')}</p>
      ${paragraph('Your Anant Exotika Foods account is ready. Discover premium dry fruits and thoughtfully curated hampers for every occasion.')}
      ${ctaButton(storeUrl, 'Visit the store')}
      ${paragraph(`Or open ${escapeHtml(storeUrl)}`)}
    `,
  });
  const text = [
    `Welcome, ${name || 'there'}.`,
    'Your Anant Exotika Foods account is ready.',
    `Visit the store: ${storeUrl}`,
  ].join('\n');

  return sendEmail({ to, subject, html, text });
};

const sendPasswordChangedEmail = async ({ to, name, changedAt }) => {
  if (!to) return { skipped: true };
  const when = formatWhen(changedAt || new Date());
  const storeUrl = getClientUrl();
  const subject = 'Your Anant Exotika Foods password was changed';
  const html = emailShell({
    title: subject,
    preview: 'Your password was changed. Contact us if this was not you.',
    body: `
      <p style="margin:0 0 12px;font-size:22px;color:${BRAND.green};">Hello ${escapeHtml(name || 'there')},</p>
      ${paragraph(`The password for your Anant Exotika Foods account was changed${when ? ` on ${escapeHtml(when)} IST` : ''}.`)}
      ${paragraph('If you made this change, no further action is needed.')}
      ${paragraph(`If you did not change your password, contact us immediately at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.green};">${SUPPORT_EMAIL}</a> or ${escapeHtml(SUPPORT_PHONE)}, and reset your password from the store.`)}
      ${ctaButton(`${storeUrl}/forgot-password`, 'Reset password')}
    `,
  });
  const text = [
    `Hello ${name || 'there'},`,
    `Your Anant Exotika Foods password was changed${when ? ` on ${when} IST` : ''}.`,
    'If you made this change, no further action is needed.',
    `If you did not, contact ${SUPPORT_EMAIL} or ${SUPPORT_PHONE}.`,
    `Reset password: ${storeUrl}/forgot-password`,
  ].join('\n');

  return sendEmail({ to, subject, html, text });
};

const safeSend = async (fn, ...args) => {
  try {
    return await fn(...args);
  } catch (error) {
    log('error', 'email send failed', {
      code: error.code || 'EMAIL_ERROR',
      message: redact(error.message || 'Failed to send email.'),
    });
    return { error: true };
  }
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendWelcomeEmail,
  safeSend,
  getClientUrl,
  shouldNotifyOrderStatus,
  statusCopy,
};
