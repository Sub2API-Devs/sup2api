/**
 * utils/plugins/mcpPluginIntegration.ts
 *
 * 插件 MCP 服务器：发现 .mcp.json/manifest.mcpServers/MCPB 包，解析 ${CLAUDE_PLUGIN_ROOT}/${user_config.*} 等变量，名字加 plugin:<插件>: 前缀，频道（channels）用户配置。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/mcpPluginIntegration.ts
 * pieces: chunk-d4eg9at2.js (1), chunk-e6aww6q8.js (22), chunk-k9mgeeff.js (1)
 * attribution: fingerprint 9, placement 8, layout 6, file-local 1
 */
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
} from "path";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { N5r } from "../../services/plugins/accountSync/syncedPluginHooks.js";
import {
  marketplaceOf,
  isProjectLocalPlugin,
  pluginNamesEqual,
  hasMarketplaceAlias,
  pluginDisplayKey,
} from "./pluginIdentifier.js";
import { SYNCED, buildPluginSourceFields } from "../telemetry/pluginTelemetry.js";
import { HostScoped } from "../hostScoped.js";
import { getServerKey, usesNonOAuthAuth } from "../../services/mcp/auth.js";
import { isRegistrationPendingEntry, D9t, Gls } from "../../services/mcp/registrationStatus.js";
import { getIsInteractive, onProcessRootHost } from "../../bootstrap/state.js";
import { readMcpOAuthStore } from "../../services/mcp/credentialStoreRead.js";
import { logForDebugging } from "../debug.js";
import { errorMessage, isENOENT } from "../errors.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { safeOrigin } from "../../services/mcp/ccrMcpUrls.js";
import { getLoggingSafeMcpBaseUrl } from "../../services/mcp/utils.js";
import { redactUrlQuery, redactUrlsInMessage, replaceAll } from "../redaction/urlRedaction.js";
import { loadMcpbFile, isMcpbSource, loadMcpServerUserConfig, validateUserConfig } from "./mcpbHandler.js";
import { quotedPrintable, printableMessage } from "../printableName.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { env } from "../env.js";
import { containsPathTraversal } from "../path.js";
import { unaddableTransportReason } from "../../services/mcp/config.js";
import { getFsImplementation } from "../fsOperations.js";
import { resolvePluginDirComponentPath } from "./pluginPathContainment.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { kkn, ensurePluginDataDir } from "./pluginDirectories.js";
import { projectPluginCacheDir } from "./pluginCachePaths.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { McpServerConfigSchema } from "../../services/mcp/types.js";
import { Tct } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import {
  loadPluginOptions,
  marketplaceSource,
  applyUserConfigDefaults,
  substitutePluginVariables,
  substituteUserConfigVariables,
  hasUserConfigVariables,
} from "./pluginOptionsStorage.js";
import { scrubbedEnvKeys, expandMcpCredentialEnvVars } from "../envExpansion.js";
import { PLUGIN_ENV_VAR_SET } from "./lspPluginIntegration.js";
import { stdioIdentityDiff } from "../../services/mcp/serverIdentity.js";
import { subprocessEnv } from "../subprocessEnv.js";
import { listSecretEnvNames } from "../settings/policyHelper/helperEnv.js";
import { sanitizeEnvCredentials } from "../settings/policyHelper/helperExec.js";
import { _8e } from "../../services/mcp/envExpansion.js";
import { uniq } from "../collections.js";
import { formatWithheldEnvNotice } from "../settings/managedSettingsFiles.js";
import { isManagedPluginScope, runWithPluginWriteScope } from "./pluginScopedWrite.js";
import { readMcpServerNames, O, k } from "./pluginInventory.js";
import { W9e } from "../pathClassification.js";

/**
 * 给插件 MCP 服务器加作用域前缀：名字改为 plugin:<插件名>:<服务器名>，scope=dynamic，记录来源插件。
 */
