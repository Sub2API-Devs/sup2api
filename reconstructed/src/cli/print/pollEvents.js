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
import { isAbsolute, resolve } from "path";
import { randomUUID } from "crypto";
import {
  isPollEventIngressActive,
  isHostIngressPollEvents,
  isPollEventMode,
  POLL_KIND_DEFAULT_TIMEOUT_MS,
  MAX_POLL_EVENT_BATCH_BYTES,
  eventByteLength,
  PEER_AUTHORITIES,
  MAX_POLL_EVENTS_PER_BATCH,
  isPeerAuthority,
  MAX_POLL_EVENT_ENVELOPE_BYTES,
  escapeXmlText,
  isValidPollEventKind,
  mentionsReservedKind,
  parsePollEventEnvelope,
  envelopeLengthFor,
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
import {
  array,
  zodStrictObject,
  string,
  _enum,
  discriminatedUnion,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  eventFieldsSchema,
  eventDeclarations,
  eventDeclarationFault,
  buildPollEventEnvelope,
  autoModeFieldsText,
  collectFieldStrings,
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
import { dropSyncedClashes } from "../../utils/commandPredicates.js";
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
import { defaultScopeKey, raiseSessionAttach } from "../../plugins/functionHooks/sessionEvents.js";
import { MESSAGE_COMPONENT_NAMES } from "../../plugins/functionHooks/sites/uiSites.js";
import { pruneDetachedClients, paneStateFields } from "./remoteComposer.js";
import { attachPaneClient, isClientAttached, updatePaneSurface } from "./pluginUiPanes.js";
import { vscodeHookRegistrationInFlight, hasRenderHookingSite } from "../sdkMcpManifests.js";
import { DESKTOP } from "../../plugins/functionHooks/ui/desktopSurface.js";
import { clientRegistry } from "../../plugins/functionHooks/panes.js";
import { logError } from "../../utils/log.js";
import { setBoundedRecent } from "../remoteIO/servedCalls.js";
import {
  guardPermissionModeChange,
  permissionModeSignal,
  transitionPermissionMode,
} from "../../utils/permissions/permissionSetup.js";
import { setAccountSetPermissionMode } from "../../utils/permissions/autoModeState.js";
import { BANG_COMMAND_MAX_AGE_MS } from "./commandQueueDrain.js";
import { createChildAbortController } from "../../utils/abortController.js";
import { isAllPrintable } from "../../utils/truncateGraphemes.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { runToolUse, hasTypeField } from "../../services/tools/toolExecution.js";
import { createAssistantMessage, extractTextContent_2 } from "../../utils/messages.js";

//@ chunk-tyg7f3ek.js:550209-553442 placement
/**
 * 处理 SDK poll_event 请求：校验 kind/事件/授权/大小与权限模式（仅 auto），按组盖章入队唤醒模型。
 */
function handlePollEvent(request, n) {
  if (!isPollEventIngressActive()) {
    n.reply({
      subtype: "error",
      error: "poll-event delivery is not enabled for this session",
    });
    return;
  }
  if (isHostIngressPollEvents()) {
    logFeatureBad("poll_event_delivery", "own_events_only");
    n.reply({
      subtype: "error",
      error:
        "poll event rejected: this session takes no poll events from its host, because the host did not set CLAUDE_CODE_POLL_EVENTS for it",
    });
    return;
  }
  let r =
    request.events === undefined
      ? validatePollEventFields(request)
      : "poll_event: events is not supported by this build";
  if (typeof r === "string") {
    n.reply({
      subtype: "error",
      error: r,
    });
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
  let h =
    count(n.messageQueue.getCommandQueueSnapshot(), isPollEventMode) +
    n.messageQueue.pollEventAdmissionsPending();
  if (h + r.length > POLL_KIND_DEFAULT_TIMEOUT_MS) {
    logFeatureBad("poll_event_delivery", "queue_cap_peek");
    n.reply({
      subtype: "error",
      error:
        r.length === 1
          ? `poll event rejected: ${POLL_KIND_DEFAULT_TIMEOUT_MS} events already queued`
          : `poll event rejected: the queue holds at most ${POLL_KIND_DEFAULT_TIMEOUT_MS} events (${h} queued, ${r.length} arriving)`,
    });
    return;
  }
  let y = [];
  for (let w of r) {
    let P = "element" in w ? validatePollEventGroup(w) : validatePollEventBatch(w);
    if (typeof P === "string") {
      n.reply({
        subtype: "error",
        error: `poll event rejected: ${P}`,
      });
      return;
    }
    y.push(P);
  }
  let reduced = y.reduce((acc, { stampedBytes }) => acc + stampedBytes, 0);
  if (y.length > 1 && reduced > MAX_POLL_EVENT_BATCH_BYTES) {
    logFeatureBad("poll_event_delivery", "group_too_large");
    n.reply({
      subtype: "error",
      error: `poll event rejected: the group is ${reduced} bytes after nonce stamping (cap ${MAX_POLL_EVENT_BATCH_BYTES})`,
    });
    return;
  }
  let reduced_2 = y.reduce(
    (acc, { input }) => acc + (input.declared === undefined ? 0 : eventByteLength(input.declared.fields)),
    0,
  );
  if (y.length > 1 && reduced_2 > MAX_POLL_EVENT_BATCH_BYTES) {
    logFeatureBad("poll_event_delivery", "group_too_large");
    n.reply({
      subtype: "error",
      error: `poll event rejected: the group's fields are ${reduced_2} bytes as sent (cap ${MAX_POLL_EVENT_BATCH_BYTES})`,
    });
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
      for (let { hookText } of y) {
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
        if (w !== undefined || n.stopped.aborted) break;
      }
      for (let L of y) n.messageQueue.endPollEventAdmission();
      if (n.stopped.aborted) return;
      if (w !== undefined) {
        logFeatureBad("poll_event_delivery", "hook_blocked");
        n.reply({
          subtype: "error",
          error: n.redactsPersistedLane() ? "poll event rejected by hook" : `poll event rejected: ${w}`,
        });
        return;
      }
      let mapped = y.map(({ input }) => input);
      (mapped.length === 1
        ? n.messageQueue.enqueuePollEvent(mapped[0])
        : n.messageQueue.enqueuePollEventGroup(mapped)
      )
        .then(
          async () => {
            await n.flushSessionStorage();
            n.reply({
              subtype: "success",
              response: {
                delivered: true,
              },
            });
          },
          (error) => {
            let q = errorMessage(error);
            if (n.redactsPersistedLane())
              logForDebugging(`poll_event enqueue: ${q}`, {
                level: "error",
              });
            n.reply({
              subtype: "error",
              error: n.redactsPersistedLane() ? "poll_event failed" : q,
            });
          },
        )
        .catch((error) => logHandlerFailure(n.redactsPersistedLane(), "poll_event", error));
    })
    .catch((error) => logHandlerFailure(n.redactsPersistedLane(), "poll_event", error));
}
//@ chunk-tyg7f3ek.js:553442-553454 placement
var MAX_SENDER_ID_BYTES = 1024;
//@ chunk-tyg7f3ek.js:553454-553625 placement
var pollEventBatchSchema = DoctorLazy(() =>
  array(
    zodStrictObject({
      kind: string(),
      at: string(),
      fields: eventFieldsSchema(),
      from: zodStrictObject({
        authority: _enum(PEER_AUTHORITIES),
        id: string()
          .refine((e) => Buffer.byteLength(e, "utf8") <= MAX_SENDER_ID_BYTES)
          .optional(),
      }).optional(),
    }),
  )
    .min(1)
    .max(MAX_POLL_EVENTS_PER_BATCH),
);
//@ chunk-tyg7f3ek.js:553625-554437 placement
function validatePollEventFields(e) {
  let { kind, event } = e;
  let { authority, sender_id: senderId, sender_text: senderText } = e;
  if (
    typeof kind !== "string" ||
    typeof event !== "string" ||
    (e.wake !== undefined && typeof e.wake !== "boolean") ||
    (authority !== undefined && !isPeerAuthority(authority)) ||
    (senderId !== undefined &&
      (typeof senderId !== "string" || Buffer.byteLength(senderId, "utf8") > MAX_SENDER_ID_BYTES)) ||
    (senderText !== undefined &&
      (typeof senderText !== "string" ||
        Buffer.byteLength(senderText, "utf8") > MAX_POLL_EVENT_ENVELOPE_BYTES))
  )
    return `poll_event: kind and event must be strings; wake, when present, a boolean; authority, when present, one of ${PEER_AUTHORITIES.join("|")}; sender_id and sender_text, when present, strings`;
  let S = senderText !== undefined && indexOfKmp(event, escapeXmlText(senderText), 0) !== -1;
  if (senderText !== undefined && !S)
    logForDebugging(
      "poll_event: sender_text dropped from provenance \u2014 the event does not carry it (derivation contract violated)",
    );
  return [
    {
      kind,
      element: event,
      wake: e.wake,
      provenance:
        authority === undefined
          ? undefined
          : {
              authority,
              ...(senderId !== undefined && {
                senderId,
              }),
              ...(S && {
                senderText,
              }),
            },
    },
  ];
}
//@ chunk-tyg7f3ek.js:554437-555432 placement
function validatePollEventGroup(e) {
  if (!isValidPollEventKind(e.kind)) {
    logFeatureBad("poll_event_delivery", "invalid_kind");
    return "invalid kind (a lowercase letter, then lowercase letters, digits and hyphens, at most 64 characters)";
  }
  if (mentionsReservedKind(e.kind)) {
    logFeatureBad("poll_event_delivery", "reserved_kind");
    return `kind "${sanitizeTelemetryString(e.kind)}" is reserved for a trusted in-process producer`;
  }
  if (eventDeclarations().has(e.kind)) {
    logFeatureBad("poll_event_delivery", "declared_kind_as_element");
    return `kind "${e.kind}" is declared: send it as fields, in events`;
  }
  let n = Buffer.byteLength(e.element, "utf8");
  if (n > MAX_POLL_EVENT_ENVELOPE_BYTES) {
    logFeatureBad("poll_event_delivery", "envelope_too_large");
    return `envelope is ${n} bytes (cap ${MAX_POLL_EVENT_ENVELOPE_BYTES})`;
  }
  let pollEventEnvelope = parsePollEventEnvelope(e.element);
  if (!pollEventEnvelope.ok) {
    logFeatureBad("poll_event_delivery", "validation_failed");
    return pollEventEnvelope.reason;
  }
  if (pollEventEnvelope.kind !== e.kind) {
    logFeatureBad("poll_event_delivery", "kind_mismatch");
    return `element kind "${sanitizeTelemetryString(pollEventEnvelope.kind)}" does not match declared kind "${sanitizeTelemetryString(e.kind)}"`;
  }
  return {
    input: {
      kind: e.kind,
      element: e.element,
      wake: e.wake,
      provenance: e.provenance,
    },
    hookText: e.element,
    stampedBytes: Buffer.byteLength(e.element, "utf8") + envelopeLengthFor("element"),
  };
}
//@ chunk-tyg7f3ek.js:555432-556550 placement
function validatePollEventBatch(e) {
  if (!isValidPollEventKind(e.kind)) {
    logFeatureBad("poll_event_delivery", "invalid_kind");
    return "invalid kind (a lowercase letter, then lowercase letters, digits and hyphens, at most 64 characters)";
  }
  let n = eventDeclarations().get(e.kind);
  if (n === undefined) {
    logFeatureBad("poll_event_delivery", "undeclared_kind");
    let S = eventDeclarationFault();
    return S === undefined
      ? `kind "${e.kind}" is not declared`
      : `kind "${e.kind}" is not declared: the host's declarations were refused (${sanitizeTelemetryString(S)})`;
  }
  let pollEventEnvelope = buildPollEventEnvelope({
    declaration: n,
    at: e.at,
    fields: e.fields,
  });
  if (!pollEventEnvelope.ok) {
    logFeatureBad("poll_event_delivery", "fields_invalid");
    return pollEventEnvelope.reason;
  }
  let declared = {
    declaration: n,
    at: e.at,
    fields: pollEventEnvelope.fields,
  };
  let h = Buffer.byteLength(pollEventEnvelope.envelope, "utf8") + envelopeLengthFor("json");
  if (h > MAX_POLL_EVENT_ENVELOPE_BYTES) {
    logFeatureBad("poll_event_delivery", "envelope_too_large");
    return `envelope is ${h} bytes after nonce stamping (cap ${MAX_POLL_EVENT_ENVELOPE_BYTES})`;
  }
  let y =
    e.from === undefined || e.from.authority === "world-event"
      ? undefined
      : autoModeFieldsText({
          declaration: n,
          fields: pollEventEnvelope.fields,
        });
  return {
    input: {
      kind: e.kind,
      declared,
      wake: e.wake,
      provenance:
        e.from === undefined
          ? undefined
          : {
              authority: e.from.authority,
              ...(e.from.id !== undefined && {
                senderId: e.from.id,
              }),
              ...(y !== undefined && {
                senderText: y,
              }),
            },
    },
    hookText: [e.kind, e.at, collectFieldStrings(pollEventEnvelope.fields)].filter((S) => S !== "").join(`
`),
    stampedBytes: h,
  };
}
//@ chunk-tyg7f3ek.js:556550-556852 placement
function ackPollEventRow({ row, rowsInFlight, tearingDown, ack, flushSessionStorage, reply }) {
  if (row === undefined)
    return {
      flushSessionStorage,
      reply,
    };
  if (rowsInFlight.has(row)) return;
  rowsInFlight.add(row);
  return {
    flushSessionStorage: () =>
      flushSessionStorage().finally(() => ackPollEventRowOnce(row, rowsInFlight, ack)),
    reply: (S) => {
      if (S.subtype === "error" && tearingDown()) return;
      try {
        reply(S);
      } finally {
        ackPollEventRowOnce(row, rowsInFlight, ack);
      }
    },
  };
}
//@ chunk-tyg7f3ek.js:556852-556891 placement
function ackPollEventRowOnce(row, rowsInFlight, r) {
  if (rowsInFlight.delete(row)) r(row);
}
//@ chunk-tyg7f3ek.js:556940-558008 placement
/**
 * reload_plugins 的 add_plugins：仅本机连接可用，按命令/参数安装并加载插件。
 */
async function handleReloadPluginsAddPlugins({ addPlugins, fromOffMachine }) {
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
  let r = array(SDKLocalMessageSchema()).safeParse(addPlugins);
  if (!r.success || r.data.some((R) => !isAbsolute(R.path)))
    return {
      kind: "refused",
      code: "invalid",
      message:
        'reload_plugins add_plugins must be a list of { type: "local", path } entries with absolute paths',
    };
  let mapped = r.data.map((R) => ({
    path: resolve(R.path),
    withoutMcp: R.skipMcpDiscovery === true,
  }));
  let h = [];
  let y = [];
  function S() {
    setInlinePlugins(withoutPluginDirs(getInlinePlugins(), h));
    setInlinePluginsNoMcp(withoutPluginDirs(getInlinePluginsNoMcp(), y));
  }
  try {
    await rebuildSandboxForPluginDir(() => {
      let inlinePlugins = getInlinePlugins();
      let inlinePluginsNoMcp = getInlinePluginsNoMcp();
      y = withoutPluginDirs(mergePluginDirs(mapped.filter((P) => P.withoutMcp).map((P) => P.path)), [
        ...inlinePlugins,
        ...inlinePluginsNoMcp,
      ]);
      h = withoutPluginDirs(mergePluginDirs(mapped.filter((P) => !P.withoutMcp).map((P) => P.path)), [
        ...inlinePlugins,
        ...inlinePluginsNoMcp,
        ...y,
      ]);
      if (h.length === 0 && y.length === 0) return;
      setInlinePluginsNoMcp([...inlinePluginsNoMcp, ...y]);
      setInlinePlugins([...inlinePlugins, ...h]);
      return S;
    });
  } catch (error) {
    return {
      kind: "refused",
      code: "sandbox_deny_failed",
      message: `reload_plugins add_plugins: ${errorMessage(error)}`,
    };
  }
  return {
    kind: "joined",
    restore: S,
  };
}
//@ chunk-tyg7f3ek.js:558008-558189 placement
function listSkillsForSdk(skillToolCommands, commands, commands_2) {
  let isFolderAlias = folderNameAliasCheck();
  let commandLookup = buildCommandLookup(commands_2);
  return {
    skills: dropSyncedClashes(skillToolCommands, commands).map((S) => {
      let { builtin, ...w } = toSlashCommand(S, isFolderAlias);
      let P = commandLookup.get(w.name);
      let L = P !== undefined && isBuiltinCommand(P) && isBuiltinCommand(S);
      return {
        ...w,
        ...(L && {
          builtin: true,
        }),
      };
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
  report: {
    phase: e.phase,
    reason: e.reason,
  },
});
//@ chunk-tyg7f3ek.js:558345-558493 placement
function describeClientFault(error) {
  let [n] = error.issues;
  if (n === undefined) return "ui_client_fault: malformed";
  return `ui_client_fault: ${n.path.join(".") || "request"}: ` + n.message;
}
//@ chunk-tyg7f3ek.js:558493-558638 placement
async function handleClientFault(request) {
  let n = SDKUiClientFaultUiClientFaultMessageSchema().safeParse(request);
  if (!n.success) throw new WireSafeControlError(describeClientFault(n.error));
  return {
    handled: (await render.clientFault(faultAddress(n.data))) !== undefined,
  };
}
//@ chunk-tyg7f3ek.js:558638-558651 placement
var MAX_TOOL_OUTPUT_CHARS = 65536;
//@ chunk-tyg7f3ek.js:558651-558747 placement
function truncateToolOutput(props) {
  let output = props.output;
  return typeof output !== "string" || output.length <= MAX_TOOL_OUTPUT_CHARS
    ? props
    : {
        ...props,
        output: truncateToLength(output, MAX_TOOL_OUTPUT_CHARS),
      };
}
//@ chunk-tyg7f3ek.js:558747-558861 placement
function withToolUseId(component, toolUseId, r) {
  return (component !== "ToolUse" && component !== "ToolResult") || typeof r.tool_use_id === "string"
    ? r
    : {
        ...r,
        tool_use_id: toolUseId,
      };
}
//@ chunk-tyg7f3ek.js:558861-558901 placement
var surfaceClientId = (e) => e.client_id ?? defaultScopeKey(e.surface);
//@ chunk-tyg7f3ek.js:558901-559030 placement
function paneTarget(request, clientId) {
  let { component } = request;
  return component === "Pane" || component === "AbovePrompt"
    ? {
        clientId,
        component,
        requestId: request.instance_id,
      }
    : undefined;
}
//@ chunk-tyg7f3ek.js:559030-559208 placement
function uiRenderProps(request) {
  let n = withToolUseId(request.component, request.instance_id, truncateToolOutput(request.props));
  let { onScreen, ...s } = n;
  let h = MESSAGE_COMPONENT_NAMES.has(request.component);
  let S =
    request.on_screen !== undefined
      ? {
          onScreen: request.on_screen,
        }
      : {};
  return h
    ? {
        ...s,
        ...S,
      }
    : n;
}
//@ chunk-tyg7f3ek.js:559208-560243 placement
/**
 * 为远程客户端（IDE/网页）渲染插件 UI 面板：加入名册、按视口生成树并回传。
 */
async function renderPluginSurface(e, n) {
  let { request, by, signal } = e;
  let clientId = surfaceClientId(request);
  let joined = n.rosterMemory.join({
    client: {
      surface: request.surface,
      clientId,
      ...(request.viewport !== undefined && {
        viewport: request.viewport,
      }),
    },
    answers: undefined,
    declares: false,
    by,
  });
  joined.attaching;
  if (!joined.isAdmitted) return;
  if (!joined.wasOnRoster) n.givePluginUiTo(joined.isFirstClient);
  let R = n.paneRosterPushes();
  pruneDetachedClients();
  if (joined.isPutBack) n.tellPaneRoster(R);
  let w = paneTarget(request, clientId);
  if (w !== undefined)
    attachPaneClient({
      ...w,
      ...paneStateFields(request.props),
      ...(request.content_rows !== undefined && {
        contentRows: request.content_rows,
      }),
      ...(request.keyed !== undefined && {
        keyed: request.keyed,
      }),
    });
  await import("./chunk-gfbwkdce.js");
  await vscodeHookRegistrationInFlight(request.surface);
  let P = await render.run({
    surface: request.surface,
    component: request.component,
    requestId: request.instance_id,
    ...(request.viewport !== undefined && {
      viewport: request.viewport,
    }),
    props: uiRenderProps(request),
  });
  if (signal?.aborted) return;
  if (n.isRemoteTransport() && !isClientAttached(clientId)) return;
  if (w !== undefined)
    updatePaneSurface({
      ...w,
      tree: P.tree,
    });
  let q = Object.keys(P.clientModules).length > 0;
  return {
    tree: P.tree,
    props: P.props,
    rewritten: P.rewritten,
    hooked: hasRenderHookingSite(request.component, request.surface),
    ...(q && {
      client_modules: P.clientModules,
    }),
    drawn_by: P.drawnBy,
    ...(request.bench !== undefined && {
      bench: request.bench,
    }),
  };
}
//@ chunk-tyg7f3ek.js:560243-560365 placement
var MAX_UI_RETRIES = 3;
var isOnRoster = (e, n) =>
  e === undefined ||
  e.some((r) => r.surface === n.surface && r.component === n.component && r.requestId === n.instance_id);
//@ chunk-tyg7f3ek.js:560365-560938 placement
async function renderPluginSurfaceWithRetry(render_2, by, r) {
  let s = surfaceClientId(render_2);
  let h = false;
  let y = render.onInvalidate((S) => {
    h ||= isOnRoster(S, render_2);
  });
  try {
    for (let S = 0; S < MAX_UI_RETRIES; S += 1) {
      h = false;
      let w =
        isClientAttached(s) && !r.isPanelAttachOwed()
          ? await renderPluginSurface(
              {
                request: render_2,
                by,
              },
              r,
            )
          : undefined;
      if (!isClientAttached(s)) {
        logFeatureSad("plugin_function_hooks_press_drawn", "client_gone");
        return;
      }
      if (w === undefined) {
        logFeatureSad("plugin_function_hooks_press_drawn", "draw_refused");
        return;
      }
      if (!h) {
        logFeatureOk("plugin_function_hooks_press_drawn");
        return w;
      }
    }
    logFeatureSad("plugin_function_hooks_press_drawn", "draw_overtaken");
    return;
  } catch (error) {
    logHandlerFailure(r.redactsPersistedLane(), "ui_press", error);
    logFeatureSad("plugin_function_hooks_press_drawn", "draw_failed");
    return;
  } finally {
    y();
  }
}
//@ chunk-tyg7f3ek.js:560938-561005 placement
var DESKTOP_UI_EVENT_SUBTYPES = new Set(["ui_client_press", "ui_message", "ui_client_fault"]);
//@ chunk-tyg7f3ek.js:561005-561119 placement
var sdkUiMessageSchema = DoctorLazy(() =>
  discriminatedUnion("subtype", [
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
  let r = sdkUiMessageSchema().safeParse(e);
  if (!r.success) return;
  let clientId = "client_id" in r.data ? r.data.client_id : undefined;
  let h = DESKTOP_UI_EVENT_SUBTYPES.has(r.data.subtype) ? DESKTOP : undefined;
  let y = "surface" in r.data ? r.data.surface : h;
  let R = y !== undefined ? defaultScopeKey(y) : undefined;
  let w = clientId ?? R;
  let L = w !== undefined ? n(w) : undefined;
  return w !== undefined && L !== undefined
    ? {
        surface: L,
        clientId: w,
      }
    : undefined;
}
//@ chunk-tyg7f3ek.js:561425-561473 placement
var findSurfaceClient = (e) => clientRegistry.list().find((n) => n.clientId === e);
//@ chunk-tyg7f3ek.js:561473-561577 placement
function noteSurfaceClientHeard(request) {
  try {
    let surfaceRequest = parseSurfaceRequest(request, (r) => findSurfaceClient(r)?.surface);
    if (surfaceRequest !== undefined) clientRegistry.heard(surfaceRequest.clientId);
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-tyg7f3ek.js:561577-561587 placement
var MAX_RECENT_SURFACE_DECLARATIONS = 64;
//@ chunk-tyg7f3ek.js:561587-562827 placement
function createSurfaceDeclarationTracker(e, n) {
  let r = new Map();
  function s(clientId, declaredBy) {
    let surfaceClient = findSurfaceClient(clientId);
    if (surfaceClient !== undefined)
      setBoundedRecent(
        r,
        [
          clientId,
          {
            declared: surfaceClient,
            declaredBy,
          },
        ],
        MAX_RECENT_SURFACE_DECLARATIONS,
      );
  }
  function h(clientId) {
    let L = e.isRemoteTransport() ? r.get(clientId) : undefined;
    let q = L !== undefined && e.senderStands(L.declaredBy);
    if (L !== undefined && !q) r.delete(clientId);
    return q ? L : undefined;
  }
  function y(w) {
    let P = clientRegistry.list();
    let any = P.some((Se) => Se.clientId === w.client.clientId);
    let q = any ? undefined : h(w.client.clientId);
    let viewport = w.client.viewport ?? q?.declared.viewport;
    let G = e.senderStands(w.by);
    let attaching = G
      ? raiseSessionAttach(
          {
            surface: w.client.surface,
            clientId: w.client.clientId,
            ...(viewport !== undefined && {
              viewport,
            }),
          },
          w.answers ?? q?.declared.answers,
        )
      : Promise.resolve(false);
    let declaredBy = w.declares ? undefined : q?.declaredBy;
    let Ae = any && !w.declares;
    let Ue =
      !Ae && n(w.client.clientId, w.by) && (declaredBy === undefined || n(w.client.clientId, declaredBy));
    let ce = Ae ? G : Ue;
    let nt = !any && !r.has(w.client.clientId);
    if (ce && (w.declares || nt)) s(w.client.clientId, w.by);
    return {
      isAdmitted: ce,
      wasOnRoster: any,
      isPutBack: ce && q !== undefined,
      isFirstClient: P.length === 0,
      attaching,
    };
  }
  function S(w) {
    try {
      let L = e.isRemoteTransport()
        ? parseSurfaceRequest(w.request, (G) => r.get(G)?.declared.surface)
        : undefined;
      if (!(L !== undefined && findSurfaceClient(L.clientId) === undefined && h(L.clientId) !== undefined))
        return;
      let x = y({
        client: L,
        answers: undefined,
        declares: false,
        by: w,
      });
      x.attaching;
      if (x.isAdmitted) e.welcomeBack();
    } catch (error) {
      logError(toError(error));
    }
  }
  return {
    join: y,
    readmit: S,
    forget: (w) => void r.delete(w),
  };
}
//@ chunk-tyg7f3ek.js:562827-563051 placement
function applyPermissionModeChange(e, toolPermissionContext) {
  let r = guardPermissionModeChange(e.mode, toolPermissionContext);
  if (!r.ok) return r;
  setAccountSetPermissionMode(r.mode);
  if (toolPermissionContext.mode === r.mode)
    return {
      ok: true,
      mode: r.mode,
      context: toolPermissionContext,
    };
  setImmediate(() => {
    permissionModeSignal.emit();
  });
  return {
    ok: true,
    mode: r.mode,
    context: {
      ...transitionPermissionMode(toolPermissionContext.mode, r.mode, toolPermissionContext),
      mode: r.mode,
    },
  };
}
//@ chunk-tyg7f3ek.js:563088-563122 placement
var ENV_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
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
      if (e[n]?.status === "running") return true;
      this.#n.delete(n);
    }
    return false;
  }
  async answer(e, n, r, s) {
    let h = this.#t.get(e);
    if (h !== undefined) return h;
    if (r.readsSessionStream) {
      if (r.storedAt === undefined || r.joinedAt === undefined) {
        logFeatureSad("remote_start_shell_task", "join_time_unknown");
        throw new WireSafeControlError(
          "start_shell_task: this worker cannot tell whether it started before or after the request was sent",
        );
      }
      if (r.storedAt < r.joinedAt) {
        logFeatureSad("remote_start_shell_task", "sent_before_start");
        throw new WireSafeControlError(
          "start_shell_task: the request was sent before this worker started; send it again",
        );
      }
    }
    if (r.heldMs !== undefined && r.heldMs > BANG_COMMAND_MAX_AGE_MS) {
      logFeatureSad("remote_start_shell_task", "late");
      throw new WireSafeControlError("start_shell_task: the request is too old to run; send it again");
    }
    let { cancellableControlRequests } = s;
    let childAbortController = createChildAbortController(s.sessionAbortController);
    cancellableControlRequests.set(e, childAbortController);
    this.#o++;
    let R = withFeatureTelemetry("remote_start_shell_task", () =>
      runSdkHostCommand(n, s.canUseTool, s.toolUseContext(childAbortController)),
    ).finally(() => {
      this.#o--;
      if (cancellableControlRequests.get(e) === childAbortController) cancellableControlRequests.delete(e);
    });
    this.#t.set(e, R);
    let w = await R;
    if (w.status === "started") this.#n.add(w.task_id);
    return w;
  }
}
//@ chunk-tyg7f3ek.js:564218-566023 placement
/**
 * SDK 宿主请求在本机执行命令（command/args/cwd/env 校验），返回输出。
 */
async function runSdkHostCommand(e, canUseTool, r) {
  let { command, args = [], cwd, env = {}, description } = e;
  if (
    typeof command !== "string" ||
    command === "" ||
    !Array.isArray(args) ||
    !args.every((arg) => typeof arg === "string") ||
    (cwd !== undefined && typeof cwd !== "string") ||
    typeof env !== "object" ||
    env === null ||
    !Object.entries(env).every(([key, value]) => ENV_NAME_PATTERN.test(key) && typeof value === "string") ||
    (description !== undefined && (typeof description !== "string" || !isAllPrintable(description)))
  )
    throw new WireSafeControlError(
      "start_shell_task: command is a non-empty string, args an array of strings, cwd a string, env an object of strings under variable names, and description a string without control characters",
    );
  let joined = [
    ...Object.entries(env).map(([key, value]) => `${key}=${shellQuoteIfNeeded(value)}`),
    ...[command, ...args].map(shellQuoteIfNeeded),
  ].join(" ");
  let P = {
    type: "tool_use",
    id: `toolu_start_shell_task_${randomUUID().replaceAll("-", "")}`,
    name: BASH_TOOL_NAME,
    input: {
      command:
        cwd === undefined
          ? joined
          : `cd ${shellQuoteIfNeeded(cwd.startsWith("-") ? `./${cwd}` : cwd)} && ${joined}`,
      run_in_background: true,
      ...(e.timeout_ms !== undefined && {
        timeout: e.timeout_ms,
      }),
      ...(description !== undefined && {
        description,
      }),
    },
    caller: {
      type: "direct",
    },
  };
  let L;
  let q = "the Bash call gave no result";
  for await (let x of runToolUse(
    P,
    createAssistantMessage({
      content: [P],
      isVirtual: true,
    }),
    canUseTool,
    {
      ...r,
      clientRequestedToolUseId: P.id,
    },
    () => new Date().toISOString(),
  )) {
    if (hasTypeField(x) || x.message.type !== "user") continue;
    let { message } = x;
    let content = message.message.content;
    let re =
      typeof content === "string"
        ? undefined
        : content.find((ce) => ce.type === "tool_result" && ce.tool_use_id === P.id);
    if (re?.type !== "tool_result") continue;
    let Ae =
      typeof re.content === "string"
        ? re.content
        : extractTextContent_2(
            re.content ?? [],
            `
`,
          );
    let Ue =
      Object.values(r.taskRegistry.all()).find((ce) => ce.toolUseId === P.id)?.id ??
      (typeof message.toolUseResult === "object" &&
      message.toolUseResult !== null &&
      "backgroundTaskId" in message.toolUseResult
        ? message.toolUseResult.backgroundTaskId
        : undefined);
    if (message.toolDenialKind !== undefined)
      L = {
        status: "denied",
        message: Ae,
      };
    else if (typeof Ue === "string")
      L = {
        status: "started",
        task_id: Ue,
      };
    else q = Ae;
  }
  if (L === undefined)
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
