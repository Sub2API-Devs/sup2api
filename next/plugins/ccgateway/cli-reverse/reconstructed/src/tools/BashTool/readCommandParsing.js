/**
 * tools/BashTool/readCommandParsing.ts
 *
 * 2.1.316 新增：cat/head/tail/grep/sed 等读命令参数解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: placement 8
 */
import { getCommandArgv } from "../../utils/bash/commands.js";
import { SED_PRINT_RANGE_RE, SED_PRINT_LINE_RE, DEFAULT_HEAD_LINES, DEFAULT_TAIL_LINES } from "./BashTool.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:4763170-4763857 placement
/**
 * 解析 sed 的读取类参数（-n、-e 等）。
 */
function parseSedReadArgs(command) {
  let argv;
  try {
    argv = getCommandArgv(command);
  } catch {
    return null;
  }
  if (argv[0] !== "sed") return null;
  let isQuiet = false;
  let script = null;
  let filePath = null;
  for (let idx = 1; idx < argv.length; idx++) {
    let arg = argv[idx];
    if (arg.startsWith("-")) {
      if (arg.startsWith("--")) {
        if (arg === "--in-place" || arg.startsWith("--in-place=")) return null;
        if (arg === "--expression") return null;
        if (arg === "--quiet" || arg === "--silent") isQuiet = true;
      } else {
        if (arg.includes("i")) return null;
        if (arg === "-e") return null;
        if (arg.includes("n")) isQuiet = true;
      }
      continue;
    }
    if (script === null) script = arg;
    else if (filePath === null) filePath = arg;
    else return null;
  }
  if (!isQuiet || script === null || filePath === null) return null;
  let match = SED_PRINT_RANGE_RE.exec(script);
  if (match)
    return {
      filePath,
      startLine: Number(match[1]),
      endLine: Number(match[2]),
    };
  let match_2 = SED_PRINT_LINE_RE.exec(script);
  if (match_2) {
    let line = Number(match_2[1]);
    return {
      filePath,
      startLine: line,
      endLine: line,
    };
  }
  return null;
}
//@ chunk-e6aww6q8.js:4763857-4764029 placement
var CAT_LIKE_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:4763857", () => {
  CAT_LIKE_COMMANDS = new Map([
    ["cat", new Set(["-n", "--number"])],
    ["nl", new Set()],
    ["bat", new Set(["-n", "--number", "-p", "--plain"])],
    ["batcat", new Set(["-n", "--number", "-p", "--plain"])],
  ]);
});
//@ chunk-e6aww6q8.js:4764029-4764437 placement
/**
 * 把 cat/nl 类命令解析为文件读取：只允许已知选项与单个文件参数，返回文件路径以及是否带行号；不符合返回 null。
 */
function parseCatRead(command) {
  let argv;
  try {
    argv = getCommandArgv(command);
  } catch {
    return null;
  }
  let allowedFlags = CAT_LIKE_COMMANDS.get(argv[0] ?? "");
  if (allowedFlags === undefined) return null;
  let filePath = null;
  for (let idx = 1; idx < argv.length; idx++) {
    let arg = argv[idx];
    if (arg.startsWith("-") && arg !== "-") {
      if (!allowedFlags.has(arg)) return null;
      continue;
    }
    if (filePath !== null) return null;
    filePath = arg;
  }
  if (filePath === null || filePath === "-") return null;
  let isNumbered = argv[0] === "nl" || argv.includes("-n") || argv.includes("--number");
  return {
    filePath,
    startLine: undefined,
    endLine: undefined,
    ...(isNumbered && {
      numbered: isNumbered,
    }),
  };
}
//@ chunk-e6aww6q8.js:4764437-4764979 placement
/**
 * 解析 head/tail 的行数参数（-n N、--lines=N、-nN、-N）与单个文件参数，返回行数与文件；格式不符返回 null。
 */
function parseLineCountArgs(argv, defaultCount) {
  let count = null;
  let filePath = null;
  for (let idx = 1; idx < argv.length; idx++) {
    let arg = argv[idx];
    if (arg === "-n" || arg === "--lines") {
      let value = argv[++idx];
      if (value === undefined) return null;
      if (!/^\d+$/.test(value)) return null;
      count = Number(value);
      continue;
    }
    if (arg.startsWith("--lines=")) {
      let sliced = arg.slice(8);
      if (!/^\d+$/.test(sliced)) return null;
      count = Number(sliced);
      continue;
    }
    if (/^-n\d+$/.test(arg)) {
      count = Number(arg.slice(2));
      continue;
    }
    if (/^-\d+$/.test(arg)) {
      count = Number(arg.slice(1));
      continue;
    }
    if (arg.startsWith("-")) return null;
    if (filePath !== null) return null;
    filePath = arg;
  }
  if (filePath === null || filePath === "-") return null;
  if (count === 0) return null;
  return {
    count: count ?? defaultCount,
    filePath,
  };
}
//@ chunk-e6aww6q8.js:4764979-4765157 placement
/**
 * 把 head 命令解析为文件读取（起始行与行数）。
 */
