/**
 * components/LogoV2/WelcomeV2.tsx
 *
 * 首次/新版本欢迎框（"Welcome to Claude Code"），含 Apple Terminal 适配版本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/WelcomeV2.tsx
 * pieces: chunk-n1nr1qar.js (3)
 * attribution: affinity 1, fingerprint 2
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { env } from "../../utils/env.js";

//@ chunk-n1nr1qar.js:445-459 affinity
var M = 58,
  z = 30;
//@ chunk-n1nr1qar.js:459-8150 fingerprint = WelcomeV2 (0.836)
function WelcomeV2() {
  let $ = w(39),
    [O] = useTheme(),
    T = useIsScreenReaderEnabled(),
    { rows: rows } = useTerminalSize();
  if (T || rows < z) {
    let o;
    if ($[0] === MEMO_CACHE_SENTINEL)
      ((o = r(Text, { color: "claude", children: ["Welcome to Claude Code", " "] })), ($[0] = o));
    else o = $[0];
    let d;
    if ($[1] === MEMO_CACHE_SENTINEL)
      ((d = r(Text, {
        children: [
          o,
          r(Text, {
            dimColor: !0,
            children: [
              "v",
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.316",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-10-30T23:28:13Z",
                GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION,
            ],
          }),
        ],
      })),
        ($[1] = d));
    else d = $[1];
    return d;
  }
  if (env.terminal === "Apple_Terminal") {
    let o;
    if ($[2] !== O)
      ((o = e(AppleTerminalWelcomeV2, { theme: O, welcomeMessage: "Welcome to Claude Code" })),
        ($[2] = O),
        ($[3] = o));
    else o = $[3];
    return o;
  }
  if (["light", "light-daltonized", "light-ansi"].includes(O)) {
    let o;
    if ($[4] === MEMO_CACHE_SENTINEL)
      ((o = r(Text, { color: "claude", children: ["Welcome to Claude Code", " "] })), ($[4] = o));
    else o = $[4];
    let d, a, c, t, m, b, g, C, u;
    if ($[5] === MEMO_CACHE_SENTINEL)
      ((d = r(Text, {
        children: [
          o,
          r(Text, {
            dimColor: !0,
            children: [
              "v",
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.316",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-10-30T23:28:13Z",
                GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION,
              " ",
            ],
          }),
        ],
      })),
        (a = e(Text, { children: ".........................................................." })),
        (c = e(Text, { children: "                                                          " })),
        (t = e(Text, { children: "                                                          " })),
        (m = e(Text, { children: "                                                          " })),
        (b = e(Text, {
          children:
            "            \u2591\u2591\u2591\u2591\u2591\u2591                                        ",
        })),
        (g = e(Text, {
          children:
            "    \u2591\u2591\u2591   \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591                                      ",
        })),
        (C = e(Text, {
          children:
            "   \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591                                    ",
        })),
        (u = e(Text, { children: "                                                          " })),
        ($[5] = d),
        ($[6] = a),
        ($[7] = c),
        ($[8] = t),
        ($[9] = m),
        ($[10] = b),
        ($[11] = g),
        ($[12] = C),
        ($[13] = u));
    else
      ((d = $[5]),
        (a = $[6]),
        (c = $[7]),
        (t = $[8]),
        (m = $[9]),
        (b = $[10]),
        (g = $[11]),
        (C = $[12]),
        (u = $[13]));
    let y;
    if ($[14] === MEMO_CACHE_SENTINEL)
      ((y = r(Text, {
        children: [
          e(Text, { dimColor: !0, children: "                           \u2591\u2591\u2591\u2591" }),
          e(Text, { children: "                     \u2588\u2588    " }),
        ],
      })),
        ($[14] = y));
    else y = $[14];
    let _, h;
    if ($[15] === MEMO_CACHE_SENTINEL)
      ((_ = r(Text, {
        children: [
          e(Text, {
            dimColor: !0,
            children: "                         \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591",
          }),
          e(Text, { children: "               \u2588\u2588\u2592\u2592\u2588\u2588  " }),
        ],
      })),
        (h = e(Text, {
          children: "                                            \u2592\u2592      \u2588\u2588   \u2592",
        })),
        ($[15] = _),
        ($[16] = h));
    else ((_ = $[15]), (h = $[16]));
    let R;
    if ($[17] === MEMO_CACHE_SENTINEL)
      ((R = r(Text, {
        children: [
          "      ",
          e(Text, {
            color: "clawd_body",
            children: " \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 ",
          }),
          "                         \u2592\u2592\u2591\u2591\u2592\u2592      \u2592 \u2592\u2592",
        ],
      })),
        ($[17] = R));
    else R = $[17];
    let k;
    if ($[18] === MEMO_CACHE_SENTINEL)
      ((k = r(Text, {
        children: [
          "      ",
          e(Text, {
            color: "clawd_body",
            backgroundColor: "clawd_background",
            children: "\u2588\u2588\u2584\u2588\u2588\u2588\u2588\u2588\u2584\u2588\u2588",
          }),
          "                           \u2592\u2592         \u2592\u2592 ",
        ],
      })),
        ($[18] = k));
    else k = $[18];
    let f;
    if ($[19] === MEMO_CACHE_SENTINEL)
      ((f = r(Text, {
        children: [
          "      ",
          e(Text, {
            color: "clawd_body",
            children: " \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 ",
          }),
          "                          \u2591          \u2592   ",
        ],
      })),
        ($[19] = f));
    else f = $[19];
    let p;
    if ($[20] === MEMO_CACHE_SENTINEL)
      ((p = e(Box, {
        width: M,
        children: r(Box, {
          flexDirection: "column",
          children: [
            d,
            a,
            c,
            t,
            m,
            b,
            g,
            C,
            u,
            y,
            _,
            h,
            R,
            k,
            f,
            r(Text, {
              children: [
                ".......",
                e(Text, { color: "clawd_body", children: "\u2588 \u2588   \u2588 \u2588" }),
                "..........................\u2591..........\u2592....",
              ],
            }),
          ],
        }),
      })),
        ($[20] = p));
    else p = $[20];
    return p;
  }
  let o;
  if ($[21] === MEMO_CACHE_SENTINEL)
    ((o = r(Text, { color: "claude", children: ["Welcome to Claude Code", " "] })), ($[21] = o));
  else o = $[21];
  let d, a, c, t, m, b, g;
  if ($[22] === MEMO_CACHE_SENTINEL)
    ((d = r(Text, {
      children: [
        o,
        r(Text, {
          dimColor: !0,
          children: [
            "v",
            {
              ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
              PACKAGE_URL: "@anthropic-ai/claude-code",
              README_URL: "https://code.claude.com/docs/en/overview",
              VERSION: "2.1.316",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-10-30T23:28:13Z",
              GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.VERSION,
            " ",
          ],
        }),
      ],
    })),
      (a = e(Text, { children: ".........................................................." })),
      (c = e(Text, { children: "                                                          " })),
      (t = e(Text, {
        children:
          "     *                                       \u2588\u2588\u2588\u2588\u2588\u2593\u2593\u2591     ",
      })),
      (m = e(Text, {
        children:
          "                                 *         \u2588\u2588\u2588\u2593\u2591     \u2591\u2591   ",
      })),
      (b = e(Text, {
        children:
          "            \u2591\u2591\u2591\u2591\u2591\u2591                        \u2588\u2588\u2588\u2593\u2591           ",
      })),
      (g = e(Text, {
        children:
          "    \u2591\u2591\u2591   \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591                      \u2588\u2588\u2588\u2593\u2591           ",
      })),
      ($[22] = d),
      ($[23] = a),
      ($[24] = c),
      ($[25] = t),
      ($[26] = m),
      ($[27] = b),
      ($[28] = g));
  else ((d = $[22]), (a = $[23]), (c = $[24]), (t = $[25]), (m = $[26]), (b = $[27]), (g = $[28]));
  let y, _, h, C, u;
  if ($[29] === MEMO_CACHE_SENTINEL)
    ((C = r(Text, {
      children: [
        e(Text, {
          children:
            "   \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591    ",
        }),
        e(Text, { bold: !0, children: "*" }),
        e(Text, { children: "                \u2588\u2588\u2593\u2591\u2591      \u2593   " }),
      ],
    })),
      (u = e(Text, {
        children:
          "                                             \u2591\u2593\u2593\u2588\u2588\u2588\u2593\u2593\u2591    ",
      })),
      (y = e(Text, {
        dimColor: !0,
        children: " *                                 \u2591\u2591\u2591\u2591                   ",
      })),
      (_ = e(Text, {
        dimColor: !0,
        children:
          "                                 \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591                 ",
      })),
      (h = e(Text, {
        dimColor: !0,
        children:
          "                               \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591           ",
      })),
      ($[29] = y),
      ($[30] = _),
      ($[31] = h),
      ($[32] = C),
      ($[33] = u));
  else ((y = $[29]), (_ = $[30]), (h = $[31]), (C = $[32]), (u = $[33]));
  let R;
  if ($[34] === MEMO_CACHE_SENTINEL)
    ((R = e(Text, {
      color: "clawd_body",
      children: " \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 ",
    })),
      ($[34] = R));
  else R = $[34];
  let k;
  if ($[35] === MEMO_CACHE_SENTINEL)
    ((k = r(Text, {
      children: [
        "      ",
        R,
        "                                       ",
        e(Text, { dimColor: !0, children: "*" }),
        e(Text, { children: " " }),
      ],
    })),
      ($[35] = k));
  else k = $[35];
  let f;
  if ($[36] === MEMO_CACHE_SENTINEL)
    ((f = r(Text, {
      children: [
        "      ",
        e(Text, {
          color: "clawd_body",
          children: "\u2588\u2588\u2584\u2588\u2588\u2588\u2588\u2588\u2584\u2588\u2588",
        }),
        e(Text, { children: "                        " }),
        e(Text, { bold: !0, children: "*" }),
        e(Text, { children: "                " }),
      ],
    })),
      ($[36] = f));
  else f = $[36];
  let p;
  if ($[37] === MEMO_CACHE_SENTINEL)
    ((p = r(Text, {
      children: [
        "      ",
        e(Text, {
          color: "clawd_body",
          children: " \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 ",
        }),
        "     *                                   ",
      ],
    })),
      ($[37] = p));
  else p = $[37];
  let N;
  if ($[38] === MEMO_CACHE_SENTINEL)
    ((N = e(Box, {
      width: M,
      children: r(Box, {
        flexDirection: "column",
        children: [
          d,
          a,
          c,
          t,
          m,
          b,
          g,
          C,
          u,
          y,
          _,
          h,
          k,
          f,
          p,
          r(Text, {
            children: [
              ".......",
              e(Text, { color: "clawd_body", children: "\u2588 \u2588   \u2588 \u2588" }),
              "..........................................",
            ],
          }),
        ],
      }),
    })),
      ($[38] = N));
  else N = $[38];
  return N;
}
//@ chunk-n1nr1qar.js:8150-15429 fingerprint = AppleTerminalWelcomeV2 (0.832)
function AppleTerminalWelcomeV2(t0) {
  let $ = w(44),
    { theme: theme, welcomeMessage: welcomeMessage } = t0;
  if (["light", "light-daltonized", "light-ansi"].includes(theme)) {
    let d;
    if ($[0] !== welcomeMessage)
      ((d = r(Text, { color: "claude", children: [welcomeMessage, " "] })),
        ($[0] = welcomeMessage),
        ($[1] = d));
    else d = $[1];
    let a;
    if ($[2] === MEMO_CACHE_SENTINEL)
      ((a = r(Text, {
        dimColor: !0,
        children: [
          "v",
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION,
          " ",
        ],
      })),
        ($[2] = a));
    else a = $[2];
    let c;
    if ($[3] !== d) ((c = r(Text, { children: [d, a] })), ($[3] = d), ($[4] = c));
    else c = $[4];
    let t, m, b, g, C, u, y, _;
    if ($[5] === MEMO_CACHE_SENTINEL)
      ((b = e(Text, { children: ".........................................................." })),
        (g = e(Text, { children: "                                                          " })),
        (C = e(Text, { children: "                                                          " })),
        (u = e(Text, { children: "                                                          " })),
        (y = e(Text, {
          children:
            "            \u2591\u2591\u2591\u2591\u2591\u2591                                        ",
        })),
        (_ = e(Text, {
          children:
            "    \u2591\u2591\u2591   \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591                                      ",
        })),
        (t = e(Text, {
          children:
            "   \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591                                    ",
        })),
        (m = e(Text, { children: "                                                          " })),
        ($[5] = t),
        ($[6] = m),
        ($[7] = b),
        ($[8] = g),
        ($[9] = C),
        ($[10] = u),
        ($[11] = y),
        ($[12] = _));
    else ((t = $[5]), (m = $[6]), (b = $[7]), (g = $[8]), (C = $[9]), (u = $[10]), (y = $[11]), (_ = $[12]));
    let h;
    if ($[13] === MEMO_CACHE_SENTINEL)
      ((h = r(Text, {
        children: [
          e(Text, { dimColor: !0, children: "                           \u2591\u2591\u2591\u2591" }),
          e(Text, { children: "                     \u2588\u2588    " }),
        ],
      })),
        ($[13] = h));
    else h = $[13];
    let R, k, f;
    if ($[14] === MEMO_CACHE_SENTINEL)
      ((R = r(Text, {
        children: [
          e(Text, {
            dimColor: !0,
            children: "                         \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591",
          }),
          e(Text, { children: "               \u2588\u2588\u2592\u2592\u2588\u2588  " }),
        ],
      })),
        (k = e(Text, {
          children: "                                            \u2592\u2592      \u2588\u2588   \u2592",
        })),
        (f = e(Text, {
          children:
            "                                          \u2592\u2592\u2591\u2591\u2592\u2592      \u2592 \u2592\u2592",
        })),
        ($[14] = R),
        ($[15] = k),
        ($[16] = f));
    else ((R = $[14]), (k = $[15]), (f = $[16]));
    let p;
    if ($[17] === MEMO_CACHE_SENTINEL)
      ((p = r(Text, {
        children: [
          "      ",
          e(Text, { color: "clawd_body", children: "\u2597" }),
          r(Text, {
            color: "clawd_background",
            backgroundColor: "clawd_body",
            children: [" ", "\u2597", "     ", "\u2596", " "],
          }),
          e(Text, { color: "clawd_body", children: "\u2596" }),
          "                           \u2592\u2592         \u2592\u2592 ",
        ],
      })),
        ($[17] = p));
    else p = $[17];
    let N;
    if ($[18] === MEMO_CACHE_SENTINEL)
      ((N = r(Text, {
        children: [
          "       ",
          e(Text, { backgroundColor: "clawd_body", children: " ".repeat(9) }),
          "                           \u2591          \u2592   ",
        ],
      })),
        ($[18] = N));
    else N = $[18];
    let x;
    if ($[19] === MEMO_CACHE_SENTINEL)
      ((x = r(Text, {
        children: [
          ".......",
          e(Text, { backgroundColor: "clawd_body", children: " " }),
          e(Text, { children: " " }),
          e(Text, { backgroundColor: "clawd_body", children: " " }),
          e(Text, { children: "   " }),
          e(Text, { backgroundColor: "clawd_body", children: " " }),
          e(Text, { children: " " }),
          e(Text, { backgroundColor: "clawd_body", children: " " }),
          "..........................\u2591..........\u2592....",
        ],
      })),
        ($[19] = x));
    else x = $[19];
    let v;
    if ($[20] !== c)
      ((v = e(Box, {
        width: M,
        children: r(Box, {
          flexDirection: "column",
          children: [c, b, g, C, u, y, _, t, m, h, R, k, f, p, N, x],
        }),
      })),
        ($[20] = c),
        ($[21] = v));
    else v = $[21];
    return v;
  }
  let d;
  if ($[22] !== welcomeMessage)
    ((d = r(Text, { color: "claude", children: [welcomeMessage, " "] })),
      ($[22] = welcomeMessage),
      ($[23] = d));
  else d = $[23];
  let a;
  if ($[24] === MEMO_CACHE_SENTINEL)
    ((a = r(Text, {
      dimColor: !0,
      children: [
        "v",
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
        " ",
      ],
    })),
      ($[24] = a));
  else a = $[24];
  let c;
  if ($[25] !== d) ((c = r(Text, { children: [d, a] })), ($[25] = d), ($[26] = c));
  else c = $[26];
  let b, g, C, u, y, _;
  if ($[27] === MEMO_CACHE_SENTINEL)
    ((b = e(Text, { children: ".........................................................." })),
      (g = e(Text, { children: "                                                          " })),
      (C = e(Text, {
        children:
          "     *                                       \u2588\u2588\u2588\u2588\u2588\u2593\u2593\u2591     ",
      })),
      (u = e(Text, {
        children:
          "                                 *         \u2588\u2588\u2588\u2593\u2591     \u2591\u2591   ",
      })),
      (y = e(Text, {
        children:
          "            \u2591\u2591\u2591\u2591\u2591\u2591                        \u2588\u2588\u2588\u2593\u2591           ",
      })),
      (_ = e(Text, {
        children:
          "    \u2591\u2591\u2591   \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591                      \u2588\u2588\u2588\u2593\u2591           ",
      })),
      ($[27] = b),
      ($[28] = g),
      ($[29] = C),
      ($[30] = u),
      ($[31] = y),
      ($[32] = _));
  else ((b = $[27]), (g = $[28]), (C = $[29]), (u = $[30]), (y = $[31]), (_ = $[32]));
  let t, m, h, R, k;
  if ($[33] === MEMO_CACHE_SENTINEL)
    ((t = r(Text, {
      children: [
        e(Text, {
          children:
            "   \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591    ",
        }),
        e(Text, { bold: !0, children: "*" }),
        e(Text, { children: "                \u2588\u2588\u2593\u2591\u2591      \u2593   " }),
      ],
    })),
      (m = e(Text, {
        children:
          "                                             \u2591\u2593\u2593\u2588\u2588\u2588\u2593\u2593\u2591    ",
      })),
      (h = e(Text, {
        dimColor: !0,
        children: " *                                 \u2591\u2591\u2591\u2591                   ",
      })),
      (R = e(Text, {
        dimColor: !0,
        children:
          "                                 \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591                 ",
      })),
      (k = e(Text, {
        dimColor: !0,
        children:
          "                               \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591           ",
      })),
      ($[33] = t),
      ($[34] = m),
      ($[35] = h),
      ($[36] = R),
      ($[37] = k));
  else ((t = $[33]), (m = $[34]), (h = $[35]), (R = $[36]), (k = $[37]));
  let f;
  if ($[38] === MEMO_CACHE_SENTINEL)
    ((f = r(Text, {
      children: [
        "                                                      ",
        e(Text, { dimColor: !0, children: "*" }),
        e(Text, { children: "   " }),
      ],
    })),
      ($[38] = f));
  else f = $[38];
  let p;
  if ($[39] === MEMO_CACHE_SENTINEL)
    ((p = r(Text, {
      children: [
        "      ",
        e(Text, { color: "clawd_body", children: "\u2597" }),
        r(Text, {
          color: "clawd_background",
          backgroundColor: "clawd_body",
          children: [" ", "\u2597", "     ", "\u2596", " "],
        }),
        e(Text, { color: "clawd_body", children: "\u2596" }),
        e(Text, { children: "                       " }),
        e(Text, { bold: !0, children: "*" }),
        e(Text, { children: "                 " }),
      ],
    })),
      ($[39] = p));
  else p = $[39];
  let N;
  if ($[40] === MEMO_CACHE_SENTINEL)
    ((N = r(Text, {
      children: [
        "       ",
        e(Text, { backgroundColor: "clawd_body", children: " ".repeat(9) }),
        "      *                                   ",
      ],
    })),
      ($[40] = N));
  else N = $[40];
  let x;
  if ($[41] === MEMO_CACHE_SENTINEL)
    ((x = r(Text, {
      children: [
        ".......",
        e(Text, { backgroundColor: "clawd_body", children: " " }),
        e(Text, { children: " " }),
        e(Text, { backgroundColor: "clawd_body", children: " " }),
        e(Text, { children: "   " }),
        e(Text, { backgroundColor: "clawd_body", children: " " }),
        e(Text, { children: " " }),
        e(Text, { backgroundColor: "clawd_body", children: " " }),
        "..........................................",
      ],
    })),
      ($[41] = x));
  else x = $[41];
  let v;
  if ($[42] !== c)
    ((v = e(Box, {
      width: M,
      children: r(Box, {
        flexDirection: "column",
        children: [c, b, g, C, u, y, _, t, m, h, R, k, f, p, N, x],
      }),
    })),
      ($[42] = c),
      ($[43] = v));
  else v = $[43];
  return v;
}

export { WelcomeV2 };
