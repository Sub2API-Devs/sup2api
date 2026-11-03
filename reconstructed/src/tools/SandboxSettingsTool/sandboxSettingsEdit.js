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
import { zodStrictObject, U, M, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import {
  SandboxManager,
  shouldForceSandboxOn,
  addToExcludedCommands,
} from "../../utils/sandbox/sandbox-adapter.js";
import { drainSettingsWrites } from "../../utils/settings/settings.js";
import { or } from "../../utils/settings/commandSyncNames.js";

//@ chunk-ht1p3xhv.js:5462-5820 placement
var SandboxSettingsEditSchema = DoctorLazy(() =>
  zodStrictObject({
    mode: U(["auto-allow", "regular", "disabled"]).optional(),
    allowUnsandboxedCommands: M().optional(),
    excludeCommand: o().trim().min(1).max(1000).optional(),
  }).refine(
    (a) => a.mode !== void 0 || a.allowUnsandboxedCommands !== void 0 || a.excludeCommand !== void 0,
    { error: "Nothing to change: none of mode, allowUnsandboxedCommands or excludeCommand was given." },
  ),
);
//@ chunk-ht1p3xhv.js:5820-5987 placement
async function applySandboxSettingsEditLogged(a) {
  let n = await applySandboxSettingsEdit(a);
  if (!n.ok) {
    if (n.failed) logFeatureBad("sandbox_set_settings", n.code);
    else logFeatureSad("sandbox_set_settings", n.code);
    return { ok: !1, error: n.error };
  }
  return n;
}
/**
 * 校验并应用沙箱设置修改（平台不支持、被更高优先级锁定、依赖缺失、强制开启等）。
 */
//@ chunk-ht1p3xhv.js:5987-9065 placement
async function applySandboxSettingsEdit(a) {
  let safeParse = SandboxSettingsEditSchema().safeParse(a);
  if (!safeParse.success) {
    let t = safeParse.error.issues[0];
    return {
      ok: !1,
      code: "not_an_edit",
      error: t
        ? `Not a sandbox settings edit (${t.path.map(String).join(".") || "edit"}: ${t.message}).`
        : "Not a sandbox settings edit.",
    };
  }
  let e = safeParse.data;
  if (!SandboxManager.isSupportedPlatform() || !SandboxManager.isPlatformInEnabledList())
    return { ok: !1, code: "unsupported_platform", error: "Sandboxing is not available on this platform." };
  if (SandboxManager.areSandboxSettingsLockedByPolicy())
    return {
      ok: !1,
      code: "locked",
      error: "Sandbox settings are set by a higher-priority configuration and cannot be changed here.",
    };
  if (e.mode !== void 0 && e.mode !== "disabled") {
    let checkDependenciesAsync = await SandboxManager.checkDependenciesAsync();
    if (checkDependenciesAsync.errors.length > 0)
      return {
        ok: !1,
        code: "missing_dependencies",
        error: `The sandbox cannot run on this machine yet: ${checkDependenciesAsync.errors.join("; ")}`,
      };
  }
  let isAutoAllowSupported = SandboxManager.isAutoAllowSupported();
  if (e.mode === "auto-allow" && !isAutoAllowSupported)
    return { ok: !1, code: "auto_allow_unavailable", error: "Auto-allow is not available on this platform." };
  if (e.mode === "disabled" && shouldForceSandboxOn())
    return { ok: !1, code: "forced_on", error: "Sandboxing is required here and cannot be turned off." };
  if (
    e.allowUnsandboxedCommands !== void 0 &&
    (SandboxManager.areUnsandboxedCommandsForbiddenByPolicy() ||
      SandboxManager.isUnsandboxedFallbackClosedByTrustedTier())
  )
    return {
      ok: !1,
      code: "fallback_forbidden",
      error: "The unsandboxed fallback is set by a higher-priority configuration and cannot be changed here.",
    };
  let s = "localSettings";
  if (e.mode !== void 0)
    switch (e.mode) {
      case "auto-allow":
        await SandboxManager.setSandboxSettings({ enabled: !0, autoAllowBashIfSandboxed: !0 });
        break;
      case "regular":
        await SandboxManager.setSandboxSettings({
          enabled: !0,
          ...(isAutoAllowSupported && { autoAllowBashIfSandboxed: !1 }),
        });
        break;
      case "disabled":
        await SandboxManager.setSandboxSettings({
          enabled: !1,
          ...(isAutoAllowSupported && { autoAllowBashIfSandboxed: !1 }),
        });
        break;
    }
  if (e.allowUnsandboxedCommands !== void 0)
    await SandboxManager.setSandboxSettings({ allowUnsandboxedCommands: e.allowUnsandboxedCommands });
  if (e.excludeCommand !== void 0) {
    let trimmed = e.excludeCommand.replace(/^["']|["']$/g, "").trim();
    if (trimmed === "") return { ok: !1, code: "empty_pattern", error: "The command pattern is empty." };
    let r = addToExcludedCommands(trimmed);
    if (r.outcome === "refused")
      return {
        ok: !1,
        code: "user_settings_disabled",
        error:
          "This session's sandbox policy limits exclusions to trusted settings (managed policy, a --settings file, user settings), and user settings are turned off here (--setting-sources), so there is no settings file where the exclusion would take effect. Re-enable user settings, or add it to the managed or --settings configuration.",
      };
    ((s = r.settingsSource), await drainSettingsWrites());
  }
  if (
    (or(),
    !(
      (e.mode === void 0 ||
        (e.mode === "disabled"
          ? !SandboxManager.isSandboxEnabledInSettings()
          : SandboxManager.isSandboxEnabledInSettings() &&
            (e.mode === "auto-allow") === SandboxManager.isAutoAllowBashIfSandboxedEnabled())) &&
      (e.allowUnsandboxedCommands === void 0 ||
        SandboxManager.areUnsandboxedCommandsAllowed() === e.allowUnsandboxedCommands) &&
      (e.excludeCommand === void 0 ||
        SandboxManager.getExcludedCommands().includes(e.excludeCommand.replace(/^["']|["']$/g, "").trim()))
    ))
  )
    return {
      ok: !1,
      failed: !0,
      code: "write_not_landed",
      error: `The settings file could not be updated. Check that ${s === "userSettings" ? "~/.claude/settings.json" : "the project's .claude/settings.local.json"} can be written.`,
    };
  return { ok: !0, written: e };
}