//@ chunk-e6aww6q8.js:605143-605292 fingerprint = addPluginScopeToServers (1)
function addPluginScopeToServers(servers, pluginName, pluginSource) {
  let scopedServers = {};
  for (let [h, y] of Object.entries(servers)) {
    let scopedName = `plugin:${pluginName}:${h}`;
    scopedServers[scopedName] = { ...y, scope: "dynamic", source: pluginName, pluginSource: pluginSource };
  }
  return scopedServers;
}
//@ chunk-e6aww6q8.js:3808451-3808485 placement
var TENGU_RECURSIVE_LOBSTER = "tengu_recursive_lobster";
//@ chunk-e6aww6q8.js:3808485-3808522 placement
function aBr() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_RECURSIVE_LOBSTER, !1) === !0;
}
//@ chunk-e6aww6q8.js:3808522-3808578 placement
var TENGU_STARRY_LOCKET = "tengu_starry_locket",
  TENGU_TWINKLY_PRISM = "tengu_twinkly_prism";
//@ chunk-e6aww6q8.js:3808578-3808622 placement
function M4r() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_TWINKLY_PRISM, !1) === !0 && N5r();
}
//@ chunk-e6aww6q8.js:3808622-3808670 placement
function TFn(e) {
  return marketplaceOf(e.source) === SYNCED && M4r();
}
//@ chunk-e6aww6q8.js:3808670-3808697 placement
var D4r = new HostScoped(() => new Set());
//@ chunk-e6aww6q8.js:3808697-3808887 placement
function getMcpRegistrationOfferState(e, n, r) {
  let s = r?.[getServerKey(e, n)];
  if (!isRegistrationPendingEntry(s) || s.clientId) return "unknown";
  let h = s.discoveryState?.registrationNotOfferedAt;
  if (h === void 0) return "unknown";
  return D9t(h) ? "unable" : "recheck";
}
/**
 * 按凭据存储判断插件提供的 MCP 服务器哪些可用。
 */
//@ chunk-e6aww6q8.js:3808887-3810244 placement
async function filterPluginMcpServersByCredentials(e, n, { sessionLoad: sessionLoad }) {
  for (let [y, S] of Object.entries(n))
    if ("redialToRelearnRegistration" in S) {
      let w = { ...S };
      (delete w.redialToRelearnRegistration, (n[y] = w));
    }
  if (
    marketplaceOf(e.source) !== SYNCED ||
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_STARRY_LOCKET, !1) !== !0 ||
    (aBr() && getIsInteractive())
  )
    return;
  let s = [];
  for (let [y, S] of Object.entries(n)) {
    if (
      (S.type !== "http" && S.type !== "sse") ||
      S.oauth?.clientId ||
      S.oauth?.xaa ||
      usesNonOAuthAuth(S) ||
      S.url.includes("${") ||
      !URL.canParse(S.url)
    )
      continue;
    let w = new URL(S.url);
    if (w.username === "" && w.password === "") s.push([y, S]);
  }
  if (s.length === 0 || !N5r()) return;
  let h;
  try {
    h = await readMcpOAuthStore();
  } catch (error) {
    logForDebugging(
      `Could not read the credentials store to judge ${e.name}'s MCP servers; keeping them all: ${errorMessage(error)}`,
      { level: "warn" },
    );
    return;
  }
  for (let [y, S] of s) {
    let w = getMcpRegistrationOfferState(`plugin:${e.name}:${y}`, S, h);
    if (w === "recheck" && sessionLoad)
      ((n[y] = { ...S, redialToRelearnRegistration: !0 }),
        logForDebugging(
          `MCP server "${y}" of synced plugin ${e.name} is due a fresh sign-in check: its record that a terminal cannot register is more than ${Gls / 86400000} days old or dated in the future`,
        ));
    if (w !== "unable") continue;
    if ((delete n[y], !sessionLoad)) continue;
    let L = onProcessRootHost(D4r),
      G = `${e.source}
${y}`;
    if (L.has(G)) continue;
    (L.add(G),
      logForDebugging(
        `Left out MCP server "${y}" of synced plugin ${e.name}: its last sign-in attempt found no way for a terminal to register (GrowthBook flag ${TENGU_STARRY_LOCKET})`,
      ),
      logEvent("tengu_plugins_sync_mcp_server_left_out", {
        transportType: fromEnumOpt(S.type),
        mcpServerBaseUrl: safeOrigin(getLoggingSafeMcpBaseUrl(S)),
        ...buildPluginSourceFields({ pluginSource: e.source }),
      }));
  }
}
/**
 * 从插件里的 .mcpb/.dxt 包加载 MCP 服务器：loadMcpbFile 解压与生成配置，需要用户配置时返回 needs-config 状态。
 */
