/**
 * components/onboarding/PowerupLessons.tsx
 *
 * 2.1.316 新增：入门“能力课”界面与课程内容
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-19dk83fw.js (27)
 * attribution: placement 27
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
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { MobileQRCode } from "../../commands/powerup/powerup.js";
import { ProgressBar } from "../design-system/ProgressBar.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { Pane } from "../design-system/Pane.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-19dk83fw.js:1083-1087 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-19dk83fw.js:1083", () => {
  init_react_production();
});
//@ chunk-19dk83fw.js:1087-1130 placement
function splitSegments(text) {
  return text
    .split(
      `
`,
    )
    .map(parseKeyChord);
}
//@ chunk-19dk83fw.js:1130-1193 placement
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
//@ chunk-19dk83fw.js:1193-1269 placement
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
//@ chunk-19dk83fw.js:1269-1292 placement
function emptyLines() {
  return [];
}
//@ chunk-19dk83fw.js:1292-1328 placement
function compareX(a, b) {
  return a.x - b.x;
}
//@ chunk-19dk83fw.js:1328-1529 placement
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
//@ chunk-19dk83fw.js:1529-1565 placement
function nextModeIndex(modeIndex) {
  return (modeIndex + 1) % PERMISSION_MODE_STEPS.length;
}
//@ chunk-19dk83fw.js:1565-1585 placement
var LESSON_STEP_MS = 3000;
var LESSON_WIDTH = 48;
var LESSON_STEP_COUNT = 3;
//@ chunk-19dk83fw.js:1585-2169 placement
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
//@ chunk-19dk83fw.js:2169-2198 placement
var TYPING_MARKER_RE = /\[(\w+):([^\]]*)\]/g;
//@ chunk-19dk83fw.js:2198-2491 placement
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
//@ chunk-19dk83fw.js:2491-2764 placement
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
//@ chunk-19dk83fw.js:2764-3087 placement
var PERMISSION_MODE_STEPS; // deferred: uses BLACK_CIRCLE (../../constants/figures.js) of its import cycle while loading; runs once the cycle is complete
var POWERUP_MAX_WIDTH;
var POWERUP_LABEL_WIDTH;
var POWERUP_ANIM_MS;
var POWERUP_MAX_ROWS;
var POWERUP_MIN_ROWS;
var POWERUP_GLYPH_COUNT;
var POWERUP_GLYPHS;
var POWERUP_COLORS;
deferInit("chunk-19dk83fw.js:2764", () => {
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
//@ chunk-19dk83fw.js:3087-3258 placement
function createSparks(count) {
  let sparks = [];
  for (let i = 0; i < count; i++)
    sparks.push({
      x: Math.floor(Math.random() * POWERUP_GLYPH_COUNT),
      delay: Math.random() * 400,
      speed: 0.7 + Math.random() * 0.6,
      char: sampleAlias(POWERUP_GLYPHS),
      color: sampleAlias(POWERUP_COLORS),
    });
  return sparks;
}
//@ chunk-19dk83fw.js:3258-3817 placement
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
//@ chunk-19dk83fw.js:3817-4454 placement
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
//@ chunk-19dk83fw.js:5071-5203 placement
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
//@ chunk-19dk83fw.js:5203-5331 placement = EffortIndicatorSymbol (1)
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
//@ chunk-19dk83fw.js:5331-13826 placement
/**
 * 入门“能力课”列表：@ 文件、权限模式、计划模式等，每课含标题、标语与演示内容。
 */
