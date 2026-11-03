/**
 * commands/plugin/UnifiedInstalledCell.tsx
 *
 * 已安装插件/MCP/技能统一列表中的单元格
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/UnifiedInstalledCell.tsx
 * pieces: chunk-vrb44rx7.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { CLAUDE_AI_NAME_PREFIX } from "../../services/mcp/normalization.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { HEALTH_COLORS, INSTALLED_COLUMN_WIDTH, SKILL_STATE_GLYPHS } from "./pluginUsageStats.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { ListItem } from "../../components/design-system/ListItem.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { isSyncedMarketplacePlugin } from "../../utils/permissions/permissionRulePayload.js";
import { CLAUDE_AI_SYNC_LABEL } from "../../utils/settings/commandSyncNames.js";
import { displayMarketplaceName } from "../../utils/plugins/pluginDisplayMetadata.js";
import { isRequiredPlugin } from "../../utils/plugins/pluginIdentifier.js";
import { plural } from "../../utils/stringUtils.js";
import { getPluginDisplayName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { formatToolConnectionState } from "../../components/mcp/CapabilitiesSection.js";

//@ chunk-vrb44rx7.js:142243-143655 placement
function InstalledItemRow(props) {
  let D = w(16);
  let { item, isSelected, health, nameWidth, statusHoisted } = props;
  let U;
  if (
    D[0] !== health ||
    D[1] !== isSelected ||
    D[2] !== item ||
    D[3] !== nameWidth ||
    D[4] !== statusHoisted
  ) {
    let L = UnifiedInstalledCell(item);
    let color = isSelected ? "suggestion" : undefined;
    let K =
      item.type === "mcp" && item.scope === "claudeai" && L.name.startsWith(CLAUDE_AI_NAME_PREFIX)
        ? CLAUDE_AI_NAME_PREFIX
        : "";
    let V = !L.statusIsDefault && (!statusHoisted || isSelected);
    const B = jsxProd_default(Box, {
      flexShrink: 0,
      children: jsxProd_default(Text, {
        color: L.tone,
        "aria-label": V ? undefined : L.statusLabel,
        children: L.glyph,
      }),
    });
    let _;
    if (D[6] !== K || D[7] !== isSelected || D[8] !== color) {
      _ =
        K &&
        jsxProd_default(Text, {
          color,
          dimColor: !isSelected,
          children: K,
        });
      D[6] = K;
      D[7] = isSelected;
      D[8] = color;
      D[9] = _;
    } else _ = D[9];
    const J = jsxProd_default(Box, {
      flexShrink: 1,
      children: jsxProd_default_2(Text, {
        wrap: "truncate-end",
        children: [
          L.isChild &&
            jsxProd_default(Text, {
              dimColor: !isSelected,
              children: "\u2514 ",
            }),
          _,
          jsxProd_default(Text, {
            color,
            children: L.name.slice(K.length),
          }),
        ],
      }),
    });
    let pe;
    if (D[10] !== health) {
      pe =
        health &&
        jsxProd_default(Box, {
          flexShrink: 0,
          children: jsxProd_default_2(Text, {
            color: HEALTH_COLORS[health],
            children: [" ", figures_default.bullet],
          }),
        });
      D[10] = health;
      D[11] = pe;
    } else pe = D[11];
    let fe;
    if (D[12] !== nameWidth || D[13] !== J || D[14] !== pe) {
      fe = jsxProd_default_2(Box, {
        width: nameWidth,
        flexShrink: 0,
        children: [J, pe],
      });
      D[12] = nameWidth;
      D[13] = J;
      D[14] = pe;
      D[15] = fe;
    } else fe = D[15];
    U = jsxProd_default_2(ListItem, {
      isFocused: isSelected,
      styled: false,
      children: [
        B,
        fe,
        jsxProd_default(Box, {
          width: INSTALLED_COLUMN_WIDTH,
          flexShrink: 0,
          marginLeft: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: L.typeLabel,
          }),
        }),
        (V || L.details.length > 0) &&
          jsxProd_default(Box, {
            marginLeft: 1,
            flexShrink: 1,
            children: jsxProd_default_2(Text, {
              wrap: "truncate-end",
              children: [
                V && (L.statusHint ?? L.statusLabel),
                L.details.map((detail, ne) =>
                  jsxProd_default_2(
                    Text,
                    {
                      dimColor: !isSelected && !detail.tone,
                      color: detail.tone,
                      children: [ne > 0 || V ? " \xB7 " : "", detail.text],
                    },
                    ne,
                  ),
                ),
              ],
            }),
          }),
      ],
    });
    D[0] = health;
    D[1] = isSelected;
    D[2] = item;
    D[3] = nameWidth;
    D[4] = statusHoisted;
    D[5] = U;
  } else U = D[5];
  return U;
}
//@ chunk-vrb44rx7.js:143655-143808 placement
/**
 * 渲染"Enter auth"快捷键提示（可配置键位 select:accept）。
 */
