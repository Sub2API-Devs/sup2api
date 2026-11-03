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
function stripSandboxInstallHint(n) {
  return n.replace(
    "Run /sandbox install, or see https://code.claude.com/docs/en/sandboxing.",
    "See https://code.claude.com/docs/en/sandboxing.",
  );
}
//@ chunk-ygsnywrv.js:5567-7028 placement
async function getSandboxStatus() {
  invalidateCommandNames();
  let platform = getPlatform();
  let a = SandboxManager.isSupportedPlatform();
  let b = SandboxManager.isPlatformInEnabledList();
  let o = a && b;
  let t = o ? undefined : !a ? (platform === "wsl" ? "wsl1" : "platform") : "excluded_platform";
  let d = o
    ? await SandboxManager.checkDependenciesAsync()
    : {
        errors: [],
        warnings: [],
      };
  let l = SandboxManager.isSandboxEnabledInSettings();
  let r = SandboxManager.isSandboxingEnabled();
  let sandboxUnavailableReason = SandboxManager.getSandboxUnavailableReason();
  let c = SandboxManager.areSandboxSettingsLockedByPolicy();
  let overridesLocked =
    c ||
    SandboxManager.areUnsandboxedCommandsForbiddenByPolicy() ||
    SandboxManager.isUnsandboxedFallbackClosedByTrustedTier();
  let g = SandboxManager.isAutoAllowBashIfSandboxedEnabled();
  let mode = !l ? "disabled" : g ? "auto-allow" : "regular";
  let sandbox = getSettings_DEPRECATED()?.sandbox;
  let configuredNetworkAllowances = SandboxManager.getConfiguredNetworkAllowances();
  let configuredFilesystemGrants = SandboxManager.getConfiguredFilesystemGrants();
  return {
    supported: o,
    ...(t !== undefined && {
      unsupported_reason: t,
    }),
    locked: c,
    overrides_locked: overridesLocked,
    enabled: r,
    enabled_in_settings: l,
    ...(sandboxUnavailableReason !== undefined && {
      unavailable_reason: stripSandboxInstallHint(sandboxUnavailableReason),
    }),
    mode,
    auto_allow_available: SandboxManager.isAutoAllowSupported(),
    no_sandbox_allowed: !shouldForceSandboxOn(),
    unsandboxed_fallback: SandboxManager.areUnsandboxedCommandsAllowed(),
    dependencies: {
      errors: d.errors.map(stripSandboxInstallHint),
      warnings: d.warnings.map(stripSandboxInstallHint),
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
      ignored_glob_patterns: r ? SandboxManager.getLinuxGlobPatternWarnings() : [],
    },
  };
}
