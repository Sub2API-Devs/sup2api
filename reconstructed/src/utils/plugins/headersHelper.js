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
import { QDn, redactUrlsInText } from "../redaction/urlRedaction.js";
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
import { Bd, waitForOrganizationAnswer, B, classifyCommandSourceFailure } from "./commandSource.js";
import { logForDebugging } from "../debug.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import { J_ } from "./marketplaceNames.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { getClaudeConfigDir } from "../envUtils.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { sameOrigin } from "../network/privateHostCheck.js";

/**
 * 安装时 headersHelper 同意不匹配的失败码映射（unshown/command/archive_url）。
 */
//@ chunk-21ppfwx8.js:22803-22915 placement
var HELPER_CONSENT_MISMATCH_CODES = {
  unshown: "entry_helper_unshown",
  command: "entry_helper_changed",
  archive_url: "entry_archive_url_changed",
};
/**
 * 条目声明了 headersHelper（且满足内联要求）时返回待同意的命令与归档 URL。
 */
//@ chunk-21ppfwx8.js:22915-23076 placement
function getEntryHelperConsentSubject(e, n) {
  let { entry: entry } = e;
  return hasHeadersHelper(entry) &&
    entry.headersHelper !== void 0 &&
    (!e.requireInlinedManifest || entry.strict === !1)
    ? { command: entry.headersHelper, archiveUrl: n }
    : null;
}
/**
 * 比较展示过的与当前的 helper 同意内容，返回 unshown/command/archive_url/null。
 */
