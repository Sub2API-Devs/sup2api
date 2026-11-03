/**
 * utils/fsAnchor/treeAnchor.ts
 *
 * 2.1.316 新增。锚定目录树操作（防 TOCTOU）：/proc fd、macOS NOFOLLOW_ANY、完整路径三种后端。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p5msxby3.js (45)
 * attribution: placement 45
 */
import { constants, fstat, close, open, fsync, fchmod, fchown, writeFile } from "fs";
import { promisify, getSystemErrorName } from "util";
import { mkdtemp, symlink, rm, lstat } from "fs/promises";
import { tmpdir } from "os";
import { getErrnoCode, isENOENT, isSyscallError } from "../errors.js";
import { READ_LIMITS } from "../fsBoundRead.js";
import { logError } from "../log.js";
import { limitConcurrency } from "../concurrencyLimit.js";
import { onceExport } from "../../../vendor/lodash-es/once.js";
import { logForDebugging } from "../debug.js";
import { resolvedRoot, createDeviceTreeHost } from "./deviceTreeHost.js";

//@ chunk-p5msxby3.js:731-852 placement
class OwnerNotGiven extends Error {
  code;
  constructor(e) {
    super("the new file could not be given its owner", { cause: e });
    this.code = getErrnoCode(e);
  }
}
//@ chunk-p5msxby3.js:852-1002 placement
var ANCHOR_UNAVAILABLE_REASONS = [
  "unsupported_platform",
  "no_procfs",
  "no_ffi",
  "nofollow_any_unenforced",
  "remote_volume",
  "unstable_identity",
  "bring_up_failed",
  "no_hard_links",
];
//@ chunk-p5msxby3.js:1002-1041 placement
function isAnchorUnavailableReason(e) {
  return ANCHOR_UNAVAILABLE_REASONS.includes(e);
}
/**
 * 锚定错误码转错误
 */
//@ chunk-p5msxby3.js:1041-2016 placement
function workingErrorFor(e) {
  switch (e) {
    case "WORKING_PARENT_NOT_DIRECTORY":
      return Error("a destination ancestor is a symlink or not a directory");
    case "WORKING_NAME_NOT_PLAIN":
      return Error("not a plain file name here");
    case "WORKING_FILE_HELD":
      return Error("another program holds the file");
    case "WORKING_LIST_UNSUPPORTED":
      return Error("this backend cannot list a held directory, or cannot stop at the bound that was set");
    case "WORKING_LIST_TOO_LONG":
      return Error("the directory holds more names than may be listed");
    case "WORKING_DIRECTORY_MOVED":
      return Error(
        "the operation succeeded, but a directory that it used may have been moved meanwhile: what it made or moved may lie outside the tree, or have come from outside it",
      );
    case "WORKING_DIRECTORY_MOVED_UNDONE":
      return Error(
        "a directory may have been moved, so the operation made nothing, or what it made was removed again",
      );
    case "WORKING_LINK_UNSUPPORTED":
      return Error("this backend cannot make or read a symbolic link in a held directory");
  }
}
//@ chunk-p5msxby3.js:2016-2131 placement
function rootNotCanonicalError() {
  let e = Error("tree anchor root is not a canonical path");
  return ((e.code = "WORKING_ROOT_NOT_CANONICAL"), e);
}
//@ chunk-p5msxby3.js:2131-2175 placement
function q(e) {
  let o = workingErrorFor(e);
  return ((o.code = e), o);
}
/**
 * 锚定使用的打开标志与上限
 */
//@ chunk-p5msxby3.js:2175-2410 placement
var ANCHOR_OPEN_FLAGS = Symbol("createsInHeldDirectoryCheckedByPath"),
  _e = 536870912,
  Dn = 2097152,
  K = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW | READ_LIMITS,
  ae = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS,
  bn = 511,
  pn = 1e7,
  Pn = 512,
  kn = 3,
  On = 16,
  Ke = Error("removeTree stopped after a failure");
/**
 * 拆分锚定相对路径
 */
//@ chunk-p5msxby3.js:2410-2606 placement
function splitAnchoredPath(e, o) {
  let parts = e.split("/");
  if (
    e.includes("\x00") ||
    parts.some((c) => c === "" || c === "." || c === ".." || (o !== "/" && c.includes(o)))
  )
    throw Error("anchored path must be relative, of plain segments");
  return parts;
}
//@ chunk-p5msxby3.js:2606-2682 placement
function he(e, o) {
  let s = splitAnchoredPath(e, o);
  return { dirs: s.slice(0, -1), leaf: s.at(-1) ?? "" };
}
//@ chunk-p5msxby3.js:2682-2770 placement
function Ye(e) {
  if ((e & constants.O_CREAT) !== 0) throw Error("anchored open never creates");
  return e;
}
//@ chunk-p5msxby3.js:2770-2865 placement
function J(e) {
  let o = getErrnoCode(e);
  return o === "ENOTDIR" || o === "ELOOP" ? q("WORKING_PARENT_NOT_DIRECTORY") : e;
}
//@ chunk-p5msxby3.js:2865-2887 placement
var oe = { found: "same" };
//@ chunk-p5msxby3.js:2887-2952 placement = getFileIdentity (0.794)
function getFileIdentity(e, o) {
  return e.ino !== 0n && e.dev === o.dev && e.ino === o.ino;
}
/**
 * 逐段打开到持有目录
 */
