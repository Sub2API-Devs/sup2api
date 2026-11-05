/**
 * components/LogoV2/WelcomeV2.tsx
 *
 * 首次/新版本欢迎框（"Welcome to Claude Code"），含 Apple Terminal 适配版本。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/WelcomeV2.tsx
 * pieces: chunk-cpgd9m5h.js (3)
 * attribution: affinity 1, fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { env } from "../../utils/env.js";

//@ chunk-cpgd9m5h.js:445-459 affinity
var WELCOME_MAX_COLUMNS = 58;
var WELCOME_MAX_ROWS = 30;
//@ chunk-cpgd9m5h.js:459-8150 fingerprint (2.1.88 match: WelcomeV2, 0.836)
function WelcomeV2() {
  let $ = useMemoCache(39);
  let [theme] = useTheme();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let { rows } = useTerminalSize();
  if (isScreenReaderEnabled || rows < WELCOME_MAX_ROWS) {
    let title;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      title = jsxProd_default_2(Text, {
        color: "claude",
        children: ["Welcome to Claude Code", " "],
      });
      $[0] = title;
    } else title = $[0];
    let header;
    if ($[1] === MEMO_CACHE_SENTINEL) {
      header = jsxProd_default_2(Text, {
        children: [
          title,
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "v",
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.318",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-11-03T18:52:53Z",
                GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION,
            ],
          }),
        ],
      });
      $[1] = header;
    } else header = $[1];
    return header;
  }
  if (env.terminal === "Apple_Terminal") {
    let t0;
    if ($[2] !== theme) {
      t0 = jsxProd_default(AppleTerminalWelcomeV2, {
        theme,
        welcomeMessage: "Welcome to Claude Code",
      });
      $[2] = theme;
      $[3] = t0;
    } else t0 = $[3];
    return t0;
  }
  if (["light", "light-daltonized", "light-ansi"].includes(theme)) {
    let title;
    if ($[4] === MEMO_CACHE_SENTINEL) {
      title = jsxProd_default_2(Text, {
        color: "claude",
        children: ["Welcome to Claude Code", " "],
      });
      $[4] = title;
    } else title = $[4];
    let headerRow;
    let ruleRow;
    let blankRow1;
    let blankRow2;
    let blankRow3;
    let cloudRow1;
    let cloudRow2;
    let cloudRow3;
    let blankRow4;
    if ($[5] === MEMO_CACHE_SENTINEL) {
      headerRow = jsxProd_default_2(Text, {
        children: [
          title,
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "v",
              {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.318",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-11-03T18:52:53Z",
                GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION,
              " ",
            ],
          }),
        ],
      });
      ruleRow = jsxProd_default(Text, {
        children: "..........................................................",
      });
      blankRow1 = jsxProd_default(Text, {
        children: "                                                          ",
      });
      blankRow2 = jsxProd_default(Text, {
        children: "                                                          ",
      });
      blankRow3 = jsxProd_default(Text, {
        children: "                                                          ",
      });
      cloudRow1 = jsxProd_default(Text, {
        children: "            \u2591\u2591\u2591\u2591\u2591\u2591                                        ",
      });
      cloudRow2 = jsxProd_default(Text, {
        children:
          "    \u2591\u2591\u2591   \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591                                      ",
      });
      cloudRow3 = jsxProd_default(Text, {
        children:
          "   \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591                                    ",
      });
      blankRow4 = jsxProd_default(Text, {
        children: "                                                          ",
      });
      $[5] = headerRow;
      $[6] = ruleRow;
      $[7] = blankRow1;
      $[8] = blankRow2;
      $[9] = blankRow3;
      $[10] = cloudRow1;
      $[11] = cloudRow2;
      $[12] = cloudRow3;
      $[13] = blankRow4;
    } else {
      headerRow = $[5];
      ruleRow = $[6];
      blankRow1 = $[7];
      blankRow2 = $[8];
      blankRow3 = $[9];
      cloudRow1 = $[10];
      cloudRow2 = $[11];
      cloudRow3 = $[12];
      blankRow4 = $[13];
    }
    let t9;
    if ($[14] === MEMO_CACHE_SENTINEL) {
      t9 = jsxProd_default_2(Text, {
        children: [
          jsxProd_default(Text, {
            dimColor: true,
            children: "                           \u2591\u2591\u2591\u2591",
          }),
          jsxProd_default(Text, {
            children: "                     \u2588\u2588    ",
          }),
        ],
      });
      $[14] = t9;
    } else t9 = $[14];
    let t10;
    let t11;
    if ($[15] === MEMO_CACHE_SENTINEL) {
      t10 = jsxProd_default_2(Text, {
        children: [
          jsxProd_default(Text, {
            dimColor: true,
            children: "                         \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591",
          }),
          jsxProd_default(Text, {
            children: "               \u2588\u2588\u2592\u2592\u2588\u2588  ",
          }),
        ],
      });
      t11 = jsxProd_default(Text, {
        children: "                                            \u2592\u2592      \u2588\u2588   \u2592",
      });
      $[15] = t10;
      $[16] = t11;
    } else {
      t10 = $[15];
      t11 = $[16];
    }
    let t12;
    if ($[17] === MEMO_CACHE_SENTINEL) {
      t12 = jsxProd_default_2(Text, {
        children: [
          "      ",
          jsxProd_default(Text, {
            color: "clawd_body",
            children: " \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 ",
          }),
          "                         \u2592\u2592\u2591\u2591\u2592\u2592      \u2592 \u2592\u2592",
        ],
      });
      $[17] = t12;
    } else t12 = $[17];
    let t13;
    if ($[18] === MEMO_CACHE_SENTINEL) {
      t13 = jsxProd_default_2(Text, {
        children: [
          "      ",
          jsxProd_default(Text, {
            color: "clawd_body",
            backgroundColor: "clawd_background",
            children: "\u2588\u2588\u2584\u2588\u2588\u2588\u2588\u2588\u2584\u2588\u2588",
          }),
          "                           \u2592\u2592         \u2592\u2592 ",
        ],
      });
      $[18] = t13;
    } else t13 = $[18];
    let t14;
    if ($[19] === MEMO_CACHE_SENTINEL) {
      t14 = jsxProd_default_2(Text, {
        children: [
          "      ",
          jsxProd_default(Text, {
            color: "clawd_body",
            children: " \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 ",
          }),
          "                          \u2591          \u2592   ",
        ],
      });
      $[19] = t14;
    } else t14 = $[19];
    let t15;
    if ($[20] === MEMO_CACHE_SENTINEL) {
      t15 = jsxProd_default(Box, {
        width: WELCOME_MAX_COLUMNS,
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            headerRow,
            ruleRow,
            blankRow1,
            blankRow2,
            blankRow3,
            cloudRow1,
            cloudRow2,
            cloudRow3,
            blankRow4,
            t9,
            t10,
            t11,
            t12,
            t13,
            t14,
            jsxProd_default_2(Text, {
              children: [
                ".......",
                jsxProd_default(Text, {
                  color: "clawd_body",
                  children: "\u2588 \u2588   \u2588 \u2588",
                }),
                "..........................\u2591..........\u2592....",
              ],
            }),
          ],
        }),
      });
      $[20] = t15;
    } else t15 = $[20];
    return t15;
  }
  let title;
  if ($[21] === MEMO_CACHE_SENTINEL) {
    title = jsxProd_default_2(Text, {
      color: "claude",
      children: ["Welcome to Claude Code", " "],
    });
    $[21] = title;
  } else title = $[21];
  let header;
  let t1;
  let t2;
  let t3;
  let t4;
  let t5;
  let t6;
  if ($[22] === MEMO_CACHE_SENTINEL) {
    header = jsxProd_default_2(Text, {
      children: [
        title,
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            "v",
            {
              ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
              PACKAGE_URL: "@anthropic-ai/claude-code",
              README_URL: "https://code.claude.com/docs/en/overview",
              VERSION: "2.1.318",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-11-03T18:52:53Z",
              GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.VERSION,
            " ",
          ],
        }),
      ],
    });
    t1 = jsxProd_default(Text, {
      children: "..........................................................",
    });
    t2 = jsxProd_default(Text, {
      children: "                                                          ",
    });
    t3 = jsxProd_default(Text, {
      children:
        "     *                                       \u2588\u2588\u2588\u2588\u2588\u2593\u2593\u2591     ",
    });
    t4 = jsxProd_default(Text, {
      children:
        "                                 *         \u2588\u2588\u2588\u2593\u2591     \u2591\u2591   ",
    });
    t5 = jsxProd_default(Text, {
      children:
        "            \u2591\u2591\u2591\u2591\u2591\u2591                        \u2588\u2588\u2588\u2593\u2591           ",
    });
    t6 = jsxProd_default(Text, {
      children:
        "    \u2591\u2591\u2591   \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591                      \u2588\u2588\u2588\u2593\u2591           ",
    });
    $[22] = header;
    $[23] = t1;
    $[24] = t2;
    $[25] = t3;
    $[26] = t4;
    $[27] = t5;
    $[28] = t6;
  } else {
    header = $[22];
    t1 = $[23];
    t2 = $[24];
    t3 = $[25];
    t4 = $[26];
    t5 = $[27];
    t6 = $[28];
  }
  let starsRow1;
  let starsRow2;
  let starsRow3;
  let cloudRow;
  let groundRow;
  if ($[29] === MEMO_CACHE_SENTINEL) {
    cloudRow = jsxProd_default_2(Text, {
      children: [
        jsxProd_default(Text, {
          children:
            "   \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591    ",
        }),
        jsxProd_default(Text, {
          bold: true,
          children: "*",
        }),
        jsxProd_default(Text, {
          children: "                \u2588\u2588\u2593\u2591\u2591      \u2593   ",
        }),
      ],
    });
    groundRow = jsxProd_default(Text, {
      children:
        "                                             \u2591\u2593\u2593\u2588\u2588\u2588\u2593\u2593\u2591    ",
    });
    starsRow1 = jsxProd_default(Text, {
      dimColor: true,
      children: " *                                 \u2591\u2591\u2591\u2591                   ",
    });
    starsRow2 = jsxProd_default(Text, {
      dimColor: true,
      children:
        "                                 \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591                 ",
    });
    starsRow3 = jsxProd_default(Text, {
      dimColor: true,
      children:
        "                               \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591           ",
    });
    $[29] = starsRow1;
    $[30] = starsRow2;
    $[31] = starsRow3;
    $[32] = cloudRow;
    $[33] = groundRow;
  } else {
    starsRow1 = $[29];
    starsRow2 = $[30];
    starsRow3 = $[31];
    cloudRow = $[32];
    groundRow = $[33];
  }
  let t12;
  if ($[34] === MEMO_CACHE_SENTINEL) {
    t12 = jsxProd_default(Text, {
      color: "clawd_body",
      children: " \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 ",
    });
    $[34] = t12;
  } else t12 = $[34];
  let t13;
  if ($[35] === MEMO_CACHE_SENTINEL) {
    t13 = jsxProd_default_2(Text, {
      children: [
        "      ",
        t12,
        "                                       ",
        jsxProd_default(Text, {
          dimColor: true,
          children: "*",
        }),
        jsxProd_default(Text, {
          children: " ",
        }),
      ],
    });
    $[35] = t13;
  } else t13 = $[35];
  let t14;
  if ($[36] === MEMO_CACHE_SENTINEL) {
    t14 = jsxProd_default_2(Text, {
      children: [
        "      ",
        jsxProd_default(Text, {
          color: "clawd_body",
          children: "\u2588\u2588\u2584\u2588\u2588\u2588\u2588\u2588\u2584\u2588\u2588",
        }),
        jsxProd_default(Text, {
          children: "                        ",
        }),
        jsxProd_default(Text, {
          bold: true,
          children: "*",
        }),
        jsxProd_default(Text, {
          children: "                ",
        }),
      ],
    });
    $[36] = t14;
  } else t14 = $[36];
  let t15;
  if ($[37] === MEMO_CACHE_SENTINEL) {
    t15 = jsxProd_default_2(Text, {
      children: [
        "      ",
        jsxProd_default(Text, {
          color: "clawd_body",
          children: " \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 ",
        }),
        "     *                                   ",
      ],
    });
    $[37] = t15;
  } else t15 = $[37];
  let t16;
  if ($[38] === MEMO_CACHE_SENTINEL) {
    t16 = jsxProd_default(Box, {
      width: WELCOME_MAX_COLUMNS,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          header,
          t1,
          t2,
          t3,
          t4,
          t5,
          t6,
          cloudRow,
          groundRow,
          starsRow1,
          starsRow2,
          starsRow3,
          t13,
          t14,
          t15,
          jsxProd_default_2(Text, {
            children: [
              ".......",
              jsxProd_default(Text, {
                color: "clawd_body",
                children: "\u2588 \u2588   \u2588 \u2588",
              }),
              "..........................................",
            ],
          }),
        ],
      }),
    });
    $[38] = t16;
  } else t16 = $[38];
  return t16;
}
//@ chunk-cpgd9m5h.js:8150-15429 fingerprint (2.1.88 match: AppleTerminalWelcomeV2, 0.832)
function AppleTerminalWelcomeV2(props) {
  let $ = useMemoCache(44);
  let { theme, welcomeMessage } = props;
  if (["light", "light-daltonized", "light-ansi"].includes(theme)) {
    let t1;
    if ($[0] !== welcomeMessage) {
      t1 = jsxProd_default_2(Text, {
        color: "claude",
        children: [welcomeMessage, " "],
      });
      $[0] = welcomeMessage;
      $[1] = t1;
    } else t1 = $[1];
    let t2;
    if ($[2] === MEMO_CACHE_SENTINEL) {
      t2 = jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "v",
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION,
          " ",
        ],
      });
      $[2] = t2;
    } else t2 = $[2];
    let t3;
    if ($[3] !== t1) {
      t3 = jsxProd_default_2(Text, {
        children: [t1, t2],
      });
      $[3] = t1;
      $[4] = t3;
    } else t3 = $[4];
    let t10;
    let t11;
    let t4;
    let t5;
    let t6;
    let t7;
    let t8;
    let t9;
    if ($[5] === MEMO_CACHE_SENTINEL) {
      t4 = jsxProd_default(Text, {
        children: "..........................................................",
      });
      t5 = jsxProd_default(Text, {
        children: "                                                          ",
      });
      t6 = jsxProd_default(Text, {
        children: "                                                          ",
      });
      t7 = jsxProd_default(Text, {
        children: "                                                          ",
      });
      t8 = jsxProd_default(Text, {
        children: "            \u2591\u2591\u2591\u2591\u2591\u2591                                        ",
      });
      t9 = jsxProd_default(Text, {
        children:
          "    \u2591\u2591\u2591   \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591                                      ",
      });
      t10 = jsxProd_default(Text, {
        children:
          "   \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591                                    ",
      });
      t11 = jsxProd_default(Text, {
        children: "                                                          ",
      });
      $[5] = t10;
      $[6] = t11;
      $[7] = t4;
      $[8] = t5;
      $[9] = t6;
      $[10] = t7;
      $[11] = t8;
      $[12] = t9;
    } else {
      t10 = $[5];
      t11 = $[6];
      t4 = $[7];
      t5 = $[8];
      t6 = $[9];
      t7 = $[10];
      t8 = $[11];
      t9 = $[12];
    }
    let t12;
    if ($[13] === MEMO_CACHE_SENTINEL) {
      t12 = jsxProd_default_2(Text, {
        children: [
          jsxProd_default(Text, {
            dimColor: true,
            children: "                           \u2591\u2591\u2591\u2591",
          }),
          jsxProd_default(Text, {
            children: "                     \u2588\u2588    ",
          }),
        ],
      });
      $[13] = t12;
    } else t12 = $[13];
    let t13;
    let t14;
    let t15;
    if ($[14] === MEMO_CACHE_SENTINEL) {
      t13 = jsxProd_default_2(Text, {
        children: [
          jsxProd_default(Text, {
            dimColor: true,
            children: "                         \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591",
          }),
          jsxProd_default(Text, {
            children: "               \u2588\u2588\u2592\u2592\u2588\u2588  ",
          }),
        ],
      });
      t14 = jsxProd_default(Text, {
        children: "                                            \u2592\u2592      \u2588\u2588   \u2592",
      });
      t15 = jsxProd_default(Text, {
        children:
          "                                          \u2592\u2592\u2591\u2591\u2592\u2592      \u2592 \u2592\u2592",
      });
      $[14] = t13;
      $[15] = t14;
      $[16] = t15;
    } else {
      t13 = $[14];
      t14 = $[15];
      t15 = $[16];
    }
    let t16;
    if ($[17] === MEMO_CACHE_SENTINEL) {
      t16 = jsxProd_default_2(Text, {
        children: [
          "      ",
          jsxProd_default(Text, {
            color: "clawd_body",
            children: "\u2597",
          }),
          jsxProd_default_2(Text, {
            color: "clawd_background",
            backgroundColor: "clawd_body",
            children: [" ", "\u2597", "     ", "\u2596", " "],
          }),
          jsxProd_default(Text, {
            color: "clawd_body",
            children: "\u2596",
          }),
          "                           \u2592\u2592         \u2592\u2592 ",
        ],
      });
      $[17] = t16;
    } else t16 = $[17];
    let t17;
    if ($[18] === MEMO_CACHE_SENTINEL) {
      t17 = jsxProd_default_2(Text, {
        children: [
          "       ",
          jsxProd_default(Text, {
            backgroundColor: "clawd_body",
            children: " ".repeat(9),
          }),
          "                           \u2591          \u2592   ",
        ],
      });
      $[18] = t17;
    } else t17 = $[18];
    let t18;
    if ($[19] === MEMO_CACHE_SENTINEL) {
      t18 = jsxProd_default_2(Text, {
        children: [
          ".......",
          jsxProd_default(Text, {
            backgroundColor: "clawd_body",
            children: " ",
          }),
          jsxProd_default(Text, {
            children: " ",
          }),
          jsxProd_default(Text, {
            backgroundColor: "clawd_body",
            children: " ",
          }),
          jsxProd_default(Text, {
            children: "   ",
          }),
          jsxProd_default(Text, {
            backgroundColor: "clawd_body",
            children: " ",
          }),
          jsxProd_default(Text, {
            children: " ",
          }),
          jsxProd_default(Text, {
            backgroundColor: "clawd_body",
            children: " ",
          }),
          "..........................\u2591..........\u2592....",
        ],
      });
      $[19] = t18;
    } else t18 = $[19];
    let t19;
    if ($[20] !== t3) {
      t19 = jsxProd_default(Box, {
        width: WELCOME_MAX_COLUMNS,
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [t3, t4, t5, t6, t7, t8, t9, t10, t11, t12, t13, t14, t15, t16, t17, t18],
        }),
      });
      $[20] = t3;
      $[21] = t19;
    } else t19 = $[21];
    return t19;
  }
  let t1;
  if ($[22] !== welcomeMessage) {
    t1 = jsxProd_default_2(Text, {
      color: "claude",
      children: [welcomeMessage, " "],
    });
    $[22] = welcomeMessage;
    $[23] = t1;
  } else t1 = $[23];
  let t2;
  if ($[24] === MEMO_CACHE_SENTINEL) {
    t2 = jsxProd_default_2(Text, {
      dimColor: true,
      children: [
        "v",
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
        " ",
      ],
    });
    $[24] = t2;
  } else t2 = $[24];
  let t3;
  if ($[25] !== t1) {
    t3 = jsxProd_default_2(Text, {
      children: [t1, t2],
    });
    $[25] = t1;
    $[26] = t3;
  } else t3 = $[26];
  let t4;
  let t5;
  let t6;
  let t7;
  let t8;
  let t9;
  if ($[27] === MEMO_CACHE_SENTINEL) {
    t4 = jsxProd_default(Text, {
      children: "..........................................................",
    });
    t5 = jsxProd_default(Text, {
      children: "                                                          ",
    });
    t6 = jsxProd_default(Text, {
      children:
        "     *                                       \u2588\u2588\u2588\u2588\u2588\u2593\u2593\u2591     ",
    });
    t7 = jsxProd_default(Text, {
      children:
        "                                 *         \u2588\u2588\u2588\u2593\u2591     \u2591\u2591   ",
    });
    t8 = jsxProd_default(Text, {
      children:
        "            \u2591\u2591\u2591\u2591\u2591\u2591                        \u2588\u2588\u2588\u2593\u2591           ",
    });
    t9 = jsxProd_default(Text, {
      children:
        "    \u2591\u2591\u2591   \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591                      \u2588\u2588\u2588\u2593\u2591           ",
    });
    $[27] = t4;
    $[28] = t5;
    $[29] = t6;
    $[30] = t7;
    $[31] = t8;
    $[32] = t9;
  } else {
    t4 = $[27];
    t5 = $[28];
    t6 = $[29];
    t7 = $[30];
    t8 = $[31];
    t9 = $[32];
  }
  let t10;
  let t11;
  let t12;
  let t13;
  let t14;
  if ($[33] === MEMO_CACHE_SENTINEL) {
    t10 = jsxProd_default_2(Text, {
      children: [
        jsxProd_default(Text, {
          children:
            "   \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591    ",
        }),
        jsxProd_default(Text, {
          bold: true,
          children: "*",
        }),
        jsxProd_default(Text, {
          children: "                \u2588\u2588\u2593\u2591\u2591      \u2593   ",
        }),
      ],
    });
    t11 = jsxProd_default(Text, {
      children:
        "                                             \u2591\u2593\u2593\u2588\u2588\u2588\u2593\u2593\u2591    ",
    });
    t12 = jsxProd_default(Text, {
      dimColor: true,
      children: " *                                 \u2591\u2591\u2591\u2591                   ",
    });
    t13 = jsxProd_default(Text, {
      dimColor: true,
      children:
        "                                 \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591                 ",
    });
    t14 = jsxProd_default(Text, {
      dimColor: true,
      children:
        "                               \u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591           ",
    });
    $[33] = t10;
    $[34] = t11;
    $[35] = t12;
    $[36] = t13;
    $[37] = t14;
  } else {
    t10 = $[33];
    t11 = $[34];
    t12 = $[35];
    t13 = $[36];
    t14 = $[37];
  }
  let t15;
  if ($[38] === MEMO_CACHE_SENTINEL) {
    t15 = jsxProd_default_2(Text, {
      children: [
        "                                                      ",
        jsxProd_default(Text, {
          dimColor: true,
          children: "*",
        }),
        jsxProd_default(Text, {
          children: "   ",
        }),
      ],
    });
    $[38] = t15;
  } else t15 = $[38];
  let t16;
  if ($[39] === MEMO_CACHE_SENTINEL) {
    t16 = jsxProd_default_2(Text, {
      children: [
        "      ",
        jsxProd_default(Text, {
          color: "clawd_body",
          children: "\u2597",
        }),
        jsxProd_default_2(Text, {
          color: "clawd_background",
          backgroundColor: "clawd_body",
          children: [" ", "\u2597", "     ", "\u2596", " "],
        }),
        jsxProd_default(Text, {
          color: "clawd_body",
          children: "\u2596",
        }),
        jsxProd_default(Text, {
          children: "                       ",
        }),
        jsxProd_default(Text, {
          bold: true,
          children: "*",
        }),
        jsxProd_default(Text, {
          children: "                 ",
        }),
      ],
    });
    $[39] = t16;
  } else t16 = $[39];
  let t17;
  if ($[40] === MEMO_CACHE_SENTINEL) {
    t17 = jsxProd_default_2(Text, {
      children: [
        "       ",
        jsxProd_default(Text, {
          backgroundColor: "clawd_body",
          children: " ".repeat(9),
        }),
        "      *                                   ",
      ],
    });
    $[40] = t17;
  } else t17 = $[40];
  let t18;
  if ($[41] === MEMO_CACHE_SENTINEL) {
    t18 = jsxProd_default_2(Text, {
      children: [
        ".......",
        jsxProd_default(Text, {
          backgroundColor: "clawd_body",
          children: " ",
        }),
        jsxProd_default(Text, {
          children: " ",
        }),
        jsxProd_default(Text, {
          backgroundColor: "clawd_body",
          children: " ",
        }),
        jsxProd_default(Text, {
          children: "   ",
        }),
        jsxProd_default(Text, {
          backgroundColor: "clawd_body",
          children: " ",
        }),
        jsxProd_default(Text, {
          children: " ",
        }),
        jsxProd_default(Text, {
          backgroundColor: "clawd_body",
          children: " ",
        }),
        "..........................................",
      ],
    });
    $[41] = t18;
  } else t18 = $[41];
  let t19;
  if ($[42] !== t3) {
    t19 = jsxProd_default(Box, {
      width: WELCOME_MAX_COLUMNS,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [t3, t4, t5, t6, t7, t8, t9, t10, t11, t12, t13, t14, t15, t16, t17, t18],
      }),
    });
    $[42] = t3;
    $[43] = t19;
  } else t19 = $[43];
  return t19;
}
export { WelcomeV2 };
