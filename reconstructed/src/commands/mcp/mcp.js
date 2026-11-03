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
import { j, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Cr, useAppState, useAppStateSession } from "../../state/AppState.js";
import {
  useMcpReconnect,
  Tan,
  reconnectAllServers,
  useMcpToggleEnabled,
} from "../../services/mcp/MCPConnectionManager.js";
import { hAe } from "../../services/mcp/reconnectHandles.js";
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
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { M, u, o, A, E } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  connectionTypeOf,
  describeDisabledServers,
  disabledInOtherSessionText,
  disabledElsewhereText,
  reenabledElsewhereText,
} from "../../services/mcp/mcpToggleMessages.js";
import { uo } from "../../services/api/deferredToolsState.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { formatMcpOperationFailure } from "../../components/mcp/utils/reconnectHelpers.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { count } from "../../utils/collections.js";
import { parkCommandForAttacher } from "../../services/mcp/mcpReconnectPark.js";
import { MCPSettings } from "../../components/mcp/MCPSettings.js";
import { MCPReconnect } from "../../components/mcp/MCPReconnect.js";

//@ chunk-cpqpnzp4.js:17987-17991 placement
j();
//@ chunk-cpqpnzp4.js:17991-17995 placement
j();
//@ chunk-cpqpnzp4.js:17995-17999 placement
j();
//@ chunk-cpqpnzp4.js:37993-37997 placement
j();
//@ chunk-cpqpnzp4.js:40831-40835 sole-consumer
j();
//@ chunk-cpqpnzp4.js:40835-40874 sole-consumer = _temp2 (1)
function Ts(c) {
  return c.name !== "ide";
}
//@ chunk-cpqpnzp4.js:40874-40897 sole-consumer
function As() {
  return !1;
}
/**
 * /mcp reconnect all 的界面组件：挂载时一次性重连全部需要重连的 MCP 服务器，结束后通过 onComplete 报告成功个数与仍未连接的数量。
 */
//@ chunk-cpqpnzp4.js:40897-42118 sole-consumer
function ReconnectAllMcp(props) {
  let v = w(11),
    { onComplete: onComplete } = props,
    a = Cr(),
    c = useMcpReconnect(),
    m;
  if (v[0] !== a) ((m = () => Tan(a.getState().mcp.clients.filter(Ts), hAe() ?? As)), (v[0] = a), (v[1] = m));
  else m = v[1];
  let [k] = y(m),
    f = R(!1),
    b,
    N;
  if (v[2] !== k || v[3] !== onComplete || v[4] !== c)
    ((b = () => {
      if (f.current) {
        return;
      }
      f.current = !0;
      let { targets: targets, outOfBandNote: outOfBandNote } = k;
      if (targets.length === 0) {
        onComplete(An("No MCP servers need reconnecting", outOfBandNote));
        return;
      }
      reconnectAllServers(targets, c)
        .then((U) => {
          let { results: results, connected: connected } = U;
          results.forEach((K, L) => {
            let T = targets[L];
            if (K.status === "rejected" && T)
              logForDebugging(
                `mcp reconnect all: ${sanitizeTelemetryString(T.name)} not reconnected: ${redactMcpErrorDetail(T.name, T.config, errorMessage(K.reason))}`,
                { level: "error" },
              );
          });
          let X = targets.length - connected;
          let z = `Reconnected ${connected} of ${targets.length} MCP ${plural(targets.length, "server")}`;
          let J = isUnattendedBgSession()
            ? "attach to this session and run /mcp to check"
            : "run /mcp to check";
          onComplete(An(X === 0 ? z : `${z} (${X} still not connected \u2014 ${J})`, outOfBandNote));
        })
        .catch(logError);
    }),
      (N = [k, c, onComplete]),
      (v[2] = k),
      (v[3] = onComplete),
      (v[4] = c),
      (v[5] = b),
      (v[6] = N));
  else ((b = v[5]), (N = v[6]));
  if ((P(b, N), k.targets.length === 0)) {
    return null;
  }
  const U = k.targets.length;
  let me;
  if (v[7] !== k.targets.length)
    ((me = plural(k.targets.length, "server")), (v[7] = k.targets.length), (v[8] = me));
  else me = v[8];
  const le = `Reconnecting ${U} MCP ${me}`;
  let ke;
  if (v[9] !== le)
    ((ke = e(Box, { flexDirection: "column", padding: 1, children: e(WorkerBadge, { message: le }) })),
      (v[9] = le),
      (v[10] = ke));
  else ke = v[10];
  return ke;
}
//@ chunk-cpqpnzp4.js:42118-42166 sole-consumer
function An(g, i) {
  return i === null ? g : `${g}. ${i}`;
}
//@ chunk-cpqpnzp4.js:42166-42170 sole-consumer
j();
/**
 * 从宿主读取 MCP 状态与认证结果的宽容解析结构。
 */
