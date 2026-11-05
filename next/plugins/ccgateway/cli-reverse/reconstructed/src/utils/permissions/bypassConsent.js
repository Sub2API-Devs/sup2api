/**
 * utils/permissions/bypassConsent.ts
 *
 * 2.1.316 新增：bypass 权限同意
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-g5ed4raj.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { envDynamicProbe } from "../envDynamic.js";
import { getBypassDisabledReason, isBypassPermissionsModeDisabled } from "./permissionSetup.js";
import { isBypassPermissionsAccepted } from "./bypassPermissionsAccepted.js";
import { hasSkipDangerousModePermissionPrompt, drainSettingsWrites } from "../settings/settings.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { getRootSession } from "../../bootstrap/state.js";
import { logForDebugging } from "../debug.js";

//@ chunk-g5ed4raj.js:3753-3835 placement
function wantsBypassPermissions(options) {
  return options?.permissionMode === "bypassPermissions" || options?.allowBypass === true;
}
//@ chunk-g5ed4raj.js:3835-4030 placement
/**
 * 以 root/sudo 运行且不在受控沙箱内时，使用 --dangerously-skip-permissions 直接报错退出。
 */
function exitIfRootWithBypass(options) {
  if (!wantsBypassPermissions(options)) return;
  if (envDynamicProbe.isRootOutsideDeliberateSandbox()) {
    console.error(
      "--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons",
    );
    process.exit(1);
  }
}
//@ chunk-g5ed4raj.js:4030-4221 placement
/**
 * bypass 被禁用时打印原因，并从启动选项中去掉 bypassPermissions 模式与 allowBypass。
 */
function dropDisabledBypass(options) {
  if (!options || !wantsBypassPermissions(options)) return options;
  let bypassDisabledReason = getBypassDisabledReason();
  if (!bypassDisabledReason) return options;
  console.error(bypassDisabledReason);
  return {
    ...options,
    permissionMode: options.permissionMode === "bypassPermissions" ? undefined : options.permissionMode,
    allowBypass: undefined,
  };
}
//@ chunk-g5ed4raj.js:4221-4746 placement
/**
 * 需要 bypass 模式时弹出 BypassPermissionsModeDialog 让用户确认（已禁用、已同意或继承且免提示时跳过）；确认后检查设置里是否真的记下了同意。
 */
async function ensureBypassConsent(root, options, storage) {
  if (!wantsBypassPermissions(options)) return;
  if (isBypassPermissionsModeDisabled()) return;
  if (isBypassPermissionsAccepted()) return;
  if (options?.permissionModeInherited && !options.allowBypass && hasSkipDangerousModePermissionPrompt())
    return;
  let [{ runSteps }, dialogModule] = await Promise.all([
    import("../runSteps.js"),
    import("../../components/BypassPermissionsModeDialog.js"),
  ]);
  await runSteps(
    root,
    [
      (done) =>
        jsxProd_default(dialogModule.BypassPermissionsModeDialog, {
          onAccept: () => done(),
          storageV5: storage,
        }),
    ],
    {
      session: getRootSession(),
    },
  );
  await drainSettingsWrites();
  if (!isBypassPermissionsAccepted())
    logForDebugging(
      "[permissions] bypass consent was accepted but user settings do not show it (the write failed, or the file has an invalid value), so bypass is not passed on",
      {
        level: "warn",
      },
    );
}
export { dropDisabledBypass, ensureBypassConsent, exitIfRootWithBypass };
