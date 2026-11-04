/**
 * utils/telemetry/messageContentAttributes.ts
 *
 * 2.1.316 新增：消息内容遥测属性与 OTel 上下文管理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p52gp8zk.js (19)
 * attribution: placement 19
 */
import { AsyncLocalStorage } from "async_hooks";
import {
  identityRedaction,
  applyRedactions,
  notRecordedLength,
  NOT_RECORDED_PLACEHOLDER,
} from "./accountMemoryRedaction.js";
import { isTrustedMemoryTool, classifyPlacedTool } from "../../services/mcp/memoryServerVerification.js";
import { jsonStringify } from "../slowOperations.js";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_api } from "../../../vendor/@opentelemetry/api/build/src/index.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-p52gp8zk.js:12080-12358 placement
function collectToolUseIds(message, options, messages = message) {
  let ids = new Set();
  for (let msg of messages) {
    if (msg.role !== "assistant" || typeof msg.content === "string") continue;
    for (let block of msg.content) {
      let id = identityRedaction(block).id;
      if (isTrustedMemoryToolUse(block, options) && typeof id === "string") ids.add(id);
    }
  }
  return message.map((block_2) => {
    let id = redactMessageContent_2(block_2.content, options, ids);
    return id === block_2.content
      ? block_2
      : {
          ...block_2,
          content: id,
        };
  });
}
//@ chunk-p52gp8zk.js:12358-12399 placement
function redactMessageContent(content, redaction) {
  return redactContentBlocks(content, redaction, new Set());
}
//@ chunk-p52gp8zk.js:12399-12439 placement
function redactMessageFields(system, redaction) {
  return redactMessageContent_2(system, redaction, new Set());
}
//@ chunk-p52gp8zk.js:12439-12548 placement
function redactMessageContent_2(blocks, content, redaction) {
  if (typeof blocks === "string") return applyRedactions(blocks, content);
  let blocks_2 = redactContentBlocks(blocks, content, redaction);
  return blocks_2.every((block, index) => block === blocks[index]) ? blocks : blocks_2;
}
//@ chunk-p52gp8zk.js:12548-13206 placement
/**
 * 逐块处理消息内容（文本、思考、工具输入/结果）以便记录到遥测并去除敏感信息。
 */
