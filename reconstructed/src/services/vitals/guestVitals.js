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
import { CCR_SESSION_INGRESS_TOKEN_PATH, MAX_CREDENTIAL_BYTES } from "../../utils/authFileDescriptor.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { logForDebugging } from "../../utils/debug.js";
import { getTransportForUrl } from "../../cli/transports/transportUtils.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";

//@ chunk-qbkav8vn.js:528-621 placement
/**
 * 访客 vitals 上报程序：回退路径、终止宽限与重启退避区间。
 */
var GUEST_VITALS_FALLBACK_BIN = "/root/.local/bin/vitals-emitter-guest";
var VITALS_EMITTER_GUEST = "vitals-emitter-guest";
var VITALS_KILL_GRACE_MS = 5000;
var VITALS_RESPAWN_BASE_MS = 1000;
var VITALS_RESPAWN_MAX_MS = 30000;
//@ chunk-qbkav8vn.js:621-969 placement
/**
 * 启动访客 vitals 上报进程：CLAUDE_CODE_DISABLE_VITALS_EMITTER 或仅必要流量时不启动；解析到上报程序后启动 GuestVitalsEmitter，失败或被禁用时返回 null。
 */
async function startGuestVitals(options) {
  let { log } = options;
  try {
    if (env.CLAUDE_CODE_DISABLE_VITALS_EMITTER || isEssentialTrafficOnly()) {
      log("[vitals] kill switch or essential-traffic-only set; guest vitals disabled");
      return null;
    }
    let vitalsEmitter = await resolveVitalsEmitter(options);
    if (!vitalsEmitter) return null;
    let s = new GuestVitalsEmitter(vitalsEmitter.binary, vitalsEmitter.viaFallback, options);
    await s.launch();
    return s.disabled ? null : s;
  } catch (error) {
    log(`[vitals] not started: ${errorMessage(error)}`);
    return null;
  }
}
//@ chunk-qbkav8vn.js:969-1429 placement
async function resolveVitalsEmitter({ binaryResolution, log }) {
  let VITALS_EMITTER_BIN = env.VITALS_EMITTER_BIN;
  if (VITALS_EMITTER_BIN && !isAbsolute(VITALS_EMITTER_BIN)) {
    log(
      `[vitals] VITALS_EMITTER_BIN must be an absolute path (got ${VITALS_EMITTER_BIN}); guest vitals disabled`,
    );
    return null;
  }
  switch (binaryResolution) {
    case "pinned":
      if (!VITALS_EMITTER_BIN) {
        log(
          "[vitals] VITALS_EMITTER_BIN not set; guest vitals disabled (this launcher does not search PATH)",
        );
        return null;
      }
      return {
        binary: VITALS_EMITTER_BIN,
        viaFallback: false,
      };
    case "search": {
      let s = VITALS_EMITTER_BIN || (await whichAsync(VITALS_EMITTER_GUEST));
      return s
        ? {
            binary: s,
            viaFallback: false,
          }
        : {
            binary: GUEST_VITALS_FALLBACK_BIN,
            viaFallback: true,
          };
    }
  }
}
//@ chunk-qbkav8vn.js:1429-3806 placement
/**
 * 访客 vitals 上报子进程管理（退出、SIGTERM/SIGKILL）
 */
