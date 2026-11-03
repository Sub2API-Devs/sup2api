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
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Zti } from "../../remote/tools/repositoryTrust.js";
import { plural } from "../../utils/stringUtils.js";
import { SEED_UNAUTHORIZED_REASON } from "../../services/homeSeed/writeHomeSettings.js";
import { HOME_SEED_PARTIAL_REASONS } from "../../services/homeSeed/notices.js";
import { classifyCloudPluginsWorkerReply } from "./cloudPlugins.js";

/**
 * 同步状态行的标题、等待提示、条目名与顺序、标记字符与常用状态值。
 */
//@ chunk-z7wtv7tg.js:32703-33099 placement
var SYNC_STATUS_HEADING = "Synced from this computer:",
  WAITING_MESSAGE_TEXTS = {
    files: "A message is waiting \xB7 esc to take it back",
    settings: "A message is waiting for your settings to upload \xB7 esc to take it back",
  },
  SYNC_ITEM_LABELS = {
    projectFiles: "Project files",
    settings: "Settings",
    plugins: "Plugins",
    localTools: "Local tools",
  },
  SYNC_ITEM_ORDER = ["projectFiles", "settings", "plugins"],
  tick = re.tick,
  cross = re.cross,
  PENDING_MARK = "\u2026",
  SYNCED_STATUS = { mark: "synced" },
  PENDING_STATUS = { mark: "pending" };
//@ chunk-z7wtv7tg.js:33099-33147 placement
function L(e) {
  return { mark: "not_synced", words: e };
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
      return n.note === void 0 ? r : `${r} (${n.note})`;
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
      return r === void 0 ? [] : [formatSyncItem(SYNC_ITEM_LABELS[n], r)];
    }),
    ...(e.localTools === void 0 ? [] : [formatSyncItem(SYNC_ITEM_LABELS.localTools, e.localTools)]),
  ];
}
/**
 * 把同步状态拼成一行："Synced from this computer:" 加各条目状态，附上关闭期间说明与仓库信任说明。
 */
//@ chunk-z7wtv7tg.js:33594-33771 placement
function formatSyncStatusLine(e) {
  let [n, ...r] = buildSyncStatusLines(e),
    s = `${n} ${r.join(" \xB7 ")}`,
    i = WAr(e),
    k = i === void 0 ? s : `${s}. ${i}`,
    R = describeRepositoryTrust(e);
  if (R === void 0) return k;
  return i === void 0 ? `${k}. ${R}.` : `${k} ${R}.`;
}
//@ chunk-z7wtv7tg.js:33771-33794 placement
function WAr(e) {
  return;
}
/**
 * 取同步状态中的仓库信任说明；未设置或无需标记时为 undefined。
 */
//@ chunk-z7wtv7tg.js:33794-33916 placement
function describeRepositoryTrust(e) {
  if (e.repositoryTrust === void 0 || e.repositoryTrust === "nothing_to_mark") return;
  return Zti(e.repositoryTrust);
}
/**
 * 比较两份同步状态是否相同（关闭时、仓库信任、本地工具与各分项）。
 */
//@ chunk-z7wtv7tg.js:33916-34071 placement
function isSameSyncStatus(e, n) {
  return (
    e.whileClosed === n.whileClosed &&
    e.repositoryTrust === n.repositoryTrust &&
    nn(e.localTools, n.localTools) &&
    SYNC_ITEM_ORDER.every((r) => nn(e[r], n[r]))
  );
}
/**
 * 计算本地工具同步状态：有上游原因且未开启时显示该原因；开启时显示由本机服务，否则显示未服务本会话。
 */
//@ chunk-z7wtv7tg.js:34071-34250 placement
function getLocalToolsSyncStatus(e, n, r) {
  if (n !== void 0 && e?.on !== !0) return L(n);
  if (e === void 0) return;
  return e.on
    ? { mark: "synced", note: `served by this machine (${e.name})` }
    : L("not serving this session");
}
//@ chunk-z7wtv7tg.js:34250-34311 placement
function nn(e, n) {
  return e === void 0 || n === void 0 ? e === n : Wt(e, n);
}
//@ chunk-z7wtv7tg.js:34311-34355 placement
function Wt(e, n) {
  return formatSyncItem("", e) === formatSyncItem("", n);
}
/**
 * 把会话记录位置映射为未同步原因（not_from_here、lookup_failed、not_opted_in、not_set_up）。
 */