//@ chunk-p5msxby3.js:2952-3317 placement
async function walkToHeldDir(e, o, s, c, w) {
  let n = null;
  try {
    for (let [m, P] of c.entries()) {
      let g = n ?? e.getHeldDir(s),
        d = await (m < c.length - 1 && e.openDirToPass !== void 0
          ? e.openDirToPass(g, P, w)
          : e.openDir(g, P, w));
      if (n !== null) await e.closeDir(n);
      n = d;
    }
  } catch {
    if (n !== null) await e.closeDir(n);
    return null;
  } finally {
    await s.close();
  }
  return n === null ? null : e.holdOpenedDir(n, o.path.join(s.realPath, ...c));
}
/**
 * 在锚定的目录树中执行操作（防 TOCTOU），支持 /proc fd、macOS NOFOLLOW_ANY 与完整路径后端。
 */
//@ chunk-p5msxby3.js:3317-10817 placement
function anchorOver(e, o, s, c, w, n, m = [], P) {
  let { sep: sep } = o.path,
    d = void 0,
    h = void 0,
    O = void 0,
    v = void 0,
    G = !1,
    Z = !1,
    { renameNoReplace: renameNoReplace, renameInNoReplace: renameInNoReplace } = n,
    j = null,
    N = () => (j ??= s.close()),
    weakMap = new WeakMap(),
    y = async (r, i, a = !1) => {
      let f = i === "" ? [] : splitAnchoredPath(i, sep),
        hold = await n.hold(r),
        p = hold === null || f.length === 0 ? hold : await walkToHeldDir(n, o, hold, f, a);
      if (p === null) return null;
      let E = null,
        T = () => (E ??= p.close()),
        A = {
          realPath: p.realPath,
          get closed() {
            return E !== null;
          },
          stat: async () => {
            if (E !== null) throw Error("held directory is closed");
            return p.stat();
          },
          close: T,
          [Symbol.asyncDispose]: T,
        };
      return (weakMap.set(A, p), A);
    },
    b = (r) => {
      let i = weakMap.get(r);
      if (i === void 0) throw Error("held directory belongs to another anchor");
      if (r.closed) throw Error("held directory is closed");
      return i;
    },
    I = (r) => (r === c ? Promise.resolve() : n.closeDir(r)),
    Y = async (r, i, a, f) => {
      try {
        return await n.openDir(r, i);
      } catch (error) {
        if (a === null || !isENOENT(error)) throw J(error);
        if (
          await n.mkdir(r, i, a).then(
            () => !0,
            (E) => {
              if (getErrnoCode(E) !== "EEXIST") throw E;
              return !1;
            },
          )
        )
          await ee("mkdir", { to: { dir: r, dirs: f } }, () => n.rmdir(r, i));
        return n.openDir(r, i).catch((E) => {
          throw J(E);
        });
      }
    },
    F = () => {
      if (j !== null) throw Error("tree anchor is closed");
    },
    se = async (r, i) => {
      if (n.list === void 0) throw q("WORKING_LIST_UNSUPPORTED");
      let a = typeof i === "object" ? i.first : i,
        list = await n.list(r, a);
      if (a !== void 0 && !(list.length <= a)) {
        if (typeof i === "object" && a >= 0) return Ge(list.slice(0, a), sep);
        throw q("WORKING_LIST_TOO_LONG");
      }
      return Ge(list, sep);
    },
    V = async (r, i) => {
      F();
      let a = c;
      try {
        for (let [f, D] of r.entries()) {
          F();
          let p = await Y(a, D, i, r.slice(0, f));
          (await I(a), (a = p));
        }
        return a;
      } catch (error) {
        throw (await I(a), error);
      }
    },
    B = async (r, i) => {
      let { dirs: dirs, leaf: leaf } = he(r, sep),
        D = await V(dirs, null);
      try {
        return (F(), await i(D, leaf, dirs));
      } finally {
        await I(D);
      }
    },
    De = async (r, i, a) => {
      let f = he(i, sep);
      return he(r, sep).dirs.join("/") === f.dirs.join("/")
        ? B(r, (D, p, E) => a({ dir: D, leaf: p, dirs: E }, { dir: D, leaf: f.leaf, dirs: E }))
        : B(r, (D, p, E) => B(i, (T, A, X) => a({ dir: D, leaf: p, dirs: E }, { dir: T, leaf: A, dirs: X })));
    },
    be = (r) =>
      isENOENT(r)
        ? { found: "missing" }
        : getErrnoCode(r) === "WORKING_PARENT_NOT_DIRECTORY"
          ? { found: "replaced" }
          : { found: "check_failed", checkError: r },
    Ne = async (r, i) => {
      let a = await V(r, null).then((f) => ({ now: f }), be);
      if (!("now" in a)) return a;
      try {
        return await i(a.now);
      } catch (error) {
        return be(error);
      } finally {
        await I(a.now).catch(() => {});
      }
    },
    pe = (r) => n.holdOpenedDir(r, "").stat(),
    Re = (r, i) =>
      r.dev !== i.dev
        ? { found: "replaced", differs: "device" }
        : r.ino !== i.ino
          ? { found: "replaced", differs: "inode" }
          : oe,
    Be = async ({ dir: dir, dirs: dirs }) =>
      dirs.length === 0 ? oe : Ne(dirs, async (a) => Re(await pe(dir), await pe(a))),
    He = async ({ dir: dir, dirs: dirs }) => oe,
    fe = null,
    Pe = async ({ to: to, from: from }) => null,
    me = (r, i, a) => {
      try {
        (void 0)?.({ operation: r, ...i, outcome: a ? "undone" : "not_undone" });
      } catch (error) {
        logError(error);
      }
      return q(a ? "WORKING_DIRECTORY_MOVED_UNDONE" : "WORKING_DIRECTORY_MOVED");
    },
    Un = async (r) => {
      return;
    },
    ee = async (r, i, a) => {
      let f = await Pe(i);
      if (f === null) return;
      throw me(
        r,
        f,
        a !== void 0 &&
          (await a(f.side).then(
            () => !0,
            () => !1,
          )),
      );
    },
    Ae = async ({ dir: dir, leaf: leaf }, a) => {
      if (!getFileIdentity(await n.lstat(dir, leaf), await a())) throw Error("another file has the name");
      await n.unlink(dir, leaf);
    },
    Ce = (r, i, a, f, D) =>
      B(r, async (p, E, T) => {
        let A = null,
          X = !1,
          ke = async (ne) => {
            let le = async (te) => ne !== null && getFileIdentity(ne, await n.lstat(te, E));
            if (fe !== null && !(await fe()))
              throw (
                (A = { found: "replaced", side: "destination", rel: T.join("/") }),
                (X = await le(p).catch(() => !1)),
                Error("the root is not in its place")
              );
            let re = oe,
              de =
                re.found === "same" ||
                (await Ne(T, async (te) => ({ found: (await le(te)) ? "same" : "replaced" }))).found ===
                  "same"
                  ? await He({ dir: p, dirs: T })
                  : re;
            if (de.found === "same") return;
            throw (
              (A = { ...de, side: "destination", rel: T.join("/") }),
              (X = await le(p).catch(() => !1)),
              Error("the file is not at its name")
            );
          };
        await n.create(p, E, [...m, ...T], i, a, f, D, void 0).catch(async (ne) => {
          throw A === null ? ne : me("create", A, X && (await n.lstat(p, E).then(() => !1, isENOENT)));
        });
      }),
    Te = (r) => async (i, a) => {
      (await n.link(i.dir, i.leaf, a.dir, a.leaf),
        await ee("link", { to: a, from: i }, async (f) => {
          let D = Ae(a, () => n.lstat(i.dir, i.leaf));
          if ((await D.catch(() => {}), r && f !== "destination")) await n.unlink(i.dir, i.leaf);
          await D;
        }));
    },
    Fe = (r, i, a) =>
      B(a, async (f, D, p) => {
        (await n.linkIn(b(r), assertPlainLeaf(i), f, D),
          await ee("link", { to: { dir: f, dirs: p } }, () =>
            Ae({ dir: f, leaf: D, dirs: p }, () => n.statIn(b(r), assertPlainLeaf(i))),
          ));
      }),
    rn = async (r, i) => {
      (await n.rename(r.dir, r.leaf, i.dir, i.leaf), await ee("rename", { to: i, from: r }));
    },
    Se = async (r, i, a) => a();
  return {
    backend: e,
    realRoot: w,
    createsInHeldDirectory: n.createsInHeldDirectory !== !1,
    heldCreateRefusal: n.heldCreateRefusal ?? null,
    ...!1,
    checksCreatedFiles: !1,
    mkdirp: async (r, i = bn) => I(await V(splitAnchoredPath(r, sep), i)),
    create: (r, i, a) => Ce(r, i, a, !1),
    createSynced: (r, i, a, f) => Ce(r, i, a, !0, f),
    createAndOpen: (r, i) => B(r, (a, f, D) => n.createAndOpen(a, f, [...m, ...D], i)),
    link: (r, i) => De(r, i, Te(!1)),
    rename: (r, i) => De(r, i, rn),
    placeCreated: (r, i) =>
      De(
        r,
        i,
        renameNoReplace === void 0
          ? Te(!0)
          : (a, f) => Se({ to: f, from: a }, f, (D) => renameNoReplace(a.dir, a.leaf, f.dir, f.leaf, D)),
      ),
    symlink: (r, i) => B(i, (a, f) => n.symlink(r, a, f)),
    readlink: (r) => B(r, n.readlink),
    unlink: (r) => B(r, n.unlink),
    rmdir: (r) => B(r, n.rmdir),
    list: async (r, i) => {
      let a = r === "" ? [] : splitAnchoredPath(r, sep),
        f = await V(a, null);
      try {
        return (F(), await se(f, i));
      } finally {
        await I(f);
      }
    },
    removeTree: (r, { keep: i, onDeleted: a } = {}) =>
      B(r, async (f, D, p) => {
        if (i !== void 0) assertPlainLeaf(i);
        let E = i === void 0 ? null : Buffer.from(i),
          T = (_) => E !== null && (typeof _ === "string" ? _ === i : _.equals(E)),
          { bytes: bytes } = n,
          X = (_, C) => (typeof C === "string" ? n.unlink(_, C) : bytes.unlink(_, C)),
          ke = (_, C) => (typeof C === "string" ? n.rmdir(_, C) : bytes.rmdir(_, C)),
          ne = (_, C) => (typeof C === "string" ? n.openDir(_, C) : bytes.openDir(_, C)),
          le = async (_) => (bytes === void 0 ? se(_) : In(await bytes.list(_), sep)),
          re = async (_, C) => {
            try {
              await X(_, C);
            } catch (error) {
              let ie = getErrnoCode(error);
              if (ie === "ENOENT") return "gone";
              if (ie === "EISDIR" || ie === "EPERM") return "directory";
              throw error;
            }
            return (a?.(), "gone");
          },
          de = pn,
          te = async (_, C, W, ie, Le = !1) => {
            for (let Me = 0; ; Me++) {
              F();
              let filtered = (await le(W)).filter((R) => !(Le && T(R)));
              if (((de -= filtered.length), de < 0))
                throw Object.assign(Error("directory too large to remove: too many entries"), {
                  code: "E2BIG",
                });
              if (ie.length >= Pn)
                throw Object.assign(Error("directory too deep to remove"), { code: "ENAMETOOLONG" });
              let xe = !1,
                tn = limitConcurrency(On, async (R) => {
                  if (xe) throw Ke;
                  F();
                  try {
                    return await re(W, R);
                  } catch (error) {
                    throw ((xe = !0), error);
                  }
                }),
                settled = await Promise.allSettled(filtered.map((R) => tn(R))),
                filtered_2 = settled.filter((R) => R.status === "rejected");
              if (filtered_2.length > 0)
                throw (filtered_2.find((R) => R.reason !== Ke) ?? filtered_2[0]).reason;
              let filtered_3 = filtered.filter((R, M) => {
                let Ue = settled[M];
                return Ue?.status === "fulfilled" && Ue.value === "directory";
              });
              for (let R of filtered_3) {
                let M = await ne(W, R).catch(() => null);
                if (M === null) {
                  if ((await re(W, R)) === "directory") (await ke(W, R), a?.());
                  continue;
                }
                try {
                  await te(W, R, M, [...ie, R]);
                } finally {
                  await n.closeDir(M);
                }
              }
              if (Le && E !== null) return;
              try {
                (await ke(_, C), a?.());
                return;
              } catch (error) {
                let M = getErrnoCode(error);
                if (M === "ENOENT") return;
                if (M !== "ENOTEMPTY" || Me >= kn) throw error;
              }
            }
          },
          Oe = await n.openDir(f, D).catch(async (_) => {
            if (isENOENT(_)) return null;
            if (E !== null) throw J(_);
            if ((await re(f, D)) === "gone") return null;
            throw J(_);
          });
        if (Oe === null) return;
        try {
          await te(f, D, Oe, [...p, D], !0);
        } finally {
          await n.closeDir(Oe);
        }
      }),
    lstat: async (r) => {
      if (r !== "") return B(r, n.lstat);
      return (F(), s.stat());
    },
    open: async (r, i) => {
      let a = Ye(i);
      if (n.openBeneath !== void 0) {
        let { dirs: dirs, leaf: leaf } = he(r, sep);
        return (F(), n.openBeneath([...m, ...dirs], leaf, a));
      }
      return B(r, (f, D, p) => n.open(f, D, [...m, ...p], a));
    },
    anchorBeneath: async (r) => {
      let i = splitAnchoredPath(r, sep),
        holdOpenedDir = n.holdOpenedDir(await V(i, null), o.path.join(w, ...i));
      return anchorOver(
        e,
        o,
        holdOpenedDir,
        n.getHeldDir(holdOpenedDir),
        holdOpenedDir.realPath,
        n.forAnchorBeneath ?? n,
        [...m, ...i],
        P,
      );
    },
    holdOutside: y,
    moveOut: (r, i, a) =>
      B(r, async (f, D, p) => {
        (await n.renameOut(f, D, b(i), assertPlainLeaf(a)),
          await ee("rename", { from: { dir: f, dirs: p } }));
      }),
    moveIn: (r, i, a) =>
      B(a, async (f, D, p) => {
        (await n.renameIn(b(r), assertPlainLeaf(i), f, D), await ee("rename", { to: { dir: f, dirs: p } }));
      }),
    linkIn: Fe,
    placeCreatedIn: (r, i, a) =>
      renameInNoReplace === void 0
        ? Fe(r, i, a)
        : B(a, (f, D, p) =>
            Se({ to: { dir: f, dirs: p } }, { dir: f, leaf: D, dirs: p }, (E) =>
              renameInNoReplace(b(r), assertPlainLeaf(i), f, D, E),
            ),
          ),
    statIn: async (r, i) => n.statIn(b(r), assertPlainLeaf(i)),
    openIn: async (r, i, a) => n.openIn(b(r), assertPlainLeaf(i), Ye(a)),
    unlinkIn: async (r, i) => n.unlinkIn(b(r), assertPlainLeaf(i)),
    close: N,
    [Symbol.asyncDispose]: N,
  };
}
//@ chunk-p5msxby3.js:10817-10864 placement
function Ge(e, o) {
  return e.filter((s) => isPlainEntryName(s, o));
}
//@ chunk-p5msxby3.js:10864-10930 placement
function In(e, o) {
  return e.filter((s) => isPlainEntryName(s.toString("latin1"), o));
}
//@ chunk-p5msxby3.js:10930-11035 placement
function isPlainEntryName(e, o) {
  return e !== "" && e !== "." && e !== ".." && !e.includes("/") && !e.includes(o) && !e.includes("\x00");
}
/**
 * 确认叶子名为普通名字
 */