//@ chunk-cpqpnzp4.js:42170-43157 sole-consumer
var MCP_STATUS_SCHEMA = DoctorLazy(() => {
    let optionalBool = M()
        .optional()
        .catch(void 0),
      i = u({
        name: o(),
        annotations: u({ readOnly: optionalBool, destructive: optionalBool, openWorld: optionalBool })
          .optional()
          .catch(void 0),
      }),
      a = u({
        name: o(),
        status: o().catch("unknown"),
        config: u({
          type: o()
            .optional()
            .catch(void 0),
          url: o()
            .optional()
            .catch(void 0),
        })
          .optional()
          .catch(void 0),
        transport: o()
          .optional()
          .catch(void 0),
        sessionProxied: M()
          .optional()
          .catch(void 0),
        cloudServiceProvided: M()
          .optional()
          .catch(void 0),
        urlHost: o()
          .optional()
          .catch(void 0),
        scope: o()
          .optional()
          .catch(void 0),
        source: o()
          .optional()
          .catch(void 0),
        tools: A(i.nullable().catch(null))
          .optional()
          .catch(void 0),
        error: o()
          .optional()
          .catch(void 0),
        error_code: o()
          .optional()
          .catch(void 0),
      });
    return u({ mcpServers: A(a.nullable().catch(null)) });
  }),
  MCP_AUTH_RESULT_SCHEMA = DoctorLazy(() =>
    u({
      authUrl: o()
        .optional()
        .catch(void 0),
      requiresUserAction: M()
        .optional()
        .catch(void 0),
      callbackExpected: M()
        .optional()
        .catch(void 0),
      redirectScheme: o()
        .optional()
        .catch(void 0),
      callbackPort: E()
        .optional()
        .catch(void 0),
      state: o()
        .optional()
        .catch(void 0),
    }),
  );
