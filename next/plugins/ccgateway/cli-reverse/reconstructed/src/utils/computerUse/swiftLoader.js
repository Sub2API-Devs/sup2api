/**
 * utils/computerUse/swiftLoader.ts
 *
 * 加载 @ant/computer-use-swift；linux 构建恒抛 macOS-only。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/computerUse/swiftLoader.ts
 * pieces: chunk-w3ch4xq2.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-w3ch4xq2.js:55588-55656 fingerprint (2.1.88 match: requireComputerUseSwift, 0.683)
/**
 * linux 构建里 @ant/computer-use-swift 不可用，直接抛 "macOS-only"。
 */
function requireComputerUseSwift() {
  throw Error("@ant/computer-use-swift is macOS-only");
}
export { requireComputerUseSwift };
