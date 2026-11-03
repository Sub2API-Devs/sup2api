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
import { vS, Ehe } from "../../utils/remoteEnvironment.js";
import { applySdkCliEntrypointOverride } from "../../constants/system.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { isMacOS } from "../../services/preventSleep.js";
import { oen, DAs, sen } from "../../utils/forkSourceNote.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

/**
 * 按宿主懒建的 StdoutGuard 单例。
 */
//@ chunk-tyg7f3ek.js:395444-395469 sole-consumer
var stdoutGuardSlot = new HostScoped(() => new installStreamJsonStdoutGuard());
//@ chunk-tyg7f3ek.js:395469-395503 placement
function installStdoutGuard(e) {
  stdoutGuardSlot.of(e).install();
}
//@ chunk-tyg7f3ek.js:395503-395736 placement
function applyBridgeChildCliEntrypoint() {
  if (env.CLAUDE_CODE_BRIDGE_CHILD_CLI_ENTRYPOINT !== !0 || !isBridgeRcChildCliEntrypointEnabled()) return;
  if ((env.unset("CLAUDE_CODE_BRIDGE_CHILD_CLI_ENTRYPOINT"), vS()))
    if (applySdkCliEntrypointOverride()) logFeatureOk("bridge_cli_entrypoint_name");
    else logFeatureSad("bridge_cli_entrypoint_name", "name_not_taken");
}
//@ chunk-tyg7f3ek.js:395736-395770 placement
var KEEP_AWAKE_TIMEOUTS_MS = 900000,
  qq = 3600000,
  jq = 60000;
/**
 * macOS 上 Remote Control 桥会话运行轮次时阻止系统睡眠，空闲或超时释放。
 */
//@ chunk-tyg7f3ek.js:395770-396442 placement
function createBridgeTurnKeepAwake(e) {
  if (!Ehe() || !isMacOS()) return () => {};
  let n = "idle",
    r,
    s,
    h = !1,
    y = !1,
    S;
  function R(x) {
    if (n === "idle") return ((h = !1), (r = void 0), !1);
    if (s !== void 0 && x - s >= qq) h = !0;
    if (h || !isBridgeTurnKeepAwakeEnabled()) return !1;
    if (!e.waitingOnUser) return ((r = void 0), !0);
    return ((r ??= x), x - r < KEEP_AWAKE_TIMEOUTS_MS);
  }
  function w() {
    let now = Date.now(),
      G = R(now);
    if (G === (s !== void 0)) return;
    if (G) {
      ((s = now), oen(), (S = setInterval(P, jq)), S.unref());
      return;
    }
    ((s = void 0), clearInterval(S));
    let Z = DAs();
    if ((sen(), !y))
      if (((y = !0), Z)) logFeatureOk("bridge_turn_keep_awake");
      else logFeatureBad("bridge_turn_keep_awake", "no_inhibitor");
  }
  function P() {
    try {
      w();
    } catch (error) {
      logForDebugging(`keep-awake hold failed: ${errorMessage(error)}`, { level: "error" });
    }
  }
  function L(x) {
    ((n = x), P());
  }
  let subscribe = e.stateChanged.subscribe(L);
  return (
    L(e.getState()),
    () => {
      (subscribe(), L("idle"));
    }
  );
}

export { installStdoutGuard, createBridgeTurnKeepAwake, applyBridgeChildCliEntrypoint };
