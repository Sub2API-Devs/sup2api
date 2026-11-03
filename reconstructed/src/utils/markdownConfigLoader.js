/**
 * utils/markdownConfigLoader.ts
 *
 * 并入已有模块：markdown 配置加载。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/markdownConfigLoader.ts
 * pieces: chunk-2xm1rxms.js (1), chunk-e6aww6q8.js (15)
 * attribution: fingerprint 6, file-local 3, layout 6, sole-consumer 1
 */
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
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  stat as stat_6,
  stat as stat_7,
  stat as stat_8,
  stat as stat_9,
  stat as stat_10,
  stat as stat_11,
  stat as stat_12,
  stat as stat_13,
  stat as stat_14,
  stat as stat_15,
  stat as stat_16,
  stat as stat_17,
  stat as stat_18,
  stat as stat_19,
  stat as stat_20,
  stat as stat_21,
  stat as stat_22,
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
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  readFile as readFile_5,
  readFile as readFile_6,
  readFile as readFile_7,
  readFile as readFile_8,
  readFile as readFile_9,
  readFile as readFile_10,
  readFile as readFile_11,
  readFile as readFile_12,
  readFile as readFile_13,
  readFile as readFile_14,
  readFile as readFile_15,
  readFile as readFile_16,
  readFile as readFile_17,
  readFile as readFile_18,
  readFile as readFile_19,
} from "fs/promises";
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
} from "path";
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
import { splitRuleList } from "./permissions/disallowedToolsFlag.js";
import {
  isDiskless,
  getProjectRootOrNull,
  getProjectConfigRoot,
  getAdditionalDirectoriesForClaudeMd,
} from "../bootstrap/state.js";
import { hasInode } from "./fsSafety/hardenedRead.js";
import { iIn, GD } from "./settings/settingsStorage.js";
import { normalizePathForCompare } from "./file.js";
import { isFsInaccessible, getErrnoCode, isPathAbsent } from "./errors.js";
import { logForDebugging } from "./debug.js";
import { findGitRoot, findCanonicalGitRoot } from "./git.js";
import {
  isManagedFolderWritable,
  W1,
  filterUntrustedSkills,
} from "../plugins/functionHooks/sites/promptContextSites.js";
import { getOrCreate, getHostState, keyOrNull } from "./hostEnvironment.js";
import { getClaudeConfigDirOrNull, isEnvTruthy } from "./envUtils.js";
import { getManagedFilePath } from "./settings/managedPath.js";
import { uniq } from "./collections.js";
import { isRestrictedToPluginOnly } from "./settings/pluginOnlyPolicy.js";
import { isSettingSourceEnabled } from "./settings/constants.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { Tv } from "./disklessSession.js";
import { ripGrep, N6r, RipgrepTimeoutError } from "./ripgrep.js";
import { readSmallFileChecked } from "./readSmallFile.js";
import { parseFrontmatter } from "./frontmatterParser.js";
import { readAllPages, DEFAULT_MAX_PAGES } from "./pagedRead.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { isSentinelInode } from "./slowOperations.js";

/**
 * markdown 配置文件单文件上限 1 MiB，及配置子目录清单 CLAUDE_CONFIG_DIRECTORIES：commands、agents、output-styles、skills、workflows、routines。
 */
//@ chunk-e6aww6q8.js:797747-797837 fingerprint = CLAUDE_CONFIG_DIRECTORIES (0.71)
var MAX_MARKDOWN_FILE_BYTES = 1048576,
  CLAUDE_CONFIG_DIRECTORIES = ["commands", "agents", "output-styles", "skills", "workflows", "routines"];
/**
 * 从 markdown 正文取第一行非空文本作描述（去掉 # 标题符），超过 100 字符截断。
 */
