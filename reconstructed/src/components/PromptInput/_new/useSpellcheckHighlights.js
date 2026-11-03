/**
 * components/PromptInput/_new/useSpellcheckHighlights.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (13)
 * attribution: sole-consumer-new 13
 */
import { HostScoped } from "../../../utils/hostScoped.js";
import { logForDebugging } from "../../../utils/debug.js";
import { isValidThemeColor } from "../../../utils/theme.js";
import { SPELLCHECK_PROGRAMS, B_r, getSpellChecker, Y3e } from "../../../utils/spellcheck.js";
import { useAppState } from "../../../state/AppState.js";
import {
  getSecuritySensitiveSettingWithSources,
  getSettingsForSource,
} from "../../../utils/settings/settings.js";
import { P, Q, y, yt, ce, j } from "../../../../vendor/react/cjs/react.production.js";
import { getSettingSourceDisplayNameLowercase } from "../../../utils/settings/constants.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { findSpellcheckWordPositions } from "../spellcheck.js";
import { useDebouncedCallback } from "../../../ink/components/Input.js";
import { wrapText } from "../../../ink/wrap-text.js";

//@ chunk-18hwfzwa.js:873043-873129 sole-consumer-new
var Hno = 250,
  Uno = 2,
  ERROR = "error",
  Wno = /^['\u2019]*$/,
  jno = [],
  qno = [],
  $no = new HostScoped(() => new Set());
//@ chunk-18hwfzwa.js:873129-873208 sole-consumer-new
function t6e(h, x) {
  let of = $no.of(h);
  if (!of.has(x)) (of.add(x), logForDebugging(`[spellcheck] ${x}`));
}
//@ chunk-18hwfzwa.js:873208-873237 sole-consumer-new
function o6e(h) {
  return isValidThemeColor(h);
}
//@ chunk-18hwfzwa.js:873237-873482 sole-consumer-new
function resolveSpellcheckColor(h) {
  if (h === void 0) return ERROR;
  let replaced = h.trim().replace(/\s+(?=[^()]*\))/g, ""),
    D = `ansi:${replaced}`;
  if (o6e(D)) return D;
  if (o6e(replaced)) return replaced;
  return (
    logForDebugging(
      `[spellcheck] ignoring unrecognized spellcheck.color "${h}"; using the theme's error color`,
    ),
    ERROR
  );
}
//@ chunk-18hwfzwa.js:873482-873526 sole-consumer-new
function Kno(h) {
  return SPELLCHECK_PROGRAMS.some((x) => x === h);
}
//@ chunk-18hwfzwa.js:873526-873705 sole-consumer-new
function resolveSpellcheckChecker(h) {
  if (h === void 0 || h === "auto") return "auto";
  if (Kno(h)) return h;
  return (
    logForDebugging(
      `[spellcheck] unknown spellcheck.checker "${h}"; looking for ${SPELLCHECK_PROGRAMS.join(", ")} instead`,
    ),
    "auto"
  );
}
//@ chunk-18hwfzwa.js:873705-873844 sole-consumer-new
function mergeNonOverlappingRanges(h, x) {
  if (x.length === 0) return h;
  let D = [...h];
  for (let L of x) if (!h.some((ee) => L.start < ee.end && L.end > ee.start)) D.push(L);
  return D;
}
//@ chunk-18hwfzwa.js:873844-873907 sole-consumer-new
var Qno = {
    isMisspelled: () => {
      return;
    },
  },
  zno = () => () => {},
  Yno = () => Qno;
/**
 * 输入框拼写检查：只读用户设置里的 spellcheck（项目/本地设置里的会提示忽略），启动拼写检查进程，按防抖批量查询单词，返回拼错单词的下划线高亮区间（光标正在输入的词与占位符跳过，读屏模式关闭）。
 */
