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
import { zodStrictObject, o, Ka, A, u, M, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { LISTAGENTS } from "../SendMessageTool/listAgents.js";
import { qoe, y2e, Lue, PEER_FILE_UNREADABLE_TEXT } from "../../utils/peerFileTransfer.js";
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
  Zsn,
  impersonatedSelfMessage,
  classifySelfName,
  isSearchComplete,
  selfTargetMessage,
  WL,
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
import { agentAddressLabel, slugifySessionName, d8 } from "../../utils/sessionAddresses.js";
import { toolMatchesName } from "../../Tool.js";
import { SENDFILE, Rri, sendFileToolPrompt } from "./prompt.js";
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
  TTt,
  kTt,
} from "../../utils/udsMessaging/peerGuard.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { FUt } from "../../utils/imagePaste.js";

/**
 * SendFile 工具 schema。
 */
//@ chunk-dq968kwq.js:12696-13617 placement
var SendFileInputSchema = DoctorLazy(() =>
    zodStrictObject({
      to: o().describe(
        `Recipient: a peer session name from ${LISTAGENTS}, or an explicit uds:<socket> / bridge:<session id> address`,
      ),
      files: Ka((e) => (typeof e === "string" ? [e] : e), A(o()).min(1).max(qoe)).describe(
        "File paths (absolute or relative to cwd) to send. Always pass an array, even for a single file.",
      ),
      message: o().optional().describe("Optional short message delivered alongside the files"),
    }),
  ),
  ve = DoctorLazy(() =>
    u({
      success: M(),
      message: o(),
      msg_id: o().optional(),
      files: A(
        u({
          path: o(),
          size: E().optional(),
          sha256: o().optional(),
          file_uuid: o().optional(),
          error: o().optional(),
        }),
      ).describe("Per-file transfer outcome"),
    }),
  ),
  ie = "Cross-session file transfer is not available in this session.",
  me = 4,
  $e = limitConcurrency(me, (e) => e()),
  Ie = limitConcurrency(me, (e) => e()),
  ae =
    "Cross-machine file transfer is unavailable: it uploads file contents through Anthropic servers, which this provider/privacy configuration does not allow. Same-machine (uds:) transfers still work.";
//@ chunk-dq968kwq.js:13617-13749 placement
function describeNameShare(e) {
  if (e === void 0 || e === 0) return;
  return ` (note: ${e} other live ${plural(e, "agent now shares", "agents now share")} this name)`;
}
//@ chunk-dq968kwq.js:13749-13972 placement
var SEND_TO_MAIN_HINT = `use ${SENDMESSAGE} to "${MAIN}" and reference the file as @<path>`,
  SEND_FILE_REFUSAL_REASONS = {
    unreachable_elevated: ELEVATED_UNREACHABLE_REASON,
    recipient_gate_off: RECIPIENT_CANNOT_RECEIVE_REASON,
    self: SELF_TARGET_REASON,
    impersonation: "target record advertises this session's own token \u2014 refused as impersonation",
  };
/**
 * 解析发送文件的接收方（uds、桥接、对等会话名）。
 */
