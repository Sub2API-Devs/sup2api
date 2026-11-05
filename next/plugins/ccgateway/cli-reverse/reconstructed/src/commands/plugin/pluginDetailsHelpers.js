/**
 * commands/plugin/pluginDetailsHelpers.tsx
 *
 * 插件详情的辅助渲染（组件清单、来源仓库与固定提交）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/pluginDetailsHelpers.tsx
 * pieces: chunk-wb51jffc.js (15)
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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wb51jffc.js:51895-51899 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wb51jffc.js:51895", () => {
  init_react_production();
});
//@ chunk-wb51jffc.js:51899-52152 placement
function COMPONENT_LABELS(groups) {
  return [
    ["Commands", groups.commands.map((command) => command.name)],
    ["Agents", groups.agents.map((agent) => agent.name)],
    ["Skills", groups.skills.map((skill) => skill.name)],
    ["Hooks", groups.hooks ?? []],
    ["MCP Servers", groups.mcpServers ?? []],
    ["LSP Servers", groups.lspServers ?? []],
  ].filter(([, names]) => names.length > 0);
}
//@ chunk-wb51jffc.js:52738-52768 placement
function nullable(value) {
  return value ?? null;
}
//@ chunk-wb51jffc.js:52768-52794 placement
function alwaysNull() {
  return null;
}
//@ chunk-wb51jffc.js:52794-52895 placement
/**
 * 渲染一行"· 组件类型: 名字列表"（暗色）。
 */
function renderComponentLine(entry) {
  let [label, names] = entry;
  return jsxProd_default_2(
    Text,
    {
      dimColor: true,
      children: ["\xB7 ", label, ": ", names.map(stripInvisibleKeepEmoji).join(", ")],
    },
    label,
  );
}
//@ chunk-wb51jffc.js:52895-52921 placement
function alwaysNull_2() {
  return null;
}
//@ chunk-wb51jffc.js:52921-52964 placement
function isPairNonEmpty(entry) {
  let [, names] = entry;
  return names.length > 0;
}
//@ chunk-wb51jffc.js:52964-53065 placement
/**
 * 渲染一行"· 组件类型: 名字列表"（暗色），与 renderComponentLine 相同，用在另一个列表里。
 */
