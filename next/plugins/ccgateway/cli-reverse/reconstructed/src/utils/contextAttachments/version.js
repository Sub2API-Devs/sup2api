/**
 * utils/contextAttachments/version.ts
 *
 * 2.1.316 新增：版本附件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { ATTRIBUTION_HEADER_COMMITS, ATTRIBUTION_HEADER_PLACEHOLDER } from "./attribution.js";

//@ chunk-5xgkngpb.js:118939-118999 placement
/**
 * 判断文本是否以库更新提示的两种前缀之一开头。
 */
function isLibraryUpdateMessage(message) {
  return message.startsWith(ATTRIBUTION_HEADER_COMMITS) || message.startsWith(ATTRIBUTION_HEADER_PLACEHOLDER);
}
export { isLibraryUpdateMessage };
