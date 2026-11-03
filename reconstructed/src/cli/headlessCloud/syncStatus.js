/**
 * cli/headlessCloud/syncStatus.ts
 *
 * 本机设置/插件/项目文件同步到云会话的状态文案（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z7wtv7tg.js (38)
 * attribution: placement 38
 */
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { repositoryTrustConsentText } from "../../remote/tools/repositoryTrust.js";
import { plural } from "../../utils/stringUtils.js";
import { SEED_UNAUTHORIZED_REASON } from "../../services/homeSeed/writeHomeSettings.js";
import { HOME_SEED_PARTIAL_REASONS } from "../../services/homeSeed/notices.js";
import { classifyCloudPluginsWorkerReply } from "./cloudPlugins.js";

//@ chunk-z7wtv7tg.js:32703-33099 placement
/**
 * 同步状态行的标题、等待提示、条目名与顺序、标记字符与常用状态值。
 */
var SYNC_STATUS_HEADING = "Synced from this computer:";
var WAITING_MESSAGE_TEXTS = {
  files: "A message is waiting \xB7 esc to take it back",
  settings: "A message is waiting for your settings to upload \xB7 esc to take it back",
};
var SYNC_ITEM_LABELS = {
  projectFiles: "Project files",
  settings: "Settings",
  plugins: "Plugins",
  localTools: "Local tools",
};
var SYNC_ITEM_ORDER = ["projectFiles", "settings", "plugins"];
var tick = figures_default.tick;
var cross = figures_default.cross;
var PENDING_MARK = "\u2026";
var SYNCED_STATUS = {
  mark: "synced",
};
var PENDING_STATUS = {
  mark: "pending",
};
//@ chunk-z7wtv7tg.js:33099-33147 placement
function notSyncedStatus(words) {
  return {
    mark: "not_synced",
    words,
  };
}
//@ chunk-z7wtv7tg.js:33147-33253 placement
function getSyncMark(e) {
  switch (e.mark) {
    case "synced":
      return tick;
    case "pending":
      return PENDING_MARK;
    case "not_synced":
      return cross;
  }
}
//@ chunk-z7wtv7tg.js:33253-33436 placement
function formatSyncItem(e, n) {
  let r = `${getSyncMark(n)} ${e}`;
  switch (n.mark) {
    case "synced":
      return n.note === undefined ? r : `${r} (${n.note})`;
    case "pending":
      return r;
    case "not_synced":
      return `${r} \u2014 ${n.words}`;
  }
}
//@ chunk-z7wtv7tg.js:33436-33594 placement
function buildSyncStatusLines(e) {
  return [
    SYNC_STATUS_HEADING,
    ...SYNC_ITEM_ORDER.flatMap((n) => {
      let r = e[n];
      return r === undefined ? [] : [formatSyncItem(SYNC_ITEM_LABELS[n], r)];
    }),
    ...(e.localTools === undefined ? [] : [formatSyncItem(SYNC_ITEM_LABELS.localTools, e.localTools)]),
  ];
}
//@ chunk-z7wtv7tg.js:33594-33771 placement
/**
 * 把同步状态拼成一行："Synced from this computer:" 加各条目状态，附上关闭期间说明与仓库信任说明。
 */
function formatSyncStatusLine(syncStatusFromRemote) {
  let [n, ...r] = buildSyncStatusLines(syncStatusFromRemote);
  let s = `${n} ${r.join(" \xB7 ")}`;
  let i = repositoryTrustNote(syncStatusFromRemote);
  let k = i === undefined ? s : `${s}. ${i}`;
  let R = describeRepositoryTrust(syncStatusFromRemote);
  if (R === undefined) return k;
  return i === undefined ? `${k}. ${R}.` : `${k} ${R}.`;
}
//@ chunk-z7wtv7tg.js:33771-33794 placement
/**
 * 仓库信任说明：当前构建恒返回 undefined，不做标记。
 */
function repositoryTrustNote(e) {
  return;
}
//@ chunk-z7wtv7tg.js:33794-33916 placement
/**
 * 取同步状态中的仓库信任说明；未设置或无需标记时为 undefined。
 */
function describeRepositoryTrust(e) {
  if (e.repositoryTrust === undefined || e.repositoryTrust === "nothing_to_mark") return;
  return repositoryTrustConsentText(e.repositoryTrust);
}
//@ chunk-z7wtv7tg.js:33916-34071 placement
/**
 * 比较两份同步状态是否相同（关闭时、仓库信任、本地工具与各分项）。
 */
