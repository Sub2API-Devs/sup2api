/**
 * utils/sessionStateCwd.ts
 *
 * 会话状态里的相对 cwd：把绝对路径压成相对会话根的类型化字符串，并校验目录未变成符号链接（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-v7p9necf.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { relative, sep, join, dirname } from "path";
import { hasBeenInWorktree } from "./concurrentSessions.js";
import { callFrameCwd, realPathOutcomeSync, callFramePhysicalCwd } from "./cwd.js";
import { getFsImplementation } from "./fsOperations.js";
import { countCharInString } from "./stringUtils.js";
import { getErrnoCode } from "./errors.js";
import { logError } from "./log.js";
import { logForDebugging } from "./debug.js";
import { identity } from "./pathClassification.js";

//@ chunk-v7p9necf.js:881-897 placement
var MAX_DIR_CHARS = 1024;
var EMPTY_DIR_TEXT = "";
//@ chunk-v7p9necf.js:897-935 placement
/**
 * 会话状态里的 cwd 仅在非 reduced 情况下保存；utils/queryHelpers 等使用。
 */
function askerDirIfNotWorktree(projectRoot) {
  return hasBeenInWorktree() ? undefined : projectRoot;
}
//@ chunk-v7p9necf.js:935-1094 placement
/**
 * 把绝对路径压成相对会话根的 cwd 字符串（用 / 分隔）。
 */
function relativeToCallFrame(from) {
  let cwd = callFrameCwd();
  let base = from === undefined ? undefined : realIfPresent(from, realPathOutcomeSync(from));
  let target = cwd === undefined ? undefined : realIfPresent(cwd, callFramePhysicalCwd());
  return base === undefined || target === undefined
    ? undefined
    : relative(base, target).split(sep).join("/") || ".";
}
//@ chunk-v7p9necf.js:1094-1175 placement
/**
 * 限制 cwd 字符串长度 1024，超长返回空串。
 */
function askedInDirectoryOf(askedInDirectory) {
  if (askedInDirectory === undefined) return;
  return typeof askedInDirectory === "string" && askedInDirectory.length <= MAX_DIR_CHARS
    ? askedInDirectory
    : EMPTY_DIR_TEXT;
}
//@ chunk-v7p9necf.js:1175-1322 placement
/**
 * 校验并拼出 cwd 的子路径，含控制字符或非法段返回 undefined。
 */
function resolveAskedDir(base, askedInDirectory) {
  if (askedInDirectory === ".") return base;
  let parts = askedInDirectory.split("/");
  return parts.every(
    (part) => part !== "" && part !== "." && part !== ".." && !part.includes("\\") && !hasControlChars(part),
  )
    ? join(base, ...parts)
    : undefined;
}
//@ chunk-v7p9necf.js:1322-1732 placement
/**
 * 迟到批准时校验 cwd 仍是真目录且路径上没有符号链接。
 */
function directoryStillUnchanged(base, askedInDirectory) {
  let cwd = callFrameCwd();
  if (cwd === undefined || relativeToCallFrame(base) !== askedInDirectory) return false;
  try {
    if (askedInDirectory === ".") return getFsImplementation().statSync(cwd).isDirectory();
    let dir = cwd;
    for (let j = countCharInString(askedInDirectory, "/") + 1; j > 0; j--) {
      if (!getFsImplementation().lstatSync(dir).isDirectory()) return false;
      dir = dirname(dir);
    }
    return true;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === undefined) logError(error);
    else
      logForDebugging(
        `Late-approved call not run: could not examine its directory ${cwd} (${errnoCode}), so a symbolic link in it cannot be ruled out`,
        {
          level: "warn",
        },
      );
    return false;
  }
}
//@ chunk-v7p9necf.js:1732-1793 placement
function realIfPresent(value, realPath) {
  if (realPath === undefined) return value;
  return realPath ? identity(realPath) : undefined;
}
//@ chunk-v7p9necf.js:1793-1892 placement
function hasControlChars(text) {
  for (let j = 0; j < text.length; j++) {
    let code = text.charCodeAt(j);
    if (code < 32 || code === 127) return true;
  }
  return false;
}
export {
  relativeToCallFrame,
  askerDirIfNotWorktree,
  askedInDirectoryOf,
  resolveAskedDir,
  directoryStillUnchanged,
};
