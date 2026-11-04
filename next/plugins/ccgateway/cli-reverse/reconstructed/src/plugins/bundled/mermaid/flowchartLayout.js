/**
 * plugins/bundled/mermaid/flowchartLayout.ts
 *
 * 2.1.316 新增：mermaid 流程图分层布局
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yb0ajcmt.js (8)
 * attribution: placement 8
 */
import {
  BOX_STYLE_GLYPHS,
  BOX_STYLES,
  BOX_DIRECTION_BITS,
  BOX_UP_BIT,
  BOX_LEFT_BIT,
  BOX_RIGHT_BIT,
  BOX_ROUND_CORNERS,
  BOX_LINE_GLYPHS,
  textDisplayWidth,
} from "../../../ink/graphemeCells.js";
import { labelEdgeBundles } from "./flowchartRender.js";

//@ chunk-yb0ajcmt.js:9934-10213 placement
/**
 * 把字符网格（字形、连线位、样式、圆角）转为文本行。
 */
function gridToLines(boxCanvas) {
  let lines = [];
  for (let k = 0; k < boxCanvas.height; k++) {
    let line = "";
    for (let k_2 = 0; k_2 < boxCanvas.width; k_2++) {
      let index = k * boxCanvas.width + k_2;
      let links = boxCanvas.links[index] ?? 0;
      let glyphs = BOX_STYLE_GLYPHS[BOX_STYLES[boxCanvas.styles[index] ?? 0] ?? "solid"];
      line +=
        boxCanvas.glyphs[index] ??
        (links === (BOX_DIRECTION_BITS | BOX_UP_BIT)
          ? glyphs.down
          : links === (BOX_LEFT_BIT | BOX_RIGHT_BIT)
            ? glyphs.across
            : ((boxCanvas.rounded[index] ? BOX_ROUND_CORNERS[links] : undefined) ??
              BOX_LINE_GLYPHS[links] ??
              " "));
    }
    lines.push(line.trimEnd());
  }
  return lines;
}
//@ chunk-yb0ajcmt.js:10213-10237 placement
/**
 * 1000
 */
var MAX_LAYOUT_WIDTH = 1000;
var MAX_LABEL_LEN = 64;
var MAX_NODE_HEIGHT = 24;
//@ chunk-yb0ajcmt.js:10237-13733 placement
/**
 * 把解析后的 mermaid 流程图（节点/边/子图）按方向分层布局到字符网格坐标。
 */