//@ chunk-e6aww6q8.js:3810244-3811399 fingerprint = loadMcpServersFromMcpb (0.907)
async function loadMcpServersFromMcpb(e, n, r, s, h, y) {
  let S = redactUrlQuery(n);
  try {
    logForDebugging(`Loading MCP servers from MCPB: ${S}`);
    let pluginId = e.repository,
      L = await loadMcpbFile(
        n,
        e.path,
        pluginId,
        (status) => {
          logForDebugging(`MCPB [${e.name}]: ${status}`);
        },
        void 0,
        void 0,
        h,
        y,
      );
    if ("status" in L && L.status === "needs-config")
      return (
        logForDebugging(
          `MCPB ${S} requires user configuration; MCP server "${quotedPrintable(L.manifest.name)}" not started. ` +
            `Configure via: /plugin \u2192 Installed \u2192 ${e.name} \u2192 Configure`,
        ),
        s.push(mcpbNeedsConfigWarning(e, L.manifest.name)),
        null
      );
    let successResult = L,
      serverName = successResult.manifest.name;
    logForDebugging(
      `Loaded MCP server "${serverName}" from MCPB (extracted to ${successResult.extractedPath})`,
    );
    let Z =
      n.startsWith("http") || mcpbNeedsUserConfig(successResult.manifest)
        ? { ...successResult.mcpConfig, pluginEndpointTemplated: !0 }
        : successResult.mcpConfig;
    return { [serverName]: Z };
  } catch (error) {
    let errorMsg = redactUrlsInMessage(errorMessage(error));
    logForDebugging(`Failed to load MCPB ${S}: ${errorMsg}`, { level: "error" });
    let repository = e.repository;
    if (n.startsWith("http") && (errorMsg.includes("download") || errorMsg.includes("network")))
      r.push({ type: "mcpb-download-failed", source: repository, plugin: e.name, url: S, reason: errorMsg });
    else if (errorMsg.includes("manifest") || errorMsg.includes("user configuration"))
      r.push({
        type: "mcpb-invalid-manifest",
        source: repository,
        plugin: e.name,
        mcpbPath: S,
        validationError: errorMsg,
      });
    else
      r.push({
        type: "mcpb-extract-failed",
        source: repository,
        plugin: e.name,
        mcpbPath: S,
        reason: errorMsg,
      });
    return null;
  }
}
//@ chunk-e6aww6q8.js:3811399-3811551 layout
function mcpbNeedsUserConfig(e) {
  if (e.user_config && Object.keys(e.user_config).length > 0) return !0;
  return /\$\{(?:HOME|DESKTOP|DOCUMENTS|DOWNLOADS)\}/.test(jsonStringify(e.server ?? {}));
}
//@ chunk-e6aww6q8.js:3811551-3811812 layout
function isExemptFromSkipPluginMcp(e, { fullIdsOnly: fullIdsOnly }) {
  let r = env.CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS_EXCEPT;
  if (!r) return !1;
  let s = isProjectLocalPlugin(e);
  if (fullIdsOnly && s) return !1;
  let h = !fullIdsOnly && !s;
  return r.split(",").some((y) => {
    let trimmed = y.trim();
    if (!trimmed) return !1;
    return trimmed.includes("@")
      ? pluginNamesEqual(trimmed, e.repository)
      : h && pluginNamesEqual(trimmed, e.name);
  });
}
/**
 * 发现一个插件提供的 MCP 服务器：.mcp.json + manifest.mcpServers（路径/内联/MCPB 包），受 CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS(_EXCEPT)、CLAUDE_CODE_SKIP_PLUGIN_MCP_BUNDLES 等控制；返回 名字→配置。
 */
