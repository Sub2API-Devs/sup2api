/**
 * utils/plugins/versionDirSwap.ts
 *
 * 2.1.316 新增：版本目录替换
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (41)
 * attribution: placement 41
 */
import { readdir, lstat, readlink, open, rename, lutimes } from "fs/promises";
import { join, dirname } from "path";
import { createHash } from "crypto";
import {
  classifyCacheEntry,
  sweepStaleTempSiblings,
  hasRealEntries,
  makeTempSiblingName,
} from "./pluginCacheMaterialize.js";
import { logForDebugging } from "../debug.js";
import {
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isPathAbsent,
} from "../errors.js";
import { mapped_4, BINARY_LOCKFILE_UNSUPPORTED_TEXT } from "./pluginDependencies.js";
import { getPlatform } from "../platform.js";
import { isSupportedPlatform } from "../../commands/desktop/index.js";
import {
  binaryBaseNameForTarget,
  MAX_PLUGIN_BINARY_BYTES,
  readOnlyNoFollowFlags,
} from "../platformTargets.js";
import {
  LINKS_MATERIALIZED_MARKER as LINKS_MATERIALIZED_MARKER_2,
  ORPHAN_MARKER_FILE,
  IN_USE_MARKER_FILE,
} from "./cacheUtils.js";
import { normalizePathSegment } from "../pathSegments.js";
import { isSameFilesystem, TRANSIENT_FS_ERRORS as TRANSIENT_FS_ERRORS_2 } from "./safeCopy.js";
import { LONG_RETRY_DELAYS_MS } from "../atomicPublishWrite.js";
import { sleep } from "../sleep.js";
import {
  removeDirectoryTreeNoFollow as removeDirectoryTreeNoFollow_2,
  removePathEntry,
} from "../fsRemove.js";

//@ chunk-e6aww6q8.js:4414770-4414805 placement
var COMPARE_TREE_BUDGET = 1e4;
var COMPARE_TREE_BUDGET_BYTES = 419430400;
var COMPARE_TREE_CHUNK_BYTES = 65536;
//@ chunk-e6aww6q8.js:4414805-4415609 placement
async function compareVersionTrees(e, n, r = {}) {
  let s = r.budget ?? {
    entries: COMPARE_TREE_BUDGET,
    bytes: COMPARE_TREE_BUDGET_BYTES,
  };
  let h = await classifyCacheEntry(n);
  if (h !== "other")
    return {
      verdict: h === "absent" ? "absent" : "differs",
      refresh: [],
    };
  let y = new Map();
  let S = await listTreeSignatures(
    e,
    (L, G, q) =>
      (G === ".git" && q === "dir") || (L === `bin/${G}` && r.binariesHook?.declared.has(G) === true),
    s,
    undefined,
    y,
  ).catch((error) => {
    if (error instanceof CompareBudgetExceeded) return;
    throw error;
  });
  if (S === undefined)
    return {
      verdict: "differs",
      refresh: [],
    };
  let w = new Set([...y.keys()].filter((key) => key.split("/").at(-1) === ".git"));
  return compareVersionDirs(e, n, S, w, r.binariesHook, s).then(
    (L) =>
      L
        ? {
            verdict: "identical",
            refresh: [...w].sort(),
          }
        : {
            verdict: "differs",
            refresh: [],
          },
    (error) => {
      if (error instanceof StagedReadError) throw error.reason;
      logForDebugging(
        `versionDirSwap: could not compare ${n} with the staged tree (${getErrnoCode(error) ?? (error instanceof Error ? error.name : "unknown error")}); treating them as different`,
      );
      return {
        verdict: "differs",
        refresh: [],
      };
    },
  );
}
//@ chunk-e6aww6q8.js:4415609-4415726 placement
class CompareBudgetExceeded extends Error {
  constructor() {
    super("plugin tree past the compare budget");
    this.name = "CompareBudgetExceeded";
  }
}
//@ chunk-e6aww6q8.js:4415726-4417984 placement
/**
 * 比较两个版本目录（package.json、.git、node_modules 等差异）。
 */
