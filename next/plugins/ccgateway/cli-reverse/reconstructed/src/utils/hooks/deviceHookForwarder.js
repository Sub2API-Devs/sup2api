/**
 * utils/hooks/deviceHookForwarder.ts
 *
 * 2.1.316 新增：设备钩子转发器：把钩子输入转发到附着的机器执行（大小/可克隆检查、超时、主人离开）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tdcrpxkn.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { realpath, readlink } from "fs/promises";
import { posix } from "path";
import { registerDeviceHookCallbacks, unregisterDeviceHookCallbacks } from "./deviceHooks/templates.js";
import { createRemoteHookPauseNotifier } from "../../entrypoints/sdk/coreSchemas.js";
import { clone } from "../slowOperations.js";
import { escapeJsLineTerminators } from "../../cli/ndjsonSafeStringify.js";
import { logForDebugging } from "../debug.js";
import { isCodeEditingHookPayload } from "./hookEventSets.js";
import { forwardedUnderMatchingToolName } from "../hooks.js";
import { parseHookJsonOutput, isBlockingHookOutput } from "./hookSpecificOutput.js";
import { isAbortError, errorMessage } from "../errors.js";
import { logError } from "../log.js";
import { toolPathFieldInput } from "./hookInputPaths.js";

//@ chunk-tdcrpxkn.js:8521-8746 placement
var MAX_DEVICE_HOOK_INPUT_BYTES = 1044480;
var DEVICE_HOOK_DEFAULT_S = {
  PreToolUse: 15,
  PostToolUse: 15,
  PostToolUseFailure: 15,
  PostToolBatch: 15,
  PermissionDenied: 15,
  SubagentStart: 15,
  UserPromptSubmit: 30,
  UserPromptExpansion: 30,
  Stop: 120,
  StopFailure: 120,
  SubagentStop: 120,
};
var DEVICE_HOOK_TIMEOUT_SLACK_MS = 5000;
var DEVICE_HOOK_DEADLINE_SLACK_S = 30;
//@ chunk-tdcrpxkn.js:8746-8802 placement
function deviceHookTimeoutMs(spec) {
  return (spec.timeoutS ?? DEVICE_HOOK_DEFAULT_S[spec.event]) * 1000 + DEVICE_HOOK_TIMEOUT_SLACK_MS;
}
//@ chunk-tdcrpxkn.js:8802-8849 placement
function deviceHookDeadlineSec(spec) {
  return Math.ceil(deviceHookTimeoutMs(spec) / 1000) + DEVICE_HOOK_DEADLINE_SLACK_S;
}
//@ chunk-tdcrpxkn.js:8849-12449 placement
/**
 * 创建设备钩子转发器：把 PreToolUse 等钩子输入转发到附着机器执行，处理过大/不可克隆输入、路径无法解析、超时与主人离开。
 */
