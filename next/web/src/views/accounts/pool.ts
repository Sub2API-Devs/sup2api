/**
 * Runs `worker` over `items` with at most `limit` calls in flight (in order of
 * the items). Once `signal` aborts no new item starts; the promise resolves
 * when the started calls have settled. A worker reports its own errors: a
 * rejection only ends that item.
 */
export async function runPool<T>(items: readonly T[], limit: number, worker: (item: T, index: number) => Promise<unknown>, signal?: AbortSignal): Promise<void> {
  let next = 0
  const lanes = Math.max(1, Math.min(Math.floor(limit) || 1, items.length))
  const lane = async () => {
    while (next < items.length && !signal?.aborted) {
      const i = next++
      try {
        await worker(items[i], i)
      } catch {
        // reported by the worker
      }
    }
  }
  await Promise.all(Array.from({ length: lanes }, lane))
}
