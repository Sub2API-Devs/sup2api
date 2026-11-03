/**
 * utils/hooks/deviceHooks/cloudRegistration.ts
 *
 * 设备钩子向云会话注册（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (18)
 * attribution: placement 18
 */
import { plural } from "../../stringUtils.js";
import { ControlRequestTimeoutError } from "../../../remote/controlRequestErrors.js";
import { sanitizeDisplayText } from "../../resultError.js";
import { anyPairMatches, collectStickyRoots, stickyRootsFor } from "../../settings/stickyRoots.js";
import { hasAnyHookEntries, DEVICE_HOOK_SCOPES, emptyEligibilityState } from "./eligibility.js";
import { jsonStringify } from "../../slowOperations.js";
import { SETTING_SOURCES } from "../../settings/constants.js";
import { count } from "../../collections.js";
import { isAbsolutePlatformPath } from "../../git.js";
import { stripInvisibleChars } from "../../invisibleChars.js";
import { RegisterDeviceHooksResponseSchema } from "../../../entrypoints/sdk/controlSchemas.js";
import { emptyConsentState, createConsentSignal } from "./consent.js";
import { createSignal } from "../../signal.js";
import { HostScoped } from "../../hostScoped.js";

//@ chunk-s61vbvea.js:341975-342218 placement
var REGISTRATION_LEASE_S = 180;
var REGISTRATION_REFRESH_CHECK_MS = 3000;
var REGISTRATION_TIMEOUT_MS = 120000;
var MAX_UNTEMPLATED_HOOKS = 8;
var UNREGISTER_TIMEOUT_MS = 1500;
var RETRY_REGISTRATION_TIMEOUT_MS = 15000;
var SHORT_REGISTRATION_TIMEOUT_MS = 30000;
var REGISTRATION_RETRY_DELAYS_MS = [2000, 4000, 8000, 16000];
var TRIGGER_DEBOUNCE_MS = 1000;
var RESYNC_DEDUPE_MS = 5000;
var RESYNC_TRIGGER_PRIORITY = {
  settings: 5,
  consent: 4,
  mute: 3,
  worker_up: 3,
  template_fallback: 3,
  stopped_while_running: 3,
  connected: 2,
  retry: 1,
  renewal: 1,
  send: 1,
  init: 0,
};
var MAX_REFUSAL_TEXT_CHARS = 120;
//@ chunk-s61vbvea.js:342218-342452 placement
function hooksStartOutsideProjectNotice(e) {
  return `${e} ${plural(e, "hook")} ${plural(e, "starts", "start")} in an empty folder for cloud sessions. A hook in your user settings marked "cloud": "device" starts in the project instead, where the cloud session can change files.`;
}
//@ chunk-s61vbvea.js:342452-342510 placement
class SupersededError extends Error {
  constructor() {
    super("superseded");
  }
}
//@ chunk-s61vbvea.js:342510-342731 placement
function classifyControlRequestError(error) {
  if (error instanceof ControlRequestTimeoutError) return "timeout";
  let n = error instanceof Error ? error.message : String(error);
  if (n.startsWith("Unsupported control request subtype")) return "unsupported";
  let match = /^([a-z_]+):/.exec(n);
  return match ? match[1] : "failed";
}
//@ chunk-s61vbvea.js:342731-342849 placement
function refusalMessageText(error) {
  let n = error instanceof Error ? error.message : String(error);
  return sanitizeDisplayText(n.replace(/^[a-z_]+:\s*/, ""), {
    maxCodeUnits: MAX_REFUSAL_TEXT_CHARS,
  });
}
//@ chunk-s61vbvea.js:342849-347142 placement
/**
 * 设备钩子云端不可用的原因文案表（功能未开、策略限制、会话类型不支持等），含模板失败与来源说明。
 */
var DEVICE_HOOKS_UNAVAILABLE_TEXTS = {
  flag_off: "the feature is not switched on for your account in the cloud",
  policy: "a managed policy in the cloud session allows only its own hooks",
  disabled: "it is switched off in that cloud environment",
  entrypoint: "this kind of cloud session does not support it",
  not_managed_cloud_worker: "this kind of cloud session does not support it",
  hermetic: "that session is sealed off from outside input",
};
var CLOUD_HOOK_REFUSAL_TEXTS = {
  interpreter_unavailable: "its interpreter is missing in the cloud",
  install_failed: "it could not be installed there",
  event_not_allowed: "it is set on an event or matcher the cloud does not run it under",
  disabled: "cloud-run templates are off there",
  awaiting_upload: "its copy has not reached the cloud yet",
  version_mismatch: "the cloud expects a different copy of it",
  digest_mismatch: "its copy did not arrive intact",
  too_large: "its copy is too large",
  unknown_template: "this cloud session does not know that template",
};
var HOOK_SOURCE_SHORT_LABELS = {
  user: "your user settings.json",
  local: "this folder's .claude/settings.local.json",
  flag: "the --settings file",
};
var SETTINGS_SCOPE_LABELS = {
  userSettings: "your user settings.json",
  projectSettings: "this folder's .claude/settings.json",
  localSettings: "this folder's .claude/settings.local.json",
  flagSettings: "the --settings file",
  policySettings: "the managed settings file",
};
var SENDER_UNVERIFIED_TEXT =
  "Not running this machine's hooks for the cloud session: it hasn't answered and doesn't recognize this machine as a trusted device. To run them, start a session from this machine with claude --cloud.";
var REMOTE_TOOLS_KILL_SWITCH_ON_TEXT =
  "Remote tool serving was turned off by Anthropic (emergency switch). Your hooks are not offered to cloud sessions from this computer until it is turned back on.";
var REMOTE_TOOLS_KILL_SWITCH_OFF_TEXT =
  "Remote tool serving was turned back on by Anthropic. Your hooks are offered to this cloud session again.";
var CHECKOUT_DISABLE_ALL_NOTE =
  "A settings file in this checkout switches all hooks off (disableAllHooks); that holds for this terminal, but not for the cloud session \u2014 this machine's hooks are still offered to it, because the session itself could have written that file. Put disableAllHooks in your user settings to switch them off for cloud sessions too.";
