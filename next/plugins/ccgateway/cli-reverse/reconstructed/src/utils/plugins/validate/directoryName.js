/**
 * utils/plugins/validate/directoryName.ts
 *
 * 2.1.316 新增：插件目录校验：目录名
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6vxyfwtv.js (11)
 * attribution: placement 9, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { MAX_PATH_DISPLAY_CHARS, MAX_REPO_ROOT_PARENTS } from "./validatePluginDirectory.js";
import { ONE_MIB } from "../schemas.js";
import { countReadmeWords } from "./readmeAndListing.js";

//@ chunk-6vxyfwtv.js:20447-20590 placement (2.1.88 match: getTopLevelPaths, 0.801)
async function getTopLevelPaths(directoryPath, repositoryRoot, targetPath) {
  let currentPath = directoryPath;
  for (let segment of pathModule.relative(directoryPath, targetPath).split(pathModule.sep)) {
    currentPath = pathModule.join(currentPath, segment);
    if (!isPathInside(await realpathOrManual(currentPath), repositoryRoot)) return currentPath;
  }
  return (await findAncestorMatching(targetPath, directoryPath)) ?? targetPath;
}
//@ chunk-6vxyfwtv.js:20590-20701 layout
async function findAncestorMatching(startPath, stopPath) {
  for (let currentPath = startPath; ; currentPath = pathModule.dirname(currentPath)) {
    if (await isSymlinkPath(currentPath)) return currentPath;
    if (currentPath === stopPath || pathModule.dirname(currentPath) === currentPath) return;
  }
}
//@ chunk-6vxyfwtv.js:20701-20784 layout
async function isSymlinkPath(filePath) {
  return (
    (
      await lstat(filePath).catch(() => {
        return;
      })
    )?.isSymbolicLink() === true
  );
}
//@ chunk-6vxyfwtv.js:20784-20794 placement
var MAX_DIRECTORY_NAME_LENGTH = 40;
//@ chunk-6vxyfwtv.js:20794-20870 placement
/**
 * realpathOrManual：Windows 交叉点手算，否则 realpath。
 */
async function realpathOrManual(filePath) {
  return hasBackslash(filePath)
    ? resolvePosixPathManually(pathModule.resolve(filePath))
    : realpath(filePath).catch(() => {
        return;
      });
}
//@ chunk-6vxyfwtv.js:20870-21464 placement
/**
 * 手动逐段解析 POSIX 路径中的符号链接（限跳数）。
 */
