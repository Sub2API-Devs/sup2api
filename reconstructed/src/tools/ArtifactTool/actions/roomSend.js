/**
 * tools/ArtifactTool/actions/roomSend.ts
 *
 * 2.1.316 新增：房间消息发送
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (6)
 * attribution: placement 6
 */
import {
  artifactSurfaceRefusal,
  denyOtherOrgArtifact,
  parseArtifactUrlOrThrow,
} from "../permissions/artifactPermissionRules.js";
import { parseArtifactUrl, ArtifactInputError } from "../constants.js";
import { approvalPayloadExcerpt } from "../permissions/approvalText.js";
import { warmShareEntry } from "../../../services/artifacts/shareEntryWarm.js";
import {
  getShareEntry,
  shareAudienceParenthetical,
  ownershipTag,
  ownershipClassifierMark,
  shareClassifierMarks,
  entryAudience,
  shareAudienceMark,
} from "../../../services/artifacts/shareEntries.js";
import {
  artifactViewerUrlFor,
  classifierArtifactTargetFor,
  foldClassifierCodePhrases,
} from "../artifactUrls.js";
import { ROOM_SEND_TARGET_TAG, carriesForeignPin } from "../permissions/consentStamps.js";
import { isCoworkFramePublishSession } from "../../../services/artifacts/artifactToolGates.js";
import {
  throwUnroutedArtifactAction,
  canonicalTargetOrPlaceholder,
} from "../../../services/artifacts/artifactPeople.js";
import { urlSubPathError } from "../permissions/dbWriteInputs.js";
import { parseSessionArtifactUrl } from "../../../services/artifacts/orgScope.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { plural } from "../../../utils/stringUtils.js";
import { sanitizeDisplayText } from "../../../services/artifacts/capabilityDeclaration.js";

//@ chunk-8wvtd8sr.js:227997-228058 placement
/**
 * 判断 Artifact 房间是否可用（跳过原因为空）。
 */
function isArtifactRoomAvailable(publishContext) {
  return null?.artifactRoomSkipReason(publishContext) === null;
}
//@ chunk-8wvtd8sr.js:228058-228135 placement
/**
 * 本构建未编译房间功能时抛出错误。
 */
function throwRoomsNotCompiled() {
  throw Error("artifact rooms are not compiled into this build");
}
//@ chunk-8wvtd8sr.js:228135-228147 placement
var ARTIFACT_ROOMS_MODULE = null;
//@ chunk-8wvtd8sr.js:228147-228273 placement
/**
 * 从 room_send 输入中取出 topic（字符串）与 data。
 */
function roomMessageParts(e) {
  let topic = "topic" in e && typeof e.topic === "string" ? e.topic : undefined;
  let data = "data" in e ? e.data : undefined;
  return {
    topic,
    data,
  };
}
//@ chunk-8wvtd8sr.js:228273-228371 placement
/**
 * 校验房间 topic，非法时返回占位串。
 */
function roomTopicOrInvalid(topic, n = (s) => s) {
  return topic !== undefined && ARTIFACT_ROOMS_MODULE?.ROOM_TOPIC_RE.test(topic) === true
    ? n(topic)
    : "(invalid topic)";
}
//@ chunk-8wvtd8sr.js:228371-235149 placement
/**
 * room_send 动作处理器。
 */
