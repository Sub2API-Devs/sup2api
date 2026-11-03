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
import { rc } from "./pathClassification.js";
import { isSentinelInode } from "./slowOperations.js";
import { getDevicePathRefusal } from "../tools/FileReadTool/FileReadTool.js";

//@ chunk-qg0af0yq.js:9673-9827 placement
async function readSmallFileOrNull(e, n, t) {
  try {
    let r = await lstat(e);
    if (!r.isFile() || r.size > n) return (t?.(), null);
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
async function readSmallFileChecked(e, n, t, r) {
  let { verdict: verdict, st: st } = await checkSmallFileReadable(e, n, t);
  switch (verdict) {
    case "skip":
      return (r?.(st), null);
    case "empty":
      return "";
    case "read":
      return await e.readFile(n, { encoding: "utf8" });
  }
}
//@ chunk-qg0af0yq.js:10119-10265 placement
function readSmallFileCheckedSync(e, n, t) {
  switch (checkSmallFileReadableSync(e, n, t).verdict) {
    case "skip":
      return null;
    case "empty":
      return "";
    case "read":
      return e.readFileSync(n, { encoding: "utf8" });
  }
}
//@ chunk-qg0af0yq.js:10265-10556 placement
async function checkSmallFileReadable(e, n, t) {
  let r = { leaf: await e.lstat(n) };
  for (;;) {
    let i = readSmallFileChecked_2(n, t, r);
    if ("verdict" in i) return i;
    try {
      switch (i.ask) {
        case "target":
          r.target = await e.stat(n);
          break;
        case "resolved":
          r.resolved = await e.realpath(n);
          break;
        case "named":
          r.named = await e.stat(i.at);
          break;
      }
    } catch (error) {
      recordStatFailure(r, i.ask, error);
    }
  }
}
//@ chunk-qg0af0yq.js:10556-10833 placement
function checkSmallFileReadableSync(e, n, t) {
  let r = { leaf: e.lstatSync(n) };
  for (;;) {
    let i = readSmallFileChecked_2(n, t, r);
    if ("verdict" in i) return i;
    try {
      switch (i.ask) {
        case "target":
          r.target = e.statSync(n);
          break;
        case "resolved":
          r.resolved = e.realpathSync(n);
          break;
        case "named":
          r.named = e.statSync(i.at);
          break;
      }
    } catch (error) {
      recordStatFailure(r, i.ask, error);
    }
  }
}
//@ chunk-qg0af0yq.js:10833-10931 placement
var Cn = /^\/(?:dev|proc\/[^/]+)\/fd\/\d+$/,
  An = / \(deleted\)$/,
  Pn = /^\/(?:proc\/(?!version$)|sys\/)/;
//@ chunk-qg0af0yq.js:10931-11815 placement
function readSmallFileChecked_2(e, n, t) {
  let isSymbolicLink = t.leaf.isSymbolicLink();
  if (isSymbolicLink && t.target === void 0) return { ask: "target" };
  let i = t.target ?? t.leaf;
  if (!i.isFile() || i.size > n) return { verdict: "skip", st: i };
  if (getPlatform() === "windows" || (!isSymbolicLink && (i.size !== 0 || i.nlink === 0)))
    return { verdict: "read", st: i };
  if (t.resolved === void 0 && (isSymbolicLink || !rc(e))) return { ask: "resolved" };
  let s = t.resolved ?? void 0;
  if (isSymbolicLink && s !== void 0) {
    if (!s.startsWith("/") || Cn.test(s)) s = void 0;
    else if (i.nlink === 0 || An.test(s) || (i.size === 0 && rc(e))) {
      if (isSentinelInode(i.ino)) s = void 0;
      else if (t.named === void 0) return { ask: "named", at: s };
      else if (t.named === null || t.named.ino !== i.ino || t.named.dev !== i.dev) s = void 0;
    }
  }
  if (
    getDevicePathRefusal(e, { spellings: s === void 0 ? [e] : [e, s], unresolved: !1 }) !== void 0 ||
    (s !== void 0 && Pn.test(s))
  )
    return { verdict: "skip", st: i };
  if (s !== void 0) return { verdict: "read", st: i };
  if (!isSymbolicLink) return { verdict: "empty", st: i };
  return {
    verdict: t.resolved === null && t.noNameLeft !== !0 && i.size !== 0 && i.nlink !== 0 ? "read" : "skip",
    st: i,
  };
}
//@ chunk-qg0af0yq.js:11815-11972 placement
function recordStatFailure(e, n, t) {
  if (n === "target" || (e.leaf.isSymbolicLink() && !isFsInaccessible(t))) throw t;
  if (n === "resolved") ((e.resolved = null), (e.noNameLeft = getErrnoCode(t) === "ENOENT"));
  else e.named = null;
}

export {
  readSmallFileChecked,
  readSmallFileCheckedSync,
  readSmallFileOrNull,
  readSmallFileOrNullSync,
  checkSmallFileReadable,
  checkSmallFileReadableSync,
};
