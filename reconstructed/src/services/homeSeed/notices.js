/**
 * services/homeSeed/notices.ts
 *
 * 2.1.316 新增：home seed 用户通知
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2yrk0gy1.js (1), chunk-twq47pff.js (4)
 * attribution: placement 5
 */
import { join, join as join_2, join as join_3, join as join_4, join as join_5 } from "path";
import {
  RESEND_SETTINGS_HINT,
  RESTORE_FAILURE_REASONS,
  SEED_PREFERENCE_LABELS,
  OUTPUT_STYLE_UNAVAILABLE_NOTICE,
  readHomeSeedFile,
  checkSidecarState,
  pn,
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
import { kZ } from "../../utils/contextAttachments/environment.js";
import { Awt } from "../../outputStyles/loadOutputStylesDir.js";
import { clearOutputStylesCache, getAllOutputStylesCached } from "../../constants/outputStyles.js";
import { SETTINGS_JSON } from "./workingFiles.js";
import { freeze } from "../../cli/remoteIO/fileStoreVerdicts.js";
import { getSyncedFile, putSyncedFile } from "../syncedFiles/syncedFileSyncer.js";
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { sleep } from "../../utils/sleep.js";
import { getCwd } from "../../utils/cwd.js";
import { YDs } from "../../cli/remoteIO/workerAuth.js";
import { isSettingsToCloudEnabledCached } from "../analytics/violinGates.js";

/**
 * 生成云环境重建后本机设置恢复情况的提示：未恢复时说明原因；恢复时列出 deny/ask 规则数、生效时间与被省略的规则，并说明其他设置未恢复。
 */
//@ chunk-twq47pff.js:53774-55457 placement
function formatHomeSeedRestoreNotice(status) {
  if (status.kind === "not_restored") {
    if (status.keepsForeignFiles)
      return {
        text: `Your deny and ask rules may not be in force in this cloud session: its environment was restarted. ${RESEND_SETTINGS_HINT}`,
        level: "warning",
      };
    let { reason: reason } = status;
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
    ],
    timingNote = status.beforeFirstAsk
      ? ""
      : status.duringHold
        ? " (in effect for this reply)"
        : " (from your next message)",
    droppedNote =
      status.droppedRules > 0
        ? ` (${status.droppedRules} ${plural(status.droppedRules, "rule")} ${plural(status.droppedRules, "was", "were")} left out: too long, too many, not in a plain form, or looking like a credential)`
        : "",
    restoredText = `Restored ${ruleParts.join(" and ")} from this session\u2019s stored copy of your machine\u2019s settings`;
  return {
    text: status.keepsForeignFiles
      ? `${restoredText}${timingNote}${droppedNote}.`
      : `${restoredText} after this cloud environment was recreated${timingNote}${droppedNote}; CLAUDE.md, preferences and allow rules from your machine are not restored in this environment \u2014 a new cloud session started from that machine will have them.`,
    level: "notice",
  };
}
//@ chunk-twq47pff.js:55457-58474 placement
function formatHomeSeedAppliedNotice(t) {
  let { applied: applied } = t,
    n = [
      ...(applied.claudeMd ? ["CLAUDE.md"] : []),
      ...(applied.rules > 0 ? [`${applied.rules} ${plural(applied.rules, "rule")}`] : []),
      ...(applied.outputStyles > 0
        ? [`${applied.outputStyles} ${plural(applied.outputStyles, "output style")}`]
        : []),
      ...(applied.permissionRules > 0
        ? [`${applied.permissionRules} ${plural(applied.permissionRules, "permission rule")}`]
        : []),
      ...applied.settingsKeys
        .filter((settingsKey) => !(t.outputStyleMissing && settingsKey === "outputStyle"))
        .map((y) => SEED_PREFERENCE_LABELS[y] ?? y),
    ],
    l = [
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
      ...(t.outputStyleMissing ? [OUTPUT_STYLE_UNAVAILABLE_NOTICE] : []),
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
    ],
    d = [
      ...(applied.filesRemoved > 0
        ? [`${applied.filesRemoved} ${plural(applied.filesRemoved, "file")}`]
        : []),
      ...(applied.settingsRemoved ? ["the forwarded settings"] : []),
    ],
    u = n.length === 0 && d.length > 0;
  if (n.length === 0 && !u && l.length === 0) return null;
  let w = t.beforeFirstAsk ? "" : t.duringHold ? " (in effect for this reply)" : " (from your next message)",
    v = l.length > 0 ? ` (${l.join("; ")})` : "",
    P = applied.filesRemoved + (applied.settingsRemoved ? 2 : 0);
  return {
    text: u
      ? `${d.join(" and ")} from your machine ${plural(P, "was", "were")} removed${v}${w}`
      : n.length === 0
        ? `Settings from your machine were not applied: ${l.join("; ")}`
        : t.generation === 1
          ? t.beforeFirstAsk
            ? `Started with settings from your machine: ${n.join(", ")}${v}`
            : `Applied settings from your machine: ${n.join(", ")}${v}${w}`
          : `Updated settings from your machine: ${n.join(", ")}${v}${w}`,
    level:
      t.outcome === "partial" ||
      t.outputStyleMissing ||
      applied.credentialRestrictionsLeftOut > 0 ||
      applied.rulesLeftOut > 0 ||
      applied.credentialFilesLeftOut > 0
        ? "warning"
        : l.length === 0 && !t.answersNotRestored
          ? "debug"
          : "notice",
  };
}
//@ chunk-twq47pff.js:58474-58640 placement
function getHomeSeedHoldLimits() {
  return {
    holdMaxMs: Math.min(env.CLAUDE_CODE_HOME_SEED_HOLD_TIMEOUT_MS ?? HOLD_MAX_MS, HOLD_MAX_MS),
    verdictWaitMaxMs: Math.min(
      env.CLAUDE_CODE_HOME_SEED_VERDICT_TIMEOUT_MS ?? VERDICT_WAIT_MAX_MS,
      VERDICT_WAIT_MAX_MS,
    ),
  };
}
/**
 * 为云会话创建本机设置（home seed）公告器：注入读写同步文件、读 sidecar、应用种子、应用后刷新设置/记忆/输出样式等依赖，以及等待上限与开关。
 */
//@ chunk-twq47pff.js:58640-59650 placement
function createCloudHomeSeedAnnouncer({
  session: session,
  record: record,
  configHome: configHome,
  foreignFiles: foreignFiles,
  takes: takes,
  repoRoot: repoRoot,
  storageV5: storageV5,
}) {
  let reloaders = {
      reloadUserSettings: () => settingsChangeDetector.notifyChange("userSettings"),
      clearMemoryFiles: () => clearMemoryFilesCache(session),
      clearUserContext: () => invalidateUserContext(session, "settings_sync"),
      clearSystemPromptSections: kZ,
      clearOutputStyles: () => {
        (Awt(), clearOutputStylesCache());
      },
    },
    P = !1,
    isLaterEpoch = (env.CLAUDE_CODE_WORKER_EPOCH ?? 1) > 1 && !0;
  return createHomeSeedAnnouncer(
    {
      configHome: configHome,
      repoRoot: repoRoot,
      settingsPath: join(configHome, SETTINGS_JSON),
      foreignFiles: foreignFiles,
      ...!1,
    },
    {
      verdicts: { subscribe: freeze.subscribe },
      announcements: { remembered: record.announcements, subscribe: record.announced.subscribe },
      getRow: getSyncedFile,
      putRow: putSyncedFile,
      readSidecar: readHomeSeedFile,
      sidecarState: checkSidecarState,
      readStandingSettings: pn,
      execute: applyHomeSeedToCloudSession,
      applyDeps: io(() => createApplyDeps({ storageV5: storageV5, configHome: configHome })),
      afterApply: (y, j) => reloadAfterSeedApply(y, j, reloaders),
      telemetry: createHomeSeedTelemetry(),
      now: () => Date.now(),
      setTimer: (y, j) => {
        let M = setTimeout(y, j);
        return () => clearTimeout(M);
      },
      sleep: sleep,
      epochGt1: isLaterEpoch,
      outputStyleAvailable: async (y) =>
        Object.hasOwn(await getAllOutputStylesCached(getCwd(), storageV5), y),
      enabled: () => YDs(isLaterEpoch),
      ...{ enabledNow: isSettingsToCloudEnabledCached },
      limits: {
        ...getHomeSeedHoldLimits(),
        requestAttempts: REQUEST_ATTEMPTS,
        requestRetryDelayMs: REQUEST_RETRY_DELAY_MS,
        permissionsFromAnyAnnouncedPack: PERMISSIONS_FROM_ANY_PACK,
      },
    },
  );
}
/**
 * 设置未完全应用到云端时的原因说明（文件跳过、设置文件未应用、部分未应用）。
 */
//@ chunk-2yrk0gy1.js:191-331 placement
var HOME_SEED_PARTIAL_REASONS = {
  files: "some files were skipped there",
  settings: "your settings file was not applied there",
  part: "part of it was not applied there",
};

export { HOME_SEED_PARTIAL_REASONS };
