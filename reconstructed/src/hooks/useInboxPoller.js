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
import { randomUUID } from "crypto";
import { isTeamLead, hasNonLeadTeammate, isTeammate, isPlanModeRequired } from "../utils/teammate.js";
import { conversationSnapshot, InboxVerdictCache } from "../utils/inboxClassification.js";
import { INVALID_TOOL_NAME_TEXT } from "../utils/deepFreezePlainData.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../utils/debug.js";
import { string, u, literal } from "../../vendor/zod/v4/classic/schemas.js";
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
import { y, P, init_react_production } from "../../vendor/react/cjs/react.production.js";
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
import { swarmHostState } from "../utils/swarm/hostState.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { applyStartupPermissionMode } from "../utils/permissions/bypassPermissionsKillswitch.js";
import { syncTeammateMode } from "../utils/swarm/teamHelpers.js";
import { findTool } from "../services/api/deferredToolsState.js";
import { getAllBaseTools } from "../tools.js";
import {
  hostValidationCacheKey,
  knownHostNameOrUndefined,
  describeApprovalSubject,
  describeInvalidHost,
} from "../utils/sandbox/hostValidation.js";
import { stableHashOfJson } from "../utils/stableHash.js";
import { buildForwardedPermissionDialog } from "../remote/forwardedPermissionDialog.js";
import { createAssistantMessage } from "../utils/messages.js";
import {
  sendPermissionResponseViaMailbox,
  sendSandboxPermissionResponseViaMailbox,
} from "../utils/swarm/permissionSync.js";
import { CountedAsk } from "../utils/countedAsk.js";
import { isNotAskUserQuestionCard } from "../components/permissions/permissionCardKinds.js";
import { notifyAsync } from "../utils/terminalProbe.js";
import {
  displayLabelOrUnnamedTool,
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
import { useAppStoreDirect } from "../state/AppState.js";
import { useTerminalNotification } from "../ink/useTerminalNotification.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { getSenderKind } from "../tools/SendMessageTool/SendMessageTool.js";
import {
  hasPendingSwarmPermission,
  processMailboxPermissionResponse,
  hasPendingSandboxPermission,
  processSandboxPermissionResponse,
} from "./useSwarmPermissionPoller.js";

//@ chunk-18hwfzwa.js:1670156-1670399 fingerprint = getAgentNameToPoll (0.644)
function getAgentNameToPoll(identity, x) {
  switch (identity.kind) {
    case "in-process":
      return;
    case "teammate":
      return identity.agentName;
    case "session": {
      if (isTeamLead(x.teamContext)) {
        if (!hasNonLeadTeammate(x.teamContext)) return;
        let { leadAgentId, teammates } = x.teamContext;
        return teammates[leadAgentId]?.name || "team-lead";
      }
      return;
    }
  }
}
//@ chunk-18hwfzwa.js:1670399-1670424 layout
var INBOX_POLL_DEBOUNCE_MS = 1000;
var emptyConversationSnapshot = conversationSnapshot([]);
//@ chunk-18hwfzwa.js:1670424-1670708 layout
/**
 * 为 inbox 中引用的未知工具名生成最小工具桩（名字、显示名、只能渲染无参数的调用），MCP 工具名带 "(MCP)" 后缀。
 */
function createUnknownToolStub(toolName) {
  let x = typeof toolName === "string" ? toolName : INVALID_TOOL_NAME_TEXT;
  let D = x.startsWith("mcp__");
  return {
    name: x,
    userFacingName: () => (D ? `${x} (MCP)` : x),
    renderToolUseMessage: (L) => {
      if (L !== null && typeof L === "object" && Object.keys(L).length > 0)
        throw Error("unknown-tool stub cannot render parameters");
      return x;
    },
    isMcp: D,
  };
}
//@ chunk-18hwfzwa.js:1670708-1686214 fingerprint = useInboxPoller (0.503)
/**
 * 队友 inbox 轮询器：定期读取未读消息，区分队友消息、权限请求与回复、计划审批（只接受 team-lead）、关停请求，投递到会话或对应回调并标记已读。
 */
class useInboxPoller {
  #e;
  #t;
  #o = false;
  #n = 0;
  #s = null;
  #r = null;
  #c = 0;
  #i = false;
  #a;
  #l = new InboxVerdictCache();
  #d = new Set();
  #m = new Set();
  #p = new Map();
  #u = 0;
  #f = false;
  constructor(h, props) {
    this.#e = h;
    this.#t = props;
  }
  start() {
    if (this.#o) return;
    this.#o = true;
    this.#a = this.#e.store.getState().toolPermissionContext;
    this.#s = this.#e.store.subscribe(this.#S);
    this.#x();
    this.#h();
    this.#g();
  }
  stop() {
    if (!this.#o) return;
    this.#o = false;
    this.#n++;
    this.#s?.();
    this.#s = null;
    this.#b();
    this.#i = false;
  }
  setInputs(h) {
    let x = this.#t;
    this.#t = h;
    if (!this.#o) return;
    let D =
      h.enabled !== x.enabled ||
      h.isLoading !== x.isLoading ||
      h.visibleDialogKind !== x.visibleDialogKind ||
      h.onSubmitMessage !== x.onSubmitMessage;
    if (!D && h.requestDialog === x.requestDialog) return;
    if (D) this.#x();
    this.#h();
    this.#g();
  }
  #S = () => {
    let { toolPermissionContext } = this.#e.store.getState();
    if (toolPermissionContext !== this.#a) {
      this.#a = toolPermissionContext;
      this.#l.clear();
    }
    this.#h();
  };
  #h() {
    let h = this.#t.enabled && !!getAgentNameToPoll(this.#e.identity, this.#e.store.getState());
    if (h && this.#r === null) this.#y();
    else if (!h && this.#r !== null) this.#b();
  }
  #y() {
    let h = ++this.#c;
    let x = () => {
      this.#r = this.#e.setTimeout(() => {
        if (h !== this.#c) return;
        try {
          this.#v();
        } finally {
          if (h === this.#c) x();
        }
      }, INBOX_POLL_DEBOUNCE_MS);
    };
    x();
  }
  #b() {
    this.#c++;
    this.#r?.();
    this.#r = null;
  }
  #g() {
    if (!this.#t.enabled) return;
    if (this.#i) return;
    if (getAgentNameToPoll(this.#e.identity, this.#e.store.getState())) {
      this.#i = true;
      this.#v();
    }
  }
  #v() {
    this.#T().catch((error) => logError(toError(error)));
  }
  #C() {
    return Object.values(this.#e.store.getState().teamContext?.teammates ?? {});
  }
  async #w(h, x) {
    if (!((await h()) || (await h())))
      logForDebugging(x(), {
        level: "error",
      });
  }
  async #T() {
    let h = this.#e;
    let { store, storageV5, credentials, terminal } = h;
    let setState = store.setState;
    let { enabled, isLoading, visibleDialogKind, onSubmitMessage, requestDialog } = this.#t;
    if (!enabled) return;
    let Xe = this.#n;
    let state = store.getState();
    let agentNameToPoll = getAgentNameToPoll(h.identity, state);
    if (!agentNameToPoll) return;
    let unreadMessages = await h.readUnreadMessages(agentNameToPoll, state.teamContext?.teamName, storageV5);
    if (Xe !== this.#n) return;
    if (unreadMessages.length === 0) {
      this.#f = false;
      return;
    }
    logForDebugging(`[InboxPoller] Found ${unreadMessages.length} unread message(s)`);
    let It = dedupeMailboxMessages(
      unreadMessages,
      getInboxPath(agentNameToPoll, state.teamContext?.teamName),
      {
        roster: state.teamContext?.teammates,
        isPaneTeammate: h.identity.kind === "teammate",
      },
    );
    let Ot = (No) => It.get(No) === "forged";
    let Et = new Set();
    let Dt = new Map();
    if (isTeammate() && isPlanModeRequired())
      for (let No of unreadMessages) {
        let response = isPlanApprovalResponse(No.text);
        if (!response) continue;
        if (No.from !== TEAM_LEAD || Ot(No)) {
          logForDebugging(`[InboxPoller] Ignoring plan approval response from non-team-lead: ${No.from}`);
          continue;
        }
        if (store.getState().toolPermissionContext.mode !== "plan") {
          logForDebugging("[InboxPoller] Ignoring plan approval response while not in plan mode");
          continue;
        }
        let swarmPermissions = swarmHostState().swarmPermissions;
        let pendingPlanApproval = swarmPermissions.pendingPlanApproval;
        let Fn = planVerdictBinding(pendingPlanApproval, response);
        if (Fn === "already_answered") {
          logForDebugging(
            `[InboxPoller] Ignoring plan approval response ${jsonStringify(response.requestId)}: the pending request ${jsonStringify(pendingPlanApproval?.requestId)} was already answered`,
          );
          continue;
        }
        if (pendingPlanApproval)
          swarmPermissions.pendingPlanApproval = {
            ...pendingPlanApproval,
            answered: true,
          };
        if (Fn === "mismatch") {
          logForDebugging(
            `[InboxPoller] Plan approval response ${jsonStringify(response.requestId)} does not name the pending plan request ${jsonStringify(pendingPlanApproval?.requestId)}; resolving the wait as a rejection`,
            {
              level: "warn",
            },
          );
          logFeatureSad("plan_approval", "request_binding_mismatch");
          Dt.set(No, planVerdictMismatchRejection(response));
          continue;
        }
        if (Fn === "unbound") logFeatureSad("plan_approval", "verdict_unbound");
        else logFeatureOk("plan_approval");
        Dt.set(No, response);
        logForDebugging(
          `[InboxPoller] Received plan approval response from team-lead: approved=${response.approved}`,
        );
        if (!response.approved) {
          logForDebugging(
            `[InboxPoller] Plan rejected by team lead: ${response.feedback || "No feedback provided"}`,
          );
          continue;
        }
        let permissionMode = response.permissionMode ?? "default";
        let Go = applyStartupPermissionMode(permissionMode, state.toolPermissionContext, setState);
        if (!Go.ok) {
          logForDebugging(
            `[InboxPoller] Refusing inherited mode ${permissionMode} from plan approval: ${Go.error}; exiting plan mode to default`,
            {
              level: "warn",
            },
          );
          applyStartupPermissionMode("default", state.toolPermissionContext, setState);
        }
        await syncTeammateMode(Go.ok ? Go.mode : "default", state.teamContext?.teamName, storageV5);
        logForDebugging(
          `[InboxPoller] Plan approved by team lead, exited plan mode to ${Go.ok ? Go.mode : "default"}`,
        );
      }
    let Lt = ++this.#u;
    let oo;
    let Xt = () =>
      (oo ??= new Promise((resolve) => {
        this.#p.set(Lt, resolve);
      }));
    let io = () => {
      h.markMessagesAsRead(agentNameToPoll, state.teamContext?.teamName, unreadMessages, storageV5)
        .catch((error) => {
          logError(error);
          return false;
        })
        .then((No) => {
          if (!No) {
            logForDebugging(
              `[InboxPoller] Could not mark ${unreadMessages.length} inbox message(s) read; they stay unread and are retried next poll`,
              {
                level: "warn",
              },
            );
            if (!this.#f) {
              this.#f = true;
              logFeatureSad("swarm_inbox_poll", "mark_read_failed");
            }
            return;
          }
          this.#f = false;
          for (let [vo, Yo] of this.#p)
            if (vo <= Lt) {
              Yo();
              this.#p.delete(vo);
            }
        });
    };
    let so = [];
    let po = [];
    let ao = [];
    let co = [];
    let bo = [];
    let Ao = [];
    let Bo = [];
    let Ro = [];
    for (let No of unreadMessages) {
      if (this.#m.has(messageIdentityKey(No))) continue;
      if (Ot(No)) {
        Ro.push(No);
        continue;
      }
      let vo = isPermissionRequest(No.text);
      let Yo = isPermissionResponse(No.text);
      let kn = isSandboxPermissionRequest(No.text);
      let Fn = isSandboxPermissionResponse(No.text);
      let bn = isShutdownRequest(No.text);
      let Go = isShutdownApproved(No.text);
      let hn = Go?.from === No.from ? Go : null;
      let Mn = isModeSetRequest(No.text);
      let Xo = isPlanApprovalRequest(No.text);
      if (vo) so.push(No);
      else if (Yo) po.push(No);
      else if (kn) ao.push(No);
      else if (Fn) co.push(No);
      else if (bn) bo.push(No);
      else if (hn) Ao.push(No);
      else if (isTeamPermissionUpdate(No.text))
        logForDebugging(
          "[InboxPoller] Dropping team_permission_update message: permission rules are never accepted from the inbox",
          {
            level: "warn",
          },
        );
      else if (Mn)
        logForDebugging(
          "[InboxPoller] Dropping mode_set_request message: permission mode changes are never accepted from the inbox",
          {
            level: "warn",
          },
        );
      else if (Xo) Bo.push(No);
      else if (isStructuredProtocolMessage(No.text)) {
        let content = Dt.get(No);
        if (content) {
          let $n = {
            ...No,
            text: planApprovalResumeText(content),
          };
          Et.add($n);
          Ro.push($n);
        } else
          logForDebugging(
            `[InboxPoller] Dropping unrouted protocol frame from ${jsonStringify(No.from)}: ${jsonStringify(No.text.substring(0, 80))}`,
            {
              level: "warn",
            },
          );
      } else Ro.push(No);
    }
    if (so.length > 0 && isTeamLead(state.teamContext)) {
      logForDebugging(`[InboxPoller] Found ${so.length} permission request(s)`);
      let teamName = state.teamContext?.teamName;
      let vo;
      for (let Yo of so) {
        let kn = isPermissionRequest(Yo.text);
        if (!kn) continue;
        if (kn.agent_id !== Yo.from) {
          logForDebugging(
            `[InboxPoller] Dropping permission request ${jsonStringify(kn.request_id)}: agent_id ${jsonStringify(kn.agent_id)} does not match sender ${jsonStringify(Yo.from)}`,
            {
              level: "warn",
            },
          );
          continue;
        }
        let Fn = findTool(getAllBaseTools(), kn.tool_name) ?? createUnknownToolStub(kn.tool_name);
        let bn = typeof kn.tool_name === "string" ? kn.tool_name : Fn.name;
        let Go = hostValidationCacheKey(
          "tool",
          Yo.from,
          kn.request_id,
          typeof kn.tool_use_id === "string" ? kn.tool_use_id : undefined,
        );
        if (this.#d.has(Go)) continue;
        this.#d.add(Go);
        let hn = Xt();
        let Mn = knownHostNameOrUndefined(kn.agent_id, Yo.from, this.#C());
        let Xo;
        let Sn;
        try {
          Xo = stableHashOfJson(bn, kn.input);
          Sn = await buildForwardedPermissionDialog({
            tool: Fn,
            input: kn.input,
            description: kn.description,
            toolUseID: kn.tool_use_id,
            permissionResult: {
              behavior: "ask",
              message: kn.description,
            },
            assistantMessage: createAssistantMessage({
              content: "",
            }),
            theme: "dark",
            requestSource: {
              type: "subagent",
              agentName: Mn,
            },
            toolPermissionContext: state.toolPermissionContext,
          });
        } catch (error) {
          logError(error);
          let mr =
            Xo === undefined
              ? undefined
              : {
                  tool_use_id: kn.tool_use_id,
                  tool_name: bn,
                  input_digest: Xo,
                };
          let Kn = mr === undefined ? "input could not be digested" : "dialog build failed";
          this.#w(
            () =>
              sendPermissionResponseViaMailbox(
                Yo.from,
                {
                  decision: "rejected",
                  resolvedBy: "leader",
                  approvedRequest: mr,
                },
                kn.request_id,
                teamName,
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
        let { dialog, descriptor } = Sn;
        let _o = new CountedAsk();
        let approvedRequest = {
          tool_use_id: kn.tool_use_id,
          tool_name: bn,
          input_digest: Xo,
        };
        if (!vo)
          vo = {
            name: Mn,
            tool: kn.tool_name,
          };
        let Dn = requestDialog(dialog, descriptor, {
          place: "under",
          armInputGrace: true,
          ...(isNotAskUserQuestionCard(dialog.kind) && {
            countedAsk: _o,
          }),
        });
        _o.settleWhen(Dn);
        Dn.then((wn) => {
          let resolution;
          switch (wn.behavior) {
            case "allow":
              resolution = {
                decision: "approved",
                resolvedBy: "leader",
                updatedInput: wn.updatedInput,
                permissionUpdates: wn.permissionUpdates ? [...wn.permissionUpdates] : undefined,
                approvedRequest,
              };
              break;
            case "deny":
              resolution = {
                decision: "rejected",
                resolvedBy: "leader",
                feedback: wn.feedback,
                approvedRequest,
              };
              break;
            case "cancelled":
              resolution = {
                decision: "rejected",
                resolvedBy: "leader",
                approvedRequest,
              };
              break;
          }
          let Kn = () =>
            sendPermissionResponseViaMailbox(
              Yo.from,
              resolution,
              kn.request_id,
              teamName,
              storageV5,
              kn.tool_use_id,
            );
          this.#w(
            Kn,
            () =>
              `[InboxPoller] ${resolution.decision === "approved" ? "Approval" : "Rejection"} for permission request ${jsonStringify(kn.request_id)} could not be delivered to ${jsonStringify(Yo.from)} after a retry; the worker stays parked`,
          )
            .then(() => hn)
            .finally(() => this.#d.delete(Go))
            .catch(logError);
        });
      }
      if (vo && !isLoading && !visibleDialogKind)
        notifyAsync(
          {
            message: `${describeApprovalSubject(vo.name)} needs permission for ${typeof vo.tool === "string" ? displayLabelOrUnnamedTool(vo.tool) : "(unnamed tool)"}`,
            notificationType: "worker_permission_prompt",
          },
          terminal,
          {
            storageV5,
            credentials,
          },
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
            {
              level: "warn",
            },
          );
          continue;
        }
        if (h.hasPermissionCallback(vo.request_id)) {
          logForDebugging(
            `[InboxPoller] Processing permission response for ${jsonStringify(vo.request_id)}: ${jsonStringify(vo.subtype)}`,
          );
          if (vo.subtype === "success")
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
    }
    if (ao.length > 0 && isTeamLead(state.teamContext)) {
      logForDebugging(`[InboxPoller] Found ${ao.length} sandbox permission request(s)`);
      let teamName = state.teamContext?.teamName;
      let vo = this.#l;
      async function Yo(host) {
        let toolPermissionContext = store.getState().toolPermissionContext;
        let modeBaseBehavior = getModeBaseBehavior(
          toolPermissionContext.mode,
          toolPermissionContext.isBypassPermissionsModeAvailable,
        );
        let mode = toolPermissionContext.mode;
        switch (modeBaseBehavior) {
          case "allow":
            return {
              resolved: true,
              mode,
            };
          case "deny":
            return {
              resolved: false,
              mode,
            };
          case "classify":
            if (isClassifierSideCallRetired("forwarded_sandbox_host"))
              return {
                resolved: false,
                mode,
              };
            return {
              resolved: await vo.getOrClassify(host, undefined, emptyConversationSnapshot, () =>
                classifySandboxNetworkHost(
                  host,
                  undefined,
                  [],
                  getAllBaseTools(),
                  toolPermissionContext,
                  new AbortController().signal,
                  {
                    isSubagentLoop: false,
                    storageV5,
                    credentials,
                  },
                ),
              ),
              mode,
            };
          case "ask":
            return {
              resolved: null,
              mode,
            };
        }
      }
      let kn = false;
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
            {
              level: "warn",
            },
          );
          continue;
        }
        if (typeof bn.workerName !== "string" || !bn.workerName) {
          logForDebugging(
            "[InboxPoller] Invalid sandbox permission request: missing or non-string workerName",
          );
          continue;
        }
        let Go = hostValidationCacheKey("sandbox", Fn.from, bn.requestId, bn.hostPattern.host);
        let hn = describeInvalidHost(bn.hostPattern.host);
        if (hn !== null) {
          if (this.#d.has(Go)) continue;
          logForDebugging(
            `[InboxPoller] Denying sandbox request ${jsonStringify(bn.requestId)}: ${hn} (${toApprovalLabel(bn.hostPattern.host) ?? "(unshowable)"})`,
            {
              level: "warn",
            },
          );
          this.#d.add(Go);
          let _o = Xt();
          let cn = () =>
            sendSandboxPermissionResponseViaMailbox(
              Fn.from,
              bn.requestId,
              bn.hostPattern.host,
              false,
              teamName,
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
        let { resolved, mode } = await Yo(bn.hostPattern.host);
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
              teamName,
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
        let $n = Xt();
        let on = knownHostNameOrUndefined(bn.workerName, Fn.from, this.#C());
        askSandboxNetworkFromWorker(
          {
            host,
            workerName: on,
            requestId: bn.requestId,
          },
          {
            requestDialog,
            sendResponse: (allow) =>
              sendSandboxPermissionResponseViaMailbox(
                Fn.from,
                bn.requestId,
                host,
                allow,
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
          .catch(logError);
        if (!kn && !isLoading && !visibleDialogKind) {
          kn = true;
          let _o = bunStringWidth(host) <= SHORT_LABEL_WIDTH ? labelOr(host, "a host") : "a host";
          notifyAsync(
            {
              message: `${describeApprovalSubject(on)} needs network access to ${_o}`,
              notificationType: "worker_permission_prompt",
            },
            terminal,
            {
              storageV5,
              credentials,
            },
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
            {
              level: "warn",
            },
          );
          continue;
        }
        if (h.hasSandboxPermissionCallback(vo.requestId)) {
          logForDebugging(
            `[InboxPoller] Processing sandbox permission response for ${jsonStringify(vo.requestId)}: allow=${jsonStringify(vo.allow)}`,
          );
          if (
            h.processSandboxPermissionResponse({
              requestId: vo.requestId,
              host: vo.host,
              allow: vo.allow,
            })
          )
            setState((kn) => ({
              ...kn,
              pendingSandboxRequest: null,
            }));
        }
      }
    }
    if (Bo.length > 0 && isTeamLead(state.teamContext)) {
      logForDebugging(`[InboxPoller] Found ${Bo.length} plan approval request(s)`);
      let teamName = state.teamContext?.teamName;
      for (let vo of Bo) {
        let Yo = isPlanApprovalRequest(vo.text);
        if (!Yo) continue;
        if (!isTeammateAwaitingPlan(vo.from, store.getState().tasks)) {
          Ro.push(vo);
          continue;
        }
        let state = store.getState();
        let permissionMode = teammateModeAfterPlan({
          recipientName: vo.from,
          leaderMode: state.toolPermissionContext.mode,
          leaderAutoPickedByLevel: hasLeftProactivityBaseline(state.toolPermissionContext),
          proactivityLevel: state.proactivityLevel,
          tasks: state.tasks,
        });
        let bn = {
          type: "plan_approval_response",
          requestId: Yo.requestId,
          approved: true,
          timestamp: new Date().toISOString(),
          permissionMode,
        };
        if (
          (await h.writeToMailbox(
            vo.from,
            {
              from: TEAM_LEAD,
              text: jsonStringify(bn),
              timestamp: new Date().toISOString(),
            },
            teamName,
            storageV5,
          )) === undefined
        ) {
          logForDebugging(
            `[InboxPoller] FAILED to write plan approval response to ${jsonStringify(vo.from)} (request ${jsonStringify(Yo.requestId)}) \u2014 the teammate is still awaiting approval`,
            {
              level: "error",
            },
          );
          Ro.push(vo);
          continue;
        }
        logForDebugging(
          `[InboxPoller] Auto-approved plan from ${jsonStringify(vo.from)} (request ${jsonStringify(Yo.requestId)})`,
        );
        Ro.push(vo);
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
        let tmuxPaneId = Object.values(state.teamContext?.teammates ?? {}).find(
          (kn) => kn.name === vo.from,
        )?.tmuxPaneId;
        if (vo.paneId && vo.backendType && vo.paneId === tmuxPaneId)
          (async () => {
            try {
              await ensureBackendsRegistered();
              let insideTmux = await isInsideTmux();
              let bn = await getBackendByType(vo.backendType)?.killPane(vo.paneId, !insideTmux);
              logForDebugging(
                `[InboxPoller] Killed pane ${jsonStringify(vo.paneId)} for ${jsonStringify(vo.from)}: ${bn}`,
              );
            } catch (error) {
              logForDebugging(`[InboxPoller] Failed to kill pane for ${jsonStringify(vo.from)}: ${error}`);
            }
          })();
        await killTeammate(vo.from, state, setState, storageV5);
        Ro.push(No);
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
        agentId: undefined,
        isPassedThrough: (No) => !Ot(No) && (Et.has(No) || isStructuredProtocolMessage(No.text)),
      });
    } catch (error) {
      Io();
      throw error;
    }
    if (Xe !== this.#n) {
      Io();
      return;
    }
    if (Wo.length === 0) {
      io();
      return;
    }
    let mn = formatTeammateMessages(Wo, {
      recipientIsLead: isTeamLead(state.teamContext),
    });
    let Cn = () => {
      setState((No) => ({
        ...No,
        inbox: {
          messages: [
            ...No.inbox.messages,
            ...Wo.map((m) => ({
              id: randomUUID(),
              from: m.from,
              text: m.text,
              timestamp: m.timestamp,
              status: "pending",
              color: m.color,
              summary: m.summary,
              ...(m.provenance === "forged" && {
                provenance: m.provenance,
              }),
            })),
          ],
        },
      }));
    };
    if (!isLoading && !visibleDialogKind) {
      logForDebugging("[InboxPoller] Session idle, submitting immediately");
      if (!onSubmitMessage(mn)) {
        logForDebugging("[InboxPoller] Submission rejected, queuing for later delivery");
        Cn();
      }
    } else {
      logForDebugging("[InboxPoller] Session busy, queuing for later delivery");
      Cn();
    }
    io();
  }
  #x() {
    let { store } = this.#e;
    let setAppState = store.setState;
    let { enabled, isLoading, visibleDialogKind, onSubmitMessage } = this.#t;
    if (!enabled) return;
    if (isLoading || visibleDialogKind) return;
    let currentAppState = store.getState();
    if (!getAgentNameToPoll(this.#e.identity, currentAppState)) return;
    let pendingMessages = currentAppState.inbox.messages.filter((m) => m.status === "pending");
    let processedMessages = currentAppState.inbox.messages.filter((m) => m.status === "processed");
    if (processedMessages.length > 0) {
      logForDebugging(
        `[InboxPoller] Cleaning up ${processedMessages.length} processed message(s) that were delivered mid-turn`,
      );
      let processedIds = new Set(processedMessages.map((m) => m.id));
      setAppState((prev) => ({
        ...prev,
        inbox: {
          messages: prev.inbox.messages.filter((m) => !processedIds.has(m.id)),
        },
      }));
    }
    if (pendingMessages.length === 0) return;
    logForDebugging(`[InboxPoller] Session idle, delivering ${pendingMessages.length} pending message(s)`);
    let ze = formatTeammateMessages(pendingMessages, {
      recipientIsLead: isTeamLead(currentAppState.teamContext),
    });
    if (onSubmitMessage(ze)) {
      let submittedIds = new Set(pendingMessages.map((m) => m.id));
      setAppState((prev) => ({
        ...prev,
        inbox: {
          messages: prev.inbox.messages.filter((m) => !submittedIds.has(m.id)),
        },
      }));
    } else logForDebugging("[InboxPoller] Submission rejected, keeping messages queued");
  }
}
//@ chunk-18hwfzwa.js:1688080-1688778 placement
/**
 * React hook：创建队友 inbox 轮询器（读未读消息、标记已读、写邮箱、处理权限/沙箱回复），挂载时启动、卸载时停止，并把 enabled/isLoading/对话框/提交回调等输入同步给它。
 */
function useInboxPollerHook(props) {
  let { enabled, isLoading, visibleDialogKind, onSubmitMessage } = props;
  let { requestDialog } = props;
  let store = useAppStoreDirect();
  let terminal = useTerminalNotification();
  let clock = useClock();
  let { storageV5, credentials } = useTheme_2();
  let [Xe] = y(
    () =>
      new useInboxPoller(
        {
          identity: getSenderKind(),
          store,
          terminal,
          storageV5,
          credentials,
          setTimeout: (rt, kt) => clock.setTimeout(rt, kt),
          readUnreadMessages: (...rt) => readUnreadMessages(...rt),
          markMessagesAsRead: (...rt) => markMessagesAsRead(...rt),
          writeToMailbox: (...rt) => writeToMailbox(...rt),
          hasPermissionCallback: hasPendingSwarmPermission,
          processMailboxPermissionResponse,
          hasSandboxPermissionCallback: hasPendingSandboxPermission,
          processSandboxPermissionResponse,
        },
        props,
      ),
  );
  P(() => {
    Xe.start();
    return () => Xe.stop();
  }, [Xe]);
  P(() => {
    Xe.setInputs({
      enabled,
      isLoading,
      visibleDialogKind,
      onSubmitMessage,
      requestDialog,
    });
  }, [Xe, enabled, isLoading, visibleDialogKind, onSubmitMessage, requestDialog]);
}
//@ chunk-18hwfzwa.js:1688778-1688782 placement
init_react_production();
export { useInboxPollerHook };
