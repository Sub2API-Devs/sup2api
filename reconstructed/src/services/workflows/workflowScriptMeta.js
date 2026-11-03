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
import { MAX_SCRIPT_FILE_BYTES } from "../workflow/scriptFile.js";
import { require_acorn } from "../../../vendor/acorn/dist/acorn.js";
import { repeatString } from "../../utils/stringUtils.js";

//@ chunk-fx1j35nr.js:300-715 placement
/**
 * 解析脚本 meta 用的正则与禁止键。
 */
var META_PARSE_PATTERNS = new Set(["__proto__", "constructor", "prototype"]);
var SKIP_WHITESPACE_AND_COMMENTS =
  /(?:\s|\/\/[^\n\r\u2028\u2029]*(?:[\n\r\u2028\u2029]|$)|\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/)*/y;
var LINE_BREAK_REGEX = /[\n\r\u2028\u2029]/;
var IDENTIFIER_REGEX = /[A-Za-z_$][\w$]*/y;
var IDENTIFIER_CONTINUATION_REGEX = /[\w$\\]/;
var NUMBER_LITERAL_REGEX = /(?:(?:0|[1-9][0-9]*)(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?/y;
var ESCAPE_SEQUENCE_REGEX = /x([0-9a-fA-F]{2})|u([0-9a-fA-F]{4})|u\{([0-9a-fA-F]+)\}/y;
var SIMPLE_ESCAPE_MAP = new Map([
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
/**
 * 尝试解析当前位置的对象字面量，失败返回 undefined。
 */
function tryParseObjectLiteral(e, n) {
  if (e[n] !== "{") return;
  try {
    return parseObjectLiteral(e, n);
  } catch {
    return;
  }
}
//@ chunk-fx1j35nr.js:784-965 placement
function metaStatementEnd(e, end) {
  let t = skipTrivia(e, end);
  if (e[t] === ";") return t + 1;
  if (t >= e.length) return end;
  if (!LINE_BREAK_REGEX.test(e.slice(end, t))) return;
  let identifier = readIdentifier(e, t);
  if (identifier === undefined || identifier === "in" || identifier === "instanceof") return;
  return end;
}
//@ chunk-fx1j35nr.js:965-1026 placement
/**
 * 跳过空白与注释，返回新的位置。
 */
function skipTrivia(e, n) {
  SKIP_WHITESPACE_AND_COMMENTS.lastIndex = n;
  return SKIP_WHITESPACE_AND_COMMENTS.exec(e) ? SKIP_WHITESPACE_AND_COMMENTS.lastIndex : n;
}
//@ chunk-fx1j35nr.js:1026-1117 placement
/**
 * 读取一个标识符；后面紧跟标识符字符时视为失败。
 */
function readIdentifier(e, n) {
  IDENTIFIER_REGEX.lastIndex = n;
  let match = IDENTIFIER_REGEX.exec(e);
  if (!match || isIdentifierContinuation(e, n + match[0].length)) return;
  return match[0];
}
//@ chunk-fx1j35nr.js:1117-1196 placement
/**
 * 判断该位置字符是否属于标识符（含非 ASCII）。
 */
function isIdentifierContinuation(e, n) {
  let t = e[n];
  return t !== undefined && (IDENTIFIER_CONTINUATION_REGEX.test(t) || t.charCodeAt(0) > 127);
}
//@ chunk-fx1j35nr.js:1196-1562 placement
/**
 * 解析 meta 中的 JSON 风格值。
 */
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
      let numberLiteral = parseNumberLiteral(e, skipTrivia(e, n + 1));
      return (
        numberLiteral && {
          value: -numberLiteral.value,
          end: numberLiteral.end,
        }
      );
    }
    default:
      break;
  }
  let numberLiteral = parseNumberLiteral(e, n);
  if (numberLiteral) return numberLiteral;
  switch (readIdentifier(e, n)) {
    case "true":
      return {
        value: true,
        end: n + 4,
      };
    case "false":
      return {
        value: false,
        end: n + 5,
      };
    case "null":
      return {
        value: null,
        end: n + 4,
      };
    default:
      return;
  }
}
//@ chunk-fx1j35nr.js:1562-1692 placement
function parseObjectLiteral(e, n) {
  let delimitedList = parseDelimitedList(e, n, "}", parseObjectEntry);
  if (!delimitedList) return;
  let r = Object.create(null);
  for (let [o, i] of delimitedList.value) r[o] = i;
  return {
    value: r,
    end: delimitedList.end,
  };
}
//@ chunk-fx1j35nr.js:1692-1946 placement
function parseObjectEntry(e, n) {
  let t = e[n];
  let r;
  if (t === "'" || t === '"') r = parseStringLiteral(e, n);
  else {
    let identifier = readIdentifier(e, n);
    r =
      identifier === undefined
        ? undefined
        : {
            value: identifier,
            end: n + identifier.length,
          };
  }
  if (!r || META_PARSE_PATTERNS.has(r.value)) return;
  let o = skipTrivia(e, r.end);
  if (e[o] !== ":") return;
  let metaValue = parseMetaValue(e, skipTrivia(e, o + 1));
  return (
    metaValue && {
      value: [r.value, metaValue.value],
      end: metaValue.end,
    }
  );
}
//@ chunk-fx1j35nr.js:1946-2170 placement
function parseDelimitedList(e, n, t, r) {
  let o = [];
  let i = n + 1;
  while (true) {
    i = skipTrivia(e, i);
    if (e[i] === t)
      return {
        value: o,
        end: i + 1,
      };
    if (o.length > 0) {
      if (e[i] !== ",") return;
      i = skipTrivia(e, i + 1);
      if (e[i] === t)
        return {
          value: o,
          end: i + 1,
        };
    }
    let a = r(e, i);
    if (!a) return;
    o.push(a.value);
    i = a.end;
  }
}
//@ chunk-fx1j35nr.js:2170-2311 placement
function parseNumberLiteral(e, n) {
  NUMBER_LITERAL_REGEX.lastIndex = n;
  let match = NUMBER_LITERAL_REGEX.exec(e);
  if (!match) return;
  let r = n + match[0].length;
  if (isIdentifierContinuation(e, r) || e[r] === ".") return;
  return {
    value: Number(match[0]),
    end: r,
  };
}
//@ chunk-fx1j35nr.js:2311-2651 placement
/**
 * 解析字符串字面量（含转义）。
 */
function parseStringLiteral(e, n) {
  let t = e[n];
  let r = t === "`";
  let o = "";
  let i = n + 1;
  let a = i;
  while (a < e.length) {
    let s = e[a];
    if (s === t)
      return {
        value: o + e.slice(i, a),
        end: a + 1,
      };
    if (s === "\\") {
      let l = parseEscape(e, a);
      if (!l) return;
      o += e.slice(i, a) + l.value;
      a = i = l.end;
    } else if (
      r
        ? s === "$" && e[a + 1] === "{"
        : s ===
            `
` || s === "\r"
    )
      return;
    else if (r && s === "\r") {
      o += `${e.slice(i, a)}
`;
      a = i =
        a +
        (e[a + 1] ===
        `
`
          ? 2
          : 1);
    } else a++;
  }
  return;
}
//@ chunk-fx1j35nr.js:2651-3141 placement
/**
 * 解析转义序列。
 */
function parseEscape(e, n) {
  let t = e[n + 1];
  if (t === undefined) return;
  let r = SIMPLE_ESCAPE_MAP.get(t);
  if (r !== undefined)
    return {
      value: r,
      end: n + 2,
    };
  if (t === "0") {
    let o = e[n + 2];
    if (o !== undefined && o >= "0" && o <= "9") return;
    return {
      value: "\x00",
      end: n + 2,
    };
  }
  if (t >= "1" && t <= "9") return;
  if (t === "x" || t === "u") {
    ESCAPE_SEQUENCE_REGEX.lastIndex = n + 1;
    let match = ESCAPE_SEQUENCE_REGEX.exec(e);
    if (!match) return;
    let i = parseInt(match[1] ?? match[2] ?? match[3] ?? "", 16);
    if (i > 1114111) return;
    return {
      value: String.fromCodePoint(i),
      end: ESCAPE_SEQUENCE_REGEX.lastIndex,
    };
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
  return {
    value: LINE_BREAK_REGEX.test(t) ? "" : t,
    end: n + 2,
  };
}
//@ chunk-fx1j35nr.js:3141-3213 placement
var regExp = new RegExp(`^${SKIP_WHITESPACE_AND_COMMENTS.source}export\\s+const\\s+meta\\s*=\\s*(?=\\{)`);
//@ chunk-fx1j35nr.js:3213-4046 placement
/**
 * 解析工作流脚本：提取 export const meta 并校验，限制大小。
 */
function parseWorkflowScript(script, { validateBody: n = true, maxBytes: t = MAX_SCRIPT_FILE_BYTES } = {}) {
  if (script.length > t)
    return {
      error: `Script exceeds ${t} bytes`,
    };
  let r = n ? null : regExp.exec(script);
  if (r) {
    let u = tryParseObjectLiteral(script, r[0].length);
    let E = u && metaStatementEnd(script, u.end);
    if (u && E !== undefined) {
      let w = validateWorkflowMeta(u.value);
      if (!("error" in w))
        return {
          meta: w.meta,
          scriptBody: trimScriptBody(script, E),
        };
    }
  }
  let { parse } = require_acorn();
  let i;
  try {
    i = parse(script, {
      ecmaVersion: "latest",
      sourceType: "module",
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
    });
  } catch (error) {
    return {
      error: describeScriptSyntaxError(error, script),
    };
  }
  let a = i.body[0];
  if (!a || a.type !== "ExportNamedDeclaration" || !isExportConstMeta(a))
    return {
      error: "`export const meta = { name, description, phases }` must be the FIRST statement in the script",
    };
  let init = a.declaration.declarations[0].init;
  let f;
  try {
    f = evaluateMetaObject(init);
  } catch (error) {
    return {
      error: `meta must be a pure literal: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  let p = validateWorkflowMeta(f);
  if ("error" in p) return p;
  return {
    meta: p.meta,
    scriptBody: trimScriptBody(script, a.end),
  };
}
//@ chunk-fx1j35nr.js:4046-4116 placement
/**
 * 去掉脚本正文开头的分号与空行。
 */
function trimScriptBody(e, n) {
  return e
    .slice(n)
    .replace(/^[;\s]*\n/, "")
    .trimStart();
}
//@ chunk-fx1j35nr.js:4116-4157 placement
/**
 * 脚本能解析出 meta 即视为合法。
 */
function isValidWorkflowScript(script) {
  return !("error" in parseWorkflowScript(script));
}
//@ chunk-fx1j35nr.js:4157-4166 placement
var SNIPPET_CONTEXT_CHARS = 80;
//@ chunk-fx1j35nr.js:4166-5023 placement
/**
 * 工作流脚本语法错误说明。
 */
function describeScriptSyntaxError(error, n) {
  let t = error instanceof Error ? error.message : String(error);
  let r =
    "Workflow scripts must be plain JavaScript \u2014 common causes are TypeScript syntax (type annotations, interfaces, generics) and broken string quoting or escaping.";
  let loc = hasSyntaxLocation(error) ? error.loc : undefined;
  let i = loc
    ? n.split(`
`)[loc.line - 1]
    : undefined;
  if (!loc || i === undefined)
    return `Script parse error: ${t}. ${"Workflow scripts must be plain JavaScript \u2014 common causes are TypeScript syntax (type annotations, interfaces, generics) and broken string quoting or escaping."}`;
  let max = Math.max(0, Math.min(loc.column, i.length));
  let max_2 = Math.max(
    0,
    Math.min(max - Math.floor(SNIPPET_CONTEXT_CHARS / 2), i.length - SNIPPET_CONTEXT_CHARS),
  );
  let sliced = i.slice(max_2, max_2 + SNIPPET_CONTEXT_CHARS);
  let f = `${repeatString(" ", max - max_2)}^`;
  return `Script parse error: ${t}

${sliced}
${f}

${"Workflow scripts must be plain JavaScript \u2014 common causes are TypeScript syntax (type annotations, interfaces, generics) and broken string quoting or escaping."}`;
}
//@ chunk-fx1j35nr.js:5023-5222 placement
function hasSyntaxLocation(e) {
  if (typeof e !== "object" || e === null || !("loc" in e)) return false;
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
  if (!declaration || declaration.type !== "VariableDeclaration") return false;
  if (declaration.kind !== "const" || declaration.declarations.length !== 1) return false;
  let t = declaration.declarations[0];
  return t.id.type === "Identifier" && t.id.name === "meta" && t.init?.type === "ObjectExpression";
}
//@ chunk-fx1j35nr.js:5470-6182 placement
/**
 * 静态求值 meta AST 节点。
 */
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
      return n.quasis.map((t) => t.value.cooked ?? "").join("");
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
//@ chunk-fx1j35nr.js:6182-6506 placement
/**
 * 静态求值 meta 对象。
 */
function evaluateMetaObject(e) {
  let n = Object.create(null);
  for (let property of e.properties) {
    if (property.type !== "Property") throw Error("only plain properties allowed in meta");
    let r = property;
    if (r.computed) throw Error("computed keys not allowed in meta");
    if (r.method || r.kind !== "init") throw Error("methods/accessors not allowed in meta");
    n[metaPropertyKey(r)] = evaluateMetaNode(r.value);
  }
  return n;
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
//@ chunk-fx1j35nr.js:6765-7194 placement
/**
 * 校验 meta 字段（name、description 等）。
 */
function validateWorkflowMeta(e) {
  let n = e.name;
  if (typeof n !== "string" || n.length === 0)
    return {
      error: "meta.name must be a non-empty string",
    };
  let description = e.description;
  if (typeof description !== "string" || description.length === 0)
    return {
      error: "meta.description must be a non-empty string",
    };
  let title = typeof e.title === "string" && e.title.length > 0 ? e.title : undefined;
  let whenToUse = typeof e.whenToUse === "string" ? e.whenToUse : undefined;
  let phases = parseMetaPhases(e.phases);
  return {
    meta: {
      name: n,
      description,
      title,
      whenToUse,
      phases,
    },
  };
}
//@ chunk-fx1j35nr.js:7194-7471 placement
function parseMetaPhases(phases) {
  if (!Array.isArray(phases)) return;
  let n = [];
  for (let t of phases)
    if (t && typeof t === "object" && "title" in t) {
      let { title, detail, model } = t;
      if (typeof title === "string")
        n.push({
          title,
          detail: typeof detail === "string" ? detail : undefined,
          model: typeof model === "string" ? model : undefined,
        });
    }
  return n.length > 0 ? n : undefined;
}
export { parseWorkflowScript, isValidWorkflowScript };
