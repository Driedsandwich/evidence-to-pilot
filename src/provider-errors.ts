/** Error diagnostics contain only a bounded provider message, never request data. */
export function sanitizeErrorBody(value: string, env = process.env): string {
  let text = value;
  for (const [key, secret] of Object.entries(env)) {
    if (secret && /key|token|secret|password|credential|cookie|authorization/i.test(key)) {
      for (const variant of [secret, encodeURIComponent(secret), JSON.stringify(secret).slice(1, -1)])
        text = text.split(variant).join("[REDACTED]");
    }
  }
  return text
    .replace(/https?:\/\/[^\s<>"']+/gi, "[URL REDACTED]")
    .replace(/\b(?:Bearer|Basic)\s+[^\s,"'}]+/gi, "[AUTH REDACTED]")
    .replace(/\b(?:sk-[\w-]+|AIza[\w-]+|eyJ[\w.-]+)/g, "[TOKEN REDACTED]")
    .replace(/(["']?(?:api[_-]?key|x-api-key|authorization|password|secret|token|cookie|credential)["']?\s*[:=]\s*)(?:"(?:\\.|[^"\\])*"|'[^']*'|[^\s,;}]+)/gi, "$1[REDACTED]")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .slice(0, 600);
}

export function retryAfterMs(value: unknown, now: number): number | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    const ms = Number(trimmed) * 1000;
    return Number.isFinite(ms) ? Math.ceil(ms) : null;
  }
  const date = Date.parse(trimmed);
  return Number.isFinite(date) ? Math.max(0, date - now) : null;
}

export function providerErrorDetails(error: unknown): {
  status: number | null; body: string; retryAfter: string | null;
} {
  const e = (error && typeof error === "object" ? error : {}) as Record<string, any>;
  const rawStatus = e.status ?? e.code;
  const status = typeof rawStatus === "number" && rawStatus >= 100 && rawStatus <= 599 ? rawStatus : null;
  // SDK error bodies vary. Only select message/type, never serialize arbitrary
  // fields (which can contain echoed headers, request bodies or credentials).
  let body: unknown = e.body ?? e.error;
  if (body === undefined && status !== null) body = e.message;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { /* plain-text provider response */ }
  }
  if (body && typeof body === "object") {
    const obj = body as Record<string, any>;
    const detail = obj.error && typeof obj.error === "object" ? obj.error : obj;
    body = typeof detail.message === "string" ? detail.message :
      typeof detail.type === "string" ? detail.type : undefined;
  }
  const rawRetry = e.retryAfter ?? (typeof e.headers?.get === "function"
    ? e.headers.get("retry-after") : e.headers?.["retry-after"] ?? e.headers?.["Retry-After"]);
  // Store only normalized duration; do not copy arbitrary response header text.
  const wait = retryAfterMs(rawRetry, Date.now());
  return { status, body: typeof body === "string" ? sanitizeErrorBody(body) : "No provider error body available",
    retryAfter: wait === null ? null : String(wait / 1000) };
}

/** Read at most 16 KiB; bound both error logging and duplicate response reads. */
export async function readErrorBody(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "No provider error body available";
  const decoder = new TextDecoder();
  let body = "";
  let bytes = 0;
  try {
    while (bytes < 16384) {
      const chunk = await reader.read();
      if (chunk.done) break;
      const part = chunk.value.subarray(0, 16384 - bytes);
      bytes += part.length;
      body += decoder.decode(part, { stream: true });
    }
    return body + decoder.decode();
  } finally {
    // A cloned fetch stream can wait for the original consumer on cancellation.
    void reader.cancel().catch(() => {});
  }
}
