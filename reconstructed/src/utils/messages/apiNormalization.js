/**
 * utils/messages/apiNormalization.ts
 *
 * 2.1.316 新增：发往 API 前的消息规范化
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (68)
 * attribution: placement 68
 */
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  createHash as createHash_5,
  createHash as createHash_6,
  createHash as createHash_7,
  createHash as createHash_8,
  createHash as createHash_9,
  createHash as createHash_10,
  createHash as createHash_11,
  createHash as createHash_12,
  createHash as createHash_13,
  createHash as createHash_14,
  createHash as createHash_15,
  createHash as createHash_16,
  createHash as createHash_17,
  createHash as createHash_18,
  createHash as createHash_19,
  createHash as createHash_20,
  createHash as createHash_21,
  createHash as createHash_22,
  createHash as createHash_23,
  createHash as createHash_24,
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
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { pDt, parseReminderHeader, mDt } from "../systemReminder.js";
import {
  parseForwardedQueuedCommand,
  SPt,
  getForwardedTurnKind,
  Iis,
  getSourceAttributionLabel,
  isProjectsRelay,
  classifyMessageFrame,
  isLegacyHearthRelayMessage,
  isVerifiedSlackHuman,
  Qno,
} from "../messageProvenance.js";
import { wTt, aA, s$e } from "../permissions/serverClassifier/schemas.js";
import { isBareMode } from "../envUtils.js";
import {
  isInterruptionOnlyMessage,
  stripTrailingMessageIdTag,
  TRAILING_WHITESPACE_CHARS,
  INTERRUPT_TEXTS,
} from "../messages.js";
import { isHumanOrigin, isNonTypedInput } from "../turnOrigin.js";
import { v8r, c4t } from "../imageErrors.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { normalizeFullWidthSpace, takeLastChars, truncateToLength } from "../stringUtils.js";
import { tQe } from "../permissions/serverClassifier/context.js";
import { jb, isSystemLocalCommandMessage } from "../../bootstrap/sessionSlices.js";
import { VVr } from "../../services/projects/threadRows.js";
import { Gve } from "../cronFireTexts.js";
import { logError } from "../log.js";
import {
  COMMAND_MESSAGE,
  COMMAND_NAME,
  COMMAND_ARGS,
  SKILL_FORMAT,
  COMMAND_CONTENTS,
  BASH_INPUT,
} from "../../constants/xml.js";
import { getAutoModeConfigOrDefault } from "../permissions/permissionSetup.js";
import { getIsInteractive } from "../../bootstrap/state.js";
import { env } from "../env.js";
import { getLatchedPreSettingsEnvSnapshot } from "../managedEnvApply.js";
import { isChildSession, isClaudecodeSession } from "../sessionShape.js";
import { isTeammate, isModelDrivenSession } from "../teammate.js";
import { zbt } from "../transcript/resumeAnnouncements.js";
import { arraysEqual } from "../collections.js";
import { gge } from "../messageKinds.js";
import { answerOf } from "../../plugins/functionHooks/promptAttachmentHooks.js";
import { ge } from "../identity.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { qno } from "../../services/projectsRelay/relayConfig.js";
import { isChatHostEntrypoint } from "../entrypointKinds.js";
import { kYt } from "../pollEvents.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { Z6t } from "../permissions/serverClassifier/fallbackNotice.js";
import { isNarrationThinking } from "../../services/api/narrationClassifier.js";

//@ chunk-e6aww6q8.js:144825-145817 placement
function describeForwardedTurns(e, n) {
  let r = new Map(),
    s = new Set(),
    h = new Map();
  for (let w of e) {
    if (w.type !== "attachment" || w.attachment.type !== "queued_command") continue;
    let { attachment: attachment } = w,
      reminderId = attachment.reminderId;
    if (pDt(reminderId)) s.add(reminderId);
    let q = parseForwardedQueuedCommand(attachment);
    if (q !== void 0) {
      let Se = SPt(q);
      (r.delete(h.get(Se) ?? ""), h.set(Se, pDt(reminderId) ? reminderId : ""));
    }
    if (!pDt(reminderId) || r.has(reminderId) || attachment.renderedByBatchHead) continue;
    let Z = getForwardedTurnKind(attachment);
    if (Z === void 0) continue;
    if (Z === "forwarded_turn") {
      if (q === void 0) continue;
      let Se =
        q.source === "owner" && q.timestamp !== void 0 && q.timestamp.length <= wTt && Iis.test(q.timestamp)
          ? q.timestamp
          : void 0;
      r.set(reminderId, {
        provenance: Z,
        author: getSourceAttributionLabel(q.source),
        ...(Se !== void 0 && { written: Se }),
      });
    } else r.set(reminderId, { provenance: Z });
  }
  if (r.size === 0) return [];
  let y = [],
    S = new Set();
  for (let w of n) {
    if (w.type !== "user") continue;
    let content = w.message.content,
      G =
        typeof content === "string" ? [content] : content.flatMap((q) => (q.type === "text" ? [q.text] : []));
    for (let q of G) {
      let Z = parseReminderHeader(q);
      if (Z === void 0 || S.has(Z)) continue;
      let Se = r.get(Z);
      if (Se === void 0) continue;
      (S.add(Z), y.push({ id: Z, ...Se }));
    }
  }
  return y.length > aA ? y.slice(y.length - aA) : y;
}
/**
 * 解析分类器请求附带的数据：request 为非空字符串且 context 通过 schema 校验时返回，否则 undefined。
 */
//@ chunk-e6aww6q8.js:145817-146020 placement
function parseClassifierRequest(e) {
  if (typeof e !== "object" || e === null) return;
  let { request: request, context: context } = e;
  if (typeof request !== "string" || request.length === 0) return;
  let safeParse = s$e().safeParse(context);
  return safeParse.success ? { request: request, context: safeParse.data } : void 0;
}
/**
 * 精简（bare）模式下丢弃除队列命令与 poll 事件外的所有附件。
 */
