/**
 * remote/tools/serve/servedSettingsFreeze.ts
 *
 * 提供工具期间冻结项目/本地设置（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g4k0hvs5.js (8)
 * attribution: placement 8
 */
import { readFlagWithOverride } from "../../../services/analytics/flagOverrides.js";
import { or, is } from "../../../utils/settings/commandSyncNames.js";
import { updateHooksConfigSnapshot } from "../../../utils/hooks/hooksConfigSnapshot.js";
import { logError } from "../../../utils/log.js";
import { toError } from "../../../utils/errors.js";
import { getAutoMemPathState } from "../../../memdir/paths.js";
import { settingsChangeDetector } from "../../../utils/settings/changeDetector.js";
import {
  repoTierFolderKey,
  repoTierFileSlots,
  readRepoTierFileText,
  repoTierFileLeadsAway,
  repoTiersFrom,
  holdRepoTiers,
  compareRepoTiersWithHeld,
  lingerRepoTiers,
} from "../../../utils/settings/settings.js";
import { readServedOwnerSettings, hasServedCallLogs } from "../servedOwnerSettings.js";
import { createAcceptedSettingsStore } from "../../../services/remoteTools/acceptedSettings.js";
import { logFeatureOk, logFeatureBad } from "../../../services/analytics/featureTelemetry.js";
import { onceExport } from "../../../../vendor/lodash-es/once.js";
import { hasCommand } from "../../../services/voice.js";
import { Dq } from "../../../utils/settings/settingsReview.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../consentText.js";
import { lit, fromEnum } from "../../../services/analytics/safeMetadata.js";
import { count } from "../../../utils/collections.js";

//@ chunk-g4k0hvs5.js:918-950 placement
var TENGU_SYNCHRONOUS_BUNNY = "tengu_synchronous_bunny";
//@ chunk-g4k0hvs5.js:950-986 placement
function C() {
  return readFlagWithOverride(TENGU_SYNCHRONOUS_BUNNY, { safe: !0 });
}
//@ chunk-g4k0hvs5.js:986-1135 placement
var SERVED_SETTINGS_CHANGED = "served-settings-changed",
  SERVED_SETTINGS_CHANGED_BETWEEN = "served-settings-changed-between",
  SERVED_SETTINGS_TAKEN_AS_FOUND = "served-settings-taken-as-found",
  SERVED_SETTINGS_RECORD_UNAVAILABLE = "served-settings-record-unavailable",
  H = 5000;
//@ chunk-g4k0hvs5.js:1437-1516 placement
var K = { project: "projectSettings", local: "localSettings", legacy: "localSettings" };
//@ chunk-g4k0hvs5.js:1516-1671 placement
function notifySettingsSourcesChanged(s) {
  try {
    (or(), updateHooksConfigSnapshot({ userLayer: "retain" }));
  } catch (error) {
    logError(toError(error));
  }
  try {
    getAutoMemPathState().reset();
  } catch (error) {
    logError(toError(error));
  }
  for (let r of s)
    try {
      settingsChangeDetector.notifyChange(r);
    } catch (error) {
      logError(toError(error));
    }
}
//@ chunk-g4k0hvs5.js:1671-1696 placement
var P = 2000,
  weakSet = new WeakSet();
/**
 * 创建仓库层设置刷新器：设置变化时异步重新读取 projectSettings 与 localSettings。
 */
//@ chunk-g4k0hvs5.js:1696-2097 placement
function createRepoTiersRefresher(s, r, a) {
  let d = a,
    t = r,
    startTime = performance.now(),
    u = () => {
      queueMicrotask(() => notifySettingsSourcesChanged(["projectSettings", "localSettings"]));
      return;
    };
  return () => {
    let h = repoTierFolderKey() !== t;
    if (!h && performance.now() - startTime < P) return d;
    startTime = performance.now();
    try {
      let p = repoTierFileSlots(),
        S = readServedOwnerSettings(s, p, readRepoTierFileText, "look", repoTierFileLeadsAway);
      if (S.heldBack.filter((T) => !S.firstSeen.some((E) => E.slot === T)).length === 0) return u();
      ((t = p.key), (d = repoTiersFrom(S.seeds)));
    } catch (error) {
      if ((logError(toError(error)), h)) return u();
    }
    return d;
  };
}
/**
 * 远程提供工具期间冻结项目/本地设置，自己的写入除外
 */
