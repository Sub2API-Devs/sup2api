/**
 * bridge/inboundMessageOrigin.ts
 *
 * 2.1.316 新增：入站消息（Remote Control/桥）的来源与内联粘贴解析：client_platform、inbound_origin、触发器类型、唤醒信封
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-aexe35rn.js (57)
 * attribution: placement 57
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { array, union, stringSchema, objectSchema, literal } from "../../vendor/zod/v4/classic/schemas.js";
import {
  SLACK_BOT,
  HEARTH_HUMAN,
  HEARTH_AGENT,
  SLACK_HUMAN,
  TEAMS_HUMAN,
  OWNER_RELAY,
  AMB_HUMAN,
  DISCORD_HUMAN,
  SLACK_OWNER_PING,
  WEB_HUMAN,
  RELAY_SOURCE_KINDS_2,
} from "../services/projectsRelay/relayConfig.js";
import { isChatHostEntrypoint, isClaudeInTeams } from "../utils/entrypointKinds.js";
import { EFFORT_LEVELS } from "../utils/effort.js";
import { logForDebugging } from "../utils/debug.js";
import { peerMessageInfo, regExp_2 } from "../utils/peerMessageHeaders.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { stripSystemReminders } from "../components/messageActions.js";
import { extractInboundAttachments } from "./inboundAttachments.js";
import { sanitizeAddressPart } from "../utils/swarm/teammateIds.js";
import { normalizeImageBlocks } from "./inboundMessages.js";
import { isAbnormalTerminalReason } from "../entrypoints/sdk/coreSchemas.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-aexe35rn.js:720-805 placement
var inlinePasteContentSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_INLINE_PASTE_TOTAL_CHARS;
deferInit("chunk-aexe35rn.js:720", () => {
  inlinePasteContentSchema = DoctorLazy(() =>
    array(
      union([
        stringSchema(),
        array(
          union([
            objectSchema({
              type: literal("text"),
              text: stringSchema(),
            }),
            objectSchema({
              type: stringSchema(),
            }),
          ]),
        ),
      ]),
    ),
  );
  MAX_INLINE_PASTE_TOTAL_CHARS = 1000;
});
//@ chunk-aexe35rn.js:805-1355 placement
function parseInboundContent(content) {
  if (content == null)
    return {
      texts: [],
    };
  if (Array.isArray(content)) {
    let itemCount = content.length;
    for (let idx = 0; idx < content.length && itemCount <= MAX_INLINE_PASTE_TOTAL_CHARS; idx++) {
      let item = content[idx];
      if (Array.isArray(item)) itemCount += item.length;
    }
    if (itemCount > MAX_INLINE_PASTE_TOTAL_CHARS)
      return {
        texts: [],
        problem: "too_many_items",
      };
  }
  let parsed = inlinePasteContentSchema().safeParse(content);
  if (!parsed.success)
    return {
      texts: [],
      problem: "malformed",
    };
  let sawNonText = false;
  let texts = parsed.data
    .map((entry) => {
      if (typeof entry === "string") return entry;
      let texts = [];
      for (let block of entry)
        if (block.type === "text" && "text" in block && typeof block.text === "string")
          texts.push(block.text);
        else sawNonText = true;
      return texts.join(`
`);
    })
    .filter((text) => text.trim() !== "");
  return sawNonText
    ? {
        texts,
        problem: "non_text_ignored",
      }
    : {
        texts,
      };
}
//@ chunk-aexe35rn.js:1355-1365 placement
var MAX_INLINE_PASTES = 100;
//@ chunk-aexe35rn.js:1365-1715 placement
function parseInlinePastes(inlinePastes) {
  if (inlinePastes == null)
    return {
      texts: [],
    };
  if (!Array.isArray(inlinePastes))
    return {
      texts: [],
      problem: "malformed_inline_pastes",
    };
  let texts = [];
  for (let idx = 0; idx < inlinePastes.length; idx++) {
    let entry = inlinePastes[idx];
    if (typeof entry !== "string")
      return {
        texts: [],
        problem: "malformed_inline_pastes",
      };
    if (entry.trim() === "") continue;
    if (texts.length === MAX_INLINE_PASTES)
      return {
        texts,
        problem: "inline_pastes_cut",
      };
    texts.push(entry);
  }
  return {
    texts,
  };
}
//@ chunk-aexe35rn.js:1715-1778 placement
var HUMAN_CLIENT_PLATFORMS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aexe35rn.js:1715", () => {
  HUMAN_CLIENT_PLATFORMS = new Set(["ios", "android", "web_claude_ai", "desktop_app"]);
});
//@ chunk-aexe35rn.js:1778-1812 placement
function isHumanClientPlatform(platform) {
  return HUMAN_CLIENT_PLATFORMS.has(platform) || false;
}
//@ chunk-aexe35rn.js:1812-1855 placement
/**
 * 判断 client_platform 是否为已知的人类客户端平台（ios/android/web_claude_ai/desktop_app）。
 */
