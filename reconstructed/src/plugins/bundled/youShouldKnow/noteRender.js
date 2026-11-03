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
var isDebugOn = (e) => e !== void 0 && DEBUG_ON_WORDS.includes(e.trim().toLowerCase());
//@ chunk-bss4k1z9.js:20512-20549 placement
var debugFlagOf = (e) => e.then(isDebugOn).catch(() => !1);
//@ chunk-bss4k1z9.js:20549-20605 placement
async function thenAlways(e, t) {
  try {
    await e();
  } finally {
    await t();
  }
}
//@ chunk-bss4k1z9.js:20605-20658 placement
var emptyCard = () => ({ title: "", lead: "", sketch: [], caption: "" });
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
var cleanOneLine = (e) =>
  e
    .replace(/[\x00-\x08\x0E-\x1F\x7F-\x9F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
//@ chunk-bss4k1z9.js:21041-21140 placement
function sliceCodePointsHead(e, t) {
  if (t <= 0) return "";
  return e.length <= t ? e : e.slice(0, t).replace(/[\uD800-\uDBFF]$/, "");
}
//@ chunk-bss4k1z9.js:21140-21237 placement
var stripControlSequences = (e) =>
  e
    .replace(/\p{Cs}/gu, "")
    .replace(ansiSequence(), "")
    .replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, "");
//@ chunk-bss4k1z9.js:21237-21394 placement
function truncateAtWordBoundary(e, t) {
  if (e.length <= t) return e;
  let o = sliceCodePointsHead(e, t - 1),
    search = o.search(/\s\S*$/),
    i = search !== -1 ? o.slice(0, search).trimEnd() : "";
  return `${i.length > t / 2 ? i : o.trimEnd()}\u2026`;
}
//@ chunk-bss4k1z9.js:21394-21465 placement
var proseOf = (e) =>
  e
    .split(
      `
`,
    )
    .map((t) => cleanOneLine(t))
    .filter((t) => t !== "").join(`
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
var isDeclined = (e) => e === "" || /^none\s*(?:[.!?()[\]:;,-]|$)/i.test(e);
//@ chunk-bss4k1z9.js:21661-21694 placement
var withoutTrailingPeriod = (e) => e.replace(/\.+$/, "");
//@ chunk-bss4k1z9.js:21694-21773 placement
var WRAPPING_QUOTES = [
  ['"', '"'],
  ["'", "'"],
  ["\u201C", "\u201D"],
  ["\u2018", "\u2019"],
  ["`", "`"],
];
//@ chunk-bss4k1z9.js:21773-21930 placement
function unquoted(e) {
  let t = withoutTrailingPeriod(e.trim());
  return t.length >= 2 &&
    WRAPPING_QUOTES.some(([r, n]) => t.startsWith(r) && t.endsWith(n) && !t.slice(1, -1).includes(n))
    ? withoutTrailingPeriod(t.slice(1, -1).trim())
    : t;
}
//@ chunk-bss4k1z9.js:21930-21964 placement
var CLOSERS = WRAPPING_QUOTES.map(([, e]) => e).join("");
//@ chunk-bss4k1z9.js:21964-22010 placement
var ENDS_A_SENTENCE = new RegExp(`[.!?\u2026][${CLOSERS})\\]]*$`);
//@ chunk-bss4k1z9.js:22010-22044 placement
var ENDS_WITH_QUESTION = new RegExp(`\\?[${CLOSERS}]?$`);
//@ chunk-bss4k1z9.js:22044-22067 placement
var EXPLAIN_LABEL = /^explain:\s*/i;
//@ chunk-bss4k1z9.js:22067-22156 placement
var INLINE_TAG = /[.\s\u2014\u2013-]*\s\**tag\**\s*:\s*\**\s*(heads[\s-]*up|you should know)\W*$/i;
//@ chunk-bss4k1z9.js:22156-22191 placement
var openingOf = (e) => unquoted(unquoted(e).replace(INLINE_TAG, ""));
//@ chunk-bss4k1z9.js:22191-22202 placement
var MAX_LINE_WIDTH = 240;
//@ chunk-bss4k1z9.js:22202-22727 placement
function parseExplanation(e) {
  let t = [],
    o = emptyCard(),
    r = !1,
    n = !1;
  function i() {
    if (
      ((o.lead = truncateAtWordBoundary(proseOf(o.lead), MAX_CAPTION_LENGTH)),
      (o.caption = truncateAtWordBoundary(proseOf(o.caption), MAX_CAPTION_LENGTH)),
      o.title || o.lead || o.sketch.length > 0 || o.caption)
    )
      t.push(o);
    o = emptyCard();
  }
  for (let a of e.split(`
