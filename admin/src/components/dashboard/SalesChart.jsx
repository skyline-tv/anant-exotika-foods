import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';

function SalesChart({ data = [] }) {
  return (
    <section className="card">
      <div className="card-header">
        <h2>Sales Overview</h2>
      </div>
      <div className="card-body chart-wrap">
        {data.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <p>No sales data yet. Orders will appear here as they come in.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,26,26,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(value), 'Revenue']}
                contentStyle={{
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.5)',
                  background: 'rgba(255,255,255,0.86)',
                  backdropFilter: 'blur(16px)',
                }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#0B3D2E"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#C6A15B' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

export default SalesChart;