function isDefinedHumanClientPlatform(platform) {
  return platform !== undefined && HUMAN_CLIENT_PLATFORMS.has(platform);
}
//@ chunk-aexe35rn.js:1855-1926 placement
/**
 * 判断 client_platform 是否为 Claude Code CLI 或 VS Code 扩展。
 */
function isClaudeCodeCliPlatform(platformName) {
  return platformName === "claude_code_cli" || platformName === "claude_code_vscode";
}
//@ chunk-aexe35rn.js:1926-1992 placement
/**
 * 非合成消息且平台属于 Claude Code CLI/VS Code 时视为人类来源，否则 undefined。
 */
function humanOriginWhenNotSynthetic(platform, synthetic) {
  if (synthetic) return;
  return isClaudeCodeCliPlatform(platform)
    ? {
        kind: "human",
      }
    : undefined;
}
//@ chunk-aexe35rn.js:1992-2130 placement
/**
 * 定时/强制运行/GitHub webhook/例程/PR steward 等触发器来源。
 */
var SCHEDULED_TRIGGER_ORIGINS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TRIGGER_FIRE_ORIGINS;
deferInit("chunk-aexe35rn.js:1992", () => {
  SCHEDULED_TRIGGER_ORIGINS = new Set([
    "scheduled_trigger",
    "force_run_trigger",
    "github_webhook_trigger",
    "fire_routine",
    "pr_steward",
  ]);
  TRIGGER_FIRE_ORIGINS = new Set(["trigger_fire"]);
});
//@ chunk-aexe35rn.js:2130-2174 placement
/**
 * 判断 inbound_origin 是否为触发器来源（scheduled/force_run/fire_routine 等）。
 */
function isTriggerFireOrigin(origin) {
  return origin !== undefined && TRIGGER_FIRE_ORIGINS.has(origin);
}
//@ chunk-aexe35rn.js:2174-2263 placement
var SESSION_INBOX; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NOTIFICATION_ORIGINS;
deferInit("chunk-aexe35rn.js:2174", () => {
  SESSION_INBOX = "session_inbox";
  NOTIFICATION_ORIGINS = new Set(["github_webhook", "pr_steward", "signal_subscription"]);
});
//@ chunk-aexe35rn.js:2263-2318 placement
/**
 * 判断 inbound_origin 是否为通知类来源：github_webhook / pr_steward / signal_subscription / session_inbox。
 */
function isNotificationOrigin(origin) {
  return origin !== undefined && (NOTIFICATION_ORIGINS.has(origin) || origin === SESSION_INBOX);
}
//@ chunk-aexe35rn.js:2318-2341 placement
var PROJECTS_RELAY = "projects-relay";
//@ chunk-aexe35rn.js:2341-2436 placement
/**
 * 判断入站消息是否不是人类发起：有 relayMessageIds、不是合成消息，或带协调者提示。
 */
