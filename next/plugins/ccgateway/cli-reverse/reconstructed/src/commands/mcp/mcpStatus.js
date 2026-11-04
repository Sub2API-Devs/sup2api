/**
 * commands/mcp/mcpStatus.ts
 *
 * 2.1.316 新增：/mcp 状态输出：列出服务器连接状态与错误。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3re05e6m.js (15)
 * attribution: placement 15
 */
import { mcpInfoFromString, getMcpPrefix } from "../../services/mcp/mcpStringUtils.js";
import { isArtifacts404Failure, isUnconfiguredFailure } from "../../services/mcp/redactMcpErrors.js";
import { COMMON_INFO_ARGS_ALIAS, COMMON_HELP_ARGS } from "../../constants/xml.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { ToolHostRegistry } from "../../remote/tools/toolHostRegistry.js";
import { refreshRemoteToolTargets, remoteToolsContext } from "../../remote/tools/sessionEventTransport.js";
import { sleep } from "../../utils/sleep.js";
import { isVsCodeTopSession } from "../../utils/sessionShape.js";
import { count, uniq } from "../../utils/collections.js";
import {
  isMcpConnectivityIssue,
  isUnhiddenFailedServer,
} from "../../hooks/notifs/useMcpConnectivityStatus.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import {
  getReconnectHandle,
  getToggleHandle,
  getIsDisabledHandle,
} from "../../services/mcp/reconnectHandles.js";
import {
  toggleStateOf,
  connectionTypeOf,
  disabledInOtherSessionText,
  disabledElsewhereText,
  reenabledElsewhereText,
  describeDisabledServers,
} from "../../services/mcp/mcpToggleMessages.js";
import { isArtifactMountMode } from "../../services/artifacts/artifactMount.js";
import { reconnectTargets, reconnectAllServers } from "../../services/mcp/MCPConnectionManager.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { normalizeServerNameShort, normalizeMcpServerName } from "../../services/api/deferredToolsState.js";
import { isSafeCliArg } from "../../utils/worktreeResumeHint.js";
import { plural } from "../../utils/stringUtils.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { redactMcpErrorDetail } from "../../services/mcp/mcpServerOrigin.js";
import { errorMessage, WireSafeControlError } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";

//@ chunk-3re05e6m.js:12321-12871 placement
/**
 * 汇总挂接主机（remote 类型）上透传的 MCP 服务器：按主机+服务器名计数工具，并记录每台主机读不懂的工具数。
 */
function collectAttachedMcpServers(hosts) {
  let byHostServer = new Map();
  let mcpInfoByHost = new Map();
  for (let host of hosts) {
    if (host.kind !== "remote") continue;
    let size = host.rejectedPassthroughTools?.size ?? 0;
    if (size > 0) mcpInfoByHost.set(host.name, size);
    for (let tool of host.passthroughTools?.values() ?? []) {
      let mcpInfo = mcpInfoFromString(tool.localName);
      if (mcpInfo === null) continue;
      let cacheKey = `${host.name}\x00${mcpInfo.serverName}`;
      let existing = byHostServer.get(cacheKey);
      byHostServer.set(
        cacheKey,
        existing === undefined
          ? {
              hostName: host.name,
              hostStatus: hostConnectionStatus(host),
              serverName: mcpInfo.serverName,
              toolCount: 1,
            }
          : {
              ...existing,
              toolCount: existing.toolCount + 1,
            },
      );
    }
  }
  return {
    servers: [...byHostServer.values()].sort(
      (hostName, mcpInfo) =>
        hostName.hostName.localeCompare(mcpInfo.hostName) ||
        hostName.serverName.localeCompare(mcpInfo.serverName),
    ),
    rejectedCounts: mcpInfoByHost,
  };
}
//@ chunk-3re05e6m.js:12871-12958 placement
function hostConnectionStatus(host) {
  if (host.protocol.kind === "incompatible") return "incompatible";
  return host.status;
}
//@ chunk-3re05e6m.js:12958-13268 placement
/**
 * /mcp 状态的连接状态标签、用法说明与等待时长。
 */