async function compareVersionDirs(e, n, r, s, binariesHook, y) {
  let S = new Set(await readdir(n));
  let w = r.has("package.json") ? mapped_4.find((At) => r.has(At)) : undefined;
  let L = w !== undefined;
  let G = getPlatform() === "windows";
  let q = await lstat(n, {
    bigint: true,
  });
  let Z = await lstat(e, {
    bigint: true,
  }).catch((error) => {
    throw new StagedReadError(error);
  });
  let Se = G ? 0 : Number(q.mode) & FILE_MODE_BITS_MASK;
  let ke = G ? 0 : Number(Z.mode) & FILE_MODE_BITS_MASK;
  let we = ownerKey(q);
  if ((Se & ~ke) !== 0 || !isSameOwnerEntry(we, Se, ownerKey(Z))) return false;
  let Ee = new Map([
    [
      "",
      {
        dev: q.dev,
        ino: q.ino,
        owner: we,
        loose: Se,
      },
    ],
  ]);
  let Ae = new Set();
  for (let At of S)
    if (!r.has(At) && CACHE_CLEANABLE_NAMES.has(At) && (await isRootEntryUnchanged(n, At, Se, we)))
      Ae.add(At);
  let Ie = isSupportedPlatform();
  let flattened = [...(binariesHook?.declared ?? [])].flatMap(([At, It]) => {
    let Yt = Ie === undefined ? undefined : binaryBaseNameForTarget(At, Ie);
    return Yt === undefined
      ? []
      : [
          {
            declared: At,
            bare: Yt,
            sha256: It,
          },
        ];
  });
  let We = new Set(flattened.map((At) => At.bare));
  let ze = new Map();
  let lt = await listTreeSignatures(
    n,
    (At, It, Yt, qt, Zt, rn) =>
      (It === ".git" && Yt === "dir" && s.has(At) && (qt & ~Se) === 0 && isSameOwnerEntry(Zt, qt, we)) ||
      (At === It &&
        Ae.has(It) &&
        (It === LINKS_MATERIALIZED_MARKER_2 ? Yt === "file" && rn === 1 : Yt === "dir") &&
        (qt & ~Se) === 0 &&
        isSameOwnerEntry(Zt, qt, we) &&
        (It !== "node_modules" || L)),
    y,
    ze,
    Ee,
    q,
  );
  let hookNames = new Set([...(binariesHook?.declared.keys() ?? []), ...We].map((At) => join(n, "bin", At)));
  let nt = {
    rootOwner: we,
    names: ze,
    hookNames,
    directories: Ee,
  };
  if (![...s].every((At) => Ee.has(At) && !lt.has(At))) return false;
  let Et = (At) => {
    let [It, Yt, qt] = (At ?? "").split(":");
    return It === "dir" && qt === "0" && Yt !== undefined && isSameOwnerEntry(Yt, 0, we);
  };
  let yt = (At) =>
    binariesHook !== undefined &&
    ((At === "bin" && Et(lt.get("bin"))) ||
      (At.startsWith("bin/") &&
        (We.has(At.slice(4)) || binariesHook.declared.has(At.slice(4))) &&
        lt.get(At)?.startsWith("file:") === true));
  if (!(
    [...r].every(([At, It]) => isEntrySignatureCompatible(It, lt.get(At))) &&
    [...lt.keys()].every((key) => r.has(key) || yt(key))
  ))
    return false;
  if (
    [...S].some((At) => isOrphanMarkerName(At)) ||
    (w !== undefined &&
      !r.has("node_modules") &&
      (!Ae.has("node_modules") || !(await isHookFileStillPlain(n, w, Ee))))
  )
    return false;
  if (binariesHook !== undefined && binariesHook.declared.size > 0) {
    let At = lt.get("bin");
    if (At !== undefined && (r.has("bin") ? !At.startsWith("dir:") : !Et(At))) return false;
    let It = new Set(flattened.map((Yt) => Yt.declared));
    for (let [Yt, qt] of binariesHook.declared) {
      let Zt = lt.has(`bin/${Yt}`);
      let rn = lt.has("bin") ? await compareBinaryDigest(n, Yt, qt, nt, y, !Zt) : "absent";
      if (rn === "wrong" || (rn === "absent" && (It.has(Yt) || Zt))) return false;
    }
    for (let { bare, sha256 } of flattened) {
      if (r.has(`bin/${bare}`)) continue;
      let Zt = binariesHook.declared.get(bare) ?? sha256;
      if (!lt.has("bin") || (await compareBinaryDigest(n, bare, Zt, nt, y, false)) !== "match") return false;
    }
  }
  for (let [At, It] of r)
    if (
      It.startsWith("file:") &&
      !(await compareFileBytes(
        e,
        n,
        At,
        Number(It.split(":")[1]),
        parseInt(It.split(":").at(-1) ?? "0", 8),
        It.split(":")[2] === "x",
        nt,
      ))
    )
      return false;
  return true;
}
//@ chunk-e6aww6q8.js:4417984-4418018 placement
function isOrphanMarkerName(e) {
  return normalizePathSegment(e) === ORPHAN_MARKER_FILE;
}
//@ chunk-e6aww6q8.js:4418018-4418030 placement
var FILE_MODE_BITS_MASK = 3602;
//@ chunk-e6aww6q8.js:4418030-4418094 placement
function ownerKey(e) {
  return getPlatform() === "windows" ? "-.-" : `${e.uid}.${e.gid}`;
}
//@ chunk-e6aww6q8.js:4418094-4418188 placement
function isSameOwnerEntry(e, n, r) {
  let [s, h] = e.split(".");
  let [y, S] = r.split(".");
  return s === y && ((n & 16) === 0 || h === S);
}
//@ chunk-e6aww6q8.js:4418188-4418574 placement
/**
 * 已安装条目签名与暂存签名是否兼容（链接目标、属主、权限不更宽）。
 */