function isNonHumanRelayMessage({ relayMessageIds, isSynthetic, coordinatorNote }) {
  return relayMessageIds !== undefined || isSynthetic !== true || coordinatorNote;
}
//@ chunk-aexe35rn.js:2436-2462 placement
var TRIGGERFIREREASON = "triggerFireReason";
//@ chunk-aexe35rn.js:2462-2608 placement
/**
 * 定时触发的 task-notification 来源补上 fireReason。
 */
function withScheduledTriggerFireReason(origin, message) {
  if (origin?.kind !== "task-notification" || origin.subkind !== "scheduled-trigger") return origin;
  let fireReason = triggerFireReasonOf(message);
  return fireReason === undefined
    ? origin
    : {
        ...origin,
        fireReason,
      };
}
//@ chunk-aexe35rn.js:2608-2794 placement
/**
 * 按触发器类型生成 task-notification 来源（scheduled-trigger / session-inbox / 普通）。
 */
function taskNotificationOrigin(origin) {
  if (isTriggerFireOrigin(origin))
    return {
      kind: "task-notification",
      subkind: "scheduled-trigger",
    };
  if (origin === SESSION_INBOX)
    return {
      kind: "task-notification",
      subkind: "session-inbox",
    };
  return {
    kind: "task-notification",
  };
}
//@ chunk-aexe35rn.js:2794-2866 placement
var TRIGGER_PRIORITY_DOWNGRADE_ORIGINS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aexe35rn.js:2794", () => {
  TRIGGER_PRIORITY_DOWNGRADE_ORIGINS = new Set(["scheduled_trigger", "force_run_trigger", "fire_routine"]);
});
//@ chunk-aexe35rn.js:2866-2896 placement
/**
 * 读取入站帧里的 trigger_fire_reason 字符串。
 */
function triggerFireReasonOf(message) {
  return stringMetaField(message, TRIGGERFIREREASON);
}
//@ chunk-aexe35rn.js:2896-3033 placement
/**
 * 入站消息优先级：不是 now 时，来自触发器或特定平台的消息降为 later。
 */
function adjustInboundPriority(priority, clientPlatform, inboundOrigin, receiverGroupingId) {
  if (priority === "now") return priority;
  let groupedOrigin =
    inboundOrigin !== undefined &&
    GROUPING_ID_ORIGINS.has(inboundOrigin) &&
    (inboundOrigin !== "trigger_fire" || receiverGroupingId !== undefined);
  return (clientPlatform && TRIGGER_PRIORITY_DOWNGRADE_ORIGINS.has(clientPlatform)) || groupedOrigin
    ? "later"
    : priority;
}
//@ chunk-aexe35rn.js:3033-3194 placement
/**
 * Slack 相关 client_platform 常量组（含 Teams、邮件）。
 */
var SLACK_PLATFORMS; // deferred: uses RELAY_SOURCE_KINDS_2 (../services/projectsRelay/relayConfig.js) of its import cycle while loading; runs once the cycle is complete
var SLACK_BOT_PLATFORMS;
var CLAUDE_IN_TEAMS;
var EMAIL_HUMAN;
var EMAIL_TURN_TEXT;
var EMAIL_SENDER_MODES;
deferInit("chunk-aexe35rn.js:3033", () => {
  SLACK_PLATFORMS = new Set(["claude-in-slack", "claude_in_slack"]);
  SLACK_BOT_PLATFORMS = new Set([SLACK_BOT]);
  CLAUDE_IN_TEAMS = "claude-in-teams";
  EMAIL_HUMAN = "email_human";
  EMAIL_TURN_TEXT = "email_turn_text";
  EMAIL_SENDER_MODES = ["sender_only", "sender_reply"];
});
//@ chunk-aexe35rn.js:3194-3282 placement
/**
 * 邮件来源消息的发送者模式：取 EMAIL_TURN_TEXT 并限定在已知模式集合内。
 */
