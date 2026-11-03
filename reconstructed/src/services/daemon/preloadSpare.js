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
  let g = false;
  for (let o of KNOWN_HOST_ENV_VARS) delete process.env[o];
  try {
    mkdirSync(dirname(socketPath), {
      recursive: true,
      mode: 448,
    });
    unlinkSync(socketPath);
  } catch {}
  let cleanupFiles = () => {
    for (let o of [socketPath, pidPath])
      try {
        unlinkSync(o);
      } catch {}
  };
  let exitClean = () => {
    cleanupFiles();
    process.exit(0);
  };
  let onUncaught = (o) => {
    cleanupFiles();
    process.stderr.write(`[preload] uncaughtException: ${errorMessage(o)}
`);
    process.exit(1);
  };
  for (let o of ["SIGTERM", "SIGHUP", "SIGINT"]) process.on(o, exitClean);
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
  for (let o of ["SIGTERM", "SIGHUP", "SIGINT"]) process.off(o, exitClean);
  process.off("uncaughtException", onUncaught);
  cleanupFiles();
  let m = Number.parseInt(claim.env.CCR_SPAWN_TIMESTAMP_MS ?? "", 10);
  if (Number.isFinite(m)) recordPhase("spare_claim_read_from_spawn_ms", now - m, m - performance.timeOrigin);
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
  let r = [
    import("./chunk-tyg7f3ek.js"),
    import("./chunk-fhdzwff4.js"),
    import("./chunk-3h5pdzw6.js"),
    import("./chunk-9vvvg0d3.js"),
    import("./chunk-5kp2513a.js"),
  ];
  r.push(import("./chunk-cgamr0t5.js"));
  if (env.CLAUDE_CODE_REMOTE) r.push(import("./chunk-j9e5zgt8.js"));
  return Promise.allSettled(r);
}
//@ chunk-9e524z2b.js:5283-5347 placement
/**
 * 运行预加载备用进程（可注入加载函数）。
 */
function runPreloadSpare(r, startPreload = () => import("./chunk-shkzs7rp.js")) {
  return runPreloadSpare_2(r, startPreload);
}
