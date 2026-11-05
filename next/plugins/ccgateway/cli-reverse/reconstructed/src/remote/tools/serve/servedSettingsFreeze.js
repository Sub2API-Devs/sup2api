/**
 * remote/tools/serve/servedSettingsFreeze.ts
 *
 * 提供工具期间冻结项目/本地设置（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gw6tgnv9.js (8)
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
import { countWhere } from "../../../utils/collections.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-gw6tgnv9.js:918-950 placement
var TENGU_SYNCHRONOUS_BUNNY = "tengu_synchronous_bunny";
//@ chunk-gw6tgnv9.js:950-986 placement
function isSynchronousBunnyEnabled() {
  return readFlagWithOverride(TENGU_SYNCHRONOUS_BUNNY, {
    safe: true,
  });
}
//@ chunk-gw6tgnv9.js:986-1135 placement
/**
 * 仓库层设置冻结的事件名与最短刷新间隔：changed、changed-between、taken-as-found、record-unavailable 四种，及 5 s 间隔。
 */
var SERVED_SETTINGS_CHANGED = "served-settings-changed";
var SERVED_SETTINGS_CHANGED_BETWEEN = "served-settings-changed-between";
var SERVED_SETTINGS_TAKEN_AS_FOUND = "served-settings-taken-as-found";
var SERVED_SETTINGS_RECORD_UNAVAILABLE = "served-settings-record-unavailable";
var SETTINGS_FREEZE_MIN_REFRESH_MS = 5000;
//@ chunk-gw6tgnv9.js:1437-1516 placement
var RULE_SOURCE_TO_SETTINGS_NAME = {
  project: "projectSettings",
  local: "localSettings",
  legacy: "localSettings",
};
//@ chunk-gw6tgnv9.js:1516-1671 placement
function notifySettingsSourcesChanged(sources) {
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
  for (let source of sources)
    try {
      settingsChangeDetector.notifyChange(source);
    } catch (error) {
      logError(toError(error));
    }
}
//@ chunk-gw6tgnv9.js:1671-1696 placement
var SETTINGS_REFRESH_DEBOUNCE_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var weakSet;
deferInit("chunk-gw6tgnv9.js:1671", () => {
  SETTINGS_REFRESH_DEBOUNCE_MS = 2000;
  weakSet = new WeakSet();
});
//@ chunk-gw6tgnv9.js:1696-2097 placement
/**
 * 创建仓库层设置刷新器：设置变化时异步重新读取 projectSettings 与 localSettings。
 */
function createRepoTiersRefresher(store, initialKey, initialTiers) {
  let lastTiers = initialTiers;
  let lastKey = initialKey;
  let startTime = performance.now();
  let notifyChanged = () => {
    queueMicrotask(() => notifySettingsSourcesChanged(["projectSettings", "localSettings"]));
    return;
  };
  return () => {
    let folderChanged = repoTierFolderKey() !== lastKey;
    if (!folderChanged && performance.now() - startTime < SETTINGS_REFRESH_DEBOUNCE_MS) return lastTiers;
    startTime = performance.now();
    try {
      let slots = repoTierFileSlots();
      let servedOwnerSettings = readServedOwnerSettings(
        store,
        slots,
        readRepoTierFileText,
        "look",
        repoTierFileLeadsAway,
      );
      if (
        servedOwnerSettings.heldBack.filter(
          (slot) => !servedOwnerSettings.firstSeen.some((seen) => seen.slot === slot),
        ).length === 0
      )
        return notifyChanged();
      lastKey = slots.key;
      lastTiers = repoTiersFrom(servedOwnerSettings.seeds);
    } catch (error) {
      logError(toError(error));
      if (folderChanged) return notifyChanged();
    }
    return lastTiers;
  };
}
//@ chunk-gw6tgnv9.js:2097-4073 placement
/**
 * 远程提供工具期间冻结项目/本地设置，自己的写入除外
 */
