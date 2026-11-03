/**
 * services/mcp/mcpInboundDoor.ts
 *
 * 2.1.316 新增。MCP 入站检查：在 fetch 响应（JSON 或 SSE）中检查 tools/call 结果，必要时替换为占位结果。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ma4kr1qn.js (11)
 * attribution: placement 11
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { isJsonNestingWithin, countJsonMembers, sliceTopLevelValues } from "../../utils/jsonScan.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { createParser } from "../../../vendor/eventsource-parser/dist/index.js";

//@ chunk-ma4kr1qn.js:416-438 placement
/**
 * 按宿主保存的入站门状态。
 */
var inboundDoorState = new HostScoped(() => ({}));
//@ chunk-ma4kr1qn.js:438-473 placement
/**
 * 取当前宿主的入站门状态。
 */
function getInboundDoorState() {
  return inboundDoorState.of(getRootSession().host);
}
//@ chunk-ma4kr1qn.js:473-513 placement
function hasMcpInboundDoor() {
  return getInboundDoorState().door !== undefined;
}
//@ chunk-ma4kr1qn.js:513-582 placement
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
//@ chunk-ma4kr1qn.js:582-2985 placement
/**
 * MCP 入站检查：在 fetch 响应（JSON 或 SSE）中检查 tools/call 结果，必要时替换为占位结果。
 */