function parseHeadRead(command) {
  let argv;
  try {
    argv = getCommandArgv(command);
  } catch {
    return null;
  }
  if (argv[0] !== "head") return null;
  let lineCountArgs = parseLineCountArgs(argv, DEFAULT_HEAD_LINES);
  if (lineCountArgs === null) return null;
  return {
    filePath: lineCountArgs.filePath,
    startLine: 1,
    endLine: lineCountArgs.count,
  };
}
//@ chunk-e6aww6q8.js:4765157-4765357 placement
/**
 * 把 tail 命令解析为文件读取（从末尾计算的行数）。
 */
function parseTailRead(command) {
  let argv;
  try {
    argv = getCommandArgv(command);
  } catch {
    return null;
  }
  if (argv[0] !== "tail") return null;
  let lineCountArgs = parseLineCountArgs(argv, DEFAULT_TAIL_LINES);
  if (lineCountArgs === null) return null;
  return {
    filePath: lineCountArgs.filePath,
    startLine: undefined,
    endLine: undefined,
    tailLines: lineCountArgs.count,
  };
}
//@ chunk-e6aww6q8.js:4765357-4765904 placement
/**
 * grep/rg 读命令解析允许的选项：上下文选项、短选项组合、长选项集合。
 */
var GREP_CONTEXT_SHORT_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GREP_CONTEXT_LONG_RE;
var GREP_SHORT_FLAGS_RE;
var GREP_LONG_FLAGS;
var RG_SHORT_FLAGS_RE;
var RG_LONG_FLAGS;
deferInit("chunk-e6aww6q8.js:4765357", () => {
  GREP_CONTEXT_SHORT_RE = /^-[ABC]\d+$/;
  GREP_CONTEXT_LONG_RE = /^--(?:after-context|before-context|context)=\d+$/;
  GREP_SHORT_FLAGS_RE = /^-[niwxEFGPHh]+$/;
  GREP_LONG_FLAGS = new Set([
    "--line-number",
    "--ignore-case",
    "--word-regexp",
    "--line-regexp",
    "--extended-regexp",
    "--fixed-strings",
    "--basic-regexp",
    "--perl-regexp",
    "--with-filename",
    "--no-filename",
    "--color=never",
    "--color=auto",
  ]);
  RG_SHORT_FLAGS_RE = /^-[iSswxFnNHUP]+$/;
  RG_LONG_FLAGS = new Set([
    "--ignore-case",
    "--smart-case",
    "--case-sensitive",
    "--word-regexp",
    "--line-regexp",
    "--fixed-strings",
    "--line-number",
    "--no-line-number",
    "--with-filename",
    "--no-filename",
    "--multiline",
    "--pcre2",
  ]);
});
//@ chunk-e6aww6q8.js:4765904-4766686 placement
/**
 * 解析 grep 的读取类参数（上下文行数等）。
 */
function parseGrepReadArgs(command) {
  let argv;
  try {
    argv = getCommandArgv(command);
  } catch {
    return null;
  }
  let isRipgrep = argv[0] === "rg";
  if (!isRipgrep && argv[0] !== "grep" && argv[0] !== "egrep" && argv[0] !== "fgrep") return null;
  let shortFlagsRe = isRipgrep ? RG_SHORT_FLAGS_RE : GREP_SHORT_FLAGS_RE;
  let longFlags = isRipgrep ? RG_LONG_FLAGS : GREP_LONG_FLAGS;
  let pattern = null;
  let filePath = null;
  for (let idx = 1; idx < argv.length; idx++) {
    let arg = argv[idx];
    if (arg.startsWith("-") && arg !== "-") {
      if (arg === "-A" || arg === "-B" || arg === "-C") {
        let value = argv[++idx];
        if (value === undefined || !/^\d+$/.test(value)) return null;
        continue;
      }
      if (isRipgrep && (arg === "--after-context" || arg === "--before-context" || arg === "--context")) {
        let value = argv[++idx];
        if (value === undefined || !/^\d+$/.test(value)) return null;
        continue;
      }
      if (
        GREP_CONTEXT_SHORT_RE.test(arg) ||
        GREP_CONTEXT_LONG_RE.test(arg) ||
        shortFlagsRe.test(arg) ||
        longFlags.has(arg)
      )
        continue;
      return null;
    }
    if (pattern === null) pattern = arg;
    else if (filePath === null) filePath = arg;
    else return null;
  }
  if (pattern === null || filePath === null || filePath === "-") return null;
  if (/[*?[{]/.test(filePath)) return null;
  return {
    filePath,
    startLine: undefined,
    endLine: undefined,
    requiresExitZero: true,
    contentNotInModelContext: true,
  };
}
export { parseSedReadArgs, parseCatRead, parseHeadRead, parseTailRead, parseGrepReadArgs };
