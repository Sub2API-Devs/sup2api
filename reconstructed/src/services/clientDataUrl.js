/**
 * services/clientDataUrl.ts
 *
 * 2.1.316 新增：--client-data-url：从 downloads.claude.ai 拉取签名的客户端配置文档（模型条目、第一方 base URL 假设），校验签名与适用范围
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5ghme4bp.js (23)
 * attribution: placement 23
 */
import { stripVTControlCharacters } from "util";
import {
  clientDataForModel,
  nwi,
  rwi,
  parseCatalogDocument,
} from "../utils/model/modelCatalog/servedCatalog.js";
import { replaceControlChars } from "../utils/resultError.js";
import { env } from "../utils/env.js";
import { isAnthropicOwnedHost } from "../utils/anthropicHosts.js";
import {
  JNo,
  COMPILED_CATALOG_ROOTS,
  fetchPublishedCatalog,
  verifyCatalogSignature,
} from "./modelCatalog/publishedCatalog.js";
import { getProviderState } from "../utils/model/providerCaches.js";
import { logError } from "../utils/log.js";
import { isPolicyAllowed } from "./policyLimits/policyEvidence.js";
import { ensurePolicyLimitsLoadRequested } from "./policyLimits/PolicyLimitsClient.js";
import { recordPublishedCatalogFloor, D6n } from "../utils/model/modelCatalog/publishedCatalogFloor.js";
import { logForDebugging } from "../utils/debug.js";
import { isActualFirstPartyAnthropicBaseUrl, getAPIProvider } from "../utils/model/providers.js";
import { clearBetasCaches } from "../utils/betas.js";
import { invalidateToolDescriptions } from "./api/toolDescriptionCache.js";
import { Bn } from "../utils/model/modelIds.js";
import { getMainLoopModel } from "../utils/model/model.js";
import { lt_2 } from "../utils/semver.js";
import { splitOnDash } from "../utils/model/modelCatalog/catalogCapabilities.js";

//@ chunk-5ghme4bp.js:689-921 placement
function formatClientDataFatal(e) {
  return `Error: --client-data-url: ${e}. Claude Code does not start without the configuration it was given; to start without it, remove the flag, or remove CLAUDE_CODE_CLIENT_DATA_URL from your environment or settings.`;
}
/**
 * --client-data-url 各类失败（URL 无效、云/远程/ssh 会话不可用、第三方提供商、策略、不存在、超时、过大、签名错误）的说明。
 */
