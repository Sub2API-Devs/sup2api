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
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../env.js";
import { errorMessage } from "../errors.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-bwbq4xvm.js:170430-171570 placement
/**
 * 每个宿主一份的自动模式状态：active、计划模式下自动关闭、CLI 标志、熔断、快速模式熔断原因、回退、HIPAA 污染暂停、被拒的 MCP 跳过等。
 */
class AutoModeState {
  #e = false;
  #t = false;
  #s = false;
  #n = null;
  #r = false;
  #o = false;
  #a = undefined;
  #i = false;
  #l = undefined;
  #d = false;
  #c = undefined;
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
  setAutoStartWithheldForHipaaTaint(value) {
    this.#i = value;
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
  setActive(value) {
    this.#e = value;
  }
  setFlagCli(value) {
    this.#t = value;
  }
  setCircuitBroken(value) {
    this.#s = value;
  }
  setFastModeBreakerReason(value) {
    this.#n = value;
  }
  setPlanOffAtLaunch(value) {
    this.#o = value;
  }
  get planOffAtLaunch() {
    return this.#o;
  }
  setFromFallback(value) {
    this.#r = value;
  }
  setProvisionalStartupMode(value) {
    this.#a = value;
  }
  setEnvOnboardingEligible(value) {
    this.#l = value;
  }
  setEnvOnboardingShownLogged(value) {
    this.#d = value;
  }
  setAccountSetMode(value) {
    this.#c = value;
  }
  noteRefusedMcpSkip(serverName) {
    this.#h.add(serverName);
  }
  hadRefusedMcpSkip(serverName) {
    return this.#h.has(serverName);
  }
  reset() {
    this.#e = false;
    this.#t = false;
    this.#s = false;
    this.#n = null;
    this.#r = false;
    this.#o = false;
    this.#a = undefined;
    this.#i = false;
    this.#l = undefined;
    this.#d = false;
    this.#c = undefined;
    this.#h.clear();
  }
}
//@ chunk-bwbq4xvm.js:171570-171597 placement
var autoModeStates; // deferred: uses AutoModeState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bwbq4xvm.js:171570", () => {
  autoModeStates = new HostScoped(() => new AutoModeState());
});
//@ chunk-bwbq4xvm.js:171597-171635 placement
function getAutoModeState() {
  return autoModeStates.of(getRootSession().host);
}
//@ chunk-bwbq4xvm.js:171635-171668 placement
function setAutoModeActive(value) {
  getAutoModeState().setActive(value);
}
//@ chunk-bwbq4xvm.js:171668-171701 placement
function isAutoModeActive() {
  return getAutoModeState().active;
}
//@ chunk-bwbq4xvm.js:171701-171819 placement
/**
 * 当前权限上下文是否走自动模式审批面：auto 模式，或计划模式下自动模式开启且非 served 调用、非 bypass 可用。
 */
function isAutoModePermissionSurface(toolPermissionContext) {
  return (
    toolPermissionContext.mode === "auto" ||
    (toolPermissionContext.mode === "plan" &&
      toolPermissionContext.servedCall !== true &&
      isAutoModeActive() &&
      !toolPermissionContext.isBypassPermissionsModeAvailable)
  );
}
//@ chunk-bwbq4xvm.js:171819-171879 placement (2.1.88 match: handleAutoModeTransition, 0.799)
function isAutoClassifierActive(fromMode, toMode = false) {
  return fromMode === "auto" || (fromMode === "plan" && !toMode && isAutoModeActive());
}
//@ chunk-bwbq4xvm.js:171879-171922 placement
function noteRefusedMcpSkip(name) {
  getAutoModeState().noteRefusedMcpSkip(name);
}
//@ chunk-bwbq4xvm.js:171922-171971 placement
function hadRefusedMcpSkip(serverName) {
  return getAutoModeState().hadRefusedMcpSkip(serverName);
}
//@ chunk-bwbq4xvm.js:171971-172014 placement
function setPlanAutoModeOffAtLaunch(value) {
  getAutoModeState().setPlanOffAtLaunch(value);
}
//@ chunk-bwbq4xvm.js:172014-172057 placement
function isPlanAutoModeOffAtLaunch() {
  return getAutoModeState().planOffAtLaunch;
}
//@ chunk-bwbq4xvm.js:172057-172092 placement
function setAutoModeFlagCli(value) {
  getAutoModeState().setFlagCli(value);
}
//@ chunk-bwbq4xvm.js:172092-172127 placement
function getAutoModeFlagCli() {
  return getAutoModeState().flagCli;
}
//@ chunk-bwbq4xvm.js:172127-172168 placement
function setAutoModeCircuitBroken(value) {
  getAutoModeState().setCircuitBroken(value);
}
//@ chunk-bwbq4xvm.js:172168-172209 placement
function isAutoModeCircuitBroken() {
  return getAutoModeState().circuitBroken;
}
//@ chunk-bwbq4xvm.js:172209-172258 placement
function setAutoModeFastModeBreakerReason(value) {
  getAutoModeState().setFastModeBreakerReason(value);
}
//@ chunk-bwbq4xvm.js:172258-172307 placement
function getAutoModeFastModeBreakerReason() {
  return getAutoModeState().fastModeBreakerReason;
}
//@ chunk-bwbq4xvm.js:172307-172347 placement
function setAutoModeFromFallback(fromAutoFallback) {
  getAutoModeState().setFromFallback(fromAutoFallback);
}
//@ chunk-bwbq4xvm.js:172347-172386 placement
function isAutoModeFromFallback() {
  return getAutoModeState().fromFallback;
}
//@ chunk-bwbq4xvm.js:172386-172436 placement
function setProvisionalStartupMode(value) {
  getAutoModeState().setProvisionalStartupMode(value);
}
//@ chunk-bwbq4xvm.js:172436-172494 placement
function isAutoStartWithheldForHipaaTaint() {
  return getAutoModeState().autoStartWithheldForHipaaTaint;
}
//@ chunk-bwbq4xvm.js:172494-172552 placement
function setAutoStartWithheldForHipaaTaint(autoStartWithheldForHipaaTaint) {
  getAutoModeState().setAutoStartWithheldForHipaaTaint(autoStartWithheldForHipaaTaint);
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
function setAutoModeEnvOnboardingEligible(value) {
  getAutoModeState().setEnvOnboardingEligible(value);
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
function setAccountSetPermissionMode(mode) {
  getAutoModeState().setAccountSetMode(mode);
}
//@ chunk-bwbq4xvm.js:172836-172888 placement
function setAutoModeEnvOnboardingShownLogged(value) {
  getAutoModeState().setEnvOnboardingShownLogged(value);
}
export {
  isAutoClassifierActive,
  isAutoModePermissionSurface,
  isAutoModeActive,
  noteRefusedMcpSkip,
  setAutoModeEnvOnboardingEligible,
  getAutoModeEnvOnboardingShownLogged,
  setAutoModeEnvOnboardingShownLogged,
  isAutoModeFromFallback,
  getAutoModeEnvOnboardingEligible,
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
  AutoModeState,
  autoModeStates,
  getAutoModeState,
  isAutoStartWithheldForHipaaTaint,
};
