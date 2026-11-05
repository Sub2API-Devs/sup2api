/**
 * plugins/functionHooks/attributionHooks.ts
 *
 * 2.1.316 新增：attribution.text 事件钩子（提交署名文本）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { textPassthroughEvent } from "./coreHandlers.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { isLoneSecDefaultShortcut } from "./modAdmission.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:61624-61655 placement
/**
 * attribution.text 事件定义
 */
var ATTRIBUTION_TEXT_EVENT; // deferred: uses textPassthroughEvent (./coreHandlers.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:61624", () => {
  ATTRIBUTION_TEXT_EVENT = textPassthroughEvent("attribution.text");
});
//@ chunk-5xgkngpb.js:61655-61791 placement
/**
 * 有 attribution.text 钩子时让它改写提交/PR 署名文本，否则原样返回。
 */
var applyAttributionTextHooks = async (kind, text) =>
  hasModuleHookingSite("attribution.text", {
    kind,
  }) && !isLoneSecDefaultShortcut("attribution.text")
    ? (
        await NO_CORE_AT_CHAIN_BOTTOM(
          "attribution.text",
          {},
        )({
          kind,
          text,
        })
      ).text
    : text;
export { applyAttributionTextHooks, ATTRIBUTION_TEXT_EVENT };
