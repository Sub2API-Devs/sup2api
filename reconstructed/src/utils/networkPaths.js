/**
 * utils/networkPaths.ts
 *
 * 网络挂载路径识别（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aat7wt0p.js (45)
 * attribution: placement 45
 */
import { resolve } from "path";
import { readFileSync, statSync } from "fs";
import { homedir } from "os";
import { isMacSpecialPath, isForeignNetworkPath, Qn, uncHostOf, uT, Puo } from "./pathClassification.js";
import { ge } from "./identity.js";
import { isSystemVolumePath } from "./permissions/protectedDirs.js";
import { isENOENT } from "./errors.js";
import { iM } from "./fsJunctions.js";

/**
 * 路径段是否为 /net/<主机> 或 /Network/Servers/<主机>。
 */
//@ chunk-aat7wt0p.js:4683-4793 placement
function isNetworkMountSegments(t) {
  return (
    (t.length === 2 && foldCase(t[0]) === "net") ||
    (t.length === 3 && foldCase(t[0]) === "network" && foldCase(t[1]) === "servers")
  );
}
/**
 * 绝对路径所在网络挂载的主机名（规范化 .. 后），不是则返回 null。
 */
//@ chunk-aat7wt0p.js:4793-4978 placement
function networkMountHost(t) {
  if (!t.startsWith("/")) return null;
  let n = [];
  for (let e of t.split("/")) {
    if (e === "" || e === ".") continue;
    if (e === "..") {
      n.pop();
      continue;
    }
    if ((n.push(e), isNetworkMountSegments(n))) return w(e);
  }
  return null;
}
//@ chunk-aat7wt0p.js:4978-5040 placement
function w(t) {
  return t.replace(/[A-Z]/g, (n) => n.toLowerCase());
}
/**
 * 去掉不可见格式字符后做大小写折叠。
 */
