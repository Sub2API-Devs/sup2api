/**
 * tools/GlobTool/GlobTool.ts
 *
 * Glob 工具：按文件名模式用 ripgrep --files 查找，按修改时间排序，默认 100 条
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/GlobTool/GlobTool.ts
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: fingerprint 2, layout 2
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, o, u, E, A, M } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  attachedMachineInputField,
  $r,
  $Fe,
  Cf,
  yO,
  hostFieldNotForwardedMessage,
} from "../../bridge/deviceRegistration.js";
import { expandPath, toRelativePath } from "../../utils/path.js";
import { hl } from "../../utils/networkPaths.js";
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
import { GLOB_TOOL_NAME } from "./prompt.js";
import { getGlobToolDescription } from "./_new/GLOB_DESCRIPTION.js";
import { getToolUseSummary_4 } from "./UI.js";
import { zCe } from "../../utils/remoteTools/toolHostRouting.js";
import { resolveAbsoluteGlobPattern, globFiles } from "../../utils/glob.js";
import { isRemoteOnlyCheck } from "../../utils/permissions/checkRegistry.js";
import { matchWildcardPattern } from "../../utils/permissions/shellRuleMatching.js";
import { renderToolUseMessage } from "../GrepTool/UI.js";
import { rejectNullBytes } from "../../utils/filePathValidation.js";
import { checkReadPermissionForTool } from "../../utils/permissions/filesystem.js";
import { consumeReadPermission } from "../../utils/fsSafety/atomicWriteStaging.js";

//@ chunk-e6aww6q8.js:1441401-1442549 fingerprint = outputSchema (0.549)
var globInputSchema = DoctorLazy(() =>
    zodStrictObject({
      pattern: o().describe("The glob pattern to match files against"),
      path: o()
        .optional()
        .describe(
          'The directory to search in. If not specified, the current working directory will be used. IMPORTANT: Omit this field to use the default directory. DO NOT enter "undefined" or "null" - simply omit it for the default behavior. Must be a valid directory path if provided.',
        ),
      ...attachedMachineInputField(),
    }),
  ),
  globOutputSchema = DoctorLazy(() =>
    u({
      durationMs: E().describe("Time taken to execute the search in milliseconds"),
      numFiles: E().describe("Number of file paths returned (after any truncation)"),
      filenames: A(o()).describe("Array of file paths that match the pattern"),
      truncated: M().describe("Whether results were truncated (limited to 100 files)"),
      totalMatches: E()
        .optional()
        .describe(
          "Total number of matching files before truncation. A lower bound when countIsComplete is false. Absent on results persisted by CLI versions predating this field.",
        ),
      countIsComplete: M()
        .optional()
        .describe(
          "Whether totalMatches is the exact total (true) or a floor because the underlying search truncated its own output (false). Absent on results persisted by CLI versions predating this field.",
        ),
    }),
  );
/**
 * Glob 结果截断时的提示：未知总数、精确总数或"多于 N"三种。
 */
//@ chunk-e6aww6q8.js:1442549-1443004 layout
function formatGlobTruncationNote(output) {
  let n = output.filenames.length;
  if (output.totalMatches === void 0)
    return "(Results are truncated. Consider using a more specific path or pattern.)";
  if (output.countIsComplete) {
    let r = output.totalMatches - n;
    return `(Showing ${n} of ${output.totalMatches} matching files; ${r} more are not listed. Narrow the pattern or path to see the rest.)`;
  }
  return `(Showing the first ${n} files; there are more than ${output.totalMatches} matches. Narrow the pattern or path to see the rest.)`;
}
/**
 * 显式 path 不存在或不是目录时抛 TelemetrySafeError（附 cwd 说明、Did you mean、远程提示）。
 */
//@ chunk-e6aww6q8.js:1443004-1443397 layout
async function assertGlobDirectoryExists(e, n, r) {
  let s = expandPath(e);
  if (hl(s) || getPathsForPermissionCheck(s).some((y) => !n.includes(y))) return;
  let h;
  try {
    h = await getFsImplementation().stat(s);
  } catch (error) {
    if (!isENOENT(error)) throw error;
    let S = await normalizePathForComparison(s);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      encodeControlChars(
        `Directory does not exist: ${e}. ${FILE_NOT_FOUND_CWD_NOTE} ${getCwd()}.${S ? ` Did you mean ${S}?` : ""}${separateCopyHint(GlobTool, s, r)}`,
      ),
      "Directory does not exist",
    );
  }
  if (!h.isDirectory())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      encodeControlChars(`Path is not a directory: ${e}`),
      "Path is not a directory",
    );
}
/**
 * Glob 工具定义（name "Glob"）。只读、可并发；pattern 加可选 path；绝对路径模式自动拆出搜索目录；validateInput 查空字节；checkPermissions 读权限；call 用 ripgrep --files 按修改时间排序，默认最多 100 个，截断时给出说明。
 */
