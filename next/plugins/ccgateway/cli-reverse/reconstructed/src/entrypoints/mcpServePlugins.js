/**
 * entrypoints/mcpServePlugins.ts
 *
 * 2.1.316 新增：mcp serve 启用插件列表的解析
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9rw89d51.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { zodStrictObject, record, literal } from "../../vendor/zod/v4/classic/schemas.js";
import { PluginIdSchema, isReservedMarketplaceName } from "../utils/plugins/schemas.js";
import { registerSeedMarketplaces } from "../utils/plugins/marketplaceManager.js";
import { parsePluginIdentifier } from "../utils/plugins/pluginIdentifier.js";
import { getFlagSettingsInline, setFlagSettingsInline } from "../bootstrap/state.js";
import { invalidateCommandNames } from "../utils/settings/commandSyncNames.js";
import { toolServerEnvAccessor } from "../utils/subprocessEnvLoader.js";
import { env } from "../utils/env.js";
import { safeParseJSON } from "../utils/json.js";
import { hasProtoKeys } from "../utils/objectSafety.js";

//@ chunk-9rw89d51.js:13048-13109 placement
var MAX_PLUGIN_ID = 32;
var MAX_PLUGINS_JSON_BYTES = 8192;
var pluginsEnabledSchema = DoctorLazy(() =>
  zodStrictObject({
    enabledPlugins: record(PluginIdSchema(), literal(true)),
  }),
);
//@ chunk-9rw89d51.js:13109-13562 placement
async function resolveMcpServeEnabledPlugins() {
  let mcpServeEnabledPluginsEnv = readMcpServeEnabledPluginsEnv();
  if (mcpServeEnabledPluginsEnv.kind !== "named") return mcpServeEnabledPluginsEnv;
  let seededMarketplaces = new Set(
    mcpServeEnabledPluginsEnv.ids.length === 0
      ? []
      : (await registerSeedMarketplaces()).map(([marketplace]) => marketplace),
  );
  let filtered = mcpServeEnabledPluginsEnv.ids.filter((id) => {
    let { marketplace } = parsePluginIdentifier(id);
    return (
      marketplace !== undefined &&
      seededMarketplaces.has(marketplace) &&
      !isReservedMarketplaceName(marketplace.toLowerCase())
    );
  });
  if (filtered.length > 0) {
    let flagSettings = getFlagSettingsInline() ?? {};
    let enabledPlugins = flagSettings.enabledPlugins;
    let nextSettings = {
      ...flagSettings,
      enabledPlugins: {
        ...(typeof enabledPlugins === "object" && enabledPlugins !== null ? enabledPlugins : {}),
        ...Object.fromEntries(filtered.map((id) => [id, true])),
      },
    };
    setFlagSettingsInline(nextSettings);
    invalidateCommandNames();
  }
  return {
    kind: "named",
    enabled: filtered.length,
    dropped: mcpServeEnabledPluginsEnv.ids.length - filtered.length,
  };
}
//@ chunk-9rw89d51.js:13562-13951 placement
function readMcpServeEnabledPluginsEnv() {
  let CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS = toolServerEnvAccessor.CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS;
  toolServerEnvAccessor.unset("CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS");
  if (CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS === undefined || CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS === "")
    return {
      kind: "absent",
    };
  if (env.CLAUDE_CODE_REMOTE_HERMETIC_MODE)
    return {
      kind: "hermetic",
    };
  let parsed =
    CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS.length > MAX_PLUGINS_JSON_BYTES
      ? undefined
      : safeParseJSON(CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS, false);
  let enabledPlugins = pluginsEnabledSchema().safeParse(parsed).data?.enabledPlugins;
  let keys = Object.keys(enabledPlugins ?? {});
  return enabledPlugins === undefined || hasProtoKeys(parsed) || keys.length > MAX_PLUGIN_ID
    ? {
        kind: "unreadable",
      }
    : {
        kind: "named",
        ids: keys,
      };
}
export { resolveMcpServeEnabledPlugins };
