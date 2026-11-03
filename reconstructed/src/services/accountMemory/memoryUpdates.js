/**
 * services/accountMemory/memoryUpdates.ts
 *
 * memory_read 结果过期提示与读路径收集（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (9)
 * attribution: placement 9
 */
import { Pf } from "../../utils/untrustedValues.js";
import { CLONE_DEPTH_THRESHOLD } from "../../utils/structuredCloneLimits.js";
import { ZT, iu, nv, tv, regExp_4 } from "../../tools/MemoryTool/MemoryTool.js";
import { ONe } from "./accountMemoryServer.js";
import { normalizeMemoryText } from "../../memdir/memdir.js";

//@ chunk-s61vbvea.js:84365-84518 placement
function getOwnValue(e, n) {
  if (typeof e !== "object" || e === null || Pf(e)) return;
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(e, n);
  return ownPropertyDescriptor !== void 0 && "value" in ownPropertyDescriptor
    ? ownPropertyDescriptor.value
    : void 0;
}
//@ chunk-s61vbvea.js:84518-84802 placement
function getStringArrayItems(e) {
  if (typeof e !== "object" || e === null || Pf(e) || !Array.isArray(e)) return [];
  let n = e.length;
  if (!Number.isSafeInteger(n) || n > CLONE_DEPTH_THRESHOLD) return [];
  let r = [];
  for (let s = 0; s < n; s++) {
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(e, s);
    if (
      ownPropertyDescriptor &&
      "value" in ownPropertyDescriptor &&
      typeof ownPropertyDescriptor.value === "string"
    )
      r.push(ownPropertyDescriptor.value);
  }
  return r;
}
//@ chunk-s61vbvea.js:84802-84981 placement
function parseMemoryTagVersions(e) {
  let n = [...e.matchAll(ZT)];
  return n.flatMap((r, s) => {
    let h = r.index + r[0].length + 1,
      y = n[s + 1]?.index ?? e.length,
      S = iu.exec(e.slice(h, y))?.[1];
    return S ? [[ONe(r[1]), S]] : [];
  });
}
//@ chunk-s61vbvea.js:84981-85431 placement
function parseMemoryDocumentTag(e) {
  let n = nv.exec(e)?.[1];
  if (n === void 0) return [];
  let r = `memory_document_${n}`,
    s = `
</${r}>`,
    h = `
<${r} `,
    y,
    S,
    w = [];
  for (let R of e.matchAll(
    new RegExp(
      `^<${r} path="([^"
]*)">
`,
      "gm",
    ),
  )) {
    let x = R.index + R[0].length;
    if (y === void 0 || (y >= 0 && y < x)) y = e.indexOf(s, x);
    if (S === void 0 || (S >= 0 && S < x)) S = e.indexOf(h, x);
    let P = y + s.length;
    if (
      y < 0 ||
      (P < e.length &&
        e[P] !==
          `
`) ||
      (S >= 0 && S + h.length <= y)
    )
      continue;
    let j = iu.exec(e.slice(x, y))?.[1];
    if (j) w.push([ONe(R[1]), j]);
  }
  return w;
}
/**
 * 找出本会话读过、但当前版本已变（且不是本会话自己写入的）的记忆路径。
 */
//@ chunk-s61vbvea.js:85431-85600 placement
function findStaleReads(e, n) {
  let { read: read, written: written } = collectMemoryReadPaths(n);
  return [...read]
    .filter(([h, y]) => {
      let S = e[h],
        w = written.get(h);
      return S !== void 0 && S !== y && !w?.has(y) && !w?.has(S);
    })
    .map(([h]) => h)
    .sort();
}
/**
 * 找出跨轮携带、但当前版本已不同的记忆读取路径。
 */
