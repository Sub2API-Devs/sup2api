/**
 * tools/BashTool/agentProxyFailures.ts
 *
 * 2.1.316 新增：代理（agent proxy）失败识别
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
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

//@ chunk-e6aww6q8.js:189484-189515 placement
/**
 * 读取本次命令期间记录的代理失败连接列表（未知主机、连接错误等），供错误信息使用。
 */
function getAgentProxyFailures() {
  return getProxyRelayState().seq;
}
//@ chunk-e6aww6q8.js:189515-190349 placement
/**
 * 汇总命令运行期间经代理失败的连接（未知主机等）。
 */
function describeAgentProxyFailures(e) {
  let proxyRelayState = getProxyRelayState();
  let r = proxyRelayState.seq - e;
  if (proxyRelayState.statusUrl === undefined || r <= 0) return;
  let sliced = proxyRelayState.recent.slice(Math.max(0, proxyRelayState.recent.length - r));
  let h = new Map();
  for (let idx = sliced.length - 1; idx >= 0; idx--) {
    let { kind, host } = sliced[idx];
    let G = `${host}\x00${kind}`;
    let q = h.get(G);
    if (q) q.count++;
    else
      h.set(G, {
        host: host ?? "unknown host",
        kind,
        count: 1,
      });
  }
  let y = [
    `[agent-proxy] While this command ran, ${r} ${plural(r, "connection")} through the agent proxy failed:`,
    ...[...h.values()]
      .slice(0, PROXY_RELAY_ERROR_MESSAGES)
      .map(
        ({ host, kind, count }) =>
          `- ${truncateWithCount(host, MAX_PROXY_POLICY_REFUSED_HOSTS)} \u2014 ${kind} (${PROXY_RELAY_ERRORS[kind]})${count > 1 ? ` \xD7${count}` : ""}`,
      ),
  ];
  if (h.size > PROXY_RELAY_ERROR_MESSAGES) y.push(`- and ${h.size - PROXY_RELAY_ERROR_MESSAGES} more`);
  if (r > sliced.length) y.push(`(oldest ${r - sliced.length} not shown)`);
  if (isCoworkAny() && sliced.some((S) => S.kind === "connect_rejected")) y.push(PROXY_STATUS_URL_SUFFIX);
  y.push(`For details: curl -sS ${proxyRelayState.statusUrl}`);
  logEvent("tengu_agent_proxy_failure_note", {
    failures: r,
    latest_kind: fromEnumOpt(sliced.at(-1)?.kind),
  });
  return y.join(`
`);
}
export { getAgentProxyFailures, describeAgentProxyFailures };
