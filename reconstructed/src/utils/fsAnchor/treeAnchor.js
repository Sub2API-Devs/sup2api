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
    super("the new file could not be given its owner", {
      cause: e,
    });
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
//@ chunk-p5msxby3.js:1041-2016 placement
/**
 * 锚定错误码转错误
 */
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
  e.code = "WORKING_ROOT_NOT_CANONICAL";
  return e;
}
//@ chunk-p5msxby3.js:2131-2175 placement
function workingError(e) {
  let o = workingErrorFor(e);
  o.code = e;
  return o;
}
//@ chunk-p5msxby3.js:2175-2410 placement
/**
 * 锚定使用的打开标志与上限
 */
var ANCHOR_OPEN_FLAGS = Symbol("createsInHeldDirectoryCheckedByPath");
var O_NOFOLLOW_ANY = 536870912;
var O_SEARCH = 2097152;
var OPEN_DIR_FLAGS = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW | READ_LIMITS;
var CREATE_FILE_FLAGS = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS;
var DEFAULT_DIR_MODE = 511;
var MAX_RECORD_BYTES = 1e7;
var MAX_LIST_NAMES = 512;
var MAX_RENAME_ATTEMPTS = 3;
var REMOVE_TREE_CONCURRENCY = 16;
var RemoveTreeError = Error("removeTree stopped after a failure");
//@ chunk-p5msxby3.js:2410-2606 placement
/**
 * 拆分锚定相对路径
 */
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
function splitLeafPath(e, o) {
  let s = splitAnchoredPath(e, o);
  return {
    dirs: s.slice(0, -1),
    leaf: s.at(-1) ?? "",
  };
}
//@ chunk-p5msxby3.js:2682-2770 placement
function assertNeverCreates(e) {
  if ((e & constants.O_CREAT) !== 0) throw Error("anchored open never creates");
  return e;
}
//@ chunk-p5msxby3.js:2770-2865 placement
function mapParentNotDirectory(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode === "ENOTDIR" || errnoCode === "ELOOP"
    ? workingError("WORKING_PARENT_NOT_DIRECTORY")
    : error;
}
//@ chunk-p5msxby3.js:2865-2887 placement
var SAME_IDENTITY = {
  found: "same",
};
//@ chunk-p5msxby3.js:2887-2952 placement = getFileIdentity (0.794)
function getFileIdentity(e, o) {
  return e.ino !== 0n && e.dev === o.dev && e.ino === o.ino;
}
//@ chunk-p5msxby3.js:2952-3317 placement
/**
 * 逐段打开到持有目录
 */
