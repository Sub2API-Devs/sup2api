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
  stringSchema,
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tyg7f3ek.js:550209-553442 placement
/**
 * 处理 SDK poll_event 请求：校验 kind/事件/授权/大小与权限模式（仅 auto），按组盖章入队唤醒模型。
 */
function handlePollEvent(request, context) {
  if (!isPollEventIngressActive()) {
    context.reply({
      subtype: "error",
      error: "poll-event delivery is not enabled for this session",
    });
    return;
  }
  if (isHostIngressPollEvents()) {
    logFeatureBad("poll_event_delivery", "own_events_only");
    context.reply({
      subtype: "error",
      error:
        "poll event rejected: this session takes no poll events from its host, because the host did not set CLAUDE_CODE_POLL_EVENTS for it",
    });
    return;
  }
  let validated =
    request.events === undefined
      ? validatePollEventFields(request)
      : "poll_event: events is not supported by this build";
  if (typeof validated === "string") {
    context.reply({
      subtype: "error",
      error: validated,
    });
    return;
  }
  let mode = context.engineState().toolPermissionContext.mode;
  if (mode !== "auto") {
    logFeatureBad("poll_event_delivery", "mode_not_auto");
    let modeLabel = context.redactsPersistedLane() ? toExternalPermissionMode(mode) : mode;
    context.reply({
      subtype: "error",
      error: `poll event rejected: poll events require permission mode "auto" (got "${modeLabel}") \u2014 the event channel's protections route event-driven commands through the auto-mode classifier. Run with --permission-mode auto.`,
    });
    return;
  }
  let queuedCount =
    count(context.messageQueue.getCommandQueueSnapshot(), isPollEventMode) +
    context.messageQueue.pollEventAdmissionsPending();
  if (queuedCount + validated.length > POLL_KIND_DEFAULT_TIMEOUT_MS) {
    logFeatureBad("poll_event_delivery", "queue_cap_peek");
    context.reply({
      subtype: "error",
      error:
        validated.length === 1
          ? `poll event rejected: ${POLL_KIND_DEFAULT_TIMEOUT_MS} events already queued`
          : `poll event rejected: the queue holds at most ${POLL_KIND_DEFAULT_TIMEOUT_MS} events (${queuedCount} queued, ${validated.length} arriving)`,
    });
    return;
  }
  let events = [];
  for (let event of validated) {
    let validatedEvent = "element" in event ? validatePollEventGroup(event) : validatePollEventBatch(event);
    if (typeof validatedEvent === "string") {
      context.reply({
        subtype: "error",
        error: `poll event rejected: ${validatedEvent}`,
      });
      return;
    }
    events.push(validatedEvent);
  }
  let reduced = events.reduce((acc, { stampedBytes }) => acc + stampedBytes, 0);
  if (events.length > 1 && reduced > MAX_POLL_EVENT_BATCH_BYTES) {
    logFeatureBad("poll_event_delivery", "group_too_large");
    context.reply({
      subtype: "error",
      error: `poll event rejected: the group is ${reduced} bytes after nonce stamping (cap ${MAX_POLL_EVENT_BATCH_BYTES})`,
    });
    return;
  }
  let reduced_2 = events.reduce(
    (acc, { input }) => acc + (input.declared === undefined ? 0 : eventByteLength(input.declared.fields)),
    0,
  );
  if (events.length > 1 && reduced_2 > MAX_POLL_EVENT_BATCH_BYTES) {
    logFeatureBad("poll_event_delivery", "group_too_large");
    context.reply({
      subtype: "error",
      error: `poll event rejected: the group's fields are ${reduced_2} bytes as sent (cap ${MAX_POLL_EVENT_BATCH_BYTES})`,
    });
    return;
  }
  for (let event of events) context.messageQueue.beginPollEventAdmission();
  context.ingressTail.current = context.ingressTail.current
    .then(async () => {
      if (context.stopped.aborted) {
        for (let event of events) context.messageQueue.endPollEventAdmission();
        return;
      }
      let blockingError;
      for (let { hookText } of events) {
        try {
          for await (let result of executeUserPromptSubmitHooksForSession(
            context.session,
            context.sessionHooks,
            hookText,
            context.engineState().toolPermissionContext.mode,
            context.stopped,
            context.storageV5,
            context.credentials,
          ))
            if (result.blockingError) {
              blockingError = getUserPromptSubmitHookBlockingMessage(result.blockingError);
              break;
            }
        } catch (error) {
          if (isAbortError(error)) logForDebugging("poll-event enqueue hook pass aborted");
          else logHandlerFailure(context.redactsPersistedLane(), "poll_event", error);
        }
        if (blockingError !== undefined || context.stopped.aborted) break;
      }
      for (let event of events) context.messageQueue.endPollEventAdmission();
      if (context.stopped.aborted) return;
      if (blockingError !== undefined) {
        logFeatureBad("poll_event_delivery", "hook_blocked");
        context.reply({
          subtype: "error",
          error: context.redactsPersistedLane()
            ? "poll event rejected by hook"
            : `poll event rejected: ${blockingError}`,
        });
        return;
      }
      let mapped = events.map(({ input }) => input);
      (mapped.length === 1
        ? context.messageQueue.enqueuePollEvent(mapped[0])
        : context.messageQueue.enqueuePollEventGroup(mapped)
      )
        .then(
          async () => {
            await context.flushSessionStorage();
            context.reply({
              subtype: "success",
              response: {
                delivered: true,
              },
            });
          },
          (error) => {
            let message = errorMessage(error);
            if (context.redactsPersistedLane())
              logForDebugging(`poll_event enqueue: ${message}`, {
                level: "error",
              });
            context.reply({
              subtype: "error",
              error: context.redactsPersistedLane() ? "poll_event failed" : message,
            });
          },
        )
        .catch((error) => logHandlerFailure(context.redactsPersistedLane(), "poll_event", error));
    })
    .catch((error) => logHandlerFailure(context.redactsPersistedLane(), "poll_event", error));
}
//@ chunk-tyg7f3ek.js:553442-553454 placement
var MAX_SENDER_ID_BYTES = 1024;
//@ chunk-tyg7f3ek.js:553454-553625 placement
var pollEventBatchSchema; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-tyg7f3ek.js:553454", () => {
  pollEventBatchSchema = DoctorLazy(() =>
    array(
      zodStrictObject({
        kind: stringSchema(),
        at: stringSchema(),
        fields: eventFieldsSchema(),
        from: zodStrictObject({
          authority: _enum(PEER_AUTHORITIES),
          id: stringSchema()
            .refine((id) => Buffer.byteLength(id, "utf8") <= MAX_SENDER_ID_BYTES)
            .optional(),
        }).optional(),
      }),
    )
      .min(1)
      .max(MAX_POLL_EVENTS_PER_BATCH),
  );
});
//@ chunk-tyg7f3ek.js:553625-554437 placement
function validatePollEventFields(request) {
  let { kind, event } = request;
  let { authority, sender_id: senderId, sender_text: senderText } = request;
  if (
    typeof kind !== "string" ||
    typeof event !== "string" ||
    (request.wake !== undefined && typeof request.wake !== "boolean") ||
    (authority !== undefined && !isPeerAuthority(authority)) ||
    (senderId !== undefined &&
      (typeof senderId !== "string" || Buffer.byteLength(senderId, "utf8") > MAX_SENDER_ID_BYTES)) ||
    (senderText !== undefined &&
      (typeof senderText !== "string" ||
        Buffer.byteLength(senderText, "utf8") > MAX_POLL_EVENT_ENVELOPE_BYTES))
  )
    return `poll_event: kind and event must be strings; wake, when present, a boolean; authority, when present, one of ${PEER_AUTHORITIES.join("|")}; sender_id and sender_text, when present, strings`;
  let carriesSenderText = senderText !== undefined && indexOfKmp(event, escapeXmlText(senderText), 0) !== -1;
  if (senderText !== undefined && !carriesSenderText)
    logForDebugging(
      "poll_event: sender_text dropped from provenance \u2014 the event does not carry it (derivation contract violated)",
    );
  return [
    {
      kind,
      element: event,
      wake: request.wake,
      provenance:
        authority === undefined
          ? undefined
          : {
              authority,
              ...(senderId !== undefined && {
                senderId,
              }),
              ...(carriesSenderText && {
                senderText,
              }),
            },
    },
  ];
}
//@ chunk-tyg7f3ek.js:554437-555432 placement
function validatePollEventGroup(event) {
  if (!isValidPollEventKind(event.kind)) {
    logFeatureBad("poll_event_delivery", "invalid_kind");
    return "invalid kind (a lowercase letter, then lowercase letters, digits and hyphens, at most 64 characters)";
  }
  if (mentionsReservedKind(event.kind)) {
    logFeatureBad("poll_event_delivery", "reserved_kind");
    return `kind "${sanitizeTelemetryString(event.kind)}" is reserved for a trusted in-process producer`;
  }
  if (eventDeclarations().has(event.kind)) {
    logFeatureBad("poll_event_delivery", "declared_kind_as_element");
    return `kind "${event.kind}" is declared: send it as fields, in events`;
  }
  let byteLength = Buffer.byteLength(event.element, "utf8");
  if (byteLength > MAX_POLL_EVENT_ENVELOPE_BYTES) {
    logFeatureBad("poll_event_delivery", "envelope_too_large");
    return `envelope is ${byteLength} bytes (cap ${MAX_POLL_EVENT_ENVELOPE_BYTES})`;
  }
  let pollEventEnvelope = parsePollEventEnvelope(event.element);
  if (!pollEventEnvelope.ok) {
    logFeatureBad("poll_event_delivery", "validation_failed");
    return pollEventEnvelope.reason;
  }
  if (pollEventEnvelope.kind !== event.kind) {
    logFeatureBad("poll_event_delivery", "kind_mismatch");
    return `element kind "${sanitizeTelemetryString(pollEventEnvelope.kind)}" does not match declared kind "${sanitizeTelemetryString(event.kind)}"`;
  }
  return {
    input: {
      kind: event.kind,
      element: event.element,
      wake: event.wake,
      provenance: event.provenance,
    },
    hookText: event.element,
    stampedBytes: Buffer.byteLength(event.element, "utf8") + envelopeLengthFor("element"),
  };
}
//@ chunk-tyg7f3ek.js:555432-556550 placement
function validatePollEventBatch(group) {
  if (!isValidPollEventKind(group.kind)) {
    logFeatureBad("poll_event_delivery", "invalid_kind");
    return "invalid kind (a lowercase letter, then lowercase letters, digits and hyphens, at most 64 characters)";
  }
  let declaration = eventDeclarations().get(group.kind);
  if (declaration === undefined) {
    logFeatureBad("poll_event_delivery", "undeclared_kind");
    let fault = eventDeclarationFault();
    return fault === undefined
      ? `kind "${group.kind}" is not declared`
      : `kind "${group.kind}" is not declared: the host's declarations were refused (${sanitizeTelemetryString(fault)})`;
  }
  let pollEventEnvelope = buildPollEventEnvelope({
    declaration,
    at: group.at,
    fields: group.fields,
  });
  if (!pollEventEnvelope.ok) {
    logFeatureBad("poll_event_delivery", "fields_invalid");
    return pollEventEnvelope.reason;
  }
  let declared = {
    declaration,
    at: group.at,
    fields: pollEventEnvelope.fields,
  };
  let stampedBytes = Buffer.byteLength(pollEventEnvelope.envelope, "utf8") + envelopeLengthFor("json");
  if (stampedBytes > MAX_POLL_EVENT_ENVELOPE_BYTES) {
    logFeatureBad("poll_event_delivery", "envelope_too_large");
    return `envelope is ${stampedBytes} bytes after nonce stamping (cap ${MAX_POLL_EVENT_ENVELOPE_BYTES})`;
  }
  let senderText =
    group.from === undefined || group.from.authority === "world-event"
      ? undefined
      : autoModeFieldsText({
          declaration,
          fields: pollEventEnvelope.fields,
        });
  return {
    input: {
      kind: group.kind,
      declared,
      wake: group.wake,
      provenance:
        group.from === undefined
          ? undefined
          : {
              authority: group.from.authority,
              ...(group.from.id !== undefined && {
                senderId: group.from.id,
              }),
              ...(senderText !== undefined && {
                senderText,
              }),
            },
    },
    hookText: [group.kind, group.at, collectFieldStrings(pollEventEnvelope.fields)].filter(
      (part) => part !== "",
    ).join(`
`),
    stampedBytes,
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
    reply: (replyMessage) => {
      if (replyMessage.subtype === "error" && tearingDown()) return;
      try {
        reply(replyMessage);
      } finally {
        ackPollEventRowOnce(row, rowsInFlight, ack);
      }
    },
  };
}
//@ chunk-tyg7f3ek.js:556852-556891 placement
function ackPollEventRowOnce(row, rowsInFlight, ack) {
  if (rowsInFlight.delete(row)) ack(row);
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
  let parsed = array(SDKLocalMessageSchema()).safeParse(addPlugins);
  if (!parsed.success || parsed.data.some((entry) => !isAbsolute(entry.path)))
    return {
      kind: "refused",
      code: "invalid",
      message:
        'reload_plugins add_plugins must be a list of { type: "local", path } entries with absolute paths',
    };
  let mapped = parsed.data.map((entry) => ({
    path: resolve(entry.path),
    withoutMcp: entry.skipMcpDiscovery === true,
  }));
  let pluginDirs = [];
  let mcpOffDirs = [];
  function restore() {
    setInlinePlugins(withoutPluginDirs(getInlinePlugins(), pluginDirs));
    setInlinePluginsNoMcp(withoutPluginDirs(getInlinePluginsNoMcp(), mcpOffDirs));
  }
  try {
    await rebuildSandboxForPluginDir(() => {
      let inlinePlugins = getInlinePlugins();
      let inlinePluginsNoMcp = getInlinePluginsNoMcp();
      mcpOffDirs = withoutPluginDirs(
        mergePluginDirs(mapped.filter((entry) => entry.withoutMcp).map((entry) => entry.path)),
        [...inlinePlugins, ...inlinePluginsNoMcp],
      );
      pluginDirs = withoutPluginDirs(
        mergePluginDirs(mapped.filter((entry) => !entry.withoutMcp).map((entry) => entry.path)),
        [...inlinePlugins, ...inlinePluginsNoMcp, ...mcpOffDirs],
      );
      if (pluginDirs.length === 0 && mcpOffDirs.length === 0) return;
      setInlinePluginsNoMcp([...inlinePluginsNoMcp, ...mcpOffDirs]);
      setInlinePlugins([...inlinePlugins, ...pluginDirs]);
      return restore;
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
    restore,
  };
}
//@ chunk-tyg7f3ek.js:558008-558189 placement
function listSkillsForSdk(skillToolCommands, commands, commands_2) {
  let isFolderAlias = folderNameAliasCheck();
  let commandLookup = buildCommandLookup(commands_2);
  return {
    skills: dropSyncedClashes(skillToolCommands, commands).map((command) => {
      let { builtin, ...fields } = toSlashCommand(command, isFolderAlias);
      let registered = commandLookup.get(fields.name);
      let isBuiltinBoth =
        registered !== undefined && isBuiltinCommand(registered) && isBuiltinCommand(command);
      return {
        ...fields,
        ...(isBuiltinBoth && {
          builtin: true,
        }),
      };
    }),
  };
}
//@ chunk-tyg7f3ek.js:558189-558345 placement
var faultAddress = (fault) => ({
  address: {
    plugin: fault.plugin,
    component: fault.component,
    requestId: fault.instance_id,
    key: fault.client,
    module: fault.module,
  },
  report: {
    phase: fault.phase,
    reason: fault.reason,
  },
});
//@ chunk-tyg7f3ek.js:558345-558493 placement
function describeClientFault(error) {
  let [issue] = error.issues;
  if (issue === undefined) return "ui_client_fault: malformed";
  return `ui_client_fault: ${issue.path.join(".") || "request"}: ` + issue.message;
}
//@ chunk-tyg7f3ek.js:558493-558638 placement
async function handleClientFault(request) {
  let parsed = SDKUiClientFaultUiClientFaultMessageSchema().safeParse(request);
  if (!parsed.success) throw new WireSafeControlError(describeClientFault(parsed.error));
  return {
    handled: (await render.clientFault(faultAddress(parsed.data))) !== undefined,
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
function withToolUseId(component, toolUseId, props) {
  return (component !== "ToolUse" && component !== "ToolResult") || typeof props.tool_use_id === "string"
    ? props
    : {
        ...props,
        tool_use_id: toolUseId,
      };
}
//@ chunk-tyg7f3ek.js:558861-558901 placement
var surfaceClientId = (request) => request.client_id ?? defaultScopeKey(request.surface);
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
  let propsWithTool = withToolUseId(
    request.component,
    request.instance_id,
    truncateToolOutput(request.props),
  );
  let { onScreen, ...rest } = propsWithTool;
  let isMessageComponent = MESSAGE_COMPONENT_NAMES.has(request.component);
  let onScreenField =
    request.on_screen !== undefined
      ? {
          onScreen: request.on_screen,
        }
      : {};
  return isMessageComponent
    ? {
        ...rest,
        ...onScreenField,
      }
    : propsWithTool;
}
//@ chunk-tyg7f3ek.js:559208-560243 placement
/**
 * 为远程客户端（IDE/网页）渲染插件 UI 面板：加入名册、按视口生成树并回传。
 */
async function renderPluginSurface(options, roster) {
  let { request, by, signal } = options;
  let clientId = surfaceClientId(request);
  let joined = roster.rosterMemory.join({
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
  if (!joined.wasOnRoster) roster.givePluginUiTo(joined.isFirstClient);
  let pushes = roster.paneRosterPushes();
  pruneDetachedClients();
  if (joined.isPutBack) roster.tellPaneRoster(pushes);
  let pane = paneTarget(request, clientId);
  if (pane !== undefined)
    attachPaneClient({
      ...pane,
      ...paneStateFields(request.props),
      ...(request.content_rows !== undefined && {
        contentRows: request.content_rows,
      }),
      ...(request.keyed !== undefined && {
        keyed: request.keyed,
      }),
    });
  await import("../../plugins/functionHooks/ui/BOOLEAN_PROPS.lazy.js");
  await vscodeHookRegistrationInFlight(request.surface);
  let rendered = await render.run({
    surface: request.surface,
    component: request.component,
    requestId: request.instance_id,
    ...(request.viewport !== undefined && {
      viewport: request.viewport,
    }),
    props: uiRenderProps(request),
  });
  if (signal?.aborted) return;
  if (roster.isRemoteTransport() && !isClientAttached(clientId)) return;
  if (pane !== undefined)
    updatePaneSurface({
      ...pane,
      tree: rendered.tree,
    });
  let hasClientModules = Object.keys(rendered.clientModules).length > 0;
  return {
    tree: rendered.tree,
    props: rendered.props,
    rewritten: rendered.rewritten,
    hooked: hasRenderHookingSite(request.component, request.surface),
    ...(hasClientModules && {
      client_modules: rendered.clientModules,
    }),
    drawn_by: rendered.drawnBy,
    ...(request.bench !== undefined && {
      bench: request.bench,
    }),
  };
}
//@ chunk-tyg7f3ek.js:560243-560365 placement
var MAX_UI_RETRIES = 3;
var isOnRoster = (roster, request) =>
  roster === undefined ||
  roster.some(
    (entry) =>
      entry.surface === request.surface &&
      entry.component === request.component &&
      entry.requestId === request.instance_id,
  );
//@ chunk-tyg7f3ek.js:560365-560938 placement
async function renderPluginSurfaceWithRetry(request, by, roster) {
  let clientId = surfaceClientId(request);
  let overtaken = false;
  let unsubscribe = render.onInvalidate((rosterNext) => {
    overtaken ||= isOnRoster(rosterNext, request);
  });
  try {
    for (let attempt = 0; attempt < MAX_UI_RETRIES; attempt += 1) {
      overtaken = false;
      let drawn =
        isClientAttached(clientId) && !roster.isPanelAttachOwed()
          ? await renderPluginSurface(
              {
                request,
                by,
              },
              roster,
            )
          : undefined;
      if (!isClientAttached(clientId)) {
        logFeatureSad("plugin_function_hooks_press_drawn", "client_gone");
        return;
      }
      if (drawn === undefined) {
        logFeatureSad("plugin_function_hooks_press_drawn", "draw_refused");
        return;
      }
      if (!overtaken) {
        logFeatureOk("plugin_function_hooks_press_drawn");
        return drawn;
      }
    }
    logFeatureSad("plugin_function_hooks_press_drawn", "draw_overtaken");
    return;
  } catch (error) {
    logHandlerFailure(roster.redactsPersistedLane(), "ui_press", error);
    logFeatureSad("plugin_function_hooks_press_drawn", "draw_failed");
    return;
  } finally {
    unsubscribe();
  }
}
//@ chunk-tyg7f3ek.js:560938-561005 placement
var DESKTOP_UI_EVENT_SUBTYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tyg7f3ek.js:560938", () => {
  DESKTOP_UI_EVENT_SUBTYPES = new Set(["ui_client_press", "ui_message", "ui_client_fault"]);
});
//@ chunk-tyg7f3ek.js:561005-561119 placement
var sdkUiMessageSchema; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-tyg7f3ek.js:561005", () => {
  sdkUiMessageSchema = DoctorLazy(() =>
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
});
//@ chunk-tyg7f3ek.js:561119-561425 placement
function parseSurfaceRequest(payload, resolveSurface) {
  let parsed = sdkUiMessageSchema().safeParse(payload);
  if (!parsed.success) return;
  let clientId = "client_id" in parsed.data ? parsed.data.client_id : undefined;
  let desktopSurface = DESKTOP_UI_EVENT_SUBTYPES.has(parsed.data.subtype) ? DESKTOP : undefined;
  let surface = "surface" in parsed.data ? parsed.data.surface : desktopSurface;
  let defaultSurface = surface !== undefined ? defaultScopeKey(surface) : undefined;
  let resolvedClientId = clientId ?? defaultSurface;
  let surfaceName = resolvedClientId !== undefined ? resolveSurface(resolvedClientId) : undefined;
  return resolvedClientId !== undefined && surfaceName !== undefined
    ? {
        surface: surfaceName,
        clientId: resolvedClientId,
      }
    : undefined;
}
//@ chunk-tyg7f3ek.js:561425-561473 placement
var findSurfaceClient = (clientId) => clientRegistry.list().find((client) => client.clientId === clientId);
//@ chunk-tyg7f3ek.js:561473-561577 placement
function noteSurfaceClientHeard(payload) {
  try {
    let surfaceRequest = parseSurfaceRequest(payload, (clientId) => findSurfaceClient(clientId)?.surface);
    if (surfaceRequest !== undefined) clientRegistry.heard(surfaceRequest.clientId);
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-tyg7f3ek.js:561577-561587 placement
var MAX_RECENT_SURFACE_DECLARATIONS = 64;
//@ chunk-tyg7f3ek.js:561587-562827 placement
function createSurfaceDeclarationTracker(host, senderStands) {
  let declarations = new Map();
  function remember(clientId, declaredBy) {
    let surfaceClient = findSurfaceClient(clientId);
    if (surfaceClient !== undefined)
      setBoundedRecent(
        declarations,
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
  function trusted(clientId) {
    let declaration = host.isRemoteTransport() ? declarations.get(clientId) : undefined;
    let stands = declaration !== undefined && host.senderStands(declaration.declaredBy);
    if (declaration !== undefined && !stands) declarations.delete(clientId);
    return stands ? declaration : undefined;
  }
  function join(joinArgs) {
    let clients = clientRegistry.list();
    let any = clients.some((client) => client.clientId === joinArgs.client.clientId);
    let previous = any ? undefined : trusted(joinArgs.client.clientId);
    let viewport = joinArgs.client.viewport ?? previous?.declared.viewport;
    let stands = host.senderStands(joinArgs.by);
    let attaching = stands
      ? raiseSessionAttach(
          {
            surface: joinArgs.client.surface,
            clientId: joinArgs.client.clientId,
            ...(viewport !== undefined && {
              viewport,
            }),
          },
          joinArgs.answers ?? previous?.declared.answers,
        )
      : Promise.resolve(false);
    let declaredBy = joinArgs.declares ? undefined : previous?.declaredBy;
    let alreadyListed = any && !joinArgs.declares;
    let canDeclare =
      !alreadyListed &&
      senderStands(joinArgs.client.clientId, joinArgs.by) &&
      (declaredBy === undefined || senderStands(joinArgs.client.clientId, declaredBy));
    let isAdmitted = alreadyListed ? stands : canDeclare;
    let firstSeen = !any && !declarations.has(joinArgs.client.clientId);
    if (isAdmitted && (joinArgs.declares || firstSeen)) remember(joinArgs.client.clientId, joinArgs.by);
    return {
      isAdmitted,
      wasOnRoster: any,
      isPutBack: isAdmitted && previous !== undefined,
      isFirstClient: clients.length === 0,
      attaching,
    };
  }
  function readmit(request) {
    try {
      let surfaceRequest = host.isRemoteTransport()
        ? parseSurfaceRequest(request.request, (clientId) => declarations.get(clientId)?.declared.surface)
        : undefined;
      if (!(
        surfaceRequest !== undefined &&
        findSurfaceClient(surfaceRequest.clientId) === undefined &&
        trusted(surfaceRequest.clientId) !== undefined
      ))
        return;
      let joined = join({
        client: surfaceRequest,
        answers: undefined,
        declares: false,
        by: request,
      });
      joined.attaching;
      if (joined.isAdmitted) host.welcomeBack();
    } catch (error) {
      logError(toError(error));
    }
  }
  return {
    join,
    readmit,
    forget: (clientId) => void declarations.delete(clientId),
  };
}
//@ chunk-tyg7f3ek.js:562827-563051 placement
function applyPermissionModeChange(request, toolPermissionContext) {
  let guarded = guardPermissionModeChange(request.mode, toolPermissionContext);
  if (!guarded.ok) return guarded;
  setAccountSetPermissionMode(guarded.mode);
  if (toolPermissionContext.mode === guarded.mode)
    return {
      ok: true,
      mode: guarded.mode,
      context: toolPermissionContext,
    };
  setImmediate(() => {
    permissionModeSignal.emit();
  });
  return {
    ok: true,
    mode: guarded.mode,
    context: {
      ...transitionPermissionMode(toolPermissionContext.mode, guarded.mode, toolPermissionContext),
      mode: guarded.mode,
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
  hasRunningTask(tasks) {
    for (let taskId of this.#n) {
      if (tasks[taskId]?.status === "running") return true;
      this.#n.delete(taskId);
    }
    return false;
  }
  async answer(requestId, request, timing, context) {
    let existing = this.#t.get(requestId);
    if (existing !== undefined) return existing;
    if (timing.readsSessionStream) {
      if (timing.storedAt === undefined || timing.joinedAt === undefined) {
        logFeatureSad("remote_start_shell_task", "join_time_unknown");
        throw new WireSafeControlError(
          "start_shell_task: this worker cannot tell whether it started before or after the request was sent",
        );
      }
      if (timing.storedAt < timing.joinedAt) {
        logFeatureSad("remote_start_shell_task", "sent_before_start");
        throw new WireSafeControlError(
          "start_shell_task: the request was sent before this worker started; send it again",
        );
      }
    }
    if (timing.heldMs !== undefined && timing.heldMs > BANG_COMMAND_MAX_AGE_MS) {
      logFeatureSad("remote_start_shell_task", "late");
      throw new WireSafeControlError("start_shell_task: the request is too old to run; send it again");
    }
    let { cancellableControlRequests } = context;
    let childAbortController = createChildAbortController(context.sessionAbortController);
    cancellableControlRequests.set(requestId, childAbortController);
    this.#o++;
    let run = withFeatureTelemetry("remote_start_shell_task", () =>
      runSdkHostCommand(request, context.canUseTool, context.toolUseContext(childAbortController)),
    ).finally(() => {
      this.#o--;
      if (cancellableControlRequests.get(requestId) === childAbortController)
        cancellableControlRequests.delete(requestId);
    });
    this.#t.set(requestId, run);
    let result = await run;
    if (result.status === "started") this.#n.add(result.task_id);
    return result;
  }
}
//@ chunk-tyg7f3ek.js:564218-566023 placement
/**
 * SDK 宿主请求在本机执行命令（command/args/cwd/env 校验），返回输出。
 */
async function runSdkHostCommand(request, canUseTool, context) {
  let { command, args = [], cwd, env = {}, description } = request;
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
  let toolUse = {
    type: "tool_use",
    id: `toolu_start_shell_task_${randomUUID().replaceAll("-", "")}`,
    name: BASH_TOOL_NAME,
    input: {
      command:
        cwd === undefined
          ? joined
          : `cd ${shellQuoteIfNeeded(cwd.startsWith("-") ? `./${cwd}` : cwd)} && ${joined}`,
      run_in_background: true,
      ...(request.timeout_ms !== undefined && {
        timeout: request.timeout_ms,
      }),
      ...(description !== undefined && {
        description,
      }),
    },
    caller: {
      type: "direct",
    },
  };
  let result;
  let lastText = "the Bash call gave no result";
  for await (let messageItem of runToolUse(
    toolUse,
    createAssistantMessage({
      content: [toolUse],
      isVirtual: true,
    }),
    canUseTool,
    {
      ...context,
      clientRequestedToolUseId: toolUse.id,
    },
    () => new Date().toISOString(),
  )) {
    if (hasTypeField(messageItem) || messageItem.message.type !== "user") continue;
    let { message } = messageItem;
    let content = message.message.content;
    let block =
      typeof content === "string"
        ? undefined
        : content.find((block) => block.type === "tool_result" && block.tool_use_id === toolUse.id);
    if (block?.type !== "tool_result") continue;
    let text =
      typeof block.content === "string"
        ? block.content
        : extractTextContent_2(
            block.content ?? [],
            `
`,
          );
    let taskId =
      Object.values(context.taskRegistry.all()).find((task) => task.toolUseId === toolUse.id)?.id ??
      (typeof message.toolUseResult === "object" &&
      message.toolUseResult !== null &&
      "backgroundTaskId" in message.toolUseResult
        ? message.toolUseResult.backgroundTaskId
        : undefined);
    if (message.toolDenialKind !== undefined)
      result = {
        status: "denied",
        message: text,
      };
    else if (typeof taskId === "string")
      result = {
        status: "started",
        task_id: taskId,
      };
    else lastText = text;
  }
  if (result === undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `start_shell_task: ${lastText}`,
      "start_shell_task: the Bash call failed",
    );
  return result;
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