//@ chunk-z7wtv7tg.js:34355-34579 placement
function mapRecordWhereToReason(e) {
  switch (e) {
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
    case void 0:
      return "not_set_up";
  }
}
//@ chunk-z7wtv7tg.js:34579-34664 placement
function Bxs(e, n) {
  return e.state === "absent" && e.reason === "not_offered" ? void 0 : getDirectorySyncStatus(e, n);
}
//@ chunk-z7wtv7tg.js:34664-34856 placement
function getDirectorySyncStatus(e, n) {
  switch (e.state) {
    case "seeding":
    case "armed":
      return L(describeSyncOffReason("off", void 0, n));
    case "absent":
      return L(describeSyncOffReason(e.state, e.reason, n));
    case "off":
    case "stopped":
      return L(describeSyncOffReason(e.state, e.reason, n));
  }
}
//@ chunk-z7wtv7tg.js:34856-34879 placement
function Uho(e) {
  return;
}
//@ chunk-z7wtv7tg.js:34879-34904 placement
function jxs(e) {
  return !1;
}
//@ chunk-z7wtv7tg.js:34904-34958 placement
function uFn(e) {
  return { fromUpload: e?.kind === "bundle" };
}
//@ chunk-z7wtv7tg.js:34958-35248 placement
var NOT_SET_UP_TEXT = "not set up for this session",
  SYNC_REASON_TEXTS = {
    not_opted_in: NOT_SET_UP_TEXT,
    not_from_here: "this session was not started from this folder",
    not_set_up: NOT_SET_UP_TEXT,
    lookup_failed: "this computer could not check its records of this session",
  },
  EXTRA_SYNC_REASON_TEXTS = {},
  ALL_SYNC_REASON_TEXTS = {
    ...SYNC_REASON_TEXTS,
    ...EXTRA_SYNC_REASON_TEXTS,
    seeded_elsewhere: SYNC_REASON_TEXTS.not_from_here,
    not_seeded: SYNC_REASON_TEXTS.not_set_up,
  };
//@ chunk-z7wtv7tg.js:35248-35402 placement
function describeSyncOffReason(e, n, r, s) {
  return (
    (n !== void 0 && Object.hasOwn(ALL_SYNC_REASON_TEXTS, n) ? ALL_SYNC_REASON_TEXTS[n] : void 0) ??
    (e === "stopped" ? "sync stopped for this session" : "sync is off for this session")
  );
}
/**
 * 把"没有项目文件"的结果统一改为 absent/not_sent。
 */
