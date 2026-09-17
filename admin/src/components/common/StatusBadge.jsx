import { STATUS_LABELS } from '../../utils/constants';

function StatusBadge({ status, label }) {
  const key = String(status || 'inactive').toLowerCase();
  const text = label || STATUS_LABELS[key] || key.replace(/_/g, ' ');

  return <span className={`badge badge-${key}`}>{text}</span>;
}

export default StatusBadge;
