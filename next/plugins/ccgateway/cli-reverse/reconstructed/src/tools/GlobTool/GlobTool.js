/**
 * tools/GlobTool/GlobTool.ts
 *
 * Glob 工具：按文件名模式用 ripgrep --files 查找，按修改时间排序，默认 100 条
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/GlobTool/GlobTool.ts
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: fingerprint 2, layout 2
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  objectSchema,
  numberSchema,
  array,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  attachedMachineInputField,
  HOST_TOOL_INPUT_FIELD,
  hostContextMeta,
  hasHostField,
  canRunToolsOnThisMachine,
  hostFieldNotForwardedMessage,
} from "../../bridge/deviceRegistration.js";
import { expandPath, toRelativePath } from "../../utils/path.js";
import { isUntouchableSpelling } from "../../utils/networkPaths.js";
import {
  getPathsForPermissionCheck,
  getFsImplementation,
  walkPermissionCheckPaths,
} from "../../utils/fsOperations.js";
import { isENOENT, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { normalizePathForComparison, FILE_NOT_FOUND_CWD_NOTE } from "../../utils/file.js";
import { encodeControlChars } from "../../utils/sanitization.js";
import { getCwd } from "../../utils/cwd.js";
import { separateCopyHint } from "../../utils/remoteTools/folderSync.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { GLOB_TOOL_NAME, getGlobToolDescription } from "./prompt.js";
import { getToolUseSummary_3 } from "./UI.js";
import { remoteRoutingCandidate } from "../../utils/remoteTools/toolHostRouting.js";
import { resolveAbsoluteGlobPattern, globFiles } from "../../utils/glob.js";
import { isRemoteOnlyCheck } from "../../utils/permissions/checkRegistry.js";
import { matchWildcardPattern } from "../../utils/permissions/shellRuleMatching.js";
import { renderToolUseMessage } from "../GrepTool/UI.js";
import { rejectNullBytes } from "../../utils/filePathValidation.js";
import { checkReadPermissionForTool } from "../../utils/permissions/filesystem.js";
import { consumeReadPermission } from "../../utils/fsSafety/atomicWriteStaging.js";
import { SEARCH_INCOMPLETE_NOTE } from "../GrepTool/GrepTool.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1441416-1442718 fingerprint (2.1.88 match: outputSchema, 0.511)
var globInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var globOutputSchema;
deferInit("chunk-5xgkngpb.js:1441416", () => {
  globInputSchema = DoctorLazy(() =>
    zodStrictObject({
      pattern: stringSchema().describe("The glob pattern to match files against"),
      path: stringSchema()
        .optional()
        .describe(
          'The directory to search in. If not specified, the current working directory will be used. IMPORTANT: Omit this field to use the default directory. DO NOT enter "undefined" or "null" - simply omit it for the default behavior. Must be a valid directory path if provided.',
        ),
      ...attachedMachineInputField(),
    }),
  );
  globOutputSchema = DoctorLazy(() =>
    objectSchema({
      durationMs: numberSchema().describe("Time taken to execute the search in milliseconds"),
      numFiles: numberSchema().describe("Number of file paths returned (after any truncation)"),
      filenames: array(stringSchema()).describe("Array of file paths that match the pattern"),
      truncated: booleanSchema().describe("Whether results were truncated (limited to 100 files)"),
      totalMatches: numberSchema()
        .optional()
        .describe(
          "Total number of matching files before truncation. A lower bound when countIsComplete is false. Absent on results persisted by CLI versions predating this field.",
        ),
      countIsComplete: booleanSchema()
        .optional()
        .describe(
          "Whether totalMatches is the exact total (true) or a floor because the underlying search truncated its own output (false). Absent on results persisted by CLI versions predating this field.",
        ),
      timedOut: booleanSchema()
        .optional()
        .describe(
          "True when the time limit stopped the search after these paths were read, so more matches may exist. Absent otherwise.",
        ),
    }),
  );
});
//@ chunk-5xgkngpb.js:1442718-1443173 layout
/**
 * Glob 结果截断时的提示：未知总数、精确总数或"多于 N"三种。
 */
function formatGlobTruncationNote(output) {
  let shownCount = output.filenames.length;
  if (output.totalMatches === undefined)
    return "(Results are truncated. Consider using a more specific path or pattern.)";
  if (output.countIsComplete) {
    let hiddenCount = output.totalMatches - shownCount;
    return `(Showing ${shownCount} of ${output.totalMatches} matching files; ${hiddenCount} more are not listed. Narrow the pattern or path to see the rest.)`;
  }
  return `(Showing the first ${shownCount} files; there are more than ${output.totalMatches} matches. Narrow the pattern or path to see the rest.)`;
}
//@ chunk-5xgkngpb.js:1443173-1443566 layout
/**
 * 显式 path 不存在或不是目录时抛 TelemetrySafeError（附 cwd 说明、Did you mean、远程提示）。
 */
