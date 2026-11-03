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
import { j, y } from "../../../vendor/react/cjs/react.production.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  Wx,
  HALF_CIRCLE,
  AOt,
  PAUSE_GLYPH,
  DIAMOND_GLYPH,
  BLACK_CIRCLE,
} from "../../utils/permissions/autoModeRulesPrompt.js";
import { isReducedMotion } from "../Spinner/spinnerFlags.js";
import { qd } from "../../hooks/useSettings.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { wz } from "../Spinner/spinnerStatus.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { computeShimmerSegments } from "../../bridge/bridgeStatusUtil.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { TeammateDetailView } from "../teams/TeamsDialog.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { Me } from "../design-system/ThemeProvider.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { MobileQRCode } from "../../commands/powerup/powerup.js";
import { ProgressBar } from "../design-system/ProgressBar.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { Pane } from "../design-system/Pane.js";

//@ chunk-19dk83fw.js:1083-1087 placement
j();
//@ chunk-19dk83fw.js:1087-1130 placement
function Jo(R) {
  return R.split(
    `
`,
  ).map(parseKeyChord);
}
//@ chunk-19dk83fw.js:1130-1193 placement
function Go(C, A) {
  return e(Text, { color: C.color, children: C.text }, A);
}
//@ chunk-19dk83fw.js:1193-1269 placement
function Xo(k, U) {
  return e(Text, { dimColor: k.dim, children: k.segments.map(Go) }, U);
}
//@ chunk-19dk83fw.js:1269-1292 placement
function Qo() {
  return [];
}
//@ chunk-19dk83fw.js:1292-1328 placement
function Wo(Be, ce) {
  return Be.x - ce.x;
}
//@ chunk-19dk83fw.js:1328-1529 placement
function renderSparkRow(E, He) {
  let M = 0;
  return e(
    Box,
    {
      height: 1,
      children: E.map((N, Y) => {
        let max = Math.max(0, N.x - M);
        return (
          (M = Math.max(M, N.x) + 1),
          r(Text, { children: [" ".repeat(max), e(Text, { color: N.color, children: N.char })] }, Y)
        );
      }),
    },
    He,
  );
}
//@ chunk-19dk83fw.js:1529-1565 placement
function nextModeIndex(d) {
  return (d + 1) % PERMISSION_MODE_STEPS.length;
}
//@ chunk-19dk83fw.js:1565-1585 placement
var F = 3000,
  V = 48,
  J = 3;
