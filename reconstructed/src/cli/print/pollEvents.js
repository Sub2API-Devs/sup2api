/**
 * cli/print/pollEvents.ts
 *
 * 2.1.316 新增：poll-event 投递处理（批次校验、SDK 宿主命令、插件重载、远程 MCP 任务）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (35)
 * attribution: placement 35
 */
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  resolve,
  resolve as resolve_2,
} from "path";
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
} from "crypto";
import {
  G2,
  Hvn,
  Kv,
  vFe,
  OPe,
  oCt,
  vYt,
  JAt,
  nfi,
  ime,
  escapeXmlText,
  QAt,
  kFe,
  parsePollEventEnvelope,
  CQo,
} from "../../utils/pollEvents.js";
import {
  logFeatureBad,
  logFeatureSad,
  logFeatureOk,
  withFeatureTelemetry,
} from "../../services/analytics/featureTelemetry.js";
import { toExternalPermissionMode } from "../../utils/permissions/PermissionMode.js";
import { count } from "../../utils/collections.js";
import {
  executeUserPromptSubmitHooksForSession,
  getUserPromptSubmitHookBlockingMessage,
} from "../../utils/hooks.js";
import {
  isAbortError,
  errorMessage,
  WireSafeControlError,
  toError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logHandlerFailure } from "./dispatchControlRequest.js";
import { DoctorLazy } from "../handlers/util.js";
import { A, zodStrictObject, o, U, Ir } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  eventFieldsSchema,
  Xun,
  TVs,
  buildPollEventEnvelope,
  autoModeFieldsText,
  AVs,
} from "../../utils/pollEvents/declarations.js";
import { indexOfKmp } from "../../utils/hooks/hookHelpers.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { areSideloadFlagsDisabledByPolicy } from "../../utils/plugins/marketplacePolicy.js";
import { SDKLocalMessageSchema } from "../../entrypoints/sdk/coreSchemas.js";
import {
  setInlinePlugins,
  getInlinePlugins,
  setInlinePluginsNoMcp,
  getInlinePluginsNoMcp,
} from "../../bootstrap/state.js";
import { withoutPluginDirs, mergePluginDirs } from "../../utils/plugins/pluginDirsEnv.js";
import { rebuildSandboxForPluginDir } from "./pluginDirReload.js";
import {
  folderNameAliasCheck,
  buildCommandLookup,
  toSlashCommand,
  isBuiltinCommand,
} from "../../commands.js";
import { Z5 } from "../../utils/commandPredicates.js";
import {
  SDKUiClientFaultUiClientFaultMessageSchema,
  SDKUiPressUiPressMessageSchema,
  SDKUiInputUiInputMessageSchema,
  SDKUiSelectUiSelectMessageSchema,
  SDKUiScrollUiScrollMessageSchema,
  SDKUiFocusUiFocusMessageSchema,
  SDKUiPromptEditUiPromptEditMessageSchema,
  SDKUiPromptAutocompleteUiPromptAutocompleteMessageSchema,
  SDKUiPanesUiPanesMessageSchema,
  SDKUiPaneShowUiPaneShowMessageSchema,
  SDKUiPaneFocusUiPaneFocusMessageSchema,
  SDKUiCloseUiCloseMessageSchema,
  SDKUiClientPressUiClientPressMessageSchema,
  SDKUiMessageUiMessageMessageSchema,
} from "../../entrypoints/sdk/uiControlSchemas.js";
import { render } from "../../plugins/functionHooks/ui/renderBridge.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { ypt, raiseSessionAttach } from "../../plugins/functionHooks/sessionEvents.js";
import { MESSAGE_COMPONENT_NAMES } from "../../plugins/functionHooks/sites/uiSites.js";
import { pruneDetachedClients, paneStateFields } from "./remoteComposer.js";
import { attachPaneClient, isClientAttached, updatePaneSurface } from "./pluginUiPanes.js";
import { _Ls, TEo } from "../sdkMcpManifests.js";
import { DESKTOP } from "../../plugins/functionHooks/ui/desktopSurface.js";
import { vk } from "../../plugins/functionHooks/panes.js";
import { logError } from "../../utils/log.js";
import { setBoundedRecent } from "../remoteIO/servedCalls.js";
import {
  guardPermissionModeChange,
  aF,
  transitionPermissionMode,
} from "../../utils/permissions/permissionSetup.js";
import { setAccountSetPermissionMode } from "../../utils/permissions/autoModeState.js";
import { f_ } from "./commandQueueDrain.js";
import { createChildAbortController } from "../../utils/abortController.js";
import { isAllPrintable } from "../../utils/truncateGraphemes.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { runToolUse, hasTypeField } from "../../services/tools/toolExecution.js";
import { createAssistantMessage, extractTextContent_2 } from "../../utils/messages.js";

