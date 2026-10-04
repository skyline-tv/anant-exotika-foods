import { useEffect } from 'react';
import { Check } from 'lucide-react';
import { toTitleCase } from '../../utils/titleCase';
import { buildHamperSelections, hamperReady } from '../../utils/hamper';
import { getPrimaryImage } from '../../utils/productHelpers';
import Button from '../common/Button';
import QuantitySelector from '../common/QuantitySelector';

const optionUnavailable = (product) => product.status !== 'active' || Number(product.stock) < 1;

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
  const requiredIndexes = slots
    .map((slot, index) => (slot.required === false ? null : index))
    .filter((index) => index !== null);
  const filledRequired = requiredIndexes.filter((index) => choices[index]).length;
  const progress = requiredIndexes.length ? Math.round((filledRequired / requiredIndexes.length) * 100) : 0;

  useEffect(() => {
    if (quantity > maxQuantity) onQuantity(maxQuantity);
  }, [quantity, maxQuantity, onQuantity]);

  return (
    <div className="hamper-builder">
      <p className="hamper-builder__note">
        The price and packaging stay fixed. Choose one option for each slot.
        {product.packaging ? ` Packaging: ${product.packaging}.` : ''}
      </p>
      {requiredIndexes.length ? (
        <p className="hamper-progress" style={{ '--hamper-progress': `${progress}%` }}>
          <span>
            {filledRequired} of {requiredIndexes.length} selected
          </span>
          <i aria-hidden="true" />
        </p>
      ) : null}
      {slots.map((slot, index) => {
        const options = (slot.products || []).filter((entry) => entry && typeof entry === 'object');
        const selectedId = choices[index] || '';
        return (
          <fieldset className="hamper-slot" key={`${slot.label}-${index}`} disabled={outOfStock}>
            <legend>
              {toTitleCase(slot.label)}
              {slot.required === false ? ' (Optional)' : ''}
            </legend>
            <label className="hamper-slot__select field">
              <span className="sr-only">{toTitleCase(slot.label)}</span>
              <select
                value={selectedId}
                onChange={(event) => onChoice(index, event.target.value)}
                disabled={outOfStock}
              >
                <option value="">{slot.required === false ? 'No selection' : 'Select an option'}</option>
                {options.map((option) => (
                  <option key={option._id} value={option._id} disabled={optionUnavailable(option)}>
                    {`${toTitleCase(option.name)}${optionUnavailable(option) ? ' (Unavailable)' : ''}`}
                  </option>
                ))}
              </select>
            </label>
            <div className="hamper-slot__cards" role="listbox" aria-label={toTitleCase(slot.label)}>
              {slot.required === false ? (
                <button
                  type="button"
                  role="option"
                  aria-selected={!selectedId}
                  className={`hamper-option${!selectedId ? ' is-selected' : ''}`}
                  onClick={() => onChoice(index, '')}
                >
                  <span>No selection</span>
                </button>
              ) : null}
              {options.map((option) => {
                const unavailable = optionUnavailable(option);
                const image = option.images?.length ? getPrimaryImage(option) : '';
                const isSelected = String(selectedId) === String(option._id);
                return (
                  <button
                    key={option._id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`hamper-option${isSelected ? ' is-selected' : ''}`}
                    disabled={unavailable}
                    onClick={() => onChoice(index, option._id)}
                  >
                    {image ? <img src={image} alt="" /> : null}
                    <span>{toTitleCase(option.name)}</span>
                    {isSelected ? <Check size={16} strokeWidth={1.8} aria-hidden="true" /> : null}
                    {unavailable ? <em>Unavailable</em> : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
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