//@ chunk-e6aww6q8.js:146063-146169 placement
function isBareModeAttachmentDropped(e) {
  if (!isBareMode()) return !1;
  let { type: n } = e.attachment;
  return n !== "queued_command" && n !== "poll_events";
}
/**
 * 从某位置往前看，最近一条有意义的消息是否是人类亲自输入的用户消息（遇到助手、工具结果、压缩摘要、中断或非白名单元消息则为否）。
 */
//@ chunk-e6aww6q8.js:146169-146554 placement
function isAfterHumanTurn(e, n = e.length) {
  for (let r = Math.min(n, e.length) - 1; r >= 0; r--) {
    let s = e[r];
    if (s === void 0) continue;
    if (s.type === "assistant") return !1;
    if (s.type !== "user") continue;
    if (s.toolUseResult !== void 0 || s.isCompactSummary === !0 || isInterruptionOnlyMessage(s)) return !1;
    if (s.isVisibleInTranscriptOnly === !0) continue;
    if (s.isMeta === !0) {
      if (isHarmlessMetaMessage(s)) continue;
      return !1;
    }
    return isHumanOrigin(s.origin) && s.verifiedSlackHumanTurn !== !0;
  }
  return !1;
}
//@ chunk-e6aww6q8.js:146554-146744 placement
function isHarmlessMetaMessage(e) {
  let content = e.message.content;
  return (
    e.origin === void 0 &&
    e.promptSource === void 0 &&
    Array.isArray(content) &&
    content.length > 0 &&
    content.every((r) => r.type === "text" && typeof r.text === "string" && Kao(r.text))
  );
}
//@ chunk-e6aww6q8.js:146744-146840 placement
function Kao(e) {
  return (
    (e.startsWith(v8r) || e.startsWith(c4t)) &&
    e.endsWith("]") &&
    !e.includes(`
`)
  );
}
/**
 * 收集紧跟在人类回合之后的任务通知类队列命令附件 uuid（排除定时触发与 Projects 中继）。
 */
//@ chunk-e6aww6q8.js:146840-147179 placement
function collectTaskNotificationsAfterHuman(e) {
  let n;
  for (let r = 0; r < e.length; r++) {
    let s = e[r];
    if (s.type !== "attachment" || s.attachment.type !== "queued_command") continue;
    let origin = s.attachment.origin;
    if (
      (origin != null
        ? origin.kind === "task-notification" &&
          origin.subkind !== "scheduled-trigger" &&
          !isProjectsRelay(origin)
        : s.attachment.commandMode === "task-notification") &&
      isAfterHumanTurn(e, r)
    )
      (n ??= new Set()).add(s.uuid);
  }
  return n ?? Vao;
}
//@ chunk-e6aww6q8.js:147179-147195 placement
var Vao = new Set();
//@ chunk-e6aww6q8.js:147195-147254 placement
var TENGU_VELVETY_RIPPLE = "tengu_velvety_ripple",
  TENGU_LEXICAL_CRYSTAL = "tengu_lexical_crystal";
//@ chunk-e6aww6q8.js:147254-147286 placement
function DTt() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VELVETY_RIPPLE, !1);
}
//@ chunk-e6aww6q8.js:147286-147318 placement
function LTt() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LEXICAL_CRYSTAL, !0);
}
//@ chunk-e6aww6q8.js:2516581-2516709 placement
function hashInsertedText(e, n) {
  let r = normalizeFullWidthSpace(e);
  return createHash_14("sha256")
    .update(`${Buffer.byteLength(r)}:${r}${normalizeFullWidthSpace(stripTrailingMessageIdTag(n))}`)
    .digest("hex")
    .slice(0, 32);
}
/**
 * 取出消息内容中的文本块（字符串内容视为一个文本块）。
 */
//@ chunk-e6aww6q8.js:2516709-2516856 placement
function getTextBlocks(e) {
  if (typeof e === "string") return [e];
  return Array.isArray(e)
    ? e.flatMap((n) => (n?.type === "text" && typeof n.text === "string" ? [n.text] : []))
    : [];
}
//@ chunk-e6aww6q8.js:2516856-2516953 placement
function lV(e) {
  let charAt = e.charAt(16);
  return e.startsWith("<system-reminder") && (charAt === ">" || TRAILING_WHITESPACE_CHARS.has(charAt));
}
//@ chunk-e6aww6q8.js:2516953-2517202 placement
function classifyInsertedTextKind(e) {
  if (e.wakeupSource !== void 0) return "timer";
  if (e.type !== "user") return "asTyped";
  let n = classifyMessageFrame(e);
  if (n.frame === "human" || n.frame === "relay-human") return "asTyped";
  return n.frame === "invisible" && n.reason === "meta-without-provenance" ? "hidden" : void 0;
}
//@ chunk-e6aww6q8.js:2517202-2517239 placement
var Jdn = { hidden: 0, asTyped: 1, timer: 2 };
/**
 * 有命令文本时给消息附上命令文本块计数（本条与全部）。
 */
//@ chunk-e6aww6q8.js:2517239-2517363 placement
function withCommandTextBlocks(e, n, r) {
  return getTextBlocks(n).length > 0
    ? {
        ...e,
        commandTextBlocks: { own: getTextBlocks(r).length, all: getTextBlocks(e.message.content).length },
      }
    : e;
}
//@ chunk-e6aww6q8.js:2517363-2517528 placement
function countHiddenCommandBlocks(e, n) {
  let commandTextBlocks = e.commandTextBlocks;
  if (commandTextBlocks === void 0) return 0;
  return commandTextBlocks?.all === n.length &&
    Number.isSafeInteger(commandTextBlocks.own) &&
    commandTextBlocks.own >= 0 &&
    commandTextBlocks.own < commandTextBlocks.all
    ? commandTextBlocks.all - commandTextBlocks.own
    : n.length;
}
//@ chunk-e6aww6q8.js:2517528-2517585 placement
function eQe(e, n) {
  return e.slice(Math.max(0, e.length - n));
}
//@ chunk-e6aww6q8.js:2517585-2517698 placement = countToolCallsSince (1)
function countToolCallsSince_8(e) {
  return Array.isArray(e)
    ? e.flatMap((block) => (block?.type === "tool_use" && typeof block.id === "string" ? [block.id] : []))
    : [];
}
/**
 * 为发给 API 的用户文本标注出处：找出本地记录里由定时器唤醒或隐藏的元消息插入的文本，按位置哈希在线上消息中定位，追加 inserted_text_at 出处条目（受列表上限约束）；未匹配时打点；出错返回原列表。
 */
