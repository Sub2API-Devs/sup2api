/**
 * services/orgMemory/selection.ts
 *
 * 组织记忆库选择（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (13)
 * attribution: placement 13
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { getOrgMemoryAccountKey, isOrgMemoryWritesEnabledForAccount, J4e } from "./orgMemoryDecision.js";
import { getCurrentProjectConfig, saveCurrentProjectConfig } from "../../utils/config.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";

//@ chunk-82kqcve8.js:38209-38309 placement
function isOrgMemoryDiscoveryEnabled() {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_haze_glass", !1)) return !1;
  return !process.env.CLAUDE_MEMORY_STORES?.trim();
}
//@ chunk-82kqcve8.js:38309-38336 placement
function Jpe() {
  return getOrgMemoryAccountKey();
}
//@ chunk-82kqcve8.js:38336-38380 placement
function Ct(e) {
  return e.startsWith("cagt_");
}
//@ chunk-82kqcve8.js:38380-38424 placement
function kr(e) {
  return e.startsWith("sgrp_");
}
//@ chunk-82kqcve8.js:38424-38528 placement
function classifySelectionKind(e) {
  if (e === null) return "none";
  if (yPe(e)) return "public_projects";
  return Ct(e) ? "silo" : "project";
}
//@ chunk-82kqcve8.js:38528-38576 placement
var PUBLIC_PROJECTS = "public_projects",
  sJo = "__explicit_off__";
//@ chunk-82kqcve8.js:38576-38606 placement
function qs(e) {
  return e === sJo;
}
//@ chunk-82kqcve8.js:38606-38636 placement
function yPe(e) {
  return e === PUBLIC_PROJECTS;
}
//@ chunk-82kqcve8.js:38636-38668 placement
var Hu = /^[A-Za-z0-9_-]{1,128}$/;
/**
 * 读取项目配置里保存的组织记忆选择：账号不匹配或格式无效时返回 null。
 */
//@ chunk-82kqcve8.js:38668-38851 placement
function readSavedSelection() {
  let e = getCurrentProjectConfig();
  if (e.orgMemorySelectionAccount === void 0 || e.orgMemorySelectionAccount !== Jpe()) return null;
  let n = e.orgMemorySelection ?? null;
  return n !== null && Hu.test(n) ? n : null;
}
/**
 * 取生效的组织记忆选择：已失效的返回 null，可用的直接返回，否则视条件返回保存值或 null。
 */
//@ chunk-82kqcve8.js:38851-38957 placement
function getEffectiveSelection() {
  let e = readSavedSelection();
  if (e !== null && qs(e)) return null;
  if (e !== null && yPe(e)) return e;
  return isOrgMemoryDiscoveryEnabled() ? e : null;
}
//@ chunk-82kqcve8.js:38957-39605 placement
function saveOrgMemorySelection(e, n) {
  let r = Jpe();
  if (e !== null && r === null) return "refused";
  if (e !== null && !qs(e) && isOrgMemoryWritesEnabledForAccount() && !J4e()) return "refused_arms_writes";
  if (e === null) {
    let s = getCurrentProjectConfig();
    if (s.orgMemorySelection === void 0) return "noop";
    if (s.orgMemorySelectionAccount !== r) return "noop";
  } else {
    let s = getCurrentProjectConfig();
    if (s.orgMemorySelection === e && s.orgMemorySelectionAccount === r) return "noop";
  }
  return (
    saveCurrentProjectConfig((s) => {
      if (
        (s.orgMemorySelection ?? null) === e &&
        (s.orgMemorySelectionAccount ?? void 0) === (e !== null ? (r ?? void 0) : void 0)
      )
        return s;
      if (e === null && s.orgMemorySelectionAccount !== r) return s;
      return {
        ...s,
        orgMemorySelection: e ?? void 0,
        orgMemorySelectionAccount: e !== null ? (r ?? void 0) : void 0,
      };
    }, n),
    e !== null ? "saved" : "cleared"
  );
}
/**
 * 当保存的组织记忆选择仍对应当前账号时清除它，并记 org_memory_picker selection_dropped。
 */
//@ chunk-82kqcve8.js:39605-39889 placement
function dropSavedSelection(e, n) {
  let r = Jpe(),
    s = getCurrentProjectConfig();
  if (s.orgMemorySelection !== e || s.orgMemorySelectionAccount !== r) return;
  (logFeatureSad("org_memory_picker", "selection_dropped"),
    saveCurrentProjectConfig(
      (h) =>
        h.orgMemorySelection === e && h.orgMemorySelectionAccount === r
          ? { ...h, orgMemorySelection: void 0, orgMemorySelectionAccount: void 0 }
          : h,
      n,
    ));
}

export {
  getEffectiveSelection,
  yPe,
  sJo,
  saveOrgMemorySelection,
  Ct,
  dropSavedSelection,
  kr,
  Jpe,
  classifySelectionKind,
  isOrgMemoryDiscoveryEnabled,
  readSavedSelection,
};
