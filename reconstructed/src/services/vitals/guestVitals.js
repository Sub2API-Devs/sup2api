/**
 * services/vitals/guestVitals.ts
 *
 * 访客 vitals 上报（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ar4s2yky.js (1), chunk-qbkav8vn.js (5)
 * attribution: placement 6
 */
import { isAbsolute } from "path";
import { spawn } from "child_process";
import { createInterface } from "readline";
import { env } from "../../utils/env.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { errorMessage, getErrnoCode } from "../../utils/errors.js";
import { whichAsync } from "../../utils/which.js";
import { withDeadline } from "../../utils/sleep.js";
import { moveKeeperPid } from "../../utils/toolCgroup.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { CCR_SESSION_INGRESS_TOKEN_PATH, z1e } from "../../utils/authFileDescriptor.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { logForDebugging } from "../../utils/debug.js";
import { getTransportForUrl } from "../../cli/transports/transportUtils.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";

//@ chunk-qbkav8vn.js:528-621 placement
var T = "/root/.local/bin/vitals-emitter-guest",
  VITALS_EMITTER_GUEST = "vitals-emitter-guest",
  o = 5000,
  l = 1000,
  p = 30000;
/**
 * 启动访客 vitals 上报进程：CLAUDE_CODE_DISABLE_VITALS_EMITTER 或仅必要流量时不启动；解析到上报程序后启动 GuestVitalsEmitter，失败或被禁用时返回 null。
 */
//@ chunk-qbkav8vn.js:621-969 placement
async function startGuestVitals(e) {
  let { log: log } = e;
  try {
    if (env.CLAUDE_CODE_DISABLE_VITALS_EMITTER || isEssentialTrafficOnly())
      return (log("[vitals] kill switch or essential-traffic-only set; guest vitals disabled"), null);
    let t = await resolveVitalsEmitter(e);
    if (!t) return null;
    let s = new GuestVitalsEmitter(t.binary, t.viaFallback, e);
    return (await s.launch(), s.disabled ? null : s);
  } catch (error) {
    return (log(`[vitals] not started: ${errorMessage(error)}`), null);
  }
}
//@ chunk-qbkav8vn.js:969-1429 placement
async function resolveVitalsEmitter({ binaryResolution: binaryResolution, log: log }) {
  let VITALS_EMITTER_BIN = env.VITALS_EMITTER_BIN;
  if (VITALS_EMITTER_BIN && !isAbsolute(VITALS_EMITTER_BIN))
    return (
      log(
        `[vitals] VITALS_EMITTER_BIN must be an absolute path (got ${VITALS_EMITTER_BIN}); guest vitals disabled`,
      ),
      null
    );
  switch (binaryResolution) {
    case "pinned":
      if (!VITALS_EMITTER_BIN)
        return (
          log(
            "[vitals] VITALS_EMITTER_BIN not set; guest vitals disabled (this launcher does not search PATH)",
          ),
          null
        );
      return { binary: VITALS_EMITTER_BIN, viaFallback: !1 };
    case "search": {
      let s = VITALS_EMITTER_BIN || (await whichAsync(VITALS_EMITTER_GUEST));
      return s ? { binary: s, viaFallback: !1 } : { binary: T, viaFallback: !0 };
    }
  }
}
/**
 * 访客 vitals 上报子进程管理（退出、SIGTERM/SIGKILL）
 */
