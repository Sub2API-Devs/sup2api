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
import { useTheme, Me } from "../design-system/ThemeProvider.js";
import { Cr, useAppStateSession } from "../../state/AppState.js";
import { useMcpReconnect } from "../../services/mcp/MCPConnectionManager.js";
import { useHost } from "../../context/session.js";
import { y, P } from "../../../vendor/react/cjs/react.production.js";
import { uo, sanitizeErrorDetail, normalizeMcpServerName } from "../../services/api/deferredToolsState.js";
import { toggleStateOf, disabledEnableInMcpText } from "../../services/mcp/mcpToggleMessages.js";
import { isUnattendedBgSession } from "../../utils/concurrentSessions.js";
import { parkCommandForAttacher } from "../../services/mcp/mcpReconnectPark.js";
import { c6 } from "../fleet/sessionAttention.js";
import { WireSafeControlError } from "../../utils/errors.js";
import { redactMcpErrorDetail } from "../../services/mcp/mcpServerOrigin.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { logForDebugging } from "../../utils/debug.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { WorkerBadge } from "../permissions/WorkerBadge.js";
import { color } from "../design-system/color.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";

//@ chunk-cpqpnzp4.js:37997-40831 fingerprint = MCPReconnect (0.613)
function MCPReconnect(t0) {
  let $ = w(30),
    { serverName: serverName, onComplete: onComplete } = t0,
    v;
  if ($[0] !== onComplete)
    ((v = (m, ...k) => {
      let f = k;
      return onComplete(typeof m === "string" ? sanitizeTelemetryString(m) : m, ...f);
    }),
      ($[0] = onComplete),
      ($[1] = v));
  else v = $[1];
  let b = v,
    [N] = useTheme(),
    store = Cr(),
    reconnectMcpServer = useMcpReconnect(),
    { storageV5: storageV5 } = Me(),
    ne = useHost(),
    Y = useAppStateSession(),
    [K, L] = y(!0),
    [T, X] = y(null),
    k,
    z;
  if (
    $[2] !== Y ||
    $[3] !== ne ||
    $[4] !== b ||
    $[5] !== reconnectMcpServer ||
    $[6] !== serverName ||
    $[7] !== storageV5 ||
    $[8] !== store
  )
    ((k = () => {
      let attemptReconnect = async function Ne() {
        try {
          let server = store.getState().mcp.clients.find((client) => client.name === serverName);
          if (!server) {
            (X(`MCP server "${uo(serverName)}" not found`),
              L(!1),
              b(`MCP server "${uo(serverName)}" not found`));
            return;
          }
          if (toggleStateOf(server) === "disabled") {
            let ke = disabledEnableInMcpText(serverName);
            (X(ke), L(!1), b(ke));
            return;
          }
          let result = await reconnectMcpServer(serverName);
          Pe: switch (result.client.type) {
            case "connected": {
              (L(!1), b(`Successfully reconnected to ${uo(serverName)}`));
              break Pe;
            }
            case "needs-auth": {
              if ((X(`${uo(serverName)} requires authentication`), L(!1), isUnattendedBgSession())) {
                let xe = await parkCommandForAttacher(
                  ne,
                  c6(`authenticate ${uo(serverName)} \u2014 open this session and run /mcp`),
                  "MCP authentication needed",
                  storageV5,
                );
                b(
                  `${uo(serverName)} requires authentication. Open this session and run /mcp to authenticate.` +
                    (xe ? ' It now shows "needs input" in agent view.' : ""),
                );
              } else b(`${uo(serverName)} requires authentication. Use /mcp to authenticate.`);
              break Pe;
            }
            case "cached":
            case "pending":
            case "failed":
            case "disabled": {
              (X(`Failed to reconnect to ${uo(serverName)}`),
                L(!1),
                b(`Failed to reconnect to ${uo(serverName)}`));
              break Pe;
            }
            default: {
              result.client;
            }
          }
        } catch (t3) {
          let te = t3;
          let Ie = te instanceof Error ? te.message : String(te);
          let B = store.getState().mcp.clients.find((client) => client.name === serverName)?.config;
          let x =
            te instanceof WireSafeControlError
              ? Ie
              : B
                ? redactMcpErrorDetail(serverName, B, Ie)
                : "[error detail unavailable: server configuration could not be located]";
          if ((X(sanitizeErrorDetail(x)), L(!1), te instanceof WireSafeControlError))
            b(normalizeMcpServerName(x));
          else if (isBridgeOrTransport(Y))
            (logForDebugging(`mcp reconnect (typed) error for ${sanitizeTelemetryString(serverName)}: ${x}`, {
              level: "error",
            }),
              b(`Error reconnecting to ${uo(serverName)} (detail withheld on this connection).`));
          else b(`Error: ${normalizeMcpServerName(x)}`);
        }
      };
      attemptReconnect();
    }),
      (z = [serverName, reconnectMcpServer, store, b, storageV5, ne, Y]),
      ($[2] = Y),
      ($[3] = ne),
      ($[4] = b),
      ($[5] = reconnectMcpServer),
      ($[6] = serverName),
      ($[7] = storageV5),
      ($[8] = store),
      ($[9] = k),
      ($[10] = z));
  else ((k = $[9]), (z = $[10]));
  if ((P(k, z), K)) {
    let J;
    if ($[11] !== serverName)
      ((J = r(Text, {
        color: "text",
        children: ["Reconnecting to ", e(Text, { bold: !0, children: serverName })],
      })),
        ($[11] = serverName),
        ($[12] = J));
    else J = $[12];
    let de;
    if ($[13] === MEMO_CACHE_SENTINEL)
      ((de = e(WorkerBadge, { message: "Establishing connection to MCP server" })), ($[13] = de));
    else de = $[13];
    let D;
    if ($[14] !== J)
      ((D = r(Box, { flexDirection: "column", gap: 1, padding: 1, children: [J, de] })),
        ($[14] = J),
        ($[15] = D));
    else D = $[15];
    return D;
  }
  if (T) {
    let J;
    if ($[16] !== N) ((J = color("error", N)(re.cross)), ($[16] = N), ($[17] = J));
    else J = $[17];
    let de;
    if ($[18] !== J) ((de = r(Text, { children: [J, " "] })), ($[18] = J), ($[19] = de));
    else de = $[19];
    let D;
    if ($[20] !== serverName)
      ((D = r(Text, { color: "error", children: ["Failed to reconnect to ", serverName] })),
        ($[20] = serverName),
        ($[21] = D));
    else D = $[21];
    let V;
    if ($[22] !== de || $[23] !== D)
      ((V = r(Box, { children: [de, D] })), ($[22] = de), ($[23] = D), ($[24] = V));
    else V = $[24];
    let ue;
    if ($[25] !== T) ((ue = r(Text, { dimColor: !0, children: ["Error: ", T] })), ($[25] = T), ($[26] = ue));
    else ue = $[26];
    let be;
    if ($[27] !== V || $[28] !== ue)
      ((be = r(Box, { flexDirection: "column", gap: 1, padding: 1, children: [V, ue] })),
        ($[27] = V),
        ($[28] = ue),
        ($[29] = be));
    else be = $[29];
    return be;
  }
  return null;
}

export { MCPReconnect };
