/**
 * utils/file.ts
 *
 * 文件通用工具：mtime、编码/行尾检测、显示路径、加行号、Did you mean 建议、原子写
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/file.ts
 * pieces: chunk-7r5y3c3p.js (1), chunk-847rdpmn.js (28), chunk-awy329vy.js (1)
 * attribution: fingerprint 11, placement 7, callgraph-fingerprint 1, layout 9, file-local 2
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
  assertPathSafeSync,
  retryFsOp,
  assertPathSafeAsync,
} from "./atomicPublishWrite.js";
import { ATOMIC_WRITE_ERRNOS, isInPlaceWriteDefault } from "./plugins/safeCopy.js";
import { env } from "./env.js";
import { BOM_SNIFF_BYTES, detectEncodingFromBom } from "./fileRead.js";
import { platformNoFollowFlags } from "./platformTargets.js";

//@ chunk-847rdpmn.js:6208-6276 fingerprint = getFileModificationTime (1)
/**
 * 同步取文件 mtime（毫秒取整）。
 */
function getFileModificationTime(filePath) {
  let fs = getFsImplementation();
  return Math.floor(fs.statSync(filePath).mtimeMs);
}
//@ chunk-847rdpmn.js:6276-6351 fingerprint = getFileModificationTimeAsync (1)
/**
 * 异步取文件 mtime（毫秒取整），Read 去重与 Edit/Write 修改检测用。
 */
async function getFileModificationTimeAsync(filePath) {
  let stats = await getFsImplementation().stat(filePath);
  return Math.floor(stats.mtimeMs);
}
//@ chunk-847rdpmn.js:6642-6654 placement
var fileWriteContextStorage = createKeyedQueue();
//@ chunk-847rdpmn.js:6654-6690 placement
function runWithFileWriteContext(e, n) {
  return fileWriteContextStorage.run(e, n);
}
//@ chunk-847rdpmn.js:6690-6785 placement = detectLineEndingsForString (1)
/**
 * 行尾为 CRLF 时把内容统一转换为 CRLF。
 */
function detectLineEndingsForString(e, n) {
  if (n !== "CRLF") return e;
  return e.replaceAll(
    `\r
`,
    `
`,
  ).split(`
`).join(`\r
`);
}
//@ chunk-847rdpmn.js:6785-7175 placement
/**
 * 写文本文件并核对：写入后比较磁盘大小与预期字节数，不一致抛 "Write verification failed"（网络盘/云同步截断），返回 mtime。
 */