function redactContentBlocks(blocks, redaction, seenIds) {
  return blocks.map((block) => {
    let { text, thinking, input, tool_use_id: toolUseId, content } = identityRedaction(block);
    if (
      (block.type === "text" && typeof text === "string") ||
      (block.type === "thinking" && typeof thinking === "string")
    ) {
      let redactedBlock = redactValue(block, redaction, 0);
      return redactedBlock === block ? block : redactedBlock;
    }
    if (block.type === "tool_use" || block.type === "server_tool_use") {
      if (isTrustedMemoryToolUse(block, redaction))
        return {
          ...block,
          input: {
            not_recorded: notRecordedLength(safeJsonString(input)),
          },
        };
      let redactedInput = redactValue(input, redaction, 0);
      return redactedInput === input
        ? block
        : {
            ...block,
            input: redactedInput,
          };
    }
    if (block.type === "tool_result" && content !== undefined && content !== null) {
      if (typeof toolUseId === "string" && seenIds.has(toolUseId))
        return {
          ...block,
          content: notRecordedLength(typeof content === "string" ? content : safeJsonString(content)),
        };
      if (typeof content === "string" || Array.isArray(content)) {
        let redactedContent = redactMessageContent_2(content, redaction, seenIds);
        return redactedContent === content
          ? block
          : {
              ...block,
              content: redactedContent,
            };
      }
    }
    if (UNREDACTED_BLOCK_TYPES.has(block.type) || isBase64Document(block)) return block;
    let redactedBlock2 = redactValue(block, redaction, 0);
    return redactedBlock2 === block ? block : redactedBlock2;
  });
}
//@ chunk-p52gp8zk.js:13206-13271 placement
var UNREDACTED_BLOCK_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-p52gp8zk.js:13206", () => {
  UNREDACTED_BLOCK_TYPES = new Set(["image", "redacted_thinking", "container_upload"]);
});
//@ chunk-p52gp8zk.js:13271-13382 placement
function isBase64Document(block) {
  let { source } = identityRedaction(block);
  return (
    block.type === "document" && typeof source === "object" && source !== null && source.type === "base64"
  );
}
//@ chunk-p52gp8zk.js:13382-13528 placement
function isTrustedMemoryToolUse(block, ctx) {
  let { name } = identityRedaction(block);
  return (
    (block.type === "tool_use" || block.type === "server_tool_use") &&
    typeof name === "string" &&
    isTrustedMemoryTool(name, classifyPlacedTool(ctx.toolNames), "history")
  );
}
//@ chunk-p52gp8zk.js:13528-13537 placement
var MAX_REDACT_DEPTH = 6;
//@ chunk-p52gp8zk.js:13537-13876 placement
function redactValue(value, redaction, depth) {
  if (typeof value === "string") return applyRedactions(value, redaction);
  if (typeof value !== "object" || value === null) return value;
  if (depth >= MAX_REDACT_DEPTH) return NOT_RECORDED_PLACEHOLDER;
  if (Array.isArray(value)) {
    let mapped = value.map((entries) => redactValue(entries, redaction, depth + 1));
    return mapped.every((key, entry) => key === value[entry]) ? value : mapped;
  }
  let result = false;
  let mapped = Object.entries(value).map(([key, value]) => {
    let item = applyRedactions(key, redaction);
    let index = redactValue(value, redaction, depth + 1);
    result ||= index !== value || item !== key;
    return [item, index];
  });
  return result ? Object.fromEntries(mapped) : value;
}
//@ chunk-p52gp8zk.js:13876-13927 placement
function safeJsonString(value) {
  try {
    return jsonStringify(value) ?? "";
  } catch {
    return "";
  }
}
//@ chunk-p52gp8zk.js:13927-13944 placement
var otelApi_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-p52gp8zk.js:13927", () => {
  otelApi_2 = __toESM(require_api(), 1);
});
//@ chunk-p52gp8zk.js:13993-14422 placement
class AsyncLocalContextManager {
  als = new AsyncLocalStorage();
  active() {
    return this.als.getStore() ?? otelApi_2.ROOT_CONTEXT;
  }
  with(context, callback, thisArg, ...rest) {
    let bound = thisArg == null ? callback : callback.bind(thisArg);
    return this.als.run(context, bound, ...rest);
  }
  enterWith(handle) {
    this.als.enterWith(handle);
  }
  bind(ctx, fn) {
    if (typeof fn === "function") {
      let thisArg_2 = (...rest_2) => this.with(ctx, () => fn(...rest_2));
      Object.defineProperty(thisArg_2, "length", {
        configurable: true,
        enumerable: false,
        writable: false,
        value: fn.length,
      });
      return thisArg_2;
    }
    return fn;
  }
  enable() {
    return this;
  }
  disable() {
    this.als.disable();
    return this;
  }
}
//@ chunk-p52gp8zk.js:14422-14437 placement
var otelContextManager; // deferred: uses AsyncLocalContextManager of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-p52gp8zk.js:14422", () => {
  otelContextManager = new AsyncLocalContextManager();
});
//@ chunk-p52gp8zk.js:14437-14461 placement
class OtelHostContextState {
  current = undefined;
}
//@ chunk-p52gp8zk.js:14461-14486 placement
var otelHostContextByHost; // deferred: uses OtelHostContextState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-p52gp8zk.js:14461", () => {
  otelHostContextByHost = new HostScoped(() => new OtelHostContextState());
});
//@ chunk-p52gp8zk.js:14486-14528 placement
function setHostOtelContext(context) {
  otelHostContextByHost.of(getRootSession().host).current = context;
}
//@ chunk-p52gp8zk.js:14528-14574 placement
function getHostOtelContext() {
  return otelHostContextByHost.of(getRootSession().host).current;
}
//@ chunk-p52gp8zk.js:14574-14655 placement
function activeOtelContext() {
  let context = otelContextManager.active();
  if (context !== otelApi_2.ROOT_CONTEXT) return context;
  return getHostOtelContext() ?? context;
}
export {
  otelContextManager,
  activeOtelContext,
  setHostOtelContext,
  getHostOtelContext,
  collectToolUseIds,
  redactMessageFields,
  redactMessageContent,
};