//@ chunk-e6aww6q8.js:3811812-3815254 layout
async function loadPluginMcpServersFromSources(
  e,
  n = [],
  r,
  s,
  { readOnlyListing: h = !1, warnings: y = [] } = {},
) {
  if (e.isBuiltin) return;
  if (env.CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS) {
    if (!isExemptFromSkipPluginMcp(e, { fullIdsOnly: !1 })) {
      logForDebugging(
        `Skipping plugin MCP server discovery for "${e.name}" (CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS is set)`,
      );
      return;
    }
    logForDebugging(
      `Loading MCP servers for "${e.name}" despite CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS (exempted via CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS_EXCEPT)`,
    );
  }
  if (e.skipMcpDiscovery) return {};
  if (TFn(e)) {
    logForDebugging(
      `Skipping MCP server discovery for claude.ai-synced plugin "${e.name}": the GrowthBook flag ${TENGU_TWINKLY_PRISM} is on`,
    );
    return;
  }
  let S = isExemptFromSkipPluginMcp(e, { fullIdsOnly: !0 }),
    w = !S && env.CLAUDE_CODE_SKIP_PLUGIN_LOCAL_MCP_SERVERS,
    L = w || (!S && env.CLAUDE_CODE_SKIP_PLUGIN_MCP_BUNDLES),
    G = {},
    q = [],
    Z = isProjectLocalPlugin(e),
    Se = h && hasMarketplaceAlias(e.source),
    ke = 0,
    we = (Ie) => {
      if (L && isMcpbSource(Ie))
        return (
          logForDebugging(
            `Skipping MCPB source "${redactUrlQuery(Ie)}" of plugin "${e.name}" (CLAUDE_CODE_SKIP_PLUGIN_LOCAL_MCP_SERVERS or CLAUDE_CODE_SKIP_PLUGIN_MCP_BUNDLES is set)`,
          ),
          !0
        );
      if (Se) return (ke++, !0);
      if (!Z) return !1;
      if (isMcpbSource(Ie))
        return (
          logForDebugging(
            `Skipping MCPB source "${redactUrlQuery(Ie)}" for directory-loaded plugin "${e.name}": ` +
              "not resolved without a pre-approval download here \u2014 declare MCP servers inline or via a local in-dir .mcp.json.",
            { level: "warn" },
          ),
          !0
        );
      if (containsPathTraversal(Ie) || Ie.split(/[/\\]/).some((Me) => /^\.\. [ .]*$/.test(Me)))
        return (
          logForDebugging(
            `Skipping out-of-directory MCP source "${redactUrlQuery(Ie)}" for directory-loaded plugin "${e.name}": it may only reference files inside the plugin directory here.`,
            { level: "warn" },
          ),
          !0
        );
      return !1;
    },
    Ee = Se ? null : await loadMcpServersFromFile(e, ".mcp.json", r, { confine: Z });
  if (Ee) G = { ...G, ...Ee };
  if (e.manifest.mcpServers) {
    let mcpServers = e.manifest.mcpServers;
    if (typeof mcpServers === "string")
      if (we(mcpServers));
      else if (isMcpbSource(mcpServers)) {
        let Me = await loadMcpServersFromMcpb(e, mcpServers, n, q, r, s);
        if (Me) G = { ...G, ...Me };
      } else {
        let Me = await loadMcpServersFromFile(e, mcpServers, r, { confine: Z });
        if (Me) G = { ...G, ...Me };
      }
    else if (Array.isArray(mcpServers)) {
      let mapped = mcpServers.map((ze) => ({ spec: ze, specWarnings: [] })),
        results = await Promise.all(
          mapped.map(async ({ spec: spec, specWarnings: specWarnings }) => {
            try {
              if (typeof spec === "string") {
                if (we(spec)) return null;
                if (isMcpbSource(spec)) return await loadMcpServersFromMcpb(e, spec, n, specWarnings, r, s);
                return await loadMcpServersFromFile(e, spec, r, { confine: Z });
              }
              return spec;
            } catch (error) {
              let nt =
                typeof spec === "string"
                  ? replaceAll(String(error), join_100(e.path, spec), join_100(e.path, redactUrlQuery(spec)))
                  : String(error);
              return (
                logForDebugging(
                  `Failed to load MCP servers from spec for plugin ${e.name}: ${redactUrlsInMessage(nt)}`,
                  { level: "error" },
                ),
                null
              );
            }
          }),
        );
      for (let ze of results) if (ze) G = { ...G, ...ze };
      q.push(...mapped.flatMap(({ specWarnings: specWarnings }) => specWarnings));
    } else G = { ...G, ...mcpServers };
  }
  if (ke > 0)
    logForDebugging(
      `Read-only listing: omitted ${ke} file / bundle MCP server source(s) of directory-loaded plugin "${e.name}" (inline declarations only; a session load resolves them).`,
    );
  for (let [Ie, Me] of Object.entries(G)) {
    let We = unaddableTransportReason(Me.type);
    if (We === null) {
      if (w && Me.type !== "sse" && Me.type !== "http" && Me.type !== "ws")
        (delete G[Ie],
          logForDebugging(
            `Skipping MCP server "${Ie}" of plugin "${e.name}": only sse, http and ws servers load while CLAUDE_CODE_SKIP_PLUGIN_LOCAL_MCP_SERVERS is set`,
          ));
      continue;
    }
    (delete G[Ie],
      n.push({
        type: "mcp-config-invalid",
        source: e.source,
        plugin: e.name,
        serverName: Ie,
        validationError:
          We === "host-only"
            ? `type "${Me.type}" servers cannot be declared by a plugin; only the host application registers them`
            : `type "${Me.type}" servers cannot be declared by a plugin; only claude.ai connectors use that type`,
      }),
      logForDebugging(`Dropped MCP server "${Ie}" of plugin ${e.name}: ${We} transport type "${Me.type}"`, {
        level: "warn",
      }));
  }
  y.push(...q);
  let flattened = q.flatMap((Ie) => (Ie.type === "mcpb-needs-config" ? [Ie.serverName] : []));
  return (
    (e.mcpServersNeedingConfig = flattened.length > 0 ? flattened : void 0),
    await filterPluginMcpServersByCredentials(e, G, { sessionLoad: !h }),
    Object.keys(G).length > 0 ? G : void 0
  );
}
/**
 * 返回插件的 MCP 服务器（已缓存在插件对象上则直接用，否则发现后写回）。
 */
