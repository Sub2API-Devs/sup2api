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
import {
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
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
} from "path";
import { getCwd } from "../cwd.js";
import { expandPath } from "../path.js";
import { logForDebugging } from "../debug.js";
import { errorMessage, isFsInaccessible, isSyscallError, getErrnoCode, isENOENT } from "../errors.js";
import { yX } from "./suggestionCache.js";
import { getFsImplementation } from "../fsOperations.js";
import { JVe, KVe, zVe } from "./commandArgSuggestions.js";
import { wt } from "../../remote/remoteMode.js";
import { COMMAND_NAME_SEPARATORS } from "./commandSuggestions.js";
import { entryKind } from "../cleanup.js";

//@ chunk-18hwfzwa.js:550848-551040 fingerprint = parsePartialPath (1)
function parsePartialPath(partialPath, basePath) {
  if (!partialPath) return { directory: basePath || getCwd(), prefix: "" };
  let resolved = expandPath(partialPath, basePath);
  if (partialPath.endsWith("/") || partialPath.endsWith(sep_2)) return { directory: resolved, prefix: "" };
  let directory = dirname_4(resolved),
    prefix = basename_2(partialPath);
  return { directory: directory, prefix: prefix };
}
//@ chunk-18hwfzwa.js:551040-551165 layout
function tryParsePartialPath(h, x) {
  try {
    return parsePartialPath(h, x);
  } catch (error) {
    return (
      logForDebugging(`Skipping path completion for an unexpandable token: ${errorMessage(error)}`),
      null
    );
  }
}
//@ chunk-18hwfzwa.js:551165-551707 layout
async function scanDirectoryCached(h, x) {
  let { directoryScanCache: directoryScanCache } = yX.of(h),
    L = directoryScanCache.get(x);
  if (L) return L;
  try {
    let sliced = (await getFsImplementation().readdir(x))
      .filter((Be) => Be.isDirectory() && !Be.name.startsWith("."))
      .map((Be) => ({ name: Be.name, path: join_7(x, Be.name), type: "directory" }))
      .slice(0, JVe);
    return (directoryScanCache.set(x, sliced), sliced);
  } catch (error) {
    if (isFsInaccessible(error))
      return (
        directoryScanCache.set(x, [], { ttl: KVe }),
        logForDebugging(`Directory completion: ${x} is inaccessible (${error.code})`),
        []
      );
    if (ZVe(error)) directoryScanCache.set(x, [], { ttl: zVe });
    return (
      logForDebugging(
        `Directory completion: failed to scan ${x}: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      []
    );
  }
}
/**
 * 目录补全：解析部分路径，列出匹配的子目录（带缓存，隐藏目录除外）。
 */
//@ chunk-18hwfzwa.js:551707-552066 fingerprint = getDirectoryCompletions (1)
async function getDirectoryCompletions(h, x, D = {}) {
  if (wt()) return [];
  let { basePath: basePath = getCwd(), maxResults: maxResults = 10 } = D,
    ke = tryParsePartialPath(x, basePath);
  if (!ke) return [];
  let { directory: directory, prefix: prefix } = ke,
    He = await scanDirectoryCached(h, directory),
    prefixLower = prefix.toLowerCase();
  return He.filter((entry) => entry.name.toLowerCase().startsWith(prefixLower))
    .slice(0, maxResults)
    .map((entry) => ({
      id: entry.path,
      displayText: entry.name + "/",
      description: "directory",
      metadata: { type: "directory" },
    }));
}
/**
 * （旧版名配错）文本是否像路径（~/、/、./、../、~、.、..），用于输入补全。
 */
//@ chunk-18hwfzwa.js:552066-552196 placement = resolveCwdReentry (1)
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
/**
 * 扫描目录供路径补全（隐藏文件除外、目录在前、数量上限），结果缓存；不可访问时缓存空列表。
 */
//@ chunk-18hwfzwa.js:552196-552867 layout
async function scanPathEntries(h, x) {
  let { pathScanCache: pathScanCache } = yX.of(h),
    L = pathScanCache.get(x);
  if (L) return L;
  try {
    let sliced = (await getFsImplementation().readdir(x))
      .filter((Be) => !Be.name.startsWith("."))
      .map((Be) => ({
        name: Be.name,
        path: join_7(x, Be.name),
        type: Be.isDirectory() ? "directory" : "file",
      }))
      .sort((Be, He) => {
        if (Be.type === "directory" && He.type !== "directory") return -1;
        if (Be.type !== "directory" && He.type === "directory") return 1;
        return Be.name.localeCompare(He.name);
      })
      .slice(0, JVe);
    return (pathScanCache.set(x, sliced), sliced);
  } catch (error) {
    if (isFsInaccessible(error))
      return (
        pathScanCache.set(x, [], { ttl: KVe }),
        logForDebugging(`Path completion: ${x} is inaccessible (${error.code})`),
        []
      );
    if (ZVe(error)) pathScanCache.set(x, [], { ttl: zVe });
    return (
      logForDebugging(`Failed to scan directory for path completion: ${error}`, { level: "error" }),
      []
    );
  }
}
//@ chunk-18hwfzwa.js:552867-553468 fingerprint = getPathCompletions (0.871)
async function getPathCompletions(h, x, D = {}) {
  if (wt()) return [];
  let { basePath: basePath = getCwd(), maxResults: maxResults = 10, keepDotPrefix: keepDotPrefix = !1 } = D,
    Re = tryParsePartialPath(x, basePath);
  if (!Re) return [];
  let { directory: directory, prefix: prefix } = Re,
    entries = await scanPathEntries(h, directory),
    prefixLower = prefix.toLowerCase(),
    matches = entries
      .filter((entry) => entry.name.toLowerCase().startsWith(prefixLower))
      .slice(0, maxResults),
    hasSeparator = x.includes("/") || x.includes(sep_2),
    dirPortion = "";
  if (hasSeparator) {
    let lastSlash = x.lastIndexOf("/"),
      lastSep = x.lastIndexOf(sep_2),
      lastSeparatorPos = Math.max(lastSlash, lastSep);
    dirPortion = x.substring(0, lastSeparatorPos + 1);
  }
  if (!keepDotPrefix && (dirPortion.startsWith("./") || dirPortion.startsWith("." + sep_2)))
    dirPortion = dirPortion.slice(2);
  return matches.map((entry) => {
    let fullPath = dirPortion + entry.name;
    return {
      id: fullPath,
      displayText: entry.type === "directory" ? fullPath + "/" : fullPath,
      metadata: { type: entry.type },
    };
  });
}
//@ chunk-18hwfzwa.js:553468-553514 placement
function ZVe(h) {
  return isSyscallError(h) && getErrnoCode(h) !== "EMFILE";
}
/**
 * 判断查询是否匹配命令名的某个词起始（忽略分隔符与大小写）。
 */
//@ chunk-18hwfzwa.js:553514-553737 placement
function matchesCommandWords(h, x, D = COMMAND_NAME_SEPARATORS) {
  let joined = h.toLowerCase().trim().split(D).join("");
  if (joined === "") return !1;
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
async function scanDirectoryForPaths(e, r, { requireCompleteWalk: s = !1 } = {}) {
  let n = -1 / 0,
    f = await r.readdir(e).catch((entry) => {
      if (s && !isENOENT(entry)) throw entry;
      return [];
    });
  for (let i of f) {
    let m = join(e, i.name),
      g = s
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
      let y = await scanDirectoryForPaths(m, r, { requireCompleteWalk: s });
      if (y !== null) n = Math.max(n, y);
    } else if (g === "file")
      try {
        let { mtimeMs: mtimeMs } = await r.stat(m);
        n = Math.max(n, mtimeMs);
      } catch (error) {
        if (s && !isENOENT(error)) throw error;
      }
  }
  return n === -1 / 0 ? null : n;
}

export {
  matchesCommandWords,
  looksLikePathToken,
  getPathCompletions,
  getDirectoryCompletions,
  scanDirectory,
  scanDirectoryForPaths,
};
