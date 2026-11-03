/**
 * hooks/useInboxPoller.ts
 *
 * 队友 inbox 轮询：读取未读消息（队友消息、权限请求/回复、计划审批、关停），按角色投递到会话或回调。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useInboxPoller.ts
 * pieces: chunk-18hwfzwa.js (6)
 * attribution: fingerprint 2, layout 2, placement 2
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
} from "crypto";
import { isTeamLead, hasNonLeadTeammate, isTeammate, isPlanModeRequired } from "../utils/teammate.js";
import { conversationSnapshot, InboxVerdictCache } from "../utils/inboxClassification.js";
import { y3e } from "../utils/deepFreezePlainData.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../utils/debug.js";
import { o, u, T } from "../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../ink/components/Text.js";
import { fromEnum, lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { env } from "../utils/env.js";
import { logEvent } from "../services/analytics/index.js";
import { logError } from "../utils/log.js";
import {
  errorMessage,
  toError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../utils/errors.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { y, P, j } from "../../vendor/react/cjs/react.production.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { dedupeMailboxMessages } from "../utils/swarm/teammateMessageRepair.js";
import {
  getInboxPath,
  isPlanApprovalResponse,
  planVerdictBinding,
  planVerdictMismatchRejection,
  messageIdentityKey,
  isPermissionRequest,
  isPermissionResponse,
  isSandboxPermissionRequest,
  isSandboxPermissionResponse,
  isShutdownRequest,
  isShutdownApproved,
  isModeSetRequest,
  isPlanApprovalRequest,
  isTeamPermissionUpdate,
  isStructuredProtocolMessage,
  planApprovalResumeText,
  formatTeammateMessages,
  readUnreadMessages,
  markMessagesAsRead,
  writeToMailbox,
} from "../utils/teammateMailbox.js";
import { TEAM_LEAD } from "../utils/swarm/constants.js";
import { ci } from "../utils/swarm/hostState.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { applyStartupPermissionMode } from "../utils/permissions/bypassPermissionsKillswitch.js";
import { syncTeammateMode } from "../utils/swarm/teamHelpers.js";
import { qS } from "../services/api/deferredToolsState.js";
import { getAllBaseTools } from "../tools.js";
import { gCt, pCt, fCt, describeInvalidHost } from "../utils/sandbox/hostValidation.js";
import { BVt } from "../utils/stableHash.js";
import { buildForwardedPermissionDialog } from "../remote/forwardedPermissionDialog.js";
import { createAssistantMessage } from "../utils/messages.js";
import {
  sendPermissionResponseViaMailbox,
  sendSandboxPermissionResponseViaMailbox,
} from "../utils/swarm/permissionSync.js";
import { CountedAsk } from "../utils/countedAsk.js";
import { isNotAskUserQuestionCard } from "../components/permissions/permissionCardKinds.js";
import { gB } from "../utils/terminalProbe.js";
import {
  Uur,
  toApprovalLabel,
  SHORT_LABEL_WIDTH,
  labelOr,
} from "../utils/permissions/approvalPayloadSerialization.js";
import { getModeBaseBehavior } from "../utils/permissions/PermissionMode.js";
import { isClassifierSideCallRetired } from "../utils/permissions/serverClassifier/flags.js";
import { classifySandboxNetworkHost } from "../utils/permissions/sandboxNetworkClassifier.js";
import { askSandboxNetworkFromWorker } from "../screens/repl/SandboxNetworkPrompts.js";
import { applyValidatedPermissionUpdate } from "../utils/permissions/PermissionUpdate.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import {
  isTeammateAwaitingPlan,
  teammateModeAfterPlan,
} from "../tools/ExitPlanModeTool/planPreconditions.js";
import { hasLeftProactivityBaseline } from "../utils/permissions/permissions.js";
import { ensureBackendsRegistered, getBackendByType } from "../utils/swarm/backends/registry.js";
import { isInsideTmux } from "../utils/swarm/backends/detection.js";
import { killTeammate } from "../components/teams/TeamsDialog.js";
import { filterMailboxThroughReceiveHooks } from "../utils/swarm/teammateMailbox.js";
import { Cr } from "../state/AppState.js";
import { useTerminalNotification } from "../ink/useTerminalNotification.js";
import { useClock } from "../ink/components/ClockContext.js";
import { Me } from "../components/design-system/ThemeProvider.js";
import { getSenderKind } from "../tools/SendMessageTool/SendMessageTool.js";
import {
  Yjs,
  processMailboxPermissionResponse,
  Qjs,
  processSandboxPermissionResponse,
} from "./useSwarmPermissionPoller.js";

//@ chunk-18hwfzwa.js:1670156-1670399 fingerprint = getAgentNameToPoll (0.644)
function getAgentNameToPoll(h, x) {
  switch (h.kind) {
    case "in-process":
      return;
    case "teammate":
      return h.agentName;
    case "session": {
      if (isTeamLead(x.teamContext)) {
        if (!hasNonLeadTeammate(x.teamContext)) return;
        let { leadAgentId: leadAgentId, teammates: teammates } = x.teamContext;
        return teammates[leadAgentId]?.name || "team-lead";
      }
      return;
    }
  }
}
//@ chunk-18hwfzwa.js:1670399-1670424 layout
var k1o = 1000,
  v1o = conversationSnapshot([]);
/**
 * 为 inbox 中引用的未知工具名生成最小工具桩（名字、显示名、只能渲染无参数的调用），MCP 工具名带 "(MCP)" 后缀。
 */