//@ chunk-e6aww6q8.js:2517698-2519379 placement
function markInsertedTextProvenance(provenance, localMessages, wireMessages) {
  try {
    if (!tQe()) return provenance;
    let s = new Set(
        wireMessages.flatMap((Me) =>
          Me.type === "assistant" ? countToolCallsSince_8(Me.message.content) : [],
        ),
      ),
      kindByHash = new Map(),
      y = [],
      S = new Set(),
      w = "";
    for (let Me of localMessages) {
      if (jb(Me)) continue;
      if (Me.type === "assistant") {
        for (let We of countToolCallsSince_8(Me.message?.content)) if (s.has(We)) ((w = We), S.add(We));
      } else if (Me.type === "user" || isSystemLocalCommandMessage(Me)) {
        let We = classifyInsertedTextKind(Me);
        if (We === void 0) continue;
        let ze = getTextBlocks(Me.type === "user" ? Me.message?.content : Me.content),
          lt = Me.type === "user" && isLegacyHearthRelayMessage(Me) ? [VVr(ze)] : ze,
          Je = We === "hidden" && Me.type === "user" ? countHiddenCommandBlocks(Me, lt) : 0;
        for (let [nt, pt] of lt.entries()) {
          let Et = nt < Je ? "asTyped" : We,
            yt = Me.type === "user" ? mDt(pt) : pt;
          if (INTERRUPT_TEXTS.has(stripTrailingMessageIdTag(yt)) || lV(yt)) continue;
          let gt = [
            hashInsertedText(w, yt),
            hashInsertedText(
              w,
              `${yt}
[id:0]`,
            ),
          ];
          for (let At of gt) {
            let It = kindByHash.get(At);
            if (It === void 0 || Jdn[It] < Jdn[Et]) kindByHash.set(At, Et);
          }
          if (Et === "timer") y.push(gt);
        }
      }
    }
    if (![...kindByHash.values()].some((Me) => Me !== "asTyped")) return provenance;
    let L = new Set(),
      matched = { hidden: new Set(), timer: new Set() },
      q = "",
      Z = "";
    for (let Me of wireMessages)
      if (Me.type === "assistant") {
        for (let We of countToolCallsSince_8(Me.message.content)) if (((Z = We), S.has(We))) q = We;
      } else if (Me.type === "user")
        for (let We of getTextBlocks(Me.message.content)) {
          if (lV(We)) continue;
          let ze = hashInsertedText(q, We),
            lt = kindByHash.get(ze);
          if (lt === "timer" || lt === "hidden") {
            L.add(ze);
            let Je = Z === q ? ze : hashInsertedText(Z, We);
            (matched[lt].delete(Je), matched[lt].add(Je));
          }
        }
    if (y.some((Me) => !L.has(Me[0]) && !L.has(Me[1]))) Gve("text_not_sent");
    let Se = [...matched.hidden, ...matched.timer];
    if (Se.length === 0) return provenance;
    let filtered = provenance.filter((Me) => !matched.hidden.has(Me.id) && !matched.timer.has(Me.id));
    if (Se.length + filtered.length > aA) Gve("list_capped");
    let we = eQe([...matched.timer], aA),
      Ee = aA - we.length,
      min = Math.min(filtered.length, aA / 2),
      Ie = eQe([...matched.hidden], Ee - min);
    return [
      ...eQe(filtered, Ee - Ie.length),
      ...[...Ie, ...we].map((Me) => ({ id: Me, provenance: "inserted_text_at" })),
    ];
  } catch (error) {
    return (logError(error), Gve("list_failed"), provenance);
  }
}
//@ chunk-e6aww6q8.js:2519417-2519444 placement
var oun = [COMMAND_MESSAGE, COMMAND_NAME, COMMAND_ARGS, SKILL_FORMAT, COMMAND_CONTENTS];
/**
 * 解析斜杠命令消息文本里的标签（command-name/args/message/contents/skill-format 等），每种标签至多一次、只允许已知标签；返回命令名、参数、完整行、消息、内容与是否技能格式。
 */
//@ chunk-e6aww6q8.js:2519444-2520070 placement
function parseCommandMessage(text) {
  let tagRe = /<([a-z-]+)>([\s\S]*?)<\/\1>/y,
    regExp = new RegExp(`<${COMMAND_ARGS}>([\\s\\S]*)</${COMMAND_ARGS}>\\s*$`, "y"),
    tags = new Map(),
    pos = nQe(text, 0);
  while (pos < text.length) {
    ((regExp.lastIndex = pos), (tagRe.lastIndex = pos));
    let match = regExp.exec(text),
      Z = match ? null : tagRe.exec(text),
      Se = match ? COMMAND_ARGS : Z?.[1],
      ke = match ? match[1] : Z?.[2];
    if (Se === void 0 || ke === void 0 || !oun.includes(Se) || tags.has(Se)) return null;
    (tags.set(Se, ke), (pos = nQe(text, match ? text.length : tagRe.lastIndex)));
  }
  let y = tags.get(COMMAND_NAME)?.trim(),
    S = tags.get(SKILL_FORMAT);
  if (!y || (S ?? "true") !== "true") return null;
  let w = tags.get(COMMAND_ARGS)?.trim() ?? "",
    L = tags.get(COMMAND_MESSAGE)?.trim(),
    G = tags.get(COMMAND_CONTENTS)?.trim();
  return {
    name: y,
    args: w,
    line: `${y} ${w}`.trim(),
    ...(L !== void 0 && { message: L }),
    ...(G !== void 0 && { contents: G }),
    isSkillFormat: S !== void 0,
  };
}
//@ chunk-e6aww6q8.js:2520070-2520156 placement
function fgr(e) {
  let { message: message, name: r } = e;
  return message !== void 0 && message !== "" && message !== r && `/${message}` !== r;
}
//@ chunk-e6aww6q8.js:2520156-2520209 placement
function Ljo(e) {
  let n = parseCommandMessage(e);
  return n && Xwt(n) ? n : null;
}
//@ chunk-e6aww6q8.js:2520209-2520306 placement
function Xwt(e) {
  return !!e.message && !fgr(e) && e.contents === void 0 && !(e.isSkillFormat && e.args !== "");
}
/**
 * 从后往前找出最后一个可解析为命令的消息内容。
 */