async function walkToHeldDir(e, o, s, c, w) {
  let n = null;
  try {
    for (let [m, P] of c.entries()) {
      let g = n ?? e.getHeldDir(s);
      let d = await (m < c.length - 1 && e.openDirToPass !== undefined
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
//@ chunk-p5msxby3.js:3317-10817 placement
/**
 * 在锚定的目录树中执行操作（防 TOCTOU），支持 /proc fd、macOS NOFOLLOW_ANY 与完整路径后端。
 */
function anchorOver(e, o, s, c, realRoot, n, m = [], directoryCheck) {
  let { sep } = o.path;
  let d = undefined;
  let h = undefined;
  let O = undefined;
  let v = undefined;
  let G = false;
  let Z = false;
  let { renameNoReplace, renameInNoReplace } = n;
  let j = null;
  let N = () => (j ??= s.close());
  let weakMap = new WeakMap();
  let holdOutside = async (r, i, a = false) => {
    let f = i === "" ? [] : splitAnchoredPath(i, sep);
    let D = await n.hold(r);
    let p = D === null || f.length === 0 ? D : await walkToHeldDir(n, o, D, f, a);
    if (p === null) return null;
    let E = null;
    let T = () => (E ??= p.close());
    let A = {
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
    weakMap.set(A, p);
    return A;
  };
  let b = (r) => {
    let i = weakMap.get(r);
    if (i === undefined) throw Error("held directory belongs to another anchor");
    if (r.closed) throw Error("held directory is closed");
    return i;
  };
  let I = (r) => (r === c ? Promise.resolve() : n.closeDir(r));
  let Y = async (r, i, a, dirs) => {
    try {
      return await n.openDir(r, i);
    } catch (error) {
      if (a === null || !isENOENT(error)) throw mapParentNotDirectory(error);
      if (
        await n.mkdir(r, i, a).then(
          () => true,
          (error) => {
            if (getErrnoCode(error) !== "EEXIST") throw error;
            return false;
          },
        )
      )
        await ee(
          "mkdir",
          {
            to: {
              dir: r,
              dirs,
            },
          },
          () => n.rmdir(r, i),
        );
      return n.openDir(r, i).catch((error) => {
        throw mapParentNotDirectory(error);
      });
    }
  };
  let F = () => {
    if (j !== null) throw Error("tree anchor is closed");
  };
  let se = async (r, i) => {
    if (n.list === undefined) throw workingError("WORKING_LIST_UNSUPPORTED");
    let a = typeof i === "object" ? i.first : i;
    let f = await n.list(r, a);
    if (a !== undefined && !(f.length <= a)) {
      if (typeof i === "object" && a >= 0) return filterPlainNames(f.slice(0, a), sep);
      throw workingError("WORKING_LIST_TOO_LONG");
    }
    return filterPlainNames(f, sep);
  };
  let V = async (r, i) => {
    F();
    let a = c;
    try {
      for (let [f, D] of r.entries()) {
        F();
        let p = await Y(a, D, i, r.slice(0, f));
        await I(a);
        a = p;
      }
      return a;
    } catch (error) {
      await I(a);
      throw error;
    }
  };
  let B = async (r, i) => {
    let { dirs, leaf } = splitLeafPath(r, sep);
    let D = await V(dirs, null);
    try {
      F();
      return await i(D, leaf, dirs);
    } finally {
      await I(D);
    }
  };
  let De = async (r, i, a) => {
    let f = splitLeafPath(i, sep);
    return splitLeafPath(r, sep).dirs.join("/") === f.dirs.join("/")
      ? B(r, (dir, leaf, dirs) =>
          a(
            {
              dir,
              leaf,
              dirs,
            },
            {
              dir,
              leaf: f.leaf,
              dirs,
            },
          ),
        )
      : B(r, (dir, leaf, dirs) =>
          B(i, (dir_2, leaf_2, dirs_2) =>
            a(
              {
                dir,
                leaf,
                dirs,
              },
              {
                dir: dir_2,
                leaf: leaf_2,
                dirs: dirs_2,
              },
            ),
          ),
        );
  };
  let be = (error) =>
    isENOENT(error)
      ? {
          found: "missing",
        }
      : getErrnoCode(error) === "WORKING_PARENT_NOT_DIRECTORY"
        ? {
            found: "replaced",
          }
        : {
            found: "check_failed",
            checkError: error,
          };
  let Ne = async (r, i) => {
    let a = await V(r, null).then(
      (now) => ({
        now,
      }),
      be,
    );
    if (!("now" in a)) return a;
    try {
      return await i(a.now);
    } catch (error) {
      return be(error);
    } finally {
      await I(a.now).catch(() => {});
    }
  };
  let pe = (r) => n.holdOpenedDir(r, "").stat();
  let Re = (r, i) =>
    r.dev !== i.dev
      ? {
          found: "replaced",
          differs: "device",
        }
      : r.ino !== i.ino
        ? {
            found: "replaced",
            differs: "inode",
          }
        : SAME_IDENTITY;
  let Be = async ({ dir, dirs }) =>
    dirs.length === 0 ? SAME_IDENTITY : Ne(dirs, async (a) => Re(await pe(dir), await pe(a)));
  let He = async ({ dir, dirs }) => SAME_IDENTITY;
  let fe = null;
  let Pe = async ({ to, from }) => null;
  let me = (operation, i, a) => {
    try {
      undefined?.({
        operation,
        ...i,
        outcome: a ? "undone" : "not_undone",
      });
    } catch (error) {
      logError(error);
    }
    return workingError(a ? "WORKING_DIRECTORY_MOVED_UNDONE" : "WORKING_DIRECTORY_MOVED");
  };
  let Un = async (r) => {
    return;
  };
  let ee = async (operation, i, a) => {
    let f = await Pe(i);
    if (f === null) return;
    throw me(
      operation,
      f,
      a !== undefined &&
        (await a(f.side).then(
          () => true,
          () => false,
        )),
    );
  };
  let Ae = async ({ dir, leaf }, a) => {
    if (!getFileIdentity(await n.lstat(dir, leaf), await a())) throw Error("another file has the name");
    await n.unlink(dir, leaf);
  };
  let Ce = (r, i, a, f, D) =>
    B(r, async (p, E, T) => {
      let A = null;
      let X = false;
      let ke = async (ne) => {
        let le = async (te) => ne !== null && getFileIdentity(ne, await n.lstat(te, E));
        if (fe !== null && !(await fe())) {
          A = {
            found: "replaced",
            side: "destination",
            rel: T.join("/"),
          };
          X = await le(p).catch(() => false);
          throw Error("the root is not in its place");
        }
        let re = SAME_IDENTITY;
        let de =
          re.found === "same" ||
          (
            await Ne(T, async (te) => ({
              found: (await le(te)) ? "same" : "replaced",
            }))
          ).found === "same"
            ? await He({
                dir: p,
                dirs: T,
              })
            : re;
        if (de.found === "same") return;
        A = {
          ...de,
          side: "destination",
          rel: T.join("/"),
        };
        X = await le(p).catch(() => false);
        throw Error("the file is not at its name");
      };
      await n.create(p, E, [...m, ...T], i, a, f, D, undefined).catch(async (error) => {
        throw A === null ? error : me("create", A, X && (await n.lstat(p, E).then(() => false, isENOENT)));
      });
    });
  let Te = (r) => async (i, a) => {
    await n.link(i.dir, i.leaf, a.dir, a.leaf);
    await ee(
      "link",
      {
        to: a,
        from: i,
      },
      async (f) => {
        let D = Ae(a, () => n.lstat(i.dir, i.leaf));
        await D.catch(() => {});
        if (r && f !== "destination") await n.unlink(i.dir, i.leaf);
        await D;
      },
    );
  };
  let Fe = (r, i, a) =>
    B(a, async (f, D, dirs) => {
      await n.linkIn(b(r), assertPlainLeaf(i), f, D);
      await ee(
        "link",
        {
          to: {
            dir: f,
            dirs,
          },
        },
        () =>
          Ae(
            {
              dir: f,
              leaf: D,
              dirs,
            },
            () => n.statIn(b(r), assertPlainLeaf(i)),
          ),
      );
    });
  let rn = async (r, i) => {
    await n.rename(r.dir, r.leaf, i.dir, i.leaf);
    await ee("rename", {
      to: i,
      from: r,
    });
  };
  let Se = async (r, i, a) => a();
  return {
    backend: e,
    realRoot,
    createsInHeldDirectory: n.createsInHeldDirectory !== false,
    heldCreateRefusal: n.heldCreateRefusal ?? null,
    ...false,
    checksCreatedFiles: false,
    mkdirp: async (r, i = DEFAULT_DIR_MODE) => I(await V(splitAnchoredPath(r, sep), i)),
    create: (r, i, a) => Ce(r, i, a, false),
    createSynced: (r, i, a, f) => Ce(r, i, a, true, f),
    createAndOpen: (r, i) => B(r, (a, f, D) => n.createAndOpen(a, f, [...m, ...D], i)),
    link: (r, i) => De(r, i, Te(false)),
    rename: (r, i) => De(r, i, rn),
    placeCreated: (r, i) =>
      De(
        r,
        i,
        renameNoReplace === undefined
          ? Te(true)
          : (a, f) =>
              Se(
                {
                  to: f,
                  from: a,
                },
                f,
                (D) => renameNoReplace(a.dir, a.leaf, f.dir, f.leaf, D),
              ),
      ),
    symlink: (r, i) => B(i, (a, f) => n.symlink(r, a, f)),
    readlink: (r) => B(r, n.readlink),
    unlink: (r) => B(r, n.unlink),
    rmdir: (r) => B(r, n.rmdir),
    list: async (r, i) => {
      let a = r === "" ? [] : splitAnchoredPath(r, sep);
      let f = await V(a, null);
      try {
        F();
        return await se(f, i);
      } finally {
        await I(f);
      }
    },
    removeTree: (r, { keep: i, onDeleted: a } = {}) =>
      B(r, async (f, D, p) => {
        if (i !== undefined) assertPlainLeaf(i);
        let E = i === undefined ? null : Buffer.from(i);
        let T = (_) => E !== null && (typeof _ === "string" ? _ === i : _.equals(E));
        let { bytes } = n;
        let X = (_, C) => (typeof C === "string" ? n.unlink(_, C) : bytes.unlink(_, C));
        let ke = (_, C) => (typeof C === "string" ? n.rmdir(_, C) : bytes.rmdir(_, C));
        let ne = (_, C) => (typeof C === "string" ? n.openDir(_, C) : bytes.openDir(_, C));
        let le = async (_) =>
          bytes === undefined ? se(_) : filterPlainBufferNames(await bytes.list(_), sep);
        let re = async (_, C) => {
          try {
            await X(_, C);
          } catch (error) {
            let errnoCode = getErrnoCode(error);
            if (errnoCode === "ENOENT") return "gone";
            if (errnoCode === "EISDIR" || errnoCode === "EPERM") return "directory";
            throw error;
          }
          a?.();
          return "gone";
        };
        let de = MAX_RECORD_BYTES;
        let te = async (_, C, W, ie, Le = false) => {
          for (let idx = 0; ; idx++) {
            F();
            let filtered = (await le(W)).filter((R) => !(Le && T(R)));
            de -= filtered.length;
            if (de < 0)
              throw Object.assign(Error("directory too large to remove: too many entries"), {
                code: "E2BIG",
              });
            if (ie.length >= MAX_LIST_NAMES)
              throw Object.assign(Error("directory too deep to remove"), {
                code: "ENAMETOOLONG",
              });
            let xe = false;
            let tn = limitConcurrency(REMOVE_TREE_CONCURRENCY, async (R) => {
              if (xe) throw RemoveTreeError;
              F();
              try {
                return await re(W, R);
              } catch (error) {
                xe = true;
                throw error;
              }
            });
            let settled = await Promise.allSettled(filtered.map((R) => tn(R)));
            let filtered_2 = settled.filter((R) => R.status === "rejected");
            if (filtered_2.length > 0)
              throw (filtered_2.find((R) => R.reason !== RemoveTreeError) ?? filtered_2[0]).reason;
            let filtered_3 = filtered.filter((R, M) => {
              let Ue = settled[M];
              return Ue?.status === "fulfilled" && Ue.value === "directory";
            });
            for (let R of filtered_3) {
              let M = await ne(W, R).catch(() => null);
              if (M === null) {
                if ((await re(W, R)) === "directory") {
                  await ke(W, R);
                  a?.();
                }
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
              await ke(_, C);
              a?.();
              return;
            } catch (error) {
              let errnoCode = getErrnoCode(error);
              if (errnoCode === "ENOENT") return;
              if (errnoCode !== "ENOTEMPTY" || idx >= MAX_RENAME_ATTEMPTS) throw error;
            }
          }
        };
        let Oe = await n.openDir(f, D).catch(async (error) => {
          if (isENOENT(error)) return null;
          if (E !== null) throw mapParentNotDirectory(error);
          if ((await re(f, D)) === "gone") return null;
          throw mapParentNotDirectory(error);
        });
        if (Oe === null) return;
        try {
          await te(f, D, Oe, [...p, D], true);
        } finally {
          await n.closeDir(Oe);
        }
      }),
    lstat: async (r) => {
      if (r !== "") return B(r, n.lstat);
      F();
      return s.stat();
    },
    open: async (r, i) => {
      let a = assertNeverCreates(i);
      if (n.openBeneath !== undefined) {
        let { dirs, leaf } = splitLeafPath(r, sep);
        F();
        return n.openBeneath([...m, ...dirs], leaf, a);
      }
      return B(r, (f, D, p) => n.open(f, D, [...m, ...p], a));
    },
    anchorBeneath: async (r) => {
      let i = splitAnchoredPath(r, sep);
      let a = n.holdOpenedDir(await V(i, null), o.path.join(realRoot, ...i));
      return anchorOver(
        e,
        o,
        a,
        n.getHeldDir(a),
        a.realPath,
        n.forAnchorBeneath ?? n,
        [...m, ...i],
        directoryCheck,
      );
    },
    holdOutside,
    moveOut: (r, i, a) =>
      B(r, async (f, D, dirs) => {
        await n.renameOut(f, D, b(i), assertPlainLeaf(a));
        await ee("rename", {
          from: {
            dir: f,
            dirs,
          },
        });
      }),
    moveIn: (r, i, a) =>
      B(a, async (f, D, dirs) => {
        await n.renameIn(b(r), assertPlainLeaf(i), f, D);
        await ee("rename", {
          to: {
            dir: f,
            dirs,
          },
        });
      }),
    linkIn: Fe,
    placeCreatedIn: (r, i, a) =>
      renameInNoReplace === undefined
        ? Fe(r, i, a)
        : B(a, (f, D, dirs) =>
            Se(
              {
                to: {
                  dir: f,
                  dirs,
                },
              },
              {
                dir: f,
                leaf: D,
                dirs,
              },
              (E) => renameInNoReplace(b(r), assertPlainLeaf(i), f, D, E),
            ),
          ),
    statIn: async (r, i) => n.statIn(b(r), assertPlainLeaf(i)),
    openIn: async (r, i, a) => n.openIn(b(r), assertPlainLeaf(i), assertNeverCreates(a)),
    unlinkIn: async (r, i) => n.unlinkIn(b(r), assertPlainLeaf(i)),
    close: N,
    [Symbol.asyncDispose]: N,
  };
}
//@ chunk-p5msxby3.js:10817-10864 placement
function filterPlainNames(e, o) {
  return e.filter((s) => isPlainEntryName(s, o));
}
//@ chunk-p5msxby3.js:10864-10930 placement
function filterPlainBufferNames(e, o) {
  return e.filter((s) => isPlainEntryName(s.toString("latin1"), o));
}
//@ chunk-p5msxby3.js:10930-11035 placement
function isPlainEntryName(e, o) {
  return e !== "" && e !== "." && e !== ".." && !e.includes("/") && !e.includes(o) && !e.includes("\x00");
}
//@ chunk-p5msxby3.js:11035-11202 placement
/**
 * 确认叶子名为普通名字
 */
function assertPlainLeaf(e) {
  if (e === "" || e === "." || e === ".." || e.includes("/") || e.includes("\\") || e.includes("\x00"))
    throw Error("a held-directory leaf must be one plain name");
  return e;
}
//@ chunk-p5msxby3.js:11202-11684 placement
/**
 * 打开根目录锚
 */
async function openRootAnchor(e, o) {
  let { fs } = e;
  let c = await fs.realpath(o).catch(() => null);
  if (c === null) return null;
  let w = await fs.open(c, OPEN_DIR_FLAGS).catch(() => null);
  if (w === null) return null;
  try {
    let [n, m] = await Promise.all([
      w.stat({
        bigint: true,
      }),
      fs.lstat(c, {
        bigint: true,
      }),
    ]);
    if (!n.isDirectory() || !m.isDirectory() || n.ino === 0n || n.dev !== m.dev || n.ino !== m.ino) {
      await w.close().catch(() => {});
      return null;
    }
  } catch {
    await w.close().catch(() => {});
    return null;
  }
  return {
    realPath: c,
    dir: w,
    stat: () =>
      w.stat({
        bigint: true,
      }),
    close: () => w.close(),
  };
}
//@ chunk-p5msxby3.js:11684-11756 placement
function statsView(e) {
  return {
    stat: () =>
      e.stat({
        bigint: true,
      }),
    close: () => e.close(),
  };
}
//@ chunk-p5msxby3.js:11756-12181 placement
/**
 * 写入新建文件并设所有者与权限
 */
async function writeCreatedFile(e, o, s, c, w, n, m) {
  let P = (uid, d) =>
    e.chown(uid, d).catch((error) => {
      throw new OwnerNotGiven(error);
    });
  try {
    await e.writeFile(o);
    if (n !== undefined && n.to.gid !== n.from.gid) await P(n.from.uid, n.to.gid);
    await e.chmod(s);
    if (n !== undefined && n.to.uid !== n.from.uid) await P(n.to.uid, n.to.gid);
    if (c) await e.sync();
    await m();
  } catch (error) {
    await w().catch(() => {});
    await e.close().catch(() => {});
    throw error;
  }
  try {
    await e.close();
  } catch (error) {
    await w().catch(() => {});
    throw error;
  }
}
//@ chunk-p5msxby3.js:12181-12214 placement
var modeOrDefault = (e, o) => (o === undefined ? e : e & 448);
//@ chunk-p5msxby3.js:12214-12698 placement
async function writeCreatedUnlessMoved(e, o, s, c, w, n = false, m, P = () => Promise.resolve()) {
  let { made, lookError } = await e
    .stat({
      bigint: true,
    })
    .then(
      (made) => ({
        made,
        lookError: undefined,
      }),
      (lookError) => ({
        made: null,
        lookError,
      }),
    );
  let h = async () => {
    let v = await c();
    if (made !== null && made.ino !== 0n && v !== null && v.dev === made.dev && v.ino === made.ino) await w();
  };
  if (m !== undefined && made === null) {
    await e.close().catch(() => {});
    throw new OwnerNotGiven(lookError);
  }
  let O = made && {
    uid: Number(made.uid),
    gid: Number(made.gid),
  };
  return writeCreatedFile(
    e,
    o,
    s,
    n,
    h,
    m === undefined || O === null
      ? undefined
      : {
          from: O,
          to: {
            ...O,
            ...m,
          },
        },
    () => P(made),
  );
}
//@ chunk-p5msxby3.js:12698-12847 placement
async function isSameDirectory(e, o, realRoot) {
  let [c, w] = await Promise.all([
    e.fs.lstat(realRoot, {
      bigint: true,
    }),
    o.stat({
      bigint: true,
    }),
  ]);
  return c.dev === w.dev && c.ino === w.ino && w.ino !== 0n;
}
//@ chunk-p5msxby3.js:12847-13103 placement
/**
 * fd 与路径是否同一目录
 */
async function isSameDirectory_2(e, o) {
  try {
    let [s, c] = await Promise.all([
      e.fs.lstat(`/proc/self/fd/${o.fd}/.`, {
        bigint: true,
      }),
      o.stat({
        bigint: true,
      }),
    ]);
    return s.dev === c.dev && s.ino === c.ino && c.ino !== 0n;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "EACCES" || errnoCode === "EPERM") return false;
    throw error;
  }
}
//@ chunk-p5msxby3.js:13103-14679 placement
/**
 * 基于 /proc/self/fd 的后端
 */
function procFdBackend(e, o, { realRoot, directoryCheck }, w) {
  let { fs } = e;
  let m = (d, h) => `/proc/self/fd/${d.fd}/${h}`;
  let P = (d, h) => Buffer.concat([Buffer.from(`/proc/self/fd/${d.fd}/`), h]);
  let g = {
    openDir: (d, h) => fs.open(m(d, h), OPEN_DIR_FLAGS),
    mkdir: async (d, h, mode) => {
      await fs.mkdir(m(d, h), {
        mode,
      });
    },
    closeDir: (d) => d.close(),
    ...{},
    create: async (d, h, O, v, G, Z, x, L) => {
      await writeCreatedUnlessMoved(
        await fs.open(m(d, h), CREATE_FILE_FLAGS | constants.O_NOFOLLOW, modeOrDefault(G, x)),
        v,
        G,
        () =>
          fs
            .lstat(m(d, h), {
              bigint: true,
            })
            .catch(() => null),
        () => fs.unlink(m(d, h)),
        Z,
        x,
        L,
      );
      if (Z) await d.sync().catch(() => {});
    },
    createAndOpen: (d, h, O, v) => fs.open(m(d, h), CREATE_FILE_FLAGS | constants.O_NOFOLLOW, v),
    link: (d, h, O, v) => fs.link(m(d, h), m(O, v)),
    rename: (d, h, O, v) => fs.rename(m(d, h), m(O, v)),
    symlink: (d, h, O) => fs.symlink(d, m(h, O)),
    readlink: (d, h) => fs.readlink(m(d, h)),
    unlink: (d, h) => fs.unlink(m(d, h)),
    rmdir: (d, h) => fs.rmdir(m(d, h)),
    list: async (d, h) => {
      if (h === undefined) return fs.readdir(`/proc/self/fd/${d.fd}`);
      throw workingError("WORKING_LIST_UNSUPPORTED");
    },
    bytes: {
      list: (d) =>
        fs.readdir(`/proc/self/fd/${d.fd}`, {
          encoding: "buffer",
        }),
      openDir: (d, h) => fs.open(P(d, h), OPEN_DIR_FLAGS),
      unlink: (d, h) => fs.unlink(P(d, h)),
      rmdir: (d, h) => fs.rmdir(P(d, h)),
    },
    lstat: (d, h) =>
      fs.lstat(m(d, h), {
        bigint: true,
      }),
    open: (d, h, O, v) => fs.open(m(d, h), v | constants.O_NOFOLLOW | READ_LIMITS),
    hold: (d) => openRootAnchor(e, d),
    getHeldDir: (d) => d.dir,
    holdOpenedDir: (d, realPath) => ({
      realPath,
      dir: d,
      stat: () =>
        d.stat({
          bigint: true,
        }),
      close: () => d.close(),
    }),
    renameOut: (d, h, O, v) => fs.rename(m(d, h), m(O.dir, v)),
    renameIn: (d, h, O, v) => fs.rename(m(d.dir, h), m(O, v)),
    linkIn: (d, h, O, v) => fs.link(m(d.dir, h), m(O, v)),
    statIn: (d, h) =>
      fs.lstat(m(d.dir, h), {
        bigint: true,
      }),
    openIn: (d, h, O) => fs.open(m(d.dir, h), O | constants.O_NOFOLLOW | READ_LIMITS),
    unlinkIn: (d, h) => fs.unlink(m(d.dir, h)),
  };
  return anchorOver("linux_procfd", e, statsView(o), o, realRoot, g, [], directoryCheck);
}
//@ chunk-p5msxby3.js:14679-14774 placement
function posixFsAtApi() {
  let posixFsAt = globalThis.Bun?.ant?.posixFsAt;
  return typeof posixFsAt?.openat === "function" ? posixFsAt : null;
}
//@ chunk-p5msxby3.js:14774-14882 placement
function readDirNames(e, o, s) {
  return s >= 0
    ? e.readdirat(o, {
        maxNames: Math.min(Math.floor(s), Number.MAX_SAFE_INTEGER),
      })
    : [];
}
//@ chunk-p5msxby3.js:14882-14949 placement
var fstatAsync = promisify(fstat);
var closeAsync = promisify(close);
var openAsync = promisify(open);
var fsyncAsync = promisify(fsync);
var fchmodAsync = promisify(fchmod);
var fchownAsync = promisify(fchown);
var writeFileAsync = promisify(writeFile);
//@ chunk-p5msxby3.js:14949-15086 placement
function anchoredFileOps(e) {
  return {
    stat: (o) => fstatAsync(e, o),
    writeFile: (o) => writeFileAsync(e, o),
    chown: (o, s) => fchownAsync(e, o, s),
    chmod: (o) => fchmodAsync(e, o),
    sync: () => fsyncAsync(e),
    close: () => closeAsync(e),
  };
}
//@ chunk-p5msxby3.js:15086-15207 placement
var posixFsAt;
var warnNoPosixFsAtOnce = onceExport(() =>
  logForDebugging("anchor: this runtime has no Bun.ant.posixFsAt, so the macOS backend cannot come up", {
    level: "warn",
  }),
);
//@ chunk-p5msxby3.js:15207-16159 placement
function loadDarwinAt() {
  let e = posixFsAtApi();
  if (e === null) {
    warnNoPosixFsAtOnce();
    return null;
  }
  if (posixFsAt !== undefined) return posixFsAt;
  let getBeneath = onceExport(() => {
    return;
  });
  let s = (syscall, w) => {
    try {
      return w();
    } catch (error) {
      let m = Error("a file call failed (see the code and syscall properties)");
      m.errno = isSyscallError(error) && error.errno !== undefined ? Math.abs(error.errno) : 0;
      m.code = m.errno === 0 ? (getErrnoCode(error) ?? "EUNKNOWN") : getSystemErrorName(-m.errno);
      m.syscall = syscall;
      throw m;
    }
  };
  posixFsAt = {
    openat: (c, w, n) => s("openat", () => e.openat(c, w, n)),
    getBeneath,
    mkdirat: (c, w, n) => s("mkdirat", () => e.mkdirat(c, w, n)),
    renameat: (c, w, n, m) => s("renameat", () => e.renameat(c, w, n, m)),
    linkat: (c, w, n, m) => s("linkat", () => e.linkat(c, w, n, m)),
    symlinkat: (c, w, n) => s("symlinkat", () => e.symlinkat(c, w, n)),
    readlinkat: (c, w) => s("readlinkat", () => e.readlinkat(c, w)),
    unlinkat: (c, w) => s("unlinkat", () => e.unlinkat(c, w)),
    rmdirat: (c, w) =>
      s("unlinkat", () =>
        e.unlinkat(c, w, {
          removeDir: true,
        }),
      ),
    listDirectory: (c, w) => s("readdir", () => (w === undefined ? e.readdirat(c) : readDirNames(e, c, w))),
    listDirectoryBytes: (c) =>
      s("readdir", () =>
        e.readdirat(c, {
          encoding: "buffer",
        }),
      ),
    ...{},
  };
  return posixFsAt;
}
//@ chunk-p5msxby3.js:16159-16212 placement
function darwinNoFollowAnyEnforced(e) {
  return (e.noFollowAnyEnforced ??= probeNoFollowAny(e));
}
//@ chunk-p5msxby3.js:16212-16781 placement
/**
 * 探测 O_NOFOLLOW_ANY 是否生效
 */
async function probeNoFollowAny(e) {
  let { fs, path } = e;
  let c = null;
  try {
    c = await fs.realpath(await mkdtemp(path.join(tmpdir(), "claude-nfa-")));
    await fs.mkdir(path.join(c, "d"));
    await symlink(path.join(c, "d"), path.join(c, "l"));
    let w = CREATE_FILE_FLAGS | O_NOFOLLOW_ANY;
    try {
      await (await fs.open(path.join(c, "d", "control"), w, 384)).close();
    } catch (error) {
      if (getErrnoCode(error) === "EINVAL") return false;
      throw error;
    }
    try {
      await (await fs.open(path.join(c, "l", "probe"), w, 384)).close();
      return false;
    } catch (error) {
      if (getErrnoCode(error) === "ELOOP") return true;
      throw error;
    }
  } catch (error) {
    logForDebugging(`anchor: O_NOFOLLOW_ANY probe not run (${getErrnoCode(error) ?? "not an errno"})`);
    return true;
  } finally {
    if (c !== null)
      await rm(c, {
        recursive: true,
        force: true,
      }).catch(() => {});
  }
}
//@ chunk-p5msxby3.js:16781-16915 placement
async function getDarwinCreateFn(e, o) {
  let beneath = o.getBeneath?.();
  if (beneath === undefined) return "not_bound";
  return (await probeDarwinHeldCreate(e, beneath)) ?? ((c, w, n) => beneath.create(c, [w], n & 511));
}
//@ chunk-p5msxby3.js:16915-17065 placement
function probeDarwinHeldCreate(e, o) {
  return (e.heldCreateProbed ??= probeDarwinHeldCreateUnchecked(o).then((s) => {
    if (s === "probe_not_run" || s === "probe_create_failed") e.heldCreateProbed = undefined;
    return s;
  }));
}
//@ chunk-p5msxby3.js:17065-18042 placement
/**
 * 探测 macOS 持有目录下的创建
 */
async function probeDarwinHeldCreateUnchecked(e) {
  let o = (n, m) =>
    logForDebugging(
      `anchor: the probe of the create in a held directory ${n}, so this ${m} creates by full path`,
    );
  let s = null;
  let c = [];
  let w = (n) => {
    c.push(n);
    return fstatAsync(n, {
      bigint: true,
    });
  };
  try {
    s = await mkdtemp(`${tmpdir()}/claude-held-`);
    let n = await openAsync(s, OPEN_DIR_FLAGS);
    c.push(n);
    let m = await w(await openAsync(`${s}/by-path`, CREATE_FILE_FLAGS, 384));
    let P;
    try {
      P = await w(e.create(n, ["held"], 384));
    } catch (error) {
      o(`failed (${getErrnoCode(error) ?? "not an errno"})`, "anchor");
      return "probe_create_failed";
    }
    if (P.mode !== m.mode) {
      o(`made a file of mode ${P.mode.toString(8)} where node made one of ${m.mode.toString(8)}`, "host");
      return "probe_wrong_mode";
    }
    let g = await lstat(`${s}/held`, {
      bigint: true,
    }).catch((error) => {
      if (isENOENT(error)) return null;
      throw error;
    });
    if (g === null || !getFileIdentity(P, g)) {
      o("made a file that is not seen at its name", "host");
      return "probe_wrong_place";
    }
    return null;
  } catch (error) {
    o(`could not be staged (${getErrnoCode(error) ?? "not an errno"})`, "anchor");
    return "probe_not_run";
  } finally {
    await Promise.all(c.map((n) => closeAsync(n).catch(() => {})));
    if (s !== null)
      await rm(s, {
        recursive: true,
        force: true,
      }).catch(() => {});
  }
}
//@ chunk-p5msxby3.js:18042-18076 placement
var O_RDONLY_SEARCH_NONBLOCK = constants.O_RDONLY | O_SEARCH | constants.O_NONBLOCK;
//@ chunk-p5msxby3.js:18076-20629 placement
/**
 * 按完整路径的后端
 */
function fullPathBackend(e, o, s, { realRoot, directoryCheck }, n, m, P) {
  let { fs, path } = e;
  let h = (N, u, y, b) =>
    fs.open(path.join(realRoot, ...N, u), (y & ~constants.O_NOFOLLOW) | O_NOFOLLOW_ANY | READ_LIMITS, b);
  let O = async (N, u) => {
    let y = o.fstatat?.(N, u);
    return y !== undefined && y.dev >= 0n && y.ino < 2n ** 63n ? y : v(N, u, O_RDONLY_SEARCH_NONBLOCK);
  };
  let v = async (N, u, y) => {
    let b = o.openat(N, u, y | READ_LIMITS);
    try {
      return await fstatAsync(b, {
        bigint: true,
      });
    } finally {
      await closeAsync(b);
    }
  };
  let G = async (N, u, y) => {
    try {
      let [b, I] = await Promise.all([
        N.stat({
          bigint: true,
        }),
        u(),
      ]);
      if (b.dev !== I.dev || b.ino !== I.ino) {
        y?.();
        throw Object.assign(Error("not the file the held directory names"), {
          code: "ELOOP",
        });
      }
      return N;
    } catch (error) {
      await N.close().catch(() => {});
      throw error;
    }
  };
  let Z = async (N, u, y, b, I) => {
    try {
      return N === null ? await h(b, y, CREATE_FILE_FLAGS, I) : anchoredFileOps(N(u, y, I));
    } catch (error) {
      throw mapParentNotDirectory(error);
    }
  };
  let { listDirectory, listDirectoryBytes } = o;
  let j = (N) => ({
    ...(listDirectoryBytes !== undefined && {
      bytes: {
        list: async (u) => listDirectoryBytes(u),
        openDir: async (u, y) => o.openat(u, y, OPEN_DIR_FLAGS),
        unlink: async (u, y) => o.unlinkat(u, y),
        rmdir: async (u, y) => o.rmdirat(u, y),
      },
    }),
    openDir: async (u, y) => o.openat(u, y, OPEN_DIR_FLAGS),
    mkdir: async (u, y, b) => o.mkdirat(u, y, b),
    closeDir: (u) => closeAsync(u),
    createsInHeldDirectory: N !== null,
    ...(N !== null && {
      statDirectoryByPath: async (u) => {
        let y = await h(u, "", OPEN_DIR_FLAGS | constants.O_NONBLOCK).catch((error) => {
          throw mapParentNotDirectory(error);
        });
        try {
          return await y.stat({
            bigint: true,
          });
        } finally {
          await y.close();
        }
      },
    }),
    create: async (u, y, b, I, Y, F, se, V) => {
      await writeCreatedUnlessMoved(
        await Z(N, u, y, b, modeOrDefault(Y, se)),
        I,
        Y,
        () => v(u, y, O_RDONLY_SEARCH_NONBLOCK).catch(() => null),
        () => o.unlinkat(u, y),
        F,
        se,
        V,
      );
      if (F) await fsyncAsync(u).catch(() => {});
    },
    createAndOpen: (u, y, b, I) =>
      h(b, y, CREATE_FILE_FLAGS, I).catch((error) => {
        throw mapParentNotDirectory(error);
      }),
    link: async (u, y, b, I) => o.linkat(u, y, b, I),
    rename: async (u, y, b, I) => o.renameat(u, y, b, I),
    symlink: async (u, y, b) => {
      if (o.symlinkat === undefined) throw workingError("WORKING_LINK_UNSUPPORTED");
      o.symlinkat(u, y, b);
    },
    readlink: async (u, y) => {
      if (o.readlinkat === undefined) throw workingError("WORKING_LINK_UNSUPPORTED");
      return o.readlinkat(u, y);
    },
    unlink: async (u, y) => o.unlinkat(u, y),
    rmdir: async (u, y) => o.rmdirat(u, y),
    ...(listDirectory !== undefined && {
      list: async (u, y) => listDirectory(u, y),
    }),
    lstat: O,
    open: async (u, y, b, I) =>
      G(
        await h(b, y, I),
        () => O(u, y),
        () => P?.([...b, y].join("/")),
      ),
    ...(P === null && {
      openBeneath: (u, y, b) => h(u, y, b),
    }),
    hold: (u) => openRootAnchor(e, u),
    getHeldDir: (u) => u.dir.fd,
    holdOpenedDir: (u, realPath) => ({
      realPath,
      dir: {
        fd: u,
      },
      stat: () =>
        fstatAsync(u, {
          bigint: true,
        }),
      close: () => closeAsync(u),
    }),
    renameOut: async (u, y, b, I) => o.renameat(u, y, b.dir.fd, I),
    renameIn: async (u, y, b, I) => o.renameat(u.dir.fd, y, b, I),
    linkIn: async (u, y, b, I) => o.linkat(u.dir.fd, y, b, I),
    statIn: (u, y) => O(u.dir.fd, y),
    openIn: async (u, y, b) =>
      G(
        await fs.open(path.join(u.realPath, y), (b & ~constants.O_NOFOLLOW) | O_NOFOLLOW_ANY | READ_LIMITS),
        () => v(u.dir.fd, y, O_RDONLY_SEARCH_NONBLOCK),
      ),
    unlinkIn: async (u, y) => o.unlinkat(u.dir.fd, y),
  });
  return anchorOver(
    "darwin_at",
    e,
    statsView(s),
    s.fd,
    realRoot,
    {
      ...j(typeof n === "function" ? n : null),
      ...(typeof n === "string" && {
        heldCreateRefusal: n,
      }),
      ...(!m && {
        forAnchorBeneath: j(null),
      }),
    },
    [],
    directoryCheck,
  );
}
//@ chunk-p5msxby3.js:20629-20772 placement
function openTreeAnchorAtName(e, o, { createsInHeldDirectoryCheckedByPath: s = false } = {}) {
  return openTreeAnchor(e, {
    gitRoot: o,
    realRoot: o,
    isRootNameExchangeable: true,
    ...(s && {
      [ANCHOR_OPEN_FLAGS]: true,
    }),
  });
}
//@ chunk-p5msxby3.js:20772-22054 placement
async function openTreeAnchor(e, o) {
  let { [ANCHOR_OPEN_FLAGS]: s, ...c } = o;
  let w = undefined;
  let n = false;
  let m = {
    ...c,
    directoryCheck: undefined,
  };
  switch (e.platform()) {
    case "windows": {
      let { loadNt } = await import("./chunk-x1vgpjv3.js");
      let g = loadNt();
      if (g === null)
        return {
          unavailable: "no_ffi",
        };
      let { openWin32Backend } = await import("./chunk-tb11za84.js");
      let h = await openWin32Backend(e, g, m);
      return "unanchored" in h
        ? {
            unavailable: h.unanchored,
          }
        : anchorOver(
            "win32_handle",
            e,
            h.root,
            h.held,
            m.realRoot,
            h.ops,
            [],
            undefined?.reachesWindows?.() === true ? undefined : undefined,
          );
    }
    case "linux":
    case "wsl": {
      let P = await e.fs.open(m.realRoot, OPEN_DIR_FLAGS);
      try {
        if (!(await isSameDirectory(e, P, m.realRoot))) {
          await P.close();
          return {
            unavailable: "unstable_identity",
          };
        }
        if (await isSameDirectory_2(e, P)) {
          let g = undefined?.createsInHeldDirectory === true || false;
          return procFdBackend(e, P, m, g);
        }
        await P.close();
        return {
          unavailable: "no_procfs",
        };
      } catch (error) {
        await P.close().catch(() => {});
        throw error;
      }
    }
    case "macos": {
      let P = e.darwinAt ?? loadDarwinAt();
      if (P === null)
        return {
          unavailable: "no_ffi",
        };
      if (!(await darwinNoFollowAnyEnforced(e)))
        return {
          unavailable: "nofollow_any_unenforced",
        };
      let g = await e.fs.open(m.realRoot, OPEN_DIR_FLAGS);
      try {
        if ((await resolvedRoot(e, m)) !== m.realRoot) throw rootNotCanonicalError();
        if (!(await isSameDirectory(e, g, m.realRoot))) {
          await g.close();
          return {
            unavailable: "unstable_identity",
          };
        }
        return fullPathBackend(
          e,
          P,
          g,
          m,
          undefined?.createsInHeldDirectory === true ? await getDarwinCreateFn(e, P) : null,
          false,
          null,
        );
      } catch (error) {
        await g.close().catch(() => {});
        throw error;
      }
    }
    case "unknown":
      return {
        unavailable: "unsupported_platform",
      };
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
    ...(await checkAnchoringAt(o, e).catch((error) => ({
      kind: "threw",
    }))),
    elapsedMs: Math.round(s() - c),
  };
}
//@ chunk-p5msxby3.js:22274-22485 placement
/**
 * 检查锚定是否可用
 */
async function checkAnchoringAt(e, o) {
  let treeAnchor = await openTreeAnchor(e, {
    gitRoot: o,
    realRoot: await e.fs.realpath(o),
  });
  if ("unavailable" in treeAnchor)
    return {
      kind: "unavailable",
      reason: treeAnchor.unavailable,
    };
  await treeAnchor.close().catch(() => {});
  return {
    kind: "available",
  };
}
export { openTreeAnchor };
