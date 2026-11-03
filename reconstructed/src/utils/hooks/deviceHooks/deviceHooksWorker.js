/**
 * utils/hooks/deviceHooks/deviceHooksWorker.ts
 *
 * 设备钩子 worker（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5ac1fnqf.js (6)
 * attribution: placement 6
 */
import { isMatcherEvent, MATCHER_NAME_RE } from "../hookEventSets.js";
import { withDeadline } from "../../sleep.js";
import { jsonStringifyRaw } from "../../slowOperations.js";
import {
  SDKRegisterDeviceHooksRegisterDeviceHooksMessageSchema,
  RegisterDeviceHooksResponseSchema,
  SDKUploadDeviceHookTemplateUploadDeviceHookTemplateMessageSchema,
} from "../../../entrypoints/sdk/controlSchemas.js";
import { sanitizeDisplayText, MAX_TITLE_LENGTH } from "../../resultError.js";
import { parseDeviceHookId } from "../deviceHookId.js";
import { isPreToolUseTemplate, alwaysTrue } from "../hookTemplates.js";
import { logForDebugging } from "../../debug.js";
import { count } from "../../collections.js";
import { isDiskless } from "../../../bootstrap/state.js";

//@ chunk-5ac1fnqf.js:1009-1053 placement
var MAX_REGISTRATION_BODY_CHARS = 65536;
var DEFAULT_LEASE_S = 600;
var ERROR_TEXT_MAX_CHARS = 200;
var TEMPLATE_PREPARE_TIMEOUT_MS = 5000;
var SWEEP_INTERVAL_MS = 300000;
//@ chunk-5ac1fnqf.js:1053-1119 placement
function clampTemplateTimeoutS(timeoutS) {
  return Math.min(600, Math.max(5, Math.round(timeoutS ?? 60)));
}
//@ chunk-5ac1fnqf.js:1119-1331 placement
function classifyTemplateRegistration(o, m) {
  if (o === undefined) return "unknown_template";
  if (!o.digests.some((digest) => digest.sha256 === m.digest)) return "version_mismatch";
  if (m.event !== o.event || !isMatcherEvent(m.event)) return "event_not_allowed";
  return "awaiting_upload";
}
//@ chunk-5ac1fnqf.js:1331-9485 placement
/**
 * 设备钩子 worker 主体：策略禁用、等待、转发钩子到云会话
 */
