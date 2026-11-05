/**
 * utils/plugins/fetchTelemetry.ts
 *
 * 插件/市场远程获取的遥测 tengu_plugin_remote_fetch 与错误分类。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/fetchTelemetry.ts
 * pieces: chunk-2jb250pa.js (1), chunk-395x6mw0.js (5)
 * attribution: fingerprint 5, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { parseUrlScheme, decodePercentRuns } from "../redaction/urlParsing.js";
import { stripLeadingSpaceAndNewlines } from "../redaction/urlRedaction.js";
import { GITHUB_HOST } from "../git/githubUrl.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "./officialMarketplace.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-2jb250pa.js:39887-40059 fingerprint (2.1.88 match: extractHost, 0.664)
function sshHostMismatch(text, url) {
  if (!/^(?:ssh|git|git\+ssh|ssh\+git):$/i.test(url.protocol)) return false;
  let host = parseUrlScheme(stripLeadingSpaceAndNewlines(text))?.host;
  return host !== undefined && host.toLowerCase() !== decodePercentRuns(url.hostname).toLowerCase();
}
//@ chunk-395x6mw0.js:333-538 fingerprint (2.1.88 match: KNOWN_PUBLIC_HOSTS, 0.947)
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
//@ chunk-395x6mw0.js:538-710 layout
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
  return KNOWN_PUBLIC_HOSTS.find((host) => host === normalized) ?? "other";
}
//@ chunk-395x6mw0.js:710-762 fingerprint (2.1.88 match: isOfficialRepo, 1)
function isOfficialRepo(urlOrSpec) {
  return urlOrSpec.includes(`anthropics/${CLAUDE_PLUGINS_OFFICIAL}`);
}
//@ chunk-395x6mw0.js:762-1157 fingerprint (2.1.88 match: logPluginFetch, 0.449)
/**
 * 记录插件远程获取遥测 tengu_plugin_remote_fetch（来源类型、主机（公共主机才记明文）、结果、耗时、错误类别）。
 */
function logPluginFetch(source, urlOrSpec, outcome, durationMs, errorKind, isDirectory, submodules) {
  logEvent("tengu_plugin_remote_fetch", {
    source: fromEnum(source),
    host: fromEnum(urlOrSpec ? classifyFetchHost(urlOrSpec) : "unknown"),
    is_official: source === "plugin_catalog" || (urlOrSpec ? isOfficialRepo(urlOrSpec) : false),
    outcome: fromEnum(outcome),
    duration_ms: Math.round(durationMs),
    ...(errorKind && {
      error_kind: fromEnum(errorKind),
    }),
    ...(isDirectory !== undefined
      ? {
          is_directory: isDirectory,
        }
      : {}),
    ...(submodules && {
      submodule_selection: fromEnum(submodules.fetched === "all" ? "all" : "selected"),
      submodules_recorded: submodules.recorded,
      submodules_fetched: submodules.fetched === "all" ? submodules.recorded : submodules.fetched,
    }),
  });
}
//@ chunk-395x6mw0.js:1157-1783 fingerprint (2.1.88 match: classifyFetchError, 1)
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
export { logPluginFetch, classifyFetchError, sshHostMismatch };
