/**
 * services/homeSeed/notices.ts
 *
 * 2.1.316 新增：home seed 用户通知
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-12yz0000.js (1), chunk-9x09krra.js (4)
 * attribution: placement 5
 */
import { join } from "path";
import {
  RESEND_SETTINGS_HINT,
  RESTORE_FAILURE_REASONS,
  SEED_PREFERENCE_LABELS,
  OUTPUT_STYLE_UNAVAILABLE_NOTICE,
  readHomeSeedFile,
  checkSidecarState,
  readCloudSettingsForSeed,
  applyHomeSeedToCloudSession,
  createApplyDeps,
  reloadAfterSeedApply,
  createHomeSeedTelemetry,
} from "./applyHomeSeed.js";
import { plural } from "../../utils/stringUtils.js";
import { env } from "../../utils/env.js";
import {
  HOLD_MAX_MS,
  VERDICT_WAIT_MAX_MS,
  createHomeSeedAnnouncer,
  REQUEST_ATTEMPTS,
  REQUEST_RETRY_DELAY_MS,
  PERMISSIONS_FROM_ANY_PACK,
} from "./announce.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";
import { clearMemoryFilesCache } from "../../components/Message.js";
import { invalidateUserContext } from "../../context.js";
import { resetEnvironmentCaches } from "../../utils/contextAttachments/environment.js";
import { clearOutputStyleCaches } from "../../outputStyles/loadOutputStylesDir.js";
import { clearOutputStylesCache, getAllOutputStylesCached } from "../../constants/outputStyles.js";
import { SETTINGS_JSON } from "./workingFiles.js";
import { fileStoreVerdictChannel } from "../../cli/remoteIO/fileStoreVerdicts.js";
import { getSyncedFile, putSyncedFile } from "../syncedFiles/syncedFileSyncer.js";
import { memoizeAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { sleep } from "../../utils/sleep.js";
import { getCwd } from "../../utils/cwd.js";
import { settingsToCloudCapability } from "../../cli/remoteIO/workerAuth.js";
import { isSettingsToCloudEnabledCached } from "../analytics/violinGates.js";

//@ chunk-12yz0000.js:191-331 placement
/**
 * 设置未完全应用到云端时的原因说明（文件跳过、设置文件未应用、部分未应用）。
 */
var HOME_SEED_PARTIAL_REASONS = {
  files: "some files were skipped there",
  settings: "your settings file was not applied there",
  part: "part of it was not applied there",
};
//@ chunk-9x09krra.js:54928-56611 placement
/**
 * 生成云环境重建后本机设置恢复情况的提示：未恢复时说明原因；恢复时列出 deny/ask 规则数、生效时间与被省略的规则，并说明其他设置未恢复。
 */
function formatHomeSeedRestoreNotice(status) {
  if (status.kind === "not_restored") {
    if (status.keepsForeignFiles)
      return {
        text: `Your deny and ask rules may not be in force in this cloud session: its environment was restarted. ${RESEND_SETTINGS_HINT}`,
        level: "warning",
      };
    let { reason } = status;
    if (reason === "settings_gone")
      return {
        text: "This cloud environment was recreated, and any user settings forwarded from your machine are not in force here: deny and ask rules, CLAUDE.md and preferences among them. Re-open this session from that machine to send them again.",
        level: "warning",
      };
    return {
      text: `This cloud environment was recreated and the permission rules forwarded from your machine could not be restored (${RESTORE_FAILURE_REASONS[reason]}): the deny and ask rules your machine sent are not restored here; ${reason === "settings_refused" ? "a cloud environment on a newer Claude Code build will have them" : "a new cloud session started from that machine will have them"}.`,
      level: "warning",
    };
  }
  let ruleParts = [
    ...(status.denyRules > 0 ? [`${status.denyRules} deny ${plural(status.denyRules, "rule")}`] : []),
    ...(status.askRules > 0 ? [`${status.askRules} ask ${plural(status.askRules, "rule")}`] : []),
  ];
  let timingNote = status.beforeFirstAsk
    ? ""
    : status.duringHold
      ? " (in effect for this reply)"
      : " (from your next message)";
  let droppedNote =
    status.droppedRules > 0
      ? ` (${status.droppedRules} ${plural(status.droppedRules, "rule")} ${plural(status.droppedRules, "was", "were")} left out: too long, too many, not in a plain form, or looking like a credential)`
      : "";
  let restoredText = `Restored ${ruleParts.join(" and ")} from this session\u2019s stored copy of your machine\u2019s settings`;
  return {
    text: status.keepsForeignFiles
      ? `${restoredText}${timingNote}${droppedNote}.`
      : `${restoredText} after this cloud environment was recreated${timingNote}${droppedNote}; CLAUDE.md, preferences and allow rules from your machine are not restored in this environment \u2014 a new cloud session started from that machine will have them.`,
    level: "notice",
  };
}
//@ chunk-9x09krra.js:56611-59628 placement
function formatHomeSeedAppliedNotice(input) {
  let { applied } = input;
  let appliedNames = [
    ...(applied.claudeMd ? ["CLAUDE.md"] : []),
    ...(applied.rules > 0 ? [`${applied.rules} ${plural(applied.rules, "rule")}`] : []),
    ...(applied.outputStyles > 0
      ? [`${applied.outputStyles} ${plural(applied.outputStyles, "output style")}`]
      : []),
    ...(applied.permissionRules > 0
      ? [`${applied.permissionRules} ${plural(applied.permissionRules, "permission rule")}`]
      : []),
    ...applied.settingsKeys
      .filter((settingsKey) => !(input.outputStyleMissing && settingsKey === "outputStyle"))
      .map((settingsKey) => SEED_PREFERENCE_LABELS[settingsKey] ?? settingsKey),
  ];
  let problemLines = [
    ...(applied.settingsKeptForeign
      ? [
          applied.permissionRules > 0
            ? "this environment keeps its own settings file: only deny and ask rules from yours were added to it"
            : "this environment keeps its own settings file, and nothing from yours was added to it",
        ]
      : []),
    ...(applied.credentialRestrictionsLeftOut > 0
      ? [
          `${applied.credentialRestrictionsLeftOut} deny or ask ${plural(applied.credentialRestrictionsLeftOut, "rule is", "rules are")} not in force in this session: ${plural(applied.credentialRestrictionsLeftOut, "it looks like it holds", "they look like they hold")} a credential`,
        ]
      : []),
    ...(applied.rulesLeftOut > 0
      ? [
          `${applied.rulesLeftOut} deny or ask ${plural(applied.rulesLeftOut, "rule is", "rules are")} not in force in this session: too long, too many, or not in a plain form`,
        ]
      : []),
    ...(applied.credentialFilesLeftOut > 0
      ? [
          `${applied.credentialFilesLeftOut} ${plural(applied.credentialFilesLeftOut, "file was", "files were")} left out: ${plural(applied.credentialFilesLeftOut, "it looks like it holds", "they look like they hold")} a credential`,
        ]
      : []),
    ...(input.outputStyleMissing ? [OUTPUT_STYLE_UNAVAILABLE_NOTICE] : []),
    ...(applied.filesKeptForeign > 0
      ? [
          `${applied.filesKeptForeign} of your files ${plural(applied.filesKeptForeign, "was", "were")} not written: this environment has ${plural(applied.filesKeptForeign, "a file", "files")} of the same name`,
        ]
      : []),
    ...(applied.filesNotApplied > 0
      ? [`${applied.filesNotApplied} ${plural(applied.filesNotApplied, "file")} could not be applied`]
      : []),
    ...(applied.settingsNotWritten ? ["settings could not be written"] : []),
    ...(applied.settingsRefused && !applied.settingsNotWritten
      ? [
          applied.permissionRules > 0
            ? "only the deny and ask rules from your settings file could be applied"
            : "settings could not be applied",
        ]
      : []),
    ...(applied.removalsFailed > 0
      ? [`${applied.removalsFailed} earlier ${plural(applied.removalsFailed, "file")} could not be removed`]
      : []),
    ...(applied.settingsRemoveFailed ? ["the earlier settings could not be removed"] : []),
  ];
  let removedNames = [
    ...(applied.filesRemoved > 0 ? [`${applied.filesRemoved} ${plural(applied.filesRemoved, "file")}`] : []),
    ...(applied.settingsRemoved ? ["the forwarded settings"] : []),
  ];
  let onlyRemoved = appliedNames.length === 0 && removedNames.length > 0;
  if (appliedNames.length === 0 && !onlyRemoved && problemLines.length === 0) return null;
  let timingSuffix = input.beforeFirstAsk
    ? ""
    : input.duringHold
      ? " (in effect for this reply)"
      : " (from your next message)";
  let problemSuffix = problemLines.length > 0 ? ` (${problemLines.join("; ")})` : "";
  let removedWeight = applied.filesRemoved + (applied.settingsRemoved ? 2 : 0);
  return {
    text: onlyRemoved
      ? `${removedNames.join(" and ")} from your machine ${plural(removedWeight, "was", "were")} removed${problemSuffix}${timingSuffix}`
      : appliedNames.length === 0
        ? `Settings from your machine were not applied: ${problemLines.join("; ")}`
        : input.generation === 1
          ? input.beforeFirstAsk
            ? `Started with settings from your machine: ${appliedNames.join(", ")}${problemSuffix}`
            : `Applied settings from your machine: ${appliedNames.join(", ")}${problemSuffix}${timingSuffix}`
          : `Updated settings from your machine: ${appliedNames.join(", ")}${problemSuffix}${timingSuffix}`,
    level:
      input.outcome === "partial" ||
      input.outputStyleMissing ||
      applied.credentialRestrictionsLeftOut > 0 ||
      applied.rulesLeftOut > 0 ||
      applied.credentialFilesLeftOut > 0
        ? "warning"
        : problemLines.length === 0 && !input.answersNotRestored
          ? "debug"
          : "notice",
  };
}
//@ chunk-9x09krra.js:59628-59794 placement
function getHomeSeedHoldLimits() {
  return {
    holdMaxMs: Math.min(env.CLAUDE_CODE_HOME_SEED_HOLD_TIMEOUT_MS ?? HOLD_MAX_MS, HOLD_MAX_MS),
    verdictWaitMaxMs: Math.min(
      env.CLAUDE_CODE_HOME_SEED_VERDICT_TIMEOUT_MS ?? VERDICT_WAIT_MAX_MS,
      VERDICT_WAIT_MAX_MS,
    ),
  };
}
//@ chunk-9x09krra.js:59794-60828 placement
/**
 * 为云会话创建本机设置（home seed）公告器：注入读写同步文件、读 sidecar、应用种子、应用后刷新设置/记忆/输出样式等依赖，以及等待上限与开关。
 */
function createCloudHomeSeedAnnouncer({
  session,
  record,
  configHome,
  foreignFiles,
  takes,
  repoRoot,
  storageV5,
}) {
  let reloaders = {
    reloadUserSettings: (countsAsStart) =>
      settingsChangeDetector.notifyChange("userSettings", {
        countsAsStart,
      }),
    clearMemoryFiles: () => clearMemoryFilesCache(session),
    clearUserContext: () => invalidateUserContext(session, "settings_sync"),
    clearSystemPromptSections: resetEnvironmentCaches,
    clearOutputStyles: () => {
      clearOutputStyleCaches();
      clearOutputStylesCache();
    },
  };
  let applied = false;
  let isLaterEpoch = (env.CLAUDE_CODE_WORKER_EPOCH ?? 1) > 1 && true;
  return createHomeSeedAnnouncer(
    {
      configHome,
      repoRoot,
      settingsPath: join(configHome, SETTINGS_JSON),
      foreignFiles,
      ...false,
    },
    {
      verdicts: {
        subscribe: fileStoreVerdictChannel.subscribe,
      },
      announcements: {
        remembered: record.announcements,
        subscribe: record.announced.subscribe,
      },
      getRow: getSyncedFile,
      putRow: putSyncedFile,
      readSidecar: readHomeSeedFile,
      sidecarState: checkSidecarState,
      readStandingSettings: readCloudSettingsForSeed,
      execute: applyHomeSeedToCloudSession,
      applyDeps: memoizeAlias(() =>
        createApplyDeps({
          storageV5,
          configHome,
        }),
      ),
      afterApply: (applyReport, reloaders_2, report) =>
        reloadAfterSeedApply(applyReport, reloaders_2, reloaders, report),
      telemetry: createHomeSeedTelemetry(),
      now: () => Date.now(),
      setTimer: (callback, delayMs) => {
        let timer = setTimeout(callback, delayMs);
        return () => clearTimeout(timer);
      },
      sleep,
      epochGt1: isLaterEpoch,
      outputStyleAvailable: async (styleName) =>
        Object.hasOwn(await getAllOutputStylesCached(getCwd(), storageV5), styleName),
      enabled: () => settingsToCloudCapability(isLaterEpoch),
      ...{
        enabledNow: isSettingsToCloudEnabledCached,
      },
      limits: {
        ...getHomeSeedHoldLimits(),
        requestAttempts: REQUEST_ATTEMPTS,
        requestRetryDelayMs: REQUEST_RETRY_DELAY_MS,
        permissionsFromAnyAnnouncedPack: PERMISSIONS_FROM_ANY_PACK,
      },
    },
  );
}
export {
  HOME_SEED_PARTIAL_REASONS,
  formatHomeSeedAppliedNotice,
  formatHomeSeedRestoreNotice,
  createCloudHomeSeedAnnouncer,
};
