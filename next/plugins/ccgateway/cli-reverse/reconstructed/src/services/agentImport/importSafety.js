/**
 * services/agentImport/importSafety.ts
 *
 * 2.1.316 新增：导入其他代理配置时的安全检查：shell-exec 标记、路径钉住（防链接替换）、安全读写与拷贝
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ndr12bqk.js (33)
 * attribution: placement 33
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { readJsonFile_2 } from "../../utils/file.js";

//@ chunk-ndr12bqk.js:1547-1608 placement
function isEscapingRelativePath(relPath) {
  return isAbsolute(relPath) || relPath === ".." || relPath.startsWith(".." + sep);
}
//@ chunk-ndr12bqk.js:1608-1624 placement
/**
 * 导入文件大小上限 10 MB，超过直接报错拒绝。
 */
var IMPORT_MAX_FILE_BYTES = 10485760;
//@ chunk-ndr12bqk.js:1624-1757 placement
/**
 * 读取导入文件（超过上限时拒绝）。
 */
async function readCappedImportFile(path) {
  if ((await stat(path)).size > IMPORT_MAX_FILE_BYTES)
    throw Error("file exceeds IMPORT_MAX_FILE_BYTES; refusing to load");
  return readFile(path, "utf8");
}
//@ chunk-ndr12bqk.js:1757-1819 placement
async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-ndr12bqk.js:1819-1963 placement
/**
 * 名称清理为可用的文件名（非法字符替换、避免保留名）。
 */
function sanitizeImportName(name) {
  let sanitized =
    name
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/-{3,}/g, (dashes) => "_".repeat(dashes.length))
      .replace(/^-+/, "_") || "_";
  return isReservedDeviceName(sanitized) ? `_${sanitized}` : sanitized;
}
//@ chunk-ndr12bqk.js:1963-2014 placement
function collapseDashes(text) {
  return text.replace(/-{3,}/g, "\u2014");
}
//@ chunk-ndr12bqk.js:2014-2248 placement
function describeUnexpectedTableShape(
  table,
  label,
  scope,
  warnings,
  reason = "Has an unexpected shape (expected a table of named entries). Review it manually.",
) {
  if (table === undefined) return {};
  if (typeof table !== "object" || table === null || Array.isArray(table)) {
    warnings.push({
      scope,
      label,
      reason,
    });
    return {};
  }
  return table;
}
//@ chunk-ndr12bqk.js:2248-2330 placement
var CODEX_ARG_PLACEHOLDER_RE = /\$ARGUMENTS\[\d+\]|\$ARGUMENTS|\$\d+(?!\w)/g;
var NON_BANG_CHARS_RE = /[a-zA-RT-Z_).,;:'"?!>-]/;
//@ chunk-ndr12bqk.js:2330-2492 placement
/**
 * 文本中是否有前面不是允许字符的 “!”（变量引用除外）。
 */
function hasBareBang(body) {
  let replaced = body.replace(/\$[\p{L}\p{N}_.-]+/gu, (placeholder) => " ".repeat(placeholder.length));
  for (let i = 0; i < body.length; i++)
    if (body[i] === "!" && !NON_BANG_CHARS_RE.test(replaced[i - 1] ?? "")) return true;
  return false;
}
//@ chunk-ndr12bqk.js:2492-3602 placement
/**
 * 检查命令正文中会被 Claude Code 执行的 shell 标记（悬空的 !`、参数占位与 ! 混用等），返回问题描述。
 */
