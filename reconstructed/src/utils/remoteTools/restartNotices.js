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
import { u, string, E } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  MACHINE_SLUG_PATTERN,
  requestedMachineLabel,
  hasHostField,
} from "../../bridge/deviceRegistration.js";
import { SAFE_ID_PATTERN } from "../../remote/tools/protocolConstants.js";
import { logForDebugging } from "../debug.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import { CLAUDE_DEVICE } from "../permissions/browserToolNames.js";
import { errorMessage, isAbortError } from "../errors.js";
import { withDeadline } from "../sleep.js";
import { isTranscriptLoadError } from "../transcript/transcriptFiles.js";
import { logError } from "../log.js";
import { findToolByName, getToolRemoteExecution } from "../../Tool.js";
import { isHostOnlyNativeTool } from "../../services/api/deferredToolsState.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";

//@ chunk-e6aww6q8.js:1400928-1401236 placement
/**
 * 远程工具重启通知限额与 schema。
 */
var MAX_RESTART_NOTICES = 32;
var REQUEST_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,255}$/;
var RestartNoticeSchema = DoctorLazy(() =>
  u({
    tool_use_id: string().min(1).max(256),
    tool: string().min(1).max(256),
    host: string().regex(MACHINE_SLUG_PATTERN),
    host_epoch: string().min(1).max(256).optional(),
    request_id: string().regex(REQUEST_ID_RE).optional().catch(undefined),
    instance_id: string().regex(SAFE_ID_PATTERN).optional().catch(undefined),
    dispatched_at: E(),
  }),
);
//@ chunk-e6aww6q8.js:1401236-1401451 placement
/**
 * 解析重启前仍在远程执行的调用（去重、有上限）。
 */
function parseInFlightServedCalls(inFlightServedCalls) {
  if (!Array.isArray(inFlightServedCalls)) return [];
  let n = new Set();
  return inFlightServedCalls.slice(0, MAX_RESTART_NOTICES).flatMap((r) => {
    let s = RestartNoticeSchema().safeParse(r);
    if (!s.success || n.has(s.data.tool_use_id)) return [];
    n.add(s.data.tool_use_id);
    return [s.data];
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
  adopt(e) {
    this.#t.set(e.tool_use_id, e);
  }
  adopted(e) {
    return this.#t.get(e);
  }
  takeAdopted(e) {
    return this.#t.delete(e);
  }
  noteParkedAtRestart(e) {
    let n = this.#t.get(e);
    if (n !== undefined)
      this.#t.set(e, {
        ...n,
        parkedAtRestart: true,
      });
  }
  offerInheritedAnswer(e, n) {
    this.#n.set(e, n);
  }
  takeInheritedAnswer(e) {
    let n = this.#n.get(e);
    this.#n.delete(e);
    return n;
  }
  add(e) {
    this.#e.set(e.tool_use_id, e);
    return this.#o();
  }
  remove(e) {
    this.#e.delete(e);
  }
  current() {
    return this.#o();
  }
  #o() {
    let e = [...this.#e.values()];
    return e.length === 0 ? null : e.slice(0, MAX_RESTART_NOTICES);
  }
}
//@ chunk-e6aww6q8.js:1402000-1402100 placement
/**
 * 会话元数据中仍在执行且属于给定集合的调用。
 */
function inFlightCallsFor(restored, supersededToolUseIds) {
  return parseInFlightServedCalls(restored?.internal?.in_flight_served_calls).filter((r) =>
    supersededToolUseIds.has(r.tool_use_id),
  );
}
//@ chunk-e6aww6q8.js:1402100-1402220 placement
/**
 * 宿主名与 epoch 是否一致（宿主未重启）。
 */
function isSameHostEpoch(e, host) {
  return (
    host.kind === "remote" &&
    host.name === e.host &&
    e.host_epoch !== undefined &&
    host.description?.epoch === e.host_epoch
  );
}
//@ chunk-e6aww6q8.js:1402220-1402298 placement
var restartedWhileRunningMessage = (host) =>
  `This session restarted while this command was under way on ${host}`;
//@ chunk-e6aww6q8.js:1402298-1402565 placement
/**
 * 远程宿主已重启或不可达、命令结果未知的说明。
 */
function hostRestartedNotice(e) {
  return `${restartedWhileRunningMessage(e.host)}, and the Claude Code serving ${e.host} has restarted, is not attached, or could not be reached since \u2014 what became of the command is unknown. It may have run there (partially or fully): check its effect before repeating it.`;
}
//@ chunk-e6aww6q8.js:1402565-1402759 placement
/**
 * 命令仍在远程运行、结果未到的说明。
 */
function stillRunningNotice(e) {
  return `${restartedWhileRunningMessage(e.host)}; ${e.host} reports it is still running there, and its result has not reached this session yet. Do not repeat it \u2014 check its effect on ${e.host} first.`;
}
//@ chunk-e6aww6q8.js:1402759-1403089 placement
/**
 * 等待批准的命令已撤回、未运行的说明。
 */