function emailSenderModeOf(message) {
  if (message.inbound_origin !== EMAIL_HUMAN) return;
  let mode = stringMetaField(message, EMAIL_TURN_TEXT);
  return EMAIL_SENDER_MODES.find((candidate) => candidate === mode);
}
//@ chunk-aexe35rn.js:3282-3313 placement
/**
 * 判断 inbound_origin 是否为 hearth 的人类来源。
 */
function isHearthHuman(inboundOrigin) {
  return inboundOrigin === HEARTH_HUMAN;
}
//@ chunk-aexe35rn.js:3313-3353 placement
/**
 * 判断 inbound_origin 是否为 hearth 的人类或代理来源。
 */
function isHearthOrigin(inboundOrigin) {
  return inboundOrigin === HEARTH_HUMAN || inboundOrigin === HEARTH_AGENT;
}
//@ chunk-aexe35rn.js:3353-3438 placement
function isHearthOriginPrefix(origin) {
  if (origin === HEARTH_HUMAN || origin === HEARTH_AGENT) return true;
  return origin !== undefined && origin.startsWith("hearth");
}
//@ chunk-aexe35rn.js:3438-3509 placement
var GROUPING_ID_ORIGINS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var RECEIVER_GROUPING_ID;
deferInit("chunk-aexe35rn.js:3438", () => {
  GROUPING_ID_ORIGINS = new Set(["trigger_fire", "plugin_fire"]);
  RECEIVER_GROUPING_ID = "receiver_grouping_id";
});
//@ chunk-aexe35rn.js:3509-3539 placement
/**
 * 读取入站帧里的 receiver_grouping_id 字符串。
 */
function receiverGroupingIdOf(message) {
  return stringMetaField(message, RECEIVER_GROUPING_ID);
}
//@ chunk-aexe35rn.js:3539-3602 placement
function stringMetaField(message, field) {
  let value = message[field];
  return typeof value === "string" ? value : undefined;
}
//@ chunk-aexe35rn.js:3602-3631 placement
var ACTIVITY_OBSERVATION = "activity_observation";
//@ chunk-aexe35rn.js:3631-3661 placement
/**
 * 读取入站帧里的活动观测字段（activity_observation）。
 */
function activityObservationOf(message) {
  return stringMetaField(message, ACTIVITY_OBSERVATION);
}
//@ chunk-aexe35rn.js:3661-3686 placement
function isChatHostEntrypoint_2() {
  return isChatHostEntrypoint();
}
//@ chunk-aexe35rn.js:3686-3712 placement
function isClaudeInTeams_2() {
  return isClaudeInTeams();
}
//@ chunk-aexe35rn.js:3712-3770 placement
function isSlackHumanFromChatHost(platform, origin) {
  return (
    platform !== undefined &&
    SLACK_PLATFORMS.has(platform) &&
    origin === SLACK_HUMAN &&
    isChatHostEntrypoint_2()
  );
}
//@ chunk-aexe35rn.js:3770-3814 placement
function isTeamsHumanFromTeamsHost(platform, origin) {
  return platform === CLAUDE_IN_TEAMS && origin === TEAMS_HUMAN && isClaudeInTeams_2();
}
//@ chunk-aexe35rn.js:3814-3855 placement
/**
 * 聊天平台 + 对应人类来源（Slack 需 chat 宿主入口、Teams 需 Teams 宿主）即为人类消息。
 */
function isChatPlatformHuman(platform, origin) {
  return isSlackHumanFromChatHost(platform, origin) || isTeamsHumanFromTeamsHost(platform, origin);
}
//@ chunk-aexe35rn.js:3855-3917 placement
function isHumanByPlatformOrOrigin(platform, origin) {
  return (
    (origin === undefined && platform !== undefined && isHumanClientPlatform(platform)) ||
    isChatPlatformHuman(platform, origin)
  );
}
//@ chunk-aexe35rn.js:3917-3970 placement
/**
 * 已有来源判定时直接用其 kind；否则按平台/inbound_origin 再判一次。
 */
