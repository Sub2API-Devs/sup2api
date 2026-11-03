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
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  readdir as readdir_11,
  readdir as readdir_12,
  readdir as readdir_13,
  readdir as readdir_14,
  readdir as readdir_15,
  readdir as readdir_16,
  readdir as readdir_17,
  readdir as readdir_18,
  readdir as readdir_19,
  readdir as readdir_20,
  readdir as readdir_21,
  readdir as readdir_22,
  readdir as readdir_23,
  readdir as readdir_24,
  readdir as readdir_25,
  readdir as readdir_26,
  readdir as readdir_27,
  readdir as readdir_28,
  readdir as readdir_29,
  readdir as readdir_30,
  readdir as readdir_31,
  readdir as readdir_32,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
  readlink,
  readlink as readlink_2,
  readlink as readlink_3,
  readlink as readlink_4,
  readlink as readlink_5,
  readlink as readlink_6,
  readlink as readlink_7,
  readlink as readlink_8,
  readlink as readlink_9,
  readlink as readlink_10,
  readlink as readlink_11,
  readlink as readlink_12,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  open as open_8,
  open as open_9,
  open as open_10,
  open as open_11,
  open as open_12,
  open as open_13,
  open as open_14,
  open as open_15,
  open as open_16,
  open as open_17,
  open as open_18,
  open as open_19,
  open as open_20,
  open as open_21,
  open as open_22,
  open as open_23,
  open as open_24,
  open as open_25,
  open as open_26,
  open as open_27,
  rename,
  rename as rename_2,
  rename as rename_3,
  rename as rename_4,
  rename as rename_5,
  rename as rename_6,
  rename as rename_7,
  lutimes,
  lutimes as lutimes_2,
  lutimes as lutimes_3,
  lutimes as lutimes_4,
  lutimes as lutimes_5,
  lutimes as lutimes_6,
} from "fs/promises";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
} from "path";
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  createHash as createHash_5,
  createHash as createHash_6,
  createHash as createHash_7,
  createHash as createHash_8,
  createHash as createHash_9,
  createHash as createHash_10,
  createHash as createHash_11,
  createHash as createHash_12,
  createHash as createHash_13,
  createHash as createHash_14,
  createHash as createHash_15,
  createHash as createHash_16,
  createHash as createHash_17,
  createHash as createHash_18,
  createHash as createHash_19,
  createHash as createHash_20,
  createHash as createHash_21,
  createHash as createHash_22,
  createHash as createHash_23,
  createHash as createHash_24,
} from "crypto";
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
import { mapped_4, fqn } from "./pluginDependencies.js";
import { getPlatform } from "../platform.js";
import { isSupportedPlatform } from "../../commands/desktop/index.js";
import { binaryBaseNameForTarget, q5r, $c } from "../platformTargets.js";
import { lU, R1, qm } from "./cacheUtils.js";
import { dU } from "../pathSegments.js";
import { isSameFilesystem, TRANSIENT_FS_ERRORS as TRANSIENT_FS_ERRORS_2 } from "./safeCopy.js";
import { Ado } from "../atomicPublishWrite.js";
import { sleep } from "../sleep.js";
import { removeDirectoryTreeNoFollow, removePathEntry } from "../fsRemove.js";

//@ chunk-e6aww6q8.js:4414770-4414805 placement
var Pft = 1e4,
  Mft = 419430400,
  Zj = 65536;
