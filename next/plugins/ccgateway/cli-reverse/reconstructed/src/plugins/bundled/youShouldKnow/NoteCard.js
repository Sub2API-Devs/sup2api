/**
 * plugins/bundled/youShouldKnow/NoteCard.tsx
 *
 * 2.1.316 新增。内置插件 youShouldKnow 的提示卡片。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-775n2x67.js (55)
 * attribution: placement 55
 */
import { PressEnterToContinue } from "../../../components/PressEnterToContinue.js";
import { CC_PLUGIN_YOU_SHOULD_KNOW } from "../../../services/tips/youShouldKnowTip.js";

//@ chunk-775n2x67.js:13400-13539 placement
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
//@ chunk-775n2x67.js:13539-13549 placement
var CARD_WIDTH = 60;
//@ chunk-775n2x67.js:13549-13785 placement
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
//@ chunk-775n2x67.js:13785-13887 placement
var aboutChoice = (state) => ({
  hotkey: "3",
  label: state.isOpen ? "Return to topic" : "What is this",
  onPress: state.onPress,
  isDim: true,
});
//@ chunk-775n2x67.js:13887-13949 placement
var plainText = (runs) => runs.map((run) => run.map((part) => part.text).join("")).join(" ");
//@ chunk-775n2x67.js:13949-14047 placement
var LEARN = [
  {
    text: "Learn more",
    look: "bold",
  },
  {
    text: " to get a deeper explanation and chat about it.",
  },
];
//@ chunk-775n2x67.js:14047-14087 placement
var OFF_COMMAND = `/plugin disable ${CC_PLUGIN_YOU_SHOULD_KNOW}@builtin`;
//@ chunk-775n2x67.js:14087-14168 placement
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
//@ chunk-775n2x67.js:14168-14241 placement
var WATCHING = [
  {
    text: "A side agent is watching your back while Claude works.",
  },
];
//@ chunk-775n2x67.js:14241-14350 placement
var WHEN = [
  {
    text: "When something comes up that you should know but might miss, this plugin flags it for you.",
  },
];
//@ chunk-775n2x67.js:14350-14368 placement
var APP_COPY = [WATCHING, WHEN, LEARN];
//@ chunk-775n2x67.js:14368-14389 placement
var TERMINAL_COPY = [WATCHING, WHEN, LEARN, PLUGIN_OFF];
//@ chunk-775n2x67.js:14389-14403 placement
var ABOUT_THIS = plainText(TERMINAL_COPY);
//@ chunk-775n2x67.js:14403-14655 placement
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
//@ chunk-775n2x67.js:14655-14739 placement
var ABOUT_CLOSED = {
  isOpen: false,
  surface: "terminal",
  onPress: () => {
    return;
  },
  copy: TERMINAL_COPY,
  budget: "scrolls",
};
//@ chunk-775n2x67.js:14739-14748 placement
var CHOICE_GAP = 3;
//@ chunk-775n2x67.js:14748-14761 placement
var KEY_TEXT = "0: ";
//@ chunk-775n2x67.js:14761-14773 placement
var WIDE_FROM = 4352;
//@ chunk-775n2x67.js:14773-14843 placement
var cellsAtMost = (text) =>
  [...text].reduce((acc, char) => acc + ((char.codePointAt(0) ?? 0) >= WIDE_FROM ? 2 : 1), 0);
//@ chunk-775n2x67.js:14843-14852 placement
var WRAP_RESERVE_CELLS = 1;
//@ chunk-775n2x67.js:14852-15044 placement
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
//@ chunk-775n2x67.js:15044-15222 placement
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
//@ chunk-775n2x67.js:15222-15231 placement
var OFFER_MARGIN_ROWS = 1;
//@ chunk-775n2x67.js:15231-15240 placement
var STAR_CELLS = 2;
//@ chunk-775n2x67.js:15240-15265 placement
var taggedLeadText = (tag) => `${tag} \xB7 `;
//@ chunk-775n2x67.js:15265-15332 placement
var headedRows = (text, frame) =>
  OFFER_MARGIN_ROWS +
  wrapRows(text, frame.columns - STAR_CELLS) +
  choicesRows({
    ...frame,
    columns: frame.columns - 2,
  });
