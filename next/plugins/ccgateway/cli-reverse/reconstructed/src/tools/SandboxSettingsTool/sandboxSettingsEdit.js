/**
 * tools/SandboxSettingsTool/sandboxSettingsEdit.ts
 *
 * 2.1.316 新增：由模型修改沙箱设置（mode、allowUnsandboxedCommands、excludedCommands）的校验与写入
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-j4nstx0a.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  _enum,
  booleanSchema,
  stringSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import {
  SandboxManager,
  shouldForceSandboxOn,
  addToExcludedCommands,
} from "../../utils/sandbox/sandbox-adapter.js";
import { drainSettingsWrites } from "../../utils/settings/settings.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";

//@ chunk-j4nstx0a.js:5854-6212 placement
var SandboxSettingsEditSchema = DoctorLazy(() =>
  zodStrictObject({
    mode: _enum(["auto-allow", "regular", "disabled"]).optional(),
    allowUnsandboxedCommands: booleanSchema().optional(),
    excludeCommand: stringSchema().trim().min(1).max(1000).optional(),
  }).refine(
    (edit) =>
      edit.mode !== undefined ||
      edit.allowUnsandboxedCommands !== undefined ||
      edit.excludeCommand !== undefined,
    {
      error: "Nothing to change: none of mode, allowUnsandboxedCommands or excludeCommand was given.",
    },
  ),
);
//@ chunk-j4nstx0a.js:6212-6379 placement
async function applySandboxSettingsEditLogged(edit) {
  let result = await applySandboxSettingsEdit(edit);
  if (!result.ok) {
    if (result.failed) logFeatureBad("sandbox_set_settings", result.code);
    else logFeatureSad("sandbox_set_settings", result.code);
    return {
      ok: false,
      error: result.error,
    };
  }
  return result;
}
//@ chunk-j4nstx0a.js:6379-9457 placement
/**
 * 校验并应用沙箱设置修改（平台不支持、被更高优先级锁定、依赖缺失、强制开启等）。
 */
async function applySandboxSettingsEdit(edit) {
  let parsed = SandboxSettingsEditSchema().safeParse(edit);
  if (!parsed.success) {
    let issue = parsed.error.issues[0];
    return {
      ok: false,
      code: "not_an_edit",
      error: issue
        ? `Not a sandbox settings edit (${issue.path.map(String).join(".") || "edit"}: ${issue.message}).`
        : "Not a sandbox settings edit.",
    };
  }
  let input = parsed.data;
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
  if (input.mode !== undefined && input.mode !== "disabled") {
    let dependencies = await SandboxManager.checkDependenciesAsync();
    if (dependencies.errors.length > 0)
      return {
        ok: false,
        code: "missing_dependencies",
        error: `The sandbox cannot run on this machine yet: ${dependencies.errors.join("; ")}`,
      };
  }
  let autoAllowSupported = SandboxManager.isAutoAllowSupported();
  if (input.mode === "auto-allow" && !autoAllowSupported)
    return {
      ok: false,
      code: "auto_allow_unavailable",
      error: "Auto-allow is not available on this platform.",
    };
  if (input.mode === "disabled" && shouldForceSandboxOn())
    return {
      ok: false,
      code: "forced_on",
      error: "Sandboxing is required here and cannot be turned off.",
    };
  if (
    input.allowUnsandboxedCommands !== undefined &&
    (SandboxManager.areUnsandboxedCommandsForbiddenByPolicy() ||
      SandboxManager.isUnsandboxedFallbackClosedByTrustedTier())
  )
    return {
      ok: false,
      code: "fallback_forbidden",
      error: "The unsandboxed fallback is set by a higher-priority configuration and cannot be changed here.",
    };
  let settingsSource = "localSettings";
  if (input.mode !== undefined)
    switch (input.mode) {
      case "auto-allow":
        await SandboxManager.setSandboxSettings({
          enabled: true,
          autoAllowBashIfSandboxed: true,
        });
        break;
      case "regular":
        await SandboxManager.setSandboxSettings({
          enabled: true,
          ...(autoAllowSupported && {
            autoAllowBashIfSandboxed: false,
          }),
        });
        break;
      case "disabled":
        await SandboxManager.setSandboxSettings({
          enabled: false,
          ...(autoAllowSupported && {
            autoAllowBashIfSandboxed: false,
          }),
        });
        break;
    }
  if (input.allowUnsandboxedCommands !== undefined)
    await SandboxManager.setSandboxSettings({
      allowUnsandboxedCommands: input.allowUnsandboxedCommands,
    });
  if (input.excludeCommand !== undefined) {
    let command = input.excludeCommand.replace(/^["']|["']$/g, "").trim();
    if (command === "")
      return {
        ok: false,
        code: "empty_pattern",
        error: "The command pattern is empty.",
      };
    let excludeResult = addToExcludedCommands(command);
    if (excludeResult.outcome === "refused")
      return {
        ok: false,
        code: "user_settings_disabled",
        error:
          "This session's sandbox policy limits exclusions to trusted settings (managed policy, a --settings file, user settings), and user settings are turned off here (--setting-sources), so there is no settings file where the exclusion would take effect. Re-enable user settings, or add it to the managed or --settings configuration.",
      };
    settingsSource = excludeResult.settingsSource;
    await drainSettingsWrites();
  }
  invalidateCommandNames();
  if (!(
    (input.mode === undefined ||
      (input.mode === "disabled"
        ? !SandboxManager.isSandboxEnabledInSettings()
        : SandboxManager.isSandboxEnabledInSettings() &&
          (input.mode === "auto-allow") === SandboxManager.isAutoAllowBashIfSandboxedEnabled())) &&
    (input.allowUnsandboxedCommands === undefined ||
      SandboxManager.areUnsandboxedCommandsAllowed() === input.allowUnsandboxedCommands) &&
    (input.excludeCommand === undefined ||
      SandboxManager.getExcludedCommands().includes(input.excludeCommand.replace(/^["']|["']$/g, "").trim()))
  ))
    return {
      ok: false,
      failed: true,
      code: "write_not_landed",
      error: `The settings file could not be updated. Check that ${settingsSource === "userSettings" ? "~/.claude/settings.json" : "the project's .claude/settings.local.json"} can be written.`,
    };
  return {
    ok: true,
    written: input,
  };
}
export { applySandboxSettingsEditLogged };