function approvalWithdrawnNotice(e) {
  return `${restartedWhileRunningMessage(e.host)} \u2014 it was waiting there for this session's approval, and that question could not be carried over the restart, so it has been withdrawn: the command was NOT run on ${e.host}. If it is still wanted, issue it again \u2014 ${e.host} will ask for approval again where its settings require it.`;
}
//@ chunk-e6aww6q8.js:1403089-1403462 placement
/**
 * 等待批准的命令撤回未确认的说明。
 */
function approvalWithdrawUnconfirmedNotice(e) {
  return `${restartedWhileRunningMessage(e.host)} \u2014 it was waiting there for this session's approval; that question could not be carried over the restart and its withdrawal could not be confirmed. It has not run on ${e.host} unless an approval reached it meanwhile. If it is still wanted, issue it again \u2014 ${e.host} will ask for approval again where its settings require it.`;
}
//@ chunk-e6aww6q8.js:1403462-1403744 placement
/**
 * 远程等待权限决定、是否运行未定的说明。
 */
function pendingPermissionNotice(e) {
  return `${restartedWhileRunningMessage(e.host)} \u2014 ${e.host} reports it was waiting on a permission decision there and nothing had run when asked, but an answer may still reach it, so whether it runs is not settled. Check its effect on ${e.host} before issuing it again, or ask the user.`;
}
//@ chunk-e6aww6q8.js:1403744-1404096 placement
/**
 * 重启时命令在等待批准、未运行的说明。
 */
function parkedApprovalNotice(e) {
  return `This command was waiting for approval on ${e.host} when the session restarted and was not run there \u2014 unless an approval reached ${e.host} in the moment before the restart, which this session cannot rule out. If it is still wanted, issue it again \u2014 ${e.host} will ask for approval again where its settings require it.`;
}
//@ chunk-e6aww6q8.js:1404096-1404153 placement
/**
 * restartNoticeFor：重启相关提示（挂起或重启）。
 */
function restartNoticeFor(e, n) {
  return n.parkedAtRestart ? parkedApprovalNotice(e) : hostRestartedNotice(e);
}
//@ chunk-e6aww6q8.js:1404153-1404339 placement
/**
 * 命令未到达宿主、未运行的说明。
 */
function neverReceivedNotice(e) {
  return `This session restarted before this command reached ${e.host}; ${e.host} reports it never received it: it did not run there. Issue it again if it is still wanted.`;
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
function deviceCallsBehindCard(e, n, supersededToolUseIds) {
  try {
    let s = Ji(
      (e ?? []).flatMap((y) =>
        Array.isArray(y.message.content)
          ? y.message.content.flatMap((S) =>
              S.type === "tool_use"
                ? [
                    {
                      block: S,
                      assistantMessage: y,
                    },
                  ]
                : [],
            )
          : [],
      ),
      ({ block }) => block.id,
    );
    let index = s.findIndex(({ block }) => block.id === n);
    return s.flatMap(({ block, assistantMessage }, w) =>
      index >= 0 &&
      w > index &&
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
      `deviceCallsBehindCard: could not read the rows of the reply of tool_use ${n}; writing no result for the calls behind it: ${errorMessage(error)}`,
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
  let L = new Set(journaled.map((q) => q.tool_use_id));
  if (parkedToolUseId !== undefined) L.add(parkedToolUseId);
  let filtered = [...superseded].filter((q) => !L.has(q));
  if (!forwarding || L.size === 0 || filtered.length === 0) return [];
  try {
    let unresolved = await findUnresolved([...L, ...filtered]);
    let Z = [...unresolved.keys()];
    let lastIndex = Z.findLastIndex((Ee) => L.has(Ee));
    let flattened = (lastIndex < 0 ? [] : Z.slice(lastIndex + 1)).flatMap((Ee) => {
      let Ae = unresolved.get(Ee);
      if (Ae === undefined || !isRemoteCapableCall(Ae, Ee, tools)) return [];
      let content = Ae.message.content;
      let Me = Array.isArray(content)
        ? content.find((ze) => ze.type === "tool_use" && ze.id === Ee)
        : undefined;
      let input = Me?.type === "tool_use" ? Me.input : undefined;
      return [
        {
          toolUseID: Ee,
          assistantMessage: Ae,
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
function isRemoteCapableCall(e, toolUseId, r, host) {
  let h = Array.isArray(e.message.content)
    ? e.message.content.find((S) => S.type === "tool_use" && S.id === toolUseId)
    : undefined;
  if (h?.type !== "tool_use") return false;
  let toolByName = findToolByName(r, h.name);
  if (toolByName === undefined) return host !== undefined && mcpInfoFromString(h.name) === null;
  return (
    (getToolRemoteExecution(toolByName).supported &&
      (hasHostField(h.input) || isHostOnlyNativeTool(toolByName))) ||
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
