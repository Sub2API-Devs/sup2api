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
function pluginWarningText(e) {
  return stripInvisibleKeepEmoji(pluginWarningMessage(e));
}
/**
 * 插件组件冲突警告文本（manifest 遮蔽目录、MCP 服务器重名/重复、mcpb 需要配置、技能重名…）。
 */
//@ chunk-f3qhjfah.js:19966-23045 placement
function pluginWarningMessage(e) {
  switch (e.type) {
    case "folder-shadowed-by-manifest": {
      let n = De(e.manifestFields);
      return `Default ${quotedPrintable(e.component)}/ folder is ignored because the manifest sets ${n}`;
    }
    case "mcp-server-suppressed-duplicate": {
      let n = e.duplicateOf.startsWith("plugin:")
        ? `server provided by plugin "${quotedPrintable(e.duplicateOf.split(":")[1] ?? "?")}"`
        : `already-configured "${quotedPrintable(e.duplicateOf)}"`;
      return `MCP server "${quotedPrintable(e.serverName)}" skipped \u2014 same command/URL as ${n}`;
    }
    case "mcpb-needs-config":
      return `Bundled MCP server "${quotedPrintable(e.serverName)}" was not started: it needs configuration`;
    case "plugin-renamed":
      return e.renamedTo === null
        ? `Removed from the "${quotedPrintable(e.marketplace)}" marketplace`
        : `Renamed to "${quotedPrintable(e.renamedTo)}" in the "${quotedPrintable(e.marketplace)}" marketplace`;
    case "lsp-extension-conflict": {
      let n = e.activeServer.startsWith("plugin:") ? e.activeServer.split(":")[1] : void 0,
        r = n ? `plugin "${quotedPrintable(n)}"` : `"${quotedPrintable(e.activeServer)}"`;
      return `LSP server "${quotedPrintable(e.serverName)}" is not used for ${quotedPrintable(e.extension)} files \u2014 ${r} already registered a server for that extension`;
    }
    case "project-scope-suppressed-untrusted":
    case "project-scope-server-stripped":
      return printableText(e.warning);
    case "broken-wikilink":
      return `${quotedPrintable(e.raw)} in ${printableOrEmpty(e.filePath)}:${e.line} doesn't resolve to a skill`;
    case "synced-plugin-shadowed":
      return `"${quotedPrintable(e.source)}" from claude.ai not loaded \u2014 "${quotedPrintable(e.shadowedBy)}" on this machine has the same name and takes precedence`;
    case "hooks-left-out-by-name":
      return `Its hooks.json hooks do not run. "${quotedPrintable(e.heldBy)}" holds the same plugin name and comes first`;
    case "hooks-module-left-out-by-name":
      return `Its hooks module does not load. "${quotedPrintable(e.heldBy)}" holds the same plugin name and comes first`;
    case "hooks-passed-over": {
      let joined = e.patterns.map((pattern) => quotedPrintable(pattern)).join(", "),
        mapped = (e.reopened ?? []).map(
          (s) =>
            `. ${quotedPrintable(s.plugin)} may reopen ` +
            s.patterns.map((pattern) => quotedPrintable(pattern)).join(", "),
        );
      return (
        `Its hooks on ${joined} do not run here: where an organization manages Claude Code, these events pass over the plugins you install${mapped.length > 0 ? ", unless one reopens them" : ""}` +
        mapped.join("")
      );
    }
    case "managed-hooks-restricted":
      return `"${quotedPrintable(e.source)}" loads because its sync attribution matches a plugin your organization's managed settings turn on, but any hooks it ships are NOT running \u2014 allowManagedHooksOnly runs hooks only from plugins installed under managed settings' exact plugin@marketplace id`;
    case "managed-plugin-disabled-by-settings":
      return `"${quotedPrintable(e.source)}" is disabled by your settings, though its sync attribution matches a plugin your organization's managed settings turn on \u2014 if this copy is the org's delivery, that plugin is not running`;
    case "ineffective-disable":
      return `Disabled in ~/.claude/settings.json but still loads \u2014 ${getSettingSourceName(e.overriddenBy)} settings enable it, which overrides your user setting`;
    case "dependencies-refused":
      return `The packages it lists were not installed, because ${quotedPrintable(firstLineOf(e.reason, ";"))}`;
    case "dependencies-not-installed": {
      let n = claudeCommand("plugin update", e.source);
      return `The packages it lists are not installed. ${n ? `Run \`${n}\` to install them` : "Update it from /plugin to install them"}`;
    }
  }
}
//@ chunk-f3qhjfah.js:23045-23078 placement
function pluginWarningFixText(e) {
  return stripInvisibleKeepEmoji(pluginWarningFix(e));
}
//@ chunk-f3qhjfah.js:23078-27079 placement
function pluginWarningFix(e) {
  switch (e.type) {
    case "folder-shadowed-by-manifest": {
      let n = De(e.manifestFields);
      if (e.manifestFields.length === 1)
        return `Remove ${n} from .claude-plugin/plugin.json (or SKILL.md frontmatter) to auto-load the folder, or add the folder's files to the ${n} list if you want both`;
      return `Remove ${n} from .claude-plugin/plugin.json (or SKILL.md frontmatter) to auto-load the folder`;
    }
    case "project-scope-suppressed-untrusted":
      return "Accept the trust dialog for this workspace, then run /reload-plugins.";
    case "project-scope-server-stripped":
      return "Monitors from project @skills-dir plugins are not supported \u2014 install the plugin at user scope instead.";
    case "broken-wikilink":
      return e.reason === "invalid"
        ? "Wikilink names may use letters, digits, dash, underscore \u2014 rename the link"
        : `Create one of: ${e.tried.map((n) => printableOrEmpty(n)).join(" or ")}, or fix the link spelling`;
    case "mcp-server-suppressed-duplicate": {
      if (e.duplicateOf.startsWith("plugin:")) {
        let n = e.duplicateOf.split(":")[1] ?? "the other plugin";
        return `Disable plugin "${quotedPrintable(n)}" if you want this plugin's version instead`;
      }
      return `Remove "${quotedPrintable(e.duplicateOf)}" from your MCP config if you want the plugin's version instead`;
    }
    case "mcpb-needs-config":
      return `Open "${quotedPrintable(e.plugin)}" in the Installed tab and choose Configure`;
    case "lsp-extension-conflict": {
      let n = e.activeServer.startsWith("plugin:")
        ? (e.activeServer.split(":")[1] ?? "the other plugin")
        : e.activeServer;
      if (n === e.plugin)
        return `Plugin "${quotedPrintable(e.plugin)}" declares two LSP servers for ${quotedPrintable(e.extension)} \u2014 remove or reorder "${quotedPrintable(e.serverName)}" in its lspServers config`;
      return `Disable plugin "${quotedPrintable(n)}" to use this plugin's LSP server for ${quotedPrintable(e.extension)} files, or disable "${quotedPrintable(e.plugin)}" to silence this warning`;
    }
    case "synced-plugin-shadowed": {
      let n = claudeCommand("plugin enable", e.source);
      return `To use the claude.ai copy instead, ${n ? `run \`${n}\`` : "enable it from /plugin"}, then disable or remove "${quotedPrintable(e.shadowedBy)}"`;
    }
    case "hooks-left-out-by-name":
      return formatOnlyWhileDisabledHint(
        "One plugin per name runs hooks.json hooks, so this copy's run",
        e.heldBy,
      );
    case "hooks-module-left-out-by-name":
      return formatOnlyWhileDisabledHint(
        "One plugin per name loads a hooks module, so this copy's loads",
        e.heldBy,
      );
    case "hooks-passed-over":
      return `Only a plugin that counts as your organization's own runs hooks on these events${e.reopened ? ", or one it lets through" : ""}. An administrator sets that up in managed settings`;
    case "managed-hooks-restricted":
      return "If this plugin is org-mandated and its hooks are required, ask your administrator to install it under the exact plugin@marketplace id managed settings name; if you did not expect this copy, remove its directory";
    case "managed-plugin-disabled-by-settings": {
      let n = claudeCommand("plugin enable", e.source);
      return `To run it, ${n ? `run \`${n}\`` : "enable it from /plugin"}; if you did not expect this copy, remove its directory`;
    }
    case "plugin-renamed":
      return e.renamedTo === null
        ? `Remove "${quotedPrintable(e.source)}" from enabledPlugins if you still see this on the next start`
        : `If you still see this on the next start, update enabledPlugins to use "${quotedPrintable(e.renamedTo)}@${quotedPrintable(e.marketplace)}" (managed settings are not rewritten automatically)`;
    case "dependencies-refused":
      return "If it needs those packages, parts of it may not work. Updating or reinstalling this version of the plugin will not install them while that is still true";
    case "dependencies-not-installed":
      return "If it needs those packages, parts of it may not work";
    case "ineffective-disable":
      switch (e.overriddenBy) {
        case "projectSettings":
          return `Set "enabledPlugins": {"${quotedPrintable(e.source)}": false} in .claude/settings.local.json instead \u2014 project settings override ~/.claude/settings.json`;
        case "localSettings":
          return "Change it to false in .claude/settings.local.json \u2014 that file currently enables it";
        case "flagSettings":
          return `Remove "${quotedPrintable(e.source)}" from the --settings value \u2014 that flag overrides all settings files`;
        case "policySettings":
          return "Managed policy can't be overridden locally \u2014 contact your administrator";
        case "userSettings":
          return "";
      }
  }
}
//@ chunk-f3qhjfah.js:27079-27136 placement
function De(e) {
  return e.map((n) => `"${n}"`).join(" and ");
}

export { pluginWarningText, pluginWarningFixText };
