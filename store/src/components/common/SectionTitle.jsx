import './SectionTitle.css';

const SectionTitle = ({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  light = false,
  className = '',
}) => {
  const classes = [
    'section-title',
    `section-title--${align}`,
    light ? 'section-title--light' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {eyebrow && <span className="section-title__eyebrow">{eyebrow}</span>}
      {title && <h2 className="section-title__heading">{title}</h2>}
      {subtitle && <p className="section-title__subtitle">{subtitle}</p>}
      <span className="section-title__divider" aria-hidden="true" />
    </div>
  );
};

export default SectionTitle;
