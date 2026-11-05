/**
 * cli/headlessCloud/syncStatus.ts
 *
 * 本机设置/插件/项目文件同步到云会话的状态文案（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6fv5sh2h.js (39)
 * attribution: placement 38, layout 1
 */
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { repositoryTrustConsentText } from "../../remote/tools/repositoryTrust.js";
import { plural } from "../../utils/stringUtils.js";
import { SEED_UNAUTHORIZED_REASON } from "../../services/homeSeed/writeHomeSettings.js";
import { HOME_SEED_PARTIAL_REASONS } from "../../services/homeSeed/notices.js";
import { classifyCloudPluginsWorkerReply } from "./cloudPlugins.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6fv5sh2h.js:32736-33132 placement
/**
 * 同步状态行的标题、等待提示、条目名与顺序、标记字符与常用状态值。
 */
var SYNC_STATUS_HEADING; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WAITING_MESSAGE_TEXTS;
var SYNC_ITEM_LABELS;
var SYNC_ITEM_ORDER;
var tick;
var cross;
var PENDING_MARK;
var SYNCED_STATUS;
var PENDING_STATUS;
deferInit("chunk-6fv5sh2h.js:32736", () => {
  SYNC_STATUS_HEADING = "Synced from this computer:";
  WAITING_MESSAGE_TEXTS = {
    files: "A message is waiting \xB7 esc to take it back",
    settings: "A message is waiting for your settings to upload \xB7 esc to take it back",
  };
  SYNC_ITEM_LABELS = {
    projectFiles: "Project files",
    settings: "Settings",
    plugins: "Plugins",
    localTools: "Local tools",
  };
  SYNC_ITEM_ORDER = ["projectFiles", "settings", "plugins"];
  tick = figures_default.tick;
  cross = figures_default.cross;
  PENDING_MARK = "\u2026";
  SYNCED_STATUS = {
    mark: "synced",
  };
  PENDING_STATUS = {
    mark: "pending",
  };
});
//@ chunk-6fv5sh2h.js:33132-33180 placement
function notSyncedStatus(words) {
  return {
    mark: "not_synced",
    words,
  };
}
//@ chunk-6fv5sh2h.js:33180-33286 placement
function getSyncMark(status) {
  switch (status.mark) {
    case "synced":
      return tick;
    case "pending":
      return PENDING_MARK;
    case "not_synced":
      return cross;
  }
}
//@ chunk-6fv5sh2h.js:33286-33469 placement
function formatSyncItem(status, label) {
  let words = `${getSyncMark(label)} ${status}`;
  switch (label.mark) {
    case "synced":
      return label.note === undefined ? words : `${words} (${label.note})`;
    case "pending":
      return words;
    case "not_synced":
      return `${words} \u2014 ${label.words}`;
  }
}
//@ chunk-6fv5sh2h.js:33469-33627 placement
function buildSyncStatusLines(sync) {
  return [
    SYNC_STATUS_HEADING,
    ...SYNC_ITEM_ORDER.flatMap((key) => {
      let value = sync[key];
      return value === undefined ? [] : [formatSyncItem(SYNC_ITEM_LABELS[key], value)];
    }),
    ...(sync.localTools === undefined ? [] : [formatSyncItem(SYNC_ITEM_LABELS.localTools, sync.localTools)]),
  ];
}
//@ chunk-6fv5sh2h.js:33627-33804 placement
/**
 * 把同步状态拼成一行："Synced from this computer:" 加各条目状态，附上关闭期间说明与仓库信任说明。
 */
function formatSyncStatusLine(sync) {
  let [parts, ...rest] = buildSyncStatusLines(sync);
  let line = `${parts} ${rest.join(" \xB7 ")}`;
  let withNote = repositoryTrustNote(sync);
  let trust = withNote === undefined ? line : `${line}. ${withNote}`;
  let first = describeRepositoryTrust(sync);
  if (first === undefined) return trust;
  return withNote === undefined ? `${trust}. ${first}.` : `${trust} ${first}.`;
}
//@ chunk-6fv5sh2h.js:33804-33827 placement
/**
 * 仓库信任说明：当前构建恒返回 undefined，不做标记。
 */
