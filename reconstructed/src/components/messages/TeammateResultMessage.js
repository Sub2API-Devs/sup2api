/**
 * components/messages/TeammateResultMessage.tsx
 *
 * 2.1.316 新增：队友结束消息（完成/失败/中断、摘要、结果）；队友私信/最后消息显示等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ah34pb7m.js (12)
 * attribution: placement 12
 */
import {
  capFrameFieldForDisplay,
  capFailureReasonForDisplay,
  capReceivedIdleResult,
  capIdFrameField,
  IDLE_SUMMARY_RECEIVE_BOUND,
  IDLE_ID_FIELD_RECEIVE_BOUND,
  stripFrameControlChars,
} from "../../utils/teammateMailbox.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { BLACK_CIRCLE } from "../../utils/permissions/autoModeRulesPrompt.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";
import { j, Se, qt } from "../../../vendor/react/cjs/react.production.js";
import { artifactRoomViewNotificationHeader } from "../../tasks/RemoteAgentTask/RemoteAgentTask.js";
import { d5 } from "./expandContext.js";
import { iP } from "../../context/session.js";
import { kT } from "../../services/tools/detachedToolCalls.js";
import { extractTag } from "../../utils/messages.js";
import {
  TOOL_USE_ID,
  SUMMARY,
  MONITOR_EVENT_QUOTED_PREFIX,
  EVENT,
  MONITOR_EVENT_PREFIX,
} from "../../constants/xml.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { escapeControlChars, truncateWithCount } from "../../utils/stringUtils.js";
import { unescapeHtmlEntities } from "../../utils/confusables.js";
import { ToolResultInline } from "./AssistantToolUseMessage.js";
import { processQueuedCommands_3 } from "../../utils/queuedCommandDisplay.js";
import { qa } from "../../utils/stripAnsi.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { truncateToWidth } from "../../utils/format.js";

//@ chunk-ah34pb7m.js:95673-95736 placement
function oR(m) {
  let d = capFrameFieldForDisplay(m);
  return d === m.trim() ? d : `${d}\u2026`;
}
/**
 * 队友结束消息（完成/失败/中断、摘要、结果）。
 */
//@ chunk-ah34pb7m.js:95736-97547 placement
function TeammateResultMessage(m) {
  let E = w(39),
    {
      displayName: displayName,
      inkColor: inkColor,
      idleReason: idleReason,
      failureReason: failureReason,
      summary: summary,
      completedTaskId: completedTaskId,
      result: T,
      expanded: expanded,
    } = m,
    k = idleReason === "failed" ? "error" : idleReason === "interrupted" ? "warning" : "success",
    b = idleReason === "failed" ? "failed" : idleReason === "interrupted" ? "was interrupted" : "finished",
    B;
  if (E[0] !== failureReason)
    ((B = capFailureReasonForDisplay(failureReason)), (E[0] = failureReason), (E[1] = B));
  else B = E[1];
  let L = B,
    N;
  if (E[2] !== idleReason || E[3] !== T)
    ((N = T ? capReceivedIdleResult(T, idleReason !== "failed") : ""),
      (E[2] = idleReason),
      (E[3] = T),
      (E[4] = N));
  else N = E[4];
  let W = N,
    U;
  if (E[5] !== summary)
    ((U = summary ? capIdFrameField(summary, IDLE_SUMMARY_RECEIVE_BOUND) : ""), (E[5] = summary), (E[6] = U));
  else U = E[6];
  let K = U,
    V;
  if (E[7] !== completedTaskId)
    ((V = completedTaskId ? capIdFrameField(completedTaskId, IDLE_ID_FIELD_RECEIVE_BOUND) : ""),
      (E[7] = completedTaskId),
      (E[8] = V));
  else V = E[8];
  let Y = V,
    X;
  if (E[9] !== W || E[10] !== expanded)
    ((X = !expanded && W ? oR(W) : ""), (E[9] = W), (E[10] = expanded), (E[11] = X));
  else X = E[11];
  let z = X,
    ee;
  if (E[12] !== k)
    ((ee = e(Text, { "aria-hidden": !0, color: k, children: BLACK_CIRCLE })), (E[12] = k), (E[13] = ee));
  else ee = E[13];
  let le;
  if (E[14] !== displayName || E[15] !== inkColor)
    ((le = r(Text, { color: inkColor, bold: !0, children: ["@", displayName] })),
      (E[14] = displayName),
      (E[15] = inkColor),
      (E[16] = le));
  else le = E[16];
  let ge;
  if (E[17] !== L) ((ge = L && r(Text, { dimColor: !0, children: [": ", L] })), (E[17] = L), (E[18] = ge));
  else ge = E[18];
  let ae;
  if (E[19] !== Y || E[20] !== expanded)
    ((ae = expanded && Y ? r(Text, { dimColor: !0, children: [" (task #", Y, ")"] }) : null),
      (E[19] = Y),
      (E[20] = expanded),
      (E[21] = ae));
  else ae = E[21];
  let pe;
  if (E[22] !== b || E[23] !== ee || E[24] !== le || E[25] !== ge || E[26] !== ae)
    ((pe = r(Text, { children: [ee, " ", "Teammate", " ", le, " ", b, ge, ae] })),
      (E[22] = b),
      (E[23] = ee),
      (E[24] = le),
      (E[25] = ge),
      (E[26] = ae),
      (E[27] = pe));
  else pe = E[27];
  let te;
  if (E[28] !== K || E[29] !== expanded)
    ((te =
      expanded && K
        ? e(Box, { paddingLeft: 2, children: r(Text, { dimColor: !0, children: ["Last DM: ", K] }) })
        : null),
      (E[28] = K),
      (E[29] = expanded),
      (E[30] = te));
  else te = E[30];
  let de;
  if (E[31] !== W || E[32] !== expanded || E[33] !== z)
    ((de =
      expanded && W
        ? e(Box, { paddingLeft: 2, children: e(MarkdownText_2, { stripPromptTags: !1, children: W }) })
        : z
          ? e(Box, { paddingLeft: 2, children: e(Text, { dimColor: !0, children: z }) })
          : null),
      (E[31] = W),
      (E[32] = expanded),
      (E[33] = z),
      (E[34] = de));
  else de = E[34];
  let ue;
  if (E[35] !== pe || E[36] !== te || E[37] !== de)
    ((ue = r(Box, { marginTop: 1, flexDirection: "column", children: [pe, te, de] })),
      (E[35] = pe),
      (E[36] = te),
      (E[37] = de),
      (E[38] = ue));
  else ue = E[38];
  return ue;
}
//@ chunk-ah34pb7m.js:97547-97551 placement
j();
//@ chunk-ah34pb7m.js:97551-97593 placement
function Dl(m) {
  return m.startsWith(artifactRoomViewNotificationHeader());
}
//@ chunk-ah34pb7m.js:97593-97597 placement
j();
/**
 * 队友私信/最后消息显示。
 */