/**
 * 处理 SDK poll_event 请求：校验 kind/事件/授权/大小与权限模式（仅 auto），按组盖章入队唤醒模型。
 */
//@ chunk-tyg7f3ek.js:550209-553442 placement
function handlePollEvent(e, n) {
  if (!G2()) {
    n.reply({ subtype: "error", error: "poll-event delivery is not enabled for this session" });
    return;
  }
  if (Hvn()) {
    (logFeatureBad("poll_event_delivery", "own_events_only"),
      n.reply({
        subtype: "error",
        error:
          "poll event rejected: this session takes no poll events from its host, because the host did not set CLAUDE_CODE_POLL_EVENTS for it",
      }));
    return;
  }
  let r =
    e.events === void 0 ? validatePollEventFields(e) : "poll_event: events is not supported by this build";
  if (typeof r === "string") {
    n.reply({ subtype: "error", error: r });
    return;
  }
  let mode = n.engineState().toolPermissionContext.mode;
  if (mode !== "auto") {
    logFeatureBad("poll_event_delivery", "mode_not_auto");
    let w = n.redactsPersistedLane() ? toExternalPermissionMode(mode) : mode;
    n.reply({
      subtype: "error",
      error: `poll event rejected: poll events require permission mode "auto" (got "${w}") \u2014 the event channel's protections route event-driven commands through the auto-mode classifier. Run with --permission-mode auto.`,
    });
    return;
  }
  let h = count(n.messageQueue.getCommandQueueSnapshot(), Kv) + n.messageQueue.pollEventAdmissionsPending();
  if (h + r.length > vFe) {
    (logFeatureBad("poll_event_delivery", "queue_cap_peek"),
      n.reply({
        subtype: "error",
        error:
          r.length === 1
            ? `poll event rejected: ${vFe} events already queued`
            : `poll event rejected: the queue holds at most ${vFe} events (${h} queued, ${r.length} arriving)`,
      }));
    return;
  }
  let y = [];
  for (let w of r) {
    let P = "element" in w ? validatePollEventGroup(w) : validatePollEventBatch(w);
    if (typeof P === "string") {
      n.reply({ subtype: "error", error: `poll event rejected: ${P}` });
      return;
    }
    y.push(P);
  }
  let reduced = y.reduce((w, { stampedBytes: stampedBytes }) => w + stampedBytes, 0);
  if (y.length > 1 && reduced > OPe) {
    (logFeatureBad("poll_event_delivery", "group_too_large"),
      n.reply({
        subtype: "error",
        error: `poll event rejected: the group is ${reduced} bytes after nonce stamping (cap ${OPe})`,
      }));
    return;
  }
  let reduced_2 = y.reduce(
    (w, { input: input }) => w + (input.declared === void 0 ? 0 : oCt(input.declared.fields)),
    0,
  );
  if (y.length > 1 && reduced_2 > OPe) {
    (logFeatureBad("poll_event_delivery", "group_too_large"),
      n.reply({
        subtype: "error",
        error: `poll event rejected: the group's fields are ${reduced_2} bytes as sent (cap ${OPe})`,
      }));
    return;
  }
  for (let w of y) n.messageQueue.beginPollEventAdmission();
  n.ingressTail.current = n.ingressTail.current
    .then(async () => {
      if (n.stopped.aborted) {
        for (let L of y) n.messageQueue.endPollEventAdmission();
        return;
      }
      let w;
      for (let { hookText: hookText } of y) {
        try {
          for await (let q of executeUserPromptSubmitHooksForSession(
            n.session,
            n.sessionHooks,
            hookText,
            n.engineState().toolPermissionContext.mode,
            n.stopped,
            n.storageV5,
            n.credentials,
          ))
            if (q.blockingError) {
              w = getUserPromptSubmitHookBlockingMessage(q.blockingError);
              break;
            }
        } catch (error) {
          if (isAbortError(error)) logForDebugging("poll-event enqueue hook pass aborted");
          else logHandlerFailure(n.redactsPersistedLane(), "poll_event", error);
        }
        if (w !== void 0 || n.stopped.aborted) break;
      }
      for (let L of y) n.messageQueue.endPollEventAdmission();
      if (n.stopped.aborted) return;
      if (w !== void 0) {
        (logFeatureBad("poll_event_delivery", "hook_blocked"),
          n.reply({
            subtype: "error",
            error: n.redactsPersistedLane() ? "poll event rejected by hook" : `poll event rejected: ${w}`,
          }));
        return;
      }
      let mapped = y.map(({ input: input }) => input);
      (mapped.length === 1
        ? n.messageQueue.enqueuePollEvent(mapped[0])
        : n.messageQueue.enqueuePollEventGroup(mapped)
      )
        .then(
          async () => {
            (await n.flushSessionStorage(), n.reply({ subtype: "success", response: { delivered: !0 } }));
          },
          (L) => {
            let q = errorMessage(L);
            if (n.redactsPersistedLane()) logForDebugging(`poll_event enqueue: ${q}`, { level: "error" });
            n.reply({ subtype: "error", error: n.redactsPersistedLane() ? "poll_event failed" : q });
          },
        )
        .catch((L) => logHandlerFailure(n.redactsPersistedLane(), "poll_event", L));
    })
    .catch((w) => logHandlerFailure(n.redactsPersistedLane(), "poll_event", w));
}
//@ chunk-tyg7f3ek.js:553442-553454 placement
var SD = 1024;
//@ chunk-tyg7f3ek.js:553454-553625 placement
var pollEventBatchSchema = DoctorLazy(() =>
  A(
    zodStrictObject({
      kind: o(),
      at: o(),
      fields: eventFieldsSchema(),
      from: zodStrictObject({
        authority: U(vYt),
        id: o()
          .refine((e) => Buffer.byteLength(e, "utf8") <= SD)
          .optional(),
      }).optional(),
    }),
  )
    .min(1)
    .max(JAt),
);
//@ chunk-tyg7f3ek.js:553625-554437 placement
function validatePollEventFields(e) {
  let { kind: kind, event: event } = e,
    { authority: authority, sender_id: sender_id, sender_text: sender_text } = e;
  if (
    typeof kind !== "string" ||
    typeof event !== "string" ||
    (e.wake !== void 0 && typeof e.wake !== "boolean") ||
    (authority !== void 0 && !nfi(authority)) ||
    (sender_id !== void 0 && (typeof sender_id !== "string" || Buffer.byteLength(sender_id, "utf8") > SD)) ||
    (sender_text !== void 0 &&
      (typeof sender_text !== "string" || Buffer.byteLength(sender_text, "utf8") > ime))
  )
    return `poll_event: kind and event must be strings; wake, when present, a boolean; authority, when present, one of ${vYt.join("|")}; sender_id and sender_text, when present, strings`;
  let S = sender_text !== void 0 && indexOfKmp(event, escapeXmlText(sender_text), 0) !== -1;
  if (sender_text !== void 0 && !S)
    logForDebugging(
      "poll_event: sender_text dropped from provenance \u2014 the event does not carry it (derivation contract violated)",
    );
  return [
    {
      kind: kind,
      element: event,
      wake: e.wake,
      provenance:
        authority === void 0
          ? void 0
          : {
              authority: authority,
              ...(sender_id !== void 0 && { senderId: sender_id }),
              ...(S && { senderText: sender_text }),
            },
    },
  ];
}
//@ chunk-tyg7f3ek.js:554437-555432 placement
function validatePollEventGroup(e) {
  if (!QAt(e.kind))
    return (
      logFeatureBad("poll_event_delivery", "invalid_kind"),
      "invalid kind (a lowercase letter, then lowercase letters, digits and hyphens, at most 64 characters)"
    );
  if (kFe(e.kind))
    return (
      logFeatureBad("poll_event_delivery", "reserved_kind"),
      `kind "${sanitizeTelemetryString(e.kind)}" is reserved for a trusted in-process producer`
    );
  if (Xun().has(e.kind))
    return (
      logFeatureBad("poll_event_delivery", "declared_kind_as_element"),
      `kind "${e.kind}" is declared: send it as fields, in events`
    );
  let byteLength = Buffer.byteLength(e.element, "utf8");
  if (byteLength > ime)
    return (
      logFeatureBad("poll_event_delivery", "envelope_too_large"),
      `envelope is ${byteLength} bytes (cap ${ime})`
    );
  let r = parsePollEventEnvelope(e.element);
  if (!r.ok) return (logFeatureBad("poll_event_delivery", "validation_failed"), r.reason);
  if (r.kind !== e.kind)
    return (
      logFeatureBad("poll_event_delivery", "kind_mismatch"),
      `element kind "${sanitizeTelemetryString(r.kind)}" does not match declared kind "${sanitizeTelemetryString(e.kind)}"`
    );
  return {
    input: { kind: e.kind, element: e.element, wake: e.wake, provenance: e.provenance },
    hookText: e.element,
    stampedBytes: Buffer.byteLength(e.element, "utf8") + CQo("element"),
  };
}
//@ chunk-tyg7f3ek.js:555432-556550 placement
function validatePollEventBatch(e) {
  if (!QAt(e.kind))
    return (
      logFeatureBad("poll_event_delivery", "invalid_kind"),
      "invalid kind (a lowercase letter, then lowercase letters, digits and hyphens, at most 64 characters)"
    );
  let n = Xun().get(e.kind);
  if (n === void 0) {
    logFeatureBad("poll_event_delivery", "undeclared_kind");
    let S = TVs();
    return S === void 0
      ? `kind "${e.kind}" is not declared`
      : `kind "${e.kind}" is not declared: the host's declarations were refused (${sanitizeTelemetryString(S)})`;
  }
  let r = buildPollEventEnvelope({ declaration: n, at: e.at, fields: e.fields });
  if (!r.ok) return (logFeatureBad("poll_event_delivery", "fields_invalid"), r.reason);
  let s = { declaration: n, at: e.at, fields: r.fields },
    h = Buffer.byteLength(r.envelope, "utf8") + CQo("json");
  if (h > ime)
    return (
      logFeatureBad("poll_event_delivery", "envelope_too_large"),
      `envelope is ${h} bytes after nonce stamping (cap ${ime})`
    );
  let y =
    e.from === void 0 || e.from.authority === "world-event"
      ? void 0
      : autoModeFieldsText({ declaration: n, fields: r.fields });
  return {
    input: {
      kind: e.kind,
      declared: s,
      wake: e.wake,
      provenance:
        e.from === void 0
          ? void 0
          : {
              authority: e.from.authority,
              ...(e.from.id !== void 0 && { senderId: e.from.id }),
              ...(y !== void 0 && { senderText: y }),
            },
    },
    hookText: [e.kind, e.at, AVs(r.fields)].filter((S) => S !== "").join(`
`),
    stampedBytes: h,
  };
}
//@ chunk-tyg7f3ek.js:556550-556852 placement
function ackPollEventRow({
  row: row,
  rowsInFlight: rowsInFlight,
  tearingDown: tearingDown,
  ack: ack,
  flushSessionStorage: flushSessionStorage,
  reply: reply,
}) {
  if (row === void 0) return { flushSessionStorage: flushSessionStorage, reply: reply };
  if (rowsInFlight.has(row)) return;
  return (
    rowsInFlight.add(row),
    {
      flushSessionStorage: () => flushSessionStorage().finally(() => kD(row, rowsInFlight, ack)),
      reply: (S) => {
        if (S.subtype === "error" && tearingDown()) return;
        try {
          reply(S);
        } finally {
          kD(row, rowsInFlight, ack);
        }
      },
    }
  );
}
//@ chunk-tyg7f3ek.js:556852-556891 placement
function kD(e, n, r) {
  if (n.delete(e)) r(e);
}
/**
 * reload_plugins 的 add_plugins：仅本机连接可用，按命令/参数安装并加载插件。
 */
