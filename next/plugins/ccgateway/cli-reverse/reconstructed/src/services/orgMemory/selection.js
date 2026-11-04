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
function isGroupingId(value) {
  return value.startsWith("sgrp_");
}
//@ chunk-82kqcve8.js:38424-38528 placement
function classifySelectionKind(selection) {
  if (selection === null) return "none";
  if (isPublicProjects(selection)) return "public_projects";
  return isSiloId(selection) ? "silo" : "project";
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
function isExplicitOff(selection) {
  return selection === EXPLICIT_OFF_SELECTION;
}
//@ chunk-82kqcve8.js:38606-38636 placement
/**
 * 判断选择是否为公共项目。
 */
function isPublicProjects(selection) {
  return selection === PUBLIC_PROJECTS;
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
  let selection = readSavedSelection();
  if (selection !== null && isExplicitOff(selection)) return null;
  if (selection !== null && isPublicProjects(selection)) return selection;
  return isOrgMemoryDiscoveryEnabled() ? selection : null;
}
//@ chunk-82kqcve8.js:38957-39605 placement
function saveOrgMemorySelection(selection, storageV5) {
  let accountKey = selectionAccountKey();
  if (selection !== null && accountKey === null) return "refused";
  if (
    selection !== null &&
    !isExplicitOff(selection) &&
    isOrgMemoryWritesEnabledForAccount() &&
    !isEligibleDecisionSurface()
  )
    return "refused_arms_writes";
  if (selection === null) {
    let currentProjectConfig = getCurrentProjectConfig();
    if (currentProjectConfig.orgMemorySelection === undefined) return "noop";
    if (currentProjectConfig.orgMemorySelectionAccount !== accountKey) return "noop";
  } else {
    let currentProjectConfig = getCurrentProjectConfig();
    if (
      currentProjectConfig.orgMemorySelection === selection &&
      currentProjectConfig.orgMemorySelectionAccount === accountKey
    )
      return "noop";
  }
  saveCurrentProjectConfig((config) => {
    if (
      (config.orgMemorySelection ?? null) === selection &&
      (config.orgMemorySelectionAccount ?? undefined) ===
        (selection !== null ? (accountKey ?? undefined) : undefined)
    )
      return config;
    if (selection === null && config.orgMemorySelectionAccount !== accountKey) return config;
    return {
      ...config,
      orgMemorySelection: selection ?? undefined,
      orgMemorySelectionAccount: selection !== null ? (accountKey ?? undefined) : undefined,
    };
  }, storageV5);
  return selection !== null ? "saved" : "cleared";
}
//@ chunk-82kqcve8.js:39605-39889 placement
/**
 * 当保存的组织记忆选择仍对应当前账号时清除它，并记 org_memory_picker selection_dropped。
 */
function dropSavedSelection(selection, storageV5) {
  let accountKey = selectionAccountKey();
  let currentProjectConfig = getCurrentProjectConfig();
  if (
    currentProjectConfig.orgMemorySelection !== selection ||
    currentProjectConfig.orgMemorySelectionAccount !== accountKey
  )
    return;
  logFeatureSad("org_memory_picker", "selection_dropped");
  saveCurrentProjectConfig(
    (config) =>
      config.orgMemorySelection === selection && config.orgMemorySelectionAccount === accountKey
        ? {
            ...config,
            orgMemorySelection: undefined,
            orgMemorySelectionAccount: undefined,
          }
        : config,
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
