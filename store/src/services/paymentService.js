import api from './api';

export async function getPaymentConfig() {
  const { data } = await api.get('/payments/config');
  return data.data;
}

export async function verifyPayment(payload) {
  const { data } = await api.post('/payments/verify', payload);
  return data.data.order;
}

export async function failPayment(orderId) {
  const { data } = await api.post('/payments/fail', { orderId });
  return data.data.order;
}

export function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error('Unable to load payment gateway.'));
    document.body.appendChild(script);
  });
}