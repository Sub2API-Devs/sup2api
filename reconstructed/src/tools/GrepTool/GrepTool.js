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
import {
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
} from "path";
import { Re } from "../../../runtime/bun-runtime.js";
import { hqt } from "../../../vendor/picomatch/index.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { GREP_TOOL_NAME, getDescription } from "./prompt.js";
import { coerceBooleanString, booleanishSchema } from "../../utils/spellcheck.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, o, U, E, M, u, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { coercedNumberSchema } from "../ArtifactTool/publishEdits.js";
import {
  attachedMachineInputField,
  $r,
  $Fe,
  Cf,
  yO,
  hostFieldNotForwardedMessage,
} from "../../bridge/deviceRegistration.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { getToolUseSummary_4 } from "../GlobTool/UI.js";
import { sK, rejectNullBytes } from "../../utils/filePathValidation.js";
import { zCe } from "../../utils/remoteTools/toolHostRouting.js";
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
import { hl } from "../../utils/networkPaths.js";
import { isENOENT, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { normalizePathForComparison, FILE_NOT_FOUND_CWD_NOTE } from "../../utils/file.js";
import { encodeControlChars } from "../../utils/sanitization.js";
import { separateCopyHint } from "../../utils/remoteTools/folderSync.js";
import {
  buildDenyRuleGlobs,
  hasUnsafeDenyGlob,
  getRipgrepDisplayRoot,
  ripGrep,
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
import { J1e } from "../../utils/fsSafety/pathRevalidation.js";
import { INHERITED_FD_PATH } from "../../utils/execFileNoThrow.js";
import { createAbortableStream } from "../../utils/readFileInRange.js";
import { uniq } from "../../utils/collections.js";
import { jsonParseRaw } from "../../utils/slowOperations.js";

//@ chunk-e6aww6q8.js:1445523-1445543 placement
var M9t = Re(hqt(), 1);
//@ chunk-e6aww6q8.js:1445605-1445676 placement
var V2o = [
  ["-l", "flag_l", "files_with_matches"],
  ["-c", "flag_c", "count"],
];
/**
 * 把 Grep 工具输入中的 file_path 别名映射为 path。
 */
//@ chunk-e6aww6q8.js:1445676-1446577 placement
function normalizeGrepInputAliases(e) {
  if (!isPlainObject_4(e)) return null;
  let n = { ...e },
    r = [],
    s = [],
    file_path = n.file_path;
  if (typeof file_path === "string" && file_path !== "") {
    let y = !Object.hasOwn(n, "path");
    if (y || n.path === file_path)
      (delete n.file_path,
        (n.path = file_path),
        r.push(y ? "file_path" : "repeated_file_path"),
        s.push(
          `${GREP_TOOL_NAME}'s parameter for where to search is named \`path\`. ${y ? "`file_path` was read as `path`." : "`file_path` repeated `path` and was ignored."}`,
        ));
  }
  for (let [y, S, w] of V2o) {
    if (coerceBooleanString(n[y]) !== !0) continue;
    let L = !Object.hasOwn(n, "output_mode");
    if (L || n.output_mode === w)
      (delete n[y],
        (n.output_mode = w),
        r.push(L ? S : `repeated_${S}`),
        s.push(
          L
            ? `\`${y}\` is not a ${GREP_TOOL_NAME} parameter and was read as \`output_mode: "${w}"\`.`
            : `\`${y}\` repeated \`output_mode\` and was ignored.`,
        ));
  }
  if (coerceBooleanString(n["-r"]) === !0)
    (delete n["-r"],
      r.push("flag_r"),
      s.push(`\`-r\` was ignored: ${GREP_TOOL_NAME} always searches a directory recursively.`));
  return r.length ? { input: n, shapeClass: r.join(","), resultNote: `Note: ${s.join(" ")}` } : null;
}
/**
 * Grep 输入 schema（pattern/path/glob/output_mode/-B/-A/-C/context/-n/-i/-o/type/head_limit/offset/multiline）、VCS 目录排除列表、默认 head_limit 250。
 */
//@ chunk-e6aww6q8.js:1446577-1449071 fingerprint = inputSchema (0.841)
var grepInputSchema = DoctorLazy(() =>
    zodStrictObject({
      pattern: o().describe("The regular expression pattern to search for in file contents"),
      path: o()
        .optional()
        .describe("File or directory to search in (rg PATH). Defaults to current working directory."),
      glob: o()
        .optional()
        .describe('Glob pattern to filter files (e.g. "*.js", "*.{ts,tsx}") - maps to rg --glob'),
      output_mode: U(["content", "files_with_matches", "count"])
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
      type: o()
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
  ),
  grepInputSchemaRef = grepInputSchema,
  VCS_DIRECTORIES_TO_EXCLUDE = [".git", ".svn", ".hg", ".bzr", ".jj", ".sl"],
  DEFAULT_HEAD_LIMIT = 250;
/**
 * 按 offset/limit 截取结果（limit 为 0 表示不限，未给时 250），返回是否实际截断。
 */
//@ chunk-e6aww6q8.js:1449071-1449232 fingerprint = applyHeadLimit (1)
function applyHeadLimit(items, limit, offset = 0) {
  if (limit === 0) return { items: items.slice(offset), appliedLimit: void 0 };
  let effectiveLimit = limit ?? DEFAULT_HEAD_LIMIT,
    sliced = items.slice(offset, offset + effectiveLimit),
    wasTruncated = items.length - offset > effectiveLimit;
  return { items: sliced, appliedLimit: wasTruncated ? effectiveLimit : void 0 };
}
/**
 * 把实际 limit/offset 格式化为 "limit: N, offset: M"。
 */
//@ chunk-e6aww6q8.js:1449232-1449343 fingerprint = formatLimitInfo (1)
function formatLimitInfo(appliedLimit, appliedOffset) {
  let parts = [];
  if (appliedLimit !== void 0) parts.push(`limit: ${appliedLimit}`);
  if (appliedOffset) parts.push(`offset: ${appliedOffset}`);
  return parts.join(", ");
}
/**
 * Grep 工具定义（name "Grep"）。只读、可并发、maxResultSizeChars 20000；ripgrep 正则搜索，三种 output_mode，head_limit 默认 250、offset 分页；validateInput 查空字节与 head_limit/offset 为非负整数。
 */
//@ chunk-e6aww6q8.js:1449343-1452555 fingerprint = GrepTool (0.619)
var grepOutputSchema = DoctorLazy(() =>
    u({
      mode: U(["content", "files_with_matches", "count"]).optional(),
      numFiles: E(),
      filenames: A(o()),
      content: o().optional(),
      numLines: E().optional(),
      numMatches: E().optional(),
      totalFiles: E().optional(),
      totalLines: E().optional(),
      appliedLimit: E().optional(),
      appliedOffset: E().optional(),
    }),
  ),
  GrepTool = buildTool({
    name: GREP_TOOL_NAME,
    searchHint: "search file contents with regex (ripgrep)",
    remoteExecution: { supported: !0 },
    backgrounding: "never",
    maxResultSizeChars: 20000,
    strict: !0,
    async description() {
      return getDescription(void 0);
    },
    userFacingName() {
      return "Search";
    },
    getToolUseSummary: getToolUseSummary_4,
    getActivityDescription(e) {
      let n = getToolUseSummary_4(e);
      return n ? `Searching for ${n}` : "Searching";
    },
    get inputSchema() {
      return grepInputSchemaRef();
    },
    get outputSchema() {
      return grepOutputSchema();
    },
    coerceInput(e) {
      return sK(grepInputSchemaRef(), normalizeGrepInputAliases(e));
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
        ? input.path
          ? `${input.pattern} in ${input.path}`
          : input.pattern
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
    getPath({ path: e }) {
      if (isRemoteOnlyCheck(GREP_TOOL_NAME)) return e ?? "";
      return e ? expandPath(e) : getCwd();
    },
    async preparePermissionMatcher({ pattern: e }) {
      return (n) => matchWildcardPattern(n, e);
    },
    async prompt({ model: e, leanPrompt: n, leanRewrite: r }) {
      return getDescription(e, n, r);
    },
    renderToolUseMessage: renderToolUseMessage,
    extractSearchText({ mode: e, content: n, filenames: r }) {
      if (e === "content" && n) return n;
      return r.join(`
`);
    },
    mapToolResultToToolResultBlockParam(
      {
        mode: e = "files_with_matches",
        numFiles: n,
        filenames: r,
        content: s,
        numLines: h,
        numMatches: y,
        totalFiles: S,
        totalLines: w,
        appliedLimit: L,
        appliedOffset: G,
      },
      q,
    ) {
      if (e === "content") {
        let ke = formatLimitInfo(L, G),
          we = s || (G && (w ?? 0) > 0 ? "No entries at this offset" : "No matches found"),
          Ee = ke
            ? `${we}

[Showing results with pagination = ${ke}]`
            : we;
        return { tool_use_id: q, type: "tool_result", content: Ee };
      }
      if (e === "count") {
        let ke = formatLimitInfo(L, G),
          we = y ?? 0,
          Ee = n ?? 0,
          Ae = s || (we > 0 ? "No entries at this offset" : "No matches found"),
          Ie = `

Found ${we} total ${we === 1 ? "occurrence" : "occurrences"} across ${Ee} ${Ee === 1 ? "file" : "files"}.${ke ? ` with pagination = ${ke}` : ""}`;
        return { tool_use_id: q, type: "tool_result", content: Ae + Ie };
      }
      let Z = formatLimitInfo(L, G);
      if (n === 0)
        return {
          tool_use_id: q,
          type: "tool_result",
          content:
            G && (S ?? 0) > 0
              ? `No entries at this offset. [Showing results with pagination = ${Z}]`
              : "No files found",
        };
      let Se = `Found ${n} ${plural(n, "file")}${Z ? ` ${Z}` : ""}
${r.join(`
`)}`;
      return { tool_use_id: q, type: "tool_result", content: Se };
    },
    create(e) {
      return {
        async validateInput(n) {
          let {
            pattern: pattern,
            path: path,
            glob: glob,
            type: y,
            head_limit: head_limit,
            offset: offset,
          } = n;
          if (yO() && Cf(n)) return { result: !1, message: hostFieldNotForwardedMessage(), errorCode: 3 };
          let L = rejectNullBytes(GREP_TOOL_NAME, [
            ["pattern", pattern],
            ["path", path],
            ["glob", glob],
            ["type", y],
          ]);
          if (L) return L;
          for (let [G, q] of [
            ["head_limit", head_limit],
            ["offset", offset],
          ])
            if (q !== void 0 && (!Number.isInteger(q) || q < 0))
              return {
                result: !1,
                message: `${G} must be a whole number of 0 or more, got ${q}.${G === "head_limit" ? " Pass 0 for unlimited." : ""}`,
                errorCode: 2,
              };
          return { result: !0 };
        },
        async checkPermissions(n, r) {
          let path = GrepTool.getPath(n),
            h = walkPermissionCheckPaths(path);
          return (
            e.session.writePermissionStash.stash(r.toolUseId, path, h.spellings, "read"),
            checkReadPermissionForTool(GrepTool, n, e.permissions(), h)
          );
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
/**
 * 校验 Grep 的搜索路径存在（受保护路径或权限检查路径变化时跳过）；不存在时抛出带当前目录与"你是不是指…"建议的遥测安全错误。
 */
//@ chunk-e6aww6q8.js:1452555-1452836 placement
async function assertGrepPathExists(e, n, r) {
  let s = expandPath(e);
  if (hl(s) || getPathsForPermissionCheck(s).some((h) => !n.includes(h))) return;
  try {
    await getFsImplementation().stat(s);
  } catch (error) {
    if (!isENOENT(error)) throw error;
    let y = await normalizePathForComparison(s);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      encodeControlChars(
        `Path does not exist: ${e}. ${FILE_NOT_FOUND_CWD_NOTE} ${getCwd()}.${y ? ` Did you mean ${y}?` : ""}${separateCopyHint(GrepTool, s, r)}`,
      ),
      "Path does not exist",
    );
  }
}
//@ chunk-e6aww6q8.js:1453023-1453038 affinity
var GSe = void 0;
/**
 * 搜索目标不可打开时按 output_mode 返回空结果。
 */
//@ chunk-e6aww6q8.js:1453038-1453463 fingerprint = outputSchema (0.764)
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
          appliedLimit: GSe,
          appliedOffset: GSe,
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
          appliedLimit: GSe,
          appliedOffset: GSe,
        },
      };
    case "files_with_matches":
      return { data: { mode: "files_with_matches", filenames: [], numFiles: 0, totalFiles: 0 } };
  }
}
/**
 * Grep 工具的执行主体：按参数组装 ripgrep 参数（隐藏文件、排除 VCS 目录、列宽、多行、大小写、输出模式、上下文、类型与 glob、读取 deny 规则与忽略模式），任务输出文件改为单独绑定读取；运行 ripgrep 后按输出模式整理结果、做分页与权限过滤。
 */
//@ chunk-e6aww6q8.js:1453463-1458523 placement
async function runGrep(
  searchTarget,
  {
    pattern: pattern,
    glob: glob,
    type: s,
    output_mode: output_mode = "files_with_matches",
    "-B": beforeContext,
    "-A": afterContext,
    "-C": contextLines,
    context: context,
    "-n": showLineNumbers = !0,
    "-i": caseInsensitive = !1,
    "-o": onlyMatching = !1,
    head_limit: head_limit,
    offset: offset = 0,
    multiline: multiline = !1,
  },
  context_2,
) {
  let { signal: signal, timing: timing } = context_2,
    canonical = searchTarget.canonical,
    rgArgs = ["--hidden"],
    userGlobIndices = [],
    builtinGlobIndices = new Set(),
    addGlob = (fo) => {
      (builtinGlobIndices.add(rgArgs.length), rgArgs.push("--glob", fo));
    };
  for (let fo of VCS_DIRECTORIES_TO_EXCLUDE) addGlob(`!${fo}`);
  if ((rgArgs.push("--max-columns", "500"), multiline)) rgArgs.push("-U", "--multiline-dotall");
  if (caseInsensitive) rgArgs.push("-i");
  if (output_mode === "files_with_matches") rgArgs.push("-l");
  else if (output_mode === "count") rgArgs.push("-c", "-H");
  if ((rgArgs.push(output_mode === "content" ? "--json" : "--null"), output_mode === "content"))
    rgArgs.push("-n");
  if (onlyMatching && output_mode === "content") rgArgs.push("-o");
  if (output_mode === "content")
    if (context !== void 0) rgArgs.push("-C", context.toString());
    else if (contextLines !== void 0) rgArgs.push("-C", contextLines.toString());
    else {
      if (beforeContext !== void 0) rgArgs.push("-B", beforeContext.toString());
      if (afterContext !== void 0) rgArgs.push("-A", afterContext.toString());
    }
  if (pattern.startsWith("-")) rgArgs.push("-e", pattern);
  else rgArgs.push(pattern);
  if (s) rgArgs.push("--type", s);
  if (glob) {
    let fo = [],
      parts = glob.split(/\s+/);
    for (let bo of parts)
      if (bo.includes("{") && bo.includes("}")) fo.push(bo);
      else fo.push(...bo.split(",").filter(Boolean));
    for (let bo of fo.filter(Boolean)) (userGlobIndices.push(rgArgs.length), addGlob(bo));
  }
  let readIgnorePatterns = getFileReadIgnorePatterns(context_2.permissions()),
    denyGlobs = buildDenyRuleGlobs(readIgnorePatterns, searchTarget),
    judgeEveryResult =
      searchTarget.judgeEveryResult === !0 ||
      hasUnsafeDenyGlob(readIgnorePatterns, searchTarget) ||
      (readIgnorePatterns.size > 0 && mayBeGuardedFileSyncCopy(searchTarget.canonical));
  for (let fo of denyGlobs) rgArgs.push("--iglob", fo);
  for (let fo of await getPluginCacheExclusionDirs(canonical)) {
    let To = toRipgrepExcludeGlob(fo, getRipgrepDisplayRoot(searchTarget));
    if (To === null) continue;
    addGlob(To);
  }
  let rgLines,
    taskOutput = isTaskOutputFilePath(canonical) ? await bindTaskOutputForRead(canonical) : void 0,
    At = taskOutput !== void 0 && taskOutput.ioPath !== J1e(taskOutput.handle.fd),
    It = taskOutput === void 0 ? searchTarget.target : At ? "-" : INHERITED_FD_PATH,
    Yt = taskOutput === void 0 ? searchTarget.inheritFd : At ? void 0 : taskOutput.handle.fd,
    qt = !1;
  if (taskOutput !== void 0) {
    let mapped = userGlobIndices.map((co) => rgArgs[co + 1]),
      To = (co) => {
        let So = M9t.default(co, { dot: !0, nocase: caseInsensitive === !0 });
        return So(basename_34(canonical)) || So(canonical) || So(canonical.replaceAll("\\", "/"));
      },
      mapped_2 = mapped.filter((co) => co.startsWith("!") && co.length > 1).map((co) => co.slice(1)),
      filtered = mapped.filter((co) => co !== "" && !co.startsWith("!"));
    try {
      qt = mapped_2.some(To) || (filtered.length > 0 && !filtered.some(To)) || (s !== void 0 && s !== "");
    } catch (error) {
      throw (await taskOutput.close(), error);
    }
    for (let co = rgArgs.length - 2; co >= 0; co--)
      if (rgArgs[co] === "--glob" && builtinGlobIndices.has(co)) rgArgs.splice(co, 2);
  }
  let Zt = At ? () => createAbortableStream(taskOutput.handle, !0, signal) : void 0,
    rn = taskOutput === void 0 ? taskOutputDirExclusions(canonical) : [];
  if (rn.includes("!**"))
    throw Error(
      "Task output files are read individually: Grep (or Read) a specific task's output path rather than the tasks directory.",
    );
  for (let fo of rn) addGlob(fo);
  let pn = !1;
  try {
    if (qt) rgLines = [];
    else {
      pn = !0;
      let To = timing?.mark("external");
      rgLines = await ripGrep(rgArgs, It, signal, {
        rawLines: !0,
        rejectOnInputError: !0,
        searchOtherAppsData: !0,
        cwd: searchTarget.spawnCwd,
        stdin: Zt,
        inheritFd: Yt,
        beforeSpawn: () => {
          (searchTarget.recheckBeforeSpawn(),
            assertDenyGlobsUnchanged(readIgnorePatterns, searchTarget, denyGlobs));
        },
      }).finally(To);
    }
  } finally {
    await taskOutput?.close();
  }
  if (pn && output_mode !== "content") rgLines = splitNulDelimitedOutput(rgLines, output_mode);
  if (taskOutput !== void 0 && It !== searchTarget.target && output_mode !== "content") {
    let fo = At ? "<stdin>" : It;
    rgLines = rgLines.map((To) =>
      To === fo
        ? searchTarget.target
        : To.startsWith(`${fo}:`)
          ? searchTarget.target + To.slice(fo.length)
          : output_mode === "count" && /^\d+$/.test(To)
            ? `${searchTarget.target}:${To}`
            : To,
    );
  }
  if (pn && output_mode === "content")
    rgLines = formatRgJsonLines(rgLines, {
      contextBreaks: [context, contextLines, beforeContext, afterContext].some(
        (fo) => typeof fo === "number" && fo > 0,
      ),
      onlyMatching: onlyMatching === !0,
    });
  if (pn && (searchTarget.relativeOutput || !searchTarget.isDirectory))
    rgLines = rgLines.map((fo) => toDisplayPath(fo, searchTarget));
  if (readIgnorePatterns.size > 0)
    if (!searchTarget.isDirectory) {
      let permissions = context_2.permissions();
      if (
        uniq([
          searchTarget.canonical,
          searchTarget.lexical,
          ...getPathsForPermissionCheck(searchTarget.lexical),
        ]).some((bo) => matchingRuleForInput(bo, permissions, "read", "deny") !== null)
      )
        rgLines = [];
    } else {
      let mapped = uniq([searchTarget.canonical, searchTarget.lexical, searchTarget.target]).map((So) =>
          So.endsWith(sep_39) ? So : So + sep_39,
        ),
        To = new Map(),
        bo = new Set(),
        vn = new Set();
      for (let So of rgLines) {
        if (To.has(So) || vn.has(So)) continue;
        let ko = extractResultPath(So, output_mode, mapped);
        if (ko === null) {
          vn.add(So);
          continue;
        }
        if (judgeEveryResult || ko.some(mayEscapeExclusionGlobs)) {
          To.set(So, ko);
          for (let un of ko) bo.add(un);
        }
      }
      let co = denyFoldVariantPaths(
        [...bo],
        context_2.permissions(),
        (So) => getAlternateRootSpellings(So, searchTarget),
        judgeEveryResult,
      );
      if (co.size > 0 || vn.size > 0)
        ((rgLines = rgLines.filter((So) => {
          if (vn.has(So)) return !1;
          return !(To.get(So) ?? []).some((ko) => co.has(ko));
        })),
          (rgLines = rgLines.filter(
            (So, ko, un) => So !== "--" || (ko > 0 && ko < un.length - 1 && un[ko - 1] !== "--"),
          )));
    }
  if (output_mode === "content") {
    let { items: items, appliedLimit: appliedLimit } = applyHeadLimit(rgLines, head_limit, offset),
      mapped = items.map((co) => {
        let index = co.indexOf("\x00");
        if (index < 0) return showLineNumbers ? co : co.replace(/^\d+[:-]/, "");
        let substring = co.substring(index + 1),
          match = /^(\d+)([:-])/.exec(substring),
          ao = match?.[2] ?? ":",
          $o = showLineNumbers || match === null ? substring : substring.substring(match[0].length);
        return searchTarget.isDirectory ? toRelativePath(co.substring(0, index)) + ao + $o : $o;
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
        ...(appliedLimit !== void 0 && { appliedLimit: appliedLimit }),
        ...(offset > 0 && { appliedOffset: offset }),
      },
    };
  }
  if (output_mode === "count") {
    let { items: items, appliedLimit: appliedLimit } = applyHeadLimit(rgLines, head_limit, offset),
      mapped = items.map((ko) => {
        let index = ko.lastIndexOf(":");
        if (index > 0) {
          let substring = ko.substring(0, index),
            substring_2 = ko.substring(index);
          return toRelativePath(substring) + substring_2;
        }
        return ko;
      }),
      vn = 0,
      co = 0;
    for (let ko of rgLines) {
      let index = ko.lastIndexOf(":");
      if (index > 0) {
        let substring = ko.substring(index + 1),
          $o = parseInt(substring, 10);
        if (!isNaN($o)) ((vn += $o), (co += 1));
      }
    }
    return {
      data: {
        mode: "count",
        numFiles: co,
        filenames: [],
        content: mapped.join(`
`),
        numMatches: vn,
        ...(appliedLimit !== void 0 && { appliedLimit: appliedLimit }),
        ...(offset > 0 && { appliedOffset: offset }),
      },
    };
  }
  let settled = await Promise.allSettled(rgLines.map((fo) => getFsImplementation().stat(fo))),
    mapped = rgLines
      .map((fo, To) => {
        let bo = settled[To];
        return [fo, bo.status === "fulfilled" ? (bo.value.mtimeMs ?? 0) : 0];
      })
      .sort((fo, To) => {
        let bo = To[1] - fo[1];
        if (bo === 0) return fo[0].localeCompare(To[0]);
        return bo;
      })
      .map((fo) => fo[0]),
    { items: items, appliedLimit: appliedLimit } = applyHeadLimit(mapped, head_limit, offset),
    mapped_2 = items.map(toRelativePath);
  return {
    data: {
      mode: "files_with_matches",
      filenames: mapped_2,
      numFiles: mapped_2.length,
      totalFiles: mapped.length,
      ...(appliedLimit !== void 0 && { appliedLimit: appliedLimit }),
      ...(offset > 0 && { appliedOffset: offset }),
    },
  };
}
/**
 * 把 ripgrep 输出的路径前缀（目标或规范路径）换回用户看到的词法路径，处理相对输出与 ":"/NUL 分隔。
 */
//@ chunk-e6aww6q8.js:1458523-1458885 placement
function toDisplayPath(e, n) {
  let r = n.lexical.endsWith(sep_39) ? n.lexical : n.lexical + sep_39;
  if (n.relativeOutput) return e.startsWith("./") ? r + e.slice(2) : e;
  for (let s of [n.target, n.canonical]) {
    let h = s.endsWith(sep_39) ? s : s + sep_39;
    if (e.startsWith(h)) return r + e.slice(h.length);
    if (e === s) return n.lexical;
    if (e.startsWith(`${s}:`) || e.startsWith(`${s}\x00`)) return n.lexical + e.slice(s.length);
  }
  return e;
}
//@ chunk-e6aww6q8.js:1458885-1459178 placement
function extractResultPath(e, n, r) {
  let s;
  if (n === "content") {
    if (e === "--") return [];
    let index = e.indexOf("\x00");
    if (index < 0) return null;
    s = e.substring(0, index);
  } else if (n === "count") {
    let index = e.lastIndexOf(":");
    s = index > 0 ? e.substring(0, index) : e;
  } else s = e;
  let h = sep_39 === "\\" ? s.replaceAll("/", "\\") : s;
  return r.some((y) => h.startsWith(y)) ? [h] : null;
}
/**
 * 把 ripgrep --json 输出转成"路径\0行号:内容"形式的行：处理 begin/end（二进制文件只报一行提示）、上下文分隔 --、仅匹配模式按子匹配拆行、过长行用省略标记替代。
 */
//@ chunk-e6aww6q8.js:1459178-1460512 placement
function formatRgJsonLines(lines, options) {
  let decodeText = (G) =>
      G === void 0 ? "" : G.text !== void 0 ? G.text : Buffer.from(G.bytes ?? "", "base64").toString("utf8"),
    clipLine = (G, q) =>
      G.length > 500 ? (q === "match" ? "[Omitted long matching line]" : "[Omitted long context line]") : G,
    out = [],
    fileLines = [],
    lastPath = null,
    lastLine = -1;
  for (let G of lines) {
    if (!G.startsWith("{")) continue;
    let q;
    try {
      q = jsonParseRaw(G);
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
      let binary_offset = Z.binary_offset,
        We = typeof binary_offset === "number";
      for (let ze of fileLines) if (!We || !ze.slice(ze.indexOf("\x00") + 1).includes("\x00")) out.push(ze);
      if (We && fileLines.length > 0)
        out.push(
          `${decodeText(Z.path)}\x00binary file matches (found "\\0" byte around offset ${binary_offset})`,
        );
      fileLines = [];
      continue;
    }
    if (q.type !== "match" && q.type !== "context") continue;
    let Se = decodeText(Z.path),
      ke = Z.line_number ?? 0,
      replaced = decodeText(Z.lines).replace(/\r?\n$/, "");
    if (options.contextBreaks && lastPath !== null && (Se !== lastPath || ke > lastLine + 1))
      fileLines.push("--");
    if (q.type === "match" && options.onlyMatching) {
      let Me = ke;
      for (let We of Z.submatches ?? []) {
        let ze = ke + EVo(Buffer.from(replaced), We.start ?? 0);
        decodeText(We.match)
          .split(
            `
`,
          )
          .forEach((lt, Je) => {
            (fileLines.push(`${Se}\x00${ze + Je}:${clipLine(stripSuffix(lt, "\r"), "match")}`),
              (Me = ze + Je));
          });
      }
      ((lastPath = Se), (lastLine = Me));
      continue;
    }
    let Ee = q.type === "match" ? "match" : "context",
      Ae = Ee === "match" ? ":" : "-",
      mapped = replaced
        .split(
          `
`,
        )
        .map((Me) => stripSuffix(Me, "\r"));
    (mapped.forEach((Me, We) => {
      fileLines.push(`${Se}\x00${ke + We}${Ae}${clipLine(Me, Ee)}`);
    }),
      (lastPath = Se),
      (lastLine = ke + mapped.length - 1));
  }
  for (let G of fileLines) out.push(G);
  return out;
}
//@ chunk-e6aww6q8.js:1460512-1460606 placement
function EVo(e, n) {
  let r = 0;
  for (let s = Math.min(n, e.length) - 1; s >= 0; s--) if (e[s] === 10) r++;
  return r;
}

export { GrepTool, assertGrepPathExists, emptyGrepResult, runGrep };