//@ chunk-aat7wt0p.js:5040-5155 placement
function foldCase(t) {
  return t
    .replace(/[\u200c-\u200f\u202a-\u202e\u206a-\u206f\ufeff]/g, "")
    .toUpperCase()
    .toLowerCase();
}
//@ chunk-aat7wt0p.js:5155-5505 placement
function isNetworkMountPath(t, n = "linux") {
  let parts = t.split("/");
  if (parts[0] !== "") return t;
  let r, o;
  if (n === "darwin" ? isNetworkMountSegments(parts.slice(1, 3)) : parts[1] === "net" && parts.length >= 3)
    ((r = "/net/"), (o = 2));
  else if (n === "darwin" && isNetworkMountSegments(parts.slice(1, 4))) ((r = "/Network/Servers/"), (o = 3));
  else return t;
  let i = parts[o];
  if (i === void 0 || i === "") return t;
  let sliced = parts.slice(o + 1);
  return r + w(i).replace(/\.$/, "") + (sliced.length > 0 ? "/" + sliced.join("/") : "");
}
//@ chunk-aat7wt0p.js:5505-5722 placement
function isWslLocalhostPath(t) {
  let match = /^([\\/]{2,})([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*)\.(?=[\\/]|$)/.exec(t);
  if (match === null || match[2].toLowerCase() === "wsl.localhost") return t;
  return match[1][0].repeat(2) + match[2] + t.slice(match[1].length + match[2].length + 1);
}
/**
 * 路径是否在与参考路径不同的网络挂载或家目录挂载上。
 */
//@ chunk-aat7wt0p.js:5722-5827 placement
function isForeignMountPath(t, n) {
  if (isMacSpecialPath(t)) return !0;
  if (Ya(t)) {
    let e = networkMountHost(t);
    if (e === null || e !== networkMountHost(n)) return !0;
  }
  return isOtherHomeMount(t, n);
}
/**
 * 路径（相对参考目录解析）是否落在网络目录、其他网络主机或其他家目录挂载上。
 */
//@ chunk-aat7wt0p.js:5827-6018 placement
function isOnForeignMount(t, n) {
  let e = resolve(n, t);
  if (isForeignNetworkPath(t, n) || isForeignNetworkPath(e, n)) return !0;
  let r = networkMountHost(n);
  for (let o of [t, e]) {
    if (Ya(o)) {
      let i = networkMountHost(o);
      if (i === null || i !== r) return !0;
    }
    if (isUnderNetworkDirCached(o) || isNetDir(o) || isMacSpecialPath(o) || isOtherHomeMount(o, n)) return !0;
  }
  return !1;
}
/**
 * macOS 上路径是否属于与参考路径不同的家目录/网络挂载。
 */
//@ chunk-aat7wt0p.js:6018-6284 placement
function isOtherHomeMount(t, n, e = "linux", r = e === "darwin" && !0) {
  if (e !== "darwin" || !classifyHomeMount(t, e, r)) return !1;
  let o = collectMountPrefixes(n, e, r).complete[0] ?? null,
    { complete: complete, partial: partial } = collectMountPrefixes(t, e, r);
  if (complete.length === 0 && partial.length === 0) return !0;
  if (o === null) return !0;
  return complete.some((u) => u !== o) || partial.some((u) => !o.startsWith(u));
}
//@ chunk-aat7wt0p.js:6284-6332 placement
var Zt = ge({ value: void 0 }, (t) => {
  t.value = void 0;
});
//@ chunk-aat7wt0p.js:6332-6341 placement
var Rt = 6;
/**
 * 收集路径经过的 /network、/home 挂载前缀（完整与部分）。
 */
//@ chunk-aat7wt0p.js:6341-6909 placement
function collectMountPrefixes(t, n, e) {
  let r = [],
    o = [];
  if (!t.startsWith("/")) return { complete: r, partial: o };
  let i = [];
  for (let s of t.split("/")) {
    if (s === "" || s === ".") continue;
    if (s === "..") {
      i.pop();
      continue;
    }
    if ((i.push(s), i.length > Rt)) continue;
    let u = "/" + i.join("/"),
      filtered = (n === "darwin" ? isSystemVolumePath(u) : u).split("/").filter((d) => d !== ""),
      A = filtered[0]?.toLowerCase();
    if (A === "network") {
      if (filtered.length === 1) o.push("/network/");
      else if (filtered.length === 2) o.push(`/network/${w(filtered[1])}/`);
      else if (filtered.length === 3) r.push(`/network/${w(filtered[1])}/${w(filtered[2])}`);
    } else if (e && A === "home" && filtered.length === 2) r.push(`/home/${filtered[1]}`);
  }
  return { complete: r, partial: o };
}
//@ chunk-aat7wt0p.js:6909-6937 placement
function Ya(t) {
  return yl(t);
}
//@ chunk-aat7wt0p.js:6937-7224 placement
function readAutofsMounts() {
  try {
    let last = readFileSync("/proc/self/mountinfo", "utf8")
        .split(
          `
`,
        )
        .findLast((o) => o.split(" ")[4] === "/net"),
      [n, e, r] = last?.split(" - ")[1]?.split(" ") ?? [];
    return (
      n === "autofs" &&
      (e === "-hosts" || /(?:^|\/)auto\.(?:net|smb)$/.test(e ?? "")) &&
      r?.split(",").includes("indirect") === !0
    );
  } catch {
    return !1;
  }
}
/**
 * 从 /proc/self/mountinfo 读出 autofs 挂载点。
 */
//@ chunk-aat7wt0p.js:7224-7497 placement
function readAutofsMountPoints() {
  try {
    return readFileSync("/proc/self/mountinfo", "utf8")
      .split(
        `
`,
      )
      .flatMap((t) => {
        let [n, e] = t.split(" - "),
          r = n?.split(" ")[4];
        return r !== void 0 && e?.startsWith("autofs ") === !0
          ? [r.replace(/\\([0-7]{3})/g, (o, i) => String.fromCharCode(Number.parseInt(i, 8)))]
          : [];
      });
  } catch {
    return;
  }
}
//@ chunk-aat7wt0p.js:7497-7725 placement
function readAutoMaster() {
  try {
    return (
      readFileSync("/etc/auto_master", "utf8")
        .split(
          `
`,
        )
        .some((t) => {
          let parts = t.replace(/#.*$/, "").trim().split(/\s+/);
          return parts[0]?.toLowerCase() === "/net" && parts[1] === "-hosts";
        }) && statSync("/net").dev !== statSync("/Users").dev
    );
  } catch {
    return !1;
  }
}
//@ chunk-aat7wt0p.js:7725-7968 placement
function readResolvSearchDomains() {
  try {
    return (
      readFileSync("/etc/resolv.conf", "utf8")
        .split(
          `
`,
        )
        .map((t) =>
          t
            .replace(/[#;].*$/, "")
            .trim()
            .split(/\s+/),
        )
        .findLast(([t]) => t === "search" || t === "domain")
        ?.slice(1)
        .map((t) => w(t.replace(/\.$/, ""))) ?? []
    );
  } catch (error) {
    return isENOENT(error) ? [] : void 0;
  }
}
/**
 * 路径是否就是网络挂载根（/net/<主机> 等）。
 */
//@ chunk-aat7wt0p.js:7968-8213 placement
function isNetworkMountRoot(t) {
  if (!t.startsWith("/")) return !1;
  let filtered = t.split("/").filter((r) => r !== "" && r !== ".");
  if (filtered.length < 1 || filtered.length > 3 || filtered.includes("..")) return !1;
  if (isNetworkMountSegments(filtered) && (filtered.length === 2 || !1)) return !0;
  let lower = filtered[0].toLowerCase();
  return filtered.length <= 2 && (lower === "net" || !1);
}
//@ chunk-aat7wt0p.js:8213-8262 placement
function hl(t) {
  return Qn(t) || Ya(t) || tP(t) || isMacSpecialPath(t);
}
//@ chunk-aat7wt0p.js:8262-8311 placement
function n_(t) {
  return Ya(t) || tP(t) || isNetDir(t) || isMacSpecialPath(t);
}
//@ chunk-aat7wt0p.js:8311-8347 placement
function yl(t) {
  return networkMountRootCached(t) !== null;
}
//@ chunk-aat7wt0p.js:8347-8387 placement
var ft = 1024,
  pt = 4096,
  R = new Map(),
  v = new Map();
/**
 * 缓存的网络挂载根查找。
 */
//@ chunk-aat7wt0p.js:8387-8547 placement
function networkMountRootCached(t) {
  if (!t.startsWith("/")) return null;
  if (t.length > pt) return networkMountRoot(t);
  let n = R.get(t);
  if (n === void 0) {
    if (((n = networkMountRoot(t)), R.size >= ft)) R.clear();
    R.set(t, n);
  }
  return n;
}
/**
 * 路径经过的网络挂载根，没有则 null。
 */
//@ chunk-aat7wt0p.js:8547-8708 placement
function networkMountRoot(t) {
  let n = [];
  for (let e of t.split("/")) {
    if (e === "" || e === ".") continue;
    if (e === "..") {
      n.pop();
      continue;
    }
    if ((n.push(e), isNetworkMountSegments(n))) return "/" + n.join("/");
  }
  return null;
}
//@ chunk-aat7wt0p.js:8708-8788 placement
function _Li(t) {
  let n = networkMountRootCached(t);
  return n === null ? null : n.slice(n.lastIndexOf("/") + 1);
}
//@ chunk-aat7wt0p.js:8788-8862 placement
var vt = /^([\\/]{2}(?:wsl\.localhost|wsl\$)[\\/]+[^\\/]+)((?:[\\/].*)?)$/i;
//@ chunk-aat7wt0p.js:8862-8946 placement
function z7t(t) {
  let match = vt.exec(t);
  return match === null ? void 0 : { prefix: match[1], rest: match[2] ?? "" };
}
/**
 * 路径是否就是 /net。
 */
//@ chunk-aat7wt0p.js:8946-9144 placement
function isNetDir(t) {
  if (!t.startsWith("/")) return !1;
  let n = [];
  for (let e of t.split("/")) {
    if (e === "" || e === ".") continue;
    if (e === "..") {
      n.pop();
      continue;
    }
    n.push(e);
  }
  return n.length === 1 && n[0].toLowerCase() === "net";
}
/**
 * 缓存判断路径是否在 /Network 下。
 */
//@ chunk-aat7wt0p.js:9144-9300 placement
function isUnderNetworkDirCached(t) {
  if (!t.startsWith("/")) return !1;
  if (t.length > pt) return isUnderNetworkDir(t);
  let n = v.get(t);
  if (n === void 0) {
    if (((n = isUnderNetworkDir(t)), v.size >= ft)) v.clear();
    v.set(t, n);
  }
  return n;
}
/**
 * 路径是否在 /Network 下。
 */
//@ chunk-aat7wt0p.js:9300-9485 placement
function isUnderNetworkDir(t) {
  let n = [];
  for (let e of t.split("/")) {
    if (e === "" || e === ".") continue;
    if (e === "..") {
      n.pop();
      continue;
    }
    if ((n.push(e), n.length === 1 && n[0].toLowerCase() === "network")) return !0;
  }
  return !1;
}
//@ chunk-aat7wt0p.js:9485-9509 placement
function tP(t) {
  return !1;
}
//@ chunk-aat7wt0p.js:9509-9558 placement
function Qg(t) {
  return yl(t) || isNetDir(t) || isUnderNetworkDirCached(t) || isMacSpecialPath(t);
}
/**
 * 两个路径是否位于不同的网络位置（网络/本地、主机或共享不同）。
 */
//@ chunk-aat7wt0p.js:9558-9976 placement
function isDifferentNetworkLocation(t, n, e = null) {
  let r = AV(t),
    o = AV(n);
  if (!r && !o) return !1;
  if (r && !o) return !0;
  if (!r && o) {
    let l = e === null || Qn(e) ? null : networkMountHost(e),
      A = Qn(n) ? null : U(n);
    if (l !== null && A !== null && l === A) return !1;
    if (e !== null && Qn(e) && Qn(n) && !isForeignNetworkPath(n, e)) return !1;
    return !0;
  }
  let i = Qn(t) ? null : U(t),
    s = Qn(n) ? null : U(n);
  if (i !== null || s !== null) return i === null || s === null || i !== s;
  let u = uncHostOf(t),
    a = uncHostOf(n);
  if (u !== null || a !== null) return u === null || a === null || u !== a;
  return t !== n;
}
//@ chunk-aat7wt0p.js:9976-10014 placement
function U(t) {
  return isUnderNetworkDirCached(t) ? null : networkMountHost(t);
}
//@ chunk-aat7wt0p.js:10014-10358 placement
function classifyHomeMount(t, n = "linux", e = n === "darwin" && !0) {
  if (n !== "darwin") return !1;
  if (isUnderNetworkDirCached(t) || isMacSpecialPath(t)) return !0;
  if (!t.startsWith("/")) return !1;
  let { complete: complete, partial: partial } = collectMountPrefixes(t, n, e);
  if (partial.length > 0) return !0;
  if (complete.some((s) => s.startsWith("/network/"))) return !0;
  let filtered = complete.filter((s) => s.startsWith("/home/"));
  if (filtered.length > 0) {
    let s = homeMountRoot();
    if (filtered.some((u) => u !== s)) return !0;
  }
  return !1;
}
/**
 * 家目录所在的 /home/<用户> 根。
 */
//@ chunk-aat7wt0p.js:10358-10473 placement
function homeMountRoot() {
  let t;
  try {
    t = homedir();
  } catch {
    return null;
  }
  let match = /^\/home\/([^/]+)/.exec(isSystemVolumePath(t));
  return match ? `/home/${match[1]}` : null;
}
//@ chunk-aat7wt0p.js:10473-10509 placement
function AV(t) {
  return vHn(t) || isUnderNetworkDirCached(t);
}
//@ chunk-aat7wt0p.js:10509-10581 placement
function vHn(t) {
  return ai(t) || yl(t) || isNetDir(t) || uT(t) || iM(t) || Puo(t) || isMacSpecialPath(t);
}
/**
 * 规范化挂载路径（前面各段折叠大小写）。
 */
//@ chunk-aat7wt0p.js:10581-10724 placement
function normalizeMountPath(t) {
  let filtered = t.split("/").filter(Boolean);
  if (filtered.length === 0) return t;
  let at = filtered.at(-1);
  return "/" + [...filtered.slice(0, -1).map(foldCase), w(at)].join("/");
}
/**
 * 路径经过的全部网络挂载根。
 */
//@ chunk-aat7wt0p.js:10724-10926 placement
function networkMountRoots(t) {
  if (!t.startsWith("/")) return [];
  let n = [],
    e = [];
  for (let r of t.split("/")) {
    if (r === "" || r === ".") continue;
    if (r === "..") {
      e.pop();
      continue;
    }
    if ((e.push(r), isNetworkMountSegments(e))) n.push(normalizeMountPath("/" + e.join("/")));
  }
  return n;
}
/**
 * 是否为 \\wsl$ 或 \\wsl.localhost 下的发行版路径。
 */
//@ chunk-aat7wt0p.js:10926-11053 placement
function isWslUncPath(t) {
  let match = /^[\\/]{2}wsl(?:\$|\.localhost)[\\/]([^\\/]*)/i.exec(t);
  return match !== null && !/^\.{0,2}[. ]*$/.test(match[1] ?? "");
}
//@ chunk-aat7wt0p.js:11053-11089 placement
function ai(t) {
  return Qn(t) && !isWslUncPath(t);
}
//@ chunk-aat7wt0p.js:11089-11144 placement
function Lu(t) {
  if (gt(t)) return homedir() + t.slice(1);
  return t;
}
//@ chunk-aat7wt0p.js:11144-11200 placement
function THn(t, n) {
  if (gt(t)) return n + t.slice(1);
  return t;
}
//@ chunk-aat7wt0p.js:11200-11254 placement
function gt(t) {
  return t === "~" || t.startsWith("~/") || !1;
}

export {
  Qg,
  ai,
  yl,
  isNetDir,
  isOnForeignMount,
  isForeignMountPath,
  Ya,
  isWslUncPath,
  AV,
  _Li,
  classifyHomeMount,
  hl,
  n_,
  isDifferentNetworkLocation,
  tP,
  networkMountRootCached,
  normalizeMountPath,
  foldCase,
  isUnderNetworkDirCached,
  isNetworkMountRoot,
  networkMountRoots,
  vHn,
  networkMountHost,
  Lu,
  isOtherHomeMount,
  z7t,
  THn,
  isNetworkMountPath,
  isWslLocalhostPath,
  readAutoMaster,
  readAutofsMounts,
  readAutofsMountPoints,
  readResolvSearchDomains,
};
