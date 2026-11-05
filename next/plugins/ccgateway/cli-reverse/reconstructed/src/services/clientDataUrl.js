/**
 * services/clientDataUrl.ts
 *
 * 2.1.316 新增：--client-data-url：从 downloads.claude.ai 拉取签名的客户端配置文档（模型条目、第一方 base URL 假设），校验签名与适用范围
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-f1trgkby.js (23)
 * attribution: placement 23
 */
import { stripVTControlCharacters } from "util";
import {
  clientDataForModel,
  CLIENT_DATA_PATH_RE,
  clientDataSchema,
  parseCatalogDocument,
} from "../utils/model/modelCatalog/servedCatalog.js";
import { replaceControlChars } from "../utils/resultError.js";
import { env } from "../utils/env.js";
import { isAnthropicOwnedHost } from "../utils/anthropicHosts.js";
import {
  shortHash,
  COMPILED_CATALOG_ROOTS,
  fetchPublishedCatalog,
  verifyCatalogSignature,
} from "./modelCatalog/publishedCatalog.js";
import { getProviderState } from "../utils/model/providerCaches.js";
import { logError } from "../utils/log.js";
import { isPolicyAllowed } from "./policyLimits/policyEvidence.js";
import { ensurePolicyLimitsLoadRequested } from "./policyLimits/PolicyLimitsClient.js";
import {
  recordPublishedCatalogFloor,
  publishedFloorVersion,
} from "../utils/model/modelCatalog/publishedCatalogFloor.js";
import { logForDebugging } from "../utils/debug.js";
import { isActualFirstPartyAnthropicBaseUrl, getAPIProvider } from "../utils/model/providers.js";
import { clearBetasCaches } from "../utils/betas.js";
import { invalidateToolDescriptions } from "./api/toolDescriptionCache.js";
import { stripAnyVersatileSuffix } from "../utils/model/modelIds.js";
import { getMainLoopModel } from "../utils/model/model.js";
import { lt } from "../utils/semver.js";
import { splitOnDash } from "../utils/model/modelCatalog/catalogCapabilities.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-f1trgkby.js:722-954 placement
function formatClientDataFatal(error) {
  return `Error: --client-data-url: ${error}. Claude Code does not start without the configuration it was given; to start without it, remove the flag, or remove CLAUDE_CODE_CLIENT_DATA_URL from your environment or settings.`;
}
//@ chunk-f1trgkby.js:954-2802 placement
/**
 * --client-data-url 各类失败（URL 无效、云/远程/ssh 会话不可用、第三方提供商、策略、不存在、超时、过大、签名错误）的说明。
 */
function CLIENT_DATA_URL_ERRORS(failure, { httpStatus, minClaudeCodeVersion, buildVersion } = {}) {
  switch (failure) {
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
      return `Claude Code could not fetch the document from downloads.claude.ai (${failure === "http_status" ? `HTTP ${httpStatus ?? "error"}` : failure}); check that your network or proxy allows https://downloads.claude.ai`;
    case "too_large":
      return "the server returned something too large to be a configuration document; try again, and if it keeps happening ask Anthropic";
    case "unsigned":
    case "sidecar_invalid":
    case "bad_signature":
    case "parse_failed":
      return `the document or its signature is not valid (${failure}); ask Anthropic for a new URL`;
    case "unknown_key":
    case "key_unusable":
    case "unsupported_schema":
      return `this version of Claude Code cannot read the document (${failure}); update Claude Code`;
    case "replayed_version":
      return "the server returned an older document than one already accepted on this machine; a proxy on your network may be serving an old copy; if not, ask Anthropic for a new URL";
    case "below_minimum_version":
      return `the document requires Claude Code ${minClaudeCodeVersion} or newer and this build is ${buildVersion}; run claude update`;
    case "exception":
      return "Claude Code hit an internal error loading it; run with --debug for details";
  }
}
//@ chunk-f1trgkby.js:2802-3316 placement
function describeNoModelEntry(doc, model) {
  let patterns = describePatterns(doc);
  return patterns === ""
    ? "Error: --client-data-url: the document has nothing for any model (its publisher switched it off). Remove --client-data-url or CLAUDE_CODE_CLIENT_DATA_URL, or pass --allow-other-models (CLAUDE_CODE_ALLOW_OTHER_MODELS=1) to start without applying it."
    : `Error: --client-data-url: the document has no entry for ${sanitizeForMessage(model)}; it has entries for models matching ${patterns}. Pass a matching --model, or --allow-other-models (CLAUDE_CODE_ALLOW_OTHER_MODELS=1) to start without applying it.`;
}
//@ chunk-f1trgkby.js:3316-3670 placement
function describeDocumentApplied(doc, model, assumesFirstPartyBaseUrl) {
  let patterns = describePatterns(doc);
  let summary =
    clientDataForModel(doc, model) !== null
      ? `applied to ${sanitizeForMessage(model)} (document v${doc.version})`
      : patterns === ""
        ? `loaded (document v${doc.version}), nothing in it for any model (its publisher switched it off)`
        : `loaded (document v${doc.version}), nothing in it for ${sanitizeForMessage(model)}; it has entries for models matching ${patterns}`;
  return assumesFirstPartyBaseUrl ? `${summary}; base URL treated as the Anthropic API` : summary;
}
//@ chunk-f1trgkby.js:3670-3742 placement
/**
 * 把各条目模式拼成可读列表（再清洗控制字符）。
 */
