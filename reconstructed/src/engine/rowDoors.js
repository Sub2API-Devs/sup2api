/**
 * engine/rowDoors.ts
 *
 * 2.1.316 新增：查询引擎的行入口。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1nk4j4sn.js (14)
 * attribution: placement 14
 */
import { originFromUnknown } from "../utils/messageOrigin.js";
import { classifyHookAttachmentSource } from "../utils/hooks/hookAttachmentTypes.js";
import { getToolUseIdOfMessage } from "../tools/utils.js";
import { COMMAND_NAME, COMMAND_MESSAGE, ARTIFACT_BLOCK_TAGS } from "../constants/xml.js";
import {
  summarizeMessageForExport,
  refuseSessionAppend,
  buildPluginAppendRow,
} from "../plugins/functionHooks/api/sessionAppend.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "../plugins/functionHooks/eventCatalog.js";
import { appendCoreOf } from "./sessionAppend.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import { currentSurfaceBinding } from "../plugins/functionHooks/surfaceBinding.js";

//@ chunk-1nk4j4sn.js:15636-16179 placement
/**
 * 判定消息作者类别：assistant→model，attachment 按来源，system→engine，user 里工具结果→tool，开场提示→coordinator，插件 note→plugin，否则按用户来源。
 */
function classifyMessageAuthor(e, o, r) {
  switch (e.type) {
    case "assistant":
      return {
        kind: "model",
        model: e.message.model,
      };
    case "attachment": {
      let { attachment } = e;
      return attachment.type === "queued_command"
        ? originFromUnknown(attachment.origin)
        : classifyHookAttachmentSource(attachment);
    }
    case "system":
      return {
        kind: "engine",
      };
    case "user":
      break;
  }
  let p = o === "tool-result" || o === "tool-message" ? getToolUseIdOfMessage(e) : undefined;
  if (p !== undefined)
    return {
      kind: "tool",
      tool: r.toolNameOf(p),
    };
  if (r.isOpeningPrompt)
    return {
      kind: "coordinator",
    };
  let origin = e.origin;
  if (origin?.kind === "plugin" && o === "note")
    return {
      kind: "plugin",
      name: origin.name,
    };
  return o === "prompt" || o === "command"
    ? originFromUnknown(e.origin)
    : {
        kind: "engine",
      };
}
//@ chunk-1nk4j4sn.js:16179-16197 placement
var BOUNDARY_SUFFIX = "_boundary";
//@ chunk-1nk4j4sn.js:16197-16237 placement
var COMMAND_ROW_TAGS = [COMMAND_NAME, COMMAND_MESSAGE, ...ARTIFACT_BLOCK_TAGS].map((e) => `<${e}>`);
//@ chunk-1nk4j4sn.js:16237-16304 placement
var DELIVERY_ATTACHMENT_TYPES = new Set(["queued_command", "poll_events", "teammate_mailbox"]);
//@ chunk-1nk4j4sn.js:16304-16452 placement
function lastTextOf(e) {
  let { content } = e.message;
  if (typeof content === "string") return content;
  let last = content.findLast((n) => n.type === "text");
  return last?.type === "text" ? last.text : undefined;
}
//@ chunk-1nk4j4sn.js:16452-16869 placement
function userDoorOf(e) {
  let { content } = e.message;
  if (Array.isArray(content) && content.some((i) => i.type === "tool_result")) return "tool-result";
  if (e.isCompactSummary === true) return "compaction";
  if (e.sourceToolUseID !== undefined) return "tool-message";
  let n = lastTextOf(e);
  if (
    e.dispatchEcho === true ||
    e.stackedExpansion === true ||
    (n !== undefined && COMMAND_ROW_TAGS.some((i) => n.startsWith(i)))
  )
    return "command";
  return e.promptId !== undefined || e.promptSource !== undefined || e.origin !== undefined
    ? "prompt"
    : "note";
}
//@ chunk-1nk4j4sn.js:16869-17221 placement
function doorOf(e) {
  switch (e.type) {
    case "user":
      return userDoorOf(e);
    case "assistant":
      return "response";
    case "attachment": {
      let o = e.attachment.type;
      if (DELIVERY_ATTACHMENT_TYPES.has(o)) return "delivery";
      return o.startsWith("hook_") || o === "async_hook_response" ? "hook-context" : "attachment";
    }
    case "system":
      if (e.subtype.endsWith(BOUNDARY_SUFFIX)) return "compaction";
      return e.subtype === "local_command" ? "command" : "notice";
  }
}
//@ chunk-1nk4j4sn.js:17221-17447 placement = countToolCallsSince (1)
function countToolCallsSince(messages, sinceUuid) {
  for (let message of sinceUuid)
    for (let idx = message.length - 1; idx >= 0; idx--) {
      let p = message[idx];
      if (p?.type !== "assistant") continue;
      let found = p.message.content.find((block) => block.type === "tool_use" && block.id === messages);
      if (found?.type === "tool_use") return found.name;
    }
  return "unknown";
}
//@ chunk-1nk4j4sn.js:17447-17665 placement
function appendInputOf(message, o) {
  let { agentId, raising, lists } = o;
  let s = raising.door ?? doorOf(message);
  return {
    message: summarizeMessageForExport(message),
    door: s,
    origin:
      raising.origin ??
      classifyMessageAuthor(message, s, {
        toolNameOf: (messages) => countToolCallsSince(messages, lists),
        isOpeningPrompt: raising.door === "prompt",
      }),
    uuid: message.uuid,
    ...(agentId !== undefined && {
      agentId,
    }),
  };
}
//@ chunk-1nk4j4sn.js:17665-18093 placement
async function appendedRow(e, o, r) {
  let { row, listed } = o;
  let s = {
    keep: r.keep ?? e.keep,
    fills: r.fills === true,
  };
  let i;
  let a = appendInputOf(row, {
    ...(e.agentId !== undefined && {
      agentId: e.agentId,
    }),
    raising: r,
    lists: [listed, e.rows()],
  });
  try {
    await NO_CORE_AT_CHAIN_BOTTOM("session.append", {
      origin: r.hookOrigin,
      core: {
        "session.append": appendCoreOf(s, row, (m) => {
          i = m;
        }),
      },
    })(a);
  } catch (error) {
    logForDebugging(
      `session.append ${a.door}: the dispatch failed, the row is kept as made: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
  }
  if (i === undefined && !s.fills) s.keep([row]);
  return i ?? row;
}
//@ chunk-1nk4j4sn.js:18093-18144 placement
var callAppended = (e) => refuseSessionAppend(e, currentSurfaceBinding()?.conversation?.(e.agentId));
//@ chunk-1nk4j4sn.js:18144-18212 placement
var isAppendable = (e) => e.type !== "progress" && (e.type !== "user" || e.ephemeral !== true);
//@ chunk-1nk4j4sn.js:18212-18322 placement
var pluginAppended = (e, o) =>
  NO_CORE_AT_CHAIN_BOTTOM("session.append", {
    origin: o.origin,
    ...(o.signal !== undefined && {
      signal: o.signal,
    }),
  })(buildPluginAppendRow(e, o.plugin));
//@ chunk-1nk4j4sn.js:18322-18493 placement
async function rowsAppendedTo(e, o, r) {
  let listed = o.filter(isAppendable);
  let p = [];
  for (let s of o)
    if (isAppendable(s))
      p.push(
        await appendedRow(
          e,
          {
            row: s,
            listed,
          },
          r,
        ),
      );
    else {
      if (r.fills !== true) (r.keep ?? e.keep)([s]);
      p.push(s);
    }
  return p;
}
export {
  BOUNDARY_SUFFIX,
  COMMAND_ROW_TAGS,
  DELIVERY_ATTACHMENT_TYPES,
  appendInputOf,
  classifyMessageAuthor,
  appendedRow,
  callAppended,
  doorOf,
  isAppendable,
  lastTextOf,
  pluginAppended,
  rowsAppendedTo,
  countToolCallsSince,
  userDoorOf,
};
