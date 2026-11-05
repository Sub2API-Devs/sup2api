/**
 * services/workflows/workflowScriptMeta.ts
 *
 * 2.1.316 新增：工作流脚本语法错误说明；解析工作流脚本：提取 export const meta 并校验，限制大小等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h3b88qs5.js (26)
 * attribution: placement 26
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { MAX_SCRIPT_FILE_BYTES } from "../workflow/scriptFile.js";
import { require_acorn } from "../../../vendor/acorn/dist/acorn.js";
import { repeatString } from "../../utils/stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-h3b88qs5.js:300-715 placement
/**
 * 解析脚本 meta 用的正则与禁止键。
 */
var META_PARSE_PATTERNS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SKIP_WHITESPACE_AND_COMMENTS;
var LINE_BREAK_REGEX;
var IDENTIFIER_REGEX;
var IDENTIFIER_CONTINUATION_REGEX;
var NUMBER_LITERAL_REGEX;
var ESCAPE_SEQUENCE_REGEX;
var SIMPLE_ESCAPE_MAP;
deferInit("chunk-h3b88qs5.js:300", () => {
  META_PARSE_PATTERNS = new Set(["__proto__", "constructor", "prototype"]);
  SKIP_WHITESPACE_AND_COMMENTS =
    /(?:\s|\/\/[^\n\r\u2028\u2029]*(?:[\n\r\u2028\u2029]|$)|\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/)*/y;
  LINE_BREAK_REGEX = /[\n\r\u2028\u2029]/;
  IDENTIFIER_REGEX = /[A-Za-z_$][\w$]*/y;
  IDENTIFIER_CONTINUATION_REGEX = /[\w$\\]/;
  NUMBER_LITERAL_REGEX = /(?:(?:0|[1-9][0-9]*)(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?/y;
  ESCAPE_SEQUENCE_REGEX = /x([0-9a-fA-F]{2})|u([0-9a-fA-F]{4})|u\{([0-9a-fA-F]+)\}/y;
  SIMPLE_ESCAPE_MAP = new Map([
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
});
//@ chunk-h3b88qs5.js:715-784 placement
/**
 * 尝试解析当前位置的对象字面量，失败返回 undefined。
 */
function tryParseObjectLiteral(text, start) {
  if (text[start] !== "{") return;
  try {
    return parseObjectLiteral(text, start);
  } catch {
    return;
  }
}
//@ chunk-h3b88qs5.js:784-965 placement
function metaStatementEnd(text, end) {
  let next = skipTrivia(text, end);
  if (text[next] === ";") return next + 1;
  if (next >= text.length) return end;
  if (!LINE_BREAK_REGEX.test(text.slice(end, next))) return;
  let identifier = readIdentifier(text, next);
  if (identifier === undefined || identifier === "in" || identifier === "instanceof") return;
  return end;
}
//@ chunk-h3b88qs5.js:965-1026 placement
/**
 * 跳过空白与注释，返回新的位置。
 */
function skipTrivia(text, position) {
  SKIP_WHITESPACE_AND_COMMENTS.lastIndex = position;
  return SKIP_WHITESPACE_AND_COMMENTS.exec(text) ? SKIP_WHITESPACE_AND_COMMENTS.lastIndex : position;
}
//@ chunk-h3b88qs5.js:1026-1117 placement
/**
 * 读取一个标识符；后面紧跟标识符字符时视为失败。
 */
function readIdentifier(text, start) {
  IDENTIFIER_REGEX.lastIndex = start;
  let match = IDENTIFIER_REGEX.exec(text);
  if (!match || isIdentifierContinuation(text, start + match[0].length)) return;
  return match[0];
}
//@ chunk-h3b88qs5.js:1117-1196 placement
/**
 * 判断该位置字符是否属于标识符（含非 ASCII）。
 */
function isIdentifierContinuation(text, index) {
  let char = text[index];
  return char !== undefined && (IDENTIFIER_CONTINUATION_REGEX.test(char) || char.charCodeAt(0) > 127);
}
//@ chunk-h3b88qs5.js:1196-1562 placement
/**
 * 解析 meta 中的 JSON 风格值。
 */
function parseMetaValue(text, start) {
  switch (text[start]) {
    case "{":
      return parseObjectLiteral(text, start);
    case "[":
      return parseDelimitedList(text, start, "]", parseMetaValue);
    case "'":
    case '"':
    case "`":
      return parseStringLiteral(text, start);
    case "-": {
      let numberLiteral = parseNumberLiteral(text, skipTrivia(text, start + 1));
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
  let numberLiteral = parseNumberLiteral(text, start);
  if (numberLiteral) return numberLiteral;
  switch (readIdentifier(text, start)) {
    case "true":
      return {
        value: true,
        end: start + 4,
      };
    case "false":
      return {
        value: false,
        end: start + 5,
      };
    case "null":
      return {
        value: null,
        end: start + 4,
      };
    default:
      return;
  }
}
//@ chunk-h3b88qs5.js:1562-1692 placement
function parseObjectLiteral(text, start) {
  let delimitedList = parseDelimitedList(text, start, "}", parseObjectEntry);
  if (!delimitedList) return;
  let obj = Object.create(null);
  for (let [key, value] of delimitedList.value) obj[key] = value;
  return {
    value: obj,
    end: delimitedList.end,
  };
}
//@ chunk-h3b88qs5.js:1692-1946 placement
function parseObjectEntry(text, start) {
  let firstChar = text[start];
  let keyLiteral;
  if (firstChar === "'" || firstChar === '"') keyLiteral = parseStringLiteral(text, start);
  else {
    let identifier = readIdentifier(text, start);
    keyLiteral =
      identifier === undefined
        ? undefined
        : {
            value: identifier,
            end: start + identifier.length,
          };
  }
  if (!keyLiteral || META_PARSE_PATTERNS.has(keyLiteral.value)) return;
  let colonIndex = skipTrivia(text, keyLiteral.end);
  if (text[colonIndex] !== ":") return;
  let metaValue = parseMetaValue(text, skipTrivia(text, colonIndex + 1));
  return (
    metaValue && {
      value: [keyLiteral.value, metaValue.value],
      end: metaValue.end,
    }
  );
}
//@ chunk-h3b88qs5.js:1946-2170 placement
function parseDelimitedList(text, start, closeChar, parseItem) {
  let items = [];
  let position = start + 1;
  while (true) {
    position = skipTrivia(text, position);
    if (text[position] === closeChar)
      return {
        value: items,
        end: position + 1,
      };
    if (items.length > 0) {
      if (text[position] !== ",") return;
      position = skipTrivia(text, position + 1);
      if (text[position] === closeChar)
        return {
          value: items,
          end: position + 1,
        };
    }
    let item = parseItem(text, position);
    if (!item) return;
    items.push(item.value);
    position = item.end;
  }
}
//@ chunk-h3b88qs5.js:2170-2311 placement
function parseNumberLiteral(text, start) {
  NUMBER_LITERAL_REGEX.lastIndex = start;
  let match = NUMBER_LITERAL_REGEX.exec(text);
  if (!match) return;
  let end = start + match[0].length;
  if (isIdentifierContinuation(text, end) || text[end] === ".") return;
  return {
    value: Number(match[0]),
    end,
  };
}
//@ chunk-h3b88qs5.js:2311-2651 placement
/**
 * 解析字符串字面量（含转义）。
 */
function parseStringLiteral(text, start) {
  let quote = text[start];
  let isTemplate = quote === "`";
  let out = "";
  let segmentStart = start + 1;
  let cursor = segmentStart;
  while (cursor < text.length) {
    let char = text[cursor];
    if (char === quote)
      return {
        value: out + text.slice(segmentStart, cursor),
        end: cursor + 1,
      };
    if (char === "\\") {
      let escaped = parseEscape(text, cursor);
      if (!escaped) return;
      out += text.slice(segmentStart, cursor) + escaped.value;
      cursor = segmentStart = escaped.end;
    } else if (
      isTemplate
        ? char === "$" && text[cursor + 1] === "{"
        : char ===
            `
` || char === "\r"
    )
      return;
    else if (isTemplate && char === "\r") {
      out += `${text.slice(segmentStart, cursor)}
`;
      cursor = segmentStart =
        cursor +
        (text[cursor + 1] ===
        `
`
          ? 2
          : 1);
    } else cursor++;
  }
  return;
}
//@ chunk-h3b88qs5.js:2651-3141 placement
/**
 * 解析转义序列。
 */
function parseEscape(text, start) {
  let char = text[start + 1];
  if (char === undefined) return;
  let mapped = SIMPLE_ESCAPE_MAP.get(char);
  if (mapped !== undefined)
    return {
      value: mapped,
      end: start + 2,
    };
  if (char === "0") {
    let nextChar = text[start + 2];
    if (nextChar !== undefined && nextChar >= "0" && nextChar <= "9") return;
    return {
      value: "\x00",
      end: start + 2,
    };
  }
  if (char >= "1" && char <= "9") return;
  if (char === "x" || char === "u") {
    ESCAPE_SEQUENCE_REGEX.lastIndex = start + 1;
    let match = ESCAPE_SEQUENCE_REGEX.exec(text);
    if (!match) return;
    let codePoint = parseInt(match[1] ?? match[2] ?? match[3] ?? "", 16);
    if (codePoint > 1114111) return;
    return {
      value: String.fromCodePoint(codePoint),
      end: ESCAPE_SEQUENCE_REGEX.lastIndex,
    };
  }
  if (char === "\r")
    return {
      value: "",
      end:
        start +
        (text[start + 2] ===
        `
`
          ? 3
          : 2),
    };
  return {
    value: LINE_BREAK_REGEX.test(char) ? "" : char,
    end: start + 2,
  };
}
//@ chunk-h3b88qs5.js:3141-3213 placement
var regExp; // deferred: uses META_PARSE_PATTERNS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-h3b88qs5.js:3141", () => {
  regExp = new RegExp(`^${SKIP_WHITESPACE_AND_COMMENTS.source}export\\s+const\\s+meta\\s*=\\s*(?=\\{)`);
});
//@ chunk-h3b88qs5.js:3213-4046 placement
/**
 * 解析工作流脚本：提取 export const meta 并校验，限制大小。
 */
function parseWorkflowScript(script, { validateBody = true, maxBytes = MAX_SCRIPT_FILE_BYTES } = {}) {
  if (script.length > maxBytes)
    return {
      error: `Script exceeds ${maxBytes} bytes`,
    };
  let fastMatch = validateBody ? null : regExp.exec(script);
  if (fastMatch) {
    let fastMeta = tryParseObjectLiteral(script, fastMatch[0].length);
    let bodyStart = fastMeta && metaStatementEnd(script, fastMeta.end);
    if (fastMeta && bodyStart !== undefined) {
      let fastValidated = validateWorkflowMeta(fastMeta.value);
      if (!("error" in fastValidated))
        return {
          meta: fastValidated.meta,
          scriptBody: trimScriptBody(script, bodyStart),
        };
    }
  }
  let { parse } = require_acorn();
  let ast;
  try {
    ast = parse(script, {
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
  let firstStatement = ast.body[0];
  if (
    !firstStatement ||
    firstStatement.type !== "ExportNamedDeclaration" ||
    !isExportConstMeta(firstStatement)
  )
    return {
      error: "`export const meta = { name, description, phases }` must be the FIRST statement in the script",
    };
  let init = firstStatement.declaration.declarations[0].init;
  let metaValue;
  try {
    metaValue = evaluateMetaObject(init);
  } catch (error) {
    return {
      error: `meta must be a pure literal: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  let validated = validateWorkflowMeta(metaValue);
  if ("error" in validated) return validated;
  return {
    meta: validated.meta,
    scriptBody: trimScriptBody(script, firstStatement.end),
  };
}
//@ chunk-h3b88qs5.js:4046-4116 placement
/**
 * 去掉脚本正文开头的分号与空行。
 */
function trimScriptBody(script, bodyStart) {
  return script
    .slice(bodyStart)
    .replace(/^[;\s]*\n/, "")
    .trimStart();
}
//@ chunk-h3b88qs5.js:4116-4157 placement
/**
 * 脚本能解析出 meta 即视为合法。
 */
function isValidWorkflowScript(script) {
  return !("error" in parseWorkflowScript(script));
}
//@ chunk-h3b88qs5.js:4157-4166 placement
var SNIPPET_CONTEXT_CHARS = 80;
//@ chunk-h3b88qs5.js:4166-5023 placement
/**
 * 工作流脚本语法错误说明。
 */
function describeScriptSyntaxError(error, script) {
  let message = error instanceof Error ? error.message : String(error);
  let hint =
    "Workflow scripts must be plain JavaScript \u2014 common causes are TypeScript syntax (type annotations, interfaces, generics) and broken string quoting or escaping.";
  let loc = hasSyntaxLocation(error) ? error.loc : undefined;
  let lineText = loc
    ? script.split(`
`)[loc.line - 1]
    : undefined;
  if (!loc || lineText === undefined)
    return `Script parse error: ${message}. ${"Workflow scripts must be plain JavaScript \u2014 common causes are TypeScript syntax (type annotations, interfaces, generics) and broken string quoting or escaping."}`;
  let max = Math.max(0, Math.min(loc.column, lineText.length));
  let max_2 = Math.max(
    0,
    Math.min(max - Math.floor(SNIPPET_CONTEXT_CHARS / 2), lineText.length - SNIPPET_CONTEXT_CHARS),
  );
  let sliced = lineText.slice(max_2, max_2 + SNIPPET_CONTEXT_CHARS);
  let caretLine = `${repeatString(" ", max - max_2)}^`;
  return `Script parse error: ${message}

${sliced}
${caretLine}

${"Workflow scripts must be plain JavaScript \u2014 common causes are TypeScript syntax (type annotations, interfaces, generics) and broken string quoting or escaping."}`;
}
//@ chunk-h3b88qs5.js:5023-5222 placement
function hasSyntaxLocation(error) {
  if (typeof error !== "object" || error === null || !("loc" in error)) return false;
  let loc = error.loc;
  return (
    typeof loc === "object" &&
    loc !== null &&
    "line" in loc &&
    typeof loc.line === "number" &&
    "column" in loc &&
    typeof loc.column === "number"
  );
}
//@ chunk-h3b88qs5.js:5222-5470 placement
function isExportConstMeta(statement) {
  let declaration = statement.declaration;
  if (!declaration || declaration.type !== "VariableDeclaration") return false;
  if (declaration.kind !== "const" || declaration.declarations.length !== 1) return false;
  let declarator = declaration.declarations[0];
  return (
    declarator.id.type === "Identifier" &&
    declarator.id.name === "meta" &&
    declarator.init?.type === "ObjectExpression"
  );
}
//@ chunk-h3b88qs5.js:5470-6182 placement
/**
 * 静态求值 meta AST 节点。
 */
function evaluateMetaNode(node) {
  switch (node.type) {
    case "Literal":
      return node.value;
    case "ArrayExpression":
      return node.elements.map((element) => {
        if (element === null) throw Error("sparse arrays not allowed");
        if (element.type === "SpreadElement") throw Error("spread not allowed in meta");
        return evaluateMetaNode(element);
      });
    case "ObjectExpression":
      return evaluateMetaObject(node);
    case "TemplateLiteral": {
      let templateNode = node;
      if (templateNode.expressions.length > 0) throw Error("template interpolation not allowed in meta");
      return templateNode.quasis.map((quasi) => quasi.value.cooked ?? "").join("");
    }
    case "UnaryExpression": {
      let unaryNode = node;
      if (
        unaryNode.operator === "-" &&
        unaryNode.argument.type === "Literal" &&
        typeof unaryNode.argument.value === "number"
      )
        return -unaryNode.argument.value;
      throw Error("only negative-number unary allowed in meta");
    }
    default:
      throw Error(`non-literal node type in meta: ${node.type}`);
  }
}
//@ chunk-h3b88qs5.js:6182-6506 placement
/**
 * 静态求值 meta 对象。
 */
function evaluateMetaObject(node) {
  let obj = Object.create(null);
  for (let property of node.properties) {
    if (property.type !== "Property") throw Error("only plain properties allowed in meta");
    let memberProp = property;
    if (memberProp.computed) throw Error("computed keys not allowed in meta");
    if (memberProp.method || memberProp.kind !== "init") throw Error("methods/accessors not allowed in meta");
    obj[metaPropertyKey(memberProp)] = evaluateMetaNode(memberProp.value);
  }
  return obj;
}
//@ chunk-h3b88qs5.js:6506-6765 placement
function metaPropertyKey(propNode) {
  let keyName;
  if (propNode.key.type === "Identifier") keyName = propNode.key.name;
  else if (propNode.key.type === "Literal") keyName = String(propNode.key.value);
  else throw Error(`unsupported key type in meta: ${propNode.key.type}`);
  if (META_PARSE_PATTERNS.has(keyName)) throw Error(`reserved key name not allowed in meta: ${keyName}`);
  return keyName;
}
//@ chunk-h3b88qs5.js:6765-7194 placement
/**
 * 校验 meta 字段（name、description 等）。
 */
function validateWorkflowMeta(meta) {
  let metaName = meta.name;
  if (typeof metaName !== "string" || metaName.length === 0)
    return {
      error: "meta.name must be a non-empty string",
    };
  let description = meta.description;
  if (typeof description !== "string" || description.length === 0)
    return {
      error: "meta.description must be a non-empty string",
    };
  let title = typeof meta.title === "string" && meta.title.length > 0 ? meta.title : undefined;
  let whenToUse = typeof meta.whenToUse === "string" ? meta.whenToUse : undefined;
  let phases = parseMetaPhases(meta.phases);
  return {
    meta: {
      name: metaName,
      description,
      title,
      whenToUse,
      phases,
    },
  };
}
//@ chunk-h3b88qs5.js:7194-7471 placement
function parseMetaPhases(phases) {
  if (!Array.isArray(phases)) return;
  let phaseItems = [];
  for (let phase of phases)
    if (phase && typeof phase === "object" && "title" in phase) {
      let { title, detail, model } = phase;
      if (typeof title === "string")
        phaseItems.push({
          title,
          detail: typeof detail === "string" ? detail : undefined,
          model: typeof model === "string" ? model : undefined,
        });
    }
  return phaseItems.length > 0 ? phaseItems : undefined;
}
export { parseWorkflowScript, isValidWorkflowScript };
