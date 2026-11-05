/**
 * components/onboarding/PowerupLessons.tsx
 *
 * 2.1.316 新增：入门“能力课”界面与课程内容
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-je0zymfm.js (28)
 * attribution: placement 27, layout 1
 */
import { init_react_production, useState } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  FILLED_DIAMOND_GLYPH,
  HALF_CIRCLE,
  FAST_FORWARD_GLYPH,
  PAUSE_GLYPH,
  DIAMOND_GLYPH,
  BLACK_CIRCLE,
} from "../../constants/figures.js";
import { isReducedMotion } from "../Spinner/spinnerFlags.js";
import { useSettingsState } from "../../hooks/useSettings.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { sampleAlias } from "../Spinner/spinnerStatus.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { computeShimmerSegments } from "../../bridge/bridgeStatusUtil.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { TeammateDetailView } from "../teams/TeamsDialog.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { stableEmptyObject } from "../../utils/stableEmptyObject.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { MobileQRCode } from "../../commands/powerup/powerup.js";
import { ProgressBar } from "../design-system/ProgressBar.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { Pane } from "../design-system/Pane.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-je0zymfm.js:1119-1123 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-je0zymfm.js:1119", () => {
  init_react_production();
});
//@ chunk-je0zymfm.js:1123-1166 placement
function splitSegments(text) {
  return text
    .split(
      `
`,
    )
    .map(parseKeyChord);
}
//@ chunk-je0zymfm.js:1166-1229 placement
function renderSegment(segment, key) {
  return jsxProd_default(
    Text,
    {
      color: segment.color,
      children: segment.text,
    },
    key,
  );
}
//@ chunk-je0zymfm.js:1229-1305 placement
function renderLessonLine(line, key) {
  return jsxProd_default(
    Text,
    {
      dimColor: line.dim,
      children: line.segments.map(renderSegment),
    },
    key,
  );
}
//@ chunk-je0zymfm.js:1305-1328 placement
function emptyLines() {
  return [];
}
//@ chunk-je0zymfm.js:1328-1362 placement
function compareX(a, b) {
  return a.x - b.x;
}
//@ chunk-je0zymfm.js:1362-1563 placement
function renderSparkRow(sparks, key) {
  let column = 0;
  return jsxProd_default(
    Box,
    {
      height: 1,
      children: sparks.map((spark, index) => {
        let max = Math.max(0, spark.x - column);
        column = Math.max(column, spark.x) + 1;
        return jsxProd_default_2(
          Text,
          {
            children: [
              " ".repeat(max),
              jsxProd_default(Text, {
                color: spark.color,
                children: spark.char,
              }),
            ],
          },
          index,
        );
      }),
    },
    key,
  );
}
//@ chunk-je0zymfm.js:1563-1599 placement
function nextModeIndex(modeIndex) {
  return (modeIndex + 1) % PERMISSION_MODE_STEPS.length;
}
//@ chunk-je0zymfm.js:1599-1619 placement
var LESSON_STEP_MS = 3000;
var LESSON_WIDTH = 48;
var LESSON_STEP_COUNT = 3;
//@ chunk-je0zymfm.js:1619-2203 placement
function LessonFrame(props) {
  let $ = useMemoCache(10);
  let { live, boxRef, children } = props;
  let frameBox;
  if ($[0] !== children) {
    frameBox = jsxProd_default(Box, {
      flexDirection: "column",
      width: LESSON_WIDTH - 4,
      height: LESSON_STEP_COUNT,
      children,
    });
    $[0] = children;
    $[1] = frameBox;
  } else frameBox = $[1];
  const dimColor = !live;
  const color = live ? "claude" : undefined;
  const children_2 = live ? `${FILLED_DIAMOND_GLYPH} try it` : `  ${HALF_CIRCLE} demo`;
  let sparkRow;
  if ($[2] !== dimColor || $[3] !== color || $[4] !== children_2) {
    sparkRow = jsxProd_default(Box, {
      position: "absolute",
      marginLeft: LESSON_WIDTH - 12,
      children: jsxProd_default(Text, {
        dimColor,
        color,
        children: children_2,
      }),
    });
    $[2] = dimColor;
    $[3] = color;
    $[4] = children_2;
    $[5] = sparkRow;
  } else sparkRow = $[5];
  let frameElement;
  if ($[6] !== boxRef || $[7] !== frameBox || $[8] !== sparkRow) {
    frameElement = jsxProd_default_2(Box, {
      ref: boxRef,
      borderStyle: "round",
      borderColor: "inactive",
      paddingX: 1,
      width: LESSON_WIDTH,
      height: LESSON_STEP_COUNT + 2,
      children: [frameBox, sparkRow],
    });
    $[6] = boxRef;
    $[7] = frameBox;
    $[8] = sparkRow;
    $[9] = frameElement;
  } else frameElement = $[9];
  return frameElement;
}
//@ chunk-je0zymfm.js:2203-2232 placement
var TYPING_MARKER_RE = /\[(\w+):([^\]]*)\]/g;
//@ chunk-je0zymfm.js:2232-2525 placement
function parseKeyChord(chord) {
  let isTyping = chord.startsWith("#");
  let body = isTyping ? chord.slice(1) : chord;
  let segments = [];
  let cursor = 0;
  for (let match of body.matchAll(TYPING_MARKER_RE)) {
    if (match.index > cursor)
      segments.push({
        text: body.slice(cursor, match.index),
      });
    segments.push({
      text: match[2],
      color: match[1],
    });
    cursor = match.index + match[0].length;
  }
  if (cursor < body.length)
    segments.push({
      text: body.slice(cursor),
    });
  if (segments.length === 0)
    segments.push({
      text: "",
    });
  return {
    dim: isTyping,
    segments,
  };
}
//@ chunk-je0zymfm.js:2525-2798 placement
function AnimatedFrames(props) {
  let $ = useMemoCache(4);
  let { frames } = props;
  let mapped = frames.map(splitSegments);
  let reducedMotion = isReducedMotion(useSettingsState().prefersReducedMotion);
  let [clock, elapsedMs] = useAnimationFrame(reducedMotion ? null : LESSON_STEP_MS);
  let frameIndex = Math.floor(elapsedMs / LESSON_STEP_MS) % mapped.length;
  let frame = mapped[frameIndex];
  const containerComponent = LessonFrame;
  const children = frame.map(renderLessonLine);
  let frameElement;
  if ($[0] !== containerComponent || $[1] !== clock || $[2] !== children) {
    frameElement = jsxProd_default(containerComponent, {
      boxRef: clock,
      children,
    });
    $[0] = containerComponent;
    $[1] = clock;
    $[2] = children;
    $[3] = frameElement;
  } else frameElement = $[3];
  return frameElement;
}
//@ chunk-je0zymfm.js:2798-3121 placement
var PERMISSION_MODE_STEPS; // deferred: uses BLACK_CIRCLE (../../constants/figures.js) of its import cycle while loading; runs once the cycle is complete
var POWERUP_MAX_WIDTH;
var POWERUP_LABEL_WIDTH;
var POWERUP_ANIM_MS;
var POWERUP_MAX_ROWS;
var POWERUP_MIN_ROWS;
var POWERUP_GLYPH_COUNT;
var POWERUP_GLYPHS;
var POWERUP_COLORS;
deferInit("chunk-je0zymfm.js:2798", () => {
  PERMISSION_MODE_STEPS = [
    {
      label: "default",
      symbol: "",
      color: "text",
    },
    {
      label: "accept edits on",
      symbol: FAST_FORWARD_GLYPH,
      color: "autoAccept",
    },
    {
      label: "plan mode on",
      symbol: PAUSE_GLYPH,
      color: "planMode",
    },
    {
      label: "auto mode on",
      symbol: FAST_FORWARD_GLYPH,
      color: "warning",
    },
  ];
  POWERUP_MAX_WIDTH = 80;
  POWERUP_LABEL_WIDTH = 60;
  POWERUP_ANIM_MS = 1400;
  POWERUP_MAX_ROWS = 16;
  POWERUP_MIN_ROWS = 60;
  POWERUP_GLYPH_COUNT = 100;
  POWERUP_GLYPHS = [FILLED_DIAMOND_GLYPH, DIAMOND_GLYPH, BLACK_CIRCLE, "\xB7"];
  POWERUP_COLORS = ["claude", "success", "warning", "suggestion", "autoAccept"];
});
//@ chunk-je0zymfm.js:3121-3292 placement
function createSparks(count) {
  let sparks = [];
  for (let particleIndex = 0; particleIndex < count; particleIndex++)
    sparks.push({
      x: Math.floor(Math.random() * POWERUP_GLYPH_COUNT),
      delay: Math.random() * 400,
      speed: 0.7 + Math.random() * 0.6,
      char: sampleAlias(POWERUP_GLYPHS),
      color: sampleAlias(POWERUP_COLORS),
    });
  return sparks;
}
//@ chunk-je0zymfm.js:3292-3852 placement
function ModeCycleDemo(props) {
  let $ = useMemoCache(6);
  let { onDone } = props;
  let sparks;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    sparks = createSparks(40);
    $[0] = sparks;
  } else sparks = $[0];
  let sparksInitial = sparks;
  let reducedMotion = isReducedMotion(useSettingsState().prefersReducedMotion);
  let [clock, elapsedMs] = useAnimationFrame(reducedMotion ? null : POWERUP_LABEL_WIDTH);
  let [startMs] = useState(elapsedMs);
  let elapsedSinceStart = elapsedMs - startMs;
  let modeElement;
  if ($[1] !== onDone) {
    modeElement = [onDone];
    $[1] = onDone;
    $[2] = modeElement;
  } else modeElement = $[2];
  useTimeout(onDone, POWERUP_ANIM_MS + 600, modeElement);
  let boxElement;
  if ($[3] !== elapsedSinceStart || $[4] !== clock) {
    let list = Array.from(
      {
        length: POWERUP_MAX_ROWS,
      },
      emptyLines,
    );
    for (const cycleIndex of sparksInitial) {
      let max = Math.max(0, elapsedSinceStart - cycleIndex.delay);
      let floored = Math.floor((max / POWERUP_ANIM_MS) * POWERUP_MAX_ROWS * cycleIndex.speed);
      if (floored >= 0 && floored < POWERUP_MAX_ROWS) list[floored].push(cycleIndex);
    }
    for (const sparks of list) sparks.sort(compareX);
    boxElement = jsxProd_default(Box, {
      ref: clock,
      position: "absolute",
      marginLeft: POWERUP_MIN_ROWS,
      flexDirection: "column",
      width: POWERUP_GLYPH_COUNT,
      height: POWERUP_MAX_ROWS,
      children: list.map(renderSparkRow),
    });
    $[3] = elapsedSinceStart;
    $[4] = clock;
    $[5] = boxElement;
  } else boxElement = $[5];
  return boxElement;
}
//@ chunk-je0zymfm.js:3852-4489 placement
function TypewriterText(props) {
  let $ = useMemoCache(14);
  let { text } = props;
  let textWidth = bunStringWidth(text);
  let reducedMotion = isReducedMotion(useSettingsState().prefersReducedMotion);
  let [clock, elapsedMs] = useAnimationFrame(reducedMotion ? null : POWERUP_MAX_WIDTH);
  let glimmerSpan = textWidth + 20;
  let glimmerIndex = (Math.floor(elapsedMs / POWERUP_MAX_WIDTH) % glimmerSpan) - 10;
  let segments;
  if ($[0] !== glimmerIndex || $[1] !== text) {
    segments = computeShimmerSegments(text, glimmerIndex);
    $[0] = glimmerIndex;
    $[1] = text;
    $[2] = segments;
  } else segments = $[2];
  let { before, shimmer, after } = segments;
  let textRow;
  if ($[3] !== before) {
    textRow = jsxProd_default(Text, {
      bold: true,
      color: "claude",
      children: before,
    });
    $[3] = before;
    $[4] = textRow;
  } else textRow = $[4];
  let glimmerElement;
  if ($[5] !== shimmer) {
    glimmerElement = jsxProd_default(Text, {
      bold: true,
      color: "claudeShimmer",
      children: shimmer,
    });
    $[5] = shimmer;
    $[6] = glimmerElement;
  } else glimmerElement = $[6];
  let glimmerPos;
  if ($[7] !== after) {
    glimmerPos = jsxProd_default(Text, {
      bold: true,
      color: "claude",
      children: after,
    });
    $[7] = after;
    $[8] = glimmerPos;
  } else glimmerPos = $[8];
  let boxElement;
  if ($[9] !== clock || $[10] !== textRow || $[11] !== glimmerElement || $[12] !== glimmerPos) {
    boxElement = jsxProd_default_2(Box, {
      ref: clock,
      children: [textRow, glimmerElement, glimmerPos],
    });
    $[9] = clock;
    $[10] = textRow;
    $[11] = glimmerElement;
    $[12] = glimmerPos;
    $[13] = boxElement;
  } else boxElement = $[13];
  return boxElement;
}
//@ chunk-je0zymfm.js:5106-5238 placement
function Highlight(props) {
  let $ = useMemoCache(2);
  let { children } = props;
  let highlightElement;
  if ($[0] !== children) {
    highlightElement = jsxProd_default(Text, {
      bold: true,
      color: "claude",
      children,
    });
    $[0] = children;
    $[1] = highlightElement;
  } else highlightElement = $[1];
  return highlightElement;
}
//@ chunk-je0zymfm.js:5238-5366 placement (2.1.88 match: EffortIndicatorSymbol, 1)
function EffortIndicatorSymbol(props) {
  let $ = useMemoCache(2);
  let { children } = props;
  let symbolElement;
  if ($[0] !== children) {
    symbolElement = jsxProd_default(Text, {
      color: "suggestion",
      children,
    });
    $[0] = children;
    $[1] = symbolElement;
  } else symbolElement = $[1];
  return symbolElement;
}
//@ chunk-je0zymfm.js:5366-13861 placement
/**
 * 入门“能力课”列表：@ 文件、权限模式、计划模式等，每课含标题、标语与演示内容。
 */
