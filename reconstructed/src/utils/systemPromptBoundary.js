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
var te = "__SYSTEM_PROMPT_STATIC_BREAKPOINT__";
//@ chunk-w5ndchqs.js:1874-2077 placement
function splitSystemPromptAtBoundary(e, n = SYSTEM_PROMPT_DYNAMIC_BOUNDARY) {
  let parts = e.split(`
`),
    index = parts.findIndex((h) => h.trim() === n);
  if (index === -1) return [e];
  let d =
      parts.slice(0, index).join(`
`) +
      `
`,
    m =
      `
` +
      parts.slice(index + 1).join(`
`);
  return [...(d.trim() ? [d] : []), n, ...(m.trim() ? [m] : [])];
}
//@ chunk-w5ndchqs.js:2077-2159 placement
function splitAtStaticBreakpoint(e) {
  if (!e.includes(te)) return [e];
  return splitSystemPromptAtBoundary(e, te).filter((n) => n !== te);
}
//@ chunk-w5ndchqs.js:2159-2232 placement
function baseSystemPromptOf(e, n) {
  return typeof e === "string" ? splitSystemPromptAtBoundary(e) : Array.isArray(e) ? e : n;
}
//@ chunk-w5ndchqs.js:2232-2422 placement
function withAddedSections(e, n, r) {
  let s = r ? e.indexOf(SYSTEM_PROMPT_DYNAMIC_BOUNDARY) : -1;
  if (s === -1) return [...e, ...ie(n)];
  return [
    ...e.slice(0, s),
    ...ie(n.filter(([d]) => d === "shared")),
    ...e.slice(s),
    ...ie(n.filter(([d]) => d === "session")),
  ];
}
//@ chunk-w5ndchqs.js:2422-2472 placement
function ie(e) {
  return e.flatMap(([, n]) => (n ? [n] : []));
}

export { baseSystemPromptOf, withAddedSections, splitSystemPromptAtBoundary, splitAtStaticBreakpoint };
