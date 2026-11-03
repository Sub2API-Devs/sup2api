/**
 * utils/plugins/headersHelper.ts
 *
 * 插件市场 headersHelper（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-21ppfwx8.js (29)
 * attribution: placement 29
 */
import { hasHeadersHelper } from "../../services/mcp/types.js";
import { safeOriginUrlRedacted, redactUrlsInText } from "../redaction/urlRedaction.js";
import {
  canonicalFetchSourceUrl,
  REMOTE_POLICY_NOT_APPROVED_MESSAGE,
  canPolicyDeclarationExemptHelper,
  policyTierCommandsMayRun,
  noteHeldForTheAnswer,
  areCommandPluginSourcesDisabledByPolicy,
  headersHelperPolicyRefusal,
} from "./marketplacePolicy.js";
import { quotedPrintable } from "../printableName.js";
import {
  CommandSourceError,
  waitForOrganizationAnswer,
  commandSourceRefreshEnabled,
  classifyCommandSourceFailure,
} from "./commandSource.js";
import { logForDebugging } from "../debug.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import { marketplaceNameAnswerState } from "./marketplaceNames.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { getClaudeConfigDir } from "../envUtils.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { sameOrigin } from "../network/privateHostCheck.js";

//@ chunk-21ppfwx8.js:22803-22915 placement
/**
 * 安装时 headersHelper 同意不匹配的失败码映射（unshown/command/archive_url）。
 */
var HELPER_CONSENT_MISMATCH_CODES = {
  unshown: "entry_helper_unshown",
  command: "entry_helper_changed",
  archive_url: "entry_archive_url_changed",
};
//@ chunk-21ppfwx8.js:22915-23076 placement
/**
 * 条目声明了 headersHelper（且满足内联要求）时返回待同意的命令与归档 URL。
 */
function getEntryHelperConsentSubject(e, archiveUrl) {
  let { entry } = e;
  return hasHeadersHelper(entry) &&
    entry.headersHelper !== undefined &&
    (!e.requireInlinedManifest || entry.strict === false)
    ? {
        command: entry.headersHelper,
        archiveUrl,
      }
    : null;
}
//@ chunk-21ppfwx8.js:23076-23285 placement
/**
 * 比较展示过的与当前的 helper 同意内容，返回 unshown/command/archive_url/null。
 */
function diffEntryHelperConsent(e, n) {
  if (e === undefined || e === null) return n === null ? null : "unshown";
  if (n === null) return null;
  if (e.command !== n.command) return "command";
  if (canonicalMarketplaceUrl(n.archiveUrl) !== canonicalMarketplaceUrl(e.archiveUrl)) return "archive_url";
  return null;
}
//@ chunk-21ppfwx8.js:23285-23338 placement
function canonicalMarketplaceUrl(archiveUrl) {
  let n = safeOriginUrlRedacted(archiveUrl);
  return n === null ? archiveUrl : canonicalFetchSourceUrl(n);
}
//@ chunk-21ppfwx8.js:23338-24313 placement
function checkHeadersHelperConsent(e, n = "lockdown") {
  let r = quotedPrintable(e);
  if (n === "organization_unanswered")
    return `"${r}" fetches its archive through a marketplace-declared headersHelper command, which was not run: your organization's settings haven't been read, so it isn't known whether it allows such commands. The plugin was not installed or updated. It can be once your organization's settings are read, if it allows them.`;
  if (n === "remote_policy_unconsented")
    return `"${r}" fetches its archive through a headersHelper command that was not run: ${REMOTE_POLICY_NOT_APPROVED_MESSAGE}. The plugin was not installed or updated.`;
  return (
    `"${r}" fetches its archive through a marketplace-declared headersHelper command, and your organization's managed settings disable marketplace-declared commands (disableCommandPluginSources / allowManagedHooksOnly). The plugin was not installed or updated and the command was not run; ` +
    (canPolicyDeclarationExemptHelper()
      ? "ask your admin to allow it or to declare the marketplace in managed settings."
      : "ask your admin to allow it.")
  );
}
//@ chunk-21ppfwx8.js:24313-24549 placement
/**
 * helper 被拒原因转失败码。
 */
