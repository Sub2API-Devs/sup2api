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
import { rc } from "../../pathClassification.js";
import {
  extractToolInputForTelemetry,
  quoteForDisplay,
  checkDerivedName,
  readPluginFileSafe,
} from "./helpers.js";
import { j, $e } from "./validatePluginDirectory.js";
import { ONE_MIB } from "../schemas.js";
import { countReadmeWords } from "./readmeAndListing.js";

//@ chunk-5aas12zq.js:20183-20326 placement = getTopLevelPaths (0.8)
async function getTopLevelPaths(e, n, t) {
  let r = e;
  for (let s of pathModule.relative(e, t).split(pathModule.sep))
    if (((r = pathModule.join(r, s)), !isPathInside(await H(r), n))) return r;
  return (await findAncestorMatching(t, e)) ?? t;
}
//@ chunk-5aas12zq.js:20326-20437 layout
async function findAncestorMatching(e, n) {
  for (let t = e; ; t = pathModule.dirname(t)) {
    if (await Un(t)) return t;
    if (t === n || pathModule.dirname(t) === t) return;
  }
}
//@ chunk-5aas12zq.js:20437-20520 layout
async function Un(e) {
  return (
    (
      await lstat(e).catch(() => {
        return;
      })
    )?.isSymbolicLink() === !0
  );
}
//@ chunk-5aas12zq.js:20520-20530 placement
var jn = 40;
//@ chunk-5aas12zq.js:20530-20606 placement
async function H(e) {
  return rc(e)
    ? resolvePosixPathManually(pathModule.resolve(e))
    : realpath(e).catch(() => {
        return;
      });
}
/**
 * 手动逐段解析 POSIX 路径中的符号链接（限跳数）。
 */
//@ chunk-5aas12zq.js:20606-21200 placement
async function resolvePosixPathManually(e) {
  let parts = e.split("/"),
    max = Math.max(
      0,
      parts.findIndex((l) => l.includes("\\")),
    ),
    reverse = parts.slice(max).reverse(),
    s = await realpath(parts.slice(0, max).join("/") || "/").catch(() => {
      return;
    });
  if (s === void 0) return;
  let o = !0,
    a = 0;
  while (reverse.length > 0) {
    let l = reverse.pop();
    if (l === void 0 || l === "" || l === ".") continue;
    if (!o) return;
    if (l === "..") {
      s = pathModule.dirname(s);
      continue;
    }
    let joined = pathModule.join(s, l),
      f = await lstat(joined).catch(() => {
        return;
      });
    if (f === void 0) return;
    if (!f.isSymbolicLink()) {
      ((s = joined), (o = f.isDirectory()));
      continue;
    }
    a++;
    let p = await readlink(joined).catch(() => {
      return;
    });
    if (a > jn || p === void 0) return;
    if (p.startsWith("/")) s = "/";
    reverse.push(...p.split("/").reverse());
  }
  return s;
}
//@ chunk-5aas12zq.js:21200-21345 placement
function isPathInside(e, n) {
  if (e === void 0 || n === void 0) return !1;
  let relativePath = pathModule.relative(n, e);
  return (
    relativePath === "" ||
    (relativePath !== ".." &&
      !relativePath.startsWith(`..${pathModule.sep}`) &&
      !pathModule.isAbsolute(relativePath))
  );
}
//@ chunk-5aas12zq.js:21345-21393 placement
function Bn(e) {
  return e.endsWith(".") ? e : `${e}.`;
}
//@ chunk-5aas12zq.js:21393-21473 placement
var Ie = "MANIFEST_NAME_FORMAT, MANIFEST_NAME_NOT_KEBAB and IDENTIFIER_NON_ASCII";
//@ chunk-5aas12zq.js:21473-24163 placement
function describeLinkedReadme(e, n, t, r) {
  if (e === void 0) return [];
  if (e.kind === "link" || e.kind === "unresolved") {
    let a = `so no README or license at a repository root was used${t === void 0 ? "" : ` and the name the directory would list this folder under is not known. The directory's rules for that name (${Ie}) were not checked`}`;
    if (e.kind === "unresolved")
      return [
        `Stopped looking for a repository root at ${extractToolInputForTelemetry(e.dir, j)}, because this command could not find where that folder really is on disk (a folder on the path may not be readable, or its links may loop), ${a}. Check that every folder on that path exists and can be opened, then run this command again.`,
      ];
    let l = `the plugin folder's real path, ${extractToolInputForTelemetry(e.realPlugin, j)}`;
    return [
      `Stopped looking for a repository root at ${extractToolInputForTelemetry(e.dir, j)}, a symbolic link inside the repository at ${extractToolInputForTelemetry(e.repository, j)} that leads out of it, ${a}. If this plugin is in a git repository, run this command on ${l}.`,
    ];
  }
  if (e.kind === "parent") {
    let a = [
      ...(t === void 0
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
          `The repository root was taken to be ${extractToolInputForTelemetry(e.dir, j)}, the nearest parent folder with a .git folder or file. ${a.join(" ")} For a plugin submitted from a git repository, the repository root is the top folder of that repository, with only what is committed there, so check that the folder named above is that top folder.`,
        ];
  }
  if (t === void 0) return [];
  let s = ` The directory's rules for that name (${Ie}) were not checked.`;
  if (e.kind === "own")
    return [
      `This folder holds a .git entry, so it is its own repository root, and the directory lists it under the repository's name, which this command cannot know.${s} Check that the repository's name is lowercase letters, digits and single hyphens.`,
    ];
  let o = checkDerivedName(n);
  return [
    `No repository root was found for this folder (the search looks for a .git folder or file in it and in up to ${$e} parents, and stops at a .git of any other kind), so the name the directory would list it under is not known.${s} Submitted as a sub-folder under its present name, ${quoteForDisplay(n)}, ${o.length === 0 ? "none of them would apply." : `it would draw: ${Bn(o.map((a) => `${a.code}: ${a.message}`).join("; "))} Rename the folder, or add .claude-plugin/plugin.json with a valid "name".`}`,
  ];
}
//@ chunk-5aas12zq.js:24163-24411 placement
async function readFirstDoc(e, n, t) {
  for (let r of n) {
    let s = await readPluginFileSafe(e, r, ONE_MIB);
    if (s.found) {
      let o = s.bytes?.toString("utf-8") ?? "";
      return {
        displayPath: r,
        text: o,
        words: countReadmeWords(o),
        ...(s.bytes === void 0 && { unread: s.tooLarge ? "too-large" : "unreadable" }),
        fromRepositoryRoot: t,
      };
    }
  }
  return;
}

export { readFirstDoc, describeLinkedReadme, H, isPathInside, getTopLevelPaths };