function findShellExecHazard(body, hasArgs) {
  let replaced = body.replace(/(?<=^|\s)!`[^`]*`/gm, "");
  if (/(?<=^|\s)!(?=`|\$)/m.test(replaced))
    return "Contains a dangling shell-exec marker that argument substitution could complete into a live command at invocation time. Port it manually.";
  if ([...body.matchAll(CODEX_ARG_PLACEHOLDER_RE)].length === 0) return null;
  let hasBare = replaced === body ? hasBareBang(body) : replaced.includes("!");
  if (replaced.includes("`") || hasBare)
    return "Mixes argument placeholders with backticks or '!' outside its shell blocks \u2014 argument substitution at invocation time could assemble a live shell-exec marker from them. Port it manually.";
  if (hasArgs.some((hasArg) => hasArg.includes("!")))
    return "One of its shell blocks contains '!' while the command also has argument placeholders \u2014 a backtick in the typed arguments could re-pair the marker into executing text the block never consented to. Port it manually.";
  if (hasArgs.some((hasArg) => [...hasArg.matchAll(CODEX_ARG_PLACEHOLDER_RE)].length > 0))
    return "One of its shell blocks contains an argument placeholder \u2014 Gemini shell-escapes `{{args}}` inside `!{\u2026}`, Claude Code's `$ARGUMENTS` substitution doesn't, so importing would let typed arguments inject shell commands. Port it manually.";
  return null;
}
//@ chunk-ndr12bqk.js:3602-3691 placement
function hasShellExecBlock(body) {
  return body.includes("```!") || (body.includes("!`") && /(?<=^|\s)!`[^`]+`/m.test(body));
}
//@ chunk-ndr12bqk.js:3691-3783 placement
function resolveWithinRoot(root, target) {
  let resolved = resolve(root, target);
  let rel = relative(root, resolved);
  if (rel === "" || isEscapingRelativePath(rel) || resolve(root, rel) !== resolved) return null;
  return resolved;
}
//@ chunk-ndr12bqk.js:3783-3954 placement
/**
 * 解析路径且真实路径仍在根目录内，否则 null。
 */
async function resolveInsideReal(root, target) {
  let withinRoot = resolveWithinRoot(root, target);
  if (withinRoot === null) return null;
  let realRoot;
  let realTarget;
  try {
    realRoot = await realpath(root);
    realTarget = await realpath(withinRoot);
  } catch {
    return null;
  }
  let rel = relative(realRoot, realTarget);
  if (rel === "" || isEscapingRelativePath(rel)) return null;
  return withinRoot;
}
//@ chunk-ndr12bqk.js:3954-4172 placement
/**
 * 解析路径并确认路径上各级都不是符号链接（不存在的部分允许），否则 null。
 */
async function pinPathInside(root, target) {
  let withinRoot = resolveWithinRoot(root, target);
  if (withinRoot === null) return null;
  let parts = relative(root, withinRoot).split(sep);
  let current = root;
  for (let part of parts) {
    current = join(current, part);
    let stats;
    try {
      stats = await lstat(current);
    } catch (error) {
      if (isENOENT(error)) return withinRoot;
      return null;
    }
    if (stats.isSymbolicLink()) return null;
  }
  return withinRoot;
}
//@ chunk-ndr12bqk.js:4172-4204 placement
var TENGU_EAGER_LIGHTHOUSE = "tengu_eager_lighthouse";
//@ chunk-ndr12bqk.js:4204-4242 placement
function isEagerLighthouseEnabled() {
  return readFlagWithOverride(TENGU_EAGER_LIGHTHOUSE, {
    safe: true,
  });
}
//@ chunk-ndr12bqk.js:4242-4826 placement
/**
 * 把路径钉在根目录内（拒绝 .. 与链接替换），返回可校验的打开句柄信息。
 */
async function pinInside(root, relPath, action, createParents = false) {
  let rel = relative(root, relPath);
  if (rel === "" || isEscapingRelativePath(rel))
    throw Error("pinInside: path is not strictly inside its root");
  let fsImplementation = getFsImplementation();
  let rootInfo = safeResolvePath(fsImplementation, root);
  let canonicalRoot = rootInfo.isCanonical ? rootInfo.resolvedPath : root;
  let ioPath = identity(join(canonicalRoot, rel));
  let allowedPaths = [ioPath];
  let platform = getPlatform();
  if (platform === "macos" || platform === "windows") {
    let targetInfo = safeResolvePath(fsImplementation, ioPath);
    if (
      targetInfo.isCanonical &&
      targetInfo.resolvedPath !== ioPath &&
      targetInfo.resolvedPath.startsWith(canonicalRoot + sep) &&
      normalizeCaseForComparison(targetInfo.resolvedPath.slice(canonicalRoot.length).normalize("NFC")) ===
        normalizeCaseForComparison(ioPath.slice(canonicalRoot.length).normalize("NFC")) &&
      (await pinPathInside(canonicalRoot, ioPath)) !== null
    )
      allowedPaths.push(targetInfo.resolvedPath);
  }
  try {
    return await pinWriteTarget(ioPath, allowedPaths, {
      createParents,
    });
  } catch (error) {
    if (error instanceof SymlinkWriteRefusedError) throw assertStillPinned(action, relPath);
    return rethrowWithPath(
      error,
      {
        ioPath,
        canonicalPath: ioPath,
      },
      relPath,
    );
  }
}
//@ chunk-ndr12bqk.js:4826-5232 placement
function assertStillPinned(action, path) {
  let message = `Refusing to ${action} ${path}: the import could not confirm it is still the place it checked. It, or a folder on the way to it, may have been replaced (for example by a symbolic link), or a folder's name on disk may differ from this path in letter case. Make sure each folder on that path is a real folder spelled as shown, then run the import again.`;
  return action === "read" ? new SymlinkReadRefusedError(message) : new SymlinkWriteRefusedError(message);
}
//@ chunk-ndr12bqk.js:5232-5341 placement
/**
 * 写入前复查路径未被替换为链接。
 */
