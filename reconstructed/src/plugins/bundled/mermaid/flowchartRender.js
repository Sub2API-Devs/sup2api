/**
 * plugins/bundled/mermaid/flowchartRender.ts
 *
 * 2.1.316 新增：mermaid 流程图解析与字符画绘制
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yb0ajcmt.js (14)
 * attribution: placement 14
 */
import { MAX_NODE_HEIGHT, layoutFlowchart, gridToLines } from "./flowchartLayout.js";
import {
  textDisplayWidth,
  MAX_CANVAS_CELLS,
  linkPath,
  unlinkCell,
  identifierWidth,
  MAX_CELL_WIDTH,
  parseLabelLines,
  WORD_CHAR_RE,
} from "../../../ink/graphemeCells.js";
import { createBoxCanvas, drawCanvasBox, drawCanvasText } from "./boxCanvas.js";

//@ chunk-yb0ajcmt.js:14774-15376 placement
function labelEdgeBundles(e, t) {
  let filtered = e.filter((s) => t[s.from]?.center !== t[s.to]?.center);
  let o = new Map();
  for (let s of filtered) o.set(s.from, (o.get(s.from) ?? 0) + 1);
  let i = new Map();
  for (let s of filtered) {
    let l = o.get(s.from) === 1 ? `to ${s.to}` : `from ${s.from}`;
    i.set(l, [...(i.get(l) ?? []), s]);
  }
  if (i.size > MAX_NODE_HEIGHT) return;
  let sorted = [...i.values()].sort(
    (s, l) => (t[s[0]?.from ?? 0]?.center ?? 0) - (t[l[0]?.from ?? 0]?.center ?? 0),
  );
  let r = 0;
  while (sorted.length > 0) {
    let index = sorted.findIndex((l) =>
      sorted.every(
        (a) =>
          a === l ||
          !a.some((h) =>
            l.some(
              (c) => t[h.from]?.center === t[c.to]?.center && h.kind !== "loopIn" && c.kind !== "loopOut",
            ),
          ),
      ),
    );
    if (index < 0) return;
    for (let l of sorted.splice(index, 1)[0] ?? []) l.track = r;
    r++;
  }
  return r;
}
//@ chunk-yb0ajcmt.js:15376-15788 placement
/**
 * 宽度不够画框图时，把流程图退化为"subgraph: 成员"的文字列表。
 */
function renderFlowchartAsList(e, t) {
  let n = new Map(e.nodes.map((node) => [node.id, node.label]));
  let mapped = e.groups.map(
    (group) =>
      `subgraph ${group.title}: ` +
      group.members.map((member) => (n.get(member) ?? [member]).join(" ")).join(", "),
  );
  if (mapped.some((i) => textDisplayWidth(i) > t)) return;
  for (let i of [false, true]) {
    let u = layoutFlowchart(e, i, t);
    if (!u) return;
    if (u === "too wide") continue;
    let r = u.isVertical ? u.orderExtent : u.rankExtent;
    let s = u.isVertical ? u.rankExtent : u.orderExtent;
    if (r <= t && r * s <= MAX_CANVAS_CELLS) return [...drawFlowchart(u, r, s), ...mapped];
  }
  return;
}
//@ chunk-yb0ajcmt.js:15788-17387 placement
/**
 * 在字符画布上绘制流程图的节点框、交叉、连线与回环。
 */
