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

/**
 * 清洗控制字符后列出前几项，超出部分显示为"(N more)"。
 */
//@ chunk-scjksyt8.js:386-511 placement
function summarizeList(t, e = 3) {
  let mapped = t.map((s) => replaceControlChars(stripVTControlCharacters(s)).trim()),
    joined = mapped.slice(0, e).join(", "),
    n = mapped.length - e;
  return n > 0 ? `${joined} (${n} more)` : joined;
}
//@ chunk-scjksyt8.js:511-1299 placement
function describeDeniesOnAnotherHost(t = Number.POSITIVE_INFINITY) {
  try {
    if (!SandboxManager.isSandboxingEnabled()) return;
    let deniesDroppedForAnotherHost = SandboxManager.getDeniesDroppedForAnotherHost();
    if (deniesDroppedForAnotherHost.length === 0) return;
    let r = `The sandbox would contact that computer before each command, so it leaves these entries out. An entry that the list calls a ${FILE_READ_TOOL_NAME} rule or an ${FILE_EDIT_TOOL_NAME} rule still applies to the file tools. To have the sandbox block the paths, start Claude Code in a folder on that computer.`;
    return {
      issue: `Sandbox deny paths on another computer are not enforced, so sandboxed commands are not blocked from them: ${summarizeList(deniesDroppedForAnotherHost, t)}`,
      fix: deniesDroppedForAnotherHost.some((o) => o.endsWith(" from policySettings"))
        ? `${r} If an administrator manages the entries from policySettings, tell them that the sandbox does not enforce these.`
        : r,
    };
  } catch (error) {
    reportSandboxErrorUnderStandIn(error, "deniesOnAnotherHostNotDescribed");
    return;
  }
}
//@ chunk-scjksyt8.js:1299-1425 placement = _temp10 (0.605)
function warnOfDeniesOnAnotherHostOnStderr() {
  let t = describeDeniesOnAnotherHost(3);
  if (t)
    process.stderr.write(`
\u26A0 ${t.issue}
  ${t.fix} \`claude doctor\` lists every entry.

`);
}

export { warnOfDeniesOnAnotherHostOnStderr, summarizeList, describeDeniesOnAnotherHost };
