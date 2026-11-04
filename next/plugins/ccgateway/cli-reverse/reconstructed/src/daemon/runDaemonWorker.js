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
import { objectSchema, numberSchema } from "../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e3de30et.js:14268-14480 placement
/**
 * 心跳 worker 的配置 schema（intervalSeconds，默认 30）。
 */
var heartbeatConfigSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var WORKER_KINDS;
deferInit("chunk-e3de30et.js:14268", () => {
  heartbeatConfigSchema = DoctorLazy(() =>
    objectSchema({
      intervalSeconds: numberSchema().positive().default(30),
    }).strict(),
  );
  WORKER_KINDS = {
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
});
//@ chunk-e3de30et.js:14480-14554 placement
function isWorkerKindAdmitted(kind) {
  return (
    kind === "heartbeat" ||
    isDaemonWorkerRegistryEnabled() ||
    (kind === "remoteControl" && radiantHeronFlag())
  );
}
//@ chunk-e3de30et.js:14554-14729 placement
async function runHeartbeatWorker(config, signal, log, authClient) {
  let { intervalSeconds } = heartbeatConfigSchema().parse(config);
  log(`heartbeat worker started (interval=${intervalSeconds}s)`);
  while (!signal.aborted) {
    await sleep(intervalSeconds * 1000, signal);
    if (!signal.aborted) log("heartbeat");
  }
}
//@ chunk-e3de30et.js:14729-14843 placement
function bindWorkerAbortSignals(proc, abortController) {
  let onSignal = () => abortController.abort();
  proc.on("SIGTERM", onSignal);
  proc.on("SIGINT", onSignal);
  proc.on("message", (message) => {
    if (isShutdownResult(message)) abortController.abort();
  });
}
//@ chunk-e3de30et.js:14843-16114 placement
async function runDaemonWorker(kind, storageV5) {
  if (!kind || !(kind in WORKER_KINDS)) {
    process.stderr.write(`unknown worker kind: ${kind}
`);
    process.exit(2);
  }
  if (!isWorkerKindAdmitted(kind)) {
    process.stderr.write(`worker kind '${kind}' is not available.
`);
    process.exit(EXIT_CONFIG_ERROR);
  }
  let spec = WORKER_KINDS[kind];
  let stdinChunks = [];
  for await (let chunk of process.stdin) stdinChunks.push(chunk);
  let config;
  try {
    config = jsonParse(Buffer.concat(stdinChunks).toString("utf8"));
  } catch (error) {
    process.stderr.write(`invalid config JSON on stdin: ${errorMessage(error)}
`);
    process.exit(2);
  }
  let parsed = spec.schema().safeParse(config.config);
  if (!parsed.success) {
    process.stderr.write(`config validation failed: ${parsed.error.message}
`);
    process.exit(2);
  }
  let abortController = new AbortController();
  bindWorkerAbortSignals(process, abortController);
  watchParentProcess(abortController);
  let pinnedStorage = pinStorageV5(storageV5);
  let credentials = credentialsStoreFor(pinnedStorage);
  let workerAuthClient = createWorkerAuthClient(config.initialAccessToken, credentials, pinnedStorage);
  if (isStorageV5Enabled() && pinnedStorage !== undefined) {
    initDefaultDebugLog({
      storageV5: pinnedStorage,
    });
    watchGlobalConfigThroughStorage(pinnedStorage);
    let [
      { composePolicyLimitsClient, primePolicyLimitsCache },
      { primeFastPathCredentials },
      { setGrowthBookCredentials, setGrowthBookStorageBackend },
    ] = await Promise.all([
      import("../services/policyLimits/DefaultPolicyLimitsClientSlot.lazy.js"),
      import("../utils/primeFastPathCredentials.lazy.js"),
      import("../services/analytics/ATIS_REQUEST_HEADER.lazy.js"),
    ]);
    composePolicyLimitsClient({
      storageV5: pinnedStorage,
      credentials,
    });
    setGrowthBookCredentials(credentials);
    setGrowthBookStorageBackend(pinnedStorage);
    await primeFastPathCredentials(credentials);
    await primePolicyLimitsCache(pinnedStorage);
    await seedInstallIDs(pinnedStorage);
  }
  try {
    await spec.run(
      parsed.data,
      abortController.signal,
      (line) =>
        process.stdout.write(
          line +
            `
`,
        ),
      workerAuthClient,
      pinnedStorage,
      credentials,
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
  let current = error;
  for (let i = 0; current != null && i < 8; i++) {
    if (current.errorType === FOLDER_ALREADY_SERVED_ERROR_TYPE) return true;
    current = current.cause;
  }
  return false;
}
//@ chunk-e3de30et.js:16216-16390 placement
function getErrorHttpStatus(error) {
  let current = error;
  for (let i = 0; current != null && i < 8; i++) {
    let status = current.status;
    if (typeof status === "number") return status;
    let status_2 = current.response?.status;
    if (typeof status_2 === "number") return status_2;
    current = current.cause;
  }
  return;
}
//@ chunk-e3de30et.js:16390-16403 placement
var WORKER_STOP_TIMEOUT_MS = 30000;
//@ chunk-e3de30et.js:16403-16466 placement
function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-e3de30et.js:16466-16904 placement
/**
 * 定期检查父进程是否存活，父进程消失时退出 worker。
 */
function watchParentProcess(abortController, overrides) {
  let hooks = {
    ppid: () => process.ppid,
    isAlive: isProcessAlive,
    log: (line) =>
      process.stdout.write(
        line +
          `
`,
      ),
    onGone: () => process.exit(0),
    intervalMs: WORKER_STOP_TIMEOUT_MS,
    exitGraceMs: 2000,
    ...overrides,
  };
  let parentPid = hooks.ppid();
  if (parentPid <= 1) return;
  let exited = false;
  let interval = setInterval(() => {
    if (exited) return;
    if (!(!hooks.isAlive(parentPid) || (getPlatform() !== "windows" && hooks.ppid() !== parentPid))) return;
    exited = true;
    clearInterval(interval);
    hooks.log("parent supervisor gone \u2014 exiting");
    abortController.abort();
    setTimeout(hooks.onGone, hooks.exitGraceMs).unref();
  }, hooks.intervalMs);
  interval.unref();
  return interval;
}
export { WORKER_KINDS, isWorkerKindAdmitted, runDaemonWorker };