function createDeviceHookForwarder(options) {
  let install = options.install ?? registerDeviceHookCallbacks;
  let remove = options.remove ?? unregisterDeviceHookCallbacks;
  let absence = options.absence ?? createRemoteHookPauseNotifier();
  let noticedEvents = new Set();
  let machineName = () => options.registry.current()?.displayName ?? "the attached machine";
  let withOnceNotice = (noticeKey, systemMessage, systemMessage_2) =>
    noticedEvents.has(noticeKey)
      ? systemMessage_2
      : (noticedEvents.add(noticeKey),
        {
          ...systemMessage_2,
          systemMessage,
        });
  let reportOutcome = (entry, outcome, stats = {}) =>
    options.telemetry.forwarded({
      event: entry.event,
      outcome,
      fieldsDropped: stats.fieldsDropped ?? false,
      blocked: stats.blocked ?? false,
      rttMs: stats.rttMs ?? 0,
      errorRepliesIgnored: stats.errorRepliesIgnored ?? 0,
      malformedRepliesIgnored: stats.malformedRepliesIgnored ?? 0,
    });
  let forwardForSite =
    (instanceId, spec, generation = options.registry.generation()) =>
    async (input, toolUseID, signal, unused, turnContext) => {
      let ownerStillThere = () => {
        let current = options.registry.current();
        return (
          current !== null &&
          current.instanceId === instanceId &&
          options.now() < current.leaseExpiresAt &&
          current.entries.some((entry) => entry.id === spec.id)
        );
      };
      if (!ownerStillThere()) {
        reportOutcome(spec, "owner_gone");
        return {};
      }
      if (options.registry.isAway(instanceId)) {
        reportOutcome(spec, "away_skipped");
        return safeAwayNotice({}, () =>
          absence.skipped(
            {
              event: spec.event,
              agentId: input.agent_id,
              machine: machineName(),
              inTurn: turnContext !== undefined,
            },
            instanceId,
          ),
        );
      }
      let json = null;
      let inputBytes = 0;
      let inputUnresolvable = false;
      try {
        let json_2 = clone(input);
        inputUnresolvable = !(await realpathToolInputPaths(json_2, options.toolAliases(), {
          realpath: options.realpath ?? realpathDefault,
          readlink: options.readlink ?? readlinkDefault,
        }));
        inputBytes = Buffer.byteLength(escapeJsLineTerminators(json_2), "utf8");
        json = json_2;
      } catch {}
      let tooLarge = inputBytes > MAX_DEVICE_HOOK_INPUT_BYTES;
      if (json === null || tooLarge) {
        logForDebugging(
          `Device hook ${spec.id}: input ${tooLarge ? "exceeds what the device accepts" : "is not plain serialisable data"}; not forwarded`,
          {
            level: "warn",
          },
        );
        reportOutcome(spec, tooLarge ? "input_too_large" : "input_unclonable");
        return spec.event === "PreToolUse"
          ? {
              hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "deny",
                permissionDecisionReason: `[hook on ${options.registry.current()?.displayName ?? "your machine"}]: not run \u2014 the tool call ${tooLarge ? "is too large to forward to the attached machine; retry with a smaller input" : "could not be forwarded to the attached machine; retry with plain input"}`,
              },
            }
          : {};
      }
      if (inputUnresolvable) {
        reportOutcome(spec, "input_unresolvable");
        return spec.event === "PreToolUse"
          ? {
              hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "deny",
                permissionDecisionReason: `[hook on ${options.registry.current()?.displayName ?? "your machine"}]: not run \u2014 the path this tool call names could not be resolved for the attached machine; retry with a plain path`,
              },
            }
          : {};
      }
      if (isCodeEditingHookPayload(json, options.toolAliases())) {
        reportOutcome(spec, "after_edit_held");
        return {};
      }
      let deadlineTimer;
      try {
        let issuedAt = options.now();
        let machine = machineName();
        let timeoutMs = deviceHookTimeoutMs(spec);
        let call = options.sender.sendDeviceHookCallback({
          callbackId: spec.id,
          input: forwardedUnderMatchingToolName(json, spec.matcher, options.toolAliases()),
          toolUseID,
          issuedAt,
          deadlineMs: timeoutMs,
          ...(signal !== undefined && {
            signal,
          }),
        });
        let promise = new Promise((resolve) => {
          deadlineTimer = options.setTimer(() => resolve("deadline"), timeoutMs);
        });
        let winner = await Promise.race([call.reply, promise]);
        let stats = {
          rttMs: options.now() - issuedAt,
          errorRepliesIgnored: call.errorRepliesIgnored(),
          malformedRepliesIgnored: call.malformedRepliesIgnored(),
        };
        if (winner === "deadline") {
          options.registry.recordMiss(instanceId, generation);
          call.reply.catch(() => {});
          call.cancel();
          reportOutcome(spec, "deadline", stats);
          if (generation !== options.registry.generation()) return {};
          return withOnceNotice(
            `deadline:${spec.event}`,
            `A ${spec.event} hook on ${machine} did not answer within ${Math.round(timeoutMs / 1000)}s; continuing without it. If it keeps missing, hooks from that machine pause until it registers again.`,
            {},
          );
        }
        if ("malformed" in winner) {
          reportOutcome(spec, "malformed", stats);
          return {};
        }
        if (!ownerStillThere()) {
          reportOutcome(spec, "owner_gone", stats);
          return {};
        }
        options.registry.recordHit(instanceId);
        let { answer, report } = parseHookJsonOutput(winner.answer, spec.event);
        reportOutcome(spec, "answered", {
          ...stats,
          fieldsDropped: report.dropped.length > 0 || report.truncated.length > 0,
          blocked: isBlockingHookOutput(answer),
        });
        if (options.registry.isAway(instanceId)) return answer;
        let context = {
          event: spec.event,
          agentId: json.agent_id,
          machine,
          inTurn: turnContext !== undefined,
        };
        return safeAwayNotice(answer, () => absence.answered(context, answer));
      } catch (error) {
        if (isAbortError(error)) {
          reportOutcome(spec, "aborted");
          throw error;
        }
        logForDebugging(`Device hook ${spec.id}: forwarding failed internally: ${errorMessage(error)}`, {
          level: "error",
        });
        reportOutcome(spec, "internal_error");
        return {};
      } finally {
        deadlineTimer?.clear();
      }
    };
  return {
    forwardToDevice: forwardForSite,
    installForOwner(owner) {
      noticedEvents.clear();
      let generation = options.registry.generation();
      let hooksByEvent = {};
      for (let entry of owner.entries) {
        let eventHooks = hooksByEvent[entry.event] ?? [];
        eventHooks.push({
          ...(entry.matcher !== undefined && {
            matcher: entry.matcher,
          }),
          hooks: [
            {
              type: "callback",
              timeout: deviceHookDeadlineSec(entry),
              callback: forwardForSite(owner.instanceId, entry, generation),
            },
          ],
        });
        hooksByEvent[entry.event] = eventHooks;
      }
      install(owner.instanceId, hooksByEvent, "forwarded");
    },
    removeForOwner(instanceId) {
      remove(instanceId, "forwarded");
    },
  };
}
//@ chunk-tdcrpxkn.js:12449-12570 placement
function safeAwayNotice(answer, notify) {
  try {
    return notify();
  } catch (error) {
    logError(
      Error("Device hooks: the away notice failed internally", {
        cause: error,
      }),
    );
    return answer;
  }
}
//@ chunk-tdcrpxkn.js:12570-12655 placement
function productionForwarderTimer(callback, delayMs) {
  let timer = setTimeout(callback, delayMs);
  timer.unref();
  return {
    clear: () => clearTimeout(timer),
  };
}
//@ chunk-tdcrpxkn.js:12655-12693 placement
var realpathDefault = (path) => realpath(path);
var readlinkDefault = (path) => readlink(path);
var MAX_LINK_RESOLVE_STEPS = 40;
//@ chunk-tdcrpxkn.js:12693-12864 placement
async function realpathToolInputPaths(input, toolAliases, deps) {
  let calls = "tool_calls" in input && Array.isArray(input.tool_calls) ? input.tool_calls : [input];
  let allResolved = true;
  for (let call of calls) {
    let toolInputPathField = getToolInputPathField(call, toolAliases);
    if (toolInputPathField !== null && !(await realpathPathField(toolInputPathField, deps)))
      allResolved = false;
  }
  return allResolved;
}
//@ chunk-tdcrpxkn.js:12864-13208 placement
/**
 * 从 hook 输入中取出工具参数里的路径字段。
 */
