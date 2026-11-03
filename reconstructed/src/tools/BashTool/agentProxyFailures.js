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
import { cG, C$e, ndo, PROXY_RELAY_ERRORS, odo } from "../../upstreamproxy/relay.js";
import { plural, truncateWithCount } from "../../utils/stringUtils.js";
import { isCoworkAny } from "../../utils/entrypointKinds.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnumOpt } from "../../services/analytics/safeMetadata.js";

//@ chunk-e6aww6q8.js:189484-189515 placement
function LEt() {
  return cG().seq;
}
/**
 * 汇总命令运行期间经代理失败的连接（未知主机等）。
 */
//@ chunk-e6aww6q8.js:189515-190349 placement
function describeAgentProxyFailures(e) {
  let n = cG(),
    r = n.seq - e;
  if (n.statusUrl === void 0 || r <= 0) return;
  let sliced = n.recent.slice(Math.max(0, n.recent.length - r)),
    h = new Map();
  for (let S = sliced.length - 1; S >= 0; S--) {
    let { kind: kind, host: host } = sliced[S],
      G = `${host}\x00${kind}`,
      q = h.get(G);
    if (q) q.count++;
    else h.set(G, { host: host ?? "unknown host", kind: kind, count: 1 });
  }
  let y = [
    `[agent-proxy] While this command ran, ${r} ${plural(r, "connection")} through the agent proxy failed:`,
    ...[...h.values()]
      .slice(0, C$e)
      .map(
        ({ host: host, kind: kind, count: count }) =>
          `- ${truncateWithCount(host, ndo)} \u2014 ${kind} (${PROXY_RELAY_ERRORS[kind]})${count > 1 ? ` \xD7${count}` : ""}`,
      ),
  ];
  if (h.size > C$e) y.push(`- and ${h.size - C$e} more`);
  if (r > sliced.length) y.push(`(oldest ${r - sliced.length} not shown)`);
  if (isCoworkAny() && sliced.some((S) => S.kind === "connect_rejected")) y.push(odo);
  return (
    y.push(`For details: curl -sS ${n.statusUrl}`),
    logEvent("tengu_agent_proxy_failure_note", {
      failures: r,
      latest_kind: fromEnumOpt(sliced.at(-1)?.kind),
    }),
    y.join(`
`)
  );
}

export { LEt, describeAgentProxyFailures };
