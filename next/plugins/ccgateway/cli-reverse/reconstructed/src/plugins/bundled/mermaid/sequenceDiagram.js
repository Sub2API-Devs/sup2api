/**
 * plugins/bundled/mermaid/sequenceDiagram.ts
 *
 * 2.1.316 新增：mermaid 时序图解析与绘制
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-q80fh8vc.js (15)
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

//@ chunk-q80fh8vc.js:21368-21997 placement
/**
 * 在字符画布上绘制 mermaid 时序图（参与者、消息箭头、note、frame）。
 */
function drawSequenceDiagram(diagram, columns) {
  let layout = measureSequenceDiagram(diagram);
  let headerHeight = Math.max(...diagram.participants.map((participant) => participant.length)) + 2;
  let stylePool = headerHeight + 1 + diagram.steps.reduce((acc, step) => acc + stepHeight(step), 0);
  if (layout.width > columns || layout.width * stylePool > MAX_CANVAS_CELLS) return;
  let boxCanvas = createBoxCanvas(layout.width, stylePool);
  let noteCells = new Set();
  let row = headerHeight + 1;
  let mapped = diagram.steps.map((step) => {
    let stepRow = row;
    row += stepHeight(step);
    if (step.kind === "note") {
      let box = noteBox(step, layout, stepRow);
      for (let boxY = box.y; boxY < box.y + box.height; boxY++)
        for (let x = box.x; x < box.x + box.width; x++) noteCells.add(boxY * layout.width + x);
    }
    return stepRow;
  });
  diagram.participants.forEach((participant, index) => {
    let center = layout.centers[index] ?? 0;
    let width = textDisplayWidth(widest(participant)) + 4;
    drawCanvasBox(
      boxCanvas,
      {
        x: center - Math.floor(width / 2),
        y: 0,
        width,
        height: headerHeight,
      },
      participant,
      false,
    );
    linkCells(
      boxCanvas,
      {
        x: center,
        y: headerHeight - 1,
      },
      {
        x: center,
        y: headerHeight,
      },
    );
    for (let rowY = headerHeight; rowY < stylePool; rowY++)
      if (!noteCells.has(rowY * layout.width + center))
        drawCanvasText(
          boxCanvas,
          {
            x: center,
            y: rowY,
          },
          "\u2502",
        );
  });
  diagram.steps.forEach((step, index) => {
    drawSequenceStep(boxCanvas, step, layout, mapped[index] ?? 0);
  });
  return gridToLines(boxCanvas);
}
//@ chunk-q80fh8vc.js:21997-22767 placement
function drawSequenceStep(boxCanvas, step, layout, row) {
  switch (step.kind) {
    case "frame": {
      let label = `\u2500\u2500 ${step.label} `;
      drawCanvasText(
        boxCanvas,
        {
          x: 0,
          y: row,
        },
        label + "\u2500".repeat(Math.max(0, layout.width - textDisplayWidth(label))),
      );
      return;
    }
    case "note": {
      drawCanvasBox(boxCanvas, noteBox(step, layout, row), step.text, false);
      return;
    }
    case "message": {
      let from = layout.centers[step.from] ?? 0;
      let to = layout.centers[step.to] ?? 0;
      let textRow = row + step.text.length;
      let lineChar = step.line === "dotted" ? "\u2504" : "\u2500";
      if (step.from === step.to) {
        step.text.forEach((line, index) => {
          drawCanvasText(
            boxCanvas,
            {
              x: from + 2,
              y: row + index,
            },
            line,
          );
        });
        let points = [];
        for (let x = from; x <= from + EDGE_LABEL_OFFSET; x++)
          points.push({
            x,
            y: textRow,
          });
        for (let k = from + EDGE_LABEL_OFFSET; k > from; k--)
          points.push({
            x: k,
            y: textRow + 1,
          });
        linkPath(boxCanvas, points, step.line);
        drawCanvasText(
          boxCanvas,
          {
            x: from,
            y: textRow,
          },
          "\u251C",
        );
        drawCanvasText(
          boxCanvas,
          {
            x: from + 1,
            y: textRow + 1,
          },
          arrowHead(step.head, false, lineChar),
        );
        return;
      }
      let min = Math.min(from, to);
      let span = Math.abs(to - from) - 1;
      step.text.forEach((line, index) => {
        drawCanvasText(
          boxCanvas,
          {
            x: min + 1 + Math.floor((span - textDisplayWidth(line)) / 2),
            y: row + index,
          },
          line,
        );
      });
      let isRightward = to > from;
      drawCanvasText(
        boxCanvas,
        {
          x: from,
          y: textRow,
        },
        isRightward ? "\u251C" : "\u2524",
      );
      drawCanvasText(
        boxCanvas,
        {
          x: min + 1,
          y: textRow,
        },
        lineChar.repeat(span),
      );
      drawCanvasText(
        boxCanvas,
        {
          x: isRightward ? to - 1 : to + 1,
          y: textRow,
        },
        arrowHead(step.head, isRightward, lineChar),
      );
    }
  }
}
//@ chunk-q80fh8vc.js:22767-22907 placement
/**
 * 时序图箭头头部字符。
 */