var MCP_STATUS_LABELS = {
  connected: "connected",
  cached: "cached (connects on first use)",
  pending: "connecting",
  disabled: "disabled",
  failed: "not connected",
  "needs-auth": "needs authentication",
  "needs-approval": "pending approval",
};
var MCP_USAGE = "Usage: /mcp [reconnect|enable|disable [<server>|all]]. With no server name, applies to all.";
var REMOTE_REFRESH_WAIT_MS = 2500;
//@ chunk-3re05e6m.js:13268-19334 placement
/**
 * /mcp 的非面板（内联）版本：无参数时汇总服务器状态（云会话先刷新远程主机），help 打印用法；reconnect/enable/disable [<server>|all] 执行对应操作并返回结果文字，处理禁用、连接中、待批准、需认证等各种状态。
 */
async function mcpInlineCommand(args, context) {
  let trimmed = args.trim();
  let clients = context
    .getMcp()
    .clients.filter((client) => client.name !== "ide" && !isArtifacts404Failure(client));
  let lower = trimmed.toLowerCase();
  if (!trimmed || COMMON_INFO_ARGS_ALIAS.includes(lower)) {
    let isNonInteractiveSession = getIsNonInteractiveSession();
    if (isNonInteractiveSession && Boolean(env.CLAUDE_CODE_REMOTE) && !isBridgeOrTransport(context.session)) {
      let hostRegistry = context.toolState.get(ToolHostRegistry);
      await Promise.race([
        refreshRemoteToolTargets(remoteToolsContext(context), hostRegistry, "resolve"),
        sleep(REMOTE_REFRESH_WAIT_MS, context.abortController.signal),
      ]);
      if (!isBridgeOrTransport(context.session))
        return textResult(formatCloudMcpStatus(clients, context.getMcp().tools, hostRegistry));
    }
    if (clients.length === 0)
      return textResult(
        `No MCP servers are configured.${vscodeHintOrTerminal(" Add one with `claude mcp add`.", " Open MCP servers from the command menu.")}${
          isVsCodeTopSession()
            ? ""
            : `
${MCP_USAGE}`
        }`,
      );
    let connectedCount = count(clients, (client) => client.type === "connected");
    let cachedCount = count(clients, (client) => client.type === "cached");
    let pendingCount = count(clients, (client) => client.type === "pending");
    let unconfiguredCount = count(clients, isUnconfiguredFailure);
    let connectivityIssueCount = count(clients, isMcpConnectivityIssue);
    let disabledCount = count(clients, (client) => client.type === "disabled");
    let otherCount =
      clients.length - connectedCount - cachedCount - pendingCount - disabledCount - unconfiguredCount;
    return textResult(
      `${clients.length} MCP server(s): ${connectedCount} connected, ` +
        (cachedCount > 0 ? `${cachedCount} cached, ` : "") +
        (pendingCount > 0 ? `${pendingCount} connecting, ` : "") +
        `${otherCount} not connected, ` +
        (unconfiguredCount > 0 ? `${unconfiguredCount} not configured, ` : "") +
        `${disabledCount} disabled.` +
        (connectivityIssueCount > 0 && !isNonInteractiveSession
          ? " Reply `/mcp reconnect all` here to retry."
          : "") +
        (isNonInteractiveSession
          ? vscodeHintOrTerminal(
              " Use `/mcp` in the terminal for details.",
              " Open MCP servers from the command menu.",
            )
          : `${vscodeHintOrTerminal(" Use `/mcp` in the terminal for details.")}
${MCP_USAGE}`),
    );
  }
  if (COMMON_HELP_ARGS.includes(lower)) return textResult(MCP_USAGE);
  let match = /^(\S+)\s*(.*)$/.exec(trimmed);
  let lower_2 = (match?.[1] ?? "").toLowerCase();
  let serverName = match?.[2] || "all";
  if (lower_2 !== "reconnect" && lower_2 !== "enable" && lower_2 !== "disable")
    return textResult(
      `"${redactServerName(lower_2)}" isn't a recognized /mcp action. Try reconnect, enable, or disable.`,
    );
  logEvent("tengu_mcp_command_inline", {
    action: fromEnum(lower_2),
  });
  let targets = serverName === "all" ? clients : clients.filter((client) => client.name === serverName);
  if (targets.length === 0)
    return textResult(
      serverName === "all"
        ? `No MCP servers are configured.${vscodeHintOrTerminal(" Add one with `claude mcp add`.", " Open MCP servers from the command menu.")}`
        : `There's no MCP server named "${redactServerName(serverName)}".${vscodeHintOrTerminal(" Run `/mcp` in the terminal to see configured servers.", " Open MCP servers from the command menu.")}`,
    );
  let reconnect = getReconnectHandle();
  let toggleHandle = getToggleHandle();
  let isDisabledHandle = getIsDisabledHandle();
  if (!reconnect || !toggleHandle || !isDisabledHandle) {
    if (getIsNonInteractiveSession())
      return textResult("Reconnect, enable, and disable aren't available in this session.");
    return textResult(
      "MCP controls aren't available right now \u2014 the terminal is still starting up or is showing another view.",
    );
  }
  if (lower_2 === "reconnect") {
    let singleTarget = serverName !== "all" ? targets[0] : undefined;
    let singleToggleState = singleTarget && toggleStateOf(singleTarget);
    if (singleToggleState === "disabled") {
      if (isArtifactMountMode())
        return textResult(
          `"${redactServerName(serverName)}" is disabled for this project. Run \`/mcp\` in this project, in a terminal where this session runs, to bring it back.`,
        );
      return textResult(
        cliHintOrPlain(
          `"${redactServerName(serverName)}" is disabled.`,
          ` Run \`/mcp enable ${serverName}\` to bring it back.`,
          serverName,
        ),
      );
    }
    if (singleToggleState === "pending")
      return textResult(
        `"${redactServerName(serverName)}" is already reconnecting \u2014 retries can take a few minutes when a server keeps failing.`,
      );
    if (singleToggleState === "needs-approval")
      return textResult(
        `"${redactServerName(serverName)}" is pending approval.${vscodeHintOrTerminal(" Approve it with `/mcp` in the terminal first.", " Open MCP servers from the command menu.")}`,
      );
    let reconnectPlan = serverName === "all" ? reconnectTargets(targets, isDisabledHandle) : null;
    let reconnectList = reconnectPlan ? reconnectPlan.targets : targets;
    let outOfBandNote = reconnectPlan ? reconnectPlan.outOfBandNote : null;
    if (reconnectList.length === 0) {
      let disabledTargetCount = count(targets, (client) => client.type === "disabled");
      let unconfiguredTargetCount = count(
        targets,
        (client) => isUnconfiguredFailure(client) && !isDisabledHandle(client.name),
      );
      if (disabledTargetCount === 0 && outOfBandNote === null && unconfiguredTargetCount > 0)
        return textResult(
          `${unconfiguredTargetCount} MCP server(s) aren't configured yet, so there's nothing to reconnect. The rest are already connected or connecting.`,
        );
      let resultLines = [
        ...(disabledTargetCount > 0
          ? [
              isArtifactMountMode()
                ? `${disabledTargetCount} MCP server(s) are disabled for this project. Run \`/mcp\` in this project, in a terminal where this session runs, to bring them back.`
                : `${disabledTargetCount} MCP server(s) are disabled. Run \`/mcp enable all\` to bring them back.`,
            ]
          : []),
        ...(outOfBandNote !== null ? [outOfBandNote] : []),
        ...(unconfiguredTargetCount > 0
          ? [
              `${unconfiguredTargetCount} MCP server(s) aren't configured yet, so there's nothing to reconnect.`,
            ]
          : []),
      ];
      if (resultLines.length > 0) return textResult(resultLines.join(" "));
      return textResult("All enabled MCP servers are already connected or connecting.");
    }
    let { results, connected } = await reconnectAllServers(reconnectList, reconnect);
    if (serverName !== "all") {
      let singleResult = results[0];
      if (singleResult?.status !== "fulfilled")
        return formatMcpActionFailure("reconnect", serverName, singleResult?.reason, {
          config: reconnectList[0]?.config,
          persistsOffBox: isBridgeOrTransport(context.session),
        });
      let singleResultType = singleResult.value.client.type;
      let hint =
        singleResultType === "needs-auth"
          ? vscodeHintOrTerminal(
              " Authenticate with `/mcp` in the terminal.",
              " Open MCP servers from the command menu.",
            )
          : vscodeHintOrTerminal(
              " Check its config with `/mcp` in the terminal.",
              " Open MCP servers from the command menu.",
            );
      return textResult(
        singleResultType === "connected"
          ? `Reconnected "${redactServerName(serverName)}".`
          : `Couldn't reconnect "${redactServerName(serverName)}" (${MCP_STATUS_LABELS[singleResultType]}).${hint}`,
      );
    }
    return textResult(
      `Reconnected ${connected} of ${reconnectList.length} MCP server(s).` +
        (outOfBandNote !== null ? ` ${outOfBandNote}` : "") +
        vscodeHintOrTerminal(
          " Run `/mcp` in the terminal to see status.",
          " Open MCP servers from the command menu.",
        ),
    );
  }
  let enabling = lower_2 === "enable";
  if (serverName !== "all" && targets.some((client) => connectionTypeOf(client) === "needs-approval"))
    return textResult(
      `"${redactServerName(serverName)}" is pending approval.${vscodeHintOrTerminal(" Approve it with `/mcp` in the terminal first.", " Open MCP servers from the command menu.")}`,
    );
  let filtered = targets.filter((client) =>
    enabling
      ? client.type === "disabled"
      : client.type !== "disabled" && connectionTypeOf(client) !== "needs-approval",
  );
  if (filtered.length === 0) {
    if (enabling && serverName !== "all" && isDisabledHandle(serverName)) {
      if (targets.some(isConnectedOrCached)) return textResult(disabledInOtherSessionText(serverName));
      return textResult(disabledElsewhereText(serverName));
    }
    if (!enabling && serverName !== "all" && !isDisabledHandle(serverName))
      return textResult(reenabledElsewhereText(serverName));
    if (serverName === "all") {
      let disabledRows = describeDisabledServers(targets, enabling, isDisabledHandle);
      if (disabledRows !== null) {
        let unhiddenFailedCount = enabling
          ? count(targets, (client) => isUnhiddenFailedServer(client, isDisabledHandle))
          : 0;
        return textResult(
          unhiddenFailedCount > 0
            ? `${disabledRows} ${notConnectedRetryHint(unhiddenFailedCount)}`
            : disabledRows,
        );
      }
    }
    if (enabling) {
      let failingCount = count(targets, isMcpConnectivityIssue);
      if (failingCount > 0)
        return textResult(
          serverName === "all"
            ? `All MCP servers are already enabled, but ${notConnectedRetryHint(failingCount)}`
            : cliHintOrPlain(
                `"${redactServerName(serverName)}" is already enabled but not connected.`,
                ` Run \`/mcp reconnect ${serverName}\` to retry.`,
                serverName,
              ),
        );
    }
    return textResult(
      serverName === "all"
        ? `All MCP servers are already ${enabling ? "enabled" : "disabled"}.`
        : `"${redactServerName(serverName)}" is already ${enabling ? "enabled" : "disabled"}.`,
    );
  }
  let disabledSummary =
    serverName === "all" ? describeDisabledServers(targets, enabling, isDisabledHandle) : null;
  let settled = await Promise.allSettled(filtered.map((client) => toggleHandle(client.name)));
  let fulfilledCount = count(settled, (result) => result.status === "fulfilled");
  let reconnectedCount = enabling
    ? count(settled, (result) => result.status === "fulfilled" && result.value.type === "connected")
    : fulfilledCount;
  let verb = enabling ? "Enabled" : "Disabled";
  let summaryLine =
    enabling && reconnectedCount < fulfilledCount
      ? ` (${fulfilledCount - reconnectedCount} enabled but not yet connected)`
      : "";
  if (serverName !== "all") {
    if (!enabling)
      return textResult(
        fulfilledCount > 0
          ? `Disabled "${redactServerName(serverName)}".`
          : `Couldn't disable "${redactServerName(serverName)}" \u2014 it may have been removed, or its configuration couldn't be read.${vscodeHintOrTerminal(" Run `/mcp` in the terminal to check.", " Open MCP servers from the command menu.")}`,
      );
    let singleSettled = settled[0];
    if (singleSettled?.status !== "fulfilled")
      return formatMcpActionFailure("enable", serverName, singleSettled?.reason, {
        config: filtered[0]?.config,
        persistsOffBox: isBridgeOrTransport(context.session),
      });
    let singleSettledType = singleSettled.value.type;
    let detailLines =
      singleSettledType === "needs-auth"
        ? vscodeHintOrTerminal(
            " Authenticate with `/mcp` in the terminal.",
            " Open MCP servers from the command menu.",
          )
        : vscodeHintOrTerminal(
            " Check its config with `/mcp` in the terminal.",
            " Open MCP servers from the command menu.",
          );
    return textResult(
      singleSettledType === "connected"
        ? `Enabled "${redactServerName(serverName)}".`
        : `Enabled "${redactServerName(serverName)}", but it isn't connected yet${singleSettledType !== "failed" ? ` (${MCP_STATUS_LABELS[singleSettledType]})` : ""}.${detailLines}`,
    );
  }
  let failedCount = filtered.length - fulfilledCount;
  return textResult(
    `${verb} ${fulfilledCount} MCP server(s)${summaryLine}` +
      (failedCount > 0 ? ` (${failedCount} couldn't be changed)` : "") +
      "." +
      (disabledSummary !== null ? ` ${disabledSummary}` : "") +
      vscodeHintOrTerminal(
        " Run `/mcp` in the terminal to see status.",
        " Open MCP servers from the command menu.",
      ),
  );
}
//@ chunk-3re05e6m.js:19334-19361 placement
function redactServerName(serverName) {
  return normalizeServerNameShort(serverName);
}
//@ chunk-3re05e6m.js:19361-19434 placement
function cliHintOrPlain(prefix, hint, fallback) {
  let text = `${prefix}${hint}`;
  return isSafeCliArg(fallback) && [...text].length <= 1024 ? text : prefix;
}
//@ chunk-3re05e6m.js:19434-19469 placement
function vscodeHintOrTerminal(name, terminalHint = "") {
  return isVsCodeTopSession() ? terminalHint : name;
}
//@ chunk-3re05e6m.js:19469-19511 placement
function textResult(value) {
  return {
    type: "text",
    value,
  };
}
//@ chunk-3re05e6m.js:19511-20468 placement
/**
 * 云会话的 MCP 状态文本：本会话服务器（状态、传输类型、工具数），以及每台挂接机器上透传的服务器与读不懂的工具数说明。
 */
