/**
 * utils/announcedDirectories.ts
 *
 * 已宣告目录集合（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x4mkkqwd.js (7)
 * attribution: placement 7
 */
import { uniq } from "./collections.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getOriginalCwdOrNull, getProjectRootOrNull } from "../bootstrap/state.js";
import { getFsImplementation } from "./fsOperations.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-x4mkkqwd.js:338-752 placement
/**
 * 已宣告目录集合：保存排序去重后的附加工作目录，记录曾宣告过的所有目录，可重置。
 */
class AnnouncedDirectories {
  directories = [];
  announced = new Set();
  get() {
    return this.directories;
  }
  publish(appState) {
    let sorted = uniq(
      [...appState.additionalWorkingDirectories.values()].map(
        (additionalWorkingDirectory) => additionalWorkingDirectory.path,
      ),
    ).sort();
    let directories = this.directories;
    if (
      directories.length === sorted.length &&
      directories.every((directory, index) => directory === sorted[index])
    )
      return false;
    this.directories = sorted;
    return true;
  }
  noteAnnounced(directories) {
    for (let directory of directories) this.announced.add(directory);
  }
  everAnnounced() {
    return [...this.announced];
  }
  reset() {
    this.directories = [];
    this.announced.clear();
  }
}
//@ chunk-x4mkkqwd.js:752-775 placement
/**
 * 按宿主隔离的“已宣告目录”状态。
 */
var announcedDirsByHost; // deferred: uses AnnouncedDirectories of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-x4mkkqwd.js:752", () => {
  announcedDirsByHost = new HostScoped(() => new AnnouncedDirectories());
});
//@ chunk-x4mkkqwd.js:775-810 placement
/**
 * 取出当前宿主的已宣告目录状态。
 */
function getAnnouncedDirs() {
  return announcedDirsByHost.of(getRootSession().host);
}
//@ chunk-x4mkkqwd.js:810-939 placement
/**
 * 记录原始 cwd、项目根、其他目录与当前附加目录为已宣告，并返回当前附加目录列表。
 */
function getAnnouncedDirectories() {
  let announcedDirs = getAnnouncedDirs();
  let originalCwdOrNull = getOriginalCwdOrNull();
  let projectRootOrNull = getProjectRootOrNull();
  announcedDirs.noteAnnounced([
    ...(originalCwdOrNull === null ? [] : [originalCwdOrNull]),
    ...(projectRootOrNull === null ? [] : [projectRootOrNull]),
    ...currentCwdList(),
    ...announcedDirs.get(),
  ]);
  return announcedDirs.get();
}
//@ chunk-x4mkkqwd.js:939-981 placement
/**
 * 是否已经宣告过目录（用于避免重复宣告）。
 */
function hasAnnouncedDirs() {
  return getAnnouncedDirs().everAnnounced();
}
//@ chunk-x4mkkqwd.js:981-1019 placement
/**
 * 发布当前附加目录列表。
 */
function publishAnnouncedDirs(toolPermissionContext) {
  return getAnnouncedDirs().publish(toolPermissionContext);
}
//@ chunk-x4mkkqwd.js:1019-1071 placement
/**
 * 返回当前工作目录（取不到时为空数组）。
 */
function currentCwdList() {
  try {
    return [getFsImplementation().cwd()];
  } catch {
    return [];
  }
}
export { getAnnouncedDirectories, publishAnnouncedDirs, hasAnnouncedDirs };
