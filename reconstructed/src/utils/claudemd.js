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
  join,
  sep,
  basename,
  extname,
  dirname,
  relative,
  resolve as resolve_2,
  parse,
} from "path";
import { Re } from "../../runtime/bun-runtime.js";
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
import { getInitialSettings_2, getSettingsForSource } from "./settings/settings.js";
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
import { count } from "./collections.js";
import { hasInstructionsLoadedHook, executeInstructionsLoadedHooks } from "./hooks.js";
import { isInstructionsMemoryType } from "../entrypoints/sdk/coreSchemas.js";
import { notifySetupGuideLoaded } from "./commandPredicates.js";
import { clearMemoryFilesCache } from "../components/Message.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { shouldIncludeMemoryFile } from "./attachments.js";
import { filterUsableIgnorePatterns } from "./ignorePatterns.js";
import { isClaudeMdLoadingDisabled } from "./settings/customizationDisabled.js";

//@ chunk-e6aww6q8.js:1310416-1310436 placement
/**
 * 惰性加载的 minimatch 模块（用于规则 glob 匹配）。
 */
var minimatchModule = Re(require_ignore(), 1);
//@ chunk-e6aww6q8.js:1310436-1310627 placement
/**
 * 多行模式匹配 Setext 下划线。
 */
var SETEXT_UNDERLINE_RE = /^ {0,3}(?:=+|-+) *$/;
var SETEXT_UNDERLINE_MULTILINE_RE = /^ {0,3}(?:=+|-+) *$/m;
var MARKDOWN_BLOCK_START_RE =
  /^(?:\s*$|(?:[*+-]|\d{1,9}[.)]) |(?: {4}| {0,3}\t)| {0,3}(?:`{3,}|~{3,})| {0,3}>| {0,3}#{1,6}| {0,3}<[^\n>]+>$|.*[\u2028\u2029])/;
//@ chunk-e6aww6q8.js:1310627-1310801 placement
class ClaudeMdTokenizer extends _Tokenizer {
  lexed = [];
  lheading(e) {
    let last = this.lexed.at(-1);
    return last !== undefined &&
      !last.inReach.has(e.length) &&
      (last.text.at(-e.length - 1) ??
        `
`) ===
        `
`
      ? undefined
      : super.lheading(e);
  }
}
//@ chunk-e6aww6q8.js:1310801-1311190 placement
class ClaudeMdLexer extends _Lexer {
  #e;
  constructor() {
    let e = new ClaudeMdTokenizer();
    super({
      gfm: false,
      tokenizer: e,
    });
    this.#e = e;
  }
  blockTokens(e, n = [], r = false) {
    let s = new Set();
    let h = SETEXT_UNDERLINE_MULTILINE_RE.test(e) ? e.length : -1;
    let y = false;
    while (h >= 0) {
      let S =
        h === 0
          ? 0
          : e.lastIndexOf(
              `
`,
              h - 1,
            ) + 1;
      let sliced = e.slice(S, h);
      if (y) s.add(e.length - S);
      y = SETEXT_UNDERLINE_RE.test(sliced) || (y && !MARKDOWN_BLOCK_START_RE.test(sliced));
      h = S - 1;
    }
    this.#e.lexed.push({
      text: e,
      inReach: s,
    });
    try {
      return super.blockTokens(e, n, r);
    } finally {
      this.#e.lexed.pop();
    }
  }
}
//@ chunk-e6aww6q8.js:1311190-1311230 layout
/**
 * 用定制 marked 词法器（gfm 关闭）把 markdown 切成 token，供 HTML 注释剥离与 @include 提取使用。
 */
function lexMarkdown(e) {
  return new ClaudeMdLexer().lex(e);
}
//@ chunk-e6aww6q8.js:1311230-1311318 fingerprint = stripHtmlComments (0.722)
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
//@ chunk-e6aww6q8.js:1311318-1311578 fingerprint = stripHtmlCommentsFromTokens (1)
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
//@ chunk-e6aww6q8.js:1311578-1311598 placement
/**
 * 惰性加载的 picomatch 模块。
 */
var picomatchModule = Re(require_picomatch_2(), 1);
//@ chunk-e6aww6q8.js:1311919-1311938 placement
/**
 * 记忆文件占上下文窗口的预警比例（0.8）。
 */
var MEMORY_SIZE_WARN_RATIO = 0.8;
var MEMORY_SIZE_SOFT_RATIO = 0.7;
//@ chunk-e6aww6q8.js:1316725-1316940 placement
function ensureMemoryIndexBackfill(host, autoMemPath) {
  let r = backfillState.of(host);
  let s = r.get(autoMemPath);
  if (s) return s;
  let h;
  let S = new Promise((resolve) => (h = resolve)).then(() =>
    backfillMemoryIndex(
      autoMemPath,
      () => {
        if (r.get(autoMemPath) === S) r.delete(autoMemPath);
      },
      () => {
        if (r.get(autoMemPath) === S) r.set(autoMemPath, Promise.resolve(false));
      },
    ),
  );
  r.set(autoMemPath, S);
  h();
  return S;
}
//@ chunk-e6aww6q8.js:1317030-1317127 placement
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
//@ chunk-e6aww6q8.js:1317127-1318890 placement
/**
 * 跟踪本会话中 CLAUDE.md 等指令文件的读写情况。
 */
class ClaudeMdAccessTracker {
  memoryContext = null;
  surfacedKeys = new Set();
  accessedKeys = new Map();
  recordContextBuild(e) {
    let { memoryDir } = e;
    this.memoryContext = {
      memoryDir:
        memoryDir === null
          ? null
          : {
              path: memoryDir,
              key: nfcLowerPath(memoryDir),
            },
      bodyKeys: new Set(e.injectedBodyPaths.slice(0, MAX_TRACKED_MEMORY_PATHS).map(nfcLowerPath)),
      listedKeys: new Set(
        memoryDir === null
          ? []
          : e.indexContents
              .flatMap((indexContent) => indexLinkedMemoryPaths(indexContent, memoryDir))
              .slice(0, MAX_TRACKED_MEMORY_PATHS)
              .map(nfcLowerPath),
      ),
    };
  }
  recordSurfaced(e) {
    for (let n of e) {
      if (this.surfacedKeys.size >= MAX_TRACKED_MEMORY_PATHS) return;
      this.surfacedKeys.add(nfcLowerPath(n));
    }
  }
  recordAccess(e, n) {
    let r = nfcLowerPath(e);
    let s = this.accessedKeys.get(r);
    if (s === undefined && this.accessedKeys.size >= MAX_TRACKED_MEMORY_PATHS) return;
    let h = n === "read" ? "read" : "written";
    this.accessedKeys.set(r, s === undefined || s === h ? h : "read_written");
  }
  priorAccess(e) {
    return this.accessedKeys.get(nfcLowerPath(e)) ?? "none";
  }
  injection(e) {
    let n = this.injectionForKey(nfcLowerPath(e));
    return this.memoryContext === null && n === "none" ? "unknown" : n;
  }
  citedStatus(e) {
    let memoryContext = this.memoryContext;
    let memoryDir = memoryContext?.memoryDir ?? null;
    let trimmed = e.trim();
    if (
      memoryContext === null ||
      memoryDir === null ||
      trimmed === "" ||
      trimmed.split(/[\\/]/).includes("..")
    )
      return EMPTY_ACCESS_STATE;
    let h = /\.md$/i.test(trimmed) ? trimmed : `${trimmed}.md`;
    let y = nfcLowerPath(isAbsolute(h) ? h : join(memoryDir.path, h));
    let S = memoryDir.key + sep;
    if (!y.startsWith(S)) return EMPTY_ACCESS_STATE;
    let w = this.statusForKey(y);
    if (w.resolved || /[\\/]/.test(trimmed)) return w;
    let L = basename(y);
    let G = new Set(
      [
        ...memoryContext.bodyKeys,
        ...memoryContext.listedKeys,
        ...this.surfacedKeys,
        ...this.accessedKeys.keys(),
      ].filter((q) => q.startsWith(S) && basename(q) === L),
    );
    return G.size === 1 ? this.statusForKey([...G][0]) : w;
  }
  reset() {
    this.memoryContext = null;
    this.surfacedKeys.clear();
    this.accessedKeys.clear();
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
    let n = this.accessedKeys.get(e) ?? "none";
    let r = this.injectionForKey(e);
    return {
      resolved: n !== "none" || r !== "none",
      read: n === "read" || n === "read_written",
      written: n === "written" || n === "read_written",
      injection: r,
    };
  }
}
//@ chunk-e6aww6q8.js:1330061-1330105 placement
/**
 * 去掉 alwaysDenyRules 后合并持久化拒绝规则。
 */
var withNoDenyRules = (toolPermissionContext) =>
  mergePersistedDenyRules({
    ...toolPermissionContext,
    alwaysDenyRules: {},
  });
//@ chunk-e6aww6q8.js:1330105-1330211 placement
/**
 * 判断某设置来源的指令文件是否可读（来源已启用，或工作区限制下仍保留指令文件）。
 */
function isInstructionSourceEnabled(e) {
  if (isSettingSourceEnabled(e)) return true;
  let workspaceRestriction = getWorkspaceRestriction();
  return (
    workspaceRestriction !== null &&
    workspaceRestriction.sparesInstructionFiles &&
    getAllowedSettingSourcesAsConfigured().includes(e)
  );
}
//@ chunk-e6aww6q8.js:1330211-1330311 placement = _temp8 (1)
/**
 * 判断本地设置来源是否可读（已启用或工作区限制允许）。
 */
function isLocalSettingsReadable() {
  if (isSettingSourceEnabled("localSettings")) return true;
  return (
    getWorkspaceRestriction() !== null && getAllowedSettingSourcesAsConfigured().includes("localSettings")
  );
}
//@ chunk-e6aww6q8.js:1330311-1330519 placement
/**
 * CLAUDE.md 加载的会话状态（加载/迁移缓存、下次加载原因、钩子开关等）与附加状态。
 */
var claudeMdSessionState_2 = new SessionRootSlot(() => ({
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
var claudeMdExtraState = new SessionRootSlot(() => ({}));
//@ chunk-e6aww6q8.js:1330519-1330551 placement
/**
 * 取某会话的 CLAUDE.md 装载状态。
 */
function claudeMdSessionState(e) {
  return claudeMdSessionState_2.of(e);
}
//@ chunk-e6aww6q8.js:1330551-1330586 placement
/**
 * 记录 CLAUDE.md 判定的来源。
 */
function setClaudeMdJudgedBy(e, judgedBy) {
  claudeMdSessionState(e).judgedBy = judgedBy;
}
//@ chunk-e6aww6q8.js:1330586-1330804 placement
/**
 * 创建"被扣留路径"跟踪器：判断路径是否应扣留，并列出已扣留与已加载的路径。
 */
function createHeldPathTracker(e) {
  let n = new Map();
  return {
    held: buildHeldOutsideChecker(e, (r, s) => {
      n.set(r, s);
    }),
    withheld: () =>
      Array.from(n)
        .flatMap(([r, s]) =>
          s === undefined
            ? []
            : [
                {
                  path: r,
                  why: s,
                },
              ],
        )
        .slice(0, MAX_TRACKED_INSTRUCTION_PATHS),
    loaded: () => Array.from(n).flatMap(([r, s]) => (s === undefined ? [r] : [])),
  };
}
//@ chunk-e6aww6q8.js:1330804-1330943 placement
/**
 * 开始工作目录迁移时的扣留跟踪，keep 时记录被扣留的指令文件。
 */
function beginCwdRelocationHold(e) {
  let { memo } = claudeMdSessionState(e);
  let originalCwdOrNull = getOriginalCwdOrNull();
  let heldPathTracker = createHeldPathTracker(e);
  return {
    held: heldPathTracker.held,
    keep: () => {
      if (originalCwdOrNull !== null) memo.moves.set(originalCwdOrNull, heldPathTracker.withheld());
      logWithheldInstructionFiles(e, heldPathTracker.withheld());
    },
  };
}
//@ chunk-e6aww6q8.js:1330943-1331160 placement
function buildHeldOutsideChecker(e, n) {
  let r = mergePersistedDenyRules(
    e.engineStore.current?.getState().toolPermissionContext ??
      claudeMdSessionState(e).judgedBy ??
      getEmptyToolPermissionContext(),
  );
  if (getOriginalCwdOrNull() === null)
    return restrictedInstructionReaders(
      {
        context: r,
        folders: getAdditionalClaudeMdDirs(),
      },
      n,
    );
  return isInstructionReadRestricted(r)
    ? repoInstructionReaders(
        {
          context: r,
          isHeldOutside: isRestrictedReadBlocked,
        },
        n,
      )
    : undefined;
}
//@ chunk-e6aww6q8.js:1331160-1331351 placement
/**
 * 列出当前工作目录下被扣留的指令文件（去重）。
 */
function getWithheldInstructionFiles(session) {
  let { memo } = claudeMdSessionState(session);
  let originalCwdOrNull = getOriginalCwdOrNull();
  let settled = memo.loads.get(false)?.settled;
  let h = new Set();
  return (settled?.root === originalCwdOrNull ? settled.withheld : [])
    .concat(originalCwdOrNull === null ? [] : (memo.moves.get(originalCwdOrNull) ?? []))
    .filter(({ path }) => !h.has(path) && h.add(path));
}
//@ chunk-e6aww6q8.js:1331351-1331380 placement
/**
 * 托管设置在记忆文件列表里的虚拟路径标签。
 */
var MANAGED_SETTINGS_LABEL = "<managed-settings>";
//@ chunk-e6aww6q8.js:1331380-1331420 placement
/**
 * 判断路径是否为托管设置或虚拟路径。
 */
function isManagedOrVirtualPath(path) {
  return path === POLICY_HELPER_TAG || path === MANAGED_SETTINGS_LABEL;
}
//@ chunk-e6aww6q8.js:1331420-1331454 placement
/**
 * 单个记忆文件占模型上下文窗口的比例（0.05）。
 */
var MEMORY_CONTEXT_RATIO = 0.05;
var MAX_MEMORY_FILE_READ_BYTES = 4194304;
var MIN_MEMORY_FILE_CHARS = 40000;
//@ chunk-e6aww6q8.js:1331454-1331569 placement
/**
 * 按模型上下文窗口计算单个记忆文件的最大字符数。
 */
function getMaxMemoryFileChars(mainLoopModel = getMainLoopModel()) {
  let contextWindow = getContextWindow(mainLoopModel, getSdkBetas());
  let r = Number.isFinite(contextWindow) && contextWindow > 0 ? contextWindow : CONTEXT_WINDOW_THRESHOLD;
  return Math.max(
    MIN_MEMORY_FILE_CHARS,
    Math.round(r * MEMORY_CONTEXT_RATIO * bytesPerTokenForModel(mainLoopModel)),
  );
}
//@ chunk-e6aww6q8.js:1331569-1331584 placement
/**
 * 记忆文件字符数的绝对下限（120000）。
 */
var ABSOLUTE_MAX_MEMORY_FILE_CHARS = 120000;
//@ chunk-e6aww6q8.js:1331584-1331628 placement
/**
 * 取记忆文件字符上限（不低于绝对下限）。
 */
function maxMemoryFileChars(e) {
  return Math.max(ABSOLUTE_MAX_MEMORY_FILE_CHARS, getMaxMemoryFileChars(e));
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
function isWithinOriginalCwd(path) {
  return pathInWorkingPath(path, getOriginalCwd());
}
//@ chunk-e6aww6q8.js:1332468-1332720 fingerprint = parseFrontmatterPaths (1)
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
    .filter((h) => h.length > 0);
  if (patterns.length === 0 || patterns.every((pattern) => pattern === "**"))
    return {
      content,
    };
  return {
    content,
    paths: patterns,
  };
}
//@ chunk-e6aww6q8.js:1332720-1333193 fingerprint = parseMemoryFileContent (0.919)
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
  let L = includeBasePath !== undefined && withoutFrontmatter.includes("@");
  let tokens = hasComment || L ? lexMarkdown(withoutFrontmatter) : undefined;
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
//@ chunk-e6aww6q8.js:1333193-1333275 fingerprint = processMemoryFile (0.418)
function processMemoryFile(rawContent, n, type) {
  if (!rawContent.includes("@")) return [];
  return parseMemoryFileContent(rawContent, n, type, n).includePaths;
}
//@ chunk-e6aww6q8.js:1333275-1333395 layout
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
//@ chunk-e6aww6q8.js:1333395-1333464 layout
/**
 * CLAUDE_COWORK_MEMORY_INDEX_CONTENT：由宿主直接提供的 MEMORY.md 内容。
 */
function getCoworkMemoryIndexContent() {
  return process.env.CLAUDE_COWORK_MEMORY_INDEX_CONTENT;
}
//@ chunk-e6aww6q8.js:1333464-1333594 layout
function isAutoMemPathWithinAutoMemDir(autoMemEntrypoint) {
  if (!isReadBlockOn()) return true;
  let mapped = getPathsForPermissionCheck(getAutoMemPath()).map((r) => (r.endsWith(sep) ? r : r + sep));
  return getPathsForPermissionCheck(autoMemEntrypoint).every((r) =>
    mapped.some((s) => isAutoMemPathSafeForCarveout(r, s)),
  );
}
//@ chunk-e6aww6q8.js:1333594-1333685 layout
class ClaudeMdLoadState {
  memoryReadEacces = false;
  memoryReadFailed = false;
  skip = false;
  rulesWalk = false;
  announcedFileCut = false;
}
//@ chunk-e6aww6q8.js:1333685-1333712 layout
var claudeMdLoadStateByHost = new HostScoped(() => new ClaudeMdLoadState());
//@ chunk-e6aww6q8.js:1333712-1333751 layout
function getClaudeMdLoadState() {
  return claudeMdLoadStateByHost.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:1333751-1333862 layout
function reportSkippedSpecialMemoryFile() {
  let claudeMdLoadState = getClaudeMdLoadState();
  if (!claudeMdLoadState.skip) {
    claudeMdLoadState.skip = true;
    logFeatureSad("context_claude_md_load", "file_skipped_special_or_oversize");
  }
}
//@ chunk-e6aww6q8.js:1333862-1333924 layout
function countConfigDirMentions(e) {
  let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
  return claudeConfigDirOrNull !== null && e.includes(claudeConfigDirOrNull) ? 1 : 0;
}
//@ chunk-e6aww6q8.js:1333924-1333961 layout
function getUserRulesDirOrNull() {
  return isDiskless() ? null : getUserClaudeRulesDir();
}
//@ chunk-e6aww6q8.js:1333961-1333991 layout
function handleMemoryFileReadErrno(error, filePath) {
  handleMemoryFileReadError(getErrnoCode(error), filePath);
}
//@ chunk-e6aww6q8.js:1333991-1334363 fingerprint = handleMemoryFileReadError (0.616)
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
//@ chunk-e6aww6q8.js:1334363-1334902 layout
async function readMemoryFileFromStorage({ backend, key }) {
  let r = await backend.read([
    {
      key,
      offset: 0,
      length: MAX_MEMORY_FILE_READ_BYTES + 1,
    },
  ]);
  if (!r.ok) {
    let telemetryCode = r.error.code === "InvalidArgument" ? undefined : r.error.telemetryCode;
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
  let s = r.value.items[0];
  if (!s.found)
    return {
      kind: "absent",
    };
  if (s.totalBytes > MAX_MEMORY_FILE_READ_BYTES)
    return {
      kind: "skipped",
      isDirectory: false,
    };
  let h = s.value;
  return {
    kind: "content",
    content: Buffer.from(h.buffer, h.byteOffset, h.byteLength).toString("utf8"),
  };
}
//@ chunk-e6aww6q8.js:1334902-1335528 callgraph-witnessed = safelyReadMemoryFileAsync (0.249)
/**
 * 安全读取记忆文件（storage v5 或 fs），区分 absent/error/skipped/content，ENOENT 等静默，EACCES 记录一次。
 */
async function safelyReadMemoryFileAsync(filePath, type, includeBasePath, s, h) {
  try {
    let rawContent;
    let S = false;
    if (h) {
      let rawContent = await h(filePath, MAX_MEMORY_FILE_READ_BYTES);
      return rawContent === undefined
        ? {
            info: null,
            includePaths: [],
          }
        : parseMemoryFileContent(rawContent, filePath, type, includeBasePath);
    }
    if (s) {
      let memoryFileFromStorage = await readMemoryFileFromStorage(s);
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
          S = memoryFileFromStorage.isDirectory;
          rawContent = null;
          break;
        case "content":
          rawContent = memoryFileFromStorage.content;
          break;
      }
    } else {
      let fs = getFsImplementation();
      rawContent = await readSmallFileChecked(fs, filePath, MAX_MEMORY_FILE_READ_BYTES, (L) => {
        S = L.isDirectory();
      });
    }
    if (rawContent === null) {
      logForDebugging(
        `[CLAUDE.md] skipping ${filePath}: not a regular file or exceeds ${MAX_MEMORY_FILE_READ_BYTES} byte limit`,
      );
      if (!S) reportSkippedSpecialMemoryFile();
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
//@ chunk-e6aww6q8.js:1335528-1336300 fingerprint = extractIncludePathsFromTokens (1)
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
//@ chunk-e6aww6q8.js:1336300-1336310 layout
/**
 * @include 最大递归深度 5。
 */
var MAX_INCLUDE_DEPTH = 5;
//@ chunk-e6aww6q8.js:1336310-1336402 layout
function isNonCanonicalSymlink(e, n) {
  if (!n.isSymlink || n.isCanonical) return false;
  return !(n.resolvedPath === e && isUnderNetworkDirCached(e));
}
//@ chunk-e6aww6q8.js:1336402-1336660 fingerprint = isClaudeMdExcluded (0.933)
/**
 * 按设置 claudeMdExcludes（picomatch，dot:true）构建排除匹配器，只作用于 User/Project/Local 类型。
 */
function isClaudeMdExcluded() {
  let patterns = getInitialSettings_2().claudeMdExcludes;
  if (!patterns || patterns.length === 0) return () => false;
  let expandedPatterns = isDuplicatePath_2(getFsImplementation(), patterns).filter((s) => s.length > 0);
  if (expandedPatterns.length === 0) return () => false;
  let r = picomatchModule.default(expandedPatterns, {
    dot: true,
  });
  return (s, h) => (h === "User" || h === "Project" || h === "Local") && r(s.replaceAll("\\", "/"));
}
//@ chunk-e6aww6q8.js:1336660-1336711 affinity
function createClaudeMdExcludeMatcher() {
  let e;
  return (n, r) => (e ??= isClaudeMdExcluded())(n, r);
}
//@ chunk-e6aww6q8.js:1336711-1336804 affinity
/**
 * User/Project/Local 类型文件是否被 claudeMdExcludes 排除（托管与 AutoMem 不受影响）。
 */
function isExcludedByClaudeMdExcludes(e, n, r) {
  if (n !== "User" && n !== "Project" && n !== "Local") return false;
  return (r ?? isClaudeMdExcluded())(e, n);
}
//@ chunk-e6aww6q8.js:1336804-1337160 affinity
function applyClaudeMdExcludesToInjected(e, claudeMdExcludeMatcher = createClaudeMdExcludeMatcher()) {
  let r = new Map();
  for (let y of e) r.set(y.path, y);
  let s = new Map();
  let h = [];
  for (let y of e) {
    let S = [];
    let w = new Set();
    let L = y;
    let G = false;
    while (L) {
      let q = s.get(L.path);
      if (q !== undefined) {
        G = q;
        break;
      }
      if (w.has(L.path) || claudeMdExcludeMatcher(L.path, L.type)) {
        G = true;
        break;
      }
      w.add(L.path);
      S.push(L.path);
      L = L.parent === undefined ? undefined : r.get(L.parent);
    }
    for (let q of S) s.set(q, G);
    if (!G) h.push(y);
  }
  return h;
}
//@ chunk-e6aww6q8.js:1337480-1337589 affinity
/**
 * 记忆文件准入检查：已处理过、include 深度达到 5、被 claudeMdExcludes 排除或为特殊路径时返回 undefined，否则返回规范化路径。
 */
function checkMemoryFileAdmissible(e, n, r, s, h) {
  let y = normalizePathForCompare(e);
  if (r.has(y) || s >= MAX_INCLUDE_DEPTH) return;
  if (isExcludedByClaudeMdExcludes(e, n, h)) return;
  if (isSpecialOrUnsafePath(e)) return;
  return y;
}
//@ chunk-e6aww6q8.js:1337589-1338550 callgraph-fingerprint = isInstructionsMemoryType (0.28)
/**
 * 读取一个指令文件并递归展开其中的 @include：检查排除、深度（最多 5 层）、设备/特殊路径与符号链接；外部（cwd 外）include 需 hasClaudeMdExternalIncludesApproved；User 类型拒绝顶层符号链接与多硬链接文件。返回该文件及其 include 的列表。
 */
async function isInstructionsMemoryType_3(e, n, processedPaths, s, h = 0, parent, S, w, L) {
  let G = checkMemoryFileAdmissible(e, n, processedPaths, h, w);
  if (G === undefined) return [];
  let q = s && (n !== "User" || allowsUserExternalIncludes());
  let Z = safeResolvePath(getFsImplementation(), e);
  let { resolvedPath, isSymlink } = Z;
  if (isSpecialOrUnsafePath(resolvedPath) || isNonCanonicalSymlink(e, Z)) return [];
  if (
    getDevicePathRefusal(e, {
      spellings: isSymlink ? [e, resolvedPath] : [e],
      unresolved: false,
    }) !== undefined
  ) {
    logForDebugging(`[CLAUDE.md] skipping ${e}: it names a device or process file`);
    reportSkippedSpecialMemoryFile();
    return [];
  }
  if (h > 0 && !q && !isWithinOriginalCwd(resolvedPath)) return [];
  if (n === "User" && !q)
    try {
      let stats = await getFsImplementation().lstat(e);
      if ((h === 0 && stats.isSymbolicLink()) || ((stats.nlink ?? 1) > 1 && stats.isFile())) return [];
    } catch {}
  let we = isSymlink ? normalizePathForCompare(resolvedPath) : undefined;
  if (we !== undefined && processedPaths.has(we)) return [];
  processedPaths.add(G);
  let Ee = L && (await safelyReadMemoryFileAsync(e, n, resolvedPath, S, L));
  if (Ee && !Ee.info) return [];
  if (we !== undefined) processedPaths.add(we);
  let { info: memoryFile, includePaths: resolvedIncludePaths } =
    Ee || (await safelyReadMemoryFileAsync(e, n, resolvedPath, S));
  if (!memoryFile || !memoryFile.content.trim()) return [];
  if (parent) memoryFile.parent = parent;
  if (n === "Managed" && isManagedFolderWritable(e)) memoryFile.unverified = true;
  let result = [];
  result.push(memoryFile);
  for (let resolvedIncludePath of resolvedIncludePaths) {
    if (!isWithinOriginalCwd(resolvedIncludePath) && !q) continue;
    let lt = await isInstructionsMemoryType_3(
      resolvedIncludePath,
      n,
      processedPaths,
      s,
      h + 1,
      e,
      undefined,
      w,
      L,
    );
    for (let Je of memoryFile.unverified ? lt : []) Je.unverified = true;
    result.push(...lt);
  }
  return result;
}
//@ chunk-e6aww6q8.js:1338550-1340876 fingerprint = processMdRules (0.587)
/**
 * 遍历 .claude/rules 目录（递归、防环、跟随安全的符号链接）读取 *.md 规则；conditionalRule 控制只取带 paths: 的条件规则还是无条件规则。
 */
async function processMdRules({
  rulesDir,
  type: n,
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
    let ke = safeResolvePath(fs, rulesDir);
    let { resolvedPath, isSymlink, isCanonical } = ke;
    if (isSpecialOrUnsafePath(resolvedPath) || isNonCanonicalSymlink(rulesDir, ke)) return [];
    visitedDirs.add(rulesDir);
    if (isSymlink) visitedDirs.add(resolvedPath);
    let Ie = includeExternal && (n !== "User" || allowsUserExternalIncludes());
    let userRulesDirOrNull = getUserRulesDirOrNull();
    let We =
      n !== "User" &&
      (userRulesDirOrNull === null || !pathInWorkingPath(discoveredDir ?? rulesDir, userRulesDirOrNull));
    let ze = !Ie || (linkedFrom === undefined && We && isCanonical && isSymlink);
    let lt =
      ze &&
      (await listRulesDirEntries(fs, rulesDir, n, storageV5, v5Descent)) &&
      !isWithinOriginalCwd(resolvedPath);
    let Je =
      ze &&
      !lt &&
      n === "Project" &&
      We &&
      isSymlink &&
      !isWithinOriginalCwd(resolvedPath) &&
      isWithinWorkspaceOrAddDirs(dirname(dirname(rulesDir))) &&
      (await listRulesDirEntries(fs, dirname(rulesDir), n, storageV5, undefined));
    if (
      !Ie &&
      (lt || (Je && (conditionalRule || !getCurrentProjectConfig().hasClaudeMdExternalIncludesApproved)))
    )
      return [];
    let nt = linkedFrom ?? (lt ? rulesDir : Je ? dirname(rulesDir) : undefined);
    let pt = isCanonical ? resolvedPath : undefined;
    let Et =
      !isCanonical || isSymlink
        ? undefined
        : (v5Descent ??
          (storageV5 !== undefined && n === "User" && rulesDir === getUserClaudeRulesDir()
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
      let Yt = safeResolvePath(fs, entryPath);
      let { resolvedPath, isSymlink, isCanonical } = Yt;
      let pn = join(discoveredDir ?? rulesDir, entry.name);
      if (pn !== resolvedPath && isExcludedByClaudeMdExcludes(pn, n, excludeMatcher)) continue;
      if (isSpecialOrUnsafePath(resolvedPath) || isNonCanonicalSymlink(entryPath, Yt)) continue;
      let stats = isSymlink ? await statRulesEntry(fs, resolvedPath, n, storageV5) : null;
      let isDirectory = stats ? stats.isDirectory() : entry.isDirectory();
      let isFile = stats ? stats.isFile() : entry.isFile();
      let yn =
        Et !== undefined &&
        !isSymlink &&
        isCanonical &&
        isValidKeySegment(entry.name) &&
        resolvedPath === join(getUserClaudeRulesDir(), ...Et.relPath, entry.name)
          ? [...Et.relPath, entry.name]
          : undefined;
      let Kn =
        pt !== undefined && resolvedPath !== join(pt, entry.name) && !isWithinOriginalCwd(resolvedPath);
      let Xn = nt ?? (Kn && We ? pn : undefined);
      if (isDirectory) {
        if (Kn && !Ie) continue;
        result.push(
          ...(await processMdRules({
            rulesDir: resolvedPath,
            type: n,
            processedPaths,
            includeExternal,
            conditionalRule,
            visitedDirs,
            storageV5,
            v5Descent:
              Et && yn
                ? {
                    backend: Et.backend,
                    relPath: yn,
                  }
                : undefined,
            discoveredDir: pn !== resolvedPath ? pn : undefined,
            linkedFrom: Xn,
            excludeMatcher,
            held,
          })),
        );
      } else if (isFile && entry.name.endsWith(".md")) {
        if (Kn && !Ie) continue;
        if (
          held &&
          pn !== resolvedPath &&
          !processedPaths.has(normalizePathForCompare(resolvedPath)) &&
          (await held(pn, MAX_MEMORY_FILE_READ_BYTES)) === undefined
        )
          continue;
        let fo = await isInstructionsMemoryType_3(
          resolvedPath,
          n,
          processedPaths,
          includeExternal,
          0,
          undefined,
          Et && yn
            ? {
                backend: Et.backend,
                key: STORAGE_SPACES.userConfigDir("rules", yn),
              }
            : undefined,
          excludeMatcher,
          held,
        );
        if (n === "Managed" && isManagedFolderWritable(pn)) for (let bo of fo) bo.unverified = true;
        let [To] = fo;
        if (To) {
          To.isRule = true;
          if (Xn !== undefined) To.linkedFrom = Xn;
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
    let claudeMdLoadState = getClaudeMdLoadState();
    if (!claudeMdLoadState.rulesWalk) {
      claudeMdLoadState.rulesWalk = true;
      logFeatureSad("context_claude_md_load", "rules_walk_failed");
    }
    return [];
  }
}
//@ chunk-e6aww6q8.js:1340876-1340960 layout
function isWithinWorkspaceOrAddDirs(e) {
  if (pathInWorkingPath(getOriginalCwd(), e)) return true;
  let n = normalizePathForCompare(e);
  return getAdditionalClaudeMdDirs().some((r) => normalizePathForCompare(r) === n);
}
//@ chunk-e6aww6q8.js:1340960-1341047 layout
/**
 * 返回需要加载 CLAUDE.md 的额外目录（--add-dir），需开关 CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD 或对应设置。
 */
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
async function listRulesDirEntries(e, n, r, storageV5, h) {
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let y =
      r === "User" && (h !== undefined || n === getUserClaudeRulesDir())
        ? await storageV5
            .scopeKind({
              namespace: "userConfigDir",
              dir: "rules",
              ...(h && {
                relPath: h.relPath,
              }),
            })
            .catch(() => {
              return;
            })
        : await storageV5.hostFiles
            .stat(hostFileScopeForMemoryType(r, n), {
              follow: false,
            })
            .catch(() => {
              return;
            });
    if (y?.ok) return y.value.kind === "link";
    let telemetryCode = y !== undefined && y.error.code === "Failed" ? y.error.telemetryCode : undefined;
    if (errnoShapedCode(telemetryCode) !== undefined || /^ERR_[A-Z0-9_]+$/.test(telemetryCode ?? ""))
      return false;
    logForDebugging(
      `claudemd: the storage backend could not say whether the ${r} rules folder (or its .claude parent) is a symlink (${telemetryCode ?? y?.error.code ?? "no answer"}) \u2014 checking directly`,
    );
  }
  try {
    return (await e.lstat(n)).isSymbolicLink();
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:1341805-1342542 layout
async function statRulesEntry(e, resolvedPath, r, storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let h = await storageV5.hostFiles.stat(hostFileScopeForMemoryType(r, resolvedPath)).catch(() => {
      return;
    });
    if (h?.ok) {
      let { kind } = h.value;
      if (kind === "absent")
        throw Object.assign(Error("ENOENT: rules entry target is gone"), {
          code: "ENOENT",
          syscall: "stat",
          path: resolvedPath,
        });
      return {
        isDirectory: () => kind === "directory",
        isFile: () => kind === "file",
      };
    }
    let telemetryCode = h !== undefined && h.error.code === "Failed" ? h.error.telemetryCode : undefined;
    if (errnoShapedCode(telemetryCode) !== undefined || /^ERR_[A-Z0-9_]+$/.test(telemetryCode ?? ""))
      throw h !== undefined && h.error.code === "Failed" && h.error.cause instanceof Error
        ? h.error.cause
        : Object.assign(Error("rules entry stat failed"), {
            code: telemetryCode,
          });
    logForDebugging(
      `claudemd: the storage backend could not type a linked ${r} rules entry (${telemetryCode ?? h?.error.code ?? "no answer"}) \u2014 checking directly`,
    );
  }
  return e.stat(resolvedPath);
}
//@ chunk-e6aww6q8.js:1342542-1342665 layout
/**
 * cwd 位于 git worktree 时返回 worktree 根与主仓库根，用于跳过主仓库中位于 worktree 之外的层。
 */
function getWorktreeRoots(originalCwd) {
  let gitRoot = findGitRoot(originalCwd);
  let canonicalGitRoot = findCanonicalGitRoot(originalCwd);
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
//@ chunk-e6aww6q8.js:1342665-1342744 layout
function isInMainRepoOutsideWorktree(e, worktreeRoots) {
  return (
    worktreeRoots !== null &&
    pathInWorkingPath(e, worktreeRoots.mainRepoRoot) &&
    !pathInWorkingPath(e, worktreeRoots.worktreeRoot)
  );
}
//@ chunk-e6aww6q8.js:1342744-1342822 layout
function isSpecialOrUnsafePath(resolvedPath) {
  return (
    (isUncOrDevicePath(resolvedPath) && !isWslUncPath(resolvedPath)) ||
    isNetworkMountPath(resolvedPath) ||
    neverOtherHostMount(resolvedPath) ||
    isNetDir(resolvedPath) ||
    isNetworkMountRoot_2(resolvedPath) ||
    isDevicePrefixPath(resolvedPath) ||
    isMacSpecialPath(resolvedPath)
  );
}
//@ chunk-e6aww6q8.js:1342822-1343028 layout
/**
 * 检查目录下是否有 AGENTS.md（仅用于统计 agents_md_count，316 不加载 AGENTS.md 内容）。
 */
async function hasAgentsMd(dir) {
  let n = join(dir, "AGENTS.md");
  if (isSpecialOrUnsafePath(n)) return false;
  try {
    let fsImplementation = getFsImplementation();
    let s = safeResolvePath(fsImplementation, n);
    if (isSpecialOrUnsafePath(s.resolvedPath) || isNonCanonicalSymlink(n, s)) return false;
    let stats = await fsImplementation.lstat(n);
    return stats.isFile() || stats.isSymbolicLink();
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:1343028-1343071 layout
function allowsUserExternalIncludes() {
  return getSessionEntrypoint() !== "local-agent";
}
//@ chunk-e6aww6q8.js:1343071-1343365 layout
/**
 * 按宿主缓存 getMemoryFiles 的结果 promise（键为是否 forced），hold 改变时整体失效。
 */
function getMemoryFilesCached(session, n = false, storageV5, credentials) {
  let h = claudeMdSessionState(session);
  let y = managedFolderCondition();
  if ((h.memo.hold ?? y) !== y)
    h.memo = {
      loads: new Map(),
      moves: new Map(),
    };
  h.memo.hold = y;
  let S = h.memo.loads.get(n);
  if (S) return S.files;
  let L = {
    files: getMemoryFiles(
      session.root,
      h,
      claudeMdAccessTrackerSlot.of(session),
      n,
      storageV5,
      credentials,
    ).then((memoryFiles) => {
      L.settled = memoryFiles;
      return memoryFiles.loaded;
    }),
    settled: undefined,
  };
  h.memo.loads.set(n, L);
  return L.files;
}
//@ chunk-e6aww6q8.js:1343365-1343673 layout
function findSymlinkedMemoryPaths(originalCwd, n) {
  let r = new Set();
  for (let { base, path } of n) {
    if (isNetworkMountRoot_2(base)) continue;
    let y = relative(base, path);
    let parts = y.split(sep);
    if (isAbsolute(y) || parts.some((L) => L === ".." || L === "" || L === ".")) continue;
    let w = base;
    for (let [L, G] of parts.entries()) {
      w = join(w, G);
      let q = classifyRulesPath(originalCwd, w);
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
function resolveExcludePatterns(originalCwd, n) {
  if (!isAbsolute(n) || n !== resolve_2(n) || isUnsafeClaudeMdDir(n)) return false;
  if (
    findIntermediateUncJunction(originalCwd, n, {
      unreadableAncestry: "unverified",
      surfaceNetworkRaw: true,
    }) !== undefined
  )
    return false;
  let r = n;
  try {
    r = originalCwd.realpathSync(n);
  } catch (error) {
    let dirToResolve = getErrnoCode(error);
    if (dirToResolve !== "ENOENT" && dirToResolve !== "ENOTDIR") return false;
  }
  return !isUnsafeClaudeMdDir(r);
}
//@ chunk-e6aww6q8.js:1343920-1344001 layout
function isUnsafeClaudeMdDir(e) {
  let n = join(e, "CLAUDE.md");
  return (
    isUncOrDevicePath(e) ||
    isNetworkishPath(e) ||
    isUncOrDevicePath(n) ||
    isNetworkishPath(n) ||
    isNetworkMountRoot_2(e)
  );
}
//@ chunk-e6aww6q8.js:1344001-1344211 layout
function classifyRulesPath(e, n) {
  if (isUncOrDevicePath(n) || isNetworkishPath(n)) return "other";
  try {
    let r = e.lstatSync(n);
    return r.isDirectory() && !r.isSymbolicLink() ? "directory" : "other";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "absent" : "other";
  }
}
//@ chunk-e6aww6q8.js:1344211-1344286 file-local
function getAllMemoryFilePaths(e, n, processedPaths, claudeMdExcludeMatcher) {
  let h = checkMemoryFileAdmissible(e, n, processedPaths, 0, claudeMdExcludeMatcher);
  if (h !== undefined) processedPaths.add(h);
  return [];
}
//@ chunk-e6aww6q8.js:1344286-1349223 fingerprint = getMemoryFiles (0.756)
/**
 * 发现并读取全部指令记忆文件：托管 CLAUDE.md→托管 claudeMd 设置→托管 .claude/rules→用户 <配置目录>/CLAUDE.md 与 rules→从文件系统根到 cwd 每层的 CLAUDE.md、.claude/CLAUDE.md、.claude/rules/*.md、CLAUDE.local.md→--add-dir 目录（需 CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD）→自动记忆 MEMORY.md。按 claudeMdExcludes 排除，首次加载打 tengu_claudemd__initial_load 并触发 InstructionsLoaded hook。
 */
async function getMemoryFiles(root, n, r, s, h, y) {
  if (isRemoteSessionAvailable()) {
    if (!s) recordMemoryContextBuild(r, []);
    return {
      loaded: [],
      withheld: [],
      root: getOriginalCwdOrNull(),
    };
  }
  let startTime = Date.now();
  if (!s) n.walkEpoch++;
  let walkEpoch = n.walkEpoch;
  let L = () => n.walkEpoch !== walkEpoch;
  logForDiagnosticsNoPII("info", "memory_files_started");
  let G = [];
  let processedPaths = new Set();
  let config = getCurrentProjectConfig();
  let Se = s || config.hasClaudeMdExternalIncludesApproved || false;
  let claudeMdExcludeMatcher = createClaudeMdExcludeMatcher();
  let managedFilePath = getManagedFilePath();
  let managedClaudeMd = getMemoryPath("Managed");
  let managedClaudeRulesDir = getManagedClaudeRulesDir();
  let Ie = isSettingSourceEnabled("userSettings") ? getClaudeConfigDirOrNull() : null;
  let Me =
    Ie === null
      ? null
      : {
          configHome: Ie,
          claudeMd: getMemoryPath("User"),
          rulesDir: getUserClaudeRulesDir(),
        };
  let We = isInstructionSourceEnabled("projectSettings");
  let ze = isInstructionSourceEnabled("localSettings");
  let lt = (We || ze) && !isDiskless() ? getOriginalCwd() : undefined;
  let userClaudeRulesDir = getOriginalCwdOrNull();
  let nt = lt === undefined ? null : getWorktreeRoots(lt);
  let pt = [];
  for (let un = lt; un !== undefined && un !== parse(un).root; un = dirname(un)) pt.unshift(un);
  let mapped = pt.map((un) => {
    let ao = isInMainRepoOutsideWorktree(un, nt);
    let $o = We && !ao;
    let yo = join(un, "CLAUDE.local.md");
    return {
      dir: un,
      project: $o,
      projectFiles: $o
        ? [join(un, "CLAUDE.md"), join(un, ".claude", "CLAUDE.md"), ...instructionFilesInDir(un)].filter(
            (Ho) => !claudeMdExcludeMatcher(Ho, "Project"),
          )
        : [],
      rulesDir: $o ? join(un, ".claude", "rules") : undefined,
      localFile: ze && !claudeMdExcludeMatcher(yo, "Local") ? yo : undefined,
    };
  });
  let originalCwd = getFsImplementation();
  let gt = isDiskless();
  let At = !gt && resolveExcludePatterns(originalCwd, managedFilePath);
  let It = Me !== null && h === undefined && resolveExcludePatterns(originalCwd, Me.configHome);
  let dir = mapped.findLast(
    ({ projectFiles, rulesDir, localFile }) =>
      projectFiles.length > 0 || rulesDir !== undefined || localFile !== undefined,
  )?.dir;
  let qt = h === undefined && dir !== undefined && resolveExcludePatterns(originalCwd, dir);
  let symlinkedMemoryPaths = findSymlinkedMemoryPaths(originalCwd, [
    ...(At
      ? [
          {
            base: managedFilePath,
            path: managedClaudeMd,
          },
          {
            base: managedFilePath,
            path: managedClaudeRulesDir,
          },
        ]
      : []),
    ...(It
      ? [
          ...(claudeMdExcludeMatcher(Me.claudeMd, "User")
            ? []
            : [
                {
                  base: Me.configHome,
                  path: Me.claudeMd,
                },
              ]),
          {
            base: Me.configHome,
            path: Me.rulesDir,
          },
        ]
      : []),
    ...(qt
      ? mapped.flatMap(({ dir, projectFiles, rulesDir, localFile }) =>
          [...projectFiles, rulesDir, localFile]
            .filter((Ho) => Ho !== undefined)
            .map((path) => ({
              base: dir,
              path,
            })),
        )
      : []),
  ]);
  let rn = gt
    ? new Set([...symlinkedMemoryPaths, managedClaudeMd, managedClaudeRulesDir])
    : symlinkedMemoryPaths;
  let gitRoot = createHeldPathTracker(root);
  let { held } = gitRoot;
  let hn = async (un, ao, $o) =>
    rn.has(un)
      ? getAllMemoryFilePaths(un, ao, processedPaths, claudeMdExcludeMatcher)
      : isInstructionsMemoryType_3(
          un,
          ao,
          processedPaths,
          Se,
          0,
          undefined,
          undefined,
          claudeMdExcludeMatcher,
          $o,
        );
  G.push(...(await hn(managedClaudeMd, "Managed")));
  let ho = remoteClaudeMd();
  if (ho)
    G.push({
      path: POLICY_HELPER_TAG,
      type: "Managed",
      content: ho,
      globs: [],
      contentDiffersFromDisk: true,
      rawContent: ho,
    });
  let claudeMd = getSettingsForSource("policySettings")?.claudeMd;
  if (claudeMd)
    G.push({
      path: MANAGED_SETTINGS_LABEL,
      type: "Managed",
      content: claudeMd,
      globs: [],
      contentDiffersFromDisk: true,
      rawContent: claudeMd,
    });
  if (!rn.has(managedClaudeRulesDir))
    G.push(
      ...(await processMdRules({
        rulesDir: managedClaudeRulesDir,
        type: "Managed",
        processedPaths,
        includeExternal: Se,
        conditionalRule: false,
        storageV5: h,
        excludeMatcher: claudeMdExcludeMatcher,
      })),
    );
  if (Me !== null) {
    let { claudeMd, rulesDir } = Me;
    G.push(
      ...(rn.has(claudeMd)
        ? getAllMemoryFilePaths(claudeMd, "User", processedPaths, claudeMdExcludeMatcher)
        : await isInstructionsMemoryType_3(
            claudeMd,
            "User",
            processedPaths,
            true,
            0,
            undefined,
            h !== undefined
              ? {
                  backend: h,
                  key: STORAGE_SPACES.state("user-memory"),
                }
              : undefined,
            claudeMdExcludeMatcher,
          )),
    );
    if (!rn.has(rulesDir))
      G.push(
        ...(await processMdRules({
          rulesDir,
          type: "User",
          processedPaths,
          includeExternal: true,
          conditionalRule: false,
          storageV5: h,
          excludeMatcher: claudeMdExcludeMatcher,
        })),
      );
  }
  let Kn = We && qt;
  let Xn = [];
  for (let { dir, project, projectFiles, rulesDir, localFile } of mapped) {
    if (project && Kn && !n.hasLoggedInitialLoad) Xn.push(hasAgentsMd(dir));
    let rr = dir === lt ? held?.within : held?.above(dir);
    for (let dotClaudePath of projectFiles) G.push(...(await hn(dotClaudePath, "Project", rr)));
    if (rulesDir !== undefined && !rn.has(rulesDir))
      G.push(
        ...(await processMdRules({
          rulesDir,
          type: "Project",
          processedPaths,
          includeExternal: Se,
          conditionalRule: false,
          storageV5: h,
          excludeMatcher: claudeMdExcludeMatcher,
          held: rr,
        })),
      );
    if (localFile !== undefined) G.push(...(await hn(localFile, "Local", rr)));
  }
  let read = claudeMdExtraState.peek(root)?.read;
  if (read) G.push(...applyClaudeMdExcludesToInjected(await read(), claudeMdExcludeMatcher));
  for (let dir of getAdditionalClaudeMdDirs()) {
    let projectPath = join(dir, "CLAUDE.md");
    G.push(
      ...(await isInstructionsMemoryType_3(
        projectPath,
        "Project",
        processedPaths,
        Se,
        0,
        undefined,
        undefined,
        claudeMdExcludeMatcher,
        held?.within,
      )),
    );
    let dotClaudePath = join(dir, ".claude", "CLAUDE.md");
    G.push(
      ...(await isInstructionsMemoryType_3(
        dotClaudePath,
        "Project",
        processedPaths,
        Se,
        0,
        undefined,
        undefined,
        claudeMdExcludeMatcher,
        held?.within,
      )),
    );
    let rulesDir = join(dir, ".claude", "rules");
    G.push(
      ...(await processMdRules({
        rulesDir,
        type: "Project",
        processedPaths,
        includeExternal: Se,
        conditionalRule: false,
        storageV5: h,
        excludeMatcher: claudeMdExcludeMatcher,
        held: held?.within,
      })),
    );
    if (isInstructionSourceEnabled("localSettings")) {
      let localPath = join(dir, "CLAUDE.local.md");
      G.push(
        ...(await isInstructionsMemoryType_3(
          localPath,
          "Local",
          processedPaths,
          Se,
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
      let Ho = coworkMemoryIndexContent === undefined && isAutoMemPathWithinAutoMemDir(autoMemEntrypoint);
      let rr = async (Hr) =>
        Hr ? (await safelyReadMemoryFileAsync(autoMemEntrypoint, "AutoMem")).info : null;
      let br =
        coworkMemoryIndexContent !== undefined
          ? buildInjectedAutoMemFile(coworkMemoryIndexContent)
          : await rr(Ho);
      if (
        br === null &&
        coworkMemoryIndexContent === undefined &&
        !s &&
        !isMemoryRecallEnabled() &&
        !env.CLAUDE_CODE_REMOTE &&
        Ho &&
        (await ensureMemoryIndexBackfill(root.host, autoMemPath))
      )
        br = await rr(isAutoMemPathWithinAutoMemDir(autoMemEntrypoint));
      if (br) {
        let normalizedPath = normalizePathForCompare(br.path);
        if (!processedPaths.has(normalizedPath)) {
          processedPaths.add(normalizedPath);
          G.push(br);
        }
      }
    }
  }
  let durationMs = Date.now() - startTime;
  let results = await Promise.all(Xn);
  let vn = L();
  if (!s && !vn) recordMemoryContextBuild(r, G);
  let totalContentLength = G.reduce((sum, ao) => sum + ao.content.length, 0);
  logForDiagnosticsNoPII("info", "memory_files_completed", {
    duration_ms: durationMs,
    file_count: G.length,
    total_content_length: totalContentLength,
  });
  let typeCounts = {};
  for (let un of G) typeCounts[un.type] = (typeCounts[un.type] ?? 0) + 1;
  if (!s && !n.hasLoggedInitialLoad && !vn) {
    n.hasLoggedInitialLoad = true;
    let agentsMdCount = Kn ? count(results, Boolean) : undefined;
    let ao = memoryFileSizeSummary(G);
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
      agents_md_count: agentsMdCount,
      ...{},
      duration_ms: durationMs,
    });
  }
  if (!s && !vn) {
    let eagerLoadReason = consumeNextEagerLoadReason(n);
    if (eagerLoadReason !== undefined && hasInstructionsLoadedHook())
      for (let file of G) {
        if (!isInstructionsMemoryType(file.type)) continue;
        if (isManagedOrVirtualPath(file.path)) continue;
        let loadReason = file.parent ? "include" : eagerLoadReason;
        executeInstructionsLoadedHooks(root, file.path, file.type, loadReason, {
          globs: file.globs,
          parentFilePath: file.parent,
          storageV5: h,
          credentials: y,
        });
      }
    for (let ao of n.reportsSetupGuides ? G : [])
      if (isInstructionsMemoryType(ao.type)) notifySetupGuideLoaded(ao.content, "claudemd", y, h, undefined);
  }
  let ko = gitRoot.withheld();
  if (!s && !vn) logWithheldInstructionFiles(root, ko);
  return {
    loaded: G,
    withheld: ko,
    root: userClaudeRulesDir,
  };
}
//@ chunk-e6aww6q8.js:1349300-1349439 callgraph-fingerprint = consumeNextEagerLoadReason (0.605)
function consumeNextEagerLoadReason(e) {
  if (!e.shouldFireHook) return;
  e.shouldFireHook = false;
  let nextEagerLoadReason = e.nextEagerLoadReason;
  e.nextEagerLoadReason = "session_start";
  return nextEagerLoadReason;
}
//@ chunk-e6aww6q8.js:1349495-1349518 placement
function clearMemoryFilesCacheForHost() {
  clearMemoryFilesCache(getRootSession());
}
//@ chunk-e6aww6q8.js:1349518-1349628 file-local
/**
 * 重置记忆文件缓存并记录下一次加载原因（默认 session_start），供 InstructionsLoaded hook。
 */
function resetGetMemoryFilesCache(e, nextEagerLoadReason = "session_start") {
  let r = claudeMdSessionState(e);
  r.nextEagerLoadReason = nextEagerLoadReason;
  r.shouldFireHook = true;
  r.walkEpoch++;
  clearMemoryFilesCache(e);
}
//@ chunk-e6aww6q8.js:1349628-1349671 fingerprint = nextEagerLoadReason (1)
function nextEagerLoadReason(nextEagerLoadReason = "session_start") {
  resetGetMemoryFilesCache(getRootSession(), nextEagerLoadReason);
}
//@ chunk-e6aww6q8.js:1349671-1349717 placement
/**
 * 重置“首次加载已记录”标记。
 */
function resetInitialLoadLogged(e) {
  claudeMdSessionState(e).hasLoggedInitialLoad = false;
}
//@ chunk-e6aww6q8.js:1349717-1349763 placement
/**
 * 标记“首次加载已记录”。
 */
function markInitialLoadLogged(session) {
  claudeMdSessionState(session).hasLoggedInitialLoad = true;
}
//@ chunk-e6aww6q8.js:1349763-1349807 placement
/**
 * 关闭安装向导的上报。
 */
function disableSetupGuideReports(session) {
  claudeMdSessionState(session).reportsSetupGuides = false;
}
//@ chunk-e6aww6q8.js:1349807-1349903 placement
function getLargeMemoryFiles(files) {
  let maxMemoryFileChars = getMaxMemoryFileChars();
  return files.filter(
    (file) =>
      !isManagedOrVirtualPath(file.path) &&
      isInstructionsMemoryType(file.type) &&
      file.content.length > maxMemoryFileChars,
  );
}
//@ chunk-e6aww6q8.js:1349903-1349972 placement
/**
 * 过滤出指令类（非托管）的记忆文件。
 */
function instructionMemoryFiles(e) {
  return includedMemoryFiles(e).filter(
    (n) => !isManagedOrVirtualPath(n.path) && isInstructionsMemoryType(n.type),
  );
}
//@ chunk-e6aww6q8.js:1349972-1350121 placement
function summarizeMemoryFileSizes(e) {
  let totalChars = 0;
  let r = 0;
  for (let s of e) {
    totalChars += s.content.length;
    r = Math.max(r, s.content.length);
  }
  return {
    fileCount: e.length,
    totalChars,
    largestChars: r,
  };
}
//@ chunk-e6aww6q8.js:1350121-1350156 placement
/**
 * 汇总记忆文件的大小。
 */
function memoryFileSizeSummary(e) {
  return summarizeMemoryFileSizes(instructionMemoryFiles(e));
}
//@ chunk-e6aww6q8.js:1350156-1350323 placement
function getMemoryFileLimits(e, n) {
  let maxMemoryFileChars_2 = getMaxMemoryFileChars(n);
  let s = maxMemoryFileChars(n);
  let h = summarizeMemoryFileSizes(e);
  return {
    limitChars: maxMemoryFileChars_2,
    totalLimitChars: s,
    ...h,
    filesOverLimit: count(e, (y) => y.content.length > maxMemoryFileChars_2),
    totalOverLimit: h.totalChars > s,
  };
}
//@ chunk-e6aww6q8.js:1350323-1350362 placement
/**
 * 计算记忆文件的大小上限统计。
 */
function memoryFileLimits(e, n) {
  return getMemoryFileLimits(instructionMemoryFiles(e), n);
}
//@ chunk-e6aww6q8.js:1350362-1350609 placement
/**
 * 记忆文件总量超过上限时返回统计与最大的三个文件，否则 null。
 */
function getOversizedMemoryWarning(memoryFiles) {
  let n = instructionMemoryFiles(memoryFiles);
  let memoryFileLimits = getMemoryFileLimits(n, undefined);
  if (
    n.reduce(
      (acc, S) => (S.content.length > memoryFileLimits.limitChars ? acc : acc + S.content.length),
      0,
    ) <= memoryFileLimits.totalLimitChars
  )
    return null;
  let largest = n.toSorted((y, S) => S.content.length - y.content.length).slice(0, 3);
  return {
    summary: memoryFileLimits,
    largest,
  };
}
//@ chunk-e6aww6q8.js:1350685-1350851 placement
/**
 * 判断记忆文件是否注入上下文（自动记忆开启召回时、项目文件被开关关闭时或内容为空时不注入）。
 */
function shouldInjectMemoryFile(e) {
  if (e.type === "AutoMem" && isMemoryRecallEnabled()) return false;
  if (
    (e.type === "Project" || e.type === "Local") &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_paper_halyard", false)
  )
    return false;
  if (!e.content) return false;
  return true;
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
/**
 * 记忆文件超限时的预警（统计与最大三个文件）。
 */
var oversizedMemoryWarning = (e, n) => formatMemoryInstruction(includedMemoryFiles(e, n));
//@ chunk-e6aww6q8.js:1351058-1351122 placement
/**
 * 过滤出应包含且在指定类型内的记忆文件。
 */
function includedMemoryFiles(e, n) {
  return e.filter((r) => (!n || n(r.type)) && shouldIncludeMemoryFile(r));
}
//@ chunk-e6aww6q8.js:1351244-1351476 fingerprint = getManagedAndUserConditionalRules (0.896)
/**
 * 取托管与用户 rules 中的条件规则（带 paths: frontmatter）。
 */
async function getManagedAndUserConditionalRules(targetPath, processedPaths, r) {
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
        r,
      )),
    );
  let h = isSettingSourceEnabled("userSettings") ? getUserRulesDirOrNull() : null;
  if (h !== null)
    result.push(...(await processConditionedMdRules(targetPath, h, "User", processedPaths, true, r)));
  return result;
}
//@ chunk-e6aww6q8.js:1351476-1352178 fingerprint = getMemoryFilesForNestedDirectory (0.919)
/**
 * 访问嵌套目录（cwd 以下）时补加载该目录的 CLAUDE.md、.claude/CLAUDE.md、CLAUDE.local.md 与 rules；CLAUDE_CODE_DISABLE_CLAUDE_MDS 或 diskless 时为空。
 */
async function getMemoryFilesForNestedDirectory(
  dir,
  targetPath,
  processedPaths,
  { skipProject: s = false, held: h } = {},
) {
  if (env.CLAUDE_CODE_DISABLE_CLAUDE_MDS) return [];
  if (isDiskless()) return [];
  let result = [];
  let S = isInstructionSourceEnabled("projectSettings") && !s;
  if (S) {
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
        h,
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
        h,
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
        h,
      )),
    );
  }
  if (S) {
    let rulesDir = join(dir, ".claude", "rules");
    let unconditionalProcessedPaths = new Set(processedPaths);
    result.push(
      ...(await processMdRules({
        rulesDir,
        type: "Project",
        processedPaths: unconditionalProcessedPaths,
        includeExternal: false,
        conditionalRule: false,
        held: h,
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
        h,
      )),
    );
    for (let path of unconditionalProcessedPaths) processedPaths.add(path);
  }
  return result;
}
//@ chunk-e6aww6q8.js:1352178-1352361 fingerprint = getConditionalRulesForCwdLevelDirectory (0.799)
async function getConditionalRulesForCwdLevelDirectory(dir, targetPath, processedPaths, s) {
  if (env.CLAUDE_CODE_DISABLE_CLAUDE_MDS || !isInstructionSourceEnabled("projectSettings")) return [];
  if (isDiskless()) return [];
  let rulesDir = join(dir, ".claude", "rules");
  return processConditionedMdRules(targetPath, rulesDir, "Project", processedPaths, false, undefined, s);
}
//@ chunk-e6aww6q8.js:1352361-1352863 fingerprint = processConditionedMdRules (0.808)
/**
 * 按目标文件路径匹配条件规则的 paths glob，命中则加载（claudemd_rule_globs）。
 */
async function processConditionedMdRules(
  targetPath,
  n,
  type,
  processedPaths,
  includeExternal,
  storageV5,
  held,
) {
  let conditionedRuleMdFiles = await processMdRules({
    rulesDir: n,
    type,
    processedPaths,
    includeExternal,
    conditionalRule: true,
    storageV5,
    held,
  });
  let L = type === "Project" ? dirname(dirname(n)) : getOriginalCwd();
  let G = isAbsolute(targetPath) ? relative(L, targetPath) : targetPath;
  if (isAbsolute(targetPath) && (!G || G.startsWith("..") || isAbsolute(G))) {
    let q = dirname(targetPath);
    let Z = safeResolvePath(getFsImplementation(), q);
    let resolvedPath = Z.resolvedPath;
    if (resolvedPath !== q && !isNonCanonicalSymlink(q, Z))
      G = relative(L, join(resolvedPath, basename(targetPath)));
  }
  return conditionedRuleMdFiles.filter((file) => {
    if (!file.globs || file.globs.length === 0) return false;
    if (!G || G.startsWith("..") || isAbsolute(G)) return false;
    return minimatchModule
      .default()
      .add(filterUsableIgnorePatterns(file.globs, "claudemd_rule_globs"))
      .ignores(G);
  });
}
//@ chunk-e6aww6q8.js:1352863-1353090 fingerprint = getExternalClaudeMdIncludes (0.793)
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
//@ chunk-e6aww6q8.js:1353090-1353129 placement
function hasExternalClaudeMdIncludes(files) {
  return getExternalClaudeMdIncludes(files).length > 0;
}
//@ chunk-e6aww6q8.js:1353286-1353294 placement
/**
 * 可替换的 Markdown 词法分析器实现。
 */
var markdownLexerOverride;
//@ chunk-e6aww6q8.js:1353294-1353316 placement
/**
 * 注册 Markdown 词法分析器。
 */
function setMarkdownLexer(getUserContextInstructionFiles) {
  markdownLexerOverride = getUserContextInstructionFiles;
}
//@ chunk-e6aww6q8.js:1353316-1353381 placement
/**
 * 调用注册的 Markdown 词法分析器（未注册时返回空的 Promise）。
 */
function lexMarkdownWith(session, n, r) {
  return markdownLexerOverride?.(session, n, r) ?? Promise.resolve(undefined);
}
//@ chunk-e6aww6q8.js:3155916-3156204 fingerprint = isMemoryFilePath (0.962)
/**
 * 判断路径是否为指令文件（CLAUDE.md、CLAUDE.local.md 或 .claude/rules/*.md），返回其所属项目目录。
 */
function isMemoryFilePath(filePath) {
  let name = basename(filePath);
  let r;
  let index = filePath.indexOf(`${sep}.claude${sep}rules${sep}`);
  if (index >= 0) r = name.endsWith(".md") ? filePath.slice(0, index) : undefined;
  else if (name === "CLAUDE.md" || name === "CLAUDE.local.md" || INSTRUCTION_FILE_NAMES.includes(name)) {
    r = dirname(filePath);
    if (name === "CLAUDE.md" && basename(r) === ".claude") r = dirname(r);
  }
  return r !== undefined && r !== parse(r).root ? r : undefined;
}
//@ chunk-4121qate.js:104278-104481 fingerprint = MEMORY_INSTRUCTION_PROMPT (1)
/**
 * 注入 CLAUDE.md 内容前的固定前言（These instructions OVERRIDE any default behavior）。
 */
var MEMORY_INSTRUCTION_PROMPT =
  "Codebase and user instructions are shown below. Be sure to adhere to these instructions. IMPORTANT: These instructions OVERRIDE any default behavior and you MUST follow them exactly as written.";
//@ chunk-4121qate.js:104481-104870 fingerprint = getClaudeMds (0.745)
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
//@ chunk-cjydagjy.js:15359-15659 callgraph-fingerprint = shouldShowClaudeMdExternalIncludesWarning (0.207)
/**
 * 列出托管 CLAUDE.md/rules 中引用了外部文件的 include，供外部引用审批对话框使用。
 */
async function shouldShowClaudeMdExternalIncludesWarning() {
  if (isClaudeMdLoadingDisabled() || isRemoteSessionAvailable() || isDiskless()) return [];
  let e = new Set();
  let hasClaudeMdExternalIncludesApproved =
    getCurrentProjectConfig().hasClaudeMdExternalIncludesApproved || false;
  return [
    ...(await isInstructionsMemoryType_3(
      getMemoryPath("Managed"),
      "Managed",
      e,
      hasClaudeMdExternalIncludesApproved,
    )),
    ...(await processMdRules({
      rulesDir: getManagedClaudeRulesDir(),
      type: "Managed",
      processedPaths: e,
      includeExternal: hasClaudeMdExternalIncludesApproved,
      conditionalRule: false,
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
  isManagedOrVirtualPath,
  shouldInjectMemoryFile,
  setClaudeMdJudgedBy,
  getWorktreeRoots,
  beginCwdRelocationHold,
  getMemoryFilesForNestedDirectory,
  isInMainRepoOutsideWorktree,
  oversizedMemoryWarning,
  resetGetMemoryFilesCache,
  resetInitialLoadLogged,
  getExternalClaudeMdIncludes,
  getClaudeMds,
  MEMORY_INSTRUCTION_PROMPT,
  hasExternalClaudeMdIncludes,
  withNoDenyRules,
  isInstructionsMemoryType_3,
  MAX_INCLUDE_DEPTH,
  processMdRules,
  claudeMdSessionState,
  isSpecialOrUnsafePath,
  isNonCanonicalSymlink,
  lexMarkdown,
  claudeMdExtraState,
  getAdditionalClaudeMdDirs,
  lexMarkdownWith,
  getManagedAndUserConditionalRules,
  getConditionalRulesForCwdLevelDirectory,
  applyClaudeMdExcludesToInjected,
  MEMORY_SIZE_SOFT_RATIO,
  MEMORY_SIZE_WARN_RATIO,
  ClaudeMdAccessTracker,
  MD_LINK_RE,
  setMarkdownLexer,
  includedMemoryFiles,
  stripHtmlComments,
  nextEagerLoadReason,
  isMemoryFilePath,
  isInstructionSourceEnabled,
  createHeldPathTracker,
  claudeMdLoadStateByHost,
  memoryFileLimits,
  processMemoryFile,
  disableSetupGuideReports,
  markInitialLoadLogged,
};
