/**
 * components/projects/ProjectProposalCard.tsx
 *
 * 2.1.316 新增：项目（Project）设置提议卡片：名称/图标/颜色、线程与例程、项目指令的对比与确认
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a6f4nz0a.js (19)
 * attribution: placement 19
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";
import { wrapAnsi } from "../../ink/wrapAnsi.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { splitByDisplayWidth, truncateToWidth, formatOverflowHint } from "../../utils/format.js";
import { repeatString, plural } from "../../utils/stringUtils.js";
import {
  THREAD_WHO_LABELS,
  THREAD_PRODUCES_LABELS,
  PROJECT_COLOR_HEX,
} from "../../services/projects/setupProposalSchema.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { formatShortcutHint, KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { reactNodeText } from "../../utils/reactText.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Byline } from "../design-system/Byline.js";
import { OverflowHint } from "../CtrlOToExpand.js";

//@ chunk-a6f4nz0a.js:721-725 placement
init_react_production();
//@ chunk-a6f4nz0a.js:725-793 placement
var BRIEF_LABEL_KEYS = {
  claude: "briefLabelClaude",
  you: "briefLabelYou",
};
var VERTICAL_BAR_PREFIX = "\u2502 ";
//@ chunk-a6f4nz0a.js:793-820 placement
function normalizeText(t) {
  return stripNonPrintable(t);
}
//@ chunk-a6f4nz0a.js:820-1017 placement
/**
 * 把文本按宽度硬换行（保留空行，可选不裁剪空白），超宽的行再强制切分；被项目对话框多处复用。
 */
function wrapTextToWidth(t, o, c = false) {
  let max = Math.max(1, o);
  let l = [];
  for (let line of t.split(`
`)) {
    if (line === "") {
      l.push("");
      continue;
    }
    for (let line_2 of wrapAnsi(line, max, {
      hard: true,
      trim: !c,
    }).split(`
`))
      l.push(...(bunStringWidth(line_2) <= max ? [line_2] : splitByDisplayWidth(line_2, max)));
  }
  return l;
}
//@ chunk-a6f4nz0a.js:1017-1074 placement
function padToWidth(t, o) {
  let c = bunStringWidth(t);
  return c >= o ? t : t + repeatString(" ", o - c);
}
//@ chunk-a6f4nz0a.js:1074-1137 placement
function renderProposalFlow(session) {
  return `${THREAD_WHO_LABELS[session.who]} \u2192 ${THREAD_PRODUCES_LABELS[session.produces]}`;
}
//@ chunk-a6f4nz0a.js:1137-1300 placement
function renderQuotedLines(t, o, c, dimColor) {
  return wrapTextToWidth(normalizeText(t), o - VERTICAL_BAR_PREFIX.length, true).map((l, d) =>
    jsxProd_default_2(
      Text,
      {
        children: [
          jsxProd_default(Text, {
            dimColor: true,
            children: VERTICAL_BAR_PREFIX,
          }),
          jsxProd_default(Text, {
            dimColor,
            children: l === "" ? " " : l,
          }),
        ],
      },
      `${c}${d}`,
    ),
  );
}
//@ chunk-a6f4nz0a.js:1300-1348 placement
/**
 * 函数 wrapCardText（按宽度换行）。
 */
