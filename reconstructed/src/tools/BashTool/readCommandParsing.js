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
import { gRs, hRs, pRs, mRs } from "./BashTool.js";

/**
 * 解析 sed 的读取类参数（-n、-e 等）。
 */
//@ chunk-e6aww6q8.js:4763170-4763857 placement
function parseSedReadArgs(e) {
  let n;
  try {
    n = getCommandArgv(e);
  } catch {
    return null;
  }
  if (n[0] !== "sed") return null;
  let r = !1,
    s = null,
    h = null;
  for (let w = 1; w < n.length; w++) {
    let L = n[w];
    if (L.startsWith("-")) {
      if (L.startsWith("--")) {
        if (L === "--in-place" || L.startsWith("--in-place=")) return null;
        if (L === "--expression") return null;
        if (L === "--quiet" || L === "--silent") r = !0;
      } else {
        if (L.includes("i")) return null;
        if (L === "-e") return null;
        if (L.includes("n")) r = !0;
      }
      continue;
    }
    if (s === null) s = L;
    else if (h === null) h = L;
    else return null;
  }
  if (!r || s === null || h === null) return null;
  let match = gRs.exec(s);
  if (match) return { filePath: h, startLine: Number(match[1]), endLine: Number(match[2]) };
  let match_2 = hRs.exec(s);
  if (match_2) {
    let w = Number(match_2[1]);
    return { filePath: h, startLine: w, endLine: w };
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
/**
 * 把 cat/nl 类命令解析为文件读取：只允许已知选项与单个文件参数，返回文件路径以及是否带行号；不符合返回 null。
 */
//@ chunk-e6aww6q8.js:4764029-4764437 placement
function parseCatRead(e) {
  let n;
  try {
    n = getCommandArgv(e);
  } catch {
    return null;
  }
  let r = CAT_LIKE_COMMANDS.get(n[0] ?? "");
  if (r === void 0) return null;
  let s = null;
  for (let y = 1; y < n.length; y++) {
    let S = n[y];
    if (S.startsWith("-") && S !== "-") {
      if (!r.has(S)) return null;
      continue;
    }
    if (s !== null) return null;
    s = S;
  }
  if (s === null || s === "-") return null;
  let h = n[0] === "nl" || n.includes("-n") || n.includes("--number");
  return { filePath: s, startLine: void 0, endLine: void 0, ...(h && { numbered: h }) };
}
/**
 * 解析 head/tail 的行数参数（-n N、--lines=N、-nN、-N）与单个文件参数，返回行数与文件；格式不符返回 null。
 */
//@ chunk-e6aww6q8.js:4764437-4764979 placement
function parseLineCountArgs(e, n) {
  let r = null,
    s = null;
  for (let h = 1; h < e.length; h++) {
    let y = e[h];
    if (y === "-n" || y === "--lines") {
      let S = e[++h];
      if (S === void 0) return null;
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
  return { count: r ?? n, filePath: s };
}
/**
 * 把 head 命令解析为文件读取（起始行与行数）。
 */
//@ chunk-e6aww6q8.js:4764979-4765157 placement
function parseHeadRead(e) {
  let n;
  try {
    n = getCommandArgv(e);
  } catch {
    return null;
  }
  if (n[0] !== "head") return null;
  let r = parseLineCountArgs(n, pRs);
  if (r === null) return null;
  return { filePath: r.filePath, startLine: 1, endLine: r.count };
}
/**
 * 把 tail 命令解析为文件读取（从末尾计算的行数）。
 */
//@ chunk-e6aww6q8.js:4765157-4765357 placement
function parseTailRead(e) {
  let n;
  try {
    n = getCommandArgv(e);
  } catch {
    return null;
  }
  if (n[0] !== "tail") return null;
  let r = parseLineCountArgs(n, mRs);
  if (r === null) return null;
  return { filePath: r.filePath, startLine: void 0, endLine: void 0, tailLines: r.count };
}
/**
 * grep/rg 读命令解析允许的选项：上下文选项、短选项组合、长选项集合。
 */
//@ chunk-e6aww6q8.js:4765357-4765904 placement
var GREP_CONTEXT_SHORT_RE = /^-[ABC]\d+$/,
  GREP_CONTEXT_LONG_RE = /^--(?:after-context|before-context|context)=\d+$/,
  GREP_SHORT_FLAGS_RE = /^-[niwxEFGPHh]+$/,
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
  ]),
  RG_SHORT_FLAGS_RE = /^-[iSswxFnNHUP]+$/,
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
/**
 * 解析 grep 的读取类参数（上下文行数等）。
 */
//@ chunk-e6aww6q8.js:4765904-4766686 placement
function parseGrepReadArgs(e) {
  let n;
  try {
    n = getCommandArgv(e);
  } catch {
    return null;
  }
  let r = n[0] === "rg";
  if (!r && n[0] !== "grep" && n[0] !== "egrep" && n[0] !== "fgrep") return null;
  let s = r ? RG_SHORT_FLAGS_RE : GREP_SHORT_FLAGS_RE,
    h = r ? RG_LONG_FLAGS : GREP_LONG_FLAGS,
    y = null,
    S = null;
  for (let w = 1; w < n.length; w++) {
    let L = n[w];
    if (L.startsWith("-") && L !== "-") {
      if (L === "-A" || L === "-B" || L === "-C") {
        let G = n[++w];
        if (G === void 0 || !/^\d+$/.test(G)) return null;
        continue;
      }
      if (r && (L === "--after-context" || L === "--before-context" || L === "--context")) {
        let G = n[++w];
        if (G === void 0 || !/^\d+$/.test(G)) return null;
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
    startLine: void 0,
    endLine: void 0,
    requiresExitZero: !0,
    contentNotInModelContext: !0,
  };
}

export { parseSedReadArgs, parseCatRead, parseHeadRead, parseTailRead, parseGrepReadArgs };