async function writeTextContentVerified(ioPath, content, encoding, s) {
  let lineEndingsForString = detectLineEndingsForString(content, s);
  await writeFileAtomic(ioPath, lineEndingsForString, {
    encoding,
  });
  let o = Buffer.byteLength(lineEndingsForString, encoding);
  let stats = await getFsImplementation().stat(ioPath);
  if (stats.size !== o)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Write verification failed: ${ioPath} is ${stats.size} bytes on disk, expected ${o}. The filesystem may have silently truncated the write (network drive / cloud sync).`,
      "writeTextContent: on-disk size mismatch after write",
    );
  return Math.floor(stats.mtimeMs);
}
//@ chunk-847rdpmn.js:7175-7377 fingerprint = detectFileEncoding (1)
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
//@ chunk-847rdpmn.js:7377-7477 callgraph-fingerprint = convertLeadingTabsToSpaces (1)
/**
 * 把每行行首制表符替换为两个空格。
 */
function convertLeadingTabsToSpaces(content) {
  if (!content.includes("\t")) return content;
  return content.replace(/^\t+/gm, (n) => "  ".repeat(n.length));
}
//@ chunk-847rdpmn.js:7477-7616 fingerprint = getAbsoluteAndRelativePaths (1)
function getAbsoluteAndRelativePaths(path) {
  let n = path ? (getCwdOrNullSafe() ?? undefined) : undefined;
  let r = path ? (expandPathOrNull(path, n) ?? undefined) : undefined;
  let relativePath = r && n !== undefined ? relative(n, r) : undefined;
  return {
    absolutePath: r,
    relativePath,
  };
}
//@ chunk-847rdpmn.js:7616-7663 layout
/**
 * 路径含 NUL 时显示的占位文本。
 */
var HIDDEN_PATH_PLACEHOLDER = "Path hidden (unsupported characters)";
//@ chunk-847rdpmn.js:7663-7858 fingerprint = getDisplayPath (1)
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
//@ chunk-847rdpmn.js:7858-7962 layout
/**
 * 把路径转为相对当前（或指定）工作目录的相对路径。
 */
function toCloudRelativePath(e, notebookData) {
  let r = notebookData === undefined ? getEffectiveCwd() : applyCloudCwd(notebookData);
  let s = (notebookData !== undefined || !hasOutermostCallFrame()) && r === getCloudCwd();
  return relative(r, s ? resolve(r, e) : e);
}
//@ chunk-847rdpmn.js:7962-8003 layout
var SHORT_EXTENSION_RE = /^(\.[\p{L}\p{N}_+~#-]{1,32})?$/u;
//@ chunk-847rdpmn.js:8003-8291 layout
/**
 * 在同目录下找同名不同扩展名的文件（扩展名 1–32 位），用于"文件不存在"时的 Did you mean。
 */
async function findSimilarFile(filePath) {
  let fsImplementation = getFsImplementation();
  try {
    let dir = dirname(filePath);
    let fileBaseName = basename(filePath, extname(filePath));
    let a = (await fsImplementation.readdir(dir)).filter(
      (file) =>
        SHORT_EXTENSION_RE.test(extname(file.name).normalize("NFC")) &&
        basename(file.name, extname(file.name)) === fileBaseName &&
        join(dir, file.name) !== filePath,
    )[0];
    if (a) return a.name;
    return;
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`findSimilarFile failed for ${filePath}: ${error}`, {
        level: "error",
      });
    return;
  }
}
//@ chunk-847rdpmn.js:8291-8340 fingerprint = FILE_NOT_FOUND_CWD_NOTE (1)
/**
 * "Note: your current working directory is" 提示前缀。
 */
var FILE_NOT_FOUND_CWD_NOTE = "Note: your current working directory is";
//@ chunk-847rdpmn.js:8340-8621 file-local
/**
 * 路径落在 cwd 的父目录下但不在 cwd 内时，尝试把它映射到 cwd 下同名相对路径（存在才返回），用于 Did you mean。
 */
async function normalizePathForComparison(requestedPath) {
  let cwd = getCwd();
  let cwdParent = dirname(cwd);
  let s = requestedPath;
  try {
    let resolvedDir = await realpath(dirname(requestedPath));
    s = join(resolvedDir, basename(requestedPath));
  } catch {}
  let u = cwdParent === sep ? sep : cwdParent + sep;
  let a = getPlatform() === "windows" ? (S) => S.toLowerCase() : (S) => S;
  let f = a(s);
  if (!f.startsWith(a(u)) || f.startsWith(a(cwd + sep)) || f === a(cwd)) return;
  let relFromParent = relative(cwdParent, s);
  let correctedPath = join(cwd, relFromParent);
  try {
    await stat(correctedPath);
    return correctedPath;
  } catch {
    return;
  }
}
//@ chunk-847rdpmn.js:8621-8901 fingerprint = addLineNumbers (0.487)
/**
 * 给内容加行号（cat -n 风格）；tabAwareSeparator 且内容含行首制表符时分隔符用冒号。
 */
function addLineNumbers({ content, startLine, tabAwareSeparator = false }) {
  if (!content) return "";
  let s =
    tabAwareSeparator &&
    (content.startsWith("\t") ||
      content.includes(`
	`))
      ? ":"
      : "\t";
  let u = [];
  let o = startLine;
  let a = 0;
  let index = content.indexOf(`
`);
  while (index !== -1) {
    u.push(formatNumberedLine(content.slice(a, index), o++, s));
    a = index + 1;
    index = content.indexOf(
      `
`,
      a,
    );
  }
  u.push(formatNumberedLine(content.slice(a), o, s));
  return u.join(`
`);
}
//@ chunk-847rdpmn.js:8901-8981 layout
/**
 * 单行格式化：行号 + 分隔符 + 去掉行尾 \r 的内容。
 */
function formatNumberedLine(e, n, r) {
  let s = e.endsWith("\r") ? e.slice(0, -1) : e;
  return `${n}${r}${s}`;
}
//@ chunk-847rdpmn.js:8981-9047 file-local
/**
 * 去掉 Read 输出的行号前缀（tab、冒号或旧式箭头）。
 */
function stripLineNumberPrefix(line) {
  return line.match(/^\s*\d+[\u2192\t:](.*)$/)?.[1] ?? line;
}
//@ chunk-847rdpmn.js:9047-9287 layout
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
//@ chunk-847rdpmn.js:9287-9337 layout
function preserveFileModeBits(e) {
  return e === undefined ? undefined : (e & 511) | 128;
}
//@ chunk-847rdpmn.js:9337-12292 fingerprint = writeFileSyncAndFlush_DEPRECATED (0.593)
/**
 * 同步原子写（已弃用）：默认拒绝写穿符号链接，临时文件 + fsync + rename，保留原权限。
 */
function writeFileSyncAndFlush_DEPRECATED(
  filePath,
  content,
  options = {
    encoding: "utf-8",
  },
) {
  let fs = getFsImplementation();
  let O_NOFOLLOW = options.allowSymlink ? 0 : constants.O_NOFOLLOW;
  let targetPath = filePath;
  let a;
  let f = false;
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
      let c = fs.lstatSync(filePath);
      if (c.isSymbolicLink())
        throw new SymlinkWriteRefusedError(
          `Refusing to write through symlink: ${filePath}. Resolve the symlink and pass the real target path explicitly.`,
        );
      a = c.mode;
      f = true;
    } catch (error) {
      if (!isENOENT(error)) throw error;
    }
  }
  let tempPath = `.tmp.${process.pid}.${randomBytes(6).toString("hex")}`;
  let g = stagingPathFor(options.stagingDir, targetPath, tempPath, options.allowSymlink ?? false);
  let S = false;
  if (options.allowSymlink && !f)
    try {
      a = fs.statSync(targetPath).mode;
      f = true;
    } catch (error) {
      if (!isENOENT(error)) throw error;
    }
  if (f && a !== undefined) logForDebugging(`Preserving file permissions: ${a.toString(8)}`);
  else if (options.mode !== undefined) {
    a = options.mode;
    logForDebugging(`Setting permissions for new file: ${a.toString(8)}`);
  }
  try {
    logForDebugging(`Writing to temp file: ${g}`);
    let c = openSync(
      g,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | O_NOFOLLOW,
      f ? preserveFileModeBits(a) : options.mode,
    );
    let E = false;
    let _;
    try {
      if (dirname(g) !== dirname(targetPath)) verifyStagingDir(options.stagingDir);
      writeFileSync(c, content, {
        encoding: options.encoding,
      });
      if (f && a !== undefined)
        try {
          fchmodSync(c, a);
          logForDebugging("Applied original permissions to temp file");
        } catch (error) {
          if (!isUnsupportedFlagError(error)) throw error;
          logForDebugging(`fchmod unsupported on this filesystem: ${error}`);
        }
      try {
        fsyncSync(c);
      } catch (error) {
        if (!isUnsupportedFlagError(error)) throw error;
        logForDebugging(`fsync unsupported on this filesystem: ${error}`);
      }
      S = true;
    } catch (error) {
      E = true;
      _ = error;
    }
    try {
      closeSync(c);
    } catch (error) {
      if (!E) throw error;
      logForDebugging(`closeSync also failed after temp write error: ${error}`, {
        level: "error",
      });
    }
    if (E) throw _;
    logForDebugging(`Temp file written successfully, size: ${content.length} bytes`);
    if (dirname(g) !== dirname(targetPath)) verifyStagingDir(options.stagingDir);
    logForDebugging(`Renaming ${g} to ${targetPath}`);
    retryFsOpSync(g, targetPath, (h, L) => fs.renameSync(h, L));
    logForDebugging(`File ${targetPath} written atomically`);
  } catch (error) {
    logForDebugging(`Failed to write file atomically: ${error}`, {
      level: "error",
    });
    let errnoCode = getErrnoCode(error);
    if (
      (S && errnoCode !== undefined && ATOMIC_WRITE_ERRNOS.has(errnoCode)) ||
      (!S && f && errnoCode === "EACCES")
    ) {
      let { flags, flagsIfMissing } = openWriteFlags(O_NOFOLLOW);
      let mode = !f && options.mode !== undefined ? options.mode : undefined;
      let b;
      try {
        try {
          b = openSync(targetPath, flags, mode);
        } catch (error) {
          if (flagsIfMissing === undefined || !isENOENT(error)) throw error;
          assertPathSafeSync(targetPath);
          b = openSync(targetPath, flagsIfMissing, mode);
        }
      } catch (error_2) {
        try {
          fs.unlinkSync(g);
        } catch (error) {
          logForDebugging(`Failed to clean up temp file: ${error}`);
        }
        if (getErrnoCode(error_2) === "ELOOP")
          throw new SymlinkWriteRefusedError(`Refusing to write through symlink: ${targetPath} (O_NOFOLLOW)`);
        throw error;
      }
      try {
        let p = fstatSync(b);
        if (p.nlink > 1 && (options.refuseHardLinkedInPlace ?? isInPlaceWriteDefault()))
          throw new HardLinkWriteRefusedError(targetPath, p.nlink);
        if (p.isFile()) ftruncateSync(b, 0);
      } catch (error_2) {
        try {
          closeSync(b);
        } catch {}
        try {
          fs.unlinkSync(g);
        } catch (error) {
          logForDebugging(`Failed to clean up temp file: ${error}`);
        }
        rethrowWithAtomicWriteCause(error_2, error);
      }
      try {
        writeFileSync(b, content, {
          encoding: options.encoding,
        });
        try {
          fsyncSync(b);
        } catch (error) {
          if (!isUnsupportedFlagError(error)) throw error;
          logForDebugging(`fsync unsupported on this filesystem: ${error}`);
        }
        closeSync(b);
        try {
          fs.unlinkSync(g);
        } catch (atomicError) {
          logForDebugging(`Failed to clean up temp file: ${atomicError}`);
        }
        logForDebugging(`File ${targetPath} written via in-place fallback`);
        return;
      } catch (cleanupError) {
        try {
          closeSync(b);
        } catch {}
        try {
          fs.unlinkSync(targetPath);
        } catch {}
        if (S)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Write to ${targetPath} failed (${getErrnoCode(cleanupError) ?? cleanupError}) after the target was truncated. The new content was preserved at ${g}.`,
            "writeFileSyncAndFlush: in-place fallback write failed; content preserved at temp path",
          );
        rethrowWithAtomicWriteCause(cleanupError, error);
      }
    }
    try {
      fs.unlinkSync(g);
    } catch (fallbackError) {
      logForDebugging(`Failed to clean up temp file: ${fallbackError}`);
    }
    throw error;
  }
}
//@ chunk-847rdpmn.js:12292-15406 layout
/**
 * 异步原子写：临时文件 .tmp.<pid>.<rand>（可指定 stagingDir）+ fsync + rename，保留原权限；默认拒绝写穿符号链接，allowSymlink 时写到链接目标。
 */
