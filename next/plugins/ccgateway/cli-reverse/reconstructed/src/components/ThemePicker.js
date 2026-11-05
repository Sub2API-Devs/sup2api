/**
 * components/ThemePicker.tsx
 *
 * /theme 主题选择器：预览 diff 着色，ctrl+t 切换语法高亮，写入 userSettings。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ThemePicker.tsx
 * pieces: chunk-d5bmvsqk.js (5)
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
import { stableEmptyObject } from "../utils/stableEmptyObject.js";

//@ chunk-d5bmvsqk.js:1148-1152 placement
init_react_production();
//@ chunk-d5bmvsqk.js:1152-1214 fingerprint (2.1.88 match: _temp, 1)
function selectSettingsSyntaxHighlightingDisabled(s) {
  return s.settings.syntaxHighlightingDisabled;
}
//@ chunk-d5bmvsqk.js:1214-1333 layout
function toCustomThemeOption(theme) {
  return {
    label: theme.name,
    origin: theme.source === "user" ? "custom" : `from ${theme.source.plugin}`,
    value: customThemeRef(theme.slug),
  };
}
//@ chunk-d5bmvsqk.js:1333-1425 layout
var NEW_CUSTOM_THEME = "__new_custom_theme__";
var TEXT_STYLE_INTRO = "Choose the text style that looks best with your terminal";
//@ chunk-d5bmvsqk.js:1425-7997 fingerprint (2.1.88 match: ThemePicker, 0.721)
/**
 * 主题选择器：列出 dark/light/daltonized/ansi 等主题，选中即预览（含 diff 示例），ctrl+t 切换语法高亮，确定后写入 userSettings。
 */
