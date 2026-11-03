/**
 * services/gateway/loadTestMode.ts
 *
 * 2.1.316 新增：claude gateway 的压测模式：返回合成的流式回复（msg_loadtest）、检查花费数据库为空、读 /dev/zero 生成负载
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hde10cf2.js (11)
 * attribution: placement 11
 */
import { openSync, fstatSync, closeSync, writeSync, readSync } from "fs";
import { jsonStringify } from "../../utils/slowOperations.js";
import { gatewayLog } from "./gatewayBanner.js";

//@ chunk-hde10cf2.js:1529-1811 placement
var LOAD_TEST_REPLY_PREFIX =
    "[This Claude apps gateway is in load-test mode. This is a canned reply and your request was not sent to a model. If you did not expect this, tell your gateway administrator.] ",
  LOAD_TEST = "load-test",
  LOAD_TEST_CHUNKS = 3,
  LOAD_TEST_TEXT = "load test   ",
  LOAD_TEST_REPEAT = 20,
  LOAD_TEST_BYTES = 65536,
  LOAD_TEST_WORDS = 32,
  LOAD_TEST_MAX = 1e4,
  ZERO_USAGE = { input_tokens: 0, output_tokens: 0 };
//@ chunk-hde10cf2.js:1811-1860 placement
function J(t) {
  return Math.max(1, Math.ceil(t / LOAD_TEST_CHUNKS));
}
//@ chunk-hde10cf2.js:1860-2381 placement
function buildLoadTestMessage(t) {
  let r = J(t);
  return [
    {
      type: "message_start",
      message: {
        id: "msg_loadtest",
        type: "message",
        role: "assistant",
        model: LOAD_TEST,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: ZERO_USAGE,
      },
    },
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    ...Array.from({ length: r }, (n, o) => ({
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: o === 0 ? LOAD_TEST_REPLY_PREFIX : LOAD_TEST_TEXT },
    })),
    { type: "content_block_stop", index: 0 },
    {
      type: "message_delta",
      delta: { stop_reason: "end_turn", stop_sequence: null },
      usage: { output_tokens: 0 },
    },
    { type: "message_stop" },
  ];
}
//@ chunk-hde10cf2.js:2381-2891 placement
function encodeEventStreamFrame(t) {
  let buffer = Buffer.concat(
      [
        [":message-type", "event"],
        [":event-type", "chunk"],
        [":content-type", "application/json"],
      ].map(([o, c]) =>
        Buffer.concat([
          Buffer.from([o.length]),
          Buffer.from(o),
          Buffer.from([7, c.length >> 8, c.length & 255]),
          Buffer.from(c),
        ]),
      ),
    ),
    alloc = Buffer.alloc(12 + buffer.length + t.length + 4);
  return (
    alloc.writeUInt32BE(alloc.length, 0),
    alloc.writeUInt32BE(buffer.length, 4),
    alloc.writeUInt32BE(Bun.hash.crc32(alloc.subarray(0, 8)), 8),
    buffer.copy(alloc, 12),
    alloc.set(t, 12 + buffer.length),
    alloc.writeUInt32BE(Bun.hash.crc32(alloc.subarray(0, alloc.length - 4)), alloc.length - 4),
    alloc
  );
}
//@ chunk-hde10cf2.js:2891-3277 placement
async function checkSpendTableEmpty(t, r) {
  if ((await r`SELECT 1 FROM spend WHERE cents > 0 LIMIT 1`).length > 0)
    throw Error(
      "load_test_mode is on, but the database at store.postgres_url already holds real spend (a spend row above 0 cents). A load test writes made-up developers into it, so it must not share a database with real developers. Point store.postgres_url at its own empty database.",
    );
  return streamLoadTestReply(t);
}
//@ chunk-hde10cf2.js:3277-3329 placement
function m(t, r, n = `${r}s`) {
  return `${t} ${t === 1 ? r : n}`;
}
/**
 * 生成 load-test 模式的 SSE/事件流回复（按 reply_tokens 与 reply_seconds 节奏）。
 */