function repositoryTrustNote(sync) {
  return;
}
//@ chunk-6fv5sh2h.js:33827-33949 placement
/**
 * 取同步状态中的仓库信任说明；未设置或无需标记时为 undefined。
 */
function describeRepositoryTrust(sync) {
  if (sync.repositoryTrust === undefined || sync.repositoryTrust === "nothing_to_mark") return;
  return repositoryTrustConsentText(sync.repositoryTrust);
}
//@ chunk-6fv5sh2h.js:33949-34104 placement
/**
 * 比较两份同步状态是否相同（关闭时、仓库信任、本地工具与各分项）。
 */
function isSameSyncStatus(cloudSessionSync, a) {
  return (
    cloudSessionSync.whileClosed === a.whileClosed &&
    cloudSessionSync.repositoryTrust === a.repositoryTrust &&
    syncItemListsEqual(cloudSessionSync.localTools, a.localTools) &&
    SYNC_ITEM_ORDER.every((b) => syncItemListsEqual(cloudSessionSync[b], a[b]))
  );
}
//@ chunk-6fv5sh2h.js:34104-34299 layout
function servedToolsPromptForOutcome(outcome, name, name_2) {
  switch (outcome.kind) {
    case "announced":
      return outcome.status === "announced" && name === undefined
        ? {
            on: true,
            name: name_2,
          }
        : {
            on: false,
          };
    case "refused":
    case "unsupported":
      return {
        on: false,
      };
    case "retry":
    case "failed":
      return;
  }
}
//@ chunk-6fv5sh2h.js:34299-34478 placement
/**
 * 计算本地工具同步状态：有上游原因且未开启时显示该原因；开启时显示由本机服务，否则显示未服务本会话。
 */
function getLocalToolsSyncStatus(served, fallback, buffer) {
  if (fallback !== undefined && served?.on !== true) return notSyncedStatus(fallback);
  if (served === undefined) return;
  return served.on
    ? {
        mark: "synced",
        note: `served by this machine (${served.name})`,
      }
    : notSyncedStatus("not serving this session");
}
//@ chunk-6fv5sh2h.js:34478-34539 placement
function syncItemListsEqual(localTools, localTools_2) {
  return localTools === undefined || localTools_2 === undefined
    ? localTools === localTools_2
    : syncItemsEqual(localTools, localTools_2);
}
//@ chunk-6fv5sh2h.js:34539-34583 placement
function syncItemsEqual(a, b) {
  return formatSyncItem("", a) === formatSyncItem("", b);
}
//@ chunk-6fv5sh2h.js:34583-34807 placement
/**
 * 把会话记录位置映射为未同步原因（not_from_here、lookup_failed、not_opted_in、not_set_up）。
 */
function mapRecordWhereToReason(sessionRecordLookup) {
  switch (sessionRecordLookup) {
    case "elsewhere":
      return "not_from_here";
    case "unknown":
    case "failed":
      return "lookup_failed";
    case "here_only":
      return "not_opted_in";
    case "held":
    case "nowhere":
    case "not_looked":
    case undefined:
      return "not_set_up";
  }
}
//@ chunk-6fv5sh2h.js:34807-34892 placement
/**
 * 目录同步状态：state 为 absent 且 reason 为 not_offered 时返回 undefined，否则取目录同步状态。
 */
function directorySyncStatusOrUndefined(sync, mark) {
  return sync.state === "absent" && sync.reason === "not_offered"
    ? undefined
    : getDirectorySyncStatus(sync, mark);
}
//@ chunk-6fv5sh2h.js:34892-35084 placement
function getDirectorySyncStatus(sync, trust) {
  switch (sync.state) {
    case "seeding":
    case "armed":
      return notSyncedStatus(describeSyncOffReason("off", undefined, trust));
    case "absent":
      return notSyncedStatus(describeSyncOffReason(sync.state, sync.reason, trust));
    case "off":
    case "stopped":
      return notSyncedStatus(describeSyncOffReason(sync.state, sync.reason, trust));
  }
}
//@ chunk-6fv5sh2h.js:35084-35107 placement
/**
 * 空函数占位（syncStatus 的回调默认值）。
 */
function noop_2(sync) {
  return;
}
//@ chunk-6fv5sh2h.js:35107-35132 placement
/**
 * 空函数占位（syncStatus 的另一个默认回调）。
 */
