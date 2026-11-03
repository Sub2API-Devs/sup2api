/**
 * cli/print/bridgeKeepAwake.ts
 *
 * 2.1.316 新增：桥接回合期间保持唤醒、子 CLI 入口与 stdout 保护
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (5)
 * attribution: sole-consumer 1, placement 4
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { installStreamJsonStdoutGuard } from "../../utils/streamJsonStdoutGuard.js";
import { env } from "../../utils/env.js";
import {
  isBridgeRcChildCliEntrypointEnabled,
  isBridgeTurnKeepAwakeEnabled,
} from "../../bridge/bridgeGates.js";
import { isBridgeEnvironment, isTopLevelBridgeSession } from "../../utils/remoteEnvironment.js";
import { applySdkCliEntrypointOverride } from "../../constants/system.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { isMacOS } from "../../services/preventSleep.js";
import {
  acquireSleepPreventer,
  isSleepPreventerHeld,
  releaseSleepPreventer,
} from "../../utils/forkSourceNote.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-tyg7f3ek.js:395444-395469 sole-consumer
/**
 * 按宿主懒建的 StdoutGuard 单例。
 */
var stdoutGuardSlot = new HostScoped(() => new installStreamJsonStdoutGuard());
//@ chunk-tyg7f3ek.js:395469-395503 placement
function installStdoutGuard(host) {
  stdoutGuardSlot.of(host).install();
}
//@ chunk-tyg7f3ek.js:395503-395736 placement
function applyBridgeChildCliEntrypoint() {
  if (env.CLAUDE_CODE_BRIDGE_CHILD_CLI_ENTRYPOINT !== true || !isBridgeRcChildCliEntrypointEnabled()) return;
  env.unset("CLAUDE_CODE_BRIDGE_CHILD_CLI_ENTRYPOINT");
  if (isBridgeEnvironment())
    if (applySdkCliEntrypointOverride()) logFeatureOk("bridge_cli_entrypoint_name");
    else logFeatureSad("bridge_cli_entrypoint_name", "name_not_taken");
}
//@ chunk-tyg7f3ek.js:395736-395770 placement
var KEEP_AWAKE_TIMEOUTS_MS = 900000;
var KEEP_AWAKE_MAX_IDLE_MS = 3600000;
var KEEP_AWAKE_RENEW_INTERVAL_MS = 60000;
//@ chunk-tyg7f3ek.js:395770-396442 placement
/**
 * macOS 上 Remote Control 桥会话运行轮次时阻止系统睡眠，空闲或超时释放。
 */
function createBridgeTurnKeepAwake(sessionState) {
  if (!isTopLevelBridgeSession() || !isMacOS()) return () => {};
  let n = "idle";
  let r;
  let s;
  let h = false;
  let y = false;
  let S;
  function R(x) {
    if (n === "idle") {
      h = false;
      r = undefined;
      return false;
    }
    if (s !== undefined && x - s >= KEEP_AWAKE_MAX_IDLE_MS) h = true;
    if (h || !isBridgeTurnKeepAwakeEnabled()) return false;
    if (!sessionState.waitingOnUser) {
      r = undefined;
      return true;
    }
    r ??= x;
    return x - r < KEEP_AWAKE_TIMEOUTS_MS;
  }
  function w() {
    let now = Date.now();
    let G = R(now);
    if (G === (s !== undefined)) return;
    if (G) {
      s = now;
      acquireSleepPreventer();
      S = setInterval(P, KEEP_AWAKE_RENEW_INTERVAL_MS);
      S.unref();
      return;
    }
    s = undefined;
    clearInterval(S);
    let Z = isSleepPreventerHeld();
    releaseSleepPreventer();
    if (!y) {
      y = true;
      if (Z) logFeatureOk("bridge_turn_keep_awake");
      else logFeatureBad("bridge_turn_keep_awake", "no_inhibitor");
    }
  }
  function P() {
    try {
      w();
    } catch (error) {
      logForDebugging(`keep-awake hold failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
  function L(state) {
    n = state;
    P();
  }
  let q = sessionState.stateChanged.subscribe(L);
  L(sessionState.getState());
  return () => {
    q();
    L("idle");
  };
}
export { installStdoutGuard, createBridgeTurnKeepAwake, applyBridgeChildCliEntrypoint };