function isEntrySignatureCompatible(e, n) {
  if (n === undefined) return false;
  if (e.startsWith("link:")) {
    let [L, G, ...q] = n.split(":");
    let [Z, Se, ...ke] = e.split(":");
    return (
      L === Z &&
      q.join(":") === ke.join(":") &&
      G !== undefined &&
      Se !== undefined &&
      isSameOwnerEntry(G, 0, Se)
    );
  }
  let parts = e.split(":");
  let parts_2 = n.split(":");
  let h = parseInt(parts.pop() ?? "0", 8);
  let y = parseInt(parts_2.pop() ?? "0", 8);
  let S = parts.pop();
  let w = parts_2.pop();
  return (
    parts_2.join(":") === parts.join(":") &&
    w !== undefined &&
    S !== undefined &&
    isSameOwnerEntry(w, y, S) &&
    (y & ~h) === 0
  );
}
//@ chunk-e6aww6q8.js:4418574-4418715 placement
async function isHookFileStillPlain(e, n, r) {
  let s = BINARY_LOCKFILE_UNSUPPORTED_TEXT.get(n);
  return (
    s !== undefined &&
    (await arePathDirsUnchanged(e, s, r)) &&
    (await lstat(join(e, ...s.split("/"))).then(
      (h) => h.isFile(),
      () => false,
    ))
  );
}
//@ chunk-e6aww6q8.js:4418715-4418755 placement
var CACHE_CLEANABLE_NAMES = new Set(["node_modules", IN_USE_MARKER_FILE, LINKS_MATERIALIZED_MARKER_2]);
//@ chunk-e6aww6q8.js:4418755-4418991 placement
async function isRootEntryUnchanged(e, n, r, s) {
  let h = await lstat(join(e, n), {
    bigint: true,
  });
  let y = getPlatform() === "windows";
  let S = y ? 0 : Number(h.mode) & FILE_MODE_BITS_MASK;
  if ((S & ~r) !== 0 || !isSameOwnerEntry(ownerKey(h), S, s)) return false;
  if (n === LINKS_MATERIALIZED_MARKER_2) return h.isFile() && (y || h.nlink === 1n);
  return h.isDirectory() && (!y || (await isSameFilesystem(e, n)));
}
//@ chunk-e6aww6q8.js:4418991-4419509 placement
/**
 * 路径上每级目录仍是列举时看到的那个普通目录。
 */
async function arePathDirsUnchanged(e, n, directories) {
  let s = e;
  let h = "";
  for (let y of ["", ...n.split("/").slice(0, -1)]) {
    s = join(s, y);
    h = y === "" ? h : h ? `${h}/${y}` : y;
    let S = await classifyCacheEntry(s);
    let w = directories.get(h);
    if (!(
      S === "other" &&
      (w === undefined ||
        (await lstat(s, {
          bigint: true,
        }).then((G) => {
          let q = getPlatform() === "windows" ? 0 : Number(G.mode) & FILE_MODE_BITS_MASK;
          return (
            G.isDirectory() &&
            getFileIdentity_8(w, G) &&
            (q & ~w.loose) === 0 &&
            isSameOwnerEntry(ownerKey(G), q, w.owner)
          );
        })))
    )) {
      logForDebugging(
        `versionDirSwap: ${s} is no longer the plain directory the installed copy's listing saw (${S}); not opening ${n} through it and treating the trees as different`,
      );
      return false;
    }
  }
  return true;
}
//@ chunk-e6aww6q8.js:4419509-4420361 placement
/**
 * bin 文件 sha256 与期望一致（match/wrong/absent）。
 */