//@ chunk-p5msxby3.js:11035-11202 placement
function assertPlainLeaf(e) {
  if (e === "" || e === "." || e === ".." || e.includes("/") || e.includes("\\") || e.includes("\x00"))
    throw Error("a held-directory leaf must be one plain name");
  return e;
}
/**
 * 打开根目录锚
 */
//@ chunk-p5msxby3.js:11202-11684 placement
async function openRootAnchor(e, o) {
  let { fs: fs } = e,
    c = await fs.realpath(o).catch(() => null);
  if (c === null) return null;
  let w = await fs.open(c, K).catch(() => null);
  if (w === null) return null;
  try {
    let [n, m] = await Promise.all([w.stat({ bigint: !0 }), fs.lstat(c, { bigint: !0 })]);
    if (!n.isDirectory() || !m.isDirectory() || n.ino === 0n || n.dev !== m.dev || n.ino !== m.ino)
      return (await w.close().catch(() => {}), null);
  } catch {
    return (await w.close().catch(() => {}), null);
  }
  return { realPath: c, dir: w, stat: () => w.stat({ bigint: !0 }), close: () => w.close() };
}
//@ chunk-p5msxby3.js:11684-11756 placement
function Ze(e) {
  return { stat: () => e.stat({ bigint: !0 }), close: () => e.close() };
}
/**
 * 写入新建文件并设所有者与权限
 */
