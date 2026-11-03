/**
 * components/mcp/MCPReconnect.tsx
 *
 * /mcp reconnect：重连指定服务器并显示结果。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/mcp/MCPReconnect.tsx
 * pieces: chunk-cpqpnzp4.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { useTheme, useTheme_2 } from "../design-system/ThemeProvider.js";
import { useAppStoreDirect, useAppStateSession } from "../../state/AppState.js";
import { useMcpReconnect } from "../../services/mcp/MCPConnectionManager.js";
import { useHost } from "../../context/session.js";
import { y, P } from "../../../vendor/react/cjs/react.production.js";
import {
  normalizeServerNameShort,
  sanitizeErrorDetail,
  normalizeMcpServerName,
} from "../../services/api/deferredToolsState.js";
import { toggleStateOf, disabledEnableInMcpText } from "../../services/mcp/mcpToggleMessages.js";
import { isUnattendedBgSession } from "../../utils/concurrentSessions.js";
import { parkCommandForAttacher } from "../../services/mcp/mcpReconnectPark.js";
import { truncateAttentionText } from "../fleet/sessionAttention.js";
import { WireSafeControlError } from "../../utils/errors.js";
import { redactMcpErrorDetail } from "../../services/mcp/mcpServerOrigin.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { WorkerBadge } from "../permissions/WorkerBadge.js";
import { color } from "../design-system/color.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";

//@ chunk-cpqpnzp4.js:37997-40831 fingerprint = MCPReconnect (0.613)
function MCPReconnect(props) {
  let $ = w(30);
  let { serverName, onComplete } = props;
  let v;
  if ($[0] !== onComplete) {
    v = (m, ...k) => {
      let f = k;
      return onComplete(typeof m === "string" ? sanitizeTelemetryString(m) : m, ...f);
    };
    $[0] = onComplete;
    $[1] = v;
  } else v = $[1];
  let b = v;
  let [theme] = useTheme();
  let store = useAppStoreDirect();
  let reconnectMcpServer = useMcpReconnect();
  let { storageV5 } = useTheme_2();
  let host = useHost();
  let appStateSession = useAppStateSession();
  let [isReconnecting, setIsReconnecting] = y(true);
  let [error, setError] = y(null);
  let k;
  let t2;
  if (
    $[2] !== appStateSession ||
    $[3] !== host ||
    $[4] !== b ||
    $[5] !== reconnectMcpServer ||
    $[6] !== serverName ||
    $[7] !== storageV5 ||
    $[8] !== store
  ) {
    k = () => {
      let attemptReconnect = async function attemptReconnect() {
        try {
          let server = store.getState().mcp.clients.find((client) => client.name === serverName);
          if (!server) {
            setError(`MCP server "${normalizeServerNameShort(serverName)}" not found`);
            setIsReconnecting(false);
            b(`MCP server "${normalizeServerNameShort(serverName)}" not found`);
            return;
          }
          if (toggleStateOf(server) === "disabled") {
            let ke = disabledEnableInMcpText(serverName);
            setError(ke);
            setIsReconnecting(false);
            b(ke);
            return;
          }
          let result = await reconnectMcpServer(serverName);
          Pe: switch (result.client.type) {
            case "connected": {
              setIsReconnecting(false);
              b(`Successfully reconnected to ${normalizeServerNameShort(serverName)}`);
              break Pe;
            }
            case "needs-auth": {
              setError(`${normalizeServerNameShort(serverName)} requires authentication`);
              setIsReconnecting(false);
              if (isUnattendedBgSession()) {
                let xe = await parkCommandForAttacher(
                  host,
                  truncateAttentionText(
                    `authenticate ${normalizeServerNameShort(serverName)} \u2014 open this session and run /mcp`,
                  ),
                  "MCP authentication needed",
                  storageV5,
                );
                b(
                  `${normalizeServerNameShort(serverName)} requires authentication. Open this session and run /mcp to authenticate.` +
                    (xe ? ' It now shows "needs input" in agent view.' : ""),
                );
              } else
                b(
                  `${normalizeServerNameShort(serverName)} requires authentication. Use /mcp to authenticate.`,
                );
              break Pe;
            }
            case "cached":
            case "pending":
            case "failed":
            case "disabled": {
              setError(`Failed to reconnect to ${normalizeServerNameShort(serverName)}`);
              setIsReconnecting(false);
              b(`Failed to reconnect to ${normalizeServerNameShort(serverName)}`);
              break Pe;
            }
            default: {
              result.client;
            }
          }
        } catch (error) {
          let err = error;
          let Ie = err instanceof Error ? err.message : String(err);
          let config = store.getState().mcp.clients.find((client) => client.name === serverName)?.config;
          let x =
            err instanceof WireSafeControlError
              ? Ie
              : config
                ? redactMcpErrorDetail(serverName, config, Ie)
                : "[error detail unavailable: server configuration could not be located]";
          setError(sanitizeErrorDetail(x));
          setIsReconnecting(false);
          if (err instanceof WireSafeControlError) b(normalizeMcpServerName(x));
          else if (isBridgeOrTransport(appStateSession)) {
            logForDebugging(`mcp reconnect (typed) error for ${sanitizeTelemetryString(serverName)}: ${x}`, {
              level: "error",
            });
            b(
              `Error reconnecting to ${normalizeServerNameShort(serverName)} (detail withheld on this connection).`,
            );
          } else b(`Error: ${normalizeMcpServerName(x)}`);
        }
      };
      attemptReconnect();
    };
    t2 = [serverName, reconnectMcpServer, store, b, storageV5, host, appStateSession];
    $[2] = appStateSession;
    $[3] = host;
    $[4] = b;
    $[5] = reconnectMcpServer;
    $[6] = serverName;
    $[7] = storageV5;
    $[8] = store;
    $[9] = k;
    $[10] = t2;
  } else {
    k = $[9];
    t2 = $[10];
  }
  P(k, t2);
  if (isReconnecting) {
    let t3;
    if ($[11] !== serverName) {
      t3 = jsxProd_default_2(Text, {
        color: "text",
        children: [
          "Reconnecting to ",
          jsxProd_default(Text, {
            bold: true,
            children: serverName,
          }),
        ],
      });
      $[11] = serverName;
      $[12] = t3;
    } else t3 = $[12];
    let t4;
    if ($[13] === MEMO_CACHE_SENTINEL) {
      t4 = jsxProd_default(WorkerBadge, {
        message: "Establishing connection to MCP server",
      });
      $[13] = t4;
    } else t4 = $[13];
    let t5;
    if ($[14] !== t3) {
      t5 = jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        padding: 1,
        children: [t3, t4],
      });
      $[14] = t3;
      $[15] = t5;
    } else t5 = $[15];
    return t5;
  }
  if (error) {
    let t3;
    if ($[16] !== theme) {
      t3 = color("error", theme)(figures_default.cross);
      $[16] = theme;
      $[17] = t3;
    } else t3 = $[17];
    let t4;
    if ($[18] !== t3) {
      t4 = jsxProd_default_2(Text, {
        children: [t3, " "],
      });
      $[18] = t3;
      $[19] = t4;
    } else t4 = $[19];
    let t5;
    if ($[20] !== serverName) {
      t5 = jsxProd_default_2(Text, {
        color: "error",
        children: ["Failed to reconnect to ", serverName],
      });
      $[20] = serverName;
      $[21] = t5;
    } else t5 = $[21];
    let t6;
    if ($[22] !== t4 || $[23] !== t5) {
      t6 = jsxProd_default_2(Box, {
        children: [t4, t5],
      });
      $[22] = t4;
      $[23] = t5;
      $[24] = t6;
    } else t6 = $[24];
    let t7;
    if ($[25] !== error) {
      t7 = jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Error: ", error],
      });
      $[25] = error;
      $[26] = t7;
    } else t7 = $[26];
    let t8;
    if ($[27] !== t6 || $[28] !== t7) {
      t8 = jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        padding: 1,
        children: [t6, t7],
      });
      $[27] = t6;
      $[28] = t7;
      $[29] = t8;
    } else t8 = $[29];
    return t8;
  }
  return null;
}
export { MCPReconnect };