function arrowHead(head, isRightward, lineChar) {
  switch (head) {
    case "arrow":
      return isRightward ? "\u25B6" : "\u25C0";
    case "async":
      return isRightward ? ">" : "<";
    case "cross":
      return "x";
    case "open":
      return lineChar;
  }
}
//@ chunk-q80fh8vc.js:22907-23048 placement
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
//@ chunk-q80fh8vc.js:23048-23104 placement
/**
 * 最宽的字符串
 */
function widest(texts) {
  return texts.reduce((acc, text) => (textDisplayWidth(text) > textDisplayWidth(acc) ? text : acc), "");
}
//@ chunk-q80fh8vc.js:23104-23387 placement
/**
 * 注释框的位置与大小。
 */
function noteBox(step, layout, row) {
  let from = layout.centers[step.first] ?? 0;
  let to = layout.centers[step.last] ?? 0;
  let minWidth = textDisplayWidth(widest(step.text)) + 4;
  let width =
    step.placement === "over" && step.first !== step.last ? Math.max(minWidth, to - from + 5) : minWidth;
  return {
    x:
      step.placement === "left"
        ? from - 1 - width
        : step.placement === "right"
          ? from + 2
          : Math.floor((from + to) / 2) - Math.floor(width / 2),
    y: row,
    width,
    height: step.text.length + 2,
  };
}
//@ chunk-q80fh8vc.js:23387-24398 placement
function measureSequenceDiagram(diagram) {
  let mapped = diagram.participants.map((participant) => textDisplayWidth(widest(participant)) + 4);
  let spacing = {
    gaps: mapped
      .slice(1)
      .map((width, index) => Math.ceil((mapped[index] ?? 0) / 2) + Math.ceil(width / 2) + 2),
    leftRoom: Math.floor((mapped[0] ?? 0) / 2),
    rightRoom: Math.ceil((mapped.at(-1) ?? 0) / 2),
  };
  let maxFrameWidth = 0;
  for (let step of diagram.steps) {
    let textWidth = step.kind === "frame" ? 0 : textDisplayWidth(widest(step.text));
    if (step.kind === "frame") maxFrameWidth = Math.max(maxFrameWidth, textDisplayWidth(step.label) + 6);
    else if (step.kind === "message" && step.from === step.to)
      reserveGap(spacing, step.from, Math.max(textWidth + 2, EDGE_LABEL_OFFSET + 1));
    else if (step.kind === "message")
      widenGapsForSpan(spacing, Math.min(step.from, step.to), Math.max(step.from, step.to), textWidth + 4);
    else if (step.placement === "left") reserveGap(spacing, step.first - 1, textWidth + 5);
    else if (step.placement === "right") reserveGap(spacing, step.first, textWidth + 6);
    else if (step.first === step.last) {
      reserveGap(spacing, step.first - 1, Math.ceil((textWidth + 4) / 2) + 1);
      reserveGap(spacing, step.first, Math.ceil((textWidth + 4) / 2) + 1);
    } else {
      widenGapsForSpan(spacing, step.first, step.last, textWidth);
      reserveGap(spacing, step.first - 1, 2);
      reserveGap(spacing, step.last, 2);
    }
  }
  let centers = [spacing.leftRoom];
  for (let gap of spacing.gaps) centers.push((centers.at(-1) ?? 0) + gap);
  let max = Math.max(maxFrameWidth, (centers.at(-1) ?? 0) + spacing.rightRoom + 1);
  let flattened = diagram.steps.flatMap((step) =>
    step.kind === "note"
      ? [
          noteBox(
            step,
            {
              centers,
              width: max,
            },
            0,
          ),
        ]
      : [],
  );
  let max_2 = Math.max(0, ...flattened.map((box) => -box.x));
  return {
    centers: centers.map((x) => x + max_2),
    width: Math.max(max + max_2, ...flattened.map((box) => box.x + max_2 + box.width)),
  };
}
//@ chunk-q80fh8vc.js:24398-24560 placement
/**
 * 为参与者间隙或两侧预留宽度。
 */
