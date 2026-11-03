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
  MAX_CANVAS_CELLS,
  textDisplayWidth,
  linkCells,
  linkPath,
  MAX_CELL_WIDTH,
  parseLabelLines,
  identifierWidth,
} from "../../../ink/graphemeCells.js";
import { createBoxCanvas, drawCanvasBox, drawCanvasText } from "./boxCanvas.js";
import { gridToLines } from "./flowchartLayout.js";
import { EDGE_LABEL_OFFSET } from "./flowchartRender.js";

//@ chunk-yb0ajcmt.js:21060-21687 placement
/**
 * 在字符画布上绘制 mermaid 时序图（参与者、消息箭头、note、frame）。
 */
function drawSequenceDiagram(e, t) {
  let n = measureSequenceDiagram(e);
  let o = Math.max(...e.participants.map((participant) => participant.length)) + 2;
  let stylePool = o + 1 + e.steps.reduce((acc, step) => acc + stepHeight(step), 0);
  if (n.width > t || n.width * stylePool > MAX_CANVAS_CELLS) return;
  let boxCanvas = createBoxCanvas(n.width, stylePool);
  let r = new Set();
  let s = o + 1;
  let mapped = e.steps.map((step) => {
    let h = s;
    s += stepHeight(step);
    if (step.kind === "note") {
      let c = noteBox(step, n, h);
      for (let p = c.y; p < c.y + c.height; p++)
        for (let y = c.x; y < c.x + c.width; y++) r.add(p * n.width + y);
    }
    return h;
  });
  e.participants.forEach((participant, h) => {
    let c = n.centers[h] ?? 0;
    let p = textDisplayWidth(widest(participant)) + 4;
    drawCanvasBox(
      boxCanvas,
      {
        x: c - Math.floor(p / 2),
        y: 0,
        width: p,
        height: o,
      },
      participant,
      false,
    );
    linkCells(
      boxCanvas,
      {
        x: c,
        y: o - 1,
      },
      {
        x: c,
        y: o,
      },
    );
    for (let y = o; y < stylePool; y++)
      if (!r.has(y * n.width + c))
        drawCanvasText(
          boxCanvas,
          {
            x: c,
            y,
          },
          "\u2502",
        );
  });
  e.steps.forEach((step, h) => {
    drawSequenceStep(boxCanvas, step, n, mapped[h] ?? 0);
  });
  return gridToLines(boxCanvas);
}
//@ chunk-yb0ajcmt.js:21687-22457 placement
function drawSequenceStep(boxCanvas, step, n, o) {
  switch (step.kind) {
    case "frame": {
      let i = `\u2500\u2500 ${step.label} `;
      drawCanvasText(
        boxCanvas,
        {
          x: 0,
          y: o,
        },
        i + "\u2500".repeat(Math.max(0, n.width - textDisplayWidth(i))),
      );
      return;
    }
    case "note": {
      drawCanvasBox(boxCanvas, noteBox(step, n, o), step.text, false);
      return;
    }
    case "message": {
      let i = n.centers[step.from] ?? 0;
      let u = n.centers[step.to] ?? 0;
      let r = o + step.text.length;
      let s = step.line === "dotted" ? "\u2504" : "\u2500";
      if (step.from === step.to) {
        step.text.forEach((p, y) => {
          drawCanvasText(
            boxCanvas,
            {
              x: i + 2,
              y: o + y,
            },
            p,
          );
        });
        let c = [];
        for (let p = i; p <= i + EDGE_LABEL_OFFSET; p++)
          c.push({
            x: p,
            y: r,
          });
        for (let k = i + EDGE_LABEL_OFFSET; k > i; k--)
          c.push({
            x: k,
            y: r + 1,
          });
        linkPath(boxCanvas, c, step.line);
        drawCanvasText(
          boxCanvas,
          {
            x: i,
            y: r,
          },
          "\u251C",
        );
        drawCanvasText(
          boxCanvas,
          {
            x: i + 1,
            y: r + 1,
          },
          arrowHead(step.head, false, s),
        );
        return;
      }
      let min = Math.min(i, u);
      let a = Math.abs(u - i) - 1;
      step.text.forEach((c, p) => {
        drawCanvasText(
          boxCanvas,
          {
            x: min + 1 + Math.floor((a - textDisplayWidth(c)) / 2),
            y: o + p,
          },
          c,
        );
      });
      let h = u > i;
      drawCanvasText(
        boxCanvas,
        {
          x: i,
          y: r,
        },
        h ? "\u251C" : "\u2524",
      );
      drawCanvasText(
        boxCanvas,
        {
          x: min + 1,
          y: r,
        },
        s.repeat(a),
      );
      drawCanvasText(
        boxCanvas,
        {
          x: h ? u - 1 : u + 1,
          y: r,
        },
        arrowHead(step.head, h, s),
      );
    }
  }
}
//@ chunk-yb0ajcmt.js:22457-22597 placement
/**
 * 时序图箭头头部字符。
 */
