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
import {
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
} from "fs";
import {
  win32,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
} from "path";
import {
  mkdtemp,
  rm,
  readdir,
  readdir as readdir_2,
  copyFile,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  mkdir,
  mkdir as mkdir_2,
} from "fs/promises";
import { randomUUID } from "crypto";
import { vSr, OMn, H8 } from "./truncateGraphemes.js";
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
import { J1e } from "./fsSafety/pathRevalidation.js";
import { INHERITED_FD_PATH, execFileNoThrow } from "./execFileNoThrow.js";
import { whichAsync } from "./which.js";
import { logForDebugging } from "./debug.js";
import { logError } from "./log.js";
import { raceWithAbortSignal } from "./sleep.js";
import { PDF_SCRATCH_DIR_PREFIX, tmpdir } from "./tempDir.js";
import { registerCleanup } from "./cleanupRegistry.js";
import { retryFsOp } from "./atomicPublishWrite.js";
import { AI, TRANSIENT_FS_ERRORS } from "./plugins/safeCopy.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getOriginalCwd as getOriginalCwd_2, getSessionId } from "../bootstrap/state.js";
import { toolResultsDir, TOOL_RESULTS_SUBDIR } from "./toolResultStorage.js";
import { plural } from "./stringUtils.js";
import { getProjectKey } from "./sessionStoragePortable.js";
import { readAllPages } from "./pagedRead.js";
import { getPreSettingsEnvHonoringLiveDeletions } from "./managedEnvApply.js";

/**
 * 把页区间描述为文本（page n / pages a-b / pages a-）。
 */
//@ chunk-t0gq9gyw.js:46537-46713 affinity
function describePageRange(e) {
  let { firstPage: firstPage, lastPage: lastPage } = e ?? {};
  if (firstPage === void 0) return "page range";
  if (lastPage === void 0 || lastPage === 1 / 0) return `pages ${firstPage}-`;
  if (firstPage === lastPage) return `page ${firstPage}`;
  return `pages ${firstPage}-${lastPage}`;
}
/**
 * 整份读取 PDF 为 base64（大小上限内），返回 pdf 类型结果或带原因的错误。
 */
//@ chunk-t0gq9gyw.js:46713-47385 fingerprint = readPDF (0.929)
async function readPDF(e, n) {
  try {
    let originalSize = (await e.stat()).size;
    if (originalSize === 0)
      return { success: !1, error: { reason: "empty", message: `PDF file is empty: ${n}` } };
    if (originalSize > vSr)
      return {
        success: !1,
        error: {
          reason: "too_large",
          message: `PDF file exceeds maximum allowed size of ${formatFileSize(vSr)}.`,
        },
      };
    let { bytes: bytes } = await readHandleBounded(e, originalSize, originalSize);
    if (!bytes.subarray(0, 5).toString("ascii").startsWith("%PDF-"))
      return {
        success: !1,
        error: { reason: "corrupted", message: `File is not a valid PDF (missing %PDF- header): ${n}` },
      };
    let base64 = bytes.toString("base64");
    return {
      success: !0,
      data: { type: "pdf", file: { filePath: n, base64: base64, originalSize: originalSize } },
    };
  } catch (error) {
    if (isSadFsErrno(error)) throw error;
    return {
      success: !1,
      error: { reason: "unknown", message: errorMessage(error), category: Ve(error), site: "read" },
    };
  }
}
/**
 * 用 pdfinfo 取 PDF 页数：普通路径直接传；已打开的句柄优先继承 fd，否则（≤上限）读入内存经 stdin 传入；pdfinfo 不存在或文件过大时返回失败原因。
 */
//@ chunk-t0gq9gyw.js:47385-48067 layout
async function getPdfPageCount(e, n, r = "linux") {
  if (n === void 0) return runPdfinfo(toNamespacedPathIfLong(e, r), void 0);
  if (e === J1e(n.handle.fd))
    return runPdfinfo(INHERITED_FD_PATH, { inheritFd: n.handle.fd, abortSignal: n.signal });
  if ((await whichAsync("pdfinfo").catch(() => null)) === null)
    return { pageCount: null, pdfinfoFailure: { reason: "not_found" } };
  if (n.size > OMn) return { pageCount: null, pdfinfoFailure: { reason: "not_run" } };
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
        { level: "warn" },
      );
    else logError(error);
    return { pageCount: null, pdfinfoFailure: { reason: "not_run" } };
  }
}
/**
 * 执行 pdfinfo（10 秒超时），解析 "Pages:" 行；失败返回 pdfinfoFailure.reason（timeout/not_found/nonzero_exit/no_page_count/no_exit_status）。
 */
