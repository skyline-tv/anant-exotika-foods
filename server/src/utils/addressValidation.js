const INDIA_PHONE = /^[6-9]\d{9}$/;
const INDIA_PINCODE = /^[1-9][0-9]{5}$/;

const normalizePhone = (value) => String(value || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');

const normalizePostalCode = (value) => String(value || '').replace(/\s/g, '').trim();

const validatePhone = (value) => {
  const phone = normalizePhone(value);
  if (!INDIA_PHONE.test(phone)) {
    return { valid: false, message: 'Enter a valid 10-digit Indian mobile number.' };
  }
  return { valid: true, value: phone };
};

const validatePostalCode = (value) => {
  const postalCode = normalizePostalCode(value);
  if (!INDIA_PINCODE.test(postalCode)) {
    return { valid: false, message: 'Enter a valid 6-digit pincode.' };
  }
  return { valid: true, value: postalCode };
};

const validateAddressPayload = (body = {}) => {
  const required = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'postalCode'];
  for (const field of required) {
    if (!String(body[field] || '').trim()) {
      return { valid: false, message: 'Please complete all required address fields.' };
    }
  }

  const phone = validatePhone(body.phone);
  if (!phone.valid) return phone;

  const postalCode = validatePostalCode(body.postalCode);
  if (!postalCode.valid) return postalCode;

  return {
    valid: true,
    value: {
      fullName: String(body.fullName).trim(),
      phone: phone.value,
      addressLine1: String(body.addressLine1).trim(),
      addressLine2: String(body.addressLine2 || '').trim(),
      landmark: String(body.landmark || '').trim(),
      city: String(body.city).trim(),
      state: String(body.state).trim(),
      country: String(body.country || 'India').trim() || 'India',
      postalCode: postalCode.value,
      addressType: body.addressType,
      isDefault: Boolean(body.isDefault),
    },
  };
};

module.exports = {
  INDIA_PHONE,
  INDIA_PINCODE,
  normalizePhone,
  normalizePostalCode,
  validatePhone,
  validatePostalCode,
  validateAddressPayload,
};
