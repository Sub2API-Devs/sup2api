/**
 * components/ThemePicker.tsx
 *
 * /theme 主题选择器：预览 diff 着色，ctrl+t 切换语法高亮，写入 userSettings。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ThemePicker.tsx
 * pieces: chunk-5je9hz27.js (5)
 * attribution: placement 1, fingerprint 2, layout 2
 */
import {
  init_react_production,
  useRef,
  useEffect,
  useState,
  useContext,
} from "../../vendor/react/cjs/react.production.js";
import { customThemeRef, parseCustomThemeRef } from "../utils/customThemes.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import {
  useTheme_2,
  useTheme,
  useThemeSetting,
  usePreviewTheme,
  useCustomThemes,
} from "./design-system/ThemeProvider.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { getColorModuleUnavailableReason } from "./StructuredDiff/colorDiff.js";
import { getColorSyntaxTheme } from "../native-ts/color-diff/index.js";
import { useAppState, useSetAppState } from "../state/AppState.js";
import { useRegisterKeybindingContext } from "../keybindings/KeybindingContext.js";
import { useShortcutDisplay } from "../keybindings/useShortcutDisplay.js";
import { updateSettingsForSource } from "../utils/settings/settings.js";
import { useKeybinding, useGlobalExitKeybindings } from "../keybindings/useKeybinding.js";
import { gracefulShutdown } from "../utils/gracefulShutdown.js";
import {
  useScrollColumnContext,
  SCROLL_COLUMN_MIN_ROWS,
  ScrollColumn,
} from "./design-system/ScrollColumn.js";
import { scrollViewportContext } from "./ScrollViewportContext.js";
import { topWithin } from "../ink/hooks/useTerminalHooks.js";
import { useMeasured } from "../ink/components/Input.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { isSelectableThemeName } from "../utils/theme.js";
import { OrderedListWithItem } from "./CustomSelect/selectTable.js";
import { StatusIcon, maxStatusIconWidth } from "./design-system/StatusIcon.js";
import { DiffFrame } from "./FileEditToolDiff.js";
import { StructuredDiff } from "./StructuredDiff.js";
import { env } from "../utils/env.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";

//@ chunk-5je9hz27.js:1146-1150 placement
init_react_production();
//@ chunk-5je9hz27.js:1150-1212 fingerprint (2.1.88 match: _temp, 1)
function selectSettingsSyntaxHighlightingDisabled(s) {
  return s.settings.syntaxHighlightingDisabled;
}
//@ chunk-5je9hz27.js:1212-1331 layout
function toCustomThemeOption(theme) {
  return {
    label: theme.name,
    origin: theme.source === "user" ? "custom" : `from ${theme.source.plugin}`,
    value: customThemeRef(theme.slug),
  };
}
//@ chunk-5je9hz27.js:1331-1361 layout
var NEW_CUSTOM_THEME = "__new_custom_theme__";
//@ chunk-5je9hz27.js:1361-8399 fingerprint (2.1.88 match: ThemePicker, 0.724)
/**
 * 主题选择器：列出 dark/light/daltonized/ansi 等主题，选中即预览（含 diff 示例），ctrl+t 切换语法高亮，确定后写入 userSettings。
 */