var ARTIFACT_ROOM_SEND_ACTION_HANDLER = {
  actions: ["room_send"],
  async checkPermissions(e, n, s) {
    if (n.action === "room_send") {
      let r = () => {
        switch (artifactSurfaceRefusal(s)) {
          case "plan":
            return {
              behavior: "deny",
              message:
                "Live room events cannot be sent from plan mode. Finish planning first; do not retry this room_send while in plan mode.",
              decisionReason: {
                type: "safetyCheck",
                reason: "Plan mode does not broadcast live events to artifact viewers",
                classifierApprovable: false,
              },
            };
          case "cowork_no_surface":
            return {
              behavior: "deny",
              message:
                "Live room events from this Cowork session need the approval card, and no one can answer it in this session. Do not retry the room_send in this session.",
              decisionReason: {
                type: "safetyCheck",
                reason: "Cowork-frame artifact room broadcasts require a live human consent surface",
                classifierApprovable: false,
              },
            };
          case "no_surface":
            return {
              behavior: "deny",
              message:
                "room_send needs an interactive approval surface; this session has none. Do not retry the room_send in this session.",
              decisionReason: {
                type: "safetyCheck",
                reason: "Artifact room broadcasts require a live human consent surface",
                classifierApprovable: false,
              },
            };
          case null:
            return null;
        }
      };
      let h = r();
      if (h !== null) return h;
      let y = n.url !== undefined ? parseArtifactUrl(n.url) : null;
      let { topic, data: w } = roomMessageParts(n);
      let A = roomTopicOrInvalid(topic, (V) => `"${V}"`);
      let S = w !== undefined ? `: ${approvalPayloadExcerpt(w)}` : "";
      if (y !== null) {
        await warmShareEntry(y, s, "room_send");
        let V = denyOtherOrgArtifact(y, "Nothing was sent");
        if (V !== null) return V;
      }
      let R = r();
      if (R !== null) return R;
      let T = y !== null ? getShareEntry(y.slug) : undefined;
      let P = shareAudienceParenthetical(T);
      let L = ownershipTag(T);
      return {
        behavior: "ask",
        message: `Claude wants to send a live ${A} event to everyone currently viewing ${y !== null ? artifactViewerUrlFor(y) : "an artifact (unrecognized address)"}${P}${L} (not stored)${S}`,
        updatedInput: {
          ...n,
          [ROOM_SEND_TARGET_TAG]: y?.slug ?? null,
        },
        suppressAlwaysAllowRule: true,
        decisionReason: {
          type: "safetyCheck",
          reason: isCoworkFramePublishSession()
            ? `Artifact room broadcasts from a Cowork session reach every current viewer${P}${L} \u2014 approval must come from the user, not the auto-permission classifier`
            : `Sending a live event to everyone currently viewing the artifact${P}${L} can be steered by those viewers' page events \u2014 approval must come from the user, not the auto-permission classifier`,
          classifierApprovable: false,
        },
      };
    }
    return throwUnroutedArtifactAction("roomSend.checkPermissions", n);
  },
  async validateInput(e, n) {
    let { action, url } = n;
    if (action === "room_send") {
      let h = ["action", "url", "topic", "data"];
      let filtered = Object.keys(n).filter((key) => !h.includes(key) && n[key] !== undefined);
      if (filtered.length > 0)
        return {
          result: false,
          message: `action "room_send" takes only \`url\`, \`topic\` and \`data\` \u2014 remove ${filtered.join(", ")}.`,
          errorCode: 8,
        };
      if (url === undefined)
        return {
          result: false,
          message:
            "action \"room_send\" requires `url` \u2014 the artifact's claude.ai URL from this session's publish result.",
          errorCode: 7,
        };
      let p = urlSubPathError(url);
      if (p) return p;
      let sessionArtifactUrl = parseSessionArtifactUrl(url);
      if (!sessionArtifactUrl.ok)
        return {
          result: false,
          message: sessionArtifactUrl.message,
          errorCode: sessionArtifactUrl.errorCode,
        };
      let { topic, data: S } = roomMessageParts(n);
      if (topic === undefined)
        return {
          result: false,
          message: 'topic required for action "room_send"',
          errorCode: 7,
        };
      if (S !== undefined && (S === null || typeof S !== "object" || Array.isArray(S)))
        return {
          result: false,
          message: '`data` must be a JSON object \u2014 wrap a bare value, e.g. {"value": \u2026}.',
          errorCode: 8,
        };
      let R = throwRoomsNotCompiled();
      let T = R.artifactRoomSendCap(sessionArtifactUrl.parsed.slug);
      let P = R.validateRoomSend(topic, S, T);
      if (!P.ok)
        return {
          result: false,
          message:
            P.reason === "invalid_topic"
              ? '`topic` must start with a lowercase letter followed by up to 47 lowercase letters, digits, "_", "-" or "."'
              : P.reason === "too_large"
                ? `\`data\` serializes to more than ${T} bytes (too_large) \u2014 send less, or publish the data instead.`
                : "`data` must be a plain JSON object.",
          errorCode: 8,
        };
      return {
        result: true,
      };
    }
    return throwUnroutedArtifactAction("roomSend.validateInput", n);
  },
  toAutoClassifierInput(e) {
    if (e?.action === "room_send") {
      let n = classifierArtifactTargetFor(e.url, "(no artifact url)");
      let s = typeof e.url === "string" ? parseArtifactUrl(e.url) : null;
      let r = s !== null ? getShareEntry(s.slug) : undefined;
      let h = `${ownershipClassifierMark(r)}${shareClassifierMarks(r)}`;
      try {
        let { topic, data: p } = roomMessageParts(e);
        let w = roomTopicOrInvalid(topic, (S) => `"${S}"`);
        let A = p !== undefined ? ` data: ${foldClassifierCodePhrases(approvalPayloadExcerpt(p))}` : "";
        return `broadcast a live event to everyone currently viewing an artifact (not stored)${h}: topic ${w}${A} \u2192 ${n}`;
      } catch {
        return `broadcast a live event to everyone currently viewing an artifact${h} \u2192 ${n}`;
      }
    }
    return throwUnroutedArtifactAction("roomSend.toAutoClassifierInput", e);
  },
  async description(e, n) {
    if (n?.action === "room_send") {
      let s = typeof n.url === "string" ? parseArtifactUrl(n.url) : null;
      let r = s !== null ? getShareEntry(s.slug) : undefined;
      let h = r?.probeFailed
        ? "share status unconfirmed"
        : r !== undefined && r.mode !== "owner"
          ? `shared with ${entryAudience(r)}`
          : "reaches anyone who has the artifact open";
      return `Broadcast a live event to everyone currently viewing a published artifact${ownershipTag(r)} (${h}) \u2014 not stored, delivered at most once.`;
    }
    return throwUnroutedArtifactAction("roomSend.description", n);
  },
  getToolUseSummary(e) {
    if (e?.action === "room_send") {
      let { topic, data: s } = roomMessageParts(e);
      let r = typeof e.url === "string" ? parseArtifactUrl(e.url) : null;
      let h = r !== null ? getShareEntry(r.slug) : undefined;
      let y = `${shareAudienceMark(h)}${ownershipTag(h)}`;
      let p = s !== undefined ? `: ${approvalPayloadExcerpt(s)}` : "";
      return `broadcast a live event ${roomTopicOrInvalid(topic, (w) => `("${w}")`)} to an artifact's current viewers${y}${p}`;
    }
    return throwUnroutedArtifactAction("roomSend.getToolUseSummary", e);
  },
  async call(e, n, s) {
    if (n.action === "room_send") {
      if (artifactSurfaceRefusal(s) !== null)
        throw new ArtifactInputError(
          "room_send needs an interactive approval surface and this session no longer has one \u2014 nothing was sent; do not retry the room_send in this session",
          "room_send_consent_gone",
        );
      let artifactUrlOrThrow = parseArtifactUrlOrThrow(n.url);
      if (
        carriesForeignPin(n, ROOM_SEND_TARGET_TAG) ||
        (ROOM_SEND_TARGET_TAG in n && n[ROOM_SEND_TARGET_TAG] !== artifactUrlOrThrow.slug)
      )
        throw new ArtifactInputError(
          "`action` or `url` no longer names the room_send that was approved \u2014 nothing was sent; retry so it is checked again",
          "room_send_target_changed",
        );
      let { topic, data: y } = roomMessageParts(n);
      if (topic === undefined)
        throw new ArtifactInputError('topic is required for action "room_send"', "room_send_missing_field");
      let p = throwRoomsNotCompiled().sendRoomEvent(artifactUrlOrThrow.slug, topic, y);
      if (!p.ok && (p.reason === "invalid_topic" || p.reason === "invalid_data"))
        throw new ArtifactInputError(
          `room_send refused after permission or hook rewrites: ${p.reason}`,
          "room_send_invalid",
        );
      return {
        data: {
          room_send: {
            url: artifactViewerUrlFor(artifactUrlOrThrow),
            topic,
            delivered: p.ok,
            ...(p.ok
              ? {
                  peers: p.peers,
                }
              : {
                  reason: p.reason,
                }),
          },
        },
      };
    }
    return throwUnroutedArtifactAction("roomSend.call", n);
  },
};
var ARTIFACT_ROOM_SEND_ACTION_HANDLER_2 = {
  room_send(e, toolUseId) {
    if ("room_send" in e) {
      if (!isPlainObject(e.room_send) || typeof e.room_send.delivered !== "boolean")
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content:
            "This record of a room message is unreadable \u2014 whether it was sent is unknown; room messages are at-most-once and not stored, so send it again only if the user still wants it sent.",
        };
      let roomSend = e.room_send;
      let r = roomTopicOrInvalid(typeof roomSend.topic === "string" ? roomSend.topic : undefined);
      let h =
        typeof roomSend.peers === "number" && Number.isSafeInteger(roomSend.peers) && roomSend.peers >= 0
          ? `${roomSend.peers} ${plural(roomSend.peers, "peer")}`
          : "? peers";
      let y = canonicalTargetOrPlaceholder(roomSend.url);
      let p =
        typeof roomSend.reason === "string"
          ? sanitizeDisplayText(roomSend.reason, {
              max: 32,
            })
          : undefined;
      let content =
        roomSend.delivered === true
          ? `Sent on ${r} to ${h} (${y}; at-most-once, not stored).`
          : p === undefined
            ? `Not sent, and this record does not say why \u2014 action "status" shows whether this session is in the room of ${y}.`
            : p === "not_connected"
              ? `Not sent (not_connected): this session is not in the room of ${y} \u2014 publish it in this session with capabilities.room to join.`
              : `Not sent (${p}).`;
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content,
      };
    }
    return throwUnroutedArtifactAction("roomSend.room_send", e);
  },
};
export {
  ARTIFACT_ROOM_SEND_ACTION_HANDLER,
  ARTIFACT_ROOM_SEND_ACTION_HANDLER_2,
  isArtifactRoomAvailable,
  roomTopicOrInvalid,
  roomMessageParts,
};
