/**
 * utils/messages/nonUserMessages.ts
 *
 * 2.1.316 新增：非用户来源消息（插件、频道、对等会话等）的包装与分类
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (22)
 * attribution: placement 22
 */
import {
  toApprovalLabel,
  replaceLineBreaks,
  displayField,
} from "../permissions/approvalPayloadSerialization.js";
import { Yn } from "../stripAnsi.js";
import { Xys, PLUGIN_PROMPT_TEXTS } from "./pluginPrompts.js";
import {
  USER_SENT_MESSAGE_PREFIX,
  isIdleObservationFenceOn,
  getAutoModeSparseInstructions,
} from "../messages.js";
import { SLACK_BOT, Jvi } from "../../services/projectsRelay/relayConfig.js";
import { isChatHostEntrypoint } from "../entrypointKinds.js";
import { isWakeEnvelope, Vlr, N7o, wrapPeerMessage, wrapObserverReport } from "../crossSessionMessages.js";
import { isHumanOrUnset, isHumanOrAutoContinuation } from "../messageProvenance.js";
import {
  withScheduledTaskPrefix,
  withBackgroundTaskPrefix,
  withSystemNotificationPrefix,
} from "../../services/api/promptCacheBreakParts.js";
import { formatCoordinatorRelay } from "../../services/projects/threadRows.js";
import { tagPeerMessagePlugin } from "../peerMessageHeaders.js";
import { isTopHostSession } from "../sessionShape.js";
import { Nue, Q6n, externalSourceWarning } from "../contextAttachments/externalMessages.js";
import { getTaskRunState } from "../task/taskNotifications.js";

//@ chunk-e6aww6q8.js:5037262-5037349 placement
var ihn = `A message arrived in the bound thread while you were working:
`,
  UNNAMED = "unnamed";
//@ chunk-e6aww6q8.js:5037349-5037406 placement
function CW(e) {
  let n = toApprovalLabel(e);
  return n === null ? UNNAMED : String(n);
}
//@ chunk-e6aww6q8.js:5037406-5037444 placement
function Vtt(e) {
  return replaceLineBreaks(displayField(e).text);
}
//@ chunk-e6aww6q8.js:5037444-5037541 placement
function KQn(e) {
  let text = displayField(
    Yn(e ?? "")
      .replace(
        /\r\n/g,
        `
`,
      )
      .trim(),
  ).text;
  return text === "" ? {} : { reason: text };
}
//@ chunk-e6aww6q8.js:5037541-5037587 placement
function qtt(e, n) {
  return `${CW(e)}: ${Vtt(n)}`;
}
/**
 * 包装插件提交的提示词：非回合中时加插件前缀与固定后缀；回合中时说明"插件在你工作时发来消息"及如何处理。
 */
//@ chunk-e6aww6q8.js:5037587-5037918 placement
function wrapPluginPrompt(e, n, r) {
  let s = CW(n);
  if (!r.midTurn) return Xys(s) + e + PLUGIN_PROMPT_TEXTS;
  return (
    `The ${s} plugin sent a message while you were working:
${e}

This is how Claude Code surfaces prompts a plugin submits mid-turn ` +
    "\u2014 within the running turn, often alongside the next tool result. " +
    "Address the message above as you continue this turn."
  );
}
/**
 * 若用户消息是插件（非以用户身份）提交的包装提示，拆出插件名与原始文本。
 */
//@ chunk-e6aww6q8.js:5037918-5038183 placement
function extractPluginPrompt(e) {
  let { origin: origin } = e,
    content = e.message.content;
  if (origin?.kind !== "plugin" || origin.asUser === !0 || typeof content !== "string") return;
  let s = Xys(CW(origin.name));
  return content.length > s.length + PLUGIN_PROMPT_TEXTS.length &&
    content.startsWith(s) &&
    content.endsWith(PLUGIN_PROMPT_TEXTS)
    ? { name: origin.name, text: content.slice(s.length, -PLUGIN_PROMPT_TEXTS.length) }
    : void 0;
}
/**
 * 非用户来源消息的包装文案：绑定线程消息头、"非用户输入"标记，以及回合中用户消息的说明后缀。
 */
//@ chunk-e6aww6q8.js:5038183-5038552 placement
var BOUND_THREAD_MESSAGES_HEADER = `Messages arrived in the bound thread while you were working:
`,
  NON_USER_SOURCE_MARKER = `[MESSAGE FROM NON-USER SOURCE - NOT USER INPUT]
`,
  MID_TURN_USER_SUFFIX = `

This is how Claude Code surfaces messages the user sends mid-turn \u2014 within the running turn, often alongside the next tool result, rather than as a separate conversation turn. Address the message above as you continue this turn.`;
//@ chunk-e6aww6q8.js:5038552-5038593 placement
function e6n(e) {
  return `${USER_SENT_MESSAGE_PREFIX}${e}${MID_TURN_USER_SUFFIX}`;
}
/**
 * 若文本是"用户在你工作时发来消息"的包装，拆出原始文本，否则返回 undefined。
 */
