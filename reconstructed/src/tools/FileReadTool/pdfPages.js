/**
 * tools/FileReadTool/pdfPages.ts
 *
 * 2.1.316 新增：PDF 页面提取结果读取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import * as pathModule from "path";
import * as pathModule_2 from "path";
import * as pathModule_3 from "path";
import { toolResultsDir } from "../../utils/toolResultStorage.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { listPdfSidecarPages } from "../../utils/pdf.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";

/**
 * 读取 PDF 提取后的页面文件，确保提取目录位于会话工具结果目录内。
 */
//@ chunk-e6aww6q8.js:3193372-3194472 placement
async function readPdfExtractedPages(e, n, r) {
  if (r === void 0 && pathModule_2.dirname(n) !== toolResultsDir())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `PDF extraction directory is outside the session tool-results store: ${n}`,
      "pdf extraction dir outside tool-results",
    );
  let s, h;
  if (r?.pageNames !== void 0) {
    if (r.pageNames.length === 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `PDF extraction handed over no page names: ${n}`,
        "pdf extraction no page names",
      );
    ((s = r), (h = r.pageNames));
  } else {
    let L = await listPdfSidecarPages(e, n, r);
    if (!L.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Failed to list extracted PDF pages: ${L.code} (${n})`,
        "pdf extraction listing failed",
      );
    if (L.names.length === 0 && !L.directoryExists)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `PDF extraction directory disappeared before readback: ${n}`,
        "pdf extraction dir missing",
      );
    ((s = L.scope), (h = L.names));
  }
  let { projectKey: projectKey, sessionId: sessionId, relPath: relPath } = s;
  return Promise.all(
    h.map(async (L) => {
      let read = await e.read([STORAGE_SPACES.sidecar(projectKey, sessionId, [...relPath, L])]);
      if (!read.ok)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Failed to read extracted PDF page: ${read.error.code} (${pathModule_2.join(n, L)})`,
          "pdf extraction page read failed",
        );
      let q = read.value.items[0];
      if (q === void 0 || !q.found)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Extracted PDF page disappeared during read: ${pathModule_2.join(n, L)}`,
          "pdf extraction page missing",
        );
      return Buffer.from(q.value);
    }),
  );
}

export { readPdfExtractedPages };