//@ chunk-p5msxby3.js:11756-12181 placement
async function writeCreatedFile(e, o, s, c, w, n, m) {
  let P = (g, d) =>
    e.chown(g, d).catch((h) => {
      throw new OwnerNotGiven(h);
    });
  try {
    if ((await e.writeFile(o), n !== void 0 && n.to.gid !== n.from.gid)) await P(n.from.uid, n.to.gid);
    if ((await e.chmod(s), n !== void 0 && n.to.uid !== n.from.uid)) await P(n.to.uid, n.to.gid);
    if (c) await e.sync();
    await m();
  } catch (error) {
    throw (await w().catch(() => {}), await e.close().catch(() => {}), error);
  }
  try {
    await e.close();
  } catch (error) {
    throw (await w().catch(() => {}), error);
  }
}
//@ chunk-p5msxby3.js:12181-12214 placement
var en = (e, o) => (o === void 0 ? e : e & 448);
//@ chunk-p5msxby3.js:12214-12698 placement
async function writeCreatedUnlessMoved(e, o, s, c, w, n = !1, m, P = () => Promise.resolve()) {
  let { made: made, lookError: lookError } = await e.stat({ bigint: !0 }).then(
      (v) => ({ made: v, lookError: void 0 }),
      (v) => ({ made: null, lookError: v }),
    ),
    h = async () => {
      let v = await c();
      if (made !== null && made.ino !== 0n && v !== null && v.dev === made.dev && v.ino === made.ino)
        await w();
    };
  if (m !== void 0 && made === null) throw (await e.close().catch(() => {}), new OwnerNotGiven(lookError));
  let O = made && { uid: Number(made.uid), gid: Number(made.gid) };
  return writeCreatedFile(
    e,
    o,
    s,
    n,
    h,
    m === void 0 || O === null ? void 0 : { from: O, to: { ...O, ...m } },
    () => P(made),
  );
}
//@ chunk-p5msxby3.js:12698-12847 placement
async function isSameDirectory(e, o, s) {
  let [c, w] = await Promise.all([e.fs.lstat(s, { bigint: !0 }), o.stat({ bigint: !0 })]);
  return c.dev === w.dev && c.ino === w.ino && w.ino !== 0n;
}
/**
 * fd 与路径是否同一目录
 */
