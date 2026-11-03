/**
 * services/workflows/workflowScriptMeta.ts
 *
 * 2.1.316 新增：工作流脚本语法错误说明；解析工作流脚本：提取 export const meta 并校验，限制大小等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fx1j35nr.js (26)
 * attribution: placement 26
 */
import { gx } from "../workflow/scriptFile.js";
import { k3t } from "../../../vendor/acorn/dist/acorn.js";
import { repeatString } from "../../utils/stringUtils.js";

/**
 * 解析脚本 meta 用的正则与禁止键。
 */
//@ chunk-fx1j35nr.js:300-715 placement
var META_PARSE_PATTERNS = new Set(["__proto__", "constructor", "prototype"]),
  c = /(?:\s|\/\/[^\n\r\u2028\u2029]*(?:[\n\r\u2028\u2029]|$)|\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/)*/y,
  v = /[\n\r\u2028\u2029]/,
  b = /[A-Za-z_$][\w$]*/y,
  N = /[\w$\\]/,
  k = /(?:(?:0|[1-9][0-9]*)(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?/y,
  m = /x([0-9a-fA-F]{2})|u([0-9a-fA-F]{4})|u\{([0-9a-fA-F]+)\}/y,
  W = new Map([
    [
      "n",
      `
`,
    ],
    ["r", "\r"],
    ["t", "\t"],
    ["b", "\b"],
    ["f", "\f"],
    ["v", "\v"],
  ]);
//@ chunk-fx1j35nr.js:715-784 placement
function S(e, n) {
  if (e[n] !== "{") return;
  try {
    return parseObjectLiteral(e, n);
  } catch {
    return;
  }
}
//@ chunk-fx1j35nr.js:784-965 placement
function metaStatementEnd(e, n) {
  let t = d(e, n);
  if (e[t] === ";") return t + 1;
  if (t >= e.length) return n;
  if (!v.test(e.slice(n, t))) return;
  let r = g(e, t);
  if (r === void 0 || r === "in" || r === "instanceof") return;
  return n;
}
//@ chunk-fx1j35nr.js:965-1026 placement
function d(e, n) {
  return ((c.lastIndex = n), c.exec(e) ? c.lastIndex : n);
}
//@ chunk-fx1j35nr.js:1026-1117 placement
function g(e, n) {
  b.lastIndex = n;
  let match = b.exec(e);
  if (!match || T(e, n + match[0].length)) return;
  return match[0];
}
//@ chunk-fx1j35nr.js:1117-1196 placement
function T(e, n) {
  let t = e[n];
  return t !== void 0 && (N.test(t) || t.charCodeAt(0) > 127);
}
/**
 * 解析 meta 中的 JSON 风格值。
 */
//@ chunk-fx1j35nr.js:1196-1562 placement
function parseMetaValue(e, n) {
  switch (e[n]) {
    case "{":
      return parseObjectLiteral(e, n);
    case "[":
      return parseDelimitedList(e, n, "]", parseMetaValue);
    case "'":
    case '"':
    case "`":
      return parseStringLiteral(e, n);
    case "-": {
      let r = parseNumberLiteral(e, d(e, n + 1));
      return r && { value: -r.value, end: r.end };
    }
    default:
      break;
  }
  let t = parseNumberLiteral(e, n);
  if (t) return t;
  switch (g(e, n)) {
    case "true":
      return { value: !0, end: n + 4 };
    case "false":
      return { value: !1, end: n + 5 };
    case "null":
      return { value: null, end: n + 4 };
    default:
      return;
  }
}
//@ chunk-fx1j35nr.js:1562-1692 placement
function parseObjectLiteral(e, n) {
  let t = parseDelimitedList(e, n, "}", parseObjectEntry);
  if (!t) return;
  let create = Object.create(null);
  for (let [o, i] of t.value) create[o] = i;
  return { value: create, end: t.end };
}
//@ chunk-fx1j35nr.js:1692-1946 placement
function parseObjectEntry(e, n) {
  let t = e[n],
    r;
  if (t === "'" || t === '"') r = parseStringLiteral(e, n);
  else {
    let a = g(e, n);
    r = a === void 0 ? void 0 : { value: a, end: n + a.length };
  }
  if (!r || META_PARSE_PATTERNS.has(r.value)) return;
  let o = d(e, r.end);
  if (e[o] !== ":") return;
  let i = parseMetaValue(e, d(e, o + 1));
  return i && { value: [r.value, i.value], end: i.end };
}
//@ chunk-fx1j35nr.js:1946-2170 placement
function parseDelimitedList(e, n, t, r) {
  let o = [],
    i = n + 1;
  while (!0) {
    if (((i = d(e, i)), e[i] === t)) return { value: o, end: i + 1 };
    if (o.length > 0) {
      if (e[i] !== ",") return;
      if (((i = d(e, i + 1)), e[i] === t)) return { value: o, end: i + 1 };
    }
    let a = r(e, i);
    if (!a) return;
    (o.push(a.value), (i = a.end));
  }
}
//@ chunk-fx1j35nr.js:2170-2311 placement
function parseNumberLiteral(e, n) {
  k.lastIndex = n;
  let match = k.exec(e);
  if (!match) return;
  let r = n + match[0].length;
  if (T(e, r) || e[r] === ".") return;
  return { value: Number(match[0]), end: r };
}
/**
 * 解析字符串字面量（含转义）。
 */
//@ chunk-fx1j35nr.js:2311-2651 placement
function parseStringLiteral(e, n) {
  let t = e[n],
    r = t === "`",
    o = "",
    i = n + 1,
    a = i;
  while (a < e.length) {
    let s = e[a];
    if (s === t) return { value: o + e.slice(i, a), end: a + 1 };
    if (s === "\\") {
      let l = parseEscape(e, a);
      if (!l) return;
      ((o += e.slice(i, a) + l.value), (a = i = l.end));
    } else if (
      r
        ? s === "$" && e[a + 1] === "{"
        : s ===
            `
` || s === "\r"
    )
      return;
    else if (r && s === "\r")
      ((o += `${e.slice(i, a)}
`),
        (a = i =
          a +
          (e[a + 1] ===
          `
`
            ? 2
            : 1)));
    else a++;
  }
  return;
}
/**
 * 解析转义序列。
 */
//@ chunk-fx1j35nr.js:2651-3141 placement
function parseEscape(e, n) {
  let t = e[n + 1];
  if (t === void 0) return;
  let r = W.get(t);
  if (r !== void 0) return { value: r, end: n + 2 };
  if (t === "0") {
    let o = e[n + 2];
    if (o !== void 0 && o >= "0" && o <= "9") return;
    return { value: "\x00", end: n + 2 };
  }
  if (t >= "1" && t <= "9") return;
  if (t === "x" || t === "u") {
    m.lastIndex = n + 1;
    let match = m.exec(e);
    if (!match) return;
    let i = parseInt(match[1] ?? match[2] ?? match[3] ?? "", 16);
    if (i > 1114111) return;
    return { value: String.fromCodePoint(i), end: m.lastIndex };
  }
  if (t === "\r")
    return {
      value: "",
      end:
        n +
        (e[n + 2] ===
        `
`
          ? 3
          : 2),
    };
  return { value: v.test(t) ? "" : t, end: n + 2 };
}
//@ chunk-fx1j35nr.js:3141-3213 placement
var regExp = new RegExp(`^${c.source}export\\s+const\\s+meta\\s*=\\s*(?=\\{)`);
/**
 * 解析工作流脚本：提取 export const meta 并校验，限制大小。
 */
//@ chunk-fx1j35nr.js:3213-4046 placement
function parseWorkflowScript(e, { validateBody: n = !0, maxBytes: t = gx } = {}) {
  if (e.length > t) return { error: `Script exceeds ${t} bytes` };
  let r = n ? null : regExp.exec(e);
  if (r) {
    let u = S(e, r[0].length),
      E = u && metaStatementEnd(e, u.end);
    if (u && E !== void 0) {
      let w = validateWorkflowMeta(u.value);
      if (!("error" in w)) return { meta: w.meta, scriptBody: L(e, E) };
    }
  }
  let { parse: parse } = k3t(),
    i;
  try {
    i = parse(e, {
      ecmaVersion: "latest",
      sourceType: "module",
      allowAwaitOutsideFunction: !0,
      allowReturnOutsideFunction: !0,
    });
  } catch (error) {
    return { error: describeScriptSyntaxError(error, e) };
  }
  let a = i.body[0];
  if (!a || a.type !== "ExportNamedDeclaration" || !isExportConstMeta(a))
    return {
      error: "`export const meta = { name, description, phases }` must be the FIRST statement in the script",
    };
  let init = a.declaration.declarations[0].init,
    f;
  try {
    f = evaluateMetaObject(init);
  } catch (error) {
    return {
      error: `meta must be a pure literal: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  let p = validateWorkflowMeta(f);
  if ("error" in p) return p;
  return { meta: p.meta, scriptBody: L(e, a.end) };
}
//@ chunk-fx1j35nr.js:4046-4116 placement
function L(e, n) {
  return e
    .slice(n)
    .replace(/^[;\s]*\n/, "")
    .trimStart();
}
//@ chunk-fx1j35nr.js:4116-4157 placement
function yFs(e) {
  return !("error" in parseWorkflowScript(e));
}
//@ chunk-fx1j35nr.js:4157-4166 placement
var h = 80;
/**
 * 工作流脚本语法错误说明。
 */
//@ chunk-fx1j35nr.js:4166-5023 placement
function describeScriptSyntaxError(e, n) {
  let t = e instanceof Error ? e.message : String(e),
    r =
      "Workflow scripts must be plain JavaScript \u2014 common causes are TypeScript syntax (type annotations, interfaces, generics) and broken string quoting or escaping.",
    o = hasSyntaxLocation(e) ? e.loc : void 0,
    i = o
      ? n.split(`
`)[o.line - 1]
      : void 0;
  if (!o || i === void 0)
    return `Script parse error: ${t}. ${"Workflow scripts must be plain JavaScript \u2014 common causes are TypeScript syntax (type annotations, interfaces, generics) and broken string quoting or escaping."}`;
  let max = Math.max(0, Math.min(o.column, i.length)),
    max_2 = Math.max(0, Math.min(max - Math.floor(h / 2), i.length - h)),
    sliced = i.slice(max_2, max_2 + h),
    f = `${repeatString(" ", max - max_2)}^`;
  return `Script parse error: ${t}

${sliced}
${f}

${"Workflow scripts must be plain JavaScript \u2014 common causes are TypeScript syntax (type annotations, interfaces, generics) and broken string quoting or escaping."}`;
}
//@ chunk-fx1j35nr.js:5023-5222 placement
function hasSyntaxLocation(e) {
  if (typeof e !== "object" || e === null || !("loc" in e)) return !1;
  let loc = e.loc;
  return (
    typeof loc === "object" &&
    loc !== null &&
    "line" in loc &&
    typeof loc.line === "number" &&
    "column" in loc &&
    typeof loc.column === "number"
  );
}
//@ chunk-fx1j35nr.js:5222-5470 placement
function isExportConstMeta(e) {
  let declaration = e.declaration;
  if (!declaration || declaration.type !== "VariableDeclaration") return !1;
  if (declaration.kind !== "const" || declaration.declarations.length !== 1) return !1;
  let t = declaration.declarations[0];
  return t.id.type === "Identifier" && t.id.name === "meta" && t.init?.type === "ObjectExpression";
}
/**
 * 静态求值 meta AST 节点。
 */
//@ chunk-fx1j35nr.js:5470-6182 placement
function evaluateMetaNode(e) {
  switch (e.type) {
    case "Literal":
      return e.value;
    case "ArrayExpression":
      return e.elements.map((element) => {
        if (element === null) throw Error("sparse arrays not allowed");
        if (element.type === "SpreadElement") throw Error("spread not allowed in meta");
        return evaluateMetaNode(element);
      });
    case "ObjectExpression":
      return evaluateMetaObject(e);
    case "TemplateLiteral": {
      let n = e;
      if (n.expressions.length > 0) throw Error("template interpolation not allowed in meta");
      return n.quasis.map((quasi) => quasi.value.cooked ?? "").join("");
    }
    case "UnaryExpression": {
      let n = e;
      if (n.operator === "-" && n.argument.type === "Literal" && typeof n.argument.value === "number")
        return -n.argument.value;
      throw Error("only negative-number unary allowed in meta");
    }
    default:
      throw Error(`non-literal node type in meta: ${e.type}`);
  }
}
/**
 * 静态求值 meta 对象。
 */
//@ chunk-fx1j35nr.js:6182-6506 placement
function evaluateMetaObject(e) {
  let create = Object.create(null);
  for (let property of e.properties) {
    if (property.type !== "Property") throw Error("only plain properties allowed in meta");
    let r = property;
    if (r.computed) throw Error("computed keys not allowed in meta");
    if (r.method || r.kind !== "init") throw Error("methods/accessors not allowed in meta");
    create[metaPropertyKey(r)] = evaluateMetaNode(r.value);
  }
  return create;
}
//@ chunk-fx1j35nr.js:6506-6765 placement
function metaPropertyKey(e) {
  let n;
  if (e.key.type === "Identifier") n = e.key.name;
  else if (e.key.type === "Literal") n = String(e.key.value);
  else throw Error(`unsupported key type in meta: ${e.key.type}`);
  if (META_PARSE_PATTERNS.has(n)) throw Error(`reserved key name not allowed in meta: ${n}`);
  return n;
}
/**
 * 校验 meta 字段（name、description 等）。
 */
//@ chunk-fx1j35nr.js:6765-7194 placement
function validateWorkflowMeta(e) {
  let n = e.name;
  if (typeof n !== "string" || n.length === 0) return { error: "meta.name must be a non-empty string" };
  let description = e.description;
  if (typeof description !== "string" || description.length === 0)
    return { error: "meta.description must be a non-empty string" };
  let r = typeof e.title === "string" && e.title.length > 0 ? e.title : void 0,
    o = typeof e.whenToUse === "string" ? e.whenToUse : void 0,
    i = parseMetaPhases(e.phases);
  return { meta: { name: n, description: description, title: r, whenToUse: o, phases: i } };
}
//@ chunk-fx1j35nr.js:7194-7471 placement
function parseMetaPhases(e) {
  if (!Array.isArray(e)) return;
  let n = [];
  for (let t of e)
    if (t && typeof t === "object" && "title" in t) {
      let { title: title, detail: detail, model: model } = t;
      if (typeof title === "string")
        n.push({
          title: title,
          detail: typeof detail === "string" ? detail : void 0,
          model: typeof model === "string" ? model : void 0,
        });
    }
  return n.length > 0 ? n : void 0;
}

export { parseWorkflowScript, yFs };