function describePatterns(doc) {
  return sanitizeForMessage(doc.entries.map((entry) => entry.pattern.source).join(", "));
}
//@ chunk-f1trgkby.js:3742-3772 placement
/**
 * 去掉终端控制字符并替换控制字符，用于报错文案。
 */
function sanitizeForMessage(text) {
  return replaceControlChars(stripVTControlCharacters(text));
}
//@ chunk-f1trgkby.js:3772-4177 placement
function parseClientDataUrl() {
  let trimmed = env.CLAUDE_CODE_CLIENT_DATA_URL?.trim();
  if (!trimmed)
    return {
      kind: "unset",
    };
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      kind: "invalid_url",
    };
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.port !== "" ||
    !isAnthropicOwnedHost(parsed.hostname) ||
    /[?#]/.test(trimmed) ||
    !CLIENT_DATA_PATH_RE.test(parsed.pathname)
  )
    return {
      kind: "invalid_url",
    };
  return {
    kind: "ok",
    source: {
      url: parsed.toString(),
      signingContext: clientDataSchema(parsed.pathname),
      cacheKey: shortHash(parsed.pathname),
      roots: COMPILED_CATALOG_ROOTS,
    },
  };
}
//@ chunk-f1trgkby.js:4177-4216 placement
/**
 * 取当前提供方的客户端数据文档状态槽。
 */
function clientDataState() {
  return getProviderState().clientDataUrl;
}
//@ chunk-f1trgkby.js:4216-4972 placement
/**
 * 启动时加载客户端数据文档（失败则拒绝启动并说明）。
 */
function loadClientDataForStartup({
  flagUrl,
  runsOnAnotherMachine = false,
  buildVersion = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.318",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-11-03T18:52:53Z",
    GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION,
} = {}) {
  try {
    if (flagUrl !== undefined) env.set("CLAUDE_CODE_CLIENT_DATA_URL", flagUrl);
    let clientDataUrl = parseClientDataUrl();
    if (
      clientDataUrl.kind === "unset" ||
      !needsFirstPartyBaseUrlAssumption() ||
      getClientDataSkipReason(clientDataUrl, runsOnAnotherMachine) !== undefined
    )
      return;
    let signedClientData = fetchSignedClientData(clientDataUrl, runsOnAnotherMachine, buildVersion);
    signedClientData.catch(() => {});
    clientDataState().pending = {
      resolution: clientDataUrl,
      loaded: signedClientData,
    };
  } catch (error) {
    logError(error);
  }
}
//@ chunk-f1trgkby.js:4972-5120 placement
/**
 * 等待客户端数据文档加载完成，并据此应用"视为第一方 base URL"设置。
 */
