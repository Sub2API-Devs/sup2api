/**
 * utils/permissions/bypassConsent.ts
 *
 * 2.1.316 新增：bypass 权限同意
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-k88gsmtn.js (4)
 * attribution: placement 4
 */
import { envDynamicProbe } from "../envDynamic.js";
import { getBypassDisabledReason, isBypassPermissionsModeDisabled } from "./permissionSetup.js";
import { isBypassPermissionsAccepted } from "./bypassPermissionsAccepted.js";
import { hasSkipDangerousModePermissionPrompt, drainSettingsWrites } from "../settings/settings.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { getRootSession } from "../../bootstrap/state.js";
import { logForDebugging } from "../debug.js";

//@ chunk-k88gsmtn.js:3445-3527 placement
function wantsBypassPermissions(s) {
  return s?.permissionMode === "bypassPermissions" || s?.allowBypass === true;
}
//@ chunk-k88gsmtn.js:3527-3722 placement
/**
 * 以 root/sudo 运行且不在受控沙箱内时，使用 --dangerously-skip-permissions 直接报错退出。
 */
function exitIfRootWithBypass(s) {
  if (!wantsBypassPermissions(s)) return;
  if (envDynamicProbe.isRootOutsideDeliberateSandbox()) {
    console.error(
      "--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons",
    );
    process.exit(1);
  }
}
//@ chunk-k88gsmtn.js:3722-3913 placement
/**
 * bypass 被禁用时打印原因，并从启动选项中去掉 bypassPermissions 模式与 allowBypass。
 */
function dropDisabledBypass(s) {
  if (!s || !wantsBypassPermissions(s)) return s;
  let bypassDisabledReason = getBypassDisabledReason();
  if (!bypassDisabledReason) return s;
  console.error(bypassDisabledReason);
  return {
    ...s,
    permissionMode: s.permissionMode === "bypassPermissions" ? undefined : s.permissionMode,
    allowBypass: undefined,
  };
}
//@ chunk-k88gsmtn.js:3913-4438 placement
/**
 * 需要 bypass 模式时弹出 BypassPermissionsModeDialog 让用户确认（已禁用、已同意或继承且免提示时跳过）；确认后检查设置里是否真的记下了同意。
 */
async function ensureBypassConsent(root, options, storage) {
  if (!wantsBypassPermissions(options)) return;
  if (isBypassPermissionsModeDisabled()) return;
  if (isBypassPermissionsAccepted()) return;
  if (options?.permissionModeInherited && !options.allowBypass && hasSkipDangerousModePermissionPrompt())
    return;
  let [{ runSteps: a }, n] = await Promise.all([
    import("./chunk-8pefyxsz.js"),
    import("./chunk-styvqsd2.js"),
  ]);
  await a(
    root,
    [
      (p) =>
        jsxProd_default(n.BypassPermissionsModeDialog, {
          onAccept: () => p(),
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