function wrapCardText(t, o) {
  return renderQuotedLines(t.trim(), o, "msg", false);
}
//@ chunk-a6f4nz0a.js:1348-1575 placement = _temp2 (0.87)
function renderProposalHeaderRow(t, o, c, i, l) {
  return jsxProd_default_2(
    Text,
    {
      wrap: "truncate-end",
      children: [
        jsxProd_default(Text, {
          bold: true,
          children: o,
        }),
        c !== null
          ? jsxProd_default_2(Text, {
              dimColor: true,
              children: [" (", c, ")"],
            })
          : null,
        i !== null
          ? jsxProd_default_2(Text, {
              dimColor: true,
              children: ["  ", truncateToWidth(i, Math.max(1, l - bunStringWidth(o) - 8))],
            })
          : null,
      ],
    },
    t,
  );
}
//@ chunk-a6f4nz0a.js:1575-1619 placement
function renderSpace(t) {
  return jsxProd_default(
    Text,
    {
      children: " ",
    },
    t,
  );
}
//@ chunk-a6f4nz0a.js:1619-2191 placement
function renderFromLine(session, o, c, i) {
  let l = `${o + 1}. `;
  let d = " ".repeat(l.length);
  let p = i;
  let m = [
    jsxProd_default_2(
      Text,
      {
        wrap: "truncate-end",
        children: [
          jsxProd_default(Text, {
            dimColor: true,
            children: l,
          }),
          jsxProd_default(Text, {
            bold: true,
            children: padToWidth(truncateToWidth(normalizeText(session.title), p), p),
          }),
          "  ",
          jsxProd_default(Text, {
            color: BRIEF_LABEL_KEYS[session.who],
            children: THREAD_WHO_LABELS[session.who],
          }),
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [" \u2192 ", THREAD_PRODUCES_LABELS[session.produces]],
          }),
        ],
      },
      `t${o}`,
    ),
  ];
  wrapTextToWidth(normalizeText(session.description), c - l.length).forEach((u, a) =>
    m.push(
      jsxProd_default_2(
        Text,
        {
          children: [d, u],
        },
        `d${o}.${a}`,
      ),
    ),
  );
  wrapTextToWidth(`from ${normalizeText(session.basis)}`, c - l.length).forEach((u, a) =>
    m.push(
      jsxProd_default_2(
        Text,
        {
          dimColor: true,
          children: [
            d,
            a === 0
              ? jsxProd_default_2(Fragment, {
                  children: [
                    jsxProd_default(Text, {
                      italic: true,
                      children: "from",
                    }),
                    u.slice(4),
                  ],
                })
              : u,
          ],
        },
        `b${o}.${a}`,
      ),
    ),
  );
  return m;
}
//@ chunk-a6f4nz0a.js:2191-5033 placement
/**
 * 生成提议的各行（名称、图标、颜色、线程、例程、权限、指令）。
 */
