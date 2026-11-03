/**
 * tools/PowerShellTool/pathValidation.ts
 *
 * PowerShell 路径约束：CMDLET_PATH_CONFIG、参数缩写解析、路径提取与校验、受保护路径删除（含 cmd /c rd/del）、读封锁下外部程序检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/PowerShellTool/pathValidation.ts
 * pieces: chunk-v0yfsee9.js (45)
 * attribution: sole-consumer 5, affinity 2, fingerprint 8, file-local 4, layout 26
 */
import { homedir } from "os";
import { isAbsolute, normalize, resolve, win32, dirname } from "path";
import { env } from "../../utils/env.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { COMMON_SWITCHES, COMMON_VALUE_PARAMS } from "./commonParameters.js";
import { getPlatform } from "../../utils/platform.js";
import { stripTrailingDotsSpaces } from "../../utils/ignorePatterns.js";
import {
  skipLeadingWhitespaceAndComments,
  stripPsParameterPrefix,
  stripFileSystemProviderPrefix,
  unescapePsDoubleQuoted,
} from "./powershellParsing.js";
import { createSingleEditDiffConfig } from "../../components/permissions/FilePermissionDialog/ideDiffConfig.js";
import {
  isDangerousRemovalPath as isDangerousRemovalPath_2,
  hasInteriorDotDot,
  validateResolvedOperand,
} from "../../utils/permissions/pathValidation.js";
import {
  safeResolvePath,
  getFsImplementation,
  getPathsForPermissionCheck,
} from "../../utils/fsOperations.js";
import { normalizeDosDevicePath, isUncOrDevicePath } from "../../utils/pathClassification.js";
import { subprocessEnv } from "../../utils/subprocessEnv.js";
import {
  matchingRuleForInput,
  normalizeCaseForComparison,
  allWorkingDirectories,
  acceptEditsSuggestionApplies,
} from "../../utils/permissions/filesystem.js";
import { firstGlobCharIndex } from "../../utils/windowsUncPaths.js";
import { containsPathTraversal, getDirectoryForPath } from "../../utils/path.js";
import { resolveToCanonical } from "./readOnlyValidation.js";
import { getOwn } from "../../utils/objectSafety.js";
import { isPowerShellParameter, isNullRedirectionTarget } from "../../utils/powershell/parser.js";
import {
  isOutsideReadsBlockedAsk,
  INLINE_CODE_FLAGS,
  outsideReadsTooComplexAsk,
  outsideReadsRuntimePathAsk,
} from "../../types/permissions.js";
import { getCwd } from "../../utils/cwd.js";
import { GIT_SAFETY_WRITE_CMDLETS } from "./powershellPermissions.js";
import { createReadRuleSuggestion } from "../../utils/permissions/PermissionUpdate.js";

//@ chunk-v0yfsee9.js:21828-21856 sole-consumer
var TENGU_CURIOUS_LAKE = "tengu_curious_lake";
//@ chunk-v0yfsee9.js:21856-21987 sole-consumer
function isCmdRmDenyEnabled() {
  if (env.CLAUDE_CODE_DISABLE_POWERSHELL_CMD_RM_DENY) return false;
  let e = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_CURIOUS_LAKE, true);
  return !(e.value === false && e.source === "payload");
}
//@ chunk-v0yfsee9.js:21987-22151 sole-consumer
/**
 * 匹配除普通空格与 BOM 之外的空白字符。
 */
