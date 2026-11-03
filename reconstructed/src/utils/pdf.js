/**
 * utils/pdf.ts
 *
 * PDF 整份读取（base64）、pdftoppm 页提取与可用性检测、错误分类
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/pdf.ts
 * pieces: chunk-cne5hsvz.js (1), chunk-t0gq9gyw.js (25)
 * attribution: fingerprint 4, affinity 1, layout 18, placement 3
 */
import { constants } from "fs";
import { win32, join, dirname, basename } from "path";
import { mkdtemp, rm, readdir, copyFile, open, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import { MAX_PDF_BYTES, MAX_PERSIST_BYTES, MAX_PDF_PAGES_PER_READ } from "./truncateGraphemes.js";
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

//@ chunk-t0gq9gyw.js:46537-46713 affinity
/**
 * 把页区间描述为文本（page n / pages a-b / pages a-）。
 */
function describePageRange(e) {
  let { firstPage, lastPage } = e ?? {};
  if (firstPage === undefined) return "page range";
  if (lastPage === undefined || lastPage === 1 / 0) return `pages ${firstPage}-`;
  if (firstPage === lastPage) return `page ${firstPage}`;
  return `pages ${firstPage}-${lastPage}`;
}
//@ chunk-t0gq9gyw.js:46713-47385 fingerprint = readPDF (0.929)
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
//@ chunk-t0gq9gyw.js:47385-48067 layout
/**
 * 用 pdfinfo 取 PDF 页数：普通路径直接传；已打开的句柄优先继承 fd，否则（≤上限）读入内存经 stdin 传入；pdfinfo 不存在或文件过大时返回失败原因。
 */
async function getPdfPageCount(e, n, r = "linux") {
  if (n === undefined) return runPdfinfo(toNamespacedPathIfLong(e, r), undefined);
  if (e === procFdPath(n.handle.fd))
    return runPdfinfo(INHERITED_FD_PATH, {
      inheritFd: n.handle.fd,
      abortSignal: n.signal,
    });
  if ((await whichAsync("pdfinfo").catch(() => null)) === null)
    return {
      pageCount: null,
      pdfinfoFailure: {
        reason: "not_found",
      },
    };
  if (n.size > MAX_PERSIST_BYTES)
    return {
      pageCount: null,
      pdfinfoFailure: {
        reason: "not_run",
      },
    };
  try {
    return await runPdfinfo(STDIN_PATH, {
      input: await readJSONLFile(
        n.handle,
        n.size,
        AbortSignal.any([n.signal, AbortSignal.timeout(PDFINFO_TIMEOUT_MS)]),
      ),
      abortSignal: n.signal,
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
//@ chunk-t0gq9gyw.js:48067-48592 layout
/**
 * 执行 pdfinfo（10 秒超时），解析 "Pages:" 行；失败返回 pdfinfoFailure.reason（timeout/not_found/nonzero_exit/no_page_count/no_exit_status）。
 */
async function runPdfinfo(e, n) {
  let { code, stdout, exitCode, timedOut } = await execFileNoThrow("pdfinfo", [e], {
    timeout: PDFINFO_TIMEOUT_MS,
    useCwd: false,
    ...n,
  });
  if (code === 0) {
    let match = /^Pages:\s+(\d+)/m.exec(stdout);
    return match
      ? {
          pageCount: parseInt(match[1], 10),
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
//@ chunk-t0gq9gyw.js:48592-48949 layout
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
//@ chunk-t0gq9gyw.js:48949-49022 layout
function getPdfOpenFlags(e) {
  let n = e === "win32" ? 0 : (constants.O_NONBLOCK ?? 0);
  return constants.O_RDONLY | n;
}
//@ chunk-t0gq9gyw.js:49022-49058 layout
var WINDOWS_MAX_PATH = 259;
var PDFINFO_TIMEOUT_MS = 1e4;
var STDIN_PATH = "-";
var READ_CHUNK_BYTES = 1048576;
//@ chunk-t0gq9gyw.js:49058-49264 layout = readJSONLFile (1)
async function readJSONLFile(e, n, r) {
  let buf = Buffer.allocUnsafe(n);
  let totalRead = 0;
  while (totalRead < n) {
    let a = e.read(buf, totalRead, Math.min(READ_CHUNK_BYTES, n - totalRead), totalRead);
    let { bytesRead } = r === undefined ? await a : await raceWithAbortSignal(a, r, () => new AbortError());
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  return buf.subarray(0, totalRead);
}
//@ chunk-t0gq9gyw.js:49264-49297 layout
var MAX_PAGE_NUMBER_DIGITS = String(2147483647).length;
//@ chunk-t0gq9gyw.js:49297-49401 layout
function toNamespacedPathIfLong(e, n) {
  if (n !== "win32" || e.length <= WINDOWS_MAX_PATH || !win32.isAbsolute(e)) return e;
  return win32.toNamespacedPath(e);
}
//@ chunk-t0gq9gyw.js:49401-50077 layout
/**
 * 准备 PDF 页图输出前缀：Windows 上路径可能超过 MAX_PATH 时改在短临时目录渲染，之后 collect 移回、dispose 清理。
 */
async function createPageImageOutput(outputDir, { platform, scratchRoot }) {
  let o = {
    prefix: join(outputDir, "page"),
    collect: () => Promise.resolve(),
    [Symbol.asyncDispose]: () => Promise.resolve(),
  };
  let s = o.prefix.length + 1 + MAX_PAGE_NUMBER_DIGITS + 4;
  if (platform !== "win32" || s <= WINDOWS_MAX_PATH) return o;
  let a;
  try {
    a = await mkdtemp(join(scratchRoot(), PDF_SCRATCH_DIR_PREFIX));
  } catch (error) {
    logForDebugging(
      `PDF extraction: could not create a scratch directory under the temp dir (${getErrnoCode(error) ?? errorMessage(error)}); rendering page images directly into the tool-results directory`,
      {
        level: "warn",
      },
    );
    return o;
  }
  let c = () =>
    rm(a, {
      recursive: true,
      force: true,
    });
  let u = registerCleanup(c);
  return {
    prefix: join(a, "p"),
    collect: () => movePageImages(a, outputDir),
    [Symbol.asyncDispose]: () =>
      c().then(u, (error) =>
        logForDebugging(
          `PDF extraction: scratch directory not removed (${getErrnoCode(error) ?? errorMessage(error)}); removal is retried at exit`,
          {
            level: "warn",
          },
        ),
      ),
  };
}
//@ chunk-t0gq9gyw.js:50077-50296 layout
/**
 * 把渲染出的 p-N.jpg 移到目标目录并改名为 pageN.jpg。
 */
async function movePageImages(e, n) {
  let r = await readdir(e);
  let found = (
    await Promise.allSettled(
      r
        .filter((a) => /^p-\d+\.jpg$/.test(a))
        .map((a) => moveFileWithCopyFallback(join(e, a), join(n, `page${a.slice(1)}`))),
    )
  ).find((a) => a.status === "rejected");
  if (found !== undefined) throw found.reason;
}
//@ chunk-t0gq9gyw.js:50296-50419 layout
async function moveFileWithCopyFallback(e, n) {
  try {
    await retryFsOp(e, n);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (
      errnoCode === undefined ||
      !(ATOMIC_WRITE_ERRNOS.has(errnoCode) || TRANSIENT_FS_ERRORS.has(errnoCode))
    )
      throw error;
    await copyFile(e, n);
  }
}
//@ chunk-t0gq9gyw.js:50419-50510 layout
class PdfToolAvailability {
  available = undefined;
  markAvailable() {
    this.available = true;
  }
  reset() {
    this.available = undefined;
  }
}
//@ chunk-t0gq9gyw.js:50510-50535 layout
var pdfToolAvailabilityByHost = new HostScoped(() => new PdfToolAvailability());
//@ chunk-t0gq9gyw.js:50535-50572 layout
function getPdfToolAvailability() {
  return pdfToolAvailabilityByHost.of(getRootSession().host);
}
//@ chunk-t0gq9gyw.js:50572-50782 fingerprint = isPdftoppmAvailable (0.749)
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
  let o = code === 0 || (code !== 127 && stderr.length > 0);
  if (o) pdfToolAvailability.markAvailable();
  return o;
}
//@ chunk-t0gq9gyw.js:50782-55214 fingerprint = extractPDFPages (0.581)
/**
 * 用 pdftoppm 把指定页区间渲染为 JPEG 到临时目录，返回 parts 结果（页数、输出目录）。
 */
async function extractPDFPages(
  ioPath,
  n,
  storageV5,
  o = {
    platform: "linux",
    scratchRoot: tmpdir,
  },
) {
  try {
    let held = n?.held !== undefined && ioPath === procFdPath(n.held.fd) ? n.held : undefined;
    let held_2 = held === undefined ? n?.held : undefined;
    let c = held_2 ?? (await open(ioPath, getPdfOpenFlags("linux")));
    let u = await c.stat().finally(() => (c === held_2 ? undefined : c.close()));
    if (!u.isFile())
      return {
        success: false,
        error: {
          reason: "corrupted",
          message: `Path is not a regular file: ${ioPath}`,
        },
      };
    let originalSize = u.size;
    if (originalSize === 0)
      return {
        success: false,
        error: {
          reason: "empty",
          message: `PDF file is empty: ${ioPath}`,
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
    if (n?.signal?.aborted) throw new AbortError();
    if (!(await isPdftoppmAvailable()))
      return {
        success: false,
        error: {
          reason: "unavailable",
          message:
            "pdftoppm is not installed. Install poppler-utils (e.g. `brew install poppler` or `apt-get install poppler-utils`) to enable PDF page rendering.",
        },
      };
    let w = held_2 === undefined ? undefined : await readJSONLFile(held_2, originalSize, n?.signal);
    let uuid = randomUUID();
    let outputDir = join(toolResultsDir(), `pdf-${uuid}`);
    let b = storageV5 === undefined ? undefined : getPdfExtractionKey(outputDir);
    await mkdir(outputDir, {
      recursive: true,
    });
    await using pageImageOutput = await createPageImageOutput(outputDir, o);
    let _ = held === undefined ? toNamespacedPathIfLong(ioPath, o.platform) : INHERITED_FD_PATH;
    let args = ["-jpeg", "-r", "100"];
    if (n?.firstPage) args.push("-f", String(n.firstPage));
    if (n?.lastPage && n.lastPage !== 1 / 0) args.push("-l", String(n.lastPage));
    args.push(w === undefined ? _ : STDIN_PATH, pageImageOutput.prefix);
    let { code, stderr, exitCode } = await execFileNoThrow("pdftoppm", args, {
      timeout: 120000,
      abortSignal: n?.signal,
      waitForExitAfterKill: true,
      useCwd: false,
      ...(w !== undefined && {
        input: w,
      }),
      ...(held !== undefined && {
        inheritFd: held.fd,
      }),
    });
    if (code !== 0) {
      if (n?.signal?.aborted && exitCode === undefined) throw new AbortError();
      let T = escapeNonPrintableBytes(_);
      let joined = stderr
        .split(T)
        .map((q) => q.replaceAll(_, () => ioPath))
        .join(ioPath);
      let ee = (category) => ({
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
        return ee(classifyPdftoppmStderr(stderr));
      let J = `I/O Error: Couldn't open file '${T}'`;
      let found = lines.find((line) => {
        let ke = line.trimEnd();
        return (
          ke === J ||
          (ke.startsWith(`${J}: `) && !ke.endsWith("'") && !ke.slice(J.length + 2).includes("': "))
        );
      });
      let replaced = lines
        .filter((line) => line !== found)
        .join(
          `
`,
        )
        .replaceAll(T, " ")
        .replaceAll(_, " ")
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
        let q = Number(match[1]);
        if (q === 0)
          return {
            success: false,
            error: {
              reason: "corrupted",
              message: "PDF reports 0 pages (empty page tree). The PDF may be invalid.",
            },
          };
        let min = Math.min(q, MAX_PDF_PAGES_PER_READ);
        return {
          success: false,
          error: {
            reason: "page_out_of_range",
            message: `Requested ${describePageRange(n)} is outside the document (PDF has ${q} ${plural(q, "page")}). Use a range within 1-${q}, maximum ${MAX_PDF_PAGES_PER_READ} pages per request (e.g. pages: "1-${min}").`,
          },
        };
      }
      let se = /Syntax Error(?: \(\d+\))?: Couldn't (?:find trailer dictionary|read xref table)/i;
      if (/damaged|corrupt|invalid/i.test(replaced) || se.test(replaced))
        return {
          success: false,
          error: {
            reason: "corrupted",
            message: "PDF file is corrupted or invalid.",
          },
        };
      let Te = lines[0] ?? "";
      let any = lines.some((line) => /^(Command Line Error|Internal Error)(?: \(\d+\))?: /.test(line));
      if (!any && found !== undefined && exitCode === 1) {
        if (_ !== ioPath) return ee("rewritten_input_unopenable");
        return {
          success: false,
          error: {
            reason: "pdftoppm_input_error",
            message: `Could not render PDF: ${found.replaceAll(T, () => ioPath)}`,
          },
        };
      }
      if (!any && Te.startsWith("Permission Error: "))
        return {
          success: false,
          error: {
            reason: "pdftoppm_input_error",
            message: `Could not render PDF: ${Te}`,
          },
        };
      return ee(classifyPdftoppmStderr(stderr));
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
    let S;
    if (storageV5 !== undefined) {
      let T = await listPdfSidecarPages(storageV5, outputDir, b);
      if (!T.ok)
        return {
          success: false,
          error: {
            reason: "unknown",
            message: `Failed to list extracted PDF pages: ${T.code}`,
            category: `storage_list_${T.code}`,
            site: "extract",
          },
        };
      if (T.names.length === 0 && !T.directoryExists)
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
      S = T.names;
    } else S = (await readdir(outputDir)).filter((G) => G.endsWith(".jpg")).sort();
    if (S.length === 0)
      return {
        success: false,
        error: {
          reason: "corrupted",
          message: "pdftoppm produced no output pages. The PDF may be invalid.",
        },
      };
    let count = S.length;
    return {
      success: true,
      data: {
        type: "parts",
        file: {
          filePath: ioPath,
          originalSize,
          outputDir,
          count,
        },
        ...(b !== undefined && {
          v5SidecarScope: {
            ...b,
            pageNames: S,
          },
        }),
      },
    };
  } catch (error) {
    let path = error && typeof error === "object" && "path" in error ? error.path : undefined;
    if (error instanceof AbortError || (isSadFsErrno(error) && (path === ioPath || path === undefined)))
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
//@ chunk-t0gq9gyw.js:55214-55637 layout
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
//@ chunk-t0gq9gyw.js:55637-55773 layout
/**
 * 把 pdftoppm 的 stderr 归类（internal_error、io_output、syntax_diagnostics 等）。
 */
function classifyPdftoppmStderr(stderr) {
  if (stderr.trim() === "") return "empty_stderr";
  let lines = stderr.split(/\r?\n/);
  return PDFTOPPM_STDERR_CATEGORIES.find(([o]) => lines.some((line) => o.test(line)))?.[1] ?? "other";
}
//@ chunk-t0gq9gyw.js:55773-55917 layout
function escapeNonPrintableBytes(e) {
  return Array.from(Buffer.from(e, "utf8"), (n) =>
    n < 32 || n >= 127 ? `<${n.toString(16).padStart(2, "0")}>` : String.fromCharCode(n),
  ).join("");
}
//@ chunk-t0gq9gyw.js:55917-55968 layout
function fsErrorCategory(error) {
  return `fs_wrapped_${sanitizeErrnoForTelemetry(error) ?? "none"}`;
}
//@ chunk-t0gq9gyw.js:55968-55993 placement
var LISTCAPEXCEEDED = "ListCapExceeded";
//@ chunk-t0gq9gyw.js:55993-56224 placement
function getPdfExtractionKey(e) {
  let n = toolResultsDir();
  if (dirname(e) !== n)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `PDF extraction directory is outside the session tool-results store: ${e}`,
      "pdf extraction dir outside tool-results",
    );
  return {
    projectKey: getProjectKey(getOriginalCwd_2()),
    sessionId: getSessionId(),
    relPath: [TOOL_RESULTS_SUBDIR, basename(e)],
  };
}
//@ chunk-t0gq9gyw.js:56224-57275 placement
/**
 * 列出 PDF 提取的 sidecar 页图。
 */
async function listPdfSidecarPages(e, n, r) {
  let o = r ?? getPdfExtractionKey(n);
  let { projectKey, sessionId, relPath } = o;
  let u = [];
  let allPages = await readAllPages(
    (cursor) =>
      e.listEntries(
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
    (w) => {
      for (let E of w) {
        if (E.kind !== "key" || E.key.namespace !== "sidecar") continue;
        let last = E.key.relPath.at(-1);
        if (last === undefined || E.key.relPath.length !== relPath.length + 1) continue;
        if (!last.endsWith(".jpg")) continue;
        u.push(last);
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
  u.sort();
  let y = true;
  if (u.length === 0) {
    y = false;
    let last = relPath.at(-1);
    let allPages = await readAllPages(
      (cursor) =>
        e.listEntries(
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
      (h) => {
        y ||= h.some(
          (b) =>
            b.kind === "scope" &&
            b.scope.namespace === "sidecar" &&
            (b.scope.relPath ?? []).length === relPath.length &&
            b.scope.relPath?.at(-1) === last,
        );
      },
      {
        until: () => y,
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
    names: u,
    directoryExists: y,
    scope: o,
  };
}
//@ chunk-cne5hsvz.js:19054-19108 fingerprint = getPDFPageCount (0.355)
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
