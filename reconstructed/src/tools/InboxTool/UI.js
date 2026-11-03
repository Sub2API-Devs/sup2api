/**
 * tools/InboxTool/UI.tsx
 *
 * 收件箱工具界面（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-w3kk5zb6.js (1)
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

//@ chunk-w3kk5zb6.js:4750-5746 placement
function InboxReadResult(o) {
  if (!o.ok)
    return jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: `Inbox read failed \xB7 ${stripControlChars(o.reason) || "error"}`,
      }),
    });
  let l =
    foldSenderDisplayBrackets(stripControlChars(o.sender_display)) ||
    stripControlChars(o.sender_kind) ||
    "unknown sender";
  let c = o.source === "slack" ? " via Slack" : "";
  let children = `[${inboxSenderProvenanceCaption(o.sender_kind)}]`;
  let m = o.sender_kind === "rc_owner";
  let t = stripControlChars(o.slack_permalink);
  let i = stripControlChars(o.received_at);
  let trimmed = o.attachments_prefix?.trim();
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default_2(Box, {
          flexDirection: "row",
          children: [
            jsxProd_default(Box, {
              flexShrink: 0,
              children: m
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
                children: `Inbox message from ${l}${c}:`,
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
            children: stripControlChars_2(o.body),
          }),
        }),
        t || i
          ? jsxProd_default(Text, {
              dimColor: true,
              wrap: "wrap",
              children: [i && `received ${i}`, t].filter(Boolean).join(" \xB7 "),
            })
          : null,
      ],
    }),
  });
}
