/**
 * services/daemon/preloadSpare.ts
 *
 * 2.1.316 新增：预加载备用进程
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9e524z2b.js (4)
 * attribution: placement 4
 */
import { mkdirSync, unlinkSync, writeFileSync } from "fs";
import { dirname } from "path";
import { KNOWN_HOST_ENV_VARS } from "../../utils/knownEnvVars.js";
import { errorMessage } from "../../utils/errors.js";
import { readSpareClaim, applySpareClaim } from "../../daemon/bgSpare.js";
import { markSpareLoaded, recordPhase } from "../../utils/startupTiming.js";
import { env } from "../../utils/env.js";

//@ chunk-9e524z2b.js:3948-3995 placement
/**
 * 备用（spare）进程 socket 的默认路径。
 */
var DEFAULT_SPARE_SOCKET = "/home/claude/.claude/remote/spare.sock";
//@ chunk-9e524z2b.js:3995-4983 placement
/**
 * 备用（spare）预加载进程主流程：清理环境与旧 socket，注册退出清理，等待认领帧（收到连接后写 pid 并预加载模块），记录认领耗时后应用认领、接管会话。
 */
async function runPreloadSpare_2(args, startPreload) {
  let socketPath = args[0] || DEFAULT_SPARE_SOCKET;
  let pidPath = `${socketPath}.pid`;
  let preloadReady = startPreload();
  let resolved = Promise.resolve();
  let socketPath_2 = false;
  for (let pidPath of KNOWN_HOST_ENV_VARS) delete process.env[pidPath];
  try {
    mkdirSync(dirname(socketPath), {
      recursive: true,
      mode: 448,
    });
    unlinkSync(socketPath);
  } catch {}
  let cleanupFiles = () => {
    for (let claim of [socketPath, pidPath])
      try {
        unlinkSync(claim);
      } catch {}
  };
  let exitClean = () => {
    cleanupFiles();
    process.exit(0);
  };
  let onUncaught = (err) => {
    cleanupFiles();
    process.stderr.write(`[preload] uncaughtException: ${errorMessage(err)}
`);
    process.exit(1);
  };
  for (let err of ["SIGTERM", "SIGHUP", "SIGINT"]) process.on(err, exitClean);
  process.on("uncaughtException", onUncaught);
  let claim;
  try {
    claim = await readSpareClaim(socketPath, () => {
      writeFileSync(pidPath, String(process.pid), {
        mode: 384,
      });
      resolved = preloadSessionModules();
      preloadReady.then(() => resolved).then(markSpareLoaded);
    });
  } catch (error) {
    cleanupFiles();
    process.stderr.write(`[preload] claim recv failed: ${errorMessage(error)}
`);
    process.exit(1);
  }
  let startTime = performance.now();
  let now = Date.now();
  for (let signal of ["SIGTERM", "SIGHUP", "SIGINT"]) process.off(signal, exitClean);
  process.off("uncaughtException", onUncaught);
  cleanupFiles();
  let spawnTs = Number.parseInt(claim.env.CCR_SPAWN_TIMESTAMP_MS ?? "", 10);
  if (Number.isFinite(spawnTs))
    recordPhase("spare_claim_read_from_spawn_ms", now - spawnTs, spawnTs - performance.timeOrigin);
  await preloadReady;
  await resolved;
  recordPhase("spare_claim_module_wait_ms", performance.now() - startTime, startTime);
  await applySpareClaim(claim, preloadReady, () => {});
}
//@ chunk-9e524z2b.js:4983-5283 placement
/**
 * 并行预加载会话启动所需的模块（远程环境多加一个），返回 allSettled 结果。
 */
function preloadSessionModules() {
  let loads = [
    import("../../bridge/MAX_DECLARED_DIALOG_KINDS.lazy.js"),
    import("../../isDesktopEntrypointExempted.lazy.js"),
    import("../../tasks/installObserverSpawner.lazy.js"),
    import("../../utils/telemetry/bigQueryExportIntervalMs.lazy.js"),
    import("../../utils/backgroundHousekeeping.js"),
  ];
  loads.push(import("../../utils/udsMessaging.js"));
  if (env.CLAUDE_CODE_REMOTE) loads.push(import("../../upstreamproxy/upstreamproxy.js"));
  return Promise.allSettled(loads);
}
//@ chunk-9e524z2b.js:5283-5347 placement
/**
 * 运行预加载备用进程（可注入加载函数）。
 */
function runPreloadSpare(timeoutMs, startPreload = () => import("../../main.js")) {
  return runPreloadSpare_2(timeoutMs, startPreload);
}
export { runPreloadSpare };
