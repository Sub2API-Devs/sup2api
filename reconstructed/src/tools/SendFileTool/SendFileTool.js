/**
 * tools/SendFileTool/SendFileTool.ts
 *
 * 2.1.316 新增：SendFile 工具：跨会话发送文件；解析发送文件的接收方（uds、桥接、对等会话名）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dq968kwq.js (12)
 * attribution: placement 12
 */
import { realpath, unlink } from "fs/promises";
import { basename } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  string,
  preprocess,
  array,
  u,
  M,
  E,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { LISTAGENTS } from "../SendMessageTool/listAgents.js";
import {
  MAX_PEER_ATTACHMENTS,
  isPeerSendFileEnabled,
  MAX_PEER_FILE_BYTES,
  PEER_FILE_UNREADABLE_TEXT,
} from "../../utils/peerFileTransfer.js";
import { limitConcurrency } from "../../utils/concurrencyLimit.js";
import { plural } from "../../utils/stringUtils.js";
import { SENDMESSAGE } from "../SendMessageTool/constants.js";
import { MAIN } from "../../utils/sessionPeers.js";
import {
  ELEVATED_UNREACHABLE_REASON,
  RECIPIENT_CANNOT_RECEIVE_REASON,
  unreachableElevatedRefusal,
  cannotReceiveRefusal,
  isInboundUnreported,
} from "../../utils/peerSessions/cloudPeers.js";
import {
  SELF_TARGET_REASON,
  mayBeOwnSocket,
  ownAddressMessage,
  isOwnBridgeSession,
  isOwnSocket,
  isImpersonatedOwnRef,
  impersonatedSelfMessage,
  classifySelfName,
  isSearchComplete,
  selfTargetMessage,
  isTeammateOrSubagentContext,
  selfAliasNote,
} from "../SendMessageTool/selfTarget.js";
import { parseAddress, parsePeerAddress } from "../../utils/peerAddress.js";
import {
  UNCONFIRMED_DELIVERY_NOTE,
  resolveCrossSessionAddress,
  LOCAL_SESSION_LABEL,
  describeLocalTargetCaveats,
  PREVIOUSLY_PINNED_NOTE,
  RESTARTED_SINCE_PIN_NOTE,
  IDENTITY_CONTESTED_NOTE,
  describeRemoteSessionKind,
  describeRemoteTargetCaveats,
  TRUNCATED_SEARCH_PARAGRAPH,
  renamedSessionNote,
  pinSendTarget,
  getRemoteSendBlock,
} from "../SendMessageTool/crossSessionAddressing.js";
import { agentAddressLabel, slugifySessionName, parseNameWithRef } from "../../utils/sessionAddresses.js";
import { toolMatchesName } from "../../Tool.js";
import { SENDFILE, SEND_FILE_SHORT_DESCRIPTION, sendFileToolPrompt } from "./prompt.js";
import { hasIsolatePeerMachines } from "../../utils/settings/settings.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { encodeControlChars, escapeForTag } from "../../utils/sanitization.js";
import { setPendingPermissionNote } from "../../utils/permissions/permissionRecord.js";
import { getDenyRuleForTool, getAskRuleForTool } from "../../utils/permissions/permissions.js";
import { READ_PATH_PROBE, readPermissionDecisionForPath } from "../../utils/permissions/filesystem.js";
import { expandPath } from "../../utils/path.js";
import { logForDebugging } from "../../utils/debug.js";
import { stripAnsiAndControls } from "../../utils/printableName.js";
import { errorMessage, AbortError, getErrnoCode } from "../../utils/errors.js";
import {
  hasMintedReentry,
  getCheckedNoteForInput,
  getCheckedResultForInput,
  wasAskedForSameInput,
  isIsolatePeerAsk,
  isolationDispatchGate,
} from "../SendMessageTool/isolationDispatchGate.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { checkAttachmentPathShape, getAttachmentMimeType } from "../BriefTool/attachments.js";
import { getCurrentSessionPeerNameFor } from "../../utils/sessionStorage.js";
import {
  stageLocalPeerFile,
  sweepStaleSpoolEntries,
  readPeerFileBounded,
} from "../../utils/peerFileReceive.js";
import { lastPeerHopChain } from "../../utils/peerMessageHeaders.js";
import {
  isInboxGoneError,
  isExpectedSendError,
  staleSocketHint,
  PIPE_BUSY_HINT,
  isSenderPacedError,
  isMessageTooLargeError,
} from "../../utils/udsMessaging/peerGuard.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { IMAGE_FILE_EXT_RE } from "../../utils/imagePaste.js";

//@ chunk-dq968kwq.js:12696-13617 placement
/**
 * SendFile 的输入 schema（收件人与文件列表）、输出 schema、跨会话/跨机器两种拒绝说明、并发上限（4）与两个并发限制器。
 */
