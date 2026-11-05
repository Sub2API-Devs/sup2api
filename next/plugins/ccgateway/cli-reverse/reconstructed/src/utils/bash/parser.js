/**
 * utils/bash/parser.ts
 *
 * 解析入口：parseCommand / parseCommandRaw（超长或失败返回 PARSE_ABORTED）、查找命令节点、提取前导环境变量与参数。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/parser.ts
 * pieces: chunk-9jzjcqxe.js (5), chunk-nzz6y5xm.js (14)
 * attribution: fingerprint 3, placement 8, callgraph-fingerprint 1, facade-exports 5, layout 1, file-local 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getParserModule } from "./bashParser.js";
import { logEvent } from "../../services/analytics/index.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-nzz6y5xm.js:483-552 placement
/**
 * 取命令名并去掉 Windows 的 .exe 后缀。
 */
function stripPathAndExe(path) {
  return path.replace(/^.*[\\/]/, "").replace(/\.exe$/i, "");
}
//@ chunk-nzz6y5xm.js:552-610 placement
/**
 * 判断是否为 -pv/-v 这类只打印版本的选项。
 */
function isVersionOnlyFlag(flag) {
  return /^-[pvV]+$/.test(flag) && /[vV]/.test(flag);
}
//@ chunk-nzz6y5xm.js:610-690 placement
/**
 * 判断组合短选项里是否含给定字符之一。
 */
function hasAnyShortFlagChar(flag, letters) {
  return /^-[a-zA-Z]+$/.test(flag) && [...letters].some((letter) => flag.includes(letter));
}
//@ chunk-nzz6y5xm.js:690-751 placement
/**
 * 判断是否为 set 的 +a/-a 类选项。
 */
function isSetFlagWithA(flag) {
  return /^[+-][^iEF]*$/.test(flag) && /[aA]/.test(flag);
}
//@ chunk-nzz6y5xm.js:751-828 placement
/**
 * 判断组合短选项里是否含给定小写字母之一。
 */
function hasAnyLowerShortFlag(flag, letters) {
  return /^-[a-z]+$/.test(flag) && [...letters].some((letter) => flag.includes(letter));
}
//@ chunk-nzz6y5xm.js:828-1078 callgraph-fingerprint (2.1.88 match: COMMAND_TYPES, 0.253)
var MAX_COMMAND_LENGTH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DECLARATION_COMMANDS;
var ARGUMENT_TYPES;
var SUBSTITUTION_TYPES;
var COMMAND_TYPES;
deferInit("chunk-nzz6y5xm.js:828", () => {
  MAX_COMMAND_LENGTH = 1e4;
  DECLARATION_COMMANDS = new Set(["export", "declare", "typeset", "readonly", "local", "unset", "unsetenv"]);
  ARGUMENT_TYPES = new Set(["word", "string", "raw_string", "number"]);
  SUBSTITUTION_TYPES = new Set(["command_substitution", "process_substitution"]);
  COMMAND_TYPES = new Set(["command", "declaration_command"]);
});
//@ chunk-nzz6y5xm.js:1078-1279 facade-exports (2.1.88 match: parseCommand, 1)
/**
 * 解析命令得到 {rootNode, envVars, commandNode, originalCommand}：空串或超过 MAX_COMMAND_LENGTH(10000) 返回 null；用 S_().parse（内置 TS 解析器，带缓存）解析，找第一个 command 节点并提取前导 VAR=val。异常吞掉返回 null。
 */
async function parseCommand(command) {
  if (!command || command.length > MAX_COMMAND_LENGTH) return null;
  try {
    let rootNode = getParserModule().parse(command);
    if (!rootNode) return null;
    let commandNode = findCommandNode(rootNode, null);
    let envVars = extractEnvVars(commandNode);
    return {
      rootNode,
      envVars,
      commandNode,
      originalCommand: command,
    };
  } catch {
    return null;
  }
}
//@ chunk-nzz6y5xm.js:1279-1310 facade-exports (2.1.88 match: PARSE_ABORTED, 1)
/**
 * PARSE_ABORTED 哨兵 Symbol：解析器超时/超预算/超长时由 parseCommandRaw 返回，parseForSecurityFromAst 见到它即返回 too-complex（nodeType PARSE_ABORT）。
 */