function humanHintOrPlatform(hint, platform, origin) {
  return hint ? hint.kind === "human" : isHumanByPlatformOrOrigin(platform, origin);
}
//@ chunk-aexe35rn.js:3970-4069 placement
/**
 * 判断入站消息应否当作人类消息：已有来源看 kind，无平台视为是，再按平台或来源判定。
 */
function shouldTreatInboundAsHuman(ingressOrigin, isRemoteIO, platform, inboundOrigin) {
  if (ingressOrigin) return ingressOrigin.kind === "human";
  if (!isRemoteIO) return true;
  return (
    isHumanByPlatformOrOrigin(platform, inboundOrigin) ||
    humanOriginWhenNotSynthetic(platform, inboundOrigin) !== undefined
  );
}
//@ chunk-aexe35rn.js:4069-4297 placement
/**
 * 判断入站消息是否来自人类客户端：解析入站元数据，排除队友消息，再按 inbound_origin 或 client_platform 判定。
 */
function isHumanInboundMessage(message, surface, hearthHuman = false) {
  let metadata;
  try {
    metadata = extractInboundMetadata(message);
  } catch {
    return false;
  }
  if (!metadata || getTeammateMessageSender(metadata.content)) return false;
  let { clientPlatform, inboundOrigin } = metadata;
  if (inboundOrigin !== undefined)
    return surface === "bridge"
      ? isChatPlatformHuman(clientPlatform, inboundOrigin)
      : isKnownHumanOrigin(inboundOrigin, hearthHuman);
  return (
    isHumanByPlatformOrOrigin(clientPlatform, undefined) ||
    (surface === "remote-worker" && isClaudeCodeCliPlatform(clientPlatform))
  );
}
//@ chunk-aexe35rn.js:4297-4380 placement
/**
 * 判断 inbound_origin 是否属于已知人类来源（Slack/Teams/OWNER_RELAY，按需含 hearth 与邮件）。
 */
function isKnownHumanOrigin(inboundOrigin, acceptHearth = false, acceptEmail = false) {
  return (
    inboundOrigin === SLACK_HUMAN ||
    inboundOrigin === TEAMS_HUMAN ||
    inboundOrigin === OWNER_RELAY ||
    (acceptHearth && inboundOrigin === HEARTH_HUMAN) ||
    (acceptEmail && inboundOrigin === EMAIL_HUMAN)
  );
}
//@ chunk-aexe35rn.js:4380-4414 placement
var EXTRA_HUMAN_ORIGINS; // deferred: uses RELAY_SOURCE_KINDS_2 (../services/projectsRelay/relayConfig.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aexe35rn.js:4380", () => {
  EXTRA_HUMAN_ORIGINS = new Set([AMB_HUMAN, DISCORD_HUMAN, SLACK_OWNER_PING, WEB_HUMAN]);
});
//@ chunk-aexe35rn.js:4414-4461 placement
/**
 * 宽松人类来源判断：ost 全开或额外人类来源集合命中。
 */
function isHumanOriginLoosely(origin) {
  return isKnownHumanOrigin(origin, true, true) || EXTRA_HUMAN_ORIGINS.has(origin);
}
//@ chunk-aexe35rn.js:4461-4886 placement
function isPeerOrigin({
  isRelayHuman,
  isSynthetic,
  ccrTurnId,
  isProjectsUser = false,
  emailSenderTurn,
  turnEffortCap,
}) {
  if (!isRelayHuman) return {};
  let found = EFFORT_LEVELS.find((effort) => effort === turnEffortCap);
  if (turnEffortCap !== undefined && found === undefined)
    logForDebugging("[relay] turn_effort_cap is not an effort level, so it was ignored");
  return {
    ...(!isSynthetic && {
      verifiedSlackHumanTurn: true,
    }),
    ...(!isSynthetic &&
      isProjectsUser && {
        projectsUserTurn: true,
      }),
    ...(!isSynthetic &&
      emailSenderTurn !== undefined && {
        emailSenderTurn,
      }),
    ...(ccrTurnId !== undefined && {
      ccrTurnId,
    }),
    ...(found !== undefined && {
      turnEffortCap: found,
    }),
  };
}
//@ chunk-aexe35rn.js:4886-5705 placement
/**
 * 判断入站消息来源（人、对等会话、任务通知、触发器）。
 */
