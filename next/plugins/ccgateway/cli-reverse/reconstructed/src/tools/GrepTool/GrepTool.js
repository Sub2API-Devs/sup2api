/**
 * tools/GrepTool/GrepTool.ts
 *
 * Grep 工具：ripgrep 正则搜索，三种输出模式、head_limit/offset 分页（混有插件打包扫描的误归声明）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/GrepTool/GrepTool.ts
 * pieces: chunk-5xgkngpb.js (16)
 * attribution: placement 10, fingerprint 5, affinity 1
 */
import { basename, sep } from "path";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_picomatch_2 } from "../../../vendor/picomatch/index.js";
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { GREP_TOOL_NAME, getDescription } from "./prompt.js";
import { coerceBooleanString, booleanishSchema } from "../../utils/spellcheck.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  _enum,
  numberSchema,
  booleanSchema,
  objectSchema,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { coercedNumberSchema } from "../ArtifactTool/publishEdits.js";
import {
  attachedMachineInputField,
  HOST_TOOL_INPUT_FIELD,
  hostContextMeta,
  hasHostField,
  canRunToolsOnThisMachine,
  hostFieldNotForwardedMessage,
} from "../../bridge/deviceRegistration.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { getToolUseSummary_3 } from "../GlobTool/UI.js";
import { parsedToolInputOrNull, rejectNullBytes } from "../../utils/filePathValidation.js";
import { remoteRoutingCandidate } from "../../utils/remoteTools/toolHostRouting.js";
import { isRemoteOnlyCheck } from "../../utils/permissions/checkRegistry.js";
import { expandPath, toRelativePath } from "../../utils/path.js";
import { getCwd } from "../../utils/cwd.js";
import { matchWildcardPattern } from "../../utils/permissions/shellRuleMatching.js";
import { renderToolUseMessage } from "./UI.js";
import { plural, stripSuffix } from "../../utils/stringUtils.js";
import {
  walkPermissionCheckPaths,
  getPathsForPermissionCheck,
  getFsImplementation,
} from "../../utils/fsOperations.js";
import {
  checkReadPermissionForTool,
  getFileReadIgnorePatterns,
  mayBeGuardedFileSyncCopy,
  normalizeCaseForComparison_2,
  matchingRuleForInput,
  mayEscapeExclusionGlobs,
  denyFoldVariantPaths,
} from "../../utils/permissions/filesystem.js";
import { pathFromToolUse } from "../../components/permissions/FilesystemPermissionRequest/FilesystemPermissionRequest.js";
import { isUntouchableSpelling } from "../../utils/networkPaths.js";
import { isENOENT, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { normalizePathForComparison, FILE_NOT_FOUND_CWD_NOTE } from "../../utils/file.js";
import { encodeControlChars } from "../../utils/sanitization.js";
import { separateCopyHint } from "../../utils/remoteTools/folderSync.js";
import {
  buildDenyRuleGlobs,
  hasUnsafeDenyGlob,
  getRipgrepDisplayRoot,
  ripGrep_2,
  assertDenyGlobsUnchanged,
  RipgrepTimeoutError,
  splitNulDelimitedOutput,
  getAlternateRootSpellings,
} from "../../utils/ripgrep.js";
import { getPluginCacheExclusionDirs, toRipgrepExcludeGlob } from "../../utils/glob.js";
import {
  isTaskOutputFilePath,
  bindTaskOutputForRead,
  taskOutputDirExclusions,
} from "../../utils/task/diskOutput.js";
import { procFdPath } from "../../utils/fsSafety/pathRevalidation.js";
import { INHERITED_FD_PATH } from "../../utils/execFileNoThrow.js";
import { createAbortableStream } from "../../utils/readFileInRange.js";
import { jsonParseRaw } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1439500-1439677 placement
var SEARCH_INCOMPLETE_NOTE =
  "The search stopped before it finished, most likely at its time limit, so these results are incomplete: more matches may exist. Search a more specific path or pattern.";
//@ chunk-5xgkngpb.js:1445764-1445784 placement
/**
 * 按需加载的 ripgrep 模块（interopRequireDefault 包装后取 default）。
 */
var interopRequireDefault; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1445764", () => {
  interopRequireDefault = __toESM(require_picomatch_2(), 1);
});
//@ chunk-5xgkngpb.js:1445846-1445917 placement
/**
 * Grep 的布尔简写选项到 output_mode 的映射（-l → files_with_matches、-c → count）。
 */
var GREP_BOOLEAN_SHORTHANDS = [
  ["-l", "flag_l", "files_with_matches"],
  ["-c", "flag_c", "count"],
];
//@ chunk-5xgkngpb.js:1445917-1446818 placement
/**
 * 把 Grep 工具输入中的 file_path 别名映射为 path。
 */
