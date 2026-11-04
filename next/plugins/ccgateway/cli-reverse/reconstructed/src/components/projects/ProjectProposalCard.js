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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
function normalizeText(text) {
  return stripNonPrintable(text);
}
//@ chunk-a6f4nz0a.js:820-1017 placement
/**
 * 把文本按宽度硬换行（保留空行，可选不裁剪空白），超宽的行再强制切分；被项目对话框多处复用。
 */
function wrapTextToWidth(text, columns, preserveIndent = false) {
  let max = Math.max(1, columns);
  let outLines = [];
  for (let line of text.split(`
`)) {
    if (line === "") {
      outLines.push("");
      continue;
    }
    for (let line_2 of wrapAnsi(line, max, {
      hard: true,
      trim: !preserveIndent,
    }).split(`
`))
      outLines.push(...(bunStringWidth(line_2) <= max ? [line_2] : splitByDisplayWidth(line_2, max)));
  }
  return outLines;
}
//@ chunk-a6f4nz0a.js:1017-1074 placement
function padToWidth(text, width) {
  let textWidth = bunStringWidth(text);
  return textWidth >= width ? text : text + repeatString(" ", width - textWidth);
}
//@ chunk-a6f4nz0a.js:1074-1137 placement
function renderProposalFlow(session) {
  return `${THREAD_WHO_LABELS[session.who]} \u2192 ${THREAD_PRODUCES_LABELS[session.produces]}`;
}
//@ chunk-a6f4nz0a.js:1137-1300 placement
function renderQuotedLines(text, width, kind, dimColor) {
  return wrapTextToWidth(normalizeText(text), width - VERTICAL_BAR_PREFIX.length, true).map((line, index) =>
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
            children: line === "" ? " " : line,
          }),
        ],
      },
      `${kind}${index}`,
    ),
  );
}
//@ chunk-a6f4nz0a.js:1300-1348 placement
/**
 * 函数 wrapCardText（按宽度换行）。
 */
