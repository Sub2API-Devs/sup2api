/**
 * plugins/bundled/mermaid/sequenceDiagram.ts
 *
 * 2.1.316 新增：mermaid 时序图解析与绘制
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yb0ajcmt.js (15)
 * attribution: placement 15
 */
import {
  oe,
  A,
  linkCells,
  linkPath,
  ne,
  parseLabelLines,
  identifierWidth,
} from "../../../ink/graphemeCells.js";
import { createBoxCanvas, drawCanvasBox, drawCanvasText } from "./boxCanvas.js";
import { gridToLines } from "./flowchartLayout.js";
import { he } from "./flowchartRender.js";

/**
 * 在字符画布上绘制 mermaid 时序图（参与者、消息箭头、note、frame）。
 */
//@ chunk-yb0ajcmt.js:21060-21687 placement
function drawSequenceDiagram(e, t) {
  let n = measureSequenceDiagram(e),
    o = Math.max(...e.participants.map((participant) => participant.length)) + 2,
    i = o + 1 + e.steps.reduce((a, h) => a + stepHeight(h), 0);
  if (n.width > t || n.width * i > oe) return;
  let u = createBoxCanvas(n.width, i),
    r = new Set(),
    s = o + 1,
    mapped = e.steps.map((step) => {
      let h = s;
      if (((s += stepHeight(step)), step.kind === "note")) {
        let c = noteBox(step, n, h);
        for (let p = c.y; p < c.y + c.height; p++)
          for (let y = c.x; y < c.x + c.width; y++) r.add(p * n.width + y);
      }
      return h;
    });
  return (
    e.participants.forEach((participant, h) => {
      let c = n.centers[h] ?? 0,
        p = A(ue(participant)) + 4;
      (drawCanvasBox(u, { x: c - Math.floor(p / 2), y: 0, width: p, height: o }, participant, !1),
        linkCells(u, { x: c, y: o - 1 }, { x: c, y: o }));
      for (let y = o; y < i; y++) if (!r.has(y * n.width + c)) drawCanvasText(u, { x: c, y }, "\u2502");
    }),
    e.steps.forEach((step, h) => {
      drawSequenceStep(u, step, n, mapped[h] ?? 0);
    }),
    gridToLines(u)
  );
}
//@ chunk-yb0ajcmt.js:21687-22457 placement
function drawSequenceStep(e, t, n, o) {
  switch (t.kind) {
    case "frame": {
      let i = `\u2500\u2500 ${t.label} `;
      drawCanvasText(e, { x: 0, y: o }, i + "\u2500".repeat(Math.max(0, n.width - A(i))));
      return;
    }
    case "note": {
      drawCanvasBox(e, noteBox(t, n, o), t.text, !1);
      return;
    }
    case "message": {
      let i = n.centers[t.from] ?? 0,
        u = n.centers[t.to] ?? 0,
        r = o + t.text.length,
        s = t.line === "dotted" ? "\u2504" : "\u2500";
      if (t.from === t.to) {
        t.text.forEach((p, y) => {
          drawCanvasText(e, { x: i + 2, y: o + y }, p);
        });
        let c = [];
        for (let p = i; p <= i + he; p++) c.push({ x: p, y: r });
        for (let p = i + he; p > i; p--) c.push({ x: p, y: r + 1 });
        (linkPath(e, c, t.line),
          drawCanvasText(e, { x: i, y: r }, "\u251C"),
          drawCanvasText(e, { x: i + 1, y: r + 1 }, arrowHead(t.head, !1, s)));
        return;
      }
      let min = Math.min(i, u),
        a = Math.abs(u - i) - 1;
      t.text.forEach((c, p) => {
        drawCanvasText(e, { x: min + 1 + Math.floor((a - A(c)) / 2), y: o + p }, c);
      });
      let h = u > i;
      (drawCanvasText(e, { x: i, y: r }, h ? "\u251C" : "\u2524"),
        drawCanvasText(e, { x: min + 1, y: r }, s.repeat(a)),
        drawCanvasText(e, { x: h ? u - 1 : u + 1, y: r }, arrowHead(t.head, h, s)));
    }
  }
}
/**
 * 时序图箭头头部字符。
 */
//@ chunk-yb0ajcmt.js:22457-22597 placement
function arrowHead(e, t, n) {
  switch (e) {
    case "arrow":
      return t ? "\u25B6" : "\u25C0";
    case "async":
      return t ? ">" : "<";
    case "cross":
      return "x";
    case "open":
      return n;
  }
}
/**
 * 时序图一步占用的行数。
 */
//@ chunk-yb0ajcmt.js:22597-22738 placement
function stepHeight(e) {
  switch (e.kind) {
    case "frame":
      return 2;
    case "note":
      return e.text.length + 3;
    case "message":
      return e.text.length + (e.from === e.to ? 3 : 2);
  }
}
//@ chunk-yb0ajcmt.js:22738-22794 placement
function ue(e) {
  return e.reduce((t, n) => (A(n) > A(t) ? n : t), "");
}
/**
 * 注释框的位置与大小。
 */
