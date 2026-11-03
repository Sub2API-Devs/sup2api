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
import { hee, qVe } from "../hookEventSets.js";
import { withDeadline } from "../../sleep.js";
import { jsonStringifyRaw } from "../../slowOperations.js";
import {
  SDKRegisterDeviceHooksRegisterDeviceHooksMessageSchema,
  tIt,
  SDKUploadDeviceHookTemplateUploadDeviceHookTemplateMessageSchema,
} from "../../../entrypoints/sdk/controlSchemas.js";
import { sanitizeDisplayText, MAX_TITLE_LENGTH } from "../../resultError.js";
import { parseDeviceHookId } from "../deviceHookId.js";
import { isPreToolUseTemplate, alwaysTrue } from "../hookTemplates.js";
import { logForDebugging } from "../../debug.js";
import { count } from "../../collections.js";
import { isDiskless } from "../../../bootstrap/state.js";

//@ chunk-5ac1fnqf.js:1009-1053 placement
var te = 65536,
  oe = 600,
  Z = 200,
  re = 5000,
  ae = 300000;
//@ chunk-5ac1fnqf.js:1053-1119 placement
function ee(o) {
  return Math.min(600, Math.max(5, Math.round(o ?? 60)));
}
//@ chunk-5ac1fnqf.js:1119-1331 placement
function classifyTemplateRegistration(o, m) {
  if (o === void 0) return "unknown_template";
  if (!o.digests.some((digest) => digest.sha256 === m.digest)) return "version_mismatch";
  if (m.event !== o.event || !hee(m.event)) return "event_not_allowed";
  return "awaiting_upload";
}
/**
 * 设备钩子 worker 主体：策略禁用、等待、转发钩子到云会话
 */