//@ chunk-p5msxby3.js:12847-13103 placement
async function isSameDirectory_2(e, o) {
  try {
    let [s, c] = await Promise.all([
      e.fs.lstat(`/proc/self/fd/${o.fd}/.`, { bigint: !0 }),
      o.stat({ bigint: !0 }),
    ]);
    return s.dev === c.dev && s.ino === c.ino && c.ino !== 0n;
  } catch (error) {
    let c = getErrnoCode(error);
    if (c === "ENOENT" || c === "EACCES" || c === "EPERM") return !1;
    throw error;
  }
}
/**
 * 基于 /proc/self/fd 的后端
 */
//@ chunk-p5msxby3.js:13103-14679 placement
function procFdBackend(e, o, { realRoot: realRoot, directoryCheck: directoryCheck }, w) {
  let { fs: fs } = e,
    m = (d, h) => `/proc/self/fd/${d.fd}/${h}`,
    P = (d, h) => Buffer.concat([Buffer.from(`/proc/self/fd/${d.fd}/`), h]),
    g = {
      openDir: (d, h) => fs.open(m(d, h), K),
      mkdir: async (d, h, O) => {
        await fs.mkdir(m(d, h), { mode: O });
      },
      closeDir: (d) => d.close(),
      ...{},
      create: async (d, h, O, v, G, Z, x, L) => {
        if (
          (await writeCreatedUnlessMoved(
            await fs.open(m(d, h), ae | constants.O_NOFOLLOW, en(G, x)),
            v,
            G,
            () => fs.lstat(m(d, h), { bigint: !0 }).catch(() => null),
            () => fs.unlink(m(d, h)),
            Z,
            x,
            L,
          ),
          Z)
        )
          await d.sync().catch(() => {});
      },
      createAndOpen: (d, h, O, v) => fs.open(m(d, h), ae | constants.O_NOFOLLOW, v),
      link: (d, h, O, v) => fs.link(m(d, h), m(O, v)),
      rename: (d, h, O, v) => fs.rename(m(d, h), m(O, v)),
      symlink: (d, h, O) => fs.symlink(d, m(h, O)),
      readlink: (d, h) => fs.readlink(m(d, h)),
      unlink: (d, h) => fs.unlink(m(d, h)),
      rmdir: (d, h) => fs.rmdir(m(d, h)),
      list: async (d, h) => {
        if (h === void 0) return fs.readdir(`/proc/self/fd/${d.fd}`);
        throw q("WORKING_LIST_UNSUPPORTED");
      },
      bytes: {
        list: (d) => fs.readdir(`/proc/self/fd/${d.fd}`, { encoding: "buffer" }),
        openDir: (d, h) => fs.open(P(d, h), K),
        unlink: (d, h) => fs.unlink(P(d, h)),
        rmdir: (d, h) => fs.rmdir(P(d, h)),
      },
      lstat: (d, h) => fs.lstat(m(d, h), { bigint: !0 }),
      open: (d, h, O, v) => fs.open(m(d, h), v | constants.O_NOFOLLOW | READ_LIMITS),
      hold: (d) => openRootAnchor(e, d),
      getHeldDir: (d) => d.dir,
      holdOpenedDir: (d, h) => ({
        realPath: h,
        dir: d,
        stat: () => d.stat({ bigint: !0 }),
        close: () => d.close(),
      }),
      renameOut: (d, h, O, v) => fs.rename(m(d, h), m(O.dir, v)),
      renameIn: (d, h, O, v) => fs.rename(m(d.dir, h), m(O, v)),
      linkIn: (d, h, O, v) => fs.link(m(d.dir, h), m(O, v)),
      statIn: (d, h) => fs.lstat(m(d.dir, h), { bigint: !0 }),
      openIn: (d, h, O) => fs.open(m(d.dir, h), O | constants.O_NOFOLLOW | READ_LIMITS),
      unlinkIn: (d, h) => fs.unlink(m(d.dir, h)),
    };
  return anchorOver("linux_procfd", e, Ze(o), o, realRoot, g, [], directoryCheck);
}
//@ chunk-p5msxby3.js:14679-14774 placement
function Rn() {
  let e = globalThis.Bun?.ant?.posixFsAt;
  return typeof e?.openat === "function" ? e : null;
}
//@ chunk-p5msxby3.js:14774-14882 placement
function readDirNames(e, o, s) {
  return s >= 0 ? e.readdirat(o, { maxNames: Math.min(Math.floor(s), Number.MAX_SAFE_INTEGER) }) : [];
}
//@ chunk-p5msxby3.js:14882-14949 placement
var ge = promisify(fstat),
  ue = promisify(close),
  $e = promisify(open),
  nn = promisify(fsync),
  Hn = promisify(fchmod),
  An = promisify(fchown),
  Cn = promisify(writeFile);
