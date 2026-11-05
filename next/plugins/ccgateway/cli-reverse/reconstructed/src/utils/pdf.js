/**
 * utils/pdf.ts
 *
 * PDF 整份读取（base64）、pdftoppm 页提取与可用性检测、错误分类
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/pdf.ts
 * pieces: chunk-5j7d17eb.js (1), chunk-85eyj5gy.js (25)
 * attribution: fingerprint 4, affinity 1, layout 18, placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { constants } from "fs";
import { win32, join, dirname, basename } from "path";
import { mkdtemp, rm, readdir, copyFile, open, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import { MAX_PDF_BYTES, MAX_PERSIST_BYTES, MAX_PDF_PAGES_PER_READ } from "./mediaLimits.js";
import { formatFileSize } from "./format.js";
import { readHandleBounded } from "./fsSafety/boundOpen.js";
import {
  isSadFsErrno,
  errorMessage,
  AbortError,
  getErrnoCode,
  sanitizeErrnoForTelemetry,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "./errors.js";
import { procFdPath } from "./fsSafety/pathRevalidation.js";
import { INHERITED_FD_PATH, execFileNoThrow } from "./execFileNoThrow.js";
import { whichAsync } from "./which.js";
import { logForDebugging } from "./debug.js";
import { logError } from "./log.js";
import { raceWithAbortSignal } from "./sleep.js";
import { PDF_SCRATCH_DIR_PREFIX, tmpdir } from "./tempDir.js";
import { registerCleanup } from "./cleanupRegistry.js";
import { retryFsOp } from "./atomicPublishWrite.js";
import { ATOMIC_WRITE_ERRNOS, TRANSIENT_FS_ERRORS } from "./plugins/safeCopy.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getOriginalCwd as getOriginalCwd_2, getSessionId } from "../bootstrap/state.js";
import { toolResultsDir, TOOL_RESULTS_SUBDIR } from "./toolResultStorage.js";
import { plural } from "./stringUtils.js";
import { getProjectKey } from "./sessionStoragePortable.js";
import { readAllPages } from "./pagedRead.js";
import { getPreSettingsEnvHonoringLiveDeletions } from "./managedEnvApply.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-85eyj5gy.js:46601-46777 affinity
/**
 * 把页区间描述为文本（page n / pages a-b / pages a-）。
 */
function describePageRange(range) {
  let { firstPage, lastPage } = range ?? {};
  if (firstPage === undefined) return "page range";
  if (lastPage === undefined || lastPage === 1 / 0) return `pages ${firstPage}-`;
  if (firstPage === lastPage) return `page ${firstPage}`;
  return `pages ${firstPage}-${lastPage}`;
}
//@ chunk-85eyj5gy.js:46777-47449 fingerprint (2.1.88 match: readPDF, 0.929)
/**
 * 整份读取 PDF 为 base64（大小上限内），返回 pdf 类型结果或带原因的错误。
 */
async function readPDF(handle, ioPath) {
  try {
    let originalSize = (await handle.stat()).size;
    if (originalSize === 0)
      return {
        success: false,
        error: {
          reason: "empty",
          message: `PDF file is empty: ${ioPath}`,
        },
      };
    if (originalSize > MAX_PDF_BYTES)
      return {
        success: false,
        error: {
          reason: "too_large",
          message: `PDF file exceeds maximum allowed size of ${formatFileSize(MAX_PDF_BYTES)}.`,
        },
      };
    let { bytes: fileBuffer } = await readHandleBounded(handle, originalSize, originalSize);
    if (!fileBuffer.subarray(0, 5).toString("ascii").startsWith("%PDF-"))
      return {
        success: false,
        error: {
          reason: "corrupted",
          message: `File is not a valid PDF (missing %PDF- header): ${ioPath}`,
        },
      };
    let base64 = fileBuffer.toString("base64");
    return {
      success: true,
      data: {
        type: "pdf",
        file: {
          filePath: ioPath,
          base64,
          originalSize,
        },
      },
    };
  } catch (error) {
    if (isSadFsErrno(error)) throw error;
    return {
      success: false,
      error: {
        reason: "unknown",
        message: errorMessage(error),
        category: fsErrorCategory(error),
        site: "read",
      },
    };
  }
}
//@ chunk-85eyj5gy.js:47449-48131 layout
/**
 * 用 pdfinfo 取 PDF 页数：普通路径直接传；已打开的句柄优先继承 fd，否则（≤上限）读入内存经 stdin 传入；pdfinfo 不存在或文件过大时返回失败原因。
 */
