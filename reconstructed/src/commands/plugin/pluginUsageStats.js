/**
 * commands/plugin/pluginUsageStats.tsx
 *
 * 2.1.316 新增：插件/技能的用量与技能列表占用（tok/turn）展示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vrb44rx7.js (12)
 * attribution: placement 12
 */
import { isOfficialMarketplace, parsePluginIdentifier } from "../../utils/plugins/pluginIdentifier.js";
import { quotedPrintable } from "../../utils/printableName.js";
import { j } from "../../../vendor/react/cjs/react.production.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { plural } from "../../utils/stringUtils.js";
import { memoryAge } from "../../memdir/memoryAge.js";
import { getGlobalConfig } from "../../utils/config.js";
import { getOwn } from "../../utils/objectSafety.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { pluginSkillBudgetUsage } from "../../utils/plugins/pluginSkillBudget.js";
import { bytesPerTokenForModel } from "../../utils/model/modelDisplay.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";

//@ chunk-vrb44rx7.js:138059-138154 placement
function formatDisableOrUninstall(i) {
  return `${isOfficialMarketplace(parsePluginIdentifier(i.source).marketplace) ? "disable" : "uninstall"} "${quotedPrintable(i.plugin)}"`;
}
//@ chunk-vrb44rx7.js:138154-138158 placement
j();
//@ chunk-vrb44rx7.js:138158-138201 placement
function hy(pe) {
  return pe.plugins.commands;
}
//@ chunk-vrb44rx7.js:138201-138240 placement
function yy(fe) {
  return fe.mcp.commands;
}
//@ chunk-vrb44rx7.js:138240-138280 placement
function by(me) {
  return me.mainLoopModel;
}
//@ chunk-vrb44rx7.js:138280-138478 placement
function renderSkillTokenRow(ne) {
  return r(
    Box,
    {
      flexDirection: "row",
      children: [
        e(Box, { width: 32, children: r(Text, { dimColor: !0, children: ["/", ne.name] }) }),
        r(Text, { dimColor: !0, children: ["~", ne.approxTokens, " tok/turn"] }),
      ],
    },
    ne.name,
  );
}
//@ chunk-vrb44rx7.js:138478-138510 placement
function wy(A) {
  return A.count > 0;
}
//@ chunk-vrb44rx7.js:138510-138758 placement
function renderSkillUsageRow(K) {
  return r(
    Box,
    {
      flexDirection: "row",
      children: [
        e(Box, { width: 32, children: r(Text, { dimColor: !0, children: ["/", K.name] }) }),
        r(Text, {
          dimColor: !0,
          children: [
            K.count,
            " ",
            plural(K.count, "use"),
            K.lastUsedAt !== null ? ` \xB7 last ${memoryAge(K.lastUsedAt)}` : "",
          ],
        }),
      ],
    },
    K.name,
  );
}
//@ chunk-vrb44rx7.js:138758-139153 placement
function formatLastPrompt(i, h) {
  let k = getGlobalConfig().skillUsage ?? {},
    C = [];
  for (let x of h) {
    if (x.type !== "prompt" || x.pluginInfo?.pluginManifest.name !== i) continue;
    let T = getOwn(k, x.name) ?? (x.unqualifiedName != null ? getOwn(k, x.unqualifiedName) : void 0);
    C.push({ name: x.name, count: T?.usageCount ?? 0, lastUsedAt: T?.lastUsedAt ?? null });
  }
  return (
    C.sort((x, T) => T.count - x.count),
    { skills: C, totalCount: C.reduce((x, T) => x + T.count, 0), skillCount: C.length }
  );
}
/**
 * 显示插件技能描述占系统提示词的 token（每轮）。
 */