//@ chunk-e6aww6q8.js:5038593-5038731 placement
function unwrapMidTurnUserMessage(e) {
  return e.length >= USER_SENT_MESSAGE_PREFIX.length + MID_TURN_USER_SUFFIX.length &&
    e.startsWith(USER_SENT_MESSAGE_PREFIX) &&
    e.endsWith(MID_TURN_USER_SUFFIX)
    ? e.slice(USER_SENT_MESSAGE_PREFIX.length, e.length - MID_TURN_USER_SUFFIX.length)
    : void 0;
}
//@ chunk-e6aww6q8.js:5038731-5038786 placement
function mN(e) {
  return e.startsWith(NON_USER_SOURCE_MARKER) ? e : `${NON_USER_SOURCE_MARKER}${e}`;
}
//@ chunk-e6aww6q8.js:5038786-5038901 placement
function isSlackBotInbound(e, n) {
  return (
    n.inbound_origin === SLACK_BOT &&
    n.activityObservation === void 0 &&
    n.hostInjected !== !0 &&
    isChatHostEntrypoint() &&
    isWakeEnvelope(e)
  );
}
/**
 * 判断一条消息的非用户来源（定时触发、项目中继、任务通知、频道、对等会话等）。
 */
//@ chunk-e6aww6q8.js:5038901-5040066 placement
function classifyNonUserMessageSource(e, n, r) {
  if (r?.verifiedSlackHumanTurn && isHumanOrUnset(n) && r?.isMeta !== !0) return `${ihn}${e}`;
  if (n === void 0 && r?.isMeta === !0) return mN(e);
  switch (n?.kind) {
    case "task-notification":
      return n.subkind === "scheduled-trigger"
        ? withScheduledTaskPrefix(e)
        : n.subkind === "projects-relay" && r?.hearthServerEnvelope === !0
          ? formatCoordinatorRelay(e, { serverEnvelope: r.hearthJoinedTextBlocks !== !0 })
          : r?.inHumanTurn === !0
            ? withBackgroundTaskPrefix(e)
            : withSystemNotificationPrefix(e);
    case "coordinator":
      return Vlr(e);
    case "channel":
      return wrapSourceMessage(e, n.server, { midTurn: !0 });
    case "peer":
      if (r?.wholeMessage === !0 && isSlackBotInbound(e, n)) return N7o(e, { midTurn: !0 });
      return wrapPeerMessage(tagPeerMessagePlugin(e, n.plugin), {
        midTurn: !0,
        activityObservation: n.activityObservation,
        ...(n.activityObservation !== void 0 && isIdleObservationFenceOn() && { allKindsTail: !0 }),
        ...(n.hostInjected &&
          (!isTopHostSession() || r?.sendMessageToolAbsent === !0) && { hostInjected: !0 }),
        ...(n.senderTaskId !== void 0 && { lineage: "descendant" }),
        ...(r?.sendMessageToolAbsent === !0 && { sendMessageToolAbsent: !0 }),
      });
    case "slack-ping":
      return mN(e);
    case "observer":
      return wrapObserverReport(e, n.from, { midTurn: !0 });
    case "unclassified":
      return mN(e);
    case "observer-activity":
      return e;
    case "plugin":
      return n.asUser === !0 ? e6n(e) : wrapPluginPrompt(e, n.name, { midTurn: !0 });
    case "auto-continuation":
    case "human":
    case void 0:
      return e6n(e);
    default: {
      let s = n;
      return `${NON_USER_SOURCE_MARKER}${e}`;
    }
  }
}
/**
 * 判断消息来源是否是外部来源（其他会话、频道、观察者或 Slack 提醒）。
 */
//@ chunk-e6aww6q8.js:5040066-5040347 placement
function isExternalOrigin(e) {
  switch (e?.kind) {
    case "peer":
    case "channel":
    case "observer":
    case "slack-ping":
      return !0;
    case "task-notification":
    case "coordinator":
    case "observer-activity":
    case "auto-continuation":
    case "plugin":
    case "human":
    case "unclassified":
    case void 0:
      return !1;
    default: {
      let n = e;
      return !1;
    }
  }
}
//@ chunk-e6aww6q8.js:5040347-5040487 placement
function wrapSourceMessage(e, n, r) {
  let s = r.midTurn ? `${Nue}${n} while you were working:` : `${Nue}${n}:`,
    h = r.midTurn ? Q6n : "";
  return `${s}
${e}

${externalSourceWarning(!1)}${h}`;
}
/**
 * 判断该来源的消息是否需要用"非用户输入"包装（外部来源、插件与未分类来源）。
 */