var SendFileInputSchema = DoctorLazy(() =>
  zodStrictObject({
    to: string().describe(
      `Recipient: a peer session name from ${LISTAGENTS}, or an explicit uds:<socket> / bridge:<session id> address`,
    ),
    files: preprocess(
      (e) => (typeof e === "string" ? [e] : e),
      array(string()).min(1).max(MAX_PEER_ATTACHMENTS),
    ).describe(
      "File paths (absolute or relative to cwd) to send. Always pass an array, even for a single file.",
    ),
    message: string().optional().describe("Optional short message delivered alongside the files"),
  }),
);
var sendFileOutputSchema = DoctorLazy(() =>
  u({
    success: M(),
    message: string(),
    msg_id: string().optional(),
    files: array(
      u({
        path: string(),
        size: E().optional(),
        sha256: string().optional(),
        file_uuid: string().optional(),
        error: string().optional(),
      }),
    ).describe("Per-file transfer outcome"),
  }),
);
var SEND_FILE_SESSION_REFUSAL = "Cross-session file transfer is not available in this session.";
var MAX_PARALLEL_FILE_TRANSFERS = 4;
var fileReadLimiter = limitConcurrency(MAX_PARALLEL_FILE_TRANSFERS, (e) => e());
var fileSendLimiter = limitConcurrency(MAX_PARALLEL_FILE_TRANSFERS, (e) => e());
var SEND_FILE_MACHINE_REFUSAL =
  "Cross-machine file transfer is unavailable: it uploads file contents through Anthropic servers, which this provider/privacy configuration does not allow. Same-machine (uds:) transfers still work.";
//@ chunk-dq968kwq.js:13617-13749 placement
function describeNameShare(sameNamedSiblings) {
  if (sameNamedSiblings === undefined || sameNamedSiblings === 0) return;
  return ` (note: ${sameNamedSiblings} other live ${plural(sameNamedSiblings, "agent now shares", "agents now share")} this name)`;
}
//@ chunk-dq968kwq.js:13749-13972 placement
var SEND_TO_MAIN_HINT = `use ${SENDMESSAGE} to "${MAIN}" and reference the file as @<path>`;
var SEND_FILE_REFUSAL_REASONS = {
  unreachable_elevated: ELEVATED_UNREACHABLE_REASON,
  recipient_gate_off: RECIPIENT_CANNOT_RECEIVE_REASON,
  self: SELF_TARGET_REASON,
  impersonation: "target record advertises this session's own token \u2014 refused as impersonation",
};
//@ chunk-dq968kwq.js:13972-19274 placement
/**
 * 解析发送文件的接收方（uds、桥接、对等会话名）。
 */
