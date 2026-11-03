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
import { isAbsolute, sep, resolve, relative, join, parse, dirname, basename } from "path";
import { stat, readFile, lstat, realpath, open, readdir, mkdir, readlink } from "fs/promises";
import { constants } from "fs";
import { userInfo, homedir } from "os";
import { isReservedDeviceName } from "../../utils/windowsProfileFolders.js";
import { isENOENT, getErrnoCode } from "../../utils/errors.js";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";
import {
  getFsImplementation,
  safeResolvePath,
  readHandleUpTo,
  expandWin32ExistingLongNamesStrict,
} from "../../utils/fsOperations.js";
import { identity, isUncOrDevicePath } from "../../utils/pathClassification.js";
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
function isEscapingRelativePath(n) {
  return isAbsolute(n) || n === ".." || n.startsWith(".." + sep);
}
//@ chunk-hddjmtjj.js:1575-1591 placement
/**
 * 导入文件大小上限 10 MB，超过直接报错拒绝。
 */
var IMPORT_MAX_FILE_BYTES = 10485760;
//@ chunk-hddjmtjj.js:1591-1724 placement
/**
 * 读取导入文件（超过上限时拒绝）。
 */
async function readCappedImportFile(n) {
  if ((await stat(n)).size > IMPORT_MAX_FILE_BYTES)
    throw Error("file exceeds IMPORT_MAX_FILE_BYTES; refusing to load");
  return readFile(n, "utf8");
}
//@ chunk-hddjmtjj.js:1724-1786 placement
async function pathExists(n) {
  try {
    await lstat(n);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-hddjmtjj.js:1786-1930 placement
/**
 * 名称清理为可用的文件名（非法字符替换、避免保留名）。
 */
function sanitizeImportName(n) {
  let e =
    n
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/-{3,}/g, (r) => "_".repeat(r.length))
      .replace(/^-+/, "_") || "_";
  return isReservedDeviceName(e) ? `_${e}` : e;
}
//@ chunk-hddjmtjj.js:1930-1981 placement
function collapseDashes(n) {
  return n.replace(/-{3,}/g, "\u2014");
}
//@ chunk-hddjmtjj.js:1981-2215 placement
function describeUnexpectedTableShape(
  n,
  label,
  scope,
  l,
  reason = "Has an unexpected shape (expected a table of named entries). Review it manually.",
) {
  if (n === undefined) return {};
  if (typeof n !== "object" || n === null || Array.isArray(n)) {
    l.push({
      scope,
      label,
      reason,
    });
    return {};
  }
  return n;
}
//@ chunk-hddjmtjj.js:2215-2297 placement
var CODEX_ARG_PLACEHOLDER_RE = /\$ARGUMENTS\[\d+\]|\$ARGUMENTS|\$\d+(?!\w)/g;
var NON_BANG_CHARS_RE = /[a-zA-RT-Z_).,;:'"?!>-]/;
//@ chunk-hddjmtjj.js:2297-2459 placement
/**
 * 文本中是否有前面不是允许字符的 “!”（变量引用除外）。
 */
function hasBareBang(body) {
  let replaced = body.replace(/\$[\p{L}\p{N}_.-]+/gu, (r) => " ".repeat(r.length));
  for (let i = 0; i < body.length; i++)
    if (body[i] === "!" && !NON_BANG_CHARS_RE.test(replaced[i - 1] ?? "")) return true;
  return false;
}
//@ chunk-hddjmtjj.js:2459-3569 placement
/**
 * 检查命令正文中会被 Claude Code 执行的 shell 标记（悬空的 !`、参数占位与 ! 混用等），返回问题描述。
 */
function findShellExecHazard(body, hasArgs) {
  let replaced = body.replace(/(?<=^|\s)!`[^`]*`/gm, "");
  if (/(?<=^|\s)!(?=`|\$)/m.test(replaced))
    return "Contains a dangling shell-exec marker that argument substitution could complete into a live command at invocation time. Port it manually.";
  if ([...body.matchAll(CODEX_ARG_PLACEHOLDER_RE)].length === 0) return null;
  let l = replaced === body ? hasBareBang(body) : replaced.includes("!");
  if (replaced.includes("`") || l)
    return "Mixes argument placeholders with backticks or '!' outside its shell blocks \u2014 argument substitution at invocation time could assemble a live shell-exec marker from them. Port it manually.";
  if (hasArgs.some((hasArg) => hasArg.includes("!")))
    return "One of its shell blocks contains '!' while the command also has argument placeholders \u2014 a backtick in the typed arguments could re-pair the marker into executing text the block never consented to. Port it manually.";
  if (hasArgs.some((hasArg) => [...hasArg.matchAll(CODEX_ARG_PLACEHOLDER_RE)].length > 0))
    return "One of its shell blocks contains an argument placeholder \u2014 Gemini shell-escapes `{{args}}` inside `!{\u2026}`, Claude Code's `$ARGUMENTS` substitution doesn't, so importing would let typed arguments inject shell commands. Port it manually.";
  return null;
}
//@ chunk-hddjmtjj.js:3569-3658 placement
function hasShellExecBlock(n) {
  return n.includes("```!") || (n.includes("!`") && /(?<=^|\s)!`[^`]+`/m.test(n));
}
//@ chunk-hddjmtjj.js:3658-3750 placement
function resolveWithinRoot(n, e) {
  let r = resolve(n, e);
  let l = relative(n, r);
  if (l === "" || isEscapingRelativePath(l) || resolve(n, l) !== r) return null;
  return r;
}
//@ chunk-hddjmtjj.js:3750-3921 placement
/**
 * 解析路径且真实路径仍在根目录内，否则 null。
 */
async function resolveInsideReal(n, e) {
  let withinRoot = resolveWithinRoot(n, e);
  if (withinRoot === null) return null;
  let l;
  let i;
  try {
    l = await realpath(n);
    i = await realpath(withinRoot);
  } catch {
    return null;
  }
  let s = relative(l, i);
  if (s === "" || isEscapingRelativePath(s)) return null;
  return withinRoot;
}
//@ chunk-hddjmtjj.js:3921-4139 placement
/**
 * 解析路径并确认路径上各级都不是符号链接（不存在的部分允许），否则 null。
 */
async function pinPathInside(n, e) {
  let withinRoot = resolveWithinRoot(n, e);
  if (withinRoot === null) return null;
  let parts = relative(n, withinRoot).split(sep);
  let i = n;
  for (let s of parts) {
    i = join(i, s);
    let c;
    try {
      c = await lstat(i);
    } catch (error) {
      if (isENOENT(error)) return withinRoot;
      return null;
    }
    if (c.isSymbolicLink()) return null;
  }
  return withinRoot;
}
//@ chunk-hddjmtjj.js:4139-4171 placement
var TENGU_EAGER_LIGHTHOUSE = "tengu_eager_lighthouse";
//@ chunk-hddjmtjj.js:4171-4209 placement
function isEagerLighthouseEnabled() {
  return readFlagWithOverride(TENGU_EAGER_LIGHTHOUSE, {
    safe: true,
  });
}
//@ chunk-hddjmtjj.js:4209-4793 placement
/**
 * 把路径钉在根目录内（拒绝 .. 与链接替换），返回可校验的打开句柄信息。
 */
async function pinInside(root, relPath, r, createParents = false) {
  let i = relative(root, relPath);
  if (i === "" || isEscapingRelativePath(i)) throw Error("pinInside: path is not strictly inside its root");
  let fsImplementation = getFsImplementation();
  let c = safeResolvePath(fsImplementation, root);
  let m = c.isCanonical ? c.resolvedPath : root;
  let f = identity(join(m, i));
  let h = [f];
  let platform = getPlatform();
  if (platform === "macos" || platform === "windows") {
    let w = safeResolvePath(fsImplementation, f);
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
    return await pinWriteTarget(f, h, {
      createParents,
    });
  } catch (error) {
    if (error instanceof SymlinkWriteRefusedError) throw assertStillPinned(r, relPath);
    return rethrowWithPath(
      error,
      {
        ioPath: f,
        canonicalPath: f,
      },
      relPath,
    );
  }
}
//@ chunk-hddjmtjj.js:4793-5199 placement
function assertStillPinned(n, e) {
  let message = `Refusing to ${n} ${e}: the import could not confirm it is still the place it checked. It, or a folder on the way to it, may have been replaced (for example by a symbolic link), or a folder's name on disk may differ from this path in letter case. Make sure each folder on that path is a real folder spelled as shown, then run the import again.`;
  return n === "read" ? new SymlinkReadRefusedError(message) : new SymlinkWriteRefusedError(message);
}
//@ chunk-hddjmtjj.js:5199-5308 placement
/**
 * 写入前复查路径未被替换为链接。
 */
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
  let r = await pinInside(n, e, "read");
  let l;
  try {
    await recheckPinned(r, "read", e);
    let platform = getPlatform();
    if (platform === "windows") {
      if ((await lstat(r.ioPath)).isSymbolicLink()) throw assertStillPinned("read", e);
      l = await open(r.ioPath, "r");
    } else
      l = await openNoFollow(
        r.ioPath,
        constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK | (constants.O_NOCTTY ?? 0),
        platform,
      );
    await recheckPinned(r, "read", e);
    return l;
  } catch (error) {
    await l?.close();
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP" || errnoCode === "EMLINK" || errnoCode === "EFTYPE" || errnoCode === "ENOTDIR")
      throw assertStillPinned("read", e);
    return rethrowWithPath(error, r, e);
  } finally {
    await r.close();
  }
}
//@ chunk-hddjmtjj.js:5765-6158 placement
/**
 * 读取导入源文件（必须是普通文件，限制 IMPORT_MAX_FILE_BYTES）。
 */
