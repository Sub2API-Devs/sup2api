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
import { le, SDK_MANIFEST_CAPTURE, Ft, Nt } from "./transport.js";
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
import { T_t, A_t } from "../../../src/services/mcp/client.js";
import {
  logFeatureSad,
  logFeatureOk,
  withFeatureTelemetry,
} from "../../../src/services/analytics/featureTelemetry.js";
import { sr } from "./index.js";
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
  reportMirrorError(e, error) {
    let r = {
      type: "system",
      subtype: "mirror_error",
      error,
      key: e,
      uuid: randomUUID(),
      session_id: e.sessionId,
    };
    this.inputStream.enqueue(r);
  }
  addCleanupCallback(e) {
    if (this.cleanupPerformed) e();
    else this.cleanupCallbacks.push(e);
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
    m = new Map(),
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
    for (let [E, P] of m) this.connectSdkMcpServer(E, P);
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
  setError(e) {
    this.inputStream.error(e);
  }
  setFrameObserver(frameObserver) {
    this.frameObserver = frameObserver;
  }
  dropUnreadHookProgress(e) {
    this.inputStream.dropNewestQueued(
      (s) => s.type === "system" && s.subtype === "hook_progress" && s.hook_id === e,
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
  cleanup(e) {
    this.clearRunEndCeiling();
    if (this.cleanupPromise) return this.cleanupPromise;
    this.cleanupPerformed = true;
    this.cleanupCause = e;
    this.stopSdkMcpManifestCapture?.();
    this.cleanupPromise = this.performCleanup(e);
    return this.cleanupPromise;
  }
  async performCleanup(e) {
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
      let s = e ?? st();
      for (let { reject } of this.pendingControlResponses.values()) reject(s);
      this.pendingControlResponses.clear();
      this.unmatchedControlResponses.clear();
      for (let { reject } of this.pendingMcpResponses.values()) reject(s);
      this.pendingMcpResponses.clear();
      this.hookCallbacks.clear();
      for (let { transport } of this.sdkMcpServers.values()) transport.close().catch(() => {});
      this.sdkMcpServers.clear();
      if (e) this.inputStream.error(e);
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
  next(...[e]) {
    return this.sdkMessages.next(...[e]);
  }
  async return(e) {
    await this.cleanup();
    return this.sdkMessages.return(e);
  }
  async throw(e) {
    await this.cleanup();
    return this.sdkMessages.throw(e);
  }
  [Symbol.asyncIterator]() {
    return this.sdkMessages;
  }
  async [Symbol.asyncDispose]() {
    await this.cleanup();
  }
  async readMessages() {
    try {
      for await (let e of this.transport.readMessages()) {
        if (e.type === "control_response") {
          let s = this.pendingControlResponses.get(e.response.request_id);
          if (s) s.handler(e.response);
          else {
            if (this.unmatchedControlResponses.size >= Query.UNMATCHED_CONTROL_RESPONSES_MAX) {
              let r = this.unmatchedControlResponses.keys().next().value;
              if (r !== undefined) this.unmatchedControlResponses.delete(r);
            }
            this.unmatchedControlResponses.set(e.response.request_id, e.response);
          }
          continue;
        } else if (e.type === "control_request") {
          this.handleControlRequest(e);
          continue;
        } else if (e.type === "control_cancel_request") {
          this.handleControlCancelRequest(e);
          continue;
        } else if (e.type === "keep_alive") {
          if (STARTUP_MARK in e) {
            let s = e[STARTUP_MARK];
            if (typeof s === "string" && s.length <= MAX_MARK_NAME_CHARS)
              this.startupMark = {
                mark: s,
                atMs: Date.now(),
              };
          }
          continue;
        } else if (e.type === "transcript_mirror") {
          this.transcriptMirrorBatcher?.enqueue(e.filePath, e.entries);
          continue;
        }
        if (e.type === "system" && e.subtype === "commands_changed" && Array.isArray(e.commands))
          this.latestCommands = e.commands;
        if (
          e.type === "system" &&
          (e.subtype === "post_turn_summary" ||
            e.subtype === "task_summary" ||
            e.subtype === "session_metadata")
        ) {
          this.inputStream.enqueue(e);
          continue;
        }
        if (e.type === "active_goal") {
          this.inputStream.enqueue(e);
          continue;
        }
        if (e.type === "autocompact_state") {
          this.inputStream.enqueue(e);
          continue;
        }
        if (e.type === "result") {
          if (this.transcriptMirrorBatcher) await this.transcriptMirrorBatcher.flush();
          let s = e.is_error
            ? e.subtype === "success"
              ? e.result
              : e.errors
                  .map((error) => error.trim())
                  .filter(Boolean)
                  .join("; ")
            : undefined;
          this.lastErrorResultText = s || undefined;
          this.lastStartupFailureReason =
            e.is_error && "startup_failure_reason" in e && typeof e.startup_failure_reason === "string"
              ? e.startup_failure_reason
              : undefined;
          this.modelLessTurnEnded =
            e.subtype === "success" && !e.is_error && e.num_turns === 0 && e.result === "";
          if (!this.modelLessTurnEnded) this.errorTextBeforeModelLessTurns = this.lastErrorResultText;
          this.resultReceived = true;
          if (
            this.sessionState === undefined ||
            this.sessionState === "idle" ||
            !this.hasBidirectionalNeeds()
          )
            this.endRun();
          else this.armRunEndCeiling();
        } else if (e.type === "system" && e.subtype === "session_state_changed") {
          this.sessionState = e.state;
          if (e.state === "idle") {
            if (this.resultReceived) this.endRun();
          } else if (!(this.isSingleUserTurn && this.runEnded)) {
            this.runEnded = false;
            if (e.state === "requires_action") this.clearRunEndCeiling();
            else if (this.resultReceived) this.armRunEndCeiling();
          }
          if ("sdk_host_only" in e && e.sdk_host_only === true) continue;
        } else {
          this.lastErrorResultText = undefined;
          this.lastStartupFailureReason = undefined;
          if (e.type === "system" && e.subtype === "init") this.modelLessTurnEnded = false;
          else if (e.type !== "system" || e.subtype === "compact_boundary") {
            this.errorTextBeforeModelLessTurns = undefined;
            this.modelLessTurnEnded = false;
          }
          if (
            (e.type === "assistant" || e.type === "stream_event") &&
            e.parent_tool_use_id === null &&
            !(this.isSingleUserTurn && this.runEnded)
          ) {
            this.runEnded = false;
            this.clearRunEndCeiling();
          }
        }
        try {
          this.frameObserver?.(e);
        } catch (error) {
          logForDebugging(`[Query.readMessages] The frame observer threw: ${errorMessage(error)}`, {
            level: "error",
          });
        }
        this.inputStream.enqueue(e);
      }
      if (this.transcriptMirrorBatcher) await this.transcriptMirrorBatcher.flush();
      this.inputStream.done();
      this.cleanup();
    } catch (error) {
      if (this.transcriptMirrorBatcher) await this.transcriptMirrorBatcher.flush();
      let s =
        this.lastErrorResultText ??
        (this.modelLessTurnEnded ? this.errorTextBeforeModelLessTurns : undefined);
      if (s !== undefined && !(error instanceof HookConfigError) && error?.name !== "SSEHttpError") {
        let r = withTelemetryFacts(Error(`Claude Code returned an error result: ${s}`), {
          telemetryMessage: "Claude Code returned an error result",
          errorClass: "error_result",
          startupFailureReason: this.lastStartupFailureReason,
        });
        logForDebugging(
          `[Query.readMessages] Replacing exit error with result text. Original: ${errorMessage(error)}`,
        );
        this.inputStream.error(r);
        this.cleanup(r);
        return;
      }
      this.inputStream.error(error);
      this.cleanup(error);
    }
  }
  async handleControlRequest(e) {
    if (this.cleanupPerformed) {
      logForDebugging(
        `[Query.handleControlRequest] Request ${e.request_id} (${e.request.subtype}) arrived after close \u2014 skipping`,
      );
      return;
    }
    if (this.cancelControllers.has(e.request_id)) {
      logForDebugging(
        `[Query.handleControlRequest] Duplicate delivery of in-flight request ${e.request_id} (${e.request.subtype}) \u2014 skipping`,
      );
      return;
    }
    let abortController = new AbortController();
    this.cancelControllers.set(e.request_id, abortController);
    try {
      let r;
      try {
        let n = await this.processControlRequest(e, abortController.signal);
        if (this.cleanupPerformed) return;
        if (n === le) return;
        let i = {
          type: "control_response",
          response: {
            subtype: "success",
            request_id: e.request_id,
            response: n,
          },
        };
        r =
          jsonStringify(i) +
          `
`;
      } catch (error) {
        if (this.cleanupPerformed) return;
        let i = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: e.request_id,
            error: errorMessage(error),
          },
        };
        r =
          jsonStringify(i) +
          `
`;
      }
      try {
        await Promise.resolve(this.transport.write(r));
      } catch (error) {
        logForDebugging(`[Query.handleControlRequest] Response write failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    } finally {
      if (this.cancelControllers.get(e.request_id) === abortController)
        this.cancelControllers.delete(e.request_id);
    }
  }
  handleControlCancelRequest(e) {
    let s = this.cancelControllers.get(e.request_id);
    if (s) {
      s.abort();
      this.cancelControllers.delete(e.request_id);
    }
  }
  async processControlRequest(e, s) {
    if (REMOTE_TOOLS_LOG_EVENTS.some((r) => r === e.request.subtype)) {
      logForDebugging(
        `[Query.processControlRequest] ${e.request.subtype} ${e.request_id} is for the machine serving this session's tools \u2014 leaving it unanswered`,
      );
      return le;
    }
    if (e.request.subtype === "can_use_tool") {
      if (!this.canUseTool) throw Error("canUseTool callback is not provided.");
      let computerFolder = e.request.computer_folder;
      let n = await this.canUseTool(e.request.tool_name, e.request.input, {
        signal: s,
        suggestions: e.request.permission_suggestions,
        blockedPath: e.request.blocked_path,
        ...(e.request.mcp_server && {
          mcpServer: {
            name: e.request.mcp_server.name,
            source: e.request.mcp_server.source,
          },
        }),
        decisionReason: e.request.decision_reason,
        ...(typeof e.request.decision_reason_type === "string" && {
          decisionReasonType: e.request.decision_reason_type,
        }),
        ...(typeof e.request.decision_reason_code === "string" && {
          decisionReasonCode: e.request.decision_reason_code,
        }),
        ...(typeof e.request.server_policy_ask_only === "boolean" && {
          serverPolicyAskOnly: e.request.server_policy_ask_only,
        }),
        title: e.request.title,
        displayName: e.request.display_name,
        description: e.request.description,
        defaultToNo: e.request.default_to_no,
        suppressAlwaysAllowRule: e.request.suppress_always_allow_rule,
        toolUseID: e.request.tool_use_id,
        agentID: e.request.agent_id,
        ...(typeof e.request.plugin === "string" && {
          plugin: e.request.plugin,
        }),
        requestId: e.request_id,
        ...(typeof e.request.requires_user_interaction === "boolean" && {
          requiresUserInteraction: e.request.requires_user_interaction,
        }),
        ...(typeof e.request.server_prompt === "string" && {
          serverPrompt: e.request.server_prompt,
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
        ...(e.request.matched_ask_rule && {
          matchedAskRule: {
            source: e.request.matched_ask_rule.source,
            toolName: e.request.matched_ask_rule.tool_name,
            ...(e.request.matched_ask_rule.rule_content !== undefined && {
              ruleContent: e.request.matched_ask_rule.rule_content,
            }),
          },
        }),
      });
      if (n === null) return le;
      return {
        ...n,
        toolUseID: e.request.tool_use_id,
      };
    } else if (e.request.subtype === "hook_callback")
      return await this.handleHookCallbacks(e.request.callback_id, e.request.input, e.request.tool_use_id, s);
    else if (e.request.subtype === "mcp_message") {
      let request = e.request;
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
    } else if (e.request.subtype === "elicitation") {
      let request = e.request;
      if (this.onElicitation) {
        let n = await this.onElicitation(
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
            signal: s,
            requestId: e.request_id,
          },
        );
        if (n === null) return le;
        return n;
      }
      return {
        action: "decline",
      };
    } else if (e.request.subtype === "request_user_dialog") {
      if (this.onUserDialog) {
        let r = await this.onUserDialog(
          {
            dialogKind: e.request.dialog_kind,
            payload: e.request.payload,
            toolUseID: e.request.tool_use_id,
          },
          {
            signal: s,
            requestId: e.request_id,
          },
        );
        if (r === null) return le;
        return r;
      }
      logForDebugging(
        `[Query] No onUserDialog handler for request_user_dialog (kind=${e.request.dialog_kind}) \u2014 staying silent so a capable client (or the worker's park deadline) settles it`,
      );
      logEvent("tengu_request_user_dialog_response_ignored", {
        shape: fromEnum("auto_cancel"),
      });
      return le;
    } else if (e.request.subtype === "oauth_token_refresh") {
      if (!this.getOAuthToken) throw Error("getOAuthToken callback is not provided.");
      let r;
      let n =
        (await this.getOAuthToken({
          signal: s,
          onDecline: (i) => {
            if (isLauncherEndReason(i)) r = i;
          },
          ...(e.request.kind !== undefined && {
            kind: e.request.kind,
          }),
        })) ?? null;
      return n === null && r !== undefined
        ? {
            accessToken: n,
            reason: r,
          }
        : {
            accessToken: n,
          };
    } else if (e.request.subtype === "host_auth_token_refresh") {
      if (!this.getHostAuthToken) throw Error("getHostAuthToken callback is not provided.");
      let r =
        (await this.getHostAuthToken({
          signal: s,
        })) ?? null;
      return typeof r === "string" || r === null
        ? {
            authToken: r,
          }
        : r;
    } else if (e.request.subtype === "remote_control_work_secret") {
      let workSecretAnswerer = this.workSecretAnswerer;
      if (!workSecretAnswerer) throw Error("refreshWorkSecret callback is not provided.");
      if (!Kt(workSecretAnswerer.sessionId, e.request.session_id))
        throw Error("remote_control_work_secret names a session this host did not attach.");
      return {
        work_secret:
          (await workSecretAnswerer.refresh(workSecretAnswerer.sessionId, {
            signal: s,
          })) || null,
      };
    }
    if (e.request.subtype === "ui_copy" && this.uiHost?.copy) {
      let { subtype, ...n } = e.request;
      return this.uiHost.copy(n, {
        signal: s,
      });
    }
    if (e.request.subtype === "ui_prompt_read" && this.uiHost?.promptRead) {
      let { subtype, ...n } = e.request;
      return this.uiHost.promptRead(n, {
        signal: s,
      });
    }
    if (e.request.subtype === "ui_prompt_fill" && this.uiHost?.promptFill) {
      let { subtype, ...n } = e.request;
      return this.uiHost.promptFill(n, {
        signal: s,
      });
    }
    if (e.request.subtype === "ui_prompt_paint" && this.uiHost?.promptPaint) {
      let { subtype, ...n } = e.request;
      return this.uiHost.promptPaint(n, {
        signal: s,
      });
    }
    if (e.request.subtype === "ui_prompt_suggest" && this.uiHost?.promptSuggest) {
      let { subtype, ...n } = e.request;
      return this.uiHost.promptSuggest(n, {
        signal: s,
      });
    }
    if (e.request.subtype === "ui_read_selection" && this.uiHost?.readSelection) {
      let { subtype, ...n } = e.request;
      return this.uiHost.readSelection(n, {
        signal: s,
      });
    }
    throw Error("Unsupported control request subtype: " + e.request.subtype);
  }
  async *readSdkMessages() {
    try {
      for await (let e of this.inputStream) {
        this.transport.markDelivered?.(e);
        yield e;
      }
    } finally {
      await this.cleanup();
    }
  }
  async initialize(
    { first: e } = {
      first: false,
    },
  ) {
    if (!e && !this.initializeHasBeenWritten) await this.initializeWritten;
    let s;
    let r;
    try {
      if (e && this.initConfig?.captureSdkMcpManifests === true && this.sdkMcpServers.size > 0) {
        s = await this.captureSdkMcpServerManifests();
        for (let l of this.sdkMcpToolsChangedDuringCapture) {
          let h = s !== undefined && Object.hasOwn(s, l) ? s[l] : undefined;
          if (h?.toolsListResult !== undefined)
            s[l] = {
              initializeResult: h.initializeResult,
            };
        }
      }
      this.sdkMcpToolsChangedDuringCapture.clear();
      let initializeRequest = this.buildInitializeRequest(s);
      if (this.cleanupPerformed) throw this.cleanupCause ?? Error("Query closed before initialize was sent");
      this.writingFirstInitialize = e;
      try {
        r = this.request(initializeRequest);
      } finally {
        this.writingFirstInitialize = false;
      }
    } finally {
      if (e) this.markInitializeWritten();
    }
    let response = (await r).response;
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
          this.initHooksPayload[key] = value.map((h) => {
            let S = [];
            for (let hook of h.hooks) {
              let w = `hook_${this.nextCallbackId++}`;
              this.hookCallbacks.set(w, hook);
              S.push(w);
            }
            return {
              matcher: h.matcher,
              hookCallbackIds: S,
              timeout: h.timeout,
            };
          });
    }
    let sdkMcpServers = this.sdkMcpServers.size > 0 ? Array.from(this.sdkMcpServers.keys()) : undefined;
    let flattened = Array.from(this.sdkMcpServers).flatMap(([m, { settings: l }]) =>
      Object.keys(l).length > 0 ? [[m, l]] : [],
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
    let s = new Map();
    let r = false;
    let n = async (b, R) => {
      try {
        await this.sdkMcpServers.get(b)?.connection;
        if (r) return;
        let T = await this.handleMcpControlRequest(
          b,
          {
            server_name: b,
            message: {
              jsonrpc: "2.0",
              id: SDK_MANIFEST_CAPTURE + "initialize",
              method: "initialize",
              params: {
                protocolVersion: MCP_PROTOCOL_LATEST,
                capabilities: T_t,
                clientInfo: {
                  ...A_t,
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
          R,
        );
        if (r) return;
        if (!("result" in T)) {
          logForDebugging(
            `[Query.captureSdkMcpServerManifests] '${b}' answered initialize with an error; leaving it to the CLI: ${jsonStringify(T)}`,
            {
              level: "warn",
            },
          );
          return;
        }
        let E = T.result;
        R.onmessage?.({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        });
        let capabilities = E.capabilities;
        let D =
          typeof capabilities === "object" &&
          capabilities !== null &&
          "tools" in capabilities &&
          capabilities.tools !== undefined &&
          capabilities.tools !== null;
        let F;
        if (D) {
          let G = await this.handleMcpControlRequest(
            b,
            {
              server_name: b,
              message: {
                jsonrpc: "2.0",
                id: SDK_MANIFEST_CAPTURE + "tools-list",
                method: "tools/list",
              },
            },
            R,
          );
          if (r) return;
          if (!("result" in G)) {
            logForDebugging(
              `[Query.captureSdkMcpServerManifests] '${b}' answered tools/list with an error; leaving it to the CLI: ${jsonStringify(G)}`,
              {
                level: "warn",
              },
            );
            return;
          }
          if (G.result.nextCursor === undefined) F = G.result;
        }
        let manifest = jsonParse(
          jsonStringify(
            F === undefined
              ? {
                  initializeResult: E,
                }
              : {
                  initializeResult: E,
                  toolsListResult: F,
                },
          ),
        );
        s.set(b, {
          transport: R,
          manifest,
        });
      } catch (error) {
        if (!r)
          logForDebugging(
            `[Query.captureSdkMcpServerManifests] '${b}': ${error}; the CLI will handshake it over the control channel`,
            {
              level: "warn",
            },
          );
      }
    };
    let list = Array.from(this.sdkMcpServers, ([b, { transport: R }]) => n(b, R));
    let m = Promise.all(list).then(() => "settled");
    let promise = new Promise((resolve) => {
      this.stopSdkMcpManifestCapture = () => resolve("closed");
    });
    let h = await withDeadline(Promise.race([m, promise]), Ft);
    r = true;
    this.stopSdkMcpManifestCapture = undefined;
    let rounded = Math.round(performance.now() - startTime);
    let y = {
      servers: list.length,
      captured: s.size,
      elapsed_ms: rounded,
    };
    if (h === "closed") {
      logFeatureSad("sdk_mcp_manifest_capture", "closed", y);
      return;
    }
    if (h === undefined) {
      logForDebugging(
        `[Query.captureSdkMcpServerManifests] ${s.size}/${list.length} in-process MCP servers captured within ${Ft} ms; the rest will handshake over the control channel`,
        {
          level: "warn",
        },
      );
      logFeatureSad("sdk_mcp_manifest_capture", "deadline", y);
    } else if (s.size < list.length) logFeatureSad("sdk_mcp_manifest_capture", "partial", y);
    else logFeatureOk("sdk_mcp_manifest_capture", y);
    if (s.size === 0) return;
    let w = Object.fromEntries(
      Array.from(this.sdkMcpServers).flatMap(([b, R]) => {
        let T = s.get(b);
        return T !== undefined && T.transport === R.transport ? [[b, T.manifest]] : [];
      }),
    );
    if (Object.keys(w).length === 0) return;
    logForDebugging(
      `[Query.captureSdkMcpServerManifests] manifests for [${Object.keys(w).join(", ")}] captured in ${rounded} ms`,
    );
    return w;
  }
  async interrupt(e) {
    return withFeatureTelemetry("sdk_interrupt", async () => {
      let s = await this.request({
        subtype: "interrupt",
        ...(e?.cancelQueued === true && {
          cancel_queued: true,
        }),
      });
      let stillQueued = s.response?.still_queued;
      if (!Array.isArray(stillQueued)) return;
      let cancelled = s.response?.cancelled;
      return {
        still_queued: stillQueued.filter((i) => typeof i === "string"),
        ...(Array.isArray(cancelled) && {
          cancelled: cancelled.filter((i) => typeof i === "string"),
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
  async setChromeBrowserHints(e) {
    await this.request({
      subtype: "set_chrome_browser_hints",
      ...e,
    });
  }
  async setPromptSuggestionsPaused(paused) {
    await this.request({
      subtype: "set_prompt_suggestions_paused",
      paused,
    });
  }
  awaitControlResponse(e) {
    this.transport.expectControlResponse?.(e);
    return new Promise((resolve, reject) => {
      let n = (m) => {
        if (m.subtype === "success") {
          let {
            pending_permission_requests: pendingPermissionRequests,
            pending_user_dialog_requests: pendingUserDialogRequests,
            pending_elicitation_requests: pendingElicitationRequests,
            ...y
          } = m;
          resolve(y);
        } else
          reject(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              m.error,
              "awaitControlResponse: CLI error verdict",
            ),
          );
        if (m.pending_permission_requests || m.pending_user_dialog_requests || m.pending_elicitation_requests)
          logForDebugging("[Query] Ignoring prompt-redelivery fields on awaitControlResponse response");
      };
      if (this.cleanupPerformed) {
        reject(st());
        return;
      }
      let i = this.unmatchedControlResponses.get(e);
      if (i) {
        this.unmatchedControlResponses.delete(e);
        n(i);
        return;
      }
      this.pendingControlResponses.set(e, {
        handler: (m) => {
          this.pendingControlResponses.delete(e);
          n(m);
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
  async rewindFiles(userMessageId, s) {
    return withFeatureTelemetry(
      "sdk_rewind_files",
      async () =>
        (
          await this.request({
            subtype: "rewind_files",
            user_message_id: userMessageId,
            dry_run: s?.dryRun,
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
  async setCwd(path, s) {
    return withFeatureTelemetry(
      "sdk_set_cwd",
      async () =>
        (
          await this.request({
            subtype: "set_cwd",
            path,
            ...(s?.trustAccepted !== undefined && {
              trust_accepted: s.trustAccepted,
            }),
            ...(s?.trustedDirectory !== undefined && {
              trusted_directory: s.trustedDirectory,
            }),
          })
        ).response,
    );
  }
  async claimSession(e) {
    let s = withFeatureTelemetry(
      "sdk_claim_session",
      async () =>
        (
          await this.request({
            subtype: "claim_session",
            ...e,
            include_initialize: e.include_initialize ?? true,
          })
        ).response,
    );
    let initialization = this.initialization;
    this.initialization = s.then(
      async (n) => {
        if (n?.initialize === undefined) return initialization;
        let initialize = n.initialize;
        let m = await initialization.then(
          (y) => ({
            hooks_applied: y.hooks_applied,
            plugins_applied: y.plugins_applied,
            code_running_mcp_tools_applied: y.code_running_mcp_tools_applied,
          }),
          () => ({
            hooks_applied: undefined,
            plugins_applied: undefined,
            code_running_mcp_tools_applied: undefined,
          }),
        );
        let hooksApplied = initialize.hooks_applied ?? m.hooks_applied;
        let pluginsApplied = initialize.plugins_applied ?? m.plugins_applied;
        let codeRunningMcpToolsApplied =
          initialize.code_running_mcp_tools_applied ?? m.code_running_mcp_tools_applied;
        return {
          ...initialize,
          ...(hooksApplied !== undefined && {
            hooks_applied: hooksApplied,
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
    return s;
  }
  async enableRemoteControl(e, s, r) {
    let n = ++this.remoteControlCallGeneration;
    let workSecretAnswerer = this.workSecretAnswerer;
    let m = r?.reattachSessionId || (r?.workSecret === undefined ? undefined : sr(r.workSecret));
    let l =
      e && r?.workSecret !== undefined && r.refreshWorkSecret && m !== undefined
        ? {
            sessionId: m,
            refresh: r.refreshWorkSecret,
          }
        : undefined;
    this.workSecretAnswerer = l;
    let h;
    try {
      h = (
        await this.request({
          subtype: "remote_control",
          enabled: e,
          ...(s !== undefined && {
            name: s,
          }),
          reattach_session_id: r?.reattachSessionId,
          keep_session_on_exit: r?.keepSessionOnExit,
          work_secret: r?.workSecret,
        })
      ).response;
    } catch (error) {
      if (n === this.remoteControlCallGeneration) this.workSecretAnswerer = undefined;
      throw error;
    }
    if (e && n === this.remoteControlCallGeneration) {
      let bridgeSessionId = h.bridge_session_id;
      let y = [l, workSecretAnswerer];
      this.workSecretAnswerer =
        typeof bridgeSessionId === "string"
          ? y.find((w) => w !== undefined && Kt(w.sessionId, bridgeSessionId))
          : undefined;
    }
    return h;
  }
  async submitFeedback(description, s) {
    return (
      await this.request({
        subtype: "submit_feedback",
        description,
        surface: s?.surface,
        draft_id: s?.draft_id,
        type: s?.type,
        title: s?.title,
        area: s?.area,
        attach_transcript: s?.attach_transcript,
        save_locally: s?.save_locally,
      })
    ).response;
  }
  async submitSurveyFeedback(e) {
    return (
      await this.request({
        subtype: "submit_survey_feedback",
        ...e,
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
  async generateSessionTitle(description, s) {
    return withFeatureTelemetry(
      "sdk_session_title_generate",
      async () =>
        (
          await this.request({
            subtype: "generate_session_title",
            description,
            persist: s?.persist,
          })
        ).response.title,
    );
  }
  async askSideQuestion(question, s) {
    return withFeatureTelemetry(
      "sdk_side_question",
      async () => {
        let response = (
          await this.request(
            {
              subtype: "side_question",
              question,
              ...(s?.history?.length && {
                history: [...s.history],
              }),
            },
            s,
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
      () => (s?.signal?.aborted ? "cancelled" : "error"),
    );
  }
  async launchUltrareview(args, s) {
    return (
      await this.request({
        subtype: "ultrareview_launch",
        args,
        confirm: s?.confirm ?? false,
      })
    ).response;
  }
  async messageRated(e) {
    await this.request({
      subtype: "message_rated",
      messageUuid: e.messageUuid,
      sentiment: e.sentiment,
      surface: e.surface,
      cleared: e.cleared ?? false,
    });
  }
  processPendingPermissionRequests(e) {
    for (let s of e)
      if (s.request.subtype === "can_use_tool")
        this.handleControlRequest({
          ...s,
          request: {
            ...s.request,
            server_policy_ask_only: undefined,
          },
        }).catch(() => {});
  }
  processPendingUserDialogRequests(e) {
    for (let s of e)
      if (s.request.subtype === "request_user_dialog") this.handleControlRequest(s).catch(() => {});
  }
  request(e, s) {
    let signal = s?.signal;
    if (signal?.aborted) return Promise.reject(toError(signal.reason ?? "Control request aborted"));
    if (this.cleanupPerformed) return Promise.reject(st());
    let n = Math.random().toString(36).substring(2, 15);
    this.transport.expectControlResponse?.(n);
    let i = {
      request_id: n,
      type: "control_request",
      request: e,
    };
    let m = e.subtype === "initialize";
    return new Promise((resolve, reject) => {
      let S;
      let y = false;
      let w = (E) => {
        this.pendingControlResponses.delete(n);
        S?.();
        resolve(E);
      };
      let b = (error) => {
        this.pendingControlResponses.delete(n);
        S?.();
        reject(error);
      };
      if (signal) {
        let E = () => {
          b(toError(signal.reason ?? "Control request aborted"));
          if (!y) return;
          try {
            Promise.resolve(
              this.transport.write(
                jsonStringify({
                  type: "control_cancel_request",
                  request_id: n,
                }) +
                  `
`,
              ),
            ).catch(() => {});
          } catch {}
        };
        signal.addEventListener("abort", E, {
          once: true,
        });
        S = () => {
          signal.removeEventListener("abort", E);
        };
      }
      this.pendingControlResponses.set(n, {
        handler: (E) => {
          if (E.subtype === "success") w(E);
          else
            b(
              withTelemetryFacts(Error(E.error), {
                telemetryMessage: `Claude Code control request failed (${e.subtype})`,
                errorClass: "control_request_failed",
                errorCode:
                  typeof E.error_code === "string" && tr.test(E.error_code) ? E.error_code : undefined,
              }),
            );
          if (
            !m &&
            (E.pending_permission_requests ||
              E.pending_user_dialog_requests ||
              E.pending_elicitation_requests)
          )
            logForDebugging(
              `[Query] Ignoring prompt-redelivery fields on non-initialize response (subtype=${e.subtype})`,
            );
          else {
            if (E.pending_permission_requests)
              this.processPendingPermissionRequests(E.pending_permission_requests);
            if (E.pending_user_dialog_requests)
              this.processPendingUserDialogRequests(E.pending_user_dialog_requests);
          }
        },
        reject: b,
      });
      let R =
        jsonStringify(i) +
        `
`;
      let T = () => {
        if (signal?.aborted) return;
        y = true;
        return this.transport.write(R);
      };
      try {
        (this.initializeHasBeenWritten || this.writingFirstInitialize
          ? Promise.resolve(T())
          : this.initializeWritten.then(T)
        ).catch(b);
      } catch (error) {
        b(error);
      }
    });
  }
  initializationResult() {
    return this.initialization;
  }
  writeAfterInitialize(e) {
    if (this.initializeHasBeenWritten) return Promise.resolve(this.transport.write(e));
    return this.initializeWritten.then(() => this.transport.write(e));
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
  async getContextUsage(e) {
    return (
      await this.request({
        subtype: "get_context_usage",
        ...e,
      })
    ).response;
  }
  async usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET(e) {
    return (
      await this.request({
        subtype: "get_usage",
        ...(e?.skipBehaviors && {
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
  async readCloudSessions(e, s) {
    return (await this.request(e, s)).response;
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
  async readFile(path, s) {
    try {
      return (
        await this.request({
          subtype: "read_file",
          path,
          max_bytes: s?.maxBytes,
          encoding: s?.encoding,
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
  async reloadPlugins(e) {
    return withFeatureTelemetry(
      "sdk_reload_plugins",
      async () =>
        (
          await this.request({
            subtype: "reload_plugins",
            ...(e?.holdOnCacheImpact && {
              hold_on_cache_impact: true,
            }),
            ...(e?.addPlugins &&
              e.addPlugins.length > 0 && {
                add_plugins: e.addPlugins,
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
  async setMcpServers(e) {
    return withFeatureTelemetry("sdk_mcp_set_servers", async () => {
      let s = {};
      let r = {};
      for (let [key, value] of Object.entries(e))
        if (value.type === "sdk" && "instance" in value) s[key] = value;
        else r[key] = value;
      let n = new Set(this.sdkMcpServers.keys());
      let i = new Set(Object.keys(s));
      for (let h of n) if (!i.has(h)) await this.disconnectSdkMcpServer(h);
      for (let [key, value] of Object.entries(s)) {
        let y = this.sdkMcpServers.get(key);
        if (!y) {
          this.connectSdkMcpServer(key, value);
          continue;
        }
        let { settings, ignored } = parseMcpServerSettings(value);
        Nt(key, value, ignored);
        if (
          settings.timeout !== y.settings.timeout ||
          settings.disableAutoBackground !== y.settings.disableAutoBackground ||
          settings.connectorId !== y.settings.connectorId
        )
          logForDebugging(
            `[Query.setMcpServers] MCP server '${key}' is already registered, so the different timeout, disableAutoBackground or connectorId passed to setMcpServers is ignored; remove and re-add the server to change it`,
          );
        if (settings.tools !== undefined && !sameToolPolicies(settings.tools, y.settings.tools)) {
          logForDebugging(
            settings.tools.length === 0
              ? `[Query.setMcpServers] MCP server '${key}': per-tool policy cleared`
              : `[Query.setMcpServers] MCP server '${key}': per-tool policy replaced (${settings.tools.length} ${settings.tools.length === 1 ? "entry" : "entries"})`,
          );
          y.settings = {
            ...y.settings,
            tools: settings.tools,
          };
        }
      }
      let m = {};
      for (let key of Object.keys(s))
        m[key] = {
          type: "sdk",
          name: key,
          ...this.sdkMcpServers.get(key)?.settings,
        };
      return (
        await this.request({
          subtype: "mcp_set_servers",
          servers: {
            ...r,
            ...m,
          },
        })
      ).response;
    });
  }
  async accountInfo() {
    return (await this.initialization).account;
  }
  async streamInput(e) {
    logForDebugging("[Query.streamInput] Starting to process input stream");
    try {
      if (!this.initializeHasBeenWritten) await this.initializeWritten;
      let s = 0;
      for await (let r of e) {
        s++;
        logForDebugging(`[Query.streamInput] Processing message ${s}: ${r.type}`);
        if (this.abortController?.signal.aborted) break;
        this.runEnded = false;
        this.resultReceived = false;
        this.clearRunEndCeiling();
        await Promise.resolve(
          this.transport.write(
            jsonStringify(
              this.verbatimPrompts
                ? {
                    ...r,
                    client_composed: true,
                  }
                : r,
            ) +
              `
`,
          ),
        );
      }
      logForDebugging(`[Query.streamInput] Finished processing ${s} messages from input stream`);
      if (s > 0 && this.hasBidirectionalNeeds()) {
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
      let r = () => resolve();
      signal?.addEventListener("abort", r, {
        once: true,
      });
      this.addCleanupCallback(() => {
        signal?.removeEventListener("abort", r);
        resolve();
      });
      this.runEndedResolve = () => {
        signal?.removeEventListener("abort", r);
        resolve();
      };
    });
  }
  handleHookCallbacks(e, s, r, signal) {
    let i = this.hookCallbacks.get(e);
    if (!i) throw Error(`No hook callback found for ID: ${e}`);
    return i(s, r, {
      signal,
    });
  }
  connectSdkMcpServer(e, s) {
    let r = new SdkControlServerTransport((l) => this.sendMcpServerMessageToCli(e, l));
    let connection = s.instance.connect(r).catch((error) => {
      if (this.sdkMcpServers.get(e)?.transport === r) this.sdkMcpServers.delete(e);
      logForDebugging(`[Query.connectSdkMcpServer] Failed to connect MCP server '${e}': ${error}`, {
        level: "error",
      });
    });
    let { settings, ignored } = parseMcpServerSettings(s);
    Nt(e, s, ignored);
    this.sdkMcpServers.set(e, {
      transport: r,
      settings,
      connection,
    });
  }
  async disconnectSdkMcpServer(e) {
    let s = this.sdkMcpServers.get(e);
    if (s) {
      let r = `${e}:${SDK_MANIFEST_CAPTURE}`;
      for (let [n, i] of this.pendingMcpResponses)
        if (n.startsWith(r)) {
          this.pendingMcpResponses.delete(n);
          i.reject(Error("MCP server was removed during the manifest capture"));
        }
      await s.transport.close();
      if (this.sdkMcpServers.get(e) === s) this.sdkMcpServers.delete(e);
    }
  }
  sendMcpServerMessageToCli(e, s) {
    if ("id" in s && s.id !== null && s.id !== undefined) {
      let n = `${e}:${s.id}`;
      let i = this.pendingMcpResponses.get(n);
      if (i) {
        i.resolve(s);
        this.pendingMcpResponses.delete(n);
        return;
      }
      if (typeof s.id === "string" && s.id.startsWith(SDK_MANIFEST_CAPTURE)) {
        logForDebugging(
          `[Query.sendMcpServerMessageToCli] Dropping late manifest-capture reply from '${e}' (${s.id})`,
        );
        return;
      }
    }
    let r = {
      type: "control_request",
      request_id: randomUUID(),
      request: {
        subtype: "mcp_message",
        server_name: e,
        message: s,
      },
    };
    if (!this.initializeHasBeenWritten && isToolListChangedNotification(s))
      this.sdkMcpToolsChangedDuringCapture.add(e);
    this.writeAfterInitialize(
      jsonStringify(r) +
        `
`,
    ).catch((error) => {
      logForDebugging(`[Query.sendMcpServerMessageToCli] Transport write failed: ${error}`, {
        level: "error",
      });
    });
  }
  handleMcpControlRequest(e, s, r) {
    let id = "id" in s.message ? s.message.id : null;
    let i = `${e}:${id}`;
    return new Promise((resolve, reject) => {
      let h = () => {
        this.pendingMcpResponses.delete(i);
      };
      let resolve_2 = (w) => {
        h();
        resolve(w);
      };
      let reject_2 = (w) => {
        h();
        reject(w);
      };
      this.pendingMcpResponses.set(i, {
        resolve: resolve_2,
        reject: reject_2,
      });
      if (r.onmessage) r.onmessage(s.message);
      else {
        h();
        reject(Error("No message handler registered"));
        return;
      }
    });
  }
}
//@ chunk-y805ph4h.js:62908-62976 placement
function st() {
  return Error("Query closed before response received");
}
//@ chunk-y805ph4h.js:62976-63008 placement
var tr = /^[a-z][a-z0-9_]{0,63}$/;
//@ chunk-y805ph4h.js:63008-63137 placement
function Kt(sessionId, s) {
  if (sessionId === s) return true;
  let sliced = sessionId.slice(sessionId.lastIndexOf("_") + 1);
  let sliced_2 = s.slice(s.lastIndexOf("_") + 1);
  return sliced.length >= 4 && sliced === sliced_2;
}
export { Query };
