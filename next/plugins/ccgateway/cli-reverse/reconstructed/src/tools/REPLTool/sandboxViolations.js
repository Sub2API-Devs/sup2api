/**
 * tools/REPLTool/sandboxViolations.ts
 *
 * 从 stderr 里取出 <sandbox_violations> 段并判断沙箱执行模式（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { AGENT } from "../AgentTool/constants.js";
import { SENDMESSAGE } from "../SendMessageTool/constants.js";
import { SKILL } from "../SkillTool/skillToolNames.js";
import { APPIFACT_REPL_TOOL_NAME } from "../AppifactReplTool/prompt.js";
import { POLL } from "../PollTool/prompt.js";
import { isScrubEnabled, isScrubSandboxAvailable } from "../../utils/subprocessEnv.js";
import { SandboxManager, getEffectiveFilesystemPolicy } from "../../utils/sandbox/sandbox-adapter.js";

//@ chunk-n51jggtb.js:93041-93096 placement
/**
 * 内层调用标记常量与需要特殊处理的内置工具集合。
 */
var REPL_INNER_CALL = "repl-inner-call";
var REPL_INNER_TOOLS = new Set([AGENT, SENDMESSAGE, SKILL, APPIFACT_REPL_TOOL_NAME, POLL]);
//@ chunk-n51jggtb.js:93096-93172 placement
/**
 * 判断当前是否按沙箱方式执行（未放宽）。
 */
function isScrubActive() {
  return (
    (isScrubEnabled() && isScrubSandboxAvailable()) ||
    (SandboxManager.isSandboxingEnabled() && getEffectiveFilesystemPolicy() !== "relaxed")
  );
}
//@ chunk-n51jggtb.js:93172-93477 placement
/**
 * 从 stderr 里截出 <sandbox_violations> 内容。
 */
function extractSandboxViolations(stderr) {
  let index = stderr.lastIndexOf(`
<sandbox_violations>`);
  while (
    index >= 0 &&
    !stderr.startsWith(
      `
`,
      index + 21,
    ) &&
    !stderr.startsWith(
      `\r
`,
      index + 21,
    )
  )
    index =
      index === 0
        ? -1
        : stderr.lastIndexOf(
            `
<sandbox_violations>`,
            index - 1,
          );
  if (index < 0) return "";
  let body = stderr.slice(index + 21);
  let endIndex = body.indexOf("</sandbox_violations>");
  return (endIndex < 0 ? body : body.slice(0, endIndex))
    .replace(
      /\r\n/g,
      `
`,
    )
    .trim();
}
export { isScrubActive, REPL_INNER_TOOLS, REPL_INNER_CALL, extractSandboxViolations };