//@ chunk-5ac1fnqf.js:1331-9485 placement
function runDeviceHooksWorker(o) {
  let m = null,
    v = new Map(),
    y = new Map();
  o.registry.onLeaseExpired((l) => o.forwarder.removeForOwner(l.instanceId));
  let M = () =>
      o.policy.pluginOnly() ||
      o.policy.customizationDisabled() ||
      o.policy.managedOnly() ||
      o.policy.allDisabled(),
    b = () => {
      let l = o.registry.current();
      if (l !== null) (o.forwarder.removeForOwner(l.instanceId), o.templateRunner.remove(l.instanceId));
      (o.registry.clear(), y.clear(), o.templates.clear());
    },
    O = async () => {
      let l = m !== null && !m.settled;
      if (m === null || m.settled) {
        let i = { promise: o.readAccountFlags(), startedAt: o.now(), settled: !1 };
        (i.promise.then(
          () => (i.settled = !0),
          () => (i.settled = !0),
        ),
          (m = i));
      }
      let s = m,
        now = o.now(),
        max = Math.max(0, o.flagWaitCapMs - (now - s.startedAt));
      return {
        state:
          (await withDeadline(
            s.promise.then(
              (i) => (i ? "on" : "off"),
              () => "pending",
            ),
            max,
          )) ?? "pending",
        waitMs: o.now() - now,
        shared: l,
      };
    },
    A = async () => {
      let l = { flagWaitMs: 0, sharedFlagRead: !1 };
      if (M())
        return (b(), { ok: !1, error: "hook_forwarding_disabled: policy", outcome: "disabled_policy", ...l });
      let s = await O(),
        a = { flagWaitMs: s.waitMs, sharedFlagRead: s.shared };
      if (s.state === "pending")
        return {
          ok: !1,
          error: "hook_forwarding_not_ready: feature flags not yet available; retry",
          outcome: "not_ready",
          ...a,
        };
      if (s.state === "off")
        return (
          b(),
          { ok: !1, error: "hook_forwarding_disabled: flag_off", outcome: "disabled_flag_off", ...a }
        );
      if (M())
        return (b(), { ok: !1, error: "hook_forwarding_disabled: policy", outcome: "disabled_policy", ...a });
      return { ok: !0, ...a };
    },
    P = async (l) => {
      let s = { flagWaitMs: 0, sharedFlagRead: !1 };
      if (jsonStringifyRaw(l).length > te)
        return {
          ok: !1,
          error: "invalid_registration: request larger than 64 KiB",
          outcome: "invalid",
          ...s,
        };
      let safeParse = SDKRegisterDeviceHooksRegisterDeviceHooksMessageSchema().safeParse(l.request);
      if (!safeParse.success)
        return {
          ok: !1,
          error: `invalid_registration: ${sanitizeDisplayText(safeParse.error.issues[0]?.message ?? "malformed", { maxCodeUnits: Z })}`,
          outcome: "invalid",
          ...s,
        };
      if (safeParse.data.worker_epoch !== void 0 && safeParse.data.worker_epoch !== o.workerEpoch)
        return {
          ok: !1,
          error: `stale_worker_epoch: worker epoch is ${o.workerEpoch}`,
          outcome: "stale_epoch",
          ...s,
        };
      let c = await A();
      return c.ok
        ? { ok: !0, parsed: safeParse.data, flagWaitMs: c.flagWaitMs, sharedFlagRead: c.sharedFlagRead }
        : c;
    },
    T = async (l) => {
      let s = await P(l);
      if (!s.ok)
        return (
          o.telemetry.register({
            outcome: s.outcome,
            accepted: 0,
            ignored: 0,
            templatesAwaitingUpload: 0,
            templatesRefused: 0,
            flagWaitMs: s.flagWaitMs,
            sharedFlagRead: s.sharedFlagRead,
          }),
          { kind: "error", error: s.error }
        );
      let parsed = s.parsed,
        projectRoot = o.projectRoot(),
        cwd = o.cwd(),
        success = tIt().safeParse({
          status: "unregistered",
          project_dir: projectRoot,
          cwd: cwd,
          worker_epoch: o.workerEpoch,
        }).success,
        d = { project_dir: projectRoot, cwd: success ? cwd : projectRoot, worker_epoch: o.workerEpoch },
        D = (e, n) => {
          if (o.registry.removeOwner(parsed.instance_id))
            (o.forwarder.removeForOwner(parsed.instance_id), o.templateRunner.remove(parsed.instance_id));
          return (
            y.delete(parsed.instance_id),
            o.telemetry.register({
              outcome: "unregistered",
              accepted: 0,
              ignored: e.length,
              templatesAwaitingUpload: 0,
              templatesRefused: n.length,
              flagWaitMs: s.flagWaitMs,
              sharedFlagRead: s.sharedFlagRead,
            }),
            {
              kind: "success",
              response: {
                status: "unregistered",
                ...d,
                ...(e.length > 0 && { ignored_ids: e.slice(0, 128) }),
                ...(n.length > 0 && { templates: [...n] }),
              },
            }
          );
        };
      if (parsed.hooks.length === 0 && parsed.templates.length === 0) return D([], []);
      let k = [],
        _ = [],
        S = new Set();
      for (let hook of parsed.hooks) {
        let n = parseDeviceHookId(hook.id),
          p =
            hook.matcher === void 0 || hook.matcher === "" || hook.matcher === "*" || qVe.test(hook.matcher),
          C = S.has(hook.id);
        if (
          (S.add(hook.id),
          C ||
            n === null ||
            n.instanceId !== parsed.instance_id ||
            n.event !== hook.event ||
            !hee(hook.event) ||
            !p)
        ) {
          _.push(hook.id);
          continue;
        }
        k.push({
          id: hook.id,
          event: hook.event,
          ...(hook.matcher !== void 0 &&
            hook.matcher !== "" &&
            hook.matcher !== "*" && { matcher: hook.matcher }),
          kind: hook.kind,
          ...(hook.timeout_s !== void 0 && { timeoutS: hook.timeout_s }),
          source: hook.source,
          hasCondition: hook.has_condition === !0,
          targetPinned: hook.target_pinned === !0,
        });
      }
      let f = {},
        R = new Map(),
        g = new Map(),
        r = new Set(),
        W = y.get(parsed.instance_id) ?? new Map(),
        h = new Map(),
        q = (e) => {
          let n = W.get(e);
          if (n === void 0) return !1;
          return (
            R.set(n.matcher, e),
            (f[n.event] = [...(f[n.event] ?? []), n.matcher]),
            h.set(e, n),
            r.add(e),
            !0
          );
        },
        K = (e, n) => {
          if (!isPreToolUseTemplate(e) || !v.get(parsed.instance_id)?.has(e.id)) return;
          let p = {
            matcher: e.matcher,
            hooks: [
              {
                type: "callback",
                timeout: n,
                callback: async () => (
                  o.telemetry.templateStandInBlocked?.({ template: e.id }),
                  {
                    decision: "block",
                    reason: `cloud template ${e.id} could not be installed on this worker; matching calls are blocked until it is (register again to retry)`,
                  }
                ),
              },
            ],
          };
          (R.set(p, e.id),
            (f[e.event] = [...(f[e.event] ?? []), p]),
            h.set(e.id, { event: e.event, matcher: p }),
            r.add(e.id));
        },
        N = new Map(parsed.templates.map((template) => [template.template, template]));
      for (let e of N.values()) {
        let template = o.templates.template(e.template),
          p = classifyTemplateRegistration(template, e),
          C = p === "awaiting_upload" ? o.templates.bytesFor(e.digest) : void 0;
        if (template === void 0 || C === void 0) {
          if ((g.set(e.template, { template: e.template, status: p }), !q(e.template) && template !== void 0))
            K(template, ee(e.timeout_s));
          continue;
        }
        let I = ee(e.timeout_s);
        if ((await o.templateRunner.resolveInterpreter()) === null) {
          if (
            (g.set(e.template, { template: e.template, status: "interpreter_unavailable" }), !q(e.template))
          )
            K(template, I);
          continue;
        }
        let j;
        try {
          if (
            ((j = await withDeadline(o.templateRunner.prepare(template, e.digest, C, I), re)), j === void 0)
          )
            throw Error("template prepare timed out");
        } catch (error) {
          if (
            (logForDebugging(
              `[deviceHooks] template ${e.template} install failed: ${error instanceof Error ? error.message : String(error)}`,
              { level: "error" },
            ),
            g.set(e.template, { template: e.template, status: "install_failed" }),
            !q(e.template))
          )
            K(template, I);
          continue;
        }
        let L = { matcher: template.matcher, hooks: [{ type: "callback", timeout: I, callback: j }] };
        (R.set(L, template.id),
          (f[template.event] = [...(f[template.event] ?? []), L]),
          h.set(template.id, { event: template.event, matcher: L }),
          g.set(e.template, { template: e.template, status: "installed" }));
      }
      let E = [...g.values()];
      if (M())
        return (
          b(),
          o.telemetry.register({
            outcome: "disabled_policy",
            accepted: 0,
            ignored: 0,
            templatesAwaitingUpload: 0,
            templatesRefused: 0,
            flagWaitMs: s.flagWaitMs,
            sharedFlagRead: s.sharedFlagRead,
          }),
          { kind: "error", error: "hook_forwarding_disabled: policy" }
        );
      let G = parsed.lease_s ?? oe,
        z = o.now() + G * 1000,
        w = {
          instanceId: parsed.instance_id,
          displayName:
            sanitizeDisplayText(parsed.display_name ?? "", { maxCodeUnits: MAX_TITLE_LENGTH }) ||
            parsed.instance_id,
          epoch: o.workerEpoch,
          leaseExpiresAt: z,
          entries: k,
          templates: [...N.values()].flatMap((e) => {
            let n = g.get(e.template)?.status,
              p = r.has(e.template) ? (h.get(e.template)?.event ?? e.event) : e.event;
            return (n === "awaiting_upload" || n === "installed" || r.has(e.template)) && hee(p)
              ? [
                  {
                    template: e.template,
                    digest: e.digest,
                    event: p,
                    ...(e.timeout_s !== void 0 && { timeoutS: e.timeout_s }),
                  },
                ]
              : [];
          }),
        };
      if (w.entries.length === 0 && w.templates.length === 0) return D(_, E);
      let { replaced: replaced, awaySince: awaySince } = o.registry.replaceOwner(w);
      if (replaced !== void 0)
        (o.forwarder.removeForOwner(replaced), o.templateRunner.remove(replaced), y.delete(replaced));
      (o.forwarder.installForOwner(w),
        o.templateRunner.install(w.instanceId, f, (e, n) => R.get(n) ?? "template"),
        y.set(w.instanceId, h));
      let V = v.get(w.instanceId) ?? new Set();
      for (let e of g.values()) if (e.status === "installed") V.add(e.template);
      v.set(w.instanceId, V);
      let J = count(E, (e) => e.status === "awaiting_upload"),
        Q = count(E, (e) => e.status === "installed");
      return (
        o.telemetry.register({
          outcome: "accepted",
          accepted: k.length,
          ignored: _.length,
          templatesAwaitingUpload: J,
          templatesInstalled: Q,
          templatesRefused: E.length - J - Q,
          flagWaitMs: s.flagWaitMs,
          sharedFlagRead: s.sharedFlagRead,
        }),
        {
          kind: "success",
          response: {
            status: "registered",
            ...d,
            lease_s: G,
            lease_expires_at: new Date(z).toISOString(),
            accepted: k.length,
            ignored: _.length,
            ...(_.length > 0 && { ignored_ids: _.slice(0, 128) }),
            templates: E,
            ...(replaced !== void 0 && { replaced_owner: replaced }),
            ...(awaySince !== void 0 && { away_since: new Date(awaySince).toISOString() }),
          },
        }
      );
    },
    x = 400000,
    U = async (l) => {
      let s = (d, D = "unknown", k = 0) => o.telemetry.upload({ outcome: d, template: D, bytes: k });
      if (jsonStringifyRaw(l).length > x)
        return (s("invalid"), { kind: "error", error: "invalid_upload: request larger than 400 KB" });
      let safeParse = SDKUploadDeviceHookTemplateUploadDeviceHookTemplateMessageSchema().safeParse(l.request);
      if (!safeParse.success)
        return (
          s("invalid"),
          {
            kind: "error",
            error: `invalid_upload: ${sanitizeDisplayText(safeParse.error.issues[0]?.message ?? "malformed", { maxCodeUnits: Z })}`,
          }
        );
      let c = safeParse.data;
      if (c.worker_epoch !== void 0 && c.worker_epoch !== o.workerEpoch)
        return (
          s("stale_epoch", c.template),
          { kind: "error", error: `stale_worker_epoch: worker epoch is ${o.workerEpoch}` }
        );
      let u = await A();
      if (!u.ok) return (s(u.outcome, c.template), { kind: "error", error: u.error });
      let accept = o.templates.accept({
        template: c.template,
        digest: c.digest,
        contentBase64: c.content_base64,
      });
      if (!accept.ok) return (s(accept.kind, c.template), { kind: "error", error: accept.error });
      return (
        s(accept.status, accept.template.id, accept.bytes),
        {
          kind: "success",
          response: { template: accept.template.id, digest: c.digest, status: accept.status },
        }
      );
    };
  return {
    async handle(l) {
      switch (l.request.subtype) {
        case "register_device_hooks":
          return T(l);
        case "upload_device_hook_template":
          return U(l);
        default:
          return { kind: "error", error: `Unsupported control request subtype: ${l.request.subtype}` };
      }
    },
  };
}
//@ chunk-5ac1fnqf.js:9485-9549 placement
function se(o) {
  return o !== void 0 && Number.isInteger(o) && o >= 1 ? o : 1;
}
/**
 * 云会话 worker 侧的设备钩子主体：按需加载依赖，建立钩子注册表与转发器（记录 tengu_device_hook_forwarded），根据策略（仅插件、自定义禁用、仅托管、全部禁用）与账户开关决定是否启用，并处理模板注册。
 */