var LOCAL_HOOKS_DISABLED_TEXTS = {
  policy_disable_all:
    "Hooks are switched off on this machine by an org policy (disableAllHooks); nothing from this machine is offered to the cloud session.",
  managed_only:
    "Only managed hooks run on this machine (an org policy, or safe mode); hooks from your own settings are not offered to the cloud session.",
  plugin_only:
    "This machine is restricted to plugin hooks; hooks from your settings files are not offered to the cloud session.",
  bare: "This terminal runs with hooks off (bare mode); nothing from this machine is offered to the cloud session.",
  disabled_by_settings:
    "All hooks are switched off in your user settings or --settings file (disableAllHooks); nothing from this machine is offered to the cloud session.",
  policy_unreadable:
    "This machine's managed policy could not be read, so its hook switches are unknown; nothing from this machine is offered to the cloud session until it can be.",
  untrusted_workspace:
    "This folder is not a trusted workspace; hooks from this machine are not offered to the cloud session started here.",
};
var UNTRUSTED_SOURCE_REASONS = {
  untrusted: "this folder is not marked trusted on this machine",
  repo_provenance:
    "that file is committed to the repository (or its provenance could not be read), so the cloud session's own copy is what applies",
  runtime_patch: "hooks given with --settings cannot be told apart from ones added at run time",
  served_folder:
    "the cloud session this computer serves can write that file, and nobody is at a terminal here to vouch for it",
};
var LOCAL_ONLY_REASON_LABELS = {
  after_edit: "after-edit",
  kind_unsupported: "not a command hook",
  event_runs_locally: "event not forwarded",
  event_later: "event not forwarded",
  event_low_value: "event not forwarded",
  event_container_internal: "event not forwarded",
  source_in_sync_root: "in a settings file the cloud session may change",
  sync_root_is_config_dir: "in a settings file the cloud session may change",
  unverifiable_target: "script unreadable",
  in_reach: "where the cloud session can write",
  interpreter_unvouched: "an interpreter this machine cannot vouch for",
  loads_from_reach: "loads from where the cloud session can write",
  unpinned_command: "not a single script",
  duplicate: "duplicate",
  over_cap: "over the limit",
  pattern_matcher: "a pattern matcher",
  author_skip: 'marked cloud: "skip"',
};
//@ chunk-s61vbvea.js:347142-347271 placement
function describeCloudRefusal(e, n) {
  return (
    (Object.hasOwn(e, n) ? e[n] : undefined) ??
    `the cloud session said "${sanitizeDisplayText(n.replace(/_/g, " "), {
      maxCodeUnits: 60,
    })}"`
  );
}
//@ chunk-s61vbvea.js:347271-347540 placement
function deviceHooksRegistrationState(e, n) {
  switch (e.standing.kind) {
    case "dormant":
      return e.standing.registeredBefore ? "dormant" : "not_registered";
    case "registered":
      return e.lapsesUnusedAt !== null && n >= e.lapsesUnusedAt ? "dormant" : null;
    case "idle":
    case "kept_none":
    case "paused":
    case "stopped":
      return null;
  }
}
//@ chunk-s61vbvea.js:347540-347931 placement
/**
 * 创建设备 hook 发送方的记忆状态：基线、被拒模板、选择加入的固定项等。
 */
function createDeviceHookSenderMemory() {
  return {
    baseline: null,
    baselineLocated: false,
    refusedTemplates: new Set(),
    refusedTemplatesLife: null,
    refusedTemplatesSession: null,
    optInPins: new Map(),
    standing: {
      kind: "idle",
    },
    lapsesUnusedAt: null,
    stickyRoots: new Set(),
    lastSyncRoot: null,
    knownSpellings: new Map(),
    everInReach: new Set(),
    localSettingsLocation: {
      current: null,
    },
    reachBaseline: null,
    pinnedScopes: new Set(),
    commonRoots: null,
    pinnedRoots: new Map(),
  };
}
//@ chunk-s61vbvea.js:347931-348054 placement
function countByValue(e) {
  let n = new Map();
  for (let r of e) n.set(r, (n.get(r) ?? 0) + 1);
  return [...n].map(([r, s]) => `${r} \xD7${s}`).join(", ");
}
//@ chunk-s61vbvea.js:348054-348342 placement
async function isHookScopeInReach(e, n, r) {
  for (let s of n) {
    if (s === "local" || r.everInReach?.has(s)) return true;
    let h = r.scopeSettingsFile(s === "user" ? "userSettings" : "flagSettings");
    if (h === null) continue;
    let y = await r.realpath(h).catch(() => null);
    if (anyPairMatches(y === null ? [h] : [h, y], e) || (y === null && s === "user")) return true;
  }
  return false;
}
//@ chunk-s61vbvea.js:348342-349029 placement
function describeDeviceHookOutcome(e, n) {
  let r = [];
  let s = e.forwarded.length;
  let h =
    n !== undefined && n.ignored > 0
      ? ` \u2014 the cloud session accepted ${n.accepted} and ignored ${n.ignored}`
      : "";
  r.push(
    s === 0
      ? "no hook runs on this machine for the cloud session"
      : `${s} ${plural(s, "hook")} ${plural(s, "runs", "run")} on this machine when the cloud session asks (${countByValue(e.forwarded.map((y) => y.wire.event))})${h}`,
  );
  if (e.held.length > 0)
    r.push(
      `${e.held.length} ${plural(e.held.length, "stays", "stay")} local-only (${countByValue(e.held.map((y) => LOCAL_ONLY_REASON_LABELS[y.reason]))})`,
    );
  if (e.templates.length > 0)
    r.push(
      `${e.templates.length} ${plural(e.templates.length, "runs", "run")} in the cloud (${e.templates.map((template) => template.local.templateId).join(", ")})`,
    );
  return `Hooks \u25B8 ${r.join("; ")}.`;
}
//@ chunk-s61vbvea.js:349029-349106 placement
/**
 * 判断捕获结果是否为"已捕获且有钩子"。
 */
function hasCapturedHooks(e) {
  return e.kind === "captured" && e.sources.some((source) => hasAnyHookEntries(source.hooks));
}
//@ chunk-s61vbvea.js:349106-349224 placement
function captureFingerprint(e) {
  return e.kind === "captured"
    ? jsonStringify(e.sources.map((source) => [source.source, source.settingsFile, source.hooks]))
    : `none:${e.reason}`;
}
//@ chunk-s61vbvea.js:349224-373239 placement
/**
 * 把本机钩子注册到云会话并接收回调（静默、停止、捕获状态）
 */
