/**
 * commands/mcp/mcp.tsx
 *
 * 并入已有模块：/mcp 命令的少量补充声明。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/mcp/mcp.tsx
 * pieces: chunk-5bdzenzx.js (1), chunk-cpqpnzp4.js (23)
 * attribution: fingerprint 3, placement 4, sole-consumer 13, affinity 1, layout 3
 */
import { init_react_production, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppStoreDirect, useAppState, useAppStateSession } from "../../state/AppState.js";
import {
  useMcpReconnect,
  reconnectTargets,
  reconnectAllServers,
  useMcpToggleEnabled,
} from "../../services/mcp/MCPConnectionManager.js";
import { getIsDisabledHandle } from "../../services/mcp/reconnectHandles.js";
import { logForDebugging } from "../../utils/debug.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { redactMcpErrorDetail } from "../../services/mcp/mcpServerOrigin.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { plural } from "../../utils/stringUtils.js";
import { isUnattendedBgSession } from "../../utils/concurrentSessions.js";
import { logError } from "../../utils/log.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { M, u, string, array, E } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  connectionTypeOf,
  describeDisabledServers,
  disabledInOtherSessionText,
  disabledElsewhereText,
  reenabledElsewhereText,
} from "../../services/mcp/mcpToggleMessages.js";
import { normalizeServerNameShort } from "../../services/api/deferredToolsState.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { formatMcpOperationFailure } from "../../components/mcp/utils/reconnectHelpers.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { count } from "../../utils/collections.js";
import { parkCommandForAttacher } from "../../services/mcp/mcpReconnectPark.js";
import { MCPSettings } from "../../components/mcp/MCPSettings.js";
import { MCPReconnect } from "../../components/mcp/MCPReconnect.js";

//@ chunk-cpqpnzp4.js:17987-17991 placement
init_react_production();
//@ chunk-cpqpnzp4.js:17991-17995 placement
init_react_production();
//@ chunk-cpqpnzp4.js:17995-17999 placement
init_react_production();
//@ chunk-cpqpnzp4.js:37993-37997 placement
init_react_production();
//@ chunk-cpqpnzp4.js:40831-40835 sole-consumer
init_react_production();
//@ chunk-cpqpnzp4.js:40835-40874 sole-consumer = _temp2 (1)
function isNonIdeClient(c) {
  return c.name !== "ide";
}
//@ chunk-cpqpnzp4.js:40874-40897 sole-consumer
function noAutoReconnect() {
  return false;
}
//@ chunk-cpqpnzp4.js:40897-42118 sole-consumer
/**
 * /mcp reconnect all 的界面组件：挂载时一次性重连全部需要重连的 MCP 服务器，结束后通过 onComplete 报告成功个数与仍未连接的数量。
 */