function normalizeGrepInputAliases(rawInput) {
  if (!isPlainObject_6(rawInput)) return null;
  let normalizedInput = {
    ...rawInput,
  };
  let appliedAliases = [];
  let notes = [];
  let filePath = normalizedInput.file_path;
  if (typeof filePath === "string" && filePath !== "") {
    let pathMissing = !Object.hasOwn(normalizedInput, "path");
    if (pathMissing || normalizedInput.path === filePath) {
      delete normalizedInput.file_path;
      normalizedInput.path = filePath;
      appliedAliases.push(pathMissing ? "file_path" : "repeated_file_path");
      notes.push(
        `${GREP_TOOL_NAME}'s parameter for where to search is named \`path\`. ${pathMissing ? "`file_path` was read as `path`." : "`file_path` repeated `path` and was ignored."}`,
      );
    }
  }
  for (let [shorthandFlag, aliasName, outputMode] of GREP_BOOLEAN_SHORTHANDS) {
    if (coerceBooleanString(normalizedInput[shorthandFlag]) !== true) continue;
    let outputModeMissing = !Object.hasOwn(normalizedInput, "output_mode");
    if (outputModeMissing || normalizedInput.output_mode === outputMode) {
      delete normalizedInput[shorthandFlag];
      normalizedInput.output_mode = outputMode;
      appliedAliases.push(outputModeMissing ? aliasName : `repeated_${aliasName}`);
      notes.push(
        outputModeMissing
          ? `\`${shorthandFlag}\` is not a ${GREP_TOOL_NAME} parameter and was read as \`output_mode: "${outputMode}"\`.`
          : `\`${shorthandFlag}\` repeated \`output_mode\` and was ignored.`,
      );
    }
  }
  if (coerceBooleanString(normalizedInput["-r"]) === true) {
    delete normalizedInput["-r"];
    appliedAliases.push("flag_r");
    notes.push(`\`-r\` was ignored: ${GREP_TOOL_NAME} always searches a directory recursively.`);
  }
  return appliedAliases.length
    ? {
        input: normalizedInput,
        shapeClass: appliedAliases.join(","),
        resultNote: `Note: ${notes.join(" ")}`,
      }
    : null;
}
//@ chunk-5xgkngpb.js:1446818-1449312 fingerprint (2.1.88 match: inputSchema, 0.841)
/**
 * Grep 输入 schema（pattern/path/glob/output_mode/-B/-A/-C/context/-n/-i/-o/type/head_limit/offset/multiline）、VCS 目录排除列表、默认 head_limit 250。
 */
var grepInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var grepInputSchemaRef;
var VCS_DIRECTORIES_TO_EXCLUDE;
var DEFAULT_HEAD_LIMIT;
deferInit("chunk-5xgkngpb.js:1446818", () => {
  grepInputSchema = DoctorLazy(() =>
    zodStrictObject({
      pattern: stringSchema().describe("The regular expression pattern to search for in file contents"),
      path: stringSchema()
        .optional()
        .describe("File or directory to search in (rg PATH). Defaults to current working directory."),
      glob: stringSchema()
        .optional()
        .describe('Glob pattern to filter files (e.g. "*.js", "*.{ts,tsx}") - maps to rg --glob'),
      output_mode: _enum(["content", "files_with_matches", "count"])
        .optional()
        .describe(
          'Output mode: "content" shows matching lines (supports -A/-B/-C context, -n line numbers, head_limit), "files_with_matches" shows file paths (supports head_limit), "count" shows match counts (supports head_limit). Defaults to "files_with_matches".',
        ),
      "-B": coercedNumberSchema(numberSchema().optional()).describe(
        'Number of lines to show before each match (rg -B). Requires output_mode: "content", ignored otherwise.',
      ),
      "-A": coercedNumberSchema(numberSchema().optional()).describe(
        'Number of lines to show after each match (rg -A). Requires output_mode: "content", ignored otherwise.',
      ),
      "-C": coercedNumberSchema(numberSchema().optional()).describe("Alias for context."),
      context: coercedNumberSchema(numberSchema().optional()).describe(
        'Number of lines to show before and after each match (rg -C). Requires output_mode: "content", ignored otherwise.',
      ),
      "-n": booleanishSchema(booleanSchema().optional()).describe(
        'Show line numbers in output (rg -n). Requires output_mode: "content", ignored otherwise. Defaults to true.',
      ),
      "-i": booleanishSchema(booleanSchema().optional()).describe("Case insensitive search (rg -i)"),
      "-o": booleanishSchema(booleanSchema().optional()).describe(
        'Print only the matched (non-empty) parts of each matching line, one match per output line (rg -o / --only-matching). Requires output_mode: "content", ignored otherwise. Defaults to false.',
      ),
      type: stringSchema()
        .optional()
        .describe(
          "File type to search (rg --type). Common types: js, py, rust, go, java, etc. More efficient than include for standard file types.",
        ),
      head_limit: coercedNumberSchema(numberSchema().optional()).describe(
        'Limit output to first N lines/entries, equivalent to "| head -N". Works across all output modes: content (limits output lines), files_with_matches (limits file paths), count (limits count entries). Defaults to 250 when unspecified. Pass 0 for unlimited (use sparingly \u2014 large result sets waste context).',
      ),
      offset: coercedNumberSchema(numberSchema().optional()).describe(
        'Skip first N lines/entries before applying head_limit, equivalent to "| tail -n +N | head -N". Works across all output modes. Defaults to 0.',
      ),
      multiline: booleanishSchema(booleanSchema().optional()).describe(
        "Enable multiline mode where . matches newlines and patterns can span lines (rg -U --multiline-dotall). Default: false.",
      ),
      ...attachedMachineInputField(),
    }),
  );
  grepInputSchemaRef = grepInputSchema;
  VCS_DIRECTORIES_TO_EXCLUDE = [".git", ".svn", ".hg", ".bzr", ".jj", ".sl"];
  DEFAULT_HEAD_LIMIT = 250;
});
//@ chunk-5xgkngpb.js:1449312-1449473 fingerprint (2.1.88 match: applyHeadLimit, 1)
/**
 * 按 offset/limit 截取结果（limit 为 0 表示不限，未给时 250），返回是否实际截断。
 */