//@ chunk-vrb44rx7.js:139290-140774 placement
function renderSkillListingFootprint(i) {
  let T = w(20),
    { plugin: plugin } = i,
    k = useAppState(hy),
    C = useAppState(yy),
    x = useAppState(by),
    D;
  if (T[0] !== C || T[1] !== x || T[2] !== plugin.manifest.name || T[3] !== k) {
    const byPlugin = pluginSkillBudgetUsage([...k, ...C], bytesPerTokenForModel(x ?? void 0)).byPlugin;
    let L;
    if (T[5] !== plugin.manifest.name)
      ((L = (A) => A.pluginName === plugin.manifest.name), (T[5] = plugin.manifest.name), (T[6] = L));
    else L = T[6];
    D = byPlugin.find(L);
    ((T[0] = C), (T[1] = x), (T[2] = plugin.manifest.name), (T[3] = k), (T[4] = D));
  } else D = T[4];
  let K = D,
    U;
  if (T[7] !== plugin.manifest.name)
    ((U = r(Text, { bold: !0, children: [plugin.manifest.name, " \xB7 Usage"] })),
      (T[7] = plugin.manifest.name),
      (T[8] = U));
  else U = T[8];
  let L, V;
  if (T[9] === MEMO_CACHE_SENTINEL)
    ((L = e(Text, { bold: !0, children: "Skill-listing footprint" })),
      (V = e(Text, {
        dimColor: !0,
        wrap: "wrap",
        children:
          "What this plugin's skill descriptions add to the system prompt (cached input after the first turn). Agents and MCP tools not yet counted.",
      })),
      (T[9] = L),
      (T[10] = V));
  else ((L = T[9]), (V = T[10]));
  let B;
  if (T[11] !== K)
    ((B = r(Box, {
      flexDirection: "column",
      children: [
        L,
        V,
        K && K.skills.length > 0
          ? r(Box, {
              flexDirection: "column",
              marginTop: 1,
              children: [
                K.skills.map(renderSkillTokenRow),
                r(Box, {
                  flexDirection: "row",
                  marginTop: 1,
                  children: [
                    e(Box, { width: 32, children: e(Text, { children: "Total" }) }),
                    r(Text, {
                      children: [
                        K.skillCount,
                        " ",
                        plural(K.skillCount, "skill"),
                        " \xB7 ~",
                        K.approxTokens,
                        " tok/turn",
                      ],
                    }),
                  ],
                }),
              ],
            })
          : e(Text, { dimColor: !0, children: "No model-invocable skills loaded for this plugin" }),
      ],
    })),
      (T[11] = K),
      (T[12] = B));
  else B = T[12];
  let _;
  if (T[13] !== plugin || T[14] !== k)
    ((_ = e(renderSkillActivity, { plugin: plugin, commands: k })),
      (T[13] = plugin),
      (T[14] = k),
      (T[15] = _));
  else _ = T[15];
  let J;
  if (T[16] !== U || T[17] !== B || T[18] !== _)
    ((J = r(Box, { flexDirection: "column", gap: 1, children: [U, B, _] })),
      (T[16] = U),
      (T[17] = B),
      (T[18] = _),
      (T[19] = J));
  else J = T[19];
  return J;
}
//@ chunk-vrb44rx7.js:140774-141686 placement
function renderSkillActivity(i) {
  let C = w(9),
    { plugin: plugin, commands: commands } = i,
    x;
  if (C[0] !== commands || C[1] !== plugin.manifest.name)
    ((x = formatLastPrompt(plugin.manifest.name, commands)),
      (C[0] = commands),
      (C[1] = plugin.manifest.name),
      (C[2] = x));
  else x = C[2];
  let T = x,
    D,
    U;
  if (C[3] === MEMO_CACHE_SENTINEL)
    ((D = e(Text, { bold: !0, children: "Activity" })),
      (U = e(Text, {
        dimColor: !0,
        wrap: "wrap",
        children: "Skill invocations on this machine. See /usage for cost attribution.",
      })),
      (C[3] = D),
      (C[4] = U));
  else ((D = C[3]), (U = C[4]));
  let L;
  if (C[5] !== T.skillCount || C[6] !== T.skills || C[7] !== T.totalCount)
    ((L = r(Box, {
      flexDirection: "column",
      children: [
        D,
        U,
        T.totalCount === 0
          ? e(Text, { dimColor: !0, children: "No activity yet" })
          : r(Box, {
              flexDirection: "column",
              marginTop: 1,
              children: [
                T.skills.filter(wy).map(renderSkillUsageRow),
                r(Box, {
                  flexDirection: "row",
                  marginTop: 1,
                  children: [
                    e(Box, { width: 32, children: e(Text, { children: "Total" }) }),
                    r(Text, {
                      children: [
                        T.totalCount,
                        " ",
                        plural(T.totalCount, "use"),
                        " across",
                        " ",
                        T.skillCount,
                        " ",
                        plural(T.skillCount, "skill"),
                      ],
                    }),
                  ],
                }),
              ],
            }),
      ],
    })),
      (C[5] = T.skillCount),
      (C[6] = T.skills),
      (C[7] = T.totalCount),
      (C[8] = L));
  else L = C[8];
  return L;
}
//@ chunk-vrb44rx7.js:141686-141988 placement
var HEALTH_COLORS = { good: "success", warn: "warning", poor: "error" },
  Cy = {
    on: { glyph: re.tick, label: "on", tone: "success" },
    "name-only": { glyph: re.bullet, label: "name-only" },
    "user-invocable-only": { glyph: re.circle, label: "user-only", tone: "warning" },
    off: { glyph: re.circle, label: "off", tone: "inactive" },
  },
  Td = 6,
  Iy = 44,
  Py = 12,
  xy = 20,
  Ry = 16;

export {
  Iy,
  Py,
  xy,
  Ry,
  formatLastPrompt,
  renderSkillListingFootprint,
  formatDisableOrUninstall,
  HEALTH_COLORS,
  Td,
  Cy,
};
