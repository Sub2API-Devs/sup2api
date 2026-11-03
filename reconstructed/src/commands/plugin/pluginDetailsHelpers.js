/**
 * commands/plugin/pluginDetailsHelpers.tsx
 *
 * 插件详情的辅助渲染（组件清单、来源仓库与固定提交）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/pluginDetailsHelpers.tsx
 * pieces: chunk-vrb44rx7.js (15)
 * attribution: placement 9, fingerprint 2, layout 3, callgraph-witnessed 1
 */
import { j } from "../../../vendor/react/cjs/react.production.js";
import { r, Fragment, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import {
  stripInvisibleKeepEmoji,
  stripInvisibleKeepNewlines,
} from "../../utils/settings/marketplaceSettingsAliases.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  pluginSourceLink,
  marketplaceLabel,
  installCountsByMarketplace,
} from "../../utils/plugins/pluginDisplayMetadata.js";
import { OFFICIAL_MARKETPLACE_DISPLAY } from "../../utils/plugins/officialMarketplaceNames.js";
import { redactUrlCredentials } from "../../utils/plugins/marketplaceManager.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../components/CustomSelect/select.js";
import { QE } from "../../utils/plugins/pluginGates.js";
import { logDirectoryLinkOpened } from "../../utils/plugins/pluginDirectoryTelemetry.js";
import { fi } from "../../utils/browser.js";
import { getPluginDisplayName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { PluginLastUpdated, renderInstallPreview, renderCommandInstallSource } from "./PluginDetails.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { PluginTrustWarning } from "./PluginTrustWarning.js";
import { ErrorText } from "../../components/ErrorText.js";
import { Byline } from "../../components/design-system/Byline.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";

//@ chunk-vrb44rx7.js:51744-51748 placement
j();
//@ chunk-vrb44rx7.js:51748-52001 placement
function COMPONENT_LABELS(i) {
  return [
    ["Commands", i.commands.map((command) => command.name)],
    ["Agents", i.agents.map((agent) => agent.name)],
    ["Skills", i.skills.map((skill) => skill.name)],
    ["Hooks", i.hooks ?? []],
    ["MCP Servers", i.mcpServers ?? []],
    ["LSP Servers", i.lspServers ?? []],
  ].filter(([, k]) => k.length > 0);
}
//@ chunk-vrb44rx7.js:52587-52617 placement
function Rh(x) {
  return x ?? null;
}
//@ chunk-vrb44rx7.js:52617-52643 placement
function Th() {
  return null;
}
/**
 * 渲染一行"· 组件类型: 名字列表"（暗色）。
 */
//@ chunk-vrb44rx7.js:52643-52744 placement
function renderComponentLine(i) {
  let [K, V] = i;
  return r(
    Text,
    { dimColor: !0, children: ["\xB7 ", K, ": ", V.map(stripInvisibleKeepEmoji).join(", ")] },
    K,
  );
}
//@ chunk-vrb44rx7.js:52744-52770 placement
function Dh() {
  return null;
}
//@ chunk-vrb44rx7.js:52770-52813 placement
function Mh(i) {
  let [, K] = i;
  return K.length > 0;
}
/**
 * 渲染一行"· 组件类型: 名字列表"（暗色），与 renderComponentLine 相同，用在另一个列表里。
 */
//@ chunk-vrb44rx7.js:52813-52914 placement
function renderComponentLineAlt(i) {
  let [V, B] = i;
  return r(
    Text,
    { dimColor: !0, children: ["\xB7 ", V, ": ", B.map(stripInvisibleKeepEmoji).join(", ")] },
    V,
  );
}
//@ chunk-vrb44rx7.js:52914-53454 placement
function formatPluginSource(i) {
  let C = w(9),
    { plugin: plugin } = i;
  if (plugin.fromPluginDirectory !== !0) {
    return null;
  }
  let source = plugin.entry.source,
    x,
    T;
  if (C[0] !== plugin || C[1] !== source) {
    let D = pluginSourceLink(plugin);
    x = typeof source === "object" && "sha" in source ? source.sha : void 0;
    T = D && r(Text, { dimColor: !0, children: ["Repository: ", stripInvisibleKeepEmoji(D)] });
    ((C[0] = plugin), (C[1] = source), (C[2] = x), (C[3] = T));
  } else ((x = C[2]), (T = C[3]));
  let U;
  if (C[4] !== x)
    ((U =
      x &&
      r(Text, {
        dimColor: !0,
        children: [
          "Installs exactly commit ",
          x.slice(0, 7),
          ", the commit the",
          " ",
          OFFICIAL_MARKETPLACE_DISPLAY,
          " lists",
        ],
      })),
      (C[4] = x),
      (C[5] = U));
  else U = C[5];
  let L;
  if (C[6] !== T || C[7] !== U) ((L = r(Fragment, { children: [T, U] })), (C[6] = T), (C[7] = U), (C[8] = L));
  else L = C[8];
  return L;
}
//@ chunk-vrb44rx7.js:53454-53680 fingerprint = extractGitHubRepo (1)
function extractGitHubRepo(plugin) {
  if (
    plugin.entry.source &&
    typeof plugin.entry.source === "object" &&
    "source" in plugin.entry.source &&
    plugin.entry.source.source === "github" &&
    typeof plugin.entry.source === "object" &&
    "repo" in plugin.entry.source
  )
    return plugin.entry.source.repo;
  return null;
}
//@ chunk-vrb44rx7.js:53680-53908 layout
function getPluginSourceRepoUrl(i) {
  {
    let source = i.entry.source;
    if (
      typeof source !== "object" ||
      source === null ||
      (source.source !== "url" && source.source !== "git-subdir")
    )
      return;
    let replaced = source.url.replace(/\.git$/, "");
    return /^[\w.-]+\/[\w.-]+$/.test(replaced)
      ? `https://github.com/${replaced}`
      : redactUrlCredentials(replaced);
  }
  return;
}
//@ chunk-vrb44rx7.js:53908-54407 fingerprint = buildPluginDetailsMenuOptions (0.927)
function buildPluginDetailsMenuOptions(i, h, k) {
  let options = [
    { label: "Install for you (user scope)", value: "install-user" },
    { label: "Install for all collaborators on this repository (project scope)", value: "install-project" },
    { label: "Install for you, in this repo only (local scope)", value: "install-local" },
  ];
  if (i) options.push({ label: "Open homepage", value: "homepage" });
  if (h) options.push({ label: "View on GitHub", value: "github" });
  if (k && k !== i) options.push({ label: "View repository", value: "repository" });
  return (options.push({ label: "Back to plugin list", value: "back" }), options);
}
/**
 * 插件详情页的操作选项列表（ModelSelector 包装）：显示全部选项、隐藏序号、上下边界不循环。
 */
//@ chunk-vrb44rx7.js:54407-54826 layout
function PluginActionSelect(i) {
  let U = w(6),
    {
      options: options,
      onSelect: onSelect,
      selectionDisabled: selectionDisabled,
      defaultFocusValue: defaultFocusValue,
      onFocus: onFocus,
    } = i,
    D = selectionDisabled === void 0 ? !1 : selectionDisabled,
    L;
  if (U[0] !== defaultFocusValue || U[1] !== onFocus || U[2] !== onSelect || U[3] !== options || U[4] !== D)
    ((L = e(ModelSelector, {
      options: options,
      onChange: onSelect,
      disableSelection: D,
      defaultFocusValue: defaultFocusValue,
      onFocus: onFocus,
      hideIndexes: !0,
      visibleOptionCount: options.length,
      selectedValue: NO_COMMITTED_ROW,
      onUpFromFirstItem: Lr,
      onDownFromLastItem: Lr,
    })),
      (U[0] = defaultFocusValue),
      (U[1] = onFocus),
      (U[2] = onSelect),
      (U[3] = options),
      (U[4] = D),
      (U[5] = L));
  else L = U[5];
  return L;
}
//@ chunk-vrb44rx7.js:54826-54841 layout
function Lr() {}
//@ chunk-vrb44rx7.js:54841-59155 callgraph-witnessed = PluginSelectionKeyHint (0.231)
function PluginSelectionKeyHint(t0) {
  let V = w(88),
    {
      title: title,
      plugin: plugin,
      onEntryHelperShown: onEntryHelperShown,
      showMarketplace: showMarketplace,
      extraSection: extraSection,
      installError: installError,
      isInstalling: isInstalling,
      onInstall: onInstall,
      onBack: onBack,
      bylinePaddingLeft: bylinePaddingLeft,
    } = t0,
    B,
    _,
    J,
    pe,
    fe,
    me,
    ne,
    he,
    W,
    Oe,
    rt,
    et,
    je;
  if (
    V[0] !== extraSection ||
    V[1] !== installError ||
    V[2] !== isInstalling ||
    V[3] !== onBack ||
    V[4] !== onEntryHelperShown ||
    V[5] !== onInstall ||
    V[6] !== plugin ||
    V[7] !== showMarketplace ||
    V[8] !== title
  ) {
    let ae = redactUrlCredentials(plugin.entry.homepage);
    let Se = extractGitHubRepo(plugin);
    let kt = QE() ? getPluginSourceRepoUrl(plugin) : void 0;
    J = function J(Tt) {
      switch (Tt) {
        case "install-user": {
          onInstall(plugin, "user");
          return;
        }
        case "install-project": {
          onInstall(plugin, "project");
          return;
        }
        case "install-local": {
          onInstall(plugin, "local");
          return;
        }
        case "homepage": {
          if (ae) (logDirectoryLinkOpened({ pluginId: plugin.pluginId, linkKind: "documentation" }), fi(ae));
          return;
        }
        case "github": {
          if (Se) fi(`https://github.com/${Se}`);
          return;
        }
        case "repository": {
          if (kt) (logDirectoryLinkOpened({ pluginId: plugin.pluginId, linkKind: "repository" }), fi(kt));
          return;
        }
        case "back": {
          onBack();
          return;
        }
      }
    };
    _ = Box;
    ne = "column";
    if (V[22] !== title)
      ((he = e(Box, { marginBottom: 1, children: e(Text, { bold: !0, children: title }) })),
        (V[22] = title),
        (V[23] = he));
    else he = V[23];
    let Ke;
    if (V[24] !== plugin.entry)
      ((Ke = getPluginDisplayName(plugin.entry)), (V[24] = plugin.entry), (V[25] = Ke));
    else Ke = V[25];
    let Et;
    if (V[26] !== Ke) ((Et = e(Text, { bold: !0, children: Ke })), (V[26] = Ke), (V[27] = Et));
    else Et = V[27];
    let He;
    if (V[28] !== plugin || V[29] !== showMarketplace)
      ((He =
        showMarketplace &&
        r(Text, { dimColor: !0, children: ["from ", stripInvisibleKeepEmoji(marketplaceLabel(plugin))] })),
        (V[28] = plugin),
        (V[29] = showMarketplace),
        (V[30] = He));
    else He = V[30];
    let ct;
    if (V[31] !== plugin || V[32] !== showMarketplace)
      ((ct =
        showMarketplace && installCountsByMarketplace(plugin)
          ? e(Text, {
              dimColor: !0,
              children: stripInvisibleKeepEmoji(installCountsByMarketplace(plugin) ?? ""),
            })
          : null),
        (V[31] = plugin),
        (V[32] = showMarketplace),
        (V[33] = ct));
    else ct = V[33];
    let Ct;
    if (V[34] !== plugin.entry.tags)
      ((Ct =
        QE() && plugin.entry.tags?.includes("community-managed")
          ? e(Text, {
              dimColor: !0,
              children: "Community managed: maintained by its publisher, not Anthropic",
            })
          : null),
        (V[34] = plugin.entry.tags),
        (V[35] = Ct));
    else Ct = V[35];
    let oe;
    if (V[36] !== plugin) ((oe = e(formatPluginSource, { plugin: plugin })), (V[36] = plugin), (V[37] = oe));
    else oe = V[37];
    let ft;
    if (V[38] !== plugin.entry.version)
      ((ft =
        plugin.entry.version &&
        r(Text, { dimColor: !0, children: ["Version: ", stripInvisibleKeepEmoji(plugin.entry.version)] })),
        (V[38] = plugin.entry.version),
        (V[39] = ft));
    else ft = V[39];
    let at;
    if (V[40] !== plugin.pluginId)
      ((at = e(PluginLastUpdated, { pluginId: plugin.pluginId })), (V[40] = plugin.pluginId), (V[41] = at));
    else at = V[41];
    let Ot;
    if (V[42] !== plugin.entry.description)
      ((Ot =
        plugin.entry.description &&
        e(Box, {
          marginTop: 1,
          children: e(Text, { children: stripInvisibleKeepNewlines(plugin.entry.description) }),
        })),
        (V[42] = plugin.entry.description),
        (V[43] = Ot));
    else Ot = V[43];
    let an;
    if (V[44] !== plugin.entry.author)
      ((an =
        plugin.entry.author &&
        e(Box, {
          marginTop: 1,
          children: r(Text, {
            dimColor: !0,
            children: [
              "By:",
              " ",
              stripInvisibleKeepEmoji(
                typeof plugin.entry.author === "string" ? plugin.entry.author : plugin.entry.author.name,
              ),
            ],
          }),
        })),
        (V[44] = plugin.entry.author),
        (V[45] = an));
    else an = V[45];
    if (
      V[46] !== Et ||
      V[47] !== He ||
      V[48] !== ct ||
      V[49] !== Ct ||
      V[50] !== oe ||
      V[51] !== ft ||
      V[52] !== at ||
      V[53] !== Ot ||
      V[54] !== an
    )
      ((W = r(Box, {
        flexDirection: "column",
        marginBottom: 1,
        children: [Et, He, ct, Ct, oe, ft, at, Ot, an],
      })),
        (V[46] = Et),
        (V[47] = He),
        (V[48] = ct),
        (V[49] = Ct),
        (V[50] = oe),
        (V[51] = ft),
        (V[52] = at),
        (V[53] = Ot),
        (V[54] = an),
        (V[55] = W));
    else W = V[55];
    if (V[56] !== installError || V[57] !== onEntryHelperShown || V[58] !== plugin)
      ((Oe = e(renderInstallPreview, {
        plugin: plugin,
        onEntryHelperShown: onEntryHelperShown,
        refreshKey: installError,
      })),
        (V[56] = installError),
        (V[57] = onEntryHelperShown),
        (V[58] = plugin),
        (V[59] = Oe));
    else Oe = V[59];
    rt = extraSection;
    if (V[60] !== plugin.entry)
      ((et = e(renderCommandInstallSource, { entry: plugin.entry })), (V[60] = plugin.entry), (V[61] = et));
    else et = V[61];
    if (V[62] === MEMO_CACHE_SENTINEL) ((je = e(PluginTrustWarning, {})), (V[62] = je));
    else je = V[62];
    if (V[63] !== installError)
      ((fe =
        installError &&
        e(Box, {
          marginBottom: 1,
          children: e(ErrorText, { error: stripInvisibleKeepNewlines(installError) }),
        })),
        (V[63] = installError),
        (V[64] = fe));
    else fe = V[64];
    B = PluginActionSelect;
    pe = plugin.pluginId;
    const Yt = buildPluginDetailsMenuOptions(ae, Se, kt);
    let _e;
    if (V[65] !== isInstalling)
      ((_e = (qe) =>
        isInstalling && qe.value.startsWith("install-") ? { ...qe, label: "Installing\u2026" } : qe),
        (V[65] = isInstalling),
        (V[66] = _e));
    else _e = V[66];
    me = Yt.map(_e);
    ((V[0] = extraSection),
      (V[1] = installError),
      (V[2] = isInstalling),
      (V[3] = onBack),
      (V[4] = onEntryHelperShown),
      (V[5] = onInstall),
      (V[6] = plugin),
      (V[7] = showMarketplace),
      (V[8] = title),
      (V[9] = B),
      (V[10] = _),
      (V[11] = J),
      (V[12] = pe),
      (V[13] = fe),
      (V[14] = me),
      (V[15] = ne),
      (V[16] = he),
      (V[17] = W),
      (V[18] = Oe),
      (V[19] = rt),
      (V[20] = et),
      (V[21] = je));
  } else
    ((B = V[9]),
      (_ = V[10]),
      (J = V[11]),
      (pe = V[12]),
      (fe = V[13]),
      (me = V[14]),
      (ne = V[15]),
      (he = V[16]),
      (W = V[17]),
      (Oe = V[18]),
      (rt = V[19]),
      (et = V[20]),
      (je = V[21]));
  let Ke;
  if (V[67] !== B || V[68] !== isInstalling || V[69] !== J || V[70] !== pe || V[71] !== me)
    ((Ke = e(B, { options: me, selectionDisabled: isInstalling, onSelect: J }, pe)),
      (V[67] = B),
      (V[68] = isInstalling),
      (V[69] = J),
      (V[70] = pe),
      (V[71] = me),
      (V[72] = Ke));
  else Ke = V[72];
  let Et;
  if (V[73] === MEMO_CACHE_SENTINEL)
    ((Et = e(Text, {
      dimColor: !0,
      children: r(Byline, {
        children: [
          e(ConfigurableShortcutHint, {
            action: "select:accept",
            context: "Select",
            fallback: "Enter",
            description: "select",
          }),
          e(ConfigurableShortcutHint, {
            action: "confirm:no",
            context: "Settings",
            fallback: "Esc",
            description: "go back",
          }),
        ],
      }),
    })),
      (V[73] = Et));
  else Et = V[73];
  let He;
  if (V[74] !== bylinePaddingLeft)
    ((He = e(Box, { marginTop: 1, paddingLeft: bylinePaddingLeft, children: Et })),
      (V[74] = bylinePaddingLeft),
      (V[75] = He));
  else He = V[75];
  let ct;
  if (
    V[76] !== _ ||
    V[77] !== fe ||
    V[78] !== Ke ||
    V[79] !== He ||
    V[80] !== ne ||
    V[81] !== he ||
    V[82] !== W ||
    V[83] !== Oe ||
    V[84] !== rt ||
    V[85] !== et ||
    V[86] !== je
  )
    ((ct = r(_, { flexDirection: ne, children: [he, W, Oe, rt, et, je, fe, Ke, He] })),
      (V[76] = _),
      (V[77] = fe),
      (V[78] = Ke),
      (V[79] = He),
      (V[80] = ne),
      (V[81] = he),
      (V[82] = W),
      (V[83] = Oe),
      (V[84] = rt),
      (V[85] = et),
      (V[86] = je),
      (V[87] = ct));
  else ct = V[87];
  return ct;
}

export {
  COMPONENT_LABELS,
  PluginActionSelect,
  Rh,
  Th,
  renderComponentLine,
  Dh,
  Mh,
  renderComponentLineAlt,
  PluginSelectionKeyHint,
};
