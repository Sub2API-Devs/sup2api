/**
 * tools/GrepTool/GrepTool.ts
 *
 * Grep 工具：ripgrep 正则搜索，三种输出模式、head_limit/offset 分页（混有插件打包扫描的误归声明）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/GrepTool/GrepTool.ts
 * pieces: chunk-e6aww6q8.js (15)
 * attribution: placement 9, fingerprint 5, affinity 1
 */
import { basename, sep } from "path";
import { Re } from "../../../runtime/bun-runtime.js";
import { require_picomatch_2 } from "../../../vendor/picomatch/index.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import { GREP_TOOL_NAME, getDescription } from "./prompt.js";
import { coerceBooleanString, booleanishSchema } from "../../utils/spellcheck.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, string, _enum, E, M, u, array } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { getToolUseSummary_4 } from "../GlobTool/UI.js";
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
import { uniq } from "../../utils/collections.js";
import { jsonParseRaw } from "../../utils/slowOperations.js";

//@ chunk-e6aww6q8.js:1445523-1445543 placement
/**
 * 按需加载的 ripgrep 模块（interopRequireDefault 包装后取 default）。
 */
var interopRequireDefault = Re(require_picomatch_2(), 1);
//@ chunk-e6aww6q8.js:1445605-1445676 placement
/**
 * Grep 的布尔简写选项到 output_mode 的映射（-l → files_with_matches、-c → count）。
 */
var GREP_BOOLEAN_SHORTHANDS = [
  ["-l", "flag_l", "files_with_matches"],
  ["-c", "flag_c", "count"],
];
//@ chunk-e6aww6q8.js:1445676-1446577 placement
/**
 * 把 Grep 工具输入中的 file_path 别名映射为 path。
 */
function normalizeGrepInputAliases(e) {
  if (!isPlainObject_5(e)) return null;
  let n = {
    ...e,
  };
  let r = [];
  let s = [];
  let filePath = n.file_path;
  if (typeof filePath === "string" && filePath !== "") {
    let y = !Object.hasOwn(n, "path");
    if (y || n.path === filePath) {
      delete n.file_path;
      n.path = filePath;
      r.push(y ? "file_path" : "repeated_file_path");
      s.push(
        `${GREP_TOOL_NAME}'s parameter for where to search is named \`path\`. ${y ? "`file_path` was read as `path`." : "`file_path` repeated `path` and was ignored."}`,
      );
    }
  }
  for (let [y, S, w] of GREP_BOOLEAN_SHORTHANDS) {
    if (coerceBooleanString(n[y]) !== true) continue;
    let L = !Object.hasOwn(n, "output_mode");
    if (L || n.output_mode === w) {
      delete n[y];
      n.output_mode = w;
      r.push(L ? S : `repeated_${S}`);
      s.push(
        L
          ? `\`${y}\` is not a ${GREP_TOOL_NAME} parameter and was read as \`output_mode: "${w}"\`.`
          : `\`${y}\` repeated \`output_mode\` and was ignored.`,
      );
    }
  }
  if (coerceBooleanString(n["-r"]) === true) {
    delete n["-r"];
    r.push("flag_r");
    s.push(`\`-r\` was ignored: ${GREP_TOOL_NAME} always searches a directory recursively.`);
  }
  return r.length
    ? {
        input: n,
        shapeClass: r.join(","),
        resultNote: `Note: ${s.join(" ")}`,
      }
    : null;
}
//@ chunk-e6aww6q8.js:1446577-1449071 fingerprint = inputSchema (0.841)
/**
 * Grep 输入 schema（pattern/path/glob/output_mode/-B/-A/-C/context/-n/-i/-o/type/head_limit/offset/multiline）、VCS 目录排除列表、默认 head_limit 250。
 */