function runDeviceHooksWorker(o) {
  let m = null;
  let v = new Map();
  let y = new Map();
  o.registry.onLeaseExpired((l) => o.forwarder.removeForOwner(l.instanceId));
  let M = () =>
    o.policy.pluginOnly() ||
    o.policy.customizationDisabled() ||
    o.policy.managedOnly() ||
    o.policy.allDisabled();
  let b = () => {
    let l = o.registry.current();
    if (l !== null) {
      o.forwarder.removeForOwner(l.instanceId);
      o.templateRunner.remove(l.instanceId);
    }
    o.registry.clear();
    y.clear();
    o.templates.clear();
  };
  let O = async () => {
    let shared = m !== null && !m.settled;
    if (m === null || m.settled) {
      let i = {
        promise: o.readAccountFlags(),
        startedAt: o.now(),
        settled: false,
      };
      i.promise.then(
        () => (i.settled = true),
        () => (i.settled = true),
      );
      m = i;
    }
    let s = m;
    let a = o.now();
    let max = Math.max(0, o.flagWaitCapMs - (a - s.startedAt));
    return {
      state:
        (await withDeadline(
          s.promise.then(
            (i) => (i ? "on" : "off"),
            () => "pending",
          ),
          max,
        )) ?? "pending",
      waitMs: o.now() - a,
      shared,
    };
  };
  let A = async () => {
    let l = {
      flagWaitMs: 0,
      sharedFlagRead: false,
    };
    if (M()) {
      b();
      return {
        ok: false,
        error: "hook_forwarding_disabled: policy",
        outcome: "disabled_policy",
        ...l,
      };
    }
    let s = await O();
    let a = {
      flagWaitMs: s.waitMs,
      sharedFlagRead: s.shared,
    };
    if (s.state === "pending")
      return {
        ok: false,
        error: "hook_forwarding_not_ready: feature flags not yet available; retry",
        outcome: "not_ready",
        ...a,
      };
    if (s.state === "off") {
      b();
      return {
        ok: false,
        error: "hook_forwarding_disabled: flag_off",
        outcome: "disabled_flag_off",
        ...a,
      };
    }
    if (M()) {
      b();
      return {
        ok: false,
        error: "hook_forwarding_disabled: policy",
        outcome: "disabled_policy",
        ...a,
      };
    }
    return {
      ok: true,
      ...a,
    };
  };
  let P = async (l) => {
    let s = {
      flagWaitMs: 0,
      sharedFlagRead: false,
    };
    if (jsonStringifyRaw(l).length > MAX_REGISTRATION_BODY_CHARS)
      return {
        ok: false,
        error: "invalid_registration: request larger than 64 KiB",
        outcome: "invalid",
        ...s,
      };
    let a = SDKRegisterDeviceHooksRegisterDeviceHooksMessageSchema().safeParse(l.request);
    if (!a.success)
      return {
        ok: false,
        error: `invalid_registration: ${sanitizeDisplayText(a.error.issues[0]?.message ?? "malformed", {
          maxCodeUnits: ERROR_TEXT_MAX_CHARS,
        })}`,
        outcome: "invalid",
        ...s,
      };
    if (a.data.worker_epoch !== undefined && a.data.worker_epoch !== o.workerEpoch)
      return {
        ok: false,
        error: `stale_worker_epoch: worker epoch is ${o.workerEpoch}`,
        outcome: "stale_epoch",
        ...s,
      };
    let c = await A();
    return c.ok
      ? {
          ok: true,
          parsed: a.data,
          flagWaitMs: c.flagWaitMs,
          sharedFlagRead: c.sharedFlagRead,
        }
      : c;
  };
  let T = async (l) => {
    let s = await P(l);
    if (!s.ok) {
      o.telemetry.register({
        outcome: s.outcome,
        accepted: 0,
        ignored: 0,
        templatesAwaitingUpload: 0,
        templatesRefused: 0,
        flagWaitMs: s.flagWaitMs,
        sharedFlagRead: s.sharedFlagRead,
      });
      return {
        kind: "error",
        error: s.error,
      };
    }
    let parsed = s.parsed;
    let c = o.projectRoot();
    let u = o.cwd();
    let success = RegisterDeviceHooksResponseSchema().safeParse({
      status: "unregistered",
      project_dir: c,
      cwd: u,
      worker_epoch: o.workerEpoch,
    }).success;
    let d = {
      project_dir: c,
      cwd: success ? u : c,
      worker_epoch: o.workerEpoch,
    };
    let D = (e, n) => {
      if (o.registry.removeOwner(parsed.instance_id)) {
        o.forwarder.removeForOwner(parsed.instance_id);
        o.templateRunner.remove(parsed.instance_id);
      }
      y.delete(parsed.instance_id);
      o.telemetry.register({
        outcome: "unregistered",
        accepted: 0,
        ignored: e.length,
        templatesAwaitingUpload: 0,
        templatesRefused: n.length,
        flagWaitMs: s.flagWaitMs,
        sharedFlagRead: s.sharedFlagRead,
      });
      return {
        kind: "success",
        response: {
          status: "unregistered",
          ...d,
          ...(e.length > 0 && {
            ignored_ids: e.slice(0, 128),
          }),
          ...(n.length > 0 && {
            templates: [...n],
          }),
        },
      };
    };
    if (parsed.hooks.length === 0 && parsed.templates.length === 0) return D([], []);
    let k = [];
    let _ = [];
    let S = new Set();
    for (let hook of parsed.hooks) {
      let deviceHookId = parseDeviceHookId(hook.id);
      let p =
        hook.matcher === undefined ||
        hook.matcher === "" ||
        hook.matcher === "*" ||
        MATCHER_NAME_RE.test(hook.matcher);
      let C = S.has(hook.id);
      S.add(hook.id);
      if (
        C ||
        deviceHookId === null ||
        deviceHookId.instanceId !== parsed.instance_id ||
        deviceHookId.event !== hook.event ||
        !isMatcherEvent(hook.event) ||
        !p
      ) {
        _.push(hook.id);
        continue;
      }
      k.push({
        id: hook.id,
        event: hook.event,
        ...(hook.matcher !== undefined &&
          hook.matcher !== "" &&
          hook.matcher !== "*" && {
            matcher: hook.matcher,
          }),
        kind: hook.kind,
        ...(hook.timeout_s !== undefined && {
          timeoutS: hook.timeout_s,
        }),
        source: hook.source,
        hasCondition: hook.has_condition === true,
        targetPinned: hook.target_pinned === true,
      });
    }
    let f = {};
    let R = new Map();
    let g = new Map();
    let r = new Set();
    let W = y.get(parsed.instance_id) ?? new Map();
    let h = new Map();
    let q = (template) => {
      let n = W.get(template);
      if (n === undefined) return false;
      R.set(n.matcher, template);
      f[n.event] = [...(f[n.event] ?? []), n.matcher];
      h.set(template, n);
      r.add(template);
      return true;
    };
    let K = (e, timeout) => {
      if (!isPreToolUseTemplate(e) || !v.get(parsed.instance_id)?.has(e.id)) return;
      let p = {
        matcher: e.matcher,
        hooks: [
          {
            type: "callback",
            timeout,
            callback: async () => {
              o.telemetry.templateStandInBlocked?.({
                template: e.id,
              });
              return {
                decision: "block",
                reason: `cloud template ${e.id} could not be installed on this worker; matching calls are blocked until it is (register again to retry)`,
              };
            },
          },
        ],
      };
      R.set(p, e.id);
      f[e.event] = [...(f[e.event] ?? []), p];
      h.set(e.id, {
        event: e.event,
        matcher: p,
      });
      r.add(e.id);
    };
    let N = new Map(parsed.templates.map((template) => [template.template, template]));
    for (let e of N.values()) {
      let n = o.templates.template(e.template);
      let p = classifyTemplateRegistration(n, e);
      let C = p === "awaiting_upload" ? o.templates.bytesFor(e.digest) : undefined;
      if (n === undefined || C === undefined) {
        g.set(e.template, {
          template: e.template,
          status: p,
        });
        if (!q(e.template) && n !== undefined) K(n, clampTemplateTimeoutS(e.timeout_s));
        continue;
      }
      let timeout = clampTemplateTimeoutS(e.timeout_s);
      if ((await o.templateRunner.resolveInterpreter()) === null) {
        g.set(e.template, {
          template: e.template,
          status: "interpreter_unavailable",
        });
        if (!q(e.template)) K(n, timeout);
        continue;
      }
      let j;
      try {
        j = await withDeadline(
          o.templateRunner.prepare(n, e.digest, C, timeout),
          TEMPLATE_PREPARE_TIMEOUT_MS,
        );
        if (j === undefined) throw Error("template prepare timed out");
      } catch (error) {
        logForDebugging(
          `[deviceHooks] template ${e.template} install failed: ${error instanceof Error ? error.message : String(error)}`,
          {
            level: "error",
          },
        );
        g.set(e.template, {
          template: e.template,
          status: "install_failed",
        });
        if (!q(e.template)) K(n, timeout);
        continue;
      }
      let L = {
        matcher: n.matcher,
        hooks: [
          {
            type: "callback",
            timeout,
            callback: j,
          },
        ],
      };
      R.set(L, n.id);
      f[n.event] = [...(f[n.event] ?? []), L];
      h.set(n.id, {
        event: n.event,
        matcher: L,
      });
      g.set(e.template, {
        template: e.template,
        status: "installed",
      });
    }
    let E = [...g.values()];
    if (M()) {
      b();
      o.telemetry.register({
        outcome: "disabled_policy",
        accepted: 0,
        ignored: 0,
        templatesAwaitingUpload: 0,
        templatesRefused: 0,
        flagWaitMs: s.flagWaitMs,
        sharedFlagRead: s.sharedFlagRead,
      });
      return {
        kind: "error",
        error: "hook_forwarding_disabled: policy",
      };
    }
    let leaseS = parsed.lease_s ?? DEFAULT_LEASE_S;
    let z = o.now() + leaseS * 1000;
    let w = {
      instanceId: parsed.instance_id,
      displayName:
        sanitizeDisplayText(parsed.display_name ?? "", {
          maxCodeUnits: MAX_TITLE_LENGTH,
        }) || parsed.instance_id,
      epoch: o.workerEpoch,
      leaseExpiresAt: z,
      entries: k,
      templates: [...N.values()].flatMap((e) => {
        let status = g.get(e.template)?.status;
        let p = r.has(e.template) ? (h.get(e.template)?.event ?? e.event) : e.event;
        return (status === "awaiting_upload" || status === "installed" || r.has(e.template)) &&
          isMatcherEvent(p)
          ? [
              {
                template: e.template,
                digest: e.digest,
                event: p,
                ...(e.timeout_s !== undefined && {
                  timeoutS: e.timeout_s,
                }),
              },
            ]
          : [];
      }),
    };
    if (w.entries.length === 0 && w.templates.length === 0) return D(_, E);
    let { replaced, awaySince } = o.registry.replaceOwner(w);
    if (replaced !== undefined) {
      o.forwarder.removeForOwner(replaced);
      o.templateRunner.remove(replaced);
      y.delete(replaced);
    }
    o.forwarder.installForOwner(w);
    o.templateRunner.install(w.instanceId, f, (e, n) => R.get(n) ?? "template");
    y.set(w.instanceId, h);
    let V = v.get(w.instanceId) ?? new Set();
    for (let e of g.values()) if (e.status === "installed") V.add(e.template);
    v.set(w.instanceId, V);
    let J = count(E, (e) => e.status === "awaiting_upload");
    let Q = count(E, (e) => e.status === "installed");
    o.telemetry.register({
      outcome: "accepted",
      accepted: k.length,
      ignored: _.length,
      templatesAwaitingUpload: J,
      templatesInstalled: Q,
      templatesRefused: E.length - J - Q,
      flagWaitMs: s.flagWaitMs,
      sharedFlagRead: s.sharedFlagRead,
    });
    return {
      kind: "success",
      response: {
        status: "registered",
        ...d,
        lease_s: leaseS,
        lease_expires_at: new Date(z).toISOString(),
        accepted: k.length,
        ignored: _.length,
        ...(_.length > 0 && {
          ignored_ids: _.slice(0, 128),
        }),
        templates: E,
        ...(replaced !== undefined && {
          replaced_owner: replaced,
        }),
        ...(awaySince !== undefined && {
          away_since: new Date(awaySince).toISOString(),
        }),
      },
    };
  };
  let x = 400000;
  let U = async (l) => {
    let s = (outcome, template = "unknown", bytes = 0) =>
      o.telemetry.upload({
        outcome,
        template,
        bytes,
      });
    if (jsonStringifyRaw(l).length > x) {
      s("invalid");
      return {
        kind: "error",
        error: "invalid_upload: request larger than 400 KB",
      };
    }
    let a = SDKUploadDeviceHookTemplateUploadDeviceHookTemplateMessageSchema().safeParse(l.request);
    if (!a.success) {
      s("invalid");
      return {
        kind: "error",
        error: `invalid_upload: ${sanitizeDisplayText(a.error.issues[0]?.message ?? "malformed", {
          maxCodeUnits: ERROR_TEXT_MAX_CHARS,
        })}`,
      };
    }
    let c = a.data;
    if (c.worker_epoch !== undefined && c.worker_epoch !== o.workerEpoch) {
      s("stale_epoch", c.template);
      return {
        kind: "error",
        error: `stale_worker_epoch: worker epoch is ${o.workerEpoch}`,
      };
    }
    let u = await A();
    if (!u.ok) {
      s(u.outcome, c.template);
      return {
        kind: "error",
        error: u.error,
      };
    }
    let i = o.templates.accept({
      template: c.template,
      digest: c.digest,
      contentBase64: c.content_base64,
    });
    if (!i.ok) {
      s(i.kind, c.template);
      return {
        kind: "error",
        error: i.error,
      };
    }
    s(i.status, i.template.id, i.bytes);
    return {
      kind: "success",
      response: {
        template: i.template.id,
        digest: c.digest,
        status: i.status,
      },
    };
  };
  return {
    async handle(l) {
      switch (l.request.subtype) {
        case "register_device_hooks":
          return T(l);
        case "upload_device_hook_template":
          return U(l);
        default:
          return {
            kind: "error",
            error: `Unsupported control request subtype: ${l.request.subtype}`,
          };
      }
    },
  };
}
//@ chunk-5ac1fnqf.js:9485-9549 placement
function positiveEpoch(workerEpoch) {
  return workerEpoch !== undefined && Number.isInteger(workerEpoch) && workerEpoch >= 1 ? workerEpoch : 1;
}
//@ chunk-5ac1fnqf.js:9549-12689 placement
/**
 * 云会话 worker 侧的设备钩子主体：按需加载依赖，建立钩子注册表与转发器（记录 tengu_device_hook_forwarded），根据策略（仅插件、自定义禁用、仅托管、全部禁用）与账户开关决定是否启用，并处理模板注册。
 */