`)) {
    let replaced = stripControlSequences(a).replace(/\s+$/, "");
    if (FENCE_LINE.test(replaced.trim())) {
      if (!r && n) i();
      ((r = !r), (n = !0));
      continue;
    }
    if (r) {
      if (o.sketch.length < MAX_SKETCH_LINES)
        o.sketch = [...o.sketch, sliceCodePointsHead(replaced, MAX_SKETCH_WIDTH)];
      continue;
    }
    let match = TITLE_LINE.exec(replaced.trim());
    if (match) {
      (i(),
        (n = !1),
        (o.title = sliceCodePointsHead(cleanOneLine(match[1] ?? match[2] ?? ""), MAX_TITLE_WIDTH)));
      continue;
    }
    let s = o.sketch.length === 0 && !n ? "lead" : "caption";
    o[s] += `
${replaced}`;
  }
  return (i(), t.slice(0, MAX_CARDS));
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
var tagOf = (e) => (HEADS_UP.test(e) ? "Heads up" : DEFAULT_TAG);
//@ chunk-bss4k1z9.js:22994-23811 placement
function parseProposedLine(e) {
  let parts = e.split(`
`),
    mapped = parts.map((g) => stripControlSequences(g).trimStart()),
    index = mapped.findIndex((g) => LEARN_LABEL.test(g.replace(/^[-*\u2022]\s+/, ""))),
    index_2 = mapped.slice(index + 1).findIndex((g) => EXPLAIN_LABEL.test(g)),
    i = index !== -1 && index_2 !== -1,
    a = i ? index + 1 + index_2 : -1,
    trimmed = [(mapped[a] ?? "").replace(EXPLAIN_LABEL, ""), ...parts.slice(a + 1)]
      .join(
        `