//@ chunk-p5msxby3.js:14949-15086 placement
function anchoredFileOps(e) {
  return {
    stat: (o) => ge(e, o),
    writeFile: (o) => Cn(e, o),
    chown: (o, s) => An(e, o, s),
    chmod: (o) => Hn(e, o),
    sync: () => nn(e),
    close: () => ue(e),
  };
}
//@ chunk-p5msxby3.js:15086-15207 placement
var posixFsAt,
  warnNoPosixFsAtOnce = onceExport(() =>
    logForDebugging("anchor: this runtime has no Bun.ant.posixFsAt, so the macOS backend cannot come up", {
      level: "warn",
    }),
  );
//@ chunk-p5msxby3.js:15207-16159 placement
function loadDarwinAt() {
  let e = Rn();
  if (e === null) return (warnNoPosixFsAtOnce(), null);
  if (posixFsAt !== void 0) return posixFsAt;
  let o = onceExport(() => {
      return;
    }),
    s = (c, w) => {
      try {
        return w();
      } catch (error) {
        let m = Error("a file call failed (see the code and syscall properties)");
        throw (
          (m.errno = isSyscallError(error) && error.errno !== void 0 ? Math.abs(error.errno) : 0),
          (m.code = m.errno === 0 ? (getErrnoCode(error) ?? "EUNKNOWN") : getSystemErrorName(-m.errno)),
          (m.syscall = c),
          m
        );
      }
    };
  return (
    (posixFsAt = {
      openat: (c, w, n) => s("openat", () => e.openat(c, w, n)),
      getBeneath: o,
      mkdirat: (c, w, n) => s("mkdirat", () => e.mkdirat(c, w, n)),
      renameat: (c, w, n, m) => s("renameat", () => e.renameat(c, w, n, m)),
      linkat: (c, w, n, m) => s("linkat", () => e.linkat(c, w, n, m)),
      symlinkat: (c, w, n) => s("symlinkat", () => e.symlinkat(c, w, n)),
      readlinkat: (c, w) => s("readlinkat", () => e.readlinkat(c, w)),
      unlinkat: (c, w) => s("unlinkat", () => e.unlinkat(c, w)),
      rmdirat: (c, w) => s("unlinkat", () => e.unlinkat(c, w, { removeDir: !0 })),
      listDirectory: (c, w) => s("readdir", () => (w === void 0 ? e.readdirat(c) : readDirNames(e, c, w))),
      listDirectoryBytes: (c) => s("readdir", () => e.readdirat(c, { encoding: "buffer" })),
      ...{},
    }),
    posixFsAt
  );
}
//@ chunk-p5msxby3.js:16159-16212 placement
function darwinNoFollowAnyEnforced(e) {
  return (e.noFollowAnyEnforced ??= probeNoFollowAny(e));
}
/**
 * 探测 O_NOFOLLOW_ANY 是否生效
 */
//@ chunk-p5msxby3.js:16212-16781 placement
async function probeNoFollowAny(e) {
  let { fs: fs, path: path } = e,
    c = null;
  try {
    ((c = await fs.realpath(await mkdtemp(path.join(tmpdir(), "claude-nfa-")))),
      await fs.mkdir(path.join(c, "d")),
      await symlink(path.join(c, "d"), path.join(c, "l")));
    let w = ae | _e;
    try {
      await (await fs.open(path.join(c, "d", "control"), w, 384)).close();
    } catch (error) {
      if (getErrnoCode(error) === "EINVAL") return !1;
      throw error;
    }
    try {
      return (await (await fs.open(path.join(c, "l", "probe"), w, 384)).close(), !1);
    } catch (error) {
      if (getErrnoCode(error) === "ELOOP") return !0;
      throw error;
    }
  } catch (error) {
    return (
      logForDebugging(`anchor: O_NOFOLLOW_ANY probe not run (${getErrnoCode(error) ?? "not an errno"})`),
      !0
    );
  } finally {
    if (c !== null) await rm(c, { recursive: !0, force: !0 }).catch(() => {});
  }
}
//@ chunk-p5msxby3.js:16781-16915 placement
async function getDarwinCreateFn(e, o) {
  let s = o.getBeneath?.();
  if (s === void 0) return "not_bound";
  return (await probeDarwinHeldCreate(e, s)) ?? ((c, w, n) => s.create(c, [w], n & 511));
}
//@ chunk-p5msxby3.js:16915-17065 placement
function probeDarwinHeldCreate(e, o) {
  return (e.heldCreateProbed ??= probeDarwinHeldCreateUnchecked(o).then((s) => {
    if (s === "probe_not_run" || s === "probe_create_failed") e.heldCreateProbed = void 0;
    return s;
  }));
}
/**
 * 探测 macOS 持有目录下的创建
 */
