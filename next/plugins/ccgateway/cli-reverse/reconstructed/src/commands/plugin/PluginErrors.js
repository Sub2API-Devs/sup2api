/**
 * commands/plugin/PluginErrors.tsx
 *
 * /plugin 插件错误展示与修复建议
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/PluginErrors.tsx
 * pieces: chunk-wb51jffc.js (3)
 * attribution: fingerprint 2, layout 1
 */
import {
  printableOrEmpty,
  quotedPrintable,
  printableText,
  truncateWithEllipsis,
} from "../../utils/printableName.js";
import {
  marketplaceListingChangedMessage,
  isMarketplaceLoadError,
  reservedMarketplaceNameError,
  pluginBlockSource,
  directoryBlockedMessage,
  marketplaceNotFoundMessage,
  MARKETPLACE_SOURCE_FIX_HINTS,
  RELOAD_PLUGINS_HINT,
  marketplaceRemovalAdvice,
} from "../../utils/plugins/marketplaceNames.js";
import { capitalize } from "../../utils/stringUtils.js";
import { pluginErrorText, cloudOnlyDependencyMessage } from "../../types/plugin.js";
import { stripInvisibleKeepEmoji } from "../../utils/settings/marketplaceSettingsAliases.js";
import { marketplaceOf } from "../../utils/plugins/pluginIdentifier.js";
import { SYNCED } from "../../utils/telemetry/pluginTelemetry.js";
import { formatDisableOrUninstall } from "./pluginUsageStats.js";
import { claudeCommand } from "../../utils/worktreeResumeHint.js";