function drawFlowchart(e, chars, stylePool) {
  let boxCanvas = createBoxCanvas(chars, stylePool);
  for (let node of e.nodes) {
    let s = node.center - Math.floor(node.breadth / 2);
    let l = _(e, node.start, s);
    let a = _(e, node.start + node.depth - 1, s + node.breadth - 1);
    if (node.kind === "crossing")
      linkPath(
        boxCanvas,
        Array.from(
          {
            length: node.depth,
          },
          (h, c) => _(e, node.start + c, node.center),
        ),
        node.line,
      );
    else if (node.kind === "box")
      drawCanvasBox(
        boxCanvas,
        {
          x: Math.min(l.x, a.x),
          y: Math.min(l.y, a.y),
          width: Math.abs(a.x - l.x) + 1,
          height: Math.abs(a.y - l.y) + 1,
        },
        node.label,
        node.isRounded,
      );
  }
  let i = [];
  let u = new Map();
  for (let segment of e.segments) {
    let s = e.nodes[segment.from];
    let l = e.nodes[segment.to];
    let a = e.gaps.get(segment.gap);
    if (!s || !l || !a) continue;
    let h = s.start + s.depth - 1;
    let c = segment.hasHead ? l.start - 1 : l.start;
    let p = segment.track < 0 ? c : a.start + 1 + segment.track * a.stride;
    let y = [];
    for (let E = h; E <= p && segment.kind !== "loopIn"; E++) y.push(_(e, E, s.center));
    let S = Math.sign(l.center - s.center);
    for (let E = s.center + (segment.kind === "loopIn" ? 0 : S); E !== l.center + S; E += S)
      y.push(_(e, p, E));
    for (let k = p + 1; k <= c && segment.kind !== "loopOut"; k++) y.push(_(e, k, l.center));
    linkPath(boxCanvas, y, segment.line);
    let w = segment.kind === "loopOut" ? segment.to : segment.from;
    if (segment.kind !== "plain") u.set(w, [...(u.get(w) ?? []), p]);
    if (segment.hasHead)
      i.push({
        at: _(e, c, l.center),
        toward: _(e, l.start, l.center),
      });
    if (segment.label !== "" && e.isVertical)
      drawCanvasText(
        boxCanvas,
        _(e, a.labelStart, l.center - Math.floor(textDisplayWidth(segment.label) / 2)),
        segment.label,
      );
    else if (segment.label !== "") {
      let E = _(e, a.labelStart, l.center);
      let O = _(e, a.labelStart + a.labelSize - 1, l.center);
      drawCanvasText(
        boxCanvas,
        {
          x: Math.min(E.x, O.x) + Math.floor((a.labelSize - textDisplayWidth(segment.label) - 2) / 2),
          y: E.y,
        },
        ` ${segment.label} `,
      );
    }
  }
  for (let [r, [s = 0, l = 0]] of u) {
    let a = e.nodes[r];
    let h = [];
    for (let min = Math.min(s, l); min <= Math.max(s, l); min++) h.push(_(e, min, a?.center ?? 0));
    linkPath(boxCanvas, h, a?.line);
  }
  for (let r of i) {
    drawCanvasText(
      boxCanvas,
      r.at,
      r.toward.x === r.at.x
        ? r.toward.y > r.at.y
          ? "\u25BC"
          : "\u25B2"
        : r.toward.x > r.at.x
          ? "\u25B6"
          : "\u25C0",
    );
    unlinkCell(boxCanvas, r.toward, r.at);
  }
  return gridToLines(boxCanvas);
}
//@ chunk-yb0ajcmt.js:17387-17482 placement
function _(e, t, center) {
  let o = e.isFlipped ? e.rankExtent - 1 - t : t;
  return e.isVertical
    ? {
        x: center,
        y: o,
      }
    : {
        x: o,
        y: center,
      };
}
//@ chunk-yb0ajcmt.js:17482-17679 placement
/**
 * 流程图解析常量：头部、箭头端点字符、节点括号形状、节点/边上限。
 */
var FLOWCHART_HEADER_RE = /^(?:graph|flowchart)(?:\s+(TD|TB|BT|LR|RL))?$/;
var ARROW_HEAD_CHARS = "xo<";
var NODE_SHAPES = [
  ["((", "))", true],
  ["([", "])", true],
  ["[[", "]]", false],
  ["[(", ")]", true],
  ["{{", "}}", false],
  ["[", "]", false],
  ["(", ")", true],
  ["{", "}", false],
];
var MAX_NODES = 200;
var MAX_EDGES = 400;
//@ chunk-yb0ajcmt.js:17679-18251 placement
/**
 * 解析 mermaid flowchart/graph 源码（方向、节点、边、subgraph），超出限制返回 undefined。
 */