function helperRefusalFailureCode(e) {
  switch (e) {
    case "remote_policy_unconsented":
      return "entry_helper_remote_policy_unconsented";
    case "organization_unanswered":
      return "entry_helper_organization_unanswered";
    case "lockdown":
      return "entry_helper_disabled_by_policy";
  }
}
//@ chunk-21ppfwx8.js:24549-25434 placement
/**
 * 各 entry_helper_* 失败码的遥测安全消息。
 */
var ENTRY_HELPER_FAILURE_MESSAGES = {
  entry_helper_unshown: "plugin entry helper consent mismatch at install: entry_helper_unshown",
  entry_helper_changed: "plugin entry helper consent mismatch at install: entry_helper_changed",
  entry_archive_url_changed: "plugin entry helper consent mismatch at install: entry_archive_url_changed",
  entry_helper_deferred: "plugin headers helper deferred to explicit install",
  entry_helper_disabled_by_policy: "plugin entry helper disabled by managed policy",
  entry_helper_unconfirmed: "plugin entry helper unconfirmed at install (nothing was announced)",
  entry_helper_not_inlined: "plugin entry headersHelper requires strict:false (catalog authoring error)",
  entry_helper_remote_policy_unconsented:
    "plugin entry helper declared by remote managed settings not yet verified and approved for the session",
  entry_helper_organization_unanswered: "plugin entry helper held for the organization answer",
};
//@ chunk-21ppfwx8.js:25434-25471 placement
function isSadHelperFailure(failureCode) {
  return ENTRY_HELPER_FAILURE_SEVERITY[failureCode] === "sad";
}
//@ chunk-21ppfwx8.js:25471-25783 placement
/**
 * 各 entry_helper_* 失败码的严重度（sad/bad）。
 */
var ENTRY_HELPER_FAILURE_SEVERITY = {
  entry_helper_unshown: "sad",
  entry_helper_changed: "sad",
  entry_archive_url_changed: "sad",
  entry_helper_deferred: "sad",
  entry_helper_disabled_by_policy: "sad",
  entry_helper_unconfirmed: "sad",
  entry_helper_remote_policy_unconsented: "sad",
  entry_helper_organization_unanswered: "sad",
  entry_helper_not_inlined: "bad",
};
//@ chunk-21ppfwx8.js:25783-25930 placement
/**
 * 命令源拒绝错误转 {code, kind}。
 */
function classifyCommandSourceError(error) {
  if (error instanceof EntryHelperError)
    return {
      code: error.failureCode,
      kind: isSadHelperFailure(error.failureCode) ? "sad" : "bad",
    };
  return {
    code: "command_source_refused",
    kind: "sad",
  };
}
//@ chunk-21ppfwx8.js:25930-26015 placement
/**
 * EntryHelperError：市场 header helper 错误类。
 */
