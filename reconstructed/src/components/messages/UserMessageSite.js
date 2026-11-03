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
import { Rs } from "../../utils/hooks/hookSerialization.js";
import { useRenderInput, useRenderHook } from "../pluginUi/render/RenderInstance.js";
import { L1r } from "../../utils/messageOrigin.js";
import { truncateToLength, takeLastChars, countCharInString } from "../../utils/stringUtils.js";
import { isUltrathinkEnabled } from "../../utils/thinking.js";
import { ULTRATHINK_KEYWORD } from "../../utils/ultraplan/keyword.js";

/**
 * 取某时刻所在日期的零点时间戳；给出时区时按该时区的年月日计算（UTC 表示）。
 */
//@ chunk-j64mp9kq.js:1688-1925 placement
function startOfDayMs(i, t) {
  if (!t) return new Date(i.getFullYear(), i.getMonth(), i.getDate()).getTime();
  let formatToParts = getDateTimeFormat("en-US", withTimeZone(ae, t)).formatToParts(i),
    d = {};
  for (let a of formatToParts) d[a.type] = a.value;
  return Date.UTC(Number(d.year), Number(d.month) - 1, Number(d.day));
}
//@ chunk-j64mp9kq.js:1925-1979 placement
var ae = { year: "numeric", month: "2-digit", day: "2-digit" };
//@ chunk-j64mp9kq.js:1979-2098 placement
function deliveredBy(i) {
  switch (i.kind) {
    case "plugin":
      return i.name;
    case "channel":
      return parsePluginServerName(i.server)?.pluginName;
    default:
      return;
  }
}
//@ chunk-j64mp9kq.js:2098-2394 placement
function useUserMessageSite({
  messageId: messageId,
  stored: stored,
  text: text,
  isExpanded: isExpanded,
  task: task,
  sender: sender,
  draw: draw,
}) {
  let l = Rs(task),
    u = Rs(sender),
    p = useRenderInput(
      "UserMessage",
      () => ({
        requestId: messageId,
        props: {
          text: text,
          origin: L1r(stored),
          isExpanded: isExpanded,
          ...(task !== void 0 && { task: task }),
          ...(sender !== void 0 && { from: sender }),
        },
      }),
      [messageId, text, stored, isExpanded, l, u],
    );
  return useRenderHook(p, (C) => draw(C.props.text), deliveredBy(p.props.origin));
}
//@ chunk-j64mp9kq.js:2394-2421 placement
var me = 1e4,
  ue = 2500,
  pe = 2500;
/**
 * 超过 1 万字符的文本拆成头部、尾部与中间隐藏的行数/字符数，供折叠显示；短文本原样返回。
 */
//@ chunk-j64mp9kq.js:2421-2598 placement
function splitLongTextForCollapse(i) {
  if (i.length <= me) return i;
  let t = truncateToLength(i, ue),
    o = takeLastChars(i, pe),
    d =
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
      ),
    a = i.length - t.length - o.length;
  return { head: t, hiddenLines: d, hiddenChars: a, tail: o };
}
//@ chunk-j64mp9kq.js:2598-2610 placement
var fe = 4000;
//@ chunk-j64mp9kq.js:2610-2673 placement
function QAr(i) {
  return i.length <= fe && !(isUltrathinkEnabled() && ULTRATHINK_KEYWORD(i).length > 0);
}

export { deliveredBy, useUserMessageSite, startOfDayMs, QAr, splitLongTextForCollapse };
