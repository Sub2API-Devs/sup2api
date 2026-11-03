/**
 * utils/model/mantleDefaultCheck.ts
 *
 * 2.1.316 新增：检查 Mantle 提供商下默认模型是否可访问（生成警告）；用 AnthropicBedrockMantle 客户端发送探测请求等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-paetrb4a.js (6)
 * attribution: placement 6
 */
import { No } from "./modelCatalog.js";
import { DEFAULT_MANTLE_OPUS_KEY, toProviderWireModelId, getMarketingNameForModel } from "./model.js";
import { getAPIProvider } from "./providers.js";
import { env } from "../env.js";
import { getInitialSettings_2 } from "../settings/settings.js";
import { getUserSpecifiedModelSetting } from "./smallFastModel.js";
import { userConfiguredDefault } from "./thirdPartyModelDefaults.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../debug.js";
import { PACKAGE_INFO, getCustomHeaders, _ze, bze } from "./thirdPartyModelAccess.js";
import { resolveAwsRegion } from "../awsRegion.js";
import { awsCredentialSelectors } from "./bedrockDefaultCheck.js";
import { classifyProviderModelError } from "../../services/api/providerModelErrors.js";
import { getForwardableEnvHeaders } from "../../services/api/requestHeaders.js";
import {
  clearAuthorizationHeaders,
  filteredCustomBetaHeaders,
  hasCustomApiKeyHeader,
  CLOUD_AUTH_SLOT,
  bearerFromEnvOrHeaders,
} from "../../services/api/customHeaders.js";
import {
  isHostManagedProviderAuth,
  refreshAndGetAwsCredentials,
  hostManagedAwsSdkCredentials,
  defaultAwsProviderChainResolver,
} from "../auth.js";
import { sendStartupModelCheck } from "./modelAccessCheck.js";

//@ chunk-paetrb4a.js:3655-3710 placement
var filtered = Object.keys(No).filter((e) => No[e].mantle !== null);
/**
 * 检查 Mantle 提供商下默认模型是否可访问（生成警告）。
 */
//@ chunk-paetrb4a.js:3710-5514 placement
async function checkMantleDefaults(e = DEFAULT_MANTLE_OPUS_KEY, n) {
  if (getAPIProvider() !== "mantle") return [];
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) return [];
  let modelOverrides = getInitialSettings_2().modelOverrides;
  if (modelOverrides?.[No[e].firstParty]) return [];
  let u = n?.userPinned ?? getUserSpecifiedModelSetting() != null,
    ANTHROPIC_DEFAULT_OPUS_MODEL = env.ANTHROPIC_DEFAULT_OPUS_MODEL,
    s;
  if (ANTHROPIC_DEFAULT_OPUS_MODEL !== void 0 && !userConfiguredDefault("opus")) {
    if (u) return [];
    let r = await mantleCheckCacheKey(toProviderWireModelId(ANTHROPIC_DEFAULT_OPUS_MODEL));
    if (
      (logEvent("tengu_mantle_probe_result", {
        model_key: lit("admin_pin"),
        accessible: lit(
          r === "refuted" ? "false" : r === "accessible" || r === "outdated" ? "true" : "unknown",
        ),
      }),
      r !== "refuted")
    )
      return [{ kind: "adminPin", tier: "opus", adminMantleId: ANTHROPIC_DEFAULT_OPUS_MODEL }];
    s = ANTHROPIC_DEFAULT_OPUS_MODEL;
  }
  let mantle = No[e].mantle;
  if (!mantle) return [];
  logEvent("tengu_mantle_default_check", {});
  let p = await y(mantle);
  if (
    (logEvent("tengu_mantle_probe_result", { model_key: fromEnum(e), accessible: lit(p ? "true" : "false") }),
    p)
  ) {
    if (s !== void 0)
      return [
        {
          kind: "pinRefuted",
          tier: "opus",
          refutedValue: s,
          workingKey: e,
          workingName: getMarketingNameForModel(No[e].firstParty) ?? mantle,
          workingMantleId: mantle,
          defaultKey: e,
        },
      ];
    return [];
  }
  let l = getMarketingNameForModel(No[e].firstParty) ?? mantle,
    index = filtered.indexOf(e),
    filtered_2 = filtered
      .slice(0, index)
      .reverse()
      .filter((r) => r.startsWith("opus") && !modelOverrides?.[No[r].firstParty]),
    results = await Promise.all(
      filtered_2.map(async (r) => {
        let mantle = No[r].mantle,
          M = await y(mantle);
        logEvent("tengu_mantle_probe_result", {
          model_key: fromEnum(r),
          accessible: lit(M ? "true" : "false"),
        });
        let P = getMarketingNameForModel(No[r].firstParty) ?? mantle;
        return { key: r, mantleId: mantle, name: P, ok: M };
      }),
    );
  for (let r of results)
    if (r.ok) {
      if ((logForDebugging(`[mantle-fallback] default=${e} fallback=${r.key}`), s !== void 0))
        return [
          {
            kind: "pinRefuted",
            tier: "opus",
            refutedValue: s,
            workingKey: r.key,
            workingName: r.name,
            workingMantleId: r.mantleId,
            defaultKey: e,
          },
        ];
      return [
        {
          kind: "fallback",
          tier: "opus",
          envVar: "ANTHROPIC_DEFAULT_OPUS_MODEL",
          defaultKey: e,
          defaultName: l,
          fallbackKey: r.key,
          fallbackName: r.name,
          fallbackMantleId: r.mantleId,
        },
      ];
    }
  let k = [...(s !== void 0 ? [`the admin-configured model (${s})`] : []), l, ...results.map((r) => r.name)];
  return (
    logForDebugging(`[mantle-fallback] default=${e} exhausted \u2014 no working Opus`),
    [{ kind: "exhausted", tier: "opus", defaultName: l, triedNames: k }]
  );
}
/**
 * 带缓存地探测 Mantle 模型访问。
 */