//@ chunk-e6aww6q8.js:2520306-2520408 placement
function findLastCommandMessage(e) {
  let n = getContentTexts(e);
  for (let r = n.length - 1; r >= 0; r--) {
    let s = parseCommandMessage(n[r]);
    if (s) return s;
  }
  return null;
}
//@ chunk-e6aww6q8.js:2520408-2520486 placement
function Ezr(e) {
  let n = nQe(e, 0);
  return oun.some((r) => e.startsWith(`<${r}>`, n));
}
/**
 * 若最后一条文本是 <bash-input> 包裹的内容，取出其中的命令，否则返回 null。
 */
//@ chunk-e6aww6q8.js:2520486-2520669 placement
function extractBashInput(e) {
  let n = `<${BASH_INPUT}>`,
    r = `</${BASH_INPUT}>`,
    s = getContentTexts(e).at(-1)?.trim() ?? "";
  return s.length >= n.length + r.length && s.startsWith(n) && s.endsWith(r)
    ? s.slice(n.length, s.length - r.length)
    : null;
}
//@ chunk-e6aww6q8.js:2520669-2520734 placement
function nQe(e, n) {
  while (n < e.length && /\s/.test(e[n])) n++;
  return n;
}
//@ chunk-e6aww6q8.js:2520734-2520880 placement
function getContentTexts(e) {
  if (typeof e === "string") return [e];
  return !Array.isArray(e)
    ? []
    : e.flatMap((n) => (n.type === "text" && typeof n.text === "string" ? [n.text] : []));
}
//@ chunk-e6aww6q8.js:2520880-2520893 placement
var mgr = 1024;
//@ chunk-e6aww6q8.js:2520893-2521045 placement
function hashVouchedText(e, n, r, s) {
  let h = normalizeFullWidthSpace(e);
  return createHash_15("sha256")
    .update(`vouched_text:${Buffer.byteLength(h)}:${h}#${n}/${r}:${normalizeFullWidthSpace(s)}`)
    .digest("hex")
    .slice(0, 32);
}
/**
 * 把上下文分段附件组装成发给 API 的消息。
 */
