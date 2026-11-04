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
  "[This Claude apps gateway is in load-test mode. This is a canned reply and your request was not sent to a model. If you did not expect this, tell your gateway administrator.] ";
var LOAD_TEST = "load-test";
var LOAD_TEST_CHUNKS = 3;
var LOAD_TEST_TEXT = "load test   ";
var LOAD_TEST_REPEAT = 20;
var LOAD_TEST_BYTES = 65536;
var LOAD_TEST_WORDS = 32;
var LOAD_TEST_MAX = 1e4;
var ZERO_USAGE = {
  input_tokens: 0,
  output_tokens: 0,
};
//@ chunk-hde10cf2.js:1811-1860 placement
/**
 * 按负载测试分块大小算出需要多少块。
 */
function loadTestChunks(replyTokens) {
  return Math.max(1, Math.ceil(replyTokens / LOAD_TEST_CHUNKS));
}
//@ chunk-hde10cf2.js:1860-2381 placement
function buildLoadTestMessage(replyTokens) {
  let testChunks = loadTestChunks(replyTokens);
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
    {
      type: "content_block_start",
      index: 0,
      content_block: {
        type: "text",
        text: "",
      },
    },
    ...Array.from(
      {
        length: testChunks,
      },
      (replyTokens, message) => ({
        type: "content_block_delta",
        index: 0,
        delta: {
          type: "text_delta",
          text: message === 0 ? LOAD_TEST_REPLY_PREFIX : LOAD_TEST_TEXT,
        },
      }),
    ),
    {
      type: "content_block_stop",
      index: 0,
    },
    {
      type: "message_delta",
      delta: {
        stop_reason: "end_turn",
        stop_sequence: null,
      },
      usage: {
        output_tokens: 0,
      },
    },
    {
      type: "message_stop",
    },
  ];
}
//@ chunk-hde10cf2.js:2381-2891 placement
function encodeEventStreamFrame(payload) {
  let buffer = Buffer.concat(
    [
      [":message-type", "event"],
      [":event-type", "chunk"],
      [":content-type", "application/json"],
    ].map(([name, value]) =>
      Buffer.concat([
        Buffer.from([name.length]),
        Buffer.from(name),
        Buffer.from([7, value.length >> 8, value.length & 255]),
        Buffer.from(value),
      ]),
    ),
  );
  let frame = Buffer.alloc(12 + buffer.length + payload.length + 4);
  frame.writeUInt32BE(frame.length, 0);
  frame.writeUInt32BE(buffer.length, 4);
  frame.writeUInt32BE(Bun.hash.crc32(frame.subarray(0, 8)), 8);
  buffer.copy(frame, 12);
  frame.set(payload, 12 + buffer.length);
  frame.writeUInt32BE(Bun.hash.crc32(frame.subarray(0, frame.length - 4)), frame.length - 4);
  return frame;
}
//@ chunk-hde10cf2.js:2891-3277 placement
async function checkSpendTableEmpty(url, sql) {
  if ((await sql`SELECT 1 FROM spend WHERE cents > 0 LIMIT 1`).length > 0)
    throw Error(
      "load_test_mode is on, but the database at store.postgres_url already holds real spend (a spend row above 0 cents). A load test writes made-up developers into it, so it must not share a database with real developers. Point store.postgres_url at its own empty database.",
    );
  return streamLoadTestReply(url);
}
//@ chunk-hde10cf2.js:3277-3329 placement
/**
 * 按数量选择单复数形式（"1 reply" / "2 replies"）。
 */
function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
//@ chunk-hde10cf2.js:3329-7759 placement
/**
 * 生成 load-test 模式的 SSE/事件流回复（按 reply_tokens 与 reply_seconds 节奏）。
 */
