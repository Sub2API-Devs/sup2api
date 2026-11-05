/**
 * tools/SendFileTool/SendFileTool.ts
 *
 * 2.1.316 新增：SendFile 工具：跨会话发送文件；解析发送文件的接收方（uds、桥接、对等会话名）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9aspw092.js (12)
 * attribution: placement 12
 */
import { realpath, unlink } from "fs/promises";
import { basename } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  preprocess,
  array,
  objectSchema,
  booleanSchema,
  numberSchema,
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
import { matchesToolName } from "../../Tool.js";
import { SENDFILE, SEND_FILE_SHORT_DESCRIPTION, sendFileToolPrompt } from "./prompt.js";
import { hasIsolatePeerMachines } from "../../utils/settings/settings.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { encodeControlChars, escapeForTag } from "../../utils/sanitization.js";
import { setPendingPermissionNote } from "../../utils/permissions/permissionRecord.js";
import { getDenyRuleForTool, findAskRuleForTool } from "../../utils/permissions/permissions.js";
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

//@ chunk-9aspw092.js:13848-14769 placement
/**
 * SendFile 的输入 schema（收件人与文件列表）、输出 schema、跨会话/跨机器两种拒绝说明、并发上限（4）与两个并发限制器。
 */
var SendFileInputSchema = DoctorLazy(() =>
  zodStrictObject({
    to: stringSchema().describe(
      `Recipient: a peer session name from ${LISTAGENTS}, or an explicit uds:<socket> / bridge:<session id> address`,
    ),
    files: preprocess(
      (files) => (typeof files === "string" ? [files] : files),
      array(stringSchema()).min(1).max(MAX_PEER_ATTACHMENTS),
    ).describe(
      "File paths (absolute or relative to cwd) to send. Always pass an array, even for a single file.",
    ),
    message: stringSchema().optional().describe("Optional short message delivered alongside the files"),
  }),
);
var sendFileOutputSchema = DoctorLazy(() =>
  objectSchema({
    success: booleanSchema(),
    message: stringSchema(),
    msg_id: stringSchema().optional(),
    files: array(
      objectSchema({
        path: stringSchema(),
        size: numberSchema().optional(),
        sha256: stringSchema().optional(),
        file_uuid: stringSchema().optional(),
        error: stringSchema().optional(),
      }),
    ).describe("Per-file transfer outcome"),
  }),
);
var SEND_FILE_SESSION_REFUSAL = "Cross-session file transfer is not available in this session.";
var MAX_PARALLEL_FILE_TRANSFERS = 4;
var fileReadLimiter = limitConcurrency(MAX_PARALLEL_FILE_TRANSFERS, (task) => task());
var fileSendLimiter = limitConcurrency(MAX_PARALLEL_FILE_TRANSFERS, (task) => task());
var SEND_FILE_MACHINE_REFUSAL =
  "Cross-machine file transfer is unavailable: it uploads file contents through Anthropic servers, which this provider/privacy configuration does not allow. Same-machine (uds:) transfers still work.";
//@ chunk-9aspw092.js:14769-14901 placement
function describeNameShare(sameNamedSiblings) {
  if (sameNamedSiblings === undefined || sameNamedSiblings === 0) return;
  return ` (note: ${sameNamedSiblings} other live ${plural(sameNamedSiblings, "agent now shares", "agents now share")} this name)`;
}
//@ chunk-9aspw092.js:14901-15124 placement
var SEND_TO_MAIN_HINT = `use ${SENDMESSAGE} to "${MAIN}" and reference the file as @<path>`;
var SEND_FILE_REFUSAL_REASONS = {
  unreachable_elevated: ELEVATED_UNREACHABLE_REASON,
  recipient_gate_off: RECIPIENT_CANNOT_RECEIVE_REASON,
  self: SELF_TARGET_REASON,
  impersonation: "target record advertises this session's own token \u2014 refused as impersonation",
};
//@ chunk-9aspw092.js:15124-20426 placement
/**
 * 解析发送文件的接收方（uds、桥接、对等会话名）。
 */
