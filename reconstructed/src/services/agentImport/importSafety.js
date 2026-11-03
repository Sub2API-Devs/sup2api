/**
 * services/agentImport/importSafety.ts
 *
 * 2.1.316 新增：导入其他代理配置时的安全检查：shell-exec 标记、路径钉住（防链接替换）、安全读写与拷贝
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hddjmtjj.js (33)
 * attribution: placement 33
 */
import {
  isAbsolute,
  sep,
  sep as sep_2,
  resolve,
  relative,
  relative as relative_2,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  parse,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
} from "path";
import { stat, readFile, lstat, realpath, open, readdir, mkdir, readlink } from "fs/promises";
import { constants } from "fs";
import { userInfo, homedir, homedir as homedir_2, homedir as homedir_3, homedir as homedir_4 } from "os";
import { isReservedDeviceName } from "../../utils/windowsProfileFolders.js";
import { isENOENT, getErrnoCode } from "../../utils/errors.js";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";
import {
  getFsImplementation,
  safeResolvePath,
  readHandleUpTo,
  expandWin32ExistingLongNamesStrict,
} from "../../utils/fsOperations.js";
import { Mn, Qn } from "../../utils/pathClassification.js";
import { getPlatform } from "../../utils/platform.js";
import { normalizeCaseForComparison } from "../../utils/permissions/filesystem.js";
import { pinWriteTarget, rethrowWithPath, openNoFollow } from "../../utils/fsSafety/pathRevalidation.js";
import {
  SymlinkWriteRefusedError,
  SymlinkReadRefusedError,
} from "../../utils/fsSafety/atomicWriteStaging.js";
import { isUnsupportedFlagError } from "../../utils/atomicPublishWrite.js";
import { isSystemVolumePath } from "../../utils/permissions/protectedDirs.js";
import { writeFileAtomic } from "../../utils/file.js";

//@ chunk-hddjmtjj.js:1514-1575 placement
function Me(n) {
  return isAbsolute(n) || n === ".." || n.startsWith(".." + sep);
}
//@ chunk-hddjmtjj.js:1575-1591 placement
var Oe = 10485760;
/**
 * 读取导入文件（超过上限时拒绝）。
 */
//@ chunk-hddjmtjj.js:1591-1724 placement
async function readCappedImportFile(n) {
  if ((await stat(n)).size > Oe) throw Error("file exceeds IMPORT_MAX_FILE_BYTES; refusing to load");
  return readFile(n, "utf8");
}
//@ chunk-hddjmtjj.js:1724-1786 placement
async function R(n) {
  try {
    return (await lstat(n), !0);
  } catch {
    return !1;
  }
}
/**
 * 名称清理为可用的文件名（非法字符替换、避免保留名）。
 */
//@ chunk-hddjmtjj.js:1786-1930 placement
function sanitizeImportName(n) {
  let e =
    n
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/-{3,}/g, (r) => "_".repeat(r.length))
      .replace(/^-+/, "_") || "_";
  return isReservedDeviceName(e) ? `_${e}` : e;
}
//@ chunk-hddjmtjj.js:1930-1981 placement
function ce(n) {
  return n.replace(/-{3,}/g, "\u2014");
}
//@ chunk-hddjmtjj.js:1981-2215 placement
function describeUnexpectedTableShape(
  n,
  e,
  r,
  l,
  i = "Has an unexpected shape (expected a table of named entries). Review it manually.",
) {
  if (n === void 0) return {};
  if (typeof n !== "object" || n === null || Array.isArray(n))
    return (l.push({ scope: r, label: e, reason: i }), {});
  return n;
}
//@ chunk-hddjmtjj.js:2215-2297 placement
var ct = /\$ARGUMENTS\[\d+\]|\$ARGUMENTS|\$\d+(?!\w)/g,
  an = /[a-zA-RT-Z_).,;:'"?!>-]/;
/**
 * 文本中是否有前面不是允许字符的 “!”（变量引用除外）。
 */
//@ chunk-hddjmtjj.js:2297-2459 placement
function hasBareBang(n) {
  let replaced = n.replace(/\$[\p{L}\p{N}_.-]+/gu, (r) => " ".repeat(r.length));
  for (let r = 0; r < n.length; r++) if (n[r] === "!" && !an.test(replaced[r - 1] ?? "")) return !0;
  return !1;
}
/**
 * 检查命令正文中会被 Claude Code 执行的 shell 标记（悬空的 !`、参数占位与 ! 混用等），返回问题描述。
 */
