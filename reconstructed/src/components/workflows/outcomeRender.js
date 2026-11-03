/**
 * components/workflows/outcomeRender.ts
 *
 * 2.1.316 新增。工作流结果渲染。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-axsvbsqv.js (8)
 * attribution: placement 8
 */
import { jsonParse, jsonStringifyRaw } from "../../utils/slowOperations.js";
import { truncateToWidth, splitByDisplayWidth } from "../../utils/format.js";
import { Che } from "../../ink/wrapAnsi.js";
import { bunStringWidth } from "../../ink/stringWidth.js";

//@ chunk-axsvbsqv.js:5872-5983 placement
var OUTCOME_INDENT = "  ",
  MAX_OUTCOME_KEY_WIDTH = 40,
  MIN_JSON_RENDER_WIDTH = 8,
  UNSAFE_OUTCOME_CHAR_RE = /[\x00-\x08\x0a-\x1f\x7f-\x9f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,
  KEY_SEPARATOR = ": ";
//@ chunk-axsvbsqv.js:5983-6142 placement
function renderJsonOutcomeLines(o, i) {
  let trimmed = o.trim();
  if (i < MIN_JSON_RENDER_WIDTH || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) return null;
  try {
    let u = [];
    return (renderJsonOutcome(u, jsonParse(trimmed), 0, void 0, !1, i), u);
  } catch {
    return null;
  }
}
//@ chunk-axsvbsqv.js:6142-6236 placement
function Tn(o, i) {
  let floored = Math.floor(Math.max(0, i - MIN_JSON_RENDER_WIDTH) / OUTCOME_INDENT.length);
  return OUTCOME_INDENT.repeat(Math.min(o, floored));
}
//@ chunk-axsvbsqv.js:6236-6330 placement
function gs(o) {
  return o.replace(UNSAFE_OUTCOME_CHAR_RE, (i) => `\\u${i.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
//@ chunk-axsvbsqv.js:6330-6362 placement
function us(o) {
  return gs(jsonStringifyRaw(o));
}
//@ chunk-axsvbsqv.js:6362-6459 placement
function yn(o, i) {
  return o === void 0
    ? []
    : [
        { ...o, text: truncateToWidth(o.text, i - KEY_SEPARATOR.length) },
        { text: KEY_SEPARATOR, dimColor: !0 },
      ];
}
//@ chunk-axsvbsqv.js:6459-6736 placement
function pushWrappedOutcome(o, i, l, u, d, p) {
  if (l) {
    let x = Tn(i, d);
    o.push([
      { text: x },
      { ...l, text: truncateToWidth(l.text, d - x.length - 1) },
      { text: ":", dimColor: !0 },
    ]);
  }
  let h = Tn(l ? i + 1 : i, d),
    b = d - h.length;
  for (let x of u) {
    if (x === "") {
      o.push([{ text: "" }]);
      continue;
    }
    for (let A of splitByDisplayWidth(x, b)) o.push([p ? { text: h + A, color: p } : { text: h + A }]);
  }
}
//@ chunk-axsvbsqv.js:6736-7923 placement
function renderJsonOutcome(o, i, l, u, d, p) {
  let h = Tn(l, p),
    b = p - h.length,
    x = d ? "," : "",
    A = typeof u === "string" ? { text: us(u), color: "permission" } : void 0;
  if (typeof i === "object" && i !== null) {
    if (l >= MAX_OUTCOME_KEY_WIDTH) throw RangeError("JSON outcome nested past MAX_DEPTH");
    let I = Array.isArray(i) ? i.map((V, J) => [J, V]) : Object.entries(i),
      [N, E] = Array.isArray(i) ? ["[", "]"] : ["{", "}"];
    if (I.length === 0) {
      let V = N + E + x;
      o.push([{ text: h }, ...yn(A, b - V.length), { text: V, dimColor: !0 }]);
      return;
    }
    o.push([{ text: h }, ...yn(A, b - N.length), { text: N, dimColor: !0 }]);
    for (let V = 0; V < I.length; V++) {
      let [J, z] = I[V];
      renderJsonOutcome(o, z, l + 1, J, V < I.length - 1, p);
    }
    o.push([{ text: h }, { text: E + x, dimColor: !0 }]);
    return;
  }
  if (typeof i === "number" && (Number.isInteger(i) ? !Number.isSafeInteger(i) : !Number.isFinite(i)))
    throw RangeError("JSON outcome number not representable");
  if (
    typeof i === "string" &&
    i.includes(`
`)
  ) {
    pushWrappedOutcome(
      o,
      l,
      A ?? (typeof u === "number" ? { text: `[${u}]`, dimColor: !0 } : void 0),
      i
        .replace(/(?:\r?\n)+$/, "")
        .split(/\r?\n/)
        .map((I) => Che(gs(I))),
      p,
      void 0,
    );
    return;
  }
  let v = typeof i === "string" ? us(i) : String(i),
    T = typeof i === "string" ? "success" : "warning";
  if (
    (A === void 0 ? 0 : bunStringWidth(A.text) + KEY_SEPARATOR.length) + bunStringWidth(v) + x.length <=
    b
  ) {
    o.push([{ text: h }, ...yn(A, b), { text: v, color: T }, ...(x ? [{ text: x, dimColor: !0 }] : [])]);
    return;
  }
  pushWrappedOutcome(o, l, A, [v + x], p, T);
}

export { renderJsonOutcomeLines };