//@ chunk-z7wtv7tg.js:35402-35559 placement
function normalizeNoProjectFiles(e) {
  return (e.kind === "absent" ? e.reason : e.outcome?.kind === "none" ? e.outcome.reason : void 0) ===
    "no_project_files"
    ? { kind: "absent", reason: "not_sent" }
    : e;
}
//@ chunk-z7wtv7tg.js:35559-36779 placement
function describeProjectFilesSync(e) {
  if (e.kind === "absent") return L(SETTINGS_ABSENT_TEXTS[e.reason]);
  let { outcome: outcome, readBack: readBack } = e;
  if (outcome === void 0) return PENDING_STATUS;
  let keptForCredential = outcome.keptForCredential,
    i = outcome.keptAsLinks === void 0 ? [] : [describeKeptLinks(outcome.keptAsLinks)];
  if (outcome.kind === "none") {
    let h = [
      ...(keptForCredential === void 0
        ? []
        : [
            `${describeKeptFiles(keptForCredential)} kept here: ${plural(keptForCredential.others + (keptForCredential.claudeMd ? 1 : 0), "it looks like it holds", "they look like they hold")} a credential`,
          ]),
      ...i,
    ];
    return L(
      h.length > 0 && outcome.reason === "nothing_to_send"
        ? h.join("; also ")
        : describeUserSettingsSyncState(outcome.reason),
    );
  }
  let k = [
      ...(keptForCredential === void 0 ? [] : [`without ${describeKeptFiles(keptForCredential)}`]),
      ...i,
    ],
    R = k.length === 0 ? SYNCED_STATUS : { mark: "synced", note: k.join("; also ") },
    S =
      outcome.settingsRefused === void 0
        ? void 0
        : L(
            outcome.settingsRefused === "self_hosted_runner"
              ? NOT_SENT_SELF_HOSTED_TEXT
              : SETTINGS_REFUSAL_TEXTS[outcome.settingsRefused],
          );
  switch (outcome.outcome) {
    case "sent":
    case "unchanged":
    case "conflict_resolved":
      return S ?? (readBack === void 0 ? R : describeSettingsApplyTiming(readBack, R));
    case "deadline":
      return (
        S ?? (readBack === void 0 ? L("the upload took too long") : describeSettingsApplyTiming(readBack, R))
      );
    case "raced":
      return L("another launch of this session sent its settings first");
    case "not_forwarded_at_create":
      return L(NO_SEND_RECORD_TEXT);
    case "lane_full":
      return L("the session holds as many uploaded files as it may");
    case "unavailable":
      return L("not available for this session");
    case "unauthorized":
      return L(SEED_UNAUTHORIZED_REASON);
    case "failed":
      return L("the upload failed");
    case "aborted":
      return L("the upload was cancelled");
  }
}
//@ chunk-z7wtv7tg.js:36779-36914 placement
function describeKeptFiles({ claudeMd: claudeMd, others: others }) {
  if (!claudeMd) return `${others} ${plural(others, "file")}`;
  return others === 0 ? "CLAUDE.md" : `CLAUDE.md and ${others} more ${plural(others, "file")}`;
}
//@ chunk-z7wtv7tg.js:36914-37099 placement
function describeKeptLinks({ names: names, more: more }) {
  let r = more > 0 ? `${names.join(", ")} and ${more} more` : names.join(" and ");
  return names.length + more === 1
    ? `${r} is a link, so it wasn't sent`
    : `${r} are links, so they weren't sent`;
}
//@ chunk-z7wtv7tg.js:37099-37521 placement
function describeSettingsApplyTiming(e, n) {
  switch (e.verdict) {
    case "applied_before_first_ask":
    case "applied_late":
      return e.left === null ? n : L(HOME_SEED_PARTIAL_REASONS[e.left]);
    case "behind":
      return n;
    case "not_applied":
      return L("the cloud session could not apply them");
    case "stale":
      return L("the cloud session holds a different copy");
    case "not_seen":
      return L("the cloud session has not confirmed them");
    case "unreadable":
      return L("the cloud session's answer could not be read");
  }
}
/**
 * 设置同步状态的说明文案：设置文件被拒原因、紧急关闭、自托管 runner、无发送记录与未发送原因。
 */
//@ chunk-z7wtv7tg.js:37521-38242 placement
var SETTINGS_REFUSAL_TEXTS = {
    schema_rejected: "your settings file has errors",
    settings_too_large: "your settings file is too large",
    settings_unreadable: "your settings file could not be read",
  },
  EMERGENCY_OFF_TEXT = "turned off by Anthropic for now (emergency switch)",
  SELF_HOSTED_RUNNER_TEXT = "your rules don't apply on a self-hosted runner",
  NOT_SENT_SELF_HOSTED_TEXT = `not sent: ${SELF_HOSTED_RUNNER_TEXT}`,
  NO_SEND_RECORD_TEXT = "this machine has no record of sending them to this session",
  SETTINGS_ABSENT_TEXTS = {
    unsupported: "not available in this version",
    not_enabled: "not enabled for this account",
    kept_on_this_machine: "you chose not to send them",
    not_decided: "not decided on this machine yet (/config, for new sessions)",
    launch_keeps_them: "this launch keeps them on this machine",
    not_sent: "not sent with this session",
    no_project_files: "not sent with this session",
  };
