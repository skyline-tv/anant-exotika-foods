import { Link } from 'react-router-dom';
import Button from './Button';

const EmptyState = ({
  eyebrow,
  title = 'Nothing here yet',
  message = 'There is no content to display at the moment.',
  actionLabel,
  actionTo,
  onAction,
}) => {
  return (
    <div className="empty-state">
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h2>{title}</h2>
      <p>{message}</p>
      {actionLabel && actionTo ? (
        <Button as={Link} to={actionTo} variant="primary">
          {actionLabel}
        </Button>
      ) : null}
      {actionLabel && onAction ? (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
};

export default EmptyState;
