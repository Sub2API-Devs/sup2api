/**
 * utils/shell/resolveDefaultShell.ts
 *
 * 按 settings.defaultShell 与 Git Bash/PowerShell 工具可用性决定默认 shell。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/shell/resolveDefaultShell.ts
 * pieces: chunk-rnaw3pc3.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { getInitialSettings_2 } from "../settings/settings.js";
import { isBashAvailable, isPowerShellToolEnabled } from "./shellToolUtils.js";

//@ chunk-rnaw3pc3.js:842-998 callgraph-fingerprint = resolveDefaultShell (0.757)
/**
 * 默认 shell：settings.defaultShell；选 bash 但没有 Git Bash 时改 powershell，选 powershell 但未启用 PowerShell 工具时改 bash；未设时有 bash 用 bash 否则 powershell。
 */
function resolveDefaultShell() {
  let defaultShell = getInitialSettings_2().defaultShell;
  if (defaultShell === "bash" && !isBashAvailable()) return "powershell";
  if (defaultShell === "powershell" && !isPowerShellToolEnabled()) return "bash";
  return defaultShell ?? (isBashAvailable() ? "bash" : "powershell");
}
export { resolveDefaultShell };