//@ chunk-yb0ajcmt.js:22794-23077 placement
function noteBox(e, t, n) {
  let o = t.centers[e.first] ?? 0,
    i = t.centers[e.last] ?? 0,
    u = A(ue(e.text)) + 4,
    r = e.placement === "over" && e.first !== e.last ? Math.max(u, i - o + 5) : u;
  return {
    x:
      e.placement === "left"
        ? o - 1 - r
        : e.placement === "right"
          ? o + 2
          : Math.floor((o + i) / 2) - Math.floor(r / 2),
    y: n,
    width: r,
    height: e.text.length + 2,
  };
}
//@ chunk-yb0ajcmt.js:23077-24088 placement
function measureSequenceDiagram(e) {
  let mapped = e.participants.map((participant) => A(ue(participant)) + 4),
    n = {
      gaps: mapped.slice(1).map((l, a) => Math.ceil((mapped[a] ?? 0) / 2) + Math.ceil(l / 2) + 2),
      leftRoom: Math.floor((mapped[0] ?? 0) / 2),
      rightRoom: Math.ceil((mapped.at(-1) ?? 0) / 2),
    },
    o = 0;
  for (let step of e.steps) {
    let a = step.kind === "frame" ? 0 : A(ue(step.text));
    if (step.kind === "frame") o = Math.max(o, A(step.label) + 6);
    else if (step.kind === "message" && step.from === step.to)
      reserveGap(n, step.from, Math.max(a + 2, he + 1));
    else if (step.kind === "message")
      widenGapsForSpan(n, Math.min(step.from, step.to), Math.max(step.from, step.to), a + 4);
    else if (step.placement === "left") reserveGap(n, step.first - 1, a + 5);
    else if (step.placement === "right") reserveGap(n, step.first, a + 6);
    else if (step.first === step.last)
      (reserveGap(n, step.first - 1, Math.ceil((a + 4) / 2) + 1),
        reserveGap(n, step.first, Math.ceil((a + 4) / 2) + 1));
    else
      (widenGapsForSpan(n, step.first, step.last, a),
        reserveGap(n, step.first - 1, 2),
        reserveGap(n, step.last, 2));
  }
  let i = [n.leftRoom];
  for (let gap of n.gaps) i.push((i.at(-1) ?? 0) + gap);
  let max = Math.max(o, (i.at(-1) ?? 0) + n.rightRoom + 1),
    flattened = e.steps.flatMap((step) =>
      step.kind === "note" ? [noteBox(step, { centers: i, width: max }, 0)] : [],
    ),
    max_2 = Math.max(0, ...flattened.map((l) => -l.x));
  return {
    centers: i.map((l) => l + max_2),
    width: Math.max(max + max_2, ...flattened.map((l) => l.x + max_2 + l.width)),
  };
}
/**
 * 为参与者间隙或两侧预留宽度。
 */
//@ chunk-yb0ajcmt.js:24088-24250 placement
function reserveGap(e, t, n) {
  if (t < 0) e.leftRoom = Math.max(e.leftRoom, n);
  else if (t >= e.gaps.length) e.rightRoom = Math.max(e.rightRoom, n);
  else e.gaps[t] = Math.max(e.gaps[t] ?? 0, n + 1);
}
/**
 * 跨多个参与者的内容不够宽时加宽最后一个间隙。
 */
//@ chunk-yb0ajcmt.js:24250-24361 placement
function widenGapsForSpan(e, t, n, o) {
  let reduced = e.gaps.slice(t, n).reduce((u, r) => u + r, 0);
  e.gaps[n - 1] = (e.gaps[n - 1] ?? 0) + Math.max(0, o - reduced);
}
//@ chunk-yb0ajcmt.js:24361-24814 placement
var SEQUENCE_ARROW_KINDS = [
    ["-->>", "dotted", "arrow"],
    ["->>", "solid", "arrow"],
    ["--x", "dotted", "cross"],
    ["--)", "dotted", "async"],
    ["-->", "dotted", "open"],
    ["-x", "solid", "cross"],
    ["-)", "solid", "async"],
    ["->", "solid", "open"],
  ],
  Dt = /^(?:participant|actor)\s+(\S.*)$/,
  He = " as ",
  Rt = /^note\s+(over|left of|right of)\s+(\S[^:]*):(.*)$/i,
  Ot = /^(?:activate|deactivate)\s+(\S.*)$/,
  We = /^(?:loop|alt|opt|par|critical|break)(?:\s|$)/,
  _t = /^(?:else|and|option)(?:\s|$)/,
  Lt = /[<>:]/,
  Nt = 50,
  It = 400;
/**
 * 解析 mermaid sequenceDiagram 源码为参与者与步骤列表，超出规模限制返回 undefined。
 */
