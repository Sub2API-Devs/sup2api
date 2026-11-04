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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-1nk4j4sn.js:15636-16179 placement
/**
 * 判定消息作者类别：assistant→model，attachment 按来源，system→engine，user 里工具结果→tool，开场提示→coordinator，插件 note→plugin，否则按用户来源。
 */
function classifyMessageAuthor(message, door, hooks) {
  switch (message.type) {
    case "assistant":
      return {
        kind: "model",
        model: message.message.model,
      };
    case "attachment": {
      let { attachment } = message;
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
  let toolUseId =
    door === "tool-result" || door === "tool-message" ? getToolUseIdOfMessage(message) : undefined;
  if (toolUseId !== undefined)
    return {
      kind: "tool",
      tool: hooks.toolNameOf(toolUseId),
    };
  if (hooks.isOpeningPrompt)
    return {
      kind: "coordinator",
    };
  let origin = message.origin;
  if (origin?.kind === "plugin" && door === "note")
    return {
      kind: "plugin",
      name: origin.name,
    };
  return door === "prompt" || door === "command"
    ? originFromUnknown(message.origin)
    : {
        kind: "engine",
      };
}
//@ chunk-1nk4j4sn.js:16179-16197 placement
var BOUNDARY_SUFFIX = "_boundary";
//@ chunk-1nk4j4sn.js:16197-16237 placement
var COMMAND_ROW_TAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1nk4j4sn.js:16197", () => {
  COMMAND_ROW_TAGS = [COMMAND_NAME, COMMAND_MESSAGE, ...ARTIFACT_BLOCK_TAGS].map((tag) => `<${tag}>`);
});
//@ chunk-1nk4j4sn.js:16237-16304 placement
var DELIVERY_ATTACHMENT_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1nk4j4sn.js:16237", () => {
  DELIVERY_ATTACHMENT_TYPES = new Set(["queued_command", "poll_events", "teammate_mailbox"]);
});
//@ chunk-1nk4j4sn.js:16304-16452 placement
function lastTextOf(message) {
  let { content } = message.message;
  if (typeof content === "string") return content;
  let last = content.findLast((block) => block.type === "text");
  return last?.type === "text" ? last.text : undefined;
}
//@ chunk-1nk4j4sn.js:16452-16869 placement
function userDoorOf(message) {
  let { content } = message.message;
  if (Array.isArray(content) && content.some((block) => block.type === "tool_result")) return "tool-result";
  if (message.isCompactSummary === true) return "compaction";
  if (message.sourceToolUseID !== undefined) return "tool-message";
  let lastText = lastTextOf(message);
  if (
    message.dispatchEcho === true ||
    message.stackedExpansion === true ||
    (lastText !== undefined && COMMAND_ROW_TAGS.some((tag) => lastText.startsWith(tag)))
  )
    return "command";
  return message.promptId !== undefined || message.promptSource !== undefined || message.origin !== undefined
    ? "prompt"
    : "note";
}
//@ chunk-1nk4j4sn.js:16869-17221 placement
function doorOf(message) {
  switch (message.type) {
    case "user":
      return userDoorOf(message);
    case "assistant":
      return "response";
    case "attachment": {
      let attachmentType = message.attachment.type;
      if (DELIVERY_ATTACHMENT_TYPES.has(attachmentType)) return "delivery";
      return attachmentType.startsWith("hook_") || attachmentType === "async_hook_response"
        ? "hook-context"
        : "attachment";
    }
    case "system":
      if (message.subtype.endsWith(BOUNDARY_SUFFIX)) return "compaction";
      return message.subtype === "local_command" ? "command" : "notice";
  }
}
//@ chunk-1nk4j4sn.js:17221-17447 placement = countToolCallsSince (1)
function countToolCallsSince(messages, sinceUuid) {
  for (let message of sinceUuid)
    for (let idx = message.length - 1; idx >= 0; idx--) {
      let message_2 = message[idx];
      if (message_2?.type !== "assistant") continue;
      let found = message_2.message.content.find(
        (block) => block.type === "tool_use" && block.id === messages,
      );
      if (found?.type === "tool_use") return found.name;
    }
  return "unknown";
}
//@ chunk-1nk4j4sn.js:17447-17665 placement
function appendInputOf(message, context) {
  let { agentId, raising, lists } = context;
  let door = raising.door ?? doorOf(message);
  return {
    message: summarizeMessageForExport(message),
    door,
    origin:
      raising.origin ??
      classifyMessageAuthor(message, door, {
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
async function appendedRow(session, input, raising) {
  let { row, listed } = input;
  let options = {
    keep: raising.keep ?? session.keep,
    fills: raising.fills === true,
  };
  let applied;
  let payload = appendInputOf(row, {
    ...(session.agentId !== undefined && {
      agentId: session.agentId,
    }),
    raising,
    lists: [listed, session.rows()],
  });
  try {
    await NO_CORE_AT_CHAIN_BOTTOM("session.append", {
      origin: raising.hookOrigin,
      core: {
        "session.append": appendCoreOf(options, row, (result) => {
          applied = result;
        }),
      },
    })(payload);
  } catch (error) {
    logForDebugging(
      `session.append ${payload.door}: the dispatch failed, the row is kept as made: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
  }
  if (applied === undefined && !options.fills) options.keep([row]);
  return applied ?? row;
}
//@ chunk-1nk4j4sn.js:18093-18144 placement
var callAppended = (agentContext) =>
  refuseSessionAppend(agentContext, currentSurfaceBinding()?.conversation?.(agentContext.agentId));
//@ chunk-1nk4j4sn.js:18144-18212 placement
var isAppendable = (message) =>
  message.type !== "progress" && (message.type !== "user" || message.ephemeral !== true);
//@ chunk-1nk4j4sn.js:18212-18322 placement
var pluginAppended = (message, options) =>
  NO_CORE_AT_CHAIN_BOTTOM("session.append", {
    origin: options.origin,
    ...(options.signal !== undefined && {
      signal: options.signal,
    }),
  })(buildPluginAppendRow(message, options.plugin));
//@ chunk-1nk4j4sn.js:18322-18493 placement
async function rowsAppendedTo(session, rows, raising) {
  let listed = rows.filter(isAppendable);
  let applied = [];
  for (let row of rows)
    if (isAppendable(row))
      applied.push(
        await appendedRow(
          session,
          {
            row,
            listed,
          },
          raising,
        ),
      );
    else {
      if (raising.fills !== true) (raising.keep ?? session.keep)([row]);
      applied.push(row);
    }
  return applied;
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
