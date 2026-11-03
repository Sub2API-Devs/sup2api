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
import { P, Q, y, yt, ce, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { getSettingSourceDisplayNameLowercase } from "../../utils/settings/constants.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useDebouncedCallback } from "../../ink/components/Input.js";
import { wrapText } from "../../ink/wrap-text.js";

//@ chunk-18hwfzwa.js:871872-872399 placement
/**
 * 拼写检查分词与过滤用的正则：单词、代码段、首尾标点、前导引号、类代码字符/前缀、CJK 等脚本。错归（PromptInput 拼写检查）。
 */
var WORD_RE = /\p{L}[\p{L}\p{M}]*(?:['\u2019][\p{L}\p{M}]+)*/gu;
var CODE_SPAN_RE = /(``+)[\s\S]*?(?:\1|$)|`[^`\n]*(?:`|\n|$)/g;
var EDGE_PUNCT_CLASS = String.raw`[\s.,;:!?"'\u2018\u2019\u201c\u201d\u00ab\u00bb()[\]{}<>\u2014\u2013\u2026*_~-]`;
var EDGE_PUNCT_RE = new RegExp(`^${EDGE_PUNCT_CLASS}+|${EDGE_PUNCT_CLASS}+$`, "gu");
var LEADING_QUOTE_RE = /^["'\u2018\u2019\u201c\u201d\u00ab\u00bb([{*_~]+/u;
var CODE_LIKE_CHAR_RE = /[0-9_/\\@#=<>{}[\]()|~^$%*+:;`]|\.\p{L}/u;
var CODE_LIKE_PREFIX_RE = /^(?:-|\.\p{L}|<\/?\p{L}[^<>]*>)/u;
var CJK_SCRIPT_RE =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
//@ chunk-18hwfzwa.js:872399-873043 placement = findBtwTriggerPositions (1)
/**
 * 拼写检查：找出输入文本中可检查的单词位置（跳过代码段、CJK、类代码 token、大小写混合词）。错归（PromptInput 拼写检查），旧版名 findBtwTriggerPositions 为错配。
 */
function findSpellcheckWordPositions(text) {
  let x = [];
  for (let Be of text.matchAll(CODE_SPAN_RE))
    x.push({
      start: Be.index,
      end: Be.index + Be[0].length,
    });
  let D = [];
  let L = -1;
  let ee = -1;
  let ke = false;
  let Re = 0;
  for (let Be of text.matchAll(WORD_RE)) {
    let He = Be[0];
    let index = Be.index;
    let ze = index + He.length;
    while (Re < x.length && x[Re].end <= index) Re++;
    if (Re < x.length && x[Re].start < ze) continue;
    if (He.length < 2 || He.length > 64) continue;
    if (He.slice(1) !== He.slice(1).toLowerCase()) continue;
    if (CJK_SCRIPT_RE.test(He)) continue;
    if (index >= ee) {
      L = index;
      while (L > 0 && !/\s/.test(text[L - 1])) L--;
      ee = ze;
      while (ee < text.length && !/\s/.test(text[ee])) ee++;
      let sliced = text.slice(L, ee);
      ke =
        !CODE_LIKE_PREFIX_RE.test(sliced.replace(LEADING_QUOTE_RE, "")) &&
        !CODE_LIKE_CHAR_RE.test(sliced.replace(EDGE_PUNCT_RE, ""));
    }
    if (!ke) continue;
    D.push({
      word: He,
      start: index,
      end: ze,
    });
  }
  return D;
}
//@ chunk-18hwfzwa.js:873043-873129 placement
var SPELLCHECK_DEBOUNCE_MS = 250;
var SPELLCHECK_HIGHLIGHT_PRIORITY = 2;
var ERROR = "error";
var TRAILING_APOSTROPHE_RE = /^['\u2019]*$/;
var EMPTY_WORD_POSITIONS = [];
var EMPTY_HIGHLIGHTS = [];
var spellcheckWarnedHosts = new HostScoped(() => new Set());
//@ chunk-18hwfzwa.js:873129-873208 placement
function warnSpellcheckOnce(host, x) {
  let D = spellcheckWarnedHosts.of(host);
  if (!D.has(x)) {
    D.add(x);
    logForDebugging(`[spellcheck] ${x}`);
  }
}
//@ chunk-18hwfzwa.js:873208-873237 placement
function isSupportedColor(h) {
  return isValidThemeColor(h);
}
//@ chunk-18hwfzwa.js:873237-873482 placement
function resolveSpellcheckColor(colorSetting) {
  if (colorSetting === undefined) return ERROR;
  let replaced = colorSetting.trim().replace(/\s+(?=[^()]*\))/g, "");
  let D = `ansi:${replaced}`;
  if (isSupportedColor(D)) return D;
  if (isSupportedColor(replaced)) return replaced;
  logForDebugging(
    `[spellcheck] ignoring unrecognized spellcheck.color "${colorSetting}"; using the theme's error color`,
  );
  return ERROR;
}
//@ chunk-18hwfzwa.js:873482-873526 placement
function isKnownSpellcheckProgram(h) {
  return SPELLCHECK_PROGRAMS.some((x) => x === h);
}
//@ chunk-18hwfzwa.js:873526-873705 placement
function resolveSpellcheckChecker(checkerName) {
  if (checkerName === undefined || checkerName === "auto") return "auto";
  if (isKnownSpellcheckProgram(checkerName)) return checkerName;
  logForDebugging(
    `[spellcheck] unknown spellcheck.checker "${checkerName}"; looking for ${SPELLCHECK_PROGRAMS.join(", ")} instead`,
  );
  return "auto";
}
//@ chunk-18hwfzwa.js:873705-873844 placement
function mergeNonOverlappingRanges(h, spellcheckHighlights) {
  if (spellcheckHighlights.length === 0) return h;
  let D = [...h];
  for (let L of spellcheckHighlights) if (!h.some((ee) => L.start < ee.end && L.end > ee.start)) D.push(L);
  return D;
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
  let ke = useAppState((ao) => ao.settings.spellcheck);
  let spellcheckSetting = getSecuritySensitiveSettingWithSources("spellcheck")[0];
  let spellcheckConfig = spellcheckSetting?.value;
  let configSource = spellcheckSetting?.source;
  P(() => {
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
  }, [host, ke, spellcheckConfig, configSource]);
  let enabled = spellcheckConfig?.enabled === true;
  let checkerName = (enabled && spellcheckConfig.checker?.trim()) || undefined;
  let language = (enabled && spellcheckConfig.language?.trim()) || undefined;
  let colorSetting = enabled ? spellcheckConfig.color : undefined;
  let checker = Q(() => resolveSpellcheckChecker(checkerName), [checkerName]);
  let dictLanguage = Q(() => {
    if (language === undefined || isValidLanguageTag(language)) return language;
    logForDebugging(`[spellcheck] ignoring spellcheck.language "${language}": not a plain dictionary name`);
    return;
  }, [language]);
  let highlightColor = Q(() => resolveSpellcheckColor(colorSetting), [colorSetting]);
  let [session, setSession] = y(() => (enabled ? getSpellChecker(host, checker, dictLanguage) : undefined));
  P(() => {
    if (enabled) setSession(getSpellChecker(host, checker, dictLanguage));
    else {
      disposeSpellChecker(host);
      setSession(undefined);
    }
  }, [enabled, host, checker, dictLanguage]);
  let Dt = Q(() => (session ? () => session.verdicts : getNoVerdicts), [session]);
  let verdicts = yt(session ? session.changed.subscribe : noopUnsubscribe, Dt);
  let screenReader = useIsScreenReaderEnabled();
  let wordPositions = Q(() => {
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
  let isBeingTyped = ce(
    (ao) => cursorOffset >= ao.end && TRAILING_APOSTROPHE_RE.test(text.slice(ao.end, cursorOffset)),
    [text, cursorOffset],
  );
  let pendingWords = Q(
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
  let requestCheck = useDebouncedCallback((ao) => {
    session?.request(
      ao.split(`
`),
    );
  }, SPELLCHECK_DEBOUNCE_MS);
  P(() => {
    if (pendingWords) requestCheck(pendingWords);
    else requestCheck.cancel();
  }, [pendingWords, text, session, requestCheck]);
  return Q(() => {
    let ao = [];
    for (let wordPosition of wordPositions) {
      let { word, start, end } = wordPosition;
      if (isBeingTyped(wordPosition)) continue;
      if (verdicts.isMisspelled(word) === true)
        ao.push({
          start,
          end,
          color: highlightColor,
          underline: true,
          priority: SPELLCHECK_HIGHLIGHT_PRIORITY,
        });
    }
    return ao.length > 0 ? ao : EMPTY_HIGHLIGHTS;
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
function formatPasteLabel(h) {
  let replaced = h.replace(/]/g, ")").replace(/[\r\n]/g, " ");
  return `[${wrapText(replaced, PLACEHOLDER_MAX_WIDTH, "truncate-middle")}] `.normalize("NFC");
}
//@ chunk-18hwfzwa.js:875917-875921 placement
init_react_production();
export { useSpellcheckHighlights, mergeNonOverlappingRanges, formatPasteLabel, historyPositionLabel };
