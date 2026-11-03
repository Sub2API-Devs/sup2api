/**
 * tools/MonitorTool/UI.tsx
 *
 * 2.1.316 新增：推送通知结果说明（未发送原因）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ah34pb7m.js (4)
 * attribution: placement 4
 */
import { exceedsLineLimit } from "../../utils/terminal.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import { SlashCommandLink } from "../../components/SlashCommandLink.js";

//@ chunk-ah34pb7m.js:31379-31431 placement
function HM(m, { columns: columns }) {
  return exceedsLineLimit(jsonStringify(m, null, 2), columns);
}
//@ chunk-ah34pb7m.js:31431-31631 placement
function renderMonitorStarted(m) {
  return e(MessageResponse, {
    children: r(Text, {
      children: [
        "Monitor started",
        " ",
        r(Text, {
          dimColor: !0,
          children: [
            "\xB7 task ",
            m.taskId,
            " \xB7",
            " ",
            m.persistent ? "persistent" : `timeout ${m.timeoutMs / 1000}s`,
          ],
        }),
      ],
    }),
  });
}
/**
 * 推送通知结果说明（未发送原因）。
 */
//@ chunk-ah34pb7m.js:31631-32406 placement
function PushNotificationResult(m) {
  let d;
  if (m.disabledReason === "config_off")
    d = r(Box, {
      flexDirection: "row",
      children: [
        r(Text, { children: ['Not sent because "Push when Claude decides" is disabled in', " "] }),
        e(SlashCommandLink, { command: "config" }),
        e(Text, { children: "." }),
      ],
    });
  else if (m.disabledReason === "user_present")
    d = e(Text, { children: "Not sent because you're active in this terminal." });
  else if (m.disabledReason === "no_transport")
    d = m.localSent
      ? e(Text, { children: "Terminal notification sent." })
      : r(Box, {
          flexDirection: "row",
          children: [
            e(Text, { children: "Not sent \u2014 Remote Control is off. Enable with " }),
            e(SlashCommandLink, { command: "remote-control" }),
            e(Text, { children: "." }),
          ],
        });
  else {
    if (m.localSent === void 0) return null;
    d = e(Text, {
      children: m.localSent ? "Terminal and mobile notification sent." : "Mobile notification sent.",
    });
  }
  return e(MessageResponse, { height: 1, children: d });
}
//@ chunk-ah34pb7m.js:32641-32725 placement
function KM(m, { columns: columns }) {
  if (m.error) return exceedsLineLimit(m.error, columns);
  return exceedsLineLimit(jsonStringify(m, null, 2), columns);
}

export { HM, KM, renderMonitorStarted, PushNotificationResult };