function buildProposalRows(proposal, width, c) {
  let i = [];
  let l = (m) => {
    if (i.length > 0) i.push(renderSpace(`gap${i.length}`));
    i.push(m);
  };
  if (proposal.name !== undefined || proposal.icon !== undefined || proposal.color !== undefined) {
    let color = proposal.color !== undefined ? PROJECT_COLOR_HEX[proposal.color] : undefined;
    let u = [
      ...(proposal.icon !== undefined ? [["icon", proposal.icon]] : []),
      ...(proposal.color !== undefined ? [["color", proposal.color]] : []),
    ];
    let reduced = u.reduce((acc, [C, f]) => acc + 3 + C.length + 1 + bunStringWidth(f), 0);
    let max = Math.max(6, width - 22 - 7 - reduced);
    i.push(
      jsxProd_default_2(
        Text,
        {
          wrap: "truncate-end",
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: "Name, icon and color",
            }),
            "  ",
            proposal.name !== undefined
              ? jsxProd_default_2(Fragment, {
                  children: [
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: "name ",
                    }),
                    "\u201C",
                    truncateToWidth(normalizeText(proposal.name), max),
                    "\u201D",
                  ],
                })
              : null,
            u.map(([R, C], f) =>
              jsxProd_default_2(
                Text,
                {
                  children: [
                    f > 0 || proposal.name !== undefined
                      ? jsxProd_default(Text, {
                          dimColor: true,
                          children: " \xB7 ",
                        })
                      : null,
                    jsxProd_default_2(Text, {
                      dimColor: true,
                      children: [R, " "],
                    }),
                    jsxProd_default(Text, {
                      color,
                      children: C,
                    }),
                  ],
                },
                R,
              ),
            ),
          ],
        },
        "card",
      ),
    );
  }
  if (proposal.summary !== undefined && proposal.summary.trim() !== "")
    i.push(...renderQuotedLines(proposal.summary.trim(), width, "sum", true));
  let sessions = proposal.sessions ?? [];
  if (sessions.length > 0) {
    l(renderProposalHeaderRow("threads", "Threads", sessions.length, null, width));
    let max = Math.max(
      1,
      Math.min(
        Math.max(...sessions.map((session) => bunStringWidth(normalizeText(session.title)))),
        width - 3 - Math.max(...sessions.map((session) => bunStringWidth(renderProposalFlow(session)))) - 2,
      ),
    );
    sessions.forEach((session, a) => i.push(...renderFromLine(session, a, width, max)));
  }
  let routines = proposal.routines ?? [];
  if (routines.length > 0) {
    l(renderProposalHeaderRow("routines", "Routines", routines.length, "off until you turn one on", width));
    let m = (routine) => `${normalizeText(routine.cron_expression)} UTC`;
    let max = Math.max(
      1,
      Math.min(
        Math.max(...routines.map((routine) => bunStringWidth(normalizeText(routine.name)))),
        width - 2 - Math.max(...routines.map((routine) => bunStringWidth(m(routine)))) - 2,
      ),
    );
    routines.forEach((routine, h) => {
      let children = m(routine);
      i.push(
        jsxProd_default_2(
          Text,
          {
            wrap: "truncate-end",
            children: [
              jsxProd_default(Text, {
                dimColor: true,
                children: "\xB7 ",
              }),
              jsxProd_default(Text, {
                bold: true,
                children: padToWidth(truncateToWidth(normalizeText(routine.name), max), max),
              }),
              "  ",
              jsxProd_default(Text, {
                color: "permission",
                children,
              }),
            ],
          },
          `r${h}`,
        ),
      );
      if (routine.description !== undefined && routine.description !== "")
        wrapTextToWidth(normalizeText(routine.description), width - 2).forEach((C, f) =>
          i.push(
            jsxProd_default_2(
              Text,
              {
                children: ["  ", C],
              },
              `rd${h}.${f}`,
            ),
          ),
        );
    });
  }
  if (proposal.instructions !== undefined && proposal.instructions.trim() !== "") {
    l(
      renderProposalHeaderRow(
        "instructions",
        "Project instructions",
        null,
        c.existingProject
          ? "replace the project\u2019s current ones when applied"
          : "set on the project on Yes",
        width,
      ),
    );
    i.push(...renderQuotedLines(proposal.instructions.trim(), width, "ins", false));
  }
  if (sessions.length + routines.length > 0) {
    l(
      renderProposalHeaderRow(
        "prompts",
        routines.length === 0
          ? "Thread instructions"
          : sessions.length === 0
            ? "Routine instructions"
            : "Thread and routine instructions",
        null,
        routines.length === 0
          ? "what each thread starts with"
          : sessions.length === 0
            ? "what each routine starts with"
            : "what each thread and routine starts with",
        width,
      ),
    );
    sessions.forEach((session, u) => {
      i.push(
        jsxProd_default_2(
          Text,
          {
            dimColor: true,
            wrap: "truncate-end",
            children: [u + 1, ". ", normalizeText(session.title)],
          },
          `pt${u}`,
        ),
      );
      renderQuotedLines(session.prompt.trim(), width - 3, `pp${u}.`, true).forEach((a) =>
        i.push(
          jsxProd_default_2(
            Text,
            {
              children: ["   ", a],
            },
            `i${String(a.key)}`,
          ),
        ),
      );
    });
    routines.forEach((routine, u) => {
      i.push(
        jsxProd_default_2(
          Text,
          {
            dimColor: true,
            wrap: "truncate-end",
            children: ["\xB7 ", normalizeText(routine.name)],
          },
          `rt${u}`,
        ),
      );
      renderQuotedLines(routine.prompt.trim(), width - 3, `rp${u}.`, true).forEach((a) =>
        i.push(
          jsxProd_default_2(
            Text,
            {
              children: ["   ", a],
            },
            `i${String(a.key)}`,
          ),
        ),
      );
    });
  }
  if (proposal.evidence?.sessions_matched !== undefined)
    l(
      jsxProd_default_2(
        Text,
        {
          dimColor: true,
          wrap: "truncate-end",
          children: [
            "The draft counts ",
            proposal.evidence.sessions_matched,
            " of this folder\u2019s",
            " ",
            plural(proposal.evidence.sessions_matched, "session"),
            " as this stream of work.",
          ],
        },
        "evidence",
      ),
    );
  return i;
}
//@ chunk-a6f4nz0a.js:5033-5079 placement
/**
 * 导出值：DRAFTED_BY_CLAUDE_TEXT（"Drafted by Claude from this session"）。
 */