async function resolveFileRecipient(e, i, f) {
  let address = parseAddress(e);
  if (address.scheme === "uds") {
    if (mayBeOwnSocket(address.target))
      return {
        kind: "refused",
        reason: "self",
        message: ownAddressMessage(e),
      };
    return {
      kind: "uds",
      sock: address.target,
      label: e,
      byName: false,
    };
  }
  if (address.scheme === "bridge") {
    if (isOwnBridgeSession(address.target))
      return {
        kind: "refused",
        reason: "self",
        message: ownAddressMessage(e),
      };
    let h = unreachableElevatedRefusal(f.session, address.target, e);
    if (h)
      return {
        kind: "refused",
        reason: "unreachable_elevated",
        message: h,
      };
    let N = cannotReceiveRefusal(f.session, address.target, e);
    if (N)
      return {
        kind: "refused",
        reason: "recipient_gate_off",
        message: N,
      };
    return {
      kind: "bridge",
      sessionId: address.target,
      label: e,
      byName: false,
      ...(isInboundUnreported(f.session, address.target) && {
        identityNote: UNCONFIRMED_DELIVERY_NOTE,
      }),
    };
  }
  if (address.scheme === "did")
    return {
      kind: "refused",
      message: `DID peers accept text only \u2014 use ${SENDMESSAGE} to send to '${e}'.`,
    };
  let crossSessionAddress = await resolveCrossSessionAddress(
    f.session,
    e,
    i,
    f.resolverState(),
    f.storageV5,
    f.credentials,
  );
  switch (crossSessionAddress.kind) {
    case "local-session":
      if (isOwnSocket(crossSessionAddress.sock))
        return {
          kind: "refused",
          reason: "self",
          message: ownAddressMessage(e),
        };
      if (isImpersonatedOwnRef(e, crossSessionAddress.sock))
        return {
          kind: "refused",
          reason: "impersonation",
          message: impersonatedSelfMessage(e),
        };
      if (mayBeOwnSocket(crossSessionAddress.sock))
        return {
          kind: "refused",
          reason: "self",
          message: ownAddressMessage(e),
        };
      return {
        kind: "uds",
        sock: crossSessionAddress.sock,
        label: crossSessionAddress.displayName,
        byName: true,
        contestedNote: describeNameShare(crossSessionAddress.sameNamedSiblings),
        identityNote: ` (${LOCAL_SESSION_LABEL}${describeLocalTargetCaveats(crossSessionAddress)})${
          crossSessionAddress.previouslyPinned
            ? `
${PREVIOUSLY_PINNED_NOTE}`
            : crossSessionAddress.restartedSincePin
              ? `
${RESTARTED_SINCE_PIN_NOTE}`
              : crossSessionAddress.identityContested
                ? `
${IDENTITY_CONTESTED_NOTE}`
                : ""
        }`,
        pin: {
          displayName: crossSessionAddress.displayName,
          kind: "session",
          id: crossSessionAddress.pinId,
          sock: crossSessionAddress.sock,
          claimedSessionIds: crossSessionAddress.claimedSessionIds,
        },
      };
    case "cloud-session": {
      if (isOwnBridgeSession(crossSessionAddress.sessionId))
        return {
          kind: "refused",
          reason: "self",
          message: ownAddressMessage(e),
        };
      let {
        isRemoteControlPeerUnreachableFromHere,
        formatUnreachableElevatedRefusal,
      } = require("./chunk-3kb57csj.js");
      if (crossSessionAddress.via === "remote-control" && isRemoteControlPeerUnreachableFromHere())
        return {
          kind: "refused",
          reason: "unreachable_elevated",
          message: formatUnreachableElevatedRefusal(crossSessionAddress.displayName),
        };
      let y = cannotReceiveRefusal(f.session, crossSessionAddress.sessionId, crossSessionAddress.displayName);
      if (y)
        return {
          kind: "refused",
          reason: "recipient_gate_off",
          message: y,
        };
      return {
        kind: "bridge",
        sessionId: crossSessionAddress.sessionId,
        label: crossSessionAddress.displayName,
        byName: true,
        via: crossSessionAddress.via,
        contestedNote: describeNameShare(crossSessionAddress.sameNamedSiblings),
        identityNote: ` (${describeRemoteSessionKind(crossSessionAddress.via)}${crossSessionAddress.via === "remote-control" && !crossSessionAddress.reportsInbound && !crossSessionAddress.inboundReportUnavailable ? UNCONFIRMED_DELIVERY_NOTE : ""}${describeRemoteTargetCaveats(crossSessionAddress)})${
          crossSessionAddress.previouslyPinned
            ? `
${PREVIOUSLY_PINNED_NOTE}`
            : ""
        }`,
        pin: {
          displayName: crossSessionAddress.displayName,
          kind: crossSessionAddress.refKind,
          id: crossSessionAddress.sessionId,
        },
      };
    }
    case "ambiguous": {
      let h = classifySelfName(e);
      if (
        h === "categorical" &&
        crossSessionAddress.matchedBy === "prefix" &&
        isSearchComplete(crossSessionAddress)
      )
        return {
          kind: "refused",
          reason: "self",
          message: selfTargetMessage(e, isTeammateOrSubagentContext(f), SEND_TO_MAIN_HINT),
        };
      let now = Date.now();
      let filtered = crossSessionAddress.candidates.filter((candidate) => candidate.where !== "in-process");
      let joined = filtered.map((w) => `  ${agentAddressLabel(w, now)}`).join(`
`);
      let v = crossSessionAddress.bridgeUnavailable
        ? `
Your account's other sessions (Remote Control and cloud) could not be checked just now, so this list may be missing one; retry if you meant one of them.`
        : "";
      if (crossSessionAddress.cloudUnavailable)
        v += `
The cloud session list could not be fetched just now, so this list may be missing a cloud session; retry if you meant one.`;
      if (crossSessionAddress.localUnavailable)
        v += `
The sessions on this machine could not be listed just now, so this list may be missing one here; retry if you meant a session on this machine.`;
      if (crossSessionAddress.searchTruncated) v += TRUNCATED_SEARCH_PARAGRAPH;
      if (crossSessionAddress.pinnedIdentityClaimedLocally)
        v += `
Note: '${crossSessionAddress.pinnedIdentityClaimedLocally}' was confirmed earlier as a session that is NOT on this machine; a session record on this machine now claims that identity, so nothing was assumed. A session on this machine claiming that identity, that your user did not set up, is suspicious: ask the user before confirming anyone.`;
      return {
        kind: "refused",
        message:
          filtered.length > 0
            ? `'${e}' matches ${filtered.length} peer session(s). Re-send with the ref:
${joined}${v}${h !== "no" ? selfAliasNote(e, isTeammateOrSubagentContext(f), SEND_TO_MAIN_HINT) : ""}`
            : `'${e}' matches only agents in this session \u2014 use ${SENDMESSAGE} and reference the file as @<path> instead.${v}`,
      };
    }
    case "not-found": {
      let h = classifySelfName(e);
      let any = crossSessionAddress.closest.some(
        (C) => slugifySessionName(C.name) === slugifySessionName(parseNameWithRef(e)?.name ?? e),
      );
      if (h === "categorical" && !any && isSearchComplete(crossSessionAddress))
        return {
          kind: "refused",
          reason: "self",
          message: selfTargetMessage(e, isTeammateOrSubagentContext(f), SEND_TO_MAIN_HINT),
        };
      let any_2 = f.tools.some((tool) => toolMatchesName(tool, LISTAGENTS));
      let filtered = crossSessionAddress.closest.filter((C) => C.where !== "in-process");
      let v = filtered.length > 0 ? ` Did you mean: ${filtered.map((C) => C.name).join(", ")}?` : "";
      let w = any_2 ? `Use ${LISTAGENTS} to see the sessions you can send files to.` : "Check the spelling.";
      let z = crossSessionAddress.cloudUnavailable
        ? `
The cloud session list could not be fetched just now, so cloud sessions were not searched.`
        : "";
      let m = crossSessionAddress.bridgeUnavailable
        ? `
Your account's other sessions (Remote Control and cloud) could not be checked just now, so they were not searched. If '${e}' is one, retry${any_2 ? ` (or run ${LISTAGENTS} first)` : ""}.`
        : "";
      let P = crossSessionAddress.pinnedIdentityClaimedLocally
        ? `
Note: '${crossSessionAddress.pinnedIdentityClaimedLocally}' was confirmed earlier as a session that is NOT on this machine; a session record on this machine now claims that identity, which hides it here \u2014 nothing was sent.${any_2 ? ` ${LISTAGENTS} will not show it while that claim stands.` : ""} A session on this machine impersonating it is suspicious: ask the user.`
        : "";
      let q = crossSessionAddress.localUnavailable
        ? `
The sessions on this machine could not be listed just now, so they were not searched; retry if you meant a session on this machine.`
        : "";
      let r = crossSessionAddress.renamedTo ? renamedSessionNote(e, crossSessionAddress.renamedTo.name) : "";
      return {
        kind: "refused",
        message: `No peer session named '${e}' is reachable.${r}${v}${z}${m}${q}${crossSessionAddress.searchTruncated ? TRUNCATED_SEARCH_PARAGRAPH : ""}${P}${h !== "no" ? selfAliasNote(e, isTeammateOrSubagentContext(f), SEND_TO_MAIN_HINT) : ""}
${w}`,
      };
    }
    default:
      return {
        kind: "refused",
        message: `'${e}' is an agent in this session \u2014 it already shares your filesystem, so there is nothing to transfer. Use ${SENDMESSAGE} and reference the file as @<path> instead. ${SENDFILE} is for OTHER Claude Code sessions (a peer session on this machine, or a Remote Control / cloud session).`,
      };
  }
}
//@ chunk-dq968kwq.js:19274-19411 placement
function sendFileDedupeKey(e) {
  let i = Array.isArray(e.files) ? e.files.toSorted() : typeof e.files === "string" ? [e.files] : e.files;
  return [e.to, e.message ?? null, i];
}
//@ chunk-dq968kwq.js:19411-19463 placement
/**
 * 判断值是非 null 的对象。
 */