async function getPdfPageCount(inputPath, openFile, platform = "linux") {
  if (openFile === undefined) return runPdfinfo(toNamespacedPathIfLong(inputPath, platform), undefined);
  if (inputPath === procFdPath(openFile.handle.fd))
    return runPdfinfo(INHERITED_FD_PATH, {
      inheritFd: openFile.handle.fd,
      abortSignal: openFile.signal,
    });
  if ((await whichAsync("pdfinfo").catch(() => null)) === null)
    return {
      pageCount: null,
      pdfinfoFailure: {
        reason: "not_found",
      },
    };
  if (openFile.size > MAX_PERSIST_BYTES)
    return {
      pageCount: null,
      pdfinfoFailure: {
        reason: "not_run",
      },
    };
  try {
    return await runPdfinfo(STDIN_PATH, {
      input: await readJSONLFile(
        openFile.handle,
        openFile.size,
        AbortSignal.any([openFile.signal, AbortSignal.timeout(PDFINFO_TIMEOUT_MS)]),
      ),
      abortSignal: openFile.signal,
    });
  } catch (error) {
    if (error instanceof AbortError || isSadFsErrno(error))
      logForDebugging(
        `PDF page count: the open file was not read for pdfinfo (${getErrnoCode(error) ?? errorMessage(error)}); going without a count`,
        {
          level: "warn",
        },
      );
    else logError(error);
    return {
      pageCount: null,
      pdfinfoFailure: {
        reason: "not_run",
      },
    };
  }
}
//@ chunk-85eyj5gy.js:48131-48710 layout
/**
 * 执行 pdfinfo（10 秒超时），解析 "Pages:" 行；失败返回 pdfinfoFailure.reason（timeout/not_found/nonzero_exit/no_page_count/no_exit_status）。
 */
async function runPdfinfo(target, options) {
  let { code, stdout, exitCode, timedOut } = await execFileNoThrow("pdfinfo", [target], {
    timeout: PDFINFO_TIMEOUT_MS,
    useCwd: false,
    ...options,
  });
  if (code === 0) {
    let pageCount;
    for (let [, pageCountText] of stdout.matchAll(PAGES_INFO_RE)) {
      let count = Number(pageCountText);
      if (Number.isSafeInteger(count) && count >= (pageCount ?? 0)) pageCount = count;
    }
    return pageCount !== undefined
      ? {
          pageCount,
        }
      : {
          pageCount: null,
          pdfinfoFailure: {
            reason: "no_page_count",
          },
        };
  }
  if (timedOut)
    return {
      pageCount: null,
      pdfinfoFailure: {
        reason: "timeout",
      },
    };
  if (exitCode !== undefined)
    return {
      pageCount: null,
      pdfinfoFailure: {
        reason: "nonzero_exit",
        exitCode,
      },
    };
  return {
    pageCount: null,
    pdfinfoFailure: {
      reason: (await whichAsync("pdfinfo").catch(() => null)) === null ? "not_found" : "no_exit_status",
    },
  };
}
//@ chunk-85eyj5gy.js:48710-49067 layout
/**
 * 把 pdfinfo 失败原因转成人读文字。
 */
