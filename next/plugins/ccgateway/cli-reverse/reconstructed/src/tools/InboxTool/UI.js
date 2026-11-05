/**
 * tools/InboxTool/UI.tsx
 *
 * 收件箱工具界面（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1k8fxw6h.js (1)
 * attribution: placement 1
 */
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import { stripControlChars, stripControlChars_2 } from "../../utils/stripControlChars.js";
import { foldSenderDisplayBrackets, inboxSenderProvenanceCaption } from "../../bridge/sessionInbox.js";

//@ chunk-1k8fxw6h.js:5086-6082 placement
function InboxReadResult(result) {
  if (!result.ok)
    return jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: `Inbox read failed \xB7 ${stripControlChars(result.reason) || "error"}`,
      }),
    });
  let senderDisplay =
    foldSenderDisplayBrackets(stripControlChars(result.sender_display)) ||
    stripControlChars(result.sender_kind) ||
    "unknown sender";
  let sourceSuffix = result.source === "slack" ? " via Slack" : "";
  let children = `[${inboxSenderProvenanceCaption(result.sender_kind)}]`;
  let isOwner = result.sender_kind === "rc_owner";
  let permalink = stripControlChars(result.slack_permalink);
  let receivedAt = stripControlChars(result.received_at);
  let trimmed = result.attachments_prefix?.trim();
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default_2(Box, {
          flexDirection: "row",
          children: [
            jsxProd_default(Box, {
              flexShrink: 0,
              children: isOwner
                ? jsxProd_default(Text, {
                    color: "permission",
                    children,
                  })
                : jsxProd_default(Text, {
                    dimColor: true,
                    children,
                  }),
            }),
            jsxProd_default(Box, {
              flexGrow: 1,
              flexShrink: 1,
              paddingLeft: 1,
              children: jsxProd_default(Text, {
                wrap: "wrap",
                children: `Inbox message from ${senderDisplay}${sourceSuffix}:`,
              }),
            }),
          ],
        }),
        trimmed
          ? jsxProd_default(Text, {
              dimColor: true,
              wrap: "wrap",
              children: stripControlChars_2(trimmed),
            })
          : null,
        jsxProd_default(Box, {
          borderStyle: "quote",
          borderTop: false,
          borderBottom: false,
          borderRight: false,
          borderDimColor: true,
          paddingLeft: 1,
          children: jsxProd_default(Text, {
            wrap: "wrap",
            children: stripControlChars_2(result.body),
          }),
        }),
        permalink || receivedAt
          ? jsxProd_default(Text, {
              dimColor: true,
              wrap: "wrap",
              children: [receivedAt && `received ${receivedAt}`, permalink].filter(Boolean).join(" \xB7 "),
            })
          : null,
      ],
    }),
  });
}
export { InboxReadResult };