//@ chunk-e6aww6q8.js:1443397-1445523 fingerprint = GlobTool (0.653)
var GlobTool = buildTool({
  name: GLOB_TOOL_NAME,
  searchHint: "find files by name pattern or wildcard",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  async description() {
    return getGlobToolDescription(void 0);
  },
  remoteExecution: { supported: !0 },
  userFacingName() {
    return "Search";
  },
  getToolUseSummary: getToolUseSummary_4,
  getActivityDescription(e) {
    let n = getToolUseSummary_4(e);
    return n ? `Finding ${n}` : "Finding files";
  },
  get inputSchema() {
    return globInputSchema();
  },
  get outputSchema() {
    return globOutputSchema();
  },
  isConcurrencySafe() {
    return !0;
  },
  isReadOnly() {
    return !0;
  },
  toAutoClassifierInput(input) {
    let n = zCe(input);
    return n === void 0
      ? input.pattern
      : {
          pattern: input.pattern,
          ...(input.path !== void 0 && { path: input.path }),
          [$r]: n,
          ...$Fe(input),
        };
  },
  suppressesAllPermissionUpdates(e) {
    return Cf(e);
  },
  isSearchOrReadCommand() {
    return { isSearch: !0, isRead: !1 };
  },
  ruleContentField: "path",
  getPath({ path: e, pattern: n }) {
    if (n) {
      let r = resolveAbsoluteGlobPattern(n);
      if (r) return r.searchDir;
    }
    if (isRemoteOnlyCheck(GLOB_TOOL_NAME)) return e ?? "";
    if (e) return expandPath(e);
    return getCwd();
  },
  async preparePermissionMatcher({ pattern: e }) {
    return (n) => matchWildcardPattern(n, e);
  },
  async prompt({ model: e, leanPrompt: n }) {
    return getGlobToolDescription(e, n);
  },
  renderToolUseMessage: renderToolUseMessage,
  extractSearchText({ filenames: e }) {
    return e.join(`
`);
  },
  create(e) {
    return {
      async validateInput(n) {
        let { pattern: pattern, path: path } = n;
        if (yO() && Cf(n)) return { result: !1, message: hostFieldNotForwardedMessage(), errorCode: 3 };
        let h = rejectNullBytes(GLOB_TOOL_NAME, [
          ["pattern", pattern],
          ["path", path],
        ]);
        if (h) return h;
        return { result: !0 };
      },
      async checkPermissions(n, r) {
        let path = GlobTool.getPath(n),
          h = walkPermissionCheckPaths(path);
        return (
          e.session.writePermissionStash.stash(r.toolUseId, path, h.spellings, "read"),
          checkReadPermissionForTool(GlobTool, n, e.permissions(), h)
        );
      },
      async call(n, r) {
        let { globLimits: globLimits } = r,
          h = {
            toolUseId: r.toolUseId,
            remoteCall: r.remoteCall,
            session: e.session,
            toolState: e.toolState,
          },
          now = Date.now(),
          S = globLimits?.maxResults ?? 100,
          path = GlobTool.getPath(n),
          L = consumeReadPermission(h, path);
        if (n.path && path === expandPath(n.path)) await assertGlobDirectoryExists(n.path, L, h);
        let {
            files: files,
            truncated: truncated,
            totalMatches: totalMatches,
            countIsComplete: countIsComplete,
          } = await globFiles(
            n.pattern,
            path,
            { limit: S, offset: 0 },
            r.signal,
            e.permissions(),
            L,
            r.timing,
          ),
          mapped = files.map(toRelativePath);
        return {
          data: {
            filenames: mapped,
            durationMs: Date.now() - now,
            numFiles: mapped.length,
            truncated: truncated,
            totalMatches: totalMatches,
            countIsComplete: countIsComplete,
          },
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, n) {
    if (e.filenames.length === 0) return { tool_use_id: n, type: "tool_result", content: "No files found" };
    return {
      tool_use_id: n,
      type: "tool_result",
      content: [...e.filenames, ...(e.truncated ? [formatGlobTruncationNote(e)] : [])].join(`
`),
    };
  },
});

export { GlobTool };
