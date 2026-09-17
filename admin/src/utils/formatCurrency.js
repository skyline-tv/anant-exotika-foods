export function formatCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '₹0';
  }

  const hasPaise = Math.round(amount * 100) % 100 !== 0;

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  }).format(amount);
}
