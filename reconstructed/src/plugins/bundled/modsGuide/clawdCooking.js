/**
 * plugins/bundled/modsGuide/clawdCooking.tsx
 *
 * 2.1.316 新增。内置插件 modsGuide 的 Clawd 动画/引导界面。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sc72x544.js (59)
 * attribution: placement 59
 */
import { Ar } from "../../../../runtime/bun-runtime.js";
import { register } from "./index.js";
import { isScreenReaderMode } from "../../../utils/accessibility/screenReader.js";
import { getFeatureValue_SESSION_PINNED } from "../../../services/analytics/growthbook.js";

//@ chunk-sc72x544.js:3848-3857 placement
var clawdCookingNamespace = {};
//@ chunk-sc72x544.js:3857-4802 placement
Ar(clawdCookingNamespace, {
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
//@ chunk-sc72x544.js:4802-4832 placement
var availabilityFlag = () => "tengu_linen_acorn";
//@ chunk-sc72x544.js:4832-4841 placement
var isOnByDefault = false;
//@ chunk-sc72x544.js:4841-4868 placement
var isAvailable = () =>
  !isScreenReaderMode() && getFeatureValue_SESSION_PINNED(availabilityFlag(), isOnByDefault);
//@ chunk-sc72x544.js:4868-5018 placement
var PLUGIN_DESCRIPTION =
  "How mods work: asked how hot reloading works, the question card gets a small panel over it with Clawd cooking, gone once the card is answered";
//@ chunk-sc72x544.js:5018-5047 placement
var PLUGIN_NAME = "cc-plugin-mods-guide";
//@ chunk-sc72x544.js:5047-5065 placement
var ENGINE_ASK_ID = /^confirm_/;
//@ chunk-sc72x544.js:5065-5251 placement
function isExplained(questions) {
  let [r] = questions;
  let e = typeof r === "object" && r !== null ? Reflect.get(r, "question") : undefined;
  if (typeof e !== "string") return false;
  let [, ...f] = e.split(`

`);
  return f
    .join(
      `

`,
    )
    .trim().includes(`
`);
}
//@ chunk-sc72x544.js:5251-5259 placement
var MISSED_FRAMES_MAX = 6;
//@ chunk-sc72x544.js:5259-5269 placement
var PLAY_FRAMES = 256;
//@ chunk-sc72x544.js:5269-5281 placement
var RUN_MS_MAX = 45000;
//@ chunk-sc72x544.js:5281-5289 placement
var CELL_WORDS = 3;
//@ chunk-sc72x544.js:5289-5300 placement
var LOWER_HALF = 9604;
//@ chunk-sc72x544.js:5300-5309 placement
var SPACE = 32;
//@ chunk-sc72x544.js:5309-5324 placement
var TERMINAL_DEFAULT = 16777216;
//@ chunk-sc72x544.js:5324-5336 placement
var UPPER_HALF = 9600;
//@ chunk-sc72x544.js:5336-5471 placement
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
//@ chunk-sc72x544.js:5471-5480 placement
var FRAME_COUNT = 16;
//@ chunk-sc72x544.js:5480-5491 placement
var FRAME_MS = 160;
//@ chunk-sc72x544.js:5491-5501 placement
var PIXEL_ROWS = 18;
//@ chunk-sc72x544.js:5501-5510 placement
var SCENE_COLUMNS = 44;
//@ chunk-sc72x544.js:5510-5518 placement
var SCENE_ROWS = 9;
//@ chunk-sc72x544.js:5518-5802 placement
function cellsOf(i) {
  let uint32Array = new Uint32Array(SCENE_COLUMNS * SCENE_ROWS * CELL_WORDS);
  for (let k = 0; k < SCENE_ROWS; k++)
    for (let k_2 = 0; k_2 < SCENE_COLUMNS; k_2++) {
      let f = PALETTE[i[k + k]?.[k_2] ?? "."];
      let o = PALETTE[i[k + k + 1]?.[k_2] ?? "."];
      let n = f === undefined && o === undefined;
      let s = f === undefined && o !== undefined;
      uint32Array.set(
        [
          n ? SPACE : s ? LOWER_HALF : UPPER_HALF,
          (s ? o : f) ?? TERMINAL_DEFAULT,
          (s ? undefined : o) ?? TERMINAL_DEFAULT,
        ],
        (k * SCENE_COLUMNS + k_2) * CELL_WORDS,
      );
    }
  return new Uint8Array(uint32Array.buffer).toBase64();
}
//@ chunk-sc72x544.js:5802-5874 placement
var blankGrid = (i, r) =>
  Array.from(
    {
      length: r,
    },
    () =>
      Array.from(
        {
          length: i,
        },
        () => ".",
      ),
  );
//@ chunk-sc72x544.js:5874-5949 placement
function put(i, r, t) {
  let [e, f] = r;
  let o = i[f];
  if (o !== undefined && e >= 0 && e < o.length) o[e] = t;
}
//@ chunk-sc72x544.js:5949-6154 placement
function plot(i, r) {
  let [t, e] = r.end;
  let [f, o] = r.start;
  let n = Math.abs(t - f);
  let s = -Math.abs(e - o);
  let l = f < t ? 1 : -1;
  let a = o < e ? 1 : -1;
  let p = n + s;
  for (;;) {
    put(i, [f, o], r.letter);
    if (f === t && o === e) return;
    let u = 2 * p;
    if (u >= s) {
      p += s;
      f += l;
    }
    if (u <= n) {
      p += n;
      o += a;
    }
  }
}
//@ chunk-sc72x544.js:6154-6269 placement
function stamp(i, r, t) {
  let [e, f] = t;
  for (let [o, n] of r.entries())
    for (let [s, l] of [...n].entries()) if (l !== ".") put(i, [e + s, f + o], l);
}
//@ chunk-sc72x544.js:6269-6283 placement
var BUBBLES_AT = [23, 8];
//@ chunk-sc72x544.js:6283-6296 placement
var CLAWD_AT = [1, 3];
//@ chunk-sc72x544.js:6296-6310 placement
var COUNTER_AT = [0, 17];
//@ chunk-sc72x544.js:6310-6325 placement
var FLAMES_AT = [26, 15];
//@ chunk-sc72x544.js:6325-6338 placement
var POT_AT = [23, 9];
//@ chunk-sc72x544.js:6338-7079 placement
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
//@ chunk-sc72x544.js:7079-7135 placement
var COUNTER = ["GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG"];
//@ chunk-sc72x544.js:7135-7270 placement
var POT = [
  "RRSSSSSSSSSSSSSSRR",
  ".RPPPPPPPPPPPPPPH.",
  "RRPPPPPPPPPPPPPPHR",
  ".RPPPPPPPPPPPPPPH.",
  ".RPPPPPPPPPPPPPPH.",
  "..PPPPPPPPPPPPPH..",
];
//@ chunk-sc72x544.js:7270-7347 placement
var PUFFS = [[".ss.", "ssss", ".ss."], [".ss.", "ssss"], ["sss.", ".ss."], ["ss"], ["s"]];
//@ chunk-sc72x544.js:7347-7356 placement
var BLINK_FRAME = 9;
//@ chunk-sc72x544.js:7356-7701 placement
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
//@ chunk-sc72x544.js:7701-8222 placement
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
//@ chunk-sc72x544.js:8222-8263 placement
var POSES = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0];
//@ chunk-sc72x544.js:8263-8301 placement
var PUFF_STARTS = [
  [26, 0],
  [30, 4],
  [34, 8],
  [37, 12],
];
//@ chunk-sc72x544.js:8301-8425 placement
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
//@ chunk-sc72x544.js:8425-8689 placement
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
//@ chunk-sc72x544.js:8689-9051 placement
function frameOf(i) {
  let r = i % FRAME_COUNT;
  let t = blankGrid(SCENE_COLUMNS, PIXEL_ROWS);
  let [, e] = POT_AT;
  stamp(t, COUNTER, COUNTER_AT);
  stamp(t, FLAMES[r] ?? [], FLAMES_AT);
  for (let [a, p] of PUFF_STARTS) {
    let c = PUFF_TRACK[(r + p) % FRAME_COUNT];
    if (c !== undefined) {
      let [u, H, S] = c;
      let C = PUFFS[S] ?? [];
      stamp(t, C, [a + u, e - H - C.length]);
    }
  }
  let [f, o] = SPOON[r] ?? SPOON[0];
  plot(t, {
    start: f,
    end: o,
    letter: "W",
  });
  stamp(t, POT, POT_AT);
  stamp(t, [BUBBLES[r] ?? ""], BUBBLES_AT);
  let n = CLAWD_POSES[POSES[r] ?? 0];
  let l = r === BLINK_FRAME ? n.map((a) => a.replaceAll("E", "C")) : n;
  stamp(t, l, CLAWD_AT);
  return t.map((a) => a.join(""));
}
//@ chunk-sc72x544.js:9051-9206 placement
function playScene(i, r) {
  let t = 0;
  let e = 0;
  let f = r(FRAME_MS, () => void o());
  async function o() {
    t += 1;
    e = (await i.paint(cellsOf(frameOf(t))).catch(() => false)) ? 0 : e + 1;
    if (t >= PLAY_FRAMES || e >= MISSED_FRAMES_MAX) {
      f.cancel();
      i.ended();
    }
  }
}
//@ chunk-sc72x544.js:9206-9290 placement
var isPlainTerminal = (i) =>
  (i.noColor !== undefined && i.noColor !== "") || i.forceColor === "0" || i.term === "dumb";
//@ chunk-sc72x544.js:9290-12648 placement
var CLAWD_COOKING_STILL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 352 144" width="352" height="144" shape-rendering="crispEdges" role="img"><title>Clawd stirs a steaming pot</title><rect x="0" y="136" width="352" height="8" fill="#6b7280"/><g><rect x="208" y="128" width="8" height="8" fill="#f59e0b"/><rect x="224" y="128" width="8" height="8" fill="#f59e0b"/><rect x="240" y="128" width="8" height="8" fill="#f59e0b"/><rect x="256" y="128" width="8" height="8" fill="#f59e0b"/><rect x="272" y="128" width="8" height="8" fill="#f59e0b"/><rect x="288" y="128" width="8" height="8" fill="#f59e0b"/><rect x="216" y="128" width="8" height="8" fill="#ef4444"/><rect x="232" y="128" width="8" height="8" fill="#ef4444"/><rect x="248" y="128" width="8" height="8" fill="#ef4444"/><rect x="264" y="128" width="8" height="8" fill="#ef4444"/><rect x="280" y="128" width="8" height="8" fill="#ef4444"/><rect x="296" y="128" width="8" height="8" fill="#ef4444"/></g><g><rect x="224" y="120" width="8" height="8" fill="#fde047"/><rect x="256" y="120" width="8" height="8" fill="#fde047"/><rect x="280" y="120" width="8" height="8" fill="#fde047"/></g><g opacity="0.85" transform="translate(0 0)"><g transform="translate(208 48)"><path fill="#9aa3ad" d="M8 0h16v8h-16zM0 8h32v8h-32zM8 16h16v8h-16z"/></g></g><g opacity="0.6" transform="translate(-8 -36)"><g transform="translate(240 48)"><path fill="#9aa3ad" d="M8 0h16v8h-16zM0 8h32v8h-32zM8 16h16v8h-16z"/></g></g><g opacity="0.3" transform="translate(-10 -76)"><g transform="translate(272 48)"><path fill="#9aa3ad" d="M8 0h16v8h-16zM0 8h32v8h-32zM8 16h16v8h-16z"/></g></g><g><g><path fill="none" stroke="#be8e5c" stroke-width="8" stroke-linecap="square" d="M161.0 24.8L273.9 91.2"/></g></g><path fill="#94a0b0" d="M184 72h16v8h-16zM312 72h16v8h-16zM192 80h8v8h-8zM184 88h16v8h-16zM320 88h8v8h-8zM192 96h8v8h-8zM192 104h8v8h-8z"/><path fill="#e9b44c" d="M200 72h112v8h-112z"/><path fill="#5f6b7a" d="M200 80h112v8h-112zM200 88h112v8h-112zM200 96h112v8h-112zM200 104h112v8h-112zM200 112h104v8h-104z"/><path fill="#465160" d="M312 80h8v8h-8zM312 88h8v8h-8zM312 96h8v8h-8zM312 104h8v8h-8zM304 112h8v8h-8z"/><rect x="256" y="64" width="8" height="8" fill="#e9b44c"></rect><g><path fill="#d77757" d="M32 56h104v8h-104zM32 64h104v8h-104zM32 72h104v8h-104zM32 80h104v8h-104zM16 88h120v8h-120zM16 96h120v8h-120zM32 104h104v8h-104zM32 112h104v8h-104zM32 120h8v8h-8zM48 120h8v8h-8zM112 120h8v8h-8zM128 120h8v8h-8zM32 128h8v8h-8zM48 128h8v8h-8zM112 128h8v8h-8zM128 128h8v8h-8z"/><rect x="56" y="72" width="8" height="16" fill="#141414"></rect><rect x="120" y="72" width="8" height="16" fill="#141414"></rect><g><rect x="136" y="80" width="16" height="8" fill="#d77757"/><rect x="136" y="72" width="16" height="8" fill="#d77757"/><rect x="144" y="72" width="16" height="8" fill="#d77757"/><rect x="144" y="64" width="16" height="8" fill="#d77757"/><rect x="152" y="64" width="16" height="8" fill="#d77757"/><rect x="152" y="56" width="16" height="8" fill="#d77757"/><rect x="160" y="56" width="16" height="8" fill="#d77757"/><rect x="160" y="48" width="16" height="8" fill="#d77757"/><rect x="168" y="48" width="16" height="8" fill="#d77757"/><rect x="168" y="40" width="16" height="8" fill="#d77757"/><rect x="176" y="40" width="16" height="8" fill="#d77757"/><rect x="176" y="32" width="16" height="8" fill="#d77757"/></g></g></svg>';
//@ chunk-sc72x544.js:12648-19286 placement
var CLAWD_COOKING_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 352 144" width="352" height="144" shape-rendering="crispEdges" role="img"><title>Clawd stirs a steaming pot</title><rect x="0" y="136" width="352" height="8" fill="#6b7280"/><g><rect x="208" y="128" width="8" height="8" fill="#f59e0b"/><rect x="224" y="128" width="8" height="8" fill="#f59e0b"/><rect x="240" y="128" width="8" height="8" fill="#f59e0b"/><rect x="256" y="128" width="8" height="8" fill="#f59e0b"/><rect x="272" y="128" width="8" height="8" fill="#f59e0b"/><rect x="288" y="128" width="8" height="8" fill="#f59e0b"/><rect x="216" y="128" width="8" height="8" fill="#ef4444"/><rect x="232" y="128" width="8" height="8" fill="#ef4444"/><rect x="248" y="128" width="8" height="8" fill="#ef4444"/><rect x="264" y="128" width="8" height="8" fill="#ef4444"/><rect x="280" y="128" width="8" height="8" fill="#ef4444"/><rect x="296" y="128" width="8" height="8" fill="#ef4444"/></g><g><rect x="224" y="120" width="8" height="8" fill="#fde047"/><rect x="256" y="120" width="8" height="8" fill="#fde047"/><rect x="280" y="120" width="8" height="8" fill="#fde047"/><animate attributeName="opacity" values="1;0;1" dur=".5s" repeatCount="indefinite"/></g><g opacity="0"><rect x="216" y="120" width="8" height="8" fill="#f59e0b"/><rect x="240" y="120" width="8" height="8" fill="#f59e0b"/><rect x="272" y="120" width="8" height="8" fill="#f59e0b"/><rect x="288" y="120" width="8" height="8" fill="#f59e0b"/><animate attributeName="opacity" values="0;1;0" dur=".5s" repeatCount="indefinite"/></g><g opacity="0"><g transform="translate(208 48)"><path fill="#9aa3ad" d="M8 0h16v8h-16zM0 8h32v8h-32zM8 16h16v8h-16z"/></g><animateTransform attributeName="transform" type="translate" values="0 0;6 -36;-6 -76" dur="2.6s" begin="-0.00s" repeatCount="indefinite" calcMode="spline" keySplines=".3 0 .7 1;.3 0 .7 1"/><animate attributeName="opacity" values="0;.85;.6;0" keyTimes="0;.2;.6;1" dur="2.6s" begin="-0.00s" repeatCount="indefinite"/></g><g opacity="0"><g transform="translate(240 48)"><path fill="#9aa3ad" d="M8 0h16v8h-16zM0 8h32v8h-32zM8 16h16v8h-16z"/></g><animateTransform attributeName="transform" type="translate" values="0 0;-8 -36;8 -76" dur="2.6s" begin="-0.65s" repeatCount="indefinite" calcMode="spline" keySplines=".3 0 .7 1;.3 0 .7 1"/><animate attributeName="opacity" values="0;.85;.6;0" keyTimes="0;.2;.6;1" dur="2.6s" begin="-0.65s" repeatCount="indefinite"/></g><g opacity="0"><g transform="translate(272 48)"><path fill="#9aa3ad" d="M8 0h16v8h-16zM0 8h32v8h-32zM8 16h16v8h-16z"/></g><animateTransform attributeName="transform" type="translate" values="0 0;10 -36;-10 -76" dur="2.6s" begin="-1.30s" repeatCount="indefinite" calcMode="spline" keySplines=".3 0 .7 1;.3 0 .7 1"/><animate attributeName="opacity" values="0;.85;.6;0" keyTimes="0;.2;.6;1" dur="2.6s" begin="-1.30s" repeatCount="indefinite"/></g><g opacity="0"><g transform="translate(296 48)"><path fill="#9aa3ad" d="M8 0h16v8h-16zM0 8h32v8h-32zM8 16h16v8h-16z"/></g><animateTransform attributeName="transform" type="translate" values="0 0;-6 -36;6 -76" dur="2.6s" begin="-1.95s" repeatCount="indefinite" calcMode="spline" keySplines=".3 0 .7 1;.3 0 .7 1"/><animate attributeName="opacity" values="0;.85;.6;0" keyTimes="0;.2;.6;1" dur="2.6s" begin="-1.95s" repeatCount="indefinite"/></g><g><g><path fill="none" stroke="#be8e5c" stroke-width="8" stroke-linecap="square" d="M161.0 24.8L273.9 91.2"/><animateTransform attributeName="transform" type="rotate" values="12 180 36;-13 180 36;12 180 36" dur="2.6s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/></g><animateTransform attributeName="transform" type="translate" values="0 0;0 2;0 0;0 2;0 0" dur="2.6s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1;.45 0 .55 1;.45 0 .55 1"/></g><path fill="#94a0b0" d="M184 72h16v8h-16zM312 72h16v8h-16zM192 80h8v8h-8zM184 88h16v8h-16zM320 88h8v8h-8zM192 96h8v8h-8zM192 104h8v8h-8z"/><path fill="#e9b44c" d="M200 72h112v8h-112z"/><path fill="#5f6b7a" d="M200 80h112v8h-112zM200 88h112v8h-112zM200 96h112v8h-112zM200 104h112v8h-112zM200 112h104v8h-104z"/><path fill="#465160" d="M312 80h8v8h-8zM312 88h8v8h-8zM312 96h8v8h-8zM312 104h8v8h-8zM304 112h8v8h-8z"/><rect x="216" y="64" width="8" height="8" fill="#e9b44c" opacity="0"><animate attributeName="opacity" values="0;0;1;0" keyTimes="0;.6;.8;1" dur="1.3s" begin="-0.00s" repeatCount="indefinite"/></rect><rect x="256" y="64" width="8" height="8" fill="#e9b44c" opacity="0"><animate attributeName="opacity" values="0;0;1;0" keyTimes="0;.6;.8;1" dur="1.3s" begin="-0.45s" repeatCount="indefinite"/></rect><rect x="288" y="64" width="8" height="8" fill="#e9b44c" opacity="0"><animate attributeName="opacity" values="0;0;1;0" keyTimes="0;.6;.8;1" dur="1.3s" begin="-0.90s" repeatCount="indefinite"/></rect><g><path fill="#d77757" d="M32 56h104v8h-104zM32 64h104v8h-104zM32 72h104v8h-104zM32 80h104v8h-104zM16 88h120v8h-120zM16 96h120v8h-120zM32 104h104v8h-104zM32 112h104v8h-104zM32 120h8v8h-8zM48 120h8v8h-8zM112 120h8v8h-8zM128 120h8v8h-8zM32 128h8v8h-8zM48 128h8v8h-8zM112 128h8v8h-8zM128 128h8v8h-8z"/><rect x="56" y="72" width="8" height="16" fill="#141414"><animate attributeName="height" values="16;16;0;16;16" keyTimes="0;.55;.58;.62;1" dur="2.6s" repeatCount="indefinite"/></rect><rect x="120" y="72" width="8" height="16" fill="#141414"><animate attributeName="height" values="16;16;0;16;16" keyTimes="0;.55;.58;.62;1" dur="2.6s" repeatCount="indefinite"/></rect><g><rect x="136" y="80" width="16" height="8" fill="#d77757"/><rect x="136" y="72" width="16" height="8" fill="#d77757"/><rect x="144" y="72" width="16" height="8" fill="#d77757"/><rect x="144" y="64" width="16" height="8" fill="#d77757"/><rect x="152" y="64" width="16" height="8" fill="#d77757"/><rect x="152" y="56" width="16" height="8" fill="#d77757"/><rect x="160" y="56" width="16" height="8" fill="#d77757"/><rect x="160" y="48" width="16" height="8" fill="#d77757"/><rect x="168" y="48" width="16" height="8" fill="#d77757"/><rect x="168" y="40" width="16" height="8" fill="#d77757"/><rect x="176" y="40" width="16" height="8" fill="#d77757"/><rect x="176" y="32" width="16" height="8" fill="#d77757"/><animateTransform attributeName="transform" type="rotate" values="2 136 88;-2 136 88;2 136 88" dur="2.6s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/></g><animateTransform attributeName="transform" type="translate" values="0 0;0 2;0 0;0 2;0 0" dur="2.6s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1;.45 0 .55 1;.45 0 .55 1"/></g></svg>';
//@ chunk-sc72x544.js:19286-19308 placement
var HEADING = "How mods work";
//@ chunk-sc72x544.js:19308-19344 placement
var SCENE_ALT = "Clawd stirs a steaming pot";
//@ chunk-sc72x544.js:19344-19366 placement
var SCENE_KEY = "clawd-cooking";
//@ chunk-sc72x544.js:19366-19377 placement
var SVG_WIDTH = 440;
//@ chunk-sc72x544.js:19377-19578 placement
function remoteGuide(i, r, t) {
  let { Box, Svg, Text } = i;
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
        source: t ? CLAWD_COOKING_STILL_SVG : CLAWD_COOKING_SVG,
        alt: SCENE_ALT,
        width: SVG_WIDTH,
        isInteractive: !t,
      }),
    ),
    r,
  );
}
//@ chunk-sc72x544.js:19578-19765 placement
function terminalGuide(i, r, cells) {
  let { Box, Raster, Text } = i;
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
    r,
  );
}
//@ chunk-sc72x544.js:19765-19774 placement
var CARD_INSET = 2;
//@ chunk-sc72x544.js:19774-19784 placement
var MOVING_COLUMNS_MIN = 60;
//@ chunk-sc72x544.js:19784-19793 placement
var PANEL_ROWS_MIN = 36;
//@ chunk-sc72x544.js:19793-19803 placement
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
