/**
 * Safe local load test. Hits public read endpoints only.
 * Does not create orders, payments, or Shiprocket shipments.
 *
 * LOAD_TEST_URL=http://127.0.0.1:5001 node src/scripts/loadTest.js
 */

const base = process.env.LOAD_TEST_URL || 'http://127.0.0.1:5001';
const paths = ['/health', '/ready', '/api/v1/health', '/api/v1/products', '/api/v1/categories', '/api/v1/content'];
const levels = (process.env.LOAD_TEST_LEVELS || '50,100,250')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0);
const durationMs = Number(process.env.LOAD_TEST_DURATION_MS) || 8000;

const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
};

const runLevel = async (concurrency) => {
  const started = Date.now();
  let completed = 0;
  let errors = 0;
  const latencies = [];
  const statuses = {};

  const worker = async () => {
    let cursor = 0;
    while (Date.now() - started < durationMs) {
      const path = paths[cursor % paths.length];
      cursor += 1;
      const t0 = performance.now();
      try {
        const response = await fetch(`${base}${path}`);
        latencies.push(performance.now() - t0);
        statuses[response.status] = (statuses[response.status] || 0) + 1;
        if (!response.ok) errors += 1;
      } catch {
        latencies.push(performance.now() - t0);
        errors += 1;
        statuses.network = (statuses.network || 0) + 1;
      }
      completed += 1;
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const elapsed = (Date.now() - started) / 1000;
  const avg = latencies.reduce((sum, value) => sum + value, 0) / (latencies.length || 1);

  return {
    concurrency,
    requests: completed,
    rps: Number((completed / elapsed).toFixed(1)),
    avgMs: Number(avg.toFixed(1)),
    p95Ms: Number(percentile(latencies, 95).toFixed(1)),
    p99Ms: Number(percentile(latencies, 99).toFixed(1)),
    errors,
    errorRate: Number(((errors / (completed || 1)) * 100).toFixed(2)),
    statuses,
  };
};

const main = async () => {
  const results = [];
  for (const level of levels) {
    results.push(await runLevel(level));
  }
  console.log(JSON.stringify({ base, paths, durationMs, results }, null, 2));
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
