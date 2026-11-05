/**
 * commands/plugin/UnifiedInstalledCell.tsx
 *
 * 已安装插件/MCP/技能统一列表中的单元格
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/UnifiedInstalledCell.tsx
 * pieces: chunk-wb51jffc.js (3)
 * attribution: placement 2, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-wb51jffc.js:142442-143854 placement
function InstalledItemRow(props) {
  let $ = useMemoCache(16);
  let { item, isSelected, health, nameWidth, statusHoisted } = props;
  let content;
  if (
    $[0] !== health ||
    $[1] !== isSelected ||
    $[2] !== item ||
    $[3] !== nameWidth ||
    $[4] !== statusHoisted
  ) {
    let cell = UnifiedInstalledCell(item);
    let color = isSelected ? "suggestion" : undefined;
    let namePrefix =
      item.type === "mcp" && item.scope === "claudeai" && cell.name.startsWith(CLAUDE_AI_NAME_PREFIX)
        ? CLAUDE_AI_NAME_PREFIX
        : "";
    let showStatus = !cell.statusIsDefault && (!statusHoisted || isSelected);
    const statusBox = jsxProd_default(Box, {
      flexShrink: 0,
      children: jsxProd_default(Text, {
        color: cell.tone,
        "aria-label": showStatus ? undefined : cell.statusLabel,
        children: cell.glyph,
      }),
    });
    let nameBox;
    if ($[6] !== namePrefix || $[7] !== isSelected || $[8] !== color) {
      nameBox =
        namePrefix &&
        jsxProd_default(Text, {
          color,
          dimColor: !isSelected,
          children: namePrefix,
        });
      $[6] = namePrefix;
      $[7] = isSelected;
      $[8] = color;
      $[9] = nameBox;
    } else nameBox = $[9];
    const labelBox = jsxProd_default(Box, {
      flexShrink: 1,
      children: jsxProd_default_2(Text, {
        wrap: "truncate-end",
        children: [
          cell.isChild &&
            jsxProd_default(Text, {
              dimColor: !isSelected,
              children: "\u2514 ",
            }),
          nameBox,
          jsxProd_default(Text, {
            color,
            children: cell.name.slice(namePrefix.length),
          }),
        ],
      }),
    });
    let detailRows;
    if ($[10] !== health) {
      detailRows =
        health &&
        jsxProd_default(Box, {
          flexShrink: 0,
          children: jsxProd_default_2(Text, {
            color: HEALTH_COLORS[health],
            children: [" ", figures_default.bullet],
          }),
        });
      $[10] = health;
      $[11] = detailRows;
    } else detailRows = $[11];
    let details;
    if ($[12] !== nameWidth || $[13] !== labelBox || $[14] !== detailRows) {
      details = jsxProd_default_2(Box, {
        width: nameWidth,
        flexShrink: 0,
        children: [labelBox, detailRows],
      });
      $[12] = nameWidth;
      $[13] = labelBox;
      $[14] = detailRows;
      $[15] = details;
    } else details = $[15];
    content = jsxProd_default_2(ListItem, {
      isFocused: isSelected,
      styled: false,
      children: [
        statusBox,
        details,
        jsxProd_default(Box, {
          width: INSTALLED_COLUMN_WIDTH,
          flexShrink: 0,
          marginLeft: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: cell.typeLabel,
          }),
        }),
        (showStatus || cell.details.length > 0) &&
          jsxProd_default(Box, {
            marginLeft: 1,
            flexShrink: 1,
            children: jsxProd_default_2(Text, {
              wrap: "truncate-end",
              children: [
                showStatus && (cell.statusHint ?? cell.statusLabel),
                cell.details.map((detail, detailEntry) =>
                  jsxProd_default_2(
                    Text,
                    {
                      dimColor: !isSelected && !detail.tone,
                      color: detail.tone,
                      children: [detailEntry > 0 || showStatus ? " \xB7 " : "", detail.text],
                    },
                    detailEntry,
                  ),
                ),
              ],
            }),
          }),
      ],
    });
    $[0] = health;
    $[1] = isSelected;
    $[2] = item;
    $[3] = nameWidth;
    $[4] = statusHoisted;
    $[5] = content;
  } else content = $[5];
  return content;
}
//@ chunk-wb51jffc.js:143854-144007 placement
/**
 * 渲染"Enter auth"快捷键提示（可配置键位 select:accept）。
 */
