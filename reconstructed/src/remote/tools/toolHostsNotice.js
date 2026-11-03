/**
 * remote/tools/toolHostsNotice.ts
 *
 * 工具宿主提示附件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (20)
 * attribution: placement 20
 */
import { REQUEST_COMPUTER_FOLDER, LIST_COMPUTER_FOLDERS, m2, n4o } from "./protocolConstants.js";
import { createSignal } from "../../utils/signal.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { safeParseJSON } from "../../utils/json.js";
import { stringArray } from "../../utils/collections.js";
import { logForDebugging } from "../../utils/debug.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";
import { currentMcpClients } from "../../services/compact/idleToolResultClearing.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "./consentText.js";

//@ chunk-s61vbvea.js:590791-590937 placement
var regExp_15 = new RegExp(
  `^(?:<tool_use_error>)?\\s*(${REQUEST_COMPUTER_FOLDER}|${LIST_COMPUTER_FOLDERS}): \\[(?:repository_trust_(required|declined|unavailable)|session_(not_elevated))\\]`,
);
//@ chunk-s61vbvea.js:590937-591029 placement
function Sj(e) {
  return e === "required" || e === "declined" || e === "unavailable" || e === "not_elevated";
}
//@ chunk-s61vbvea.js:591029-591317 placement
function readComputerFolderReplyTarget(e, n) {
  let r = m2(e) ? REQUEST_COMPUTER_FOLDER : n4o(e) ? LIST_COMPUTER_FOLDERS : void 0;
  if (r === void 0) return;
  let s = Array.isArray(n) ? n[0] : n,
    h =
      typeof s === "string"
        ? s
        : typeof s === "object" && s !== null && "text" in s && typeof s.text === "string"
          ? s.text
          : "",
    match = regExp_15.exec(h);
  if (match === null || match[1] !== r) return;
  let S = match[2] ?? match[3];
  return Sj(S) ? S : void 0;
}
//@ chunk-s61vbvea.js:591317-591405 placement
var SERVED_CALLS_UNATTESTED = "served-calls-unattested",
  SERVED_CALLS_UNATTESTED_UNTRUSTED_REPO = "served-calls-unattested-untrusted-repo",
  _j = 30000;
/**
 * 创建可刷新的异步值：read 的结果缓存并在变化时通知订阅者，refresh 在节流间隔内直接返回缓存，并发刷新复用进行中的 Promise，force 时排队再读一次。
 */
//@ chunk-s61vbvea.js:591405-591886 placement
function createRefreshableValue({ read: read, initial: initial, now: now = Date.now }) {
  let s,
    h,
    y,
    S,
    w = createSignal(),
    R = (P) => {
      let j = P.then(
        (G) => {
          if (((h = now()), G !== s)) ((s = G), w.emit());
        },
        () => {
          h = now();
        },
      )
        .catch(() => {})
        .then(() => {
          if (y === j) y = void 0;
          return s;
        });
      return ((y = j), j);
    },
    x = () => R(Promise.resolve().then(read));
  if (initial !== void 0) R(initial);
  return {
    current: () => s,
    refresh: (P) => {
      if (y !== void 0) {
        if (P?.force !== !0) return y;
        return ((S ??= y.then(() => ((S = void 0), x()))), S);
      }
      if (P?.force !== !0 && h !== void 0 && now() - h < _j) return Promise.resolve(s);
      return x();
    },
    onChanged: (P) => w.subscribe(P),
  };
}
//@ chunk-s61vbvea.js:591886-591916 placement
var r4o = DoctorLazy(() => u({ state: o() }));
/**
 * （归属疑误：bridge/远程设备）在最近一轮工具结果中找远程设备 attach 成功（state=attached）的 tool_use_id。
 */
//@ chunk-s61vbvea.js:591916-592644 placement
function buildToolHostsNotice(e) {
  let n = [],
    r = e.length - 1;
  for (; r >= 0; r--) {
    let h = e[r];
    if (h === void 0 || h.type === "assistant") break;
    if (h.type === "user" && Array.isArray(h.message.content)) {
      for (let y of h.message.content) if (y.type === "tool_result" && y.is_error !== !0) n.push(y);
    }
  }
  if (n.length === 0) return;
  let s = new Map();
  for (; r >= 0; r--) {
    let h = e[r];
    if (h === void 0 || h.type === "user") break;
    if (h.type === "assistant") {
      for (let y of h.message.content) if (y.type === "tool_use") s.set(y.id, y.name);
    }
  }
  for (let h of n) {
    let y = s.get(h.tool_use_id);
    if (y === void 0 || !m2(y)) continue;
    let S = typeof h.content === "string" ? h.content : h.content?.[0],
      w = typeof S === "string" ? S : S?.type === "text" ? S.text : void 0,
      safeParse = r4o().safeParse(safeParseJSON(w, !1));
    if (safeParse.success && safeParse.data.state === "attached") return h.tool_use_id;
  }
  return;
}
/**
 * （归属疑误：bridge/远程设备）取消息中最后一个 tool_hosts_notice 附件的 lines/away。
 */