async function startDeviceHooksWorker(o) {
  let [
    { isRestrictedToPluginOnly: m },
    { isCustomizationDisabled: v },
    { shouldHoldDeviceHooksByPolicy: y, shouldDisableAllHooksIncludingManaged: M },
    { isAccountGateServed: b, isViolinAmatiEnabled: O },
    { getToolServingFlagAnsweredOff: A, isToolServingEnabled: P },
    { refreshGrowthBookFeatures: T },
    { createDeviceHookRegistry: x, productionRegistryTimer: U },
    { createDeviceHookForwarder: l, productionForwarderTimer: s },
    { createDeviceHookTemplateStore: a },
    { productionDeviceHookTemplateRunner: c, telemetryTemplateId: u },
    { logEvent: i },
    { fromEnum: d },
    { logFeatureBad: D, logFeatureOk: k, logFeatureSad: _ },
  ] = await Promise.all([
    import("./chunk-j7cx0xp0.js"),
    import("./chunk-kz1hsbpq.js"),
    import("./chunk-xjx4z12z.js"),
    import("./chunk-m288yvvf.js"),
    import("./chunk-x9yaktkd.js"),
    import("./chunk-6df1d6re.js"),
    import("./chunk-phgcpy6c.js"),
    import("./chunk-mfz5tce2.js"),
    import("./chunk-6vmp3d2t.js"),
    import("./chunk-y47q51t0.js"),
    import("./chunk-ezz35vxh.js"),
    import("./chunk-01ass7n1.js"),
    import("./chunk-53at0fec.js"),
  ]);
  let registry = x({
    now: Date.now,
    setTimer: U,
    onLeaseExpired: () => i("tengu_device_hooks_lease_expired", {}),
  });
  let forwarder = l({
    registry,
    sender: o.sender,
    toolAliases: o.toolAliases,
    now: Date.now,
    setTimer: s,
    telemetry: {
      forwarded: (r) =>
        i("tengu_device_hook_forwarded", {
          event: d(r.event),
          outcome: d(r.outcome),
          fields_dropped: r.fieldsDropped,
          blocked: r.blocked,
          rtt_ms: r.rttMs,
          error_replies_ignored: r.errorRepliesIgnored,
          malformed_replies_ignored: r.malformedRepliesIgnored,
        }),
    },
  });
  let R = {
    policy: {
      pluginOnly: () => m("hooks"),
      customizationDisabled: () => v("hooks"),
      managedOnly: y,
      allDisabled: M,
    },
    readAccountFlags: async () => {
      let [r, W] = await Promise.all([
        P({
          cloudClient: true,
        }),
        O(),
      ]);
      if (r && W) {
        if (!alwaysTrue()) return true;
        i("tengu_device_hooks_shelved", {
          side: d("worker"),
        });
        return false;
      }
      let h =
        A({
          cloudClient: true,
        }) ?? (!W && b("tengu_violin_amati") ? "tengu_violin_amati" : undefined);
      if (h === undefined) {
        T().catch(() => {});
        throw Error("account flags not served yet");
      }
      i("tengu_device_hooks_account_flag_off", {
        flag: d(h),
      });
      return false;
    },
    flagWaitCapMs: 5000,
    now: Date.now,
    workerEpoch: positiveEpoch(o.workerEpoch),
    projectRoot: o.projectRoot,
    cwd: o.cwd,
    registry,
    forwarder,
    templates: a(),
    templateRunner: isDiskless()
      ? {
          resolveInterpreter: async () => null,
          prepare: async () => {
            throw Error("no device hook templates in a diskless session");
          },
          install: () => {},
          remove: () => {},
        }
      : c(o.projectRoot),
    telemetry: {
      templateStandInBlocked: (r) =>
        i("tengu_device_hook_template_run", {
          template: d(u(r.template)),
          outcome: d("stand_in_blocked"),
          duration_ms: 0,
        }),
      upload: (r) =>
        i("tengu_device_hook_template_upload", {
          outcome: d(r.outcome),
          template: d(u(r.template)),
          bytes: r.bytes,
        }),
      register: (r) => {
        i("tengu_device_hooks_register", {
          outcome: d(r.outcome),
          accepted: r.accepted,
          ignored: r.ignored,
          templates_awaiting_upload: r.templatesAwaitingUpload,
          templates_installed: r.templatesInstalled ?? 0,
          templates_refused: r.templatesRefused,
          flag_wait_ms: r.flagWaitMs,
          shared_flag_read: r.sharedFlagRead,
        });
        if (r.outcome === "accepted" || r.outcome === "unregistered")
          k("device_hooks_register", {
            accepted: r.accepted,
          });
        else if (r.outcome === "not_ready") _("device_hooks_register", r.outcome);
        else D("device_hooks_register", r.outcome);
      },
    },
  };
  let now = Date.now();
  return {
    ...R,
    readAccountFlags: () => {
      let now_2 = Date.now();
      if (now_2 - now >= SWEEP_INTERVAL_MS) {
        now = now_2;
        T().catch(() => {});
      }
      return R.readAccountFlags();
    },
  };
}