async function resolvePosixPathManually(inputPath) {
  let parts = inputPath.split("/");
  let max = Math.max(
    0,
    parts.findIndex((part) => part.includes("\\")),
  );
  let pendingParts = parts.slice(max).reverse();
  let currentPath = await realpath(parts.slice(0, max).join("/") || "/").catch(() => {
    return;
  });
  if (currentPath === undefined) return;
  let isDirectory = true;
  let linkDepth = 0;
  while (pendingParts.length > 0) {
    let part = pendingParts.pop();
    if (part === undefined || part === "" || part === ".") continue;
    if (!isDirectory) return;
    if (part === "..") {
      currentPath = pathModule.dirname(currentPath);
      continue;
    }
    let joined = pathModule.join(currentPath, part);
    let entryStats = await lstat(joined).catch(() => {
      return;
    });
    if (entryStats === undefined) return;
    if (!entryStats.isSymbolicLink()) {
      currentPath = joined;
      isDirectory = entryStats.isDirectory();
      continue;
    }
    linkDepth++;
    let linkTarget = await readlink(joined).catch(() => {
      return;
    });
    if (linkDepth > MAX_DIRECTORY_NAME_LENGTH || linkTarget === undefined) return;
    if (linkTarget.startsWith("/")) currentPath = "/";
    pendingParts.push(...linkTarget.split("/").reverse());
  }
  return currentPath;
}
//@ chunk-6vxyfwtv.js:21464-21609 placement
function isPathInside(innerPath, outerPath) {
  if (innerPath === undefined || outerPath === undefined) return false;
  let relativePath = pathModule.relative(outerPath, innerPath);
  return (
    relativePath === "" ||
    (relativePath !== ".." &&
      !relativePath.startsWith(`..${pathModule.sep}`) &&
      !pathModule.isAbsolute(relativePath))
  );
}
//@ chunk-6vxyfwtv.js:21609-21657 placement
function ensureTrailingDot(name) {
  return name.endsWith(".") ? name : `${name}.`;
}
//@ chunk-6vxyfwtv.js:21657-21737 placement
var NAME_FORMAT_ISSUE_TEXT = "MANIFEST_NAME_FORMAT, MANIFEST_NAME_NOT_KEBAB and IDENTIFIER_NON_ASCII";
//@ chunk-6vxyfwtv.js:21737-24427 placement
function describeLinkedReadme(searchResult, folderName, listedName, readmeInfo) {
  if (searchResult === undefined) return [];
  if (searchResult.kind === "link" || searchResult.kind === "unresolved") {
    let unlistedNote = `so no README or license at a repository root was used${listedName === undefined ? "" : ` and the name the directory would list this folder under is not known. The directory's rules for that name (${NAME_FORMAT_ISSUE_TEXT}) were not checked`}`;
    if (searchResult.kind === "unresolved")
      return [
        `Stopped looking for a repository root at ${extractToolInputForTelemetry(searchResult.dir, MAX_PATH_DISPLAY_CHARS)}, because this command could not find where that folder really is on disk (a folder on the path may not be readable, or its links may loop), ${unlistedNote}. Check that every folder on that path exists and can be opened, then run this command again.`,
      ];
    let realPathNote = `the plugin folder's real path, ${extractToolInputForTelemetry(searchResult.realPlugin, MAX_PATH_DISPLAY_CHARS)}`;
    return [
      `Stopped looking for a repository root at ${extractToolInputForTelemetry(searchResult.dir, MAX_PATH_DISPLAY_CHARS)}, a symbolic link inside the repository at ${extractToolInputForTelemetry(searchResult.repository, MAX_PATH_DISPLAY_CHARS)} that leads out of it, ${unlistedNote}. If this plugin is in a git repository, run this command on ${realPathNote}.`,
    ];
  }
  if (searchResult.kind === "parent") {
    let parentNotes = [
      ...(listedName === undefined
        ? []
        : [
            `Because this folder is below a repository root, the directory lists it under the last part of its path, ${quoteForDisplay(folderName)}. To change the name, rename the folder or add .claude-plugin/plugin.json with a "name".`,
          ]),
      ...(readmeInfo.used.length === 0
        ? []
        : [
            `${extractToolInputForTelemetry(readmeInfo.used.join(" and "), 300)} ${readmeInfo.used.length === 1 ? "was" : "were"} taken from it, because this plugin folder has none of its own.`,
          ]),
      ...(readmeInfo.notFound.length === 0
        ? []
        : [
            `No ${readmeInfo.notFound.join(" or ")} that counts (a regular file with one of the file names the plugin directory accepts) was found there either.`,
          ]),
    ];
    return parentNotes.length === 0
      ? []
      : [
          `The repository root was taken to be ${extractToolInputForTelemetry(searchResult.dir, MAX_PATH_DISPLAY_CHARS)}, the nearest parent folder with a .git folder or file. ${parentNotes.join(" ")} For a plugin submitted from a git repository, the repository root is the top folder of that repository, with only what is committed there, so check that the folder named above is that top folder.`,
        ];
  }
  if (listedName === undefined) return [];
  let uncheckedNote = ` The directory's rules for that name (${NAME_FORMAT_ISSUE_TEXT}) were not checked.`;
  if (searchResult.kind === "own")
    return [
      `This folder holds a .git entry, so it is its own repository root, and the directory lists it under the repository's name, which this command cannot know.${uncheckedNote} Check that the repository's name is lowercase letters, digits and single hyphens.`,
    ];
  let nameIssues = checkDerivedName(folderName);
  return [
    `No repository root was found for this folder (the search looks for a .git folder or file in it and in up to ${MAX_REPO_ROOT_PARENTS} parents, and stops at a .git of any other kind), so the name the directory would list it under is not known.${uncheckedNote} Submitted as a sub-folder under its present name, ${quoteForDisplay(folderName)}, ${nameIssues.length === 0 ? "none of them would apply." : `it would draw: ${ensureTrailingDot(nameIssues.map((issue) => `${issue.code}: ${issue.message}`).join("; "))} Rename the folder, or add .claude-plugin/plugin.json with a valid "name".`}`,
  ];
}
//@ chunk-6vxyfwtv.js:24427-24675 placement
async function readFirstDoc(rootDir, candidateNames, fromRepositoryRoot) {
  for (let candidateName of candidateNames) {
    let pluginFile = await readPluginFileSafe(rootDir, candidateName, ONE_MIB);
    if (pluginFile.found) {
      let text = pluginFile.bytes?.toString("utf-8") ?? "";
      return {
        displayPath: candidateName,
        text,
        words: countReadmeWords(text),
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
