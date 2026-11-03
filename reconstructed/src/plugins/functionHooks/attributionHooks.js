/**
 * plugins/functionHooks/attributionHooks.ts
 *
 * 2.1.316 新增：attribution.text 事件钩子（提交署名文本）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { eA } from "./coreHandlers.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { isLoneSecDefaultShortcut } from "./modAdmission.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";

//@ chunk-e6aww6q8.js:59096-59127 placement
var Cle = eA("attribution.text");
/**
 * 有 attribution.text 钩子时让它改写提交/PR 署名文本，否则原样返回。
 */
//@ chunk-e6aww6q8.js:59127-59263 placement
var applyAttributionTextHooks = async (e, n) =>
  hasModuleHookingSite("attribution.text", { kind: e }) && !isLoneSecDefaultShortcut("attribution.text")
    ? (await NO_CORE_AT_CHAIN_BOTTOM("attribution.text", {})({ kind: e, text: n })).text
    : n;

export { Cle, applyAttributionTextHooks };
