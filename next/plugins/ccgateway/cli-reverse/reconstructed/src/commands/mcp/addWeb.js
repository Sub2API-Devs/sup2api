/**
 * commands/mcp/addWeb.ts
 *
 * `/mcp add --web`：校验 https 地址与名字、查 claude.ai 连接器目录、给出（不）连接原因并引导到 claude.ai（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-v6cve82g.js (5)
 * attribution: placement 5
 */
import { createHash } from "crypto";
import { createInterface } from "readline";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, array, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { isPluginDirectoryAccessAllowed } from "../../utils/plugins/pluginDirectorySearch.js";
import {
  mcpDirectoryVisibility,
  normalizeServerUrl,
  apiClient,
  normalizeMcpServerUrl,
} from "../../services/routines/routinesApi.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { printablePluginName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { withTimeout } from "../../utils/sleep.js";
import {
  initializeGrowthBook,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import {
  cliError,
  cliErrorAfterAnalyticsFlush,
  cliOkAfterAnalyticsFlush,
  exitAfterAnalyticsFlush,
} from "../../cli/exit.js";
import {
  logFeatureBadAsync,
  logFeatureOkAsync,
  logFeatureSadAsync,
} from "../../services/analytics/featureTelemetry.js";
import { redactSecrets } from "../../services/teamMemorySync/secretScanner.js";
import { awaitMcpPolicyColdStart } from "../../services/mcp/mcpPolicyColdStart.js";
import {
  shouldSkipClaudeAiFetchForEnterpriseLockdown,
  getClaudeCodeMcpConfigs,
  dedupClaudeAiMcpServers,
} from "../../services/mcp/config.js";
import {
  fetchClaudeAiConfigsOnce,
  printClaudeAiConnectorNotice,
  hasTransientConfigFailure,
  claudeAiConnectorAuthUrl,
  getConnectorsSettingsUrl,
  connectorsSettingsUrlFor,
  addConnectorUrl,
} from "../../services/mcp/claudeai.js";
import { getCliOwnedState } from "../../services/mcp/cliOwnedClients.js";
import {
  matchingConnectorsFor,
  CONNECTOR_AUTO_CONNECT_REASONS,
  findMatchingConnector,
} from "../../services/mcp/mcpRegistrationAdvice.js";
import { hasBlockingResult_2 } from "../../utils/hooks.js";
import { getSubscriptionType, getOauthAccountInfo } from "../../utils/auth.js";
import { pickByHelper } from "../../utils/git/gitSafeEnv.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import { isOnClaudeCodeSessionSurface } from "../../utils/teammate.js";
import { isBrowserUnavailable, openValidatedUrlSucceeded } from "../../utils/browser.js";
import { logEventAsync } from "../../services/analytics/index.js";
import { createHyperlink } from "../../utils/hyperlink.js";
import { stopCapturingEarlyInput } from "../../utils/earlyInput.js";

//@ chunk-v6cve82g.js:13799-14101 placement
/**
 * claude.ai 连接器目录响应的形状（id/slug/name/verified_tier/remote）。
 */
var SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
var RESERVED_CONNECTOR_SLUGS = new Set(["anthropic", "partner"]);
var LOOKUP_TIMEOUT_MS = 5000;
var LOOKUP_MAX_BYTES = 1048576;
var MAX_NAME_CHARS = 80;
var serverEntrySchema = DoctorLazy(() =>
  objectSchema({
    id: stringSchema(),
    slug: stringSchema().nullish().catch(undefined),
    name: stringSchema().min(1),
    verified_tier: stringSchema().nullish().catch(undefined),
    remote: objectSchema({
      url: stringSchema().nullish(),
    })
      .nullish()
      .catch(undefined),
  }),
);
var listingResponseSchema = DoctorLazy(() =>
  objectSchema({
    servers: array(unknown()).nullish(),
  }),
);
//@ chunk-v6cve82g.js:14101-14955 placement
/**
 * 向 claude.ai 目录按地址哈希查询该地址是否已收录（未登录/失败/不唯一都算不可用）。
 */
async function lookupDirectoryServer(serverUrl) {
  if (URL.parse(serverUrl)?.search !== "") return "not_listed";
  if (!isPluginDirectoryAccessAllowed()) return "unavailable";
  let visibility = mcpDirectoryVisibility();
  if (visibility.length === 0) return "not_listed";
  let uRLSearchParams = new URLSearchParams({
    url_hash: createHash("sha256").update(normalizeServerUrl(serverUrl)).digest("hex"),
    visibility: visibility.join(","),
  });
  try {
    let response = await apiClient.get(`/api/directory/servers?${uRLSearchParams}`, {
      auth: "none",
      timeout: LOOKUP_TIMEOUT_MS,
      maxContentLength: LOOKUP_MAX_BYTES,
    });
    if (!response.ok) return "unavailable";
    let parsed = listingResponseSchema().safeParse(response.data);
    if (!parsed.success) return "unavailable";
    let servers = parsed.data.servers ?? [];
    let server = serverEntrySchema().safeParse(servers[0]).data;
    let found = [server?.slug, server?.id].find(
      (candidate) => typeof candidate === "string" && SLUG_PATTERN.test(candidate),
    );
    if (servers.length === 1 && server === undefined) return "unavailable";
    if (
      servers.length !== 1 ||
      server === undefined ||
      found === undefined ||
      found === null ||
      !RESERVED_CONNECTOR_SLUGS.has(server.verified_tier ?? "") ||
      normalizeMcpServerUrl(server.remote?.url ?? "") !== normalizeMcpServerUrl(serverUrl)
    )
      return "not_listed";
    return {
      name: truncateToLength(printablePluginName(server.name).trim(), MAX_NAME_CHARS) || found,
      needed: found,
    };
  } catch (error) {
    logForDebugging(`directory listing lookup failed: ${errorMessage(error)}`);
    return "unavailable";
  }
}
//@ chunk-v6cve82g.js:14955-15348 placement
/**
 * --web 的特性开关名、超时与各类提示文案、看起来像密钥的参数名正则。
 */
var TENGU_TWINKLING_AURORA = "tengu_twinkling_aurora";
var LOOKUP_TTL_MS = 3000;
var MAX_PAYLOAD_BYTES = 2048;
var MAX_TOKEN_CHARS = 128;
var RELOAD_HINT = "To load its tools, run /reload-plugins in an open session or start a new one.";
var BLOCKED_CONNECTOR_NOTE =
  "A connector at that address is on your claude.ai account, but it's turned off or blocked in Claude Code. Check it with /mcp inside Claude Code.";
var SECRETISH_KEY_PATTERN =
  /(^|[_[-])(api_?key|key|token|secret|passw(or)?d|pwd|auth|sig|signature|credentials?)(\]|\[\])*$|^code$/i;
//@ chunk-v6cve82g.js:15348-22060 placement
/**
 * `/mcp add --web` 主流程：名字与 https 地址校验、密钥泄露检测、目录与策略判定，交互式轮询连接结果。
 */
async function addWebConnector(connectorName, connectorUrl, otherOptions, storageV5, credentials) {
  await withTimeout(initializeGrowthBook(), LOOKUP_TTL_MS, "feature settings fetch timed out").catch(
    () => {},
  );
  if (getFeatureValue_CACHED_MAY_BE_STALE(TENGU_TWINKLING_AURORA, false) !== true)
    return cliError(
      "--web isn't available yet. To add it to your local config, remove --web and use --transport http for an https address.",
    );
  if (otherOptions.length > 0) {
    await logFeatureBadAsync("cli_mcp_add_web", "unsupported_option");
    return cliErrorAfterAnalyticsFlush(
      `--web takes only a name and an https address, so it can't be used with ${otherOptions.join(", ")}. To add it to your local config instead, remove --web and use --transport http for an https address, or set other options up on claude.ai after adding it.`,
    );
  }
  let trimmed = printablePluginName(connectorName).trim();
  if (trimmed === "" || trimmed !== connectorName || connectorName.length > MAX_TOKEN_CHARS) {
    await logFeatureBadAsync("cli_mcp_add_web", "invalid_name");
    return cliErrorAfterAnalyticsFlush(
      `The name must be 1 to ${MAX_TOKEN_CHARS} characters, with no spaces at either end and no control or hidden characters.`,
    );
  }
  let parsedUrl = URL.parse(connectorUrl);
  if (
    parsedUrl?.protocol !== "https:" ||
    connectorUrl.length > MAX_PAYLOAD_BYTES ||
    parsedUrl.username !== "" ||
    parsedUrl.password !== "" ||
    connectorUrl.includes("#") ||
    printablePluginName(connectorUrl) !== connectorUrl ||
    connectorUrl.includes("${") ||
    normalizeMcpServerUrl(connectorUrl) !== normalizeMcpServerUrl(parsedUrl.href)
  ) {
    await logFeatureBadAsync("cli_mcp_add_web", "invalid_url");
    return cliErrorAfterAnalyticsFlush(
      `--web needs an https:// address of at most ${MAX_PAYLOAD_BYTES} characters, with no spaces, ./ or ../ parts, # characters, user name or password, hidden characters or \${...} in it.`,
    );
  }
  if (
    redactSecrets(connectorUrl) !== connectorUrl ||
    [...parsedUrl.searchParams.keys()].some((key) =>
      SECRETISH_KEY_PATTERN.test(key.replace(/([a-z\d]|[A-Z](?=[A-Z][a-z]))([A-Z])/g, "$1_$2")),
    )
  ) {
    await logFeatureBadAsync("cli_mcp_add_web", "secret_in_url");
    return cliErrorAfterAnalyticsFlush(
      "That address looks like it contains a secret, such as a key or token. --web would put it in your browser history and send it to claude.ai, so it stopped. Remove the secret and try again, or if it isn't a secret, add the connector on claude.ai directly.",
    );
  }
  await awaitMcpPolicyColdStart({
    hasDynamicMcpConfig: false,
  });
  if (shouldSkipClaudeAiFetchForEnterpriseLockdown()) {
    await logFeatureBadAsync("cli_mcp_add_web", "enterprise_lockdown");
    return cliErrorAfterAnalyticsFlush(
      "Your organization manages this computer's MCP servers, so claude.ai connectors don't load in Claude Code here. Ask your administrator about adding this server to the managed settings.",
    );
  }
  let flag = await fetchClaudeAiConfigsOnce(credentials);
  printClaudeAiConnectorNotice();
  if (hasTransientConfigFailure(flag)) {
    await logFeatureBadAsync("cli_mcp_add_web", "connector_list_fetch_failed");
    return cliErrorAfterAnalyticsFlush(
      "Claude Code couldn't reach claude.ai to read your connectors. Check your network connection and try again.",
    );
  }
  if (getCliOwnedState().claudeAiConnectorListStatus !== "settled") {
    await logFeatureBadAsync("cli_mcp_add_web", "no_connector_list");
    return cliErrorAfterAnalyticsFlush(
      `Claude Code couldn't read your claude.ai connectors, so "${connectorName}" wouldn't load here. Check that you're signed in with a claude.ai account (\`claude auth login\`) and that claude.ai connectors aren't turned off, then try again.`,
    );
  }
  let serverConfig = {
    type: "claudeai-proxy",
    url: connectorUrl,
    id: "mcpsrv_new",
    scope: "claudeai",
  };
  let { listed, connectorNames, connectors } = matchingConnectorsFor(flag, serverConfig);
  if (listed && connectorNames.length === 0) {
    await logFeatureBadAsync("cli_mcp_add_web", "turned_off_here");
    return cliErrorAfterAnalyticsFlush(BLOCKED_CONNECTOR_NOTE);
  }
  let [connector] = connectors;
  let directoryHit =
    connector === undefined && !hasBlockingResult_2(connectorName, serverConfig)
      ? await lookupDirectoryServer(connectorUrl)
      : "not_listed";
  let listedEntry = typeof directoryHit === "string" ? undefined : directoryHit;
  let finalName = listedEntry?.name ?? connectorName;
  if (connector === undefined && hasBlockingResult_2(finalName, serverConfig)) {
    await logFeatureBadAsync("cli_mcp_add_web", "policy_blocked");
    return cliErrorAfterAnalyticsFlush(
      `Your MCP settings or your organization's policy don't allow "${finalName}" in Claude Code.`,
    );
  }
  if (connector === undefined && listedEntry === undefined) {
    let subscriptionType = getSubscriptionType();
    if (subscriptionType === "team" || subscriptionType === "enterprise") {
      if (directoryHit === "unavailable") {
        await logFeatureBadAsync("cli_mcp_add_web", "directory_unavailable");
        return cliErrorAfterAnalyticsFlush(
          "Claude Code couldn't check this address in the claude.ai connector directory, so it can't tell whether you can add it from here. Add the connector on claude.ai instead.",
        );
      }
      await logFeatureBadAsync("cli_mcp_add_web", "organization_plan");
      return cliErrorAfterAnalyticsFlush(
        "On a Team or Enterprise plan, an organization owner adds custom connectors in claude.ai's admin settings, so Claude Code can't add this one from here.",
      );
    }
  }
  let { servers, pendingProjectServers, rejectedProjectServers } = await getClaudeCodeMcpConfigs(
    {},
    {
      includePendingProjectServers: true,
      includeRejectedProjectServers: true,
      storageV5,
      credentials,
    },
  );
  let { suppressed } = await dedupClaudeAiMcpServers(
    {
      [`claude.ai ${finalName}`]: serverConfig,
    },
    pickByHelper(
      servers,
      (value, name) => !pendingProjectServers.has(name) && !rejectedProjectServers.has(name),
    ),
  );
  let reloadSuffix = ` ${RELOAD_HINT}`;
  let [firstSuppressed] = suppressed;
  if (firstSuppressed !== undefined) {
    reloadSuffix = "";
    process.stdout
      .write(`Your "${printablePluginName(firstSuppressed.duplicateOf)}" MCP server has the same address, so Claude Code will keep using it and this connector's tools won't load in interactive sessions. To use the connector, remove or turn off that server.
`);
  }
  if (connectors.some((connector) => connector.ineligibleReason === "connected")) {
    await dropAuthCache(connectorNames, storageV5);
    await logFeatureOkAsync("cli_mcp_add_web", {
      outcome: lit("already_connected"),
    });
    return cliOkAfterAnalyticsFlush(
      `A connector at that address is already connected on claude.ai.${reloadSuffix}`,
    );
  }
  if (connectors.some((connector) => CONNECTOR_AUTO_CONNECT_REASONS.has(connector.ineligibleReason ?? ""))) {
    await logFeatureOkAsync("cli_mcp_add_web", {
      outcome: lit("organization_connects"),
    });
    return cliOkAfterAnalyticsFlush(
      `Your organization connects this connector for you on claude.ai.${reloadSuffix}`,
    );
  }
  if (listedEntry !== undefined)
    process.stdout
      .write(`That address belongs to "${listedEntry.name}" in the claude.ai connector directory${listedEntry.name === connectorName ? "" : `, so claude.ai will add it under that name, not "${connectorName}"`}.
`);
  else if (connector === undefined)
    process.stdout
      .write(`"${connectorName}" will connect to ${parsedUrl.host}. Add it on claude.ai only if you trust that server.
`);
  let oauthAccountInfo = getOauthAccountInfo();
  if (oauthAccountInfo !== undefined) {
    let orgSuffix = oauthAccountInfo.organizationName
      ? ` (${printablePluginName(oauthAccountInfo.organizationName)})`
      : "";
    process.stdout
      .write(`Claude Code is signed in as ${printablePluginName(oauthAccountInfo.emailAddress)}${orgSuffix}. Use the same account on claude.ai.
`);
  }
  let interactive =
    process.stdin.isTTY === true &&
    process.stdout.isTTY === true &&
    !env.CLAUDE_CODE_REMOTE &&
    !isOnClaudeCodeSessionSurface();
  let openBrowser = interactive && !isBrowserUnavailable();
  let handoffUrl;
  if (connector !== undefined)
    handoffUrl =
      (connectors.length === 1 && connector.ineligibleReason ? claudeAiConnectorAuthUrl(connector) : null) ??
      getConnectorsSettingsUrl();
  else if (listedEntry !== undefined) handoffUrl = connectorsSettingsUrlFor(listedEntry.needed);
  else handoffUrl = addConnectorUrl(connectorName, connectorUrl);
  await dropAuthCache(connectorNames, storageV5);
  await logEventAsync("tengu_mcp_claudeai_handoff_opened", {
    site: lit("mcp_add_web"),
    opened_browser: openBrowser,
  });
  if (openBrowser) {
    process.stdout.write(`Opening claude.ai for "${finalName}"\u2026
`);
    openValidatedUrlSucceeded(handoffUrl);
  }
  process.stdout.write(`${openBrowser ? "If the browser didn't open, visit:" : "Open this link:"}
  ${createHyperlink(handoffUrl, undefined, {
    assumeSupport: true,
  })}

`);
  let prompt =
    connector === undefined && listedEntry === undefined
      ? "On claude.ai, check the name and address, press Add, then press Connect."
      : listedEntry !== undefined
        ? "On claude.ai, press Connect."
        : "On claude.ai, find this connector and finish connecting it.";
  if (!interactive) {
    await logFeatureOkAsync("cli_mcp_add_web", {
      outcome: lit("link_only"),
    });
    return cliOkAfterAnalyticsFlush(`${prompt}${reloadSuffix}`);
  }
  stopCapturingEarlyInput();
  let readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    readline.on("SIGINT", () => readline.close());
    let lines = readline[Symbol.asyncIterator]();
    let now = Date.now();
    let promptText = `${prompt} Then come back and press Enter, or ^C to stop.`;
    while (true) {
      process.stdout.write(`${promptText}
`);
      if ((await lines.next()).done) {
        await logFeatureSadAsync("cli_mcp_add_web", "cancelled");
        return exitAfterAnalyticsFlush(130);
      }
      switch (
        await findMatchingConnector(serverConfig, now, {
          storageV5,
          credentials,
        })
      ) {
        case "connected":
          await logFeatureOkAsync("cli_mcp_add_web", {
            outcome: lit("connected"),
          });
          return cliOkAfterAnalyticsFlush(`"${finalName}" is connected on claude.ai.${reloadSuffix}`);
        case "state_unknown":
          await logFeatureSadAsync("cli_mcp_add_web", "state_unknown");
          return cliOkAfterAnalyticsFlush(
            `claude.ai didn't say whether "${finalName}" is connected. Check it there.${reloadSuffix}`,
          );
        case "not_connected": {
          let refetched = matchingConnectorsFor(await fetchClaudeAiConfigsOnce(credentials), serverConfig);
          if (refetched.listed && refetched.connectorNames.length === 0) {
            await logFeatureBadAsync("cli_mcp_add_web", "turned_off_here");
            return cliErrorAfterAnalyticsFlush(BLOCKED_CONNECTOR_NOTE);
          }
          promptText = `"${finalName}" isn't connected yet for the account Claude Code is signed in to. Finish on claude.ai, then press Enter to check again, or ^C to stop.`;
          break;
        }
        case "list_unavailable":
          promptText = "Couldn't check with claude.ai. Press Enter to try again, or ^C to stop.";
          break;
      }
    }
  } finally {
    readline.close();
  }
}
//@ chunk-v6cve82g.js:22060-22190 placement
async function dropAuthCache(connectorNames, storageV5) {
  let { mcpClientModule } = require("../../services/mcp/emitTripwireEvent.lazy.js");
  for (let name of connectorNames) await mcpClientModule().removeMcpAuthCacheEntry(name, storageV5);
}
export { addWebConnector };
