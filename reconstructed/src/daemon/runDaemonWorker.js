/**
 * daemon/runDaemonWorker.ts
 *
 * 2.1.316 新增：定期检查父进程是否存活，父进程消失时退出 worker。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e3de30et.js (10)
 * attribution: placement 10
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, E } from "../../vendor/zod/v4/classic/schemas.js";
import { scheduledConfigSchema, runScheduledWorker } from "./scheduledWorker.js";
import {
  DaemonConfigSchema,
  handleRemoteControlInput,
  isShutdownResult,
  createWorkerAuthClient,
} from "./daemonAuth.js";
import { isDaemonWorkerRegistryEnabled } from "../utils/fleetGates.js";
import { radiantHeronFlag } from "../utils/featureFlagReadout.js";
import { sleep } from "../utils/sleep.js";
import { EXIT_CONFIG_ERROR, EXIT_TEMPFAIL } from "../utils/exitCodes.js";
import { jsonParse } from "../utils/slowOperations.js";
import { errorMessage } from "../utils/errors.js";
import { pinStorageV5 } from "../utils/storage/pinStorageV5.js";
import { credentialsStoreFor } from "../utils/secureStorage/credentialsFileStore.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { initDefaultDebugLog } from "../utils/debug.js";
import { watchGlobalConfigThroughStorage, seedInstallIDs } from "../utils/config.js";
import { FOLDER_ALREADY_SERVED_ERROR_TYPE } from "../bridge/types.js";
import { getPlatform } from "../utils/platform.js";

//@ chunk-e3de30et.js:14268-14480 placement
/**
 * 心跳 worker 的配置 schema（intervalSeconds，默认 30）。
 */
