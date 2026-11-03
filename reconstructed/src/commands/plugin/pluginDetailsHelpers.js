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
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default_2,
  Fragment,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import {
  stripInvisibleKeepEmoji,
  stripInvisibleKeepNewlines,
} from "../../utils/settings/marketplaceSettingsAliases.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  pluginSourceLink,
  marketplaceLabel as marketplaceLabel_2,
  installCountsByMarketplace,
} from "../../utils/plugins/pluginDisplayMetadata.js";
import { OFFICIAL_MARKETPLACE_DISPLAY } from "../../utils/plugins/officialMarketplaceNames.js";
import { redactUrlCredentials } from "../../utils/plugins/marketplaceManager.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../components/CustomSelect/select.js";
import { isPluginDirectoryModeOn } from "../../utils/plugins/pluginGates.js";
import { logDirectoryLinkOpened } from "../../utils/plugins/pluginDirectoryTelemetry.js";
import { openValidatedUrlSucceeded } from "../../utils/browser.js";
import { getPluginDisplayName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { PluginLastUpdated, renderInstallPreview, renderCommandInstallSource } from "./PluginDetails.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { PluginTrustWarning } from "./PluginTrustWarning.js";
import { ErrorText } from "../../components/ErrorText.js";
import { Byline } from "../../components/design-system/Byline.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";

//@ chunk-vrb44rx7.js:51744-51748 placement
init_react_production();
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
function nullable(x) {
  return x ?? null;
}
//@ chunk-vrb44rx7.js:52617-52643 placement
function alwaysNull() {
  return null;
}
//@ chunk-vrb44rx7.js:52643-52744 placement
/**
 * 渲染一行"· 组件类型: 名字列表"（暗色）。
 */
function renderComponentLine(i) {
  let [K, V] = i;
  return jsxProd_default_2(
    Text,
    {
      dimColor: true,
      children: ["\xB7 ", K, ": ", V.map(stripInvisibleKeepEmoji).join(", ")],
    },
    K,
  );
}
//@ chunk-vrb44rx7.js:52744-52770 placement
function alwaysNull_2() {
  return null;
}
//@ chunk-vrb44rx7.js:52770-52813 placement
function isPairNonEmpty(i) {
  let [, K] = i;
  return K.length > 0;
}
//@ chunk-vrb44rx7.js:52813-52914 placement
/**
 * 渲染一行"· 组件类型: 名字列表"（暗色），与 renderComponentLine 相同，用在另一个列表里。
 */
function renderComponentLineAlt(i) {
  let [V, B] = i;
  return jsxProd_default_2(
    Text,
    {
      dimColor: true,
      children: ["\xB7 ", V, ": ", B.map(stripInvisibleKeepEmoji).join(", ")],
    },
    V,
  );
}
//@ chunk-vrb44rx7.js:52914-53454 placement
function formatPluginSource(props) {
  let C = w(9);
  let { plugin } = props;
  if (plugin.fromPluginDirectory !== true) {
    return null;
  }
  let source = plugin.entry.source;
  let x;
  let T;
  if (C[0] !== plugin || C[1] !== source) {
    let D = pluginSourceLink(plugin);
    x = typeof source === "object" && "sha" in source ? source.sha : undefined;
    T =
      D &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Repository: ", stripInvisibleKeepEmoji(D)],
      });
    C[0] = plugin;
    C[1] = source;
    C[2] = x;
    C[3] = T;
  } else {
    x = C[2];
    T = C[3];
  }
  let U;
  if (C[4] !== x) {
    U =
      x &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "Installs exactly commit ",
          x.slice(0, 7),
          ", the commit the",
          " ",
          OFFICIAL_MARKETPLACE_DISPLAY,
          " lists",
        ],
      });
    C[4] = x;
    C[5] = U;
  } else U = C[5];
  let L;
  if (C[6] !== T || C[7] !== U) {
    L = jsxProd_default_2(Fragment, {
      children: [T, U],
    });
    C[6] = T;
    C[7] = U;
    C[8] = L;
  } else L = C[8];
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
function getPluginSourceRepoUrl(plugin) {
  {
    let source = plugin.entry.source;
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
function buildPluginDetailsMenuOptions(hasHomepage, githubRepo, k) {
  let options = [
    {
      label: "Install for you (user scope)",
      value: "install-user",
    },
    {
      label: "Install for all collaborators on this repository (project scope)",
      value: "install-project",
    },
    {
      label: "Install for you, in this repo only (local scope)",
      value: "install-local",
    },
  ];
  if (hasHomepage)
    options.push({
      label: "Open homepage",
      value: "homepage",
    });
  if (githubRepo)
    options.push({
      label: "View on GitHub",
      value: "github",
    });
  if (k && k !== hasHomepage)
    options.push({
      label: "View repository",
      value: "repository",
    });
  options.push({
    label: "Back to plugin list",
    value: "back",
  });
  return options;
}
//@ chunk-vrb44rx7.js:54407-54826 layout
/**
 * 插件详情页的操作选项列表（ModelSelector 包装）：显示全部选项、隐藏序号、上下边界不循环。
 */
function PluginActionSelect(props) {
  let U = w(6);
  let { options, onSelect, selectionDisabled, defaultFocusValue, onFocus } = props;
  let disableSelection = selectionDisabled === undefined ? false : selectionDisabled;
  let L;
  if (
    U[0] !== defaultFocusValue ||
    U[1] !== onFocus ||
    U[2] !== onSelect ||
    U[3] !== options ||
    U[4] !== disableSelection
  ) {
    L = jsxProd_default(ModelSelector, {
      options,
      onChange: onSelect,
      disableSelection,
      defaultFocusValue,
      onFocus,
      hideIndexes: true,
      visibleOptionCount: options.length,
      selectedValue: NO_COMMITTED_ROW,
      onUpFromFirstItem: noop_4,
      onDownFromLastItem: noop_4,
    });
    U[0] = defaultFocusValue;
    U[1] = onFocus;
    U[2] = onSelect;
    U[3] = options;
    U[4] = disableSelection;
    U[5] = L;
  } else L = U[5];
  return L;
}
//@ chunk-vrb44rx7.js:54826-54841 layout
function noop_4() {}
//@ chunk-vrb44rx7.js:54841-59155 callgraph-witnessed = PluginSelectionKeyHint (0.231)
function PluginSelectionKeyHint(props) {
  let V = w(88);
  let {
    title,
    plugin,
    onEntryHelperShown,
    showMarketplace,
    extraSection,
    installError,
    isInstalling,
    onInstall,
    onBack,
    bylinePaddingLeft,
  } = props;
  let B;
  let _;
  let onSelect;
  let pe;
  let fe;
  let options;
  let flexDirection;
  let he;
  let W;
  let Oe;
  let rt;
  let et;
  let je;
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
    let hasHomepage = redactUrlCredentials(plugin.entry.homepage);
    let githubRepo = extractGitHubRepo(plugin);
    let kt = isPluginDirectoryModeOn() ? getPluginSourceRepoUrl(plugin) : undefined;
    onSelect = function J(Tt) {
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
          if (hasHomepage) {
            logDirectoryLinkOpened({
              pluginId: plugin.pluginId,
              linkKind: "documentation",
            });
            openValidatedUrlSucceeded(hasHomepage);
          }
          return;
        }
        case "github": {
          if (githubRepo) openValidatedUrlSucceeded(`https://github.com/${githubRepo}`);
          return;
        }
        case "repository": {
          if (kt) {
            logDirectoryLinkOpened({
              pluginId: plugin.pluginId,
              linkKind: "repository",
            });
            openValidatedUrlSucceeded(kt);
          }
          return;
        }
        case "back": {
          onBack();
          return;
        }
      }
    };
    _ = Box;
    flexDirection = "column";
    if (V[22] !== title) {
      he = jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(Text, {
          bold: true,
          children: title,
        }),
      });
      V[22] = title;
      V[23] = he;
    } else he = V[23];
    let children;
    if (V[24] !== plugin.entry) {
      children = getPluginDisplayName(plugin.entry);
      V[24] = plugin.entry;
      V[25] = children;
    } else children = V[25];
    let Et;
    if (V[26] !== children) {
      Et = jsxProd_default(Text, {
        bold: true,
        children,
      });
      V[26] = children;
      V[27] = Et;
    } else Et = V[27];
    let He;
    if (V[28] !== plugin || V[29] !== showMarketplace) {
      He =
        showMarketplace &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["from ", stripInvisibleKeepEmoji(marketplaceLabel_2(plugin))],
        });
      V[28] = plugin;
      V[29] = showMarketplace;
      V[30] = He;
    } else He = V[30];
    let ct;
    if (V[31] !== plugin || V[32] !== showMarketplace) {
      ct =
        showMarketplace && installCountsByMarketplace(plugin)
          ? jsxProd_default(Text, {
              dimColor: true,
              children: stripInvisibleKeepEmoji(installCountsByMarketplace(plugin) ?? ""),
            })
          : null;
      V[31] = plugin;
      V[32] = showMarketplace;
      V[33] = ct;
    } else ct = V[33];
    let Ct;
    if (V[34] !== plugin.entry.tags) {
      Ct =
        isPluginDirectoryModeOn() && plugin.entry.tags?.includes("community-managed")
          ? jsxProd_default(Text, {
              dimColor: true,
              children: "Community managed: maintained by its publisher, not Anthropic",
            })
          : null;
      V[34] = plugin.entry.tags;
      V[35] = Ct;
    } else Ct = V[35];
    let oe;
    if (V[36] !== plugin) {
      oe = jsxProd_default(formatPluginSource, {
        plugin,
      });
      V[36] = plugin;
      V[37] = oe;
    } else oe = V[37];
    let ft;
    if (V[38] !== plugin.entry.version) {
      ft =
        plugin.entry.version &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Version: ", stripInvisibleKeepEmoji(plugin.entry.version)],
        });
      V[38] = plugin.entry.version;
      V[39] = ft;
    } else ft = V[39];
    let at;
    if (V[40] !== plugin.pluginId) {
      at = jsxProd_default(PluginLastUpdated, {
        pluginId: plugin.pluginId,
      });
      V[40] = plugin.pluginId;
      V[41] = at;
    } else at = V[41];
    let Ot;
    if (V[42] !== plugin.entry.description) {
      Ot =
        plugin.entry.description &&
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            children: stripInvisibleKeepNewlines(plugin.entry.description),
          }),
        });
      V[42] = plugin.entry.description;
      V[43] = Ot;
    } else Ot = V[43];
    let an;
    if (V[44] !== plugin.entry.author) {
      an =
        plugin.entry.author &&
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "By:",
              " ",
              stripInvisibleKeepEmoji(
                typeof plugin.entry.author === "string" ? plugin.entry.author : plugin.entry.author.name,
              ),
            ],
          }),
        });
      V[44] = plugin.entry.author;
      V[45] = an;
    } else an = V[45];
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
    ) {
      W = jsxProd_default_2(Box, {
        flexDirection: "column",
        marginBottom: 1,
        children: [Et, He, ct, Ct, oe, ft, at, Ot, an],
      });
      V[46] = Et;
      V[47] = He;
      V[48] = ct;
      V[49] = Ct;
      V[50] = oe;
      V[51] = ft;
      V[52] = at;
      V[53] = Ot;
      V[54] = an;
      V[55] = W;
    } else W = V[55];
    if (V[56] !== installError || V[57] !== onEntryHelperShown || V[58] !== plugin) {
      Oe = jsxProd_default(renderInstallPreview, {
        plugin,
        onEntryHelperShown,
        refreshKey: installError,
      });
      V[56] = installError;
      V[57] = onEntryHelperShown;
      V[58] = plugin;
      V[59] = Oe;
    } else Oe = V[59];
    rt = extraSection;
    if (V[60] !== plugin.entry) {
      et = jsxProd_default(renderCommandInstallSource, {
        entry: plugin.entry,
      });
      V[60] = plugin.entry;
      V[61] = et;
    } else et = V[61];
    if (V[62] === MEMO_CACHE_SENTINEL) {
      je = jsxProd_default(PluginTrustWarning, {});
      V[62] = je;
    } else je = V[62];
    if (V[63] !== installError) {
      fe =
        installError &&
        jsxProd_default(Box, {
          marginBottom: 1,
          children: jsxProd_default(ErrorText, {
            error: stripInvisibleKeepNewlines(installError),
          }),
        });
      V[63] = installError;
      V[64] = fe;
    } else fe = V[64];
    B = PluginActionSelect;
    pe = plugin.pluginId;
    const pluginDetailsMenuOptions = buildPluginDetailsMenuOptions(hasHomepage, githubRepo, kt);
    let _e;
    if (V[65] !== isInstalling) {
      _e = (qe) =>
        isInstalling && qe.value.startsWith("install-")
          ? {
              ...qe,
              label: "Installing\u2026",
            }
          : qe;
      V[65] = isInstalling;
      V[66] = _e;
    } else _e = V[66];
    options = pluginDetailsMenuOptions.map(_e);
    V[0] = extraSection;
    V[1] = installError;
    V[2] = isInstalling;
    V[3] = onBack;
    V[4] = onEntryHelperShown;
    V[5] = onInstall;
    V[6] = plugin;
    V[7] = showMarketplace;
    V[8] = title;
    V[9] = B;
    V[10] = _;
    V[11] = onSelect;
    V[12] = pe;
    V[13] = fe;
    V[14] = options;
    V[15] = flexDirection;
    V[16] = he;
    V[17] = W;
    V[18] = Oe;
    V[19] = rt;
    V[20] = et;
    V[21] = je;
  } else {
    B = V[9];
    _ = V[10];
    onSelect = V[11];
    pe = V[12];
    fe = V[13];
    options = V[14];
    flexDirection = V[15];
    he = V[16];
    W = V[17];
    Oe = V[18];
    rt = V[19];
    et = V[20];
    je = V[21];
  }
  let Ke;
  if (V[67] !== B || V[68] !== isInstalling || V[69] !== onSelect || V[70] !== pe || V[71] !== options) {
    Ke = jsxProd_default(
      B,
      {
        options,
        selectionDisabled: isInstalling,
        onSelect,
      },
      pe,
    );
    V[67] = B;
    V[68] = isInstalling;
    V[69] = onSelect;
    V[70] = pe;
    V[71] = options;
    V[72] = Ke;
  } else Ke = V[72];
  let children;
  if (V[73] === MEMO_CACHE_SENTINEL) {
    children = jsxProd_default(Text, {
      dimColor: true,
      children: jsxProd_default_2(Byline, {
        children: [
          jsxProd_default(ConfigurableShortcutHint, {
            action: "select:accept",
            context: "Select",
            fallback: "Enter",
            description: "select",
          }),
          jsxProd_default(ConfigurableShortcutHint, {
            action: "confirm:no",
            context: "Settings",
            fallback: "Esc",
            description: "go back",
          }),
        ],
      }),
    });
    V[73] = children;
  } else children = V[73];
  let He;
  if (V[74] !== bylinePaddingLeft) {
    He = jsxProd_default(Box, {
      marginTop: 1,
      paddingLeft: bylinePaddingLeft,
      children,
    });
    V[74] = bylinePaddingLeft;
    V[75] = He;
  } else He = V[75];
  let ct;
  if (
    V[76] !== _ ||
    V[77] !== fe ||
    V[78] !== Ke ||
    V[79] !== He ||
    V[80] !== flexDirection ||
    V[81] !== he ||
    V[82] !== W ||
    V[83] !== Oe ||
    V[84] !== rt ||
    V[85] !== et ||
    V[86] !== je
  ) {
    ct = jsxProd_default_2(_, {
      flexDirection,
      children: [he, W, Oe, rt, et, je, fe, Ke, He],
    });
    V[76] = _;
    V[77] = fe;
    V[78] = Ke;
    V[79] = He;
    V[80] = flexDirection;
    V[81] = he;
    V[82] = W;
    V[83] = Oe;
    V[84] = rt;
    V[85] = et;
    V[86] = je;
    V[87] = ct;
  } else ct = V[87];
  return ct;
}
export {
  COMPONENT_LABELS,
  PluginActionSelect,
  nullable,
  alwaysNull,
  renderComponentLine,
  alwaysNull_2,
  isPairNonEmpty,
  renderComponentLineAlt,
  PluginSelectionKeyHint,
};