//@ chunk-p5msxby3.js:17065-18042 placement
async function probeDarwinHeldCreateUnchecked(e) {
  let o = (n, m) =>
      logForDebugging(
        `anchor: the probe of the create in a held directory ${n}, so this ${m} creates by full path`,
      ),
    s = null,
    c = [],
    w = (n) => (c.push(n), ge(n, { bigint: !0 }));
  try {
    s = await mkdtemp(`${tmpdir()}/claude-held-`);
    let n = await $e(s, K);
    c.push(n);
    let m = await w(await $e(`${s}/by-path`, ae, 384)),
      P;
    try {
      P = await w(e.create(n, ["held"], 384));
    } catch (error) {
      return (o(`failed (${getErrnoCode(error) ?? "not an errno"})`, "anchor"), "probe_create_failed");
    }
    if (P.mode !== m.mode)
      return (
        o(`made a file of mode ${P.mode.toString(8)} where node made one of ${m.mode.toString(8)}`, "host"),
        "probe_wrong_mode"
      );
    let g = await lstat(`${s}/held`, { bigint: !0 }).catch((d) => {
      if (isENOENT(d)) return null;
      throw d;
    });
    if (g === null || !getFileIdentity(P, g))
      return (o("made a file that is not seen at its name", "host"), "probe_wrong_place");
    return null;
  } catch (error) {
    return (o(`could not be staged (${getErrnoCode(error) ?? "not an errno"})`, "anchor"), "probe_not_run");
  } finally {
    if ((await Promise.all(c.map((n) => ue(n).catch(() => {}))), s !== null))
      await rm(s, { recursive: !0, force: !0 }).catch(() => {});
  }
}
//@ chunk-p5msxby3.js:18042-18076 placement
var Ee = constants.O_RDONLY | Dn | constants.O_NONBLOCK;
/**
 * 按完整路径的后端
 */
