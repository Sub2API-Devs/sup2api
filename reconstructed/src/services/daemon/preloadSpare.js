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
import { wTe } from "../../utils/knownEnvVars.js";
import { errorMessage } from "../../utils/errors.js";
import { readSpareClaim, applySpareClaim } from "../../daemon/bgSpare.js";
import { Ghi, Br } from "../../utils/startupTiming.js";
import { env } from "../../utils/env.js";

//@ chunk-9e524z2b.js:3948-3995 placement
var v = "/home/claude/.claude/remote/spare.sock";
/**
 * 备用（spare）预加载进程主流程：清理环境与旧 socket，注册退出清理，等待认领帧（收到连接后写 pid 并预加载模块），记录认领耗时后应用认领、接管会话。
 */
//@ chunk-9e524z2b.js:3995-4983 placement
async function runPreloadSpare(args, startPreload) {
  let socketPath = args[0] || v,
    pidPath = `${socketPath}.pid`,
    preloadReady = startPreload(),
    resolved = Promise.resolve(),
    g = !1;
  for (let o of wTe) delete process.env[o];
  try {
    (mkdirSync(dirname(socketPath), { recursive: !0, mode: 448 }), unlinkSync(socketPath));
  } catch {}
  let cleanupFiles = () => {
      for (let o of [socketPath, pidPath])
        try {
          unlinkSync(o);
        } catch {}
    },
    exitClean = () => {
      (cleanupFiles(), process.exit(0));
    },
    onUncaught = (o) => {
      (cleanupFiles(),
        process.stderr.write(`[preload] uncaughtException: ${errorMessage(o)}
`),
        process.exit(1));
    };
  for (let o of ["SIGTERM", "SIGHUP", "SIGINT"]) process.on(o, exitClean);
  process.on("uncaughtException", onUncaught);
  let claim;
  try {
    claim = await readSpareClaim(socketPath, () => {
      (writeFileSync(pidPath, String(process.pid), { mode: 384 }),
        (resolved = preloadSessionModules()),
        preloadReady.then(() => resolved).then(Ghi));
    });
  } catch (error) {
    (cleanupFiles(),
      process.stderr.write(`[preload] claim recv failed: ${errorMessage(error)}
`),
      process.exit(1));
  }
  let startTime = performance.now(),
    now = Date.now();
  for (let o of ["SIGTERM", "SIGHUP", "SIGINT"]) process.off(o, exitClean);
  (process.off("uncaughtException", onUncaught), cleanupFiles());
  let int = Number.parseInt(claim.env.CCR_SPAWN_TIMESTAMP_MS ?? "", 10);
  if (Number.isFinite(int)) Br("spare_claim_read_from_spawn_ms", now - int, int - performance.timeOrigin);
  (await preloadReady,
    await resolved,
    Br("spare_claim_module_wait_ms", performance.now() - startTime, startTime),
    await applySpareClaim(claim, preloadReady, () => {}));
}
/**
 * 并行预加载会话启动所需的模块（远程环境多加一个），返回 allSettled 结果。
 */
//@ chunk-9e524z2b.js:4983-5283 placement
function preloadSessionModules() {
  let r = [
    import("./chunk-tyg7f3ek.js"),
    import("./chunk-fhdzwff4.js"),
    import("./chunk-3h5pdzw6.js"),
    import("./chunk-9vvvg0d3.js"),
    import("./chunk-5kp2513a.js"),
  ];
  if ((r.push(import("./chunk-cgamr0t5.js")), env.CLAUDE_CODE_REMOTE)) r.push(import("./chunk-j9e5zgt8.js"));
  return Promise.allSettled(r);
}
//@ chunk-9e524z2b.js:5283-5347 placement
function U(r, n = () => import("./chunk-shkzs7rp.js")) {
  return runPreloadSpare(r, n);
}
