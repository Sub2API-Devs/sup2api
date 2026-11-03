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

/**
 * 已宣告目录集合：保存排序去重后的附加工作目录，记录曾宣告过的所有目录，可重置。
 */
//@ chunk-x4mkkqwd.js:338-752 placement
class AnnouncedDirectories {
  directories = [];
  announced = new Set();
  get() {
    return this.directories;
  }
  publish(o) {
    let sorted = uniq([...o.additionalWorkingDirectories.values()].map((e) => e.path)).sort(),
      directories = this.directories;
    if (directories.length === sorted.length && directories.every((e, s) => e === sorted[s])) return !1;
    return ((this.directories = sorted), !0);
  }
  noteAnnounced(o) {
    for (let t of o) this.announced.add(t);
  }
  everAnnounced() {
    return [...this.announced];
  }
  reset() {
    ((this.directories = []), this.announced.clear());
  }
}
//@ chunk-x4mkkqwd.js:752-775 placement
var d = new HostScoped(() => new AnnouncedDirectories());
//@ chunk-x4mkkqwd.js:775-810 placement
function r() {
  return d.of(getRootSession().host);
}
/**
 * 记录原始 cwd、项目根、其他目录与当前附加目录为已宣告，并返回当前附加目录列表。
 */
//@ chunk-x4mkkqwd.js:810-939 placement
function getAnnouncedDirectories() {
  let o = r(),
    t = getOriginalCwdOrNull(),
    n = getProjectRootOrNull();
  return (
    o.noteAnnounced([...(t === null ? [] : [t]), ...(n === null ? [] : [n]), ...c(), ...o.get()]),
    o.get()
  );
}
//@ chunk-x4mkkqwd.js:939-981 placement
function szs() {
  return r().everAnnounced();
}
//@ chunk-x4mkkqwd.js:981-1019 placement
function P4n(o) {
  return r().publish(o);
}
//@ chunk-x4mkkqwd.js:1019-1071 placement
function c() {
  try {
    return [getFsImplementation().cwd()];
  } catch {
    return [];
  }
}

export { getAnnouncedDirectories, P4n, szs };
