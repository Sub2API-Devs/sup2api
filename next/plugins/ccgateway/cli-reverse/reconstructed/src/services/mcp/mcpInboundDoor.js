/**
 * services/mcp/mcpInboundDoor.ts
 *
 * 2.1.316 新增。MCP 入站检查：在 fetch 响应（JSON 或 SSE）中检查 tools/call 结果，必要时替换为占位结果。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qdrjj20r.js (12)
 * attribution: placement 11, layout 1
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { isJsonNestingWithin, countJsonMembers, sliceTopLevelValues } from "../../utils/jsonScan.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { createParser } from "../../../vendor/eventsource-parser/dist/index.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-qdrjj20r.js:416-438 placement
/**
 * 按宿主保存的入站门状态。
 */
var inboundDoorState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qdrjj20r.js:416", () => {
  inboundDoorState = new HostScoped(() => ({}));
});
//@ chunk-qdrjj20r.js:438-473 placement
/**
 * 取当前宿主的入站门状态。
 */
function getInboundDoorState() {
  return inboundDoorState.of(getRootSession().host);
}
//@ chunk-qdrjj20r.js:473-512 placement
function hasMcpInboundDoor() {
  return getInboundDoorState().door !== undefined;
}
//@ chunk-qdrjj20r.js:512-589 placement
/**
 * 判定“简短错误”的字符数（1024）。
 */
