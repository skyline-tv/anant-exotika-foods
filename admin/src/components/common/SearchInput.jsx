import { Search } from 'lucide-react';

function SearchInput({
  id = 'search',
  value,
  onChange,
  placeholder = 'Search',
  label = 'Search',
}) {
  return (
    <div className="field search-input">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <Search
          size={16}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-secondary)',
          }}
        />
        <input
          id={id}
          className="input"
          style={{ paddingLeft: '2.3rem' }}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

export default SearchInput;
