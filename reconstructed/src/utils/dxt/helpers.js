/**
 * utils/dxt/helpers.ts
 *
 * MCPB/DXT 包 manifest 的解码、JSON 解析与 schema 校验。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/dxt/helpers.ts
 * pieces: chunk-08945j39.js (1), chunk-vr8smdd9.js (2)
 * attribution: fingerprint 3
 */
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, errorMessage } from "../errors.js";
import { jsonParse } from "../slowOperations.js";
import { Se } from "../../remote/SessionsV2Client.js";

/**
 * 用 @anthropic-ai/mcpb 的 schema 校验 MCPB manifest，失败抛带细节的错误。
 */
//@ chunk-vr8smdd9.js:5691-6046 fingerprint = validateManifest (0.754)
async function validateManifest(manifestJson) {
  let { McpbManifestSchema: McpbManifestSchema } = await import("./chunk-64s30qnv.js"),
    parseResult = McpbManifestSchema.safeParse(manifestJson);
  if (!parseResult.success) {
    let errors = parseResult.error.flatten(),
      errorMessages = [
        ...Object.entries(errors.fieldErrors).map(([f, m]) => `${f}: ${m?.join(", ")}`),
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
/**
 * 解析 MCPB manifest.json 文本并按 MCPB schema 校验。
 */
//@ chunk-vr8smdd9.js:6046-6161 fingerprint = parseAndValidateManifestFromText (1)
async function parseAndValidateManifestFromText(manifestText) {
  let manifestJson;
  try {
    manifestJson = jsonParse(manifestText);
  } catch (error) {
    throw Error(`Invalid JSON in manifest.json: ${errorMessage(error)}`);
  }
  return validateManifest(manifestJson);
}
//@ chunk-08945j39.js:34895-35221 fingerprint = parseAndValidateManifestFromBytes (0.337)
async function parseAndValidateManifestFromBytes(manifestData) {
  let n = manifestData.body?.getReader();
  if (!n) return;
  try {
    let uint8Array = new Uint8Array(Se),
      i = 0;
    for (;;) {
      let { done: r, value: S } = await n.read();
      if (r || !S) break;
      let min = Math.min(S.length, Se - i);
      if ((uint8Array.set(S.subarray(0, min), i), (i += min), i >= Se)) break;
    }
    return jsonParse(new TextDecoder().decode(uint8Array.subarray(0, i)));
  } catch {
    return;
  } finally {
    n.cancel().catch(() => {});
  }
}

export { parseAndValidateManifestFromBytes, parseAndValidateManifestFromText };
