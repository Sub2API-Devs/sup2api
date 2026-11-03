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
import {
  getOrgMemoryAccountKey,
  isOrgMemoryWritesEnabledForAccount,
  isEligibleDecisionSurface,
} from "./orgMemoryDecision.js";
import { getCurrentProjectConfig, saveCurrentProjectConfig } from "../../utils/config.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";

//@ chunk-82kqcve8.js:38209-38309 placement
function isOrgMemoryDiscoveryEnabled() {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_haze_glass", false)) return false;
  return !process.env.CLAUDE_MEMORY_STORES?.trim();
}
//@ chunk-82kqcve8.js:38309-38336 placement
/**
 * 取当前的选择账号键。
 */
function selectionAccountKey() {
  return getOrgMemoryAccountKey();
}
//@ chunk-82kqcve8.js:38336-38380 placement
/**
 * 判断 id 是否为 silo（cagt_ 前缀）。
 */
function isSiloId(selection) {
  return selection.startsWith("cagt_");
}
//@ chunk-82kqcve8.js:38380-38424 placement
/**
 * 判断 id 是否为分组（sgrp_ 前缀）。
 */
function isGroupingId(e) {
  return e.startsWith("sgrp_");
}
//@ chunk-82kqcve8.js:38424-38528 placement
function classifySelectionKind(e) {
  if (e === null) return "none";
  if (isPublicProjects(e)) return "public_projects";
  return isSiloId(e) ? "silo" : "project";
}
//@ chunk-82kqcve8.js:38528-38576 placement
/**
 * 显式关闭选择的特殊值。
 */
var PUBLIC_PROJECTS = "public_projects";
var EXPLICIT_OFF_SELECTION = "__explicit_off__";
//@ chunk-82kqcve8.js:38576-38606 placement
/**
 * 判断选择是否被显式关闭。
 */
function isExplicitOff(e) {
  return e === EXPLICIT_OFF_SELECTION;
}
//@ chunk-82kqcve8.js:38606-38636 placement
/**
 * 判断选择是否为公共项目。
 */
function isPublicProjects(e) {
  return e === PUBLIC_PROJECTS;
}
//@ chunk-82kqcve8.js:38636-38668 placement
/**
 * 选择 id 的合法格式正则。
 */
var SELECTION_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
//@ chunk-82kqcve8.js:38668-38851 placement
/**
 * 读取项目配置里保存的组织记忆选择：账号不匹配或格式无效时返回 null。
 */
function readSavedSelection() {
  let currentProjectConfig = getCurrentProjectConfig();
  if (
    currentProjectConfig.orgMemorySelectionAccount === undefined ||
    currentProjectConfig.orgMemorySelectionAccount !== selectionAccountKey()
  )
    return null;
  let orgMemorySelection = currentProjectConfig.orgMemorySelection ?? null;
  return orgMemorySelection !== null && SELECTION_ID_RE.test(orgMemorySelection) ? orgMemorySelection : null;
}
//@ chunk-82kqcve8.js:38851-38957 placement
/**
 * 取生效的组织记忆选择：已失效的返回 null，可用的直接返回，否则视条件返回保存值或 null。
 */
function getEffectiveSelection() {
  let savedSelection = readSavedSelection();
  if (savedSelection !== null && isExplicitOff(savedSelection)) return null;
  if (savedSelection !== null && isPublicProjects(savedSelection)) return savedSelection;
  return isOrgMemoryDiscoveryEnabled() ? savedSelection : null;
}
//@ chunk-82kqcve8.js:38957-39605 placement
function saveOrgMemorySelection(e, storageV5) {
  let r = selectionAccountKey();
  if (e !== null && r === null) return "refused";
  if (e !== null && !isExplicitOff(e) && isOrgMemoryWritesEnabledForAccount() && !isEligibleDecisionSurface())
    return "refused_arms_writes";
  if (e === null) {
    let currentProjectConfig = getCurrentProjectConfig();
    if (currentProjectConfig.orgMemorySelection === undefined) return "noop";
    if (currentProjectConfig.orgMemorySelectionAccount !== r) return "noop";
  } else {
    let currentProjectConfig = getCurrentProjectConfig();
    if (currentProjectConfig.orgMemorySelection === e && currentProjectConfig.orgMemorySelectionAccount === r)
      return "noop";
  }
  saveCurrentProjectConfig((s) => {
    if (
      (s.orgMemorySelection ?? null) === e &&
      (s.orgMemorySelectionAccount ?? undefined) === (e !== null ? (r ?? undefined) : undefined)
    )
      return s;
    if (e === null && s.orgMemorySelectionAccount !== r) return s;
    return {
      ...s,
      orgMemorySelection: e ?? undefined,
      orgMemorySelectionAccount: e !== null ? (r ?? undefined) : undefined,
    };
  }, storageV5);
  return e !== null ? "saved" : "cleared";
}
//@ chunk-82kqcve8.js:39605-39889 placement
/**
 * 当保存的组织记忆选择仍对应当前账号时清除它，并记 org_memory_picker selection_dropped。
 */
function dropSavedSelection(e, storageV5) {
  let r = selectionAccountKey();
  let currentProjectConfig = getCurrentProjectConfig();
  if (currentProjectConfig.orgMemorySelection !== e || currentProjectConfig.orgMemorySelectionAccount !== r)
    return;
  logFeatureSad("org_memory_picker", "selection_dropped");
  saveCurrentProjectConfig(
    (h) =>
      h.orgMemorySelection === e && h.orgMemorySelectionAccount === r
        ? {
            ...h,
            orgMemorySelection: undefined,
            orgMemorySelectionAccount: undefined,
          }
        : h,
    storageV5,
  );
}
export {
  getEffectiveSelection,
  isPublicProjects,
  EXPLICIT_OFF_SELECTION,
  saveOrgMemorySelection,
  isSiloId,
  dropSavedSelection,
  isGroupingId,
  selectionAccountKey,
  classifySelectionKind,
  isOrgMemoryDiscoveryEnabled,
  readSavedSelection,
};