function DeviceHooksRegistration(e) {
  e.memory.standing = e.servingMuted
    ? {
        kind: "stopped",
        reason: "muted",
      }
    : {
        kind: "idle",
      };
  e.memory.lapsesUnusedAt = null;
  if (e.memory.refusedTemplatesSession !== e.cloudSessionId) {
    e.memory.refusedTemplates.clear();
    e.memory.refusedTemplatesLife = null;
    e.memory.refusedTemplatesSession = e.cloudSessionId;
  }
  let n = new Set();
  let r = {
    number: 0,
    instanceId: e.mintInstanceId(),
    captured: null,
    inventory: null,
    inventoryDirty: true,
  };
  let memory = e.memory;
  if (memory.baseline === null) {
    let ye = e.capture();
    memory.baseline = ye;
    if (ye.kind === "captured") {
      for (let source of ye.sources)
        if (source.settingsFile !== null)
          memory.knownSpellings.set(source.source, new Set([source.settingsFile]));
    }
  }
  let baseline = memory.baseline;
  memory.reachBaseline ??= new Map(SETTING_SOURCES.map((ye) => [ye, e.scopeWriteEntries(ye)]));
  let reachBaseline = memory.reachBaseline;
  memory.commonRoots ??= e.commonWriteRoots();
  let { commonRoots, stickyRoots, refusedTemplates } = memory;
  let x = null;
  let P = null;
  let j = REGISTRATION_LEASE_S;
  let G = {};
  let L = new Set();
  let q = false;
  let Q = null;
  let Z = e.servingMuted ? "stopped" : "idle";
  let ee = e.servingMuted ? "muted" : undefined;
  let servingMuted = e.servingMuted;
  let se = false;
  let re = false;
  let he = null;
  let Se = null;
  let ce = false;
  let we = null;
  let ie = false;
  let Ee = false;
  let Ie = false;
  let ke = 0;
  let Me = false;
  let registeredBefore = false;
  let nt = (instanceId, Xe) => {
    ke = e.now() + Xe.lease_s * 1000;
    Me = Xe.templates.length > 0;
    registeredBefore = true;
    Je(instanceId);
  };
  let Be = [];
  let Re = (ye) => Be.filter((Xe) => Xe.withTemplates || ye < Xe.mayBeHeldUntil);
  let Ne = (instanceId, Xe, ot) => {
    let pt = e.now() + ot + j * 1000;
    if (instanceId === Q?.instanceId) ke = Math.max(ke, pt);
    let Ot = e.now();
    let mt = [
      ...Be.filter((et) => et.instanceId !== instanceId && (et.withTemplates || Ot < et.mayBeHeldUntil)),
      {
        instanceId,
        withTemplates: Xe || Be.some((et) => et.instanceId === instanceId && et.withTemplates),
        mayBeHeldUntil: pt,
      },
    ];
    Be = [
      ...mt.filter((et) => et.withTemplates),
      ...mt.filter((et) => !et.withTemplates).slice(-MAX_UNTEMPLATED_HOOKS),
    ];
  };
  let Je = (instanceId) => {
    Be = Be.filter((Xe) => Xe.instanceId !== instanceId);
  };
  let lt = null;
  let Ae = 0;
  let ze = 0;
  let gt = 0;
  let Nt = null;
  let An = null;
  let ln = false;
  let yt = null;
  let At = false;
  let { knownSpellings, everInReach } = memory;
  let br = new Map();
  let pn = false;
  let abortController = new AbortController();
  let wr = new Set();
  let or = null;
  let jr = null;
  let Ec = null;
  let xc = null;
  let VR = () => jr;
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  let lastOutcome = null;
  let Tc = 0;
  let vc = false;
  let bo = null;
  let wo = 0;
  let ko = false;
  let Cc = new Set();
  let YR =
    e.formatClock ??
    ((ye) =>
      new Date(ye).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }));
  let qR = "run /hooks to change that";
  let Ac = () => {
    Et(
      "declined",
      `Hooks stay on this machine only \u2014 you chose not to run them for cloud sessions (${qR}).`,
      "debug",
    );
    kr("declined");
  };
  let Et = (ye, line, level = "info") => {
    if (wr.has(ye)) return;
    wr.add(ye);
    e.onLine({
      line,
      level,
    });
  };
  let Bp = () => Et("checkout-disable-all", CHECKOUT_DISABLE_ALL_NOTE, "warning");
  let jp = () => {
    if (baseline === null || !hasCapturedHooks(baseline)) return;
    wr.delete("unmuted");
    Et("muted", REMOTE_TOOLS_KILL_SWITCH_ON_TEXT);
    re = true;
  };
  let XR = () => {
    if (!re || jr === "declined") return;
    re = false;
    Et("unmuted", REMOTE_TOOLS_KILL_SWITCH_OFF_TEXT);
  };
  let Qt = (
    ye,
    trigger,
    ot = {
      accepted: 0,
      ignored: 0,
    },
    pt = r,
  ) => {
    let inventory = pt.inventory;
    lastOutcome = ye;
    let mt = {};
    for (let et of inventory?.held ?? []) mt[et.reason] = (mt[et.reason] ?? 0) + 1;
    e.telemetry({
      outcome: ye,
      trigger,
      forwarded: inventory?.forwarded.length ?? 0,
      templates: inventory?.templates.length ?? 0,
      heldAfterEdit: inventory?.heldCounts.after_edit ?? 0,
      heldOther: inventory === null ? 0 : count(inventory.held, (et) => et.reason !== "after_edit"),
      heldByReason: mt,
      accepted: ot.accepted,
      ignored: ot.ignored,
      attempt: Tc,
      afterFlagsUnanswered: vc,
    });
    if (
      ye === "registered" ||
      ye === "unregistered" ||
      ye === "nothing_to_offer" ||
      ye === "no_consent" ||
      ye === "dormant"
    )
      Tc = 0;
  };
  let Ki = () => {
    we?.clear();
    we = null;
    ie = false;
    memory.lapsesUnusedAt = null;
    Ie = false;
    lt?.clear();
    lt = null;
  };
  let vs = (instanceId, timeoutMs) =>
    e
      .sendRequest(
        {
          subtype: "register_device_hooks",
          instance_id: instanceId,
          display_name: e.displayName,
          ...(x !== null && {
            worker_epoch: x,
          }),
          hooks: [],
          templates: [],
        },
        {
          timeoutMs,
        },
      )
      .then(
        () => {},
        () => {},
      );
  let Wr = async (ye) => {
    let Xe = Q;
    let ot = e.now();
    let pt = (instanceId) => he !== null && he.sent && he.instanceId === instanceId;
    let Ot = Xe !== null && pt(Xe.instanceId);
    let mt = Xe !== null && Re(ot).some((ut) => ut.instanceId === Xe.instanceId);
    let et = ke !== 0 && ot >= ke && !Me && !Ot && !mt;
    P = null;
    Q = null;
    ie = false;
    memory.lapsesUnusedAt = null;
    if (Z !== "stopped") {
      Z = "idle";
      memory.standing = {
        kind: "idle",
      };
    }
    let filtered = Re(ot).filter((ut) => ut.instanceId !== Xe?.instanceId && !pt(ut.instanceId));
    Be = Be.filter((ut) => pt(ut.instanceId));
    await Promise.all([
      ...filtered.map((ut) => vs(ut.instanceId, ye)),
      Xe === null || et ? undefined : vs(Xe.instanceId, ye),
    ]);
  };
  let kr = (ye) => {
    Z = "stopped";
    memory.standing = {
      kind: "stopped",
      reason: ye,
    };
    ee = ye;
    Ki();
    P = null;
    if (ye !== "muted") e.arm(null);
    Wr(UNREGISTER_TIMEOUT_MS);
  };
  let Vi = () => {
    n.add(r.instanceId);
    r = {
      number: r.number + 1,
      instanceId: e.mintInstanceId(),
      captured: null,
      inventory: null,
      inventoryDirty: true,
    };
  };
  let Gp = (ye) => {
    P = null;
    Z = "idle";
    memory.standing = {
      kind: "paused",
    };
    we?.clear();
    we = null;
    lt?.clear();
    lt = null;
    ze = 0;
    ie = false;
    memory.lapsesUnusedAt = null;
    or = null;
    wo = e.now() + Math.max(30000, j * 500);
    e.arm(null);
    Et(`lapse:${ye}`, ye, "warning");
    Cc.add(`lapse:${ye}`);
  };
  let Wp = () => {
    we?.clear();
    we = e.setTimer(
      () => {
        we = null;
        if (zr()) return;
        if (Ee || Ie) {
          qn("renewal");
          return;
        }
        ie = true;
        memory.lapsesUnusedAt = P;
      },
      Math.max(30000, j * 500),
    );
  };
  let Pc = () => {
    zr();
    Ee = true;
    if (ie && Z === "registered") {
      ie = false;
      memory.lapsesUnusedAt = null;
      qn("renewal");
    } else if (memory.standing.kind === "dormant" && he === null) qn("init", false);
  };
  let zp = () =>
    !Ee &&
    !Ie &&
    ((ie && Z === "registered") ||
      memory.standing.kind === "dormant" ||
      (Z === "registered" && P !== null && e.now() >= P - j * 500));
  let Xi = () => Re(e.now()).length === 0 && (Q === null || (ke !== 0 && e.now() >= ke && !Me));
  let Kp = () => {
    ln = true;
    memory.lapsesUnusedAt = null;
    if (memory.standing.kind === "dormant")
      memory.standing = {
        kind: "idle",
      };
    e.arm(null);
  };
  let Oc = (ye, Xe, ot = false) => {
    Qt("dormant", ye, undefined, Xe);
    Ki();
    ze = 0;
    Ee = false;
    P = null;
    x = null;
    Z = "idle";
    memory.standing = {
      kind: "dormant",
      registeredBefore,
      ...(ot && {
        senderUnverified: ot,
      }),
    };
    e.arm(null);
  };
  let zr = (ye = "renewal") => {
    if (
      pn ||
      At ||
      he !== null ||
      (lt !== null && e.now() - Ae < Math.max(30000, j * 500)) ||
      Z !== "registered" ||
      P === null ||
      e.now() < P
    )
      return false;
    Oc(ye);
    return true;
  };
  let Ic = () => {
    let ye = REGISTRATION_RETRY_DELAYS_MS[ze];
    if (ye === undefined) {
      ze = 0;
      return false;
    }
    ze += 1;
    lt?.clear();
    let Xe = e.now() + ye;
    Ae = Xe;
    lt = e.setTimer(() => {
      lt = null;
      if (e.now() - Xe >= Math.max(30000, j * 500)) {
        ze = 0;
        if (!zr() && Z === "idle" && !pn && !At) Oc("retry");
        return;
      }
      qn("retry");
    }, ye);
    return true;
  };
  let hn = (ye) => {
    if (pn || At || ye.number !== r.number) throw new SupersededError();
  };
  let Mc = async (ye) => {
    let Xe = await e.realpath(e.projectRoot).catch(() => e.projectRoot);
    await collectStickyRoots({
      stickyRoots,
      pinnedScopes: memory.pinnedScopes,
      pinnedRoots: memory.pinnedRoots,
      baseRoots: [
        ...stickyRootsFor({
          launchDir: e.launchDir,
          launchDirReal: await e.launchDirReal(),
          ...(ye !== null && {
            syncRoot: ye.root,
            syncRootReal: ye.real,
          }),
        }),
        ...[e.projectRoot, Xe].filter(isAbsolutePlatformPath),
      ],
      reachBaseline,
      scopeSettingsFile: e.scopeSettingsFile,
      realpath: e.realpath,
      commonRoots: () => commonRoots,
      scopeRoots: e.scopeWriteRoots,
    });
    for (let pinnedScope of memory.pinnedScopes)
      if (
        !wr.has(`reach:${pinnedScope}`) &&
        jsonStringify(e.scopeWriteEntries(pinnedScope)) !==
          jsonStringify(reachBaseline.get(pinnedScope) ?? [])
      ) {
        Et(
          `reach:${pinnedScope}`,
          `The places Claude may write in ${SETTINGS_SCOPE_LABELS[pinnedScope]} changed during this cloud session. Because the cloud session can write that file, this session keeps judging which of this machine's hooks it may run by what the file held when you launched \u2014 restart claude --cloud to apply your edit. If neither you nor another session on this machine changed it, the cloud session may have: check that file before relaunching, since a relaunch trusts whatever it says.`,
          "warning",
        );
        e.reachPinnedTelemetry?.(pinnedScope);
      }
    return [...stickyRoots];
  };
  let JR = (ye, Xe) =>
    isHookScopeInReach(ye, Xe, {
      realpath: e.realpath,
      scopeSettingsFile: e.scopeSettingsFile,
      everInReach,
    });
  let QR = async (ye, Xe) => {
    let baseline = memory.baseline;
    if (baseline === null) return ye;
    if (ye.kind === "none") {
      if (
        ye.reason === "disabled_by_settings" &&
        baseline.kind === "captured" &&
        (await JR(Xe, ye.switchSources ?? ["user", "flag"]))
      ) {
        if (hasCapturedHooks(baseline))
          Et(
            "none:settings",
            "All hooks were switched off in a settings file during this cloud session; for the cloud session this machine keeps the hooks it had when you launched \u2014 restart claude --cloud to apply the change. If you did not change it, the cloud session may have.",
            "warning",
          );
        return baseline;
      }
      return ye;
    }
    if (baseline.kind === "none" && baseline.reason === "disabled_by_settings") {
      if (hasCapturedHooks(ye))
        Et(
          "none:lifted",
          "All hooks were switched off in a settings file when this cloud session started and that switch has since been removed; for the cloud session this machine keeps them off \u2014 restart claude --cloud to offer them. If you did not change it, the cloud session may have.",
          "warning",
        );
      return baseline;
    }
    let sources = baseline.kind === "captured" ? baseline.sources : [];
    let Ot = async (ut, Zt) => {
      let yn = knownSpellings.get(ut) ?? new Set();
      if (Zt !== null) {
        yn.add(Zt);
        await e.realpath(Zt).then(
          (xr) => yn.add(xr),
          () => everInReach.add(ut),
        );
      }
      knownSpellings.set(ut, yn);
      return [...yn];
    };
    let mt = new Map(ye.sources.map((source) => [source.source, source]));
    let et = [];
    for (let ut of DEVICE_HOOK_SCOPES) {
      let Zt = mt.get(ut) ?? null;
      let yn = sources.find((source) => source.source === ut) ?? null;
      let xr = Zt?.settingsFile ?? yn?.settingsFile ?? null;
      let Qi = await Ot(ut, xr);
      let Wt = everInReach.has(ut) || anyPairMatches(Qi, Xe);
      if (Wt) everInReach.add(ut);
      if (!Wt) {
        if (Zt !== null) et.push(Zt);
        continue;
      }
      let Eo = xr === null ? HOOK_SOURCE_SHORT_LABELS[ut] : stripInvisibleChars(xr);
      if (yn === null) {
        if (Zt !== null) {
          Et(
            `appeared:${ut}`,
            `A hooks file appeared at ${Eo} during this cloud session, where the session itself can write; it is ignored for this session.`,
            "warning",
          );
          e.sourcePinnedTelemetry?.({
            source: ut,
            changed: false,
            appeared: true,
            vanished: false,
          });
        }
        continue;
      }
      if (Zt === null || jsonStringify(Zt.hooks) !== jsonStringify(yn.hooks)) {
        Et(
          `pinned:${ut}`,
          ut === "local"
            ? `Hooks changed in ${Eo}, which the cloud session can write. The change is ignored for this session. Check the file, then restart claude --cloud.`
            : `${Eo} changed during this cloud session. If neither you nor another session on this machine changed it, the cloud session may have: check that file before relaunching.`,
          "warning",
        );
        e.sourcePinnedTelemetry?.({
          source: ut,
          changed: true,
          appeared: false,
          vanished: Zt === null,
        });
      }
      et.push(yn);
    }
    let jt = new Set(et.map((ut) => ut.source));
    return {
      ...ye,
      sources: et,
      withheld: ye.withheld.filter((ut) => !jt.has(ut.source)),
    };
  };
  let Vp = async (ye) => {
    if (ye.inventory !== null && !ye.inventoryDirty) return ye.inventory;
    let Xe = await e.syncRoot();
    hn(ye);
    memory.lastSyncRoot = Xe;
    let ot = await Mc(Xe);
    hn(ye);
    if (ye.captured === null) {
      let et = e.capture();
      baseline = et;
      An = captureFingerprint(et);
      memory.baseline ??= et;
      let baseline_2 = memory.baseline;
      if (!memory.baselineLocated && baseline_2.kind === "captured") {
        memory.baselineLocated = true;
        for (let source of baseline_2.sources)
          if (source.settingsFile !== null) {
            let Zt = knownSpellings.get(source.source) ?? new Set();
            Zt.add(source.settingsFile);
            await e.realpath(source.settingsFile).then(
              (yn) => Zt.add(yn),
              () => everInReach.add(source.source),
            );
            knownSpellings.set(source.source, Zt);
            if (anyPairMatches([...Zt], ot)) everInReach.add(source.source);
          }
        hn(ye);
      }
      ye.captured = et === memory.baseline ? et : await QR(et, ot);
      hn(ye);
    }
    let inventory = await e.buildInventory({
      captured: ye.captured,
      instanceId: ye.instanceId,
      syncRoot: Xe,
      reachRoots: ot,
      withoutTemplates: refusedTemplates,
    });
    hn(ye);
    ye.inventory = inventory;
    let Ot = await e.ensureConsent(null, abortController.signal, ot);
    hn(ye);
    Ec = Ot === "declined";
    if (Ec) return inventory;
    ye.inventoryDirty = false;
    for (let notice of inventory.notices) Et(`notice:${notice}`, notice);
    let mt =
      e.servicerDefaults.unmarkedStartFolder === "private"
        ? count(inventory.forwarded, (et) => et.local.hook.type === "command" && et.local.cloudOptIn !== true)
        : 0;
    if (mt > 0) Et("start-outside-project", hooksStartOutsideProjectNotice(mt));
    if (ye.captured.kind === "captured") {
      for (let { source, reason } of ye.captured.withheld)
        Et(
          `withheld:${source}:${reason}`,
          `Hooks from ${HOOK_SOURCE_SHORT_LABELS[source]} are not offered to the cloud session: ${UNTRUSTED_SOURCE_REASONS[reason]}.`,
        );
      if (
        (ye.captured.checkoutDisablesAllHooks && hasCapturedHooks(ye.captured)) ||
        (baseline?.kind === "captured" && baseline.checkoutDisablesAllHooks && hasCapturedHooks(baseline))
      )
        Bp();
    } else Et(`none:${ye.captured.reason}`, LOCAL_HOOKS_DISABLED_TEXTS[ye.captured.reason]);
    return inventory;
  };
  let ZR = async (ye, inventory, ot, launchDirReal) => {
    let cloudWritableRoots = await Mc(await e.syncRoot());
    hn(ye);
    if (jr === "declined") return;
    e.arm({
      instanceId: ye.instanceId,
      retiredInstanceIds: new Set(n),
      displayName: e.displayName,
      cloudSessionId: e.cloudSessionId,
      inventory,
      roots: {
        containerProjectDir: ot.project_dir,
        containerCwd: ot.cwd,
        deviceLaunchDir: e.launchDir,
      },
      frame: {
        launchDir: e.launchDir,
        projectRoot: e.launchDir,
        cloudSessionId: e.cloudSessionId,
      },
      launchDirReal,
      cloudWritableRoots,
      ...e.servicerDefaults,
    });
  };
  let ex = async (ye, Xe) => {
    if (q) return false;
    let ot = false;
    for (let template of Xe.templates) {
      let Ot = `${template.wire.template}:${template.wire.digest}`;
      if (L.has(Ot)) continue;
      try {
        await e.sendRequest(
          {
            subtype: "upload_device_hook_template",
            template: template.wire.template,
            digest: template.wire.digest,
            content_base64: template.local.bytes.toString("base64"),
            ...(x !== null && {
              worker_epoch: x,
            }),
          },
          {
            timeoutMs: P === null || e.now() >= P ? REGISTRATION_TIMEOUT_MS : SHORT_REGISTRATION_TIMEOUT_MS,
          },
        );
        hn(ye);
        L.add(Ot);
      } catch (error) {
        if (error instanceof SupersededError) throw error;
        hn(ye);
        let et = classifyControlRequestError(error);
        if (et === "unsupported") {
          q = true;
          for (let template of Xe.templates) refusedTemplates.add(template.local.templateId);
          Et(
            "template:unsupported",
            `This cloud session cannot take hook templates (${Xe.templates.map((template) => template.local.templateId).join(", ")}); they stay on this machine for it.`,
          );
          return Xe.templates.length > 0;
        }
        if (et === "template_refused" || et === "invalid_upload") {
          Et(
            `template:${template.local.templateId}:${et}`,
            `${template.local.templateId} could not be moved to the cloud (${describeCloudRefusal(CLOUD_HOOK_REFUSAL_TEXTS, refusalMessageText(error))}); it runs on this machine instead.`,
          );
          refusedTemplates.add(template.local.templateId);
          ot = true;
          continue;
        }
        throw error;
      }
    }
    return ot;
  };
  let tx = async (ye, Xe, ot, onEchoed) => {
    let Ot = e.hookFlags();
    if (Ot === "unanswered") {
      if (!vc) {
        vc = true;
        Qt("flag_unanswered", Xe);
      }
      return;
    }
    if (Ot === "answered_off") {
      Qt("flag_off", Xe);
      Et(
        "flag_off",
        "Hooks from this machine are not offered to this cloud session: the feature is not switched on for your account.",
        "debug",
      );
      kr("flag_off");
      return;
    }
    Tc += 1;
    let inventory = await Vp(ye);
    if (inventory.forwarded.length === 0 && inventory.templates.length === 0 && (Q !== null || !Xi())) {
      Qt("unregistered", Xe);
      we?.clear();
      we = null;
      or = null;
      e.arm(null);
      await Wr(RETRY_REGISTRATION_TIMEOUT_MS);
      return;
    }
    if (inventory.forwarded.length === 0 && inventory.templates.length === 0 && P === null) {
      Kp();
      Qt("nothing_to_offer", Xe);
      if (inventory.held.length > 0)
        Et(`summary:${describeDeviceHookOutcome(inventory)}`, describeDeviceHookOutcome(inventory), "debug");
      return;
    }
    ce = false;
    let et = await e.ensureConsent(
      {
        forwarded: inventory.forwarded.length,
        templateNames: inventory.templates.map((template) => template.local.templateId),
      },
      abortController.signal,
      await Mc(await e.syncRoot()),
    );
    hn(ye);
    if (et !== "accepted") {
      if (et !== "distrusted" || xc !== "distrusted")
        Qt(et === "distrusted" ? "consent_distrusted" : "no_consent", Xe);
      xc = et;
      if (et === "declined") {
        Ac();
        return;
      }
      ln = et === "not_now";
      we?.clear();
      we = null;
      ie = false;
      P = null;
      memory.lapsesUnusedAt = null;
      if (memory.standing.kind === "dormant")
        memory.standing = {
          kind: "idle",
        };
      or = null;
      e.arm(null);
      if (Q !== null || !Xi()) await Wr(RETRY_REGISTRATION_TIMEOUT_MS);
      hn(ye);
      if (et === "distrusted") Wp();
      return;
    }
    ln = false;
    xc = "accepted";
    if (await ex(ye, inventory)) {
      ye.inventoryDirty = true;
      if (Q?.instanceId === ye.instanceId) {
        hn(ye);
        Ji();
        Se = "template_fallback";
        throw new SupersededError();
      }
      inventory = await Vp(ye);
    }
    let mapped = inventory.templates
      .filter((template) => !refusedTemplates.has(template.local.templateId))
      .map((template) => template.wire);
    if (inventory.forwarded.length === 0 && mapped.length === 0) {
      if (Q !== null || !Xi()) {
        Qt("unregistered", Xe);
        we?.clear();
        we = null;
        or = null;
        e.arm(null);
        await Wr(RETRY_REGISTRATION_TIMEOUT_MS);
        return;
      }
      if (P === null) {
        Kp();
        Qt("nothing_to_offer", Xe);
        return;
      }
    }
    hn(ye);
    let launchDirReal = await e.launchDirReal();
    hn(ye);
    let Zt =
      Xe !== "retry" && (P === null || e.now() >= P)
        ? REGISTRATION_TIMEOUT_MS
        : RETRY_REGISTRATION_TIMEOUT_MS;
    if (he?.instanceId === ye.instanceId) {
      he.sent = true;
      he.listenMs = Zt;
      Ne(ye.instanceId, mapped.length > 0, Zt);
    }
    let yn = await e.sendRequest(
      {
        subtype: "register_device_hooks",
        instance_id: ye.instanceId,
        display_name: e.displayName,
        lease_s: REGISTRATION_LEASE_S,
        ...(x !== null && {
          worker_epoch: x,
        }),
        hooks: inventory.forwarded.map((ht) => ht.wire),
        templates: mapped,
        held: {
          after_edit: inventory.heldCounts.after_edit,
          kind_unsupported: inventory.heldCounts.kind_unsupported,
          other: inventory.heldCounts.other,
        },
      },
      {
        timeoutMs: Zt,
        onEchoed,
      },
    );
    let xr = yt !== null && (yt.instanceId === undefined || yt.instanceId === ye.instanceId) ? yt : null;
    if (xr !== null) {
      yt = null;
      let ht = RegisterDeviceHooksResponseSchema().safeParse(yn);
      Q =
        ht.success && ht.data.status === "registered"
          ? {
              instanceId: ye.instanceId,
            }
          : null;
      if (ht.success) {
        x = ht.data.worker_epoch;
        Je(ye.instanceId);
        if (ht.data.status === "registered") nt(ye.instanceId, ht.data);
      }
      await Wr(xr.budgetMs);
      return;
    }
    if (ye.number !== r.number) {
      let ht = RegisterDeviceHooksResponseSchema().safeParse(yn);
      if (ht.success) Je(ye.instanceId);
      if (ht.success && ht.data.status === "registered") {
        Q = {
          instanceId: ye.instanceId,
        };
        x = ht.data.worker_epoch;
        nt(ye.instanceId, ht.data);
      }
    }
    hn(ye);
    let Qi = RegisterDeviceHooksResponseSchema().safeParse(yn);
    if (!Qi.success) {
      Qt("invalid", Xe);
      Et(
        "invalid_reply",
        "The cloud session answered the hook registration in a form this version of Claude Code cannot read (try claude update); hooks from this machine won't run for it.",
        "warning",
      );
      if (Q?.instanceId !== ye.instanceId) {
        Je(ye.instanceId);
        await vs(ye.instanceId, UNREGISTER_TIMEOUT_MS).catch(() => {});
      }
      kr("invalid");
      return;
    }
    let Wt = Qi.data;
    ze = 0;
    lt?.clear();
    lt = null;
    if (Se === "retry") Se = null;
    gt = 0;
    ko = false;
    if (Nt !== null && Nt !== Wt.worker_epoch) {
      L.clear();
      br.clear();
      q = false;
      if (Xe !== "init") Ie = false;
    }
    let Eo = `${e.cloudSessionId}\x00${Wt.worker_epoch}`;
    if (
      memory.refusedTemplatesLife !== null &&
      memory.refusedTemplatesLife !== Eo &&
      refusedTemplates.size > 0
    ) {
      refusedTemplates.clear();
      ye.inventoryDirty = true;
    }
    memory.refusedTemplatesLife = Eo;
    Nt = Wt.worker_epoch;
    x = Wt.worker_epoch;
    let Nc = (templates) => {
      let Xp = new Set(mapped.map((tn) => tn.template));
      let Kr = false;
      for (let tn of templates) {
        if (!Xp.has(tn.template)) continue;
        if (tn.status === "installed") br.delete(tn.template);
        if (tn.status === "awaiting_upload") {
          let Qp = (br.get(tn.template) ?? 0) + 1;
          br.set(tn.template, Qp);
          if (Qp >= 2) {
            refusedTemplates.add(tn.template);
            Et(
              `fallback:${tn.template}:awaiting_twice`,
              `${tn.template} could not be handed to this cloud session (it kept asking for the copy); it runs on this machine instead.`,
            );
            ye.inventoryDirty = true;
            Kr = true;
            continue;
          }
          for (let em of [...L]) if (em.startsWith(`${tn.template}:`)) L.delete(em);
          Kr = true;
        } else if (tn.status !== "installed") {
          br.delete(tn.template);
          refusedTemplates.add(tn.template);
          Et(
            `fallback:${tn.template}:${tn.status}`,
            `${tn.template} cannot run in this cloud session (${describeCloudRefusal(CLOUD_HOOK_REFUSAL_TEXTS, tn.status)}); it runs on this machine instead.`,
          );
          ye.inventoryDirty = true;
          Kr = true;
        }
      }
      return Kr;
    };
    if (Wt.status === "unregistered") {
      let ht = inventory.forwarded.length + mapped.length > 0;
      Je(ye.instanceId);
      P = null;
      we?.clear();
      we = null;
      ie = false;
      memory.lapsesUnusedAt = null;
      Z = "idle";
      memory.standing = {
        kind: "idle",
      };
      Q = null;
      or = null;
      ln = true;
      G = Object.fromEntries((Wt.templates ?? []).map((Kr) => [Kr.template, Kr.status]));
      Qt("unregistered", Xe);
      e.arm(null);
      if (Nc(Wt.templates ?? [])) {
        if (ye.inventoryDirty) Ji();
        Se = "template_fallback";
      } else if (ht) {
        memory.standing = {
          kind: "kept_none",
        };
        Et(
          "kept_none",
          "The cloud session kept none of this machine's hooks (it ignored every entry offered); they won't run for it.",
          "warning",
        );
      }
      return;
    }
    wr.delete("kept_none");
    for (let ht of Cc) wr.delete(ht);
    Cc.clear();
    wo = 0;
    ko = false;
    P = e.now() + Wt.lease_s * 1000;
    nt(ye.instanceId, Wt);
    Ee = false;
    ie = false;
    memory.lapsesUnusedAt = null;
    j = Wt.lease_s;
    Q = {
      instanceId: ye.instanceId,
    };
    G = Object.fromEntries(Wt.templates.map((template) => [template.template, template.status]));
    Z = "registered";
    memory.standing = {
      kind: "registered",
    };
    let ea = {
      accepted: Wt.accepted,
      ignored: Wt.ignored,
    };
    Qt("registered", Xe, ea);
    XR();
    if (jr === "declined") {
      Ac();
      return;
    }
    Wp();
    if (!ce) {
      await ZR(ye, inventory, Wt, launchDirReal);
      if (VR() === "declined") {
        Ac();
        return;
      }
    }
    let Fc = Wt.away_since === undefined ? null : Date.parse(Wt.away_since);
    if (Fc !== null && !Number.isNaN(Fc) && bo === null) {
      e.onLine({
        line: `The cloud session stopped running this machine's hooks at ${YR(Fc)} after two went unanswered in a row; it is asking again now.`,
        level: "warning",
      });
      e.lapseTelemetry?.("away_since");
    }
    if (bo !== null && bo <= ot) bo = null;
    if (Wt.replaced_owner !== undefined && !n.has(Wt.replaced_owner) && Wt.replaced_owner !== ye.instanceId)
      Et(
        `replaced:${Wt.replaced_owner}`,
        "This window now runs your hooks for the cloud session (another attached window did until now).",
        "debug",
      );
    let Hc = describeDeviceHookOutcome(inventory, ea);
    if (Hc !== or) {
      or = Hc;
      e.onLine({
        line: Hc,
        level: "debug",
      });
    }
    for (let template of inventory.templates)
      if (template.local.label === "legacy" && !refusedTemplates.has(template.local.templateId))
        Et(
          `legacy:${template.local.templateId}`,
          `${template.local.templateId} on this machine is an older copy; the cloud runs that copy \u2014 update it for fixes.`,
        );
    if (Nc(Wt.templates)) {
      if (ye.inventoryDirty) Ji();
      Se = "template_fallback";
    }
  };
  let Ji = () => {
    n.add(r.instanceId);
    r = {
      number: r.number + 1,
      instanceId: e.mintInstanceId(),
      captured: r.captured,
      inventory: null,
      inventoryDirty: true,
    };
  };
  let qn = (ye, Xe = true) => {
    if (ye === "consent" && jr === "accepted" && Z === "stopped" && ee === "declined" && !pn && !At) {
      Z = "idle";
      memory.standing = {
        kind: "idle",
      };
      ee = undefined;
      or = null;
      wr.delete("declined");
      Vi();
      if (servingMuted) {
        Z = "stopped";
        ee = "muted";
        memory.standing = {
          kind: "stopped",
          reason: "muted",
        };
      }
    }
    if (pn || At) return;
    if (Z === "stopped") {
      if (ee === "muted" && !se) {
        se = true;
        jp();
        Qt("muted", ye);
      }
      return;
    }
    if (Xe && (ye === "init" || ye === "send")) {
      zr(ye);
      if (ye === "init") Ie = true;
      Ee = true;
      ie = false;
      memory.lapsesUnusedAt = null;
    }
    if (ye === "stopped_while_running" && bo === null) {
      bo = e.now();
      e.onLine({
        line: "The cloud session stopped waiting for a hook still running on this machine (deadline passed or turn interrupted) and went on without its answer; checking that its hooks are still offered.",
        level: "warning",
      });
      e.lapseTelemetry?.("withdrawn_while_running");
    }
    if (ye === "connected" || ye === "consent") ln = false;
    if (ye === "worker_up") {
      if (e.now() - NEGATIVE_INFINITY < RESYNC_DEDUPE_MS) return;
      if (ln && memory.standing.kind === "kept_none") ln = false;
      if (ln) return;
      x = null;
      ko = false;
      wo = 0;
    }
    if (ye === "init" && ko) {
      ko = false;
      wo = 0;
    } else if (
      (ye === "init" && (ln || e.now() < wo)) ||
      ((ye === "init" || ((ye === "renewal" || ye === "connected") && !Xe)) &&
        P !== null &&
        e.now() < P - j * 500)
    )
      return;
    if (he === null) {
      if (ye !== "retry" && zr(ye) && ye === "renewal") return;
      if (ye === "connected" && zp()) return;
      if (ye === "settings" && zp() && Xi()) return;
    }
    if (ye === "send" && ((P !== null && e.now() < P - j * 500) || he?.trigger === "send")) return;
    if (ye === "init") wo = 0;
    let ot = e.now();
    if (he !== null) {
      if (ye === "consent") ce = true;
      if (ye === "stopped_while_running") return;
      if (ye === "send" && Se === null) return;
      if (ye === "settings" || ye === "consent" || he.trigger !== ye || ot - he.at >= TRIGGER_DEBOUNCE_MS)
        Se = Se !== null && RESYNC_TRIGGER_PRIORITY[Se] > RESYNC_TRIGGER_PRIORITY[ye] ? Se : ye;
      return;
    }
    if (ye === "worker_up") NEGATIVE_INFINITY = e.now();
    Z = Z === "registered" ? "registered" : "registering";
    if (r.inventory !== null && r.inventoryDirty && Q?.instanceId === r.instanceId) Ji();
    let pt = r;
    let Ot = false;
    let done = tx(pt, ye, ot, (et) => {
      Ot = et === "unverified";
    })
      .catch((error) => {
        let jt = classifyControlRequestError(error);
        if (!(error instanceof SupersededError) && jt !== "timeout" && jt !== "failed") Je(pt.instanceId);
        if (error instanceof SupersededError || pn || At || pt.number !== r.number) {
          if (!pn && !At) Qt("superseded", ye, undefined, pt);
          return;
        }
        if (Z === "stopped") return;
        switch (jt) {
          case "hook_forwarding_not_ready":
          case "timeout":
            if (
              jt === "timeout" &&
              (P === null || e.now() >= P) &&
              ((ye !== "renewal" && ye !== "retry") ||
                e.now() - ot >= (he?.listenMs ?? REGISTRATION_TIMEOUT_MS) + Math.max(30000, j * 500))
            ) {
              if (Se !== "consent" && Se !== "settings" && Se !== "worker_up" && Se !== "mute") Se = null;
              Oc(ye, pt, Ot);
              if (Ot) Et("sender_unverified", SENDER_UNVERIFIED_TEXT, "warning");
              return;
            }
            Qt("not_ready", ye, undefined, pt);
            if (!Ic()) {
              Gp(
                "The cloud session is not answering this machine's hook registration yet (it may still be starting); hooks from this machine are paused for it and are offered again as soon as it reports in.",
              );
              ko = true;
              memory.standing = {
                kind: "paused",
              };
            }
            return;
          case "hook_forwarding_disabled": {
            Qt("disabled", ye, undefined, pt);
            let ut = refusalMessageText(error);
            if (ut === "policy" || ut === "disabled")
              Et(
                "disabled",
                `The cloud session stopped consulting this machine's hooks: ${describeCloudRefusal(DEVICE_HOOKS_UNAVAILABLE_TEXTS, ut)}.`,
                "warning",
              );
            else
              Et(
                "disabled",
                `This cloud session won't run hooks from this machine: ${describeCloudRefusal(DEVICE_HOOKS_UNAVAILABLE_TEXTS, ut)}.`,
              );
            kr("disabled");
            return;
          }
          case "unsupported":
            Qt("unsupported", ye, undefined, pt);
            Et(
              "unsupported",
              "This cloud session was created before hooks from your machine could run for it; start a new cloud session to use them. Hooks from this machine won't run for this one.",
            );
            kr("unsupported");
            return;
          case "stale_worker_epoch":
            Qt("stale_epoch", ye, undefined, pt);
            x = null;
            Ie = false;
            gt += 1;
            if (gt === 1) Se = "retry";
            else if (!Ic()) {
              Et(
                "stale_storm",
                "The cloud session keeps calling this machine's registration out of date; hooks from this machine won't run for it. Start a new cloud session if this persists.",
                "warning",
              );
              kr("stale");
            }
            return;
          case "invalid_registration":
            Qt("invalid", ye, undefined, pt);
            Et(
              "invalid_registration",
              `The cloud session refused this machine's hook registration (it said "${refusalMessageText(error)}"); hooks from this machine won't run for it \u2014 worth a bug report.`,
              "warning",
            );
            kr("invalid");
            return;
          default:
            Qt("failed", ye, undefined, pt);
            if (ye === "renewal" || ye === "retry") {
              if (!Ic())
                Gp(
                  "This machine's hook registration with the cloud session could not be renewed; hooks from this machine are paused for it until the connection recovers.",
                );
            }
        }
      })
      .finally(() => {
        if (yt?.instanceId === pt.instanceId) yt = null;
        he = null;
        if (Z === "registering") Z = P === null ? "idle" : "registered";
        let et = Se;
        Se = null;
        if (et !== null && !pn && !At) qn(et, false);
      });
    he = {
      trigger: ye,
      at: ot,
      done,
      instanceId: pt.instanceId,
      sent: false,
      listenMs: REGISTRATION_TIMEOUT_MS,
    };
  };
  return {
    requestRegistration: qn,
    consentDecided(ye) {
      jr = ye;
      if (ye === "declined") e.arm(null);
      qn("consent");
    },
    turnInFlight() {
      zr();
      Ie = true;
      Pc();
    },
    turnEnded() {
      Ie = false;
    },
    activity() {
      Pc();
    },
    ensureRegistered() {
      zr("send");
      if (pn || At || memory.standing.kind !== "dormant") {
        Pc();
        return Promise.resolve();
      }
      qn("send");
      let ye = he;
      if (ye === null) return Promise.resolve();
      let Xe = ye.done.then(
        () => {},
        () => {},
      );
      return new Promise((resolve) => {
        let pt = e.setTimer(resolve, REGISTRATION_REFRESH_CHECK_MS);
        Xe.then(() => {
          pt.clear();
          resolve();
        });
      });
    },
    settingsChanged() {
      if (pn || Z === "stopped") return;
      let ye = e.capture();
      baseline = ye;
      if (ye.kind === "captured" && ye.checkoutDisablesAllHooks && hasCapturedHooks(ye))
        if (Ec === false && jr !== "declined") Bp();
        else r.inventoryDirty = true;
      let Xe = captureFingerprint(ye);
      if (An !== null && Xe === An) return;
      An = Xe;
      ln = false;
      Vi();
      qn("settings");
    },
    servingMute(ye) {
      servingMuted = ye;
      if (pn || At) return;
      if (ye) {
        if (Z === "stopped") return;
        se = true;
        jp();
        Qt("muted", "mute");
        if (he !== null)
          if (he.sent) {
            vs(he.instanceId, UNREGISTER_TIMEOUT_MS);
            yt = {
              budgetMs: UNREGISTER_TIMEOUT_MS,
              instanceId: he.instanceId,
            };
          } else Vi();
        kr("muted");
        return;
      }
      if (Z !== "stopped" || ee !== "muted") return;
      e.arm(null);
      Z = "idle";
      memory.standing = {
        kind: "idle",
      };
      ee = undefined;
      se = false;
      or = null;
      wr.delete("muted");
      Vi();
      qn("mute");
    },
    async unregister(ye) {
      Ki();
      e.arm(null);
      At = true;
      Se = null;
      if (he !== null) {
        yt = {
          budgetMs: ye,
        };
        let Xe = he;
        await Promise.all([
          !Xe.sent || Q?.instanceId === Xe.instanceId ? Promise.resolve() : vs(Xe.instanceId, ye),
          Wr(ye),
        ]);
        return;
      }
      await Wr(ye);
    },
    dispose() {
      pn = true;
      abortController.abort();
      Ki();
    },
    snapshot: () => ({
      phase: Z,
      instanceId: r.instanceId,
      registeredInstanceId: Q?.instanceId ?? null,
      inventory: r.inventory,
      leaseExpiresAt: P,
      workerEpoch: x,
      templateStatuses: G,
      lastOutcome,
      ...(ee !== undefined && {
        stoppedReason: ee,
      }),
    }),
  };
}
//@ chunk-s61vbvea.js:373239-373630 placement
/**
 * 创建设备 hook 注册表：按会话管理服务方、发送方与同意固定项。
 */