async function recheckPinned(pinned, action, path) {
  try {
    await pinned.recheckBeforeWrite();
  } catch (error) {
    if (error instanceof SymlinkWriteRefusedError) throw assertStillPinned(action, path);
    throw error;
  }
}
//@ chunk-ndr12bqk.js:5341-5798 placement
async function openPinnedForRead(root, path) {
  let pinned = await pinInside(root, path, "read");
  let handle;
  try {
    await recheckPinned(pinned, "read", path);
    let platform = getPlatform();
    if (platform === "windows") {
      if ((await lstat(pinned.ioPath)).isSymbolicLink()) throw assertStillPinned("read", path);
      handle = await open(pinned.ioPath, "r");
    } else
      handle = await openNoFollow(
        pinned.ioPath,
        constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK | (constants.O_NOCTTY ?? 0),
        platform,
      );
    await recheckPinned(pinned, "read", path);
    return handle;
  } catch (error) {
    await handle?.close();
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP" || errnoCode === "EMLINK" || errnoCode === "EFTYPE" || errnoCode === "ENOTDIR")
      throw assertStillPinned("read", path);
    return rethrowWithPath(error, pinned, path);
  } finally {
    await pinned.close();
  }
}
//@ chunk-ndr12bqk.js:5798-6191 placement
/**
 * 读取导入源文件（必须是普通文件，限制 IMPORT_MAX_FILE_BYTES）。
 */
