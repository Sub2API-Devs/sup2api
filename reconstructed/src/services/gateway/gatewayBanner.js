/**
 * services/gateway/gatewayBanner.ts
 *
 * 2.1.316 新增：claude gateway 启动横幅：监听地址、遥测导出、客户端 IP 来源、OIDC 与客户路由推理配置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2f906bwf.js (6)
 * attribution: placement 6
 */
import { isIP } from "net";
import { env } from "../../utils/env.js";
import { LEVEL_ORDER } from "../../utils/debug.js";
import { getUsableProxyUrl, shouldBypassProxy } from "../../utils/proxy.js";

/**
 * 网关日志级别：CLAUDE_GATEWAY_LOG_LEVEL（debug/info/warn/error），默认 info。
 */
//@ chunk-2f906bwf.js:330-420 placement
function getGatewayLogLevel() {
  let e = env.CLAUDE_GATEWAY_LOG_LEVEL?.toLowerCase();
  return e && e in LEVEL_ORDER ? LEVEL_ORDER[e] : LEVEL_ORDER.info;
}
//@ chunk-2f906bwf.js:420-461 placement
var g = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
//@ chunk-2f906bwf.js:461-601 placement
function escapeControlChars(e) {
  return e.replace(
    /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g,
    (r) => g[r] ?? `\\u${r.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}
/**
 * 按级别写 [gateway] 日志到 stderr。
 */
//@ chunk-2f906bwf.js:601-713 placement
function gatewayLog(e, r) {
  if (LEVEL_ORDER[e] < getGatewayLogLevel()) return;
  process.stderr.write(`[gateway] ${new Date().toISOString()} ${e} ${escapeControlChars(r)}
`);
}
/**
 * 以 JSON 行写结构化网关事件到 stderr。
 */
//@ chunk-2f906bwf.js:713-815 placement
function gatewayJsonLog(e, r) {
  process.stderr.write(`${JSON.stringify({ ts: new Date().toISOString(), evt: e, ...r })}
`);
}
/**
 * 打印 claude gateway 启动横幅：监听地址、遥测导出、客户端 IP 来源、OIDC、客户路由推理与策略 webhook。
 */
//@ chunk-2f906bwf.js:815-3615 placement
function printGatewayBanner(e, r) {
  process.stderr.write(
    `
\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
` +
      `\u2502  Claude Code Gateway                \u2502
` +
      `\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
`,
  );
  let d = r.tls ? "https" : "http",
    filtered = ["metrics", "logs", "traces"].filter((t) => e.telemetry.forward_to.some((o) => o[t]));
  if ((gatewayLog("info", `claude gateway listening on ${d}://${r.hostname}:${r.port}`), e.listen.public_url))
    gatewayLog("info", `public_url ${e.listen.public_url}`);
  let n = e.listen.trusted_proxies.length;
  if (
    (gatewayLog(
      "info",
      n === 0
        ? "client IPs: TCP peer address (listen.trusted_proxies empty)"
        : `client IPs: X-Forwarded-For via listen.trusted_proxies (${n} ${n === 1 ? "entry" : "entries"})`,
    ),
    e.oidc)
  ) {
    gatewayLog("info", `oidc issuer ${e.oidc.issuer}`);
    let t = e.oidc.allowed_email_domains ?? [];
    gatewayLog("info", `email domains ${t.length > 0 ? t.join(",") : "(unrestricted)"}`);
    let o = e.oidc.allowed_groups ?? [];
    gatewayLog("info", `allowed groups ${o.length > 0 ? o.join(",") : "(unrestricted)"}`);
  } else gatewayLog("info", "oidc: not configured (customer-routed inference only)");
  if (e.cri?.enabled)
    gatewayLog(
      "info",
      `customer-routed inference: enabled (${e.cri.org_allowlist.length} allowed org(s), policy webhook ${e.cri.policy?.webhook ? "configured" : "not configured"})`,
    );
  (gatewayLog(
    "info",
    `upstreams ${e.upstreams.length}: ${e.upstreams.map((upstream) => `${upstream.name}(${upstream.provider}${upstream.groups ? `, groups: ${upstream.groups.join(", ")}` : ""})`).join(", ")}`,
  ),
    gatewayLog(
      "info",
      e.telemetry.forward_to.length === 0
        ? "telemetry relay: not configured"
        : `telemetry relay: ${e.telemetry.forward_to.length} destination(s), signals enabled: ${filtered.join(",") || "none"}`,
    ));
  for (let t of e.telemetry.forward_to) {
    let { host: host, hostname: hostname } = new URL(t.url);
    if (!isIP(hostname.replace(/^\[|\]$/g, "")) && getUsableProxyUrl() && shouldBypassProxy(t.url))
      gatewayLog("info", `telemetry relay: ${host} matches NO_PROXY; exports to it skip the proxy`);
  }
  (gatewayLog("info", `managed settings: ${r.managed ? "configured" : "not configured"}`),
    gatewayLog(
      "info",
      `upstream requests: at most ${r.outboundLimit} at once per process (set BUN_CONFIG_MAX_HTTP_REQUESTS to change)`,
    ));
  let filtered_2 = e.upstreams.filter((upstream) => upstream.provider !== "anthropic");
  if (e.timeouts.operator_set && filtered_2.length > 0)
    gatewayLog(
      "info",
      `timeouts.upstream_ttfb_ms: ${e.timeouts.upstream_ttfb_ms} ms also applies to streaming and count_tokens requests on ${filtered_2.map((t) => t.name).join(", ")} (older gateways applied it to provider: anthropic upstreams only)`,
    );
  let readiness_grace_seconds = e.store.readiness_grace_seconds;
  if (readiness_grace_seconds > 0)
    gatewayLog(
      "info",
      `readiness: /readyz keeps reporting ready for up to ${readiness_grace_seconds}s after Postgres stops answering (store.readiness_grace_seconds)`,
    );
}

export { gatewayLog, gatewayJsonLog, printGatewayBanner };
