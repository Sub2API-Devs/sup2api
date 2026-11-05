/**
 * utils/file.ts
 *
 * 文件通用工具：mtime、编码/行尾检测、显示路径、加行号、Did you mean 建议、原子写
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/file.ts
 * pieces: chunk-0fny85bv.js (1), chunk-0fzr619q.js (29), chunk-9knfmvrf.js (1), chunk-e5z7dpjd.js (1)
 * attribution: fingerprint 12, placement 11, callgraph-fingerprint 1, layout 7, file-local 1
 */
import { relative, sep, resolve, dirname, basename, extname, join, isAbsolute, normalize, parse } from "path";
import { homedir } from "os";
import { realpath, stat, readlink, open, lstat } from "fs/promises";
import {
  constants,
  closeSync,
  openSync,
  writeFileSync,
  fchmodSync,
  fsyncSync,
  fstatSync,
  ftruncateSync,
} from "fs";
import { randomBytes } from "crypto";
import { getFsImplementation, safeResolvePath } from "./fsOperations.js";
import { BOM_SNIFF_BYTES, detectEncodingFromBom } from "./fileRead.js";
import { createKeyedQueue } from "./promiseQueue.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isFsInaccessible,
  isEISDIR,
  isEnvFsErrno,
  getErrnoCode,
  isENOENT,
  errorMessage,
} from "./errors.js";
import { logForDebugging } from "./debug.js";
import { logError } from "./log.js";
import { getCwdOrNullSafe, getEffectiveCwd, applyCloudCwd, hasOutermostCallFrame, getCwd } from "./cwd.js";
import { expandPathOrNull } from "./path.js";
import { isDisklessProcess, getCloudCwd } from "../bootstrap/state.js";
import { getPlatform } from "./platform.js";
import {
  SymlinkWriteRefusedError,
  stagingPathFor,
  verifyStagingDir,
  openWriteFlags,
  HardLinkWriteRefusedError,
  pathExists,
  BOUNDED_READ_MAX,
} from "./fsSafety/atomicWriteStaging.js";
import {
  isUnsupportedFlagError,
  retryFsOpSync,
  unmarkMountPoint,
  fallBackToCopySync,
  NO_SPACE_CODES,
  assertPathSafeSync,
  targetReplacedAfterInPlaceWriteFailedSync,
  retryTransient,
  writeNewFile,
  retryFsOp,
  fallBackToCopyAsync,
  assertPathSafeAsync,
  targetReplacedAfterInPlaceWriteFailed,
} from "./atomicPublishWrite.js";
import { ATOMIC_WRITE_ERRNOS, isInPlaceWriteDefault } from "./plugins/safeCopy.js";
import { env } from "./env.js";
import { embeddedSearchToolsBinaryPath } from "./embeddedTools.js";
import { platformNoFollowFlags } from "./platformTargets.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-0fny85bv.js:2165-2263 fingerprint (2.1.88 match: detectLineEndings, 0.78)
/**
 * 读文件开头若干字节检测编码（utf8/utf16le 等）。
 */
function detectLineEndings(fd) {
  let { buffer, bytesRead } = getFsImplementation().readSync(fd, {
    length: BOM_SNIFF_BYTES,
  });
  return detectEncodingFromBom(buffer.subarray(0, bytesRead));
}
//@ chunk-0fzr619q.js:6242-6310 fingerprint (2.1.88 match: getFileModificationTime, 1)
/**
 * 同步取文件 mtime（毫秒取整）。
 */
function getFileModificationTime(filePath) {
  let fs = getFsImplementation();
  return Math.floor(fs.statSync(filePath).mtimeMs);
}
//@ chunk-0fzr619q.js:6310-6385 fingerprint (2.1.88 match: getFileModificationTimeAsync, 1)
/**
 * 异步取文件 mtime（毫秒取整），Read 去重与 Edit/Write 修改检测用。
 */
async function getFileModificationTimeAsync(filePath) {
  let stats = await getFsImplementation().stat(filePath);
  return Math.floor(stats.mtimeMs);
}
//@ chunk-0fzr619q.js:6676-6688 placement
var fileWriteContextStorage; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0fzr619q.js:6676", () => {
  fileWriteContextStorage = createKeyedQueue();
});
//@ chunk-0fzr619q.js:6688-6724 placement
function runWithFileWriteContext(context, fn) {
  return fileWriteContextStorage.run(context, fn);
}
//@ chunk-0fzr619q.js:6724-6819 placement (2.1.88 match: detectLineEndingsForString, 1)
/**
 * 行尾为 CRLF 时把内容统一转换为 CRLF。
 */
