/**
 * utils/permissions/autoModeState.ts
 *
 * 2.1.316 新增：每宿主一份的 auto mode 状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/autoModeState.ts
 * pieces: chunk-bwbq4xvm.js (29)
 * attribution: placement 29
 */
import { logForDebugging } from "../debug.js";
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../env.js";
import { errorMessage } from "../errors.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

/**
 * 每个宿主一份的自动模式状态：active、计划模式下自动关闭、CLI 标志、熔断、快速模式熔断原因、回退、HIPAA 污染暂停、被拒的 MCP 跳过等。
 */
//@ chunk-bwbq4xvm.js:170430-171570 placement
class AutoModeState {
  #e = !1;
  #t = !1;
  #s = !1;
  #n = null;
  #r = !1;
  #o = !1;
  #a = void 0;
  #i = !1;
  #l = void 0;
  #d = !1;
  #c = void 0;
  #h = new Set();
  get active() {
    return this.#e;
  }
  get flagCli() {
    return this.#t;
  }
  get circuitBroken() {
    return this.#s;
  }
  get fastModeBreakerReason() {
    return this.#n;
  }
  get fromFallback() {
    return this.#r;
  }
  get provisionalStartupMode() {
    return this.#a;
  }
  get autoStartWithheldForHipaaTaint() {
    return this.#i;
  }
  setAutoStartWithheldForHipaaTaint(e) {
    this.#i = e;
  }
  get envOnboardingEligible() {
    return this.#l;
  }
  get envOnboardingShownLogged() {
    return this.#d;
  }
  get accountSetMode() {
    return this.#c;
  }
  setActive(e) {
    this.#e = e;
  }
  setFlagCli(e) {
    this.#t = e;
  }
  setCircuitBroken(e) {
    this.#s = e;
  }
  setFastModeBreakerReason(e) {
    this.#n = e;
  }
  setPlanOffAtLaunch(e) {
    this.#o = e;
  }
  get planOffAtLaunch() {
    return this.#o;
  }
  setFromFallback(e) {
    this.#r = e;
  }
  setProvisionalStartupMode(e) {
    this.#a = e;
  }
  setEnvOnboardingEligible(e) {
    this.#l = e;
  }
  setEnvOnboardingShownLogged(e) {
    this.#d = e;
  }
  setAccountSetMode(e) {
    this.#c = e;
  }
  noteRefusedMcpSkip(e) {
    this.#h.add(e);
  }
  hadRefusedMcpSkip(e) {
    return this.#h.has(e);
  }
  reset() {
    ((this.#e = !1),
      (this.#t = !1),
      (this.#s = !1),
      (this.#n = null),
      (this.#r = !1),
      (this.#o = !1),
      (this.#a = void 0),
      (this.#i = !1),
      (this.#l = void 0),
      (this.#d = !1),
      (this.#c = void 0),
      this.#h.clear());
  }
}
//@ chunk-bwbq4xvm.js:171570-171597 placement
var autoModeStates = new HostScoped(() => new AutoModeState());
//@ chunk-bwbq4xvm.js:171597-171635 placement
function getAutoModeState() {
  return autoModeStates.of(getRootSession().host);
}
//@ chunk-bwbq4xvm.js:171635-171668 placement
function setAutoModeActive(e) {
  getAutoModeState().setActive(e);
}
//@ chunk-bwbq4xvm.js:171668-171701 placement
function isAutoModeActive() {
  return getAutoModeState().active;
}
/**
 * 当前权限上下文是否走自动模式审批面：auto 模式，或计划模式下自动模式开启且非 served 调用、非 bypass 可用。
 */
//@ chunk-bwbq4xvm.js:171701-171819 placement
function isAutoModePermissionSurface(e) {
  return (
    e.mode === "auto" ||
    (e.mode === "plan" && e.servedCall !== !0 && isAutoModeActive() && !e.isBypassPermissionsModeAvailable)
  );
}
//@ chunk-bwbq4xvm.js:171819-171879 placement = handleAutoModeTransition (0.799)
function isAutoClassifierActive(fromMode, toMode = !1) {
  return fromMode === "auto" || (fromMode === "plan" && !toMode && isAutoModeActive());
}
//@ chunk-bwbq4xvm.js:171879-171922 placement
function noteRefusedMcpSkip(e) {
  getAutoModeState().noteRefusedMcpSkip(e);
}
//@ chunk-bwbq4xvm.js:171922-171971 placement
function hadRefusedMcpSkip(e) {
  return getAutoModeState().hadRefusedMcpSkip(e);
}
//@ chunk-bwbq4xvm.js:171971-172014 placement
function setPlanAutoModeOffAtLaunch(e) {
  getAutoModeState().setPlanOffAtLaunch(e);
}
//@ chunk-bwbq4xvm.js:172014-172057 placement
function isPlanAutoModeOffAtLaunch() {
  return getAutoModeState().planOffAtLaunch;
}
//@ chunk-bwbq4xvm.js:172057-172092 placement
function setAutoModeFlagCli(e) {
  getAutoModeState().setFlagCli(e);
}
//@ chunk-bwbq4xvm.js:172092-172127 placement
function getAutoModeFlagCli() {
  return getAutoModeState().flagCli;
}
//@ chunk-bwbq4xvm.js:172127-172168 placement
function setAutoModeCircuitBroken(e) {
  getAutoModeState().setCircuitBroken(e);
}
//@ chunk-bwbq4xvm.js:172168-172209 placement
function isAutoModeCircuitBroken() {
  return getAutoModeState().circuitBroken;
}
//@ chunk-bwbq4xvm.js:172209-172258 placement
function setAutoModeFastModeBreakerReason(e) {
  getAutoModeState().setFastModeBreakerReason(e);
}
//@ chunk-bwbq4xvm.js:172258-172307 placement
function getAutoModeFastModeBreakerReason() {
  return getAutoModeState().fastModeBreakerReason;
}
//@ chunk-bwbq4xvm.js:172307-172347 placement
function setAutoModeFromFallback(e) {
  getAutoModeState().setFromFallback(e);
}
//@ chunk-bwbq4xvm.js:172347-172386 placement
function isAutoModeFromFallback() {
  return getAutoModeState().fromFallback;
}
//@ chunk-bwbq4xvm.js:172386-172436 placement
function setProvisionalStartupMode(e) {
  getAutoModeState().setProvisionalStartupMode(e);
}
//@ chunk-bwbq4xvm.js:172436-172494 placement
function isAutoStartWithheldForHipaaTaint() {
  return getAutoModeState().autoStartWithheldForHipaaTaint;
}
//@ chunk-bwbq4xvm.js:172494-172552 placement
function setAutoStartWithheldForHipaaTaint(e) {
  getAutoModeState().setAutoStartWithheldForHipaaTaint(e);
}
//@ chunk-bwbq4xvm.js:172552-172602 placement
function getProvisionalStartupMode() {
  return getAutoModeState().provisionalStartupMode;
}
//@ chunk-bwbq4xvm.js:172602-172651 placement
function getAutoModeEnvOnboardingEligible() {
  return getAutoModeState().envOnboardingEligible;
}
//@ chunk-bwbq4xvm.js:172651-172700 placement
function setAutoModeEnvOnboardingEligible(e) {
  getAutoModeState().setEnvOnboardingEligible(e);
}
//@ chunk-bwbq4xvm.js:172700-172752 placement
function getAutoModeEnvOnboardingShownLogged() {
  return getAutoModeState().envOnboardingShownLogged;
}
//@ chunk-bwbq4xvm.js:172752-172794 placement
function getAccountSetPermissionMode() {
  return getAutoModeState().accountSetMode;
}
//@ chunk-bwbq4xvm.js:172794-172836 placement
function setAccountSetPermissionMode(e) {
  getAutoModeState().setAccountSetMode(e);
}
//@ chunk-bwbq4xvm.js:172836-172888 placement
function setAutoModeEnvOnboardingShownLogged(e) {
  getAutoModeState().setEnvOnboardingShownLogged(e);
}

export {
  isAutoClassifierActive,
  isAutoModePermissionSurface,
  isAutoModeActive,
  noteRefusedMcpSkip,
  getAutoModeEnvOnboardingShownLogged,
  setAutoModeEnvOnboardingShownLogged,
  isAutoModeFromFallback,
  getAutoModeEnvOnboardingEligible,
  setAutoModeEnvOnboardingEligible,
  setAutoModeActive,
  isAutoModeCircuitBroken,
  setAutoModeCircuitBroken,
  setAutoModeFlagCli,
  getAccountSetPermissionMode,
  setProvisionalStartupMode,
  setAutoModeFromFallback,
  setAutoStartWithheldForHipaaTaint,
  getProvisionalStartupMode,
  setAutoModeFastModeBreakerReason,
  getAutoModeFlagCli,
  setPlanAutoModeOffAtLaunch,
  isPlanAutoModeOffAtLaunch,
  getAutoModeFastModeBreakerReason,
  setAccountSetPermissionMode,
  hadRefusedMcpSkip,
};
