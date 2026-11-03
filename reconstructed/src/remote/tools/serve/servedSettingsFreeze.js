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
import { invalidateCommandNames, commandSyncNameState } from "../../../utils/settings/commandSyncNames.js";
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
import { stripBomAndCarriageReturns } from "../../../utils/settings/settingsReview.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../consentText.js";
import { lit, fromEnum } from "../../../services/analytics/safeMetadata.js";
import { count } from "../../../utils/collections.js";

//@ chunk-g4k0hvs5.js:918-950 placement
var TENGU_SYNCHRONOUS_BUNNY = "tengu_synchronous_bunny";
//@ chunk-g4k0hvs5.js:950-986 placement
function isSynchronousBunnyEnabled() {
  return readFlagWithOverride(TENGU_SYNCHRONOUS_BUNNY, {
    safe: true,
  });
}
//@ chunk-g4k0hvs5.js:986-1135 placement
/**
 * 仓库层设置冻结的事件名与最短刷新间隔：changed、changed-between、taken-as-found、record-unavailable 四种，及 5 s 间隔。
 */
var SERVED_SETTINGS_CHANGED = "served-settings-changed";
var SERVED_SETTINGS_CHANGED_BETWEEN = "served-settings-changed-between";
var SERVED_SETTINGS_TAKEN_AS_FOUND = "served-settings-taken-as-found";
var SERVED_SETTINGS_RECORD_UNAVAILABLE = "served-settings-record-unavailable";
var SETTINGS_FREEZE_MIN_REFRESH_MS = 5000;
//@ chunk-g4k0hvs5.js:1437-1516 placement
var RULE_SOURCE_TO_SETTINGS_NAME = {
  project: "projectSettings",
  local: "localSettings",
  legacy: "localSettings",
};
//@ chunk-g4k0hvs5.js:1516-1671 placement
function notifySettingsSourcesChanged(s) {
  try {
    invalidateCommandNames();
    updateHooksConfigSnapshot({
      userLayer: "retain",
    });
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
var SETTINGS_REFRESH_DEBOUNCE_MS = 2000;
var weakSet = new WeakSet();
//@ chunk-g4k0hvs5.js:1696-2097 placement
/**
 * 创建仓库层设置刷新器：设置变化时异步重新读取 projectSettings 与 localSettings。
 */
function createRepoTiersRefresher(s, r, a) {
  let d = a;
  let t = r;
  let startTime = performance.now();
  let u = () => {
    queueMicrotask(() => notifySettingsSourcesChanged(["projectSettings", "localSettings"]));
    return;
  };
  return () => {
    let h = repoTierFolderKey() !== t;
    if (!h && performance.now() - startTime < SETTINGS_REFRESH_DEBOUNCE_MS) return d;
    startTime = performance.now();
    try {
      let p = repoTierFileSlots();
      let servedOwnerSettings = readServedOwnerSettings(
        s,
        p,
        readRepoTierFileText,
        "look",
        repoTierFileLeadsAway,
      );
      if (
        servedOwnerSettings.heldBack.filter((T) => !servedOwnerSettings.firstSeen.some((E) => E.slot === T))
          .length === 0
      )
        return u();
      t = p.key;
      d = repoTiersFrom(servedOwnerSettings.seeds);
    } catch (error) {
      logError(toError(error));
      if (h) return u();
    }
    return d;
  };
}
//@ chunk-g4k0hvs5.js:2097-4073 placement
/**
 * 远程提供工具期间冻结项目/本地设置，自己的写入除外
 */
function freezeServedSettings(s, r = createAcceptedSettingsStore()) {
  if (!isSynchronousBunnyEnabled()) return;
  let a = (e) => {
    try {
      logFeatureOk("remote_served_settings_freeze", e);
    } catch (error) {
      logError(toError(error));
    }
  };
  let d = (e, o) => {
    try {
      s?.(e, o);
    } catch (error) {
      logError(toError(error));
    }
  };
  let t;
  let f;
  let u;
  let h = false;
  let p;
  let S = true;
  try {
    S = hasServedCallLogs();
  } catch (error) {
    logError(toError(error));
  }
  try {
    let e = repoTierFileSlots();
    p = e.key;
    t = readServedOwnerSettings(
      r,
      e,
      readRepoTierFileText,
      "engage",
      repoTierFileLeadsAway,
      onceExport(hasCommand),
    );
    let matching = t.matching;
    u = repoTiersFrom(
      t.sandboxTurnedOn
        ? readServedOwnerSettings(r, e, readRepoTierFileText, "look", repoTierFileLeadsAway).seeds
        : t.seeds,
    );
    f = holdRepoTiers({
      files: t.seeds,
      onOwnWrite: (n, _) => {
        if (!matching.has(n)) return;
        try {
          r.recordFile(n, stripBomAndCarriageReturns(_), "own_write");
          h = true;
        } catch (error) {
          matching.delete(n);
          logFeatureBad("remote_served_settings_freeze", "own_write_not_recorded");
          throw error;
        }
      },
    });
  } catch (error) {
    logFeatureBad("remote_served_settings_freeze", "engage_failed");
    d(SERVED_SETTINGS_RECORD_UNAVAILABLE, REMOTE_TOOLS_CONSENT_TEXT["served_settings.record_unavailable"]);
    throw error;
  }
  a({
    op: lit("engaged"),
  });
  if (t.firstSeen.length > 0) {
    let any = t.firstSeen.some((o) => o.widening);
    a({
      op: lit("baseline"),
      files_present: count(t.firstSeen, (o) => o.present),
      prior_serving: S,
      widening_keys: any,
    });
    if (S && any)
      d(SERVED_SETTINGS_TAKEN_AS_FOUND, REMOTE_TOOLS_CONSENT_TEXT["served_settings.taken_as_found"]);
  }
  if (t.heldBack.length > 0) {
    a({
      op: lit("held_back"),
      files: t.heldBack.length,
      unreadable: t.unreadable,
      hook_waiting: t.hookWaiting,
    });
    d(SERVED_SETTINGS_CHANGED_BETWEEN, REMOTE_TOOLS_CONSENT_TEXT["served_settings.held_back"]);
  }
  let y = commandSyncNameState();
  let T = weakSet.has(y);
  if (f.began && (t.heldBack.length > 0 || T))
    notifySettingsSourcesChanged(
      T
        ? ["projectSettings", "localSettings"]
        : new Set(t.heldBack.map((e) => RULE_SOURCE_TO_SETTINGS_NAME[e])),
    );
  weakSet.add(y);
  let E = (e) => {
    a({
      op: lit("held_change"),
      when: fromEnum(e),
    });
    d(SERVED_SETTINGS_CHANGED, REMOTE_TOOLS_CONSENT_TEXT["served_settings.changed_while_attached"]);
  };
  let k = false;
  let R = (e) => {
    if (k) return;
    try {
      if (compareRepoTiersWithHeld() === "changed") {
        k = true;
        E(e);
      }
    } catch (error) {
      logError(toError(error));
      k = true;
      E(e);
    }
  };
  let A = commandSyncNameState().onInvalidate(() => R("during_attach"));
  let O = false;
  let sandboxTurnedOn =
    t.sandboxTurnedOn ||
    (!f.began && y.repoTierFreeze.tier("localSettings")?.settings?.sandbox?.enabled === true);
  return {
    hookWaiting: t.hookWaiting,
    sandboxTurnedOn,
    end: () => {
      if (O) return;
      O = true;
      A();
      R("at_end");
      let e;
      try {
        let n = repoTierFileSlots();
        let servedOwnerSettings = readServedOwnerSettings(
          r,
          n,
          readRepoTierFileText,
          "look",
          repoTierFileLeadsAway,
        );
        e = servedOwnerSettings.heldBack.length > 0 ? repoTiersFrom(servedOwnerSettings.seeds) : undefined;
        try {
          r.noteServed(n.key, [...servedOwnerSettings.matching]);
        } catch (error) {
          logError(toError(error));
        }
      } catch (error) {
        logError(toError(error));
        e = u;
      }
      let o;
      try {
        o = f.release().last;
      } catch (error) {
        logError(toError(error));
        o = true;
      }
      if (!o) return;
      try {
        if (e !== undefined) lingerRepoTiers(e, createRepoTiersRefresher(r, p, e));
        else if (k || h || t.heldBack.length > 0)
          notifySettingsSourcesChanged(["projectSettings", "localSettings"]);
      } catch (error) {
        logError(toError(error));
      }
    },
  };
}
export { freezeServedSettings, SETTINGS_FREEZE_MIN_REFRESH_MS };
