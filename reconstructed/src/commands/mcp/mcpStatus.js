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
import { r1, YM } from "../../services/mcp/redactMcpErrors.js";
import { COMMON_INFO_ARGS_ALIAS, COMMON_HELP_ARGS } from "../../constants/xml.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { ToolHostRegistry } from "../../remote/tools/toolHostRegistry.js";
import { refreshRemoteToolTargets, remoteToolsContext } from "../../remote/tools/sessionEventTransport.js";
import { sleep } from "../../utils/sleep.js";
import { isVsCodeTopSession } from "../../utils/sessionShape.js";
import { count, uniq } from "../../utils/collections.js";
import { t$r, isUnhiddenFailedServer } from "../../hooks/notifs/useMcpConnectivityStatus.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { Iyt, q1s, hAe } from "../../services/mcp/reconnectHandles.js";
import {
  toggleStateOf,
  connectionTypeOf,
  disabledInOtherSessionText,
  disabledElsewhereText,
  reenabledElsewhereText,
  describeDisabledServers,
} from "../../services/mcp/mcpToggleMessages.js";
import { isArtifactMountMode } from "../../services/artifacts/artifactMount.js";
import { Tan, reconnectAllServers } from "../../services/mcp/MCPConnectionManager.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { uo, normalizeMcpServerName } from "../../services/api/deferredToolsState.js";
import { isSafeCliArg } from "../../utils/worktreeResumeHint.js";
import { plural } from "../../utils/stringUtils.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { redactMcpErrorDetail } from "../../services/mcp/mcpServerOrigin.js";
import { errorMessage, WireSafeControlError } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";

/**
 * 汇总挂接主机（remote 类型）上透传的 MCP 服务器：按主机+服务器名计数工具，并记录每台主机读不懂的工具数。
 */