async function applyPendingClientDataBaseUrl() {
  try {
    let pending = clientDataState().pending;
    if (pending === undefined) return false;
    let loaded = await pending.loaded;
    return "document" in loaded && applyAssumeFirstPartyBaseUrl(loaded.document);
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-f1trgkby.js:5120-6448 placement
async function applyClientDataToSession({
  runsOnAnotherMachine = false,
  buildVersion = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.318",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-11-03T18:52:53Z",
    GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION,
} = {}) {
  try {
    let clientDataUrl = parseClientDataUrl();
    let pending = clientDataState().pending;
    clientDataState().pending = undefined;
    let reused =
      pending !== undefined && isSameClientDataSource(pending.resolution, clientDataUrl)
        ? pending
        : undefined;
    if (clientDataUrl.kind === "unset") {
      withdrawFirstPartyBaseUrlAssumption();
      return;
    }
    let clientDataSkipReason = getClientDataSkipReason(clientDataUrl, runsOnAnotherMachine);
    if (clientDataSkipReason !== undefined || (pending !== undefined && reused === undefined))
      withdrawFirstPartyBaseUrlAssumption();
    if (clientDataSkipReason === undefined && reused === undefined && !isPolicyAllowed("allow_model_catalog"))
      return formatClientDataFatal(CLIENT_DATA_URL_ERRORS("policy_denied"));
    let loaded =
      clientDataSkipReason !== undefined
        ? {
            failure: clientDataSkipReason,
          }
        : reused !== undefined
          ? await reused.loaded
          : await fetchSignedClientData(clientDataUrl, runsOnAnotherMachine, buildVersion);
    if (reused !== undefined && "failure" in loaded && FAILURE_KINDS_REQUIRING_REFETCH.has(loaded.failure))
      loaded = await fetchSignedClientData(clientDataUrl, runsOnAnotherMachine, buildVersion);
    if ("failure" in loaded) return formatClientDataFatal(CLIENT_DATA_URL_ERRORS(loaded.failure, loaded));
    if (reused !== undefined && !isPolicyAllowed("allow_model_catalog"))
      return formatClientDataFatal(CLIENT_DATA_URL_ERRORS("policy_denied"));
    if (applyAssumeFirstPartyBaseUrl(loaded.document)) ensurePolicyLimitsLoadRequested();
    if (clientDataUrl.kind === "ok")
      await recordPublishedCatalogFloor(clientDataUrl.source.cacheKey, loaded.document);
    clientDataState().document = loaded.document;
    logForDebugging(
      `[clientDataUrl] loaded document v${loaded.document.version} covering ${loaded.document.entries.length} model pattern(s)`,
    );
    return;
  } catch (error) {
    logError(error);
    return formatClientDataFatal(CLIENT_DATA_URL_ERRORS("exception"));
  }
}
//@ chunk-f1trgkby.js:6448-7046 placement
function applyAssumeFirstPartyBaseUrl(doc) {
  if (clientDataState().assumesFirstPartyBaseUrl) return false;
  let found = doc.entries.find((entry) => entry.clientData.assume_first_party_base_url === true);
  if (found === undefined || isActualFirstPartyAnthropicBaseUrl()) return false;
  if (env._CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL !== undefined || isProviderManagedByHost()) {
    logForDebugging(
      `[clientDataUrl] assume_first_party_base_url in the document not applied: ${isProviderManagedByHost() ? "the host manages the provider" : "_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL is already set"}`,
    );
    return false;
  }
  clientDataState().assumesFirstPartyBaseUrl = true;
  clearBetasCaches();
  invalidateToolDescriptions();
  logForDebugging(
    `[clientDataUrl] assume_first_party_base_url applied (entry ${found.pattern.source}): the base URL is treated as the Anthropic API from here on`,
  );
  return true;
}
//@ chunk-f1trgkby.js:7046-7188 placement
/**
 * 客户端数据文档中没有当前模型的条目时返回说明（允许其他模型时跳过）。
 */
function checkClientDataModelEntry() {
  let { document: doc } = clientDataState();
  if (doc === undefined || env.CLAUDE_CODE_ALLOW_OTHER_MODELS) return;
  let model = stripAnyVersatileSuffix(getMainLoopModel());
  return clientDataForModel(doc, model) === null ? describeNoModelEntry(doc, model) : undefined;
}
//@ chunk-f1trgkby.js:7188-7304 placement
/**
 * 用客户端数据文档中当前模型的条目覆盖传入的客户端数据。
 */
function applyClientDataModelOverrides(modelConfig, model) {
  let { document: doc } = clientDataState();
  if (doc === undefined) return modelConfig;
  let override = clientDataForModel(doc, stripAnyVersatileSuffix(model ?? getMainLoopModel()));
  return override === null
    ? modelConfig
    : {
        ...modelConfig,
        ...override,
      };
}
//@ chunk-f1trgkby.js:7304-7405 placement
/**
 * 判断客户端数据文档非空但缺少指定模型的条目。
 */
function isModelMissingFromClientData(mainLoopModel) {
  let { document: doc } = clientDataState();
  return (
    doc !== undefined &&
    doc.entries.length > 0 &&
    clientDataForModel(doc, stripAnyVersatileSuffix(mainLoopModel ?? getMainLoopModel())) === null
  );
}
//@ chunk-f1trgkby.js:7405-7508 placement
/**
 * 描述客户端数据文档对当前模型的应用状态。
 */
function describeClientDataStatus() {
  let { document: doc } = clientDataState();
  return doc === undefined
    ? undefined
    : describeDocumentApplied(
        doc,
        stripAnyVersatileSuffix(getMainLoopModel()),
        clientDataState().assumesFirstPartyBaseUrl,
      );
}
//@ chunk-f1trgkby.js:7508-8526 placement
/**
 * 下载并校验签名文档（hosted、编译内置根）。
 */
async function fetchSignedClientData(clientDataUrl, runsOnAnotherMachine, buildVersion) {
  let clientDataSkipReason = getClientDataSkipReason(clientDataUrl, runsOnAnotherMachine);
  if (clientDataSkipReason !== undefined || clientDataUrl.kind !== "ok")
    return {
      failure: clientDataSkipReason ?? "invalid_url",
    };
  let { source } = clientDataUrl;
  let publishedCatalog = await fetchPublishedCatalog(
    {
      kind: "hosted",
      url: source.url,
      trust: {
        kind: "compiled_roots",
        roots: source.roots,
      },
      cacheKey: source.cacheKey,
    },
    {
      noCache: true,
    },
  );
  if (publishedCatalog.status !== "ok") {
    let { httpStatus } = publishedCatalog;
    if (httpStatus === 404 || httpStatus === 410)
      return {
        failure: "not_found",
      };
    return {
      failure: publishedCatalog.status === "error" ? publishedCatalog.reason : "http_status",
      httpStatus,
    };
  }
  if (!publishedCatalog.hasSidecar) {
    let { sidecarHttpStatus } = publishedCatalog;
    if (sidecarHttpStatus === undefined || sidecarHttpStatus === 404 || sidecarHttpStatus === 410)
      return {
        failure: "unsigned",
      };
    return sidecarHttpStatus >= 200 && sidecarHttpStatus < 300
      ? {
          failure: "too_large",
        }
      : {
          failure: "http_status",
          httpStatus: sidecarHttpStatus,
        };
  }
  let verified = await verifyCatalogSignature({
    documentBytes: publishedCatalog.documentBytes,
    sidecar: publishedCatalog.sidecar,
    roots: source.roots,
    context: source.signingContext,
  });
  if (!verified.ok)
    return {
      failure: verified.reason,
    };
  let catalogDocument = parseCatalogDocument(publishedCatalog.documentBytes);
  if (!catalogDocument.ok)
    return {
      failure: catalogDocument.reason,
    };
  let { document: doc } = catalogDocument;
  if (doc.version < (await publishedFloorVersion(source.cacheKey)))
    return {
      failure: "replayed_version",
    };
  let { minClaudeCodeVersion } = doc;
  if (minClaudeCodeVersion !== undefined && lt(splitOnDash(buildVersion), minClaudeCodeVersion))
    return {
      failure: "below_minimum_version",
      minClaudeCodeVersion,
      buildVersion,
    };
  return {
    document: doc,
  };
}
//@ chunk-f1trgkby.js:8526-8675 placement
function getClientDataSkipReason(clientDataUrl, runsOnAnotherMachine) {
  if (clientDataUrl.kind === "invalid_url") return "invalid_url";
  if (runsOnAnotherMachine) return "remote_session";
  if (getAPIProvider() !== "firstParty") return "third_party_provider";
  return;
}
//@ chunk-f1trgkby.js:8675-8776 placement
function isProviderManagedByHost() {
  return env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST || env.CLAUDE_CODE_HOST_AUTH_ENV_VAR !== undefined;
}
//@ chunk-f1trgkby.js:8776-8882 placement
function needsFirstPartyBaseUrlAssumption() {
  return (
    getAPIProvider() === "firstParty" &&
    !isActualFirstPartyAnthropicBaseUrl() &&
    env._CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL === undefined &&
    !isProviderManagedByHost()
  );
}
//@ chunk-f1trgkby.js:8882-8937 placement
/**
 * 需要重新拉取签名文档的失败类型（network、http_status、read_failed）。
 */
var FAILURE_KINDS_REQUIRING_REFETCH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-f1trgkby.js:8882", () => {
  FAILURE_KINDS_REQUIRING_REFETCH = new Set(["network", "http_status", "read_failed"]);
});
//@ chunk-f1trgkby.js:8937-9040 placement
function isSameClientDataSource(resolution, clientDataUrl) {
  return resolution.kind === "ok"
    ? clientDataUrl.kind === "ok" && resolution.source.url === clientDataUrl.source.url
    : clientDataUrl.kind === "invalid_url";
}
//@ chunk-f1trgkby.js:9040-9245 placement
function withdrawFirstPartyBaseUrlAssumption() {
  if (!clientDataState().assumesFirstPartyBaseUrl) return;
  clientDataState().assumesFirstPartyBaseUrl = false;
  clearBetasCaches();
  invalidateToolDescriptions();
  logForDebugging(
    "[clientDataUrl] assume_first_party_base_url withdrawn: the launch does not use the document it came from",
  );
}
export {
  isModelMissingFromClientData,
  loadClientDataForStartup,
  applyPendingClientDataBaseUrl,
  describeClientDataStatus,
  applyClientDataModelOverrides,
  applyClientDataToSession,
  checkClientDataModelEntry,
};