function isObjectLike(checkedNoteForInput) {
  return typeof checkedNoteForInput === "object" && checkedNoteForInput !== null;
}
//@ chunk-dq968kwq.js:19463-19596 placement
var REMOTE_TRANSFER_NOTE =
  "If the recipient is a Remote Control or cloud session, the file contents travel via Anthropic's servers to another machine.";
//@ chunk-dq968kwq.js:19596-19818 placement
function discloseRemoteTransfer(e, i, f) {
  if (!hasIsolatePeerMachines() || e.behavior !== "ask") return e;
  i.disclosed = true;
  return {
    ...e,
    message: stripNonPrintable(
      `${e.message ?? `Send ${f.files.length} ${plural(f.files.length, "file")} to '${f.to}'?`} ${REMOTE_TRANSFER_NOTE} (isolatePeerMachines is enabled.)`,
    ),
  };
}
//@ chunk-dq968kwq.js:19818-19887 placement
/**
 * 判断决定原因是否为 ruleBehavior=ask 的规则。
 */
function isAskRuleDecision(decisionReason) {
  return decisionReason?.type === "rule" && decisionReason.rule?.ruleBehavior === "ask";
}
//@ chunk-dq968kwq.js:19887-20508 placement
/**
 * 发送文件时使用的上下文代理。
 */
