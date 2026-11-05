/**
 * components/messages/UserMessageSite.tsx
 *
 * 2.1.316 新增：用户消息来源显示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pnx1prpt.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getDateTimeFormat, withTimeZone } from "../../utils/intl.js";
import { parsePluginServerName } from "../../utils/plugins/lspPluginIntegration.js";
import { stableStringifySafe } from "../../utils/hooks/hookSerialization.js";
import { useRenderInput, useRenderHook } from "../pluginUi/render/RenderInstance.js";
import { originFromUnknown } from "../../utils/messageOrigin.js";
import { truncateToLength, takeLastChars, countCharInString } from "../../utils/stringUtils.js";
import { isUltrathinkEnabled } from "../../utils/thinking.js";
import { ULTRATHINK_KEYWORD } from "../../utils/ultraplan/keyword.js";

//@ chunk-pnx1prpt.js:1688-1925 placement
/**
 * 取某时刻所在日期的零点时间戳；给出时区时按该时区的年月日计算（UTC 表示）。
 */
function startOfDayMs(date, timeZone) {
  if (!timeZone) return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  let parts = getDateTimeFormat("en-US", withTimeZone(DATE_FORMAT_OPTIONS, timeZone)).formatToParts(date);
  let offsetMs = {};
  for (let startMs of parts) offsetMs[startMs.type] = startMs.value;
  return Date.UTC(Number(offsetMs.year), Number(offsetMs.month) - 1, Number(offsetMs.day));
}
//@ chunk-pnx1prpt.js:1925-1979 placement
var DATE_FORMAT_OPTIONS = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
};
//@ chunk-pnx1prpt.js:1979-2098 placement
function deliveredBy(origin) {
  switch (origin.kind) {
    case "plugin":
      return origin.name;
    case "channel":
      return parsePluginServerName(origin.server)?.pluginName;
    default:
      return;
  }
}
//@ chunk-pnx1prpt.js:2098-2394 placement
function useUserMessageSite({ messageId, stored, text, isExpanded, task, sender, draw }) {
  let taskKey = stableStringifySafe(task);
  let senderKey = stableStringifySafe(sender);
  let renderInput = useRenderInput(
    "UserMessage",
    () => ({
      requestId: messageId,
      props: {
        text,
        origin: originFromUnknown(stored),
        isExpanded,
        ...(task !== undefined && {
          task,
        }),
        ...(sender !== undefined && {
          from: sender,
        }),
      },
    }),
    [messageId, text, stored, isExpanded, taskKey, senderKey],
  );
  return useRenderHook(
    renderInput,
    (renderDeps) => draw(renderDeps.props.text),
    deliveredBy(renderInput.props.origin),
  );
}
//@ chunk-pnx1prpt.js:2394-2421 placement
var SITE_REFRESH_MS = 1e4;
var SITE_POLL_MS = 2500;
var SITE_RETRY_MS = 2500;
//@ chunk-pnx1prpt.js:2421-2597 placement
/**
 * 超过 1 万字符的文本拆成头部、尾部与中间隐藏的行数/字符数，供折叠显示；短文本原样返回。
 */
function splitLongTextForCollapse(text) {
  if (text.length <= SITE_REFRESH_MS) return text;
  let head = truncateToLength(text, SITE_POLL_MS);
  let tail = takeLastChars(text, SITE_RETRY_MS);
  let hiddenLines =
    countCharInString(
      text,
      `
`,
      head.length,
    ) -
    countCharInString(
      tail,
      `
`,
    );
  let hiddenChars = text.length - head.length - tail.length;
  return {
    head,
    hiddenLines,
    hiddenChars,
    tail,
  };
}
//@ chunk-pnx1prpt.js:2597-2609 placement
var MAX_SITE_TEXT = 4000;
//@ chunk-pnx1prpt.js:2609-2672 placement
/**
 * 函数 isShortSiteText（文本够短且无敏感路径）。
 */
function isShortSiteText(text) {
  return text.length <= MAX_SITE_TEXT && !(isUltrathinkEnabled() && ULTRATHINK_KEYWORD(text).length > 0);
}
export { deliveredBy, useUserMessageSite, startOfDayMs, isShortSiteText, splitLongTextForCollapse };
