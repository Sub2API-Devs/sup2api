/**
 * plugins/bundled/youShouldKnow/NoteCard.tsx
 *
 * 2.1.316 新增。内置插件 youShouldKnow 的提示卡片。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bss4k1z9.js (55)
 * attribution: placement 55
 */
import { PressEnterToContinue } from "../../../components/PressEnterToContinue.js";
import { CC_PLUGIN_YOU_SHOULD_KNOW } from "../../../services/tips/youShouldKnowTip.js";

//@ chunk-bss4k1z9.js:13092-13231 placement
function renderNoteRuns(ui, runs, style) {
  let { Text } = ui;
  return runs
    .flatMap((run, index) =>
      index === 0
        ? run
        : [
            {
              text: " ",
            },
            ...run,
          ],
    )
    .map(({ text, look }) =>
      h(
        Text,
        {
          ...(look === undefined ? style : PressEnterToContinue[look]),
        },
        text,
      ),
    );
}
//@ chunk-bss4k1z9.js:13231-13241 placement
var CARD_WIDTH = 60;
//@ chunk-bss4k1z9.js:13241-13477 placement
function aboutCard(ui, runs) {
  let { Box, Text } = ui;
  return h(
    Box,
    {
      position: "absolute",
      bottom: 1,
      left: 0,
      display: "none",
      hover: {
        display: "flex",
      },
      flexDirection: "column",
      borderStyle: "round",
      borderDimColor: true,
      paddingX: 1,
      width: CARD_WIDTH,
    },
    h(
      Text,
      {
        wrap: "wrap",
      },
      renderNoteRuns(ui, runs, {}),
    ),
  );
}
//@ chunk-bss4k1z9.js:13477-13579 placement
var aboutChoice = (state) => ({
  hotkey: "3",
  label: state.isOpen ? "Return to topic" : "What is this",
  onPress: state.onPress,
  isDim: true,
});
//@ chunk-bss4k1z9.js:13579-13641 placement
var plainText = (runs) => runs.map((run) => run.map((part) => part.text).join("")).join(" ");
//@ chunk-bss4k1z9.js:13641-13739 placement
var LEARN = [
  {
    text: "Learn more",
    look: "bold",
  },
  {
    text: " to get a deeper explanation and chat about it.",
  },
];
//@ chunk-bss4k1z9.js:13739-13779 placement
var OFF_COMMAND = `/plugin disable ${CC_PLUGIN_YOU_SHOULD_KNOW}@builtin`;
//@ chunk-bss4k1z9.js:13779-13860 placement
var PLUGIN_OFF = [
  {
    text: "Disable on this machine with ",
  },
  {
    text: OFF_COMMAND,
    look: "code",
  },
  {
    text: ".",
  },
];
//@ chunk-bss4k1z9.js:13860-13933 placement
var WATCHING = [
  {
    text: "A side agent is watching your back while Claude works.",
  },
];
//@ chunk-bss4k1z9.js:13933-14042 placement
var WHEN = [
  {
    text: "When something comes up that you should know but might miss, this plugin flags it for you.",
  },
];
//@ chunk-bss4k1z9.js:14042-14060 placement
var APP_COPY = [WATCHING, WHEN, LEARN];
//@ chunk-bss4k1z9.js:14060-14081 placement
var TERMINAL_COPY = [WATCHING, WHEN, LEARN, PLUGIN_OFF];
//@ chunk-bss4k1z9.js:14081-14095 placement
var ABOUT_THIS = plainText(TERMINAL_COPY);
//@ chunk-bss4k1z9.js:14095-14347 placement
function offerHead(ui, { lead, body, surface, copy }) {
  let { Box, Text } = ui;
  let isDesktop = surface === "desktop";
  let hasCopy = copy.length > 0;
  return isDesktop
    ? h(
        Box,
        {
          flexDirection: "row",
          alignItems: "flex-start",
        },
        h(
          Box,
          {
            key: "about",
            flexShrink: 0,
          },
          lead,
          hasCopy ? aboutCard(ui, copy) : undefined,
        ),
        h(
          Text,
          {
            wrap: "wrap",
          },
          body,
        ),
      )
    : h(
        Text,
        {
          wrap: "wrap",
        },
        lead,
        body,
      );
}
//@ chunk-bss4k1z9.js:14347-14431 placement
var ABOUT_CLOSED = {
  isOpen: false,
  surface: "terminal",
  onPress: () => {
    return;
  },
  copy: TERMINAL_COPY,
  budget: "scrolls",
};
//@ chunk-bss4k1z9.js:14431-14440 placement
var CHOICE_GAP = 3;
//@ chunk-bss4k1z9.js:14440-14453 placement
var KEY_TEXT = "0: ";
//@ chunk-bss4k1z9.js:14453-14465 placement
var WIDE_FROM = 4352;
//@ chunk-bss4k1z9.js:14465-14535 placement
var cellsAtMost = (text) =>
  [...text].reduce((acc, char) => acc + ((char.codePointAt(0) ?? 0) >= WIDE_FROM ? 2 : 1), 0);