function ThemePicker(props) {
  let $ = useMemoCache(109);
  let {
    onThemeSelect,
    showIntroText,
    helpText,
    showHelpTextBelow,
    hideEscToCancel,
    skipExitHandling,
    onCancel: onCancelProp,
    onCustomTheme,
  } = props;
  let showIntroText_ = showIntroText === undefined ? false : showIntroText;
  let helpText_ = helpText === undefined ? "" : helpText;
  let showHelpTextBelow_ = showHelpTextBelow === undefined ? false : showHelpTextBelow;
  let hideEscToCancel_ = hideEscToCancel === undefined ? false : hideEscToCancel;
  let skipExitHandling_ = skipExitHandling === undefined ? false : skipExitHandling;
  let { storageV5 } = useTheme_2();
  let [theme] = useTheme();
  let themeSetting = useThemeSetting();
  let { columns } = useTerminalSize();
  let colorModuleUnavailableReason;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    colorModuleUnavailableReason = getColorModuleUnavailableReason();
    $[0] = colorModuleUnavailableReason;
  } else colorModuleUnavailableReason = $[0];
  let colorModuleUnavailableReason_2 = colorModuleUnavailableReason;
  let syntaxTheme;
  if ($[1] !== theme) {
    syntaxTheme = colorModuleUnavailableReason_2 === null ? getColorSyntaxTheme(theme) : null;
    $[1] = theme;
    $[2] = syntaxTheme;
  } else syntaxTheme = $[2];
  let syntaxTheme_2 = syntaxTheme;
  let { setPreviewTheme, cancelPreview } = usePreviewTheme();
  let commitTokenRef = useRef(undefined);
  let commitAfter;
  if ($[3] !== cancelPreview) {
    commitAfter = (themePromise) => {
      let commitToken = Symbol("commit");
      commitTokenRef.current = commitToken;
      let finishCommit = () => {
        if (commitTokenRef.current === commitToken) {
          commitTokenRef.current = undefined;
          cancelPreview();
        }
      };
      Promise.resolve(themePromise).then(finishCommit, finishCommit);
    };
    $[3] = cancelPreview;
    $[4] = commitAfter;
  } else commitAfter = $[4];
  let runWithCommit = commitAfter;
  let cleanupDeps;
  let cancelOnUnmount;
  if ($[5] !== cancelPreview) {
    cancelOnUnmount = () => () => {
      if (commitTokenRef.current === undefined) cancelPreview();
    };
    cleanupDeps = [cancelPreview];
    $[5] = cancelPreview;
    $[6] = cleanupDeps;
    $[7] = cancelOnUnmount;
  } else {
    cleanupDeps = $[6];
    cancelOnUnmount = $[7];
  }
  useEffect(cancelOnUnmount, cleanupDeps);
  let syntaxHighlightingDisabled = useAppState(selectSettingsSyntaxHighlightingDisabled) ?? false;
  let setAppState = useSetAppState();
  useRegisterKeybindingContext("ThemePicker");
  let syntaxToggleShortcut = useShortcutDisplay("theme:toggleSyntaxHighlighting", "ThemePicker", "ctrl+t");
  let toggleSyntaxHighlighting;
  if ($[8] !== setAppState || $[9] !== storageV5 || $[10] !== syntaxHighlightingDisabled) {
    toggleSyntaxHighlighting = () => {
      if (colorModuleUnavailableReason_2 === null) {
        let newValue = !syntaxHighlightingDisabled;
        updateSettingsForSource(
          "userSettings",
          {
            syntaxHighlightingDisabled: newValue,
          },
          undefined,
          storageV5,
        );
        setAppState((prev) => ({
          ...prev,
          settings: {
            ...prev.settings,
            syntaxHighlightingDisabled: newValue,
          },
        }));
      }
    };
    $[8] = setAppState;
    $[9] = storageV5;
    $[10] = syntaxHighlightingDisabled;
    $[11] = toggleSyntaxHighlighting;
  } else toggleSyntaxHighlighting = $[11];
  let themePickerKeybindingOptions;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    themePickerKeybindingOptions = {
      context: "ThemePicker",
    };
    $[12] = themePickerKeybindingOptions;
  } else themePickerKeybindingOptions = $[12];
  useKeybinding("theme:toggleSyntaxHighlighting", toggleSyntaxHighlighting, themePickerKeybindingOptions);
  let handleCancel;
  if ($[13] !== cancelPreview || $[14] !== onCancelProp) {
    handleCancel = () => {
      commitTokenRef.current = undefined;
      cancelPreview();
      onCancelProp?.();
    };
    $[13] = cancelPreview;
    $[14] = onCancelProp;
    $[15] = handleCancel;
  } else handleCancel = $[15];
  let cancelThemePicker = handleCancel;
  let onSelectCancel;
  if ($[16] !== cancelThemePicker || $[17] !== cancelPreview || $[18] !== skipExitHandling_) {
    onSelectCancel = skipExitHandling_
      ? cancelThemePicker
      : async () => {
          cancelPreview();
          await gracefulShutdown(0);
        };
    $[16] = cancelThemePicker;
    $[17] = cancelPreview;
    $[18] = skipExitHandling_;
    $[19] = onSelectCancel;
  } else onSelectCancel = $[19];
  let selectKeybindingOptions;
  if ($[20] === MEMO_CACHE_SENTINEL) {
    selectKeybindingOptions = {
      context: "Select",
    };
    $[20] = selectKeybindingOptions;
  } else selectKeybindingOptions = $[20];
  useKeybinding("select:cancel", onSelectCancel, selectKeybindingOptions);
  let exitState = useGlobalExitKeybindings(skipExitHandling_ ? cancelThemePicker : undefined);
  let { customThemes } = useCustomThemes();
  let autoOption;
  let darkOption;
  let lightOption;
  let darkDaltonizedOption;
  let lightDaltonizedOption;
  let darkAnsiOption;
  let lightAnsiOption;
  if ($[21] === MEMO_CACHE_SENTINEL) {
    autoOption = {
      label: "Auto (match terminal)",
      value: "auto",
    };
    darkOption = {
      label: "Dark mode",
      value: "dark",
    };
    lightOption = {
      label: "Light mode",
      value: "light",
    };
    darkDaltonizedOption = {
      label: "Dark mode (colorblind-friendly)",
      value: "dark-daltonized",
    };
    lightDaltonizedOption = {
      label: "Light mode (colorblind-friendly)",
      value: "light-daltonized",
    };
    darkAnsiOption = {
      label: "Dark mode (ANSI colors only)",
      value: "dark-ansi",
    };
    lightAnsiOption = {
      label: "Light mode (ANSI colors only)",
      value: "light-ansi",
    };
    $[21] = autoOption;
    $[22] = darkOption;
    $[23] = lightOption;
    $[24] = darkDaltonizedOption;
    $[25] = lightDaltonizedOption;
    $[26] = darkAnsiOption;
    $[27] = lightAnsiOption;
  } else {
    autoOption = $[21];
    darkOption = $[22];
    lightOption = $[23];
    darkDaltonizedOption = $[24];
    lightDaltonizedOption = $[25];
    darkAnsiOption = $[26];
    lightAnsiOption = $[27];
  }
  let themeOptions;
  if ($[28] !== customThemes || $[29] !== onCustomTheme) {
    const mapped = customThemes.map(toCustomThemeOption);
    let newCustomOptionList;
    if ($[31] !== onCustomTheme) {
      newCustomOptionList = onCustomTheme
        ? [
            {
              label: "New custom theme\u2026",
              value: NEW_CUSTOM_THEME,
            },
          ]
        : [];
      $[31] = onCustomTheme;
      $[32] = newCustomOptionList;
    } else newCustomOptionList = $[32];
    themeOptions = [
      autoOption,
      darkOption,
      lightOption,
      darkDaltonizedOption,
      lightDaltonizedOption,
      darkAnsiOption,
      lightAnsiOption,
      ...mapped,
      ...newCustomOptionList,
    ];
    $[28] = customThemes;
    $[29] = onCustomTheme;
    $[30] = themeOptions;
  } else themeOptions = $[30];
  let options = themeOptions;
  let index = options.findIndex((option) => option.value === themeSetting);
  let [focusedValue, setFocusedValue] = useState(options[Math.max(0, index)]?.value ?? themeSetting);
  let [hasPreviewed, setHasPreviewed] = useState(false);
  let [isInitialized, setIsInitialized] = useState(index !== -1);
  if (!isInitialized && !hasPreviewed && index !== -1) {
    setIsInitialized(true);
    setFocusedValue(themeSetting);
  }
  let customRef;
  if ($[33] !== focusedValue) {
    customRef = parseCustomThemeRef(focusedValue);
    $[33] = focusedValue;
    $[34] = customRef;
  } else customRef = $[34];
  let customRefSlug = customRef;
  let customTheme;
  if ($[35] !== customThemes || $[36] !== customRefSlug) {
    customTheme = customRefSlug
      ? customThemes.find((customTheme) => customTheme.slug === customRefSlug)
      : undefined;
    $[35] = customThemes;
    $[36] = customRefSlug;
    $[37] = customTheme;
  } else customTheme = $[37];
  let selectedCustomTheme = customTheme;
  let chord = useShortcutDisplay("theme:editCustom", "ThemePicker", "ctrl+e");
  let editCustomTheme;
  if ($[38] !== selectedCustomTheme || $[39] !== runWithCommit || $[40] !== onCustomTheme) {
    editCustomTheme = () => {
      if (selectedCustomTheme && onCustomTheme && commitTokenRef.current === undefined)
        runWithCommit(onCustomTheme(selectedCustomTheme));
    };
    $[38] = selectedCustomTheme;
    $[39] = runWithCommit;
    $[40] = onCustomTheme;
    $[41] = editCustomTheme;
  } else editCustomTheme = $[41];
  let editCustomKeybindingOptions;
  if ($[42] === MEMO_CACHE_SENTINEL) {
    editCustomKeybindingOptions = {
      context: "ThemePicker",
    };
    $[42] = editCustomKeybindingOptions;
  } else editCustomKeybindingOptions = $[42];
  useKeybinding("theme:editCustom", editCustomTheme, editCustomKeybindingOptions);
  let scrollColumnContext = useScrollColumnContext();
  let scrollViewportValue = useContext(scrollViewportContext);
  let containerRef = useRef(null);
  let measureTop;
  if ($[43] !== scrollColumnContext) {
    measureTop = () => {
      let container = containerRef.current;
      if (container === null) {
        return 0;
      }
      let scrollRoot = scrollColumnContext?.box.current ?? container;
      while (scrollColumnContext === null && scrollRoot.parentNode !== undefined)
        scrollRoot = scrollRoot.parentNode;
      return Math.max(0, topWithin(container, scrollRoot));
    };
    $[43] = scrollColumnContext;
    $[44] = measureTop;
  } else measureTop = $[44];
  let measured = useMeasured(measureTop);
  let reservedTopRows = showIntroText_ ? 0 : measured + (hideEscToCancel_ ? 1 : 0);
  let titleElement;
  if ($[45] !== showIntroText_) {
    titleElement = showIntroText_
      ? jsxProd_default(Text, {
          children: "Let's get started.",
        })
      : jsxProd_default(Text, {
          bold: true,
          color: "permission",
          children: "Theme",
        });
    $[45] = showIntroText_;
    $[46] = titleElement;
  } else titleElement = $[46];
  let subtitleElement;
  if ($[47] === MEMO_CACHE_SENTINEL) {
    subtitleElement = jsxProd_default(Text, {
      bold: true,
      children: "Choose the text style that looks best with your terminal",
    });
    $[47] = subtitleElement;
  } else subtitleElement = $[47];
  let helpElement;
  if ($[48] !== helpText_ || $[49] !== showHelpTextBelow_) {
    helpElement =
      helpText_ &&
      !showHelpTextBelow_ &&
      jsxProd_default(Text, {
        dimColor: true,
        children: helpText_,
      });
    $[48] = helpText_;
    $[49] = showHelpTextBelow_;
    $[50] = helpElement;
  } else helpElement = $[50];
  let headerElement;
  if ($[51] !== helpElement) {
    headerElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [subtitleElement, helpElement],
    });
    $[51] = helpElement;
    $[52] = headerElement;
  } else headerElement = $[52];
  const listKey = isInitialized ? "on-saved-theme" : "on-first-theme";
  const defaultFocusIndex = Math.max(0, index);
  let onFocus;
  if ($[53] !== cancelPreview || $[54] !== focusedValue || $[55] !== setPreviewTheme || $[56] !== options) {
    onFocus = (setting) => {
      let focusedOptionValue = options[setting]?.value;
      if (
        focusedOptionValue === undefined ||
        focusedOptionValue === focusedValue ||
        commitTokenRef.current !== undefined
      ) {
        return;
      }
      setFocusedValue(focusedOptionValue);
      setHasPreviewed(true);
      if (isSelectableThemeName(focusedOptionValue)) setPreviewTheme(focusedOptionValue);
      else cancelPreview();
    };
    $[53] = cancelPreview;
    $[54] = focusedValue;
    $[55] = setPreviewTheme;
    $[56] = options;
    $[57] = onFocus;
  } else onFocus = $[57];
  let onSelect;
  if (
    $[58] !== cancelPreview ||
    $[59] !== runWithCommit ||
    $[60] !== onCustomTheme ||
    $[61] !== onThemeSelect ||
    $[62] !== options
  ) {
    onSelect = (setting_0) => {
      let selectedOptionValue = options[setting_0]?.value;
      if (selectedOptionValue === undefined || commitTokenRef.current !== undefined) {
        return;
      }
      if (!isSelectableThemeName(selectedOptionValue)) {
        cancelPreview();
        onCustomTheme?.(undefined);
        return;
      }
      runWithCommit(onThemeSelect(selectedOptionValue));
    };
    $[58] = cancelPreview;
    $[59] = runWithCommit;
    $[60] = onCustomTheme;
    $[61] = onThemeSelect;
    $[62] = options;
    $[63] = onSelect;
  } else onSelect = $[63];
  let children;
  if ($[64] !== options || $[65] !== themeSetting) {
    children = options.map((option) =>
      jsxProd_default(
        OrderedListWithItem.Item,
        {
          label: option.label,
          icon:
            option.value === themeSetting
              ? jsxProd_default(StatusIcon, {
                  status: "success",
                  "aria-label": "current:",
                })
              : jsxProd_default(Text, {
                  "aria-hidden": true,
                  children: " ".repeat(maxStatusIconWidth()),
                }),
          meta: option.origin === undefined ? undefined : [option.origin],
        },
        option.value,
      ),
    );
    $[64] = options;
    $[65] = themeSetting;
    $[66] = children;
  } else children = $[66];
  let listElement;
  if (
    $[67] !== listKey ||
    $[68] !== defaultFocusIndex ||
    $[69] !== onFocus ||
    $[70] !== onSelect ||
    $[71] !== children
  ) {
    listElement = jsxProd_default(
      OrderedListWithItem,
      {
        defaultFocusIndex,
        onFocus,
        onSelect,
        children,
      },
      listKey,
    );
    $[67] = listKey;
    $[68] = defaultFocusIndex;
    $[69] = onFocus;
    $[70] = onSelect;
    $[71] = children;
    $[72] = listElement;
  } else listElement = $[72];
  let pickerElement;
  if ($[73] !== titleElement || $[74] !== headerElement || $[75] !== listElement) {
    pickerElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [titleElement, headerElement, listElement],
    });
    $[73] = titleElement;
    $[74] = headerElement;
    $[75] = listElement;
    $[76] = pickerElement;
  } else pickerElement = $[76];
  let patch;
  if ($[77] === MEMO_CACHE_SENTINEL) {
    patch = {
      oldStart: 1,
      newStart: 1,
      oldLines: 3,
      newLines: 3,
      lines: [
        " function greet() {",
        '-  console.log("Hello, World!");',
        '+  console.log("Hello, Claude!");',
        " }",
      ],
    };
    $[77] = patch;
  } else patch = $[77];
  const width = columns - 6;
  let previewElement;
  if ($[78] !== width) {
    previewElement = jsxProd_default(DiffFrame, {
      paddingX: 0,
      children: jsxProd_default(StructuredDiff, {
        patch,
        dim: false,
        filePath: "demo.js",
        firstLine: null,
        width,
      }),
    });
    $[78] = width;
    $[79] = previewElement;
  } else previewElement = $[79];
  const syntaxStatusText =
    colorModuleUnavailableReason_2 === "env"
      ? `Syntax highlighting disabled (via CLAUDE_CODE_SYNTAX_HIGHLIGHT=${env.CLAUDE_CODE_SYNTAX_HIGHLIGHT})`
      : syntaxHighlightingDisabled
        ? `Syntax highlighting disabled (${syntaxToggleShortcut} to enable)`
        : syntaxTheme_2
          ? `Syntax theme: ${syntaxTheme_2.theme}${syntaxTheme_2.source ? ` (from ${syntaxTheme_2.source})` : ""} (${syntaxToggleShortcut} to disable)`
          : `Syntax highlighting enabled (${syntaxToggleShortcut} to disable)`;
  let syntaxStatusElement;
  if ($[80] !== syntaxStatusText) {
    syntaxStatusElement = jsxProd_default_2(Text, {
      dimColor: true,
      children: [" ", syntaxStatusText],
    });
    $[80] = syntaxStatusText;
    $[81] = syntaxStatusElement;
  } else syntaxStatusElement = $[81];
  let previewSection;
  if ($[82] !== previewElement || $[83] !== syntaxStatusElement) {
    previewSection = jsxProd_default_2(Box, {
      flexDirection: "column",
      width: "100%",
      children: [previewElement, syntaxStatusElement],
    });
    $[82] = previewElement;
    $[83] = syntaxStatusElement;
    $[84] = previewSection;
  } else previewSection = $[84];
  let scrollContent;
  if ($[85] !== pickerElement || $[86] !== previewSection) {
    scrollContent = jsxProd_default_2(Box, {
      ref: containerRef,
      flexDirection: "column",
      gap: 1,
      children: [pickerElement, previewSection],
    });
    $[85] = pickerElement;
    $[86] = previewSection;
    $[87] = scrollContent;
  } else scrollContent = $[87];
  let content = scrollContent;
  let value;
  if ($[88] !== scrollColumnContext?.rows || $[89] !== reservedTopRows || $[90] !== scrollViewportValue) {
    value = scrollViewportValue && {
      ...scrollViewportValue,
      rows: Math.max(0, (scrollColumnContext?.rows ?? scrollViewportValue.rows) - reservedTopRows),
    };
    $[88] = scrollColumnContext?.rows;
    $[89] = reservedTopRows;
    $[90] = scrollViewportValue;
    $[91] = value;
  } else value = $[91];
  const reserve = (scrollColumnContext?.reserve ?? SCROLL_COLUMN_MIN_ROWS) + reservedTopRows;
  let footerElement;
  if (
    $[92] !== chord ||
    $[93] !== exitState ||
    $[94] !== selectedCustomTheme ||
    $[95] !== helpText_ ||
    $[96] !== hideEscToCancel_ ||
    $[97] !== onCustomTheme ||
    $[98] !== showHelpTextBelow_ ||
    $[99] !== showIntroText_ ||
    $[100] !== skipExitHandling_
  ) {
    footerElement =
      !showIntroText_ &&
      jsxProd_default_2(Box, {
        marginTop: 1,
        children: [
          showHelpTextBelow_ &&
            helpText_ &&
            jsxProd_default(Box, {
              marginLeft: 3,
              children: jsxProd_default(Text, {
                dimColor: true,
                children: helpText_,
              }),
            }),
          !hideEscToCancel_ &&
            jsxProd_default(Box, {
              children: jsxProd_default(Text, {
                dimColor: true,
                italic: true,
                children: exitState.pending
                  ? jsxProd_default_2(Fragment, {
                      children: [
                        "Press ",
                        exitState.keyName,
                        " again to",
                        " ",
                        skipExitHandling_ ? "cancel" : "exit",
                      ],
                    })
                  : jsxProd_default_2(Byline, {
                      children: [
                        jsxProd_default(KeyboardShortcutHint, {
                          chord: "enter",
                          action: "select",
                        }),
                        selectedCustomTheme &&
                          onCustomTheme &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord,
                            action: "edit",
                          }),
                        jsxProd_default(KeyboardShortcutHint, {
                          chord: "escape",
                          action: "cancel",
                        }),
                      ],
                    }),
              }),
            }),
        ],
      });
    $[92] = chord;
    $[93] = exitState;
    $[94] = selectedCustomTheme;
    $[95] = helpText_;
    $[96] = hideEscToCancel_;
    $[97] = onCustomTheme;
    $[98] = showHelpTextBelow_;
    $[99] = showIntroText_;
    $[100] = skipExitHandling_;
    $[101] = footerElement;
  } else footerElement = $[101];
  let children_2;
  if ($[102] !== content || $[103] !== reserve || $[104] !== footerElement) {
    children_2 = jsxProd_default_2(ScrollColumn, {
      reserve,
      children: [content, footerElement],
    });
    $[102] = content;
    $[103] = reserve;
    $[104] = footerElement;
    $[105] = children_2;
  } else children_2 = $[105];
  let rootElement;
  if ($[106] !== value || $[107] !== children_2) {
    rootElement = jsxProd_default(scrollViewportContext, {
      value,
      children: children_2,
    });
    $[106] = value;
    $[107] = children_2;
    $[108] = rootElement;
  } else rootElement = $[108];
  return rootElement;
}
export { ThemePicker };
