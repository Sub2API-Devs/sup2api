/**
 * commands/sandbox-toggle/sandboxStatus.ts
 *
 * 2.1.316 新增：/sandbox 状态汇总（平台、依赖、模式）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ygsnywrv.js (2)
 * attribution: placement 2
 */
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import { getPlatform } from "../../utils/platform.js";
import {
  SandboxManager,
  shouldForceSandboxOn,
  shouldAllowManagedSandboxDomainsOnly,
} from "../../utils/sandbox/sandbox-adapter.js";
import { getSettings_DEPRECATED } from "../../utils/settings/settings.js";

//@ chunk-ygsnywrv.js:5410-5567 placement
function stripSandboxInstallHint(message) {
  return message.replace(
    "Run /sandbox install, or see https://code.claude.com/docs/en/sandboxing.",
    "See https://code.claude.com/docs/en/sandboxing.",
  );
}
//@ chunk-ygsnywrv.js:5567-7028 placement
async function getSandboxStatus() {
  invalidateCommandNames();
  let platform = getPlatform();
  let isSupported = SandboxManager.isSupportedPlatform();
  let isListedPlatform = SandboxManager.isPlatformInEnabledList();
  let isAvailable = isSupported && isListedPlatform;
  let unsupportedReason = isAvailable
    ? undefined
    : !isSupported
      ? platform === "wsl"
        ? "wsl1"
        : "platform"
      : "excluded_platform";
  let deps = isAvailable
    ? await SandboxManager.checkDependenciesAsync()
    : {
        errors: [],
        warnings: [],
      };
  let enabledInSettings = SandboxManager.isSandboxEnabledInSettings();
  let enabled = SandboxManager.isSandboxingEnabled();
  let message = SandboxManager.getSandboxUnavailableReason();
  let policyLocked = SandboxManager.areSandboxSettingsLockedByPolicy();
  let overridesLocked =
    policyLocked ||
    SandboxManager.areUnsandboxedCommandsForbiddenByPolicy() ||
    SandboxManager.isUnsandboxedFallbackClosedByTrustedTier();
  let autoAllow = SandboxManager.isAutoAllowBashIfSandboxedEnabled();
  let mode = !enabledInSettings ? "disabled" : autoAllow ? "auto-allow" : "regular";
  let sandbox = getSettings_DEPRECATED()?.sandbox;
  let configuredNetworkAllowances = SandboxManager.getConfiguredNetworkAllowances();
  let configuredFilesystemGrants = SandboxManager.getConfiguredFilesystemGrants();
  return {
    supported: isAvailable,
    ...(unsupportedReason !== undefined && {
      unsupported_reason: unsupportedReason,
    }),
    locked: policyLocked,
    overrides_locked: overridesLocked,
    enabled,
    enabled_in_settings: enabledInSettings,
    ...(message !== undefined && {
      unavailable_reason: stripSandboxInstallHint(message),
    }),
    mode,
    auto_allow_available: SandboxManager.isAutoAllowSupported(),
    no_sandbox_allowed: !shouldForceSandboxOn(),
    unsandboxed_fallback: SandboxManager.areUnsandboxedCommandsAllowed(),
    dependencies: {
      errors: deps.errors.map(stripSandboxInstallHint),
      warnings: deps.warnings.map(stripSandboxInstallHint),
    },
    excluded_commands: SandboxManager.getExcludedCommands(),
    restrictions: {
      fs_deny_read: sandbox?.filesystem?.denyRead ?? [],
      fs_allow_read: configuredFilesystemGrants.allowRead,
      fs_allow_write: configuredFilesystemGrants.allowWrite,
      fs_deny_write: sandbox?.filesystem?.denyWrite ?? [],
      network_allowed_domains: sandbox?.network?.allowedDomains ?? [],
      network_denied_domains: sandbox?.network?.deniedDomains ?? [],
      network_managed: shouldAllowManagedSandboxDomainsOnly(),
      unix_sockets: configuredNetworkAllowances.allowUnixSockets ?? [],
      allow_all_unix_sockets: configuredNetworkAllowances.allowAllUnixSockets === true,
      ignored_glob_patterns: enabled ? SandboxManager.getLinuxGlobPatternWarnings() : [],
    },
  };
}
export { getSandboxStatus };
