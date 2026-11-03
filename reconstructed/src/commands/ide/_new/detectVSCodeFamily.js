/**
 * commands/ide/_new/detectVSCodeFamily.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: sole-consumer-new 1
 */

/**
 * 按 IDE 名判断属于哪个 VS Code 系：windsurf/devin→windsurf，cursor→cursor，VS Code/VSCodium/Code-OSS（非 Insiders）→vscode，否则 null。
 */
//@ chunk-e6aww6q8.js:3244299-3244625 sole-consumer-new
function detectVSCodeFamily(e) {
  let lower = e.toLowerCase();
  if (lower.includes("windsurf") || lower.includes("devin")) return "windsurf";
  if (lower.includes("cursor")) return "cursor";
  if (
    !lower.includes("insiders") &&
    (lower.includes("vscode") ||
      lower.includes("vs code") ||
      lower.includes("visual studio code") ||
      lower.includes("vscodium") ||
      lower.includes("code - oss"))
  )
    return "vscode";
  return null;
}

export { detectVSCodeFamily };