function parseFlowchart(e) {
  let match = FLOWCHART_HEADER_RE.exec(e[0] ?? "");
  if (!match) return;
  let n = match[1] ?? "TD";
  let o = {
    direction: n === "BT" || n === "LR" || n === "RL" ? n : "TD",
    nodes: [],
    edges: [],
    groups: [],
  };
  let i = {
    chart: o,
    byId: new Map(),
    open: [],
    groupOf: new Map(),
    groupNames: new Set(),
    linked: new Set(),
    hiddenCells: 0,
  };
  for (let s of e.slice(1)) {
    if (s === "end") {
      if (i.open.pop() === undefined) return;
      continue;
    }
    if (
      !(s.startsWith("subgraph ")
        ? parseNodeDeclaration(i, s.slice(9))
        : parseEdgeChain(i, {
            text: s,
            position: 0,
          }))
    )
      return;
  }
  let any = o.nodes.some((node) => i.groupNames.has(node.id));
  let reduced = o.nodes.reduce((acc, node) => acc + identifierWidth(node.id, node.label), i.hiddenCells);
  return i.open.length > 0 || o.nodes.length === 0 || any || reduced > MAX_CELL_WIDTH ? undefined : o;
}
//@ chunk-yb0ajcmt.js:18251-18591 placement
function parseNodeDeclaration(e, t) {
  let trimmed = t.trim();
  let index = trimmed.indexOf("[");
  let i = index > 0 && trimmed.endsWith("]");
  let u = i ? trimmed.slice(0, index).trim() : "";
  let labelLines = parseLabelLines(i ? trimmed.slice(index + 1, -1) : trimmed);
  let all = Array.from(u).every((a) => WORD_CHAR_RE.test(a));
  if (trimmed === "" || !all || e.open.length > 0) return false;
  e.hiddenCells += identifierWidth(u, labelLines);
  let l = {
    title: labelLines.join(" "),
    members: [],
  };
  e.groupNames.add(i ? u : l.title);
  e.chart.groups.push(l);
  e.open.push(l);
  return true;
}
//@ chunk-yb0ajcmt.js:18591-18934 placement
function parseEdgeChain(e, t) {
  let nodeGroup = parseNodeGroup(e, t);
  while (nodeGroup !== undefined) {
    skipSpaces(t);
    if (t.position >= t.text.length) return true;
    let edgeArrow = parseEdgeArrow(t);
    let i = edgeArrow && parseNodeGroup(e, t);
    if (!edgeArrow || !i) return false;
    let u = nodeGroup.length * i.length;
    if (e.chart.edges.length + u > MAX_EDGES) return false;
    for (let r of nodeGroup)
      for (let s of i) {
        let l = `${r} ${s}`;
        if (e.linked.has(l)) return false;
        e.linked.add(l);
        e.chart.edges.push({
          from: r,
          to: s,
          ...edgeArrow,
        });
      }
    nodeGroup = i;
  }
  return false;
}
//@ chunk-yb0ajcmt.js:18934-19095 placement
/**
 * 解析 “A & B & C” 节点组。
 */