function isSameSyncStatus(cloudSessionSync, n) {
  return (
    cloudSessionSync.whileClosed === n.whileClosed &&
    cloudSessionSync.repositoryTrust === n.repositoryTrust &&
    syncItemListsEqual(cloudSessionSync.localTools, n.localTools) &&
    SYNC_ITEM_ORDER.every((r) => syncItemListsEqual(cloudSessionSync[r], n[r]))
  );
}
//@ chunk-z7wtv7tg.js:34071-34250 placement
/**
 * 计算本地工具同步状态：有上游原因且未开启时显示该原因；开启时显示由本机服务，否则显示未服务本会话。
 */
function getLocalToolsSyncStatus(e, n, r) {
  if (n !== undefined && e?.on !== true) return notSyncedStatus(n);
  if (e === undefined) return;
  return e.on
    ? {
        mark: "synced",
        note: `served by this machine (${e.name})`,
      }
    : notSyncedStatus("not serving this session");
}
//@ chunk-z7wtv7tg.js:34250-34311 placement
function syncItemListsEqual(localTools, localTools_2) {
  return localTools === undefined || localTools_2 === undefined
    ? localTools === localTools_2
    : syncItemsEqual(localTools, localTools_2);
}
//@ chunk-z7wtv7tg.js:34311-34355 placement
function syncItemsEqual(e, n) {
  return formatSyncItem("", e) === formatSyncItem("", n);
}
//@ chunk-z7wtv7tg.js:34355-34579 placement
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
//@ chunk-z7wtv7tg.js:34579-34664 placement
/**
 * 目录同步状态：state 为 absent 且 reason 为 not_offered 时返回 undefined，否则取目录同步状态。
 */
function directorySyncStatusOrUndefined(e, n) {
  return e.state === "absent" && e.reason === "not_offered" ? undefined : getDirectorySyncStatus(e, n);
}
//@ chunk-z7wtv7tg.js:34664-34856 placement
function getDirectorySyncStatus(e, n) {
  switch (e.state) {
    case "seeding":
    case "armed":
      return notSyncedStatus(describeSyncOffReason("off", undefined, n));
    case "absent":
      return notSyncedStatus(describeSyncOffReason(e.state, e.reason, n));
    case "off":
    case "stopped":
      return notSyncedStatus(describeSyncOffReason(e.state, e.reason, n));
  }
}
//@ chunk-z7wtv7tg.js:34856-34879 placement
/**
 * 空函数占位（syncStatus 的回调默认值）。
 */
function noop_2(e) {
  return;
}
//@ chunk-z7wtv7tg.js:34879-34904 placement
/**
 * 空函数占位（syncStatus 的另一个默认回调）。
 */
function noop_3(e) {
  return false;
}
//@ chunk-z7wtv7tg.js:34904-34958 placement
/**
 * 调用参数函数，出错时返回 null（syncStatus 的安全取值）。
 */
