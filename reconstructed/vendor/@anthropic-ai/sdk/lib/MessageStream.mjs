/**
 * @anthropic-ai/sdk/lib/MessageStream.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { Kn, ke } from "../internal/tslib.mjs";
import { Kje } from "../internal/errors.mjs";
import { Lf, pr } from "../core/error.mjs";
import { X_STAINLESS_HELPER_METHOD } from "../internal/stainless-helper-header.mjs";
import { St } from "../core/streaming.mjs";
import { Bt_hwms } from "../tools/agent-toolset/memories.mjs";
import { La } from "./parser.mjs";
import { Gt, Is } from "../internal/message-stream-utils.mjs";

//@ chunk-hwmsct5x.js:147532-147611 esm-layout
var ft, Kt, Wn, yo, oi, wo, So, si, Eo, At, vo, ii, ai, pn, li, ui, di, Ro, Da, wd, Ua, Na, Ba, Ha, Sd;
//@ chunk-hwmsct5x.js:147611-147681 esm-fingerprint
function $a(e) {
  return e.type === "tool_use" || e.type === "server_tool_use";
}
//@ chunk-hwmsct5x.js:147681-156923 esm-fingerprint
var Ed = (() => {
  class e {
    constructor(n, r) {
      (ft.add(this),
        (this.messages = []),
        (this.receivedMessages = []),
        Kt.set(this, void 0),
        Wn.set(this, null),
        (this.controller = new AbortController()),
        yo.set(this, void 0),
        oi.set(this, () => {}),
        wo.set(this, () => {}),
        So.set(this, void 0),
        si.set(this, () => {}),
        Eo.set(this, () => {}),
        At.set(this, {}),
        vo.set(this, !1),
        ii.set(this, !1),
        ai.set(this, !1),
        pn.set(this, !1),
        li.set(this, void 0),
        ui.set(this, void 0),
        di.set(this, void 0),
        Ro.set(this, void 0),
        Ua.set(this, (s) => {
          if ((Kn(this, ii, !0, "f"), Kje(s))) s = new Lf();
          if (s instanceof Lf) return (Kn(this, ai, !0, "f"), this._emit("abort", s));
          if (s instanceof pr) return this._emit("error", s);
          if (s instanceof Error) {
            let h = new pr(s.message);
            return ((h.cause = s), this._emit("error", h));
          }
          return this._emit("error", new pr(String(s)));
        }),
        Kn(
          this,
          yo,
          new Promise((s, h) => {
            (Kn(this, oi, s, "f"), Kn(this, wo, h, "f"));
          }),
          "f",
        ),
        Kn(
          this,
          So,
          new Promise((s, h) => {
            (Kn(this, si, s, "f"), Kn(this, Eo, h, "f"));
          }),
          "f",
        ),
        ke(this, yo, "f").catch(() => {}),
        ke(this, So, "f").catch(() => {}),
        Kn(this, Wn, n, "f"),
        Kn(this, Ro, r?.logger ?? console, "f"));
    }
    get response() {
      return ke(this, li, "f");
    }
    get request_id() {
      return ke(this, ui, "f");
    }
    get workspace_id() {
      return ke(this, di, "f");
    }
    async withResponse() {
      Kn(this, pn, !0, "f");
      let n = await ke(this, yo, "f");
      if (!n) throw Error("Could not resolve a `Response` object");
      return {
        data: this,
        response: n,
        request_id: n.headers.get("request-id"),
        workspace_id: n.headers.get("anthropic-workspace-id"),
      };
    }
    static fromReadableStream(n) {
      let r = new e(null);
      return (r._run(() => r._fromReadableStream(n)), r);
    }
    static createMessage(n, r, s, { logger: h } = {}) {
      let y = new e(r, { logger: h });
      for (let message of r.messages) y._addMessageParam(message);
      return (
        Kn(y, Wn, { ...r, stream: !0 }, "f"),
        y._run(() =>
          y._createMessage(
            n,
            { ...r, stream: !0 },
            { ...s, headers: { ...s?.headers, [X_STAINLESS_HELPER_METHOD]: "stream" } },
          ),
        ),
        y
      );
    }
    _run(n) {
      n().then(
        () => {
          (this._emitFinal(), this._emit("end"));
        },
        ke(this, Ua, "f"),
      );
    }
    _addMessageParam(n) {
      this.messages.push(n);
    }
    _addMessage(n, r = !0) {
      if ((this.receivedMessages.push(n), r)) this._emit("message", n);
    }
    async _createMessage(n, r, s) {
      let h = s?.signal,
        y;
      if (h) {
        if (h.aborted) this.controller.abort();
        ((y = this.controller.abort.bind(this.controller)), h.addEventListener("abort", y));
      }
      try {
        ke(this, ft, "m", Na).call(this);
        let { response: response, data: S } = await n
          .create({ ...r, stream: !0 }, { ...s, signal: this.controller.signal })
          .withResponse();
        this._connected(response);
        for await (let E of S) ke(this, ft, "m", Ba).call(this, E);
        if (S.controller.signal?.aborted) throw new Lf();
        ke(this, ft, "m", Ha).call(this);
      } finally {
        if (h && y) h.removeEventListener("abort", y);
      }
    }
    _connected(n) {
      if (this.ended) return;
      (Kn(this, li, n, "f"),
        Kn(this, ui, n?.headers.get("request-id"), "f"),
        Kn(this, di, n?.headers.get("anthropic-workspace-id"), "f"),
        ke(this, oi, "f").call(this, n),
        this._emit("connect"));
    }
    get ended() {
      return ke(this, vo, "f");
    }
    get errored() {
      return ke(this, ii, "f");
    }
    get aborted() {
      return ke(this, ai, "f");
    }
    abort() {
      this.controller.abort();
    }
    on(n, r) {
      return ((ke(this, At, "f")[n] || (ke(this, At, "f")[n] = [])).push({ listener: r }), this);
    }
    off(n, r) {
      let s = ke(this, At, "f")[n];
      if (!s) return this;
      let index = s.findIndex((y) => y.listener === r);
      if (index >= 0) s.splice(index, 1);
      return this;
    }
    once(n, r) {
      return ((ke(this, At, "f")[n] || (ke(this, At, "f")[n] = [])).push({ listener: r, once: !0 }), this);
    }
    emitted(n) {
      return new Promise((r, s) => {
        if ((Kn(this, pn, !0, "f"), n !== "error")) this.once("error", s);
        this.once(n, r);
      });
    }
    async done() {
      (Kn(this, pn, !0, "f"), await ke(this, So, "f"));
    }
    get currentMessage() {
      return ke(this, Kt, "f");
    }
    async finalMessage() {
      return (await this.done(), ke(this, ft, "m", Da).call(this));
    }
    async finalText() {
      return (await this.done(), ke(this, ft, "m", wd).call(this));
    }
    _emit(n, ...r) {
      if (ke(this, vo, "f")) return;
      if (n === "end") (Kn(this, vo, !0, "f"), ke(this, si, "f").call(this));
      let s = ke(this, At, "f")[n];
      if (s)
        ((ke(this, At, "f")[n] = s.filter((h) => !h.once)),
          s.forEach(({ listener: listener }) => listener(...r)));
      if (n === "abort") {
        let h = r[0];
        if (!ke(this, pn, "f") && !s?.length) Promise.reject(h);
        (ke(this, wo, "f").call(this, h), ke(this, Eo, "f").call(this, h), this._emit("end"));
        return;
      }
      if (n === "error") {
        let h = r[0];
        if (!ke(this, pn, "f") && !s?.length) Promise.reject(h);
        (ke(this, wo, "f").call(this, h), ke(this, Eo, "f").call(this, h), this._emit("end"));
      }
    }
    _emitFinal() {
      if (this.receivedMessages.at(-1)) this._emit("finalMessage", ke(this, ft, "m", Da).call(this));
    }
    async _fromReadableStream(n, r) {
      let s = r?.signal,
        h;
      if (s) {
        if (s.aborted) this.controller.abort();
        ((h = this.controller.abort.bind(this.controller)), s.addEventListener("abort", h));
      }
      try {
        (ke(this, ft, "m", Na).call(this), this._connected(null));
        let fromReadableStream = St.fromReadableStream(n, this.controller);
        for await (let w of fromReadableStream) ke(this, ft, "m", Ba).call(this, w);
        if (fromReadableStream.controller.signal?.aborted) throw new Lf();
        ke(this, ft, "m", Ha).call(this);
      } finally {
        if (s && h) s.removeEventListener("abort", h);
      }
    }
    [((Kt = new WeakMap()),
    (Wn = new WeakMap()),
    (yo = new WeakMap()),
    (oi = new WeakMap()),
    (wo = new WeakMap()),
    (So = new WeakMap()),
    (si = new WeakMap()),
    (Eo = new WeakMap()),
    (At = new WeakMap()),
    (vo = new WeakMap()),
    (ii = new WeakMap()),
    (ai = new WeakMap()),
    (pn = new WeakMap()),
    (li = new WeakMap()),
    (ui = new WeakMap()),
    (di = new WeakMap()),
    (Ro = new WeakMap()),
    (Ua = new WeakMap()),
    (ft = new WeakSet()),
    (Da = function () {
      if (this.receivedMessages.length === 0)
        throw new pr("stream ended without producing a Message with role=assistant");
      return this.receivedMessages.at(-1);
    }),
    (wd = function () {
      if (this.receivedMessages.length === 0)
        throw new pr("stream ended without producing a Message with role=assistant");
      let mapped = this.receivedMessages
        .at(-1)
        .content.filter((s) => s.type === "text")
        .map((s) => s.text);
      if (mapped.length === 0) throw new pr("stream ended without producing a content block with type=text");
      return mapped.join(" ");
    }),
    (Na = function () {
      if (this.ended) return;
      Kn(this, Kt, void 0, "f");
    }),
    (Ba = function (r) {
      if (this.ended) return;
      let s = ke(this, ft, "m", Sd).call(this, r);
      switch ((this._emit("streamEvent", r, s), r.type)) {
        case "content_block_delta": {
          let at = s.content.at(-1);
          switch (r.delta.type) {
            case "text_delta": {
              if (at.type === "text") this._emit("text", r.delta.text, at.text || "");
              break;
            }
            case "citations_delta": {
              if (at.type === "text") this._emit("citation", r.delta.citation, at.citations ?? []);
              break;
            }
            case "input_json_delta": {
              if ($a(at) && ke(this, At, "f").inputJson?.length)
                this._emit("inputJson", r.delta.partial_json, at.input);
              break;
            }
            case "thinking_delta": {
              if (at.type === "thinking") this._emit("thinking", r.delta.thinking, at.thinking);
              break;
            }
            case "signature_delta": {
              if (at.type === "thinking") this._emit("signature", at.signature);
              break;
            }
            default:
              Bt_hwms(r.delta);
          }
          break;
        }
        case "message_stop": {
          (this._addMessageParam(s),
            this._addMessage(La(s, ke(this, Wn, "f"), { logger: ke(this, Ro, "f") }), !0));
          break;
        }
        case "content_block_stop": {
          this._emit("contentBlock", s.content.at(-1));
          break;
        }
        case "message_start": {
          Kn(this, Kt, s, "f");
          break;
        }
        case "content_block_start":
        case "message_delta":
          break;
      }
    }),
    (Ha = function () {
      if (this.ended) throw new pr("stream has ended, this shouldn't happen");
      let r = ke(this, Kt, "f");
      if (!r) throw new pr("request ended without sending any chunks");
      return (Kn(this, Kt, void 0, "f"), La(r, ke(this, Wn, "f"), { logger: ke(this, Ro, "f") }));
    }),
    (Sd = function (r) {
      let s = ke(this, Kt, "f");
      if (r.type === "message_start") {
        if (s) throw new pr(`Unexpected event order, got ${r.type} before receiving "message_stop"`);
        return r.message;
      }
      if (!s) throw new pr(`Unexpected event order, got ${r.type} before "message_start"`);
      switch (r.type) {
        case "message_stop":
          return s;
        case "message_delta":
          if (
            ((s.stop_reason = r.delta.stop_reason),
            (s.stop_sequence = r.delta.stop_sequence),
            (s.stop_details = r.delta.stop_details),
            (s.usage.output_tokens = r.usage.output_tokens),
            r.delta.container != null)
          )
            s.container = r.delta.container;
          if (r.usage.input_tokens != null) s.usage.input_tokens = r.usage.input_tokens;
          if (r.usage.cache_creation_input_tokens != null)
            s.usage.cache_creation_input_tokens = r.usage.cache_creation_input_tokens;
          if (r.usage.cache_read_input_tokens != null)
            s.usage.cache_read_input_tokens = r.usage.cache_read_input_tokens;
          if (r.usage.server_tool_use != null) s.usage.server_tool_use = r.usage.server_tool_use;
          if (r.usage.output_tokens_details != null)
            s.usage.output_tokens_details = r.usage.output_tokens_details;
          return s;
        case "content_block_start":
          return (s.content.push({ ...r.content_block }), s);
        case "content_block_delta": {
          let at = s.content.at(r.index);
          switch (r.delta.type) {
            case "text_delta": {
              if (at?.type === "text") s.content[r.index] = { ...at, text: (at.text || "") + r.delta.text };
              break;
            }
            case "citations_delta": {
              if (at?.type === "text")
                s.content[r.index] = { ...at, citations: [...(at.citations ?? []), r.delta.citation] };
              break;
            }
            case "input_json_delta": {
              if (at && $a(at)) {
                let y = (at[Gt] || "") + r.delta.partial_json;
                s.content[r.index] = Is(at, y);
              }
              break;
            }
            case "thinking_delta": {
              if (at?.type === "thinking")
                s.content[r.index] = { ...at, thinking: at.thinking + r.delta.thinking };
              break;
            }
            case "signature_delta": {
              if (at?.type === "thinking") s.content[r.index] = { ...at, signature: r.delta.signature };
              break;
            }
            default:
              Bt_hwms(r.delta);
          }
          return s;
        }
        case "content_block_stop": {
          let at = s.content.at(r.index);
          if (at && $a(at) && Gt in at)
            Object.defineProperty(at, "input", {
              value: at.input,
              enumerable: !0,
              configurable: !0,
              writable: !0,
            });
          return s;
        }
      }
    }),
    Symbol.asyncIterator)]() {
      let n = [],
        r = [],
        s = !1;
      return (
        this.on("streamEvent", (h) => {
          let y = r.shift();
          if (y) y.resolve(h);
          else n.push(h);
        }),
        this.on("end", () => {
          s = !0;
          for (let h of r) h.resolve(void 0);
          r.length = 0;
        }),
        this.on("abort", (h) => {
          s = !0;
          for (let y of r) y.reject(h);
          r.length = 0;
        }),
        this.on("error", (h) => {
          s = !0;
          for (let y of r) y.reject(h);
          r.length = 0;
        }),
        {
          next: async () => {
            if (!n.length) {
              if (s) return { value: void 0, done: !0 };
              return new Promise((y, w) => r.push({ resolve: y, reject: w })).then((y) =>
                y ? { value: y, done: !1 } : { value: void 0, done: !0 },
              );
            }
            return { value: n.shift(), done: !1 };
          },
          return: async () => (this.abort(), { value: void 0, done: !0 }),
        }
      );
    }
    toReadableStream() {
      return new St(this[Symbol.asyncIterator].bind(this), this.controller).toReadableStream();
    }
  }
  return e;
})();

export { Ed };