//@ chunk-cpqpnzp4.js:43157-43258 sole-consumer
function toServerOption(Y) {
  return { value: Y.wireName, label: Y.name, description: rowDescription(Y), dimDescription: !0 };
}
//@ chunk-cpqpnzp4.js:43258-43287 sole-consumer
function nd(Y) {
  return Y !== !1;
}
//@ chunk-cpqpnzp4.js:43287-43482 sole-consumer
function toToolOption(K, L) {
  return {
    value: String(L),
    label: K.name,
    description:
      [K.readOnly && "read-only", K.destructive && "destructive", K.openWorld && "open-world"]
        .filter(nd)
        .join(", ") || void 0,
    dimDescription: !0,
  };
}
//@ chunk-cpqpnzp4.js:43482-43520 sole-consumer = _temp (1)
function qs(s) {
  return s.mcp.clients;
}
//@ chunk-cpqpnzp4.js:43520-43557 sole-consumer = _temp2 (1)
function Gs(c) {
  return c.name !== "ide";
}
//@ chunk-cpqpnzp4.js:43557-43605 sole-consumer
function Ws(x) {
  return connectionTypeOf(x) === "needs-approval";
}
//@ chunk-cpqpnzp4.js:43605-43652 affinity
function Ys(Ne) {
  return Ne.status === "fulfilled";
}
//@ chunk-cpqpnzp4.js:43652-45152 fingerprint = MCPToggle (0.724)
function MCPToggle(t0) {
  let b = w(8),
    { action: action, target: target, onComplete: onComplete } = t0,
    mcpClients = useAppState(qs),
    toggleMcpServer = useMcpToggleEnabled(),
    k = useAppStateSession(),
    didRun = R(!1),
    N,
    _;
  if (
    b[0] !== action ||
    b[1] !== k ||
    b[2] !== mcpClients ||
    b[3] !== onComplete ||
    b[4] !== target ||
    b[5] !== toggleMcpServer
  )
    ((N = () => {
      if (didRun.current) {
        return;
      }
      didRun.current = !0;
      let h = action === "enable";
      let clients = mcpClients.filter(Gs);
      let Y = target === "all" ? clients : clients.filter((c_0) => c_0.name === target);
      let filtered = Y.filter(
        (c_1) =>
          connectionTypeOf(c_1) !== "needs-approval" &&
          (h ? c_1.type === "disabled" : c_1.type !== "disabled"),
      );
      let T = hAe();
      let X = target === "all" && T ? describeDisabledServers(Y, h, T) : null;
      if (filtered.length === 0) {
        let z = target !== "all" && Y.length > 0 && T ? T(target) : void 0;
        onComplete(
          target === "all"
            ? (X ?? `All MCP servers are already ${h ? "enabled" : "disabled"}`)
            : Y.length === 0
              ? `MCP server "${uo(target)}" not found`
              : Y.some(Ws)
                ? `MCP server "${uo(target)}" is pending approval \u2014 approve it via /mcp first`
                : h && z === !0
                  ? Y.some(isConnectedOrCached)
                    ? disabledInOtherSessionText(target)
                    : disabledElsewhereText(target)
                  : !h && z === !1
                    ? reenabledElsewhereText(target)
                    : `MCP server "${uo(target)}" is already ${h ? "enabled" : "disabled"}`,
        );
        return;
      }
      if (target !== "all") {
        Promise.all(filtered.map((J) => toggleMcpServer(J.name)))
          .then(
            () => onComplete(`MCP server "${uo(target)}" ${h ? "enabled" : "disabled"}`),
            (me) =>
              onComplete(
                formatMcpOperationFailure(me, target, action, {
                  config: filtered[0]?.config,
                  persistsOffBox: isBridgeOrTransport(k),
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
          let te = count(ke, Ys);
          let Ie = ke.length - te;
          onComplete(
            `${h ? "Enabled" : "Disabled"} ${te} MCP server(s)` +
              (Ie > 0 ? ` (${Ie} couldn't be changed \u2014 run /mcp to check)` : "") +
              (X !== null ? `. ${X}` : ""),
          );
        })
        .catch(logError);
    }),
      (_ = [action, target, mcpClients, toggleMcpServer, onComplete, k]),
      (b[0] = action),
      (b[1] = k),
      (b[2] = mcpClients),
      (b[3] = onComplete),
      (b[4] = target),
      (b[5] = toggleMcpServer),
      (b[6] = N),
      (b[7] = _));
  else ((N = b[6]), (_ = b[7]));
  return (P(N, _), null);
}
/**
 * 后台会话没有终端附着时无法打开 MCP 设置的提示文字。
 */
//@ chunk-cpqpnzp4.js:45152-45659 layout
var NO_TERMINAL_MCP_HINT = "open this session to manage MCP servers",
  NO_TERMINAL_MCP_NOTICE =
    "Can't open MCP settings while no terminal is attached to this background session. Attach to it and run /mcp again, or use `/mcp enable|disable|reconnect <server>` to steer without the panel.",
  NO_TERMINAL_MCP_NEEDS_INPUT_NOTICE =
    'Can\'t open MCP settings while no terminal is attached to this background session. This session now shows "needs input" in agent view \u2014 open it and run /mcp to manage servers, or use `/mcp enable|disable|reconnect <server>` to steer without the panel.';
//@ chunk-cpqpnzp4.js:45659-45784 layout
async function requestMcpSettingsFromHost(g, i) {
  let a = await parkCommandForAttacher(
    i.session.host,
    NO_TERMINAL_MCP_HINT,
    "MCP settings requested",
    i.storageV5,
  );
  g(a ? NO_TERMINAL_MCP_NEEDS_INPUT_NOTICE : NO_TERMINAL_MCP_NOTICE, { display: "system" });
}
//@ chunk-cpqpnzp4.js:45784-45845 layout
function sn(g) {
  return (i, a) => g(typeof i === "string" ? sanitizeTelemetryString(i) : i, a);
}
/**
 * /mcp 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-cpqpnzp4.js:45845-46284 fingerprint = call (0.769)
async function call(onDone, context, args) {
  if (args) {
    let match = /^(\S+)\s*(.*)$/.exec(args.trim()),
      v = match?.[1] ?? "",
      m = match?.[2] ?? "";
    if (v === "no-redirect") {
      if (isUnattendedBgSession()) return (await requestMcpSettingsFromHost(onDone, context), null);
      return e(MCPSettings, { onComplete: sn(onDone) });
    }
    if (v === "reconnect" && m)
      return m === "all"
        ? e(ReconnectAllMcp, { onComplete: sn(onDone) })
        : e(MCPReconnect, { serverName: m, onComplete: sn(onDone) });
    if (v === "enable" || v === "disable")
      return e(MCPToggle, { action: v, target: m || "all", onComplete: sn(onDone) });
  }
  if (isUnattendedBgSession()) return (await requestMcpSettingsFromHost(onDone, context), null);
  return e(MCPSettings, { onComplete: sn(onDone) });
}
//@ chunk-5bdzenzx.js:16499-16538 fingerprint = _temp2 (1)
function Oo(c) {
  return c.name === "ide";
}

export { Oo };
