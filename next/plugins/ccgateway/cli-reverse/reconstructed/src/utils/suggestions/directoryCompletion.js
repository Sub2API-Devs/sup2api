/**
 * utils/suggestions/directoryCompletion.ts
 *
 * 路径/目录补全：解析部分路径、带缓存地扫描子目录
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/suggestions/directoryCompletion.ts
 * pieces: chunk-czq1j3j2.js (9), chunk-pc3x100t.js (1)
 * attribution: fingerprint 4, layout 3, placement 3
 */
import { join, sep, dirname, basename } from "path";
import { isENOENT, errorMessage, isFsInaccessible, isSyscallError, getErrnoCode } from "../errors.js";
import { entryKind } from "../cleanup.js";
import { getCwd } from "../cwd.js";
import { expandPath } from "../path.js";
import { logForDebugging } from "../debug.js";
import { suggestionCacheBySessionRoot } from "./suggestionCache.js";
import { getFsImplementation } from "../fsOperations.js";
import {
  SHELL_HISTORY_TTL_MS,
  COMMAND_SUGGESTIONS_TTL_MS,
  FAILED_SCAN_TTL_MS,
} from "./commandArgSuggestions.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { COMMAND_NAME_SEPARATORS } from "./commandSuggestions.js";

//@ chunk-pc3x100t.js:11318-11811 fingerprint (2.1.88 match: scanDirectoryForPaths, 0.668)
async function scanDirectoryForPaths(dir, fs, { requireCompleteWalk = false } = {}) {
  let newestMtime = -1 / 0;
  let entries = await fs.readdir(dir).catch((entry) => {
    if (requireCompleteWalk && !isENOENT(entry)) throw entry;
    return [];
  });
  for (let entry of entries) {
    let entryPath = join(dir, entry.name);
    let kind = requireCompleteWalk
      ? await entryKind(entry, entryPath, fs).catch((entry) => {
          if (isENOENT(entry)) return "other";
          throw entry;
        })
      : entry.isDirectory()
        ? "directory"
        : entry.isFile()
          ? "file"
          : "other";
    if (kind === "directory") {
      let childMtime = await scanDirectoryForPaths(entryPath, fs, {
        requireCompleteWalk,
      });
      if (childMtime !== null) newestMtime = Math.max(newestMtime, childMtime);
    } else if (kind === "file")
      try {
        let { mtimeMs } = await fs.stat(entryPath);
        newestMtime = Math.max(newestMtime, mtimeMs);
      } catch (error) {
        if (requireCompleteWalk && !isENOENT(error)) throw error;
      }
  }
  return newestMtime === -1 / 0 ? null : newestMtime;
}
//@ chunk-czq1j3j2.js:571534-571726 fingerprint (2.1.88 match: parsePartialPath, 1)
function parsePartialPath(partialPath, basePath) {
  if (!partialPath)
    return {
      directory: basePath || getCwd(),
      prefix: "",
    };
  let resolved = expandPath(partialPath, basePath);
  if (partialPath.endsWith("/") || partialPath.endsWith(sep))
    return {
      directory: resolved,
      prefix: "",
    };
  let directory = dirname(resolved);
  let prefix = basename(partialPath);
  return {
    directory,
    prefix,
  };
}
//@ chunk-czq1j3j2.js:571726-571851 layout
function tryParsePartialPath(partialPath, basePath) {
  try {
    return parsePartialPath(partialPath, basePath);
  } catch (error) {
    logForDebugging(`Skipping path completion for an unexpandable token: ${errorMessage(error)}`);
    return null;
  }
}
//@ chunk-czq1j3j2.js:571851-572393 layout
async function scanDirectoryCached(session, directory) {
  let { directoryScanCache } = suggestionCacheBySessionRoot.of(session);
  let cached = directoryScanCache.get(directory);
  if (cached) return cached;
  try {
    let sliced = (await getFsImplementation().readdir(directory))
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => ({
        name: entry.name,
        path: join(directory, entry.name),
        type: "directory",
      }))
      .slice(0, SHELL_HISTORY_TTL_MS);
    directoryScanCache.set(directory, sliced);
    return sliced;
  } catch (error) {
    if (isFsInaccessible(error)) {
      directoryScanCache.set(directory, [], {
        ttl: COMMAND_SUGGESTIONS_TTL_MS,
      });
      logForDebugging(`Directory completion: ${directory} is inaccessible (${error.code})`);
      return [];
    }
    if (isCacheableScanError(error))
      directoryScanCache.set(directory, [], {
        ttl: FAILED_SCAN_TTL_MS,
      });
    logForDebugging(
      `Directory completion: failed to scan ${directory}: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return [];
  }
}
//@ chunk-czq1j3j2.js:572393-572752 fingerprint (2.1.88 match: getDirectoryCompletions, 1)
/**
 * 目录补全：解析部分路径，列出匹配的子目录（带缓存，隐藏目录除外）。
 */
async function getDirectoryCompletions(session, input, options = {}) {
  if (isRemoteSessionAvailable()) return [];
  let { basePath = getCwd(), maxResults = 10 } = options;
  let parsed = tryParsePartialPath(input, basePath);
  if (!parsed) return [];
  let { directory, prefix } = parsed;
  let entries = await scanDirectoryCached(session, directory);
  let prefixLower = prefix.toLowerCase();
  return entries
    .filter((entry) => entry.name.toLowerCase().startsWith(prefixLower))
    .slice(0, maxResults)
    .map((entry) => ({
      id: entry.path,
      displayText: entry.name + "/",
      description: "directory",
      metadata: {
        type: "directory",
      },
    }));
}
//@ chunk-czq1j3j2.js:572752-572882 placement (2.1.88 match: resolveCwdReentry, 1)
/**
 * （旧版名配错）文本是否像路径（~/、/、./、../、~、.、..），用于输入补全。
 */
function looksLikePathToken(normalized) {
  return (
    normalized.startsWith("~/") ||
    normalized.startsWith("/") ||
    normalized.startsWith("./") ||
    normalized.startsWith("../") ||
    normalized === "~" ||
    normalized === "." ||
    normalized === ".."
  );
}
//@ chunk-czq1j3j2.js:572882-573553 layout
/**
 * 扫描目录供路径补全（隐藏文件除外、目录在前、数量上限），结果缓存；不可访问时缓存空列表。
 */
async function scanPathEntries(session, directory) {
  let { pathScanCache } = suggestionCacheBySessionRoot.of(session);
  let cached = pathScanCache.get(directory);
  if (cached) return cached;
  try {
    let sliced = (await getFsImplementation().readdir(directory))
      .filter((entry) => !entry.name.startsWith("."))
      .map((entry) => ({
        name: entry.name,
        path: join(directory, entry.name),
        type: entry.isDirectory() ? "directory" : "file",
      }))
      .sort((left, right) => {
        if (left.type === "directory" && right.type !== "directory") return -1;
        if (left.type !== "directory" && right.type === "directory") return 1;
        return left.name.localeCompare(right.name);
      })
      .slice(0, SHELL_HISTORY_TTL_MS);
    pathScanCache.set(directory, sliced);
    return sliced;
  } catch (error) {
    if (isFsInaccessible(error)) {
      pathScanCache.set(directory, [], {
        ttl: COMMAND_SUGGESTIONS_TTL_MS,
      });
      logForDebugging(`Path completion: ${directory} is inaccessible (${error.code})`);
      return [];
    }
    if (isCacheableScanError(error))
      pathScanCache.set(directory, [], {
        ttl: FAILED_SCAN_TTL_MS,
      });
    logForDebugging(`Failed to scan directory for path completion: ${error}`, {
      level: "error",
    });
    return [];
  }
}
//@ chunk-czq1j3j2.js:573553-574154 fingerprint (2.1.88 match: getPathCompletions, 0.871)
async function getPathCompletions(session, input, options = {}) {
  if (isRemoteSessionAvailable()) return [];
  let { basePath = getCwd(), maxResults = 10, keepDotPrefix = false } = options;
  let parsed = tryParsePartialPath(input, basePath);
  if (!parsed) return [];
  let { directory, prefix } = parsed;
  let entries = await scanPathEntries(session, directory);
  let prefixLower = prefix.toLowerCase();
  let matches = entries
    .filter((entry) => entry.name.toLowerCase().startsWith(prefixLower))
    .slice(0, maxResults);
  let hasSeparator = input.includes("/") || input.includes(sep);
  let dirPortion = "";
  if (hasSeparator) {
    let lastSlash = input.lastIndexOf("/");
    let lastSep = input.lastIndexOf(sep);
    let lastSeparatorPos = Math.max(lastSlash, lastSep);
    dirPortion = input.substring(0, lastSeparatorPos + 1);
  }
  if (!keepDotPrefix && (dirPortion.startsWith("./") || dirPortion.startsWith("." + sep)))
    dirPortion = dirPortion.slice(2);
  return matches.map((entry) => {
    let fullPath = dirPortion + entry.name;
    return {
      id: fullPath,
      displayText: entry.type === "directory" ? fullPath + "/" : fullPath,
      metadata: {
        type: entry.type,
      },
    };
  });
}
//@ chunk-czq1j3j2.js:574154-574200 placement
function isCacheableScanError(error) {
  return isSyscallError(error) && getErrnoCode(error) !== "EMFILE";
}
//@ chunk-czq1j3j2.js:574200-574423 placement
/**
 * 判断查询是否匹配命令名的某个词起始（忽略分隔符与大小写）。
 */
function matchesCommandWords(query, candidates, separators = COMMAND_NAME_SEPARATORS) {
  let joined = query.toLowerCase().trim().split(separators).join("");
  if (joined === "") return false;
  return candidates.some((candidate) => {
    let filtered = candidate.toLowerCase().split(separators).filter(Boolean);
    return filtered.some((part, index) => filtered.slice(index).join("").startsWith(joined));
  });
}
export {
  getDirectoryCompletions,
  scanDirectoryForPaths,
  matchesCommandWords,
  looksLikePathToken,
  getPathCompletions,
};
