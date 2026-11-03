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
  let l = new Map();
  let g = new Map();
  for (let host of hosts) {
    if (host.kind !== "remote") continue;
    let size = host.rejectedPassthroughTools?.size ?? 0;
    if (size > 0) g.set(host.name, size);
    for (let E of host.passthroughTools?.values() ?? []) {
      let y = mcpInfoFromString(E.localName);
      if (y === null) continue;
      let e = `${host.name}\x00${y.serverName}`;
      let u = l.get(e);
      l.set(
        e,
        u === undefined
          ? {
              hostName: host.name,
              hostStatus: hostConnectionStatus(host),
              serverName: y.serverName,
              toolCount: 1,
            }
          : {
              ...u,
              toolCount: u.toolCount + 1,
            },
      );
    }
  }
  return {
    servers: [...l.values()].sort(
      (r, b) => r.hostName.localeCompare(b.hostName) || r.serverName.localeCompare(b.serverName),
    ),
    rejectedCounts: g,
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
    let S = count(clients, (v) => v.type === "connected");
    let N = count(clients, (v) => v.type === "cached");
    let w = count(clients, (v) => v.type === "pending");
    let j = count(clients, isUnconfiguredFailure);
    let D = count(clients, isMcpConnectivityIssue);
    let P = count(clients, (v) => v.type === "disabled");
    let R = clients.length - S - N - w - P - j;
    return textResult(
      `${clients.length} MCP server(s): ${S} connected, ` +
        (N > 0 ? `${N} cached, ` : "") +
        (w > 0 ? `${w} connecting, ` : "") +
        `${R} not connected, ` +
        (j > 0 ? `${j} not configured, ` : "") +
        `${P} disabled.` +
        (D > 0 && !isNonInteractiveSession ? " Reply `/mcp reconnect all` here to retry." : "") +
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
  let u = serverName === "all" ? clients : clients.filter((o) => o.name === serverName);
  if (u.length === 0)
    return textResult(
      serverName === "all"
        ? `No MCP servers are configured.${vscodeHintOrTerminal(" Add one with `claude mcp add`.", " Open MCP servers from the command menu.")}`
        : `There's no MCP server named "${redactServerName(serverName)}".${vscodeHintOrTerminal(" Run `/mcp` in the terminal to see configured servers.", " Open MCP servers from the command menu.")}`,
    );
  let reconnectHandle = getReconnectHandle();
  let toggleHandle = getToggleHandle();
  let isDisabledHandle = getIsDisabledHandle();
  if (!reconnectHandle || !toggleHandle || !isDisabledHandle) {
    if (getIsNonInteractiveSession())
      return textResult("Reconnect, enable, and disable aren't available in this session.");
    return textResult(
      "MCP controls aren't available right now \u2014 the terminal is still starting up or is showing another view.",
    );
  }
  if (lower_2 === "reconnect") {
    let o = serverName !== "all" ? u[0] : undefined;
    let M = o && toggleStateOf(o);
    if (M === "disabled") {
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
    if (M === "pending")
      return textResult(
        `"${redactServerName(serverName)}" is already reconnecting \u2014 retries can take a few minutes when a server keeps failing.`,
      );
    if (M === "needs-approval")
      return textResult(
        `"${redactServerName(serverName)}" is pending approval.${vscodeHintOrTerminal(" Approve it with `/mcp` in the terminal first.", " Open MCP servers from the command menu.")}`,
      );
    let S = serverName === "all" ? reconnectTargets(u, isDisabledHandle) : null;
    let N = S ? S.targets : u;
    let outOfBandNote = S ? S.outOfBandNote : null;
    if (N.length === 0) {
      let P = count(u, (_) => _.type === "disabled");
      let R = count(u, (_) => isUnconfiguredFailure(_) && !isDisabledHandle(_.name));
      if (P === 0 && outOfBandNote === null && R > 0)
        return textResult(
          `${R} MCP server(s) aren't configured yet, so there's nothing to reconnect. The rest are already connected or connecting.`,
        );
      let v = [
        ...(P > 0
          ? [
              isArtifactMountMode()
                ? `${P} MCP server(s) are disabled for this project. Run \`/mcp\` in this project, in a terminal where this session runs, to bring them back.`
                : `${P} MCP server(s) are disabled. Run \`/mcp enable all\` to bring them back.`,
            ]
          : []),
        ...(outOfBandNote !== null ? [outOfBandNote] : []),
        ...(R > 0 ? [`${R} MCP server(s) aren't configured yet, so there's nothing to reconnect.`] : []),
      ];
      if (v.length > 0) return textResult(v.join(" "));
      return textResult("All enabled MCP servers are already connected or connecting.");
    }
    let { results, connected } = await reconnectAllServers(N, reconnectHandle);
    if (serverName !== "all") {
      let P = results[0];
      if (P?.status !== "fulfilled")
        return formatMcpActionFailure("reconnect", serverName, P?.reason, {
          config: N[0]?.config,
          persistsOffBox: isBridgeOrTransport(context.session),
        });
      let R = P.value.client.type;
      let v =
        R === "needs-auth"
          ? vscodeHintOrTerminal(
              " Authenticate with `/mcp` in the terminal.",
              " Open MCP servers from the command menu.",
            )
          : vscodeHintOrTerminal(
              " Check its config with `/mcp` in the terminal.",
              " Open MCP servers from the command menu.",
            );
      return textResult(
        R === "connected"
          ? `Reconnected "${redactServerName(serverName)}".`
          : `Couldn't reconnect "${redactServerName(serverName)}" (${MCP_STATUS_LABELS[R]}).${v}`,
      );
    }
    return textResult(
      `Reconnected ${connected} of ${N.length} MCP server(s).` +
        (outOfBandNote !== null ? ` ${outOfBandNote}` : "") +
        vscodeHintOrTerminal(
          " Run `/mcp` in the terminal to see status.",
          " Open MCP servers from the command menu.",
        ),
    );
  }
  let p = lower_2 === "enable";
  if (serverName !== "all" && u.some((o) => connectionTypeOf(o) === "needs-approval"))
    return textResult(
      `"${redactServerName(serverName)}" is pending approval.${vscodeHintOrTerminal(" Approve it with `/mcp` in the terminal first.", " Open MCP servers from the command menu.")}`,
    );
  let filtered = u.filter((o) =>
    p ? o.type === "disabled" : o.type !== "disabled" && connectionTypeOf(o) !== "needs-approval",
  );
  if (filtered.length === 0) {
    if (p && serverName !== "all" && isDisabledHandle(serverName)) {
      if (u.some(isConnectedOrCached)) return textResult(disabledInOtherSessionText(serverName));
      return textResult(disabledElsewhereText(serverName));
    }
    if (!p && serverName !== "all" && !isDisabledHandle(serverName))
      return textResult(reenabledElsewhereText(serverName));
    if (serverName === "all") {
      let o = describeDisabledServers(u, p, isDisabledHandle);
      if (o !== null) {
        let M = p ? count(u, (S) => isUnhiddenFailedServer(S, isDisabledHandle)) : 0;
        return textResult(M > 0 ? `${o} ${notConnectedRetryHint(M)}` : o);
      }
    }
    if (p) {
      let o = count(u, isMcpConnectivityIssue);
      if (o > 0)
        return textResult(
          serverName === "all"
            ? `All MCP servers are already enabled, but ${notConnectedRetryHint(o)}`
            : cliHintOrPlain(
                `"${redactServerName(serverName)}" is already enabled but not connected.`,
                ` Run \`/mcp reconnect ${serverName}\` to retry.`,
                serverName,
              ),
        );
    }
    return textResult(
      serverName === "all"
        ? `All MCP servers are already ${p ? "enabled" : "disabled"}.`
        : `"${redactServerName(serverName)}" is already ${p ? "enabled" : "disabled"}.`,
    );
  }
  let U = serverName === "all" ? describeDisabledServers(u, p, isDisabledHandle) : null;
  let settled = await Promise.allSettled(filtered.map((o) => toggleHandle(o.name)));
  let k = count(settled, (o) => o.status === "fulfilled");
  let W = p ? count(settled, (o) => o.status === "fulfilled" && o.value.type === "connected") : k;
  let Q = p ? "Enabled" : "Disabled";
  let X = p && W < k ? ` (${k - W} enabled but not yet connected)` : "";
  if (serverName !== "all") {
    if (!p)
      return textResult(
        k > 0
          ? `Disabled "${redactServerName(serverName)}".`
          : `Couldn't disable "${redactServerName(serverName)}" \u2014 it may have been removed, or its configuration couldn't be read.${vscodeHintOrTerminal(" Run `/mcp` in the terminal to check.", " Open MCP servers from the command menu.")}`,
      );
    let o = settled[0];
    if (o?.status !== "fulfilled")
      return formatMcpActionFailure("enable", serverName, o?.reason, {
        config: filtered[0]?.config,
        persistsOffBox: isBridgeOrTransport(context.session),
      });
    let M = o.value.type;
    let S =
      M === "needs-auth"
        ? vscodeHintOrTerminal(
            " Authenticate with `/mcp` in the terminal.",
            " Open MCP servers from the command menu.",
          )
        : vscodeHintOrTerminal(
            " Check its config with `/mcp` in the terminal.",
            " Open MCP servers from the command menu.",
          );
    return textResult(
      M === "connected"
        ? `Enabled "${redactServerName(serverName)}".`
        : `Enabled "${redactServerName(serverName)}", but it isn't connected yet${M !== "failed" ? ` (${MCP_STATUS_LABELS[M]})` : ""}.${S}`,
    );
  }
  let z = filtered.length - k;
  return textResult(
    `${Q} ${k} MCP server(s)${X}` +
      (z > 0 ? ` (${z} couldn't be changed)` : "") +
      "." +
      (U !== null ? ` ${U}` : "") +
      vscodeHintOrTerminal(
        " Run `/mcp` in the terminal to see status.",
        " Open MCP servers from the command menu.",
      ),
  );
}
//@ chunk-3re05e6m.js:19334-19361 placement
function redactServerName(n) {
  return normalizeServerNameShort(n);
}
//@ chunk-3re05e6m.js:19361-19434 placement
function cliHintOrPlain(n, l, g) {
  let r = `${n}${l}`;
  return isSafeCliArg(g) && [...r].length <= 1024 ? r : n;
}
//@ chunk-3re05e6m.js:19434-19469 placement
function vscodeHintOrTerminal(n, l = "") {
  return isVsCodeTopSession() ? l : n;
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
  let E = uniq([...servers.map((server) => server.hostName), ...rejectedCounts.keys()]);
  let y =
    clients.length === 0
      ? ["  (none configured)"]
      : [...clients]
          .sort((f, T) => f.name.localeCompare(T.name))
          .map((client) => {
            let mcpPrefix = getMcpPrefix(client.name);
            let C = count(tools, (A) => A.name.startsWith(mcpPrefix));
            let p = isUnconfiguredFailure(client)
              ? "not configured"
              : MCP_STATUS_LABELS[connectionTypeOf(client)];
            return `  ${padToColumn(redactServerName(client.name))}  ${padToColumn(p)}  ${client.config.type ?? "stdio"}${toolCountSuffix(C)}`;
          });
  let mapped = E.map((f) => {
    let filtered = servers.filter((server) => server.hostName === f);
    let C = rejectedCounts.get(f) ?? 0;
    return [
      "",
      `On ${redactServerName(f)} (attached):`,
      ...filtered.map(formatRemoteServerRow),
      ...(C > 0
        ? [
            `  (${C} more of its MCP ${plural(C, "tool")} couldn't be read \u2014 likely a Claude Code version mismatch between this session and that machine)`,
          ]
        : []),
    ].join(`
`);
  });
  let u =
    E.length > 0
      ? `

Servers on ${E.map(redactServerName).join(", ")} are managed there \u2014 run \`/mcp\` in a local terminal on that machine. A server that's failed or disabled there won't appear here, and its transport type isn't reported to the cloud session.`
      : "";
  return (
    ["This cloud session's MCP servers:", ...y, ...mapped].join(`
`) + u
  );
}
//@ chunk-3re05e6m.js:20468-20564 placement
var HOST_STATUS_LABELS = {
  online: "connected",
  offline: "unreachable",
  incompatible: "unreachable (version mismatch)",
};
//@ chunk-3re05e6m.js:20564-20663 placement
function formatRemoteServerRow(n) {
  return `  ${padToColumn(redactServerName(n.serverName))}  ${padToColumn(HOST_STATUS_LABELS[n.hostStatus])}  via ${REMOTE_DEVICES}${toolCountSuffix(n.toolCount)}`;
}
//@ chunk-3re05e6m.js:20663-20719 placement
function padToColumn(n) {
  return n + " ".repeat(Math.max(0, 28 - bunStringWidth(n)));
}
//@ chunk-3re05e6m.js:20719-20775 placement
function toolCountSuffix(n) {
  return n > 0 ? ` \xB7 ${n} ${plural(n, "tool")}` : "";
}
//@ chunk-3re05e6m.js:20775-21267 placement
/**
 * 生成 /mcp 操作失败的提示（远程连接时隐藏细节），区分终端与菜单入口。
 */
function formatMcpActionFailure(action, serverName, error, options) {
  let b = options.config
    ? redactMcpErrorDetail(serverName, options.config, errorMessage(error))
    : errorMessage(error);
  if (error instanceof WireSafeControlError)
    return textResult(normalizeMcpServerName(errorMessage(error), undefined, "none"));
  if (options.persistsOffBox) {
    logForDebugging(`mcp ${action} refused for ${sanitizeTelemetryString(serverName)}: ${b}`, {
      level: "error",
    });
    return textResult(
      `Couldn't ${action} "${redactServerName(serverName)}" (detail withheld on this connection).${vscodeHintOrTerminal(" Run `/mcp` in the terminal to check.", " Open MCP servers from the command menu.")}`,
    );
  }
  return textResult(
    `Couldn't ${action} "${redactServerName(serverName)}" \u2014 ${normalizeMcpServerName(b)}.${vscodeHintOrTerminal(" Run `/mcp` in the terminal to check.", " Open MCP servers from the command menu.")}`,
  );
}
//@ chunk-3re05e6m.js:21267-21381 placement
function notConnectedRetryHint(n) {
  return `${n} ${n === 1 ? "isn't" : "aren't"} connected \u2014 reply \`/mcp reconnect all\` here to retry.`;
}