//@ chunk-19dk83fw.js:1585-2169 placement
function LessonFrame(p) {
  let u = w(10),
    { live: live, boxRef: boxRef, children: children } = p,
    i;
  if (u[0] !== children)
    ((i = e(Box, { flexDirection: "column", width: V - 4, height: J, children: children })),
      (u[0] = children),
      (u[1] = i));
  else i = u[1];
  const x = !live,
    g = live ? "claude" : void 0,
    h = live ? `${Wx} try it` : `  ${HALF_CIRCLE} demo`;
  let f;
  if (u[2] !== x || u[3] !== g || u[4] !== h)
    ((f = e(Box, {
      position: "absolute",
      marginLeft: V - 12,
      children: e(Text, { dimColor: x, color: g, children: h }),
    })),
      (u[2] = x),
      (u[3] = g),
      (u[4] = h),
      (u[5] = f));
  else f = u[5];
  let b;
  if (u[6] !== boxRef || u[7] !== i || u[8] !== f)
    ((b = r(Box, {
      ref: boxRef,
      borderStyle: "round",
      borderColor: "inactive",
      paddingX: 1,
      width: V,
      height: J + 2,
      children: [i, f],
    })),
      (u[6] = boxRef),
      (u[7] = i),
      (u[8] = f),
      (u[9] = b));
  else b = u[9];
  return b;
}
//@ chunk-19dk83fw.js:2169-2198 placement
var io = /\[(\w+):([^\]]*)\]/g;
//@ chunk-19dk83fw.js:2198-2491 placement
function parseKeyChord(p) {
  let startsWith = p.startsWith("#"),
    l = startsWith ? p.slice(1) : p,
    o = [],
    u = 0;
  for (let i of l.matchAll(io)) {
    if (i.index > u) o.push({ text: l.slice(u, i.index) });
    (o.push({ text: i[2], color: i[1] }), (u = i.index + i[0].length));
  }
  if (u < l.length) o.push({ text: l.slice(u) });
  if (o.length === 0) o.push({ text: "" });
  return { dim: startsWith, segments: o };
}
//@ chunk-19dk83fw.js:2491-2764 placement
function AnimatedFrames(p) {
  let b = w(4),
    { frames: frames } = p,
    mapped = frames.map(Jo),
    o = isReducedMotion(qd().prefersReducedMotion),
    [u, i] = useAnimationFrame(o ? null : F),
    x = Math.floor(i / F) % mapped.length,
    g = mapped[x];
  const h = LessonFrame,
    mapped_2 = g.map(Xo);
  let d;
  if (b[0] !== h || b[1] !== u || b[2] !== mapped_2)
    ((d = e(h, { boxRef: u, children: mapped_2 })), (b[0] = h), (b[1] = u), (b[2] = mapped_2), (b[3] = d));
  else d = b[3];
  return d;
}
//@ chunk-19dk83fw.js:2764-3087 placement
var PERMISSION_MODE_STEPS = [
    { label: "default", symbol: "", color: "text" },
    { label: "accept edits on", symbol: AOt, color: "autoAccept" },
    { label: "plan mode on", symbol: PAUSE_GLYPH, color: "planMode" },
    { label: "auto mode on", symbol: AOt, color: "warning" },
  ],
  G = 80,
  ze = 60,
  W = 1400,
  L = 16,
  Ke = 60,
  Re = 100,
  go = [Wx, DIAMOND_GLYPH, BLACK_CIRCLE, "\xB7"],
  yo = ["claude", "success", "warning", "suggestion", "autoAccept"];
//@ chunk-19dk83fw.js:3087-3258 placement
function createSparks(p) {
  let t = [];
  for (let l = 0; l < p; l++)
    t.push({
      x: Math.floor(Math.random() * Re),
      delay: Math.random() * 400,
      speed: 0.7 + Math.random() * 0.6,
      char: wz(go),
      color: wz(yo),
    });
  return t;
}
//@ chunk-19dk83fw.js:3258-3817 placement
function ModeCycleDemo(p) {
  let l = w(6),
    { onDone: onDone } = p,
    o;
  if (l[0] === MEMO_CACHE_SENTINEL) ((o = createSparks(40)), (l[0] = o));
  else o = l[0];
  let u = o,
    i = isReducedMotion(qd().prefersReducedMotion),
    [x, g] = useAnimationFrame(i ? null : ze),
    [h] = y(g),
    f = g - h,
    b;
  if (l[1] !== onDone) ((b = [onDone]), (l[1] = onDone), (l[2] = b));
  else b = l[2];
  useTimeout(onDone, W + 600, b);
  let d;
  if (l[3] !== f || l[4] !== x) {
    let list = Array.from({ length: L }, Qo);
    for (const C of u) {
      let max = Math.max(0, f - C.delay);
      let floored = Math.floor((max / W) * L * C.speed);
      if (floored >= 0 && floored < L) list[floored].push(C);
    }
    for (const U of list) U.sort(Wo);
    d = e(Box, {
      ref: x,
      position: "absolute",
      marginLeft: Ke,
      flexDirection: "column",
      width: Re,
      height: L,
      children: list.map(renderSparkRow),
    });
    ((l[3] = f), (l[4] = x), (l[5] = d));
  } else d = l[5];
  return d;
}
//@ chunk-19dk83fw.js:3817-4454 placement
function TypewriterText(p) {
  let h = w(14),
    { text: text } = p,
    l = bunStringWidth(text),
    o = isReducedMotion(qd().prefersReducedMotion),
    [u, i] = useAnimationFrame(o ? null : G),
    x = l + 20,
    g = (Math.floor(i / G) % x) - 10,
    f;
  if (h[0] !== g || h[1] !== text)
    ((f = computeShimmerSegments(text, g)), (h[0] = g), (h[1] = text), (h[2] = f));
  else f = h[2];
  let { before: before, shimmer: shimmer, after: after } = f,
    C;
  if (h[3] !== before)
    ((C = e(Text, { bold: !0, color: "claude", children: before })), (h[3] = before), (h[4] = C));
  else C = h[4];
  let A;
  if (h[5] !== shimmer)
    ((A = e(Text, { bold: !0, color: "claudeShimmer", children: shimmer })), (h[5] = shimmer), (h[6] = A));
  else A = h[6];
  let k;
  if (h[7] !== after)
    ((k = e(Text, { bold: !0, color: "claude", children: after })), (h[7] = after), (h[8] = k));
  else k = h[8];
  let U;
  if (h[9] !== u || h[10] !== C || h[11] !== A || h[12] !== k)
    ((U = r(Box, { ref: u, children: [C, A, k] })),
      (h[9] = u),
      (h[10] = C),
      (h[11] = A),
      (h[12] = k),
      (h[13] = U));
  else U = h[13];
  return U;
}
//@ chunk-19dk83fw.js:5071-5203 placement
function Highlight(p) {
  let l = w(2),
    { children: children } = p,
    o;
  if (l[0] !== children)
    ((o = e(Text, { bold: !0, color: "claude", children: children })), (l[0] = children), (l[1] = o));
  else o = l[1];
  return o;
}
//@ chunk-19dk83fw.js:5203-5331 placement = EffortIndicatorSymbol (1)
function EffortIndicatorSymbol(t0) {
  let $ = w(2),
    { children: children } = t0,
    o;
  if ($[0] !== children)
    ((o = e(Text, { color: "suggestion", children: children })), ($[0] = children), ($[1] = o));
  else o = $[1];
  return o;
}
/**
 * 入门“能力课”列表：@ 文件、权限模式、计划模式等，每课含标题、标语与演示内容。
 */
