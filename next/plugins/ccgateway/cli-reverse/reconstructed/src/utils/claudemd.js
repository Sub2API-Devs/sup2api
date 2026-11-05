/**
 * utils/claudemd.ts
 *
 * CLAUDE.md 指令文件的发现与加载：托管/用户/项目/本地层级、.claude/rules 条件规则、@include 递归、排除规则、外部引用审批与缓存。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/claudemd.ts
 * pieces: chunk-5xgkngpb.js (101), chunk-h61dq9nz.js (1), chunk-j8f885h1.js (2)
 * attribution: placement 44, layout 29, fingerprint 20, callgraph-witnessed 1, affinity 4, callgraph-fingerprint 3, file-local 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  isAbsolute,
  join,
  sep,
  basename,
  extname,
  dirname,
  relative,
  resolve as resolve_2,
  parse,
} from "path";
import { __toESM } from "../../runtime/bun-runtime.js";
import { require_ignore } from "../../vendor/ignore/index.js";
import { _Tokenizer, _Lexer } from "../../vendor/marked/lib/marked.esm.js";
import { require_picomatch_2 } from "../../vendor/picomatch/index.js";
import { backfillState, backfillMemoryIndex } from "../memdir/memoryIndex.js";
import {
  nfcLowerPath,
  indexLinkedMemoryPaths,
  MAX_TRACKED_INSTRUCTION_PATHS,
  logWithheldInstructionFiles,
  restrictedInstructionReaders,
  isInstructionReadRestricted,
  repoInstructionReaders,
  claudeMdAccessTrackerSlot,
  instructionFilesInDir,
  INSTRUCTION_FILE_NAMES,
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
import { POLICY_HELPER_TAG } from "./settings/policyHelper/policyHelper.js";
import { getMainLoopModel, CONTEXT_WINDOW_THRESHOLD } from "./model/model.js";
import { getContextWindow } from "./model/configs.js";
import { bytesPerTokenForModel } from "./model/modelDisplay.js";
import { pathInWorkingPath } from "./permissions/filesystem.js";
import { parseFrontmatter } from "./frontmatterParser.js";
import { unwrapResults } from "./suggestions/slackChannelSuggestions.js";
import { logForDebugging } from "./debug.js";
import { sanitizeMemoryText, truncateEntrypointContent } from "../memdir/memdir.js";
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
  isNetworkMountPath,
  neverOtherHostMount,
  isNetDir,
  isNetworkMountRoot_2,
  isNetworkishPath,
} from "./networkPaths.js";
import { getInitialSettings, getSettingsForSource } from "./settings/settings.js";
import { normalizePathForCompare } from "./file.js";
import { getDevicePathRefusal } from "../tools/FileReadTool/FileReadTool.js";
import {
  isManagedFolderWritable,
  managedFolderCondition,
  formatMemoryInstruction,
} from "../plugins/functionHooks/sites/promptContextSites.js";
import { isValidKeySegment, STORAGE_SPACES } from "./storage/storageSpaces.js";
import { env } from "./env.js";
import { PathSpace } from "./resultError.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { findGitRoot, findCanonicalGitRoot } from "./git.js";
import { isUncOrDevicePath, isDevicePrefixPath, isMacSpecialPath } from "./pathClassification.js";
import { getSessionEntrypoint } from "./sessionShape.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { getManagedFilePath } from "./settings/managedPath.js";
import { remoteClaudeMd } from "./settings/policyHelper/helperRemote.js";
import { countWhere } from "./collections.js";
import { hasInstructionsLoadedHook, executeInstructionsLoadedHooks } from "./hooks.js";
import { isInstructionsMemoryType } from "../entrypoints/sdk/coreSchemas.js";
import { notifySetupGuideLoaded } from "./commandPredicates.js";
import { clearMemoryFilesCache } from "../components/Message.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { shouldIncludeMemoryFile } from "./attachments.js";
import { filterUsableIgnorePatterns } from "./ignorePatterns.js";
import { isClaudeMdLoadingDisabled } from "./settings/customizationDisabled.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-j8f885h1.js:84884-85087 fingerprint (2.1.88 match: MEMORY_INSTRUCTION_PROMPT, 1)
/**
 * 注入 CLAUDE.md 内容前的固定前言（These instructions OVERRIDE any default behavior）。
 */
var MEMORY_INSTRUCTION_PROMPT =
  "Codebase and user instructions are shown below. Be sure to adhere to these instructions. IMPORTANT: These instructions OVERRIDE any default behavior and you MUST follow them exactly as written.";
//@ chunk-j8f885h1.js:85087-85476 fingerprint (2.1.88 match: getClaudeMds, 0.745)
/**
 * 记忆类型 → 系统提示里文件标题后的说明（project instructions / user's private global instructions 等）。
 */
function getClaudeMds(type) {
  switch (type) {
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
//@ chunk-5xgkngpb.js:1309562-1309582 placement
/**
 * 惰性加载的 minimatch 模块（用于规则 glob 匹配）。
 */
var minimatchModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1309562", () => {
  minimatchModule = __toESM(require_ignore(), 1);
});
//@ chunk-5xgkngpb.js:1309582-1309773 placement
/**
 * 多行模式匹配 Setext 下划线。
 */
