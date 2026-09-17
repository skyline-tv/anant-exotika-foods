import { TrendingDown, TrendingUp } from 'lucide-react';

function StatCard({ icon: Icon, label, value, change, trend }) {
  return (
    <article className="card stat-card">
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {typeof change === 'number' ? (
          <p className={`stat-trend ${trend === 'down' ? 'down' : 'up'}`}>
            {trend === 'down' ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
            {change}% vs last period
          </p>
        ) : null}
      </div>
      {Icon ? (
        <div className="stat-icon" aria-hidden="true">
          <Icon size={20} />
        </div>
      ) : null}
    </article>
  );
}

export default StatCard;
