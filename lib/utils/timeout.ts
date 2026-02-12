/**
 * Wraps a promise with a timeout. Rejects if the promise doesn't resolve
 * within the given milliseconds. Useful for guarding against hanging network
 * requests (e.g., Supabase 522 outages).
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label?: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Request timed out${label ? `: ${label}` : ""}`));
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}
