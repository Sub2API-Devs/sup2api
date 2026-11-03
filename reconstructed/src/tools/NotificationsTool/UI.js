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
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import {
  sanitizeTimestamp,
  notificationOriginLabel,
} from "../../services/queuedNotifications/queuedNotifications.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { firstMeaningfulLine } from "../../utils/swarm/teammateIds.js";
import { sanitizeDisplayText } from "../../utils/sanitizeDisplayText.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { BACK_ARROW_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";
import { stripControlChars } from "../../utils/stripControlChars.js";
import { CtrlOToExpand } from "../../components/CtrlOToExpand.js";

//@ chunk-ah34pb7m.js:33057-33141 placement
/**
 * 通知结果（错误文本或 JSON）超出终端行数时返回 true，用于折叠显示。
 */
function exceedsNotificationsLineLimit(m, { columns }) {
  if (m.error) return exceedsLineLimit(m.error, columns);
  return exceedsLineLimit(jsonStringify(m, null, 2), columns);
}
//@ chunk-ah34pb7m.js:33141-33657 placement
/**
 * 渲染通知列表结果。
 */
function renderNotificationsResult(m, d, { verbose }) {
  let g = m.remaining > 0 ? `${m.remaining} more ${plural(m.remaining, "notification")} still queued` : "";
  if (m.notifications.length === 0)
    return jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: g || "No queued notifications",
      }),
    });
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        m.notifications.map((notification) =>
          jsxProd_default_2(
            Box,
            {
              flexDirection: "column",
              children: [
                renderNotificationItem(notification.origin, notification.content, verbose),
                verbose
                  ? jsxProd_default(Text, {
                      dimColor: true,
                      children: `queued ${sanitizeTimestamp(notification.queued_at)}`,
                    })
                  : null,
              ],
            },
            notification.notification_id,
          ),
        ),
        g
          ? jsxProd_default(Text, {
              dimColor: true,
              children: g,
            })
          : null,
      ],
    }),
  });
}
//@ chunk-ah34pb7m.js:33657-33895 placement
function renderNotificationItem(origin, content, verbose) {
  switch (origin) {
    case "github_webhook":
      break;
    case "mcp_send_message":
      return jsxProd_default(NotificationItem, {
        origin,
        summary: "message from another session",
        expandHint: true,
        body: content,
        verbose,
      });
    default:
      break;
  }
  return jsxProd_default(NotificationItem, {
    origin,
    summary: content,
    body: content,
    verbose,
  });
}
//@ chunk-ah34pb7m.js:33895-35109 placement
/**
 * 一条通知（来源、摘要、正文）。
 */
function NotificationItem(props) {
  let T = w(25);
  let { origin, summary, expandHint, body, verbose } = props;
  let M = expandHint === undefined ? false : expandHint;
  let x;
  if (T[0] !== summary || T[1] !== verbose) {
    x = verbose ? "" : firstMeaningfulLine(summary.replace(/\n/g, " "), sanitizeDisplayText);
    T[0] = summary;
    T[1] = verbose;
    T[2] = x;
  } else x = T[2];
  let k = x;
  let b;
  if (T[3] !== body || T[4] !== verbose) {
    b = verbose ? sanitizeDisplayText(body).trim() : "";
    T[3] = body;
    T[4] = verbose;
    T[5] = b;
  } else b = T[5];
  let E = b;
  let B;
  if (T[6] === MEMO_CACHE_SENTINEL) {
    B = jsxProd_default(Text, {
      "aria-label": "inbound:",
      color: "suggestion",
      children: BACK_ARROW_GLYPH,
    });
    T[6] = B;
  } else B = T[6];
  let children;
  if (T[7] !== origin) {
    children = stripControlChars(notificationOriginLabel(origin));
    T[7] = origin;
    T[8] = children;
  } else children = T[8];
  let N;
  if (T[9] !== children) {
    N = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    T[9] = children;
    T[10] = N;
  } else N = T[10];
  let W;
  if (T[11] !== k) {
    W = k
      ? jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              children: " \xB7 ",
            }),
            k,
          ],
        })
      : null;
    T[11] = k;
    T[12] = W;
  } else W = T[12];
  let U;
  if (T[13] !== M || T[14] !== verbose) {
    U =
      M && !verbose
        ? jsxProd_default_2(Fragment, {
            children: [" ", jsxProd_default(CtrlOToExpand, {})],
          })
        : null;
    T[13] = M;
    T[14] = verbose;
    T[15] = U;
  } else U = T[15];
  let K;
  if (T[16] !== N || T[17] !== W || T[18] !== U) {
    K = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [B, " ", N, W, U],
    });
    T[16] = N;
    T[17] = W;
    T[18] = U;
    T[19] = K;
  } else K = T[19];
  let V;
  if (T[20] !== E) {
    V = E
      ? jsxProd_default(Box, {
          borderStyle: "quote",
          borderTop: false,
          borderBottom: false,
          borderRight: false,
          borderDimColor: true,
          paddingLeft: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            wrap: "wrap",
            children: E,
          }),
        })
      : null;
    T[20] = E;
    T[21] = V;
  } else V = T[21];
  let Y;
  if (T[22] !== V || T[23] !== K) {
    Y = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [K, V],
    });
    T[22] = V;
    T[23] = K;
    T[24] = Y;
  } else Y = T[24];
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
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Text, {
      children: [
        "HTTP ",
        m.status,
        " ",
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["(", d, " lines)"],
        }),
      ],
    }),
  });
}
export { exceedsNotificationsLineLimit, renderNotificationsResult, renderHttpStatusLine };
