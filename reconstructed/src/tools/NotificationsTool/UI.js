/**
 * tools/NotificationsTool/UI.tsx
 *
 * 2.1.316 新增：一条通知（来源、摘要、正文）；渲染通知列表结果。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ah34pb7m.js (5)
 * attribution: placement 5
 */
import { exceedsLineLimit } from "../../utils/terminal.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { plural, countCharInString } from "../../utils/stringUtils.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import { oCo, notificationOriginLabel } from "../../services/queuedNotifications/queuedNotifications.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { firstMeaningfulLine } from "../../utils/swarm/teammateIds.js";
import { sanitizeDisplayText } from "../../utils/sanitizeDisplayText.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { p1e } from "../../utils/permissions/autoModeRulesPrompt.js";
import { I1 } from "../../utils/stripControlChars.js";
import { CtrlOToExpand } from "../../components/CtrlOToExpand.js";

//@ chunk-ah34pb7m.js:33057-33141 placement
function YM(m, { columns: columns }) {
  if (m.error) return exceedsLineLimit(m.error, columns);
  return exceedsLineLimit(jsonStringify(m, null, 2), columns);
}
/**
 * 渲染通知列表结果。
 */
//@ chunk-ah34pb7m.js:33141-33657 placement
function renderNotificationsResult(m, d, { verbose: verbose }) {
  let g = m.remaining > 0 ? `${m.remaining} more ${plural(m.remaining, "notification")} still queued` : "";
  if (m.notifications.length === 0)
    return e(MessageResponse, {
      height: 1,
      children: e(Text, { dimColor: !0, children: g || "No queued notifications" }),
    });
  return e(MessageResponse, {
    children: r(Box, {
      flexDirection: "column",
      children: [
        m.notifications.map((notification) =>
          r(
            Box,
            {
              flexDirection: "column",
              children: [
                renderNotificationItem(notification.origin, notification.content, verbose),
                verbose ? e(Text, { dimColor: !0, children: `queued ${oCo(notification.queued_at)}` }) : null,
              ],
            },
            notification.notification_id,
          ),
        ),
        g ? e(Text, { dimColor: !0, children: g }) : null,
      ],
    }),
  });
}
//@ chunk-ah34pb7m.js:33657-33895 placement
function renderNotificationItem(m, d, c) {
  switch (m) {
    case "github_webhook":
      break;
    case "mcp_send_message":
      return e(NotificationItem, {
        origin: m,
        summary: "message from another session",
        expandHint: !0,
        body: d,
        verbose: c,
      });
    default:
      break;
  }
  return e(NotificationItem, { origin: m, summary: d, body: d, verbose: c });
}
/**
 * 一条通知（来源、摘要、正文）。
 */
//@ chunk-ah34pb7m.js:33895-35109 placement
function NotificationItem(m) {
  let T = w(25),
    { origin: origin, summary: summary, expandHint: expandHint, body: body, verbose: verbose } = m,
    M = expandHint === void 0 ? !1 : expandHint,
    x;
  if (T[0] !== summary || T[1] !== verbose)
    ((x = verbose ? "" : firstMeaningfulLine(summary.replace(/\n/g, " "), sanitizeDisplayText)),
      (T[0] = summary),
      (T[1] = verbose),
      (T[2] = x));
  else x = T[2];
  let k = x,
    b;
  if (T[3] !== body || T[4] !== verbose)
    ((b = verbose ? sanitizeDisplayText(body).trim() : ""), (T[3] = body), (T[4] = verbose), (T[5] = b));
  else b = T[5];
  let E = b,
    B;
  if (T[6] === MEMO_CACHE_SENTINEL)
    ((B = e(Text, { "aria-label": "inbound:", color: "suggestion", children: p1e })), (T[6] = B));
  else B = T[6];
  let L;
  if (T[7] !== origin) ((L = I1(notificationOriginLabel(origin))), (T[7] = origin), (T[8] = L));
  else L = T[8];
  let N;
  if (T[9] !== L) ((N = e(Text, { dimColor: !0, children: L })), (T[9] = L), (T[10] = N));
  else N = T[10];
  let W;
  if (T[11] !== k)
    ((W = k ? r(Fragment, { children: [e(Text, { dimColor: !0, children: " \xB7 " }), k] }) : null),
      (T[11] = k),
      (T[12] = W));
  else W = T[12];
  let U;
  if (T[13] !== M || T[14] !== verbose)
    ((U = M && !verbose ? r(Fragment, { children: [" ", e(CtrlOToExpand, {})] }) : null),
      (T[13] = M),
      (T[14] = verbose),
      (T[15] = U));
  else U = T[15];
  let K;
  if (T[16] !== N || T[17] !== W || T[18] !== U)
    ((K = r(Text, { wrap: "truncate-end", children: [B, " ", N, W, U] })),
      (T[16] = N),
      (T[17] = W),
      (T[18] = U),
      (T[19] = K));
  else K = T[19];
  let V;
  if (T[20] !== E)
    ((V = E
      ? e(Box, {
          borderStyle: "quote",
          borderTop: !1,
          borderBottom: !1,
          borderRight: !1,
          borderDimColor: !0,
          paddingLeft: 1,
          children: e(Text, { dimColor: !0, wrap: "wrap", children: E }),
        })
      : null),
      (T[20] = E),
      (T[21] = V));
  else V = T[21];
  let Y;
  if (T[22] !== V || T[23] !== K)
    ((Y = r(Box, { flexDirection: "column", children: [K, V] })), (T[22] = V), (T[23] = K), (T[24] = Y));
  else Y = T[24];
  return Y;
}
//@ chunk-ah34pb7m.js:35109-35256 placement
function renderHttpStatusLine(m) {
  let d =
    countCharInString(
      m.json,
      `
`,
    ) + 1;
  return e(MessageResponse, {
    children: r(Text, {
      children: ["HTTP ", m.status, " ", r(Text, { dimColor: !0, children: ["(", d, " lines)"] })],
    }),
  });
}

export { YM, renderNotificationsResult, renderHttpStatusLine };