var POWERUP_LESSONS; // deferred: uses Box (../../ink/components/Text.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-19dk83fw.js:5331", () => {
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
//@ chunk-19dk83fw.js:13826-14067 placement
function LessonsFooterHint() {
  let $ = useMemoCache(1);
  let hintElement;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    hintElement = jsxProd_default(Text, {
      dimColor: true,
      italic: true,
      children: jsxProd_default_2(Byline, {
        children: [
          jsxProd_default(KeyboardShortcutHint, {
            chord: ["up", "down"],
            action: "select",
          }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: "enter",
            action: "open",
          }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: "escape",
            action: "close",
          }),
        ],
      }),
    });
    $[0] = hintElement;
  } else hintElement = $[0];
  return hintElement;
}
//@ chunk-19dk83fw.js:14067-14269 placement
function LessonFooter() {
  let $ = useMemoCache(1);
  let footerElement;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    footerElement = jsxProd_default(Text, {
      dimColor: true,
      italic: true,
      children: jsxProd_default_2(Byline, {
        children: [
          jsxProd_default(KeyboardShortcutHint, {
            chord: "enter",
            action: "mark done",
          }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: "escape",
            action: "back",
          }),
        ],
      }),
    });
    $[0] = footerElement;
  } else footerElement = $[0];
  return footerElement;
}
//@ chunk-19dk83fw.js:14269-15601 placement
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
//@ chunk-19dk83fw.js:15601-15605 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-19dk83fw.js:15601", () => {
  init_react_production();
});
//@ chunk-19dk83fw.js:15605-15654 placement
function isKnownPowerup(powerupId) {
  return POWERUP_LESSONS.some((lesson) => lesson.id === powerupId);
}
//@ chunk-19dk83fw.js:15654-15731 placement
function unlockedPowerups() {
  let powerupsUnlocked = getGlobalConfig().powerupsUnlocked ?? [];
  return new Set(powerupsUnlocked.filter(isKnownPowerup));
}
//@ chunk-19dk83fw.js:15731-18639 placement
/**
 * 入门能力课界面：逐课浏览、演示与完成状态。
 */
