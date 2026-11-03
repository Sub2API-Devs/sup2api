/**
 * utils/hooks/deviceHookForwarder.ts
 *
 * 2.1.316 新增：设备钩子转发器：把钩子输入转发到附着的机器执行（大小/可克隆检查、超时、主人离开）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hyjyj8hj.js (10)
 * attribution: placement 10
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

//@ chunk-hyjyj8hj.js:8521-8746 placement
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
//@ chunk-hyjyj8hj.js:8746-8802 placement
function deviceHookTimeoutMs(e) {
  return (e.timeoutS ?? DEVICE_HOOK_DEFAULT_S[e.event]) * 1000 + DEVICE_HOOK_TIMEOUT_SLACK_MS;
}
//@ chunk-hyjyj8hj.js:8802-8849 placement
function deviceHookDeadlineSec(entry) {
  return Math.ceil(deviceHookTimeoutMs(entry) / 1000) + DEVICE_HOOK_DEADLINE_SLACK_S;
}
//@ chunk-hyjyj8hj.js:8849-12449 placement
/**
 * 创建设备钩子转发器：把 PreToolUse 等钩子输入转发到附着机器执行，处理过大/不可克隆输入、路径无法解析、超时与主人离开。
 */
function createDeviceHookForwarder(e) {
  let install = e.install ?? registerDeviceHookCallbacks;
  let remove = e.remove ?? unregisterDeviceHookCallbacks;
  let r = e.absence ?? createRemoteHookPauseNotifier();
  let c = new Set();
  let a = () => e.registry.current()?.displayName ?? "the attached machine";
  let f = (u, systemMessage, p) =>
    c.has(u)
      ? p
      : (c.add(u),
        {
          ...p,
          systemMessage,
        });
  let s = (u, outcome, p = {}) =>
    e.telemetry.forwarded({
      event: u.event,
      outcome,
      fieldsDropped: p.fieldsDropped ?? false,
      blocked: p.blocked ?? false,
      rttMs: p.rttMs ?? 0,
      errorRepliesIgnored: p.errorRepliesIgnored ?? 0,
      malformedRepliesIgnored: p.malformedRepliesIgnored ?? 0,
    });
  let h =
    (instanceId, entry, p = e.registry.generation()) =>
    async (m, toolUseID, k, _, y) => {
      let j = () => {
        let b = e.registry.current();
        return (
          b !== null &&
          b.instanceId === instanceId &&
          e.now() < b.leaseExpiresAt &&
          b.entries.some((entry_2) => entry_2.id === entry.id)
        );
      };
      if (!j()) {
        s(entry, "owner_gone");
        return {};
      }
      if (e.registry.isAway(instanceId)) {
        s(entry, "away_skipped");
        return safeAwayNotice({}, () =>
          r.skipped(
            {
              event: entry.event,
              agentId: m.agent_id,
              machine: a(),
              inTurn: y !== undefined,
            },
            instanceId,
          ),
        );
      }
      let T = null;
      let B = 0;
      let W = false;
      try {
        let json = clone(m);
        W = !(await realpathToolInputPaths(json, e.toolAliases(), {
          realpath: e.realpath ?? realpathDefault,
          readlink: e.readlink ?? readlinkDefault,
        }));
        B = Buffer.byteLength(escapeJsLineTerminators(json), "utf8");
        T = json;
      } catch {}
      let H = B > MAX_DEVICE_HOOK_INPUT_BYTES;
      if (T === null || H) {
        logForDebugging(
          `Device hook ${entry.id}: input ${H ? "exceeds what the device accepts" : "is not plain serialisable data"}; not forwarded`,
          {
            level: "warn",
          },
        );
        s(entry, H ? "input_too_large" : "input_unclonable");
        return entry.event === "PreToolUse"
          ? {
              hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "deny",
                permissionDecisionReason: `[hook on ${e.registry.current()?.displayName ?? "your machine"}]: not run \u2014 the tool call ${H ? "is too large to forward to the attached machine; retry with a smaller input" : "could not be forwarded to the attached machine; retry with plain input"}`,
              },
            }
          : {};
      }
      if (W) {
        s(entry, "input_unresolvable");
        return entry.event === "PreToolUse"
          ? {
              hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision: "deny",
                permissionDecisionReason: `[hook on ${e.registry.current()?.displayName ?? "your machine"}]: not run \u2014 the path this tool call names could not be resolved for the attached machine; retry with a plain path`,
              },
            }
          : {};
      }
      if (isCodeEditingHookPayload(T, e.toolAliases())) {
        s(entry, "after_edit_held");
        return {};
      }
      let J;
      try {
        let b = e.now();
        let O = a();
        let N = deviceHookTimeoutMs(entry);
        let R = e.sender.sendDeviceHookCallback({
          callbackId: entry.id,
          input: forwardedUnderMatchingToolName(T, entry.matcher, e.toolAliases()),
          toolUseID,
          issuedAt: b,
          deadlineMs: N,
          ...(k !== undefined && {
            signal: k,
          }),
        });
        let promise = new Promise((resolve) => {
          J = e.setTimer(() => resolve("deadline"), N);
        });
        let winner = await Promise.race([R.reply, promise]);
        let I = {
          rttMs: e.now() - b,
          errorRepliesIgnored: R.errorRepliesIgnored(),
          malformedRepliesIgnored: R.malformedRepliesIgnored(),
        };
        if (winner === "deadline") {
          e.registry.recordMiss(instanceId, p);
          R.reply.catch(() => {});
          R.cancel();
          s(entry, "deadline", I);
          if (p !== e.registry.generation()) return {};
          return f(
            `deadline:${entry.event}`,
            `A ${entry.event} hook on ${O} did not answer within ${Math.round(N / 1000)}s; continuing without it. If it keeps missing, hooks from that machine pause until it registers again.`,
            {},
          );
        }
        if ("malformed" in winner) {
          s(entry, "malformed", I);
          return {};
        }
        if (!j()) {
          s(entry, "owner_gone", I);
          return {};
        }
        e.registry.recordHit(instanceId);
        let { answer, report } = parseHookJsonOutput(winner.answer, entry.event);
        s(entry, "answered", {
          ...I,
          fieldsDropped: report.dropped.length > 0 || report.truncated.length > 0,
          blocked: isBlockingHookOutput(answer),
        });
        if (e.registry.isAway(instanceId)) return answer;
        let ce = {
          event: entry.event,
          agentId: T.agent_id,
          machine: O,
          inTurn: y !== undefined,
        };
        return safeAwayNotice(answer, () => r.answered(ce, answer));
      } catch (error) {
        if (isAbortError(error)) {
          s(entry, "aborted");
          throw error;
        }
        logForDebugging(`Device hook ${entry.id}: forwarding failed internally: ${errorMessage(error)}`, {
          level: "error",
        });
        s(entry, "internal_error");
        return {};
      } finally {
        J?.clear();
      }
    };
  return {
    forwardToDevice: h,
    installForOwner(u) {
      c.clear();
      let i = e.registry.generation();
      let p = {};
      for (let entry of u.entries) {
        let g = p[entry.event] ?? [];
        g.push({
          ...(entry.matcher !== undefined && {
            matcher: entry.matcher,
          }),
          hooks: [
            {
              type: "callback",
              timeout: deviceHookDeadlineSec(entry),
              callback: h(u.instanceId, entry, i),
            },
          ],
        });
        p[entry.event] = g;
      }
      install(u.instanceId, p, "forwarded");
    },
    removeForOwner(u) {
      remove(u, "forwarded");
    },
  };
}
//@ chunk-hyjyj8hj.js:12449-12570 placement
function safeAwayNotice(answer, o) {
  try {
    return o();
  } catch (error) {
    logError(
      Error("Device hooks: the away notice failed internally", {
        cause: error,
      }),
    );
    return answer;
  }
}
//@ chunk-hyjyj8hj.js:12570-12655 placement
function productionForwarderTimer(e, o) {
  let timer = setTimeout(e, o);
  timer.unref();
  return {
    clear: () => clearTimeout(timer),
  };
}
//@ chunk-hyjyj8hj.js:12655-12693 placement
var realpathDefault = (e) => realpath(e);
var readlinkDefault = (e) => readlink(e);
var MAX_LINK_RESOLVE_STEPS = 40;
//@ chunk-hyjyj8hj.js:12693-12864 placement
async function realpathToolInputPaths(e, o, n) {
  let r = "tool_calls" in e && Array.isArray(e.tool_calls) ? e.tool_calls : [e];
  let c = true;
  for (let a of r) {
    let toolInputPathField = getToolInputPathField(a, o);
    if (toolInputPathField !== null && !(await realpathPathField(toolInputPathField, n))) c = false;
  }
  return c;
}
//@ chunk-hyjyj8hj.js:12864-13208 placement
/**
 * 从 hook 输入中取出工具参数里的路径字段。
 */