async function writeFileAtomic(
  e,
  n,
  r = {
    encoding: "utf-8",
  },
) {
  let fsImplementation = getFsImplementation();
  let O_NOFOLLOW = r.allowSymlink ? 0 : constants.O_NOFOLLOW;
  let o = e;
  let a;
  let f = false;
  if (r.allowSymlink)
    try {
      let c = await readlink(e);
      o = isAbsolute(c) ? c : resolve(await realpath(dirname(e)), c);
      logForDebugging(`Writing through symlink: ${e} -> ${o}`);
    } catch {}
  else {
    if (r.checkParentDir)
      try {
        await (
          await open(dirname(e), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW)
        ).close();
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ELOOP" || errnoCode === "ENOTDIR")
          throw new SymlinkWriteRefusedError(`Refusing to write into symlinked directory: ${dirname(e)}`);
      }
    try {
      let c = await lstat(e);
      if (c.isSymbolicLink())
        throw new SymlinkWriteRefusedError(
          `Refusing to write through symlink: ${e}. Resolve the symlink and pass the real target path explicitly.`,
        );
      a = c.mode;
      f = true;
    } catch (error) {
      if (!isENOENT(error)) throw error;
    }
  }
  let y = `.tmp.${process.pid}.${randomBytes(6).toString("hex")}`;
  let g = stagingPathFor(r.stagingDir, o, y, r.allowSymlink ?? false);
  let S = false;
  if (r.allowSymlink && !f)
    try {
      a = (await fsImplementation.stat(o)).mode;
      f = true;
    } catch (error) {
      if (!isENOENT(error)) throw error;
    }
  if (f && a !== undefined) logForDebugging(`Preserving file permissions: ${a.toString(8)}`);
  else if (r.mode !== undefined) {
    a = r.mode;
    logForDebugging(`Setting permissions for new file: ${a.toString(8)}`);
  }
  try {
    logForDebugging(`Writing to temp file: ${g}`);
    let c = await open(
      g,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | O_NOFOLLOW,
      f ? preserveFileModeBits(a) : r.mode,
    );
    let E = false;
    let _;
    try {
      if (dirname(g) !== dirname(o)) verifyStagingDir(r.stagingDir);
      await c.writeFile(n, {
        encoding: r.encoding,
      });
      if (f && a !== undefined)
        try {
          await c.chmod(a);
          logForDebugging("Applied original permissions to temp file");
        } catch (error) {
          if (!isUnsupportedFlagError(error)) throw error;
          logForDebugging(`fchmod unsupported on this filesystem: ${error}`);
        }
      try {
        await c.sync();
      } catch (error) {
        if (!isUnsupportedFlagError(error)) throw error;
        logForDebugging(`fsync unsupported on this filesystem: ${error}`);
      }
      S = true;
    } catch (error) {
      E = true;
      _ = error;
    }
    try {
      await c.close();
    } catch (error) {
      if (!E) throw error;
      logForDebugging(`close also failed after temp write error: ${error}`, {
        level: "error",
      });
    }
    if (E) throw _;
    logForDebugging(`Temp file written successfully, size: ${n.length} bytes`);
    if (dirname(g) !== dirname(o)) verifyStagingDir(r.stagingDir);
    logForDebugging(`Renaming ${g} to ${o}`);
    await retryFsOp(g, o, (h, L) => fsImplementation.rename(h, L));
    logForDebugging(`File ${o} written atomically`);
  } catch (error) {
    logForDebugging(`Failed to write file atomically: ${error}`, {
      level: "error",
    });
    let errnoCode = getErrnoCode(error);
    if (
      (S && errnoCode !== undefined && ATOMIC_WRITE_ERRNOS.has(errnoCode)) ||
      (!S && f && errnoCode === "EACCES")
    ) {
      let { flags, flagsIfMissing } = openWriteFlags(O_NOFOLLOW);
      let mode = !f && r.mode !== undefined ? r.mode : undefined;
      let b;
      try {
        try {
          b = await open(o, flags, mode);
        } catch (error) {
          if (flagsIfMissing === undefined || !isENOENT(error)) throw error;
          await assertPathSafeAsync(o);
          b = await open(o, flagsIfMissing, mode);
        }
      } catch (error_2) {
        try {
          await fsImplementation.unlink(g);
        } catch (error) {
          logForDebugging(`Failed to clean up temp file: ${error}`);
        }
        if (getErrnoCode(error_2) === "ELOOP")
          throw new SymlinkWriteRefusedError(`Refusing to write through symlink: ${o} (O_NOFOLLOW)`);
        throw error;
      }
      try {
        let stats = await b.stat();
        if (stats.nlink > 1 && (r.refuseHardLinkedInPlace ?? isInPlaceWriteDefault()))
          throw new HardLinkWriteRefusedError(o, stats.nlink);
        if (stats.isFile()) await b.truncate(0);
      } catch (error_2) {
        await b.close().catch(() => {});
        try {
          await fsImplementation.unlink(g);
        } catch (error) {
          logForDebugging(`Failed to clean up temp file: ${error}`);
        }
        rethrowWithAtomicWriteCause(error_2, error);
      }
      try {
        await b.writeFile(n, {
          encoding: r.encoding,
        });
        try {
          await b.sync();
        } catch (error) {
          if (!isUnsupportedFlagError(error)) throw error;
          logForDebugging(`fsync unsupported on this filesystem: ${error}`);
        }
        await b.close();
        try {
          await fsImplementation.unlink(g);
        } catch (error) {
          logForDebugging(`Failed to clean up temp file: ${error}`);
        }
        logForDebugging(`File ${o} written via in-place fallback`);
        return;
      } catch (error_2) {
        try {
          await b.close();
        } catch {}
        try {
          await fsImplementation.unlink(o);
        } catch {}
        if (S)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Write to ${o} failed (${getErrnoCode(error_2) ?? error_2}) after the target was truncated. The new content was preserved at ${g}.`,
            "writeFileAndFlush: in-place fallback write failed; content preserved at temp path",
          );
        rethrowWithAtomicWriteCause(error_2, error);
      }
    }
    try {
      await fsImplementation.unlink(g);
    } catch (error) {
      logForDebugging(`Failed to clean up temp file: ${error}`);
    }
    throw error;
  }
}
//@ chunk-847rdpmn.js:15406-15470 layout
var WINDOWS_NON_USER_PROFILES = new Set(["Public", "Default", "Default User", "All Users"]);
//@ chunk-847rdpmn.js:15470-16009 fingerprint = getDesktopPath (0.627)
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
//@ chunk-847rdpmn.js:16009-16092 placement
/**
 * 判断文件大小是否不超过上限（stat 失败视为否）。
 */
async function isFileWithinSizeBound(e, n = BOUNDED_READ_MAX) {
  try {
    return (await getFsImplementation().stat(e)).size <= n;
  } catch {
    return false;
  }
}
//@ chunk-847rdpmn.js:16092-16253 placement
/**
 * 规范化路径用于比较（Windows 大小写与分隔符）。
 */
function normalizePathForCompare(e) {
  let n = getPlatform() === "windows";
  let r = normalize(e);
  let s = n ? /[\\/]+$/ : /\/+$/;
  let u = r.length > parse(r).root.length ? r.replace(s, "") : r;
  return n ? u.replaceAll("/", "\\").toLowerCase() : u;
}
//@ chunk-847rdpmn.js:16253-16291 placement
/**
 * 两个路径是否相同。
 */
function samePath(e, n) {
  return normalizePathForCompare(e) === normalizePathForCompare(n);
}
//@ chunk-7r5y3c3p.js:2166-2264 fingerprint = detectLineEndings (0.78)
/**
 * 读文件开头若干字节检测编码（utf8/utf16le 等）。
 */
function detectLineEndings(n) {
  let { buffer, bytesRead } = getFsImplementation().readSync(n, {
    length: BOM_SNIFF_BYTES,
  });
  return detectEncodingFromBom(buffer.subarray(0, bytesRead));
}
//@ chunk-awy329vy.js:43887-44083 fingerprint = readFileSyncCached (0.529)
/**
 * 以只读打开文件，是普通文件且不超过 e 字节时返回内容，否则 undefined。
 */
async function readFileSyncCached(n, e) {
  let r;
  try {
    r = await open(n, constants.O_RDONLY | platformNoFollowFlags());
    let stats = await r.stat();
    if (!stats.isFile() || stats.size > e) return;
    return await r.readFile();
  } catch {
    return;
  } finally {
    await r?.close().catch(() => {});
  }
}
export {
  getDisplayPath,
  getFileModificationTimeAsync,
  getFileModificationTime,
  getDesktopPath,
  writeFileAtomic,
  writeFileSyncAndFlush_DEPRECATED,
  runWithFileWriteContext,
  samePath,
  convertLeadingTabsToSpaces,
  detectLineEndingsForString,
  writeTextContentVerified,
  toCloudRelativePath,
  normalizePathForCompare,
  stripLineNumberPrefix,
  addLineNumbers,
  isFileWithinSizeBound,
  detectLineEndings,
  formatNumberedLine,
  findSimilarFile,
  normalizePathForComparison,
  FILE_NOT_FOUND_CWD_NOTE,
  detectFileEncoding,
  HIDDEN_PATH_PLACEHOLDER,
  readFileSyncCached,
};
