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
import { yhe } from "../../services/mcp/normalization.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { HEALTH_COLORS, Td, Cy } from "./pluginUsageStats.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { ListItem } from "../../components/design-system/ListItem.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { i3 } from "../../utils/permissions/permissionRulePayload.js";
import { CLAUDE_AI_SYNC_LABEL } from "../../utils/settings/commandSyncNames.js";
import { displayMarketplaceName } from "../../utils/plugins/pluginDisplayMetadata.js";
import { isRequiredPlugin } from "../../utils/plugins/pluginIdentifier.js";
import { plural } from "../../utils/stringUtils.js";
import { getPluginDisplayName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { formatToolConnectionState } from "../../components/mcp/CapabilitiesSection.js";

//@ chunk-vrb44rx7.js:142243-143655 placement
function InstalledItemRow(i) {
  let D = w(16),
    {
      item: item,
      isSelected: isSelected,
      health: health,
      nameWidth: nameWidth,
      statusHoisted: statusHoisted,
    } = i,
    U;
  if (
    D[0] !== health ||
    D[1] !== isSelected ||
    D[2] !== item ||
    D[3] !== nameWidth ||
    D[4] !== statusHoisted
  ) {
    let L = UnifiedInstalledCell(item);
    let A = isSelected ? "suggestion" : void 0;
    let K = item.type === "mcp" && item.scope === "claudeai" && L.name.startsWith(yhe) ? yhe : "";
    let V = !L.statusIsDefault && (!statusHoisted || isSelected);
    const B = e(Box, {
      flexShrink: 0,
      children: e(Text, { color: L.tone, "aria-label": V ? void 0 : L.statusLabel, children: L.glyph }),
    });
    let _;
    if (D[6] !== K || D[7] !== isSelected || D[8] !== A)
      ((_ = K && e(Text, { color: A, dimColor: !isSelected, children: K })),
        (D[6] = K),
        (D[7] = isSelected),
        (D[8] = A),
        (D[9] = _));
    else _ = D[9];
    const J = e(Box, {
      flexShrink: 1,
      children: r(Text, {
        wrap: "truncate-end",
        children: [
          L.isChild && e(Text, { dimColor: !isSelected, children: "\u2514 " }),
          _,
          e(Text, { color: A, children: L.name.slice(K.length) }),
        ],
      }),
    });
    let pe;
    if (D[10] !== health)
      ((pe =
        health &&
        e(Box, {
          flexShrink: 0,
          children: r(Text, { color: HEALTH_COLORS[health], children: [" ", re.bullet] }),
        })),
        (D[10] = health),
        (D[11] = pe));
    else pe = D[11];
    let fe;
    if (D[12] !== nameWidth || D[13] !== J || D[14] !== pe)
      ((fe = r(Box, { width: nameWidth, flexShrink: 0, children: [J, pe] })),
        (D[12] = nameWidth),
        (D[13] = J),
        (D[14] = pe),
        (D[15] = fe));
    else fe = D[15];
    U = r(ListItem, {
      isFocused: isSelected,
      styled: !1,
      children: [
        B,
        fe,
        e(Box, {
          width: Td,
          flexShrink: 0,
          marginLeft: 1,
          children: e(Text, { dimColor: !0, children: L.typeLabel }),
        }),
        (V || L.details.length > 0) &&
          e(Box, {
            marginLeft: 1,
            flexShrink: 1,
            children: r(Text, {
              wrap: "truncate-end",
              children: [
                V && (L.statusHint ?? L.statusLabel),
                L.details.map((detail, ne) =>
                  r(
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
    ((D[0] = health),
      (D[1] = isSelected),
      (D[2] = item),
      (D[3] = nameWidth),
      (D[4] = statusHoisted),
      (D[5] = U));
  } else U = D[5];
  return U;
}
/**
 * 渲染"Enter auth"快捷键提示（可配置键位 select:accept）。
 */
//@ chunk-vrb44rx7.js:143655-143808 placement
function AuthShortcutHint() {
  let i = w(1),
    h;
  if (i[0] === MEMO_CACHE_SENTINEL)
    ((h = e(ConfigurableShortcutHint, {
      action: "select:accept",
      context: "Select",
      fallback: "Enter",
      description: "auth",
    })),
      (i[0] = h));
  else h = i[0];
  return h;
}
//@ chunk-vrb44rx7.js:143808-146689 fingerprint = UnifiedInstalledCell (0.475)
function UnifiedInstalledCell(t0) {
  switch (t0.type) {
    case "plugin": {
      let h = [{ text: i3(t0.id) ? CLAUDE_AI_SYNC_LABEL : displayMarketplaceName(t0.marketplace) }];
      if (isRequiredPlugin(t0.id, t0.plugin.installationPreference)) h.push({ text: "required by your org" });
      if (t0.activity && t0.activity.skillCount > 0) {
        if (
          (h.push({ text: `${t0.activity.skillCount} ${plural(t0.activity.skillCount, "skill")}` }),
          t0.activity.totalCount > 0)
        )
          h.push({ text: `${t0.activity.totalCount} ${plural(t0.activity.totalCount, "use")}` });
      }
      if (t0.unusedDays !== void 0)
        h.push({ text: `not used in ${t0.unusedDays} ${plural(t0.unusedDays, "day")}` });
      let k = { name: getPluginDisplayName(t0), isChild: !1, typeLabel: "Plugin", details: h };
      if (t0.pendingToggle)
        return {
          ...k,
          glyph: re.arrowRight,
          tone: "suggestion",
          statusLabel: t0.pendingToggle === "will-enable" ? "will enable" : "will disable",
          statusIsDefault: !1,
        };
      if (t0.errorCount > 0)
        return {
          ...k,
          glyph: re.cross,
          tone: "error",
          statusLabel: `${t0.errorCount} ${plural(t0.errorCount, "error")}`,
          statusIsDefault: !1,
        };
      if (!t0.isEnabled)
        return { ...k, glyph: re.radioOff, tone: "inactive", statusLabel: "disabled", statusIsDefault: !1 };
      return { ...k, glyph: re.tick, tone: "success", statusLabel: "enabled", statusIsDefault: !0 };
    }
    case "flagged-plugin":
      return {
        name: t0.name,
        isChild: !1,
        typeLabel: "Plugin",
        glyph: re.warning,
        tone: "warning",
        statusLabel: "removed",
        statusIsDefault: !1,
        details: [{ text: displayMarketplaceName(t0.marketplace) }],
      };
    case "failed-plugin":
      return {
        name: t0.name,
        isChild: !1,
        typeLabel: "Plugin",
        glyph: re.cross,
        tone: "error",
        statusLabel: "failed to load",
        statusIsDefault: !1,
        details: [
          { text: `${t0.errorCount} ${plural(t0.errorCount, "error")}` },
          { text: displayMarketplaceName(t0.marketplace) },
        ],
      };
    case "skill": {
      let h = Cy[t0.override];
      return {
        name: t0.name,
        isChild: !1,
        typeLabel: "Skill",
        glyph: h.glyph,
        tone: h.tone,
        statusLabel: `${t0.lockSource ? "\uD83D\uDD12 " : ""}${h.label}`,
        statusIsDefault: t0.override === "on" && !t0.lockSource,
        details: [
          { text: t0.source },
          { text: `~${t0.tokenEstimate} tok` },
          t0.usage
            ? {
                text: `${t0.usage.count}\xD7 ${t0.usage.daysSinceUse === 0 ? "today" : `${t0.usage.daysSinceUse}d`}`,
              }
            : { text: "never used", tone: "warning" },
        ],
      };
    }
    case "mcp": {
      let config = t0.client.config,
        k = [];
      if (config?.type === "claudeai-proxy" && config.scope === "claudeai" && config.enterpriseManaged === !0)
        k.push({ text: "managed" });
      if (t0.liftedFrom) k.push({ text: `from ${getPluginDisplayName(t0.liftedFrom)}` });
      let C = {
        name: t0.name,
        isChild: t0.indented === !0,
        typeLabel: "MCP",
        details: k,
        statusIsDefault: !1,
      };
      if (t0.status === "cached" && t0.client.type === "cached") {
        let x = formatToolConnectionState(t0.client.cacheSavedAt);
        return { ...C, glyph: x.glyph, tone: x.tone, statusLabel: x.statusText };
      }
      switch (t0.status) {
        case "connected":
          return { ...C, glyph: re.tick, tone: "success", statusLabel: "connected", statusIsDefault: !0 };
        case "disabled":
          return { ...C, glyph: re.radioOff, tone: "inactive", statusLabel: "disabled" };
        case "pending":
          return { ...C, glyph: re.radioOff, tone: "inactive", statusLabel: "connecting\u2026" };
        case "needs-auth":
          return {
            ...C,
            glyph: re.warning,
            tone: "warning",
            statusLabel: "needs sign-in",
            statusHint: e(AuthShortcutHint, {}),
          };
        case "unconfigured":
          return { ...C, glyph: re.radioOff, tone: "inactive", statusLabel: "not configured" };
        case "cached":
        case "failed":
          return { ...C, glyph: re.cross, tone: "error", statusLabel: "failed" };
      }
    }
  }
}

export { AuthShortcutHint, InstalledItemRow };