async function resolveFileRecipient(addressText, resolverContext, toolContext) {
  let address = parseAddress(addressText);
  if (address.scheme === "uds") {
    if (mayBeOwnSocket(address.target))
      return {
        kind: "refused",
        reason: "self",
        message: ownAddressMessage(addressText),
      };
    return {
      kind: "uds",
      sock: address.target,
      label: addressText,
      byName: false,
    };
  }
  if (address.scheme === "bridge") {
    if (isOwnBridgeSession(address.target))
      return {
        kind: "refused",
        reason: "self",
        message: ownAddressMessage(addressText),
      };
    let elevatedRefusal = unreachableElevatedRefusal(toolContext.session, address.target, addressText);
    if (elevatedRefusal)
      return {
        kind: "refused",
        reason: "unreachable_elevated",
        message: elevatedRefusal,
      };
    let gateRefusal = cannotReceiveRefusal(toolContext.session, address.target, addressText);
    if (gateRefusal)
      return {
        kind: "refused",
        reason: "recipient_gate_off",
        message: gateRefusal,
      };
    return {
      kind: "bridge",
      sessionId: address.target,
      label: addressText,
      byName: false,
      ...(isInboundUnreported(toolContext.session, address.target) && {
        identityNote: UNCONFIRMED_DELIVERY_NOTE,
      }),
    };
  }
  if (address.scheme === "did")
    return {
      kind: "refused",
      message: `DID peers accept text only \u2014 use ${SENDMESSAGE} to send to '${addressText}'.`,
    };
  let target = await resolveCrossSessionAddress(
    toolContext.session,
    addressText,
    resolverContext,
    toolContext.resolverState(),
    toolContext.storageV5,
    toolContext.credentials,
  );
  switch (target.kind) {
    case "local-session":
      if (isOwnSocket(target.sock))
        return {
          kind: "refused",
          reason: "self",
          message: ownAddressMessage(addressText),
        };
      if (isImpersonatedOwnRef(addressText, target.sock))
        return {
          kind: "refused",
          reason: "impersonation",
          message: impersonatedSelfMessage(addressText),
        };
      if (mayBeOwnSocket(target.sock))
        return {
          kind: "refused",
          reason: "self",
          message: ownAddressMessage(addressText),
        };
      return {
        kind: "uds",
        sock: target.sock,
        label: target.displayName,
        byName: true,
        contestedNote: describeNameShare(target.sameNamedSiblings),
        identityNote: ` (${LOCAL_SESSION_LABEL}${describeLocalTargetCaveats(target)})${
          target.previouslyPinned
            ? `
${PREVIOUSLY_PINNED_NOTE}`
            : target.restartedSincePin
              ? `
${RESTARTED_SINCE_PIN_NOTE}`
              : target.identityContested
                ? `
${IDENTITY_CONTESTED_NOTE}`
                : ""
        }`,
        pin: {
          displayName: target.displayName,
          kind: "session",
          id: target.pinId,
          sock: target.sock,
          claimedSessionIds: target.claimedSessionIds,
        },
      };
    case "cloud-session": {
      if (isOwnBridgeSession(target.sessionId))
        return {
          kind: "refused",
          reason: "self",
          message: ownAddressMessage(addressText),
        };
      let {
        isRemoteControlPeerUnreachableFromHere,
        formatUnreachableElevatedRefusal,
      } = require("../../bridge/trustedDevice.js");
      if (target.via === "remote-control" && isRemoteControlPeerUnreachableFromHere())
        return {
          kind: "refused",
          reason: "unreachable_elevated",
          message: formatUnreachableElevatedRefusal(target.displayName),
        };
      let gateRefusal = cannotReceiveRefusal(toolContext.session, target.sessionId, target.displayName);
      if (gateRefusal)
        return {
          kind: "refused",
          reason: "recipient_gate_off",
          message: gateRefusal,
        };
      return {
        kind: "bridge",
        sessionId: target.sessionId,
        label: target.displayName,
        byName: true,
        via: target.via,
        contestedNote: describeNameShare(target.sameNamedSiblings),
        identityNote: ` (${describeRemoteSessionKind(target.via)}${target.via === "remote-control" && !target.reportsInbound && !target.inboundReportUnavailable ? UNCONFIRMED_DELIVERY_NOTE : ""}${describeRemoteTargetCaveats(target)})${
          target.previouslyPinned
            ? `
${PREVIOUSLY_PINNED_NOTE}`
            : ""
        }`,
        pin: {
          displayName: target.displayName,
          kind: target.refKind,
          id: target.sessionId,
        },
      };
    }
    case "ambiguous": {
      let selfKind = classifySelfName(addressText);
      if (selfKind === "categorical" && target.matchedBy === "prefix" && isSearchComplete(target))
        return {
          kind: "refused",
          reason: "self",
          message: selfTargetMessage(
            addressText,
            isTeammateOrSubagentContext(toolContext),
            SEND_TO_MAIN_HINT,
          ),
        };
      let now = Date.now();
      let filtered = target.candidates.filter((candidate) => candidate.where !== "in-process");
      let joined = filtered.map((candidate) => `  ${agentAddressLabel(candidate, now)}`).join(`
`);
      let availabilityNote = target.bridgeUnavailable
        ? `
Your account's other sessions (Remote Control and cloud) could not be checked just now, so this list may be missing one; retry if you meant one of them.`
        : "";
      if (target.cloudUnavailable)
        availabilityNote += `
The cloud session list could not be fetched just now, so this list may be missing a cloud session; retry if you meant one.`;
      if (target.localUnavailable)
        availabilityNote += `
The sessions on this machine could not be listed just now, so this list may be missing one here; retry if you meant a session on this machine.`;
      if (target.searchTruncated) availabilityNote += TRUNCATED_SEARCH_PARAGRAPH;
      if (target.pinnedIdentityClaimedLocally)
        availabilityNote += `
Note: '${target.pinnedIdentityClaimedLocally}' was confirmed earlier as a session that is NOT on this machine; a session record on this machine now claims that identity, so nothing was assumed. A session on this machine claiming that identity, that your user did not set up, is suspicious: ask the user before confirming anyone.`;
      return {
        kind: "refused",
        message:
          filtered.length > 0
            ? `'${addressText}' matches ${filtered.length} peer session(s). Re-send with the ref:
${joined}${availabilityNote}${selfKind !== "no" ? selfAliasNote(addressText, isTeammateOrSubagentContext(toolContext), SEND_TO_MAIN_HINT) : ""}`
            : `'${addressText}' matches only agents in this session \u2014 use ${SENDMESSAGE} and reference the file as @<path> instead.${availabilityNote}`,
      };
    }
    case "not-found": {
      let selfClassification = classifySelfName(addressText);
      let any = target.closest.some(
        (candidate) =>
          slugifySessionName(candidate.name) ===
          slugifySessionName(parseNameWithRef(addressText)?.name ?? addressText),
      );
      if (selfClassification === "categorical" && !any && isSearchComplete(target))
        return {
          kind: "refused",
          reason: "self",
          message: selfTargetMessage(
            addressText,
            isTeammateOrSubagentContext(toolContext),
            SEND_TO_MAIN_HINT,
          ),
        };
      let any_2 = toolContext.tools.some((tool) => matchesToolName(tool, LISTAGENTS));
      let filtered = target.closest.filter((candidate) => candidate.where !== "in-process");
      let suggestionText =
        filtered.length > 0
          ? ` Did you mean: ${filtered.map((candidate) => candidate.name).join(", ")}?`
          : "";
      let listHint = any_2
        ? `Use ${LISTAGENTS} to see the sessions you can send files to.`
        : "Check the spelling.";
      let cloudUnavailableNote = target.cloudUnavailable
        ? `
The cloud session list could not be fetched just now, so cloud sessions were not searched.`
        : "";
      let bridgeUnavailableNote = target.bridgeUnavailable
        ? `
Your account's other sessions (Remote Control and cloud) could not be checked just now, so they were not searched. If '${addressText}' is one, retry${any_2 ? ` (or run ${LISTAGENTS} first)` : ""}.`
        : "";
      let pinnedIdentityNote = target.pinnedIdentityClaimedLocally
        ? `
Note: '${target.pinnedIdentityClaimedLocally}' was confirmed earlier as a session that is NOT on this machine; a session record on this machine now claims that identity, which hides it here \u2014 nothing was sent.${any_2 ? ` ${LISTAGENTS} will not show it while that claim stands.` : ""} A session on this machine impersonating it is suspicious: ask the user.`
        : "";
      let localUnavailableNote = target.localUnavailable
        ? `
The sessions on this machine could not be listed just now, so they were not searched; retry if you meant a session on this machine.`
        : "";
      let renamedNote = target.renamedTo ? renamedSessionNote(addressText, target.renamedTo.name) : "";
      return {
        kind: "refused",
        message: `No peer session named '${addressText}' is reachable.${renamedNote}${suggestionText}${cloudUnavailableNote}${bridgeUnavailableNote}${localUnavailableNote}${target.searchTruncated ? TRUNCATED_SEARCH_PARAGRAPH : ""}${pinnedIdentityNote}${selfClassification !== "no" ? selfAliasNote(addressText, isTeammateOrSubagentContext(toolContext), SEND_TO_MAIN_HINT) : ""}
${listHint}`,
      };
    }
    default:
      return {
        kind: "refused",
        message: `'${addressText}' is an agent in this session \u2014 it already shares your filesystem, so there is nothing to transfer. Use ${SENDMESSAGE} and reference the file as @<path> instead. ${SENDFILE} is for OTHER Claude Code sessions (a peer session on this machine, or a Remote Control / cloud session).`,
      };
  }
}
//@ chunk-9aspw092.js:20426-20563 placement
function sendFileDedupeKey(input) {
  let filesList = Array.isArray(input.files)
    ? input.files.toSorted()
    : typeof input.files === "string"
      ? [input.files]
      : input.files;
  return [input.to, input.message ?? null, filesList];
}
//@ chunk-9aspw092.js:20563-20615 placement
/**
 * 判断值是非 null 的对象。
 */