function PowerupLessons(props) {
  let $ = useMemoCache(48);
  let { onExit } = props;
  let { storageV5 } = useTheme_2();
  let [unlocked, setUnlocked] = useState(unlockedPowerups);
  let [openedLesson, setOpenedLesson] = useState(null);
  let [id, setId] = useState(POWERUP_LESSONS[0].id);
  let [showDemo, setShowDemo] = useState(false);
  let hideDemo;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    hideDemo = () => setShowDemo(false);
    $[0] = hideDemo;
  } else hideDemo = $[0];
  let onDone = hideDemo;
  let openLesson;
  if ($[1] !== unlocked) {
    openLesson = function openLessonImpl(lesson) {
      setId(lesson.id);
      setOpenedLesson(lesson);
      logEvent("tengu_powerup_lesson_opened", {
        lesson_id: fromEnum(lesson.id),
        was_already_unlocked: unlocked.has(lesson.id),
        unlocked_count: unlocked.size,
      });
    };
    $[1] = unlocked;
    $[2] = openLesson;
  } else openLesson = $[2];
  let openLessonStable = openLesson;
  let completeLesson;
  if ($[3] !== storageV5 || $[4] !== unlocked) {
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
    $[3] = storageV5;
    $[4] = unlocked;
    $[5] = completeLesson;
  } else completeLesson = $[5];
  let completeLessonStable = completeLesson;
  let lessonOptions;
  if ($[6] !== unlocked) {
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
    $[6] = unlocked;
    $[7] = lessonOptions;
  } else lessonOptions = $[7];
  let options = lessonOptions;
  if (openedLesson) {
    let isUnlocked;
    if ($[8] !== unlocked || $[9] !== openedLesson.id) {
      isUnlocked = unlocked.has(openedLesson.id);
      $[8] = unlocked;
      $[9] = openedLesson.id;
      $[10] = isUnlocked;
    } else isUnlocked = $[10];
    let onDone;
    if ($[11] !== completeLessonStable || $[12] !== openedLesson.id) {
      onDone = () => {
        completeLessonStable(openedLesson.id);
        setOpenedLesson(null);
      };
      $[11] = completeLessonStable;
      $[12] = openedLesson.id;
      $[13] = onDone;
    } else onDone = $[13];
    let onBack;
    if ($[14] === MEMO_CACHE_SENTINEL) {
      onBack = () => setOpenedLesson(null);
      $[14] = onBack;
    } else onBack = $[14];
    let qrCode;
    if ($[15] !== isUnlocked || $[16] !== onDone || $[17] !== openedLesson) {
      qrCode = jsxProd_default(MobileQRCode, {
        lesson: openedLesson,
        isUnlocked,
        onDone,
        onBack,
      });
      $[15] = isUnlocked;
      $[16] = onDone;
      $[17] = openedLesson;
      $[18] = qrCode;
    } else qrCode = $[18];
    return qrCode;
  }
  let allUnlocked = unlocked.size === POWERUP_LESSONS.length;
  let header;
  if ($[19] !== allUnlocked) {
    header = allUnlocked
      ? jsxProd_default(TypewriterText, {
          text: "All powered up",
        })
      : jsxProd_default(Text, {
          bold: true,
          color: "claude",
          children: "Power-ups",
        });
    $[19] = allUnlocked;
    $[20] = header;
  } else header = $[20];
  let counter;
  if ($[21] !== unlocked.size) {
    counter = jsxProd_default_2(Text, {
      dimColor: true,
      children: [" ", unlocked.size, "/", POWERUP_LESSONS.length, " unlocked", " "],
    });
    $[21] = unlocked.size;
    $[22] = counter;
  } else counter = $[22];
  const ratio = unlocked.size / POWERUP_LESSONS.length;
  let progressBar;
  if ($[23] !== ratio) {
    progressBar = jsxProd_default(ProgressBar, {
      ratio,
      width: 16,
      fillColor: "claude",
      emptyColor: "inactive",
    });
    $[23] = ratio;
    $[24] = progressBar;
  } else progressBar = $[24];
  let headerBox;
  if ($[25] !== header || $[26] !== counter || $[27] !== progressBar) {
    headerBox = jsxProd_default_2(Box, {
      marginBottom: 1,
      children: [header, counter, progressBar],
    });
    $[25] = header;
    $[26] = counter;
    $[27] = progressBar;
    $[28] = headerBox;
  } else headerBox = $[28];
  const children = allUnlocked
    ? "Now go build something."
    : "Each power-up teaches one thing Claude Code can do that most people miss. Open one, read it, try it, mark it done.";
  let introBox;
  if ($[29] !== children) {
    introBox = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap",
        children,
      }),
    });
    $[29] = children;
    $[30] = introBox;
  } else introBox = $[30];
  let onChange;
  if ($[31] !== openLessonStable) {
    onChange = (lessonId) => {
      let found = POWERUP_LESSONS.find((lesson) => lesson.id === lessonId);
      if (found) openLessonStable(found);
    };
    $[31] = openLessonStable;
    $[32] = onChange;
  } else onChange = $[32];
  let onCancel;
  if ($[33] !== onExit) {
    onCancel = () => onExit("Power-ups closed");
    $[33] = onExit;
    $[34] = onCancel;
  } else onCancel = $[34];
  let selector;
  if ($[35] !== options || $[36] !== id || $[37] !== onChange || $[38] !== onCancel) {
    selector = jsxProd_default(ModelSelector, {
      options,
      hideIndexes: true,
      visibleOptionCount: POWERUP_LESSONS.length,
      defaultFocusValue: id,
      onChange,
      onCancel,
    });
    $[35] = options;
    $[36] = id;
    $[37] = onChange;
    $[38] = onCancel;
    $[39] = selector;
  } else selector = $[39];
  let footerHint;
  if ($[40] === MEMO_CACHE_SENTINEL) {
    footerHint = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(LessonsFooterHint, {}),
    });
    $[40] = footerHint;
  } else footerHint = $[40];
  let demo;
  if ($[41] !== showDemo) {
    demo =
      showDemo &&
      jsxProd_default(ModeCycleDemo, {
        onDone,
      });
    $[41] = showDemo;
    $[42] = demo;
  } else demo = $[42];
  let pane;
  if ($[43] !== introBox || $[44] !== selector || $[45] !== demo || $[46] !== headerBox) {
    pane = jsxProd_default(Pane, {
      color: "claude",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [headerBox, introBox, selector, footerHint, demo],
      }),
    });
    $[43] = introBox;
    $[44] = selector;
    $[45] = demo;
    $[46] = headerBox;
    $[47] = pane;
  } else pane = $[47];
  return pane;
}
export { PERMISSION_MODE_STEPS, nextModeIndex, LessonFrame, LessonFooter, PowerupLessons, POWERUP_LESSONS };
