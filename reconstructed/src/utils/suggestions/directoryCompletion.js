/**
 * utils/suggestions/directoryCompletion.ts
 *
 * 路径/目录补全：解析部分路径、带缓存地扫描子目录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/suggestions/directoryCompletion.ts
 * pieces: chunk-18hwfzwa.js (10), chunk-23fm9f0d.js (1)
 * attribution: fingerprint 5, layout 3, placement 3
 */
import { sep, dirname, basename, join } from "path";
import { getCwd } from "../cwd.js";
import { expandPath } from "../path.js";
import { logForDebugging } from "../debug.js";
import { errorMessage, isFsInaccessible, isSyscallError, getErrnoCode, isENOENT } from "../errors.js";
import { suggestionCacheBySessionRoot } from "./suggestionCache.js";
import { getFsImplementation } from "../fsOperations.js";
import {
  SHELL_HISTORY_TTL_MS,
  COMMAND_SUGGESTIONS_TTL_MS,
  FAILED_SCAN_TTL_MS,
} from "./commandArgSuggestions.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { COMMAND_NAME_SEPARATORS } from "./commandSuggestions.js";
import { entryKind } from "../cleanup.js";

//@ chunk-18hwfzwa.js:550848-551040 fingerprint = parsePartialPath (1)
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
//@ chunk-18hwfzwa.js:551040-551165 layout
function tryParsePartialPath(partialPath, basePath) {
  try {
    return parsePartialPath(partialPath, basePath);
  } catch (error) {
    logForDebugging(`Skipping path completion for an unexpandable token: ${errorMessage(error)}`);
    return null;
  }
}
//@ chunk-18hwfzwa.js:551165-551707 layout
async function scanDirectoryCached(h, directory) {
  let { directoryScanCache } = suggestionCacheBySessionRoot.of(h);
  let L = directoryScanCache.get(directory);
  if (L) return L;
  try {
    let sliced = (await getFsImplementation().readdir(directory))
      .filter((Be) => Be.isDirectory() && !Be.name.startsWith("."))
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
//@ chunk-18hwfzwa.js:551707-552066 fingerprint = getDirectoryCompletions (1)
/**
 * 目录补全：解析部分路径，列出匹配的子目录（带缓存，隐藏目录除外）。
 */
async function getDirectoryCompletions(session, x, D = {}) {
  if (isRemoteSessionAvailable()) return [];
  let { basePath = getCwd(), maxResults = 10 } = D;
  let ke = tryParsePartialPath(x, basePath);
  if (!ke) return [];
  let { directory, prefix } = ke;
  let He = await scanDirectoryCached(session, directory);
  let prefixLower = prefix.toLowerCase();
  return He.filter((entry) => entry.name.toLowerCase().startsWith(prefixLower))
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
//@ chunk-18hwfzwa.js:552066-552196 placement = resolveCwdReentry (1)
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
//@ chunk-18hwfzwa.js:552196-552867 layout
/**
 * 扫描目录供路径补全（隐藏文件除外、目录在前、数量上限），结果缓存；不可访问时缓存空列表。
 */
async function scanPathEntries(h, directory) {
  let { pathScanCache } = suggestionCacheBySessionRoot.of(h);
  let L = pathScanCache.get(directory);
  if (L) return L;
  try {
    let sliced = (await getFsImplementation().readdir(directory))
      .filter((Be) => !Be.name.startsWith("."))
      .map((Be) => ({
        name: Be.name,
        path: join(directory, Be.name),
        type: Be.isDirectory() ? "directory" : "file",
      }))
      .sort((Be, He) => {
        if (Be.type === "directory" && He.type !== "directory") return -1;
        if (Be.type !== "directory" && He.type === "directory") return 1;
        return Be.name.localeCompare(He.name);
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
//@ chunk-18hwfzwa.js:552867-553468 fingerprint = getPathCompletions (0.871)
async function getPathCompletions(session, x, D = {}) {
  if (isRemoteSessionAvailable()) return [];
  let { basePath = getCwd(), maxResults = 10, keepDotPrefix = false } = D;
  let Re = tryParsePartialPath(x, basePath);
  if (!Re) return [];
  let { directory, prefix } = Re;
  let entries = await scanPathEntries(session, directory);
  let prefixLower = prefix.toLowerCase();
  let matches = entries
    .filter((entry) => entry.name.toLowerCase().startsWith(prefixLower))
    .slice(0, maxResults);
  let hasSeparator = x.includes("/") || x.includes(sep);
  let dirPortion = "";
  if (hasSeparator) {
    let lastSlash = x.lastIndexOf("/");
    let lastSep = x.lastIndexOf(sep);
    let lastSeparatorPos = Math.max(lastSlash, lastSep);
    dirPortion = x.substring(0, lastSeparatorPos + 1);
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
//@ chunk-18hwfzwa.js:553468-553514 placement
function isCacheableScanError(error) {
  return isSyscallError(error) && getErrnoCode(error) !== "EMFILE";
}
//@ chunk-18hwfzwa.js:553514-553737 placement
/**
 * 判断查询是否匹配命令名的某个词起始（忽略分隔符与大小写）。
 */
function matchesCommandWords(h, x, D = COMMAND_NAME_SEPARATORS) {
  let joined = h.toLowerCase().trim().split(D).join("");
  if (joined === "") return false;
  return x.some((ee) => {
    let filtered = ee.toLowerCase().split(D).filter(Boolean);
    return filtered.some((Re, Be) => filtered.slice(Be).join("").startsWith(joined));
  });
}
//@ chunk-18hwfzwa.js:930340-930395 fingerprint = scanDirectory (0.766)
function scanDirectory(dirPath) {
  return dirPath.description === "directory";
}
//@ chunk-23fm9f0d.js:11309-11802 fingerprint = scanDirectoryForPaths (0.669)
async function scanDirectoryForPaths(e, r, { requireCompleteWalk: s = false } = {}) {
  let n = -1 / 0;
  let f = await r.readdir(e).catch((entry) => {
    if (s && !isENOENT(entry)) throw entry;
    return [];
  });
  for (let i of f) {
    let m = join(e, i.name);
    let g = s
      ? await entryKind(i, m, r).catch((entry) => {
          if (isENOENT(entry)) return "other";
          throw entry;
        })
      : i.isDirectory()
        ? "directory"
        : i.isFile()
          ? "file"
          : "other";
    if (g === "directory") {
      let y = await scanDirectoryForPaths(m, r, {
        requireCompleteWalk: s,
      });
      if (y !== null) n = Math.max(n, y);
    } else if (g === "file")
      try {
        let { mtimeMs } = await r.stat(m);
        n = Math.max(n, mtimeMs);
      } catch (error) {
        if (s && !isENOENT(error)) throw error;
      }
  }
  return n === -1 / 0 ? null : n;
}
export {
  scanDirectory,
  matchesCommandWords,
  looksLikePathToken,
  getPathCompletions,
  getDirectoryCompletions,
  scanDirectoryForPaths,
};