function arrowHead(head, t, n) {
  switch (head) {
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
//@ chunk-yb0ajcmt.js:22597-22738 placement
/**
 * 时序图一步占用的行数。
 */
function stepHeight(step) {
  switch (step.kind) {
    case "frame":
      return 2;
    case "note":
      return step.text.length + 3;
    case "message":
      return step.text.length + (step.from === step.to ? 3 : 2);
  }
}
//@ chunk-yb0ajcmt.js:22738-22794 placement
/**
 * 最宽的字符串
 */
function widest(e) {
  return e.reduce((acc, n) => (textDisplayWidth(n) > textDisplayWidth(acc) ? n : acc), "");
}
//@ chunk-yb0ajcmt.js:22794-23077 placement
/**
 * 注释框的位置与大小。
 */
function noteBox(step, t, n) {
  let o = t.centers[step.first] ?? 0;
  let i = t.centers[step.last] ?? 0;
  let u = textDisplayWidth(widest(step.text)) + 4;
  let r = step.placement === "over" && step.first !== step.last ? Math.max(u, i - o + 5) : u;
  return {
    x:
      step.placement === "left"
        ? o - 1 - r
        : step.placement === "right"
          ? o + 2
          : Math.floor((o + i) / 2) - Math.floor(r / 2),
    y: n,
    width: r,
    height: step.text.length + 2,
  };
}
//@ chunk-yb0ajcmt.js:23077-24088 placement
function measureSequenceDiagram(e) {
  let mapped = e.participants.map((participant) => textDisplayWidth(widest(participant)) + 4);
  let n = {
    gaps: mapped.slice(1).map((l, a) => Math.ceil((mapped[a] ?? 0) / 2) + Math.ceil(l / 2) + 2),
    leftRoom: Math.floor((mapped[0] ?? 0) / 2),
    rightRoom: Math.ceil((mapped.at(-1) ?? 0) / 2),
  };
  let o = 0;
  for (let step of e.steps) {
    let a = step.kind === "frame" ? 0 : textDisplayWidth(widest(step.text));
    if (step.kind === "frame") o = Math.max(o, textDisplayWidth(step.label) + 6);
    else if (step.kind === "message" && step.from === step.to)
      reserveGap(n, step.from, Math.max(a + 2, EDGE_LABEL_OFFSET + 1));
    else if (step.kind === "message")
      widenGapsForSpan(n, Math.min(step.from, step.to), Math.max(step.from, step.to), a + 4);
    else if (step.placement === "left") reserveGap(n, step.first - 1, a + 5);
    else if (step.placement === "right") reserveGap(n, step.first, a + 6);
    else if (step.first === step.last) {
      reserveGap(n, step.first - 1, Math.ceil((a + 4) / 2) + 1);
      reserveGap(n, step.first, Math.ceil((a + 4) / 2) + 1);
    } else {
      widenGapsForSpan(n, step.first, step.last, a);
      reserveGap(n, step.first - 1, 2);
      reserveGap(n, step.last, 2);
    }
  }
  let i = [n.leftRoom];
  for (let gap of n.gaps) i.push((i.at(-1) ?? 0) + gap);
  let max = Math.max(o, (i.at(-1) ?? 0) + n.rightRoom + 1);
  let flattened = e.steps.flatMap((step) =>
    step.kind === "note"
      ? [
          noteBox(
            step,
            {
              centers: i,
              width: max,
            },
            0,
          ),
        ]
      : [],
  );
  let max_2 = Math.max(0, ...flattened.map((l) => -l.x));
  return {
    centers: i.map((l) => l + max_2),
    width: Math.max(max + max_2, ...flattened.map((l) => l.x + max_2 + l.width)),
  };
}
//@ chunk-yb0ajcmt.js:24088-24250 placement
/**
 * 为参与者间隙或两侧预留宽度。
 */
function reserveGap(e, t, n) {
  if (t < 0) e.leftRoom = Math.max(e.leftRoom, n);
  else if (t >= e.gaps.length) e.rightRoom = Math.max(e.rightRoom, n);
  else e.gaps[t] = Math.max(e.gaps[t] ?? 0, n + 1);
}
//@ chunk-yb0ajcmt.js:24250-24361 placement
/**
 * 跨多个参与者的内容不够宽时加宽最后一个间隙。
 */
function widenGapsForSpan(e, t, n, o) {
  let reduced = e.gaps.slice(t, n).reduce((acc, gap) => acc + gap, 0);
  e.gaps[n - 1] = (e.gaps[n - 1] ?? 0) + Math.max(0, o - reduced);
}
//@ chunk-yb0ajcmt.js:24361-24814 placement
/**
 * mermaid 时序图的消息箭头写法表（-->>、->>、--x、--)、-->、-x、-) ），每项给出线型（dotted/solid）与箭头形状（arrow/cross/async/open）；同组还有参与方、注记、分组等行正则。
 */
var SEQUENCE_ARROW_KINDS = [
  ["-->>", "dotted", "arrow"],
  ["->>", "solid", "arrow"],
  ["--x", "dotted", "cross"],
  ["--)", "dotted", "async"],
  ["-->", "dotted", "open"],
  ["-x", "solid", "cross"],
  ["-)", "solid", "async"],
  ["->", "solid", "open"],
];
var SEQUENCE_ARROW_MAP = /^(?:participant|actor)\s+(\S.*)$/;
var SEQUENCE_PARTICIPANT_KEYWORD = " as ";
var SEQUENCE_NOTE_RE = /^note\s+(over|left of|right of)\s+(\S[^:]*):(.*)$/i;
var SEQUENCE_BLOCK_RE = /^(?:activate|deactivate)\s+(\S.*)$/;
var SEQUENCE_MESSAGE_RE = /^(?:loop|alt|opt|par|critical|break)(?:\s|$)/;
var SEQUENCE_ACTIVATION_RE = /^(?:else|and|option)(?:\s|$)/;
var SEQUENCE_DIRECTION_RE = /[<>:]/;
var SEQUENCE_TITLE_RE = 50;
var SEQUENCE_AUTONUMBER_RE = 400;
//@ chunk-yb0ajcmt.js:24814-25243 placement
/**
 * 解析 mermaid sequenceDiagram 源码为参与者与步骤列表，超出规模限制返回 undefined。
 */
function parseSequenceDiagram(e) {
  let t = {
    participants: [],
    steps: [],
    ids: [],
    depth: 0,
    isNumbered: false,
    hiddenCells: 0,
  };
  for (let i of e.slice(1)) {
    let sequenceLine = parseSequenceLine(t, i);
    let r =
      t.ids.length <= SEQUENCE_TITLE_RE &&
      t.steps.length <= SEQUENCE_AUTONUMBER_RE &&
      t.hiddenCells <= MAX_CELL_WIDTH;
    if (!sequenceLine || !r) return;
  }
  if (t.depth !== 0 || t.ids.length === 0) return;
  let n = 0;
  let steps = t.steps.map((step) => {
    if (step.kind !== "message" || !t.isNumbered) return step;
    n++;
    let [u = "", ...r] = step.text;
    return {
      ...step,
      text: [`${n}. ${u}`, ...r],
    };
  });
  return {
    participants: t.participants,
    steps,
  };
}
//@ chunk-yb0ajcmt.js:25243-26080 placement
function parseSequenceLine(e, t) {
  if (t === "autonumber") {
    e.isNumbered = true;
    return true;
  }
  if (t === "end") {
    e.depth--;
    e.steps.push({
      kind: "frame",
      label: "end",
    });
    return e.depth >= 0;
  }
  if (SEQUENCE_MESSAGE_RE.test(t) || SEQUENCE_ACTIVATION_RE.test(t)) {
    e.depth += SEQUENCE_MESSAGE_RE.test(t) ? 1 : 0;
    e.steps.push({
      kind: "frame",
      label: parseLabelLines(t).join(" "),
    });
    return e.depth > 0;
  }
  let n = SEQUENCE_ARROW_MAP.exec(t)?.[1];
  if (n !== undefined) {
    let index = n.indexOf(SEQUENCE_PARTICIPANT_KEYWORD);
    let r = index < 0 ? n : n.slice(0, index);
    let labelLines = parseLabelLines(index < 0 ? n : n.slice(index + SEQUENCE_PARTICIPANT_KEYWORD.length));
    let l = !e.ids.includes(r.trim());
    e.hiddenCells += identifierWidth(r.trim(), labelLines);
    return l && participantIndex(e, r, labelLines) >= 0;
  }
  let o = SEQUENCE_BLOCK_RE.exec(t)?.[1];
  if (o !== undefined) return e.ids.includes(o.trim());
  let match = SEQUENCE_NOTE_RE.exec(t);
  if (match) {
    let [, u = "", r = "", s = ""] = match;
    let mapped = r.split(",").map((h) => participantIndex(e, h));
    let a = u.toLowerCase() === "over";
    if (mapped.includes(-1) || mapped.length > (a ? 2 : 1)) return false;
    e.steps.push({
      kind: "note",
      placement: a ? "over" : u.toLowerCase() === "left of" ? "left" : "right",
      first: Math.min(...mapped),
      last: Math.max(...mapped),
      text: parseLabelLines(s),
    });
    return true;
  }
  return parseSequenceMessage(e, t);
}
//@ chunk-yb0ajcmt.js:26080-26488 placement
function parseSequenceMessage(e, t) {
  let index = t.indexOf(":");
  let o = index < 0 ? "" : t.slice(0, index);
  let i = -1;
  let u;
  for (let index = o.indexOf("-"); index >= 0 && !u;) {
    u = SEQUENCE_ARROW_KINDS.find(([y]) => o.startsWith(y, index));
    i = index;
    index = o.indexOf("-", index + 1);
  }
  if (!u) return false;
  let [r, s, l] = u;
  let trimmed = o.slice(i + r.length).trim();
  let h = participantIndex(e, o.slice(0, i));
  let c = participantIndex(
    e,
    trimmed.startsWith("+") || trimmed.startsWith("-") ? trimmed.slice(1) : trimmed,
  );
  if (h < 0 || c < 0) return false;
  e.steps.push({
    kind: "message",
    from: h,
    to: c,
    text: parseLabelLines(t.slice(index + 1)),
    line: s,
    head: l,
  });
  return true;
}
//@ chunk-yb0ajcmt.js:26488-26658 placement
/**
 * 取或登记参与者，返回下标（非法名返回 -1）。
 */
function participantIndex(e, t, labelLines) {
  let trimmed = t.trim();
  if (trimmed === "" || SEQUENCE_DIRECTION_RE.test(trimmed)) return -1;
  let index = e.ids.indexOf(trimmed);
  if (index >= 0) return index;
  e.ids.push(trimmed);
  e.participants.push(labelLines ?? parseLabelLines(trimmed));
  return e.ids.length - 1;
}
//@ chunk-yb0ajcmt.js:26658-27065 placement
function splitMermaidStatements(e) {
  let t = [];
  for (let line of e.split(`
`)) {
    let trimmed = line.trim();
    if (trimmed.startsWith("%%")) {
      if (trimmed !== "%%") return;
      continue;
    }
    let i = 0;
    let u = false;
    let r = 0;
    for (let k = 0; k < trimmed.length; k++) {
      let l = trimmed[k];
      if (l === '"') u = !u;
      else if (!u && (l === "[" || l === "(" || l === "{")) i++;
      else if (!u && (l === "]" || l === ")" || l === "}")) i = Math.max(0, i - 1);
      else if (!u && i === 0 && l === ";") {
        t.push(trimmed.slice(r, k).trim());
        r = k + 1;
      }
    }
    t.push(trimmed.slice(r).trim());
  }
  return t.filter((n) => n !== "");
}
export { splitMermaidStatements, parseSequenceDiagram, drawSequenceDiagram };
