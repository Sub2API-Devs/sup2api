/**
 * utils/teleport/dirSync.ts
 *
 * 2.1.316 新增：目录同步
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (56)
 * attribution: placement 56
 */
import {
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
} from "path";
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  readdir as readdir_11,
  readdir as readdir_12,
  readdir as readdir_13,
  readdir as readdir_14,
  readdir as readdir_15,
  readdir as readdir_16,
  readdir as readdir_17,
  readdir as readdir_18,
  readdir as readdir_19,
  readdir as readdir_20,
  readdir as readdir_21,
  readdir as readdir_22,
  readdir as readdir_23,
  readdir as readdir_24,
  readdir as readdir_25,
  readdir as readdir_26,
  readdir as readdir_27,
  readdir as readdir_28,
  readdir as readdir_29,
  readdir as readdir_30,
  readdir as readdir_31,
  readdir as readdir_32,
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
} from "fs/promises";
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
  homedir as homedir_8,
  homedir as homedir_9,
  homedir as homedir_10,
  homedir as homedir_11,
  homedir as homedir_12,
} from "os";
import {
  readdirSync,
  readdirSync as readdirSync_2,
  readdirSync as readdirSync_3,
  readdirSync as readdirSync_4,
  readdirSync as readdirSync_5,
  realpathSync,
  realpathSync as realpathSync_2,
  realpathSync as realpathSync_3,
  readlinkSync,
  readlinkSync as readlinkSync_2,
  readlinkSync as readlinkSync_3,
  lstatSync,
  lstatSync as lstatSync_2,
  lstatSync as lstatSync_3,
  writeSync,
  writeSync as writeSync_2,
  writeSync as writeSync_3,
} from "fs";
import { sanitizeErrnoForTelemetry, isPathAbsent, getErrnoCode, errorMessage, toError } from "../errors.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { freeze as freeze_23, lb } from "../git/gitSafeEnv.js";
import { uniq } from "../collections.js";
import { pMap } from "../../../vendor/p-map/index.js";
import { xZo } from "./repositoriesTrusted.js";
import { Luo } from "../fsJunctions.js";
import { Muo, toUncLongPath } from "../windowsUncPaths.js";
import {
  isCaseInsensitivePlatform as isCaseInsensitivePlatform_2,
  foldPathCase,
} from "../pathCaseFolding.js";
import { foldName } from "../permissions/protectedDirNames.js";
import { dti, nfcLowerNfc, ati, lti } from "./remoteTaskLabels.js";
import { rc } from "../pathClassification.js";
import { Ya, isNetworkMountRoot, tP } from "../networkPaths.js";
import { getPathNormalizationVariants, _H } from "../permissions/sensitivePaths.js";
import { pSn } from "../windowsPathNames.js";
import { env } from "../env.js";
import { HostScoped } from "../hostScoped.js";
import {
  getRootSession,
  getFlagSettingsPath,
  isDiskless,
  getFlagAgentsFilePaths,
  getFlagMcpConfigFilePaths,
  getIsInteractive,
} from "../../bootstrap/state.js";
import { permissionRuleValueFromString } from "../permissions/permissionRuleParser.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { hqt } from "../../../vendor/picomatch/index.js";
import { oD, uy, Ad } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import {
  denyEntryCovers,
  posixCovers,
  matchesGuardedGlob,
  matchesNameReading,
  nameReadingsOfGlobSpelling,
} from "../sandbox/sandbox-adapter.js";
import { getPlatform } from "../platform.js";
import { getClaudeConfigDirs, claudeStatePathPatterns } from "../permissions/claudeStatePaths.js";
import { managedFileSettingsDirs, isManagedSettingsDropInName } from "../settings/managedFileSettings.js";
import { getManagedFilePath } from "../settings/managedPath.js";
import { logError } from "../log.js";
import { logDirSyncHostConfig } from "./dirSyncRules.js";
import { logForDebugging } from "../debug.js";
import { createSignal } from "../signal.js";
import { toInfraSessionId } from "../../bridge/sessionIdCompat.js";
import { o, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { CLEANUP_TIMEOUT_MS, registerCleanup } from "../cleanupRegistry.js";
import { stripControlChars as stripControlChars_3 } from "../settings/writeQueues.js";

//@ chunk-e6aww6q8.js:1882524-1882609 placement
function mnn(e, n) {
  return Buffer.concat([Buffer.from(e + sep_43), Buffer.from(n, "latin1")]);
}
/**
 * 检查同步目标下的子目录是否已存在内容、为空或无权限。
 */
//@ chunk-e6aww6q8.js:1882609-1883138 placement
async function PZo(e, n) {
  let r = (L) => ({ failedWith: sanitizeErrnoForTelemetry(L) }),
    s = await readdir_23(mnn(e, n)).then(
      (L) => (L.length > 0 ? "stands" : "clear"),
      (L) =>
        isPathAbsent(L) ? "clear" : ["EACCES", "EPERM"].includes(getErrnoCode(L) ?? "") ? "denied" : r(L),
    );
  if (s === "clear") return "clear";
  let parts = n.split("/"),
    y = (L) => lstat_25(mnn(e, parts.slice(0, L).join("/"))).catch(r),
    [S, w] = await Promise.all([y(parts.length), Promise.all(parts.slice(1).map((L, G) => y(G + 1)))]);
  if ([S, ...w].some((L) => !("failedWith" in L) && L.isSymbolicLink())) return "clear";
  if (s !== "denied") return s;
  return "failedWith" in S ? S : S.isDirectory() ? "stands" : "clear";
}
/**
 * 列出工作目录中被跟踪且有改动的文件（git 命令），没有 .git 时返回失败。
 */
//@ chunk-e6aww6q8.js:1883138-1884157 placement
async function listChangedTrackedFiles(repoRoot, n) {
  if (!(await lstat_25(join_70(repoRoot, ".git")).catch(() => null)))
    return { kind: "failed", cause: "no_dot_git_seen_at_cwd" };
  let r = (Z) =>
      execFileNoThrowWithCwd(gitExe(), [...freeze_23, ...Z], {
        cwd: repoRoot,
        preserveOutputOnError: !1,
        env: n,
        encoding: "latin1",
        maxBuffer: 67108864,
      }),
    [s, h] = await Promise.all([
      r(["diff-index", "-z", "--diff-filter=DT", lb, "HEAD", "--"]),
      r(["ls-files", "-z", "-v", "-s"]),
    ]);
  if (s.code !== 0) return { kind: "failed", cause: "changed_listing" };
  let parts = s.stdout.split("\x00"),
    filtered = parts.filter((Z, Se) => Se % 2 === 1 && !parts[Se - 1]?.startsWith(":160000")),
    w =
      h.code === 0
        ? Array.from(
            h.stdout.matchAll(/(?:^|\0)h (?!160000)\d{6} [0-9a-f]+ \d\t([^\0]+)/g),
            (Z) => Z[1] ?? "",
          )
        : [],
    L = uniq([...filtered, ...w]);
  if (L.some((Z) => Z.startsWith("/") || Z.split(sep_43 === "\\" ? /[\\/]/ : "/").includes("..")))
    return { kind: "failed", cause: "tracked_path_leaves_checkout" };
  let G = await pMap(L, (Z) => PZo(repoRoot, Z), { concurrency: xZo }),
    found = G.find((Z) => typeof Z === "object");
  return found !== void 0
    ? { kind: "failed", cause: "path_read", errno: found.failedWith }
    : {
        kind: "looked",
        replaced: L.filter((Z, Se) => G[Se] === "stands"),
        isAssumeUnchangedListed: h.code === 0,
      };
}
/**
 * 目录同步时排除的目录名（代理记忆、缓存、备份等）。
 */
//@ chunk-e6aww6q8.js:1884510-1885139 placement
var DIR_SYNC_EXCLUDED_DIRS = new Set([
  "agent-memory",
  "agent-memory-local",
  "agent-memory-project",
  "api-dumps",
  "backups",
  "cache",
  "chrome",
  "cowork_plugins",
  "daemon",
  "debug",
  "downloads",
  "dump-prompts",
  "feedback",
  "feedback-bundles",
  "file-history",
  "file-transfers",
  "ide",
  "image-cache",
  "jobs",
  "local",
  "local-settings",
  "logs",
  "mcp-discovery-cache",
  "mcp-skill-archives",
  "paste-cache",
  "plans",
  "plugins",
  "project-settings",
  "projects",
  "remote",
  "remote-control",
  "scratch",
  "seed-admin",
  "session-env",
  "sessions",
  "shares",
  "shell-snapshots",
  "startup-perf",
  "state",
  "statsig",
  "storage-v2",
  "systemd",
  "tasks",
  "teams",
  "telemetry",
  "todos",
  "traces",
  "uploads",
  "usage-data",
]);
//@ chunk-e6aww6q8.js:1885139-1885168 placement
var NZo = 20000,
  $Zo = 64,
  HZo = 256;
//@ chunk-e6aww6q8.js:1885168-1885388 placement
var UNSUPPORTED_REALPATH_ERRNOS = new Set(["EINVAL", "UNKNOWN", "ENOTSUP"]),
  knn = new Set(["plugins", "cowork_plugins", "state"]),
  SKIPPED_DEPENDENCY_DIRS = new Set(["node_modules", "venv", ".venv", "__pycache__"]),
  wB = { covers: () => !1, ground: null, targetCount: 0, entriesExamined: 0 };
/**
 * 判断目录同步的根目录类型（网络位置、家目录内、链接根等）。
 */
//@ chunk-e6aww6q8.js:1885388-1890193 placement
function classifyDirSyncRoot(
  e,
  {
    configHomes: configHomes,
    configFiles: configFiles,
    configDirs: configDirs = [],
    peekedDirs: peekedDirs = [],
    unwalkedDirs: unwalkedDirs = [],
    vouchedDirs: vouchedDirs = [],
    home: home = homedir_7(),
    maxEntries: maxEntries = NZo,
    probes: probes,
  },
) {
  let q = probes?.settled ?? Luo(Muo),
    Z = probes?.real ?? createRealpathCache(q),
    mapped = e.map((ko) => ({ root: ko, resolved: Z(ko) })),
    found = mapped.find(({ resolved: resolved }) => resolved === "unexamined");
  if (found !== void 0) return { ...wB, ground: { kind: "unexamined", at: found.root, why: "unreadable" } };
  let we = uniq([
      ...e,
      ...mapped.flatMap(({ resolved: resolved }) =>
        resolved === null || resolved === "unexamined" ? [] : [resolved],
      ),
    ]),
    any = we.some((ko) => isCaseInsensitivePlatform_2(ko)),
    Ae = (ko, un) => relativeWithCaseFold(ko, un, any),
    Ie = (ko, un) => !lZ(Ae(ko, un)),
    Me = (ko, un) => Ae(ko, un) === "",
    We = new Set(),
    ze = () => {},
    lt = uniq(configHomes.map((ko) => resolve_31(ko))),
    Je = lt[0];
  if (Je !== void 0 && we.some((ko) => Me(Je, ko))) return wB;
  let nt = (ko) => ({ ...wB, ground: ko }),
    pt = zZo(home, Z),
    Et = uniq(peekedDirs.map((ko) => resolve_31(ko))),
    yt = [
      ...pt,
      ...we,
      ...lt,
      ...vouchedDirs
        .map((ko) => resolve_31(ko))
        .filter((ko) => !we.some((un) => Ie(un, ko)))
        .flatMap((ko) => {
          let un = sZ(ko, Z, (ao, $o) => !$o.some((yo) => we.some((Ho) => Ie(Ho, yo))));
          return un !== null && typeof un === "object" ? [ko, un.spelling] : [ko];
        })
        .filter(Rnn),
    ],
    gt = (ko) => yt.some((un) => Ie(un, ko)),
    At = (ko) => gt(ko) || yt.some((un) => Ie(ko, un)),
    It = [],
    Yt = [];
  for (let ko of lt) {
    let un = sZ(ko, Z, () => !0, ze);
    if (un === "unexamined" || un === "network") return nt({ kind: "unexamined", at: ko, why: "unreadable" });
    if (un !== null) ze(un.passed);
    if (un !== null && !un.exists) {
      Yt.push({ path: ko, spelling: un.spelling });
      continue;
    }
    let ao = un === null ? null : un.spelling;
    if (we.some(($o) => Ie(ko, $o))) return nt({ kind: "inside_home", home: ko });
    if (ao !== null && !It.some(($o) => $o.real === ao)) {
      if (we.some(($o) => Me(ao, $o))) return nt({ kind: "root_linked", link: ko });
      if (we.some(($o) => Ie(ao, $o))) return nt({ kind: "inside_home", home: ko });
      (It.push({ path: ko, real: ao }), yt.push(ao));
    }
  }
  let qt = new Set(),
    Zt = null,
    rn = maxEntries,
    pn = new Set(),
    no = !1,
    hn = (ko) => Et.length === 0 && pt.some((un) => Ie(ko, un)),
    ho = (ko, un) => {
      for (let ao of we) {
        let $o = Ae(ao, un);
        if ($o === "") Zt ??= { kind: "root_linked", link: ko };
        else if (!lZ($o)) qt.add(foldPathCase($o.split(sep_45).join("/")));
        else if (Ie(un, ao) && !hn(un)) Zt ??= { kind: "root_linked", link: ko };
      }
    },
    yn = (ko, un) => {
      let ao = foldName(ko);
      return (
        !ko.startsWith(".") && !SKIPPED_DEPENDENCY_DIRS.has(ao) && !(un && DIR_SYNC_EXCLUDED_DIRS.has(ao))
      );
    },
    Kn = (ko) =>
      It.some(({ real: real }) => {
        let ao = Ae(real, ko);
        return !lZ(ao) && ao !== "" && DIR_SYNC_EXCLUDED_DIRS.has(foldName(ao.split(sep_45)[0] ?? ""));
      }),
    Xn = (ko, un, ao, $o = !1) => {
      let yo = sZ(ko, Z, At, ze);
      if (yo === "unexamined") {
        Zt ??= { kind: "unexamined", at: ko, why: "unreadable" };
        return;
      }
      if (yo === null) return;
      let Ho = un || $o || no;
      if (yo === "network") {
        if (Ho) Zt ??= { kind: "unexamined", at: ko, why: "on_share" };
        return;
      }
      if (
        (ze(yo.passed),
        ho(ko, yo.spelling),
        Ho && Zt === null && dZ(yo.spelling) && !gt(yo.spelling) && !hn(yo.spelling))
      ) {
        Zt = { kind: "unexamined", at: ko, why: "on_share" };
        return;
      }
      let rr =
        yo.exists &&
        Zt === null &&
        (!dZ(yo.spelling) || gt(yo.spelling)) &&
        !hn(yo.spelling) &&
        !It.some(({ real: real }) => Me(real, yo.spelling)) &&
        !Kn(yo.spelling);
      if (un && rr) fo(yo.spelling, !1, ao + 1);
      else if ($o && rr) To(yo.spelling, ao + 1);
    },
    fo = (ko, un, ao) => {
      if (pn.has(ko) || (!un && It.some(({ real: real }) => Me(real, ko)))) return;
      if (ao > HZo) {
        Zt ??= { kind: "unexamined", at: ko, why: "too_many" };
        return;
      }
      pn.add(ko);
      let $o;
      try {
        $o = q(() => readdirSync_4(ko, { withFileTypes: !0 }));
      } catch (error) {
        if (!(getErrnoCode(error) === "ENOTDIR" || (!un && isNotFoundErrno(error))))
          Zt ??= { kind: "unexamined", at: ko, why: "unreadable" };
        return;
      }
      if (((rn -= $o.length + 1), rn < 0)) Zt ??= { kind: "unexamined", at: ko, why: "too_many" };
      for (let yo of $o) {
        if (Zt !== null) return;
        let Ho = join_72(ko, yo.name),
          rr = classifyDirEntryForCompletion(yo, Ho, Z, q);
        if (rr === "unexamined") {
          Zt ??= { kind: "unexamined", at: Ho, why: "unreadable" };
          return;
        }
        if (rr === "link") Xn(Ho, yn(yo.name, un), ao, un && knn.has(foldName(yo.name)));
        else if (rr === "directory") {
          if (yn(yo.name, un)) fo(Ho, !1, ao + 1);
          else if (un && knn.has(foldName(yo.name))) To(Ho, ao + 1);
        }
      }
    },
    To = (ko, un) => {
      let ao;
      try {
        ao = q(() => readdirSync_4(ko, { withFileTypes: !0 }));
      } catch (error) {
        if (!isNotFoundErrno(error)) Zt ??= { kind: "unexamined", at: ko, why: "unreadable" };
        return;
      }
      if (((rn -= ao.length + 1), rn < 0)) Zt ??= { kind: "unexamined", at: ko, why: "too_many" };
      for (let $o of ao) {
        if (Zt !== null) return;
        let yo = join_72(ko, $o.name),
          Ho = classifyDirEntryForCompletion($o, yo, Z, q);
        if (Ho === "unexamined") {
          Zt ??= { kind: "unexamined", at: yo, why: "unreadable" };
          return;
        }
        if (Ho === "link") Xn(yo, !1, un);
      }
    };
  for (let { path: path, spelling: spelling } of Yt) ho(path, spelling);
  let flattened = configDirs.flatMap(({ path: path, accepts: accepts }) => {
      let ao = resolve_31(path),
        $o = sZ(ao, Z, At, ze);
      if ($o === "unexamined") return ((Zt ??= { kind: "unexamined", at: ao, why: "unreadable" }), []);
      if ($o !== null && $o !== "network") (ze($o.passed), ho(ao, $o.spelling));
      try {
        return q(() => readdirSync_4(ao))
          .filter(accepts)
          .map((yo) => join_72(ao, yo));
      } catch (error) {
        if (!aZ(error)) Zt ??= { kind: "unexamined", at: ao, why: "unreadable" };
        return [];
      }
    }),
    mapped_2 = unwalkedDirs.map((ko) => resolve_31(ko));
  for (let ko of uniq([...configFiles.map((un) => resolve_31(un)), ...mapped_2, ...flattened])) {
    let un = sZ(ko, Z, At, ze);
    if (un === "unexamined") return nt({ kind: "unexamined", at: ko, why: "unreadable" });
    if (un !== null && un !== "network") (ze(un.passed), ho(ko, un.spelling));
  }
  for (let { path: path, real: real } of It) if ((ho(path, real), Zt === null)) fo(real, !0, 0);
  no = !0;
  for (let ko of Et) if (Zt === null) Xn(ko, !1, 0, !0);
  let co = maxEntries - Math.max(rn, 0);
  if (Zt !== null) return { ...nt(Zt), entriesExamined: co };
  let So = (ko) => qt.has(ko) || dti(ko).some((un) => qt.has(un));
  return {
    covers: (ko) => qt.size > 0 && So(foldPathCase(ko)),
    ground: null,
    targetCount: qt.size,
    entriesExamined: co,
    ...{},
  };
}
//@ chunk-e6aww6q8.js:1890193-1890347 placement
function sZ(e, n = createRealpathCache(Luo(Muo)), r = () => !1, s) {
  let h = GZo(e, n, r, s);
  return h !== null && typeof h === "object"
    ? { spelling: h.spelling, exists: h.exists, passed: h.passed }
    : h;
}
//@ chunk-e6aww6q8.js:1890347-1890397 placement
function GZo(e, n, r, s) {
  return classifySyncRoot(e, n, r, 0, [], [], s);
}
/**
 * 沿根目录逐级检查目录同步根的类型：网络位置、家目录及其隐藏目录、链接根等，用于拒绝不安全的同步根。
 */
//@ chunk-e6aww6q8.js:1890397-1891437 placement
function classifySyncRoot(targetPath, fs, r, depth = 0, visited = [], y = [], S) {
  let w = parse_8(targetPath).root || sep_45,
    L = [...y],
    G = (ke) => ke,
    q = (ke, we = visited) => dZ(ke) && !r(ke, we);
  if (q(targetPath) || (dZ(w) && !r(targetPath, visited))) return G("network");
  let filtered = targetPath
      .slice(w.length)
      .split(sep_45 === "/" ? "/" : /[\\/]+/)
      .filter((ke) => ke !== "" && ke !== "."),
    current = w;
  for (let [ke, we] of filtered.entries()) {
    if (we === "..") {
      current = dirname_42(current);
      continue;
    }
    let next = join_72(current, we);
    if (q(next)) return G("network");
    let linkText = fs.linkText(next);
    if (linkText === "unexamined") return G("unexamined");
    let Ie = linkText;
    if (Ie === "unexamined") return G("unexamined");
    if (Ie !== null) {
      if (depth >= $Zo) return G(null);
      if (q(Ie, [...visited, current])) return G("network");
      let We = !isAbsolute_36(Ie)
        ? `${current}${sep_45}${Ie}`
        : /^[\\/](?![\\/])/.test(Ie)
          ? `${parse_8(current).root}${Ie.slice(1)}`
          : Ie;
      return classifySyncRoot(
        [We, ...filtered.slice(ke + 1)].join(sep_45),
        fs,
        r,
        depth + 1,
        [...visited, current],
        L,
        S,
      );
    }
    let Me = fs(next);
    if (Me === "unexamined") return G("unexamined");
    if (Me !== null && q(Me)) return G("network");
    if (Me === null) {
      let sliced = filtered.slice(ke + 1);
      if (sliced.includes("..")) {
        let ze = [];
        return classifySyncRoot(resolve_31(next, ...sliced), fs, r, depth + 1, visited, [...L, ...ze], S);
      }
      return { spelling: join_72(next, ...sliced), exists: !1, stoodIn: visited, passed: L };
    }
    current = Me;
  }
  return { spelling: current, exists: !0, stoodIn: visited, passed: L };
}
/**
 * 创建带缓存的 realpath 与 lstat 查询器，避免重复访问文件系统。
 */
//@ chunk-e6aww6q8.js:1891437-1891980 placement
function createRealpathCache(e) {
  let n = new Map(),
    r = new Map(),
    s = (S, w, L) => {
      let G = S.get(w);
      if (G !== void 0) return G;
      let q = L();
      return (S.set(w, q), q);
    };
  return Object.assign(
    (S) =>
      s(n, S, () => {
        if (rc(S)) return "unexamined";
        try {
          return toUncLongPath(e(() => realpathSync_2.native(S)));
        } catch (error) {
          return aZ(error) ? null : "unexamined";
        }
      }),
    {
      linkText: (S) =>
        s(r, S, () => {
          try {
            let w = e(() => readlinkSync_2(S));
            return w.includes("\uFFFD") ? "unexamined" : w;
          } catch (error) {
            let L = getErrnoCode(error);
            if (L === "EINVAL" || aZ(error)) return null;
            if (UNSUPPORTED_REALPATH_ERRNOS.has(L))
              try {
                return e(() => lstatSync_3(S)).isFile() ? null : "unexamined";
              } catch (error) {
                return aZ(error) ? null : "unexamined";
              }
            return "unexamined";
          }
        }),
    },
  );
}
//@ chunk-e6aww6q8.js:1891980-1892302 placement
function classifyDirEntryForCompletion(e, n, r, s) {
  if (e.isSymbolicLink()) return "link";
  if (e.isDirectory()) return scanDirectory_3(n, r);
  if (e.isFile() || e.isFIFO() || e.isSocket() || e.isBlockDevice() || e.isCharacterDevice()) return "other";
  try {
    let h = s(() => lstatSync_3(n));
    return h.isSymbolicLink() ? "link" : h.isDirectory() ? scanDirectory_3(n, r) : "other";
  } catch (error) {
    return aZ(error) ? "other" : "unexamined";
  }
}
//@ chunk-e6aww6q8.js:1892302-1892338 placement = scanDirectory (0.766)
function scanDirectory_3(e, n) {
  return "directory";
}
//@ chunk-e6aww6q8.js:1892338-1892401 placement
function zZo(e, n = createRealpathCache(Luo(Muo))) {
  return uniq([resolve_31(e), qZo(n, resolve_31(e))]);
}
//@ chunk-e6aww6q8.js:1892401-1892468 placement
function qZo(e, n) {
  let r = e(n);
  return r === null || r === "unexamined" ? n : r;
}
//@ chunk-e6aww6q8.js:1892468-1892522 placement
function Rnn(e) {
  return dZ(e) || (dirname_42(e) !== e && Rnn(dirname_42(e)));
}
//@ chunk-e6aww6q8.js:1892522-1892564 placement
function dZ(e) {
  return Ya(e) || isNetworkMountRoot(e) || tP(e);
}
//@ chunk-e6aww6q8.js:1892564-1892626 placement = isRealPathWithinTeamDir (1)
function isNotFoundErrno(realCandidate) {
  let code = getErrnoCode(realCandidate);
  return code === "ENOENT" || code === "ENOTDIR";
}
//@ chunk-e6aww6q8.js:1892626-1892671 placement
function aZ(e) {
  return isNotFoundErrno(e) || getErrnoCode(e) === "ELOOP";
}
//@ chunk-e6aww6q8.js:1892671-1892771 placement
function relativeWithCaseFold(e, n, r) {
  let s = relative_30(e, n);
  if (!r || !lZ(s)) return s;
  let h = relative_30(nfcLowerNfc(e), nfcLowerNfc(n));
  return lZ(h) ? s : h;
}
//@ chunk-e6aww6q8.js:1892771-1892835 placement
function lZ(e) {
  return e === ".." || e.startsWith(`..${sep_45}`) || isAbsolute_36(e);
}
//@ chunk-e6aww6q8.js:1892835-1892860 placement
var VZo = /^[\x00-\x7f]*$/;
//@ chunk-e6aww6q8.js:1892860-1893022 placement
function isSensitiveSyncedPath(
  e,
  {
    tracked: tracked,
    readings: readings = getPathNormalizationVariants(e),
    namesCredential: namesCredential = _H,
  },
) {
  if (readings === null) return !0;
  return (
    (VZo.test(e) ? [e] : [e, foldPathCase(e)]).some(namesCredential) ||
    ati(e) ||
    (tracked && pSn(e)) ||
    readings.some(pSn)
  );
}
//@ chunk-e6aww6q8.js:1893022-1893218 placement
var EMPTY_TYPED_TOOL_FLAGS = { disallowedTools: [], tools: [] },
  EMPTY_LAUNCH_PERMISSIONS = {
    allowRules: [],
    denyRules: [],
    sessionDenyRules: [],
    toolsNarrowingDenyRules: [],
    additionalWorkingDirectories: new Map(),
    launchedInAutoMode: !1,
    typedToolFlags: EMPTY_TYPED_TOOL_FLAGS,
  };
/**
 * 启动权限快照：发布并保存会话启动时的权限规则与工具开关。
 */
//@ chunk-e6aww6q8.js:1893218-1893872 placement
class LaunchPermissionsSnapshot {
  snapshot = EMPTY_LAUNCH_PERMISSIONS;
  get() {
    return this.snapshot;
  }
  publish(e, n, r) {
    let s = env.CLAUDE_CODE_SESSION_KIND === "bg",
      h = new Set(n),
      filtered = [...e.additionalWorkingDirectories].filter(
        ([S, w]) => !(w.source === "session" && h.has(S)),
      );
    this.snapshot = {
      allowRules: s ? [] : [...(e.alwaysAllowRules.cliArg ?? [])],
      denyRules: [...(e.alwaysDenyRules.cliArg ?? [])],
      sessionDenyRules: [...(e.alwaysDenyRules.session ?? [])],
      toolsNarrowingDenyRules: [...(e.alwaysDenyRules.toolsNarrowing ?? [])],
      additionalWorkingDirectories: new Map(
        s ? filtered.filter(([, S]) => S.source === "session") : filtered,
      ),
      launchedInAutoMode: e.mode === "auto",
      typedToolFlags: { disallowedTools: [...r.disallowedTools], tools: [...r.tools] },
    };
  }
  reset() {
    this.snapshot = EMPTY_LAUNCH_PERMISSIONS;
  }
}
//@ chunk-e6aww6q8.js:1893872-1893899 placement
var XZo = new HostScoped(() => new LaunchPermissionsSnapshot());
//@ chunk-e6aww6q8.js:1893899-1893938 placement
function Pnn() {
  return XZo.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:1893938-1893972 placement
function OWt() {
  return Pnn().get();
}
//@ chunk-e6aww6q8.js:1893972-1894013 placement
function q5s(e, n, r) {
  Pnn().publish(e, n, r);
}
//@ chunk-e6aww6q8.js:1894013-1894170 placement
function launchDenyRules(e) {
  return [
    ["cliArg", e.denyRules],
    ["session", e.sessionDenyRules],
  ].flatMap(([r, s]) =>
    s.map((h) => ({ source: r, ruleBehavior: "deny", ruleValue: permissionRuleValueFromString(h) })),
  );
}
//@ chunk-e6aww6q8.js:1894170-1894190 placement
var Inn = Re(hqt(), 1);
//@ chunk-e6aww6q8.js:1894220-1894266 placement
var tXe = { denies: [], credentials: [], reopens: [] };
//@ chunk-e6aww6q8.js:1894266-1894390 placement
function normalizeRulePathSlashes(e) {
  let n = oD(e);
  return (/^(?:[A-Za-z]:)?\\|^[A-Za-z]:\//.test(n) ? n.replace(/\\/g, "/") : n).replace(/\/+$/, "") || "/";
}
//@ chunk-e6aww6q8.js:1894390-1894424 placement
function ZZo(e) {
  return uy(normalizeRulePathSlashes(e));
}
//@ chunk-e6aww6q8.js:1894424-1894514 placement
function ter(e) {
  let n = e.split(/[*?[\]]/)[0] ?? "";
  return n.slice(0, n.lastIndexOf("/")) || "/";
}
//@ chunk-e6aww6q8.js:1894514-1894607 placement
function ner(e) {
  if (!Ad(e)) return e;
  try {
    return (Inn.default(e, { dot: !0 }), e);
  } catch {
    return ter(e);
  }
}
//@ chunk-e6aww6q8.js:1894607-1894816 placement
function oer(e) {
  let n = new Map(),
    r = new Map(),
    s = new Set(),
    h = () => n;
  return {
    covers: (y, S) => (Ad(y) ? denyEntryCovers(y, S, h(y)) : posixCovers(y, S)),
    coversReopen: (y, S) => denyEntryCovers(y, S, n),
    matchesAt: (y, S) =>
      Ad(y)
        ? matchesGuardedGlob(S, y, h(y)) ||
          (Ad(S) && matchesNameReading(S, nameReadingsOfGlobSpelling(y), h(y)))
        : y === S,
  };
}
//@ chunk-e6aww6q8.js:1894816-1894961 placement
function pathPrefixesBetween(e, n) {
  if (n === e) return [];
  let r = e === "/" ? "" : e;
  return n
    .slice(r.length + 1)
    .split("/")
    .reduce((s, h) => (s.push(`${s.at(-1) ?? r}/${h}`), s), []);
}
/**
 * 创建按 deny/凭据/reopen 规则判断路径是否拒绝上传的检查函数。
 */
//@ chunk-e6aww6q8.js:1894961-1895571 placement
function ier({ denies: denies, credentials: credentials, reopens: reopens }, s, h, y, S) {
  let w = (ke, we) => posixCovers(ke, we) || y.covers(ke, we),
    L = (ke) => ner(h(s(ZZo(ke)))),
    mapped = credentials.map(L),
    mapped_2 = denies.map((ke) => {
      let we = L(ke);
      return { spelled: we, matchesAllBeneath: normalizeRulePathSlashes(ke).endsWith("/**") && Ad(we) };
    }),
    mapped_3 = reopens
      .filter((ke) => !Ad(ke))
      .map((ke) => s(normalizeRulePathSlashes(ke)))
      .map((ke) => ({ named: ke, inDeny: h(ke) })),
    Se = (ke, we, Ee) =>
      S &&
      (ke.matchesAllBeneath
        ? Ee !== we
        : pathPrefixesBetween(we, Ee).some((Ae) => y.matchesAt(ke.spelled, Ae)));
  return (ke) => {
    let we = s(ke),
      Ee = h(we);
    return (
      mapped.some((Ae) => w(Ae, Ee)) ||
      mapped_2.some(
        (Ae) =>
          w(Ae.spelled, Ee) &&
          !mapped_3.some(
            (Ie) =>
              y.coversReopen(Ae.spelled, Ie.inDeny) && posixCovers(Ie.named, we) && !Se(Ae, Ie.inDeny, Ee),
          ),
      )
    );
  };
}
//@ chunk-e6aww6q8.js:1895571-1895596 placement
function Mnn(e) {
  return e;
}
//@ chunk-e6aww6q8.js:1895596-1895659 placement
function Onn(e) {
  return e.replace(/[\n\r\u2028\u2029]/g, "\x01");
}
//@ chunk-e6aww6q8.js:1895659-1895705 placement
function aer(e) {
  let n;
  return (r) => (n ??= e())(r);
}
/**
 * 创建目录同步的拒绝过滤器：根据 deny/credentials/reopen 规则，对路径的原样、大小写折叠等多种拼写判断是否应被排除上传；没有规则时始终放行。
 */
//@ chunk-e6aww6q8.js:1895705-1896125 placement
function createSyncDenyFilter(e, n, r = getPlatform(), s = !1) {
  if (n.denies.length === 0 && n.credentials.length === 0) return () => !1;
  let h = !1,
    y = [oer(s)],
    S = (q) =>
      y.map((Z) => {
        let Se = (ke) => ier(n, ke, q, Z, h);
        return {
          asWritten: Se(Mnn),
          folded: Se(foldPathCase),
          foldedKeepingIgnorables: aer(() => Se((ke) => lti(ke) ?? foldPathCase(ke))),
        };
      }),
    w = S(Mnn),
    L = !1,
    G;
  return (q) =>
    e.some((Z) => {
      let Se = normalizeRulePathSlashes(join_73(Z, q)),
        ke = !1;
      return [...w, ...(Onn(Se) === Se ? [] : (G ??= S(Onn)))].some(
        (we) => we.asWritten(Se) || we.folded(Se) || !1,
      );
    });
}
//@ chunk-e6aww6q8.js:1896125-1896990 placement
function checkManagedConfigFile(e, n) {
  let startTime = performance.now(),
    s = getFlagSettingsPath(),
    h = getClaudeConfigDirs();
  if (isDiskless()) return Nnn(h[0] ?? n);
  let y = (() => {
    let S = managedFileSettingsDirs(!0);
    try {
      return classifyDirSyncRoot(n === e ? [e] : [e, n], {
        configHomes: h,
        configFiles: [
          ...claudeStatePathPatterns(),
          ...S.map((w) => join_71(w, "managed-settings.json")),
          join_71(getManagedFilePath(), "managed-mcp.json"),
          ...(s === void 0 ? [] : [s]),
          ...getFlagAgentsFilePaths(),
          ...getFlagMcpConfigFilePaths(),
        ],
        configDirs: S.map((w) => ({
          path: join_71(w, "managed-settings.d"),
          accepts: isManagedSettingsDropInName,
        })),
      });
    } catch (error) {
      return (logError(error), Nnn(h[0] ?? n));
    }
  })();
  if (y === wB) return y;
  return (
    logDirSyncHostConfig(
      n,
      {
        targets: y.targetCount,
        ground_root_linked: y.ground?.kind === "root_linked",
        ground_inside_home: y.ground?.kind === "inside_home",
        ground_unreadable: y.ground?.kind === "unexamined" && y.ground.why === "unreadable",
        ground_too_many: y.ground?.kind === "unexamined" && y.ground.why === "too_many",
        ground_on_share: y.ground?.kind === "unexamined" && y.ground.why === "on_share",
      },
      { entries_examined: y.entriesExamined, duration_ms: Math.round(performance.now() - startTime) },
    ),
    y
  );
}
//@ chunk-e6aww6q8.js:1896990-1897069 placement
function Nnn(e) {
  return { ...wB, ground: { kind: "unexamined", at: e, why: "unreadable" } };
}
/**
 * 目录同步搁置登记表：按会话保存搁置项并在回答或释放时发出通知。
 */
//@ chunk-e6aww6q8.js:1912185-1912554 placement
class fXe {
  #e = new Map();
  #t = createSignal();
  hold(e) {
    (this.#e.set(e.sessionId, e), e.onAnswered(() => this.#t.emit(e.sessionId)), this.#t.emit(e.sessionId));
  }
  release(e) {
    if (e.close()) this.#t.emit(e.sessionId);
  }
  of(e) {
    return this.#e.get(toInfraSessionId(e));
  }
  ready(e) {
    return this.of(e)?.open() === !0;
  }
  concerns(e) {
    return this.of(e) !== void 0;
  }
  onChanged(e, n) {
    let r = toInfraSessionId(e);
    return this.#t.subscribe((s) => {
      if (s === r) n();
    });
  }
}
//@ chunk-e6aww6q8.js:1912554-1912573 placement
var Cer = 8,
  Aer = 2000;
/**
 * 目录同步会话对象。
 */
//@ chunk-e6aww6q8.js:1912573-1915274 placement
class DirSyncSession {
  attachSyncs = new fXe();
  servedCallHolds = null;
  #e = new Map();
  #t = new Map();
  #n = new Map();
  #o = new Map();
  #r;
  #i = null;
  #s = new Map();
  #a = !1;
  #d = !1;
  #c = new Set();
  #l = new Set();
  register(e, n) {
    let r = toInfraSessionId(e);
    (this.#e.delete(r),
      this.#t.delete(r),
      this.#n.delete(r),
      pXe(this.#e).forEach((h) => {
        let y = this.#e.get(h);
        (this.#e.delete(h),
          y?.then(
            (S) => this.retire(S.sessionId),
            () => {},
          ));
      }),
      this.#e.set(r, n));
  }
  noteSilentlyNotArmed(e, n) {
    let r = toInfraSessionId(e);
    (this.#t.delete(r), pXe(this.#t).forEach((s) => this.#t.delete(s)), this.#t.set(r, n));
  }
  silentlyNotArmed(e) {
    return this.#t.get(toInfraSessionId(e));
  }
  noteNotOptedIn(e, n) {
    let r = toInfraSessionId(e);
    (this.#n.delete(r), pXe(this.#n).forEach((s) => this.#n.delete(s)), this.#n.set(r, n));
  }
  notOptedIn(e) {
    return this.#n.get(toInfraSessionId(e));
  }
  take(e) {
    let n = toInfraSessionId(e),
      r = this.#e.get(n);
    return (this.#e.delete(n), r);
  }
  reportSendGateAnswers(e, n) {
    return Promise.resolve(!1);
  }
  noteResumeCommandOnScreen(e) {
    this.#i = toInfraSessionId(e);
  }
  hold(e, n) {
    let r = toInfraSessionId(e.sessionId);
    (this.retire(r), this.#t.delete(r), this.#n.delete(r));
    let s = getIsInteractive() ? (S, w) => Per(this.#i === r ? (w ?? S) : S) : void 0,
      h = null,
      y = (S) =>
        (h ??= (async () => {
          (await e.sync.shutdown(n, S), await e.sync.drain(CLEANUP_TIMEOUT_MS));
        })());
    (this.#s.set(r, {
      unregister: registerCleanup(() => y(s)),
      shutDownOnce: y,
      sync: e.sync,
      root: e.gitRoot,
    }),
      this.#u(r));
  }
  consentMayHaveChanged() {}
  retire(e) {
    let n = toInfraSessionId(e),
      r = this.#s.get(n);
    if (r === void 0) return;
    (this.#s.delete(n), r.unregister(), r.sync.shutdown(0), this.#u(n));
  }
  async shutDown(e) {
    let n = toInfraSessionId(e),
      r = this.#s.get(n);
    if (r === void 0) return;
    let now = Date.now(),
      h = await r.shutDownOnce(void 0).then(
        () => !1,
        (y) => (logError(toError(y)), !0),
      );
    if (this.#s.get(n) === r) (this.#s.delete(n), r.unregister(), this.#u(n));
  }
  watchState(e, n) {
    let r = toInfraSessionId(e),
      s = this.#o.get(r);
    if (s === void 0)
      ((s = { changed: createSignal(), listening: 0, last: describeDirSyncState(this.stateOf(r)) }),
        this.#o.set(r, s));
    let h = s,
      subscribe = h.changed.subscribe(n);
    if (((h.listening += 1), this.#r === void 0))
      ((this.#r = setInterval(() => {
        [...this.#o.keys()].forEach((w) => this.#u(w));
      }, Aer)),
        this.#r.unref?.());
    let S = !0;
    return () => {
      if (!S) return;
      if (((S = !1), subscribe(), (h.listening -= 1), h.listening === 0 && this.#o.get(r) === h))
        this.#o.delete(r);
      if (this.#o.size === 0 && this.#r !== void 0) (clearInterval(this.#r), (this.#r = void 0));
    };
  }
  #u(e) {
    let n = this.#o.get(e);
    if (n === void 0) return;
    let stateOf = this.stateOf(e),
      s = describeDirSyncState(stateOf);
    if (s === n.last) return;
    n.last = s;
    try {
      n.changed.emit(stateOf);
    } catch (error) {
      logError(toError(error));
    }
  }
  stateOf(e) {
    return this.#s.get(toInfraSessionId(e))?.sync.state();
  }
  syncOf(e) {
    return this.#s.get(toInfraSessionId(e))?.sync;
  }
  servedCallFaceOf(e) {
    let n = toInfraSessionId(e);
    return this.syncOf(n);
  }
  rootOf(e) {
    return this.#s.get(toInfraSessionId(e))?.root;
  }
  tellUnknownEngineWord() {
    if (this.#a) return !1;
    return ((this.#a = !0), !0);
  }
  sayUnknownEngineWord() {
    if (this.#d) return !1;
    return ((this.#d = !0), !0);
  }
  sayGitNotOnStartPath(e) {
    if (this.#c.has(e)) return !1;
    return (this.#c.add(e), !0);
  }
  wholeListingOutgrew(e) {
    return this.#l.has(e);
  }
  noteWholeListingOutgrew(e) {
    this.#l.add(e);
  }
  get heldCount() {
    return this.#e.size;
  }
  get exitHookCount() {
    return this.#s.size;
  }
}
//@ chunk-e6aww6q8.js:1915274-1915304 placement
function xer() {
  return new DirSyncSession();
}
//@ chunk-e6aww6q8.js:1915304-1915323 placement
var vBo = new HostScoped(xer);
//@ chunk-e6aww6q8.js:1915323-1915361 placement
function HB() {
  return vBo.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:1915361-1915397 placement
function X5s(e) {
  return HB().take(e);
}
//@ chunk-e6aww6q8.js:1915397-1915444 placement
function Per(e) {
  try {
    writeSync_3(
      2,
      `${stripControlChars_3(e)}
`,
    );
  } catch {}
}
//@ chunk-e6aww6q8.js:1915444-1915514 placement
function pXe(e) {
  return [...e.keys()].slice(0, Math.max(0, e.size + 1 - Cer));
}
//@ chunk-e6aww6q8.js:1915514-1915732 placement
function describeDirSyncState(e) {
  switch (e?.state) {
    case void 0:
      return "none";
    case "seeding":
      return "seeding";
    case "armed":
      return `armed:${e.engine}:${e.direction}`;
    case "off":
      return `off:${e.reason}`;
    case "stopped":
      return `stopped:${e.reason}`;
  }
}
//@ chunk-e6aww6q8.js:1915732-1915792 placement
var Ier = new HostScoped(() => new Map()),
  Der = new HostScoped(() => new Map()),
  Ler = 15000;

export {
  vBo,
  listChangedTrackedFiles,
  HB,
  q5s,
  OWt,
  DIR_SYNC_EXCLUDED_DIRS,
  checkManagedConfigFile,
  createSyncDenyFilter,
  tXe,
  isSensitiveSyncedPath,
  launchDenyRules,
  wB,
  Ier,
  Ler,
  Der,
  X5s,
};
