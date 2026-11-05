/**
 * plugins/bundled/modsGuide/clawdCooking.tsx
 *
 * 2.1.316 新增。内置插件 modsGuide 的 Clawd 动画/引导界面。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-y4bgqkdt.js (59)
 * attribution: placement 59
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __export } from "../../../../runtime/bun-runtime.js";
import { register } from "./index.js";
import { isScreenReaderMode } from "../../../utils/accessibility/screenReader.js";
import { getFeatureValue_SESSION_PINNED } from "../../../services/analytics/growthbook.js";

//@ chunk-y4bgqkdt.js:4156-4165 placement
var clawdCookingNamespace = {};
//@ chunk-y4bgqkdt.js:4165-5110 placement
__export(clawdCookingNamespace, {
  BLINK_FRAME: () => BLINK_FRAME,
  BUBBLES: () => BUBBLES,
  BUBBLES_AT: () => BUBBLES_AT,
  CARD_INSET: () => CARD_INSET,
  CELL_WORDS: () => CELL_WORDS,
  CLAWD_AT: () => CLAWD_AT,
  CLAWD_COOKING_STILL_SVG: () => CLAWD_COOKING_STILL_SVG,
  CLAWD_COOKING_SVG: () => CLAWD_COOKING_SVG,
  CLAWD_POSES: () => CLAWD_POSES,
  COUNTER: () => COUNTER,
  COUNTER_AT: () => COUNTER_AT,
  ENGINE_ASK_ID: () => ENGINE_ASK_ID,
  FLAMES: () => FLAMES,
  FLAMES_AT: () => FLAMES_AT,
  FRAME_COUNT: () => FRAME_COUNT,
  FRAME_MS: () => FRAME_MS,
  HEADING: () => HEADING,
  LOWER_HALF: () => LOWER_HALF,
  MISSED_FRAMES_MAX: () => MISSED_FRAMES_MAX,
  MOVING_COLUMNS_MIN: () => MOVING_COLUMNS_MIN,
  PALETTE: () => PALETTE,
  PANEL_ROWS_MIN: () => PANEL_ROWS_MIN,
  PIXEL_ROWS: () => PIXEL_ROWS,
  PLAY_FRAMES: () => PLAY_FRAMES,
  POSES: () => POSES,
  POT: () => POT,
  POT_AT: () => POT_AT,
  PUFFS: () => PUFFS,
  PUFF_STARTS: () => PUFF_STARTS,
  PUFF_TRACK: () => PUFF_TRACK,
  RUN_MS_MAX: () => RUN_MS_MAX,
  SCENE_ALT: () => SCENE_ALT,
  SCENE_COLUMNS: () => SCENE_COLUMNS,
  SCENE_KEY: () => SCENE_KEY,
  SCENE_ROWS: () => SCENE_ROWS,
  SPACE: () => SPACE,
  SPOON: () => SPOON,
  SVG_WIDTH: () => SVG_WIDTH,
  TERMINAL_DEFAULT: () => TERMINAL_DEFAULT,
  UNMEASURED_COLUMNS: () => UNMEASURED_COLUMNS,
  UPPER_HALF: () => UPPER_HALF,
  blankGrid: () => blankGrid,
  cellsOf: () => cellsOf,
  default: () => clawdCookingNamespace,
  frameOf: () => frameOf,
  isExplained: () => isExplained,
  isPlainTerminal: () => isPlainTerminal,
  playScene: () => playScene,
  plot: () => plot,
  put: () => put,
  register: () => register,
  remoteGuide: () => remoteGuide,
  stamp: () => stamp,
  terminalGuide: () => terminalGuide,
});
//@ chunk-y4bgqkdt.js:5110-5140 placement
var availabilityFlag = () => "tengu_linen_acorn";
//@ chunk-y4bgqkdt.js:5140-5149 placement
var isOnByDefault = false;
//@ chunk-y4bgqkdt.js:5149-5176 placement
var isAvailable = () =>
  !isScreenReaderMode() && getFeatureValue_SESSION_PINNED(availabilityFlag(), isOnByDefault);
//@ chunk-y4bgqkdt.js:5176-5326 placement
var PLUGIN_DESCRIPTION =
  "How mods work: asked how hot reloading works, the question card gets a small panel over it with Clawd cooking, gone once the card is answered";
//@ chunk-y4bgqkdt.js:5326-5355 placement
var PLUGIN_NAME = "cc-plugin-mods-guide";
//@ chunk-y4bgqkdt.js:5355-5373 placement
var ENGINE_ASK_ID = /^confirm_/;
//@ chunk-y4bgqkdt.js:5373-5559 placement
function isExplained(questions) {
  let [first] = questions;
  let question = typeof first === "object" && first !== null ? Reflect.get(first, "question") : undefined;
  if (typeof question !== "string") return false;
  let [, ...rest] = question.split(`

`);
  return rest
    .join(
      `

`,
    )
    .trim().includes(`
`);
}
//@ chunk-y4bgqkdt.js:5559-5567 placement
var MISSED_FRAMES_MAX = 6;
//@ chunk-y4bgqkdt.js:5567-5577 placement
var PLAY_FRAMES = 256;
//@ chunk-y4bgqkdt.js:5577-5589 placement
var RUN_MS_MAX = 45000;
//@ chunk-y4bgqkdt.js:5589-5597 placement
var CELL_WORDS = 3;
//@ chunk-y4bgqkdt.js:5597-5608 placement
var LOWER_HALF = 9604;
//@ chunk-y4bgqkdt.js:5608-5617 placement
var SPACE = 32;
//@ chunk-y4bgqkdt.js:5617-5632 placement
var TERMINAL_DEFAULT = 16777216;
//@ chunk-y4bgqkdt.js:5632-5644 placement
var UPPER_HALF = 9600;
//@ chunk-y4bgqkdt.js:5644-5779 placement
var PALETTE = {
  C: 14120791,
  E: 1315860,
  P: 6253434,
  R: 9740464,
  H: 4608352,
  S: 15316044,
  W: 12488284,
  s: 10134445,
  F: 16096779,
  f: 15680580,
  y: 16638023,
  G: 7041664,
};
//@ chunk-y4bgqkdt.js:5779-5788 placement
var FRAME_COUNT = 16;
//@ chunk-y4bgqkdt.js:5788-5799 placement
var FRAME_MS = 160;
//@ chunk-y4bgqkdt.js:5799-5809 placement
var PIXEL_ROWS = 18;
//@ chunk-y4bgqkdt.js:5809-5818 placement
var SCENE_COLUMNS = 44;
//@ chunk-y4bgqkdt.js:5818-5826 placement
var SCENE_ROWS = 9;
//@ chunk-y4bgqkdt.js:5826-6110 placement
function cellsOf(scene) {
  let uint32Array = new Uint32Array(SCENE_COLUMNS * SCENE_ROWS * CELL_WORDS);
  for (let idx = 0; idx < SCENE_ROWS; idx++)
    for (let idx_2 = 0; idx_2 < SCENE_COLUMNS; idx_2++) {
      let top = PALETTE[scene[idx + idx]?.[idx_2] ?? "."];
      let bottom = PALETTE[scene[idx + idx + 1]?.[idx_2] ?? "."];
      let bothBlank = top === undefined && bottom === undefined;
      let onlyBottom = top === undefined && bottom !== undefined;
      uint32Array.set(
        [
          bothBlank ? SPACE : onlyBottom ? LOWER_HALF : UPPER_HALF,
          (onlyBottom ? bottom : top) ?? TERMINAL_DEFAULT,
          (onlyBottom ? undefined : bottom) ?? TERMINAL_DEFAULT,
        ],
        (idx * SCENE_COLUMNS + idx_2) * CELL_WORDS,
      );
    }
  return new Uint8Array(uint32Array.buffer).toBase64();
}
//@ chunk-y4bgqkdt.js:6110-6182 placement
var blankGrid = (columns, rows) =>
  Array.from(
    {
      length: rows,
    },
    () =>
      Array.from(
        {
          length: columns,
        },
        () => ".",
      ),
  );
//@ chunk-y4bgqkdt.js:6182-6257 placement
function put(grid, point, letter) {
  let [x, y] = point;
  let row = grid[y];
  if (row !== undefined && x >= 0 && x < row.length) row[x] = letter;
}
//@ chunk-y4bgqkdt.js:6257-6462 placement
function plot(grid, line) {
  let [endX, endY] = line.end;
  let [startX, startY] = line.start;
  let dx = Math.abs(endX - startX);
  let dy = -Math.abs(endY - startY);
  let stepX = startX < endX ? 1 : -1;
  let stepY = startY < endY ? 1 : -1;
  let error = dx + dy;
  for (;;) {
    put(grid, [startX, startY], line.letter);
    if (startX === endX && startY === endY) return;
    let doubled = 2 * error;
    if (doubled >= dy) {
      error += dy;
      startX += stepX;
    }
    if (doubled <= dx) {
      error += dx;
      startY += stepY;
    }
  }
}
//@ chunk-y4bgqkdt.js:6462-6577 placement
function stamp(grid, sprite, at) {
  let [originX, originY] = at;
  for (let [rowOffset, row] of sprite.entries())
    for (let [column, char] of [...row].entries())
      if (char !== ".") put(grid, [originX + column, originY + rowOffset], char);
}
//@ chunk-y4bgqkdt.js:6577-6591 placement
var BUBBLES_AT = [23, 8];
//@ chunk-y4bgqkdt.js:6591-6604 placement
var CLAWD_AT = [1, 3];
//@ chunk-y4bgqkdt.js:6604-6618 placement
var COUNTER_AT = [0, 17];
//@ chunk-y4bgqkdt.js:6618-6633 placement
var FLAMES_AT = [26, 15];
//@ chunk-y4bgqkdt.js:6633-6646 placement
var POT_AT = [23, 9];
//@ chunk-y4bgqkdt.js:6646-7387 placement
var CLAWD_POSES = [
  [
    ".......................",
    ".....................CC",
    "....................CCC",
    "...................CCC.",
    "...CCCCCCCCCCCCC..CCC..",
    "...CCCCCCCCCCCCC.CCC...",
    "...CCCECCCCCCCECCCC....",
    "...CCCECCCCCCCECCC.....",
    ".CCCCCCCCCCCCCCC.......",
    ".CCCCCCCCCCCCCCC.......",
    "...CCCCCCCCCCCCC.......",
    "...CCCCCCCCCCCCC.......",
    "...C.C.......C.C.......",
    "...C.C.......C.C.......",
  ],
  [
    ".....................CC",
    "....................CCC",
    "...................CCC.",
    "..................CCC..",
    "...CCCCCCCCCCCCC..CC...",
    "...CCCCCCCCCCCCC.CC....",
    "...CCCECCCCCCCECCCC....",
    "...CCCECCCCCCCECCC.....",
    ".CCCCCCCCCCCCCCC.......",
    ".CCCCCCCCCCCCCCC.......",
    "...CCCCCCCCCCCCC.......",
    "...CCCCCCCCCCCCC.......",
    "...C.C.......C.C.......",
    "...C.C.......C.C.......",
  ],
];
//@ chunk-y4bgqkdt.js:7387-7443 placement
var COUNTER = ["GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG"];
//@ chunk-y4bgqkdt.js:7443-7578 placement
var POT = [
  "RRSSSSSSSSSSSSSSRR",
  ".RPPPPPPPPPPPPPPH.",
  "RRPPPPPPPPPPPPPPHR",
  ".RPPPPPPPPPPPPPPH.",
  ".RPPPPPPPPPPPPPPH.",
  "..PPPPPPPPPPPPPH..",
];
//@ chunk-y4bgqkdt.js:7578-7655 placement
var PUFFS = [[".ss.", "ssss", ".ss."], [".ss.", "ssss"], ["sss.", ".ss."], ["ss"], ["s"]];
//@ chunk-y4bgqkdt.js:7655-7664 placement
var BLINK_FRAME = 9;
//@ chunk-y4bgqkdt.js:7664-8009 placement
var BUBBLES = [
  "....S.............",
  "....S.............",
  "..................",
  ".........S........",
  ".........S........",
  "..................",
  ".............S....",
  ".............S....",
  "....S.............",
  "....S.............",
  "..................",
  ".........S........",
  ".........S........",
  "..................",
  ".............S....",
  ".............S....",
];
//@ chunk-y4bgqkdt.js:8009-8530 placement
var FLAMES = [
  ["..F.y..y.F..", "FfFfFfFfFfFf"],
  ["y..y.F..F.F.", "fFfFfFfFfFfF"],
  [".F..F.F..F.y", "FfFfFfFfFfFf"],
  ["F.F..F.y..y.", "fFfFfFfFfFfF"],
  [".F.y..y.F..F", "FfFfFfFfFfFf"],
  ["..y.F..F.F..", "fFfFfFfFfFfF"],
  ["F..F.F..F.y.", "FfFfFfFfFfFf"],
  [".F..F.y..y.F", "fFfFfFfFfFfF"],
  ["F.y..y.F..F.", "FfFfFfFfFfFf"],
  [".y.F..F.F..F", "fFfFfFfFfFfF"],
  ["..F.F..F.y..", "FfFfFfFfFfFf"],
  ["F..F.y..y.F.", "fFfFfFfFfFfF"],
  [".y..y.F..F.F", "FfFfFfFfFfFf"],
  ["y.F..F.F..F.", "fFfFfFfFfFfF"],
  [".F.F..F.y..y", "FfFfFfFfFfFf"],
  ["..F.y..y.F..", "fFfFfFfFfFfF"],
];
//@ chunk-y4bgqkdt.js:8530-8571 placement
var POSES = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0];
//@ chunk-y4bgqkdt.js:8571-8609 placement
var PUFF_STARTS = [
  [26, 0],
  [30, 4],
  [34, 8],
  [37, 12],
];
//@ chunk-y4bgqkdt.js:8609-8733 placement
var PUFF_TRACK = [
  [0, 0, 0],
  [0, 0, 0],
  [1, 1, 0],
  [1, 1, 0],
  [1, 2, 1],
  [2, 3, 1],
  [1, 4, 1],
  [1, 5, 2],
  [0, 6, 2],
  [-1, 7, 2],
  [-1, 8, 3],
  [-1, 8, 3],
  [0, 9, 4],
  [0, 9, 4],
];
//@ chunk-y4bgqkdt.js:8733-8997 placement
var SPOON = [
  [
    [19, 3],
    [35, 9],
  ],
  [
    [19, 3],
    [35, 9],
  ],
  [
    [19, 3],
    [34, 9],
  ],
  [
    [19, 3],
    [33, 9],
  ],
  [
    [19, 3],
    [31, 9],
  ],
  [
    [20, 1],
    [29, 9],
  ],
  [
    [20, 1],
    [28, 9],
  ],
  [
    [20, 1],
    [27, 9],
  ],
  [
    [20, 1],
    [27, 9],
  ],
  [
    [20, 1],
    [27, 9],
  ],
  [
    [20, 1],
    [28, 9],
  ],
  [
    [20, 1],
    [29, 9],
  ],
  [
    [19, 3],
    [31, 9],
  ],
  [
    [19, 3],
    [33, 9],
  ],
  [
    [19, 3],
    [34, 9],
  ],
  [
    [19, 3],
    [35, 9],
  ],
];
//@ chunk-y4bgqkdt.js:8997-9359 placement
function frameOf(frameIndex) {
  let frame = frameIndex % FRAME_COUNT;
  let grid = blankGrid(SCENE_COLUMNS, PIXEL_ROWS);
  let [, potY] = POT_AT;
  stamp(grid, COUNTER, COUNTER_AT);
  stamp(grid, FLAMES[frame] ?? [], FLAMES_AT);
  for (let [x_2, offset] of PUFF_STARTS) {
    let puff = PUFF_TRACK[(frame + offset) % FRAME_COUNT];
    if (puff !== undefined) {
      let [dx, rise, puffIndex] = puff;
      let sprite = PUFFS[puffIndex] ?? [];
      stamp(grid, sprite, [x_2 + dx, potY - rise - sprite.length]);
    }
  }
  let [from, to] = SPOON[frame] ?? SPOON[0];
  plot(grid, {
    start: from,
    end: to,
    letter: "W",
  });
  stamp(grid, POT, POT_AT);
  stamp(grid, [BUBBLES[frame] ?? ""], BUBBLES_AT);
  let pose = CLAWD_POSES[POSES[frame] ?? 0];
  let poseForFrame = frame === BLINK_FRAME ? pose.map((line) => line.replaceAll("E", "C")) : pose;
  stamp(grid, poseForFrame, CLAWD_AT);
  return grid.map((line) => line.join(""));
}
//@ chunk-y4bgqkdt.js:9359-9514 placement
function playScene(screen, every) {
  let frameCount = 0;
  let missed = 0;
  let timer = every(FRAME_MS, () => void tick());
  async function tick() {
    frameCount += 1;
    missed = (await screen.paint(cellsOf(frameOf(frameCount))).catch(() => false)) ? 0 : missed + 1;
    if (frameCount >= PLAY_FRAMES || missed >= MISSED_FRAMES_MAX) {
      timer.cancel();
      screen.ended();
    }
  }
}
//@ chunk-y4bgqkdt.js:9514-9598 placement
var isPlainTerminal = (env) =>
  (env.noColor !== undefined && env.noColor !== "") || env.forceColor === "0" || env.term === "dumb";
//@ chunk-y4bgqkdt.js:9598-12956 placement
var CLAWD_COOKING_STILL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 352 144" width="352" height="144" shape-rendering="crispEdges" role="img"><title>Clawd stirs a steaming pot</title><rect x="0" y="136" width="352" height="8" fill="#6b7280"/><g><rect x="208" y="128" width="8" height="8" fill="#f59e0b"/><rect x="224" y="128" width="8" height="8" fill="#f59e0b"/><rect x="240" y="128" width="8" height="8" fill="#f59e0b"/><rect x="256" y="128" width="8" height="8" fill="#f59e0b"/><rect x="272" y="128" width="8" height="8" fill="#f59e0b"/><rect x="288" y="128" width="8" height="8" fill="#f59e0b"/><rect x="216" y="128" width="8" height="8" fill="#ef4444"/><rect x="232" y="128" width="8" height="8" fill="#ef4444"/><rect x="248" y="128" width="8" height="8" fill="#ef4444"/><rect x="264" y="128" width="8" height="8" fill="#ef4444"/><rect x="280" y="128" width="8" height="8" fill="#ef4444"/><rect x="296" y="128" width="8" height="8" fill="#ef4444"/></g><g><rect x="224" y="120" width="8" height="8" fill="#fde047"/><rect x="256" y="120" width="8" height="8" fill="#fde047"/><rect x="280" y="120" width="8" height="8" fill="#fde047"/></g><g opacity="0.85" transform="translate(0 0)"><g transform="translate(208 48)"><path fill="#9aa3ad" d="M8 0h16v8h-16zM0 8h32v8h-32zM8 16h16v8h-16z"/></g></g><g opacity="0.6" transform="translate(-8 -36)"><g transform="translate(240 48)"><path fill="#9aa3ad" d="M8 0h16v8h-16zM0 8h32v8h-32zM8 16h16v8h-16z"/></g></g><g opacity="0.3" transform="translate(-10 -76)"><g transform="translate(272 48)"><path fill="#9aa3ad" d="M8 0h16v8h-16zM0 8h32v8h-32zM8 16h16v8h-16z"/></g></g><g><g><path fill="none" stroke="#be8e5c" stroke-width="8" stroke-linecap="square" d="M161.0 24.8L273.9 91.2"/></g></g><path fill="#94a0b0" d="M184 72h16v8h-16zM312 72h16v8h-16zM192 80h8v8h-8zM184 88h16v8h-16zM320 88h8v8h-8zM192 96h8v8h-8zM192 104h8v8h-8z"/><path fill="#e9b44c" d="M200 72h112v8h-112z"/><path fill="#5f6b7a" d="M200 80h112v8h-112zM200 88h112v8h-112zM200 96h112v8h-112zM200 104h112v8h-112zM200 112h104v8h-104z"/><path fill="#465160" d="M312 80h8v8h-8zM312 88h8v8h-8zM312 96h8v8h-8zM312 104h8v8h-8zM304 112h8v8h-8z"/><rect x="256" y="64" width="8" height="8" fill="#e9b44c"></rect><g><path fill="#d77757" d="M32 56h104v8h-104zM32 64h104v8h-104zM32 72h104v8h-104zM32 80h104v8h-104zM16 88h120v8h-120zM16 96h120v8h-120zM32 104h104v8h-104zM32 112h104v8h-104zM32 120h8v8h-8zM48 120h8v8h-8zM112 120h8v8h-8zM128 120h8v8h-8zM32 128h8v8h-8zM48 128h8v8h-8zM112 128h8v8h-8zM128 128h8v8h-8z"/><rect x="56" y="72" width="8" height="16" fill="#141414"></rect><rect x="120" y="72" width="8" height="16" fill="#141414"></rect><g><rect x="136" y="80" width="16" height="8" fill="#d77757"/><rect x="136" y="72" width="16" height="8" fill="#d77757"/><rect x="144" y="72" width="16" height="8" fill="#d77757"/><rect x="144" y="64" width="16" height="8" fill="#d77757"/><rect x="152" y="64" width="16" height="8" fill="#d77757"/><rect x="152" y="56" width="16" height="8" fill="#d77757"/><rect x="160" y="56" width="16" height="8" fill="#d77757"/><rect x="160" y="48" width="16" height="8" fill="#d77757"/><rect x="168" y="48" width="16" height="8" fill="#d77757"/><rect x="168" y="40" width="16" height="8" fill="#d77757"/><rect x="176" y="40" width="16" height="8" fill="#d77757"/><rect x="176" y="32" width="16" height="8" fill="#d77757"/></g></g></svg>';
//@ chunk-y4bgqkdt.js:12956-19594 placement
var CLAWD_COOKING_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 352 144" width="352" height="144" shape-rendering="crispEdges" role="img"><title>Clawd stirs a steaming pot</title><rect x="0" y="136" width="352" height="8" fill="#6b7280"/><g><rect x="208" y="128" width="8" height="8" fill="#f59e0b"/><rect x="224" y="128" width="8" height="8" fill="#f59e0b"/><rect x="240" y="128" width="8" height="8" fill="#f59e0b"/><rect x="256" y="128" width="8" height="8" fill="#f59e0b"/><rect x="272" y="128" width="8" height="8" fill="#f59e0b"/><rect x="288" y="128" width="8" height="8" fill="#f59e0b"/><rect x="216" y="128" width="8" height="8" fill="#ef4444"/><rect x="232" y="128" width="8" height="8" fill="#ef4444"/><rect x="248" y="128" width="8" height="8" fill="#ef4444"/><rect x="264" y="128" width="8" height="8" fill="#ef4444"/><rect x="280" y="128" width="8" height="8" fill="#ef4444"/><rect x="296" y="128" width="8" height="8" fill="#ef4444"/></g><g><rect x="224" y="120" width="8" height="8" fill="#fde047"/><rect x="256" y="120" width="8" height="8" fill="#fde047"/><rect x="280" y="120" width="8" height="8" fill="#fde047"/><animate attributeName="opacity" values="1;0;1" dur=".5s" repeatCount="indefinite"/></g><g opacity="0"><rect x="216" y="120" width="8" height="8" fill="#f59e0b"/><rect x="240" y="120" width="8" height="8" fill="#f59e0b"/><rect x="272" y="120" width="8" height="8" fill="#f59e0b"/><rect x="288" y="120" width="8" height="8" fill="#f59e0b"/><animate attributeName="opacity" values="0;1;0" dur=".5s" repeatCount="indefinite"/></g><g opacity="0"><g transform="translate(208 48)"><path fill="#9aa3ad" d="M8 0h16v8h-16zM0 8h32v8h-32zM8 16h16v8h-16z"/></g><animateTransform attributeName="transform" type="translate" values="0 0;6 -36;-6 -76" dur="2.6s" begin="-0.00s" repeatCount="indefinite" calcMode="spline" keySplines=".3 0 .7 1;.3 0 .7 1"/><animate attributeName="opacity" values="0;.85;.6;0" keyTimes="0;.2;.6;1" dur="2.6s" begin="-0.00s" repeatCount="indefinite"/></g><g opacity="0"><g transform="translate(240 48)"><path fill="#9aa3ad" d="M8 0h16v8h-16zM0 8h32v8h-32zM8 16h16v8h-16z"/></g><animateTransform attributeName="transform" type="translate" values="0 0;-8 -36;8 -76" dur="2.6s" begin="-0.65s" repeatCount="indefinite" calcMode="spline" keySplines=".3 0 .7 1;.3 0 .7 1"/><animate attributeName="opacity" values="0;.85;.6;0" keyTimes="0;.2;.6;1" dur="2.6s" begin="-0.65s" repeatCount="indefinite"/></g><g opacity="0"><g transform="translate(272 48)"><path fill="#9aa3ad" d="M8 0h16v8h-16zM0 8h32v8h-32zM8 16h16v8h-16z"/></g><animateTransform attributeName="transform" type="translate" values="0 0;10 -36;-10 -76" dur="2.6s" begin="-1.30s" repeatCount="indefinite" calcMode="spline" keySplines=".3 0 .7 1;.3 0 .7 1"/><animate attributeName="opacity" values="0;.85;.6;0" keyTimes="0;.2;.6;1" dur="2.6s" begin="-1.30s" repeatCount="indefinite"/></g><g opacity="0"><g transform="translate(296 48)"><path fill="#9aa3ad" d="M8 0h16v8h-16zM0 8h32v8h-32zM8 16h16v8h-16z"/></g><animateTransform attributeName="transform" type="translate" values="0 0;-6 -36;6 -76" dur="2.6s" begin="-1.95s" repeatCount="indefinite" calcMode="spline" keySplines=".3 0 .7 1;.3 0 .7 1"/><animate attributeName="opacity" values="0;.85;.6;0" keyTimes="0;.2;.6;1" dur="2.6s" begin="-1.95s" repeatCount="indefinite"/></g><g><g><path fill="none" stroke="#be8e5c" stroke-width="8" stroke-linecap="square" d="M161.0 24.8L273.9 91.2"/><animateTransform attributeName="transform" type="rotate" values="12 180 36;-13 180 36;12 180 36" dur="2.6s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/></g><animateTransform attributeName="transform" type="translate" values="0 0;0 2;0 0;0 2;0 0" dur="2.6s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1;.45 0 .55 1;.45 0 .55 1"/></g><path fill="#94a0b0" d="M184 72h16v8h-16zM312 72h16v8h-16zM192 80h8v8h-8zM184 88h16v8h-16zM320 88h8v8h-8zM192 96h8v8h-8zM192 104h8v8h-8z"/><path fill="#e9b44c" d="M200 72h112v8h-112z"/><path fill="#5f6b7a" d="M200 80h112v8h-112zM200 88h112v8h-112zM200 96h112v8h-112zM200 104h112v8h-112zM200 112h104v8h-104z"/><path fill="#465160" d="M312 80h8v8h-8zM312 88h8v8h-8zM312 96h8v8h-8zM312 104h8v8h-8zM304 112h8v8h-8z"/><rect x="216" y="64" width="8" height="8" fill="#e9b44c" opacity="0"><animate attributeName="opacity" values="0;0;1;0" keyTimes="0;.6;.8;1" dur="1.3s" begin="-0.00s" repeatCount="indefinite"/></rect><rect x="256" y="64" width="8" height="8" fill="#e9b44c" opacity="0"><animate attributeName="opacity" values="0;0;1;0" keyTimes="0;.6;.8;1" dur="1.3s" begin="-0.45s" repeatCount="indefinite"/></rect><rect x="288" y="64" width="8" height="8" fill="#e9b44c" opacity="0"><animate attributeName="opacity" values="0;0;1;0" keyTimes="0;.6;.8;1" dur="1.3s" begin="-0.90s" repeatCount="indefinite"/></rect><g><path fill="#d77757" d="M32 56h104v8h-104zM32 64h104v8h-104zM32 72h104v8h-104zM32 80h104v8h-104zM16 88h120v8h-120zM16 96h120v8h-120zM32 104h104v8h-104zM32 112h104v8h-104zM32 120h8v8h-8zM48 120h8v8h-8zM112 120h8v8h-8zM128 120h8v8h-8zM32 128h8v8h-8zM48 128h8v8h-8zM112 128h8v8h-8zM128 128h8v8h-8z"/><rect x="56" y="72" width="8" height="16" fill="#141414"><animate attributeName="height" values="16;16;0;16;16" keyTimes="0;.55;.58;.62;1" dur="2.6s" repeatCount="indefinite"/></rect><rect x="120" y="72" width="8" height="16" fill="#141414"><animate attributeName="height" values="16;16;0;16;16" keyTimes="0;.55;.58;.62;1" dur="2.6s" repeatCount="indefinite"/></rect><g><rect x="136" y="80" width="16" height="8" fill="#d77757"/><rect x="136" y="72" width="16" height="8" fill="#d77757"/><rect x="144" y="72" width="16" height="8" fill="#d77757"/><rect x="144" y="64" width="16" height="8" fill="#d77757"/><rect x="152" y="64" width="16" height="8" fill="#d77757"/><rect x="152" y="56" width="16" height="8" fill="#d77757"/><rect x="160" y="56" width="16" height="8" fill="#d77757"/><rect x="160" y="48" width="16" height="8" fill="#d77757"/><rect x="168" y="48" width="16" height="8" fill="#d77757"/><rect x="168" y="40" width="16" height="8" fill="#d77757"/><rect x="176" y="40" width="16" height="8" fill="#d77757"/><rect x="176" y="32" width="16" height="8" fill="#d77757"/><animateTransform attributeName="transform" type="rotate" values="2 136 88;-2 136 88;2 136 88" dur="2.6s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/></g><animateTransform attributeName="transform" type="translate" values="0 0;0 2;0 0;0 2;0 0" dur="2.6s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1;.45 0 .55 1;.45 0 .55 1"/></g></svg>';
//@ chunk-y4bgqkdt.js:19594-19616 placement
var HEADING = "How mods work";
//@ chunk-y4bgqkdt.js:19616-19652 placement
var SCENE_ALT = "Clawd stirs a steaming pot";
//@ chunk-y4bgqkdt.js:19652-19674 placement
var SCENE_KEY = "clawd-cooking";
//@ chunk-y4bgqkdt.js:19674-19685 placement
var SVG_WIDTH = 440;
//@ chunk-y4bgqkdt.js:19685-19886 placement
function remoteGuide(ui, content, isStill) {
  let { Box, Svg, Text } = ui;
  return h(
    Box,
    {
      flexDirection: "column",
    },
    h(
      Box,
      {
        flexDirection: "column",
        marginBottom: 1,
      },
      h(
        Text,
        {
          bold: true,
        },
        HEADING,
      ),
      h(Svg, {
        source: isStill ? CLAWD_COOKING_STILL_SVG : CLAWD_COOKING_SVG,
        alt: SCENE_ALT,
        width: SVG_WIDTH,
        isInteractive: !isStill,
      }),
    ),
    content,
  );
}
//@ chunk-y4bgqkdt.js:19886-20073 placement
function terminalGuide(ui, content, cells) {
  let { Box, Raster, Text } = ui;
  return h(
    Box,
    {
      flexDirection: "column",
    },
    h(
      Box,
      {
        flexDirection: "column",
        marginBottom: 1,
      },
      h(
        Text,
        {
          bold: true,
        },
        HEADING,
      ),
      h(Raster, {
        key: SCENE_KEY,
        columns: SCENE_COLUMNS,
        rows: SCENE_ROWS,
        cells,
      }),
    ),
    content,
  );
}
//@ chunk-y4bgqkdt.js:20073-20082 placement
var CARD_INSET = 2;
//@ chunk-y4bgqkdt.js:20082-20092 placement
var MOVING_COLUMNS_MIN = 60;
//@ chunk-y4bgqkdt.js:20092-20101 placement
var PANEL_ROWS_MIN = 36;
//@ chunk-y4bgqkdt.js:20101-20111 placement
var UNMEASURED_COLUMNS = 80;
export {
  PLUGIN_DESCRIPTION,
  PLUGIN_NAME,
  availabilityFlag,
  isAvailable,
  isOnByDefault,
  ENGINE_ASK_ID,
  isExplained,
  remoteGuide,
  UNMEASURED_COLUMNS,
  PANEL_ROWS_MIN,
  SCENE_COLUMNS,
  CARD_INSET,
  isPlainTerminal,
  MOVING_COLUMNS_MIN,
  RUN_MS_MAX,
  playScene,
  SCENE_KEY,
  terminalGuide,
  cellsOf,
  frameOf,
  clawdCookingNamespace,
};