//@ chunk-ah34pb7m.js:97597-98468 placement
function TeammateDmMessage(m) {
  let M = w(15),
    { addMargin: addMargin, text: text, verbose: verbose } = m,
    f = Se(d5),
    h = iP(),
    T;
  if (M[0] !== h) ((T = h ? kT.of(h) : null), (M[0] = h), (M[1] = T));
  else T = M[1];
  let x = T,
    k;
  if (M[2] !== text) ((k = extractTag(text, TOOL_USE_ID)), (M[2] = text), (M[3] = k));
  else k = M[3];
  let b = k,
    E;
  if (M[4] !== b) ((E = (B) => (b === null ? void 0 : B.get(b))), (M[4] = b), (M[5] = E));
  else E = M[5];
  let L = useStoreSelector(x, E);
  if (L === void 0) {
    let N;
    if (M[6] !== addMargin || M[7] !== text || M[8] !== verbose) {
      let W = verbose ? extractTag(text, "result") : null;
      let U;
      if (M[10] === MEMO_CACHE_SENTINEL)
        ((U = e(Text, { dimColor: !0, children: "An earlier tool call's result arrived here" })),
          (M[10] = U));
      else U = M[10];
      N = r(Box, {
        flexDirection: "column",
        marginTop: addMargin ? 1 : 0,
        children: [
          U,
          W !== null &&
            e(Box, {
              paddingLeft: 2,
              children: e(Text, {
                dimColor: !0,
                children: escapeControlChars(unescapeHtmlEntities(W)).trim(),
              }),
            }),
        ],
      });
      ((M[6] = addMargin), (M[7] = text), (M[8] = verbose), (M[9] = N));
    } else N = M[9];
    return N;
  }
  if (f || L.status === "running" || L.paintedInPlace) {
    return null;
  }
  let N;
  if (M[11] !== addMargin || M[12] !== L || M[13] !== verbose)
    ((N = e(ToolResultInline, { addMargin: addMargin, call: L, verbose: verbose })),
      (M[11] = addMargin),
      (M[12] = L),
      (M[13] = verbose),
      (M[14] = N));
  else N = M[14];
  return N;
}
//@ chunk-ah34pb7m.js:98468-98472 placement
j();
//@ chunk-ah34pb7m.js:98472-98476 placement
j();
//@ chunk-ah34pb7m.js:98476-98504 placement
var MAr = new Map(),
  xtn = qt(MAr);
//@ chunk-ah34pb7m.js:98504-98541 placement = SEP_WIDTH (1)
var cR = 500,
  LI = 4000,
  OI = 12,
  BI = " \xB7 ";
/**
 * 从文本中解析队友结果标签块。
 */
//@ chunk-ah34pb7m.js:98541-98978 placement
function parseTeammateResultBlock(m, d) {
  let c = processQueuedCommands_3(m, d),
    g = c === null ? null : extractTag(c, SUMMARY);
  if (c === null || g === null || g.includes("<")) return null;
  let f = unescapeHtmlEntities(g);
  if (
    !f.startsWith(MONITOR_EVENT_QUOTED_PREFIX) ||
    !f.endsWith('"') ||
    f.length <= MONITOR_EVENT_QUOTED_PREFIX.length
  )
    return null;
  let h = extractTag(c, EVENT);
  if (h === null || h.includes("<")) return null;
  let trimmed = stripFrameControlChars(qa(unescapeHtmlEntities(h))).trim(),
    T = "";
  for (let x of trimmed.split(`
`))
    if (((T = capIdFrameField(x, cR)), T !== "")) break;
  if (T === "") return null;
  return {
    description: capIdFrameField(f.slice(MONITOR_EVENT_QUOTED_PREFIX.length, -1), cR),
    headline: T,
    body: stripFrameControlChars(truncateWithCount(trimmed, LI)),
  };
}
/**
 * 按可用宽度截断 monitor 事件的标题与描述；剩余宽度不够时不显示描述。
 */
//@ chunk-ah34pb7m.js:98978-99135 placement
function fitMonitorEventText({ headline: headline, description: description }, c) {
  let max = Math.max(1, c - bunStringWidth(MONITOR_EVENT_PREFIX) - 1),
    f = truncateToWidth(headline, max),
    h = max - bunStringWidth(f) - bunStringWidth(BI);
  return { headline: f, description: description !== "" && h >= OI ? truncateToWidth(description, h) : null };
}

export {
  MAr,
  xtn,
  TeammateResultMessage,
  parseTeammateResultBlock,
  fitMonitorEventText,
  Dl,
  TeammateDmMessage,
};