var heartbeatConfigSchema = DoctorLazy(() =>
  u({
    intervalSeconds: E().positive().default(30),
  }).strict(),
);
var WORKER_KINDS = {
  heartbeat: {
    schema: heartbeatConfigSchema,
    run: runHeartbeatWorker,
    needsOAuth: false,
  },
  scheduled: {
    schema: scheduledConfigSchema,
    run: runScheduledWorker,
    needsOAuth: true,
  },
  remoteControl: {
    schema: DaemonConfigSchema,
    run: handleRemoteControlInput,
    needsOAuth: true,
  },
};
//@ chunk-e3de30et.js:14480-14554 placement
function isWorkerKindAdmitted(r) {
  return (
    r === "heartbeat" || isDaemonWorkerRegistryEnabled() || (r === "remoteControl" && radiantHeronFlag())
  );
}
//@ chunk-e3de30et.js:14554-14729 placement
async function runHeartbeatWorker(r, n, a, s) {
  let { intervalSeconds } = heartbeatConfigSchema().parse(r);
  a(`heartbeat worker started (interval=${intervalSeconds}s)`);
  while (!n.aborted) {
    await sleep(intervalSeconds * 1000, n);
    if (!n.aborted) a("heartbeat");
  }
}
//@ chunk-e3de30et.js:14729-14843 placement
function bindWorkerAbortSignals(r, abortController) {
  let a = () => abortController.abort();
  r.on("SIGTERM", a);
  r.on("SIGINT", a);
  r.on("message", (s) => {
    if (isShutdownResult(s)) abortController.abort();
  });
}
//@ chunk-e3de30et.js:14843-16114 placement
async function runDaemonWorker(r, n) {
  if (!r || !(r in WORKER_KINDS)) {
    process.stderr.write(`unknown worker kind: ${r}
`);
    process.exit(2);
  }
  if (!isWorkerKindAdmitted(r)) {
    process.stderr.write(`worker kind '${r}' is not available.
`);
    process.exit(EXIT_CONFIG_ERROR);
  }
  let a = WORKER_KINDS[r];
  let s = [];
  for await (let v of process.stdin) s.push(v);
  let h;
  try {
    h = jsonParse(Buffer.concat(s).toString("utf8"));
  } catch (error) {
    process.stderr.write(`invalid config JSON on stdin: ${errorMessage(error)}
`);
    process.exit(2);
  }
  let w = a.schema().safeParse(h.config);
  if (!w.success) {
    process.stderr.write(`config validation failed: ${w.error.message}
`);
    process.exit(2);
  }
  let abortController = new AbortController();
  bindWorkerAbortSignals(process, abortController);
  watchParentProcess(abortController);
  let k = pinStorageV5(n);
  let T = credentialsStoreFor(k);
  let workerAuthClient = createWorkerAuthClient(h.initialAccessToken, T, k);
  if (isStorageV5Enabled() && k !== undefined) {
    initDefaultDebugLog({
      storageV5: k,
    });
    watchGlobalConfigThroughStorage(k);
    let [
      { composePolicyLimitsClient: v, primePolicyLimitsCache: b },
      { primeFastPathCredentials: x },
      { setGrowthBookCredentials: W, setGrowthBookStorageBackend: L },
    ] = await Promise.all([
      import("./chunk-qchbrsbw.js"),
      import("./chunk-ts9rfgqd.js"),
      import("./chunk-6df1d6re.js"),
    ]);
    v({
      storageV5: k,
      credentials: T,
    });
    W(T);
    L(k);
    await x(T);
    await b(k);
    await seedInstallIDs(k);
  }
  try {
    await a.run(
      w.data,
      abortController.signal,
      (v) =>
        process.stdout.write(
          v +
            `
`,
        ),
      workerAuthClient,
      k,
      T,
    );
  } catch (error) {
    if (getErrorHttpStatus(error) === 429) {
      process.stdout.write(`rate limited (429): ${errorMessage(error)}
`);
      process.exit(EXIT_TEMPFAIL);
    }
    if (isFolderAlreadyServedError(error)) {
      process.stdout.write(`folder already served: ${errorMessage(error)}
`);
      process.exit(EXIT_TEMPFAIL);
    }
    throw error;
  }
}
//@ chunk-e3de30et.js:16114-16216 placement
function isFolderAlreadyServedError(error) {
  let n = error;
  for (let i = 0; n != null && i < 8; i++) {
    if (n.errorType === FOLDER_ALREADY_SERVED_ERROR_TYPE) return true;
    n = n.cause;
  }
  return false;
}
//@ chunk-e3de30et.js:16216-16390 placement
function getErrorHttpStatus(error) {
  let n = error;
  for (let i = 0; n != null && i < 8; i++) {
    let status = n.status;
    if (typeof status === "number") return status;
    let status_2 = n.response?.status;
    if (typeof status_2 === "number") return status_2;
    n = n.cause;
  }
  return;
}
//@ chunk-e3de30et.js:16390-16403 placement
var WORKER_STOP_TIMEOUT_MS = 30000;
//@ chunk-e3de30et.js:16403-16466 placement
function isProcessAlive(r) {
  try {
    process.kill(r, 0);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-e3de30et.js:16466-16904 placement
/**
 * 定期检查父进程是否存活，父进程消失时退出 worker。
 */
function watchParentProcess(abortController, n) {
  let a = {
    ppid: () => process.ppid,
    isAlive: isProcessAlive,
    log: (m) =>
      process.stdout.write(
        m +
          `
`,
      ),
    onGone: () => process.exit(0),
    intervalMs: WORKER_STOP_TIMEOUT_MS,
    exitGraceMs: 2000,
    ...n,
  };
  let s = a.ppid();
  if (s <= 1) return;
  let h = false;
  let interval = setInterval(() => {
    if (h) return;
    if (!(!a.isAlive(s) || (getPlatform() !== "windows" && a.ppid() !== s))) return;
    h = true;
    clearInterval(interval);
    a.log("parent supervisor gone \u2014 exiting");
    abortController.abort();
    setTimeout(a.onGone, a.exitGraceMs).unref();
  }, a.intervalMs);
  interval.unref();
  return interval;
}
export { WORKER_KINDS, isWorkerKindAdmitted };
