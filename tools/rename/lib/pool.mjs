// 简单的 worker_threads 池。任务按 weight（文件大小）降序派发，结果按完成顺序回调。
// 用法：
//   import { runPool } from './pool.mjs'
//   const results = await runPool(tasks, { workerData, size, onProgress })
//   tasks: [{ op, args, weight }]；worker 端见 worker.mjs 的 OPS。
import os from 'node:os';
import { Worker } from 'node:worker_threads';

const WORKER_URL = new URL('./worker.mjs', import.meta.url);

export function defaultJobs() {
  const n = typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
  return Math.max(1, Math.min(n - 1, 12));
}

export async function runPool(tasks, { workerData = null, size = defaultJobs(), onProgress = null } = {}) {
  const order = tasks.map((t, i) => i).sort((a, b) => (tasks[b].weight ?? 0) - (tasks[a].weight ?? 0));
  const results = new Array(tasks.length);
  let next = 0;
  let done = 0;
  const n = Math.max(1, Math.min(size, tasks.length));
  await new Promise((resolve, reject) => {
    if (tasks.length === 0) return resolve();
    let failed = false;
    const workers = [];
    const finish = (err) => {
      for (const w of workers) w.terminate();
      if (err) reject(err);
      else resolve();
    };
    for (let k = 0; k < n; k++) {
      const w = new Worker(WORKER_URL, { workerData, resourceLimits: { stackSizeMb: 256, maxOldGenerationSizeMb: 8192 } });
      workers.push(w);
      let current = -1;
      const feed = () => {
        if (next >= order.length) {
          current = -1;
          return;
        }
        current = order[next++];
        const t = tasks[current];
        w.postMessage({ op: t.op, args: t.args });
      };
      w.on('message', (msg) => {
        if (failed) return;
        if (msg.error) {
          failed = true;
          const t = tasks[current];
          return finish(new Error(`${t.op} ${JSON.stringify(t.args).slice(0, 200)}: ${msg.error}`));
        }
        results[current] = msg.result;
        done++;
        if (onProgress) onProgress(done, tasks.length);
        if (done === tasks.length) return finish();
        feed();
      });
      w.on('error', (e) => {
        if (!failed) {
          failed = true;
          finish(e);
        }
      });
      feed();
    }
  });
  return results;
}