//@ chunk-dq968kwq.js:13972-19274 placement
async function resolveFileRecipient(e, i, f) {
  let l = parseAddress(e);
  if (l.scheme === "uds") {
    if (mayBeOwnSocket(l.target)) return { kind: "refused", reason: "self", message: ownAddressMessage(e) };
    return { kind: "uds", sock: l.target, label: e, byName: !1 };
  }
  if (l.scheme === "bridge") {
    if (isOwnBridgeSession(l.target))
      return { kind: "refused", reason: "self", message: ownAddressMessage(e) };
    let h = unreachableElevatedRefusal(f.session, l.target, e);
    if (h) return { kind: "refused", reason: "unreachable_elevated", message: h };
    let N = cannotReceiveRefusal(f.session, l.target, e);
    if (N) return { kind: "refused", reason: "recipient_gate_off", message: N };
    return {
      kind: "bridge",
      sessionId: l.target,
      label: e,
      byName: !1,
      ...(isInboundUnreported(f.session, l.target) && { identityNote: UNCONFIRMED_DELIVERY_NOTE }),
    };
  }
  if (l.scheme === "did")
    return {
      kind: "refused",
      message: `DID peers accept text only \u2014 use ${SENDMESSAGE} to send to '${e}'.`,
    };
  let s = await resolveCrossSessionAddress(f.session, e, i, f.resolverState(), f.storageV5, f.credentials);
  switch (s.kind) {
    case "local-session":
      if (isOwnSocket(s.sock)) return { kind: "refused", reason: "self", message: ownAddressMessage(e) };
      if (Zsn(e, s.sock))
        return { kind: "refused", reason: "impersonation", message: impersonatedSelfMessage(e) };
      if (mayBeOwnSocket(s.sock)) return { kind: "refused", reason: "self", message: ownAddressMessage(e) };
      return {
        kind: "uds",
        sock: s.sock,
        label: s.displayName,
        byName: !0,
        contestedNote: describeNameShare(s.sameNamedSiblings),
        identityNote: ` (${LOCAL_SESSION_LABEL}${describeLocalTargetCaveats(s)})${
          s.previouslyPinned
            ? `
${PREVIOUSLY_PINNED_NOTE}`
            : s.restartedSincePin
              ? `
${RESTARTED_SINCE_PIN_NOTE}`
              : s.identityContested
                ? `
${IDENTITY_CONTESTED_NOTE}`
                : ""
        }`,
        pin: {
          displayName: s.displayName,
          kind: "session",
          id: s.pinId,
          sock: s.sock,
          claimedSessionIds: s.claimedSessionIds,
        },
      };
    case "cloud-session": {
      if (isOwnBridgeSession(s.sessionId))
        return { kind: "refused", reason: "self", message: ownAddressMessage(e) };
      let {
        isRemoteControlPeerUnreachableFromHere: isRemoteControlPeerUnreachableFromHere,
        formatUnreachableElevatedRefusal: formatUnreachableElevatedRefusal,
      } = require("./chunk-3kb57csj.js");
      if (s.via === "remote-control" && isRemoteControlPeerUnreachableFromHere())
        return {
          kind: "refused",
          reason: "unreachable_elevated",
          message: formatUnreachableElevatedRefusal(s.displayName),
        };
      let y = cannotReceiveRefusal(f.session, s.sessionId, s.displayName);
      if (y) return { kind: "refused", reason: "recipient_gate_off", message: y };
      return {
        kind: "bridge",
        sessionId: s.sessionId,
        label: s.displayName,
        byName: !0,
        via: s.via,
        contestedNote: describeNameShare(s.sameNamedSiblings),
        identityNote: ` (${describeRemoteSessionKind(s.via)}${s.via === "remote-control" && !s.reportsInbound && !s.inboundReportUnavailable ? UNCONFIRMED_DELIVERY_NOTE : ""}${describeRemoteTargetCaveats(s)})${
          s.previouslyPinned
            ? `
${PREVIOUSLY_PINNED_NOTE}`
            : ""
        }`,
        pin: { displayName: s.displayName, kind: s.refKind, id: s.sessionId },
      };
    }
    case "ambiguous": {
      let h = classifySelfName(e);
      if (h === "categorical" && s.matchedBy === "prefix" && isSearchComplete(s))
        return { kind: "refused", reason: "self", message: selfTargetMessage(e, WL(f), SEND_TO_MAIN_HINT) };
      let now = Date.now(),
        filtered = s.candidates.filter((candidate) => candidate.where !== "in-process"),
        joined = filtered.map((w) => `  ${agentAddressLabel(w, now)}`).join(`
`),
        v = s.bridgeUnavailable
          ? `
Your account's other sessions (Remote Control and cloud) could not be checked just now, so this list may be missing one; retry if you meant one of them.`
          : "";
      if (s.cloudUnavailable)
        v += `
The cloud session list could not be fetched just now, so this list may be missing a cloud session; retry if you meant one.`;
      if (s.localUnavailable)
        v += `
The sessions on this machine could not be listed just now, so this list may be missing one here; retry if you meant a session on this machine.`;
      if (s.searchTruncated) v += TRUNCATED_SEARCH_PARAGRAPH;
      if (s.pinnedIdentityClaimedLocally)
        v += `
Note: '${s.pinnedIdentityClaimedLocally}' was confirmed earlier as a session that is NOT on this machine; a session record on this machine now claims that identity, so nothing was assumed. A session on this machine claiming that identity, that your user did not set up, is suspicious: ask the user before confirming anyone.`;
      return {
        kind: "refused",
        message:
          filtered.length > 0
            ? `'${e}' matches ${filtered.length} peer session(s). Re-send with the ref:
${joined}${v}${h !== "no" ? selfAliasNote(e, WL(f), SEND_TO_MAIN_HINT) : ""}`
            : `'${e}' matches only agents in this session \u2014 use ${SENDMESSAGE} and reference the file as @<path> instead.${v}`,
      };
    }
    case "not-found": {
      let h = classifySelfName(e),
        any = s.closest.some((C) => slugifySessionName(C.name) === slugifySessionName(d8(e)?.name ?? e));
      if (h === "categorical" && !any && isSearchComplete(s))
        return { kind: "refused", reason: "self", message: selfTargetMessage(e, WL(f), SEND_TO_MAIN_HINT) };
      let any_2 = f.tools.some((tool) => toolMatchesName(tool, LISTAGENTS)),
        filtered = s.closest.filter((C) => C.where !== "in-process"),
        v = filtered.length > 0 ? ` Did you mean: ${filtered.map((C) => C.name).join(", ")}?` : "",
        w = any_2 ? `Use ${LISTAGENTS} to see the sessions you can send files to.` : "Check the spelling.",
        z = s.cloudUnavailable
          ? `
The cloud session list could not be fetched just now, so cloud sessions were not searched.`
          : "",
        m = s.bridgeUnavailable
          ? `
Your account's other sessions (Remote Control and cloud) could not be checked just now, so they were not searched. If '${e}' is one, retry${any_2 ? ` (or run ${LISTAGENTS} first)` : ""}.`
          : "",
        P = s.pinnedIdentityClaimedLocally
          ? `
Note: '${s.pinnedIdentityClaimedLocally}' was confirmed earlier as a session that is NOT on this machine; a session record on this machine now claims that identity, which hides it here \u2014 nothing was sent.${any_2 ? ` ${LISTAGENTS} will not show it while that claim stands.` : ""} A session on this machine impersonating it is suspicious: ask the user.`
          : "",
        q = s.localUnavailable
          ? `
The sessions on this machine could not be listed just now, so they were not searched; retry if you meant a session on this machine.`
          : "",
        r = s.renamedTo ? renamedSessionNote(e, s.renamedTo.name) : "";
      return {
        kind: "refused",
        message: `No peer session named '${e}' is reachable.${r}${v}${z}${m}${q}${s.searchTruncated ? TRUNCATED_SEARCH_PARAGRAPH : ""}${P}${h !== "no" ? selfAliasNote(e, WL(f), SEND_TO_MAIN_HINT) : ""}
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
function Re(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-dq968kwq.js:19463-19596 placement
var REMOTE_TRANSFER_NOTE =
  "If the recipient is a Remote Control or cloud session, the file contents travel via Anthropic's servers to another machine.";
//@ chunk-dq968kwq.js:19596-19818 placement
function discloseRemoteTransfer(e, i, f) {
  if (!hasIsolatePeerMachines() || e.behavior !== "ask") return e;
  return (
    (i.disclosed = !0),
    {
      ...e,
      message: stripNonPrintable(
        `${e.message ?? `Send ${f.files.length} ${plural(f.files.length, "file")} to '${f.to}'?`} ${REMOTE_TRANSFER_NOTE} (isolatePeerMachines is enabled.)`,
      ),
    }
  );
}
//@ chunk-dq968kwq.js:19818-19887 placement
function Te(e) {
  return e?.type === "rule" && e.rule?.ruleBehavior === "ask";
}
/**
 * 发送文件时使用的上下文代理。
 */
//@ chunk-dq968kwq.js:19887-20508 placement
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
  if (e.ask === void 0) throw Error("SendFile: dispatch needs the permission pipeline (call.ask)");
  return e.ask;
}
/**
 * SendFile 工具：跨会话发送文件。
 */
//@ chunk-dq968kwq.js:20629-29348 placement
var SendFileTool = buildTool({
  name: SENDFILE,
  searchHint: "send files to another Claude Code session",
  ruleContentField: "files",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  shouldDefer: !0,
  userFacingName() {
    return "SendFile";
  },
  get inputSchema() {
    return SendFileInputSchema();
  },
  get outputSchema() {
    return ve();
  },
  isEnabled() {
    return y2e();
  },
  isConcurrencySafe() {
    return !1;
  },
  isReadOnly() {
    return !1;
  },
  toAutoClassifierInput(e) {
    let i = Array.isArray(e.files)
        ? e.files.join(", ")
        : typeof e.files === "string"
          ? e.files
          : "[no files]",
      f = typeof e.message === "string" && e.message.length > 0 ? ` \u2014 message: ${e.message}` : "";
    return `to ${e.to}: ${i}${f}`;
  },
  async description() {
    return Rri;
  },
  async prompt() {
    return sendFileToolPrompt(qoe, Lue / 1048576);
  },
  mapToolResultToToolResultBlockParam(e, i) {
    let flattened = e.files.flatMap((file) =>
        file.error === void 0 ? [] : [`  ${encodeControlChars(file.path)}: ${escapeForTag(file.error)}`],
      ),
      l = [e.message];
    if (e.msg_id !== void 0) l.push(`msg_id: ${e.msg_id}`);
    if (flattened.length > 0)
      l.push(
        `${flattened.length} ${plural(flattened.length, "file")} could NOT be sent:
` +
          flattened.join(`
`),
      );
    return {
      tool_use_id: i,
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
        let l = sendFileContext(e, f),
          permissions = l.permissions(),
          h = {};
        setPendingPermissionNote(l, i, h, SENDFILE);
        let N = getDenyRuleForTool(permissions, READ_PATH_PROBE);
        if (N)
          return {
            behavior: "deny",
            message: "SendFile reads file contents; that action is disabled.",
            decisionReason: { type: "rule", rule: N },
          };
        let y,
          T,
          mapped = i.files.map((file) => readPermissionDecisionForPath(expandPath(file), permissions)),
          found = mapped.find((m) => m.behavior === "deny");
        if (found) return found;
        for (let m of mapped)
          if (m.behavior !== "allow") {
            if (Te(m.decisionReason)) {
              T ??= m;
              continue;
            }
            if (y === void 0) y = m;
          }
        if (T !== void 0) return discloseRemoteTransfer(T, h, i);
        let z = getAskRuleForTool(permissions, READ_PATH_PROBE);
        if (z)
          return discloseRemoteTransfer(
            {
              behavior: "ask",
              message: stripNonPrintable(
                `Send ${i.files.length} ${plural(i.files.length, "file")} to '${i.to}'? SendFile reads file contents.`,
              ),
              decisionReason: { type: "rule", rule: z },
            },
            h,
            i,
          );
        if (hasIsolatePeerMachines()) {
          let m;
          try {
            if (((m = await resolveFileRecipient(i.to, i.message ?? "", l)), m.kind !== "refused"))
              h.transport = m;
          } catch (error) {
            logForDebugging(
              `[SendFile] up-front resolve failed (${stripAnsiAndControls(errorMessage(error))}) \u2014 asking as usual`,
              { level: "warn" },
            );
          }
          if (m?.kind === "refused" && m.reason !== void 0) {
            if (!hasMintedReentry(l))
              logEvent("tengu_send_file", {
                transport: lit("refused"),
                file_count: i.files.length,
                delivered_count: 0,
                success: !1,
              });
            return {
              behavior: "deny",
              message: stripNonPrintable(m.message),
              decisionReason: { type: "other", reason: SEND_FILE_REFUSAL_REASONS[m.reason] },
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
              classifierApprovable: !1,
              circuitBreaker: "isolatePeerMachines",
            },
          };
        }
        if (y !== void 0) return y;
        if (permissions.mode === "plan")
          return {
            behavior: "ask",
            message: `${SENDFILE} would send file contents to another session \u2014 approve the plan first.`,
            decisionReason: { type: "mode", mode: "plan" },
          };
        if (permissions.mode === "auto")
          return { behavior: "passthrough", message: "SendFile requires classifier review." };
        return { behavior: "allow", updatedInput: i };
      },
      async validateInput({ to: i, files: f }) {
        if (!y2e())
          return (
            logEvent("tengu_send_file", {
              transport: lit("gated_off"),
              file_count: f.length,
              delivered_count: 0,
              success: !1,
            }),
            { result: !1, message: ie, errorCode: 9 }
          );
        let l = parsePeerAddress(i, LISTAGENTS);
        if (l !== void 0) return { result: !1, message: l, errorCode: 9 };
        let s = parseAddress(i);
        if (
          (s.scheme === "uds" && mayBeOwnSocket(s.target)) ||
          (s.scheme === "bridge" && isOwnBridgeSession(s.target))
        )
          return { result: !1, message: ownAddressMessage(i), errorCode: 9 };
        for (let h of f) {
          let N = checkAttachmentPathShape(h);
          if (N !== void 0) return N;
        }
        return { result: !0 };
      },
      async call(i, f) {
        let l = sendFileContext(e, f),
          { to: to } = i,
          { message: message } = i,
          files = i.files,
          y = Array.isArray(files)
            ? files.filter((n) => typeof n === "string")
            : typeof files === "string"
              ? [files]
              : [],
          T = getCheckedNoteForInput(l, i, sendFileDedupeKey),
          v = Re(T) ? T : {},
          w = getCheckedResultForInput(l, i, sendFileDedupeKey),
          z = wasAskedForSameInput(
            l,
            i,
            sendFileDedupeKey,
            (n) =>
              isIsolatePeerAsk(n) ||
              (n.behavior === "ask" &&
                v.disclosed === !0 &&
                w?.behavior === "ask" &&
                n.message === w.message),
          ),
          transport = v.transport,
          signal = l.signal,
          permissions = l.permissions();
        if (!y2e())
          return (
            logEvent("tengu_send_file", {
              transport: lit("gated_off"),
              file_count: y.length,
              delivered_count: 0,
              success: !1,
            }),
            { data: { success: !1, message: ie, files: [] } }
          );
        let r = transport ?? (await resolveFileRecipient(to, message ?? "", l));
        if (transport?.kind === "bridge") {
          let {
              isRemoteControlPeerUnreachableFromHere: isRemoteControlPeerUnreachableFromHere,
              formatUnreachableElevatedRefusal: formatUnreachableElevatedRefusal,
            } = require("./chunk-3kb57csj.js"),
            _ =
              unreachableElevatedRefusal(l.session, transport.sessionId, transport.label) ??
              (transport.via === "remote-control" && isRemoteControlPeerUnreachableFromHere()
                ? formatUnreachableElevatedRefusal(transport.label)
                : void 0);
          if (_) r = { kind: "refused", reason: "unreachable_elevated", message: _ };
          else {
            let I = cannotReceiveRefusal(l.session, transport.sessionId, transport.label);
            if (I) r = { kind: "refused", reason: "recipient_gate_off", message: I };
          }
        }
        if (r.kind === "uds" && isOwnSocket(r.sock))
          r = { kind: "refused", reason: "self", message: ownAddressMessage(to) };
        else if (r.kind === "uds" && Zsn(to, r.sock))
          r = { kind: "refused", reason: "impersonation", message: impersonatedSelfMessage(to) };
        else if (
          (r.kind === "uds" && mayBeOwnSocket(r.sock)) ||
          (r.kind === "bridge" && isOwnBridgeSession(r.sessionId))
        )
          r = { kind: "refused", reason: "self", message: ownAddressMessage(to) };
        let C = (n) => (
          logEvent("tengu_send_file", {
            transport: lit("refused"),
            file_count: y.length,
            delivered_count: 0,
            success: !1,
          }),
          { data: { success: !1, message: n, files: [] } }
        );
        if (r.kind === "refused") return C(r.message);
        let Q = getCurrentSessionPeerNameFor(r.kind),
          Z = (n) =>
            message?.trim() ? message : `Sent you ${n.length} ${plural(n.length, "file")}: ${n.join(", ")}`,
          K = (n, S) => {
            logEvent("tengu_send_file", {
              transport: fromEnum(r.kind),
              file_count: y.length,
              delivered_count: S,
              success: n,
            });
          },
          U = (n, S = []) => (K(!1, 0), { data: { success: !1, message: n, files: S } });
        async function ee(n) {
          let S;
          try {
            S = await realpath(n);
          } catch {
            return !0;
          }
          if (S === n) return !0;
          if (readPermissionDecisionForPath(S, permissions).behavior === "allow") return !0;
          return `resolves to '${S}', which is not readable under this session's permissions`;
        }
        let mapped = y.map((n) => expandPath(n)),
          mapped_2 = mapped.map((n) => basename(n));
        if (r.kind === "uds") {
          let n = Array(mapped.length),
            results = await Promise.all(
              mapped.map((g, D) =>
                $e(async () => {
                  if (signal.aborted) {
                    n[D] = { path: g, error: "aborted" };
                    return;
                  }
                  let Y = await ee(g);
                  if (Y !== !0) {
                    n[D] = { path: g, error: Y };
                    return;
                  }
                  try {
                    let B = await stageLocalPeerFile(g);
                    return ((n[D] = { path: g, size: B.file_size, sha256: B.sha256 }), B);
                  } catch (error) {
                    n[D] = { path: g, error: errorMessage(error) };
                    return;
                  }
                }),
              ),
            );
          sweepStaleSpoolEntries();
          let filtered = results.filter((g) => g !== void 0),
            I = () => {
              for (let g of filtered) unlink(g.path).catch(() => {});
            };
          if (signal.aborted) throw (I(), new AbortError());
          if (filtered.length === 0) return U(`No files could be staged for transfer to ${r.label}.`, n);
          let { sendToUdsSocket: sendToUdsSocket } = require("./chunk-ewxn4535.js");
          try {
            let { msgId: msgId } = await sendToUdsSocket(
              r.sock,
              Z(filtered.map((D) => D.file_name)),
              l.storageV5,
              Q,
              filtered,
              lastPeerHopChain(l.messages()),
              void 0,
              { recipientName: r.byName ? r.label : void 0 },
            );
            if ((K(!0, filtered.length), r.pin))
              pinSendTarget(l.setSendMessagePins, r.pin.displayName, r.pin);
            return {
              data: {
                success: !0,
                message: `${filtered.length} ${plural(filtered.length, "file")} \u2192 ${r.label}${r.identityNote ?? ""}${r.contestedNote ?? ""}`,
                msg_id: msgId,
                files: n,
              },
            };
          } catch (error) {
            let D = getErrnoCode(error),
              Y = isInboxGoneError(error);
            if (isExpectedSendError(error)) I();
            let B = Y ? staleSocketHint(LISTAGENTS) : D === "EBUSY" ? PIPE_BUSY_HINT : "",
              _e = TTt(error) || kTt(error) ? `: ${errorMessage(error)}` : B || ".";
            return U(
              r.byName
                ? `Failed to send to ${r.label}${D ? ` (${D})` : ""}${_e}`
                : `Failed to send to ${r.label}: ${errorMessage(error)}${B}`,
              n,
            );
          }
        }
        let pe = r.via ?? "unknown";
        function W() {
          if (!isPolicyAllowed("allow_send_file")) return ae;
          let n = getRemoteSendBlock(pe);
          if (n === null) return;
          return n.cause === "residency"
            ? ae
            : `Cross-machine file transfer is unavailable: ${n.reason} Same-machine (uds:) transfers still work.`;
        }
        let se = W();
        if (se !== void 0) return U(se);
        let F = await isolationDispatchGate({
          tool: SendFileTool,
          input: { to: to, files: y, message: message },
          ask: requireAsk(f),
          permissionPhase: l.permissionPhase,
          alreadyApproved: z,
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
        if (ne !== void 0) return U(ne);
        if (F.input.files !== y || F.input.message !== message)
          ((message = F.input.message),
            (y = F.input.files),
            (mapped = y.map((n) => expandPath(n))),
            (mapped_2 = mapped.map((n) => basename(n))));
        let { uploadBytesToBridgeStore: uploadBytesToBridgeStore } = await import("./chunk-7kpfrhzn.js"),
          L = Array(mapped.length),
          results = await Promise.all(
            mapped.map((n, S) =>
              Ie(async () => {
                if (signal.aborted) {
                  L[S] = { path: n, error: "aborted" };
                  return;
                }
                let _ = await ee(n);
                if (_ !== !0) {
                  L[S] = { path: n, error: _ };
                  return;
                }
                let I = await readPeerFileBounded(n, Lue);
                if (I === null) {
                  L[S] = { path: n, error: PEER_FILE_UNREADABLE_TEXT };
                  return;
                }
                let V = computeContentHash(I),
                  g = await uploadBytesToBridgeStore(
                    I,
                    mapped_2[S],
                    "application/octet-stream",
                    signal,
                    void 0,
                    l.credentials,
                  );
                if (typeof g !== "string") {
                  L[S] = { path: n, size: I.length, error: g.error };
                  return;
                }
                return (
                  (L[S] = { path: n, size: I.length, sha256: V, file_uuid: g }),
                  {
                    file_uuid: g,
                    file_name: mapped_2[S],
                    is_image: FUt.test(n),
                    file_size: I.length,
                    sha256: V,
                    media_type: getAttachmentMimeType(mapped_2[S]),
                  }
                );
              }),
            ),
          );
        if (signal.aborted) throw new AbortError();
        let filtered = results.filter((n) => n !== void 0);
        if (filtered.length === 0) return U(`No files could be uploaded for transfer to ${r.label}.`, L);
        let {
            postInterClaudeMessage: postInterClaudeMessage,
            isLikelyStaleBridgeError: isLikelyStaleBridgeError,
          } = require("./chunk-ypjxapg8.js"),
          te = W();
        if (te !== void 0) return U(te, L);
        let X = await postInterClaudeMessage(
          r.sessionId,
          Z(filtered.map((n) => n.file_name)),
          Q,
          filtered,
          lastPeerHopChain(l.messages()),
          void 0,
          l.credentials,
        );
        if (!X.ok) {
          let S = l.tools.some((tool) => toolMatchesName(tool, LISTAGENTS))
              ? ` Call ${LISTAGENTS} to see who is reachable now.`
              : "",
            _ = isLikelyStaleBridgeError(X.error)
              ? r.byName
                ? ` \u2014 that session may have ended, been archived, or disconnected.${S}`
                : ` \u2014 the peer session may have ended or restarted, so this bridge ID is stale.${S}`
              : "";
          return U(`Failed to send to ${r.label}: ${X.error ?? "unknown"}${_}`, L);
        }
        if ((K(!0, filtered.length), r.pin)) pinSendTarget(l.setSendMessagePins, r.pin.displayName, r.pin);
        return {
          data: {
            success: !0,
            message: `${filtered.length} ${plural(filtered.length, "file")} \u2192 ${r.label}${r.identityNote ?? ""}${r.contestedNote ?? ""}`,
            msg_id: X.msgId,
            files: L,
          },
        };
      },
    };
  },
});
