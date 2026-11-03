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

//@ chunk-18hwfzwa.js:540532-540536 placement
init_react_production();
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
function isBetweenTemplateVars(h) {
  let uriTemplate = parseUriTemplate(h.template.uriTemplate);
  let D = Object.keys(h.resolvedArgs).length;
  let L = 0;
  for (let idx = 0; idx < uriTemplate.length; idx++) {
    if (uriTemplate[idx].type !== "variable") continue;
    if (L === D) return uriTemplate[idx + 1]?.type === "literal" && uriTemplate[idx + 2]?.type === "variable";
    L++;
  }
  return false;
}
//@ chunk-18hwfzwa.js:541052-541465 placement
/**
 * 把 URI 模板解析为字面量与变量片段（去掉运算符与修饰符）。
 */
function parseUriTemplate(uriTemplate) {
  let x = [];
  let D = 0;
  let L = 0;
  while (D < uriTemplate.length)
    if (uriTemplate[D] === "{") {
      if (D > L)
        x.push({
          type: "literal",
          value: uriTemplate.slice(L, D),
        });
      let index = uriTemplate.indexOf("}", D);
      if (index === -1) {
        x.push({
          type: "literal",
          value: uriTemplate.slice(D),
        });
        return x;
      }
      let sliced = uriTemplate.slice(D + 1, index);
      sliced = sliced.replace(/^[+#./;?&]/, "").replace(/\*$|:\d+$/, "");
      sliced = firstLineOf(sliced, ",");
      x.push({
        type: "variable",
        name: sliced,
      });
      D = index + 1;
      L = D;
    } else D++;
  if (L < uriTemplate.length)
    x.push({
      type: "literal",
      value: uriTemplate.slice(L),
    });
  return x;
}
//@ chunk-18hwfzwa.js:541465-542032 placement
/**
 * 把输入与模板逐段匹配，返回已解析参数与正在输入的参数（名字、值、起始位置）。
 */
function matchUriTemplate(h, x) {
  let uriTemplate = parseUriTemplate(h.uriTemplate);
  let L = {};
  let ee = 0;
  for (let idx = 0; idx < uriTemplate.length; idx++) {
    let Re = uriTemplate[idx];
    if (Re.type === "literal") {
      let sliced = x.slice(ee);
      if (sliced.length < Re.value.length) return null;
      if (!sliced.startsWith(Re.value)) return null;
      ee += Re.value.length;
    } else {
      let Be = uriTemplate[idx + 1];
      let He = Be?.type === "literal" ? Be.value : null;
      let sliced = x.slice(ee);
      if (He) {
        let index = sliced.indexOf(He);
        if (index === -1)
          return {
            template: h,
            argName: Re.name,
            argValue: sliced,
            resolvedArgs: L,
            valueStartIndex: ee,
          };
        L[Re.name] = sliced.slice(0, index);
        ee += index;
      } else
        return {
          template: h,
          argName: Re.name,
          argValue: sliced,
          resolvedArgs: L,
          valueStartIndex: ee,
        };
    }
  }
  return null;
}
//@ chunk-18hwfzwa.js:542032-542332 placement
/**
 * 在多个模板中选出匹配最好的（已解析参数最多、值起始最靠后、变量最多）。
 */
function bestTemplateMatch(h, x) {
  let D = null;
  let L = [-1, -1, -1];
  for (let ee of x) {
    let ke = matchUriTemplate(ee, h);
    if (!ke) continue;
    let Re = [
      Object.keys(ke.resolvedArgs).length,
      ke.valueStartIndex,
      (ee.uriTemplate.match(/\{/g) ?? []).length,
    ];
    if (
      !D ||
      Re[0] > L[0] ||
      (Re[0] === L[0] && Re[1] > L[1]) ||
      (Re[0] === L[0] && Re[1] === L[1] && Re[2] > L[2])
    ) {
      D = ke;
      L = Re;
    }
  }
  return D;
}
//@ chunk-18hwfzwa.js:542332-542676 placement
/**
 * 把补全值填入当前参数位置，并补上紧随其后的字面量。
 */
function applyTemplateCompletion(h, x, D) {
  let sliced = h.slice(0, x.valueStartIndex);
  let uriTemplate = parseUriTemplate(x.template.uriTemplate);
  let ke = -1;
  let Re = 0;
  for (let idx = 0; idx < uriTemplate.length; idx++)
    if (uriTemplate[idx].type === "variable") {
      if (Re === Object.keys(x.resolvedArgs).length) {
        ke = idx;
        break;
      }
      Re++;
    }
  let Be = ke + 1;
  while (uriTemplate[Be]?.type === "variable") Be++;
  let He = ke >= 0 ? uriTemplate[Be] : undefined;
  let We = He?.type === "literal" ? He.value : "";
  return sliced + D + We;
}
export {
  parseCompletionResult,
  literalPrefixBeforeBrace,
  bestTemplateMatch,
  isBetweenTemplateVars,
  applyTemplateCompletion,
};