//@ chunk-bss4k1z9.js:14535-14544 placement
var WRAP_RESERVE_CELLS = 1;
//@ chunk-bss4k1z9.js:14544-14736 placement
function wrapRows(text, width) {
  let max = Math.max(width - WRAP_RESERVE_CELLS, 1);
  let rowCount = 0;
  let colCount = 0;
  for (let word of text.split(" ").filter((word) => word !== "")) {
    let wordWidth = cellsAtMost(word);
    if (rowCount === 0 || colCount + 1 + wordWidth > max) {
      rowCount += Math.ceil(Math.max(wordWidth, 1) / max);
      colCount = wordWidth % max === 0 ? max : wordWidth % max;
    } else colCount += 1 + wordWidth;
  }
  return rowCount;
}
//@ chunk-bss4k1z9.js:14736-14914 placement
function choicesRows({ columns, labels }) {
  let max = Math.max(columns, 1);
  let rows = 1;
  let usedCells = 0;
  for (let label of labels) {
    let keyedLabel = KEY_TEXT + label;
    let choiceCells = cellsAtMost(keyedLabel) + CHOICE_GAP;
    let wrapsNext = usedCells > 0 && usedCells + choiceCells > max;
    let needsWrap = choiceCells > max;
    let choiceRows = needsWrap ? wrapRows(keyedLabel, max - CHOICE_GAP) : 1;
    let nextCells = wrapsNext ? 0 : usedCells;
    rows += (wrapsNext ? 1 : 0) + choiceRows - 1;
    usedCells = needsWrap ? max : nextCells + choiceCells;
  }
  return rows;
}
//@ chunk-bss4k1z9.js:14914-14923 placement
var OFFER_MARGIN_ROWS = 1;
//@ chunk-bss4k1z9.js:14923-14932 placement
var STAR_CELLS = 2;
//@ chunk-bss4k1z9.js:14932-14957 placement
var taggedLeadText = (tag) => `${tag} \xB7 `;
//@ chunk-bss4k1z9.js:14957-15024 placement
var headedRows = (text, frame) =>
  OFFER_MARGIN_ROWS +
  wrapRows(text, frame.columns - STAR_CELLS) +
  choicesRows({
    ...frame,
    columns: frame.columns - 2,
  });