function sendFileContext(e, i) {
  return {
    get session() {
      return e.session;
    },
    get storageV5() {
      return e.storageV5;
    },
    get credentials() {
      return e.credentials;
    },
    get agentContext() {
      return e.agentContext;
    },
    get teammateContext() {
      return e.teammateContext;
    },
    get tools() {
      return e.tools;
    },
    get toolState() {
      return e.toolState;
    },
    get messages() {
      return e.messages;
    },
    get resolverState() {
      return e.resolverState;
    },
    get setSendMessagePins() {
      return e.setSendMessagePins;
    },
    get permissions() {
      return e.permissions;
    },
    get toolUseId() {
      return i.toolUseId;
    },
    get signal() {
      return i.signal;
    },
    get permissionPhase() {
      return i.permissionPhase;
    },
    get permissionRound() {
      return i.permissionRound;
    },
  };
}
//@ chunk-dq968kwq.js:20508-20629 placement
function requireAsk(e) {
  if (e.ask === undefined) throw Error("SendFile: dispatch needs the permission pipeline (call.ask)");
  return e.ask;
}
//@ chunk-dq968kwq.js:20629-29348 placement
/**
 * SendFile 工具：跨会话发送文件。
 */
var SendFileTool = buildTool({
  name: SENDFILE,
  searchHint: "send files to another Claude Code session",
  ruleContentField: "files",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  shouldDefer: true,
  userFacingName() {
    return "SendFile";
  },
  get inputSchema() {
    return SendFileInputSchema();
  },
  get outputSchema() {
    return sendFileOutputSchema();
  },
  isEnabled() {
    return isPeerSendFileEnabled();
  },
  isConcurrencySafe() {
    return false;
  },
  isReadOnly() {
    return false;
  },
  toAutoClassifierInput(e) {
    let i = Array.isArray(e.files)
      ? e.files.join(", ")
      : typeof e.files === "string"
        ? e.files
        : "[no files]";
    let f = typeof e.message === "string" && e.message.length > 0 ? ` \u2014 message: ${e.message}` : "";
    return `to ${e.to}: ${i}${f}`;
  },
  async description() {
    return SEND_FILE_SHORT_DESCRIPTION;
  },
  async prompt() {
    return sendFileToolPrompt(MAX_PEER_ATTACHMENTS, MAX_PEER_FILE_BYTES / 1048576);
  },
  mapToolResultToToolResultBlockParam(e, toolUseId) {
    let flattened = e.files.flatMap((file) =>
      file.error === undefined ? [] : [`  ${encodeControlChars(file.path)}: ${escapeForTag(file.error)}`],
    );
    let l = [e.message];
    if (e.msg_id !== undefined) l.push(`msg_id: ${e.msg_id}`);
    if (flattened.length > 0)
      l.push(
        `${flattened.length} ${plural(flattened.length, "file")} could NOT be sent:
` +
          flattened.join(`
`),
      );
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: l.join(`
`),
    };
  },
  renderToolUseMessage(e) {
    if (typeof e.to !== "string") return null;
    return `${Array.isArray(e.files) ? e.files.join(", ") : ""} \u2192 ${e.to}`;
  },
  create(e) {
    return {
      async checkPermissions(i, f) {
        let l = sendFileContext(e, f);
        let s = l.permissions();
        let h = {};
        setPendingPermissionNote(l, i, h, SENDFILE);
        let denyRuleForTool = getDenyRuleForTool(s, READ_PATH_PROBE);
        if (denyRuleForTool)
          return {
            behavior: "deny",
            message: "SendFile reads file contents; that action is disabled.",
            decisionReason: {
              type: "rule",
              rule: denyRuleForTool,
            },
          };
        let y;
        let T;
        let mapped = i.files.map((file) => readPermissionDecisionForPath(expandPath(file), s));
        let found = mapped.find((m) => m.behavior === "deny");
        if (found) return found;
        for (let m of mapped)
          if (m.behavior !== "allow") {
            if (isAskRuleDecision(m.decisionReason)) {
              T ??= m;
              continue;
            }
            if (y === undefined) y = m;
          }
        if (T !== undefined) return discloseRemoteTransfer(T, h, i);
        let askRuleForTool = getAskRuleForTool(s, READ_PATH_PROBE);
        if (askRuleForTool)
          return discloseRemoteTransfer(
            {
              behavior: "ask",
              message: stripNonPrintable(
                `Send ${i.files.length} ${plural(i.files.length, "file")} to '${i.to}'? SendFile reads file contents.`,
              ),
              decisionReason: {
                type: "rule",
                rule: askRuleForTool,
              },
            },
            h,
            i,
          );
        if (hasIsolatePeerMachines()) {
          let m;
          try {
            m = await resolveFileRecipient(i.to, i.message ?? "", l);
            if (m.kind !== "refused") h.transport = m;
          } catch (error) {
            logForDebugging(
              `[SendFile] up-front resolve failed (${stripAnsiAndControls(errorMessage(error))}) \u2014 asking as usual`,
              {
                level: "warn",
              },
            );
          }
          if (m?.kind === "refused" && m.reason !== undefined) {
            if (!hasMintedReentry(l))
              logEvent("tengu_send_file", {
                transport: lit("refused"),
                file_count: i.files.length,
                delivered_count: 0,
                success: false,
              });
            return {
              behavior: "deny",
              message: stripNonPrintable(m.message),
              decisionReason: {
                type: "other",
                reason: SEND_FILE_REFUSAL_REASONS[m.reason],
              },
            };
          }
          return {
            behavior: "ask",
            message: stripNonPrintable(
              `Send ${i.files.length} ${plural(i.files.length, "file")} to '${i.to}'? ${REMOTE_TRANSFER_NOTE}`,
            ),
            decisionReason: {
              type: "safetyCheck",
              reason:
                "isolatePeerMachines is enabled \u2014 file transfer to another session requires explicit approval",
              classifierApprovable: false,
              circuitBreaker: "isolatePeerMachines",
            },
          };
        }
        if (y !== undefined) return y;
        if (s.mode === "plan")
          return {
            behavior: "ask",
            message: `${SENDFILE} would send file contents to another session \u2014 approve the plan first.`,
            decisionReason: {
              type: "mode",
              mode: "plan",
            },
          };
        if (s.mode === "auto")
          return {
            behavior: "passthrough",
            message: "SendFile requires classifier review.",
          };
        return {
          behavior: "allow",
          updatedInput: i,
        };
      },
      async validateInput({ to, files }) {
        if (!isPeerSendFileEnabled()) {
          logEvent("tengu_send_file", {
            transport: lit("gated_off"),
            file_count: files.length,
            delivered_count: 0,
            success: false,
          });
          return {
            result: false,
            message: SEND_FILE_SESSION_REFUSAL,
            errorCode: 9,
          };
        }
        let peerAddress = parsePeerAddress(to, LISTAGENTS);
        if (peerAddress !== undefined)
          return {
            result: false,
            message: peerAddress,
            errorCode: 9,
          };
        let address = parseAddress(to);
        if (
          (address.scheme === "uds" && mayBeOwnSocket(address.target)) ||
          (address.scheme === "bridge" && isOwnBridgeSession(address.target))
        )
          return {
            result: false,
            message: ownAddressMessage(to),
            errorCode: 9,
          };
        for (let file of files) {
          let N = checkAttachmentPathShape(file);
          if (N !== undefined) return N;
        }
        return {
          result: true,
        };
      },
      async call(i, f) {
        let l = sendFileContext(e, f);
        let { to } = i;
        let { message } = i;
        let files = i.files;
        let y = Array.isArray(files)
          ? files.filter((file) => typeof file === "string")
          : typeof files === "string"
            ? [files]
            : [];
        let checkedNoteForInput = getCheckedNoteForInput(l, i, sendFileDedupeKey);
        let v = isObjectLike(checkedNoteForInput) ? checkedNoteForInput : {};
        let checkedResultForInput = getCheckedResultForInput(l, i, sendFileDedupeKey);
        let alreadyApproved = wasAskedForSameInput(
          l,
          i,
          sendFileDedupeKey,
          (n) =>
            isIsolatePeerAsk(n) ||
            (n.behavior === "ask" &&
              v.disclosed === true &&
              checkedResultForInput?.behavior === "ask" &&
              n.message === checkedResultForInput.message),
        );
        let transport = v.transport;
        let signal = l.signal;
        let q = l.permissions();
        if (!isPeerSendFileEnabled()) {
          logEvent("tengu_send_file", {
            transport: lit("gated_off"),
            file_count: y.length,
            delivered_count: 0,
            success: false,
          });
          return {
            data: {
              success: false,
              message: SEND_FILE_SESSION_REFUSAL,
              files: [],
            },
          };
        }
        let r = transport ?? (await resolveFileRecipient(to, message ?? "", l));
        if (transport?.kind === "bridge") {
          let {
            isRemoteControlPeerUnreachableFromHere,
            formatUnreachableElevatedRefusal,
          } = require("./chunk-3kb57csj.js");
          let _ =
            unreachableElevatedRefusal(l.session, transport.sessionId, transport.label) ??
            (transport.via === "remote-control" && isRemoteControlPeerUnreachableFromHere()
              ? formatUnreachableElevatedRefusal(transport.label)
              : undefined);
          if (_)
            r = {
              kind: "refused",
              reason: "unreachable_elevated",
              message: _,
            };
          else {
            let I = cannotReceiveRefusal(l.session, transport.sessionId, transport.label);
            if (I)
              r = {
                kind: "refused",
                reason: "recipient_gate_off",
                message: I,
              };
          }
        }
        if (r.kind === "uds" && isOwnSocket(r.sock))
          r = {
            kind: "refused",
            reason: "self",
            message: ownAddressMessage(to),
          };
        else if (r.kind === "uds" && isImpersonatedOwnRef(to, r.sock))
          r = {
            kind: "refused",
            reason: "impersonation",
            message: impersonatedSelfMessage(to),
          };
        else if (
          (r.kind === "uds" && mayBeOwnSocket(r.sock)) ||
          (r.kind === "bridge" && isOwnBridgeSession(r.sessionId))
        )
          r = {
            kind: "refused",
            reason: "self",
            message: ownAddressMessage(to),
          };
        let C = (message) => {
          logEvent("tengu_send_file", {
            transport: lit("refused"),
            file_count: y.length,
            delivered_count: 0,
            success: false,
          });
          return {
            data: {
              success: false,
              message,
              files: [],
            },
          };
        };
        if (r.kind === "refused") return C(r.message);
        let currentSessionPeerNameFor = getCurrentSessionPeerNameFor(r.kind);
        let Z = (n) =>
          message?.trim() ? message : `Sent you ${n.length} ${plural(n.length, "file")}: ${n.join(", ")}`;
        let K = (success, deliveredCount) => {
          logEvent("tengu_send_file", {
            transport: fromEnum(r.kind),
            file_count: y.length,
            delivered_count: deliveredCount,
            success,
          });
        };
        let U = (message, files = []) => {
          K(false, 0);
          return {
            data: {
              success: false,
              message,
              files,
            },
          };
        };
        async function ee(n) {
          let S;
          try {
            S = await realpath(n);
          } catch {
            return true;
          }
          if (S === n) return true;
          if (readPermissionDecisionForPath(S, q).behavior === "allow") return true;
          return `resolves to '${S}', which is not readable under this session's permissions`;
        }
        let mapped = y.map((n) => expandPath(n));
        let mapped_2 = mapped.map((n) => basename(n));
        if (r.kind === "uds") {
          let n = Array(mapped.length);
          let results = await Promise.all(
            mapped.map((g, D) =>
              fileReadLimiter(async () => {
                if (signal.aborted) {
                  n[D] = {
                    path: g,
                    error: "aborted",
                  };
                  return;
                }
                let Y = await ee(g);
                if (Y !== true) {
                  n[D] = {
                    path: g,
                    error: Y,
                  };
                  return;
                }
                try {
                  let B = await stageLocalPeerFile(g);
                  n[D] = {
                    path: g,
                    size: B.file_size,
                    sha256: B.sha256,
                  };
                  return B;
                } catch (error) {
                  n[D] = {
                    path: g,
                    error: errorMessage(error),
                  };
                  return;
                }
              }),
            ),
          );
          sweepStaleSpoolEntries();
          let filtered = results.filter((g) => g !== undefined);
          let I = () => {
            for (let g of filtered) unlink(g.path).catch(() => {});
          };
          if (signal.aborted) {
            I();
            throw new AbortError();
          }
          if (filtered.length === 0) return U(`No files could be staged for transfer to ${r.label}.`, n);
          let { sendToUdsSocket } = require("./chunk-ewxn4535.js");
          try {
            let { msgId } = await sendToUdsSocket(
              r.sock,
              Z(filtered.map((D) => D.file_name)),
              l.storageV5,
              currentSessionPeerNameFor,
              filtered,
              lastPeerHopChain(l.messages()),
              undefined,
              {
                recipientName: r.byName ? r.label : undefined,
              },
            );
            K(true, filtered.length);
            if (r.pin) pinSendTarget(l.setSendMessagePins, r.pin.displayName, r.pin);
            return {
              data: {
                success: true,
                message: `${filtered.length} ${plural(filtered.length, "file")} \u2192 ${r.label}${r.identityNote ?? ""}${r.contestedNote ?? ""}`,
                msg_id: msgId,
                files: n,
              },
            };
          } catch (error) {
            let errnoCode = getErrnoCode(error);
            let Y = isInboxGoneError(error);
            if (isExpectedSendError(error)) I();
            let B = Y ? staleSocketHint(LISTAGENTS) : errnoCode === "EBUSY" ? PIPE_BUSY_HINT : "";
            let _e =
              isSenderPacedError(error) || isMessageTooLargeError(error)
                ? `: ${errorMessage(error)}`
                : B || ".";
            return U(
              r.byName
                ? `Failed to send to ${r.label}${errnoCode ? ` (${errnoCode})` : ""}${_e}`
                : `Failed to send to ${r.label}: ${errorMessage(error)}${B}`,
              n,
            );
          }
        }
        let via = r.via ?? "unknown";
        function W() {
          if (!isPolicyAllowed("allow_send_file")) return SEND_FILE_MACHINE_REFUSAL;
          let remoteSendBlock = getRemoteSendBlock(via);
          if (remoteSendBlock === null) return;
          return remoteSendBlock.cause === "residency"
            ? SEND_FILE_MACHINE_REFUSAL
            : `Cross-machine file transfer is unavailable: ${remoteSendBlock.reason} Same-machine (uds:) transfers still work.`;
        }
        let se = W();
        if (se !== undefined) return U(se);
        let F = await isolationDispatchGate({
          tool: SendFileTool,
          input: {
            to,
            files: y,
            message,
          },
          ask: requireAsk(f),
          permissionPhase: l.permissionPhase,
          alreadyApproved,
          recipientLabel: `'${r.label}'`,
          parse: (n) => SendFileInputSchema().safeParse(n),
        });
        if (!F.proceed) {
          let values = Object.values(SEND_FILE_REFUSAL_REASONS);
          return F.decisionReason?.type === "other" && values.includes(F.decisionReason.reason)
            ? C(F.message)
            : U(F.message);
        }
        let ne = W();
        if (ne !== undefined) return U(ne);
        if (F.input.files !== y || F.input.message !== message) {
          message = F.input.message;
          y = F.input.files;
          mapped = y.map((n) => expandPath(n));
          mapped_2 = mapped.map((n) => basename(n));
        }
        let { uploadBytesToBridgeStore } = await import("./chunk-7kpfrhzn.js");
        let L = Array(mapped.length);
        let results = await Promise.all(
          mapped.map((n, S) =>
            fileSendLimiter(async () => {
              if (signal.aborted) {
                L[S] = {
                  path: n,
                  error: "aborted",
                };
                return;
              }
              let _ = await ee(n);
              if (_ !== true) {
                L[S] = {
                  path: n,
                  error: _,
                };
                return;
              }
              let peerFileBounded = await readPeerFileBounded(n, MAX_PEER_FILE_BYTES);
              if (peerFileBounded === null) {
                L[S] = {
                  path: n,
                  error: PEER_FILE_UNREADABLE_TEXT,
                };
                return;
              }
              let sha256 = computeContentHash(peerFileBounded);
              let g = await uploadBytesToBridgeStore(
                peerFileBounded,
                mapped_2[S],
                "application/octet-stream",
                signal,
                undefined,
                l.credentials,
              );
              if (typeof g !== "string") {
                L[S] = {
                  path: n,
                  size: peerFileBounded.length,
                  error: g.error,
                };
                return;
              }
              L[S] = {
                path: n,
                size: peerFileBounded.length,
                sha256,
                file_uuid: g,
              };
              return {
                file_uuid: g,
                file_name: mapped_2[S],
                is_image: IMAGE_FILE_EXT_RE.test(n),
                file_size: peerFileBounded.length,
                sha256,
                media_type: getAttachmentMimeType(mapped_2[S]),
              };
            }),
          ),
        );
        if (signal.aborted) throw new AbortError();
        let filtered = results.filter((n) => n !== undefined);
        if (filtered.length === 0) return U(`No files could be uploaded for transfer to ${r.label}.`, L);
        let { postInterClaudeMessage, isLikelyStaleBridgeError } = require("./chunk-ypjxapg8.js");
        let te = W();
        if (te !== undefined) return U(te, L);
        let X = await postInterClaudeMessage(
          r.sessionId,
          Z(filtered.map((n) => n.file_name)),
          currentSessionPeerNameFor,
          filtered,
          lastPeerHopChain(l.messages()),
          undefined,
          l.credentials,
        );
        if (!X.ok) {
          let S = l.tools.some((tool) => toolMatchesName(tool, LISTAGENTS))
            ? ` Call ${LISTAGENTS} to see who is reachable now.`
            : "";
          let _ = isLikelyStaleBridgeError(X.error)
            ? r.byName
              ? ` \u2014 that session may have ended, been archived, or disconnected.${S}`
              : ` \u2014 the peer session may have ended or restarted, so this bridge ID is stale.${S}`
            : "";
          return U(`Failed to send to ${r.label}: ${X.error ?? "unknown"}${_}`, L);
        }
        K(true, filtered.length);
        if (r.pin) pinSendTarget(l.setSendMessagePins, r.pin.displayName, r.pin);
        return {
          data: {
            success: true,
            message: `${filtered.length} ${plural(filtered.length, "file")} \u2192 ${r.label}${r.identityNote ?? ""}${r.contestedNote ?? ""}`,
            msg_id: X.msgId,
            files: L,
          },
        };
      },
    };
  },
});
