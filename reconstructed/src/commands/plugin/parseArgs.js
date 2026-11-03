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
import { jF, QE } from "../../utils/plugins/pluginGates.js";

//@ chunk-bppzggd7.js:230-2263 fingerprint = parsePluginArgs (0.683)
function parsePluginArgs(args) {
  if (!args) return { type: "menu" };
  let parts = args.trim().split(/\s+/);
  switch (parts[0]?.toLowerCase()) {
    case "help":
    case "--help":
    case "-h":
      return { type: "help" };
    case "list":
    case "ls": {
      let found = parts.slice(1).find((e) => e === "--enabled" || e === "--disabled");
      if (found) return { type: "list", filter: found === "--enabled" ? "enabled" : "disabled" };
      return { type: "list" };
    }
    case "install":
    case "i": {
      let r = parseMarketplaceFlag(parts.slice(1));
      if (r) return r;
      let target = parts[1];
      if (!target) return { type: "install" };
      let index = target.lastIndexOf("@");
      if (index > 0) {
        let sliced = target.slice(0, index),
          sliced_2 = target.slice(index + 1);
        return { type: "install", plugin: sliced, marketplace: sliced_2 };
      }
      if (
        !target.startsWith("@") &&
        (target.startsWith("http://") ||
          target.startsWith("https://") ||
          target.startsWith("file://") ||
          target.includes("/") ||
          target.includes("\\"))
      )
        return { type: "install", marketplace: target };
      return { type: "install", plugin: target };
    }
    case "manage":
      return { type: "manage" };
    case "stats": {
      if (jF()) return { type: "stats" };
      return { type: "menu" };
    }
    case "directory":
    case "search": {
      if (QE()) return { type: "directory", query: parts.slice(1).join(" ").trim() || void 0 };
      return { type: "menu" };
    }
    case "uninstall":
      return { type: "uninstall", plugin: parts[1] };
    case "enable":
      return { type: "enable", plugin: parts[1] };
    case "disable":
      return { type: "disable", plugin: parts[1] };
    case "configure":
    case "config":
      return { type: "configure", plugin: parts[1] };
    case "validate":
      return { type: "validate", path: parts.slice(1).join(" ").trim() || void 0 };
    case "eval":
      return { type: "menu" };
    case "tag": {
      let r = new Set(["--push", "--dry-run", "--force", "-f"]),
        sliced = parts.slice(1),
        filtered = sliced.filter((i) => i.startsWith("-")),
        filtered_2 = sliced.filter((i) => !i.startsWith("-")),
        isMarketplace = filtered.find((i) => !r.has(i)) ?? filtered_2[1];
      return {
        type: "tag",
        path: filtered_2[0],
        push: filtered.includes("--push"),
        dryRun: filtered.includes("--dry-run"),
        force: filtered.includes("--force") || filtered.includes("-f"),
        ...(isMarketplace !== void 0 && { unknownFlag: isMarketplace }),
      };
    }
    case "marketplace":
    case "market": {
      let action = parts[1]?.toLowerCase(),
        target = parts.slice(2).join(" ");
      switch (action) {
        case "add":
          return { type: "marketplace", action: "add", target: target };
        case "remove":
        case "rm":
          return { type: "marketplace", action: "remove", target: target };
        case "update":
          return { type: "marketplace", action: "update", target: target };
        case "list":
          return { type: "marketplace", action: "list" };
        default:
          return { type: "marketplace" };
      }
    }
    default:
      return { type: "menu" };
  }
}
//@ chunk-bppzggd7.js:2263-2319 placement
var p = "/plugin install <plugin> --marketplace <source>";
//@ chunk-bppzggd7.js:2319-2665 placement
function parseMarketplaceFlag(a) {
  let index = a.findIndex((n) => n === "--marketplace" || n.startsWith("--marketplace="));
  if (index === -1) return;
  let s = a[index],
    r = s !== "--marketplace",
    e = validateMarketplaceInstallArgs({
      plugins: a.filter((n, l) => l !== index && (r || l !== index + 1)),
      marketplaceSource: r ? s.slice(14) : a[index + 1],
      commandLine: p,
    });
  return "usageError" in e
    ? { type: "usage-error", message: e.usageError }
    : { type: "install-from-source", ...e };
}
//@ chunk-bppzggd7.js:2665-3116 placement
function validateMarketplaceInstallArgs({
  plugins: plugins,
  marketplaceSource: marketplaceSource,
  commandLine: commandLine,
}) {
  if (!marketplaceSource || marketplaceSource.startsWith("-"))
    return {
      usageError: `--marketplace needs a marketplace source (owner/repo or a URL). Usage: ${commandLine}`,
    };
  let r = plugins[0];
  if (plugins.length !== 1 || !r || r.startsWith("-"))
    return { usageError: `--marketplace needs exactly one plugin name. Usage: ${commandLine}` };
  if (r.lastIndexOf("@") > 0)
    return { usageError: `Name the marketplace once: <plugin>@<marketplace>, or ${commandLine}` };
  return { plugin: r, marketplaceSource: marketplaceSource };
}
//@ chunk-bppzggd7.js:3116-3209 placement
function formatMarketplaceInstallCommand({ plugin: plugin, marketplaceSource: marketplaceSource }) {
  return `/plugin install ${plugin} --marketplace ${marketplaceSource}`;
}

export { parsePluginArgs, formatMarketplaceInstallCommand, validateMarketplaceInstallArgs };