function wrapCardText(text, width) {
  return renderQuotedLines(text.trim(), width, "msg", false);
}
//@ chunk-a6f4nz0a.js:1348-1575 placement = _temp2 (0.87)
function renderProposalHeaderRow(index, title, suffix, meta, color) {
  return jsxProd_default_2(
    Text,
    {
      wrap: "truncate-end",
      children: [
        jsxProd_default(Text, {
          bold: true,
          children: title,
        }),
        suffix !== null
          ? jsxProd_default_2(Text, {
              dimColor: true,
              children: [" (", suffix, ")"],
            })
          : null,
        meta !== null
          ? jsxProd_default_2(Text, {
              dimColor: true,
              children: ["  ", truncateToWidth(meta, Math.max(1, color - bunStringWidth(title) - 8))],
            })
          : null,
      ],
    },
    index,
  );
}
//@ chunk-a6f4nz0a.js:1575-1619 placement
function renderSpace(key) {
  return jsxProd_default(
    Text,
    {
      children: " ",
    },
    key,
  );
}
//@ chunk-a6f4nz0a.js:1619-2191 placement
function renderFromLine(session, index, senderName, body) {
  let numberPrefix = `${index + 1}. `;
  let indent = " ".repeat(numberPrefix.length);
  let columns = body;
  let headerRow = [
    jsxProd_default_2(
      Text,
      {
        wrap: "truncate-end",
        children: [
          jsxProd_default(Text, {
            dimColor: true,
            children: numberPrefix,
          }),
          jsxProd_default(Text, {
            bold: true,
            children: padToWidth(truncateToWidth(normalizeText(session.title), columns), columns),
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
      `t${index}`,
    ),
  ];
  wrapTextToWidth(normalizeText(session.description), senderName - numberPrefix.length).forEach(
    (line, itemIndex) =>
      headerRow.push(
        jsxProd_default_2(
          Text,
          {
            children: [indent, line],
          },
          `d${index}.${itemIndex}`,
        ),
      ),
  );
  wrapTextToWidth(`from ${normalizeText(session.basis)}`, senderName - numberPrefix.length).forEach(
    (line, itemIndex) =>
      headerRow.push(
        jsxProd_default_2(
          Text,
          {
            dimColor: true,
            children: [
              indent,
              itemIndex === 0
                ? jsxProd_default_2(Fragment, {
                    children: [
                      jsxProd_default(Text, {
                        italic: true,
                        children: "from",
                      }),
                      line.slice(4),
                    ],
                  })
                : line,
            ],
          },
          `b${index}.${itemIndex}`,
        ),
      ),
  );
  return headerRow;
}
//@ chunk-a6f4nz0a.js:2191-5033 placement
/**
 * 生成提议的各行（名称、图标、颜色、线程、例程、权限、指令）。
 */
function buildProposalRows(proposal, senderName, options) {
  let rows = [];
  let pushRow = (node) => {
    if (rows.length > 0) rows.push(renderSpace(`gap${rows.length}`));
    rows.push(node);
  };
  if (proposal.name !== undefined || proposal.icon !== undefined || proposal.color !== undefined) {
    let color = proposal.color !== undefined ? PROJECT_COLOR_HEX[proposal.color] : undefined;
    let extras = [
      ...(proposal.icon !== undefined ? [["icon", proposal.icon]] : []),
      ...(proposal.color !== undefined ? [["color", proposal.color]] : []),
    ];
    let reduced = extras.reduce(
      (acc, [proposal, width]) => acc + 3 + proposal.length + 1 + bunStringWidth(width),
      0,
    );
    let max = Math.max(6, senderName - 22 - 7 - reduced);
    rows.push(
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
            extras.map(([label, value], index) =>
              jsxProd_default_2(
                Text,
                {
                  children: [
                    index > 0 || proposal.name !== undefined
                      ? jsxProd_default(Text, {
                          dimColor: true,
                          children: " \xB7 ",
                        })
                      : null,
                    jsxProd_default_2(Text, {
                      dimColor: true,
                      children: [label, " "],
                    }),
                    jsxProd_default(Text, {
                      color,
                      children: value,
                    }),
                  ],
                },
                label,
              ),
            ),
          ],
        },
        "card",
      ),
    );
  }
  if (proposal.summary !== undefined && proposal.summary.trim() !== "")
    rows.push(...renderQuotedLines(proposal.summary.trim(), senderName, "sum", true));
  let sessions = proposal.sessions ?? [];
  if (sessions.length > 0) {
    pushRow(renderProposalHeaderRow("threads", "Threads", sessions.length, null, senderName));
    let max = Math.max(
      1,
      Math.min(
        Math.max(...sessions.map((session) => bunStringWidth(normalizeText(session.title)))),
        senderName -
          3 -
          Math.max(...sessions.map((session) => bunStringWidth(renderProposalFlow(session)))) -
          2,
      ),
    );
    sessions.forEach((session, index) => rows.push(...renderFromLine(session, index, senderName, max)));
  }
  let routines = proposal.routines ?? [];
  if (routines.length > 0) {
    pushRow(
      renderProposalHeaderRow(
        "routines",
        "Routines",
        routines.length,
        "off until you turn one on",
        senderName,
      ),
    );
    let cronLabel = (routine) => `${normalizeText(routine.cron_expression)} UTC`;
    let max = Math.max(
      1,
      Math.min(
        Math.max(...routines.map((routine) => bunStringWidth(normalizeText(routine.name)))),
        senderName - 2 - Math.max(...routines.map((routine) => bunStringWidth(cronLabel(routine)))) - 2,
      ),
    );
    routines.forEach((routine, index) => {
      let children = cronLabel(routine);
      rows.push(
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
          `r${index}`,
        ),
      );
      if (routine.description !== undefined && routine.description !== "")
        wrapTextToWidth(normalizeText(routine.description), senderName - 2).forEach((line, lineIndex) =>
          rows.push(
            jsxProd_default_2(
              Text,
              {
                children: ["  ", line],
              },
              `rd${index}.${lineIndex}`,
            ),
          ),
        );
    });
  }
  if (proposal.instructions !== undefined && proposal.instructions.trim() !== "") {
    pushRow(
      renderProposalHeaderRow(
        "instructions",
        "Project instructions",
        null,
        options.existingProject
          ? "replace the project\u2019s current ones when applied"
          : "set on the project on Yes",
        senderName,
      ),
    );
    rows.push(...renderQuotedLines(proposal.instructions.trim(), senderName, "ins", false));
  }
  if (sessions.length + routines.length > 0) {
    pushRow(
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
        senderName,
      ),
    );
    sessions.forEach((session, index) => {
      rows.push(
        jsxProd_default_2(
          Text,
          {
            dimColor: true,
            wrap: "truncate-end",
            children: [index + 1, ". ", normalizeText(session.title)],
          },
          `pt${index}`,
        ),
      );
      renderQuotedLines(session.prompt.trim(), senderName - 3, `pp${index}.`, true).forEach((line) =>
        rows.push(
          jsxProd_default_2(
            Text,
            {
              children: ["   ", line],
            },
            `i${String(line.key)}`,
          ),
        ),
      );
    });
    routines.forEach((routine, index) => {
      rows.push(
        jsxProd_default_2(
          Text,
          {
            dimColor: true,
            wrap: "truncate-end",
            children: ["\xB7 ", normalizeText(routine.name)],
          },
          `rt${index}`,
        ),
      );
      renderQuotedLines(routine.prompt.trim(), senderName - 3, `rp${index}.`, true).forEach((line) =>
        rows.push(
          jsxProd_default_2(
            Text,
            {
              children: ["   ", line],
            },
            `i${String(line.key)}`,
          ),
        ),
      );
    });
  }
  if (proposal.evidence?.sessions_matched !== undefined)
    pushRow(
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
  return rows;
}
//@ chunk-a6f4nz0a.js:5033-5079 placement
/**
 * 导出值：DRAFTED_BY_CLAUDE_TEXT（"Drafted by Claude from this session"）。
 */
