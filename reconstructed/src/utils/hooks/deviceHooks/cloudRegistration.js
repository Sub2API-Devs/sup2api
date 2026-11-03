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
import { m_, collectStickyRoots, stickyRootsFor } from "../../settings/stickyRoots.js";
import { hf, DEVICE_HOOK_SCOPES, c_ } from "./eligibility.js";
import { jsonStringify } from "../../slowOperations.js";
import { SETTING_SOURCES } from "../../settings/constants.js";
import { count } from "../../collections.js";
import { isAbsolutePlatformPath } from "../../git.js";
import { hr } from "../../invisibleChars.js";
import { tIt } from "../../../entrypoints/sdk/controlSchemas.js";
import { a_, l_ } from "./consent.js";
import { createSignal } from "../../signal.js";
import { HostScoped } from "../../hostScoped.js";

//@ chunk-s61vbvea.js:341975-342218 placement
var f_ = 180,
  CN = 3000,
  REGISTRATION_TIMEOUT_MS = 120000,
  AN = 8,
  UNREGISTER_TIMEOUT_MS = 1500,
  RETRY_REGISTRATION_TIMEOUT_MS = 15000,
  IN = 30000,
  REGISTRATION_RETRY_DELAYS_MS = [2000, 4000, 8000, 16000],
  TRIGGER_DEBOUNCE_MS = 1000,
  LN = 5000,
  RESYNC_TRIGGER_PRIORITY = {
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
  },
  MAX_REFUSAL_TEXT_CHARS = 120;