//@ chunk-e6aww6q8.js:2521045-2524731 placement
function buildContextSectionsMessage(e, n, r) {
  try {
    if (getAutoModeConfigOrDefault().typedMarks !== !0) return;
    if (!getIsInteractive()) return { unknown: "headless" };
    if (env.CLAUDE_CODE_SESSION_KIND !== void 0) return { unknown: "background" };
    let s = getLatchedPreSettingsEnvSnapshot();
    if (
      isChildSession() ||
      (isClaudecodeSession() &&
        ((s === void 0
          ? env.CLAUDE_CODE_SKIP_PROMPT_HISTORY
          : s.CLAUDE_CODE_SKIP_PROMPT_HISTORY !== void 0) ||
          (!process.stdin.isTTY && !process.stdout.isTTY)))
    )
      return { unknown: "nested" };
    let h = isTeammate(),
      y = new Map(),
      S = !0;
    for (let nt of e) {
      if (nt.type !== "attachment") continue;
      if (
        nt.attachment.type === "context_sections" &&
        zbt()
          .safeParse(nt.attachment)
          .data?.sections.some((pt) => pt.name === "claudeMd")
      )
        S = !1;
      if (nt.attachment.type === "instructions") {
        let flattened = r(nt).messages.flatMap((message) => getTextBlocks(message.message.content));
        if (!arraysEqual(nt[gge]?.texts, flattened)) {
          S = !1;
          continue;
        }
        if ((answerOf(nt.uuid)?.kind ?? "engine") !== "engine") S = !1;
        y.set(nt, flattened);
      }
    }
    let w = e[0];
    if (w?.type === "user" && w.userContextReminder === !0) S = !1;
    let L = new Set([...y.values()].flat().map((nt) => nt.trimEnd())),
      G = new Map();
    for (let nt of n) {
      let pt = nt.type === "assistant" ? countToolCallsSince_8(nt.message.content) : [];
      for (let Et of pt) G.set(Et, pt[0]);
    }
    let q = new Set(),
      Z = new Map(),
      Se = new Set(),
      ke = 0,
      we = 0,
      Ee = "";
    for (let nt of e) {
      if (jb(nt)) continue;
      let pt = [],
        Et,
        yt,
        gt = y.get(nt);
      if (gt !== void 0) ((pt = gt), (Et = "instructions"));
      else if (nt.type === "assistant")
        for (let At of countToolCallsSince_8(nt.message?.content)) {
          let It = G.get(At);
          if (It !== void 0) ((Ee = It), q.add(It));
        }
      else if (isSystemLocalCommandMessage(nt)) pt = getTextBlocks(nt.content);
      else if (nt.type === "user") {
        let At = classifyMessageFrame(nt);
        if (At.frame === "relay-human") return { unknown: "relay" };
        if (nt.origin?.kind !== "task-notification") pt = getTextBlocks(nt.message?.content).map(mDt);
        let It = nt[gge];
        if (
          ((yt = It?.texts.map(mDt)),
          At.frame !== "human" || h || nt.wakeupSource !== void 0 || nt.promptRewritten === !0)
        )
          Et = void 0;
        else if (isHumanOrigin(nt.origin) && nt.emailSenderTurn === void 0 && !isNonTypedInput(nt))
          Et =
            It?.as !== "prompt"
              ? void 0
              : nt.promptSource === "typed" || nt.promptSource === "queued"
                ? "typed"
                : nt.promptSource === void 0
                  ? "commands"
                  : void 0;
        else if (
          It?.as === "plan" &&
          nt.origin?.kind === "auto-continuation" &&
          nt.planContent !== void 0 &&
          nt.isMeta !== !0 &&
          nt.textNotTyped !== !0 &&
          nt.handedOff !== !0 &&
          nt.queueTranscriptOnly !== !0
        )
          Et = "accepted";
        else if (It?.as === "feedback" && !isNonTypedInput(nt)) Et = "typed";
      }
      for (let At of pt) {
        if (At.trim() === "" || (lV(At) && !L.has(At.trimEnd()))) continue;
        let It = hashInsertedText(Ee, At),
          Yt =
            Et === void 0 ||
            (yt !== void 0 && !yt.includes(At)) ||
            (Et !== "instructions" && lV(At)) ||
            It !==
              hashInsertedText(
                Ee,
                `${At}
[id:0]`,
              ) ||
            (Et === "commands" && parseCommandMessage(At) === null)
              ? void 0
              : Et,
          qt = Z.get(It) ?? [];
        if ((qt.push(Yt), Z.set(It, qt), Yt === "instructions")) Se.add(It);
        ((ke += Yt === void 0 || Yt === "instructions" ? 0 : 1),
          (we += Yt === "typed" || Yt === "commands" ? 1 : 0));
      }
    }
    if (ke === 0 && L.size === 0) return { typed: [], ...(S && { instructions: [] }) };
    let Ae = [],
      Ie = new Map(),
      Me = new Map(),
      We = "",
      ze = "";
    for (let nt of n)
      if (nt.type === "assistant")
        for (let pt of countToolCallsSince_8(nt.message.content)) {
          ((ze = pt), (Me = new Map()));
          let Et = G.get(pt);
          if (Et !== void 0 && q.has(Et)) We = Et;
        }
      else if (nt.type === "user")
        for (let pt of getTextBlocks(nt.message.content)) {
          if (pt.trim() === "" || (lV(pt) && !L.has(pt.trimEnd()))) continue;
          let Et = hashInsertedText(We, pt),
            yt = Ie.get(Et) ?? 0;
          Ie.set(Et, yt + 1);
          let gt = normalizeFullWidthSpace(pt),
            At = Me.get(gt) ?? 0;
          Me.set(gt, At + 1);
          let It = Z.get(Et),
            Yt = Se.has(Et) ? "instructions" : It?.[yt];
          if (Yt !== void 0)
            Ae.push({ key: Et, list: Yt, lastSentCall: ze, earlier: At, sameTexts: Me, sent: gt });
        }
    let lt = { typed: [], commands: [], accepted: [], instructions: [] };
    for (let nt of Ae)
      if (Ie.get(nt.key) === Z.get(nt.key)?.length || nt.list === "instructions")
        lt[nt.list].push(
          hashVouchedText(nt.lastSentCall, nt.earlier, nt.sameTexts.get(nt.sent) ?? 0, nt.sent),
        );
    let Je = lt.typed.length + lt.commands.length;
    if (Je + lt.accepted.length + lt.instructions.length > mgr)
      return (iun("list_capped"), { unknown: "cap" });
    return {
      typed: lt.typed,
      ...(lt.commands.length > 0 && { commands: lt.commands }),
      ...(lt.accepted.length > 0 && { accepted: lt.accepted }),
      ...(we > Je && { unpaired: we - Je }),
      ...(S && (lt.instructions.length > 0 || L.size === 0) && { instructions: lt.instructions }),
    };
  } catch (error) {
    return (logError(error), iun("list_failed"), { unknown: "error" });
  }
}
//@ chunk-e6aww6q8.js:2524731-2524766 placement
var sun = ge(new Set(), (e) => e.clear());
//@ chunk-e6aww6q8.js:2524766-2524827 placement
function iun(e) {
  if (!sun.has(e)) (sun.add(e), logFeatureSad("typed_marks", e));
}
/**
 * 把用户消息标记为已验证的人类回合（可附 Projects 用户回合与邮件发送者回合标记）。
 */
//@ chunk-e6aww6q8.js:2524903-2525066 placement
function markVerifiedHumanTurn(e, n, { projectsUserTurn: r = !1, emailSenderTurn: s } = {}) {
  qno(e, n, {
    verifiedSlackHumanTurn: !0,
    ...(r && { projectsUserTurn: !0 }),
    ...(s !== void 0 && { emailSenderTurn: s }),
  });
}
//@ chunk-e6aww6q8.js:2525066-2525111 placement
function r9n(e, n) {
  return e || (n ? randomUUID_29() : void 0);
}
/**
 * 已验证人类回合摘录的预算常量（字符数、条数、引用字符、轮询事件人类字符），以及表示"有回合被省略"的占位系统消息。
 */
//@ chunk-e6aww6q8.js:2525111-2525314 placement
var MAX_HUMAN_TURN_CHARS = 12000,
  MAX_HUMAN_TURNS = 16,
  MAX_REFERENT_CHARS = 6000,
  POLL_EVENT_HUMAN_CHARS = 3000,
  OMITTED_TURNS_MARKER = Object.freeze({
    type: "system",
    subtype: "informational",
    content: "",
    level: "info",
    uuid: "00000000-0000-0000-0000-000000000000",
    timestamp: "1970-01-01T00:00:00.000Z",
  });
/**
 * 聊天宿主入口下，汇总已验证的人类回合（继承的加本会话的），从后往前在字符与条数预算内保留最近的回合，并在预算内附上每个回合所回应的助手消息；有省略时插入占位标记。
 */
