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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import { SlashCommandLink } from "../../components/SlashCommandLink.js";

//@ chunk-ah34pb7m.js:31379-31431 placement
/**
 * 监视结果（JSON）超出终端行数时返回 true。
 */
function exceedsMonitorLineLimit(result, { columns }) {
  return exceedsLineLimit(jsonStringify(result, null, 2), columns);
}
//@ chunk-ah34pb7m.js:31431-31631 placement
function renderMonitorStarted(result) {
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Text, {
      children: [
        "Monitor started",
        " ",
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            "\xB7 task ",
            result.taskId,
            " \xB7",
            " ",
            result.persistent ? "persistent" : `timeout ${result.timeoutMs / 1000}s`,
          ],
        }),
      ],
    }),
  });
}
//@ chunk-ah34pb7m.js:31631-32406 placement
/**
 * 推送通知结果说明（未发送原因）。
 */
function PushNotificationResult(result) {
  let body;
  if (result.disabledReason === "config_off")
    body = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [
        jsxProd_default_2(Text, {
          children: ['Not sent because "Push when Claude decides" is disabled in', " "],
        }),
        jsxProd_default(SlashCommandLink, {
          command: "config",
        }),
        jsxProd_default(Text, {
          children: ".",
        }),
      ],
    });
  else if (result.disabledReason === "user_present")
    body = jsxProd_default(Text, {
      children: "Not sent because you're active in this terminal.",
    });
  else if (result.disabledReason === "no_transport")
    body = result.localSent
      ? jsxProd_default(Text, {
          children: "Terminal notification sent.",
        })
      : jsxProd_default_2(Box, {
          flexDirection: "row",
          children: [
            jsxProd_default(Text, {
              children: "Not sent \u2014 Remote Control is off. Enable with ",
            }),
            jsxProd_default(SlashCommandLink, {
              command: "remote-control",
            }),
            jsxProd_default(Text, {
              children: ".",
            }),
          ],
        });
  else {
    if (result.localSent === undefined) return null;
    body = jsxProd_default(Text, {
      children: result.localSent ? "Terminal and mobile notification sent." : "Mobile notification sent.",
    });
  }
  return jsxProd_default(MessageResponse, {
    height: 1,
    children: body,
  });
}
//@ chunk-ah34pb7m.js:32641-32725 placement
/**
 * 推送通知结果（错误文本或 JSON）超出终端行数时返回 true。
 */
function exceedsPushNotificationLineLimit(result, { columns }) {
  if (result.error) return exceedsLineLimit(result.error, columns);
  return exceedsLineLimit(jsonStringify(result, null, 2), columns);
}
export {
  exceedsMonitorLineLimit,
  exceedsPushNotificationLineLimit,
  renderMonitorStarted,
  PushNotificationResult,
};
