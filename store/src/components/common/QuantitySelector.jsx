import { Minus, Plus } from 'lucide-react';

const QuantitySelector = ({
  id,
  value,
  min = 1,
  max = 99,
  onChange,
  disabled = false,
  label = 'Quantity',
}) => {
  const decrease = () => {
    if (disabled) return;
    onChange(Math.max(min, Number(value) - 1));
  };

  const increase = () => {
    if (disabled) return;
    onChange(Math.min(max, Number(value) + 1));
  };

  return (
    <div className="qty-selector">
      {label ? (
        <label htmlFor={id} className="qty-selector__label">
          {label}
        </label>
      ) : null}
      <div className="qty-selector__control">
        <button type="button" onClick={decrease} disabled={disabled || value <= min} aria-label="Decrease quantity">
          <Minus size={14} strokeWidth={1.5} />
        </button>
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(event) => {
            const next = Number(event.target.value) || min;
            onChange(Math.min(max, Math.max(min, next)));
          }}
          aria-label={label || 'Quantity'}
        />
        <button type="button" onClick={increase} disabled={disabled || value >= max} aria-label="Increase quantity">
          <Plus size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};

export default QuantitySelector;