//@ chunk-t0gq9gyw.js:48067-48592 layout
async function runPdfinfo(e, n) {
  let {
    code: code,
    stdout: stdout,
    exitCode: exitCode,
    timedOut: timedOut,
  } = await execFileNoThrow("pdfinfo", [e], { timeout: PDFINFO_TIMEOUT_MS, useCwd: !1, ...n });
  if (code === 0) {
    let match = /^Pages:\s+(\d+)/m.exec(stdout);
    return match
      ? { pageCount: parseInt(match[1], 10) }
      : { pageCount: null, pdfinfoFailure: { reason: "no_page_count" } };
  }
  if (timedOut) return { pageCount: null, pdfinfoFailure: { reason: "timeout" } };
  if (exitCode !== void 0)
    return { pageCount: null, pdfinfoFailure: { reason: "nonzero_exit", exitCode: exitCode } };
  return {
    pageCount: null,
    pdfinfoFailure: {
      reason: (await whichAsync("pdfinfo").catch(() => null)) === null ? "not_found" : "no_exit_status",
    },
  };
}
/**
 * 把 pdfinfo 失败原因转成人读文字。
 */
//@ chunk-t0gq9gyw.js:48592-48949 layout
function describePdfinfoFailure(e) {
  switch (e.reason) {
    case "timeout":
      return "pdfinfo timed out";
    case "not_found":
      return "pdfinfo was not found";
    case "no_exit_status":
      return "pdfinfo did not run to completion";
    case "nonzero_exit":
      return `pdfinfo failed (exit code ${e.exitCode})`;
    case "no_page_count":
      return "pdfinfo did not report a page count";
    case "not_run":
      return "pdfinfo was not run";
  }
}
//@ chunk-t0gq9gyw.js:48949-49022 layout
function getPdfOpenFlags(e) {
  let n = e === "win32" ? 0 : (constants_3.O_NONBLOCK ?? 0);
  return constants_3.O_RDONLY | n;
}
//@ chunk-t0gq9gyw.js:49022-49058 layout
var WINDOWS_MAX_PATH = 259,
  PDFINFO_TIMEOUT_MS = 1e4,
  STDIN_PATH = "-",
  READ_CHUNK_BYTES = 1048576;
