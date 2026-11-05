/**
 * types/plugin.ts
 *
 * 插件错误类型到用户可读消息的映射（getPluginErrorMessage）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/types/plugin.ts
 * pieces: chunk-5s0qaz1x.js (3)
 * attribution: placement 2, fingerprint 1
 */
import {
  quotedPrintable,
  truncateWithEllipsis,
  printableOrEmpty,
  printableText,
} from "../utils/printableName.js";
import { stripInvisibleKeepEmoji } from "../utils/settings/marketplaceSettingsAliases.js";
import {
  marketplaceListingChangedMessage,
  MARKETPLACE_SOURCE_FIX_HINTS,
  directoryBlockedMessage,
  isMarketplaceLoadError,
  reservedMarketplaceNameError,
  pluginBlockSource,
} from "../utils/plugins/marketplaceNames.js";
import { capitalize } from "../utils/stringUtils.js";
import { getPluginNameFromError } from "../commands/plugin/PluginSettings.js";
import { claudeCommand } from "../utils/worktreeResumeHint.js";

//@ chunk-5s0qaz1x.js:14351-14492 placement
/**
 * 来自 claude.ai 账号的插件只满足其他 claude.ai 插件依赖时的说明。
 */
function cloudOnlyDependencyMessage(sameNameSyncedPlugin) {
  return `"${quotedPrintable(sameNameSyncedPlugin)}" is loaded from your claude.ai account but meets a marketplace dependency only for other claude.ai plugins`;
}
//@ chunk-5s0qaz1x.js:14492-14524 placement
function pluginErrorText(error) {
  return stripInvisibleKeepEmoji(getPluginErrorMessage(error));
}
//@ chunk-5s0qaz1x.js:14524-20195 fingerprint (2.1.88 match: getPluginErrorMessage, 0.712)
function getPluginErrorMessage(error) {
  switch (error.type) {
    case "generic-error":
      return truncateWithEllipsis(error.error);
    case "path-not-found":
      return error.plugin === undefined
        ? `Path not found: ${printableOrEmpty(error.path)}${error.errno ? ` (${quotedPrintable(error.errno)})` : ""}`
        : `Path not found: ${printableOrEmpty(error.path)} (${quotedPrintable(error.component)}${error.errno ? `, ${quotedPrintable(error.errno)}` : ""})`;
    case "path-traversal":
      return !error.reason && (error.component === "mcp-servers" || error.component === "lsp-servers")
        ? `Server file not read: ${printableOrEmpty(error.path)} is absolute or has a ".." part (${quotedPrintable(error.component)})`
        : `Path escapes plugin directory: ${printableOrEmpty(error.path)} (${quotedPrintable(error.component)})${error.reason ? ` \u2014 ${printableOrEmpty(error.reason)}` : ""}`;
    case "git-auth-failed":
      return `Git authentication failed (${quotedPrintable(error.authType)}): ${printableOrEmpty(error.gitUrl)}`;
    case "git-timeout":
      return `Git ${quotedPrintable(error.operation)} timeout: ${printableOrEmpty(error.gitUrl)}`;
    case "network-error":
      return `Network error: ${printableOrEmpty(error.url)}${error.details ? ` - ${quotedPrintable(error.details)}` : ""}`;
    case "manifest-parse-error":
      return `Manifest parse error: ${quotedPrintable(error.parseError, 500)} (in ${printableOrEmpty(error.manifestPath)})`;
    case "manifest-validation-error":
      return error.containmentRefused
        ? `Plugin not loaded: its manifest ${printableOrEmpty(error.manifestPath)} was not read, because ${quotedPrintable(error.validationErrors.join(", "), 1000)}`
        : `Manifest validation failed: ${quotedPrintable(error.validationErrors.join(", "), 1000)} (in ${printableOrEmpty(error.manifestPath)})`;
    case "plugin-not-found":
      if (error.removedFromDirectory)
        return marketplaceListingChangedMessage(
          error.pluginId,
          error.directoryRenamedTo,
          error.directoryIdentityChanged === true,
          error.directoryNotInstallableReason,
          error.registryReadFailed === true,
        );
      return `Plugin ${quotedPrintable(error.pluginId)} not found in marketplace ${quotedPrintable(error.marketplace)}`;
    case "marketplace-not-found":
      if (error.registrationHidden !== undefined) {
        let intro = `Marketplace ${quotedPrintable(error.marketplace)} is added but ignored`;
        return error.registrationHiddenReason === undefined
          ? `${intro} (see the debug log)`
          : `${intro}. ${capitalize(printableText(error.registrationHiddenReason))}. ${capitalize(MARKETPLACE_SOURCE_FIX_HINTS[error.registrationHidden])}.`;
      }
      return `Marketplace ${quotedPrintable(error.marketplace)} not found`;
    case "marketplace-load-failed":
      if (error.directoryBlockedBy !== undefined)
        return directoryBlockedMessage(
          getPluginNameFromError(error) ?? error.source,
          error.directoryBlockedBy,
        );
      if (isMarketplaceLoadError(error))
        return `Plugin "${quotedPrintable(getPluginNameFromError(error) ?? error.source)}" is not loaded: the Anthropic Directory's catalog is not on this machine yet.`;
      if (error.nameRefused) return reservedMarketplaceNameError(error.marketplace);
      return `Marketplace ${quotedPrintable(error.marketplace)} failed to load: ${quotedPrintable(error.reason)}`;
    case "mcp-config-invalid":
      return `MCP server ${quotedPrintable(error.serverName)} invalid: ${quotedPrintable(error.validationError)}`;
    case "hook-load-failed":
      return `Hook load failed: ${quotedPrintable(error.reason)}`;
    case "component-load-failed":
      return `${quotedPrintable(error.component)} load failed from ${printableOrEmpty(error.path)}: ${quotedPrintable(error.reason)}`;
    case "mcpb-download-failed":
      return `Failed to download MCPB from ${printableOrEmpty(error.url)}: ${quotedPrintable(error.reason)}`;
    case "mcpb-extract-failed":
      return `Failed to extract MCPB ${printableOrEmpty(error.mcpbPath)}: ${quotedPrintable(error.reason)}`;
    case "mcpb-invalid-manifest":
      return `MCPB manifest invalid at ${printableOrEmpty(error.mcpbPath)}: ${quotedPrintable(error.validationError)}`;
    case "lsp-config-invalid":
      return `Plugin "${quotedPrintable(error.plugin)}" has invalid LSP server config for "${quotedPrintable(error.serverName)}": ${quotedPrintable(error.validationError)}`;
    case "lsp-server-start-failed":
      return `Plugin "${quotedPrintable(error.plugin)}" failed to start LSP server "${quotedPrintable(error.serverName)}": ${quotedPrintable(error.reason)}`;
    case "lsp-server-crashed":
      if (error.signal)
        return `Plugin "${quotedPrintable(error.plugin)}" LSP server "${quotedPrintable(error.serverName)}" crashed with signal ${error.signal}`;
      return `Plugin "${quotedPrintable(error.plugin)}" LSP server "${quotedPrintable(error.serverName)}" crashed with exit code ${error.exitCode ?? "unknown"}`;
    case "lsp-request-timeout":
      return `Plugin "${quotedPrintable(error.plugin)}" LSP server "${quotedPrintable(error.serverName)}" timed out on ${quotedPrintable(error.method)} request after ${error.timeoutMs}ms`;
    case "lsp-request-failed":
      return `Plugin "${quotedPrintable(error.plugin)}" LSP server "${quotedPrintable(error.serverName)}" ${quotedPrintable(error.method)} request failed: ${quotedPrintable(error.error)}`;
    case "marketplace-blocked-by-policy": {
      let blockSource = pluginBlockSource(error);
      if (blockSource !== null) return directoryBlockedMessage(error.plugin, blockSource);
      if (error.blockedByBlocklist)
        return `Marketplace '${quotedPrintable(error.marketplace)}' is blocked by enterprise policy`;
      return `Marketplace '${quotedPrintable(error.marketplace)}' is not in the allowed marketplace list`;
    }
    case "dependency-unsatisfied": {
      let installCommand = claudeCommand("plugin install", error.dependency);
      let reasonText =
        error.reason === "not-enabled"
          ? "disabled \u2014 enable it or remove the dependency"
          : `not installed \u2014 ${error.sameNameSyncedPlugin === undefined ? "" : `${cloudOnlyDependencyMessage(error.sameNameSyncedPlugin)}; `}${installCommand ? `run \`${installCommand}\`, or ` : ""}check that its marketplace is added`;
      return `Dependency "${quotedPrintable(error.dependency)}" is ${reasonText}`;
    }
    case "dependency-version-unsatisfied":
      return `Requires "${quotedPrintable(error.dependency)}" ${quotedPrintable(error.required)}, installed ${quotedPrintable(error.installed ?? "version unknown")}`;
    case "plugin-cache-miss":
      if (error.registryReadFailed === true)
        return `Plugin "${quotedPrintable(error.plugin)}" is not loaded: installed_plugins.json could not be read, so its install could not be checked \u2014 fix or restore installed_plugins.json in the plugins directory, then run /reload-plugins${error.installedListHeldNote === undefined ? "" : `. ${error.installedListHeldNote}`}`;
      return `Plugin "${quotedPrintable(error.plugin)}" not cached at ${printableOrEmpty(error.installPath)} \u2014 run /plugin to refresh${error.installedListHeldNote === undefined ? "" : `. ${error.installedListHeldNote}`}`;
    case "plugin-not-installed": {
      let installCommand = claudeCommand("plugin install", error.source, "--scope project");
      if (error.installedListHeldNote !== undefined)
        return `Plugin "${quotedPrintable(error.plugin)}" is enabled in project settings, but whether it is installed could not be checked. ${error.installedListHeldNote}`;
      return `Plugin "${quotedPrintable(error.plugin)}" is enabled in project settings but isn't installed${installCommand ? ` \u2014 run \`${installCommand}\`` : " \u2014 install it at project scope (from /plugin or claude plugin install)"}`;
    }
    case "autoupdate-deferred-entry-helper":
    case "autoupdate-disabled-by-policy":
      return error.message;
    case "autoupdate-blocked-by-pinner": {
      let heldSuffix = error.heldAt ? ` at ${printableOrEmpty(error.heldAt)}` : "";
      let pinnersText = quotedPrintable(error.blockedBy.join(", "));
      let disabledNote =
        error.disabledPinners.length > 0
          ? ` (note: ${quotedPrintable(error.disabledPinners.join(", "))} ${error.disabledPinners.length === 1 ? "is" : "are"} currently disabled)`
          : "";
      return `Autoupdate held "${quotedPrintable(error.plugin)}"${heldSuffix} \u2014 version constraint from ${pinnersText}${disabledNote}`;
    }
  }
}
export { pluginErrorText, cloudOnlyDependencyMessage };