function applyHeadLimit(items, limit, offset = 0) {
  if (limit === 0)
    return {
      items: items.slice(offset),
      appliedLimit: undefined,
    };
  let effectiveLimit = limit ?? DEFAULT_HEAD_LIMIT;
  let sliced = items.slice(offset, offset + effectiveLimit);
  let wasTruncated = items.length - offset > effectiveLimit;
  return {
    items: sliced,
    appliedLimit: wasTruncated ? effectiveLimit : undefined,
  };
}
//@ chunk-5xgkngpb.js:1449473-1449584 fingerprint (2.1.88 match: formatLimitInfo, 1)
/**
 * 把实际 limit/offset 格式化为 "limit: N, offset: M"。
 */
function formatLimitInfo(appliedLimit, appliedOffset) {
  let parts = [];
  if (appliedLimit !== undefined) parts.push(`limit: ${appliedLimit}`);
  if (appliedOffset) parts.push(`offset: ${appliedOffset}`);
  return parts.join(", ");
}
//@ chunk-5xgkngpb.js:1449584-1452877 fingerprint (2.1.88 match: GrepTool, 0.62)
/**
 * Grep 工具定义（name "Grep"）。只读、可并发、maxResultSizeChars 20000；ripgrep 正则搜索，三种 output_mode，head_limit 默认 250、offset 分页；validateInput 查空字节与 head_limit/offset 为非负整数。
 */
var grepOutputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var GrepTool;
deferInit("chunk-5xgkngpb.js:1449584", () => {
  grepOutputSchema = DoctorLazy(() =>
    objectSchema({
      mode: _enum(["content", "files_with_matches", "count"]).optional(),
      numFiles: numberSchema(),
      filenames: array(stringSchema()),
      content: stringSchema().optional(),
      numLines: numberSchema().optional(),
      numMatches: numberSchema().optional(),
      totalFiles: numberSchema().optional(),
      totalLines: numberSchema().optional(),
      appliedLimit: numberSchema().optional(),
      appliedOffset: numberSchema().optional(),
      timedOut: booleanSchema().optional(),
    }),
  );
  GrepTool = buildTool({
    name: GREP_TOOL_NAME,
    searchHint: "search file contents with regex (ripgrep)",
    remoteExecution: {
      supported: true,
    },
    backgrounding: "never",
    maxResultSizeChars: 20000,
    strict: true,
    async description() {
      return getDescription(undefined);
    },
    userFacingName() {
      return "Search";
    },
    getToolUseSummary: getToolUseSummary_3,
    getActivityDescription(input) {
      let summary = getToolUseSummary_3(input);
      return summary ? `Searching for ${summary}` : "Searching";
    },
    get inputSchema() {
      return grepInputSchemaRef();
    },
    get outputSchema() {
      return grepOutputSchema();
    },
    coerceInput(input) {
      return parsedToolInputOrNull(grepInputSchemaRef(), normalizeGrepInputAliases(input));
    },
    isConcurrencySafe() {
      return true;
    },
    isReadOnly() {
      return true;
    },
    toAutoClassifierInput(input) {
      let hostRouting = remoteRoutingCandidate(input);
      return hostRouting === undefined
        ? input.path
          ? `${input.pattern} in ${input.path}`
          : input.pattern
        : {
            pattern: input.pattern,
            ...(input.path !== undefined && {
              path: input.path,
            }),
            [HOST_TOOL_INPUT_FIELD]: hostRouting,
            ...hostContextMeta(input),
          };
    },
    suppressesAllPermissionUpdates(input) {
      return hasHostField(input);
    },
    isSearchOrReadCommand() {
      return {
        isSearch: true,
        isRead: false,
      };
    },
    ruleContentField: "path",
    getPath({ path: input }) {
      if (isRemoteOnlyCheck(GREP_TOOL_NAME)) return input ?? "";
      return input ? expandPath(input) : getCwd();
    },
    async preparePermissionMatcher({ pattern: options }) {
      return (toolUseID) => matchWildcardPattern(toolUseID, options);
    },
    async prompt({ model: input, leanPrompt: callOptions, leanRewrite: path }) {
      return getDescription(input, callOptions, path);
    },
    renderToolUseMessage,
    extractSearchText({ mode: input, content: callOptions, filenames: path }) {
      if (input === "content" && callOptions) return callOptions;
      return path.join(`
`);
    },
    mapToolResultToToolResultBlockParam(
      {
        mode: input = "files_with_matches",
        numFiles,
        filenames,
        content,
        numLines: _numLines,
        numMatches,
        totalFiles,
        totalLines,
        appliedLimit,
        appliedOffset,
        timedOut,
      },
      toolUseID,
    ) {
      let timeoutNote = timedOut
        ? `${SEARCH_INCOMPLETE_NOTE}

`
        : "";
      if (input === "content") {
        let limitInfo = formatLimitInfo(appliedLimit, appliedOffset);
        let resultContent =
          content ||
          (appliedOffset && (totalLines ?? 0) > 0 ? "No entries at this offset" : "No matches found");
        let contentText = limitInfo
          ? `${resultContent}

[Showing results with pagination = ${limitInfo}]`
          : resultContent;
        return {
          tool_use_id: toolUseID,
          type: "tool_result",
          content: timeoutNote + contentText,
        };
      }
      if (input === "count") {
        let limitInfo = formatLimitInfo(appliedLimit, appliedOffset);
        let matchCount = numMatches ?? 0;
        let files = numFiles ?? 0;
        let countText = content || (matchCount > 0 ? "No entries at this offset" : "No matches found");
        let summaryLine = `

Found ${matchCount} total ${matchCount === 1 ? "occurrence" : "occurrences"} across ${files} ${files === 1 ? "file" : "files"}.${limitInfo ? ` with pagination = ${limitInfo}` : ""}`;
        return {
          tool_use_id: toolUseID,
          type: "tool_result",
          content: timeoutNote + countText + summaryLine,
        };
      }
      let limitInfo = formatLimitInfo(appliedLimit, appliedOffset);
      if (numFiles === 0)
        return {
          tool_use_id: toolUseID,
          type: "tool_result",
          content:
            timeoutNote +
            (appliedOffset && (totalFiles ?? 0) > 0
              ? `No entries at this offset. [Showing results with pagination = ${limitInfo}]`
              : "No files found"),
        };
      let fileListText = `Found ${numFiles} ${plural(numFiles, "file")}${limitInfo ? ` ${limitInfo}` : ""}
${filenames.join(`
`)}`;
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content: timeoutNote + fileListText,
      };
    },
    create(toolContext) {
      return {
        async validateInput(input) {
          let { pattern, path, glob, type: fileType, head_limit: headLimit, offset } = input;
          if (canRunToolsOnThisMachine() && hasHostField(input))
            return {
              result: false,
              message: hostFieldNotForwardedMessage(),
              errorCode: 3,
            };
          let nullByteRefusal = rejectNullBytes(GREP_TOOL_NAME, [
            ["pattern", pattern],
            ["path", path],
            ["glob", glob],
            ["type", fileType],
          ]);
          if (nullByteRefusal) return nullByteRefusal;
          for (let [paramName, paramValue] of [
            ["head_limit", headLimit],
            ["offset", offset],
          ])
            if (paramValue !== undefined && (!Number.isInteger(paramValue) || paramValue < 0))
              return {
                result: false,
                message: `${paramName} must be a whole number of 0 or more, got ${paramValue}.${paramName === "head_limit" ? " Pass 0 for unlimited." : ""}`,
                errorCode: 2,
              };
          return {
            result: true,
          };
        },
        async checkPermissions(input, callOptions) {
          let path = GrepTool.getPath(input);
          let pathSpellings = walkPermissionCheckPaths(path);
          toolContext.session.writePermissionStash.stash(
            callOptions.toolUseId,
            path,
            pathSpellings.spellings,
            "read",
          );
          return checkReadPermissionForTool(GrepTool, input, toolContext.permissions(), pathSpellings);
        },
        async call(input, callOptions) {
          return pathFromToolUse(input, {
            toolUseId: callOptions.toolUseId,
            signal: callOptions.signal,
            timing: callOptions.timing,
            remoteCall: callOptions.remoteCall,
            session: toolContext.session,
            toolState: toolContext.toolState,
            permissions: toolContext.permissions,
          });
        },
      };
    },
  });
});
//@ chunk-5xgkngpb.js:1452877-1453158 placement
/**
 * 校验 Grep 的搜索路径存在（受保护路径或权限检查路径变化时跳过）；不存在时抛出带当前目录与"你是不是指…"建议的遥测安全错误。
 */
async function assertGrepPathExists(path, permittedPaths, checkContext) {
  let expandedPath = expandPath(path);
  if (
    isUntouchableSpelling(expandedPath) ||
    getPathsForPermissionCheck(expandedPath).some((pathSpelling) => !permittedPaths.includes(pathSpelling))
  )
    return;
  try {
    await getFsImplementation().stat(expandedPath);
  } catch (error) {
    if (!isENOENT(error)) throw error;
    let normalizedPath = await normalizePathForComparison(expandedPath);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      encodeControlChars(
        `Path does not exist: ${path}. ${FILE_NOT_FOUND_CWD_NOTE} ${getCwd()}.${normalizedPath ? ` Did you mean ${normalizedPath}?` : ""}${separateCopyHint(GrepTool, expandedPath, checkContext)}`,
      ),
      "Path does not exist",
    );
  }
}
//@ chunk-5xgkngpb.js:1453345-1453360 affinity
/**
 * 表示“不适用”的 undefined 常量，用于空结果的 appliedLimit/appliedOffset。
 */
var NOT_APPLICABLE = undefined;
//@ chunk-5xgkngpb.js:1453360-1453785 fingerprint (2.1.88 match: outputSchema, 0.765)
/**
 * 搜索目标不可打开时按 output_mode 返回空结果。
 */