//@ chunk-18hwfzwa.js:873907-875673 sole-consumer-new
function useSpellcheckHighlights({
  host: host,
  text: text,
  cursorOffset: cursorOffset,
  active: active,
  placeholders: placeholders,
}) {
  let ke = useAppState((ao) => ao.settings.spellcheck),
    spellcheckSetting = getSecuritySensitiveSettingWithSources("spellcheck")[0],
    spellcheckConfig = spellcheckSetting?.value,
    configSource = spellcheckSetting?.source;
  P(() => {
    if (
      getSettingsForSource("projectSettings")?.spellcheck !== void 0 ||
      getSettingsForSource("localSettings")?.spellcheck !== void 0
    )
      t6e(
        host,
        "a spellcheck block in project or local settings is ignored, whatever else is configured; set it in your user settings (~/.claude/settings.json) instead",
      );
    if (configSource && spellcheckConfig?.enabled === void 0)
      t6e(
        host,
        `the spellcheck block in ${getSettingSourceDisplayNameLowercase(configSource)} applies (as a whole, over any lower tier) and has no usable "enabled": true, so spell checking is off`,
      );
  }, [host, ke, spellcheckConfig, configSource]);
  let enabled = spellcheckConfig?.enabled === !0,
    checkerName = (enabled && spellcheckConfig.checker?.trim()) || void 0,
    language = (enabled && spellcheckConfig.language?.trim()) || void 0,
    colorSetting = enabled ? spellcheckConfig.color : void 0,
    checker = Q(() => resolveSpellcheckChecker(checkerName), [checkerName]),
    dictLanguage = Q(() => {
      if (language === void 0 || B_r(language)) return language;
      logForDebugging(`[spellcheck] ignoring spellcheck.language "${language}": not a plain dictionary name`);
      return;
    }, [language]),
    highlightColor = Q(() => resolveSpellcheckColor(colorSetting), [colorSetting]),
    [session, Et] = y(() => (enabled ? getSpellChecker(host, checker, dictLanguage) : void 0));
  P(() => {
    if (enabled) Et(getSpellChecker(host, checker, dictLanguage));
    else (Y3e(host), Et(void 0));
  }, [enabled, host, checker, dictLanguage]);
  let Dt = Q(() => (session ? () => session.verdicts : Yno), [session]),
    verdicts = yt(session ? session.changed.subscribe : zno, Dt),
    screenReader = useIsScreenReaderEnabled(),
    wordPositions = Q(() => {
      if (!session || !active || screenReader) return jno;
      let ao = findSpellcheckWordPositions(text);
      return placeholders.length === 0
        ? ao
        : ao.filter(
            (co) => !placeholders.some((bo) => co.start < bo.index + bo.match.length && co.end > bo.index),
          );
    }, [session, active, screenReader, text, placeholders]),
    isBeingTyped = ce(
      (ao) => cursorOffset >= ao.end && Wno.test(text.slice(ao.end, cursorOffset)),
      [text, cursorOffset],
    ),
    pendingWords = Q(
      () =>
        wordPositions
          .filter((ao) => !isBeingTyped(ao) && verdicts.isMisspelled(ao.word) === void 0)
          .map((ao) => ao.word).join(`
`),
      [wordPositions, verdicts, isBeingTyped],
    ),
    requestCheck = useDebouncedCallback((ao) => {
      session?.request(
        ao.split(`
`),
      );
    }, Hno);
  return (
    P(() => {
      if (pendingWords) requestCheck(pendingWords);
      else requestCheck.cancel();
    }, [pendingWords, text, session, requestCheck]),
    Q(() => {
      let ao = [];
      for (let co of wordPositions) {
        let { word: word, start: start, end: end } = co;
        if (isBeingTyped(co)) continue;
        if (verdicts.isMisspelled(word) === !0)
          ao.push({ start: start, end: end, color: highlightColor, underline: !0, priority: Uno });
      }
      return ao.length > 0 ? ao : qno;
    }, [wordPositions, verdicts, isBeingTyped, highlightColor])
  );
}
//@ chunk-18hwfzwa.js:875673-875782 sole-consumer-new
function historyPositionLabel(h, x, D) {
  if (h === 0 || D) return;
  if (x === null) return "History";
  return `History ${Math.max(1, x - h + 1)}/${x}`;
}
//@ chunk-18hwfzwa.js:875782-875793 sole-consumer-new
var Jno = 32;
//@ chunk-18hwfzwa.js:875793-875917 sole-consumer-new
function formatPasteLabel(h) {
  let replaced = h.replace(/]/g, ")").replace(/[\r\n]/g, " ");
  return `[${wrapText(replaced, Jno, "truncate-middle")}] `.normalize("NFC");
}
//@ chunk-18hwfzwa.js:875917-875921 sole-consumer-new
j();

export { useSpellcheckHighlights, mergeNonOverlappingRanges, formatPasteLabel, historyPositionLabel };