function AuthShortcutHint() {
  let i = w(1);
  let h;
  if (i[0] === MEMO_CACHE_SENTINEL) {
    h = jsxProd_default(ConfigurableShortcutHint, {
      action: "select:accept",
      context: "Select",
      fallback: "Enter",
      description: "auth",
    });
    i[0] = h;
  } else h = i[0];
  return h;
}
//@ chunk-vrb44rx7.js:143808-146689 fingerprint = UnifiedInstalledCell (0.475)
function UnifiedInstalledCell(t0) {
  switch (t0.type) {
    case "plugin": {
      let h = [
        {
          text: isSyncedMarketplacePlugin(t0.id)
            ? CLAUDE_AI_SYNC_LABEL
            : displayMarketplaceName(t0.marketplace),
        },
      ];
      if (isRequiredPlugin(t0.id, t0.plugin.installationPreference))
        h.push({
          text: "required by your org",
        });
      if (t0.activity && t0.activity.skillCount > 0) {
        h.push({
          text: `${t0.activity.skillCount} ${plural(t0.activity.skillCount, "skill")}`,
        });
        if (t0.activity.totalCount > 0)
          h.push({
            text: `${t0.activity.totalCount} ${plural(t0.activity.totalCount, "use")}`,
          });
      }
      if (t0.unusedDays !== undefined)
        h.push({
          text: `not used in ${t0.unusedDays} ${plural(t0.unusedDays, "day")}`,
        });
      let k = {
        name: getPluginDisplayName(t0),
        isChild: false,
        typeLabel: "Plugin",
        details: h,
      };
      if (t0.pendingToggle)
        return {
          ...k,
          glyph: figures_default.arrowRight,
          tone: "suggestion",
          statusLabel: t0.pendingToggle === "will-enable" ? "will enable" : "will disable",
          statusIsDefault: false,
        };
      if (t0.errorCount > 0)
        return {
          ...k,
          glyph: figures_default.cross,
          tone: "error",
          statusLabel: `${t0.errorCount} ${plural(t0.errorCount, "error")}`,
          statusIsDefault: false,
        };
      if (!t0.isEnabled)
        return {
          ...k,
          glyph: figures_default.radioOff,
          tone: "inactive",
          statusLabel: "disabled",
          statusIsDefault: false,
        };
      return {
        ...k,
        glyph: figures_default.tick,
        tone: "success",
        statusLabel: "enabled",
        statusIsDefault: true,
      };
    }
    case "flagged-plugin":
      return {
        name: t0.name,
        isChild: false,
        typeLabel: "Plugin",
        glyph: figures_default.warning,
        tone: "warning",
        statusLabel: "removed",
        statusIsDefault: false,
        details: [
          {
            text: displayMarketplaceName(t0.marketplace),
          },
        ],
      };
    case "failed-plugin":
      return {
        name: t0.name,
        isChild: false,
        typeLabel: "Plugin",
        glyph: figures_default.cross,
        tone: "error",
        statusLabel: "failed to load",
        statusIsDefault: false,
        details: [
          {
            text: `${t0.errorCount} ${plural(t0.errorCount, "error")}`,
          },
          {
            text: displayMarketplaceName(t0.marketplace),
          },
        ],
      };
    case "skill": {
      let h = SKILL_STATE_GLYPHS[t0.override];
      return {
        name: t0.name,
        isChild: false,
        typeLabel: "Skill",
        glyph: h.glyph,
        tone: h.tone,
        statusLabel: `${t0.lockSource ? "\uD83D\uDD12 " : ""}${h.label}`,
        statusIsDefault: t0.override === "on" && !t0.lockSource,
        details: [
          {
            text: t0.source,
          },
          {
            text: `~${t0.tokenEstimate} tok`,
          },
          t0.usage
            ? {
                text: `${t0.usage.count}\xD7 ${t0.usage.daysSinceUse === 0 ? "today" : `${t0.usage.daysSinceUse}d`}`,
              }
            : {
                text: "never used",
                tone: "warning",
              },
        ],
      };
    }
    case "mcp": {
      let config = t0.client.config;
      let k = [];
      if (
        config?.type === "claudeai-proxy" &&
        config.scope === "claudeai" &&
        config.enterpriseManaged === true
      )
        k.push({
          text: "managed",
        });
      if (t0.liftedFrom)
        k.push({
          text: `from ${getPluginDisplayName(t0.liftedFrom)}`,
        });
      let C = {
        name: t0.name,
        isChild: t0.indented === true,
        typeLabel: "MCP",
        details: k,
        statusIsDefault: false,
      };
      if (t0.status === "cached" && t0.client.type === "cached") {
        let x = formatToolConnectionState(t0.client.cacheSavedAt);
        return {
          ...C,
          glyph: x.glyph,
          tone: x.tone,
          statusLabel: x.statusText,
        };
      }
      switch (t0.status) {
        case "connected":
          return {
            ...C,
            glyph: figures_default.tick,
            tone: "success",
            statusLabel: "connected",
            statusIsDefault: true,
          };
        case "disabled":
          return {
            ...C,
            glyph: figures_default.radioOff,
            tone: "inactive",
            statusLabel: "disabled",
          };
        case "pending":
          return {
            ...C,
            glyph: figures_default.radioOff,
            tone: "inactive",
            statusLabel: "connecting\u2026",
          };
        case "needs-auth":
          return {
            ...C,
            glyph: figures_default.warning,
            tone: "warning",
            statusLabel: "needs sign-in",
            statusHint: jsxProd_default(AuthShortcutHint, {}),
          };
        case "unconfigured":
          return {
            ...C,
            glyph: figures_default.radioOff,
            tone: "inactive",
            statusLabel: "not configured",
          };
        case "cached":
        case "failed":
          return {
            ...C,
            glyph: figures_default.cross,
            tone: "error",
            statusLabel: "failed",
          };
      }
    }
  }
}
export { AuthShortcutHint, InstalledItemRow };
