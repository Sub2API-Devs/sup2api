/**
 * commands/plugin/parseArgs.ts
 *
 * 并入已有模块：/plugin 参数解析（marketplace 安装参数）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/parseArgs.ts
 * pieces: chunk-bppzggd7.js (5)
 * attribution: fingerprint 1, placement 4
 */
import { lanternPrismEnabled, isPluginDirectoryModeOn } from "../../utils/plugins/pluginGates.js";

//@ chunk-bppzggd7.js:230-2263 fingerprint (2.1.88 match: parsePluginArgs, 0.683)
function parsePluginArgs(args) {
  if (!args)
    return {
      type: "menu",
    };
  let parts = args.trim().split(/\s+/);
  switch (parts[0]?.toLowerCase()) {
    case "help":
    case "--help":
    case "-h":
      return {
        type: "help",
      };
    case "list":
    case "ls": {
      let found = parts.slice(1).find((part) => part === "--enabled" || part === "--disabled");
      if (found)
        return {
          type: "list",
          filter: found === "--enabled" ? "enabled" : "disabled",
        };
      return {
        type: "list",
      };
    }
    case "install":
    case "i": {
      let marketplaceFlag = parseMarketplaceFlag(parts.slice(1));
      if (marketplaceFlag) return marketplaceFlag;
      let target = parts[1];
      if (!target)
        return {
          type: "install",
        };
      let index = target.lastIndexOf("@");
      if (index > 0) {
        let plugin = target.slice(0, index);
        let marketplace = target.slice(index + 1);
        return {
          type: "install",
          plugin,
          marketplace,
        };
      }
      if (
        !target.startsWith("@") &&
        (target.startsWith("http://") ||
          target.startsWith("https://") ||
          target.startsWith("file://") ||
          target.includes("/") ||
          target.includes("\\"))
      )
        return {
          type: "install",
          marketplace: target,
        };
      return {
        type: "install",
        plugin: target,
      };
    }
    case "manage":
      return {
        type: "manage",
      };
    case "stats": {
      if (lanternPrismEnabled())
        return {
          type: "stats",
        };
      return {
        type: "menu",
      };
    }
    case "directory":
    case "search": {
      if (isPluginDirectoryModeOn())
        return {
          type: "directory",
          query: parts.slice(1).join(" ").trim() || undefined,
        };
      return {
        type: "menu",
      };
    }
    case "uninstall":
      return {
        type: "uninstall",
        plugin: parts[1],
      };
    case "enable":
      return {
        type: "enable",
        plugin: parts[1],
      };
    case "disable":
      return {
        type: "disable",
        plugin: parts[1],
      };
    case "configure":
    case "config":
      return {
        type: "configure",
        plugin: parts[1],
      };
    case "validate":
      return {
        type: "validate",
        path: parts.slice(1).join(" ").trim() || undefined,
      };
    case "eval":
      return {
        type: "menu",
      };
    case "tag": {
      let flagNames = new Set(["--push", "--dry-run", "--force", "-f"]);
      let sliced = parts.slice(1);
      let filtered = sliced.filter((flag) => flag.startsWith("-"));
      let filtered_2 = sliced.filter((arg) => !arg.startsWith("-"));
      let isMarketplace = filtered.find((flag) => !flagNames.has(flag)) ?? filtered_2[1];
      return {
        type: "tag",
        path: filtered_2[0],
        push: filtered.includes("--push"),
        dryRun: filtered.includes("--dry-run"),
        force: filtered.includes("--force") || filtered.includes("-f"),
        ...(isMarketplace !== undefined && {
          unknownFlag: isMarketplace,
        }),
      };
    }
    case "marketplace":
    case "market": {
      let action = parts[1]?.toLowerCase();
      let target = parts.slice(2).join(" ");
      switch (action) {
        case "add":
          return {
            type: "marketplace",
            action: "add",
            target,
          };
        case "remove":
        case "rm":
          return {
            type: "marketplace",
            action: "remove",
            target,
          };
        case "update":
          return {
            type: "marketplace",
            action: "update",
            target,
          };
        case "list":
          return {
            type: "marketplace",
            action: "list",
          };
        default:
          return {
            type: "marketplace",
          };
      }
    }
    default:
      return {
        type: "menu",
      };
  }
}
//@ chunk-bppzggd7.js:2263-2319 placement
var PLUGIN_INSTALL_USAGE_TEXT = "/plugin install <plugin> --marketplace <source>";
//@ chunk-bppzggd7.js:2319-2665 placement
function parseMarketplaceFlag(argv) {
  let index = argv.findIndex((arg) => arg === "--marketplace" || arg.startsWith("--marketplace="));
  if (index === -1) return;
  let token = argv[index];
  let isBareFlag = token !== "--marketplace";
  let result = validateMarketplaceInstallArgs({
    plugins: argv.filter((arg, argIndex) => argIndex !== index && (isBareFlag || argIndex !== index + 1)),
    marketplaceSource: isBareFlag ? token.slice(14) : argv[index + 1],
    commandLine: PLUGIN_INSTALL_USAGE_TEXT,
  });
  return "usageError" in result
    ? {
        type: "usage-error",
        message: result.usageError,
      }
    : {
        type: "install-from-source",
        ...result,
      };
}
//@ chunk-bppzggd7.js:2665-3116 placement
function validateMarketplaceInstallArgs({ plugins, marketplaceSource, commandLine }) {
  if (!marketplaceSource || marketplaceSource.startsWith("-"))
    return {
      usageError: `--marketplace needs a marketplace source (owner/repo or a URL). Usage: ${commandLine}`,
    };
  let firstPlugin = plugins[0];
  if (plugins.length !== 1 || !firstPlugin || firstPlugin.startsWith("-"))
    return {
      usageError: `--marketplace needs exactly one plugin name. Usage: ${commandLine}`,
    };
  if (firstPlugin.lastIndexOf("@") > 0)
    return {
      usageError: `Name the marketplace once: <plugin>@<marketplace>, or ${commandLine}`,
    };
  return {
    plugin: firstPlugin,
    marketplaceSource,
  };
}
//@ chunk-bppzggd7.js:3116-3209 placement
function formatMarketplaceInstallCommand({ plugin, marketplaceSource }) {
  return `/plugin install ${plugin} --marketplace ${marketplaceSource}`;
}
export { parsePluginArgs, formatMarketplaceInstallCommand, validateMarketplaceInstallArgs };