var PARSE_ABORTED; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-nzz6y5xm.js:1279", () => {
  PARSE_ABORTED = Symbol("parse-aborted");
});
//@ chunk-nzz6y5xm.js:1310-1641 facade-exports (2.1.88 match: parseCommandRaw, 1)
/**
 * 安全分析用的原始解析：空串返回 null；超长、解析返回 null 或抛异常时上报 tengu_tree_sitter_parse_abort（cmdLength、panic）并返回 PARSE_ABORTED 哨兵。
 */
async function parseCommandRaw(command) {
  if (!command) return null;
  if (command.length > MAX_COMMAND_LENGTH) {
    logEvent("tengu_tree_sitter_parse_abort", {
      cmdLength: command.length,
      panic: false,
    });
    return PARSE_ABORTED;
  }
  try {
    let result = getParserModule().parse(command);
    if (result === null) {
      logEvent("tengu_tree_sitter_parse_abort", {
        cmdLength: command.length,
        panic: false,
      });
      return PARSE_ABORTED;
    }
    return result;
  } catch {
    logEvent("tengu_tree_sitter_parse_abort", {
      cmdLength: command.length,
      panic: true,
    });
    return PARSE_ABORTED;
  }
}
//@ chunk-nzz6y5xm.js:1641-2019 facade-exports (2.1.88 match: findCommandNode, 1)
/**
 * 在 AST 中找第一个 command/declaration_command 节点：穿过 pipeline、redirected_statement；variable_assignment 时取父节点中其后的命令节点。
 */
function findCommandNode(node, parent) {
  let { type, children } = node;
  if (COMMAND_TYPES.has(type)) return node;
  if (type === "variable_assignment" && parent)
    return (
      parent.children.find((child) => COMMAND_TYPES.has(child.type) && child.startIndex > node.startIndex) ??
      null
    );
  if (type === "pipeline") {
    for (let child of children) {
      let result = findCommandNode(child, node);
      if (result) return result;
    }
    return null;
  }
  if (type === "redirected_statement") return children.find((child) => COMMAND_TYPES.has(child.type)) ?? null;
  for (let child of children) {
    let result = findCommandNode(child, node);
    if (result) return result;
  }
  return null;
}
//@ chunk-nzz6y5xm.js:2019-2215 fingerprint (2.1.88 match: extractEnvVars, 1)
/**
 * 取 command 节点开头的 VAR=val 文本（遇到 command_name/word 停止）。
 */
function extractEnvVars(commandNode) {
  if (!commandNode || commandNode.type !== "command") return [];
  let envVars = [];
  for (let child of commandNode.children)
    if (child.type === "variable_assignment") envVars.push(child.text);
    else if (child.type === "command_name" || child.type === "word") break;
  return envVars;
}
//@ chunk-nzz6y5xm.js:2215-2804 facade-exports (2.1.88 match: extractCommandArguments, 0.89)
/**
 * 从命令节点提取去引号的参数列表：declaration_command 只返回关键字；遇到命令/进程替换即截断（concatenation 中含替换的命令名保留原文）。供前缀提取与 shell-quote 回退使用。
 */