//@ chunk-hddjmtjj.js:2459-3569 placement
function findShellExecHazard(body, hasArgs) {
  let replaced = body.replace(/(?<=^|\s)!`[^`]*`/gm, "");
  if (/(?<=^|\s)!(?=`|\$)/m.test(replaced))
    return "Contains a dangling shell-exec marker that argument substitution could complete into a live command at invocation time. Port it manually.";
  if ([...body.matchAll(ct)].length === 0) return null;
  let l = replaced === body ? hasBareBang(body) : replaced.includes("!");
  if (replaced.includes("`") || l)
    return "Mixes argument placeholders with backticks or '!' outside its shell blocks \u2014 argument substitution at invocation time could assemble a live shell-exec marker from them. Port it manually.";
  if (hasArgs.some((i) => i.includes("!")))
    return "One of its shell blocks contains '!' while the command also has argument placeholders \u2014 a backtick in the typed arguments could re-pair the marker into executing text the block never consented to. Port it manually.";
  if (hasArgs.some((i) => [...i.matchAll(ct)].length > 0))
    return "One of its shell blocks contains an argument placeholder \u2014 Gemini shell-escapes `{{args}}` inside `!{\u2026}`, Claude Code's `$ARGUMENTS` substitution doesn't, so importing would let typed arguments inject shell commands. Port it manually.";
  return null;
}
//@ chunk-hddjmtjj.js:3569-3658 placement
function ie(n) {
  return n.includes("```!") || (n.includes("!`") && /(?<=^|\s)!`[^`]+`/m.test(n));
}
//@ chunk-hddjmtjj.js:3658-3750 placement
function Ne(n, e) {
  let r = resolve(n, e),
    l = relative(n, r);
  if (l === "" || Me(l) || resolve(n, l) !== r) return null;
  return r;
}
/**
 * 解析路径且真实路径仍在根目录内，否则 null。
 */
//@ chunk-hddjmtjj.js:3750-3921 placement
async function resolveInsideReal(n, e) {
  let r = Ne(n, e);
  if (r === null) return null;
  let l, i;
  try {
    ((l = await realpath(n)), (i = await realpath(r)));
  } catch {
    return null;
  }
  let s = relative(l, i);
  if (s === "" || Me(s)) return null;
  return r;
}
/**
 * 解析路径并确认路径上各级都不是符号链接（不存在的部分允许），否则 null。
 */
//@ chunk-hddjmtjj.js:3921-4139 placement
async function pinPathInside(n, e) {
  let r = Ne(n, e);
  if (r === null) return null;
  let parts = relative(n, r).split(sep),
    i = n;
  for (let s of parts) {
    i = join_2(i, s);
    let c;
    try {
      c = await lstat(i);
    } catch (error) {
      if (isENOENT(error)) return r;
      return null;
    }
    if (c.isSymbolicLink()) return null;
  }
  return r;
}
//@ chunk-hddjmtjj.js:4139-4171 placement
var TENGU_EAGER_LIGHTHOUSE = "tengu_eager_lighthouse";
//@ chunk-hddjmtjj.js:4171-4209 placement
function me() {
  return readFlagWithOverride(TENGU_EAGER_LIGHTHOUSE, { safe: !0 });
}
/**
 * 把路径钉在根目录内（拒绝 .. 与链接替换），返回可校验的打开句柄信息。
 */
//@ chunk-hddjmtjj.js:4209-4793 placement
async function pinInside(root, relPath, r, l = !1) {
  let i = relative(root, relPath);
  if (i === "" || Me(i)) throw Error("pinInside: path is not strictly inside its root");
  let s = getFsImplementation(),
    c = safeResolvePath(s, root),
    m = c.isCanonical ? c.resolvedPath : root,
    f = Mn(join_2(m, i)),
    h = [f],
    g = getPlatform();
  if (g === "macos" || g === "windows") {
    let w = safeResolvePath(s, f);
    if (
      w.isCanonical &&
      w.resolvedPath !== f &&
      w.resolvedPath.startsWith(m + sep) &&
      normalizeCaseForComparison(w.resolvedPath.slice(m.length).normalize("NFC")) ===
        normalizeCaseForComparison(f.slice(m.length).normalize("NFC")) &&
      (await pinPathInside(m, f)) !== null
    )
      h.push(w.resolvedPath);
  }
  try {
    return await pinWriteTarget(f, h, { createParents: l });
  } catch (error) {
    if (error instanceof SymlinkWriteRefusedError) throw assertStillPinned(r, relPath);
    return rethrowWithPath(error, { ioPath: f, canonicalPath: f }, relPath);
  }
}
//@ chunk-hddjmtjj.js:4793-5199 placement
function assertStillPinned(n, e) {
  let r = `Refusing to ${n} ${e}: the import could not confirm it is still the place it checked. It, or a folder on the way to it, may have been replaced (for example by a symbolic link), or a folder's name on disk may differ from this path in letter case. Make sure each folder on that path is a real folder spelled as shown, then run the import again.`;
  return n === "read" ? new SymlinkReadRefusedError(r) : new SymlinkWriteRefusedError(r);
}
/**
 * 写入前复查路径未被替换为链接。
 */
