/**
 * @anthropic-ai/sdk/tools/agent-toolset/fs-util.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-m6wtswwx.js (9)
 * attribution: esm-fingerprint 7, esm-layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import * as Jpt from "fs";
import * as Nm from "path";
import * as pHt from "crypto";
import { ToolError } from "../../lib/tools/ToolError.mjs";

//@ chunk-m6wtswwx.js:796-828 esm-fingerprint
var fs = Jpt.promises;
var DIR_CREATE_MODE = 448;
var FILE_CREATE_MODE = 384;
//@ chunk-m6wtswwx.js:828-939 esm-fingerprint
function isWithin(root, p) {
  let rel = Nm.relative(root, p);
  return rel === "" || (!rel.startsWith(".." + Nm.sep) && rel !== ".." && !Nm.isAbsolute(rel));
}
//@ chunk-m6wtswwx.js:939-1025 esm-layout
async function containingRoot(roots, target) {
  for (let root of roots) if (isWithin(await canonicalize(Nm.resolve(root)), target)) return root;
  return;
}
//@ chunk-m6wtswwx.js:1025-1035 esm-layout
var MAX_SYMLINK_HOPS = 40;
//@ chunk-m6wtswwx.js:1035-1099 esm-fingerprint
function errnoCode(err) {
  let code = err?.code;
  return typeof code === "string" ? code : undefined;
}
//@ chunk-m6wtswwx.js:1099-1570 esm-fingerprint
async function canonicalize(abs) {
  let tail = [];
  let prefix = abs;
  let hops = 0;
  for (;;) {
    let real;
    try {
      real = await fs.realpath(prefix);
    } catch (realpathErr) {
      let isLink;
      try {
        isLink = (await fs.lstat(prefix)).isSymbolicLink();
      } catch (lstatErr) {
        let code = errnoCode(lstatErr);
        if (code !== "ENOENT" && code !== "ENOTDIR") throw lstatErr;
        let parent = Nm.dirname(prefix);
        if (parent === prefix) throw lstatErr;
        tail.push(Nm.basename(prefix));
        prefix = parent;
        continue;
      }
      if (!isLink) throw realpathErr;
      if (++hops > MAX_SYMLINK_HOPS)
        throw Object.assign(Error("too many levels of symbolic links"), {
          code: "ELOOP",
        });
      prefix = Nm.resolve(Nm.dirname(prefix), await fs.readlink(prefix));
      continue;
    }
    return tail.length ? Nm.join(real, ...tail.reverse()) : real;
  }
}
//@ chunk-m6wtswwx.js:1570-1956 esm-fingerprint
async function confineToRoot(root, p, opts) {
  let allowedRoots = opts?.allowedRoots ?? [];
  let realRoot = await canonicalize(Nm.resolve(root));
  let real;
  try {
    real = await canonicalize(Nm.resolve(realRoot, p));
  } catch (err) {
    throw new ToolError(fsErrorMessage(err, `path ${JSON.stringify(p)}`));
  }
  if (isWithin(realRoot, real) || (await containingRoot(allowedRoots, real)) !== undefined) return real;
  let permitted = allowedRoots.length
    ? "the session's working directory and its other permitted directories"
    : "the session's working directory";
  throw new ToolError(`path ${JSON.stringify(p)} is outside ${permitted}`);
}
//@ chunk-m6wtswwx.js:1956-2344 esm-fingerprint
async function atomicWriteFile(targetPath, content) {
  let dir = Nm.dirname(targetPath);
  let tempPath = Nm.join(dir, `.tmp-${process.pid}-${pHt.randomUUID()}`);
  let existingMode = await fs.stat(targetPath).then(
    (st) => st.mode & 511,
    () => {
      return;
    },
  );
  let handle;
  try {
    handle = await fs.open(tempPath, "wx", FILE_CREATE_MODE);
    if (existingMode !== undefined) await handle.chmod(existingMode);
    await handle.writeFile(content, "utf-8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await fs.rename(tempPath, targetPath);
  } catch (err) {
    if (handle) await handle.close().catch(() => {});
    await fs.unlink(tempPath).catch(() => {});
    throw err;
  }
}
//@ chunk-m6wtswwx.js:2344-2868 esm-fingerprint
function fsErrorMessage(err, file) {
  let code = errnoCode(err);
  switch (code) {
    case "ENOENT":
      return `${file}: no such file or directory`;
    case "EACCES":
    case "EPERM":
      return `${file}: permission denied`;
    case "ENOTDIR":
      return `${file}: not a directory`;
    case "EISDIR":
      return `${file}: is a directory`;
    case "ELOOP":
      return `${file}: too many levels of symbolic links`;
    case "ENAMETOOLONG":
      return `${file}: file name too long`;
    case "ENOSPC":
      return `${file}: no space left on device`;
    case "EMFILE":
    case "ENFILE":
      return `${file}: too many open files`;
    default:
      return `${file}: ${code !== undefined ? `i/o error (${code})` : "i/o error"}`;
  }
}
export {
  DIR_CREATE_MODE,
  errnoCode,
  confineToRoot,
  containingRoot,
  fsErrorMessage,
  atomicWriteFile,
  canonicalize,
  isWithin,
};
