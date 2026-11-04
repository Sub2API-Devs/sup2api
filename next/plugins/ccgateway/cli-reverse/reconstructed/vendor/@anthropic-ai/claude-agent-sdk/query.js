/**
 * @anthropic-ai/claude-agent-sdk/query.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/claude-agent-sdk/query.js
 * pieces: chunk-y805ph4h.js (4)
 * attribution: placement 4
 */
import { randomUUID } from "crypto";
import { Stream } from "../../../src/utils/stream.js";
import { DEFAULT_PRINT_BG_WAIT_CEILING_MS } from "../../../src/tasks/LocalShellTask/backgroundNotices.js";
import { logForDebugging } from "../../../src/utils/debug.js";
import {
  errorMessage,
  withTelemetryFacts,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  toError,
} from "../../../src/utils/errors.js";
import { sleep, withDeadline } from "../../../src/utils/sleep.js";
import { STARTUP_MARK, MAX_MARK_NAME_CHARS } from "../../../src/utils/startupMarks.js";
import { HookConfigError } from "../../../src/schemas/hooks.js";
import {
  suppressControlResponse,
  SDK_MANIFEST_CAPTURE,
  MANIFEST_CAPTURE_TIMEOUT_MS,
  logIgnoredMcpServerFields,
} from "./transport.js";
import { jsonStringify, jsonParse } from "../../../src/utils/slowOperations.js";
import { REMOTE_TOOLS_LOG_EVENTS } from "../../../src/services/remoteTools/remoteToolsDebug.js";
import {
  isJsonRpcRequest,
  SdkControlServerTransport,
} from "../../../src/services/mcp/SdkControlTransport.js";
import { logEvent } from "../../../src/services/analytics/index.js";
import { fromEnum } from "../../../src/services/analytics/safeMetadata.js";
import { isLauncherEndReason } from "../../../src/utils/auth/launcherHostLogin.js";
import { MCP_PROTOCOL_LATEST } from "../../../src/services/mcp/mcpCallConstants.js";
import { EMPTY_CAPABILITIES, CLAUDE_CODE_SERVER_INFO } from "../../../src/services/mcp/client.js";
import {
  logFeatureSad,
  logFeatureOk,
  withFeatureTelemetry,
} from "../../../src/services/analytics/featureTelemetry.js";
import { extractSessionIdFromIngressToken } from "./index.js";
import { parseMcpServerSettings, sameToolPolicies } from "../../../src/services/mcp/serverIdentity.js";
import { MAX_TIMER_DELAY_MS } from "../../../src/utils/timerDelayClamp.js";
import { isToolListChangedNotification } from "../../../src/services/mcp/toolsListChanged.js";

//@ chunk-y805ph4h.js:25477-62908 placement
/**
 * Agent SDK 的 Query 对象：包装子进程传输，按消息流产出 SDK 消息，并提供 interrupt、setPermissionMode、setModel、MCP 控制等控制请求以及清理逻辑（[Query.cleanup]）。
 */