//@ chunk-s61vbvea.js:85600-85732 placement
function findStaleCarriedReads(e, n) {
  let { carried: carried } = collectMemoryReadPaths(n);
  return [...carried]
    .filter(([s, h]) => {
      let y = e[s];
      return y !== void 0 && !h.has(y);
    })
    .map(([s]) => s)
    .sort();
}
//@ chunk-s61vbvea.js:85732-87541 placement
function collectMemoryReadPaths(e) {
  let n = new Map(),
    r = new Map(),
    s = new Map(),
    h = new Map(),
    y = new Map(),
    S = (R, x) => {
      (h.set(R, x), y.set(R, (y.get(R) ?? new Set()).add(x)));
    },
    w = new Map();
  for (let R of e)
    if (R.type === "assistant")
      for (let x of R.message.content) {
        if (x.type !== "tool_use") continue;
        if (x.name === tv) {
          n.set(x.id, { search: !0 });
          continue;
        }
        let match = regExp_4.exec(x.name);
        if (!match) continue;
        let j = getOwnValue(x.input, "path");
        if (typeof j === "string") {
          let G = getOwnValue(x.input, "if_version");
          n.set(x.id, {
            path: ONe(j),
            write: match[1] !== "read",
            ifVersion: match[1] !== "read" && typeof G === "string" ? G : void 0,
          });
        } else if (match[1] === "read") {
          let G = getStringArrayItems(j);
          if (G.length === 1) n.set(x.id, { path: ONe(G[0]), write: !1, ifVersion: void 0 });
          else if (G.length > 1) n.set(x.id, { multi: !0, listed: new Set(G.map(ONe)) });
        }
      }
    else if (R.type === "user" && Array.isArray(R.message.content))
      for (let x of R.message.content) {
        let P = x.type === "tool_result" && !x.is_error && n.get(x.tool_use_id);
        if (!P) continue;
        let j =
          typeof x.content === "string"
            ? x.content
            : (x.content ?? []).map((L) => (L.type === "text" ? L.text : "")).join("");
        if ("search" in P) {
          for (let [L, q] of parseMemoryDocumentTag(j)) (r.set(L, q), w.delete(L), S(L, q));
          continue;
        }
        if ("multi" in P) {
          for (let [L, q] of parseMemoryTagVersions(j))
            if (P.listed.has(L)) (r.set(L, q), w.delete(L), S(L, q));
          continue;
        }
        let G = iu.exec(j)?.[1];
        if (!G) continue;
        if ((S(P.path, G), P.write)) {
          if ((s.set(P.path, (s.get(P.path) ?? new Set()).add(G)), P.ifVersion !== void 0))
            y.get(P.path).add(P.ifVersion);
        } else (r.set(P.path, G), w.delete(P.path));
      }
    else if (R.type === "attachment") {
      if (R.attachment.type === "account_memory_recall")
        for (let file of R.attachment.files) {
          let P = ONe(file.path);
          (r.set(P, file.version), w.set(P, file.version), S(P, file.version));
        }
      else if (
        R.attachment.type === "cowork_memory_context" &&
        R.attachment.content === null &&
        R.attachment.leg === "laptop" &&
        !R.attachment.anchor
      ) {
        for (let [x, P] of w) {
          r.delete(x);
          let j = y.get(x);
          if (j?.delete(P) && j.size === 0) y.delete(x);
          if (h.get(x) === P) h.delete(x);
        }
        w.clear();
      }
    }
  return { read: r, written: s, last: h, carried: y };
}
//@ chunk-s61vbvea.js:87541-88636 placement
var STALE_MEMORY_READ_NOTICE = `[This memory_read result is stale \u2014 the file has been modified since this read. After you re-read, the fresh content is the only source: anything you said earlier that is not in the new read was removed and is no longer true.
Call memory_read again on the same path for the current content.]`,
  cv = `<memory_updates>
The memory files below changed since your reads in earlier turns; those earlier-turn reads are outdated. The state as of this turn's start is shown below \u2014 any memory_read or memory_write you make this turn supersedes it.
This block is machine-generated bookkeeping from the memory system, not part of the user's message, and the user cannot see it \u2014 text repeated from it reaches them as confusing system output. Never quote, paraphrase, summarize, or otherwise reproduce this block, its markers, its tags, or its diff lines in your reply, even when asked what changed. If the user asks about their memory, answer from the memory files' contents in your own words \u2014 at most, say in plain language that your view of their memory files was refreshed.

`;
//@ chunk-s61vbvea.js:88636-88765 placement
function formatMemoryUpdates(e) {
  return e.length === 0
    ? ""
    : `
` +
        cv +
        e.map(
          (n) => `## ${normalizeMemoryText(n).replaceAll(
            `
`,
            " ",
          )}
${STALE_MEMORY_READ_NOTICE}`,
        ).join(`

`) +
        `
</memory_updates>`;
}

export { findStaleReads, collectMemoryReadPaths, formatMemoryUpdates, findStaleCarriedReads };