function emptyGrepResult(input) {
  switch (input.output_mode ?? "files_with_matches") {
    case "content":
      return {
        data: {
          mode: "content",
          numFiles: 0,
          filenames: [],
          content: "",
          numLines: 0,
          totalLines: 0,
          appliedLimit: NOT_APPLICABLE,
          appliedOffset: NOT_APPLICABLE,
        },
      };
    case "count":
      return {
        data: {
          mode: "count",
          numFiles: 0,
          filenames: [],
          content: "",
          numMatches: 0,
          appliedLimit: NOT_APPLICABLE,
          appliedOffset: NOT_APPLICABLE,
        },
      };
    case "files_with_matches":
      return {
        data: {
          mode: "files_with_matches",
          filenames: [],
          numFiles: 0,
          totalFiles: 0,
        },
      };
  }
}
//@ chunk-5xgkngpb.js:1453785-1459115 placement
/**
 * Grep 工具的执行主体：按参数组装 ripgrep 参数（隐藏文件、排除 VCS 目录、列宽、多行、大小写、输出模式、上下文、类型与 glob、读取 deny 规则与忽略模式），任务输出文件改为单独绑定读取；运行 ripgrep 后按输出模式整理结果、做分页与权限过滤。
 */
async function runGrep(
  searchTarget,
  {
    pattern,
    glob,
    type: fileType,
    output_mode: outputMode = "files_with_matches",
    "-B": beforeContext,
    "-A": afterContext,
    "-C": contextLines,
    context,
    "-n": showLineNumbers = true,
    "-i": caseInsensitive = false,
    "-o": onlyMatching = false,
    head_limit: headLimit,
    offset = 0,
    multiline = false,
  },
  context_2,
) {
  let { signal, timing } = context_2;
  let canonical = searchTarget.canonical;
  let rgArgs = ["--hidden"];
  let userGlobIndices = [];
  let builtinGlobIndices = new Set();
  let addGlob = (globPattern) => {
    builtinGlobIndices.add(rgArgs.length);
    rgArgs.push("--glob", globPattern);
  };
  for (let excludedDir of VCS_DIRECTORIES_TO_EXCLUDE) addGlob(`!${excludedDir}`);
  rgArgs.push("--max-columns", "500");
  if (multiline) rgArgs.push("-U", "--multiline-dotall");
  if (caseInsensitive) rgArgs.push("-i");
  if (outputMode === "files_with_matches") rgArgs.push("-l");
  else if (outputMode === "count") rgArgs.push("-c", "-H");
  rgArgs.push(outputMode === "content" ? "--json" : "--null");
  if (outputMode === "content") rgArgs.push("-n");
  if (onlyMatching && outputMode === "content") rgArgs.push("-o");
  if (outputMode === "content")
    if (context !== undefined) rgArgs.push("-C", context.toString());
    else if (contextLines !== undefined) rgArgs.push("-C", contextLines.toString());
    else {
      if (beforeContext !== undefined) rgArgs.push("-B", beforeContext.toString());
      if (afterContext !== undefined) rgArgs.push("-A", afterContext.toString());
    }
  if (pattern.startsWith("-")) rgArgs.push("-e", pattern);
  else rgArgs.push(pattern);
  if (fileType) rgArgs.push("--type", fileType);
  if (glob) {
    let userGlobs = [];
    let parts = glob.split(/\s+/);
    for (let globPart of parts)
      if (globPart.includes("{") && globPart.includes("}")) userGlobs.push(globPart);
      else userGlobs.push(...globPart.split(",").filter(Boolean));
    for (let userGlob of userGlobs.filter(Boolean)) {
      userGlobIndices.push(rgArgs.length);
      addGlob(userGlob);
    }
  }
  let readIgnorePatterns = getFileReadIgnorePatterns(context_2.permissions());
  let denyGlobs = buildDenyRuleGlobs(readIgnorePatterns, searchTarget);
  let judgeEveryResult =
    searchTarget.judgeEveryResult === true ||
    hasUnsafeDenyGlob(readIgnorePatterns, searchTarget) ||
    (readIgnorePatterns.size > 0 && mayBeGuardedFileSyncCopy(searchTarget.canonical));
  for (let denyGlob of denyGlobs) rgArgs.push("--iglob", denyGlob);
  for (let pluginDir of await getPluginCacheExclusionDirs(canonical)) {
    let globPattern = toRipgrepExcludeGlob(pluginDir, getRipgrepDisplayRoot(searchTarget));
    if (globPattern === null) continue;
    addGlob(globPattern);
  }
  let rgLines;
  let timedOut = false;
  let taskOutput = isTaskOutputFilePath(canonical) ? await bindTaskOutputForRead(canonical) : undefined;
  let taskOutputNeedsStdin =
    taskOutput !== undefined && taskOutput.ioPath !== procFdPath(taskOutput.handle.fd);
  let searchPathArg =
    taskOutput === undefined ? searchTarget.target : taskOutputNeedsStdin ? "-" : INHERITED_FD_PATH;
  let inheritFd =
    taskOutput === undefined
      ? searchTarget.inheritFd
      : taskOutputNeedsStdin
        ? undefined
        : taskOutput.handle.fd;
  let allFilesFiltered = false;
  if (taskOutput !== undefined) {
    let mapped = userGlobIndices.map((userGlobIndex) => rgArgs[userGlobIndex + 1]);
    let matchesPath = (value) => {
      let matcher = interopRequireDefault.default(value, {
        dot: true,
        nocase: caseInsensitive === true,
      });
      return matcher(basename(canonical)) || matcher(canonical) || matcher(canonical.replaceAll("\\", "/"));
    };
    let mapped_2 = mapped
      .filter((glob) => glob.startsWith("!") && glob.length > 1)
      .map((negatedGlob) => negatedGlob.slice(1));
    let filtered = mapped.filter((includeGlob) => includeGlob !== "" && !includeGlob.startsWith("!"));
    try {
      allFilesFiltered =
        mapped_2.some(matchesPath) ||
        (filtered.length > 0 && !filtered.some(matchesPath)) ||
        (fileType !== undefined && fileType !== "");
    } catch (error) {
      await taskOutput.close();
      throw error;
    }
    for (let idx = rgArgs.length - 2; idx >= 0; idx--)
      if (rgArgs[idx] === "--glob" && builtinGlobIndices.has(idx)) rgArgs.splice(idx, 2);
  }
  let stdin = taskOutputNeedsStdin ? () => createAbortableStream(taskOutput.handle, true, signal) : undefined;
  let dirExclusions = taskOutput === undefined ? taskOutputDirExclusions(canonical) : [];
  if (dirExclusions.includes("!**"))
    throw Error(
      "Task output files are read individually: Grep (or Read) a specific task's output path rather than the tasks directory.",
    );
  for (let exclusionGlob of dirExclusions) addGlob(exclusionGlob);
  let didRunRipgrep = false;
  try {
    if (allFilesFiltered) rgLines = [];
    else {
      didRunRipgrep = true;
      let markExternalTiming = timing?.mark("external");
      let result = await ripGrep_2(rgArgs, searchPathArg, signal, {
        rawLines: true,
        rejectOnInputError: true,
        searchOtherAppsData: true,
        cwd: searchTarget.spawnCwd,
        spawnDirFd: searchTarget.spawnDirFd,
        stdin,
        inheritFd,
        beforeSpawn: () => {
          searchTarget.recheckBeforeSpawn();
          assertDenyGlobsUnchanged(readIgnorePatterns, searchTarget, denyGlobs);
        },
      })
        .then(
          (lines) => ({
            lines,
            timedOut: false,
          }),
          (error) => {
            if (error instanceof RipgrepTimeoutError && error.partialResults.length > 0)
              return {
                lines: error.partialResults,
                timedOut: true,
              };
            throw error;
          },
        )
        .finally(markExternalTiming);
      rgLines = result.lines;
      timedOut = result.timedOut;
    }
  } finally {
    await taskOutput?.close();
  }
  if (didRunRipgrep && outputMode !== "content") rgLines = splitNulDelimitedOutput(rgLines, outputMode);
  if (taskOutput !== undefined && searchPathArg !== searchTarget.target && outputMode !== "content") {
    let rawLine = taskOutputNeedsStdin ? "<stdin>" : searchPathArg;
    rgLines = rgLines.map((rgLine) =>
      rgLine === rawLine
        ? searchTarget.target
        : rgLine.startsWith(`${rawLine}:`)
          ? searchTarget.target + rgLine.slice(rawLine.length)
          : outputMode === "count" && /^\d+$/.test(rgLine)
            ? `${searchTarget.target}:${rgLine}`
            : rgLine,
    );
  }
  if (didRunRipgrep && outputMode === "content")
    rgLines = formatRgJsonLines(rgLines, {
      contextBreaks: [context, contextLines, beforeContext, afterContext].some(
        (isContextLine) => typeof isContextLine === "number" && isContextLine > 0,
      ),
      onlyMatching: onlyMatching === true,
    });
  if (didRunRipgrep && (searchTarget.relativeOutput || !searchTarget.isDirectory))
    rgLines = rgLines.map((rgLine) => toDisplayPath(rgLine, searchTarget));
  if (readIgnorePatterns.size > 0)
    if (!searchTarget.isDirectory) {
      let permissions = context_2.permissions();
      if (
        normalizeCaseForComparison_2([
          searchTarget.canonical,
          searchTarget.lexical,
          ...getPathsForPermissionCheck(searchTarget.lexical),
        ]).some((lexicalPath) => matchingRuleForInput(lexicalPath, permissions, "read", "deny") !== null)
      )
        rgLines = [];
    } else {
      let allowedRoots = normalizeCaseForComparison_2([
        searchTarget.canonical,
        searchTarget.lexical,
        searchTarget.target,
      ]).map((dirPath) => (dirPath.endsWith(sep) ? dirPath : dirPath + sep));
      let resultPathsByLine = new Map();
      let escapedPaths = new Set();
      let unjudgedLines = new Set();
      for (let rgLine of rgLines) {
        if (resultPathsByLine.has(rgLine) || unjudgedLines.has(rgLine)) continue;
        let resultPath = extractResultPath(rgLine, outputMode, allowedRoots);
        if (resultPath === null) {
          unjudgedLines.add(rgLine);
          continue;
        }
        if (judgeEveryResult || resultPath.some(mayEscapeExclusionGlobs)) {
          resultPathsByLine.set(rgLine, resultPath);
          for (let escapedPath of resultPath) escapedPaths.add(escapedPath);
        }
      }
      let deniedPaths = denyFoldVariantPaths(
        [...escapedPaths],
        context_2.permissions(),
        (escapedPath) => getAlternateRootSpellings(escapedPath, searchTarget),
        judgeEveryResult,
      );
      if (deniedPaths.size > 0 || unjudgedLines.size > 0) {
        rgLines = rgLines.filter((rgLine) => {
          if (unjudgedLines.has(rgLine)) return false;
          return !(resultPathsByLine.get(rgLine) ?? []).some((escapedPath) => deniedPaths.has(escapedPath));
        });
        rgLines = rgLines.filter(
          (rgLine, lineIndex, allLines) =>
            rgLine !== "--" ||
            (lineIndex > 0 && lineIndex < allLines.length - 1 && allLines[lineIndex - 1] !== "--"),
        );
      }
    }
  if (outputMode === "content") {
    let { items, appliedLimit } = applyHeadLimit(rgLines, headLimit, offset);
    let mapped = items.map((item) => {
      let index = item.indexOf("\x00");
      if (index < 0) return showLineNumbers ? item : item.replace(/^\d+[:-]/, "");
      let pathPart = item.substring(index + 1);
      let match = /^(\d+)([:-])/.exec(pathPart);
      let separator = match?.[2] ?? ":";
      let linePart = showLineNumbers || match === null ? pathPart : pathPart.substring(match[0].length);
      return searchTarget.isDirectory
        ? toRelativePath(item.substring(0, index)) + separator + linePart
        : linePart;
    });
    return {
      data: {
        mode: "content",
        numFiles: 0,
        filenames: [],
        content: mapped.join(`
`),
        numLines: mapped.length,
        totalLines: rgLines.length,
        ...(appliedLimit !== undefined && {
          appliedLimit,
        }),
        ...(offset > 0 && {
          appliedOffset: offset,
        }),
        ...(timedOut && {
          timedOut,
        }),
      },
    };
  }
  if (outputMode === "count") {
    let { items, appliedLimit } = applyHeadLimit(rgLines, headLimit, offset);
    let mapped = items.map((item) => {
      let index = item.lastIndexOf(":");
      if (index > 0) {
        let absolutePath = item.substring(0, index);
        let linePart = item.substring(index);
        return toRelativePath(absolutePath) + linePart;
      }
      return item;
    });
    let numMatches = 0;
    let numFiles = 0;
    for (let rgLine of rgLines) {
      let index = rgLine.lastIndexOf(":");
      if (index > 0) {
        let countText = rgLine.substring(index + 1);
        let matchCount = parseInt(countText, 10);
        if (!isNaN(matchCount)) {
          numMatches += matchCount;
          numFiles += 1;
        }
      }
    }
    return {
      data: {
        mode: "count",
        numFiles,
        filenames: [],
        content: mapped.join(`
`),
        numMatches,
        ...(appliedLimit !== undefined && {
          appliedLimit,
        }),
        ...(offset > 0 && {
          appliedOffset: offset,
        }),
        ...(timedOut && {
          timedOut,
        }),
      },
    };
  }
  let settled = await Promise.allSettled(rgLines.map((rgLine) => getFsImplementation().stat(rgLine)));
  let mapped = rgLines
    .map((rgLine, lineIndexInList) => {
      let statResult = settled[lineIndexInList];
      return [rgLine, statResult.status === "fulfilled" ? (statResult.value.mtimeMs ?? 0) : 0];
    })
    .sort((left, right) => {
      let mtimeDelta = right[1] - left[1];
      if (mtimeDelta === 0) return left[0].localeCompare(right[0]);
      return mtimeDelta;
    })
    .map((entry) => entry[0]);
  let { items, appliedLimit } = applyHeadLimit(mapped, headLimit, offset);
  let mapped_2 = items.map(toRelativePath);
  return {
    data: {
      mode: "files_with_matches",
      filenames: mapped_2,
      numFiles: mapped_2.length,
      totalFiles: mapped.length,
      ...(appliedLimit !== undefined && {
        appliedLimit,
      }),
      ...(offset > 0 && {
        appliedOffset: offset,
      }),
      ...(timedOut && {
        timedOut,
      }),
    },
  };
}
//@ chunk-5xgkngpb.js:1459115-1459477 placement
/**
 * 把 ripgrep 输出的路径前缀（目标或规范路径）换回用户看到的词法路径，处理相对输出与 ":"/NUL 分隔。
 */