class EntryHelperError extends CommandSourceError {
  failureCode;
  constructor(e, n) {
    super(e, ENTRY_HELPER_FAILURE_MESSAGES[n]);
    this.failureCode = n;
  }
}
//@ chunk-21ppfwx8.js:26015-26645 placement
function describeHelperReview(e, name, r) {
  let i = quotedPrintable(name);
  let o =
    r === "update"
      ? "Review the command now shown, then update again."
      : "Reopen its details in /plugin to review it, then install again.";
  if (e === "unshown")
    return r === "update"
      ? `This update would run a headersHelper command for "${i}" that was not shown on this pane. ${o}`
      : `This install would run a headersHelper command for "${i}" that was not shown to you first. Retry the same install to review the command before it runs.`;
  return e === "command"
    ? `The headersHelper command for "${i}" changed since it was shown. ${o}`
    : `The archive URL for "${i}" changed since its headersHelper command was shown. ${o}`;
}
//@ chunk-21ppfwx8.js:26645-27507 placement
function headersHelperNotRunReason(e) {
  let trustedSettingsEntryAuth =
    e.trustedSettingsEntryAuth !== undefined &&
    e.trustedSettingsEntryAuth.origin !== "settings" &&
    e.marketplaceSource?.source !== "settings"
      ? undefined
      : e.trustedSettingsEntryAuth;
  if (trustedSettingsEntryAuth !== undefined) {
    let operatorAuthored = trustedSettingsEntryAuth.origin === "settings";
    if (!isSameFetchSource(trustedSettingsEntryAuth.archiveUrl, e.archiveUrl))
      return {
        entry: {},
        operatorAuthored,
        requireInlinedManifest: false,
      };
    if (
      trustedSettingsEntryAuth.headersHelper !== undefined &&
      trustedSettingsEntryAuth.operatorTier === "policySettings" &&
      !policyTierCommandsMayRun()
    )
      throw new EntryHelperError(
        `This plugin's headersHelper was not run: ${REMOTE_POLICY_NOT_APPROVED_MESSAGE}.`,
        "entry_helper_remote_policy_unconsented",
      );
    return {
      entry: {
        headers: trustedSettingsEntryAuth.headers,
        headersHelper:
          trustedSettingsEntryAuth.origin === "addDir" ? undefined : trustedSettingsEntryAuth.headersHelper,
      },
      operatorAuthored,
      requireInlinedManifest: false,
    };
  }
  if (e.marketplaceSource !== undefined && e.marketplaceSource.source !== "settings")
    return {
      entry: e.entry,
      operatorAuthored: false,
      requireInlinedManifest: true,
    };
  return {
    entry: {
      headers: e.entry.headers,
    },
    operatorAuthored: false,
    requireInlinedManifest: true,
  };
}
//@ chunk-21ppfwx8.js:27507-29861 placement
async function describeHelperDeclaration(source, n) {
  if (source?.source !== "url") return {};
  let trustedDeclaration = n.trustedDeclaration;
  let i = `marketplace ${quotedPrintable(n.marketplaceName ?? redactUrlsInText(source.url))}`;
  let o = (h, p) =>
    dropMalformedHeader(h, `${i} (${p})`, {
      operatorAuthored: trustedDeclaration?.operatorAuthored === true,
    });
  let a = o(
    trustedDeclaration
      ? {
          ...trustedDeclaration.headers,
        }
      : {
          ...source.headers,
        },
    trustedDeclaration
      ? trustedDeclaration.operatorAuthored
        ? "operator declaration"
        : "repo-tier declaration"
      : "state copy",
  );
  if (trustedDeclaration?.headersHelper === undefined) return a;
  if (!/^https:\/\//i.test(source.url)) {
    logForDebugging(`${i}: headersHelper not run \u2014 marketplace URL is not https`, {
      level: "warn",
    });
    return a;
  }
  if (isHttpMcpServeInvocation())
    throw new CommandSourceError(
      `${i}: a tool server doesn't run a marketplace's headersHelper on its own: the command was not run and the marketplace was not fetched.`,
      "marketplace headersHelper not started by a tool server daemon",
    );
  if (marketplaceNameAnswerState() === "unanswered") await waitForOrganizationAnswer();
  if (marketplaceNameAnswerState() === "unanswered") {
    noteHeldForTheAnswer("marketplace");
    throw new CommandSourceError(
      `${i}: your organization's settings haven't been read, so it isn't known whether it allows marketplace-declared commands. This marketplace's headersHelper is one: the command was not run and the marketplace was not fetched. It can be fetched once your organization's settings are read, if it allows them.`,
      "marketplace headersHelper held for the organization answer",
    );
  }
  if (trustedDeclaration.authoredBy === "policySettings" && !policyTierCommandsMayRun()) {
    logFeatureSad("plugin_headers_helper", "remote_policy_unconsented");
    throw new CommandSourceError(
      `${i}: headersHelper not run \u2014 ${REMOTE_POLICY_NOT_APPROVED_MESSAGE}. The marketplace was not fetched.`,
      "marketplace headersHelper from remote managed settings not yet verified and approved for the session",
    );
  }
  let c = canPolicyDeclarationExemptHelper();
  let s = trustedDeclaration.authoredBy === "policySettings" && c;
  if (areCommandPluginSourcesDisabledByPolicy() && !s)
    throw new CommandSourceError(
      `${i}: your organization's managed settings disable marketplace-declared commands (disableCommandPluginSources / allowManagedHooksOnly), ` +
        (c
          ? "and this marketplace's headersHelper is not declared in managed settings. The marketplace was not fetched and the command was not run; ask your admin to allow it or to declare the marketplace in managed settings."
          : "and in this session a declaration in managed settings does not exempt a headersHelper. The marketplace was not fetched and the command was not run; ask your admin to allow it."),
      "marketplace headersHelper disabled by managed policy",
    );
  if (!commandSourceRefreshEnabled()) {
    logForDebugging(`${i}: headersHelper not run \u2014 disabled by the plugin command kill switch`, {
      level: "warn",
    });
    return a;
  }
  let u = await runMarketplaceHeadersHelperCached(
    trustedDeclaration.headersHelper,
    source.url,
    n.marketplaceName,
    trustedDeclaration.operatorAuthored,
  );
  return {
    ...a,
    ...o(u, "helper output"),
  };
}
//@ chunk-21ppfwx8.js:29861-29874 placement
var HELPER_TIMEOUT_MS = 60000;
//@ chunk-21ppfwx8.js:29874-30155 placement
async function runMarketplaceHeadersHelperCached(command, url, marketplaceName, operatorAuthored) {
  let o = `${command}\x00${url}\x00${marketplaceName ?? ""}\x00${operatorAuthored ? "operator" : "repo"}`;
  let now = Date.now();
  let { marketplaceHelperMemo } = getPluginRegistry();
  let s = marketplaceHelperMemo.get(o);
  if (s && s.expiresAt > now) return s.headers;
  let u = runMarketplaceHeadersHelper(command, url, marketplaceName, operatorAuthored);
  marketplaceHelperMemo.set(o, {
    expiresAt: now + HELPER_TIMEOUT_MS,
    headers: u,
  });
  try {
    return await u;
  } catch (error) {
    marketplaceHelperMemo.delete(o);
    throw error;
  }
}
//@ chunk-21ppfwx8.js:30155-30537 placement
/**
 * 以配置目录为 cwd 运行市场声明的 headersHelper（非运营方声明时擦除凭证环境），注入 CLAUDE_CODE_MARKETPLACE_URL/NAME； 失败记 feature bad 并抛错，成功记 ok 返回 header。
 */