function formatCloudMcpStatus(clients, tools, hostRegistry) {
  let { servers, rejectedCounts } = collectAttachedMcpServers(hostRegistry.hosts());
  let hostNames = uniq([...servers.map((server) => server.hostName), ...rejectedCounts.keys()]);
  let headerLine =
    clients.length === 0
      ? ["  (none configured)"]
      : [...clients]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((client) => {
            let mcpPrefix = getMcpPrefix(client.name);
            let toolCount = count(tools, (tool) => tool.name.startsWith(mcpPrefix));
            let statusText = isUnconfiguredFailure(client)
              ? "not configured"
              : MCP_STATUS_LABELS[connectionTypeOf(client)];
            return `  ${padToColumn(redactServerName(client.name))}  ${padToColumn(statusText)}  ${client.config.type ?? "stdio"}${toolCountSuffix(toolCount)}`;
          });
  let mapped = hostNames.map((hostName) => {
    let filtered = servers.filter((server) => server.hostName === hostName);
    let rejectedCount = rejectedCounts.get(hostName) ?? 0;
    return [
      "",
      `On ${redactServerName(hostName)} (attached):`,
      ...filtered.map(formatRemoteServerRow),
      ...(rejectedCount > 0
        ? [
            `  (${rejectedCount} more of its MCP ${plural(rejectedCount, "tool")} couldn't be read \u2014 likely a Claude Code version mismatch between this session and that machine)`,
          ]
        : []),
    ].join(`
`);
  });
  let hostLines =
    hostNames.length > 0
      ? `

Servers on ${hostNames.map(redactServerName).join(", ")} are managed there \u2014 run \`/mcp\` in a local terminal on that machine. A server that's failed or disabled there won't appear here, and its transport type isn't reported to the cloud session.`
      : "";
  return (
    ["This cloud session's MCP servers:", ...headerLine, ...mapped].join(`
`) + hostLines
  );
}
//@ chunk-3re05e6m.js:20468-20564 placement
var HOST_STATUS_LABELS = {
  online: "connected",
  offline: "unreachable",
  incompatible: "unreachable (version mismatch)",
};
//@ chunk-3re05e6m.js:20564-20663 placement
function formatRemoteServerRow(server) {
  return `  ${padToColumn(redactServerName(server.serverName))}  ${padToColumn(HOST_STATUS_LABELS[server.hostStatus])}  via ${REMOTE_DEVICES}${toolCountSuffix(server.toolCount)}`;
}
//@ chunk-3re05e6m.js:20663-20719 placement
function padToColumn(text) {
  return text + " ".repeat(Math.max(0, 28 - bunStringWidth(text)));
}
//@ chunk-3re05e6m.js:20719-20775 placement
function toolCountSuffix(count) {
  return count > 0 ? ` \xB7 ${count} ${plural(count, "tool")}` : "";
}
//@ chunk-3re05e6m.js:20775-21267 placement
/**
 * 生成 /mcp 操作失败的提示（远程连接时隐藏细节），区分终端与菜单入口。
 */