function toDisplayPath(rgLine, searchTarget) {
  let lexicalPrefix = searchTarget.lexical.endsWith(sep) ? searchTarget.lexical : searchTarget.lexical + sep;
  if (searchTarget.relativeOutput) return rgLine.startsWith("./") ? lexicalPrefix + rgLine.slice(2) : rgLine;
  for (let searchRoot of [searchTarget.target, searchTarget.canonical]) {
    let rootPrefix = searchRoot.endsWith(sep) ? searchRoot : searchRoot + sep;
    if (rgLine.startsWith(rootPrefix)) return lexicalPrefix + rgLine.slice(rootPrefix.length);
    if (rgLine === searchRoot) return searchTarget.lexical;
    if (rgLine.startsWith(`${searchRoot}:`) || rgLine.startsWith(`${searchRoot}\x00`))
      return searchTarget.lexical + rgLine.slice(searchRoot.length);
  }
  return rgLine;
}
//@ chunk-5xgkngpb.js:1459477-1459770 placement
function extractResultPath(rgLine, outputMode, allowedRoots) {
  let pathPart;
  if (outputMode === "content") {
    if (rgLine === "--") return [];
    let index = rgLine.indexOf("\x00");
    if (index < 0) return null;
    pathPart = rgLine.substring(0, index);
  } else if (outputMode === "count") {
    let index = rgLine.lastIndexOf(":");
    pathPart = index > 0 ? rgLine.substring(0, index) : rgLine;
  } else pathPart = rgLine;
  let normalizedPath = sep === "\\" ? pathPart.replaceAll("/", "\\") : pathPart;
  return allowedRoots.some((root) => normalizedPath.startsWith(root)) ? [normalizedPath] : null;
}
//@ chunk-5xgkngpb.js:1459770-1461111 placement
/**
 * 把 ripgrep --json 输出转成"路径\0行号:内容"形式的行：处理 begin/end（二进制文件只报一行提示）、上下文分隔 --、仅匹配模式按子匹配拆行、过长行用省略标记替代。
 */
