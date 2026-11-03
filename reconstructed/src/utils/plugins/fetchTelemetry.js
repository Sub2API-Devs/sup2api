/**
 * utils/plugins/fetchTelemetry.ts
 *
 * 插件/市场远程获取的遥测 tengu_plugin_remote_fetch 与错误分类。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/fetchTelemetry.ts
 * pieces: chunk-1kaj6e83.js (2), chunk-e6aww6q8.js (1), chunk-v00h76b6.js (5)
 * attribution: fingerprint 5, affinity 1, layout 2
 */
import { GITHUB_HOST } from "../git/githubUrl.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "./officialMarketplace.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { normalizeGitRemoteUrl } from "../git.js";

//@ chunk-v00h76b6.js:333-538 fingerprint = KNOWN_PUBLIC_HOSTS (0.947)
var KNOWN_PUBLIC_HOSTS = [
  GITHUB_HOST,
  "raw.githubusercontent.com",
  "objects.githubusercontent.com",
  "gist.githubusercontent.com",
  "gitlab.com",
  "bitbucket.org",
  "codeberg.org",
  "dev.azure.com",
  "ssh.dev.azure.com",
  "storage.googleapis.com",
];
//@ chunk-v00h76b6.js:538-710 layout
function classifyFetchHost(urlOrSpec) {
  let host;
  let scpMatch = /^[^@/]+@([^:/]+):/.exec(urlOrSpec);
  if (scpMatch) host = scpMatch[1];
  else
    try {
      host = new URL(urlOrSpec).hostname;
    } catch {
      return "unknown";
    }
  let normalized = host.toLowerCase();
  return KNOWN_PUBLIC_HOSTS.find((r) => r === normalized) ?? "other";
}
//@ chunk-v00h76b6.js:710-762 layout = isOfficialRepo (1)
function isOfficialRepo_2(urlOrSpec) {
  return urlOrSpec.includes(`anthropics/${CLAUDE_PLUGINS_OFFICIAL}`);
}
//@ chunk-v00h76b6.js:762-1157 fingerprint = logPluginFetch (0.448)
/**
 * 记录插件远程获取遥测 tengu_plugin_remote_fetch（来源类型、主机（公共主机才记明文）、结果、耗时、错误类别）。
 */
function logPluginFetch(source, urlOrSpec, outcome, durationMs, errorKind, u, submodules) {
  logEvent("tengu_plugin_remote_fetch", {
    source: fromEnum(source),
    host: fromEnum(urlOrSpec ? classifyFetchHost(urlOrSpec) : "unknown"),
    is_official: source === "plugin_catalog" || (urlOrSpec ? isOfficialRepo_2(urlOrSpec) : false),
    outcome: fromEnum(outcome),
    duration_ms: Math.round(durationMs),
    ...(errorKind && {
      error_kind: fromEnum(errorKind),
    }),
    ...(u !== undefined
      ? {
          is_directory: u,
        }
      : {}),
    ...(submodules && {
      submodule_selection: fromEnum(submodules.fetched === "all" ? "all" : "selected"),
      submodules_recorded: submodules.recorded,
      submodules_fetched: submodules.fetched === "all" ? submodules.recorded : submodules.fetched,
    }),
  });
}
//@ chunk-v00h76b6.js:1157-1783 fingerprint = classifyFetchError (1)
/**
 * 把获取错误归类：dns_or_refused、timeout、conflict、auth、not_found、tls、invalid_schema、other 等。
 */
function classifyFetchError(error) {
  let msg = String(error?.message ?? error);
  if (/ENOTFOUND|ECONNREFUSED|EAI_AGAIN|Could not resolve host|Connection refused/i.test(msg))
    return "dns_or_refused";
  if (/ETIMEDOUT|timed out|timeout/i.test(msg)) return "timeout";
  if (/ECONNRESET|socket hang up|Connection reset by peer|remote end hung up/i.test(msg)) return "conn_reset";
  if (/403|401|authentication|permission denied/i.test(msg)) return "auth";
  if (/404|not found|repository not found/i.test(msg)) return "not_found";
  if (/certificate|SSL|TLS|unable to get local issuer/i.test(msg)) return "tls";
  if (/Invalid response format|Invalid marketplace schema/i.test(msg)) return "invalid_schema";
  return "other";
}
//@ chunk-1kaj6e83.js:12100-12189 fingerprint = extractHost (0.664)
/**
 * URL 取 协议//主机。名字归属可疑（被 MCP auth 引用）。
 */
function extractHost(urlOrSpec) {
  try {
    let t = new URL(urlOrSpec);
    return `${t.protocol}//${t.hostname}`;
  } catch {
    return urlOrSpec;
  }
}
//@ chunk-1kaj6e83.js:12189-12270 affinity
/**
 * URL 主机是否为本机回环（127.0.0.1/localhost）。
 */
function isLoopbackOrigin_2(urlOrSpec) {
  let host = extractHost(urlOrSpec);
  return host === "http://127.0.0.1" || host === "http://localhost";
}
//@ chunk-e6aww6q8.js:770392-770635 fingerprint = isOfficialRepo (1)
function isOfficialRepo(urlOrSpec) {
  let [, ...n] = (normalizeGitRemoteUrl(urlOrSpec.replace(/\/+$/, "")) ?? "")
    .split("/")
    .filter((y) => y !== "");
  if (!n.every((y) => /^[a-z0-9_][a-z0-9._-]*$/i.test(y))) return null;
  let s = n.length === 2;
  let h = n.length === 1;
  return s ? `${n[0]}/${n[1]}` : h ? `anthropics/${n[0]}` : null;
}
export { isLoopbackOrigin_2, extractHost, logPluginFetch, classifyFetchError, isOfficialRepo };