async function assertGlobDirectoryExists(path, permittedPaths, checkContext) {
  let expandedPath = expandPath(path);
  if (
    isUntouchableSpelling(expandedPath) ||
    getPathsForPermissionCheck(expandedPath).some((pathSpelling) => !permittedPaths.includes(pathSpelling))
  )
    return;
  let stats;
  try {
    stats = await getFsImplementation().stat(expandedPath);
  } catch (error) {
    if (!isENOENT(error)) throw error;
    let normalizedPath = await normalizePathForComparison(expandedPath);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      encodeControlChars(
        `Directory does not exist: ${path}. ${FILE_NOT_FOUND_CWD_NOTE} ${getCwd()}.${normalizedPath ? ` Did you mean ${normalizedPath}?` : ""}${separateCopyHint(GlobTool, expandedPath, checkContext)}`,
      ),
      "Directory does not exist",
    );
  }
  if (!stats.isDirectory())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      encodeControlChars(`Path is not a directory: ${path}`),
      "Path is not a directory",
    );
}
//@ chunk-5xgkngpb.js:1443566-1445764 fingerprint (2.1.88 match: GlobTool, 0.655)
/**
 * Glob 工具定义（name "Glob"）。只读、可并发；pattern 加可选 path；绝对路径模式自动拆出搜索目录；validateInput 查空字节；checkPermissions 读权限；call 用 ripgrep --files 按修改时间排序，默认最多 100 个，截断时给出说明。
 */
var GlobTool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1443566", () => {
  GlobTool = buildTool({
    name: GLOB_TOOL_NAME,
    searchHint: "find files by name pattern or wildcard",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    async description() {
      return getGlobToolDescription(undefined);
    },
    remoteExecution: {
      supported: true,
    },
    userFacingName() {
      return "Search";
    },
    getToolUseSummary: getToolUseSummary_3,
    getActivityDescription(input) {
      let summary = getToolUseSummary_3(input);
      return summary ? `Finding ${summary}` : "Finding files";
    },
    get inputSchema() {
      return globInputSchema();
    },
    get outputSchema() {
      return globOutputSchema();
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
        ? input.pattern
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
    getPath({ path, pattern }) {
      if (pattern) {
        let absoluteGlobPattern = resolveAbsoluteGlobPattern(pattern);
        if (absoluteGlobPattern) return absoluteGlobPattern.searchDir;
      }
      if (isRemoteOnlyCheck(GLOB_TOOL_NAME)) return path ?? "";
      if (path) return expandPath(path);
      return getCwd();
    },
    async preparePermissionMatcher({ pattern }) {
      return (rulePattern) => matchWildcardPattern(rulePattern, pattern);
    },
    async prompt({ model, leanPrompt }) {
      return getGlobToolDescription(model, leanPrompt);
    },
    renderToolUseMessage,
    extractSearchText({ filenames }) {
      return filenames.join(`
`);
    },
    create(toolContext) {
      return {
        async validateInput(input) {
          let { pattern, path } = input;
          if (canRunToolsOnThisMachine() && hasHostField(input))
            return {
              result: false,
              message: hostFieldNotForwardedMessage(),
              errorCode: 3,
            };
          let nullByteRefusal = rejectNullBytes(GLOB_TOOL_NAME, [
            ["pattern", pattern],
            ["path", path],
          ]);
          if (nullByteRefusal) return nullByteRefusal;
          return {
            result: true,
          };
        },
        async checkPermissions(input, callOptions) {
          let path = GlobTool.getPath(input);
          let pathSpellings = walkPermissionCheckPaths(path);
          toolContext.session.writePermissionStash.stash(
            callOptions.toolUseId,
            path,
            pathSpellings.spellings,
            "read",
          );
          return checkReadPermissionForTool(GlobTool, input, toolContext.permissions(), pathSpellings);
        },
        async call(input, callOptions) {
          let { globLimits } = callOptions;
          let checkContext = {
            toolUseId: callOptions.toolUseId,
            remoteCall: callOptions.remoteCall,
            session: toolContext.session,
            toolState: toolContext.toolState,
          };
          let start = Date.now();
          let limit = globLimits?.maxResults ?? 100;
          let path = GlobTool.getPath(input);
          let permittedPaths = consumeReadPermission(checkContext, path);
          if (input.path && path === expandPath(input.path))
            await assertGlobDirectoryExists(input.path, permittedPaths, checkContext);
          let { files, truncated, totalMatches, countIsComplete, timedOut } = await globFiles(
            input.pattern,
            path,
            {
              limit,
              offset: 0,
            },
            callOptions.signal,
            toolContext.permissions(),
            permittedPaths,
            callOptions.timing,
          );
          let filenames = files.map(toRelativePath);
          return {
            data: {
              filenames,
              durationMs: Date.now() - start,
              numFiles: filenames.length,
              truncated,
              totalMatches,
              countIsComplete,
              ...(timedOut && {
                timedOut,
              }),
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(output, toolUseID) {
      let timeoutNote = output.timedOut
        ? `${SEARCH_INCOMPLETE_NOTE}

`
        : "";
      if (output.filenames.length === 0)
        return {
          tool_use_id: toolUseID,
          type: "tool_result",
          content: `${timeoutNote}No files found`,
        };
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content:
          timeoutNote +
          [...output.filenames, ...(output.truncated ? [formatGlobTruncationNote(output)] : [])].join(`
`),
      };
    },
  });
});
export { GlobTool };