//@ chunk-e6aww6q8.js:2525314-2525851 placement
function buildVerifiedHumanTurns({
  messages: messages,
  inheritedVerifiedHumanTurns: inheritedTurns,
  agentId: agentId,
}) {
  if (!isChatHostEntrypoint()) return;
  let s = splitInheritedTurns(inheritedTurns ?? []),
    [first, ...rest] = [
      ...s.turns,
      ...(isModelDrivenSession(agentId)
        ? messages.flatMap((Se) => {
            let ke = keepPrincipalOrVerifiedHumanMessage(Se);
            return ke ? [Agr(ke)] : [];
          })
        : collectHumanTurns(messages)),
    ];
  if (!first) return;
  let startIndex = rest.length,
    w = 0;
  while (startIndex > 0 && w < MAX_HUMAN_TURN_CHARS && rest.length - startIndex < MAX_HUMAN_TURNS)
    (startIndex--, (w += countTurnChars(rest[startIndex].turn)));
  let sliced = rest.slice(startIndex),
    G = dun(first.referent),
    q = 0;
  for (let Se = sliced.length - 1; Se >= 0; Se--) {
    let ke = dun(sliced[Se].referent);
    if (G + ke > MAX_REFERENT_CHARS) {
      q = Se + 1;
      break;
    }
    G += ke;
  }
  let Z = budgetPollEventProvenance([first, ...sliced]);
  return [
    ...lun(Z[0]),
    ...(s.omitted || startIndex > 0 ? [OMITTED_TURNS_MARKER] : []),
    ...Z.slice(1).flatMap((Se, ke) => (ke < q ? [Se.turn] : lun(Se))),
  ];
}
/**
 * 为多条 poll 事件分配来源文本的字符预算：从最新的开始依次分配上限，超出总预算的部分截断。
 */
//@ chunk-e6aww6q8.js:2525851-2526312 placement
function budgetPollEventProvenance(e) {
  let flattened = e.flatMap((S, w) =>
    S.turn.type === "attachment" && S.turn.attachment.type === "poll_events"
      ? [{ i: w, provenance: S.turn.attachment.provenance }]
      : [],
  );
  flattened.reverse();
  let r = POLL_EVENT_HUMAN_CHARS,
    mapped = flattened.map(({ provenance: provenance }) => {
      let min = Math.min(cun, r);
      return ((r -= budgetProvenanceEntries(provenance, min, 0).humanChars), min);
    }),
    h = r,
    y = [...e];
  return (
    flattened.forEach(({ i: S, provenance: provenance }, L) => {
      let G = mapped[L],
        humanChars = budgetProvenanceEntries(provenance, G, 0).humanChars,
        Z = budgetProvenanceEntries(provenance, G, Math.min(cun - humanChars, h));
      ((h = Math.max(0, h - Z.restChars)),
        (y[S] = { ...y[S], turn: withPollProvenance(y[S].turn, Z.entries) }));
    }),
    y
  );
}
//@ chunk-e6aww6q8.js:2526312-2526551 placement
function withPollProvenance(e, n) {
  if (e.type !== "attachment" || e.attachment.type !== "poll_events") return e;
  let provenance = e.attachment.provenance;
  return Array.isArray(provenance) && provenance.length === n.length && n.every((s, h) => s === provenance[h])
    ? e
    : { ...e, attachment: { ...e.attachment, provenance: n } };
}
//@ chunk-e6aww6q8.js:2526551-2526598 placement
function Agr(e) {
  return { referent: void 0, turn: e };
}
//@ chunk-e6aww6q8.js:2526598-2526651 placement
function lun({ referent: referent, turn: turn }) {
  return referent ? [referent, turn] : [turn];
}
//@ chunk-e6aww6q8.js:2526651-2526839 placement
function splitInheritedTurns(e) {
  let n = [],
    r = !1,
    s;
  for (let h of e) {
    if (h.type === "assistant") {
      s = h;
      continue;
    }
    if (h === OMITTED_TURNS_MARKER) r = !0;
    else {
      let y = keepPrincipalOrVerifiedHumanMessage(h);
      if (y) n.push({ referent: s, turn: y });
    }
    s = void 0;
  }
  return { turns: n, omitted: r };
}
//@ chunk-e6aww6q8.js:2526839-2526960 placement
function collectHumanTurns(e) {
  let n = [];
  return (
    e.forEach((r, s) => {
      let h = keepPrincipalOrVerifiedHumanMessage(r);
      if (h) n.push({ referent: isHumanTurnMessage(r) ? findReferentAssistant(e, s) : void 0, turn: h });
    }),
    n
  );
}
//@ chunk-e6aww6q8.js:2526960-2527079 placement
function findReferentAssistant(e, n) {
  for (let r = n - 1; r >= 0; r--) {
    let s = e[r];
    if (s.type === "assistant" && getAssistantTextIfReal(s)) return s;
    if (!isTransparentBetweenTurns(s)) return;
  }
  return;
}
/**
 * user 消息或 queued_command 附件是否是经核实的转发人类发言（verifiedSlackHumanTurn 且非 meta）。
 */
//@ chunk-e6aww6q8.js:2527079-2527233 placement = buildTranscriptEntries (0.777)
function isVerifiedRelayHumanMessage(message) {
  switch (message.type) {
    case "user":
      return isVerifiedSlackHuman(message);
    case "attachment":
      return message.attachment.type === "queued_command" && isVerifiedSlackHuman(message.attachment);
    default:
      return !1;
  }
}
/**
 * poll_events 附件中含 principal 来源时保留；经核实的人类转发消息且有正文时保留；否则返回 undefined。
 */