var DRAFTED_BY_CLAUDE_TEXT = "Drafted by Claude from this session";
//@ chunk-a6f4nz0a.js:5079-5475 placement
function describeInstructionsScope(t, o, chord) {
  let i = t.sessions?.length ?? 0;
  let l = t.routines?.length ?? 0;
  let d = t.instructions !== undefined && t.instructions.trim() !== "";
  return [
    `Brief  ${[i > 0 ? `${i} ${plural(i, "thread")}` : null, l > 0 ? `${l} ${plural(l, "routine")}` : null, d ? "instructions" : null, i + l === 0 && !d ? "summary only" : null, `${(o / 1024).toFixed(1)} KB`].filter((m) => m !== null).join(" \xB7 ")}`,
    chord === null ? "" : formatShortcut(chord, "show as text"),
  ]
    .filter((m) => m !== "")
    .join("  ");
}
//@ chunk-a6f4nz0a.js:5475-5550 placement
function shortcutHintText(t, chord) {
  return [formatOverflowHint(t), formatShortcut(chord, "expand")].filter((c) => c !== "").join(" ");
}
//@ chunk-a6f4nz0a.js:5550-5632 placement
function formatShortcut(chord, action) {
  return formatShortcutHint({
    chord,
    action,
    parens: true,
    format: {
      keyCase: "lower",
    },
  });
}
//@ chunk-a6f4nz0a.js:5632-5759 placement
/**
 * 计算项目指令说明区需要的最大行数（两种展示形式取大者）。
 */
function measureInstructionsRows(proposal, o, shortcutDisplay, columns) {
  return Math.max(
    wrapTextToWidth(describeInstructionsScope(proposal, o, shortcutDisplay), columns, true).length,
    wrapTextToWidth(describeInstructionsScope(proposal, o, null), columns, true).length +
      wrapTextToWidth(shortcutHintText(Math.max(1, o), shortcutDisplay), columns, true).length,
  );
}
//@ chunk-a6f4nz0a.js:5759-5898 placement
/**
 * 在 o 行内能放下多少个列表项（c 为宽度；null 时按项数计）。
 */
function countItemsFittingRows(t, o, c) {
  if (c === null) return Math.min(t.length, o);
  let i = 0;
  let l = 0;
  for (let d of t) {
    i += wrapTextToWidth(reactNodeText(d), c, true).length;
    if (i > o) break;
    l++;
  }
  return l;
}
//@ chunk-a6f4nz0a.js:5898-8834 placement
/**
 * 显示项目设置提议并等待确认（终端太矮时提示）。
 */