function reserveGap(spacing, gapIndex, width) {
  if (gapIndex < 0) spacing.leftRoom = Math.max(spacing.leftRoom, width);
  else if (gapIndex >= spacing.gaps.length) spacing.rightRoom = Math.max(spacing.rightRoom, width);
  else spacing.gaps[gapIndex] = Math.max(spacing.gaps[gapIndex] ?? 0, width + 1);
}
//@ chunk-q80fh8vc.js:24560-24671 placement
/**
 * 跨多个参与者的内容不够宽时加宽最后一个间隙。
 */
function widenGapsForSpan(spacing, from, to, width) {
  let reduced = spacing.gaps.slice(from, to).reduce((acc, gap) => acc + gap, 0);
  spacing.gaps[to - 1] = (spacing.gaps[to - 1] ?? 0) + Math.max(0, width - reduced);
}
//@ chunk-q80fh8vc.js:24671-25124 placement
/**
 * mermaid 时序图解析：Ct 是消息箭头写法表（写法 → 线型 + 箭头形状）；Dt 是 participant/actor 行正则；He 是 " as " 关键字；Rt/Ot/We/_t/Lt 是注记、激活/停用、分组、else/and/option、方向标记的正则；Nt/It 是参与方与步骤数上限（50/400）。
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
var SEQUENCE_PARTICIPANT_RE = /^(?:participant|actor)\s+(\S.*)$/;
var SEQUENCE_PARTICIPANT_KEYWORD = " as ";
var SEQUENCE_NOTE_RE = /^note\s+(over|left of|right of)\s+(\S[^:]*):(.*)$/i;
var SEQUENCE_BLOCK_RE = /^(?:activate|deactivate)\s+(\S.*)$/;
var SEQUENCE_MESSAGE_RE = /^(?:loop|alt|opt|par|critical|break)(?:\s|$)/;
var SEQUENCE_ACTIVATION_RE = /^(?:else|and|option)(?:\s|$)/;
var SEQUENCE_DIRECTION_RE = /[<>:]/;
var MAX_SEQUENCE_TITLE_CHARS = 50;
var MAX_SEQUENCE_STEPS = 400;
//@ chunk-q80fh8vc.js:25124-25553 placement
/**
 * 解析 mermaid sequenceDiagram 源码为参与者与步骤列表，超出规模限制返回 undefined。
 */
