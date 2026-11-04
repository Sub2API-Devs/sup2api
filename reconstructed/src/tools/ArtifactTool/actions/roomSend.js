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
function roomMessageParts(input) {
  let topic = "topic" in input && typeof input.topic === "string" ? input.topic : undefined;
  let data = "data" in input ? input.data : undefined;
  return {
    topic,
    data,
  };
}
//@ chunk-8wvtd8sr.js:228273-228371 placement
/**
 * 校验房间 topic，非法时返回占位串。
 */
function roomTopicOrInvalid(topic, formatTopic = (value) => value) {
  return topic !== undefined && ARTIFACT_ROOMS_MODULE?.ROOM_TOPIC_RE.test(topic) === true
    ? formatTopic(topic)
    : "(invalid topic)";
}
//@ chunk-8wvtd8sr.js:228371-235149 placement
/**
 * room_send 动作处理器。
 */
var ARTIFACT_ROOM_SEND_ACTION_HANDLER = {
  actions: ["room_send"],
  async checkPermissions(tool, input, context) {
    if (input.action === "room_send") {
      let surfaceRefusal = () => {
        switch (artifactSurfaceRefusal(context)) {
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
      let refusal = surfaceRefusal();
      if (refusal !== null) return refusal;
      let artifactUrl = input.url !== undefined ? parseArtifactUrl(input.url) : null;
      let { topic, data } = roomMessageParts(input);
      let topicPhrase = roomTopicOrInvalid(topic, (topic) => `"${topic}"`);
      let payloadSuffix = data !== undefined ? `: ${approvalPayloadExcerpt(data)}` : "";
      if (artifactUrl !== null) {
        await warmShareEntry(artifactUrl, context, "room_send");
        let otherOrgDeny = denyOtherOrgArtifact(artifactUrl, "Nothing was sent");
        if (otherOrgDeny !== null) return otherOrgDeny;
      }
      let refusalAgain = surfaceRefusal();
      if (refusalAgain !== null) return refusalAgain;
      let shareEntry = artifactUrl !== null ? getShareEntry(artifactUrl.slug) : undefined;
      let audienceNote = shareAudienceParenthetical(shareEntry);
      let ownershipText = ownershipTag(shareEntry);
      return {
        behavior: "ask",
        message: `Claude wants to send a live ${topicPhrase} event to everyone currently viewing ${artifactUrl !== null ? artifactViewerUrlFor(artifactUrl) : "an artifact (unrecognized address)"}${audienceNote}${ownershipText} (not stored)${payloadSuffix}`,
        updatedInput: {
          ...input,
          [ROOM_SEND_TARGET_TAG]: artifactUrl?.slug ?? null,
        },
        suppressAlwaysAllowRule: true,
        decisionReason: {
          type: "safetyCheck",
          reason: isCoworkFramePublishSession()
            ? `Artifact room broadcasts from a Cowork session reach every current viewer${audienceNote}${ownershipText} \u2014 approval must come from the user, not the auto-permission classifier`
            : `Sending a live event to everyone currently viewing the artifact${audienceNote}${ownershipText} can be steered by those viewers' page events \u2014 approval must come from the user, not the auto-permission classifier`,
          classifierApprovable: false,
        },
      };
    }
    return throwUnroutedArtifactAction("roomSend.checkPermissions", input);
  },
  async validateInput(tool, input) {
    let { action, url } = input;
    if (action === "room_send") {
      let allowedFields = ["action", "url", "topic", "data"];
      let filtered = Object.keys(input).filter(
        (key) => !allowedFields.includes(key) && input[key] !== undefined,
      );
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
      let urlError = urlSubPathError(url);
      if (urlError) return urlError;
      let sessionArtifactUrl = parseSessionArtifactUrl(url);
      if (!sessionArtifactUrl.ok)
        return {
          result: false,
          message: sessionArtifactUrl.message,
          errorCode: sessionArtifactUrl.errorCode,
        };
      let { topic, data } = roomMessageParts(input);
      if (topic === undefined)
        return {
          result: false,
          message: 'topic required for action "room_send"',
          errorCode: 7,
        };
      if (data !== undefined && (data === null || typeof data !== "object" || Array.isArray(data)))
        return {
          result: false,
          message: '`data` must be a JSON object \u2014 wrap a bare value, e.g. {"value": \u2026}.',
          errorCode: 8,
        };
      let roomsModule = throwRoomsNotCompiled();
      let roomCap = roomsModule.artifactRoomSendCap(sessionArtifactUrl.parsed.slug);
      let validation = roomsModule.validateRoomSend(topic, data, roomCap);
      if (!validation.ok)
        return {
          result: false,
          message:
            validation.reason === "invalid_topic"
              ? '`topic` must start with a lowercase letter followed by up to 47 lowercase letters, digits, "_", "-" or "."'
              : validation.reason === "too_large"
                ? `\`data\` serializes to more than ${roomCap} bytes (too_large) \u2014 send less, or publish the data instead.`
                : "`data` must be a plain JSON object.",
          errorCode: 8,
        };
      return {
        result: true,
      };
    }
    return throwUnroutedArtifactAction("roomSend.validateInput", input);
  },
  toAutoClassifierInput(input) {
    if (input?.action === "room_send") {
      let target = classifierArtifactTargetFor(input.url, "(no artifact url)");
      let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
      let shareEntry = artifactUrl !== null ? getShareEntry(artifactUrl.slug) : undefined;
      let marks = `${ownershipClassifierMark(shareEntry)}${shareClassifierMarks(shareEntry)}`;
      try {
        let { topic, data } = roomMessageParts(input);
        let topicPhrase = roomTopicOrInvalid(topic, (topic) => `"${topic}"`);
        let payloadText =
          data !== undefined ? ` data: ${foldClassifierCodePhrases(approvalPayloadExcerpt(data))}` : "";
        return `broadcast a live event to everyone currently viewing an artifact (not stored)${marks}: topic ${topicPhrase}${payloadText} \u2192 ${target}`;
      } catch {
        return `broadcast a live event to everyone currently viewing an artifact${marks} \u2192 ${target}`;
      }
    }
    return throwUnroutedArtifactAction("roomSend.toAutoClassifierInput", input);
  },
  async description(tool, input) {
    if (input?.action === "room_send") {
      let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
      let shareEntry = artifactUrl !== null ? getShareEntry(artifactUrl.slug) : undefined;
      let audienceText = shareEntry?.probeFailed
        ? "share status unconfirmed"
        : shareEntry !== undefined && shareEntry.mode !== "owner"
          ? `shared with ${entryAudience(shareEntry)}`
          : "reaches anyone who has the artifact open";
      return `Broadcast a live event to everyone currently viewing a published artifact${ownershipTag(shareEntry)} (${audienceText}) \u2014 not stored, delivered at most once.`;
    }
    return throwUnroutedArtifactAction("roomSend.description", input);
  },
  getToolUseSummary(input) {
    if (input?.action === "room_send") {
      let { topic, data } = roomMessageParts(input);
      let artifactUrl = typeof input.url === "string" ? parseArtifactUrl(input.url) : null;
      let shareEntry = artifactUrl !== null ? getShareEntry(artifactUrl.slug) : undefined;
      let marks = `${shareAudienceMark(shareEntry)}${ownershipTag(shareEntry)}`;
      let payloadSuffix = data !== undefined ? `: ${approvalPayloadExcerpt(data)}` : "";
      return `broadcast a live event ${roomTopicOrInvalid(topic, (tool) => `("${tool}")`)} to an artifact's current viewers${marks}${payloadSuffix}`;
    }
    return throwUnroutedArtifactAction("roomSend.getToolUseSummary", input);
  },
  async call(input, context, surfaceRefusal) {
    if (context.action === "room_send") {
      if (artifactSurfaceRefusal(surfaceRefusal) !== null)
        throw new ArtifactInputError(
          "room_send needs an interactive approval surface and this session no longer has one \u2014 nothing was sent; do not retry the room_send in this session",
          "room_send_consent_gone",
        );
      let artifactUrlOrThrow = parseArtifactUrlOrThrow(context.url);
      if (
        carriesForeignPin(context, ROOM_SEND_TARGET_TAG) ||
        (ROOM_SEND_TARGET_TAG in context && context[ROOM_SEND_TARGET_TAG] !== artifactUrlOrThrow.slug)
      )
        throw new ArtifactInputError(
          "`action` or `url` no longer names the room_send that was approved \u2014 nothing was sent; retry so it is checked again",
          "room_send_target_changed",
        );
      let { topic, data: input } = roomMessageParts(context);
      if (topic === undefined)
        throw new ArtifactInputError('topic is required for action "room_send"', "room_send_missing_field");
      let updatedInput = throwRoomsNotCompiled().sendRoomEvent(artifactUrlOrThrow.slug, topic, input);
      if (
        !updatedInput.ok &&
        (updatedInput.reason === "invalid_topic" || updatedInput.reason === "invalid_data")
      )
        throw new ArtifactInputError(
          `room_send refused after permission or hook rewrites: ${updatedInput.reason}`,
          "room_send_invalid",
        );
      return {
        data: {
          room_send: {
            url: artifactViewerUrlFor(artifactUrlOrThrow),
            topic,
            delivered: updatedInput.ok,
            ...(updatedInput.ok
              ? {
                  peers: updatedInput.peers,
                }
              : {
                  reason: updatedInput.reason,
                }),
          },
        },
      };
    }
    return throwUnroutedArtifactAction("roomSend.call", context);
  },
};
var ARTIFACT_ROOM_SEND_ACTION_HANDLER_2 = {
  room_send(input, toolUseId) {
    if ("room_send" in input) {
      if (!isPlainObject(input.room_send) || typeof input.room_send.delivered !== "boolean")
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content:
            "This record of a room message is unreadable \u2014 whether it was sent is unknown; room messages are at-most-once and not stored, so send it again only if the user still wants it sent.",
        };
      let roomSend = input.room_send;
      let result = roomTopicOrInvalid(typeof roomSend.topic === "string" ? roomSend.topic : undefined);
      let topic =
        typeof roomSend.peers === "number" && Number.isSafeInteger(roomSend.peers) && roomSend.peers >= 0
          ? `${roomSend.peers} ${plural(roomSend.peers, "peer")}`
          : "? peers";
      let sendResult = canonicalTargetOrPlaceholder(roomSend.url);
      let sendToolUseId =
        typeof roomSend.reason === "string"
          ? sanitizeDisplayText(roomSend.reason, {
              max: 32,
            })
          : undefined;
      let content =
        roomSend.delivered === true
          ? `Sent on ${result} to ${topic} (${sendResult}; at-most-once, not stored).`
          : sendToolUseId === undefined
            ? `Not sent, and this record does not say why \u2014 action "status" shows whether this session is in the room of ${sendResult}.`
            : sendToolUseId === "not_connected"
              ? `Not sent (not_connected): this session is not in the room of ${sendResult} \u2014 publish it in this session with capabilities.room to join.`
              : `Not sent (${sendToolUseId}).`;
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content,
      };
    }
    return throwUnroutedArtifactAction("roomSend.room_send", input);
  },
};
export {
  ARTIFACT_ROOM_SEND_ACTION_HANDLER,
  ARTIFACT_ROOM_SEND_ACTION_HANDLER_2,
  isArtifactRoomAvailable,
  roomTopicOrInvalid,
  roomMessageParts,
};
