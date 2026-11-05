/**
 * utils/markdownConfigLoader.ts
 *
 * 并入已有模块：markdown 配置加载。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/markdownConfigLoader.ts
 * pieces: chunk-2k62t388.js (1), chunk-5xgkngpb.js (14), chunk-b08ck61p.js (1)
 * attribution: fingerprint 6, placement 9, sole-consumer 1
 */
import { join, sep, resolve as resolve_2, dirname } from "path";
import { homedir } from "os";
import { lstat, stat, realpath, readdir, readFile } from "fs/promises";
import { memoizeByKey, getClaudeConfigHomeDir, getClaudeConfigDirOrNull, isEnvTruthy } from "./envUtils.js";
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
import {
  isManagedFolderWritable,
  managedFolderCondition,
  filterUntrustedSkills,
} from "../plugins/functionHooks/sites/promptContextSites.js";
import { getOrCreate, getHostState, keyOrNull } from "./hostEnvironment.js";
import { getManagedFilePath } from "./settings/managedPath.js";
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { isInGlobalClaudeFolder } from "../components/permissions/FilePermissionDialog/permissionOptions.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-2k62t388.js:2508-2569 fingerprint (2.1.88 match: getProjectDirsUpToHome, 1)
/**
 * Claude 配置目录：$CLAUDE_CONFIG_DIR 或 ~/.claude，NFC 归一化，按 env 值缓存。
 */
var getClaudeConfigDir; // deferred: uses memoizeByKey (./envUtils.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-2k62t388.js:2508", () => {
  getClaudeConfigDir = memoizeByKey(
    () => (getClaudeConfigHomeDir() ?? join(homedir(), ".claude")).normalize("NFC"),
    getClaudeConfigHomeDir,
  );
});
//@ chunk-5xgkngpb.js:809072-809162 placement
/**
 * markdown 配置文件单文件上限 1 MiB，及配置子目录清单 CLAUDE_CONFIG_DIRECTORIES：commands、agents、output-styles、skills、workflows、routines。
 */
var MAX_MARKDOWN_FILE_BYTES = 1048576;
var CLAUDE_CONFIG_DIRECTORIES = ["commands", "agents", "output-styles", "skills", "workflows", "routines"];
//@ chunk-5xgkngpb.js:809162-809345 fingerprint (2.1.88 match: extractDescriptionFromMarkdown, 1)
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
//@ chunk-5xgkngpb.js:809345-809589 placement
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
//@ chunk-5xgkngpb.js:809589-809693 placement
/**
 * 解析代理 frontmatter 的 tools：* 表示全部（返回 undefined），未设置返回 undefined。
 */
function parseAgentToolsFromFrontmatter(toolsValue) {
  let parsed = parseToolListString(toolsValue);
  if (parsed === null) return toolsValue === undefined ? undefined : [];
  if (parsed.includes("*")) return;
  return parsed;
}
//@ chunk-5xgkngpb.js:809693-809751 placement
/**
 * 解析 skill/命令的 allowed-tools，未设置返回 []。
 */
function parseSlashCommandToolsFromFrontmatter(toolsValue) {
  let parsed = parseToolListString(toolsValue);
  if (parsed === null) return [];
  return parsed;
}
//@ chunk-5xgkngpb.js:809751-809898 placement (2.1.88 match: getFileIdentity, 1)
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
//@ chunk-5xgkngpb.js:809898-810085 placement
function resolveStopBoundary(cwd) {
  let cwdGitRoot = nearestNonHomeRoot(cwd);
  let startPath = getProjectRootOrNull();
  let sessionGitRoot = startPath === null ? null : nearestNonHomeRoot(startPath);
  if (!cwdGitRoot || !sessionGitRoot) return cwdGitRoot;
  let cwdCanonical = storageRootFor(cwd);
  if (cwdCanonical && normalizePathForCompare(cwdCanonical) === normalizePathForCompare(sessionGitRoot))
    return cwdGitRoot;
  let nCwdGitRoot = normalizePathForCompare(cwdGitRoot);
  let nSessionRoot = normalizePathForCompare(sessionGitRoot);
  if (nCwdGitRoot !== nSessionRoot && nCwdGitRoot.startsWith(nSessionRoot + sep)) return sessionGitRoot;
  return cwdGitRoot;
}
//@ chunk-5xgkngpb.js:810085-810191 placement
/**
 * 按 baseDir 路径深度排序。
 */
