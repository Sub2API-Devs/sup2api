/**
 * utils/systemPromptBoundary.ts
 *
 * 2.1.316 新增：系统提示词边界拆分。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-w5ndchqs.js (6)
 * attribution: placement 6
 */
import { SYSTEM_PROMPT_DYNAMIC_BOUNDARY } from "../entrypoints/sdk/coreSchemas.js";

//@ chunk-w5ndchqs.js:1829-1874 placement
var STATIC_BREAKPOINT_MARKER = "__SYSTEM_PROMPT_STATIC_BREAKPOINT__";
//@ chunk-w5ndchqs.js:1874-2077 placement
function splitSystemPromptAtBoundary(e, n = SYSTEM_PROMPT_DYNAMIC_BOUNDARY) {
  let lines = e.split(`
`);
  let index = lines.findIndex((line) => line.trim() === n);
  if (index === -1) return [e];
  let d =
    lines.slice(0, index).join(`
`) +
    `
`;
  let m =
    `
` +
    lines.slice(index + 1).join(`
`);
  return [...(d.trim() ? [d] : []), n, ...(m.trim() ? [m] : [])];
}
//@ chunk-w5ndchqs.js:2077-2159 placement
function splitAtStaticBreakpoint(e) {
  if (!e.includes(STATIC_BREAKPOINT_MARKER)) return [e];
  return splitSystemPromptAtBoundary(e, STATIC_BREAKPOINT_MARKER).filter(
    (n) => n !== STATIC_BREAKPOINT_MARKER,
  );
}
//@ chunk-w5ndchqs.js:2159-2232 placement
function baseSystemPromptOf(customSystemPrompt, defaultSystemPrompt) {
  return typeof customSystemPrompt === "string"
    ? splitSystemPromptAtBoundary(customSystemPrompt)
    : Array.isArray(customSystemPrompt)
      ? customSystemPrompt
      : defaultSystemPrompt;
}
//@ chunk-w5ndchqs.js:2232-2422 placement
function withAddedSections(e, n, r) {
  let s = r ? e.indexOf(SYSTEM_PROMPT_DYNAMIC_BOUNDARY) : -1;
  if (s === -1) return [...e, ...nonEmptyPrompts(n)];
  return [
    ...e.slice(0, s),
    ...nonEmptyPrompts(n.filter(([d]) => d === "shared")),
    ...e.slice(s),
    ...nonEmptyPrompts(n.filter(([d]) => d === "session")),
  ];
}
//@ chunk-w5ndchqs.js:2422-2472 placement
function nonEmptyPrompts(e) {
  return e.flatMap(([, n]) => (n ? [n] : []));
}
export { baseSystemPromptOf, withAddedSections, splitSystemPromptAtBoundary, splitAtStaticBreakpoint };