//@ chunk-775n2x67.js:15332-15367 placement
var closedOfferRows = (offer) => headedRows(taggedLeadText(offer.tag) + offer.line, offer);
//@ chunk-775n2x67.js:15367-15392 placement
var offerRows = (offer) => headedRows(offer.note, offer);
//@ chunk-775n2x67.js:15392-15558 placement
function fittedCopy(offer) {
  let fits = (count) =>
    offerRows({
      ...offer,
      columns: offer.bodyColumns,
      note: plainText(offer.copy.slice(0, count)),
    }) <= offer.maxRows;
  return offer.copy.slice(0, offer.copy.map((line, index) => offer.copy.length - index).find(fits) ?? 0);
}
//@ chunk-775n2x67.js:15558-15934 placement
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
//@ chunk-775n2x67.js:15934-16055 placement
var aboutFrame = (isCompact, { maxRows, bodyColumns }, hideCopy) => {
  let copy = isCompact ? APP_COPY : TERMINAL_COPY;
  return {
    copy: hideCopy ? [] : copy,
    budget: isCompact
      ? "scrolls"
      : {
          maxRows,
          bodyColumns,
        },
  };
};
//@ chunk-775n2x67.js:16055-16109 placement
var aboutKeyOf = ({ line, shownAt }) => `${shownAt ?? "unstamped"} ${line}`;
//@ chunk-775n2x67.js:16109-16241 placement
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
//@ chunk-775n2x67.js:16241-16449 placement
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
//@ chunk-775n2x67.js:16449-16852 placement
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
//@ chunk-775n2x67.js:16852-16882 placement
var choiceOf = (value, of) => ({
  value,
  of,
});
//@ chunk-775n2x67.js:16882-16914 placement
var CLEARED_BY = ["prompt", "session_end"];
//@ chunk-775n2x67.js:16914-16975 placement
var EXPLAIN_DIRECTIONS = ["first", "simpler_words", "less_detail", "more_detail"];
//@ chunk-775n2x67.js:16975-17007 placement
var EXPLAINED_OUTCOMES = ["shown", "fork", "empty"];
//@ chunk-775n2x67.js:17007-17043 placement
var LEFT_BY = ["session_end", "pushed_out"];
//@ chunk-775n2x67.js:17043-17088 placement
var OPENERS = ["understand", "review", "learn", "see"];
//@ chunk-775n2x67.js:17088-17116 placement
var QUESTION_WORDS = ["why", "how", "what"];
//@ chunk-775n2x67.js:17116-17329 placement
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
//@ chunk-775n2x67.js:17329-17401 placement
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
//@ chunk-775n2x67.js:17401-17432 placement
var OFF_VIA = ["row", "offer", "typed"];
//@ chunk-775n2x67.js:17432-17528 placement
var PAGE_KINDS = {
  ready: "ok",
  reset: null,
  fork: "bad",
  empty: "bad",
  publish: "bad",
  blocked: "sad",
  timeout: "bad",
};
//@ chunk-775n2x67.js:17528-17592 placement
function pageMark(reason) {
  let kind = PAGE_KINDS[reason];
  return kind ? markOf("learn_page", kind, reason) : undefined;
}
//@ chunk-775n2x67.js:17592-17662 placement
var PAGE_OUTCOMES = ["ready", "reset", "fork", "empty", "publish", "blocked", "timeout"];
//@ chunk-775n2x67.js:17662-17699 placement
var PROMPT_ORIGINS = ["composer", "bridge", "other"];
//@ chunk-775n2x67.js:17699-17813 placement
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
//@ chunk-775n2x67.js:17813-17938 placement
function proposedMark(result) {
  let kind = result.outcome === "none" && result.usage === null ? null : PROPOSED_KINDS[result.outcome];
  return kind ? markOf("you_should_know", kind, result.outcome) : undefined;
}
//@ chunk-775n2x67.js:17938-18025 placement
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
//@ chunk-775n2x67.js:18025-18092 placement
var TAG_OPENERS = {
  "You should know": "you_should_know",
  "Heads up": "heads_up",
};
//@ chunk-775n2x67.js:18092-18172 placement
var tagOpener = (tag) => ({
  opener: choiceOf(tag === undefined ? "none" : TAG_OPENERS[tag], [...Object.values(TAG_OPENERS), "none"]),
});
//@ chunk-775n2x67.js:18172-18269 placement
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
