const snapshotAddress = (address) => ({
  fullName: address.fullName,
  phone: address.phone,
  addressLine1: address.addressLine1,
  addressLine2: address.addressLine2 || '',
  landmark: address.landmark || '',
  city: address.city,
  state: address.state,
  country: address.country || 'India',
  postalCode: address.postalCode,
  addressType: address.addressType || 'home',
});

module.exports = snapshotAddress;
