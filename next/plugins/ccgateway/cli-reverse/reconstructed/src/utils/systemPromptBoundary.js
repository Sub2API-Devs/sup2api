/**
 * utils/systemPromptBoundary.ts
 *
 * 2.1.316 新增：系统提示词边界拆分。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7pwjpdkw.js (6)
 * attribution: placement 6
 */
import { SYSTEM_PROMPT_DYNAMIC_BOUNDARY } from "../entrypoints/sdk/coreSchemas.js";

//@ chunk-7pwjpdkw.js:1943-1988 placement
var STATIC_BREAKPOINT_MARKER = "__SYSTEM_PROMPT_STATIC_BREAKPOINT__";
//@ chunk-7pwjpdkw.js:1988-2273 placement
function splitSystemPromptAtBoundary(prompt, boundary = SYSTEM_PROMPT_DYNAMIC_BOUNDARY) {
  let index = prompt.indexOf(boundary);
  while (index !== -1) {
    let lineStart =
      index === 0
        ? 0
        : prompt.lastIndexOf(
            `
`,
            index - 1,
          ) + 1;
    let index_2 = prompt.indexOf(
      `
`,
      index,
    );
    let lineEnd = index_2 === -1 ? prompt.length : index_2;
    if (prompt.slice(lineStart, lineEnd).trim() === boundary) {
      let sliced = prompt.slice(0, lineStart);
      let sliced_2 = prompt.slice(lineEnd);
      return [...(sliced.trim() ? [sliced] : []), boundary, ...(sliced_2.trim() ? [sliced_2] : [])];
    }
    if (index_2 === -1) break;
    index = prompt.indexOf(boundary, index_2 + 1);
  }
  return [prompt];
}
//@ chunk-7pwjpdkw.js:2273-2355 placement
function splitAtStaticBreakpoint(prompt) {
  if (!prompt.includes(STATIC_BREAKPOINT_MARKER)) return [prompt];
  return splitSystemPromptAtBoundary(prompt, STATIC_BREAKPOINT_MARKER).filter(
    (part) => part !== STATIC_BREAKPOINT_MARKER,
  );
}
//@ chunk-7pwjpdkw.js:2355-2428 placement
function baseSystemPromptOf(customSystemPrompt, defaultSystemPrompt) {
  return typeof customSystemPrompt === "string"
    ? splitSystemPromptAtBoundary(customSystemPrompt)
    : Array.isArray(customSystemPrompt)
      ? customSystemPrompt
      : defaultSystemPrompt;
}
//@ chunk-7pwjpdkw.js:2428-2618 placement
function withAddedSections(sections, newSections, middleMarker) {
  let boundaryIndex = middleMarker ? sections.indexOf(SYSTEM_PROMPT_DYNAMIC_BOUNDARY) : -1;
  if (boundaryIndex === -1) return [...sections, ...nonEmptyPrompts(newSections)];
  return [
    ...sections.slice(0, boundaryIndex),
    ...nonEmptyPrompts(newSections.filter(([section]) => section === "shared")),
    ...sections.slice(boundaryIndex),
    ...nonEmptyPrompts(newSections.filter(([section_2]) => section_2 === "session")),
  ];
}
//@ chunk-7pwjpdkw.js:2618-2668 placement
function nonEmptyPrompts(sections) {
  return sections.flatMap(([, text]) => (text ? [text] : []));
}
export { baseSystemPromptOf, splitSystemPromptAtBoundary, splitAtStaticBreakpoint, withAddedSections };
