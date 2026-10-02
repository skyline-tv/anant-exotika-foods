import { useEffect } from 'react';
import { toTitleCase } from '../../utils/titleCase';
import { buildHamperSelections, hamperReady } from '../../utils/hamper';
import Button from '../common/Button';
import QuantitySelector from '../common/QuantitySelector';

const optionLabel = (product) => {
  const unavailable = product.status !== 'active' || Number(product.stock) < 1;
  return `${toTitleCase(product.name)}${unavailable ? ' (Unavailable)' : ''}`;
};

const HamperPersonalizer = ({
  product,
  quantity,
  onQuantity,
  choices,
  onChoice,
  onAdd,
  onBuy,
  adding,
  buying,
}) => {
  const slots = product.slots || [];
  const ready = hamperReady(product, choices);
  const selected = buildHamperSelections(product, choices);
  const outOfStock = product.status === 'out_of_stock' || Number(product.stock) < 1;
  const stockLimits = [Number(product.stock) || 0];
  selected.forEach((selection) => {
    const slot = slots.find((entry) => entry.label === selection.slotLabel);
    const option = (slot?.products || []).find((entry) => String(entry?._id) === String(selection.product));
    if (option) stockLimits.push(Number(option.stock) || 0);
  });
  const maxQuantity = Math.max(1, Math.min(...stockLimits));

  useEffect(() => {
    if (quantity > maxQuantity) onQuantity(maxQuantity);
  }, [quantity, maxQuantity, onQuantity]);

  return (
    <div className="hamper-builder">
      <p className="hamper-builder__note">
        The price and packaging stay fixed. Choose one option for each slot.
        {product.packaging ? ` Packaging: ${product.packaging}.` : ''}
      </p>
      {slots.map((slot, index) => {
        const options = (slot.products || []).filter((entry) => entry && typeof entry === 'object');
        return (
          <label className="field" key={`${slot.label}-${index}`}>
            <span>
              {toTitleCase(slot.label)}
              {slot.required === false ? ' (Optional)' : ''}
            </span>
            <select
              value={choices[index] || ''}
              onChange={(event) => onChoice(index, event.target.value)}
              disabled={outOfStock}
            >
              <option value="">{slot.required === false ? 'No selection' : 'Select an option'}</option>
              {options.map((option) => (
                <option key={option._id} value={option._id} disabled={option.status !== 'active' || Number(option.stock) < 1}>
                  {optionLabel(option)}
                </option>
              ))}
            </select>
          </label>
        );
      })}

      <QuantitySelector
        id="qty"
        value={quantity}
        min={1}
        max={maxQuantity}
        onChange={onQuantity}
        disabled={outOfStock}
      />

      {ready ? (
        <div className="hamper-confirmation">
          <h2>Your Personalized Hamper</h2>
          <ul>
            {selected.map((selection) => (
              <li key={`${selection.slotLabel}-${selection.product}`}>
                <span>{toTitleCase(selection.slotLabel)}</span>
                <strong>{toTitleCase(selection.name)}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="hamper-builder__hint">Choose every required option to review your hamper.</p>
      )}

      <div className="product-actions">
        <Button onClick={onAdd} disabled={outOfStock || !ready || adding} className="btn--full">
          {adding ? 'Adding...' : 'Add To Cart'}
        </Button>
        <Button onClick={onBuy} disabled={outOfStock || !ready || buying} variant="secondary" className="btn--full">
          {buying ? 'Continuing...' : 'Buy Now'}
        </Button>
      </div>
    </div>
  );
};

export default HamperPersonalizer;