async function compareBinaryDigest(e, n, r, s, h, y) {
  let S = `bin/${n}`;
  if (!(await arePathDirsUnchanged(e, S, s.directories))) return "wrong";
  let w = join(e, "bin", n);
  if (getPlatform() === "windows")
    return lstat(w).then(
      () => "wrong",
      (error) => (getErrnoCode(error) === "ENOENT" ? "absent" : "wrong"),
    );
  let L = await openRegularFileChecked(w, {
    occupant: {
      owner: s.rootOwner,
      names: s.names,
      hookNames: s.hookNames,
    },
  }).catch((error) => (getErrnoCode(error) === "ENOENT" ? "absent" : "wrong"));
  if (L === "absent" || L === "wrong") return L;
  if (L === undefined) return "wrong";
  let { handle, size, mode } = L;
  try {
    if (size > MAX_PLUGIN_BINARY_BYTES || (mode & 64) === 0 || (mode & FILE_MODE_BITS_MASK) !== 0)
      return "wrong";
    if (y && ((h.entries -= 1) < 0 || (h.bytes -= size) < 0)) throw new CompareBudgetExceeded();
    let hash = createHash("sha256");
    let ke = Buffer.allocUnsafe(COMPARE_TREE_CHUNK_BYTES);
    for (let we = 0; ; we += COMPARE_TREE_CHUNK_BYTES) {
      let fully = await readFully(handle, ke, we);
      if (we + fully > size) return "wrong";
      hash.update(ke.subarray(0, fully));
      if (fully < COMPARE_TREE_CHUNK_BYTES)
        return we + fully === size && hash.digest("hex") === r ? "match" : "wrong";
    }
  } catch (error) {
    if (error instanceof CompareBudgetExceeded) throw error;
    return "wrong";
  } finally {
    await handle.close().catch(() => {
      return;
    });
  }
}
//@ chunk-e6aww6q8.js:4420361-4421527 placement
/**
 * 递归列出目录树条目签名（类型、属主、权限、大小），受预算限制。
 */
async function listTreeSignatures(e, n, r, s, h, y, S = "", w = new Map()) {
  let L = S === "" ? e : join(e, ...S.split("/"));
  let G = await readdir(L);
  let q = await lstat(L, {
    bigint: true,
  });
  if (!q.isDirectory() || (s !== undefined && y !== undefined && !getFileIdentity_8(y, q)))
    throw RangeError("a directory moved while its names were being read");
  for (let Z of G) {
    let Se = S === "" ? Z : `${S}/${Z}`;
    let ke = join(L, Z);
    let we = await lstat(ke, {
      bigint: true,
    });
    let Ee = we.isSymbolicLink()
      ? "link"
      : we.isDirectory()
        ? getPlatform() === "windows" && !(await isSameFilesystem(L, Z))
          ? "link"
          : "dir"
        : we.isFile()
          ? "file"
          : "other";
    let Ae = getPlatform() === "windows" ? 0 : Number(we.mode) & FILE_MODE_BITS_MASK;
    let Ie = ownerKey(we);
    let Me = getPlatform() === "windows" ? 1 : Number(we.nlink);
    if (Ee === "file" && s !== undefined) {
      let We = `${we.dev}:${we.ino}`;
      s.set(We, [...(s.get(We) ?? []), ke]);
    }
    if (Ee === "dir")
      h?.set(Se, {
        dev: we.dev,
        ino: we.ino,
        owner: Ie,
        loose: Ae,
      });
    if (n(Se, Z, Ee, Ae, Ie, Me)) continue;
    if ((r.entries -= 1) < 0) throw new CompareBudgetExceeded();
    if (Ee === "link") w.set(Se, `link:${Ie}:${await readlink(ke)}`);
    else if (Ee === "dir") {
      w.set(Se, `dir:${Ie}:${Ae.toString(8)}`);
      await listTreeSignatures(e, n, r, s, h, we, Se, w);
    } else if (Ee === "file") {
      if ((r.bytes -= Number(we.size)) < 0) throw new CompareBudgetExceeded();
      let We = getPlatform() !== "windows" && (Number(we.mode) & 64) !== 0 ? "x" : "-";
      w.set(Se, `file:${we.size}:${We}:${Ie}:${Ae.toString(8)}`);
    } else throw RangeError("an entry that is no file, directory or symlink");
  }
  return w;
}
//@ chunk-e6aww6q8.js:4421527-4421649 placement
class StagedReadError extends Error {
  reason;
  constructor(reason) {
    super("could not read the staged tree while comparing bytes");
    this.reason = reason;
  }
}
//@ chunk-e6aww6q8.js:4421649-4422257 placement
/**
 * 打开普通文件并核对身份、权限、属主与硬链接名。
 */
