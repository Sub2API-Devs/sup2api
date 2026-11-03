/**
 * utils/model/fableMitigations.ts
 *
 * 2.1.316 新增。Fable 模型的缓解措施。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-m8whhcc1.js (5)
 * attribution: placement 5
 */
import { modelSupportsCapability } from "./modelCatalog.js";
import { isLocalAgentOrCowork } from "../entrypointKinds.js";

//@ chunk-m8whhcc1.js:264-383 placement
/**
 * 判断模型是否需要 Fable 5 缓解措施（按能力声明，claude-mythos-5 默认需要）。
 */
function needsFableMitigations(canonicalName, n) {
  let e = modelSupportsCapability(canonicalName, "fable_5_mitigations", n);
  if (e !== undefined) return e;
  if (canonicalName === "claude-mythos-5") return true;
  return false;
}
//@ chunk-m8whhcc1.js:383-450 placement
/**
 * 判断是否使用 Fable 5.1 提示词包。
 */
function usesFablePromptBundle(canonicalName) {
  return (
    !isLocalAgentOrCowork() && modelSupportsCapability(canonicalName, "fable_5_1_prompt_bundle") === true
  );
}
//@ chunk-m8whhcc1.js:450-503 placement
/**
 * 判断模型 id 是否属于 fable 系列。
 */
function isFableModel(canonicalName) {
  return canonicalName.startsWith("claude-fable-");
}
//@ chunk-m8whhcc1.js:503-557 placement
/**
 * 判断模型 id 是否属于 mythos 系列。
 */
function isMythosModel(canonicalName) {
  return canonicalName.startsWith("claude-mythos-");
}
//@ chunk-m8whhcc1.js:557-582 placement
/**
 * 恒返回 false（缓解措施占位）。
 */
function neverMitigated(canonicalName) {
  return false;
}
export { needsFableMitigations, isFableModel, neverMitigated, usesFablePromptBundle, isMythosModel };