//@ chunk-e6aww6q8.js:3815254-3815416 file-local
async function extractMcpServersFromPlugins(e, n, r, { warnings: s = [] } = {}) {
  if (e.mcpServers) return (pushMcpbNeedsConfigWarnings(e, s), e.mcpServers);
  let h = await loadPluginMcpServersFromSources(e, n, r, void 0, { warnings: s });
  if (h) e.mcpServers = h;
  return h;
}
//@ chunk-e6aww6q8.js:3815416-3815494 layout
function pushMcpbNeedsConfigWarnings(e, n) {
  for (let r of e.mcpServersNeedingConfig ?? []) n.push(mcpbNeedsConfigWarning(e, r));
}
//@ chunk-e6aww6q8.js:3815494-3815592 layout
function mcpbNeedsConfigWarning(e, n) {
  return { type: "mcpb-needs-config", source: e.repository, plugin: e.name, serverName: n };
}
/**
 * 读取插件内一个 MCP 配置文件（.mcp.json 形状），可限定不逃出插件目录；存储后端模式下经存储层读。
 */
//@ chunk-e6aww6q8.js:3815592-3816522 fingerprint = loadMcpServersFromFile (0.864)
async function loadMcpServersFromFile(e, n, r, { confine: s = !1 } = {}) {
  let fs = getFsImplementation(),
    filePath = join_100(e.path, n),
    S = (G) => replaceAll(G, join_100(e.path, n), join_100(e.path, redactUrlQuery(n)));
  if (s) {
    let G = await resolvePluginDirComponentPath(e, n);
    if (G === null) return null;
    filePath = G;
  }
  let content,
    L = isStorageV5Enabled() && r !== void 0 ? kkn(filePath, projectPluginCacheDir()) : null;
  if (r !== void 0 && L !== null) {
    let read = await r.read([L]);
    if (!read.ok)
      return (
        logForDebugging(S(`Failed to load MCP servers from ${filePath}: ${formatStorageError(read.error)}`), {
          level: "error",
        }),
        null
      );
    let q = read.value.items[0];
    if (!q?.found) return null;
    content = Buffer.from(q.value).toString("utf-8");
  } else
    try {
      content = await fs.readFile(filePath, { encoding: "utf-8" });
    } catch (error) {
      if (isENOENT(error)) return null;
      return (
        logForDebugging(S(`Failed to load MCP servers from ${filePath}: ${error}`), { level: "error" }),
        null
      );
    }
  try {
    let parsed = jsonParse(content),
      mcpServers = parsed.mcpServers || parsed,
      validatedServers = {};
    for (let [Se, ke] of Object.entries(mcpServers)) {
      let result = McpServerConfigSchema().safeParse(ke);
      if (result.success) validatedServers[Se] = result.data;
      else
        logForDebugging(S(`Invalid MCP server config for ${Se} in ${filePath}: ${result.error.message}`), {
          level: "error",
        });
    }
    return validatedServers;
  } catch (error) {
    return (
      logForDebugging(S(`Failed to load MCP servers from ${filePath}: ${error}`), { level: "error" }),
      null
    );
  }
}
/**
 * 列出插件 manifest.channels 中缺少必填用户配置的频道（供启用时弹出配置对话框）。
 */
