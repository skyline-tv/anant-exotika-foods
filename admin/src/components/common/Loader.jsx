function Loader({ label = 'Loading...', full = false }) {
  return (
    <div className={full ? 'loader-block' : 'loader-block'} role="status" aria-live="polite">
      <span className="spinner spinner--lg" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export default Loader;
