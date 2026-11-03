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
import { u, o, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { VYe, $kn, Cf } from "../../bridge/deviceRegistration.js";
import { SAFE_ID_PATTERN } from "../../remote/tools/protocolConstants.js";
import { logForDebugging } from "../debug.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import { CLAUDE_DEVICE } from "../permissions/browserToolNames.js";
import { errorMessage, isAbortError } from "../errors.js";
import { withDeadline } from "../sleep.js";
import { Qoe } from "../transcript/transcriptFiles.js";
import { logError } from "../log.js";
import { findToolByName, getToolRemoteExecution } from "../../Tool.js";
import { _2 } from "../../services/api/deferredToolsState.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";

/**
 * 远程工具重启通知限额与 schema。
 */
//@ chunk-e6aww6q8.js:1400928-1401236 placement
var MAX_RESTART_NOTICES = 32,
  REQUEST_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,255}$/,
  RestartNoticeSchema = DoctorLazy(() =>
    u({
      tool_use_id: o().min(1).max(256),
      tool: o().min(1).max(256),
      host: o().regex(VYe),
      host_epoch: o().min(1).max(256).optional(),
      request_id: o()
        .regex(REQUEST_ID_RE)
        .optional()
        .catch(void 0),
      instance_id: o()
        .regex(SAFE_ID_PATTERN)
        .optional()
        .catch(void 0),
      dispatched_at: E(),
    }),
  );
/**
 * 解析重启前仍在远程执行的调用（去重、有上限）。
 */
//@ chunk-e6aww6q8.js:1401236-1401451 placement
function parseInFlightServedCalls(e) {
  if (!Array.isArray(e)) return [];
  let n = new Set();
  return e.slice(0, MAX_RESTART_NOTICES).flatMap((r) => {
    let safeParse = RestartNoticeSchema().safeParse(r);
    if (!safeParse.success || n.has(safeParse.data.tool_use_id)) return [];
    return (n.add(safeParse.data.tool_use_id), [safeParse.data]);
  });
}
/**
 * 记录远程执行中的调用、重启后接管的调用与继承的答案。
 */