var CMD_RUN_SWITCH_RE = /^\/[ckr](?:$|\s)/i;
var CMD_REMOVE_VERB_RE = /^(rd|rmdir|del|erase)(?=$|[.:\\/+[\]",;=])/i;
var CMD_CD_VERB_RE = /^(?:(?:cd|chdir|pushd|popd)(?=$|[.:\\/+[\]",;=])|[a-z]:$)/i;
var NON_PRINTING_SPACE_RE = /[^\S\uFEFF]|\u0085/;
//@ chunk-v0yfsee9.js:22151-22330 affinity
/**
 * 参数是否是 cmd / cmd.exe（去掉路径与尾随点空格）。
 */
function isCmdExecutableName(e) {
  let n = e.length;
  while (n > 0 && (e[n - 1] === "." || e[n - 1] === " ")) n--;
  let sliced = e.slice(Math.max(e.lastIndexOf("\\", n), e.lastIndexOf("/", n)) + 1, n);
  return /^cmd(?:\.exe)?$/i.test(sliced);
}
//@ chunk-v0yfsee9.js:22330-22447 fingerprint = SAFE_PATH_ELEMENT_TYPES (0.33)
function classifyElementType(e) {
  if (e === undefined || e === "StringConstant") return "literal";
  return e === "ExpandableString" ? "expands" : "unknown";
}
//@ chunk-v0yfsee9.js:22447-22582 file-local
function hasUnquotedWhitespace(e) {
  let n = false;
  for (let j = 0; j < e.length; j++) {
    let s = e[j];
    if (s === '"' && e[j - 1] !== "\\") n = !n;
    else if (!n && NON_PRINTING_SPACE_RE.test(s)) return true;
  }
  return false;
}
//@ chunk-v0yfsee9.js:22582-22703 layout
function combineElementKinds(e, kind) {
  if (e === "unknown" || kind === "unknown") return "unknown";
  return e === "expands" || kind === "expands" ? "expands" : "literal";
}
//@ chunk-v0yfsee9.js:22703-23207 layout
function tokenizeCmdLine(e) {
  let n = [];
  let r = "";
  let s = "literal";
  let m = false;
  let g = 0;
  let y = () => {
    if (r !== "")
      n.push({
        text: r,
        kind: s,
        separator: false,
      });
    r = "";
    s = "literal";
  };
  for (let j = 0; j < e.length; j++) {
    let { ch, kind } = e[j];
    if (m) {
      r += ch;
      s = combineElementKinds(s, kind);
      m = ch !== '"';
      continue;
    }
    if (ch === "^" && j + 1 < e.length) {
      j++;
      r += e[j].ch;
      s = combineElementKinds(s, combineElementKinds(kind, e[j].kind));
      continue;
    }
    if ("&|<>".includes(ch) || (ch === "(" && r === "") || (ch === ")" && g > 0)) {
      y();
      g += ch === "(" ? 1 : ch === ")" ? -1 : 0;
      n.push({
        text: ch,
        kind,
        separator: true,
      });
      continue;
    }
    if (/[ \t\r\n\v\f,;=]/.test(ch)) {
      y();
      continue;
    }
    if (ch === '"') m = true;
    r += ch;
    s = combineElementKinds(s, kind);
  }
  y();
  return n;
}
//@ chunk-v0yfsee9.js:23207-23472 layout
function findStopParsingToken(text) {
  let n = null;
  for (let j = 0; j < text.length; j++) {
    let s = text[j];
    if (s === "`" && n !== "'") j++;
    else if (n !== null) {
      if (s === n) n = null;
    } else if (s === '"' || s === "'") n = s;
    else if (
      text.startsWith("--%", j) &&
      (j === 0 || /\s/.test(text[j - 1])) &&
      (j + 3 === text.length || /\s/.test(text[j + 3]))
    )
      return j;
  }
  return -1;
}
//@ chunk-v0yfsee9.js:23472-24434 layout
/**
 * 从 PowerShell 调用 cmd.exe /c|/k 的命令里还原出 cmd 实际要执行的命令字符（处理 --% 停止解析、引号、元素是否可展开）。
 */
function getCmdInlineCommandChars(e) {
  if (classifyElementType(e.elementTypes?.[0]) !== "literal" || !isCmdExecutableName(e.name)) return null;
  let stopParsingToken = findStopParsingToken(e.text);
  let r = stopParsingToken === -1 ? undefined : e.text.slice(stopParsingToken + 3).trimStart();
  let s = (S) => stopParsingToken !== -1 && /^--%(?:$|\s)/.test(S);
  let any = e.args.some(s);
  let g = [];
  let y = false;
  for (let j = 0; j < e.args.length; j++) {
    let v = e.args[j];
    let kind = classifyElementType(e.elementTypes?.[j + 1]);
    if (!y && r !== undefined && !any && j === e.args.length - 1) {
      y = true;
      v = r;
    }
    if (!y && s(v)) {
      y = true;
      v = v.slice(3).trimStart();
      if (v === "") continue;
    }
    if (y) kind = "literal";
    if (v !== "" || y)
      g.push({
        text: v,
        kind,
        verbatim: y,
      });
  }
  let index = g.findIndex((S) => S.kind !== "unknown" && CMD_RUN_SWITCH_RE.test(S.text));
  if (index === -1) return null;
  let h = [];
  g.forEach((S, v) => {
    if (v < index) return;
    let x = v === index ? S.text.slice(2).trimStart() : S.text;
    if (v === index && x === "") return;
    if (h.length > 0)
      h.push({
        ch: " ",
        kind: "literal",
      });
    let _ = !S.verbatim && v > index && hasUnquotedWhitespace(x);
    for (let ch of _ ? `"${x}"` : x)
      h.push({
        ch,
        kind: S.kind,
      });
  });
  let index_2 = h.findIndex((S) => !/\s/.test(S.ch));
  if (index_2 !== -1 && h[index_2].ch === '"') {
    let S = -1;
    for (let j = h.length - 1; j > index_2; j--)
      if (h[j].ch === '"') {
        S = j;
        break;
      }
    h = h.filter((v, x) => x !== index_2 && x !== S);
  }
  return h;
}
//@ chunk-v0yfsee9.js:24434-24999 layout
/**
 * 解析 cmd /c 命令行，收集其中 rd/rmdir/del/erase 的操作数（含 start、if exist、嵌套 cmd、cd 之后的状态）。
 */
function extractCmdRemovalOperands(e) {
  let cmdInlineCommandChars = getCmdInlineCommandChars(e);
  if (cmdInlineCommandChars === null) return [];
  let r = new Map();
  let s = (w) => {
    let h = r.get(w);
    if (h !== undefined) return h;
    let matches = /^\$[\p{L}\p{Nd}_:]+$/u.test(w);
    let S = {
      copies: 0,
      escaped: 0,
    };
    for (let index = e.text.indexOf(w); index !== -1; index = e.text.indexOf(w, index + 1)) {
      if (matches && /[\p{L}\p{Nd}_:]/u.test(e.text[index + w.length] ?? "")) continue;
      let x = 0;
      while (index - x > 0 && e.text[index - x - 1] === "`") x++;
      S.copies++;
      S.escaped += x % 2;
    }
    r.set(w, S);
    return S;
  };
  let everyCopyEscaped = (w) => {
    let { copies, escaped } = s(w);
    return copies > 0 && escaped === copies;
  };
  let someCopyEscaped = (w) => s(w).escaped > 0;
  let y = [];
  walkCmdRemovalCommands(
    tokenizeCmdLine(cmdInlineCommandChars),
    {
      cdSeen: false,
      cdTarget: null,
    },
    false,
    {
      operands: y,
      everyCopyEscaped,
      someCopyEscaped,
    },
  );
  return y;
}
//@ chunk-v0yfsee9.js:24999-25008 layout
var MAX_CMD_NESTING_DEPTH = 8;
//@ chunk-v0yfsee9.js:25008-27204 layout
/**
 * 遍历 cmd /c 命令行 token，收集 rd/rmdir/del/erase 的操作数：跟踪 cd 状态、if exist/defined 条件、start（含 /d）、嵌套 cmd /c /k 递归（有深度上限）与重定向。
 */
function walkCmdRemovalCommands(tokens, cdState, inStart, sink, depth = 0) {
  let g = true;
  let y = "none";
  let w = false;
  for (let j = 0; j < tokens.length; j++) {
    let O = tokens[j];
    if (O.separator) {
      if (O.text === "<" || O.text === ">") j = skipRedirection(tokens, j);
      else {
        g = true;
        y = "none";
        w = O.text === "|";
        if (w) cdState.cdTarget = null;
      }
      continue;
    }
    if (/^\d$/.test(O.text) && ["<", ">"].includes(tokens[j + 1]?.text ?? "")) continue;
    if (y === "condition") {
      let lower = O.text.toLowerCase();
      if (lower === "/i" || lower === "not") continue;
      y = lower === "exist" || lower === "defined" ? "operand" : "none";
      continue;
    }
    if (y === "operand") {
      y = "none";
      g = true;
      continue;
    }
    if (!g) continue;
    let replaced = O.text.replace(/^@+/, "");
    if (!inStart && (O.kind === "unknown" || CMD_CD_VERB_RE.test(replaced))) {
      cdState.cdSeen = true;
      cdState.cdTarget =
        w || O.kind === "unknown"
          ? null
          : parseCmdCdTarget(
              {
                ...O,
                text: replaced,
              },
              tokens,
              j + 1,
            );
    }
    if (O.kind !== "unknown") {
      let lower = replaced.toLowerCase();
      if (lower === "call" || lower === "") continue;
      if (/^start(?=$|\/)/.test(lower) && depth < MAX_CMD_NESTING_DEPTH) {
        let k = nextSeparatorIndex(tokens, j + 1);
        let matches = /\/d/.test(lower.slice(5));
        walkCmdRemovalCommands(
          tokens.slice(j + 1, k),
          matches
            ? {
                cdSeen: true,
                cdTarget: null,
              }
            : {
                ...cdState,
              },
          true,
          sink,
          depth + 1,
        );
        j = k - 1;
        g = false;
        continue;
      }
      if (inStart && lower.startsWith("/d")) {
        cdState.cdSeen = true;
        cdState.cdTarget = null;
      }
      if (lower === "if") {
        y = "condition";
        g = false;
        continue;
      }
      if (isCmdExecutableName(replaced.replaceAll('"', ""))) {
        let k = j + 1;
        while (k < tokens.length && !/^\/[ckr]$/i.test(tokens[k].text)) {
          let z = nextSeparatorIndex(tokens, k, k + 1);
          if (z === k) break;
          k = z;
        }
        let D = k < tokens.length && !tokens[k].separator;
        if (D && depth >= MAX_CMD_NESTING_DEPTH) {
          j = k;
          g = true;
          continue;
        }
        let V = nextSeparatorIndex(tokens, k);
        if (D && k + 1 < V) {
          let tokens_2 = tokens.slice(k + 1, V);
          if (tokens_2[0].text.startsWith('"')) {
            let flattened = tokens_2.flatMap((R) =>
              [...` ${R.text}`].map((ch) => ({
                ch,
                kind: R.kind,
              })),
            );
            flattened.splice(0, 2);
            let lastIndex = flattened.findLastIndex((R) => R.ch === '"');
            if (lastIndex !== -1) flattened.splice(lastIndex, 1);
            tokens_2 = tokenizeCmdLine(flattened);
          }
          walkCmdRemovalCommands(
            tokens_2,
            {
              ...cdState,
            },
            false,
            sink,
            depth + 1,
          );
        }
        j = V - 1;
        g = false;
        continue;
      }
    }
    g = inStart;
    let v = O.kind === "unknown" ? null : CMD_REMOVE_VERB_RE.exec(replaced);
    if (v === null) continue;
    let x = [];
    let sliced = replaced.slice(v[0].length);
    if (sliced !== "")
      x.push({
        ...O,
        text: sliced,
      });
    for (let j_2 = j + 1; j_2 < tokens.length; j_2++) {
      let k = tokens[j_2];
      if (!k.separator) {
        x.push(k);
        j = j_2;
        continue;
      }
      if (k.text !== "<" && k.text !== ">") break;
      if (/^\d$/.test(x.at(-1)?.text ?? "")) x.pop();
      j_2 = skipRedirection(tokens, j_2);
      j = j_2;
    }
    for (let P of x) {
      if (P.kind === "unknown" || P.text.startsWith("/")) continue;
      let trimmed = P.text.replaceAll('"', "").trim();
      if (trimmed === "") continue;
      let D =
        P.kind === "expands"
          ? [sink.everyCopyEscaped, sink.someCopyEscaped].map((V) => stripPsVariables(trimmed, V))
          : [
              {
                view: trimmed,
                literalPrefix: null,
              },
            ];
      for (let [V, { view: z, literalPrefix: W }] of D.entries()) {
        if (V > 0 && z === D[0].view) continue;
        sink.operands.push({
          verb: v[1].toLowerCase(),
          text: trimmed,
          emptied:
            W === null
              ? null
              : {
                  view: z,
                  literalPrefix: W,
                },
          afterCd: cdState.cdSeen,
          ...(cdState.cdTarget !== null && {
            cdTarget: cdState.cdTarget,
          }),
        });
      }
    }
  }
}
//@ chunk-v0yfsee9.js:27204-27382 layout
/**
 * 用给定环境展开 cmd 的 %NAME% 变量（大小写不敏感）。
 */
function expandCmdPercentVars(e, n) {
  if (!e.includes("%")) return e;
  let r = new Map(Object.entries(n).map(([key, value]) => [key.toLowerCase(), value]));
  return e.replace(/%([^%:]+)%/g, (s, m) => r.get(m.toLowerCase()) ?? s);
}
//@ chunk-v0yfsee9.js:27382-27947 layout
function parseCmdCdTarget(e, tokens, r) {
  let match = /^(cd|chdir|pushd)(?![a-z])/i.exec(e.text);
  if (match === null) return null;
  let m = r;
  while (m < tokens.length && !tokens[m].separator) m++;
  let filtered = [
    {
      ...e,
      text: e.text.slice(match[0].length),
    },
    ...tokens.slice(r, m),
  ].filter((h) => h.text !== "");
  if (["<", ">"].includes(tokens[m]?.text ?? "") && /^\d$/.test(filtered.at(-1)?.text ?? "")) filtered.pop();
  if (filtered.some((h) => h.kind !== "literal")) return null;
  let y = match[1].toLowerCase() === "pushd" || filtered.some((h) => /^\/d$/i.test(h.text));
  let trimmed = filtered
    .filter((h) => !h.text.startsWith("/"))
    .map((h) => h.text.replaceAll('"', ""))
    .join(" ")
    .trim();
  return y && /^(?:[A-Za-z]:[\\/]|%)/.test(trimmed) ? trimmed : null;
}
//@ chunk-v0yfsee9.js:27947-28092 layout
function nextSeparatorIndex(tokens, n, r = tokens.length) {
  let s = n;
  while (s < r) {
    let m = tokens[s];
    if (!m.separator) s++;
    else if (m.text === "<" || m.text === ">") s = skipRedirection(tokens, s) + 1;
    else break;
  }
  return s;
}
//@ chunk-v0yfsee9.js:28092-28230 layout
function skipRedirection(tokens, n) {
  let r = n;
  while (tokens[r + 1]?.separator && ["<", ">", "&"].includes(tokens[r + 1].text)) r++;
  return tokens[r + 1] !== undefined && !tokens[r + 1].separator ? r + 1 : r;
}
//@ chunk-v0yfsee9.js:28230-28444 layout
function stripPsVariables(e, n = () => false) {
  let r = "";
  let literalPrefix = null;
  let m = 0;
  while (m < e.length) {
    let g = e[m] === "$" ? scanPsVariableEnd(e, m) : m;
    if (g === m || n(e.slice(m, g))) {
      r += e.slice(m, Math.max(g, m + 1));
      m = Math.max(g, m + 1);
      continue;
    }
    literalPrefix ??= r;
    m = g;
  }
  return {
    view: r,
    literalPrefix,
  };
}
//@ chunk-v0yfsee9.js:28444-28781 layout
function scanPsVariableEnd(e, n) {
  let r = e[n + 1];
  if (r === "{") {
    let index = e.indexOf("}", n + 2);
    return index === -1 ? e.length : index + 1;
  }
  if (r === "(") {
    let m = 0;
    for (let j = n + 1; j < e.length; j++)
      if (e[j] === "(") m++;
      else if (e[j] === ")" && --m === 0) return j + 1;
    return e.length;
  }
  if (r === "$" || r === "^" || r === "?") return n + 2;
  let s = n + 1;
  while (s < e.length && /[\p{L}\p{Nd}_:]/u.test(e[s])) s++;
  return s === n + 1 ? n : s;
}
//@ chunk-v0yfsee9.js:28781-39050 fingerprint = CMDLET_PATH_CONFIG (0.974)
/**
 * 每个 cmdlet 的路径参数配置 CMDLET_PATH_CONFIG：操作类型（read/write/create）、路径参数、仅叶名参数、已知开关和带值参数、位置参数跳过数，覆盖 Set/Add/Get-Content、Copy/Move/Remove/New-Item、Out-File、Export-*、Compress/Expand-Archive、Invoke-WebRequest 等。
 */
var MAX_DIRS_TO_LIST = 5;
var CMDLET_PATH_CONFIG = {
  "set-content": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: [
      "-passthru",
      "-force",
      "-whatif",
      "-confirm",
      "-usetransaction",
      "-nonewline",
      "-asbytestream",
    ],
    knownValueParams: ["-value", "-filter", "-include", "-exclude", "-credential", "-encoding", "-stream"],
  },
  "add-content": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: [
      "-passthru",
      "-force",
      "-whatif",
      "-confirm",
      "-usetransaction",
      "-nonewline",
      "-asbytestream",
    ],
    knownValueParams: ["-value", "-filter", "-include", "-exclude", "-credential", "-encoding", "-stream"],
  },
  "remove-item": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-recurse", "-force", "-whatif", "-confirm", "-usetransaction"],
    knownValueParams: ["-filter", "-include", "-exclude", "-credential", "-stream"],
  },
  "clear-content": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-force", "-whatif", "-confirm", "-usetransaction"],
    knownValueParams: ["-filter", "-include", "-exclude", "-credential", "-stream"],
  },
  "out-file": {
    operationType: "write",
    pathParams: ["-filepath", "-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-append", "-force", "-noclobber", "-nonewline", "-whatif", "-confirm"],
    knownValueParams: ["-inputobject", "-encoding", "-width"],
  },
  "tee-object": {
    operationType: "write",
    pathParams: ["-filepath", "-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-append"],
    knownValueParams: ["-inputobject", "-variable", "-encoding"],
  },
  "export-csv": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: [
      "-append",
      "-force",
      "-noclobber",
      "-notypeinformation",
      "-includetypeinformation",
      "-useculture",
      "-noheader",
      "-whatif",
      "-confirm",
    ],
    knownValueParams: ["-inputobject", "-delimiter", "-encoding", "-quotefields", "-usequotes"],
  },
  "export-clixml": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-force", "-noclobber", "-whatif", "-confirm"],
    knownValueParams: ["-inputobject", "-depth", "-encoding"],
  },
  "new-item": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp", "-target"],
    leafOnlyPathParams: ["-name"],
    knownSwitches: ["-force", "-whatif", "-confirm", "-usetransaction"],
    knownValueParams: ["-itemtype", "-value", "-credential", "-type"],
  },
  "copy-item": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp", "-destination"],
    knownSwitches: [
      "-container",
      "-force",
      "-passthru",
      "-recurse",
      "-whatif",
      "-confirm",
      "-usetransaction",
    ],
    knownValueParams: ["-filter", "-include", "-exclude", "-credential", "-fromsession", "-tosession"],
  },
  "move-item": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp", "-destination"],
    knownSwitches: ["-force", "-passthru", "-whatif", "-confirm", "-usetransaction"],
    knownValueParams: ["-filter", "-include", "-exclude", "-credential"],
  },
  "rename-item": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-force", "-passthru", "-whatif", "-confirm", "-usetransaction"],
    knownValueParams: ["-newname", "-credential", "-filter", "-include", "-exclude"],
  },
  "set-item": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-force", "-passthru", "-whatif", "-confirm", "-usetransaction"],
    knownValueParams: ["-value", "-credential", "-filter", "-include", "-exclude"],
  },
  "get-content": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-force", "-usetransaction", "-wait", "-raw", "-asbytestream"],
    knownValueParams: [
      "-readcount",
      "-totalcount",
      "-tail",
      "-first",
      "-head",
      "-last",
      "-filter",
      "-include",
      "-exclude",
      "-credential",
      "-delimiter",
      "-encoding",
      "-stream",
    ],
  },
  "get-childitem": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: [
      "-recurse",
      "-force",
      "-name",
      "-usetransaction",
      "-followsymlink",
      "-directory",
      "-file",
      "-hidden",
      "-readonly",
      "-system",
    ],
    knownValueParams: ["-filter", "-include", "-exclude", "-depth", "-attributes", "-credential"],
  },
  "get-item": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-force", "-usetransaction"],
    knownValueParams: ["-filter", "-include", "-exclude", "-credential", "-stream"],
  },
  "get-itemproperty": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-usetransaction"],
    knownValueParams: ["-name", "-filter", "-include", "-exclude", "-credential"],
  },
  "get-itempropertyvalue": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-usetransaction"],
    knownValueParams: ["-name", "-filter", "-include", "-exclude", "-credential"],
  },
  "get-filehash": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: [],
    knownValueParams: ["-algorithm", "-inputstream"],
  },
  "get-acl": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-audit", "-allcentralaccesspolicies", "-usetransaction"],
    knownValueParams: ["-inputobject", "-filter", "-include", "-exclude"],
  },
  "get-module": {
    operationType: "read",
    pathParams: ["-name", "-fullyqualifiedname"],
    knownSwitches: ["-listavailable", "-all", "-refresh", "-skipeditioncheck"],
    knownValueParams: ["-psedition", "-pssession", "-cimsession"],
  },
  "format-hex": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-raw"],
    knownValueParams: ["-inputobject", "-encoding", "-count", "-offset"],
  },
  "test-path": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-isvalid", "-usetransaction"],
    knownValueParams: [
      "-filter",
      "-include",
      "-exclude",
      "-pathtype",
      "-credential",
      "-olderthan",
      "-newerthan",
    ],
  },
  "resolve-path": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-relative", "-usetransaction", "-force"],
    knownValueParams: ["-credential", "-relativebasepath"],
  },
  "convert-path": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-usetransaction"],
    knownValueParams: [],
  },
  "select-string": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: [
      "-simplematch",
      "-casesensitive",
      "-quiet",
      "-list",
      "-notmatch",
      "-allmatches",
      "-noemphasis",
      "-raw",
    ],
    knownValueParams: [
      "-inputobject",
      "-pattern",
      "-include",
      "-exclude",
      "-encoding",
      "-context",
      "-culture",
    ],
  },
  "set-location": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-passthru", "-usetransaction"],
    knownValueParams: ["-stackname"],
  },
  "push-location": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-passthru", "-usetransaction"],
    knownValueParams: ["-stackname"],
  },
  "pop-location": {
    operationType: "read",
    pathParams: [],
    knownSwitches: ["-passthru", "-usetransaction"],
    knownValueParams: ["-stackname"],
  },
  "select-xml": {
    operationType: "read",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: [],
    knownValueParams: ["-xml", "-content", "-xpath", "-namespace"],
  },
  "get-winevent": {
    operationType: "read",
    pathParams: ["-path"],
    knownSwitches: ["-force", "-oldest"],
    knownValueParams: [
      "-listlog",
      "-logname",
      "-listprovider",
      "-providername",
      "-maxevents",
      "-computername",
      "-credential",
      "-filterxpath",
      "-filterxml",
      "-filterhashtable",
    ],
  },
  "invoke-webrequest": {
    operationType: "write",
    pathParams: ["-outfile", "-infile"],
    positionalSkip: 1,
    optionalWrite: true,
    knownSwitches: [
      "-allowinsecureredirect",
      "-allowunencryptedauthentication",
      "-disablekeepalive",
      "-nobodyprogress",
      "-passthru",
      "-preservefileauthorizationmetadata",
      "-resume",
      "-skipcertificatecheck",
      "-skipheadervalidation",
      "-skiphttperrorcheck",
      "-usebasicparsing",
      "-usedefaultcredentials",
    ],
    knownValueParams: [
      "-uri",
      "-method",
      "-body",
      "-contenttype",
      "-headers",
      "-maximumredirection",
      "-maximumretrycount",
      "-proxy",
      "-proxycredential",
      "-retryintervalsec",
      "-sessionvariable",
      "-timeoutsec",
      "-token",
      "-transferencoding",
      "-useragent",
      "-websession",
      "-credential",
      "-authentication",
      "-certificate",
      "-certificatethumbprint",
      "-form",
      "-httpversion",
    ],
  },
  "invoke-restmethod": {
    operationType: "write",
    pathParams: ["-outfile", "-infile"],
    positionalSkip: 1,
    optionalWrite: true,
    knownSwitches: [
      "-allowinsecureredirect",
      "-allowunencryptedauthentication",
      "-disablekeepalive",
      "-followrellink",
      "-nobodyprogress",
      "-passthru",
      "-preservefileauthorizationmetadata",
      "-resume",
      "-skipcertificatecheck",
      "-skipheadervalidation",
      "-skiphttperrorcheck",
      "-usebasicparsing",
      "-usedefaultcredentials",
    ],
    knownValueParams: [
      "-uri",
      "-method",
      "-body",
      "-contenttype",
      "-headers",
      "-maximumfollowrellink",
      "-maximumredirection",
      "-maximumretrycount",
      "-proxy",
      "-proxycredential",
      "-responseheaderstvariable",
      "-retryintervalsec",
      "-sessionvariable",
      "-statuscodevariable",
      "-timeoutsec",
      "-token",
      "-transferencoding",
      "-useragent",
      "-websession",
      "-credential",
      "-authentication",
      "-certificate",
      "-certificatethumbprint",
      "-form",
      "-httpversion",
    ],
  },
  "expand-archive": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp", "-destinationpath"],
    knownSwitches: ["-force", "-passthru", "-whatif", "-confirm"],
    knownValueParams: [],
  },
  "compress-archive": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp", "-destinationpath"],
    knownSwitches: ["-force", "-update", "-passthru", "-whatif", "-confirm"],
    knownValueParams: ["-compressionlevel"],
  },
  "set-itemproperty": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-passthru", "-force", "-whatif", "-confirm", "-usetransaction"],
    knownValueParams: [
      "-name",
      "-value",
      "-type",
      "-filter",
      "-include",
      "-exclude",
      "-credential",
      "-inputobject",
    ],
  },
  "new-itemproperty": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-force", "-whatif", "-confirm", "-usetransaction"],
    knownValueParams: [
      "-name",
      "-value",
      "-propertytype",
      "-type",
      "-filter",
      "-include",
      "-exclude",
      "-credential",
    ],
  },
  "remove-itemproperty": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-force", "-whatif", "-confirm", "-usetransaction"],
    knownValueParams: ["-name", "-filter", "-include", "-exclude", "-credential"],
  },
  "clear-item": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-force", "-whatif", "-confirm", "-usetransaction"],
    knownValueParams: ["-filter", "-include", "-exclude", "-credential"],
  },
  "export-alias": {
    operationType: "write",
    pathParams: ["-path", "-literalpath", "-pspath", "-lp"],
    knownSwitches: ["-append", "-force", "-noclobber", "-passthru", "-whatif", "-confirm"],
    knownValueParams: ["-name", "-description", "-scope", "-as"],
  },
};
//@ chunk-v0yfsee9.js:39050-39213 layout
function getParamCategories(config) {
  return [
    ["path", config.pathParams],
    ["leafOnly", config.leafOnlyPathParams ?? []],
    ["switch", [...config.knownSwitches, ...COMMON_SWITCHES]],
    ["value", [...config.knownValueParams, ...COMMON_VALUE_PARAMS]],
  ];
}
//@ chunk-v0yfsee9.js:39213-39633 layout
/**
 * 把参数缩写解析到 path/leafOnly/switch/value 类别；匹配多个类别时为 ambiguous，未知为 unknown。
 */
