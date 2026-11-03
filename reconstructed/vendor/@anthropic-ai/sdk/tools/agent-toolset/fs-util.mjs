/**
 * @anthropic-ai/sdk/tools/agent-toolset/fs-util.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-2cw52qnf.js (9)
 * attribution: esm-fingerprint 7, esm-layout 2
 */
import * as hat from "fs";
import * as zp from "path";
import * as BRt from "crypto";
import { ch } from "../../lib/tools/ToolError.mjs";

//@ chunk-2cw52qnf.js:796-828 esm-fingerprint
var promises = hat.promises,
  z = 448,
  dt = 384;
//@ chunk-2cw52qnf.js:828-939 esm-fingerprint
function te(r, e) {
  let relativePath = zp.relative(r, e);
  return (
    relativePath === "" ||
    (!relativePath.startsWith(".." + zp.sep) && relativePath !== ".." && !zp.isAbsolute(relativePath))
  );
}
//@ chunk-2cw52qnf.js:939-1025 esm-layout
async function ue(r, e) {
  for (let t of r) if (te(await q(zp.resolve(t)), e)) return t;
  return;
}
//@ chunk-2cw52qnf.js:1025-1035 esm-layout
var ht = 40;
//@ chunk-2cw52qnf.js:1035-1099 esm-fingerprint
function G(r) {
  let e = r?.code;
  return typeof e === "string" ? e : void 0;
}
//@ chunk-2cw52qnf.js:1099-1570 esm-fingerprint
async function q(r) {
  let e = [],
    t = r,
    n = 0;
  for (;;) {
    let i;
    try {
      i = await promises.realpath(t);
    } catch (error) {
      let s;
      try {
        s = (await promises.lstat(t)).isSymbolicLink();
      } catch (error) {
        let l = G(error);
        if (l !== "ENOENT" && l !== "ENOTDIR") throw error;
        let dir = zp.dirname(t);
        if (dir === t) throw error;
        (e.push(zp.basename(t)), (t = dir));
        continue;
      }
      if (!s) throw error;
      if (++n > ht) throw Object.assign(Error("too many levels of symbolic links"), { code: "ELOOP" });
      t = zp.resolve(zp.dirname(t), await promises.readlink(t));
      continue;
    }
    return e.length ? zp.join(i, ...e.reverse()) : i;
  }
}
//@ chunk-2cw52qnf.js:1570-1956 esm-fingerprint
async function Ie(r, e, t) {
  let n = t?.allowedRoots ?? [],
    i = await q(zp.resolve(r)),
    o;
  try {
    o = await q(zp.resolve(i, e));
  } catch (error) {
    throw new ch(P(error, `path ${JSON.stringify(e)}`));
  }
  if (te(i, o) || (await ue(n, o)) !== void 0) return o;
  let s = n.length
    ? "the session's working directory and its other permitted directories"
    : "the session's working directory";
  throw new ch(`path ${JSON.stringify(e)} is outside ${s}`);
}
//@ chunk-2cw52qnf.js:1956-2344 esm-fingerprint
async function pe(r, e) {
  let dir = zp.dirname(r),
    joined = zp.join(dir, `.tmp-${process.pid}-${BRt.randomUUID()}`),
    i = await promises.stat(r).then(
      (s) => s.mode & 511,
      () => {
        return;
      },
    ),
    o;
  try {
    if (((o = await promises.open(joined, "wx", dt)), i !== void 0)) await o.chmod(i);
    (await o.writeFile(e, "utf-8"),
      await o.sync(),
      await o.close(),
      (o = void 0),
      await promises.rename(joined, r));
  } catch (error) {
    if (o) await o.close().catch(() => {});
    throw (await promises.unlink(joined).catch(() => {}), error);
  }
}
//@ chunk-2cw52qnf.js:2344-2868 esm-fingerprint
function P(r, e) {
  let t = G(r);
  switch (t) {
    case "ENOENT":
      return `${e}: no such file or directory`;
    case "EACCES":
    case "EPERM":
      return `${e}: permission denied`;
    case "ENOTDIR":
      return `${e}: not a directory`;
    case "EISDIR":
      return `${e}: is a directory`;
    case "ELOOP":
      return `${e}: too many levels of symbolic links`;
    case "ENAMETOOLONG":
      return `${e}: file name too long`;
    case "ENOSPC":
      return `${e}: no space left on device`;
    case "EMFILE":
    case "ENFILE":
      return `${e}: too many open files`;
    default:
      return `${e}: ${t !== void 0 ? `i/o error (${t})` : "i/o error"}`;
  }
}

export { z, G, Ie, ue, P, pe, q, te };
