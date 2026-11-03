/**
 * utils/readSmallFile.ts
 *
 * 小文件安全读取（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qg0af0yq.js (9)
 * attribution: placement 9
 */
import { lstat, readFile } from "fs/promises";
import { lstatSync, readFileSync } from "fs";
import { isPathAbsent, isFsInaccessible, getErrnoCode } from "./errors.js";
import { getPlatform } from "./platform.js";
import { hasBackslash } from "./pathClassification.js";
import { isSentinelInode } from "./slowOperations.js";
import { getDevicePathRefusal } from "../tools/FileReadTool/FileReadTool.js";

//@ chunk-qg0af0yq.js:9673-9827 placement
async function readSmallFileOrNull(e, n, t) {
  try {
    let r = await lstat(e);
    if (!r.isFile() || r.size > n) {
      t?.();
      return null;
    }
    return await readFile(e, "utf8");
  } catch (error) {
    if (!isPathAbsent(error)) t?.();
    return null;
  }
}
//@ chunk-qg0af0yq.js:9827-9937 placement
function readSmallFileOrNullSync(e, n) {
  try {
    let t = lstatSync(e);
    if (!t.isFile() || t.size > n) return null;
    return readFileSync(e, "utf8");
  } catch {
    return null;
  }
}
//@ chunk-qg0af0yq.js:9937-10119 placement
async function readSmallFileChecked(fsImplementation, n, t, r) {
  let { verdict, st } = await checkSmallFileReadable(fsImplementation, n, t);
  switch (verdict) {
    case "skip":
      r?.(st);
      return null;
    case "empty":
      return "";
    case "read":
      return await fsImplementation.readFile(n, {
        encoding: "utf8",
      });
  }
}
//@ chunk-qg0af0yq.js:10119-10265 placement
function readSmallFileCheckedSync(e, filePath, t) {
  switch (checkSmallFileReadableSync(e, filePath, t).verdict) {
    case "skip":
      return null;
    case "empty":
      return "";
    case "read":
      return e.readFileSync(filePath, {
        encoding: "utf8",
      });
  }
}
//@ chunk-qg0af0yq.js:10265-10556 placement
async function checkSmallFileReadable(fsImplementation, n, t) {
  let r = {
    leaf: await fsImplementation.lstat(n),
  };
  for (;;) {
    let smallFileChecked = readSmallFileChecked_2(n, t, r);
    if ("verdict" in smallFileChecked) return smallFileChecked;
    try {
      switch (smallFileChecked.ask) {
        case "target":
          r.target = await fsImplementation.stat(n);
          break;
        case "resolved":
          r.resolved = await fsImplementation.realpath(n);
          break;
        case "named":
          r.named = await fsImplementation.stat(smallFileChecked.at);
          break;
      }
    } catch (error) {
      recordStatFailure(r, smallFileChecked.ask, error);
    }
  }
}
//@ chunk-qg0af0yq.js:10556-10833 placement
function checkSmallFileReadableSync(e, n, t) {
  let r = {
    leaf: e.lstatSync(n),
  };
  for (;;) {
    let smallFileChecked = readSmallFileChecked_2(n, t, r);
    if ("verdict" in smallFileChecked) return smallFileChecked;
    try {
      switch (smallFileChecked.ask) {
        case "target":
          r.target = e.statSync(n);
          break;
        case "resolved":
          r.resolved = e.realpathSync(n);
          break;
        case "named":
          r.named = e.statSync(smallFileChecked.at);
          break;
      }
    } catch (error) {
      recordStatFailure(r, smallFileChecked.ask, error);
    }
  }
}
//@ chunk-qg0af0yq.js:10833-10931 placement
var FD_PATH_RE = /^\/(?:dev|proc\/[^/]+)\/fd\/\d+$/;
var DELETED_SUFFIX_RE = / \(deleted\)$/;
var PROC_OR_SYS_PATH_RE = /^\/(?:proc\/(?!version$)|sys\/)/;
//@ chunk-qg0af0yq.js:10931-11815 placement
function readSmallFileChecked_2(e, n, t) {
  let r = t.leaf.isSymbolicLink();
  if (r && t.target === undefined)
    return {
      ask: "target",
    };
  let i = t.target ?? t.leaf;
  if (!i.isFile() || i.size > n)
    return {
      verdict: "skip",
      st: i,
    };
  if (getPlatform() === "windows" || (!r && (i.size !== 0 || i.nlink === 0)))
    return {
      verdict: "read",
      st: i,
    };
  if (t.resolved === undefined && (r || !hasBackslash(e)))
    return {
      ask: "resolved",
    };
  let resolved = t.resolved ?? undefined;
  if (r && resolved !== undefined) {
    if (!resolved.startsWith("/") || FD_PATH_RE.test(resolved)) resolved = undefined;
    else if (i.nlink === 0 || DELETED_SUFFIX_RE.test(resolved) || (i.size === 0 && hasBackslash(e))) {
      if (isSentinelInode(i.ino)) resolved = undefined;
      else if (t.named === undefined)
        return {
          ask: "named",
          at: resolved,
        };
      else if (t.named === null || t.named.ino !== i.ino || t.named.dev !== i.dev) resolved = undefined;
    }
  }
  if (
    getDevicePathRefusal(e, {
      spellings: resolved === undefined ? [e] : [e, resolved],
      unresolved: false,
    }) !== undefined ||
    (resolved !== undefined && PROC_OR_SYS_PATH_RE.test(resolved))
  )
    return {
      verdict: "skip",
      st: i,
    };
  if (resolved !== undefined)
    return {
      verdict: "read",
      st: i,
    };
  if (!r)
    return {
      verdict: "empty",
      st: i,
    };
  return {
    verdict: t.resolved === null && t.noNameLeft !== true && i.size !== 0 && i.nlink !== 0 ? "read" : "skip",
    st: i,
  };
}
//@ chunk-qg0af0yq.js:11815-11972 placement
function recordStatFailure(e, n, error) {
  if (n === "target" || (e.leaf.isSymbolicLink() && !isFsInaccessible(error))) throw error;
  if (n === "resolved") {
    e.resolved = null;
    e.noNameLeft = getErrnoCode(error) === "ENOENT";
  } else e.named = null;
}
export {
  readSmallFileChecked,
  readSmallFileCheckedSync,
  readSmallFileOrNull,
  readSmallFileOrNullSync,
  checkSmallFileReadable,
  checkSmallFileReadableSync,
};