//@ chunk-g4k0hvs5.js:2097-4073 placement
function freezeServedSettings(s, r = createAcceptedSettingsStore()) {
  if (!C()) return;
  let a = (e) => {
      try {
        logFeatureOk("remote_served_settings_freeze", e);
      } catch (error) {
        logError(toError(error));
      }
    },
    d = (e, o) => {
      try {
        s?.(e, o);
      } catch (error) {
        logError(toError(error));
      }
    },
    t,
    f,
    u,
    h = !1,
    p,
    S = !0;
  try {
    S = hasServedCallLogs();
  } catch (error) {
    logError(toError(error));
  }
  try {
    let e = repoTierFileSlots();
    ((p = e.key),
      (t = readServedOwnerSettings(
        r,
        e,
        readRepoTierFileText,
        "engage",
        repoTierFileLeadsAway,
        onceExport(hasCommand),
      )));
    let matching = t.matching;
    ((u = repoTiersFrom(
      t.sandboxTurnedOn
        ? readServedOwnerSettings(r, e, readRepoTierFileText, "look", repoTierFileLeadsAway).seeds
        : t.seeds,
    )),
      (f = holdRepoTiers({
        files: t.seeds,
        onOwnWrite: (n, _) => {
          if (!matching.has(n)) return;
          try {
            (r.recordFile(n, Dq(_), "own_write"), (h = !0));
          } catch (error) {
            throw (
              matching.delete(n),
              logFeatureBad("remote_served_settings_freeze", "own_write_not_recorded"),
              error
            );
          }
        },
      })));
  } catch (error) {
    throw (
      logFeatureBad("remote_served_settings_freeze", "engage_failed"),
      d(SERVED_SETTINGS_RECORD_UNAVAILABLE, REMOTE_TOOLS_CONSENT_TEXT["served_settings.record_unavailable"]),
      error
    );
  }
  if ((a({ op: lit("engaged") }), t.firstSeen.length > 0)) {
    let any = t.firstSeen.some((o) => o.widening);
    if (
      (a({
        op: lit("baseline"),
        files_present: count(t.firstSeen, (o) => o.present),
        prior_serving: S,
        widening_keys: any,
      }),
      S && any)
    )
      d(SERVED_SETTINGS_TAKEN_AS_FOUND, REMOTE_TOOLS_CONSENT_TEXT["served_settings.taken_as_found"]);
  }
  if (t.heldBack.length > 0)
    (a({
      op: lit("held_back"),
      files: t.heldBack.length,
      unreadable: t.unreadable,
      hook_waiting: t.hookWaiting,
    }),
      d(SERVED_SETTINGS_CHANGED_BETWEEN, REMOTE_TOOLS_CONSENT_TEXT["served_settings.held_back"]));
  let y = is(),
    T = weakSet.has(y);
  if (f.began && (t.heldBack.length > 0 || T))
    notifySettingsSourcesChanged(
      T ? ["projectSettings", "localSettings"] : new Set(t.heldBack.map((e) => K[e])),
    );
  weakSet.add(y);
  let E = (e) => {
      (a({ op: lit("held_change"), when: fromEnum(e) }),
        d(SERVED_SETTINGS_CHANGED, REMOTE_TOOLS_CONSENT_TEXT["served_settings.changed_while_attached"]));
    },
    k = !1,
    R = (e) => {
      if (k) return;
      try {
        if (compareRepoTiersWithHeld() === "changed") ((k = !0), E(e));
      } catch (error) {
        (logError(toError(error)), (k = !0), E(e));
      }
    },
    onInvalidate = is().onInvalidate(() => R("during_attach")),
    O = !1,
    I =
      t.sandboxTurnedOn ||
      (!f.began && y.repoTierFreeze.tier("localSettings")?.settings?.sandbox?.enabled === !0);
  return {
    hookWaiting: t.hookWaiting,
    sandboxTurnedOn: I,
    end: () => {
      if (O) return;
      ((O = !0), onInvalidate(), R("at_end"));
      let e;
      try {
        let n = repoTierFileSlots(),
          _ = readServedOwnerSettings(r, n, readRepoTierFileText, "look", repoTierFileLeadsAway);
        e = _.heldBack.length > 0 ? repoTiersFrom(_.seeds) : void 0;
        try {
          r.noteServed(n.key, [..._.matching]);
        } catch (error) {
          logError(toError(error));
        }
      } catch (error) {
        (logError(toError(error)), (e = u));
      }
      let o;
      try {
        o = f.release().last;
      } catch (error) {
        (logError(toError(error)), (o = !0));
      }
      if (!o) return;
      try {
        if (e !== void 0) lingerRepoTiers(e, createRepoTiersRefresher(r, p, e));
        else if (k || h || t.heldBack.length > 0)
          notifySettingsSourcesChanged(["projectSettings", "localSettings"]);
      } catch (error) {
        logError(toError(error));
      }
    },
  };
}

export { freezeServedSettings, H };