function mcpInboundDoorOnFetch() {
  let { door } = getInboundDoorState();
  if (door === undefined) return;
  let c = new Map();
  let a = new Map();
  let m = (id) =>
    typeof id === "string" && id.length <= MAX_ID_CHARS && !c.has(id) && !a.has(id) ? Number(id) : id;
  let f = (n) => {
    c.delete(n);
    a.delete(n);
  };
  let g = (
    url,
    d,
    u = {
      any: false,
      lastMayBeShortError: false,
    },
  ) => ({
    read(e) {
      let s = e.length;
      u.lastMayBeShortError = d && !u.any && s <= SHORT_ERROR_CHARS;
      u.any = true;
      let r = door.mostMembers(undefined, url);
      if (u.lastMayBeShortError) r = Math.max(r, SHORT_ERROR_MEMBERS);
      let t = !isJsonNestingWithin(e, MAX_NESTING_PARSED);
      let o = t ? undefined : countJsonMembers(e, r, Math.min(r, PROBE_MEMBERS));
      let l;
      let p = e;
      if (o === undefined) {
        let M = sliceTopLevelValues(e, ESSENTIAL_MESSAGE_KEYS);
        let h = M?.has("method") ? undefined : M?.get("id");
        let w =
          h !== undefined && h.length <= MAX_ID_PARSE_CHARS && ID_START_RE.test(h)
            ? tryParseJson(h)
            : undefined;
        let R = m(w);
        let y = c.get(R) ?? a.get(R);
        if (y !== undefined) {
          l = {
            id: w,
            asked: y,
          };
          r = door.mostMembers(y, url);
          o = t ? undefined : countJsonMembers(e, r);
          if (o === undefined && !t) p = door.withoutWhatIsDropped?.(e, y, url) ?? e;
          if (p !== e) {
            t = !isJsonNestingWithin(p, MAX_NESTING_PARSED);
            o = t ? undefined : countJsonMembers(p, r);
          }
        }
      }
      let A = o === undefined ? undefined : tryParseJson(p);
      if (o !== undefined && A !== undefined)
        return p === e
          ? {
              sent: A,
              size: {
                ...o,
                length: s,
              },
            }
          : {
              sent: A,
              size: {
                ...o,
                length: s,
                lighter: true,
              },
              readInstead: p,
            };
      if (o !== undefined && l === undefined) {
        let M = {
          ...o,
          length: s,
        };
        if (u.lastMayBeShortError && M.members <= SHORT_ERROR_MEMBERS)
          return {
            sent: undefined,
            size: M,
          };
        door.chargeUnasked(url, M.members);
        return door.judge(e, undefined, url, M) === undefined
          ? {
              standIn: undefined,
            }
          : {
              sent: undefined,
              size: M,
            };
      }
      f(m(l?.id));
      return {
        standIn: door.standInForUnparsed(
          l,
          url,
          t
            ? {
                reason: "nesting",
              }
            : o === undefined
              ? {
                  reason: "members",
                  most: r,
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
    judge(e, s, r) {
      let t = isPlainObject(e) && e.method === undefined ? m(e.id) : undefined;
      let o = c.get(t);
      let l = o ?? a.get(t);
      if (
        u.lastMayBeShortError &&
        s.members <= SHORT_ERROR_MEMBERS &&
        !r &&
        l === undefined &&
        isPlainObject(e) &&
        e.method === undefined &&
        (e.result === undefined || e.result === null)
      )
        return e;
      if (o !== undefined) {
        c.delete(t);
        if (a.size >= MAX_TRACKED_IDS) a.delete(a.keys().next().value);
        a.set(t, {
          ...o,
          answeredBefore: true,
        });
      }
      if ((l === undefined || l.answeredBefore) && !r) door.chargeUnasked(url, s.members);
      let p = door.judge(
        e,
        l,
        url,
        r
          ? {
              ...s,
              ofAnArray: true,
            }
          : s,
      );
      if (p !== e) f(t);
      return p;
    },
  });
  return {
    noteRequests(n) {
      if (typeof n !== "string") return;
      let d = tryParseJson(n);
      let u = Array.isArray(d) ? d : [d];
      for (let e of u) {
        if (!isPlainObject(e)) continue;
        let { id, method, params } = e;
        if (id !== undefined && typeof method === "string") {
          if (c.size >= MAX_TRACKED_IDS) c.delete(c.keys().next().value);
          let o = method === "tools/call" && isPlainObject(params) ? params.name : undefined;
          c.set(id, {
            method,
            ...(typeof o === "string" && {
              tool: o,
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
      let s = g(url, !ok && !isGet);
      let lower = (contentType ?? "").toLowerCase();
      if (lower.includes("text/event-stream") || (isGet && ok))
        return {
          through: sseInboundDoor(s),
          contentType: "text/event-stream",
        };
      return {
        through: jsonInboundDoor(s),
        contentType: lower.includes("application/json") ? "application/json" : undefined,
      };
    },
  };
}
//@ chunk-ma4kr1qn.js:2985-3020 placement
/**
 * 探测 JSON 成员数时的上限（8）。
 */
var ESSENTIAL_MESSAGE_KEYS = new Set(["id", "method"]);
var PROBE_MEMBERS = 8;
//@ chunk-ma4kr1qn.js:3020-3066 placement
/**
 * 去掉开头的 BOM。
 */
function stripBom(i) {
  return i.replace(/^\uFEFF+/, "");
}
//@ chunk-ma4kr1qn.js:3066-3111 placement
/**
 * 尝试解析 JSON，失败返回 undefined。
 */
function tryParseJson(i) {
  try {
    return jsonParse(i);
  } catch {
    return;
  }
}
//@ chunk-ma4kr1qn.js:3111-3198 placement
/**
 * 把结果写入流（可指定替换内容）。
 */
function enqueueBody(i, c, readInstead) {
  for (let m of readInstead === undefined ? c : [new TextEncoder().encode(readInstead)]) i.enqueue(m);
}
//@ chunk-ma4kr1qn.js:3198-3878 placement
/**
 * JSON 响应体的入站检查
 */
function jsonInboundDoor({ read, chargeUnasked, judge }) {
  let m = [];
  return new TransformStream({
    transform(f) {
      m.push(f);
    },
    flush(f) {
      let g = read(stripBom(new TextDecoder().decode(Buffer.concat(m))));
      if ("standIn" in g) {
        f.enqueue(new TextEncoder().encode(jsonStringify(g.standIn ?? null)));
        return;
      }
      let { sent, size, readInstead } = g;
      if (typeof sent !== "object" || sent === null) {
        enqueueBody(f, m, readInstead);
        return;
      }
      if (Array.isArray(sent)) chargeUnasked(size);
      if (Array.isArray(sent) && sent.length > MAX_SENT_IDS) {
        f.enqueue(new TextEncoder().encode("null"));
        return;
      }
      let e;
      let s;
      if (Array.isArray(sent)) {
        let r = sent;
        let filtered = r.map((o) => judge(o, size, true)).filter((o) => o !== undefined);
        e = filtered;
        s = filtered.length === r.length && r.every((o, l) => o === filtered[l]);
      } else {
        e = judge(sent, size, false);
        s = e === sent;
      }
      if (s) {
        enqueueBody(f, m, readInstead);
        return;
      }
      f.enqueue(new TextEncoder().encode(jsonStringify(e ?? null)));
    },
  });
}
//@ chunk-ma4kr1qn.js:3878-4643 placement
/**
 * SSE 响应流的入站检查
 */
function sseInboundDoor({ read, judge }) {
  let textDecoder = new TextDecoder();
  let textEncoder = new TextEncoder();
  let f = "";
  let parser = createParser({
    onRetry(d) {
      f += `retry: ${d}

`;
    },
    onEvent({ id, event, data: e }) {
      let s = event;
      let r = e;
      if (e !== "" && (s === undefined || s === "message")) {
        let t = read(stripBom(e));
        let sent = "standIn" in t ? undefined : t.sent;
        let l = "standIn" in t ? t.standIn : sent === undefined ? undefined : judge(sent, t.size, false);
        if (!("standIn" in t) && sent === undefined) r = "!";
        else if (l === undefined) {
          s = "dropped";
          r = "";
        } else if (l !== sent) r = jsonStringify(l);
        else
          r = (("standIn" in t ? undefined : t.readInstead) ?? e).replaceAll(
            `
`,
            " ",
          );
      } else if (e.length > MAX_BUFFER_CHARS) r = "";
      f +=
        (s === undefined
          ? ""
          : `event: ${s}
`) +
        (id === undefined
          ? ""
          : `id: ${id}
`) +
        r
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
`;
    },
  });
  let n = (d) => {
    if (f !== "") {
      d.enqueue(textEncoder.encode(f));
      f = "";
    }
  };
  return new TransformStream({
    transform(d, u) {
      parser.feed(
        textDecoder.decode(d, {
          stream: true,
        }),
      );
      n(u);
    },
    flush(d) {
      parser.feed(textDecoder.decode());
      n(d);
    },
  });
}
export { mcpInboundDoorOnFetch, hasMcpInboundDoor, MAX_NESTING_PARSED };