//@ chunk-wb51jffc.js:126623-131604 fingerprint (2.1.88 match: formatErrorMessage, 0.744)
function formatErrorMessage(error) {
  switch (error.type) {
    case "path-not-found":
      if (error.plugin === undefined)
        return error.errno
          ? `Plugin path could not be checked: ${printableOrEmpty(error.path)} (${quotedPrintable(error.errno)})`
          : `Plugin path not found: ${printableOrEmpty(error.path)}`;
      return error.errno
        ? `${quotedPrintable(error.component)} path could not be checked: ${printableOrEmpty(error.path)} (${quotedPrintable(error.errno)})`
        : `${quotedPrintable(error.component)} path not found: ${printableOrEmpty(error.path)}`;
    case "path-traversal":
      return !error.reason && (error.component === "mcp-servers" || error.component === "lsp-servers")
        ? `${quotedPrintable(error.component)} path not read: ${printableOrEmpty(error.path)} is absolute or has a ".." part`
        : `${quotedPrintable(error.component)} path escapes plugin directory: ${printableOrEmpty(error.path)}${error.reason ? ` \u2014 ${printableOrEmpty(error.reason)}` : ""}`;
    case "git-auth-failed":
      return `Git ${error.authType.toUpperCase()} authentication failed for ${printableOrEmpty(error.gitUrl)}`;
    case "git-timeout":
      return `Git ${quotedPrintable(error.operation)} timed out for ${printableOrEmpty(error.gitUrl)}`;
    case "network-error":
      return `Network error accessing ${printableOrEmpty(error.url)}${error.details ? `: ${quotedPrintable(error.details)}` : ""}`;
    case "manifest-parse-error":
      return `Failed to parse manifest at ${printableOrEmpty(error.manifestPath)}: ${quotedPrintable(error.parseError, 500)}`;
    case "manifest-validation-error":
      return error.containmentRefused
        ? `Plugin not loaded: its manifest ${printableOrEmpty(error.manifestPath)} was not read, because ${quotedPrintable(error.validationErrors.join(", "), 1000)}`
        : `Invalid manifest at ${printableOrEmpty(error.manifestPath)}: ${quotedPrintable(error.validationErrors.join(", "), 1000)}`;
    case "plugin-not-found":
      if (error.removedFromDirectory)
        return marketplaceListingChangedMessage(
          error.pluginId,
          error.directoryRenamedTo,
          error.directoryIdentityChanged === true,
          error.directoryNotInstallableReason,
          error.registryReadFailed === true,
        );
      return `Plugin "${quotedPrintable(error.pluginId)}" not found in marketplace "${quotedPrintable(error.marketplace)}"`;
    case "marketplace-not-found":
      return error.registryReadFailed
        ? `Marketplace "${quotedPrintable(error.marketplace)}": the marketplace registry could not be read`
        : error.registrationHidden
          ? error.registrationHiddenReason === undefined
            ? `Marketplace "${quotedPrintable(error.marketplace)}" is added but ignored (see the debug log)`
            : `Marketplace "${quotedPrintable(error.marketplace)}" is added but ignored. ${capitalize(printableText(error.registrationHiddenReason))}`
          : `Marketplace "${quotedPrintable(error.marketplace)}" not found`;
    case "marketplace-load-failed":
      if (error.directoryBlockedBy !== undefined || isMarketplaceLoadError(error))
        return pluginErrorText(error);
      if (error.nameRefused) return reservedMarketplaceNameError(error.marketplace);
      return `Failed to load marketplace "${quotedPrintable(error.marketplace)}": ${quotedPrintable(error.reason)}`;
    case "mcp-config-invalid":
      return `Invalid MCP server config for "${quotedPrintable(error.serverName)}": ${quotedPrintable(error.validationError)}`;
    case "hook-load-failed":
      return `Failed to load hooks from ${printableOrEmpty(error.hookPath)}: ${quotedPrintable(error.reason)}`;
    case "component-load-failed":
      return `Failed to load ${quotedPrintable(error.component)} from ${printableOrEmpty(error.path)}: ${quotedPrintable(error.reason)}`;
    case "mcpb-download-failed":
      return `Failed to download MCPB from ${printableOrEmpty(error.url)}: ${quotedPrintable(error.reason)}`;
    case "mcpb-extract-failed":
      return `Failed to extract MCPB ${printableOrEmpty(error.mcpbPath)}: ${quotedPrintable(error.reason)}`;
    case "mcpb-invalid-manifest":
      return `MCPB manifest invalid at ${printableOrEmpty(error.mcpbPath)}: ${quotedPrintable(error.validationError)}`;
    case "marketplace-blocked-by-policy": {
      let blockSource = pluginBlockSource(error);
      if (blockSource !== null) return directoryBlockedMessage(undefined, blockSource);
      return error.blockedByBlocklist
        ? `Marketplace "${quotedPrintable(error.marketplace)}" is blocked by enterprise policy`
        : `Marketplace "${quotedPrintable(error.marketplace)}" is not in the allowed marketplace list`;
    }
    case "dependency-unsatisfied":
      return error.reason === "not-enabled"
        ? `Dependency "${quotedPrintable(error.dependency)}" is disabled`
        : `Dependency "${quotedPrintable(error.dependency)}" is not installed${error.sameNameSyncedPlugin === undefined ? "" : `; ${cloudOnlyDependencyMessage(error.sameNameSyncedPlugin)}`}`;
    case "dependency-version-unsatisfied":
      return `Requires "${quotedPrintable(error.dependency)}" ${quotedPrintable(error.required)}, installed ${quotedPrintable(error.installed ?? "version unknown")}`;
    case "lsp-config-invalid":
      return `Invalid LSP server config for "${quotedPrintable(error.serverName)}": ${quotedPrintable(error.validationError)}`;
    case "lsp-server-start-failed":
      return `LSP server "${quotedPrintable(error.serverName)}" failed to start: ${quotedPrintable(error.reason)}`;
    case "lsp-server-crashed":
      return error.signal
        ? `LSP server "${quotedPrintable(error.serverName)}" crashed with signal ${error.signal}`
        : `LSP server "${quotedPrintable(error.serverName)}" crashed with exit code ${error.exitCode ?? "unknown"}`;
    case "lsp-request-timeout":
      return `LSP server "${quotedPrintable(error.serverName)}" timed out on ${quotedPrintable(error.method)} after ${error.timeoutMs}ms`;
    case "lsp-request-failed":
      return `LSP server "${quotedPrintable(error.serverName)}" ${quotedPrintable(error.method)} failed: ${quotedPrintable(error.error)}`;
    case "plugin-cache-miss":
      if (error.registryReadFailed === true)
        return `Plugin "${quotedPrintable(error.plugin)}" is not loaded: installed_plugins.json could not be read, so its install could not be checked`;
      return `Plugin "${quotedPrintable(error.plugin)}" not cached at ${printableOrEmpty(error.installPath)}`;
    case "plugin-not-installed":
      if (error.installedListHeldNote !== undefined)
        return `Plugin "${quotedPrintable(error.plugin)}" is enabled in project settings, but whether it is installed could not be checked`;
      return `Plugin "${quotedPrintable(error.plugin)}" is enabled in project settings but isn't installed here`;
    case "autoupdate-deferred-entry-helper":
    case "autoupdate-disabled-by-policy":
      return error.message;
    case "autoupdate-blocked-by-pinner": {
      let heldNote = error.heldAt ? ` at ${printableOrEmpty(error.heldAt)}` : "";
      let hasBlockingPinners =
        error.disabledPinners.length > 0
          ? ` (${quotedPrintable(error.disabledPinners.join(", "))} ${error.disabledPinners.length === 1 ? "is" : "are"} disabled)`
          : "";
      return `Autoupdate held${heldNote} \u2014 version constraint from ${quotedPrintable(error.blockedBy.join(", "))}${hasBlockingPinners}`;
    }
    case "generic-error":
      return truncateWithEllipsis(error.error);
  }
  return pluginErrorText(error);
}
//@ chunk-wb51jffc.js:131604-131658 layout
function getErrorGuidanceText(error) {
  let errorGuidance = getErrorGuidance(error);
  return errorGuidance === null ? null : stripInvisibleKeepEmoji(errorGuidance);
}
//@ chunk-wb51jffc.js:131658-138258 fingerprint (2.1.88 match: getErrorGuidance, 0.621)
function getErrorGuidance(error) {
  switch (error.type) {
    case "path-not-found":
      return error.errno
        ? `Claude Code could not check this path (${quotedPrintable(error.errno)}): look for a symlink pointing at itself, a broken network mount, or a permissions problem, then run /reload-plugins`
        : error.plugin !== undefined
          ? "Check that the path in your manifest or marketplace config is correct"
          : marketplaceOf(error.source) === SYNCED
            ? "claude.ai syncs this plugin and its directory is no longer on disk; restart Claude Code to refresh your synced plugins"
            : "Check the plugin path this session was started with";
    case "path-traversal":
      return error.reason
        ? "This path was skipped because it could not be confirmed inside the plugin (or, for a local marketplace, the marketplace). If the message ends with an error code such as EACCES, check that every folder and link in the path exists and is readable. Otherwise, if you maintain the plugin, replace the link with a copy of what it points to, or load the plugin from the folder that holds the real files, and rename anything with a backslash in its name; if you installed it, tell its author"
        : error.component === "mcp-servers" || error.component === "lsp-servers"
          ? 'Server file paths in the manifest or marketplace config must be relative to the plugin folder, with no ".." part. If you installed the plugin, tell its author'
          : 'Paths in plugin.json must not use ".." to reference files outside the plugin directory';
    case "git-auth-failed":
      return error.authType === "ssh"
        ? "Configure SSH keys or use HTTPS URL instead"
        : "Configure credentials or use SSH URL instead";
    case "git-timeout":
    case "network-error":
      return "Check your internet connection and try again";
    case "manifest-parse-error":
      return "Check manifest file syntax in the plugin directory";
    case "manifest-validation-error":
      return error.containmentRefused
        ? "A plugin's manifest is read only when it is confirmed inside the plugin (or, for a local marketplace, the marketplace). If the message ends with an error code such as EACCES, check that every folder and link in the path exists and is readable. Otherwise, if the manifest or a folder it sits in is a link, replace the link with a copy of what it points to and rename anything with a backslash in its name, or tell the plugin's author if you installed it"
        : "Check manifest file follows the required schema";
    case "plugin-not-found":
      if (error.removedFromDirectory) {
        if (error.registryReadFailed === true)
          return `Run /reload-plugins. If it is still not loaded, fix or restore installed_plugins.json in the plugins directory, then run it again${error.installedListHeldNote === undefined ? "" : `. ${error.installedListHeldNote}`}`;
        if (error.directoryRenamedTo?.length)
          return "Uninstall it, then install it under its new name from /plugin \u2192 Discover";
        if (error.directoryNotInstallableReason !== undefined)
          return "It loads again once the listing can be installed. Uninstall it if you no longer need it";
        return error.directoryIdentityChanged
          ? "Uninstall it, then install the new listing if you want it"
          : "Uninstall it. If you still need it, install it from another marketplace you trust";
      }
      return `Plugin may not exist in marketplace "${quotedPrintable(error.marketplace)}"`;
    case "marketplace-not-found": {
      let notFoundMessage = marketplaceNotFoundMessage(error);
      if (notFoundMessage !== undefined) return notFoundMessage;
      return error.registryReadFailed
        ? "Check known_marketplaces.json in the plugins directory, then run /reload-plugins"
        : error.registrationHidden
          ? error.registrationHiddenReason === undefined
            ? "Remove and re-add the marketplace"
            : capitalize(MARKETPLACE_SOURCE_FIX_HINTS[error.registrationHidden])
          : error.availableMarketplaces.length > 0
            ? `Available marketplaces: ${quotedPrintable(error.availableMarketplaces.join(", "))}`
            : "Add the marketplace first using /plugin marketplace add";
    }
    case "mcp-config-invalid":
      return "Check MCP server configuration in .mcp.json or manifest";
    case "hook-load-failed":
      return "Check the plugin's hooks configuration and that its hooks file is readable";
    case "component-load-failed":
      return `Check ${quotedPrintable(error.component)} directory structure and file permissions`;
    case "mcpb-download-failed":
      return "Check your internet connection and URL accessibility";
    case "mcpb-extract-failed":
      return "Verify the MCPB file is valid and not corrupted";
    case "mcpb-invalid-manifest":
      return "Contact the plugin author about the invalid manifest";
    case "marketplace-blocked-by-policy":
      if (pluginBlockSource(error) !== null)
        return "Uninstall the plugins installed from it (/plugin \u2192 Installed, or `claude plugin uninstall <plugin>`), or install them from a marketplace your organization allows";
      if (error.blockedByBlocklist)
        return "This marketplace source is explicitly blocked by your administrator";
      return error.allowedSources.length > 0
        ? `Allowed sources: ${quotedPrintable(error.allowedSources.join(", "))}`
        : "Contact your administrator to configure allowed marketplace sources";
    case "dependency-unsatisfied":
      if (error.reason === "not-enabled")
        return `Enable "${quotedPrintable(error.dependency)}" or ${formatDisableOrUninstall(error)}`;
      return error.sameNameSyncedPlugin !== undefined
        ? `Install "${quotedPrintable(error.dependency)}", which then loads instead of "${quotedPrintable(error.sameNameSyncedPlugin)}", or ${formatDisableOrUninstall(error)}`
        : `Install "${quotedPrintable(error.dependency)}" or ${formatDisableOrUninstall(error)}`;
    case "dependency-version-unsatisfied":
      return `Update "${quotedPrintable(error.dependency)}" to satisfy ${quotedPrintable(error.required)}, or ${formatDisableOrUninstall(error)}`;
    case "lsp-config-invalid":
      return "Check LSP server configuration in the plugin manifest";
    case "lsp-server-start-failed":
    case "lsp-server-crashed":
    case "lsp-request-timeout":
    case "lsp-request-failed":
      return "Check LSP server logs with --debug for details";
    case "plugin-cache-miss": {
      let installedListNote =
        error.installedListHeldNote === undefined ? "" : `. ${error.installedListHeldNote}`;
      if (error.registryReadFailed === true)
        return `Fix or restore installed_plugins.json in the plugins directory, then run /reload-plugins${installedListNote}`;
      return `Run /plugin to refresh the plugin cache${installedListNote}`;
    }
    case "plugin-not-installed": {
      if (error.installedListHeldNote !== undefined) return error.installedListHeldNote;
      let installCommand = claudeCommand("plugin install", error.source, "--scope project");
      return installCommand
        ? `Run \`${installCommand}\` to install it for this project`
        : "Install it at project scope to fix this";
    }
    case "autoupdate-deferred-entry-helper":
    case "autoupdate-disabled-by-policy":
      return null;
    case "autoupdate-blocked-by-pinner": {
      let blockingSource = error.disabledPinners.length > 0 ? error.disabledPinners[0] : error.blockedBy[0];
      return blockingSource
        ? `Update or uninstall "${quotedPrintable(blockingSource)}" to unblock${error.disabledPinners.length > 0 ? " (it is currently disabled)" : ""}`
        : null;
    }
    case "marketplace-load-failed":
      if (error.directoryBlockedBy !== undefined)
        return "Uninstall it (/plugin \u2192 Installed, or `claude plugin uninstall <plugin>`), or install it from a marketplace your organization allows";
      if (isMarketplaceLoadError(error)) return RELOAD_PLUGINS_HINT;
      if (error.nameRefused)
        return marketplaceRemovalAdvice(error.marketplace, {
          declaredInSettings: error.nameRefusedDeclaredInSettings === true,
        });
      return error.reason === "cache-miss"
        ? error.catalogReadFailed
          ? "The cached marketplace catalog could not be read; run /reload-plugins to refresh it"
          : "Run /reload-plugins to refresh the marketplace cache"
        : null;
    case "generic-error":
      return null;
  }
  let _exhaustive = error;
  return null;
}
export { getErrorGuidanceText, formatErrorMessage };