function noop_3(sync) {
  return false;
}
//@ chunk-6fv5sh2h.js:35132-35186 placement
/**
 * 调用参数函数，出错时返回 null（syncStatus 的安全取值）。
 */
function nullOnError_2(origin) {
  return {
    fromUpload: origin?.kind === "bundle",
  };
}
//@ chunk-6fv5sh2h.js:35186-35476 placement
var NOT_SET_UP_TEXT = "not set up for this session";
var SYNC_REASON_TEXTS = {
  not_opted_in: NOT_SET_UP_TEXT,
  not_from_here: "this session was not started from this folder",
  not_set_up: NOT_SET_UP_TEXT,
  lookup_failed: "this computer could not check its records of this session",
};
var EXTRA_SYNC_REASON_TEXTS = {};
var ALL_SYNC_REASON_TEXTS = {
  ...SYNC_REASON_TEXTS,
  ...EXTRA_SYNC_REASON_TEXTS,
  seeded_elsewhere: SYNC_REASON_TEXTS.not_from_here,
  not_seeded: SYNC_REASON_TEXTS.not_set_up,
};
//@ chunk-6fv5sh2h.js:35476-35630 placement
function describeSyncOffReason(state, reason, syncState, syncReason) {
  return (
    (reason !== undefined && Object.hasOwn(ALL_SYNC_REASON_TEXTS, reason)
      ? ALL_SYNC_REASON_TEXTS[reason]
      : undefined) ?? (state === "stopped" ? "sync stopped for this session" : "sync is off for this session")
  );
}
//@ chunk-6fv5sh2h.js:35630-35787 placement
/**
 * 把"没有项目文件"的结果统一改为 absent/not_sent。
 */
function normalizeNoProjectFiles(seedSyncState) {
  return (seedSyncState.kind === "absent"
    ? seedSyncState.reason
    : seedSyncState.outcome?.kind === "none"
      ? seedSyncState.outcome.reason
      : undefined) === "no_project_files"
    ? {
        kind: "absent",
        reason: "not_sent",
      }
    : seedSyncState;
}
//@ chunk-6fv5sh2h.js:35787-37007 placement
function describeProjectFilesSync(state) {
  if (state.kind === "absent") return notSyncedStatus(SETTINGS_ABSENT_TEXTS[state.reason]);
  let { outcome, readBack } = state;
  if (outcome === undefined) return PENDING_STATUS;
  let keptForCredential = outcome.keptForCredential;
  let runOutcome = outcome.keptAsLinks === undefined ? [] : [describeKeptLinks(outcome.keptAsLinks)];
  if (outcome.kind === "none") {
    let kept = [
      ...(keptForCredential === undefined
        ? []
        : [
            `${describeKeptFiles(keptForCredential)} kept here: ${plural(keptForCredential.others + (keptForCredential.claudeMd ? 1 : 0), "it looks like it holds", "they look like they hold")} a credential`,
          ]),
      ...runOutcome,
    ];
    return notSyncedStatus(
      kept.length > 0 && outcome.reason === "nothing_to_send"
        ? kept.join("; also ")
        : describeUserSettingsSyncState(outcome.reason),
    );
  }
  let kept = [
    ...(keptForCredential === undefined ? [] : [`without ${describeKeptFiles(keptForCredential)}`]),
    ...runOutcome,
  ];
  let settingsNote =
    kept.length === 0
      ? SYNCED_STATUS
      : {
          mark: "synced",
          note: kept.join("; also "),
        };
  let session =
    outcome.settingsRefused === undefined
      ? undefined
      : notSyncedStatus(
          outcome.settingsRefused === "self_hosted_runner"
            ? NOT_SENT_SELF_HOSTED_TEXT
            : SETTINGS_REFUSAL_TEXTS[outcome.settingsRefused],
        );
  switch (outcome.outcome) {
    case "sent":
    case "unchanged":
    case "conflict_resolved":
      return (
        session ??
        (readBack === undefined ? settingsNote : describeSettingsApplyTiming(readBack, settingsNote))
      );
    case "deadline":
      return (
        session ??
        (readBack === undefined
          ? notSyncedStatus("the upload took too long")
          : describeSettingsApplyTiming(readBack, settingsNote))
      );
    case "raced":
      return notSyncedStatus("another launch of this session sent its settings first");
    case "not_forwarded_at_create":
      return notSyncedStatus(NO_SEND_RECORD_TEXT);
    case "lane_full":
      return notSyncedStatus("the session holds as many uploaded files as it may");
    case "unavailable":
      return notSyncedStatus("not available for this session");
    case "unauthorized":
      return notSyncedStatus(SEED_UNAUTHORIZED_REASON);
    case "failed":
      return notSyncedStatus("the upload failed");
    case "aborted":
      return notSyncedStatus("the upload was cancelled");
  }
}
//@ chunk-6fv5sh2h.js:37007-37142 placement
function describeKeptFiles({ claudeMd, others }) {
  if (!claudeMd) return `${others} ${plural(others, "file")}`;
  return others === 0 ? "CLAUDE.md" : `CLAUDE.md and ${others} more ${plural(others, "file")}`;
}
//@ chunk-6fv5sh2h.js:37142-37327 placement
function describeKeptLinks({ names, more }) {
  let extraCount = more > 0 ? `${names.join(", ")} and ${more} more` : names.join(" and ");
  return names.length + more === 1
    ? `${extraCount} is a link, so it wasn't sent`
    : `${extraCount} are links, so they weren't sent`;
}
//@ chunk-6fv5sh2h.js:37327-37749 placement
function describeSettingsApplyTiming(readBack, sync) {
  switch (readBack.verdict) {
    case "applied_before_first_ask":
    case "applied_late":
      return readBack.left === null ? sync : notSyncedStatus(HOME_SEED_PARTIAL_REASONS[readBack.left]);
    case "behind":
      return sync;
    case "not_applied":
      return notSyncedStatus("the cloud session could not apply them");
    case "stale":
      return notSyncedStatus("the cloud session holds a different copy");
    case "not_seen":
      return notSyncedStatus("the cloud session has not confirmed them");
    case "unreadable":
      return notSyncedStatus("the cloud session's answer could not be read");
  }
}
//@ chunk-6fv5sh2h.js:37749-38470 placement
/**
 * 设置同步状态的说明文案：设置文件被拒原因、紧急关闭、自托管 runner、无发送记录与未发送原因。
 */