//@ chunk-e6aww6q8.js:1401451-1402000 placement
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
    if (n !== void 0) this.#t.set(e, { ...n, parkedAtRestart: !0 });
  }
  offerInheritedAnswer(e, n) {
    this.#n.set(e, n);
  }
  takeInheritedAnswer(e) {
    let n = this.#n.get(e);
    return (this.#n.delete(e), n);
  }
  add(e) {
    return (this.#e.set(e.tool_use_id, e), this.#o());
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
/**
 * 会话元数据中仍在执行且属于给定集合的调用。
 */
//@ chunk-e6aww6q8.js:1402000-1402100 placement
function inFlightCallsFor(e, n) {
  return parseInFlightServedCalls(e?.internal?.in_flight_served_calls).filter((r) => n.has(r.tool_use_id));
}
/**
 * 宿主名与 epoch 是否一致（宿主未重启）。
 */
//@ chunk-e6aww6q8.js:1402100-1402220 placement
function isSameHostEpoch(e, n) {
  return (
    n.kind === "remote" &&
    n.name === e.host &&
    e.host_epoch !== void 0 &&
    n.description?.epoch === e.host_epoch
  );
}
//@ chunk-e6aww6q8.js:1402220-1402298 placement
var cJ = (e) => `This session restarted while this command was under way on ${e}`;
/**
 * 远程宿主已重启或不可达、命令结果未知的说明。
 */
//@ chunk-e6aww6q8.js:1402298-1402565 placement
function hostRestartedNotice(e) {
  return `${cJ(e.host)}, and the Claude Code serving ${e.host} has restarted, is not attached, or could not be reached since \u2014 what became of the command is unknown. It may have run there (partially or fully): check its effect before repeating it.`;
}
/**
 * 命令仍在远程运行、结果未到的说明。
 */
//@ chunk-e6aww6q8.js:1402565-1402759 placement
function stillRunningNotice(e) {
  return `${cJ(e.host)}; ${e.host} reports it is still running there, and its result has not reached this session yet. Do not repeat it \u2014 check its effect on ${e.host} first.`;
}
/**
 * 等待批准的命令已撤回、未运行的说明。
 */
//@ chunk-e6aww6q8.js:1402759-1403089 placement
function approvalWithdrawnNotice(e) {
  return `${cJ(e.host)} \u2014 it was waiting there for this session's approval, and that question could not be carried over the restart, so it has been withdrawn: the command was NOT run on ${e.host}. If it is still wanted, issue it again \u2014 ${e.host} will ask for approval again where its settings require it.`;
}
/**
 * 等待批准的命令撤回未确认的说明。
 */
//@ chunk-e6aww6q8.js:1403089-1403462 placement
function approvalWithdrawUnconfirmedNotice(e) {
  return `${cJ(e.host)} \u2014 it was waiting there for this session's approval; that question could not be carried over the restart and its withdrawal could not be confirmed. It has not run on ${e.host} unless an approval reached it meanwhile. If it is still wanted, issue it again \u2014 ${e.host} will ask for approval again where its settings require it.`;
}
/**
 * 远程等待权限决定、是否运行未定的说明。
 */
//@ chunk-e6aww6q8.js:1403462-1403744 placement
function pendingPermissionNotice(e) {
  return `${cJ(e.host)} \u2014 ${e.host} reports it was waiting on a permission decision there and nothing had run when asked, but an answer may still reach it, so whether it runs is not settled. Check its effect on ${e.host} before issuing it again, or ask the user.`;
}
/**
 * 重启时命令在等待批准、未运行的说明。
 */
//@ chunk-e6aww6q8.js:1403744-1404096 placement
function parkedApprovalNotice(e) {
  return `This command was waiting for approval on ${e.host} when the session restarted and was not run there \u2014 unless an approval reached ${e.host} in the moment before the restart, which this session cannot rule out. If it is still wanted, issue it again \u2014 ${e.host} will ask for approval again where its settings require it.`;
}
//@ chunk-e6aww6q8.js:1404096-1404153 placement
function eKe(e, n) {
  return n.parkedAtRestart ? parkedApprovalNotice(e) : hostRestartedNotice(e);
}
/**
 * 命令未到达宿主、未运行的说明。
 */
//@ chunk-e6aww6q8.js:1404153-1404339 placement
function neverReceivedNotice(e) {
  return `This session restarted before this command reached ${e.host}; ${e.host} reports it never received it: it did not run there. Issue it again if it is still wanted.`;
}
/**
 * 重启后无发送记录、视为未运行的说明。
 */
//@ chunk-e6aww6q8.js:1404339-1404635 placement
function notSentNotice(e) {
  return `This session restarted with no record of having sent this command to ${e ?? "another computer"}. As far as this session knows, the command did not run there. If a second run would matter, check on ${e ?? "that computer"} first; otherwise issue it again if it is still wanted.`;
}
//@ chunk-e6aww6q8.js:1404635-1404773 placement
var DEVICE_CALL_NOT_SENT_TEXT =
  "As far as this session knows, this call was not sent to the user's device and did not run. Call it again if it is still wanted.";
/**
 * 权限卡之后、发往用户设备的工具调用。
 */
//@ chunk-e6aww6q8.js:1404773-1405351 placement
function deviceCallsBehindCard(e, n, r) {
  try {
    let s = Ji(
        (e ?? []).flatMap((y) =>
          Array.isArray(y.message.content)
            ? y.message.content.flatMap((S) =>
                S.type === "tool_use" ? [{ block: S, assistantMessage: y }] : [],
              )
            : [],
        ),
        ({ block: block }) => block.id,
      ),
      index = s.findIndex(({ block: block }) => block.id === n);
    return s.flatMap(({ block: block, assistantMessage: assistantMessage }, w) =>
      index >= 0 &&
      w > index &&
      r?.has(block.id) &&
      mcpInfoFromString(block.name)?.serverName === CLAUDE_DEVICE
        ? [{ toolUseID: block.id, assistantMessage: assistantMessage, host: void 0, onUsersDevice: !0 }]
        : [],
    );
  } catch (error) {
    return (
      logForDebugging(
        `deviceCallsBehindCard: could not read the rows of the reply of tool_use ${n}; writing no result for the calls behind it: ${errorMessage(error)}`,
        { level: "warn" },
      ),
      []
    );
  }
}
/**
 * 最后一个已发送调用之后、仍未解决的可远程执行调用。
 */
//@ chunk-e6aww6q8.js:1405351-1406217 placement
async function remoteCallsBehindLastSent({
  forwarding: forwarding,
  hasRemoteToolCalls: hasRemoteToolCalls,
  flagWaitMs: flagWaitMs,
  journaled: journaled,
  superseded: superseded,
  parkedToolUseId: parkedToolUseId,
  tools: tools,
  findUnresolved: findUnresolved,
}) {
  let L = new Set(journaled.map((q) => q.tool_use_id));
  if (parkedToolUseId !== void 0) L.add(parkedToolUseId);
  let filtered = [...superseded].filter((q) => !L.has(q));
  if (!forwarding || L.size === 0 || filtered.length === 0) return [];
  try {
    let q = await findUnresolved([...L, ...filtered]),
      Z = [...q.keys()],
      lastIndex = Z.findLastIndex((Ee) => L.has(Ee)),
      flattened = (lastIndex < 0 ? [] : Z.slice(lastIndex + 1)).flatMap((Ee) => {
        let Ae = q.get(Ee);
        if (Ae === void 0 || !isRemoteCapableCall(Ae, Ee, tools)) return [];
        let content = Ae.message.content,
          Me = Array.isArray(content) ? content.find((ze) => ze.type === "tool_use" && ze.id === Ee) : void 0,
          We = Me?.type === "tool_use" ? Me.input : void 0;
        return [{ toolUseID: Ee, assistantMessage: Ae, host: $kn(We) }];
      });
    return flattened.length > 0 && (await withDeadline(hasRemoteToolCalls(), flagWaitMs)) === !0
      ? flattened
      : [];
  } catch (error) {
    if (isAbortError(error) || Qoe(error))
      logForDebugging(
        `[remote-tools] could not look up the calls behind the last sent one; answering none: ${errorMessage(error)}`,
        { level: "warn" },
      );
    else logError(error);
    return [];
  }
}
/**
 * 该工具调用能否远程执行。
 */
//@ chunk-e6aww6q8.js:1406217-1406520 placement
function isRemoteCapableCall(e, n, r, s) {
  let h = Array.isArray(e.message.content)
    ? e.message.content.find((S) => S.type === "tool_use" && S.id === n)
    : void 0;
  if (h?.type !== "tool_use") return !1;
  let y = findToolByName(r, h.name);
  if (y === void 0) return s !== void 0 && mcpInfoFromString(h.name) === null;
  return (
    (getToolRemoteExecution(y).supported && (Cf(h.input) || _2(y))) ||
    y.mcpInfo?.serverName === REMOTE_DEVICES
  );
}

export {
  DEVICE_CALL_NOT_SENT_TEXT,
  notSentNotice,
  ServedCallRegistry,
  isRemoteCapableCall,
  isSameHostEpoch,
  eKe,
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
