const INDIA_PHONE = /^[6-9]\d{9}$/;
const INDIA_PINCODE = /^[1-9][0-9]{5}$/;

export function normalizePhone(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .replace(/^91(?=\d{10}$)/, '');
}

export function normalizePostalCode(value) {
  return String(value || '').replace(/\s/g, '').trim();
}

export function validatePhone(value) {
  const phone = normalizePhone(value);
  if (!INDIA_PHONE.test(phone)) {
    return { valid: false, message: 'Enter a valid 10-digit Indian mobile number.' };
  }
  return { valid: true, value: phone };
}

export function validatePostalCode(value) {
  const postalCode = normalizePostalCode(value);
  if (!INDIA_PINCODE.test(postalCode)) {
    return { valid: false, message: 'Enter a valid 6-digit pincode.' };
  }
  return { valid: true, value: postalCode };
}

export function validateAddressForm(form) {
  const required = [
    ['fullName', 'Full name'],
    ['phone', 'Mobile number'],
    ['addressLine1', 'Address line 1'],
    ['city', 'City'],
    ['state', 'State'],
    ['postalCode', 'Pincode'],
  ];

  for (const [field, label] of required) {
    if (!String(form[field] || '').trim()) {
      return { valid: false, message: `${label} is required.` };
    }
  }

  const phone = validatePhone(form.phone);
  if (!phone.valid) return phone;

  const postalCode = validatePostalCode(form.postalCode);
  if (!postalCode.valid) return postalCode;

  return {
    valid: true,
    value: {
      ...form,
      fullName: form.fullName.trim(),
      phone: phone.value,
      addressLine1: form.addressLine1.trim(),
      addressLine2: (form.addressLine2 || '').trim(),
      landmark: (form.landmark || '').trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      postalCode: postalCode.value,
      country: form.country || 'India',
    },
  };
}
