/**
 * services/claudeGateway/config/warnings.ts
 *
 * 2.1.316 新增：网关配置警告检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: placement 1
 */
import { isLoopbackHost } from "../../../../vendor/@modelcontextprotocol/client/dist/src-CeKsbNLO.mjs";
import { PRIVATE_NETWORK_RANGES } from "../httpServer.js";
import { isManagedClaudeCodeDesktopSession } from "../clientSurface.js";
import {
  catalogEntriesByFirstPartyId,
  getCatalogEntry,
  resolveCatalogAlias,
} from "../../../utils/model/modelCatalog.js";
import { findModelConfigById } from "../../../utils/model/providerCaches.js";
import { resolveUpstreamModel, findPricingOverride } from "../models.js";
import { uniq } from "../../../utils/collections.js";
import { isModelKeyAlias, isBaseModelKey } from "../../../utils/model/modelIds.js";
import { isModelAvailable } from "../bedrockGuardrails.js";
import { hasKnownModelCost } from "../../../utils/modelCost.js";
import { firstUpstreamForModel } from "./managedPolicies.js";

//@ chunk-1ny7cxrt.js:1553390-1563206 placement
/**
 * 检查网关配置（压测模式、凭据、公开地址、上游等）并返回警告列表。
 */
function collectGatewayConfigWarnings(config, managedPolicies = null) {
  let warnings = [];
  if (config.load_test_mode?.enabled)
    warnings.push(
      "load_test_mode is on: no model request is sent upstream and every reply is canned. Credential calls, such as AWS STS, still go out. Set load_test_mode.enabled: false (or remove the block) and restart before developers use this gateway",
    );
  if (
    config.access_control.allow_cidrs.length === 0 &&
    !(
      isLoopbackHost(config.listen.host) &&
      config.listen.trusted_proxies.length === 0 &&
      config.listen.public_url === undefined
    )
  ) {
    let denyNote = config.access_control.deny_cidrs.length > 0 ? " outside deny_cidrs" : "";
    warnings.push(
      `access_control.allow_cidrs is empty: the gateway serves any client address${denyNote}, so only your network limits who can reach it. Never expose this gateway to the public internet: it can push settings that run commands on developer machines. Allow only private ranges, e.g. allow_cidrs: [${PRIVATE_NETWORK_RANGES.join(", ")}], plus any other internal ranges your developers connect from (behind a load balancer, set listen.trusted_proxies first)`,
    );
  }
  if (managedPolicies?.some(isManagedClaudeCodeDesktopSession))
    warnings.push(
      `settings in a code: block reach Claude Desktop's Code tab only on machines whose own Claude Code managed settings name this gateway and that reach it over HTTPS on a private network. On any other machine the Code tab doesn't start, where Claude Desktop bundles Claude Code v2.1.296 or later. An earlier one starts without them, and the docs list a few more such cases. Each machine's Claude Code managed settings need: ${JSON.stringify(
        {
          forceLoginGatewayUrl: config.listen.public_url ?? "<listen.public_url>",
          parentSettingsBehavior: "merge",
        },
      )}. See "Choose cli or code" in the gateway configuration docs`,
    );
  if (
    managedPolicies?.some(
      (policyEntry) => isManagedClaudeCodeDesktopSession(policyEntry) && policyEntry.serveToDesktop === false,
    )
  )
    warnings.push(
      "serve_to_desktop: false is ignored in a file that has a code: block, so that policy's settings are served to Claude Desktop's Code tab too. Remove it, or write every block under cli: (terminal Claude Code only)",
    );
  let vertexUpstreamNames = new Set(
    config.upstreams.filter((upstream) => upstream.provider === "vertex").map((upstream) => upstream.name),
  );
  if (vertexUpstreamNames.size > 0) {
    let noOneMillionEntries = [catalogEntriesByFirstPartyId.sonnet45, catalogEntriesByFirstPartyId.sonnet40];
    let flaggedModels = [];
    for (let model of config.models)
      for (let [key, value] of Object.entries(model.upstream_model)) {
        let modelConfigById = findModelConfigById(value);
        if (vertexUpstreamNames.has(key) && modelConfigById && noOneMillionEntries.includes(modelConfigById))
          flaggedModels.push(model.id);
      }
    if (
      config.auto_include_builtin_models &&
      config.upstreams.some(
        (upstream) =>
          upstream.provider === "vertex" &&
          noOneMillionEntries.some(
            (catalogEntry) => resolveUpstreamModel(catalogEntry.firstParty, upstream, config.models, true).ok,
          ),
      )
    )
      flaggedModels.push("claude-sonnet-4-5 (via auto_include_builtin_models)");
    if (flaggedModels.length > 0)
      warnings.push(
        `vertex upstream serves ${uniq(flaggedModels).join(", ")}: Sonnet 4.5/Sonnet 4 do not support 1M context on Vertex \u2014 requests with the context-1m beta (the [1m] model suffix) for these models will be rejected with a 400. Vertex 1M lineup: Opus 4.6+/Sonnet 4.6.`,
      );
  }
  for (let upstream of config.upstreams) {
    if (!upstream.models) continue;
    for (let model of upstream.models) {
      if (model.includes("*")) {
        if (
          ![
            ...config.models.map((model) => model.id),
            ...Object.values(catalogEntriesByFirstPartyId).map((catalogEntry) => catalogEntry.firstParty),
          ].some(
            (candidateModel) =>
              resolveUpstreamModel(
                candidateModel,
                {
                  ...upstream,
                  models: [model],
                },
                config.models,
                config.auto_include_builtin_models,
              ).ok,
          )
        )
          warnings.push(
            `upstream '${upstream.name}' lists '${model}' in models, but no model it matches can be sent there. Check the spelling.`,
          );
        continue;
      }
      let upstreamModel = resolveUpstreamModel(
        model,
        upstream,
        config.models,
        config.auto_include_builtin_models,
      );
      if (!upstreamModel.ok)
        warnings.push(
          `upstream '${upstream.name}' lists '${model}' in models, but that entry routes no model there (${upstreamModel.error.replace("the operator's", "your")}). Check the spelling, list the model as clients name it, or map it with a top-level models[] entry whose upstream_model.${upstream.name} is ${upstream.provider === "mantle" ? "its Mantle id" : "the id that upstream takes"}.`,
        );
    }
    for (let model of config.models) {
      if (model.upstream_model[upstream.name] === undefined) continue;
      let upstreamModel = resolveUpstreamModel(
        model.id,
        upstream,
        config.models,
        config.auto_include_builtin_models,
      );
      if (!upstreamModel.ok && upstreamModel.listSkip)
        warnings.push(
          `models[] entry '${model.id}' sets upstream_model.${upstream.name}, but '${model.id}' is not in upstream '${upstream.name}' models, so that mapping never applies. Add '${model.id}' to the upstream's models list, or remove that mapping.`,
        );
    }
    for (let upstream_2 of config.upstreams)
      if (
        upstream.provider === "mantle" &&
        upstream_2.provider === "bedrock" &&
        upstream_2.assume_role?.session_name
      )
        warnings.push(
          `upstream '${upstream_2.name}' sets assume_role.session_name for per-developer AWS attribution, but requests upstream '${upstream.name}' serves are sent to Mantle with its own credentials and are not attributed per developer.`,
        );
  }
  let providerIds = getCatalogEntry(resolveCatalogAlias("opus", "gateway") ?? "")?.provider_ids;
  let defaultModelId = providerIds && (providerIds.gateway ?? providerIds.first_party);
  let policiesMissingDefaultModel = [];
  for (let [policyIndex, policy] of (managedPolicies ?? []).entries()) {
    let availableModels = policy.availableModels;
    if (!availableModels) continue;
    if (availableModels.length === 0) {
      warnings.push(
        `managed policy ${policyIndex} availableModels is an empty list. Claude Code reads that as "Default model only", but the gateway checks requests against the list itself, so every inference request for this role will be rejected, Default included. List the models this role may use.`,
      );
      continue;
    }
    let filtered = availableModels.filter(
      (availableModel) =>
        isModelKeyAlias(availableModel.trim().toLowerCase()) &&
        !isBaseModelKey(availableModel.trim().toLowerCase()),
    );
    if (filtered.length > 0) {
      let consequence =
        filtered.length === availableModels.length
          ? "so every inference request for this role will be rejected"
          : "so these entries never match (other entries in the list still do)";
      warnings.push(
        `managed policy ${policyIndex} availableModels contains ${filtered.map((alias) => `'${alias}'`).join(", ")} \u2014 the CLI resolves these aliases when picking a model, but the gateway matches the raw request string, ${consequence}. List concrete model ids or family aliases (fable/opus/sonnet/haiku) instead.`,
      );
    }
    let settings = policy.payload.settings;
    let env = settings.env ?? {};
    let defaultModelPinned =
      typeof settings.model === "string" ||
      settings.enforceAvailableModels === true ||
      settings.availableModelsMatch === "exact" ||
      typeof env.ANTHROPIC_MODEL === "string" ||
      typeof env.ANTHROPIC_DEFAULT_MODEL === "string" ||
      typeof env.ANTHROPIC_DEFAULT_OPUS_MODEL === "string";
    if (defaultModelId && !defaultModelPinned && !isModelAvailable(defaultModelId, availableModels))
      policiesMissingDefaultModel.push(policyIndex);
  }
  if (defaultModelId && policiesMissingDefaultModel.length > 0) {
    let policyLabel =
      policiesMissingDefaultModel.length === 1
        ? `policy ${policiesMissingDefaultModel[0]}`
        : `policies ${policiesMissingDefaultModel.join(", ")}`;
    warnings.push(
      `managed ${policyLabel}: availableModels leaves out ${defaultModelId}, the model Claude Code (as of this release) starts on when nobody has picked one, and neither model nor enforceAvailableModels is set, so those developers get a 400 on every request until they pick a listed model with /model. Add enforceAvailableModels: true so the Default option resolves to a listed model, or set model.`,
    );
  }
  let flattened = config.upstreams.flatMap((upstream) =>
    upstream.provider === "anthropic" && upstream.forward_user_identity ? [upstream] : [],
  );
  if (config.oidc !== undefined)
    for (let upstream of flattened)
      warnings.push(
        `upstream '${upstream.name}' has forward_user_identity: true \u2014 every forwarded request carries the signed-in developer's IdP subject and email as headers to ${upstream.base_url} (x-litellm-end-user-id is the email and is omitted for a user whose IdP token has none; set oidc.email_claim if your IdP puts it under another claim name)`,
      );
  if (config.cri && !config.cri.enabled)
    warnings.push(
      "a cri: block is present but cri.enabled is not true \u2014 customer-routed inference is OFF and the block (org_allowlist, policy webhook) is inert",
    );
  if (config.oidc === undefined) {
    let inertSections = [];
    if (managedPolicies && managedPolicies.length > 0)
      inertSections.push(
        "managed: policies (no session principal can ever reach /managed/settings or /user/bootstrap)",
      );
    if (config.admin)
      inertSections.push(
        "admin: spend limits (the spend limits it manages bind session principals only, and no session principal can exist)",
      );
    if (config.telemetry.forward_to.length > 0)
      inertSections.push("telemetry.forward_to (the OTLP relay sits behind the session wall)");
    if (flattened.length > 0)
      inertSections.push(
        `forward_user_identity on upstream ${flattened.map((upstream) => `'${upstream.name}'`).join(", ")} (identity headers name a signed-in developer, and no session principal can exist, so none are ever sent)`,
      );
    if (inertSections.length > 0)
      warnings.push(
        `oidc is not configured (CRI-only deployment), so no gateway session JWT can ever be minted and these configured sections are inert: ${inertSections.join("; ")}. Remove them, or configure oidc if developer sign-in is intended.`,
      );
  }
  let uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  if (config.cri) {
    for (let orgId of config.cri.org_allowlist)
      if (!uuidRegex.test(orgId))
        warnings.push(
          `cri.org_allowlist entry '${orgId}' does not look like a UUID (8-4-4-4-12) \u2014 Anthropic organization identifiers are canonical UUIDs, so this entry will almost certainly never match any caller's signed org claim, and every caller from the intended org will be denied (cri_org_not_allowed)`,
        );
  }
  if (managedPolicies && !managedPolicies.some((policy) => policy.desktop !== undefined))
    warnings.push(
      "no managed policy carries a desktop: block \u2014 Claude Desktop clients will be rejected by /user/bootstrap until a policy opts in",
    );
  if (
    managedPolicies &&
    managedPolicies.some(
      (policy) =>
        policy.desktop !== undefined && !policy.underCode && Object.keys(policy.payload.settings).length > 0,
    ) &&
    !managedPolicies.some((policy) => policy.serveToDesktop === false)
  )
    warnings.push(
      `Claude Code settings outside a code: block do not reach the Code tab of a Claude Desktop connected through bootstrapUrl, even with serve_to_desktop: true. To reach it, write every policy's block under code:. That also changes how Claude Desktop runs Cowork and Chat: read "Choose cli or code" in the gateway configuration docs first. serve_to_desktop: false silences this and serves Claude Desktop sessions nothing`,
    );
  if (config.admin) {
    let unpricedModels = [];
    for (let model of config.models)
      for (let [key, value] of Object.entries(model.upstream_model))
        if (
          !hasKnownModelCost(value) &&
          !hasKnownModelCost(model.id) &&
          !findPricingOverride(config.pricing, key, value, model.id)
        )
          unpricedModels.push(`${model.id} (${value})`);
    if (unpricedModels.length > 0)
      warnings.push(
        `spend meter has no exact rates for ${uniq(unpricedModels).join(", ")} \u2014 these will be metered at the unknown-model default tier`,
      );
  }
  let multiplier = config.pricing?.multiplier ?? 1;
  if (multiplier > 1)
    warnings.push(
      `pricing.multiplier is ${multiplier}, a markup.` +
        (config.admin
          ? ` Spend limits count ${multiplier}\xD7 the price, so developers reach them sooner. Raise the caps if that is not intended.`
          : "") +
        (managedPolicies && managedPolicies.length > 0
          ? " Claude Code clients older than v2.1.270 ignore a multiplier above 1 and show costs without the markup."
          : ""),
    );
  for (let override of config.pricing?.overrides ?? []) {
    let found = config.upstreams.find((upstream) => upstream.name === override.upstream);
    let isModelPriced = (modelId) => {
      if (!found) return false;
      if (!config.admin && firstUpstreamForModel(config, modelId)?.upstream !== found) return false;
      let upstreamModel = resolveUpstreamModel(
        modelId,
        found,
        config.models,
        config.auto_include_builtin_models,
      );
      return (
        upstreamModel.ok &&
        findPricingOverride(config.pricing, override.upstream, upstreamModel.model, modelId) === override
      );
    };
    let firstPartyModelId = findModelConfigById(override.model)?.firstParty ?? override.model;
    if (!isModelPriced(firstPartyModelId) && !config.models.some((model) => isModelPriced(model.id)))
      warnings.push(
        `pricing override for '${override.model}' on upstream '${override.upstream}' will never apply \u2014 no model a client can request there is priced by it (a typo, a model not in models[], a more specific row covers it, or \u2014 with no admin: meter \u2014 an earlier upstream serves the model and only its price is pushed to clients${config.upstreams.some((upstream) => upstream.groups) ? ", or the first upstream to serve it sets groups, so no price is pushed" : ""})`,
      );
  }
  return warnings;
}
export { collectGatewayConfigWarnings };
