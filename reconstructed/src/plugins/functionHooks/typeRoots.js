/**
 * plugins/functionHooks/typeRoots.ts
 *
 * 2.1.316 新增：为 mod 开发生成 TypeScript 类型根目录（index.d.ts、tsconfig）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (45)
 * attribution: placement 43, affinity 1, sole-consumer 1
 */
import {
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
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  mkdir as mkdir_6,
  mkdir as mkdir_7,
  mkdir as mkdir_8,
  mkdir as mkdir_9,
  mkdir as mkdir_10,
  mkdir as mkdir_11,
  mkdir as mkdir_12,
  mkdir as mkdir_13,
  mkdir as mkdir_14,
  mkdir as mkdir_15,
  mkdir as mkdir_16,
  mkdir as mkdir_17,
  mkdir as mkdir_18,
  mkdir as mkdir_19,
  mkdir as mkdir_20,
  mkdir as mkdir_21,
  mkdir as mkdir_22,
  mkdir as mkdir_23,
  mkdir as mkdir_24,
  mkdir as mkdir_25,
  mkdir as mkdir_26,
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
  rm as rm_6,
  rm as rm_7,
  rm as rm_8,
  rm as rm_9,
  rm as rm_10,
  rm as rm_11,
  rm as rm_12,
  rm as rm_13,
  rm as rm_14,
  rm as rm_15,
  rm as rm_16,
  rm as rm_17,
  rm as rm_18,
  rm as rm_19,
  rm as rm_20,
  rm as rm_21,
  rm as rm_22,
  rm as rm_23,
  rm as rm_24,
  rm as rm_25,
  rm as rm_26,
  rm as rm_27,
  rmdir,
  rmdir as rmdir_2,
  rmdir as rmdir_3,
  rmdir as rmdir_4,
  rmdir as rmdir_5,
  rmdir as rmdir_6,
  rmdir as rmdir_7,
  readlink,
  readlink as readlink_2,
  readlink as readlink_3,
  readlink as readlink_4,
  readlink as readlink_5,
  readlink as readlink_6,
  readlink as readlink_7,
  readlink as readlink_8,
  readlink as readlink_9,
  readlink as readlink_10,
  readlink as readlink_11,
  readlink as readlink_12,
  symlink,
  symlink as symlink_2,
  symlink as symlink_3,
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  realpath as realpath_10,
  realpath as realpath_11,
  realpath as realpath_12,
  realpath as realpath_13,
  realpath as realpath_14,
  realpath as realpath_15,
  realpath as realpath_16,
  realpath as realpath_17,
  realpath as realpath_18,
  realpath as realpath_19,
  realpath as realpath_20,
  realpath as realpath_21,
  realpath as realpath_22,
  realpath as realpath_23,
  realpath as realpath_24,
  realpath as realpath_25,
  realpath as realpath_26,
  realpath as realpath_27,
  realpath as realpath_28,
  realpath as realpath_29,
  realpath as realpath_30,
  realpath as realpath_31,
  realpath as realpath_32,
  realpath as realpath_33,
  realpath as realpath_34,
  realpath as realpath_35,
  realpath as realpath_36,
  realpath as realpath_37,
  realpath as realpath_38,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  open as open_8,
  open as open_9,
  open as open_10,
  open as open_11,
  open as open_12,
  open as open_13,
  open as open_14,
  open as open_15,
  open as open_16,
  open as open_17,
  open as open_18,
  open as open_19,
  open as open_20,
  open as open_21,
  open as open_22,
  open as open_23,
  open as open_24,
  open as open_25,
  open as open_26,
  open as open_27,
} from "fs/promises";
import {
  constants,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
  constants as constants_9,
  constants as constants_10,
  constants as constants_12,
  constants as constants_13,
  constants as constants_14,
  constants as constants_15,
  constants as constants_16,
  constants as constants_17,
  constants as constants_18,
  constants as constants_19,
  constants as constants_20,
  constants as constants_21,
  constants as constants_22,
  constants as constants_23,
  constants as constants_24,
  constants as constants_25,
  constants as constants_26,
  constants as constants_27,
} from "fs";
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { PLUGIN_MANIFEST_PATH } from "../../utils/plugins/commandSource.js";
import { getAllBaseToolsFromRegistry } from "../../Tool.js";
import { builtinToolSchemasOf } from "./types/builtinToolSchemas.js";
import { lp } from "./surfaceBinding.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import {
  buildMcpToolInputTypes,
  BUILTIN_TOOL_INPUTS_HEADER,
  MCP_TOOL_INPUTS_HEADER,
} from "./types/toolTypesDts.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, getErrnoCode, isENOENT, isSyscallError } from "../../utils/errors.js";
import { uos, checkInsidePluginRoot } from "./moduleLoader.js";
import { findReverseDependents, loadedFilesOf, reloadHooksModule } from "./hooksModuleLoader.js";
import { PLUGIN_NAME_FORBIDDEN_CHARS_RE } from "../../utils/plugins/schemas.js";
import {
  Ax,
  _9s,
  filterWatchedPluginDirs,
  folderWatchTargets,
  Wjn,
  kre,
  runPluginDirWatch,
  startPluginWatch,
  readManifestStamp,
  bundledFileStamp,
  retargetPluginModule,
  passesConfigChangeGate,
  WATCH_CLOCK,
  TURN_STATE_PROBE,
  watchPluginCollection,
  listDirChildren,
  sgn,
} from "./devModsWatch.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { releaseLock_2 } from "../../utils/autoUpdater.js";
import {
  writeFileAtomic as writeFileAtomic_2,
  writeNewFile,
  retryFsOp,
  retryTransient,
} from "../../utils/atomicPublishWrite.js";
import { isApplicable } from "../../components/messageActions.js";
import { ws } from "../../utils/fsFlags.js";
import { Wo } from "../../utils/json.js";
import { SYr, uiLog } from "./hooksWorkerClient.js";
import { Nso, Lso, Fso, R8n } from "./pluginLifecycle.js";
import { modsNoticeFor, dcs } from "./devModsNotices.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";