function classifyInboundOrigin(
  content,
  platform,
  origin,
  receiverGroupingId,
  slackOrigin,
  activityObservation,
  fromPlugin,
) {
  let teammateMessageSender = getTeammateMessageSender(content);
  if (teammateMessageSender)
    return {
      kind: "peer",
      from: teammateMessageSender,
      inbound_origin: origin,
      ...(fromPlugin !== undefined && {
        plugin: fromPlugin,
      }),
      ...peerMessageInfo(content),
    };
  if (origin === SESSION_INBOX) return taskNotificationOrigin(origin);
  if (origin && NOTIFICATION_ORIGINS.has(origin)) return taskNotificationOrigin(origin);
  let isHearth = isHearthOriginPrefix(origin);
  if (!isHearth && origin === undefined && platform && isHumanClientPlatform(platform))
    return {
      kind: "human",
    };
  if (!isHearth && isChatPlatformHuman(platform, origin))
    return {
      kind: "human",
    };
  if (!isHearth && platform && SCHEDULED_TRIGGER_ORIGINS.has(platform)) return taskNotificationOrigin(origin);
  if (origin === RELAY_SOURCE_KINDS_2 && receiverGroupingId)
    return {
      kind: "task-notification",
      subkind: "peer-send-message",
    };
  logForDebugging(
    `[bridge] demoting unwrapped inbound message to peer origin: client_platform=${platform || "(absent)"}`,
    {
      level: "warn",
    },
  );
  let platformClass = !platform
    ? "absent"
    : platform.startsWith("claude_code")
      ? "claude_code"
      : SLACK_PLATFORMS.has(platform)
        ? origin === SLACK_BOT && isChatHostEntrypoint_2()
          ? "slack_bot_observation"
          : "slack_relay"
        : platform === CLAUDE_IN_TEAMS
          ? "teams_relay"
          : "other";
  logEvent("tengu_bridge_ingress_demoted", {
    platform_class: fromEnum(platformClass),
  });
  return {
    kind: "peer",
    from: "unknown",
    inbound_origin: origin,
    ...peerMessageInfo(content),
    ...(activityObservation !== undefined &&
      origin !== undefined &&
      SLACK_BOT_PLATFORMS.has(origin) && {
        activityObservation,
      }),
  };
}
//@ chunk-aexe35rn.js:5705-5845 placement
/**
 * 补全/改写入站来源：peer 和 slack-ping 之外的保持；触发器转 task-notification，人类平台转 human。
 */