//@ chunk-z7wtv7tg.js:38242-38944 placement
function describeUserSettingsSyncState(e) {
  switch (e) {
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
/**
 * 由种子结果构造同步状态：无结果时为 absent（附原因），否则为 seed（结果与回读）。
 */
//@ chunk-z7wtv7tg.js:38944-39052 placement
function toSeedSyncState(e, n, r) {
  return e === void 0 ? { kind: "absent", reason: n } : { kind: "seed", outcome: e.outcome(), readBack: r };
}
//@ chunk-z7wtv7tg.js:39052-39200 placement
var PLUGINS_ABSENT_TEXTS = {
  not_enabled: "not enabled for this account",
  switched_off: "switched off on this machine",
  attach_failed: "could not be sent from this machine",
};
/**
 * 根据插件转发状态给出同步标记：等待中、未转发原因、紧急关闭、准入结果（未启用、拒绝、未同意）或 worker 回复。
 */
//@ chunk-z7wtv7tg.js:39200-39572 placement
function getPluginsSyncStatus(e) {
  if (e.kind === "pending") return PENDING_STATUS;
  if (e.kind === "absent") return L(PLUGINS_ABSENT_TEXTS[e.reason]);
  let { state: state } = e;
  if (state.muted) return L(EMERGENCY_OFF_TEXT);
  if (!state.settled || state.answerPending) return PENDING_STATUS;
  switch (state.admission) {
    case "flag_off":
      return L("not enabled for this account");
    case "opted_out":
      return L("you chose not to send them");
    case "no_consent":
      return L(describePluginsSyncState(state.source));
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
    case void 0:
    case "undecided":
    case "stored":
    case "decided":
      return "run /cloud-plugins to send them";
  }
}
//@ chunk-z7wtv7tg.js:40204-40332 placement
function getAdmittedPluginsStatus(e) {
  let n = classifyCloudPluginsWorkerReply(e.notice);
  if (n !== void 0) return L(PLUGINS_WORKER_REPLY_TEXTS[n]);
  return e.notice === void 0 && e.gaveUp !== void 0 ? L(describePluginsSyncState(e.gaveUp)) : SYNCED_STATUS;
}
/**
 * 插件 worker 回复状态对应的说明文字（拒收、未应用、无可发送、未确认、未能安装等）。
 */
//@ chunk-z7wtv7tg.js:40332-40662 placement
var PLUGINS_WORKER_REPLY_TEXTS = {
  refused_by_worker: "this cloud session does not take plugins",
  not_applied: "the cloud session did not accept them",
  none_to_send: "no plugins to send from this machine",
  not_confirmed: "sent, not confirmed by the session",
  not_installed: "they could not be installed there",
  some_not_installed: "some could not be installed there",
};
/**
 * 由远程会话报告的状态构造同步状态：项目文件、设置、插件、关闭期间状态与仓库信任。
 */
//@ chunk-z7wtv7tg.js:40662-40942 placement
function buildSyncStatusFromRemote(e, n) {
  let directory_sync = e.directory_sync;
  return {
    projectFiles: L(
      describeSyncOffReason(
        directory_sync.state === "stopped" ? "stopped" : "off",
        directory_sync.reason,
        { fromUpload: directory_sync.started_from_upload === !0 },
        n,
      ),
    ),
    settings: getForwardedStatus(e.settings),
    plugins: getForwardedStatus(e.plugins),
    ...getWhileClosedStatus(directory_sync),
    ...(e.repository_trust !== void 0 && { repositoryTrust: e.repository_trust }),
  };
}
//@ chunk-z7wtv7tg.js:40942-41174 placement
function getWhileClosedStatus(e) {
  let n = Uho(
    e.state === "armed"
      ? {
          state: "armed",
          direction: e.direction ?? "pending",
          firstUpload: e.first_upload === void 0 ? null : e.first_upload === "landed" ? "landed" : "pending",
        }
      : { state: e.state },
  );
  return n === void 0 ? {} : { whileClosed: n };
}
//@ chunk-z7wtv7tg.js:41174-41362 placement
function getForwardedStatus(e) {
  if (e === void 0) return L("not enabled for this launch");
  if (e.state === "forwarded") return SYNCED_STATUS;
  return L(
    e.reason !== void 0 && qt(e.reason)
      ? DEVICE_BINDING_STATUS_TEXTS[e.reason]
      : "not sent from this machine",
  );
}
//@ chunk-z7wtv7tg.js:41362-41404 placement
function qt(e) {
  return Object.hasOwn(DEVICE_BINDING_STATUS_TEXTS, e);
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
  Uho,
  getLocalToolsSyncStatus,
  Bxs,
  uFn,
  toSeedSyncState,
  describeProjectFilesSync,
  normalizeNoProjectFiles,
  getPluginsSyncStatus,
  isSameSyncStatus,
  WAITING_MESSAGE_TEXTS,
  WAr,
  describeRepositoryTrust,
  SYNC_STATUS_HEADING,
  SYNC_ITEM_LABELS,
  cross,
  buildSyncStatusFromRemote,
  jxs,
  formatSyncStatusLine,
};
