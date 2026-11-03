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
import { registerDeviceHookCallbacks, der } from "./deviceHooks/templates.js";
import { createRemoteHookPauseNotifier } from "../../entrypoints/sdk/coreSchemas.js";
import { clone } from "../slowOperations.js";
import { escapeJsLineTerminators } from "../../cli/ndjsonSafeStringify.js";
import { logForDebugging } from "../debug.js";
import { jZs } from "./hookEventSets.js";
import { forwardedUnderMatchingToolName } from "../hooks.js";
import { parseHookJsonOutput, isBlockingHookOutput } from "./hookSpecificOutput.js";
import { isAbortError, errorMessage } from "../errors.js";
import { logError } from "../log.js";
import { j$n } from "./hookInputPaths.js";

//@ chunk-hyjyj8hj.js:8521-8746 placement
var MAX_DEVICE_HOOK_INPUT_BYTES = 1044480,
  DEVICE_HOOK_DEFAULT_S = {
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
  },
  DEVICE_HOOK_TIMEOUT_SLACK_MS = 5000,
  DEVICE_HOOK_DEADLINE_SLACK_S = 30;
//@ chunk-hyjyj8hj.js:8746-8802 placement
function ae(e) {
  return (e.timeoutS ?? DEVICE_HOOK_DEFAULT_S[e.event]) * 1000 + DEVICE_HOOK_TIMEOUT_SLACK_MS;
}
//@ chunk-hyjyj8hj.js:8802-8849 placement
function Pe(e) {
  return Math.ceil(ae(e) / 1000) + DEVICE_HOOK_DEADLINE_SLACK_S;
}
/**
 * 创建设备钩子转发器：把 PreToolUse 等钩子输入转发到附着机器执行，处理过大/不可克隆输入、路径无法解析、超时与主人离开。
 */
//@ chunk-hyjyj8hj.js:8849-12449 placement
function createDeviceHookForwarder(e) {
  let o = e.install ?? registerDeviceHookCallbacks,
    n = e.remove ?? der,
    r = e.absence ?? createRemoteHookPauseNotifier(),
    c = new Set(),
    a = () => e.registry.current()?.displayName ?? "the attached machine",
    f = (u, i, p) => (c.has(u) ? p : (c.add(u), { ...p, systemMessage: i })),
    s = (u, i, p = {}) =>
      e.telemetry.forwarded({
        event: u.event,
        outcome: i,
        fieldsDropped: p.fieldsDropped ?? !1,
        blocked: p.blocked ?? !1,
        rttMs: p.rttMs ?? 0,
        errorRepliesIgnored: p.errorRepliesIgnored ?? 0,
        malformedRepliesIgnored: p.malformedRepliesIgnored ?? 0,
      }),
    h =
      (u, i, p = e.registry.generation()) =>
      async (m, g, k, _, y) => {
        let j = () => {
          let b = e.registry.current();
          return (
            b !== null &&
            b.instanceId === u &&
            e.now() < b.leaseExpiresAt &&
            b.entries.some((entry) => entry.id === i.id)
          );
        };
        if (!j()) return (s(i, "owner_gone"), {});
        if (e.registry.isAway(u))
          return (
            s(i, "away_skipped"),
            safeAwayNotice({}, () =>
              r.skipped({ event: i.event, agentId: m.agent_id, machine: a(), inTurn: y !== void 0 }, u),
            )
          );
        let T = null,
          B = 0,
          W = !1;
        try {
          let b = clone(m);
          ((W = !(await realpathToolInputPaths(b, e.toolAliases(), {
            realpath: e.realpath ?? Se,
            readlink: e.readlink ?? ve,
          }))),
            (B = Buffer.byteLength(escapeJsLineTerminators(b), "utf8")),
            (T = b));
        } catch {}
        let H = B > MAX_DEVICE_HOOK_INPUT_BYTES;
        if (T === null || H)
          return (
            logForDebugging(
              `Device hook ${i.id}: input ${H ? "exceeds what the device accepts" : "is not plain serialisable data"}; not forwarded`,
              { level: "warn" },
            ),
            s(i, H ? "input_too_large" : "input_unclonable"),
            i.event === "PreToolUse"
              ? {
                  hookSpecificOutput: {
                    hookEventName: "PreToolUse",
                    permissionDecision: "deny",
                    permissionDecisionReason: `[hook on ${e.registry.current()?.displayName ?? "your machine"}]: not run \u2014 the tool call ${H ? "is too large to forward to the attached machine; retry with a smaller input" : "could not be forwarded to the attached machine; retry with plain input"}`,
                  },
                }
              : {}
          );
        if (W)
          return (
            s(i, "input_unresolvable"),
            i.event === "PreToolUse"
              ? {
                  hookSpecificOutput: {
                    hookEventName: "PreToolUse",
                    permissionDecision: "deny",
                    permissionDecisionReason: `[hook on ${e.registry.current()?.displayName ?? "your machine"}]: not run \u2014 the path this tool call names could not be resolved for the attached machine; retry with a plain path`,
                  },
                }
              : {}
          );
        if (jZs(T, e.toolAliases())) return (s(i, "after_edit_held"), {});
        let J;
        try {
          let now = e.now(),
            O = a(),
            N = ae(i),
            sendDeviceHookCallback = e.sender.sendDeviceHookCallback({
              callbackId: i.id,
              input: forwardedUnderMatchingToolName(T, i.matcher, e.toolAliases()),
              toolUseID: g,
              issuedAt: now,
              deadlineMs: N,
              ...(k !== void 0 && { signal: k }),
            }),
            promise = new Promise((ue) => {
              J = e.setTimer(() => ue("deadline"), N);
            }),
            winner = await Promise.race([sendDeviceHookCallback.reply, promise]),
            I = {
              rttMs: e.now() - now,
              errorRepliesIgnored: sendDeviceHookCallback.errorRepliesIgnored(),
              malformedRepliesIgnored: sendDeviceHookCallback.malformedRepliesIgnored(),
            };
          if (winner === "deadline") {
            if (
              (e.registry.recordMiss(u, p),
              sendDeviceHookCallback.reply.catch(() => {}),
              sendDeviceHookCallback.cancel(),
              s(i, "deadline", I),
              p !== e.registry.generation())
            )
              return {};
            return f(
              `deadline:${i.event}`,
              `A ${i.event} hook on ${O} did not answer within ${Math.round(N / 1000)}s; continuing without it. If it keeps missing, hooks from that machine pause until it registers again.`,
              {},
            );
          }
          if ("malformed" in winner) return (s(i, "malformed", I), {});
          if (!j()) return (s(i, "owner_gone", I), {});
          e.registry.recordHit(u);
          let { answer: answer, report: report } = parseHookJsonOutput(winner.answer, i.event);
          if (
            (s(i, "answered", {
              ...I,
              fieldsDropped: report.dropped.length > 0 || report.truncated.length > 0,
              blocked: isBlockingHookOutput(answer),
            }),
            e.registry.isAway(u))
          )
            return answer;
          let ce = { event: i.event, agentId: T.agent_id, machine: O, inTurn: y !== void 0 };
          return safeAwayNotice(answer, () => r.answered(ce, answer));
        } catch (error) {
          if (isAbortError(error)) throw (s(i, "aborted"), error);
          return (
            logForDebugging(`Device hook ${i.id}: forwarding failed internally: ${errorMessage(error)}`, {
              level: "error",
            }),
            s(i, "internal_error"),
            {}
          );
        } finally {
          J?.clear();
        }
      };
  return {
    forwardToDevice: h,
    installForOwner(u) {
      c.clear();
      let generation = e.registry.generation(),
        p = {};
      for (let entry of u.entries) {
        let g = p[entry.event] ?? [];
        (g.push({
          ...(entry.matcher !== void 0 && { matcher: entry.matcher }),
          hooks: [{ type: "callback", timeout: Pe(entry), callback: h(u.instanceId, entry, generation) }],
        }),
          (p[entry.event] = g));
      }
      o(u.instanceId, p, "forwarded");
    },
    removeForOwner(u) {
      n(u, "forwarded");
    },
  };
}
//@ chunk-hyjyj8hj.js:12449-12570 placement
function safeAwayNotice(e, o) {
  try {
    return o();
  } catch (error) {
    return (logError(Error("Device hooks: the away notice failed internally", { cause: error })), e);
  }
}
//@ chunk-hyjyj8hj.js:12570-12655 placement
function productionForwarderTimer(e, o) {
  let n = setTimeout(e, o);
  return (n.unref(), { clear: () => clearTimeout(n) });
}
//@ chunk-hyjyj8hj.js:12655-12693 placement
var Se = (e) => realpath(e),
  ve = (e) => readlink(e),
  Te = 40;
