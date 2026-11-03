/**
 * components/messages/UserMessageSite.tsx
 *
 * 2.1.316 新增：用户消息来源显示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-j64mp9kq.js (8)
 * attribution: placement 8
 */
import { getDateTimeFormat, withTimeZone } from "../../utils/intl.js";
import { parsePluginServerName } from "../../utils/plugins/lspPluginIntegration.js";
import { stableStringifySafe } from "../../utils/hooks/hookSerialization.js";
import { useRenderInput, useRenderHook } from "../pluginUi/render/RenderInstance.js";
import { originFromUnknown } from "../../utils/messageOrigin.js";
import { truncateToLength, takeLastChars, countCharInString } from "../../utils/stringUtils.js";
import { isUltrathinkEnabled } from "../../utils/thinking.js";
import { ULTRATHINK_KEYWORD } from "../../utils/ultraplan/keyword.js";

//@ chunk-j64mp9kq.js:1688-1925 placement
/**
 * 取某时刻所在日期的零点时间戳；给出时区时按该时区的年月日计算（UTC 表示）。
 */
function startOfDayMs(i, timeZone) {
  if (!timeZone) return new Date(i.getFullYear(), i.getMonth(), i.getDate()).getTime();
  let o = getDateTimeFormat("en-US", withTimeZone(DATE_FORMAT_OPTIONS, timeZone)).formatToParts(i);
  let d = {};
  for (let a of o) d[a.type] = a.value;
  return Date.UTC(Number(d.year), Number(d.month) - 1, Number(d.day));
}
//@ chunk-j64mp9kq.js:1925-1979 placement
var DATE_FORMAT_OPTIONS = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
};
//@ chunk-j64mp9kq.js:1979-2098 placement
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
//@ chunk-j64mp9kq.js:2098-2394 placement
function useUserMessageSite({ messageId, stored, text, isExpanded, task, sender, draw }) {
  let l = stableStringifySafe(task);
  let u = stableStringifySafe(sender);
  let p = useRenderInput(
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
    [messageId, text, stored, isExpanded, l, u],
  );
  return useRenderHook(p, (C) => draw(C.props.text), deliveredBy(p.props.origin));
}
//@ chunk-j64mp9kq.js:2394-2421 placement
var SITE_REFRESH_MS = 1e4;
var SITE_POLL_MS = 2500;
var SITE_RETRY_MS = 2500;
//@ chunk-j64mp9kq.js:2421-2598 placement
/**
 * 超过 1 万字符的文本拆成头部、尾部与中间隐藏的行数/字符数，供折叠显示；短文本原样返回。
 */
function splitLongTextForCollapse(i) {
  if (i.length <= SITE_REFRESH_MS) return i;
  let t = truncateToLength(i, SITE_POLL_MS);
  let o = takeLastChars(i, SITE_RETRY_MS);
  let hiddenLines =
    countCharInString(
      i,
      `
`,
      t.length,
    ) -
    countCharInString(
      o,
      `
`,
    );
  let hiddenChars = i.length - t.length - o.length;
  return {
    head: t,
    hiddenLines,
    hiddenChars,
    tail: o,
  };
}
//@ chunk-j64mp9kq.js:2598-2610 placement
var MAX_SITE_TEXT = 4000;
//@ chunk-j64mp9kq.js:2610-2673 placement
/**
 * 函数 isShortSiteText（文本够短且无敏感路径）。
 */
function isShortSiteText(i) {
  return i.length <= MAX_SITE_TEXT && !(isUltrathinkEnabled() && ULTRATHINK_KEYWORD(i).length > 0);
}
export { deliveredBy, useUserMessageSite, startOfDayMs, isShortSiteText, splitLongTextForCollapse };