//@ chunk-e6aww6q8.js:797837-798020 fingerprint = extractDescriptionFromMarkdown (1)
function extractDescriptionFromMarkdown(content, defaultDescription = "Custom item") {
  let parts = content.split(`
`);
  for (let line of parts) {
    let trimmed = line.trim();
    if (trimmed) {
      let text = trimmed.match(/^#+\s+(\S.*)$/)?.[1] ?? trimmed;
      return text.length > 100 ? text.substring(0, 97) + "..." : text;
    }
  }
  return defaultDescription;
}
/**
 * 解析工具列表字段（字符串或数组），含 * 时返回 [*]，null 表示未设置。
 */
//@ chunk-e6aww6q8.js:798020-798264 file-local
function parseToolListString(toolsValue) {
  if (toolsValue === void 0 || toolsValue === null) return null;
  if (!toolsValue) return [];
  let toolsArray = [];
  if (typeof toolsValue === "string") toolsArray = [toolsValue];
  else if (Array.isArray(toolsValue)) toolsArray = toolsValue.filter((item) => typeof item === "string");
  if (toolsArray.length === 0) return [];
  let parsedTools = splitRuleList(toolsArray);
  if (parsedTools.includes("*")) return ["*"];
  return parsedTools;
}
/**
 * 解析代理 frontmatter 的 tools：* 表示全部（返回 undefined），未设置返回 undefined。
 */
//@ chunk-e6aww6q8.js:798264-798368 file-local
function parseAgentToolsFromFrontmatter(toolsValue) {
  let parsed = parseToolListString(toolsValue);
  if (parsed === null) return toolsValue === void 0 ? void 0 : [];
  if (parsed.includes("*")) return;
  return parsed;
}
/**
 * 解析 skill/命令的 allowed-tools，未设置返回 []。
 */
//@ chunk-e6aww6q8.js:798368-798426 layout
function parseSlashCommandToolsFromFrontmatter(e) {
  let n = parseToolListString(e);
  if (n === null) return [];
  return n;
}
/**
 * 返回文件的 dev:ino 身份字符串，用于去重；无盘会话或 inode 不可靠时返回 null。
 */
//@ chunk-e6aww6q8.js:798426-798574 layout = getFileIdentity (1)
async function getFileIdentity(filePath) {
  if (isDiskless()) return null;
  try {
    let stats = await lstat_18(filePath, { bigint: !0 });
    if (!hasInode(stats.ino)) return null;
    return `${stats.dev}:${stats.ino}`;
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:798574-798761 file-local
function resolveStopBoundary(cwd) {
  let cwdGitRoot = iIn(cwd),
    r = getProjectRootOrNull(),
    s = r === null ? null : iIn(r);
  if (!cwdGitRoot || !s) return cwdGitRoot;
  let sessionGitRoot = GD(cwd);
  if (sessionGitRoot && normalizePathForCompare(sessionGitRoot) === normalizePathForCompare(s))
    return cwdGitRoot;
  let cwdCanonical = normalizePathForCompare(cwdGitRoot),
    nCwdGitRoot = normalizePathForCompare(s);
  if (cwdCanonical !== nCwdGitRoot && cwdCanonical.startsWith(nCwdGitRoot + sep_24)) return s;
  return cwdGitRoot;
}
/**
 * 按 baseDir 路径深度排序。
 */
//@ chunk-e6aww6q8.js:798761-798867 layout
function compareByBaseDirDepth(e, n) {
  let r = (s) => (s === void 0 ? 1 / 0 : (s.match(/[/\\]/g)?.length ?? 0));
  return r(e.baseDir) - r(n.baseDir);
}
/**
 * 从 cwd 向上到家目录收集存在的 .claude/<子目录>。
 */
//@ chunk-e6aww6q8.js:798867-799474 layout
async function getProjectDirsUpToHome(e, n) {
  let r = getProjectConfigRoot() ?? n;
  if (r === null || isDiskless()) return [];
  let normalized = resolve_14(homedir()).normalize("NFC"),
    h = resolveStopBoundary(r),
    y = resolve_14(r),
    S = [];
  while (!0) {
    if (normalizePathForCompare(y) === normalizePathForCompare(normalized)) break;
    if ((S.push(join_34(y, ".claude", e)), h && normalizePathForCompare(y) === normalizePathForCompare(h)))
      break;
    let G = dirname_20(y);
    if (G === y) break;
    y = G;
  }
  let results = await Promise.all(
      S.map((G) =>
        stat_7(G).then(
          () => ({ claudeSubdir: G, exists: !0 }),
          (q) => ({ claudeSubdir: G, exists: !1, error: q }),
        ),
      ),
    ),
    L = [];
  for (let G of results) {
    let { claudeSubdir: claudeSubdir } = G;
    if (G.exists) {
      L.push(claudeSubdir);
      continue;
    }
    let error = G.error;
    if (isFsInaccessible(error));
    else if (getErrnoCode(error) === "ENFILE")
      logForDebugging(
        `getProjectDirsUpToHome: stat ${claudeSubdir} hit ENFILE (system fd-table full); skipping`,
        { level: "error" },
      );
    else throw error;
  }
  return L;
}
//@ chunk-e6aww6q8.js:799474-799688 layout = isInGlobalClaudeFolder (1)
function isInGlobalClaudeFolder(e, n, r) {
  if (r === null || isDiskless() || getProjectConfigRoot() !== null) return;
  let absolutePath = findGitRoot(r),
    normalizedAbsolutePath = findCanonicalGitRoot(r);
  if (!absolutePath || !normalizedAbsolutePath || normalizedAbsolutePath === absolutePath) return;
  let normalizedGlobalClaudeFolderPath = normalizePathForCompare(join_34(absolutePath, ".claude", n));
  if (e.some((L) => normalizePathForCompare(L) === normalizedGlobalClaudeFolderPath)) return;
  let w = join_34(normalizedAbsolutePath, ".claude", n);
  if (!e.includes(w)) e.push(w);
}
/**
 * 缓存某配置子目录的 markdown 加载结果。
 */
//@ chunk-e6aww6q8.js:799688-799791 layout
function loadMarkdownFilesCached(e, n, r) {
  let s = isManagedFolderWritable();
  return getOrCreate(getHostState().markdownFiles, `${e}:${W1()}${keyOrNull(n)}`, () =>
    loadMarkdownFilesForSubdir(e, n, r, s),
  );
}
/**
 * 加载某个配置子目录（agents/commands/skills/output-styles…）的全部 markdown：managed、用户（可走 storageV5）、项目各级、--add-dir（仅 agents）四路并行，按 inode 去重，记 tengu_dir_search。
 */
//@ chunk-e6aww6q8.js:799791-801646 fingerprint = loadMarkdownFilesForSubdir (0.951)
async function loadMarkdownFilesForSubdir(e, n, r, s) {
  let searchStartTime = Date.now(),
    y = getClaudeConfigDirOrNull(),
    S = y === null ? null : join_34(y, e),
    managedDir = join_34(getManagedFilePath(), ".claude", e),
    L = await getProjectDirsUpToHome(e, n),
    G = new Set(
      await Promise.all(L.map(async (Et) => normalizePathForCompare(await realpath_5(Et).catch(() => Et)))),
    ),
    q =
      e === "agents"
        ? uniq(
            await Promise.all(
              getAdditionalDirectoriesForClaudeMd().map(async (dir) => {
                let mainClaudeSubdir = join_34(resolve_14(dir), ".claude", e);
                return await realpath_5(mainClaudeSubdir).catch(() => mainClaudeSubdir);
              }),
            ),
          ).filter((Et) => !G.has(normalizePathForCompare(Et)))
        : [];
  isInGlobalClaudeFolder(L, e, n);
  let Z = e === "agents" && isRestrictedToPluginOnly("agents"),
    Se = isSettingSourceEnabled("projectSettings") && !Z,
    ke = s || isManagedFolderWritable();
  if (ke && !isDiskless())
    logForDebugging(
      `${managedDir}: not read: this session takes its managed settings from its organization, and its own account could have written the managed folder`,
    );
  let [we, Ee, Ae, Ie] = await Promise.all([
      (isDiskless() || ke ? Promise.resolve([]) : loadMarkdownFiles(managedDir, r)).then((file) =>
        file.map((yt) => ({ ...yt, baseDir: managedDir, source: "policySettings" })),
      ),
      S !== null && isSettingSourceEnabled("userSettings") && !Z
        ? (r ? loadMarkdownFilesV5(e, S, r) : loadMarkdownFiles(S)).then((file) =>
            file.map((projectDir) => ({ ...projectDir, baseDir: S, source: "userSettings" })),
          )
        : Promise.resolve([]),
      Se
        ? Promise.all(
            L.map((Et) =>
              loadMarkdownFiles(Et, r).then((file) =>
                file.map((gt) => ({ ...gt, baseDir: Et, source: "projectSettings" })),
              ),
            ),
          )
        : Promise.resolve([]),
      Se
        ? Promise.all(
            q.map((Et) =>
              loadMarkdownFiles(Et, r).then((yt) =>
                yt.map((gt) => ({
                  ...gt,
                  baseDir: Et,
                  source: "projectSettings",
                  fromAdditionalDirectory: !0,
                })),
              ),
            ),
          )
        : Promise.resolve([]),
    ]),
    projectFiles = Ae.flat(),
    flat = Ie.flat(),
    ze = [...filterUntrustedSkills(we), ...Ee, ...flat, ...projectFiles],
    fileIdentities = await Promise.all(ze.map((file) => getFileIdentity(file.filePath))),
    seenFileIds = new Map(),
    deduplicatedFiles = [];
  for (let [Et, yt] of ze.entries()) {
    let gt = fileIdentities[Et] ?? null;
    if (gt === null) {
      deduplicatedFiles.push(yt);
      continue;
    }
    let existingSource = seenFileIds.get(gt);
    if (existingSource !== void 0) {
      logForDebugging(
        `Skipping duplicate file '${yt.filePath}' from ${yt.source} (same inode already loaded from ${existingSource})`,
      );
      continue;
    }
    (seenFileIds.set(gt, yt.source), deduplicatedFiles.push(yt));
  }
  let duplicatesRemoved = ze.length - deduplicatedFiles.length;
  if (duplicatesRemoved > 0)
    logForDebugging(
      `Deduplicated ${duplicatesRemoved} files in ${e} (same inode via symlinks or hard links)`,
    );
  return (
    logEvent("tengu_dir_search", {
      durationMs: Date.now() - searchStartTime,
      managedFilesFound: we.length,
      userFilesFound: Ee.length,
      projectFilesFound: projectFiles.length,
      projectDirsSearched: L.length,
      subdir: fromEnum(e),
    }),
    deduplicatedFiles
  );
}
/**
 * 不用 ripgrep 时的递归 .md 查找：跟随符号链接，按 dev:ino 防环，受 AbortSignal 限时。
 */
//@ chunk-e6aww6q8.js:801646-802683 fingerprint = findMarkdownFilesNative (1)
async function findMarkdownFilesNative(dir, signal) {
  let files = [],
    visitedDirs = new Set();
  async function h(w, L, G) {
    if (w.isDirectory()) await walk(G);
    else if (w.isFile() && L.endsWith(".md")) files.push(G);
  }
  async function y(w, L) {
    if (w.isSymbolicLink()) {
      try {
        let G = await stat_7(L);
        await h(G, w.name, L);
      } catch (error) {
        let q = error instanceof Error ? error.message : String(error);
        logForDebugging(`Failed to follow symlink ${L}: ${q}`);
      }
      return;
    }
    await h(w, w.name, L);
  }
  async function walk(currentDir) {
    if (signal.aborted) return;
    try {
      let stats = await stat_7(currentDir, { bigint: !0 });
      if (stats.isDirectory()) {
        let G =
          stats.dev !== void 0 && stats.ino !== void 0
            ? `${stats.dev}:${stats.ino}`
            : await realpath_5(currentDir);
        if (visitedDirs.has(G)) {
          logForDebugging(`Skipping already visited directory (circular symlink): ${currentDir}`);
          return;
        }
        visitedDirs.add(G);
      }
    } catch (error) {
      let G = error instanceof Error ? error.message : String(error);
      logForDebugging(`Failed to stat directory ${currentDir}: ${G}`);
      return;
    }
    try {
      let entries = await readdir_14(currentDir, { withFileTypes: !0 });
      for (let entry of entries) {
        if (signal.aborted) break;
        let fullPath = join_34(currentDir, entry.name);
        try {
          await y(entry, fullPath);
        } catch (error) {
          let Se = error instanceof Error ? error.message : String(error);
          logForDebugging(`Failed to access ${fullPath}: ${Se}`);
        }
      }
    } catch (error) {
      let G = error instanceof Error ? error.message : String(error);
      logForDebugging(`Failed to read directory ${currentDir}: ${G}`);
    }
  }
  return (await walk(dir), files);
}
/**
 * 列出目录下全部 .md（ripgrep --files --follow 或原生遍历，3 秒超时），逐个读取并解析 frontmatter；超限或非常规文件跳过。
 */
//@ chunk-e6aww6q8.js:802683-803802 fingerprint = loadMarkdownFiles (0.551)
async function loadMarkdownFiles(e, n) {
  let r = isEnvTruthy("true") || Tv(),
    signal = AbortSignal.timeout(3000),
    h = null,
    files;
  try {
    files = r
      ? await findMarkdownFilesNative(e, signal)
      : await ripGrep(["--files", "--hidden", "--follow", "--no-ignore", "--glob", "*.md"], e, signal, {
          cwd: N6r(n),
        });
  } catch (error) {
    if (isFsInaccessible(error)) {
      if (!isPathAbsent(error)) getHostState().markdownScansGivenUp++;
      return [];
    }
    if (error instanceof RipgrepTimeoutError)
      return (
        logForDebugging(`loadMarkdownFilesFromDir: ripgrep timed out scanning ${e}`),
        getHostState().markdownScansGivenUp++,
        []
      );
    throw error;
  }
  if (signal.aborted) getHostState().markdownScansGivenUp++;
  return (
    await Promise.all(
      files.map(async (filePath) => {
        try {
          let L = await readSmallFileChecked(
            { stat: stat_7, lstat: lstat_18, realpath: realpath_5, readFile: readFile_6 },
            filePath,
            MAX_MARKDOWN_FILE_BYTES,
          );
          if (L === null)
            return (
              logForDebugging(
                `loadMarkdownFilesFromDir: skipping ${filePath}: not a regular file or exceeds ${MAX_MARKDOWN_FILE_BYTES} byte limit`,
              ),
              null
            );
          let {
            frontmatter: frontmatter,
            frontmatterAsWritten: frontmatterAsWritten,
            asWrittenProblem: asWrittenProblem,
            content: content,
            parseError: parseError,
          } = parseFrontmatter(L, filePath, { normalizeKeys: !0 });
          if (parseError)
            logForDebugging(
              `YAML frontmatter in ${filePath} failed to parse and was ignored: ${parseError}`,
              { level: "error" },
            );
          return {
            filePath: filePath,
            frontmatter: frontmatter,
            frontmatterAsWritten: frontmatterAsWritten,
            ...(asWrittenProblem !== void 0 && { asWrittenProblem: asWrittenProblem }),
            content: content,
          };
        } catch (error) {
          let errorMessage = error instanceof Error ? error.message : String(error);
          return (logForDebugging(`Failed to read/parse markdown file:  ${filePath}: ${errorMessage}`), null);
        }
      }),
    )
  ).filter((w) => w !== null);
}
/**
 * storageV5 模式下列出 userConfigDir/<subdir> 的 .md 并读取解析；列举失败回退到原始扫描。
 */
//@ chunk-e6aww6q8.js:803802-805209 sole-consumer
async function loadMarkdownFilesV5(e, n, r) {
  let s = [],
    h = await readAllPages(
      (S) =>
        r.listRecursive(
          { namespace: "userConfigDir", dir: e },
          { suffix: ".md", skipKeyStats: !0, ...(S !== void 0 && { cursor: S }) },
        ),
      (S) => {
        for (let w of S)
          if (
            w.key.namespace === "userConfigDir" &&
            w.key.dir === e &&
            w.key.relPath.at(-1)?.endsWith(".md") === !0
          )
            s.push({ key: w.key, filePath: join_34(n, ...w.key.relPath) });
      },
    );
  switch (h.status) {
    case "done":
      break;
    case "error":
      return (
        logForDebugging(
          `Listing of ${n} failed (${formatStorageError(h.error)}); falling back to the raw scan`,
          { level: "warn" },
        ),
        loadMarkdownFiles(n, r)
      );
    case "capped":
      logForDebugging(
        `Listing of ${n} truncated after ${DEFAULT_MAX_PAGES} pages; keeping the entries seen`,
        { level: "warn" },
      );
      break;
  }
  return (
    await Promise.all(
      s.map(async ({ key: key, filePath: filePath }) => {
        try {
          let read = await r.read([{ key: key, offset: 0, length: MAX_MARKDOWN_FILE_BYTES + 1 }]);
          if (!read.ok || !read.value.items[0].found)
            return (
              logForDebugging(
                `Failed to read/parse markdown file:  ${filePath}: ${read.ok ? "absent" : read.error.code}`,
              ),
              null
            );
          let G = read.value.items[0];
          if (G.totalBytes > MAX_MARKDOWN_FILE_BYTES)
            return (
              logForDebugging(
                `loadMarkdownFilesFromDir: skipping ${filePath}: not a regular file or exceeds ${MAX_MARKDOWN_FILE_BYTES} byte limit`,
              ),
              null
            );
          let { value: q } = G,
            {
              frontmatter: frontmatter,
              frontmatterAsWritten: frontmatterAsWritten,
              asWrittenProblem: asWrittenProblem,
              content: content,
            } = parseFrontmatter(
              Buffer.from(q.buffer, q.byteOffset, q.byteLength).toString("utf-8"),
              filePath,
              { normalizeKeys: !0 },
            );
          return {
            filePath: filePath,
            frontmatter: frontmatter,
            frontmatterAsWritten: frontmatterAsWritten,
            ...(asWrittenProblem !== void 0 && { asWrittenProblem: asWrittenProblem }),
            content: content,
          };
        } catch (error) {
          let G = error instanceof Error ? error.message : String(error);
          return (logForDebugging(`Failed to read/parse markdown file:  ${filePath}: ${G}`), null);
        }
      }),
    )
  ).filter((S) => S !== null);
}
//@ chunk-2xm1rxms.js:37944-38224 fingerprint = getFileIdentity (1)
async function getFileIdentity_2(e, n) {
  let [o, r, s] = await Promise.all([
    lstat_3(e, { bigint: !0 }).catch(() => null),
    lstat_3(n, { bigint: !0 }).catch(() => null),
    lstat_3(dirname_3(n), { bigint: !0 }).catch(() => null),
  ]);
  return (
    o !== null &&
    r !== null &&
    s !== null &&
    o.dev !== 0n &&
    !isSentinelInode(o.ino) &&
    o.dev === r.dev &&
    o.ino === r.ino &&
    !(s.dev === r.dev && s.ino === r.ino)
  );
}

export {
  compareByBaseDirDepth,
  loadMarkdownFilesCached,
  parseAgentToolsFromFrontmatter,
  parseSlashCommandToolsFromFrontmatter,
  CLAUDE_CONFIG_DIRECTORIES,
  getProjectDirsUpToHome,
  getFileIdentity_2,
  MAX_MARKDOWN_FILE_BYTES,
  extractDescriptionFromMarkdown,
  loadMarkdownFiles,
  isInGlobalClaudeFolder,
};