function describePdfinfoFailure(pdfinfoFailure) {
  switch (pdfinfoFailure.reason) {
    case "timeout":
      return "pdfinfo timed out";
    case "not_found":
      return "pdfinfo was not found";
    case "no_exit_status":
      return "pdfinfo did not run to completion";
    case "nonzero_exit":
      return `pdfinfo failed (exit code ${pdfinfoFailure.exitCode})`;
    case "no_page_count":
      return "pdfinfo did not report a page count";
    case "not_run":
      return "pdfinfo was not run";
  }
}
//@ chunk-85eyj5gy.js:49067-49140 layout
function getPdfOpenFlags(platform) {
  let extraFlags = platform === "win32" ? 0 : (constants.O_NONBLOCK ?? 0);
  return constants.O_RDONLY | extraFlags;
}
//@ chunk-85eyj5gy.js:49140-49224 layout
var WINDOWS_MAX_PATH = 259;
var PAGES_INFO_RE = /(?:^|\n)Pages:[ \t]+(\d+)[ \t\r]*(?=\n|$)/g;
var PDFINFO_TIMEOUT_MS = 1e4;
var STDIN_PATH = "-";
var READ_CHUNK_BYTES = 1048576;
//@ chunk-85eyj5gy.js:49224-49430 layout (2.1.88 match: readJSONLFile, 1)
async function readJSONLFile(handle, size, signal) {
  let buf = Buffer.allocUnsafe(size);
  let totalRead = 0;
  while (totalRead < size) {
    let readPromise = handle.read(buf, totalRead, Math.min(READ_CHUNK_BYTES, size - totalRead), totalRead);
    let { bytesRead } =
      signal === undefined
        ? await readPromise
        : await raceWithAbortSignal(readPromise, signal, () => new AbortError());
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  return buf.subarray(0, totalRead);
}
//@ chunk-85eyj5gy.js:49430-49463 layout
var MAX_PAGE_NUMBER_DIGITS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-85eyj5gy.js:49430", () => {
  MAX_PAGE_NUMBER_DIGITS = String(2147483647).length;
});
//@ chunk-85eyj5gy.js:49463-49567 layout
function toNamespacedPathIfLong(inputPath, platform) {
  if (platform !== "win32" || inputPath.length <= WINDOWS_MAX_PATH || !win32.isAbsolute(inputPath))
    return inputPath;
  return win32.toNamespacedPath(inputPath);
}
//@ chunk-85eyj5gy.js:49567-50243 layout
/**
 * 准备 PDF 页图输出前缀：Windows 上路径可能超过 MAX_PATH 时改在短临时目录渲染，之后 collect 移回、dispose 清理。
 */
async function createPageImageOutput(outputDir, { platform, scratchRoot }) {
  let directOutput = {
    prefix: join(outputDir, "page"),
    collect: () => Promise.resolve(),
    [Symbol.asyncDispose]: () => Promise.resolve(),
  };
  let longestPagePath = directOutput.prefix.length + 1 + MAX_PAGE_NUMBER_DIGITS + 4;
  if (platform !== "win32" || longestPagePath <= WINDOWS_MAX_PATH) return directOutput;
  let scratchDir;
  try {
    scratchDir = await mkdtemp(join(scratchRoot(), PDF_SCRATCH_DIR_PREFIX));
  } catch (error) {
    logForDebugging(
      `PDF extraction: could not create a scratch directory under the temp dir (${getErrnoCode(error) ?? errorMessage(error)}); rendering page images directly into the tool-results directory`,
      {
        level: "warn",
      },
    );
    return directOutput;
  }
  let removeScratch = () =>
    rm(scratchDir, {
      recursive: true,
      force: true,
    });
  let unregisterCleanup = registerCleanup(removeScratch);
  return {
    prefix: join(scratchDir, "p"),
    collect: () => movePageImages(scratchDir, outputDir),
    [Symbol.asyncDispose]: () =>
      removeScratch().then(unregisterCleanup, (error) =>
        logForDebugging(
          `PDF extraction: scratch directory not removed (${getErrnoCode(error) ?? errorMessage(error)}); removal is retried at exit`,
          {
            level: "warn",
          },
        ),
      ),
  };
}
//@ chunk-85eyj5gy.js:50243-50462 layout
/**
 * 把渲染出的 p-N.jpg 移到目标目录并改名为 pageN.jpg。
 */
