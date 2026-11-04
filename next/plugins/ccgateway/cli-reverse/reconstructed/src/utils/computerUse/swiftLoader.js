/**
 * utils/computerUse/swiftLoader.ts
 *
 * 加载 @ant/computer-use-swift；linux 构建恒抛 macOS-only。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/computerUse/swiftLoader.ts
 * pieces: chunk-ha3km179.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-ha3km179.js:51099-51167 fingerprint = requireComputerUseSwift (0.683)
/**
 * linux 构建里 @ant/computer-use-swift 不可用，直接抛 "macOS-only"。
 */
function requireComputerUseSwift() {
  throw Error("@ant/computer-use-swift is macOS-only");
}
export { requireComputerUseSwift };