function ThemePicker(props) {
  let $ = useMemoCache(98);
  let {
    onThemeSelect,
    showIntroText,
    helpText,
    hideEscToCancel,
    isTitledByHost,
    onCancel: onCancelProp,
    onCustomTheme,
  } = props;
  let showIntroText_ = showIntroText === undefined ? false : showIntroText;
  let helpText_ = helpText === undefined ? "" : helpText;
  let hideEscToCancel_ = hideEscToCancel === undefined ? false : hideEscToCancel;
  let hideEscToCancel__2 = isTitledByHost === undefined ? false : isTitledByHost;
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
    cleanupDeps = () => () => {
      if (commitTokenRef.current === undefined) cancelPreview();
    };
    cancelOnUnmount = [cancelPreview];
    $[5] = cancelPreview;
    $[6] = cleanupDeps;
    $[7] = cancelOnUnmount;
  } else {
    cleanupDeps = $[6];
    cancelOnUnmount = $[7];
  }
  useEffect(cleanupDeps, cancelOnUnmount);
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
  let skipExitHandling_ = handleCancel;
  let selectKeybindingOptions;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    selectKeybindingOptions = {
      context: "Select",
    };
    $[16] = selectKeybindingOptions;
  } else selectKeybindingOptions = $[16];
  useKeybinding("select:cancel", skipExitHandling_, selectKeybindingOptions);
  let exitState = useGlobalExitKeybindings(skipExitHandling_);
  let { customThemes } = useCustomThemes();
  let autoOption;
  let darkOption;
  let lightOption;
  let darkDaltonizedOption;
  let lightDaltonizedOption;
  let darkAnsiOption;
  let lightAnsiOption;
  if ($[17] === MEMO_CACHE_SENTINEL) {
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
    $[17] = autoOption;
    $[18] = darkOption;
    $[19] = lightOption;
    $[20] = darkDaltonizedOption;
    $[21] = lightDaltonizedOption;
    $[22] = darkAnsiOption;
    $[23] = lightAnsiOption;
  } else {
    autoOption = $[17];
    darkOption = $[18];
    lightOption = $[19];
    darkDaltonizedOption = $[20];
    lightDaltonizedOption = $[21];
    darkAnsiOption = $[22];
    lightAnsiOption = $[23];
  }
  let themeOptions;
  if ($[24] !== customThemes || $[25] !== onCustomTheme) {
    const mapped = customThemes.map(toCustomThemeOption);
    let newCustomOptionList;
    if ($[27] !== onCustomTheme) {
      newCustomOptionList = onCustomTheme
        ? [
            {
              label: "New custom theme\u2026",
              value: NEW_CUSTOM_THEME,
            },
          ]
        : [];
      $[27] = onCustomTheme;
      $[28] = newCustomOptionList;
    } else newCustomOptionList = $[28];
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
    $[24] = customThemes;
    $[25] = onCustomTheme;
    $[26] = themeOptions;
  } else themeOptions = $[26];
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
  if ($[29] !== focusedValue) {
    customRef = parseCustomThemeRef(focusedValue);
    $[29] = focusedValue;
    $[30] = customRef;
  } else customRef = $[30];
  let customRefSlug = customRef;
  let customTheme;
  if ($[31] !== customThemes || $[32] !== customRefSlug) {
    customTheme = customRefSlug
      ? customThemes.find((customTheme) => customTheme.slug === customRefSlug)
      : undefined;
    $[31] = customThemes;
    $[32] = customRefSlug;
    $[33] = customTheme;
  } else customTheme = $[33];
  let selectedCustomTheme = customTheme;
  let chord = useShortcutDisplay("theme:editCustom", "ThemePicker", "ctrl+e");
  let editCustomTheme;
  if ($[34] !== selectedCustomTheme || $[35] !== runWithCommit || $[36] !== onCustomTheme) {
    editCustomTheme = () => {
      if (selectedCustomTheme && onCustomTheme && commitTokenRef.current === undefined)
        runWithCommit(onCustomTheme(selectedCustomTheme));
    };
    $[34] = selectedCustomTheme;
    $[35] = runWithCommit;
    $[36] = onCustomTheme;
    $[37] = editCustomTheme;
  } else editCustomTheme = $[37];
  let editCustomKeybindingOptions;
  if ($[38] === MEMO_CACHE_SENTINEL) {
    editCustomKeybindingOptions = {
      context: "ThemePicker",
    };
    $[38] = editCustomKeybindingOptions;
  } else editCustomKeybindingOptions = $[38];
  useKeybinding("theme:editCustom", editCustomTheme, editCustomKeybindingOptions);
  let scrollColumnContext = useScrollColumnContext();
  let scrollViewportValue = useContext(scrollViewportContext);
  let containerRef = useRef(null);
  let measureTop;
  if ($[39] !== scrollColumnContext) {
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
    $[39] = scrollColumnContext;
    $[40] = measureTop;
  } else measureTop = $[40];
  let measured = useMeasured(measureTop);
  let reservedTopRows = showIntroText_ ? 0 : measured + (hideEscToCancel_ ? 1 : 0);
  let titleElement;
  if ($[41] !== helpText_ || $[42] !== hideEscToCancel__2 || $[43] !== showIntroText_) {
    titleElement = hideEscToCancel__2
      ? helpText_ &&
        jsxProd_default(Text, {
          dimColor: true,
          children: helpText_,
        })
      : jsxProd_default_2(Fragment, {
          children: [
            showIntroText_
              ? jsxProd_default(Text, {
                  children: "Let's get started.",
                })
              : jsxProd_default(Text, {
                  bold: true,
                  color: "permission",
                  children: "Theme",
                }),
            jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [
                jsxProd_default(Text, {
                  bold: true,
                  children: TEXT_STYLE_INTRO,
                }),
                helpText_ &&
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: helpText_,
                  }),
              ],
            }),
          ],
        });
    $[41] = helpText_;
    $[42] = hideEscToCancel__2;
    $[43] = showIntroText_;
    $[44] = titleElement;
  } else titleElement = $[44];
  const listKey = isInitialized ? "on-saved-theme" : "on-first-theme";
  const defaultFocusIndex = Math.max(0, index);
  let onFocus;
  if ($[45] !== cancelPreview || $[46] !== focusedValue || $[47] !== setPreviewTheme || $[48] !== options) {
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
    $[45] = cancelPreview;
    $[46] = focusedValue;
    $[47] = setPreviewTheme;
    $[48] = options;
    $[49] = onFocus;
  } else onFocus = $[49];
  let onSelect;
  if (
    $[50] !== cancelPreview ||
    $[51] !== runWithCommit ||
    $[52] !== onCustomTheme ||
    $[53] !== onThemeSelect ||
    $[54] !== options
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
    $[50] = cancelPreview;
    $[51] = runWithCommit;
    $[52] = onCustomTheme;
    $[53] = onThemeSelect;
    $[54] = options;
    $[55] = onSelect;
  } else onSelect = $[55];
  let children;
  if ($[56] !== options || $[57] !== themeSetting) {
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
    $[56] = options;
    $[57] = themeSetting;
    $[58] = children;
  } else children = $[58];
  let listElement;
  if (
    $[59] !== listKey ||
    $[60] !== defaultFocusIndex ||
    $[61] !== onFocus ||
    $[62] !== onSelect ||
    $[63] !== children
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
    $[59] = listKey;
    $[60] = defaultFocusIndex;
    $[61] = onFocus;
    $[62] = onSelect;
    $[63] = children;
    $[64] = listElement;
  } else listElement = $[64];
  let pickerElement;
  if ($[65] !== titleElement || $[66] !== listElement) {
    pickerElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [titleElement, listElement],
    });
    $[65] = titleElement;
    $[66] = listElement;
    $[67] = pickerElement;
  } else pickerElement = $[67];
  let patch;
  if ($[68] === MEMO_CACHE_SENTINEL) {
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
    $[68] = patch;
  } else patch = $[68];
  const width = columns - 6;
  let previewElement;
  if ($[69] !== width) {
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
    $[69] = width;
    $[70] = previewElement;
  } else previewElement = $[70];
  const syntaxStatusText =
    colorModuleUnavailableReason_2 === "env"
      ? `Syntax highlighting disabled (via CLAUDE_CODE_SYNTAX_HIGHLIGHT=${env.CLAUDE_CODE_SYNTAX_HIGHLIGHT})`
      : syntaxHighlightingDisabled
        ? `Syntax highlighting disabled (${syntaxToggleShortcut} to enable)`
        : syntaxTheme_2
          ? `Syntax theme: ${syntaxTheme_2.theme}${syntaxTheme_2.source ? ` (from ${syntaxTheme_2.source})` : ""} (${syntaxToggleShortcut} to disable)`
          : `Syntax highlighting enabled (${syntaxToggleShortcut} to disable)`;
  let syntaxStatusElement;
  if ($[71] !== syntaxStatusText) {
    syntaxStatusElement = jsxProd_default_2(Text, {
      dimColor: true,
      children: [" ", syntaxStatusText],
    });
    $[71] = syntaxStatusText;
    $[72] = syntaxStatusElement;
  } else syntaxStatusElement = $[72];
  let previewSection;
  if ($[73] !== previewElement || $[74] !== syntaxStatusElement) {
    previewSection = jsxProd_default_2(Box, {
      flexDirection: "column",
      width: "100%",
      children: [previewElement, syntaxStatusElement],
    });
    $[73] = previewElement;
    $[74] = syntaxStatusElement;
    $[75] = previewSection;
  } else previewSection = $[75];
  let scrollContent;
  if ($[76] !== pickerElement || $[77] !== previewSection) {
    scrollContent = jsxProd_default_2(Box, {
      ref: containerRef,
      flexDirection: "column",
      gap: 1,
      children: [pickerElement, previewSection],
    });
    $[76] = pickerElement;
    $[77] = previewSection;
    $[78] = scrollContent;
  } else scrollContent = $[78];
  let content = scrollContent;
  let value;
  if ($[79] !== scrollColumnContext?.rows || $[80] !== reservedTopRows || $[81] !== scrollViewportValue) {
    value = scrollViewportValue && {
      ...scrollViewportValue,
      rows: Math.max(0, (scrollColumnContext?.rows ?? scrollViewportValue.rows) - reservedTopRows),
    };
    $[79] = scrollColumnContext?.rows;
    $[80] = reservedTopRows;
    $[81] = scrollViewportValue;
    $[82] = value;
  } else value = $[82];
  const reserve = (scrollColumnContext?.reserve ?? SCROLL_COLUMN_MIN_ROWS) + reservedTopRows;
  let footerElement;
  if (
    $[83] !== chord ||
    $[84] !== exitState ||
    $[85] !== selectedCustomTheme ||
    $[86] !== hideEscToCancel_ ||
    $[87] !== hideEscToCancel__2 ||
    $[88] !== onCustomTheme ||
    $[89] !== showIntroText_
  ) {
    footerElement =
      !showIntroText_ &&
      jsxProd_default(Box, {
        marginTop: 1,
        children:
          !hideEscToCancel_ &&
          jsxProd_default(Box, {
            children: jsxProd_default(Text, {
              dimColor: true,
              italic: true,
              children: exitState.pending
                ? jsxProd_default_2(Fragment, {
                    children: ["Press ", exitState.keyName, " again to cancel"],
                  })
                : jsxProd_default_2(Byline, {
                    children: [
                      jsxProd_default(KeyboardShortcutHint, {
                        chord: "enter",
                        action: "select",
                        ...stableEmptyObject(hideEscToCancel__2),
                      }),
                      selectedCustomTheme &&
                        onCustomTheme &&
                        jsxProd_default(KeyboardShortcutHint, {
                          chord,
                          action: "edit",
                          ...stableEmptyObject(hideEscToCancel__2),
                        }),
                      jsxProd_default(KeyboardShortcutHint, {
                        chord: "escape",
                        action: "cancel",
                        ...stableEmptyObject(hideEscToCancel__2),
                      }),
                    ],
                  }),
            }),
          }),
      });
    $[83] = chord;
    $[84] = exitState;
    $[85] = selectedCustomTheme;
    $[86] = hideEscToCancel_;
    $[87] = hideEscToCancel__2;
    $[88] = onCustomTheme;
    $[89] = showIntroText_;
    $[90] = footerElement;
  } else footerElement = $[90];
  let children_2;
  if ($[91] !== content || $[92] !== reserve || $[93] !== footerElement) {
    children_2 = jsxProd_default_2(ScrollColumn, {
      reserve,
      children: [content, footerElement],
    });
    $[91] = content;
    $[92] = reserve;
    $[93] = footerElement;
    $[94] = children_2;
  } else children_2 = $[94];
  let rootElement;
  if ($[95] !== value || $[96] !== children_2) {
    rootElement = jsxProd_default(scrollViewportContext, {
      value,
      children: children_2,
    });
    $[95] = value;
    $[96] = children_2;
    $[97] = rootElement;
  } else rootElement = $[97];
  return rootElement;
}
export { ThemePicker };
