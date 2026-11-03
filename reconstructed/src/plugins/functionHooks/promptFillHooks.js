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
import { tUo } from "../../utils/promptTextSanitize.js";
import { mapNormalizedOffsets } from "../../components/PromptInput/inputDecorations.js";
import { V$, gh } from "./coreHandlers.js";
import { G3 } from "./surfaceBinding.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-e6aww6q8.js:69575-69807 placement
function sanitizeFillText(e, n) {
  let r = n === void 0,
    s = tUo()(e);
  if (r) return { text: s };
  if (s === e) return { text: s, decorations: n };
  let y = mapNormalizedOffsets(e, s),
    S = (w) => y[V$(w, e.length)] ?? s.length;
  return { text: s, decorations: n.map((w) => ({ ...w, start: S(w.start), end: S(w.end) })) };
}
/**
 * prompt.fill 核心：把文本写入当前输入框（清洗后、重映射装饰段），可经 attribute 标记来源；无输入框时拒绝。
 */
//@ chunk-e6aww6q8.js:69807-70070 placement
async function fillPromptBox(e, n) {
  let r = G3();
  if (r === void 0) return { isFilled: !1, refusal: "no_composer" };
  let s = sanitizeFillText(e.text, e.decorations),
    h = () => r.write(s.text, e.mode, { decorations: s.decorations, cursor: e.cursor, answersPress: n }),
    { attribute: attribute } = r;
  return attribute === void 0 ? h() : attribute(e.origin, h);
}
//@ chunk-e6aww6q8.js:70070-70154 placement
var e_t = (e, n, r) =>
  gh("prompt.fill", (s) => fillPromptBox(s, s.text === e && s.mode === n ? r : void 0)).core;
/**
 * $.prompt.fill 实现：经 prompt.fill 钩子链填入输入框（默认 replace 模式），记录结果。
 */
//@ chunk-e6aww6q8.js:70154-70614 placement
async function promptFillOp(e) {
  let {
      text: text,
      mode: mode = "replace",
      decorations: decorations,
      cursor: cursor,
      origin: origin,
      hookOrigin: hookOrigin,
      signal: signal,
      answersPress: answersPress,
    } = e,
    { isFilled: isFilled, refusal: refusal } = await NO_CORE_AT_CHAIN_BOTTOM("prompt.fill", {
      origin: hookOrigin,
      signal: signal,
      ...(answersPress !== void 0 && { core: { "prompt.fill": e_t(text, mode, answersPress) } }),
    })({
      text: text,
      mode: mode,
      origin: origin,
      ...(decorations !== void 0 && { decorations: decorations }),
      ...(cursor !== void 0 && { cursor: cursor }),
    });
  return (
    logForDebugging(
      `prompt.fill (${origin.kind}, ${mode}): ${text.length} chars, ` +
        (isFilled ? "filled" : (refusal ?? "not filled")),
    ),
    refusal === void 0 ? { isFilled: isFilled } : { isFilled: isFilled, refusal: refusal }
  );
}
//@ chunk-e6aww6q8.js:70614-70644 placement
var zle = gh("prompt.fill", fillPromptBox);

export { zle, promptFillOp };