//@ chunk-p5msxby3.js:18076-20629 placement
function fullPathBackend(e, o, s, { realRoot: realRoot, directoryCheck: directoryCheck }, n, m, P) {
  let { fs: fs, path: path } = e,
    h = (N, u, y, b) =>
      fs.open(path.join(realRoot, ...N, u), (y & ~constants.O_NOFOLLOW) | _e | READ_LIMITS, b),
    O = async (N, u) => {
      let y = o.fstatat?.(N, u);
      return y !== void 0 && y.dev >= 0n && y.ino < 2n ** 63n ? y : v(N, u, Ee);
    },
    v = async (N, u, y) => {
      let openat = o.openat(N, u, y | READ_LIMITS);
      try {
        return await ge(openat, { bigint: !0 });
      } finally {
        await ue(openat);
      }
    },
    G = async (N, u, y) => {
      try {
        let [b, I] = await Promise.all([N.stat({ bigint: !0 }), u()]);
        if (b.dev !== I.dev || b.ino !== I.ino)
          throw (y?.(), Object.assign(Error("not the file the held directory names"), { code: "ELOOP" }));
        return N;
      } catch (error) {
        throw (await N.close().catch(() => {}), error);
      }
    },
    Z = async (N, u, y, b, I) => {
      try {
        return N === null ? await h(b, y, ae, I) : anchoredFileOps(N(u, y, I));
      } catch (error) {
        throw J(error);
      }
    },
    { listDirectory: listDirectory, listDirectoryBytes: listDirectoryBytes } = o,
    j = (N) => ({
      ...(listDirectoryBytes !== void 0 && {
        bytes: {
          list: async (u) => listDirectoryBytes(u),
          openDir: async (u, y) => o.openat(u, y, K),
          unlink: async (u, y) => o.unlinkat(u, y),
          rmdir: async (u, y) => o.rmdirat(u, y),
        },
      }),
      openDir: async (u, y) => o.openat(u, y, K),
      mkdir: async (u, y, b) => o.mkdirat(u, y, b),
      closeDir: (u) => ue(u),
      createsInHeldDirectory: N !== null,
      ...(N !== null && {
        statDirectoryByPath: async (u) => {
          let y = await h(u, "", K | constants.O_NONBLOCK).catch((b) => {
            throw J(b);
          });
          try {
            return await y.stat({ bigint: !0 });
          } finally {
            await y.close();
          }
        },
      }),
      create: async (u, y, b, I, Y, F, se, V) => {
        if (
          (await writeCreatedUnlessMoved(
            await Z(N, u, y, b, en(Y, se)),
            I,
            Y,
            () => v(u, y, Ee).catch(() => null),
            () => o.unlinkat(u, y),
            F,
            se,
            V,
          ),
          F)
        )
          await nn(u).catch(() => {});
      },
      createAndOpen: (u, y, b, I) =>
        h(b, y, ae, I).catch((Y) => {
          throw J(Y);
        }),
      link: async (u, y, b, I) => o.linkat(u, y, b, I),
      rename: async (u, y, b, I) => o.renameat(u, y, b, I),
      symlink: async (u, y, b) => {
        if (o.symlinkat === void 0) throw q("WORKING_LINK_UNSUPPORTED");
        o.symlinkat(u, y, b);
      },
      readlink: async (u, y) => {
        if (o.readlinkat === void 0) throw q("WORKING_LINK_UNSUPPORTED");
        return o.readlinkat(u, y);
      },
      unlink: async (u, y) => o.unlinkat(u, y),
      rmdir: async (u, y) => o.rmdirat(u, y),
      ...(listDirectory !== void 0 && { list: async (u, y) => listDirectory(u, y) }),
      lstat: O,
      open: async (u, y, b, I) =>
        G(
          await h(b, y, I),
          () => O(u, y),
          () => P?.([...b, y].join("/")),
        ),
      ...(P === null && { openBeneath: (u, y, b) => h(u, y, b) }),
      hold: (u) => openRootAnchor(e, u),
      getHeldDir: (u) => u.dir.fd,
      holdOpenedDir: (u, y) => ({
        realPath: y,
        dir: { fd: u },
        stat: () => ge(u, { bigint: !0 }),
        close: () => ue(u),
      }),
      renameOut: async (u, y, b, I) => o.renameat(u, y, b.dir.fd, I),
      renameIn: async (u, y, b, I) => o.renameat(u.dir.fd, y, b, I),
      linkIn: async (u, y, b, I) => o.linkat(u.dir.fd, y, b, I),
      statIn: (u, y) => O(u.dir.fd, y),
      openIn: async (u, y, b) =>
        G(await fs.open(path.join(u.realPath, y), (b & ~constants.O_NOFOLLOW) | _e | READ_LIMITS), () =>
          v(u.dir.fd, y, Ee),
        ),
      unlinkIn: async (u, y) => o.unlinkat(u.dir.fd, y),
    });
  return anchorOver(
    "darwin_at",
    e,
    Ze(s),
    s.fd,
    realRoot,
    {
      ...j(typeof n === "function" ? n : null),
      ...(typeof n === "string" && { heldCreateRefusal: n }),
      ...(!m && { forAnchorBeneath: j(null) }),
    },
    [],
    directoryCheck,
  );
}
//@ chunk-p5msxby3.js:20629-20772 placement
function openTreeAnchorAtName(e, o, { createsInHeldDirectoryCheckedByPath: s = !1 } = {}) {
  return openTreeAnchor(e, {
    gitRoot: o,
    realRoot: o,
    isRootNameExchangeable: !0,
    ...(s && { [ANCHOR_OPEN_FLAGS]: !0 }),
  });
}
//@ chunk-p5msxby3.js:20772-22054 placement
async function openTreeAnchor(e, o) {
  let { [ANCHOR_OPEN_FLAGS]: s, ...c } = o,
    w = void 0,
    n = !1,
    m = { ...c, directoryCheck: void 0 };
  switch (e.platform()) {
    case "windows": {
      let { loadNt: loadNt } = await import("./chunk-x1vgpjv3.js"),
        g = loadNt();
      if (g === null) return { unavailable: "no_ffi" };
      let { openWin32Backend: openWin32Backend } = await import("./chunk-tb11za84.js"),
        h = await openWin32Backend(e, g, m);
      return "unanchored" in h
        ? { unavailable: h.unanchored }
        : anchorOver(
            "win32_handle",
            e,
            h.root,
            h.held,
            m.realRoot,
            h.ops,
            [],
            (void 0)?.reachesWindows?.() === !0 ? void 0 : void 0,
          );
    }
    case "linux":
    case "wsl": {
      let open = await e.fs.open(m.realRoot, K);
      try {
        if (!(await isSameDirectory(e, open, m.realRoot)))
          return (await open.close(), { unavailable: "unstable_identity" });
        if (await isSameDirectory_2(e, open)) {
          let g = (void 0)?.createsInHeldDirectory === !0 || !1;
          return procFdBackend(e, open, m, g);
        }
        return (await open.close(), { unavailable: "no_procfs" });
      } catch (error) {
        throw (await open.close().catch(() => {}), error);
      }
    }
    case "macos": {
      let P = e.darwinAt ?? loadDarwinAt();
      if (P === null) return { unavailable: "no_ffi" };
      if (!(await darwinNoFollowAnyEnforced(e))) return { unavailable: "nofollow_any_unenforced" };
      let open = await e.fs.open(m.realRoot, K);
      try {
        if ((await resolvedRoot(e, m)) !== m.realRoot) throw rootNotCanonicalError();
        if (!(await isSameDirectory(e, open, m.realRoot)))
          return (await open.close(), { unavailable: "unstable_identity" });
        return fullPathBackend(
          e,
          P,
          open,
          m,
          (void 0)?.createsInHeldDirectory === !0 ? await getDarwinCreateFn(e, P) : null,
          !1,
          null,
        );
      } catch (error) {
        throw (await open.close().catch(() => {}), error);
      }
    }
    case "unknown":
      return { unavailable: "unsupported_platform" };
  }
}
//@ chunk-p5msxby3.js:22054-22114 placement
function getUnavailableReason(e) {
  return e.kind === "unavailable" ? e.reason : null;
}
//@ chunk-p5msxby3.js:22114-22274 placement
async function checkAnchoring(
  e,
  { host: o = createDeviceTreeHost(), now: s = () => performance.now() } = {},
) {
  let c = s();
  return {
    ...(await checkAnchoringAt(o, e).catch((n) => ({ kind: "threw" }))),
    elapsedMs: Math.round(s() - c),
  };
}
/**
 * 检查锚定是否可用
 */
//@ chunk-p5msxby3.js:22274-22485 placement
async function checkAnchoringAt(e, o) {
  let s = await openTreeAnchor(e, { gitRoot: o, realRoot: await e.fs.realpath(o) });
  if ("unavailable" in s) return { kind: "unavailable", reason: s.unavailable };
  return (await s.close().catch(() => {}), { kind: "available" });
}

export { openTreeAnchor };