//@ chunk-e6aww6q8.js:2527233-2527419 placement
function keepPrincipalOrVerifiedHumanMessage(message) {
  if (message.type === "attachment" && message.attachment.type === "poll_events")
    return kYt(message.attachment.provenance).some((n) => n.kind === "principal") ? message : void 0;
  return isVerifiedRelayHumanMessage(message) && countTurnChars(message) > 0 ? message : void 0;
}
//@ chunk-e6aww6q8.js:2527419-2527688 placement
function isHumanTurnMessage(e) {
  switch (e.type) {
    case "user":
      return isHumanOrigin(e.origin);
    case "attachment":
      switch (e.attachment.type) {
        case "queued_command":
          return isHumanOrigin(e.attachment.origin);
        case "poll_events":
          return kYt(e.attachment.provenance)[0]?.kind === "principal";
        default:
          return !1;
      }
    default:
      return !1;
  }
}
//@ chunk-e6aww6q8.js:2527688-2527950 placement
function isTransparentBetweenTurns(e) {
  switch (e.type) {
    case "assistant":
      return !getAssistantTextIfReal(e);
    case "user":
      return e.isMeta === !0 && Qno(e.origin);
    case "attachment":
      return (
        e.attachment.type !== "queued_command" &&
        e.attachment.type !== "poll_events" &&
        e.attachment.type !== "teammate_mailbox"
      );
    default:
      return !0;
  }
}
//@ chunk-e6aww6q8.js:2527950-2528083 placement
function getAssistantTextIfReal(e) {
  if (e.isApiErrorMessage || e.isVirtual || e.message.model === SYNTHETIC_MODEL) return "";
  let n = contentText(e.message.content);
  return n.trim() ? n : "";
}
//@ chunk-e6aww6q8.js:2528083-2528096 placement
var Vve = 2000;
//@ chunk-e6aww6q8.js:2528096-2528134 placement
function Xve(e) {
  return takeLastChars(getAssistantTextIfReal(e), Vve);
}
//@ chunk-e6aww6q8.js:2528134-2528189 placement
function dun(e) {
  return e ? Math.min(getAssistantTextIfReal(e).length, Vve) : 0;
}
//@ chunk-e6aww6q8.js:2528189-2528220 placement
var uun = 280,
  oQe = " [truncated]";
//@ chunk-e6aww6q8.js:2528220-2528330 placement
function truncateSenderText(e) {
  let n = e.endsWith(oQe) ? e.slice(0, -oQe.length) : e;
  if (n.length <= uun) return e;
  return truncateToLength(n, uun) + oQe;
}
//@ chunk-e6aww6q8.js:2528330-2528372 placement
var cun = 1000,
  Fgr = 32,
  HARNESS_OMITTED = "harness-omitted";
//@ chunk-e6aww6q8.js:2528372-2528424 placement
function $gr(e) {
  return `[${e} more entries omitted]`;
}
//@ chunk-e6aww6q8.js:2528424-2528471 placement
var Hgr = /^\[(\d{1,3}) more entries omitted\]$/;
/**
 * 在字符预算内挑选轮询事件出处条目：委托人条目全部保留，其他人类与其余条目各在预算内按序保留，超出的合并为一条"省略 N 条"的条目；返回条目与已用字符数。
 */
//@ chunk-e6aww6q8.js:2528471-2529523 placement
function budgetProvenanceEntries(provenance, humanBudget, restBudget) {
  let candidates = kYt(provenance).flatMap((Se) => {
      if (Se.kind === "skipped") return [];
      if (Se.kind === "principal") return [{ entry: Se.entry, text: Se.text, group: "principal" }];
      let authority = Se.entry.authority;
      return [
        {
          entry: Se.entry,
          text: authority === HARNESS_OMITTED ? Se.text : truncateSenderText(Se.text),
          group: authority === HARNESS_OMITTED ? "omitted" : authority === "human-other" ? "human" : "rest",
        },
      ];
    }),
    kept = new Set(candidates.filter((Se) => Se.group === "principal")),
    takeGroup = (Se, ke, we) => {
      let filtered = candidates.filter((We) => We.group === Se),
        Ie = filtered.reduce((We, ze) => We + ze.text.length, 0) <= ke ? ke : Math.max(0, ke - we),
        Me = 0;
      for (let We of filtered) if (Me + We.text.length <= Ie) (kept.add(We), (Me += We.text.length));
      return Me;
    },
    humanChars = takeGroup("human", humanBudget, 0),
    restChars = takeGroup("rest", restBudget, Fgr),
    entries = [],
    dropped = [],
    omittedCount = 0,
    omittedIndex = -1;
  for (let Se of candidates) {
    if (kept.has(Se)) {
      entries.push(Se.text === Se.entry.senderText ? Se.entry : { ...Se.entry, senderText: Se.text });
      continue;
    }
    if (dropped.push(Se) === 1) omittedIndex = entries.length;
    let ke = Se.group === "omitted" ? Hgr.exec(Se.text) : null;
    omittedCount += ke ? Number(ke[1]) : 1;
  }
  if (omittedCount > 0) {
    let Se = $gr(omittedCount);
    restChars += Se.length;
    let ke = dropped.length === 1 ? dropped[0] : void 0;
    entries.splice(
      omittedIndex,
      0,
      ke?.group === "omitted" && ke.entry.senderText === Se
        ? ke.entry
        : { authority: HARNESS_OMITTED, senderText: Se },
    );
  }
  return { entries: entries, humanChars: humanChars, restChars: restChars };
}
/**
 * 统计一个回合的人类输入字符数：用户消息与队列命令按文本长度，poll 事件只计主体（principal）文本。
 */