//@ chunk-18hwfzwa.js:1670424-1670708 layout
function createUnknownToolStub(toolName) {
  let x = typeof toolName === "string" ? toolName : y3e,
    startsWith = x.startsWith("mcp__");
  return {
    name: x,
    userFacingName: () => (startsWith ? `${x} (MCP)` : x),
    renderToolUseMessage: (L) => {
      if (L !== null && typeof L === "object" && Object.keys(L).length > 0)
        throw Error("unknown-tool stub cannot render parameters");
      return x;
    },
    isMcp: startsWith,
  };
}
/**
 * 队友 inbox 轮询器：定期读取未读消息，区分队友消息、权限请求与回复、计划审批（只接受 team-lead）、关停请求，投递到会话或对应回调并标记已读。
 */
//@ chunk-18hwfzwa.js:1670708-1686214 fingerprint = useInboxPoller (0.503)
class useInboxPoller {
  #e;
  #t;
  #o = !1;
  #n = 0;
  #s = null;
  #r = null;
  #c = 0;
  #i = !1;
  #a;
  #l = new InboxVerdictCache();
  #d = new Set();
  #m = new Set();
  #p = new Map();
  #u = 0;
  #f = !1;
  constructor(h, x) {
    ((this.#e = h), (this.#t = x));
  }
  start() {
    if (this.#o) return;
    ((this.#o = !0),
      (this.#a = this.#e.store.getState().toolPermissionContext),
      (this.#s = this.#e.store.subscribe(this.#S)),
      this.#x(),
      this.#h(),
      this.#g());
  }
  stop() {
    if (!this.#o) return;
    ((this.#o = !1), this.#n++, this.#s?.(), (this.#s = null), this.#b(), (this.#i = !1));
  }
  setInputs(h) {
    let x = this.#t;
    if (((this.#t = h), !this.#o)) return;
    let D =
      h.enabled !== x.enabled ||
      h.isLoading !== x.isLoading ||
      h.visibleDialogKind !== x.visibleDialogKind ||
      h.onSubmitMessage !== x.onSubmitMessage;
    if (!D && h.requestDialog === x.requestDialog) return;
    if (D) this.#x();
    (this.#h(), this.#g());
  }
  #S = () => {
    let { toolPermissionContext: toolPermissionContext } = this.#e.store.getState();
    if (toolPermissionContext !== this.#a) ((this.#a = toolPermissionContext), this.#l.clear());
    this.#h();
  };
  #h() {
    let h = this.#t.enabled && !!getAgentNameToPoll(this.#e.identity, this.#e.store.getState());
    if (h && this.#r === null) this.#y();
    else if (!h && this.#r !== null) this.#b();
  }
  #y() {
    let h = ++this.#c,
      x = () => {
        this.#r = this.#e.setTimeout(() => {
          if (h !== this.#c) return;
          try {
            this.#v();
          } finally {
            if (h === this.#c) x();
          }
        }, k1o);
      };
    x();
  }
  #b() {
    (this.#c++, this.#r?.(), (this.#r = null));
  }
  #g() {
    if (!this.#t.enabled) return;
    if (this.#i) return;
    if (getAgentNameToPoll(this.#e.identity, this.#e.store.getState())) ((this.#i = !0), this.#v());
  }
  #v() {
    this.#T().catch((h) => logError(toError(h)));
  }
  #C() {
    return Object.values(this.#e.store.getState().teamContext?.teammates ?? {});
  }
  async #w(h, x) {
    if (!((await h()) || (await h()))) logForDebugging(x(), { level: "error" });
  }
  async #T() {
    let h = this.#e,
      { store: store, storageV5: storageV5, credentials: credentials, terminal: terminal } = h,
      setState = store.setState,
      {
        enabled: enabled,
        isLoading: isLoading,
        visibleDialogKind: visibleDialogKind,
        onSubmitMessage: onSubmitMessage,
        requestDialog: requestDialog,
      } = this.#t;
    if (!enabled) return;
    let Xe = this.#n,
      state = store.getState(),
      kt = getAgentNameToPoll(h.identity, state);
    if (!kt) return;
    let unreadMessages = await h.readUnreadMessages(kt, state.teamContext?.teamName, storageV5);
    if (Xe !== this.#n) return;
    if (unreadMessages.length === 0) {
      this.#f = !1;
      return;
    }
    logForDebugging(`[InboxPoller] Found ${unreadMessages.length} unread message(s)`);
    let It = dedupeMailboxMessages(unreadMessages, getInboxPath(kt, state.teamContext?.teamName), {
        roster: state.teamContext?.teammates,
        isPaneTeammate: h.identity.kind === "teammate",
      }),
      Ot = (No) => It.get(No) === "forged",
      Et = new Set(),
      Dt = new Map();
    if (isTeammate() && isPlanModeRequired())
      for (let No of unreadMessages) {
        let vo = isPlanApprovalResponse(No.text);
        if (!vo) continue;
        if (No.from !== TEAM_LEAD || Ot(No)) {
          logForDebugging(`[InboxPoller] Ignoring plan approval response from non-team-lead: ${No.from}`);
          continue;
        }
        if (store.getState().toolPermissionContext.mode !== "plan") {
          logForDebugging("[InboxPoller] Ignoring plan approval response while not in plan mode");
          continue;
        }
        let swarmPermissions = ci().swarmPermissions,
          pendingPlanApproval = swarmPermissions.pendingPlanApproval,
          Fn = planVerdictBinding(pendingPlanApproval, vo);
        if (Fn === "already_answered") {
          logForDebugging(
            `[InboxPoller] Ignoring plan approval response ${jsonStringify(vo.requestId)}: the pending request ${jsonStringify(pendingPlanApproval?.requestId)} was already answered`,
          );
          continue;
        }
        if (pendingPlanApproval)
          swarmPermissions.pendingPlanApproval = { ...pendingPlanApproval, answered: !0 };
        if (Fn === "mismatch") {
          (logForDebugging(
            `[InboxPoller] Plan approval response ${jsonStringify(vo.requestId)} does not name the pending plan request ${jsonStringify(pendingPlanApproval?.requestId)}; resolving the wait as a rejection`,
            { level: "warn" },
          ),
            logFeatureSad("plan_approval", "request_binding_mismatch"),
            Dt.set(No, planVerdictMismatchRejection(vo)));
          continue;
        }
        if (Fn === "unbound") logFeatureSad("plan_approval", "verdict_unbound");
        else logFeatureOk("plan_approval");
        if (
          (Dt.set(No, vo),
          logForDebugging(
            `[InboxPoller] Received plan approval response from team-lead: approved=${vo.approved}`,
          ),
          !vo.approved)
        ) {
          logForDebugging(
            `[InboxPoller] Plan rejected by team lead: ${vo.feedback || "No feedback provided"}`,
          );
          continue;
        }
        let bn = vo.permissionMode ?? "default",
          Go = applyStartupPermissionMode(bn, state.toolPermissionContext, setState);
        if (!Go.ok)
          (logForDebugging(
            `[InboxPoller] Refusing inherited mode ${bn} from plan approval: ${Go.error}; exiting plan mode to default`,
            { level: "warn" },
          ),
            applyStartupPermissionMode("default", state.toolPermissionContext, setState));
        (await syncTeammateMode(Go.ok ? Go.mode : "default", state.teamContext?.teamName, storageV5),
          logForDebugging(
            `[InboxPoller] Plan approved by team lead, exited plan mode to ${Go.ok ? Go.mode : "default"}`,
          ));
      }
    let Lt = ++this.#u,
      oo,
      Xt = () =>
        (oo ??= new Promise((No) => {
          this.#p.set(Lt, No);
        })),
      io = () => {
        h.markMessagesAsRead(kt, state.teamContext?.teamName, unreadMessages, storageV5)
          .catch((No) => (logError(No), !1))
          .then((No) => {
            if (!No) {
              if (
                (logForDebugging(
                  `[InboxPoller] Could not mark ${unreadMessages.length} inbox message(s) read; they stay unread and are retried next poll`,
                  { level: "warn" },
                ),
                !this.#f)
              )
                ((this.#f = !0), logFeatureSad("swarm_inbox_poll", "mark_read_failed"));
              return;
            }
            this.#f = !1;
            for (let [vo, Yo] of this.#p) if (vo <= Lt) (Yo(), this.#p.delete(vo));
          });
      },
      so = [],
      po = [],
      ao = [],
      co = [],
      bo = [],
      Ao = [],
      Bo = [],
      Ro = [];
    for (let No of unreadMessages) {
      if (this.#m.has(messageIdentityKey(No))) continue;
      if (Ot(No)) {
        Ro.push(No);
        continue;
      }
      let vo = isPermissionRequest(No.text),
        Yo = isPermissionResponse(No.text),
        kn = isSandboxPermissionRequest(No.text),
        Fn = isSandboxPermissionResponse(No.text),
        bn = isShutdownRequest(No.text),
        Go = isShutdownApproved(No.text),
        hn = Go?.from === No.from ? Go : null,
        Mn = isModeSetRequest(No.text),
        Xo = isPlanApprovalRequest(No.text);
      if (vo) so.push(No);
      else if (Yo) po.push(No);
      else if (kn) ao.push(No);
      else if (Fn) co.push(No);
      else if (bn) bo.push(No);
      else if (hn) Ao.push(No);
      else if (isTeamPermissionUpdate(No.text))
        logForDebugging(
          "[InboxPoller] Dropping team_permission_update message: permission rules are never accepted from the inbox",
          { level: "warn" },
        );
      else if (Mn)
        logForDebugging(
          "[InboxPoller] Dropping mode_set_request message: permission mode changes are never accepted from the inbox",
          { level: "warn" },
        );
      else if (Xo) Bo.push(No);
      else if (isStructuredProtocolMessage(No.text)) {
        let Sn = Dt.get(No);
        if (Sn) {
          let $n = { ...No, text: planApprovalResumeText(Sn) };
          (Et.add($n), Ro.push($n));
        } else
          logForDebugging(
            `[InboxPoller] Dropping unrouted protocol frame from ${jsonStringify(No.from)}: ${jsonStringify(No.text.substring(0, 80))}`,
            { level: "warn" },
          );
      } else Ro.push(No);
    }
    if (so.length > 0 && isTeamLead(state.teamContext)) {
      logForDebugging(`[InboxPoller] Found ${so.length} permission request(s)`);
      let No = state.teamContext?.teamName,
        vo;
      for (let Yo of so) {
        let kn = isPermissionRequest(Yo.text);
        if (!kn) continue;
        if (kn.agent_id !== Yo.from) {
          logForDebugging(
            `[InboxPoller] Dropping permission request ${jsonStringify(kn.request_id)}: agent_id ${jsonStringify(kn.agent_id)} does not match sender ${jsonStringify(Yo.from)}`,
            { level: "warn" },
          );
          continue;
        }
        let Fn = qS(getAllBaseTools(), kn.tool_name) ?? createUnknownToolStub(kn.tool_name),
          bn = typeof kn.tool_name === "string" ? kn.tool_name : Fn.name,
          Go = gCt(
            "tool",
            Yo.from,
            kn.request_id,
            typeof kn.tool_use_id === "string" ? kn.tool_use_id : void 0,
          );
        if (this.#d.has(Go)) continue;
        this.#d.add(Go);
        let hn = Xt(),
          Mn = pCt(kn.agent_id, Yo.from, this.#C()),
          Xo,
          Sn;
        try {
          ((Xo = BVt(bn, kn.input)),
            (Sn = await buildForwardedPermissionDialog({
              tool: Fn,
              input: kn.input,
              description: kn.description,
              toolUseID: kn.tool_use_id,
              permissionResult: { behavior: "ask", message: kn.description },
              assistantMessage: createAssistantMessage({ content: "" }),
              theme: "dark",
              requestSource: { type: "subagent", agentName: Mn },
              toolPermissionContext: state.toolPermissionContext,
            })));
        } catch (error) {
          logError(error);
          let mr = Xo === void 0 ? void 0 : { tool_use_id: kn.tool_use_id, tool_name: bn, input_digest: Xo },
            Kn = mr === void 0 ? "input could not be digested" : "dialog build failed";
          this.#w(
            () =>
              sendPermissionResponseViaMailbox(
                Yo.from,
                { decision: "rejected", resolvedBy: "leader", approvedRequest: mr },
                kn.request_id,
                No,
                storageV5,
                kn.tool_use_id,
              ),
            () =>
              `[InboxPoller] Rejection for permission request ${jsonStringify(kn.request_id)} (${Kn}) could not be delivered to ${jsonStringify(Yo.from)} after a retry; the worker stays parked`,
          )
            .then(() => hn)
            .finally(() => this.#d.delete(Go))
            .catch(logError);
          continue;
        }
        let { dialog: dialog, descriptor: descriptor } = Sn,
          _o = new CountedAsk(),
          cn = { tool_use_id: kn.tool_use_id, tool_name: bn, input_digest: Xo };
        if (!vo) vo = { name: Mn, tool: kn.tool_name };
        let Dn = requestDialog(dialog, descriptor, {
          place: "under",
          armInputGrace: !0,
          ...(isNotAskUserQuestionCard(dialog.kind) && { countedAsk: _o }),
        });
        (_o.settleWhen(Dn),
          Dn.then((wn) => {
            let mr;
            switch (wn.behavior) {
              case "allow":
                mr = {
                  decision: "approved",
                  resolvedBy: "leader",
                  updatedInput: wn.updatedInput,
                  permissionUpdates: wn.permissionUpdates ? [...wn.permissionUpdates] : void 0,
                  approvedRequest: cn,
                };
                break;
              case "deny":
                mr = {
                  decision: "rejected",
                  resolvedBy: "leader",
                  feedback: wn.feedback,
                  approvedRequest: cn,
                };
                break;
              case "cancelled":
                mr = { decision: "rejected", resolvedBy: "leader", approvedRequest: cn };
                break;
            }
            let Kn = () =>
              sendPermissionResponseViaMailbox(Yo.from, mr, kn.request_id, No, storageV5, kn.tool_use_id);
            this.#w(
              Kn,
              () =>
                `[InboxPoller] ${mr.decision === "approved" ? "Approval" : "Rejection"} for permission request ${jsonStringify(kn.request_id)} could not be delivered to ${jsonStringify(Yo.from)} after a retry; the worker stays parked`,
            )
              .then(() => hn)
              .finally(() => this.#d.delete(Go))
              .catch(logError);
          }));
      }
      if (vo && !isLoading && !visibleDialogKind)
        gB(
          {
            message: `${fCt(vo.name)} needs permission for ${typeof vo.tool === "string" ? Uur(vo.tool) : "(unnamed tool)"}`,
            notificationType: "worker_permission_prompt",
          },
          terminal,
          { storageV5: storageV5, credentials: credentials },
        );
    }
    if (po.length > 0 && isTeammate()) {
      logForDebugging(`[InboxPoller] Found ${po.length} permission response(s)`);
      for (let No of po) {
        let vo = isPermissionResponse(No.text);
        if (!vo) continue;
        if (No.from !== TEAM_LEAD) {
          logForDebugging(
            `[InboxPoller] Ignoring permission response from non-team-lead: ${jsonStringify(No.from)}`,
            { level: "warn" },
          );
          continue;
        }
        if (h.hasPermissionCallback(vo.request_id))
          if (
            (logForDebugging(
              `[InboxPoller] Processing permission response for ${jsonStringify(vo.request_id)}: ${jsonStringify(vo.subtype)}`,
            ),
            vo.subtype === "success")
          )
            h.processMailboxPermissionResponse({
              requestId: vo.request_id,
              decision: "approved",
              updatedInput: vo.response?.updated_input,
              permissionUpdates: vo.response?.permission_updates,
              toolUseId: vo.tool_use_id,
              approvedRequest: vo.approved_request,
            });
          else
            h.processMailboxPermissionResponse({
              requestId: vo.request_id,
              decision: "rejected",
              feedback: vo.error,
              toolUseId: vo.tool_use_id,
              approvedRequest: vo.approved_request,
            });
      }
    }
    if (ao.length > 0 && isTeamLead(state.teamContext)) {
      logForDebugging(`[InboxPoller] Found ${ao.length} sandbox permission request(s)`);
      let No = state.teamContext?.teamName,
        vo = this.#l;
      async function Yo(Fn) {
        let toolPermissionContext = store.getState().toolPermissionContext,
          Go = getModeBaseBehavior(
            toolPermissionContext.mode,
            toolPermissionContext.isBypassPermissionsModeAvailable,
          ),
          mode = toolPermissionContext.mode;
        switch (Go) {
          case "allow":
            return { resolved: !0, mode: mode };
          case "deny":
            return { resolved: !1, mode: mode };
          case "classify":
            if (isClassifierSideCallRetired("forwarded_sandbox_host")) return { resolved: !1, mode: mode };
            return {
              resolved: await vo.getOrClassify(Fn, void 0, v1o, () =>
                classifySandboxNetworkHost(
                  Fn,
                  void 0,
                  [],
                  getAllBaseTools(),
                  toolPermissionContext,
                  new AbortController().signal,
                  { isSubagentLoop: !1, storageV5: storageV5, credentials: credentials },
                ),
              ),
              mode: mode,
            };
          case "ask":
            return { resolved: null, mode: mode };
        }
      }
      let kn = !1;
      for (let Fn of ao) {
        let bn = isSandboxPermissionRequest(Fn.text);
        if (!bn) continue;
        if (typeof bn.hostPattern?.host !== "string" || !bn.hostPattern.host) {
          logForDebugging(
            "[InboxPoller] Invalid sandbox permission request: missing or non-string hostPattern.host",
          );
          continue;
        }
        if (bn.workerName !== Fn.from) {
          logForDebugging(
            `[InboxPoller] Dropping sandbox request ${jsonStringify(bn.requestId)}: workerName ${jsonStringify(bn.workerName)} does not match sender ${jsonStringify(Fn.from)}`,
            { level: "warn" },
          );
          continue;
        }
        if (typeof bn.workerName !== "string" || !bn.workerName) {
          logForDebugging(
            "[InboxPoller] Invalid sandbox permission request: missing or non-string workerName",
          );
          continue;
        }
        let Go = gCt("sandbox", Fn.from, bn.requestId, bn.hostPattern.host),
          hn = describeInvalidHost(bn.hostPattern.host);
        if (hn !== null) {
          if (this.#d.has(Go)) continue;
          (logForDebugging(
            `[InboxPoller] Denying sandbox request ${jsonStringify(bn.requestId)}: ${hn} (${toApprovalLabel(bn.hostPattern.host) ?? "(unshowable)"})`,
            { level: "warn" },
          ),
            this.#d.add(Go));
          let _o = Xt(),
            cn = () =>
              sendSandboxPermissionResponseViaMailbox(
                Fn.from,
                bn.requestId,
                bn.hostPattern.host,
                !1,
                No,
                storageV5,
              );
          this.#w(
            cn,
            () =>
              `[InboxPoller] Deny for sandbox request ${jsonStringify(bn.requestId)} (${hn}) could not be delivered to ${jsonStringify(Fn.from)} after a retry; the worker stays parked`,
          )
            .then(() => _o)
            .finally(() => this.#d.delete(Go))
            .catch(logError);
          continue;
        }
        if (this.#d.has(Go)) continue;
        let { resolved: resolved, mode: mode } = await Yo(bn.hostPattern.host);
        if (resolved !== null) {
          if (this.#d.has(Go)) continue;
          this.#d.add(Go);
          let _o = Xt();
          logForDebugging(
            `[InboxPoller] Auto-resolving sandbox request ${jsonStringify(bn.requestId)} (mode=${mode}, allow=${resolved})`,
          );
          let cn = () =>
            sendSandboxPermissionResponseViaMailbox(
              Fn.from,
              bn.requestId,
              bn.hostPattern.host,
              resolved,
              No,
              storageV5,
            );
          this.#w(
            cn,
            () =>
              `[InboxPoller] Auto-resolved verdict for sandbox request ${jsonStringify(bn.requestId)} (allow=${resolved}) could not be delivered to ${jsonStringify(Fn.from)} after a retry; the worker stays parked`,
          )
            .then(() => _o)
            .finally(() => this.#d.delete(Go))
            .catch(logError);
          continue;
        }
        let host = bn.hostPattern.host;
        if (this.#d.has(Go)) continue;
        this.#d.add(Go);
        let $n = Xt(),
          on = pCt(bn.workerName, Fn.from, this.#C());
        if (
          (askSandboxNetworkFromWorker(
            { host: host, workerName: on, requestId: bn.requestId },
            {
              requestDialog: requestDialog,
              sendResponse: (_o) =>
                sendSandboxPermissionResponseViaMailbox(
                  Fn.from,
                  bn.requestId,
                  host,
                  _o,
                  store.getState().teamContext?.teamName,
                  storageV5,
                ),
              applyPermissionUpdate: (_o) =>
                setState((cn) => ({
                  ...cn,
                  toolPermissionContext: applyValidatedPermissionUpdate(cn.toolPermissionContext, _o),
                })),
            },
          )
            .then(() => $n)
            .finally(() => this.#d.delete(Go))
            .catch(logError),
          !kn && !isLoading && !visibleDialogKind)
        ) {
          kn = !0;
          let _o = bunStringWidth(host) <= SHORT_LABEL_WIDTH ? labelOr(host, "a host") : "a host";
          gB(
            {
              message: `${fCt(on)} needs network access to ${_o}`,
              notificationType: "worker_permission_prompt",
            },
            terminal,
            { storageV5: storageV5, credentials: credentials },
          );
        }
      }
    }
    if (co.length > 0 && isTeammate()) {
      logForDebugging(`[InboxPoller] Found ${co.length} sandbox permission response(s)`);
      for (let No of co) {
        let vo = isSandboxPermissionResponse(No.text);
        if (!vo) continue;
        if (No.from !== TEAM_LEAD) {
          logForDebugging(
            `[InboxPoller] Ignoring sandbox permission response from non-team-lead: ${jsonStringify(No.from)}`,
            { level: "warn" },
          );
          continue;
        }
        if (h.hasSandboxPermissionCallback(vo.requestId)) {
          if (
            (logForDebugging(
              `[InboxPoller] Processing sandbox permission response for ${jsonStringify(vo.requestId)}: allow=${jsonStringify(vo.allow)}`,
            ),
            h.processSandboxPermissionResponse({ requestId: vo.requestId, host: vo.host, allow: vo.allow }))
          )
            setState((kn) => ({ ...kn, pendingSandboxRequest: null }));
        }
      }
    }
    if (Bo.length > 0 && isTeamLead(state.teamContext)) {
      logForDebugging(`[InboxPoller] Found ${Bo.length} plan approval request(s)`);
      let No = state.teamContext?.teamName;
      for (let vo of Bo) {
        let Yo = isPlanApprovalRequest(vo.text);
        if (!Yo) continue;
        if (!isTeammateAwaitingPlan(vo.from, store.getState().tasks)) {
          Ro.push(vo);
          continue;
        }
        let state = store.getState(),
          Fn = teammateModeAfterPlan({
            recipientName: vo.from,
            leaderMode: state.toolPermissionContext.mode,
            leaderAutoPickedByLevel: hasLeftProactivityBaseline(state.toolPermissionContext),
            proactivityLevel: state.proactivityLevel,
            tasks: state.tasks,
          }),
          bn = {
            type: "plan_approval_response",
            requestId: Yo.requestId,
            approved: !0,
            timestamp: new Date().toISOString(),
            permissionMode: Fn,
          };
        if (
          (await h.writeToMailbox(
            vo.from,
            { from: TEAM_LEAD, text: jsonStringify(bn), timestamp: new Date().toISOString() },
            No,
            storageV5,
          )) === void 0
        ) {
          (logForDebugging(
            `[InboxPoller] FAILED to write plan approval response to ${jsonStringify(vo.from)} (request ${jsonStringify(Yo.requestId)}) \u2014 the teammate is still awaiting approval`,
            { level: "error" },
          ),
            Ro.push(vo));
          continue;
        }
        (logForDebugging(
          `[InboxPoller] Auto-approved plan from ${jsonStringify(vo.from)} (request ${jsonStringify(Yo.requestId)})`,
        ),
          Ro.push(vo));
      }
    }
    if (bo.length > 0 && isTeammate()) {
      logForDebugging(`[InboxPoller] Found ${bo.length} shutdown request(s)`);
      for (let No of bo) Ro.push(No);
    }
    if (Ao.length > 0 && isTeamLead(state.teamContext)) {
      logForDebugging(`[InboxPoller] Found ${Ao.length} shutdown approval(s)`);
      for (let No of Ao) {
        let vo = isShutdownApproved(No.text);
        if (!vo) continue;
        let Yo = Object.values(state.teamContext?.teammates ?? {}).find(
          (kn) => kn.name === vo.from,
        )?.tmuxPaneId;
        if (vo.paneId && vo.backendType && vo.paneId === Yo)
          (async () => {
            try {
              await ensureBackendsRegistered();
              let kn = await isInsideTmux(),
                bn = await getBackendByType(vo.backendType)?.killPane(vo.paneId, !kn);
              logForDebugging(
                `[InboxPoller] Killed pane ${jsonStringify(vo.paneId)} for ${jsonStringify(vo.from)}: ${bn}`,
              );
            } catch (error) {
              logForDebugging(`[InboxPoller] Failed to kill pane for ${jsonStringify(vo.from)}: ${error}`);
            }
          })();
        (await killTeammate(vo.from, state, setState, storageV5), Ro.push(No));
      }
    }
    let mapped = Ro.map((No) => messageIdentityKey(No));
    for (let No of mapped) this.#m.add(No);
    let Io = () => {
      for (let No of mapped) this.#m.delete(No);
    };
    Xt().then(Io);
    let Wo;
    try {
      Wo = await filterMailboxThroughReceiveHooks(Ro, {
        provenanceOf: (No) => It.get(No) ?? "unverifiable",
        agentId: void 0,
        isPassedThrough: (No) => !Ot(No) && (Et.has(No) || isStructuredProtocolMessage(No.text)),
      });
    } catch (error) {
      throw (Io(), error);
    }
    if (Xe !== this.#n) {
      Io();
      return;
    }
    if (Wo.length === 0) {
      io();
      return;
    }
    let mn = formatTeammateMessages(Wo, { recipientIsLead: isTeamLead(state.teamContext) }),
      Cn = () => {
        setState((No) => ({
          ...No,
          inbox: {
            messages: [
              ...No.inbox.messages,
              ...Wo.map((vo) => ({
                id: randomUUID_17(),
                from: vo.from,
                text: vo.text,
                timestamp: vo.timestamp,
                status: "pending",
                color: vo.color,
                summary: vo.summary,
                ...(vo.provenance === "forged" && { provenance: vo.provenance }),
              })),
            ],
          },
        }));
      };
    if (!isLoading && !visibleDialogKind) {
      if ((logForDebugging("[InboxPoller] Session idle, submitting immediately"), !onSubmitMessage(mn)))
        (logForDebugging("[InboxPoller] Submission rejected, queuing for later delivery"), Cn());
    } else (logForDebugging("[InboxPoller] Session busy, queuing for later delivery"), Cn());
    io();
  }
  #x() {
    let { store: store } = this.#e,
      setState = store.setState,
      {
        enabled: enabled,
        isLoading: isLoading,
        visibleDialogKind: visibleDialogKind,
        onSubmitMessage: onSubmitMessage,
      } = this.#t;
    if (!enabled) return;
    if (isLoading || visibleDialogKind) return;
    let state = store.getState();
    if (!getAgentNameToPoll(this.#e.identity, state)) return;
    let filtered = state.inbox.messages.filter((message) => message.status === "pending"),
      filtered_2 = state.inbox.messages.filter((message) => message.status === "processed");
    if (filtered_2.length > 0) {
      logForDebugging(
        `[InboxPoller] Cleaning up ${filtered_2.length} processed message(s) that were delivered mid-turn`,
      );
      let rt = new Set(filtered_2.map((kt) => kt.id));
      setState((kt) => ({
        ...kt,
        inbox: { messages: kt.inbox.messages.filter((message) => !rt.has(message.id)) },
      }));
    }
    if (filtered.length === 0) return;
    logForDebugging(`[InboxPoller] Session idle, delivering ${filtered.length} pending message(s)`);
    let ze = formatTeammateMessages(filtered, { recipientIsLead: isTeamLead(state.teamContext) });
    if (onSubmitMessage(ze)) {
      let rt = new Set(filtered.map((kt) => kt.id));
      setState((kt) => ({
        ...kt,
        inbox: { messages: kt.inbox.messages.filter((message) => !rt.has(message.id)) },
      }));
    } else logForDebugging("[InboxPoller] Submission rejected, keeping messages queued");
  }
}
/**
 * React hook：创建队友 inbox 轮询器（读未读消息、标记已读、写邮箱、处理权限/沙箱回复），挂载时启动、卸载时停止，并把 enabled/isLoading/对话框/提交回调等输入同步给它。
 */
//@ chunk-18hwfzwa.js:1688080-1688778 placement
function useInboxPollerHook(props) {
  let {
      enabled: enabled,
      isLoading: isLoading,
      visibleDialogKind: visibleDialogKind,
      onSubmitMessage: onSubmitMessage,
    } = props,
    { requestDialog: requestDialog } = props,
    Re = Cr(),
    Be = useTerminalNotification(),
    He = useClock(),
    { storageV5: storageV5, credentials: credentials } = Me(),
    [Xe] = y(
      () =>
        new useInboxPoller(
          {
            identity: getSenderKind(),
            store: Re,
            terminal: Be,
            storageV5: storageV5,
            credentials: credentials,
            setTimeout: (rt, kt) => He.setTimeout(rt, kt),
            readUnreadMessages: (...rt) => readUnreadMessages(...rt),
            markMessagesAsRead: (...rt) => markMessagesAsRead(...rt),
            writeToMailbox: (...rt) => writeToMailbox(...rt),
            hasPermissionCallback: Yjs,
            processMailboxPermissionResponse: processMailboxPermissionResponse,
            hasSandboxPermissionCallback: Qjs,
            processSandboxPermissionResponse: processSandboxPermissionResponse,
          },
          props,
        ),
    );
  (P(() => (Xe.start(), () => Xe.stop()), [Xe]),
    P(() => {
      Xe.setInputs({
        enabled: enabled,
        isLoading: isLoading,
        visibleDialogKind: visibleDialogKind,
        onSubmitMessage: onSubmitMessage,
        requestDialog: requestDialog,
      });
    }, [Xe, enabled, isLoading, visibleDialogKind, onSubmitMessage, requestDialog]));
}
//@ chunk-18hwfzwa.js:1688778-1688782 placement
j();

export { useInboxPollerHook };