//@ chunk-tyg7f3ek.js:556940-558008 placement
async function handleReloadPluginsAddPlugins({ addPlugins: addPlugins, fromOffMachine: fromOffMachine }) {
  if (fromOffMachine)
    return {
      kind: "refused",
      code: "off_machine",
      message: "reload_plugins add_plugins is not available on this connection",
    };
  if (areSideloadFlagsDisabledByPolicy())
    return {
      kind: "refused",
      code: "sideload_disabled",
      message: "reload_plugins add_plugins is disabled by managed settings (disableSideloadFlags)",
    };
  let safeParse = A(SDKLocalMessageSchema()).safeParse(addPlugins);
  if (!safeParse.success || safeParse.data.some((R) => !isAbsolute(R.path)))
    return {
      kind: "refused",
      code: "invalid",
      message:
        'reload_plugins add_plugins must be a list of { type: "local", path } entries with absolute paths',
    };
  let mapped = safeParse.data.map((R) => ({
      path: resolve_2(R.path),
      withoutMcp: R.skipMcpDiscovery === !0,
    })),
    h = [],
    y = [];
  function S() {
    (setInlinePlugins(withoutPluginDirs(getInlinePlugins(), h)),
      setInlinePluginsNoMcp(withoutPluginDirs(getInlinePluginsNoMcp(), y)));
  }
  try {
    await rebuildSandboxForPluginDir(() => {
      let R = getInlinePlugins(),
        w = getInlinePluginsNoMcp();
      if (
        ((y = withoutPluginDirs(mergePluginDirs(mapped.filter((P) => P.withoutMcp).map((P) => P.path)), [
          ...R,
          ...w,
        ])),
        (h = withoutPluginDirs(mergePluginDirs(mapped.filter((P) => !P.withoutMcp).map((P) => P.path)), [
          ...R,
          ...w,
          ...y,
        ])),
        h.length === 0 && y.length === 0)
      )
        return;
      return (setInlinePluginsNoMcp([...w, ...y]), setInlinePlugins([...R, ...h]), S);
    });
  } catch (error) {
    return {
      kind: "refused",
      code: "sandbox_deny_failed",
      message: `reload_plugins add_plugins: ${errorMessage(error)}`,
    };
  }
  return { kind: "joined", restore: S };
}
//@ chunk-tyg7f3ek.js:558008-558189 placement
function listSkillsForSdk(e, n, r) {
  let s = folderNameAliasCheck(),
    h = buildCommandLookup(r);
  return {
    skills: Z5(e, n).map((S) => {
      let { builtin: builtin, ...w } = toSlashCommand(S, s),
        P = h.get(w.name),
        L = P !== void 0 && isBuiltinCommand(P) && isBuiltinCommand(S);
      return { ...w, ...(L && { builtin: !0 }) };
    }),
  };
}
//@ chunk-tyg7f3ek.js:558189-558345 placement
var faultAddress = (e) => ({
  address: {
    plugin: e.plugin,
    component: e.component,
    requestId: e.instance_id,
    key: e.client,
    module: e.module,
  },
  report: { phase: e.phase, reason: e.reason },
});
//@ chunk-tyg7f3ek.js:558345-558493 placement
function describeClientFault(e) {
  let [n] = e.issues;
  if (n === void 0) return "ui_client_fault: malformed";
  return `ui_client_fault: ${n.path.join(".") || "request"}: ` + n.message;
}
//@ chunk-tyg7f3ek.js:558493-558638 placement
async function handleClientFault(e) {
  let safeParse = SDKUiClientFaultUiClientFaultMessageSchema().safeParse(e);
  if (!safeParse.success) throw new WireSafeControlError(describeClientFault(safeParse.error));
  return { handled: (await render.clientFault(faultAddress(safeParse.data))) !== void 0 };
}
//@ chunk-tyg7f3ek.js:558638-558651 placement
var MD = 65536;
//@ chunk-tyg7f3ek.js:558651-558747 placement
function $K(e) {
  let output = e.output;
  return typeof output !== "string" || output.length <= MD
    ? e
    : { ...e, output: truncateToLength(output, MD) };
}
//@ chunk-tyg7f3ek.js:558747-558861 placement
function withToolUseId(e, n, r) {
  return (e !== "ToolUse" && e !== "ToolResult") || typeof r.tool_use_id === "string"
    ? r
    : { ...r, tool_use_id: n };
}
//@ chunk-tyg7f3ek.js:558861-558901 placement
var ID = (e) => e.client_id ?? ypt(e.surface);
//@ chunk-tyg7f3ek.js:558901-559030 placement
function paneTarget(e, n) {
  let { component: component } = e;
  return component === "Pane" || component === "AbovePrompt"
    ? { clientId: n, component: component, requestId: e.instance_id }
    : void 0;
}
//@ chunk-tyg7f3ek.js:559030-559208 placement
function uiRenderProps(e) {
  let n = withToolUseId(e.component, e.instance_id, $K(e.props)),
    { onScreen: onScreen, ...s } = n,
    h = MESSAGE_COMPONENT_NAMES.has(e.component),
    S = e.on_screen !== void 0 ? { onScreen: e.on_screen } : {};
  return h ? { ...s, ...S } : n;
}
/**
 * 为远程客户端（IDE/网页）渲染插件 UI 面板：加入名册、按视口生成树并回传。
 */