//@ chunk-e6aww6q8.js:4128174-4128232 placement
var hre = { tsconfig: "tsconfig.json", gitignore: ".gitignore" };
//@ chunk-e6aww6q8.js:4128232-4128254 placement
var CLAUDE_CODE = "claude-code";
//@ chunk-e6aww6q8.js:4128254-4128275 placement
var INDEX_D_TS = "index.d.ts";
//@ chunk-e6aww6q8.js:4128275-4128301 placement
var CLAUDE_CODE_MCP = "claude-code-mcp";
//@ chunk-e6aww6q8.js:4128301-4128329 placement
var CLAUDE_CODE_TOOLS = "claude-code-tools";
//@ chunk-e6aww6q8.js:4128374-4128402 placement
var iF = join_106(dirname_61(PLUGIN_MANIFEST_PATH), "types");
/**
 * 读取内置工具 schema 与会话 MCP 工具的输入类型（用于生成 .d.ts），读取失败返回空。
 */
//@ chunk-e6aww6q8.js:4146542-4147168 placement
async function readToolTypes(e) {
  try {
    let n = getAllBaseToolsFromRegistry(),
      r = n && builtinToolSchemasOf(n),
      s = lp();
    if (s === void 0) return { builtin: r, mcp: void 0, replacesMcp: e };
    let toolContext = s.toolContext(new AbortController()),
      y = getToolPermissionContext(toolContext);
    return {
      builtin: r,
      mcp: buildMcpToolInputTypes(
        await Promise.all(
          s
            .tools()
            .filter((S) => S.isMcp === !0)
            .map(async (S) => ({
              name: S.name,
              inputJSONSchema: S.inputJSONSchema,
              description: await S.description(
                {},
                {
                  isNonInteractiveSession: toolContext.options.isNonInteractiveSession,
                  toolPermissionContext: y,
                  tools: toolContext.options.tools,
                },
              ),
            })),
        ),
      ),
      replacesMcp: e,
    };
  } catch (error) {
    return (
      logFeatureSad("plugin_function_hooks_type_root", "tools_unread"),
      logForDebugging(`tool types: the tools were not read: ${errorMessage(error)}`),
      { builtin: void 0, mcp: void 0, replacesMcp: e }
    );
  }
}
//@ chunk-e6aww6q8.js:4147230-4147259 placement
var ZGt = "./types/index.d.ts";
//@ chunk-e6aww6q8.js:4147259-4147334 placement = isRealPathWithinTeamDir (1)
var isRealPathWithinTeamDir_2 = (realCandidate) =>
  realCandidate instanceof Error && (realCandidate.cause === "ENOENT" || realCandidate.cause === "ENOTDIR");