//@ chunk-21ppfwx8.js:23076-23285 placement
function diffEntryHelperConsent(e, n) {
  if (e === void 0 || e === null) return n === null ? null : "unshown";
  if (n === null) return null;
  if (e.command !== n.command) return "command";
  if (ke(n.archiveUrl) !== ke(e.archiveUrl)) return "archive_url";
  return null;
}
//@ chunk-21ppfwx8.js:23285-23338 placement
function ke(e) {
  let n = QDn(e);
  return n === null ? e : canonicalFetchSourceUrl(n);
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
/**
 * helper 被拒原因转失败码。
 */
//@ chunk-21ppfwx8.js:24313-24549 placement
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
/**
 * 各 entry_helper_* 失败码的遥测安全消息。
 */
//@ chunk-21ppfwx8.js:24549-25434 placement
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
function mt(e) {
  return ENTRY_HELPER_FAILURE_SEVERITY[e] === "sad";
}
/**
 * 各 entry_helper_* 失败码的严重度（sad/bad）。
 */
//@ chunk-21ppfwx8.js:25471-25783 placement
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
/**
 * 命令源拒绝错误转 {code, kind}。
 */
//@ chunk-21ppfwx8.js:25783-25930 placement
function classifyCommandSourceError(e) {
  if (e instanceof Eie) return { code: e.failureCode, kind: mt(e.failureCode) ? "sad" : "bad" };
  return { code: "command_source_refused", kind: "sad" };
}
//@ chunk-21ppfwx8.js:25930-26015 placement
class Eie extends Bd {
  failureCode;
  constructor(e, n) {
    super(e, ENTRY_HELPER_FAILURE_MESSAGES[n]);
    this.failureCode = n;
  }
}
//@ chunk-21ppfwx8.js:26015-26645 placement
function describeHelperReview(e, n, r) {
  let i = quotedPrintable(n),
    o =
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
  let n =
    e.trustedSettingsEntryAuth !== void 0 &&
    e.trustedSettingsEntryAuth.origin !== "settings" &&
    e.marketplaceSource?.source !== "settings"
      ? void 0
      : e.trustedSettingsEntryAuth;
  if (n !== void 0) {
    let r = n.origin === "settings";
    if (!vt(n.archiveUrl, e.archiveUrl))
      return { entry: {}, operatorAuthored: r, requireInlinedManifest: !1 };
    if (n.headersHelper !== void 0 && n.operatorTier === "policySettings" && !policyTierCommandsMayRun())
      throw new Eie(
        `This plugin's headersHelper was not run: ${REMOTE_POLICY_NOT_APPROVED_MESSAGE}.`,
        "entry_helper_remote_policy_unconsented",
      );
    return {
      entry: { headers: n.headers, headersHelper: n.origin === "addDir" ? void 0 : n.headersHelper },
      operatorAuthored: r,
      requireInlinedManifest: !1,
    };
  }
  if (e.marketplaceSource !== void 0 && e.marketplaceSource.source !== "settings")
    return { entry: e.entry, operatorAuthored: !1, requireInlinedManifest: !0 };
  return { entry: { headers: e.entry.headers }, operatorAuthored: !1, requireInlinedManifest: !0 };
}
//@ chunk-21ppfwx8.js:27507-29861 placement
async function describeHelperDeclaration(e, n) {
  if (e?.source !== "url") return {};
  let trustedDeclaration = n.trustedDeclaration,
    i = `marketplace ${quotedPrintable(n.marketplaceName ?? redactUrlsInText(e.url))}`,
    o = (h, p) =>
      dropMalformedHeader(h, `${i} (${p})`, {
        operatorAuthored: trustedDeclaration?.operatorAuthored === !0,
      }),
    a = o(
      trustedDeclaration ? { ...trustedDeclaration.headers } : { ...e.headers },
      trustedDeclaration
        ? trustedDeclaration.operatorAuthored
          ? "operator declaration"
          : "repo-tier declaration"
        : "state copy",
    );
  if (trustedDeclaration?.headersHelper === void 0) return a;
  if (!/^https:\/\//i.test(e.url))
    return (
      logForDebugging(`${i}: headersHelper not run \u2014 marketplace URL is not https`, { level: "warn" }),
      a
    );
  if (isHttpMcpServeInvocation())
    throw new Bd(
      `${i}: a tool server doesn't run a marketplace's headersHelper on its own: the command was not run and the marketplace was not fetched.`,
      "marketplace headersHelper not started by a tool server daemon",
    );
  if (J_() === "unanswered") await waitForOrganizationAnswer();
  if (J_() === "unanswered")
    throw (
      noteHeldForTheAnswer("marketplace"),
      new Bd(
        `${i}: your organization's settings haven't been read, so it isn't known whether it allows marketplace-declared commands. This marketplace's headersHelper is one: the command was not run and the marketplace was not fetched. It can be fetched once your organization's settings are read, if it allows them.`,
        "marketplace headersHelper held for the organization answer",
      )
    );
  if (trustedDeclaration.authoredBy === "policySettings" && !policyTierCommandsMayRun())
    throw (
      logFeatureSad("plugin_headers_helper", "remote_policy_unconsented"),
      new Bd(
        `${i}: headersHelper not run \u2014 ${REMOTE_POLICY_NOT_APPROVED_MESSAGE}. The marketplace was not fetched.`,
        "marketplace headersHelper from remote managed settings not yet verified and approved for the session",
      )
    );
  let c = canPolicyDeclarationExemptHelper(),
    s = trustedDeclaration.authoredBy === "policySettings" && c;
  if (areCommandPluginSourcesDisabledByPolicy() && !s)
    throw new Bd(
      `${i}: your organization's managed settings disable marketplace-declared commands (disableCommandPluginSources / allowManagedHooksOnly), ` +
        (c
          ? "and this marketplace's headersHelper is not declared in managed settings. The marketplace was not fetched and the command was not run; ask your admin to allow it or to declare the marketplace in managed settings."
          : "and in this session a declaration in managed settings does not exempt a headersHelper. The marketplace was not fetched and the command was not run; ask your admin to allow it."),
      "marketplace headersHelper disabled by managed policy",
    );
  if (!B())
    return (
      logForDebugging(`${i}: headersHelper not run \u2014 disabled by the plugin command kill switch`, {
        level: "warn",
      }),
      a
    );
  let u = await runMarketplaceHeadersHelperCached(
    trustedDeclaration.headersHelper,
    e.url,
    n.marketplaceName,
    trustedDeclaration.operatorAuthored,
  );
  return { ...a, ...o(u, "helper output") };
}
//@ chunk-21ppfwx8.js:29861-29874 placement
var gt = 60000;
//@ chunk-21ppfwx8.js:29874-30155 placement
async function runMarketplaceHeadersHelperCached(e, n, r, i) {
  let o = `${e}\x00${n}\x00${r ?? ""}\x00${i ? "operator" : "repo"}`,
    now = Date.now(),
    { marketplaceHelperMemo: marketplaceHelperMemo } = getPluginRegistry(),
    s = marketplaceHelperMemo.get(o);
  if (s && s.expiresAt > now) return s.headers;
  let u = runMarketplaceHeadersHelper(e, n, r, i);
  marketplaceHelperMemo.set(o, { expiresAt: now + gt, headers: u });
  try {
    return await u;
  } catch (error) {
    throw (marketplaceHelperMemo.delete(o), error);
  }
}
/**
 * 以配置目录为 cwd 运行市场声明的 headersHelper（非运营方声明时擦除凭证环境），注入 CLAUDE_CODE_MARKETPLACE_URL/NAME； 失败记 feature bad 并抛错，成功记 ok 返回 header。
 */
//@ chunk-21ppfwx8.js:30155-30537 placement
async function runMarketplaceHeadersHelper(e, n, r, i) {
  let o = await classifyCommandSourceFailure({
    command: e,
    scrubCredentialEnv: !i,
    isRepoResidentConfig: !1,
    cwd: getClaudeConfigDir(),
    env: { CLAUDE_CODE_MARKETPLACE_URL: n, ...(r !== void 0 && { CLAUDE_CODE_MARKETPLACE_NAME: r }) },
  });
  if (!o.ok)
    throw (
      logFeatureBad("plugin_headers_helper", o.reason),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `marketplace headersHelper failed (${o.reason})`,
        "marketplace headers helper failed",
      )
    );
  return (logFeatureOk("plugin_headers_helper"), o.headers);
}
/**
 * 运行插件市场声明的 headersHelper 取得下载请求头
 */
//@ chunk-21ppfwx8.js:30537-31205 placement
async function runHeadersHelper(e, n) {
  let r = (a) =>
      dropMalformedHeader(a, `plugin ${quotedPrintable(n.pluginName)}`, {
        operatorAuthored: n.operatorAuthored === !0,
      }),
    i = r(e.headers ?? {});
  if (!hasHeadersHelper(e) || e.headersHelper === void 0) return i;
  checkHeadersHelperStrict(e, {
    ...n,
    disabledByPolicy: headersHelperPolicyRefusal(n.marketplaceSource, n.marketplaceName),
  });
  let o = await classifyCommandSourceFailure({
    command: e.headersHelper,
    scrubCredentialEnv: !n.operatorAuthored,
    cwd: getClaudeConfigDir(),
    isRepoResidentConfig: !1,
    env: { CLAUDE_CODE_PLUGIN_NAME: n.pluginName, CLAUDE_CODE_PLUGIN_ARCHIVE_URL: n.archiveUrl },
  });
  if (!o.ok)
    throw (
      logFeatureBad("plugin_headers_helper", o.reason),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `plugin headersHelper for "${Y(n.pluginName)}" failed (${o.reason})`,
        "plugin headers helper failed",
      )
    );
  return (logFeatureOk("plugin_headers_helper"), { ...i, ...r(o.headers) });
}
/**
 * helper 不得设置的 header（host/cookie/转发 IP/逐跳头等）。
 */