async function runMarketplaceHeadersHelper(command, n, r, i) {
  let o = await classifyCommandSourceFailure({
    command,
    scrubCredentialEnv: !i,
    isRepoResidentConfig: false,
    cwd: getClaudeConfigDir(),
    env: {
      CLAUDE_CODE_MARKETPLACE_URL: n,
      ...(r !== undefined && {
        CLAUDE_CODE_MARKETPLACE_NAME: r,
      }),
    },
  });
  if (!o.ok) {
    logFeatureBad("plugin_headers_helper", o.reason);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `marketplace headersHelper failed (${o.reason})`,
      "marketplace headers helper failed",
    );
  }
  logFeatureOk("plugin_headers_helper");
  return o.headers;
}
//@ chunk-21ppfwx8.js:30537-31205 placement
/**
 * 运行插件市场声明的 headersHelper 取得下载请求头
 */
async function runHeadersHelper(entry, n) {
  let r = (headers) =>
    dropMalformedHeader(headers, `plugin ${quotedPrintable(n.pluginName)}`, {
      operatorAuthored: n.operatorAuthored === true,
    });
  let i = r(entry.headers ?? {});
  if (!hasHeadersHelper(entry) || entry.headersHelper === undefined) return i;
  checkHeadersHelperStrict(entry, {
    ...n,
    disabledByPolicy: headersHelperPolicyRefusal(n.marketplaceSource, n.marketplaceName),
  });
  let o = await classifyCommandSourceFailure({
    command: entry.headersHelper,
    scrubCredentialEnv: !n.operatorAuthored,
    cwd: getClaudeConfigDir(),
    isRepoResidentConfig: false,
    env: {
      CLAUDE_CODE_PLUGIN_NAME: n.pluginName,
      CLAUDE_CODE_PLUGIN_ARCHIVE_URL: n.archiveUrl,
    },
  });
  if (!o.ok) {
    logFeatureBad("plugin_headers_helper", o.reason);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `plugin headersHelper for "${printableQuoted(n.pluginName)}" failed (${o.reason})`,
      "plugin headers helper failed",
    );
  }
  logFeatureOk("plugin_headers_helper");
  return {
    ...i,
    ...r(o.headers),
  };
}
//@ chunk-21ppfwx8.js:31205-31583 placement
/**
 * helper 不得设置的 header（host/cookie/转发 IP/逐跳头等）。
 */