var grepInputSchema = DoctorLazy(() =>
  zodStrictObject({
    pattern: string().describe("The regular expression pattern to search for in file contents"),
    path: string()
      .optional()
      .describe("File or directory to search in (rg PATH). Defaults to current working directory."),
    glob: string()
      .optional()
      .describe('Glob pattern to filter files (e.g. "*.js", "*.{ts,tsx}") - maps to rg --glob'),
    output_mode: _enum(["content", "files_with_matches", "count"])
      .optional()
      .describe(
        'Output mode: "content" shows matching lines (supports -A/-B/-C context, -n line numbers, head_limit), "files_with_matches" shows file paths (supports head_limit), "count" shows match counts (supports head_limit). Defaults to "files_with_matches".',
      ),
    "-B": coercedNumberSchema(E().optional()).describe(
      'Number of lines to show before each match (rg -B). Requires output_mode: "content", ignored otherwise.',
    ),
    "-A": coercedNumberSchema(E().optional()).describe(
      'Number of lines to show after each match (rg -A). Requires output_mode: "content", ignored otherwise.',
    ),
    "-C": coercedNumberSchema(E().optional()).describe("Alias for context."),
    context: coercedNumberSchema(E().optional()).describe(
      'Number of lines to show before and after each match (rg -C). Requires output_mode: "content", ignored otherwise.',
    ),
    "-n": booleanishSchema(M().optional()).describe(
      'Show line numbers in output (rg -n). Requires output_mode: "content", ignored otherwise. Defaults to true.',
    ),
    "-i": booleanishSchema(M().optional()).describe("Case insensitive search (rg -i)"),
    "-o": booleanishSchema(M().optional()).describe(
      'Print only the matched (non-empty) parts of each matching line, one match per output line (rg -o / --only-matching). Requires output_mode: "content", ignored otherwise. Defaults to false.',
    ),
    type: string()
      .optional()
      .describe(
        "File type to search (rg --type). Common types: js, py, rust, go, java, etc. More efficient than include for standard file types.",
      ),
    head_limit: coercedNumberSchema(E().optional()).describe(
      'Limit output to first N lines/entries, equivalent to "| head -N". Works across all output modes: content (limits output lines), files_with_matches (limits file paths), count (limits count entries). Defaults to 250 when unspecified. Pass 0 for unlimited (use sparingly \u2014 large result sets waste context).',
    ),
    offset: coercedNumberSchema(E().optional()).describe(
      'Skip first N lines/entries before applying head_limit, equivalent to "| tail -n +N | head -N". Works across all output modes. Defaults to 0.',
    ),
    multiline: booleanishSchema(M().optional()).describe(
      "Enable multiline mode where . matches newlines and patterns can span lines (rg -U --multiline-dotall). Default: false.",
    ),
    ...attachedMachineInputField(),
  }),
);
var grepInputSchemaRef = grepInputSchema;
var VCS_DIRECTORIES_TO_EXCLUDE = [".git", ".svn", ".hg", ".bzr", ".jj", ".sl"];
var DEFAULT_HEAD_LIMIT = 250;
//@ chunk-e6aww6q8.js:1449071-1449232 fingerprint = applyHeadLimit (1)
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
//@ chunk-e6aww6q8.js:1449232-1449343 fingerprint = formatLimitInfo (1)
/**
 * 把实际 limit/offset 格式化为 "limit: N, offset: M"。
 */
function formatLimitInfo(appliedLimit, appliedOffset) {
  let parts = [];
  if (appliedLimit !== undefined) parts.push(`limit: ${appliedLimit}`);
  if (appliedOffset) parts.push(`offset: ${appliedOffset}`);
  return parts.join(", ");
}
//@ chunk-e6aww6q8.js:1449343-1452555 fingerprint = GrepTool (0.619)
/**
 * Grep 工具定义（name "Grep"）。只读、可并发、maxResultSizeChars 20000；ripgrep 正则搜索，三种 output_mode，head_limit 默认 250、offset 分页；validateInput 查空字节与 head_limit/offset 为非负整数。
 */