//@ chunk-qbkav8vn.js:1429-3806 placement
class GuestVitalsEmitter {
  binary;
  binaryViaFallback;
  options;
  child = null;
  spawnedAt = 0;
  respawnTimer = null;
  nextBackoffMs = l;
  stopping = !1;
  disabled = !1;
  reportedOk = !1;
  reportedUnexpectedExit = !1;
  constructor(e, n, t) {
    this.binary = e;
    this.binaryViaFallback = n;
    this.options = t;
  }
  async stop() {
    if (((this.stopping = !0), this.respawnTimer))
      (clearTimeout(this.respawnTimer), (this.respawnTimer = null));
    let child = this.child;
    if (!child) return;
    let promise = new Promise((s) => {
      (child.once("exit", () => s()), child.once("error", () => s()));
    });
    child.kill("SIGTERM");
    let t = setTimeout((s) => s.kill("SIGKILL"), o, child);
    (t.unref(), await withDeadline(promise, 2 * o), clearTimeout(t));
  }
  async launch() {
    let {
        sessionId: sessionId,
        apiBaseUrl: apiBaseUrl,
        tokenFilePath: tokenFilePath,
        log: log,
      } = this.options,
      r;
    try {
      r = spawn(
        this.binary,
        ["--session-id", sessionId, "--api-url", apiBaseUrl, "--token-file", tokenFilePath],
        { cwd: void 0, env: buildVitalsEmitterEnv(), stdio: ["pipe", "ignore", "pipe"], windowsHide: !0 },
      );
    } catch (error) {
      (log(`[vitals] spawn threw: ${errorMessage(error)}; guest vitals disabled for this session`),
        (this.disabled = !0));
      return;
    }
    if (
      (moveKeeperPid(r.pid),
      (this.child = r),
      (this.spawnedAt = Date.now()),
      r.stdin?.on("error", () => {}),
      r.on("error", (a) => this.onChildGone(r, a)),
      r.on("exit", (a, u) => this.onChildGone(r, null, `exited (code=${a} signal=${u})`)),
      r.on("spawn", () => {
        if ((log(`[vitals] spawned ${this.binary} pid=${r.pid}`), !this.reportedOk))
          ((this.reportedOk = !0), logFeatureOk("ccr_vitals_emitter"));
      }),
      r.stderr)
    )
      createInterface({ input: r.stderr }).on("line", (a) => log(`[vitals] ${a}`));
    await new Promise((a) => {
      (r.once("spawn", () => a()), r.once("error", () => a()));
    });
  }
  onChildGone(e, n, t = `spawn error: ${n?.message}`) {
    if (this.child !== e) return;
    ((this.child = null), e.stdin?.destroy());
    let { log: log } = this.options;
    if (this.stopping) {
      log(`[vitals] emitter stopped (${t})`);
      return;
    }
    if (n) {
      let r = getErrnoCode(n);
      if (r === "EAGAIN" || r === "ENOMEM") {
        (log(`[vitals] transient spawn failure (${r}); respawning`), this.scheduleRespawn());
        return;
      }
      if (((this.disabled = !0), r === "ENOENT" || (r === "EACCES" && this.binaryViaFallback)))
        log(`[vitals] ${this.binary} not found; guest vitals disabled for this session`);
      else
        (log(`[vitals] ${t}; guest vitals disabled for this session`),
          logFeatureBad("ccr_vitals_emitter", "spawn_failed"));
      return;
    }
    if ((log(`[vitals] emitter ${t}`), !this.reportedUnexpectedExit))
      ((this.reportedUnexpectedExit = !0), logFeatureSad("ccr_vitals_emitter", "exited_unexpectedly"));
    if (Date.now() - this.spawnedAt > p) this.nextBackoffMs = l;
    this.scheduleRespawn();
  }
  scheduleRespawn() {
    let nextBackoffMs = this.nextBackoffMs;
    ((this.nextBackoffMs = Math.min(nextBackoffMs * 2, p)),
      this.options.log(`[vitals] respawning in ${nextBackoffMs}ms`),
      (this.respawnTimer = setTimeout(() => {
        ((this.respawnTimer = null), this.launch());
      }, nextBackoffMs)),
      this.respawnTimer.unref());
  }
}
/**
 * 构造 vitals 上报进程的环境变量（版本、包名、问题反馈地址等）。
 */
//@ chunk-qbkav8vn.js:3806-4653 placement
function buildVitalsEmitterEnv() {
  let e = {
      USER_TYPE: "external",
      NODE_ENV: "production",
      VITALS_CLI_VERSION: {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
    },
    n = {
      PATH: env.PATH,
      HOME: env.HOME,
      TMPDIR: env.TMPDIR,
      HTTPS_PROXY: env.HTTPS_PROXY,
      https_proxy: env.https_proxy,
      HTTP_PROXY: env.HTTP_PROXY,
      http_proxy: env.http_proxy,
      NO_PROXY: env.NO_PROXY,
      no_proxy: env.no_proxy,
      SSL_CERT_FILE: env.SSL_CERT_FILE,
    };
  for (let [t, s] of Object.entries(n)) if (s !== void 0) e[t] = s;
  return e;
}
/**
 * 在 worker 上启动访客 vitals：需要会话令牌文件，缺失时记录并禁用。
 */
//@ chunk-ar4s2yky.js:1458-1842 placement
async function startWorkerGuestVitals({ sessionId: sessionId, sdkUrl: sdkUrl }) {
  try {
    let r = env.CLAUDE_SESSION_INGRESS_TOKEN_FILE ?? CCR_SESSION_INGRESS_TOKEN_PATH;
    if (!(await readSmallFileOrNull(r, z1e))?.trim()) {
      logForDebugging("[vitals] no session token file on this worker; guest vitals disabled");
      return;
    }
    let o = await startGuestVitals({
      sessionId: sessionId,
      apiBaseUrl: getTransportForUrl(new URL(sdkUrl)).origin,
      tokenFilePath: r,
      binaryResolution: "search",
      log: logForDebugging,
    });
    if (o) registerCleanup(() => o.stop());
  } catch (error) {
    logForDebugging(`[vitals] not started: ${errorMessage(error)}`);
  }
}

export { startGuestVitals };
