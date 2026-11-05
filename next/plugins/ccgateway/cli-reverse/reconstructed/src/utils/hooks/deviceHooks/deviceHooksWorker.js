/**
 * utils/hooks/deviceHooks/deviceHooksWorker.ts
 *
 * 设备钩子 worker（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-eczpvz69.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { countWhere } from "../../collections.js";
import { isDiskless } from "../../../bootstrap/state.js";

//@ chunk-eczpvz69.js:1126-1170 placement
var MAX_REGISTRATION_BODY_CHARS = 65536;
var DEFAULT_LEASE_S = 600;
var ERROR_TEXT_MAX_CHARS = 200;
var TEMPLATE_PREPARE_TIMEOUT_MS = 5000;
var SWEEP_INTERVAL_MS = 300000;
//@ chunk-eczpvz69.js:1170-1236 placement
function clampTemplateTimeoutS(timeoutS) {
  return Math.min(600, Math.max(5, Math.round(timeoutS ?? 60)));
}
//@ chunk-eczpvz69.js:1236-1448 placement
function classifyTemplateRegistration(template, registration) {
  if (template === undefined) return "unknown_template";
  if (!template.digests.some((digest) => digest.sha256 === registration.digest)) return "version_mismatch";
  if (registration.event !== template.event || !isMatcherEvent(registration.event))
    return "event_not_allowed";
  return "awaiting_upload";
}
//@ chunk-eczpvz69.js:1448-9602 placement
/**
 * 设备钩子 worker 主体：策略禁用、等待、转发钩子到云会话
 */