//@ chunk-e6aww6q8.js:3816522-3816871 fingerprint = getUnconfiguredChannels (1)
async function getUnconfiguredChannels(e, n) {
  let channels = e.manifest.channels;
  if (!channels || channels.length === 0) return [];
  let pluginId = e.repository,
    unconfigured = [];
  for (let channel of channels) {
    if (!channel.userConfig || Object.keys(channel.userConfig).length === 0) continue;
    let saved = (await loadMcpServerUserConfig(pluginId, channel.server, n)) ?? {};
    if (!validateUserConfig(saved, channel.userConfig).valid)
      unconfigured.push({
        server: channel.server,
        displayName: Tct(channel.displayName) ?? channel.server,
        configSchema: channel.userConfig,
      });
  }
  return unconfigured;
}
/**
 * 给插件 MCP 服务器加 plugin:<插件>:<服务器> 前缀并标 scope=dynamic、pluginSource/pluginPath，官方背书时标 pluginOfficialSourceVouched。
 */
//@ chunk-e6aww6q8.js:3816871-3817125 layout = addPluginScopeToServers (0.786)
function addPluginScopeToServers_2(e, n, r, s, h = !1) {
  let scopedServers = {},
    S = pluginDisplayKey(n, r);
  for (let [w, L] of Object.entries(e)) {
    let scopedName = `plugin:${S}:${w}`,
      q = { ...L, scope: "dynamic", pluginSource: r, pluginPath: s };
    if (h) q.pluginOfficialSourceVouched = !0;
    else delete q.pluginOfficialSourceVouched;
    scopedServers[scopedName] = q;
  }
  return scopedServers;
}
/**
 * 合并插件级 userConfig 与频道级 userConfig 的已保存值（含默认值），供替换 ${user_config.X}。
 */
//@ chunk-e6aww6q8.js:3817125-3817371 fingerprint = loadChannelUserConfig (1)
async function loadChannelUserConfig(e, n, r) {
  let userConfig = e.manifest.userConfig,
    y = e.manifest.channels?.find((L) => L.server === n)?.userConfig;
  if (!userConfig && !y) return;
  let S = userConfig ? await loadPluginOptions(marketplaceSource(e), r) : void 0,
    w = y ? ((await loadMcpServerUserConfig(e.repository, n, r)) ?? void 0) : void 0;
  return applyUserConfigDefaults({ ...S, ...w }, { ...userConfig, ...y });
}
/**
 * 解析插件 MCP 服务器配置中的变量：${CLAUDE_PLUGIN_ROOT}/${CLAUDE_PLUGIN_DATA}/${CLAUDE_PROJECT_DIR}/${user_config.X}/${ENV}，并为 stdio 服务器注入 CLAUDE_PLUGIN_ROOT/CLAUDE_PLUGIN_DATA 环境变量；缺失变量记错误。
 */