async function readImportFile(n, e) {
  let pinnedForRead = await openPinnedForRead(n, e);
  try {
    let stats = await pinnedForRead.stat();
    if (!stats.isFile())
      throw new SymlinkReadRefusedError(`Refusing to read ${e}: it is not a regular file.`);
    if (stats.size > IMPORT_MAX_FILE_BYTES)
      throw Error("file exceeds IMPORT_MAX_FILE_BYTES; refusing to load");
    let handleUpTo = await readHandleUpTo(pinnedForRead, IMPORT_MAX_FILE_BYTES + 1, "file");
    if (handleUpTo.length > IMPORT_MAX_FILE_BYTES)
      throw Error("file exceeds IMPORT_MAX_FILE_BYTES; refusing to load");
    return handleUpTo.toString("utf8");
  } finally {
    await pinnedForRead.close();
  }
}
//@ chunk-hddjmtjj.js:6158-6217 placement
function readImportFileChecked(scope, projectRoot, r) {
  return scope === "project" && isEagerLighthouseEnabled()
    ? readImportFile(projectRoot, r)
    : readCappedImportFile(r);
}
//@ chunk-hddjmtjj.js:6217-6798 placement
async function openPinnedForReadViaFd(n, e) {
  let r = await pinInside(n, e, "read");
  let l;
  let ioPath = r.ioPath;
  try {
    await recheckPinned(r, "read", e);
    let platform = getPlatform();
    if (platform === "windows") {
      if (!(await lstat(r.ioPath)).isDirectory()) throw assertStillPinned("read", e);
    } else {
      l = await openNoFollow(
        r.ioPath,
        constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
        platform,
      );
      if (r.ioPath.startsWith("/proc/self/fd/")) ioPath = `/proc/self/fd/${l.fd}`;
    }
    let c = await readdir(ioPath, {
      withFileTypes: true,
    });
    await recheckPinned(r, "read", e);
    return c;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP" || errnoCode === "ENOTDIR" || errnoCode === "EMLINK" || errnoCode === "EFTYPE")
      throw assertStillPinned("read", e);
    return rethrowWithPath(
      error,
      {
        ioPath,
        canonicalPath: r.canonicalPath,
      },
      e,
    );
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
  let r = await pinInside(n, e, "write", true);
  try {
    await recheckPinned(r, "write", e);
    let platform = getPlatform();
    let i;
    try {
      i =
        platform === "windows"
          ? await open(r.ioPath, "wx")
          : await openNoFollow(
              r.ioPath,
              constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
              platform,
            );
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "EEXIST") return null;
      if (errnoCode === "ELOOP") throw assertStillPinned("write", e);
      return rethrowWithPath(error, r, e);
    }
    try {
      await recheckPinned(r, "write", e);
    } catch (error) {
      await i.close();
      throw error;
    }
    return i;
  } finally {
    await r.close();
  }
}
//@ chunk-hddjmtjj.js:7333-7542 placement
async function createExclusive(n, e) {
  let r = await pinInside(n, e, "write", true);
  try {
    await recheckPinned(r, "write", e);
    await mkdir(r.ioPath);
    await recheckPinned(r, "write", e);
    return true;
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST") return false;
    return rethrowWithPath(error, r, e);
  } finally {
    await r.close();
  }
}
//@ chunk-hddjmtjj.js:7542-7687 placement
/**
 * 拷贝时目标被他人创建的错误。
 */