async function readImportFile(root, path) {
  let pinnedForRead = await openPinnedForRead(root, path);
  try {
    let stats = await pinnedForRead.stat();
    if (!stats.isFile())
      throw new SymlinkReadRefusedError(`Refusing to read ${path}: it is not a regular file.`);
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
//@ chunk-ndr12bqk.js:6191-6250 placement
function readImportFileChecked(scope, projectRoot, path) {
  return scope === "project" && isEagerLighthouseEnabled()
    ? readImportFile(projectRoot, path)
    : readCappedImportFile(path);
}
//@ chunk-ndr12bqk.js:6250-6831 placement
async function openPinnedForReadViaFd(root, path) {
  let pinned = await pinInside(root, path, "read");
  let dirHandle;
  let ioPath = pinned.ioPath;
  try {
    await recheckPinned(pinned, "read", path);
    let platform = getPlatform();
    if (platform === "windows") {
      if (!(await lstat(pinned.ioPath)).isDirectory()) throw assertStillPinned("read", path);
    } else {
      dirHandle = await openNoFollow(
        pinned.ioPath,
        constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
        platform,
      );
      if (pinned.ioPath.startsWith("/proc/self/fd/")) ioPath = `/proc/self/fd/${dirHandle.fd}`;
    }
    let entries = await readdir(ioPath, {
      withFileTypes: true,
    });
    await recheckPinned(pinned, "read", path);
    return entries;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP" || errnoCode === "ENOTDIR" || errnoCode === "EMLINK" || errnoCode === "EFTYPE")
      throw assertStillPinned("read", path);
    return rethrowWithPath(
      error,
      {
        ioPath,
        canonicalPath: pinned.canonicalPath,
      },
      path,
    );
  } finally {
    try {
      await dirHandle?.close();
    } finally {
      await pinned.close();
    }
  }
}
//@ chunk-ndr12bqk.js:6831-7224 placement
async function openPinnedForWrite(root, path) {
  let pinned = await pinInside(root, path, "write", true);
  try {
    await recheckPinned(pinned, "write", path);
    let platform = getPlatform();
    let handle;
    try {
      handle =
        platform === "windows"
          ? await open(pinned.ioPath, "wx")
          : await openNoFollow(
              pinned.ioPath,
              constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
              platform,
            );
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "EEXIST") return null;
      if (errnoCode === "ELOOP") throw assertStillPinned("write", path);
      return rethrowWithPath(error, pinned, path);
    }
    try {
      await recheckPinned(pinned, "write", path);
    } catch (error) {
      await handle.close();
      throw error;
    }
    return handle;
  } finally {
    await pinned.close();
  }
}
//@ chunk-ndr12bqk.js:7366-7575 placement
async function createExclusive(root, path) {
  let pinned = await pinInside(root, path, "write", true);
  try {
    await recheckPinned(pinned, "write", path);
    await mkdir(pinned.ioPath);
    await recheckPinned(pinned, "write", path);
    return true;
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST") return false;
    return rethrowWithPath(error, pinned, path);
  } finally {
    await pinned.close();
  }
}
//@ chunk-ndr12bqk.js:7575-7720 placement
/**
 * 拷贝时目标被他人创建的错误。
 */
function copyRaceError(path) {
  return new SymlinkWriteRefusedError(
    `Refusing to copy into ${path}: something else created a file or folder with that name while the import was copying.`,
  );
}
//@ chunk-ndr12bqk.js:7720-8491 placement
/**
 * 安全拷贝文件（源不再是普通文件或写入无进展时停止）。
 */
async function copyFileSafely(relPath, srcDir, destDir, entries, stats) {
  for (let entry of entries) {
    let fromPath = join(srcDir, entry.name);
    let toPath = join(destDir, entry.name);
    if (entry.isDirectory()) {
      let entries = await openPinnedForReadViaFd(relPath, fromPath);
      if (!(await createExclusive(relPath, toPath))) throw copyRaceError(toPath);
      await copyFileSafely(relPath, fromPath, toPath, entries, stats);
    } else if (entry.isFile()) {
      let pinnedForRead = await openPinnedForRead(relPath, fromPath);
      try {
        let stats_2 = await pinnedForRead.stat();
        if (!stats_2.isFile())
          throw new SymlinkReadRefusedError(`Refusing to copy ${fromPath}: it is no longer a regular file.`);
        let pinnedForWrite = await openPinnedForWrite(relPath, toPath);
        if (pinnedForWrite === null) throw copyRaceError(toPath);
        try {
          let buffer = Buffer.allocUnsafe(65536);
          for (;;) {
            let { bytesRead } = await pinnedForRead.read(buffer, 0, buffer.length, null);
            if (bytesRead === 0) break;
            for (let written = 0; written < bytesRead;) {
              let { bytesWritten } = await pinnedForWrite.write(buffer, written, bytesRead - written);
              if (bytesWritten === 0) throw Error("a write made no progress; copy stopped");
              written += bytesWritten;
            }
          }
          try {
            await pinnedForWrite.chmod(stats_2.mode & 511);
          } catch (error) {
            if (!isUnsupportedFlagError(error)) throw error;
          }
          if ((stats_2.mode & 3584) !== 0) stats.specialBitsDropped++;
        } finally {
          await pinnedForWrite.close();
        }
      } finally {
        await pinnedForRead.close();
      }
    } else stats.notCopied++;
  }
}
//@ chunk-ndr12bqk.js:8491-8593 placement (2.1.88 match: detectTerminal, 0.86)
function detectTerminal(path, platform = "linux") {
  let normalized = identity(path);
  return platform === "darwin" || platform === "win32" ? normalized.toUpperCase().toLowerCase() : normalized;
}
//@ chunk-ndr12bqk.js:8593-8894 placement (2.1.88 match: getReservedShortcuts, 1)
async function isOutsideDirectory(claudeConfigDir, otherPath) {
  if (!otherPath) return false;
  let configReal = await isUnderSymlink(resolve(claudeConfigDir));
  if (configReal === null) return true;
  let otherReal = await isUnderSymlink(resolve(otherPath));
  if (otherReal === null) return true;
  let canonicalize;
  switch (getPlatform()) {
    case "windows":
      canonicalize = expandWin32ExistingLongNamesStrict;
      break;
    case "macos":
      canonicalize = isSystemVolumePath;
      break;
    default:
      canonicalize = (path) => path;
  }
  let otherCanonical = canonicalize(otherReal);
  let configCanonical = canonicalize(configReal);
  if (otherCanonical === null || configCanonical === null) return true;
  let rel = relative(detectTerminal(otherCanonical), detectTerminal(configCanonical));
  return rel === "" || !isEscapingRelativePath(rel);
}
//@ chunk-ndr12bqk.js:8894-8987 placement (2.1.88 match: findValidClaudeAlias, 0.751)
function isHomeDirMismatch() {
  let homeDir;
  try {
    homeDir = userInfo().homedir;
  } catch {
    return true;
  }
  if (!homeDir) return true;
  return resolve(homedir()) !== resolve(homeDir);
}
//@ chunk-ndr12bqk.js:8987-9015 placement
function toFsSafeName(claudeConfigDir) {
  return isUncOrDevicePath(claudeConfigDir);
}
//@ chunk-ndr12bqk.js:9015-9391 placement
async function isUnderSymlink(path) {
  let root = parse(path).root;
  let root_2 = root;
  let parts = relative(root, path).split(sep);
  let depth = 0;
  while (parts.length > 0) {
    let part = parts.shift();
    let current = join(root_2, part);
    let stats;
    try {
      stats = await lstat(current);
    } catch (error) {
      if (isENOENT(error)) return join(current, ...parts);
      return null;
    }
    if (stats.isSymbolicLink()) {
      if (++depth > 40) return null;
      let linkTarget;
      try {
        linkTarget = await readlink(current);
      } catch {
        return null;
      }
      if (toFsSafeName(linkTarget)) return null;
      let resolvedLink = isAbsolute(linkTarget) ? linkTarget : join(dirname(current), linkTarget);
      let nextPath = resolve(resolvedLink, ...parts);
      root_2 = parse(nextPath).root;
      parts = relative(root_2, nextPath).split(sep);
      continue;
    }
    root_2 = current;
  }
  return root_2;
}
//@ chunk-ndr12bqk.js:9391-10551 placement
/**
 * 把导入的指令追加到 CLAUDE.md（带 imported-from 标记，已导入则跳过；项目作用域拒绝符号链接）。
 */
async function appendImportedInstructions(targetPath, sourcePath, sourceText, id, dryRun, containRoot) {
  if (containRoot) {
    if ((await pinPathInside(containRoot, targetPath)) === null)
      return {
        skipped: `${basename(targetPath)}: target is (or is under) a symlink \u2014 refusing project-scope write`,
      };
    if ((await pinPathInside(containRoot, sourcePath)) === null)
      return {
        skipped: `${basename(targetPath)}: source is (or is under) a symlink \u2014 refusing project-scope read`,
      };
  }
  let marker = `<!-- imported-from: ${id} -->`;
  let containRoot_2 = containRoot && isEagerLighthouseEnabled() ? containRoot : undefined;
  let existingText = "";
  try {
    existingText =
      containRoot_2 === undefined
        ? await readCappedImportFile(targetPath)
        : await readImportFile(containRoot_2, targetPath);
    if (existingText.includes(marker))
      return {
        skipped: `${basename(targetPath)}: already imported (marker present; not re-synced)`,
      };
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  if (dryRun) return `would append ${basename(sourcePath)} \u2192 \`${targetPath}\``;
  let bodyText =
    sourceText ??
    (containRoot_2 === undefined
      ? await readCappedImportFile(sourcePath)
      : await readImportFile(containRoot_2, sourcePath));
  let nextText = `${
    existingText
      ? `${existingText}${
          existingText.endsWith(`
`)
            ? ""
            : `
`
        }
`
      : ""
  }${marker}
${bodyText.trimEnd()}
`;
  if (containRoot_2 === undefined) {
    await mkdir(dirname(targetPath), {
      recursive: true,
    });
    await readJsonFile_2(targetPath, nextText, {
      encoding: "utf8",
      allowSymlink: true,
    });
  } else {
    let pinned = await pinInside(containRoot_2, targetPath, "write", true);
    try {
      await recheckPinned(pinned, "write", targetPath);
      await readJsonFile_2(pinned.ioPath, nextText, {
        encoding: "utf8",
      });
    } catch (error) {
      return rethrowWithPath(error, pinned, targetPath);
    } finally {
      await pinned.close();
    }
  }
  let importsNote =
    dirname(sourcePath) !== dirname(targetPath) && /(?:^|\s)@(?![/~@])(?:[^\s\\]|\\ )+/.test(bodyText)
      ? " \u2014 note: relative @imports in this file now resolve against the new location; convert them to absolute paths if they stop working"
      : "";
  return `appended ${basename(sourcePath)} \u2192 \`${targetPath}\`${importsNote}`;
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