var SETTINGS_REFUSAL_TEXTS = {
  schema_rejected: "your settings file has errors",
  settings_too_large: "your settings file is too large",
  settings_unreadable: "your settings file could not be read",
};
var EMERGENCY_OFF_TEXT = "turned off by Anthropic for now (emergency switch)";
var SELF_HOSTED_RUNNER_TEXT = "your rules don't apply on a self-hosted runner";
var NOT_SENT_SELF_HOSTED_TEXT = `not sent: ${SELF_HOSTED_RUNNER_TEXT}`;
var NO_SEND_RECORD_TEXT = "this machine has no record of sending them to this session";
var SETTINGS_ABSENT_TEXTS = {
  unsupported: "not available in this version",
  not_enabled: "not enabled for this account",
  kept_on_this_machine: "you chose not to send them",
  not_decided: "not decided on this machine yet (/config, for new sessions)",
  launch_keeps_them: "this launch keeps them on this machine",
  not_sent: "not sent with this session",
  no_project_files: "not sent with this session",
};
//@ chunk-6fv5sh2h.js:38470-39172 placement
function describeUserSettingsSyncState(reason) {
  switch (reason) {
    case "flag_off":
      return SETTINGS_ABSENT_TEXTS.not_enabled;
    case "no_consent":
      return "kept on this machine (see /config)";
    case "user_settings_disabled":
      return "this launch does not load your user settings";
    case "unbound":
      return "this session is not bound to this machine";
    case "aborted":
      return "the upload was cancelled";
    case "failed":
      return "preparing them failed";
    case "too_slow":
      return "preparing them took too long";
    case "no_project_files":
      return SETTINGS_ABSENT_TEXTS.no_project_files;
    case "self_hosted_runner":
      return NOT_SENT_SELF_HOSTED_TEXT;
    case "home_unvettable":
      return "your settings folder could not be fully examined";
    case "nothing_to_send":
      return "nothing to send from this machine";
    case "rules_unreadable":
      return "a settings file here has errors";
  }
}
//@ chunk-6fv5sh2h.js:39172-39280 placement
/**
 * 由种子结果构造同步状态：无结果时为 absent（附原因），否则为 seed（结果与回读）。
 */