//@ chunk-21ppfwx8.js:31205-31583 placement
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
  ]),
  FORBIDDEN_HELPER_HEADER_PREFIXES = ["x-forwarded-", "x-original-", "proxy-"],
  HTTP_TOKEN_RE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
/**
 * header 名（_ 视为 -）在禁止列表或以禁止前缀开头。
 */
//@ chunk-21ppfwx8.js:31583-31689 placement
function isForbiddenHelperHeader(e) {
  let replaced = e.toLowerCase().replaceAll("_", "-");
  return (
    FORBIDDEN_HELPER_HEADERS.has(replaced) ||
    FORBIDDEN_HELPER_HEADER_PREFIXES.some((r) => replaced.startsWith(r))
  );
}
//@ chunk-21ppfwx8.js:31689-32076 placement
function dropMalformedHeader(e, n, { operatorAuthored: r = !1 } = {}) {
  let i = {};
  for (let [o, a] of Object.entries(e)) {
    if (!HTTP_TOKEN_RE.test(o) || /[\r\n\0]/.test(a)) {
      logForDebugging(`Dropping header "${quotedPrintable(o)}" for ${n}: malformed name or value`, {
        level: "warn",
      });
      continue;
    }
    if (!r && isForbiddenHelperHeader(o)) {
      logForDebugging(
        `Dropping header "${quotedPrintable(o)}" for ${n}: request-routing/identity headers are not accepted from non-operator sources`,
        { level: "warn" },
      );
      continue;
    }
    i[o] = a;
  }
  return i;
}
//@ chunk-21ppfwx8.js:32076-32103 placement
function Y(e) {
  return quotedPrintable(e);
}
//@ chunk-21ppfwx8.js:32103-32894 placement
function checkHeadersHelperStrict(e, n) {
  if (n.disabledByPolicy !== null) {
    if (n.disabledByPolicy === "organization_unanswered") noteHeldForTheAnswer();
    throw new Eie(
      checkHeadersHelperConsent(n.pluginName, n.disabledByPolicy),
      helperRefusalFailureCode(n.disabledByPolicy),
    );
  }
  if (n.requireInlinedManifest !== !1 && e.strict !== !1)
    throw new Eie(
      `Plugin "${Y(n.pluginName)}" declares a headersHelper but is not strict:false \u2014 an entry with headersHelper must inline its manifest so its capabilities can be reviewed before the command runs.`,
      "entry_helper_not_inlined",
    );
  if (!n.runEntryHelper)
    throw new Eie(
      `Plugin "${Y(n.pluginName)}" fetches its archive through a headersHelper, ` +
        "which only runs when you install or update it from its own details view \u2014 open this plugin in /plugin (or run `claude plugin install`/`update`), where the command is shown first.",
      "entry_helper_deferred",
    );
}
/**
 * archive 源插件下载前计算请求头：检查条目 helper 的 strict 约束与策略拒绝；归档 URL 与市场 URL 同源时带上市场声明的 header， 再合并条目 headersHelper 的结果。无 header 返回 undefined，否则 {url, headers}。
 */
