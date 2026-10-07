const REDACTIONS: [RegExp, string][] = [
  [/postgres(?:ql)?:\/\/\S+/gi, "postgresql://[redacted]"],
  [/findr_session=[^\s;,"']+/gi, "findr_session=[redacted]"],
  [/\b(authorization|cookie|set-cookie)\b\s*[:=]\s*[^\n]+/gi, "$1: [redacted]"],
  [/\b(password|secret|token|key)\b(["']?\s*[:=]\s*["']?)[^\s"',}&]+/gi, "$1$2[redacted]"],
];

export function redact(text: string) {
  return REDACTIONS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);
}

export function describeError(error: unknown) {
  if (!(error instanceof Error)) return redact(String(error));
  const code = "code" in error && typeof error.code === "string" ? ` [${error.code}]` : "";
  return redact(`${error.stack ?? `${error.name}: ${error.message}`}${code}`);
}

export function logError(label: string, error: unknown) {
  console.error(label, describeError(error));
}