function detectLineEndingsForString(text, lineEndings) {
  if (lineEndings !== "CRLF") return text;
  return text.replaceAll(
    `\r
`,
    `
`,
  ).split(`
`).join(`\r
`);
}
//@ chunk-0fzr619q.js:6819-7209 placement
/**
 * 写文本文件并核对：写入后比较磁盘大小与预期字节数，不一致抛 "Write verification failed"（网络盘/云同步截断），返回 mtime。
 */
async function writeTextContentVerified(ioPath, content, encoding, lineEndings) {
  let lineEndingsForString = detectLineEndingsForString(content, lineEndings);
  await readJsonFile_2(ioPath, lineEndingsForString, {
    encoding,
  });
  let expectedBytes = Buffer.byteLength(lineEndingsForString, encoding);
  let stats = await getFsImplementation().stat(ioPath);
  if (stats.size !== expectedBytes)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Write verification failed: ${ioPath} is ${stats.size} bytes on disk, expected ${expectedBytes}. The filesystem may have silently truncated the write (network drive / cloud sync).`,
      "writeTextContent: on-disk size mismatch after write",
    );
  return Math.floor(stats.mtimeMs);
}
//@ chunk-0fzr619q.js:7209-7411 fingerprint (2.1.88 match: detectFileEncoding, 1)
/**
 * 检测文件编码（读开头字节）；预期内的错误只记 debug，返回默认 utf8。
 */
function detectFileEncoding(filePath) {
  try {
    let fs = getFsImplementation();
    let { resolvedPath } = safeResolvePath(fs, filePath);
    return detectLineEndings(resolvedPath);
  } catch (error) {
    if (isFsInaccessible(error) || isEISDIR(error) || isEnvFsErrno(error))
      logForDebugging(`detectFileEncoding failed for expected reason: ${getErrnoCode(error)}`, {
        level: "debug",
      });
    else logError(error);
    return "utf8";
  }
}
//@ chunk-0fzr619q.js:7411-7511 callgraph-fingerprint (2.1.88 match: convertLeadingTabsToSpaces, 1)
/**
 * 把每行行首制表符替换为两个空格。
 */
function convertLeadingTabsToSpaces(content) {
  if (!content.includes("\t")) return content;
  return content.replace(/^\t+/gm, (tabRun) => "  ".repeat(tabRun.length));
}
//@ chunk-0fzr619q.js:7511-7650 fingerprint (2.1.88 match: getAbsoluteAndRelativePaths, 1)
function getAbsoluteAndRelativePaths(path) {
  let cwd = path ? (getCwdOrNullSafe() ?? undefined) : undefined;
  let absolutePath = path ? (expandPathOrNull(path, cwd) ?? undefined) : undefined;
  let relativePath = absolutePath && cwd !== undefined ? relative(cwd, absolutePath) : undefined;
  return {
    absolutePath,
    relativePath,
  };
}
//@ chunk-0fzr619q.js:7650-7697 layout
/**
 * 路径含 NUL 时显示的占位文本。
 */
var HIDDEN_PATH_PLACEHOLDER = "Path hidden (unsupported characters)";
//@ chunk-0fzr619q.js:7697-7892 fingerprint (2.1.88 match: getDisplayPath, 1)
/**
 * 显示用路径：cwd 内显示相对路径，家目录下显示 ~/…，含 NUL 显示占位。
 */
function getDisplayPath(filePath) {
  if (filePath.includes("\x00")) return HIDDEN_PATH_PLACEHOLDER;
  let { relativePath } = getAbsoluteAndRelativePaths(filePath);
  if (relativePath && !relativePath.startsWith("..")) return relativePath;
  if (isDisklessProcess()) return filePath;
  let homeDir = homedir();
  if (filePath.startsWith(homeDir + sep)) return "~" + filePath.slice(homeDir.length);
  return filePath;
}
//@ chunk-0fzr619q.js:7892-7996 layout
/**
 * 把路径转为相对当前（或指定）工作目录的相对路径。
 */
function toCloudRelativePath(filePath, notebookData) {
  let baseCwd = notebookData === undefined ? getEffectiveCwd() : applyCloudCwd(notebookData);
  let shouldResolve = (notebookData !== undefined || !hasOutermostCallFrame()) && baseCwd === getCloudCwd();
  return relative(baseCwd, shouldResolve ? resolve(baseCwd, filePath) : filePath);
}
//@ chunk-0fzr619q.js:7996-8037 layout
var SHORT_EXTENSION_RE = /^(\.[\p{L}\p{N}_+~#-]{1,32})?$/u;
//@ chunk-0fzr619q.js:8037-8325 layout
/**
 * 在同目录下找同名不同扩展名的文件（扩展名 1–32 位），用于"文件不存在"时的 Did you mean。
 */
async function findSimilarFile(filePath) {
  let fsImplementation = getFsImplementation();
  try {
    let dir = dirname(filePath);
    let fileBaseName = basename(filePath, extname(filePath));
    let match = (await fsImplementation.readdir(dir)).filter(
      (file) =>
        SHORT_EXTENSION_RE.test(extname(file.name).normalize("NFC")) &&
        basename(file.name, extname(file.name)) === fileBaseName &&
        join(dir, file.name) !== filePath,
    )[0];
    if (match) return match.name;
    return;
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`findSimilarFile failed for ${filePath}: ${error}`, {
        level: "error",
      });
    return;
  }
}
//@ chunk-0fzr619q.js:8325-8374 fingerprint (2.1.88 match: FILE_NOT_FOUND_CWD_NOTE, 1)
/**
 * "Note: your current working directory is" 提示前缀。
 */
var FILE_NOT_FOUND_CWD_NOTE = "Note: your current working directory is";
//@ chunk-0fzr619q.js:8374-8656 file-local
/**
 * 路径落在 cwd 的父目录下但不在 cwd 内时，尝试把它映射到 cwd 下同名相对路径（存在才返回），用于 Did you mean。
 */
async function normalizePathForComparison(requestedPath) {
  let cwd = getCwd();
  let cwdParent = dirname(cwd);
  let normalizedPath = requestedPath;
  try {
    let resolvedDir = await realpath(dirname(requestedPath));
    normalizedPath = join(resolvedDir, basename(requestedPath));
  } catch {}
  let parentPrefix = cwdParent === sep ? sep : cwdParent + sep;
  let caseFold = getPlatform() === "windows" ? (path) => path.toLowerCase() : (path) => path;
  let foldedPath = caseFold(normalizedPath);
  if (
    !foldedPath.startsWith(caseFold(parentPrefix)) ||
    foldedPath.startsWith(caseFold(cwd + sep)) ||
    foldedPath === caseFold(cwd)
  )
    return;
  let relFromParent = relative(cwdParent, normalizedPath);
  let correctedPath = join(cwd, relFromParent);
  try {
    await stat(correctedPath);
    return correctedPath;
  } catch {
    return;
  }
}
//@ chunk-0fzr619q.js:8656-8936 fingerprint (2.1.88 match: addLineNumbers, 0.487)
/**
 * 给内容加行号（cat -n 风格）；tabAwareSeparator 且内容含行首制表符时分隔符用冒号。
 */
function addLineNumbers({ content, startLine, tabAwareSeparator = false }) {
  if (!content) return "";
  let windowLines =
    tabAwareSeparator &&
    (content.startsWith("\t") ||
      content.includes(`
	`))
      ? ":"
      : "\t";
  let numberedLines = [];
  let lineNumber = startLine;
  let shownCount = 0;
  let index = content.indexOf(`
`);
  while (index !== -1) {
    numberedLines.push(formatNumberedLine(content.slice(shownCount, index), lineNumber++, windowLines));
    shownCount = index + 1;
    index = content.indexOf(
      `
`,
      shownCount,
    );
  }
  numberedLines.push(formatNumberedLine(content.slice(shownCount), lineNumber, windowLines));
  return numberedLines.join(`
`);
}
//@ chunk-0fzr619q.js:8936-9016 placement
/**
 * 单行格式化：行号 + 分隔符 + 去掉行尾 \r 的内容。
 */
function formatNumberedLine(line, lineNumber, width) {
  let text = line.endsWith("\r") ? line.slice(0, -1) : line;
  return `${lineNumber}${width}${text}`;
}
//@ chunk-0fzr619q.js:9016-9082 placement
/**
 * 去掉 Read 输出的行号前缀（tab、冒号或旧式箭头）。
 */
function stripLineNumberPrefix(line) {
  return line.match(/^\s*\d+[\u2192\t:](.*)$/)?.[1] ?? line;
}
//@ chunk-0fzr619q.js:9082-9322 placement
function rethrowWithAtomicWriteCause(error, error_2) {
  if (error instanceof Error && !(error instanceof SymlinkWriteRefusedError) && error !== error_2)
    try {
      if (error.cause === undefined) {
        error.message += ` (atomic write failed first: ${errorMessage(error_2)})`;
        Object.defineProperty(error, "cause", {
          value: error_2,
          writable: true,
          configurable: true,
          enumerable: false,
        });
      }
    } catch {}
  throw error;
}
//@ chunk-0fzr619q.js:9322-9372 placement
function preserveFileModeBits(mode) {
  return mode === undefined ? undefined : (mode & 511) | 128;
}
//@ chunk-0fzr619q.js:9424-12638 fingerprint (2.1.88 match: writeFileSyncAndFlush_DEPRECATED, 0.534)
function writeFileSyncAndFlush_DEPRECATED(filePath, content, options, followLink) {
  let fs = getFsImplementation();
  let O_NOFOLLOW = options.allowSymlink ? 0 : constants.O_NOFOLLOW;
  let targetPath = filePath;
  let mode;
  let targetExisted = false;
  if (options.allowSymlink)
    try {
      let linkTarget = fs.readlinkSync(filePath);
      targetPath = isAbsolute(linkTarget)
        ? linkTarget
        : resolve(safeResolvePath(fs, dirname(filePath)).resolvedPath, linkTarget);
      logForDebugging(`Writing through symlink: ${filePath} -> ${targetPath}`);
    } catch {}
  else {
    if (options.checkParentDir)
      try {
        closeSync(
          openSync(dirname(filePath), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW),
        );
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ELOOP" || errnoCode === "ENOTDIR")
          throw new SymlinkWriteRefusedError(
            `Refusing to write into symlinked directory: ${dirname(filePath)}`,
          );
      }
    try {
      let linkStats = fs.lstatSync(filePath);
      if (linkStats.isSymbolicLink())
        throw new SymlinkWriteRefusedError(
          `Refusing to write through symlink: ${filePath}. Resolve the symlink and pass the real target path explicitly.`,
        );
      mode = linkStats.mode;
      targetExisted = true;
    } catch (error) {
      if (!isENOENT(error)) throw error;
    }
  }
  let tempPath = `.tmp.${process.pid}.${randomBytes(6).toString("hex")}`;
  let stagingPath = stagingPathFor(options.stagingDir, targetPath, tempPath, options.allowSymlink ?? false);
  let tempWritten = false;
  let renamed = false;
  if (options.allowSymlink && !targetExisted)
    try {
      mode = fs.statSync(targetPath).mode;
      targetExisted = true;
    } catch (error) {
      if (!isENOENT(error)) throw error;
    }
  if (targetExisted && mode !== undefined)
    logForDebugging(`Preserving file permissions: ${mode.toString(8)}`);
  else if (options.mode !== undefined) {
    mode = options.mode;
    logForDebugging(`Setting permissions for new file: ${mode.toString(8)}`);
  }
  try {
    logForDebugging(`Writing to temp file: ${stagingPath}`);
    let handle = openSync(
      stagingPath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | O_NOFOLLOW,
      targetExisted ? preserveFileModeBits(mode) : options.mode,
    );
    let writeFailed = false;
    let writeError;
    try {
      if (dirname(stagingPath) !== dirname(targetPath)) verifyStagingDir(options.stagingDir);
      writeFileSync(handle, content, {
        encoding: options.encoding,
      });
      if (targetExisted && mode !== undefined)
        try {
          fchmodSync(handle, mode);
          logForDebugging("Applied original permissions to temp file");
        } catch (error) {
          if (!isUnsupportedFlagError(error)) throw error;
          logForDebugging(`fchmod unsupported on this filesystem: ${error}`);
        }
      try {
        fsyncSync(handle);
      } catch (error) {
        if (!isUnsupportedFlagError(error)) throw error;
        logForDebugging(`fsync unsupported on this filesystem: ${error}`);
      }
      tempWritten = true;
    } catch (error) {
      writeFailed = true;
      writeError = error;
    }
    try {
      closeSync(handle);
    } catch (error) {
      if (!writeFailed) throw error;
      logForDebugging(`closeSync also failed after temp write error: ${error}`, {
        level: "error",
      });
    }
    if (writeFailed) throw writeError;
    logForDebugging(`Temp file written successfully, size: ${content.length} bytes`);
    if (dirname(stagingPath) !== dirname(targetPath)) verifyStagingDir(options.stagingDir);
    logForDebugging(`Renaming ${stagingPath} to ${targetPath}`);
    renamed = true;
    retryFsOpSync(stagingPath, targetPath, (fromPath, toPath) => fs.renameSync(fromPath, toPath));
    unmarkMountPoint(targetPath);
    logForDebugging(`File ${targetPath} written atomically`);
  } catch (error) {
    logForDebugging(`Failed to write file atomically: ${error}`, {
      level: "error",
    });
    if (renamed && fallBackToCopySync(error, stagingPath, targetPath, followLink)) {
      logForDebugging(`EBUSY in an NFS folder: saving ${targetPath} once more`);
      writeFileSyncAndFlush_DEPRECATED(filePath, content, options, true);
      return;
    }
    let errnoCode = getErrnoCode(error);
    if (
      (tempWritten &&
        errnoCode !== undefined &&
        (ATOMIC_WRITE_ERRNOS.has(errnoCode) || (followLink && renamed && !NO_SPACE_CODES.has(errnoCode)))) ||
      (!tempWritten && targetExisted && errnoCode === "EACCES")
    ) {
      let { flags, flagsIfMissing } = openWriteFlags(O_NOFOLLOW);
      let mode = !targetExisted && options.mode !== undefined ? options.mode : undefined;
      let inPlaceHandle;
      try {
        try {
          inPlaceHandle = openSync(targetPath, flags, mode);
        } catch (error) {
          if (flagsIfMissing === undefined || !isENOENT(error)) throw error;
          assertPathSafeSync(targetPath);
          inPlaceHandle = openSync(targetPath, flagsIfMissing, mode);
        }
      } catch (error_2) {
        try {
          fs.unlinkSync(stagingPath);
        } catch (error) {
          logForDebugging(`Failed to clean up temp file: ${error}`);
        }
        if (getErrnoCode(error_2) === "ELOOP")
          throw new SymlinkWriteRefusedError(`Refusing to write through symlink: ${targetPath} (O_NOFOLLOW)`);
        throw error;
      }
      let stats;
      try {
        stats = fstatSync(inPlaceHandle, {
          bigint: true,
        });
        if (stats.nlink > 1n && (options.refuseHardLinkedInPlace ?? isInPlaceWriteDefault()))
          throw new HardLinkWriteRefusedError(targetPath, Number(stats.nlink));
        if (stats.isFile()) ftruncateSync(inPlaceHandle, 0);
      } catch (error_2) {
        try {
          closeSync(inPlaceHandle);
        } catch {}
        try {
          fs.unlinkSync(stagingPath);
        } catch (error) {
          logForDebugging(`Failed to clean up temp file: ${error}`);
        }
        rethrowWithAtomicWriteCause(error_2, error);
      }
      try {
        writeFileSync(inPlaceHandle, content, {
          encoding: options.encoding,
        });
        try {
          fsyncSync(inPlaceHandle);
        } catch (error) {
          if (!isUnsupportedFlagError(error)) throw error;
          logForDebugging(`fsync unsupported on this filesystem: ${error}`);
        }
        closeSync(inPlaceHandle);
        try {
          fs.unlinkSync(stagingPath);
        } catch (atomicError) {
          logForDebugging(`Failed to clean up temp file: ${atomicError}`);
        }
        logForDebugging(`File ${targetPath} written via in-place fallback`);
        return;
      } catch (cleanupError) {
        let outcome = targetReplacedAfterInPlaceWriteFailedSync(
          targetPath,
          stats,
          Buffer.from(content, options.encoding),
          cleanupError,
        );
        try {
          closeSync(inPlaceHandle);
        } catch {}
        if (!outcome)
          try {
            fs.unlinkSync(targetPath);
          } catch {}
        if (tempWritten)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Write to ${targetPath} failed (${getErrnoCode(cleanupError) ?? cleanupError}) ${outcome ? "and another writer has replaced the file, which was left as it is" : "after the target was truncated"}. The new content was preserved at ${stagingPath}.`,
            "writeFileSyncAndFlush: in-place fallback write failed; content preserved at temp path",
          );
        rethrowWithAtomicWriteCause(cleanupError, error);
      }
    }
    try {
      fs.unlinkSync(stagingPath);
    } catch (fallbackError) {
      logForDebugging(`Failed to clean up temp file: ${fallbackError}`);
    }
    throw error;
  }
}
//@ chunk-0fzr619q.js:12638-12696 layout (2.1.88 match: readJsonFile, 1)
function readJsonFile_2(
  filePath,
  content,
  options = {
    encoding: "utf-8",
  },
) {
  return writeFileAsyncFlush(filePath, content, options, false);
}
//@ chunk-0fzr619q.js:12696-16377 layout
async function writeFileAsyncFlush(filePath, content, options, followLink) {
  let fsImplementation = getFsImplementation();
  let O_NOFOLLOW = options.allowSymlink ? 0 : constants.O_NOFOLLOW;
  let targetPath = filePath;
  let mode;
  let targetExisted = false;
  if (options.allowSymlink)
    try {
      let linkTarget = await readlink(filePath);
      targetPath = isAbsolute(linkTarget)
        ? linkTarget
        : resolve(await realpath(dirname(filePath)), linkTarget);
      logForDebugging(`Writing through symlink: ${filePath} -> ${targetPath}`);
    } catch {}
  else {
    if (options.checkParentDir)
      try {
        await (
          await open(dirname(filePath), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW)
        ).close();
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ELOOP" || errnoCode === "ENOTDIR")
          throw new SymlinkWriteRefusedError(
            `Refusing to write into symlinked directory: ${dirname(filePath)}`,
          );
      }
    try {
      let linkStats = await lstat(filePath);
      if (linkStats.isSymbolicLink())
        throw new SymlinkWriteRefusedError(
          `Refusing to write through symlink: ${filePath}. Resolve the symlink and pass the real target path explicitly.`,
        );
      mode = linkStats.mode;
      targetExisted = true;
    } catch (error) {
      if (!isENOENT(error)) throw error;
    }
  }
  let suffix = `.tmp.${process.pid}.${randomBytes(6).toString("hex")}`;
  let tempPath = stagingPathFor(options.stagingDir, targetPath, suffix, options.allowSymlink ?? false);
  let tempWritten = false;
  let renamed = false;
  if (options.allowSymlink && !targetExisted)
    try {
      mode = (await fsImplementation.stat(targetPath)).mode;
      targetExisted = true;
    } catch (error) {
      if (!isENOENT(error)) throw error;
    }
  if (targetExisted && mode !== undefined)
    logForDebugging(`Preserving file permissions: ${mode.toString(8)}`);
  else if (options.mode !== undefined) {
    mode = options.mode;
    logForDebugging(`Setting permissions for new file: ${mode.toString(8)}`);
  }
  try {
    logForDebugging(`Writing to temp file: ${tempPath}`);
    let handle = await open(
      tempPath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | O_NOFOLLOW,
      targetExisted ? preserveFileModeBits(mode) : options.mode,
    );
    let writeFailed = false;
    let writeError;
    try {
      if (dirname(tempPath) !== dirname(targetPath)) verifyStagingDir(options.stagingDir);
      await handle.writeFile(content, {
        encoding: options.encoding,
      });
      if (targetExisted && mode !== undefined)
        try {
          await handle.chmod(mode);
          logForDebugging("Applied original permissions to temp file");
        } catch (error) {
          if (!isUnsupportedFlagError(error)) throw error;
          logForDebugging(`fchmod unsupported on this filesystem: ${error}`);
        }
      try {
        await handle.sync();
      } catch (error) {
        if (!isUnsupportedFlagError(error)) throw error;
        logForDebugging(`fsync unsupported on this filesystem: ${error}`);
      }
      tempWritten = true;
    } catch (error) {
      writeFailed = true;
      writeError = error;
    }
    try {
      await handle.close();
    } catch (error) {
      if (!writeFailed) throw error;
      logForDebugging(`close also failed after temp write error: ${error}`, {
        level: "error",
      });
    }
    if (writeFailed) throw writeError;
    logForDebugging(`Temp file written successfully, size: ${content.length} bytes`);
    if (dirname(tempPath) !== dirname(targetPath)) verifyStagingDir(options.stagingDir);
    options.beforeRename?.();
    if (options.createOnly) {
      try {
        await retryTransient(() => fsImplementation.link(tempPath, targetPath), targetPath);
      } catch (error) {
        if (getErrnoCode(error) === "EEXIST") throw error;
        await writeNewFile(targetPath, content, options.mode);
      }
      await fsImplementation.unlink(tempPath).catch((error) => {
        logForDebugging(`Failed to clean up temp file: ${error}`);
      });
      logForDebugging(`Created ${targetPath}`);
      return;
    }
    logForDebugging(`Renaming ${tempPath} to ${targetPath}`);
    renamed = true;
    await retryFsOp(tempPath, targetPath, (fromPath, toPath) => fsImplementation.rename(fromPath, toPath));
    unmarkMountPoint(targetPath);
    logForDebugging(`File ${targetPath} written atomically`);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (!options.createOnly || errnoCode !== "EEXIST")
      logForDebugging(`Failed to write file atomically: ${error}`, {
        level: "error",
      });
    if (renamed && (await fallBackToCopyAsync(error, tempPath, targetPath, followLink))) {
      logForDebugging(`EBUSY in an NFS folder: saving ${targetPath} once more`);
      return writeFileAsyncFlush(filePath, content, options, true);
    }
    let canFallBackInPlace =
      tempWritten &&
      errnoCode !== undefined &&
      (ATOMIC_WRITE_ERRNOS.has(errnoCode) || (followLink && renamed && !NO_SPACE_CODES.has(errnoCode))) &&
      !options.createOnly;
    let canRetryWithCreate = !tempWritten && targetExisted && errnoCode === "EACCES" && !options.createOnly;
    if (canFallBackInPlace || canRetryWithCreate) {
      let { flags, flagsIfMissing } = openWriteFlags(O_NOFOLLOW);
      let mode = !targetExisted && options.mode !== undefined ? options.mode : undefined;
      let inPlaceHandle;
      try {
        try {
          inPlaceHandle = await open(targetPath, flags, mode);
        } catch (error) {
          if (flagsIfMissing === undefined || !isENOENT(error)) throw error;
          await assertPathSafeAsync(targetPath);
          inPlaceHandle = await open(targetPath, flagsIfMissing, mode);
        }
      } catch (error_2) {
        try {
          await fsImplementation.unlink(tempPath);
        } catch (error) {
          logForDebugging(`Failed to clean up temp file: ${error}`);
        }
        if (getErrnoCode(error_2) === "ELOOP")
          throw new SymlinkWriteRefusedError(`Refusing to write through symlink: ${targetPath} (O_NOFOLLOW)`);
        throw error;
      }
      let stats;
      try {
        stats = await inPlaceHandle.stat({
          bigint: true,
        });
        if (stats.nlink > 1n && (options.refuseHardLinkedInPlace ?? isInPlaceWriteDefault()))
          throw new HardLinkWriteRefusedError(targetPath, Number(stats.nlink));
        if (stats.isFile()) await inPlaceHandle.truncate(0);
      } catch (error_2) {
        await inPlaceHandle.close().catch(() => {});
        try {
          await fsImplementation.unlink(tempPath);
        } catch (error) {
          logForDebugging(`Failed to clean up temp file: ${error}`);
        }
        rethrowWithAtomicWriteCause(error_2, error);
      }
      try {
        await inPlaceHandle.writeFile(content, {
          encoding: options.encoding,
        });
        try {
          await inPlaceHandle.sync();
        } catch (error) {
          if (!isUnsupportedFlagError(error)) throw error;
          logForDebugging(`fsync unsupported on this filesystem: ${error}`);
        }
        await inPlaceHandle.close();
        try {
          await fsImplementation.unlink(tempPath);
        } catch (error) {
          logForDebugging(`Failed to clean up temp file: ${error}`);
        }
        logForDebugging(`File ${targetPath} written via in-place fallback`);
        return;
      } catch (error_2) {
        let outcome = await targetReplacedAfterInPlaceWriteFailed(
          targetPath,
          stats,
          Buffer.from(content, options.encoding),
          error_2,
        );
        try {
          await inPlaceHandle.close();
        } catch {}
        if (!outcome)
          try {
            await fsImplementation.unlink(targetPath);
          } catch {}
        if (tempWritten)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Write to ${targetPath} failed (${getErrnoCode(error_2) ?? error_2}) ${outcome ? "and another writer has replaced the file, which was left as it is" : "after the target was truncated"}. The new content was preserved at ${tempPath}.`,
            "writeFileAndFlush: in-place fallback write failed; content preserved at temp path",
          );
        rethrowWithAtomicWriteCause(error_2, error);
      }
    }
    try {
      await fsImplementation.unlink(tempPath);
    } catch (error) {
      logForDebugging(`Failed to clean up temp file: ${error}`);
    }
    throw error;
  }
}
//@ chunk-0fzr619q.js:16377-16441 layout
var WINDOWS_NON_USER_PROFILES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0fzr619q.js:16377", () => {
  WINDOWS_NON_USER_PROFILES = new Set(["Public", "Default", "Default User", "All Users"]);
});
//@ chunk-0fzr619q.js:16441-16980 fingerprint (2.1.88 match: getDesktopPath, 0.627)
/**
 * 取桌面目录（macOS ~/Desktop；Windows/WSL 按 USERPROFILE 推断；Linux 等回退）。
 */
async function getDesktopPath() {
  let platform = getPlatform();
  let homeDir = homedir();
  let fsImplementation = getFsImplementation();
  if (platform === "macos") return join(homeDir, "Desktop");
  if (platform === "windows") {
    let windowsHome = env.USERPROFILE ? env.USERPROFILE.replaceAll("\\", "/") : null;
    if (windowsHome) {
      let desktopPath = `/mnt/c${windowsHome.replace(/^[A-Z]:/, "")}/Desktop`;
      if (await pathExists(desktopPath)) return desktopPath;
    }
    try {
      let entries = await fsImplementation.readdir("/mnt/c/Users");
      for (let user of entries) {
        if (WINDOWS_NON_USER_PROFILES.has(user.name)) continue;
        let potentialDesktopPath = join("/mnt/c/Users", user.name, "Desktop");
        if (await pathExists(potentialDesktopPath)) return potentialDesktopPath;
      }
    } catch (error) {
      logForDebugging(`Failed to enumerate /mnt/c/Users for Windows desktop path: ${error}`, {
        level: "error",
      });
    }
  }
  let desktopPath = join(homeDir, "Desktop");
  if (await pathExists(desktopPath)) return desktopPath;
  return homeDir;
}
//@ chunk-0fzr619q.js:16980-17063 placement
/**
 * 判断文件大小是否不超过上限（stat 失败视为否）。
 */
async function isFileWithinSizeBound(filePath, maxBytes = BOUNDED_READ_MAX) {
  try {
    return (await getFsImplementation().stat(filePath)).size <= maxBytes;
  } catch {
    return false;
  }
}
//@ chunk-0fzr619q.js:17063-17224 placement
/**
 * 规范化路径用于比较（Windows 大小写与分隔符）。
 */
function normalizePathForCompare(path) {
  let isWindows = getPlatform() === "windows";
  let normalized = normalize(path);
  let trailingSepRe = isWindows ? /[\\/]+$/ : /\/+$/;
  let trimmed =
    normalized.length > parse(normalized).root.length ? normalized.replace(trailingSepRe, "") : normalized;
  return isWindows ? trimmed.replaceAll("/", "\\").toLowerCase() : trimmed;
}
//@ chunk-0fzr619q.js:17224-17262 placement
/**
 * 两个路径是否相同。
 */
function samePath(leftPath, rightPath) {
  return normalizePathForCompare(leftPath) === normalizePathForCompare(rightPath);
}
//@ chunk-e5z7dpjd.js:20547-20651 fingerprint (2.1.88 match: readFileSafe, 1)
function readFileSafe(filepath) {
  let fs = getFsImplementation();
  try {
    let jsonText = fs.readFileSync(filepath, {
      encoding: "utf8",
    });
    return embeddedSearchToolsBinaryPath(jsonText);
  } catch {
    return null;
  }
}
//@ chunk-9knfmvrf.js:54387-54583 fingerprint (2.1.88 match: readFileSyncCached, 0.53)
/**
 * 以只读打开文件，是普通文件且不超过 e 字节时返回内容，否则 undefined。
 */
async function readFileSyncCached(filePath, options) {
  let cached;
  try {
    cached = await open(filePath, constants.O_RDONLY | platformNoFollowFlags());
    let stats = await cached.stat();
    if (!stats.isFile() || stats.size > options) return;
    return await cached.readFile();
  } catch {
    return;
  } finally {
    await cached?.close().catch(() => {});
  }
}
export {
  isFileWithinSizeBound,
  runWithFileWriteContext,
  getDisplayPath,
  FILE_NOT_FOUND_CWD_NOTE,
  detectLineEndings,
  addLineNumbers,
  formatNumberedLine,
  findSimilarFile,
  normalizePathForComparison,
  writeFileSyncAndFlush_DEPRECATED,
  getFileModificationTimeAsync,
  normalizePathForCompare,
  samePath,
  readJsonFile_2,
  stripLineNumberPrefix,
  readFileSafe,
  writeTextContentVerified,
  getFileModificationTime,
  detectLineEndingsForString,
  getDesktopPath,
  readFileSyncCached,
  convertLeadingTabsToSpaces,
  detectFileEncoding,
  toCloudRelativePath,
  HIDDEN_PATH_PLACEHOLDER,
};