function parseNodeGroup(e, t) {
  let n = new Set();
  for (;;) {
    let nodeRef = parseNodeRef(e, t);
    if (nodeRef === undefined || n.has(nodeRef)) return;
    n.add(nodeRef);
    skipSpaces(t);
    if (t.text[t.position] !== "&") return Array.from(n);
    t.position++;
  }
}
//@ chunk-yb0ajcmt.js:19095-20015 placement
function parseNodeRef(e, t) {
  skipSpaces(t);
  let position = t.position;
  while (WORD_CHAR_RE.test(t.text[t.position] ?? "")) t.position++;
  let sliced = t.text.slice(position, t.position);
  if (sliced === "") return;
  let sliced_2 = t.text.slice(t.position);
  let found = NODE_SHAPES.find(([c]) => sliced_2.startsWith(c));
  let r;
  if (found) {
    let [c, p] = found;
    let y = t.position + c.length;
    let S = t.text[y] === '"';
    let w = S ? t.text.indexOf('"', y + 1) : y;
    let E = w < 0 ? -1 : t.text.indexOf(p, w);
    let O = E < 0 ? "" : t.text.slice(y, E);
    let I = O.startsWith("/") || O.startsWith("\\");
    let C = S && t.text.slice(w + 1, E).trim() !== "";
    if (E < 0 || I || C) return;
    r = parseLabelLines(O);
    t.position = E + p.length;
  }
  if (t.text.startsWith(":::", t.position)) return;
  let s = e.byId.get(sliced);
  if (
    s !== undefined &&
    r !== undefined &&
    s.label.join(`
`) !==
      r.join(`
`) &&
    s.label.join(`
`) !== sliced
  )
    return;
  if (s && r) {
    s.label = r;
    s.isRounded = found?.[2] ?? false;
  } else if (!s) {
    if (e.chart.nodes.length >= MAX_NODES) return;
    let c = {
      id: sliced,
      label: r ?? [sliced],
      isRounded: found?.[2] ?? false,
    };
    e.byId.set(sliced, c);
    e.chart.nodes.push(c);
  }
  let last = e.open.at(-1);
  let h = e.groupOf.get(sliced);
  if (last && h && h !== last) return;
  if (last && !h) {
    e.groupOf.set(sliced, last);
    last.members.push(sliced);
  }
  return sliced;
}
//@ chunk-yb0ajcmt.js:20015-20870 placement
function parseEdgeArrow(e) {
  skipSpaces(e);
  let { text } = e;
  let n = text[e.position];
  let o = n === "-" && text[e.position + 1] === ".";
  if (n !== "-" && n !== "=") return;
  let line = o ? "dotted" : n === "=" ? "thick" : "solid";
  let u = "";
  if (o) {
    e.position += 2;
    if (text[e.position] !== "." && text[e.position] !== "-") {
      let index = text.indexOf(".-", e.position);
      if (index < 0) return;
      u = text.slice(e.position, index);
      e.position = index;
    }
    countRepeats(e, ".");
    if (countRepeats(e, "-") < 1) return;
  } else {
    let s = countRepeats(e, n);
    if (ARROW_HEAD_CHARS.includes(text[e.position] ?? " ")) return;
    let l = s === 2 && text[e.position] !== ">";
    if (l) {
      let index = text.indexOf(n + n, e.position);
      if (index < 0) return;
      u = text.slice(e.position, index);
      e.position = index;
    }
    let a = l ? countRepeats(e, n) : s;
    let h = text[e.position] !== ">";
    if (a < 2 || (h && a < 3)) return;
  }
  if (ARROW_HEAD_CHARS.includes(text[e.position] ?? " ")) return;
  let r = text[e.position] === ">";
  e.position += r ? 1 : 0;
  skipSpaces(e);
  if (text[e.position] === "|") {
    let index = text.indexOf("|", e.position + 1);
    if (index < 0 || u.trim() !== "") return;
    u = text.slice(e.position + 1, index);
    e.position = index + 1;
  }
  return {
    label: parseLabelLines(u).join(" ").trim(),
    line,
    hasArrow: r,
  };
}
//@ chunk-yb0ajcmt.js:20870-20966 placement
/**
 * 连续重复字符数
 */
function countRepeats(e, t) {
  let position = e.position;
  while (e.text[e.position] === t) e.position++;
  return e.position - position;
}
//@ chunk-yb0ajcmt.js:20966-21051 placement
/**
 * 跳过空格与制表符
 */
function skipSpaces(e) {
  while (e.text[e.position] === " " || e.text[e.position] === "\t") e.position++;
}
//@ chunk-yb0ajcmt.js:21051-21060 placement
/**
 * 4
 */
var EDGE_LABEL_OFFSET = 4;
export { parseFlowchart, renderFlowchartAsList, labelEdgeBundles, EDGE_LABEL_OFFSET };