function streamLoadTestReply(config, logEveryMs = LOAD_TEST_MAX) {
  let loadTestMessage = buildLoadTestMessage(config.reply_tokens);
  let replyMs = config.reply_seconds * 1000;
  let loadTestDevices = openLoadTestDevices();
  let frames = loadTestMessage.map((event) =>
    encodeEventStreamFrame(
      Buffer.from(
        jsonStringify({
          bytes: Buffer.from(jsonStringify(event)).toString("base64"),
        }),
      ),
    ),
  );
  let frames_2 = loadTestMessage.map((event) =>
    Buffer.from(`event: ${event.type}
data: ${jsonStringify(event)}

`),
  );
  let jsonBody = jsonStringify({
    id: "msg_loadtest",
    type: "message",
    role: "assistant",
    model: LOAD_TEST,
    content: [
      {
        type: "text",
        text:
          LOAD_TEST_REPLY_PREFIX +
          LOAD_TEST_TEXT.repeat(Math.max(0, loadTestChunks(config.reply_tokens) - 1)),
      },
    ],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: ZERO_USAGE,
  });
  let buffer = Buffer.from(jsonBody);
  let openReplies = new Set();
  let reportTimer;
  let closed = false;
  let windowStartMs = 0;
  let arrivalsInWindow = 0;
  let bodiesInWindow = 0;
  let bodyBytesInWindow = 0;
  let developersInWindow = new Set();
  let finishedInWindow = 0;
  let hungUpInWindow = 0;
  let checkFaultsInWindow = 0;
  let writeFaultsInWindow = 0;
  let lateTotalMs = 0;
  let worstLateMs = 0;
  let EMPTY_TOTALS = {
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
  };
  let totals = {
    ...EMPTY_TOTALS,
  };
  function markBusy(nowMs) {
    if (closed) return;
    if (!reportTimer) {
      windowStartMs = nowMs;
      reportTimer = setInterval(reportTick, LOAD_TEST_REPEAT);
    }
    if (totals.since === 0) totals.since = nowMs;
  }
  function recordFinished(lateMs) {
    if (closed) return;
    markBusy(performance.now());
    finishedInWindow++;
    lateTotalMs += lateMs;
    worstLateMs = Math.max(worstLateMs, lateMs);
  }
  function recordHungUp() {
    if (!closed) hungUpInWindow++;
  }
  function recordArrival() {
    if (closed) return;
    markBusy(performance.now());
    arrivalsInWindow++;
  }
  function recordBodyRead(bodyBytes, developerKey) {
    if (closed) return;
    bodiesInWindow++;
    bodyBytesInWindow += bodyBytes;
    developersInWindow.add(developerKey);
  }
  function recordSpendFault(kind) {
    if (closed) return;
    markBusy(performance.now());
    if (kind === "check") checkFaultsInWindow++;
    else writeFaultsInWindow++;
  }
  function describeSpendFaults(checks, writes) {
    return `${plural(checks, "spend check")} failed, ${plural(writes, "spend write")} failed`;
  }
  function flushWindow(nowMs) {
    let max = Math.max(1, (nowMs - windowStartMs) / 1000);
    let busy =
      arrivalsInWindow +
        finishedInWindow +
        hungUpInWindow +
        checkFaultsInWindow +
        writeFaultsInWindow +
        openReplies.size >
      0;
    if (busy) {
      let meanBodyKb = bodiesInWindow > 0 ? bodyBytesInWindow / bodiesInWindow / 1000 : 0;
      gatewayLog(
        "info",
        `load test, last ${Math.round(max)} s: ${(arrivalsInWindow / max).toFixed(1)} requests/s arrived` +
          (bodiesInWindow > 0
            ? `, ${(bodiesInWindow / max).toFixed(1)}/s with their body read (mean body ${meanBodyKb < 10 ? meanBodyKb.toFixed(1) : Math.round(meanBodyKb)} KB, from ${plural(developersInWindow.size, "developer")})`
            : "") +
          `, ${(finishedInWindow / max).toFixed(1)} replies/s finished, ${plural(openReplies.size, "reply", "replies")} open now, ${plural(hungUpInWindow, "client")} hung up early, ${describeSpendFaults(checkFaultsInWindow, writeFaultsInWindow)}` +
          (finishedInWindow > 0
            ? `; replies ended ${Math.round(lateTotalMs / finishedInWindow)} ms past reply_seconds on average (worst ${Math.round(worstLateMs)} ms)`
            : ""),
      );
      totals.lastBusyAt = nowMs;
    }
    totals.arrivals += arrivalsInWindow;
    totals.bodies += bodiesInWindow;
    totals.finished += finishedInWindow;
    totals.hungUp += hungUpInWindow;
    totals.checkFaults += checkFaultsInWindow;
    totals.writeFaults += writeFaultsInWindow;
    totals.peakArrivalsPerS = Math.max(totals.peakArrivalsPerS, arrivalsInWindow / max);
    totals.worstLateMs = Math.max(totals.worstLateMs, worstLateMs);
    windowStartMs = nowMs;
    arrivalsInWindow = 0;
    bodiesInWindow = 0;
    bodyBytesInWindow = 0;
    developersInWindow.clear();
    finishedInWindow = 0;
    hungUpInWindow = 0;
    checkFaultsInWindow = 0;
    writeFaultsInWindow = 0;
    lateTotalMs = 0;
    worstLateMs = 0;
    return busy;
  }
  function logSummary() {
    if (closed) return;
    let snapshot = totals;
    if (
      snapshot.arrivals + snapshot.finished + snapshot.hungUp + snapshot.checkFaults + snapshot.writeFaults >
      0
    ) {
      let max = Math.max(0, snapshot.arrivals - snapshot.bodies);
      gatewayLog(
        "info",
        `load test summary, over ${Math.max(1, Math.round((snapshot.lastBusyAt - snapshot.since) / 1000))} s: ${plural(snapshot.arrivals, "request")} arrived${max > 0 ? ` (${max} refused before their body was read)` : ""}, ${plural(snapshot.finished, "reply", "replies")} finished, ${plural(snapshot.hungUp, "client")} hung up early, ${describeSpendFaults(snapshot.checkFaults, snapshot.writeFaults)}. Peaks: ${snapshot.peakArrivalsPerS.toFixed(1)} requests/s in the busiest window, ${plural(snapshot.peakOpen, "reply", "replies")} open at once.` +
          (openReplies.size > 0 ? ` ${plural(openReplies.size, "reply", "replies")} still open.` : "") +
          (snapshot.finished > 0
            ? ` The worst reply ended ${Math.round(snapshot.worstLateMs)} ms past reply_seconds.`
            : ""),
      );
    }
    totals = {
      ...EMPTY_TOTALS,
    };
  }
  function closeAll() {
    if (closed) return;
    flushWindow(performance.now());
    logSummary();
    closed = true;
    clearInterval(reportTimer);
    reportTimer = undefined;
  }
  function reportTick() {
    let startTime = performance.now();
    if (openReplies.size === 0) reportTimer?.unref?.();
    if (startTime - windowStartMs >= logEveryMs) {
      if (!flushWindow(startTime)) {
        logSummary();
        clearInterval(reportTimer);
        reportTimer = undefined;
      }
    }
  }
  function streamFrames(frames, contentType, signal) {
    let headers = {
      "content-type": contentType,
    };
    if (replyMs === 0) {
      let buffer = Buffer.concat(frames);
      loadTestDevices.receive(buffer);
      recordFinished(0);
      return new Response(buffer, {
        headers,
      });
    }
    let reply;
    let pump = () => {
      if (!openReplies.has(reply)) return;
      let max = Math.max(
        reply.sent + 1,
        Math.min(
          frames.length,
          Math.floor(((performance.now() - reply.startedAt) / replyMs) * frames.length),
        ),
      );
      try {
        while (reply.sent < max) {
          let frame = frames[reply.sent++];
          reply.ctrl.enqueue(frame);
          loadTestDevices.receive(frame);
        }
      } catch {
        if (openReplies.delete(reply)) recordHungUp();
        return;
      }
      if (reply.sent === frames.length) {
        openReplies.delete(reply);
        try {
          reply.ctrl.close();
        } catch {}
        recordFinished(Math.max(0, performance.now() - reply.startedAt - replyMs));
        return;
      }
      let nextAt = reply.startedAt + ((reply.sent + 1) * replyMs) / frames.length;
      reply.timer = setTimeout(pump, Math.ceil(Math.max(0, nextAt - performance.now())));
    };
    let readableStream = new ReadableStream({
      start(controller) {
        reply = {
          ctrl: controller,
          frames,
          sent: 0,
          startedAt: performance.now(),
        };
        openReplies.add(reply);
        if (!closed) totals.peakOpen = Math.max(totals.peakOpen, openReplies.size);
        markBusy(reply.startedAt);
        reportTimer?.ref?.();
        reply.timer = setTimeout(pump, Math.ceil(replyMs / frames.length));
        signal?.addEventListener(
          "abort",
          () => {
            if (openReplies.delete(reply)) {
              clearTimeout(reply.timer);
              recordHungUp();
              controller.error(signal.reason);
            }
          },
          {
            once: true,
          },
        );
      },
      cancel() {
        if (openReplies.delete(reply)) {
          clearTimeout(reply.timer);
          recordHungUp();
        }
      },
    });
    return new Response(readableStream, {
      headers,
    });
  }
  return {
    fetch: async (input, init) => {
      init?.signal?.throwIfAborted();
      loadTestDevices.send(init?.body);
      let pathname = new URL(input instanceof Request ? input.url : String(input)).pathname;
      if (pathname.endsWith("/count_tokens") || pathname.includes("count-tokens"))
        return Response.json({
          input_tokens: 0,
        });
      if (pathname.endsWith("/invoke-with-response-stream"))
        return streamFrames(frames, "application/vnd.amazon.eventstream", init?.signal);
      let isInvoke = pathname.endsWith("/invoke") || pathname.endsWith(":rawPredict");
      if (pathname.endsWith(":streamRawPredict") || (!isInvoke && toLatin1(init?.body)))
        return streamFrames(frames_2, "text/event-stream", init?.signal);
      loadTestDevices.receive(buffer);
      recordFinished(0);
      return new Response(jsonBody, {
        headers: {
          "content-type": "application/json",
        },
      });
    },
    arrived: recordArrival,
    bodyRead: recordBodyRead,
    spendFault: recordSpendFault,
    close: closeAll,
    socketCostSimulated: loadTestDevices.real,
  };
}
//@ chunk-hde10cf2.js:7759-8852 placement
function openLoadTestDevices() {
  let nullFd = -1;
  let zeroFd = -1;
  try {
    nullFd = openSync("/dev/null", "r+");
    zeroFd = openSync("/dev/zero", "r");
    if (![fstatSync(nullFd), fstatSync(zeroFd)].every((stats) => stats.isCharacterDevice()))
      throw Error("not a character device");
  } catch {
    for (let fd of [nullFd, zeroFd]) if (fd >= 0) closeSync(fd);
    gatewayLog(
      "warn",
      "load_test_mode: this host has no /dev/null or /dev/zero, so CPU per replica will read about a quarter to a third lower than in production. The load test still runs.",
    );
    return {
      real: false,
      send() {},
      receive() {},
    };
  }
  let uint8Array = new Uint8Array(LOAD_TEST_BYTES);
  let failed = false;
  let copyThrough = (source, offset, length) => {
    if (failed) return;
    try {
      writeSync(nullFd, source, offset, length);
      readSync(zeroFd, uint8Array, 0, Math.min(length, uint8Array.length), null);
    } catch (error) {
      failed = true;
      gatewayLog(
        "warn",
        `load_test_mode: simulating a connection's kernel work failed (${error instanceof Error ? error.message : String(error)}), so it stops here and CPU per replica will read lower than in production. The load test still runs.`,
      );
    }
  };
  return {
    real: true,
    send(body) {
      let bytes =
        typeof body === "string"
          ? Buffer.from(body)
          : body instanceof ArrayBuffer
            ? new Uint8Array(body)
            : ArrayBuffer.isView(body)
              ? new Uint8Array(body.buffer, body.byteOffset, body.byteLength)
              : null;
      if (!bytes) return;
      for (let offset = 0; offset < bytes.length; offset += LOAD_TEST_BYTES)
        copyThrough(bytes, offset, Math.min(LOAD_TEST_BYTES, bytes.length - offset));
    },
    receive(chunk) {
      copyThrough(chunk, 0, chunk.length);
      for (let index = 0; index < LOAD_TEST_WORDS && !failed; index++)
        try {
          writeSync(nullFd, chunk, 0, 1);
        } catch {
          failed = true;
        }
    },
  };
}
//@ chunk-hde10cf2.js:8852-8867 placement
/**
 * 方括号开启的字符码（92）。
 */