function layoutFlowchart(graph, isWide, maxSize) {
  let isVertical = graph.direction === "TD" || graph.direction === "BT";
  let indexById = new Map(graph.nodes.map((node, graphNode) => [node.id, graphNode]));
  let mapped = graph.edges.map((edge) => ({
    from: indexById.get(edge.from) ?? 0,
    to: indexById.get(edge.to) ?? 0,
  }));
  let mapped_2 = graph.nodes.map(() => []);
  mapped.forEach((edge, index) => mapped_2[edge.from]?.push(index));
  let mapped_3 = mapped.map((edge) => edge.from === edge.to);
  let visited = new Uint8Array(graph.nodes.length);
  for (let k = 0; k < graph.nodes.length; k++)
    markLoopEdges(k, {
      outgoing: mapped_2,
      links: mapped,
      visited,
      isLoop: mapped_3,
    });
  let ranks = rankNodesTopologically(
    graph.nodes.length,
    mapped.filter((edge, index) => !mapped_3[index]),
  );
  let mapped_4 = graph.nodes.map(() => 0);
  let mapped_5 = graph.nodes.map(() => "");
  graph.edges.forEach((edge, edgeIndex) => {
    let to = mapped[edgeIndex]?.to ?? 0;
    mapped_4[to] = (mapped_4[to] ?? 0) + 1;
    mapped_5[to] = edge.label === "" ? (mapped_5[to] ?? "") : edge.label;
  });
  if (mapped_5.some((label, index) => label !== "" && (mapped_4[index] ?? 0) > 1)) return;
  let nodes = graph.nodes.map((node, graphNode) => {
    let width = Math.max(...node.label.map(textDisplayWidth)) + 4;
    let height = node.label.length + 2;
    let breadth = isVertical ? width : height;
    let label = mapped_5[graphNode] ?? "";
    return {
      kind: "box",
      label: node.label,
      isRounded: node.isRounded,
      line: "solid",
      rank: ranks[graphNode] ?? 0,
      center: 0,
      breadth,
      slot: isVertical && label !== "" ? Math.max(breadth, textDisplayWidth(label) + 2) : breadth,
      depth: isVertical ? height : width,
      start: 0,
    };
  });
  if (
    mapped.reduce(
      (acc, edge, index) => acc + (mapped_3[index] ? 2 : (ranks[edge.to] ?? 0) - (ranks[edge.from] ?? 0)),
      0,
    ) > MAX_LAYOUT_WIDTH
  )
    return;
  let segments = [];
  mapped.forEach((edge, index) => {
    let source = graph.edges[index];
    let to = ranks[edge.to] ?? 0;
    let from = edge.from;
    for (let idx = (ranks[edge.from] ?? 0) + 1; idx <= to && source && !mapped_3[index]; idx++) {
      let target = idx === to ? edge.to : nodes.length;
      if (idx !== to)
        nodes.push({
          kind: "crossing",
          label: [],
          isRounded: false,
          line: source.line,
          rank: idx,
          center: 0,
          breadth: 1,
          slot: 1,
          depth: 0,
          start: 0,
        });
      segments.push({
        kind: "plain",
        gap: idx - 1,
        from,
        to: target,
        line: source.line,
        label: idx === to ? source.label : "",
        hasHead: source.hasArrow && idx === to,
        track: -1,
      });
      from = target;
    }
  });
  let byRank = [];
  nodes.forEach((index, nodeIndex) => {
    let rankNodes = byRank[index.rank] ?? [];
    rankNodes.push(nodeIndex);
    byRank[index.rank] = rankNodes;
  });
  let mapped_6 = nodes.map(() => []);
  let mapped_7 = nodes.map(() => []);
  for (let segment of segments) {
    mapped_6[segment.to]?.push(segment.from);
    mapped_7[segment.from]?.push(segment.to);
  }
  for (let idx = 0; idx < 4; idx++) {
    let isDown = idx % 2 === 0;
    for (let idx = 1; idx < byRank.length; idx++) {
      let rank = isDown ? idx : byRank.length - 1 - idx;
      let neighbor = byRank[isDown ? rank - 1 : rank + 1] ?? [];
      let nodes = byRank[rank] ?? [];
      let positionOf = new Map(neighbor.map((id, position) => [id, position]));
      let targets = new Map(
        nodes.map((id, position) => [
          id,
          averageOf(((isDown ? mapped_6 : mapped_7)[id] ?? []).map((id) => positionOf.get(id) ?? 0)) ??
            position,
        ]),
      );
      nodes.sort((a, b) => (targets.get(a) ?? 0) - (targets.get(b) ?? 0));
    }
  }
  let gap = isVertical ? (isWide ? 1 : 3) : isWide ? 0 : 1;
  for (let rankNodes of byRank)
    rankNodes.forEach((index, previousIndex) => {
      let node = nodes[index];
      let previous = nodes[rankNodes[previousIndex - 1] ?? -1];
      if (node)
        node.center = previous
          ? previous.center + requiredCenterGap(previous, node, gap)
          : Math.floor(node.slot / 2);
    });
  for (let idx = 0; idx < 4; idx++) {
    let isDown = idx % 2 === 0;
    for (let idx = 1; idx < byRank.length; idx++) {
      let rank = isDown ? idx : byRank.length - 1 - idx;
      spreadNodeCenters(
        (byRank[rank] ?? []).flatMap((index) => nodes[index] ?? []),
        (byRank[rank] ?? []).map((index) =>
          averageOf(((isDown ? mapped_6 : mapped_7)[index] ?? []).map((id) => nodes[id]?.center ?? 0)),
        ),
        gap,
      );
    }
  }
  let min = Math.min(...nodes.map((node) => node.center - Math.floor(node.slot / 2)));
  for (let node of nodes) node.center -= min;
  let max = Math.max(...nodes.map((node) => node.center - Math.floor(node.slot / 2) + node.slot));
  let sorted = mapped
    .flatMap((link, index) =>
      mapped_3[index]
        ? [
            {
              link,
              edge: index,
            },
          ]
        : [],
    )
    .sort(
      (a, b) =>
        (ranks[a.link.from] ?? 0) -
        (ranks[a.link.to] ?? 0) -
        ((ranks[b.link.from] ?? 0) - (ranks[b.link.to] ?? 0)),
    );
  for (let { link, edge } of sorted) {
    let loopEdge = graph.edges[edge];
    let channel = {
      kind: "channel",
      label: [],
      isRounded: false,
      line: loopEdge?.line ?? "solid",
      rank: -1,
      center: max + 1,
      breadth: 1,
      slot: 1,
      depth: 0,
      start: 0,
    };
    max += 2;
    nodes.push(channel);
    segments.push(
      {
        kind: "loopOut",
        gap: ranks[link.from] ?? 0,
        from: link.from,
        to: nodes.length - 1,
        line: channel.line,
        label: "",
        hasHead: false,
        track: -1,
      },
      {
        kind: "loopIn",
        gap: (ranks[link.to] ?? 0) - 1,
        from: nodes.length - 1,
        to: link.to,
        line: channel.line,
        label: loopEdge?.label ?? "",
        hasHead: Boolean(loopEdge?.hasArrow),
        track: -1,
      },
    );
  }
  if (isVertical && max > maxSize) return "too wide";
  let gaps = new Map();
  let cursor = 0;
  for (let rank = -1; rank < byRank.length; rank++) {
    let flattened = (byRank[rank] ?? []).flatMap((index) => nodes[index] ?? []);
    let depth = rank < 0 ? 0 : Math.max(1, ...flattened.map((node) => node.depth));
    for (let node of flattened) {
      node.depth = node.kind === "crossing" ? depth : node.depth;
      node.start = cursor + Math.floor((depth - node.depth) / 2);
    }
    cursor += depth;
    let segments_2 = segments.filter((segment) => segment.gap === rank);
    let hasNextRank = rank >= 0 && rank < byRank.length - 1;
    if (segments_2.length === 0 && !hasNextRank) continue;
    if (!isVertical && cursor > maxSize) return "too wide";
    let lanes = segments_2.length > MAX_LABEL_LEN ? undefined : labelEdgeBundles(segments_2, nodes);
    if (lanes === undefined) return;
    let max = Math.max(0, ...segments_2.map((segment) => textDisplayWidth(segment.label)));
    let stride = isVertical ? 1 : 2;
    let labelSize = max === 0 ? 0 : isVertical ? 1 : max + 2;
    let start = rank < 0 ? cursor - 1 : cursor;
    let labelStart = start + 1 + lanes * stride;
    gaps.set(rank, {
      start,
      labelStart,
      labelSize,
      stride,
    });
    cursor = rank === byRank.length - 1 ? labelStart : labelStart + labelSize + (isVertical ? 1 : 2);
  }
  return {
    isVertical,
    isFlipped: graph.direction === "BT" || graph.direction === "RL",
    nodes,
    segments,
    gaps,
    rankExtent: cursor,
    orderExtent: max,
  };
}
//@ chunk-yb0ajcmt.js:13733-13911 placement
/**
 * 深度优先遍历，标记形成环的边。
 */