//@ chunk-t0gq9gyw.js:49058-49264 layout = readJSONLFile (1)
async function readJSONLFile(e, n, r) {
  let buf = Buffer.allocUnsafe(n),
    totalRead = 0;
  while (totalRead < n) {
    let read = e.read(buf, totalRead, Math.min(READ_CHUNK_BYTES, n - totalRead), totalRead),
      { bytesRead: bytesRead } =
        r === void 0 ? await read : await raceWithAbortSignal(read, r, () => new AbortError());
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
/**
 * 准备 PDF 页图输出前缀：Windows 上路径可能超过 MAX_PATH 时改在短临时目录渲染，之后 collect 移回、dispose 清理。
 */
//@ chunk-t0gq9gyw.js:49401-50077 layout
async function createPageImageOutput(e, { platform: platform, scratchRoot: scratchRoot }) {
  let o = {
      prefix: join(e, "page"),
      collect: () => Promise.resolve(),
      [Symbol.asyncDispose]: () => Promise.resolve(),
    },
    s = o.prefix.length + 1 + MAX_PAGE_NUMBER_DIGITS + 4;
  if (platform !== "win32" || s <= WINDOWS_MAX_PATH) return o;
  let a;
  try {
    a = await mkdtemp(join(scratchRoot(), PDF_SCRATCH_DIR_PREFIX));
  } catch (error) {
    return (
      logForDebugging(
        `PDF extraction: could not create a scratch directory under the temp dir (${getErrnoCode(error) ?? errorMessage(error)}); rendering page images directly into the tool-results directory`,
        { level: "warn" },
      ),
      o
    );
  }
  let c = () => rm(a, { recursive: !0, force: !0 }),
    u = registerCleanup(c);
  return {
    prefix: join(a, "p"),
    collect: () => movePageImages(a, e),
    [Symbol.asyncDispose]: () =>
      c().then(u, (p) =>
        logForDebugging(
          `PDF extraction: scratch directory not removed (${getErrnoCode(p) ?? errorMessage(p)}); removal is retried at exit`,
          { level: "warn" },
        ),
      ),
  };
}
/**
 * 把渲染出的 p-N.jpg 移到目标目录并改名为 pageN.jpg。
 */
//@ chunk-t0gq9gyw.js:50077-50296 layout
async function movePageImages(e, n) {
  let r = await readdir_2(e),
    found = (
      await Promise.allSettled(
        r
          .filter((a) => /^p-\d+\.jpg$/.test(a))
          .map((a) => moveFileWithCopyFallback(join(e, a), join(n, `page${a.slice(1)}`))),
      )
    ).find((a) => a.status === "rejected");
  if (found !== void 0) throw found.reason;
}
//@ chunk-t0gq9gyw.js:50296-50419 layout
async function moveFileWithCopyFallback(e, n) {
  try {
    await retryFsOp(e, n);
  } catch (error) {
    let o = getErrnoCode(error);
    if (o === void 0 || !(AI.has(o) || TRANSIENT_FS_ERRORS.has(o))) throw error;
    await copyFile(e, n);
  }
}
//@ chunk-t0gq9gyw.js:50419-50510 layout
class PdfToolAvailability {
  available = void 0;
  markAvailable() {
    this.available = !0;
  }
  reset() {
    this.available = void 0;
  }
}
//@ chunk-t0gq9gyw.js:50510-50535 layout
var pdfToolAvailabilityByHost = new HostScoped(() => new PdfToolAvailability());
//@ chunk-t0gq9gyw.js:50535-50572 layout
function getPdfToolAvailability() {
  return pdfToolAvailabilityByHost.of(getRootSession().host);
}
/**
 * 检测 pdftoppm 是否可用（pdftoppm -v，结果缓存）。
 */
//@ chunk-t0gq9gyw.js:50572-50782 fingerprint = isPdftoppmAvailable (0.749)
async function isPdftoppmAvailable() {
  let e = getPdfToolAvailability();
  if (e.available !== void 0) return e.available;
  let { code: code, stderr: stderr } = await execFileNoThrow("pdftoppm", ["-v"], {
      timeout: 5000,
      useCwd: !1,
    }),
    o = code === 0 || (code !== 127 && stderr.length > 0);
  if (o) e.markAvailable();
  return o;
}
/**
 * 用 pdftoppm 把指定页区间渲染为 JPEG 到临时目录，返回 parts 结果（页数、输出目录）。
 */
//@ chunk-t0gq9gyw.js:50782-55214 fingerprint = extractPDFPages (0.581)
async function extractPDFPages(e, n, r, o = { platform: "linux", scratchRoot: tmpdir }) {
  try {
    let s = n?.held !== void 0 && e === J1e(n.held.fd) ? n.held : void 0,
      a = s === void 0 ? n?.held : void 0,
      c = a ?? (await open(e, getPdfOpenFlags("linux"))),
      u = await c.stat().finally(() => (c === a ? void 0 : c.close()));
    if (!u.isFile())
      return { success: !1, error: { reason: "corrupted", message: `Path is not a regular file: ${e}` } };
    let originalSize = u.size;
    if (originalSize === 0)
      return { success: !1, error: { reason: "empty", message: `PDF file is empty: ${e}` } };
    if (originalSize > OMn)
      return {
        success: !1,
        error: {
          reason: "too_large",
          message: `PDF file exceeds maximum allowed size for text extraction (${formatFileSize(OMn)}).`,
        },
      };
    if (n?.signal?.aborted) throw new AbortError();
    if (!(await isPdftoppmAvailable()))
      return {
        success: !1,
        error: {
          reason: "unavailable",
          message:
            "pdftoppm is not installed. Install poppler-utils (e.g. `brew install poppler` or `apt-get install poppler-utils`) to enable PDF page rendering.",
        },
      };
    let w = a === void 0 ? void 0 : await readJSONLFile(a, originalSize, n?.signal),
      uuid = randomUUID(),
      outputDir = join(toolResultsDir(), `pdf-${uuid}`),
      b = r === void 0 ? void 0 : getPdfExtractionKey(outputDir);
    await mkdir(outputDir, { recursive: !0 });
    await using v = await createPageImageOutput(outputDir, o);
    let _ = s === void 0 ? toNamespacedPathIfLong(e, o.platform) : INHERITED_FD_PATH,
      args = ["-jpeg", "-r", "100"];
    if (n?.firstPage) args.push("-f", String(n.firstPage));
    if (n?.lastPage && n.lastPage !== 1 / 0) args.push("-l", String(n.lastPage));
    args.push(w === void 0 ? _ : STDIN_PATH, v.prefix);
    let {
      code: code,
      stderr: stderr,
      exitCode: exitCode,
    } = await execFileNoThrow("pdftoppm", args, {
      timeout: 120000,
      abortSignal: n?.signal,
      waitForExitAfterKill: !0,
      useCwd: !1,
      ...(w !== void 0 && { input: w }),
      ...(s !== void 0 && { inheritFd: s.fd }),
    });
    if (code !== 0) {
      if (n?.signal?.aborted && exitCode === void 0) throw new AbortError();
      let T = escapeNonPrintableBytes(_),
        joined = stderr
          .split(T)
          .map((q) => q.replaceAll(_, () => e))
          .join(e),
        ee = (q) => ({
          success: !1,
          error: {
            reason: "unknown",
            message: `pdftoppm failed: ${joined}`,
            category: q,
            site: "extract",
            exitCode: exitCode,
          },
        }),
        parts = stderr.split(/\r?\n/);
      if (parts.some((q) => PDFTOPPM_WRITE_FAILED_RE.test(q))) return ee(classifyPdftoppmStderr(stderr));
      let J = `I/O Error: Couldn't open file '${T}'`,
        found = parts.find((q) => {
          let trimEnd = q.trimEnd();
          return (
            trimEnd === J ||
            (trimEnd.startsWith(`${J}: `) &&
              !trimEnd.endsWith("'") &&
              !trimEnd.slice(J.length + 2).includes("': "))
          );
        }),
        replaced = parts
          .filter((q) => q !== found)
          .join(
            `
`,
          )
          .replaceAll(T, " ")
          .replaceAll(_, " ")
          .replaceAll(escapeNonPrintableBytes(v.prefix), " ")
          .replaceAll(v.prefix, " ");
      if (/password/i.test(replaced))
        return {
          success: !1,
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
            success: !1,
            error: {
              reason: "corrupted",
              message: "PDF reports 0 pages (empty page tree). The PDF may be invalid.",
            },
          };
        let min = Math.min(q, H8);
        return {
          success: !1,
          error: {
            reason: "page_out_of_range",
            message: `Requested ${describePageRange(n)} is outside the document (PDF has ${q} ${plural(q, "page")}). Use a range within 1-${q}, maximum ${H8} pages per request (e.g. pages: "1-${min}").`,
          },
        };
      }
      let se = /Syntax Error(?: \(\d+\))?: Couldn't (?:find trailer dictionary|read xref table)/i;
      if (/damaged|corrupt|invalid/i.test(replaced) || se.test(replaced))
        return { success: !1, error: { reason: "corrupted", message: "PDF file is corrupted or invalid." } };
      let Te = parts[0] ?? "",
        any = parts.some((q) => /^(Command Line Error|Internal Error)(?: \(\d+\))?: /.test(q));
      if (!any && found !== void 0 && exitCode === 1) {
        if (_ !== e) return ee("rewritten_input_unopenable");
        return {
          success: !1,
          error: {
            reason: "pdftoppm_input_error",
            message: `Could not render PDF: ${found.replaceAll(T, () => e)}`,
          },
        };
      }
      if (!any && Te.startsWith("Permission Error: "))
        return {
          success: !1,
          error: { reason: "pdftoppm_input_error", message: `Could not render PDF: ${Te}` },
        };
      return ee(classifyPdftoppmStderr(stderr));
    }
    try {
      await v.collect();
    } catch (error) {
      return {
        success: !1,
        error: {
          reason: "unknown",
          message: `Could not move the rendered PDF pages into ${outputDir} (${getErrnoCode(error) ?? "no error code"})`,
          category: Ve(error),
          site: "extract",
          exitCode: exitCode,
        },
      };
    }
    let S;
    if (r !== void 0) {
      let T = await listPdfSidecarPages(r, outputDir, b);
      if (!T.ok)
        return {
          success: !1,
          error: {
            reason: "unknown",
            message: `Failed to list extracted PDF pages: ${T.code}`,
            category: `storage_list_${T.code}`,
            site: "extract",
          },
        };
      if (T.names.length === 0 && !T.directoryExists)
        return {
          success: !1,
          error: {
            reason: "unknown",
            message: `Extraction directory missing after pdftoppm ran: ${outputDir}`,
            category: Ve({ code: "ENOENT" }),
            site: "extract",
          },
        };
      S = T.names;
    } else S = (await readdir_2(outputDir)).filter((G) => G.endsWith(".jpg")).sort();
    if (S.length === 0)
      return {
        success: !1,
        error: { reason: "corrupted", message: "pdftoppm produced no output pages. The PDF may be invalid." },
      };
    let pageCount = S.length;
    return {
      success: !0,
      data: {
        type: "parts",
        file: { filePath: e, originalSize: originalSize, outputDir: outputDir, count: pageCount },
        ...(b !== void 0 && { v5SidecarScope: { ...b, pageNames: S } }),
      },
    };
  } catch (error) {
    let a = error && typeof error === "object" && "path" in error ? error.path : void 0;
    if (error instanceof AbortError || (isSadFsErrno(error) && (a === e || a === void 0))) throw error;
    return {
      success: !1,
      error: { reason: "unknown", message: errorMessage(error), category: Ve(error), site: "extract" },
    };
  }
}
//@ chunk-t0gq9gyw.js:55214-55637 layout
var PDFTOPPM_WRITE_FAILED_RE = /^Could not write image to [\s\S]*; exiting\s*$/,
  PDFTOPPM_STDERR_CATEGORIES = [
    [/^Internal Error(?: \(\d+\))?: /, "internal_error"],
    [/^Command Line Error(?: \(\d+\))?: /, "command_line_error"],
    [PDFTOPPM_WRITE_FAILED_RE, "output_write_failed"],
    [/^Config Error(?: \(\d+\))?: /, "config_error"],
    [/^Unimplemented Feature(?: \(\d+\))?: /, "unimplemented_feature"],
    [/^I\/O Error(?: \(\d+\))?: /, "io_output"],
    [/^Syntax (?:Error|Warning)(?: \(\d+\))?: /, "syntax_diagnostics"],
  ];
/**
 * 把 pdftoppm 的 stderr 归类（internal_error、io_output、syntax_diagnostics 等）。
 */
//@ chunk-t0gq9gyw.js:55637-55773 layout
function classifyPdftoppmStderr(e) {
  if (e.trim() === "") return "empty_stderr";
  let parts = e.split(/\r?\n/);
  return PDFTOPPM_STDERR_CATEGORIES.find(([o]) => parts.some((s) => o.test(s)))?.[1] ?? "other";
}
//@ chunk-t0gq9gyw.js:55773-55917 layout
function escapeNonPrintableBytes(e) {
  return Array.from(Buffer.from(e, "utf8"), (n) =>
    n < 32 || n >= 127 ? `<${n.toString(16).padStart(2, "0")}>` : String.fromCharCode(n),
  ).join("");
}
//@ chunk-t0gq9gyw.js:55917-55968 layout
function Ve(e) {
  return `fs_wrapped_${sanitizeErrnoForTelemetry(e) ?? "none"}`;
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
/**
 * 列出 PDF 提取的 sidecar 页图。
 */
//@ chunk-t0gq9gyw.js:56224-57275 placement
async function listPdfSidecarPages(e, n, r) {
  let o = r ?? getPdfExtractionKey(n),
    { projectKey: projectKey, sessionId: sessionId, relPath: relPath } = o,
    u = [],
    p = await readAllPages(
      (w) =>
        e.listEntries(
          { namespace: "sidecar", projectKey: projectKey, sessionId: sessionId, relPath: relPath },
          { cursor: w, skipKeyStats: !0, skipScopeStats: !0 },
        ),
      (w) => {
        for (let E of w) {
          if (E.kind !== "key" || E.key.namespace !== "sidecar") continue;
          let at = E.key.relPath.at(-1);
          if (at === void 0 || E.key.relPath.length !== relPath.length + 1) continue;
          if (!at.endsWith(".jpg")) continue;
          u.push(at);
        }
      },
    );
  switch (p.status) {
    case "done":
      break;
    case "error":
      return { ok: !1, code: p.error.code };
    case "capped":
      return { ok: !1, code: LISTCAPEXCEEDED };
  }
  u.sort();
  let y = !0;
  if (u.length === 0) {
    y = !1;
    let at = relPath.at(-1),
      E = await readAllPages(
        (h) =>
          e.listEntries(
            {
              namespace: "sidecar",
              projectKey: projectKey,
              sessionId: sessionId,
              relPath: relPath.slice(0, -1),
            },
            { suffix: at, cursor: h, skipScopeStats: !0 },
          ),
        (h) => {
          y ||= h.some(
            (b) =>
              b.kind === "scope" &&
              b.scope.namespace === "sidecar" &&
              (b.scope.relPath ?? []).length === relPath.length &&
              b.scope.relPath?.at(-1) === at,
          );
        },
        { until: () => y },
      );
    switch (E.status) {
      case "done":
        break;
      case "error":
        return { ok: !1, code: E.error.code };
      case "capped":
        return { ok: !1, code: LISTCAPEXCEEDED };
    }
  }
  return { ok: !0, names: u, directoryExists: y, scope: o };
}
/**
 * pdftoppm/pdfinfo 子进程选项（用 cwd、精简 env）。误配名。
 */
//@ chunk-cne5hsvz.js:19054-19108 fingerprint = getPDFPageCount (0.355)
function getPDFPageCount() {
  return { useCwd: !0, env: getPreSettingsEnvHonoringLiveDeletions(), extendEnv: !1 };
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