`,
      )
      .trim(),
    u = i ? trimmed || void 0 : void 0,
    mapped_2 = (i ? parts.slice(0, a) : parts).map((g) =>
      cleanOneLine(stripControlSequences(g)).replace(/^[-*\u2022]\s+/, ""),
    ),
    s = mapped_2.find((g) => TAG_LABEL.test(g)) ?? "",
    f = tagOf(s.replace(TAG_LABEL, ""));
  for (let [g, O] of mapped_2.entries()) {
    if (!LEARN_LABEL.test(O)) continue;
    let trimmed = O.replace(LEARN_LABEL, "").trim();
    if (isDeclined(openingOf(trimmed))) return { kind: "none" };
    for (let A of mapped_2.slice(g + 1)) {
      if (A === "" || LEARN_LABEL.test(A) || TAG_LABEL.test(A) || ENDS_WITH_QUESTION.test(trimmed)) break;
      trimmed += ` ${A}`;
    }
    let d = unquoted(trimmed),
      match = INLINE_TAG.exec(d),
      p = match === null ? d : unquoted(d.slice(0, match.index)),
      N = ENDS_A_SENTENCE.test(p) ? p : `${p}.`,
      oe = s === "" && match !== null ? tagOf(match?.[1] ?? "") : f;
    if (N.length <= MAX_LINE_WIDTH) return { kind: "line", line: N, tag: oe, explanation: u };
  }
  return { kind: "unparsable" };
}
//@ chunk-bss4k1z9.js:23811-23821 placement
var SEEN_MAX = 50;
//@ chunk-bss4k1z9.js:23821-23873 placement
var drawsBand = (e, t) => e.some((o) => o === "terminal" || t.has(o));
//@ chunk-bss4k1z9.js:23873-23925 placement
var OWN_COMPOSER = { terminal: !1, desktop: !0, mobile: !0, vscode: !0 };
//@ chunk-bss4k1z9.js:23925-23965 placement
var hasOwnComposer = (e) => !Object.hasOwn(OWN_COMPOSER, e) || OWN_COMPOSER[e];
//@ chunk-bss4k1z9.js:23965-24017 placement
var isOpenView = (e) => e?.kind === "offer" || e?.kind === "explained";
//@ chunk-bss4k1z9.js:24017-24076 placement
var isSameShowing = (e, t) => isOpenView(e) && e.kind === t.kind && e.shownAt === t.shownAt;
//@ chunk-bss4k1z9.js:24076-24152 placement
function storedCount(e) {
  return typeof e === "number" && Number.isSafeInteger(e) && e >= 0 ? e : 0;
}
//@ chunk-bss4k1z9.js:24152-24218 placement
var stringLines = (e) => (Array.isArray(e) ? e.filter((t) => typeof t === "string") : []);
//@ chunk-bss4k1z9.js:24218-24368 placement
function iterationOf(e) {
  switch (e.kind) {
    case "explained":
      return storedCount(e.iteration);
    case "asked":
      return e.iteration === void 0 ? void 0 : storedCount(e.iteration);
    case "offer":
      return;
  }
}
//@ chunk-bss4k1z9.js:24368-24473 placement
function keptPastPrompt(e, t) {
  return e.kind === "offer" ? { ...e, promptsSurvived: t, isOffArmed: !1 } : { ...e, promptsSurvived: t };
}
//@ chunk-bss4k1z9.js:24473-24526 placement
var ACCENT_LEAD_INK = { star: { color: "suggestion" }, tag: { dimColor: !0 } };
//@ chunk-bss4k1z9.js:24526-24578 placement
var MUTED_LEAD_INK = { star: { color: "subtle" }, tag: { color: "subtle" } };
//@ chunk-bss4k1z9.js:24578-24630 placement
var LEAD_INK = {
  terminal: ACCENT_LEAD_INK,
  desktop: MUTED_LEAD_INK,
  mobile: ACCENT_LEAD_INK,
  vscode: ACCENT_LEAD_INK,
};
//@ chunk-bss4k1z9.js:24630-24656 placement
var leadInkOf = (e) => e.leadInk ?? ACCENT_LEAD_INK;
//@ chunk-bss4k1z9.js:24656-24707 placement
function leadInkOn(e) {
  return Object.hasOwn(LEAD_INK, e) ? LEAD_INK[e] : ACCENT_LEAD_INK;
}
//@ chunk-bss4k1z9.js:24707-24720 placement
var ASKED_MS = 20000;
//@ chunk-bss4k1z9.js:24720-24885 placement
function choice(e, { hotkey: hotkey, label: label, onPress: onPress, isDim: isDim, role: role }) {
  let { Box: Box, Button: Button } = e;
  return h(
    Box,
    { marginRight: CHOICE_GAP },
    h(Button, { hotkey: hotkey, plain: !0, dimColor: isDim, role: role, onPress: onPress }, label),
  );
}
//@ chunk-bss4k1z9.js:24885-25012 placement
function lead(e, t) {
  let { Text: Text } = e,
    r = leadInkOf(e);
  return h(
    Text,
    null,
    h(Text, { ...r.star }, "\u2726"),
    t === void 0 ? " " : h(Text, { ...r.tag }, " ", t, " \xB7 "),
  );
}
//@ chunk-bss4k1z9.js:25012-25172 placement
function starColumn(e, t) {
  let { Box: Box, Text: Text } = e,
    n = leadInkOf(e);
  return h(
    Box,
    { flexDirection: "row", alignItems: "flex-start" },
    h(Box, { flexShrink: 0, width: STAR_CELLS }, h(Text, { ...n.star }, "\u2726")),
    t,
  );
}
//@ chunk-bss4k1z9.js:25172-25336 placement
function starred(e, t, o) {
  let { Text: Text } = e,
    n = leadInkOf(e);
  return (e.hasStarColumn ?? !0)
    ? starColumn(e, h(Text, { wrap: "wrap" }, t === void 0 ? "" : h(Text, { ...n.tag }, t, " \xB7 "), o))
    : h(Text, { wrap: "wrap" }, lead(e, t), o);
}
//@ chunk-bss4k1z9.js:25336-25757 placement
function dismissedLine(e, t, o) {
  let { Box: Box, Text: Text } = e,
    i = e.hasStarColumn ?? !0,
    mapped = [...t, { hotkey: "0", label: "Dismiss", onPress: o, role: "dismiss" }].map((u) => choice(e, u));
  return i
    ? h(
        Box,
        { flexDirection: "column", marginTop: 1 },
        starColumn(
          e,
          h(
            Box,
            { flexWrap: "wrap" },
            h(
              Box,
              { marginRight: CHOICE_GAP },
              h(Text, { dimColor: !0, wrap: "truncate-end" }, "Dismissed."),
            ),
            mapped,
          ),
        ),
      )
    : h(
        Box,
        { marginTop: 1, flexWrap: "wrap" },
        h(
          Box,
          { marginRight: CHOICE_GAP },
          h(Text, { wrap: "truncate-end" }, lead(e), h(Text, { dimColor: !0 }, "Dismissed.")),
        ),
        mapped,
      );
}
//@ chunk-bss4k1z9.js:25757-26068 placement
function askedRow(e, t) {
  let off = t.off,
    n = off !== void 0 ? [{ hotkey: "4", label: "Turn off suggestions", onPress: off }] : [];
  return dismissedLine(
    e,
    [
      { hotkey: "1", label: "That was helpful", onPress: t.helpful },
      { hotkey: "2", label: "Not relevant", onPress: t.notRelevant },
      { hotkey: "3", label: "Couldn\u2019t understand", onPress: t.notUnderstood },
      ...n,
    ],
    t.dismiss,
  );
}
//@ chunk-bss4k1z9.js:26068-26224 placement
var explainedAskedRow = (e, t) =>
  dismissedLine(
    e,
    [
      { hotkey: "1", label: "That was helpful", onPress: t.helpful },
      { hotkey: "2", label: "Didn\u2019t understand", onPress: t.notUnderstood },
    ],
    t.dismiss,
  );
//@ chunk-bss4k1z9.js:26224-26317 placement
function choicesRow(e, t) {
  let { Box: Box } = e;
  return h(
    Box,
    { marginLeft: 2, flexWrap: "wrap" },
    t.map((r) => choice(e, r)),
  );
}
//@ chunk-bss4k1z9.js:26317-26542 placement
function debugRows(e, t, o) {
  let { Box: Box, Text: Text } = e;
  return h(
    Box,
    { flexDirection: "column" },
    h(
      Box,
      { flexDirection: "column", marginTop: 1 },
      t.map((i) =>
        h(
          Box,
          null,
          h(Text, { ...leadInkOf(e).star }, "\u2726"),
          h(Text, { wrap: "truncate-end", dimColor: !0 }, " ", checkLineOf(i)),
        ),
      ),
    ),
    o ?? "",
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
var literal = (e) =>
  e
    .trimStart()
    .replace(MARKUP, (t, o, r) => {
      let n = r !== void 0,
        i = o !== void 0,
        a = `**${(o ?? "").replace(STRUCTURAL, "\\$&")}**`;
      return n ? t : i ? a : `\\${t}`;
    })
    .replace(LEADING_NUMBER, "$1\\$2");
//@ chunk-bss4k1z9.js:26919-27319 placement
function lineShape(e, t) {
  let trimStart = e.trimStart(),
    match = LIST_MARKER.exec(trimStart),
    n = literal(trimStart.slice(match?.[0].length ?? 0)),
    i = match?.[1],
    a = Number(i),
    l = `${(t ?? a - 1) + 1}.` === `${i}${match?.[2]}`;
  if (match === null) return { kind: "plain", text: n, canOpenInPlace: !1 };
  if (i === void 0) return { kind: "bullet", text: `- ${n}`, canOpenInPlace: !0 };
  return l
    ? { kind: "ordered", text: `${a}. ${n}`, canOpenInPlace: a === 1, ordinal: a }
    : { kind: "plain", text: `${i}\\${match[2]} ${n}`, canOpenInPlace: !1 };
}
//@ chunk-bss4k1z9.js:27319-27517 placement
function drawnLine(e, t) {
  let o = lineShape(e, t?.ordinal),
    r = o.kind === "plain",
    n = r && t?.kind === "plain",
    i = (!r && o.kind === t?.kind) || o.canOpenInPlace,
    a = n
      ? HARD_BREAK
      : i
        ? `
