/**
 * entrypoints/mcpServePlugins.ts
 *
 * 2.1.316 新增：mcp serve 启用插件列表的解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qkxfkqxj.js (3)
 * attribution: placement 3
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { zodStrictObject, pe, T } from "../../vendor/zod/v4/classic/schemas.js";
import { PluginIdSchema, isReservedMarketplaceName } from "../utils/plugins/schemas.js";
import { registerSeedMarketplaces } from "../utils/plugins/marketplaceManager.js";
import { parsePluginIdentifier } from "../utils/plugins/pluginIdentifier.js";
import { getFlagSettingsInline, setFlagSettingsInline } from "../bootstrap/state.js";
import { or } from "../utils/settings/commandSyncNames.js";
import { nk } from "../utils/subprocessEnvLoader.js";
import { env } from "../utils/env.js";
import { safeParseJSON } from "../utils/json.js";
import { hasProtoKeys } from "../utils/objectSafety.js";

//@ chunk-qkxfkqxj.js:11900-11961 placement
var l = 32,
  s = 8192,
  m = DoctorLazy(() => zodStrictObject({ enabledPlugins: pe(PluginIdSchema(), T(!0)) }));
//@ chunk-qkxfkqxj.js:11961-12414 placement
async function resolveMcpServeEnabledPlugins() {
  let e = readMcpServeEnabledPluginsEnv();
  if (e.kind !== "named") return e;
  let a = new Set(e.ids.length === 0 ? [] : (await registerSeedMarketplaces()).map(([n]) => n)),
    filtered = e.ids.filter((id) => {
      let { marketplace: marketplace } = parsePluginIdentifier(id);
      return (
        marketplace !== void 0 && a.has(marketplace) && !isReservedMarketplaceName(marketplace.toLowerCase())
      );
    });
  if (filtered.length > 0) {
    let n = getFlagSettingsInline() ?? {},
      enabledPlugins = n.enabledPlugins,
      d = {
        ...n,
        enabledPlugins: {
          ...(typeof enabledPlugins === "object" && enabledPlugins !== null ? enabledPlugins : {}),
          ...Object.fromEntries(filtered.map((o) => [o, !0])),
        },
      };
    (setFlagSettingsInline(d), or());
  }
  return { kind: "named", enabled: filtered.length, dropped: e.ids.length - filtered.length };
}
//@ chunk-qkxfkqxj.js:12414-12803 placement
function readMcpServeEnabledPluginsEnv() {
  let CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS = nk.CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS;
  if (
    (nk.unset("CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS"),
    CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS === void 0 || CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS === "")
  )
    return { kind: "absent" };
  if (env.CLAUDE_CODE_REMOTE_HERMETIC_MODE) return { kind: "hermetic" };
  let a =
      CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS.length > s
        ? void 0
        : safeParseJSON(CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS, !1),
    t = m().safeParse(a).data?.enabledPlugins,
    keys = Object.keys(t ?? {});
  return t === void 0 || hasProtoKeys(a) || keys.length > l
    ? { kind: "unreadable" }
    : { kind: "named", ids: keys };
}
