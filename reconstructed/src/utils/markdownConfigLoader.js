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
import { lstat, stat, realpath, readdir, readFile } from "fs/promises";
import { sep, resolve as resolve_2, join, dirname } from "path";
import { homedir } from "os";
import { splitRuleList } from "./permissions/disallowedToolsFlag.js";
import {
  isDiskless,
  getProjectRootOrNull,
  getProjectConfigRoot,
  getAdditionalDirectoriesForClaudeMd,
} from "../bootstrap/state.js";
import { hasInode } from "./fsSafety/hardenedRead.js";
import { nearestNonHomeRoot, storageRootFor } from "./settings/settingsStorage.js";
import { normalizePathForCompare } from "./file.js";
import { isFsInaccessible, getErrnoCode, isPathAbsent } from "./errors.js";
import { logForDebugging } from "./debug.js";
import { findGitRoot, findCanonicalGitRoot } from "./git.js";
import {
  isManagedFolderWritable,
  managedFolderCondition,
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
import { isDisklessSession as isDisklessSession_2 } from "./disklessSession.js";
import { ripGrep_2, ripgrepStorageOverride, RipgrepTimeoutError } from "./ripgrep.js";
import { readSmallFileChecked } from "./readSmallFile.js";
import { parseFrontmatter } from "./frontmatterParser.js";
import { readAllPages, DEFAULT_MAX_PAGES } from "./pagedRead.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { isSentinelInode } from "./slowOperations.js";

//@ chunk-e6aww6q8.js:797747-797837 fingerprint = CLAUDE_CONFIG_DIRECTORIES (0.71)
/**
 * markdown 配置文件单文件上限 1 MiB，及配置子目录清单 CLAUDE_CONFIG_DIRECTORIES：commands、agents、output-styles、skills、workflows、routines。
 */
var MAX_MARKDOWN_FILE_BYTES = 1048576;
var CLAUDE_CONFIG_DIRECTORIES = ["commands", "agents", "output-styles", "skills", "workflows", "routines"];
//@ chunk-e6aww6q8.js:797837-798020 fingerprint = extractDescriptionFromMarkdown (1)
/**
 * 从 markdown 正文取第一行非空文本作描述（去掉 # 标题符），超过 100 字符截断。
 */
function extractDescriptionFromMarkdown(content, defaultDescription = "Custom item") {
  let lines = content.split(`
`);
  for (let line of lines) {
    let trimmed = line.trim();
    if (trimmed) {
      let text = trimmed.match(/^#+\s+(\S.*)$/)?.[1] ?? trimmed;
      return text.length > 100 ? text.substring(0, 97) + "..." : text;
    }
  }
  return defaultDescription;
}
//@ chunk-e6aww6q8.js:798020-798264 file-local
/**
 * 解析工具列表字段（字符串或数组），含 * 时返回 [*]，null 表示未设置。
 */
function parseToolListString(toolsValue) {
  if (toolsValue === undefined || toolsValue === null) return null;
  if (!toolsValue) return [];
  let toolsArray = [];
  if (typeof toolsValue === "string") toolsArray = [toolsValue];
  else if (Array.isArray(toolsValue)) toolsArray = toolsValue.filter((item) => typeof item === "string");
  if (toolsArray.length === 0) return [];
  let parsedTools = splitRuleList(toolsArray);
  if (parsedTools.includes("*")) return ["*"];
  return parsedTools;
}
//@ chunk-e6aww6q8.js:798264-798368 file-local
/**
 * 解析代理 frontmatter 的 tools：* 表示全部（返回 undefined），未设置返回 undefined。
 */
function parseAgentToolsFromFrontmatter(toolsValue) {
  let parsed = parseToolListString(toolsValue);
  if (parsed === null) return toolsValue === undefined ? undefined : [];
  if (parsed.includes("*")) return;
  return parsed;
}
//@ chunk-e6aww6q8.js:798368-798426 layout
/**
 * 解析 skill/命令的 allowed-tools，未设置返回 []。
 */
function parseSlashCommandToolsFromFrontmatter(toolsValue) {
  let parsed = parseToolListString(toolsValue);
  if (parsed === null) return [];
  return parsed;
}
//@ chunk-e6aww6q8.js:798426-798574 layout = getFileIdentity (1)
/**
 * 返回文件的 dev:ino 身份字符串，用于去重；无盘会话或 inode 不可靠时返回 null。
 */
async function getFileIdentity(filePath) {
  if (isDiskless()) return null;
  try {
    let stats = await lstat(filePath, {
      bigint: true,
    });
    if (!hasInode(stats.ino)) return null;
    return `${stats.dev}:${stats.ino}`;
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:798574-798761 file-local
function resolveStopBoundary(cwd) {
  let cwdGitRoot = nearestNonHomeRoot(cwd);
  let projectRootOrNull = getProjectRootOrNull();
  let sessionGitRoot = projectRootOrNull === null ? null : nearestNonHomeRoot(projectRootOrNull);
  if (!cwdGitRoot || !sessionGitRoot) return cwdGitRoot;
  let cwdCanonical = storageRootFor(cwd);
  if (cwdCanonical && normalizePathForCompare(cwdCanonical) === normalizePathForCompare(sessionGitRoot))
    return cwdGitRoot;
  let nCwdGitRoot = normalizePathForCompare(cwdGitRoot);
  let nSessionRoot = normalizePathForCompare(sessionGitRoot);
  if (nCwdGitRoot !== nSessionRoot && nCwdGitRoot.startsWith(nSessionRoot + sep)) return sessionGitRoot;
  return cwdGitRoot;
}
//@ chunk-e6aww6q8.js:798761-798867 layout
/**
 * 按 baseDir 路径深度排序。
 */
function compareByBaseDirDepth(e, n) {
  let r = (baseDir) => (baseDir === undefined ? 1 / 0 : (baseDir.match(/[/\\]/g)?.length ?? 0));
  return r(e.baseDir) - r(n.baseDir);
}
//@ chunk-e6aww6q8.js:798867-799474 layout
/**
 * 从 cwd 向上到家目录收集存在的 .claude/<子目录>。
 */
async function getProjectDirsUpToHome(e, n) {
  let cwd = getProjectConfigRoot() ?? n;
  if (cwd === null || isDiskless()) return [];
  let normalized = resolve_2(homedir()).normalize("NFC");
  let stopBoundary = resolveStopBoundary(cwd);
  let y = resolve_2(cwd);
  let S = [];
  while (true) {
    if (normalizePathForCompare(y) === normalizePathForCompare(normalized)) break;
    S.push(join(y, ".claude", e));
    if (stopBoundary && normalizePathForCompare(y) === normalizePathForCompare(stopBoundary)) break;
    let G = dirname(y);
    if (G === y) break;
    y = G;
  }
  let results = await Promise.all(
    S.map((G) =>
      stat(G).then(
        () => ({
          claudeSubdir: G,
          exists: true,
        }),
        (error) => ({
          claudeSubdir: G,
          exists: false,
          error,
        }),
      ),
    ),
  );
  let L = [];
  for (let G of results) {
    let { claudeSubdir } = G;
    if (G.exists) {
      L.push(claudeSubdir);
      continue;
    }
    let error = G.error;
    if (isFsInaccessible(error));
    else if (getErrnoCode(error) === "ENFILE")
      logForDebugging(
        `getProjectDirsUpToHome: stat ${claudeSubdir} hit ENFILE (system fd-table full); skipping`,
        {
          level: "error",
        },
      );
    else throw error;
  }
  return L;
}
//@ chunk-e6aww6q8.js:799474-799688 layout = isInGlobalClaudeFolder (1)
function isInGlobalClaudeFolder(e, n, r) {
  if (r === null || isDiskless() || getProjectConfigRoot() !== null) return;
  let absolutePath = findGitRoot(r);
  let normalizedAbsolutePath = findCanonicalGitRoot(r);
  if (!absolutePath || !normalizedAbsolutePath || normalizedAbsolutePath === absolutePath) return;
  let normalizedGlobalClaudeFolderPath = normalizePathForCompare(join(absolutePath, ".claude", n));
  if (e.some((L) => normalizePathForCompare(L) === normalizedGlobalClaudeFolderPath)) return;
  let w = join(normalizedAbsolutePath, ".claude", n);
  if (!e.includes(w)) e.push(w);
}
//@ chunk-e6aww6q8.js:799688-799791 layout
/**
 * 缓存某配置子目录的 markdown 加载结果。
 */
function loadMarkdownFilesCached(subdir, cwd, r) {
  let s = isManagedFolderWritable();
  return getOrCreate(
    getHostState().markdownFiles,
    `${subdir}:${managedFolderCondition()}${keyOrNull(cwd)}`,
    () => loadMarkdownFilesForSubdir(subdir, cwd, r, s),
  );
}
//@ chunk-e6aww6q8.js:799791-801646 fingerprint = loadMarkdownFilesForSubdir (0.951)
/**
 * 加载某个配置子目录（agents/commands/skills/output-styles…）的全部 markdown：managed、用户（可走 storageV5）、项目各级、--add-dir（仅 agents）四路并行，按 inode 去重，记 tengu_dir_search。
 */
async function loadMarkdownFilesForSubdir(subdir, n, r, s) {
  let searchStartTime = Date.now();
  let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
  let S = claudeConfigDirOrNull === null ? null : join(claudeConfigDirOrNull, subdir);
  let managedDir = join(getManagedFilePath(), ".claude", subdir);
  let projectDirsUpToHome = await getProjectDirsUpToHome(subdir, n);
  let G = new Set(
    await Promise.all(
      projectDirsUpToHome.map(async (Et) => normalizePathForCompare(await realpath(Et).catch(() => Et))),
    ),
  );
  let q =
    subdir === "agents"
      ? uniq(
          await Promise.all(
            getAdditionalDirectoriesForClaudeMd().map(async (dir) => {
              let mainClaudeSubdir = join(resolve_2(dir), ".claude", subdir);
              return await realpath(mainClaudeSubdir).catch(() => mainClaudeSubdir);
            }),
          ),
        ).filter((dir) => !G.has(normalizePathForCompare(dir)))
      : [];
  isInGlobalClaudeFolder(projectDirsUpToHome, subdir, n);
  let Z = subdir === "agents" && isRestrictedToPluginOnly("agents");
  let Se = isSettingSourceEnabled("projectSettings") && !Z;
  let ke = s || isManagedFolderWritable();
  if (ke && !isDiskless())
    logForDebugging(
      `${managedDir}: not read: this session takes its managed settings from its organization, and its own account could have written the managed folder`,
    );
  let [managedFiles, userFiles, Ae, Ie] = await Promise.all([
    (isDiskless() || ke ? Promise.resolve([]) : loadMarkdownFiles(managedDir, r)).then((file) =>
      file.map((file) => ({
        ...file,
        baseDir: managedDir,
        source: "policySettings",
      })),
    ),
    S !== null && isSettingSourceEnabled("userSettings") && !Z
      ? (r ? loadMarkdownFilesV5(subdir, S, r) : loadMarkdownFiles(S)).then((file) =>
          file.map((file) => ({
            ...file,
            baseDir: S,
            source: "userSettings",
          })),
        )
      : Promise.resolve([]),
    Se
      ? Promise.all(
          projectDirsUpToHome.map((projectDir) =>
            loadMarkdownFiles(projectDir, r).then((file) =>
              file.map((file) => ({
                ...file,
                baseDir: projectDir,
                source: "projectSettings",
              })),
            ),
          ),
        )
      : Promise.resolve([]),
    Se
      ? Promise.all(
          q.map((projectDir) =>
            loadMarkdownFiles(projectDir, r).then((markdownFiles) =>
              markdownFiles.map((file) => ({
                ...file,
                baseDir: projectDir,
                source: "projectSettings",
                fromAdditionalDirectory: true,
              })),
            ),
          ),
        )
      : Promise.resolve([]),
  ]);
  let projectFiles = Ae.flat();
  let projectFiles_2 = Ie.flat();
  let allFiles = [...filterUntrustedSkills(managedFiles), ...userFiles, ...projectFiles_2, ...projectFiles];
  let fileIdentities = await Promise.all(allFiles.map((file) => getFileIdentity(file.filePath)));
  let seenFileIds = new Map();
  let deduplicatedFiles = [];
  for (let [i, file] of allFiles.entries()) {
    let fileId = fileIdentities[i] ?? null;
    if (fileId === null) {
      deduplicatedFiles.push(file);
      continue;
    }
    let existingSource = seenFileIds.get(fileId);
    if (existingSource !== undefined) {
      logForDebugging(
        `Skipping duplicate file '${file.filePath}' from ${file.source} (same inode already loaded from ${existingSource})`,
      );
      continue;
    }
    seenFileIds.set(fileId, file.source);
    deduplicatedFiles.push(file);
  }
  let duplicatesRemoved = allFiles.length - deduplicatedFiles.length;
  if (duplicatesRemoved > 0)
    logForDebugging(
      `Deduplicated ${duplicatesRemoved} files in ${subdir} (same inode via symlinks or hard links)`,
    );
  logEvent("tengu_dir_search", {
    durationMs: Date.now() - searchStartTime,
    managedFilesFound: managedFiles.length,
    userFilesFound: userFiles.length,
    projectFilesFound: projectFiles.length,
    projectDirsSearched: projectDirsUpToHome.length,
    subdir: fromEnum(subdir),
  });
  return deduplicatedFiles;
}
//@ chunk-e6aww6q8.js:801646-802683 fingerprint = findMarkdownFilesNative (1)
/**
 * 不用 ripgrep 时的递归 .md 查找：跟随符号链接，按 dev:ino 防环，受 AbortSignal 限时。
 */
async function findMarkdownFilesNative(dir, signal) {
  let files = [];
  let visitedDirs = new Set();
  async function h(w, name, currentDir) {
    if (w.isDirectory()) await walk(currentDir);
    else if (w.isFile() && name.endsWith(".md")) files.push(currentDir);
  }
  async function y(entry, fullPath) {
    if (entry.isSymbolicLink()) {
      try {
        let G = await stat(fullPath);
        await h(G, entry.name, fullPath);
      } catch (error) {
        let q = error instanceof Error ? error.message : String(error);
        logForDebugging(`Failed to follow symlink ${fullPath}: ${q}`);
      }
      return;
    }
    await h(entry, entry.name, fullPath);
  }
  async function walk(currentDir) {
    if (signal.aborted) return;
    try {
      let stats = await stat(currentDir, {
        bigint: true,
      });
      if (stats.isDirectory()) {
        let dirKey =
          stats.dev !== undefined && stats.ino !== undefined
            ? `${stats.dev}:${stats.ino}`
            : await realpath(currentDir);
        if (visitedDirs.has(dirKey)) {
          logForDebugging(`Skipping already visited directory (circular symlink): ${currentDir}`);
          return;
        }
        visitedDirs.add(dirKey);
      }
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : String(error);
      logForDebugging(`Failed to stat directory ${currentDir}: ${errorMessage}`);
      return;
    }
    try {
      let entries = await readdir(currentDir, {
        withFileTypes: true,
      });
      for (let entry of entries) {
        if (signal.aborted) break;
        let fullPath = join(currentDir, entry.name);
        try {
          await y(entry, fullPath);
        } catch (error) {
          let errorMessage = error instanceof Error ? error.message : String(error);
          logForDebugging(`Failed to access ${fullPath}: ${errorMessage}`);
        }
      }
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : String(error);
      logForDebugging(`Failed to read directory ${currentDir}: ${errorMessage}`);
    }
  }
  await walk(dir);
  return files;
}
//@ chunk-e6aww6q8.js:802683-803802 fingerprint = loadMarkdownFiles (0.551)
/**
 * 列出目录下全部 .md（ripgrep --files --follow 或原生遍历，3 秒超时），逐个读取并解析 frontmatter；超限或非常规文件跳过。
 */
async function loadMarkdownFiles(dir, n) {
  let useNative = isEnvTruthy("true") || isDisklessSession_2();
  let signal = AbortSignal.timeout(3000);
  let h = null;
  let files;
  try {
    files = useNative
      ? await findMarkdownFilesNative(dir, signal)
      : await ripGrep_2(["--files", "--hidden", "--follow", "--no-ignore", "--glob", "*.md"], dir, signal, {
          cwd: ripgrepStorageOverride(n),
        });
  } catch (error) {
    if (isFsInaccessible(error)) {
      if (!isPathAbsent(error)) getHostState().markdownScansGivenUp++;
      return [];
    }
    if (error instanceof RipgrepTimeoutError) {
      logForDebugging(`loadMarkdownFilesFromDir: ripgrep timed out scanning ${dir}`);
      getHostState().markdownScansGivenUp++;
      return [];
    }
    throw error;
  }
  if (signal.aborted) getHostState().markdownScansGivenUp++;
  return (
    await Promise.all(
      files.map(async (filePath) => {
        try {
          let rawContent = await readSmallFileChecked(
            {
              stat,
              lstat,
              realpath,
              readFile,
            },
            filePath,
            MAX_MARKDOWN_FILE_BYTES,
          );
          if (rawContent === null) {
            logForDebugging(
              `loadMarkdownFilesFromDir: skipping ${filePath}: not a regular file or exceeds ${MAX_MARKDOWN_FILE_BYTES} byte limit`,
            );
            return null;
          }
          let { frontmatter, frontmatterAsWritten, asWrittenProblem, content, parseError } = parseFrontmatter(
            rawContent,
            filePath,
            {
              normalizeKeys: true,
            },
          );
          if (parseError)
            logForDebugging(
              `YAML frontmatter in ${filePath} failed to parse and was ignored: ${parseError}`,
              {
                level: "error",
              },
            );
          return {
            filePath,
            frontmatter,
            frontmatterAsWritten,
            ...(asWrittenProblem !== undefined && {
              asWrittenProblem,
            }),
            content,
          };
        } catch (error) {
          let errorMessage = error instanceof Error ? error.message : String(error);
          logForDebugging(`Failed to read/parse markdown file:  ${filePath}: ${errorMessage}`);
          return null;
        }
      }),
    )
  ).filter((w) => w !== null);
}
//@ chunk-e6aww6q8.js:803802-805209 sole-consumer
/**
 * storageV5 模式下列出 userConfigDir/<subdir> 的 .md 并读取解析；列举失败回退到原始扫描。
 */
async function loadMarkdownFilesV5(subdir, n, r) {
  let s = [];
  let allPages = await readAllPages(
    (S) =>
      r.listRecursive(
        {
          namespace: "userConfigDir",
          dir: subdir,
        },
        {
          suffix: ".md",
          skipKeyStats: true,
          ...(S !== undefined && {
            cursor: S,
          }),
        },
      ),
    (S) => {
      for (let w of S)
        if (
          w.key.namespace === "userConfigDir" &&
          w.key.dir === subdir &&
          w.key.relPath.at(-1)?.endsWith(".md") === true
        )
          s.push({
            key: w.key,
            filePath: join(n, ...w.key.relPath),
          });
    },
  );
  switch (allPages.status) {
    case "done":
      break;
    case "error":
      logForDebugging(
        `Listing of ${n} failed (${formatStorageError(allPages.error)}); falling back to the raw scan`,
        {
          level: "warn",
        },
      );
      return loadMarkdownFiles(n, r);
    case "capped":
      logForDebugging(
        `Listing of ${n} truncated after ${DEFAULT_MAX_PAGES} pages; keeping the entries seen`,
        {
          level: "warn",
        },
      );
      break;
  }
  return (
    await Promise.all(
      s.map(async ({ key, filePath }) => {
        try {
          let L = await r.read([
            {
              key,
              offset: 0,
              length: MAX_MARKDOWN_FILE_BYTES + 1,
            },
          ]);
          if (!L.ok || !L.value.items[0].found) {
            logForDebugging(
              `Failed to read/parse markdown file:  ${filePath}: ${L.ok ? "absent" : L.error.code}`,
            );
            return null;
          }
          let G = L.value.items[0];
          if (G.totalBytes > MAX_MARKDOWN_FILE_BYTES) {
            logForDebugging(
              `loadMarkdownFilesFromDir: skipping ${filePath}: not a regular file or exceeds ${MAX_MARKDOWN_FILE_BYTES} byte limit`,
            );
            return null;
          }
          let { value: q } = G;
          let { frontmatter, frontmatterAsWritten, asWrittenProblem, content } = parseFrontmatter(
            Buffer.from(q.buffer, q.byteOffset, q.byteLength).toString("utf-8"),
            filePath,
            {
              normalizeKeys: true,
            },
          );
          return {
            filePath,
            frontmatter,
            frontmatterAsWritten,
            ...(asWrittenProblem !== undefined && {
              asWrittenProblem,
            }),
            content,
          };
        } catch (error) {
          let G = error instanceof Error ? error.message : String(error);
          logForDebugging(`Failed to read/parse markdown file:  ${filePath}: ${G}`);
          return null;
        }
      }),
    )
  ).filter((S) => S !== null);
}
//@ chunk-2xm1rxms.js:37944-38224 fingerprint = getFileIdentity (1)
async function getFileIdentity_2(e, n) {
  let [o, r, s] = await Promise.all([
    lstat(e, {
      bigint: true,
    }).catch(() => null),
    lstat(n, {
      bigint: true,
    }).catch(() => null),
    lstat(dirname(n), {
      bigint: true,
    }).catch(() => null),
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