function isObjectLike(checkedNoteForInput) {
  return typeof checkedNoteForInput === "object" && checkedNoteForInput !== null;
}
//@ chunk-9aspw092.js:20615-20748 placement
var REMOTE_TRANSFER_NOTE =
  "If the recipient is a Remote Control or cloud session, the file contents travel via Anthropic's servers to another machine.";
//@ chunk-9aspw092.js:20748-20970 placement
function discloseRemoteTransfer(decision, callOptions, input) {
  if (!hasIsolatePeerMachines() || decision.behavior !== "ask") return decision;
  callOptions.disclosed = true;
  return {
    ...decision,
    message: stripNonPrintable(
      `${decision.message ?? `Send ${input.files.length} ${plural(input.files.length, "file")} to '${input.to}'?`} ${REMOTE_TRANSFER_NOTE} (isolatePeerMachines is enabled.)`,
    ),
  };
}
//@ chunk-9aspw092.js:20970-21039 placement
/**
 * 判断决定原因是否为 ruleBehavior=ask 的规则。
 */
function isAskRuleDecision(decisionReason) {
  return decisionReason?.type === "rule" && decisionReason.rule?.ruleBehavior === "ask";
}
//@ chunk-9aspw092.js:21039-21660 placement
/**
 * 发送文件时使用的上下文代理。
 */