class GuestVitalsEmitter {
  binary;
  binaryViaFallback;
  options;
  child = null;
  spawnedAt = 0;
  respawnTimer = null;
  nextBackoffMs = VITALS_RESPAWN_BASE_MS;
  stopping = false;
  disabled = false;
  reportedOk = false;
  reportedUnexpectedExit = false;
  constructor(binary, binaryViaFallback, options) {
    this.binary = binary;
    this.binaryViaFallback = binaryViaFallback;
    this.options = options;
  }
  async stop() {
    this.stopping = true;
    if (this.respawnTimer) {
      clearTimeout(this.respawnTimer);
      this.respawnTimer = null;
    }
    let child = this.child;
    if (!child) return;
    let promise = new Promise((resolve) => {
      child.once("exit", () => resolve());
      child.once("error", () => resolve());
    });
    child.kill("SIGTERM");
    let timer = setTimeout((s) => s.kill("SIGKILL"), VITALS_KILL_GRACE_MS, child);
    timer.unref();
    await withDeadline(promise, 2 * VITALS_KILL_GRACE_MS);
    clearTimeout(timer);
  }
  async launch() {
    let { sessionId, apiBaseUrl, tokenFilePath, log } = this.options;
    let r;
    try {
      r = spawn(
        this.binary,
        ["--session-id", sessionId, "--api-url", apiBaseUrl, "--token-file", tokenFilePath],
        {
          cwd: undefined,
          env: buildVitalsEmitterEnv(),
          stdio: ["pipe", "ignore", "pipe"],
          windowsHide: true,
        },
      );
    } catch (error) {
      log(`[vitals] spawn threw: ${errorMessage(error)}; guest vitals disabled for this session`);
      this.disabled = true;
      return;
    }
    moveKeeperPid(r.pid);
    this.child = r;
    this.spawnedAt = Date.now();
    r.stdin?.on("error", () => {});
    r.on("error", (a) => this.onChildGone(r, a));
    r.on("exit", (a, u) => this.onChildGone(r, null, `exited (code=${a} signal=${u})`));
    r.on("spawn", () => {
      log(`[vitals] spawned ${this.binary} pid=${r.pid}`);
      if (!this.reportedOk) {
        this.reportedOk = true;
        logFeatureOk("ccr_vitals_emitter");
      }
    });
    if (r.stderr)
      createInterface({
        input: r.stderr,
      }).on("line", (a) => log(`[vitals] ${a}`));
    await new Promise((resolve) => {
      r.once("spawn", () => resolve());
      r.once("error", () => resolve());
    });
  }
  onChildGone(e, n, t = `spawn error: ${n?.message}`) {
    if (this.child !== e) return;
    this.child = null;
    e.stdin?.destroy();
    let { log } = this.options;
    if (this.stopping) {
      log(`[vitals] emitter stopped (${t})`);
      return;
    }
    if (n) {
      let errnoCode = getErrnoCode(n);
      if (errnoCode === "EAGAIN" || errnoCode === "ENOMEM") {
        log(`[vitals] transient spawn failure (${errnoCode}); respawning`);
        this.scheduleRespawn();
        return;
      }
      this.disabled = true;
      if (errnoCode === "ENOENT" || (errnoCode === "EACCES" && this.binaryViaFallback))
        log(`[vitals] ${this.binary} not found; guest vitals disabled for this session`);
      else {
        log(`[vitals] ${t}; guest vitals disabled for this session`);
        logFeatureBad("ccr_vitals_emitter", "spawn_failed");
      }
      return;
    }
    log(`[vitals] emitter ${t}`);
    if (!this.reportedUnexpectedExit) {
      this.reportedUnexpectedExit = true;
      logFeatureSad("ccr_vitals_emitter", "exited_unexpectedly");
    }
    if (Date.now() - this.spawnedAt > VITALS_RESPAWN_MAX_MS) this.nextBackoffMs = VITALS_RESPAWN_BASE_MS;
    this.scheduleRespawn();
  }
  scheduleRespawn() {
    let nextBackoffMs = this.nextBackoffMs;
    this.nextBackoffMs = Math.min(nextBackoffMs * 2, VITALS_RESPAWN_MAX_MS);
    this.options.log(`[vitals] respawning in ${nextBackoffMs}ms`);
    this.respawnTimer = setTimeout(() => {
      this.respawnTimer = null;
      this.launch();
    }, nextBackoffMs);
    this.respawnTimer.unref();
  }
}
//@ chunk-qbkav8vn.js:3806-4653 placement
/**
 * 构造 vitals 上报进程的环境变量（版本、包名、问题反馈地址等）。
 */
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
  };
  let n = {
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
  for (let [key, value] of Object.entries(n)) if (value !== undefined) e[key] = value;
  return e;
}
//@ chunk-ar4s2yky.js:1458-1842 placement
/**
 * 在 worker 上启动访客 vitals：需要会话令牌文件，缺失时记录并禁用。
 */
async function startWorkerGuestVitals({ sessionId, sdkUrl }) {
  try {
    let CLAUDE_SESSION_INGRESS_TOKEN_FILE =
      env.CLAUDE_SESSION_INGRESS_TOKEN_FILE ?? CCR_SESSION_INGRESS_TOKEN_PATH;
    if (!(await readSmallFileOrNull(CLAUDE_SESSION_INGRESS_TOKEN_FILE, MAX_CREDENTIAL_BYTES))?.trim()) {
      logForDebugging("[vitals] no session token file on this worker; guest vitals disabled");
      return;
    }
    let guestVitals = await startGuestVitals({
      sessionId,
      apiBaseUrl: getTransportForUrl(new URL(sdkUrl)).origin,
      tokenFilePath: CLAUDE_SESSION_INGRESS_TOKEN_FILE,
      binaryResolution: "search",
      log: logForDebugging,
    });
    if (guestVitals) registerCleanup(() => guestVitals.stop());
  } catch (error) {
    logForDebugging(`[vitals] not started: ${errorMessage(error)}`);
  }
}
export { startGuestVitals };