function compareByBaseDirDepth(entryA, entryB) {
  let depthOf = (baseDir) => (baseDir === undefined ? 1 / 0 : (baseDir.match(/[/\\]/g)?.length ?? 0));
  return depthOf(entryA.baseDir) - depthOf(entryB.baseDir);
}
//@ chunk-5xgkngpb.js:810191-810802 placement
/**
 * 从 cwd 向上到家目录收集存在的 .claude/<子目录>。
 */
async function getProjectDirsUpToHome(subdir, cwd) {
  let cwd_2 = getProjectConfigRoot() ?? cwd;
  if (cwd_2 === null || isDiskless()) return [];
  let normalized = resolve_2(homedir()).normalize("NFC");
  let stopBoundary = resolveStopBoundary(cwd_2);
  let currentDir = resolve_2(cwd_2);
  let claudeDirs = [];
  while (true) {
    if (normalizePathForCompare(currentDir) === normalizePathForCompare(normalized)) break;
    claudeDirs.push(join(currentDir, ".claude", subdir));
    if (stopBoundary && normalizePathForCompare(currentDir) === normalizePathForCompare(stopBoundary)) break;
    let parentDir = dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }
  let results = await Promise.all(
    claudeDirs.map((claudeSubdir) =>
      stat(claudeSubdir).then(
        () => ({
          claudeSubdir,
          exists: true,
        }),
        (error) => ({
          claudeSubdir,
          exists: false,
          error,
        }),
      ),
    ),
  );
  let existingDirs = [];
  for (let result of results) {
    let { claudeSubdir } = result;
    if (result.exists) {
      existingDirs.push(claudeSubdir);
      continue;
    }
    let error = result.error;
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
  return existingDirs;
}
//@ chunk-5xgkngpb.js:811016-811119 placement
/**
 * 缓存某配置子目录的 markdown 加载结果。
 */
function loadMarkdownFilesCached(subdir, cwd, storage) {
  let managedFolderWritable = isManagedFolderWritable();
  return getOrCreate(
    getHostState().markdownFiles,
    `${subdir}:${managedFolderCondition()}${keyOrNull(cwd)}`,
    () => loadMarkdownFilesForSubdir(subdir, cwd, storage, managedFolderWritable),
  );
}
//@ chunk-5xgkngpb.js:811119-812977 fingerprint (2.1.88 match: loadMarkdownFilesForSubdir, 0.951)
/**
 * 加载某个配置子目录（agents/commands/skills/output-styles…）的全部 markdown：managed、用户（可走 storageV5）、项目各级、--add-dir（仅 agents）四路并行，按 inode 去重，记 tengu_dir_search。
 */
async function loadMarkdownFilesForSubdir(subdir, cwd, storage, managedSettingsFromHost) {
  let searchStartTime = Date.now();
  let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
  let userSubdir = claudeConfigDirOrNull === null ? null : join(claudeConfigDirOrNull, subdir);
  let managedDir = join(getManagedFilePath(), ".claude", subdir);
  let projectDirs = await getProjectDirsUpToHome(subdir, cwd);
  let visitedDirs = new Set(
    await Promise.all(
      projectDirs.map(async (dir) => normalizePathForCompare(await realpath(dir).catch(() => dir))),
    ),
  );
  let additionalProjectDirs =
    subdir === "agents"
      ? normalizeCaseForComparison_2(
          await Promise.all(
            getAdditionalDirectoriesForClaudeMd().map(async (dir) => {
              let mainClaudeSubdir = join(resolve_2(dir), ".claude", subdir);
              return await realpath(mainClaudeSubdir).catch(() => mainClaudeSubdir);
            }),
          ),
        ).filter((dir) => !visitedDirs.has(normalizePathForCompare(dir)))
      : [];
  isInGlobalClaudeFolder(projectDirs, subdir, cwd);
  let restrictedToPlugin = subdir === "agents" && isRestrictedToPluginOnly("agents");
  let projectSourcesEnabled = isSettingSourceEnabled("projectSettings") && !restrictedToPlugin;
  let skipManagedFolder = managedSettingsFromHost || isManagedFolderWritable();
  if (skipManagedFolder && !isDiskless())
    logForDebugging(
      `${managedDir}: not read: this session takes its managed settings from its organization, and its own account could have written the managed folder`,
    );
  let [managedFiles, userFiles, projectFileGroups, additionalFileGroups] = await Promise.all([
    (isDiskless() || skipManagedFolder ? Promise.resolve([]) : loadMarkdownFiles(managedDir, storage)).then(
      (file) =>
        file.map((file) => ({
          ...file,
          baseDir: managedDir,
          source: "policySettings",
        })),
    ),
    userSubdir !== null && isSettingSourceEnabled("userSettings") && !restrictedToPlugin
      ? (storage ? loadMarkdownFilesV5(subdir, userSubdir, storage) : loadMarkdownFiles(userSubdir)).then(
          (file) =>
            file.map((file) => ({
              ...file,
              baseDir: userSubdir,
              source: "userSettings",
            })),
        )
      : Promise.resolve([]),
    projectSourcesEnabled
      ? Promise.all(
          projectDirs.map((projectDir) =>
            loadMarkdownFiles(projectDir, storage).then((file) =>
              file.map((file) => ({
                ...file,
                baseDir: projectDir,
                source: "projectSettings",
              })),
            ),
          ),
        )
      : Promise.resolve([]),
    projectSourcesEnabled
      ? Promise.all(
          additionalProjectDirs.map((projectDir) =>
            loadMarkdownFiles(projectDir, storage).then((markdownFiles) =>
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
  let projectFiles = projectFileGroups.flat();
  let projectFiles_2 = additionalFileGroups.flat();
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
    projectDirsSearched: projectDirs.length,
    subdir: fromEnum(subdir),
  });
  return deduplicatedFiles;
}
//@ chunk-5xgkngpb.js:812977-814018 fingerprint (2.1.88 match: findMarkdownFilesNative, 1)
/**
 * 不用 ripgrep 时的递归 .md 查找：跟随符号链接，按 dev:ino 防环，受 AbortSignal 限时。
 */
async function findMarkdownFilesNative(dir, signal) {
  let files = [];
  let visitedDirs = new Set();
  async function handleEntry(entry, name, currentDir) {
    if (entry.isDirectory()) await walk(currentDir);
    else if (entry.isFile() && name.endsWith(".md")) files.push(currentDir);
  }
  async function visitDirent(entry, fullPath) {
    if (entry.isSymbolicLink()) {
      try {
        let targetStats = await stat(fullPath);
        await handleEntry(targetStats, entry.name, fullPath);
      } catch (error) {
        let message = error instanceof Error ? error.message : String(error);
        logForDebugging(`Failed to follow symlink ${fullPath}: ${message}`);
      }
      return;
    }
    await handleEntry(entry, entry.name, fullPath);
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
          await visitDirent(entry, fullPath);
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
//@ chunk-5xgkngpb.js:814018-815140 fingerprint (2.1.88 match: loadMarkdownFiles, 0.551)
/**
 * 列出目录下全部 .md（ripgrep --files --follow 或原生遍历，3 秒超时），逐个读取并解析 frontmatter；超限或非常规文件跳过。
 */
async function loadMarkdownFiles(dir, storage) {
  let useNative = isEnvTruthy("true") || isDisklessSession_2();
  let signal = AbortSignal.timeout(3000);
  let scanner = null;
  let files;
  try {
    files = useNative
      ? await findMarkdownFilesNative(dir, signal)
      : await ripGrep_2(["--files", "--hidden", "--follow", "--no-ignore", "--glob", "*.md"], dir, signal, {
          cwd: ripgrepStorageOverride(storage),
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
  ).filter((file) => file !== null);
}
//@ chunk-5xgkngpb.js:815140-816549 sole-consumer
/**
 * storageV5 模式下列出 userConfigDir/<subdir> 的 .md 并读取解析；列举失败回退到原始扫描。
 */
async function loadMarkdownFilesV5(subdir, userDir, storage) {
  let listedFiles = [];
  let allPages = await readAllPages(
    (cursor) =>
      storage.listRecursive(
        {
          namespace: "userConfigDir",
          dir: subdir,
        },
        {
          suffix: ".md",
          skipKeyStats: true,
          ...(cursor !== undefined && {
            cursor,
          }),
        },
      ),
    (entries) => {
      for (let entry of entries)
        if (
          entry.key.namespace === "userConfigDir" &&
          entry.key.dir === subdir &&
          entry.key.relPath.at(-1)?.endsWith(".md") === true
        )
          listedFiles.push({
            key: entry.key,
            filePath: join(userDir, ...entry.key.relPath),
          });
    },
  );
  switch (allPages.status) {
    case "done":
      break;
    case "error":
      logForDebugging(
        `Listing of ${userDir} failed (${formatStorageError(allPages.error)}); falling back to the raw scan`,
        {
          level: "warn",
        },
      );
      return loadMarkdownFiles(userDir, storage);
    case "capped":
      logForDebugging(
        `Listing of ${userDir} truncated after ${DEFAULT_MAX_PAGES} pages; keeping the entries seen`,
        {
          level: "warn",
        },
      );
      break;
  }
  return (
    await Promise.all(
      listedFiles.map(async ({ key, filePath }) => {
        try {
          let readResult = await storage.read([
            {
              key,
              offset: 0,
              length: MAX_MARKDOWN_FILE_BYTES + 1,
            },
          ]);
          if (!readResult.ok || !readResult.value.items[0].found) {
            logForDebugging(
              `Failed to read/parse markdown file:  ${filePath}: ${readResult.ok ? "absent" : readResult.error.code}`,
            );
            return null;
          }
          let item = readResult.value.items[0];
          if (item.totalBytes > MAX_MARKDOWN_FILE_BYTES) {
            logForDebugging(
              `loadMarkdownFilesFromDir: skipping ${filePath}: not a regular file or exceeds ${MAX_MARKDOWN_FILE_BYTES} byte limit`,
            );
            return null;
          }
          let { value: bytes } = item;
          let { frontmatter, frontmatterAsWritten, asWrittenProblem, content } = parseFrontmatter(
            Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("utf-8"),
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
          let message = error instanceof Error ? error.message : String(error);
          logForDebugging(`Failed to read/parse markdown file:  ${filePath}: ${message}`);
          return null;
        }
      }),
    )
  ).filter((loadedFile) => loadedFile !== null);
}
//@ chunk-b08ck61p.js:22118-22202 fingerprint (2.1.88 match: CLAUDE_CONFIG_DIRECTORIES, 0.718)
var CLAUDE_CONFIG_DIRECTORIES_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-b08ck61p.js:22118", () => {
  CLAUDE_CONFIG_DIRECTORIES_2 = new Set([
    "commands",
    "agents",
    "skills",
    "output-styles",
    "themes",
    "workflows",
  ]);
});
export {
  getClaudeConfigDir,
  getProjectDirsUpToHome,
  loadMarkdownFilesCached,
  extractDescriptionFromMarkdown,
  compareByBaseDirDepth,
  parseSlashCommandToolsFromFrontmatter,
  loadMarkdownFiles,
  parseAgentToolsFromFrontmatter,
  CLAUDE_CONFIG_DIRECTORIES,
  MAX_MARKDOWN_FILE_BYTES,
  CLAUDE_CONFIG_DIRECTORIES_2,
};