async function movePageImages(scratchDir, outputDir) {
  let entries = await readdir(scratchDir);
  let found = (
    await Promise.allSettled(
      entries
        .filter((entry) => /^p-\d+\.jpg$/.test(entry))
        .map((pageFile) =>
          moveFileWithCopyFallback(join(scratchDir, pageFile), join(outputDir, `page${pageFile.slice(1)}`)),
        ),
    )
  ).find((settled) => settled.status === "rejected");
  if (found !== undefined) throw found.reason;
}
//@ chunk-85eyj5gy.js:50462-50585 layout
async function moveFileWithCopyFallback(fromPath, toPath) {
  try {
    await retryFsOp(fromPath, toPath);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (
      errnoCode === undefined ||
      !(ATOMIC_WRITE_ERRNOS.has(errnoCode) || TRANSIENT_FS_ERRORS.has(errnoCode))
    )
      throw error;
    await copyFile(fromPath, toPath);
  }
}
//@ chunk-85eyj5gy.js:50585-50676 layout
class PdfToolAvailability {
  available = undefined;
  markAvailable() {
    this.available = true;
  }
  reset() {
    this.available = undefined;
  }
}
//@ chunk-85eyj5gy.js:50676-50701 layout
var pdfToolAvailabilityByHost; // deferred: uses PdfToolAvailability of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-85eyj5gy.js:50676", () => {
  pdfToolAvailabilityByHost = new HostScoped(() => new PdfToolAvailability());
});
//@ chunk-85eyj5gy.js:50701-50738 layout
function getPdfToolAvailability() {
  return pdfToolAvailabilityByHost.of(getRootSession().host);
}
//@ chunk-85eyj5gy.js:50738-50948 fingerprint (2.1.88 match: isPdftoppmAvailable, 0.749)
/**
 * 检测 pdftoppm 是否可用（pdftoppm -v，结果缓存）。
 */
async function isPdftoppmAvailable() {
  let pdfToolAvailability = getPdfToolAvailability();
  if (pdfToolAvailability.available !== undefined) return pdfToolAvailability.available;
  let { code, stderr } = await execFileNoThrow("pdftoppm", ["-v"], {
    timeout: 5000,
    useCwd: false,
  });
  let available = code === 0 || (code !== 127 && stderr.length > 0);
  if (available) pdfToolAvailability.markAvailable();
  return available;
}
//@ chunk-85eyj5gy.js:50948-55380 fingerprint (2.1.88 match: extractPDFPages, 0.578)
/**
 * 用 pdftoppm 把指定页区间渲染为 JPEG 到临时目录，返回 parts 结果（页数、输出目录）。
 */
