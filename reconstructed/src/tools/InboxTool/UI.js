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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import { I1, stripControlChars } from "../../utils/stripControlChars.js";
import { foldSenderDisplayBrackets, inboxSenderProvenanceCaption } from "../../bridge/sessionInbox.js";

//@ chunk-w3kk5zb6.js:4750-5746 placement
function InboxReadResult(o) {
  if (!o.ok)
    return e(MessageResponse, {
      height: 1,
      children: e(Text, { dimColor: !0, children: `Inbox read failed \xB7 ${I1(o.reason) || "error"}` }),
    });
  let l = foldSenderDisplayBrackets(I1(o.sender_display)) || I1(o.sender_kind) || "unknown sender",
    c = o.source === "slack" ? " via Slack" : "",
    a = `[${inboxSenderProvenanceCaption(o.sender_kind)}]`,
    m = o.sender_kind === "rc_owner",
    t = I1(o.slack_permalink),
    i = I1(o.received_at),
    d = o.attachments_prefix?.trim();
  return e(MessageResponse, {
    children: r(Box, {
      flexDirection: "column",
      children: [
        r(Box, {
          flexDirection: "row",
          children: [
            e(Box, {
              flexShrink: 0,
              children: m
                ? e(Text, { color: "permission", children: a })
                : e(Text, { dimColor: !0, children: a }),
            }),
            e(Box, {
              flexGrow: 1,
              flexShrink: 1,
              paddingLeft: 1,
              children: e(Text, { wrap: "wrap", children: `Inbox message from ${l}${c}:` }),
            }),
          ],
        }),
        d ? e(Text, { dimColor: !0, wrap: "wrap", children: stripControlChars(d) }) : null,
        e(Box, {
          borderStyle: "quote",
          borderTop: !1,
          borderBottom: !1,
          borderRight: !1,
          borderDimColor: !0,
          paddingLeft: 1,
          children: e(Text, { wrap: "wrap", children: stripControlChars(o.body) }),
        }),
        t || i
          ? e(Text, {
              dimColor: !0,
              wrap: "wrap",
              children: [i && `received ${i}`, t].filter(Boolean).join(" \xB7 "),
            })
          : null,
      ],
    }),
  });
}
