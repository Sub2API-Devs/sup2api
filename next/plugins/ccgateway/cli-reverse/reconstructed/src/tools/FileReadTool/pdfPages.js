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
import "path";
import * as pathModule_2 from "path";
import "path";
import { toolResultsDir } from "../../utils/toolResultStorage.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { listPdfSidecarPages } from "../../utils/pdf.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";

//@ chunk-e6aww6q8.js:3193372-3194472 placement
/**
 * 读取 PDF 提取后的页面文件，确保提取目录位于会话工具结果目录内。
 */
async function readPdfExtractedPages(storage, outputDir, scope) {
  if (scope === undefined && pathModule_2.dirname(outputDir) !== toolResultsDir())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `PDF extraction directory is outside the session tool-results store: ${outputDir}`,
      "pdf extraction dir outside tool-results",
    );
  let scope_2;
  let pageNames;
  if (scope?.pageNames !== undefined) {
    if (scope.pageNames.length === 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `PDF extraction handed over no page names: ${outputDir}`,
        "pdf extraction no page names",
      );
    scope_2 = scope;
    pageNames = scope.pageNames;
  } else {
    let listing = await listPdfSidecarPages(storage, outputDir, scope);
    if (!listing.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Failed to list extracted PDF pages: ${listing.code} (${outputDir})`,
        "pdf extraction listing failed",
      );
    if (listing.names.length === 0 && !listing.directoryExists)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `PDF extraction directory disappeared before readback: ${outputDir}`,
        "pdf extraction dir missing",
      );
    scope_2 = listing.scope;
    pageNames = listing.names;
  }
  let { projectKey, sessionId, relPath } = scope_2;
  return Promise.all(
    pageNames.map(async (pageName) => {
      let readResult = await storage.read([
        STORAGE_SPACES.sidecar(projectKey, sessionId, [...relPath, pageName]),
      ]);
      if (!readResult.ok)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Failed to read extracted PDF page: ${readResult.error.code} (${pathModule_2.join(outputDir, pageName)})`,
          "pdf extraction page read failed",
        );
      let item = readResult.value.items[0];
      if (item === undefined || !item.found)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Extracted PDF page disappeared during read: ${pathModule_2.join(outputDir, pageName)}`,
          "pdf extraction page missing",
        );
      return Buffer.from(item.value);
    }),
  );
}
export { readPdfExtractedPages };
