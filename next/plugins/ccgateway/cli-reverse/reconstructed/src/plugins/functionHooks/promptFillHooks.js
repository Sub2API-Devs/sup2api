/**
 * plugins/functionHooks/promptFillHooks.ts
 *
 * 2.1.316 新增：prompt.fill 事件钩子
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { sanitizePromptText } from "../../utils/promptTextSanitize.js";
import { mapNormalizedOffsets } from "../../components/PromptInput/inputDecorations.js";
import { clampPositive, makeCoreEvent } from "./coreHandlers.js";
import { surfaceComposer } from "./surfaceBinding.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { logForDebugging } from "../../utils/debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:72122-72354 placement
function sanitizeFillText(offsets, decorations) {
  let hasNoDecorations = decorations === undefined;
  let cleanText = sanitizePromptText()(offsets);
  if (hasNoDecorations)
    return {
      text: cleanText,
    };
  if (cleanText === offsets)
    return {
      text: cleanText,
      decorations,
    };
  let offsetMap = mapNormalizedOffsets(offsets, cleanText);
  let mapOffset = (offset) => offsetMap[clampPositive(offset, offsets.length)] ?? cleanText.length;
  return {
    text: cleanText,
    decorations: decorations.map((decoration) => ({
      ...decoration,
      start: mapOffset(decoration.start),
      end: mapOffset(decoration.end),
    })),
  };
}
//@ chunk-5xgkngpb.js:72354-72617 placement
/**
 * prompt.fill 核心：把文本写入当前输入框（清洗后、重映射装饰段），可经 attribute 标记来源；无输入框时拒绝。
 */
async function fillPromptBox(request, answersPress) {
  let composer = surfaceComposer();
  if (composer === undefined)
    return {
      isFilled: false,
      refusal: "no_composer",
    };
  let clean = sanitizeFillText(request.text, request.decorations);
  let write = () =>
    composer.write(clean.text, request.mode, {
      decorations: clean.decorations,
      cursor: request.cursor,
      answersPress,
    });
  let { attribute } = composer;
  return attribute === undefined ? write() : attribute(request.origin, write);
}
//@ chunk-5xgkngpb.js:72617-72701 placement
/**
 * prompt.fill 核心
 */
var PROMPT_FILL_CORE = (text, mode, answersPress) =>
  makeCoreEvent("prompt.fill", (request) =>
    fillPromptBox(request, request.text === text && request.mode === mode ? answersPress : undefined),
  ).core;
//@ chunk-5xgkngpb.js:72701-73161 placement
/**
 * $.prompt.fill 实现：经 prompt.fill 钩子链填入输入框（默认 replace 模式），记录结果。
 */
async function promptFillOp(request) {
  let { text, mode = "replace", decorations, cursor, origin, hookOrigin, signal, answersPress } = request;
  let { isFilled, refusal } = await NO_CORE_AT_CHAIN_BOTTOM("prompt.fill", {
    origin: hookOrigin,
    signal,
    ...(answersPress !== undefined && {
      core: {
        "prompt.fill": PROMPT_FILL_CORE(text, mode, answersPress),
      },
    }),
  })({
    text,
    mode,
    origin,
    ...(decorations !== undefined && {
      decorations,
    }),
    ...(cursor !== undefined && {
      cursor,
    }),
  });
  logForDebugging(
    `prompt.fill (${origin.kind}, ${mode}): ${text.length} chars, ` +
      (isFilled ? "filled" : (refusal ?? "not filled")),
  );
  return refusal === undefined
    ? {
        isFilled,
      }
    : {
        isFilled,
        refusal,
      };
}
//@ chunk-5xgkngpb.js:73161-73191 placement
/**
 * prompt.fill 事件
 */
var promptFillEvent; // deferred: uses makeCoreEvent (./coreHandlers.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:73161", () => {
  promptFillEvent = makeCoreEvent("prompt.fill", fillPromptBox);
});
export { promptFillEvent, promptFillOp };