//@ chunk-tyg7f3ek.js:559208-560243 placement
async function renderPluginSurface(e, n) {
  let { request: request, by: by, signal: signal } = e,
    y = ID(request),
    joined = n.rosterMemory.join({
      client: {
        surface: request.surface,
        clientId: y,
        ...(request.viewport !== void 0 && { viewport: request.viewport }),
      },
      answers: void 0,
      declares: !1,
      by: by,
    });
  if ((joined.attaching, !joined.isAdmitted)) return;
  if (!joined.wasOnRoster) n.givePluginUiTo(joined.isFirstClient);
  let paneRosterPushes = n.paneRosterPushes();
  if ((pruneDetachedClients(), joined.isPutBack)) n.tellPaneRoster(paneRosterPushes);
  let w = paneTarget(request, y);
  if (w !== void 0)
    attachPaneClient({
      ...w,
      ...paneStateFields(request.props),
      ...(request.content_rows !== void 0 && { contentRows: request.content_rows }),
      ...(request.keyed !== void 0 && { keyed: request.keyed }),
    });
  (await import("./chunk-gfbwkdce.js"), await _Ls(request.surface));
  let run = await render.run({
    surface: request.surface,
    component: request.component,
    requestId: request.instance_id,
    ...(request.viewport !== void 0 && { viewport: request.viewport }),
    props: uiRenderProps(request),
  });
  if (signal?.aborted) return;
  if (n.isRemoteTransport() && !isClientAttached(y)) return;
  if (w !== void 0) updatePaneSurface({ ...w, tree: run.tree });
  let q = Object.keys(run.clientModules).length > 0;
  return {
    tree: run.tree,
    props: run.props,
    rewritten: run.rewritten,
    hooked: TEo(request.component, request.surface),
    ...(q && { client_modules: run.clientModules }),
    drawn_by: run.drawnBy,
    ...(request.bench !== void 0 && { bench: request.bench }),
  };
}
//@ chunk-tyg7f3ek.js:560243-560365 placement
var MAX_UI_RETRIES = 3,
  isOnRoster = (e, n) =>
    e === void 0 ||
    e.some((r) => r.surface === n.surface && r.component === n.component && r.requestId === n.instance_id);