var SETEXT_UNDERLINE_RE = /^ {0,3}(?:=+|-+) *$/;
var SETEXT_UNDERLINE_MULTILINE_RE = /^ {0,3}(?:=+|-+) *$/m;
var MARKDOWN_BLOCK_START_RE =
  /^(?:\s*$|(?:[*+-]|\d{1,9}[.)]) |(?: {4}| {0,3}\t)| {0,3}(?:`{3,}|~{3,})| {0,3}>| {0,3}#{1,6}| {0,3}<[^\n>]+>$|.*[\u2028\u2029])/;
//@ chunk-5xgkngpb.js:1309773-1309947 placement
let ClaudeMdTokenizer; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1309773", () => {
  ClaudeMdTokenizer = class ClaudeMdTokenizer extends _Tokenizer {
    lexed = [];
    lheading(line) {
      let last = this.lexed.at(-1);
      return last !== undefined &&
        !last.inReach.has(line.length) &&
        (last.text.at(-line.length - 1) ??
          `
`) ===
          `
`
        ? undefined
        : super.lheading(line);
    }
  };
});
//@ chunk-5xgkngpb.js:1309947-1310336 placement
let ClaudeMdLexer; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1309947", () => {
  ClaudeMdLexer = class ClaudeMdLexer extends _Lexer {
    #e;
    constructor() {
      let tokenizer = new ClaudeMdTokenizer();
      super({
        gfm: false,
        tokenizer,
      });
      this.#e = tokenizer;
    }
    blockTokens(text, tokens = [], strict = false) {
      let seen = new Set();
      let underlineAt = SETEXT_UNDERLINE_MULTILINE_RE.test(text) ? text.length : -1;
      let done = false;
      while (underlineAt >= 0) {
        let position =
          underlineAt === 0
            ? 0
            : text.lastIndexOf(
                `
`,
                underlineAt - 1,
              ) + 1;
        let sliced = text.slice(position, underlineAt);
        if (done) seen.add(text.length - position);
        done = SETEXT_UNDERLINE_RE.test(sliced) || (done && !MARKDOWN_BLOCK_START_RE.test(sliced));
        underlineAt = position - 1;
      }
      this.#e.lexed.push({
        text,
        inReach: seen,
      });
      try {
        return super.blockTokens(text, tokens, strict);
      } finally {
        this.#e.lexed.pop();
      }
    }
  };
});
//@ chunk-5xgkngpb.js:1310336-1310376 layout
/**
 * 用定制 marked 词法器（gfm 关闭）把 markdown 切成 token，供 HTML 注释剥离与 @include 提取使用。
 */
function lexMarkdown(text) {
  return new ClaudeMdLexer().lex(text);
}
//@ chunk-5xgkngpb.js:1310376-1310464 fingerprint (2.1.88 match: stripHtmlComments, 0.722)
/**
 * 去掉 markdown 中的 HTML 注释（不进入代码块）。
 */
function stripHtmlComments(content) {
  if (!content.includes("<!--"))
    return {
      content,
      stripped: false,
    };
  return stripHtmlCommentsFromTokens(lexMarkdown(content));
}
//@ chunk-5xgkngpb.js:1310464-1310724 fingerprint (2.1.88 match: stripHtmlCommentsFromTokens, 1)
function stripHtmlCommentsFromTokens(tokens) {
  let result = "";
  let stripped = false;
  let commentSpan = /<!--[\s\S]*?-->/g;
  for (let token of tokens) {
    if (token.type === "html") {
      let trimmed = token.raw.trimStart();
      if (trimmed.startsWith("<!--") && trimmed.includes("-->")) {
        let residue = token.raw.replace(commentSpan, "");
        stripped = true;
        if (residue.trim().length > 0) result += residue;
        continue;
      }
    }
    result += token.raw;
  }
  return {
    content: result,
    stripped,
  };
}
//@ chunk-5xgkngpb.js:1310724-1310744 placement
/**
 * 惰性加载的 picomatch 模块。
 */
var picomatchModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1310724", () => {
  picomatchModule = __toESM(require_picomatch_2(), 1);
});
//@ chunk-5xgkngpb.js:1311065-1311084 placement
/**
 * 记忆文件占上下文窗口的预警比例（0.8）。
 */
var MEMORY_SIZE_WARN_RATIO = 0.8;
var MEMORY_SIZE_SOFT_RATIO = 0.7;
//@ chunk-5xgkngpb.js:1315871-1316086 placement
function ensureMemoryIndexBackfill(host, memoryDir) {
  let state = backfillState.of(host);
  let existing = state.get(memoryDir);
  if (existing) return existing;
  let resolve;
  let promise = new Promise((resolve_2) => (resolve = resolve_2)).then(() =>
    backfillMemoryIndex(
      memoryDir,
      () => {
        if (state.get(memoryDir) === promise) state.delete(memoryDir);
      },
      () => {
        if (state.get(memoryDir) === promise) state.set(memoryDir, Promise.resolve(false));
      },
    ),
  );
  state.set(memoryDir, promise);
  resolve();
  return promise;
}
//@ chunk-5xgkngpb.js:1316176-1316273 placement
/**
 * 记忆文件路径跟踪的上限（2000）。
 */
var MAX_TRACKED_MEMORY_PATHS = 2000;
var MD_LINK_RE = /\]\(([^()\n]+?\.md)\)/gi;
var EMPTY_ACCESS_STATE = {
  resolved: false,
  read: false,
  written: false,
  injection: "none",
};
//@ chunk-5xgkngpb.js:1316273-1318036 placement
/**
 * 跟踪本会话中 CLAUDE.md 等指令文件的读写情况。
 */
class ClaudeMdAccessTracker {
  memoryContext = null;
  surfacedKeys = new Set();
  accessedKeys = new Map();
  recordContextBuild(build) {
    let { memoryDir } = build;
    this.memoryContext = {
      memoryDir:
        memoryDir === null
          ? null
          : {
              path: memoryDir,
              key: nfcLowerPath(memoryDir),
            },
      bodyKeys: new Set(build.injectedBodyPaths.slice(0, MAX_TRACKED_MEMORY_PATHS).map(nfcLowerPath)),
      listedKeys: new Set(
        memoryDir === null
          ? []
          : build.indexContents
              .flatMap((indexContent) => indexLinkedMemoryPaths(indexContent, memoryDir))
              .slice(0, MAX_TRACKED_MEMORY_PATHS)
              .map(nfcLowerPath),
      ),
    };
  }
  recordSurfaced(paths) {
    for (let path of paths) {
      if (this.surfacedKeys.size >= MAX_TRACKED_MEMORY_PATHS) return;
      this.surfacedKeys.add(nfcLowerPath(path));
    }
  }
  recordAccess(path, mode) {
    let key = nfcLowerPath(path);
    let prior = this.accessedKeys.get(key);
    if (prior === undefined && this.accessedKeys.size >= MAX_TRACKED_MEMORY_PATHS) return;
    let status = mode === "read" ? "read" : "written";
    this.accessedKeys.set(key, prior === undefined || prior === status ? status : "read_written");
  }
  priorAccess(path) {
    return this.accessedKeys.get(nfcLowerPath(path)) ?? "none";
  }
  injection(path) {
    let injection = this.injectionForKey(nfcLowerPath(path));
    return this.memoryContext === null && injection === "none" ? "unknown" : injection;
  }
  citedStatus(path) {
    let memoryContext = this.memoryContext;
    let memoryDir = memoryContext?.memoryDir ?? null;
    let trimmed = path.trim();
    if (
      memoryContext === null ||
      memoryDir === null ||
      trimmed === "" ||
      trimmed.split(/[\\/]/).includes("..")
    )
      return EMPTY_ACCESS_STATE;
    let fileName = /\.md$/i.test(trimmed) ? trimmed : `${trimmed}.md`;
    let key = nfcLowerPath(isAbsolute(fileName) ? fileName : join(memoryDir.path, fileName));
    let dirPrefix = memoryDir.key + sep;
    if (!key.startsWith(dirPrefix)) return EMPTY_ACCESS_STATE;
    let status = this.statusForKey(key);
    if (status.resolved || /[\\/]/.test(trimmed)) return status;
    let baseName = basename(key);
    let candidates = new Set(
      [
        ...memoryContext.bodyKeys,
        ...memoryContext.listedKeys,
        ...this.surfacedKeys,
        ...this.accessedKeys.keys(),
      ].filter((candidate) => candidate.startsWith(dirPrefix) && basename(candidate) === baseName),
    );
    return candidates.size === 1 ? this.statusForKey([...candidates][0]) : status;
  }
  reset() {
    this.memoryContext = null;
    this.surfacedKeys.clear();
    this.accessedKeys.clear();
  }
  injectionForKey(path) {
    return this.memoryContext?.bodyKeys.has(path)
      ? "body"
      : this.surfacedKeys.has(path)
        ? "surfaced"
        : this.memoryContext?.listedKeys.has(path)
          ? "listed"
          : "none";
  }
  statusForKey(path) {
    let access = this.accessedKeys.get(path) ?? "none";
    let injection = this.injectionForKey(path);
    return {
      resolved: access !== "none" || injection !== "none",
      read: access === "read" || access === "read_written",
      written: access === "written" || access === "read_written",
      injection,
    };
  }
}
//@ chunk-5xgkngpb.js:1329213-1329257 placement
/**
 * 去掉 alwaysDenyRules 后合并持久化拒绝规则。
 */
var withNoDenyRules = (toolPermissionContext) =>
  mergePersistedDenyRules({
    ...toolPermissionContext,
    alwaysDenyRules: {},
  });
//@ chunk-5xgkngpb.js:1329257-1329363 placement
/**
 * 判断某设置来源的指令文件是否可读（来源已启用，或工作区限制下仍保留指令文件）。
 */
function isInstructionSourceEnabled(source) {
  if (isSettingSourceEnabled(source)) return true;
  let workspaceRestriction = getWorkspaceRestriction();
  return (
    workspaceRestriction !== null &&
    workspaceRestriction.sparesInstructionFiles &&
    getAllowedSettingSourcesAsConfigured().includes(source)
  );
}
//@ chunk-5xgkngpb.js:1329363-1329463 placement (2.1.88 match: _temp8, 1)
/**
 * 判断本地设置来源是否可读（已启用或工作区限制允许）。
 */
function isLocalSettingsReadable() {
  if (isSettingSourceEnabled("localSettings")) return true;
  return (
    getWorkspaceRestriction() !== null && getAllowedSettingSourcesAsConfigured().includes("localSettings")
  );
}
//@ chunk-5xgkngpb.js:1329463-1329671 placement
/**
 * CLAUDE.md 加载的会话状态（加载/迁移缓存、下次加载原因、钩子开关等）与附加状态。
 */
var claudeMdSessionState_2; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var claudeMdExtraState;
deferInit("chunk-5xgkngpb.js:1329463", () => {
  claudeMdSessionState_2 = new SessionRootSlot(() => ({
    memo: {
      loads: new Map(),
      moves: new Map(),
    },
    nextEagerLoadReason: "session_start",
    shouldFireHook: true,
    walkEpoch: 0,
    hasLoggedInitialLoad: false,
    judgedBy: undefined,
    reportsSetupGuides: true,
  }));
  claudeMdExtraState = new SessionRootSlot(() => ({}));
});
//@ chunk-5xgkngpb.js:1329671-1329703 placement
/**
 * 取某会话的 CLAUDE.md 装载状态。
 */
function claudeMdSessionState(session) {
  return claudeMdSessionState_2.of(session);
}
//@ chunk-5xgkngpb.js:1329703-1329738 placement
/**
 * 记录 CLAUDE.md 判定的来源。
 */
function setClaudeMdJudgedBy(session, judgedBy) {
  claudeMdSessionState(session).judgedBy = judgedBy;
}
//@ chunk-5xgkngpb.js:1329738-1329956 placement
/**
 * 创建"被扣留路径"跟踪器：判断路径是否应扣留，并列出已扣留与已加载的路径。
 */
function createHeldPathTracker(session) {
  let heldPaths = new Map();
  return {
    held: buildHeldOutsideChecker(session, (path, reason) => {
      heldPaths.set(path, reason);
    }),
    withheld: () =>
      Array.from(heldPaths)
        .flatMap(([path, reason]) =>
          reason === undefined
            ? []
            : [
                {
                  path,
                  why: reason,
                },
              ],
        )
        .slice(0, MAX_TRACKED_INSTRUCTION_PATHS),
    loaded: () => Array.from(heldPaths).flatMap(([path, reason]) => (reason === undefined ? [path] : [])),
  };
}
//@ chunk-5xgkngpb.js:1329956-1330095 placement
/**
 * 开始工作目录迁移时的扣留跟踪，keep 时记录被扣留的指令文件。
 */
function beginCwdRelocationHold(session) {
  let { memo } = claudeMdSessionState(session);
  let originalCwdOrNull = getOriginalCwdOrNull();
  let heldPathTracker = createHeldPathTracker(session);
  return {
    held: heldPathTracker.held,
    keep: () => {
      if (originalCwdOrNull !== null) memo.moves.set(originalCwdOrNull, heldPathTracker.withheld());
      logWithheldInstructionFiles(session, heldPathTracker.withheld());
    },
  };
}
//@ chunk-5xgkngpb.js:1330095-1330312 placement
function buildHeldOutsideChecker(session, denyRules) {
  let mergedRules = mergePersistedDenyRules(
    session.engineStore.current?.getState().toolPermissionContext ??
      claudeMdSessionState(session).judgedBy ??
      getEmptyToolPermissionContext(),
  );
  if (getOriginalCwdOrNull() === null)
    return restrictedInstructionReaders(
      {
        context: mergedRules,
        folders: getAdditionalClaudeMdDirs(),
      },
      denyRules,
    );
  return isInstructionReadRestricted(mergedRules)
    ? repoInstructionReaders(
        {
          context: mergedRules,
          isHeldOutside: isRestrictedReadBlocked,
        },
        denyRules,
      )
    : undefined;
}
//@ chunk-5xgkngpb.js:1330312-1330503 placement
/**
 * 列出当前工作目录下被扣留的指令文件（去重）。
 */
function getWithheldInstructionFiles(sessionContext) {
  let { memo } = claudeMdSessionState(sessionContext);
  let originalCwdOrNull = getOriginalCwdOrNull();
  let settled = memo.loads.get(false)?.settled;
  let heldPaths = new Set();
  return (settled?.root === originalCwdOrNull ? settled.withheld : [])
    .concat(originalCwdOrNull === null ? [] : (memo.moves.get(originalCwdOrNull) ?? []))
    .filter(({ path }) => !heldPaths.has(path) && heldPaths.add(path));
}
//@ chunk-5xgkngpb.js:1330503-1330532 placement
/**
 * 托管设置在记忆文件列表里的虚拟路径标签。
 */
var MANAGED_SETTINGS_LABEL = "<managed-settings>";
//@ chunk-5xgkngpb.js:1330532-1330572 placement
/**
 * 判断路径是否为托管设置或虚拟路径。
 */
function isManagedOrVirtualPath(path) {
  return path === POLICY_HELPER_TAG || path === MANAGED_SETTINGS_LABEL;
}
//@ chunk-5xgkngpb.js:1330572-1330606 placement
/**
 * 单个记忆文件占模型上下文窗口的比例（0.05）。
 */
var MEMORY_CONTEXT_RATIO = 0.05;
var MAX_MEMORY_FILE_READ_BYTES = 4194304;
var MIN_MEMORY_FILE_CHARS = 40000;
//@ chunk-5xgkngpb.js:1330606-1330721 placement
/**
 * 按模型上下文窗口计算单个记忆文件的最大字符数。
 */
function getMaxMemoryFileChars(modelName = getMainLoopModel()) {
  let contextWindow = getContextWindow(modelName, getSdkBetas());
  let result = Number.isFinite(contextWindow) && contextWindow > 0 ? contextWindow : CONTEXT_WINDOW_THRESHOLD;
  return Math.max(
    MIN_MEMORY_FILE_CHARS,
    Math.round(result * MEMORY_CONTEXT_RATIO * bytesPerTokenForModel(modelName)),
  );
}
//@ chunk-5xgkngpb.js:1330721-1330736 placement
/**
 * 记忆文件字符数的绝对下限（120000）。
 */
var ABSOLUTE_MAX_MEMORY_FILE_CHARS = 120000;
//@ chunk-5xgkngpb.js:1330736-1330780 placement
/**
 * 取记忆文件字符上限（不低于绝对下限）。
 */
function maxMemoryFileChars(type) {
  return Math.max(ABSOLUTE_MAX_MEMORY_FILE_CHARS, getMaxMemoryFileChars(type));
}
//@ chunk-5xgkngpb.js:1330780-1331587 fingerprint (2.1.88 match: TEXT_FILE_EXTENSIONS, 1)
var TEXT_FILE_EXTENSIONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1330780", () => {
  TEXT_FILE_EXTENSIONS = new Set([
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
});
//@ chunk-5xgkngpb.js:1331587-1331620 layout
function isWithinOriginalCwd(path) {
  return pathInWorkingPath(path, getOriginalCwd());
}
//@ chunk-5xgkngpb.js:1331620-1331872 fingerprint (2.1.88 match: parseFrontmatterPaths, 1)
/**
 * 从 frontmatter 读 paths: glob 列表（去掉结尾 /**，全是 ** 视为无条件），返回正文和 paths。
 */
function parseFrontmatterPaths(rawContent) {
  let { frontmatter, content } = parseFrontmatter(rawContent);
  if (!frontmatter.paths)
    return {
      content,
    };
  let patterns = unwrapResults(frontmatter.paths)
    .map((pattern) => (pattern.endsWith("/**") ? pattern.slice(0, -3) : pattern))
    .filter((entry) => entry.length > 0);
  if (patterns.length === 0 || patterns.every((pattern) => pattern === "**"))
    return {
      content,
    };
  return {
    content,
    paths: patterns,
  };
}
//@ chunk-5xgkngpb.js:1331872-1332347 fingerprint (2.1.88 match: parseMemoryFileContent, 0.919)
/**
 * 解析记忆文件内容：非文本扩展名跳过；剥离 frontmatter（paths: 作为条件规则 glob）；去 HTML 注释；提取 @include 路径；AutoMem 类型按 200 行/25000 字节截断。
 */
function parseMemoryFileContent(rawContent, filePath, type, includeBasePath) {
  let ext = extname(filePath).toLowerCase();
  if (ext && !TEXT_FILE_EXTENSIONS.has(ext)) {
    logForDebugging(`Skipping non-text file in @include: ${filePath}`);
    return {
      info: null,
      includePaths: [],
    };
  }
  let { content: withoutFrontmatter, paths } = parseFrontmatterPaths(rawContent);
  let hasComment = withoutFrontmatter.includes("<!--");
  let hasAtSign = includeBasePath !== undefined && withoutFrontmatter.includes("@");
  let tokens = hasComment || hasAtSign ? lexMarkdown(withoutFrontmatter) : undefined;
  let strippedContent =
    hasComment && tokens ? stripHtmlCommentsFromTokens(tokens).content : withoutFrontmatter;
  let includePaths =
    tokens && includeBasePath !== undefined ? extractIncludePathsFromTokens(tokens, includeBasePath) : [];
  let finalContent = strippedContent;
  if (type === "AutoMem")
    finalContent = sanitizeMemoryText(truncateEntrypointContent(strippedContent).content);
  let contentDiffersFromDisk = finalContent !== rawContent;
  return {
    info: {
      path: filePath,
      type,
      content: finalContent,
      globs: paths,
      contentDiffersFromDisk,
      rawContent: contentDiffersFromDisk ? rawContent : undefined,
    },
    includePaths,
  };
}
//@ chunk-5xgkngpb.js:1332347-1332429 fingerprint (2.1.88 match: processMemoryFile, 0.418)
function processMemoryFile(rawContent, name, type) {
  if (!rawContent.includes("@")) return [];
  return parseMemoryFileContent(rawContent, name, type, name).includePaths;
}
//@ chunk-5xgkngpb.js:1332429-1332549 layout
function buildInjectedAutoMemFile(coworkMemoryIndexContent) {
  let { content } = truncateEntrypointContent(coworkMemoryIndexContent);
  return {
    path: getAutoMemEntrypoint(),
    type: "AutoMem",
    content,
    contentDiffersFromDisk: true,
    rawContent: coworkMemoryIndexContent,
  };
}
//@ chunk-5xgkngpb.js:1332549-1332618 layout
/**
 * CLAUDE_COWORK_MEMORY_INDEX_CONTENT：由宿主直接提供的 MEMORY.md 内容。
 */
function getCoworkMemoryIndexContent() {
  return process.env.CLAUDE_COWORK_MEMORY_INDEX_CONTENT;
}
//@ chunk-5xgkngpb.js:1332618-1332749 layout
function isAutoMemPathWithinAutoMemDir(autoMemEntrypoint) {
  if (!isReadBlockOn()) return true;
  let mapped = getPathsForPermissionCheck(getAutoMemPath()).map((autoMemPath) =>
    autoMemPath.endsWith(sep) ? autoMemPath : autoMemPath + sep,
  );
  return getPathsForPermissionCheck(autoMemEntrypoint).every((entryPoint) =>
    mapped.some((safePath) => isAutoMemPathSafeForCarveout(entryPoint, safePath)),
  );
}
//@ chunk-5xgkngpb.js:1332749-1332840 layout
class ClaudeMdLoadState {
  memoryReadEacces = false;
  memoryReadFailed = false;
  skip = false;
  rulesWalk = false;
  announcedFileCut = false;
}
//@ chunk-5xgkngpb.js:1332840-1332867 layout
var claudeMdLoadStateByHost; // deferred: uses ClaudeMdLoadState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1332840", () => {
  claudeMdLoadStateByHost = new HostScoped(() => new ClaudeMdLoadState());
});
//@ chunk-5xgkngpb.js:1332867-1332906 layout
function getClaudeMdLoadState() {
  return claudeMdLoadStateByHost.of(getRootSession().host);
}
//@ chunk-5xgkngpb.js:1332906-1333017 layout
function reportSkippedSpecialMemoryFile() {
  let claudeMdLoadState = getClaudeMdLoadState();
  if (!claudeMdLoadState.skip) {
    claudeMdLoadState.skip = true;
    logFeatureSad("context_claude_md_load", "file_skipped_special_or_oversize");
  }
}
//@ chunk-5xgkngpb.js:1333017-1333079 layout
function countConfigDirMentions(text) {
  let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
  return claudeConfigDirOrNull !== null && text.includes(claudeConfigDirOrNull) ? 1 : 0;
}
//@ chunk-5xgkngpb.js:1333079-1333116 layout
function getUserRulesDirOrNull() {
  return isDiskless() ? null : getUserClaudeRulesDir();
}
//@ chunk-5xgkngpb.js:1333116-1333146 layout
function handleMemoryFileReadErrno(error, filePath) {
  handleMemoryFileReadError(getErrnoCode(error), filePath);
}
//@ chunk-5xgkngpb.js:1333146-1333518 fingerprint (2.1.88 match: handleMemoryFileReadError, 0.616)
/**
 * 记忆文件读取错误处理：ENOENT/EISDIR/ENOTDIR 静默，EACCES 记录并打标。
 */
function handleMemoryFileReadError(error, filePath) {
  if (error === "ENOENT" || error === "EISDIR" || error === "ENOTDIR") return;
  if (error === "EACCES")
    logEvent("tengu_claude_md_permission_error", {
      is_access_error: 1,
      has_home_dir: countConfigDirMentions(filePath),
    });
  let claudeMdLoadState = getClaudeMdLoadState();
  if (error === "EACCES") {
    if (!claudeMdLoadState.memoryReadEacces) {
      claudeMdLoadState.memoryReadEacces = true;
      logFeatureSad("context_claude_md_load", "read_eacces");
    }
  } else if (!claudeMdLoadState.memoryReadFailed) {
    claudeMdLoadState.memoryReadFailed = true;
    logFeatureSad("context_claude_md_load", "read_failed");
  }
}
//@ chunk-5xgkngpb.js:1333518-1334057 layout
async function readMemoryFileFromStorage({ backend, key }) {
  let readResult = await backend.read([
    {
      key,
      offset: 0,
      length: MAX_MEMORY_FILE_READ_BYTES + 1,
    },
  ]);
  if (!readResult.ok) {
    let telemetryCode =
      readResult.error.code === "InvalidArgument" ? undefined : readResult.error.telemetryCode;
    if (telemetryCode === "ENXIO" || telemetryCode === "EFBIG")
      return {
        kind: "skipped",
        isDirectory: false,
      };
    if (telemetryCode === "EISDIR")
      return {
        kind: "skipped",
        isDirectory: true,
      };
    return {
      kind: "error",
      code: telemetryCode,
    };
  }
  let item = readResult.value.items[0];
  if (!item.found)
    return {
      kind: "absent",
    };
  if (item.totalBytes > MAX_MEMORY_FILE_READ_BYTES)
    return {
      kind: "skipped",
      isDirectory: false,
    };
  let data = item.value;
  return {
    kind: "content",
    content: Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8"),
  };
}
//@ chunk-5xgkngpb.js:1334057-1334683 callgraph-witnessed (2.1.88 match: safelyReadMemoryFileAsync, 0.249)
/**
 * 安全读取记忆文件（storage v5 或 fs），区分 absent/error/skipped/content，ENOENT 等静默，EACCES 记录一次。
 */
async function safelyReadMemoryFileAsync(filePath, type, includeBasePath, storageV5, readRaw) {
  try {
    let rawContent;
    let isDirectory = false;
    if (readRaw) {
      let rawContent = await readRaw(filePath, MAX_MEMORY_FILE_READ_BYTES);
      return rawContent === undefined
        ? {
            info: null,
            includePaths: [],
          }
        : parseMemoryFileContent(rawContent, filePath, type, includeBasePath);
    }
    if (storageV5) {
      let memoryFileFromStorage = await readMemoryFileFromStorage(storageV5);
      switch (memoryFileFromStorage.kind) {
        case "absent":
          return {
            info: null,
            includePaths: [],
          };
        case "error":
          handleMemoryFileReadError(memoryFileFromStorage.code, filePath);
          return {
            info: null,
            includePaths: [],
          };
        case "skipped":
          isDirectory = memoryFileFromStorage.isDirectory;
          rawContent = null;
          break;
        case "content":
          rawContent = memoryFileFromStorage.content;
          break;
      }
    } else {
      let fs = getFsImplementation();
      rawContent = await readSmallFileChecked(fs, filePath, MAX_MEMORY_FILE_READ_BYTES, (stats) => {
        isDirectory = stats.isDirectory();
      });
    }
    if (rawContent === null) {
      logForDebugging(
        `[CLAUDE.md] skipping ${filePath}: not a regular file or exceeds ${MAX_MEMORY_FILE_READ_BYTES} byte limit`,
      );
      if (!isDirectory) reportSkippedSpecialMemoryFile();
      return {
        info: null,
        includePaths: [],
      };
    }
    return parseMemoryFileContent(rawContent, filePath, type, includeBasePath);
  } catch (error) {
    handleMemoryFileReadErrno(error, filePath);
    return {
      info: null,
      includePaths: [],
    };
  }
}
//@ chunk-5xgkngpb.js:1334683-1335457 fingerprint (2.1.88 match: extractIncludePathsFromTokens, 1)
/**
 * 在 markdown token 中查找 @path 引用（跳过 code/codespan，HTML 注释外的残留文本仍扫描）；接受 ./、~/、绝对路径和普通相对名，去掉 #片段，按文件所在目录解析为绝对路径。
 */
function extractIncludePathsFromTokens(tokens, basePath) {
  let absolutePaths = new Set();
  function extractPathsFromText(textContent) {
    let includeRegex = /(?:^|\s)@((?:[^\s\\]|\\ )+)/g;
    let match;
    while ((match = includeRegex.exec(textContent)) !== null) {
      let path = match[1];
      if (!path) continue;
      let hashIndex = path.indexOf("#");
      if (hashIndex !== -1) path = path.substring(0, hashIndex);
      if (!path) continue;
      path = path.replaceAll("\\ ", " ");
      if (path) {
        if (
          !isSpecialOrUnsafePath(path) &&
          (path.startsWith("./") ||
            path.startsWith("~/") ||
            (path.startsWith("/") && path !== "/") ||
            (!path.startsWith("@") && !path.match(/^[#%^&*()]+/) && path.match(/^[a-zA-Z0-9._-]/)))
        ) {
          let resolvedPath = expandPath(path, dirname(basePath));
          absolutePaths.add(resolvedPath);
        }
      }
    }
  }
  function processElements(elements) {
    for (let element of elements) {
      if (element.type === "code" || element.type === "codespan") continue;
      if (element.type === "html") {
        let raw = element.raw || "";
        let trimmed = raw.trimStart();
        if (trimmed.startsWith("<!--") && trimmed.includes("-->")) {
          let commentSpan = /<!--[\s\S]*?-->/g;
          let residue = raw.replace(commentSpan, "");
          if (residue.trim().length > 0) extractPathsFromText(residue);
        }
        continue;
      }
      if (element.type === "text") extractPathsFromText(element.text || "");
      if (element.tokens) processElements(element.tokens);
      if (element.items) processElements(element.items);
    }
  }
  processElements(tokens);
  return [...absolutePaths];
}
//@ chunk-5xgkngpb.js:1335457-1335467 layout
/**
 * @include 最大递归深度 5。
 */
var MAX_INCLUDE_DEPTH = 5;
//@ chunk-5xgkngpb.js:1335467-1335559 layout
function isNonCanonicalSymlink(filePath, info) {
  if (!info.isSymlink || info.isCanonical) return false;
  return !(info.resolvedPath === filePath && isUnderNetworkDirCached(filePath));
}
//@ chunk-5xgkngpb.js:1335559-1335817 fingerprint (2.1.88 match: isClaudeMdExcluded, 0.933)
/**
 * 按设置 claudeMdExcludes（picomatch，dot:true）构建排除匹配器，只作用于 User/Project/Local 类型。
 */
function isClaudeMdExcluded() {
  let patterns = getInitialSettings().claudeMdExcludes;
  if (!patterns || patterns.length === 0) return () => false;
  let expandedPatterns = isDuplicatePath_2(getFsImplementation(), patterns).filter(
    (pattern) => pattern.length > 0,
  );
  if (expandedPatterns.length === 0) return () => false;
  let matcher = picomatchModule.default(expandedPatterns, {
    dot: true,
  });
  return (path, type) =>
    (type === "User" || type === "Project" || type === "Local") && matcher(path.replaceAll("\\", "/"));
}
//@ chunk-5xgkngpb.js:1335817-1335868 affinity
function createClaudeMdExcludeMatcher() {
  let matcher;
  return (path, type) => (matcher ??= isClaudeMdExcluded())(path, type);
}
//@ chunk-5xgkngpb.js:1335868-1335961 affinity
/**
 * User/Project/Local 类型文件是否被 claudeMdExcludes 排除（托管与 AutoMem 不受影响）。
 */
function isExcludedByClaudeMdExcludes(path, type, matcher) {
  if (type !== "User" && type !== "Project" && type !== "Local") return false;
  return (matcher ?? isClaudeMdExcluded())(path, type);
}
//@ chunk-5xgkngpb.js:1335961-1336317 affinity
function applyClaudeMdExcludesToInjected(files, claudeMdExcludeMatcher = createClaudeMdExcludeMatcher()) {
  let byPath = new Map();
  for (let file of files) byPath.set(file.path, file);
  let excludedBy = new Map();
  let kept = [];
  for (let file of files) {
    let visited = [];
    let seenPaths = new Set();
    let current = file;
    let isExcluded = false;
    while (current) {
      let cachedExcluded = excludedBy.get(current.path);
      if (cachedExcluded !== undefined) {
        isExcluded = cachedExcluded;
        break;
      }
      if (seenPaths.has(current.path) || claudeMdExcludeMatcher(current.path, current.type)) {
        isExcluded = true;
        break;
      }
      seenPaths.add(current.path);
      visited.push(current.path);
      current = current.parent === undefined ? undefined : byPath.get(current.parent);
    }
    for (let visitedPath of visited) excludedBy.set(visitedPath, isExcluded);
    if (!isExcluded) kept.push(file);
  }
  return kept;
}
//@ chunk-5xgkngpb.js:1336637-1336746 affinity
/**
 * 记忆文件准入检查：已处理过、include 深度达到 5、被 claudeMdExcludes 排除或为特殊路径时返回 undefined，否则返回规范化路径。
 */
function checkMemoryFileAdmissible(filePath, type, processedPaths, depth, excludeMatcher) {
  let normalizedPath = normalizePathForCompare(filePath);
  if (processedPaths.has(normalizedPath) || depth >= MAX_INCLUDE_DEPTH) return;
  if (isExcludedByClaudeMdExcludes(filePath, type, excludeMatcher)) return;
  if (isSpecialOrUnsafePath(filePath)) return;
  return normalizedPath;
}
//@ chunk-5xgkngpb.js:1336746-1337710 callgraph-fingerprint (2.1.88 match: isInstructionsMemoryType, 0.281)
/**
 * 读取一个指令文件并递归展开其中的 @include：检查排除、深度（最多 5 层）、设备/特殊路径与符号链接；外部（cwd 外）include 需 hasClaudeMdExternalIncludesApproved；User 类型拒绝顶层符号链接与多硬链接文件。返回该文件及其 include 的列表。
 */
async function isInstructionsMemoryType_3(
  filePath,
  type,
  processedPaths,
  includeExternal,
  depth = 0,
  parent,
  storageV5,
  excludeMatcher,
  readRaw,
) {
  let normalizedPath = checkMemoryFileAdmissible(filePath, type, processedPaths, depth, excludeMatcher);
  if (normalizedPath === undefined) return [];
  let externalAllowed = includeExternal && (type !== "User" || allowsUserExternalIncludes());
  let resolvedInfo = safeResolvePath(getFsImplementation(), filePath);
  let { resolvedPath, isSymlink } = resolvedInfo;
  if (isSpecialOrUnsafePath(resolvedPath) || isNonCanonicalSymlink(filePath, resolvedInfo)) return [];
  if (
    getDevicePathRefusal(filePath, {
      spellings: isSymlink ? [filePath, resolvedPath] : [filePath],
      unresolved: false,
    }) !== undefined
  ) {
    logForDebugging(`[CLAUDE.md] skipping ${filePath}: it names a device or process file`);
    reportSkippedSpecialMemoryFile();
    return [];
  }
  if (depth > 0 && !externalAllowed && !isWithinOriginalCwd(resolvedPath)) return [];
  if (type === "User" && !externalAllowed)
    try {
      let stats = await getFsImplementation().lstat(filePath);
      if ((depth === 0 && stats.isSymbolicLink()) || ((stats.nlink ?? 1) > 1 && stats.isFile())) return [];
    } catch {}
  let resolvedKey = isSymlink ? normalizePathForCompare(resolvedPath) : undefined;
  if (resolvedKey !== undefined && processedPaths.has(resolvedKey)) return [];
  processedPaths.add(normalizedPath);
  let memoryFile =
    readRaw && (await safelyReadMemoryFileAsync(filePath, type, resolvedPath, storageV5, readRaw));
  if (memoryFile && !memoryFile.info) return [];
  if (resolvedKey !== undefined) processedPaths.add(resolvedKey);
  let { info: memoryFile_2, includePaths: resolvedIncludePaths } =
    memoryFile || (await safelyReadMemoryFileAsync(filePath, type, resolvedPath, storageV5));
  if (!memoryFile_2 || !memoryFile_2.content.trim()) return [];
  if (parent) memoryFile_2.parent = parent;
  if (type === "Managed" && isManagedFolderWritable(filePath)) memoryFile_2.unverified = true;
  let result = [];
  result.push(memoryFile_2);
  for (let resolvedIncludePath of resolvedIncludePaths) {
    if (!isWithinOriginalCwd(resolvedIncludePath) && !externalAllowed) continue;
    let childResults = await isInstructionsMemoryType_3(
      resolvedIncludePath,
      type,
      processedPaths,
      includeExternal,
      depth + 1,
      filePath,
      undefined,
      excludeMatcher,
      readRaw,
    );
    for (let childFile of memoryFile_2.unverified ? childResults : []) childFile.unverified = true;
    result.push(...childResults);
  }
  return result;
}
//@ chunk-5xgkngpb.js:1337710-1340041 fingerprint (2.1.88 match: processMdRules, 0.587)
/**
 * 遍历 .claude/rules 目录（递归、防环、跟随安全的符号链接）读取 *.md 规则；conditionalRule 控制只取带 paths: 的条件规则还是无条件规则。
 */
async function processMdRules({
  rulesDir,
  type,
  processedPaths,
  includeExternal,
  conditionalRule,
  visitedDirs = new Set(),
  storageV5,
  v5Descent,
  discoveredDir,
  linkedFrom,
  excludeMatcher,
  held,
}) {
  if (visitedDirs.has(rulesDir)) return [];
  try {
    let fs = getFsImplementation();
    let dirInfo = safeResolvePath(fs, rulesDir);
    let { resolvedPath, isSymlink, isCanonical } = dirInfo;
    if (isSpecialOrUnsafePath(resolvedPath) || isNonCanonicalSymlink(rulesDir, dirInfo)) return [];
    visitedDirs.add(rulesDir);
    if (isSymlink) visitedDirs.add(resolvedPath);
    let externalAllowed = includeExternal && (type !== "User" || allowsUserExternalIncludes());
    let userRulesDirOrNull = getUserRulesDirOrNull();
    let isProjectLevel =
      type !== "User" &&
      (userRulesDirOrNull === null || !pathInWorkingPath(discoveredDir ?? rulesDir, userRulesDirOrNull));
    let mayListDir =
      !externalAllowed || (linkedFrom === undefined && isProjectLevel && isCanonical && isSymlink);
    let dirIsLinked =
      mayListDir &&
      (await listRulesDirEntries(fs, rulesDir, type, storageV5, v5Descent)) &&
      !isWithinOriginalCwd(resolvedPath);
    let parentIsLinked =
      mayListDir &&
      !dirIsLinked &&
      type === "Project" &&
      isProjectLevel &&
      isSymlink &&
      !isWithinOriginalCwd(resolvedPath) &&
      isWithinWorkspaceOrAddDirs(dirname(dirname(rulesDir))) &&
      (await listRulesDirEntries(fs, dirname(rulesDir), type, storageV5, undefined));
    if (
      !externalAllowed &&
      (dirIsLinked ||
        (parentIsLinked &&
          (conditionalRule || !getCurrentProjectConfig().hasClaudeMdExternalIncludesApproved)))
    )
      return [];
    let discoveredDir_2 =
      linkedFrom ?? (dirIsLinked ? rulesDir : parentIsLinked ? dirname(rulesDir) : undefined);
    let canonicalDir = isCanonical ? resolvedPath : undefined;
    let listedLocation =
      !isCanonical || isSymlink
        ? undefined
        : (v5Descent ??
          (storageV5 !== undefined && type === "User" && rulesDir === getUserClaudeRulesDir()
            ? {
                backend: storageV5,
                relPath: [],
              }
            : undefined));
    let result = [];
    let entries;
    try {
      entries = await fs.readdir(resolvedPath);
    } catch (e) {
      let code = getErrnoCode(e);
      if (code === "ENOENT" || code === "EACCES" || code === "ENOTDIR") return [];
      throw e;
    }
    for (let entry of entries) {
      let entryPath = join(rulesDir, entry.name);
      let entryInfo = safeResolvePath(fs, entryPath);
      let { resolvedPath, isSymlink, isCanonical } = entryInfo;
      let entryPath_2 = join(discoveredDir ?? rulesDir, entry.name);
      if (entryPath_2 !== resolvedPath && isExcludedByClaudeMdExcludes(entryPath_2, type, excludeMatcher))
        continue;
      if (isSpecialOrUnsafePath(resolvedPath) || isNonCanonicalSymlink(entryPath, entryInfo)) continue;
      let stats = isSymlink ? await statRulesEntry(fs, resolvedPath, type, storageV5) : null;
      let isDirectory = stats ? stats.isDirectory() : entry.isDirectory();
      let isFile = stats ? stats.isFile() : entry.isFile();
      let storedRelPath =
        listedLocation !== undefined &&
        !isSymlink &&
        isCanonical &&
        isValidKeySegment(entry.name) &&
        resolvedPath === join(getUserClaudeRulesDir(), ...listedLocation.relPath, entry.name)
          ? [...listedLocation.relPath, entry.name]
          : undefined;
      let escapesCanonicalDir =
        canonicalDir !== undefined &&
        resolvedPath !== join(canonicalDir, entry.name) &&
        !isWithinOriginalCwd(resolvedPath);
      let linkedFrom = discoveredDir_2 ?? (escapesCanonicalDir && isProjectLevel ? entryPath_2 : undefined);
      if (isDirectory) {
        if (escapesCanonicalDir && !externalAllowed) continue;
        result.push(
          ...(await processMdRules({
            rulesDir: resolvedPath,
            type,
            processedPaths,
            includeExternal,
            conditionalRule,
            visitedDirs,
            storageV5,
            v5Descent:
              listedLocation && storedRelPath
                ? {
                    backend: listedLocation.backend,
                    relPath: storedRelPath,
                  }
                : undefined,
            discoveredDir: entryPath_2 !== resolvedPath ? entryPath_2 : undefined,
            linkedFrom,
            excludeMatcher,
            held,
          })),
        );
      } else if (isFile && entry.name.endsWith(".md")) {
        if (escapesCanonicalDir && !externalAllowed) continue;
        if (
          held &&
          entryPath_2 !== resolvedPath &&
          !processedPaths.has(normalizePathForCompare(resolvedPath)) &&
          (await held(entryPath_2, MAX_MEMORY_FILE_READ_BYTES)) === undefined
        )
          continue;
        let entryResults = await isInstructionsMemoryType_3(
          resolvedPath,
          type,
          processedPaths,
          includeExternal,
          0,
          undefined,
          listedLocation && storedRelPath
            ? {
                backend: listedLocation.backend,
                key: STORAGE_SPACES.userConfigDir("rules", storedRelPath),
              }
            : undefined,
          excludeMatcher,
          held,
        );
        if (type === "Managed" && isManagedFolderWritable(entryPath_2))
          for (let result of entryResults) result.unverified = true;
        let [firstResult] = entryResults;
        if (firstResult) {
          firstResult.isRule = true;
          if (linkedFrom !== undefined) firstResult.linkedFrom = linkedFrom;
        }
        result.push(...entryResults.filter((result) => (conditionalRule ? result.globs : !result.globs)));
      }
    }
    return result;
  } catch (error) {
    if (error instanceof Error && error.message.includes("EACCES"))
      logEvent("tengu_claude_rules_md_permission_error", {
        is_access_error: 1,
        has_home_dir: countConfigDirMentions(rulesDir),
      });
    let claudeMdLoadState = getClaudeMdLoadState();
    if (!claudeMdLoadState.rulesWalk) {
      claudeMdLoadState.rulesWalk = true;
      logFeatureSad("context_claude_md_load", "rules_walk_failed");
    }
    return [];
  }
}
//@ chunk-5xgkngpb.js:1340041-1340125 layout
function isWithinWorkspaceOrAddDirs(path) {
  if (pathInWorkingPath(getOriginalCwd(), path)) return true;
  let normalizedPath = normalizePathForCompare(path);
  return getAdditionalClaudeMdDirs().some((dir) => normalizePathForCompare(dir) === normalizedPath);
}
//@ chunk-5xgkngpb.js:1340125-1340212 layout
/**
 * 返回需要加载 CLAUDE.md 的额外目录（--add-dir），需开关 CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD 或对应设置。
 */
function getAdditionalClaudeMdDirs() {
  return (getClaudeMdAdditionalDirectoriesAsked() ??
    isEnvTruthy(env.CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD))
    ? getAdditionalDirectoriesForClaudeMd()
    : [];
}
//@ chunk-5xgkngpb.js:1340212-1340302 layout
function hostFileScopeForMemoryType(type, path) {
  return type === "Managed"
    ? PathSpace.system(path)
    : type === "User"
      ? PathSpace.home(path)
      : PathSpace.workspace(path);
}
//@ chunk-5xgkngpb.js:1340302-1340970 layout
async function listRulesDirEntries(fsImpl, dir, type, storageV5, v5Descent) {
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let statResult =
      type === "User" && (v5Descent !== undefined || dir === getUserClaudeRulesDir())
        ? await storageV5
            .scopeKind({
              namespace: "userConfigDir",
              dir: "rules",
              ...(v5Descent && {
                relPath: v5Descent.relPath,
              }),
            })
            .catch(() => {
              return;
            })
        : await storageV5.hostFiles
            .stat(hostFileScopeForMemoryType(type, dir), {
              follow: false,
            })
            .catch(() => {
              return;
            });
    if (statResult?.ok) return statResult.value.kind === "link";
    let telemetryCode =
      statResult !== undefined && statResult.error.code === "Failed"
        ? statResult.error.telemetryCode
        : undefined;
    if (errnoShapedCode(telemetryCode) !== undefined || /^ERR_[A-Z0-9_]+$/.test(telemetryCode ?? ""))
      return false;
    logForDebugging(
      `claudemd: the storage backend could not say whether the ${type} rules folder (or its .claude parent) is a symlink (${telemetryCode ?? statResult?.error.code ?? "no answer"}) \u2014 checking directly`,
    );
  }
  try {
    return (await fsImpl.lstat(dir)).isSymbolicLink();
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:1340970-1341707 layout
async function statRulesEntry(fsImpl, path, type, storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let statResult = await storageV5.hostFiles.stat(hostFileScopeForMemoryType(type, path)).catch(() => {
      return;
    });
    if (statResult?.ok) {
      let { kind } = statResult.value;
      if (kind === "absent")
        throw Object.assign(Error("ENOENT: rules entry target is gone"), {
          code: "ENOENT",
          syscall: "stat",
          path,
        });
      return {
        isDirectory: () => kind === "directory",
        isFile: () => kind === "file",
      };
    }
    let telemetryCode =
      statResult !== undefined && statResult.error.code === "Failed"
        ? statResult.error.telemetryCode
        : undefined;
    if (errnoShapedCode(telemetryCode) !== undefined || /^ERR_[A-Z0-9_]+$/.test(telemetryCode ?? ""))
      throw statResult !== undefined &&
        statResult.error.code === "Failed" &&
        statResult.error.cause instanceof Error
        ? statResult.error.cause
        : Object.assign(Error("rules entry stat failed"), {
            code: telemetryCode,
          });
    logForDebugging(
      `claudemd: the storage backend could not type a linked ${type} rules entry (${telemetryCode ?? statResult?.error.code ?? "no answer"}) \u2014 checking directly`,
    );
  }
  return fsImpl.stat(path);
}
//@ chunk-5xgkngpb.js:1341707-1341830 layout
/**
 * cwd 位于 git worktree 时返回 worktree 根与主仓库根，用于跳过主仓库中位于 worktree 之外的层。
 */
function getWorktreeRoots(startDir) {
  let gitRoot = findGitRoot(startDir);
  let canonicalGitRoot = findCanonicalGitRoot(startDir);
  return gitRoot !== null &&
    canonicalGitRoot !== null &&
    normalizePathForCompare(gitRoot) !== normalizePathForCompare(canonicalGitRoot) &&
    pathInWorkingPath(gitRoot, canonicalGitRoot)
    ? {
        worktreeRoot: gitRoot,
        mainRepoRoot: canonicalGitRoot,
      }
    : null;
}
//@ chunk-5xgkngpb.js:1341830-1341909 layout
function isInMainRepoOutsideWorktree(path, worktreeRoots) {
  return (
    worktreeRoots !== null &&
    pathInWorkingPath(path, worktreeRoots.mainRepoRoot) &&
    !pathInWorkingPath(path, worktreeRoots.worktreeRoot)
  );
}
//@ chunk-5xgkngpb.js:1341909-1341987 layout
function isSpecialOrUnsafePath(path) {
  return (
    (isUncOrDevicePath(path) && !isWslUncPath(path)) ||
    isNetworkMountPath(path) ||
    neverOtherHostMount(path) ||
    isNetDir(path) ||
    isNetworkMountRoot_2(path) ||
    isDevicePrefixPath(path) ||
    isMacSpecialPath(path)
  );
}
//@ chunk-5xgkngpb.js:1341987-1342193 layout
/**
 * 检查目录下是否有 AGENTS.md（仅用于统计 agents_md_count，316 不加载 AGENTS.md 内容）。
 */
async function hasAgentsMd(dir) {
  let agentsPath = join(dir, "AGENTS.md");
  if (isSpecialOrUnsafePath(agentsPath)) return false;
  try {
    let fsImplementation = getFsImplementation();
    let resolvedInfo = safeResolvePath(fsImplementation, agentsPath);
    if (isSpecialOrUnsafePath(resolvedInfo.resolvedPath) || isNonCanonicalSymlink(agentsPath, resolvedInfo))
      return false;
    let stats = await fsImplementation.lstat(agentsPath);
    return stats.isFile() || stats.isSymbolicLink();
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:1342193-1342236 layout
function allowsUserExternalIncludes() {
  return getSessionEntrypoint() !== "local-agent";
}
//@ chunk-5xgkngpb.js:1342236-1342530 layout
/**
 * 按宿主缓存 getMemoryFiles 的结果 promise（键为是否 forced），hold 改变时整体失效。
 */
function getMemoryFilesCached(session, includeExternal = false, storageV5, credentials) {
  let sessionState = claudeMdSessionState(session);
  let managedCondition = managedFolderCondition();
  if ((sessionState.memo.hold ?? managedCondition) !== managedCondition)
    sessionState.memo = {
      loads: new Map(),
      moves: new Map(),
    };
  sessionState.memo.hold = managedCondition;
  let cached = sessionState.memo.loads.get(includeExternal);
  if (cached) return cached.files;
  let loadEntry = {
    files: getMemoryFiles(
      session.root,
      sessionState,
      claudeMdAccessTrackerSlot.of(session),
      includeExternal,
      storageV5,
      credentials,
    ).then((memoryFiles) => {
      loadEntry.settled = memoryFiles;
      return memoryFiles.loaded;
    }),
    settled: undefined,
  };
  sessionState.memo.loads.set(includeExternal, loadEntry);
  return loadEntry.files;
}
//@ chunk-5xgkngpb.js:1342530-1342838 layout
function findSymlinkedMemoryPaths(fsImpl, files) {
  let symlinked = new Set();
  for (let { base, path } of files) {
    if (isNetworkMountRoot_2(base)) continue;
    let relPath = relative(base, path);
    let parts = relPath.split(sep);
    if (isAbsolute(relPath) || parts.some((part) => part === ".." || part === "" || part === ".")) continue;
    let currentPath = base;
    for (let [partIndex, part] of parts.entries()) {
      currentPath = join(currentPath, part);
      let kind = classifyRulesPath(fsImpl, currentPath);
      if (kind === "absent") {
        symlinked.add(path);
        break;
      }
      if (partIndex < parts.length - 1 && kind !== "directory") break;
    }
  }
  return symlinked;
}
//@ chunk-5xgkngpb.js:1342838-1343085 file-local
function resolveExcludePatterns(originalCwd, dir) {
  if (!isAbsolute(dir) || dir !== resolve_2(dir) || isUnsafeClaudeMdDir(dir)) return false;
  if (
    findIntermediateUncJunction(originalCwd, dir, {
      unreadableAncestry: "unverified",
      surfaceNetworkRaw: true,
    }) !== undefined
  )
    return false;
  let resolvedDir = dir;
  try {
    resolvedDir = originalCwd.realpathSync(dir);
  } catch (error) {
    let dirToResolve = getErrnoCode(error);
    if (dirToResolve !== "ENOENT" && dirToResolve !== "ENOTDIR") return false;
  }
  return !isUnsafeClaudeMdDir(resolvedDir);
}
//@ chunk-5xgkngpb.js:1343085-1343166 layout
function isUnsafeClaudeMdDir(dir) {
  let claudeMdPath = join(dir, "CLAUDE.md");
  return (
    isUncOrDevicePath(dir) ||
    isNetworkishPath(dir) ||
    isUncOrDevicePath(claudeMdPath) ||
    isNetworkishPath(claudeMdPath) ||
    isNetworkMountRoot_2(dir)
  );
}
//@ chunk-5xgkngpb.js:1343166-1343376 layout
function classifyRulesPath(fsImpl, path) {
  if (isUncOrDevicePath(path) || isNetworkishPath(path)) return "other";
  try {
    let stats = fsImpl.lstatSync(path);
    return stats.isDirectory() && !stats.isSymbolicLink() ? "directory" : "other";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "absent" : "other";
  }
}
//@ chunk-5xgkngpb.js:1343376-1343451 file-local
function getAllMemoryFilePaths(filePath, type, processedPaths, excludeMatcher) {
  let normalizedPath = checkMemoryFileAdmissible(filePath, type, processedPaths, 0, excludeMatcher);
  if (normalizedPath !== undefined) processedPaths.add(normalizedPath);
  return [];
}
//@ chunk-5xgkngpb.js:1343451-1348392 fingerprint (2.1.88 match: getMemoryFiles, 0.756)
/**
 * 发现并读取全部指令记忆文件：托管 CLAUDE.md→托管 claudeMd 设置→托管 .claude/rules→用户 <配置目录>/CLAUDE.md 与 rules→从文件系统根到 cwd 每层的 CLAUDE.md、.claude/CLAUDE.md、.claude/rules/*.md、CLAUDE.local.md→--add-dir 目录（需 CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD）→自动记忆 MEMORY.md。按 claudeMdExcludes 排除，首次加载打 tengu_claudemd__initial_load 并触发 InstructionsLoaded hook。
 */
async function getMemoryFiles(root, host, session, skipRecord, storageV5, credentials) {
  if (isRemoteSessionAvailable()) {
    if (!skipRecord) recordMemoryContextBuild(session, []);
    return {
      loaded: [],
      withheld: [],
      root: getOriginalCwdOrNull(),
    };
  }
  let startTime = Date.now();
  if (!skipRecord) host.walkEpoch++;
  let walkEpoch = host.walkEpoch;
  let isStaleWalk = () => host.walkEpoch !== walkEpoch;
  logForDiagnosticsNoPII("info", "memory_files_started");
  let memoryFiles = [];
  let processedPaths = new Set();
  let config = getCurrentProjectConfig();
  let includeExternal = skipRecord || config.hasClaudeMdExternalIncludesApproved || false;
  let claudeMdExcludeMatcher = createClaudeMdExcludeMatcher();
  let dir = getManagedFilePath();
  let managedClaudeMd = getMemoryPath("Managed");
  let managedClaudeRulesDir = getManagedClaudeRulesDir();
  let configHomeDir = isSettingSourceEnabled("userSettings") ? getClaudeConfigDirOrNull() : null;
  let userPaths =
    configHomeDir === null
      ? null
      : {
          configHome: configHomeDir,
          claudeMd: getMemoryPath("User"),
          rulesDir: getUserClaudeRulesDir(),
        };
  let projectEnabled = isInstructionSourceEnabled("projectSettings");
  let localEnabled = isInstructionSourceEnabled("localSettings");
  let cwd = (projectEnabled || localEnabled) && !isDiskless() ? getOriginalCwd() : undefined;
  let userClaudeRulesDir = getOriginalCwdOrNull();
  let worktreeRoots = cwd === undefined ? null : getWorktreeRoots(cwd);
  let dirsToVisit = [];
  for (
    let currentDir = cwd;
    currentDir !== undefined && currentDir !== parse(currentDir).root;
    currentDir = dirname(currentDir)
  )
    dirsToVisit.unshift(currentDir);
  let mapped = dirsToVisit.map((dir) => {
    let isMainRepoOutsideWorktree = isInMainRepoOutsideWorktree(dir, worktreeRoots);
    let isProjectDir = projectEnabled && !isMainRepoOutsideWorktree;
    let localFilePath = join(dir, "CLAUDE.local.md");
    return {
      dir,
      project: isProjectDir,
      projectFiles: isProjectDir
        ? [join(dir, "CLAUDE.md"), join(dir, ".claude", "CLAUDE.md"), ...instructionFilesInDir(dir)].filter(
            (projectPath) => !claudeMdExcludeMatcher(projectPath, "Project"),
          )
        : [],
      rulesDir: isProjectDir ? join(dir, ".claude", "rules") : undefined,
      localFile: localEnabled && !claudeMdExcludeMatcher(localFilePath, "Local") ? localFilePath : undefined,
    };
  });
  let originalCwd = getFsImplementation();
  let diskless = isDiskless();
  let managedBase = !diskless && resolveExcludePatterns(originalCwd, dir);
  let userBase =
    userPaths !== null &&
    storageV5 === undefined &&
    resolveExcludePatterns(originalCwd, userPaths.configHome);
  let dir_2 = mapped.findLast(
    ({ projectFiles, rulesDir, localFile }) =>
      projectFiles.length > 0 || rulesDir !== undefined || localFile !== undefined,
  )?.dir;
  let projectBase =
    storageV5 === undefined && dir_2 !== undefined && resolveExcludePatterns(originalCwd, dir_2);
  let symlinkedMemoryPaths = findSymlinkedMemoryPaths(originalCwd, [
    ...(managedBase
      ? [
          {
            base: dir,
            path: managedClaudeMd,
          },
          {
            base: dir,
            path: managedClaudeRulesDir,
          },
        ]
      : []),
    ...(userBase
      ? [
          ...(claudeMdExcludeMatcher(userPaths.claudeMd, "User")
            ? []
            : [
                {
                  base: userPaths.configHome,
                  path: userPaths.claudeMd,
                },
              ]),
          {
            base: userPaths.configHome,
            path: userPaths.rulesDir,
          },
        ]
      : []),
    ...(projectBase
      ? mapped.flatMap(({ dir, projectFiles, rulesDir, localFile }) =>
          [...projectFiles, rulesDir, localFile]
            .filter((path) => path !== undefined)
            .map((path) => ({
              base: dir,
              path,
            })),
        )
      : []),
  ]);
  let coveredPaths = diskless
    ? new Set([...symlinkedMemoryPaths, managedClaudeMd, managedClaudeRulesDir])
    : symlinkedMemoryPaths;
  let gitRoot = createHeldPathTracker(root);
  let { held } = gitRoot;
  let collectFile = async (filePath, type, held) =>
    coveredPaths.has(filePath)
      ? getAllMemoryFilePaths(filePath, type, processedPaths, claudeMdExcludeMatcher)
      : isInstructionsMemoryType_3(
          filePath,
          type,
          processedPaths,
          includeExternal,
          0,
          undefined,
          undefined,
          claudeMdExcludeMatcher,
          held,
        );
  memoryFiles.push(...(await collectFile(managedClaudeMd, "Managed")));
  let remoteContent = remoteClaudeMd();
  if (remoteContent)
    memoryFiles.push({
      path: POLICY_HELPER_TAG,
      type: "Managed",
      content: remoteContent,
      globs: [],
      contentDiffersFromDisk: true,
      rawContent: remoteContent,
    });
  let claudeMd = getSettingsForSource("policySettings")?.claudeMd;
  if (claudeMd)
    memoryFiles.push({
      path: MANAGED_SETTINGS_LABEL,
      type: "Managed",
      content: claudeMd,
      globs: [],
      contentDiffersFromDisk: true,
      rawContent: claudeMd,
    });
  if (!coveredPaths.has(managedClaudeRulesDir))
    memoryFiles.push(
      ...(await processMdRules({
        rulesDir: managedClaudeRulesDir,
        type: "Managed",
        processedPaths,
        includeExternal,
        conditionalRule: false,
        storageV5,
        excludeMatcher: claudeMdExcludeMatcher,
      })),
    );
  if (userPaths !== null) {
    let { claudeMd, rulesDir } = userPaths;
    memoryFiles.push(
      ...(coveredPaths.has(claudeMd)
        ? getAllMemoryFilePaths(claudeMd, "User", processedPaths, claudeMdExcludeMatcher)
        : await isInstructionsMemoryType_3(
            claudeMd,
            "User",
            processedPaths,
            true,
            0,
            undefined,
            storageV5 !== undefined
              ? {
                  backend: storageV5,
                  key: STORAGE_SPACES.state("user-memory"),
                }
              : undefined,
            claudeMdExcludeMatcher,
          )),
    );
    if (!coveredPaths.has(rulesDir))
      memoryFiles.push(
        ...(await processMdRules({
          rulesDir,
          type: "User",
          processedPaths,
          includeExternal: true,
          conditionalRule: false,
          storageV5,
          excludeMatcher: claudeMdExcludeMatcher,
        })),
      );
  }
  let countAgentsMd = projectEnabled && projectBase;
  let agentsMdChecks = [];
  for (let { dir, project, projectFiles, rulesDir, localFile } of mapped) {
    if (project && countAgentsMd && !host.hasLoggedInitialLoad) agentsMdChecks.push(hasAgentsMd(dir));
    let heldForDir = dir === cwd ? held?.within : held?.above(dir);
    for (let dotClaudePath of projectFiles)
      memoryFiles.push(...(await collectFile(dotClaudePath, "Project", heldForDir)));
    if (rulesDir !== undefined && !coveredPaths.has(rulesDir))
      memoryFiles.push(
        ...(await processMdRules({
          rulesDir,
          type: "Project",
          processedPaths,
          includeExternal,
          conditionalRule: false,
          storageV5,
          excludeMatcher: claudeMdExcludeMatcher,
          held: heldForDir,
        })),
      );
    if (localFile !== undefined) memoryFiles.push(...(await collectFile(localFile, "Local", heldForDir)));
  }
  let read = claudeMdExtraState.peek(root)?.read;
  if (read) memoryFiles.push(...applyClaudeMdExcludesToInjected(await read(), claudeMdExcludeMatcher));
  for (let dir of getAdditionalClaudeMdDirs()) {
    let projectPath = join(dir, "CLAUDE.md");
    memoryFiles.push(
      ...(await isInstructionsMemoryType_3(
        projectPath,
        "Project",
        processedPaths,
        includeExternal,
        0,
        undefined,
        undefined,
        claudeMdExcludeMatcher,
        held?.within,
      )),
    );
    let dotClaudePath = join(dir, ".claude", "CLAUDE.md");
    memoryFiles.push(
      ...(await isInstructionsMemoryType_3(
        dotClaudePath,
        "Project",
        processedPaths,
        includeExternal,
        0,
        undefined,
        undefined,
        claudeMdExcludeMatcher,
        held?.within,
      )),
    );
    let rulesDir = join(dir, ".claude", "rules");
    memoryFiles.push(
      ...(await processMdRules({
        rulesDir,
        type: "Project",
        processedPaths,
        includeExternal,
        conditionalRule: false,
        storageV5,
        excludeMatcher: claudeMdExcludeMatcher,
        held: held?.within,
      })),
    );
    if (isInstructionSourceEnabled("localSettings")) {
      let localPath = join(dir, "CLAUDE.local.md");
      memoryFiles.push(
        ...(await isInstructionsMemoryType_3(
          localPath,
          "Local",
          processedPaths,
          includeExternal,
          0,
          undefined,
          undefined,
          claudeMdExcludeMatcher,
          held?.within,
        )),
      );
    }
  }
  if (isAutoMemoryEnabled() && !isAutoMemReadFenced()) {
    await getAutoMemPathState().warmCanonicalWcRoot();
    let additionalDirs = isAutoMemReadFenced();
    let coworkMemoryIndexContent = getCoworkMemoryIndexContent();
    if (!additionalDirs && coworkMemoryIndexContent !== "") {
      let autoMemEntrypoint = getAutoMemEntrypoint();
      let autoMemPath = getAutoMemPath();
      let needsAutoMemRead =
        coworkMemoryIndexContent === undefined && isAutoMemPathWithinAutoMemDir(autoMemEntrypoint);
      let readAutoMem = async (enabled) =>
        enabled ? (await safelyReadMemoryFileAsync(autoMemEntrypoint, "AutoMem")).info : null;
      let autoMemFile =
        coworkMemoryIndexContent !== undefined
          ? buildInjectedAutoMemFile(coworkMemoryIndexContent)
          : await readAutoMem(needsAutoMemRead);
      if (
        autoMemFile === null &&
        coworkMemoryIndexContent === undefined &&
        !skipRecord &&
        !isMemoryRecallEnabled() &&
        !env.CLAUDE_CODE_REMOTE &&
        needsAutoMemRead &&
        (await ensureMemoryIndexBackfill(root.host, autoMemPath))
      )
        autoMemFile = await readAutoMem(isAutoMemPathWithinAutoMemDir(autoMemEntrypoint));
      if (autoMemFile) {
        let normalizedPath = normalizePathForCompare(autoMemFile.path);
        if (!processedPaths.has(normalizedPath)) {
          processedPaths.add(normalizedPath);
          memoryFiles.push(autoMemFile);
        }
      }
    }
  }
  let durationMs = Date.now() - startTime;
  let results = await Promise.all(agentsMdChecks);
  let isStale = isStaleWalk();
  if (!skipRecord && !isStale) recordMemoryContextBuild(session, memoryFiles);
  let totalContentLength = memoryFiles.reduce((sum, file) => sum + file.content.length, 0);
  logForDiagnosticsNoPII("info", "memory_files_completed", {
    duration_ms: durationMs,
    file_count: memoryFiles.length,
    total_content_length: totalContentLength,
  });
  let typeCounts = {};
  for (let file of memoryFiles) typeCounts[file.type] = (typeCounts[file.type] ?? 0) + 1;
  if (!skipRecord && !host.hasLoggedInitialLoad && !isStale) {
    host.hasLoggedInitialLoad = true;
    let agentsMdCount = countAgentsMd ? countWhere(results, Boolean) : undefined;
    let sizeSummary = memoryFileSizeSummary(memoryFiles);
    logEvent("tengu_claudemd__initial_load", {
      file_count: memoryFiles.length,
      total_content_length: totalContentLength,
      instructions_content_length: sizeSummary.totalChars,
      max_file_content_length: sizeSummary.largestChars,
      user_count: typeCounts.User ?? 0,
      project_count: typeCounts.Project ?? 0,
      local_count: typeCounts.Local ?? 0,
      managed_count: typeCounts.Managed ?? 0,
      automem_count: typeCounts.AutoMem ?? 0,
      agents_md_count: agentsMdCount,
      ...{},
      duration_ms: durationMs,
    });
  }
  if (!skipRecord && !isStale) {
    let eagerLoadReason = consumeNextEagerLoadReason(host);
    if (eagerLoadReason !== undefined && hasInstructionsLoadedHook())
      for (let file of memoryFiles) {
        if (!isInstructionsMemoryType(file.type)) continue;
        if (isManagedOrVirtualPath(file.path)) continue;
        let loadReason = file.parent ? "include" : eagerLoadReason;
        executeInstructionsLoadedHooks(root, file.path, file.type, loadReason, {
          globs: file.globs,
          parentFilePath: file.parent,
          storageV5,
          credentials,
        });
      }
    for (let file of host.reportsSetupGuides ? memoryFiles : [])
      if (isInstructionsMemoryType(file.type))
        notifySetupGuideLoaded(file.content, "claudemd", credentials, storageV5, undefined);
  }
  let withheld = gitRoot.withheld();
  if (!skipRecord && !isStale) logWithheldInstructionFiles(root, withheld);
  return {
    loaded: memoryFiles,
    withheld,
    root: userClaudeRulesDir,
  };
}
//@ chunk-5xgkngpb.js:1348469-1348608 callgraph-fingerprint (2.1.88 match: consumeNextEagerLoadReason, 0.605)
function consumeNextEagerLoadReason(session) {
  if (!session.shouldFireHook) return;
  session.shouldFireHook = false;
  let nextEagerLoadReason = session.nextEagerLoadReason;
  session.nextEagerLoadReason = "session_start";
  return nextEagerLoadReason;
}
//@ chunk-5xgkngpb.js:1348664-1348687 placement
function clearMemoryFilesCacheForHost() {
  clearMemoryFilesCache(getRootSession());
}
//@ chunk-5xgkngpb.js:1348687-1348797 file-local
/**
 * 重置记忆文件缓存并记录下一次加载原因（默认 session_start），供 InstructionsLoaded hook。
 */
function resetGetMemoryFilesCache(session, nextEagerLoadReason = "session_start") {
  let sessionState = claudeMdSessionState(session);
  sessionState.nextEagerLoadReason = nextEagerLoadReason;
  sessionState.shouldFireHook = true;
  sessionState.walkEpoch++;
  clearMemoryFilesCache(session);
}
//@ chunk-5xgkngpb.js:1348797-1348840 fingerprint (2.1.88 match: nextEagerLoadReason, 1)
function nextEagerLoadReason(nextEagerLoadReason = "session_start") {
  resetGetMemoryFilesCache(getRootSession(), nextEagerLoadReason);
}
//@ chunk-5xgkngpb.js:1348840-1348886 placement
/**
 * 重置“首次加载已记录”标记。
 */
function resetInitialLoadLogged(host) {
  claudeMdSessionState(host).hasLoggedInitialLoad = false;
}
//@ chunk-5xgkngpb.js:1348886-1348932 placement
/**
 * 标记“首次加载已记录”。
 */
function markInitialLoadLogged(session) {
  claudeMdSessionState(session).hasLoggedInitialLoad = true;
}
//@ chunk-5xgkngpb.js:1348932-1348976 placement
/**
 * 关闭安装向导的上报。
 */
function disableSetupGuideReports(session) {
  claudeMdSessionState(session).reportsSetupGuides = false;
}
//@ chunk-5xgkngpb.js:1348976-1349072 placement
function getLargeMemoryFiles(files) {
  let maxMemoryFileChars = getMaxMemoryFileChars();
  return files.filter(
    (file) =>
      !isManagedOrVirtualPath(file.path) &&
      isInstructionsMemoryType(file.type) &&
      file.content.length > maxMemoryFileChars,
  );
}
//@ chunk-5xgkngpb.js:1349072-1349141 placement
/**
 * 过滤出指令类（非托管）的记忆文件。
 */
function instructionMemoryFiles(memoryFiles) {
  return includedMemoryFiles(memoryFiles).filter(
    (file) => !isManagedOrVirtualPath(file.path) && isInstructionsMemoryType(file.type),
  );
}
//@ chunk-5xgkngpb.js:1349141-1349290 placement
function summarizeMemoryFileSizes(memoryFiles) {
  let totalChars = 0;
  let total = 0;
  for (let file of memoryFiles) {
    totalChars += file.content.length;
    total = Math.max(total, file.content.length);
  }
  return {
    fileCount: memoryFiles.length,
    totalChars,
    largestChars: total,
  };
}
//@ chunk-5xgkngpb.js:1349290-1349325 placement
/**
 * 汇总记忆文件的大小。
 */
function memoryFileSizeSummary(memoryFiles) {
  return summarizeMemoryFileSizes(instructionMemoryFiles(memoryFiles));
}
//@ chunk-5xgkngpb.js:1349325-1349492 placement
function getMemoryFileLimits(memoryFiles, type) {
  let maxMemoryFileChars_2 = getMaxMemoryFileChars(type);
  let maxChars = maxMemoryFileChars(type);
  let sizeSummary = summarizeMemoryFileSizes(memoryFiles);
  return {
    limitChars: maxMemoryFileChars_2,
    totalLimitChars: maxChars,
    ...sizeSummary,
    filesOverLimit: countWhere(memoryFiles, (file) => file.content.length > maxMemoryFileChars_2),
    totalOverLimit: sizeSummary.totalChars > maxChars,
  };
}
//@ chunk-5xgkngpb.js:1349492-1349531 placement
/**
 * 计算记忆文件的大小上限统计。
 */
function memoryFileLimits(memoryFiles, type) {
  return getMemoryFileLimits(instructionMemoryFiles(memoryFiles), type);
}
//@ chunk-5xgkngpb.js:1349531-1349778 placement
/**
 * 记忆文件总量超过上限时返回统计与最大的三个文件，否则 null。
 */
function getOversizedMemoryWarning(memoryFiles) {
  let instructionFiles = instructionMemoryFiles(memoryFiles);
  let memoryFileLimits = getMemoryFileLimits(instructionFiles, undefined);
  if (
    instructionFiles.reduce(
      (acc, file) => (file.content.length > memoryFileLimits.limitChars ? acc : acc + file.content.length),
      0,
    ) <= memoryFileLimits.totalLimitChars
  )
    return null;
  let largest = instructionFiles
    .toSorted((leftFile, rightFile) => rightFile.content.length - leftFile.content.length)
    .slice(0, 3);
  return {
    summary: memoryFileLimits,
    largest,
  };
}
//@ chunk-5xgkngpb.js:1349854-1350020 placement
/**
 * 判断记忆文件是否注入上下文（自动记忆开启召回时、项目文件被开关关闭时或内容为空时不注入）。
 */
function shouldInjectMemoryFile(file) {
  if (file.type === "AutoMem" && isMemoryRecallEnabled()) return false;
  if (
    (file.type === "Project" || file.type === "Local") &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_paper_halyard", false)
  )
    return false;
  if (!file.content) return false;
  return true;
}
//@ chunk-5xgkngpb.js:1350020-1350198 placement
function recordMemoryContextBuild(session, memoryFiles) {
  let filtered = memoryFiles.filter((file) => file.type === "AutoMem" && shouldInjectMemoryFile(file));
  session.recordContextBuild({
    memoryDir: getAutoMemPathOrNull(),
    injectedBodyPaths: filtered.map((file) => file.path),
    indexContents: filtered.map((file) => file.content),
  });
}
//@ chunk-5xgkngpb.js:1350198-1350227 placement
/**
 * 记忆文件超限时的预警（统计与最大三个文件）。
 */
var oversizedMemoryWarning = (file, type) => formatMemoryInstruction(includedMemoryFiles(file, type));
//@ chunk-5xgkngpb.js:1350227-1350291 placement
/**
 * 过滤出应包含且在指定类型内的记忆文件。
 */
function includedMemoryFiles(memoryFiles, typeFilter) {
  return memoryFiles.filter(
    (file) => (!typeFilter || typeFilter(file.type)) && shouldIncludeMemoryFile(file),
  );
}
//@ chunk-5xgkngpb.js:1350413-1350645 fingerprint (2.1.88 match: getManagedAndUserConditionalRules, 0.896)
/**
 * 取托管与用户 rules 中的条件规则（带 paths: frontmatter）。
 */
async function getManagedAndUserConditionalRules(targetPath, processedPaths, excludeMatcher) {
  if (env.CLAUDE_CODE_DISABLE_CLAUDE_MDS) return [];
  let result = [];
  if (!isDiskless())
    result.push(
      ...(await processConditionedMdRules(
        targetPath,
        getManagedClaudeRulesDir(),
        "Managed",
        processedPaths,
        false,
        excludeMatcher,
      )),
    );
  let userRulesDir = isSettingSourceEnabled("userSettings") ? getUserRulesDirOrNull() : null;
  if (userRulesDir !== null)
    result.push(
      ...(await processConditionedMdRules(
        targetPath,
        userRulesDir,
        "User",
        processedPaths,
        true,
        excludeMatcher,
      )),
    );
  return result;
}
//@ chunk-5xgkngpb.js:1350645-1351347 fingerprint (2.1.88 match: getMemoryFilesForNestedDirectory, 0.919)
/**
 * 访问嵌套目录（cwd 以下）时补加载该目录的 CLAUDE.md、.claude/CLAUDE.md、CLAUDE.local.md 与 rules；CLAUDE_CODE_DISABLE_CLAUDE_MDS 或 diskless 时为空。
 */
async function getMemoryFilesForNestedDirectory(
  dir,
  targetPath,
  processedPaths,
  { skipProject = false, held } = {},
) {
  if (env.CLAUDE_CODE_DISABLE_CLAUDE_MDS) return [];
  if (isDiskless()) return [];
  let result = [];
  let projectEnabled = isInstructionSourceEnabled("projectSettings") && !skipProject;
  if (projectEnabled) {
    let projectPath = join(dir, "CLAUDE.md");
    result.push(
      ...(await isInstructionsMemoryType_3(
        projectPath,
        "Project",
        processedPaths,
        false,
        0,
        undefined,
        undefined,
        undefined,
        held,
      )),
    );
    let dotClaudePath = join(dir, ".claude", "CLAUDE.md");
    result.push(
      ...(await isInstructionsMemoryType_3(
        dotClaudePath,
        "Project",
        processedPaths,
        false,
        0,
        undefined,
        undefined,
        undefined,
        held,
      )),
    );
  }
  if (isInstructionSourceEnabled("localSettings")) {
    let localPath = join(dir, "CLAUDE.local.md");
    result.push(
      ...(await isInstructionsMemoryType_3(
        localPath,
        "Local",
        processedPaths,
        false,
        0,
        undefined,
        undefined,
        undefined,
        held,
      )),
    );
  }
  if (projectEnabled) {
    let rulesDir = join(dir, ".claude", "rules");
    let unconditionalProcessedPaths = new Set(processedPaths);
    result.push(
      ...(await processMdRules({
        rulesDir,
        type: "Project",
        processedPaths: unconditionalProcessedPaths,
        includeExternal: false,
        conditionalRule: false,
        held,
      })),
    );
    result.push(
      ...(await processConditionedMdRules(
        targetPath,
        rulesDir,
        "Project",
        processedPaths,
        false,
        undefined,
        held,
      )),
    );
    for (let path of unconditionalProcessedPaths) processedPaths.add(path);
  }
  return result;
}
//@ chunk-5xgkngpb.js:1351347-1351530 fingerprint (2.1.88 match: getConditionalRulesForCwdLevelDirectory, 0.8)
async function getConditionalRulesForCwdLevelDirectory(dir, targetPath, processedPaths, excludeMatcher) {
  if (env.CLAUDE_CODE_DISABLE_CLAUDE_MDS || !isInstructionSourceEnabled("projectSettings")) return [];
  if (isDiskless()) return [];
  let rulesDir = join(dir, ".claude", "rules");
  return processConditionedMdRules(
    targetPath,
    rulesDir,
    "Project",
    processedPaths,
    false,
    undefined,
    excludeMatcher,
  );
}
//@ chunk-5xgkngpb.js:1351530-1352035 fingerprint (2.1.88 match: processConditionedMdRules, 0.809)
/**
 * 按目标文件路径匹配条件规则的 paths glob，命中则加载（claudemd_rule_globs）。
 */
async function processConditionedMdRules(
  targetPath,
  dir,
  type,
  processedPaths,
  includeExternal,
  storageV5,
  held,
) {
  let conditionedRuleMdFiles = await processMdRules({
    rulesDir: dir,
    type,
    processedPaths,
    includeExternal,
    conditionalRule: true,
    storageV5,
    held,
  });
  let baseDir = type === "Project" ? dirname(dirname(dir)) : getOriginalCwd();
  let relPath = isAbsolute(targetPath) ? relative(baseDir, targetPath) : targetPath;
  if (isAbsolute(targetPath) && (!relPath || relPath.startsWith("..") || isAbsolute(relPath))) {
    let targetDir = dirname(targetPath);
    let resolvedTarget = safeResolvePath(getFsImplementation(), targetDir);
    let resolvedPath = resolvedTarget.resolvedPath;
    if (resolvedPath !== targetDir && !isNonCanonicalSymlink(targetDir, resolvedTarget))
      relPath = relative(baseDir, join(resolvedPath, basename(targetPath)));
  }
  return conditionedRuleMdFiles.filter((file) => {
    if (!file.globs || file.globs.length === 0) return false;
    if (!relPath || relPath.startsWith("..") || isAbsolute(relPath)) return false;
    return minimatchModule
      .default()
      .add(filterUsableIgnorePatterns(file.globs, "claudemd_rule_globs"))
      .ignores(relPath);
  });
}
//@ chunk-5xgkngpb.js:1352035-1352262 fingerprint (2.1.88 match: getExternalClaudeMdIncludes, 0.793)
/**
 * 从已加载文件中挑出 cwd 外的 include（parent 存在且非 User 类型），用于提示用户审批。
 */
function getExternalClaudeMdIncludes(files) {
  let externals = [];
  for (let file of files) {
    if (file.type !== "User" && file.parent && !isWithinOriginalCwd(file.path))
      externals.push({
        path: file.path,
        parent: file.parent,
      });
    if (file.type !== "User" && file.linkedFrom !== undefined && !isWithinOriginalCwd(file.path))
      externals.push({
        path: file.path,
        parent: file.linkedFrom,
      });
  }
  return externals;
}
//@ chunk-5xgkngpb.js:1352262-1352301 placement
function hasExternalClaudeMdIncludes(files) {
  return getExternalClaudeMdIncludes(files).length > 0;
}
//@ chunk-5xgkngpb.js:1352458-1352466 placement
/**
 * 可替换的 Markdown 词法分析器实现。
 */
var markdownLexerOverride;
//@ chunk-5xgkngpb.js:1352466-1352488 placement
/**
 * 注册 Markdown 词法分析器。
 */
function setMarkdownLexer(getUserContextInstructionFiles) {
  markdownLexerOverride = getUserContextInstructionFiles;
}
//@ chunk-5xgkngpb.js:1352488-1352553 placement
/**
 * 调用注册的 Markdown 词法分析器（未注册时返回空的 Promise）。
 */
function lexMarkdownWith(session, text, options) {
  return markdownLexerOverride?.(session, text, options) ?? Promise.resolve(undefined);
}
//@ chunk-5xgkngpb.js:3346657-3346945 fingerprint (2.1.88 match: isMemoryFilePath, 0.962)
/**
 * 判断路径是否为指令文件（CLAUDE.md、CLAUDE.local.md 或 .claude/rules/*.md），返回其所属项目目录。
 */
function isMemoryFilePath(filePath) {
  let name = basename(filePath);
  let options;
  let index = filePath.indexOf(`${sep}.claude${sep}rules${sep}`);
  if (index >= 0) options = name.endsWith(".md") ? filePath.slice(0, index) : undefined;
  else if (name === "CLAUDE.md" || name === "CLAUDE.local.md" || INSTRUCTION_FILE_NAMES.includes(name)) {
    options = dirname(filePath);
    if (name === "CLAUDE.md" && basename(options) === ".claude") options = dirname(options);
  }
  return options !== undefined && options !== parse(options).root ? options : undefined;
}
//@ chunk-h61dq9nz.js:15536-15837 callgraph-fingerprint (2.1.88 match: shouldShowClaudeMdExternalIncludesWarning, 0.207)
/**
 * 列出托管 CLAUDE.md/rules 中引用了外部文件的 include，供外部引用审批对话框使用。
 */
async function shouldShowClaudeMdExternalIncludesWarning() {
  if (isClaudeMdLoadingDisabled() || isRemoteSessionAvailable() || isDiskless()) return [];
  let processedPaths = new Set();
  let hasClaudeMdExternalIncludesApproved =
    getCurrentProjectConfig().hasClaudeMdExternalIncludesApproved || false;
  return [
    ...(await isInstructionsMemoryType_3(
      getMemoryPath("Managed"),
      "Managed",
      processedPaths,
      hasClaudeMdExternalIncludesApproved,
    )),
    ...(await processMdRules({
      rulesDir: getManagedClaudeRulesDir(),
      type: "Managed",
      processedPaths,
      includeExternal: hasClaudeMdExternalIncludesApproved,
      conditionalRule: false,
    })),
  ].map((memoryFile) => [memoryFile.path, memoryFile.content, memoryFile.unverified]);
}
export {
  getExternalClaudeMdIncludes,
  getMemoryFilesCached,
  memoryFileLimits,
  shouldShowClaudeMdExternalIncludesWarning,
  claudeMdExtraState,
  getWorktreeRoots,
  isInMainRepoOutsideWorktree,
  getAdditionalClaudeMdDirs,
  getMaxMemoryFileChars,
  lexMarkdownWith,
  getManagedAndUserConditionalRules,
  getMemoryFilesForNestedDirectory,
  getConditionalRulesForCwdLevelDirectory,
  getWithheldInstructionFiles,
  applyClaudeMdExcludesToInjected,
  isSpecialOrUnsafePath,
  isNonCanonicalSymlink,
  clearMemoryFilesCacheForHost,
  withNoDenyRules,
  getLargeMemoryFiles,
  getOversizedMemoryWarning,
  isLocalSettingsReadable,
  MEMORY_SIZE_SOFT_RATIO,
  MEMORY_SIZE_WARN_RATIO,
  ClaudeMdAccessTracker,
  MD_LINK_RE,
  claudeMdSessionState,
  hasExternalClaudeMdIncludes,
  setMarkdownLexer,
  includedMemoryFiles,
  stripHtmlComments,
  nextEagerLoadReason,
  isMemoryFilePath,
  isInstructionsMemoryType_3,
  MAX_INCLUDE_DEPTH,
  processMdRules,
  isInstructionSourceEnabled,
  createHeldPathTracker,
  processMemoryFile,
  isManagedOrVirtualPath,
  resetGetMemoryFilesCache,
  setClaudeMdJudgedBy,
  lexMarkdown,
  shouldInjectMemoryFile,
  beginCwdRelocationHold,
  oversizedMemoryWarning,
  resetInitialLoadLogged,
  getClaudeMds,
  MEMORY_INSTRUCTION_PROMPT,
  claudeMdLoadStateByHost,
  disableSetupGuideReports,
  markInitialLoadLogged,
};
