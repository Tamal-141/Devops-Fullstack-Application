// One JSON object per line on stdout. Docker captures stdout, so `docker compose logs`
// shows these, and every field stays greppable (e.g. `| grep '"level":"error"'`).
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

function serialize(fields) {
  if (!fields || !(fields.err instanceof Error)) return fields;
  const { err, ...rest } = fields;
  return { ...rest, err: { name: err.name, message: err.message, code: err.code, stack: err.stack } };
}

function createLogger({ level = 'info', stream = process.stdout, base = {} } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;

  function write(lvl, msg, fields) {
    if (LEVELS[lvl] < threshold) return;
    const entry = { time: new Date().toISOString(), level: lvl, msg, ...base, ...serialize(fields) };
    stream.write(`${JSON.stringify(entry)}\n`);
  }

  return {
    debug: (msg, fields) => write('debug', msg, fields),
    info: (msg, fields) => write('info', msg, fields),
    warn: (msg, fields) => write('warn', msg, fields),
    error: (msg, fields) => write('error', msg, fields),
  };
}

module.exports = { createLogger };