//@ chunk-tyg7f3ek.js:560365-560938 placement
async function renderPluginSurfaceWithRetry(e, n, r) {
  let s = ID(e),
    h = !1,
    onInvalidate = render.onInvalidate((S) => {
      h ||= isOnRoster(S, e);
    });
  try {
    for (let S = 0; S < MAX_UI_RETRIES; S += 1) {
      h = !1;
      let w =
        isClientAttached(s) && !r.isPanelAttachOwed()
          ? await renderPluginSurface({ request: e, by: n }, r)
          : void 0;
      if (!isClientAttached(s)) {
        logFeatureSad("plugin_function_hooks_press_drawn", "client_gone");
        return;
      }
      if (w === void 0) {
        logFeatureSad("plugin_function_hooks_press_drawn", "draw_refused");
        return;
      }
      if (!h) return (logFeatureOk("plugin_function_hooks_press_drawn"), w);
    }
    logFeatureSad("plugin_function_hooks_press_drawn", "draw_overtaken");
    return;
  } catch (error) {
    (logHandlerFailure(r.redactsPersistedLane(), "ui_press", error),
      logFeatureSad("plugin_function_hooks_press_drawn", "draw_failed"));
    return;
  } finally {
    onInvalidate();
  }
}
//@ chunk-tyg7f3ek.js:560938-561005 placement
var UD = new Set(["ui_client_press", "ui_message", "ui_client_fault"]);
//@ chunk-tyg7f3ek.js:561005-561119 placement
var sdkUiMessageSchema = DoctorLazy(() =>
  Ir("subtype", [
    SDKUiPressUiPressMessageSchema(),
    SDKUiInputUiInputMessageSchema(),
    SDKUiSelectUiSelectMessageSchema(),
    SDKUiScrollUiScrollMessageSchema(),
    SDKUiFocusUiFocusMessageSchema(),
    SDKUiPromptEditUiPromptEditMessageSchema(),
    SDKUiPromptAutocompleteUiPromptAutocompleteMessageSchema(),
    SDKUiPanesUiPanesMessageSchema(),
    SDKUiPaneShowUiPaneShowMessageSchema(),
    SDKUiPaneFocusUiPaneFocusMessageSchema(),
    SDKUiCloseUiCloseMessageSchema(),
    SDKUiClientPressUiClientPressMessageSchema(),
    SDKUiMessageUiMessageMessageSchema(),
    SDKUiClientFaultUiClientFaultMessageSchema(),
  ]),
);
//@ chunk-tyg7f3ek.js:561119-561425 placement
function parseSurfaceRequest(e, n) {
  let safeParse = sdkUiMessageSchema().safeParse(e);
  if (!safeParse.success) return;
  let s = "client_id" in safeParse.data ? safeParse.data.client_id : void 0,
    h = UD.has(safeParse.data.subtype) ? DESKTOP : void 0,
    y = "surface" in safeParse.data ? safeParse.data.surface : h,
    R = y !== void 0 ? ypt(y) : void 0,
    w = s ?? R,
    L = w !== void 0 ? n(w) : void 0;
  return w !== void 0 && L !== void 0 ? { surface: L, clientId: w } : void 0;
}
//@ chunk-tyg7f3ek.js:561425-561473 placement
var Rm = (e) => vk.list().find((n) => n.clientId === e);
//@ chunk-tyg7f3ek.js:561473-561577 placement
function noteSurfaceClientHeard(e) {
  try {
    let n = parseSurfaceRequest(e, (r) => Rm(r)?.surface);
    if (n !== void 0) vk.heard(n.clientId);
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-tyg7f3ek.js:561577-561587 placement
var HD = 64;
//@ chunk-tyg7f3ek.js:561587-562827 placement
function createSurfaceDeclarationTracker(e, n) {
  let r = new Map();
  function s(w, P) {
    let L = Rm(w);
    if (L !== void 0) setBoundedRecent(r, [w, { declared: L, declaredBy: P }], HD);
  }
  function h(w) {
    let L = e.isRemoteTransport() ? r.get(w) : void 0,
      q = L !== void 0 && e.senderStands(L.declaredBy);
    if (L !== void 0 && !q) r.delete(w);
    return q ? L : void 0;
  }
  function y(w) {
    let list = vk.list(),
      any = list.some((Se) => Se.clientId === w.client.clientId),
      q = any ? void 0 : h(w.client.clientId),
      x = w.client.viewport ?? q?.declared.viewport,
      senderStands = e.senderStands(w.by),
      Z = senderStands
        ? raiseSessionAttach(
            { surface: w.client.surface, clientId: w.client.clientId, ...(x !== void 0 && { viewport: x }) },
            w.answers ?? q?.declared.answers,
          )
        : Promise.resolve(!1),
      re = w.declares ? void 0 : q?.declaredBy,
      Ae = any && !w.declares,
      Ue = !Ae && n(w.client.clientId, w.by) && (re === void 0 || n(w.client.clientId, re)),
      ce = Ae ? senderStands : Ue,
      nt = !any && !r.has(w.client.clientId);
    if (ce && (w.declares || nt)) s(w.client.clientId, w.by);
    return {
      isAdmitted: ce,
      wasOnRoster: any,
      isPutBack: ce && q !== void 0,
      isFirstClient: list.length === 0,
      attaching: Z,
    };
  }
  function S(w) {
    try {
      let L = e.isRemoteTransport()
        ? parseSurfaceRequest(w.request, (G) => r.get(G)?.declared.surface)
        : void 0;
      if (!(L !== void 0 && Rm(L.clientId) === void 0 && h(L.clientId) !== void 0)) return;
      let x = y({ client: L, answers: void 0, declares: !1, by: w });
      if ((x.attaching, x.isAdmitted)) e.welcomeBack();
    } catch (error) {
      logError(toError(error));
    }
  }
  return { join: y, readmit: S, forget: (w) => void r.delete(w) };
}
//@ chunk-tyg7f3ek.js:562827-563051 placement
function applyPermissionModeChange(e, n) {
  let r = guardPermissionModeChange(e.mode, n);
  if (!r.ok) return r;
  if ((setAccountSetPermissionMode(r.mode), n.mode === r.mode)) return { ok: !0, mode: r.mode, context: n };
  return (
    setImmediate(() => {
      aF.emit();
    }),
    { ok: !0, mode: r.mode, context: { ...transitionPermissionMode(n.mode, r.mode, n), mode: r.mode } }
  );
}
//@ chunk-tyg7f3ek.js:563088-563122 placement
var pV = /^[A-Za-z_][A-Za-z0-9_]*$/;
//@ chunk-tyg7f3ek.js:563122-564218 placement
class RemoteMcpTaskTracker {
  #t = new Map();
  #n = new Set();
  #o = 0;
  get isBusy() {
    return this.#o > 0;
  }
  hasRunningTask(e) {
    for (let n of this.#n) {
      if (e[n]?.status === "running") return !0;
      this.#n.delete(n);
    }
    return !1;
  }
  async answer(e, n, r, s) {
    let h = this.#t.get(e);
    if (h !== void 0) return h;
    if (r.readsSessionStream) {
      if (r.storedAt === void 0 || r.joinedAt === void 0)
        throw (
          logFeatureSad("remote_start_shell_task", "join_time_unknown"),
          new WireSafeControlError(
            "start_shell_task: this worker cannot tell whether it started before or after the request was sent",
          )
        );
      if (r.storedAt < r.joinedAt)
        throw (
          logFeatureSad("remote_start_shell_task", "sent_before_start"),
          new WireSafeControlError(
            "start_shell_task: the request was sent before this worker started; send it again",
          )
        );
    }
    if (r.heldMs !== void 0 && r.heldMs > f_)
      throw (
        logFeatureSad("remote_start_shell_task", "late"),
        new WireSafeControlError("start_shell_task: the request is too old to run; send it again")
      );
    let { cancellableControlRequests: cancellableControlRequests } = s,
      S = createChildAbortController(s.sessionAbortController);
    (cancellableControlRequests.set(e, S), this.#o++);
    let R = withFeatureTelemetry("remote_start_shell_task", () =>
      runSdkHostCommand(n, s.canUseTool, s.toolUseContext(S)),
    ).finally(() => {
      if ((this.#o--, cancellableControlRequests.get(e) === S)) cancellableControlRequests.delete(e);
    });
    this.#t.set(e, R);
    let w = await R;
    if (w.status === "started") this.#n.add(w.task_id);
    return w;
  }
}
/**
 * SDK 宿主请求在本机执行命令（command/args/cwd/env 校验），返回输出。
 */
//@ chunk-tyg7f3ek.js:564218-566023 placement
async function runSdkHostCommand(e, n, r) {
  let { command: command, args: args = [], cwd: cwd, env: env = {}, description: description } = e;
  if (
    typeof command !== "string" ||
    command === "" ||
    !Array.isArray(args) ||
    !args.every((x) => typeof x === "string") ||
    (cwd !== void 0 && typeof cwd !== "string") ||
    typeof env !== "object" ||
    env === null ||
    !Object.entries(env).every(([x, G]) => pV.test(x) && typeof G === "string") ||
    (description !== void 0 && (typeof description !== "string" || !isAllPrintable(description)))
  )
    throw new WireSafeControlError(
      "start_shell_task: command is a non-empty string, args an array of strings, cwd a string, env an object of strings under variable names, and description a string without control characters",
    );
  let joined = [
      ...Object.entries(env).map(([x, G]) => `${x}=${shellQuoteIfNeeded(G)}`),
      ...[command, ...args].map(shellQuoteIfNeeded),
    ].join(" "),
    P = {
      type: "tool_use",
      id: `toolu_start_shell_task_${randomUUID_21().replaceAll("-", "")}`,
      name: BASH_TOOL_NAME,
      input: {
        command:
          cwd === void 0
            ? joined
            : `cd ${shellQuoteIfNeeded(cwd.startsWith("-") ? `./${cwd}` : cwd)} && ${joined}`,
        run_in_background: !0,
        ...(e.timeout_ms !== void 0 && { timeout: e.timeout_ms }),
        ...(description !== void 0 && { description: description }),
      },
      caller: { type: "direct" },
    },
    L,
    q = "the Bash call gave no result";
  for await (let x of runToolUse(
    P,
    createAssistantMessage({ content: [P], isVirtual: !0 }),
    n,
    { ...r, clientRequestedToolUseId: P.id },
    () => new Date().toISOString(),
  )) {
    if (hasTypeField(x) || x.message.type !== "user") continue;
    let { message: message } = x,
      content = message.message.content,
      re =
        typeof content === "string"
          ? void 0
          : content.find((ce) => ce.type === "tool_result" && ce.tool_use_id === P.id);
    if (re?.type !== "tool_result") continue;
    let Ae =
        typeof re.content === "string"
          ? re.content
          : extractTextContent_2(
              re.content ?? [],
              `
`,
            ),
      Ue =
        Object.values(r.taskRegistry.all()).find((ce) => ce.toolUseId === P.id)?.id ??
        (typeof message.toolUseResult === "object" &&
        message.toolUseResult !== null &&
        "backgroundTaskId" in message.toolUseResult
          ? message.toolUseResult.backgroundTaskId
          : void 0);
    if (message.toolDenialKind !== void 0) L = { status: "denied", message: Ae };
    else if (typeof Ue === "string") L = { status: "started", task_id: Ue };
    else q = Ae;
  }
  if (L === void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `start_shell_task: ${q}`,
      "start_shell_task: the Bash call failed",
    );
  return L;
}
//@ chunk-tyg7f3ek.js:566023-566112 placement = singleQuoteForEval (1)
function shellQuoteIfNeeded(s) {
  return /^[A-Za-z0-9_./:@+,-]+$/.test(s) ? s : `'${s.replaceAll("'", `'"'"'`)}'`;
}
//@ chunk-tyg7f3ek.js:566112-566123 placement
var MCP_STATUS_POLL_MS = 100;

export {
  RemoteMcpTaskTracker,
  createSurfaceDeclarationTracker,
  noteSurfaceClientHeard,
  applyPermissionModeChange,
  ackPollEventRow,
  handlePollEvent,
  renderPluginSurface,
  renderPluginSurfaceWithRetry,
  handleClientFault,
  handleReloadPluginsAddPlugins,
  listSkillsForSdk,
  MCP_STATUS_POLL_MS,
};