//@ chunk-paetrb4a.js:5514-5871 placement
async function mantleCheckCacheKey(e) {
  let n = await PACKAGE_INFO("mantle", async () => [
    await resolveAwsRegion(),
    env.ANTHROPIC_BEDROCK_MANTLE_BASE_URL,
    env.CLAUDE_CODE_SKIP_MANTLE_AUTH ? "skip-auth" : void 0,
    ...awsCredentialSelectors(),
    getCustomHeaders(),
  ]);
  if (n !== void 0 && (await _ze(n, e))?.state === "ok")
    return (logForDebugging(`[mantle-probe] ${e}: accessible (remembered)`), "accessible");
  let o = await probeMantleModel(e);
  if (o === "accessible" && n !== void 0) bze(n, e, "ok");
  return o;
}
/**
 * 探测 Mantle 模型可访问性（429 视为可访问）。
 */
//@ chunk-paetrb4a.js:5871-6735 placement
async function probeMantleModel(e) {
  try {
    return (await sendMantleProbe(e), "accessible");
  } catch (error) {
    let o = error?.status;
    if (o === 429) return "accessible";
    let u = classifyProviderModelError("mantle", error);
    if (u === "outdated")
      return (
        logForDebugging(
          `[mantle-probe] ${e}: needs a newer Claude Code than ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}; keeping it, so the first request shows the update message`,
        ),
        "outdated"
      );
    if (o === 400 || o === 403 || o === 404) return u === "credential" ? "unknown" : "refuted";
    return "unknown";
  }
}
//@ chunk-paetrb4a.js:6735-6812 placement
async function y(e) {
  let n = await mantleCheckCacheKey(e);
  return n === "accessible" || n === "outdated";
}
/**
 * 用 AnthropicBedrockMantle 客户端发送探测请求。
 */
//@ chunk-paetrb4a.js:6812-7944 placement
async function sendMantleProbe(e) {
  let [{ AnthropicBedrockMantle: n }, { getProxyFetchOptions: o }] = await Promise.all([
      import("./chunk-h87x8cg3.js"),
      import("./chunk-amdegp7s.js"),
    ]),
    u = await resolveAwsRegion(),
    m = {
      awsRegion: u,
      maxRetries: 0,
      timeout: 8000,
      fetchOptions: o({
        url: env.ANTHROPIC_BEDROCK_MANTLE_BASE_URL || `https://bedrock-mantle.${u}.api.aws`,
      }),
    },
    s,
    d = getForwardableEnvHeaders(),
    AWS_BEARER_TOKEN_BEDROCK = env.AWS_BEARER_TOKEN_BEDROCK;
  if (AWS_BEARER_TOKEN_BEDROCK)
    s = new n({
      ...m,
      apiKey: AWS_BEARER_TOKEN_BEDROCK,
      defaultHeaders: {
        ...d,
        ...clearAuthorizationHeaders(),
        ...filteredCustomBetaHeaders(),
        Authorization: `Bearer ${AWS_BEARER_TOKEN_BEDROCK}`,
        ...(!hasCustomApiKeyHeader() && { "X-Api-Key": null }),
      },
    });
  else {
    let CLAUDE_CODE_SKIP_MANTLE_AUTH = env.CLAUDE_CODE_SKIP_MANTLE_AUTH,
      A = isHostManagedProviderAuth(),
      g = {
        authToken: null,
        defaultHeaders: {
          ...d,
          ...clearAuthorizationHeaders(),
          ...filteredCustomBetaHeaders(),
          Authorization: null,
          ...(!hasCustomApiKeyHeader() && { "X-Api-Key": null }),
        },
        ...CLOUD_AUTH_SLOT,
      },
      f = CLAUDE_CODE_SKIP_MANTLE_AUTH ? bearerFromEnvOrHeaders() : void 0,
      k = CLAUDE_CODE_SKIP_MANTLE_AUTH || A ? null : await refreshAndGetAwsCredentials();
    s = k
      ? new n({
          ...m,
          ...g,
          awsAccessKey: k.accessKeyId,
          awsSecretAccessKey: k.secretAccessKey,
          awsSessionToken: k.sessionToken,
        })
      : new n({
          ...m,
          ...(CLAUDE_CODE_SKIP_MANTLE_AUTH &&
            !f && {
              skipAuth: !0,
              authToken: null,
              defaultHeaders: { ...d, ...filteredCustomBetaHeaders() },
              ...CLOUD_AUTH_SLOT,
            }),
          ...(CLAUDE_CODE_SKIP_MANTLE_AUTH &&
            f && {
              apiKey: f.match(/^Bearer (.+)$/i)?.[1] ?? f,
              defaultHeaders: { ...d, ...filteredCustomBetaHeaders(), Authorization: f },
            }),
          ...(!CLAUDE_CODE_SKIP_MANTLE_AUTH && g),
          ...(!CLAUDE_CODE_SKIP_MANTLE_AUTH &&
            A && { providerChainResolver: hostManagedAwsSdkCredentials("Mantle").providerChainResolver }),
          ...(!CLAUDE_CODE_SKIP_MANTLE_AUTH &&
            !A && { providerChainResolver: defaultAwsProviderChainResolver(u) }),
        });
  }
  await s.messages.create(sendStartupModelCheck(e));
}
