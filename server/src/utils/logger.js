const redact = (value) =>
  String(value || '')
    .replace(/mongodb(\+srv)?:\/\/\S+/gi, '[redacted]')
    .replace(/(bearer\s+)[a-z0-9._~+/-]+=*/gi, '$1[redacted]')
    .replace(/\bre_[A-Za-z0-9_]+/g, '[redacted]')
    .replace(/([?&]token=)[^&\s]+/gi, '$1[redacted]')
    .slice(0, 500);

const log = (level, message, fields = {}) => {
  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    ...fields,
  };
  const line =
    process.env.NODE_ENV === 'production'
      ? JSON.stringify(entry)
      : `${entry.time} ${level} ${message} ${JSON.stringify(fields)}`;

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
};

const logRequest = ({ requestId, method, path, status, ms }) => {
  const level = status >= 500 ? 'error' : status === 429 ? 'warn' : 'info';
  log(level, 'request', { requestId, method, path, status, ms });
};

module.exports = {
  log,
  logRequest,
  redact,
};