/**
 * 描述类型入口问题（错误原因与解析失败说明）。
 */
//@ chunk-e6aww6q8.js:4147334-4147630 placement
function describeTypeEntryProblem(e, n, r) {
  let s = r instanceof Error ? r.cause : void 0,
    h = typeof s === "string" && s !== "ENOENT",
    y = getErrnoCode(r) ?? (h ? s : void 0),
    S = uos(`${e}: ${n}`, errorMessage(r)),
    included = S.includes("resolves outside the plugin's folder");
  return y !== void 0
    ? `not readable (${y})`
    : included
      ? "resolves outside the plugin's folder"
      : S.replaceAll(n, ".");
}
//@ chunk-e6aww6q8.js:4147630-4147828 placement
function dependentPlugins(e, n) {
  let r = new Map(),
    s = [e];
  for (let h of s) {
    let filtered = n.filter((S) => S.name !== e.name && !r.has(S.name) && findReverseDependents(h, S));
    for (let S of filtered) if (!r.has(S.name)) (r.set(S.name, S), s.push(S));
  }
  return [...r.values()];
}
//@ chunk-e6aww6q8.js:4147828-4147982 placement
function isUsableTypeName(e) {
  let any = [CLAUDE_CODE, CLAUDE_CODE_TOOLS, CLAUDE_CODE_MCP, ...Object.values(hre)].some(
    (r) => r.toLowerCase() === e.toLowerCase(),
  );
  return e !== "" && e !== "." && e !== ".." && !any && !PLUGIN_NAME_FORBIDDEN_CHARS_RE.test(e);
}
/**
 * 收集类型根要引用的依赖插件类型入口（manifest.types 或默认 types/index.d.ts），检查在插件目录内。
 */
//@ chunk-e6aww6q8.js:4147982-4148363 placement
async function collectTypeEntries(e, n) {
  return (
    await Promise.all(
      dependentPlugins(e, n).map(async (r) => {
        let types = r.manifest.types;
        if (!((types !== void 0 || r.isBuiltin !== !0) && isUsableTypeName(r.name))) return [];
        let y = types ?? ZGt,
          S = resolve_52(r.path, y);
        return checkInsidePluginRoot(S, r.path, r.name).then(
          (w) => [{ name: r.name, real: w.real }],
          (w) => {
            if (!(types === void 0 && isRealPathWithinTeamDir_2(w)))
              logForDebugging(
                `type root of ${e.name}: no entry for ${r.name}: ${y}: ${describeTypeEntryProblem(r.name, S, w)}`,
              );
            return [];
          },
        );
      }),
    )
  ).flat();
}
/**
 * 类型根 tsconfig 的编译选项（es2023、bundler 解析、strict、jsx h/Fragment 等）。
 */
