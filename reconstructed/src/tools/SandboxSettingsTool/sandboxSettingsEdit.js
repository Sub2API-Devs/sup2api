/**
 * tools/SandboxSettingsTool/sandboxSettingsEdit.ts
 *
 * 2.1.316 新增：由模型修改沙箱设置（mode、allowUnsandboxedCommands、excludedCommands）的校验与写入
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ht1p3xhv.js (3)
 * attribution: placement 3
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, _enum, M, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import {
  SandboxManager,
  shouldForceSandboxOn,
  addToExcludedCommands,
} from "../../utils/sandbox/sandbox-adapter.js";
import { drainSettingsWrites } from "../../utils/settings/settings.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";

//@ chunk-ht1p3xhv.js:5462-5820 placement
var SandboxSettingsEditSchema = DoctorLazy(() =>
  zodStrictObject({
    mode: _enum(["auto-allow", "regular", "disabled"]).optional(),
    allowUnsandboxedCommands: M().optional(),
    excludeCommand: string().trim().min(1).max(1000).optional(),
  }).refine(
    (a) => a.mode !== undefined || a.allowUnsandboxedCommands !== undefined || a.excludeCommand !== undefined,
    {
      error: "Nothing to change: none of mode, allowUnsandboxedCommands or excludeCommand was given.",
    },
  ),
);
//@ chunk-ht1p3xhv.js:5820-5987 placement
async function applySandboxSettingsEditLogged(a) {
  let n = await applySandboxSettingsEdit(a);
  if (!n.ok) {
    if (n.failed) logFeatureBad("sandbox_set_settings", n.code);
    else logFeatureSad("sandbox_set_settings", n.code);
    return {
      ok: false,
      error: n.error,
    };
  }
  return n;
}
//@ chunk-ht1p3xhv.js:5987-9065 placement
/**
 * 校验并应用沙箱设置修改（平台不支持、被更高优先级锁定、依赖缺失、强制开启等）。
 */
async function applySandboxSettingsEdit(a) {
  let n = SandboxSettingsEditSchema().safeParse(a);
  if (!n.success) {
    let t = n.error.issues[0];
    return {
      ok: false,
      code: "not_an_edit",
      error: t
        ? `Not a sandbox settings edit (${t.path.map(String).join(".") || "edit"}: ${t.message}).`
        : "Not a sandbox settings edit.",
    };
  }
  let e = n.data;
  if (!SandboxManager.isSupportedPlatform() || !SandboxManager.isPlatformInEnabledList())
    return {
      ok: false,
      code: "unsupported_platform",
      error: "Sandboxing is not available on this platform.",
    };
  if (SandboxManager.areSandboxSettingsLockedByPolicy())
    return {
      ok: false,
      code: "locked",
      error: "Sandbox settings are set by a higher-priority configuration and cannot be changed here.",
    };
  if (e.mode !== undefined && e.mode !== "disabled") {
    let t = await SandboxManager.checkDependenciesAsync();
    if (t.errors.length > 0)
      return {
        ok: false,
        code: "missing_dependencies",
        error: `The sandbox cannot run on this machine yet: ${t.errors.join("; ")}`,
      };
  }
  let d = SandboxManager.isAutoAllowSupported();
  if (e.mode === "auto-allow" && !d)
    return {
      ok: false,
      code: "auto_allow_unavailable",
      error: "Auto-allow is not available on this platform.",
    };
  if (e.mode === "disabled" && shouldForceSandboxOn())
    return {
      ok: false,
      code: "forced_on",
      error: "Sandboxing is required here and cannot be turned off.",
    };
  if (
    e.allowUnsandboxedCommands !== undefined &&
    (SandboxManager.areUnsandboxedCommandsForbiddenByPolicy() ||
      SandboxManager.isUnsandboxedFallbackClosedByTrustedTier())
  )
    return {
      ok: false,
      code: "fallback_forbidden",
      error: "The unsandboxed fallback is set by a higher-priority configuration and cannot be changed here.",
    };
  let s = "localSettings";
  if (e.mode !== undefined)
    switch (e.mode) {
      case "auto-allow":
        await SandboxManager.setSandboxSettings({
          enabled: true,
          autoAllowBashIfSandboxed: true,
        });
        break;
      case "regular":
        await SandboxManager.setSandboxSettings({
          enabled: true,
          ...(d && {
            autoAllowBashIfSandboxed: false,
          }),
        });
        break;
      case "disabled":
        await SandboxManager.setSandboxSettings({
          enabled: false,
          ...(d && {
            autoAllowBashIfSandboxed: false,
          }),
        });
        break;
    }
  if (e.allowUnsandboxedCommands !== undefined)
    await SandboxManager.setSandboxSettings({
      allowUnsandboxedCommands: e.allowUnsandboxedCommands,
    });
  if (e.excludeCommand !== undefined) {
    let command = e.excludeCommand.replace(/^["']|["']$/g, "").trim();
    if (command === "")
      return {
        ok: false,
        code: "empty_pattern",
        error: "The command pattern is empty.",
      };
    let r = addToExcludedCommands(command);
    if (r.outcome === "refused")
      return {
        ok: false,
        code: "user_settings_disabled",
        error:
          "This session's sandbox policy limits exclusions to trusted settings (managed policy, a --settings file, user settings), and user settings are turned off here (--setting-sources), so there is no settings file where the exclusion would take effect. Re-enable user settings, or add it to the managed or --settings configuration.",
      };
    s = r.settingsSource;
    await drainSettingsWrites();
  }
  invalidateCommandNames();
  if (!(
    (e.mode === undefined ||
      (e.mode === "disabled"
        ? !SandboxManager.isSandboxEnabledInSettings()
        : SandboxManager.isSandboxEnabledInSettings() &&
          (e.mode === "auto-allow") === SandboxManager.isAutoAllowBashIfSandboxedEnabled())) &&
    (e.allowUnsandboxedCommands === undefined ||
      SandboxManager.areUnsandboxedCommandsAllowed() === e.allowUnsandboxedCommands) &&
    (e.excludeCommand === undefined ||
      SandboxManager.getExcludedCommands().includes(e.excludeCommand.replace(/^["']|["']$/g, "").trim()))
  ))
    return {
      ok: false,
      failed: true,
      code: "write_not_landed",
      error: `The settings file could not be updated. Check that ${s === "userSettings" ? "~/.claude/settings.json" : "the project's .claude/settings.local.json"} can be written.`,
    };
  return {
    ok: true,
    written: e,
  };
}
