/**
 * tools/BashTool/agentProxyFailures.ts
 *
 * 2.1.316 新增：代理（agent proxy）失败识别
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 */
import {
  getProxyRelayState,
  PROXY_RELAY_ERROR_MESSAGES,
  MAX_PROXY_POLICY_REFUSED_HOSTS,
  PROXY_RELAY_ERRORS,
  PROXY_STATUS_URL_SUFFIX,
} from "../../upstreamproxy/relay.js";
import { plural, truncateWithCount } from "../../utils/stringUtils.js";
import { isCoworkAny } from "../../utils/entrypointKinds.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnumOpt } from "../../services/analytics/safeMetadata.js";

//@ chunk-5xgkngpb.js:190147-190178 placement
/**
 * 读取本次命令期间记录的代理失败连接列表（未知主机、连接错误等），供错误信息使用。
 */
function getAgentProxyFailures() {
  return getProxyRelayState().seq;
}
//@ chunk-5xgkngpb.js:190178-191012 placement
/**
 * 汇总命令运行期间经代理失败的连接（未知主机等）。
 */
function describeAgentProxyFailures(seenSeq) {
  let proxyRelayState = getProxyRelayState();
  let failureCount = proxyRelayState.seq - seenSeq;
  if (proxyRelayState.statusUrl === undefined || failureCount <= 0) return;
  let sliced = proxyRelayState.recent.slice(Math.max(0, proxyRelayState.recent.length - failureCount));
  let failuresByHostAndKind = new Map();
  for (let idx = sliced.length - 1; idx >= 0; idx--) {
    let { kind, host } = sliced[idx];
    let groupKey = `${host}\x00${kind}`;
    let group = failuresByHostAndKind.get(groupKey);
    if (group) group.count++;
    else
      failuresByHostAndKind.set(groupKey, {
        host: host ?? "unknown host",
        kind,
        count: 1,
      });
  }
  let lines = [
    `[agent-proxy] While this command ran, ${failureCount} ${plural(failureCount, "connection")} through the agent proxy failed:`,
    ...[...failuresByHostAndKind.values()]
      .slice(0, PROXY_RELAY_ERROR_MESSAGES)
      .map(
        ({ host, kind, count }) =>
          `- ${truncateWithCount(host, MAX_PROXY_POLICY_REFUSED_HOSTS)} \u2014 ${kind} (${PROXY_RELAY_ERRORS[kind]})${count > 1 ? ` \xD7${count}` : ""}`,
      ),
  ];
  if (failuresByHostAndKind.size > PROXY_RELAY_ERROR_MESSAGES)
    lines.push(`- and ${failuresByHostAndKind.size - PROXY_RELAY_ERROR_MESSAGES} more`);
  if (failureCount > sliced.length) lines.push(`(oldest ${failureCount - sliced.length} not shown)`);
  if (isCoworkAny() && sliced.some((failure) => failure.kind === "connect_rejected"))
    lines.push(PROXY_STATUS_URL_SUFFIX);
  lines.push(`For details: curl -sS ${proxyRelayState.statusUrl}`);
  logEvent("tengu_agent_proxy_failure_note", {
    failures: failureCount,
    latest_kind: fromEnumOpt(sliced.at(-1)?.kind),
  });
  return lines.join(`
`);
}
export { getAgentProxyFailures, describeAgentProxyFailures };