function extractCommandArguments(commandNode) {
  if (commandNode.type === "declaration_command") {
    let firstChild = commandNode.children[0];
    return firstChild && DECLARATION_COMMANDS.has(firstChild.text) ? [firstChild.text] : [];
  }
  let args = [];
  let foundCommandName = false;
  for (let child of commandNode.children) {
    if (child.type === "variable_assignment") continue;
    if (child.type === "command_name" || (!foundCommandName && child.type === "word")) {
      foundCommandName = true;
      let nameNode = child.children[0] ?? child;
      if (nameNode.type === "concatenation")
        args.push(
          nameNode.children.some((child) => SUBSTITUTION_TYPES.has(child.type))
            ? nameNode.text
            : nameNode.children.map(stripArgQuotes).join(""),
        );
      else args.push(stripArgQuotes(nameNode));
      continue;
    }
    if (ARGUMENT_TYPES.has(child.type)) args.push(stripArgQuotes(child));
    else if (child.type === "concatenation") {
      if (child.children.some((child) => SUBSTITUTION_TYPES.has(child.type))) break;
      args.push(child.children.map(stripArgQuotes).join(""));
    } else if (SUBSTITUTION_TYPES.has(child.type)) break;
  }
  return args;
}
//@ chunk-nzz6y5xm.js:2804-2893 layout
function stripArgQuotes(node) {
  if (node.type === "word") return node.text.replace(/\\(.)/g, "$1");
  return stripQuotes(node.text);
}
//@ chunk-nzz6y5xm.js:2893-3001 file-local
function stripQuotes(text) {
  return text.length >= 2 &&
    ((text[0] === '"' && text.at(-1) === '"') || (text[0] === "'" && text.at(-1) === "'"))
    ? text.slice(1, -1)
    : text;
}
//@ chunk-9jzjcqxe.js:5295-5392 fingerprint (2.1.88 match: SUBSTITUTION_TYPES, 0.661)
/**
 * 替换类节点类型集合：command_substitution、process_substitution、arithmetic_expansion、subshell。
 */
var SUBSTITUTION_LIKE_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9jzjcqxe.js:5295", () => {
  SUBSTITUTION_LIKE_TYPES = new Set([
    "command_substitution",
    "process_substitution",
    "arithmetic_expansion",
    "subshell",
  ]);
});
//@ chunk-9jzjcqxe.js:5392-5458 placement
function containsSubstitution(node) {
  if (SUBSTITUTION_LIKE_TYPES.has(node.type)) return true;
  return node.children.some(containsSubstitution);
}
//@ chunk-9jzjcqxe.js:5458-5511 placement
/**
 * 视为含替换的字符串节点类型（ansi_c_string、translated_string）。
 */
var SUBSTITUTION_STRING_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9jzjcqxe.js:5458", () => {
  SUBSTITUTION_STRING_TYPES = new Set(["ansi_c_string", "translated_string"]);
});
//@ chunk-9jzjcqxe.js:5511-5577 placement
/**
 * 判断节点或其子树是否含替换。
 */
function nodeContainsSubstitution(node) {
  if (SUBSTITUTION_STRING_TYPES.has(node.type)) return true;
  return node.children.some(nodeContainsSubstitution);
}
//@ chunk-9jzjcqxe.js:7334-7449 fingerprint (2.1.88 match: ARGUMENT_TYPES, 1)
/**
 * 参数类节点类型集合（word、string、raw_string、number），以及“含未转义 shell 操作符”和“以未转义反斜杠结尾”两个正则。
 */
var ARGUMENT_TYPES_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var UNESCAPED_SHELL_OPERATOR_RE;
var TRAILING_BACKSLASH_RE;
deferInit("chunk-9jzjcqxe.js:7334", () => {
  ARGUMENT_TYPES_2 = new Set(["word", "string", "raw_string", "number"]);
  UNESCAPED_SHELL_OPERATOR_RE = /(?:^|[^\\])(?:\\\\)*[;|&<>]/;
  TRAILING_BACKSLASH_RE = /(?:^|[^\\])(?:\\\\)*\\$/;
});
export {
  parseCommandRaw,
  PARSE_ABORTED,
  hasAnyShortFlagChar,
  isVersionOnlyFlag,
  parseCommand,
  extractCommandArguments,
  findCommandNode,
  isSetFlagWithA,
  stripPathAndExe,
  containsSubstitution,
  nodeContainsSubstitution,
  UNESCAPED_SHELL_OPERATOR_RE,
  TRAILING_BACKSLASH_RE,
  ARGUMENT_TYPES_2,
  hasAnyLowerShortFlag,
};
