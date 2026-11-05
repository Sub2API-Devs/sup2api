/**
 * plugins/bundled/mermaid/flowchartRender.ts
 *
 * 2.1.316 新增：mermaid 流程图解析与字符画绘制
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-q80fh8vc.js (14)
 * attribution: placement 14
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-q80fh8vc.js:15082-15684 placement
function labelEdgeBundles(segments, nodes) {
  let filtered = segments.filter((segment) => nodes[segment.from]?.center !== nodes[segment.to]?.center);
  let countByFrom = new Map();
  for (let segment of filtered) countByFrom.set(segment.from, (countByFrom.get(segment.from) ?? 0) + 1);
  let byKey = new Map();
  for (let segment of filtered) {
    let key = countByFrom.get(segment.from) === 1 ? `to ${segment.to}` : `from ${segment.from}`;
    byKey.set(key, [...(byKey.get(key) ?? []), segment]);
  }
  if (byKey.size > MAX_NODE_HEIGHT) return;
  let sorted = [...byKey.values()].sort(
    (a, b) => (nodes[a[0]?.from ?? 0]?.center ?? 0) - (nodes[b[0]?.from ?? 0]?.center ?? 0),
  );
  let track = 0;
  while (sorted.length > 0) {
    let index = sorted.findIndex((candidate) =>
      sorted.every(
        (bundle) =>
          bundle === candidate ||
          !bundle.some((segment) =>
            candidate.some(
              (otherSegment) =>
                nodes[segment.from]?.center === nodes[otherSegment.to]?.center &&
                segment.kind !== "loopIn" &&
                otherSegment.kind !== "loopOut",
            ),
          ),
      ),
    );
    if (index < 0) return;
    for (let segment of sorted.splice(index, 1)[0] ?? []) segment.track = track;
    track++;
  }
  return track;
}
//@ chunk-q80fh8vc.js:15684-16096 placement
/**
 * 宽度不够画框图时，把流程图退化为"subgraph: 成员"的文字列表。
 */
function renderFlowchartAsList(graph, width) {
  let labelById = new Map(graph.nodes.map((node) => [node.id, node.label]));
  let mapped = graph.groups.map(
    (group) =>
      `subgraph ${group.title}: ` +
      group.members.map((member) => (labelById.get(member) ?? [member]).join(" ")).join(", "),
  );
  if (mapped.some((line) => textDisplayWidth(line) > width)) return;
  for (let isWide of [false, true]) {
    let layout = layoutFlowchart(graph, isWide, width);
    if (!layout) return;
    if (layout === "too wide") continue;
    let columns = layout.isVertical ? layout.orderExtent : layout.rankExtent;
    let rows = layout.isVertical ? layout.rankExtent : layout.orderExtent;
    if (columns <= width && columns * rows <= MAX_CANVAS_CELLS)
      return [...drawFlowchart(layout, columns, rows), ...mapped];
  }
  return;
}
//@ chunk-q80fh8vc.js:16096-17695 placement
/**
 * 在字符画布上绘制流程图的节点框、交叉、连线与回环。
 */
