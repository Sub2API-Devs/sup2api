/**
 * utils/sandbox/deniesOnAnotherHost.ts
 *
 * 2.1.316 新增（门面模块 describeDeniesOnAnotherHost）。沙箱拒绝在另一主机上的描述。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-scjksyt8.js (3)
 * attribution: placement 3
 */
import { stripVTControlCharacters } from "util";
import { replaceControlChars } from "../resultError.js";
import { SandboxManager } from "./sandbox-adapter.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { reportSandboxErrorUnderStandIn } from "./sandboxErrors.js";

//@ chunk-scjksyt8.js:386-511 placement
/**
 * 清洗控制字符后列出前几项，超出部分显示为"(N more)"。
 */
function summarizeList(entries, maxEntries = 3) {
  let mapped = entries.map((entry) => replaceControlChars(stripVTControlCharacters(entry)).trim());
  let joined = mapped.slice(0, maxEntries).join(", ");
  let remainingCount = mapped.length - maxEntries;
  return remainingCount > 0 ? `${joined} (${remainingCount} more)` : joined;
}
//@ chunk-scjksyt8.js:511-1299 placement
function describeDeniesOnAnotherHost(maxEntries = Number.POSITIVE_INFINITY) {
  try {
    if (!SandboxManager.isSandboxingEnabled()) return;
    let deniesDroppedForAnotherHost = SandboxManager.getDeniesDroppedForAnotherHost();
    if (deniesDroppedForAnotherHost.length === 0) return;
    let baseFix = `The sandbox would contact that computer before each command, so it leaves these entries out. An entry that the list calls a ${FILE_READ_TOOL_NAME} rule or an ${FILE_EDIT_TOOL_NAME} rule still applies to the file tools. To have the sandbox block the paths, start Claude Code in a folder on that computer.`;
    return {
      issue: `Sandbox deny paths on another computer are not enforced, so sandboxed commands are not blocked from them: ${summarizeList(deniesDroppedForAnotherHost, maxEntries)}`,
      fix: deniesDroppedForAnotherHost.some((entry) => entry.endsWith(" from policySettings"))
        ? `${baseFix} If an administrator manages the entries from policySettings, tell them that the sandbox does not enforce these.`
        : baseFix,
    };
  } catch (error) {
    reportSandboxErrorUnderStandIn(error, "deniesOnAnotherHostNotDescribed");
    return;
  }
}
//@ chunk-scjksyt8.js:1299-1425 placement (2.1.88 match: _temp10, 0.605)
function warnOfDeniesOnAnotherHostOnStderr() {
  let issue = describeDeniesOnAnotherHost(3);
  if (issue)
    process.stderr.write(`
\u26A0 ${issue.issue}
  ${issue.fix} \`claude doctor\` lists every entry.

`);
}
export { warnOfDeniesOnAnotherHostOnStderr, summarizeList, describeDeniesOnAnotherHost };