function ReconnectAllMcp(props) {
  let v = w(11);
  let { onComplete } = props;
  let appStoreDirect = useAppStoreDirect();
  let mcpReconnect = useMcpReconnect();
  let m;
  if (v[0] !== appStoreDirect) {
    m = () =>
      reconnectTargets(
        appStoreDirect.getState().mcp.clients.filter(isNonIdeClient),
        getIsDisabledHandle() ?? noAutoReconnect,
      );
    v[0] = appStoreDirect;
    v[1] = m;
  } else m = v[1];
  let [k] = y(m);
  let f = R(false);
  let b;
  let N;
  if (v[2] !== k || v[3] !== onComplete || v[4] !== mcpReconnect) {
    b = () => {
      if (f.current) {
        return;
      }
      f.current = true;
      let { targets, outOfBandNote } = k;
      if (targets.length === 0) {
        onComplete(appendNotice("No MCP servers need reconnecting", outOfBandNote));
        return;
      }
      reconnectAllServers(targets, mcpReconnect)
        .then((U) => {
          let { results, connected } = U;
          results.forEach((result, L) => {
            let T = targets[L];
            if (result.status === "rejected" && T)
              logForDebugging(
                `mcp reconnect all: ${sanitizeTelemetryString(T.name)} not reconnected: ${redactMcpErrorDetail(T.name, T.config, errorMessage(result.reason))}`,
                {
                  level: "error",
                },
              );
          });
          let X = targets.length - connected;
          let z = `Reconnected ${connected} of ${targets.length} MCP ${plural(targets.length, "server")}`;
          let J = isUnattendedBgSession()
            ? "attach to this session and run /mcp to check"
            : "run /mcp to check";
          onComplete(
            appendNotice(X === 0 ? z : `${z} (${X} still not connected \u2014 ${J})`, outOfBandNote),
          );
        })
        .catch(logError);
    };
    N = [k, mcpReconnect, onComplete];
    v[2] = k;
    v[3] = onComplete;
    v[4] = mcpReconnect;
    v[5] = b;
    v[6] = N;
  } else {
    b = v[5];
    N = v[6];
  }
  P(b, N);
  if (k.targets.length === 0) {
    return null;
  }
  const U = k.targets.length;
  let me;
  if (v[7] !== k.targets.length) {
    me = plural(k.targets.length, "server");
    v[7] = k.targets.length;
    v[8] = me;
  } else me = v[8];
  const message = `Reconnecting ${U} MCP ${me}`;
  let ke;
  if (v[9] !== message) {
    ke = jsxProd_default(Box, {
      flexDirection: "column",
      padding: 1,
      children: jsxProd_default(WorkerBadge, {
        message,
      }),
    });
    v[9] = message;
    v[10] = ke;
  } else ke = v[10];
  return ke;
}
//@ chunk-cpqpnzp4.js:42118-42166 sole-consumer
function appendNotice(g, outOfBandNote) {
  return outOfBandNote === null ? g : `${g}. ${outOfBandNote}`;
}
//@ chunk-cpqpnzp4.js:42166-42170 sole-consumer
init_react_production();
//@ chunk-cpqpnzp4.js:42170-43157 sole-consumer
/**
 * 从宿主读取 MCP 状态与认证结果的宽容解析结构。
 */