var POWERUP_LESSONS; // deferred: uses Box (../../ink/components/Text.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-je0zymfm.js:5366", () => {
  POWERUP_LESSONS = [
    {
      id: "at-mentions",
      title: "Talk to your codebase",
      tagline: "@ files, line refs",
      body: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          jsxProd_default_2(Text, {
            children: [
              "Type ",
              jsxProd_default(Highlight, {
                children: "@",
              }),
              " anywhere in your prompt to fuzzy-find and attach a file. Claude reads it before answering \u2014 no more pasting code.",
            ],
          }),
          jsxProd_default(AnimatedFrames, {
            frames: [
              `> what does [suggestion:@]
#type a file name\u2026`,
              `> what does [suggestion:@src/auth.ts]
  [suggestion:\u276F src/auth.ts]
#   src/auth.test.ts`,
              `> what does [suggestion:@src/auth.ts] do?
#\u25D0 Reading src/auth.ts\u2026`,
              `> what does [suggestion:@src/auth.ts] do?
Exports validateToken() which
checks JWT expiry and signature.`,
            ],
          }),
          jsxProd_default_2(Text, {
            children: [
              "Reference specific lines with ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: "src/app.ts:42",
              }),
              " and Claude jumps straight there. Works in both directions: Claude cites files the same way, so you can click to open them in your editor.",
            ],
          }),
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "Also try: ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: "@folder/",
              }),
              " to attach a whole directory tree.",
            ],
          }),
        ],
      }),
    },
    {
      id: "modes",
      title: "Steer with modes",
      tagline: "shift+tab, plan, auto",
      body: jsxProd_default(ShiftTabHint, {}),
    },
    {
      id: "undo",
      title: "Undo anything",
      tagline: "/rewind, Esc-Esc",
      body: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          jsxProd_default_2(Text, {
            children: [
              "Claude checkpoints your files before every edit. Press",
              " ",
              jsxProd_default(Highlight, {
                children: "Esc Esc",
              }),
              " (double-tap) to open ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: "/rewind",
              }),
              " and roll back to any prior state \u2014 code, conversation, or both.",
            ],
          }),
          jsxProd_default(AnimatedFrames, {
            frames: [
              `[success:\u2713] Updated regex in parser.ts
#[error:8 tests failing]`,
              `#press Esc Esc
Rewind to:
  [suggestion:\u276F before parser.ts edit]`,
              `#[success:\u2713] parser.ts restored
> try a simpler approach
#\u25D0 thinking\u2026`,
            ],
          }),
          jsxProd_default(Text, {
            children:
              "Went down the wrong path? Rewind to before the detour and try a different prompt. Your git history stays clean.",
          }),
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "Also: ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: "/clear",
              }),
              " wipes conversation but keeps files.",
              " ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: "/branch",
              }),
              " forks the conversation to try two approaches.",
            ],
          }),
        ],
      }),
    },
    {
      id: "background",
      title: "Run in the background",
      tagline: "tasks, /tasks",
      body: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          jsxProd_default_2(Text, {
            children: [
              "Long builds and test suites do not have to block you. Add",
              " ",
              jsxProd_default(Highlight, {
                children: "&",
              }),
              " to any bash command and it runs in the background \u2014 you keep chatting, Claude notifies you when it finishes.",
            ],
          }),
          jsxProd_default(AnimatedFrames, {
            frames: [
              `> run the test suite [claude:&]
#task started in background`,
              `> now fix the lint in app.ts
#\u25D0 Editing app.ts\u2026
#[warning:\u25D0] bun test \xB7 12s`,
              `> now fix the lint in app.ts
[success:\u2713] Removed unused import
#[warning:\u25D0] bun test \xB7 28s`,
              `> now fix the lint in app.ts
[success:\u2713] Removed unused import
#[success:\u2713] bun test \xB7 284 pass`,
            ],
          }),
          jsxProd_default_2(Text, {
            children: [
              "Run ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: "/tasks",
              }),
              " to see everything in flight. Claude can read task output mid-run and react to failures automatically.",
            ],
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: "Subagents also run as tasks \u2014 it is all one queue.",
          }),
        ],
      }),
    },
    {
      id: "memory",
      title: "Teach Claude your rules",
      tagline: "CLAUDE.md, /memory",
      body: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          jsxProd_default_2(Text, {
            children: [
              "Drop a ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: "CLAUDE.md",
              }),
              " file in your repo and Claude reads it at the start of every session. Put your conventions there: test commands, style rules, do-not-touch directories.",
            ],
          }),
          jsxProd_default(AnimatedFrames, {
            frames: [
              `#\u2500 CLAUDE.md \u2500
#Run tests with: [suggestion:bun test]
#Never edit src/legacy/`,
              `> add tests for the cache
#\u25D0 reading CLAUDE.md\u2026`,
              `> add tests for the cache
Writing cache.test.ts,
running [suggestion:bun test] to verify.`,
            ],
          }),
          jsxProd_default_2(Text, {
            children: [
              "Run ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: "/init",
              }),
              " to generate a starter CLAUDE.md from your codebase. Run ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: "/memory",
              }),
              " to edit it inline.",
            ],
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children:
              "Works at three levels: repo, your home directory (all projects), and per-directory overrides.",
          }),
        ],
      }),
    },
    {
      id: "mcp",
      title: "Extend with tools",
      tagline: "MCP, /mcp",
      body: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          jsxProd_default_2(Text, {
            children: [
              "MCP servers give Claude new tools: read your Slack, query your database, control your browser. Run ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: "/mcp",
              }),
              " to browse and connect servers.",
            ],
          }),
          jsxProd_default(AnimatedFrames, {
            frames: [
              `> [suggestion:/mcp]
Connected servers:
  [success:\u2713] slack    [success:\u2713] github`,
              `> anything urgent in #eng?
#\u25D0 [suggestion:slack] \xB7 reading channel\u2026`,
              `Boris posted about the merge
freeze. Also 3 PRs await
your review on github.`,
            ],
          }),
          jsxProd_default(Text, {
            children:
              'Once connected, tools appear automatically \u2014 ask Claude to "check my calendar" or "search our Notion" and it just works.',
          }),
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "From your shell:",
              " ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: "claude mcp add my-server -- npx some-mcp-pkg",
              }),
              " to wire one up without leaving the terminal.",
            ],
          }),
        ],
      }),
    },
    {
      id: "automate",
      title: "Automate your workflow",
      tagline: "skills, hooks",
      body: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          jsxProd_default_2(Text, {
            children: [
              "Save a prompt to ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: ".claude/skills/deploy/SKILL.md",
              }),
              " and it becomes ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: "/deploy",
              }),
              " \u2014 type it, Claude runs it. Run",
              " ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: "/skills",
              }),
              " to see what you have.",
            ],
          }),
          jsxProd_default(AnimatedFrames, {
            frames: [
              `> [suggestion:/deploy] staging
#\u25D0 skill: deploy`,
              `[success:\u2713] built
[success:\u2713] tests pass
#\u25D0 pushing to staging\u2026`,
              `[success:\u2713] deployed
#[suggestion:staging.app.com]
#PostToolUse hook ran prettier`,
            ],
          }),
          jsxProd_default_2(Text, {
            children: [
              "Hooks run your own scripts on events: before a tool call, after a response, on session start. Use them to enforce rules, log activity, or inject context. Run ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: "/hooks",
              }),
              " to see what fires when.",
            ],
          }),
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "Run ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: "/install-github-app",
              }),
              " to let Claude review PRs when tagged.",
            ],
          }),
        ],
      }),
    },
    {
      id: "subagents",
      title: "Multiply yourself",
      tagline: "subagents",
      body: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          jsxProd_default(Text, {
            children:
              'Claude can spawn copies of itself to work in parallel. Ask it to "use subagents to search these 5 directories" and watch the fan-out.',
          }),
          jsxProd_default(AnimatedFrames, {
            frames: [
              `> find any error handling bugs
#\u25D0 Spawning 3 agents\u2026`,
              `#[warning:\u25D0] agent-1 \xB7 scanning api
#[warning:\u25D0] agent-2 \xB7 scanning utils
#[warning:\u25D0] agent-3 \xB7 scanning cli`,
              `#[success:\u2713] agent-1 \xB7 found reject
#[warning:\u25D0] agent-2 \xB7 scanning utils
#[success:\u2713] agent-3 \xB7 no issues`,
              `Found 2 issues:
  [suggestion:api/fetch.ts:42] unhandled
  [suggestion:utils/retry.ts:18] swallowed`,
            ],
          }),
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "Subagents run in isolated context. For true parallel sessions on separate branches, launch with ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: "claude --worktree",
              }),
              ".",
            ],
          }),
        ],
      }),
    },
    {
      id: "cross-device",
      title: "Code from anywhere",
      tagline: "/remote-control, /teleport",
      body: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          jsxProd_default_2(Text, {
            children: [
              "Run ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: "/remote-control",
              }),
              " to take this session with you and pick up right where you left off on any device. Open the Code tab in the Claude mobile app, or visit claude.ai/code in a browser. The session keeps running on this machine while your other devices act as a remote control.",
            ],
          }),
          jsxProd_default(AnimatedFrames, {
            frames: [
              `> [suggestion:/remote-control]
#\u25D0 connecting\u2026`,
              `[success:\u2713] connected
see this session at
[suggestion:claude.ai/code/abc123]`,
              `#\u2500 on your phone \u2500
#abc123 \xB7 running tests
[warning:\u25D0] 142 of 284`,
              `#\u2500 on your phone \u2500
#abc123 \xB7 [success:\u2713] all pass
> ship it`,
            ],
          }),
          jsxProd_default_2(Text, {
            children: [
              "Run ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: "/teleport",
              }),
              " to move a session between here and the cloud \u2014 send this one up to keep it going after you close the lid, or pull a cloud session into this terminal with full history.",
            ],
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: "Kick off a long task, close your laptop, check progress from your phone.",
          }),
        ],
      }),
    },
    {
      id: "model-dial",
      title: "Dial the model",
      tagline: "/model, /effort",
      body: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          jsxProd_default_2(Text, {
            children: [
              "Run ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: "/model",
              }),
              " to switch models. Fable for the hardest problems, Opus for complex work, Sonnet for most tasks, Haiku for quick questions. Each trades speed for depth.",
            ],
          }),
          jsxProd_default(AnimatedFrames, {
            frames: [
              `> [suggestion:/effort] high
#effort set to [claude:high]`,
              `> why is the list page slow?
#[claude:\u25D0 thinking deeply\u2026]`,
              `Three hypotheses, ranked:
 1. N+1 query in loader
 2. missing index on users`,
            ],
          }),
          jsxProd_default_2(Text, {
            children: [
              jsxProd_default(EffortIndicatorSymbol, {
                children: "/effort",
              }),
              " controls how long Claude thinks before answering.",
              " ",
              jsxProd_default(Highlight, {
                children: "high",
              }),
              " for tricky bugs, ",
              jsxProd_default(Highlight, {
                children: "low",
              }),
              " when you just need a quick edit.",
            ],
          }),
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "Also: ",
              jsxProd_default(EffortIndicatorSymbol, {
                children: "/fast",
              }),
              " toggles fast mode \u2014 same model, faster output.",
            ],
          }),
        ],
      }),
    },
  ];
});
//@ chunk-je0zymfm.js:13861-14177 placement
function LessonsFooterHint(props) {
  let $ = useMemoCache(3);
  let { hint } = props;
  let chord;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    chord = ["up", "down"];
    $[0] = chord;
  } else chord = $[0];
  let hintElement;
  if ($[1] !== hint) {
    hintElement = jsxProd_default(Text, {
      dimColor: true,
      italic: true,
      children: jsxProd_default_2(Byline, {
        children: [
          jsxProd_default(KeyboardShortcutHint, {
            chord,
            action: "select",
            ...hint,
          }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: "enter",
            action: "open",
            ...hint,
          }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: "escape",
            action: "close",
            ...hint,
          }),
        ],
      }),
    });
    $[1] = hint;
    $[2] = hintElement;
  } else hintElement = $[2];
  return hintElement;
}
//@ chunk-je0zymfm.js:14177-14408 placement
function LessonFooter(props) {
  let $ = useMemoCache(2);
  let { hint } = props;
  let footerElement;
  if ($[0] !== hint) {
    footerElement = jsxProd_default(Text, {
      dimColor: true,
      italic: true,
      children: jsxProd_default_2(Byline, {
        children: [
          jsxProd_default(KeyboardShortcutHint, {
            chord: "enter",
            action: "mark done",
            ...hint,
          }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: "escape",
            action: "back",
            ...hint,
          }),
        ],
      }),
    });
    $[0] = hint;
    $[1] = footerElement;
  } else footerElement = $[1];
  return footerElement;
}
//@ chunk-je0zymfm.js:14408-15740 placement
function ShiftTabHint() {
  let $ = useMemoCache(9);
  let introText;
  let modesHint;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    introText = jsxProd_default_2(Text, {
      children: [
        "Press ",
        jsxProd_default(Highlight, {
          children: "shift+tab",
        }),
        " to cycle permission modes. Each mode changes how much Claude asks before acting:",
      ],
    });
    modesHint = jsxProd_default(TeammateDetailView, {});
    $[0] = introText;
    $[1] = modesHint;
  } else {
    introText = $[0];
    modesHint = $[1];
  }
  let defaultRow;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    defaultRow = jsxProd_default_2(Text, {
      children: [
        jsxProd_default(Text, {
          color: "success",
          children: "default",
        }),
        " \u2014 ask before every edit",
      ],
    });
    $[2] = defaultRow;
  } else defaultRow = $[2];
  let acceptEditsRow;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    acceptEditsRow = jsxProd_default_2(Text, {
      children: [
        jsxProd_default(Text, {
          color: "autoAccept",
          children: "accept edits",
        }),
        " \u2014 edit freely, ask for commands",
      ],
    });
    $[3] = acceptEditsRow;
  } else acceptEditsRow = $[3];
  let autoRow;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    autoRow = jsxProd_default_2(Text, {
      children: [
        jsxProd_default(Text, {
          color: "planMode",
          children: "plan",
        }),
        " \u2014 research and propose, never touch files",
      ],
    });
    $[4] = autoRow;
  } else autoRow = $[4];
  let modesColumn;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    modesColumn = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingLeft: 2,
      children: [
        defaultRow,
        acceptEditsRow,
        autoRow,
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              color: "warning",
              children: "auto",
            }),
            " \u2014 Claude decides what is safe",
          ],
        }),
      ],
    });
    $[5] = modesColumn;
  } else modesColumn = $[5];
  let planLabel;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    planLabel = jsxProd_default(Text, {
      color: "planMode",
      children: "plan",
    });
    $[6] = planLabel;
  } else planLabel = $[6];
  let autoLabel;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    autoLabel = jsxProd_default(Text, {
      color: "warning",
      children: "auto",
    });
    $[7] = autoLabel;
  } else autoLabel = $[7];
  let bodyColumn;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    bodyColumn = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        introText,
        modesHint,
        modesColumn,
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            "Use ",
            planLabel,
            " for big refactors you want to review first. Use ",
            autoLabel,
            " for long unattended tasks. Run ",
            jsxProd_default(EffortIndicatorSymbol, {
              children: "/permissions",
            }),
            " to pre-allow specific commands so Claude stops asking about them.",
          ],
        }),
      ],
    });
    $[8] = bodyColumn;
  } else bodyColumn = $[8];
  return bodyColumn;
}
//@ chunk-je0zymfm.js:15740-15744 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-je0zymfm.js:15740", () => {
  init_react_production();
});
//@ chunk-je0zymfm.js:15744-15793 placement
function isKnownPowerup(powerupId) {
  return POWERUP_LESSONS.some((lesson) => lesson.id === powerupId);
}
//@ chunk-je0zymfm.js:15793-15870 placement
function unlockedPowerups() {
  let powerupsUnlocked = getGlobalConfig().powerupsUnlocked ?? [];
  return new Set(powerupsUnlocked.filter(isKnownPowerup));
}
//@ chunk-je0zymfm.js:15870-15893 layout
function useRedesignOff() {
  return false;
}
//@ chunk-je0zymfm.js:15893-19079 placement
/**
 * 入门能力课界面：逐课浏览、演示与完成状态。
 */