//@ chunk-hddjmtjj.js:5199-5308 placement
async function recheckPinned(n, e, r) {
  try {
    await n.recheckBeforeWrite();
  } catch (error) {
    if (error instanceof SymlinkWriteRefusedError) throw assertStillPinned(e, r);
    throw error;
  }
}
//@ chunk-hddjmtjj.js:5308-5765 placement
async function openPinnedForRead(n, e) {
  let r = await pinInside(n, e, "read"),
    l;
  try {
    await recheckPinned(r, "read", e);
    let i = getPlatform();
    if (i === "windows") {
      if ((await lstat(r.ioPath)).isSymbolicLink()) throw assertStillPinned("read", e);
      l = await open(r.ioPath, "r");
    } else
      l = await openNoFollow(
        r.ioPath,
        constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK | (constants.O_NOCTTY ?? 0),
        i,
      );
    return (await recheckPinned(r, "read", e), l);
  } catch (error) {
    await l?.close();
    let s = getErrnoCode(error);
    if (s === "ELOOP" || s === "EMLINK" || s === "EFTYPE" || s === "ENOTDIR")
      throw assertStillPinned("read", e);
    return rethrowWithPath(error, r, e);
  } finally {
    await r.close();
  }
}
/**
 * 读取导入源文件（必须是普通文件，限制 IMPORT_MAX_FILE_BYTES）。
 */
//@ chunk-hddjmtjj.js:5765-6158 placement
async function readImportFile(n, e) {
  let r = await openPinnedForRead(n, e);
  try {
    let stats = await r.stat();
    if (!stats.isFile())
      throw new SymlinkReadRefusedError(`Refusing to read ${e}: it is not a regular file.`);
    if (stats.size > Oe) throw Error("file exceeds IMPORT_MAX_FILE_BYTES; refusing to load");
    let i = await readHandleUpTo(r, Oe + 1, "file");
    if (i.length > Oe) throw Error("file exceeds IMPORT_MAX_FILE_BYTES; refusing to load");
    return i.toString("utf8");
  } finally {
    await r.close();
  }
}
//@ chunk-hddjmtjj.js:6158-6217 placement
function fe(n, e, r) {
  return n === "project" && me() ? readImportFile(e, r) : readCappedImportFile(r);
}
//@ chunk-hddjmtjj.js:6217-6798 placement
async function openPinnedForReadViaFd(n, e) {
  let r = await pinInside(n, e, "read"),
    l,
    ioPath = r.ioPath;
  try {
    await recheckPinned(r, "read", e);
    let s = getPlatform();
    if (s === "windows") {
      if (!(await lstat(r.ioPath)).isDirectory()) throw assertStillPinned("read", e);
    } else if (
      ((l = await openNoFollow(
        r.ioPath,
        constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
        s,
      )),
      r.ioPath.startsWith("/proc/self/fd/"))
    )
      ioPath = `/proc/self/fd/${l.fd}`;
    let c = await readdir(ioPath, { withFileTypes: !0 });
    return (await recheckPinned(r, "read", e), c);
  } catch (error) {
    let c = getErrnoCode(error);
    if (c === "ELOOP" || c === "ENOTDIR" || c === "EMLINK" || c === "EFTYPE")
      throw assertStillPinned("read", e);
    return rethrowWithPath(error, { ioPath: ioPath, canonicalPath: r.canonicalPath }, e);
  } finally {
    try {
      await l?.close();
    } finally {
      await r.close();
    }
  }
}
//@ chunk-hddjmtjj.js:6798-7191 placement
async function openPinnedForWrite(n, e) {
  let r = await pinInside(n, e, "write", !0);
  try {
    await recheckPinned(r, "write", e);
    let l = getPlatform(),
      i;
    try {
      i =
        l === "windows"
          ? await open(r.ioPath, "wx")
          : await openNoFollow(
              r.ioPath,
              constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
              l,
            );
    } catch (error) {
      let c = getErrnoCode(error);
      if (c === "EEXIST") return null;
      if (c === "ELOOP") throw assertStillPinned("write", e);
      return rethrowWithPath(error, r, e);
    }
    try {
      await recheckPinned(r, "write", e);
    } catch (error) {
      throw (await i.close(), error);
    }
    return i;
  } finally {
    await r.close();
  }
}
//@ chunk-hddjmtjj.js:7333-7542 placement
async function createExclusive(n, e) {
  let r = await pinInside(n, e, "write", !0);
  try {
    return (
      await recheckPinned(r, "write", e),
      await mkdir(r.ioPath),
      await recheckPinned(r, "write", e),
      !0
    );
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST") return !1;
    return rethrowWithPath(error, r, e);
  } finally {
    await r.close();
  }
}
/**
 * 拷贝时目标被他人创建的错误。
 */