var MCP_STATUS_SCHEMA = DoctorLazy(() => {
  let optionalBool = M().optional().catch(undefined);
  let i = u({
    name: string(),
    annotations: u({
      readOnly: optionalBool,
      destructive: optionalBool,
      openWorld: optionalBool,
    })
      .optional()
      .catch(undefined),
  });
  let a = u({
    name: string(),
    status: string().catch("unknown"),
    config: u({
      type: string().optional().catch(undefined),
      url: string().optional().catch(undefined),
    })
      .optional()
      .catch(undefined),
    transport: string().optional().catch(undefined),
    sessionProxied: M().optional().catch(undefined),
    cloudServiceProvided: M().optional().catch(undefined),
    urlHost: string().optional().catch(undefined),
    scope: string().optional().catch(undefined),
    source: string().optional().catch(undefined),
    tools: array(i.nullable().catch(null)).optional().catch(undefined),
    error: string().optional().catch(undefined),
    error_code: string().optional().catch(undefined),
  });
  return u({
    mcpServers: array(a.nullable().catch(null)),
  });
});
var MCP_AUTH_RESULT_SCHEMA = DoctorLazy(() =>
  u({
    authUrl: string().optional().catch(undefined),
    requiresUserAction: M().optional().catch(undefined),
    callbackExpected: M().optional().catch(undefined),
    redirectScheme: string().optional().catch(undefined),
    callbackPort: E().optional().catch(undefined),
    state: string().optional().catch(undefined),
  }),
);
//@ chunk-cpqpnzp4.js:43157-43258 sole-consumer
function toServerOption(Y) {
  return {
    value: Y.wireName,
    label: Y.name,
    description: rowDescription(Y),
    dimDescription: true,
  };
}
//@ chunk-cpqpnzp4.js:43258-43287 sole-consumer
function notFalse(Y) {
  return Y !== false;
}
//@ chunk-cpqpnzp4.js:43287-43482 sole-consumer
function toToolOption(K, L) {
  return {
    value: String(L),
    label: K.name,
    description:
      [K.readOnly && "read-only", K.destructive && "destructive", K.openWorld && "open-world"]
        .filter(notFalse)
        .join(", ") || undefined,
    dimDescription: true,
  };
}
//@ chunk-cpqpnzp4.js:43482-43520 sole-consumer = _temp (1)
function selectMcpClients(s) {
  return s.mcp.clients;
}
//@ chunk-cpqpnzp4.js:43520-43557 sole-consumer = _temp2 (1)
function isNonIdeClient_2(c) {
  return c.name !== "ide";
}
//@ chunk-cpqpnzp4.js:43557-43605 sole-consumer
function needsApproval(x) {
  return connectionTypeOf(x) === "needs-approval";
}
//@ chunk-cpqpnzp4.js:43605-43652 affinity
function isFulfilled(Ne) {
  return Ne.status === "fulfilled";
}
//@ chunk-cpqpnzp4.js:43652-45152 fingerprint = MCPToggle (0.724)
function MCPToggle(props) {
  let $ = w(8);
  let { action, target, onComplete } = props;
  let mcpClients = useAppState(selectMcpClients);
  let toggleMcpServer = useMcpToggleEnabled();
  let appStateSession = useAppStateSession();
  let didRun = R(false);
  let N;
  let _;
  if (
    $[0] !== action ||
    $[1] !== appStateSession ||
    $[2] !== mcpClients ||
    $[3] !== onComplete ||
    $[4] !== target ||
    $[5] !== toggleMcpServer
  ) {
    N = () => {
      if (didRun.current) {
        return;
      }
      didRun.current = true;
      let h = action === "enable";
      let clients = mcpClients.filter(isNonIdeClient_2);
      let Y = target === "all" ? clients : clients.filter((c_0) => c_0.name === target);
      let filtered = Y.filter(
        (c_1) =>
          connectionTypeOf(c_1) !== "needs-approval" &&
          (h ? c_1.type === "disabled" : c_1.type !== "disabled"),
      );
      let isDisabledHandle = getIsDisabledHandle();
      let X = target === "all" && isDisabledHandle ? describeDisabledServers(Y, h, isDisabledHandle) : null;
      if (filtered.length === 0) {
        let z = target !== "all" && Y.length > 0 && isDisabledHandle ? isDisabledHandle(target) : undefined;
        onComplete(
          target === "all"
            ? (X ?? `All MCP servers are already ${h ? "enabled" : "disabled"}`)
            : Y.length === 0
              ? `MCP server "${normalizeServerNameShort(target)}" not found`
              : Y.some(needsApproval)
                ? `MCP server "${normalizeServerNameShort(target)}" is pending approval \u2014 approve it via /mcp first`
                : h && z === true
                  ? Y.some(isConnectedOrCached)
                    ? disabledInOtherSessionText(target)
                    : disabledElsewhereText(target)
                  : !h && z === false
                    ? reenabledElsewhereText(target)
                    : `MCP server "${normalizeServerNameShort(target)}" is already ${h ? "enabled" : "disabled"}`,
        );
        return;
      }
      if (target !== "all") {
        Promise.all(filtered.map((J) => toggleMcpServer(J.name)))
          .then(
            () =>
              onComplete(`MCP server "${normalizeServerNameShort(target)}" ${h ? "enabled" : "disabled"}`),
            (error) =>
              onComplete(
                formatMcpOperationFailure(error, target, action, {
                  config: filtered[0]?.config,
                  persistsOffBox: isBridgeOrTransport(appStateSession),
                }),
              ),
          )
          .catch(logError);
        return;
      }
      Promise.allSettled(filtered.map((le) => toggleMcpServer(le.name)))
        .then((ke) => {
          ke.forEach((pe, Pe) => {
            if (pe.status === "rejected") {
              let xe = filtered[Pe];
              logError(
                xe
                  ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                      redactMcpErrorDetail(xe.name, xe.config, errorMessage(pe.reason)),
                      "mcp toggle rejected",
                    )
                  : pe.reason,
              );
            }
          });
          let te = count(ke, isFulfilled);
          let Ie = ke.length - te;
          onComplete(
            `${h ? "Enabled" : "Disabled"} ${te} MCP server(s)` +
              (Ie > 0 ? ` (${Ie} couldn't be changed \u2014 run /mcp to check)` : "") +
              (X !== null ? `. ${X}` : ""),
          );
        })
        .catch(logError);
    };
    _ = [action, target, mcpClients, toggleMcpServer, onComplete, appStateSession];
    $[0] = action;
    $[1] = appStateSession;
    $[2] = mcpClients;
    $[3] = onComplete;
    $[4] = target;
    $[5] = toggleMcpServer;
    $[6] = N;
    $[7] = _;
  } else {
    N = $[6];
    _ = $[7];
  }
  P(N, _);
  return null;
}
//@ chunk-cpqpnzp4.js:45152-45659 layout
/**
 * 后台会话没有终端附着时无法打开 MCP 设置的提示文字。
 */
