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
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import {
  booleanSchema,
  objectSchema,
  stringSchema,
  array,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5bdzenzx.js:16499-16538 fingerprint (2.1.88 match: _temp2, 1)
function isIdeClient(c) {
  return c.name === "ide";
}
//@ chunk-cpqpnzp4.js:17987-17991 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-cpqpnzp4.js:17987", () => {
  init_react_production();
});
//@ chunk-cpqpnzp4.js:17991-17995 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-cpqpnzp4.js:17991", () => {
  init_react_production();
});
//@ chunk-cpqpnzp4.js:17995-17999 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-cpqpnzp4.js:17995", () => {
  init_react_production();
});
//@ chunk-cpqpnzp4.js:37993-37997 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-cpqpnzp4.js:37993", () => {
  init_react_production();
});
//@ chunk-cpqpnzp4.js:40831-40835 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-cpqpnzp4.js:40831", () => {
  init_react_production();
});
//@ chunk-cpqpnzp4.js:40835-40874 sole-consumer (2.1.88 match: _temp2, 1)
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
  let $ = useMemoCache(11);
  let { onComplete } = props;
  let appStoreDirect = useAppStoreDirect();
  let reconnect = useMcpReconnect();
  let computePlan;
  if ($[0] !== appStoreDirect) {
    computePlan = () =>
      reconnectTargets(
        appStoreDirect.getState().mcp.clients.filter(isNonIdeClient),
        getIsDisabledHandle() ?? noAutoReconnect,
      );
    $[0] = appStoreDirect;
    $[1] = computePlan;
  } else computePlan = $[1];
  let [plan] = useState(computePlan);
  let startedRef = useRef(false);
  let runReconnect;
  let runDeps;
  if ($[2] !== plan || $[3] !== onComplete || $[4] !== reconnect) {
    runReconnect = () => {
      if (startedRef.current) {
        return;
      }
      startedRef.current = true;
      let { targets, outOfBandNote } = plan;
      if (targets.length === 0) {
        onComplete(appendNotice("No MCP servers need reconnecting", outOfBandNote));
        return;
      }
      reconnectAllServers(targets, reconnect)
        .then((outcome) => {
          let { results, connected } = outcome;
          results.forEach((result, index) => {
            let target = targets[index];
            if (result.status === "rejected" && target)
              logForDebugging(
                `mcp reconnect all: ${sanitizeTelemetryString(target.name)} not reconnected: ${redactMcpErrorDetail(target.name, target.config, errorMessage(result.reason))}`,
                {
                  level: "error",
                },
              );
          });
          let failedCount = targets.length - connected;
          let summary = `Reconnected ${connected} of ${targets.length} MCP ${plural(targets.length, "server")}`;
          let hint = isUnattendedBgSession()
            ? "attach to this session and run /mcp to check"
            : "run /mcp to check";
          onComplete(
            appendNotice(
              failedCount === 0 ? summary : `${summary} (${failedCount} still not connected \u2014 ${hint})`,
              outOfBandNote,
            ),
          );
        })
        .catch(logError);
    };
    runDeps = [plan, reconnect, onComplete];
    $[2] = plan;
    $[3] = onComplete;
    $[4] = reconnect;
    $[5] = runReconnect;
    $[6] = runDeps;
  } else {
    runReconnect = $[5];
    runDeps = $[6];
  }
  useEffect(runReconnect, runDeps);
  if (plan.targets.length === 0) {
    return null;
  }
  const targetCount = plan.targets.length;
  let serverLabel;
  if ($[7] !== plan.targets.length) {
    serverLabel = plural(plan.targets.length, "server");
    $[7] = plan.targets.length;
    $[8] = serverLabel;
  } else serverLabel = $[8];
  const message = `Reconnecting ${targetCount} MCP ${serverLabel}`;
  let messageBox;
  if ($[9] !== message) {
    messageBox = jsxProd_default(Box, {
      flexDirection: "column",
      padding: 1,
      children: jsxProd_default(WorkerBadge, {
        message,
      }),
    });
    $[9] = message;
    $[10] = messageBox;
  } else messageBox = $[10];
  return messageBox;
}
//@ chunk-cpqpnzp4.js:42118-42166 sole-consumer
function appendNotice(parts, outOfBandNote) {
  return outOfBandNote === null ? parts : `${parts}. ${outOfBandNote}`;
}
//@ chunk-cpqpnzp4.js:42166-42170 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-cpqpnzp4.js:42166", () => {
  init_react_production();
});
//@ chunk-cpqpnzp4.js:42170-43157 sole-consumer
/**
 * 从宿主读取 MCP 状态与认证结果的宽容解析结构。
 */
