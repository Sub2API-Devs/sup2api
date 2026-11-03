/**
 * plugins/functionHooks/promptFillHooks.ts
 *
 * 2.1.316 新增：prompt.fill 事件钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 5
 */
import { sanitizePromptText } from "../../utils/promptTextSanitize.js";
import { mapNormalizedOffsets } from "../../components/PromptInput/inputDecorations.js";
import { clampPositive, makeCoreEvent } from "./coreHandlers.js";
import { surfaceComposer } from "./surfaceBinding.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-e6aww6q8.js:69575-69807 placement
function sanitizeFillText(text, decorations) {
  let r = decorations === undefined;
  let s = sanitizePromptText()(text);
  if (r)
    return {
      text: s,
    };
  if (s === text)
    return {
      text: s,
      decorations,
    };
  let y = mapNormalizedOffsets(text, s);
  let S = (w) => y[clampPositive(w, text.length)] ?? s.length;
  return {
    text: s,
    decorations: decorations.map((w) => ({
      ...w,
      start: S(w.start),
      end: S(w.end),
    })),
  };
}
//@ chunk-e6aww6q8.js:69807-70070 placement
/**
 * prompt.fill 核心：把文本写入当前输入框（清洗后、重映射装饰段），可经 attribute 标记来源；无输入框时拒绝。
 */
async function fillPromptBox(e, answersPress) {
  let r = surfaceComposer();
  if (r === undefined)
    return {
      isFilled: false,
      refusal: "no_composer",
    };
  let s = sanitizeFillText(e.text, e.decorations);
  let h = () =>
    r.write(s.text, e.mode, {
      decorations: s.decorations,
      cursor: e.cursor,
      answersPress,
    });
  let { attribute } = r;
  return attribute === undefined ? h() : attribute(e.origin, h);
}
//@ chunk-e6aww6q8.js:70070-70154 placement
/**
 * prompt.fill 核心
 */
var PROMPT_FILL_CORE = (text, mode, answersPress) =>
  makeCoreEvent("prompt.fill", (s) =>
    fillPromptBox(s, s.text === text && s.mode === mode ? answersPress : undefined),
  ).core;
//@ chunk-e6aww6q8.js:70154-70614 placement
/**
 * $.prompt.fill 实现：经 prompt.fill 钩子链填入输入框（默认 replace 模式），记录结果。
 */
async function promptFillOp(e) {
  let { text, mode = "replace", decorations, cursor, origin, hookOrigin, signal, answersPress } = e;
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
//@ chunk-e6aww6q8.js:70614-70644 placement
/**
 * prompt.fill 事件
 */
var promptFillEvent = makeCoreEvent("prompt.fill", fillPromptBox);
export { promptFillEvent, promptFillOp };
