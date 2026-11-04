/**
 * utils/remoteTools/restartNotices.ts
 *
 * 2.1.316 新增：远程工具重启提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (19)
 * attribution: placement 19
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  MACHINE_SLUG_PATTERN,
  requestedMachineLabel,
  hasHostField,
} from "../../bridge/deviceRegistration.js";
import { SAFE_ID_PATTERN } from "../../remote/tools/protocolConstants.js";
import { logForDebugging } from "../debug.js";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import { mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import { CLAUDE_DEVICE } from "../permissions/browserToolNames.js";
import { errorMessage, isAbortError } from "../errors.js";
import { withDeadline } from "../sleep.js";
import { isTranscriptLoadError } from "../transcript/transcriptFiles.js";
import { logError } from "../log.js";
import { findToolByName, getToolRemoteExecution } from "../../Tool.js";
import { isHostOnlyNativeTool } from "../../services/api/deferredToolsState.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1400928-1401236 placement
/**
 * 远程工具重启通知限额与 schema。
 */
var MAX_RESTART_NOTICES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var REQUEST_ID_RE;
var RestartNoticeSchema;
deferInit("chunk-e6aww6q8.js:1400928", () => {
  MAX_RESTART_NOTICES = 32;
  REQUEST_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,255}$/;
  RestartNoticeSchema = DoctorLazy(() =>
    objectSchema({
      tool_use_id: stringSchema().min(1).max(256),
      tool: stringSchema().min(1).max(256),
      host: stringSchema().regex(MACHINE_SLUG_PATTERN),
      host_epoch: stringSchema().min(1).max(256).optional(),
      request_id: stringSchema().regex(REQUEST_ID_RE).optional().catch(undefined),
      instance_id: stringSchema().regex(SAFE_ID_PATTERN).optional().catch(undefined),
      dispatched_at: numberSchema(),
    }),
  );
});
//@ chunk-e6aww6q8.js:1401236-1401451 placement
/**
 * 解析重启前仍在远程执行的调用（去重、有上限）。
 */
function parseInFlightServedCalls(inFlightServedCalls) {
  if (!Array.isArray(inFlightServedCalls)) return [];
  let seenIds = new Set();
  return inFlightServedCalls.slice(0, MAX_RESTART_NOTICES).flatMap((rawNotice) => {
    let parsed = RestartNoticeSchema().safeParse(rawNotice);
    if (!parsed.success || seenIds.has(parsed.data.tool_use_id)) return [];
    seenIds.add(parsed.data.tool_use_id);
    return [parsed.data];
  });
}
//@ chunk-e6aww6q8.js:1401451-1402000 placement
/**
 * 记录远程执行中的调用、重启后接管的调用与继承的答案。
 */
class ServedCallRegistry {
  #e = new Map();
  #t = new Map();
  #n = new Map();
  adopt(notice) {
    this.#t.set(notice.tool_use_id, notice);
  }
  adopted(toolUseId) {
    return this.#t.get(toolUseId);
  }
  takeAdopted(toolUseId) {
    return this.#t.delete(toolUseId);
  }
  noteParkedAtRestart(toolUseId) {
    let existing = this.#t.get(toolUseId);
    if (existing !== undefined)
      this.#t.set(toolUseId, {
        ...existing,
        parkedAtRestart: true,
      });
  }
  offerInheritedAnswer(toolUseId, answer) {
    this.#n.set(toolUseId, answer);
  }
  takeInheritedAnswer(toolUseId) {
    let answer = this.#n.get(toolUseId);
    this.#n.delete(toolUseId);
    return answer;
  }
  add(call) {
    this.#e.set(call.tool_use_id, call);
    return this.#o();
  }
  remove(toolUseId) {
    this.#e.delete(toolUseId);
  }
  current() {
    return this.#o();
  }
  #o() {
    let calls = [...this.#e.values()];
    return calls.length === 0 ? null : calls.slice(0, MAX_RESTART_NOTICES);
  }
}
//@ chunk-e6aww6q8.js:1402000-1402100 placement
/**
 * 会话元数据中仍在执行且属于给定集合的调用。
 */
function inFlightCallsFor(restored, supersededToolUseIds) {
  return parseInFlightServedCalls(restored?.internal?.in_flight_served_calls).filter((call) =>
    supersededToolUseIds.has(call.tool_use_id),
  );
}
//@ chunk-e6aww6q8.js:1402100-1402220 placement
/**
 * 宿主名与 epoch 是否一致（宿主未重启）。
 */