function classifyParamAbbreviation(paramLower, paramCategories) {
  let r = new Set();
  let s = new Map();
  let m = false;
  for (let [w, h] of paramCategories)
    for (let O of h)
      if (O === paramLower) r.add(w);
      else if (paramLower.length > 1 && O.startsWith(paramLower)) {
        let S = s.get(O);
        if (S !== undefined && S !== w) m = true;
        s.set(O, w);
      }
  if (r.size > 1) return "ambiguous";
  let g = [...r][0];
  if (g !== undefined)
    return g === "value" && (m || [...s.values()].some((h) => h !== "value")) ? "ambiguous" : g;
  if (m || s.size > 1) return "ambiguous";
  let y = [...s.values()][0];
  if (y !== undefined) return y;
  return "unknown";
}
//@ chunk-v0yfsee9.js:39633-39758 layout
function normalizeWindowsPathCase(e) {
  if (getPlatform() !== "windows") return e;
  return e
    .split(/([/\\])/)
    .map((n, r) => {
      if (r % 2 !== 0) return n;
      return stripTrailingDotsSpaces(n);
    })
    .join("");
}
//@ chunk-v0yfsee9.js:39758-39786 layout
/**
 * 跳过 PowerShell 文本开头的空白与注释。
 */
function skipPsLeadingSpaceAndComments(rawValue) {
  return skipLeadingWhitespaceAndComments(rawValue);
}
//@ chunk-v0yfsee9.js:39786-40018 file-local
/**
 * 冒号绑定参数的值是否复杂（引号、逗号、括号、反引号、@、$），复杂值无法静态验证。
 */