//@ chunk-hddjmtjj.js:7542-7687 placement
function copyRaceError(n) {
  return new SymlinkWriteRefusedError(
    `Refusing to copy into ${n}: something else created a file or folder with that name while the import was copying.`,
  );
}
/**
 * 安全拷贝文件（源不再是普通文件或写入无进展时停止）。
 */
//@ chunk-hddjmtjj.js:7687-8458 placement
async function copyFileSafely(n, e, r, l, i) {
  for (let s of l) {
    let c = join_2(e, s.name),
      m = join_2(r, s.name);
    if (s.isDirectory()) {
      let f = await openPinnedForReadViaFd(n, c);
      if (!(await createExclusive(n, m))) throw copyRaceError(m);
      await copyFileSafely(n, c, m, f, i);
    } else if (s.isFile()) {
      let f = await openPinnedForRead(n, c);
      try {
        let stats = await f.stat();
        if (!stats.isFile())
          throw new SymlinkReadRefusedError(`Refusing to copy ${c}: it is no longer a regular file.`);
        let g = await openPinnedForWrite(n, m);
        if (g === null) throw copyRaceError(m);
        try {
          let allocUnsafe = Buffer.allocUnsafe(65536);
          for (;;) {
            let { bytesRead: bytesRead } = await f.read(allocUnsafe, 0, allocUnsafe.length, null);
            if (bytesRead === 0) break;
            for (let y = 0; y < bytesRead;) {
              let { bytesWritten: bytesWritten } = await g.write(allocUnsafe, y, bytesRead - y);
              if (bytesWritten === 0) throw Error("a write made no progress; copy stopped");
              y += bytesWritten;
            }
          }
          try {
            await g.chmod(stats.mode & 511);
          } catch (error) {
            if (!isUnsupportedFlagError(error)) throw error;
          }
          if ((stats.mode & 3584) !== 0) i.specialBitsDropped++;
        } finally {
          await g.close();
        }
      } finally {
        await f.close();
      }
    } else i.notCopied++;
  }
}
//@ chunk-hddjmtjj.js:8458-8560 placement = detectTerminal (0.86)
function detectTerminal(n, e = "linux") {
  let r = Mn(n);
  return e === "darwin" || e === "win32" ? r.toUpperCase().toLowerCase() : r;
}
//@ chunk-hddjmtjj.js:8560-8861 placement = getReservedShortcuts (1)
async function isOutsideDirectory(n, e) {
  if (!e) return !1;
  let r = await isUnderSymlink(resolve(n));
  if (r === null) return !0;
  let l = await isUnderSymlink(resolve(e));
  if (l === null) return !0;
  let i;
  switch (getPlatform()) {
    case "windows":
      i = expandWin32ExistingLongNamesStrict;
      break;
    case "macos":
      i = isSystemVolumePath;
      break;
    default:
      i = (f) => f;
  }
  let s = i(l),
    c = i(r);
  if (s === null || c === null) return !0;
  let m = relative(detectTerminal(s), detectTerminal(c));
  return m === "" || !Me(m);
}
//@ chunk-hddjmtjj.js:8861-8954 placement
function ne() {
  let n;
  try {
    n = userInfo().homedir;
  } catch {
    return !0;
  }
  if (!n) return !0;
  return resolve(homedir()) !== resolve(n);
}
//@ chunk-hddjmtjj.js:8954-8982 placement
function ue(n) {
  return Qn(n);
}
//@ chunk-hddjmtjj.js:8982-9358 placement
async function isUnderSymlink(n) {
  let root = parse(n).root,
    r = root,
    parts = relative(root, n).split(sep),
    i = 0;
  while (parts.length > 0) {
    let s = parts.shift(),
      c = join_2(r, s),
      m;
    try {
      m = await lstat(c);
    } catch (error) {
      if (isENOENT(error)) return join_2(c, ...parts);
      return null;
    }
    if (m.isSymbolicLink()) {
      if (++i > 40) return null;
      let f;
      try {
        f = await readlink(c);
      } catch {
        return null;
      }
      if (ue(f)) return null;
      let h = isAbsolute(f) ? f : join_2(dirname(c), f),
        g = resolve(h, ...parts);
      ((r = parse(g).root), (parts = relative(r, g).split(sep)));
      continue;
    }
    r = c;
  }
  return r;
}
/**
 * 把导入的指令追加到 CLAUDE.md（带 imported-from 标记，已导入则跳过；项目作用域拒绝符号链接）。
 */