function drawFlowchart(layout, chars, stylePool) {
  let boxCanvas = createBoxCanvas(chars, stylePool);
  for (let node of layout.nodes) {
    let leftColumn = node.center - Math.floor(node.breadth / 2);
    let left = rankAnchor(layout, node.start, leftColumn);
    let right = rankAnchor(layout, node.start + node.depth - 1, leftColumn + node.breadth - 1);
    if (node.kind === "crossing")
      linkPath(
        boxCanvas,
        Array.from(
          {
            length: node.depth,
          },
          (index, offset) => rankAnchor(layout, node.start + offset, node.center),
        ),
        node.line,
      );
    else if (node.kind === "box")
      drawCanvasBox(
        boxCanvas,
        {
          x: Math.min(left.x, right.x),
          y: Math.min(left.y, right.y),
          width: Math.abs(right.x - left.x) + 1,
          height: Math.abs(right.y - left.y) + 1,
        },
        node.label,
        node.isRounded,
      );
  }
  let arrowheads = [];
  let tracksByNode = new Map();
  for (let segment of layout.segments) {
    let fromNode = layout.nodes[segment.from];
    let toNode = layout.nodes[segment.to];
    let gap = layout.gaps.get(segment.gap);
    if (!fromNode || !toNode || !gap) continue;
    let fromEnd = fromNode.start + fromNode.depth - 1;
    let toStart = segment.hasHead ? toNode.start - 1 : toNode.start;
    let turnRow = segment.track < 0 ? toStart : gap.start + 1 + segment.track * gap.stride;
    let points = [];
    for (let row = fromEnd; row <= turnRow && segment.kind !== "loopIn"; row++)
      points.push(rankAnchor(layout, row, fromNode.center));
    let direction = Math.sign(toNode.center - fromNode.center);
    for (
      let column = fromNode.center + (segment.kind === "loopIn" ? 0 : direction);
      column !== toNode.center + direction;
      column += direction
    )
      points.push(rankAnchor(layout, turnRow, column));
    for (let idx = turnRow + 1; idx <= toStart && segment.kind !== "loopOut"; idx++)
      points.push(rankAnchor(layout, idx, toNode.center));
    linkPath(boxCanvas, points, segment.line);
    let nodeIndex = segment.kind === "loopOut" ? segment.to : segment.from;
    if (segment.kind !== "plain")
      tracksByNode.set(nodeIndex, [...(tracksByNode.get(nodeIndex) ?? []), turnRow]);
    if (segment.hasHead)
      arrowheads.push({
        at: rankAnchor(layout, toStart, toNode.center),
        toward: rankAnchor(layout, toNode.start, toNode.center),
      });
    if (segment.label !== "" && layout.isVertical)
      drawCanvasText(
        boxCanvas,
        rankAnchor(layout, gap.labelStart, toNode.center - Math.floor(textDisplayWidth(segment.label) / 2)),
        segment.label,
      );
    else if (segment.label !== "") {
      let labelAt = rankAnchor(layout, gap.labelStart, toNode.center);
      let labelEnd = rankAnchor(layout, gap.labelStart + gap.labelSize - 1, toNode.center);
      drawCanvasText(
        boxCanvas,
        {
          x:
            Math.min(labelAt.x, labelEnd.x) +
            Math.floor((gap.labelSize - textDisplayWidth(segment.label) - 2) / 2),
          y: labelAt.y,
        },
        ` ${segment.label} `,
      );
    }
  }
  for (let [nodeIndex, [firstTrack = 0, lastTrack = 0]] of tracksByNode) {
    let node = layout.nodes[nodeIndex];
    let points = [];
    for (let min = Math.min(firstTrack, lastTrack); min <= Math.max(firstTrack, lastTrack); min++)
      points.push(rankAnchor(layout, min, node?.center ?? 0));
    linkPath(boxCanvas, points, node?.line);
  }
  for (let arrowhead of arrowheads) {
    drawCanvasText(
      boxCanvas,
      arrowhead.at,
      arrowhead.toward.x === arrowhead.at.x
        ? arrowhead.toward.y > arrowhead.at.y
          ? "\u25BC"
          : "\u25B2"
        : arrowhead.toward.x > arrowhead.at.x
          ? "\u25B6"
          : "\u25C0",
    );
    unlinkCell(boxCanvas, arrowhead.toward, arrowhead.at);
  }
  return gridToLines(boxCanvas);
}
//@ chunk-q80fh8vc.js:17695-17790 placement
function rankAnchor(layout, rank, center) {
  let row = layout.isFlipped ? layout.rankExtent - 1 - rank : rank;
  return layout.isVertical
    ? {
        x: center,
        y: row,
      }
    : {
        x: row,
        y: center,
      };
}
//@ chunk-q80fh8vc.js:17790-17987 placement
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
//@ chunk-q80fh8vc.js:17987-18559 placement
/**
 * 解析 mermaid flowchart/graph 源码（方向、节点、边、subgraph），超出限制返回 undefined。
 */