async function openRegularFileChecked(e, n) {
  let r = await lstat(e, {
    bigint: true,
  });
  if (!r.isFile()) return;
  let s = await open(e, readOnlyNoFollowFlags());
  try {
    let stats = await s.stat({
      bigint: true,
    });
    let y = getPlatform() === "windows";
    let S = y ? 0 : Number(stats.mode) & FILE_MODE_BITS_MASK;
    if (
      stats.isFile() &&
      (n.occupant === undefined ||
        (isSameFileIdentity_2(e, r, stats) &&
          (n.occupant.loose === undefined || (S & ~n.occupant.loose) === 0) &&
          (n.occupant.exec === undefined || y || ((Number(stats.mode) & 64) !== 0) === n.occupant.exec) &&
          isSameOwnerEntry(ownerKey(stats), S, n.occupant.owner) &&
          (await areHardLinksAccounted(e, r, stats, n.occupant.names, n.occupant.hookNames))))
    )
      return {
        handle: s,
        size: Number(stats.size),
        mode: Number(stats.mode),
        owner: ownerKey(stats),
      };
  } catch (error) {
    await s.close().catch(() => {
      return;
    });
    throw error;
  }
  await s.close().catch(() => {
    return;
  });
  return;
}
//@ chunk-e6aww6q8.js:4422257-4422540 placement
function isSameFileIdentity_2(e, n, r) {
  if (n.ino === 0n || r.ino === 0n) return true;
  let s = n.ino === r.ino && (getPlatform() === "windows" || n.dev === r.dev);
  if (!s)
    logForDebugging(
      `versionDirSwap: ${e} is no longer the file the pre-open check saw (its identity changed between that lstat and the open); treating the trees as different`,
    );
  return s;
}
//@ chunk-e6aww6q8.js:4422540-4422637 placement = getFileIdentity (0.794)
function getFileIdentity_8(e, n) {
  return (
    e.ino === 0n || n.ino === 0n || (n.ino === e.ino && (getPlatform() === "windows" || n.dev === e.dev))
  );
}
//@ chunk-e6aww6q8.js:4422637-4423234 placement
/**
 * 文件的硬链接数都能由已安装列表解释。
 */
async function areHardLinksAccounted(e, n, r, names, hookNames) {
  if (getPlatform() === "windows") return true;
  let y = n.ino === 0n || r.ino === 0n ? [e] : (names.get(`${n.dev}:${n.ino}`) ?? []);
  if (
    y.includes(e) &&
    r.nlink === BigInt(y.length) &&
    (hookNames === undefined ? y.length === 1 : y.every((w) => hookNames.has(w)))
  ) {
    if (
      (
        await Promise.all(
          y
            .filter((L) => L !== e)
            .map((L) =>
              lstat(L, {
                bigint: true,
              }).then(
                (G) => G.isFile() && G.ino === r.ino && G.dev === r.dev,
                () => false,
              ),
            ),
        )
      ).every(Boolean)
    )
      return true;
  }
  logForDebugging(
    `versionDirSwap: ${e} has ${r.nlink} names and the installed copy's listing accounts for ${y.length} (a hard link elsewhere, a name moved since, or a name no install gives it); treating the trees as different`,
  );
  return false;
}
//@ chunk-e6aww6q8.js:4423234-4424015 placement
/**
 * 逐块比较暂存与已安装文件内容。
 */
async function compareFileBytes(e, n, r, s, loose, exec, S) {
  let w = join(e, ...r.split("/"));
  let L = await openRegularFileChecked(w, {}).catch((error) => {
    throw new StagedReadError(error);
  });
  if (L === undefined) throw new StagedReadError(RangeError("a staged entry stopped being a regular file"));
  let handle = L.handle;
  try {
    if (!(await arePathDirsUnchanged(n, r, S.directories))) return false;
    let regularFileChecked = await openRegularFileChecked(join(n, ...r.split("/")), {
      occupant: {
        owner: L.owner,
        names: S.names,
        loose,
        exec,
      },
    });
    if (regularFileChecked === undefined) return false;
    let handle_2 = regularFileChecked.handle;
    try {
      if (regularFileChecked.size !== s) return false;
      let Se = Buffer.allocUnsafe(COMPARE_TREE_CHUNK_BYTES);
      let ke = Buffer.allocUnsafe(COMPARE_TREE_CHUNK_BYTES);
      for (let we = 0; we <= s; we += COMPARE_TREE_CHUNK_BYTES) {
        let [Ee, fully] = await Promise.all([
          readFully(handle, Se, we).catch((error) => {
            throw new StagedReadError(error);
          }),
          readFully(handle_2, ke, we),
        ]);
        if (Ee !== fully || !Se.subarray(0, Ee).equals(ke.subarray(0, fully))) return false;
        if (Ee < COMPARE_TREE_CHUNK_BYTES) return we + Ee === s;
      }
      return false;
    } finally {
      await handle_2.close().catch(() => {
        return;
      });
    }
  } finally {
    await handle.close().catch(() => {
      return;
    });
  }
}
//@ chunk-e6aww6q8.js:4424015-4424150 placement
async function readFully(handle, n, r, s = 0) {
  if (s === n.length) return s;
  let { bytesRead } = await handle.read(n, s, n.length - s, r + s);
  return bytesRead === 0 ? s : readFully(handle, n, r, s + bytesRead);
}
//@ chunk-e6aww6q8.js:4424150-4424264 placement
var OCCUPIED_RETRY_DELAYS_MS = [100, 500, 2000];
var MAX_WAIT_MS = 20000;
var RETRY_BUDGET_MS = LONG_RETRY_DELAYS_MS.reduce((acc, n) => acc + n, 0) + OCCUPIED_RETRY_DELAYS_MS[0];
var OCCUPIED_ERRORS = new Set(["ENOTEMPTY", "EEXIST", "EISDIR"]);
//@ chunk-e6aww6q8.js:4424264-4424559 placement
class HeldOccupantError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  code;
  pluginCommandErrorCategory = "in-use";
  constructor(e, code) {
    super(
      e,
      "plugin install: the installed copy of this plugin version could not be set aside (held by another program, or not modifiable by this account) and was not replaced",
    );
    this.code = code;
    this.name = "HeldOccupantError";
  }
}
//@ chunk-e6aww6q8.js:4424559-4424846 placement
class BusyVersionDirError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  code;
  pluginCommandErrorCategory = "unknown";
  constructor(e, code) {
    super(
      e,
      "plugin install: the new copy of this plugin version could not be moved into its version folder (any installed copy had first been set aside or removed)",
    );
    this.code = code;
    this.name = "BusyVersionDirError";
  }
}
//@ chunk-e6aww6q8.js:4424846-4424971 placement
class OccupiedDestination extends Error {
  refusal;
  constructor(refusal) {
    super("destination occupied");
    this.refusal = refusal;
    this.name = "OccupiedDestination";
  }
}
//@ chunk-e6aww6q8.js:4424971-4426197 placement
/**
 * 替换版本目录：除不可比对的部分外与暂存树一致时整目录替换。
 */
