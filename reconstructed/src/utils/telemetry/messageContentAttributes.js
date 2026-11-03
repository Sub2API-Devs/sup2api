/**
 * utils/telemetry/messageContentAttributes.ts
 *
 * 2.1.316 新增：消息内容遥测属性与 OTel 上下文管理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p52gp8zk.js (19)
 * attribution: placement 19
 */
import { AsyncLocalStorage } from "async_hooks";
import { v, applyRedactions, notRecordedLength, O } from "./accountMemoryRedaction.js";
import { isTrustedMemoryTool, Dcr } from "../../services/mcp/memoryServerVerification.js";
import { jsonStringify } from "../slowOperations.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { Ol } from "../../../vendor/@opentelemetry/api/build/src/index.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-p52gp8zk.js:12080-12358 placement
function collectToolUseIds(e, n, o = e) {
  let r = new Set();
  for (let s of o) {
    if (s.role !== "assistant" || typeof s.content === "string") continue;
    for (let c of s.content) {
      let id = v(c).id;
      if (isTrustedMemoryToolUse(c, n) && typeof id === "string") r.add(id);
    }
  }
  return e.map((s) => {
    let c = redactMessageContent_2(s.content, n, r);
    return c === s.content ? s : { ...s, content: c };
  });
}
//@ chunk-p52gp8zk.js:12358-12399 placement
function redactMessageContent(e, n) {
  return redactContentBlocks(e, n, new Set());
}
//@ chunk-p52gp8zk.js:12399-12439 placement
function redactMessageFields(e, n) {
  return redactMessageContent_2(e, n, new Set());
}
//@ chunk-p52gp8zk.js:12439-12548 placement
function redactMessageContent_2(e, n, o) {
  if (typeof e === "string") return applyRedactions(e, n);
  let r = redactContentBlocks(e, n, o);
  return r.every((s, c) => s === e[c]) ? e : r;
}
/**
 * 逐块处理消息内容（文本、思考、工具输入/结果）以便记录到遥测并去除敏感信息。
 */
//@ chunk-p52gp8zk.js:12548-13206 placement
function redactContentBlocks(e, n, o) {
  return e.map((r) => {
    let { text: text, thinking: thinking, input: input, tool_use_id: tool_use_id, content: content } = v(r);
    if (
      (r.type === "text" && typeof text === "string") ||
      (r.type === "thinking" && typeof thinking === "string")
    ) {
      let m = redactValue(r, n, 0);
      return m === r ? r : m;
    }
    if (r.type === "tool_use" || r.type === "server_tool_use") {
      if (isTrustedMemoryToolUse(r, n))
        return { ...r, input: { not_recorded: notRecordedLength(pe(input)) } };
      let m = redactValue(input, n, 0);
      return m === input ? r : { ...r, input: m };
    }
    if (r.type === "tool_result" && content !== void 0 && content !== null) {
      if (typeof tool_use_id === "string" && o.has(tool_use_id))
        return { ...r, content: notRecordedLength(typeof content === "string" ? content : pe(content)) };
      if (typeof content === "string" || Array.isArray(content)) {
        let m = redactMessageContent_2(content, n, o);
        return m === content ? r : { ...r, content: m };
      }
    }
    if (qe.has(r.type) || isBase64Document(r)) return r;
    let y = redactValue(r, n, 0);
    return y === r ? r : y;
  });
}
//@ chunk-p52gp8zk.js:13206-13271 placement
var qe = new Set(["image", "redacted_thinking", "container_upload"]);
//@ chunk-p52gp8zk.js:13271-13382 placement
function isBase64Document(e) {
  let { source: source } = v(e);
  return e.type === "document" && typeof source === "object" && source !== null && source.type === "base64";
}
//@ chunk-p52gp8zk.js:13382-13528 placement
function isTrustedMemoryToolUse(e, n) {
  let { name: o } = v(e);
  return (
    (e.type === "tool_use" || e.type === "server_tool_use") &&
    typeof o === "string" &&
    isTrustedMemoryTool(o, Dcr(n.toolNames), "history")
  );
}
//@ chunk-p52gp8zk.js:13528-13537 placement
var Ze = 6;
//@ chunk-p52gp8zk.js:13537-13876 placement
function redactValue(e, n, o) {
  if (typeof e === "string") return applyRedactions(e, n);
  if (typeof e !== "object" || e === null) return e;
  if (o >= Ze) return O;
  if (Array.isArray(e)) {
    let mapped = e.map((u) => redactValue(u, n, o + 1));
    return mapped.every((u, f) => u === e[f]) ? e : mapped;
  }
  let r = !1,
    mapped = Object.entries(e).map(([c, u]) => {
      let f = applyRedactions(c, n),
        a = redactValue(u, n, o + 1);
      return ((r ||= a !== u || f !== c), [f, a]);
    });
  return r ? Object.fromEntries(mapped) : e;
}
//@ chunk-p52gp8zk.js:13876-13927 placement
function pe(e) {
  try {
    return jsonStringify(e) ?? "";
  } catch {
    return "";
  }
}
//@ chunk-p52gp8zk.js:13927-13944 placement
var z = Re(Ol(), 1);
//@ chunk-p52gp8zk.js:13993-14422 placement
class AsyncLocalContextManager {
  als = new AsyncLocalStorage();
  active() {
    return this.als.getStore() ?? z.ROOT_CONTEXT;
  }
  with(e, n, o, ...r) {
    let s = o == null ? n : n.bind(o);
    return this.als.run(e, s, ...r);
  }
  enterWith(e) {
    this.als.enterWith(e);
  }
  bind(e, n) {
    if (typeof n === "function") {
      let o = (...r) => this.with(e, () => n(...r));
      return (
        Object.defineProperty(o, "length", {
          configurable: !0,
          enumerable: !1,
          writable: !1,
          value: n.length,
        }),
        o
      );
    }
    return n;
  }
  enable() {
    return this;
  }
  disable() {
    return (this.als.disable(), this);
  }
}
//@ chunk-p52gp8zk.js:14422-14437 placement
var otelContextManager = new AsyncLocalContextManager();
//@ chunk-p52gp8zk.js:14437-14461 placement
class Te {
  current = void 0;
}
//@ chunk-p52gp8zk.js:14461-14486 placement
var he = new HostScoped(() => new Te());
//@ chunk-p52gp8zk.js:14486-14528 placement
function setHostOtelContext(e) {
  he.of(getRootSession().host).current = e;
}
//@ chunk-p52gp8zk.js:14528-14574 placement
function getHostOtelContext() {
  return he.of(getRootSession().host).current;
}
//@ chunk-p52gp8zk.js:14574-14655 placement
function activeOtelContext() {
  let active = otelContextManager.active();
  if (active !== z.ROOT_CONTEXT) return active;
  return getHostOtelContext() ?? active;
}

export {
  otelContextManager,
  activeOtelContext,
  setHostOtelContext,
  getHostOtelContext,
  collectToolUseIds,
  redactMessageFields,
  redactMessageContent,
};
