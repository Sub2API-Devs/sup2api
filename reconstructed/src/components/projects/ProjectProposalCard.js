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
import { j } from "../../../vendor/react/cjs/react.production.js";
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
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { formatShortcutHint, KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { reactNodeText } from "../../utils/reactText.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Byline } from "../design-system/Byline.js";
import { OverflowHint } from "../CtrlOToExpand.js";

//@ chunk-a6f4nz0a.js:721-725 placement
j();
//@ chunk-a6f4nz0a.js:725-793 placement
var pe = { claude: "briefLabelClaude", you: "briefLabelYou" },
  te = "\u2502 ";
//@ chunk-a6f4nz0a.js:793-820 placement
function b(t) {
  return stripNonPrintable(t);
}
/**
 * 把文本按宽度硬换行（保留空行，可选不裁剪空白），超宽的行再强制切分；被项目对话框多处复用。
 */
//@ chunk-a6f4nz0a.js:820-1017 placement
function wrapTextToWidth(t, o, c = !1) {
  let max = Math.max(1, o),
    l = [];
  for (let d of t.split(`
`)) {
    if (d === "") {
      l.push("");
      continue;
    }
    for (let p of wrapAnsi(d, max, { hard: !0, trim: !c }).split(`
`))
      l.push(...(bunStringWidth(p) <= max ? [p] : splitByDisplayWidth(p, max)));
  }
  return l;
}
//@ chunk-a6f4nz0a.js:1017-1074 placement
function le(t, o) {
  let c = bunStringWidth(t);
  return c >= o ? t : t + repeatString(" ", o - c);
}
//@ chunk-a6f4nz0a.js:1074-1137 placement
function fe(t) {
  return `${THREAD_WHO_LABELS[t.who]} \u2192 ${THREAD_PRODUCES_LABELS[t.produces]}`;
}
//@ chunk-a6f4nz0a.js:1137-1300 placement
function renderQuotedLines(t, o, c, i) {
  return wrapTextToWidth(b(t), o - te.length, !0).map((l, d) =>
    r(
      Text,
      {
        children: [
          e(Text, { dimColor: !0, children: te }),
          e(Text, { dimColor: i, children: l === "" ? " " : l }),
        ],
      },
      `${c}${d}`,
    ),
  );
}
//@ chunk-a6f4nz0a.js:1300-1348 placement
function xpt(t, o) {
  return renderQuotedLines(t.trim(), o, "msg", !1);
}
//@ chunk-a6f4nz0a.js:1348-1575 placement = _temp2 (0.87)
function renderProposalHeaderRow(t, o, c, i, l) {
  return r(
    Text,
    {
      wrap: "truncate-end",
      children: [
        e(Text, { bold: !0, children: o }),
        c !== null ? r(Text, { dimColor: !0, children: [" (", c, ")"] }) : null,
        i !== null
          ? r(Text, {
              dimColor: !0,
              children: ["  ", truncateToWidth(i, Math.max(1, l - bunStringWidth(o) - 8))],
            })
          : null,
      ],
    },
    t,
  );
}
//@ chunk-a6f4nz0a.js:1575-1619 placement
function ge(t) {
  return e(Text, { children: " " }, t);
}
//@ chunk-a6f4nz0a.js:1619-2191 placement
function renderFromLine(t, o, c, i) {
  let l = `${o + 1}. `,
    repeat = " ".repeat(l.length),
    p = i,
    m = [
      r(
        Text,
        {
          wrap: "truncate-end",
          children: [
            e(Text, { dimColor: !0, children: l }),
            e(Text, { bold: !0, children: le(truncateToWidth(b(t.title), p), p) }),
            "  ",
            e(Text, { color: pe[t.who], children: THREAD_WHO_LABELS[t.who] }),
            r(Text, { dimColor: !0, children: [" \u2192 ", THREAD_PRODUCES_LABELS[t.produces]] }),
          ],
        },
        `t${o}`,
      ),
    ];
  return (
    wrapTextToWidth(b(t.description), c - l.length).forEach((u, a) =>
      m.push(r(Text, { children: [repeat, u] }, `d${o}.${a}`)),
    ),
    wrapTextToWidth(`from ${b(t.basis)}`, c - l.length).forEach((u, a) =>
      m.push(
        r(
          Text,
          {
            dimColor: !0,
            children: [
              repeat,
              a === 0
                ? r(Fragment, { children: [e(Text, { italic: !0, children: "from" }), u.slice(4)] })
                : u,
            ],
          },
          `b${o}.${a}`,
        ),
      ),
    ),
    m
  );
}
/**
 * 生成提议的各行（名称、图标、颜色、线程、例程、权限、指令）。
 */
//@ chunk-a6f4nz0a.js:2191-5033 placement
function buildProposalRows(t, o, c) {
  let i = [],
    l = (m) => {
      if (i.length > 0) i.push(ge(`gap${i.length}`));
      i.push(m);
    };
  if (t.name !== void 0 || t.icon !== void 0 || t.color !== void 0) {
    let m = t.color !== void 0 ? PROJECT_COLOR_HEX[t.color] : void 0,
      u = [
        ...(t.icon !== void 0 ? [["icon", t.icon]] : []),
        ...(t.color !== void 0 ? [["color", t.color]] : []),
      ],
      reduced = u.reduce((R, [C, f]) => R + 3 + C.length + 1 + bunStringWidth(f), 0),
      max = Math.max(6, o - 22 - 7 - reduced);
    i.push(
      r(
        Text,
        {
          wrap: "truncate-end",
          children: [
            e(Text, { bold: !0, children: "Name, icon and color" }),
            "  ",
            t.name !== void 0
              ? r(Fragment, {
                  children: [
                    e(Text, { dimColor: !0, children: "name " }),
                    "\u201C",
                    truncateToWidth(b(t.name), max),
                    "\u201D",
                  ],
                })
              : null,
            u.map(([R, C], f) =>
              r(
                Text,
                {
                  children: [
                    f > 0 || t.name !== void 0 ? e(Text, { dimColor: !0, children: " \xB7 " }) : null,
                    r(Text, { dimColor: !0, children: [R, " "] }),
                    e(Text, { color: m, children: C }),
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
  if (t.summary !== void 0 && t.summary.trim() !== "")
    i.push(...renderQuotedLines(t.summary.trim(), o, "sum", !0));
  let d = t.sessions ?? [];
  if (d.length > 0) {
    l(renderProposalHeaderRow("threads", "Threads", d.length, null, o));
    let max = Math.max(
      1,
      Math.min(
        Math.max(...d.map((u) => bunStringWidth(b(u.title)))),
        o - 3 - Math.max(...d.map((u) => bunStringWidth(fe(u)))) - 2,
      ),
    );
    d.forEach((u, a) => i.push(...renderFromLine(u, a, o, max)));
  }
  let p = t.routines ?? [];
  if (p.length > 0) {
    l(renderProposalHeaderRow("routines", "Routines", p.length, "off until you turn one on", o));
    let m = (a) => `${b(a.cron_expression)} UTC`,
      max = Math.max(
        1,
        Math.min(
          Math.max(...p.map((a) => bunStringWidth(b(a.name)))),
          o - 2 - Math.max(...p.map((a) => bunStringWidth(m(a)))) - 2,
        ),
      );
    p.forEach((a, h) => {
      let R = m(a);
      if (
        (i.push(
          r(
            Text,
            {
              wrap: "truncate-end",
              children: [
                e(Text, { dimColor: !0, children: "\xB7 " }),
                e(Text, { bold: !0, children: le(truncateToWidth(b(a.name), max), max) }),
                "  ",
                e(Text, { color: "permission", children: R }),
              ],
            },
            `r${h}`,
          ),
        ),
        a.description !== void 0 && a.description !== "")
      )
        wrapTextToWidth(b(a.description), o - 2).forEach((C, f) =>
          i.push(r(Text, { children: ["  ", C] }, `rd${h}.${f}`)),
        );
    });
  }
  if (t.instructions !== void 0 && t.instructions.trim() !== "")
    (l(
      renderProposalHeaderRow(
        "instructions",
        "Project instructions",
        null,
        c.existingProject
          ? "replace the project\u2019s current ones when applied"
          : "set on the project on Yes",
        o,
      ),
    ),
      i.push(...renderQuotedLines(t.instructions.trim(), o, "ins", !1)));
  if (d.length + p.length > 0)
    (l(
      renderProposalHeaderRow(
        "prompts",
        p.length === 0
          ? "Thread instructions"
          : d.length === 0
            ? "Routine instructions"
            : "Thread and routine instructions",
        null,
        p.length === 0
          ? "what each thread starts with"
          : d.length === 0
            ? "what each routine starts with"
            : "what each thread and routine starts with",
        o,
      ),
    ),
      d.forEach((m, u) => {
        (i.push(
          r(Text, { dimColor: !0, wrap: "truncate-end", children: [u + 1, ". ", b(m.title)] }, `pt${u}`),
        ),
          renderQuotedLines(m.prompt.trim(), o - 3, `pp${u}.`, !0).forEach((a) =>
            i.push(r(Text, { children: ["   ", a] }, `i${String(a.key)}`)),
          ));
      }),
      p.forEach((m, u) => {
        (i.push(r(Text, { dimColor: !0, wrap: "truncate-end", children: ["\xB7 ", b(m.name)] }, `rt${u}`)),
          renderQuotedLines(m.prompt.trim(), o - 3, `rp${u}.`, !0).forEach((a) =>
            i.push(r(Text, { children: ["   ", a] }, `i${String(a.key)}`)),
          ));
      }));
  if (t.evidence?.sessions_matched !== void 0)
    l(
      r(
        Text,
        {
          dimColor: !0,
          wrap: "truncate-end",
          children: [
            "The draft counts ",
            t.evidence.sessions_matched,
            " of this folder\u2019s",
            " ",
            plural(t.evidence.sessions_matched, "session"),
            " as this stream of work.",
          ],
        },
        "evidence",
      ),
    );
  return i;
}
//@ chunk-a6f4nz0a.js:5033-5079 placement
var mTr = "Drafted by Claude from this session";
//@ chunk-a6f4nz0a.js:5079-5475 placement
function describeInstructionsScope(t, o, c) {
  let i = t.sessions?.length ?? 0,
    l = t.routines?.length ?? 0,
    d = t.instructions !== void 0 && t.instructions.trim() !== "";
  return [
    `Brief  ${[i > 0 ? `${i} ${plural(i, "thread")}` : null, l > 0 ? `${l} ${plural(l, "routine")}` : null, d ? "instructions" : null, i + l === 0 && !d ? "summary only" : null, `${(o / 1024).toFixed(1)} KB`].filter((m) => m !== null).join(" \xB7 ")}`,
    c === null ? "" : ce(c, "show as text"),
  ]
    .filter((m) => m !== "")
    .join("  ");
}
//@ chunk-a6f4nz0a.js:5475-5550 placement
function V(t, o) {
  return [formatOverflowHint(t), ce(o, "expand")].filter((c) => c !== "").join(" ");
}
//@ chunk-a6f4nz0a.js:5550-5632 placement
function ce(t, o) {
  return formatShortcutHint({ chord: t, action: o, parens: !0, format: { keyCase: "lower" } });
}
/**
 * 计算项目指令说明区需要的最大行数（两种展示形式取大者）。
 */
//@ chunk-a6f4nz0a.js:5632-5759 placement
function measureInstructionsRows(t, o, c, i) {
  return Math.max(
    wrapTextToWidth(describeInstructionsScope(t, o, c), i, !0).length,
    wrapTextToWidth(describeInstructionsScope(t, o, null), i, !0).length +
      wrapTextToWidth(V(Math.max(1, o), c), i, !0).length,
  );
}
/**
 * 在 o 行内能放下多少个列表项（c 为宽度；null 时按项数计）。
 */
//@ chunk-a6f4nz0a.js:5759-5898 placement
function countItemsFittingRows(t, o, c) {
  if (c === null) return Math.min(t.length, o);
  let i = 0,
    l = 0;
  for (let d of t) {
    if (((i += wrapTextToWidth(reactNodeText(d), c, !0).length), i > o)) break;
    l++;
  }
  return l;
}
/**
 * 显示项目设置提议并等待确认（终端太矮时提示）。
 */
//@ chunk-a6f4nz0a.js:5898-8834 placement
function ProjectProposalCard(t) {
  let h = w(61),
    {
      proposal: proposal,
      proposalBytes: proposalBytes,
      existingProject: existingProject,
      width: width,
      maxRows: maxRows,
      marginTop: marginTop,
      transcriptChord: transcriptChord,
      screenReaderColumns: screenReaderColumns,
      messageFrom: messageFrom,
    } = t,
    R;
  if (h[0] !== existingProject || h[1] !== messageFrom || h[2] !== proposal || h[3] !== width)
    ((R =
      messageFrom !== null
        ? xpt(proposal.summary ?? "", width)
        : buildProposalRows(proposal, width, { existingProject: existingProject })),
      (h[0] = existingProject),
      (h[1] = messageFrom),
      (h[2] = proposal),
      (h[3] = width),
      (h[4] = R));
  else R = h[4];
  let C = R,
    f;
  if (h[5] !== maxRows || h[6] !== C || h[7] !== screenReaderColumns) {
    f = C.slice(0, countItemsFittingRows(C, maxRows, screenReaderColumns));
    while (f.length < C.length && f.length > 1 && String(f.at(-1)?.key).startsWith("gap")) f.pop();
    ((h[5] = maxRows), (h[6] = C), (h[7] = screenReaderColumns), (h[8] = f));
  } else f = h[8];
  let g = C.length - f.length;
  if (messageFrom !== null) {
    const P = screenReaderColumns !== null ? 0 : marginTop;
    const T = screenReaderColumns !== null ? 0 : 1;
    let x;
    if (h[9] !== g)
      ((x =
        g > 0
          ? r(Text, {
              color: "warning",
              wrap: "truncate-end",
              children: [formatOverflowHint(g), ". Make this terminal taller to read and send it."],
            })
          : null),
        (h[9] = g),
        (h[10] = x));
    else x = h[10];
    let y;
    if (h[11] !== messageFrom || h[12] !== screenReaderColumns)
      ((y =
        messageFrom === "drafted"
          ? r(Text, { dimColor: !0, children: [screenReaderColumns !== null ? "" : "  ", mTr] })
          : null),
        (h[11] = messageFrom),
        (h[12] = screenReaderColumns),
        (h[13] = y));
    else y = h[13];
    let k;
    if (h[14] !== f || h[15] !== P || h[16] !== T || h[17] !== x || h[18] !== y)
      ((k = r(Box, { flexDirection: "column", marginTop: P, paddingLeft: T, children: [f, x, y] })),
        (h[14] = f),
        (h[15] = P),
        (h[16] = T),
        (h[17] = x),
        (h[18] = y),
        (h[19] = k));
    else k = h[19];
    return k;
  }
  if (screenReaderColumns !== null) {
    const P = g === 0 ? transcriptChord : null;
    let T;
    if (h[20] !== proposal || h[21] !== proposalBytes || h[22] !== P)
      ((T = describeInstructionsScope(proposal, proposalBytes, P)),
        (h[20] = proposal),
        (h[21] = proposalBytes),
        (h[22] = P),
        (h[23] = T));
    else T = h[23];
    let x;
    if (h[24] !== T) ((x = e(Text, { children: T })), (h[24] = T), (h[25] = x));
    else x = h[25];
    let y;
    if (h[26] !== g || h[27] !== transcriptChord)
      ((y = g > 0 ? e(Text, { children: V(g, transcriptChord) }) : null),
        (h[26] = g),
        (h[27] = transcriptChord),
        (h[28] = y));
    else y = h[28];
    let k;
    if (h[29] !== f || h[30] !== x || h[31] !== y)
      ((k = r(Box, { flexDirection: "column", children: [x, f, y] })),
        (h[29] = f),
        (h[30] = x),
        (h[31] = y),
        (h[32] = k));
    else k = h[32];
    return k;
  }
  let B = proposal.sessions?.length ?? 0,
    _ = proposal.routines?.length ?? 0,
    me = proposal.instructions !== void 0 && proposal.instructions.trim() !== "",
    P;
  if (h[33] === MEMO_CACHE_SENTINEL) ((P = e(Text, { bold: !0, children: "Brief" })), (h[33] = P));
  else P = h[33];
  let T;
  if (h[34] !== B) ((T = B > 0 ? `${B} ${plural(B, "thread")}` : null), (h[34] = B), (h[35] = T));
  else T = h[35];
  let x;
  if (h[36] !== _) ((x = _ > 0 ? `${_} ${plural(_, "routine")}` : null), (h[36] = _), (h[37] = x));
  else x = h[37];
  const y = me ? "instructions" : null,
    k = B + _ === 0 && !me ? "summary only" : null,
    ee = proposalBytes / 1024;
  let de;
  if (h[38] !== ee) ((de = ee.toFixed(1)), (h[38] = ee), (h[39] = de));
  else de = h[39];
  const ne = `${de} KB`;
  let K;
  if (h[40] !== T || h[41] !== x || h[42] !== y || h[43] !== k || h[44] !== ne)
    ((K = r(Byline, { children: [T, x, y, k, ne] })),
      (h[40] = T),
      (h[41] = x),
      (h[42] = y),
      (h[43] = k),
      (h[44] = ne),
      (h[45] = K));
  else K = h[45];
  let N;
  if (h[46] !== g || h[47] !== transcriptChord)
    ((N =
      g === 0
        ? r(Fragment, {
            children: [
              "  ",
              e(KeyboardShortcutHint, {
                chord: transcriptChord,
                action: "show as text",
                parens: !0,
                format: { keyCase: "lower" },
              }),
            ],
          })
        : null),
      (h[46] = g),
      (h[47] = transcriptChord),
      (h[48] = N));
  else N = h[48];
  let Y;
  if (h[49] !== K || h[50] !== N)
    ((Y = r(Text, {
      wrap: "truncate-end",
      children: [P, r(Text, { dimColor: !0, children: ["  ", K, N] })],
    })),
      (h[49] = K),
      (h[50] = N),
      (h[51] = Y));
  else Y = h[51];
  let G;
  if (h[52] !== g)
    ((G = e(Text, { wrap: "truncate-end", children: e(OverflowHint, { count: g, expandable: !0 }) })),
      (h[52] = g),
      (h[53] = G));
  else G = h[53];
  let X;
  if (h[54] !== f || h[55] !== G)
    ((X = r(Box, { flexDirection: "column", paddingLeft: 1, children: [f, G] })),
      (h[54] = f),
      (h[55] = G),
      (h[56] = X));
  else X = h[56];
  let he;
  if (h[57] !== marginTop || h[58] !== Y || h[59] !== X)
    ((he = r(Box, { flexDirection: "column", marginTop: marginTop, children: [Y, X] })),
      (h[57] = marginTop),
      (h[58] = Y),
      (h[59] = X),
      (h[60] = he));
  else he = h[60];
  return he;
}

export { wrapTextToWidth, mTr, measureInstructionsRows, xpt, countItemsFittingRows, ProjectProposalCard };