function copyRaceError(n) {
  return new SymlinkWriteRefusedError(
    `Refusing to copy into ${n}: something else created a file or folder with that name while the import was copying.`,
  );
}
//@ chunk-hddjmtjj.js:7687-8458 placement
/**
 * 安全拷贝文件（源不再是普通文件或写入无进展时停止）。
 */
async function copyFileSafely(n, e, r, l, i) {
  for (let s of l) {
    let c = join(e, s.name);
    let m = join(r, s.name);
    if (s.isDirectory()) {
      let pinnedForReadViaFd = await openPinnedForReadViaFd(n, c);
      if (!(await createExclusive(n, m))) throw copyRaceError(m);
      await copyFileSafely(n, c, m, pinnedForReadViaFd, i);
    } else if (s.isFile()) {
      let pinnedForRead = await openPinnedForRead(n, c);
      try {
        let stats = await pinnedForRead.stat();
        if (!stats.isFile())
          throw new SymlinkReadRefusedError(`Refusing to copy ${c}: it is no longer a regular file.`);
        let pinnedForWrite = await openPinnedForWrite(n, m);
        if (pinnedForWrite === null) throw copyRaceError(m);
        try {
          let w = Buffer.allocUnsafe(65536);
          for (;;) {
            let { bytesRead } = await pinnedForRead.read(w, 0, w.length, null);
            if (bytesRead === 0) break;
            for (let y = 0; y < bytesRead;) {
              let { bytesWritten } = await pinnedForWrite.write(w, y, bytesRead - y);
              if (bytesWritten === 0) throw Error("a write made no progress; copy stopped");
              y += bytesWritten;
            }
          }
          try {
            await pinnedForWrite.chmod(stats.mode & 511);
          } catch (error) {
            if (!isUnsupportedFlagError(error)) throw error;
          }
          if ((stats.mode & 3584) !== 0) i.specialBitsDropped++;
        } finally {
          await pinnedForWrite.close();
        }
      } finally {
        await pinnedForRead.close();
      }
    } else i.notCopied++;
  }
}
//@ chunk-hddjmtjj.js:8458-8560 placement = detectTerminal (0.86)
function detectTerminal(n, e = "linux") {
  let r = identity(n);
  return e === "darwin" || e === "win32" ? r.toUpperCase().toLowerCase() : r;
}
//@ chunk-hddjmtjj.js:8560-8861 placement = getReservedShortcuts (1)
async function isOutsideDirectory(claudeConfigDir, e) {
  if (!e) return false;
  let r = await isUnderSymlink(resolve(claudeConfigDir));
  if (r === null) return true;
  let l = await isUnderSymlink(resolve(e));
  if (l === null) return true;
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
  let s = i(l);
  let c = i(r);
  if (s === null || c === null) return true;
  let m = relative(detectTerminal(s), detectTerminal(c));
  return m === "" || !isEscapingRelativePath(m);
}
//@ chunk-hddjmtjj.js:8861-8954 placement
function isHomeDirMismatch() {
  let n;
  try {
    n = userInfo().homedir;
  } catch {
    return true;
  }
  if (!n) return true;
  return resolve(homedir()) !== resolve(n);
}
//@ chunk-hddjmtjj.js:8954-8982 placement
function toFsSafeName(claudeConfigDir) {
  return isUncOrDevicePath(claudeConfigDir);
}
//@ chunk-hddjmtjj.js:8982-9358 placement
async function isUnderSymlink(n) {
  let root = parse(n).root;
  let r = root;
  let parts = relative(root, n).split(sep);
  let i = 0;
  while (parts.length > 0) {
    let s = parts.shift();
    let c = join(r, s);
    let m;
    try {
      m = await lstat(c);
    } catch (error) {
      if (isENOENT(error)) return join(c, ...parts);
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
      if (toFsSafeName(f)) return null;
      let h = isAbsolute(f) ? f : join(dirname(c), f);
      let g = resolve(h, ...parts);
      r = parse(g).root;
      parts = relative(r, g).split(sep);
      continue;
    }
    r = c;
  }
  return r;
}
//@ chunk-hddjmtjj.js:9358-10518 placement
/**
 * 把导入的指令追加到 CLAUDE.md（带 imported-from 标记，已导入则跳过；项目作用域拒绝符号链接）。
 */
