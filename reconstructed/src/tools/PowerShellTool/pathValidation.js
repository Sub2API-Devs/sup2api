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
import { homedir, homedir as homedir_2 } from "os";
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  normalize,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  win32,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
} from "path";
import { env } from "../../utils/env.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { COMMON_SWITCHES, COMMON_VALUE_PARAMS } from "./commonParameters.js";
import { getPlatform } from "../../utils/platform.js";
import { stripTrailingDotsSpaces } from "../../utils/ignorePatterns.js";
import { skipLeadingWhitespaceAndComments, lW, oZ, gP } from "./powershellParsing.js";
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
import { normalizeDosDevicePath, Qn } from "../../utils/pathClassification.js";
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
  if (env.CLAUDE_CODE_DISABLE_POWERSHELL_CMD_RM_DENY) return !1;
  let e = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_CURIOUS_LAKE, !0);
  return !(e.value === !1 && e.source === "payload");
}
//@ chunk-v0yfsee9.js:21987-22151 sole-consumer
var CMD_RUN_SWITCH_RE = /^\/[ckr](?:$|\s)/i,
  CMD_REMOVE_VERB_RE = /^(rd|rmdir|del|erase)(?=$|[.:\\/+[\]",;=])/i,
  CMD_CD_VERB_RE = /^(?:(?:cd|chdir|pushd|popd)(?=$|[.:\\/+[\]",;=])|[a-z]:$)/i,
  Ln = /[^\S\uFEFF]|\u0085/;
/**
 * 参数是否是 cmd / cmd.exe（去掉路径与尾随点空格）。
 */
//@ chunk-v0yfsee9.js:22151-22330 affinity
function isCmdExecutableName(e) {
  let n = e.length;
  while (n > 0 && (e[n - 1] === "." || e[n - 1] === " ")) n--;
  let sliced = e.slice(Math.max(e.lastIndexOf("\\", n), e.lastIndexOf("/", n)) + 1, n);
  return /^cmd(?:\.exe)?$/i.test(sliced);
}
//@ chunk-v0yfsee9.js:22330-22447 fingerprint = SAFE_PATH_ELEMENT_TYPES (0.33)
function classifyElementType(e) {
  if (e === void 0 || e === "StringConstant") return "literal";
  return e === "ExpandableString" ? "expands" : "unknown";
}
//@ chunk-v0yfsee9.js:22447-22582 file-local
function hasUnquotedWhitespace(e) {
  let n = !1;
  for (let r = 0; r < e.length; r++) {
    let s = e[r];
    if (s === '"' && e[r - 1] !== "\\") n = !n;
    else if (!n && Ln.test(s)) return !0;
  }
  return !1;
}
//@ chunk-v0yfsee9.js:22582-22703 layout
function combineElementKinds(e, n) {
  if (e === "unknown" || n === "unknown") return "unknown";
  return e === "expands" || n === "expands" ? "expands" : "literal";
}
//@ chunk-v0yfsee9.js:22703-23207 layout
function tokenizeCmdLine(e) {
  let n = [],
    r = "",
    s = "literal",
    m = !1,
    g = 0,
    y = () => {
      if (r !== "") n.push({ text: r, kind: s, separator: !1 });
      ((r = ""), (s = "literal"));
    };
  for (let w = 0; w < e.length; w++) {
    let { ch: ch, kind: kind } = e[w];
    if (m) {
      ((r += ch), (s = combineElementKinds(s, kind)), (m = ch !== '"'));
      continue;
    }
    if (ch === "^" && w + 1 < e.length) {
      (w++, (r += e[w].ch), (s = combineElementKinds(s, combineElementKinds(kind, e[w].kind))));
      continue;
    }
    if ("&|<>".includes(ch) || (ch === "(" && r === "") || (ch === ")" && g > 0)) {
      (y(), (g += ch === "(" ? 1 : ch === ")" ? -1 : 0), n.push({ text: ch, kind: kind, separator: !0 }));
      continue;
    }
    if (/[ \t\r\n\v\f,;=]/.test(ch)) {
      y();
      continue;
    }
    if (ch === '"') m = !0;
    ((r += ch), (s = combineElementKinds(s, kind)));
  }
  return (y(), n);
}
//@ chunk-v0yfsee9.js:23207-23472 layout
function findStopParsingToken(e) {
  let n = null;
  for (let r = 0; r < e.length; r++) {
    let s = e[r];
    if (s === "`" && n !== "'") r++;
    else if (n !== null) {
      if (s === n) n = null;
    } else if (s === '"' || s === "'") n = s;
    else if (
      e.startsWith("--%", r) &&
      (r === 0 || /\s/.test(e[r - 1])) &&
      (r + 3 === e.length || /\s/.test(e[r + 3]))
    )
      return r;
  }
  return -1;
}
/**
 * 从 PowerShell 调用 cmd.exe /c|/k 的命令里还原出 cmd 实际要执行的命令字符（处理 --% 停止解析、引号、元素是否可展开）。
 */
//@ chunk-v0yfsee9.js:23472-24434 layout
function getCmdInlineCommandChars(e) {
  if (classifyElementType(e.elementTypes?.[0]) !== "literal" || !isCmdExecutableName(e.name)) return null;
  let n = findStopParsingToken(e.text),
    r = n === -1 ? void 0 : e.text.slice(n + 3).trimStart(),
    s = (S) => n !== -1 && /^--%(?:$|\s)/.test(S),
    any = e.args.some(s),
    g = [],
    y = !1;
  for (let S = 0; S < e.args.length; S++) {
    let v = e.args[S],
      x = classifyElementType(e.elementTypes?.[S + 1]);
    if (!y && r !== void 0 && !any && S === e.args.length - 1) ((y = !0), (v = r));
    if (!y && s(v)) {
      if (((y = !0), (v = v.slice(3).trimStart()), v === "")) continue;
    }
    if (y) x = "literal";
    if (v !== "" || y) g.push({ text: v, kind: x, verbatim: y });
  }
  let index = g.findIndex((S) => S.kind !== "unknown" && CMD_RUN_SWITCH_RE.test(S.text));
  if (index === -1) return null;
  let h = [];
  g.forEach((S, v) => {
    if (v < index) return;
    let x = v === index ? S.text.slice(2).trimStart() : S.text;
    if (v === index && x === "") return;
    if (h.length > 0) h.push({ ch: " ", kind: "literal" });
    let _ = !S.verbatim && v > index && hasUnquotedWhitespace(x);
    for (let P of _ ? `"${x}"` : x) h.push({ ch: P, kind: S.kind });
  });
  let index_2 = h.findIndex((S) => !/\s/.test(S.ch));
  if (index_2 !== -1 && h[index_2].ch === '"') {
    let S = -1;
    for (let v = h.length - 1; v > index_2; v--)
      if (h[v].ch === '"') {
        S = v;
        break;
      }
    h = h.filter((v, x) => x !== index_2 && x !== S);
  }
  return h;
}
/**
 * 解析 cmd /c 命令行，收集其中 rd/rmdir/del/erase 的操作数（含 start、if exist、嵌套 cmd、cd 之后的状态）。
 */
//@ chunk-v0yfsee9.js:24434-24999 layout
function extractCmdRemovalOperands(e) {
  let n = getCmdInlineCommandChars(e);
  if (n === null) return [];
  let r = new Map(),
    s = (w) => {
      let h = r.get(w);
      if (h !== void 0) return h;
      let matches = /^\$[\p{L}\p{Nd}_:]+$/u.test(w),
        S = { copies: 0, escaped: 0 };
      for (let index = e.text.indexOf(w); index !== -1; index = e.text.indexOf(w, index + 1)) {
        if (matches && /[\p{L}\p{Nd}_:]/u.test(e.text[index + w.length] ?? "")) continue;
        let x = 0;
        while (index - x > 0 && e.text[index - x - 1] === "`") x++;
        (S.copies++, (S.escaped += x % 2));
      }
      return (r.set(w, S), S);
    },
    m = (w) => {
      let { copies: copies, escaped: escaped } = s(w);
      return copies > 0 && escaped === copies;
    },
    g = (w) => s(w).escaped > 0,
    y = [];
  return (
    walkCmdRemovalCommands(tokenizeCmdLine(n), { cdSeen: !1, cdTarget: null }, !1, {
      operands: y,
      everyCopyEscaped: m,
      someCopyEscaped: g,
    }),
    y
  );
}
//@ chunk-v0yfsee9.js:24999-25008 layout
var MAX_CMD_NESTING_DEPTH = 8;
/**
 * 遍历 cmd /c 命令行 token，收集 rd/rmdir/del/erase 的操作数：跟踪 cd 状态、if exist/defined 条件、start（含 /d）、嵌套 cmd /c /k 递归（有深度上限）与重定向。
 */
//@ chunk-v0yfsee9.js:25008-27204 layout
function walkCmdRemovalCommands(tokens, cdState, inStart, sink, depth = 0) {
  let g = !0,
    y = "none",
    w = !1;
  for (let h = 0; h < tokens.length; h++) {
    let O = tokens[h];
    if (O.separator) {
      if (O.text === "<" || O.text === ">") h = skipRedirection(tokens, h);
      else if (((g = !0), (y = "none"), (w = O.text === "|"), w)) cdState.cdTarget = null;
      continue;
    }
    if (/^\d$/.test(O.text) && ["<", ">"].includes(tokens[h + 1]?.text ?? "")) continue;
    if (y === "condition") {
      let lower = O.text.toLowerCase();
      if (lower === "/i" || lower === "not") continue;
      y = lower === "exist" || lower === "defined" ? "operand" : "none";
      continue;
    }
    if (y === "operand") {
      ((y = "none"), (g = !0));
      continue;
    }
    if (!g) continue;
    let replaced = O.text.replace(/^@+/, "");
    if (!inStart && (O.kind === "unknown" || CMD_CD_VERB_RE.test(replaced)))
      ((cdState.cdSeen = !0),
        (cdState.cdTarget =
          w || O.kind === "unknown" ? null : parseCmdCdTarget({ ...O, text: replaced }, tokens, h + 1)));
    if (O.kind !== "unknown") {
      let lower = replaced.toLowerCase();
      if (lower === "call" || lower === "") continue;
      if (/^start(?=$|\/)/.test(lower) && depth < MAX_CMD_NESTING_DEPTH) {
        let k = nextSeparatorIndex(tokens, h + 1),
          matches = /\/d/.test(lower.slice(5));
        (walkCmdRemovalCommands(
          tokens.slice(h + 1, k),
          matches ? { cdSeen: !0, cdTarget: null } : { ...cdState },
          !0,
          sink,
          depth + 1,
        ),
          (h = k - 1),
          (g = !1));
        continue;
      }
      if (inStart && lower.startsWith("/d")) ((cdState.cdSeen = !0), (cdState.cdTarget = null));
      if (lower === "if") {
        ((y = "condition"), (g = !1));
        continue;
      }
      if (isCmdExecutableName(replaced.replaceAll('"', ""))) {
        let k = h + 1;
        while (k < tokens.length && !/^\/[ckr]$/i.test(tokens[k].text)) {
          let z = nextSeparatorIndex(tokens, k, k + 1);
          if (z === k) break;
          k = z;
        }
        let D = k < tokens.length && !tokens[k].separator;
        if (D && depth >= MAX_CMD_NESTING_DEPTH) {
          ((h = k), (g = !0));
          continue;
        }
        let V = nextSeparatorIndex(tokens, k);
        if (D && k + 1 < V) {
          let sliced = tokens.slice(k + 1, V);
          if (sliced[0].text.startsWith('"')) {
            let flattened = sliced.flatMap((R) => [...` ${R.text}`].map((G) => ({ ch: G, kind: R.kind })));
            flattened.splice(0, 2);
            let lastIndex = flattened.findLastIndex((R) => R.ch === '"');
            if (lastIndex !== -1) flattened.splice(lastIndex, 1);
            sliced = tokenizeCmdLine(flattened);
          }
          walkCmdRemovalCommands(sliced, { ...cdState }, !1, sink, depth + 1);
        }
        ((h = V - 1), (g = !1));
        continue;
      }
    }
    g = inStart;
    let v = O.kind === "unknown" ? null : CMD_REMOVE_VERB_RE.exec(replaced);
    if (v === null) continue;
    let x = [],
      sliced = replaced.slice(v[0].length);
    if (sliced !== "") x.push({ ...O, text: sliced });
    for (let P = h + 1; P < tokens.length; P++) {
      let k = tokens[P];
      if (!k.separator) {
        (x.push(k), (h = P));
        continue;
      }
      if (k.text !== "<" && k.text !== ">") break;
      if (/^\d$/.test(x.at(-1)?.text ?? "")) x.pop();
      ((P = skipRedirection(tokens, P)), (h = P));
    }
    for (let P of x) {
      if (P.kind === "unknown" || P.text.startsWith("/")) continue;
      let trimmed = P.text.replaceAll('"', "").trim();
      if (trimmed === "") continue;
      let D =
        P.kind === "expands"
          ? [sink.everyCopyEscaped, sink.someCopyEscaped].map((V) => stripPsVariables(trimmed, V))
          : [{ view: trimmed, literalPrefix: null }];
      for (let [V, { view: z, literalPrefix: W }] of D.entries()) {
        if (V > 0 && z === D[0].view) continue;
        sink.operands.push({
          verb: v[1].toLowerCase(),
          text: trimmed,
          emptied: W === null ? null : { view: z, literalPrefix: W },
          afterCd: cdState.cdSeen,
          ...(cdState.cdTarget !== null && { cdTarget: cdState.cdTarget }),
        });
      }
    }
  }
}
/**
 * 用给定环境展开 cmd 的 %NAME% 变量（大小写不敏感）。
 */
//@ chunk-v0yfsee9.js:27204-27382 layout
function expandCmdPercentVars(e, n) {
  if (!e.includes("%")) return e;
  let r = new Map(Object.entries(n).map(([s, m]) => [s.toLowerCase(), m]));
  return e.replace(/%([^%:]+)%/g, (s, m) => r.get(m.toLowerCase()) ?? s);
}
//@ chunk-v0yfsee9.js:27382-27947 layout
function parseCmdCdTarget(e, n, r) {
  let match = /^(cd|chdir|pushd)(?![a-z])/i.exec(e.text);
  if (match === null) return null;
  let m = r;
  while (m < n.length && !n[m].separator) m++;
  let filtered = [{ ...e, text: e.text.slice(match[0].length) }, ...n.slice(r, m)].filter(
    (h) => h.text !== "",
  );
  if (["<", ">"].includes(n[m]?.text ?? "") && /^\d$/.test(filtered.at(-1)?.text ?? "")) filtered.pop();
  if (filtered.some((h) => h.kind !== "literal")) return null;
  let y = match[1].toLowerCase() === "pushd" || filtered.some((h) => /^\/d$/i.test(h.text)),
    trimmed = filtered
      .filter((h) => !h.text.startsWith("/"))
      .map((h) => h.text.replaceAll('"', ""))
      .join(" ")
      .trim();
  return y && /^(?:[A-Za-z]:[\\/]|%)/.test(trimmed) ? trimmed : null;
}
//@ chunk-v0yfsee9.js:27947-28092 layout
function nextSeparatorIndex(e, n, r = e.length) {
  let s = n;
  while (s < r) {
    let m = e[s];
    if (!m.separator) s++;
    else if (m.text === "<" || m.text === ">") s = skipRedirection(e, s) + 1;
    else break;
  }
  return s;
}
//@ chunk-v0yfsee9.js:28092-28230 layout
function skipRedirection(e, n) {
  let r = n;
  while (e[r + 1]?.separator && ["<", ">", "&"].includes(e[r + 1].text)) r++;
  return e[r + 1] !== void 0 && !e[r + 1].separator ? r + 1 : r;
}
//@ chunk-v0yfsee9.js:28230-28444 layout
function stripPsVariables(e, n = () => !1) {
  let r = "",
    s = null,
    m = 0;
  while (m < e.length) {
    let g = e[m] === "$" ? scanPsVariableEnd(e, m) : m;
    if (g === m || n(e.slice(m, g))) {
      ((r += e.slice(m, Math.max(g, m + 1))), (m = Math.max(g, m + 1)));
      continue;
    }
    ((s ??= r), (m = g));
  }
  return { view: r, literalPrefix: s };
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
    for (let g = n + 1; g < e.length; g++)
      if (e[g] === "(") m++;
      else if (e[g] === ")" && --m === 0) return g + 1;
    return e.length;
  }
  if (r === "$" || r === "^" || r === "?") return n + 2;
  let s = n + 1;
  while (s < e.length && /[\p{L}\p{Nd}_:]/u.test(e[s])) s++;
  return s === n + 1 ? n : s;
}
/**
 * 每个 cmdlet 的路径参数配置 CMDLET_PATH_CONFIG：操作类型（read/write/create）、路径参数、仅叶名参数、已知开关和带值参数、位置参数跳过数，覆盖 Set/Add/Get-Content、Copy/Move/Remove/New-Item、Out-File、Export-*、Compress/Expand-Archive、Invoke-WebRequest 等。
 */
//@ chunk-v0yfsee9.js:28781-39050 fingerprint = CMDLET_PATH_CONFIG (0.974)
var MAX_DIRS_TO_LIST = 5,
  CMDLET_PATH_CONFIG = {
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
      optionalWrite: !0,
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
      optionalWrite: !0,
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
function getParamCategories(e) {
  return [
    ["path", e.pathParams],
    ["leafOnly", e.leafOnlyPathParams ?? []],
    ["switch", [...e.knownSwitches, ...COMMON_SWITCHES]],
    ["value", [...e.knownValueParams, ...COMMON_VALUE_PARAMS]],
  ];
}
/**
 * 把参数缩写解析到 path/leafOnly/switch/value 类别；匹配多个类别时为 ambiguous，未知为 unknown。
 */
//@ chunk-v0yfsee9.js:39213-39633 layout
function classifyParamAbbreviation(e, n) {
  let r = new Set(),
    s = new Map(),
    m = !1;
  for (let [w, h] of n)
    for (let O of h)
      if (O === e) r.add(w);
      else if (e.length > 1 && O.startsWith(e)) {
        let S = s.get(O);
        if (S !== void 0 && S !== w) m = !0;
        s.set(O, w);
      }
  if (r.size > 1) return "ambiguous";
  let g = [...r][0];
  if (g !== void 0)
    return g === "value" && (m || [...s.values()].some((h) => h !== "value")) ? "ambiguous" : g;
  if (m || s.size > 1) return "ambiguous";
  let y = [...s.values()][0];
  if (y !== void 0) return y;
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
function ot(e) {
  return skipLeadingWhitespaceAndComments(e);
}
/**
 * 冒号绑定参数的值是否复杂（引号、逗号、括号、反引号、@、$），复杂值无法静态验证。
 */
//@ chunk-v0yfsee9.js:39786-40018 file-local
function hasComplexColonValue(rawValue) {
  if (/['"\u2018-\u201F]/.test(rawValue)) return !0;
  if (rawValue.includes("\u180E")) return !0;
  let n = ot(rawValue);
  return (
    n.includes(",") ||
    n.startsWith("(") ||
    n.startsWith("[") ||
    n.includes("`") ||
    n.includes("@(") ||
    n.startsWith("@") ||
    n.includes("$")
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
    return homedir_2() + filePath.slice(1);
  return filePath;
}
/**
 * 路径（去提供程序前缀、各种拼写）是否是禁止删除的系统路径（盘根、盘根下一级、home 等）。
 */
//@ chunk-v0yfsee9.js:40268-40408 layout
function isDangerousRemovalPath(e) {
  let n = new Set([lW(e), oZ(e), createSingleEditDiffConfig(e)]);
  for (let r of n) {
    let index = r.indexOf("::");
    if ((index >= 0 && isDangerousRemovalRawPath(r.slice(index + 2))) || isDangerousRemovalRawPath(r))
      return !0;
  }
  return !1;
}
//@ chunk-v0yfsee9.js:40408-40501 file-local
function isDangerousRemovalRawPath(filePath) {
  let expanded = expandTilde(filePath).replace(/\\/g, "/"),
    r = normalizeWindowsPathCase(expanded);
  if (isAbsolute_2(r)) r = normalize(r);
  return isDangerousRemovalPath_2(r) || isDangerousRemovalPath_2(expanded);
}
//@ chunk-v0yfsee9.js:40501-40849 layout
function resolveDangerousRemovalPath(e, n) {
  let r = new Set([e, oZ(e), createSingleEditDiffConfig(e)]);
  for (let s of [...r]) {
    if (s.includes("`")) r.add(gP(s));
    if (s.includes("::")) {
      let sliced = s.slice(s.indexOf("::") + 2);
      if ((r.add(sliced), sliced.includes("`"))) r.add(gP(sliced));
    }
  }
  for (let s of r) {
    let m = normalizeWindowsPathCase(expandTilde(s).replace(/\\/g, "/"));
    if (m === "") continue;
    let g = isAbsolute_2(m) ? m : resolve_3(n, m),
      { resolvedPath: resolvedPath } = safeResolvePath(getFsImplementation(), g);
    if (isDangerousRemovalPath_2(resolvedPath)) return resolvedPath;
  }
  return null;
}
//@ chunk-v0yfsee9.js:40849-40881 layout
function ce(e) {
  return lW(e) === e;
}
/**
 * 构造"删除受保护系统路径"的 deny 结果（safetyCheck，分类器不可批准）。
 */
//@ chunk-v0yfsee9.js:40881-41126 fingerprint = dangerousRemovalDeny (0.879)
function dangerousRemovalDeny(
  e,
  n = `Remove-Item on system path '${e}' is blocked. This path is protected from removal.`,
) {
  return {
    behavior: "deny",
    message: n,
    decisionReason: {
      type: "safetyCheck",
      reason: "Removal targets a protected system path",
      classifierApprovable: !1,
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
function findProtectedRemovalTarget(e, n, r, s, m) {
  let g = stripTrailingWildcardSegment(normalizeDosDevicePath(e));
  if (isDangerousRemovalPath(g)) return { path: g, quotable: !0 };
  let y = r && !/^(?:[A-Za-z]:)?[\\/]/.test(g);
  if (!Qn(g) && !y) {
    let w = resolveDangerousRemovalPath(g, n);
    if (w !== null) return { path: w, quotable: !0 };
  }
  if (y && s !== void 0 && !/^[A-Za-z]:/.test(g))
    for (let w of new Set([s, expandCmdPercentVars(s, m)])) {
      if (!/^[A-Za-z]:[\\/]/.test(w)) continue;
      let resolved = win32.resolve(w, g);
      if (isDangerousRemovalPath(resolved)) return { path: resolved, quotable: w === s, viaCd: s };
    }
  return null;
}
/**
 * 开关 tengu_curious_lake（可用 CLAUDE_CODE_DISABLE_POWERSHELL_CMD_RM_DENY 关闭）打开时，检查 PowerShell 里通过 cmd /c 执行的 rd/del 是否删除受保护路径（考虑 %VAR%、$变量为空、cd 之后的相对路径），命中则 deny。
 */
//@ chunk-v0yfsee9.js:41743-42674 layout
function checkCmdRemovalOfProtectedPath(e, n, r) {
  if (!isCmdRmDenyEnabled()) return;
  let s = extractCmdRemovalOperands(e);
  if (s.length === 0) return;
  let m = subprocessEnv();
  for (let { verb: verb, text: text, emptied: emptied, afterCd: afterCd, cdTarget: cdTarget } of s) {
    if (emptied?.literalPrefix === "") continue;
    let S = emptied?.view ?? text;
    for (let v of new Set([S, expandCmdPercentVars(S, m)])) {
      let x = findProtectedRemovalTarget(v, n, r || afterCd, cdTarget, m);
      if (x === null) continue;
      let _ = x.quotable && v === S,
        P = x.viaCd === void 0 ? null : `after this line's cd to '${x.viaCd}'`,
        joined = (
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
          : text === x.path
            ? `cmd's ${verb} on '${x.path}' is blocked because no command may remove that path.`
            : `cmd's ${verb} on '${text}' is blocked because${joined === "" ? "" : `, ${joined},`} it targets '${x.path}', which no command may remove.`,
      );
    }
  }
  return;
}
/**
 * 对猜测出的路径拼写检查 read/edit deny 规则，返回命中的规则。
 */
//@ chunk-v0yfsee9.js:42674-42919 fingerprint = checkDenyRuleForGuessedPath (1)
function checkDenyRuleForGuessedPath(strippedPath, cwd, toolPermissionContext, operationType) {
  if (!strippedPath || strippedPath.includes("\x00")) return null;
  let tildeExpanded = expandTilde(normalizeWindowsPathCase(strippedPath)),
    g = isAbsolute_2(tildeExpanded) ? tildeExpanded : resolve_3(cwd, tildeExpanded),
    { resolvedPath: resolvedPath } = safeResolvePath(getFsImplementation(), g),
    w = operationType === "read" ? "read" : "edit";
  for (let h of getPathsForPermissionCheck(resolvedPath)) {
    let denyRule = matchingRuleForInput(h, toolPermissionContext, w, "deny");
    if (denyRule !== null) return { resolvedPath: resolvedPath, rule: denyRule };
  }
  return null;
}
/**
 * PowerShell 路径校验：对提供程序路径、反引号转义、:: 前缀等多种拼写先查 deny 规则；再按操作类型判断是否在允许的工作目录内（含读封锁、UNC、设备路径等）。
 */
//@ chunk-v0yfsee9.js:42919-46978 fingerprint = validatePath (0.794)
function validatePath(filePath, cwd, toolPermissionContext, operationType) {
  let cleanPath = lW(filePath),
    g = cleanPath !== filePath;
  if (g) {
    let _ = new Set();
    for (let P of [
      filePath.replaceAll("\\", "/"),
      oZ(filePath).replaceAll("\\", "/"),
      createSingleEditDiffConfig(filePath).replaceAll("\\", "/"),
    ]) {
      if ((_.add(P), P.includes("`"))) _.add(gP(P));
      if (P.includes("::")) {
        let sliced = P.slice(P.indexOf("::") + 2);
        if ((_.add(sliced), sliced.includes("`"))) _.add(gP(sliced));
      }
    }
    for (let P of _) {
      let k = checkDenyRuleForGuessedPath(P, cwd, toolPermissionContext, operationType);
      if (k)
        return { allowed: !1, resolvedPath: k.resolvedPath, decisionReason: { type: "rule", rule: k.rule } };
    }
  }
  let y = (_) => ({
      allowed: !1,
      resolvedPath: _,
      decisionReason: {
        type: "other",
        reason:
          "Paths containing quote characters cannot be statically validated and require manual approval",
      },
    }),
    replaced = expandTilde(cleanPath).replaceAll("\\", "/");
  if (/^~[^/]/.test(replaced))
    return {
      allowed: !1,
      resolvedPath: replaced,
      decisionReason: {
        type: "other",
        reason: "Paths beginning with ~user cannot be statically validated and require manual approval",
      },
    };
  if (replaced.includes("`")) {
    let _ = gP(replaced),
      denyHit = checkDenyRuleForGuessedPath(_, cwd, toolPermissionContext, operationType);
    if (denyHit)
      return {
        allowed: !1,
        resolvedPath: denyHit.resolvedPath,
        decisionReason: { type: "rule", rule: denyHit.rule },
      };
    return {
      allowed: !1,
      resolvedPath: replaced,
      decisionReason: {
        type: "other",
        reason:
          "Backtick escape characters in paths cannot be statically validated and require manual approval",
      },
    };
  }
  if (replaced.includes("::")) {
    let afterProvider = replaced.slice(replaced.indexOf("::") + 2),
      denyHit = checkDenyRuleForGuessedPath(afterProvider, cwd, toolPermissionContext, operationType);
    if (denyHit)
      return {
        allowed: !1,
        resolvedPath: denyHit.resolvedPath,
        decisionReason: { type: "rule", rule: denyHit.rule },
      };
    return {
      allowed: !1,
      resolvedPath: replaced,
      decisionReason: {
        type: "other",
        reason:
          "Module-qualified provider paths (::) cannot be statically validated and require manual approval",
      },
    };
  }
  if (getPlatform() === "windows" && /^[a-z]:(?![/\\])/i.test(replaced))
    return {
      allowed: !1,
      resolvedPath: replaced,
      decisionReason: {
        type: "other",
        reason: `Path '${g ? filePath : replaced}' is drive-relative (resolves against the per-drive current directory, which cannot be statically validated) and requires manual approval`,
      },
    };
  if (
    ((replaced = normalizeWindowsPathCase(replaced)),
    Qn(replaced) || /DavWWWRoot/i.test(replaced) || /@SSL@/i.test(replaced))
  )
    return {
      allowed: !1,
      resolvedPath: replaced,
      decisionReason: {
        type: "other",
        reason: "UNC paths are blocked because they can trigger network requests and credential leakage",
      },
    };
  if (replaced.includes("$") || replaced.includes("%"))
    return {
      allowed: !1,
      resolvedPath: replaced,
      decisionReason: {
        type: "other",
        reason: "Variable expansion syntax in paths requires manual approval",
      },
    };
  if ((getPlatform() === "windows" ? /^[a-z0-9]{2,}:/i : /^[a-z0-9]+:/i).test(replaced))
    return {
      allowed: !1,
      resolvedPath: replaced,
      decisionReason: {
        type: "other",
        reason: `Path '${g ? filePath : replaced}' uses a non-filesystem provider and requires manual approval`,
      },
    };
  if (hasInteriorDotDot(replaced)) {
    let _ = checkDenyRuleForGuessedPath(replaced, cwd, toolPermissionContext, operationType);
    if (_)
      return { allowed: !1, resolvedPath: _.resolvedPath, decisionReason: { type: "rule", rule: _.rule } };
    return {
      allowed: !1,
      resolvedPath: resolve_3(cwd, replaced),
      decisionReason: {
        type: "other",
        reason:
          "Path contains '..' traversal after a directory segment, which may follow a symlink outside the working directory",
      },
    };
  }
  if (firstGlobCharIndex(replaced) !== -1) {
    if (operationType === "write" || operationType === "create")
      return {
        allowed: !1,
        resolvedPath: replaced,
        decisionReason: {
          type: "other",
          reason: "Glob patterns are not allowed in write operations. Please specify an exact file path.",
        },
      };
    if (containsPathTraversal(replaced)) {
      let z = isAbsolute_2(replaced) ? replaced : resolve_3(cwd, replaced),
        { resolvedPath: resolvedPath } = safeResolvePath(getFsImplementation(), z),
        H = operationType === "read" ? "read" : "edit";
      for (let R of getPathsForPermissionCheck(resolvedPath)) {
        let G = matchingRuleForInput(R, toolPermissionContext, H, "deny");
        if (G !== null)
          return { allowed: !1, resolvedPath: resolvedPath, decisionReason: { type: "rule", rule: G } };
      }
      if (g) return y(resolvedPath);
      return {
        allowed: !1,
        resolvedPath: resolvedPath,
        decisionReason: {
          type: "other",
          reason:
            "Glob patterns in paths cannot be statically validated \u2014 symlinks inside the glob expansion are not examined. Requires manual approval.",
        },
      };
    }
    let basePath = getGlobBaseDirectory(replaced),
      P = isAbsolute_2(basePath) ? basePath : resolve_3(cwd, basePath),
      { resolvedPath: resolvedPath } = safeResolvePath(getFsImplementation(), P),
      denyRule = matchingRuleForInput(
        resolvedPath,
        toolPermissionContext,
        operationType === "read" ? "read" : "edit",
        "deny",
      );
    if (denyRule !== null)
      return { allowed: !1, resolvedPath: resolvedPath, decisionReason: { type: "rule", rule: denyRule } };
    return {
      allowed: !1,
      resolvedPath: resolvedPath,
      decisionReason: {
        type: "other",
        reason:
          "Glob patterns in paths cannot be statically validated \u2014 symlinks inside the glob expansion are not examined. Requires manual approval.",
      },
    };
  }
  let S = isAbsolute_2(replaced) ? replaced : resolve_3(cwd, replaced),
    { resolvedPath: resolvedPath, ...x } = validateResolvedOperand(S, toolPermissionContext, operationType);
  if (g && x.allowed) return y(resolvedPath);
  if (g && !x.allowed && x.decisionReason?.type === "safetyCheck")
    return {
      allowed: !1,
      resolvedPath: resolvedPath,
      decisionReason: {
        type: "safetyCheck",
        reason: `Path '${filePath}' resolves near a sensitive file under quote-stripping and cannot be statically validated; requires manual approval`,
        classifierApprovable: !1,
      },
    };
  return { ...x, resolvedPath: resolvedPath };
}
//@ chunk-v0yfsee9.js:46978-47149 layout = getGlobBaseDirectory (1)
function getGlobBaseDirectory(filePath) {
  let n = firstGlobCharIndex(filePath);
  if (n === -1) return filePath;
  let beforeGlob = filePath.substring(0, n),
    lastSepIndex = Math.max(beforeGlob.lastIndexOf("/"), beforeGlob.lastIndexOf("\\"));
  if (lastSepIndex === -1) return ".";
  return beforeGlob.substring(0, lastSepIndex + 1) || "/";
}
//@ chunk-v0yfsee9.js:47149-47323 layout
var VALIDATABLE_ELEMENT_TYPES = new Set(["StringConstant", "Parameter"]),
  Xn = new Set([
    "get-childitem",
    "get-item",
    "get-itemproperty",
    "resolve-path",
    "convert-path",
    "get-filehash",
    "get-acl",
    "test-path",
  ]);
/**
 * 按 CMDLET_PATH_CONFIG 从 cmdlet 参数中提取路径：识别参数缩写、冒号绑定值、位置参数，标记无法验证的参数（变量、表达式）与可选写入。
 */
//@ chunk-v0yfsee9.js:47323-48577 fingerprint = extractPathsFromCommand (0.595)
function extractPathsFromCommand(cmd) {
  let canonical = resolveToCanonical(cmd.name),
    r = getOwn(CMDLET_PATH_CONFIG, canonical);
  if (!r) return { paths: [], operationType: "read", hasUnvalidatablePathArg: !1, optionalWrite: !1 };
  let s = getParamCategories(r),
    paths = [],
    { args: args, elementTypes: elementTypes } = cmd,
    w = !1,
    h = 0,
    positionalSkip = r.positionalSkip ?? 0;
  function checkArgElementType(argIdx) {
    if (!elementTypes) return;
    let x = elementTypes[argIdx + 1];
    if (x && !VALIDATABLE_ELEMENT_TYPES.has(x)) w = !0;
  }
  for (let v = 0; v < args.length; v++) {
    let x = args[v];
    if (!x) continue;
    let _ = elementTypes ? elementTypes[v + 1] : void 0;
    if (isPowerShellParameter(x, _)) {
      let normalized = "-" + x.slice(1),
        colonIdx = normalized.indexOf(":", 1),
        paramLower = (colonIdx > 0 ? normalized.substring(0, colonIdx) : normalized).toLowerCase(),
        z = classifyParamAbbreviation(paramLower, s);
      if (z === "path") {
        let W;
        if (colonIdx > 0) {
          let rawValue = x.substring(colonIdx + 1);
          if (hasComplexColonValue(rawValue)) w = !0;
          W = ot(rawValue);
        } else {
          let H = args[v + 1],
            R = elementTypes ? elementTypes[v + 2] : void 0;
          if (H && !isPowerShellParameter(H, R)) ((W = H), checkArgElementType(v + 1), v++);
        }
        if (W) paths.push(W);
      } else if (z === "leafOnly") {
        let W;
        if (colonIdx > 0) {
          let rawValue = x.substring(colonIdx + 1);
          if (hasComplexColonValue(rawValue)) w = !0;
          W = ot(rawValue);
        } else {
          let H = args[v + 1],
            R = elementTypes ? elementTypes[v + 2] : void 0;
          if (H && !isPowerShellParameter(H, R)) ((W = H), checkArgElementType(v + 1), v++);
        }
        if (W !== void 0)
          if (W.includes("/") || W.includes("\\") || W === "." || W === "..") w = !0;
          else paths.push(W);
      } else if (z === "switch");
      else if (z === "value")
        if (colonIdx > 0) {
          if (hasComplexColonValue(x.substring(colonIdx + 1))) w = !0;
        } else {
          let W = args[v + 1],
            H = elementTypes ? elementTypes[v + 2] : void 0;
          if (W && !isPowerShellParameter(W, H)) (checkArgElementType(v + 1), v++);
        }
      else {
        w = !0;
        {
          let W = args[v + 1],
            H = elementTypes ? elementTypes[v + 2] : void 0;
          if (W && !isPowerShellParameter(W, H)) paths.push(W);
        }
        if (colonIdx > 0) {
          let rawValue = x.substring(colonIdx + 1);
          paths.push(ot(rawValue));
        }
      }
      continue;
    }
    if (h < positionalSkip) {
      h++;
      continue;
    }
    (h++, checkArgElementType(v), paths.push(x));
  }
  return {
    paths: paths,
    operationType: r.operationType,
    hasUnvalidatablePathArg: w,
    optionalWrite: r.optionalWrite ?? !1,
  };
}
/**
 * PowerShell 路径约束：逐条语句检查，deny 立即返回，优先返回安全检查类 ask。
 */
//@ chunk-v0yfsee9.js:48577-48932 fingerprint = checkPathConstraints (0.962)
function checkPathConstraints(input, parsed, toolPermissionContext, compoundCommandHasCd = !1) {
  if (!parsed.valid)
    return { behavior: "passthrough", message: "Cannot validate paths for unparsed command" };
  let m, g;
  for (let statement of parsed.statements) {
    let result = checkPathConstraintsForStatement(statement, toolPermissionContext, compoundCommandHasCd);
    if (result.behavior === "deny") return result;
    if (result.behavior === "ask") {
      if (((m ??= result), isOutsideReadsBlockedAsk(result.decisionReason))) g ??= result;
    }
  }
  return g ?? m ?? { behavior: "passthrough", message: "All path constraints validated successfully" };
}
/**
 * 读封锁开启时检查外部程序（含内联代码解释器、cmd /c）的参数路径：内联代码直接拒绝，变量/表达式参数要求确认，路径命中 deny 规则拒绝，读出工作目录则 ask。
 */
//@ chunk-v0yfsee9.js:48932-50520 sole-consumer
function checkNativeCommandReads(command, cwd, permissionContext, hasCd) {
  let m = resolveToCanonical(command.name),
    elementTypes = command.elementTypes,
    replaced = command.name
      .slice(Math.max(command.name.lastIndexOf("\\"), command.name.lastIndexOf("/")) + 1)
      .replace(/\.exe$/i, "")
      .replace(/[\d.]+$/, ""),
    w =
      INLINE_CODE_FLAGS.get(replaced) ?? (replaced.toLowerCase() === "cmd" ? new Set(["/c", "/k"]) : void 0);
  if (
    w !== void 0 &&
    command.args.some((arg) => {
      let lower = arg.toLowerCase();
      return [...w].some((v) => lower === v.toLowerCase() || lower.startsWith(v.toLowerCase() + "="));
    })
  )
    return outsideReadsTooComplexAsk(`${m} runs inline code, which cannot be checked against the read block`);
  let runtimeAsk;
  for (let O = 0; O < command.args.length; O++) {
    let S = command.args[O],
      v = elementTypes ? elementTypes[O + 1] : void 0;
    if (v !== void 0 && v !== "StringConstant" && v !== "Parameter") {
      runtimeAsk ??= outsideReadsRuntimePathAsk(m);
      continue;
    }
    if (S === "") continue;
    let index = S.indexOf(":"),
      index_2 = S.indexOf("="),
      P =
        index > 0 && /^[-/][A-Za-z]+$/.test(S.slice(0, index))
          ? S.slice(index + 1)
          : index_2 > 0 && /^--?[A-Za-z][A-Za-z-]*$/.test(S.slice(0, index_2))
            ? S.slice(index_2 + 1)
            : void 0;
    if (P !== void 0 && P.includes("$")) {
      runtimeAsk ??= outsideReadsRuntimePathAsk(m);
      continue;
    }
    if (Qn(S)) {
      runtimeAsk ??= outsideReadsRuntimePathAsk(m);
      continue;
    }
    if (P === void 0 && isPowerShellParameter(S, v)) continue;
    for (let k of P !== void 0 ? [P] : [S]) {
      if (k === "") continue;
      if (k.startsWith("~") && k !== "~" && !/^~[\\/]/.test(k)) {
        runtimeAsk ??= outsideReadsRuntimePathAsk(m);
        continue;
      }
      let D = expandTilde(k);
      if (hasCd && !isAbsolute_2(D)) {
        runtimeAsk ??= outsideReadsRuntimePathAsk(m);
        continue;
      }
      let V = k,
        z = firstGlobCharIndex(D);
      if (z !== -1) {
        let sliced = D.slice(0, z);
        V = /[\\/]$/.test(sliced) ? sliced : dirname_3(sliced);
      }
      let W = expandTilde(V);
      if (Qn(W)) {
        runtimeAsk ??= outsideReadsRuntimePathAsk(m);
        continue;
      }
      let H = isAbsolute_2(W) ? W : resolve_3(cwd, W);
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
        runtimeAsk ??= askOutsideReadBlock(m, R.decisionReason, ce(V) ? R.resolvedPath : void 0);
        continue;
      }
      runtimeAsk ??= outsideReadsRuntimePathAsk(m);
    }
  }
  return runtimeAsk;
}
/**
 * New-Item 参数中是否同时有 -ItemType *link/junction 与 -Value（创建链接到指定目标）。
 */
//@ chunk-v0yfsee9.js:50520-50839 sole-consumer = isItemTypeParamAbbrev (0.791)
function isItemTypeParamAbbrev_2(p) {
  let n = !1,
    r = !1;
  for (let s = 0; s < p.length; s++) {
    let lower = p[s].toLowerCase(),
      index = lower.indexOf(":"),
      w = index > 0 ? lower.slice(0, index) : lower,
      h = index > 0 ? lower.slice(index + 1) : (p[s + 1] ?? "").toLowerCase();
    if (w.length >= 2 && ("-itemtype".startsWith(w) || "-type".startsWith(w)) && /link|junction/.test(h))
      n = !0;
    if (w.length >= 2 && "-value".startsWith(w)) r = !0;
  }
  return n && r;
}
//@ chunk-v0yfsee9.js:50968-51261 affinity
function askOutsideReadBlock(e, n, r) {
  return {
    behavior: "ask",
    message: `${e} names a path outside the working directories, which the read block does not allow without asking (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.`,
    blockedPath: r,
    decisionReason: n,
  };
}
/**
 * 单条 PowerShell 语句的路径约束：cd 复合命令要询问；对每个命令提取路径并校验（读封锁、git 安全相关写 cmdlet、受保护删除路径、cmd /c 删除、管道/嵌套命令、重定向目标），返回 deny/ask/passthrough。
 */
//@ chunk-v0yfsee9.js:51261-58675 fingerprint = checkPathConstraintsForStatement (0.91)
function checkPathConstraintsForStatement(statement, toolPermissionContext, compoundCommandHasCd = !1) {
  let cwd = getCwd(),
    m,
    g,
    y = toolPermissionContext.blockReadsOutsideWorkingDirectories === !0,
    w = (v, x) => y && (x === "read" || GIT_SAFETY_WRITE_CMDLETS.has(v));
  if (compoundCommandHasCd)
    m = {
      behavior: "ask",
      message:
        "Compound command changes working directory (Set-Location/Push-Location/Pop-Location/New-PSDrive) \u2014 relative paths cannot be validated against the original cwd and require manual approval",
      decisionReason: {
        type: "other",
        reason:
          "Compound command contains cd with path operation \u2014 manual approval required to prevent path resolution bypass",
      },
    };
  let h = !1,
    O,
    S = !1;
  for (let cmd of statement.commands) {
    if (cmd.elementType !== "CommandAst") {
      ((h = !0), (O = cmd.text));
      continue;
    }
    let {
        paths: paths,
        operationType: operationType,
        hasUnvalidatablePathArg: hasUnvalidatablePathArg,
        optionalWrite: optionalWrite,
      } = extractPathsFromCommand(cmd),
      canonical = resolveToCanonical(cmd.name),
      V = getOwn(CMDLET_PATH_CONFIG, canonical) !== void 0,
      z = checkCmdRemovalOfProtectedPath(cmd, cwd, compoundCommandHasCd);
    if (z !== void 0) return z;
    if (y && !V) {
      let denyHit = checkNativeCommandReads(cmd, cwd, toolPermissionContext, compoundCommandHasCd);
      if (denyHit?.behavior === "deny") return denyHit;
      g ??= denyHit;
    }
    if (y && canonical === "new-item" && isItemTypeParamAbbrev_2(cmd.args))
      g ??= outsideReadsRuntimePathAsk(canonical);
    let W = S;
    if (!Xn.has(canonical)) S = !0;
    if (h) {
      let canonical_2 = resolveToCanonical(cmd.name);
      if (O !== void 0) {
        let G = new Set();
        for (let B of [O, lW(O), oZ(O), createSingleEditDiffConfig(O)]) {
          if ((G.add(B), B.includes("`"))) G.add(gP(B));
          if (B.includes("::")) {
            let sliced = B.slice(B.indexOf("::") + 2);
            if ((G.add(sliced), sliced.includes("`"))) G.add(gP(sliced));
          }
        }
        for (let B of G) {
          let q = checkDenyRuleForGuessedPath(B, cwd, toolPermissionContext, operationType);
          if (q)
            return {
              behavior: "deny",
              message: `${canonical_2} targeting '${q.resolvedPath}' was blocked by a deny rule`,
              decisionReason: { type: "rule", rule: q.rule },
            };
        }
      }
      if (
        ((m ??= {
          behavior: "ask",
          message: `${canonical_2} receives its path from a pipeline expression source that cannot be statically validated and requires manual approval`,
        }),
        w(canonical, operationType))
      )
        g ??= outsideReadsRuntimePathAsk(canonical);
    }
    if (hasUnvalidatablePathArg) {
      let canonical_2 = resolveToCanonical(cmd.name);
      if (
        ((m ??= {
          behavior: "ask",
          message: `${canonical_2} uses a parameter or complex path expression (array literal, subexpression, unknown parameter, etc.) that cannot be statically validated and requires manual approval`,
        }),
        w(canonical, operationType))
      )
        g ??= outsideReadsRuntimePathAsk(canonical);
    }
    if (operationType !== "read" && !optionalWrite && paths.length === 0 && V) {
      m ??= {
        behavior: "ask",
        message: `${canonical} is a write operation but no target path could be determined; requires manual approval`,
      };
      continue;
    }
    if (W && V) {
      if (
        ((m ??= {
          behavior: "ask",
          message: `${canonical} may receive a path from an upstream pipeline command whose output cannot be statically validated and requires manual approval`,
        }),
        w(canonical, operationType))
      )
        g ??= outsideReadsRuntimePathAsk(canonical);
    }
    let H = resolveToCanonical(cmd.name) === "remove-item";
    if (H) {
      if (
        cmd.args.some((arg) => {
          let lower = (arg.length > 0 ? "-" + arg.slice(1) : arg).toLowerCase(),
            index = lower.indexOf(":"),
            X = index > 0 ? lower.slice(0, index) : lower;
          return X.length >= 2 && "-recurse".startsWith(X);
        })
      ) {
        let G = normalizeCaseForComparison(cwd);
        for (let filePath of paths) {
          let replaced = expandTilde(normalizeWindowsPathCase(filePath)).replace(/\\/g, "/"),
            X = isAbsolute_2(replaced) ? resolve_3(replaced) : resolve_3(cwd, replaced),
            te = normalizeCaseForComparison(X);
          if (te === G || G.startsWith(te + "/") || G.startsWith(te + "\\")) {
            m ??= {
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
      paths.some((R) => !isAbsolute_2(expandTilde(R)))
    )
      g ??= outsideReadsRuntimePathAsk(canonical);
    for (let R of paths) {
      if (H && isDangerousRemovalPath(R)) return dangerousRemovalDeny(R);
      let {
        allowed: allowed,
        resolvedPath: resolvedPath,
        decisionReason: decisionReason,
      } = validatePath(R, cwd, toolPermissionContext, operationType);
      if (operationType !== "read" && w(canonical, operationType)) {
        let X = validatePath(R, cwd, toolPermissionContext, "read");
        if (!X.allowed && X.decisionReason?.type === "rule")
          return {
            behavior: "deny",
            message: `${canonical} targeting '${X.resolvedPath}' was blocked by a deny rule`,
            decisionReason: X.decisionReason,
          };
        if (!X.allowed && isOutsideReadsBlockedAsk(X.decisionReason))
          g ??= askOutsideReadBlock(canonical, X.decisionReason, ce(R) ? X.resolvedPath : void 0);
      }
      if (H && isDangerousRemovalPath_2(resolvedPath)) return dangerousRemovalDeny(resolvedPath);
      if (H) {
        let X = resolveDangerousRemovalPath(R, cwd);
        if (X !== null) return dangerousRemovalDeny(X);
      }
      if (!allowed) {
        let canonical = resolveToCanonical(cmd.name),
          workingDirs = Array.from(allWorkingDirectories(toolPermissionContext)),
          dirListStr = formatDirectoryList(workingDirs),
          de =
            decisionReason?.type === "other" || decisionReason?.type === "safetyCheck"
              ? decisionReason.reason
              : `${canonical} targeting '${ce(R) ? resolvedPath : R}' was blocked. For security, Claude Code may only access files in the allowed working directories for this session: ${dirListStr}.`;
        if (decisionReason?.type === "rule")
          return { behavior: "deny", message: de, decisionReason: decisionReason };
        let oe = [];
        if (resolvedPath && ce(R))
          if (operationType === "read") {
            let suggestion = createReadRuleSuggestion(getDirectoryForPath(resolvedPath), "session");
            if (suggestion) oe.push(suggestion);
          } else
            oe.push({
              type: "addDirectories",
              directories: [getDirectoryForPath(resolvedPath)],
              destination: "session",
            });
        if (
          ce(R) &&
          (operationType === "write" || operationType === "create") &&
          acceptEditsSuggestionApplies(toolPermissionContext)
        )
          oe.push({ type: "setMode", mode: "acceptEdits", destination: "session" });
        let he = {
          behavior: "ask",
          message: de,
          blockedPath: ce(R) ? resolvedPath : void 0,
          decisionReason: decisionReason,
          suggestions: oe,
        };
        if (((m ??= he), isOutsideReadsBlockedAsk(decisionReason))) g ??= he;
      }
    }
  }
  if (statement.nestedCommands)
    for (let cmd of statement.nestedCommands) {
      let {
          paths: paths,
          operationType: operationType,
          hasUnvalidatablePathArg: hasUnvalidatablePathArg,
          optionalWrite: optionalWrite,
        } = extractPathsFromCommand(cmd),
        canonical = resolveToCanonical(cmd.name),
        V = checkCmdRemovalOfProtectedPath(cmd, cwd, compoundCommandHasCd);
      if (V !== void 0) return V;
      if (hasUnvalidatablePathArg) {
        if (
          ((m ??= {
            behavior: "ask",
            message: `${canonical} uses a parameter or complex path expression (array literal, subexpression, unknown parameter, etc.) that cannot be statically validated and requires manual approval`,
          }),
          w(canonical, operationType))
        )
          g ??= outsideReadsRuntimePathAsk(canonical);
      }
      if (
        operationType !== "read" &&
        !optionalWrite &&
        paths.length === 0 &&
        getOwn(CMDLET_PATH_CONFIG, canonical) !== void 0
      ) {
        m ??= {
          behavior: "ask",
          message: `${canonical} is a write operation but no target path could be determined; requires manual approval`,
        };
        continue;
      }
      let z = resolveToCanonical(cmd.name) === "remove-item";
      for (let filePath of paths) {
        if (z && isDangerousRemovalPath(filePath)) return dangerousRemovalDeny(filePath);
        let {
          allowed: allowed,
          resolvedPath: resolvedPath,
          decisionReason: decisionReason,
        } = validatePath(filePath, cwd, toolPermissionContext, operationType);
        if (operationType !== "read" && w(canonical, operationType)) {
          let B = validatePath(filePath, cwd, toolPermissionContext, "read");
          if (!B.allowed && B.decisionReason?.type === "rule")
            return {
              behavior: "deny",
              message: `${canonical} targeting '${B.resolvedPath}' was blocked by a deny rule`,
              decisionReason: B.decisionReason,
            };
          if (!B.allowed && isOutsideReadsBlockedAsk(B.decisionReason))
            g ??= askOutsideReadBlock(canonical, B.decisionReason, ce(filePath) ? B.resolvedPath : void 0);
        }
        if (z && isDangerousRemovalPath_2(resolvedPath)) return dangerousRemovalDeny(resolvedPath);
        if (z) {
          let B = resolveDangerousRemovalPath(filePath, cwd);
          if (B !== null) return dangerousRemovalDeny(B);
        }
        if (!allowed) {
          let canonical = resolveToCanonical(cmd.name),
            workingDirs = Array.from(allWorkingDirectories(toolPermissionContext)),
            dirListStr = formatDirectoryList(workingDirs),
            te =
              decisionReason?.type === "other" || decisionReason?.type === "safetyCheck"
                ? decisionReason.reason
                : `${canonical} targeting '${ce(filePath) ? resolvedPath : filePath}' was blocked. For security, Claude Code may only access files in the allowed working directories for this session: ${dirListStr}.`;
          if (decisionReason?.type === "rule")
            return { behavior: "deny", message: te, decisionReason: decisionReason };
          let ne = [];
          if (resolvedPath && ce(filePath))
            if (operationType === "read") {
              let suggestion = createReadRuleSuggestion(getDirectoryForPath(resolvedPath), "session");
              if (suggestion) ne.push(suggestion);
            } else
              ne.push({
                type: "addDirectories",
                directories: [getDirectoryForPath(resolvedPath)],
                destination: "session",
              });
          if (
            ce(filePath) &&
            (operationType === "write" || operationType === "create") &&
            acceptEditsSuggestionApplies(toolPermissionContext)
          )
            ne.push({ type: "setMode", mode: "acceptEdits", destination: "session" });
          let de = {
            behavior: "ask",
            message: te,
            blockedPath: ce(filePath) ? resolvedPath : void 0,
            decisionReason: decisionReason,
            suggestions: ne,
          };
          if (((m ??= de), isOutsideReadsBlockedAsk(decisionReason))) g ??= de;
        }
      }
      if (h)
        m ??= {
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
          let {
            allowed: allowed,
            resolvedPath: resolvedPath,
            decisionReason: decisionReason,
          } = validatePath(redir.target, cwd, toolPermissionContext, "create");
          if (!allowed) {
            let workingDirs = Array.from(allWorkingDirectories(toolPermissionContext)),
              dirListStr = formatDirectoryList(workingDirs),
              z =
                decisionReason?.type === "other" || decisionReason?.type === "safetyCheck"
                  ? decisionReason.reason
                  : `Output redirection to '${ce(redir.target) ? resolvedPath : redir.target}' was blocked. For security, Claude Code may only write to files in the allowed working directories for this session: ${dirListStr}.`;
            if (decisionReason?.type === "rule")
              return { behavior: "deny", message: z, decisionReason: decisionReason };
            m ??= {
              behavior: "ask",
              message: z,
              blockedPath: ce(redir.target) ? resolvedPath : void 0,
              decisionReason: decisionReason,
              suggestions: ce(redir.target)
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
      let {
        allowed: allowed,
        resolvedPath: resolvedPath,
        decisionReason: decisionReason,
      } = validatePath(redir.target, cwd, toolPermissionContext, "create");
      if (!allowed) {
        let workingDirs = Array.from(allWorkingDirectories(toolPermissionContext)),
          dirListStr = formatDirectoryList(workingDirs),
          V =
            decisionReason?.type === "other" || decisionReason?.type === "safetyCheck"
              ? decisionReason.reason
              : `Output redirection to '${ce(redir.target) ? resolvedPath : redir.target}' was blocked. For security, Claude Code may only write to files in the allowed working directories for this session: ${dirListStr}.`;
        if (decisionReason?.type === "rule")
          return { behavior: "deny", message: V, decisionReason: decisionReason };
        m ??= {
          behavior: "ask",
          message: V,
          blockedPath: ce(redir.target) ? resolvedPath : void 0,
          decisionReason: decisionReason,
          suggestions: ce(redir.target)
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
  return g ?? m ?? { behavior: "passthrough", message: "All path constraints validated successfully" };
}

export { isDangerousRemovalPath, dangerousRemovalDeny, checkPathConstraints };