function sendFileContext(toolContext, callOptions) {
  return {
    get session() {
      return toolContext.session;
    },
    get storageV5() {
      return toolContext.storageV5;
    },
    get credentials() {
      return toolContext.credentials;
    },
    get agentContext() {
      return toolContext.agentContext;
    },
    get teammateContext() {
      return toolContext.teammateContext;
    },
    get tools() {
      return toolContext.tools;
    },
    get toolState() {
      return toolContext.toolState;
    },
    get messages() {
      return toolContext.messages;
    },
    get resolverState() {
      return toolContext.resolverState;
    },
    get setSendMessagePins() {
      return toolContext.setSendMessagePins;
    },
    get permissions() {
      return toolContext.permissions;
    },
    get toolUseId() {
      return callOptions.toolUseId;
    },
    get signal() {
      return callOptions.signal;
    },
    get permissionPhase() {
      return callOptions.permissionPhase;
    },
    get permissionRound() {
      return callOptions.permissionRound;
    },
  };
}
//@ chunk-9aspw092.js:21660-21781 placement
function requireAsk(callContext) {
  if (callContext.ask === undefined)
    throw Error("SendFile: dispatch needs the permission pipeline (call.ask)");
  return callContext.ask;
}
//@ chunk-9aspw092.js:21781-30498 placement
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
  toAutoClassifierInput(input) {
    let fileNames = Array.isArray(input.files)
      ? input.files.join(", ")
      : typeof input.files === "string"
        ? input.files
        : "[no files]";
    let messageSuffix =
      typeof input.message === "string" && input.message.length > 0
        ? ` \u2014 message: ${input.message}`
        : "";
    return `to ${input.to}: ${fileNames}${messageSuffix}`;
  },
  async description() {
    return SEND_FILE_SHORT_DESCRIPTION;
  },
  async prompt() {
    return sendFileToolPrompt(MAX_PEER_ATTACHMENTS, MAX_PEER_FILE_BYTES / 1048576);
  },
  mapToolResultToToolResultBlockParam(result, toolUseId) {
    let flattened = result.files.flatMap((file) =>
      file.error === undefined ? [] : [`  ${encodeControlChars(file.path)}: ${escapeForTag(file.error)}`],
    );
    let lines = [result.message];
    if (result.msg_id !== undefined) lines.push(`msg_id: ${result.msg_id}`);
    if (flattened.length > 0)
      lines.push(
        `${flattened.length} ${plural(flattened.length, "file")} could NOT be sent:
` +
          flattened.join(`
`),
      );
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: lines.join(`
`),
    };
  },
  renderToolUseMessage(input) {
    if (typeof input.to !== "string") return null;
    return `${Array.isArray(input.files) ? input.files.join(", ") : ""} \u2192 ${input.to}`;
  },
  create(toolContext) {
    return {
      async checkPermissions(input, callOptions) {
        let context = sendFileContext(toolContext, callOptions);
        let permissions = context.permissions();
        let disclosureState = {};
        setPendingPermissionNote(context, input, disclosureState, SENDFILE);
        let denyRuleForTool = getDenyRuleForTool(permissions, READ_PATH_PROBE);
        if (denyRuleForTool)
          return {
            behavior: "deny",
            message: "SendFile reads file contents; that action is disabled.",
            decisionReason: {
              type: "rule",
              rule: denyRuleForTool,
            },
          };
        let otherDecision;
        let askDecision;
        let mapped = input.files.map((file) => readPermissionDecisionForPath(expandPath(file), permissions));
        let found = mapped.find((decision) => decision.behavior === "deny");
        if (found) return found;
        for (let decision of mapped)
          if (decision.behavior !== "allow") {
            if (isAskRuleDecision(decision.decisionReason)) {
              askDecision ??= decision;
              continue;
            }
            if (otherDecision === undefined) otherDecision = decision;
          }
        if (askDecision !== undefined) return discloseRemoteTransfer(askDecision, disclosureState, input);
        let fileAllowRule = findAskRuleForTool(permissions, READ_PATH_PROBE);
        if (fileAllowRule)
          return discloseRemoteTransfer(
            {
              behavior: "ask",
              message: stripNonPrintable(
                `Send ${input.files.length} ${plural(input.files.length, "file")} to '${input.to}'? SendFile reads file contents.`,
              ),
              decisionReason: {
                type: "rule",
                rule: fileAllowRule,
              },
            },
            disclosureState,
            input,
          );
        if (hasIsolatePeerMachines()) {
          let recipient;
          try {
            recipient = await resolveFileRecipient(input.to, input.message ?? "", context);
            if (recipient.kind !== "refused") disclosureState.transport = recipient;
          } catch (error) {
            logForDebugging(
              `[SendFile] up-front resolve failed (${stripAnsiAndControls(errorMessage(error))}) \u2014 asking as usual`,
              {
                level: "warn",
              },
            );
          }
          if (recipient?.kind === "refused" && recipient.reason !== undefined) {
            if (!hasMintedReentry(context))
              logEvent("tengu_send_file", {
                transport: lit("refused"),
                file_count: input.files.length,
                delivered_count: 0,
                success: false,
              });
            return {
              behavior: "deny",
              message: stripNonPrintable(recipient.message),
              decisionReason: {
                type: "other",
                reason: SEND_FILE_REFUSAL_REASONS[recipient.reason],
              },
            };
          }
          return {
            behavior: "ask",
            message: stripNonPrintable(
              `Send ${input.files.length} ${plural(input.files.length, "file")} to '${input.to}'? ${REMOTE_TRANSFER_NOTE}`,
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
        if (otherDecision !== undefined) return otherDecision;
        if (permissions.mode === "plan")
          return {
            behavior: "ask",
            message: `${SENDFILE} would send file contents to another session \u2014 approve the plan first.`,
            decisionReason: {
              type: "mode",
              mode: "plan",
            },
          };
        if (permissions.mode === "auto")
          return {
            behavior: "passthrough",
            message: "SendFile requires classifier review.",
          };
        return {
          behavior: "allow",
          updatedInput: input,
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
          let shapeRefusal = checkAttachmentPathShape(file);
          if (shapeRefusal !== undefined) return shapeRefusal;
        }
        return {
          result: true,
        };
      },
      async call(input, callOptions) {
        let context = sendFileContext(toolContext, callOptions);
        let { to } = input;
        let { message } = input;
        let files = input.files;
        let fileList = Array.isArray(files)
          ? files.filter((file) => typeof file === "string")
          : typeof files === "string"
            ? [files]
            : [];
        let checkedNoteForInput = getCheckedNoteForInput(context, input, sendFileDedupeKey);
        let disclosedState = isObjectLike(checkedNoteForInput) ? checkedNoteForInput : {};
        let checkedResultForInput = getCheckedResultForInput(context, input, sendFileDedupeKey);
        let alreadyApproved = wasAskedForSameInput(
          context,
          input,
          sendFileDedupeKey,
          (priorDecision) =>
            isIsolatePeerAsk(priorDecision) ||
            (priorDecision.behavior === "ask" &&
              disclosedState.disclosed === true &&
              checkedResultForInput?.behavior === "ask" &&
              priorDecision.message === checkedResultForInput.message),
        );
        let transport = disclosedState.transport;
        let signal = context.signal;
        let permissions = context.permissions();
        if (!isPeerSendFileEnabled()) {
          logEvent("tengu_send_file", {
            transport: lit("gated_off"),
            file_count: fileList.length,
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
        let recipient = transport ?? (await resolveFileRecipient(to, message ?? "", context));
        if (transport?.kind === "bridge") {
          let {
            isRemoteControlPeerUnreachableFromHere,
            formatUnreachableElevatedRefusal,
          } = require("../../bridge/trustedDevice.js");
          let unreachableRefusal =
            unreachableElevatedRefusal(context.session, transport.sessionId, transport.label) ??
            (transport.via === "remote-control" && isRemoteControlPeerUnreachableFromHere()
              ? formatUnreachableElevatedRefusal(transport.label)
              : undefined);
          if (unreachableRefusal)
            recipient = {
              kind: "refused",
              reason: "unreachable_elevated",
              message: unreachableRefusal,
            };
          else {
            let gateRefusal = cannotReceiveRefusal(context.session, transport.sessionId, transport.label);
            if (gateRefusal)
              recipient = {
                kind: "refused",
                reason: "recipient_gate_off",
                message: gateRefusal,
              };
          }
        }
        if (recipient.kind === "uds" && isOwnSocket(recipient.sock))
          recipient = {
            kind: "refused",
            reason: "self",
            message: ownAddressMessage(to),
          };
        else if (recipient.kind === "uds" && isImpersonatedOwnRef(to, recipient.sock))
          recipient = {
            kind: "refused",
            reason: "impersonation",
            message: impersonatedSelfMessage(to),
          };
        else if (
          (recipient.kind === "uds" && mayBeOwnSocket(recipient.sock)) ||
          (recipient.kind === "bridge" && isOwnBridgeSession(recipient.sessionId))
        )
          recipient = {
            kind: "refused",
            reason: "self",
            message: ownAddressMessage(to),
          };
        let refuseResult = (message) => {
          logEvent("tengu_send_file", {
            transport: lit("refused"),
            file_count: fileList.length,
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
        if (recipient.kind === "refused") return refuseResult(recipient.message);
        let currentSessionPeerNameFor = getCurrentSessionPeerNameFor(recipient.kind);
        let defaultMessage = (fileNames) =>
          message?.trim()
            ? message
            : `Sent you ${fileNames.length} ${plural(fileNames.length, "file")}: ${fileNames.join(", ")}`;
        let logOutcome = (success, deliveredCount) => {
          logEvent("tengu_send_file", {
            transport: fromEnum(recipient.kind),
            file_count: fileList.length,
            delivered_count: deliveredCount,
            success,
          });
        };
        let failureResult = (message, files = []) => {
          logOutcome(false, 0);
          return {
            data: {
              success: false,
              message,
              files,
            },
          };
        };
        async function checkReadable(filePath) {
          let realPath;
          try {
            realPath = await realpath(filePath);
          } catch {
            return true;
          }
          if (realPath === filePath) return true;
          if (readPermissionDecisionForPath(realPath, permissions).behavior === "allow") return true;
          return `resolves to '${realPath}', which is not readable under this session's permissions`;
        }
        let mapped = fileList.map((filePath) => expandPath(filePath));
        let mapped_2 = mapped.map((fileName) => basename(fileName));
        if (recipient.kind === "uds") {
          let fileResults = Array(mapped.length);
          let results = await Promise.all(
            mapped.map((filePath, fileIndex) =>
              fileReadLimiter(async () => {
                if (signal.aborted) {
                  fileResults[fileIndex] = {
                    path: filePath,
                    error: "aborted",
                  };
                  return;
                }
                let readabilityError = await checkReadable(filePath);
                if (readabilityError !== true) {
                  fileResults[fileIndex] = {
                    path: filePath,
                    error: readabilityError,
                  };
                  return;
                }
                try {
                  let stagedFile = await stageLocalPeerFile(filePath);
                  fileResults[fileIndex] = {
                    path: filePath,
                    size: stagedFile.file_size,
                    sha256: stagedFile.sha256,
                  };
                  return stagedFile;
                } catch (error) {
                  fileResults[fileIndex] = {
                    path: filePath,
                    error: errorMessage(error),
                  };
                  return;
                }
              }),
            ),
          );
          sweepStaleSpoolEntries();
          let filtered = results.filter((stagedFile) => stagedFile !== undefined);
          let cleanupStaged = () => {
            for (let stagedFile of filtered) unlink(stagedFile.path).catch(() => {});
          };
          if (signal.aborted) {
            cleanupStaged();
            throw new AbortError();
          }
          if (filtered.length === 0)
            return failureResult(`No files could be staged for transfer to ${recipient.label}.`, fileResults);
          let { sendToUdsSocket } = require("../../utils/udsMessaging/SessionRecordsUnreadableError.lazy.js");
          try {
            let { msgId } = await sendToUdsSocket(
              recipient.sock,
              defaultMessage(filtered.map((stagedFile) => stagedFile.file_name)),
              context.storageV5,
              currentSessionPeerNameFor,
              filtered,
              lastPeerHopChain(context.messages()),
              undefined,
              {
                recipientName: recipient.byName ? recipient.label : undefined,
              },
            );
            logOutcome(true, filtered.length);
            if (recipient.pin)
              pinSendTarget(context.setSendMessagePins, recipient.pin.displayName, recipient.pin);
            return {
              data: {
                success: true,
                message: `${filtered.length} ${plural(filtered.length, "file")} \u2192 ${recipient.label}${recipient.identityNote ?? ""}${recipient.contestedNote ?? ""}`,
                msg_id: msgId,
                files: fileResults,
              },
            };
          } catch (error) {
            let errnoCode = getErrnoCode(error);
            let inboxGone = isInboxGoneError(error);
            if (isExpectedSendError(error)) cleanupStaged();
            let hint = inboxGone ? staleSocketHint(LISTAGENTS) : errnoCode === "EBUSY" ? PIPE_BUSY_HINT : "";
            let detail =
              isSenderPacedError(error) || isMessageTooLargeError(error)
                ? `: ${errorMessage(error)}`
                : hint || ".";
            return failureResult(
              recipient.byName
                ? `Failed to send to ${recipient.label}${errnoCode ? ` (${errnoCode})` : ""}${detail}`
                : `Failed to send to ${recipient.label}: ${errorMessage(error)}${hint}`,
              fileResults,
            );
          }
        }
        let via = recipient.via ?? "unknown";
        function remoteBlockReason() {
          if (!isPolicyAllowed("allow_send_file")) return SEND_FILE_MACHINE_REFUSAL;
          let remoteSendBlock = getRemoteSendBlock(via);
          if (remoteSendBlock === null) return;
          return remoteSendBlock.cause === "residency"
            ? SEND_FILE_MACHINE_REFUSAL
            : `Cross-machine file transfer is unavailable: ${remoteSendBlock.reason} Same-machine (uds:) transfers still work.`;
        }
        let blockReason = remoteBlockReason();
        if (blockReason !== undefined) return failureResult(blockReason);
        let gateResult = await isolationDispatchGate({
          tool: SendFileTool,
          input: {
            to,
            files: fileList,
            message,
          },
          ask: requireAsk(callOptions),
          permissionPhase: context.permissionPhase,
          alreadyApproved,
          recipientLabel: `'${recipient.label}'`,
          parse: (rawInput) => SendFileInputSchema().safeParse(rawInput),
        });
        if (!gateResult.proceed) {
          let values = Object.values(SEND_FILE_REFUSAL_REASONS);
          return gateResult.decisionReason?.type === "other" &&
            values.includes(gateResult.decisionReason.reason)
            ? refuseResult(gateResult.message)
            : failureResult(gateResult.message);
        }
        let lateBlockReason = remoteBlockReason();
        if (lateBlockReason !== undefined) return failureResult(lateBlockReason);
        if (gateResult.input.files !== fileList || gateResult.input.message !== message) {
          message = gateResult.input.message;
          fileList = gateResult.input.files;
          mapped = fileList.map((filePath) => expandPath(filePath));
          mapped_2 = mapped.map((fileName) => basename(fileName));
        }
        let { uploadBytesToBridgeStore } = await import("../BriefTool/upload.lazy.js");
        let fileResults = Array(mapped.length);
        let results = await Promise.all(
          mapped.map((filePath, fileIndex) =>
            fileSendLimiter(async () => {
              if (signal.aborted) {
                fileResults[fileIndex] = {
                  path: filePath,
                  error: "aborted",
                };
                return;
              }
              let readabilityError = await checkReadable(filePath);
              if (readabilityError !== true) {
                fileResults[fileIndex] = {
                  path: filePath,
                  error: readabilityError,
                };
                return;
              }
              let peerFileBounded = await readPeerFileBounded(filePath, MAX_PEER_FILE_BYTES);
              if (peerFileBounded === null) {
                fileResults[fileIndex] = {
                  path: filePath,
                  error: PEER_FILE_UNREADABLE_TEXT,
                };
                return;
              }
              let sha256 = computeContentHash(peerFileBounded);
              let uploadId = await uploadBytesToBridgeStore(
                peerFileBounded,
                mapped_2[fileIndex],
                "application/octet-stream",
                signal,
                undefined,
                context.credentials,
              );
              if (typeof uploadId !== "string") {
                fileResults[fileIndex] = {
                  path: filePath,
                  size: peerFileBounded.length,
                  error: uploadId.error,
                };
                return;
              }
              fileResults[fileIndex] = {
                path: filePath,
                size: peerFileBounded.length,
                sha256,
                file_uuid: uploadId,
              };
              return {
                file_uuid: uploadId,
                file_name: mapped_2[fileIndex],
                is_image: IMAGE_FILE_EXT_RE.test(filePath),
                file_size: peerFileBounded.length,
                sha256,
                media_type: getAttachmentMimeType(mapped_2[fileIndex]),
              };
            }),
          ),
        );
        if (signal.aborted) throw new AbortError();
        let filtered = results.filter((uploadedFile) => uploadedFile !== undefined);
        if (filtered.length === 0)
          return failureResult(`No files could be uploaded for transfer to ${recipient.label}.`, fileResults);
        let {
          postInterClaudeMessage,
          isLikelyStaleBridgeError,
        } = require("../../bridge/classifyBridgeSendError.lazy.js");
        let bridgeBlockReason = remoteBlockReason();
        if (bridgeBlockReason !== undefined) return failureResult(bridgeBlockReason, fileResults);
        let postResult = await postInterClaudeMessage(
          recipient.sessionId,
          defaultMessage(filtered.map((uploadedFile) => uploadedFile.file_name)),
          currentSessionPeerNameFor,
          filtered,
          lastPeerHopChain(context.messages()),
          undefined,
          context.credentials,
        );
        if (!postResult.ok) {
          let listHint = context.tools.some((tool) => matchesToolName(tool, LISTAGENTS))
            ? ` Call ${LISTAGENTS} to see who is reachable now.`
            : "";
          let staleNote = isLikelyStaleBridgeError(postResult.error)
            ? recipient.byName
              ? ` \u2014 that session may have ended, been archived, or disconnected.${listHint}`
              : ` \u2014 the peer session may have ended or restarted, so this bridge ID is stale.${listHint}`
            : "";
          return failureResult(
            `Failed to send to ${recipient.label}: ${postResult.error ?? "unknown"}${staleNote}`,
            fileResults,
          );
        }
        logOutcome(true, filtered.length);
        if (recipient.pin)
          pinSendTarget(context.setSendMessagePins, recipient.pin.displayName, recipient.pin);
        return {
          data: {
            success: true,
            message: `${filtered.length} ${plural(filtered.length, "file")} \u2192 ${recipient.label}${recipient.identityNote ?? ""}${recipient.contestedNote ?? ""}`,
            msg_id: postResult.msgId,
            files: fileResults,
          },
        };
      },
    };
  },
});
export { SendFileTool };
