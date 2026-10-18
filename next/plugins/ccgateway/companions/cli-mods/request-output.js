// Await both the write callback and cancellation. A full stdout pipe must not
// prevent the request deadline or SIGINT from ending the command.
export function writeOutput(stream, value, signal) {
  if (signal?.aborted) return Promise.reject(signal.reason ?? new Error('request aborted'));
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abort);
      error ? reject(error) : resolve();
    };
    const abort = () => finish(signal.reason ?? new Error('request aborted'));
    signal?.addEventListener('abort', abort, { once: true });
    try { stream.write(value, finish); } catch (error) { finish(error); }
  });
}
