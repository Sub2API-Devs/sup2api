/**
 * utils/permissions/permissionContextRefresh.ts
 *
 * 2.1.316 新增：权限上下文刷新与附加目录重建
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pc1rmcr2.js (6)
 * attribution: placement 6
 */
import { resolve } from "path";
import { hasPolicySettingsNotified } from "../../services/remoteManagedSettings/remoteSettingsState.js";
import {
  isBypassPermissionsModeDisabled,
  createDisabledBypassPermissionsContext,
  isAutoModeInUse,
  isAutoModeDisabledByPolicySettings,
  createDisabledAutoModeContext,
  transitionPlanAutoMode,
  addDirsAreLauncherNamed,
} from "./permissionSetup.js";
import { SETTING_SOURCES } from "../settings/constants.js";
import {
  shouldAllowManagedPermissionRulesOnly,
  additionalDirectoryProvenance,
  loadTrustedAdditionalDirectoriesFromDisk,
} from "./permissionsLoader.js";
import { isSessionScopedRuleSource } from "./permissions.js";
import { getOriginalCwdOrNull } from "../../bootstrap/state.js";
import { getSettingsForSource } from "../settings/settings.js";
import { hasUntouchableRecordSpellingStrict } from "../fsOperations.js";
import { mappedDriveSpellings } from "../remoteEnvironment.js";
import { applyValidatedPermissionUpdate } from "./PermissionUpdate.js";
import { expandPath } from "../path.js";

//@ chunk-pc1rmcr2.js:1784-1813 placement
function whenPolicyNotified(e) {
  if (hasPolicySettingsNotified()) e();
}
//@ chunk-pc1rmcr2.js:1813-2173 placement
function refreshPermissionContext(e, r) {
  let o = e;
  if (o.isBypassPermissionsModeAvailable && isBypassPermissionsModeDisabled())
    o = createDisabledBypassPermissionsContext(o);
  if (o.strippedDangerousRules !== void 0) {
    let u = new Set(SETTING_SOURCES),
      c = !shouldAllowManagedPermissionRulesOnly(),
      f = {};
    for (let [a, m] of Object.entries(o.strippedDangerousRules))
      if (m && (c || a === "command") && !u.has(a)) f[a] = [...m];
    o = { ...o, strippedDangerousRules: f };
  }
  let d = isAutoModeInUse(o) && isAutoModeDisabledByPolicySettings();
  if (d) o = createDisabledAutoModeContext(o);
  return { context: transitionPlanAutoMode(o), exitedAutoMode: d };
}
/**
 * 根据当前设置重建附加工作目录：新增、移除、保留来自磁盘信任的目录。
 */
//@ chunk-pc1rmcr2.js:2173-3602 placement
function rebuildAdditionalDirectories(e, r, o, d, u = !1, c, f) {
  let a = new Set((r ?? []).flatMap((i) => P(i, c))),
    m = new Set((o ?? []).flatMap((i) => P(i))),
    additionalWorkingDirectories = e.additionalWorkingDirectories,
    filtered = [...a].filter(
      (i) => !m.has(i) && !isSessionScopedRuleSource(additionalWorkingDirectories.get(i)?.source),
    ),
    filtered_2 = [...m].filter(
      (i) =>
        (!a.has(i) || (u && !additionalWorkingDirectories.has(i))) &&
        !isSessionScopedRuleSource(additionalWorkingDirectories.get(i)?.source),
    ),
    h = getOriginalCwdOrNull(),
    { declared: declared, repoOnly: repoOnly } = additionalDirectoryProvenance(
      (i) => [...(h === null ? [] : P(i, h)), ...P(i)],
      f,
    ),
    D = (i) => (repoOnly.has(i) ? "projectSettings" : "localSettings"),
    filtered_3 = [...additionalWorkingDirectories.entries()].filter(
      ([i, p]) =>
        !isSessionScopedRuleSource(p.source) && !filtered.includes(i) && declared.has(i) && p.source !== D(i),
    );
  if (filtered.length === 0 && filtered_2.length === 0 && filtered_3.length === 0 && d !== "flagSettings")
    return e;
  let y = e;
  if (filtered_3.length > 0) {
    let i = new Map(additionalWorkingDirectories);
    for (let [p, x] of filtered_3) i.set(p, { ...x, source: D(p) });
    y = { ...y, additionalWorkingDirectories: i };
  }
  if (d === "flagSettings") {
    let i = new Set(
        (getSettingsForSource("flagSettings")?.permissions?.additionalDirectories ?? []).flatMap((S) => P(S)),
      ),
      p = new Map(y.trustedNetworkDirectories ?? []),
      x = !1;
    for (let S of [...p.keys()])
      if (!i.has(S) && additionalWorkingDirectories.get(S)?.source !== "cliArg") {
        for (let C of p.get(S) ?? []) if (C !== S) filtered.push(C);
        (p.delete(S), (x = !0));
      }
    if (addDirsAreLauncherNamed()) {
      for (let S of i)
        if (!p.has(S)) {
          if (hasUntouchableRecordSpellingStrict(S)) continue;
          let C = mappedDriveSpellings(S);
          if (C.length > 0) {
            p.set(S, C);
            for (let A of C) if (A !== S) filtered_2.push(A);
            x = !0;
          }
        }
    }
    if (x) y = { ...y, trustedNetworkDirectories: p };
  }
  if (filtered.length > 0)
    y = applyValidatedPermissionUpdate(y, {
      type: "removeDirectories",
      directories: filtered,
      destination: "localSettings",
    });
  if (filtered_2.length > 0)
    for (let i of ["projectSettings", "localSettings"]) {
      let filtered = filtered_2.filter((x) => D(x) === i);
      if (filtered.length > 0)
        y = applyValidatedPermissionUpdate(y, {
          type: "addDirectories",
          directories: filtered,
          destination: i,
        });
    }
  return y;
}
//@ chunk-pc1rmcr2.js:3602-3877 placement
function mergeTrustedDirectories(e, r) {
  let o = new Set(loadTrustedAdditionalDirectoriesFromDisk().flatMap((c) => P(c))),
    additionalWorkingDirectories = e.additionalWorkingDirectories,
    filtered = r.filter((c) => {
      let f = additionalWorkingDirectories.get(c);
      return f !== void 0 && !o.has(c) && !isSessionScopedRuleSource(f.source);
    });
  if (filtered.length === 0) return e;
  return applyValidatedPermissionUpdate(e, {
    type: "removeDirectories",
    directories: filtered,
    destination: "localSettings",
  });
}
//@ chunk-pc1rmcr2.js:3941-3975 placement
function E(e, r) {
  return resolve(expandPath(e, r));
}
//@ chunk-pc1rmcr2.js:3975-4026 placement
function P(e, r) {
  try {
    return [E(e, r)];
  } catch {
    return [];
  }
}

export {
  refreshPermissionContext,
  rebuildAdditionalDirectories,
  whenPolicyNotified,
  mergeTrustedDirectories,
};
