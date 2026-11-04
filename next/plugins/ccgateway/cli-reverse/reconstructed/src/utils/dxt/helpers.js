/**
 * utils/dxt/helpers.ts
 *
 * MCPB/DXT 包 manifest 的解码、JSON 解析与 schema 校验。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/dxt/helpers.ts
 * pieces: chunk-08945j39.js (1), chunk-vr8smdd9.js (3)
 * attribution: fingerprint 3, placement 1
 */
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, errorMessage } from "../errors.js";
import { jsonParse } from "../slowOperations.js";
import { STREAM_READ_CHUNK_BYTES } from "../../remote/SessionsV2Client.js";

//@ chunk-vr8smdd9.js:5691-6046 fingerprint (2.1.88 match: validateManifest, 0.754)
/**
 * 用 @anthropic-ai/mcpb 的 schema 校验 MCPB manifest，失败抛带细节的错误。
 */
async function validateManifest(manifestJson) {
  let { McpbManifestSchema } =
    await import("../../../vendor/@anthropic-ai/mcpb/dist/McpbManifestSchema.lazy.js");
  let parseResult = McpbManifestSchema.safeParse(manifestJson);
  if (!parseResult.success) {
    let errors = parseResult.error.flatten();
    let errorMessages = [
      ...Object.entries(errors.fieldErrors).map(([field, errs]) => `${field}: ${errs?.join(", ")}`),
      ...(errors.formErrors || []),
    ]
      .filter(Boolean)
      .join("; ");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Invalid manifest: ${errorMessages}`,
      "MCPB manifest schema validation failed",
    );
  }
  return parseResult.data;
}
//@ chunk-vr8smdd9.js:6046-6161 fingerprint (2.1.88 match: parseAndValidateManifestFromText, 1)
/**
 * 解析 MCPB manifest.json 文本并按 MCPB schema 校验。
 */
async function parseAndValidateManifestFromText(manifestText) {
  let manifestJson;
  try {
    manifestJson = jsonParse(manifestText);
  } catch (error) {
    throw Error(`Invalid JSON in manifest.json: ${errorMessage(error)}`);
  }
  return validateManifest(manifestJson);
}
//@ chunk-vr8smdd9.js:6161-6229 placement
/**
 * 把字节数组按 UTF-8 解码后解析为 JSON（mcpb/dxt 清单读取用）。
 */
async function parseJsonBytes(manifestData) {
  let manifestText = new TextDecoder().decode(manifestData);
  return parseAndValidateManifestFromText(manifestText);
}
//@ chunk-08945j39.js:34895-35221 fingerprint (2.1.88 match: parseAndValidateManifestFromBytes, 0.337)
async function parseAndValidateManifestFromBytes(manifestData) {
  let reader = manifestData.body?.getReader();
  if (!reader) return;
  try {
    let uint8Array = new Uint8Array(STREAM_READ_CHUNK_BYTES);
    let totalBytes = 0;
    for (;;) {
      let { done, value: chunk } = await reader.read();
      if (done || !chunk) break;
      let min = Math.min(chunk.length, STREAM_READ_CHUNK_BYTES - totalBytes);
      uint8Array.set(chunk.subarray(0, min), totalBytes);
      totalBytes += min;
      if (totalBytes >= STREAM_READ_CHUNK_BYTES) break;
    }
    return jsonParse(new TextDecoder().decode(uint8Array.subarray(0, totalBytes)));
  } catch {
    return;
  } finally {
    reader.cancel().catch(() => {});
  }
}
export { parseAndValidateManifestFromBytes, parseJsonBytes };
