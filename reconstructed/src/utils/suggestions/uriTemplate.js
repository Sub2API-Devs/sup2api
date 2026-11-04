/**
 * utils/suggestions/uriTemplate.ts
 *
 * 2.1.316 新增。URI 模板解析。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (8)
 * attribution: placement 8
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { firstLineOf } from "../stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:540532-540536 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:540532", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:540536-540745 placement
/**
 * 解析补全结果为 {replacement, partial}，格式不对时为 null。
 */
function parseCompletionResult(metadata) {
  if (
    typeof metadata === "object" &&
    metadata !== null &&
    "replacement" in metadata &&
    typeof metadata.replacement === "string" &&
    "partial" in metadata &&
    typeof metadata.partial === "boolean"
  )
    return {
      replacement: metadata.replacement,
      partial: metadata.partial,
    };
  return null;
}
//@ chunk-18hwfzwa.js:540745-540811 placement
function literalPrefixBeforeBrace(uriTemplate) {
  let index = uriTemplate.indexOf("{");
  return index === -1 ? uriTemplate : uriTemplate.slice(0, index);
}
//@ chunk-18hwfzwa.js:540811-541052 placement
/**
 * 判断当前补全位置是否在两个模板变量之间的字面量处。
 */
function isBetweenTemplateVars(match) {
  let uriTemplate = parseUriTemplate(match.template.uriTemplate);
  let resolvedCount = Object.keys(match.resolvedArgs).length;
  let variableIndex = 0;
  for (let idx = 0; idx < uriTemplate.length; idx++) {
    if (uriTemplate[idx].type !== "variable") continue;
    if (variableIndex === resolvedCount)
      return uriTemplate[idx + 1]?.type === "literal" && uriTemplate[idx + 2]?.type === "variable";
    variableIndex++;
  }
  return false;
}
//@ chunk-18hwfzwa.js:541052-541465 placement
/**
 * 把 URI 模板解析为字面量与变量片段（去掉运算符与修饰符）。
 */
function parseUriTemplate(uriTemplate) {
  let segments = [];
  let cursor = 0;
  let literalStart = 0;
  while (cursor < uriTemplate.length)
    if (uriTemplate[cursor] === "{") {
      if (cursor > literalStart)
        segments.push({
          type: "literal",
          value: uriTemplate.slice(literalStart, cursor),
        });
      let index = uriTemplate.indexOf("}", cursor);
      if (index === -1) {
        segments.push({
          type: "literal",
          value: uriTemplate.slice(cursor),
        });
        return segments;
      }
      let sliced = uriTemplate.slice(cursor + 1, index);
      sliced = sliced.replace(/^[+#./;?&]/, "").replace(/\*$|:\d+$/, "");
      sliced = firstLineOf(sliced, ",");
      segments.push({
        type: "variable",
        name: sliced,
      });
      cursor = index + 1;
      literalStart = cursor;
    } else cursor++;
  if (literalStart < uriTemplate.length)
    segments.push({
      type: "literal",
      value: uriTemplate.slice(literalStart),
    });
  return segments;
}
//@ chunk-18hwfzwa.js:541465-542032 placement
/**
 * 把输入与模板逐段匹配，返回已解析参数与正在输入的参数（名字、值、起始位置）。
 */
function matchUriTemplate(template, value) {
  let uriTemplate = parseUriTemplate(template.uriTemplate);
  let resolvedArgs = {};
  let position = 0;
  for (let idx = 0; idx < uriTemplate.length; idx++) {
    let segment = uriTemplate[idx];
    if (segment.type === "literal") {
      let sliced = value.slice(position);
      if (sliced.length < segment.value.length) return null;
      if (!sliced.startsWith(segment.value)) return null;
      position += segment.value.length;
    } else {
      let nextSegment = uriTemplate[idx + 1];
      let terminator = nextSegment?.type === "literal" ? nextSegment.value : null;
      let sliced = value.slice(position);
      if (terminator) {
        let index = sliced.indexOf(terminator);
        if (index === -1)
          return {
            template,
            argName: segment.name,
            argValue: sliced,
            resolvedArgs,
            valueStartIndex: position,
          };
        resolvedArgs[segment.name] = sliced.slice(0, index);
        position += index;
      } else
        return {
          template,
          argName: segment.name,
          argValue: sliced,
          resolvedArgs,
          valueStartIndex: position,
        };
    }
  }
  return null;
}
//@ chunk-18hwfzwa.js:542032-542332 placement
/**
 * 在多个模板中选出匹配最好的（已解析参数最多、值起始最靠后、变量最多）。
 */
function bestTemplateMatch(query, templates) {
  let best = null;
  let bestRank = [-1, -1, -1];
  for (let template of templates) {
    let match = matchUriTemplate(template, query);
    if (!match) continue;
    let rank = [
      Object.keys(match.resolvedArgs).length,
      match.valueStartIndex,
      (template.uriTemplate.match(/\{/g) ?? []).length,
    ];
    if (
      !best ||
      rank[0] > bestRank[0] ||
      (rank[0] === bestRank[0] && rank[1] > bestRank[1]) ||
      (rank[0] === bestRank[0] && rank[1] === bestRank[1] && rank[2] > bestRank[2])
    ) {
      best = match;
      bestRank = rank;
    }
  }
  return best;
}
//@ chunk-18hwfzwa.js:542332-542676 placement
/**
 * 把补全值填入当前参数位置，并补上紧随其后的字面量。
 */
function applyTemplateCompletion(typed, match, completion) {
  let sliced = typed.slice(0, match.valueStartIndex);
  let uriTemplate = parseUriTemplate(match.template.uriTemplate);
  let variableIndex = -1;
  let resolvedCount = 0;
  for (let idx = 0; idx < uriTemplate.length; idx++)
    if (uriTemplate[idx].type === "variable") {
      if (resolvedCount === Object.keys(match.resolvedArgs).length) {
        variableIndex = idx;
        break;
      }
      resolvedCount++;
    }
  let afterIndex = variableIndex + 1;
  while (uriTemplate[afterIndex]?.type === "variable") afterIndex++;
  let nextSegment = variableIndex >= 0 ? uriTemplate[afterIndex] : undefined;
  let terminator = nextSegment?.type === "literal" ? nextSegment.value : "";
  return sliced + completion + terminator;
}
export {
  parseCompletionResult,
  literalPrefixBeforeBrace,
  bestTemplateMatch,
  isBetweenTemplateVars,
  applyTemplateCompletion,
};
