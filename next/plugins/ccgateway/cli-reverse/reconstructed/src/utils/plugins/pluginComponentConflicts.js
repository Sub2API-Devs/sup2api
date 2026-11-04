/**
 * utils/plugins/pluginComponentConflicts.ts
 *
 * 2.1.316 新增：插件组件冲突警告文本与修复建议（MCP 重名、技能重名等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f3qhjfah.js (5)
 * attribution: placement 5
 */
import { stripInvisibleKeepEmoji } from "../settings/marketplaceSettingsAliases.js";
import { quotedPrintable, printableText, printableOrEmpty } from "../printableName.js";
import { getSettingSourceName } from "../settings/constants.js";
import { firstLineOf } from "../stringUtils.js";
import { claudeCommand } from "../worktreeResumeHint.js";
import { formatOnlyWhileDisabledHint } from "./marketplaceNames.js";

//@ chunk-f3qhjfah.js:19933-19966 placement
function pluginWarningText(warning) {
  return stripInvisibleKeepEmoji(pluginWarningMessage(warning));
}
//@ chunk-f3qhjfah.js:19966-23045 placement
/**
 * 插件组件冲突警告文本（manifest 遮蔽目录、MCP 服务器重名/重复、mcpb 需要配置、技能重名…）。
 */
function pluginWarningMessage(warning) {
  switch (warning.type) {
    case "folder-shadowed-by-manifest": {
      let names = quoteAndJoinNames(warning.manifestFields);
      return `Default ${quotedPrintable(warning.component)}/ folder is ignored because the manifest sets ${names}`;
    }
    case "mcp-server-suppressed-duplicate": {
      let ownerText = warning.duplicateOf.startsWith("plugin:")
        ? `server provided by plugin "${quotedPrintable(warning.duplicateOf.split(":")[1] ?? "?")}"`
        : `already-configured "${quotedPrintable(warning.duplicateOf)}"`;
      return `MCP server "${quotedPrintable(warning.serverName)}" skipped \u2014 same command/URL as ${ownerText}`;
    }
    case "mcpb-needs-config":
      return `Bundled MCP server "${quotedPrintable(warning.serverName)}" was not started: it needs configuration`;
    case "plugin-renamed":
      return warning.renamedTo === null
        ? `Removed from the "${quotedPrintable(warning.marketplace)}" marketplace`
        : `Renamed to "${quotedPrintable(warning.renamedTo)}" in the "${quotedPrintable(warning.marketplace)}" marketplace`;
    case "lsp-extension-conflict": {
      let pluginName = warning.activeServer.startsWith("plugin:")
        ? warning.activeServer.split(":")[1]
        : undefined;
      let ownerText = pluginName
        ? `plugin "${quotedPrintable(pluginName)}"`
        : `"${quotedPrintable(warning.activeServer)}"`;
      return `LSP server "${quotedPrintable(warning.serverName)}" is not used for ${quotedPrintable(warning.extension)} files \u2014 ${ownerText} already registered a server for that extension`;
    }
    case "project-scope-suppressed-untrusted":
    case "project-scope-server-stripped":
      return printableText(warning.warning);
    case "broken-wikilink":
      return `${quotedPrintable(warning.raw)} in ${printableOrEmpty(warning.filePath)}:${warning.line} doesn't resolve to a skill`;
    case "synced-plugin-shadowed":
      return `"${quotedPrintable(warning.source)}" from claude.ai not loaded \u2014 "${quotedPrintable(warning.shadowedBy)}" on this machine has the same name and takes precedence`;
    case "hooks-left-out-by-name":
      return `Its hooks.json hooks do not run. "${quotedPrintable(warning.heldBy)}" holds the same plugin name and comes first`;
    case "hooks-module-left-out-by-name":
      return `Its hooks module does not load. "${quotedPrintable(warning.heldBy)}" holds the same plugin name and comes first`;
    case "hooks-passed-over": {
      let joined = warning.patterns.map((pattern) => quotedPrintable(pattern)).join(", ");
      let mapped = (warning.reopened ?? []).map(
        (reopened) =>
          `. ${quotedPrintable(reopened.plugin)} may reopen ` +
          reopened.patterns.map((pattern) => quotedPrintable(pattern)).join(", "),
      );
      return (
        `Its hooks on ${joined} do not run here: where an organization manages Claude Code, these events pass over the plugins you install${mapped.length > 0 ? ", unless one reopens them" : ""}` +
        mapped.join("")
      );
    }
    case "managed-hooks-restricted":
      return `"${quotedPrintable(warning.source)}" loads because its sync attribution matches a plugin your organization's managed settings turn on, but any hooks it ships are NOT running \u2014 allowManagedHooksOnly runs hooks only from plugins installed under managed settings' exact plugin@marketplace id`;
    case "managed-plugin-disabled-by-settings":
      return `"${quotedPrintable(warning.source)}" is disabled by your settings, though its sync attribution matches a plugin your organization's managed settings turn on \u2014 if this copy is the org's delivery, that plugin is not running`;
    case "ineffective-disable":
      return `Disabled in ~/.claude/settings.json but still loads \u2014 ${getSettingSourceName(warning.overriddenBy)} settings enable it, which overrides your user setting`;
    case "dependencies-refused":
      return `The packages it lists were not installed, because ${quotedPrintable(firstLineOf(warning.reason, ";"))}`;
    case "dependencies-not-installed": {
      let command = claudeCommand("plugin update", warning.source);
      return `The packages it lists are not installed. ${command ? `Run \`${command}\` to install them` : "Update it from /plugin to install them"}`;
    }
  }
}
//@ chunk-f3qhjfah.js:23045-23078 placement
function pluginWarningFixText(warning) {
  return stripInvisibleKeepEmoji(pluginWarningFix(warning));
}
//@ chunk-f3qhjfah.js:23078-27079 placement
function pluginWarningFix(warning) {
  switch (warning.type) {
    case "folder-shadowed-by-manifest": {
      let names = quoteAndJoinNames(warning.manifestFields);
      if (warning.manifestFields.length === 1)
        return `Remove ${names} from .claude-plugin/plugin.json (or SKILL.md frontmatter) to auto-load the folder, or add the folder's files to the ${names} list if you want both`;
      return `Remove ${names} from .claude-plugin/plugin.json (or SKILL.md frontmatter) to auto-load the folder`;
    }
    case "project-scope-suppressed-untrusted":
      return "Accept the trust dialog for this workspace, then run /reload-plugins.";
    case "project-scope-server-stripped":
      return "Monitors from project @skills-dir plugins are not supported \u2014 install the plugin at user scope instead.";
    case "broken-wikilink":
      return warning.reason === "invalid"
        ? "Wikilink names may use letters, digits, dash, underscore \u2014 rename the link"
        : `Create one of: ${warning.tried.map((candidate) => printableOrEmpty(candidate)).join(" or ")}, or fix the link spelling`;
    case "mcp-server-suppressed-duplicate": {
      if (warning.duplicateOf.startsWith("plugin:")) {
        let otherPlugin = warning.duplicateOf.split(":")[1] ?? "the other plugin";
        return `Disable plugin "${quotedPrintable(otherPlugin)}" if you want this plugin's version instead`;
      }
      return `Remove "${quotedPrintable(warning.duplicateOf)}" from your MCP config if you want the plugin's version instead`;
    }
    case "mcpb-needs-config":
      return `Open "${quotedPrintable(warning.plugin)}" in the Installed tab and choose Configure`;
    case "lsp-extension-conflict": {
      let owner = warning.activeServer.startsWith("plugin:")
        ? (warning.activeServer.split(":")[1] ?? "the other plugin")
        : warning.activeServer;
      if (owner === warning.plugin)
        return `Plugin "${quotedPrintable(warning.plugin)}" declares two LSP servers for ${quotedPrintable(warning.extension)} \u2014 remove or reorder "${quotedPrintable(warning.serverName)}" in its lspServers config`;
      return `Disable plugin "${quotedPrintable(owner)}" to use this plugin's LSP server for ${quotedPrintable(warning.extension)} files, or disable "${quotedPrintable(warning.plugin)}" to silence this warning`;
    }
    case "synced-plugin-shadowed": {
      let command = claudeCommand("plugin enable", warning.source);
      return `To use the claude.ai copy instead, ${command ? `run \`${command}\`` : "enable it from /plugin"}, then disable or remove "${quotedPrintable(warning.shadowedBy)}"`;
    }
    case "hooks-left-out-by-name":
      return formatOnlyWhileDisabledHint(
        "One plugin per name runs hooks.json hooks, so this copy's run",
        warning.heldBy,
      );
    case "hooks-module-left-out-by-name":
      return formatOnlyWhileDisabledHint(
        "One plugin per name loads a hooks module, so this copy's loads",
        warning.heldBy,
      );
    case "hooks-passed-over":
      return `Only a plugin that counts as your organization's own runs hooks on these events${warning.reopened ? ", or one it lets through" : ""}. An administrator sets that up in managed settings`;
    case "managed-hooks-restricted":
      return "If this plugin is org-mandated and its hooks are required, ask your administrator to install it under the exact plugin@marketplace id managed settings name; if you did not expect this copy, remove its directory";
    case "managed-plugin-disabled-by-settings": {
      let command = claudeCommand("plugin enable", warning.source);
      return `To run it, ${command ? `run \`${command}\`` : "enable it from /plugin"}; if you did not expect this copy, remove its directory`;
    }
    case "plugin-renamed":
      return warning.renamedTo === null
        ? `Remove "${quotedPrintable(warning.source)}" from enabledPlugins if you still see this on the next start`
        : `If you still see this on the next start, update enabledPlugins to use "${quotedPrintable(warning.renamedTo)}@${quotedPrintable(warning.marketplace)}" (managed settings are not rewritten automatically)`;
    case "dependencies-refused":
      return "If it needs those packages, parts of it may not work. Updating or reinstalling this version of the plugin will not install them while that is still true";
    case "dependencies-not-installed":
      return "If it needs those packages, parts of it may not work";
    case "ineffective-disable":
      switch (warning.overriddenBy) {
        case "projectSettings":
          return `Set "enabledPlugins": {"${quotedPrintable(warning.source)}": false} in .claude/settings.local.json instead \u2014 project settings override ~/.claude/settings.json`;
        case "localSettings":
          return "Change it to false in .claude/settings.local.json \u2014 that file currently enables it";
        case "flagSettings":
          return `Remove "${quotedPrintable(warning.source)}" from the --settings value \u2014 that flag overrides all settings files`;
        case "policySettings":
          return "Managed policy can't be overridden locally \u2014 contact your administrator";
        case "userSettings":
          return "";
      }
  }
}
//@ chunk-f3qhjfah.js:27079-27136 placement
function quoteAndJoinNames(manifestFields) {
  return manifestFields.map((name) => `"${name}"`).join(" and ");
}
export { pluginWarningText, pluginWarningFixText };