var MCP_STATUS_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MCP_AUTH_RESULT_SCHEMA;
deferInit("chunk-cpqpnzp4.js:42170", () => {
  MCP_STATUS_SCHEMA = DoctorLazy(() => {
    let optionalBool = booleanSchema().optional().catch(undefined);
    let toolSchema = objectSchema({
      name: stringSchema(),
      annotations: objectSchema({
        readOnly: optionalBool,
        destructive: optionalBool,
        openWorld: optionalBool,
      })
        .optional()
        .catch(undefined),
    });
    let schema = objectSchema({
      name: stringSchema(),
      status: stringSchema().catch("unknown"),
      config: objectSchema({
        type: stringSchema().optional().catch(undefined),
        url: stringSchema().optional().catch(undefined),
      })
        .optional()
        .catch(undefined),
      transport: stringSchema().optional().catch(undefined),
      sessionProxied: booleanSchema().optional().catch(undefined),
      cloudServiceProvided: booleanSchema().optional().catch(undefined),
      urlHost: stringSchema().optional().catch(undefined),
      scope: stringSchema().optional().catch(undefined),
      source: stringSchema().optional().catch(undefined),
      tools: array(toolSchema.nullable().catch(null)).optional().catch(undefined),
      error: stringSchema().optional().catch(undefined),
      error_code: stringSchema().optional().catch(undefined),
    });
    return objectSchema({
      mcpServers: array(schema.nullable().catch(null)),
    });
  });
  MCP_AUTH_RESULT_SCHEMA = DoctorLazy(() =>
    objectSchema({
      authUrl: stringSchema().optional().catch(undefined),
      requiresUserAction: booleanSchema().optional().catch(undefined),
      callbackExpected: booleanSchema().optional().catch(undefined),
      redirectScheme: stringSchema().optional().catch(undefined),
      callbackPort: numberSchema().optional().catch(undefined),
      state: stringSchema().optional().catch(undefined),
    }),
  );
});
//@ chunk-cpqpnzp4.js:43157-43258 sole-consumer
function toServerOption(server) {
  return {
    value: server.wireName,
    label: server.name,
    description: rowDescription(server),
    dimDescription: true,
  };
}
//@ chunk-cpqpnzp4.js:43258-43287 sole-consumer
function notFalse(value) {
  return value !== false;
}
//@ chunk-cpqpnzp4.js:43287-43482 sole-consumer
function toToolOption(server, tool) {
  return {
    value: String(tool),
    label: server.name,
    description:
      [server.readOnly && "read-only", server.destructive && "destructive", server.openWorld && "open-world"]
        .filter(notFalse)
        .join(", ") || undefined,
    dimDescription: true,
  };
}
//@ chunk-cpqpnzp4.js:43482-43520 sole-consumer (2.1.88 match: _temp, 1)
function selectMcpClients(s) {
  return s.mcp.clients;
}
//@ chunk-cpqpnzp4.js:43520-43557 sole-consumer (2.1.88 match: _temp2, 1)
function isNonIdeClient_2(c) {
  return c.name !== "ide";
}
//@ chunk-cpqpnzp4.js:43557-43605 sole-consumer
function needsApproval(tool) {
  return connectionTypeOf(tool) === "needs-approval";
}
//@ chunk-cpqpnzp4.js:43605-43652 affinity
function isFulfilled(result) {
  return result.status === "fulfilled";
}
//@ chunk-cpqpnzp4.js:43652-45152 fingerprint (2.1.88 match: MCPToggle, 0.724)
function MCPToggle(props) {
  let $ = useMemoCache(8);
  let { action, target, onComplete } = props;
  let mcpClients = useAppState(selectMcpClients);
  let toggleMcpServer = useMcpToggleEnabled();
  let appStateSession = useAppStateSession();
  let didRun = useRef(false);
  let runToggle;
  let runDeps;
  if (
    $[0] !== action ||
    $[1] !== appStateSession ||
    $[2] !== mcpClients ||
    $[3] !== onComplete ||
    $[4] !== target ||
    $[5] !== toggleMcpServer
  ) {
    runToggle = () => {
      if (didRun.current) {
        return;
      }
      didRun.current = true;
      let enabling = action === "enable";
      let clients = mcpClients.filter(isNonIdeClient_2);
      let targets = target === "all" ? clients : clients.filter((c_0) => c_0.name === target);
      let filtered = targets.filter(
        (c_1) =>
          connectionTypeOf(c_1) !== "needs-approval" &&
          (enabling ? c_1.type === "disabled" : c_1.type !== "disabled"),
      );
      let isDisabledHandle = getIsDisabledHandle();
      let disabledNotice =
        target === "all" && isDisabledHandle
          ? describeDisabledServers(targets, enabling, isDisabledHandle)
          : null;
      if (filtered.length === 0) {
        let disabledState =
          target !== "all" && targets.length > 0 && isDisabledHandle ? isDisabledHandle(target) : undefined;
        onComplete(
          target === "all"
            ? (disabledNotice ?? `All MCP servers are already ${enabling ? "enabled" : "disabled"}`)
            : targets.length === 0
              ? `MCP server "${normalizeServerNameShort(target)}" not found`
              : targets.some(needsApproval)
                ? `MCP server "${normalizeServerNameShort(target)}" is pending approval \u2014 approve it via /mcp first`
                : enabling && disabledState === true
                  ? targets.some(isConnectedOrCached)
                    ? disabledInOtherSessionText(target)
                    : disabledElsewhereText(target)
                  : !enabling && disabledState === false
                    ? reenabledElsewhereText(target)
                    : `MCP server "${normalizeServerNameShort(target)}" is already ${enabling ? "enabled" : "disabled"}`,
        );
        return;
      }
      if (target !== "all") {
        Promise.all(filtered.map((client) => toggleMcpServer(client.name)))
          .then(
            () =>
              onComplete(
                `MCP server "${normalizeServerNameShort(target)}" ${enabling ? "enabled" : "disabled"}`,
              ),
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
      Promise.allSettled(filtered.map((client) => toggleMcpServer(client.name)))
        .then((settled) => {
          settled.forEach((result, index) => {
            if (result.status === "rejected") {
              let client = filtered[index];
              logError(
                client
                  ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                      redactMcpErrorDetail(client.name, client.config, errorMessage(result.reason)),
                      "mcp toggle rejected",
                    )
                  : result.reason,
              );
            }
          });
          let fulfilledCount = count(settled, isFulfilled);
          let failedCount = settled.length - fulfilledCount;
          onComplete(
            `${enabling ? "Enabled" : "Disabled"} ${fulfilledCount} MCP server(s)` +
              (failedCount > 0 ? ` (${failedCount} couldn't be changed \u2014 run /mcp to check)` : "") +
              (disabledNotice !== null ? `. ${disabledNotice}` : ""),
          );
        })
        .catch(logError);
    };
    runDeps = [action, target, mcpClients, toggleMcpServer, onComplete, appStateSession];
    $[0] = action;
    $[1] = appStateSession;
    $[2] = mcpClients;
    $[3] = onComplete;
    $[4] = target;
    $[5] = toggleMcpServer;
    $[6] = runToggle;
    $[7] = runDeps;
  } else {
    runToggle = $[6];
    runDeps = $[7];
  }
  useEffect(runToggle, runDeps);
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
  let parked = await parkCommandForAttacher(
    context.session.host,
    NO_TERMINAL_MCP_HINT,
    "MCP settings requested",
    context.storageV5,
  );
  onDone(parked ? NO_TERMINAL_MCP_NEEDS_INPUT_NOTICE : NO_TERMINAL_MCP_NOTICE, {
    display: "system",
  });
}
//@ chunk-cpqpnzp4.js:45784-45845 layout
function sanitizeOnComplete(onDone) {
  return (name, value) => onDone(typeof name === "string" ? sanitizeTelemetryString(name) : name, value);
}
//@ chunk-cpqpnzp4.js:45845-46284 fingerprint (2.1.88 match: call, 0.769)
/**
 * /mcp 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(onDone, context, args) {
  if (args) {
    let match = /^(\S+)\s*(.*)$/.exec(args.trim());
    let left = match?.[1] ?? "";
    let right = match?.[2] ?? "";
    if (left === "no-redirect") {
      if (isUnattendedBgSession()) {
        await requestMcpSettingsFromHost(onDone, context);
        return null;
      }
      return jsxProd_default(MCPSettings, {
        onComplete: sanitizeOnComplete(onDone),
      });
    }
    if (left === "reconnect" && right)
      return right === "all"
        ? jsxProd_default(ReconnectAllMcp, {
            onComplete: sanitizeOnComplete(onDone),
          })
        : jsxProd_default(MCPReconnect, {
            serverName: right,
            onComplete: sanitizeOnComplete(onDone),
          });
    if (left === "enable" || left === "disable")
      return jsxProd_default(MCPToggle, {
        action: left,
        target: right || "all",
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
export { isIdeClient, call };