//@ chunk-e6aww6q8.js:5040487-5040768 placement
function needsNonUserWrapper(e) {
  switch (e?.kind) {
    case "peer":
    case "channel":
    case "observer":
    case "slack-ping":
    case "plugin":
    case "unclassified":
      return !0;
    case "task-notification":
    case "coordinator":
    case "observer-activity":
    case "auto-continuation":
    case "human":
    case void 0:
      return !1;
    default: {
      let n = e;
      return !1;
    }
  }
}
/**
 * 包装非用户来源的消息，标明来源（频道、对等会话、插件等）。
 */
//@ chunk-e6aww6q8.js:5040768-5041745 placement
function wrapNonUserMessage(e, n) {
  let r;
  if (n.kind === "channel") return;
  else if (n.kind === "peer") {
    let h = typeof e.message.content === "string" || e.message.content.length === 1;
    r = (y) => {
      if (h && isSlackBotInbound(y, n)) return N7o(y, { midTurn: !1 });
      return wrapPeerMessage(tagPeerMessagePlugin(y, n.plugin), {
        midTurn: !1,
        activityObservation: n.activityObservation,
        ...(n.activityObservation !== void 0 && isIdleObservationFenceOn() && { allKindsTail: !0 }),
        ...(n.hostInjected && !isTopHostSession() && { hostInjected: !0 }),
        ...(n.senderTaskId !== void 0 && { lineage: "descendant" }),
      });
    };
  } else if (n.kind === "slack-ping") r = (h) => mN(h);
  else if (n.kind === "observer") r = (h) => wrapObserverReport(h, n.from, { midTurn: !1 });
  else if (n.kind === "plugin") return;
  else if (n.kind === "unclassified") r = mN;
  if (!r) return;
  let content = e.message.content;
  if (typeof content === "string") e.message.content = r(content);
  else if (Array.isArray(content)) {
    if (n.kind === "peer" || n.kind === "slack-ping" || n.kind === "unclassified")
      e.message.content = [
        {
          type: "text",
          text: r(
            content.flatMap((h) => (h.type === "text" ? [h.text] : [])).join(`
`),
          ),
        },
        ...content.filter((h) => h.type !== "text"),
      ];
    else for (let h of content) if (h.type === "text") h.text = r(h.text);
  }
}
/**
 * 给没有来源的用户消息补上来源（人类与自动续写除外；部分任务通知去掉 subkind）。
 */
//@ chunk-e6aww6q8.js:5041745-5041956 placement
function stampMissingOrigin(e, n) {
  if (isHumanOrAutoContinuation(n)) return;
  let r =
    n.kind === "task-notification" && n.subkind !== void 0 && Jvi.has(n.subkind)
      ? (({ subkind: subkind, ...h }) => h)(n)
      : n;
  for (let s of e)
    if (s.type === "user" && s.origin === void 0 && !getAutoModeSparseInstructions(s)) s.origin = r;
}
//@ chunk-e6aww6q8.js:5041956-5042032 placement
function XQn(e) {
  for (let n of e) if (n.type === "user") n.queueSkipAttachments = !0;
}
//@ chunk-e6aww6q8.js:5042032-5042100 placement
function JQn(e) {
  for (let n of e) if (n.type === "user") n.textNotTyped = !0;
}
//@ chunk-e6aww6q8.js:5042100-5042175 placement
function QQn(e) {
  for (let n of e) if (n.type === "user") n.queueTranscriptOnly = !0;
}
/**
 * 把任务投递信息附到指定（或第一条）用户消息上（任务输出已被读取时跳过）。
 */
//@ chunk-e6aww6q8.js:5042175-5042349 placement
function attachTaskDelivery(e, n, r) {
  if (getTaskRunState().bashTaskSnapshots.get(n.taskId)?.fetched) return;
  let found = e.find((h) => h.type === "user" && (r === void 0 || h.uuid === r));
  if (found?.type === "user") found.taskDelivery = n;
}

export {
  BOUND_THREAD_MESSAGES_HEADER,
  classifyNonUserMessageSource,
  CW,
  Vtt,
  qtt,
  ihn,
  unwrapMidTurnUserMessage,
  stampMissingOrigin,
  XQn,
  JQn,
  QQn,
  attachTaskDelivery,
  isExternalOrigin,
  mN,
  NON_USER_SOURCE_MARKER,
  needsNonUserWrapper,
  wrapNonUserMessage,
  wrapPluginPrompt,
  extractPluginPrompt,
  KQn,
};