var BRACKET_CLOSE_CODE = 34;
var BRACKET_OPEN_CODE = 92;
//@ chunk-hde10cf2.js:8867-9064 placement
function jsonDepthDelta(text, from, to) {
  let depth = 0;
  let inString = false;
  for (let index = from; index < to; index++) {
    let code = text.charCodeAt(index);
    if (inString) {
      if (code === BRACKET_OPEN_CODE) index++;
      else if (code === BRACKET_CLOSE_CODE) inString = false;
    } else if (code === BRACKET_CLOSE_CODE) inString = true;
    else if (code === 123 || code === 91) depth++;
    else if (code === 125 || code === 93) depth--;
  }
  return depth;
}
//@ chunk-hde10cf2.js:9064-9413 placement
function toLatin1(body) {
  let rawBody =
    typeof body === "string"
      ? body
      : ArrayBuffer.isView(body)
        ? Buffer.from(body.buffer, body.byteOffset, body.byteLength).toString("latin1")
        : body instanceof ArrayBuffer
          ? Buffer.from(body).toString("latin1")
          : "";
  for (let index of rawBody.matchAll(/"stream"\s*:\s*true/g)) {
    let char = index.index + index[0].length;
    if (
      index.index < rawBody.length - char
        ? jsonDepthDelta(rawBody, 0, index.index) === 1
        : jsonDepthDelta(rawBody, char, rawBody.length) === -1
    )
      return true;
  }
  return false;
}
export { checkSpendTableEmpty };