`
        : `

`;
  if (t === void 0) return o;
  return { ...o, text: `${a}${o.text}` };
}
//@ chunk-bss4k1z9.js:27517-27760 placement
function proseMarkdown(e, t) {
  let o = t === "" ? "" : `**${t.replace(STRUCTURAL, "\\$&")}**`,
    n = o !== "" ? [{ kind: "plain", text: o, canOpenInPlace: !1 }] : [],
    joined = e
      .split(
        `
`,
      )
      .filter((a) => a !== "")
      .reduce((a, l) => [...a, drawnLine(l, a.at(-1))], n)
      .map((a) => a.text)
      .join("");
  return joined === ""
    ? ""
    : `${joined}

`;
}
//@ chunk-bss4k1z9.js:27760-27838 placement
function prose(e, t, o) {
  let { Markdown: Markdown } = e,
    n = proseMarkdown(t, o);
  return n === "" ? "" : h(Markdown, { text: n });
}
//@ chunk-bss4k1z9.js:27838-28423 placement
function explainedRow(e, ...[t, o, r, n = DEFAULT_TAG]) {
  let { Box: Box, Code: Code } = e;
  return h(
    Box,
    { flexDirection: "column", marginTop: 1 },
    h(Box, { flexDirection: "column", marginBottom: 1 }, starred(e, n, t)),
    o.map((l) => {
      let u = l.sketch.length > 0;
      return h(
        Box,
        { flexDirection: "column", marginBottom: 1, marginLeft: 2 },
        prose(e, l.lead, l.title),
        u
          ? h(Code, {
              source: l.sketch.map((k) => (k === "" ? " " : k)).join(`