function toSeedSyncState(homeSeed, reason, readBack) {
  return homeSeed === undefined
    ? {
        kind: "absent",
        reason,
      }
    : {
        kind: "seed",
        outcome: homeSeed.outcome(),
        readBack,
      };
}
//@ chunk-6fv5sh2h.js:39280-39428 placement
var PLUGINS_ABSENT_TEXTS = {
  not_enabled: "not enabled for this account",
  switched_off: "switched off on this machine",
  attach_failed: "could not be sent from this machine",
};
//@ chunk-6fv5sh2h.js:39428-39800 placement
/**
 * 根据插件转发状态给出同步标记：等待中、未转发原因、紧急关闭、准入结果（未启用、拒绝、未同意）或 worker 回复。
 */
function getPluginsSyncStatus(plugins) {
  if (plugins.kind === "pending") return PENDING_STATUS;
  if (plugins.kind === "absent") return notSyncedStatus(PLUGINS_ABSENT_TEXTS[plugins.reason]);
  let { state } = plugins;
  if (state.muted) return notSyncedStatus(EMERGENCY_OFF_TEXT);
  if (!state.settled || state.answerPending) return PENDING_STATUS;
  switch (state.admission) {
    case "flag_off":
      return notSyncedStatus("not enabled for this account");
    case "opted_out":
      return notSyncedStatus("you chose not to send them");
    case "no_consent":
      return notSyncedStatus(describePluginsSyncState(state.source));
    case "admitted":
      return getAdmittedPluginsStatus(state);
  }
}
//@ chunk-6fv5sh2h.js:39800-40432 placement
function describePluginsSyncState(source) {
  switch (source) {
    case "not_asked":
      return "no plugins to send from this machine";
    case "read_failed":
      return "your plugin choices here could not be read";
    case "detached":
    case "internal_error":
      return "they could not be sent this time";
    case "bound_elsewhere":
      return "this machine could not show that this session is bound to it";
    case "binding_unknown":
      return "could not check this session's binding";
    case "muted":
      return EMERGENCY_OFF_TEXT;
    case "untrusted_store":
      return "the saved answer here could be changed by this session; run /cloud-plugins to decide for it";
    case undefined:
    case "undecided":
    case "stored":
    case "decided":
      return "run /cloud-plugins to send them";
  }
}
//@ chunk-6fv5sh2h.js:40432-40560 placement
function getAdmittedPluginsStatus(state) {
  let plugins = classifyCloudPluginsWorkerReply(state.notice);
  if (plugins !== undefined) return notSyncedStatus(PLUGINS_WORKER_REPLY_TEXTS[plugins]);
  return state.notice === undefined && state.gaveUp !== undefined
    ? notSyncedStatus(describePluginsSyncState(state.gaveUp))
    : SYNCED_STATUS;
}
//@ chunk-6fv5sh2h.js:40560-40890 placement
/**
 * 插件 worker 回复状态对应的说明文字（拒收、未应用、无可发送、未确认、未能安装等）。
 */
var PLUGINS_WORKER_REPLY_TEXTS = {
  refused_by_worker: "this cloud session does not take plugins",
  not_applied: "the cloud session did not accept them",
  none_to_send: "no plugins to send from this machine",
  not_confirmed: "sent, not confirmed by the session",
  not_installed: "they could not be installed there",
  some_not_installed: "some could not be installed there",
};
//@ chunk-6fv5sh2h.js:40890-41170 placement
/**
 * 由远程会话报告的状态构造同步状态：项目文件、设置、插件、关闭期间状态与仓库信任。
 */