//@ chunk-e6aww6q8.js:4148363-4148568 placement
var TYPE_ROOT_COMPILER_OPTIONS = {
  target: "es2023",
  lib: ["es2023"],
  module: "esnext",
  moduleResolution: "bundler",
  strict: !0,
  noUncheckedIndexedAccess: !0,
  noEmit: !0,
  skipLibCheck: !0,
  jsx: "react",
  jsxFactory: "h",
  jsxFragmentFactory: "Fragment",
};
//@ chunk-e6aww6q8.js:4148640-4148869 placement
function typeRootIncludes(e) {
  let n = join_108(e.path, "hooks"),
    r = e.modulePath === void 0 ? void 0 : resolve_53(e.modulePath),
    s = r !== void 0 && !Ax(n, r);
  return [n, join_108(e.path, "types"), join_108(e.path, "tests"), ...(s ? [r] : [])].map((h) =>
    relative_44(join_108(e.path, iF), h).split(sep_63).join("/"),
  );
}
//@ chunk-e6aww6q8.js:4148898-4148978 placement
var Bcs = `${jsonStringify({ extends: [".", ...iF.split(sep_64), hre.tsconfig].join("/") }, null, 2)}
`;
//@ chunk-e6aww6q8.js:4148978-4149070 placement
var jcs = (
  e,
  n,
) => `${jsonStringify({ compilerOptions: { ...TYPE_ROOT_COMPILER_OPTIONS, typeRoots: ["."], types: e }, include: n }, null, 2)}
`;
//@ chunk-e6aww6q8.js:4149070-4149201 placement
async function makeRootTsconfig(e) {
  return (await e.standing("jsconfig.json").then(
    () => !0,
    () => !1,
  ))
    ? !1
    : e.make(hre.tsconfig, Bcs).then(
        () => !0,
        () => !1,
      );
}
//@ chunk-e6aww6q8.js:4149376-4149457 affinity
var toStatInfo = (e) => ({ isFile: e.isFile(), isFolder: e.isDirectory(), bytes: Number(e.size) });
//@ chunk-e6aww6q8.js:4149656-4150109 sole-consumer
var createFsOps = (e, n, r) => ({
  typeRoot: n,
  under: r,
  standing: async (s) => toStatInfo(await lstat_34(join_109(e, s))),
  text: (s) => releaseLock_2(join_109(e, s)),
  write: (s, h) => writeFileAtomic_2(join_109(e, s), h),
  make: (s, h) => writeNewFile(join_109(e, s), h),
  makeFolder: async (s) => {
    await mkdir_20(join_109(e, s));
  },
  removeItself: (s) => rm_22(join_109(e, s), { force: !0 }),
  removeFolder: (s) => rmdir_7(join_109(e, s)),
  removeAll: (s) => rm_22(join_109(e, s), { force: !0, recursive: !0 }),
  target: (s) => readlink_8(join_109(e, s)),
  link: (s, h) => symlink_3(s, join_109(e, h)),
  rename: async (s, h) => {
    await retryFsOp(join_109(e, s), join_109(e, h));
  },
  close: () => Promise.resolve(),
});
//@ chunk-e6aww6q8.js:4150208-4150251 placement = tryCreateExclusive (0.782)
function tryCreateExclusive_2(lock) {
  if (getErrnoCode(lock) !== "EEXIST") throw lock;
}
//@ chunk-e6aww6q8.js:4150251-4150433 placement
async function makeTypeRootFolder(e) {
  let n = await realpath_34(e),
    r = join_110(n, dirname_65(iF));
  if ((await mkdir_21(r).catch(tryCreateExclusive_2), (await realpath_34(r)) !== r)) return;
  let h = join_110(n, iF);
  return (await mkdir_21(h).catch(tryCreateExclusive_2), (await realpath_34(h)) === h ? h : void 0);
}
//@ chunk-e6aww6q8.js:4150462-4150494 placement
var joined_2 = iF.split(sep_65).join("/");
//@ chunk-e6aww6q8.js:4150494-4150642 placement
async function openPathTypeRoot(e, n) {
  let r = await realpath_33(e);
  logForDebugging(`type root under ${r} laid by path: ${n}`);
  let s = await makeTypeRootFolder(e);
  if (s === void 0) return;
  return createFsOps(r, s, joined_2);
}
//@ chunk-e6aww6q8.js:4150784-4150796 placement
var uWn = 438;
//@ chunk-e6aww6q8.js:4150796-4150829 placement
var Idt = () => uWn & ~process.umask();
//@ chunk-e6aww6q8.js:4150829-4150944 placement
function mapErrnoTo(e, n) {
  return (r) => {
    throw getErrnoCode(r) === e
      ? Object.assign(Error("the held folder refused", { cause: r }), { code: n })
      : r;
  };
}
//@ chunk-e6aww6q8.js:4150944-4151038 placement
async function Ddt(e, n, r) {
  await retryTransient(() => e.rename(n, r).catch(mapErrnoTo("WORKING_FILE_HELD", "EBUSY")));
}
/**
 * 基于目录锚点的文件操作集合：lstat、读、原子写、创建、建目录、删除、链接与重命名。
 */
