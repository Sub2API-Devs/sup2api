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
import { isJsonNestingWithin, countJsonMembers, Bpe } from "../../utils/jsonScan.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { wTt } from "../../../vendor/eventsource-parser/dist/index.js";

//@ chunk-ma4kr1qn.js:416-438 placement
var U = new HostScoped(() => ({}));
//@ chunk-ma4kr1qn.js:438-473 placement
function T() {
  return U.of(getRootSession().host);
}
//@ chunk-ma4kr1qn.js:473-513 placement
function hasMcpInboundDoor() {
  return T().door !== void 0;
}
//@ chunk-ma4kr1qn.js:513-582 placement
var E = 1024,
  O = 32,
  MAX_NESTING_PARSED = 1024,
  j = 256,
  v = /^[-\d"]/,
  q = 65536,
  N = 128,
  k = 16,
  x = 1024;
/**
 * MCP 入站检查：在 fetch 响应（JSON 或 SSE）中检查 tools/call 结果，必要时替换为占位结果。
 */
//@ chunk-ma4kr1qn.js:582-2985 placement
function mcpInboundDoorOnFetch() {
  let { door: door } = T();
  if (door === void 0) return;
  let c = new Map(),
    a = new Map(),
    m = (n) => (typeof n === "string" && n.length <= O && !c.has(n) && !a.has(n) ? Number(n) : n),
    f = (n) => {
      (c.delete(n), a.delete(n));
    },
    g = (n, d, u = { any: !1, lastMayBeShortError: !1 }) => ({
      read(e) {
        let s = e.length;
        ((u.lastMayBeShortError = d && !u.any && s <= x), (u.any = !0));
        let mostMembers = door.mostMembers(void 0, n);
        if (u.lastMayBeShortError) mostMembers = Math.max(mostMembers, k);
        let t = !isJsonNestingWithin(e, MAX_NESTING_PARSED),
          o = t ? void 0 : countJsonMembers(e, mostMembers, Math.min(mostMembers, F)),
          l,
          p = e;
        if (o === void 0) {
          let M = Bpe(e, z),
            h = M?.has("method") ? void 0 : M?.get("id"),
            w = h !== void 0 && h.length <= j && v.test(h) ? S(h) : void 0,
            R = m(w),
            y = c.get(R) ?? a.get(R);
          if (y !== void 0) {
            if (
              ((l = { id: w, asked: y }),
              (mostMembers = door.mostMembers(y, n)),
              (o = t ? void 0 : countJsonMembers(e, mostMembers)),
              o === void 0 && !t)
            )
              p = door.withoutWhatIsDropped?.(e, y, n) ?? e;
            if (p !== e)
              ((t = !isJsonNestingWithin(p, MAX_NESTING_PARSED)),
                (o = t ? void 0 : countJsonMembers(p, mostMembers)));
          }
        }
        let A = o === void 0 ? void 0 : S(p);
        if (o !== void 0 && A !== void 0)
          return p === e
            ? { sent: A, size: { ...o, length: s } }
            : { sent: A, size: { ...o, length: s, lighter: !0 }, readInstead: p };
        if (o !== void 0 && l === void 0) {
          let M = { ...o, length: s };
          if (u.lastMayBeShortError && M.members <= k) return { sent: void 0, size: M };
          return (
            door.chargeUnasked(n, M.members),
            door.judge(e, void 0, n, M) === void 0 ? { standIn: void 0 } : { sent: void 0, size: M }
          );
        }
        return (
          f(m(l?.id)),
          {
            standIn: door.standInForUnparsed(
              l,
              n,
              t
                ? { reason: "nesting" }
                : o === void 0
                  ? { reason: "members", most: mostMembers }
                  : { reason: "not_json" },
            ),
          }
        );
      },
      chargeUnasked({ members: e }) {
        door.chargeUnasked(n, e);
      },
      judge(e, s, r) {
        let t = isPlainObject(e) && e.method === void 0 ? m(e.id) : void 0,
          o = c.get(t),
          l = o ?? a.get(t);
        if (
          u.lastMayBeShortError &&
          s.members <= k &&
          !r &&
          l === void 0 &&
          isPlainObject(e) &&
          e.method === void 0 &&
          (e.result === void 0 || e.result === null)
        )
          return e;
        if (o !== void 0) {
          if ((c.delete(t), a.size >= E)) a.delete(a.keys().next().value);
          a.set(t, { ...o, answeredBefore: !0 });
        }
        if ((l === void 0 || l.answeredBefore) && !r) door.chargeUnasked(n, s.members);
        let judge = door.judge(e, l, n, r ? { ...s, ofAnArray: !0 } : s);
        if (judge !== e) f(t);
        return judge;
      },
    });
  return {
    noteRequests(n) {
      if (typeof n !== "string") return;
      let d = S(n),
        u = Array.isArray(d) ? d : [d];
      for (let e of u) {
        if (!isPlainObject(e)) continue;
        let { id: id, method: method, params: params } = e;
        if (id !== void 0 && typeof method === "string") {
          if (c.size >= E) c.delete(c.keys().next().value);
          let o = method === "tools/call" && isPlainObject(params) ? params.name : void 0;
          c.set(id, {
            method: method,
            ...(typeof o === "string" && { tool: o }),
            ...(isPlainObject(params) && params.cursor !== void 0 && { hasCursor: !0 }),
          });
        }
      }
    },
    judging({ url: n, isGet: d, ok: u, contentType: e }) {
      let s = g(n, !u && !d),
        lower = (e ?? "").toLowerCase();
      if (lower.includes("text/event-stream") || (d && u))
        return { through: sseInboundDoor(s), contentType: "text/event-stream" };
      return {
        through: jsonInboundDoor(s),
        contentType: lower.includes("application/json") ? "application/json" : void 0,
      };
    },
  };
}
//@ chunk-ma4kr1qn.js:2985-3020 placement
var z = new Set(["id", "method"]),
  F = 8;
//@ chunk-ma4kr1qn.js:3020-3066 placement
function I(i) {
  return i.replace(/^\uFEFF+/, "");
}
//@ chunk-ma4kr1qn.js:3066-3111 placement
function S(i) {
  try {
    return jsonParse(i);
  } catch {
    return;
  }
}
//@ chunk-ma4kr1qn.js:3111-3198 placement
function b(i, c, a) {
  for (let m of a === void 0 ? c : [new TextEncoder().encode(a)]) i.enqueue(m);
}
/**
 * JSON 响应体的入站检查
 */
//@ chunk-ma4kr1qn.js:3198-3878 placement
function jsonInboundDoor({ read: read, chargeUnasked: chargeUnasked, judge: judge }) {
  let m = [];
  return new TransformStream({
    transform(f) {
      m.push(f);
    },
    flush(f) {
      let g = read(I(new TextDecoder().decode(Buffer.concat(m))));
      if ("standIn" in g) {
        f.enqueue(new TextEncoder().encode(jsonStringify(g.standIn ?? null)));
        return;
      }
      let { sent: sent, size: size, readInstead: readInstead } = g;
      if (typeof sent !== "object" || sent === null) {
        b(f, m, readInstead);
        return;
      }
      if (Array.isArray(sent)) chargeUnasked(size);
      if (Array.isArray(sent) && sent.length > N) {
        f.enqueue(new TextEncoder().encode("null"));
        return;
      }
      let e, s;
      if (Array.isArray(sent)) {
        let r = sent,
          filtered = r.map((o) => judge(o, size, !0)).filter((o) => o !== void 0);
        ((e = filtered), (s = filtered.length === r.length && r.every((o, l) => o === filtered[l])));
      } else ((e = judge(sent, size, !1)), (s = e === sent));
      if (s) {
        b(f, m, readInstead);
        return;
      }
      f.enqueue(new TextEncoder().encode(jsonStringify(e ?? null)));
    },
  });
}
/**
 * SSE 响应流的入站检查
 */
//@ chunk-ma4kr1qn.js:3878-4643 placement
function sseInboundDoor({ read: read, judge: judge }) {
  let textDecoder = new TextDecoder(),
    textEncoder = new TextEncoder(),
    f = "",
    g = wTt({
      onRetry(d) {
        f += `retry: ${d}

`;
      },
      onEvent({ id: d, event: u, data: e }) {
        let s = u,
          r = e;
        if (e !== "" && (s === void 0 || s === "message")) {
          let t = read(I(e)),
            o = "standIn" in t ? void 0 : t.sent,
            l = "standIn" in t ? t.standIn : o === void 0 ? void 0 : judge(o, t.size, !1);
          if (!("standIn" in t) && o === void 0) r = "!";
          else if (l === void 0) ((s = "dropped"), (r = ""));
          else if (l !== o) r = jsonStringify(l);
          else
            r = (("standIn" in t ? void 0 : t.readInstead) ?? e).replaceAll(
              `
`,
              " ",
            );
        } else if (e.length > q) r = "";
        f +=
          (s === void 0
            ? ""
            : `event: ${s}
`) +
          (d === void 0
            ? ""
            : `id: ${d}
`) +
          r
            .split(
              `
`,
            )
            .map(
              (t) => `data: ${t}
`,
            )
            .join("") +
          `
`;
      },
    }),
    n = (d) => {
      if (f !== "") (d.enqueue(textEncoder.encode(f)), (f = ""));
    };
  return new TransformStream({
    transform(d, u) {
      (g.feed(textDecoder.decode(d, { stream: !0 })), n(u));
    },
    flush(d) {
      (g.feed(textDecoder.decode()), n(d));
    },
  });
}

export { mcpInboundDoorOnFetch, hasMcpInboundDoor, MAX_NESTING_PARSED };
