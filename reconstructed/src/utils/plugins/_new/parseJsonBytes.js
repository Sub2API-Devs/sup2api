/**
 * utils/plugins/_new/parseJsonBytes.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vr8smdd9.js (1)
 * attribution: sole-consumer-new 1
 */
import { parseAndValidateManifestFromText } from "../../dxt/helpers.js";

/**
 * 把字节数组按 UTF-8 解码后解析为 JSON（mcpb/dxt 清单读取用）。
 */
//@ chunk-vr8smdd9.js:6161-6229 sole-consumer-new
async function parseJsonBytes(e) {
  let decode = new TextDecoder().decode(e);
  return parseAndValidateManifestFromText(decode);
}

export { parseJsonBytes };