//@ chunk-e6aww6q8.js:3817440-3820347 fingerprint = resolvePluginMcpEnvironment (0.42)
function resolvePluginMcpEnvironment(config, plugin, userConfig, errors, pluginName, serverName) {
  let S = [],
    w,
    L,
    G = [],
    q,
    Z = scrubbedEnvKeys(),
    Se = "pluginEndpointTemplated" in config && config.pluginEndpointTemplated === !0,
    ke = (Ie, { remoteSink: Me = !1, selectsEndpoint: We = !1 } = {}) => {
      if (We && Ie.includes("${CLAUDE_PROJECT_DIR}")) Se = !0;
      let resolved = substitutePluginVariables(Ie, plugin),
        lt = resolved;
      if (userConfig) resolved = substituteUserConfigVariables(resolved, userConfig);
      let { expanded: expanded, missingVars: missingVars } = expandMcpCredentialEnvVars(
        resolved,
        void 0,
        void 0,
        { remoteSink: Me, blankList: Z },
      );
      if ((S.push(...missingVars), We && (expanded !== lt || missingVars.length > 0))) Se = !0;
      return expanded;
    },
    we;
  switch (config.type) {
    case void 0:
    case "stdio": {
      let stdioConfig = { ...config };
      if (stdioConfig.command) stdioConfig.command = ke(stdioConfig.command, { selectsEndpoint: !0 });
      if (stdioConfig.args)
        stdioConfig.args = stdioConfig.args.map((arg) => ke(arg, { selectsEndpoint: !0 }));
      let resolvedEnv = {
        CLAUDE_PLUGIN_ROOT: plugin.path,
        CLAUDE_PLUGIN_DATA: ensurePluginDataDir(plugin.source),
        ...(stdioConfig.env || {}),
      };
      for (let [We, ze] of Object.entries(resolvedEnv))
        if (!PLUGIN_ENV_VAR_SET.has(We)) resolvedEnv[We] = ke(ze, { selectsEndpoint: !0 });
      ((stdioConfig.env = resolvedEnv), (q = stdioIdentityDiff(config, stdioConfig)), (we = stdioConfig));
      break;
    }
    case "sse":
    case "http":
    case "ws": {
      let remoteConfig = { ...config };
      L = remoteConfig.url;
      let Me = S.length;
      if (remoteConfig.url) remoteConfig.url = ke(remoteConfig.url, { remoteSink: !0, selectsEndpoint: !0 });
      if (((G = S.slice(Me)), remoteConfig.headers)) {
        let resolvedHeaders = {};
        for (let [ze, lt] of Object.entries(remoteConfig.headers))
          resolvedHeaders[ze] = ke(lt, { remoteSink: !0 });
        remoteConfig.headers = resolvedHeaders;
      }
      if (remoteConfig.headersHelper)
        if (userConfig && hasUserConfigVariables(remoteConfig.headersHelper, userConfig)) {
          if (
            ((w = `headersHelper for MCP server '${serverName ?? "<unnamed>"}' references \${user_config.*}. The substituted value would be passed to a shell; read the value inside the helper script instead (e.g. from an env var set in the server's "env" block).`),
            errors && pluginName && serverName)
          )
            errors.push({
              type: "mcp-config-invalid",
              source: plugin.source,
              plugin: pluginName,
              serverName: serverName,
              validationError: w,
            });
        } else {
          let We = substitutePluginVariables(remoteConfig.headersHelper, plugin),
            ze = subprocessEnv(),
            lt = { ...ze },
            Je = new Set(listSecretEnvNames(ze));
          for (let yt of Je) delete lt[yt];
          Object.assign(lt, sanitizeEnvCredentials(lt).respelled);
          let replaced = We.replace(new RegExp(_8e, "g"), (yt, gt) =>
              Je.has(gt) ? (yt.includes(":-") ? yt.slice(yt.indexOf(":-") + 2, -1) : "") : yt,
            ),
            { expanded: expanded, missingVars: missingVars } = expandMcpCredentialEnvVars(
              replaced,
              lt,
              void 0,
              { blankAsLive: !0, blankList: Z },
            );
          (S.push(...missingVars), (remoteConfig.headersHelper = expanded));
        }
      we = remoteConfig;
      break;
    }
    case "sse-ide":
    case "ws-ide":
    case "sdk":
    case "claudeai-proxy":
      ((we = config), (Se = !0));
      break;
  }
  if (errors && S.length > 0) {
    let Ie = uniq(S),
      varList = Ie.join(", ");
    if (
      (logForDebugging(`Missing environment variables in plugin MCP config: ${varList}`, { level: "warn" }),
      pluginName && serverName)
    )
      errors.push({
        type: "mcp-config-invalid",
        source: plugin.source,
        plugin: pluginName,
        serverName: serverName,
        validationError: formatWithheldEnvNotice(Ie, isManagedPluginScope({ pluginSource: plugin.source })),
      });
  }
  let Ee;
  if ((we.type === "sse" || we.type === "http" || we.type === "ws") && "url" in we) {
    let Ie = !1;
    try {
      (new URL(we.url), (Ie = !0));
    } catch {}
    if (!Ie) {
      if (!L?.trim()) ((Ee = "url_empty"), (w = "No URL configured for this server"));
      else if (G.length > 0)
        ((Ee = "env_missing"),
          (w = formatWithheldEnvNotice(uniq(G), isManagedPluginScope({ pluginSource: plugin.source }))));
      else if (
        ((Ee = L.includes("${user_config.") ? "user_config_missing" : "url_invalid"),
        (w =
          Ee === "user_config_missing"
            ? `URL is unset or invalid \u2014 open /plugin manage and configure ${pluginName ?? "the plugin"} options`
            : `Plugin ${pluginName ?? plugin.source} has an invalid MCP url`),
        errors && pluginName && serverName)
      )
        errors.push({
          type: "mcp-config-invalid",
          source: plugin.source,
          plugin: pluginName,
          serverName: serverName,
          validationError: w,
        });
    }
  }
  let Ae = { ...(q && { configuredCommand: q }), ...we, ...(w && { configError: w, configErrorReason: Ee }) };
  return Se ? { ...Ae, pluginEndpointTemplated: !0 } : Ae;
}
/**
 * 已启用插件的最终 MCP 服务器配置（变量已解析）；供 MCP 配置合并（services/mcp/config）使用。
 */
