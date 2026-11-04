/**
 * plugins/bundled/youShouldKnow/noteRender.tsx
 *
 * 2.1.316 新增。youShouldKnow 提示渲染。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bss4k1z9.js (89)
 * attribution: placement 89
 */
import { CHOICE_GAP, STAR_CELLS, ABOUT_CLOSED, aboutFit, renderNoteRuns, offerHead } from "./NoteCard.js";
import { checkLineOf } from "./telemetry.js";

//@ chunk-bss4k1z9.js:20421-20452 placement
var DEBUG_ON_WORDS = ["1", "true", "yes", "on"];
//@ chunk-bss4k1z9.js:20452-20512 placement
var isDebugOn = (value) => value !== undefined && DEBUG_ON_WORDS.includes(value.trim().toLowerCase());
//@ chunk-bss4k1z9.js:20512-20549 placement
var debugFlagOf = (value) => value.then(isDebugOn).catch(() => false);
//@ chunk-bss4k1z9.js:20549-20605 placement
async function thenAlways(work, cleanup) {
  try {
    await work();
  } finally {
    await cleanup();
  }
}
//@ chunk-bss4k1z9.js:20605-20658 placement
var emptyCard = () => ({
  title: "",
  lead: "",
  sketch: [],
  caption: "",
});
//@ chunk-bss4k1z9.js:20658-20672 placement
var FENCE_LINE = /^```/;
//@ chunk-bss4k1z9.js:20672-20955 placement
var ansiSequence = () =>
  new RegExp(
    String.raw`[\u001B\u009B][[\]()#;?]*` +
      String.raw`(?:(?:(?:(?:;[-a-zA-Z\d/#&.:=?%@~_]+)*` +
      String.raw`|[a-zA-Z\d]+(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?` +
      String.raw`(?:\u0007|\u001B\u005C|\u009C))` +
      String.raw`|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))`,
    "g",
  );
