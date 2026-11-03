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
import { or } from "../../utils/settings/commandSyncNames.js";
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
  or();
  let n = getPlatform(),
    isSupportedPlatform = SandboxManager.isSupportedPlatform(),
    isPlatformInEnabledList = SandboxManager.isPlatformInEnabledList(),
    o = isSupportedPlatform && isPlatformInEnabledList,
    t = o ? void 0 : !isSupportedPlatform ? (n === "wsl" ? "wsl1" : "platform") : "excluded_platform",
    d = o ? await SandboxManager.checkDependenciesAsync() : { errors: [], warnings: [] },
    isSandboxEnabledInSettings = SandboxManager.isSandboxEnabledInSettings(),
    isSandboxingEnabled = SandboxManager.isSandboxingEnabled(),
    sandboxUnavailableReason = SandboxManager.getSandboxUnavailableReason(),
    areSandboxSettingsLockedByPolicy = SandboxManager.areSandboxSettingsLockedByPolicy(),
    p =
      areSandboxSettingsLockedByPolicy ||
      SandboxManager.areUnsandboxedCommandsForbiddenByPolicy() ||
      SandboxManager.isUnsandboxedFallbackClosedByTrustedTier(),
    isAutoAllowBashIfSandboxedEnabled = SandboxManager.isAutoAllowBashIfSandboxedEnabled(),
    w = !isSandboxEnabledInSettings
      ? "disabled"
      : isAutoAllowBashIfSandboxedEnabled
        ? "auto-allow"
        : "regular",
    e = getSettings_DEPRECATED()?.sandbox,
    configuredNetworkAllowances = SandboxManager.getConfiguredNetworkAllowances(),
    configuredFilesystemGrants = SandboxManager.getConfiguredFilesystemGrants();
  return {
    supported: o,
    ...(t !== void 0 && { unsupported_reason: t }),
    locked: areSandboxSettingsLockedByPolicy,
    overrides_locked: p,
    enabled: isSandboxingEnabled,
    enabled_in_settings: isSandboxEnabledInSettings,
    ...(sandboxUnavailableReason !== void 0 && {
      unavailable_reason: stripSandboxInstallHint(sandboxUnavailableReason),
    }),
    mode: w,
    auto_allow_available: SandboxManager.isAutoAllowSupported(),
    no_sandbox_allowed: !shouldForceSandboxOn(),
    unsandboxed_fallback: SandboxManager.areUnsandboxedCommandsAllowed(),
    dependencies: {
      errors: d.errors.map(stripSandboxInstallHint),
      warnings: d.warnings.map(stripSandboxInstallHint),
    },
    excluded_commands: SandboxManager.getExcludedCommands(),
    restrictions: {
      fs_deny_read: e?.filesystem?.denyRead ?? [],
      fs_allow_read: configuredFilesystemGrants.allowRead,
      fs_allow_write: configuredFilesystemGrants.allowWrite,
      fs_deny_write: e?.filesystem?.denyWrite ?? [],
      network_allowed_domains: e?.network?.allowedDomains ?? [],
      network_denied_domains: e?.network?.deniedDomains ?? [],
      network_managed: shouldAllowManagedSandboxDomainsOnly(),
      unix_sockets: configuredNetworkAllowances.allowUnixSockets ?? [],
      allow_all_unix_sockets: configuredNetworkAllowances.allowAllUnixSockets === !0,
      ignored_glob_patterns: isSandboxingEnabled ? SandboxManager.getLinuxGlobPatternWarnings() : [],
    },
  };
}
