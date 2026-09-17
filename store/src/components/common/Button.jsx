import './Button.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  as: Component = 'button',
  ...props
}) => {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component type={Component === 'button' ? type : undefined} className={classes} {...props}>
      {children}
    </Component>
  );
};

export default Button;
