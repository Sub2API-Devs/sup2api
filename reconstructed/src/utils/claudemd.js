/**
 * utils/claudemd.ts
 *
 * CLAUDE.md 指令文件的发现与加载：托管/用户/项目/本地层级、.claude/rules 条件规则、@include 递归、排除规则、外部引用审批与缓存。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/claudemd.ts
 * pieces: chunk-4121qate.js (2), chunk-cjydagjy.js (1), chunk-e6aww6q8.js (101)
 * attribution: fingerprint 20, callgraph-fingerprint 3, placement 44, layout 29, callgraph-witnessed 1, affinity 4, file-local 3
 */
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
  extname,
  extname as extname_2,
  extname as extname_3,
  extname as extname_4,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
  parse,
  parse as parse_2,
  parse as parse_3,
  parse as parse_4,
  parse as parse_5,
  parse as parse_6,
  parse as parse_7,
  parse as parse_8,
  parse as parse_9,
  parse as parse_10,
  parse as parse_11,
  parse as parse_12,
  parse as parse_13,
  parse as parse_14,
} from "path";
import { Re } from "../../runtime/bun-runtime.js";
import { Vpe } from "../../vendor/ignore/index.js";
import { fSe, f2 } from "../../vendor/marked/lib/marked.esm.js";
import { hqt } from "../../vendor/picomatch/index.js";
import { backfillState, backfillMemoryIndex } from "../memdir/memoryIndex.js";
import {
  nfcLowerPath,
  indexLinkedMemoryPaths,
  SM,
  logWithheldInstructionFiles,
  restrictedInstructionReaders,
  Q_,
  yHo,
  ICe,
  P5t,
  NKe,
} from "./instructionFileAccess.js";
import { mergePersistedDenyRules } from "./permissions/permissions.js";
import { isSettingSourceEnabled } from "./settings/constants.js";
import {
  getWorkspaceRestriction,
  getAllowedSettingSourcesAsConfigured,
  getOriginalCwdOrNull,
  getSdkBetas,
  getOriginalCwd,
  getRootSession,
  isDiskless,
  getClaudeMdAdditionalDirectoriesAsked,
  getAdditionalDirectoriesForClaudeMd,
} from "../bootstrap/state.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { getEmptyToolPermissionContext } from "../Tool.js";
import { isRestrictedReadBlocked } from "./claudeInChrome/fileUpload.js";
import { Lus } from "./settings/policyHelper/policyHelper.js";
import { getMainLoopModel, rlt } from "./model/model.js";
import { getContextWindow } from "./model/configs.js";
import { bytesPerTokenForModel } from "./model/modelDisplay.js";
import { pathInWorkingPath } from "./permissions/filesystem.js";
import { parseFrontmatter } from "./frontmatterParser.js";
import { unwrapResults } from "./suggestions/slackChannelSuggestions.js";
import { logForDebugging } from "./debug.js";
import { Fae, truncateEntrypointContent } from "../memdir/memdir.js";
import {
  getAutoMemEntrypoint,
  getAutoMemPath,
  isAutoMemPathSafeForCarveout,
  isAutoMemoryEnabled,
  getAutoMemPathState,
  isMemoryRecallEnabled,
  getAutoMemPathOrNull,
} from "../memdir/paths.js";
import { isReadBlockOn, isAutoMemReadFenced } from "./permissions/readBlock.js";
import {
  getPathsForPermissionCheck,
  getFsImplementation,
  isDuplicatePath_2,
  safeResolvePath,
  findIntermediateUncJunction,
} from "./fsOperations.js";
import { HostScoped } from "./hostScoped.js";
import { logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { getClaudeConfigDirOrNull, isEnvTruthy } from "./envUtils.js";
import {
  getUserClaudeRulesDir,
  getCurrentProjectConfig,
  getMemoryPath,
  getManagedClaudeRulesDir,
} from "./config.js";
import { getErrnoCode, errnoShapedCode } from "./errors.js";
import { logEvent } from "../services/analytics/index.js";
import { readSmallFileChecked } from "./readSmallFile.js";
import { expandPath } from "./path.js";
import {
  isUnderNetworkDirCached,
  isWslUncPath,
  Ya,
  tP,
  isNetDir,
  isNetworkMountRoot,
  AV,
} from "./networkPaths.js";
import { getInitialSettings_2, getSettingsForSource } from "./settings/settings.js";
import { normalizePathForCompare } from "./file.js";
import { getDevicePathRefusal } from "../tools/FileReadTool/FileReadTool.js";
import { isManagedFolderWritable, W1, L5e } from "../plugins/functionHooks/sites/promptContextSites.js";
import { isValidKeySegment, STORAGE_SPACES } from "./storage/storageSpaces.js";
import { env } from "./env.js";
import { PathSpace } from "./resultError.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { findGitRoot, findCanonicalGitRoot } from "./git.js";
import { Qn, gb, isMacSpecialPath } from "./pathClassification.js";
import { getSessionEntrypoint } from "./sessionShape.js";
import { wt } from "../remote/remoteMode.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { getManagedFilePath } from "./settings/managedPath.js";
import { zyr } from "./settings/policyHelper/helperRemote.js";
import { count } from "./collections.js";
import { hasInstructionsLoadedHook, executeInstructionsLoadedHooks } from "./hooks.js";
import { isInstructionsMemoryType } from "../entrypoints/sdk/coreSchemas.js";
import { rSt } from "./commandPredicates.js";
import { clearMemoryFilesCache } from "../components/Message.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { shouldIncludeMemoryFile } from "./attachments.js";
import { xst } from "./ignorePatterns.js";
import { isClaudeMdLoadingDisabled } from "./settings/customizationDisabled.js";

//@ chunk-e6aww6q8.js:1310416-1310436 placement
var h3t = Re(Vpe(), 1);
//@ chunk-e6aww6q8.js:1310436-1310627 placement
var SETEXT_UNDERLINE_RE = /^ {0,3}(?:=+|-+) *$/,
  C0o = /^ {0,3}(?:=+|-+) *$/m,
  A0o =
    /^(?:\s*$|(?:[*+-]|\d{1,9}[.)]) |(?: {4}| {0,3}\t)| {0,3}(?:`{3,}|~{3,})| {0,3}>| {0,3}#{1,6}| {0,3}<[^\n>]+>$|.*[\u2028\u2029])/;
//@ chunk-e6aww6q8.js:1310627-1310801 placement
class ClaudeMdTokenizer extends fSe {
  lexed = [];
  lheading(e) {
    let at = this.lexed.at(-1);
    return at !== void 0 &&
      !at.inReach.has(e.length) &&
      (at.text.at(-e.length - 1) ??
        `
`) ===
        `
`
      ? void 0
      : super.lheading(e);
  }
}
//@ chunk-e6aww6q8.js:1310801-1311190 placement
class ClaudeMdLexer extends f2 {
  #e;
  constructor() {
    let e = new ClaudeMdTokenizer();
    super({ gfm: !1, tokenizer: e });
    this.#e = e;
  }
  blockTokens(e, n = [], r = !1) {
    let s = new Set(),
      h = C0o.test(e) ? e.length : -1,
      y = !1;
    while (h >= 0) {
      let S =
          h === 0
            ? 0
            : e.lastIndexOf(
                `
`,
                h - 1,
              ) + 1,
        sliced = e.slice(S, h);
      (y && s.add(e.length - S),
        (y = SETEXT_UNDERLINE_RE.test(sliced) || (y && !A0o.test(sliced))),
        (h = S - 1));
    }
    this.#e.lexed.push({ text: e, inReach: s });
    try {
      return super.blockTokens(e, n, r);
    } finally {
      this.#e.lexed.pop();
    }
  }
}
/**
 * 用定制 marked 词法器（gfm 关闭）把 markdown 切成 token，供 HTML 注释剥离与 @include 提取使用。
 */
//@ chunk-e6aww6q8.js:1311190-1311230 layout
function lexMarkdown(e) {
  return new ClaudeMdLexer().lex(e);
}
/**
 * 去掉 markdown 中的 HTML 注释（不进入代码块）。
 */
//@ chunk-e6aww6q8.js:1311230-1311318 fingerprint = stripHtmlComments (0.722)
function stripHtmlComments(content) {
  if (!content.includes("<!--")) return { content: content, stripped: !1 };
  return stripHtmlCommentsFromTokens(lexMarkdown(content));
}
//@ chunk-e6aww6q8.js:1311318-1311578 fingerprint = stripHtmlCommentsFromTokens (1)
function stripHtmlCommentsFromTokens(tokens) {
  let result = "",
    r = !1,
    commentSpan = /<!--[\s\S]*?-->/g;
  for (let token of tokens) {
    if (token.type === "html") {
      let trimmed = token.raw.trimStart();
      if (trimmed.startsWith("<!--") && trimmed.includes("-->")) {
        let residue = token.raw.replace(commentSpan, "");
        if (((r = !0), residue.trim().length > 0)) result += residue;
        continue;
      }
    }
    result += token.raw;
  }
  return { content: result, stripped: r };
}
//@ chunk-e6aww6q8.js:1311578-1311598 placement
var k3t = Re(hqt(), 1);
//@ chunk-e6aww6q8.js:1311919-1311938 placement
var x0o = 0.8,
  HQ = 0.7;
//@ chunk-e6aww6q8.js:1316725-1316940 placement
function ensureMemoryIndexBackfill(e, n) {
  let of = backfillState.of(e),
    s = of.get(n);
  if (s) return s;
  let h,
    S = new Promise((w) => (h = w)).then(() =>
      backfillMemoryIndex(
        n,
        () => {
          if (of.get(n) === S) of.delete(n);
        },
        () => {
          if (of.get(n) === S) of.set(n, Promise.resolve(!1));
        },
      ),
    );
  return (of.set(n, S), h(), S);
}
//@ chunk-e6aww6q8.js:1317030-1317127 placement
var h_e = 2000,
  q0o = /\]\(([^()\n]+?\.md)\)/gi,
  b5t = { resolved: !1, read: !1, written: !1, injection: "none" };
/**
 * 跟踪本会话中 CLAUDE.md 等指令文件的读写情况。
 */
//@ chunk-e6aww6q8.js:1317127-1318890 placement
class ClaudeMdAccessTracker {
  memoryContext = null;
  surfacedKeys = new Set();
  accessedKeys = new Map();
  recordContextBuild(e) {
    let { memoryDir: memoryDir } = e;
    this.memoryContext = {
      memoryDir: memoryDir === null ? null : { path: memoryDir, key: nfcLowerPath(memoryDir) },
      bodyKeys: new Set(e.injectedBodyPaths.slice(0, h_e).map(nfcLowerPath)),
      listedKeys: new Set(
        memoryDir === null
          ? []
          : e.indexContents
              .flatMap((indexContent) => indexLinkedMemoryPaths(indexContent, memoryDir))
              .slice(0, h_e)
              .map(nfcLowerPath),
      ),
    };
  }
  recordSurfaced(e) {
    for (let n of e) {
      if (this.surfacedKeys.size >= h_e) return;
      this.surfacedKeys.add(nfcLowerPath(n));
    }
  }
  recordAccess(e, n) {
    let r = nfcLowerPath(e),
      s = this.accessedKeys.get(r);
    if (s === void 0 && this.accessedKeys.size >= h_e) return;
    let h = n === "read" ? "read" : "written";
    this.accessedKeys.set(r, s === void 0 || s === h ? h : "read_written");
  }
  priorAccess(e) {
    return this.accessedKeys.get(nfcLowerPath(e)) ?? "none";
  }
  injection(e) {
    let injectionForKey = this.injectionForKey(nfcLowerPath(e));
    return this.memoryContext === null && injectionForKey === "none" ? "unknown" : injectionForKey;
  }
  citedStatus(e) {
    let memoryContext = this.memoryContext,
      r = memoryContext?.memoryDir ?? null,
      trimmed = e.trim();
    if (memoryContext === null || r === null || trimmed === "" || trimmed.split(/[\\/]/).includes(".."))
      return b5t;
    let h = /\.md$/i.test(trimmed) ? trimmed : `${trimmed}.md`,
      y = nfcLowerPath(isAbsolute_24(h) ? h : join_54(r.path, h)),
      S = r.key + sep_32;
    if (!y.startsWith(S)) return b5t;
    let statusForKey = this.statusForKey(y);
    if (statusForKey.resolved || /[\\/]/.test(trimmed)) return statusForKey;
    let L = basename_25(y),
      G = new Set(
        [
          ...memoryContext.bodyKeys,
          ...memoryContext.listedKeys,
          ...this.surfacedKeys,
          ...this.accessedKeys.keys(),
        ].filter((q) => q.startsWith(S) && basename_25(q) === L),
      );
    return G.size === 1 ? this.statusForKey([...G][0]) : statusForKey;
  }
  reset() {
    ((this.memoryContext = null), this.surfacedKeys.clear(), this.accessedKeys.clear());
  }
  injectionForKey(e) {
    return this.memoryContext?.bodyKeys.has(e)
      ? "body"
      : this.surfacedKeys.has(e)
        ? "surfaced"
        : this.memoryContext?.listedKeys.has(e)
          ? "listed"
          : "none";
  }
  statusForKey(e) {
    let n = this.accessedKeys.get(e) ?? "none",
      injectionForKey = this.injectionForKey(e);
    return {
      resolved: n !== "none" || injectionForKey !== "none",
      read: n === "read" || n === "read_written",
      written: n === "written" || n === "read_written",
      injection: injectionForKey,
    };
  }
}
//@ chunk-e6aww6q8.js:1330061-1330105 placement
var s$i = (e) => mergePersistedDenyRules({ ...e, alwaysDenyRules: {} });
/**
 * 判断某设置来源的指令文件是否可读（来源已启用，或工作区限制下仍保留指令文件）。
 */
//@ chunk-e6aww6q8.js:1330105-1330211 placement
function isInstructionSourceEnabled(e) {
  if (isSettingSourceEnabled(e)) return !0;
  let n = getWorkspaceRestriction();
  return n !== null && n.sparesInstructionFiles && getAllowedSettingSourcesAsConfigured().includes(e);
}
/**
 * 判断本地设置来源是否可读（已启用或工作区限制允许）。
 */
//@ chunk-e6aww6q8.js:1330211-1330311 placement = _temp8 (1)
function isLocalSettingsReadable() {
  if (isSettingSourceEnabled("localSettings")) return !0;
  return (
    getWorkspaceRestriction() !== null && getAllowedSettingSourcesAsConfigured().includes("localSettings")
  );
}
/**
 * CLAUDE.md 加载的会话状态（加载/迁移缓存、下次加载原因、钩子开关等）与附加状态。
 */
//@ chunk-e6aww6q8.js:1330311-1330519 placement
var claudeMdSessionState = new SessionRootSlot(() => ({
    memo: { loads: new Map(), moves: new Map() },
    nextEagerLoadReason: "session_start",
    shouldFireHook: !0,
    walkEpoch: 0,
    hasLoggedInitialLoad: !1,
    judgedBy: void 0,
    reportsSetupGuides: !0,
  })),
  claudeMdExtraState = new SessionRootSlot(() => ({}));
//@ chunk-e6aww6q8.js:1330519-1330551 placement
function NA(e) {
  return claudeMdSessionState.of(e);
}
//@ chunk-e6aww6q8.js:1330551-1330586 placement
function VGt(e, n) {
  NA(e).judgedBy = n;
}
/**
 * 创建"被扣留路径"跟踪器：判断路径是否应扣留，并列出已扣留与已加载的路径。
 */
//@ chunk-e6aww6q8.js:1330586-1330804 placement
function createHeldPathTracker(e) {
  let n = new Map();
  return {
    held: buildHeldOutsideChecker(e, (r, s) => {
      n.set(r, s);
    }),
    withheld: () =>
      Array.from(n)
        .flatMap(([r, s]) => (s === void 0 ? [] : [{ path: r, why: s }]))
        .slice(0, SM),
    loaded: () => Array.from(n).flatMap(([r, s]) => (s === void 0 ? [r] : [])),
  };
}
/**
 * 开始工作目录迁移时的扣留跟踪，keep 时记录被扣留的指令文件。
 */
//@ chunk-e6aww6q8.js:1330804-1330943 placement
function beginCwdRelocationHold(e) {
  let { memo: memo } = NA(e),
    r = getOriginalCwdOrNull(),
    s = createHeldPathTracker(e);
  return {
    held: s.held,
    keep: () => {
      if (r !== null) memo.moves.set(r, s.withheld());
      logWithheldInstructionFiles(e, s.withheld());
    },
  };
}
//@ chunk-e6aww6q8.js:1330943-1331160 placement
function buildHeldOutsideChecker(e, n) {
  let r = mergePersistedDenyRules(
    e.engineStore.current?.getState().toolPermissionContext ??
      NA(e).judgedBy ??
      getEmptyToolPermissionContext(),
  );
  if (getOriginalCwdOrNull() === null)
    return restrictedInstructionReaders({ context: r, folders: getAdditionalClaudeMdDirs() }, n);
  return Q_(r) ? yHo({ context: r, isHeldOutside: isRestrictedReadBlocked }, n) : void 0;
}
/**
 * 列出当前工作目录下被扣留的指令文件（去重）。
 */
//@ chunk-e6aww6q8.js:1331160-1331351 placement
function getWithheldInstructionFiles(e) {
  let { memo: memo } = NA(e),
    r = getOriginalCwdOrNull(),
    s = memo.loads.get(!1)?.settled,
    h = new Set();
  return (s?.root === r ? s.withheld : [])
    .concat(r === null ? [] : (memo.moves.get(r) ?? []))
    .filter(({ path: path }) => !h.has(path) && h.add(path));
}
//@ chunk-e6aww6q8.js:1331351-1331380 placement
var T3t = "<managed-settings>";
//@ chunk-e6aww6q8.js:1331380-1331420 placement
function oEt(e) {
  return e === Lus || e === T3t;
}
//@ chunk-e6aww6q8.js:1331420-1331454 placement
var DHo = 0.05,
  Uq = 4194304,
  LHo = 40000;
/**
 * 按模型上下文窗口计算单个记忆文件的最大字符数。
 */
//@ chunk-e6aww6q8.js:1331454-1331569 placement
function getMaxMemoryFileChars(e = getMainLoopModel()) {
  let n = getContextWindow(e, getSdkBetas()),
    r = Number.isFinite(n) && n > 0 ? n : rlt;
  return Math.max(LHo, Math.round(r * DHo * bytesPerTokenForModel(e)));
}
//@ chunk-e6aww6q8.js:1331569-1331584 placement
var NHo = 120000;
//@ chunk-e6aww6q8.js:1331584-1331628 placement
function FHo(e) {
  return Math.max(NHo, getMaxMemoryFileChars(e));
}
//@ chunk-e6aww6q8.js:1331628-1332435 fingerprint = TEXT_FILE_EXTENSIONS (1)
var TEXT_FILE_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".text",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".xml",
  ".csv",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".py",
  ".pyi",
  ".pyw",
  ".rb",
  ".erb",
  ".rake",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".kts",
  ".scala",
  ".c",
  ".cpp",
  ".cc",
  ".cxx",
  ".h",
  ".hpp",
  ".hxx",
  ".cs",
  ".swift",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".ps1",
  ".bat",
  ".cmd",
  ".env",
  ".ini",
  ".cfg",
  ".conf",
  ".config",
  ".properties",
  ".sql",
  ".graphql",
  ".gql",
  ".proto",
  ".vue",
  ".svelte",
  ".astro",
  ".ejs",
  ".hbs",
  ".pug",
  ".jade",
  ".php",
  ".pl",
  ".pm",
  ".lua",
  ".r",
  ".R",
  ".dart",
  ".ex",
  ".exs",
  ".erl",
  ".hrl",
  ".clj",
  ".cljs",
  ".cljc",
  ".edn",
  ".hs",
  ".lhs",
  ".elm",
  ".ml",
  ".mli",
  ".f",
  ".f90",
  ".f95",
  ".for",
  ".cmake",
  ".make",
  ".makefile",
  ".gradle",
  ".sbt",
  ".rst",
  ".adoc",
  ".asciidoc",
  ".org",
  ".tex",
  ".latex",
  ".lock",
  ".log",
  ".diff",
  ".patch",
]);
//@ chunk-e6aww6q8.js:1332435-1332468 layout
function isWithinOriginalCwd(e) {
  return pathInWorkingPath(e, getOriginalCwd());
}
/**
 * 从 frontmatter 读 paths: glob 列表（去掉结尾 /**，全是 ** 视为无条件），返回正文和 paths。
 */
//@ chunk-e6aww6q8.js:1332468-1332720 fingerprint = parseFrontmatterPaths (1)
function parseFrontmatterPaths(rawContent) {
  let { frontmatter: frontmatter, content: content } = parseFrontmatter(rawContent);
  if (!frontmatter.paths) return { content: content };
  let patterns = unwrapResults(frontmatter.paths)
    .map((pattern) => (pattern.endsWith("/**") ? pattern.slice(0, -3) : pattern))
    .filter((h) => h.length > 0);
  if (patterns.length === 0 || patterns.every((h) => h === "**")) return { content: content };
  return { content: content, paths: patterns };
}
/**
 * 解析记忆文件内容：非文本扩展名跳过；剥离 frontmatter（paths: 作为条件规则 glob）；去 HTML 注释；提取 @include 路径；AutoMem 类型按 200 行/25000 字节截断。
 */
//@ chunk-e6aww6q8.js:1332720-1333193 fingerprint = parseMemoryFileContent (0.919)
function parseMemoryFileContent(rawContent, filePath, type, includeBasePath) {
  let ext = extname(filePath).toLowerCase();
  if (ext && !TEXT_FILE_EXTENSIONS.has(ext))
    return (
      logForDebugging(`Skipping non-text file in @include: ${filePath}`),
      { info: null, includePaths: [] }
    );
  let { content: withoutFrontmatter, paths: paths } = parseFrontmatterPaths(rawContent),
    hasComment = withoutFrontmatter.includes("<!--"),
    L = includeBasePath !== void 0 && withoutFrontmatter.includes("@"),
    G = hasComment || L ? lexMarkdown(withoutFrontmatter) : void 0,
    q = hasComment && G ? stripHtmlCommentsFromTokens(G).content : withoutFrontmatter,
    Z = G && includeBasePath !== void 0 ? extractIncludePathsFromTokens(G, includeBasePath) : [],
    finalContent = q;
  if (type === "AutoMem") finalContent = Fae(truncateEntrypointContent(q).content);
  let contentDiffersFromDisk = finalContent !== rawContent;
  return {
    info: {
      path: filePath,
      type: type,
      content: finalContent,
      globs: paths,
      contentDiffersFromDisk: contentDiffersFromDisk,
      rawContent: contentDiffersFromDisk ? rawContent : void 0,
    },
    includePaths: Z,
  };
}
//@ chunk-e6aww6q8.js:1333193-1333275 fingerprint = processMemoryFile (0.418)
function processMemoryFile(e, n, r) {
  if (!e.includes("@")) return [];
  return parseMemoryFileContent(e, n, r, n).includePaths;
}
//@ chunk-e6aww6q8.js:1333275-1333395 layout
function buildInjectedAutoMemFile(e) {
  let { content: content } = truncateEntrypointContent(e);
  return {
    path: getAutoMemEntrypoint(),
    type: "AutoMem",
    content: content,
    contentDiffersFromDisk: !0,
    rawContent: e,
  };
}
/**
 * CLAUDE_COWORK_MEMORY_INDEX_CONTENT：由宿主直接提供的 MEMORY.md 内容。
 */
//@ chunk-e6aww6q8.js:1333395-1333464 layout
function getCoworkMemoryIndexContent() {
  return process.env.CLAUDE_COWORK_MEMORY_INDEX_CONTENT;
}
//@ chunk-e6aww6q8.js:1333464-1333594 layout
function isAutoMemPathWithinAutoMemDir(e) {
  if (!isReadBlockOn()) return !0;
  let mapped = getPathsForPermissionCheck(getAutoMemPath()).map((r) => (r.endsWith(sep_30) ? r : r + sep_30));
  return getPathsForPermissionCheck(e).every((r) => mapped.some((s) => isAutoMemPathSafeForCarveout(r, s)));
}
//@ chunk-e6aww6q8.js:1333594-1333685 layout
class ClaudeMdLoadState {
  memoryReadEacces = !1;
  memoryReadFailed = !1;
  skip = !1;
  rulesWalk = !1;
  announcedFileCut = !1;
}
//@ chunk-e6aww6q8.js:1333685-1333712 layout
var claudeMdLoadStateByHost = new HostScoped(() => new ClaudeMdLoadState());
//@ chunk-e6aww6q8.js:1333712-1333751 layout
function getClaudeMdLoadState() {
  return claudeMdLoadStateByHost.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:1333751-1333862 layout
function reportSkippedSpecialMemoryFile() {
  let e = getClaudeMdLoadState();
  if (!e.skip) ((e.skip = !0), logFeatureSad("context_claude_md_load", "file_skipped_special_or_oversize"));
}
//@ chunk-e6aww6q8.js:1333862-1333924 layout
function countConfigDirMentions(e) {
  let n = getClaudeConfigDirOrNull();
  return n !== null && e.includes(n) ? 1 : 0;
}
//@ chunk-e6aww6q8.js:1333924-1333961 layout
function getUserRulesDirOrNull() {
  return isDiskless() ? null : getUserClaudeRulesDir();
}
//@ chunk-e6aww6q8.js:1333961-1333991 layout
function handleMemoryFileReadErrno(e, n) {
  handleMemoryFileReadError(getErrnoCode(e), n);
}
/**
 * 记忆文件读取错误处理：ENOENT/EISDIR/ENOTDIR 静默，EACCES 记录并打标。
 */
//@ chunk-e6aww6q8.js:1333991-1334363 fingerprint = handleMemoryFileReadError (0.616)
function handleMemoryFileReadError(error, filePath) {
  if (error === "ENOENT" || error === "EISDIR" || error === "ENOTDIR") return;
  if (error === "EACCES")
    logEvent("tengu_claude_md_permission_error", {
      is_access_error: 1,
      has_home_dir: countConfigDirMentions(filePath),
    });
  let r = getClaudeMdLoadState();
  if (error === "EACCES") {
    if (!r.memoryReadEacces)
      ((r.memoryReadEacces = !0), logFeatureSad("context_claude_md_load", "read_eacces"));
  } else if (!r.memoryReadFailed)
    ((r.memoryReadFailed = !0), logFeatureSad("context_claude_md_load", "read_failed"));
}
//@ chunk-e6aww6q8.js:1334363-1334902 layout
async function readMemoryFileFromStorage({ backend: backend, key: key }) {
  let read = await backend.read([{ key: key, offset: 0, length: Uq + 1 }]);
  if (!read.ok) {
    let y = read.error.code === "InvalidArgument" ? void 0 : read.error.telemetryCode;
    if (y === "ENXIO" || y === "EFBIG") return { kind: "skipped", isDirectory: !1 };
    if (y === "EISDIR") return { kind: "skipped", isDirectory: !0 };
    return { kind: "error", code: y };
  }
  let s = read.value.items[0];
  if (!s.found) return { kind: "absent" };
  if (s.totalBytes > Uq) return { kind: "skipped", isDirectory: !1 };
  let h = s.value;
  return { kind: "content", content: Buffer.from(h.buffer, h.byteOffset, h.byteLength).toString("utf8") };
}
/**
 * 安全读取记忆文件（storage v5 或 fs），区分 absent/error/skipped/content，ENOENT 等静默，EACCES 记录一次。
 */
//@ chunk-e6aww6q8.js:1334902-1335528 callgraph-witnessed = safelyReadMemoryFileAsync (0.249)
async function safelyReadMemoryFileAsync(e, n, r, s, h) {
  try {
    let y,
      S = !1;
    if (h) {
      let w = await h(e, Uq);
      return w === void 0 ? { info: null, includePaths: [] } : parseMemoryFileContent(w, e, n, r);
    }
    if (s) {
      let w = await readMemoryFileFromStorage(s);
      switch (w.kind) {
        case "absent":
          return { info: null, includePaths: [] };
        case "error":
          return (handleMemoryFileReadError(w.code, e), { info: null, includePaths: [] });
        case "skipped":
          ((S = w.isDirectory), (y = null));
          break;
        case "content":
          y = w.content;
          break;
      }
    } else {
      let fs = getFsImplementation();
      y = await readSmallFileChecked(fs, e, Uq, (L) => {
        S = L.isDirectory();
      });
    }
    if (y === null) {
      if ((logForDebugging(`[CLAUDE.md] skipping ${e}: not a regular file or exceeds ${Uq} byte limit`), !S))
        reportSkippedSpecialMemoryFile();
      return { info: null, includePaths: [] };
    }
    return parseMemoryFileContent(y, e, n, r);
  } catch (error) {
    return (handleMemoryFileReadErrno(error, e), { info: null, includePaths: [] });
  }
}
/**
 * 在 markdown token 中查找 @path 引用（跳过 code/codespan，HTML 注释外的残留文本仍扫描）；接受 ./、~/、绝对路径和普通相对名，去掉 #片段，按文件所在目录解析为绝对路径。
 */
//@ chunk-e6aww6q8.js:1335528-1336300 fingerprint = extractIncludePathsFromTokens (1)
function extractIncludePathsFromTokens(tokens, basePath) {
  let absolutePaths = new Set();
  function extractPathsFromText(textContent) {
    let includeRegex = /(?:^|\s)@((?:[^\s\\]|\\ )+)/g,
      match;
    while ((match = includeRegex.exec(textContent)) !== null) {
      let path = match[1];
      if (!path) continue;
      let hashIndex = path.indexOf("#");
      if (hashIndex !== -1) path = path.substring(0, hashIndex);
      if (!path) continue;
      if (((path = path.replaceAll("\\ ", " ")), path)) {
        if (
          !isSpecialOrUnsafePath(path) &&
          (path.startsWith("./") ||
            path.startsWith("~/") ||
            (path.startsWith("/") && path !== "/") ||
            (!path.startsWith("@") && !path.match(/^[#%^&*()]+/) && path.match(/^[a-zA-Z0-9._-]/)))
        ) {
          let resolvedPath = expandPath(path, dirname_31(basePath));
          absolutePaths.add(resolvedPath);
        }
      }
    }
  }
  function processElements(elements) {
    for (let element of elements) {
      if (element.type === "code" || element.type === "codespan") continue;
      if (element.type === "html") {
        let w = element.raw || "",
          trimmed = w.trimStart();
        if (trimmed.startsWith("<!--") && trimmed.includes("-->")) {
          let commentSpan = /<!--[\s\S]*?-->/g,
            residue = w.replace(commentSpan, "");
          if (residue.trim().length > 0) extractPathsFromText(residue);
        }
        continue;
      }
      if (element.type === "text") extractPathsFromText(element.text || "");
      if (element.tokens) processElements(element.tokens);
      if (element.items) processElements(element.items);
    }
  }
  return (processElements(tokens), [...absolutePaths]);
}
/**
 * @include 最大递归深度 5。
 */
//@ chunk-e6aww6q8.js:1336300-1336310 layout
var MAX_INCLUDE_DEPTH = 5;
//@ chunk-e6aww6q8.js:1336310-1336402 layout
function isNonCanonicalSymlink(e, n) {
  if (!n.isSymlink || n.isCanonical) return !1;
  return !(n.resolvedPath === e && isUnderNetworkDirCached(e));
}
/**
 * 按设置 claudeMdExcludes（picomatch，dot:true）构建排除匹配器，只作用于 User/Project/Local 类型。
 */
//@ chunk-e6aww6q8.js:1336402-1336660 fingerprint = isClaudeMdExcluded (0.933)
function isClaudeMdExcluded() {
  let patterns = getInitialSettings_2().claudeMdExcludes;
  if (!patterns || patterns.length === 0) return () => !1;
  let expandedPatterns = isDuplicatePath_2(getFsImplementation(), patterns).filter((s) => s.length > 0);
  if (expandedPatterns.length === 0) return () => !1;
  let r = k3t.default(expandedPatterns, { dot: !0 });
  return (s, h) => (h === "User" || h === "Project" || h === "Local") && r(s.replaceAll("\\", "/"));
}
//@ chunk-e6aww6q8.js:1336660-1336711 affinity
function createClaudeMdExcludeMatcher() {
  let e;
  return (n, r) => (e ??= isClaudeMdExcluded())(n, r);
}
/**
 * User/Project/Local 类型文件是否被 claudeMdExcludes 排除（托管与 AutoMem 不受影响）。
 */
//@ chunk-e6aww6q8.js:1336711-1336804 affinity
function isExcludedByClaudeMdExcludes(e, n, r) {
  if (n !== "User" && n !== "Project" && n !== "Local") return !1;
  return (r ?? isClaudeMdExcluded())(e, n);
}
//@ chunk-e6aww6q8.js:1336804-1337160 affinity
function applyClaudeMdExcludesToInjected(e, n = createClaudeMdExcludeMatcher()) {
  let r = new Map();
  for (let y of e) r.set(y.path, y);
  let s = new Map(),
    h = [];
  for (let y of e) {
    let S = [],
      w = new Set(),
      L = y,
      G = !1;
    while (L) {
      let q = s.get(L.path);
      if (q !== void 0) {
        G = q;
        break;
      }
      if (w.has(L.path) || n(L.path, L.type)) {
        G = !0;
        break;
      }
      (w.add(L.path), S.push(L.path), (L = L.parent === void 0 ? void 0 : r.get(L.parent)));
    }
    for (let q of S) s.set(q, G);
    if (!G) h.push(y);
  }
  return h;
}
/**
 * 记忆文件准入检查：已处理过、include 深度达到 5、被 claudeMdExcludes 排除或为特殊路径时返回 undefined，否则返回规范化路径。
 */
//@ chunk-e6aww6q8.js:1337480-1337589 affinity
function checkMemoryFileAdmissible(e, n, r, s, h) {
  let y = normalizePathForCompare(e);
  if (r.has(y) || s >= MAX_INCLUDE_DEPTH) return;
  if (isExcludedByClaudeMdExcludes(e, n, h)) return;
  if (isSpecialOrUnsafePath(e)) return;
  return y;
}
/**
 * 读取一个指令文件并递归展开其中的 @include：检查排除、深度（最多 5 层）、设备/特殊路径与符号链接；外部（cwd 外）include 需 hasClaudeMdExternalIncludesApproved；User 类型拒绝顶层符号链接与多硬链接文件。返回该文件及其 include 的列表。
 */
//@ chunk-e6aww6q8.js:1337589-1338550 callgraph-fingerprint = isInstructionsMemoryType (0.28)
async function isInstructionsMemoryType_3(e, n, r, s, h = 0, y, S, w, L) {
  let G = checkMemoryFileAdmissible(e, n, r, h, w);
  if (G === void 0) return [];
  let q = s && (n !== "User" || allowsUserExternalIncludes()),
    Z = safeResolvePath(getFsImplementation(), e),
    { resolvedPath: resolvedPath, isSymlink: isSymlink } = Z;
  if (isSpecialOrUnsafePath(resolvedPath) || isNonCanonicalSymlink(e, Z)) return [];
  if (getDevicePathRefusal(e, { spellings: isSymlink ? [e, resolvedPath] : [e], unresolved: !1 }) !== void 0)
    return (
      logForDebugging(`[CLAUDE.md] skipping ${e}: it names a device or process file`),
      reportSkippedSpecialMemoryFile(),
      []
    );
  if (h > 0 && !q && !isWithinOriginalCwd(resolvedPath)) return [];
  if (n === "User" && !q)
    try {
      let stats = await getFsImplementation().lstat(e);
      if ((h === 0 && stats.isSymbolicLink()) || ((stats.nlink ?? 1) > 1 && stats.isFile())) return [];
    } catch {}
  let we = isSymlink ? normalizePathForCompare(resolvedPath) : void 0;
  if (we !== void 0 && r.has(we)) return [];
  r.add(G);
  let Ee = L && (await safelyReadMemoryFileAsync(e, n, resolvedPath, S, L));
  if (Ee && !Ee.info) return [];
  if (we !== void 0) r.add(we);
  let { info: info, includePaths: includePaths } =
    Ee || (await safelyReadMemoryFileAsync(e, n, resolvedPath, S));
  if (!info || !info.content.trim()) return [];
  if (y) info.parent = y;
  if (n === "Managed" && isManagedFolderWritable(e)) info.unverified = !0;
  let Me = [];
  Me.push(info);
  for (let We of includePaths) {
    if (!isWithinOriginalCwd(We) && !q) continue;
    let lt = await isInstructionsMemoryType_3(We, n, r, s, h + 1, e, void 0, w, L);
    for (let Je of info.unverified ? lt : []) Je.unverified = !0;
    Me.push(...lt);
  }
  return Me;
}
/**
 * 遍历 .claude/rules 目录（递归、防环、跟随安全的符号链接）读取 *.md 规则；conditionalRule 控制只取带 paths: 的条件规则还是无条件规则。
 */
//@ chunk-e6aww6q8.js:1338550-1340876 fingerprint = processMdRules (0.587)
async function processMdRules({
  rulesDir: rulesDir,
  type: n,
  processedPaths: processedPaths,
  includeExternal: includeExternal,
  conditionalRule: conditionalRule,
  visitedDirs: visitedDirs = new Set(),
  storageV5: storageV5,
  v5Descent: v5Descent,
  discoveredDir: discoveredDir,
  linkedFrom: linkedFrom,
  excludeMatcher: excludeMatcher,
  held: held,
}) {
  if (visitedDirs.has(rulesDir)) return [];
  try {
    let fs = getFsImplementation(),
      ke = safeResolvePath(fs, rulesDir),
      { resolvedPath: resolvedPath, isSymlink: isSymlink, isCanonical: isCanonical } = ke;
    if (isSpecialOrUnsafePath(resolvedPath) || isNonCanonicalSymlink(rulesDir, ke)) return [];
    if ((visitedDirs.add(rulesDir), isSymlink)) visitedDirs.add(resolvedPath);
    let Ie = includeExternal && (n !== "User" || allowsUserExternalIncludes()),
      Me = getUserRulesDirOrNull(),
      We = n !== "User" && (Me === null || !pathInWorkingPath(discoveredDir ?? rulesDir, Me)),
      ze = !Ie || (linkedFrom === void 0 && We && isCanonical && isSymlink),
      lt =
        ze &&
        (await listRulesDirEntries(fs, rulesDir, n, storageV5, v5Descent)) &&
        !isWithinOriginalCwd(resolvedPath),
      Je =
        ze &&
        !lt &&
        n === "Project" &&
        We &&
        isSymlink &&
        !isWithinOriginalCwd(resolvedPath) &&
        isWithinWorkspaceOrAddDirs(dirname_31(dirname_31(rulesDir))) &&
        (await listRulesDirEntries(fs, dirname_31(rulesDir), n, storageV5, void 0));
    if (
      !Ie &&
      (lt || (Je && (conditionalRule || !getCurrentProjectConfig().hasClaudeMdExternalIncludesApproved)))
    )
      return [];
    let nt = linkedFrom ?? (lt ? rulesDir : Je ? dirname_31(rulesDir) : void 0),
      pt = isCanonical ? resolvedPath : void 0,
      Et =
        !isCanonical || isSymlink
          ? void 0
          : (v5Descent ??
            (storageV5 !== void 0 && n === "User" && rulesDir === getUserClaudeRulesDir()
              ? { backend: storageV5, relPath: [] }
              : void 0)),
      result = [],
      entries;
    try {
      entries = await fs.readdir(resolvedPath);
    } catch (error) {
      let code = getErrnoCode(error);
      if (code === "ENOENT" || code === "EACCES" || code === "ENOTDIR") return [];
      throw error;
    }
    for (let entry of entries) {
      let entryPath = join_52(rulesDir, entry.name),
        Yt = safeResolvePath(fs, entryPath),
        { resolvedPath: resolvedPath, isSymlink: isSymlink, isCanonical: isCanonical } = Yt,
        pn = join_52(discoveredDir ?? rulesDir, entry.name);
      if (pn !== resolvedPath && isExcludedByClaudeMdExcludes(pn, n, excludeMatcher)) continue;
      if (isSpecialOrUnsafePath(resolvedPath) || isNonCanonicalSymlink(entryPath, Yt)) continue;
      let no = isSymlink ? await statRulesEntry(fs, resolvedPath, n, storageV5) : null,
        hn = no ? no.isDirectory() : entry.isDirectory(),
        ho = no ? no.isFile() : entry.isFile(),
        yn =
          Et !== void 0 &&
          !isSymlink &&
          isCanonical &&
          isValidKeySegment(entry.name) &&
          resolvedPath === join_52(getUserClaudeRulesDir(), ...Et.relPath, entry.name)
            ? [...Et.relPath, entry.name]
            : void 0,
        Kn = pt !== void 0 && resolvedPath !== join_52(pt, entry.name) && !isWithinOriginalCwd(resolvedPath),
        Xn = nt ?? (Kn && We ? pn : void 0);
      if (hn) {
        if (Kn && !Ie) continue;
        result.push(
          ...(await processMdRules({
            rulesDir: resolvedPath,
            type: n,
            processedPaths: processedPaths,
            includeExternal: includeExternal,
            conditionalRule: conditionalRule,
            visitedDirs: visitedDirs,
            storageV5: storageV5,
            v5Descent: Et && yn ? { backend: Et.backend, relPath: yn } : void 0,
            discoveredDir: pn !== resolvedPath ? pn : void 0,
            linkedFrom: Xn,
            excludeMatcher: excludeMatcher,
            held: held,
          })),
        );
      } else if (ho && entry.name.endsWith(".md")) {
        if (Kn && !Ie) continue;
        if (
          held &&
          pn !== resolvedPath &&
          !processedPaths.has(normalizePathForCompare(resolvedPath)) &&
          (await held(pn, Uq)) === void 0
        )
          continue;
        let fo = await isInstructionsMemoryType_3(
          resolvedPath,
          n,
          processedPaths,
          includeExternal,
          0,
          void 0,
          Et && yn ? { backend: Et.backend, key: STORAGE_SPACES.userConfigDir("rules", yn) } : void 0,
          excludeMatcher,
          held,
        );
        if (n === "Managed" && isManagedFolderWritable(pn)) for (let bo of fo) bo.unverified = !0;
        let [To] = fo;
        if (To) {
          if (((To.isRule = !0), Xn !== void 0)) To.linkedFrom = Xn;
        }
        result.push(...fo.filter((bo) => (conditionalRule ? bo.globs : !bo.globs)));
      }
    }
    return result;
  } catch (error) {
    if (error instanceof Error && error.message.includes("EACCES"))
      logEvent("tengu_claude_rules_md_permission_error", {
        is_access_error: 1,
        has_home_dir: countConfigDirMentions(rulesDir),
      });
    let ke = getClaudeMdLoadState();
    if (!ke.rulesWalk) ((ke.rulesWalk = !0), logFeatureSad("context_claude_md_load", "rules_walk_failed"));
    return [];
  }
}
//@ chunk-e6aww6q8.js:1340876-1340960 layout
function isWithinWorkspaceOrAddDirs(e) {
  if (pathInWorkingPath(getOriginalCwd(), e)) return !0;
  let n = normalizePathForCompare(e);
  return getAdditionalClaudeMdDirs().some((r) => normalizePathForCompare(r) === n);
}
/**
 * 返回需要加载 CLAUDE.md 的额外目录（--add-dir），需开关 CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD 或对应设置。
 */
//@ chunk-e6aww6q8.js:1340960-1341047 layout
function getAdditionalClaudeMdDirs() {
  return (getClaudeMdAdditionalDirectoriesAsked() ??
    isEnvTruthy(env.CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD))
    ? getAdditionalDirectoriesForClaudeMd()
    : [];
}
//@ chunk-e6aww6q8.js:1341047-1341137 layout
function hostFileScopeForMemoryType(e, n) {
  return e === "Managed" ? PathSpace.system(n) : e === "User" ? PathSpace.home(n) : PathSpace.workspace(n);
}
//@ chunk-e6aww6q8.js:1341137-1341805 layout
async function listRulesDirEntries(e, n, r, s, h) {
  if (isStorageV5Enabled() && s !== void 0) {
    let y =
      r === "User" && (h !== void 0 || n === getUserClaudeRulesDir())
        ? await s
            .scopeKind({ namespace: "userConfigDir", dir: "rules", ...(h && { relPath: h.relPath }) })
            .catch(() => {
              return;
            })
        : await s.hostFiles.stat(hostFileScopeForMemoryType(r, n), { follow: !1 }).catch(() => {
            return;
          });
    if (y?.ok) return y.value.kind === "link";
    let S = y !== void 0 && y.error.code === "Failed" ? y.error.telemetryCode : void 0;
    if (errnoShapedCode(S) !== void 0 || /^ERR_[A-Z0-9_]+$/.test(S ?? "")) return !1;
    logForDebugging(
      `claudemd: the storage backend could not say whether the ${r} rules folder (or its .claude parent) is a symlink (${S ?? y?.error.code ?? "no answer"}) \u2014 checking directly`,
    );
  }
  try {
    return (await e.lstat(n)).isSymbolicLink();
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:1341805-1342542 layout
async function statRulesEntry(e, n, r, s) {
  if (isStorageV5Enabled() && s !== void 0) {
    let h = await s.hostFiles.stat(hostFileScopeForMemoryType(r, n)).catch(() => {
      return;
    });
    if (h?.ok) {
      let { kind: kind } = h.value;
      if (kind === "absent")
        throw Object.assign(Error("ENOENT: rules entry target is gone"), {
          code: "ENOENT",
          syscall: "stat",
          path: n,
        });
      return { isDirectory: () => kind === "directory", isFile: () => kind === "file" };
    }
    let y = h !== void 0 && h.error.code === "Failed" ? h.error.telemetryCode : void 0;
    if (errnoShapedCode(y) !== void 0 || /^ERR_[A-Z0-9_]+$/.test(y ?? ""))
      throw h !== void 0 && h.error.code === "Failed" && h.error.cause instanceof Error
        ? h.error.cause
        : Object.assign(Error("rules entry stat failed"), { code: y });
    logForDebugging(
      `claudemd: the storage backend could not type a linked ${r} rules entry (${y ?? h?.error.code ?? "no answer"}) \u2014 checking directly`,
    );
  }
  return e.stat(n);
}
/**
 * cwd 位于 git worktree 时返回 worktree 根与主仓库根，用于跳过主仓库中位于 worktree 之外的层。
 */
//@ chunk-e6aww6q8.js:1342542-1342665 layout
function getWorktreeRoots(e) {
  let n = findGitRoot(e),
    r = findCanonicalGitRoot(e);
  return n !== null &&
    r !== null &&
    normalizePathForCompare(n) !== normalizePathForCompare(r) &&
    pathInWorkingPath(n, r)
    ? { worktreeRoot: n, mainRepoRoot: r }
    : null;
}
//@ chunk-e6aww6q8.js:1342665-1342744 layout
function isInMainRepoOutsideWorktree(e, n) {
  return n !== null && pathInWorkingPath(e, n.mainRepoRoot) && !pathInWorkingPath(e, n.worktreeRoot);
}
//@ chunk-e6aww6q8.js:1342744-1342822 layout
function isSpecialOrUnsafePath(e) {
  return (
    (Qn(e) && !isWslUncPath(e)) ||
    Ya(e) ||
    tP(e) ||
    isNetDir(e) ||
    isNetworkMountRoot(e) ||
    gb(e) ||
    isMacSpecialPath(e)
  );
}
/**
 * 检查目录下是否有 AGENTS.md（仅用于统计 agents_md_count，316 不加载 AGENTS.md 内容）。
 */
//@ chunk-e6aww6q8.js:1342822-1343028 layout
async function hasAgentsMd(e) {
  let n = join_52(e, "AGENTS.md");
  if (isSpecialOrUnsafePath(n)) return !1;
  try {
    let r = getFsImplementation(),
      s = safeResolvePath(r, n);
    if (isSpecialOrUnsafePath(s.resolvedPath) || isNonCanonicalSymlink(n, s)) return !1;
    let stats = await r.lstat(n);
    return stats.isFile() || stats.isSymbolicLink();
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:1343028-1343071 layout
function allowsUserExternalIncludes() {
  return getSessionEntrypoint() !== "local-agent";
}
/**
 * 按宿主缓存 getMemoryFiles 的结果 promise（键为是否 forced），hold 改变时整体失效。
 */
//@ chunk-e6aww6q8.js:1343071-1343365 layout
function getMemoryFilesCached(e, n = !1, r, s) {
  let h = NA(e),
    y = W1();
  if ((h.memo.hold ?? y) !== y) h.memo = { loads: new Map(), moves: new Map() };
  h.memo.hold = y;
  let S = h.memo.loads.get(n);
  if (S) return S.files;
  let L = {
    files: getMemoryFiles(e.root, h, ICe.of(e), n, r, s).then((G) => ((L.settled = G), G.loaded)),
    settled: void 0,
  };
  return (h.memo.loads.set(n, L), L.files);
}
//@ chunk-e6aww6q8.js:1343365-1343673 layout
function findSymlinkedMemoryPaths(e, n) {
  let r = new Set();
  for (let { base: base, path: path } of n) {
    if (isNetworkMountRoot(base)) continue;
    let y = relative_19(base, path),
      parts = y.split(sep_30);
    if (isAbsolute_23(y) || parts.some((L) => L === ".." || L === "" || L === ".")) continue;
    let w = base;
    for (let [L, G] of parts.entries()) {
      w = join_52(w, G);
      let q = classifyRulesPath(e, w);
      if (q === "absent") {
        r.add(path);
        break;
      }
      if (L < parts.length - 1 && q !== "directory") break;
    }
  }
  return r;
}
//@ chunk-e6aww6q8.js:1343673-1343920 file-local
function resolveExcludePatterns(e, n) {
  if (!isAbsolute_23(n) || n !== resolve_20(n) || isUnsafeClaudeMdDir(n)) return !1;
  if (
    findIntermediateUncJunction(e, n, { unreadableAncestry: "unverified", surfaceNetworkRaw: !0 }) !== void 0
  )
    return !1;
  let r = n;
  try {
    r = e.realpathSync(n);
  } catch (error) {
    let dirToResolve = getErrnoCode(error);
    if (dirToResolve !== "ENOENT" && dirToResolve !== "ENOTDIR") return !1;
  }
  return !isUnsafeClaudeMdDir(r);
}
//@ chunk-e6aww6q8.js:1343920-1344001 layout
function isUnsafeClaudeMdDir(e) {
  let n = join_52(e, "CLAUDE.md");
  return Qn(e) || AV(e) || Qn(n) || AV(n) || isNetworkMountRoot(e);
}
//@ chunk-e6aww6q8.js:1344001-1344211 layout
function classifyRulesPath(e, n) {
  if (Qn(n) || AV(n)) return "other";
  try {
    let lstatSync = e.lstatSync(n);
    return lstatSync.isDirectory() && !lstatSync.isSymbolicLink() ? "directory" : "other";
  } catch (error) {
    let s = getErrnoCode(error);
    return s === "ENOENT" || s === "ENOTDIR" ? "absent" : "other";
  }
}
//@ chunk-e6aww6q8.js:1344211-1344286 file-local
function getAllMemoryFilePaths(e, n, r, s) {
  let h = checkMemoryFileAdmissible(e, n, r, 0, s);
  if (h !== void 0) r.add(h);
  return [];
}
/**
 * 发现并读取全部指令记忆文件：托管 CLAUDE.md→托管 claudeMd 设置→托管 .claude/rules→用户 <配置目录>/CLAUDE.md 与 rules→从文件系统根到 cwd 每层的 CLAUDE.md、.claude/CLAUDE.md、.claude/rules/*.md、CLAUDE.local.md→--add-dir 目录（需 CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD）→自动记忆 MEMORY.md。按 claudeMdExcludes 排除，首次加载打 tengu_claudemd__initial_load 并触发 InstructionsLoaded hook。
 */
//@ chunk-e6aww6q8.js:1344286-1349223 fingerprint = getMemoryFiles (0.756)
async function getMemoryFiles(e, n, r, s, h, y) {
  if (wt()) {
    if (!s) recordMemoryContextBuild(r, []);
    return { loaded: [], withheld: [], root: getOriginalCwdOrNull() };
  }
  let startTime = Date.now();
  if (!s) n.walkEpoch++;
  let walkEpoch = n.walkEpoch,
    L = () => n.walkEpoch !== walkEpoch;
  logForDiagnosticsNoPII("info", "memory_files_started");
  let G = [],
    processedPaths = new Set(),
    config = getCurrentProjectConfig(),
    Se = s || config.hasClaudeMdExternalIncludesApproved || !1,
    ke = createClaudeMdExcludeMatcher(),
    we = getManagedFilePath(),
    managedClaudeMd = getMemoryPath("Managed"),
    managedClaudeRulesDir = getManagedClaudeRulesDir(),
    Ie = isSettingSourceEnabled("userSettings") ? getClaudeConfigDirOrNull() : null,
    Me =
      Ie === null
        ? null
        : { configHome: Ie, claudeMd: getMemoryPath("User"), rulesDir: getUserClaudeRulesDir() },
    We = isInstructionSourceEnabled("projectSettings"),
    ze = isInstructionSourceEnabled("localSettings"),
    lt = (We || ze) && !isDiskless() ? getOriginalCwd() : void 0,
    userClaudeRulesDir = getOriginalCwdOrNull(),
    nt = lt === void 0 ? null : getWorktreeRoots(lt),
    pt = [];
  for (let un = lt; un !== void 0 && un !== parse_5(un).root; un = dirname_31(un)) pt.unshift(un);
  let mapped = pt.map((un) => {
      let ao = isInMainRepoOutsideWorktree(un, nt),
        $o = We && !ao,
        yo = join_52(un, "CLAUDE.local.md");
      return {
        dir: un,
        project: $o,
        projectFiles: $o
          ? [join_52(un, "CLAUDE.md"), join_52(un, ".claude", "CLAUDE.md"), ...P5t(un)].filter(
              (Ho) => !ke(Ho, "Project"),
            )
          : [],
        rulesDir: $o ? join_52(un, ".claude", "rules") : void 0,
        localFile: ze && !ke(yo, "Local") ? yo : void 0,
      };
    }),
    originalCwd = getFsImplementation(),
    gt = isDiskless(),
    At = !gt && resolveExcludePatterns(originalCwd, we),
    It = Me !== null && h === void 0 && resolveExcludePatterns(originalCwd, Me.configHome),
    Yt = mapped.findLast(
      ({ projectFiles: projectFiles, rulesDir: rulesDir, localFile: localFile }) =>
        projectFiles.length > 0 || rulesDir !== void 0 || localFile !== void 0,
    )?.dir,
    qt = h === void 0 && Yt !== void 0 && resolveExcludePatterns(originalCwd, Yt),
    Zt = findSymlinkedMemoryPaths(originalCwd, [
      ...(At
        ? [
            { base: we, path: managedClaudeMd },
            { base: we, path: managedClaudeRulesDir },
          ]
        : []),
      ...(It
        ? [
            ...(ke(Me.claudeMd, "User") ? [] : [{ base: Me.configHome, path: Me.claudeMd }]),
            { base: Me.configHome, path: Me.rulesDir },
          ]
        : []),
      ...(qt
        ? mapped.flatMap(
            ({ dir: dir, projectFiles: projectFiles, rulesDir: rulesDir, localFile: localFile }) =>
              [...projectFiles, rulesDir, localFile]
                .filter((Ho) => Ho !== void 0)
                .map((Ho) => ({ base: dir, path: Ho })),
          )
        : []),
    ]),
    rn = gt ? new Set([...Zt, managedClaudeMd, managedClaudeRulesDir]) : Zt,
    gitRoot = createHeldPathTracker(e),
    { held: held } = gitRoot,
    hn = async (un, ao, $o) =>
      rn.has(un)
        ? getAllMemoryFilePaths(un, ao, processedPaths, ke)
        : isInstructionsMemoryType_3(un, ao, processedPaths, Se, 0, void 0, void 0, ke, $o);
  G.push(...(await hn(managedClaudeMd, "Managed")));
  let ho = zyr();
  if (ho)
    G.push({
      path: Lus,
      type: "Managed",
      content: ho,
      globs: [],
      contentDiffersFromDisk: !0,
      rawContent: ho,
    });
  let yn = getSettingsForSource("policySettings")?.claudeMd;
  if (yn)
    G.push({
      path: T3t,
      type: "Managed",
      content: yn,
      globs: [],
      contentDiffersFromDisk: !0,
      rawContent: yn,
    });
  if (!rn.has(managedClaudeRulesDir))
    G.push(
      ...(await processMdRules({
        rulesDir: managedClaudeRulesDir,
        type: "Managed",
        processedPaths: processedPaths,
        includeExternal: Se,
        conditionalRule: !1,
        storageV5: h,
        excludeMatcher: ke,
      })),
    );
  if (Me !== null) {
    let { claudeMd: claudeMd, rulesDir: rulesDir } = Me;
    if (
      (G.push(
        ...(rn.has(claudeMd)
          ? getAllMemoryFilePaths(claudeMd, "User", processedPaths, ke)
          : await isInstructionsMemoryType_3(
              claudeMd,
              "User",
              processedPaths,
              !0,
              0,
              void 0,
              h !== void 0 ? { backend: h, key: STORAGE_SPACES.state("user-memory") } : void 0,
              ke,
            )),
      ),
      !rn.has(rulesDir))
    )
      G.push(
        ...(await processMdRules({
          rulesDir: rulesDir,
          type: "User",
          processedPaths: processedPaths,
          includeExternal: !0,
          conditionalRule: !1,
          storageV5: h,
          excludeMatcher: ke,
        })),
      );
  }
  let Kn = We && qt,
    Xn = [];
  for (let {
    dir: dir,
    project: project,
    projectFiles: projectFiles,
    rulesDir: rulesDir,
    localFile: localFile,
  } of mapped) {
    if (project && Kn && !n.hasLoggedInitialLoad) Xn.push(hasAgentsMd(dir));
    let rr = dir === lt ? held?.within : held?.above(dir);
    for (let br of projectFiles) G.push(...(await hn(br, "Project", rr)));
    if (rulesDir !== void 0 && !rn.has(rulesDir))
      G.push(
        ...(await processMdRules({
          rulesDir: rulesDir,
          type: "Project",
          processedPaths: processedPaths,
          includeExternal: Se,
          conditionalRule: !1,
          storageV5: h,
          excludeMatcher: ke,
          held: rr,
        })),
      );
    if (localFile !== void 0) G.push(...(await hn(localFile, "Local", rr)));
  }
  let fo = claudeMdExtraState.peek(e)?.read;
  if (fo) G.push(...applyClaudeMdExcludesToInjected(await fo(), ke));
  for (let dir of getAdditionalClaudeMdDirs()) {
    let projectPath = join_52(dir, "CLAUDE.md");
    G.push(
      ...(await isInstructionsMemoryType_3(
        projectPath,
        "Project",
        processedPaths,
        Se,
        0,
        void 0,
        void 0,
        ke,
        held?.within,
      )),
    );
    let dotClaudePath = join_52(dir, ".claude", "CLAUDE.md");
    G.push(
      ...(await isInstructionsMemoryType_3(
        dotClaudePath,
        "Project",
        processedPaths,
        Se,
        0,
        void 0,
        void 0,
        ke,
        held?.within,
      )),
    );
    let rulesDir = join_52(dir, ".claude", "rules");
    if (
      (G.push(
        ...(await processMdRules({
          rulesDir: rulesDir,
          type: "Project",
          processedPaths: processedPaths,
          includeExternal: Se,
          conditionalRule: !1,
          storageV5: h,
          excludeMatcher: ke,
          held: held?.within,
        })),
      ),
      isInstructionSourceEnabled("localSettings"))
    ) {
      let localPath = join_52(dir, "CLAUDE.local.md");
      G.push(
        ...(await isInstructionsMemoryType_3(
          localPath,
          "Local",
          processedPaths,
          Se,
          0,
          void 0,
          void 0,
          ke,
          held?.within,
        )),
      );
    }
  }
  if (isAutoMemoryEnabled() && !isAutoMemReadFenced()) {
    await getAutoMemPathState().warmCanonicalWcRoot();
    let additionalDirs = isAutoMemReadFenced(),
      ao = getCoworkMemoryIndexContent();
    if (!additionalDirs && ao !== "") {
      let $o = getAutoMemEntrypoint(),
        yo = getAutoMemPath(),
        Ho = ao === void 0 && isAutoMemPathWithinAutoMemDir($o),
        rr = async (Hr) => (Hr ? (await safelyReadMemoryFileAsync($o, "AutoMem")).info : null),
        br = ao !== void 0 ? buildInjectedAutoMemFile(ao) : await rr(Ho);
      if (
        br === null &&
        ao === void 0 &&
        !s &&
        !isMemoryRecallEnabled() &&
        !env.CLAUDE_CODE_REMOTE &&
        Ho &&
        (await ensureMemoryIndexBackfill(e.host, yo))
      )
        br = await rr(isAutoMemPathWithinAutoMemDir($o));
      if (br) {
        let normalizedPath = normalizePathForCompare(br.path);
        if (!processedPaths.has(normalizedPath)) (processedPaths.add(normalizedPath), G.push(br));
      }
    }
  }
  let To = Date.now() - startTime,
    results = await Promise.all(Xn),
    vn = L();
  if (!s && !vn) recordMemoryContextBuild(r, G);
  let totalContentLength = G.reduce((sum, ao) => sum + ao.content.length, 0);
  logForDiagnosticsNoPII("info", "memory_files_completed", {
    duration_ms: To,
    file_count: G.length,
    total_content_length: totalContentLength,
  });
  let typeCounts = {};
  for (let un of G) typeCounts[un.type] = (typeCounts[un.type] ?? 0) + 1;
  if (!s && !n.hasLoggedInitialLoad && !vn) {
    n.hasLoggedInitialLoad = !0;
    let un = Kn ? count(results, Boolean) : void 0,
      ao = ZHo(G);
    logEvent("tengu_claudemd__initial_load", {
      file_count: G.length,
      total_content_length: totalContentLength,
      instructions_content_length: ao.totalChars,
      max_file_content_length: ao.largestChars,
      user_count: typeCounts.User ?? 0,
      project_count: typeCounts.Project ?? 0,
      local_count: typeCounts.Local ?? 0,
      managed_count: typeCounts.Managed ?? 0,
      automem_count: typeCounts.AutoMem ?? 0,
      agents_md_count: un,
      ...{},
      duration_ms: To,
    });
  }
  if (!s && !vn) {
    let un = consumeNextEagerLoadReason(n);
    if (un !== void 0 && hasInstructionsLoadedHook())
      for (let file of G) {
        if (!isInstructionsMemoryType(file.type)) continue;
        if (oEt(file.path)) continue;
        let $o = file.parent ? "include" : un;
        executeInstructionsLoadedHooks(e, file.path, file.type, $o, {
          globs: file.globs,
          parentFilePath: file.parent,
          storageV5: h,
          credentials: y,
        });
      }
    for (let ao of n.reportsSetupGuides ? G : [])
      if (isInstructionsMemoryType(ao.type)) rSt(ao.content, "claudemd", y, h, void 0);
  }
  let withheld = gitRoot.withheld();
  if (!s && !vn) logWithheldInstructionFiles(e, withheld);
  return { loaded: G, withheld: withheld, root: userClaudeRulesDir };
}
//@ chunk-e6aww6q8.js:1349300-1349439 callgraph-fingerprint = consumeNextEagerLoadReason (0.605)
function consumeNextEagerLoadReason(e) {
  if (!e.shouldFireHook) return;
  e.shouldFireHook = !1;
  let nextEagerLoadReason = e.nextEagerLoadReason;
  return ((e.nextEagerLoadReason = "session_start"), nextEagerLoadReason);
}
//@ chunk-e6aww6q8.js:1349495-1349518 placement
function clearMemoryFilesCacheForHost() {
  clearMemoryFilesCache(getRootSession());
}
/**
 * 重置记忆文件缓存并记录下一次加载原因（默认 session_start），供 InstructionsLoaded hook。
 */
//@ chunk-e6aww6q8.js:1349518-1349628 file-local
function resetGetMemoryFilesCache(e, n = "session_start") {
  let r = NA(e);
  ((r.nextEagerLoadReason = n), (r.shouldFireHook = !0), r.walkEpoch++, clearMemoryFilesCache(e));
}
//@ chunk-e6aww6q8.js:1349628-1349671 fingerprint = nextEagerLoadReason (1)
function nextEagerLoadReason(e = "session_start") {
  resetGetMemoryFilesCache(getRootSession(), e);
}
//@ chunk-e6aww6q8.js:1349671-1349717 placement
function Z8s(e) {
  NA(e).hasLoggedInitialLoad = !1;
}
//@ chunk-e6aww6q8.js:1349717-1349763 placement
function e9s(e) {
  NA(e).hasLoggedInitialLoad = !0;
}
//@ chunk-e6aww6q8.js:1349763-1349807 placement
function t9s(e) {
  NA(e).reportsSetupGuides = !1;
}
//@ chunk-e6aww6q8.js:1349807-1349903 placement
function getLargeMemoryFiles(files) {
  let n = getMaxMemoryFileChars();
  return files.filter((r) => !oEt(r.path) && isInstructionsMemoryType(r.type) && r.content.length > n);
}
//@ chunk-e6aww6q8.js:1349903-1349972 placement
function aYe(e) {
  return L_e(e).filter((n) => !oEt(n.path) && isInstructionsMemoryType(n.type));
}
//@ chunk-e6aww6q8.js:1349972-1350121 placement
function summarizeMemoryFileSizes(e) {
  let n = 0,
    r = 0;
  for (let s of e) ((n += s.content.length), (r = Math.max(r, s.content.length)));
  return { fileCount: e.length, totalChars: n, largestChars: r };
}
//@ chunk-e6aww6q8.js:1350121-1350156 placement
function ZHo(e) {
  return summarizeMemoryFileSizes(aYe(e));
}
//@ chunk-e6aww6q8.js:1350156-1350323 placement
function getMemoryFileLimits(e, n) {
  let r = getMaxMemoryFileChars(n),
    s = FHo(n),
    h = summarizeMemoryFileSizes(e);
  return {
    limitChars: r,
    totalLimitChars: s,
    ...h,
    filesOverLimit: count(e, (y) => y.content.length > r),
    totalOverLimit: h.totalChars > s,
  };
}
//@ chunk-e6aww6q8.js:1350323-1350362 placement
function n9s(e, n) {
  return getMemoryFileLimits(aYe(e), n);
}
/**
 * 记忆文件总量超过上限时返回统计与最大的三个文件，否则 null。
 */
//@ chunk-e6aww6q8.js:1350362-1350609 placement
function getOversizedMemoryWarning(e) {
  let n = aYe(e),
    r = getMemoryFileLimits(n, void 0);
  if (
    n.reduce((y, S) => (S.content.length > r.limitChars ? y : y + S.content.length), 0) <= r.totalLimitChars
  )
    return null;
  let sliced = n.toSorted((y, S) => S.content.length - y.content.length).slice(0, 3);
  return { summary: r, largest: sliced };
}
/**
 * 判断记忆文件是否注入上下文（自动记忆开启召回时、项目文件被开关关闭时或内容为空时不注入）。
 */
//@ chunk-e6aww6q8.js:1350685-1350851 placement
function shouldInjectMemoryFile(e) {
  if (e.type === "AutoMem" && isMemoryRecallEnabled()) return !1;
  if (
    (e.type === "Project" || e.type === "Local") &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_paper_halyard", !1)
  )
    return !1;
  if (!e.content) return !1;
  return !0;
}
//@ chunk-e6aww6q8.js:1350851-1351029 placement
function recordMemoryContextBuild(e, n) {
  let filtered = n.filter((s) => s.type === "AutoMem" && shouldInjectMemoryFile(s));
  e.recordContextBuild({
    memoryDir: getAutoMemPathOrNull(),
    injectedBodyPaths: filtered.map((s) => s.path),
    indexContents: filtered.map((s) => s.content),
  });
}
//@ chunk-e6aww6q8.js:1351029-1351058 placement
var r9s = (e, n) => L5e(L_e(e, n));
//@ chunk-e6aww6q8.js:1351058-1351122 placement
function L_e(e, n) {
  return e.filter((r) => (!n || n(r.type)) && shouldIncludeMemoryFile(r));
}
/**
 * 取托管与用户 rules 中的条件规则（带 paths: frontmatter）。
 */
//@ chunk-e6aww6q8.js:1351244-1351476 fingerprint = getManagedAndUserConditionalRules (0.896)
async function getManagedAndUserConditionalRules(e, n, r) {
  if (env.CLAUDE_CODE_DISABLE_CLAUDE_MDS) return [];
  let result = [];
  if (!isDiskless())
    result.push(...(await processConditionedMdRules(e, getManagedClaudeRulesDir(), "Managed", n, !1, r)));
  let h = isSettingSourceEnabled("userSettings") ? getUserRulesDirOrNull() : null;
  if (h !== null) result.push(...(await processConditionedMdRules(e, h, "User", n, !0, r)));
  return result;
}
/**
 * 访问嵌套目录（cwd 以下）时补加载该目录的 CLAUDE.md、.claude/CLAUDE.md、CLAUDE.local.md 与 rules；CLAUDE_CODE_DISABLE_CLAUDE_MDS 或 diskless 时为空。
 */
//@ chunk-e6aww6q8.js:1351476-1352178 fingerprint = getMemoryFilesForNestedDirectory (0.919)
async function getMemoryFilesForNestedDirectory(e, n, r, { skipProject: s = !1, held: h } = {}) {
  if (env.CLAUDE_CODE_DISABLE_CLAUDE_MDS) return [];
  if (isDiskless()) return [];
  let result = [],
    S = isInstructionSourceEnabled("projectSettings") && !s;
  if (S) {
    let projectPath = join_52(e, "CLAUDE.md");
    result.push(
      ...(await isInstructionsMemoryType_3(projectPath, "Project", r, !1, 0, void 0, void 0, void 0, h)),
    );
    let dotClaudePath = join_52(e, ".claude", "CLAUDE.md");
    result.push(
      ...(await isInstructionsMemoryType_3(dotClaudePath, "Project", r, !1, 0, void 0, void 0, void 0, h)),
    );
  }
  if (isInstructionSourceEnabled("localSettings")) {
    let localPath = join_52(e, "CLAUDE.local.md");
    result.push(
      ...(await isInstructionsMemoryType_3(localPath, "Local", r, !1, 0, void 0, void 0, void 0, h)),
    );
  }
  if (S) {
    let rulesDir = join_52(e, ".claude", "rules"),
      unconditionalProcessedPaths = new Set(r);
    (result.push(
      ...(await processMdRules({
        rulesDir: rulesDir,
        type: "Project",
        processedPaths: unconditionalProcessedPaths,
        includeExternal: !1,
        conditionalRule: !1,
        held: h,
      })),
    ),
      result.push(...(await processConditionedMdRules(n, rulesDir, "Project", r, !1, void 0, h))));
    for (let path of unconditionalProcessedPaths) r.add(path);
  }
  return result;
}
//@ chunk-e6aww6q8.js:1352178-1352361 fingerprint = getConditionalRulesForCwdLevelDirectory (0.799)
async function getConditionalRulesForCwdLevelDirectory(e, n, r, s) {
  if (env.CLAUDE_CODE_DISABLE_CLAUDE_MDS || !isInstructionSourceEnabled("projectSettings")) return [];
  if (isDiskless()) return [];
  let rulesDir = join_52(e, ".claude", "rules");
  return processConditionedMdRules(n, rulesDir, "Project", r, !1, void 0, s);
}
/**
 * 按目标文件路径匹配条件规则的 paths glob，命中则加载（claudemd_rule_globs）。
 */
//@ chunk-e6aww6q8.js:1352361-1352863 fingerprint = processConditionedMdRules (0.808)
async function processConditionedMdRules(e, n, r, s, h, y, S) {
  let conditionedRuleMdFiles = await processMdRules({
      rulesDir: n,
      type: r,
      processedPaths: s,
      includeExternal: h,
      conditionalRule: !0,
      storageV5: y,
      held: S,
    }),
    L = r === "Project" ? dirname_31(dirname_31(n)) : getOriginalCwd(),
    G = isAbsolute_23(e) ? relative_19(L, e) : e;
  if (isAbsolute_23(e) && (!G || G.startsWith("..") || isAbsolute_23(G))) {
    let q = dirname_31(e),
      Z = safeResolvePath(getFsImplementation(), q),
      resolvedPath = Z.resolvedPath;
    if (resolvedPath !== q && !isNonCanonicalSymlink(q, Z))
      G = relative_19(L, join_52(resolvedPath, basename_23(e)));
  }
  return conditionedRuleMdFiles.filter((q) => {
    if (!q.globs || q.globs.length === 0) return !1;
    if (!G || G.startsWith("..") || isAbsolute_23(G)) return !1;
    return h3t.default().add(xst(q.globs, "claudemd_rule_globs")).ignores(G);
  });
}
/**
 * 从已加载文件中挑出 cwd 外的 include（parent 存在且非 User 类型），用于提示用户审批。
 */
//@ chunk-e6aww6q8.js:1352863-1353090 fingerprint = getExternalClaudeMdIncludes (0.793)
function getExternalClaudeMdIncludes(files) {
  let externals = [];
  for (let file of files) {
    if (file.type !== "User" && file.parent && !isWithinOriginalCwd(file.path))
      externals.push({ path: file.path, parent: file.parent });
    if (file.type !== "User" && file.linkedFrom !== void 0 && !isWithinOriginalCwd(file.path))
      externals.push({ path: file.path, parent: file.linkedFrom });
  }
  return externals;
}
//@ chunk-e6aww6q8.js:1353090-1353129 placement
function hasExternalClaudeMdIncludes(files) {
  return getExternalClaudeMdIncludes(files).length > 0;
}
//@ chunk-e6aww6q8.js:1353286-1353294 placement
var W3t;
//@ chunk-e6aww6q8.js:1353294-1353316 placement
function q3t(e) {
  W3t = e;
}
//@ chunk-e6aww6q8.js:1353316-1353381 placement
function K3t(e, n, r) {
  return W3t?.(e, n, r) ?? Promise.resolve(void 0);
}
/**
 * 判断路径是否为指令文件（CLAUDE.md、CLAUDE.local.md 或 .claude/rules/*.md），返回其所属项目目录。
 */
//@ chunk-e6aww6q8.js:3155916-3156204 fingerprint = isMemoryFilePath (0.962)
function isMemoryFilePath(filePath) {
  let name = basename_46(filePath),
    r,
    index = filePath.indexOf(`${sep_48}.claude${sep_48}rules${sep_48}`);
  if (index >= 0) r = name.endsWith(".md") ? filePath.slice(0, index) : void 0;
  else if (name === "CLAUDE.md" || name === "CLAUDE.local.md" || NKe.includes(name)) {
    if (((r = dirname_47(filePath)), name === "CLAUDE.md" && basename_46(r) === ".claude")) r = dirname_47(r);
  }
  return r !== void 0 && r !== parse_9(r).root ? r : void 0;
}
/**
 * 注入 CLAUDE.md 内容前的固定前言（These instructions OVERRIDE any default behavior）。
 */
//@ chunk-4121qate.js:104278-104481 fingerprint = MEMORY_INSTRUCTION_PROMPT (1)
var MEMORY_INSTRUCTION_PROMPT =
  "Codebase and user instructions are shown below. Be sure to adhere to these instructions. IMPORTANT: These instructions OVERRIDE any default behavior and you MUST follow them exactly as written.";
/**
 * 记忆类型 → 系统提示里文件标题后的说明（project instructions / user's private global instructions 等）。
 */
//@ chunk-4121qate.js:104481-104870 fingerprint = getClaudeMds (0.745)
function getClaudeMds(e) {
  switch (e) {
    case "Project":
      return " (project instructions, checked into the codebase)";
    case "Local":
      return " (user's private project instructions, not checked in)";
    case "AutoMem":
      return " (user's auto-memory, persists across conversations)";
    case "Managed":
      return " (organization-managed policy instructions)";
    case "User":
      return " (user's private global instructions for all projects)";
  }
}
/**
 * 列出托管 CLAUDE.md/rules 中引用了外部文件的 include，供外部引用审批对话框使用。
 */
//@ chunk-cjydagjy.js:15359-15659 callgraph-fingerprint = shouldShowClaudeMdExternalIncludesWarning (0.207)
async function shouldShowClaudeMdExternalIncludesWarning() {
  if (isClaudeMdLoadingDisabled() || wt() || isDiskless()) return [];
  let e = new Set(),
    r = getCurrentProjectConfig().hasClaudeMdExternalIncludesApproved || !1;
  return [
    ...(await isInstructionsMemoryType_3(getMemoryPath("Managed"), "Managed", e, r)),
    ...(await processMdRules({
      rulesDir: getManagedClaudeRulesDir(),
      type: "Managed",
      processedPaths: e,
      includeExternal: r,
      conditionalRule: !1,
    })),
  ].map((s) => [s.path, s.content, s.unverified]);
}

export {
  getMemoryFilesCached,
  getLargeMemoryFiles,
  getOversizedMemoryWarning,
  getMaxMemoryFileChars,
  getWithheldInstructionFiles,
  clearMemoryFilesCacheForHost,
  isLocalSettingsReadable,
  shouldShowClaudeMdExternalIncludesWarning,
  oEt,
  shouldInjectMemoryFile,
  VGt,
  getWorktreeRoots,
  beginCwdRelocationHold,
  getMemoryFilesForNestedDirectory,
  isInMainRepoOutsideWorktree,
  r9s,
  resetGetMemoryFilesCache,
  Z8s,
  getExternalClaudeMdIncludes,
  getClaudeMds,
  MEMORY_INSTRUCTION_PROMPT,
  hasExternalClaudeMdIncludes,
  s$i,
  isInstructionsMemoryType_3,
  MAX_INCLUDE_DEPTH,
  processMdRules,
  NA,
  isSpecialOrUnsafePath,
  isNonCanonicalSymlink,
  lexMarkdown,
  claudeMdExtraState,
  getAdditionalClaudeMdDirs,
  K3t,
  getManagedAndUserConditionalRules,
  getConditionalRulesForCwdLevelDirectory,
  applyClaudeMdExcludesToInjected,
  HQ,
  x0o,
  ClaudeMdAccessTracker,
  q0o,
  q3t,
  L_e,
  stripHtmlComments,
  nextEagerLoadReason,
  isMemoryFilePath,
  isInstructionSourceEnabled,
  createHeldPathTracker,
  claudeMdLoadStateByHost,
  n9s,
  processMemoryFile,
  t9s,
  e9s,
};