var MAX_TRACKED_IDS = 1024;
var MAX_ID_CHARS = 32;
var MAX_NESTING_PARSED = 1024;
var MAX_ID_PARSE_CHARS = 256;
var ID_START_RE = /^[-\d"]/;
var MAX_BUFFER_CHARS = 65536;
var MAX_SENT_IDS = 128;
var SHORT_ERROR_MEMBERS = 16;
var SHORT_ERROR_CHARS = 1024;
var MIN_TURN_MEMBER_COUNT = 65536;
//@ chunk-qdrjj20r.js:589-3046 placement
/**
 * MCP 入站检查：在 fetch 响应（JSON 或 SSE）中检查 tools/call 结果，必要时替换为占位结果。
 */
function mcpInboundDoorOnFetch() {
  let { door } = getInboundDoorState();
  if (door === undefined) return;
  let asked = new Map();
  let answered = new Map();
  let normalizeId = (id) =>
    typeof id === "string" && id.length <= MAX_ID_CHARS && !asked.has(id) && !answered.has(id)
      ? Number(id)
      : id;
  let forgetId = (id) => {
    asked.delete(id);
    answered.delete(id);
  };
  let makeSide = (
    url,
    mayBeError,
    flags = {
      any: false,
      lastMayBeShortError: false,
    },
  ) => ({
    read(text) {
      let length = text.length;
      flags.lastMayBeShortError = mayBeError && !flags.any && length <= SHORT_ERROR_CHARS;
      flags.any = true;
      let mostMembers = door.mostMembers(undefined, url);
      if (flags.lastMayBeShortError) mostMembers = Math.max(mostMembers, SHORT_ERROR_MEMBERS);
      let nestingTooDeep = !isJsonNestingWithin(text, MAX_NESTING_PARSED);
      let size = nestingTooDeep
        ? undefined
        : countJsonMembers(text, mostMembers, Math.min(mostMembers, PROBE_MEMBERS));
      let known;
      let candidateText = text;
      if (size === undefined) {
        let topLevel = sliceTopLevelValues(text, ESSENTIAL_MESSAGE_KEYS);
        let rawId = topLevel?.has("method") ? undefined : topLevel?.get("id");
        let parsedId =
          rawId !== undefined && rawId.length <= MAX_ID_PARSE_CHARS && ID_START_RE.test(rawId)
            ? tryParseJson(rawId)
            : undefined;
        let idKey = normalizeId(parsedId);
        let tracked = asked.get(idKey) ?? answered.get(idKey);
        if (tracked !== undefined) {
          known = {
            id: parsedId,
            asked: tracked,
          };
          mostMembers = door.mostMembers(tracked, url);
          size = nestingTooDeep ? undefined : countJsonMembers(text, mostMembers);
          if (size === undefined && !nestingTooDeep)
            candidateText = door.withoutWhatIsDropped?.(text, tracked, url) ?? text;
          if (candidateText !== text) {
            nestingTooDeep = !isJsonNestingWithin(candidateText, MAX_NESTING_PARSED);
            size = nestingTooDeep ? undefined : countJsonMembers(candidateText, mostMembers);
          }
        }
      }
      let parsed = size === undefined ? undefined : tryParseJson(candidateText);
      if (size !== undefined && parsed !== undefined)
        return candidateText === text
          ? {
              sent: parsed,
              size: {
                ...size,
                length,
              },
            }
          : {
              sent: parsed,
              size: {
                ...size,
                length,
                lighter: true,
              },
              readInstead: candidateText,
            };
      if (size !== undefined && known === undefined) {
        let sizeInfo = {
          ...size,
          length,
        };
        if (flags.lastMayBeShortError && sizeInfo.members <= SHORT_ERROR_MEMBERS)
          return {
            sent: undefined,
            size: sizeInfo,
          };
        door.chargeUnasked(url, sizeInfo.members);
        return door.judge(text, undefined, url, sizeInfo) === undefined
          ? {
              standIn: undefined,
            }
          : {
              sent: undefined,
              size: sizeInfo,
            };
      }
      forgetId(normalizeId(known?.id));
      return {
        standIn: door.standInForUnparsed(
          known,
          url,
          nestingTooDeep
            ? {
                reason: "nesting",
              }
            : size === undefined
              ? {
                  reason: "members",
                  most: mostMembers,
                }
              : {
                  reason: "not_json",
                },
        ),
      };
    },
    chargeUnasked({ members }) {
      door.chargeUnasked(url, members);
    },
    judge(message, size, ofAnArray) {
      let idKey =
        isPlainObject(message) && message.method === undefined ? normalizeId(message.id) : undefined;
      let askedEntry = asked.get(idKey);
      let known = askedEntry ?? answered.get(idKey);
      if (
        flags.lastMayBeShortError &&
        size.members <= SHORT_ERROR_MEMBERS &&
        !ofAnArray &&
        known === undefined &&
        isPlainObject(message) &&
        message.method === undefined &&
        (message.result === undefined || message.result === null)
      )
        return message;
      if (askedEntry !== undefined) {
        asked.delete(idKey);
        if (answered.size >= MAX_TRACKED_IDS) answered.delete(answered.keys().next().value);
        answered.set(idKey, {
          ...askedEntry,
          answeredBefore: true,
        });
      }
      if ((known === undefined || known.answeredBefore) && !ofAnArray) door.chargeUnasked(url, size.members);
      let judged = door.judge(
        message,
        known,
        url,
        ofAnArray
          ? {
              ...size,
              ofAnArray: true,
            }
          : size,
      );
      if (judged !== message) forgetId(idKey);
      return judged;
    },
    turnFor(member, ofArray) {
      return member >= MIN_TURN_MEMBER_COUNT ? door.turnForText?.(ofArray, url) : undefined;
    },
  });
  return {
    noteRequests(body) {
      if (typeof body !== "string") return;
      let parsed = tryParseJson(body);
      let messages = Array.isArray(parsed) ? parsed : [parsed];
      for (let message of messages) {
        if (!isPlainObject(message)) continue;
        let { id, method, params } = message;
        if (id !== undefined && typeof method === "string") {
          if (asked.size >= MAX_TRACKED_IDS) asked.delete(asked.keys().next().value);
          let toolName = method === "tools/call" && isPlainObject(params) ? params.name : undefined;
          asked.set(id, {
            method,
            ...(typeof toolName === "string" && {
              tool: toolName,
            }),
            ...(isPlainObject(params) &&
              params.cursor !== undefined && {
                hasCursor: true,
              }),
          });
        }
      }
    },
    judging({ url, isGet, ok, contentType }) {
      let side = makeSide(url, !ok && !isGet);
      let lower = (contentType ?? "").toLowerCase();
      if (lower.includes("text/event-stream") || (isGet && ok))
        return {
          through: sseInboundDoor(side),
          contentType: "text/event-stream",
        };
      return {
        through: jsonInboundDoor(side),
        contentType: lower.includes("application/json") ? "application/json" : undefined,
      };
    },
  };
}
//@ chunk-qdrjj20r.js:3046-3081 placement
/**
 * 探测 JSON 成员数时的上限（8）。
 */
var ESSENTIAL_MESSAGE_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PROBE_MEMBERS;
deferInit("chunk-qdrjj20r.js:3046", () => {
  ESSENTIAL_MESSAGE_KEYS = new Set(["id", "method"]);
  PROBE_MEMBERS = 8;
});
//@ chunk-qdrjj20r.js:3081-3127 placement
/**
 * 去掉开头的 BOM。
 */
function stripBom(text) {
  return text.replace(/^\uFEFF+/, "");
}
//@ chunk-qdrjj20r.js:3127-3172 placement
/**
 * 尝试解析 JSON，失败返回 undefined。
 */
function tryParseJson(text) {
  try {
    return jsonParse(text);
  } catch {
    return;
  }
}
//@ chunk-qdrjj20r.js:3172-3231 layout
function tryEnqueue(controller, chunk) {
  try {
    controller.enqueue(chunk);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-qdrjj20r.js:3231-3312 placement
/**
 * 把结果写入流（可指定替换内容）。
 */
function enqueueBody(controller, chunks, readInstead) {
  for (let chunk of readInstead === undefined ? chunks : [new TextEncoder().encode(readInstead)])
    tryEnqueue(controller, chunk);
}
//@ chunk-qdrjj20r.js:3312-4111 placement
/**
 * JSON 响应体的入站检查
 */
function jsonInboundDoor({ read, chargeUnasked, judge, turnFor }) {
  let chunks = [];
  let pending = 0;
  return new TransformStream({
    transform(chunk) {
      chunks.push(chunk);
      pending += chunk.length;
    },
    async flush(controller) {
      await turnFor(pending, "reading");
      let result = read(stripBom(new TextDecoder().decode(Buffer.concat(chunks))));
      if ("standIn" in result) {
        tryEnqueue(controller, new TextEncoder().encode(jsonStringify(result.standIn ?? null)));
        return;
      }
      let { sent, size, readInstead } = result;
      if (typeof sent !== "object" || sent === null) {
        await turnFor(pending, "handingOn");
        enqueueBody(controller, chunks, readInstead);
        return;
      }
      if (Array.isArray(sent)) chargeUnasked(size);
      if (Array.isArray(sent) && sent.length > MAX_SENT_IDS) {
        tryEnqueue(controller, new TextEncoder().encode("null"));
        return;
      }
      let judged;
      let unchanged;
      if (Array.isArray(sent)) {
        let messages = sent;
        let filtered = messages
          .map((message) => judge(message, size, true))
          .filter((judgedMessage) => judgedMessage !== undefined);
        judged = filtered;
        unchanged =
          filtered.length === messages.length &&
          messages.every((message, index) => message === filtered[index]);
      } else {
        judged = judge(sent, size, false);
        unchanged = judged === sent;
      }
      if (unchanged) {
        await turnFor(pending, "handingOn");
        enqueueBody(controller, chunks, readInstead);
        return;
      }
      let bytes = new TextEncoder().encode(jsonStringify(judged ?? null));
      await turnFor(bytes.length, "handingOn");
      tryEnqueue(controller, bytes);
    },
  });
}
//@ chunk-qdrjj20r.js:4111-5252 placement
/**
 * SSE 响应流的入站检查
 */
function sseInboundDoor({ read, judge, turnFor }) {
  let textDecoder = new TextDecoder();
  let textEncoder = new TextEncoder();
  let decoder = [];
  let parser = createParser({
    onRetry(retryMs) {
      decoder.push(retryMs);
    },
    onEvent(event) {
      decoder.push(event);
    },
  });
  let data = ({ id, event, data }) => {
    let eventName = event;
    let payload = data;
    if (data !== "" && (eventName === undefined || eventName === "message")) {
      let result = read(stripBom(data));
      let sent = "standIn" in result ? undefined : result.sent;
      let judged =
        "standIn" in result
          ? result.standIn
          : sent === undefined
            ? undefined
            : judge(sent, result.size, false);
      if (!("standIn" in result) && sent === undefined) payload = "!";
      else if (judged === undefined) {
        eventName = "dropped";
        payload = "";
      } else if (judged !== sent) payload = jsonStringify(judged);
      else
        payload = (("standIn" in result ? undefined : result.readInstead) ?? data).replaceAll(
          `
`,
          " ",
        );
    } else if (data.length > MAX_BUFFER_CHARS) payload = "";
    return (
      (eventName === undefined
        ? ""
        : `event: ${eventName}
`) +
      (id === undefined
        ? ""
        : `id: ${id}
`) +
      payload
        .split(
          `
`,
        )
        .map(
          (line) => `data: ${line}
`,
        )
        .join("") +
      `
`
    );
  };
  let queued = async (controller) => {
    let out = decoder;
    decoder = [];
    let queued = "";
    for (let buffer of out) {
      if (typeof buffer === "number") {
        queued += `retry: ${buffer}

`;
        continue;
      }
      let event =
        buffer.event === undefined || buffer.event === "message"
          ? turnFor(buffer.data.length, "reading")
          : undefined;
      if (event !== undefined) {
        if (queued !== "" && !tryEnqueue(controller, textEncoder.encode(queued))) return;
        queued = "";
        await event;
      }
      let gate = data(buffer);
      queued += gate;
      let written = turnFor(gate.length, "handingOn");
      if (written !== undefined) {
        await written;
        if (!tryEnqueue(controller, textEncoder.encode(queued))) return;
        queued = "";
      }
    }
    if (queued !== "") tryEnqueue(controller, textEncoder.encode(queued));
  };
  return new TransformStream({
    async transform(chunk, controller) {
      parser.feed(
        textDecoder.decode(chunk, {
          stream: true,
        }),
      );
      await queued(controller);
    },
    async flush(controller) {
      parser.feed(textDecoder.decode());
      await queued(controller);
    },
  });
}
export { hasMcpInboundDoor, MAX_NESTING_PARSED, mcpInboundDoorOnFetch };