function buildSyncStatusFromRemote(info, directorySync) {
  let directorySync_2 = info.directory_sync;
  return {
    projectFiles: notSyncedStatus(
      describeSyncOffReason(
        directorySync_2.state === "stopped" ? "stopped" : "off",
        directorySync_2.reason,
        {
          fromUpload: directorySync_2.started_from_upload === true,
        },
        directorySync,
      ),
    ),
    settings: getForwardedStatus(info.settings),
    plugins: getForwardedStatus(info.plugins),
    ...getWhileClosedStatus(directorySync_2),
    ...(info.repository_trust !== undefined && {
      repositoryTrust: info.repository_trust,
    }),
  };
}
//@ chunk-6fv5sh2h.js:41170-41402 placement
function getWhileClosedStatus(directorySync) {
  let syncInfo = noop_2(
    directorySync.state === "armed"
      ? {
          state: "armed",
          direction: directorySync.direction ?? "pending",
          firstUpload:
            directorySync.first_upload === undefined
              ? null
              : directorySync.first_upload === "landed"
                ? "landed"
                : "pending",
        }
      : {
          state: directorySync.state,
        },
  );
  return syncInfo === undefined
    ? {}
    : {
        whileClosed: syncInfo,
      };
}
//@ chunk-6fv5sh2h.js:41402-41590 placement
function getForwardedStatus(trust) {
  if (trust === undefined) return notSyncedStatus("not enabled for this launch");
  if (trust.state === "forwarded") return SYNCED_STATUS;
  return notSyncedStatus(
    trust.reason !== undefined && returnNull(trust.reason)
      ? DEVICE_BINDING_STATUS_TEXTS[trust.reason]
      : "not sent from this machine",
  );
}
//@ chunk-6fv5sh2h.js:41590-41632 placement
function returnNull(reason) {
  return Object.hasOwn(DEVICE_BINDING_STATUS_TEXTS, reason);
}
//@ chunk-6fv5sh2h.js:41632-42913 placement
var DEVICE_BINDING_STATUS_TEXTS; // deferred: uses SETTINGS_REFUSAL_TEXTS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-6fv5sh2h.js:41632", () => {
  DEVICE_BINDING_STATUS_TEXTS = {
    unsupported: SETTINGS_ABSENT_TEXTS.unsupported,
    flag_off: SETTINGS_ABSENT_TEXTS.not_enabled,
    launch_flag: SETTINGS_ABSENT_TEXTS.launch_keeps_them,
    declined: SETTINGS_ABSENT_TEXTS.kept_on_this_machine,
    no_consent: "not decided yet on this machine",
    unbound: "this session is not bound to this machine",
    switched_off: PLUGINS_ABSENT_TEXTS.switched_off,
    bound_elsewhere: "this machine could not show that this session is bound to it",
    binding_unknown: "could not check this session's binding",
    not_seeded: SETTINGS_ABSENT_TEXTS.not_sent,
    nothing_to_forward: "nothing to send from this machine",
    nothing_to_send: "nothing to send from this machine",
    rules_unreadable: "a settings file here has errors",
    plan_failed: "preparing them failed",
    user_settings_disabled: "this launch does not load your user settings",
    muted: EMERGENCY_OFF_TEXT,
    too_slow: "preparing them took too long",
    no_project_files: SETTINGS_ABSENT_TEXTS.no_project_files,
    self_hosted_runner: NOT_SENT_SELF_HOSTED_TEXT,
    home_unvettable: "your settings folder could not be fully examined",
    aborted: "the upload was cancelled",
    deadline: "the upload took too long",
    raced: "another launch of this session sent its settings first",
    not_forwarded_at_create: NO_SEND_RECORD_TEXT,
    lane_full: "the session holds as many uploaded files as it may",
    unavailable: "not available for this session",
    unauthorized: SEED_UNAUTHORIZED_REASON,
    failed: "the upload failed",
    ...SETTINGS_REFUSAL_TEXTS,
    ...PLUGINS_WORKER_REPLY_TEXTS,
    unreadable: "your plugin choices here could not be read",
    could_not_send: "they could not be sent this time",
  };
});
export {
  mapRecordWhereToReason,
  noop_2,
  getLocalToolsSyncStatus,
  directorySyncStatusOrUndefined,
  nullOnError_2,
  toSeedSyncState,
  describeProjectFilesSync,
  normalizeNoProjectFiles,
  getPluginsSyncStatus,
  isSameSyncStatus,
  servedToolsPromptForOutcome,
  WAITING_MESSAGE_TEXTS,
  repositoryTrustNote,
  describeRepositoryTrust,
  SYNC_STATUS_HEADING,
  SYNC_ITEM_LABELS,
  cross,
  buildSyncStatusFromRemote,
  noop_3,
  formatSyncStatusLine,
};