function AuthShortcutHint() {
  let $ = useMemoCache(1);
  let content;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    content = jsxProd_default(ConfigurableShortcutHint, {
      action: "select:accept",
      context: "Select",
      fallback: "Enter",
      description: "auth",
    });
    $[0] = content;
  } else content = $[0];
  return content;
}
//@ chunk-wb51jffc.js:144007-146888 fingerprint (2.1.88 match: UnifiedInstalledCell, 0.478)
function UnifiedInstalledCell(t0) {
  switch (t0.type) {
    case "plugin": {
      let rows = [
        {
          text: isSyncedMarketplacePlugin(t0.id)
            ? CLAUDE_AI_SYNC_LABEL
            : displayMarketplaceName(t0.marketplace),
        },
      ];
      if (isRequiredPlugin(t0.id, t0.plugin.installationPreference))
        rows.push({
          text: "required by your org",
        });
      if (t0.activity && t0.activity.skillCount > 0) {
        rows.push({
          text: `${t0.activity.skillCount} ${plural(t0.activity.skillCount, "skill")}`,
        });
        if (t0.activity.totalCount > 0)
          rows.push({
            text: `${t0.activity.totalCount} ${plural(t0.activity.totalCount, "use")}`,
          });
      }
      if (t0.unusedDays !== undefined)
        rows.push({
          text: `not used in ${t0.unusedDays} ${plural(t0.unusedDays, "day")}`,
        });
      let entry = {
        name: getPluginDisplayName(t0),
        isChild: false,
        typeLabel: "Plugin",
        details: rows,
      };
      if (t0.pendingToggle)
        return {
          ...entry,
          glyph: figures_default.arrowRight,
          tone: "suggestion",
          statusLabel: t0.pendingToggle === "will-enable" ? "will enable" : "will disable",
          statusIsDefault: false,
        };
      if (t0.errorCount > 0)
        return {
          ...entry,
          glyph: figures_default.cross,
          tone: "error",
          statusLabel: `${t0.errorCount} ${plural(t0.errorCount, "error")}`,
          statusIsDefault: false,
        };
      if (!t0.isEnabled)
        return {
          ...entry,
          glyph: figures_default.radioOff,
          tone: "inactive",
          statusLabel: "disabled",
          statusIsDefault: false,
        };
      return {
        ...entry,
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
      let glyph = SKILL_STATE_GLYPHS[t0.override];
      return {
        name: t0.name,
        isChild: false,
        typeLabel: "Skill",
        glyph: glyph.glyph,
        tone: glyph.tone,
        statusLabel: `${t0.lockSource ? "\uD83D\uDD12 " : ""}${glyph.label}`,
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
      let warnings = [];
      if (
        config?.type === "claudeai-proxy" &&
        config.scope === "claudeai" &&
        config.enterpriseManaged === true
      )
        warnings.push({
          text: "managed",
        });
      if (t0.liftedFrom)
        warnings.push({
          text: `from ${getPluginDisplayName(t0.liftedFrom)}`,
        });
      let entry = {
        name: t0.name,
        isChild: t0.indented === true,
        typeLabel: "MCP",
        details: warnings,
        statusIsDefault: false,
      };
      if (t0.status === "cached" && t0.client.type === "cached") {
        let connectionState = formatToolConnectionState(t0.client.cacheSavedAt);
        return {
          ...entry,
          glyph: connectionState.glyph,
          tone: connectionState.tone,
          statusLabel: connectionState.statusText,
        };
      }
      switch (t0.status) {
        case "connected":
          return {
            ...entry,
            glyph: figures_default.tick,
            tone: "success",
            statusLabel: "connected",
            statusIsDefault: true,
          };
        case "disabled":
          return {
            ...entry,
            glyph: figures_default.radioOff,
            tone: "inactive",
            statusLabel: "disabled",
          };
        case "pending":
          return {
            ...entry,
            glyph: figures_default.radioOff,
            tone: "inactive",
            statusLabel: "connecting\u2026",
          };
        case "needs-auth":
          return {
            ...entry,
            glyph: figures_default.warning,
            tone: "warning",
            statusLabel: "needs sign-in",
            statusHint: jsxProd_default(AuthShortcutHint, {}),
          };
        case "unconfigured":
          return {
            ...entry,
            glyph: figures_default.radioOff,
            tone: "inactive",
            statusLabel: "not configured",
          };
        case "cached":
        case "failed":
          return {
            ...entry,
            glyph: figures_default.cross,
            tone: "error",
            statusLabel: "failed",
          };
      }
    }
  }
}
export { AuthShortcutHint, InstalledItemRow };
