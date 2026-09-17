import Button from './Button';

function EmptyState({ icon: Icon, title, message, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      {Icon ? <Icon size={36} aria-hidden="true" /> : null}
      <h3>{title}</h3>
      {message ? <p>{message}</p> : null}
      {actionLabel ? (
        <Button onClick={onAction}>{actionLabel}</Button>
      ) : null}
    </div>
  );
}

export default EmptyState;