function isSameHostEpoch(notice, host) {
  return (
    host.kind === "remote" &&
    host.name === notice.host &&
    notice.host_epoch !== undefined &&
    host.description?.epoch === notice.host_epoch
  );
}
//@ chunk-e6aww6q8.js:1402220-1402298 placement
var restartedWhileRunningMessage = (host) =>
  `This session restarted while this command was under way on ${host}`;
//@ chunk-e6aww6q8.js:1402298-1402565 placement
/**
 * 远程宿主已重启或不可达、命令结果未知的说明。
 */
function hostRestartedNotice(notice) {
  return `${restartedWhileRunningMessage(notice.host)}, and the Claude Code serving ${notice.host} has restarted, is not attached, or could not be reached since \u2014 what became of the command is unknown. It may have run there (partially or fully): check its effect before repeating it.`;
}
//@ chunk-e6aww6q8.js:1402565-1402759 placement
/**
 * 命令仍在远程运行、结果未到的说明。
 */
function stillRunningNotice(notice) {
  return `${restartedWhileRunningMessage(notice.host)}; ${notice.host} reports it is still running there, and its result has not reached this session yet. Do not repeat it \u2014 check its effect on ${notice.host} first.`;
}
//@ chunk-e6aww6q8.js:1402759-1403089 placement
/**
 * 等待批准的命令已撤回、未运行的说明。
 */
function approvalWithdrawnNotice(notice) {
  return `${restartedWhileRunningMessage(notice.host)} \u2014 it was waiting there for this session's approval, and that question could not be carried over the restart, so it has been withdrawn: the command was NOT run on ${notice.host}. If it is still wanted, issue it again \u2014 ${notice.host} will ask for approval again where its settings require it.`;
}
//@ chunk-e6aww6q8.js:1403089-1403462 placement
/**
 * 等待批准的命令撤回未确认的说明。
 */
function approvalWithdrawUnconfirmedNotice(notice) {
  return `${restartedWhileRunningMessage(notice.host)} \u2014 it was waiting there for this session's approval; that question could not be carried over the restart and its withdrawal could not be confirmed. It has not run on ${notice.host} unless an approval reached it meanwhile. If it is still wanted, issue it again \u2014 ${notice.host} will ask for approval again where its settings require it.`;
}
//@ chunk-e6aww6q8.js:1403462-1403744 placement
/**
 * 远程等待权限决定、是否运行未定的说明。
 */
function pendingPermissionNotice(notice) {
  return `${restartedWhileRunningMessage(notice.host)} \u2014 ${notice.host} reports it was waiting on a permission decision there and nothing had run when asked, but an answer may still reach it, so whether it runs is not settled. Check its effect on ${notice.host} before issuing it again, or ask the user.`;
}
//@ chunk-e6aww6q8.js:1403744-1404096 placement
/**
 * 重启时命令在等待批准、未运行的说明。
 */
function parkedApprovalNotice(notice) {
  return `This command was waiting for approval on ${notice.host} when the session restarted and was not run there \u2014 unless an approval reached ${notice.host} in the moment before the restart, which this session cannot rule out. If it is still wanted, issue it again \u2014 ${notice.host} will ask for approval again where its settings require it.`;
}
//@ chunk-e6aww6q8.js:1404096-1404153 placement
/**
 * restartNoticeFor：重启相关提示（挂起或重启）。
 */
function restartNoticeFor(notice, call) {
  return call.parkedAtRestart ? parkedApprovalNotice(notice) : hostRestartedNotice(notice);
}
//@ chunk-e6aww6q8.js:1404153-1404339 placement
/**
 * 命令未到达宿主、未运行的说明。
 */
function neverReceivedNotice(notice) {
  return `This session restarted before this command reached ${notice.host}; ${notice.host} reports it never received it: it did not run there. Issue it again if it is still wanted.`;
}
//@ chunk-e6aww6q8.js:1404339-1404635 placement
/**
 * 重启后无发送记录、视为未运行的说明。
 */
function notSentNotice(host) {
  return `This session restarted with no record of having sent this command to ${host ?? "another computer"}. As far as this session knows, the command did not run there. If a second run would matter, check on ${host ?? "that computer"} first; otherwise issue it again if it is still wanted.`;
}
//@ chunk-e6aww6q8.js:1404635-1404773 placement
var DEVICE_CALL_NOT_SENT_TEXT =
  "As far as this session knows, this call was not sent to the user's device and did not run. Call it again if it is still wanted.";
//@ chunk-e6aww6q8.js:1404773-1405351 placement
/**
 * 权限卡之后、发往用户设备的工具调用。
 */