//@ chunk-e6aww6q8.js:4151038-4151790 placement
var createAnchorFsOps = (e, n, r) => ({
  typeRoot: n,
  under: r,
  standing: async (s) => toStatInfo(await e.lstat(s)),
  text: async (s) => {
    let open = await e.open(s, constants_22.O_RDONLY | constants_22.O_NONBLOCK);
    try {
      return (await open.readFile()).toString("utf8");
    } finally {
      await open.close();
    }
  },
  write: async (s, h) => {
    let y = `${s}.${randomUUID_47()}`;
    (await e.create(y, Buffer.from(h), Idt()),
      await Ddt(e, y, s).catch(async (S) => {
        throw (await e.unlink(y).catch(() => {}), S);
      }));
  },
  make: (s, h) => e.create(s, Buffer.from(h), Idt()).catch(mapErrnoTo("EISDIR", "EEXIST")),
  makeFolder: (s) => e.mkdirp(s).catch(mapErrnoTo("WORKING_PARENT_NOT_DIRECTORY", "EEXIST")),
  removeItself: (s) =>
    e.unlink(s).catch((h) => {
      if (!isENOENT(h)) throw h;
    }),
  removeFolder: (s) => e.rmdir(s),
  removeAll: (s) => e.removeTree(s),
  target: (s) => e.readlink(s),
  link: (s, h) => e.symlink(s, h),
  rename: (s, h) => Ddt(e, s, h),
  close: () => e.close(),
});
/**
 * 打开基于目录锚点的类型根（不可用时返回原因）。
 */
//@ chunk-e6aww6q8.js:4151790-4152176 placement
async function openAnchoredTypeRoot(e) {
  let n = await realpath_35(e),
    { openTreeAnchor: openTreeAnchor } = await import("./chunk-ejkghqj9.js"),
    s = await openTreeAnchor(await _9s(), { gitRoot: e, realRoot: n });
  if ("unavailable" in s) return openPathTypeRoot(e, `this machine holds no folder open (${s.unavailable})`);
  return (await s.mkdirp(joined_2).then(
    () => !0,
    async (y) => {
      if ((await s.close(), getErrnoCode(y) === "WORKING_PARENT_NOT_DIRECTORY")) return !1;
      throw y;
    },
  ))
    ? createAnchorFsOps(s, join_111(n, iF), joined_2)
    : void 0;
}
//@ chunk-e6aww6q8.js:4152176-4152217 placement
var Sfs = (e) => isSyscallError(e) && e.syscall === "fchmod";
//@ chunk-e6aww6q8.js:4152217-4152232 placement
var ezt = 262144;
//@ chunk-e6aww6q8.js:4152286-4152536 placement
async function readTsconfigTypes(e) {
  let n = `${e.under}/${hre.tsconfig}`,
    r = await e.standing(n).then(
      (h) => h.isFile && h.bytes <= ezt,
      () => !1,
    ),
    safeParse = isApplicable().safeParse(
      r
        ? await e
            .text(n)
            .then((h) => jsonParse(h))
            .catch(() => {
              return;
            })
        : void 0,
    );
  return safeParse.success ? safeParse.data.compilerOptions.types : [];
}
/**
 * 不跟随链接地读取类型文件（限大小、必须是常规文件）。
 */
//@ chunk-e6aww6q8.js:4152644-4152905 placement
async function readTypeFileCapped(e) {
  let n = await open_21(e, constants_23.O_RDONLY | ws);
  try {
    let stats = await n.stat();
    if (!(stats.isFile() && stats.size <= ezt))
      throw Error("is over the size cap, or not a regular file, and was not read");
    return Wo(await n.readFile({ encoding: "utf8" }));
  } finally {
    await n.close();
  }
}
/**
 * 内容不同时才写文件（目标是目录则先删），返回是否写入。
 */