function nullOnError_2(origin) {
  return {
    fromUpload: origin?.kind === "bundle",
  };
}
//@ chunk-z7wtv7tg.js:34958-35248 placement
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
//@ chunk-z7wtv7tg.js:35248-35402 placement
function describeSyncOffReason(state, reason, r, s) {
  return (
    (reason !== undefined && Object.hasOwn(ALL_SYNC_REASON_TEXTS, reason)
      ? ALL_SYNC_REASON_TEXTS[reason]
      : undefined) ?? (state === "stopped" ? "sync stopped for this session" : "sync is off for this session")
  );
}
//@ chunk-z7wtv7tg.js:35402-35559 placement
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
//@ chunk-z7wtv7tg.js:35559-36779 placement
function describeProjectFilesSync(e) {
  if (e.kind === "absent") return notSyncedStatus(SETTINGS_ABSENT_TEXTS[e.reason]);
  let { outcome, readBack } = e;
  if (outcome === undefined) return PENDING_STATUS;
  let keptForCredential = outcome.keptForCredential;
  let i = outcome.keptAsLinks === undefined ? [] : [describeKeptLinks(outcome.keptAsLinks)];
  if (outcome.kind === "none") {
    let h = [
      ...(keptForCredential === undefined
        ? []
        : [
            `${describeKeptFiles(keptForCredential)} kept here: ${plural(keptForCredential.others + (keptForCredential.claudeMd ? 1 : 0), "it looks like it holds", "they look like they hold")} a credential`,
          ]),
      ...i,
    ];
    return notSyncedStatus(
      h.length > 0 && outcome.reason === "nothing_to_send"
        ? h.join("; also ")
        : describeUserSettingsSyncState(outcome.reason),
    );
  }
  let k = [
    ...(keptForCredential === undefined ? [] : [`without ${describeKeptFiles(keptForCredential)}`]),
    ...i,
  ];
  let R =
    k.length === 0
      ? SYNCED_STATUS
      : {
          mark: "synced",
          note: k.join("; also "),
        };
  let S =
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
      return S ?? (readBack === undefined ? R : describeSettingsApplyTiming(readBack, R));
    case "deadline":
      return (
        S ??
        (readBack === undefined
          ? notSyncedStatus("the upload took too long")
          : describeSettingsApplyTiming(readBack, R))
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
//@ chunk-z7wtv7tg.js:36779-36914 placement
function describeKeptFiles({ claudeMd, others }) {
  if (!claudeMd) return `${others} ${plural(others, "file")}`;
  return others === 0 ? "CLAUDE.md" : `CLAUDE.md and ${others} more ${plural(others, "file")}`;
}
//@ chunk-z7wtv7tg.js:36914-37099 placement
function describeKeptLinks({ names, more }) {
  let r = more > 0 ? `${names.join(", ")} and ${more} more` : names.join(" and ");
  return names.length + more === 1
    ? `${r} is a link, so it wasn't sent`
    : `${r} are links, so they weren't sent`;
}
//@ chunk-z7wtv7tg.js:37099-37521 placement
function describeSettingsApplyTiming(readBack, n) {
  switch (readBack.verdict) {
    case "applied_before_first_ask":
    case "applied_late":
      return readBack.left === null ? n : notSyncedStatus(HOME_SEED_PARTIAL_REASONS[readBack.left]);
    case "behind":
      return n;
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
//@ chunk-z7wtv7tg.js:37521-38242 placement
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
//@ chunk-z7wtv7tg.js:38242-38944 placement
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
//@ chunk-z7wtv7tg.js:38944-39052 placement
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
//@ chunk-z7wtv7tg.js:39052-39200 placement
var PLUGINS_ABSENT_TEXTS = {
  not_enabled: "not enabled for this account",
  switched_off: "switched off on this machine",
  attach_failed: "could not be sent from this machine",
};
//@ chunk-z7wtv7tg.js:39200-39572 placement
/**
 * 根据插件转发状态给出同步标记：等待中、未转发原因、紧急关闭、准入结果（未启用、拒绝、未同意）或 worker 回复。
 */
function getPluginsSyncStatus(e) {
  if (e.kind === "pending") return PENDING_STATUS;
  if (e.kind === "absent") return notSyncedStatus(PLUGINS_ABSENT_TEXTS[e.reason]);
  let { state } = e;
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
//@ chunk-z7wtv7tg.js:39572-40204 placement
function describePluginsSyncState(e) {
  switch (e) {
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
//@ chunk-z7wtv7tg.js:40204-40332 placement
function getAdmittedPluginsStatus(state) {
  let n = classifyCloudPluginsWorkerReply(state.notice);
  if (n !== undefined) return notSyncedStatus(PLUGINS_WORKER_REPLY_TEXTS[n]);
  return state.notice === undefined && state.gaveUp !== undefined
    ? notSyncedStatus(describePluginsSyncState(state.gaveUp))
    : SYNCED_STATUS;
}
//@ chunk-z7wtv7tg.js:40332-40662 placement
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
//@ chunk-z7wtv7tg.js:40662-40942 placement
/**
 * 由远程会话报告的状态构造同步状态：项目文件、设置、插件、关闭期间状态与仓库信任。
 */
function buildSyncStatusFromRemote(e, n) {
  let directorySync = e.directory_sync;
  return {
    projectFiles: notSyncedStatus(
      describeSyncOffReason(
        directorySync.state === "stopped" ? "stopped" : "off",
        directorySync.reason,
        {
          fromUpload: directorySync.started_from_upload === true,
        },
        n,
      ),
    ),
    settings: getForwardedStatus(e.settings),
    plugins: getForwardedStatus(e.plugins),
    ...getWhileClosedStatus(directorySync),
    ...(e.repository_trust !== undefined && {
      repositoryTrust: e.repository_trust,
    }),
  };
}
//@ chunk-z7wtv7tg.js:40942-41174 placement
function getWhileClosedStatus(directorySync) {
  let n = noop_2(
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
  return n === undefined
    ? {}
    : {
        whileClosed: n,
      };
}
//@ chunk-z7wtv7tg.js:41174-41362 placement
function getForwardedStatus(e) {
  if (e === undefined) return notSyncedStatus("not enabled for this launch");
  if (e.state === "forwarded") return SYNCED_STATUS;
  return notSyncedStatus(
    e.reason !== undefined && returnNull(e.reason)
      ? DEVICE_BINDING_STATUS_TEXTS[e.reason]
      : "not sent from this machine",
  );
}
//@ chunk-z7wtv7tg.js:41362-41404 placement
function returnNull(reason) {
  return Object.hasOwn(DEVICE_BINDING_STATUS_TEXTS, reason);
}
//@ chunk-z7wtv7tg.js:41404-42685 placement
var DEVICE_BINDING_STATUS_TEXTS = {
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