//@ chunk-21ppfwx8.js:32894-33863 placement
async function resolveArchiveDownloadHeaders(e) {
  if (typeof e.pluginSource !== "object" || e.pluginSource.source !== "archive") return;
  let url = e.pluginSource.url,
    {
      entry: entry,
      operatorAuthored: operatorAuthored,
      requireInlinedManifest: requireInlinedManifest,
    } = headersHelperNotRunReason({
      entry: e.entry,
      archiveUrl: url,
      marketplaceSource: e.marketplaceSource,
      trustedSettingsEntryAuth: e.trustedSettingsEntryAuth,
    }),
    a = e.marketplaceSource?.source === "url" ? e.marketplaceSource.url : void 0,
    c = headersHelperPolicyRefusal(e.marketplaceSource, e.marketplaceName);
  if (hasHeadersHelper(entry))
    checkHeadersHelperStrict(entry, {
      pluginName: e.pluginName,
      runEntryHelper: e.runEntryHelper,
      requireInlinedManifest: requireInlinedManifest,
      operatorAuthored: operatorAuthored,
      disabledByPolicy: c,
    });
  let s =
      a !== void 0 && sameOrigin(a, url)
        ? await describeHelperDeclaration(e.marketplaceSource, {
            marketplaceName: e.marketplaceName,
            trustedDeclaration: e.trustedMarketplaceAuth,
          })
        : {},
    u = await runHeadersHelper(entry, {
      pluginName: e.pluginName,
      archiveUrl: url,
      runEntryHelper: e.runEntryHelper,
      requireInlinedManifest: requireInlinedManifest,
      operatorAuthored: operatorAuthored,
      marketplaceSource: e.marketplaceSource,
      marketplaceName: e.marketplaceName,
    }),
    h = { ...s, ...u };
  if (Object.keys(h).length === 0) return;
  return { url: url, headers: h };
}
//@ chunk-21ppfwx8.js:33863-33922 placement
function E$e(e, n) {
  let r = mE(e);
  return r ? n[r]?.source : void 0;
}
//@ chunk-21ppfwx8.js:33922-33994 placement
function mE(e) {
  let parts = e.split("@");
  return parts.length === 2 && parts[1] ? parts[1] : void 0;
}
//@ chunk-21ppfwx8.js:33994-34034 placement
function vt(e, n) {
  return canonicalFetchSourceUrl(e) === canonicalFetchSourceUrl(n);
}
//@ chunk-21ppfwx8.js:34034-34096 placement
function At(e) {
  try {
    return new URL(e).hostname;
  } catch {
    return "";
  }
}
/**
 * 沿 cause 链（最多 5 层）找 TelemetrySafeError。
 */
//@ chunk-21ppfwx8.js:34096-34205 placement
function findTelemetrySafeCause(e) {
  let n = e;
  for (let r = 0; r < 5 && n instanceof Error; r++) {
    if (n instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) return n;
    n = n.cause;
  }
  return;
}

export {
  classifyCommandSourceError,
  E$e,
  ENTRY_HELPER_FAILURE_SEVERITY,
  mE,
  Eie,
  headersHelperNotRunReason,
  getEntryHelperConsentSubject,
  checkHeadersHelperConsent,
  helperRefusalFailureCode,
  diffEntryHelperConsent,
  describeHelperReview,
  HELPER_CONSENT_MISMATCH_CODES,
  resolveArchiveDownloadHeaders,
  findTelemetrySafeCause,
  At,
  isForbiddenHelperHeader,
  describeHelperDeclaration,
  dropMalformedHeader,
};