//@ chunk-3re05e6m.js:12321-12871 placement
function collectAttachedMcpServers(hosts) {
  let l = new Map(),
    g = new Map();
  for (let r of hosts) {
    if (r.kind !== "remote") continue;
    let b = r.rejectedPassthroughTools?.size ?? 0;
    if (b > 0) g.set(r.name, b);
    for (let E of r.passthroughTools?.values() ?? []) {
      let y = mcpInfoFromString(E.localName);
      if (y === null) continue;
      let e = `${r.name}\x00${y.serverName}`,
        u = l.get(e);
      l.set(
        e,
        u === void 0
          ? { hostName: r.name, hostStatus: Z(r), serverName: y.serverName, toolCount: 1 }
          : { ...u, toolCount: u.toolCount + 1 },
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
function Z(n) {
  if (n.protocol.kind === "incompatible") return "incompatible";
  return n.status;
}
/**
 * /mcp 状态的连接状态标签、用法说明与等待时长。
 */
//@ chunk-3re05e6m.js:12958-13268 placement
var MCP_STATUS_LABELS = {
    connected: "connected",
    cached: "cached (connects on first use)",
    pending: "connecting",
    disabled: "disabled",
    failed: "not connected",
    "needs-auth": "needs authentication",
    "needs-approval": "pending approval",
  },
  MCP_USAGE = "Usage: /mcp [reconnect|enable|disable [<server>|all]]. With no server name, applies to all.",
  REMOTE_REFRESH_WAIT_MS = 2500;
/**
 * /mcp 的非面板（内联）版本：无参数时汇总服务器状态（云会话先刷新远程主机），help 打印用法；reconnect/enable/disable [<server>|all] 执行对应操作并返回结果文字，处理禁用、连接中、待批准、需认证等各种状态。
 */
//@ chunk-3re05e6m.js:13268-19334 placement
async function mcpInlineCommand(args, context) {
  let trimmed = args.trim(),
    filtered = context.getMcp().clients.filter((client) => client.name !== "ide" && !r1(client)),
    lower = trimmed.toLowerCase();
  if (!trimmed || COMMON_INFO_ARGS_ALIAS.includes(lower)) {
    let o = getIsNonInteractiveSession();
    if (o && Boolean(env.CLAUDE_CODE_REMOTE) && !isBridgeOrTransport(context.session)) {
      let v = context.toolState.get(ToolHostRegistry);
      if (
        (await Promise.race([
          refreshRemoteToolTargets(remoteToolsContext(context), v, "resolve"),
          sleep(REMOTE_REFRESH_WAIT_MS, context.abortController.signal),
        ]),
        !isBridgeOrTransport(context.session))
      )
        return s(formatCloudMcpStatus(filtered, context.getMcp().tools, v));
    }
    if (filtered.length === 0)
      return s(
        `No MCP servers are configured.${h(" Add one with `claude mcp add`.", " Open MCP servers from the command menu.")}${
          isVsCodeTopSession()
            ? ""
            : `
${MCP_USAGE}`
        }`,
      );
    let S = count(filtered, (v) => v.type === "connected"),
      N = count(filtered, (v) => v.type === "cached"),
      w = count(filtered, (v) => v.type === "pending"),
      j = count(filtered, YM),
      D = count(filtered, t$r),
      P = count(filtered, (v) => v.type === "disabled"),
      R = filtered.length - S - N - w - P - j;
    return s(
      `${filtered.length} MCP server(s): ${S} connected, ` +
        (N > 0 ? `${N} cached, ` : "") +
        (w > 0 ? `${w} connecting, ` : "") +
        `${R} not connected, ` +
        (j > 0 ? `${j} not configured, ` : "") +
        `${P} disabled.` +
        (D > 0 && !o ? " Reply `/mcp reconnect all` here to retry." : "") +
        (o
          ? h(" Use `/mcp` in the terminal for details.", " Open MCP servers from the command menu.")
          : `${h(" Use `/mcp` in the terminal for details.")}
${MCP_USAGE}`),
    );
  }
  if (COMMON_HELP_ARGS.includes(lower)) return s(MCP_USAGE);
  let match = /^(\S+)\s*(.*)$/.exec(trimmed),
    lower_2 = (match?.[1] ?? "").toLowerCase(),
    e = match?.[2] || "all";
  if (lower_2 !== "reconnect" && lower_2 !== "enable" && lower_2 !== "disable")
    return s(`"${m(lower_2)}" isn't a recognized /mcp action. Try reconnect, enable, or disable.`);
  logEvent("tengu_mcp_command_inline", { action: fromEnum(lower_2) });
  let u = e === "all" ? filtered : filtered.filter((o) => o.name === e);
  if (u.length === 0)
    return s(
      e === "all"
        ? `No MCP servers are configured.${h(" Add one with `claude mcp add`.", " Open MCP servers from the command menu.")}`
        : `There's no MCP server named "${m(e)}".${h(" Run `/mcp` in the terminal to see configured servers.", " Open MCP servers from the command menu.")}`,
    );
  let f = Iyt(),
    T = q1s(),
    C = hAe();
  if (!f || !T || !C) {
    if (getIsNonInteractiveSession())
      return s("Reconnect, enable, and disable aren't available in this session.");
    return s(
      "MCP controls aren't available right now \u2014 the terminal is still starting up or is showing another view.",
    );
  }
  if (lower_2 === "reconnect") {
    let o = e !== "all" ? u[0] : void 0,
      M = o && toggleStateOf(o);
    if (M === "disabled") {
      if (isArtifactMountMode())
        return s(
          `"${m(e)}" is disabled for this project. Run \`/mcp\` in this project, in a terminal where this session runs, to bring it back.`,
        );
      return s(V(`"${m(e)}" is disabled.`, ` Run \`/mcp enable ${e}\` to bring it back.`, e));
    }
    if (M === "pending")
      return s(
        `"${m(e)}" is already reconnecting \u2014 retries can take a few minutes when a server keeps failing.`,
      );
    if (M === "needs-approval")
      return s(
        `"${m(e)}" is pending approval.${h(" Approve it with `/mcp` in the terminal first.", " Open MCP servers from the command menu.")}`,
      );
    let S = e === "all" ? Tan(u, C) : null,
      N = S ? S.targets : u,
      w = S ? S.outOfBandNote : null;
    if (N.length === 0) {
      let P = count(u, (_) => _.type === "disabled"),
        R = count(u, (_) => YM(_) && !C(_.name));
      if (P === 0 && w === null && R > 0)
        return s(
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
        ...(w !== null ? [w] : []),
        ...(R > 0 ? [`${R} MCP server(s) aren't configured yet, so there's nothing to reconnect.`] : []),
      ];
      if (v.length > 0) return s(v.join(" "));
      return s("All enabled MCP servers are already connected or connecting.");
    }
    let { results: results, connected: connected } = await reconnectAllServers(N, f);
    if (e !== "all") {
      let P = results[0];
      if (P?.status !== "fulfilled")
        return formatMcpActionFailure("reconnect", e, P?.reason, {
          config: N[0]?.config,
          persistsOffBox: isBridgeOrTransport(context.session),
        });
      let R = P.value.client.type,
        v =
          R === "needs-auth"
            ? h(" Authenticate with `/mcp` in the terminal.", " Open MCP servers from the command menu.")
            : h(" Check its config with `/mcp` in the terminal.", " Open MCP servers from the command menu.");
      return s(
        R === "connected"
          ? `Reconnected "${m(e)}".`
          : `Couldn't reconnect "${m(e)}" (${MCP_STATUS_LABELS[R]}).${v}`,
      );
    }
    return s(
      `Reconnected ${connected} of ${N.length} MCP server(s).` +
        (w !== null ? ` ${w}` : "") +
        h(" Run `/mcp` in the terminal to see status.", " Open MCP servers from the command menu."),
    );
  }
  let p = lower_2 === "enable";
  if (e !== "all" && u.some((o) => connectionTypeOf(o) === "needs-approval"))
    return s(
      `"${m(e)}" is pending approval.${h(" Approve it with `/mcp` in the terminal first.", " Open MCP servers from the command menu.")}`,
    );
  let filtered_2 = u.filter((o) =>
    p ? o.type === "disabled" : o.type !== "disabled" && connectionTypeOf(o) !== "needs-approval",
  );
  if (filtered_2.length === 0) {
    if (p && e !== "all" && C(e)) {
      if (u.some(isConnectedOrCached)) return s(disabledInOtherSessionText(e));
      return s(disabledElsewhereText(e));
    }
    if (!p && e !== "all" && !C(e)) return s(reenabledElsewhereText(e));
    if (e === "all") {
      let o = describeDisabledServers(u, p, C);
      if (o !== null) {
        let M = p ? count(u, (S) => isUnhiddenFailedServer(S, C)) : 0;
        return s(M > 0 ? `${o} ${notConnectedRetryHint(M)}` : o);
      }
    }
    if (p) {
      let o = count(u, t$r);
      if (o > 0)
        return s(
          e === "all"
            ? `All MCP servers are already enabled, but ${notConnectedRetryHint(o)}`
            : V(
                `"${m(e)}" is already enabled but not connected.`,
                ` Run \`/mcp reconnect ${e}\` to retry.`,
                e,
              ),
        );
    }
    return s(
      e === "all"
        ? `All MCP servers are already ${p ? "enabled" : "disabled"}.`
        : `"${m(e)}" is already ${p ? "enabled" : "disabled"}.`,
    );
  }
  let U = e === "all" ? describeDisabledServers(u, p, C) : null,
    settled = await Promise.allSettled(filtered_2.map((o) => T(o.name))),
    k = count(settled, (o) => o.status === "fulfilled"),
    W = p ? count(settled, (o) => o.status === "fulfilled" && o.value.type === "connected") : k,
    Q = p ? "Enabled" : "Disabled",
    X = p && W < k ? ` (${k - W} enabled but not yet connected)` : "";
  if (e !== "all") {
    if (!p)
      return s(
        k > 0
          ? `Disabled "${m(e)}".`
          : `Couldn't disable "${m(e)}" \u2014 it may have been removed, or its configuration couldn't be read.${h(" Run `/mcp` in the terminal to check.", " Open MCP servers from the command menu.")}`,
      );
    let o = settled[0];
    if (o?.status !== "fulfilled")
      return formatMcpActionFailure("enable", e, o?.reason, {
        config: filtered_2[0]?.config,
        persistsOffBox: isBridgeOrTransport(context.session),
      });
    let M = o.value.type,
      S =
        M === "needs-auth"
          ? h(" Authenticate with `/mcp` in the terminal.", " Open MCP servers from the command menu.")
          : h(" Check its config with `/mcp` in the terminal.", " Open MCP servers from the command menu.");
    return s(
      M === "connected"
        ? `Enabled "${m(e)}".`
        : `Enabled "${m(e)}", but it isn't connected yet${M !== "failed" ? ` (${MCP_STATUS_LABELS[M]})` : ""}.${S}`,
    );
  }
  let z = filtered_2.length - k;
  return s(
    `${Q} ${k} MCP server(s)${X}` +
      (z > 0 ? ` (${z} couldn't be changed)` : "") +
      "." +
      (U !== null ? ` ${U}` : "") +
      h(" Run `/mcp` in the terminal to see status.", " Open MCP servers from the command menu."),
  );
}
//@ chunk-3re05e6m.js:19334-19361 placement
function m(n) {
  return uo(n);
}
//@ chunk-3re05e6m.js:19361-19434 placement
function V(n, l, g) {
  let r = `${n}${l}`;
  return isSafeCliArg(g) && [...r].length <= 1024 ? r : n;
}
//@ chunk-3re05e6m.js:19434-19469 placement
function h(n, l = "") {
  return isVsCodeTopSession() ? l : n;
}
//@ chunk-3re05e6m.js:19469-19511 placement
function s(n) {
  return { type: "text", value: n };
}
/**
 * 云会话的 MCP 状态文本：本会话服务器（状态、传输类型、工具数），以及每台挂接机器上透传的服务器与读不懂的工具数说明。
 */
//@ chunk-3re05e6m.js:19511-20468 placement
function formatCloudMcpStatus(clients, tools, hostRegistry) {
  let { servers: servers, rejectedCounts: rejectedCounts } = collectAttachedMcpServers(hostRegistry.hosts()),
    E = uniq([...servers.map((f) => f.hostName), ...rejectedCounts.keys()]),
    y =
      clients.length === 0
        ? ["  (none configured)"]
        : [...clients]
            .sort((f, T) => f.name.localeCompare(T.name))
            .map((f) => {
              let T = getMcpPrefix(f.name),
                C = count(tools, (A) => A.name.startsWith(T)),
                p = YM(f) ? "not configured" : MCP_STATUS_LABELS[connectionTypeOf(f)];
              return `  ${B(m(f.name))}  ${B(p)}  ${f.config.type ?? "stdio"}${Y(C)}`;
            }),
    mapped = E.map((f) => {
      let filtered = servers.filter((p) => p.hostName === f),
        C = rejectedCounts.get(f) ?? 0;
      return [
        "",
        `On ${m(f)} (attached):`,
        ...filtered.map(oe),
        ...(C > 0
          ? [
              `  (${C} more of its MCP ${plural(C, "tool")} couldn't be read \u2014 likely a Claude Code version mismatch between this session and that machine)`,
            ]
          : []),
      ].join(`
`);
    }),
    u =
      E.length > 0
        ? `

Servers on ${E.map(m).join(", ")} are managed there \u2014 run \`/mcp\` in a local terminal on that machine. A server that's failed or disabled there won't appear here, and its transport type isn't reported to the cloud session.`
        : "";
  return (
    ["This cloud session's MCP servers:", ...y, ...mapped].join(`
`) + u
  );
}
//@ chunk-3re05e6m.js:20468-20564 placement
var te = { online: "connected", offline: "unreachable", incompatible: "unreachable (version mismatch)" };
//@ chunk-3re05e6m.js:20564-20663 placement
function oe(n) {
  return `  ${B(m(n.serverName))}  ${B(te[n.hostStatus])}  via ${REMOTE_DEVICES}${Y(n.toolCount)}`;
}
//@ chunk-3re05e6m.js:20663-20719 placement
function B(n) {
  return n + " ".repeat(Math.max(0, 28 - bunStringWidth(n)));
}
//@ chunk-3re05e6m.js:20719-20775 placement
function Y(n) {
  return n > 0 ? ` \xB7 ${n} ${plural(n, "tool")}` : "";
}
/**
 * 生成 /mcp 操作失败的提示（远程连接时隐藏细节），区分终端与菜单入口。
 */
//@ chunk-3re05e6m.js:20775-21267 placement
function formatMcpActionFailure(action, serverName, error, options) {
  let b = options.config
    ? redactMcpErrorDetail(serverName, options.config, errorMessage(error))
    : errorMessage(error);
  if (error instanceof WireSafeControlError)
    return s(normalizeMcpServerName(errorMessage(error), void 0, "none"));
  if (options.persistsOffBox)
    return (
      logForDebugging(`mcp ${action} refused for ${sanitizeTelemetryString(serverName)}: ${b}`, {
        level: "error",
      }),
      s(
        `Couldn't ${action} "${m(serverName)}" (detail withheld on this connection).${h(" Run `/mcp` in the terminal to check.", " Open MCP servers from the command menu.")}`,
      )
    );
  return s(
    `Couldn't ${action} "${m(serverName)}" \u2014 ${normalizeMcpServerName(b)}.${h(" Run `/mcp` in the terminal to check.", " Open MCP servers from the command menu.")}`,
  );
}
//@ chunk-3re05e6m.js:21267-21381 placement
function notConnectedRetryHint(n) {
  return `${n} ${n === 1 ? "isn't" : "aren't"} connected \u2014 reply \`/mcp reconnect all\` here to retry.`;
}