function parseFlowchart(lines) {
  let match = FLOWCHART_HEADER_RE.exec(lines[0] ?? "");
  if (!match) return;
  let direction = match[1] ?? "TD";
  let graph = {
    direction: direction === "BT" || direction === "LR" || direction === "RL" ? direction : "TD",
    nodes: [],
    edges: [],
    groups: [],
  };
  let state = {
    chart: graph,
    byId: new Map(),
    open: [],
    groupOf: new Map(),
    groupNames: new Set(),
    linked: new Set(),
    hiddenCells: 0,
  };
  for (let line of lines.slice(1)) {
    if (line === "end") {
      if (state.open.pop() === undefined) return;
      continue;
    }
    if (
      !(line.startsWith("subgraph ")
        ? parseNodeDeclaration(state, line.slice(9))
        : parseEdgeChain(state, {
            text: line,
            position: 0,
          }))
    )
      return;
  }
  let any = graph.nodes.some((node) => state.groupNames.has(node.id));
  let reduced = graph.nodes.reduce(
    (acc, node) => acc + identifierWidth(node.id, node.label),
    state.hiddenCells,
  );
  return state.open.length > 0 || graph.nodes.length === 0 || any || reduced > MAX_CELL_WIDTH
    ? undefined
    : graph;
}
//@ chunk-q80fh8vc.js:18559-18899 placement
function parseNodeDeclaration(state, text) {
  let trimmed = text.trim();
  let index = trimmed.indexOf("[");
  let hasLabel = index > 0 && trimmed.endsWith("]");
  let nodeId = hasLabel ? trimmed.slice(0, index).trim() : "";
  let tokens = parseLabelLines(hasLabel ? trimmed.slice(index + 1, -1) : trimmed);
  let all = Array.from(nodeId).every((char) => WORD_CHAR_RE.test(char));
  if (trimmed === "" || !all || state.open.length > 0) return false;
  state.hiddenCells += identifierWidth(nodeId, tokens);
  let group = {
    title: tokens.join(" "),
    members: [],
  };
  state.groupNames.add(hasLabel ? nodeId : group.title);
  state.chart.groups.push(group);
  state.open.push(group);
  return true;
}
//@ chunk-q80fh8vc.js:18899-19242 placement
function parseEdgeChain(state, cursor) {
  let nodeGroup = parseNodeGroup(state, cursor);
  while (nodeGroup !== undefined) {
    skipSpaces(cursor);
    if (cursor.position >= cursor.text.length) return true;
    let edgeArrow = parseEdgeArrow(cursor);
    let targetGroup = edgeArrow && parseNodeGroup(state, cursor);
    if (!edgeArrow || !targetGroup) return false;
    let newEdgeCount = nodeGroup.length * targetGroup.length;
    if (state.chart.edges.length + newEdgeCount > MAX_EDGES) return false;
    for (let from of nodeGroup)
      for (let to of targetGroup) {
        let pairKey = `${from} ${to}`;
        if (state.linked.has(pairKey)) return false;
        state.linked.add(pairKey);
        state.chart.edges.push({
          from,
          to,
          ...edgeArrow,
        });
      }
    nodeGroup = targetGroup;
  }
  return false;
}
//@ chunk-q80fh8vc.js:19242-19403 placement
/**
 * 解析 “A & B & C” 节点组。
 */
