/**
 * utils/git/gitDirProbe.ts
 *
 * 判定一个路径是否 git 仓库/裸库/`.git` 文件间接指向的仓库：检查 HEAD/objects/refs 与 gitdir 内容，供 runner 与 worktree 逻辑使用（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rmtfpbze.js (11)
 * attribution: placement 11
 */
import { lstat, statfs, open, realpath } from "fs/promises";
import { join, dirname } from "path";
import { constants } from "fs";
import { countWhere } from "../collections.js";
import { isPathAbsent, getErrnoCode, isFsInaccessible, toError } from "../errors.js";
import { isNetworkMountRoot_2 } from "../networkPaths.js";
import { getPlatform } from "../platform.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../fsFlags.js";
import { logError } from "../log.js";

//@ chunk-rmtfpbze.js:555-605 placement
var GIT_ENTRY_NAMES = {
  head: "HEAD",
  objects: "objects",
  refs: "refs",
};
//@ chunk-rmtfpbze.js:605-792 placement
function looksLikeGitDir(entries) {
  let hasHead = false;
  let hasObjects = false;
  let hasRefs = false;
  for (let entry of entries) {
    let isDirish = entry.isDirectory || entry.isSymbolicLink;
    hasHead ||= entry.name === GIT_ENTRY_NAMES.head && !entry.isDirectory;
    hasObjects ||= entry.name === GIT_ENTRY_NAMES.objects && isDirish;
    hasRefs ||= entry.name === GIT_ENTRY_NAMES.refs && isDirish;
  }
  return hasHead && hasObjects && hasRefs;
}
//@ chunk-rmtfpbze.js:792-953 placement
/**
 * git 目录里除 HEAD/config 外的其它标记文件清单。
 */
var GIT_FILES_ALWAYS_ALLOWED = ["commondir", "packed-refs", "FETCH_HEAD", "ORIG_HEAD"];
var GIT_REQUIRED_FILES = [
  GIT_ENTRY_NAMES.head,
  "config",
  "config.worktree",
  "config.lock",
  "config.worktree.lock",
];
var GIT_OPTIONAL_FILES = [...GIT_FILES_ALWAYS_ALLOWED, "description"];
//@ chunk-rmtfpbze.js:953-1270 placement
/**
 * 判定目录是否像由 .git 文件指向的仓库目录（弱证据）。
 */
async function isGitRepoDir(dir) {
  let results = await Promise.all(
    GIT_REQUIRED_FILES.map((name) => generateSettingsJSONSchema(dir, name, "file")),
  );
  if (!results.includes(true)) return false;
  let [optionalResults, [objectsExists, refsExists]] = await Promise.all([
    Promise.all(GIT_OPTIONAL_FILES.map((name) => generateSettingsJSONSchema(dir, name, "file"))),
    Promise.all(
      [GIT_ENTRY_NAMES.objects, GIT_ENTRY_NAMES.refs].map((name) =>
        generateSettingsJSONSchema(dir, name, "any"),
      ),
    ),
  ]);
  return (
    countWhere(results, (ok) => ok) > 1 ||
    optionalResults.includes(true) ||
    (objectsExists === true && refsExists === true) ||
    (results[GIT_REQUIRED_FILES.indexOf(GIT_ENTRY_NAMES.head)] === true && refsExists === true)
  );
}
//@ chunk-rmtfpbze.js:1270-1356 placement (2.1.88 match: generateSettingsJSONSchema, 0.754)
function generateSettingsJSONSchema(dir, name, kind) {
  return lstat(join(dir, name)).then(
    (stat) => kind === "any" || !stat.isDirectory(),
    (error) => !isPathAbsent(error),
  );
}
//@ chunk-rmtfpbze.js:1356-1379 placement
var GITDIR_PREFIX = "gitdir: ";
var OVERLAYFS_MAGIC = 391;
//@ chunk-rmtfpbze.js:1379-1488 placement (2.1.88 match: isRealPathWithinTeamDir, 1)
async function isRealPathWithinTeamDir(realCandidate) {
  return lstat(realCandidate).catch((error) => {
    if (["ENOENT", "ENOTDIR"].includes(getErrnoCode(error) ?? "")) return null;
    throw error;
  });
}
//@ chunk-rmtfpbze.js:1488-1614 placement
async function isUnreliableFs(dir) {
  if (isNetworkMountRoot_2(dir)) return true;
  if (!["linux", "wsl"].includes(getPlatform())) return false;
  return (await statfs(dir).catch(() => null))?.type === OVERLAYFS_MAGIC;
}
//@ chunk-rmtfpbze.js:1614-1839 placement
async function gitEntriesExisting(dir) {
  let results = await Promise.all(
    [GIT_ENTRY_NAMES.head, GIT_ENTRY_NAMES.objects, GIT_ENTRY_NAMES.refs].map(async (name) => {
      let real = await isRealPathWithinTeamDir(join(dir, name));
      return (
        real && {
          name,
          isDirectory: real.isDirectory(),
          isSymbolicLink: real.isSymbolicLink(),
        }
      );
    }),
  );
  return looksLikeGitDir(results.filter((entry) => entry !== null));
}
//@ chunk-rmtfpbze.js:1839-2040 placement
async function isGitdirFile(file) {
  let handle = await open(file, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
  try {
    if (!(await handle.stat()).isFile()) return false;
    let buffer = Buffer.alloc(GITDIR_PREFIX.length);
    await handle.read(buffer, 0, buffer.length, 0);
    return buffer.toString() === GITDIR_PREFIX;
  } finally {
    await handle.close();
  }
}
//@ chunk-rmtfpbze.js:2040-2346 placement
/**
 * 从路径往上判定是否处在 git 仓库/裸库/间接 gitdir 中；remote/tools/toolHostAdvert 使用。
 */
async function isInGitRepo(dir) {
  try {
    let gitdirFiles = [];
    for (let current = await realpath(dir); ; current = dirname(current)) {
      if (await isUnreliableFs(current)) return false;
      if (await gitEntriesExisting(current)) {
        for (let file of gitdirFiles) if (await isGitdirFile(file)) return false;
        return true;
      }
      let dotGitPath = join(current, ".git");
      let realGit = await isRealPathWithinTeamDir(dotGitPath);
      if (realGit?.isDirectory() && (await gitEntriesExisting(dotGitPath))) return false;
      if (realGit?.isFile()) gitdirFiles.push(dotGitPath);
      if (dirname(current) === current) return false;
    }
  } catch (error) {
    if (!isFsInaccessible(error)) logError(toError(error));
    return true;
  }
}
export { isInGitRepo, GIT_FILES_ALWAYS_ALLOWED, isGitRepoDir };