function createDeviceHookRegistry() {
  let e = new Map();
  let n = new Map();
  let r = new Map();
  return {
    servicerFor: (s) => memoizeWith(e, s, emptyEligibilityState),
    senderFor: (s) => memoizeWith(n, s, createDeviceHookSenderMemory),
    consentPin: emptyConsentState(),
    consentAnnounced: createConsentSignal(),
    noteAttached: (s) => {
      r.set(s, (r.get(s) ?? 0) + 1);
      let h = false;
      return () => {
        if (h) return;
        h = true;
        let y = (r.get(s) ?? 1) - 1;
        if (y > 0) r.set(s, y);
        else r.delete(s);
      };
    },
    isAttached: (s) => (r.get(s) ?? 0) > 0,
    legacyConfigFile: undefined,
    legacyEnvPin: undefined,
    servedSettingsChanged: createSignal(),
  };
}
//@ chunk-s61vbvea.js:373630-373647 placement
var deviceHooksProcessMemories = new HostScoped(createDeviceHookRegistry);
//@ chunk-s61vbvea.js:373647-373734 placement
function memoizeWith(e, n, r) {
  let s = e.get(n);
  if (s !== undefined) return s;
  let h = r();
  e.set(n, h);
  return h;
}
export {
  deviceHooksProcessMemories,
  deviceHooksRegistrationState,
  hasCapturedHooks,
  isHookScopeInReach,
  SENDER_UNVERIFIED_TEXT,
  DeviceHooksRegistration,
  UNREGISTER_TIMEOUT_MS,
};