async function extractPDFPages(
  inputPath,
  options,
  storage,
  platformOptions = {
    platform: "linux",
    scratchRoot: tmpdir,
  },
) {
  try {
    let held =
      options?.held !== undefined && inputPath === procFdPath(options.held.fd) ? options.held : undefined;
    let held_2 = held === undefined ? options?.held : undefined;
    let handle = held_2 ?? (await open(inputPath, getPdfOpenFlags("linux")));
    let stats = await handle.stat().finally(() => (handle === held_2 ? undefined : handle.close()));
    if (!stats.isFile())
      return {
        success: false,
        error: {
          reason: "corrupted",
          message: `Path is not a regular file: ${inputPath}`,
        },
      };
    let originalSize = stats.size;
    if (originalSize === 0)
      return {
        success: false,
        error: {
          reason: "empty",
          message: `PDF file is empty: ${inputPath}`,
        },
      };
    if (originalSize > MAX_PERSIST_BYTES)
      return {
        success: false,
        error: {
          reason: "too_large",
          message: `PDF file exceeds maximum allowed size for text extraction (${formatFileSize(MAX_PERSIST_BYTES)}).`,
        },
      };
    if (options?.signal?.aborted) throw new AbortError();
    if (!(await isPdftoppmAvailable()))
      return {
        success: false,
        error: {
          reason: "unavailable",
          message:
            "pdftoppm is not installed. Install poppler-utils (e.g. `brew install poppler` or `apt-get install poppler-utils`) to enable PDF page rendering.",
        },
      };
    let inputBytes =
      held_2 === undefined ? undefined : await readJSONLFile(held_2, originalSize, options?.signal);
    let uuid = randomUUID();
    let outputDir = join(toolResultsDir(), `pdf-${uuid}`);
    let sidecarScope = storage === undefined ? undefined : getPdfExtractionKey(outputDir);
    await mkdir(outputDir, {
      recursive: true,
    });
    await using pageImageOutput = await createPageImageOutput(outputDir, platformOptions);
    let inputArg =
      held === undefined ? toNamespacedPathIfLong(inputPath, platformOptions.platform) : INHERITED_FD_PATH;
    let args = ["-jpeg", "-r", "100"];
    if (options?.firstPage) args.push("-f", String(options.firstPage));
    if (options?.lastPage && options.lastPage !== 1 / 0) args.push("-l", String(options.lastPage));
    args.push(inputBytes === undefined ? inputArg : STDIN_PATH, pageImageOutput.prefix);
    let { code, stderr, exitCode } = await execFileNoThrow("pdftoppm", args, {
      timeout: 120000,
      abortSignal: options?.signal,
      waitForExitAfterKill: true,
      useCwd: false,
      ...(inputBytes !== undefined && {
        input: inputBytes,
      }),
      ...(held !== undefined && {
        inheritFd: held.fd,
      }),
    });
    if (code !== 0) {
      if (options?.signal?.aborted && exitCode === undefined) throw new AbortError();
      let escapedArg = escapeNonPrintableBytes(inputArg);
      let joined = stderr
        .split(escapedArg)
        .map((stderrPart) => stderrPart.replaceAll(inputArg, () => inputPath))
        .join(inputPath);
      let unknownFailure = (category) => ({
        success: false,
        error: {
          reason: "unknown",
          message: `pdftoppm failed: ${joined}`,
          category,
          site: "extract",
          exitCode,
        },
      });
      let lines = stderr.split(/\r?\n/);
      if (lines.some((line) => PDFTOPPM_WRITE_FAILED_RE.test(line)))
        return unknownFailure(classifyPdftoppmStderr(stderr));
      let unopenableLine = `I/O Error: Couldn't open file '${escapedArg}'`;
      let found = lines.find((line) => {
        let trimmedLine = line.trimEnd();
        return (
          trimmedLine === unopenableLine ||
          (trimmedLine.startsWith(`${unopenableLine}: `) &&
            !trimmedLine.endsWith("'") &&
            !trimmedLine.slice(unopenableLine.length + 2).includes("': "))
        );
      });
      let replaced = lines
        .filter((line) => line !== found)
        .join(
          `
`,
        )
        .replaceAll(escapedArg, " ")
        .replaceAll(inputArg, " ")
        .replaceAll(escapeNonPrintableBytes(pageImageOutput.prefix), " ")
        .replaceAll(pageImageOutput.prefix, " ");
      if (/password/i.test(replaced))
        return {
          success: false,
          error: {
            reason: "password_protected",
            message: "PDF is password-protected. Please provide an unprotected version.",
          },
        };
      let match = /Wrong page range given.*last page \((\d+)\)/i.exec(replaced);
      if (match) {
        let pageTotal = Number(match[1]);
        if (pageTotal === 0)
          return {
            success: false,
            error: {
              reason: "corrupted",
              message: "PDF reports 0 pages (empty page tree). The PDF may be invalid.",
            },
          };
        let min = Math.min(pageTotal, MAX_PDF_PAGES_PER_READ);
        return {
          success: false,
          error: {
            reason: "page_out_of_range",
            message: `Requested ${describePageRange(options)} is outside the document (PDF has ${pageTotal} ${plural(pageTotal, "page")}). Use a range within 1-${pageTotal}, maximum ${MAX_PDF_PAGES_PER_READ} pages per request (e.g. pages: "1-${min}").`,
          },
        };
      }
      let syntaxErrorPattern =
        /Syntax Error(?: \(\d+\))?: Couldn't (?:find trailer dictionary|read xref table)/i;
      if (/damaged|corrupt|invalid/i.test(replaced) || syntaxErrorPattern.test(replaced))
        return {
          success: false,
          error: {
            reason: "corrupted",
            message: "PDF file is corrupted or invalid.",
          },
        };
      let firstLine = lines[0] ?? "";
      let any = lines.some((line) => /^(Command Line Error|Internal Error)(?: \(\d+\))?: /.test(line));
      if (!any && found !== undefined && exitCode === 1) {
        if (inputArg !== inputPath) return unknownFailure("rewritten_input_unopenable");
        return {
          success: false,
          error: {
            reason: "pdftoppm_input_error",
            message: `Could not render PDF: ${found.replaceAll(escapedArg, () => inputPath)}`,
          },
        };
      }
      if (!any && firstLine.startsWith("Permission Error: "))
        return {
          success: false,
          error: {
            reason: "pdftoppm_input_error",
            message: `Could not render PDF: ${firstLine}`,
          },
        };
      return unknownFailure(classifyPdftoppmStderr(stderr));
    }
    try {
      await pageImageOutput.collect();
    } catch (error) {
      return {
        success: false,
        error: {
          reason: "unknown",
          message: `Could not move the rendered PDF pages into ${outputDir} (${getErrnoCode(error) ?? "no error code"})`,
          category: fsErrorCategory(error),
          site: "extract",
          exitCode,
        },
      };
    }
    let pageNames;
    if (storage !== undefined) {
      let listResult = await listPdfSidecarPages(storage, outputDir, sidecarScope);
      if (!listResult.ok)
        return {
          success: false,
          error: {
            reason: "unknown",
            message: `Failed to list extracted PDF pages: ${listResult.code}`,
            category: `storage_list_${listResult.code}`,
            site: "extract",
          },
        };
      if (listResult.names.length === 0 && !listResult.directoryExists)
        return {
          success: false,
          error: {
            reason: "unknown",
            message: `Extraction directory missing after pdftoppm ran: ${outputDir}`,
            category: fsErrorCategory({
              code: "ENOENT",
            }),
            site: "extract",
          },
        };
      pageNames = listResult.names;
    } else pageNames = (await readdir(outputDir)).filter((entry) => entry.endsWith(".jpg")).sort();
    if (pageNames.length === 0)
      return {
        success: false,
        error: {
          reason: "corrupted",
          message: "pdftoppm produced no output pages. The PDF may be invalid.",
        },
      };
    let count = pageNames.length;
    return {
      success: true,
      data: {
        type: "parts",
        file: {
          filePath: inputPath,
          originalSize,
          outputDir,
          count,
        },
        ...(sidecarScope !== undefined && {
          v5SidecarScope: {
            ...sidecarScope,
            pageNames,
          },
        }),
      },
    };
  } catch (error) {
    let path = error && typeof error === "object" && "path" in error ? error.path : undefined;
    if (error instanceof AbortError || (isSadFsErrno(error) && (path === inputPath || path === undefined)))
      throw error;
    return {
      success: false,
      error: {
        reason: "unknown",
        message: errorMessage(error),
        category: fsErrorCategory(error),
        site: "extract",
      },
    };
  }
}
//@ chunk-85eyj5gy.js:55380-55803 layout
var PDFTOPPM_WRITE_FAILED_RE = /^Could not write image to [\s\S]*; exiting\s*$/;
var PDFTOPPM_STDERR_CATEGORIES = [
  [/^Internal Error(?: \(\d+\))?: /, "internal_error"],
  [/^Command Line Error(?: \(\d+\))?: /, "command_line_error"],
  [PDFTOPPM_WRITE_FAILED_RE, "output_write_failed"],
  [/^Config Error(?: \(\d+\))?: /, "config_error"],
  [/^Unimplemented Feature(?: \(\d+\))?: /, "unimplemented_feature"],
  [/^I\/O Error(?: \(\d+\))?: /, "io_output"],
  [/^Syntax (?:Error|Warning)(?: \(\d+\))?: /, "syntax_diagnostics"],
];
//@ chunk-85eyj5gy.js:55803-55939 layout
/**
 * 把 pdftoppm 的 stderr 归类（internal_error、io_output、syntax_diagnostics 等）。
 */