`),
              language: "text",
              wrap: "truncate-end",
            })
          : "",
        prose(e, l.caption, ""),
      );
    }),
    r === null
      ? ""
      : choicesRow(e, [
          { hotkey: "1", label: "Understood", onPress: r.gotIt },
          { hotkey: "2", label: "Chat in main session", onPress: r.respond },
          { hotkey: "0", label: "Dismiss", onPress: r.dismiss, role: "dismiss" },
        ]),
  );
}
//@ chunk-bss4k1z9.js:28423-28561 placement
function stillRow(e, t) {
  let { Box: Box, Text: Text } = e;
  return h(
    Box,
    { marginTop: 1 },
    h(Text, { ...leadInkOf(e).star }, "\u2726"),
    h(Text, { wrap: "truncate-end", dimColor: !0 }, " ", t),
  );
}
//@ chunk-bss4k1z9.js:28561-28598 placement
var explainingRow = (e) => stillRow(e, "One moment\u2026");
//@ chunk-bss4k1z9.js:28598-29053 placement
function failedRow(e, t, o) {
  let { Box: Box, Text: Text } = e,
    i = t === "publish",
    a = t === "blocked",
    l = t === "explain",
    u = t === "turn_off";
  return h(
    Box,
    { marginTop: 1 },
    h(
      Text,
      { wrap: "truncate-end" },
      lead(e),
      i
        ? "Couldn\u2019t publish that page"
        : a
          ? "Not published (blocked by a permission setting)"
          : l
            ? "Couldn\u2019t write that explanation"
            : u
              ? "Couldn\u2019t turn suggestions off here. Use /plugin."
              : "Couldn\u2019t write that page",
      " ",
      h(Text, { dimColor: !0 }, "\xB7"),
      " ",
    ),
    choice(e, { hotkey: "0", label: "OK", onPress: o }),
  );
}
//@ chunk-bss4k1z9.js:29053-29062 placement
var CARD_INSET = 2;
//@ chunk-bss4k1z9.js:29062-29072 placement
var FALLBACK_COLUMNS = 80;
//@ chunk-bss4k1z9.js:29072-29235 placement
var NARROW_BOUNDS = {
  hangulJamo: 4352,
  punctuation: { first: 8208, last: 8286 },
  arrows: { first: 8592, last: 8703 },
  shapes: { first: 9472, last: 9727 },
  mediumSmallSquares: { white: 9725, black: 9726 },
};
//@ chunk-bss4k1z9.js:29235-29434 placement
function glyphCellsAtMost(e) {
  let {
    hangulJamo: hangulJamo,
    punctuation: punctuation,
    arrows: arrows,
    shapes: shapes,
    mediumSmallSquares: mediumSmallSquares,
  } = NARROW_BOUNDS;
  return e < hangulJamo ||
    (e >= punctuation.first && e <= punctuation.last) ||
    (e >= arrows.first && e <= arrows.last) ||
    (e >= shapes.first &&
      e <= shapes.last &&
      e !== mediumSmallSquares.white &&
      e !== mediumSmallSquares.black)
    ? 1
    : 2;
}
//@ chunk-bss4k1z9.js:29434-29508 placement
function lineCellsAtMost(e) {
  let t = 0;
  for (let o of e) t += glyphCellsAtMost(o.codePointAt(0) ?? 0);
  return t;
}
//@ chunk-bss4k1z9.js:29508-29626 placement
function fitLine(e, t) {
  if (lineCellsAtMost(e) <= t) return e;
  let o = 0,
    r = "";
  for (let n of e) {
    if (((o += lineCellsAtMost(n)), o > t - 1)) return `${r}\u2026`;
    r += n;
  }
  return r;
}
//@ chunk-bss4k1z9.js:29626-29785 placement
function fitCards(e, t) {
  let o = Number.isFinite(t) ? t : FALLBACK_COLUMNS;
  return e.map((r) => ({
    ...r,
    title: fitLine(r.title, Math.max(o - CARD_INSET, 1)),
    sketch: r.sketch.map((n) => fitLine(n, Math.max(o - CARD_INSET, 1))),
  }));
}
//@ chunk-bss4k1z9.js:29785-29872 placement
var makingRow = (e) => stillRow(e, "Making your page (a minute or two) \xB7 Claude keeps working\u2026");
//@ chunk-bss4k1z9.js:29872-29977 placement
var wayOutChoices = (e, t) =>
  e === void 0
    ? []
    : [{ hotkey: "4", label: t ? "Press again to disable" : "Disable", onPress: e, isDim: !0 }];
//@ chunk-bss4k1z9.js:29977-30498 placement
function offerRow(e, ...[t, o, r, n = ABOUT_CLOSED, i = DEFAULT_TAG]) {
  let { Box: Box } = e,
    l = [
      { hotkey: "1", label: "Learn more", onPress: o.explain },
      { hotkey: "2", label: "Knew this already", onPress: o.knew },
    ],
    u = [...wayOutChoices(o.off, r), { hotkey: "0", label: "Dismiss", onPress: o.later, role: "dismiss" }],
    k = aboutFit(n, { tag: i, line: t, before: l, after: u }),
    f =
      k.note.length > 0
        ? { tag: void 0, body: renderNoteRuns(e, k.note, { dimColor: !0 }) }
        : { tag: i, body: t },
    g = n.surface === "terminal";
  return h(
    Box,
    { flexDirection: "column", marginTop: 1 },
    g ? starred(e, f.tag, f.body) : offerHead(e, { lead: lead(e, f.tag), body: f.body, ...n }),
    choicesRow(e, [...l, ...k.choices, ...u]),
  );
}
//@ chunk-bss4k1z9.js:30498-30857 placement
function readyRow(e, t, o) {
  let { Box: Box, Text: Text } = e;
  return h(
    Box,
    { flexDirection: "column", marginTop: 1 },
    h(Text, { wrap: "truncate-end" }, lead(e), "Learning page ready"),
    h(Box, { marginLeft: 2 }, h(Text, { dimColor: !0, wrap: "wrap" }, t)),
    choicesRow(e, [
      { hotkey: "1", label: "Helpful", onPress: o.helpful },
      { hotkey: "2", label: "Not helpful", onPress: o.notHelpful },
      { hotkey: "3", label: "Didn\u2019t read", onPress: o.unread },
    ]),
  );
}
/**
 * （匹配存疑）按条件去掉按钮的 hotkey/plain 属性并设置 leadInk/hasStarColumn，属于 UI 主题，不是 ESC 热键注册。
 */
//@ chunk-bss4k1z9.js:30857-31017 placement = registerEscHotkey (0.311)
function registerEscHotkey(e, t) {
  let o = hasOwnComposer(e),
    r = leadInkOn(e);
  return o
    ? { ...t, Button: ({ hotkey: hotkey, plain: plain, ...a }) => t.Button(a), leadInk: r, hasStarColumn: !1 }
    : { ...t, leadInk: r, hasStarColumn: !0 };
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
