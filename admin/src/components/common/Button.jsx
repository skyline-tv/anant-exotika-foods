function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  loading = false,
  disabled = false,
  ...props
}) {
  const classes = ['btn', `btn--${variant}`, size !== 'md' ? `btn--${size}` : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...props}>
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export default Button;
