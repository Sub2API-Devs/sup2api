/**
 * tools/BriefTool/prompt.ts
 *
 * SendUserMessage/Brief 名称常量、description、prompt 与主动沟通段落
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BriefTool/prompt.ts
 * pieces: chunk-f5te1san.js (1)
 * attribution: facade-exports 1
 */
//@ chunk-f5te1san.js:191-2834 facade-exports (2.1.88 match: BRIEF_PROACTIVE_SECTION, 0.627)
/**
 * SendUserMessage/Brief 名称常量、description、两版 prompt 与"未调用即结束回合"的提示。
 */
var BRIEF_TOOL_NAME = "SendUserMessage";
var LEGACY_BRIEF_TOOL_NAME = "Brief";
var BRIEF_ENFORCE_SENTINEL = "You ended the turn without calling SendUserMessage.";
var DESCRIPTION = "Send a message to the user";
var BRIEF_TOOL_PROMPT =
  "Send a message the user will read. Text outside this tool is visible in the detail view, but most won't open it \u2014 the answer lives here.\n\n`message` supports markdown. `attachments` accepts two forms per entry: a file path string (absolute or cwd-relative) for a file you can read here \u2014 images, diffs, logs \u2014 or the exact {file_uuid, file_name, size, is_image} object a device tool like `attach_file` returned to you. Use the path form when the file is on your working filesystem; use the object form when the user's device already uploaded the file and handed you a reference \u2014 pass that object through verbatim, don't try to path it.\n\n`status` labels intent: 'normal' when replying to what they just asked; 'proactive' when you're initiating \u2014 a scheduled task finished, a blocker surfaced during background work, you need input on something they haven't asked about. Set it honestly; downstream routing uses it.";
var PEWTER_OWL_TOOL_PROMPT =
  "Send a message the user will read verbatim. Use this for content they need to see exactly as written between tool calls \u2014 a generated code snippet, a specific value, a direct reply to something they asked mid-task. Don't use it for routine narration of what you're about to do, or for your final answer \u2014 normal text reaches them for those.";
var BRIEF_PROACTIVE_SECTION = `## Talking to the user

${"SendUserMessage"} is where your replies go. Text outside it is visible if the user expands the detail view, but most won't \u2014 assume unread. Anything you want them to actually see goes through ${"SendUserMessage"}. The failure mode: the real answer lives in plain text while ${"SendUserMessage"} just says "done!" \u2014 they see "done!" and miss everything.

So: every time the user says something, the reply they actually read comes through ${"SendUserMessage"}. Even for "hi". Even for "thanks".

If you can answer right away, send the answer. If you need to go look \u2014 run a command, read files, check something \u2014 ack first in one line ("On it \u2014 checking the test output"), then work, then send the result. Without the ack they're staring at a spinner.

For longer work: ack \u2192 work \u2192 result. Between those, send a checkpoint when something useful happened \u2014 a decision you made, a surprise you hit, a phase boundary. Skip the filler ("running tests...") \u2014 a checkpoint earns its place by carrying information.

Keep messages tight \u2014 the decision, the file:line, the PR number. Second person always ("your config"), never third.`;
export {
  BRIEF_ENFORCE_SENTINEL,
  BRIEF_TOOL_NAME,
  LEGACY_BRIEF_TOOL_NAME,
  DESCRIPTION,
  BRIEF_TOOL_PROMPT,
  PEWTER_OWL_TOOL_PROMPT,
  BRIEF_PROACTIVE_SECTION,
};