function formatMcpActionFailure(action, serverName, error, options) {
  let detail = options.config
    ? redactMcpErrorDetail(serverName, options.config, errorMessage(error))
    : errorMessage(error);
  if (error instanceof WireSafeControlError)
    return textResult(normalizeMcpServerName(errorMessage(error), undefined, "none"));
  if (options.persistsOffBox) {
    logForDebugging(`mcp ${action} refused for ${sanitizeTelemetryString(serverName)}: ${detail}`, {
      level: "error",
    });
    return textResult(
      `Couldn't ${action} "${redactServerName(serverName)}" (detail withheld on this connection).${vscodeHintOrTerminal(" Run `/mcp` in the terminal to check.", " Open MCP servers from the command menu.")}`,
    );
  }
  return textResult(
    `Couldn't ${action} "${redactServerName(serverName)}" \u2014 ${normalizeMcpServerName(detail)}.${vscodeHintOrTerminal(" Run `/mcp` in the terminal to check.", " Open MCP servers from the command menu.")}`,
  );
}
//@ chunk-3re05e6m.js:21267-21381 placement
function notConnectedRetryHint(serverName) {
  return `${serverName} ${serverName === 1 ? "isn't" : "aren't"} connected \u2014 reply \`/mcp reconnect all\` here to retry.`;
}
export { mcpInlineCommand };