function parseNodeGroup(state, cursor) {
  let seen = new Set();
  for (;;) {
    let nodeRef = parseNodeRef(state, cursor);
    if (nodeRef === undefined || seen.has(nodeRef)) return;
    seen.add(nodeRef);
    skipSpaces(cursor);
    if (cursor.text[cursor.position] !== "&") return Array.from(seen);
    cursor.position++;
  }
}
//@ chunk-q80fh8vc.js:19403-20323 placement
function parseNodeRef(state, cursor) {
  skipSpaces(cursor);
  let position = cursor.position;
  while (WORD_CHAR_RE.test(cursor.text[cursor.position] ?? "")) cursor.position++;
  let sliced = cursor.text.slice(position, cursor.position);
  if (sliced === "") return;
  let sliced_2 = cursor.text.slice(cursor.position);
  let found = NODE_SHAPES.find(([opener]) => sliced_2.startsWith(opener));
  let labelLines;
  if (found) {
    let [opener, closer] = found;
    let afterOpen = cursor.position + opener.length;
    let isQuoted = cursor.text[afterOpen] === '"';
    let quoteEnd = isQuoted ? cursor.text.indexOf('"', afterOpen + 1) : afterOpen;
    let closeIndex = quoteEnd < 0 ? -1 : cursor.text.indexOf(closer, quoteEnd);
    let rawLabel = closeIndex < 0 ? "" : cursor.text.slice(afterOpen, closeIndex);
    let isBracket = rawLabel.startsWith("/") || rawLabel.startsWith("\\");
    let hasTrailing = isQuoted && cursor.text.slice(quoteEnd + 1, closeIndex).trim() !== "";
    if (closeIndex < 0 || isBracket || hasTrailing) return;
    labelLines = parseLabelLines(rawLabel);
    cursor.position = closeIndex + closer.length;
  }
  if (cursor.text.startsWith(":::", cursor.position)) return;
  let existing = state.byId.get(sliced);
  if (
    existing !== undefined &&
    labelLines !== undefined &&
    existing.label.join(`
`) !==
      labelLines.join(`
`) &&
    existing.label.join(`
`) !== sliced
  )
    return;
  if (existing && labelLines) {
    existing.label = labelLines;
    existing.isRounded = found?.[2] ?? false;
  } else if (!existing) {
    if (state.chart.nodes.length >= MAX_NODES) return;
    let node = {
      id: sliced,
      label: labelLines ?? [sliced],
      isRounded: found?.[2] ?? false,
    };
    state.byId.set(sliced, node);
    state.chart.nodes.push(node);
  }
  let last = state.open.at(-1);
  let groupOfNode = state.groupOf.get(sliced);
  if (last && groupOfNode && groupOfNode !== last) return;
  if (last && !groupOfNode) {
    state.groupOf.set(sliced, last);
    last.members.push(sliced);
  }
  return sliced;
}
//@ chunk-q80fh8vc.js:20323-21178 placement
function parseEdgeArrow(cursor) {
  skipSpaces(cursor);
  let { text } = cursor;
  let first = text[cursor.position];
  let isDotted = first === "-" && text[cursor.position + 1] === ".";
  if (first !== "-" && first !== "=") return;
  let line = isDotted ? "dotted" : first === "=" ? "thick" : "solid";
  let label = "";
  if (isDotted) {
    cursor.position += 2;
    if (text[cursor.position] !== "." && text[cursor.position] !== "-") {
      let index = text.indexOf(".-", cursor.position);
      if (index < 0) return;
      label = text.slice(cursor.position, index);
      cursor.position = index;
    }
    countRepeats(cursor, ".");
    if (countRepeats(cursor, "-") < 1) return;
  } else {
    let count = countRepeats(cursor, first);
    if (ARROW_HEAD_CHARS.includes(text[cursor.position] ?? " ")) return;
    let hasSeparateLabel = count === 2 && text[cursor.position] !== ">";
    if (hasSeparateLabel) {
      let index = text.indexOf(first + first, cursor.position);
      if (index < 0) return;
      label = text.slice(cursor.position, index);
      cursor.position = index;
    }
    let tailCount = hasSeparateLabel ? countRepeats(cursor, first) : count;
    let isBare = text[cursor.position] !== ">";
    if (tailCount < 2 || (isBare && tailCount < 3)) return;
  }
  if (ARROW_HEAD_CHARS.includes(text[cursor.position] ?? " ")) return;
  let hasArrow = text[cursor.position] === ">";
  cursor.position += hasArrow ? 1 : 0;
  skipSpaces(cursor);
  if (text[cursor.position] === "|") {
    let index = text.indexOf("|", cursor.position + 1);
    if (index < 0 || label.trim() !== "") return;
    label = text.slice(cursor.position + 1, index);
    cursor.position = index + 1;
  }
  return {
    label: parseLabelLines(label).join(" ").trim(),
    line,
    hasArrow,
  };
}
//@ chunk-q80fh8vc.js:21178-21274 placement
/**
 * 连续重复字符数
 */
function countRepeats(cursor, char) {
  let position = cursor.position;
  while (cursor.text[cursor.position] === char) cursor.position++;
  return cursor.position - position;
}
//@ chunk-q80fh8vc.js:21274-21359 placement
/**
 * 跳过空格与制表符
 */
function skipSpaces(cursor) {
  while (cursor.text[cursor.position] === " " || cursor.text[cursor.position] === "\t") cursor.position++;
}
//@ chunk-q80fh8vc.js:21359-21368 placement
/**
 * 4
 */
var EDGE_LABEL_OFFSET = 4;
export { parseFlowchart, renderFlowchartAsList, labelEdgeBundles, EDGE_LABEL_OFFSET };
