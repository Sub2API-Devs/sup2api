/**
 * remote/tools/toolHostsNotice.ts
 *
 * 工具宿主提示附件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (20)
 * attribution: placement 20
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  REQUEST_COMPUTER_FOLDER,
  LIST_COMPUTER_FOLDERS,
  isRequestComputerFolderTool,
  isListComputerFoldersTool,
} from "./protocolConstants.js";
import { createSignal } from "../../utils/signal.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { safeParseJSON } from "../../utils/json.js";
import { stringArray } from "../../utils/collections.js";
import { logForDebugging } from "../../utils/debug.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";
import { currentMcpClients } from "../../services/compact/idleToolResultClearing.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "./consentText.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:508153-508299 placement
var regExp_14; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:508153", () => {
  regExp_14 = new RegExp(
    `^(?:<tool_use_error>)?\\s*(${REQUEST_COMPUTER_FOLDER}|${LIST_COMPUTER_FOLDERS}): \\[(?:repository_trust_(required|declined|unavailable)|session_(not_elevated))\\]`,
  );
});
//@ chunk-7jxyna5q.js:508299-508391 placement
function isAttestationState(state) {
  return state === "required" || state === "declined" || state === "unavailable" || state === "not_elevated";
}
//@ chunk-7jxyna5q.js:508391-508679 placement
function readComputerFolderReplyTarget(toolName, input) {
  let template = isRequestComputerFolderTool(toolName)
    ? REQUEST_COMPUTER_FOLDER
    : isListComputerFoldersTool(toolName)
      ? LIST_COMPUTER_FOLDERS
      : undefined;
  if (template === undefined) return;
  let first = Array.isArray(input) ? input[0] : input;
  let target =
    typeof first === "string"
      ? first
      : typeof first === "object" && first !== null && "text" in first && typeof first.text === "string"
        ? first.text
        : "";
  let match = regExp_14.exec(target);
  if (match === null || match[1] !== template) return;
  let state = match[2] ?? match[3];
  return isAttestationState(state) ? state : undefined;
}
//@ chunk-7jxyna5q.js:508679-508767 placement
/**
 * 导出常量或表 `SERVED_CALLS_UNATTESTED`：值为 "served-calls-unattested", SERVED_CALLS_UNATTESTED_UNTRUSTED_REPO = "served-calls-unattested-untrusted-repo", _j = 30000。
 */
var SERVED_CALLS_UNATTESTED = "served-calls-unattested";
var SERVED_CALLS_UNATTESTED_UNTRUSTED_REPO = "served-calls-unattested-untrusted-repo";
var REFRESH_THROTTLE_MS = 30000;
//@ chunk-7jxyna5q.js:508767-509248 placement
/**
 * 创建可刷新的异步值：read 的结果缓存并在变化时通知订阅者，refresh 在节流间隔内直接返回缓存，并发刷新复用进行中的 Promise，force 时排队再读一次。
 */
function createRefreshableValue({ read, initial, now = Date.now }) {
  let value;
  let readAt;
  let inflight;
  let error;
  let signal = createSignal();
  let refresh = (readPromise) => {
    let wrapped = readPromise
      .then(
        (next) => {
          readAt = now();
          if (next !== value) {
            value = next;
            signal.emit();
          }
        },
        () => {
          readAt = now();
        },
      )
      .catch(() => {})
      .then(() => {
        if (inflight === wrapped) inflight = undefined;
        return value;
      });
    inflight = wrapped;
    return wrapped;
  };
  let reload = () => refresh(Promise.resolve().then(read));
  if (initial !== undefined) refresh(initial);
  return {
    current: () => value,
    refresh: (reason) => {
      if (inflight !== undefined) {
        if (reason?.force !== true) return inflight;
        error ??= inflight.then(() => {
          error = undefined;
          return reload();
        });
        return error;
      }
      if (reason?.force !== true && readAt !== undefined && now() - readAt < REFRESH_THROTTLE_MS)
        return Promise.resolve(value);
      return reload();
    },
    onChanged: (listener) => signal.subscribe(listener),
  };
}
//@ chunk-7jxyna5q.js:509248-509278 placement
/**
 * 导出函数 `attachStateSchema`。
 */
var attachStateSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:509248", () => {
  attachStateSchema = DoctorLazy(() =>
    objectSchema({
      state: stringSchema(),
    }),
  );
});
//@ chunk-7jxyna5q.js:509278-510006 placement
/**
 * （归属疑误：bridge/远程设备）在最近一轮工具结果中找远程设备 attach 成功（state=attached）的 tool_use_id。
 */
function buildToolHostsNotice(messages) {
  let results = [];
  let index = messages.length - 1;
  for (; index >= 0; index--) {
    let message = messages[index];
    if (message === undefined || message.type === "assistant") break;
    if (message.type === "user" && Array.isArray(message.message.content)) {
      for (let block of message.message.content)
        if (block.type === "tool_result" && block.is_error !== true) results.push(block);
    }
  }
  if (results.length === 0) return;
  let callsById = new Map();
  for (; index >= 0; index--) {
    let message = messages[index];
    if (message === undefined || message.type === "user") break;
    if (message.type === "assistant") {
      for (let block of message.message.content)
        if (block.type === "tool_use") callsById.set(block.id, block.name);
    }
  }
  for (let result of results) {
    let call = callsById.get(result.tool_use_id);
    if (call === undefined || !isRequestComputerFolderTool(call)) continue;
    let content = typeof result.content === "string" ? result.content : result.content?.[0];
    let text = typeof content === "string" ? content : content?.type === "text" ? content.text : undefined;
    let parsed = attachStateSchema().safeParse(safeParseJSON(text, false));
    if (parsed.success && parsed.data.state === "attached") return result.tool_use_id;
  }
  return;
}
//@ chunk-7jxyna5q.js:510006-510244 placement
/**
 * （归属疑误：bridge/远程设备）取消息中最后一个 tool_hosts_notice 附件的 lines/away。
 */
function getLastToolHostsNotice(messages) {
  let last = messages.findLast(
    (message) => message.type === "attachment" && message.attachment.type === "tool_hosts_notice",
  );
  return last?.type === "attachment" && last.attachment.type === "tool_hosts_notice"
    ? {
        lines: stringArray(last.attachment.lines),
        away: stringArray(last.attachment.away),
      }
    : undefined;
}
//@ chunk-7jxyna5q.js:510244-510254 placement
var MAX_TRACKED_HOSTS = 32;
//@ chunk-7jxyna5q.js:510254-510575 placement
/**
 * 记录各工具宿主转发状态（已接入、被拒绝及原因）。
 */