function PowerupLessons(props) {
  let $ = useMemoCache(57);
  let { onExit } = props;
  let { storageV5 } = useTheme_2();
  let [unlocked, setUnlocked] = useState(unlockedPowerups);
  let [openedLesson, setOpenedLesson] = useState(null);
  let [id, setId] = useState(POWERUP_LESSONS[0].id);
  let [showDemo, setShowDemo] = useState(false);
  let [isRedesign] = useState(useRedesignOff);
  let hint;
  if ($[0] !== isRedesign) {
    hint = stableEmptyObject(isRedesign);
    $[0] = isRedesign;
    $[1] = hint;
  } else hint = $[1];
  let hint_2 = hint;
  let hideDemo;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    hideDemo = () => setShowDemo(false);
    $[2] = hideDemo;
  } else hideDemo = $[2];
  let onDone = hideDemo;
  let openLesson;
  if ($[3] !== unlocked) {
    openLesson = function openLessonImpl(lesson) {
      setId(lesson.id);
      setOpenedLesson(lesson);
      logEvent("tengu_powerup_lesson_opened", {
        lesson_id: fromEnum(lesson.id),
        was_already_unlocked: unlocked.has(lesson.id),
        unlocked_count: unlocked.size,
      });
    };
    $[3] = unlocked;
    $[4] = openLesson;
  } else openLesson = $[4];
  let openLessonStable = openLesson;
  let completeLesson;
  if ($[5] !== storageV5 || $[6] !== unlocked) {
    completeLesson = function completeLessonImpl(lessonId) {
      if (unlocked.has(lessonId)) {
        return;
      }
      let nextUnlocked = new Set(unlocked).add(lessonId);
      setUnlocked(nextUnlocked);
      saveGlobalConfig(
        (config) => ({
          ...config,
          powerupsUnlocked: [...nextUnlocked],
        }),
        storageV5,
      );
      logEvent("tengu_powerup_lesson_completed", {
        lesson_id: fromEnum(lessonId),
        unlocked_count: nextUnlocked.size,
        all_unlocked: nextUnlocked.size === POWERUP_LESSONS.length,
      });
      if (nextUnlocked.size === POWERUP_LESSONS.length) setShowDemo(true);
    };
    $[5] = storageV5;
    $[6] = unlocked;
    $[7] = completeLesson;
  } else completeLesson = $[7];
  let completeLessonStable = completeLesson;
  let lessonOptions;
  if ($[8] !== unlocked) {
    lessonOptions = POWERUP_LESSONS.map((lesson) => {
      let isUnlocked = unlocked.has(lesson.id);
      let label = `${isUnlocked ? figures_default.tick : figures_default.circle} ${lesson.title}`;
      return {
        label: isUnlocked
          ? jsxProd_default(Text, {
              color: "success",
              children: label,
            })
          : label,
        value: lesson.id,
        description: lesson.tagline,
      };
    });
    $[8] = unlocked;
    $[9] = lessonOptions;
  } else lessonOptions = $[9];
  let options = lessonOptions;
  if (openedLesson) {
    let isUnlocked;
    if ($[10] !== unlocked || $[11] !== openedLesson.id) {
      isUnlocked = unlocked.has(openedLesson.id);
      $[10] = unlocked;
      $[11] = openedLesson.id;
      $[12] = isUnlocked;
    } else isUnlocked = $[12];
    let onDone;
    if ($[13] !== completeLessonStable || $[14] !== openedLesson.id) {
      onDone = () => {
        completeLessonStable(openedLesson.id);
        setOpenedLesson(null);
      };
      $[13] = completeLessonStable;
      $[14] = openedLesson.id;
      $[15] = onDone;
    } else onDone = $[15];
    let onBack;
    if ($[16] === MEMO_CACHE_SENTINEL) {
      onBack = () => setOpenedLesson(null);
      $[16] = onBack;
    } else onBack = $[16];
    let qrCode;
    if (
      $[17] !== hint_2 ||
      $[18] !== isRedesign ||
      $[19] !== isUnlocked ||
      $[20] !== onDone ||
      $[21] !== openedLesson
    ) {
      qrCode = jsxProd_default(MobileQRCode, {
        lesson: openedLesson,
        isUnlocked,
        isRedesign,
        hint: hint_2,
        onDone,
        onBack,
      });
      $[17] = hint_2;
      $[18] = isRedesign;
      $[19] = isUnlocked;
      $[20] = onDone;
      $[21] = openedLesson;
      $[22] = qrCode;
    } else qrCode = $[22];
    return qrCode;
  }
  let allUnlocked = unlocked.size === POWERUP_LESSONS.length;
  let titleText = allUnlocked ? "All powered up" : "Power-ups";
  let header;
  if ($[23] !== allUnlocked || $[24] !== isRedesign || $[25] !== titleText) {
    header =
      !isRedesign &&
      (allUnlocked
        ? jsxProd_default(TypewriterText, {
            text: titleText,
          })
        : jsxProd_default(Text, {
            bold: true,
            color: "claude",
            children: titleText,
          }));
    $[23] = allUnlocked;
    $[24] = isRedesign;
    $[25] = titleText;
    $[26] = header;
  } else header = $[26];
  const counterSpacer = !isRedesign && " ";
  let counter;
  if ($[27] !== counterSpacer || $[28] !== unlocked.size) {
    counter = jsxProd_default_2(Text, {
      dimColor: true,
      children: [counterSpacer, unlocked.size, "/", POWERUP_LESSONS.length, " unlocked", " "],
    });
    $[27] = counterSpacer;
    $[28] = unlocked.size;
    $[29] = counter;
  } else counter = $[29];
  const ratio = unlocked.size / POWERUP_LESSONS.length;
  let progressBar;
  if ($[30] !== ratio) {
    progressBar = jsxProd_default(ProgressBar, {
      ratio,
      width: 16,
      fillColor: "claude",
      emptyColor: "inactive",
    });
    $[30] = ratio;
    $[31] = progressBar;
  } else progressBar = $[31];
  let headerBox;
  if ($[32] !== progressBar || $[33] !== header || $[34] !== counter) {
    headerBox = jsxProd_default_2(Box, {
      marginBottom: 1,
      children: [header, counter, progressBar],
    });
    $[32] = progressBar;
    $[33] = header;
    $[34] = counter;
    $[35] = headerBox;
  } else headerBox = $[35];
  const children = allUnlocked
    ? "Now go build something."
    : "Each power-up teaches one thing Claude Code can do that most people miss. Open one, read it, try it, mark it done.";
  let introBox;
  if ($[36] !== children) {
    introBox = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap",
        children,
      }),
    });
    $[36] = children;
    $[37] = introBox;
  } else introBox = $[37];
  let onChange;
  if ($[38] !== openLessonStable) {
    onChange = (lessonId) => {
      let found = POWERUP_LESSONS.find((lesson) => lesson.id === lessonId);
      if (found) openLessonStable(found);
    };
    $[38] = openLessonStable;
    $[39] = onChange;
  } else onChange = $[39];
  let onCancel;
  if ($[40] !== onExit) {
    onCancel = () => onExit("Power-ups closed");
    $[40] = onExit;
    $[41] = onCancel;
  } else onCancel = $[41];
  let selector;
  if ($[42] !== options || $[43] !== id || $[44] !== onChange || $[45] !== onCancel) {
    selector = jsxProd_default(ModelSelector, {
      options,
      hideIndexes: true,
      visibleOptionCount: POWERUP_LESSONS.length,
      defaultFocusValue: id,
      onChange,
      onCancel,
    });
    $[42] = options;
    $[43] = id;
    $[44] = onChange;
    $[45] = onCancel;
    $[46] = selector;
  } else selector = $[46];
  let footerHint;
  if ($[47] !== hint_2) {
    footerHint = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(LessonsFooterHint, {
        hint: hint_2,
      }),
    });
    $[47] = hint_2;
    $[48] = footerHint;
  } else footerHint = $[48];
  let demo;
  if ($[49] !== showDemo) {
    demo =
      showDemo &&
      jsxProd_default(ModeCycleDemo, {
        onDone,
      });
    $[49] = showDemo;
    $[50] = demo;
  } else demo = $[50];
  let pane;
  if (
    $[51] !== headerBox ||
    $[52] !== introBox ||
    $[53] !== selector ||
    $[54] !== footerHint ||
    $[55] !== demo
  ) {
    let children = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [headerBox, introBox, selector, footerHint, demo],
    });
    pane = jsxProd_default(Pane, {
      color: "claude",
      children,
    });
    $[51] = headerBox;
    $[52] = introBox;
    $[53] = selector;
    $[54] = footerHint;
    $[55] = demo;
    $[56] = pane;
  } else pane = $[56];
  return pane;
}
export { PERMISSION_MODE_STEPS, nextModeIndex, LessonFrame, PowerupLessons, POWERUP_LESSONS, LessonFooter };
