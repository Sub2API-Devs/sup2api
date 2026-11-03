/**
 * @anthropic-ai/sdk/lib/tools/BetaToolRunner.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (12)
 * attribution: esm-layout 4, esm-fingerprint 8
 */
import { __classPrivateFieldSet, __classPrivateFieldGet } from "../../internal/tslib.mjs";
import { collectStainlessHelpers, wr, X_STAINLESS_HELPER } from "../../internal/stainless-helper-header.mjs";
import { buildHeaders } from "../../internal/headers.mjs";
import { SEn } from "../../internal/utils/promise.mjs";
import { AnthropicError } from "../../core/error.mjs";
import { loggerFor } from "../../internal/utils/log.mjs";
import { ToolError } from "./ToolError.mjs";
import { Bt } from "../../tools/agent-toolset/memories.mjs";

//@ chunk-hwmsct5x.js:104913-106258 esm-layout
var DEFAULT_TOKEN_THRESHOLD = 1e5;
var dd = `You have been working on the task described above but have not yet completed it. Write a continuation summary that will allow you (or another instance of yourself) to resume work efficiently in a future context window where the conversation history will be replaced with this summary. Your summary should be structured, concise, and actionable. Include:
1. Task Overview
The user's core request and success criteria
Any clarifications or constraints they specified
2. Current State
What has been completed so far
Files created, modified, or analyzed (with paths if relevant)
Key outputs or artifacts produced
3. Important Discoveries
Technical constraints or requirements uncovered
Decisions made and their rationale
Errors encountered and how they were resolved
What approaches were tried that didn't work (and why)
4. Next Steps
Specific actions needed to complete the task
Any blockers or open questions to resolve
Priority order if multiple steps remain
5. Context to Preserve
User preferences or style requirements
Domain-specific details that aren't obvious
Any promises made to the user
Be concise but complete\u2014err on the side of including information that would prevent duplicate work or repeated mistakes. Write in a way that enables immediate resumption of the task.
Wrap your summary in <summary></summary> tags.`;
//@ chunk-hwmsct5x.js:106258-114576 esm-layout
var _BetaToolRunner_instances;
var _BetaToolRunner_consumed;
var _BetaToolRunner_mutated;
var _BetaToolRunner_state;
var _BetaToolRunner_options;
var _BetaToolRunner_message;
var _BetaToolRunner_stream;
var _BetaToolRunner_toolResponse;
var _BetaToolRunner_completion;
var _BetaToolRunner_iterationCount;
var _BetaToolRunner_compaction;
var _BetaToolRunner_lastStopReason;
var _BetaToolRunner_toolOverrides;
var _BetaToolRunner_pendingToolChanges;
var _BetaToolRunner_checkAndCompact;
var _BetaToolRunner_send;
var _BetaToolRunner_compact;
var _BetaToolRunner_runnableTools;
var _BetaToolRunner_availableToolNames;
var _BetaToolRunner_recordRemovalsFromHistory;
var _BetaToolRunner_compactAfterFinalTurn;
var _BetaToolRunner_generateToolResponse;
var _BetaToolRunner_flushPendingToolChanges;
var _BetaToolRunner_pendingToolChangesMessage;
var BetaToolRunner = (() => {
  class BetaToolRunner {
    constructor(client, params, options) {
      _BetaToolRunner_instances.add(this);
      this.client = client;
      _BetaToolRunner_consumed.set(this, false);
      _BetaToolRunner_mutated.set(this, false);
      _BetaToolRunner_state.set(this, undefined);
      _BetaToolRunner_options.set(this, undefined);
      _BetaToolRunner_message.set(this, undefined);
      _BetaToolRunner_stream.set(this, undefined);
      _BetaToolRunner_toolResponse.set(this, undefined);
      _BetaToolRunner_completion.set(this, undefined);
      _BetaToolRunner_iterationCount.set(this, 0);
      _BetaToolRunner_compaction.set(this, {
        status: "idle",
      });
      _BetaToolRunner_lastStopReason.set(this, null);
      _BetaToolRunner_toolOverrides.set(this, new Map());
      _BetaToolRunner_pendingToolChanges.set(this, []);
      rejectCompactionParam(params);
      __classPrivateFieldSet(
        this,
        _BetaToolRunner_state,
        {
          params: {
            ...params,
            messages: JSON.parse(JSON.stringify(params.messages)),
          },
        },
        "f",
      );
      let collected = collectStainlessHelpers(params.tools, params.messages);
      __classPrivateFieldSet(
        this,
        _BetaToolRunner_options,
        {
          ...options,
          headers: buildHeaders([
            wr("BetaToolRunner"),
            collected.length
              ? {
                  [X_STAINLESS_HELPER]: collected.join(", "),
                }
              : undefined,
            options?.headers,
          ]),
        },
        "f",
      );
      __classPrivateFieldSet(this, _BetaToolRunner_completion, SEn(), "f");
      if (params.compactionControl?.enabled)
        console.warn(
          'Anthropic: The `compactionControl` parameter is deprecated and will be removed in a future version. Use server-side compaction instead by passing `edits: [{ type: "compact_20260112" }]` in the params passed to `toolRunner()`. See https://platform.claude.com/docs/en/build-with-claude/compaction',
        );
    }
    async *[((_BetaToolRunner_consumed = new WeakMap()),
    (_BetaToolRunner_mutated = new WeakMap()),
    (_BetaToolRunner_state = new WeakMap()),
    (_BetaToolRunner_options = new WeakMap()),
    (_BetaToolRunner_message = new WeakMap()),
    (_BetaToolRunner_stream = new WeakMap()),
    (_BetaToolRunner_toolResponse = new WeakMap()),
    (_BetaToolRunner_completion = new WeakMap()),
    (_BetaToolRunner_iterationCount = new WeakMap()),
    (_BetaToolRunner_compaction = new WeakMap()),
    (_BetaToolRunner_lastStopReason = new WeakMap()),
    (_BetaToolRunner_toolOverrides = new WeakMap()),
    (_BetaToolRunner_pendingToolChanges = new WeakMap()),
    (_BetaToolRunner_instances = new WeakSet()),
    (_BetaToolRunner_checkAndCompact = async function () {
      let compactionControl = __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params
        .compactionControl;
      if (!compactionControl || !compactionControl.enabled) return false;
      let tokensUsed = 0;
      if (__classPrivateFieldGet(this, _BetaToolRunner_message, "f") !== undefined)
        try {
          let message = await __classPrivateFieldGet(this, _BetaToolRunner_message, "f");
          tokensUsed =
            message.usage.input_tokens +
            (message.usage.cache_creation_input_tokens ?? 0) +
            (message.usage.cache_read_input_tokens ?? 0) +
            message.usage.output_tokens;
        } catch {
          return false;
        }
      let threshold = compactionControl.contextTokenThreshold ?? DEFAULT_TOKEN_THRESHOLD;
      if (tokensUsed < threshold) return false;
      let model =
        compactionControl.model ?? __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.model;
      let summaryPrompt = compactionControl.summaryPrompt ?? dd;
      let messages = __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages;
      if (messages[messages.length - 1].role === "assistant") {
        let lastMessage = messages[messages.length - 1];
        if (Array.isArray(lastMessage.content)) {
          let nonToolBlocks = lastMessage.content.filter((block) => block.type !== "tool_use");
          if (nonToolBlocks.length === 0) messages.pop();
          else lastMessage.content = nonToolBlocks;
        }
      }
      let response = await this.client.beta.messages.create(
        {
          model,
          messages: [
            ...messages,
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: summaryPrompt,
                },
              ],
            },
          ],
          max_tokens: __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.max_tokens,
        },
        {
          signal: __classPrivateFieldGet(this, _BetaToolRunner_options, "f").signal,
          headers: buildHeaders([
            __classPrivateFieldGet(this, _BetaToolRunner_options, "f").headers,
            wr("compaction"),
          ]),
        },
      );
      if (response.content[0]?.type !== "text")
        throw new AnthropicError("Expected text response for compaction");
      __classPrivateFieldGet(
        this,
        _BetaToolRunner_instances,
        "m",
        _BetaToolRunner_recordRemovalsFromHistory,
      ).call(this);
      __classPrivateFieldSet(this, _BetaToolRunner_lastStopReason, null, "f");
      __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages = [
        {
          role: "user",
          content: asContentParam(response.content),
        },
      ];
      return true;
    }),
    Symbol.asyncIterator)]() {
      var _a;
      if (__classPrivateFieldGet(this, _BetaToolRunner_consumed, "f"))
        throw new AnthropicError("Cannot iterate over a consumed stream");
      __classPrivateFieldSet(this, _BetaToolRunner_consumed, true, "f");
      __classPrivateFieldSet(this, _BetaToolRunner_mutated, true, "f");
      __classPrivateFieldSet(this, _BetaToolRunner_toolResponse, undefined, "f");
      try {
        while (true)
          try {
            if (
              __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.max_iterations &&
              __classPrivateFieldGet(this, _BetaToolRunner_iterationCount, "f") >=
                __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.max_iterations
            )
              break;
            __classPrivateFieldGet(
              this,
              _BetaToolRunner_instances,
              "m",
              _BetaToolRunner_flushPendingToolChanges,
            ).call(this);
            if (
              __classPrivateFieldGet(this, _BetaToolRunner_compaction, "f").status === "scheduled" &&
              determineNextStepFromStopReason(
                __classPrivateFieldGet(this, _BetaToolRunner_lastStopReason, "f"),
              ) !== "resume"
            ) {
              yield* __classPrivateFieldGet(
                this,
                _BetaToolRunner_instances,
                "m",
                _BetaToolRunner_compact,
              ).call(this, __classPrivateFieldGet(this, _BetaToolRunner_compaction, "f").config);
              continue;
            }
            __classPrivateFieldSet(this, _BetaToolRunner_mutated, false, "f");
            __classPrivateFieldSet(this, _BetaToolRunner_toolResponse, undefined, "f");
            __classPrivateFieldSet(
              this,
              _BetaToolRunner_iterationCount,
              ((_a = __classPrivateFieldGet(this, _BetaToolRunner_iterationCount, "f")), _a++, _a),
              "f",
            );
            __classPrivateFieldSet(this, _BetaToolRunner_message, undefined, "f");
            let { max_iterations, compactionControl, ...params } = __classPrivateFieldGet(
              this,
              _BetaToolRunner_state,
              "f",
            ).params;
            yield* __classPrivateFieldGet(this, _BetaToolRunner_instances, "m", _BetaToolRunner_send).call(
              this,
              params,
            );
            if (
              !(await __classPrivateFieldGet(
                this,
                _BetaToolRunner_instances,
                "m",
                _BetaToolRunner_checkAndCompact,
              ).call(this))
            ) {
              if (!__classPrivateFieldGet(this, _BetaToolRunner_mutated, "f")) {
                let message = await __classPrivateFieldGet(this, _BetaToolRunner_message, "f");
                let nextStep = determineNextStepFromStopReason(message.stop_reason);
                __classPrivateFieldSet(this, _BetaToolRunner_lastStopReason, message.stop_reason, "f");
                __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages.push({
                  role: message.role,
                  content: asContentParam(message.content),
                });
                let { container } = __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params;
                if (message.container) {
                  if (container == null)
                    __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.container =
                      message.container.id;
                  else if (typeof container === "object" && container.id == null)
                    __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.container = {
                      ...container,
                      id: message.container.id,
                    };
                }
                if (nextStep === "stop") {
                  yield* __classPrivateFieldGet(
                    this,
                    _BetaToolRunner_instances,
                    "m",
                    _BetaToolRunner_compactAfterFinalTurn,
                  ).call(this);
                  break;
                }
                if (nextStep === "resume") continue;
              } else __classPrivateFieldSet(this, _BetaToolRunner_lastStopReason, null, "f");
              let toolMessage = await __classPrivateFieldGet(
                this,
                _BetaToolRunner_instances,
                "m",
                _BetaToolRunner_generateToolResponse,
              ).call(this, __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages.at(-1));
              if (toolMessage)
                __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages.push(toolMessage);
              else if (!__classPrivateFieldGet(this, _BetaToolRunner_mutated, "f")) {
                yield* __classPrivateFieldGet(
                  this,
                  _BetaToolRunner_instances,
                  "m",
                  _BetaToolRunner_compactAfterFinalTurn,
                ).call(this);
                break;
              }
            }
          } finally {
            __classPrivateFieldGet(this, _BetaToolRunner_stream, "f")?.abort();
            __classPrivateFieldSet(this, _BetaToolRunner_stream, undefined, "f");
          }
        if (!__classPrivateFieldGet(this, _BetaToolRunner_message, "f"))
          throw new AnthropicError("ToolRunner concluded without a message from the server");
        __classPrivateFieldGet(this, _BetaToolRunner_completion, "f").resolve(
          await __classPrivateFieldGet(this, _BetaToolRunner_message, "f"),
        );
      } catch (error) {
        __classPrivateFieldSet(this, _BetaToolRunner_consumed, false, "f");
        __classPrivateFieldGet(this, _BetaToolRunner_completion, "f").promise.catch(() => {});
        __classPrivateFieldGet(this, _BetaToolRunner_completion, "f").reject(error);
        __classPrivateFieldSet(this, _BetaToolRunner_completion, SEn(), "f");
        throw error;
      }
    }
    setMessagesParams(paramsOrMutator) {
      let params =
        typeof paramsOrMutator === "function"
          ? paramsOrMutator(__classPrivateFieldGet(this, _BetaToolRunner_state, "f").params)
          : paramsOrMutator;
      rejectCompactionParam(params);
      if (__classPrivateFieldGet(this, _BetaToolRunner_compaction, "f").status !== "idle")
        rejectCompactionEdit(params);
      if (
        __classPrivateFieldGet(this, _BetaToolRunner_compaction, "f").status === "in_flight" &&
        params.messages !== __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages
      )
        throw new AnthropicError(
          "Message params can't be changed while the conversation is being compacted, because the compaction response is about to replace them. Change them after this iteration instead.",
        );
      __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params = params;
      __classPrivateFieldSet(this, _BetaToolRunner_mutated, true, "f");
      __classPrivateFieldSet(this, _BetaToolRunner_toolResponse, undefined, "f");
    }
    setRequestOptions(optionsOrMutator) {
      if (typeof optionsOrMutator === "function")
        __classPrivateFieldSet(
          this,
          _BetaToolRunner_options,
          optionsOrMutator(__classPrivateFieldGet(this, _BetaToolRunner_options, "f")),
          "f",
        );
      else
        __classPrivateFieldSet(
          this,
          _BetaToolRunner_options,
          {
            ...__classPrivateFieldGet(this, _BetaToolRunner_options, "f"),
            ...optionsOrMutator,
          },
          "f",
        );
    }
    async generateToolResponse(signal = __classPrivateFieldGet(this, _BetaToolRunner_options, "f").signal) {
      let message =
        (await __classPrivateFieldGet(this, _BetaToolRunner_message, "f")) ?? this.params.messages.at(-1);
      if (!message) return null;
      return __classPrivateFieldGet(
        this,
        _BetaToolRunner_instances,
        "m",
        _BetaToolRunner_generateToolResponse,
      ).call(this, message, signal);
    }
    done() {
      return __classPrivateFieldGet(this, _BetaToolRunner_completion, "f").promise;
    }
    async runUntilDone() {
      if (!__classPrivateFieldGet(this, _BetaToolRunner_consumed, "f")) for await (let _ of this);
      return this.done();
    }
    get params() {
      return __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params;
    }
    pushMessages(...messages) {
      this.setMessagesParams((params) => ({
        ...params,
        messages: [...params.messages, ...messages],
      }));
    }
    compactBeforeNextTurn(compaction) {
      if (__classPrivateFieldGet(this, _BetaToolRunner_compaction, "f").status === "in_flight") return;
      rejectCompactionEdit(__classPrivateFieldGet(this, _BetaToolRunner_state, "f").params);
      __classPrivateFieldSet(
        this,
        _BetaToolRunner_compaction,
        {
          status: "scheduled",
          config: compaction ?? {
            type: "summarize",
          },
        },
        "f",
      );
    }
    addTools(...tools) {
      for (let tool of tools) {
        if ("name" in tool)
          __classPrivateFieldGet(this, _BetaToolRunner_toolOverrides, "f").set(
            tool.name,
            "run" in tool ? tool : null,
          );
        __classPrivateFieldGet(this, _BetaToolRunner_pendingToolChanges, "f").push({
          type: "addition",
          tool,
        });
      }
    }
    removeTools(...tools) {
      for (let tool of tools) {
        let name = typeof tool === "string" ? tool : tool.name;
        __classPrivateFieldGet(this, _BetaToolRunner_toolOverrides, "f").set(name, null);
        __classPrivateFieldGet(this, _BetaToolRunner_pendingToolChanges, "f").push({
          type: "removal",
          name,
        });
      }
    }
    then(onfulfilled, onrejected) {
      return this.runUntilDone().then(onfulfilled, onrejected);
    }
  }
  _BetaToolRunner_send = async function* (params) {
    if (params.stream) {
      __classPrivateFieldSet(
        this,
        _BetaToolRunner_stream,
        this.client.beta.messages.stream(
          {
            ...params,
          },
          __classPrivateFieldGet(this, _BetaToolRunner_options, "f"),
        ),
        "f",
      );
      __classPrivateFieldSet(
        this,
        _BetaToolRunner_message,
        __classPrivateFieldGet(this, _BetaToolRunner_stream, "f").finalMessage(),
        "f",
      );
      __classPrivateFieldGet(this, _BetaToolRunner_message, "f").catch(() => {});
      yield __classPrivateFieldGet(this, _BetaToolRunner_stream, "f");
    } else {
      __classPrivateFieldSet(
        this,
        _BetaToolRunner_message,
        this.client.beta.messages.create(
          {
            ...params,
            stream: false,
          },
          __classPrivateFieldGet(this, _BetaToolRunner_options, "f"),
        ),
        "f",
      );
      yield __classPrivateFieldGet(this, _BetaToolRunner_message, "f");
    }
  };
  _BetaToolRunner_compact = async function* (compaction) {
    rejectCompactionEdit(__classPrivateFieldGet(this, _BetaToolRunner_state, "f").params);
    let { max_iterations, compactionControl, ...requestParams } = __classPrivateFieldGet(
      this,
      _BetaToolRunner_state,
      "f",
    ).params;
    let params = withoutCompactionIncompatibleParams(requestParams);
    __classPrivateFieldSet(
      this,
      _BetaToolRunner_compaction,
      {
        status: "in_flight",
      },
      "f",
    );
    __classPrivateFieldSet(this, _BetaToolRunner_toolResponse, undefined, "f");
    let lastMessage = __classPrivateFieldGet(this, _BetaToolRunner_message, "f");
    try {
      yield* __classPrivateFieldGet(this, _BetaToolRunner_instances, "m", _BetaToolRunner_send).call(this, {
        ...params,
        compaction,
      });
      let message = await __classPrivateFieldGet(this, _BetaToolRunner_message, "f");
      if (message.content.some((block) => block.type === "compaction" && block.content)) {
        __classPrivateFieldGet(
          this,
          _BetaToolRunner_instances,
          "m",
          _BetaToolRunner_recordRemovalsFromHistory,
        ).call(this);
        __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages = [
          {
            role: message.role,
            content: message.content,
          },
        ];
      } else {
        loggerFor(this.client).warn("Compaction produced no summary; keeping the conversation as it is.");
        __classPrivateFieldSet(this, _BetaToolRunner_message, lastMessage, "f");
      }
    } finally {
      __classPrivateFieldSet(
        this,
        _BetaToolRunner_compaction,
        {
          status: "idle",
        },
        "f",
      );
    }
  };
  _BetaToolRunner_runnableTools = function () {
    let runnable = new Map();
    for (let tool of __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.tools)
      if ("run" in tool) runnable.set(tool.name, tool);
    for (let [name, tool] of __classPrivateFieldGet(this, _BetaToolRunner_toolOverrides, "f"))
      if (tool) runnable.set(name, tool);
      else runnable.delete(name);
    return runnable;
  };
  _BetaToolRunner_availableToolNames = function () {
    let available = new Set(
      __classPrivateFieldGet(this, _BetaToolRunner_instances, "m", _BetaToolRunner_runnableTools)
        .call(this)
        .keys(),
    );
    for (let message of [
      ...__classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages,
      __classPrivateFieldGet(
        this,
        _BetaToolRunner_instances,
        "m",
        _BetaToolRunner_pendingToolChangesMessage,
      ).call(this),
    ]) {
      if (typeof message.content === "string") continue;
      for (let block of message.content)
        if (message.role === "system") applyToolChange(block, available);
        else if (message.role === "assistant" && block.type === "compaction")
          for (let change of block.tool_changes ?? []) applyToolChange(change, available);
    }
    return available;
  };
  _BetaToolRunner_recordRemovalsFromHistory = function () {
    let available = __classPrivateFieldGet(
      this,
      _BetaToolRunner_instances,
      "m",
      _BetaToolRunner_availableToolNames,
    ).call(this);
    for (let name of __classPrivateFieldGet(
      this,
      _BetaToolRunner_instances,
      "m",
      _BetaToolRunner_runnableTools,
    )
      .call(this)
      .keys())
      if (!available.has(name))
        __classPrivateFieldGet(this, _BetaToolRunner_toolOverrides, "f").set(name, null);
  };
  _BetaToolRunner_compactAfterFinalTurn = async function* () {
    if (__classPrivateFieldGet(this, _BetaToolRunner_compaction, "f").status !== "scheduled") return;
    let lastContent = __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages.at(
      -1,
    )?.content;
    if (Array.isArray(lastContent) && lastContent.some((block) => block.type === "tool_use")) {
      loggerFor(this.client).warn(
        "The pending compaction was skipped because the last turn ended with tool calls that were not run. Call `compactBeforeNextTurn()` again if you continue the conversation.",
      );
      __classPrivateFieldSet(
        this,
        _BetaToolRunner_compaction,
        {
          status: "idle",
        },
        "f",
      );
      return;
    }
    yield* __classPrivateFieldGet(this, _BetaToolRunner_instances, "m", _BetaToolRunner_compact).call(
      this,
      __classPrivateFieldGet(this, _BetaToolRunner_compaction, "f").config,
    );
  };
  _BetaToolRunner_generateToolResponse = async function (
    lastMessage,
    signal = __classPrivateFieldGet(this, _BetaToolRunner_options, "f").signal,
  ) {
    if (__classPrivateFieldGet(this, _BetaToolRunner_toolResponse, "f") !== undefined)
      return __classPrivateFieldGet(this, _BetaToolRunner_toolResponse, "f");
    __classPrivateFieldSet(
      this,
      _BetaToolRunner_toolResponse,
      generateToolResponse(
        __classPrivateFieldGet(this, _BetaToolRunner_instances, "m", _BetaToolRunner_runnableTools).call(
          this,
        ),
        __classPrivateFieldGet(this, _BetaToolRunner_instances, "m", _BetaToolRunner_availableToolNames).call(
          this,
        ),
        lastMessage,
        {
          ...__classPrivateFieldGet(this, _BetaToolRunner_options, "f"),
          signal,
        },
      ),
      "f",
    );
    return __classPrivateFieldGet(this, _BetaToolRunner_toolResponse, "f");
  };
  _BetaToolRunner_flushPendingToolChanges = function () {
    if (
      __classPrivateFieldGet(this, _BetaToolRunner_lastStopReason, "f") === "pause_turn" ||
      __classPrivateFieldGet(this, _BetaToolRunner_pendingToolChanges, "f").length === 0
    )
      return;
    __classPrivateFieldGet(this, _BetaToolRunner_state, "f").params.messages.push(
      __classPrivateFieldGet(
        this,
        _BetaToolRunner_instances,
        "m",
        _BetaToolRunner_pendingToolChangesMessage,
      ).call(this),
    );
    __classPrivateFieldSet(this, _BetaToolRunner_pendingToolChanges, [], "f");
  };
  _BetaToolRunner_pendingToolChangesMessage = function () {
    let content = [];
    for (let change of __classPrivateFieldGet(this, _BetaToolRunner_pendingToolChanges, "f")) {
      if (change.type === "removal") {
        content.push({
          type: "tool_removal",
          tool: {
            type: "tool_reference",
            name: change.name,
          },
        });
        continue;
      }
      let definition = change.tool;
      if ("run" in change.tool) {
        let { run, parse, close, ...rest } = change.tool;
        definition = rest;
      }
      content.push({
        type: "tool_addition",
        tool: {
          type: "tool_definition",
          definition,
        },
      });
    }
    return {
      role: "system",
      content,
    };
  };
  return BetaToolRunner;
})();
//@ chunk-hwmsct5x.js:114576-114828 esm-layout
function rejectCompactionParam(params) {
  if ("compaction" in params && params.compaction != null)
    throw new AnthropicError(
      "`compaction` cannot be set on a tool runner: every request in the loop would compact again. Call `runner.compactBeforeNextTurn()` when the conversation should be compacted instead.",
    );
}
//@ chunk-hwmsct5x.js:114828-115114 esm-fingerprint
function rejectCompactionEdit(params) {
  if (params.context_management?.edits?.some((edit) => edit.type.startsWith("compact_")))
    throw new AnthropicError(
      "`compactBeforeNextTurn()` can't be used while `context_management` has a compaction edit, because the API doesn't accept a compaction block together with one. Remove the edit first.",
    );
}
//@ chunk-hwmsct5x.js:115114-115485 esm-fingerprint
function withoutCompactionIncompatibleParams(params) {
  let { context_management, stop_sequences, output_format, ...kept } = params;
  let withoutFormat = ({ format, ...outputConfig }) => outputConfig;
  if (kept.tool_choice?.type === "any" || kept.tool_choice?.type === "tool") delete kept.tool_choice;
  if (kept.output_config) kept.output_config = withoutFormat(kept.output_config);
  if (Array.isArray(kept.fallbacks))
    kept.fallbacks = kept.fallbacks.map((fallback) =>
      fallback.output_config
        ? {
            ...fallback,
            output_config: withoutFormat(fallback.output_config),
          }
        : fallback,
    );
  return kept;
}
//@ chunk-hwmsct5x.js:115485-116121 esm-fingerprint
async function generateToolResponse(runnable, available, lastMessage, requestOptions) {
  if (
    !lastMessage ||
    lastMessage.role !== "assistant" ||
    !lastMessage.content ||
    typeof lastMessage.content === "string"
  )
    return null;
  let toolUseBlocks = lastMessage.content.filter((content) => content.type === "tool_use");
  if (toolUseBlocks.length === 0) return null;
  return {
    role: "user",
    content: await Promise.all(
      toolUseBlocks.map(async (toolUse) => {
        let tool = available.has(toolUse.name) ? runnable.get(toolUse.name) : undefined;
        if (!tool) return toolNotFoundResult(toolUse);
        try {
          let input = toolUse.input;
          if ("parse" in tool && tool.parse) input = tool.parse(input);
          let result = await tool.run(input, {
            toolUse,
            toolUseBlock: toolUse,
            signal: requestOptions?.signal,
          });
          return {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: result,
          };
        } catch (error) {
          return {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content:
              error instanceof ToolError
                ? error.content
                : `Error: ${error instanceof Error ? error.message : String(error)}`,
            is_error: true,
          };
        }
      }),
    ),
  };
}
//@ chunk-hwmsct5x.js:116121-116145 esm-layout
function asContentParam(content) {
  return content;
}
//@ chunk-hwmsct5x.js:116145-116260 esm-fingerprint
function toolNotFoundResult(toolUse) {
  return {
    type: "tool_result",
    tool_use_id: toolUse.id,
    content: `Error: Tool '${toolUse.name}' not found`,
    is_error: true,
  };
}
//@ chunk-hwmsct5x.js:116260-116346 esm-fingerprint
function applyToolChange(block, available) {
  switch (block.type) {
    case "tool_removal":
    case "tool_addition":
      applyToolReference(block, available);
      break;
  }
}
//@ chunk-hwmsct5x.js:116346-116454 esm-fingerprint
function applyToolReference(block, available) {
  let name = changedToolName(block.tool);
  if (name === undefined) return;
  if (block.type === "tool_removal") available.delete(name);
  else available.add(name);
}
//@ chunk-hwmsct5x.js:116454-116610 esm-fingerprint
function changedToolName(tool) {
  switch (tool.type) {
    case "tool_reference":
      return tool.name;
    case "tool_definition":
      return "name" in tool.definition ? tool.definition.name : undefined;
    default:
      return;
  }
}
//@ chunk-hwmsct5x.js:116610-116886 esm-fingerprint
function determineNextStepFromStopReason(stopReason) {
  if (stopReason === null) return "stop";
  switch (stopReason) {
    case "tool_use":
      return "run_tools";
    case "pause_turn":
    case "compaction":
      return "resume";
    case "end_turn":
    case "stop_sequence":
    case "max_tokens":
    case "model_context_window_exceeded":
    case "refusal":
      return "stop";
    default:
      Bt(stopReason);
      return "stop";
  }
}
export { BetaToolRunner };
