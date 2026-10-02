export function hamperSelectionKey(selections = []) {
  return [...selections]
    .map((selection) => `${selection.slotLabel}:${selection.product?._id || selection.product}`)
    .sort()
    .join('|');
}

export function sameCartLine(item, productId, selectionKey = '') {
  const id = item?.product?._id || item?.productId;
  return String(id) === String(productId) && String(item?.selectionKey || '') === String(selectionKey || '');
}

export function buildHamperSelections(product, choices = {}) {
  return (product?.slots || []).flatMap((slot, index) => {
    const id = choices[index];
    if (!id) return [];
    const chosen = (slot.products || []).find((entry) => String(entry?._id || entry) === String(id));
    if (!chosen || typeof chosen === 'string') return [];
    return [{ slotLabel: slot.label, product: chosen._id, name: chosen.name }];
  });
}

export function hamperReady(product, choices = {}) {
  return (product?.slots || []).every((slot, index) => slot.required === false || choices[index]);
}
