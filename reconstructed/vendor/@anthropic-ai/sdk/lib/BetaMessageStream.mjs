/**
 * @anthropic-ai/sdk/lib/BetaMessageStream.mjs
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
import { attachParsedOutput } from "./beta-parser.mjs";
import { Gt, Is } from "../internal/message-stream-utils.mjs";

//@ chunk-hwmsct5x.js:94397-94479 esm-layout
var Xe, Yt, Nn, Gr, Ls, Yr, jr, Fs, Kr, Et, Vr, Ds, Us, ln, Ns, Bs, Hs, Xr, ga, id, Jr, _a, ya, Sa, ad, Ea;
//@ chunk-hwmsct5x.js:94479-94574 esm-fingerprint
function va(e) {
  return e.type === "tool_use" || e.type === "server_tool_use" || e.type === "mcp_tool_use";
}
//@ chunk-hwmsct5x.js:94574-104825 esm-fingerprint
var ld = (() => {
  class e {
    constructor(n, r) {
      (Xe.add(this),
        (this.messages = []),
        (this.receivedMessages = []),
        Yt.set(this, void 0),
        Nn.set(this, null),
        (this.controller = new AbortController()),
        Gr.set(this, void 0),
        Ls.set(this, () => {}),
        Yr.set(this, () => {}),
        jr.set(this, void 0),
        Fs.set(this, () => {}),
        Kr.set(this, () => {}),
        Et.set(this, {}),
        Vr.set(this, !1),
        Ds.set(this, !1),
        Us.set(this, !1),
        ln.set(this, !1),
        Ns.set(this, void 0),
        Bs.set(this, void 0),
        Hs.set(this, void 0),
        Xr.set(this, void 0),
        Jr.set(this, (s) => {
          if ((Kn(this, Ds, !0, "f"), Kje(s))) s = new Lf();
          if (s instanceof Lf) return (Kn(this, Us, !0, "f"), this._emit("abort", s));
          if (s instanceof pr) return this._emit("error", s);
          if (s instanceof Error) {
            let h = new pr(s.message);
            return ((h.cause = s), this._emit("error", h));
          }
          return this._emit("error", new pr(String(s)));
        }),
        Kn(
          this,
          Gr,
          new Promise((s, h) => {
            (Kn(this, Ls, s, "f"), Kn(this, Yr, h, "f"));
          }),
          "f",
        ),
        Kn(
          this,
          jr,
          new Promise((s, h) => {
            (Kn(this, Fs, s, "f"), Kn(this, Kr, h, "f"));
          }),
          "f",
        ),
        ke(this, Gr, "f").catch(() => {}),
        ke(this, jr, "f").catch(() => {}),
        Kn(this, Nn, n, "f"),
        Kn(this, Xr, r?.logger ?? console, "f"));
    }
    get response() {
      return ke(this, Ns, "f");
    }
    get request_id() {
      return ke(this, Bs, "f");
    }
    get workspace_id() {
      return ke(this, Hs, "f");
    }
    async withResponse() {
      Kn(this, ln, !0, "f");
      let n = await ke(this, Gr, "f");
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
        Kn(y, Nn, { ...r, stream: !0 }, "f"),
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
        ke(this, Jr, "f"),
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
        ke(this, Xe, "m", _a).call(this);
        let { response: response, data: S } = await n
          .create({ ...r, stream: !0 }, { ...s, signal: this.controller.signal })
          .withResponse();
        this._connected(response);
        for await (let E of S) ke(this, Xe, "m", ya).call(this, E);
        if (S.controller.signal?.aborted) throw new Lf();
        ke(this, Xe, "m", Sa).call(this);
      } finally {
        if (h && y) h.removeEventListener("abort", y);
      }
    }
    _connected(n) {
      if (this.ended) return;
      (Kn(this, Ns, n, "f"),
        Kn(this, Bs, n?.headers.get("request-id"), "f"),
        Kn(this, Hs, n?.headers.get("anthropic-workspace-id"), "f"),
        ke(this, Ls, "f").call(this, n),
        this._emit("connect"));
    }
    get ended() {
      return ke(this, Vr, "f");
    }
    get errored() {
      return ke(this, Ds, "f");
    }
    get aborted() {
      return ke(this, Us, "f");
    }
    abort() {
      this.controller.abort();
    }
    on(n, r) {
      return ((ke(this, Et, "f")[n] || (ke(this, Et, "f")[n] = [])).push({ listener: r }), this);
    }
    off(n, r) {
      let s = ke(this, Et, "f")[n];
      if (!s) return this;
      let index = s.findIndex((y) => y.listener === r);
      if (index >= 0) s.splice(index, 1);
      return this;
    }
    once(n, r) {
      return ((ke(this, Et, "f")[n] || (ke(this, Et, "f")[n] = [])).push({ listener: r, once: !0 }), this);
    }
    emitted(n) {
      return new Promise((r, s) => {
        if ((Kn(this, ln, !0, "f"), n !== "error")) this.once("error", s);
        this.once(n, r);
      });
    }
    async done() {
      (Kn(this, ln, !0, "f"), await ke(this, jr, "f"));
    }
    get currentMessage() {
      return ke(this, Yt, "f");
    }
    async finalMessage() {
      return (await this.done(), ke(this, Xe, "m", ga).call(this));
    }
    async finalText() {
      return (await this.done(), ke(this, Xe, "m", id).call(this));
    }
    _emit(n, ...r) {
      if (ke(this, Vr, "f")) return;
      if (n === "end") (Kn(this, Vr, !0, "f"), ke(this, Fs, "f").call(this));
      let s = ke(this, Et, "f")[n];
      if (s)
        ((ke(this, Et, "f")[n] = s.filter((h) => !h.once)),
          s.forEach(({ listener: listener }) => listener(...r)));
      if (n === "abort") {
        let h = r[0];
        if (!ke(this, ln, "f") && !s?.length) Promise.reject(h);
        (ke(this, Yr, "f").call(this, h), ke(this, Kr, "f").call(this, h), this._emit("end"));
        return;
      }
      if (n === "error") {
        let h = r[0];
        if (!ke(this, ln, "f") && !s?.length) Promise.reject(h);
        (ke(this, Yr, "f").call(this, h), ke(this, Kr, "f").call(this, h), this._emit("end"));
      }
    }
    _emitFinal() {
      if (this.receivedMessages.at(-1)) this._emit("finalMessage", ke(this, Xe, "m", ga).call(this));
    }
    async _fromReadableStream(n, r) {
      let s = r?.signal,
        h;
      if (s) {
        if (s.aborted) this.controller.abort();
        ((h = this.controller.abort.bind(this.controller)), s.addEventListener("abort", h));
      }
      try {
        (ke(this, Xe, "m", _a).call(this), this._connected(null));
        let fromReadableStream = St.fromReadableStream(n, this.controller);
        for await (let w of fromReadableStream) ke(this, Xe, "m", ya).call(this, w);
        if (fromReadableStream.controller.signal?.aborted) throw new Lf();
        ke(this, Xe, "m", Sa).call(this);
      } finally {
        if (s && h) s.removeEventListener("abort", h);
      }
    }
    [((Yt = new WeakMap()),
    (Nn = new WeakMap()),
    (Gr = new WeakMap()),
    (Ls = new WeakMap()),
    (Yr = new WeakMap()),
    (jr = new WeakMap()),
    (Fs = new WeakMap()),
    (Kr = new WeakMap()),
    (Et = new WeakMap()),
    (Vr = new WeakMap()),
    (Ds = new WeakMap()),
    (Us = new WeakMap()),
    (ln = new WeakMap()),
    (Ns = new WeakMap()),
    (Bs = new WeakMap()),
    (Hs = new WeakMap()),
    (Xr = new WeakMap()),
    (Jr = new WeakMap()),
    (Xe = new WeakSet()),
    (ga = function () {
      if (this.receivedMessages.length === 0)
        throw new pr("stream ended without producing a Message with role=assistant");
      return this.receivedMessages.at(-1);
    }),
    (id = function () {
      if (this.receivedMessages.length === 0)
        throw new pr("stream ended without producing a Message with role=assistant");
      let mapped = this.receivedMessages
        .at(-1)
        .content.filter((s) => s.type === "text")
        .map((s) => s.text);
      if (mapped.length === 0) throw new pr("stream ended without producing a content block with type=text");
      return mapped.join(" ");
    }),
    (_a = function () {
      if (this.ended) return;
      Kn(this, Yt, void 0, "f");
    }),
    (ya = function (r) {
      if (this.ended) return;
      let s = ke(this, Xe, "m", ad).call(this, r);
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
              if (va(at) && ke(this, Et, "f").inputJson?.length) {
                let y;
                try {
                  y = at.input;
                } catch (error) {
                  ke(this, Jr, "f").call(this, ke(this, Xe, "m", Ea).call(this, at, error));
                  break;
                }
                this._emit("inputJson", r.delta.partial_json, y);
              }
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
            case "compaction_delta": {
              if (at.type === "compaction" && at.content) this._emit("compaction", at.content);
              break;
            }
            default:
              Bt_hwms(r.delta);
          }
          break;
        }
        case "message_stop": {
          (this._addMessageParam(s),
            this._addMessage(attachParsedOutput(s, ke(this, Nn, "f"), { logger: ke(this, Xr, "f") }), !0));
          break;
        }
        case "content_block_stop": {
          this._emit("contentBlock", s.content.at(-1));
          break;
        }
        case "message_start": {
          Kn(this, Yt, s, "f");
          break;
        }
        case "content_block_start":
        case "message_delta":
          break;
      }
    }),
    (Sa = function () {
      if (this.ended) throw new pr("stream has ended, this shouldn't happen");
      let r = ke(this, Yt, "f");
      if (!r) throw new pr("request ended without sending any chunks");
      return (
        Kn(this, Yt, void 0, "f"),
        attachParsedOutput(r, ke(this, Nn, "f"), { logger: ke(this, Xr, "f") })
      );
    }),
    (ad = function (r) {
      let s = ke(this, Yt, "f");
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
          if (r.context_management != null) s.context_management = r.context_management;
          if (r.input_transformations != null) s.input_transformations = r.input_transformations;
          if (r.usage.input_tokens != null) s.usage.input_tokens = r.usage.input_tokens;
          if (r.usage.cache_creation_input_tokens != null)
            s.usage.cache_creation_input_tokens = r.usage.cache_creation_input_tokens;
          if (r.usage.cache_read_input_tokens != null)
            s.usage.cache_read_input_tokens = r.usage.cache_read_input_tokens;
          if (r.usage.server_tool_use != null) s.usage.server_tool_use = r.usage.server_tool_use;
          if (r.usage.iterations != null) s.usage.iterations = r.usage.iterations;
          if (r.usage.fallback_credit != null) s.usage.fallback_credit = r.usage.fallback_credit;
          if (r.usage.output_tokens_details != null)
            s.usage.output_tokens_details = r.usage.output_tokens_details;
          return s;
        case "content_block_start":
          if ((s.content.push(r.content_block), r.content_block.type === "fallback"))
            s.model = r.content_block.to.model;
          return s;
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
              if (at && va(at)) {
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
            case "compaction_delta": {
              if (at?.type === "compaction") {
                let y = { ...at, content: r.delta.content };
                if ("encrypted_content" in r.delta) y.encrypted_content = r.delta.encrypted_content;
                s.content[r.index] = y;
              }
              break;
            }
            default:
              Bt_hwms(r.delta);
          }
          return s;
        }
        case "content_block_stop": {
          let at = s.content.at(r.index);
          if (at && va(at) && Gt in at) {
            let y;
            try {
              y = at.input;
            } catch (error) {
              ((y = {}), ke(this, Jr, "f").call(this, ke(this, Xe, "m", Ea).call(this, at, error)));
            }
            Object.defineProperty(at, "input", { value: y, enumerable: !0, configurable: !0, writable: !0 });
          }
          return s;
        }
      }
    }),
    (Ea = function (r, s) {
      let h = r[Gt];
      return new pr(
        `Unable to parse tool parameter JSON from model. Please retry your request or adjust your prompt. Error: ${s}. JSON: ${h}`,
      );
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

export { ld };
