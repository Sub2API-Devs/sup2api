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
import { j } from "../../../vendor/react/cjs/react.production.js";
import { firstLineOf } from "../stringUtils.js";

//@ chunk-18hwfzwa.js:540532-540536 placement
j();
/**
 * 解析补全结果为 {replacement, partial}，格式不对时为 null。
 */
//@ chunk-18hwfzwa.js:540536-540745 placement
function parseCompletionResult(h) {
  if (
    typeof h === "object" &&
    h !== null &&
    "replacement" in h &&
    typeof h.replacement === "string" &&
    "partial" in h &&
    typeof h.partial === "boolean"
  )
    return { replacement: h.replacement, partial: h.partial };
  return null;
}
//@ chunk-18hwfzwa.js:540745-540811 placement
function qce(h) {
  let index = h.indexOf("{");
  return index === -1 ? h : h.slice(0, index);
}
/**
 * 判断当前补全位置是否在两个模板变量之间的字面量处。
 */
//@ chunk-18hwfzwa.js:540811-541052 placement
function isBetweenTemplateVars(h) {
  let x = parseUriTemplate(h.template.uriTemplate),
    D = Object.keys(h.resolvedArgs).length,
    L = 0;
  for (let ee = 0; ee < x.length; ee++) {
    if (x[ee].type !== "variable") continue;
    if (L === D) return x[ee + 1]?.type === "literal" && x[ee + 2]?.type === "variable";
    L++;
  }
  return !1;
}
/**
 * 把 URI 模板解析为字面量与变量片段（去掉运算符与修饰符）。
 */
//@ chunk-18hwfzwa.js:541052-541465 placement
function parseUriTemplate(h) {
  let x = [],
    D = 0,
    L = 0;
  while (D < h.length)
    if (h[D] === "{") {
      if (D > L) x.push({ type: "literal", value: h.slice(L, D) });
      let index = h.indexOf("}", D);
      if (index === -1) return (x.push({ type: "literal", value: h.slice(D) }), x);
      let sliced = h.slice(D + 1, index);
      ((sliced = sliced.replace(/^[+#./;?&]/, "").replace(/\*$|:\d+$/, "")),
        (sliced = firstLineOf(sliced, ",")),
        x.push({ type: "variable", name: sliced }),
        (D = index + 1),
        (L = D));
    } else D++;
  if (L < h.length) x.push({ type: "literal", value: h.slice(L) });
  return x;
}
/**
 * 把输入与模板逐段匹配，返回已解析参数与正在输入的参数（名字、值、起始位置）。
 */
//@ chunk-18hwfzwa.js:541465-542032 placement
function matchUriTemplate(h, x) {
  let D = parseUriTemplate(h.uriTemplate),
    L = {},
    ee = 0;
  for (let ke = 0; ke < D.length; ke++) {
    let Re = D[ke];
    if (Re.type === "literal") {
      let sliced = x.slice(ee);
      if (sliced.length < Re.value.length) return null;
      if (!sliced.startsWith(Re.value)) return null;
      ee += Re.value.length;
    } else {
      let Be = D[ke + 1],
        He = Be?.type === "literal" ? Be.value : null,
        sliced = x.slice(ee);
      if (He) {
        let index = sliced.indexOf(He);
        if (index === -1)
          return { template: h, argName: Re.name, argValue: sliced, resolvedArgs: L, valueStartIndex: ee };
        ((L[Re.name] = sliced.slice(0, index)), (ee += index));
      } else return { template: h, argName: Re.name, argValue: sliced, resolvedArgs: L, valueStartIndex: ee };
    }
  }
  return null;
}
/**
 * 在多个模板中选出匹配最好的（已解析参数最多、值起始最靠后、变量最多）。
 */
//@ chunk-18hwfzwa.js:542032-542332 placement
function bestTemplateMatch(h, x) {
  let D = null,
    L = [-1, -1, -1];
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
    )
      ((D = ke), (L = Re));
  }
  return D;
}
/**
 * 把补全值填入当前参数位置，并补上紧随其后的字面量。
 */
//@ chunk-18hwfzwa.js:542332-542676 placement
function applyTemplateCompletion(h, x, D) {
  let sliced = h.slice(0, x.valueStartIndex),
    ee = parseUriTemplate(x.template.uriTemplate),
    ke = -1,
    Re = 0;
  for (let ze = 0; ze < ee.length; ze++)
    if (ee[ze].type === "variable") {
      if (Re === Object.keys(x.resolvedArgs).length) {
        ke = ze;
        break;
      }
      Re++;
    }
  let Be = ke + 1;
  while (ee[Be]?.type === "variable") Be++;
  let He = ke >= 0 ? ee[Be] : void 0,
    We = He?.type === "literal" ? He.value : "";
  return sliced + D + We;
}

export { parseCompletionResult, qce, bestTemplateMatch, isBetweenTemplateVars, applyTemplateCompletion };