//@ chunk-19dk83fw.js:5331-13826 placement
var POWERUP_LESSONS = [
  {
    id: "at-mentions",
    title: "Talk to your codebase",
    tagline: "@ files, line refs",
    body: r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        r(Text, {
          children: [
            "Type ",
            e(Highlight, { children: "@" }),
            " anywhere in your prompt to fuzzy-find and attach a file. Claude reads it before answering \u2014 no more pasting code.",
          ],
        }),
        e(AnimatedFrames, {
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
        r(Text, {
          children: [
            "Reference specific lines with ",
            e(EffortIndicatorSymbol, { children: "src/app.ts:42" }),
            " and Claude jumps straight there. Works in both directions: Claude cites files the same way, so you can click to open them in your editor.",
          ],
        }),
        r(Text, {
          dimColor: !0,
          children: [
            "Also try: ",
            e(EffortIndicatorSymbol, { children: "@folder/" }),
            " to attach a whole directory tree.",
          ],
        }),
      ],
    }),
  },
  { id: "modes", title: "Steer with modes", tagline: "shift+tab, plan, auto", body: e(ShiftTabHint, {}) },
  {
    id: "undo",
    title: "Undo anything",
    tagline: "/rewind, Esc-Esc",
    body: r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        r(Text, {
          children: [
            "Claude checkpoints your files before every edit. Press",
            " ",
            e(Highlight, { children: "Esc Esc" }),
            " (double-tap) to open ",
            e(EffortIndicatorSymbol, { children: "/rewind" }),
            " and roll back to any prior state \u2014 code, conversation, or both.",
          ],
        }),
        e(AnimatedFrames, {
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
        e(Text, {
          children:
            "Went down the wrong path? Rewind to before the detour and try a different prompt. Your git history stays clean.",
        }),
        r(Text, {
          dimColor: !0,
          children: [
            "Also: ",
            e(EffortIndicatorSymbol, { children: "/clear" }),
            " wipes conversation but keeps files.",
            " ",
            e(EffortIndicatorSymbol, { children: "/branch" }),
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
    body: r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        r(Text, {
          children: [
            "Long builds and test suites do not have to block you. Add",
            " ",
            e(Highlight, { children: "&" }),
            " to any bash command and it runs in the background \u2014 you keep chatting, Claude notifies you when it finishes.",
          ],
        }),
        e(AnimatedFrames, {
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
        r(Text, {
          children: [
            "Run ",
            e(EffortIndicatorSymbol, { children: "/tasks" }),
            " to see everything in flight. Claude can read task output mid-run and react to failures automatically.",
          ],
        }),
        e(Text, { dimColor: !0, children: "Subagents also run as tasks \u2014 it is all one queue." }),
      ],
    }),
  },
  {
    id: "memory",
    title: "Teach Claude your rules",
    tagline: "CLAUDE.md, /memory",
    body: r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        r(Text, {
          children: [
            "Drop a ",
            e(EffortIndicatorSymbol, { children: "CLAUDE.md" }),
            " file in your repo and Claude reads it at the start of every session. Put your conventions there: test commands, style rules, do-not-touch directories.",
          ],
        }),
        e(AnimatedFrames, {
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
        r(Text, {
          children: [
            "Run ",
            e(EffortIndicatorSymbol, { children: "/init" }),
            " to generate a starter CLAUDE.md from your codebase. Run ",
            e(EffortIndicatorSymbol, { children: "/memory" }),
            " to edit it inline.",
          ],
        }),
        e(Text, {
          dimColor: !0,
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
    body: r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        r(Text, {
          children: [
            "MCP servers give Claude new tools: read your Slack, query your database, control your browser. Run ",
            e(EffortIndicatorSymbol, { children: "/mcp" }),
            " to browse and connect servers.",
          ],
        }),
        e(AnimatedFrames, {
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
        e(Text, {
          children:
            'Once connected, tools appear automatically \u2014 ask Claude to "check my calendar" or "search our Notion" and it just works.',
        }),
        r(Text, {
          dimColor: !0,
          children: [
            "From your shell:",
            " ",
            e(EffortIndicatorSymbol, { children: "claude mcp add my-server -- npx some-mcp-pkg" }),
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
    body: r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        r(Text, {
          children: [
            "Save a prompt to ",
            e(EffortIndicatorSymbol, { children: ".claude/skills/deploy/SKILL.md" }),
            " and it becomes ",
            e(EffortIndicatorSymbol, { children: "/deploy" }),
            " \u2014 type it, Claude runs it. Run",
            " ",
            e(EffortIndicatorSymbol, { children: "/skills" }),
            " to see what you have.",
          ],
        }),
        e(AnimatedFrames, {
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
        r(Text, {
          children: [
            "Hooks run your own scripts on events: before a tool call, after a response, on session start. Use them to enforce rules, log activity, or inject context. Run ",
            e(EffortIndicatorSymbol, { children: "/hooks" }),
            " to see what fires when.",
          ],
        }),
        r(Text, {
          dimColor: !0,
          children: [
            "Run ",
            e(EffortIndicatorSymbol, { children: "/install-github-app" }),
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
    body: r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        e(Text, {
          children:
            'Claude can spawn copies of itself to work in parallel. Ask it to "use subagents to search these 5 directories" and watch the fan-out.',
        }),
        e(AnimatedFrames, {
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
        r(Text, {
          dimColor: !0,
          children: [
            "Subagents run in isolated context. For true parallel sessions on separate branches, launch with ",
            e(EffortIndicatorSymbol, { children: "claude --worktree" }),
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
    body: r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        r(Text, {
          children: [
            "Run ",
            e(EffortIndicatorSymbol, { children: "/remote-control" }),
            " to take this session with you and pick up right where you left off on any device. Open the Code tab in the Claude mobile app, or visit claude.ai/code in a browser. The session keeps running on this machine while your other devices act as a remote control.",
          ],
        }),
        e(AnimatedFrames, {
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
        r(Text, {
          children: [
            "Run ",
            e(EffortIndicatorSymbol, { children: "/teleport" }),
            " to move a session between here and the cloud \u2014 send this one up to keep it going after you close the lid, or pull a cloud session into this terminal with full history.",
          ],
        }),
        e(Text, {
          dimColor: !0,
          children: "Kick off a long task, close your laptop, check progress from your phone.",
        }),
      ],
    }),
  },
  {
    id: "model-dial",
    title: "Dial the model",
    tagline: "/model, /effort",
    body: r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        r(Text, {
          children: [
            "Run ",
            e(EffortIndicatorSymbol, { children: "/model" }),
            " to switch models. Fable for the hardest problems, Opus for complex work, Sonnet for most tasks, Haiku for quick questions. Each trades speed for depth.",
          ],
        }),
        e(AnimatedFrames, {
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
        r(Text, {
          children: [
            e(EffortIndicatorSymbol, { children: "/effort" }),
            " controls how long Claude thinks before answering.",
            " ",
            e(Highlight, { children: "high" }),
            " for tricky bugs, ",
            e(Highlight, { children: "low" }),
            " when you just need a quick edit.",
          ],
        }),
        r(Text, {
          dimColor: !0,
          children: [
            "Also: ",
            e(EffortIndicatorSymbol, { children: "/fast" }),
            " toggles fast mode \u2014 same model, faster output.",
          ],
        }),
      ],
    }),
  },
];
//@ chunk-19dk83fw.js:13826-14067 placement
function LessonsFooterHint() {
  let p = w(1),
    t;
  if (p[0] === MEMO_CACHE_SENTINEL)
    ((t = e(Text, {
      dimColor: !0,
      italic: !0,
      children: r(Byline, {
        children: [
          e(KeyboardShortcutHint, { chord: ["up", "down"], action: "select" }),
          e(KeyboardShortcutHint, { chord: "enter", action: "open" }),
          e(KeyboardShortcutHint, { chord: "escape", action: "close" }),
        ],
      }),
    })),
      (p[0] = t));
  else t = p[0];
  return t;
}
//@ chunk-19dk83fw.js:14067-14269 placement
function LessonFooter() {
  let p = w(1),
    t;
  if (p[0] === MEMO_CACHE_SENTINEL)
    ((t = e(Text, {
      dimColor: !0,
      italic: !0,
      children: r(Byline, {
        children: [
          e(KeyboardShortcutHint, { chord: "enter", action: "mark done" }),
          e(KeyboardShortcutHint, { chord: "escape", action: "back" }),
        ],
      }),
    })),
      (p[0] = t));
  else t = p[0];
  return t;
}
//@ chunk-19dk83fw.js:14269-15601 placement
function ShiftTabHint() {
  let p = w(9),
    t,
    l;
  if (p[0] === MEMO_CACHE_SENTINEL)
    ((t = r(Text, {
      children: [
        "Press ",
        e(Highlight, { children: "shift+tab" }),
        " to cycle permission modes. Each mode changes how much Claude asks before acting:",
      ],
    })),
      (l = e(TeammateDetailView, {})),
      (p[0] = t),
      (p[1] = l));
  else ((t = p[0]), (l = p[1]));
  let o;
  if (p[2] === MEMO_CACHE_SENTINEL)
    ((o = r(Text, {
      children: [e(Text, { color: "success", children: "default" }), " \u2014 ask before every edit"],
    })),
      (p[2] = o));
  else o = p[2];
  let u;
  if (p[3] === MEMO_CACHE_SENTINEL)
    ((u = r(Text, {
      children: [
        e(Text, { color: "autoAccept", children: "accept edits" }),
        " \u2014 edit freely, ask for commands",
      ],
    })),
      (p[3] = u));
  else u = p[3];
  let i;
  if (p[4] === MEMO_CACHE_SENTINEL)
    ((i = r(Text, {
      children: [
        e(Text, { color: "planMode", children: "plan" }),
        " \u2014 research and propose, never touch files",
      ],
    })),
      (p[4] = i));
  else i = p[4];
  let x;
  if (p[5] === MEMO_CACHE_SENTINEL)
    ((x = r(Box, {
      flexDirection: "column",
      paddingLeft: 2,
      children: [
        o,
        u,
        i,
        r(Text, {
          children: [e(Text, { color: "warning", children: "auto" }), " \u2014 Claude decides what is safe"],
        }),
      ],
    })),
      (p[5] = x));
  else x = p[5];
  let g;
  if (p[6] === MEMO_CACHE_SENTINEL) ((g = e(Text, { color: "planMode", children: "plan" })), (p[6] = g));
  else g = p[6];
  let h;
  if (p[7] === MEMO_CACHE_SENTINEL) ((h = e(Text, { color: "warning", children: "auto" })), (p[7] = h));
  else h = p[7];
  let f;
  if (p[8] === MEMO_CACHE_SENTINEL)
    ((f = r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        t,
        l,
        x,
        r(Text, {
          dimColor: !0,
          children: [
            "Use ",
            g,
            " for big refactors you want to review first. Use ",
            h,
            " for long unattended tasks. Run ",
            e(EffortIndicatorSymbol, { children: "/permissions" }),
            " to pre-allow specific commands so Claude stops asking about them.",
          ],
        }),
      ],
    })),
      (p[8] = f));
  else f = p[8];
  return f;
}
//@ chunk-19dk83fw.js:15601-15605 placement
j();
//@ chunk-19dk83fw.js:15605-15654 placement
function kt(Rt) {
  return POWERUP_LESSONS.some((Tt) => Tt.id === Rt);
}
//@ chunk-19dk83fw.js:15654-15731 placement
function wt() {
  let Pt = getGlobalConfig().powerupsUnlocked ?? [];
  return new Set(Pt.filter(kt));
}
/**
 * 入门能力课界面：逐课浏览、演示与完成状态。
 */
//@ chunk-19dk83fw.js:15731-18639 placement
function PowerupLessons(p) {
  let d = w(48),
    { onExit: onExit } = p,
    { storageV5: storageV5 } = Me(),
    [o, u] = y(wt),
    [i, x] = y(null),
    [g, h] = y(POWERUP_LESSONS[0].id),
    [f, b] = y(!1),
    R;
  if (d[0] === MEMO_CACHE_SENTINEL) ((R = () => b(!1)), (d[0] = R));
  else R = d[0];
  let C = R,
    A;
  if (d[1] !== o)
    ((A = function U(k) {
      (h(k.id),
        x(k),
        logEvent("tengu_powerup_lesson_opened", {
          lesson_id: fromEnum(k.id),
          was_already_unlocked: o.has(k.id),
          unlocked_count: o.size,
        }));
    }),
      (d[1] = o),
      (d[2] = A));
  else A = d[2];
  let U = A,
    Be;
  if (d[3] !== storageV5 || d[4] !== o)
    ((Be = function M(ce) {
      if (o.has(ce)) {
        return;
      }
      let E = new Set(o).add(ce);
      if (
        (u(E),
        saveGlobalConfig((He) => ({ ...He, powerupsUnlocked: [...E] }), storageV5),
        logEvent("tengu_powerup_lesson_completed", {
          lesson_id: fromEnum(ce),
          unlocked_count: E.size,
          all_unlocked: E.size === POWERUP_LESSONS.length,
        }),
        E.size === POWERUP_LESSONS.length)
      )
        b(!0);
    }),
      (d[3] = storageV5),
      (d[4] = o),
      (d[5] = Be));
  else Be = d[5];
  let M = Be,
    N;
  if (d[6] !== o)
    ((N = POWERUP_LESSONS.map((Y) => {
      let Ae = o.has(Y.id);
      let Se = `${Ae ? re.tick : re.circle} ${Y.title}`;
      return {
        label: Ae ? e(Text, { color: "success", children: Se }) : Se,
        value: Y.id,
        description: Y.tagline,
      };
    })),
      (d[6] = o),
      (d[7] = N));
  else N = d[7];
  let Ue = N;
  if (i) {
    let P;
    if (d[8] !== o || d[9] !== i.id) ((P = o.has(i.id)), (d[8] = o), (d[9] = i.id), (d[10] = P));
    else P = d[10];
    let D;
    if (d[11] !== M || d[12] !== i.id)
      ((D = () => {
        (M(i.id), x(null));
      }),
        (d[11] = M),
        (d[12] = i.id),
        (d[13] = D));
    else D = d[13];
    let _;
    if (d[14] === MEMO_CACHE_SENTINEL) ((_ = () => x(null)), (d[14] = _));
    else _ = d[14];
    let I;
    if (d[15] !== P || d[16] !== D || d[17] !== i)
      ((I = e(MobileQRCode, { lesson: i, isUnlocked: P, onDone: D, onBack: _ })),
        (d[15] = P),
        (d[16] = D),
        (d[17] = i),
        (d[18] = I));
    else I = d[18];
    return I;
  }
  let de = o.size === POWERUP_LESSONS.length,
    P;
  if (d[19] !== de)
    ((P = de
      ? e(TypewriterText, { text: "All powered up" })
      : e(Text, { bold: !0, color: "claude", children: "Power-ups" })),
      (d[19] = de),
      (d[20] = P));
  else P = d[20];
  let D;
  if (d[21] !== o.size)
    ((D = r(Text, { dimColor: !0, children: [" ", o.size, "/", POWERUP_LESSONS.length, " unlocked", " "] })),
      (d[21] = o.size),
      (d[22] = D));
  else D = d[22];
  const _ = o.size / POWERUP_LESSONS.length;
  let I;
  if (d[23] !== _)
    ((I = e(ProgressBar, { ratio: _, width: 16, fillColor: "claude", emptyColor: "inactive" })),
      (d[23] = _),
      (d[24] = I));
  else I = d[24];
  let me;
  if (d[25] !== P || d[26] !== D || d[27] !== I)
    ((me = r(Box, { marginBottom: 1, children: [P, D, I] })),
      (d[25] = P),
      (d[26] = D),
      (d[27] = I),
      (d[28] = me));
  else me = d[28];
  const Ie = de
    ? "Now go build something."
    : "Each power-up teaches one thing Claude Code can do that most people miss. Open one, read it, try it, mark it done.";
  let pe;
  if (d[29] !== Ie)
    ((pe = e(Box, { marginBottom: 1, children: e(Text, { dimColor: !0, wrap: "wrap", children: Ie }) })),
      (d[29] = Ie),
      (d[30] = pe));
  else pe = d[30];
  let fe;
  if (d[31] !== U)
    ((fe = (Ct) => {
      let found = POWERUP_LESSONS.find((vt) => vt.id === Ct);
      if (found) U(found);
    }),
      (d[31] = U),
      (d[32] = fe));
  else fe = d[32];
  let he;
  if (d[33] !== onExit) ((he = () => onExit("Power-ups closed")), (d[33] = onExit), (d[34] = he));
  else he = d[34];
  let ge;
  if (d[35] !== Ue || d[36] !== g || d[37] !== fe || d[38] !== he)
    ((ge = e(ModelSelector, {
      options: Ue,
      hideIndexes: !0,
      visibleOptionCount: POWERUP_LESSONS.length,
      defaultFocusValue: g,
      onChange: fe,
      onCancel: he,
    })),
      (d[35] = Ue),
      (d[36] = g),
      (d[37] = fe),
      (d[38] = he),
      (d[39] = ge));
  else ge = d[39];
  let oo;
  if (d[40] === MEMO_CACHE_SENTINEL)
    ((oo = e(Box, { marginTop: 1, children: e(LessonsFooterHint, {}) })), (d[40] = oo));
  else oo = d[40];
  let ye;
  if (d[41] !== f) ((ye = f && e(ModeCycleDemo, { onDone: C })), (d[41] = f), (d[42] = ye));
  else ye = d[42];
  let to;
  if (d[43] !== pe || d[44] !== ge || d[45] !== ye || d[46] !== me)
    ((to = e(Pane, {
      color: "claude",
      children: r(Box, { flexDirection: "column", children: [me, pe, ge, oo, ye] }),
    })),
      (d[43] = pe),
      (d[44] = ge),
      (d[45] = ye),
      (d[46] = me),
      (d[47] = to));
  else to = d[47];
  return to;
}

export { PERMISSION_MODE_STEPS, nextModeIndex, LessonFrame, LessonFooter, PowerupLessons, POWERUP_LESSONS };
