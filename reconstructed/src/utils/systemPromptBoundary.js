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
function splitSystemPromptAtBoundary(prompt, boundaryToken = SYSTEM_PROMPT_DYNAMIC_BOUNDARY) {
  let lines = prompt.split(`
`);
  let index = lines.findIndex((line) => line.trim() === boundaryToken);
  if (index === -1) return [prompt];
  let beforePart =
    lines.slice(0, index).join(`
`) +
    `
`;
  let afterPart =
    `
` +
    lines.slice(index + 1).join(`
`);
  return [
    ...(beforePart.trim() ? [beforePart] : []),
    boundaryToken,
    ...(afterPart.trim() ? [afterPart] : []),
  ];
}
//@ chunk-w5ndchqs.js:2077-2159 placement
function splitAtStaticBreakpoint(prompt) {
  if (!prompt.includes(STATIC_BREAKPOINT_MARKER)) return [prompt];
  return splitSystemPromptAtBoundary(prompt, STATIC_BREAKPOINT_MARKER).filter(
    (part) => part !== STATIC_BREAKPOINT_MARKER,
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
//@ chunk-w5ndchqs.js:2422-2472 placement
function nonEmptyPrompts(sections) {
  return sections.flatMap(([, text]) => (text ? [text] : []));
}
export { baseSystemPromptOf, withAddedSections, splitSystemPromptAtBoundary, splitAtStaticBreakpoint };
