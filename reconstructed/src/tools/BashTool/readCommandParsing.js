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

//@ chunk-e6aww6q8.js:4763170-4763857 placement
/**
 * 解析 sed 的读取类参数（-n、-e 等）。
 */
function parseSedReadArgs(e) {
  let n;
  try {
    n = getCommandArgv(e);
  } catch {
    return null;
  }
  if (n[0] !== "sed") return null;
  let r = false;
  let s = null;
  let h = null;
  for (let idx = 1; idx < n.length; idx++) {
    let L = n[idx];
    if (L.startsWith("-")) {
      if (L.startsWith("--")) {
        if (L === "--in-place" || L.startsWith("--in-place=")) return null;
        if (L === "--expression") return null;
        if (L === "--quiet" || L === "--silent") r = true;
      } else {
        if (L.includes("i")) return null;
        if (L === "-e") return null;
        if (L.includes("n")) r = true;
      }
      continue;
    }
    if (s === null) s = L;
    else if (h === null) h = L;
    else return null;
  }
  if (!r || s === null || h === null) return null;
  let match = SED_PRINT_RANGE_RE.exec(s);
  if (match)
    return {
      filePath: h,
      startLine: Number(match[1]),
      endLine: Number(match[2]),
    };
  let match_2 = SED_PRINT_LINE_RE.exec(s);
  if (match_2) {
    let w = Number(match_2[1]);
    return {
      filePath: h,
      startLine: w,
      endLine: w,
    };
  }
  return null;
}
//@ chunk-e6aww6q8.js:4763857-4764029 placement
var CAT_LIKE_COMMANDS = new Map([
  ["cat", new Set(["-n", "--number"])],
  ["nl", new Set()],
  ["bat", new Set(["-n", "--number", "-p", "--plain"])],
  ["batcat", new Set(["-n", "--number", "-p", "--plain"])],
]);
//@ chunk-e6aww6q8.js:4764029-4764437 placement
/**
 * 把 cat/nl 类命令解析为文件读取：只允许已知选项与单个文件参数，返回文件路径以及是否带行号；不符合返回 null。
 */
function parseCatRead(e) {
  let n;
  try {
    n = getCommandArgv(e);
  } catch {
    return null;
  }
  let r = CAT_LIKE_COMMANDS.get(n[0] ?? "");
  if (r === undefined) return null;
  let s = null;
  for (let idx = 1; idx < n.length; idx++) {
    let S = n[idx];
    if (S.startsWith("-") && S !== "-") {
      if (!r.has(S)) return null;
      continue;
    }
    if (s !== null) return null;
    s = S;
  }
  if (s === null || s === "-") return null;
  let h = n[0] === "nl" || n.includes("-n") || n.includes("--number");
  return {
    filePath: s,
    startLine: undefined,
    endLine: undefined,
    ...(h && {
      numbered: h,
    }),
  };
}
//@ chunk-e6aww6q8.js:4764437-4764979 placement
/**
 * 解析 head/tail 的行数参数（-n N、--lines=N、-nN、-N）与单个文件参数，返回行数与文件；格式不符返回 null。
 */
function parseLineCountArgs(e, n) {
  let r = null;
  let s = null;
  for (let idx = 1; idx < e.length; idx++) {
    let y = e[idx];
    if (y === "-n" || y === "--lines") {
      let S = e[++idx];
      if (S === undefined) return null;
      if (!/^\d+$/.test(S)) return null;
      r = Number(S);
      continue;
    }
    if (y.startsWith("--lines=")) {
      let sliced = y.slice(8);
      if (!/^\d+$/.test(sliced)) return null;
      r = Number(sliced);
      continue;
    }
    if (/^-n\d+$/.test(y)) {
      r = Number(y.slice(2));
      continue;
    }
    if (/^-\d+$/.test(y)) {
      r = Number(y.slice(1));
      continue;
    }
    if (y.startsWith("-")) return null;
    if (s !== null) return null;
    s = y;
  }
  if (s === null || s === "-") return null;
  if (r === 0) return null;
  return {
    count: r ?? n,
    filePath: s,
  };
}
//@ chunk-e6aww6q8.js:4764979-4765157 placement
/**
 * 把 head 命令解析为文件读取（起始行与行数）。
 */
function parseHeadRead(e) {
  let n;
  try {
    n = getCommandArgv(e);
  } catch {
    return null;
  }
  if (n[0] !== "head") return null;
  let lineCountArgs = parseLineCountArgs(n, DEFAULT_HEAD_LINES);
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
function parseTailRead(e) {
  let n;
  try {
    n = getCommandArgv(e);
  } catch {
    return null;
  }
  if (n[0] !== "tail") return null;
  let lineCountArgs = parseLineCountArgs(n, DEFAULT_TAIL_LINES);
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
var GREP_CONTEXT_SHORT_RE = /^-[ABC]\d+$/;
var GREP_CONTEXT_LONG_RE = /^--(?:after-context|before-context|context)=\d+$/;
var GREP_SHORT_FLAGS_RE = /^-[niwxEFGPHh]+$/;
var GREP_LONG_FLAGS = new Set([
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
var RG_SHORT_FLAGS_RE = /^-[iSswxFnNHUP]+$/;
var RG_LONG_FLAGS = new Set([
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
//@ chunk-e6aww6q8.js:4765904-4766686 placement
/**
 * 解析 grep 的读取类参数（上下文行数等）。
 */
function parseGrepReadArgs(e) {
  let n;
  try {
    n = getCommandArgv(e);
  } catch {
    return null;
  }
  let r = n[0] === "rg";
  if (!r && n[0] !== "grep" && n[0] !== "egrep" && n[0] !== "fgrep") return null;
  let s = r ? RG_SHORT_FLAGS_RE : GREP_SHORT_FLAGS_RE;
  let h = r ? RG_LONG_FLAGS : GREP_LONG_FLAGS;
  let y = null;
  let S = null;
  for (let idx = 1; idx < n.length; idx++) {
    let L = n[idx];
    if (L.startsWith("-") && L !== "-") {
      if (L === "-A" || L === "-B" || L === "-C") {
        let G = n[++idx];
        if (G === undefined || !/^\d+$/.test(G)) return null;
        continue;
      }
      if (r && (L === "--after-context" || L === "--before-context" || L === "--context")) {
        let G = n[++idx];
        if (G === undefined || !/^\d+$/.test(G)) return null;
        continue;
      }
      if (GREP_CONTEXT_SHORT_RE.test(L) || GREP_CONTEXT_LONG_RE.test(L) || s.test(L) || h.has(L)) continue;
      return null;
    }
    if (y === null) y = L;
    else if (S === null) S = L;
    else return null;
  }
  if (y === null || S === null || S === "-") return null;
  if (/[*?[{]/.test(S)) return null;
  return {
    filePath: S,
    startLine: undefined,
    endLine: undefined,
    requiresExitZero: true,
    contentNotInModelContext: true,
  };
}
export { parseSedReadArgs, parseCatRead, parseHeadRead, parseTailRead, parseGrepReadArgs };
