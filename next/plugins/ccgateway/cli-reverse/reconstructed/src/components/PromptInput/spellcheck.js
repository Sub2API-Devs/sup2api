/**
 * components/PromptInput/spellcheck.ts
 *
 * 2.1.316 新增：输入框拼写检查（分词正则 + 启动拼写检查进程 + 防抖批量查询 + 拼错单词高亮区间）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (15)
 * attribution: placement 15
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { logForDebugging } from "../../utils/debug.js";
import { isValidThemeColor } from "../../utils/theme.js";
import {
  SPELLCHECK_PROGRAMS,
  isValidLanguageTag,
  getSpellChecker,
  disposeSpellChecker,
} from "../../utils/spellcheck.js";
import { useAppState } from "../../state/AppState.js";
import {
  getSecuritySensitiveSettingWithSources,
  getSettingsForSource,
} from "../../utils/settings/settings.js";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  useCallback,
  init_react_production,
} from "../../../vendor/react/cjs/react.production.js";
import { getSettingSourceDisplayNameLowercase } from "../../utils/settings/constants.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useDebouncedCallback } from "../../ink/components/Input.js";
import { wrapText } from "../../ink/wrap-text.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:871872-872399 placement
/**
 * 拼写检查分词与过滤用的正则：单词、代码段、首尾标点、前导引号、类代码字符/前缀、CJK 等脚本。错归（PromptInput 拼写检查）。
 */