var grepOutputSchema = DoctorLazy(() =>
  u({
    mode: _enum(["content", "files_with_matches", "count"]).optional(),
    numFiles: E(),
    filenames: array(string()),
    content: string().optional(),
    numLines: E().optional(),
    numMatches: E().optional(),
    totalFiles: E().optional(),
    totalLines: E().optional(),
    appliedLimit: E().optional(),
    appliedOffset: E().optional(),
  }),
);
var GrepTool = buildTool({
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
  getToolUseSummary: getToolUseSummary_4,
  getActivityDescription(input) {
    let summary = getToolUseSummary_4(input);
    return summary ? `Searching for ${summary}` : "Searching";
  },
  get inputSchema() {
    return grepInputSchemaRef();
  },
  get outputSchema() {
    return grepOutputSchema();
  },
  coerceInput(e) {
    return parsedToolInputOrNull(grepInputSchemaRef(), normalizeGrepInputAliases(e));
  },
  isConcurrencySafe() {
    return true;
  },
  isReadOnly() {
    return true;
  },
  toAutoClassifierInput(input) {
    let n = remoteRoutingCandidate(input);
    return n === undefined
      ? input.path
        ? `${input.pattern} in ${input.path}`
        : input.pattern
      : {
          pattern: input.pattern,
          ...(input.path !== undefined && {
            path: input.path,
          }),
          [HOST_TOOL_INPUT_FIELD]: n,
          ...hostContextMeta(input),
        };
  },
  suppressesAllPermissionUpdates(e) {
    return hasHostField(e);
  },
  isSearchOrReadCommand() {
    return {
      isSearch: true,
      isRead: false,
    };
  },
  ruleContentField: "path",
  getPath({ path }) {
    if (isRemoteOnlyCheck(GREP_TOOL_NAME)) return path ?? "";
    return path ? expandPath(path) : getCwd();
  },
  async preparePermissionMatcher({ pattern }) {
    return (rulePattern) => matchWildcardPattern(rulePattern, pattern);
  },
  async prompt({ model, leanPrompt, leanRewrite }) {
    return getDescription(model, leanPrompt, leanRewrite);
  },
  renderToolUseMessage,
  extractSearchText({ mode, content, filenames }) {
    if (mode === "content" && content) return content;
    return filenames.join(`
`);
  },
  mapToolResultToToolResultBlockParam(
    {
      mode = "files_with_matches",
      numFiles,
      filenames,
      content,
      numLines: _numLines,
      numMatches,
      totalFiles,
      totalLines,
      appliedLimit,
      appliedOffset,
    },
    toolUseID,
  ) {
    if (mode === "content") {
      let limitInfo = formatLimitInfo(appliedLimit, appliedOffset);
      let resultContent =
        content ||
        (appliedOffset && (totalLines ?? 0) > 0 ? "No entries at this offset" : "No matches found");
      let finalContent = limitInfo
        ? `${resultContent}

[Showing results with pagination = ${limitInfo}]`
        : resultContent;
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content: finalContent,
      };
    }
    if (mode === "count") {
      let limitInfo = formatLimitInfo(appliedLimit, appliedOffset);
      let we = numMatches ?? 0;
      let files = numFiles ?? 0;
      let Ae = content || (we > 0 ? "No entries at this offset" : "No matches found");
      let summary = `

Found ${we} total ${we === 1 ? "occurrence" : "occurrences"} across ${files} ${files === 1 ? "file" : "files"}.${limitInfo ? ` with pagination = ${limitInfo}` : ""}`;
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content: Ae + summary,
      };
    }
    let limitInfo = formatLimitInfo(appliedLimit, appliedOffset);
    if (numFiles === 0)
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content:
          appliedOffset && (totalFiles ?? 0) > 0
            ? `No entries at this offset. [Showing results with pagination = ${limitInfo}]`
            : "No files found",
      };
    let result = `Found ${numFiles} ${plural(numFiles, "file")}${limitInfo ? ` ${limitInfo}` : ""}
${filenames.join(`
`)}`;
    return {
      tool_use_id: toolUseID,
      type: "tool_result",
      content: result,
    };
  },
  create(e) {
    return {
      async validateInput(n) {
        let { pattern, path, glob, type: y, head_limit: headLimit, offset } = n;
        if (canRunToolsOnThisMachine() && hasHostField(n))
          return {
            result: false,
            message: hostFieldNotForwardedMessage(),
            errorCode: 3,
          };
        let L = rejectNullBytes(GREP_TOOL_NAME, [
          ["pattern", pattern],
          ["path", path],
          ["glob", glob],
          ["type", y],
        ]);
        if (L) return L;
        for (let [G, q] of [
          ["head_limit", headLimit],
          ["offset", offset],
        ])
          if (q !== undefined && (!Number.isInteger(q) || q < 0))
            return {
              result: false,
              message: `${G} must be a whole number of 0 or more, got ${q}.${G === "head_limit" ? " Pass 0 for unlimited." : ""}`,
              errorCode: 2,
            };
        return {
          result: true,
        };
      },
      async checkPermissions(n, r) {
        let path = GrepTool.getPath(n);
        let h = walkPermissionCheckPaths(path);
        e.session.writePermissionStash.stash(r.toolUseId, path, h.spellings, "read");
        return checkReadPermissionForTool(GrepTool, n, e.permissions(), h);
      },
      async call(n, r) {
        return pathFromToolUse(n, {
          toolUseId: r.toolUseId,
          signal: r.signal,
          timing: r.timing,
          remoteCall: r.remoteCall,
          session: e.session,
          toolState: e.toolState,
          permissions: e.permissions,
        });
      },
    };
  },
});
//@ chunk-e6aww6q8.js:1452555-1452836 placement
/**
 * 校验 Grep 的搜索路径存在（受保护路径或权限检查路径变化时跳过）；不存在时抛出带当前目录与"你是不是指…"建议的遥测安全错误。
 */