var FORBIDDEN_HELPER_HEADERS = new Set([
  "host",
  "cookie",
  "forwarded",
  "x-real-ip",
  "x-client-ip",
  "true-client-ip",
  "client-ip",
  "cf-connecting-ip",
  "fastly-client-ip",
  "x-originating-ip",
  "x-remote-ip",
  "x-remote-addr",
  "x-cluster-client-ip",
  "connection",
  "upgrade",
  "transfer-encoding",
  "content-length",
  "te",
  "trailer",
  "expect",
  "via",
]);
var FORBIDDEN_HELPER_HEADER_PREFIXES = ["x-forwarded-", "x-original-", "proxy-"];
var HTTP_TOKEN_RE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
//@ chunk-21ppfwx8.js:31583-31689 placement
/**
 * header 名（_ 视为 -）在禁止列表或以禁止前缀开头。
 */
function isForbiddenHelperHeader(e) {
  let replaced = e.toLowerCase().replaceAll("_", "-");
  return (
    FORBIDDEN_HELPER_HEADERS.has(replaced) ||
    FORBIDDEN_HELPER_HEADER_PREFIXES.some((r) => replaced.startsWith(r))
  );
}
//@ chunk-21ppfwx8.js:31689-32076 placement
function dropMalformedHeader(headers, n, { operatorAuthored: r = false } = {}) {
  let i = {};
  for (let [key, value] of Object.entries(headers)) {
    if (!HTTP_TOKEN_RE.test(key) || /[\r\n\0]/.test(value)) {
      logForDebugging(`Dropping header "${quotedPrintable(key)}" for ${n}: malformed name or value`, {
        level: "warn",
      });
      continue;
    }
    if (!r && isForbiddenHelperHeader(key)) {
      logForDebugging(
        `Dropping header "${quotedPrintable(key)}" for ${n}: request-routing/identity headers are not accepted from non-operator sources`,
        {
          level: "warn",
        },
      );
      continue;
    }
    i[key] = value;
  }
  return i;
}
//@ chunk-21ppfwx8.js:32076-32103 placement
function printableQuoted(pluginName) {
  return quotedPrintable(pluginName);
}
//@ chunk-21ppfwx8.js:32103-32894 placement
function checkHeadersHelperStrict(e, n) {
  if (n.disabledByPolicy !== null) {
    if (n.disabledByPolicy === "organization_unanswered") noteHeldForTheAnswer();
    throw new EntryHelperError(
      checkHeadersHelperConsent(n.pluginName, n.disabledByPolicy),
      helperRefusalFailureCode(n.disabledByPolicy),
    );
  }
  if (n.requireInlinedManifest !== false && e.strict !== false)
    throw new EntryHelperError(
      `Plugin "${printableQuoted(n.pluginName)}" declares a headersHelper but is not strict:false \u2014 an entry with headersHelper must inline its manifest so its capabilities can be reviewed before the command runs.`,
      "entry_helper_not_inlined",
    );
  if (!n.runEntryHelper)
    throw new EntryHelperError(
      `Plugin "${printableQuoted(n.pluginName)}" fetches its archive through a headersHelper, ` +
        "which only runs when you install or update it from its own details view \u2014 open this plugin in /plugin (or run `claude plugin install`/`update`), where the command is shown first.",
      "entry_helper_deferred",
    );
}
//@ chunk-21ppfwx8.js:32894-33863 placement
/**
 * archive 源插件下载前计算请求头：检查条目 helper 的 strict 约束与策略拒绝；归档 URL 与市场 URL 同源时带上市场声明的 header， 再合并条目 headersHelper 的结果。无 header 返回 undefined，否则 {url, headers}。
 */