//@ chunk-hddjmtjj.js:9358-10518 placement
async function appendImportedInstructions(n, e, r, l, i, s) {
  if (s) {
    if ((await pinPathInside(s, n)) === null)
      return {
        skipped: `${basename(n)}: target is (or is under) a symlink \u2014 refusing project-scope write`,
      };
    if ((await pinPathInside(s, e)) === null)
      return {
        skipped: `${basename(n)}: source is (or is under) a symlink \u2014 refusing project-scope read`,
      };
  }
  let c = `<!-- imported-from: ${l} -->`,
    m = s && me() ? s : void 0,
    f = "";
  try {
    if (((f = m === void 0 ? await readCappedImportFile(n) : await readImportFile(m, n)), f.includes(c)))
      return { skipped: `${basename(n)}: already imported (marker present; not re-synced)` };
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  if (i) return `would append ${basename(e)} \u2192 \`${n}\``;
  let h = r ?? (m === void 0 ? await readCappedImportFile(e) : await readImportFile(m, e)),
    w = `${
      f
        ? `${f}${
            f.endsWith(`
`)
              ? ""
              : `
`
          }
`
        : ""
    }${c}
${h.trimEnd()}
`;
  if (m === void 0)
    (await mkdir(dirname(n), { recursive: !0 }),
      await writeFileAtomic(n, w, { encoding: "utf8", allowSymlink: !0 }));
  else {
    let y = await pinInside(m, n, "write", !0);
    try {
      (await recheckPinned(y, "write", n), await writeFileAtomic(y.ioPath, w, { encoding: "utf8" }));
    } catch (error) {
      return rethrowWithPath(error, y, n);
    } finally {
      await y.close();
    }
  }
  let C =
    dirname(e) !== dirname(n) && /(?:^|\s)@(?![/~@])(?:[^\s\\]|\\ )+/.test(h)
      ? " \u2014 note: relative @imports in this file now resolve against the new location; convert them to absolute paths if they stop working"
      : "";
  return `appended ${basename(e)} \u2192 \`${n}\`${C}`;
}

export {
  openPinnedForWrite,
  me,
  readImportFile,
  readCappedImportFile,
  openPinnedForReadViaFd,
  pinPathInside,
  R,
  createExclusive,
  copyFileSafely,
  copyRaceError,
  ne,
  ue,
  isOutsideDirectory,
  fe,
  describeUnexpectedTableShape,
  sanitizeImportName,
  ce,
  ie,
  findShellExecHazard,
  Ne,
  resolveInsideReal,
  appendImportedInstructions,
};