//@ chunk-5ghme4bp.js:921-2769 placement
function CLIENT_DATA_URL_ERRORS(e, { httpStatus: n, minClaudeCodeVersion: r, buildVersion: o } = {}) {
  switch (e) {
    case "invalid_url":
      return "the URL must be the https://downloads.claude.ai/ address Anthropic gave you, exactly as given";
    case "remote_session":
      return "it cannot be used in a cloud, remote-environment or ssh session, which runs Claude Code on another machine";
    case "third_party_provider":
      return "it only works when Claude Code talks to the Anthropic API directly, not through a cloud provider such as Bedrock, Vertex or Foundry, or a cloud gateway";
    case "policy_denied":
      return "your organization's policy does not allow it";
    case "not_found":
      return "there is nothing at that URL; it may have been withdrawn, so ask Anthropic for a new one";
    case "http_status":
    case "timeout":
    case "network":
    case "read_failed":
      return `Claude Code could not fetch the document from downloads.claude.ai (${e === "http_status" ? `HTTP ${n ?? "error"}` : e}); check that your network or proxy allows https://downloads.claude.ai`;
    case "too_large":
      return "the server returned something too large to be a configuration document; try again, and if it keeps happening ask Anthropic";
    case "unsigned":
    case "sidecar_invalid":
    case "bad_signature":
    case "parse_failed":
      return `the document or its signature is not valid (${e}); ask Anthropic for a new URL`;
    case "unknown_key":
    case "key_unusable":
    case "unsupported_schema":
      return `this version of Claude Code cannot read the document (${e}); update Claude Code`;
    case "replayed_version":
      return "the server returned an older document than one already accepted on this machine; a proxy on your network may be serving an old copy; if not, ask Anthropic for a new URL";
    case "below_minimum_version":
      return `the document requires Claude Code ${r} or newer and this build is ${o}; run claude update`;
    case "exception":
      return "Claude Code hit an internal error loading it; run with --debug for details";
  }
}
//@ chunk-5ghme4bp.js:2769-3283 placement
function describeNoModelEntry(e, n) {
  let r = E(e);
  return r === ""
    ? "Error: --client-data-url: the document has nothing for any model (its publisher switched it off). Remove --client-data-url or CLAUDE_CODE_CLIENT_DATA_URL, or pass --allow-other-models (CLAUDE_CODE_ALLOW_OTHER_MODELS=1) to start without applying it."
    : `Error: --client-data-url: the document has no entry for ${p(n)}; it has entries for models matching ${r}. Pass a matching --model, or --allow-other-models (CLAUDE_CODE_ALLOW_OTHER_MODELS=1) to start without applying it.`;
}
//@ chunk-5ghme4bp.js:3283-3637 placement
function describeDocumentApplied(e, n, r) {
  let o = E(e),
    a =
      clientDataForModel(e, n) !== null
        ? `applied to ${p(n)} (document v${e.version})`
        : o === ""
          ? `loaded (document v${e.version}), nothing in it for any model (its publisher switched it off)`
          : `loaded (document v${e.version}), nothing in it for ${p(n)}; it has entries for models matching ${o}`;
  return r ? `${a}; base URL treated as the Anthropic API` : a;
}
//@ chunk-5ghme4bp.js:3637-3709 placement
function E(e) {
  return p(e.entries.map((entry) => entry.pattern.source).join(", "));
}
//@ chunk-5ghme4bp.js:3709-3739 placement
function p(e) {
  return replaceControlChars(stripVTControlCharacters(e));
}
//@ chunk-5ghme4bp.js:3739-4144 placement
function parseClientDataUrl() {
  let e = env.CLAUDE_CODE_CLIENT_DATA_URL?.trim();
  if (!e) return { kind: "unset" };
  let n;
  try {
    n = new URL(e);
  } catch {
    return { kind: "invalid_url" };
  }
  if (
    n.protocol !== "https:" ||
    n.username !== "" ||
    n.password !== "" ||
    n.port !== "" ||
    !isAnthropicOwnedHost(n.hostname) ||
    /[?#]/.test(e) ||
    !nwi.test(n.pathname)
  )
    return { kind: "invalid_url" };
  return {
    kind: "ok",
    source: {
      url: n.toString(),
      signingContext: rwi(n.pathname),
      cacheKey: JNo(n.pathname),
      roots: COMPILED_CATALOG_ROOTS,
    },
  };
}
//@ chunk-5ghme4bp.js:4144-4183 placement
function d() {
  return getProviderState().clientDataUrl;
}
/**
 * 启动时加载客户端数据文档（失败则拒绝启动并说明）。
 */
//@ chunk-5ghme4bp.js:4183-4939 placement
function loadClientDataForStartup({
  flagUrl: e,
  runsOnAnotherMachine: n = !1,
  buildVersion: r = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.316",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-10-30T23:28:13Z",
    GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION,
} = {}) {
  try {
    if (e !== void 0) env.set("CLAUDE_CODE_CLIENT_DATA_URL", e);
    let o = parseClientDataUrl();
    if (o.kind === "unset" || !needsFirstPartyBaseUrlAssumption() || getClientDataSkipReason(o, n) !== void 0)
      return;
    let a = fetchSignedClientData(o, n, r);
    (a.catch(() => {}), (d().pending = { resolution: o, loaded: a }));
  } catch (error) {
    logError(error);
  }
}
/**
 * 等待客户端数据文档加载完成，并据此应用"视为第一方 base URL"设置。
 */
//@ chunk-5ghme4bp.js:4939-5087 placement
async function applyPendingClientDataBaseUrl() {
  try {
    let pending = d().pending;
    if (pending === void 0) return !1;
    let loaded = await pending.loaded;
    return "document" in loaded && applyAssumeFirstPartyBaseUrl(loaded.document);
  } catch (error) {
    return (logError(error), !1);
  }
}
//@ chunk-5ghme4bp.js:5087-6415 placement
async function applyClientDataToSession({
  runsOnAnotherMachine: e = !1,
  buildVersion: n = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.316",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-10-30T23:28:13Z",
    GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION,
} = {}) {
  try {
    let r = parseClientDataUrl(),
      pending = d().pending;
    d().pending = void 0;
    let a = pending !== void 0 && isSameClientDataSource(pending.resolution, r) ? pending : void 0;
    if (r.kind === "unset") {
      withdrawFirstPartyBaseUrlAssumption();
      return;
    }
    let s = getClientDataSkipReason(r, e);
    if (s !== void 0 || (pending !== void 0 && a === void 0)) withdrawFirstPartyBaseUrlAssumption();
    if (s === void 0 && a === void 0 && !isPolicyAllowed("allow_model_catalog"))
      return formatClientDataFatal(CLIENT_DATA_URL_ERRORS("policy_denied"));
    let u =
      s !== void 0 ? { failure: s } : a !== void 0 ? await a.loaded : await fetchSignedClientData(r, e, n);
    if (a !== void 0 && "failure" in u && S.has(u.failure)) u = await fetchSignedClientData(r, e, n);
    if ("failure" in u) return formatClientDataFatal(CLIENT_DATA_URL_ERRORS(u.failure, u));
    if (a !== void 0 && !isPolicyAllowed("allow_model_catalog"))
      return formatClientDataFatal(CLIENT_DATA_URL_ERRORS("policy_denied"));
    if (applyAssumeFirstPartyBaseUrl(u.document)) ensurePolicyLimitsLoadRequested();
    if (r.kind === "ok") await recordPublishedCatalogFloor(r.source.cacheKey, u.document);
    ((d().document = u.document),
      logForDebugging(
        `[clientDataUrl] loaded document v${u.document.version} covering ${u.document.entries.length} model pattern(s)`,
      ));
    return;
  } catch (error) {
    return (logError(error), formatClientDataFatal(CLIENT_DATA_URL_ERRORS("exception")));
  }
}
//@ chunk-5ghme4bp.js:6415-7013 placement
function applyAssumeFirstPartyBaseUrl(e) {
  if (d().assumesFirstPartyBaseUrl) return !1;
  let found = e.entries.find((entry) => entry.clientData.assume_first_party_base_url === !0);
  if (found === void 0 || isActualFirstPartyAnthropicBaseUrl()) return !1;
  if (env._CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL !== void 0 || isProviderManagedByHost())
    return (
      logForDebugging(
        `[clientDataUrl] assume_first_party_base_url in the document not applied: ${isProviderManagedByHost() ? "the host manages the provider" : "_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL is already set"}`,
      ),
      !1
    );
  return (
    (d().assumesFirstPartyBaseUrl = !0),
    clearBetasCaches(),
    invalidateToolDescriptions(),
    logForDebugging(
      `[clientDataUrl] assume_first_party_base_url applied (entry ${found.pattern.source}): the base URL is treated as the Anthropic API from here on`,
    ),
    !0
  );
}
/**
 * 客户端数据文档中没有当前模型的条目时返回说明（允许其他模型时跳过）。
 */
//@ chunk-5ghme4bp.js:7013-7155 placement
function checkClientDataModelEntry() {
  let { document: e } = d();
  if (e === void 0 || env.CLAUDE_CODE_ALLOW_OTHER_MODELS) return;
  let n = Bn(getMainLoopModel());
  return clientDataForModel(e, n) === null ? describeNoModelEntry(e, n) : void 0;
}
/**
 * 用客户端数据文档中当前模型的条目覆盖传入的客户端数据。
 */
//@ chunk-5ghme4bp.js:7155-7271 placement
function applyClientDataModelOverrides(e, n) {
  let { document: r } = d();
  if (r === void 0) return e;
  let o = clientDataForModel(r, Bn(n ?? getMainLoopModel()));
  return o === null ? e : { ...e, ...o };
}
/**
 * 判断客户端数据文档非空但缺少指定模型的条目。
 */
//@ chunk-5ghme4bp.js:7271-7372 placement
function isModelMissingFromClientData(e) {
  let { document: n } = d();
  return n !== void 0 && n.entries.length > 0 && clientDataForModel(n, Bn(e ?? getMainLoopModel())) === null;
}
/**
 * 描述客户端数据文档对当前模型的应用状态。
 */
//@ chunk-5ghme4bp.js:7372-7475 placement
function describeClientDataStatus() {
  let { document: e } = d();
  return e === void 0
    ? void 0
    : describeDocumentApplied(e, Bn(getMainLoopModel()), d().assumesFirstPartyBaseUrl);
}
/**
 * 下载并校验签名文档（hosted、编译内置根）。
 */
//@ chunk-5ghme4bp.js:7475-8493 placement
async function fetchSignedClientData(e, n, r) {
  let o = getClientDataSkipReason(e, n);
  if (o !== void 0 || e.kind !== "ok") return { failure: o ?? "invalid_url" };
  let { source: source } = e,
    s = await fetchPublishedCatalog(
      {
        kind: "hosted",
        url: source.url,
        trust: { kind: "compiled_roots", roots: source.roots },
        cacheKey: source.cacheKey,
      },
      { noCache: !0 },
    );
  if (s.status !== "ok") {
    let { httpStatus: httpStatus } = s;
    if (httpStatus === 404 || httpStatus === 410) return { failure: "not_found" };
    return { failure: s.status === "error" ? s.reason : "http_status", httpStatus: httpStatus };
  }
  if (!s.hasSidecar) {
    let { sidecarHttpStatus: sidecarHttpStatus } = s;
    if (sidecarHttpStatus === void 0 || sidecarHttpStatus === 404 || sidecarHttpStatus === 410)
      return { failure: "unsigned" };
    return sidecarHttpStatus >= 200 && sidecarHttpStatus < 300
      ? { failure: "too_large" }
      : { failure: "http_status", httpStatus: sidecarHttpStatus };
  }
  let u = await verifyCatalogSignature({
    documentBytes: s.documentBytes,
    sidecar: s.sidecar,
    roots: source.roots,
    context: source.signingContext,
  });
  if (!u.ok) return { failure: u.reason };
  let _ = parseCatalogDocument(s.documentBytes);
  if (!_.ok) return { failure: _.reason };
  let { document: h } = _;
  if (h.version < (await D6n(source.cacheKey))) return { failure: "replayed_version" };
  let { minClaudeCodeVersion: minClaudeCodeVersion } = h;
  if (minClaudeCodeVersion !== void 0 && lt_2(splitOnDash(r), minClaudeCodeVersion))
    return { failure: "below_minimum_version", minClaudeCodeVersion: minClaudeCodeVersion, buildVersion: r };
  return { document: h };
}
//@ chunk-5ghme4bp.js:8493-8642 placement
function getClientDataSkipReason(e, n) {
  if (e.kind === "invalid_url") return "invalid_url";
  if (n) return "remote_session";
  if (getAPIProvider() !== "firstParty") return "third_party_provider";
  return;
}
//@ chunk-5ghme4bp.js:8642-8743 placement
function isProviderManagedByHost() {
  return env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST || env.CLAUDE_CODE_HOST_AUTH_ENV_VAR !== void 0;
}
//@ chunk-5ghme4bp.js:8743-8849 placement
function needsFirstPartyBaseUrlAssumption() {
  return (
    getAPIProvider() === "firstParty" &&
    !isActualFirstPartyAnthropicBaseUrl() &&
    env._CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL === void 0 &&
    !isProviderManagedByHost()
  );
}
//@ chunk-5ghme4bp.js:8849-8904 placement
var S = new Set(["network", "http_status", "read_failed"]);
//@ chunk-5ghme4bp.js:8904-9007 placement
function isSameClientDataSource(e, n) {
  return e.kind === "ok" ? n.kind === "ok" && e.source.url === n.source.url : n.kind === "invalid_url";
}
//@ chunk-5ghme4bp.js:9007-9212 placement
function withdrawFirstPartyBaseUrlAssumption() {
  if (!d().assumesFirstPartyBaseUrl) return;
  ((d().assumesFirstPartyBaseUrl = !1),
    clearBetasCaches(),
    invalidateToolDescriptions(),
    logForDebugging(
      "[clientDataUrl] assume_first_party_base_url withdrawn: the launch does not use the document it came from",
    ));
}

export {
  describeClientDataStatus,
  loadClientDataForStartup,
  applyPendingClientDataBaseUrl,
  isModelMissingFromClientData,
  applyClientDataToSession,
  checkClientDataModelEntry,
  applyClientDataModelOverrides,
};