//@ chunk-e6aww6q8.js:3820347-3820777 fingerprint = getPluginMcpServers (0.644)
async function getPluginMcpServers(e, n = [], r, s, h = []) {
  if (!e.enabled) return;
  if (e.mcpServers) pushMcpbNeedsConfigWarnings(e, h);
  let servers = e.mcpServers || (await loadPluginMcpServersFromSources(e, n, r, s, { warnings: h }));
  if (!servers) return;
  let resolvedServers = {};
  for (let [w, L] of Object.entries(servers)) {
    let G = await loadChannelUserConfig(e, w, s);
    try {
      resolvedServers[w] = runWithPluginWriteScope({ pluginSource: e.source }, () =>
        resolvePluginMcpEnvironment(L, e, G, n, e.name, w),
      );
    } catch (err) {
      n?.push({ type: "generic-error", source: w, plugin: e.name, error: printableMessage(err) });
    }
  }
  return addPluginScopeToServers_2(
    resolvedServers,
    e.name,
    e.source,
    e.path,
    e.officialMarketplaceSourceVouched === !0,
  );
}
/**
 * 插件是否声明了 userConfig（名字配错，见 lead 建议）。
 */
//@ chunk-d4eg9at2.js:46214-46302 fingerprint = buildMcpUserConfig (1)
function hasPluginUserConfig(s) {
  let o = s?.manifest.userConfig;
  return o && Object.keys(o).length > 0 ? !0 : void 0;
}
/**
 * 列出插件声明的 MCP 服务器配置（.mcp.json 与 manifest.mcpServers 中的文件/内联项，不含 MCPB 包），用于展示。
 */
//@ chunk-k9mgeeff.js:3581-3828 fingerprint = loadPluginMcpServers (0.615)
async function loadPluginMcpServers(n) {
  if (n.isBuiltin) return [];
  let e = [await readMcpServerNames(await O(n, ".mcp.json"))];
  for (let r of [n.manifest.mcpServers ?? []].flat())
    if (typeof r !== "string") e.push(k(r));
    else if (!isMcpbSource(r) && !containsPathTraversal(r) && !W9e(r))
      e.push(await readMcpServerNames(await resolvePluginDirComponentPath(n, r)));
  return e.flat();
}

export {
  getPluginMcpServers,
  extractMcpServersFromPlugins,
  addPluginScopeToServers,
  loadPluginMcpServersFromSources,
  hasPluginUserConfig,
  aBr,
  getUnconfiguredChannels,
  loadPluginMcpServers,
  addPluginScopeToServers_2,
};