function runDeviceHooksWorker(deps) {
  let flagRead = null;
  let shownTemplates = new Map();
  let attestedInstances = new Map();
  deps.registry.onLeaseExpired((lease) => deps.forwarder.removeForOwner(lease.instanceId));
  let hooksDisabled = () =>
    deps.policy.pluginOnly() ||
    deps.policy.customizationDisabled() ||
    deps.policy.managedOnly() ||
    deps.policy.allDisabled();
  let resetAll = () => {
    let current = deps.registry.current();
    if (current !== null) {
      deps.forwarder.removeForOwner(current.instanceId);
      deps.templateRunner.remove(current.instanceId);
    }
    deps.registry.clear();
    attestedInstances.clear();
    deps.templates.clear();
  };
  let readFlagsShared = async () => {
    let shared = flagRead !== null && !flagRead.settled;
    if (flagRead === null || flagRead.settled) {
      let entry = {
        promise: deps.readAccountFlags(),
        startedAt: deps.now(),
        settled: false,
      };
      entry.promise.then(
        () => (entry.settled = true),
        () => (entry.settled = true),
      );
      flagRead = entry;
    }
    let sharedRead = flagRead;
    let now = deps.now();
    let max = Math.max(0, deps.flagWaitCapMs - (now - sharedRead.startedAt));
    return {
      state:
        (await withDeadline(
          sharedRead.promise.then(
            (on) => (on ? "on" : "off"),
            () => "pending",
          ),
          max,
        )) ?? "pending",
      waitMs: deps.now() - now,
      shared,
    };
  };
  let awaitFlags = async () => {
    let result = {
      flagWaitMs: 0,
      sharedFlagRead: false,
    };
    if (hooksDisabled()) {
      resetAll();
      return {
        ok: false,
        error: "hook_forwarding_disabled: policy",
        outcome: "disabled_policy",
        ...result,
      };
    }
    let waited = await readFlagsShared();
    let outcome = {
      flagWaitMs: waited.waitMs,
      sharedFlagRead: waited.shared,
    };
    if (waited.state === "pending")
      return {
        ok: false,
        error: "hook_forwarding_not_ready: feature flags not yet available; retry",
        outcome: "not_ready",
        ...outcome,
      };
    if (waited.state === "off") {
      resetAll();
      return {
        ok: false,
        error: "hook_forwarding_disabled: flag_off",
        outcome: "disabled_flag_off",
        ...outcome,
      };
    }
    if (hooksDisabled()) {
      resetAll();
      return {
        ok: false,
        error: "hook_forwarding_disabled: policy",
        outcome: "disabled_policy",
        ...outcome,
      };
    }
    return {
      ok: true,
      ...outcome,
    };
  };
  let handleRegister = async (message) => {
    let outcome = {
      flagWaitMs: 0,
      sharedFlagRead: false,
    };
    if (jsonStringifyRaw(message).length > MAX_REGISTRATION_BODY_CHARS)
      return {
        ok: false,
        error: "invalid_registration: request larger than 64 KiB",
        outcome: "invalid",
        ...outcome,
      };
    let parsed = SDKRegisterDeviceHooksRegisterDeviceHooksMessageSchema().safeParse(message.request);
    if (!parsed.success)
      return {
        ok: false,
        error: `invalid_registration: ${sanitizeDisplayText(parsed.error.issues[0]?.message ?? "malformed", {
          maxCodeUnits: ERROR_TEXT_MAX_CHARS,
        })}`,
        outcome: "invalid",
        ...outcome,
      };
    if (parsed.data.worker_epoch !== undefined && parsed.data.worker_epoch !== deps.workerEpoch)
      return {
        ok: false,
        error: `stale_worker_epoch: worker epoch is ${deps.workerEpoch}`,
        outcome: "stale_epoch",
        ...outcome,
      };
    let flags = await awaitFlags();
    return flags.ok
      ? {
          ok: true,
          parsed: parsed.data,
          flagWaitMs: flags.flagWaitMs,
          sharedFlagRead: flags.sharedFlagRead,
        }
      : flags;
  };
  let handleUpload = async (message) => {
    let upload = await handleRegister(message);
    if (!upload.ok) {
      deps.telemetry.register({
        outcome: upload.outcome,
        accepted: 0,
        ignored: 0,
        templatesAwaitingUpload: 0,
        templatesRefused: 0,
        flagWaitMs: upload.flagWaitMs,
        sharedFlagRead: upload.sharedFlagRead,
      });
      return {
        kind: "error",
        error: upload.error,
      };
    }
    let parsed = upload.parsed;
    let projectRoot = deps.projectRoot();
    let cwd = deps.cwd();
    let success = RegisterDeviceHooksResponseSchema().safeParse({
      status: "unregistered",
      project_dir: projectRoot,
      cwd,
      worker_epoch: deps.workerEpoch,
    }).success;
    let reply = {
      project_dir: projectRoot,
      cwd: success ? cwd : projectRoot,
      worker_epoch: deps.workerEpoch,
    };
    let refusalText = (ignored, templatesRefused) => {
      if (deps.registry.removeOwner(parsed.instance_id)) {
        deps.forwarder.removeForOwner(parsed.instance_id);
        deps.templateRunner.remove(parsed.instance_id);
      }
      attestedInstances.delete(parsed.instance_id);
      deps.telemetry.register({
        outcome: "unregistered",
        accepted: 0,
        ignored: ignored.length,
        templatesAwaitingUpload: 0,
        templatesRefused: templatesRefused.length,
        flagWaitMs: upload.flagWaitMs,
        sharedFlagRead: upload.sharedFlagRead,
      });
      return {
        kind: "success",
        response: {
          status: "unregistered",
          ...reply,
          ...(ignored.length > 0 && {
            ignored_ids: ignored.slice(0, 128),
          }),
          ...(templatesRefused.length > 0 && {
            templates: [...templatesRefused],
          }),
        },
      };
    };
    if (parsed.hooks.length === 0 && parsed.templates.length === 0) return refusalText([], []);
    let entries = [];
    let hookIds = [];
    let seen = new Set();
    for (let hook of parsed.hooks) {
      let deviceHookId = parseDeviceHookId(hook.id);
      let matchedEvent =
        hook.matcher === undefined ||
        hook.matcher === "" ||
        hook.matcher === "*" ||
        MATCHER_NAME_RE.test(hook.matcher);
      let duplicate = seen.has(hook.id);
      seen.add(hook.id);
      if (
        duplicate ||
        deviceHookId === null ||
        deviceHookId.instanceId !== parsed.instance_id ||
        deviceHookId.event !== hook.event ||
        !isMatcherEvent(hook.event) ||
        !matchedEvent
      ) {
        hookIds.push(hook.id);
        continue;
      }
      entries.push({
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
    let hooksByEvent = {};
    let templateEvents = new Map();
    let statuses = new Map();
    let settledTemplates = new Set();
    let byTemplate = attestedInstances.get(parsed.instance_id) ?? new Map();
    let eventEntries = new Map();
    let isSettled = (template) => {
      let pending = byTemplate.get(template);
      if (pending === undefined) return false;
      templateEvents.set(pending.matcher, template);
      hooksByEvent[pending.event] = [...(hooksByEvent[pending.event] ?? []), pending.matcher];
      eventEntries.set(template, pending);
      settledTemplates.add(template);
      return true;
    };
    let holdTemplate = (templateMessage, timeout) => {
      if (
        !isPreToolUseTemplate(templateMessage) ||
        !shownTemplates.get(parsed.instance_id)?.has(templateMessage.id)
      )
        return;
      let eventHook = {
        matcher: templateMessage.matcher,
        hooks: [
          {
            type: "callback",
            timeout,
            callback: async () => {
              deps.telemetry.templateStandInBlocked?.({
                template: templateMessage.id,
              });
              return {
                decision: "block",
                reason: `cloud template ${templateMessage.id} could not be installed on this worker; matching calls are blocked until it is (register again to retry)`,
              };
            },
          },
        ],
      };
      templateEvents.set(eventHook, templateMessage.id);
      hooksByEvent[templateMessage.event] = [...(hooksByEvent[templateMessage.event] ?? []), eventHook];
      eventEntries.set(templateMessage.id, {
        event: templateMessage.event,
        matcher: eventHook,
      });
      settledTemplates.add(templateMessage.id);
    };
    let pendingTemplates = new Map(parsed.templates.map((template) => [template.template, template]));
    for (let registeredTemplate of pendingTemplates.values()) {
      let stagedTemplate = deps.templates.template(registeredTemplate.template);
      let classification = classifyTemplateRegistration(stagedTemplate, registeredTemplate);
      let bytes =
        classification === "awaiting_upload" ? deps.templates.bytesFor(registeredTemplate.digest) : undefined;
      if (stagedTemplate === undefined || bytes === undefined) {
        statuses.set(registeredTemplate.template, {
          template: registeredTemplate.template,
          status: classification,
        });
        if (!isSettled(registeredTemplate.template) && stagedTemplate !== undefined)
          holdTemplate(stagedTemplate, clampTemplateTimeoutS(registeredTemplate.timeout_s));
        continue;
      }
      let timeout = clampTemplateTimeoutS(registeredTemplate.timeout_s);
      if ((await deps.templateRunner.resolveInterpreter()) === null) {
        statuses.set(registeredTemplate.template, {
          template: registeredTemplate.template,
          status: "interpreter_unavailable",
        });
        if (!isSettled(registeredTemplate.template)) holdTemplate(stagedTemplate, timeout);
        continue;
      }
      let hook;
      try {
        hook = await withDeadline(
          deps.templateRunner.prepare(stagedTemplate, registeredTemplate.digest, bytes, timeout),
          TEMPLATE_PREPARE_TIMEOUT_MS,
        );
        if (hook === undefined) throw Error("template prepare timed out");
      } catch (error) {
        logForDebugging(
          `[deviceHooks] template ${registeredTemplate.template} install failed: ${error instanceof Error ? error.message : String(error)}`,
          {
            level: "error",
          },
        );
        statuses.set(registeredTemplate.template, {
          template: registeredTemplate.template,
          status: "install_failed",
        });
        if (!isSettled(registeredTemplate.template)) holdTemplate(stagedTemplate, timeout);
        continue;
      }
      let installedHook = {
        matcher: stagedTemplate.matcher,
        hooks: [
          {
            type: "callback",
            timeout,
            callback: hook,
          },
        ],
      };
      templateEvents.set(installedHook, stagedTemplate.id);
      hooksByEvent[stagedTemplate.event] = [...(hooksByEvent[stagedTemplate.event] ?? []), installedHook];
      eventEntries.set(stagedTemplate.id, {
        event: stagedTemplate.event,
        matcher: installedHook,
      });
      statuses.set(registeredTemplate.template, {
        template: registeredTemplate.template,
        status: "installed",
      });
    }
    let statusList = [...statuses.values()];
    if (hooksDisabled()) {
      resetAll();
      deps.telemetry.register({
        outcome: "disabled_policy",
        accepted: 0,
        ignored: 0,
        templatesAwaitingUpload: 0,
        templatesRefused: 0,
        flagWaitMs: upload.flagWaitMs,
        sharedFlagRead: upload.sharedFlagRead,
      });
      return {
        kind: "error",
        error: "hook_forwarding_disabled: policy",
      };
    }
    let leaseS = parsed.lease_s ?? DEFAULT_LEASE_S;
    let leaseExpiresAt = deps.now() + leaseS * 1000;
    let inventory = {
      instanceId: parsed.instance_id,
      displayName:
        sanitizeDisplayText(parsed.display_name ?? "", {
          maxCodeUnits: MAX_TITLE_LENGTH,
        }) || parsed.instance_id,
      epoch: deps.workerEpoch,
      leaseExpiresAt,
      entries,
      templates: [...pendingTemplates.values()].flatMap((template) => {
        let status = statuses.get(template.template)?.status;
        let matchedEvent = settledTemplates.has(template.template)
          ? (eventEntries.get(template.template)?.event ?? template.event)
          : template.event;
        return (status === "awaiting_upload" ||
          status === "installed" ||
          settledTemplates.has(template.template)) &&
          isMatcherEvent(matchedEvent)
          ? [
              {
                template: template.template,
                digest: template.digest,
                event: matchedEvent,
                ...(template.timeout_s !== undefined && {
                  timeoutS: template.timeout_s,
                }),
              },
            ]
          : [];
      }),
    };
    if (inventory.entries.length === 0 && inventory.templates.length === 0)
      return refusalText(hookIds, statusList);
    let { replaced, awaySince } = deps.registry.replaceOwner(inventory);
    if (replaced !== undefined) {
      deps.forwarder.removeForOwner(replaced);
      deps.templateRunner.remove(replaced);
      attestedInstances.delete(replaced);
    }
    deps.forwarder.installForOwner(inventory);
    deps.templateRunner.install(
      inventory.instanceId,
      hooksByEvent,
      (template, templateId) => templateEvents.get(templateId) ?? "template",
    );
    attestedInstances.set(inventory.instanceId, eventEntries);
    let installed = shownTemplates.get(inventory.instanceId) ?? new Set();
    for (let status of statuses.values()) if (status.status === "installed") installed.add(status.template);
    shownTemplates.set(inventory.instanceId, installed);
    let awaitingUpload = countWhere(statusList, (status) => status.status === "awaiting_upload");
    let installedCount = countWhere(statusList, (status) => status.status === "installed");
    deps.telemetry.register({
      outcome: "accepted",
      accepted: entries.length,
      ignored: hookIds.length,
      templatesAwaitingUpload: awaitingUpload,
      templatesInstalled: installedCount,
      templatesRefused: statusList.length - awaitingUpload - installedCount,
      flagWaitMs: upload.flagWaitMs,
      sharedFlagRead: upload.sharedFlagRead,
    });
    return {
      kind: "success",
      response: {
        status: "registered",
        ...reply,
        lease_s: leaseS,
        lease_expires_at: new Date(leaseExpiresAt).toISOString(),
        accepted: entries.length,
        ignored: hookIds.length,
        ...(hookIds.length > 0 && {
          ignored_ids: hookIds.slice(0, 128),
        }),
        templates: statusList,
        ...(replaced !== undefined && {
          replaced_owner: replaced,
        }),
        ...(awaySince !== undefined && {
          away_since: new Date(awaySince).toISOString(),
        }),
      },
    };
  };
  let maxBytes = 400000;
  let handleUploadMessage = async (message) => {
    let reply = (outcome, template = "unknown", bytes = 0) =>
      deps.telemetry.upload({
        outcome,
        template,
        bytes,
      });
    if (jsonStringifyRaw(message).length > maxBytes) {
      reply("invalid");
      return {
        kind: "error",
        error: "invalid_upload: request larger than 400 KB",
      };
    }
    let parsed = SDKUploadDeviceHookTemplateUploadDeviceHookTemplateMessageSchema().safeParse(
      message.request,
    );
    if (!parsed.success) {
      reply("invalid");
      return {
        kind: "error",
        error: `invalid_upload: ${sanitizeDisplayText(parsed.error.issues[0]?.message ?? "malformed", {
          maxCodeUnits: ERROR_TEXT_MAX_CHARS,
        })}`,
      };
    }
    let upload = parsed.data;
    if (upload.worker_epoch !== undefined && upload.worker_epoch !== deps.workerEpoch) {
      reply("stale_epoch", upload.template);
      return {
        kind: "error",
        error: `stale_worker_epoch: worker epoch is ${deps.workerEpoch}`,
      };
    }
    let flags = await awaitFlags();
    if (!flags.ok) {
      reply(flags.outcome, upload.template);
      return {
        kind: "error",
        error: flags.error,
      };
    }
    let accepted = deps.templates.accept({
      template: upload.template,
      digest: upload.digest,
      contentBase64: upload.content_base64,
    });
    if (!accepted.ok) {
      reply(accepted.kind, upload.template);
      return {
        kind: "error",
        error: accepted.error,
      };
    }
    reply(accepted.status, accepted.template.id, accepted.bytes);
    return {
      kind: "success",
      response: {
        template: accepted.template.id,
        digest: upload.digest,
        status: accepted.status,
      },
    };
  };
  return {
    async handle(message) {
      switch (message.request.subtype) {
        case "register_device_hooks":
          return handleUpload(message);
        case "upload_device_hook_template":
          return handleUploadMessage(message);
        default:
          return {
            kind: "error",
            error: `Unsupported control request subtype: ${message.request.subtype}`,
          };
      }
    },
  };
}
//@ chunk-eczpvz69.js:9602-9666 placement
function positiveEpoch(workerEpoch) {
  return workerEpoch !== undefined && Number.isInteger(workerEpoch) && workerEpoch >= 1 ? workerEpoch : 1;
}
//@ chunk-eczpvz69.js:9666-12806 placement
/**
 * 云会话 worker 侧的设备钩子主体：按需加载依赖，建立钩子注册表与转发器（记录 tengu_device_hook_forwarded），根据策略（仅插件、自定义禁用、仅托管、全部禁用）与账户开关决定是否启用，并处理模板注册。
 */
async function startDeviceHooksWorker(deps) {
  let [
    { isRestrictedToPluginOnly },
    { isCustomizationDisabled },
    { shouldHoldDeviceHooksByPolicy, shouldDisableAllHooksIncludingManaged },
    { isAccountGateServed, isViolinAmatiEnabled },
    { getToolServingFlagAnsweredOff, isToolServingEnabled },
    { refreshGrowthBookFeatures },
    { createDeviceHookRegistry, productionRegistryTimer },
    { createDeviceHookForwarder, productionForwarderTimer },
    { createDeviceHookTemplateStore },
    { productionDeviceHookTemplateRunner, telemetryTemplateId },
    { logEvent },
    { fromEnum },
    { logFeatureBad, logFeatureOk, logFeatureSad },
  ] = await Promise.all([
    import("../../settings/pluginOnlyPolicy.js"),
    import("../../settings/customizationDisabled.js"),
    import("../hooksConfigSnapshot.js"),
    import("../../../services/analytics/violinGates.js"),
    import("../../../services/analytics/violinWillowGate.js"),
    import("../../../services/analytics/ATIS_REQUEST_HEADER.lazy.js"),
    import("../../../services/deviceBridge/deviceHookRegistry.js"),
    import("../deviceHookForwarder.js"),
    import("../createDeviceHookTemplateStore.lazy.js"),
    import("../productionDeviceHookTemplateRunner.lazy.js"),
    import("../../../services/analytics/index.js"),
    import("../../../services/analytics/safeMetadata.js"),
    import("../../../services/analytics/featureTelemetry.js"),
  ]);
  let registry = createDeviceHookRegistry({
    now: Date.now,
    setTimer: productionRegistryTimer,
    onLeaseExpired: () => logEvent("tengu_device_hooks_lease_expired", {}),
  });
  let forwarder = createDeviceHookForwarder({
    registry,
    sender: deps.sender,
    toolAliases: deps.toolAliases,
    now: Date.now,
    setTimer: productionForwarderTimer,
    telemetry: {
      forwarded: (report) =>
        logEvent("tengu_device_hook_forwarded", {
          event: fromEnum(report.event),
          outcome: fromEnum(report.outcome),
          fields_dropped: report.fieldsDropped,
          blocked: report.blocked,
          rtt_ms: report.rttMs,
          error_replies_ignored: report.errorRepliesIgnored,
          malformed_replies_ignored: report.malformedRepliesIgnored,
        }),
    },
  });
  let deps_2 = {
    policy: {
      pluginOnly: () => isRestrictedToPluginOnly("hooks"),
      customizationDisabled: () => isCustomizationDisabled("hooks"),
      managedOnly: shouldHoldDeviceHooksByPolicy,
      allDisabled: shouldDisableAllHooksIncludingManaged,
    },
    readAccountFlags: async () => {
      let [gates, accountGate] = await Promise.all([
        isToolServingEnabled({
          cloudClient: true,
        }),
        isViolinAmatiEnabled(),
      ]);
      if (gates && accountGate) {
        if (!alwaysTrue()) return true;
        logEvent("tengu_device_hooks_shelved", {
          side: fromEnum("worker"),
        });
        return false;
      }
      let accountGate_2 =
        getToolServingFlagAnsweredOff({
          cloudClient: true,
        }) ?? (!accountGate && isAccountGateServed("tengu_violin_amati") ? "tengu_violin_amati" : undefined);
      if (accountGate_2 === undefined) {
        refreshGrowthBookFeatures().catch(() => {});
        throw Error("account flags not served yet");
      }
      logEvent("tengu_device_hooks_account_flag_off", {
        flag: fromEnum(accountGate_2),
      });
      return false;
    },
    flagWaitCapMs: 5000,
    now: Date.now,
    workerEpoch: positiveEpoch(deps.workerEpoch),
    projectRoot: deps.projectRoot,
    cwd: deps.cwd,
    registry,
    forwarder,
    templates: createDeviceHookTemplateStore(),
    templateRunner: isDiskless()
      ? {
          resolveInterpreter: async () => null,
          prepare: async () => {
            throw Error("no device hook templates in a diskless session");
          },
          install: () => {},
          remove: () => {},
        }
      : productionDeviceHookTemplateRunner(deps.projectRoot),
    telemetry: {
      templateStandInBlocked: (report) =>
        logEvent("tengu_device_hook_template_run", {
          template: fromEnum(telemetryTemplateId(report.template)),
          outcome: fromEnum("stand_in_blocked"),
          duration_ms: 0,
        }),
      upload: (report) =>
        logEvent("tengu_device_hook_template_upload", {
          outcome: fromEnum(report.outcome),
          template: fromEnum(telemetryTemplateId(report.template)),
          bytes: report.bytes,
        }),
      register: (report) => {
        logEvent("tengu_device_hooks_register", {
          outcome: fromEnum(report.outcome),
          accepted: report.accepted,
          ignored: report.ignored,
          templates_awaiting_upload: report.templatesAwaitingUpload,
          templates_installed: report.templatesInstalled ?? 0,
          templates_refused: report.templatesRefused,
          flag_wait_ms: report.flagWaitMs,
          shared_flag_read: report.sharedFlagRead,
        });
        if (report.outcome === "accepted" || report.outcome === "unregistered")
          logFeatureOk("device_hooks_register", {
            accepted: report.accepted,
          });
        else if (report.outcome === "not_ready") logFeatureSad("device_hooks_register", report.outcome);
        else logFeatureBad("device_hooks_register", report.outcome);
      },
    },
  };
  let now = Date.now();
  return {
    ...deps_2,
    readAccountFlags: () => {
      let now_2 = Date.now();
      if (now_2 - now >= SWEEP_INTERVAL_MS) {
        now = now_2;
        refreshGrowthBookFeatures().catch(() => {});
      }
      return deps_2.readAccountFlags();
    },
  };
}
export { runDeviceHooksWorker, startDeviceHooksWorker };