function refineInboundOrigin(origin, clientPlatform, inboundOrigin) {
  if (origin && origin.kind !== "peer" && origin.kind !== "slack-ping") return origin;
  if (clientPlatform && SCHEDULED_TRIGGER_ORIGINS.has(clientPlatform))
    return taskNotificationOrigin(inboundOrigin);
  if (clientPlatform && isHumanClientPlatform(clientPlatform))
    return {
      kind: "human",
    };
  return;
}
//@ chunk-aexe35rn.js:5845-6389 placement
function describeProjectsHumanOrigin(
  content,
  clientPlatform,
  inboundOrigin,
  receiverGroupingId,
  activityObservation,
  hearthEnabled = false,
  projectsRelayEnabled = false,
  fromPlugin,
  acceptEmail = false,
) {
  let teammateMessageSender = getTeammateMessageSender(content);
  if (teammateMessageSender)
    return {
      kind: "peer",
      from: teammateMessageSender,
      inbound_origin: inboundOrigin,
      ...peerMessageInfo(content),
      ...(fromPlugin !== undefined && {
        plugin: fromPlugin,
      }),
    };
  if (inboundOrigin && !SLACK_BOT_PLATFORMS.has(inboundOrigin)) {
    if (inboundOrigin === HEARTH_HUMAN)
      if (hearthEnabled) logFeatureOk("bridge_projects_human_origin");
      else logFeatureSad("bridge_projects_human_origin", "disabled_by_flag");
    if (isKnownHumanOrigin(inboundOrigin, hearthEnabled, acceptEmail))
      return {
        kind: "human",
      };
    if (inboundOrigin === HEARTH_AGENT && projectsRelayEnabled)
      return {
        kind: "task-notification",
        subkind: PROJECTS_RELAY,
      };
    if (inboundOrigin === RELAY_SOURCE_KINDS_2 && receiverGroupingId)
      return {
        kind: "task-notification",
        subkind: "peer-send-message",
      };
    return taskNotificationOrigin(inboundOrigin);
  }
  if (isClaudeCodeCliPlatform(clientPlatform))
    return {
      kind: "human",
    };
  if (clientPlatform?.startsWith("claude_code")) return;
  return classifyInboundOrigin(
    content,
    clientPlatform,
    inboundOrigin,
    receiverGroupingId,
    undefined,
    activityObservation,
    fromPlugin,
  );
}
//@ chunk-aexe35rn.js:6389-6462 placement
/**
 * 判断是否为已核验的 Slack 人类回合且优先级不是 now。
 */
function isVerifiedSlackHumanTurn(message) {
  return message.verifiedSlackHumanTurn === true && message.priority !== "now";
}
//@ chunk-aexe35rn.js:6462-6521 placement
/**
 * 优先级下调：不是 now 时，忙碌场景降为 later。
 */
function downgradePriorityIfBusy(priority, busy) {
  if (priority === "now") return priority;
  return busy ? "later" : priority;
}
//@ chunk-aexe35rn.js:6911-7083 placement
/**
 * 对 text 块逐个清洗，只有变化时才复制数组
 */
function sanitizeTextBlocks(blocks) {
  let copy;
  for (let idx = 0; idx < blocks.length; idx++) {
    let block = blocks[idx];
    if (block.type !== "text") continue;
    let stripped = stripSystemReminders(block.text);
    if (stripped === block.text) continue;
    copy ??= [...blocks];
    copy[idx] = {
      ...block,
      text: stripped,
    };
  }
  return copy ?? blocks;
}
//@ chunk-aexe35rn.js:7083-7826 placement
/**
 * 提取入站消息的 pasted_content、client_platform、inbound_origin、wake_envelope 等。
 */
function extractInboundMetadata(message) {
  if (message.type !== "user") return;
  let pastedContent = "pasted_content" in message ? message.pasted_content : undefined;
  let inlinePastes = "inline_pastes" in message ? message.inline_pastes : undefined;
  let hasExtras =
    extractInboundAttachments(message).length > 0 || parseInboundContent(pastedContent).texts.length > 0;
  let content = message.message?.content;
  if (!content && !hasExtras) return;
  if (Array.isArray(content) && content.length === 0 && !hasExtras) return;
  let uuid = "uuid" in message && typeof message.uuid === "string" ? message.uuid : undefined;
  let clientPlatform = stringMetaField(message, "client_platform");
  let inboundOrigin = stringMetaField(message, "inbound_origin");
  let wakeEnvelope = "wake_envelope" in message ? message.wake_envelope : undefined;
  let receiverGroupingId = receiverGroupingIdOf(message);
  let activityObservation = activityObservationOf(message);
  let fromPlugin = sanitizeAddressPart("from_plugin" in message ? message.from_plugin : undefined);
  let slackOrigin;
  let normalizedContent = Array.isArray(content)
    ? dropEmptyTextBlocks(sanitizeTextBlocks(normalizeImageBlocks(content)))
    : stripSystemReminders(content ?? "");
  if (Array.isArray(normalizedContent) && normalizedContent.length === 0 && !hasExtras) return;
  return {
    content: normalizedContent,
    uuid,
    clientPlatform,
    inboundOrigin,
    wakeEnvelope,
    receiverGroupingId,
    slackOrigin,
    activityObservation,
    pastedContent,
    inlinePastes,
    fromPlugin,
  };
}
//@ chunk-aexe35rn.js:7826-7897 placement
/**
 * 从文本开头的 <teammate-message from="…"> 取发送者。
 */