async function swapVersionDir(e, n, r) {
  let s = {
    renameDirectory: r.renameDirectory ?? rename,
    sleep: r.sleep ?? sleep,
    budget: {
      waitMs: MAX_WAIT_MS,
      reserveMs: RETRY_BUDGET_MS,
      entries: COMPARE_TREE_BUDGET,
      bytes: COMPARE_TREE_BUDGET_BYTES,
    },
  };
  let h = async () => {
    if (!r.keepIdentical) return "differs";
    let { verdict, refresh } = await compareVersionTrees(e, n, {
      binariesHook: r.binariesHook,
      budget: s.budget,
    });
    if (verdict === "identical" && refresh.length > 0) {
      logForDebugging(
        `versionDirSwap: ${n} matches the staged tree except for ${refresh.join(", ")}, which a compare cannot vouch for; replacing the whole copy`,
      );
      return "differs";
    }
    return verdict;
  };
  let y = async (Se, ke) => {
    if (Se === "kept") await removeStagedCopy(e);
    await Promise.all(ke.map(removeSetAsideCopy));
    if ((await classifyCacheEntry(dirname(n))) === "other") await sweepStaleTempSiblings(n);
    return Se;
  };
  let S = await h().catch(async (error) => {
    await removeStagedCopy(e);
    throw error;
  });
  if (S === "identical") {
    logForDebugging(`versionDirSwap: ${n} already holds exactly the staged tree; kept it`);
    return y("kept", []);
  }
  let w =
    S === "absent"
      ? {
          kind: "absent",
        }
      : await setInstalledCopyAside(n, s).catch(async (error) => {
          await removeStagedCopy(e);
          throw error;
        });
  let path = w.kind === "aside" ? w.path : undefined;
  let G = [];
  let q = () => [...(path === undefined ? [] : [path]), ...G];
  let Z;
  try {
    Z = await publishStagedTree(e, n, h, s, G);
  } catch (error) {
    s.budget.reserveMs = 0;
    let ke = await restoreSetAsideCopy(n, w, G, h, s);
    await removeStagedCopy(e);
    if (ke === "kept") return y("kept", q());
    if (ke === "restored")
      await Promise.all(
        G.map(async (we) =>
          (await hasRealEntries(we, {
            whenUnreadable: true,
          }))
            ? undefined
            : removeSetAsideCopy(we),
        ),
      );
    throw await restoreVersionDir(error, n, ke, q());
  }
  return y(Z, q());
}
//@ chunk-e6aww6q8.js:4426197-4427064 placement
async function setInstalledCopyAside(e, n) {
  let tempSiblingName = makeTempSiblingName(e);
  try {
    await touchVersionDir(e);
    await renameDirectoryWithRetry(e, tempSiblingName, n);
    await touchVersionDir(tempSiblingName);
    logForDebugging(`versionDirSwap: set the installed copy aside: ${e} \u2192 ${tempSiblingName}`);
    return {
      kind: "aside",
      path: tempSiblingName,
    };
  } catch (error) {
    if (isPathAbsent(error))
      return {
        kind: "absent",
      };
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "EXDEV") {
      logForDebugging(
        `versionDirSwap: ${e} sits on a filesystem layer that refuses to rename it (EXDEV); removing it in place before the publish instead`,
        {
          level: "warn",
        },
      );
      await removeDirectoryTreeNoFollow_2(e);
      return {
        kind: "removed",
      };
    }
    if (isTransientFsError(error))
      throw new HeldOccupantError(
        `The installed copy of this plugin version at ${e} could not be replaced: it is in use by another program (for example a running Claude Code session, or an editor or terminal inside that folder), or this account is not allowed to modify it (${errnoCode}). It was not replaced and the new copy was discarded. Close what is using it, or check the folder's permissions, and run the install again.`,
        errnoCode ?? "unknown",
      );
    throw error;
  }
}
//@ chunk-e6aww6q8.js:4427064-4427121 placement
function isTransientFsError(error) {
  return getPlatform() === "windows" && TRANSIENT_FS_ERRORS_2.has(getErrnoCode(error) ?? "");
}
//@ chunk-e6aww6q8.js:4427121-4427240 placement
async function sleepWithinBudget(e, n) {
  if (n.budget.waitMs - e < n.budget.reserveMs) return false;
  n.budget.waitMs -= e;
  await n.sleep(e);
  return true;
}
//@ chunk-e6aww6q8.js:4427240-4427553 placement
/**
 * 重命名目录，暂时失败按延迟表重试。
 */