//@ chunk-yb0ajcmt.js:24814-25243 placement
function parseSequenceDiagram(e) {
  let t = { participants: [], steps: [], ids: [], depth: 0, isNumbered: !1, hiddenCells: 0 };
  for (let i of e.slice(1)) {
    let u = parseSequenceLine(t, i),
      r = t.ids.length <= Nt && t.steps.length <= It && t.hiddenCells <= ne;
    if (!u || !r) return;
  }
  if (t.depth !== 0 || t.ids.length === 0) return;
  let n = 0,
    mapped = t.steps.map((step) => {
      if (step.kind !== "message" || !t.isNumbered) return step;
      n++;
      let [u = "", ...r] = step.text;
      return { ...step, text: [`${n}. ${u}`, ...r] };
    });
  return { participants: t.participants, steps: mapped };
}
//@ chunk-yb0ajcmt.js:25243-26080 placement
function parseSequenceLine(e, t) {
  if (t === "autonumber") return ((e.isNumbered = !0), !0);
  if (t === "end") return (e.depth--, e.steps.push({ kind: "frame", label: "end" }), e.depth >= 0);
  if (We.test(t) || _t.test(t))
    return (
      (e.depth += We.test(t) ? 1 : 0),
      e.steps.push({ kind: "frame", label: parseLabelLines(t).join(" ") }),
      e.depth > 0
    );
  let n = Dt.exec(t)?.[1];
  if (n !== void 0) {
    let index = n.indexOf(He),
      r = index < 0 ? n : n.slice(0, index),
      s = parseLabelLines(index < 0 ? n : n.slice(index + He.length)),
      l = !e.ids.includes(r.trim());
    return ((e.hiddenCells += identifierWidth(r.trim(), s)), l && participantIndex(e, r, s) >= 0);
  }
  let o = Ot.exec(t)?.[1];
  if (o !== void 0) return e.ids.includes(o.trim());
  let match = Rt.exec(t);
  if (match) {
    let [, u = "", r = "", s = ""] = match,
      mapped = r.split(",").map((h) => participantIndex(e, h)),
      a = u.toLowerCase() === "over";
    if (mapped.includes(-1) || mapped.length > (a ? 2 : 1)) return !1;
    return (
      e.steps.push({
        kind: "note",
        placement: a ? "over" : u.toLowerCase() === "left of" ? "left" : "right",
        first: Math.min(...mapped),
        last: Math.max(...mapped),
        text: parseLabelLines(s),
      }),
      !0
    );
  }
  return parseSequenceMessage(e, t);
}
//@ chunk-yb0ajcmt.js:26080-26488 placement
function parseSequenceMessage(e, t) {
  let index = t.indexOf(":"),
    o = index < 0 ? "" : t.slice(0, index),
    i = -1,
    u;
  for (let index = o.indexOf("-"); index >= 0 && !u;)
    ((u = SEQUENCE_ARROW_KINDS.find(([y]) => o.startsWith(y, index))),
      (i = index),
      (index = o.indexOf("-", index + 1)));
  if (!u) return !1;
  let [r, s, l] = u,
    trimmed = o.slice(i + r.length).trim(),
    h = participantIndex(e, o.slice(0, i)),
    c = participantIndex(e, trimmed.startsWith("+") || trimmed.startsWith("-") ? trimmed.slice(1) : trimmed);
  if (h < 0 || c < 0) return !1;
  return (
    e.steps.push({
      kind: "message",
      from: h,
      to: c,
      text: parseLabelLines(t.slice(index + 1)),
      line: s,
      head: l,
    }),
    !0
  );
}
/**
 * 取或登记参与者，返回下标（非法名返回 -1）。
 */
//@ chunk-yb0ajcmt.js:26488-26658 placement
function participantIndex(e, t, n) {
  let trimmed = t.trim();
  if (trimmed === "" || Lt.test(trimmed)) return -1;
  let index = e.ids.indexOf(trimmed);
  if (index >= 0) return index;
  return (e.ids.push(trimmed), e.participants.push(n ?? parseLabelLines(trimmed)), e.ids.length - 1);
}
//@ chunk-yb0ajcmt.js:26658-27065 placement
function splitMermaidStatements(e) {
  let t = [];
  for (let n of e.split(`
`)) {
    let trimmed = n.trim();
    if (trimmed.startsWith("%%")) {
      if (trimmed !== "%%") return;
      continue;
    }
    let i = 0,
      u = !1,
      r = 0;
    for (let s = 0; s < trimmed.length; s++) {
      let l = trimmed[s];
      if (l === '"') u = !u;
      else if (!u && (l === "[" || l === "(" || l === "{")) i++;
      else if (!u && (l === "]" || l === ")" || l === "}")) i = Math.max(0, i - 1);
      else if (!u && i === 0 && l === ";") (t.push(trimmed.slice(r, s).trim()), (r = s + 1));
    }
    t.push(trimmed.slice(r).trim());
  }
  return t.filter((n) => n !== "");
}

export { splitMermaidStatements, parseSequenceDiagram, drawSequenceDiagram };
