/**
 * tools/PowerShellTool/_new/copyMoveMayReachGitInternals.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-v0yfsee9.js (5)
 * attribution: sole-consumer-new 5
 */
import {
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  relative,
  sep,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  posix,
} from "path";
import {
  getFsImplementation,
  resolveDeepestExistingAncestorSync,
  safeResolvePath,
} from "../../../utils/fsOperations.js";
import { getCwd } from "../../../utils/cwd.js";
import { Qn } from "../../../utils/pathClassification.js";
import { foldCaseForMatch, Je, isGitInternalPathPS } from "../gitSafety.js";
import { getOriginalCwd } from "../../../bootstrap/state.js";
import { skipLeadingWhitespaceAndComments, lW, oZ } from "../powershellParsing.js";
import { PS_TOKENIZER_DASH_CHARS } from "../../../utils/powershell/parser.js";
import { createSingleEditDiffConfig } from "../../../components/permissions/FilePermissionDialog/ideDiffConfig.js";

//@ chunk-v0yfsee9.js:14974-15045 sole-consumer-new
function tt(e) {
  if (!e.includes(",")) return [e];
  return [e, ...e.split(",")];
}
/**
 * PowerShell 参数解析用表：路径参数名与别名、开关参数别名、通用参数别名、开关类参数与带值的通用参数。
 */
//@ chunk-v0yfsee9.js:15045-15555 sole-consumer-new
var PATH_PARAMS = ["path", "literalpath"],
  LITERAL_PATH_ALIASES = new Set(["pspath", "lp"]),
  SWITCH_ALIASES = new Set(["cf", "wi", "vb", "db", "usetx"]),
  COMMON_PARAM_ALIASES = new Set(["ea", "ev", "wa", "wv", "infa", "iv", "proga", "ov", "ob", "pv"]),
  SWITCH_PARAMS = [
    "container",
    "force",
    "passthru",
    "recurse",
    "whatif",
    "confirm",
    "usetransaction",
    "verbose",
    "debug",
  ],
  VALUED_COMMON_PARAMS = [
    "filter",
    "include",
    "exclude",
    "credential",
    "fromsession",
    "tosession",
    "erroraction",
    "errorvariable",
    "warningaction",
    "warningvariable",
    "informationaction",
    "informationvariable",
    "progressaction",
    "outvariable",
    "outbuffer",
    "pipelinevariable",
  ];
//@ chunk-v0yfsee9.js:15555-15595 sole-consumer-new
function _t(e) {
  return /[*?[\]$]/.test(e);
}
//@ chunk-v0yfsee9.js:15595-15891 sole-consumer-new
function isCwdOrAncestor(e) {
  let n = getFsImplementation(),
    r = getCwd(),
    s = resolve_2(r, e),
    m = Qn(s) ? s : (resolveDeepestExistingAncestorSync(n, s) ?? s),
    resolvedPath = safeResolvePath(n, r).resolvedPath,
    y = foldCaseForMatch(m);
  if (foldCaseForMatch(resolvedPath) === y) return !0;
  let resolvedPath_2 = safeResolvePath(n, getOriginalCwd()).resolvedPath,
    h = relative(resolvedPath_2, resolvedPath);
  if (h === ".." || h.startsWith(".." + sep) || isAbsolute(h)) return !1;
  let O = foldCaseForMatch(resolvedPath_2),
    S = resolvedPath;
  for (;;) {
    if (foldCaseForMatch(S) === y) return !0;
    if (foldCaseForMatch(S) === O || S === dirname_2(S)) return !1;
    S = dirname_2(S);
  }
}
/**
 * git 安全检查：Copy-Item/Move-Item 的参数解析（-Path/-LiteralPath/-Destination 与通用参数，缩写须唯一）后，若目标是 cwd 或其祖先、含通配或变量、末段为 . / .. 或 git 内部路径名，或参数无法确定，则视为可能写入 .git 内部而返回 true。
 */
//@ chunk-v0yfsee9.js:15891-17169 sole-consumer-new
function copyMoveMayReachGitInternals(args, forceAsk = !1) {
  let r = [],
    s = [],
    m,
    g = !1,
    y = !1,
    w = [];
  for (let x = 0; x < args.length; x++) {
    let _ = skipLeadingWhitespaceAndComments(args[x]);
    if (_.length === 0 || !PS_TOKENIZER_DASH_CHARS.has(_[0])) {
      s.push(args[x]);
      continue;
    }
    let index = _.indexOf(":", 1),
      lower = (index > 0 ? _.slice(1, index) : _.slice(1)).toLowerCase(),
      D = index > 0 ? _.slice(index + 1) : void 0;
    if (lower === "") return !0;
    let startsWith = "destination".startsWith(lower),
      z = LITERAL_PATH_ALIASES.has(lower) || "literalpath".startsWith(lower),
      W = z || PATH_PARAMS.some((q) => q.startsWith(lower)),
      H = SWITCH_ALIASES.has(lower) || SWITCH_PARAMS.some((q) => q.startsWith(lower)),
      R = COMMON_PARAM_ALIASES.has(lower) || VALUED_COMMON_PARAMS.some((q) => q.startsWith(lower));
    if (Number(startsWith) + Number(W) + Number(H) + Number(R) !== 1) return !0;
    if (H) {
      if ("container".startsWith(lower) && D !== void 0) {
        let q = skipLeadingWhitespaceAndComments(D);
        if (![lW, oZ, createSingleEditDiffConfig].every((te) => /^\$true$/i.test(te(q).trim()))) y = !0;
      }
      continue;
    }
    let B = D ?? args[++x];
    if (B === void 0) continue;
    if (startsWith) m = B;
    else if (W)
      if (((g = !0), z)) w.push(...B.split(","));
      else r.push(...B.split(","));
  }
  let h = (g ? 0 : 1) + (m === void 0 ? 1 : 0);
  if (s.length > h) return !0;
  let O,
    S = 0;
  if (!g && S < s.length) (r.push(...s[S].split(",")), S++);
  if (m === void 0 && S < s.length) O = s[S];
  if (r.length === 0 && w.length === 0 && !forceAsk) return !1;
  let v = m ?? O;
  if (v !== void 0) {
    let mapped = Je(v).map((_) => (_ === "" ? "." : _));
    if (mapped.some(_t)) return !0;
    if (!mapped.some(isCwdOrAncestor)) return !1;
  }
  if (y || forceAsk) return !0;
  for (let [x, _] of [
    [!1, r],
    [!0, w],
  ])
    for (let P of _)
      for (let k of Je(P)) {
        let D = k === "" ? "." : k;
        if (x ? /\$/.test(D) : _t(D)) return !0;
        let base = posix.basename(D);
        if (base === "." || base === "..") return !0;
        if (isGitInternalPathPS(base)) return !0;
      }
  return !1;
}

export { tt, copyMoveMayReachGitInternals };