async function renameDirectoryWithRetry(e, n, r, s = false, h = 0) {
  try {
    await r.renameDirectory(e, n);
  } catch (error) {
    let S = isTransientFsError(error) ? LONG_RETRY_DELAYS_MS[h] : undefined;
    if (S === undefined) throw error;
    if (s && (await classifyCacheEntry(n)) !== "absent") throw new OccupiedDestination(error);
    if (!(await sleepWithinBudget(S, r))) throw error;
    logForDebugging(
      `versionDirSwap: rename ${e} \u2192 ${n} failed (${errorCodeOrName(error)}); trying again after ${S}ms`,
    );
    await renameDirectoryWithRetry(e, n, r, s, h + 1);
  }
}
//@ chunk-e6aww6q8.js:4427553-4427733 placement
async function classifyRenameFailure(error, n) {
  if (error instanceof OccupiedDestination)
    return {
      occupied: true,
      error: error.refusal,
    };
  let r = getErrnoCode(error) ?? "";
  return {
    occupied:
      OCCUPIED_ERRORS.has(r) ||
      ((r === "ENOTDIR" || isTransientFsError(error)) && (await classifyCacheEntry(n)) !== "absent"),
    error,
  };
}
//@ chunk-e6aww6q8.js:4427733-4428103 placement
/**
 * 发布暂存树；目标被其他进程重建时比较并保留或挪开。
 */
async function publishStagedTree(e, n, r, s, h, y = 0) {
  try {
    await renameDirectoryWithRetry(e, n, s, true);
    return "published";
  } catch (error) {
    let { occupied, error: error_2 } = await classifyRenameFailure(error, n);
    let G = OCCUPIED_RETRY_DELAYS_MS[y];
    if (G === undefined || !occupied || !(await sleepWithinBudget(G, s))) throw error_2;
    logForDebugging(
      `versionDirSwap: ${n} was re-created by another process during the install (${errorCodeOrName(error_2)}); looked again after ${G}ms`,
    );
    if ((await compareAndSetAside(n, r, s, h)) === "identical") return "kept";
    return publishStagedTree(e, n, r, s, h, y + 1);
  }
}
//@ chunk-e6aww6q8.js:4428103-4428342 placement
async function compareAndSetAside(e, n, r, s) {
  let h = await n();
  if (h === "identical")
    logForDebugging(`versionDirSwap: another process published exactly the staged tree at ${e}; kept it`);
  else if (h === "differs") {
    let y = await setInstalledCopyAside(e, r);
    if (y.kind === "aside") s.push(y.path);
  }
  return h;
}
//@ chunk-e6aww6q8.js:4428342-4428723 placement
/**
 * 失败后把挪开的副本移回（无内容则不恢复）。
 */
