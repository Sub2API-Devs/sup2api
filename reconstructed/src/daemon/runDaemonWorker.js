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
import { DaemonConfigSchema, ye, oe, createWorkerAuthClient } from "./daemonAuth.js";
import { isDaemonWorkerRegistryEnabled } from "../utils/fleetGates.js";
import { lOs } from "../utils/featureFlagReadout.js";
import { sleep } from "../utils/sleep.js";
import { EXIT_CONFIG_ERROR, the } from "../utils/exitCodes.js";
import { jsonParse } from "../utils/slowOperations.js";
import { errorMessage } from "../utils/errors.js";
import { pinStorageV5 } from "../utils/storage/pinStorageV5.js";
import { credentialsStoreFor } from "../utils/secureStorage/credentialsFileStore.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { initDefaultDebugLog } from "../utils/debug.js";
import { watchGlobalConfigThroughStorage, seedInstallIDs } from "../utils/config.js";
import { FOLDER_ALREADY_SERVED_ERROR_TYPE } from "../bridge/types.js";
import { getPlatform } from "../utils/platform.js";

/**
 * 心跳 worker 的配置 schema（intervalSeconds，默认 30）。
 */
//@ chunk-e3de30et.js:14268-14480 placement
var heartbeatConfigSchema = DoctorLazy(() => u({ intervalSeconds: E().positive().default(30) }).strict()),
  WORKER_KINDS = {
    heartbeat: { schema: heartbeatConfigSchema, run: runHeartbeatWorker, needsOAuth: !1 },
    scheduled: { schema: scheduledConfigSchema, run: runScheduledWorker, needsOAuth: !0 },
    remoteControl: { schema: DaemonConfigSchema, run: ye, needsOAuth: !0 },
  };
//@ chunk-e3de30et.js:14480-14554 placement
function isWorkerKindAdmitted(r) {
  return r === "heartbeat" || isDaemonWorkerRegistryEnabled() || (r === "remoteControl" && lOs());
}
//@ chunk-e3de30et.js:14554-14729 placement
async function runHeartbeatWorker(r, n, a, s) {
  let { intervalSeconds: intervalSeconds } = heartbeatConfigSchema().parse(r);
  a(`heartbeat worker started (interval=${intervalSeconds}s)`);
  while (!n.aborted) if ((await sleep(intervalSeconds * 1000, n), !n.aborted)) a("heartbeat");
}
//@ chunk-e3de30et.js:14729-14843 placement
function bindWorkerAbortSignals(r, n) {
  let a = () => n.abort();
  (r.on("SIGTERM", a),
    r.on("SIGINT", a),
    r.on("message", (s) => {
      if (oe(s)) n.abort();
    }));
}
//@ chunk-e3de30et.js:14843-16114 placement
async function runDaemonWorker(r, n) {
  if (!r || !(r in WORKER_KINDS))
    (process.stderr.write(`unknown worker kind: ${r}
`),
      process.exit(2));
  if (!isWorkerKindAdmitted(r))
    (process.stderr.write(`worker kind '${r}' is not available.
`),
      process.exit(EXIT_CONFIG_ERROR));
  let a = WORKER_KINDS[r],
    s = [];
  for await (let v of process.stdin) s.push(v);
  let h;
  try {
    h = jsonParse(Buffer.concat(s).toString("utf8"));
  } catch (error) {
    (process.stderr.write(`invalid config JSON on stdin: ${errorMessage(error)}
`),
      process.exit(2));
  }
  let safeParse = a.schema().safeParse(h.config);
  if (!safeParse.success)
    (process.stderr.write(`config validation failed: ${safeParse.error.message}
`),
      process.exit(2));
  let abortController = new AbortController();
  (bindWorkerAbortSignals(process, abortController), watchParentProcess(abortController));
  let k = pinStorageV5(n),
    T = credentialsStoreFor(k),
    y = createWorkerAuthClient(h.initialAccessToken, T, k);
  if (isStorageV5Enabled() && k !== void 0) {
    (initDefaultDebugLog({ storageV5: k }), watchGlobalConfigThroughStorage(k));
    let [
      { composePolicyLimitsClient: v, primePolicyLimitsCache: b },
      { primeFastPathCredentials: x },
      { setGrowthBookCredentials: W, setGrowthBookStorageBackend: L },
    ] = await Promise.all([
      import("./chunk-qchbrsbw.js"),
      import("./chunk-ts9rfgqd.js"),
      import("./chunk-6df1d6re.js"),
    ]);
    (v({ storageV5: k, credentials: T }), W(T), L(k), await x(T), await b(k), await seedInstallIDs(k));
  }
  try {
    await a.run(
      safeParse.data,
      abortController.signal,
      (v) =>
        process.stdout.write(
          v +
            `
`,
        ),
      y,
      k,
      T,
    );
  } catch (error) {
    if (getErrorHttpStatus(error) === 429)
      (process.stdout.write(`rate limited (429): ${errorMessage(error)}
`),
        process.exit(the));
    if (isFolderAlreadyServedError(error))
      (process.stdout.write(`folder already served: ${errorMessage(error)}
`),
        process.exit(the));
    throw error;
  }
}
//@ chunk-e3de30et.js:16114-16216 placement
function isFolderAlreadyServedError(r) {
  let n = r;
  for (let a = 0; n != null && a < 8; a++) {
    if (n.errorType === FOLDER_ALREADY_SERVED_ERROR_TYPE) return !0;
    n = n.cause;
  }
  return !1;
}
//@ chunk-e3de30et.js:16216-16390 placement
function getErrorHttpStatus(r) {
  let n = r;
  for (let a = 0; n != null && a < 8; a++) {
    let status = n.status;
    if (typeof status === "number") return status;
    let h = n.response?.status;
    if (typeof h === "number") return h;
    n = n.cause;
  }
  return;
}
//@ chunk-e3de30et.js:16390-16403 placement
var De = 30000;
//@ chunk-e3de30et.js:16403-16466 placement
function He(r) {
  try {
    return (process.kill(r, 0), !0);
  } catch {
    return !1;
  }
}
/**
 * 定期检查父进程是否存活，父进程消失时退出 worker。
 */
//@ chunk-e3de30et.js:16466-16904 placement
function watchParentProcess(r, n) {
  let a = {
      ppid: () => process.ppid,
      isAlive: He,
      log: (m) =>
        process.stdout.write(
          m +
            `
`,
        ),
      onGone: () => process.exit(0),
      intervalMs: De,
      exitGraceMs: 2000,
      ...n,
    },
    ppid = a.ppid();
  if (ppid <= 1) return;
  let h = !1,
    w = setInterval(() => {
      if (h) return;
      if (!(!a.isAlive(ppid) || (getPlatform() !== "windows" && a.ppid() !== ppid))) return;
      ((h = !0),
        clearInterval(w),
        a.log("parent supervisor gone \u2014 exiting"),
        r.abort(),
        setTimeout(a.onGone, a.exitGraceMs).unref());
    }, a.intervalMs);
  return (w.unref(), w);
}

export { WORKER_KINDS, isWorkerKindAdmitted };