function getToolInputPathField(call, toolAliases) {
  if (
    typeof call !== "object" ||
    call === null ||
    !("tool_name" in call) ||
    typeof call.tool_name !== "string"
  )
    return null;
  let toolInput = "tool_input" in call ? call.tool_input : undefined;
  if (typeof toolInput !== "object" || toolInput === null) return null;
  let pathField = toolPathFieldInput(call.tool_name, toolAliases);
  if (pathField === undefined) return null;
  let fields = toolInput;
  let value = fields[pathField];
  return typeof value === "string" && posix.isAbsolute(value)
    ? {
        fields,
        member: pathField,
        value,
      }
    : null;
}
//@ chunk-tdcrpxkn.js:13208-13639 placement
/**
 * 把工具输入中的绝对路径字段替换为真实路径：逐级向上找到存在的祖先求 realpath，遇到符号链接时按链接目标重算，超过次数返回 false。
 */
async function realpathPathField({ fields, member, value }, deps) {
  let normalized = posix.normalize(value);
  let missingParts = [];
  for (let j = 0; j <= MAX_LINK_RESOLVE_STEPS; j++)
    try {
      let realPath = await deps.realpath(normalized);
      let resolvedPath = missingParts.length === 0 ? realPath : posix.join(realPath, ...missingParts);
      if (resolvedPath !== value) fields[member] = resolvedPath;
      return true;
    } catch {
      let linkTarget = await deps.readlink(normalized).catch(() => null);
      if (linkTarget !== null) {
        let dir = posix.dirname(normalized);
        let parentReal = await deps.realpath(dir).catch(() => dir);
        normalized = posix.normalize(posix.join(posix.resolve(parentReal, linkTarget), ...missingParts));
        missingParts = [];
        continue;
      }
      let dir = posix.dirname(normalized);
      if (dir === normalized) return true;
      missingParts.unshift(posix.basename(normalized));
      normalized = dir;
    }
  return false;
}
export { DEVICE_HOOK_DEFAULT_S, createDeviceHookForwarder, productionForwarderTimer };