async function restoreSetAsideCopy(e, n, r, s, h) {
  if (n.kind !== "aside") return n.kind === "removed" ? "removed" : "untouched";
  if (
    !(await hasRealEntries(n.path, {
      whenUnreadable: true,
    }))
  ) {
    logForDebugging(
      `versionDirSwap: the folder that was at ${e} held no plugin payload (or is gone); it is not moved back and the version path is left free`,
      {
        level: "warn",
      },
    );
    return "not-restored";
  }
  let y = await moveInstalledCopyBack(n.path, e, s, h, r);
  return y === "moved" ? "restored" : y;
}
//@ chunk-e6aww6q8.js:4428723-4429258 placement
async function moveInstalledCopyBack(e, n, r, s, h, y = false) {
  try {
    await renameDirectoryWithRetry(e, n, s, true);
    logForDebugging(`versionDirSwap: moved ${e} back to ${n}`, {
      level: "warn",
    });
    return "moved";
  } catch (error) {
    let { occupied, error: error_2 } = await classifyRenameFailure(error, n);
    if (!y && occupied) {
      let G = await compareAndSetAside(n, r, s, h).catch((error) => {
        logForDebugging(
          `versionDirSwap: could not displace what now stands at ${n} (${errorCodeOrName(error)})`,
          {
            level: "warn",
          },
        );
        return;
      });
      if (G === "identical") return "kept";
      if (G === "differs" || G === "absent") {
        await sleepWithinBudget(OCCUPIED_RETRY_DELAYS_MS[0], s);
        return moveInstalledCopyBack(e, n, r, s, h, true);
      }
    }
    logForDebugging(`versionDirSwap: could not move ${e} back to ${n} (${errorCodeOrName(error_2)})`, {
      level: "warn",
    });
    return "stranded";
  }
}
//@ chunk-e6aww6q8.js:4429258-4430664 placement
/**
 * 替换失败时恢复原版本目录，并说明恢复结果。
 */
async function restoreVersionDir(error, n, r, s) {
  let code = getErrnoCode(error) ?? "unknown";
  let y = error instanceof HeldOccupantError || isTransientFsError(error) || OCCUPIED_ERRORS.has(code);
  let S = (
    await Promise.all(s.map(async (Z) => ((await classifyCacheEntry(Z)) === "absent" ? [] : [Z])))
  ).flat();
  let w = {
    untouched: "",
    removed:
      " The previously installed copy had to be removed first (this filesystem refuses to rename it), so this plugin version is not installed now.",
    restored: " The previously installed copy was moved back.",
    "not-restored":
      " The folder that was there before held no plugin files (or was already gone) and was not moved back; install the plugin again to restore it.",
    stranded: " The previously installed copy could not be moved back.",
  }[r];
  let L =
    S.length === 0
      ? ""
      : ` Left on disk (removed by a later install of this version, or the plugin cache cleanup): ${S.join(", ")}.`;
  if (!y && (r === "untouched" || r === "restored") && S.length === 0) {
    if (w !== "")
      logForDebugging(`versionDirSwap:${w}`, {
        level: "warn",
      });
    return error;
  }
  let G = y
    ? `the new copy or the version folder stayed busy while the install ran (${code}) \u2014 usually a scanner still reading the freshly downloaded files, another program using that folder, or another process re-creating it`
    : `the move failed (${code})`;
  return new BusyVersionDirError(
    `Could not move the new copy of this plugin version into ${n}: ${G}.${w}${L} ${y ? "Run the install again once other Claude Code sessions or programs using that folder have finished." : "Check the plugin cache folder's permissions and free disk space, then run the install again."}`,
    code,
  );
}
//@ chunk-e6aww6q8.js:4430664-4430890 placement
async function touchVersionDir(e) {
  let date = new Date();
  await lutimes(e, date, date).catch((error) => {
    if (isPathAbsent(error)) return;
    logForDebugging(
      `versionDirSwap: could not refresh the timestamp of ${e} (${errorCodeOrName(error)}); a concurrent cleanup may treat it as older than it is`,
      {
        level: "warn",
      },
    );
  });
}
//@ chunk-e6aww6q8.js:4430890-4430962 placement
function errorCodeOrName(error) {
  return getErrnoCode(error) ?? (error instanceof Error ? error.name : "unknown error");
}
//@ chunk-e6aww6q8.js:4430962-4431327 placement
/**
 * 删除挪开的旧副本，删不净记 warn。
 */
async function removeSetAsideCopy(e) {
  let n = await classifyCacheEntry(e);
  if (n === "absent") return;
  await (n === "other" ? removeDirectoryTreeNoFollow_2(e) : removePathEntry(e)).catch((error) => {
    logForDebugging(`versionDirSwap: removing the set-aside copy ${e} failed (${errorCodeOrName(error)})`);
  });
  if ((await classifyCacheEntry(e)) !== "absent")
    logForDebugging(
      `versionDirSwap: the set-aside copy ${e} could not be fully removed; a later install of this version or the plugin cache cleanup removes it`,
      {
        level: "warn",
      },
    );
}
//@ chunk-e6aww6q8.js:4431327-4431505 placement
async function removeStagedCopy(e) {
  let n = await classifyCacheEntry(e);
  if (n === "absent") return;
  await (n === "other" ? removeDirectoryTreeNoFollow_2(e) : removePathEntry(e)).catch((error) => {
    logForDebugging(`versionDirSwap: could not remove the staged copy ${e} (${errorCodeOrName(error)})`);
  });
}
export { swapVersionDir };