function parseSequenceDiagram(lines) {
  let diagram = {
    participants: [],
    steps: [],
    ids: [],
    depth: 0,
    isNumbered: false,
    hiddenCells: 0,
  };
  for (let line of lines.slice(1)) {
    let sequenceLine = parseSequenceLine(diagram, line);
    let fits =
      diagram.ids.length <= MAX_SEQUENCE_TITLE_CHARS &&
      diagram.steps.length <= MAX_SEQUENCE_STEPS &&
      diagram.hiddenCells <= MAX_CELL_WIDTH;
    if (!sequenceLine || !fits) return;
  }
  if (diagram.depth !== 0 || diagram.ids.length === 0) return;
  let counter = 0;
  let steps = diagram.steps.map((step) => {
    if (step.kind !== "message" || !diagram.isNumbered) return step;
    counter++;
    let [firstLine = "", ...rest] = step.text;
    return {
      ...step,
      text: [`${counter}. ${firstLine}`, ...rest],
    };
  });
  return {
    participants: diagram.participants,
    steps,
  };
}
//@ chunk-q80fh8vc.js:25553-26390 placement
function parseSequenceLine(diagram, line) {
  if (line === "autonumber") {
    diagram.isNumbered = true;
    return true;
  }
  if (line === "end") {
    diagram.depth--;
    diagram.steps.push({
      kind: "frame",
      label: "end",
    });
    return diagram.depth >= 0;
  }
  if (SEQUENCE_MESSAGE_RE.test(line) || SEQUENCE_ACTIVATION_RE.test(line)) {
    diagram.depth += SEQUENCE_MESSAGE_RE.test(line) ? 1 : 0;
    diagram.steps.push({
      kind: "frame",
      label: parseLabelLines(line).join(" "),
    });
    return diagram.depth > 0;
  }
  let head = SEQUENCE_PARTICIPANT_RE.exec(line)?.[1];
  if (head !== undefined) {
    let index = head.indexOf(SEQUENCE_PARTICIPANT_KEYWORD);
    let id = index < 0 ? head : head.slice(0, index);
    let tokens = parseLabelLines(index < 0 ? head : head.slice(index + SEQUENCE_PARTICIPANT_KEYWORD.length));
    let isNew = !diagram.ids.includes(id.trim());
    diagram.hiddenCells += identifierWidth(id.trim(), tokens);
    return isNew && participantIndex(diagram, id, tokens) >= 0;
  }
  let id = SEQUENCE_BLOCK_RE.exec(line)?.[1];
  if (id !== undefined) return diagram.ids.includes(id.trim());
  let match = SEQUENCE_NOTE_RE.exec(line);
  if (match) {
    let [, placement = "", ids = "", text = ""] = match;
    let mapped = ids.split(",").map((id) => participantIndex(diagram, id));
    let isOver = placement.toLowerCase() === "over";
    if (mapped.includes(-1) || mapped.length > (isOver ? 2 : 1)) return false;
    diagram.steps.push({
      kind: "note",
      placement: isOver ? "over" : placement.toLowerCase() === "left of" ? "left" : "right",
      first: Math.min(...mapped),
      last: Math.max(...mapped),
      text: parseLabelLines(text),
    });
    return true;
  }
  return parseSequenceMessage(diagram, line);
}
//@ chunk-q80fh8vc.js:26390-26798 placement
function parseSequenceMessage(diagram, line) {
  let index = line.indexOf(":");
  let head = index < 0 ? "" : line.slice(0, index);
  let arrowIndex = -1;
  let arrowKind;
  for (let index = head.indexOf("-"); index >= 0 && !arrowKind;) {
    arrowKind = SEQUENCE_ARROW_KINDS.find(([pattern]) => head.startsWith(pattern, index));
    arrowIndex = index;
    index = head.indexOf("-", index + 1);
  }
  if (!arrowKind) return false;
  let [patternLength, lineKind, headKind] = arrowKind;
  let trimmed = head.slice(arrowIndex + patternLength.length).trim();
  let from = participantIndex(diagram, head.slice(0, arrowIndex));
  let to = participantIndex(
    diagram,
    trimmed.startsWith("+") || trimmed.startsWith("-") ? trimmed.slice(1) : trimmed,
  );
  if (from < 0 || to < 0) return false;
  diagram.steps.push({
    kind: "message",
    from,
    to,
    text: parseLabelLines(line.slice(index + 1)),
    line: lineKind,
    head: headKind,
  });
  return true;
}
//@ chunk-q80fh8vc.js:26798-26968 placement
/**
 * 取或登记参与者，返回下标（非法名返回 -1）。
 */
function participantIndex(diagram, id, labelLines) {
  let trimmed = id.trim();
  if (trimmed === "" || SEQUENCE_DIRECTION_RE.test(trimmed)) return -1;
  let index = diagram.ids.indexOf(trimmed);
  if (index >= 0) return index;
  diagram.ids.push(trimmed);
  diagram.participants.push(labelLines ?? parseLabelLines(trimmed));
  return diagram.ids.length - 1;
}
//@ chunk-q80fh8vc.js:26968-27375 placement
function splitMermaidStatements(source) {
  let statements = [];
  for (let line of source.split(`
`)) {
    let trimmed = line.trim();
    if (trimmed.startsWith("%%")) {
      if (trimmed !== "%%") return;
      continue;
    }
    let depth = 0;
    let inQuote = false;
    let start = 0;
    for (let k = 0; k < trimmed.length; k++) {
      let char = trimmed[k];
      if (char === '"') inQuote = !inQuote;
      else if (!inQuote && (char === "[" || char === "(" || char === "{")) depth++;
      else if (!inQuote && (char === "]" || char === ")" || char === "}")) depth = Math.max(0, depth - 1);
      else if (!inQuote && depth === 0 && char === ";") {
        statements.push(trimmed.slice(start, k).trim());
        start = k + 1;
      }
    }
    statements.push(trimmed.slice(start).trim());
  }
  return statements.filter((statement) => statement !== "");
}
export { splitMermaidStatements, parseSequenceDiagram, drawSequenceDiagram };