//@ chunk-e6aww6q8.js:4152905-4153157 placement
async function writeIfChanged(e, n, r) {
  let s = await e.standing(n).catch(() => {
    return;
  });
  if (s !== void 0 && !s.isFile) await e.removeAll(n);
  if (
    s !== void 0 &&
    s.isFile &&
    s.bytes === Buffer.byteLength(r) &&
    (await e.text(n).catch(() => {
      return;
    })) === r
  )
    return !1;
  return (await e.write(n, r), !0);
}
//@ chunk-e6aww6q8.js:4153157-4153417 placement
async function linkOrCopyTypeEntry(e, n, r) {
  if (
    (await e.target(n).catch(() => {
      return;
    })) === r
  )
    return "kept";
  let h = `${n}.${randomUUID_48()}`;
  if (
    await e
      .link(r, h)
      .then(() => e.rename(h, n))
      .then(
        () => !0,
        () => !1,
      )
  )
    return "linked";
  return (
    await e.removeItself(h),
    (await writeIfChanged(e, n, await readTypeFileCapped(r))) ? "copied" : "kept"
  );
}
//@ chunk-e6aww6q8.js:4153417-4153652 placement
async function ensureTypeFolder(e, n) {
  let r = `${e.under}/${n}`;
  if (
    await e.makeFolder(r).then(
      () => !0,
      (y) => {
        if (getErrnoCode(y) === "EEXIST") return !1;
        throw y;
      },
    )
  )
    return r;
  let { isFolder: isFolder } = await e.standing(r);
  if (!isFolder) (await e.removeItself(r), await e.makeFolder(r));
  return r;
}
/**
 * 删除类型根中已不需要的条目。
 */
//@ chunk-e6aww6q8.js:4153652-4153963 placement
async function removeStaleTypeEntries(e, n) {
  let filtered = (await readTsconfigTypes(e)).filter((s) => isUsableTypeName(s) && !n.includes(s));
  return (
    await Promise.all(
      filtered.map(async (s) => {
        let h = `${e.under}/${s}`;
        if (
          !(await e.standing(h).then(
            (S) => S.isFolder,
            () => !1,
          ))
        ) {
          await e.removeItself(h);
          return;
        }
        (await e.removeItself(`${h}/${INDEX_D_TS}`), await e.removeFolder(h).catch(() => {}));
      }),
    ),
    filtered
  );
}
//@ chunk-e6aww6q8.js:4153963-4154204 placement
async function makeIfAbsent(e, n, r) {
  let s = () =>
    e.make(n, r).then(
      () => !0,
      (S) => {
        if (getErrnoCode(S) === "EEXIST") return !1;
        throw S;
      },
    );
  if (await s()) return !0;
  let h = await e.standing(n).catch(() => {
    return;
  });
  if (!(h !== void 0 && !h.isFile)) return !1;
  return (await e.removeAll(n), s());
}
/**
 * 为 mod 开发写出类型根目录（index.d.ts 等），未变时保留原文件。
 */
//@ chunk-e6aww6q8.js:4154204-4155227 placement
async function writeTypeRoots(e, { plugin: plugin, loaded: loaded, running: { version: s, tools: h } }) {
  if (e === void 0) return;
  try {
    let { tsconfig: tsconfig, gitignore: gitignore } = hre,
      w = await writeIfChanged(
        e,
        `${e.under}/${gitignore}`,
        `*
`,
      ),
      L = await collectTypeEntries(plugin, loaded),
      G = [CLAUDE_CODE, CLAUDE_CODE_TOOLS, CLAUDE_CODE_MCP, ...L.map((Je) => Je.name)],
      q = await removeStaleTypeEntries(e, G),
      Z = async (Je) => `${await ensureTypeFolder(e, Je)}/${INDEX_D_TS}`,
      Se = await import("./chunk-72n15jmc.js"),
      ke = await writeIfChanged(e, await Z(CLAUDE_CODE), Se.coreDeclarationsOf(s)),
      we = async (Je, nt, pt) => (pt ? writeIfChanged : makeIfAbsent)(e, await Z(Je), nt),
      Ee = await we(CLAUDE_CODE_TOOLS, BUILTIN_TOOL_INPUTS_HEADER(h.builtin ?? []), h.builtin !== void 0),
      Ae = await we(
        CLAUDE_CODE_MCP,
        MCP_TOOL_INPUTS_HEADER(h.mcp ?? []),
        h.replacesMcp && (h.mcp ?? []).length > 0,
      ),
      results = await Promise.all(
        L.map(async (Je) => (await linkOrCopyTypeEntry(e, await Z(Je.name), Je.real)) !== "kept"),
      ),
      Me = await writeIfChanged(e, `${e.under}/${tsconfig}`, jcs(G, typeRootIncludes(plugin))),
      We = await makeRootTsconfig(e),
      joined = iF.split(sep_62).join("/"),
      lt = (Je) => `${joined}/${Je}/${INDEX_D_TS}`;
    return {
      typeRoot: e.typeRoot,
      entries: G,
      written: [
        ...q.map((Je) => `${joined}/${Je}`),
        ...(ke ? [lt(CLAUDE_CODE)] : []),
        ...(Ee ? [lt(CLAUDE_CODE_TOOLS)] : []),
        ...(Ae ? [lt(CLAUDE_CODE_MCP)] : []),
        ...L.flatMap((Je, nt) => (results[nt] === !0 ? [lt(Je.name)] : [])),
        ...(Me ? [`${joined}/${tsconfig}`] : []),
        ...(w ? [`${joined}/${gitignore}`] : []),
        ...(We ? [tsconfig] : []),
      ],
    };
  } finally {
    await e.close();
  }
}
//@ chunk-e6aww6q8.js:4155227-4155448 placement
async function layTypeRoots(e, n, r) {
  let s = { plugin: e, loaded: n, running: r };
  return writeTypeRoots(await openAnchoredTypeRoot(e.path), s).catch(async (h) => {
    if (!Sfs(h)) throw h;
    return writeTypeRoots(
      await openPathTypeRoot(e.path, "this volume gives a file made in a held folder no mode"),
      s,
    );
  });
}
/**
 * 为一个开发中的插件写出类型根，记录写了哪些文件或失败原因。
 */
