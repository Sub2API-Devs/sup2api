/**
 * engine/rowDoors.ts
 *
 * 2.1.316 新增：查询引擎的行入口。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8fb5jme0.js (14)
 * attribution: placement 14
 */
import { originFromUnknown } from "../utils/messageOrigin.js";
import { classifyHookAttachmentSource } from "../utils/hooks/hookAttachmentTypes.js";
import { answeredToolUseId } from "../tools/utils.js";
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

//@ chunk-8fb5jme0.js:16784-17327 placement
/**
 * 判定消息作者类别：assistant→model，attachment 按来源，system→engine，user 里工具结果→tool，开场提示→coordinator，插件 note→plugin，否则按用户来源。
 */
function appendOriginOf(message, door, hooks) {
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
  let toolUseId = door === "tool-result" || door === "tool-message" ? answeredToolUseId(message) : undefined;
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
//@ chunk-8fb5jme0.js:17327-17345 placement
var BOUNDARY_SUFFIX = "_boundary";
//@ chunk-8fb5jme0.js:17345-17385 placement
var COMMAND_ROW_TAGS; // deferred: uses COMMAND_NAME (../constants/xml.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-8fb5jme0.js:17345", () => {
  COMMAND_ROW_TAGS = [COMMAND_NAME, COMMAND_MESSAGE, ...ARTIFACT_BLOCK_TAGS].map((tag) => `<${tag}>`);
});
//@ chunk-8fb5jme0.js:17385-17452 placement
var DELIVERY_ATTACHMENT_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8fb5jme0.js:17385", () => {
  DELIVERY_ATTACHMENT_TYPES = new Set(["queued_command", "poll_events", "teammate_mailbox"]);
});
//@ chunk-8fb5jme0.js:17452-17600 placement
function lastTextOf(message) {
  let { content } = message.message;
  if (typeof content === "string") return content;
  let last = content.findLast((block) => block.type === "text");
  return last?.type === "text" ? last.text : undefined;
}
//@ chunk-8fb5jme0.js:17600-18017 placement
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
//@ chunk-8fb5jme0.js:18017-18369 placement
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
//@ chunk-8fb5jme0.js:18369-18595 placement
function toolNameOf(toolUseId, lists) {
  for (let list of lists)
    for (let idx = list.length - 1; idx >= 0; idx--) {
      let message = list[idx];
      if (message?.type !== "assistant") continue;
      let found = message.message.content.find(
        (block) => block.type === "tool_use" && block.id === toolUseId,
      );
      if (found?.type === "tool_use") return found.name;
    }
  return "unknown";
}
//@ chunk-8fb5jme0.js:18595-18813 placement
function appendInputOf(message, context) {
  let { agentId, raising, lists } = context;
  let door = raising.door ?? doorOf(message);
  return {
    message: summarizeMessageForExport(message),
    door,
    origin:
      raising.origin ??
      appendOriginOf(message, door, {
        toolNameOf: (toolUseId) => toolNameOf(toolUseId, lists),
        isOpeningPrompt: raising.door === "prompt",
      }),
    uuid: message.uuid,
    ...(agentId !== undefined && {
      agentId,
    }),
  };
}
//@ chunk-8fb5jme0.js:18813-19241 placement
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
//@ chunk-8fb5jme0.js:19241-19292 placement
var callAppended = (agentContext) =>
  refuseSessionAppend(agentContext, currentSurfaceBinding()?.conversation?.(agentContext.agentId));
//@ chunk-8fb5jme0.js:19292-19360 placement
var isAppendable = (message) =>
  message.type !== "progress" && (message.type !== "user" || message.ephemeral !== true);
//@ chunk-8fb5jme0.js:19360-19470 placement
var pluginAppended = (message, options) =>
  NO_CORE_AT_CHAIN_BOTTOM("session.append", {
    origin: options.origin,
    ...(options.signal !== undefined && {
      signal: options.signal,
    }),
  })(buildPluginAppendRow(message, options.plugin));
//@ chunk-8fb5jme0.js:19470-19641 placement
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
  appendOriginOf,
  appendedRow,
  callAppended,
  doorOf,
  isAppendable,
  lastTextOf,
  pluginAppended,
  rowsAppendedTo,
  toolNameOf,
  userDoorOf,
};