function hasComplexColonValue(rawValue) {
  if (/['"\u2018-\u201F]/.test(rawValue)) return true;
  if (rawValue.includes("\u180E")) return true;
  let rawValue_2 = skipPsLeadingSpaceAndComments(rawValue);
  return (
    rawValue_2.includes(",") ||
    rawValue_2.startsWith("(") ||
    rawValue_2.startsWith("[") ||
    rawValue_2.includes("`") ||
    rawValue_2.includes("@(") ||
    rawValue_2.startsWith("@") ||
    rawValue_2.includes("$")
  );
}
//@ chunk-v0yfsee9.js:40018-40169 layout = formatDirectoryList (1)
function formatDirectoryList(directories) {
  let dirCount = directories.length;
  if (dirCount <= MAX_DIRS_TO_LIST) return directories.map((dir) => `'${dir}'`).join(", ");
  return `${directories
    .slice(0, MAX_DIRS_TO_LIST)
    .map((dir) => `'${dir}'`)
    .join(", ")}, and ${dirCount - MAX_DIRS_TO_LIST} more`;
}
//@ chunk-v0yfsee9.js:40169-40268 file-local
function expandTilde(filePath) {
  if (filePath === "~" || filePath.startsWith("~/") || filePath.startsWith("~\\"))
    return homedir() + filePath.slice(1);
  return filePath;
}
//@ chunk-v0yfsee9.js:40268-40408 layout
/**
 * 路径（去提供程序前缀、各种拼写）是否是禁止删除的系统路径（盘根、盘根下一级、home 等）。
 */
function isDangerousRemovalPath(e) {
  let n = new Set([
    stripPsParameterPrefix(e),
    stripFileSystemProviderPrefix(e),
    createSingleEditDiffConfig(e),
  ]);
  for (let r of n) {
    let index = r.indexOf("::");
    if ((index >= 0 && isDangerousRemovalRawPath(r.slice(index + 2))) || isDangerousRemovalRawPath(r))
      return true;
  }
  return false;
}
//@ chunk-v0yfsee9.js:40408-40501 file-local
function isDangerousRemovalRawPath(filePath) {
  let expanded = expandTilde(filePath).replace(/\\/g, "/");
  let r = normalizeWindowsPathCase(expanded);
  if (isAbsolute(r)) r = normalize(r);
  return isDangerousRemovalPath_2(r) || isDangerousRemovalPath_2(expanded);
}
//@ chunk-v0yfsee9.js:40501-40849 layout
function resolveDangerousRemovalPath(e, cwd) {
  let r = new Set([e, stripFileSystemProviderPrefix(e), createSingleEditDiffConfig(e)]);
  for (let s of [...r]) {
    if (s.includes("`")) r.add(unescapePsDoubleQuoted(s));
    if (s.includes("::")) {
      let sliced = s.slice(s.indexOf("::") + 2);
      r.add(sliced);
      if (sliced.includes("`")) r.add(unescapePsDoubleQuoted(sliced));
    }
  }
  for (let s of r) {
    let m = normalizeWindowsPathCase(expandTilde(s).replace(/\\/g, "/"));
    if (m === "") continue;
    let g = isAbsolute(m) ? m : resolve(cwd, m);
    let { resolvedPath } = safeResolvePath(getFsImplementation(), g);
    if (isDangerousRemovalPath_2(resolvedPath)) return resolvedPath;
  }
  return null;
}
//@ chunk-v0yfsee9.js:40849-40881 layout
/**
 * 判断基础规范化后与原值相同（表示路径未改写）。
 */
function isUnchangedByBasicNormalize(e) {
  return stripPsParameterPrefix(e) === e;
}
//@ chunk-v0yfsee9.js:40881-41126 fingerprint = dangerousRemovalDeny (0.879)
/**
 * 构造"删除受保护系统路径"的 deny 结果（safetyCheck，分类器不可批准）。
 */
function dangerousRemovalDeny(
  e,
  message = `Remove-Item on system path '${e}' is blocked. This path is protected from removal.`,
) {
  return {
    behavior: "deny",
    message,
    decisionReason: {
      type: "safetyCheck",
      reason: "Removal targets a protected system path",
      classifierApprovable: false,
    },
  };
}
//@ chunk-v0yfsee9.js:41126-41363 layout
function stripTrailingWildcardSegment(e) {
  let n = e.length;
  while (n > 0 && (e[n - 1] === "\\" || e[n - 1] === "/")) n--;
  let r = n;
  while (r > 0 && "*?.".includes(e[r - 1])) r--;
  let sliced = e.slice(r, n);
  if (!(r === 0 || e[r - 1] === "\\" || e[r - 1] === "/") || !/[*?]/.test(sliced)) return e;
  return r === 0 ? "." : e.slice(0, r);
}
//@ chunk-v0yfsee9.js:41363-41743 layout
function findProtectedRemovalTarget(e, n, r, cdTarget, m) {
  let g = stripTrailingWildcardSegment(normalizeDosDevicePath(e));
  if (isDangerousRemovalPath(g))
    return {
      path: g,
      quotable: true,
    };
  let y = r && !/^(?:[A-Za-z]:)?[\\/]/.test(g);
  if (!isUncOrDevicePath(g) && !y) {
    let dangerousRemovalPath = resolveDangerousRemovalPath(g, n);
    if (dangerousRemovalPath !== null)
      return {
        path: dangerousRemovalPath,
        quotable: true,
      };
  }
  if (y && cdTarget !== undefined && !/^[A-Za-z]:/.test(g))
    for (let w of new Set([cdTarget, expandCmdPercentVars(cdTarget, m)])) {
      if (!/^[A-Za-z]:[\\/]/.test(w)) continue;
      let resolved = win32.resolve(w, g);
      if (isDangerousRemovalPath(resolved))
        return {
          path: resolved,
          quotable: w === cdTarget,
          viaCd: cdTarget,
        };
    }
  return null;
}
//@ chunk-v0yfsee9.js:41743-42674 layout
/**
 * 开关 tengu_curious_lake（可用 CLAUDE_CODE_DISABLE_POWERSHELL_CMD_RM_DENY 关闭）打开时，检查 PowerShell 里通过 cmd /c 执行的 rd/del 是否删除受保护路径（考虑 %VAR%、$变量为空、cd 之后的相对路径），命中则 deny。
 */
function checkCmdRemovalOfProtectedPath(cmd, cwd, compoundCommandHasCd) {
  if (!isCmdRmDenyEnabled()) return;
  let cmdRemovalOperands = extractCmdRemovalOperands(cmd);
  if (cmdRemovalOperands.length === 0) return;
  let m = subprocessEnv();
  for (let { verb, text, emptied, afterCd, cdTarget } of cmdRemovalOperands) {
    if (emptied?.literalPrefix === "") continue;
    let view = emptied?.view ?? text;
    for (let v of new Set([view, expandCmdPercentVars(view, m)])) {
      let protectedRemovalTarget = findProtectedRemovalTarget(
        v,
        cwd,
        compoundCommandHasCd || afterCd,
        cdTarget,
        m,
      );
      if (protectedRemovalTarget === null) continue;
      let _ = protectedRemovalTarget.quotable && v === view;
      let P =
        protectedRemovalTarget.viaCd === undefined
          ? null
          : `after this line's cd to '${protectedRemovalTarget.viaCd}'`;
      let joined = (
        _
          ? [P, emptied !== null ? "if its variables are empty" : null]
          : [
              P,
              `with cmd's %NAME% variables replaced${emptied !== null ? " and PowerShell's $ variables empty" : ""}`,
            ]
      )
        .filter((V) => V !== null)
        .join(" and ");
      return dangerousRemovalDeny(
        text,
        !_
          ? `cmd's ${verb} on '${text}' is blocked because, ${joined}, it targets a path that no command may remove: a drive root, a folder directly under one, or the home folder.`
          : text === protectedRemovalTarget.path
            ? `cmd's ${verb} on '${protectedRemovalTarget.path}' is blocked because no command may remove that path.`
            : `cmd's ${verb} on '${text}' is blocked because${joined === "" ? "" : `, ${joined},`} it targets '${protectedRemovalTarget.path}', which no command may remove.`,
      );
    }
  }
  return;
}
//@ chunk-v0yfsee9.js:42674-42919 fingerprint = checkDenyRuleForGuessedPath (1)
/**
 * 对猜测出的路径拼写检查 read/edit deny 规则，返回命中的规则。
 */
function checkDenyRuleForGuessedPath(strippedPath, cwd, toolPermissionContext, operationType) {
  if (!strippedPath || strippedPath.includes("\x00")) return null;
  let tildeExpanded = expandTilde(normalizeWindowsPathCase(strippedPath));
  let abs = isAbsolute(tildeExpanded) ? tildeExpanded : resolve(cwd, tildeExpanded);
  let { resolvedPath } = safeResolvePath(getFsImplementation(), abs);
  let permissionType = operationType === "read" ? "read" : "edit";
  for (let h of getPathsForPermissionCheck(resolvedPath)) {
    let denyRule = matchingRuleForInput(h, toolPermissionContext, permissionType, "deny");
    if (denyRule !== null)
      return {
        resolvedPath,
        rule: denyRule,
      };
  }
  return null;
}
//@ chunk-v0yfsee9.js:42919-46978 fingerprint = validatePath (0.794)
/**
 * PowerShell 路径校验：对提供程序路径、反引号转义、:: 前缀等多种拼写先查 deny 规则；再按操作类型判断是否在允许的工作目录内（含读封锁、UNC、设备路径等）。
 */
function validatePath(filePath, cwd, toolPermissionContext, operationType) {
  let cleanPath = stripPsParameterPrefix(filePath);
  let g = cleanPath !== filePath;
  if (g) {
    let _ = new Set();
    for (let P of [
      filePath.replaceAll("\\", "/"),
      stripFileSystemProviderPrefix(filePath).replaceAll("\\", "/"),
      createSingleEditDiffConfig(filePath).replaceAll("\\", "/"),
    ]) {
      _.add(P);
      if (P.includes("`")) _.add(unescapePsDoubleQuoted(P));
      if (P.includes("::")) {
        let sliced = P.slice(P.indexOf("::") + 2);
        _.add(sliced);
        if (sliced.includes("`")) _.add(unescapePsDoubleQuoted(sliced));
      }
    }
    for (let P of _) {
      let k = checkDenyRuleForGuessedPath(P, cwd, toolPermissionContext, operationType);
      if (k)
        return {
          allowed: false,
          resolvedPath: k.resolvedPath,
          decisionReason: {
            type: "rule",
            rule: k.rule,
          },
        };
    }
  }
  let y = (resolvedPath) => ({
    allowed: false,
    resolvedPath,
    decisionReason: {
      type: "other",
      reason: "Paths containing quote characters cannot be statically validated and require manual approval",
    },
  });
  let normalizedPath = expandTilde(cleanPath).replaceAll("\\", "/");
  if (/^~[^/]/.test(normalizedPath))
    return {
      allowed: false,
      resolvedPath: normalizedPath,
      decisionReason: {
        type: "other",
        reason: "Paths beginning with ~user cannot be statically validated and require manual approval",
      },
    };
  if (normalizedPath.includes("`")) {
    let backtickStripped = unescapePsDoubleQuoted(normalizedPath);
    let denyHit = checkDenyRuleForGuessedPath(backtickStripped, cwd, toolPermissionContext, operationType);
    if (denyHit)
      return {
        allowed: false,
        resolvedPath: denyHit.resolvedPath,
        decisionReason: {
          type: "rule",
          rule: denyHit.rule,
        },
      };
    return {
      allowed: false,
      resolvedPath: normalizedPath,
      decisionReason: {
        type: "other",
        reason:
          "Backtick escape characters in paths cannot be statically validated and require manual approval",
      },
    };
  }
  if (normalizedPath.includes("::")) {
    let afterProvider = normalizedPath.slice(normalizedPath.indexOf("::") + 2);
    let denyHit = checkDenyRuleForGuessedPath(afterProvider, cwd, toolPermissionContext, operationType);
    if (denyHit)
      return {
        allowed: false,
        resolvedPath: denyHit.resolvedPath,
        decisionReason: {
          type: "rule",
          rule: denyHit.rule,
        },
      };
    return {
      allowed: false,
      resolvedPath: normalizedPath,
      decisionReason: {
        type: "other",
        reason:
          "Module-qualified provider paths (::) cannot be statically validated and require manual approval",
      },
    };
  }
  if (getPlatform() === "windows" && /^[a-z]:(?![/\\])/i.test(normalizedPath))
    return {
      allowed: false,
      resolvedPath: normalizedPath,
      decisionReason: {
        type: "other",
        reason: `Path '${g ? filePath : normalizedPath}' is drive-relative (resolves against the per-drive current directory, which cannot be statically validated) and requires manual approval`,
      },
    };
  normalizedPath = normalizeWindowsPathCase(normalizedPath);
  if (
    isUncOrDevicePath(normalizedPath) ||
    /DavWWWRoot/i.test(normalizedPath) ||
    /@SSL@/i.test(normalizedPath)
  )
    return {
      allowed: false,
      resolvedPath: normalizedPath,
      decisionReason: {
        type: "other",
        reason: "UNC paths are blocked because they can trigger network requests and credential leakage",
      },
    };
  if (normalizedPath.includes("$") || normalizedPath.includes("%"))
    return {
      allowed: false,
      resolvedPath: normalizedPath,
      decisionReason: {
        type: "other",
        reason: "Variable expansion syntax in paths requires manual approval",
      },
    };
  if ((getPlatform() === "windows" ? /^[a-z0-9]{2,}:/i : /^[a-z0-9]+:/i).test(normalizedPath))
    return {
      allowed: false,
      resolvedPath: normalizedPath,
      decisionReason: {
        type: "other",
        reason: `Path '${g ? filePath : normalizedPath}' uses a non-filesystem provider and requires manual approval`,
      },
    };
  if (hasInteriorDotDot(normalizedPath)) {
    let _ = checkDenyRuleForGuessedPath(normalizedPath, cwd, toolPermissionContext, operationType);
    if (_)
      return {
        allowed: false,
        resolvedPath: _.resolvedPath,
        decisionReason: {
          type: "rule",
          rule: _.rule,
        },
      };
    return {
      allowed: false,
      resolvedPath: resolve(cwd, normalizedPath),
      decisionReason: {
        type: "other",
        reason:
          "Path contains '..' traversal after a directory segment, which may follow a symlink outside the working directory",
      },
    };
  }
  if (firstGlobCharIndex(normalizedPath) !== -1) {
    if (operationType === "write" || operationType === "create")
      return {
        allowed: false,
        resolvedPath: normalizedPath,
        decisionReason: {
          type: "other",
          reason: "Glob patterns are not allowed in write operations. Please specify an exact file path.",
        },
      };
    if (containsPathTraversal(normalizedPath)) {
      let absolutePath = isAbsolute(normalizedPath) ? normalizedPath : resolve(cwd, normalizedPath);
      let { resolvedPath } = safeResolvePath(getFsImplementation(), absolutePath);
      let H = operationType === "read" ? "read" : "edit";
      for (let R of getPathsForPermissionCheck(resolvedPath)) {
        let G = matchingRuleForInput(R, toolPermissionContext, H, "deny");
        if (G !== null)
          return {
            allowed: false,
            resolvedPath,
            decisionReason: {
              type: "rule",
              rule: G,
            },
          };
      }
      if (g) return y(resolvedPath);
      return {
        allowed: false,
        resolvedPath,
        decisionReason: {
          type: "other",
          reason:
            "Glob patterns in paths cannot be statically validated \u2014 symlinks inside the glob expansion are not examined. Requires manual approval.",
        },
      };
    }
    let basePath = getGlobBaseDirectory(normalizedPath);
    let absoluteBasePath = isAbsolute(basePath) ? basePath : resolve(cwd, basePath);
    let { resolvedPath } = safeResolvePath(getFsImplementation(), absoluteBasePath);
    let denyRule = matchingRuleForInput(
      resolvedPath,
      toolPermissionContext,
      operationType === "read" ? "read" : "edit",
      "deny",
    );
    if (denyRule !== null)
      return {
        allowed: false,
        resolvedPath,
        decisionReason: {
          type: "rule",
          rule: denyRule,
        },
      };
    return {
      allowed: false,
      resolvedPath,
      decisionReason: {
        type: "other",
        reason:
          "Glob patterns in paths cannot be statically validated \u2014 symlinks inside the glob expansion are not examined. Requires manual approval.",
      },
    };
  }
  let S = isAbsolute(normalizedPath) ? normalizedPath : resolve(cwd, normalizedPath);
  let { resolvedPath, ...x } = validateResolvedOperand(S, toolPermissionContext, operationType);
  if (g && x.allowed) return y(resolvedPath);
  if (g && !x.allowed && x.decisionReason?.type === "safetyCheck")
    return {
      allowed: false,
      resolvedPath,
      decisionReason: {
        type: "safetyCheck",
        reason: `Path '${filePath}' resolves near a sensitive file under quote-stripping and cannot be statically validated; requires manual approval`,
        classifierApprovable: false,
      },
    };
  return {
    ...x,
    resolvedPath,
  };
}
//@ chunk-v0yfsee9.js:46978-47149 layout = getGlobBaseDirectory (1)
function getGlobBaseDirectory(filePath) {
  let globMatch = firstGlobCharIndex(filePath);
  if (globMatch === -1) return filePath;
  let beforeGlob = filePath.substring(0, globMatch);
  let lastSepIndex = Math.max(beforeGlob.lastIndexOf("/"), beforeGlob.lastIndexOf("\\"));
  if (lastSepIndex === -1) return ".";
  return beforeGlob.substring(0, lastSepIndex + 1) || "/";
}
//@ chunk-v0yfsee9.js:47149-47323 layout
/**
 * 只读类路径 cmdlet 集合（get-childitem、resolve-path、test-path 等）。
 */
var VALIDATABLE_ELEMENT_TYPES = new Set(["StringConstant", "Parameter"]);
var READ_ONLY_PATH_CMDLETS = new Set([
  "get-childitem",
  "get-item",
  "get-itemproperty",
  "resolve-path",
  "convert-path",
  "get-filehash",
  "get-acl",
  "test-path",
]);
//@ chunk-v0yfsee9.js:47323-48577 fingerprint = extractPathsFromCommand (0.595)
/**
 * 按 CMDLET_PATH_CONFIG 从 cmdlet 参数中提取路径：识别参数缩写、冒号绑定值、位置参数，标记无法验证的参数（变量、表达式）与可选写入。
 */
function extractPathsFromCommand(cmd) {
  let canonical = resolveToCanonical(cmd.name);
  let config = getOwn(CMDLET_PATH_CONFIG, canonical);
  if (!config)
    return {
      paths: [],
      operationType: "read",
      hasUnvalidatablePathArg: false,
      optionalWrite: false,
    };
  let paramCategories = getParamCategories(config);
  let paths = [];
  let { args, elementTypes } = cmd;
  let hasUnvalidatablePathArg = false;
  let positionalsSeen = 0;
  let positionalSkip = config.positionalSkip ?? 0;
  function checkArgElementType(argIdx) {
    if (!elementTypes) return;
    let x = elementTypes[argIdx + 1];
    if (x && !VALIDATABLE_ELEMENT_TYPES.has(x)) hasUnvalidatablePathArg = true;
  }
  for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    if (!arg) continue;
    let argElementType = elementTypes ? elementTypes[i + 1] : undefined;
    if (isPowerShellParameter(arg, argElementType)) {
      let normalized = "-" + arg.slice(1);
      let colonIdx = normalized.indexOf(":", 1);
      let paramLower = (colonIdx > 0 ? normalized.substring(0, colonIdx) : normalized).toLowerCase();
      let z = classifyParamAbbreviation(paramLower, paramCategories);
      if (z === "path") {
        let value;
        if (colonIdx > 0) {
          let rawValue = arg.substring(colonIdx + 1);
          if (hasComplexColonValue(rawValue)) hasUnvalidatablePathArg = true;
          value = skipPsLeadingSpaceAndComments(rawValue);
        } else {
          let nextVal = args[i + 1];
          let nextType = elementTypes ? elementTypes[i + 2] : undefined;
          if (nextVal && !isPowerShellParameter(nextVal, nextType)) {
            value = nextVal;
            checkArgElementType(i + 1);
            i++;
          }
        }
        if (value) paths.push(value);
      } else if (z === "leafOnly") {
        let value;
        if (colonIdx > 0) {
          let rawValue = arg.substring(colonIdx + 1);
          if (hasComplexColonValue(rawValue)) hasUnvalidatablePathArg = true;
          value = skipPsLeadingSpaceAndComments(rawValue);
        } else {
          let nextVal = args[i + 1];
          let nextType = elementTypes ? elementTypes[i + 2] : undefined;
          if (nextVal && !isPowerShellParameter(nextVal, nextType)) {
            value = nextVal;
            checkArgElementType(i + 1);
            i++;
          }
        }
        if (value !== undefined)
          if (value.includes("/") || value.includes("\\") || value === "." || value === "..")
            hasUnvalidatablePathArg = true;
          else paths.push(value);
      } else if (z === "switch");
      else if (z === "value") {
        if (colonIdx > 0) {
          if (hasComplexColonValue(arg.substring(colonIdx + 1))) hasUnvalidatablePathArg = true;
        } else {
          let nextArg = args[i + 1];
          let nextArgType = elementTypes ? elementTypes[i + 2] : undefined;
          if (nextArg && !isPowerShellParameter(nextArg, nextArgType)) {
            checkArgElementType(i + 1);
            i++;
          }
        }
      } else {
        hasUnvalidatablePathArg = true;
        {
          let W = args[i + 1];
          let H = elementTypes ? elementTypes[i + 2] : undefined;
          if (W && !isPowerShellParameter(W, H)) paths.push(W);
        }
        if (colonIdx > 0) {
          let rawValue = arg.substring(colonIdx + 1);
          paths.push(skipPsLeadingSpaceAndComments(rawValue));
        }
      }
      continue;
    }
    if (positionalsSeen < positionalSkip) {
      positionalsSeen++;
      continue;
    }
    positionalsSeen++;
    checkArgElementType(i);
    paths.push(arg);
  }
  return {
    paths,
    operationType: config.operationType,
    hasUnvalidatablePathArg,
    optionalWrite: config.optionalWrite ?? false,
  };
}
//@ chunk-v0yfsee9.js:48577-48932 fingerprint = checkPathConstraints (0.962)
/**
 * PowerShell 路径约束：逐条语句检查，deny 立即返回，优先返回安全检查类 ask。
 */
function checkPathConstraints(input, parsed, toolPermissionContext, compoundCommandHasCd = false) {
  if (!parsed.valid)
    return {
      behavior: "passthrough",
      message: "Cannot validate paths for unparsed command",
    };
  let firstAsk;
  let g;
  for (let statement of parsed.statements) {
    let result = checkPathConstraintsForStatement(statement, toolPermissionContext, compoundCommandHasCd);
    if (result.behavior === "deny") return result;
    if (result.behavior === "ask") {
      firstAsk ??= result;
      if (isOutsideReadsBlockedAsk(result.decisionReason)) g ??= result;
    }
  }
  return (
    g ??
    firstAsk ?? {
      behavior: "passthrough",
      message: "All path constraints validated successfully",
    }
  );
}
//@ chunk-v0yfsee9.js:48932-50520 sole-consumer
/**
 * 读封锁开启时检查外部程序（含内联代码解释器、cmd /c）的参数路径：内联代码直接拒绝，变量/表达式参数要求确认，路径命中 deny 规则拒绝，读出工作目录则 ask。
 */
function checkNativeCommandReads(command, cwd, permissionContext, hasCd) {
  let m = resolveToCanonical(command.name);
  let elementTypes = command.elementTypes;
  let replaced = command.name
    .slice(Math.max(command.name.lastIndexOf("\\"), command.name.lastIndexOf("/")) + 1)
    .replace(/\.exe$/i, "")
    .replace(/[\d.]+$/, "");
  let w =
    INLINE_CODE_FLAGS.get(replaced) ?? (replaced.toLowerCase() === "cmd" ? new Set(["/c", "/k"]) : undefined);
  if (
    w !== undefined &&
    command.args.some((arg) => {
      let lower = arg.toLowerCase();
      return [...w].some((v) => lower === v.toLowerCase() || lower.startsWith(v.toLowerCase() + "="));
    })
  )
    return outsideReadsTooComplexAsk(`${m} runs inline code, which cannot be checked against the read block`);
  let runtimeAsk;
  for (let j = 0; j < command.args.length; j++) {
    let S = command.args[j];
    let v = elementTypes ? elementTypes[j + 1] : undefined;
    if (v !== undefined && v !== "StringConstant" && v !== "Parameter") {
      runtimeAsk ??= outsideReadsRuntimePathAsk(m);
      continue;
    }
    if (S === "") continue;
    let index = S.indexOf(":");
    let index_2 = S.indexOf("=");
    let P =
      index > 0 && /^[-/][A-Za-z]+$/.test(S.slice(0, index))
        ? S.slice(index + 1)
        : index_2 > 0 && /^--?[A-Za-z][A-Za-z-]*$/.test(S.slice(0, index_2))
          ? S.slice(index_2 + 1)
          : undefined;
    if (P !== undefined && P.includes("$")) {
      runtimeAsk ??= outsideReadsRuntimePathAsk(m);
      continue;
    }
    if (isUncOrDevicePath(S)) {
      runtimeAsk ??= outsideReadsRuntimePathAsk(m);
      continue;
    }
    if (P === undefined && isPowerShellParameter(S, v)) continue;
    for (let k of P !== undefined ? [P] : [S]) {
      if (k === "") continue;
      if (k.startsWith("~") && k !== "~" && !/^~[\\/]/.test(k)) {
        runtimeAsk ??= outsideReadsRuntimePathAsk(m);
        continue;
      }
      let D = expandTilde(k);
      if (hasCd && !isAbsolute(D)) {
        runtimeAsk ??= outsideReadsRuntimePathAsk(m);
        continue;
      }
      let V = k;
      let z = firstGlobCharIndex(D);
      if (z !== -1) {
        let sliced = D.slice(0, z);
        V = /[\\/]$/.test(sliced) ? sliced : dirname(sliced);
      }
      let W = expandTilde(V);
      if (isUncOrDevicePath(W)) {
        runtimeAsk ??= outsideReadsRuntimePathAsk(m);
        continue;
      }
      let H = isAbsolute(W) ? W : resolve(cwd, W);
      if (!hasInteriorDotDot(W.replaceAll("\\", "/")) && !getFsImplementation().existsSync(H)) continue;
      let R = validatePath(V, cwd, permissionContext, "read");
      if (R.allowed) continue;
      if (R.decisionReason?.type === "rule")
        return {
          behavior: "deny",
          message: `${m} targeting '${R.resolvedPath}' was blocked by a deny rule`,
          decisionReason: R.decisionReason,
        };
      if (isOutsideReadsBlockedAsk(R.decisionReason)) {
        runtimeAsk ??= askOutsideReadBlock(
          m,
          R.decisionReason,
          isUnchangedByBasicNormalize(V) ? R.resolvedPath : undefined,
        );
        continue;
      }
      runtimeAsk ??= outsideReadsRuntimePathAsk(m);
    }
  }
  return runtimeAsk;
}
//@ chunk-v0yfsee9.js:50520-50839 sole-consumer = isItemTypeParamAbbrev (0.791)
/**
 * New-Item 参数中是否同时有 -ItemType *link/junction 与 -Value（创建链接到指定目标）。
 */
function isItemTypeParamAbbrev_2(cmd) {
  let n = false;
  let r = false;
  for (let i = 0; i < cmd.length; i++) {
    let lower = cmd[i].toLowerCase();
    let colonIdx = lower.indexOf(":");
    let w = colonIdx > 0 ? lower.slice(0, colonIdx) : lower;
    let h = colonIdx > 0 ? lower.slice(colonIdx + 1) : (cmd[i + 1] ?? "").toLowerCase();
    if (w.length >= 2 && ("-itemtype".startsWith(w) || "-type".startsWith(w)) && /link|junction/.test(h))
      n = true;
    if (w.length >= 2 && "-value".startsWith(w)) r = true;
  }
  return n && r;
}
//@ chunk-v0yfsee9.js:50968-51261 affinity
function askOutsideReadBlock(canonical, decisionReason, blockedPath) {
  return {
    behavior: "ask",
    message: `${canonical} names a path outside the working directories, which the read block does not allow without asking (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.`,
    blockedPath,
    decisionReason,
  };
}
//@ chunk-v0yfsee9.js:51261-58675 fingerprint = checkPathConstraintsForStatement (0.91)
/**
 * 单条 PowerShell 语句的路径约束：cd 复合命令要询问；对每个命令提取路径并校验（读封锁、git 安全相关写 cmdlet、受保护删除路径、cmd /c 删除、管道/嵌套命令、重定向目标），返回 deny/ask/passthrough。
 */
function checkPathConstraintsForStatement(statement, toolPermissionContext, compoundCommandHasCd = false) {
  let cwd = getCwd();
  let firstAsk;
  let g;
  let y = toolPermissionContext.blockReadsOutsideWorkingDirectories === true;
  let w = (canonical, operationType) =>
    y && (operationType === "read" || GIT_SAFETY_WRITE_CMDLETS.has(canonical));
  if (compoundCommandHasCd)
    firstAsk = {
      behavior: "ask",
      message:
        "Compound command changes working directory (Set-Location/Push-Location/Pop-Location/New-PSDrive) \u2014 relative paths cannot be validated against the original cwd and require manual approval",
      decisionReason: {
        type: "other",
        reason:
          "Compound command contains cd with path operation \u2014 manual approval required to prevent path resolution bypass",
      },
    };
  let hasExpressionPipelineSource = false;
  let O;
  let S = false;
  for (let cmd of statement.commands) {
    if (cmd.elementType !== "CommandAst") {
      hasExpressionPipelineSource = true;
      O = cmd.text;
      continue;
    }
    let { paths, operationType, hasUnvalidatablePathArg, optionalWrite } = extractPathsFromCommand(cmd);
    let canonical = resolveToCanonical(cmd.name);
    let V = getOwn(CMDLET_PATH_CONFIG, canonical) !== undefined;
    let z = checkCmdRemovalOfProtectedPath(cmd, cwd, compoundCommandHasCd);
    if (z !== undefined) return z;
    if (y && !V) {
      let denyHit = checkNativeCommandReads(cmd, cwd, toolPermissionContext, compoundCommandHasCd);
      if (denyHit?.behavior === "deny") return denyHit;
      g ??= denyHit;
    }
    if (y && canonical === "new-item" && isItemTypeParamAbbrev_2(cmd.args))
      g ??= outsideReadsRuntimePathAsk(canonical);
    let W = S;
    if (!READ_ONLY_PATH_CMDLETS.has(canonical)) S = true;
    if (hasExpressionPipelineSource) {
      let canonical_2 = resolveToCanonical(cmd.name);
      if (O !== undefined) {
        let G = new Set();
        for (let B of [
          O,
          stripPsParameterPrefix(O),
          stripFileSystemProviderPrefix(O),
          createSingleEditDiffConfig(O),
        ]) {
          G.add(B);
          if (B.includes("`")) G.add(unescapePsDoubleQuoted(B));
          if (B.includes("::")) {
            let sliced = B.slice(B.indexOf("::") + 2);
            G.add(sliced);
            if (sliced.includes("`")) G.add(unescapePsDoubleQuoted(sliced));
          }
        }
        for (let B of G) {
          let denyHit = checkDenyRuleForGuessedPath(B, cwd, toolPermissionContext, operationType);
          if (denyHit)
            return {
              behavior: "deny",
              message: `${canonical_2} targeting '${denyHit.resolvedPath}' was blocked by a deny rule`,
              decisionReason: {
                type: "rule",
                rule: denyHit.rule,
              },
            };
        }
      }
      firstAsk ??= {
        behavior: "ask",
        message: `${canonical_2} receives its path from a pipeline expression source that cannot be statically validated and requires manual approval`,
      };
      if (w(canonical, operationType)) g ??= outsideReadsRuntimePathAsk(canonical);
    }
    if (hasUnvalidatablePathArg) {
      let canonical_2 = resolveToCanonical(cmd.name);
      firstAsk ??= {
        behavior: "ask",
        message: `${canonical_2} uses a parameter or complex path expression (array literal, subexpression, unknown parameter, etc.) that cannot be statically validated and requires manual approval`,
      };
      if (w(canonical, operationType)) g ??= outsideReadsRuntimePathAsk(canonical);
    }
    if (operationType !== "read" && !optionalWrite && paths.length === 0 && V) {
      firstAsk ??= {
        behavior: "ask",
        message: `${canonical} is a write operation but no target path could be determined; requires manual approval`,
      };
      continue;
    }
    if (W && V) {
      firstAsk ??= {
        behavior: "ask",
        message: `${canonical} may receive a path from an upstream pipeline command whose output cannot be statically validated and requires manual approval`,
      };
      if (w(canonical, operationType)) g ??= outsideReadsRuntimePathAsk(canonical);
    }
    let H = resolveToCanonical(cmd.name) === "remove-item";
    if (H) {
      if (
        cmd.args.some((arg) => {
          let lower = (arg.length > 0 ? "-" + arg.slice(1) : arg).toLowerCase();
          let index = lower.indexOf(":");
          let X = index > 0 ? lower.slice(0, index) : lower;
          return X.length >= 2 && "-recurse".startsWith(X);
        })
      ) {
        let G = normalizeCaseForComparison(cwd);
        for (let filePath of paths) {
          let replaced = expandTilde(normalizeWindowsPathCase(filePath)).replace(/\\/g, "/");
          let X = isAbsolute(replaced) ? resolve(replaced) : resolve(cwd, replaced);
          let te = normalizeCaseForComparison(X);
          if (te === G || G.startsWith(te + "/") || G.startsWith(te + "\\")) {
            firstAsk ??= {
              behavior: "ask",
              message: `Remove-Item -Recurse targeting '${filePath}' would delete the working directory including .git and .claude \u2014 requires manual approval`,
            };
            break;
          }
        }
      }
    }
    if (
      compoundCommandHasCd &&
      w(canonical, operationType) &&
      paths.some((path) => !isAbsolute(expandTilde(path)))
    )
      g ??= outsideReadsRuntimePathAsk(canonical);
    for (let path of paths) {
      if (H && isDangerousRemovalPath(path)) return dangerousRemovalDeny(path);
      let { allowed, resolvedPath, decisionReason } = validatePath(
        path,
        cwd,
        toolPermissionContext,
        operationType,
      );
      if (operationType !== "read" && w(canonical, operationType)) {
        let X = validatePath(path, cwd, toolPermissionContext, "read");
        if (!X.allowed && X.decisionReason?.type === "rule")
          return {
            behavior: "deny",
            message: `${canonical} targeting '${X.resolvedPath}' was blocked by a deny rule`,
            decisionReason: X.decisionReason,
          };
        if (!X.allowed && isOutsideReadsBlockedAsk(X.decisionReason))
          g ??= askOutsideReadBlock(
            canonical,
            X.decisionReason,
            isUnchangedByBasicNormalize(path) ? X.resolvedPath : undefined,
          );
      }
      if (H && isDangerousRemovalPath_2(resolvedPath)) return dangerousRemovalDeny(resolvedPath);
      if (H) {
        let dangerousRemovalPath = resolveDangerousRemovalPath(path, cwd);
        if (dangerousRemovalPath !== null) return dangerousRemovalDeny(dangerousRemovalPath);
      }
      if (!allowed) {
        let canonical = resolveToCanonical(cmd.name);
        let workingDirs = Array.from(allWorkingDirectories(toolPermissionContext));
        let dirListStr = formatDirectoryList(workingDirs);
        let message =
          decisionReason?.type === "other" || decisionReason?.type === "safetyCheck"
            ? decisionReason.reason
            : `${canonical} targeting '${isUnchangedByBasicNormalize(path) ? resolvedPath : path}' was blocked. For security, Claude Code may only access files in the allowed working directories for this session: ${dirListStr}.`;
        if (decisionReason?.type === "rule")
          return {
            behavior: "deny",
            message,
            decisionReason,
          };
        let suggestions = [];
        if (resolvedPath && isUnchangedByBasicNormalize(path))
          if (operationType === "read") {
            let suggestion = createReadRuleSuggestion(getDirectoryForPath(resolvedPath), "session");
            if (suggestion) suggestions.push(suggestion);
          } else
            suggestions.push({
              type: "addDirectories",
              directories: [getDirectoryForPath(resolvedPath)],
              destination: "session",
            });
        if (
          isUnchangedByBasicNormalize(path) &&
          (operationType === "write" || operationType === "create") &&
          acceptEditsSuggestionApplies(toolPermissionContext)
        )
          suggestions.push({
            type: "setMode",
            mode: "acceptEdits",
            destination: "session",
          });
        let he = {
          behavior: "ask",
          message,
          blockedPath: isUnchangedByBasicNormalize(path) ? resolvedPath : undefined,
          decisionReason,
          suggestions,
        };
        firstAsk ??= he;
        if (isOutsideReadsBlockedAsk(decisionReason)) g ??= he;
      }
    }
  }
  if (statement.nestedCommands)
    for (let cmd of statement.nestedCommands) {
      let { paths, operationType, hasUnvalidatablePathArg, optionalWrite } = extractPathsFromCommand(cmd);
      let canonical = resolveToCanonical(cmd.name);
      let V = checkCmdRemovalOfProtectedPath(cmd, cwd, compoundCommandHasCd);
      if (V !== undefined) return V;
      if (hasUnvalidatablePathArg) {
        firstAsk ??= {
          behavior: "ask",
          message: `${canonical} uses a parameter or complex path expression (array literal, subexpression, unknown parameter, etc.) that cannot be statically validated and requires manual approval`,
        };
        if (w(canonical, operationType)) g ??= outsideReadsRuntimePathAsk(canonical);
      }
      if (
        operationType !== "read" &&
        !optionalWrite &&
        paths.length === 0 &&
        getOwn(CMDLET_PATH_CONFIG, canonical) !== undefined
      ) {
        firstAsk ??= {
          behavior: "ask",
          message: `${canonical} is a write operation but no target path could be determined; requires manual approval`,
        };
        continue;
      }
      let z = resolveToCanonical(cmd.name) === "remove-item";
      for (let filePath of paths) {
        if (z && isDangerousRemovalPath(filePath)) return dangerousRemovalDeny(filePath);
        let { allowed, resolvedPath, decisionReason } = validatePath(
          filePath,
          cwd,
          toolPermissionContext,
          operationType,
        );
        if (operationType !== "read" && w(canonical, operationType)) {
          let B = validatePath(filePath, cwd, toolPermissionContext, "read");
          if (!B.allowed && B.decisionReason?.type === "rule")
            return {
              behavior: "deny",
              message: `${canonical} targeting '${B.resolvedPath}' was blocked by a deny rule`,
              decisionReason: B.decisionReason,
            };
          if (!B.allowed && isOutsideReadsBlockedAsk(B.decisionReason))
            g ??= askOutsideReadBlock(
              canonical,
              B.decisionReason,
              isUnchangedByBasicNormalize(filePath) ? B.resolvedPath : undefined,
            );
        }
        if (z && isDangerousRemovalPath_2(resolvedPath)) return dangerousRemovalDeny(resolvedPath);
        if (z) {
          let dangerousRemovalPath = resolveDangerousRemovalPath(filePath, cwd);
          if (dangerousRemovalPath !== null) return dangerousRemovalDeny(dangerousRemovalPath);
        }
        if (!allowed) {
          let canonical = resolveToCanonical(cmd.name);
          let workingDirs = Array.from(allWorkingDirectories(toolPermissionContext));
          let dirListStr = formatDirectoryList(workingDirs);
          let message =
            decisionReason?.type === "other" || decisionReason?.type === "safetyCheck"
              ? decisionReason.reason
              : `${canonical} targeting '${isUnchangedByBasicNormalize(filePath) ? resolvedPath : filePath}' was blocked. For security, Claude Code may only access files in the allowed working directories for this session: ${dirListStr}.`;
          if (decisionReason?.type === "rule")
            return {
              behavior: "deny",
              message,
              decisionReason,
            };
          let suggestions = [];
          if (resolvedPath && isUnchangedByBasicNormalize(filePath))
            if (operationType === "read") {
              let suggestion = createReadRuleSuggestion(getDirectoryForPath(resolvedPath), "session");
              if (suggestion) suggestions.push(suggestion);
            } else
              suggestions.push({
                type: "addDirectories",
                directories: [getDirectoryForPath(resolvedPath)],
                destination: "session",
              });
          if (
            isUnchangedByBasicNormalize(filePath) &&
            (operationType === "write" || operationType === "create") &&
            acceptEditsSuggestionApplies(toolPermissionContext)
          )
            suggestions.push({
              type: "setMode",
              mode: "acceptEdits",
              destination: "session",
            });
          let de = {
            behavior: "ask",
            message,
            blockedPath: isUnchangedByBasicNormalize(filePath) ? resolvedPath : undefined,
            decisionReason,
            suggestions,
          };
          firstAsk ??= de;
          if (isOutsideReadsBlockedAsk(decisionReason)) g ??= de;
        }
      }
      if (hasExpressionPipelineSource)
        firstAsk ??= {
          behavior: "ask",
          message: `${resolveToCanonical(cmd.name)} appears inside a control-flow or chain statement where piped expression sources cannot be statically validated and requires manual approval`,
        };
    }
  if (statement.nestedCommands) {
    for (let cmd of statement.nestedCommands)
      if (cmd.redirections)
        for (let redir of cmd.redirections) {
          if (redir.isMerging) continue;
          if (!redir.target) continue;
          if (isNullRedirectionTarget(redir.target)) continue;
          let { allowed, resolvedPath, decisionReason } = validatePath(
            redir.target,
            cwd,
            toolPermissionContext,
            "create",
          );
          if (!allowed) {
            let workingDirs = Array.from(allWorkingDirectories(toolPermissionContext));
            let dirListStr = formatDirectoryList(workingDirs);
            let message =
              decisionReason?.type === "other" || decisionReason?.type === "safetyCheck"
                ? decisionReason.reason
                : `Output redirection to '${isUnchangedByBasicNormalize(redir.target) ? resolvedPath : redir.target}' was blocked. For security, Claude Code may only write to files in the allowed working directories for this session: ${dirListStr}.`;
            if (decisionReason?.type === "rule")
              return {
                behavior: "deny",
                message,
                decisionReason,
              };
            firstAsk ??= {
              behavior: "ask",
              message,
              blockedPath: isUnchangedByBasicNormalize(redir.target) ? resolvedPath : undefined,
              decisionReason,
              suggestions: isUnchangedByBasicNormalize(redir.target)
                ? [
                    {
                      type: "addDirectories",
                      directories: [getDirectoryForPath(resolvedPath)],
                      destination: "session",
                    },
                  ]
                : [],
            };
          }
        }
  }
  if (statement.redirections)
    for (let redir of statement.redirections) {
      if (redir.isMerging) continue;
      if (!redir.target) continue;
      if (isNullRedirectionTarget(redir.target)) continue;
      let { allowed, resolvedPath, decisionReason } = validatePath(
        redir.target,
        cwd,
        toolPermissionContext,
        "create",
      );
      if (!allowed) {
        let workingDirs = Array.from(allWorkingDirectories(toolPermissionContext));
        let dirListStr = formatDirectoryList(workingDirs);
        let message =
          decisionReason?.type === "other" || decisionReason?.type === "safetyCheck"
            ? decisionReason.reason
            : `Output redirection to '${isUnchangedByBasicNormalize(redir.target) ? resolvedPath : redir.target}' was blocked. For security, Claude Code may only write to files in the allowed working directories for this session: ${dirListStr}.`;
        if (decisionReason?.type === "rule")
          return {
            behavior: "deny",
            message,
            decisionReason,
          };
        firstAsk ??= {
          behavior: "ask",
          message,
          blockedPath: isUnchangedByBasicNormalize(redir.target) ? resolvedPath : undefined,
          decisionReason,
          suggestions: isUnchangedByBasicNormalize(redir.target)
            ? [
                {
                  type: "addDirectories",
                  directories: [getDirectoryForPath(resolvedPath)],
                  destination: "session",
                },
              ]
            : [],
        };
      }
    }
  return (
    g ??
    firstAsk ?? {
      behavior: "passthrough",
      message: "All path constraints validated successfully",
    }
  );
}
export { isDangerousRemovalPath, dangerousRemovalDeny, checkPathConstraints };