async function assertGrepPathExists(path, n, r) {
  let s = expandPath(path);
  if (isUntouchableSpelling(s) || getPathsForPermissionCheck(s).some((h) => !n.includes(h))) return;
  try {
    await getFsImplementation().stat(s);
  } catch (error) {
    if (!isENOENT(error)) throw error;
    let y = await normalizePathForComparison(s);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      encodeControlChars(
        `Path does not exist: ${path}. ${FILE_NOT_FOUND_CWD_NOTE} ${getCwd()}.${y ? ` Did you mean ${y}?` : ""}${separateCopyHint(GrepTool, s, r)}`,
      ),
      "Path does not exist",
    );
  }
}
//@ chunk-e6aww6q8.js:1453023-1453038 affinity
/**
 * 表示“不适用”的 undefined 常量，用于空结果的 appliedLimit/appliedOffset。
 */
var NOT_APPLICABLE = undefined;
//@ chunk-e6aww6q8.js:1453038-1453463 fingerprint = outputSchema (0.764)
/**
 * 搜索目标不可打开时按 output_mode 返回空结果。
 */
function emptyGrepResult(e) {
  switch (e.output_mode ?? "files_with_matches") {
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
//@ chunk-e6aww6q8.js:1453463-1458523 placement
/**
 * Grep 工具的执行主体：按参数组装 ripgrep 参数（隐藏文件、排除 VCS 目录、列宽、多行、大小写、输出模式、上下文、类型与 glob、读取 deny 规则与忽略模式），任务输出文件改为单独绑定读取；运行 ripgrep 后按输出模式整理结果、做分页与权限过滤。
 */
async function runGrep(
  searchTarget,
  {
    pattern,
    glob,
    type: s,
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
  let addGlob = (fo) => {
    builtinGlobIndices.add(rgArgs.length);
    rgArgs.push("--glob", fo);
  };
  for (let fo of VCS_DIRECTORIES_TO_EXCLUDE) addGlob(`!${fo}`);
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
  if (s) rgArgs.push("--type", s);
  if (glob) {
    let fo = [];
    let parts = glob.split(/\s+/);
    for (let bo of parts)
      if (bo.includes("{") && bo.includes("}")) fo.push(bo);
      else fo.push(...bo.split(",").filter(Boolean));
    for (let bo of fo.filter(Boolean)) {
      userGlobIndices.push(rgArgs.length);
      addGlob(bo);
    }
  }
  let readIgnorePatterns = getFileReadIgnorePatterns(context_2.permissions());
  let denyGlobs = buildDenyRuleGlobs(readIgnorePatterns, searchTarget);
  let judgeEveryResult =
    searchTarget.judgeEveryResult === true ||
    hasUnsafeDenyGlob(readIgnorePatterns, searchTarget) ||
    (readIgnorePatterns.size > 0 && mayBeGuardedFileSyncCopy(searchTarget.canonical));
  for (let denyGlob of denyGlobs) rgArgs.push("--iglob", denyGlob);
  for (let fo of await getPluginCacheExclusionDirs(canonical)) {
    let ripgrepExcludeGlob = toRipgrepExcludeGlob(fo, getRipgrepDisplayRoot(searchTarget));
    if (ripgrepExcludeGlob === null) continue;
    addGlob(ripgrepExcludeGlob);
  }
  let rgLines;
  let taskOutput = isTaskOutputFilePath(canonical) ? await bindTaskOutputForRead(canonical) : undefined;
  let At = taskOutput !== undefined && taskOutput.ioPath !== procFdPath(taskOutput.handle.fd);
  let It = taskOutput === undefined ? searchTarget.target : At ? "-" : INHERITED_FD_PATH;
  let inheritFd = taskOutput === undefined ? searchTarget.inheritFd : At ? undefined : taskOutput.handle.fd;
  let qt = false;
  if (taskOutput !== undefined) {
    let mapped = userGlobIndices.map((userGlobIndex) => rgArgs[userGlobIndex + 1]);
    let To = (co) => {
      let So = interopRequireDefault.default(co, {
        dot: true,
        nocase: caseInsensitive === true,
      });
      return So(basename(canonical)) || So(canonical) || So(canonical.replaceAll("\\", "/"));
    };
    let mapped_2 = mapped.filter((co) => co.startsWith("!") && co.length > 1).map((co) => co.slice(1));
    let filtered = mapped.filter((co) => co !== "" && !co.startsWith("!"));
    try {
      qt = mapped_2.some(To) || (filtered.length > 0 && !filtered.some(To)) || (s !== undefined && s !== "");
    } catch (error) {
      await taskOutput.close();
      throw error;
    }
    for (let idx = rgArgs.length - 2; idx >= 0; idx--)
      if (rgArgs[idx] === "--glob" && builtinGlobIndices.has(idx)) rgArgs.splice(idx, 2);
  }
  let stdin = At ? () => createAbortableStream(taskOutput.handle, true, signal) : undefined;
  let rn = taskOutput === undefined ? taskOutputDirExclusions(canonical) : [];
  if (rn.includes("!**"))
    throw Error(
      "Task output files are read individually: Grep (or Read) a specific task's output path rather than the tasks directory.",
    );
  for (let fo of rn) addGlob(fo);
  let pn = false;
  try {
    if (qt) rgLines = [];
    else {
      pn = true;
      let To = timing?.mark("external");
      rgLines = await ripGrep_2(rgArgs, It, signal, {
        rawLines: true,
        rejectOnInputError: true,
        searchOtherAppsData: true,
        cwd: searchTarget.spawnCwd,
        stdin,
        inheritFd,
        beforeSpawn: () => {
          searchTarget.recheckBeforeSpawn();
          assertDenyGlobsUnchanged(readIgnorePatterns, searchTarget, denyGlobs);
        },
      }).finally(To);
    }
  } finally {
    await taskOutput?.close();
  }
  if (pn && outputMode !== "content") rgLines = splitNulDelimitedOutput(rgLines, outputMode);
  if (taskOutput !== undefined && It !== searchTarget.target && outputMode !== "content") {
    let fo = At ? "<stdin>" : It;
    rgLines = rgLines.map((rgLine) =>
      rgLine === fo
        ? searchTarget.target
        : rgLine.startsWith(`${fo}:`)
          ? searchTarget.target + rgLine.slice(fo.length)
          : outputMode === "count" && /^\d+$/.test(rgLine)
            ? `${searchTarget.target}:${rgLine}`
            : rgLine,
    );
  }
  if (pn && outputMode === "content")
    rgLines = formatRgJsonLines(rgLines, {
      contextBreaks: [context, contextLines, beforeContext, afterContext].some(
        (fo) => typeof fo === "number" && fo > 0,
      ),
      onlyMatching: onlyMatching === true,
    });
  if (pn && (searchTarget.relativeOutput || !searchTarget.isDirectory))
    rgLines = rgLines.map((rgLine) => toDisplayPath(rgLine, searchTarget));
  if (readIgnorePatterns.size > 0)
    if (!searchTarget.isDirectory) {
      let fo = context_2.permissions();
      if (
        uniq([
          searchTarget.canonical,
          searchTarget.lexical,
          ...getPathsForPermissionCheck(searchTarget.lexical),
        ]).some((bo) => matchingRuleForInput(bo, fo, "read", "deny") !== null)
      )
        rgLines = [];
    } else {
      let mapped = uniq([searchTarget.canonical, searchTarget.lexical, searchTarget.target]).map((So) =>
        So.endsWith(sep) ? So : So + sep,
      );
      let To = new Map();
      let bo = new Set();
      let vn = new Set();
      for (let rgLine of rgLines) {
        if (To.has(rgLine) || vn.has(rgLine)) continue;
        let resultPath = extractResultPath(rgLine, outputMode, mapped);
        if (resultPath === null) {
          vn.add(rgLine);
          continue;
        }
        if (judgeEveryResult || resultPath.some(mayEscapeExclusionGlobs)) {
          To.set(rgLine, resultPath);
          for (let un of resultPath) bo.add(un);
        }
      }
      let co = denyFoldVariantPaths(
        [...bo],
        context_2.permissions(),
        (So) => getAlternateRootSpellings(So, searchTarget),
        judgeEveryResult,
      );
      if (co.size > 0 || vn.size > 0) {
        rgLines = rgLines.filter((rgLine) => {
          if (vn.has(rgLine)) return false;
          return !(To.get(rgLine) ?? []).some((ko) => co.has(ko));
        });
        rgLines = rgLines.filter(
          (rgLine, ko, un) => rgLine !== "--" || (ko > 0 && ko < un.length - 1 && un[ko - 1] !== "--"),
        );
      }
    }
  if (outputMode === "content") {
    let { items, appliedLimit } = applyHeadLimit(rgLines, headLimit, offset);
    let mapped = items.map((item) => {
      let index = item.indexOf("\x00");
      if (index < 0) return showLineNumbers ? item : item.replace(/^\d+[:-]/, "");
      let ko = item.substring(index + 1);
      let match = /^(\d+)([:-])/.exec(ko);
      let ao = match?.[2] ?? ":";
      let $o = showLineNumbers || match === null ? ko : ko.substring(match[0].length);
      return searchTarget.isDirectory ? toRelativePath(item.substring(0, index)) + ao + $o : $o;
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
      },
    };
  }
  if (outputMode === "count") {
    let { items, appliedLimit } = applyHeadLimit(rgLines, headLimit, offset);
    let mapped = items.map((item) => {
      let index = item.lastIndexOf(":");
      if (index > 0) {
        let absolutePath = item.substring(0, index);
        let $o = item.substring(index);
        return toRelativePath(absolutePath) + $o;
      }
      return item;
    });
    let numMatches = 0;
    let numFiles = 0;
    for (let rgLine of rgLines) {
      let index = rgLine.lastIndexOf(":");
      if (index > 0) {
        let ao = rgLine.substring(index + 1);
        let $o = parseInt(ao, 10);
        if (!isNaN($o)) {
          numMatches += $o;
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
      },
    };
  }
  let settled = await Promise.allSettled(rgLines.map((rgLine) => getFsImplementation().stat(rgLine)));
  let mapped = rgLines
    .map((rgLine, To) => {
      let bo = settled[To];
      return [rgLine, bo.status === "fulfilled" ? (bo.value.mtimeMs ?? 0) : 0];
    })
    .sort((fo, To) => {
      let bo = To[1] - fo[1];
      if (bo === 0) return fo[0].localeCompare(To[0]);
      return bo;
    })
    .map((fo) => fo[0]);
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
    },
  };
}
//@ chunk-e6aww6q8.js:1458523-1458885 placement
/**
 * 把 ripgrep 输出的路径前缀（目标或规范路径）换回用户看到的词法路径，处理相对输出与 ":"/NUL 分隔。
 */
function toDisplayPath(rgLine, searchTarget) {
  let r = searchTarget.lexical.endsWith(sep) ? searchTarget.lexical : searchTarget.lexical + sep;
  if (searchTarget.relativeOutput) return rgLine.startsWith("./") ? r + rgLine.slice(2) : rgLine;
  for (let s of [searchTarget.target, searchTarget.canonical]) {
    let h = s.endsWith(sep) ? s : s + sep;
    if (rgLine.startsWith(h)) return r + rgLine.slice(h.length);
    if (rgLine === s) return searchTarget.lexical;
    if (rgLine.startsWith(`${s}:`) || rgLine.startsWith(`${s}\x00`))
      return searchTarget.lexical + rgLine.slice(s.length);
  }
  return rgLine;
}
//@ chunk-e6aww6q8.js:1458885-1459178 placement
function extractResultPath(rgLine, outputMode, r) {
  let s;
  if (outputMode === "content") {
    if (rgLine === "--") return [];
    let index = rgLine.indexOf("\x00");
    if (index < 0) return null;
    s = rgLine.substring(0, index);
  } else if (outputMode === "count") {
    let index = rgLine.lastIndexOf(":");
    s = index > 0 ? rgLine.substring(0, index) : rgLine;
  } else s = rgLine;
  let h = sep === "\\" ? s.replaceAll("/", "\\") : s;
  return r.some((y) => h.startsWith(y)) ? [h] : null;
}
//@ chunk-e6aww6q8.js:1459178-1460512 placement
/**
 * 把 ripgrep --json 输出转成"路径\0行号:内容"形式的行：处理 begin/end（二进制文件只报一行提示）、上下文分隔 --、仅匹配模式按子匹配拆行、过长行用省略标记替代。
 */
function formatRgJsonLines(lines, options) {
  let decodeText = (G) =>
    G === undefined
      ? ""
      : G.text !== undefined
        ? G.text
        : Buffer.from(G.bytes ?? "", "base64").toString("utf8");
  let clipLine = (G, q) =>
    G.length > 500 ? (q === "match" ? "[Omitted long matching line]" : "[Omitted long context line]") : G;
  let out = [];
  let fileLines = [];
  let lastPath = null;
  let lastLine = -1;
  for (let line of lines) {
    if (!line.startsWith("{")) continue;
    let q;
    try {
      q = jsonParseRaw(line);
    } catch {
      continue;
    }
    if (q === null || typeof q !== "object") continue;
    let Z = q.data ?? {};
    if (q.type === "begin") {
      fileLines = [];
      continue;
    }
    if (q.type === "end") {
      let binaryOffset = Z.binary_offset;
      let We = typeof binaryOffset === "number";
      for (let fileLine of fileLines)
        if (!We || !fileLine.slice(fileLine.indexOf("\x00") + 1).includes("\x00")) out.push(fileLine);
      if (We && fileLines.length > 0)
        out.push(
          `${decodeText(Z.path)}\x00binary file matches (found "\\0" byte around offset ${binaryOffset})`,
        );
      fileLines = [];
      continue;
    }
    if (q.type !== "match" && q.type !== "context") continue;
    let Se = decodeText(Z.path);
    let lineNumber = Z.line_number ?? 0;
    let replaced = decodeText(Z.lines).replace(/\r?\n$/, "");
    if (options.contextBreaks && lastPath !== null && (Se !== lastPath || lineNumber > lastLine + 1))
      fileLines.push("--");
    if (q.type === "match" && options.onlyMatching) {
      let Me = lineNumber;
      for (let We of Z.submatches ?? []) {
        let ze = lineNumber + countNewlinesBefore(Buffer.from(replaced), We.start ?? 0);
        decodeText(We.match)
          .split(
            `
`,
          )
          .forEach((line, Je) => {
            fileLines.push(`${Se}\x00${ze + Je}:${clipLine(stripSuffix(line, "\r"), "match")}`);
            Me = ze + Je;
          });
      }
      lastPath = Se;
      lastLine = Me;
      continue;
    }
    let Ee = q.type === "match" ? "match" : "context";
    let Ae = Ee === "match" ? ":" : "-";
    let mapped = replaced
      .split(
        `
`,
      )
      .map((line) => stripSuffix(line, "\r"));
    mapped.forEach((Me, We) => {
      fileLines.push(`${Se}\x00${lineNumber + We}${Ae}${clipLine(Me, Ee)}`);
    });
    lastPath = Se;
    lastLine = lineNumber + mapped.length - 1;
  }
  for (let fileLine of fileLines) out.push(fileLine);
  return out;
}
//@ chunk-e6aww6q8.js:1460512-1460606 placement
/**
 * 统计缓冲区前 N 个字节里的换行数，用于计算行号。
 */
function countNewlinesBefore(e, n) {
  let r = 0;
  for (let idx = Math.min(n, e.length) - 1; idx >= 0; idx--) if (e[idx] === 10) r++;
  return r;
}
export { GrepTool, assertGrepPathExists, emptyGrepResult, runGrep };