function getToolInputPathField(e, o) {
  if (typeof e !== "object" || e === null || !("tool_name" in e) || typeof e.tool_name !== "string")
    return null;
  let toolInput = "tool_input" in e ? e.tool_input : undefined;
  if (typeof toolInput !== "object" || toolInput === null) return null;
  let r = toolPathFieldInput(e.tool_name, o);
  if (r === undefined) return null;
  let c = toolInput;
  let a = c[r];
  return typeof a === "string" && posix.isAbsolute(a)
    ? {
        fields: c,
        member: r,
        value: a,
      }
    : null;
}
//@ chunk-hyjyj8hj.js:13208-13639 placement
/**
 * 把工具输入中的绝对路径字段替换为真实路径：逐级向上找到存在的祖先求 realpath，遇到符号链接时按链接目标重算，超过次数返回 false。
 */
async function realpathPathField({ fields, member, value: n }, r) {
  let normalized = posix.normalize(n);
  let a = [];
  for (let j = 0; j <= MAX_LINK_RESOLVE_STEPS; j++)
    try {
      let s = await r.realpath(normalized);
      let h = a.length === 0 ? s : posix.join(s, ...a);
      if (h !== n) fields[member] = h;
      return true;
    } catch {
      let s = await r.readlink(normalized).catch(() => null);
      if (s !== null) {
        let dir = posix.dirname(normalized);
        let i = await r.realpath(dir).catch(() => dir);
        normalized = posix.normalize(posix.join(posix.resolve(i, s), ...a));
        a = [];
        continue;
      }
      let dir = posix.dirname(normalized);
      if (dir === normalized) return true;
      a.unshift(posix.basename(normalized));
      normalized = dir;
    }
  return false;
}
export { DEVICE_HOOK_DEFAULT_S };