//@ chunk-bss4k1z9.js:20955-21041 placement
var cleanOneLine = (text) =>
  text
    .replace(/[\x00-\x08\x0E-\x1F\x7F-\x9F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
//@ chunk-bss4k1z9.js:21041-21140 placement
function sliceCodePointsHead(text, maxLength) {
  if (maxLength <= 0) return "";
  return text.length <= maxLength ? text : text.slice(0, maxLength).replace(/[\uD800-\uDBFF]$/, "");
}
//@ chunk-bss4k1z9.js:21140-21237 placement
var stripControlSequences = (line) =>
  line
    .replace(/\p{Cs}/gu, "")
    .replace(ansiSequence(), "")
    .replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, "");
//@ chunk-bss4k1z9.js:21237-21394 placement
function truncateAtWordBoundary(text, maxLength) {
  if (text.length <= maxLength) return text;
  let head = sliceCodePointsHead(text, maxLength - 1);
  let lastSpace = head.search(/\s\S*$/);
  let cut = lastSpace !== -1 ? head.slice(0, lastSpace).trimEnd() : "";
  return `${cut.length > maxLength / 2 ? cut : head.trimEnd()}\u2026`;
}
//@ chunk-bss4k1z9.js:21394-21465 placement
var proseOf = (text) =>
  text
    .split(
      `
`,
    )
    .map((line) => cleanOneLine(line))
    .filter((line) => line !== "").join(`
`);
//@ chunk-bss4k1z9.js:21465-21506 placement
var TITLE_LINE = /^(?:\*\*([^*]+)\*\*|#+\s*(.+))$/;
//@ chunk-bss4k1z9.js:21506-21515 placement
var CHECK_EVERY = 6;
//@ chunk-bss4k1z9.js:21515-21524 placement
var CLEAR_AFTER_PROMPTS = 2;
//@ chunk-bss4k1z9.js:21524-21536 placement
var MAX_CAPTION_LENGTH = 4000;
//@ chunk-bss4k1z9.js:21536-21545 placement
var MAX_CARDS = 4;
//@ chunk-bss4k1z9.js:21545-21555 placement
var MAX_SKETCH_LINES = 12;
//@ chunk-bss4k1z9.js:21555-21566 placement
var MAX_SKETCH_WIDTH = 120;
//@ chunk-bss4k1z9.js:21566-21577 placement
var MAX_TITLE_WIDTH = 120;
//@ chunk-bss4k1z9.js:21577-21601 placement
var LEARN_LABEL = /^learn\s*:\s*/i;
//@ chunk-bss4k1z9.js:21601-21661 placement
var isDeclined = (text) => text === "" || /^none\s*(?:[.!?()[\]:;,-]|$)/i.test(text);
//@ chunk-bss4k1z9.js:21661-21694 placement
var withoutTrailingPeriod = (text) => text.replace(/\.+$/, "");
//@ chunk-bss4k1z9.js:21694-21773 placement
var WRAPPING_QUOTES = [
  ['"', '"'],
  ["'", "'"],
  ["\u201C", "\u201D"],
  ["\u2018", "\u2019"],
  ["`", "`"],
];
//@ chunk-bss4k1z9.js:21773-21930 placement
function unquoted(text) {
  let trimmed = withoutTrailingPeriod(text.trim());
  return trimmed.length >= 2 &&
    WRAPPING_QUOTES.some(
      ([open, close]) =>
        trimmed.startsWith(open) && trimmed.endsWith(close) && !trimmed.slice(1, -1).includes(close),
    )
    ? withoutTrailingPeriod(trimmed.slice(1, -1).trim())
    : trimmed;
}
//@ chunk-bss4k1z9.js:21930-21964 placement
var CLOSERS = WRAPPING_QUOTES.map(([, closer]) => closer).join("");
//@ chunk-bss4k1z9.js:21964-22010 placement
var ENDS_A_SENTENCE = new RegExp(`[.!?\u2026][${CLOSERS})\\]]*$`);
//@ chunk-bss4k1z9.js:22010-22044 placement
var ENDS_WITH_QUESTION = new RegExp(`\\?[${CLOSERS}]?$`);
//@ chunk-bss4k1z9.js:22044-22067 placement
var EXPLAIN_LABEL = /^explain:\s*/i;
//@ chunk-bss4k1z9.js:22067-22156 placement
var INLINE_TAG = /[.\s\u2014\u2013-]*\s\**tag\**\s*:\s*\**\s*(heads[\s-]*up|you should know)\W*$/i;
//@ chunk-bss4k1z9.js:22156-22191 placement
var openingOf = (text) => unquoted(unquoted(text).replace(INLINE_TAG, ""));
//@ chunk-bss4k1z9.js:22191-22202 placement
var MAX_LINE_WIDTH = 240;
//@ chunk-bss4k1z9.js:22202-22727 placement
function parseExplanation(text) {
  let cards = [];
  let card = emptyCard();
  let inFence = false;
  let seenContent = false;
  function flushCard() {
    card.lead = truncateAtWordBoundary(proseOf(card.lead), MAX_CAPTION_LENGTH);
    card.caption = truncateAtWordBoundary(proseOf(card.caption), MAX_CAPTION_LENGTH);
    if (card.title || card.lead || card.sketch.length > 0 || card.caption) cards.push(card);
    card = emptyCard();
  }
  for (let line of text.split(`
`)) {
    let replaced = stripControlSequences(line).replace(/\s+$/, "");
    if (FENCE_LINE.test(replaced.trim())) {
      if (!inFence && seenContent) flushCard();
      inFence = !inFence;
      seenContent = true;
      continue;
    }
    if (inFence) {
      if (card.sketch.length < MAX_SKETCH_LINES)
        card.sketch = [...card.sketch, sliceCodePointsHead(replaced, MAX_SKETCH_WIDTH)];
      continue;
    }
    let match = TITLE_LINE.exec(replaced.trim());
    if (match) {
      flushCard();
      seenContent = false;
      card.title = sliceCodePointsHead(cleanOneLine(match[1] ?? match[2] ?? ""), MAX_TITLE_WIDTH);
      continue;
    }
    let targetField = card.sketch.length === 0 && !seenContent ? "lead" : "caption";
    card[targetField] += `
${replaced}`;
  }
  flushCard();
  return cards.slice(0, MAX_CARDS);
}
//@ chunk-bss4k1z9.js:22727-22752 placement
var DEFAULT_TAG = "You should know";
//@ chunk-bss4k1z9.js:22752-22784 placement
var HEADS_UP = /^\W*heads[\s-]*up\W*$/i;
//@ chunk-bss4k1z9.js:22784-22958 placement
var TAG_LABEL = new RegExp(
  String.raw`^[\s>*_"'\u201C\u201D\u2018\u2019` +
    "`" +
    String.raw`]*tag[\s*_"'\u201C\u201D\u2018\u2019` +
    "`" +
    String.raw`]*(?::\s*|[-\u2013\u2014](?:\s+|$))`,
  "i",
);
//@ chunk-bss4k1z9.js:22958-22994 placement
var tagOf = (text) => (HEADS_UP.test(text) ? "Heads up" : DEFAULT_TAG);
//@ chunk-bss4k1z9.js:22994-23811 placement
function parseProposedLine(text) {
  let lines = text.split(`
`);
  let mapped = lines.map((line) => stripControlSequences(line).trimStart());
  let index = mapped.findIndex((line) => LEARN_LABEL.test(line.replace(/^[-*\u2022]\s+/, "")));
  let index_2 = mapped.slice(index + 1).findIndex((line) => EXPLAIN_LABEL.test(line));
  let hasLabels = index !== -1 && index_2 !== -1;
  let explainLineIndex = hasLabels ? index + 1 + index_2 : -1;
  let trimmed = [
    (mapped[explainLineIndex] ?? "").replace(EXPLAIN_LABEL, ""),
    ...lines.slice(explainLineIndex + 1),
  ]
    .join(
      `
`,
    )
    .trim();
  let explanation = hasLabels ? trimmed || undefined : undefined;
  let mapped_2 = (hasLabels ? lines.slice(0, explainLineIndex) : lines).map((line) =>
    cleanOneLine(stripControlSequences(line)).replace(/^[-*\u2022]\s+/, ""),
  );
  let tagLine = mapped_2.find((line) => TAG_LABEL.test(line)) ?? "";
  let lineTag = tagOf(tagLine.replace(TAG_LABEL, ""));
  for (let [lineIndex, line] of mapped_2.entries()) {
    if (!LEARN_LABEL.test(line)) continue;
    let text = line.replace(LEARN_LABEL, "").trim();
    if (isDeclined(openingOf(text)))
      return {
        kind: "none",
      };
    for (let line of mapped_2.slice(lineIndex + 1)) {
      if (line === "" || LEARN_LABEL.test(line) || TAG_LABEL.test(line) || ENDS_WITH_QUESTION.test(text))
        break;
      text += ` ${line}`;
    }
    let unquotedText = unquoted(text);
    let match = INLINE_TAG.exec(unquotedText);
    let sentence = match === null ? unquotedText : unquoted(unquotedText.slice(0, match.index));
    let finalLine = ENDS_A_SENTENCE.test(sentence) ? sentence : `${sentence}.`;
    let tag = tagLine === "" && match !== null ? tagOf(match?.[1] ?? "") : lineTag;
    if (finalLine.length <= MAX_LINE_WIDTH)
      return {
        kind: "line",
        line: finalLine,
        tag,
        explanation,
      };
  }
  return {
    kind: "unparsable",
  };
}
//@ chunk-bss4k1z9.js:23811-23821 placement
var SEEN_MAX = 50;
//@ chunk-bss4k1z9.js:23821-23873 placement
var drawsBand = (surfaces, activeSurfaces) =>
  surfaces.some((surface) => surface === "terminal" || activeSurfaces.has(surface));
//@ chunk-bss4k1z9.js:23873-23925 placement
var OWN_COMPOSER = {
  terminal: false,
  desktop: true,
  mobile: true,
  vscode: true,
};
//@ chunk-bss4k1z9.js:23925-23965 placement
var hasOwnComposer = (surface) => !Object.hasOwn(OWN_COMPOSER, surface) || OWN_COMPOSER[surface];
//@ chunk-bss4k1z9.js:23965-24017 placement
var isOpenView = (view) => view?.kind === "offer" || view?.kind === "explained";
//@ chunk-bss4k1z9.js:24017-24076 placement
var isSameShowing = (view, secondView) =>
  isOpenView(view) && view.kind === secondView.kind && view.shownAt === secondView.shownAt;
//@ chunk-bss4k1z9.js:24076-24152 placement
function storedCount(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}
//@ chunk-bss4k1z9.js:24152-24218 placement
var stringLines = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === "string") : []);
//@ chunk-bss4k1z9.js:24218-24368 placement
function iterationOf(view) {
  switch (view.kind) {
    case "explained":
      return storedCount(view.iteration);
    case "asked":
      return view.iteration === undefined ? undefined : storedCount(view.iteration);
    case "offer":
      return;
  }
}
//@ chunk-bss4k1z9.js:24368-24473 placement
function keptPastPrompt(view, promptsSurvived) {
  return view.kind === "offer"
    ? {
        ...view,
        promptsSurvived,
        isOffArmed: false,
      }
    : {
        ...view,
        promptsSurvived,
      };
}
//@ chunk-bss4k1z9.js:24473-24526 placement
var ACCENT_LEAD_INK = {
  star: {
    color: "suggestion",
  },
  tag: {
    dimColor: true,
  },
};
//@ chunk-bss4k1z9.js:24526-24578 placement
var MUTED_LEAD_INK = {
  star: {
    color: "subtle",
  },
  tag: {
    color: "subtle",
  },
};
//@ chunk-bss4k1z9.js:24578-24630 placement
var LEAD_INK = {
  terminal: ACCENT_LEAD_INK,
  desktop: MUTED_LEAD_INK,
  mobile: ACCENT_LEAD_INK,
  vscode: ACCENT_LEAD_INK,
};
//@ chunk-bss4k1z9.js:24630-24656 placement
var leadInkOf = (card) => card.leadInk ?? ACCENT_LEAD_INK;
//@ chunk-bss4k1z9.js:24656-24707 placement
function leadInkOn(name) {
  return Object.hasOwn(LEAD_INK, name) ? LEAD_INK[name] : ACCENT_LEAD_INK;
}
//@ chunk-bss4k1z9.js:24707-24720 placement
var ASKED_MS = 20000;
//@ chunk-bss4k1z9.js:24720-24885 placement
function choice(ui, { hotkey, label, onPress, isDim, role }) {
  let { Box, Button } = ui;
  return h(
    Box,
    {
      marginRight: CHOICE_GAP,
    },
    h(
      Button,
      {
        hotkey,
        plain: true,
        dimColor: isDim,
        role,
        onPress,
      },
      label,
    ),
  );
}
//@ chunk-bss4k1z9.js:24885-25012 placement
function lead(ui, tag) {
  let { Text } = ui;
  let ink = leadInkOf(ui);
  return h(
    Text,
    null,
    h(
      Text,
      {
        ...ink.star,
      },
      "\u2726",
    ),
    tag === undefined
      ? " "
      : h(
          Text,
          {
            ...ink.tag,
          },
          " ",
          tag,
          " \xB7 ",
        ),
  );
}
//@ chunk-bss4k1z9.js:25012-25172 placement
function starColumn(ui, content) {
  let { Box, Text } = ui;
  let ink = leadInkOf(ui);
  return h(
    Box,
    {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    h(
      Box,
      {
        flexShrink: 0,
        width: STAR_CELLS,
      },
      h(
        Text,
        {
          ...ink.star,
        },
        "\u2726",
      ),
    ),
    content,
  );
}
//@ chunk-bss4k1z9.js:25172-25336 placement
function starred(ui, tag, text) {
  let { Text } = ui;
  let ink = leadInkOf(ui);
  return (ui.hasStarColumn ?? true)
    ? starColumn(
        ui,
        h(
          Text,
          {
            wrap: "wrap",
          },
          tag === undefined
            ? ""
            : h(
                Text,
                {
                  ...ink.tag,
                },
                tag,
                " \xB7 ",
              ),
          text,
        ),
      )
    : h(
        Text,
        {
          wrap: "wrap",
        },
        lead(ui, tag),
        text,
      );
}
//@ chunk-bss4k1z9.js:25336-25757 placement
function dismissedLine(ui, choices, onPress) {
  let { Box, Text } = ui;
  let hasStarColumn = ui.hasStarColumn ?? true;
  let mapped = [
    ...choices,
    {
      hotkey: "0",
      label: "Dismiss",
      onPress,
      role: "dismiss",
    },
  ].map((choiceSpec) => choice(ui, choiceSpec));
  return hasStarColumn
    ? h(
        Box,
        {
          flexDirection: "column",
          marginTop: 1,
        },
        starColumn(
          ui,
          h(
            Box,
            {
              flexWrap: "wrap",
            },
            h(
              Box,
              {
                marginRight: CHOICE_GAP,
              },
              h(
                Text,
                {
                  dimColor: true,
                  wrap: "truncate-end",
                },
                "Dismissed.",
              ),
            ),
            mapped,
          ),
        ),
      )
    : h(
        Box,
        {
          marginTop: 1,
          flexWrap: "wrap",
        },
        h(
          Box,
          {
            marginRight: CHOICE_GAP,
          },
          h(
            Text,
            {
              wrap: "truncate-end",
            },
            lead(ui),
            h(
              Text,
              {
                dimColor: true,
              },
              "Dismissed.",
            ),
          ),
        ),
        mapped,
      );
}
//@ chunk-bss4k1z9.js:25757-26068 placement
function askedRow(ui, actions) {
  let off = actions.off;
  let turnOffChoices =
    off !== undefined
      ? [
          {
            hotkey: "4",
            label: "Turn off suggestions",
            onPress: off,
          },
        ]
      : [];
  return dismissedLine(
    ui,
    [
      {
        hotkey: "1",
        label: "That was helpful",
        onPress: actions.helpful,
      },
      {
        hotkey: "2",
        label: "Not relevant",
        onPress: actions.notRelevant,
      },
      {
        hotkey: "3",
        label: "Couldn\u2019t understand",
        onPress: actions.notUnderstood,
      },
      ...turnOffChoices,
    ],
    actions.dismiss,
  );
}
//@ chunk-bss4k1z9.js:26068-26224 placement
var explainedAskedRow = (ui, actions) =>
  dismissedLine(
    ui,
    [
      {
        hotkey: "1",
        label: "That was helpful",
        onPress: actions.helpful,
      },
      {
        hotkey: "2",
        label: "Didn\u2019t understand",
        onPress: actions.notUnderstood,
      },
    ],
    actions.dismiss,
  );
//@ chunk-bss4k1z9.js:26224-26317 placement
function choicesRow(ui, choices) {
  let { Box } = ui;
  return h(
    Box,
    {
      marginLeft: 2,
      flexWrap: "wrap",
    },
    choices.map((spec) => choice(ui, spec)),
  );
}
//@ chunk-bss4k1z9.js:26317-26542 placement
function debugRows(ui, checkLines, footer) {
  let { Box, Text } = ui;
  return h(
    Box,
    {
      flexDirection: "column",
    },
    h(
      Box,
      {
        flexDirection: "column",
        marginTop: 1,
      },
      checkLines.map((checkLine) =>
        h(
          Box,
          null,
          h(
            Text,
            {
              ...leadInkOf(ui).star,
            },
            "\u2726",
          ),
          h(
            Text,
            {
              wrap: "truncate-end",
              dimColor: true,
            },
            " ",
            checkLineOf(checkLine),
          ),
        ),
      ),
    ),
    footer ?? "",
  );
}
//@ chunk-bss4k1z9.js:26542-26555 placement
var HARD_BREAK = `  
`;
//@ chunk-bss4k1z9.js:26555-26596 placement
var LIST_MARKER = /^(?:[-*+\u2022]|(\d+)([.)]))\s+/;
//@ chunk-bss4k1z9.js:26596-26626 placement
var LEADING_NUMBER = /^(\d+)([.)])(?=\s|$)/;
//@ chunk-bss4k1z9.js:26626-26707 placement
var MARKUP = /\*\*([^*\n]+?)\*\*|`([^`\n]+)`|[\\`*_{}[<>#+\-=|~^$&:@]|(?<=[wW]{3})\./g;
//@ chunk-bss4k1z9.js:26707-26757 placement
var STRUCTURAL = /[\\`*_{}[<>#+\-=|~^$&:@]|(?<=[wW]{3})\./g;
//@ chunk-bss4k1z9.js:26757-26919 placement
var literal = (text) =>
  text
    .trimStart()
    .replace(MARKUP, (match, boldText, escapeText) => {
      let hasEscape = escapeText !== undefined;
      let hasBold = boldText !== undefined;
      let bold = `**${(boldText ?? "").replace(STRUCTURAL, "\\$&")}**`;
      return hasEscape ? match : hasBold ? bold : `\\${match}`;
    })
    .replace(LEADING_NUMBER, "$1\\$2");
//@ chunk-bss4k1z9.js:26919-27319 placement
function lineShape(line, ordinal) {
  let trimmed = line.trimStart();
  let match = LIST_MARKER.exec(trimmed);
  let text = literal(trimmed.slice(match?.[0].length ?? 0));
  let numberText = match?.[1];
  let number = Number(numberText);
  let isSequential = `${(ordinal ?? number - 1) + 1}.` === `${numberText}${match?.[2]}`;
  if (match === null)
    return {
      kind: "plain",
      text,
      canOpenInPlace: false,
    };
  if (numberText === undefined)
    return {
      kind: "bullet",
      text: `- ${text}`,
      canOpenInPlace: true,
    };
  return isSequential
    ? {
        kind: "ordered",
        text: `${number}. ${text}`,
        canOpenInPlace: number === 1,
        ordinal: number,
      }
    : {
        kind: "plain",
        text: `${numberText}\\${match[2]} ${text}`,
        canOpenInPlace: false,
      };
}
//@ chunk-bss4k1z9.js:27319-27517 placement
function drawnLine(line, prevLine) {
  let shape = lineShape(line, prevLine?.ordinal);
  let isPlain = shape.kind === "plain";
  let prevIsPlain = isPlain && prevLine?.kind === "plain";
  let continuesList = (!isPlain && shape.kind === prevLine?.kind) || shape.canOpenInPlace;
  let separator = prevIsPlain
    ? HARD_BREAK
    : continuesList
      ? `
`
      : `

`;
  if (prevLine === undefined) return shape;
  return {
    ...shape,
    text: `${separator}${shape.text}`,
  };
}
//@ chunk-bss4k1z9.js:27517-27760 placement
function proseMarkdown(text, title) {
  let titleLine = title === "" ? "" : `**${title.replace(STRUCTURAL, "\\$&")}**`;
  let leadLines =
    titleLine !== ""
      ? [
          {
            kind: "plain",
            text: titleLine,
            canOpenInPlace: false,
          },
        ]
      : [];
  let joined = text
    .split(
      `
`,
    )
    .filter((line) => line !== "")
    .reduce((acc, line) => [...acc, drawnLine(line, acc.at(-1))], leadLines)
    .map((entry) => entry.text)
    .join("");
  return joined === ""
    ? ""
    : `${joined}

`;
}
//@ chunk-bss4k1z9.js:27760-27838 placement
function prose(ui, lead, title) {
  let { Markdown } = ui;
  let text = proseMarkdown(lead, title);
  return text === ""
    ? ""
    : h(Markdown, {
        text,
      });
}
//@ chunk-bss4k1z9.js:27838-28423 placement
function explainedRow(ui, ...[line, cards, actions, tag = DEFAULT_TAG]) {
  let { Box, Code } = ui;
  return h(
    Box,
    {
      flexDirection: "column",
      marginTop: 1,
    },
    h(
      Box,
      {
        flexDirection: "column",
        marginBottom: 1,
      },
      starred(ui, tag, line),
    ),
    cards.map((card) => {
      let hasSketch = card.sketch.length > 0;
      return h(
        Box,
        {
          flexDirection: "column",
          marginBottom: 1,
          marginLeft: 2,
        },
        prose(ui, card.lead, card.title),
        hasSketch
          ? h(Code, {
              source: card.sketch.map((sketchLine) => (sketchLine === "" ? " " : sketchLine)).join(`
`),
              language: "text",
              wrap: "truncate-end",
            })
          : "",
        prose(ui, card.caption, ""),
      );
    }),
    actions === null
      ? ""
      : choicesRow(ui, [
          {
            hotkey: "1",
            label: "Understood",
            onPress: actions.gotIt,
          },
          {
            hotkey: "2",
            label: "Chat in main session",
            onPress: actions.respond,
          },
          {
            hotkey: "0",
            label: "Dismiss",
            onPress: actions.dismiss,
            role: "dismiss",
          },
        ]),
  );
}
//@ chunk-bss4k1z9.js:28423-28561 placement
function stillRow(ui, text) {
  let { Box, Text } = ui;
  return h(
    Box,
    {
      marginTop: 1,
    },
    h(
      Text,
      {
        ...leadInkOf(ui).star,
      },
      "\u2726",
    ),
    h(
      Text,
      {
        wrap: "truncate-end",
        dimColor: true,
      },
      " ",
      text,
    ),
  );
}
//@ chunk-bss4k1z9.js:28561-28598 placement
var explainingRow = (ui) => stillRow(ui, "One moment\u2026");
//@ chunk-bss4k1z9.js:28598-29053 placement
function failedRow(ui, reason, onPress) {
  let { Box, Text } = ui;
  let isPublish = reason === "publish";
  let isBlocked = reason === "blocked";
  let isExplain = reason === "explain";
  let isTurnOff = reason === "turn_off";
  return h(
    Box,
    {
      marginTop: 1,
    },
    h(
      Text,
      {
        wrap: "truncate-end",
      },
      lead(ui),
      isPublish
        ? "Couldn\u2019t publish that page"
        : isBlocked
          ? "Not published (blocked by a permission setting)"
          : isExplain
            ? "Couldn\u2019t write that explanation"
            : isTurnOff
              ? "Couldn\u2019t turn suggestions off here. Use /plugin."
              : "Couldn\u2019t write that page",
      " ",
      h(
        Text,
        {
          dimColor: true,
        },
        "\xB7",
      ),
      " ",
    ),
    choice(ui, {
      hotkey: "0",
      label: "OK",
      onPress,
    }),
  );
}
//@ chunk-bss4k1z9.js:29053-29062 placement
var CARD_INSET = 2;
//@ chunk-bss4k1z9.js:29062-29072 placement
var FALLBACK_COLUMNS = 80;
//@ chunk-bss4k1z9.js:29072-29235 placement
var NARROW_BOUNDS = {
  hangulJamo: 4352,
  punctuation: {
    first: 8208,
    last: 8286,
  },
  arrows: {
    first: 8592,
    last: 8703,
  },
  shapes: {
    first: 9472,
    last: 9727,
  },
  mediumSmallSquares: {
    white: 9725,
    black: 9726,
  },
};
//@ chunk-bss4k1z9.js:29235-29434 placement
function glyphCellsAtMost(codePoint) {
  let { hangulJamo, punctuation, arrows, shapes, mediumSmallSquares } = NARROW_BOUNDS;
  return codePoint < hangulJamo ||
    (codePoint >= punctuation.first && codePoint <= punctuation.last) ||
    (codePoint >= arrows.first && codePoint <= arrows.last) ||
    (codePoint >= shapes.first &&
      codePoint <= shapes.last &&
      codePoint !== mediumSmallSquares.white &&
      codePoint !== mediumSmallSquares.black)
    ? 1
    : 2;
}
//@ chunk-bss4k1z9.js:29434-29508 placement
function lineCellsAtMost(text) {
  let cells = 0;
  for (let char of text) cells += glyphCellsAtMost(char.codePointAt(0) ?? 0);
  return cells;
}
//@ chunk-bss4k1z9.js:29508-29626 placement
function fitLine(text, maxCells) {
  if (lineCellsAtMost(text) <= maxCells) return text;
  let used = 0;
  let out = "";
  for (let char of text) {
    used += lineCellsAtMost(char);
    if (used > maxCells - 1) return `${out}\u2026`;
    out += char;
  }
  return out;
}
//@ chunk-bss4k1z9.js:29626-29785 placement
function fitCards(explanation, bodyColumns) {
  let columns = Number.isFinite(bodyColumns) ? bodyColumns : FALLBACK_COLUMNS;
  return explanation.map((card) => ({
    ...card,
    title: fitLine(card.title, Math.max(columns - CARD_INSET, 1)),
    sketch: card.sketch.map((sketchLine) => fitLine(sketchLine, Math.max(columns - CARD_INSET, 1))),
  }));
}
//@ chunk-bss4k1z9.js:29785-29872 placement
var makingRow = (ui) => stillRow(ui, "Making your page (a minute or two) \xB7 Claude keeps working\u2026");
//@ chunk-bss4k1z9.js:29872-29977 placement
var wayOutChoices = (onDisable, isConfirming) =>
  onDisable === undefined
    ? []
    : [
        {
          hotkey: "4",
          label: isConfirming ? "Press again to disable" : "Disable",
          onPress: onDisable,
          isDim: true,
        },
      ];
//@ chunk-bss4k1z9.js:29977-30498 placement
function offerRow(ui, ...[line, actions, isConfirming, about = ABOUT_CLOSED, tag = DEFAULT_TAG]) {
  let { Box } = ui;
  let learnChoices = [
    {
      hotkey: "1",
      label: "Learn more",
      onPress: actions.explain,
    },
    {
      hotkey: "2",
      label: "Knew this already",
      onPress: actions.knew,
    },
  ];
  let restChoices = [
    ...wayOutChoices(actions.off, isConfirming),
    {
      hotkey: "0",
      label: "Dismiss",
      onPress: actions.later,
      role: "dismiss",
    },
  ];
  let fit = aboutFit(about, {
    tag,
    line,
    before: learnChoices,
    after: restChoices,
  });
  let head =
    fit.note.length > 0
      ? {
          tag: undefined,
          body: renderNoteRuns(ui, fit.note, {
            dimColor: true,
          }),
        }
      : {
          tag,
          body: line,
        };
  let isTerminal = about.surface === "terminal";
  return h(
    Box,
    {
      flexDirection: "column",
      marginTop: 1,
    },
    isTerminal
      ? starred(ui, head.tag, head.body)
      : offerHead(ui, {
          lead: lead(ui, head.tag),
          body: head.body,
          ...about,
        }),
    choicesRow(ui, [...learnChoices, ...fit.choices, ...restChoices]),
  );
}
//@ chunk-bss4k1z9.js:30498-30857 placement
function readyRow(ui, url, actions) {
  let { Box, Text } = ui;
  return h(
    Box,
    {
      flexDirection: "column",
      marginTop: 1,
    },
    h(
      Text,
      {
        wrap: "truncate-end",
      },
      lead(ui),
      "Learning page ready",
    ),
    h(
      Box,
      {
        marginLeft: 2,
      },
      h(
        Text,
        {
          dimColor: true,
          wrap: "wrap",
        },
        url,
      ),
    ),
    choicesRow(ui, [
      {
        hotkey: "1",
        label: "Helpful",
        onPress: actions.helpful,
      },
      {
        hotkey: "2",
        label: "Not helpful",
        onPress: actions.notHelpful,
      },
      {
        hotkey: "3",
        label: "Didn\u2019t read",
        onPress: actions.unread,
      },
    ]),
  );
}
//@ chunk-bss4k1z9.js:30857-31017 placement = registerEscHotkey (0.311)
/**
 * （匹配存疑）按条件去掉按钮的 hotkey/plain 属性并设置 leadInk/hasStarColumn，属于 UI 主题，不是 ESC 热键注册。
 */
function registerEscHotkey(name, ui) {
  let hasComposer = hasOwnComposer(name);
  let leadInk = leadInkOn(name);
  return hasComposer
    ? {
        ...ui,
        Button: ({ hotkey, plain, ...props }) => ui.Button(props),
        leadInk,
        hasStarColumn: false,
      }
    : {
        ...ui,
        leadInk,
        hasStarColumn: true,
      };
}
export {
  ACCENT_LEAD_INK,
  ASKED_MS,
  CARD_INSET,
  CHECK_EVERY,
  CLEAR_AFTER_PROMPTS,
  CLOSERS,
  DEBUG_ON_WORDS,
  DEFAULT_TAG,
  ENDS_A_SENTENCE,
  ENDS_WITH_QUESTION,
  EXPLAIN_LABEL,
  FALLBACK_COLUMNS,
  FENCE_LINE,
  HARD_BREAK,
  HEADS_UP,
  INLINE_TAG,
  LEADING_NUMBER,
  LEAD_INK,
  LEARN_LABEL,
  LIST_MARKER,
  MARKUP,
  MAX_CAPTION_LENGTH,
  MAX_CARDS,
  MAX_LINE_WIDTH,
  MAX_SKETCH_LINES,
  MAX_SKETCH_WIDTH,
  MAX_TITLE_WIDTH,
  MUTED_LEAD_INK,
  NARROW_BOUNDS,
  OWN_COMPOSER,
  SEEN_MAX,
  STRUCTURAL,
  TAG_LABEL,
  TITLE_LINE,
  WRAPPING_QUOTES,
  ansiSequence,
  askedRow,
  choice,
  choicesRow,
  cleanOneLine,
  debugFlagOf,
  debugRows,
  dismissedLine,
  drawnLine,
  drawsBand,
  emptyCard,
  explainedAskedRow,
  explainedRow,
  explainingRow,
  failedRow,
  fitCards,
  fitLine,
  glyphCellsAtMost,
  hasOwnComposer,
  isDebugOn,
  isDeclined,
  isOpenView,
  isSameShowing,
  iterationOf,
  keptPastPrompt,
  lead,
  leadInkOf,
  leadInkOn,
  lineCellsAtMost,
  lineShape,
  literal,
  makingRow,
  offerRow,
  openingOf,
  parseExplanation,
  parseProposedLine,
  prose,
  proseMarkdown,
  proseOf,
  readyRow,
  registerEscHotkey,
  sliceCodePointsHead,
  starColumn,
  starred,
  stillRow,
  storedCount,
  stringLines,
  stripControlSequences,
  tagOf,
  thenAlways,
  truncateAtWordBoundary,
  unquoted,
  wayOutChoices,
  withoutTrailingPeriod,
};
