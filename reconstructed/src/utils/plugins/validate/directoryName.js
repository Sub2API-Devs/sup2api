/**
 * utils/plugins/validate/directoryName.ts
 *
 * 2.1.316 新增：插件目录校验：目录名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5aas12zq.js (11)
 * attribution: placement 9, layout 2
 */
import * as pathModule from "path";
import { lstat, realpath, readlink } from "fs/promises";
import { hasBackslash } from "../../pathClassification.js";
import {
  extractToolInputForTelemetry,
  quoteForDisplay,
  checkDerivedName,
  readPluginFileSafe,
} from "./helpers.js";
import { MAX_FIELD_CHARS, SYSTEM_FILE_GIT_NOTE } from "./validatePluginDirectory.js";
import { ONE_MIB } from "../schemas.js";
import { countReadmeWords } from "./readmeAndListing.js";

//@ chunk-5aas12zq.js:20183-20326 placement = getTopLevelPaths (0.8)
async function getTopLevelPaths(e, n, t) {
  let r = e;
  for (let s of pathModule.relative(e, t).split(pathModule.sep)) {
    r = pathModule.join(r, s);
    if (!isPathInside(await realpathOrManual(r), n)) return r;
  }
  return (await findAncestorMatching(t, e)) ?? t;
}
//@ chunk-5aas12zq.js:20326-20437 layout
async function findAncestorMatching(e, n) {
  for (let t = e; ; t = pathModule.dirname(t)) {
    if (await isSymlinkPath(t)) return t;
    if (t === n || pathModule.dirname(t) === t) return;
  }
}
//@ chunk-5aas12zq.js:20437-20520 layout
async function isSymlinkPath(e) {
  return (
    (
      await lstat(e).catch(() => {
        return;
      })
    )?.isSymbolicLink() === true
  );
}
//@ chunk-5aas12zq.js:20520-20530 placement
var MAX_DIRECTORY_NAME_LENGTH = 40;
//@ chunk-5aas12zq.js:20530-20606 placement
/**
 * realpathOrManual：Windows 交叉点手算，否则 realpath。
 */
async function realpathOrManual(e) {
  return hasBackslash(e)
    ? resolvePosixPathManually(pathModule.resolve(e))
    : realpath(e).catch(() => {
        return;
      });
}
//@ chunk-5aas12zq.js:20606-21200 placement
/**
 * 手动逐段解析 POSIX 路径中的符号链接（限跳数）。
 */
