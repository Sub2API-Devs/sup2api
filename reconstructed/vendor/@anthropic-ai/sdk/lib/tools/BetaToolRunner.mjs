/**
 * @anthropic-ai/sdk/lib/tools/BetaToolRunner.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (12)
 * attribution: esm-layout 4, esm-fingerprint 8
 */
import { Kn, ke } from "../../internal/tslib.mjs";
import { oa, wr, X_STAINLESS_HELPER } from "../../internal/stainless-helper-header.mjs";
import { T } from "../../internal/headers.mjs";
import { SEn } from "../../internal/utils/promise.mjs";
import { pr } from "../../core/error.mjs";
import { Tb } from "../../internal/utils/log.mjs";
import { ch } from "./ToolError.mjs";
import { Bt_hwms } from "../../tools/agent-toolset/memories.mjs";

//@ chunk-hwmsct5x.js:104913-106258 esm-layout
var ud = 1e5,
  dd = `You have been working on the task described above but have not yet completed it. Write a continuation summary that will allow you (or another instance of yourself) to resume work efficiently in a future context window where the conversation history will be replaced with this summary. Your summary should be structured, concise, and actionable. Include:
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
var xe,
  Hn,
  un,
  fe,
  Je,
  je,
  dn,
  Rt,
  jt,
  Qr,
  st,
  cn,
  $n,
  fn,
  cd,
  Ra,
  ka,
  $s,
  xa,
  Ta,
  Ma,
  Oa,
  fd,
  Pa,
  Ia = (() => {
    class e {
      constructor(n, r, s) {
        (xe.add(this),
          (this.client = n),
          Hn.set(this, !1),
          un.set(this, !1),
          fe.set(this, void 0),
          Je.set(this, void 0),
          je.set(this, void 0),
          dn.set(this, void 0),
          Rt.set(this, void 0),
          jt.set(this, void 0),
          Qr.set(this, 0),
          st.set(this, { status: "idle" }),
          cn.set(this, null),
          $n.set(this, new Map()),
          fn.set(this, []),
          pd(r),
          Kn(this, fe, { params: { ...r, messages: JSON.parse(JSON.stringify(r.messages)) } }, "f"));
        let h = oa(r.tools, r.messages);
        if (
          (Kn(
            this,
            Je,
            {
              ...s,
              headers: T([
                wr("BetaToolRunner"),
                h.length ? { [X_STAINLESS_HELPER]: h.join(", ") } : void 0,
                s?.headers,
              ]),
            },
            "f",
          ),
          Kn(this, jt, SEn(), "f"),
          r.compactionControl?.enabled)
        )
          console.warn(
            'Anthropic: The `compactionControl` parameter is deprecated and will be removed in a future version. Use server-side compaction instead by passing `edits: [{ type: "compact_20260112" }]` in the params passed to `toolRunner()`. See https://platform.claude.com/docs/en/build-with-claude/compaction',
          );
      }
      async *[((Hn = new WeakMap()),
      (un = new WeakMap()),
      (fe = new WeakMap()),
      (Je = new WeakMap()),
      (je = new WeakMap()),
      (dn = new WeakMap()),
      (Rt = new WeakMap()),
      (jt = new WeakMap()),
      (Qr = new WeakMap()),
      (st = new WeakMap()),
      (cn = new WeakMap()),
      ($n = new WeakMap()),
      (fn = new WeakMap()),
      (xe = new WeakSet()),
      (cd = async function () {
        let compactionControl = ke(this, fe, "f").params.compactionControl;
        if (!compactionControl || !compactionControl.enabled) return !1;
        let s = 0;
        if (ke(this, je, "f") !== void 0)
          try {
            let R = await ke(this, je, "f");
            s =
              R.usage.input_tokens +
              (R.usage.cache_creation_input_tokens ?? 0) +
              (R.usage.cache_read_input_tokens ?? 0) +
              R.usage.output_tokens;
          } catch {
            return !1;
          }
        let h = compactionControl.contextTokenThreshold ?? ud;
        if (s < h) return !1;
        let y = compactionControl.model ?? ke(this, fe, "f").params.model,
          w = compactionControl.summaryPrompt ?? dd,
          messages = ke(this, fe, "f").params.messages;
        if (messages[messages.length - 1].role === "assistant") {
          let R = messages[messages.length - 1];
          if (Array.isArray(R.content)) {
            let filtered = R.content.filter((O) => O.type !== "tool_use");
            if (filtered.length === 0) messages.pop();
            else R.content = filtered;
          }
        }
        let create = await this.client.beta.messages.create(
          {
            model: y,
            messages: [...messages, { role: "user", content: [{ type: "text", text: w }] }],
            max_tokens: ke(this, fe, "f").params.max_tokens,
          },
          { signal: ke(this, Je, "f").signal, headers: T([ke(this, Je, "f").headers, wr("compaction")]) },
        );
        if (create.content[0]?.type !== "text") throw new pr("Expected text response for compaction");
        return (
          ke(this, xe, "m", Ta).call(this),
          Kn(this, cn, null, "f"),
          (ke(this, fe, "f").params.messages = [{ role: "user", content: hd(create.content) }]),
          !0
        );
      }),
      Symbol.asyncIterator)]() {
        var n;
        if (ke(this, Hn, "f")) throw new pr("Cannot iterate over a consumed stream");
        (Kn(this, Hn, !0, "f"), Kn(this, un, !0, "f"), Kn(this, Rt, void 0, "f"));
        try {
          while (!0)
            try {
              if (
                ke(this, fe, "f").params.max_iterations &&
                ke(this, Qr, "f") >= ke(this, fe, "f").params.max_iterations
              )
                break;
              if (
                (ke(this, xe, "m", fd).call(this),
                ke(this, st, "f").status === "scheduled" && gd(ke(this, cn, "f")) !== "resume")
              ) {
                yield* ke(this, xe, "m", ka).call(this, ke(this, st, "f").config);
                continue;
              }
              (Kn(this, un, !1, "f"),
                Kn(this, Rt, void 0, "f"),
                Kn(this, Qr, ((n = ke(this, Qr, "f")), n++, n), "f"),
                Kn(this, je, void 0, "f"));
              let {
                max_iterations: max_iterations,
                compactionControl: compactionControl,
                ...h
              } = ke(this, fe, "f").params;
              if ((yield* ke(this, xe, "m", Ra).call(this, h), !(await ke(this, xe, "m", cd).call(this)))) {
                if (!ke(this, un, "f")) {
                  let S = await ke(this, je, "f"),
                    E = gd(S.stop_reason);
                  (Kn(this, cn, S.stop_reason, "f"),
                    ke(this, fe, "f").params.messages.push({ role: S.role, content: hd(S.content) }));
                  let { container: container } = ke(this, fe, "f").params;
                  if (S.container) {
                    if (container == null) ke(this, fe, "f").params.container = S.container.id;
                    else if (typeof container === "object" && container.id == null)
                      ke(this, fe, "f").params.container = { ...container, id: S.container.id };
                  }
                  if (E === "stop") {
                    yield* ke(this, xe, "m", Ma).call(this);
                    break;
                  }
                  if (E === "resume") continue;
                } else Kn(this, cn, null, "f");
                let w = await ke(this, xe, "m", Oa).call(this, ke(this, fe, "f").params.messages.at(-1));
                if (w) ke(this, fe, "f").params.messages.push(w);
                else if (!ke(this, un, "f")) {
                  yield* ke(this, xe, "m", Ma).call(this);
                  break;
                }
              }
            } finally {
              (ke(this, dn, "f")?.abort(), Kn(this, dn, void 0, "f"));
            }
          if (!ke(this, je, "f")) throw new pr("ToolRunner concluded without a message from the server");
          ke(this, jt, "f").resolve(await ke(this, je, "f"));
        } catch (error) {
          throw (
            Kn(this, Hn, !1, "f"),
            ke(this, jt, "f").promise.catch(() => {}),
            ke(this, jt, "f").reject(error),
            Kn(this, jt, SEn(), "f"),
            error
          );
        }
      }
      setMessagesParams(n) {
        let r = typeof n === "function" ? n(ke(this, fe, "f").params) : n;
        if ((pd(r), ke(this, st, "f").status !== "idle")) Ca(r);
        if (ke(this, st, "f").status === "in_flight" && r.messages !== ke(this, fe, "f").params.messages)
          throw new pr(
            "Message params can't be changed while the conversation is being compacted, because the compaction response is about to replace them. Change them after this iteration instead.",
          );
        ((ke(this, fe, "f").params = r), Kn(this, un, !0, "f"), Kn(this, Rt, void 0, "f"));
      }
      setRequestOptions(n) {
        if (typeof n === "function") Kn(this, Je, n(ke(this, Je, "f")), "f");
        else Kn(this, Je, { ...ke(this, Je, "f"), ...n }, "f");
      }
      async generateToolResponse(n = ke(this, Je, "f").signal) {
        let r = (await ke(this, je, "f")) ?? this.params.messages.at(-1);
        if (!r) return null;
        return ke(this, xe, "m", Oa).call(this, r, n);
      }
      done() {
        return ke(this, jt, "f").promise;
      }
      async runUntilDone() {
        if (!ke(this, Hn, "f")) for await (let n of this);
        return this.done();
      }
      get params() {
        return ke(this, fe, "f").params;
      }
      pushMessages(...n) {
        this.setMessagesParams((r) => ({ ...r, messages: [...r.messages, ...n] }));
      }
      compactBeforeNextTurn(n) {
        if (ke(this, st, "f").status === "in_flight") return;
        (Ca(ke(this, fe, "f").params),
          Kn(this, st, { status: "scheduled", config: n ?? { type: "summarize" } }, "f"));
      }
      addTools(...n) {
        for (let r of n) {
          if ("name" in r) ke(this, $n, "f").set(r.name, "run" in r ? r : null);
          ke(this, fn, "f").push({ type: "addition", tool: r });
        }
      }
      removeTools(...n) {
        for (let r of n) {
          let s = typeof r === "string" ? r : r.name;
          (ke(this, $n, "f").set(s, null), ke(this, fn, "f").push({ type: "removal", name: s }));
        }
      }
      then(n, r) {
        return this.runUntilDone().then(n, r);
      }
    }
    return (
      (Ra = async function* (r) {
        if (r.stream)
          (Kn(this, dn, this.client.beta.messages.stream({ ...r }, ke(this, Je, "f")), "f"),
            Kn(this, je, ke(this, dn, "f").finalMessage(), "f"),
            ke(this, je, "f").catch(() => {}),
            yield ke(this, dn, "f"));
        else
          (Kn(this, je, this.client.beta.messages.create({ ...r, stream: !1 }, ke(this, Je, "f")), "f"),
            yield ke(this, je, "f"));
      }),
      (ka = async function* (r) {
        Ca(ke(this, fe, "f").params);
        let {
            max_iterations: max_iterations,
            compactionControl: compactionControl,
            ...y
          } = ke(this, fe, "f").params,
          w = eg(y);
        (Kn(this, st, { status: "in_flight" }, "f"), Kn(this, Rt, void 0, "f"));
        let S = ke(this, je, "f");
        try {
          yield* ke(this, xe, "m", Ra).call(this, { ...w, compaction: r });
          let E = await ke(this, je, "f");
          if (E.content.some((R) => R.type === "compaction" && R.content))
            (ke(this, xe, "m", Ta).call(this),
              (ke(this, fe, "f").params.messages = [{ role: E.role, content: E.content }]));
          else
            (Tb(this.client).warn("Compaction produced no summary; keeping the conversation as it is."),
              Kn(this, je, S, "f"));
        } finally {
          Kn(this, st, { status: "idle" }, "f");
        }
      }),
      ($s = function () {
        let r = new Map();
        for (let tool of ke(this, fe, "f").params.tools) if ("run" in tool) r.set(tool.name, tool);
        for (let [s, h] of ke(this, $n, "f"))
          if (h) r.set(s, h);
          else r.delete(s);
        return r;
      }),
      (xa = function () {
        let r = new Set(ke(this, xe, "m", $s).call(this).keys());
        for (let s of [...ke(this, fe, "f").params.messages, ke(this, xe, "m", Pa).call(this)]) {
          if (typeof s.content === "string") continue;
          for (let h of s.content)
            if (s.role === "system") md(h, r);
            else if (s.role === "assistant" && h.type === "compaction")
              for (let y of h.tool_changes ?? []) md(y, r);
        }
        return r;
      }),
      (Ta = function () {
        let r = ke(this, xe, "m", xa).call(this);
        for (let s of ke(this, xe, "m", $s).call(this).keys()) if (!r.has(s)) ke(this, $n, "f").set(s, null);
      }),
      (Ma = async function* () {
        if (ke(this, st, "f").status !== "scheduled") return;
        let r = ke(this, fe, "f").params.messages.at(-1)?.content;
        if (Array.isArray(r) && r.some((s) => s.type === "tool_use")) {
          (Tb(this.client).warn(
            "The pending compaction was skipped because the last turn ended with tool calls that were not run. Call `compactBeforeNextTurn()` again if you continue the conversation.",
          ),
            Kn(this, st, { status: "idle" }, "f"));
          return;
        }
        yield* ke(this, xe, "m", ka).call(this, ke(this, st, "f").config);
      }),
      (Oa = async function (r, s = ke(this, Je, "f").signal) {
        if (ke(this, Rt, "f") !== void 0) return ke(this, Rt, "f");
        return (
          Kn(
            this,
            Rt,
            tg(ke(this, xe, "m", $s).call(this), ke(this, xe, "m", xa).call(this), r, {
              ...ke(this, Je, "f"),
              signal: s,
            }),
            "f",
          ),
          ke(this, Rt, "f")
        );
      }),
      (fd = function () {
        if (ke(this, cn, "f") === "pause_turn" || ke(this, fn, "f").length === 0) return;
        (ke(this, fe, "f").params.messages.push(ke(this, xe, "m", Pa).call(this)), Kn(this, fn, [], "f"));
      }),
      (Pa = function () {
        let r = [];
        for (let s of ke(this, fn, "f")) {
          if (s.type === "removal") {
            r.push({ type: "tool_removal", tool: { type: "tool_reference", name: s.name } });
            continue;
          }
          let tool = s.tool;
          if ("run" in s.tool) {
            let { run: run, parse: parse, close: close, ...E } = s.tool;
            tool = E;
          }
          r.push({ type: "tool_addition", tool: { type: "tool_definition", definition: tool } });
        }
        return { role: "system", content: r };
      }),
      e
    );
  })();
//@ chunk-hwmsct5x.js:114576-114828 esm-layout
function pd(e) {
  if ("compaction" in e && e.compaction != null)
    throw new pr(
      "`compaction` cannot be set on a tool runner: every request in the loop would compact again. Call `runner.compactBeforeNextTurn()` when the conversation should be compacted instead.",
    );
}
//@ chunk-hwmsct5x.js:114828-115114 esm-fingerprint
function Ca(e) {
  if (e.context_management?.edits?.some((n) => n.type.startsWith("compact_")))
    throw new pr(
      "`compactBeforeNextTurn()` can't be used while `context_management` has a compaction edit, because the API doesn't accept a compaction block together with one. Remove the edit first.",
    );
}
//@ chunk-hwmsct5x.js:115114-115485 esm-fingerprint
function eg(e) {
  let {
      context_management: context_management,
      stop_sequences: stop_sequences,
      output_format: output_format,
      ...h
    } = e,
    y = ({ format: format, ...S }) => S;
  if (h.tool_choice?.type === "any" || h.tool_choice?.type === "tool") delete h.tool_choice;
  if (h.output_config) h.output_config = y(h.output_config);
  if (Array.isArray(h.fallbacks))
    h.fallbacks = h.fallbacks.map((fallback) =>
      fallback.output_config ? { ...fallback, output_config: y(fallback.output_config) } : fallback,
    );
  return h;
}
//@ chunk-hwmsct5x.js:115485-116121 esm-fingerprint
async function tg(e, n, r, s) {
  if (!r || r.role !== "assistant" || !r.content || typeof r.content === "string") return null;
  let filtered = r.content.filter((w) => w.type === "tool_use");
  if (filtered.length === 0) return null;
  return {
    role: "user",
    content: await Promise.all(
      filtered.map(async (w) => {
        let S = n.has(w.name) ? e.get(w.name) : void 0;
        if (!S) return ng(w);
        try {
          let input = w.input;
          if ("parse" in S && S.parse) input = S.parse(input);
          let run = await S.run(input, { toolUse: w, toolUseBlock: w, signal: s?.signal });
          return { type: "tool_result", tool_use_id: w.id, content: run };
        } catch (error) {
          return {
            type: "tool_result",
            tool_use_id: w.id,
            content:
              error instanceof ch
                ? error.content
                : `Error: ${error instanceof Error ? error.message : String(error)}`,
            is_error: !0,
          };
        }
      }),
    ),
  };
}
//@ chunk-hwmsct5x.js:116121-116145 esm-layout
function hd(e) {
  return e;
}
//@ chunk-hwmsct5x.js:116145-116260 esm-fingerprint
function ng(e) {
  return {
    type: "tool_result",
    tool_use_id: e.id,
    content: `Error: Tool '${e.name}' not found`,
    is_error: !0,
  };
}
//@ chunk-hwmsct5x.js:116260-116346 esm-fingerprint
function md(e, n) {
  switch (e.type) {
    case "tool_removal":
    case "tool_addition":
      rg(e, n);
      break;
  }
}
//@ chunk-hwmsct5x.js:116346-116454 esm-fingerprint
function rg(e, n) {
  let r = og(e.tool);
  if (r === void 0) return;
  if (e.type === "tool_removal") n.delete(r);
  else n.add(r);
}
//@ chunk-hwmsct5x.js:116454-116610 esm-fingerprint
function og(e) {
  switch (e.type) {
    case "tool_reference":
      return e.name;
    case "tool_definition":
      return "name" in e.definition ? e.definition.name : void 0;
    default:
      return;
  }
}
//@ chunk-hwmsct5x.js:116610-116886 esm-fingerprint
function gd(e) {
  if (e === null) return "stop";
  switch (e) {
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
      return (Bt_hwms(e), "stop");
  }
}

export { Ia };