function markLoopEdges(from, state) {
  if (state.visited[from] !== 0) return;
  state.visited[from] = 1;
  for (let index of state.outgoing[from] ?? []) {
    let to = state.links[index]?.to ?? 0;
    if (state.visited[to] === 1) state.isLoop[index] = true;
    else markLoopEdges(to, state);
  }
  state.visited[from] = 2;
}
//@ chunk-yb0ajcmt.js:13911-14270 placement
function rankNodesTopologically(count, edges) {
  let list = Array.from(
    {
      length: count,
    },
    () => 0,
  );
  let list_2 = Array.from(
    {
      length: count,
    },
    () => 0,
  );
  let list_3 = Array.from(
    {
      length: count,
    },
    () => [],
  );
  for (let edge of edges) {
    list_2[edge.to] = (list_2[edge.to] ?? 0) + 1;
    list_3[edge.from]?.push(edge.to);
  }
  let flattened = list_2.flatMap((count, index) => (count === 0 ? [index] : []));
  for (let k = 0; k < flattened.length; k++) {
    let node = flattened[k] ?? 0;
    for (let next of list_3[node] ?? []) {
      list[next] = Math.max(list[next] ?? 0, (list[node] ?? 0) + 1);
      list_2[next] = (list_2[next] ?? 0) - 1;
      if (list_2[next] === 0) flattened.push(next);
    }
  }
  return list;
}
//@ chunk-yb0ajcmt.js:14270-14344 placement
/**
 * 求平均
 */
function averageOf(values) {
  return values.length === 0 ? undefined : values.reduce((acc, value) => acc + value, 0) / values.length;
}
//@ chunk-yb0ajcmt.js:14344-14401 placement (2.1.88 match: percentile, 0.62)
/**
 * 图布局：两个相邻节点中心的最小间距。旧版名 percentile 为错配，归错文件。
 */
function requiredCenterGap(left, right, gap) {
  return Math.ceil((left.slot + right.slot) / 2) + gap;
}
//@ chunk-yb0ajcmt.js:14401-14774 placement
/**
 * 图布局：前向/后向两遍约束后取中点，调整节点中心位置。
 */
function spreadNodeCenters(nodes, targets, gap) {
  let lefts = [];
  nodes.forEach((node, index) => {
    let previous = nodes[index - 1];
    let rounded = Math.round(targets[index] ?? node.center);
    lefts.push(
      previous
        ? Math.max(rounded, (lefts[index - 1] ?? 0) + requiredCenterGap(previous, node, gap))
        : rounded,
    );
  });
  let list = Array.from(
    {
      length: nodes.length,
    },
    () => 0,
  );
  for (let k = nodes.length - 1; k >= 0; k--) {
    let node = nodes[k];
    let next = nodes[k + 1];
    let rounded = Math.round(targets[k] ?? node?.center ?? 0);
    list[k] =
      node && next ? Math.min(rounded, (list[k + 1] ?? 0) - requiredCenterGap(node, next, gap)) : rounded;
  }
  nodes.forEach((node, index) => {
    node.center = Math.floor(((lefts[index] ?? 0) + (list[index] ?? 0)) / 2);
  });
}
export { MAX_NODE_HEIGHT, layoutFlowchart, gridToLines };