async function appendImportedInstructions(n, src, r, id, dryRun, containIn) {
  if (containIn) {
    if ((await pinPathInside(containIn, n)) === null)
      return {
        skipped: `${basename(n)}: target is (or is under) a symlink \u2014 refusing project-scope write`,
      };
    if ((await pinPathInside(containIn, src)) === null)
      return {
        skipped: `${basename(n)}: source is (or is under) a symlink \u2014 refusing project-scope read`,
      };
  }
  let c = `<!-- imported-from: ${id} -->`;
  let m = containIn && isEagerLighthouseEnabled() ? containIn : undefined;
  let f = "";
  try {
    f = m === undefined ? await readCappedImportFile(n) : await readImportFile(m, n);
    if (f.includes(c))
      return {
        skipped: `${basename(n)}: already imported (marker present; not re-synced)`,
      };
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  if (dryRun) return `would append ${basename(src)} \u2192 \`${n}\``;
  let h = r ?? (m === undefined ? await readCappedImportFile(src) : await readImportFile(m, src));
  let w = `${
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
  if (m === undefined) {
    await mkdir(dirname(n), {
      recursive: true,
    });
    await writeFileAtomic(n, w, {
      encoding: "utf8",
      allowSymlink: true,
    });
  } else {
    let y = await pinInside(m, n, "write", true);
    try {
      await recheckPinned(y, "write", n);
      await writeFileAtomic(y.ioPath, w, {
        encoding: "utf8",
      });
    } catch (error) {
      return rethrowWithPath(error, y, n);
    } finally {
      await y.close();
    }
  }
  let C =
    dirname(src) !== dirname(n) && /(?:^|\s)@(?![/~@])(?:[^\s\\]|\\ )+/.test(h)
      ? " \u2014 note: relative @imports in this file now resolve against the new location; convert them to absolute paths if they stop working"
      : "";
  return `appended ${basename(src)} \u2192 \`${n}\`${C}`;
}
export {
  openPinnedForWrite,
  isEagerLighthouseEnabled,
  readImportFile,
  readCappedImportFile,
  openPinnedForReadViaFd,
  pinPathInside,
  pathExists,
  createExclusive,
  copyFileSafely,
  copyRaceError,
  isHomeDirMismatch,
  toFsSafeName,
  isOutsideDirectory,
  readImportFileChecked,
  describeUnexpectedTableShape,
  sanitizeImportName,
  collapseDashes,
  hasShellExecBlock,
  findShellExecHazard,
  resolveWithinRoot,
  resolveInsideReal,
  appendImportedInstructions,
};