function ProjectProposalCard(props) {
  let h = w(61);
  let {
    proposal,
    proposalBytes,
    existingProject,
    width,
    maxRows,
    marginTop,
    transcriptChord,
    screenReaderColumns,
    messageFrom,
  } = props;
  let R;
  if (h[0] !== existingProject || h[1] !== messageFrom || h[2] !== proposal || h[3] !== width) {
    R =
      messageFrom !== null
        ? wrapCardText(proposal.summary ?? "", width)
        : buildProposalRows(proposal, width, {
            existingProject,
          });
    h[0] = existingProject;
    h[1] = messageFrom;
    h[2] = proposal;
    h[3] = width;
    h[4] = R;
  } else R = h[4];
  let C = R;
  let f;
  if (h[5] !== maxRows || h[6] !== C || h[7] !== screenReaderColumns) {
    f = C.slice(0, countItemsFittingRows(C, maxRows, screenReaderColumns));
    while (f.length < C.length && f.length > 1 && String(f.at(-1)?.key).startsWith("gap")) f.pop();
    h[5] = maxRows;
    h[6] = C;
    h[7] = screenReaderColumns;
    h[8] = f;
  } else f = h[8];
  let g = C.length - f.length;
  if (messageFrom !== null) {
    const marginTop_2 = screenReaderColumns !== null ? 0 : marginTop;
    const paddingLeft = screenReaderColumns !== null ? 0 : 1;
    let x;
    if (h[9] !== g) {
      x =
        g > 0
          ? jsxProd_default_2(Text, {
              color: "warning",
              wrap: "truncate-end",
              children: [formatOverflowHint(g), ". Make this terminal taller to read and send it."],
            })
          : null;
      h[9] = g;
      h[10] = x;
    } else x = h[10];
    let y;
    if (h[11] !== messageFrom || h[12] !== screenReaderColumns) {
      y =
        messageFrom === "drafted"
          ? jsxProd_default_2(Text, {
              dimColor: true,
              children: [screenReaderColumns !== null ? "" : "  ", DRAFTED_BY_CLAUDE_TEXT],
            })
          : null;
      h[11] = messageFrom;
      h[12] = screenReaderColumns;
      h[13] = y;
    } else y = h[13];
    let k;
    if (h[14] !== f || h[15] !== marginTop_2 || h[16] !== paddingLeft || h[17] !== x || h[18] !== y) {
      k = jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: marginTop_2,
        paddingLeft,
        children: [f, x, y],
      });
      h[14] = f;
      h[15] = marginTop_2;
      h[16] = paddingLeft;
      h[17] = x;
      h[18] = y;
      h[19] = k;
    } else k = h[19];
    return k;
  }
  if (screenReaderColumns !== null) {
    const P = g === 0 ? transcriptChord : null;
    let children;
    if (h[20] !== proposal || h[21] !== proposalBytes || h[22] !== P) {
      children = describeInstructionsScope(proposal, proposalBytes, P);
      h[20] = proposal;
      h[21] = proposalBytes;
      h[22] = P;
      h[23] = children;
    } else children = h[23];
    let x;
    if (h[24] !== children) {
      x = jsxProd_default(Text, {
        children,
      });
      h[24] = children;
      h[25] = x;
    } else x = h[25];
    let y;
    if (h[26] !== g || h[27] !== transcriptChord) {
      y =
        g > 0
          ? jsxProd_default(Text, {
              children: shortcutHintText(g, transcriptChord),
            })
          : null;
      h[26] = g;
      h[27] = transcriptChord;
      h[28] = y;
    } else y = h[28];
    let k;
    if (h[29] !== f || h[30] !== x || h[31] !== y) {
      k = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [x, f, y],
      });
      h[29] = f;
      h[30] = x;
      h[31] = y;
      h[32] = k;
    } else k = h[32];
    return k;
  }
  let B = proposal.sessions?.length ?? 0;
  let _ = proposal.routines?.length ?? 0;
  let me = proposal.instructions !== undefined && proposal.instructions.trim() !== "";
  let P;
  if (h[33] === MEMO_CACHE_SENTINEL) {
    P = jsxProd_default(Text, {
      bold: true,
      children: "Brief",
    });
    h[33] = P;
  } else P = h[33];
  let T;
  if (h[34] !== B) {
    T = B > 0 ? `${B} ${plural(B, "thread")}` : null;
    h[34] = B;
    h[35] = T;
  } else T = h[35];
  let x;
  if (h[36] !== _) {
    x = _ > 0 ? `${_} ${plural(_, "routine")}` : null;
    h[36] = _;
    h[37] = x;
  } else x = h[37];
  const y = me ? "instructions" : null;
  const k = B + _ === 0 && !me ? "summary only" : null;
  const ee = proposalBytes / 1024;
  let de;
  if (h[38] !== ee) {
    de = ee.toFixed(1);
    h[38] = ee;
    h[39] = de;
  } else de = h[39];
  const ne = `${de} KB`;
  let K;
  if (h[40] !== T || h[41] !== x || h[42] !== y || h[43] !== k || h[44] !== ne) {
    K = jsxProd_default_2(Byline, {
      children: [T, x, y, k, ne],
    });
    h[40] = T;
    h[41] = x;
    h[42] = y;
    h[43] = k;
    h[44] = ne;
    h[45] = K;
  } else K = h[45];
  let N;
  if (h[46] !== g || h[47] !== transcriptChord) {
    N =
      g === 0
        ? jsxProd_default_2(Fragment, {
            children: [
              "  ",
              jsxProd_default(KeyboardShortcutHint, {
                chord: transcriptChord,
                action: "show as text",
                parens: true,
                format: {
                  keyCase: "lower",
                },
              }),
            ],
          })
        : null;
    h[46] = g;
    h[47] = transcriptChord;
    h[48] = N;
  } else N = h[48];
  let Y;
  if (h[49] !== K || h[50] !== N) {
    Y = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [
        P,
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["  ", K, N],
        }),
      ],
    });
    h[49] = K;
    h[50] = N;
    h[51] = Y;
  } else Y = h[51];
  let G;
  if (h[52] !== g) {
    G = jsxProd_default(Text, {
      wrap: "truncate-end",
      children: jsxProd_default(OverflowHint, {
        count: g,
        expandable: true,
      }),
    });
    h[52] = g;
    h[53] = G;
  } else G = h[53];
  let X;
  if (h[54] !== f || h[55] !== G) {
    X = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingLeft: 1,
      children: [f, G],
    });
    h[54] = f;
    h[55] = G;
    h[56] = X;
  } else X = h[56];
  let he;
  if (h[57] !== marginTop || h[58] !== Y || h[59] !== X) {
    he = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop,
      children: [Y, X],
    });
    h[57] = marginTop;
    h[58] = Y;
    h[59] = X;
    h[60] = he;
  } else he = h[60];
  return he;
}
export {
  wrapTextToWidth,
  DRAFTED_BY_CLAUDE_TEXT,
  measureInstructionsRows,
  wrapCardText,
  countItemsFittingRows,
  ProjectProposalCard,
};