function classifyPdftoppmStderr(stderr) {
  if (stderr.trim() === "") return "empty_stderr";
  let lines = stderr.split(/\r?\n/);
  return (
    PDFTOPPM_STDERR_CATEGORIES.find(([categoryPattern]) =>
      lines.some((line) => categoryPattern.test(line)),
    )?.[1] ?? "other"
  );
}
//@ chunk-85eyj5gy.js:55939-56083 layout
function escapeNonPrintableBytes(text) {
  return Array.from(Buffer.from(text, "utf8"), (byte) =>
    byte < 32 || byte >= 127 ? `<${byte.toString(16).padStart(2, "0")}>` : String.fromCharCode(byte),
  ).join("");
}
//@ chunk-85eyj5gy.js:56083-56134 layout
function fsErrorCategory(error) {
  return `fs_wrapped_${sanitizeErrnoForTelemetry(error) ?? "none"}`;
}
//@ chunk-85eyj5gy.js:56134-56159 placement
var LISTCAPEXCEEDED = "ListCapExceeded";
//@ chunk-85eyj5gy.js:56159-56390 placement
function getPdfExtractionKey(extractionDir) {
  let resultsDir = toolResultsDir();
  if (dirname(extractionDir) !== resultsDir)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `PDF extraction directory is outside the session tool-results store: ${extractionDir}`,
      "pdf extraction dir outside tool-results",
    );
  return {
    projectKey: getProjectKey(getOriginalCwd_2()),
    sessionId: getSessionId(),
    relPath: [TOOL_RESULTS_SUBDIR, basename(extractionDir)],
  };
}
//@ chunk-85eyj5gy.js:56390-57441 placement
/**
 * 列出 PDF 提取的 sidecar 页图。
 */