async function resolvePosixPathManually(e) {
  let parts = e.split("/");
  let max = Math.max(
    0,
    parts.findIndex((l) => l.includes("\\")),
  );
  let r = parts.slice(max).reverse();
  let s = await realpath(parts.slice(0, max).join("/") || "/").catch(() => {
    return;
  });
  if (s === undefined) return;
  let o = true;
  let a = 0;
  while (r.length > 0) {
    let l = r.pop();
    if (l === undefined || l === "" || l === ".") continue;
    if (!o) return;
    if (l === "..") {
      s = pathModule.dirname(s);
      continue;
    }
    let joined = pathModule.join(s, l);
    let f = await lstat(joined).catch(() => {
      return;
    });
    if (f === undefined) return;
    if (!f.isSymbolicLink()) {
      s = joined;
      o = f.isDirectory();
      continue;
    }
    a++;
    let p = await readlink(joined).catch(() => {
      return;
    });
    if (a > MAX_DIRECTORY_NAME_LENGTH || p === undefined) return;
    if (p.startsWith("/")) s = "/";
    r.push(...p.split("/").reverse());
  }
  return s;
}
//@ chunk-5aas12zq.js:21200-21345 placement
function isPathInside(e, n) {
  if (e === undefined || n === undefined) return false;
  let relativePath = pathModule.relative(n, e);
  return (
    relativePath === "" ||
    (relativePath !== ".." &&
      !relativePath.startsWith(`..${pathModule.sep}`) &&
      !pathModule.isAbsolute(relativePath))
  );
}
//@ chunk-5aas12zq.js:21345-21393 placement
function ensureTrailingDot(e) {
  return e.endsWith(".") ? e : `${e}.`;
}
//@ chunk-5aas12zq.js:21393-21473 placement
var NAME_FORMAT_ISSUE_TEXT = "MANIFEST_NAME_FORMAT, MANIFEST_NAME_NOT_KEBAB and IDENTIFIER_NON_ASCII";
//@ chunk-5aas12zq.js:21473-24163 placement
function describeLinkedReadme(e, n, t, r) {
  if (e === undefined) return [];
  if (e.kind === "link" || e.kind === "unresolved") {
    let a = `so no README or license at a repository root was used${t === undefined ? "" : ` and the name the directory would list this folder under is not known. The directory's rules for that name (${NAME_FORMAT_ISSUE_TEXT}) were not checked`}`;
    if (e.kind === "unresolved")
      return [
        `Stopped looking for a repository root at ${extractToolInputForTelemetry(e.dir, MAX_FIELD_CHARS)}, because this command could not find where that folder really is on disk (a folder on the path may not be readable, or its links may loop), ${a}. Check that every folder on that path exists and can be opened, then run this command again.`,
      ];
    let l = `the plugin folder's real path, ${extractToolInputForTelemetry(e.realPlugin, MAX_FIELD_CHARS)}`;
    return [
      `Stopped looking for a repository root at ${extractToolInputForTelemetry(e.dir, MAX_FIELD_CHARS)}, a symbolic link inside the repository at ${extractToolInputForTelemetry(e.repository, MAX_FIELD_CHARS)} that leads out of it, ${a}. If this plugin is in a git repository, run this command on ${l}.`,
    ];
  }
  if (e.kind === "parent") {
    let a = [
      ...(t === undefined
        ? []
        : [
            `Because this folder is below a repository root, the directory lists it under the last part of its path, ${quoteForDisplay(n)}. To change the name, rename the folder or add .claude-plugin/plugin.json with a "name".`,
          ]),
      ...(r.used.length === 0
        ? []
        : [
            `${extractToolInputForTelemetry(r.used.join(" and "), 300)} ${r.used.length === 1 ? "was" : "were"} taken from it, because this plugin folder has none of its own.`,
          ]),
      ...(r.notFound.length === 0
        ? []
        : [
            `No ${r.notFound.join(" or ")} that counts (a regular file with one of the file names the plugin directory accepts) was found there either.`,
          ]),
    ];
    return a.length === 0
      ? []
      : [
          `The repository root was taken to be ${extractToolInputForTelemetry(e.dir, MAX_FIELD_CHARS)}, the nearest parent folder with a .git folder or file. ${a.join(" ")} For a plugin submitted from a git repository, the repository root is the top folder of that repository, with only what is committed there, so check that the folder named above is that top folder.`,
        ];
  }
  if (t === undefined) return [];
  let s = ` The directory's rules for that name (${NAME_FORMAT_ISSUE_TEXT}) were not checked.`;
  if (e.kind === "own")
    return [
      `This folder holds a .git entry, so it is its own repository root, and the directory lists it under the repository's name, which this command cannot know.${s} Check that the repository's name is lowercase letters, digits and single hyphens.`,
    ];
  let o = checkDerivedName(n);
  return [
    `No repository root was found for this folder (the search looks for a .git folder or file in it and in up to ${SYSTEM_FILE_GIT_NOTE} parents, and stops at a .git of any other kind), so the name the directory would list it under is not known.${s} Submitted as a sub-folder under its present name, ${quoteForDisplay(n)}, ${o.length === 0 ? "none of them would apply." : `it would draw: ${ensureTrailingDot(o.map((a) => `${a.code}: ${a.message}`).join("; "))} Rename the folder, or add .claude-plugin/plugin.json with a valid "name".`}`,
  ];
}
//@ chunk-5aas12zq.js:24163-24411 placement
async function readFirstDoc(e, n, fromRepositoryRoot) {
  for (let r of n) {
    let pluginFile = await readPluginFileSafe(e, r, ONE_MIB);
    if (pluginFile.found) {
      let o = pluginFile.bytes?.toString("utf-8") ?? "";
      return {
        displayPath: r,
        text: o,
        words: countReadmeWords(o),
        ...(pluginFile.bytes === undefined && {
          unread: pluginFile.tooLarge ? "too-large" : "unreadable",
        }),
        fromRepositoryRoot,
      };
    }
  }
  return;
}
export { readFirstDoc, describeLinkedReadme, realpathOrManual, isPathInside, getTopLevelPaths };