//@ chunk-5ac1fnqf.js:9549-12689 placement
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
    ]),
    S = x({ now: Date.now, setTimer: U, onLeaseExpired: () => i("tengu_device_hooks_lease_expired", {}) }),
    f = l({
      registry: S,
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
    }),
    R = {
      policy: {
        pluginOnly: () => m("hooks"),
        customizationDisabled: () => v("hooks"),
        managedOnly: y,
        allDisabled: M,
      },
      readAccountFlags: async () => {
        let [r, W] = await Promise.all([P({ cloudClient: !0 }), O()]);
        if (r && W) {
          if (!alwaysTrue()) return !0;
          return (i("tengu_device_hooks_shelved", { side: d("worker") }), !1);
        }
        let h = A({ cloudClient: !0 }) ?? (!W && b("tengu_violin_amati") ? "tengu_violin_amati" : void 0);
        if (h === void 0) throw (T().catch(() => {}), Error("account flags not served yet"));
        return (i("tengu_device_hooks_account_flag_off", { flag: d(h) }), !1);
      },
      flagWaitCapMs: 5000,
      now: Date.now,
      workerEpoch: se(o.workerEpoch),
      projectRoot: o.projectRoot,
      cwd: o.cwd,
      registry: S,
      forwarder: f,
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
          if (
            (i("tengu_device_hooks_register", {
              outcome: d(r.outcome),
              accepted: r.accepted,
              ignored: r.ignored,
              templates_awaiting_upload: r.templatesAwaitingUpload,
              templates_installed: r.templatesInstalled ?? 0,
              templates_refused: r.templatesRefused,
              flag_wait_ms: r.flagWaitMs,
              shared_flag_read: r.sharedFlagRead,
            }),
            r.outcome === "accepted" || r.outcome === "unregistered")
          )
            k("device_hooks_register", { accepted: r.accepted });
          else if (r.outcome === "not_ready") _("device_hooks_register", r.outcome);
          else D("device_hooks_register", r.outcome);
        },
      },
    },
    now = Date.now();
  return {
    ...R,
    readAccountFlags: () => {
      let now_2 = Date.now();
      if (now_2 - now >= ae) ((now = now_2), T().catch(() => {}));
      return R.readAccountFlags();
    },
  };
}