//@ chunk-hde10cf2.js:3329-7759 placement
function streamLoadTestReply(t, r = LOAD_TEST_MAX) {
  let n = buildLoadTestMessage(t.reply_tokens),
    o = t.reply_seconds * 1000,
    c = openLoadTestDevices(),
    mapped = n.map((e) =>
      encodeEventStreamFrame(
        Buffer.from(jsonStringify({ bytes: Buffer.from(jsonStringify(e)).toString("base64") })),
      ),
    ),
    mapped_2 = n.map((e) =>
      Buffer.from(`event: ${e.type}
data: ${jsonStringify(e)}

`),
    ),
    p = jsonStringify({
      id: "msg_loadtest",
      type: "message",
      role: "assistant",
      model: LOAD_TEST,
      content: [
        {
          type: "text",
          text: LOAD_TEST_REPLY_PREFIX + LOAD_TEST_TEXT.repeat(Math.max(0, J(t.reply_tokens) - 1)),
        },
      ],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: ZERO_USAGE,
    }),
    buffer = Buffer.from(p),
    d = new Set(),
    y,
    h = !1,
    E = 0,
    k = 0,
    w = 0,
    T = 0,
    L = new Set(),
    v = 0,
    M = 0,
    A = 0,
    x = 0,
    U = 0,
    B = 0,
    O = {
      since: 0,
      lastBusyAt: 0,
      arrivals: 0,
      bodies: 0,
      finished: 0,
      hungUp: 0,
      checkFaults: 0,
      writeFaults: 0,
      peakArrivalsPerS: 0,
      peakOpen: 0,
      worstLateMs: 0,
    },
    u = { ...O };
  function R(e) {
    if (h) return;
    if (!y) ((E = e), (y = setInterval(se, LOAD_TEST_REPEAT)));
    if (u.since === 0) u.since = e;
  }
  function F(e) {
    if (h) return;
    (R(performance.now()), v++, (U += e), (B = Math.max(B, e)));
  }
  function I() {
    if (!h) M++;
  }
  function ee() {
    if (h) return;
    (R(performance.now()), k++);
  }
  function te(e, l) {
    if (h) return;
    (w++, (T += e), L.add(l));
  }
  function ne(e) {
    if (h) return;
    if ((R(performance.now()), e === "check")) A++;
    else x++;
  }
  function P(e, l) {
    return `${m(e, "spend check")} failed, ${m(l, "spend write")} failed`;
  }
  function q(e) {
    let max = Math.max(1, (e - E) / 1000),
      f = k + v + M + A + x + d.size > 0;
    if (f) {
      let g = w > 0 ? T / w / 1000 : 0;
      (gatewayLog(
        "info",
        `load test, last ${Math.round(max)} s: ${(k / max).toFixed(1)} requests/s arrived` +
          (w > 0
            ? `, ${(w / max).toFixed(1)}/s with their body read (mean body ${g < 10 ? g.toFixed(1) : Math.round(g)} KB, from ${m(L.size, "developer")})`
            : "") +
          `, ${(v / max).toFixed(1)} replies/s finished, ${m(d.size, "reply", "replies")} open now, ${m(M, "client")} hung up early, ${P(A, x)}` +
          (v > 0
            ? `; replies ended ${Math.round(U / v)} ms past reply_seconds on average (worst ${Math.round(B)} ms)`
            : ""),
      ),
        (u.lastBusyAt = e));
    }
    return (
      (u.arrivals += k),
      (u.bodies += w),
      (u.finished += v),
      (u.hungUp += M),
      (u.checkFaults += A),
      (u.writeFaults += x),
      (u.peakArrivalsPerS = Math.max(u.peakArrivalsPerS, k / max)),
      (u.worstLateMs = Math.max(u.worstLateMs, B)),
      (E = e),
      (k = 0),
      (w = 0),
      (T = 0),
      L.clear(),
      (v = 0),
      (M = 0),
      (A = 0),
      (x = 0),
      (U = 0),
      (B = 0),
      f
    );
  }
  function z() {
    if (h) return;
    let e = u;
    if (e.arrivals + e.finished + e.hungUp + e.checkFaults + e.writeFaults > 0) {
      let max = Math.max(0, e.arrivals - e.bodies);
      gatewayLog(
        "info",
        `load test summary, over ${Math.max(1, Math.round((e.lastBusyAt - e.since) / 1000))} s: ${m(e.arrivals, "request")} arrived${max > 0 ? ` (${max} refused before their body was read)` : ""}, ${m(e.finished, "reply", "replies")} finished, ${m(e.hungUp, "client")} hung up early, ${P(e.checkFaults, e.writeFaults)}. Peaks: ${e.peakArrivalsPerS.toFixed(1)} requests/s in the busiest window, ${m(e.peakOpen, "reply", "replies")} open at once.` +
          (d.size > 0 ? ` ${m(d.size, "reply", "replies")} still open.` : "") +
          (e.finished > 0
            ? ` The worst reply ended ${Math.round(e.worstLateMs)} ms past reply_seconds.`
            : ""),
      );
    }
    u = { ...O };
  }
  function re() {
    if (h) return;
    (q(performance.now()), z(), (h = !0), clearInterval(y), (y = void 0));
  }
  function se() {
    let startTime = performance.now();
    if (d.size === 0) y?.unref?.();
    if (startTime - E >= r) {
      if (!q(startTime)) (z(), clearInterval(y), (y = void 0));
    }
  }
  function N(e, l, f) {
    let g = { "content-type": l };
    if (o === 0) {
      let buffer = Buffer.concat(e);
      return (c.receive(buffer), F(0), new Response(buffer, { headers: g }));
    }
    let a,
      W = () => {
        if (!d.has(a)) return;
        let max = Math.max(
          a.sent + 1,
          Math.min(e.length, Math.floor(((performance.now() - a.startedAt) / o) * e.length)),
        );
        try {
          while (a.sent < max) {
            let K = e[a.sent++];
            (a.ctrl.enqueue(K), c.receive(K));
          }
        } catch {
          if (d.delete(a)) I();
          return;
        }
        if (a.sent === e.length) {
          d.delete(a);
          try {
            a.ctrl.close();
          } catch {}
          F(Math.max(0, performance.now() - a.startedAt - o));
          return;
        }
        let ae = a.startedAt + ((a.sent + 1) * o) / e.length;
        a.timer = setTimeout(W, Math.ceil(Math.max(0, ae - performance.now())));
      },
      readableStream = new ReadableStream({
        start(b) {
          if (((a = { ctrl: b, frames: e, sent: 0, startedAt: performance.now() }), d.add(a), !h))
            u.peakOpen = Math.max(u.peakOpen, d.size);
          (R(a.startedAt),
            y?.ref?.(),
            (a.timer = setTimeout(W, Math.ceil(o / e.length))),
            f?.addEventListener(
              "abort",
              () => {
                if (d.delete(a)) (clearTimeout(a.timer), I(), b.error(f.reason));
              },
              { once: !0 },
            ));
        },
        cancel() {
          if (d.delete(a)) (clearTimeout(a.timer), I());
        },
      });
    return new Response(readableStream, { headers: g });
  }
  return {
    fetch: async (e, l) => {
      (l?.signal?.throwIfAborted(), c.send(l?.body));
      let pathname = new URL(e instanceof Request ? e.url : String(e)).pathname;
      if (pathname.endsWith("/count_tokens") || pathname.includes("count-tokens"))
        return Response.json({ input_tokens: 0 });
      if (pathname.endsWith("/invoke-with-response-stream"))
        return N(mapped, "application/vnd.amazon.eventstream", l?.signal);
      let g = pathname.endsWith("/invoke") || pathname.endsWith(":rawPredict");
      if (pathname.endsWith(":streamRawPredict") || (!g && toLatin1(l?.body)))
        return N(mapped_2, "text/event-stream", l?.signal);
      return (c.receive(buffer), F(0), new Response(p, { headers: { "content-type": "application/json" } }));
    },
    arrived: ee,
    bodyRead: te,
    spendFault: ne,
    close: re,
    socketCostSimulated: c.real,
  };
}
//@ chunk-hde10cf2.js:7759-8852 placement
function openLoadTestDevices() {
  let t = -1,
    r = -1;
  try {
    if (
      ((t = openSync("/dev/null", "r+")),
      (r = openSync("/dev/zero", "r")),
      ![fstatSync(t), fstatSync(r)].every((i) => i.isCharacterDevice()))
    )
      throw Error("not a character device");
  } catch {
    for (let s of [t, r]) if (s >= 0) closeSync(s);
    return (
      gatewayLog(
        "warn",
        "load_test_mode: this host has no /dev/null or /dev/zero, so CPU per replica will read about a quarter to a third lower than in production. The load test still runs.",
      ),
      { real: !1, send() {}, receive() {} }
    );
  }
  let uint8Array = new Uint8Array(LOAD_TEST_BYTES),
    o = !1,
    c = (s, i, p) => {
      if (o) return;
      try {
        (writeSync(t, s, i, p), readSync(r, uint8Array, 0, Math.min(p, uint8Array.length), null));
      } catch (error) {
        ((o = !0),
          gatewayLog(
            "warn",
            `load_test_mode: simulating a connection's kernel work failed (${error instanceof Error ? error.message : String(error)}), so it stops here and CPU per replica will read lower than in production. The load test still runs.`,
          ));
      }
    };
  return {
    real: !0,
    send(s) {
      let i =
        typeof s === "string"
          ? Buffer.from(s)
          : s instanceof ArrayBuffer
            ? new Uint8Array(s)
            : ArrayBuffer.isView(s)
              ? new Uint8Array(s.buffer, s.byteOffset, s.byteLength)
              : null;
      if (!i) return;
      for (let p = 0; p < i.length; p += LOAD_TEST_BYTES) c(i, p, Math.min(LOAD_TEST_BYTES, i.length - p));
    },
    receive(s) {
      c(s, 0, s.length);
      for (let i = 0; i < LOAD_TEST_WORDS && !o; i++)
        try {
          writeSync(t, s, 0, 1);
        } catch {
          o = !0;
        }
    },
  };
}
//@ chunk-hde10cf2.js:8852-8867 placement
var V = 34,
  ge = 92;
//@ chunk-hde10cf2.js:8867-9064 placement
function jsonDepthDelta(t, r, n) {
  let o = 0,
    c = !1;
  for (let s = r; s < n; s++) {
    let code = t.charCodeAt(s);
    if (c) {
      if (code === ge) s++;
      else if (code === V) c = !1;
    } else if (code === V) c = !0;
    else if (code === 123 || code === 91) o++;
    else if (code === 125 || code === 93) o--;
  }
  return o;
}
//@ chunk-hde10cf2.js:9064-9413 placement
function toLatin1(t) {
  let r =
    typeof t === "string"
      ? t
      : ArrayBuffer.isView(t)
        ? Buffer.from(t.buffer, t.byteOffset, t.byteLength).toString("latin1")
        : t instanceof ArrayBuffer
          ? Buffer.from(t).toString("latin1")
          : "";
  for (let n of r.matchAll(/"stream"\s*:\s*true/g)) {
    let o = n.index + n[0].length;
    if (n.index < r.length - o ? jsonDepthDelta(r, 0, n.index) === 1 : jsonDepthDelta(r, o, r.length) === -1)
      return !0;
  }
  return !1;
}