async function listPdfSidecarPages(storage, outputDir, scope) {
  let sidecarScope = scope ?? getPdfExtractionKey(outputDir);
  let { projectKey, sessionId, relPath } = sidecarScope;
  let names = [];
  let allPages = await readAllPages(
    (cursor) =>
      storage.listEntries(
        {
          namespace: "sidecar",
          projectKey,
          sessionId,
          relPath,
        },
        {
          cursor,
          skipKeyStats: true,
          skipScopeStats: true,
        },
      ),
    (entries) => {
      for (let entry of entries) {
        if (entry.kind !== "key" || entry.key.namespace !== "sidecar") continue;
        let last = entry.key.relPath.at(-1);
        if (last === undefined || entry.key.relPath.length !== relPath.length + 1) continue;
        if (!last.endsWith(".jpg")) continue;
        names.push(last);
      }
    },
  );
  switch (allPages.status) {
    case "done":
      break;
    case "error":
      return {
        ok: false,
        code: allPages.error.code,
      };
    case "capped":
      return {
        ok: false,
        code: LISTCAPEXCEEDED,
      };
  }
  names.sort();
  let directoryExists = true;
  if (names.length === 0) {
    directoryExists = false;
    let last = relPath.at(-1);
    let allPages = await readAllPages(
      (cursor) =>
        storage.listEntries(
          {
            namespace: "sidecar",
            projectKey,
            sessionId,
            relPath: relPath.slice(0, -1),
          },
          {
            suffix: last,
            cursor,
            skipScopeStats: true,
          },
        ),
      (entries) => {
        directoryExists ||= entries.some(
          (entry) =>
            entry.kind === "scope" &&
            entry.scope.namespace === "sidecar" &&
            (entry.scope.relPath ?? []).length === relPath.length &&
            entry.scope.relPath?.at(-1) === last,
        );
      },
      {
        until: () => directoryExists,
      },
    );
    switch (allPages.status) {
      case "done":
        break;
      case "error":
        return {
          ok: false,
          code: allPages.error.code,
        };
      case "capped":
        return {
          ok: false,
          code: LISTCAPEXCEEDED,
        };
    }
  }
  return {
    ok: true,
    names,
    directoryExists,
    scope: sidecarScope,
  };
}
//@ chunk-5j7d17eb.js:16698-16752 fingerprint (2.1.88 match: getPDFPageCount, 0.355)
/**
 * pdftoppm/pdfinfo 子进程选项（用 cwd、精简 env）。误配名。
 */
function getPDFPageCount() {
  return {
    useCwd: true,
    env: getPreSettingsEnvHonoringLiveDeletions(),
    extendEnv: false,
  };
}
export {
  isPdftoppmAvailable,
  extractPDFPages,
  getPdfPageCount,
  describePdfinfoFailure,
  readPDF,
  getPDFPageCount,
  listPdfSidecarPages,
  getPdfOpenFlags,
};