function renderComponentLineAlt(entry) {
  let [label, names] = entry;
  return jsxProd_default_2(
    Text,
    {
      dimColor: true,
      children: ["\xB7 ", label, ": ", names.map(stripInvisibleKeepEmoji).join(", ")],
    },
    label,
  );
}
//@ chunk-wb51jffc.js:53065-53606 placement
function formatPluginSource(props) {
  let $ = useMemoCache(9);
  let { plugin } = props;
  if (plugin.fromPluginDirectory !== true) {
    return null;
  }
  let source = plugin.entry.source;
  let sha;
  let repoLine;
  if ($[0] !== plugin || $[1] !== source) {
    let link = pluginSourceLink(plugin);
    sha = typeof source === "object" && "sha" in source ? source.sha : undefined;
    repoLine =
      link &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Repository: ", stripInvisibleKeepEmoji(link)],
      });
    $[0] = plugin;
    $[1] = source;
    $[2] = sha;
    $[3] = repoLine;
  } else {
    sha = $[2];
    repoLine = $[3];
  }
  let commitLine;
  if ($[4] !== sha) {
    commitLine =
      sha &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "Installs exactly commit ",
          sha.slice(0, 7),
          ", the commit the",
          " ",
          OFFICIAL_MARKETPLACE_DISPLAY,
          " lists",
        ],
      });
    $[4] = sha;
    $[5] = commitLine;
  } else commitLine = $[5];
  let fragment;
  if ($[6] !== repoLine || $[7] !== commitLine) {
    fragment = jsxProd_default_2(Fragment, {
      children: [repoLine, commitLine],
    });
    $[6] = repoLine;
    $[7] = commitLine;
    $[8] = fragment;
  } else fragment = $[8];
  return fragment;
}
//@ chunk-wb51jffc.js:53606-53832 fingerprint (2.1.88 match: extractGitHubRepo, 1)
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
//@ chunk-wb51jffc.js:53832-54060 layout
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
//@ chunk-wb51jffc.js:54060-54559 fingerprint (2.1.88 match: buildPluginDetailsMenuOptions, 0.927)
function buildPluginDetailsMenuOptions(hasHomepage, githubRepo, repositoryUrl) {
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
  if (repositoryUrl && repositoryUrl !== hasHomepage)
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
//@ chunk-wb51jffc.js:54559-54978 layout
/**
 * 插件详情页的操作选项列表（ModelSelector 包装）：显示全部选项、隐藏序号、上下边界不循环。
 */
function PluginActionSelect(props) {
  let $ = useMemoCache(6);
  let { options, onSelect, selectionDisabled, defaultFocusValue, onFocus } = props;
  let disableSelection = selectionDisabled === undefined ? false : selectionDisabled;
  let content;
  if (
    $[0] !== defaultFocusValue ||
    $[1] !== onFocus ||
    $[2] !== onSelect ||
    $[3] !== options ||
    $[4] !== disableSelection
  ) {
    content = jsxProd_default(ModelSelector, {
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
    $[0] = defaultFocusValue;
    $[1] = onFocus;
    $[2] = onSelect;
    $[3] = options;
    $[4] = disableSelection;
    $[5] = content;
  } else content = $[5];
  return content;
}
//@ chunk-wb51jffc.js:54978-54993 layout
function noop_4() {}
//@ chunk-wb51jffc.js:54993-59307 callgraph-witnessed (2.1.88 match: PluginSelectionKeyHint, 0.231)
function PluginSelectionKeyHint(props) {
  let $ = useMemoCache(88);
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
  let content;
  let status;
  let onSelect;
  let footer;
  let footer2;
  let options;
  let flexDirection;
  let details;
  let details2;
  let hint;
  let hint2;
  let banner;
  let banner2;
  if (
    $[0] !== extraSection ||
    $[1] !== installError ||
    $[2] !== isInstalling ||
    $[3] !== onBack ||
    $[4] !== onEntryHelperShown ||
    $[5] !== onInstall ||
    $[6] !== plugin ||
    $[7] !== showMarketplace ||
    $[8] !== title
  ) {
    let hasHomepage = redactUrlCredentials(plugin.entry.homepage);
    let githubRepo = extractGitHubRepo(plugin);
    let repoUrl = isPluginDirectoryModeOn() ? getPluginSourceRepoUrl(plugin) : undefined;
    onSelect = function onSelect(value) {
      switch (value) {
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
          if (repoUrl) {
            logDirectoryLinkOpened({
              pluginId: plugin.pluginId,
              linkKind: "repository",
            });
            openValidatedUrlSucceeded(repoUrl);
          }
          return;
        }
        case "back": {
          onBack();
          return;
        }
      }
    };
    status = Box;
    flexDirection = "column";
    if ($[22] !== title) {
      details = jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(Text, {
          bold: true,
          children: title,
        }),
      });
      $[22] = title;
      $[23] = details;
    } else details = $[23];
    let children;
    if ($[24] !== plugin.entry) {
      children = getPluginDisplayName(plugin.entry);
      $[24] = plugin.entry;
      $[25] = children;
    } else children = $[25];
    let selectedItem;
    if ($[26] !== children) {
      selectedItem = jsxProd_default(Text, {
        bold: true,
        children,
      });
      $[26] = children;
      $[27] = selectedItem;
    } else selectedItem = $[27];
    let items;
    if ($[28] !== plugin || $[29] !== showMarketplace) {
      items =
        showMarketplace &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["from ", stripInvisibleKeepEmoji(marketplaceLabel_2(plugin))],
        });
      $[28] = plugin;
      $[29] = showMarketplace;
      $[30] = items;
    } else items = $[30];
    let box;
    if ($[31] !== plugin || $[32] !== showMarketplace) {
      box =
        showMarketplace && installCountsByMarketplace(plugin)
          ? jsxProd_default(Text, {
              dimColor: true,
              children: stripInvisibleKeepEmoji(installCountsByMarketplace(plugin) ?? ""),
            })
          : null;
      $[31] = plugin;
      $[32] = showMarketplace;
      $[33] = box;
    } else box = $[33];
    let rowBox;
    if ($[34] !== plugin.entry.tags) {
      rowBox =
        isPluginDirectoryModeOn() && plugin.entry.tags?.includes("community-managed")
          ? jsxProd_default(Text, {
              dimColor: true,
              children: "Community managed: maintained by its publisher, not Anthropic",
            })
          : null;
      $[34] = plugin.entry.tags;
      $[35] = rowBox;
    } else rowBox = $[35];
    let listFooter;
    if ($[36] !== plugin) {
      listFooter = jsxProd_default(formatPluginSource, {
        plugin,
      });
      $[36] = plugin;
      $[37] = listFooter;
    } else listFooter = $[37];
    let statusLine;
    if ($[38] !== plugin.entry.version) {
      statusLine =
        plugin.entry.version &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Version: ", stripInvisibleKeepEmoji(plugin.entry.version)],
        });
      $[38] = plugin.entry.version;
      $[39] = statusLine;
    } else statusLine = $[39];
    let hintLine;
    if ($[40] !== plugin.pluginId) {
      hintLine = jsxProd_default(PluginLastUpdated, {
        pluginId: plugin.pluginId,
      });
      $[40] = plugin.pluginId;
      $[41] = hintLine;
    } else hintLine = $[41];
    let detailsBody;
    if ($[42] !== plugin.entry.description) {
      detailsBody =
        plugin.entry.description &&
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            children: stripInvisibleKeepNewlines(plugin.entry.description),
          }),
        });
      $[42] = plugin.entry.description;
      $[43] = detailsBody;
    } else detailsBody = $[43];
    let authorLine;
    if ($[44] !== plugin.entry.author) {
      authorLine =
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
      $[44] = plugin.entry.author;
      $[45] = authorLine;
    } else authorLine = $[45];
    if (
      $[46] !== selectedItem ||
      $[47] !== items ||
      $[48] !== box ||
      $[49] !== rowBox ||
      $[50] !== listFooter ||
      $[51] !== statusLine ||
      $[52] !== hintLine ||
      $[53] !== detailsBody ||
      $[54] !== authorLine
    ) {
      details2 = jsxProd_default_2(Box, {
        flexDirection: "column",
        marginBottom: 1,
        children: [
          selectedItem,
          items,
          box,
          rowBox,
          listFooter,
          statusLine,
          hintLine,
          detailsBody,
          authorLine,
        ],
      });
      $[46] = selectedItem;
      $[47] = items;
      $[48] = box;
      $[49] = rowBox;
      $[50] = listFooter;
      $[51] = statusLine;
      $[52] = hintLine;
      $[53] = detailsBody;
      $[54] = authorLine;
      $[55] = details2;
    } else details2 = $[55];
    if ($[56] !== installError || $[57] !== onEntryHelperShown || $[58] !== plugin) {
      hint = jsxProd_default(renderInstallPreview, {
        plugin,
        onEntryHelperShown,
        refreshKey: installError,
      });
      $[56] = installError;
      $[57] = onEntryHelperShown;
      $[58] = plugin;
      $[59] = hint;
    } else hint = $[59];
    hint2 = extraSection;
    if ($[60] !== plugin.entry) {
      banner = jsxProd_default(renderCommandInstallSource, {
        entry: plugin.entry,
      });
      $[60] = plugin.entry;
      $[61] = banner;
    } else banner = $[61];
    if ($[62] === MEMO_CACHE_SENTINEL) {
      banner2 = jsxProd_default(PluginTrustWarning, {});
      $[62] = banner2;
    } else banner2 = $[62];
    if ($[63] !== installError) {
      footer2 =
        installError &&
        jsxProd_default(Box, {
          marginBottom: 1,
          children: jsxProd_default(ErrorText, {
            error: stripInvisibleKeepNewlines(installError),
          }),
        });
      $[63] = installError;
      $[64] = footer2;
    } else footer2 = $[64];
    content = PluginActionSelect;
    footer = plugin.pluginId;
    const pluginDetailsMenuOptions = buildPluginDetailsMenuOptions(hasHomepage, githubRepo, repoUrl);
    let filterItems;
    if ($[65] !== isInstalling) {
      filterItems = (value) =>
        isInstalling && value.value.startsWith("install-")
          ? {
              ...value,
              label: "Installing\u2026",
            }
          : value;
      $[65] = isInstalling;
      $[66] = filterItems;
    } else filterItems = $[66];
    options = pluginDetailsMenuOptions.map(filterItems);
    $[0] = extraSection;
    $[1] = installError;
    $[2] = isInstalling;
    $[3] = onBack;
    $[4] = onEntryHelperShown;
    $[5] = onInstall;
    $[6] = plugin;
    $[7] = showMarketplace;
    $[8] = title;
    $[9] = content;
    $[10] = status;
    $[11] = onSelect;
    $[12] = footer;
    $[13] = footer2;
    $[14] = options;
    $[15] = flexDirection;
    $[16] = details;
    $[17] = details2;
    $[18] = hint;
    $[19] = hint2;
    $[20] = banner;
    $[21] = banner2;
  } else {
    content = $[9];
    status = $[10];
    onSelect = $[11];
    footer = $[12];
    footer2 = $[13];
    options = $[14];
    flexDirection = $[15];
    details = $[16];
    details2 = $[17];
    hint = $[18];
    hint2 = $[19];
    banner = $[20];
    banner2 = $[21];
  }
  let item;
  if (
    $[67] !== content ||
    $[68] !== isInstalling ||
    $[69] !== onSelect ||
    $[70] !== footer ||
    $[71] !== options
  ) {
    item = jsxProd_default(
      content,
      {
        options,
        selectionDisabled: isInstalling,
        onSelect,
      },
      footer,
    );
    $[67] = content;
    $[68] = isInstalling;
    $[69] = onSelect;
    $[70] = footer;
    $[71] = options;
    $[72] = item;
  } else item = $[72];
  let children;
  if ($[73] === MEMO_CACHE_SENTINEL) {
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
    $[73] = children;
  } else children = $[73];
  let filtered;
  if ($[74] !== bylinePaddingLeft) {
    filtered = jsxProd_default(Box, {
      marginTop: 1,
      paddingLeft: bylinePaddingLeft,
      children,
    });
    $[74] = bylinePaddingLeft;
    $[75] = filtered;
  } else filtered = $[75];
  let filteredValue;
  if (
    $[76] !== status ||
    $[77] !== footer2 ||
    $[78] !== item ||
    $[79] !== filtered ||
    $[80] !== flexDirection ||
    $[81] !== details ||
    $[82] !== details2 ||
    $[83] !== hint ||
    $[84] !== hint2 ||
    $[85] !== banner ||
    $[86] !== banner2
  ) {
    filteredValue = jsxProd_default_2(status, {
      flexDirection,
      children: [details, details2, hint, hint2, banner, banner2, footer2, item, filtered],
    });
    $[76] = status;
    $[77] = footer2;
    $[78] = item;
    $[79] = filtered;
    $[80] = flexDirection;
    $[81] = details;
    $[82] = details2;
    $[83] = hint;
    $[84] = hint2;
    $[85] = banner;
    $[86] = banner2;
    $[87] = filteredValue;
  } else filteredValue = $[87];
  return filteredValue;
}
export {
  nullable,
  alwaysNull,
  COMPONENT_LABELS,
  renderComponentLine,
  alwaysNull_2,
  isPairNonEmpty,
  renderComponentLineAlt,
  PluginSelectionKeyHint,
  PluginActionSelect,
};