function deviceCallsBehindCard(messageRows, cardToolUseId, supersededToolUseIds) {
  try {
    let toolUses = uniqByExport(
      (messageRows ?? []).flatMap((assistantMessage) =>
        Array.isArray(assistantMessage.message.content)
          ? assistantMessage.message.content.flatMap((block) =>
              block.type === "tool_use"
                ? [
                    {
                      block,
                      assistantMessage,
                    },
                  ]
                : [],
            )
          : [],
      ),
      ({ block }) => block.id,
    );
    let index = toolUses.findIndex(({ block }) => block.id === cardToolUseId);
    return toolUses.flatMap(({ block, assistantMessage }, rowIndex) =>
      index >= 0 &&
      rowIndex > index &&
      supersededToolUseIds?.has(block.id) &&
      mcpInfoFromString(block.name)?.serverName === CLAUDE_DEVICE
        ? [
            {
              toolUseID: block.id,
              assistantMessage,
              host: undefined,
              onUsersDevice: true,
            },
          ]
        : [],
    );
  } catch (error) {
    logForDebugging(
      `deviceCallsBehindCard: could not read the rows of the reply of tool_use ${cardToolUseId}; writing no result for the calls behind it: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return [];
  }
}
//@ chunk-e6aww6q8.js:1405351-1406217 placement
/**
 * 最后一个已发送调用之后、仍未解决的可远程执行调用。
 */
async function remoteCallsBehindLastSent({
  forwarding,
  hasRemoteToolCalls,
  flagWaitMs,
  journaled,
  superseded,
  parkedToolUseId,
  tools,
  findUnresolved,
}) {
  let resolvedIds = new Set(journaled.map((notice) => notice.tool_use_id));
  if (parkedToolUseId !== undefined) resolvedIds.add(parkedToolUseId);
  let filtered = [...superseded].filter((toolUseId) => !resolvedIds.has(toolUseId));
  if (!forwarding || resolvedIds.size === 0 || filtered.length === 0) return [];
  try {
    let unresolved = await findUnresolved([...resolvedIds, ...filtered]);
    let unresolvedIds = [...unresolved.keys()];
    let lastIndex = unresolvedIds.findLastIndex((toolUseId) => resolvedIds.has(toolUseId));
    let flattened = (lastIndex < 0 ? [] : unresolvedIds.slice(lastIndex + 1)).flatMap((toolUseId) => {
      let assistantMessage = unresolved.get(toolUseId);
      if (assistantMessage === undefined || !isRemoteCapableCall(assistantMessage, toolUseId, tools))
        return [];
      let content = assistantMessage.message.content;
      let toolUseBlock = Array.isArray(content)
        ? content.find((block) => block.type === "tool_use" && block.id === toolUseId)
        : undefined;
      let input = toolUseBlock?.type === "tool_use" ? toolUseBlock.input : undefined;
      return [
        {
          toolUseID: toolUseId,
          assistantMessage,
          host: requestedMachineLabel(input),
        },
      ];
    });
    return flattened.length > 0 && (await withDeadline(hasRemoteToolCalls(), flagWaitMs)) === true
      ? flattened
      : [];
  } catch (error) {
    if (isAbortError(error) || isTranscriptLoadError(error))
      logForDebugging(
        `[remote-tools] could not look up the calls behind the last sent one; answering none: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
    else logError(error);
    return [];
  }
}
//@ chunk-e6aww6q8.js:1406217-1406520 placement
/**
 * 该工具调用能否远程执行。
 */
function isRemoteCapableCall(assistantMessage, toolUseId, tools, host) {
  let toolUseBlock = Array.isArray(assistantMessage.message.content)
    ? assistantMessage.message.content.find((block) => block.type === "tool_use" && block.id === toolUseId)
    : undefined;
  if (toolUseBlock?.type !== "tool_use") return false;
  let toolByName = findToolByName(tools, toolUseBlock.name);
  if (toolByName === undefined) return host !== undefined && mcpInfoFromString(toolUseBlock.name) === null;
  return (
    (getToolRemoteExecution(toolByName).supported &&
      (hasHostField(toolUseBlock.input) || isHostOnlyNativeTool(toolByName))) ||
    toolByName.mcpInfo?.serverName === REMOTE_DEVICES
  );
}
export {
  DEVICE_CALL_NOT_SENT_TEXT,
  notSentNotice,
  ServedCallRegistry,
  isRemoteCapableCall,
  isSameHostEpoch,
  restartNoticeFor,
  pendingPermissionNotice,
  neverReceivedNotice,
  stillRunningNotice,
  approvalWithdrawnNotice,
  approvalWithdrawUnconfirmedNotice,
  deviceCallsBehindCard,
  parseInFlightServedCalls,
  inFlightCallsFor,
  remoteCallsBehindLastSent,
};