class Query {
  transport;
  isSingleUserTurn;
  canUseTool;
  hooks;
  abortController;
  jsonSchema;
  initConfig;
  onElicitation;
  getOAuthToken;
  getHostAuthToken;
  onUserDialog;
  verbatimPrompts;
  runEndCeilingMs;
  pendingControlResponses = new Map();
  unmatchedControlResponses = new Map();
  static UNMATCHED_CONTROL_RESPONSES_MAX = 1024;
  cleanupPerformed = false;
  cleanupCause;
  sdkMessages;
  inputStream = new Stream();
  initialization;
  cancelControllers = new Map();
  hookCallbacks = new Map();
  nextCallbackId = 0;
  initHooksPayload;
  sdkMcpServers = new Map();
  initializeWritten;
  initializeHasBeenWritten = false;
  markInitializeWritten;
  writingFirstInitialize = false;
  stopSdkMcpManifestCapture;
  sdkMcpToolsChangedDuringCapture = new Set();
  pendingMcpResponses = new Map();
  runEndedResolve;
  runEnded = false;
  resultReceived = false;
  startupMark;
  runEndCeilingTimer;
  sessionState;
  lastErrorResultText;
  lastStartupFailureReason;
  errorTextBeforeModelLessTurns;
  modelLessTurnEnded = false;
  latestCommands;
  frameObserver;
  transcriptMirrorBatcher;
  cleanupCallbacks = [];
  cleanupPromise;
  setIsSingleUserTurn(isSingleUserTurn) {
    this.isSingleUserTurn = isSingleUserTurn;
  }
  setTranscriptMirrorBatcher(transcriptMirrorBatcher) {
    this.transcriptMirrorBatcher = transcriptMirrorBatcher;
  }
  reportMirrorError(batcher, error) {
    let event = {
      type: "system",
      subtype: "mirror_error",
      error,
      key: batcher,
      uuid: randomUUID(),
      session_id: batcher.sessionId,
    };
    this.inputStream.enqueue(event);
  }
  addCleanupCallback(callback) {
    if (this.cleanupPerformed) callback();
    else this.cleanupCallbacks.push(callback);
  }
  isClosed() {
    return this.cleanupPerformed;
  }
  hasBidirectionalNeeds() {
    return (
      this.sdkMcpServers.size > 0 ||
      (this.hooks !== undefined && Object.keys(this.hooks).length > 0) ||
      this.canUseTool !== undefined ||
      this.onElicitation !== undefined ||
      this.onUserDialog !== undefined ||
      this.getOAuthToken !== undefined ||
      this.getHostAuthToken !== undefined ||
      this.workSecretAnswerer !== undefined
    );
  }
  remoteControlCallGeneration = 0;
  uiHost;
  workSecretAnswerer;
  constructor(
    transport,
    isSingleUserTurn,
    canUseTool,
    hooks,
    abortController,
    sdkMcpServers = new Map(),
    jsonSchema,
    initConfig,
    onElicitation,
    getOAuthToken,
    getHostAuthToken,
    onUserDialog,
    verbatimPrompts = false,
    runEndCeilingMs = DEFAULT_PRINT_BG_WAIT_CEILING_MS,
  ) {
    this.transport = transport;
    this.isSingleUserTurn = isSingleUserTurn;
    this.canUseTool = canUseTool;
    this.hooks = hooks;
    this.abortController = abortController;
    this.jsonSchema = jsonSchema;
    this.initConfig = initConfig;
    this.onElicitation = onElicitation;
    this.getOAuthToken = getOAuthToken;
    this.getHostAuthToken = getHostAuthToken;
    this.onUserDialog = onUserDialog;
    this.verbatimPrompts = verbatimPrompts;
    this.runEndCeilingMs = runEndCeilingMs;
    for (let [serverName, serverConfig] of sdkMcpServers) this.connectSdkMcpServer(serverName, serverConfig);
    this.sdkMessages = this.readSdkMessages();
    this.readMessages();
    this.initializeWritten = new Promise((resolve) => {
      this.markInitializeWritten = () => {
        this.initializeHasBeenWritten = true;
        resolve();
      };
    });
    this.initialization = this.initialize({
      first: true,
    });
    this.initialization.catch(() => {});
  }
  setError(error) {
    this.inputStream.error(error);
  }
  setFrameObserver(frameObserver) {
    this.frameObserver = frameObserver;
  }
  dropUnreadHookProgress(observer) {
    this.inputStream.dropNewestQueued(
      (frame) => frame.type === "system" && frame.subtype === "hook_progress" && frame.hook_id === observer,
    );
  }
  async stopTask(taskId) {
    await this.request({
      subtype: "stop_task",
      task_id: taskId,
    });
  }
  async backgroundTasks(toolUseId) {
    return (
      (
        await this.request({
          subtype: "background_tasks",
          tool_use_id: toolUseId,
        })
      ).response.backgrounded ?? true
    );
  }
  close() {
    this.cleanup();
  }
  cleanup(cause) {
    this.clearRunEndCeiling();
    if (this.cleanupPromise) return this.cleanupPromise;
    this.cleanupPerformed = true;
    this.cleanupCause = cause;
    this.stopSdkMcpManifestCapture?.();
    this.cleanupPromise = this.performCleanup(cause);
    return this.cleanupPromise;
  }
  async performCleanup(cause) {
    for (let cleanupCallback of this.cleanupCallbacks)
      try {
        cleanupCallback();
      } catch {}
    this.cleanupCallbacks = [];
    if (this.transcriptMirrorBatcher)
      try {
        await this.transcriptMirrorBatcher.flush();
      } catch {}
    try {
      for (let cancelController of this.cancelControllers.values()) cancelController.abort();
      this.cancelControllers.clear();
      this.transport.close();
    } catch (error) {
      logForDebugging(`[Query.cleanup] transport.close() failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
    try {
      let err = cause ?? closedBeforeResponseError();
      for (let { reject } of this.pendingControlResponses.values()) reject(err);
      this.pendingControlResponses.clear();
      this.unmatchedControlResponses.clear();
      for (let { reject } of this.pendingMcpResponses.values()) reject(err);
      this.pendingMcpResponses.clear();
      this.hookCallbacks.clear();
      for (let { transport } of this.sdkMcpServers.values()) transport.close().catch(() => {});
      this.sdkMcpServers.clear();
      if (cause) this.inputStream.error(cause);
      else this.inputStream.done();
    } catch (error) {}
    if (this.transport.waitForExit) {
      let abortController = new AbortController();
      try {
        await Promise.race([this.transport.waitForExit(), sleep(2000, abortController.signal)]);
      } catch {
      } finally {
        abortController.abort();
      }
    }
  }
  next(...[value]) {
    return this.sdkMessages.next(...[value]);
  }
  async return(value) {
    await this.cleanup();
    return this.sdkMessages.return(value);
  }
  async throw(error) {
    await this.cleanup();
    return this.sdkMessages.throw(error);
  }
  [Symbol.asyncIterator]() {
    return this.sdkMessages;
  }
  async [Symbol.asyncDispose]() {
    await this.cleanup();
  }
  async readMessages() {
    try {
      for await (let frame of this.transport.readMessages()) {
        if (frame.type === "control_response") {
          let pending = this.pendingControlResponses.get(frame.response.request_id);
          if (pending) pending.handler(frame.response);
          else {
            if (this.unmatchedControlResponses.size >= Query.UNMATCHED_CONTROL_RESPONSES_MAX) {
              let oldestRequestId = this.unmatchedControlResponses.keys().next().value;
              if (oldestRequestId !== undefined) this.unmatchedControlResponses.delete(oldestRequestId);
            }
            this.unmatchedControlResponses.set(frame.response.request_id, frame.response);
          }
          continue;
        } else if (frame.type === "control_request") {
          this.handleControlRequest(frame);
          continue;
        } else if (frame.type === "control_cancel_request") {
          this.handleControlCancelRequest(frame);
          continue;
        } else if (frame.type === "keep_alive") {
          if (STARTUP_MARK in frame) {
            let mark = frame[STARTUP_MARK];
            if (typeof mark === "string" && mark.length <= MAX_MARK_NAME_CHARS)
              this.startupMark = {
                mark,
                atMs: Date.now(),
              };
          }
          continue;
        } else if (frame.type === "transcript_mirror") {
          this.transcriptMirrorBatcher?.enqueue(frame.filePath, frame.entries);
          continue;
        }
        if (frame.type === "system" && frame.subtype === "commands_changed" && Array.isArray(frame.commands))
          this.latestCommands = frame.commands;
        if (
          frame.type === "system" &&
          (frame.subtype === "post_turn_summary" ||
            frame.subtype === "task_summary" ||
            frame.subtype === "session_metadata")
        ) {
          this.inputStream.enqueue(frame);
          continue;
        }
        if (frame.type === "active_goal") {
          this.inputStream.enqueue(frame);
          continue;
        }
        if (frame.type === "autocompact_state") {
          this.inputStream.enqueue(frame);
          continue;
        }
        if (frame.type === "result") {
          if (this.transcriptMirrorBatcher) await this.transcriptMirrorBatcher.flush();
          let errorText = frame.is_error
            ? frame.subtype === "success"
              ? frame.result
              : frame.errors
                  .map((error) => error.trim())
                  .filter(Boolean)
                  .join("; ")
            : undefined;
          this.lastErrorResultText = errorText || undefined;
          this.lastStartupFailureReason =
            frame.is_error &&
            "startup_failure_reason" in frame &&
            typeof frame.startup_failure_reason === "string"
              ? frame.startup_failure_reason
              : undefined;
          this.modelLessTurnEnded =
            frame.subtype === "success" && !frame.is_error && frame.num_turns === 0 && frame.result === "";
          if (!this.modelLessTurnEnded) this.errorTextBeforeModelLessTurns = this.lastErrorResultText;
          this.resultReceived = true;
          if (
            this.sessionState === undefined ||
            this.sessionState === "idle" ||
            !this.hasBidirectionalNeeds()
          )
            this.endRun();
          else this.armRunEndCeiling();
        } else if (frame.type === "system" && frame.subtype === "session_state_changed") {
          this.sessionState = frame.state;
          if (frame.state === "idle") {
            if (this.resultReceived) this.endRun();
          } else if (!(this.isSingleUserTurn && this.runEnded)) {
            this.runEnded = false;
            if (frame.state === "requires_action") this.clearRunEndCeiling();
            else if (this.resultReceived) this.armRunEndCeiling();
          }
          if ("sdk_host_only" in frame && frame.sdk_host_only === true) continue;
        } else {
          this.lastErrorResultText = undefined;
          this.lastStartupFailureReason = undefined;
          if (frame.type === "system" && frame.subtype === "init") this.modelLessTurnEnded = false;
          else if (frame.type !== "system" || frame.subtype === "compact_boundary") {
            this.errorTextBeforeModelLessTurns = undefined;
            this.modelLessTurnEnded = false;
          }
          if (
            (frame.type === "assistant" || frame.type === "stream_event") &&
            frame.parent_tool_use_id === null &&
            !(this.isSingleUserTurn && this.runEnded)
          ) {
            this.runEnded = false;
            this.clearRunEndCeiling();
          }
        }
        try {
          this.frameObserver?.(frame);
        } catch (error) {
          logForDebugging(`[Query.readMessages] The frame observer threw: ${errorMessage(error)}`, {
            level: "error",
          });
        }
        this.inputStream.enqueue(frame);
      }
      if (this.transcriptMirrorBatcher) await this.transcriptMirrorBatcher.flush();
      this.inputStream.done();
      this.cleanup();
    } catch (error) {
      if (this.transcriptMirrorBatcher) await this.transcriptMirrorBatcher.flush();
      let errorText =
        this.lastErrorResultText ??
        (this.modelLessTurnEnded ? this.errorTextBeforeModelLessTurns : undefined);
      if (errorText !== undefined && !(error instanceof HookConfigError) && error?.name !== "SSEHttpError") {
        let wrapped = withTelemetryFacts(Error(`Claude Code returned an error result: ${errorText}`), {
          telemetryMessage: "Claude Code returned an error result",
          errorClass: "error_result",
          startupFailureReason: this.lastStartupFailureReason,
        });
        logForDebugging(
          `[Query.readMessages] Replacing exit error with result text. Original: ${errorMessage(error)}`,
        );
        this.inputStream.error(wrapped);
        this.cleanup(wrapped);
        return;
      }
      this.inputStream.error(error);
      this.cleanup(error);
    }
  }
  async handleControlRequest(frame) {
    if (this.cleanupPerformed) {
      logForDebugging(
        `[Query.handleControlRequest] Request ${frame.request_id} (${frame.request.subtype}) arrived after close \u2014 skipping`,
      );
      return;
    }
    if (this.cancelControllers.has(frame.request_id)) {
      logForDebugging(
        `[Query.handleControlRequest] Duplicate delivery of in-flight request ${frame.request_id} (${frame.request.subtype}) \u2014 skipping`,
      );
      return;
    }
    let abortController = new AbortController();
    this.cancelControllers.set(frame.request_id, abortController);
    try {
      let controller;
      try {
        let result = await this.processControlRequest(frame, abortController.signal);
        if (this.cleanupPerformed) return;
        if (result === suppressControlResponse) return;
        let response = {
          type: "control_response",
          response: {
            subtype: "success",
            request_id: frame.request_id,
            response: result,
          },
        };
        controller =
          jsonStringify(response) +
          `
`;
      } catch (error) {
        if (this.cleanupPerformed) return;
        let errorResponse = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: frame.request_id,
            error: errorMessage(error),
          },
        };
        controller =
          jsonStringify(errorResponse) +
          `
`;
      }
      try {
        await Promise.resolve(this.transport.write(controller));
      } catch (error) {
        logForDebugging(`[Query.handleControlRequest] Response write failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    } finally {
      if (this.cancelControllers.get(frame.request_id) === abortController)
        this.cancelControllers.delete(frame.request_id);
    }
  }
  handleControlCancelRequest(frame) {
    let controller = this.cancelControllers.get(frame.request_id);
    if (controller) {
      controller.abort();
      this.cancelControllers.delete(frame.request_id);
    }
  }
  async processControlRequest(frame, signal) {
    if (REMOTE_TOOLS_LOG_EVENTS.some((subtype) => subtype === frame.request.subtype)) {
      logForDebugging(
        `[Query.processControlRequest] ${frame.request.subtype} ${frame.request_id} is for the machine serving this session's tools \u2014 leaving it unanswered`,
      );
      return suppressControlResponse;
    }
    if (frame.request.subtype === "can_use_tool") {
      if (!this.canUseTool) throw Error("canUseTool callback is not provided.");
      let computerFolder = frame.request.computer_folder;
      let result = await this.canUseTool(frame.request.tool_name, frame.request.input, {
        signal,
        suggestions: frame.request.permission_suggestions,
        blockedPath: frame.request.blocked_path,
        ...(frame.request.mcp_server && {
          mcpServer: {
            name: frame.request.mcp_server.name,
            source: frame.request.mcp_server.source,
          },
        }),
        decisionReason: frame.request.decision_reason,
        ...(typeof frame.request.decision_reason_type === "string" && {
          decisionReasonType: frame.request.decision_reason_type,
        }),
        ...(typeof frame.request.decision_reason_code === "string" && {
          decisionReasonCode: frame.request.decision_reason_code,
        }),
        ...(typeof frame.request.server_policy_ask_only === "boolean" && {
          serverPolicyAskOnly: frame.request.server_policy_ask_only,
        }),
        title: frame.request.title,
        displayName: frame.request.display_name,
        description: frame.request.description,
        defaultToNo: frame.request.default_to_no,
        suppressAlwaysAllowRule: frame.request.suppress_always_allow_rule,
        toolUseID: frame.request.tool_use_id,
        agentID: frame.request.agent_id,
        ...(typeof frame.request.plugin === "string" && {
          plugin: frame.request.plugin,
        }),
        requestId: frame.request_id,
        ...(typeof frame.request.requires_user_interaction === "boolean" && {
          requiresUserInteraction: frame.request.requires_user_interaction,
        }),
        ...(typeof frame.request.server_prompt === "string" && {
          serverPrompt: frame.request.server_prompt,
        }),
        ...(typeof computerFolder === "object" &&
          computerFolder !== null &&
          "path" in computerFolder &&
          typeof computerFolder.path === "string" &&
          "computer_name" in computerFolder &&
          typeof computerFolder.computer_name === "string" && {
            computerFolder: {
              path: computerFolder.path,
              computer_name: computerFolder.computer_name,
            },
          }),
        ...(frame.request.matched_ask_rule && {
          matchedAskRule: {
            source: frame.request.matched_ask_rule.source,
            toolName: frame.request.matched_ask_rule.tool_name,
            ...(frame.request.matched_ask_rule.rule_content !== undefined && {
              ruleContent: frame.request.matched_ask_rule.rule_content,
            }),
          },
        }),
      });
      if (result === null) return suppressControlResponse;
      return {
        ...result,
        toolUseID: frame.request.tool_use_id,
      };
    } else if (frame.request.subtype === "hook_callback")
      return await this.handleHookCallbacks(
        frame.request.callback_id,
        frame.request.input,
        frame.request.tool_use_id,
        signal,
      );
    else if (frame.request.subtype === "mcp_message") {
      let request = frame.request;
      let transport = this.sdkMcpServers.get(request.server_name)?.transport;
      if (!transport) throw Error(`SDK MCP server not found: ${request.server_name}`);
      if (isJsonRpcRequest(request.message))
        return {
          mcp_response: await this.handleMcpControlRequest(request.server_name, request, transport),
        };
      else {
        if (transport.onmessage) transport.onmessage(request.message);
        return {
          mcp_response: {
            jsonrpc: "2.0",
            result: {},
            id: 0,
          },
        };
      }
    } else if (frame.request.subtype === "elicitation") {
      let request = frame.request;
      if (this.onElicitation) {
        let request_2 = await this.onElicitation(
          {
            serverName: request.mcp_server_name,
            message: request.message,
            mode: request.mode,
            url: request.url,
            elicitationId: request.elicitation_id,
            requestedSchema: request.requested_schema,
            title: request.title,
            displayName: request.display_name,
            description: request.description,
          },
          {
            signal,
            requestId: frame.request_id,
          },
        );
        if (request_2 === null) return suppressControlResponse;
        return request_2;
      }
      return {
        action: "decline",
      };
    } else if (frame.request.subtype === "request_user_dialog") {
      if (this.onUserDialog) {
        let request = await this.onUserDialog(
          {
            dialogKind: frame.request.dialog_kind,
            payload: frame.request.payload,
            toolUseID: frame.request.tool_use_id,
          },
          {
            signal,
            requestId: frame.request_id,
          },
        );
        if (request === null) return suppressControlResponse;
        return request;
      }
      logForDebugging(
        `[Query] No onUserDialog handler for request_user_dialog (kind=${frame.request.dialog_kind}) \u2014 staying silent so a capable client (or the worker's park deadline) settles it`,
      );
      logEvent("tengu_request_user_dialog_response_ignored", {
        shape: fromEnum("auto_cancel"),
      });
      return suppressControlResponse;
    } else if (frame.request.subtype === "oauth_token_refresh") {
      if (!this.getOAuthToken) throw Error("getOAuthToken callback is not provided.");
      let result;
      let declined =
        (await this.getOAuthToken({
          signal,
          onDecline: (reason) => {
            if (isLauncherEndReason(reason)) result = reason;
          },
          ...(frame.request.kind !== undefined && {
            kind: frame.request.kind,
          }),
        })) ?? null;
      return declined === null && result !== undefined
        ? {
            accessToken: declined,
            reason: result,
          }
        : {
            accessToken: declined,
          };
    } else if (frame.request.subtype === "host_auth_token_refresh") {
      if (!this.getHostAuthToken) throw Error("getHostAuthToken callback is not provided.");
      let result =
        (await this.getHostAuthToken({
          signal,
        })) ?? null;
      return typeof result === "string" || result === null
        ? {
            authToken: result,
          }
        : result;
    } else if (frame.request.subtype === "remote_control_work_secret") {
      let workSecretAnswerer = this.workSecretAnswerer;
      if (!workSecretAnswerer) throw Error("refreshWorkSecret callback is not provided.");
      if (!sharesCallbackSuffix(workSecretAnswerer.sessionId, frame.request.session_id))
        throw Error("remote_control_work_secret names a session this host did not attach.");
      return {
        work_secret:
          (await workSecretAnswerer.refresh(workSecretAnswerer.sessionId, {
            signal,
          })) || null,
      };
    }
    if (frame.request.subtype === "ui_copy" && this.uiHost?.copy) {
      let { subtype, ...payload } = frame.request;
      return this.uiHost.copy(payload, {
        signal,
      });
    }
    if (frame.request.subtype === "ui_prompt_read" && this.uiHost?.promptRead) {
      let { subtype, ...payload } = frame.request;
      return this.uiHost.promptRead(payload, {
        signal,
      });
    }
    if (frame.request.subtype === "ui_prompt_fill" && this.uiHost?.promptFill) {
      let { subtype, ...payload } = frame.request;
      return this.uiHost.promptFill(payload, {
        signal,
      });
    }
    if (frame.request.subtype === "ui_prompt_paint" && this.uiHost?.promptPaint) {
      let { subtype, ...payload } = frame.request;
      return this.uiHost.promptPaint(payload, {
        signal,
      });
    }
    if (frame.request.subtype === "ui_prompt_suggest" && this.uiHost?.promptSuggest) {
      let { subtype, ...payload } = frame.request;
      return this.uiHost.promptSuggest(payload, {
        signal,
      });
    }
    if (frame.request.subtype === "ui_read_selection" && this.uiHost?.readSelection) {
      let { subtype, ...payload } = frame.request;
      return this.uiHost.readSelection(payload, {
        signal,
      });
    }
    throw Error("Unsupported control request subtype: " + frame.request.subtype);
  }
  async *readSdkMessages() {
    try {
      for await (let message of this.inputStream) {
        this.transport.markDelivered?.(message);
        yield message;
      }
    } finally {
      await this.cleanup();
    }
  }
  async initialize(
    { first } = {
      first: false,
    },
  ) {
    if (!first && !this.initializeHasBeenWritten) await this.initializeWritten;
    let result;
    let toolChange;
    try {
      if (first && this.initConfig?.captureSdkMcpManifests === true && this.sdkMcpServers.size > 0) {
        result = await this.captureSdkMcpServerManifests();
        for (let manifests of this.sdkMcpToolsChangedDuringCapture) {
          let entry =
            result !== undefined && Object.hasOwn(result, manifests) ? result[manifests] : undefined;
          if (entry?.toolsListResult !== undefined)
            result[manifests] = {
              initializeResult: entry.initializeResult,
            };
        }
      }
      this.sdkMcpToolsChangedDuringCapture.clear();
      let initializeRequest = this.buildInitializeRequest(result);
      if (this.cleanupPerformed) throw this.cleanupCause ?? Error("Query closed before initialize was sent");
      this.writingFirstInitialize = first;
      try {
        toolChange = this.request(initializeRequest);
      } finally {
        this.writingFirstInitialize = false;
      }
    } finally {
      if (first) this.markInitializeWritten();
    }
    let response = (await toolChange).response;
    if (
      this.initConfig?.plugins !== undefined &&
      this.initConfig.plugins.length > 0 &&
      response.plugins_applied !== true
    )
      logForDebugging(
        `[Query.initialize] Claude Code reported plugins_applied=${String(response.plugins_applied)} for ${this.initConfig.plugins.length} plugins sent with pluginDelivery 'initialize'; the process is running with the plugins it was launched with.`,
        {
          level: "warn",
        },
      );
    return response;
  }
  buildInitializeRequest(sdkMcpServerManifests) {
    if (this.hooks && !this.initHooksPayload) {
      this.initHooksPayload = {};
      for (let [key, value] of Object.entries(this.hooks))
        if (value.length > 0)
          this.initHooksPayload[key] = value.map((hook) => {
            let callbacks = [];
            for (let hook_2 of hook.hooks) {
              let callbackId = `hook_${this.nextCallbackId++}`;
              this.hookCallbacks.set(callbackId, hook_2);
              callbacks.push(callbackId);
            }
            return {
              matcher: hook.matcher,
              hookCallbackIds: callbacks,
              timeout: hook.timeout,
            };
          });
    }
    let sdkMcpServers = this.sdkMcpServers.size > 0 ? Array.from(this.sdkMcpServers.keys()) : undefined;
    let flattened = Array.from(this.sdkMcpServers).flatMap(([serverName, { settings }]) =>
      Object.keys(settings).length > 0 ? [[serverName, settings]] : [],
    );
    let sdkMcpServerConfigs = flattened.length > 0 ? Object.fromEntries(flattened) : undefined;
    return {
      subtype: "initialize",
      hooks: this.initHooksPayload,
      sdkMcpServers,
      sdkMcpServerConfigs,
      sdkMcpServerManifests,
      jsonSchema: this.jsonSchema,
      systemPrompt:
        typeof this.initConfig?.systemPrompt === "string"
          ? [this.initConfig.systemPrompt]
          : this.initConfig?.systemPrompt,
      appendSystemPrompt: this.initConfig?.appendSystemPrompt,
      planModeInstructions: this.initConfig?.planModeInstructions,
      systemPromptSnapshot: this.initConfig?.systemPromptSnapshot,
      appendSubagentSystemPrompt: this.initConfig?.appendSubagentSystemPrompt,
      toolAliases: this.initConfig?.toolAliases,
      codeRunningMcpTools: this.initConfig?.codeRunningMcpTools,
      excludeDynamicSections: this.initConfig?.excludeDynamicSections,
      agents: this.initConfig?.agents,
      title: this.initConfig?.title,
      skills: Array.isArray(this.initConfig?.skills) ? this.initConfig.skills : undefined,
      webSearchIsolationExemptMcpServers: this.initConfig?.webSearchIsolationExemptMcpServers,
      promptSuggestions: this.initConfig?.promptSuggestions,
      agentProgressSummaries: this.initConfig?.agentProgressSummaries,
      forwardSubagentText: this.initConfig?.forwardSubagentText,
      supportedDialogKinds: this.initConfig?.supportedDialogKinds,
      perTaskStopAffordance: this.initConfig?.perTaskStopAffordance,
      rapidFollowupPreempt: this.initConfig?.rapidFollowupPreempt,
      forwardNestedSubagentToolCalls: this.initConfig?.forwardNestedSubagentToolCalls,
      workspaceTrust: this.initConfig?.workspaceTrust,
      plugins: this.initConfig?.plugins,
    };
  }
  async captureSdkMcpServerManifests() {
    let startTime = performance.now();
    let captured = new Map();
    let aborted = false;
    let captureOne = async (serverName, signal) => {
      try {
        await this.sdkMcpServers.get(serverName)?.connection;
        if (aborted) return;
        let initResult = await this.handleMcpControlRequest(
          serverName,
          {
            server_name: serverName,
            message: {
              jsonrpc: "2.0",
              id: SDK_MANIFEST_CAPTURE + "initialize",
              method: "initialize",
              params: {
                protocolVersion: MCP_PROTOCOL_LATEST,
                capabilities: EMPTY_CAPABILITIES,
                clientInfo: {
                  ...CLAUDE_CODE_SERVER_INFO,
                  version:
                    {
                      ISSUES_EXPLAINER:
                        "report the issue at https://github.com/anthropics/claude-code/issues",
                      PACKAGE_URL: "@anthropic-ai/claude-code",
                      README_URL: "https://code.claude.com/docs/en/overview",
                      VERSION: "2.1.316",
                      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                      BUILD_TIME: "2026-10-30T23:28:13Z",
                      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                      HOOKS_WORKER_URL:
                        import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                      DD_SOURCEMAP_GROUP: "default",
                    }.VERSION ?? "unknown",
                },
              },
            },
          },
          signal,
        );
        if (aborted) return;
        if (!("result" in initResult)) {
          logForDebugging(
            `[Query.captureSdkMcpServerManifests] '${serverName}' answered initialize with an error; leaving it to the CLI: ${jsonStringify(initResult)}`,
            {
              level: "warn",
            },
          );
          return;
        }
        let initResult_2 = initResult.result;
        signal.onmessage?.({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        });
        let capabilities = initResult_2.capabilities;
        let capabilities_2 =
          typeof capabilities === "object" &&
          capabilities !== null &&
          "tools" in capabilities &&
          capabilities.tools !== undefined &&
          capabilities.tools !== null;
        let hasTools;
        if (capabilities_2) {
          let toolsResult = await this.handleMcpControlRequest(
            serverName,
            {
              server_name: serverName,
              message: {
                jsonrpc: "2.0",
                id: SDK_MANIFEST_CAPTURE + "tools-list",
                method: "tools/list",
              },
            },
            signal,
          );
          if (aborted) return;
          if (!("result" in toolsResult)) {
            logForDebugging(
              `[Query.captureSdkMcpServerManifests] '${serverName}' answered tools/list with an error; leaving it to the CLI: ${jsonStringify(toolsResult)}`,
              {
                level: "warn",
              },
            );
            return;
          }
          if (toolsResult.result.nextCursor === undefined) hasTools = toolsResult.result;
        }
        let manifest = jsonParse(
          jsonStringify(
            hasTools === undefined
              ? {
                  initializeResult: initResult_2,
                }
              : {
                  initializeResult: initResult_2,
                  toolsListResult: hasTools,
                },
          ),
        );
        captured.set(serverName, {
          transport: signal,
          manifest,
        });
      } catch (error) {
        if (!aborted)
          logForDebugging(
            `[Query.captureSdkMcpServerManifests] '${serverName}': ${error}; the CLI will handshake it over the control channel`,
            {
              level: "warn",
            },
          );
      }
    };
    let list = Array.from(this.sdkMcpServers, ([serverName, { transport }]) =>
      captureOne(serverName, transport),
    );
    let captures = Promise.all(list).then(() => "settled");
    let promise = new Promise((resolve) => {
      this.stopSdkMcpManifestCapture = () => resolve("closed");
    });
    let stringified = await withDeadline(Promise.race([captures, promise]), MANIFEST_CAPTURE_TIMEOUT_MS);
    aborted = true;
    this.stopSdkMcpManifestCapture = undefined;
    let rounded = Math.round(performance.now() - startTime);
    let elapsedMs = {
      servers: list.length,
      captured: captured.size,
      elapsed_ms: rounded,
    };
    if (stringified === "closed") {
      logFeatureSad("sdk_mcp_manifest_capture", "closed", elapsedMs);
      return;
    }
    if (stringified === undefined) {
      logForDebugging(
        `[Query.captureSdkMcpServerManifests] ${captured.size}/${list.length} in-process MCP servers captured within ${MANIFEST_CAPTURE_TIMEOUT_MS} ms; the rest will handshake over the control channel`,
        {
          level: "warn",
        },
      );
      logFeatureSad("sdk_mcp_manifest_capture", "deadline", elapsedMs);
    } else if (captured.size < list.length) logFeatureSad("sdk_mcp_manifest_capture", "partial", elapsedMs);
    else logFeatureOk("sdk_mcp_manifest_capture", elapsedMs);
    if (captured.size === 0) return;
    let capturedTools = Object.fromEntries(
      Array.from(this.sdkMcpServers).flatMap(([serverName, entry]) => {
        let capturedServer = captured.get(serverName);
        return capturedServer !== undefined && capturedServer.transport === entry.transport
          ? [[serverName, capturedServer.manifest]]
          : [];
      }),
    );
    if (Object.keys(capturedTools).length === 0) return;
    logForDebugging(
      `[Query.captureSdkMcpServerManifests] manifests for [${Object.keys(capturedTools).join(", ")}] captured in ${rounded} ms`,
    );
    return capturedTools;
  }
  async interrupt(cancelQueuedMessages) {
    return withFeatureTelemetry("sdk_interrupt", async () => {
      let result = await this.request({
        subtype: "interrupt",
        ...(cancelQueuedMessages?.cancelQueued === true && {
          cancel_queued: true,
        }),
      });
      let stillQueued = result.response?.still_queued;
      if (!Array.isArray(stillQueued)) return;
      let cancelled = result.response?.cancelled;
      return {
        still_queued: stillQueued.filter((item) => typeof item === "string"),
        ...(Array.isArray(cancelled) && {
          cancelled: cancelled.filter((item) => typeof item === "string"),
        }),
      };
    });
  }
  async setPermissionMode(mode) {
    await this.request({
      subtype: "set_permission_mode",
      mode,
    });
  }
  startupMarkReached() {
    let startupMark = this.startupMark;
    return (
      startupMark && {
        mark: startupMark.mark,
        ageMs: Math.max(0, Math.round(Date.now() - startupMark.atMs)),
      }
    );
  }
  setUiHost(uiHost) {
    this.uiHost = uiHost;
  }
  async setMcpPermissionModeOverride(serverName, mode) {
    return (
      (
        await this.request({
          subtype: "set_mcp_permission_mode_override",
          serverName,
          mode,
        })
      ).response ?? {}
    );
  }
  async setChromeBrowserHints(hints) {
    await this.request({
      subtype: "set_chrome_browser_hints",
      ...hints,
    });
  }
  async setPromptSuggestionsPaused(paused) {
    await this.request({
      subtype: "set_prompt_suggestions_paused",
      paused,
    });
  }
  awaitControlResponse(requestId) {
    this.transport.expectControlResponse?.(requestId);
    return new Promise((resolve, reject) => {
      let handler = (response) => {
        if (response.subtype === "success") {
          let {
            pending_permission_requests: pendingPermissionRequests,
            pending_user_dialog_requests: pendingUserDialogRequests,
            pending_elicitation_requests: pendingElicitationRequests,
            ...extra
          } = response;
          resolve(extra);
        } else
          reject(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              response.error,
              "awaitControlResponse: CLI error verdict",
            ),
          );
        if (
          response.pending_permission_requests ||
          response.pending_user_dialog_requests ||
          response.pending_elicitation_requests
        )
          logForDebugging("[Query] Ignoring prompt-redelivery fields on awaitControlResponse response");
      };
      if (this.cleanupPerformed) {
        reject(closedBeforeResponseError());
        return;
      }
      let unmatched = this.unmatchedControlResponses.get(requestId);
      if (unmatched) {
        this.unmatchedControlResponses.delete(requestId);
        handler(unmatched);
        return;
      }
      this.pendingControlResponses.set(requestId, {
        handler: (response) => {
          this.pendingControlResponses.delete(requestId);
          handler(response);
        },
        reject,
      });
    });
  }
  async setModel(model) {
    await this.request({
      subtype: "set_model",
      model,
    });
  }
  async setMaxThinkingTokens(maxThinkingTokens, thinkingDisplay) {
    await this.request({
      subtype: "set_max_thinking_tokens",
      max_thinking_tokens: maxThinkingTokens,
      thinking_display: thinkingDisplay,
    });
  }
  async applyFlagSettings(settings) {
    return withFeatureTelemetry("sdk_apply_flag_settings", async () => {
      await this.request({
        subtype: "apply_flag_settings",
        settings,
      });
    });
  }
  async getSettings() {
    return (
      await this.request({
        subtype: "get_settings",
      })
    ).response;
  }
  async getHooksListing() {
    return (
      await this.request({
        subtype: "get_hooks_listing",
      })
    ).response;
  }
  async getTaskOutput(taskId) {
    return (
      await this.request({
        subtype: "get_task_output",
        task_id: taskId,
      })
    ).response;
  }
  async listPermissionRules() {
    return (
      await this.request({
        subtype: "list_permission_rules",
      })
    ).response;
  }
  async updateSettings(source, settings) {
    return withFeatureTelemetry("sdk_update_settings", async () => {
      await this.request({
        subtype: "update_settings",
        source,
        settings,
      });
    });
  }
  async rewindFiles(userMessageId, settings) {
    return withFeatureTelemetry(
      "sdk_rewind_files",
      async () =>
        (
          await this.request({
            subtype: "rewind_files",
            user_message_id: userMessageId,
            dry_run: settings?.dryRun,
          })
        ).response,
    );
  }
  async cancelAsyncMessage(messageUuid) {
    return (
      await this.request({
        subtype: "cancel_async_message",
        message_uuid: messageUuid,
      })
    ).response.cancelled;
  }
  async seedReadState(path, mtime) {
    await this.request({
      subtype: "seed_read_state",
      path,
      mtime,
    });
  }
  async setCwd(path, mtime) {
    return withFeatureTelemetry(
      "sdk_set_cwd",
      async () =>
        (
          await this.request({
            subtype: "set_cwd",
            path,
            ...(mtime?.trustAccepted !== undefined && {
              trust_accepted: mtime.trustAccepted,
            }),
            ...(mtime?.trustedDirectory !== undefined && {
              trusted_directory: mtime.trustedDirectory,
            }),
          })
        ).response,
    );
  }
  async claimSession(trustedDirectory) {
    let claim = withFeatureTelemetry(
      "sdk_claim_session",
      async () =>
        (
          await this.request({
            subtype: "claim_session",
            ...trustedDirectory,
            include_initialize: trustedDirectory.include_initialize ?? true,
          })
        ).response,
    );
    let initialization = this.initialization;
    this.initialization = claim.then(
      async (initResult) => {
        if (initResult?.initialize === undefined) return initialization;
        let initialize = initResult.initialize;
        let hooksApplied = await initialization.then(
          (applied) => ({
            hooks_applied: applied.hooks_applied,
            plugins_applied: applied.plugins_applied,
            code_running_mcp_tools_applied: applied.code_running_mcp_tools_applied,
          }),
          () => ({
            hooks_applied: undefined,
            plugins_applied: undefined,
            code_running_mcp_tools_applied: undefined,
          }),
        );
        let hooksApplied_2 = initialize.hooks_applied ?? hooksApplied.hooks_applied;
        let pluginsApplied = initialize.plugins_applied ?? hooksApplied.plugins_applied;
        let codeRunningMcpToolsApplied =
          initialize.code_running_mcp_tools_applied ?? hooksApplied.code_running_mcp_tools_applied;
        return {
          ...initialize,
          ...(hooksApplied_2 !== undefined && {
            hooks_applied: hooksApplied_2,
          }),
          ...(pluginsApplied !== undefined && {
            plugins_applied: pluginsApplied,
          }),
          ...(codeRunningMcpToolsApplied !== undefined && {
            code_running_mcp_tools_applied: codeRunningMcpToolsApplied,
          }),
        };
      },
      () => initialization,
    );
    this.initialization.catch(() => {});
    return claim;
  }
  async enableRemoteControl(workSecret, reattachSessionId, options) {
    let generation = ++this.remoteControlCallGeneration;
    let workSecretAnswerer = this.workSecretAnswerer;
    let reattachId =
      options?.reattachSessionId ||
      (options?.workSecret === undefined ? undefined : extractSessionIdFromIngressToken(options.workSecret));
    let answerer =
      workSecret && options?.workSecret !== undefined && options.refreshWorkSecret && reattachId !== undefined
        ? {
            sessionId: reattachId,
            refresh: options.refreshWorkSecret,
          }
        : undefined;
    this.workSecretAnswerer = answerer;
    let response;
    try {
      response = (
        await this.request({
          subtype: "remote_control",
          enabled: workSecret,
          ...(reattachSessionId !== undefined && {
            name: reattachSessionId,
          }),
          reattach_session_id: options?.reattachSessionId,
          keep_session_on_exit: options?.keepSessionOnExit,
          work_secret: options?.workSecret,
        })
      ).response;
    } catch (error) {
      if (generation === this.remoteControlCallGeneration) this.workSecretAnswerer = undefined;
      throw error;
    }
    if (workSecret && generation === this.remoteControlCallGeneration) {
      let bridgeSessionId = response.bridge_session_id;
      let bridgeSessionId_2 = [answerer, workSecretAnswerer];
      this.workSecretAnswerer =
        typeof bridgeSessionId === "string"
          ? bridgeSessionId_2.find(
              (answerer) =>
                answerer !== undefined && sharesCallbackSuffix(answerer.sessionId, bridgeSessionId),
            )
          : undefined;
    }
    return response;
  }
  async submitFeedback(description, message) {
    return (
      await this.request({
        subtype: "submit_feedback",
        description,
        surface: message?.surface,
        draft_id: message?.draft_id,
        type: message?.type,
        title: message?.title,
        area: message?.area,
        attach_transcript: message?.attach_transcript,
        save_locally: message?.save_locally,
      })
    ).response;
  }
  async submitSurveyFeedback(options) {
    return (
      await this.request({
        subtype: "submit_survey_feedback",
        ...options,
      })
    ).response;
  }
  async renameSession(title, sessionId) {
    await this.request({
      subtype: "rename_session",
      title,
      source: "host",
      session_id: sessionId,
    });
  }
  async generateSessionTitle(description, sessionId) {
    return withFeatureTelemetry(
      "sdk_session_title_generate",
      async () =>
        (
          await this.request({
            subtype: "generate_session_title",
            description,
            persist: sessionId?.persist,
          })
        ).response.title,
    );
  }
  async askSideQuestion(question, sessionId) {
    return withFeatureTelemetry(
      "sdk_side_question",
      async () => {
        let response = (
          await this.request(
            {
              subtype: "side_question",
              question,
              ...(sessionId?.history?.length && {
                history: [...sessionId.history],
              }),
            },
            sessionId,
          )
        ).response;
        return response.response === null
          ? null
          : {
              response: response.response,
              synthetic: response.synthetic ?? false,
              ...(response.refusal_fallback && {
                refusalFallback: {
                  originalModel: response.refusal_fallback.original_model,
                  fallbackModel: response.refusal_fallback.fallback_model,
                  content: response.refusal_fallback.content,
                },
              }),
            };
      },
      () => (sessionId?.signal?.aborted ? "cancelled" : "error"),
    );
  }
  async launchUltrareview(args, options) {
    return (
      await this.request({
        subtype: "ultrareview_launch",
        args,
        confirm: options?.confirm ?? false,
      })
    ).response;
  }
  async messageRated(options) {
    await this.request({
      subtype: "message_rated",
      messageUuid: options.messageUuid,
      sentiment: options.sentiment,
      surface: options.surface,
      cleared: options.cleared ?? false,
    });
  }
  processPendingPermissionRequests(requests) {
    for (let request of requests)
      if (request.request.subtype === "can_use_tool")
        this.handleControlRequest({
          ...request,
          request: {
            ...request.request,
            server_policy_ask_only: undefined,
          },
        }).catch(() => {});
  }
  processPendingUserDialogRequests(requests) {
    for (let request of requests)
      if (request.request.subtype === "request_user_dialog")
        this.handleControlRequest(request).catch(() => {});
  }
  request(request, options) {
    let signal = options?.signal;
    if (signal?.aborted) return Promise.reject(toError(signal.reason ?? "Control request aborted"));
    if (this.cleanupPerformed) return Promise.reject(closedBeforeResponseError());
    let requestId = Math.random().toString(36).substring(2, 15);
    this.transport.expectControlResponse?.(requestId);
    let controlRequest = {
      request_id: requestId,
      type: "control_request",
      request,
    };
    let isInitialize = request.subtype === "initialize";
    return new Promise((resolve, reject) => {
      let onAbortListener;
      let settled = false;
      let onAbort = (response) => {
        this.pendingControlResponses.delete(requestId);
        onAbortListener?.();
        resolve(response);
      };
      let onError = (error) => {
        this.pendingControlResponses.delete(requestId);
        onAbortListener?.();
        reject(error);
      };
      if (signal) {
        let abortHandler = () => {
          onError(toError(signal.reason ?? "Control request aborted"));
          if (!settled) return;
          try {
            Promise.resolve(
              this.transport.write(
                jsonStringify({
                  type: "control_cancel_request",
                  request_id: requestId,
                }) +
                  `
`,
              ),
            ).catch(() => {});
          } catch {}
        };
        signal.addEventListener("abort", abortHandler, {
          once: true,
        });
        onAbortListener = () => {
          signal.removeEventListener("abort", abortHandler);
        };
      }
      this.pendingControlResponses.set(requestId, {
        handler: (response) => {
          if (response.subtype === "success") onAbort(response);
          else
            onError(
              withTelemetryFacts(Error(response.error), {
                telemetryMessage: `Claude Code control request failed (${request.subtype})`,
                errorClass: "control_request_failed",
                errorCode:
                  typeof response.error_code === "string" && CALLBACK_ID_SUFFIX_RE.test(response.error_code)
                    ? response.error_code
                    : undefined,
              }),
            );
          if (
            !isInitialize &&
            (response.pending_permission_requests ||
              response.pending_user_dialog_requests ||
              response.pending_elicitation_requests)
          )
            logForDebugging(
              `[Query] Ignoring prompt-redelivery fields on non-initialize response (subtype=${request.subtype})`,
            );
          else {
            if (response.pending_permission_requests)
              this.processPendingPermissionRequests(response.pending_permission_requests);
            if (response.pending_user_dialog_requests)
              this.processPendingUserDialogRequests(response.pending_user_dialog_requests);
          }
        },
        reject: onError,
      });
      let stringified =
        jsonStringify(controlRequest) +
        `
`;
      let onAbort_2 = () => {
        if (signal?.aborted) return;
        settled = true;
        return this.transport.write(stringified);
      };
      try {
        (this.initializeHasBeenWritten || this.writingFirstInitialize
          ? Promise.resolve(onAbort_2())
          : this.initializeWritten.then(onAbort_2)
        ).catch(onError);
      } catch (error) {
        onError(error);
      }
    });
  }
  initializationResult() {
    return this.initialization;
  }
  writeAfterInitialize(message) {
    if (this.initializeHasBeenWritten) return Promise.resolve(this.transport.write(message));
    return this.initializeWritten.then(() => this.transport.write(message));
  }
  reinitialize() {
    return withFeatureTelemetry("sdk_reinitialize", () =>
      this.initialize({
        first: false,
      }),
    );
  }
  async supportedCommands() {
    let { commands } = await this.initialization;
    return this.latestCommands ?? commands;
  }
  async supportedModels() {
    return (await this.initialization).models;
  }
  async supportedAgents() {
    return (await this.initialization).agents;
  }
  async reconnectMcpServer(serverName) {
    await this.request({
      subtype: "mcp_reconnect",
      serverName,
    });
  }
  async toggleMcpServer(serverName, enabled) {
    return withFeatureTelemetry("sdk_mcp_toggle_server", async () => {
      await this.request({
        subtype: "mcp_toggle",
        serverName,
        enabled,
      });
    });
  }
  async readMcpResource(serverName, uri) {
    return (
      await this.request({
        subtype: "mcp_read_resource",
        serverName,
        uri,
      })
    ).response;
  }
  async enableChannel(serverName) {
    return withFeatureTelemetry("sdk_mcp_enable_channel", async () => {
      await this.request({
        subtype: "channel_enable",
        serverName,
      });
    });
  }
  async mcpAuthenticate(serverName, redirectUri) {
    return (
      await this.request({
        subtype: "mcp_authenticate",
        serverName,
        redirectUri,
      })
    ).response;
  }
  async mcpClearAuth(serverName) {
    return (
      await this.request({
        subtype: "mcp_clear_auth",
        serverName,
      })
    ).response;
  }
  async mcpSubmitOAuthCallbackUrl(serverName, callbackUrl) {
    return (
      await this.request({
        subtype: "mcp_oauth_callback_url",
        serverName,
        callbackUrl,
      })
    ).response;
  }
  async claudeAuthenticate(loginWithClaudeAi) {
    return (
      await this.request({
        subtype: "claude_authenticate",
        loginWithClaudeAi,
      })
    ).response;
  }
  async claudeOAuthCallback(authorizationCode, state) {
    return (
      await this.request({
        subtype: "claude_oauth_callback",
        authorizationCode,
        state,
      })
    ).response;
  }
  async claudeOAuthWaitForCompletion() {
    return (
      await this.request({
        subtype: "claude_oauth_wait_for_completion",
      })
    ).response;
  }
  async mcpServerStatus() {
    return (
      await this.request({
        subtype: "mcp_status",
      })
    ).response.mcpServers;
  }
  async getContextUsage(options) {
    return (
      await this.request({
        subtype: "get_context_usage",
        ...options,
      })
    ).response;
  }
  async usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET(options) {
    return (
      await this.request({
        subtype: "get_usage",
        ...(options?.skipBehaviors && {
          skip_behaviors: true,
        }),
      })
    ).response;
  }
  async getMemoryDialog() {
    return (
      await this.request({
        subtype: "get_memory_dialog",
      })
    ).response;
  }
  async getSkillsDialog() {
    return (
      await this.request({
        subtype: "get_skills_dialog",
      })
    ).response;
  }
  async getStatus() {
    return (
      await this.request({
        subtype: "get_status",
      })
    ).response;
  }
  async exportConversation() {
    return (
      await this.request({
        subtype: "export_conversation",
      })
    ).response;
  }
  async readCloudSessions(request, options) {
    return (await this.request(request, options)).response;
  }
  async getChromeDialog() {
    return (
      await this.request({
        subtype: "get_chrome_dialog",
      })
    ).response;
  }
  async getChromeBrowsers() {
    return (
      await this.request({
        subtype: "get_chrome_browsers",
      })
    ).response;
  }
  async selectChromeBrowser(deviceId) {
    return (
      await this.request({
        subtype: "select_chrome_browser",
        device_id: deviceId,
      })
    ).response;
  }
  async getSandboxDialog() {
    return (
      await this.request({
        subtype: "get_sandbox_dialog",
      })
    ).response;
  }
  async readFile(path, options) {
    try {
      return (
        await this.request({
          subtype: "read_file",
          path,
          max_bytes: options?.maxBytes,
          encoding: options?.encoding,
        })
      ).response;
    } catch {
      return null;
    }
  }
  async getPlan() {
    return (
      await this.request({
        subtype: "get_plan",
      })
    ).response;
  }
  async reloadPlugins(options) {
    return withFeatureTelemetry(
      "sdk_reload_plugins",
      async () =>
        (
          await this.request({
            subtype: "reload_plugins",
            ...(options?.holdOnCacheImpact && {
              hold_on_cache_impact: true,
            }),
            ...(options?.addPlugins &&
              options.addPlugins.length > 0 && {
                add_plugins: options.addPlugins,
              }),
          })
        ).response,
    );
  }
  async reloadSkills() {
    return withFeatureTelemetry(
      "sdk_reload_skills",
      async () =>
        (
          await this.request({
            subtype: "reload_skills",
          })
        ).response,
    );
  }
  async reloadOutputStyles() {
    return withFeatureTelemetry(
      "sdk_reload_output_styles",
      async () =>
        (
          await this.request({
            subtype: "reload_output_styles",
          })
        ).response,
    );
  }
  async setMcpServers(servers) {
    return withFeatureTelemetry("sdk_mcp_set_servers", async () => {
      let sdkServers = {};
      let capturedServers = {};
      for (let [key, value] of Object.entries(servers))
        if (value.type === "sdk" && "instance" in value) sdkServers[key] = value;
        else capturedServers[key] = value;
      let currentNames = new Set(this.sdkMcpServers.keys());
      let nextNames = new Set(Object.keys(sdkServers));
      for (let serverName of currentNames)
        if (!nextNames.has(serverName)) await this.disconnectSdkMcpServer(serverName);
      for (let [key, value] of Object.entries(sdkServers)) {
        let existing = this.sdkMcpServers.get(key);
        if (!existing) {
          this.connectSdkMcpServer(key, value);
          continue;
        }
        let { settings, ignored } = parseMcpServerSettings(value);
        logIgnoredMcpServerFields(key, value, ignored);
        if (
          settings.timeout !== existing.settings.timeout ||
          settings.disableAutoBackground !== existing.settings.disableAutoBackground ||
          settings.connectorId !== existing.settings.connectorId
        )
          logForDebugging(
            `[Query.setMcpServers] MCP server '${key}' is already registered, so the different timeout, disableAutoBackground or connectorId passed to setMcpServers is ignored; remove and re-add the server to change it`,
          );
        if (settings.tools !== undefined && !sameToolPolicies(settings.tools, existing.settings.tools)) {
          logForDebugging(
            settings.tools.length === 0
              ? `[Query.setMcpServers] MCP server '${key}': per-tool policy cleared`
              : `[Query.setMcpServers] MCP server '${key}': per-tool policy replaced (${settings.tools.length} ${settings.tools.length === 1 ? "entry" : "entries"})`,
          );
          existing.settings = {
            ...existing.settings,
            tools: settings.tools,
          };
        }
      }
      let manifest = {};
      for (let key of Object.keys(sdkServers))
        manifest[key] = {
          type: "sdk",
          name: key,
          ...this.sdkMcpServers.get(key)?.settings,
        };
      return (
        await this.request({
          subtype: "mcp_set_servers",
          servers: {
            ...capturedServers,
            ...manifest,
          },
        })
      ).response;
    });
  }
  async accountInfo() {
    return (await this.initialization).account;
  }
  async streamInput(input) {
    logForDebugging("[Query.streamInput] Starting to process input stream");
    try {
      if (!this.initializeHasBeenWritten) await this.initializeWritten;
      let messageCount = 0;
      for await (let message of input) {
        messageCount++;
        logForDebugging(`[Query.streamInput] Processing message ${messageCount}: ${message.type}`);
        if (this.abortController?.signal.aborted) break;
        this.runEnded = false;
        this.resultReceived = false;
        this.clearRunEndCeiling();
        await Promise.resolve(
          this.transport.write(
            jsonStringify(
              this.verbatimPrompts
                ? {
                    ...message,
                    client_composed: true,
                  }
                : message,
            ) +
              `
`,
          ),
        );
      }
      logForDebugging(`[Query.streamInput] Finished processing ${messageCount} messages from input stream`);
      if (messageCount > 0 && this.hasBidirectionalNeeds()) {
        logForDebugging("[Query.streamInput] Has bidirectional needs, waiting for the run to end");
        await this.waitForRunEnd();
      }
      logForDebugging("[Query] Calling transport.endInput() to close stdin to CLI process");
      this.transport.endInput();
    } catch (error) {
      if (!(error instanceof HookConfigError)) throw error;
    }
  }
  endRun() {
    if (this.runEnded) return;
    this.runEnded = true;
    this.clearRunEndCeiling();
    this.runEndedResolve?.();
    if (this.isSingleUserTurn) {
      logForDebugging("[Query.readMessages] Run ended for single-turn query, closing stdin");
      this.transport.endInput();
    }
  }
  armRunEndCeiling() {
    this.clearRunEndCeiling();
    if (this.runEnded || this.cleanupPerformed || this.runEndCeilingMs <= 0) return;
    this.runEndCeilingTimer = setTimeout(
      () => {
        logForDebugging(
          `[Query.readMessages] No 'idle' ${this.runEndCeilingMs}ms after the last result, ending the run`,
        );
        this.endRun();
      },
      Math.min(this.runEndCeilingMs, MAX_TIMER_DELAY_MS),
    );
    this.runEndCeilingTimer.unref?.();
  }
  clearRunEndCeiling() {
    clearTimeout(this.runEndCeilingTimer);
    this.runEndCeilingTimer = undefined;
  }
  waitForRunEnd() {
    if (this.runEnded) {
      logForDebugging("[Query.waitForRunEnd] Run already ended, returning immediately");
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let signal = this.abortController?.signal;
      if (this.cleanupPerformed || signal?.aborted) {
        resolve();
        return;
      }
      let onAbort = () => resolve();
      signal?.addEventListener("abort", onAbort, {
        once: true,
      });
      this.addCleanupCallback(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      });
      this.runEndedResolve = () => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      };
    });
  }
  handleHookCallbacks(callbackId, input, outputOptions, signal) {
    let callback = this.hookCallbacks.get(callbackId);
    if (!callback) throw Error(`No hook callback found for ID: ${callbackId}`);
    return callback(input, outputOptions, {
      signal,
    });
  }
  connectSdkMcpServer(serverName, serverConfig) {
    let transport = new SdkControlServerTransport((message) =>
      this.sendMcpServerMessageToCli(serverName, message),
    );
    let connection = serverConfig.instance.connect(transport).catch((error) => {
      if (this.sdkMcpServers.get(serverName)?.transport === transport) this.sdkMcpServers.delete(serverName);
      logForDebugging(`[Query.connectSdkMcpServer] Failed to connect MCP server '${serverName}': ${error}`, {
        level: "error",
      });
    });
    let { settings, ignored } = parseMcpServerSettings(serverConfig);
    logIgnoredMcpServerFields(serverName, serverConfig, ignored);
    this.sdkMcpServers.set(serverName, {
      transport,
      settings,
      connection,
    });
  }
  async disconnectSdkMcpServer(serverName) {
    let serverConfig = this.sdkMcpServers.get(serverName);
    if (serverConfig) {
      let prefix = `${serverName}:${SDK_MANIFEST_CAPTURE}`;
      for (let [key, pending] of this.pendingMcpResponses)
        if (key.startsWith(prefix)) {
          this.pendingMcpResponses.delete(key);
          pending.reject(Error("MCP server was removed during the manifest capture"));
        }
      await serverConfig.transport.close();
      if (this.sdkMcpServers.get(serverName) === serverConfig) this.sdkMcpServers.delete(serverName);
    }
  }
  sendMcpServerMessageToCli(serverName, message) {
    if ("id" in message && message.id !== null && message.id !== undefined) {
      let key = `${serverName}:${message.id}`;
      let pending = this.pendingMcpResponses.get(key);
      if (pending) {
        pending.resolve(message);
        this.pendingMcpResponses.delete(key);
        return;
      }
      if (typeof message.id === "string" && message.id.startsWith(SDK_MANIFEST_CAPTURE)) {
        logForDebugging(
          `[Query.sendMcpServerMessageToCli] Dropping late manifest-capture reply from '${serverName}' (${message.id})`,
        );
        return;
      }
    }
    let controlRequest = {
      type: "control_request",
      request_id: randomUUID(),
      request: {
        subtype: "mcp_message",
        server_name: serverName,
        message,
      },
    };
    if (!this.initializeHasBeenWritten && isToolListChangedNotification(message))
      this.sdkMcpToolsChangedDuringCapture.add(serverName);
    this.writeAfterInitialize(
      jsonStringify(controlRequest) +
        `
`,
    ).catch((error) => {
      logForDebugging(`[Query.sendMcpServerMessageToCli] Transport write failed: ${error}`, {
        level: "error",
      });
    });
  }
  handleMcpControlRequest(serverName, server, replyTo) {
    let id = "id" in server.message ? server.message.id : null;
    let key = `${serverName}:${id}`;
    return new Promise((resolve, reject) => {
      let cleanup = () => {
        this.pendingMcpResponses.delete(key);
      };
      let resolve_2 = (message) => {
        cleanup();
        resolve(message);
      };
      let reject_2 = (message) => {
        cleanup();
        reject(message);
      };
      this.pendingMcpResponses.set(key, {
        resolve: resolve_2,
        reject: reject_2,
      });
      if (replyTo.onmessage) replyTo.onmessage(server.message);
      else {
        cleanup();
        reject(Error("No message handler registered"));
        return;
      }
    });
  }
}
//@ chunk-y805ph4h.js:62908-62976 placement
function closedBeforeResponseError() {
  return Error("Query closed before response received");
}
//@ chunk-y805ph4h.js:62976-63008 placement
var CALLBACK_ID_SUFFIX_RE = /^[a-z][a-z0-9_]{0,63}$/;
//@ chunk-y805ph4h.js:63008-63137 placement
function sharesCallbackSuffix(sessionId, otherId) {
  if (sessionId === otherId) return true;
  let sliced = sessionId.slice(sessionId.lastIndexOf("_") + 1);
  let sliced_2 = otherId.slice(otherId.lastIndexOf("_") + 1);
  return sliced.length >= 4 && sliced === sliced_2;
}
export { Query };
