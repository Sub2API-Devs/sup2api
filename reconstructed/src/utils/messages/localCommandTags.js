/**
 * utils/messages/localCommandTags.ts
 *
 * 2.1.316 新增：本地命令标签解析。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bwbq4xvm.js (9)
 * attribution: placement 9
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  LOCAL_COMMAND_STDOUT,
  LOCAL_COMMAND_STDERR,
  BASH_INPUT,
  BASH_STDOUT,
  BASH_STDERR,
  TASK_NOTIFICATION,
  COMMAND_MESSAGE,
  COMMAND_NAME,
  LOCAL_COMMAND_CAVEAT,
} from "../../constants/xml.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-bwbq4xvm.js:172888-172949 placement
var ForwardedIntentSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bwbq4xvm.js:172888", () => {
  ForwardedIntentSchema = DoctorLazy(() =>
    objectSchema({
      lineage: stringSchema().min(1),
      source: unknown().optional(),
    }),
  );
});
//@ chunk-bwbq4xvm.js:172949-173121 placement
/**
 * 解析 queued_command 上的 forwardedIntent：{lineage, source}，source 只认 typed/relay/owner，其余记为 unattributed。
 */
function parseForwardedIntent(forwardedIntent) {
  let parsed = ForwardedIntentSchema().safeParse(forwardedIntent);
  if (!parsed.success) return;
  let { lineage, source } = parsed.data;
  return {
    lineage,
    source: source === "typed" || source === "relay" || source === "owner" ? source : "unattributed",
  };
}
//@ chunk-bwbq4xvm.js:173121-173203 placement
function isForwardedQueuedCommand(attachment) {
  return (
    attachment.type === "queued_command" && parseForwardedIntent(attachment.forwardedIntent) !== undefined
  );
}
//@ chunk-bwbq4xvm.js:173203-173382 placement
/**
 * 文本是否以本地命令产生的标签开头（命令输出、stdout/stderr、caveat、bash 输入等系统包装标签）。
 */
function isLocalCommandMarkup(content) {
  return (
    content.startsWith(`<${LOCAL_COMMAND_STDOUT}>`) ||
    content.startsWith(`<${LOCAL_COMMAND_STDERR}>`) ||
    isLocalCommandRecordTag(content) ||
    content.startsWith(`<${BASH_INPUT}>`) ||
    content.startsWith(`<${BASH_STDOUT}>`) ||
    content.startsWith(`<${BASH_STDERR}>`) ||
    content.startsWith(`<${TASK_NOTIFICATION}>`)
  );
}
//@ chunk-bwbq4xvm.js:173382-173453 placement
function isLocalCommandRecordTag(text) {
  return text.startsWith(`<${COMMAND_MESSAGE}>`) || text.startsWith(`<${COMMAND_NAME}>`);
}
//@ chunk-bwbq4xvm.js:173453-173546 placement
var LOCAL_COMMAND_TAG_KINDS = [
  [`<${COMMAND_NAME}>`, "record"],
  [`<${LOCAL_COMMAND_STDOUT}>`, "output"],
  [`<${LOCAL_COMMAND_STDERR}>`, "output"],
  [`<${LOCAL_COMMAND_CAVEAT}>`, "caveat"],
];
//@ chunk-bwbq4xvm.js:173546-173749 placement
/**
 * 取消息最后一段文本，按开头标签判断它是 record/output/caveat 哪类本地命令包装。
 */
function localCommandTagKindOf(message) {
  let content = message.message?.content;
  let text = Array.isArray(content)
    ? content.findLast((block) => block?.type === "text")?.text
    : typeof content === "string"
      ? content
      : undefined;
  if (typeof text !== "string") return;
  return LOCAL_COMMAND_TAG_KINDS.find(([prefix]) => text.startsWith(prefix))?.[1];
}
//@ chunk-bwbq4xvm.js:173749-173788 placement
function isLocalCommandMessage(message) {
  return localCommandTagKindOf(message) !== undefined;
}
//@ chunk-bwbq4xvm.js:173788-174061 placement
function bashCommandTagKindOf(message) {
  let content = message.message?.content;
  let text = Array.isArray(content)
    ? content.findLast((block) => block?.type === "text")?.text
    : typeof content === "string"
      ? content
      : undefined;
  if (typeof text !== "string") return;
  if (text.startsWith(`<${BASH_INPUT}>`)) return "input";
  return text.startsWith(`<${BASH_STDOUT}>`) || text.startsWith(`<${BASH_STDERR}>`) ? "output" : undefined;
}
export {
  isForwardedQueuedCommand,
  isLocalCommandMarkup,
  bashCommandTagKindOf,
  localCommandTagKindOf,
  isLocalCommandMessage,
  parseForwardedIntent,
};