class ToolHostsForwardingState {
  #e = new Map();
  #t;
  attached(reason) {
    this.#t = reason;
  }
  refused(host, reason) {
    this.#t = undefined;
    this.#e.delete(host);
    this.#e.set(host, reason);
    for (let key of this.#e.keys()) {
      if (this.#e.size <= MAX_TRACKED_HOSTS) break;
      this.#e.delete(key);
    }
  }
  withdrew(host) {
    this.#t = undefined;
    this.#e.delete(host);
  }
  clear() {
    this.#t = undefined;
    this.#e.clear();
  }
  reason() {
    return [...this.#e.values()].at(-1) ?? this.#t;
  }
}
//@ chunk-7jxyna5q.js:510575-510626 placement
var SKIPPED_DEVICE_TOOLS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:510575", () => {
  SKIPPED_DEVICE_TOOLS = new Set(["get_device_info", "list_devices"]);
});
//@ chunk-7jxyna5q.js:510626-510717 placement (2.1.88 match: getToolNameForPermissionCheck, 1)
function getToolNameForPermissionCheck(tool) {
  return tool.some(
    (tool) => tool.mcpInfo?.serverName === REMOTE_DEVICES && !SKIPPED_DEVICE_TOOLS.has(tool.mcpInfo.toolName),
  );
}
//@ chunk-7jxyna5q.js:510717-510788 placement
function isRemoteDevicesPending(context) {
  return currentMcpClients(context).some(
    (client) => client.name === REMOTE_DEVICES && client.type === "pending",
  );
}
//@ chunk-7jxyna5q.js:510788-510876 placement
var FORWARDING_OFF_REASONS = [
  "disabled_switch_off",
  "disabled_flag_off",
  "disabled_device_policy",
  "not_ready",
];
//@ chunk-7jxyna5q.js:510876-510979 placement
function shouldConsiderToolHostsNotice(toolState, messages) {
  try {
    return (
      toolState.get(ToolHostsForwardingState).reason() !== undefined ||
      buildToolHostsNotice(messages) !== undefined
    );
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-7jxyna5q.js:510979-511107 placement
function forwardingOffNoticeLines(reason) {
  let detail = REMOTE_TOOLS_CONSENT_TEXT[`forwarding_off.reason.${reason}`];
  return [
    reason === "not_ready"
      ? REMOTE_TOOLS_CONSENT_TEXT.forwarding_off_for_now(detail)
      : REMOTE_TOOLS_CONSENT_TEXT.forwarding_off(detail),
  ];
}
//@ chunk-7jxyna5q.js:511107-511160 placement
function retractedForwardingLines() {
  return [REMOTE_TOOLS_CONSENT_TEXT["forwarding_off.retracted"]];
}
//@ chunk-7jxyna5q.js:511160-511208 placement
function isForwardingOffNotice(lines) {
  return FORWARDING_OFF_REASONS.some((reason) => isSameLines(lines, forwardingOffNoticeLines(reason)));
}
//@ chunk-7jxyna5q.js:511208-511278 placement
function isSameLines(lines, other) {
  return lines.length === other.length && lines.every((line, otherLine) => line === other[otherLine]);
}
//@ chunk-7jxyna5q.js:511278-511677 placement
/**
 * 生成 tool_hosts_notice 附件：在主线程、远程工具转发关闭（或尚未就绪）时，把关闭原因转成提示行；与上次已发的提示相同时不重复发送。
 */
function buildToolHostsNoticeAttachments(context, messages, isForwardingOffNoticeOn, forwardingOffReasonNow) {
  let forwarding = context.toolState.get(ToolHostsForwardingState);
  let offReason =
    forwarding.reason() === undefined && buildToolHostsNotice(messages) !== undefined
      ? forwardingOffReasonNow()
      : undefined;
  if (offReason !== undefined) forwarding.attached(offReason);
  let offReason_2 = forwarding.reason() === "not_ready" ? forwardingOffReasonNow() : forwarding.reason();
  if (
    offReason_2 === undefined ||
    context.agentId !== undefined ||
    isRemoteDevicesPending(context) ||
    !isForwardingOffNoticeOn()
  )
    return [];
  let lines = getLastToolHostsNotice(messages)?.lines ?? [];
  if (getToolNameForPermissionCheck(context.options.tools))
    return isForwardingOffNotice(lines)
      ? [
          {
            type: "tool_hosts_notice",
            lines: retractedForwardingLines(),
          },
        ]
      : [];
  let noticeLines = forwardingOffNoticeLines(offReason_2);
  return isSameLines(lines, noticeLines)
    ? []
    : [
        {
          type: "tool_hosts_notice",
          lines: noticeLines,
        },
      ];
}
export {
  SERVED_CALLS_UNATTESTED,
  shouldConsiderToolHostsNotice,
  buildToolHostsNoticeAttachments,
  SERVED_CALLS_UNATTESTED_UNTRUSTED_REPO,
  ToolHostsForwardingState,
  buildToolHostsNotice,
  getLastToolHostsNotice,
  attachStateSchema,
  createRefreshableValue,
  readComputerFolderReplyTarget,
};