function formatRgJsonLines(lines, options) {
  let decodeText = (textValue) =>
    textValue === undefined
      ? ""
      : textValue.text !== undefined
        ? textValue.text
        : Buffer.from(textValue.bytes ?? "", "base64").toString("utf8");
  let clipLine = (line, lineKind) =>
    line.length > 500
      ? lineKind === "match"
        ? "[Omitted long matching line]"
        : "[Omitted long context line]"
      : line;
  let out = [];
  let fileLines = [];
  let lastPath = null;
  let lastLine = -1;
  for (let line of lines) {
    if (!line.startsWith("{")) continue;
    let event;
    try {
      event = jsonParseRaw(line);
    } catch {
      continue;
    }
    if (event === null || typeof event !== "object") continue;
    let data = event.data ?? {};
    if (event.type === "begin") {
      fileLines = [];
      continue;
    }
    if (event.type === "end") {
      let binaryOffset = data.binary_offset;
      let hasBinaryOffset = typeof binaryOffset === "number";
      for (let fileLine of fileLines)
        if (!hasBinaryOffset || !fileLine.slice(fileLine.indexOf("\x00") + 1).includes("\x00"))
          out.push(fileLine);
      if (hasBinaryOffset && fileLines.length > 0)
        out.push(
          `${decodeText(data.path)}\x00binary file matches (found "\\0" byte around offset ${binaryOffset})`,
        );
      fileLines = [];
      continue;
    }
    if (event.type !== "match" && event.type !== "context") continue;
    let filePath = decodeText(data.path);
    let lineNumber = data.line_number ?? 0;
    let replaced = decodeText(data.lines).replace(/\r?\n$/, "");
    if (options.contextBreaks && lastPath !== null && (filePath !== lastPath || lineNumber > lastLine + 1))
      fileLines.push("--");
    if (event.type === "match" && options.onlyMatching) {
      let lastMatchLine = lineNumber;
      for (let submatch of data.submatches ?? []) {
        let matchLineNumber = lineNumber + countNewlinesBefore(Buffer.from(replaced), submatch.start ?? 0);
        decodeText(submatch.match)
          .split(
            `
`,
          )
          .forEach((line, matchLineIndex) => {
            fileLines.push(
              `${filePath}\x00${matchLineNumber + matchLineIndex}:${clipLine(stripSuffix(line, "\r"), "match")}`,
            );
            lastMatchLine = matchLineNumber + matchLineIndex;
          });
      }
      lastPath = filePath;
      lastLine = lastMatchLine;
      continue;
    }
    let lineKind = event.type === "match" ? "match" : "context";
    let lineSeparator = lineKind === "match" ? ":" : "-";
    let mapped = replaced
      .split(
        `
`,
      )
      .map((line) => stripSuffix(line, "\r"));
    mapped.forEach((textLine, textLineIndex) => {
      fileLines.push(
        `${filePath}\x00${lineNumber + textLineIndex}${lineSeparator}${clipLine(textLine, lineKind)}`,
      );
    });
    lastPath = filePath;
    lastLine = lineNumber + mapped.length - 1;
  }
  for (let fileLine of fileLines) out.push(fileLine);
  return out;
}
//@ chunk-5xgkngpb.js:1461111-1461205 placement
/**
 * 统计缓冲区前 N 个字节里的换行数，用于计算行号。
 */
function countNewlinesBefore(buffer, endOffset) {
  let newlineCount = 0;
  for (let idx = Math.min(endOffset, buffer.length) - 1; idx >= 0; idx--)
    if (buffer[idx] === 10) newlineCount++;
  return newlineCount;
}
export { GrepTool, SEARCH_INCOMPLETE_NOTE, assertGrepPathExists, emptyGrepResult, runGrep };