//@ chunk-e6aww6q8.js:2529523-2529852 placement
function countTurnChars(e) {
  switch (e.type) {
    case "user":
      return contentText(e.message.content).length;
    case "attachment":
      switch (e.attachment.type) {
        case "queued_command":
          return contentText(e.attachment.prompt).length;
        case "poll_events":
          return kYt(e.attachment.provenance).reduce(
            (n, r) => n + (r.kind === "principal" ? r.text.length : 0),
            0,
          );
        default:
          return 0;
      }
    default:
      return 0;
  }
}
//@ chunk-e6aww6q8.js:2529852-2529996 placement
function contentText(e) {
  if (typeof e === "string") return e;
  if (!Array.isArray(e)) return "";
  return e.flatMap((n) => (n?.type === "text" ? [n.text ?? ""] : [])).join(`
`);
}
//@ chunk-e6aww6q8.js:2529996-2530198 placement
function hashHumanReply(e, n, r) {
  let trimEnd = r
    .trimEnd()
    .replace(/\[id:[a-z0-9]{1,8}\]$/, "")
    .trimEnd();
  return createHash_16("sha256")
    .update(`${Buffer.byteLength(e)}:${e}${Buffer.byteLength(n)}:${n}${trimEnd}`)
    .digest("hex")
    .slice(0, 32);
}
/**
 * 为发给 API 的、紧接助手文字之后的用户文本标注 human_reply 出处：用本地记录里人类亲自输入的文本（及其所回应的助手文字）建立计数，线上出现次数不超过本地次数时才标注（受列表剩余容量限制）。
 */
//@ chunk-e6aww6q8.js:2530198-2531710 placement
function markHumanReplyProvenance(entries, transcript, apiMessages, sessionContext) {
  try {
    let remainingSlots = aA - entries.length;
    if (remainingSlots <= 0 || isModelDrivenSession(sessionContext) || !Z6t()) return entries;
    let humanPairCounts = new Map(),
      humanSaidCounts = new Map(),
      transcriptToolUseIds = new Set(),
      lastToolUseId = "";
    for (let [Ae, Ie] of transcript.entries()) {
      if (jb(Ie)) continue;
      let Me = Ie.type === "user" || Ie.type === "assistant" ? Ie.message.content : void 0,
        We = Array.isArray(Me) ? Me : [];
      if (Ie.type === "assistant") {
        for (let Je of We)
          if (Je?.type === "tool_use") ((lastToolUseId = Je.id), transcriptToolUseIds.add(Je.id));
      }
      if (
        Ie.type !== "user" ||
        !isHumanOrigin(Ie.origin) ||
        Ie.emailSenderTurn !== void 0 ||
        isNonTypedInput(Ie) ||
        classifyMessageFrame(Ie).frame !== "human"
      )
        continue;
      let ze = typeof Me === "string" ? [Me] : We.flatMap((Je) => (Je?.type === "text" ? [Je.text] : []));
      for (let Je of ze) {
        let nt = hashHumanReply(lastToolUseId, "", Je);
        humanSaidCounts.set(nt, (humanSaidCounts.get(nt) ?? 0) + 1);
      }
      let lt = findReferentAssistant(transcript, Ae);
      if (ze[0] !== void 0 && lt !== void 0) {
        let Je = hashHumanReply(lastToolUseId, Xve(lt), ze[0]);
        humanPairCounts.set(Je, (humanPairCounts.get(Je) ?? 0) + 1);
      }
    }
    if (humanPairCounts.size === 0) return entries;
    let candidates = [],
      pairCounts = new Map(),
      saidCounts = new Map(),
      lastAssistantTail,
      matchedToolUseId = "",
      lastApiToolUseId = "";
    for (let Ae of apiMessages) {
      if (Ae.type === "api_system") continue;
      let content = Ae.message.content;
      for (let Me of typeof content === "string" ? [{ type: "text", text: content }] : content) {
        if (Ae.type === "assistant") {
          if (Me.type === "tool_use")
            ((lastApiToolUseId = Me.id),
              (matchedToolUseId = transcriptToolUseIds.has(Me.id) ? Me.id : matchedToolUseId));
          else if (Me.type === "text" && Me.text.trim()) lastAssistantTail = takeLastChars(Me.text, Vve);
          continue;
        }
        if (Me.type !== "text" || Me.text.startsWith("<system-reminder")) continue;
        let We = hashHumanReply(matchedToolUseId, "", Me.text);
        if ((saidCounts.set(We, (saidCounts.get(We) ?? 0) + 1), lastAssistantTail !== void 0)) {
          let ze = hashHumanReply(matchedToolUseId, lastAssistantTail, Me.text);
          (pairCounts.set(ze, (pairCounts.get(ze) ?? 0) + 1),
            candidates.push({
              pair: ze,
              said: We,
              id: hashHumanReply(lastApiToolUseId, lastAssistantTail, Me.text),
            }));
        }
        lastAssistantTail = void 0;
      }
    }
    return [
      ...candidates
        .flatMap(({ pair: pair, said: said, id: id }) =>
          (saidCounts.get(said) ?? 0) <= (humanSaidCounts.get(said) ?? 0) &&
          (pairCounts.get(pair) ?? 0) <= (humanPairCounts.get(pair) ?? 0)
            ? [{ id: id, provenance: "human_reply" }]
            : [],
        )
        .slice(-remainingSlots),
      ...entries,
    ];
  } catch (error) {
    return (logError(error), entries);
  }
}
//@ chunk-e6aww6q8.js:2531710-2531723 placement
var Ugr = 2048;
//@ chunk-e6aww6q8.js:2539630-2539681 placement
function ltt(e) {
  return !!e.thinking?.trim() && isNarrationThinking(e);
}
//@ chunk-e6aww6q8.js:2539681-2539755 placement
function _6s(e) {
  let n = [];
  return (
    e.forEach((r, s) => {
      if (isNarrationThinking(r)) n.push(s);
    }),
    n
  );
}

export {
  collectTaskNotificationsAfterHuman,
  isBareModeAttachmentDropped,
  LTt,
  findLastCommandMessage,
  extractBashInput,
  ltt,
  buildVerifiedHumanTurns,
  _6s,
  parseCommandMessage,
  Xwt,
  r9n,
  getTextBlocks,
  markVerifiedHumanTurn,
  markInsertedTextProvenance,
  markHumanReplyProvenance,
  describeForwardedTurns,
  buildContextSectionsMessage,
  Xve,
  OMITTED_TURNS_MARKER,
  withCommandTextBlocks,
  Ljo,
  Ezr,
  DTt,
  parseClassifierRequest,
  TENGU_VELVETY_RIPPLE,
  Ugr,
};
