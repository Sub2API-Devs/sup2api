/**
 * services/PromptSuggestion/speculation.ts
 *
 * 提示建议的后处理与若干错归声明：去掉建议外层标签、取首个候选；另有 speculation 目录清理、安全只读工具表、重复空 Poll 调用检测等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/PromptSuggestion/speculation.ts
 * pieces: chunk-3sjj4q4c.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { generateSuggestion, SUGGESTION_PROMPT } from "./promptSuggestion.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";

/**
 * 去掉建议外层的 suggestion/response 等标签与 "Suggestion:" 类前缀。
 */
//@ chunk-3sjj4q4c.js:7215-7745 affinity
function stripSuggestionWrapper(e) {
  return e
    .trim()
    .replace(/^<(suggestion|response|output|answer|result)>([\s\S]*)<\/\1>$/i, (n, t, o) =>
      o.includes(`</${t.toLowerCase()}>`) || o.includes(`</${t.toUpperCase()}>`) ? n : o,
    )
    .replace(
      /^\s*(suggested\s+(response|reply|input|prompt)|suggestion|response|reply|answer|output|result|\u63D0\u6848|\u56DE\u7B54|\u8FD4\u4FE1|\u5FDC\u7B54|\u51FA\u529B|\u7D50\u679C|\u5EFA\u8BAE|\u56DE\u590D|\u7B54\u6848|\u8F93\u51FA|\u7ED3\u679C|\uC81C\uC548|\uB2F5\uBCC0|\uC751\uB2F5|\uCD9C\uB825|\uACB0\uACFC)\s*[:\uFF1A]\s*/i,
      "",
    )
    .trim();
}
/**
 * 生成建议并取第一个非空候选。
 */
//@ chunk-3sjj4q4c.js:7745-8009 fingerprint = generatePipelinedSuggestion (0.351)
async function generatePipelinedSuggestion(e, n) {
  let { candidates: candidates, generationRequestId: generationRequestId } = await generateSuggestion(
    SUGGESTION_PROMPT,
    e,
    n,
  );
  for (let s of candidates) {
    let suppressReason = stripSuggestionWrapper(s);
    if (suppressReason)
      return (
        logFeatureOk("prompt_suggestion_generate"),
        { suggestion: suppressReason, generationRequestId: generationRequestId }
      );
  }
  return (
    logFeatureOk("prompt_suggestion_generate"),
    { suggestion: null, generationRequestId: generationRequestId }
  );
}

export { generatePipelinedSuggestion };
