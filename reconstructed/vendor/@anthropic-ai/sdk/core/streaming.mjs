/**
 * @anthropic-ai/sdk/core/streaming.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-layout 1
 */
import { Kn, ke } from "../internal/tslib.mjs";
import { mu } from "../internal/parse.mjs";
import { Tb } from "../internal/utils/log.mjs";
import { pr, Ot } from "./error.mjs";
import { Uo } from "../internal/utils/values.mjs";
import { Kje } from "../internal/errors.mjs";
import { releaseAbortListener } from "../internal/request-signal.mjs";
import { Vo } from "../internal/decoders/line.mjs";
import { rr, Bi } from "../internal/shims.mjs";
import { h4t } from "../internal/utils/bytes.mjs";

//@ chunk-hwmsct5x.js:28977-32502 esm-layout
var ir,
  St = (() => {
    class e {
      constructor(n, r, s) {
        ((this.iterator = n), ir.set(this, void 0), (this.controller = r), Kn(this, ir, s, "f"));
      }
      static rawEvents(n, r = new AbortController()) {
        return mu(n, r);
      }
      static fromSSEResponse(n, r, s) {
        let h = !1,
          y = s ? Tb(s) : console;
        async function* w() {
          if (h) throw new pr("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
          h = !0;
          let S = !1;
          try {
            for await (let E of mu(n, r)) {
              if (E.event === "completion")
                try {
                  yield JSON.parse(E.data);
                } catch (error) {
                  throw (
                    y.error("Could not parse message into JSON:", E.data),
                    y.error("From chunk:", E.raw),
                    error
                  );
                }
              if (
                E.event === "message_start" ||
                E.event === "message_delta" ||
                E.event === "message_stop" ||
                E.event === "content_block_start" ||
                E.event === "content_block_delta" ||
                E.event === "content_block_stop" ||
                E.event === "message" ||
                E.event === "user.message" ||
                E.event === "user.interrupt" ||
                E.event === "user.tool_confirmation" ||
                E.event === "user.custom_tool_result" ||
                E.event === "user.tool_result" ||
                E.event === "agent.message" ||
                E.event === "agent.thinking" ||
                E.event === "agent.tool_use" ||
                E.event === "agent.tool_result" ||
                E.event === "agent.mcp_tool_use" ||
                E.event === "agent.mcp_tool_result" ||
                E.event === "agent.custom_tool_use" ||
                E.event === "agent.thread_context_compacted" ||
                E.event === "session.status_running" ||
                E.event === "session.status_idle" ||
                E.event === "session.status_rescheduled" ||
                E.event === "session.status_terminated" ||
                E.event === "session.error" ||
                E.event === "session.deleted" ||
                E.event === "session.updated" ||
                E.event === "span.model_request_start" ||
                E.event === "span.model_request_end" ||
                E.event === "span.outcome_evaluation_start" ||
                E.event === "span.outcome_evaluation_ongoing" ||
                E.event === "span.outcome_evaluation_end" ||
                E.event === "user.define_outcome" ||
                E.event === "agent.thread_message_received" ||
                E.event === "agent.thread_message_sent" ||
                E.event === "agent.session_thread_message_received" ||
                E.event === "agent.session_thread_message_sent" ||
                E.event === "session.thread_created" ||
                E.event === "session.thread_status_created" ||
                E.event === "session.thread_status_running" ||
                E.event === "session.thread_status_idle" ||
                E.event === "session.thread_status_rescheduled" ||
                E.event === "session.thread_status_terminated" ||
                E.event === "event_start" ||
                E.event === "event_delta" ||
                E.event === "system.message"
              )
                try {
                  yield JSON.parse(E.data);
                } catch (error) {
                  throw (
                    y.error("Could not parse message into JSON:", E.data),
                    y.error("From chunk:", E.raw),
                    error
                  );
                }
              if (E.event === "ping") continue;
              if (E.event === "error") {
                let R = Uo(E.data) ?? E.data,
                  L = R?.error?.type;
                throw new Ot(void 0, R, void 0, n.headers, L);
              }
            }
            S = !0;
          } catch (error) {
            if (Kje(error)) return;
            throw error;
          } finally {
            if (!S) r.abort();
            releaseAbortListener(r);
          }
        }
        return new e(w, r, s);
      }
      static fromReadableStream(n, r, s) {
        let h = !1;
        async function* y() {
          let S = new Vo(),
            E = rr(n);
          for await (let R of E) for (let L of S.decode(R)) yield L;
          for (let R of S.flush()) yield R;
        }
        async function* w() {
          if (h) throw new pr("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
          h = !0;
          let S = !1;
          try {
            for await (let E of y()) {
              if (S) continue;
              if (E) yield JSON.parse(E);
            }
            S = !0;
          } catch (error) {
            if (Kje(error)) return;
            throw error;
          } finally {
            if (!S) r.abort();
            releaseAbortListener(r);
          }
        }
        return new e(w, r, s);
      }
      [((ir = new WeakMap()), Symbol.asyncIterator)]() {
        return this.iterator();
      }
      tee() {
        let n = [],
          r = [],
          iterator = this.iterator(),
          h = (y) => ({
            next: () => {
              if (y.length === 0) {
                let w = iterator.next();
                (n.push(w), r.push(w));
              }
              return y.shift();
            },
          });
        return [
          new e(() => h(n), this.controller, ke(this, ir, "f")),
          new e(() => h(r), this.controller, ke(this, ir, "f")),
        ];
      }
      toReadableStream() {
        let n = this,
          r;
        return Bi({
          async start() {
            r = n[Symbol.asyncIterator]();
          },
          async pull(s) {
            try {
              let { value: h, done: y } = await r.next();
              if (y) return s.close();
              let w = h4t(
                JSON.stringify(h) +
                  `
`,
              );
              s.enqueue(w);
            } catch (error) {
              s.error(error);
            }
          },
          async cancel() {
            await r.return?.();
          },
        });
      }
    }
    return e;
  })();

export { St };