var DRAFTED_BY_CLAUDE_TEXT = "Drafted by Claude from this session";
//@ chunk-a6f4nz0a.js:5079-5475 placement
function describeInstructionsScope(proposal, indexBase, chord) {
  let threadCount = proposal.sessions?.length ?? 0;
  let routineCount = proposal.routines?.length ?? 0;
  let hasInstructions = proposal.instructions !== undefined && proposal.instructions.trim() !== "";
  return [
    `Brief  ${[threadCount > 0 ? `${threadCount} ${plural(threadCount, "thread")}` : null, routineCount > 0 ? `${routineCount} ${plural(routineCount, "routine")}` : null, hasInstructions ? "instructions" : null, threadCount + routineCount === 0 && !hasInstructions ? "summary only" : null, `${(indexBase / 1024).toFixed(1)} KB`].filter((part) => part !== null).join(" \xB7 ")}`,
    chord === null ? "" : formatShortcut(chord, "show as text"),
  ]
    .filter((part) => part !== "")
    .join("  ");
}
//@ chunk-a6f4nz0a.js:5475-5550 placement
function shortcutHintText(count, chord) {
  return [formatOverflowHint(count), formatShortcut(chord, "expand")].filter((part) => part !== "").join(" ");
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
function measureInstructionsRows(proposal, indexBase, shortcutDisplay, columns) {
  return Math.max(
    wrapTextToWidth(describeInstructionsScope(proposal, indexBase, shortcutDisplay), columns, true).length,
    wrapTextToWidth(describeInstructionsScope(proposal, indexBase, null), columns, true).length +
      wrapTextToWidth(shortcutHintText(Math.max(1, indexBase), shortcutDisplay), columns, true).length,
  );
}
//@ chunk-a6f4nz0a.js:5759-5898 placement
/**
 * 在 o 行内能放下多少个列表项（c 为宽度；null 时按项数计）。
 */
function countItemsFittingRows(items, maxRows, columns) {
  if (columns === null) return Math.min(items.length, maxRows);
  let rowsUsed = 0;
  let fitting = 0;
  for (let item of items) {
    rowsUsed += wrapTextToWidth(reactNodeText(item), columns, true).length;
    if (rowsUsed > maxRows) break;
    fitting++;
  }
  return fitting;
}
//@ chunk-a6f4nz0a.js:5898-8834 placement
/**
 * 显示项目设置提议并等待确认（终端太矮时提示）。
 */
function ProjectProposalCard(props) {
  let $ = useMemoCache(61);
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
  let allRows;
  if ($[0] !== existingProject || $[1] !== messageFrom || $[2] !== proposal || $[3] !== width) {
    allRows =
      messageFrom !== null
        ? wrapCardText(proposal.summary ?? "", width)
        : buildProposalRows(proposal, width, {
            existingProject,
          });
    $[0] = existingProject;
    $[1] = messageFrom;
    $[2] = proposal;
    $[3] = width;
    $[4] = allRows;
  } else allRows = $[4];
  let allRows_2 = allRows;
  let visibleRows;
  if ($[5] !== maxRows || $[6] !== allRows_2 || $[7] !== screenReaderColumns) {
    visibleRows = allRows_2.slice(0, countItemsFittingRows(allRows_2, maxRows, screenReaderColumns));
    while (
      visibleRows.length < allRows_2.length &&
      visibleRows.length > 1 &&
      String(visibleRows.at(-1)?.key).startsWith("gap")
    )
      visibleRows.pop();
    $[5] = maxRows;
    $[6] = allRows_2;
    $[7] = screenReaderColumns;
    $[8] = visibleRows;
  } else visibleRows = $[8];
  let hiddenCount = allRows_2.length - visibleRows.length;
  if (messageFrom !== null) {
    const marginTop_2 = screenReaderColumns !== null ? 0 : marginTop;
    const paddingLeft = screenReaderColumns !== null ? 0 : 1;
    let overflowHint;
    if ($[9] !== hiddenCount) {
      overflowHint =
        hiddenCount > 0
          ? jsxProd_default_2(Text, {
              color: "warning",
              wrap: "truncate-end",
              children: [formatOverflowHint(hiddenCount), ". Make this terminal taller to read and send it."],
            })
          : null;
      $[9] = hiddenCount;
      $[10] = overflowHint;
    } else overflowHint = $[10];
    let draftedNote;
    if ($[11] !== messageFrom || $[12] !== screenReaderColumns) {
      draftedNote =
        messageFrom === "drafted"
          ? jsxProd_default_2(Text, {
              dimColor: true,
              children: [screenReaderColumns !== null ? "" : "  ", DRAFTED_BY_CLAUDE_TEXT],
            })
          : null;
      $[11] = messageFrom;
      $[12] = screenReaderColumns;
      $[13] = draftedNote;
    } else draftedNote = $[13];
    let messageBox;
    if (
      $[14] !== visibleRows ||
      $[15] !== marginTop_2 ||
      $[16] !== paddingLeft ||
      $[17] !== overflowHint ||
      $[18] !== draftedNote
    ) {
      messageBox = jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: marginTop_2,
        paddingLeft,
        children: [visibleRows, overflowHint, draftedNote],
      });
      $[14] = visibleRows;
      $[15] = marginTop_2;
      $[16] = paddingLeft;
      $[17] = overflowHint;
      $[18] = draftedNote;
      $[19] = messageBox;
    } else messageBox = $[19];
    return messageBox;
  }
  if (screenReaderColumns !== null) {
    const chord = hiddenCount === 0 ? transcriptChord : null;
    let children;
    if ($[20] !== proposal || $[21] !== proposalBytes || $[22] !== chord) {
      children = describeInstructionsScope(proposal, proposalBytes, chord);
      $[20] = proposal;
      $[21] = proposalBytes;
      $[22] = chord;
      $[23] = children;
    } else children = $[23];
    let scopeElement;
    if ($[24] !== children) {
      scopeElement = jsxProd_default(Text, {
        children,
      });
      $[24] = children;
      $[25] = scopeElement;
    } else scopeElement = $[25];
    let shortcutHint;
    if ($[26] !== hiddenCount || $[27] !== transcriptChord) {
      shortcutHint =
        hiddenCount > 0
          ? jsxProd_default(Text, {
              children: shortcutHintText(hiddenCount, transcriptChord),
            })
          : null;
      $[26] = hiddenCount;
      $[27] = transcriptChord;
      $[28] = shortcutHint;
    } else shortcutHint = $[28];
    let screenReaderBox;
    if ($[29] !== visibleRows || $[30] !== scopeElement || $[31] !== shortcutHint) {
      screenReaderBox = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [scopeElement, visibleRows, shortcutHint],
      });
      $[29] = visibleRows;
      $[30] = scopeElement;
      $[31] = shortcutHint;
      $[32] = screenReaderBox;
    } else screenReaderBox = $[32];
    return screenReaderBox;
  }
  let sessionCount = proposal.sessions?.length ?? 0;
  let routineCount = proposal.routines?.length ?? 0;
  let hasInstructions = proposal.instructions !== undefined && proposal.instructions.trim() !== "";
  let briefLabel;
  if ($[33] === MEMO_CACHE_SENTINEL) {
    briefLabel = jsxProd_default(Text, {
      bold: true,
      children: "Brief",
    });
    $[33] = briefLabel;
  } else briefLabel = $[33];
  let sessionText;
  if ($[34] !== sessionCount) {
    sessionText = sessionCount > 0 ? `${sessionCount} ${plural(sessionCount, "thread")}` : null;
    $[34] = sessionCount;
    $[35] = sessionText;
  } else sessionText = $[35];
  let routineText;
  if ($[36] !== routineCount) {
    routineText = routineCount > 0 ? `${routineCount} ${plural(routineCount, "routine")}` : null;
    $[36] = routineCount;
    $[37] = routineText;
  } else routineText = $[37];
  const instructionsLabel = hasInstructions ? "instructions" : null;
  const summaryOnlyLabel = sessionCount + routineCount === 0 && !hasInstructions ? "summary only" : null;
  const bytesInKb = proposalBytes / 1024;
  let kbText;
  if ($[38] !== bytesInKb) {
    kbText = bytesInKb.toFixed(1);
    $[38] = bytesInKb;
    $[39] = kbText;
  } else kbText = $[39];
  const sizeText = `${kbText} KB`;
  let statsByline;
  if (
    $[40] !== sessionText ||
    $[41] !== routineText ||
    $[42] !== instructionsLabel ||
    $[43] !== summaryOnlyLabel ||
    $[44] !== sizeText
  ) {
    statsByline = jsxProd_default_2(Byline, {
      children: [sessionText, routineText, instructionsLabel, summaryOnlyLabel, sizeText],
    });
    $[40] = sessionText;
    $[41] = routineText;
    $[42] = instructionsLabel;
    $[43] = summaryOnlyLabel;
    $[44] = sizeText;
    $[45] = statsByline;
  } else statsByline = $[45];
  let expandHint;
  if ($[46] !== hiddenCount || $[47] !== transcriptChord) {
    expandHint =
      hiddenCount === 0
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
    $[46] = hiddenCount;
    $[47] = transcriptChord;
    $[48] = expandHint;
  } else expandHint = $[48];
  let header;
  if ($[49] !== statsByline || $[50] !== expandHint) {
    header = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [
        briefLabel,
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["  ", statsByline, expandHint],
        }),
      ],
    });
    $[49] = statsByline;
    $[50] = expandHint;
    $[51] = header;
  } else header = $[51];
  let overflowElement;
  if ($[52] !== hiddenCount) {
    overflowElement = jsxProd_default(Text, {
      wrap: "truncate-end",
      children: jsxProd_default(OverflowHint, {
        count: hiddenCount,
        expandable: true,
      }),
    });
    $[52] = hiddenCount;
    $[53] = overflowElement;
  } else overflowElement = $[53];
  let rowsBox;
  if ($[54] !== visibleRows || $[55] !== overflowElement) {
    rowsBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingLeft: 1,
      children: [visibleRows, overflowElement],
    });
    $[54] = visibleRows;
    $[55] = overflowElement;
    $[56] = rowsBox;
  } else rowsBox = $[56];
  let card;
  if ($[57] !== marginTop || $[58] !== header || $[59] !== rowsBox) {
    card = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop,
      children: [header, rowsBox],
    });
    $[57] = marginTop;
    $[58] = header;
    $[59] = rowsBox;
    $[60] = card;
  } else card = $[60];
  return card;
}
export {
  wrapTextToWidth,
  DRAFTED_BY_CLAUDE_TEXT,
  measureInstructionsRows,
  wrapCardText,
  countItemsFittingRows,
  ProjectProposalCard,
};
