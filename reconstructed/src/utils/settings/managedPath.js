/**
 * utils/settings/managedPath.ts
 *
 * 托管设置目录：macOS /Library/Application Support/ClaudeCode、Windows C:\Program Files\ClaudeCode、其他 /etc/claude-code；managed-settings.d 目录。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/managedPath.ts
 * pieces: chunk-dcmhvw5a.js (11)
 * attribution: affinity 1, placement 9, fingerprint 1
 */
import {
  accessSync,
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  lstatSync,
  lstatSync as lstatSync_2,
  readlinkSync,
} from "fs";
import {
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  parse,
  sep,
  sep as sep_2,
  sep as sep_3,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
} from "path";
import { getErrnoCode } from "../errors.js";
import { isWritableByCurrentUser } from "../../bootstrap/stateSlices.js";
import { getPlatform } from "../platform.js";

//@ chunk-dcmhvw5a.js:427191-427275 affinity
function* Ap(e) {
  try {
    return (yield { ask: "writable", path: e }, "yes");
  } catch (error) {
    return writabilityFromError(error);
  }
}
//@ chunk-dcmhvw5a.js:427275-427376 placement
function writabilityFromError(e) {
  switch (getErrnoCode(e)) {
    case "EACCES":
    case "EPERM":
    case "EROFS":
      return "no";
    default:
      return "unknown";
  }
}
//@ chunk-dcmhvw5a.js:427376-427445 placement
function js(e) {
  try {
    return (accessSync(e, constants_4.W_OK), "yes");
  } catch (error) {
    return writabilityFromError(error);
  }
}
//@ chunk-dcmhvw5a.js:427445-427574 placement
function anyAccountCouldWrite(e, n, r) {
  for (let uid of e.uids) {
    let a = isWritableByCurrentUser({ file: n, folder: r, posix: !0, euid: uid, groups: e.groups });
    if (a !== !1) return a;
  }
  return !1;
}
//@ chunk-dcmhvw5a.js:427574-427584 placement
var _w = 40;
/**
 * 安全解析托管设置路径（逐段检查链接）。
 */
//@ chunk-dcmhvw5a.js:427584-428151 placement
function resolveManagedPathSafely(e, n, r) {
  let s = resolve_3(e);
  try {
    for (let a = 0; a <= _w; a++) {
      let root = parse(s).root,
        g,
        filtered = s.slice(root.length).split(sep_3).filter(Boolean),
        f;
      for (let [h, y] of filtered.entries()) {
        let b = r.get(root);
        if (b === void 0) {
          g ??= lstatSync_2(root);
          let w = { uid: g.uid, gid: g.gid, mode: g.mode };
          ((b = anyAccountCouldWrite(n, w, w) === !1 && js(root) === "no"), r.set(root, b));
        }
        if (!b) return !0;
        let S = join_3(root, y);
        if (r.has(S)) {
          ((root = S), (g = void 0));
          continue;
        }
        let C = lstatSync_2(S);
        if (C.isSymbolicLink()) {
          let w = readlinkSync(S),
            filtered_2 = w.split(sep_3).filter((v) => v && v !== ".");
          if (filtered_2.lastIndexOf("..") > filtered_2.findIndex((v) => v !== "..")) return !0;
          f = resolve_3(root, w, ...filtered.slice(h + 1));
          break;
        }
        ((root = S), (g = C));
      }
      if (f === void 0) return !1;
      s = f;
    }
  } catch {}
  return !0;
}
/**
 * 托管设置文件路径与 drop-in 目录缓存。
 */
//@ chunk-dcmhvw5a.js:428180-428488 placement
class ManagedPathCache {
  managedFilePath = void 0;
  dropInDir = void 0;
  getManagedFilePath() {
    return ((this.managedFilePath ??= getManagedFilePath_2()), this.managedFilePath);
  }
  getDropInDir() {
    return ((this.dropInDir ??= join_4(getManagedFilePath(), "managed-settings.d")), this.dropInDir);
  }
  clearDropInDir() {
    this.dropInDir = void 0;
  }
  reset() {
    ((this.managedFilePath = void 0), (this.dropInDir = void 0));
  }
}
//@ chunk-dcmhvw5a.js:428488-428502 placement
var Lp = new ManagedPathCache();
/**
 * 托管设置文件路径。
 */
//@ chunk-dcmhvw5a.js:428502-428547 placement
function getManagedFilePath() {
  return Lp.getManagedFilePath();
}
/**
 * 托管设置根目录（按平台固定路径，见 getManagedSettingsFilePath）。
 */
//@ chunk-dcmhvw5a.js:428547-428754 fingerprint = getManagedFilePath (0.801)
function getManagedFilePath_2() {
  let e = getManagedFilePathOverride();
  if (e !== void 0) return e;
  switch (getPlatform()) {
    case "macos":
      return "/Library/Application Support/ClaudeCode";
    case "windows":
      return "C:\\Program Files\\ClaudeCode";
    default:
      return "/etc/claude-code";
  }
}
//@ chunk-dcmhvw5a.js:428754-428776 placement
function getManagedFilePathOverride() {
  return;
}

export {
  getManagedFilePath,
  Lp,
  Ap,
  anyAccountCouldWrite,
  js,
  resolveManagedPathSafely,
  getManagedFilePathOverride,
};
