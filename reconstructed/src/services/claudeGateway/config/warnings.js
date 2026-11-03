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
import { B0 } from "../../../../vendor/@modelcontextprotocol/client/dist/src-CeKsbNLO.mjs";
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
function collectGatewayConfigWarnings(gatewayConfig, managedPolicies = null) {
  let n = [];
  if (gatewayConfig.load_test_mode?.enabled)
    n.push(
      "load_test_mode is on: no model request is sent upstream and every reply is canned. Credential calls, such as AWS STS, still go out. Set load_test_mode.enabled: false (or remove the block) and restart before developers use this gateway",
    );
  if (
    gatewayConfig.access_control.allow_cidrs.length === 0 &&
    !(
      B0(gatewayConfig.listen.host) &&
      gatewayConfig.listen.trusted_proxies.length === 0 &&
      gatewayConfig.listen.public_url === undefined
    )
  ) {
    let f = gatewayConfig.access_control.deny_cidrs.length > 0 ? " outside deny_cidrs" : "";
    n.push(
      `access_control.allow_cidrs is empty: the gateway serves any client address${f}, so only your network limits who can reach it. Never expose this gateway to the public internet: it can push settings that run commands on developer machines. Allow only private ranges, e.g. allow_cidrs: [${PRIVATE_NETWORK_RANGES.join(", ")}], plus any other internal ranges your developers connect from (behind a load balancer, set listen.trusted_proxies first)`,
    );
  }
  if (managedPolicies?.some(isManagedClaudeCodeDesktopSession))
    n.push(
      `settings in a code: block reach Claude Desktop's Code tab only on machines whose own Claude Code managed settings name this gateway and that reach it over HTTPS on a private network. On any other machine the Code tab doesn't start, where Claude Desktop bundles Claude Code v2.1.296 or later. An earlier one starts without them, and the docs list a few more such cases. Each machine's Claude Code managed settings need: ${JSON.stringify(
        {
          forceLoginGatewayUrl: gatewayConfig.listen.public_url ?? "<listen.public_url>",
          parentSettingsBehavior: "merge",
        },
      )}. See "Choose cli or code" in the gateway configuration docs`,
    );
  if (managedPolicies?.some((f) => isManagedClaudeCodeDesktopSession(f) && f.serveToDesktop === false))
    n.push(
      "serve_to_desktop: false is ignored in a file that has a code: block, so that policy's settings are served to Claude Desktop's Code tab too. Remove it, or write every block under cli: (terminal Claude Code only)",
    );
  let o = new Set(
    gatewayConfig.upstreams
      .filter((upstream) => upstream.provider === "vertex")
      .map((upstream) => upstream.name),
  );
  if (o.size > 0) {
    let f = [catalogEntriesByFirstPartyId.sonnet45, catalogEntriesByFirstPartyId.sonnet40];
    let h = [];
    for (let model of gatewayConfig.models)
      for (let [key, value] of Object.entries(model.upstream_model)) {
        let modelConfigById = findModelConfigById(value);
        if (o.has(key) && modelConfigById && f.includes(modelConfigById)) h.push(model.id);
      }
    if (
      gatewayConfig.auto_include_builtin_models &&
      gatewayConfig.upstreams.some(
        (upstream) =>
          upstream.provider === "vertex" &&
          f.some((y) => resolveUpstreamModel(y.firstParty, upstream, gatewayConfig.models, true).ok),
      )
    )
      h.push("claude-sonnet-4-5 (via auto_include_builtin_models)");
    if (h.length > 0)
      n.push(
        `vertex upstream serves ${uniq(h).join(", ")}: Sonnet 4.5/Sonnet 4 do not support 1M context on Vertex \u2014 requests with the context-1m beta (the [1m] model suffix) for these models will be rejected with a 400. Vertex 1M lineup: Opus 4.6+/Sonnet 4.6.`,
      );
  }
  for (let upstream of gatewayConfig.upstreams) {
    if (!upstream.models) continue;
    for (let model of upstream.models) {
      if (model.includes("*")) {
        if (
          ![
            ...gatewayConfig.models.map((model) => model.id),
            ...Object.values(catalogEntriesByFirstPartyId).map((b) => b.firstParty),
          ].some(
            (b) =>
              resolveUpstreamModel(
                b,
                {
                  ...upstream,
                  models: [model],
                },
                gatewayConfig.models,
                gatewayConfig.auto_include_builtin_models,
              ).ok,
          )
        )
          n.push(
            `upstream '${upstream.name}' lists '${model}' in models, but no model it matches can be sent there. Check the spelling.`,
          );
        continue;
      }
      let upstreamModel = resolveUpstreamModel(
        model,
        upstream,
        gatewayConfig.models,
        gatewayConfig.auto_include_builtin_models,
      );
      if (!upstreamModel.ok)
        n.push(
          `upstream '${upstream.name}' lists '${model}' in models, but that entry routes no model there (${upstreamModel.error.replace("the operator's", "your")}). Check the spelling, list the model as clients name it, or map it with a top-level models[] entry whose upstream_model.${upstream.name} is ${upstream.provider === "mantle" ? "its Mantle id" : "the id that upstream takes"}.`,
        );
    }
    for (let model of gatewayConfig.models) {
      if (model.upstream_model[upstream.name] === undefined) continue;
      let upstreamModel = resolveUpstreamModel(
        model.id,
        upstream,
        gatewayConfig.models,
        gatewayConfig.auto_include_builtin_models,
      );
      if (!upstreamModel.ok && upstreamModel.listSkip)
        n.push(
          `models[] entry '${model.id}' sets upstream_model.${upstream.name}, but '${model.id}' is not in upstream '${upstream.name}' models, so that mapping never applies. Add '${model.id}' to the upstream's models list, or remove that mapping.`,
        );
    }
    for (let upstream_2 of gatewayConfig.upstreams)
      if (
        upstream.provider === "mantle" &&
        upstream_2.provider === "bedrock" &&
        upstream_2.assume_role?.session_name
      )
        n.push(
          `upstream '${upstream_2.name}' sets assume_role.session_name for per-developer AWS attribution, but requests upstream '${upstream.name}' serves are sent to Mantle with its own credentials and are not attributed per developer.`,
        );
  }
  let providerIds = getCatalogEntry(resolveCatalogAlias("opus", "gateway") ?? "")?.provider_ids;
  let s = providerIds && (providerIds.gateway ?? providerIds.first_party);
  let a = [];
  for (let [f, h] of (managedPolicies ?? []).entries()) {
    let availableModels = h.availableModels;
    if (!availableModels) continue;
    if (availableModels.length === 0) {
      n.push(
        `managed policy ${f} availableModels is an empty list. Claude Code reads that as "Default model only", but the gateway checks requests against the list itself, so every inference request for this role will be rejected, Default included. List the models this role may use.`,
      );
      continue;
    }
    let filtered = availableModels.filter(
      (availableModel) =>
        isModelKeyAlias(availableModel.trim().toLowerCase()) &&
        !isBaseModelKey(availableModel.trim().toLowerCase()),
    );
    if (filtered.length > 0) {
      let j =
        filtered.length === availableModels.length
          ? "so every inference request for this role will be rejected"
          : "so these entries never match (other entries in the list still do)";
      n.push(
        `managed policy ${f} availableModels contains ${filtered.map((M) => `'${M}'`).join(", ")} \u2014 the CLI resolves these aliases when picking a model, but the gateway matches the raw request string, ${j}. List concrete model ids or family aliases (fable/opus/sonnet/haiku) instead.`,
      );
    }
    let settings = h.payload.settings;
    let env = settings.env ?? {};
    let S =
      typeof settings.model === "string" ||
      settings.enforceAvailableModels === true ||
      settings.availableModelsMatch === "exact" ||
      typeof env.ANTHROPIC_MODEL === "string" ||
      typeof env.ANTHROPIC_DEFAULT_MODEL === "string" ||
      typeof env.ANTHROPIC_DEFAULT_OPUS_MODEL === "string";
    if (s && !S && !isModelAvailable(s, availableModels)) a.push(f);
  }
  if (s && a.length > 0) {
    let f = a.length === 1 ? `policy ${a[0]}` : `policies ${a.join(", ")}`;
    n.push(
      `managed ${f}: availableModels leaves out ${s}, the model Claude Code (as of this release) starts on when nobody has picked one, and neither model nor enforceAvailableModels is set, so those developers get a 400 on every request until they pick a listed model with /model. Add enforceAvailableModels: true so the Default option resolves to a listed model, or set model.`,
    );
  }
  let flattened = gatewayConfig.upstreams.flatMap((upstream) =>
    upstream.provider === "anthropic" && upstream.forward_user_identity ? [upstream] : [],
  );
  if (gatewayConfig.oidc !== undefined)
    for (let f of flattened)
      n.push(
        `upstream '${f.name}' has forward_user_identity: true \u2014 every forwarded request carries the signed-in developer's IdP subject and email as headers to ${f.base_url} (x-litellm-end-user-id is the email and is omitted for a user whose IdP token has none; set oidc.email_claim if your IdP puts it under another claim name)`,
      );
  if (gatewayConfig.cri && !gatewayConfig.cri.enabled)
    n.push(
      "a cri: block is present but cri.enabled is not true \u2014 customer-routed inference is OFF and the block (org_allowlist, policy webhook) is inert",
    );
  if (gatewayConfig.oidc === undefined) {
    let f = [];
    if (managedPolicies && managedPolicies.length > 0)
      f.push("managed: policies (no session principal can ever reach /managed/settings or /user/bootstrap)");
    if (gatewayConfig.admin)
      f.push(
        "admin: spend limits (the spend limits it manages bind session principals only, and no session principal can exist)",
      );
    if (gatewayConfig.telemetry.forward_to.length > 0)
      f.push("telemetry.forward_to (the OTLP relay sits behind the session wall)");
    if (flattened.length > 0)
      f.push(
        `forward_user_identity on upstream ${flattened.map((h) => `'${h.name}'`).join(", ")} (identity headers name a signed-in developer, and no session principal can exist, so none are ever sent)`,
      );
    if (f.length > 0)
      n.push(
        `oidc is not configured (CRI-only deployment), so no gateway session JWT can ever be minted and these configured sections are inert: ${f.join("; ")}. Remove them, or configure oidc if developer sign-in is intended.`,
      );
  }
  let c = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  if (gatewayConfig.cri) {
    for (let f of gatewayConfig.cri.org_allowlist)
      if (!c.test(f))
        n.push(
          `cri.org_allowlist entry '${f}' does not look like a UUID (8-4-4-4-12) \u2014 Anthropic organization identifiers are canonical UUIDs, so this entry will almost certainly never match any caller's signed org claim, and every caller from the intended org will be denied (cri_org_not_allowed)`,
        );
  }
  if (managedPolicies && !managedPolicies.some((f) => f.desktop !== undefined))
    n.push(
      "no managed policy carries a desktop: block \u2014 Claude Desktop clients will be rejected by /user/bootstrap until a policy opts in",
    );
  if (
    managedPolicies &&
    managedPolicies.some(
      (f) => f.desktop !== undefined && !f.underCode && Object.keys(f.payload.settings).length > 0,
    ) &&
    !managedPolicies.some((f) => f.serveToDesktop === false)
  )
    n.push(
      `Claude Code settings outside a code: block do not reach the Code tab of a Claude Desktop connected through bootstrapUrl, even with serve_to_desktop: true. To reach it, write every policy's block under code:. That also changes how Claude Desktop runs Cowork and Chat: read "Choose cli or code" in the gateway configuration docs first. serve_to_desktop: false silences this and serves Claude Desktop sessions nothing`,
    );
  if (gatewayConfig.admin) {
    let f = [];
    for (let model of gatewayConfig.models)
      for (let [key, value] of Object.entries(model.upstream_model))
        if (
          !hasKnownModelCost(value) &&
          !hasKnownModelCost(model.id) &&
          !findPricingOverride(gatewayConfig.pricing, key, value, model.id)
        )
          f.push(`${model.id} (${value})`);
    if (f.length > 0)
      n.push(
        `spend meter has no exact rates for ${uniq(f).join(", ")} \u2014 these will be metered at the unknown-model default tier`,
      );
  }
  let multiplier = gatewayConfig.pricing?.multiplier ?? 1;
  if (multiplier > 1)
    n.push(
      `pricing.multiplier is ${multiplier}, a markup.` +
        (gatewayConfig.admin
          ? ` Spend limits count ${multiplier}\xD7 the price, so developers reach them sooner. Raise the caps if that is not intended.`
          : "") +
        (managedPolicies && managedPolicies.length > 0
          ? " Claude Code clients older than v2.1.270 ignore a multiplier above 1 and show costs without the markup."
          : ""),
    );
  for (let f of gatewayConfig.pricing?.overrides ?? []) {
    let found = gatewayConfig.upstreams.find((upstream) => upstream.name === f.upstream);
    let m = (b) => {
      if (!found) return false;
      if (!gatewayConfig.admin && firstUpstreamForModel(gatewayConfig, b)?.upstream !== found) return false;
      let upstreamModel = resolveUpstreamModel(
        b,
        found,
        gatewayConfig.models,
        gatewayConfig.auto_include_builtin_models,
      );
      return (
        upstreamModel.ok &&
        findPricingOverride(gatewayConfig.pricing, f.upstream, upstreamModel.model, b) === f
      );
    };
    let y = findModelConfigById(f.model)?.firstParty ?? f.model;
    if (!m(y) && !gatewayConfig.models.some((model) => m(model.id)))
      n.push(
        `pricing override for '${f.model}' on upstream '${f.upstream}' will never apply \u2014 no model a client can request there is priced by it (a typo, a model not in models[], a more specific row covers it, or \u2014 with no admin: meter \u2014 an earlier upstream serves the model and only its price is pushed to clients${gatewayConfig.upstreams.some((upstream) => upstream.groups) ? ", or the first upstream to serve it sets groups, so no price is pushed" : ""})`,
      );
  }
  return n;
}
export { collectGatewayConfigWarnings };
