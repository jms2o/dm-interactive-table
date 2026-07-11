type LogLevel = "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

export function logEvent(
  level: LogLevel,
  event: string,
  fields: LogFields = {},
) {
  const payload = JSON.stringify(
    redact({
      timestamp: new Date().toISOString(),
      level,
      event,
      ...fields,
    }),
  );

  if (level === "error") {
    console.error(payload);
  } else if (level === "warn") {
    console.warn(payload);
  } else {
    console.log(payload);
  }
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      /^(authorization|cookie|password|secret|token|code)$/i.test(key) ||
      /(password|secret|token)$/i.test(key)
        ? "[REDACTED]"
        : redact(entry),
    ]),
  );
}