function freezeServedSettings(onNotice, store = createAcceptedSettingsStore()) {
  if (!isSynchronousBunnyEnabled()) return;
  let logFreeze = (fields) => {
    try {
      logFeatureOk("remote_served_settings_freeze", fields);
    } catch (error) {
      logError(toError(error));
    }
  };
  let notice = (key, text) => {
    try {
      onNotice?.(key, text);
    } catch (error) {
      logError(toError(error));
    }
  };
  let ownerSettings;
  let hold;
  let tiers;
  let ownWriteHappened = false;
  let folderKey;
  let priorServing = true;
  try {
    priorServing = hasServedCallLogs();
  } catch (error) {
    logError(toError(error));
  }
  try {
    let slots = repoTierFileSlots();
    folderKey = slots.key;
    ownerSettings = readServedOwnerSettings(
      store,
      slots,
      readRepoTierFileText,
      "engage",
      repoTierFileLeadsAway,
      onceExport(hasCommand),
    );
    let matching = ownerSettings.matching;
    tiers = repoTiersFrom(
      ownerSettings.sandboxTurnedOn
        ? readServedOwnerSettings(store, slots, readRepoTierFileText, "look", repoTierFileLeadsAway).seeds
        : ownerSettings.seeds,
    );
    hold = holdRepoTiers({
      files: ownerSettings.seeds,
      onOwnWrite: (path, contents) => {
        if (!matching.has(path)) return;
        try {
          store.recordFile(path, stripBomAndCarriageReturns(contents), "own_write");
          ownWriteHappened = true;
        } catch (error) {
          matching.delete(path);
          logFeatureBad("remote_served_settings_freeze", "own_write_not_recorded");
          throw error;
        }
      },
    });
  } catch (error) {
    logFeatureBad("remote_served_settings_freeze", "engage_failed");
    notice(
      SERVED_SETTINGS_RECORD_UNAVAILABLE,
      REMOTE_TOOLS_CONSENT_TEXT["served_settings.record_unavailable"],
    );
    throw error;
  }
  logFreeze({
    op: lit("engaged"),
  });
  if (ownerSettings.firstSeen.length > 0) {
    let any = ownerSettings.firstSeen.some((file) => file.widening);
    logFreeze({
      op: lit("baseline"),
      files_present: countWhere(ownerSettings.firstSeen, (file) => file.present),
      prior_serving: priorServing,
      widening_keys: any,
    });
    if (priorServing && any)
      notice(SERVED_SETTINGS_TAKEN_AS_FOUND, REMOTE_TOOLS_CONSENT_TEXT["served_settings.taken_as_found"]);
  }
  if (ownerSettings.heldBack.length > 0) {
    logFreeze({
      op: lit("held_back"),
      files: ownerSettings.heldBack.length,
      unreadable: ownerSettings.unreadable,
      hook_waiting: ownerSettings.hookWaiting,
    });
    notice(SERVED_SETTINGS_CHANGED_BETWEEN, REMOTE_TOOLS_CONSENT_TEXT["served_settings.held_back"]);
  }
  let syncState = commandSyncNameState();
  let alreadyNotified = weakSet.has(syncState);
  if (hold.began && (ownerSettings.heldBack.length > 0 || alreadyNotified))
    notifySettingsSourcesChanged(
      alreadyNotified
        ? ["projectSettings", "localSettings"]
        : new Set(ownerSettings.heldBack.map((slot) => RULE_SOURCE_TO_SETTINGS_NAME[slot])),
    );
  weakSet.add(syncState);
  let reportHeldChange = (when) => {
    logFreeze({
      op: lit("held_change"),
      when: fromEnum(when),
    });
    notice(SERVED_SETTINGS_CHANGED, REMOTE_TOOLS_CONSENT_TEXT["served_settings.changed_while_attached"]);
  };
  let heldChangeSeen = false;
  let checkHeldChange = (when) => {
    if (heldChangeSeen) return;
    try {
      if (compareRepoTiersWithHeld() === "changed") {
        heldChangeSeen = true;
        reportHeldChange(when);
      }
    } catch (error) {
      logError(toError(error));
      heldChangeSeen = true;
      reportHeldChange(when);
    }
  };
  let unsubscribe = commandSyncNameState().onInvalidate(() => checkHeldChange("during_attach"));
  let ended = false;
  let sandboxTurnedOn =
    ownerSettings.sandboxTurnedOn ||
    (!hold.began && syncState.repoTierFreeze.tier("localSettings")?.settings?.sandbox?.enabled === true);
  return {
    hookWaiting: ownerSettings.hookWaiting,
    sandboxTurnedOn,
    end: () => {
      if (ended) return;
      ended = true;
      unsubscribe();
      checkHeldChange("at_end");
      let lingerTiers;
      try {
        let slots = repoTierFileSlots();
        let servedOwnerSettings = readServedOwnerSettings(
          store,
          slots,
          readRepoTierFileText,
          "look",
          repoTierFileLeadsAway,
        );
        lingerTiers =
          servedOwnerSettings.heldBack.length > 0 ? repoTiersFrom(servedOwnerSettings.seeds) : undefined;
        try {
          store.noteServed(slots.key, [...servedOwnerSettings.matching]);
        } catch (error) {
          logError(toError(error));
        }
      } catch (error) {
        logError(toError(error));
        lingerTiers = tiers;
      }
      let released;
      try {
        released = hold.release().last;
      } catch (error) {
        logError(toError(error));
        released = true;
      }
      if (!released) return;
      try {
        if (lingerTiers !== undefined)
          lingerRepoTiers(lingerTiers, createRepoTiersRefresher(store, folderKey, lingerTiers));
        else if (heldChangeSeen || ownWriteHappened || ownerSettings.heldBack.length > 0)
          notifySettingsSourcesChanged(["projectSettings", "localSettings"]);
      } catch (error) {
        logError(toError(error));
      }
    },
  };
}
export { SETTINGS_FREEZE_MIN_REFRESH_MS, freezeServedSettings };
