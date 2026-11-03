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
function renderNoteRuns(e, t, o) {
  let { Text } = e;
  return t
    .flatMap((n, i) =>
      i === 0
        ? n
        : [
            {
              text: " ",
            },
            ...n,
          ],
    )
    .map(({ text, look }) =>
      h(
        Text,
        {
          ...(look === undefined ? o : PressEnterToContinue[look]),
        },
        text,
      ),
    );
}
//@ chunk-bss4k1z9.js:13231-13241 placement
var CARD_WIDTH = 60;
//@ chunk-bss4k1z9.js:13241-13477 placement
function aboutCard(e, copy) {
  let { Box, Text } = e;
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
      renderNoteRuns(e, copy, {}),
    ),
  );
}
//@ chunk-bss4k1z9.js:13477-13579 placement
var aboutChoice = (e) => ({
  hotkey: "3",
  label: e.isOpen ? "Return to topic" : "What is this",
  onPress: e.onPress,
  isDim: true,
});
//@ chunk-bss4k1z9.js:13579-13641 placement
var plainText = (e) => e.map((t) => t.map((o) => o.text).join("")).join(" ");
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
function offerHead(e, { lead, body, surface, copy }) {
  let { Box, Text } = e;
  let l = surface === "desktop";
  let u = copy.length > 0;
  return l
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
          u ? aboutCard(e, copy) : undefined,
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
var cellsAtMost = (e) => [...e].reduce((acc, o) => acc + ((o.codePointAt(0) ?? 0) >= WIDE_FROM ? 2 : 1), 0);
//@ chunk-bss4k1z9.js:14535-14544 placement
var WRAP_RESERVE_CELLS = 1;
//@ chunk-bss4k1z9.js:14544-14736 placement
function wrapRows(e, t) {
  let max = Math.max(t - WRAP_RESERVE_CELLS, 1);
  let r = 0;
  let n = 0;
  for (let i of e.split(" ").filter((a) => a !== "")) {
    let a = cellsAtMost(i);
    if (r === 0 || n + 1 + a > max) {
      r += Math.ceil(Math.max(a, 1) / max);
      n = a % max === 0 ? max : a % max;
    } else n += 1 + a;
  }
  return r;
}
//@ chunk-bss4k1z9.js:14736-14914 placement
function choicesRows({ columns, labels }) {
  let max = Math.max(columns, 1);
  let r = 1;
  let n = 0;
  for (let label of labels) {
    let a = KEY_TEXT + label;
    let l = cellsAtMost(a) + CHOICE_GAP;
    let u = n > 0 && n + l > max;
    let k = l > max;
    let s = k ? wrapRows(a, max - CHOICE_GAP) : 1;
    let f = u ? 0 : n;
    r += (u ? 1 : 0) + s - 1;
    n = k ? max : f + l;
  }
  return r;
}
//@ chunk-bss4k1z9.js:14914-14923 placement
var OFFER_MARGIN_ROWS = 1;
//@ chunk-bss4k1z9.js:14923-14932 placement
var STAR_CELLS = 2;
//@ chunk-bss4k1z9.js:14932-14957 placement
var taggedLeadText = (tag) => `${tag} \xB7 `;
//@ chunk-bss4k1z9.js:14957-15024 placement
var headedRows = (e, t) =>
  OFFER_MARGIN_ROWS +
  wrapRows(e, t.columns - STAR_CELLS) +
  choicesRows({
    ...t,
    columns: t.columns - 2,
  });
//@ chunk-bss4k1z9.js:15024-15059 placement
var closedOfferRows = (e) => headedRows(taggedLeadText(e.tag) + e.line, e);
//@ chunk-bss4k1z9.js:15059-15084 placement
var offerRows = (e) => headedRows(e.note, e);
//@ chunk-bss4k1z9.js:15084-15250 placement
function fittedCopy(e) {
  let t = (o) =>
    offerRows({
      ...e,
      columns: e.bodyColumns,
      note: plainText(e.copy.slice(0, o)),
    }) <= e.maxRows;
  return e.copy.slice(0, e.copy.map((o, r) => e.copy.length - r).find(t) ?? 0);
}
//@ chunk-bss4k1z9.js:15250-15626 placement
function aboutFit(e, t) {
  let o = aboutChoice(e);
  let r = aboutChoice({
    ...e,
    isOpen: true,
  });
  let { budget } = e;
  let i = budget === "scrolls";
  let a = i
    ? e.copy
    : fittedCopy({
        ...budget,
        ...t,
        copy: e.copy,
        labels: [...t.before, r, ...t.after].map((s) => s.label),
      });
  let l = aboutChoice({
    ...e,
    isOpen: false,
  });
  let u =
    i ||
    closedOfferRows({
      columns: budget.bodyColumns,
      tag: t.tag,
      line: t.line,
      labels: [...t.before, l, ...t.after].map((s) => s.label),
    }) <= budget.maxRows;
  let k = a.length > 0 && u;
  return {
    note: e.isOpen && k ? a : [],
    choices: k ? [o] : [],
  };
}
//@ chunk-bss4k1z9.js:15626-15747 placement
var aboutFrame = (e, { maxRows, bodyColumns }, userType) => {
  let n = e ? APP_COPY : TERMINAL_COPY;
  return {
    copy: userType ? [] : n,
    budget: e
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
async function aboutShown(e, id) {
  try {
    return (
      await e.state.get({
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
async function toggleAbout(e, { sid, key }) {
  let r = {
    plugin: "cc-plugin-you-should-know",
    key: "aboutOpen",
    id: sid,
  };
  try {
    let n = await e.state.get(r);
    let i = n.value === key ? "" : key;
    await e.state.set(r, i, {
      ifVersion: n.version,
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
  let o = parts[0] ?? "";
  let any = OPENERS.some((i) => i === o);
  let last = parts.findLast((i) => QUESTION_WORDS.some((a) => a === i));
  return {
    verb: choiceOf(any ? o : "other", [...OPENERS, "other"]),
    asks: choiceOf(last ?? "none", [...QUESTION_WORDS, "none"]),
  };
}
//@ chunk-bss4k1z9.js:17021-17093 placement
var markOf = (feature, t, reason) =>
  t === "ok"
    ? {
        feature,
        kind: t,
      }
    : {
        feature,
        kind: t,
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
  let t = PAGE_KINDS[reason];
  return t ? markOf("learn_page", t, reason) : undefined;
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
function proposedMark(e) {
  let o = e.outcome === "none" && e.usage === null ? null : PROPOSED_KINDS[e.outcome];
  return o ? markOf("you_should_know", o, e.outcome) : undefined;
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