//@ chunk-s61vbvea.js:342218-342452 placement
function hooksStartOutsideProjectNotice(e) {
  return `${e} ${plural(e, "hook")} ${plural(e, "starts", "start")} in an empty folder for cloud sessions. A hook in your user settings marked "cloud": "device" starts in the project instead, where the cloud session can change files.`;
}
//@ chunk-s61vbvea.js:342452-342510 placement
class Vo extends Error {
  constructor() {
    super("superseded");
  }
}
//@ chunk-s61vbvea.js:342510-342731 placement
function classifyControlRequestError(e) {
  if (e instanceof ControlRequestTimeoutError) return "timeout";
  let n = e instanceof Error ? e.message : String(e);
  if (n.startsWith("Unsupported control request subtype")) return "unsupported";
  let match = /^([a-z_]+):/.exec(n);
  return match ? match[1] : "failed";
}
//@ chunk-s61vbvea.js:342731-342849 placement
function refusalMessageText(e) {
  let n = e instanceof Error ? e.message : String(e);
  return sanitizeDisplayText(n.replace(/^[a-z_]+:\s*/, ""), { maxCodeUnits: MAX_REFUSAL_TEXT_CHARS });
}
//@ chunk-s61vbvea.js:342849-347142 placement
var DEVICE_HOOKS_UNAVAILABLE_TEXTS = {
    flag_off: "the feature is not switched on for your account in the cloud",
    policy: "a managed policy in the cloud session allows only its own hooks",
    disabled: "it is switched off in that cloud environment",
    entrypoint: "this kind of cloud session does not support it",
    not_managed_cloud_worker: "this kind of cloud session does not support it",
    hermetic: "that session is sealed off from outside input",
  },
  b_ = {
    interpreter_unavailable: "its interpreter is missing in the cloud",
    install_failed: "it could not be installed there",
    event_not_allowed: "it is set on an event or matcher the cloud does not run it under",
    disabled: "cloud-run templates are off there",
    awaiting_upload: "its copy has not reached the cloud yet",
    version_mismatch: "the cloud expects a different copy of it",
    digest_mismatch: "its copy did not arrive intact",
    too_large: "its copy is too large",
    unknown_template: "this cloud session does not know that template",
  },
  w_ = {
    user: "your user settings.json",
    local: "this folder's .claude/settings.local.json",
    flag: "the --settings file",
  },
  $N = {
    userSettings: "your user settings.json",
    projectSettings: "this folder's .claude/settings.json",
    localSettings: "this folder's .claude/settings.local.json",
    flagSettings: "the --settings file",
    policySettings: "the managed settings file",
  },
  qVo =
    "Not running this machine's hooks for the cloud session: it hasn't answered and doesn't recognize this machine as a trusted device. To run them, start a session from this machine with claude --cloud.",
  UN =
    "Remote tool serving was turned off by Anthropic (emergency switch). Your hooks are not offered to cloud sessions from this computer until it is turned back on.",
  BN =
    "Remote tool serving was turned back on by Anthropic. Your hooks are offered to this cloud session again.",
  GN =
    "A settings file in this checkout switches all hooks off (disableAllHooks); that holds for this terminal, but not for the cloud session \u2014 this machine's hooks are still offered to it, because the session itself could have written that file. Put disableAllHooks in your user settings to switch them off for cloud sessions too.",
  WN = {
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
  },
  zN = {
    untrusted: "this folder is not marked trusted on this machine",
    repo_provenance:
      "that file is committed to the repository (or its provenance could not be read), so the cloud session's own copy is what applies",
    runtime_patch: "hooks given with --settings cannot be told apart from ones added at run time",
    served_folder:
      "the cloud session this computer serves can write that file, and nobody is at a terminal here to vouch for it",
  },
  KN = {
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
    (Object.hasOwn(e, n) ? e[n] : void 0) ??
    `the cloud session said "${sanitizeDisplayText(n.replace(/_/g, " "), { maxCodeUnits: 60 })}"`
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
/**
 * 创建设备 hook 发送方的记忆状态：基线、被拒模板、选择加入的固定项等。
 */
//@ chunk-s61vbvea.js:347540-347931 placement
function createDeviceHookSenderMemory() {
  return {
    baseline: null,
    baselineLocated: !1,
    refusedTemplates: new Set(),
    refusedTemplatesLife: null,
    refusedTemplatesSession: null,
    optInPins: new Map(),
    standing: { kind: "idle" },
    lapsesUnusedAt: null,
    stickyRoots: new Set(),
    lastSyncRoot: null,
    knownSpellings: new Map(),
    everInReach: new Set(),
    localSettingsLocation: { current: null },
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
    if (s === "local" || r.everInReach?.has(s)) return !0;
    let scopeSettingsFile = r.scopeSettingsFile(s === "user" ? "userSettings" : "flagSettings");
    if (scopeSettingsFile === null) continue;
    let y = await r.realpath(scopeSettingsFile).catch(() => null);
    if (m_(y === null ? [scopeSettingsFile] : [scopeSettingsFile, y], e) || (y === null && s === "user"))
      return !0;
  }
  return !1;
}
//@ chunk-s61vbvea.js:348342-349029 placement
function describeDeviceHookOutcome(e, n) {
  let r = [],
    s = e.forwarded.length,
    h =
      n !== void 0 && n.ignored > 0
        ? ` \u2014 the cloud session accepted ${n.accepted} and ignored ${n.ignored}`
        : "";
  if (
    (r.push(
      s === 0
        ? "no hook runs on this machine for the cloud session"
        : `${s} ${plural(s, "hook")} ${plural(s, "runs", "run")} on this machine when the cloud session asks (${countByValue(e.forwarded.map((y) => y.wire.event))})${h}`,
    ),
    e.held.length > 0)
  )
    r.push(
      `${e.held.length} ${plural(e.held.length, "stays", "stay")} local-only (${countByValue(e.held.map((y) => KN[y.reason]))})`,
    );
  if (e.templates.length > 0)
    r.push(
      `${e.templates.length} ${plural(e.templates.length, "runs", "run")} in the cloud (${e.templates.map((template) => template.local.templateId).join(", ")})`,
    );
  return `Hooks \u25B8 ${r.join("; ")}.`;
}
//@ chunk-s61vbvea.js:349029-349106 placement
function Vnt(e) {
  return e.kind === "captured" && e.sources.some((source) => hf(source.hooks));
}
//@ chunk-s61vbvea.js:349106-349224 placement
function captureFingerprint(e) {
  return e.kind === "captured"
    ? jsonStringify(e.sources.map((source) => [source.source, source.settingsFile, source.hooks]))
    : `none:${e.reason}`;
}
/**
 * 把本机钩子注册到云会话并接收回调（静默、停止、捕获状态）
 */
//@ chunk-s61vbvea.js:349224-373239 placement
function DeviceHooksRegistration(e) {
  if (
    ((e.memory.standing = e.servingMuted ? { kind: "stopped", reason: "muted" } : { kind: "idle" }),
    (e.memory.lapsesUnusedAt = null),
    e.memory.refusedTemplatesSession !== e.cloudSessionId)
  )
    (e.memory.refusedTemplates.clear(),
      (e.memory.refusedTemplatesLife = null),
      (e.memory.refusedTemplatesSession = e.cloudSessionId));
  let n = new Set(),
    r = { number: 0, instanceId: e.mintInstanceId(), captured: null, inventory: null, inventoryDirty: !0 },
    memory = e.memory;
  if (memory.baseline === null) {
    let capture = e.capture();
    if (((memory.baseline = capture), capture.kind === "captured")) {
      for (let source of capture.sources)
        if (source.settingsFile !== null)
          memory.knownSpellings.set(source.source, new Set([source.settingsFile]));
    }
  }
  let baseline = memory.baseline;
  memory.reachBaseline ??= new Map(SETTING_SOURCES.map((ye) => [ye, e.scopeWriteEntries(ye)]));
  let reachBaseline = memory.reachBaseline;
  memory.commonRoots ??= e.commonWriteRoots();
  let { commonRoots: commonRoots, stickyRoots: stickyRoots, refusedTemplates: refusedTemplates } = memory,
    x = null,
    P = null,
    j = f_,
    G = {},
    L = new Set(),
    q = !1,
    Q = null,
    Z = e.servingMuted ? "stopped" : "idle",
    ee = e.servingMuted ? "muted" : void 0,
    servingMuted = e.servingMuted,
    se = !1,
    re = !1,
    he = null,
    Se = null,
    ce = !1,
    we = null,
    ie = !1,
    Ee = !1,
    Ie = !1,
    ke = 0,
    Me = !1,
    We = !1,
    nt = (ye, Xe) => {
      ((ke = e.now() + Xe.lease_s * 1000), (Me = Xe.templates.length > 0), (We = !0), Je(ye));
    },
    Be = [],
    Re = (ye) => Be.filter((Xe) => Xe.withTemplates || ye < Xe.mayBeHeldUntil),
    Ne = (ye, Xe, ot) => {
      let pt = e.now() + ot + j * 1000;
      if (ye === Q?.instanceId) ke = Math.max(ke, pt);
      let now = e.now(),
        mt = [
          ...Be.filter((et) => et.instanceId !== ye && (et.withTemplates || now < et.mayBeHeldUntil)),
          {
            instanceId: ye,
            withTemplates: Xe || Be.some((et) => et.instanceId === ye && et.withTemplates),
            mayBeHeldUntil: pt,
          },
        ];
      Be = [...mt.filter((et) => et.withTemplates), ...mt.filter((et) => !et.withTemplates).slice(-AN)];
    },
    Je = (ye) => {
      Be = Be.filter((Xe) => Xe.instanceId !== ye);
    },
    lt = null,
    Ae = 0,
    ze = 0,
    gt = 0,
    Nt = null,
    An = null,
    ln = !1,
    yt = null,
    At = !1,
    { knownSpellings: knownSpellings, everInReach: everInReach } = memory,
    br = new Map(),
    pn = !1,
    abortController = new AbortController(),
    wr = new Set(),
    or = null,
    jr = null,
    Ec = null,
    xc = null,
    VR = () => jr,
    NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY,
    Up = null,
    Tc = 0,
    vc = !1,
    bo = null,
    wo = 0,
    ko = !1,
    Cc = new Set(),
    YR =
      e.formatClock ??
      ((ye) => new Date(ye).toLocaleTimeString(void 0, { hour: "numeric", minute: "2-digit" })),
    qR = "run /hooks to change that",
    Ac = () => {
      (Et(
        "declined",
        `Hooks stay on this machine only \u2014 you chose not to run them for cloud sessions (${qR}).`,
        "debug",
      ),
        kr("declined"));
    },
    Et = (ye, Xe, ot = "info") => {
      if (wr.has(ye)) return;
      (wr.add(ye), e.onLine({ line: Xe, level: ot }));
    },
    Bp = () => Et("checkout-disable-all", GN, "warning"),
    jp = () => {
      if (baseline === null || !Vnt(baseline)) return;
      (wr.delete("unmuted"), Et("muted", UN), (re = !0));
    },
    XR = () => {
      if (!re || jr === "declined") return;
      ((re = !1), Et("unmuted", BN));
    },
    Qt = (ye, Xe, ot = { accepted: 0, ignored: 0 }, pt = r) => {
      let inventory = pt.inventory;
      Up = ye;
      let mt = {};
      for (let et of inventory?.held ?? []) mt[et.reason] = (mt[et.reason] ?? 0) + 1;
      if (
        (e.telemetry({
          outcome: ye,
          trigger: Xe,
          forwarded: inventory?.forwarded.length ?? 0,
          templates: inventory?.templates.length ?? 0,
          heldAfterEdit: inventory?.heldCounts.after_edit ?? 0,
          heldOther: inventory === null ? 0 : count(inventory.held, (et) => et.reason !== "after_edit"),
          heldByReason: mt,
          accepted: ot.accepted,
          ignored: ot.ignored,
          attempt: Tc,
          afterFlagsUnanswered: vc,
        }),
        ye === "registered" ||
          ye === "unregistered" ||
          ye === "nothing_to_offer" ||
          ye === "no_consent" ||
          ye === "dormant")
      )
        Tc = 0;
    },
    Ki = () => {
      (we?.clear(),
        (we = null),
        (ie = !1),
        (memory.lapsesUnusedAt = null),
        (Ie = !1),
        lt?.clear(),
        (lt = null));
    },
    vs = (ye, Xe) =>
      e
        .sendRequest(
          {
            subtype: "register_device_hooks",
            instance_id: ye,
            display_name: e.displayName,
            ...(x !== null && { worker_epoch: x }),
            hooks: [],
            templates: [],
          },
          { timeoutMs: Xe },
        )
        .then(
          () => {},
          () => {},
        ),
    Wr = async (ye) => {
      let Xe = Q,
        now = e.now(),
        pt = (ut) => he !== null && he.sent && he.instanceId === ut,
        Ot = Xe !== null && pt(Xe.instanceId),
        mt = Xe !== null && Re(now).some((ut) => ut.instanceId === Xe.instanceId),
        et = ke !== 0 && now >= ke && !Me && !Ot && !mt;
      if (((P = null), (Q = null), (ie = !1), (memory.lapsesUnusedAt = null), Z !== "stopped"))
        ((Z = "idle"), (memory.standing = { kind: "idle" }));
      let filtered = Re(now).filter((ut) => ut.instanceId !== Xe?.instanceId && !pt(ut.instanceId));
      ((Be = Be.filter((ut) => pt(ut.instanceId))),
        await Promise.all([
          ...filtered.map((ut) => vs(ut.instanceId, ye)),
          Xe === null || et ? void 0 : vs(Xe.instanceId, ye),
        ]));
    },
    kr = (ye) => {
      if (
        ((Z = "stopped"),
        (memory.standing = { kind: "stopped", reason: ye }),
        (ee = ye),
        Ki(),
        (P = null),
        ye !== "muted")
      )
        e.arm(null);
      Wr(UNREGISTER_TIMEOUT_MS);
    },
    Vi = () => {
      (n.add(r.instanceId),
        (r = {
          number: r.number + 1,
          instanceId: e.mintInstanceId(),
          captured: null,
          inventory: null,
          inventoryDirty: !0,
        }));
    },
    Gp = (ye) => {
      ((P = null),
        (Z = "idle"),
        (memory.standing = { kind: "paused" }),
        we?.clear(),
        (we = null),
        lt?.clear(),
        (lt = null),
        (ze = 0),
        (ie = !1),
        (memory.lapsesUnusedAt = null),
        (or = null),
        (wo = e.now() + Math.max(30000, j * 500)),
        e.arm(null),
        Et(`lapse:${ye}`, ye, "warning"),
        Cc.add(`lapse:${ye}`));
    },
    Wp = () => {
      (we?.clear(),
        (we = e.setTimer(
          () => {
            if (((we = null), zr())) return;
            if (Ee || Ie) {
              qn("renewal");
              return;
            }
            ((ie = !0), (memory.lapsesUnusedAt = P));
          },
          Math.max(30000, j * 500),
        )));
    },
    Pc = () => {
      if ((zr(), (Ee = !0), ie && Z === "registered"))
        ((ie = !1), (memory.lapsesUnusedAt = null), qn("renewal"));
      else if (memory.standing.kind === "dormant" && he === null) qn("init", !1);
    },
    zp = () =>
      !Ee &&
      !Ie &&
      ((ie && Z === "registered") ||
        memory.standing.kind === "dormant" ||
        (Z === "registered" && P !== null && e.now() >= P - j * 500)),
    Xi = () => Re(e.now()).length === 0 && (Q === null || (ke !== 0 && e.now() >= ke && !Me)),
    Kp = () => {
      if (((ln = !0), (memory.lapsesUnusedAt = null), memory.standing.kind === "dormant"))
        memory.standing = { kind: "idle" };
      e.arm(null);
    },
    Oc = (ye, Xe, ot = !1) => {
      (Qt("dormant", ye, void 0, Xe),
        Ki(),
        (ze = 0),
        (Ee = !1),
        (P = null),
        (x = null),
        (Z = "idle"),
        (memory.standing = { kind: "dormant", registeredBefore: We, ...(ot && { senderUnverified: ot }) }),
        e.arm(null));
    },
    zr = (ye = "renewal") => {
      if (
        pn ||
        At ||
        he !== null ||
        (lt !== null && e.now() - Ae < Math.max(30000, j * 500)) ||
        Z !== "registered" ||
        P === null ||
        e.now() < P
      )
        return !1;
      return (Oc(ye), !0);
    },
    Ic = () => {
      let ye = REGISTRATION_RETRY_DELAYS_MS[ze];
      if (ye === void 0) return ((ze = 0), !1);
      ((ze += 1), lt?.clear());
      let Xe = e.now() + ye;
      return (
        (Ae = Xe),
        (lt = e.setTimer(() => {
          if (((lt = null), e.now() - Xe >= Math.max(30000, j * 500))) {
            if (((ze = 0), !zr() && Z === "idle" && !pn && !At)) Oc("retry");
            return;
          }
          qn("retry");
        }, ye)),
        !0
      );
    },
    hn = (ye) => {
      if (pn || At || ye.number !== r.number) throw new Vo();
    },
    Mc = async (ye) => {
      let Xe = await e.realpath(e.projectRoot).catch(() => e.projectRoot);
      await collectStickyRoots({
        stickyRoots: stickyRoots,
        pinnedScopes: memory.pinnedScopes,
        pinnedRoots: memory.pinnedRoots,
        baseRoots: [
          ...stickyRootsFor({
            launchDir: e.launchDir,
            launchDirReal: await e.launchDirReal(),
            ...(ye !== null && { syncRoot: ye.root, syncRootReal: ye.real }),
          }),
          ...[e.projectRoot, Xe].filter(isAbsolutePlatformPath),
        ],
        reachBaseline: reachBaseline,
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
        )
          (Et(
            `reach:${pinnedScope}`,
            `The places Claude may write in ${$N[pinnedScope]} changed during this cloud session. Because the cloud session can write that file, this session keeps judging which of this machine's hooks it may run by what the file held when you launched \u2014 restart claude --cloud to apply your edit. If neither you nor another session on this machine changed it, the cloud session may have: check that file before relaunching, since a relaunch trusts whatever it says.`,
            "warning",
          ),
            e.reachPinnedTelemetry?.(pinnedScope));
      return [...stickyRoots];
    },
    JR = (ye, Xe) =>
      isHookScopeInReach(ye, Xe, {
        realpath: e.realpath,
        scopeSettingsFile: e.scopeSettingsFile,
        everInReach: everInReach,
      }),
    QR = async (ye, Xe) => {
      let baseline = memory.baseline;
      if (baseline === null) return ye;
      if (ye.kind === "none") {
        if (
          ye.reason === "disabled_by_settings" &&
          baseline.kind === "captured" &&
          (await JR(Xe, ye.switchSources ?? ["user", "flag"]))
        ) {
          if (Vnt(baseline))
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
        if (Vnt(ye))
          Et(
            "none:lifted",
            "All hooks were switched off in a settings file when this cloud session started and that switch has since been removed; for the cloud session this machine keeps them off \u2014 restart claude --cloud to offer them. If you did not change it, the cloud session may have.",
            "warning",
          );
        return baseline;
      }
      let pt = baseline.kind === "captured" ? baseline.sources : [],
        Ot = async (ut, Zt) => {
          let yn = knownSpellings.get(ut) ?? new Set();
          if (Zt !== null)
            (yn.add(Zt),
              await e.realpath(Zt).then(
                (xr) => yn.add(xr),
                () => everInReach.add(ut),
              ));
          return (knownSpellings.set(ut, yn), [...yn]);
        },
        mt = new Map(ye.sources.map((source) => [source.source, source])),
        et = [];
      for (let ut of DEVICE_HOOK_SCOPES) {
        let Zt = mt.get(ut) ?? null,
          yn = pt.find((ea) => ea.source === ut) ?? null,
          xr = Zt?.settingsFile ?? yn?.settingsFile ?? null,
          Qi = await Ot(ut, xr),
          Wt = everInReach.has(ut) || m_(Qi, Xe);
        if (Wt) everInReach.add(ut);
        if (!Wt) {
          if (Zt !== null) et.push(Zt);
          continue;
        }
        let Eo = xr === null ? w_[ut] : hr(xr);
        if (yn === null) {
          if (Zt !== null)
            (Et(
              `appeared:${ut}`,
              `A hooks file appeared at ${Eo} during this cloud session, where the session itself can write; it is ignored for this session.`,
              "warning",
            ),
              e.sourcePinnedTelemetry?.({ source: ut, changed: !1, appeared: !0, vanished: !1 }));
          continue;
        }
        if (Zt === null || jsonStringify(Zt.hooks) !== jsonStringify(yn.hooks))
          (Et(
            `pinned:${ut}`,
            ut === "local"
              ? `Hooks changed in ${Eo}, which the cloud session can write. The change is ignored for this session. Check the file, then restart claude --cloud.`
              : `${Eo} changed during this cloud session. If neither you nor another session on this machine changed it, the cloud session may have: check that file before relaunching.`,
            "warning",
          ),
            e.sourcePinnedTelemetry?.({ source: ut, changed: !0, appeared: !1, vanished: Zt === null }));
        et.push(yn);
      }
      let jt = new Set(et.map((ut) => ut.source));
      return { ...ye, sources: et, withheld: ye.withheld.filter((ut) => !jt.has(ut.source)) };
    },
    Vp = async (ye) => {
      if (ye.inventory !== null && !ye.inventoryDirty) return ye.inventory;
      let syncRoot = await e.syncRoot();
      (hn(ye), (memory.lastSyncRoot = syncRoot));
      let ot = await Mc(syncRoot);
      if ((hn(ye), ye.captured === null)) {
        let capture = e.capture();
        ((baseline = capture), (An = captureFingerprint(capture)), (memory.baseline ??= capture));
        let baseline_2 = memory.baseline;
        if (!memory.baselineLocated && baseline_2.kind === "captured") {
          memory.baselineLocated = !0;
          for (let source of baseline_2.sources)
            if (source.settingsFile !== null) {
              let Zt = knownSpellings.get(source.source) ?? new Set();
              if (
                (Zt.add(source.settingsFile),
                await e.realpath(source.settingsFile).then(
                  (yn) => Zt.add(yn),
                  () => everInReach.add(source.source),
                ),
                knownSpellings.set(source.source, Zt),
                m_([...Zt], ot))
              )
                everInReach.add(source.source);
            }
          hn(ye);
        }
        ((ye.captured = capture === memory.baseline ? capture : await QR(capture, ot)), hn(ye));
      }
      let inventory = await e.buildInventory({
        captured: ye.captured,
        instanceId: ye.instanceId,
        syncRoot: syncRoot,
        reachRoots: ot,
        withoutTemplates: refusedTemplates,
      });
      (hn(ye), (ye.inventory = inventory));
      let ensureConsent = await e.ensureConsent(null, abortController.signal, ot);
      if ((hn(ye), (Ec = ensureConsent === "declined"), Ec)) return inventory;
      ye.inventoryDirty = !1;
      for (let notice of inventory.notices) Et(`notice:${notice}`, notice);
      let mt =
        e.servicerDefaults.unmarkedStartFolder === "private"
          ? count(inventory.forwarded, (et) => et.local.hook.type === "command" && et.local.cloudOptIn !== !0)
          : 0;
      if (mt > 0) Et("start-outside-project", hooksStartOutsideProjectNotice(mt));
      if (ye.captured.kind === "captured") {
        for (let { source: source, reason: reason } of ye.captured.withheld)
          Et(
            `withheld:${source}:${reason}`,
            `Hooks from ${w_[source]} are not offered to the cloud session: ${zN[reason]}.`,
          );
        if (
          (ye.captured.checkoutDisablesAllHooks && Vnt(ye.captured)) ||
          (baseline?.kind === "captured" && baseline.checkoutDisablesAllHooks && Vnt(baseline))
        )
          Bp();
      } else Et(`none:${ye.captured.reason}`, WN[ye.captured.reason]);
      return inventory;
    },
    ZR = async (ye, Xe, ot, pt) => {
      let Ot = await Mc(await e.syncRoot());
      if ((hn(ye), jr === "declined")) return;
      e.arm({
        instanceId: ye.instanceId,
        retiredInstanceIds: new Set(n),
        displayName: e.displayName,
        cloudSessionId: e.cloudSessionId,
        inventory: Xe,
        roots: { containerProjectDir: ot.project_dir, containerCwd: ot.cwd, deviceLaunchDir: e.launchDir },
        frame: { launchDir: e.launchDir, projectRoot: e.launchDir, cloudSessionId: e.cloudSessionId },
        launchDirReal: pt,
        cloudWritableRoots: Ot,
        ...e.servicerDefaults,
      });
    },
    ex = async (ye, Xe) => {
      if (q) return !1;
      let ot = !1;
      for (let template of Xe.templates) {
        let Ot = `${template.wire.template}:${template.wire.digest}`;
        if (L.has(Ot)) continue;
        try {
          (await e.sendRequest(
            {
              subtype: "upload_device_hook_template",
              template: template.wire.template,
              digest: template.wire.digest,
              content_base64: template.local.bytes.toString("base64"),
              ...(x !== null && { worker_epoch: x }),
            },
            { timeoutMs: P === null || e.now() >= P ? REGISTRATION_TIMEOUT_MS : IN },
          ),
            hn(ye),
            L.add(Ot));
        } catch (error) {
          if (error instanceof Vo) throw error;
          hn(ye);
          let et = classifyControlRequestError(error);
          if (et === "unsupported") {
            q = !0;
            for (let template of Xe.templates) refusedTemplates.add(template.local.templateId);
            return (
              Et(
                "template:unsupported",
                `This cloud session cannot take hook templates (${Xe.templates.map((template) => template.local.templateId).join(", ")}); they stay on this machine for it.`,
              ),
              Xe.templates.length > 0
            );
          }
          if (et === "template_refused" || et === "invalid_upload") {
            (Et(
              `template:${template.local.templateId}:${et}`,
              `${template.local.templateId} could not be moved to the cloud (${describeCloudRefusal(b_, refusalMessageText(error))}); it runs on this machine instead.`,
            ),
              refusedTemplates.add(template.local.templateId),
              (ot = !0));
            continue;
          }
          throw error;
        }
      }
      return ot;
    },
    tx = async (ye, Xe, ot, pt) => {
      let hookFlags = e.hookFlags();
      if (hookFlags === "unanswered") {
        if (!vc) ((vc = !0), Qt("flag_unanswered", Xe));
        return;
      }
      if (hookFlags === "answered_off") {
        (Qt("flag_off", Xe),
          Et(
            "flag_off",
            "Hooks from this machine are not offered to this cloud session: the feature is not switched on for your account.",
            "debug",
          ),
          kr("flag_off"));
        return;
      }
      Tc += 1;
      let mt = await Vp(ye);
      if (mt.forwarded.length === 0 && mt.templates.length === 0 && (Q !== null || !Xi())) {
        (Qt("unregistered", Xe),
          we?.clear(),
          (we = null),
          (or = null),
          e.arm(null),
          await Wr(RETRY_REGISTRATION_TIMEOUT_MS));
        return;
      }
      if (mt.forwarded.length === 0 && mt.templates.length === 0 && P === null) {
        if ((Kp(), Qt("nothing_to_offer", Xe), mt.held.length > 0))
          Et(`summary:${describeDeviceHookOutcome(mt)}`, describeDeviceHookOutcome(mt), "debug");
        return;
      }
      ce = !1;
      let ensureConsent = await e.ensureConsent(
        {
          forwarded: mt.forwarded.length,
          templateNames: mt.templates.map((template) => template.local.templateId),
        },
        abortController.signal,
        await Mc(await e.syncRoot()),
      );
      if ((hn(ye), ensureConsent !== "accepted")) {
        if (ensureConsent !== "distrusted" || xc !== "distrusted")
          Qt(ensureConsent === "distrusted" ? "consent_distrusted" : "no_consent", Xe);
        if (((xc = ensureConsent), ensureConsent === "declined")) {
          Ac();
          return;
        }
        if (
          ((ln = ensureConsent === "not_now"),
          we?.clear(),
          (we = null),
          (ie = !1),
          (P = null),
          (memory.lapsesUnusedAt = null),
          memory.standing.kind === "dormant")
        )
          memory.standing = { kind: "idle" };
        if (((or = null), e.arm(null), Q !== null || !Xi())) await Wr(RETRY_REGISTRATION_TIMEOUT_MS);
        if ((hn(ye), ensureConsent === "distrusted")) Wp();
        return;
      }
      if (((ln = !1), (xc = "accepted"), await ex(ye, mt))) {
        if (((ye.inventoryDirty = !0), Q?.instanceId === ye.instanceId))
          throw (hn(ye), Ji(), (Se = "template_fallback"), new Vo());
        mt = await Vp(ye);
      }
      let mapped = mt.templates
        .filter((template) => !refusedTemplates.has(template.local.templateId))
        .map((ht) => ht.wire);
      if (mt.forwarded.length === 0 && mapped.length === 0) {
        if (Q !== null || !Xi()) {
          (Qt("unregistered", Xe),
            we?.clear(),
            (we = null),
            (or = null),
            e.arm(null),
            await Wr(RETRY_REGISTRATION_TIMEOUT_MS));
          return;
        }
        if (P === null) {
          (Kp(), Qt("nothing_to_offer", Xe));
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
      if (he?.instanceId === ye.instanceId)
        ((he.sent = !0), (he.listenMs = Zt), Ne(ye.instanceId, mapped.length > 0, Zt));
      let sendRequest = await e.sendRequest(
          {
            subtype: "register_device_hooks",
            instance_id: ye.instanceId,
            display_name: e.displayName,
            lease_s: f_,
            ...(x !== null && { worker_epoch: x }),
            hooks: mt.forwarded.map((ht) => ht.wire),
            templates: mapped,
            held: {
              after_edit: mt.heldCounts.after_edit,
              kind_unsupported: mt.heldCounts.kind_unsupported,
              other: mt.heldCounts.other,
            },
          },
          { timeoutMs: Zt, onEchoed: pt },
        ),
        xr = yt !== null && (yt.instanceId === void 0 || yt.instanceId === ye.instanceId) ? yt : null;
      if (xr !== null) {
        yt = null;
        let safeParse = tIt().safeParse(sendRequest);
        if (
          ((Q =
            safeParse.success && safeParse.data.status === "registered"
              ? { instanceId: ye.instanceId }
              : null),
          safeParse.success)
        ) {
          if (((x = safeParse.data.worker_epoch), Je(ye.instanceId), safeParse.data.status === "registered"))
            nt(ye.instanceId, safeParse.data);
        }
        await Wr(xr.budgetMs);
        return;
      }
      if (ye.number !== r.number) {
        let safeParse = tIt().safeParse(sendRequest);
        if (safeParse.success) Je(ye.instanceId);
        if (safeParse.success && safeParse.data.status === "registered")
          ((Q = { instanceId: ye.instanceId }),
            (x = safeParse.data.worker_epoch),
            nt(ye.instanceId, safeParse.data));
      }
      hn(ye);
      let safeParse = tIt().safeParse(sendRequest);
      if (!safeParse.success) {
        if (
          (Qt("invalid", Xe),
          Et(
            "invalid_reply",
            "The cloud session answered the hook registration in a form this version of Claude Code cannot read (try claude update); hooks from this machine won't run for it.",
            "warning",
          ),
          Q?.instanceId !== ye.instanceId)
        )
          (Je(ye.instanceId), await vs(ye.instanceId, UNREGISTER_TIMEOUT_MS).catch(() => {}));
        kr("invalid");
        return;
      }
      let Wt = safeParse.data;
      if (((ze = 0), lt?.clear(), (lt = null), Se === "retry")) Se = null;
      if (((gt = 0), (ko = !1), Nt !== null && Nt !== Wt.worker_epoch)) {
        if ((L.clear(), br.clear(), (q = !1), Xe !== "init")) Ie = !1;
      }
      let Eo = `${e.cloudSessionId}\x00${Wt.worker_epoch}`;
      if (
        memory.refusedTemplatesLife !== null &&
        memory.refusedTemplatesLife !== Eo &&
        refusedTemplates.size > 0
      )
        (refusedTemplates.clear(), (ye.inventoryDirty = !0));
      ((memory.refusedTemplatesLife = Eo), (Nt = Wt.worker_epoch), (x = Wt.worker_epoch));
      let Nc = (ht) => {
        let Xp = new Set(mapped.map((tn) => tn.template)),
          Kr = !1;
        for (let tn of ht) {
          if (!Xp.has(tn.template)) continue;
          if (tn.status === "installed") br.delete(tn.template);
          if (tn.status === "awaiting_upload") {
            let Qp = (br.get(tn.template) ?? 0) + 1;
            if ((br.set(tn.template, Qp), Qp >= 2)) {
              (refusedTemplates.add(tn.template),
                Et(
                  `fallback:${tn.template}:awaiting_twice`,
                  `${tn.template} could not be handed to this cloud session (it kept asking for the copy); it runs on this machine instead.`,
                ),
                (ye.inventoryDirty = !0),
                (Kr = !0));
              continue;
            }
            for (let em of [...L]) if (em.startsWith(`${tn.template}:`)) L.delete(em);
            Kr = !0;
          } else if (tn.status !== "installed")
            (br.delete(tn.template),
              refusedTemplates.add(tn.template),
              Et(
                `fallback:${tn.template}:${tn.status}`,
                `${tn.template} cannot run in this cloud session (${describeCloudRefusal(b_, tn.status)}); it runs on this machine instead.`,
              ),
              (ye.inventoryDirty = !0),
              (Kr = !0));
        }
        return Kr;
      };
      if (Wt.status === "unregistered") {
        let ht = mt.forwarded.length + mapped.length > 0;
        if (
          (Je(ye.instanceId),
          (P = null),
          we?.clear(),
          (we = null),
          (ie = !1),
          (memory.lapsesUnusedAt = null),
          (Z = "idle"),
          (memory.standing = { kind: "idle" }),
          (Q = null),
          (or = null),
          (ln = !0),
          (G = Object.fromEntries((Wt.templates ?? []).map((Kr) => [Kr.template, Kr.status]))),
          Qt("unregistered", Xe),
          e.arm(null),
          Nc(Wt.templates ?? []))
        ) {
          if (ye.inventoryDirty) Ji();
          Se = "template_fallback";
        } else if (ht)
          ((memory.standing = { kind: "kept_none" }),
            Et(
              "kept_none",
              "The cloud session kept none of this machine's hooks (it ignored every entry offered); they won't run for it.",
              "warning",
            ));
        return;
      }
      wr.delete("kept_none");
      for (let ht of Cc) wr.delete(ht);
      (Cc.clear(),
        (wo = 0),
        (ko = !1),
        (P = e.now() + Wt.lease_s * 1000),
        nt(ye.instanceId, Wt),
        (Ee = !1),
        (ie = !1),
        (memory.lapsesUnusedAt = null),
        (j = Wt.lease_s),
        (Q = { instanceId: ye.instanceId }),
        (G = Object.fromEntries(Wt.templates.map((template) => [template.template, template.status]))),
        (Z = "registered"),
        (memory.standing = { kind: "registered" }));
      let ea = { accepted: Wt.accepted, ignored: Wt.ignored };
      if ((Qt("registered", Xe, ea), XR(), jr === "declined")) {
        Ac();
        return;
      }
      if ((Wp(), !ce)) {
        if ((await ZR(ye, mt, Wt, launchDirReal), VR() === "declined")) {
          Ac();
          return;
        }
      }
      let Fc = Wt.away_since === void 0 ? null : Date.parse(Wt.away_since);
      if (Fc !== null && !Number.isNaN(Fc) && bo === null)
        (e.onLine({
          line: `The cloud session stopped running this machine's hooks at ${YR(Fc)} after two went unanswered in a row; it is asking again now.`,
          level: "warning",
        }),
          e.lapseTelemetry?.("away_since"));
      if (bo !== null && bo <= ot) bo = null;
      if (Wt.replaced_owner !== void 0 && !n.has(Wt.replaced_owner) && Wt.replaced_owner !== ye.instanceId)
        Et(
          `replaced:${Wt.replaced_owner}`,
          "This window now runs your hooks for the cloud session (another attached window did until now).",
          "debug",
        );
      let Hc = describeDeviceHookOutcome(mt, ea);
      if (Hc !== or) ((or = Hc), e.onLine({ line: Hc, level: "debug" }));
      for (let template of mt.templates)
        if (template.local.label === "legacy" && !refusedTemplates.has(template.local.templateId))
          Et(
            `legacy:${template.local.templateId}`,
            `${template.local.templateId} on this machine is an older copy; the cloud runs that copy \u2014 update it for fixes.`,
          );
      if (Nc(Wt.templates)) {
        if (ye.inventoryDirty) Ji();
        Se = "template_fallback";
      }
    },
    Ji = () => {
      (n.add(r.instanceId),
        (r = {
          number: r.number + 1,
          instanceId: e.mintInstanceId(),
          captured: r.captured,
          inventory: null,
          inventoryDirty: !0,
        }));
    },
    qn = (ye, Xe = !0) => {
      if (ye === "consent" && jr === "accepted" && Z === "stopped" && ee === "declined" && !pn && !At) {
        if (
          ((Z = "idle"),
          (memory.standing = { kind: "idle" }),
          (ee = void 0),
          (or = null),
          wr.delete("declined"),
          Vi(),
          servingMuted)
        )
          ((Z = "stopped"), (ee = "muted"), (memory.standing = { kind: "stopped", reason: "muted" }));
      }
      if (pn || At) return;
      if (Z === "stopped") {
        if (ee === "muted" && !se) ((se = !0), jp(), Qt("muted", ye));
        return;
      }
      if (Xe && (ye === "init" || ye === "send")) {
        if ((zr(ye), ye === "init")) Ie = !0;
        ((Ee = !0), (ie = !1), (memory.lapsesUnusedAt = null));
      }
      if (ye === "stopped_while_running" && bo === null)
        ((bo = e.now()),
          e.onLine({
            line: "The cloud session stopped waiting for a hook still running on this machine (deadline passed or turn interrupted) and went on without its answer; checking that its hooks are still offered.",
            level: "warning",
          }),
          e.lapseTelemetry?.("withdrawn_while_running"));
      if (ye === "connected" || ye === "consent") ln = !1;
      if (ye === "worker_up") {
        if (e.now() - NEGATIVE_INFINITY < LN) return;
        if (ln && memory.standing.kind === "kept_none") ln = !1;
        if (ln) return;
        ((x = null), (ko = !1), (wo = 0));
      }
      if (ye === "init" && ko) ((ko = !1), (wo = 0));
      else if (
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
      let now = e.now();
      if (he !== null) {
        if (ye === "consent") ce = !0;
        if (ye === "stopped_while_running") return;
        if (ye === "send" && Se === null) return;
        if (ye === "settings" || ye === "consent" || he.trigger !== ye || now - he.at >= TRIGGER_DEBOUNCE_MS)
          Se = Se !== null && RESYNC_TRIGGER_PRIORITY[Se] > RESYNC_TRIGGER_PRIORITY[ye] ? Se : ye;
        return;
      }
      if (ye === "worker_up") NEGATIVE_INFINITY = e.now();
      if (
        ((Z = Z === "registered" ? "registered" : "registering"),
        r.inventory !== null && r.inventoryDirty && Q?.instanceId === r.instanceId)
      )
        Ji();
      let pt = r,
        Ot = !1,
        mt = tx(pt, ye, now, (et) => {
          Ot = et === "unverified";
        })
          .catch((et) => {
            let jt = classifyControlRequestError(et);
            if (!(et instanceof Vo) && jt !== "timeout" && jt !== "failed") Je(pt.instanceId);
            if (et instanceof Vo || pn || At || pt.number !== r.number) {
              if (!pn && !At) Qt("superseded", ye, void 0, pt);
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
                    e.now() - now >= (he?.listenMs ?? REGISTRATION_TIMEOUT_MS) + Math.max(30000, j * 500))
                ) {
                  if (Se !== "consent" && Se !== "settings" && Se !== "worker_up" && Se !== "mute") Se = null;
                  if ((Oc(ye, pt, Ot), Ot)) Et("sender_unverified", qVo, "warning");
                  return;
                }
                if ((Qt("not_ready", ye, void 0, pt), !Ic()))
                  (Gp(
                    "The cloud session is not answering this machine's hook registration yet (it may still be starting); hooks from this machine are paused for it and are offered again as soon as it reports in.",
                  ),
                    (ko = !0),
                    (memory.standing = { kind: "paused" }));
                return;
              case "hook_forwarding_disabled": {
                Qt("disabled", ye, void 0, pt);
                let ut = refusalMessageText(et);
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
                (Qt("unsupported", ye, void 0, pt),
                  Et(
                    "unsupported",
                    "This cloud session was created before hooks from your machine could run for it; start a new cloud session to use them. Hooks from this machine won't run for this one.",
                  ),
                  kr("unsupported"));
                return;
              case "stale_worker_epoch":
                if ((Qt("stale_epoch", ye, void 0, pt), (x = null), (Ie = !1), (gt += 1), gt === 1))
                  Se = "retry";
                else if (!Ic())
                  (Et(
                    "stale_storm",
                    "The cloud session keeps calling this machine's registration out of date; hooks from this machine won't run for it. Start a new cloud session if this persists.",
                    "warning",
                  ),
                    kr("stale"));
                return;
              case "invalid_registration":
                (Qt("invalid", ye, void 0, pt),
                  Et(
                    "invalid_registration",
                    `The cloud session refused this machine's hook registration (it said "${refusalMessageText(et)}"); hooks from this machine won't run for it \u2014 worth a bug report.`,
                    "warning",
                  ),
                  kr("invalid"));
                return;
              default:
                if ((Qt("failed", ye, void 0, pt), ye === "renewal" || ye === "retry")) {
                  if (!Ic())
                    Gp(
                      "This machine's hook registration with the cloud session could not be renewed; hooks from this machine are paused for it until the connection recovers.",
                    );
                }
            }
          })
          .finally(() => {
            if (yt?.instanceId === pt.instanceId) yt = null;
            if (((he = null), Z === "registering")) Z = P === null ? "idle" : "registered";
            let et = Se;
            if (((Se = null), et !== null && !pn && !At)) qn(et, !1);
          });
      he = {
        trigger: ye,
        at: now,
        done: mt,
        instanceId: pt.instanceId,
        sent: !1,
        listenMs: REGISTRATION_TIMEOUT_MS,
      };
    };
  return {
    requestRegistration: qn,
    consentDecided(ye) {
      if (((jr = ye), ye === "declined")) e.arm(null);
      qn("consent");
    },
    turnInFlight() {
      (zr(), (Ie = !0), Pc());
    },
    turnEnded() {
      Ie = !1;
    },
    activity() {
      Pc();
    },
    ensureRegistered() {
      if ((zr("send"), pn || At || memory.standing.kind !== "dormant")) return (Pc(), Promise.resolve());
      qn("send");
      let ye = he;
      if (ye === null) return Promise.resolve();
      let Xe = ye.done.then(
        () => {},
        () => {},
      );
      return new Promise((ot) => {
        let setTimer = e.setTimer(ot, CN);
        Xe.then(() => {
          (setTimer.clear(), ot());
        });
      });
    },
    settingsChanged() {
      if (pn || Z === "stopped") return;
      let capture = e.capture();
      if (
        ((baseline = capture),
        capture.kind === "captured" && capture.checkoutDisablesAllHooks && Vnt(capture))
      )
        if (Ec === !1 && jr !== "declined") Bp();
        else r.inventoryDirty = !0;
      let Xe = captureFingerprint(capture);
      if (An !== null && Xe === An) return;
      ((An = Xe), (ln = !1), Vi(), qn("settings"));
    },
    servingMute(ye) {
      if (((servingMuted = ye), pn || At)) return;
      if (ye) {
        if (Z === "stopped") return;
        if (((se = !0), jp(), Qt("muted", "mute"), he !== null))
          if (he.sent)
            (vs(he.instanceId, UNREGISTER_TIMEOUT_MS),
              (yt = { budgetMs: UNREGISTER_TIMEOUT_MS, instanceId: he.instanceId }));
          else Vi();
        kr("muted");
        return;
      }
      if (Z !== "stopped" || ee !== "muted") return;
      (e.arm(null),
        (Z = "idle"),
        (memory.standing = { kind: "idle" }),
        (ee = void 0),
        (se = !1),
        (or = null),
        wr.delete("muted"),
        Vi(),
        qn("mute"));
    },
    async unregister(ye) {
      if ((Ki(), e.arm(null), (At = !0), (Se = null), he !== null)) {
        yt = { budgetMs: ye };
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
      ((pn = !0), abortController.abort(), Ki());
    },
    snapshot: () => ({
      phase: Z,
      instanceId: r.instanceId,
      registeredInstanceId: Q?.instanceId ?? null,
      inventory: r.inventory,
      leaseExpiresAt: P,
      workerEpoch: x,
      templateStatuses: G,
      lastOutcome: Up,
      ...(ee !== void 0 && { stoppedReason: ee }),
    }),
  };
}
/**
 * 创建设备 hook 注册表：按会话管理服务方、发送方与同意固定项。
 */
//@ chunk-s61vbvea.js:373239-373630 placement
function createDeviceHookRegistry() {
  let e = new Map(),
    n = new Map(),
    r = new Map();
  return {
    servicerFor: (s) => x_(e, s, c_),
    senderFor: (s) => x_(n, s, createDeviceHookSenderMemory),
    consentPin: a_(),
    consentAnnounced: l_(),
    noteAttached: (s) => {
      r.set(s, (r.get(s) ?? 0) + 1);
      let h = !1;
      return () => {
        if (h) return;
        h = !0;
        let y = (r.get(s) ?? 1) - 1;
        if (y > 0) r.set(s, y);
        else r.delete(s);
      };
    },
    isAttached: (s) => (r.get(s) ?? 0) > 0,
    legacyConfigFile: void 0,
    legacyEnvPin: void 0,
    servedSettingsChanged: createSignal(),
  };
}
//@ chunk-s61vbvea.js:373630-373647 placement
var deviceHooksProcessMemories = new HostScoped(createDeviceHookRegistry);
//@ chunk-s61vbvea.js:373647-373734 placement
function x_(e, n, r) {
  let s = e.get(n);
  if (s !== void 0) return s;
  let h = r();
  return (e.set(n, h), h);
}

export {
  deviceHooksProcessMemories,
  deviceHooksRegistrationState,
  Vnt,
  isHookScopeInReach,
  qVo,
  DeviceHooksRegistration,
  UNREGISTER_TIMEOUT_MS,
};