async function resolveArchiveDownloadHeaders(e) {
  if (typeof e.pluginSource !== "object" || e.pluginSource.source !== "archive") return;
  let url = e.pluginSource.url;
  let { entry, operatorAuthored, requireInlinedManifest } = headersHelperNotRunReason({
    entry: e.entry,
    archiveUrl: url,
    marketplaceSource: e.marketplaceSource,
    trustedSettingsEntryAuth: e.trustedSettingsEntryAuth,
  });
  let url_2 = e.marketplaceSource?.source === "url" ? e.marketplaceSource.url : undefined;
  let disabledByPolicy = headersHelperPolicyRefusal(e.marketplaceSource, e.marketplaceName);
  if (hasHeadersHelper(entry))
    checkHeadersHelperStrict(entry, {
      pluginName: e.pluginName,
      runEntryHelper: e.runEntryHelper,
      requireInlinedManifest,
      operatorAuthored,
      disabledByPolicy,
    });
  let s =
    url_2 !== undefined && sameOrigin(url_2, url)
      ? await describeHelperDeclaration(e.marketplaceSource, {
          marketplaceName: e.marketplaceName,
          trustedDeclaration: e.trustedMarketplaceAuth,
        })
      : {};
  let u = await runHeadersHelper(entry, {
    pluginName: e.pluginName,
    archiveUrl: url,
    runEntryHelper: e.runEntryHelper,
    requireInlinedManifest,
    operatorAuthored,
    marketplaceSource: e.marketplaceSource,
    marketplaceName: e.marketplaceName,
  });
  let h = {
    ...s,
    ...u,
  };
  if (Object.keys(h).length === 0) return;
  return {
    url,
    headers: h,
  };
}
//@ chunk-21ppfwx8.js:33863-33922 placement
/**
 * marketplaceSourceOfEntry：某市场条目的来源。
 */
function marketplaceSourceOfEntry(e, knownMarketplaces) {
  let r = marketplaceNameOfId(e);
  return r ? knownMarketplaces[r]?.source : undefined;
}
//@ chunk-21ppfwx8.js:33922-33994 placement
/**
 * marketplaceNameOfId：从插件 id 取市场名。
 */
function marketplaceNameOfId(e) {
  let parts = e.split("@");
  return parts.length === 2 && parts[1] ? parts[1] : undefined;
}
//@ chunk-21ppfwx8.js:33994-34034 placement
function isSameFetchSource(archiveUrl, archiveUrl_2) {
  return canonicalFetchSourceUrl(archiveUrl) === canonicalFetchSourceUrl(archiveUrl_2);
}
//@ chunk-21ppfwx8.js:34034-34096 placement
/**
 * urlHostname：取 URL 主机名，失败返回空串。
 */
function urlHostname(e) {
  try {
    return new URL(e).hostname;
  } catch {
    return "";
  }
}
//@ chunk-21ppfwx8.js:34096-34205 placement
/**
 * 沿 cause 链（最多 5 层）找 TelemetrySafeError。
 */
function findTelemetrySafeCause(error) {
  let n = error;
  for (let i = 0; i < 5 && n instanceof Error; i++) {
    if (n instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) return n;
    n = n.cause;
  }
  return;
}
export {
  classifyCommandSourceError,
  marketplaceSourceOfEntry,
  ENTRY_HELPER_FAILURE_SEVERITY,
  marketplaceNameOfId,
  EntryHelperError,
  headersHelperNotRunReason,
  getEntryHelperConsentSubject,
  checkHeadersHelperConsent,
  helperRefusalFailureCode,
  diffEntryHelperConsent,
  describeHelperReview,
  HELPER_CONSENT_MISMATCH_CODES,
  resolveArchiveDownloadHeaders,
  findTelemetrySafeCause,
  urlHostname,
  isForbiddenHelperHeader,
  describeHelperDeclaration,
  dropMalformedHeader,
};