var NO_TERMINAL_MCP_HINT = "open this session to manage MCP servers";
var NO_TERMINAL_MCP_NOTICE =
  "Can't open MCP settings while no terminal is attached to this background session. Attach to it and run /mcp again, or use `/mcp enable|disable|reconnect <server>` to steer without the panel.";
var NO_TERMINAL_MCP_NEEDS_INPUT_NOTICE =
  'Can\'t open MCP settings while no terminal is attached to this background session. This session now shows "needs input" in agent view \u2014 open it and run /mcp to manage servers, or use `/mcp enable|disable|reconnect <server>` to steer without the panel.';
//@ chunk-cpqpnzp4.js:45659-45784 layout
async function requestMcpSettingsFromHost(onDone, context) {
  let a = await parkCommandForAttacher(
    context.session.host,
    NO_TERMINAL_MCP_HINT,
    "MCP settings requested",
    context.storageV5,
  );
  onDone(a ? NO_TERMINAL_MCP_NEEDS_INPUT_NOTICE : NO_TERMINAL_MCP_NOTICE, {
    display: "system",
  });
}
//@ chunk-cpqpnzp4.js:45784-45845 layout
function sanitizeOnComplete(onDone) {
  return (i, a) => onDone(typeof i === "string" ? sanitizeTelemetryString(i) : i, a);
}
//@ chunk-cpqpnzp4.js:45845-46284 fingerprint = call (0.769)
/**
 * /mcp 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(onDone, context, args) {
  if (args) {
    let match = /^(\S+)\s*(.*)$/.exec(args.trim());
    let v = match?.[1] ?? "";
    let m = match?.[2] ?? "";
    if (v === "no-redirect") {
      if (isUnattendedBgSession()) {
        await requestMcpSettingsFromHost(onDone, context);
        return null;
      }
      return jsxProd_default(MCPSettings, {
        onComplete: sanitizeOnComplete(onDone),
      });
    }
    if (v === "reconnect" && m)
      return m === "all"
        ? jsxProd_default(ReconnectAllMcp, {
            onComplete: sanitizeOnComplete(onDone),
          })
        : jsxProd_default(MCPReconnect, {
            serverName: m,
            onComplete: sanitizeOnComplete(onDone),
          });
    if (v === "enable" || v === "disable")
      return jsxProd_default(MCPToggle, {
        action: v,
        target: m || "all",
        onComplete: sanitizeOnComplete(onDone),
      });
  }
  if (isUnattendedBgSession()) {
    await requestMcpSettingsFromHost(onDone, context);
    return null;
  }
  return jsxProd_default(MCPSettings, {
    onComplete: sanitizeOnComplete(onDone),
  });
}
//@ chunk-5bdzenzx.js:16499-16538 fingerprint = _temp2 (1)
function isIdeClient(c) {
  return c.name === "ide";
}
export { isIdeClient };