//@ chunk-hyjyj8hj.js:12693-12864 placement
async function realpathToolInputPaths(e, o, n) {
  let r = "tool_calls" in e && Array.isArray(e.tool_calls) ? e.tool_calls : [e],
    c = !0;
  for (let a of r) {
    let f = getToolInputPathField(a, o);
    if (f !== null && !(await realpathPathField(f, n))) c = !1;
  }
  return c;
}
/**
 * 从 hook 输入中取出工具参数里的路径字段。
 */
//@ chunk-hyjyj8hj.js:12864-13208 placement
function getToolInputPathField(e, o) {
  if (typeof e !== "object" || e === null || !("tool_name" in e) || typeof e.tool_name !== "string")
    return null;
  let n = "tool_input" in e ? e.tool_input : void 0;
  if (typeof n !== "object" || n === null) return null;
  let r = j$n(e.tool_name, o);
  if (r === void 0) return null;
  let c = n,
    a = c[r];
  return typeof a === "string" && posix.isAbsolute(a) ? { fields: c, member: r, value: a } : null;
}
/**
 * 把工具输入中的绝对路径字段替换为真实路径：逐级向上找到存在的祖先求 realpath，遇到符号链接时按链接目标重算，超过次数返回 false。
 */
//@ chunk-hyjyj8hj.js:13208-13639 placement
async function realpathPathField({ fields: fields, member: member, value: n }, r) {
  let normalized = posix.normalize(n),
    a = [];
  for (let f = 0; f <= Te; f++)
    try {
      let realpath = await r.realpath(normalized),
        h = a.length === 0 ? realpath : posix.join(realpath, ...a);
      if (h !== n) fields[member] = h;
      return !0;
    } catch {
      let s = await r.readlink(normalized).catch(() => null);
      if (s !== null) {
        let dir = posix.dirname(normalized),
          i = await r.realpath(dir).catch(() => dir);
        ((normalized = posix.normalize(posix.join(posix.resolve(i, s), ...a))), (a = []));
        continue;
      }
      let dir = posix.dirname(normalized);
      if (dir === normalized) return !0;
      (a.unshift(posix.basename(normalized)), (normalized = dir));
    }
  return !1;
}

export { DEVICE_HOOK_DEFAULT_S };