//@ chunk-e6aww6q8.js:4155448-4156447 placement
async function writePluginTypeRoot(e, n, r) {
  try {
    let s = await layTypeRoots(e, n, {
      version: {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      tools: r,
    });
    if (s === void 0) {
      logForDebugging(`type root of ${e.name} not laid: its path leads outside the mod's folder`);
      return;
    }
    if (s.written.length > 0) logFeatureOk("plugin_function_hooks_type_root");
    logForDebugging(
      `type root of ${e.name} at ${s.typeRoot}: entries ${s.entries.join(", ")}; wrote ` +
        (s.written.join(", ") || "nothing"),
    );
  } catch (error) {
    let h = getErrnoCode(error),
      y = errorMessage(error),
      S = h === void 0 || y.includes(h);
    (logFeatureBad("plugin_function_hooks_type_root", "lay_failed"),
      logForDebugging(`type root of ${e.name} not laid: ` + (S ? y : `${h}: ${y}`)));
  }
}
//@ chunk-e6aww6q8.js:4156447-4156522 placement
function Cre(e) {
  let n = filterWatchedPluginDirs(SYr());
  return e.filter((r) => folderWatchTargets([r], n).length > 0);
}
//@ chunk-e6aww6q8.js:4156522-4156714 placement
function refreshTypeRootAfterReload(e) {
  let n = (r) => r.name === e;
  return Wjn(async () => {
    if (!Cre(kre.get() ?? []).some(n)) return;
    let s = await readToolTypes(!0),
      h = kre.get() ?? [];
    await Promise.all(
      Cre(h)
        .filter(n)
        .map((y) => writePluginTypeRoot(y, h, s)),
    );
  });
}
/**
 * 创建并注册 plugin-dir 监视器（重载后刷新类型根），注册清理。
 */
//@ chunk-e6aww6q8.js:4156714-4157047 placement
function startPluginDirWatcher() {
  let e = runPluginDirWatch({
    watchDir: startPluginWatch,
    filesOf: loadedFilesOf,
    stampOf: readManifestStamp,
    loadedStampOf: bundledFileStamp,
    rereadManifest: retargetPluginModule,
    admit: passesConfigChangeGate,
    reload: (n) => reloadHooksModule(n).finally(() => refreshTypeRootAfterReload(n)),
    tell: uiLog,
    debounceMs: Nso,
    burst: Lso,
    storm: Fso,
    clock: WATCH_CLOCK,
    turn: TURN_STATE_PROBE,
    watchRoot: watchPluginCollection,
    listChildren: listDirChildren,
    reloadPlugins: sgn,
    plainLine: modsNoticeFor,
    plainWording: dcs,
  });
  return (R8n.set(e), registerCleanup(() => e.dispose()), e);
}

export {
  ZGt,
  describeTypeEntryProblem,
  isRealPathWithinTeamDir_2,
  ezt,
  readTypeFileCapped,
  iF,
  startPluginDirWatcher,
  Cre,
  readToolTypes,
  writePluginTypeRoot,
};
