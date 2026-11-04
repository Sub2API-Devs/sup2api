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
import { deferInit } from "../../../runtime/deferred-init.js";

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
function getEntryHelperConsentSubject(consentRequest, archiveUrl) {
  let { entry } = consentRequest;
  return hasHeadersHelper(entry) &&
    entry.headersHelper !== undefined &&
    (!consentRequest.requireInlinedManifest || entry.strict === false)
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
function diffEntryHelperConsent(shownConsent, consent) {
  if (shownConsent === undefined || shownConsent === null) return consent === null ? null : "unshown";
  if (consent === null) return null;
  if (shownConsent.command !== consent.command) return "command";
  if (canonicalMarketplaceUrl(consent.archiveUrl) !== canonicalMarketplaceUrl(shownConsent.archiveUrl))
    return "archive_url";
  return null;
}
//@ chunk-21ppfwx8.js:23285-23338 placement
function canonicalMarketplaceUrl(text) {
  let originUrl = safeOriginUrlRedacted(text);
  return originUrl === null ? text : canonicalFetchSourceUrl(originUrl);
}
//@ chunk-21ppfwx8.js:23338-24313 placement
function checkHeadersHelperConsent(pluginName, refusalKind = "lockdown") {
  let quotedName = quotedPrintable(pluginName);
  if (refusalKind === "organization_unanswered")
    return `"${quotedName}" fetches its archive through a marketplace-declared headersHelper command, which was not run: your organization's settings haven't been read, so it isn't known whether it allows such commands. The plugin was not installed or updated. It can be once your organization's settings are read, if it allows them.`;
  if (refusalKind === "remote_policy_unconsented")
    return `"${quotedName}" fetches its archive through a headersHelper command that was not run: ${REMOTE_POLICY_NOT_APPROVED_MESSAGE}. The plugin was not installed or updated.`;
  return (
    `"${quotedName}" fetches its archive through a marketplace-declared headersHelper command, and your organization's managed settings disable marketplace-declared commands (disableCommandPluginSources / allowManagedHooksOnly). The plugin was not installed or updated and the command was not run; ` +
    (canPolicyDeclarationExemptHelper()
      ? "ask your admin to allow it or to declare the marketplace in managed settings."
      : "ask your admin to allow it.")
  );
}
//@ chunk-21ppfwx8.js:24313-24549 placement
/**
 * helper 被拒原因转失败码。
 */
function helperRefusalFailureCode(refusalKind) {
  switch (refusalKind) {
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
let EntryHelperError; // deferred: uses CommandSourceError (./commandSource.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-21ppfwx8.js:25930", () => {
  EntryHelperError = class EntryHelperError extends CommandSourceError {
    failureCode;
    constructor(message, failureCode) {
      super(message, ENTRY_HELPER_FAILURE_MESSAGES[failureCode]);
      this.failureCode = failureCode;
    }
  };
});
//@ chunk-21ppfwx8.js:26015-26645 placement
function describeHelperReview(diffKind, name, action) {
  let quotedName = quotedPrintable(name);
  let retryHint =
    action === "update"
      ? "Review the command now shown, then update again."
      : "Reopen its details in /plugin to review it, then install again.";
  if (diffKind === "unshown")
    return action === "update"
      ? `This update would run a headersHelper command for "${quotedName}" that was not shown on this pane. ${retryHint}`
      : `This install would run a headersHelper command for "${quotedName}" that was not shown to you first. Retry the same install to review the command before it runs.`;
  return diffKind === "command"
    ? `The headersHelper command for "${quotedName}" changed since it was shown. ${retryHint}`
    : `The archive URL for "${quotedName}" changed since its headersHelper command was shown. ${retryHint}`;
}
//@ chunk-21ppfwx8.js:26645-27507 placement
function headersHelperNotRunReason(options) {
  let trustedSettingsEntryAuth =
    options.trustedSettingsEntryAuth !== undefined &&
    options.trustedSettingsEntryAuth.origin !== "settings" &&
    options.marketplaceSource?.source !== "settings"
      ? undefined
      : options.trustedSettingsEntryAuth;
  if (trustedSettingsEntryAuth !== undefined) {
    let operatorAuthored = trustedSettingsEntryAuth.origin === "settings";
    if (!isSameFetchSource(trustedSettingsEntryAuth.archiveUrl, options.archiveUrl))
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
  if (options.marketplaceSource !== undefined && options.marketplaceSource.source !== "settings")
    return {
      entry: options.entry,
      operatorAuthored: false,
      requireInlinedManifest: true,
    };
  return {
    entry: {
      headers: options.entry.headers,
    },
    operatorAuthored: false,
    requireInlinedManifest: true,
  };
}
//@ chunk-21ppfwx8.js:27507-29861 placement
async function describeHelperDeclaration(source, options) {
  if (source?.source !== "url") return {};
  let trustedDeclaration = options.trustedDeclaration;
  let sourceLabel = `marketplace ${quotedPrintable(options.marketplaceName ?? redactUrlsInText(source.url))}`;
  let sanitize = (headers, origin) =>
    dropMalformedHeader(headers, `${sourceLabel} (${origin})`, {
      operatorAuthored: trustedDeclaration?.operatorAuthored === true,
    });
  let headers = sanitize(
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
  if (trustedDeclaration?.headersHelper === undefined) return headers;
  if (!/^https:\/\//i.test(source.url)) {
    logForDebugging(`${sourceLabel}: headersHelper not run \u2014 marketplace URL is not https`, {
      level: "warn",
    });
    return headers;
  }
  if (isHttpMcpServeInvocation())
    throw new CommandSourceError(
      `${sourceLabel}: a tool server doesn't run a marketplace's headersHelper on its own: the command was not run and the marketplace was not fetched.`,
      "marketplace headersHelper not started by a tool server daemon",
    );
  if (marketplaceNameAnswerState() === "unanswered") await waitForOrganizationAnswer();
  if (marketplaceNameAnswerState() === "unanswered") {
    noteHeldForTheAnswer("marketplace");
    throw new CommandSourceError(
      `${sourceLabel}: your organization's settings haven't been read, so it isn't known whether it allows marketplace-declared commands. This marketplace's headersHelper is one: the command was not run and the marketplace was not fetched. It can be fetched once your organization's settings are read, if it allows them.`,
      "marketplace headersHelper held for the organization answer",
    );
  }
  if (trustedDeclaration.authoredBy === "policySettings" && !policyTierCommandsMayRun()) {
    logFeatureSad("plugin_headers_helper", "remote_policy_unconsented");
    throw new CommandSourceError(
      `${sourceLabel}: headersHelper not run \u2014 ${REMOTE_POLICY_NOT_APPROVED_MESSAGE}. The marketplace was not fetched.`,
      "marketplace headersHelper from remote managed settings not yet verified and approved for the session",
    );
  }
  let canExempt = canPolicyDeclarationExemptHelper();
  let exempted = trustedDeclaration.authoredBy === "policySettings" && canExempt;
  if (areCommandPluginSourcesDisabledByPolicy() && !exempted)
    throw new CommandSourceError(
      `${sourceLabel}: your organization's managed settings disable marketplace-declared commands (disableCommandPluginSources / allowManagedHooksOnly), ` +
        (canExempt
          ? "and this marketplace's headersHelper is not declared in managed settings. The marketplace was not fetched and the command was not run; ask your admin to allow it or to declare the marketplace in managed settings."
          : "and in this session a declaration in managed settings does not exempt a headersHelper. The marketplace was not fetched and the command was not run; ask your admin to allow it."),
      "marketplace headersHelper disabled by managed policy",
    );
  if (!commandSourceRefreshEnabled()) {
    logForDebugging(
      `${sourceLabel}: headersHelper not run \u2014 disabled by the plugin command kill switch`,
      {
        level: "warn",
      },
    );
    return headers;
  }
  let helperHeaders = await runMarketplaceHeadersHelperCached(
    trustedDeclaration.headersHelper,
    source.url,
    options.marketplaceName,
    trustedDeclaration.operatorAuthored,
  );
  return {
    ...headers,
    ...sanitize(helperHeaders, "helper output"),
  };
}
//@ chunk-21ppfwx8.js:29861-29874 placement
var HELPER_TIMEOUT_MS = 60000;
//@ chunk-21ppfwx8.js:29874-30155 placement
async function runMarketplaceHeadersHelperCached(command, url, marketplaceName, operatorAuthored) {
  let memoKey = `${command}\x00${url}\x00${marketplaceName ?? ""}\x00${operatorAuthored ? "operator" : "repo"}`;
  let now = Date.now();
  let { marketplaceHelperMemo } = getPluginRegistry();
  let memoEntry = marketplaceHelperMemo.get(memoKey);
  if (memoEntry && memoEntry.expiresAt > now) return memoEntry.headers;
  let headersPromise = runMarketplaceHeadersHelper(command, url, marketplaceName, operatorAuthored);
  marketplaceHelperMemo.set(memoKey, {
    expiresAt: now + HELPER_TIMEOUT_MS,
    headers: headersPromise,
  });
  try {
    return await headersPromise;
  } catch (error) {
    marketplaceHelperMemo.delete(memoKey);
    throw error;
  }
}
//@ chunk-21ppfwx8.js:30155-30537 placement
/**
 * 以配置目录为 cwd 运行市场声明的 headersHelper（非运营方声明时擦除凭证环境），注入 CLAUDE_CODE_MARKETPLACE_URL/NAME； 失败记 feature bad 并抛错，成功记 ok 返回 header。
 */
async function runMarketplaceHeadersHelper(command, url, marketplaceName, operatorAuthored) {
  let result = await classifyCommandSourceFailure({
    command,
    scrubCredentialEnv: !operatorAuthored,
    isRepoResidentConfig: false,
    cwd: getClaudeConfigDir(),
    env: {
      CLAUDE_CODE_MARKETPLACE_URL: url,
      ...(marketplaceName !== undefined && {
        CLAUDE_CODE_MARKETPLACE_NAME: marketplaceName,
      }),
    },
  });
  if (!result.ok) {
    logFeatureBad("plugin_headers_helper", result.reason);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `marketplace headersHelper failed (${result.reason})`,
      "marketplace headers helper failed",
    );
  }
  logFeatureOk("plugin_headers_helper");
  return result.headers;
}
//@ chunk-21ppfwx8.js:30537-31205 placement
/**
 * 运行插件市场声明的 headersHelper 取得下载请求头
 */
async function runHeadersHelper(entry, options) {
  let sanitize = (headers) =>
    dropMalformedHeader(headers, `plugin ${quotedPrintable(options.pluginName)}`, {
      operatorAuthored: options.operatorAuthored === true,
    });
  let baseHeaders = sanitize(entry.headers ?? {});
  if (!hasHeadersHelper(entry) || entry.headersHelper === undefined) return baseHeaders;
  checkHeadersHelperStrict(entry, {
    ...options,
    disabledByPolicy: headersHelperPolicyRefusal(options.marketplaceSource, options.marketplaceName),
  });
  let result = await classifyCommandSourceFailure({
    command: entry.headersHelper,
    scrubCredentialEnv: !options.operatorAuthored,
    cwd: getClaudeConfigDir(),
    isRepoResidentConfig: false,
    env: {
      CLAUDE_CODE_PLUGIN_NAME: options.pluginName,
      CLAUDE_CODE_PLUGIN_ARCHIVE_URL: options.archiveUrl,
    },
  });
  if (!result.ok) {
    logFeatureBad("plugin_headers_helper", result.reason);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `plugin headersHelper for "${printableQuoted(options.pluginName)}" failed (${result.reason})`,
      "plugin headers helper failed",
    );
  }
  logFeatureOk("plugin_headers_helper");
  return {
    ...baseHeaders,
    ...sanitize(result.headers),
  };
}
//@ chunk-21ppfwx8.js:31205-31583 placement
/**
 * helper 不得设置的 header（host/cookie/转发 IP/逐跳头等）。
 */
var FORBIDDEN_HELPER_HEADERS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var FORBIDDEN_HELPER_HEADER_PREFIXES;
var HTTP_TOKEN_RE;
deferInit("chunk-21ppfwx8.js:31205", () => {
  FORBIDDEN_HELPER_HEADERS = new Set([
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
  FORBIDDEN_HELPER_HEADER_PREFIXES = ["x-forwarded-", "x-original-", "proxy-"];
  HTTP_TOKEN_RE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
});
//@ chunk-21ppfwx8.js:31583-31689 placement
/**
 * header 名（_ 视为 -）在禁止列表或以禁止前缀开头。
 */
function isForbiddenHelperHeader(headerName) {
  let replaced = headerName.toLowerCase().replaceAll("_", "-");
  return (
    FORBIDDEN_HELPER_HEADERS.has(replaced) ||
    FORBIDDEN_HELPER_HEADER_PREFIXES.some((prefix) => replaced.startsWith(prefix))
  );
}
//@ chunk-21ppfwx8.js:31689-32076 placement
function dropMalformedHeader(headers, context, { operatorAuthored = false } = {}) {
  let kept = {};
  for (let [key, value] of Object.entries(headers)) {
    if (!HTTP_TOKEN_RE.test(key) || /[\r\n\0]/.test(value)) {
      logForDebugging(`Dropping header "${quotedPrintable(key)}" for ${context}: malformed name or value`, {
        level: "warn",
      });
      continue;
    }
    if (!operatorAuthored && isForbiddenHelperHeader(key)) {
      logForDebugging(
        `Dropping header "${quotedPrintable(key)}" for ${context}: request-routing/identity headers are not accepted from non-operator sources`,
        {
          level: "warn",
        },
      );
      continue;
    }
    kept[key] = value;
  }
  return kept;
}
//@ chunk-21ppfwx8.js:32076-32103 placement
function printableQuoted(pluginName) {
  return quotedPrintable(pluginName);
}
//@ chunk-21ppfwx8.js:32103-32894 placement
function checkHeadersHelperStrict(entry, options) {
  if (options.disabledByPolicy !== null) {
    if (options.disabledByPolicy === "organization_unanswered") noteHeldForTheAnswer();
    throw new EntryHelperError(
      checkHeadersHelperConsent(options.pluginName, options.disabledByPolicy),
      helperRefusalFailureCode(options.disabledByPolicy),
    );
  }
  if (options.requireInlinedManifest !== false && entry.strict !== false)
    throw new EntryHelperError(
      `Plugin "${printableQuoted(options.pluginName)}" declares a headersHelper but is not strict:false \u2014 an entry with headersHelper must inline its manifest so its capabilities can be reviewed before the command runs.`,
      "entry_helper_not_inlined",
    );
  if (!options.runEntryHelper)
    throw new EntryHelperError(
      `Plugin "${printableQuoted(options.pluginName)}" fetches its archive through a headersHelper, ` +
        "which only runs when you install or update it from its own details view \u2014 open this plugin in /plugin (or run `claude plugin install`/`update`), where the command is shown first.",
      "entry_helper_deferred",
    );
}
//@ chunk-21ppfwx8.js:32894-33863 placement
/**
 * archive 源插件下载前计算请求头：检查条目 helper 的 strict 约束与策略拒绝；归档 URL 与市场 URL 同源时带上市场声明的 header， 再合并条目 headersHelper 的结果。无 header 返回 undefined，否则 {url, headers}。
 */
async function resolveArchiveDownloadHeaders(options) {
  if (typeof options.pluginSource !== "object" || options.pluginSource.source !== "archive") return;
  let url = options.pluginSource.url;
  let { entry, operatorAuthored, requireInlinedManifest } = headersHelperNotRunReason({
    entry: options.entry,
    archiveUrl: url,
    marketplaceSource: options.marketplaceSource,
    trustedSettingsEntryAuth: options.trustedSettingsEntryAuth,
  });
  let url_2 = options.marketplaceSource?.source === "url" ? options.marketplaceSource.url : undefined;
  let disabledByPolicy = headersHelperPolicyRefusal(options.marketplaceSource, options.marketplaceName);
  if (hasHeadersHelper(entry))
    checkHeadersHelperStrict(entry, {
      pluginName: options.pluginName,
      runEntryHelper: options.runEntryHelper,
      requireInlinedManifest,
      operatorAuthored,
      disabledByPolicy,
    });
  let marketplaceHeaders =
    url_2 !== undefined && sameOrigin(url_2, url)
      ? await describeHelperDeclaration(options.marketplaceSource, {
          marketplaceName: options.marketplaceName,
          trustedDeclaration: options.trustedMarketplaceAuth,
        })
      : {};
  let entryHeaders = await runHeadersHelper(entry, {
    pluginName: options.pluginName,
    archiveUrl: url,
    runEntryHelper: options.runEntryHelper,
    requireInlinedManifest,
    operatorAuthored,
    marketplaceSource: options.marketplaceSource,
    marketplaceName: options.marketplaceName,
  });
  let headers = {
    ...marketplaceHeaders,
    ...entryHeaders,
  };
  if (Object.keys(headers).length === 0) return;
  return {
    url,
    headers,
  };
}
//@ chunk-21ppfwx8.js:33863-33922 placement
/**
 * marketplaceSourceOfEntry：某市场条目的来源。
 */
function marketplaceSourceOfEntry(pluginId, knownMarketplaces) {
  let marketplaceName = marketplaceNameOfId(pluginId);
  return marketplaceName ? knownMarketplaces[marketplaceName]?.source : undefined;
}
//@ chunk-21ppfwx8.js:33922-33994 placement
/**
 * marketplaceNameOfId：从插件 id 取市场名。
 */
function marketplaceNameOfId(pluginId) {
  let parts = pluginId.split("@");
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
function urlHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
//@ chunk-21ppfwx8.js:34096-34205 placement
/**
 * 沿 cause 链（最多 5 层）找 TelemetrySafeError。
 */
function findTelemetrySafeCause(error) {
  let current = error;
  for (let i = 0; i < 5 && current instanceof Error; i++) {
    if (current instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) return current;
    current = current.cause;
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