function getTeammateMessageSender(text) {
  if (typeof text !== "string") return;
  return text.match(regExp_2)?.[1];
}
//@ chunk-aexe35rn.js:7897-8132 placement (2.1.88 match: extractErrorTypeFromData, 1)
/**
 * 内容（字符串或文本块）中是否带 teammate 消息信封。
 */
function hasTeammateMessageEnvelope(content) {
  if (typeof content === "string") return getTeammateMessageSender(content) !== undefined;
  if (!Array.isArray(content)) return false;
  return content.some(
    (block) =>
      typeof block === "object" &&
      block !== null &&
      "type" in block &&
      block.type === "text" &&
      "text" in block &&
      typeof block.text === "string" &&
      getTeammateMessageSender(block.text) !== undefined,
  );
}
//@ chunk-aexe35rn.js:8132-8199 placement
/**
 * 去掉空的 text 块（变化时才复制数组，未变化返回原数组）。
 */
function dropEmptyTextBlocks(blocks) {
  if (!blocks.some(isEmptyTextBlock)) return blocks;
  return blocks.filter((block) => !isEmptyTextBlock(block));
}
//@ chunk-aexe35rn.js:8199-8293 placement
function isEmptyTextBlock(block) {
  if (block.type !== "text") return false;
  return typeof block.text !== "string" || block.text.trim() === "";
}
//@ chunk-aexe35rn.js:8626-8720 placement
/**
 * 包装 onCommandLifecycle：保留原回调，再追加一个（读回执、斜杠命令等共用）。
 */
function wrapCommandLifecycle(io, extraHandler) {
  let onCommandLifecycle = io.onCommandLifecycle;
  io.onCommandLifecycle = (...args) => {
    onCommandLifecycle?.(...args);
    extraHandler(...args);
  };
}
//@ chunk-aexe35rn.js:8720-8779 placement
/**
 * 把回合的终态标签化：异常终止或取消为 cancelled，否则 completed。
 */
function turnOutcomeLabel(terminalReason, aborted) {
  return aborted || isAbnormalTerminalReason(terminalReason) ? "cancelled" : "completed";
}
export {
  extractInboundMetadata,
  isHearthOrigin,
  classifyInboundOrigin,
  refineInboundOrigin,
  humanHintOrPlatform,
  hasTeammateMessageEnvelope,
  adjustInboundPriority,
  isChatPlatformHuman,
  isDefinedHumanClientPlatform,
  isKnownHumanOrigin,
  downgradePriorityIfBusy,
  triggerFireReasonOf,
  isPeerOrigin,
  isHearthHuman,
  emailSenderModeOf,
  isHumanOriginLoosely,
  isTriggerFireOrigin,
  turnOutcomeLabel,
  wrapCommandLifecycle,
  isVerifiedSlackHumanTurn,
  EMAIL_HUMAN,
  dropEmptyTextBlocks,
  sanitizeTextBlocks,
  isNotificationOrigin,
  describeProjectsHumanOrigin,
  receiverGroupingIdOf,
  activityObservationOf,
  isNonHumanRelayMessage,
  withScheduledTriggerFireReason,
  getTeammateMessageSender,
  shouldTreatInboundAsHuman,
  isHumanInboundMessage,
  humanOriginWhenNotSynthetic,
  isClaudeCodeCliPlatform,
  parseInboundContent,
  parseInlinePastes,
  SESSION_INBOX,
};