//@ chunk-s61vbvea.js:592644-592882 placement
function getLastToolHostsNotice(e) {
  let last = e.findLast((r) => r.type === "attachment" && r.attachment.type === "tool_hosts_notice");
  return last?.type === "attachment" && last.attachment.type === "tool_hosts_notice"
    ? { lines: stringArray(last.attachment.lines), away: stringArray(last.attachment.away) }
    : void 0;
}
//@ chunk-s61vbvea.js:592882-592892 placement
var bj = 32;
/**
 * 记录各工具宿主转发状态（已接入、被拒绝及原因）。
 */
//@ chunk-s61vbvea.js:592892-593213 placement
class ToolHostsForwardingState {
  #e = new Map();
  #t;
  attached(e) {
    this.#t = e;
  }
  refused(e, n) {
    ((this.#t = void 0), this.#e.delete(e), this.#e.set(e, n));
    for (let r of this.#e.keys()) {
      if (this.#e.size <= bj) break;
      this.#e.delete(r);
    }
  }
  withdrew(e) {
    ((this.#t = void 0), this.#e.delete(e));
  }
  clear() {
    ((this.#t = void 0), this.#e.clear());
  }
  reason() {
    return [...this.#e.values()].at(-1) ?? this.#t;
  }
}
//@ chunk-s61vbvea.js:593213-593264 placement
var wj = new Set(["get_device_info", "list_devices"]);
//@ chunk-s61vbvea.js:593264-593355 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck(tool) {
  return tool.some((n) => n.mcpInfo?.serverName === REMOTE_DEVICES && !wj.has(n.mcpInfo.toolName));
}
//@ chunk-s61vbvea.js:593355-593426 placement
function Ej(e) {
  return currentMcpClients(e).some((n) => n.name === REMOTE_DEVICES && n.type === "pending");
}
//@ chunk-s61vbvea.js:593426-593489 placement
var Rj = ["disabled_switch_off", "disabled_flag_off", "not_ready"];
//@ chunk-s61vbvea.js:593489-593592 placement
function shouldConsiderToolHostsNotice(e, n) {
  try {
    return e.get(ToolHostsForwardingState).reason() !== void 0 || buildToolHostsNotice(n) !== void 0;
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
//@ chunk-s61vbvea.js:593592-593720 placement
function forwardingOffNoticeLines(e) {
  let n = REMOTE_TOOLS_CONSENT_TEXT[`forwarding_off.reason.${e}`];
  return [
    e === "not_ready"
      ? REMOTE_TOOLS_CONSENT_TEXT.forwarding_off_for_now(n)
      : REMOTE_TOOLS_CONSENT_TEXT.forwarding_off(n),
  ];
}
//@ chunk-s61vbvea.js:593720-593773 placement
function xj() {
  return [REMOTE_TOOLS_CONSENT_TEXT["forwarding_off.retracted"]];
}
//@ chunk-s61vbvea.js:593773-593821 placement
function Tj(e) {
  return Rj.some((n) => mE(e, forwardingOffNoticeLines(n)));
}
//@ chunk-s61vbvea.js:593821-593891 placement
function mE(e, n) {
  return e.length === n.length && e.every((r, s) => r === n[s]);
}
/**
 * 生成 tool_hosts_notice 附件：在主线程、远程工具转发关闭（或尚未就绪）时，把关闭原因转成提示行；与上次已发的提示相同时不重复发送。
 */
//@ chunk-s61vbvea.js:593891-594290 placement
function buildToolHostsNoticeAttachments(e, n, r, s) {
  let h = e.toolState.get(ToolHostsForwardingState),
    y = h.reason() === void 0 && buildToolHostsNotice(n) !== void 0 ? s() : void 0;
  if (y !== void 0) h.attached(y);
  let S = h.reason() === "not_ready" ? s() : h.reason();
  if (S === void 0 || e.agentId !== void 0 || Ej(e) || !r()) return [];
  let w = getLastToolHostsNotice(n)?.lines ?? [];
  if (getToolNameForPermissionCheck(e.options.tools))
    return Tj(w) ? [{ type: "tool_hosts_notice", lines: xj() }] : [];
  let R = forwardingOffNoticeLines(S);
  return mE(w, R) ? [] : [{ type: "tool_hosts_notice", lines: R }];
}

export {
  SERVED_CALLS_UNATTESTED_UNTRUSTED_REPO,
  SERVED_CALLS_UNATTESTED,
  readComputerFolderReplyTarget,
  shouldConsiderToolHostsNotice,
  buildToolHostsNoticeAttachments,
  r4o,
  buildToolHostsNotice,
  getLastToolHostsNotice,
  ToolHostsForwardingState,
  createRefreshableValue,
};