//@ chunk-e6aww6q8.js:4414805-4415609 placement
async function compareVersionTrees(e, n, r = {}) {
  let s = r.budget ?? { entries: Pft, bytes: Mft },
    h = await classifyCacheEntry(n);
  if (h !== "other") return { verdict: h === "absent" ? "absent" : "differs", refresh: [] };
  let y = new Map(),
    S = await listTreeSignatures(
      e,
      (L, G, q) =>
        (G === ".git" && q === "dir") || (L === `bin/${G}` && r.binariesHook?.declared.has(G) === !0),
      s,
      void 0,
      y,
    ).catch((L) => {
      if (L instanceof CompareBudgetExceeded) return;
      throw L;
    });
  if (S === void 0) return { verdict: "differs", refresh: [] };
  let w = new Set([...y.keys()].filter((L) => L.split("/").at(-1) === ".git"));
  return compareVersionDirs(e, n, S, w, r.binariesHook, s).then(
    (L) => (L ? { verdict: "identical", refresh: [...w].sort() } : { verdict: "differs", refresh: [] }),
    (L) => {
      if (L instanceof StagedReadError) throw L.reason;
      return (
        logForDebugging(
          `versionDirSwap: could not compare ${n} with the staged tree (${getErrnoCode(L) ?? (L instanceof Error ? L.name : "unknown error")}); treating them as different`,
        ),
        { verdict: "differs", refresh: [] }
      );
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
/**
 * 比较两个版本目录（package.json、.git、node_modules 等差异）。
 */
//@ chunk-e6aww6q8.js:4415726-4417984 placement
async function compareVersionDirs(e, n, r, s, h, y) {
  let S = new Set(await readdir_30(n)),
    w = r.has("package.json") ? mapped_4.find((At) => r.has(At)) : void 0,
    L = w !== void 0,
    G = getPlatform() === "windows",
    q = await lstat_40(n, { bigint: !0 }),
    Z = await lstat_40(e, { bigint: !0 }).catch((At) => {
      throw new StagedReadError(At);
    }),
    Se = G ? 0 : Number(q.mode) & eW,
    ke = G ? 0 : Number(Z.mode) & eW,
    we = tW(q);
  if ((Se & ~ke) !== 0 || !BO(we, Se, tW(Z))) return !1;
  let Ee = new Map([["", { dev: q.dev, ino: q.ino, owner: we, loose: Se }]]),
    Ae = new Set();
  for (let At of S) if (!r.has(At) && zks.has(At) && (await isRootEntryUnchanged(n, At, Se, we))) Ae.add(At);
  let Ie = isSupportedPlatform(),
    flattened = [...(h?.declared ?? [])].flatMap(([At, It]) => {
      let Yt = Ie === void 0 ? void 0 : binaryBaseNameForTarget(At, Ie);
      return Yt === void 0 ? [] : [{ declared: At, bare: Yt, sha256: It }];
    }),
    We = new Set(flattened.map((At) => At.bare)),
    ze = new Map(),
    lt = await listTreeSignatures(
      n,
      (At, It, Yt, qt, Zt, rn) =>
        (It === ".git" && Yt === "dir" && s.has(At) && (qt & ~Se) === 0 && BO(Zt, qt, we)) ||
        (At === It &&
          Ae.has(It) &&
          (It === lU ? Yt === "file" && rn === 1 : Yt === "dir") &&
          (qt & ~Se) === 0 &&
          BO(Zt, qt, we) &&
          (It !== "node_modules" || L)),
      y,
      ze,
      Ee,
      q,
    ),
    Je = new Set([...(h?.declared.keys() ?? []), ...We].map((At) => join_124(n, "bin", At))),
    nt = { rootOwner: we, names: ze, hookNames: Je, directories: Ee };
  if (![...s].every((At) => Ee.has(At) && !lt.has(At))) return !1;
  let Et = (At) => {
      let [It, Yt, qt] = (At ?? "").split(":");
      return It === "dir" && qt === "0" && Yt !== void 0 && BO(Yt, 0, we);
    },
    yt = (At) =>
      h !== void 0 &&
      ((At === "bin" && Et(lt.get("bin"))) ||
        (At.startsWith("bin/") &&
          (We.has(At.slice(4)) || h.declared.has(At.slice(4))) &&
          lt.get(At)?.startsWith("file:") === !0));
  if (!(
    [...r].every(([At, It]) => isEntrySignatureCompatible(It, lt.get(At))) &&
    [...lt.keys()].every((At) => r.has(At) || yt(At))
  ))
    return !1;
  if (
    [...S].some((At) => jks(At)) ||
    (w !== void 0 &&
      !r.has("node_modules") &&
      (!Ae.has("node_modules") || !(await isHookFileStillPlain(n, w, Ee))))
  )
    return !1;
  if (h !== void 0 && h.declared.size > 0) {
    let At = lt.get("bin");
    if (At !== void 0 && (r.has("bin") ? !At.startsWith("dir:") : !Et(At))) return !1;
    let It = new Set(flattened.map((Yt) => Yt.declared));
    for (let [Yt, qt] of h.declared) {
      let Zt = lt.has(`bin/${Yt}`),
        rn = lt.has("bin") ? await compareBinaryDigest(n, Yt, qt, nt, y, !Zt) : "absent";
      if (rn === "wrong" || (rn === "absent" && (It.has(Yt) || Zt))) return !1;
    }
    for (let { bare: bare, sha256: sha256 } of flattened) {
      if (r.has(`bin/${bare}`)) continue;
      let Zt = h.declared.get(bare) ?? sha256;
      if (!lt.has("bin") || (await compareBinaryDigest(n, bare, Zt, nt, y, !1)) !== "match") return !1;
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
      return !1;
  return !0;
}
//@ chunk-e6aww6q8.js:4417984-4418018 placement
function jks(e) {
  return dU(e) === R1;
}
//@ chunk-e6aww6q8.js:4418018-4418030 placement
var eW = 3602;
//@ chunk-e6aww6q8.js:4418030-4418094 placement
function tW(e) {
  return getPlatform() === "windows" ? "-.-" : `${e.uid}.${e.gid}`;
}
//@ chunk-e6aww6q8.js:4418094-4418188 placement
function BO(e, n, r) {
  let [s, h] = e.split("."),
    [y, S] = r.split(".");
  return s === y && ((n & 16) === 0 || h === S);
}
/**
 * 已安装条目签名与暂存签名是否兼容（链接目标、属主、权限不更宽）。
 */
//@ chunk-e6aww6q8.js:4418188-4418574 placement
function isEntrySignatureCompatible(e, n) {
  if (n === void 0) return !1;
  if (e.startsWith("link:")) {
    let [L, G, ...q] = n.split(":"),
      [Z, Se, ...ke] = e.split(":");
    return L === Z && q.join(":") === ke.join(":") && G !== void 0 && Se !== void 0 && BO(G, 0, Se);
  }
  let parts = e.split(":"),
    parts_2 = n.split(":"),
    h = parseInt(parts.pop() ?? "0", 8),
    y = parseInt(parts_2.pop() ?? "0", 8),
    S = parts.pop(),
    w = parts_2.pop();
  return (
    parts_2.join(":") === parts.join(":") && w !== void 0 && S !== void 0 && BO(w, y, S) && (y & ~h) === 0
  );
}
//@ chunk-e6aww6q8.js:4418574-4418715 placement
async function isHookFileStillPlain(e, n, r) {
  let s = fqn.get(n);
  return (
    s !== void 0 &&
    (await arePathDirsUnchanged(e, s, r)) &&
    (await lstat_40(join_124(e, ...s.split("/"))).then(
      (h) => h.isFile(),
      () => !1,
    ))
  );
}
//@ chunk-e6aww6q8.js:4418715-4418755 placement
var zks = new Set(["node_modules", qm, lU]);
//@ chunk-e6aww6q8.js:4418755-4418991 placement
async function isRootEntryUnchanged(e, n, r, s) {
  let h = await lstat_40(join_124(e, n), { bigint: !0 }),
    y = getPlatform() === "windows",
    S = y ? 0 : Number(h.mode) & eW;
  if ((S & ~r) !== 0 || !BO(tW(h), S, s)) return !1;
  if (n === lU) return h.isFile() && (y || h.nlink === 1n);
  return h.isDirectory() && (!y || (await isSameFilesystem(e, n)));
}
/**
 * 路径上每级目录仍是列举时看到的那个普通目录。
 */
//@ chunk-e6aww6q8.js:4418991-4419509 placement
async function arePathDirsUnchanged(e, n, r) {
  let s = e,
    h = "";
  for (let y of ["", ...n.split("/").slice(0, -1)]) {
    ((s = join_124(s, y)), (h = y === "" ? h : h ? `${h}/${y}` : y));
    let S = await classifyCacheEntry(s),
      w = r.get(h);
    if (!(
      S === "other" &&
      (w === void 0 ||
        (await lstat_40(s, { bigint: !0 }).then((G) => {
          let q = getPlatform() === "windows" ? 0 : Number(G.mode) & eW;
          return G.isDirectory() && getFileIdentity_8(w, G) && (q & ~w.loose) === 0 && BO(tW(G), q, w.owner);
        })))
    ))
      return (
        logForDebugging(
          `versionDirSwap: ${s} is no longer the plain directory the installed copy's listing saw (${S}); not opening ${n} through it and treating the trees as different`,
        ),
        !1
      );
  }
  return !0;
}
/**
 * bin 文件 sha256 与期望一致（match/wrong/absent）。
 */
//@ chunk-e6aww6q8.js:4419509-4420361 placement
async function compareBinaryDigest(e, n, r, s, h, y) {
  let S = `bin/${n}`;
  if (!(await arePathDirsUnchanged(e, S, s.directories))) return "wrong";
  let w = join_124(e, "bin", n);
  if (getPlatform() === "windows")
    return lstat_40(w).then(
      () => "wrong",
      (Se) => (getErrnoCode(Se) === "ENOENT" ? "absent" : "wrong"),
    );
  let L = await openRegularFileChecked(w, {
    occupant: { owner: s.rootOwner, names: s.names, hookNames: s.hookNames },
  }).catch((Se) => (getErrnoCode(Se) === "ENOENT" ? "absent" : "wrong"));
  if (L === "absent" || L === "wrong") return L;
  if (L === void 0) return "wrong";
  let { handle: handle, size: size, mode: mode } = L;
  try {
    if (size > q5r || (mode & 64) === 0 || (mode & eW) !== 0) return "wrong";
    if (y && ((h.entries -= 1) < 0 || (h.bytes -= size) < 0)) throw new CompareBudgetExceeded();
    let Se = createHash_24("sha256"),
      allocUnsafe = Buffer.allocUnsafe(Zj);
    for (let we = 0; ; we += Zj) {
      let Ee = await readFully(handle, allocUnsafe, we);
      if (we + Ee > size) return "wrong";
      if ((Se.update(allocUnsafe.subarray(0, Ee)), Ee < Zj))
        return we + Ee === size && Se.digest("hex") === r ? "match" : "wrong";
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
/**
 * 递归列出目录树条目签名（类型、属主、权限、大小），受预算限制。
 */
//@ chunk-e6aww6q8.js:4420361-4421527 placement
async function listTreeSignatures(e, n, r, s, h, y, S = "", w = new Map()) {
  let L = S === "" ? e : join_124(e, ...S.split("/")),
    G = await readdir_30(L),
    q = await lstat_40(L, { bigint: !0 });
  if (!q.isDirectory() || (s !== void 0 && y !== void 0 && !getFileIdentity_8(y, q)))
    throw RangeError("a directory moved while its names were being read");
  for (let Z of G) {
    let Se = S === "" ? Z : `${S}/${Z}`,
      ke = join_124(L, Z),
      we = await lstat_40(ke, { bigint: !0 }),
      Ee = we.isSymbolicLink()
        ? "link"
        : we.isDirectory()
          ? getPlatform() === "windows" && !(await isSameFilesystem(L, Z))
            ? "link"
            : "dir"
          : we.isFile()
            ? "file"
            : "other",
      Ae = getPlatform() === "windows" ? 0 : Number(we.mode) & eW,
      Ie = tW(we),
      Me = getPlatform() === "windows" ? 1 : Number(we.nlink);
    if (Ee === "file" && s !== void 0) {
      let We = `${we.dev}:${we.ino}`;
      s.set(We, [...(s.get(We) ?? []), ke]);
    }
    if (Ee === "dir") h?.set(Se, { dev: we.dev, ino: we.ino, owner: Ie, loose: Ae });
    if (n(Se, Z, Ee, Ae, Ie, Me)) continue;
    if ((r.entries -= 1) < 0) throw new CompareBudgetExceeded();
    if (Ee === "link") w.set(Se, `link:${Ie}:${await readlink_11(ke)}`);
    else if (Ee === "dir")
      (w.set(Se, `dir:${Ie}:${Ae.toString(8)}`), await listTreeSignatures(e, n, r, s, h, we, Se, w));
    else if (Ee === "file") {
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
  constructor(e) {
    super("could not read the staged tree while comparing bytes");
    this.reason = e;
  }
}
/**
 * 打开普通文件并核对身份、权限、属主与硬链接名。
 */
//@ chunk-e6aww6q8.js:4421649-4422257 placement
async function openRegularFileChecked(e, n) {
  let r = await lstat_40(e, { bigint: !0 });
  if (!r.isFile()) return;
  let s = await open_25(e, $c());
  try {
    let stats = await s.stat({ bigint: !0 }),
      y = getPlatform() === "windows",
      S = y ? 0 : Number(stats.mode) & eW;
    if (
      stats.isFile() &&
      (n.occupant === void 0 ||
        (isSameFileIdentity(e, r, stats) &&
          (n.occupant.loose === void 0 || (S & ~n.occupant.loose) === 0) &&
          (n.occupant.exec === void 0 || y || ((Number(stats.mode) & 64) !== 0) === n.occupant.exec) &&
          BO(tW(stats), S, n.occupant.owner) &&
          (await areHardLinksAccounted(e, r, stats, n.occupant.names, n.occupant.hookNames))))
    )
      return { handle: s, size: Number(stats.size), mode: Number(stats.mode), owner: tW(stats) };
  } catch (error) {
    throw (
      await s.close().catch(() => {
        return;
      }),
      error
    );
  }
  await s.close().catch(() => {
    return;
  });
  return;
}
//@ chunk-e6aww6q8.js:4422257-4422540 placement
function isSameFileIdentity(e, n, r) {
  if (n.ino === 0n || r.ino === 0n) return !0;
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
/**
 * 文件的硬链接数都能由已安装列表解释。
 */
//@ chunk-e6aww6q8.js:4422637-4423234 placement
async function areHardLinksAccounted(e, n, r, s, h) {
  if (getPlatform() === "windows") return !0;
  let y = n.ino === 0n || r.ino === 0n ? [e] : (s.get(`${n.dev}:${n.ino}`) ?? []);
  if (
    y.includes(e) &&
    r.nlink === BigInt(y.length) &&
    (h === void 0 ? y.length === 1 : y.every((w) => h.has(w)))
  ) {
    if (
      (
        await Promise.all(
          y
            .filter((L) => L !== e)
            .map((L) =>
              lstat_40(L, { bigint: !0 }).then(
                (G) => G.isFile() && G.ino === r.ino && G.dev === r.dev,
                () => !1,
              ),
            ),
        )
      ).every(Boolean)
    )
      return !0;
  }
  return (
    logForDebugging(
      `versionDirSwap: ${e} has ${r.nlink} names and the installed copy's listing accounts for ${y.length} (a hard link elsewhere, a name moved since, or a name no install gives it); treating the trees as different`,
    ),
    !1
  );
}
/**
 * 逐块比较暂存与已安装文件内容。
 */
//@ chunk-e6aww6q8.js:4423234-4424015 placement
async function compareFileBytes(e, n, r, s, h, y, S) {
  let w = join_124(e, ...r.split("/")),
    L = await openRegularFileChecked(w, {}).catch((q) => {
      throw new StagedReadError(q);
    });
  if (L === void 0) throw new StagedReadError(RangeError("a staged entry stopped being a regular file"));
  let handle = L.handle;
  try {
    if (!(await arePathDirsUnchanged(n, r, S.directories))) return !1;
    let q = await openRegularFileChecked(join_124(n, ...r.split("/")), {
      occupant: { owner: L.owner, names: S.names, loose: h, exec: y },
    });
    if (q === void 0) return !1;
    let handle_2 = q.handle;
    try {
      if (q.size !== s) return !1;
      let allocUnsafe = Buffer.allocUnsafe(Zj),
        allocUnsafe_2 = Buffer.allocUnsafe(Zj);
      for (let we = 0; we <= s; we += Zj) {
        let [Ee, Ae] = await Promise.all([
          readFully(handle, allocUnsafe, we).catch((Ie) => {
            throw new StagedReadError(Ie);
          }),
          readFully(handle_2, allocUnsafe_2, we),
        ]);
        if (Ee !== Ae || !allocUnsafe.subarray(0, Ee).equals(allocUnsafe_2.subarray(0, Ae))) return !1;
        if (Ee < Zj) return we + Ee === s;
      }
      return !1;
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
async function readFully(e, n, r, s = 0) {
  if (s === n.length) return s;
  let { bytesRead: bytesRead } = await e.read(n, s, n.length - s, r + s);
  return bytesRead === 0 ? s : readFully(e, n, r, s + bytesRead);
}
//@ chunk-e6aww6q8.js:4424150-4424264 placement
var OCCUPIED_RETRY_DELAYS_MS = [100, 500, 2000],
  MAX_WAIT_MS = 20000,
  RETRY_BUDGET_MS = Ado.reduce((e, n) => e + n, 0) + OCCUPIED_RETRY_DELAYS_MS[0],
  OCCUPIED_ERRORS = new Set(["ENOTEMPTY", "EEXIST", "EISDIR"]);
//@ chunk-e6aww6q8.js:4424264-4424559 placement
class HeldOccupantError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  code;
  pluginCommandErrorCategory = "in-use";
  constructor(e, n) {
    super(
      e,
      "plugin install: the installed copy of this plugin version could not be set aside (held by another program, or not modifiable by this account) and was not replaced",
    );
    this.code = n;
    this.name = "HeldOccupantError";
  }
}
//@ chunk-e6aww6q8.js:4424559-4424846 placement
class BusyVersionDirError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  code;
  pluginCommandErrorCategory = "unknown";
  constructor(e, n) {
    super(
      e,
      "plugin install: the new copy of this plugin version could not be moved into its version folder (any installed copy had first been set aside or removed)",
    );
    this.code = n;
    this.name = "BusyVersionDirError";
  }
}
//@ chunk-e6aww6q8.js:4424846-4424971 placement
class OccupiedDestination extends Error {
  refusal;
  constructor(e) {
    super("destination occupied");
    this.refusal = e;
    this.name = "OccupiedDestination";
  }
}
/**
 * 替换版本目录：除不可比对的部分外与暂存树一致时整目录替换。
 */
//@ chunk-e6aww6q8.js:4424971-4426197 placement
async function swapVersionDir(e, n, r) {
  let s = {
      renameDirectory: r.renameDirectory ?? rename_7,
      sleep: r.sleep ?? sleep,
      budget: { waitMs: MAX_WAIT_MS, reserveMs: RETRY_BUDGET_MS, entries: Pft, bytes: Mft },
    },
    h = async () => {
      if (!r.keepIdentical) return "differs";
      let { verdict: verdict, refresh: refresh } = await compareVersionTrees(e, n, {
        binariesHook: r.binariesHook,
        budget: s.budget,
      });
      if (verdict === "identical" && refresh.length > 0)
        return (
          logForDebugging(
            `versionDirSwap: ${n} matches the staged tree except for ${refresh.join(", ")}, which a compare cannot vouch for; replacing the whole copy`,
          ),
          "differs"
        );
      return verdict;
    },
    y = async (Se, ke) => {
      if (Se === "kept") await removeStagedCopy(e);
      if (
        (await Promise.all(ke.map(removeSetAsideCopy)), (await classifyCacheEntry(dirname_72(n))) === "other")
      )
        await sweepStaleTempSiblings(n);
      return Se;
    },
    S = await h().catch(async (Se) => {
      throw (await removeStagedCopy(e), Se);
    });
  if (S === "identical")
    return (
      logForDebugging(`versionDirSwap: ${n} already holds exactly the staged tree; kept it`),
      y("kept", [])
    );
  let w =
      S === "absent"
        ? { kind: "absent" }
        : await setInstalledCopyAside(n, s).catch(async (Se) => {
            throw (await removeStagedCopy(e), Se);
          }),
    L = w.kind === "aside" ? w.path : void 0,
    G = [],
    q = () => [...(L === void 0 ? [] : [L]), ...G],
    Z;
  try {
    Z = await publishStagedTree(e, n, h, s, G);
  } catch (error) {
    s.budget.reserveMs = 0;
    let ke = await restoreSetAsideCopy(n, w, G, h, s);
    if ((await removeStagedCopy(e), ke === "kept")) return y("kept", q());
    if (ke === "restored")
      await Promise.all(
        G.map(async (we) =>
          (await hasRealEntries(we, { whenUnreadable: !0 })) ? void 0 : removeSetAsideCopy(we),
        ),
      );
    throw await restoreVersionDir(error, n, ke, q());
  }
  return y(Z, q());
}
//@ chunk-e6aww6q8.js:4426197-4427064 placement
async function setInstalledCopyAside(e, n) {
  let r = makeTempSiblingName(e);
  try {
    return (
      await touchVersionDir(e),
      await renameDirectoryWithRetry(e, r, n),
      await touchVersionDir(r),
      logForDebugging(`versionDirSwap: set the installed copy aside: ${e} \u2192 ${r}`),
      { kind: "aside", path: r }
    );
  } catch (error) {
    if (isPathAbsent(error)) return { kind: "absent" };
    let h = getErrnoCode(error);
    if (h === "EXDEV")
      return (
        logForDebugging(
          `versionDirSwap: ${e} sits on a filesystem layer that refuses to rename it (EXDEV); removing it in place before the publish instead`,
          { level: "warn" },
        ),
        await removeDirectoryTreeNoFollow(e),
        { kind: "removed" }
      );
    if (_De(error))
      throw new HeldOccupantError(
        `The installed copy of this plugin version at ${e} could not be replaced: it is in use by another program (for example a running Claude Code session, or an editor or terminal inside that folder), or this account is not allowed to modify it (${h}). It was not replaced and the new copy was discarded. Close what is using it, or check the folder's permissions, and run the install again.`,
        h ?? "unknown",
      );
    throw error;
  }
}
//@ chunk-e6aww6q8.js:4427064-4427121 placement
function _De(e) {
  return getPlatform() === "windows" && TRANSIENT_FS_ERRORS_2.has(getErrnoCode(e) ?? "");
}
//@ chunk-e6aww6q8.js:4427121-4427240 placement
async function sleepWithinBudget(e, n) {
  if (n.budget.waitMs - e < n.budget.reserveMs) return !1;
  return ((n.budget.waitMs -= e), await n.sleep(e), !0);
}
/**
 * 重命名目录，暂时失败按延迟表重试。
 */
//@ chunk-e6aww6q8.js:4427240-4427553 placement
async function renameDirectoryWithRetry(e, n, r, s = !1, h = 0) {
  try {
    await r.renameDirectory(e, n);
  } catch (error) {
    let S = _De(error) ? Ado[h] : void 0;
    if (S === void 0) throw error;
    if (s && (await classifyCacheEntry(n)) !== "absent") throw new OccupiedDestination(error);
    if (!(await sleepWithinBudget(S, r))) throw error;
    (logForDebugging(
      `versionDirSwap: rename ${e} \u2192 ${n} failed (${nW(error)}); trying again after ${S}ms`,
    ),
      await renameDirectoryWithRetry(e, n, r, s, h + 1));
  }
}
//@ chunk-e6aww6q8.js:4427553-4427733 placement
async function classifyRenameFailure(e, n) {
  if (e instanceof OccupiedDestination) return { occupied: !0, error: e.refusal };
  let r = getErrnoCode(e) ?? "";
  return {
    occupied:
      OCCUPIED_ERRORS.has(r) || ((r === "ENOTDIR" || _De(e)) && (await classifyCacheEntry(n)) !== "absent"),
    error: e,
  };
}
/**
 * 发布暂存树；目标被其他进程重建时比较并保留或挪开。
 */
//@ chunk-e6aww6q8.js:4427733-4428103 placement
async function publishStagedTree(e, n, r, s, h, y = 0) {
  try {
    return (await renameDirectoryWithRetry(e, n, s, !0), "published");
  } catch (error) {
    let { occupied: occupied, error: error_2 } = await classifyRenameFailure(error, n),
      G = OCCUPIED_RETRY_DELAYS_MS[y];
    if (G === void 0 || !occupied || !(await sleepWithinBudget(G, s))) throw error_2;
    if (
      (logForDebugging(
        `versionDirSwap: ${n} was re-created by another process during the install (${nW(error_2)}); looked again after ${G}ms`,
      ),
      (await compareAndSetAside(n, r, s, h)) === "identical")
    )
      return "kept";
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
/**
 * 失败后把挪开的副本移回（无内容则不恢复）。
 */
//@ chunk-e6aww6q8.js:4428342-4428723 placement
async function restoreSetAsideCopy(e, n, r, s, h) {
  if (n.kind !== "aside") return n.kind === "removed" ? "removed" : "untouched";
  if (!(await hasRealEntries(n.path, { whenUnreadable: !0 })))
    return (
      logForDebugging(
        `versionDirSwap: the folder that was at ${e} held no plugin payload (or is gone); it is not moved back and the version path is left free`,
        { level: "warn" },
      ),
      "not-restored"
    );
  let y = await moveInstalledCopyBack(n.path, e, s, h, r);
  return y === "moved" ? "restored" : y;
}
//@ chunk-e6aww6q8.js:4428723-4429258 placement
async function moveInstalledCopyBack(e, n, r, s, h, y = !1) {
  try {
    return (
      await renameDirectoryWithRetry(e, n, s, !0),
      logForDebugging(`versionDirSwap: moved ${e} back to ${n}`, { level: "warn" }),
      "moved"
    );
  } catch (error) {
    let { occupied: occupied, error: error_2 } = await classifyRenameFailure(error, n);
    if (!y && occupied) {
      let G = await compareAndSetAside(n, r, s, h).catch((q) => {
        logForDebugging(`versionDirSwap: could not displace what now stands at ${n} (${nW(q)})`, {
          level: "warn",
        });
        return;
      });
      if (G === "identical") return "kept";
      if (G === "differs" || G === "absent")
        return (
          await sleepWithinBudget(OCCUPIED_RETRY_DELAYS_MS[0], s),
          moveInstalledCopyBack(e, n, r, s, h, !0)
        );
    }
    return (
      logForDebugging(`versionDirSwap: could not move ${e} back to ${n} (${nW(error_2)})`, { level: "warn" }),
      "stranded"
    );
  }
}
/**
 * 替换失败时恢复原版本目录，并说明恢复结果。
 */
//@ chunk-e6aww6q8.js:4429258-4430664 placement
async function restoreVersionDir(e, n, r, s) {
  let h = getErrnoCode(e) ?? "unknown",
    y = e instanceof HeldOccupantError || _De(e) || OCCUPIED_ERRORS.has(h),
    flat = (
      await Promise.all(s.map(async (Z) => ((await classifyCacheEntry(Z)) === "absent" ? [] : [Z])))
    ).flat(),
    w = {
      untouched: "",
      removed:
        " The previously installed copy had to be removed first (this filesystem refuses to rename it), so this plugin version is not installed now.",
      restored: " The previously installed copy was moved back.",
      "not-restored":
        " The folder that was there before held no plugin files (or was already gone) and was not moved back; install the plugin again to restore it.",
      stranded: " The previously installed copy could not be moved back.",
    }[r],
    L =
      flat.length === 0
        ? ""
        : ` Left on disk (removed by a later install of this version, or the plugin cache cleanup): ${flat.join(", ")}.`;
  if (!y && (r === "untouched" || r === "restored") && flat.length === 0) {
    if (w !== "") logForDebugging(`versionDirSwap:${w}`, { level: "warn" });
    return e;
  }
  let G = y
    ? `the new copy or the version folder stayed busy while the install ran (${h}) \u2014 usually a scanner still reading the freshly downloaded files, another program using that folder, or another process re-creating it`
    : `the move failed (${h})`;
  return new BusyVersionDirError(
    `Could not move the new copy of this plugin version into ${n}: ${G}.${w}${L} ${y ? "Run the install again once other Claude Code sessions or programs using that folder have finished." : "Check the plugin cache folder's permissions and free disk space, then run the install again."}`,
    h,
  );
}
//@ chunk-e6aww6q8.js:4430664-4430890 placement
async function touchVersionDir(e) {
  let date = new Date();
  await lutimes_6(e, date, date).catch((r) => {
    if (isPathAbsent(r)) return;
    logForDebugging(
      `versionDirSwap: could not refresh the timestamp of ${e} (${nW(r)}); a concurrent cleanup may treat it as older than it is`,
      { level: "warn" },
    );
  });
}
//@ chunk-e6aww6q8.js:4430890-4430962 placement
function nW(e) {
  return getErrnoCode(e) ?? (e instanceof Error ? e.name : "unknown error");
}
/**
 * 删除挪开的旧副本，删不净记 warn。
 */
//@ chunk-e6aww6q8.js:4430962-4431327 placement
async function removeSetAsideCopy(e) {
  let n = await classifyCacheEntry(e);
  if (n === "absent") return;
  if (
    (await (n === "other" ? removeDirectoryTreeNoFollow(e) : removePathEntry(e)).catch((r) => {
      logForDebugging(`versionDirSwap: removing the set-aside copy ${e} failed (${nW(r)})`);
    }),
    (await classifyCacheEntry(e)) !== "absent")
  )
    logForDebugging(
      `versionDirSwap: the set-aside copy ${e} could not be fully removed; a later install of this version or the plugin cache cleanup removes it`,
      { level: "warn" },
    );
}
//@ chunk-e6aww6q8.js:4431327-4431505 placement
async function removeStagedCopy(e) {
  let n = await classifyCacheEntry(e);
  if (n === "absent") return;
  await (n === "other" ? removeDirectoryTreeNoFollow(e) : removePathEntry(e)).catch((r) => {
    logForDebugging(`versionDirSwap: could not remove the staged copy ${e} (${nW(r)})`);
  });
}

export { swapVersionDir };
