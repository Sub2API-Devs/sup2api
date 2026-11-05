/**
 * tools/NotificationsTool/UI.tsx
 *
 * 2.1.316 新增：一条通知（来源、摘要、正文）；渲染通知列表结果。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wjygkcr4.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { firstMeaningfulLine } from "../../utils/swarm/teammateIds.js";
import { sanitizeDisplayText } from "../../utils/sanitizeDisplayText.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { BACK_ARROW_GLYPH } from "../../constants/figures.js";
import { stripControlChars } from "../../utils/stripControlChars.js";
import { CtrlOToExpand } from "../../components/CtrlOToExpand.js";

//@ chunk-wjygkcr4.js:34022-34106 placement
/**
 * 通知结果（错误文本或 JSON）超出终端行数时返回 true，用于折叠显示。
 */
function exceedsNotificationsLineLimit(result, { columns }) {
  if (result.error) return exceedsLineLimit(result.error, columns);
  return exceedsLineLimit(jsonStringify(result, null, 2), columns);
}
//@ chunk-wjygkcr4.js:34106-34622 placement
/**
 * 渲染通知列表结果。
 */
function renderNotificationsResult(result, progressMessages, { verbose }) {
  let remainingText =
    result.remaining > 0
      ? `${result.remaining} more ${plural(result.remaining, "notification")} still queued`
      : "";
  if (result.notifications.length === 0)
    return jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: remainingText || "No queued notifications",
      }),
    });
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        result.notifications.map((notification) =>
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
        remainingText
          ? jsxProd_default(Text, {
              dimColor: true,
              children: remainingText,
            })
          : null,
      ],
    }),
  });
}
//@ chunk-wjygkcr4.js:34622-34860 placement
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
//@ chunk-wjygkcr4.js:34860-36076 placement
/**
 * 一条通知（来源、摘要、正文）。
 */
function NotificationItem(props) {
  let $ = useMemoCache(25);
  let { origin, summary, expandHint, body, verbose } = props;
  let shouldExpandHint = expandHint === undefined ? false : expandHint;
  let summaryPreview;
  if ($[0] !== summary || $[1] !== verbose) {
    summaryPreview = verbose ? "" : firstMeaningfulLine(summary.replace(/\n/g, " "), sanitizeDisplayText);
    $[0] = summary;
    $[1] = verbose;
    $[2] = summaryPreview;
  } else summaryPreview = $[2];
  let summaryText = summaryPreview;
  let bodyPreview;
  if ($[3] !== body || $[4] !== verbose) {
    bodyPreview = verbose ? sanitizeDisplayText(body).trim() : "";
    $[3] = body;
    $[4] = verbose;
    $[5] = bodyPreview;
  } else bodyPreview = $[5];
  let bodyText = bodyPreview;
  let inboundGlyph;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    inboundGlyph = jsxProd_default(Text, {
      "aria-label": "inbound:",
      color: "suggestion",
      children: BACK_ARROW_GLYPH,
    });
    $[6] = inboundGlyph;
  } else inboundGlyph = $[6];
  let children;
  if ($[7] !== origin) {
    children = stripControlChars(notificationOriginLabel(origin));
    $[7] = origin;
    $[8] = children;
  } else children = $[8];
  let originElement;
  if ($[9] !== children) {
    originElement = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[9] = children;
    $[10] = originElement;
  } else originElement = $[10];
  let summaryElement;
  if ($[11] !== summaryText) {
    summaryElement = summaryText
      ? jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              children: " \xB7 ",
            }),
            summaryText,
          ],
        })
      : null;
    $[11] = summaryText;
    $[12] = summaryElement;
  } else summaryElement = $[12];
  let expandHintElement;
  if ($[13] !== shouldExpandHint || $[14] !== verbose) {
    expandHintElement =
      shouldExpandHint && !verbose
        ? jsxProd_default_2(Fragment, {
            children: [" ", jsxProd_default(CtrlOToExpand, {})],
          })
        : null;
    $[13] = shouldExpandHint;
    $[14] = verbose;
    $[15] = expandHintElement;
  } else expandHintElement = $[15];
  let headerLine;
  if ($[16] !== originElement || $[17] !== summaryElement || $[18] !== expandHintElement) {
    headerLine = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [inboundGlyph, " ", originElement, summaryElement, expandHintElement],
    });
    $[16] = originElement;
    $[17] = summaryElement;
    $[18] = expandHintElement;
    $[19] = headerLine;
  } else headerLine = $[19];
  let bodyBox;
  if ($[20] !== bodyText) {
    bodyBox = bodyText
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
            children: bodyText,
          }),
        })
      : null;
    $[20] = bodyText;
    $[21] = bodyBox;
  } else bodyBox = $[21];
  let itemBox;
  if ($[22] !== bodyBox || $[23] !== headerLine) {
    itemBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [headerLine, bodyBox],
    });
    $[22] = bodyBox;
    $[23] = headerLine;
    $[24] = itemBox;
  } else itemBox = $[24];
  return itemBox;
}
//@ chunk-wjygkcr4.js:36076-36223 placement
function renderHttpStatusLine(result) {
  let lineCount =
    countCharInString(
      result.json,
      `
`,
    ) + 1;
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Text, {
      children: [
        "HTTP ",
        result.status,
        " ",
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["(", lineCount, " lines)"],
        }),
      ],
    }),
  });
}
export { exceedsNotificationsLineLimit, renderNotificationsResult, renderHttpStatusLine };
