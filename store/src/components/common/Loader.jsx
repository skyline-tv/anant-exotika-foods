import './Loader.css';

const Loader = ({ label = 'Loading...' }) => {
  return (
    <div className="loader" role="status" aria-live="polite" aria-label={label}>
      <div className="loader__ring" aria-hidden="true" />
      <span className="loader__text">{label}</span>
    </div>
  );
};

export default Loader;