//@ chunk-bss4k1z9.js:15024-15059 placement
var closedOfferRows = (offer) => headedRows(taggedLeadText(offer.tag) + offer.line, offer);
//@ chunk-bss4k1z9.js:15059-15084 placement
var offerRows = (offer) => headedRows(offer.note, offer);
//@ chunk-bss4k1z9.js:15084-15250 placement
function fittedCopy(offer) {
  let fits = (count) =>
    offerRows({
      ...offer,
      columns: offer.bodyColumns,
      note: plainText(offer.copy.slice(0, count)),
    }) <= offer.maxRows;
  return offer.copy.slice(0, offer.copy.map((line, index) => offer.copy.length - index).find(fits) ?? 0);
}
//@ chunk-bss4k1z9.js:15250-15626 placement
function aboutFit(about, frame) {
  let closedChoice = aboutChoice(about);
  let openChoice = aboutChoice({
    ...about,
    isOpen: true,
  });
  let { budget } = about;
  let scrolls = budget === "scrolls";
  let copy = scrolls
    ? about.copy
    : fittedCopy({
        ...budget,
        ...frame,
        copy: about.copy,
        labels: [...frame.before, openChoice, ...frame.after].map((choice) => choice.label),
      });
  let closedAboutChoice = aboutChoice({
    ...about,
    isOpen: false,
  });
  let closedFits =
    scrolls ||
    closedOfferRows({
      columns: budget.bodyColumns,
      tag: frame.tag,
      line: frame.line,
      labels: [...frame.before, closedAboutChoice, ...frame.after].map((choice) => choice.label),
    }) <= budget.maxRows;
  let showChoices = copy.length > 0 && closedFits;
  return {
    note: about.isOpen && showChoices ? copy : [],
    choices: showChoices ? [closedChoice] : [],
  };
}
//@ chunk-bss4k1z9.js:15626-15747 placement
var aboutFrame = (isCompact, { maxRows, bodyColumns }, userType) => {
  let copy = isCompact ? APP_COPY : TERMINAL_COPY;
  return {
    copy: userType ? [] : copy,
    budget: isCompact
      ? "scrolls"
      : {
          maxRows,
          bodyColumns,
        },
  };
};
//@ chunk-bss4k1z9.js:15747-15801 placement
var aboutKeyOf = ({ line, shownAt }) => `${shownAt ?? "unstamped"} ${line}`;
//@ chunk-bss4k1z9.js:15801-15933 placement
async function aboutShown(ctx, id) {
  try {
    return (
      await ctx.state.get({
        plugin: "cc-plugin-you-should-know",
        key: "aboutOpen",
        id,
      })
    ).value;
  } catch {
    return;
  }
}
//@ chunk-bss4k1z9.js:15933-16141 placement
async function toggleAbout(ctx, { sid, key }) {
  let stateKey = {
    plugin: "cc-plugin-you-should-know",
    key: "aboutOpen",
    id: sid,
  };
  try {
    let current = await ctx.state.get(stateKey);
    let nextKey = current.value === key ? "" : key;
    await ctx.state.set(stateKey, nextKey, {
      ifVersion: current.version,
    });
  } catch {
    return;
  }
}
//@ chunk-bss4k1z9.js:16141-16544 placement
var ANSWERS = [
  "helpful",
  "yes_explain",
  "yes_page",
  "not_relevant",
  "not_understood",
  "hard_to_read",
  "know_it",
  "not_now",
  "ignored_submit",
  "ignored_timeout",
  "got_it",
  "chat",
  "respond",
  "simpler_words",
  "less_detail",
  "more_detail",
  "not_helpful",
  "dismiss",
  "explained_helpful",
  "explained_not_understood",
  "page_helpful",
  "page_not_helpful",
  "page_unread",
  "left_open",
  "turn_off",
  "off_failed",
  "off_confirmed",
  "off_abandoned",
];
//@ chunk-bss4k1z9.js:16544-16574 placement
var choiceOf = (value, of) => ({
  value,
  of,
});
//@ chunk-bss4k1z9.js:16574-16606 placement
var CLEARED_BY = ["prompt", "session_end"];
//@ chunk-bss4k1z9.js:16606-16667 placement
var EXPLAIN_DIRECTIONS = ["first", "simpler_words", "less_detail", "more_detail"];
//@ chunk-bss4k1z9.js:16667-16699 placement
var EXPLAINED_OUTCOMES = ["shown", "fork", "empty"];
//@ chunk-bss4k1z9.js:16699-16735 placement
var LEFT_BY = ["session_end", "pushed_out"];
//@ chunk-bss4k1z9.js:16735-16780 placement
var OPENERS = ["understand", "review", "learn", "see"];
//@ chunk-bss4k1z9.js:16780-16808 placement
var QUESTION_WORDS = ["why", "how", "what"];
//@ chunk-bss4k1z9.js:16808-17021 placement
function lineKind(line) {
  let parts = (line ?? "").toLowerCase().split(/[^a-z0-9']+/);
  let firstWord = parts[0] ?? "";
  let any = OPENERS.some((opener) => opener === firstWord);
  let last = parts.findLast((word) => QUESTION_WORDS.some((questionWord) => questionWord === word));
  return {
    verb: choiceOf(any ? firstWord : "other", [...OPENERS, "other"]),
    asks: choiceOf(last ?? "none", [...QUESTION_WORDS, "none"]),
  };
}
//@ chunk-bss4k1z9.js:17021-17093 placement
var markOf = (feature, kind, reason) =>
  kind === "ok"
    ? {
        feature,
        kind,
      }
    : {
        feature,
        kind,
        reason,
      };
//@ chunk-bss4k1z9.js:17093-17124 placement
var OFF_VIA = ["row", "offer", "typed"];
//@ chunk-bss4k1z9.js:17124-17220 placement
var PAGE_KINDS = {
  ready: "ok",
  reset: null,
  fork: "bad",
  empty: "bad",
  publish: "bad",
  blocked: "sad",
  timeout: "bad",
};
//@ chunk-bss4k1z9.js:17220-17284 placement
function pageMark(reason) {
  let kind = PAGE_KINDS[reason];
  return kind ? markOf("learn_page", kind, reason) : undefined;
}
//@ chunk-bss4k1z9.js:17284-17354 placement
var PAGE_OUTCOMES = ["ready", "reset", "fork", "empty", "publish", "blocked", "timeout"];
//@ chunk-bss4k1z9.js:17354-17391 placement
var PROMPT_ORIGINS = ["composer", "bridge", "other"];
//@ chunk-bss4k1z9.js:17391-17505 placement
var PROPOSED_KINDS = {
  shown: "ok",
  none: "ok",
  parse_failed: "sad",
  deduped: "ok",
  stale: "ok",
  aborted: null,
  api_error: "bad",
  error: "bad",
};
//@ chunk-bss4k1z9.js:17505-17630 placement
function proposedMark(result) {
  let kind = result.outcome === "none" && result.usage === null ? null : PROPOSED_KINDS[result.outcome];
  return kind ? markOf("you_should_know", kind, result.outcome) : undefined;
}
//@ chunk-bss4k1z9.js:17630-17717 placement
var PROPOSED_OUTCOMES = [
  "shown",
  "none",
  "parse_failed",
  "deduped",
  "stale",
  "aborted",
  "api_error",
  "error",
];
//@ chunk-bss4k1z9.js:17717-17784 placement
var TAG_OPENERS = {
  "You should know": "you_should_know",
  "Heads up": "heads_up",
};
//@ chunk-bss4k1z9.js:17784-17864 placement
var tagOpener = (tag) => ({
  opener: choiceOf(tag === undefined ? "none" : TAG_OPENERS[tag], [...Object.values(TAG_OPENERS), "none"]),
});
//@ chunk-bss4k1z9.js:17864-17961 placement
var UNANSWERED_OUTCOMES = {
  "nothing-to-fork": "none",
  "api-error": "api_error",
  "empty-reply": "none",
  aborted: "aborted",
};
export {
  ABOUT_CLOSED,
  ABOUT_THIS,
  ANSWERS,
  APP_COPY,
  CARD_WIDTH,
  CHOICE_GAP,
  CLEARED_BY,
  EXPLAINED_OUTCOMES,
  EXPLAIN_DIRECTIONS,
  KEY_TEXT,
  LEARN,
  LEFT_BY,
  OFFER_MARGIN_ROWS,
  OFF_COMMAND,
  OFF_VIA,
  OPENERS,
  PAGE_KINDS,
  PAGE_OUTCOMES,
  PLUGIN_OFF,
  PROMPT_ORIGINS,
  PROPOSED_KINDS,
  PROPOSED_OUTCOMES,
  QUESTION_WORDS,
  STAR_CELLS,
  TAG_OPENERS,
  TERMINAL_COPY,
  UNANSWERED_OUTCOMES,
  WATCHING,
  WHEN,
  WIDE_FROM,
  WRAP_RESERVE_CELLS,
  aboutCard,
  aboutChoice,
  aboutFit,
  aboutFrame,
  aboutKeyOf,
  aboutShown,
  cellsAtMost,
  choiceOf,
  choicesRows,
  closedOfferRows,
  fittedCopy,
  headedRows,
  lineKind,
  markOf,
  renderNoteRuns,
  offerHead,
  offerRows,
  pageMark,
  plainText,
  proposedMark,
  tagOpener,
  taggedLeadText,
  toggleAbout,
  wrapRows,
};
