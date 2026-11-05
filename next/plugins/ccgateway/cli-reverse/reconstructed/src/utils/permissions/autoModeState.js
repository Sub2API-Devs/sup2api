/**
 * utils/permissions/autoModeState.ts
 *
 * 2.1.316 新增：每宿主一份的 auto mode 状态。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/autoModeState.ts
 * pieces: chunk-7kayq7nc.js (29)
 * attribution: placement 29
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logForDebugging } from "../debug.js";
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { logError } from "../log.js";
import { env } from "../env.js";
import { errorMessage } from "../errors.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7kayq7nc.js:188645-189785 placement
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
//@ chunk-7kayq7nc.js:189785-189812 placement
var autoModeStates; // deferred: uses AutoModeState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7kayq7nc.js:189785", () => {
  autoModeStates = new HostScoped(() => new AutoModeState());
});
//@ chunk-7kayq7nc.js:189812-189850 placement
function getAutoModeState() {
  return autoModeStates.of(getRootSession().host);
}
//@ chunk-7kayq7nc.js:189850-189883 placement
function setAutoModeActive(value) {
  getAutoModeState().setActive(value);
}
//@ chunk-7kayq7nc.js:189883-189916 placement
function isAutoModeActive() {
  return getAutoModeState().active;
}
//@ chunk-7kayq7nc.js:189916-190034 placement
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
//@ chunk-7kayq7nc.js:190034-190094 placement (2.1.88 match: handleAutoModeTransition, 0.798)
function isAutoClassifierActive(fromMode, toMode = false) {
  return fromMode === "auto" || (fromMode === "plan" && !toMode && isAutoModeActive());
}
//@ chunk-7kayq7nc.js:190094-190137 placement
function noteRefusedMcpSkip(name) {
  getAutoModeState().noteRefusedMcpSkip(name);
}
//@ chunk-7kayq7nc.js:190137-190186 placement
function hadRefusedMcpSkip(serverName) {
  return getAutoModeState().hadRefusedMcpSkip(serverName);
}
//@ chunk-7kayq7nc.js:190186-190229 placement
function setPlanAutoModeOffAtLaunch(value) {
  getAutoModeState().setPlanOffAtLaunch(value);
}
//@ chunk-7kayq7nc.js:190229-190272 placement
function isPlanAutoModeOffAtLaunch() {
  return getAutoModeState().planOffAtLaunch;
}
//@ chunk-7kayq7nc.js:190272-190307 placement
function setAutoModeFlagCli(value) {
  getAutoModeState().setFlagCli(value);
}
//@ chunk-7kayq7nc.js:190307-190342 placement
function getAutoModeFlagCli() {
  return getAutoModeState().flagCli;
}
//@ chunk-7kayq7nc.js:190342-190383 placement
function setAutoModeCircuitBroken(value) {
  getAutoModeState().setCircuitBroken(value);
}
//@ chunk-7kayq7nc.js:190383-190424 placement
function isAutoModeCircuitBroken() {
  return getAutoModeState().circuitBroken;
}
//@ chunk-7kayq7nc.js:190424-190473 placement
function setAutoModeFastModeBreakerReason(value) {
  getAutoModeState().setFastModeBreakerReason(value);
}
//@ chunk-7kayq7nc.js:190473-190522 placement
function getAutoModeFastModeBreakerReason() {
  return getAutoModeState().fastModeBreakerReason;
}
//@ chunk-7kayq7nc.js:190522-190562 placement
function setAutoModeFromFallback(fromAutoFallback) {
  getAutoModeState().setFromFallback(fromAutoFallback);
}
//@ chunk-7kayq7nc.js:190562-190601 placement
function isAutoModeFromFallback() {
  return getAutoModeState().fromFallback;
}
//@ chunk-7kayq7nc.js:190601-190651 placement
function setProvisionalStartupMode(value) {
  getAutoModeState().setProvisionalStartupMode(value);
}
//@ chunk-7kayq7nc.js:190651-190709 placement
function isAutoStartWithheldForHipaaTaint() {
  return getAutoModeState().autoStartWithheldForHipaaTaint;
}
//@ chunk-7kayq7nc.js:190709-190767 placement
function setAutoStartWithheldForHipaaTaint(autoStartWithheldForHipaaTaint) {
  getAutoModeState().setAutoStartWithheldForHipaaTaint(autoStartWithheldForHipaaTaint);
}
//@ chunk-7kayq7nc.js:190767-190817 placement
function getProvisionalStartupMode() {
  return getAutoModeState().provisionalStartupMode;
}
//@ chunk-7kayq7nc.js:190817-190866 placement
function getAutoModeEnvOnboardingEligible() {
  return getAutoModeState().envOnboardingEligible;
}
//@ chunk-7kayq7nc.js:190866-190915 placement
function setAutoModeEnvOnboardingEligible(value) {
  getAutoModeState().setEnvOnboardingEligible(value);
}
//@ chunk-7kayq7nc.js:190915-190967 placement
function getAutoModeEnvOnboardingShownLogged() {
  return getAutoModeState().envOnboardingShownLogged;
}
//@ chunk-7kayq7nc.js:190967-191009 placement
function getAccountSetPermissionMode() {
  return getAutoModeState().accountSetMode;
}
//@ chunk-7kayq7nc.js:191009-191051 placement
function setAccountSetPermissionMode(mode) {
  getAutoModeState().setAccountSetMode(mode);
}
//@ chunk-7kayq7nc.js:191051-191103 placement
function setAutoModeEnvOnboardingShownLogged(value) {
  getAutoModeState().setEnvOnboardingShownLogged(value);
}
export {
  isAutoClassifierActive,
  isAutoModePermissionSurface,
  isAutoModeActive,
  noteRefusedMcpSkip,
  isAutoModeCircuitBroken,
  setAutoModeActive,
  setAutoModeCircuitBroken,
  isAutoModeFromFallback,
  setAccountSetPermissionMode,
  setProvisionalStartupMode,
  setAutoModeFromFallback,
  setAutoStartWithheldForHipaaTaint,
  getProvisionalStartupMode,
  setAutoModeFastModeBreakerReason,
  getAutoModeFlagCli,
  setPlanAutoModeOffAtLaunch,
  isPlanAutoModeOffAtLaunch,
  getAutoModeFastModeBreakerReason,
  getAccountSetPermissionMode,
  setAutoModeFlagCli,
  setAutoModeEnvOnboardingEligible,
  getAutoModeEnvOnboardingShownLogged,
  setAutoModeEnvOnboardingShownLogged,
  getAutoModeEnvOnboardingEligible,
  hadRefusedMcpSkip,
  AutoModeState,
  autoModeStates,
  getAutoModeState,
  isAutoStartWithheldForHipaaTaint,
};