var WORD_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CODE_SPAN_RE;
var EDGE_PUNCT_CLASS;
var EDGE_PUNCT_RE;
var LEADING_QUOTE_RE;
var CODE_LIKE_CHAR_RE;
var CODE_LIKE_PREFIX_RE;
var CJK_SCRIPT_RE;
deferInit("chunk-18hwfzwa.js:871872", () => {
  WORD_RE = /\p{L}[\p{L}\p{M}]*(?:['\u2019][\p{L}\p{M}]+)*/gu;
  CODE_SPAN_RE = /(``+)[\s\S]*?(?:\1|$)|`[^`\n]*(?:`|\n|$)/g;
  EDGE_PUNCT_CLASS = String.raw`[\s.,;:!?"'\u2018\u2019\u201c\u201d\u00ab\u00bb()[\]{}<>\u2014\u2013\u2026*_~-]`;
  EDGE_PUNCT_RE = new RegExp(`^${EDGE_PUNCT_CLASS}+|${EDGE_PUNCT_CLASS}+$`, "gu");
  LEADING_QUOTE_RE = /^["'\u2018\u2019\u201c\u201d\u00ab\u00bb([{*_~]+/u;
  CODE_LIKE_CHAR_RE = /[0-9_/\\@#=<>{}[\]()|~^$%*+:;`]|\.\p{L}/u;
  CODE_LIKE_PREFIX_RE = /^(?:-|\.\p{L}|<\/?\p{L}[^<>]*>)/u;
  CJK_SCRIPT_RE =
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
});
//@ chunk-18hwfzwa.js:872399-873043 placement (2.1.88 match: findBtwTriggerPositions, 1)
/**
 * 拼写检查：找出输入文本中可检查的单词位置（跳过代码段、CJK、类代码 token、大小写混合词）。错归（PromptInput 拼写检查），旧版名 findBtwTriggerPositions 为错配。
 */
function findSpellcheckWordPositions(text) {
  let codeSpans = [];
  for (let match of text.matchAll(CODE_SPAN_RE))
    codeSpans.push({
      start: match.index,
      end: match.index + match[0].length,
    });
  let positions = [];
  let segmentStart = -1;
  let segmentEnd = -1;
  let isProseSegment = false;
  let spanIndex = 0;
  for (let match of text.matchAll(WORD_RE)) {
    let word = match[0];
    let index = match.index;
    let wordEnd = index + word.length;
    while (spanIndex < codeSpans.length && codeSpans[spanIndex].end <= index) spanIndex++;
    if (spanIndex < codeSpans.length && codeSpans[spanIndex].start < wordEnd) continue;
    if (word.length < 2 || word.length > 64) continue;
    if (word.slice(1) !== word.slice(1).toLowerCase()) continue;
    if (CJK_SCRIPT_RE.test(word)) continue;
    if (index >= segmentEnd) {
      segmentStart = index;
      while (segmentStart > 0 && !/\s/.test(text[segmentStart - 1])) segmentStart--;
      segmentEnd = wordEnd;
      while (segmentEnd < text.length && !/\s/.test(text[segmentEnd])) segmentEnd++;
      let sliced = text.slice(segmentStart, segmentEnd);
      isProseSegment =
        !CODE_LIKE_PREFIX_RE.test(sliced.replace(LEADING_QUOTE_RE, "")) &&
        !CODE_LIKE_CHAR_RE.test(sliced.replace(EDGE_PUNCT_RE, ""));
    }
    if (!isProseSegment) continue;
    positions.push({
      word,
      start: index,
      end: wordEnd,
    });
  }
  return positions;
}
//@ chunk-18hwfzwa.js:873043-873129 placement
var SPELLCHECK_DEBOUNCE_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SPELLCHECK_HIGHLIGHT_PRIORITY;
var ERROR;
var TRAILING_APOSTROPHE_RE;
var EMPTY_WORD_POSITIONS;
var EMPTY_HIGHLIGHTS;
var spellcheckWarnedHosts;
deferInit("chunk-18hwfzwa.js:873043", () => {
  SPELLCHECK_DEBOUNCE_MS = 250;
  SPELLCHECK_HIGHLIGHT_PRIORITY = 2;
  ERROR = "error";
  TRAILING_APOSTROPHE_RE = /^['\u2019]*$/;
  EMPTY_WORD_POSITIONS = [];
  EMPTY_HIGHLIGHTS = [];
  spellcheckWarnedHosts = new HostScoped(() => new Set());
});
//@ chunk-18hwfzwa.js:873129-873208 placement
function warnSpellcheckOnce(host, message) {
  let warnedHosts = spellcheckWarnedHosts.of(host);
  if (!warnedHosts.has(message)) {
    warnedHosts.add(message);
    logForDebugging(`[spellcheck] ${message}`);
  }
}
//@ chunk-18hwfzwa.js:873208-873237 placement
function isSupportedColor(color) {
  return isValidThemeColor(color);
}
//@ chunk-18hwfzwa.js:873237-873482 placement
function resolveSpellcheckColor(colorSetting) {
  if (colorSetting === undefined) return ERROR;
  let color = colorSetting.trim().replace(/\s+(?=[^()]*\))/g, "");
  let ansiColor = `ansi:${color}`;
  if (isSupportedColor(ansiColor)) return ansiColor;
  if (isSupportedColor(color)) return color;
  logForDebugging(
    `[spellcheck] ignoring unrecognized spellcheck.color "${colorSetting}"; using the theme's error color`,
  );
  return ERROR;
}
//@ chunk-18hwfzwa.js:873482-873526 placement
function isKnownSpellcheckProgram(program) {
  return SPELLCHECK_PROGRAMS.some((knownProgram) => knownProgram === program);
}
//@ chunk-18hwfzwa.js:873526-873705 placement
function resolveSpellcheckChecker(program) {
  if (program === undefined || program === "auto") return "auto";
  if (isKnownSpellcheckProgram(program)) return program;
  logForDebugging(
    `[spellcheck] unknown spellcheck.checker "${program}"; looking for ${SPELLCHECK_PROGRAMS.join(", ")} instead`,
  );
  return "auto";
}
//@ chunk-18hwfzwa.js:873705-873844 placement
function mergeNonOverlappingRanges(ranges, spellcheckHighlights) {
  if (spellcheckHighlights.length === 0) return ranges;
  let merged = [...ranges];
  for (let range of spellcheckHighlights)
    if (!ranges.some((existing) => range.start < existing.end && range.end > existing.start))
      merged.push(range);
  return merged;
}
//@ chunk-18hwfzwa.js:873844-873907 placement
var NO_SPELLCHECK_VERDICTS = {
  isMisspelled: () => {
    return;
  },
};
var noopUnsubscribe = () => () => {};
var getNoVerdicts = () => NO_SPELLCHECK_VERDICTS;
//@ chunk-18hwfzwa.js:873907-875673 placement
/**
 * 输入框拼写检查：只读用户设置里的 spellcheck（项目/本地设置里的会提示忽略），启动拼写检查进程，按防抖批量查询单词，返回拼错单词的下划线高亮区间（光标正在输入的词与占位符跳过，读屏模式关闭）。
 */
function useSpellcheckHighlights({ host, text, cursorOffset, active, placeholders }) {
  let settingsSpellcheck = useAppState((state) => state.settings.spellcheck);
  let spellcheckSetting = getSecuritySensitiveSettingWithSources("spellcheck")[0];
  let spellcheckConfig = spellcheckSetting?.value;
  let configSource = spellcheckSetting?.source;
  useEffect(() => {
    if (
      getSettingsForSource("projectSettings")?.spellcheck !== undefined ||
      getSettingsForSource("localSettings")?.spellcheck !== undefined
    )
      warnSpellcheckOnce(
        host,
        "a spellcheck block in project or local settings is ignored, whatever else is configured; set it in your user settings (~/.claude/settings.json) instead",
      );
    if (configSource && spellcheckConfig?.enabled === undefined)
      warnSpellcheckOnce(
        host,
        `the spellcheck block in ${getSettingSourceDisplayNameLowercase(configSource)} applies (as a whole, over any lower tier) and has no usable "enabled": true, so spell checking is off`,
      );
  }, [host, settingsSpellcheck, spellcheckConfig, configSource]);
  let enabled = spellcheckConfig?.enabled === true;
  let checkerName = (enabled && spellcheckConfig.checker?.trim()) || undefined;
  let language = (enabled && spellcheckConfig.language?.trim()) || undefined;
  let colorSetting = enabled ? spellcheckConfig.color : undefined;
  let checker = useMemo(() => resolveSpellcheckChecker(checkerName), [checkerName]);
  let dictLanguage = useMemo(() => {
    if (language === undefined || isValidLanguageTag(language)) return language;
    logForDebugging(`[spellcheck] ignoring spellcheck.language "${language}": not a plain dictionary name`);
    return;
  }, [language]);
  let highlightColor = useMemo(() => resolveSpellcheckColor(colorSetting), [colorSetting]);
  let [session, setSession] = useState(() =>
    enabled ? getSpellChecker(host, checker, dictLanguage) : undefined,
  );
  useEffect(() => {
    if (enabled) setSession(getSpellChecker(host, checker, dictLanguage));
    else {
      disposeSpellChecker(host);
      setSession(undefined);
    }
  }, [enabled, host, checker, dictLanguage]);
  let verdictsSelector = useMemo(() => (session ? () => session.verdicts : getNoVerdicts), [session]);
  let verdicts = useSyncExternalStore(
    session ? session.changed.subscribe : noopUnsubscribe,
    verdictsSelector,
  );
  let screenReader = useIsScreenReaderEnabled();
  let wordPositions = useMemo(() => {
    if (!session || !active || screenReader) return EMPTY_WORD_POSITIONS;
    let spellcheckWordPositions = findSpellcheckWordPositions(text);
    return placeholders.length === 0
      ? spellcheckWordPositions
      : spellcheckWordPositions.filter(
          (spellcheckWordPosition) =>
            !placeholders.some(
              (placeholder) =>
                spellcheckWordPosition.start < placeholder.index + placeholder.match.length &&
                spellcheckWordPosition.end > placeholder.index,
            ),
        );
  }, [session, active, screenReader, text, placeholders]);
  let isBeingTyped = useCallback(
    (isBeingTyped) =>
      cursorOffset >= isBeingTyped.end &&
      TRAILING_APOSTROPHE_RE.test(text.slice(isBeingTyped.end, cursorOffset)),
    [text, cursorOffset],
  );
  let pendingWords = useMemo(
    () =>
      wordPositions
        .filter(
          (wordPosition) =>
            !isBeingTyped(wordPosition) && verdicts.isMisspelled(wordPosition.word) === undefined,
        )
        .map((wordPosition) => wordPosition.word).join(`
`),
    [wordPositions, verdicts, isBeingTyped],
  );
  let requestCheck = useDebouncedCallback((checkRequest) => {
    session?.request(
      checkRequest.split(`
`),
    );
  }, SPELLCHECK_DEBOUNCE_MS);
  useEffect(() => {
    if (pendingWords) requestCheck(pendingWords);
    else requestCheck.cancel();
  }, [pendingWords, text, session, requestCheck]);
  return useMemo(() => {
    let ranges = [];
    for (let wordPosition of wordPositions) {
      let { word, start, end } = wordPosition;
      if (isBeingTyped(wordPosition)) continue;
      if (verdicts.isMisspelled(word) === true)
        ranges.push({
          start,
          end,
          color: highlightColor,
          underline: true,
          priority: SPELLCHECK_HIGHLIGHT_PRIORITY,
        });
    }
    return ranges.length > 0 ? ranges : EMPTY_HIGHLIGHTS;
  }, [wordPositions, verdicts, isBeingTyped, highlightColor]);
}
//@ chunk-18hwfzwa.js:875673-875782 placement
function historyPositionLabel(historyIndex, historyTotal, historyEdited) {
  if (historyIndex === 0 || historyEdited) return;
  if (historyTotal === null) return "History";
  return `History ${Math.max(1, historyTotal - historyIndex + 1)}/${historyTotal}`;
}
//@ chunk-18hwfzwa.js:875782-875793 placement
var PLACEHOLDER_MAX_WIDTH = 32;
//@ chunk-18hwfzwa.js:875793-875917 placement
function formatPasteLabel(text) {
  let replaced = text.replace(/]/g, ")").replace(/[\r\n]/g, " ");
  return `[${wrapText(replaced, PLACEHOLDER_MAX_WIDTH, "truncate-middle")}] `.normalize("NFC");
}
//@ chunk-18hwfzwa.js:875917-875921 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:875917", () => {
  init_react_production();
});
export { useSpellcheckHighlights, mergeNonOverlappingRanges, formatPasteLabel, historyPositionLabel };
