/**
 * utils/readSmallFile.ts
 *
 * 小文件安全读取（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gb7aq6sf.js (9)
 * attribution: placement 9
 */
import { lstat, readFile } from "fs/promises";
import { lstatSync, readFileSync } from "fs";
import { isPathAbsent, isFsInaccessible, getErrnoCode } from "./errors.js";
import { getPlatform } from "./platform.js";
import { hasBackslash } from "./pathClassification.js";
import { isSentinelInode } from "./slowOperations.js";
import { getDevicePathRefusal } from "../tools/FileReadTool/FileReadTool.js";

//@ chunk-gb7aq6sf.js:9702-9856 placement
async function readSmallFileOrNull(filePath, maxBytes, onUnreadable) {
  try {
    let stats = await lstat(filePath);
    if (!stats.isFile() || stats.size > maxBytes) {
      onUnreadable?.();
      return null;
    }
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (!isPathAbsent(error)) onUnreadable?.();
    return null;
  }
}
//@ chunk-gb7aq6sf.js:9856-9966 placement
function readSmallFileOrNullSync(filePath, maxBytes) {
  try {
    let stats = lstatSync(filePath);
    if (!stats.isFile() || stats.size > maxBytes) return null;
    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}
//@ chunk-gb7aq6sf.js:9966-10148 placement
async function readSmallFileChecked(fsImplementation, filePath, maxBytes, onSkip) {
  let { verdict, st } = await checkSmallFileReadable(fsImplementation, filePath, maxBytes);
  switch (verdict) {
    case "skip":
      onSkip?.(st);
      return null;
    case "empty":
      return "";
    case "read":
      return await fsImplementation.readFile(filePath, {
        encoding: "utf8",
      });
  }
}
//@ chunk-gb7aq6sf.js:10148-10294 placement
function readSmallFileCheckedSync(fs, filePath, maxBytes) {
  switch (checkSmallFileReadableSync(fs, filePath, maxBytes).verdict) {
    case "skip":
      return null;
    case "empty":
      return "";
    case "read":
      return fs.readFileSync(filePath, {
        encoding: "utf8",
      });
  }
}
//@ chunk-gb7aq6sf.js:10294-10585 placement
async function checkSmallFileReadable(fsImplementation, filePath, maxBytes) {
  let info = {
    leaf: await fsImplementation.lstat(filePath),
  };
  for (;;) {
    let smallFileChecked = readSmallFileChecked_2(filePath, maxBytes, info);
    if ("verdict" in smallFileChecked) return smallFileChecked;
    try {
      switch (smallFileChecked.ask) {
        case "target":
          info.target = await fsImplementation.stat(filePath);
          break;
        case "resolved":
          info.resolved = await fsImplementation.realpath(filePath);
          break;
        case "named":
          info.named = await fsImplementation.stat(smallFileChecked.at);
          break;
      }
    } catch (error) {
      recordStatFailure(info, smallFileChecked.ask, error);
    }
  }
}
//@ chunk-gb7aq6sf.js:10585-10862 placement
function checkSmallFileReadableSync(fs, filePath, maxBytes) {
  let info = {
    leaf: fs.lstatSync(filePath),
  };
  for (;;) {
    let smallFileChecked = readSmallFileChecked_2(filePath, maxBytes, info);
    if ("verdict" in smallFileChecked) return smallFileChecked;
    try {
      switch (smallFileChecked.ask) {
        case "target":
          info.target = fs.statSync(filePath);
          break;
        case "resolved":
          info.resolved = fs.realpathSync(filePath);
          break;
        case "named":
          info.named = fs.statSync(smallFileChecked.at);
          break;
      }
    } catch (error) {
      recordStatFailure(info, smallFileChecked.ask, error);
    }
  }
}
//@ chunk-gb7aq6sf.js:10862-10960 placement
var FD_PATH_RE = /^\/(?:dev|proc\/[^/]+)\/fd\/\d+$/;
var DELETED_SUFFIX_RE = / \(deleted\)$/;
var PROC_OR_SYS_PATH_RE = /^\/(?:proc\/(?!version$)|sys\/)/;
//@ chunk-gb7aq6sf.js:10960-11844 placement
function readSmallFileChecked_2(filePath, maxBytes, info) {
  let isLink = info.leaf.isSymbolicLink();
  if (isLink && info.target === undefined)
    return {
      ask: "target",
    };
  let stats = info.target ?? info.leaf;
  if (!stats.isFile() || stats.size > maxBytes)
    return {
      verdict: "skip",
      st: stats,
    };
  if (getPlatform() === "windows" || (!isLink && (stats.size !== 0 || stats.nlink === 0)))
    return {
      verdict: "read",
      st: stats,
    };
  if (info.resolved === undefined && (isLink || !hasBackslash(filePath)))
    return {
      ask: "resolved",
    };
  let resolved = info.resolved ?? undefined;
  if (isLink && resolved !== undefined) {
    if (!resolved.startsWith("/") || FD_PATH_RE.test(resolved)) resolved = undefined;
    else if (
      stats.nlink === 0 ||
      DELETED_SUFFIX_RE.test(resolved) ||
      (stats.size === 0 && hasBackslash(filePath))
    ) {
      if (isSentinelInode(stats.ino)) resolved = undefined;
      else if (info.named === undefined)
        return {
          ask: "named",
          at: resolved,
        };
      else if (info.named === null || info.named.ino !== stats.ino || info.named.dev !== stats.dev)
        resolved = undefined;
    }
  }
  if (
    getDevicePathRefusal(filePath, {
      spellings: resolved === undefined ? [filePath] : [filePath, resolved],
      unresolved: false,
    }) !== undefined ||
    (resolved !== undefined && PROC_OR_SYS_PATH_RE.test(resolved))
  )
    return {
      verdict: "skip",
      st: stats,
    };
  if (resolved !== undefined)
    return {
      verdict: "read",
      st: stats,
    };
  if (!isLink)
    return {
      verdict: "empty",
      st: stats,
    };
  return {
    verdict:
      info.resolved === null && info.noNameLeft !== true && stats.size !== 0 && stats.nlink !== 0
        ? "read"
        : "skip",
    st: stats,
  };
}
//@ chunk-gb7aq6sf.js:11844-12001 placement
function recordStatFailure(info, ask, error) {
  if (ask === "target" || (info.leaf.isSymbolicLink() && !isFsInaccessible(error))) throw error;
  if (ask === "resolved") {
    info.resolved = null;
    info.noNameLeft = getErrnoCode(error) === "ENOENT";
  } else info.named = null;
}
export {
  readSmallFileOrNullSync,
  readSmallFileOrNull,
  readSmallFileChecked,
  checkSmallFileReadable,
  readSmallFileCheckedSync,
  checkSmallFileReadableSync,
};
