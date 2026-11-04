/**
 * components/OutputStylePicker.tsx
 *
 * /output-style 选择器：加载内置与自定义输出样式并选择。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/OutputStylePicker.tsx
 * pieces: chunk-9h8dr0qb.js (7)
 * attribution: placement 1, layout 1, fingerprint 2, file-local 1, sole-consumer 2
 */
import {
  init_react_production,
  useState,
  suspenseTypeExport,
  use,
} from "../../vendor/react/cjs/react.production.js";
import { OUTPUT_STYLE_CONFIG, getAllOutputStylesCached } from "../constants/outputStyles.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useProject } from "../context/session.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { Dialog } from "./design-system/Dialog.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { isCustomizationDisabled } from "../utils/settings/customizationDisabled.js";
import { getSafeModeExitHint } from "../utils/envUtils.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { OrderedListWithItem } from "./CustomSelect/selectTable.js";
import { StatusIcon } from "./design-system/StatusIcon.js";

//@ chunk-9h8dr0qb.js:7565-7569 placement
init_react_production();
//@ chunk-9h8dr0qb.js:7569-7597 layout
function getConcreteOutputStyle() {
  return mapConfigsToOptions(OUTPUT_STYLE_CONFIG);
}
//@ chunk-9h8dr0qb.js:7597-7754 fingerprint (2.1.88 match: DEFAULT_OUTPUT_STYLE_DESCRIPTION, 0.529)
var DEFAULT = "Default";
var CONCISE_STYLE_DESCRIPTION = "Claude completes coding tasks efficiently and provides concise responses";
var OUTPUT_STYLE_EFFECT_NOTE = "This changes how Claude Code communicates with you";
var STYLE_ROW_HEIGHT = 24;
//@ chunk-9h8dr0qb.js:7754-7869 file-local
function mapConfigsToOptions(styles) {
  return Object.entries(styles).map(([style, config]) => ({
    label: config?.name ?? DEFAULT,
    value: style,
    description: config?.description ?? CONCISE_STYLE_DESCRIPTION,
  }));
}
//@ chunk-9h8dr0qb.js:7869-8816 fingerprint (2.1.88 match: OutputStylePicker, 0.601)
function OutputStylePicker(props) {
  let $ = useMemoCache(15);
  let { initialStyle, onComplete, onCancel, isStandaloneCommand, visibleCount } = props;
  let project = useProject();
  let { storageV5 } = useTheme_2();
  let loadOptions;
  if ($[0] !== project.cwd || $[1] !== storageV5) {
    loadOptions = () =>
      getAllOutputStylesCached(project.cwd, storageV5)
        .then(mapConfigsToOptions)
        .catch(getConcreteOutputStyle);
    $[0] = project.cwd;
    $[1] = storageV5;
    $[2] = loadOptions;
  } else loadOptions = $[2];
  let [optionsPromise] = useState(loadOptions);
  const hideInputGuide = !isStandaloneCommand;
  const hideBorder = !isStandaloneCommand;
  let boxElement;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    boxElement = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: OUTPUT_STYLE_EFFECT_NOTE,
      }),
    });
    $[3] = boxElement;
  } else boxElement = $[3];
  let fallback;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    fallback = jsxProd_default(Text, {
      dimColor: true,
      children: "Loading output styles\u2026",
    });
    $[4] = fallback;
  } else fallback = $[4];
  let children;
  if ($[5] !== initialStyle || $[6] !== onComplete || $[7] !== optionsPromise || $[8] !== visibleCount) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        boxElement,
        jsxProd_default(suspenseTypeExport, {
          fallback,
          children: jsxProd_default(OutputStyleList, {
            styleOptionsPromise: optionsPromise,
            initialStyle,
            onComplete,
            visibleCount,
            isRedesign: false,
          }),
        }),
      ],
    });
    $[5] = initialStyle;
    $[6] = onComplete;
    $[7] = optionsPromise;
    $[8] = visibleCount;
    $[9] = children;
  } else children = $[9];
  let dialogElement;
  if ($[10] !== onCancel || $[11] !== hideInputGuide || $[12] !== hideBorder || $[13] !== children) {
    dialogElement = jsxProd_default(Dialog, {
      title: "Preferred output style",
      subtitle: undefined,
      onCancel,
      hideInputGuide,
      hideBorder,
      children,
    });
    $[10] = onCancel;
    $[11] = hideInputGuide;
    $[12] = hideBorder;
    $[13] = children;
    $[14] = dialogElement;
  } else dialogElement = $[14];
  return dialogElement;
}
//@ chunk-9h8dr0qb.js:8816-10273 sole-consumer
/**
 * /output-style 选项列表：等待样式选项加载，标出当前样式；安全模式下已保存的自定义样式被禁用时给出提示；宽屏 redesign 模式下描述放在 meta 列。
 */
function OutputStyleList(props) {
  let $ = useMemoCache(31);
  let { styleOptionsPromise, initialStyle, onComplete, visibleCount, isRedesign } = props;
  let optionsResult = use(styleOptionsPromise);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let memoCache;
  if ($[0] !== initialStyle || $[1] !== optionsResult) {
    memoCache =
      isCustomizationDisabled("outputStyles") && !optionsResult.some((state) => state.value === initialStyle);
    $[0] = initialStyle;
    $[1] = optionsResult;
    $[2] = memoCache;
  } else memoCache = $[2];
  let memoCacheAlias = memoCache;
  let initialHint;
  if ($[3] !== initialStyle || $[4] !== memoCacheAlias) {
    initialHint =
      memoCacheAlias &&
      jsxProd_default(Text, {
        dimColor: true,
        children: `Your saved output style "${initialStyle}" is a custom style disabled in safe mode \u2014 ${getSafeModeExitHint()} to use it; selecting a style here replaces it`,
      });
    $[3] = initialStyle;
    $[4] = memoCacheAlias;
    $[5] = initialHint;
  } else initialHint = $[5];
  let initialIndex;
  if ($[6] !== initialStyle || $[7] !== optionsResult) {
    let matchValue;
    if ($[9] !== initialStyle) {
      matchValue = (state) => state.value === initialStyle;
      $[9] = initialStyle;
      $[10] = matchValue;
    } else matchValue = $[10];
    initialIndex = optionsResult.findIndex(matchValue);
    $[6] = initialStyle;
    $[7] = optionsResult;
    $[8] = initialIndex;
  } else initialIndex = $[8];
  const defaultFocusIndex = Math.max(0, initialIndex);
  let onSelect;
  if ($[11] !== onComplete || $[12] !== optionsResult) {
    onSelect = (selectedIndex) => {
      let selectedValue = optionsResult[selectedIndex]?.value;
      if (selectedValue !== undefined) onComplete(selectedValue);
    };
    $[11] = onComplete;
    $[12] = optionsResult;
    $[13] = onSelect;
  } else onSelect = $[13];
  let children;
  if (
    $[14] !== initialStyle ||
    $[15] !== isRedesign ||
    $[16] !== isScreenReaderEnabled ||
    $[17] !== optionsResult
  ) {
    let renderOption;
    if ($[19] !== initialStyle || $[20] !== isRedesign || $[21] !== isScreenReaderEnabled) {
      renderOption = (option) => {
        let isCompactRow =
          isRedesign && !isScreenReaderEnabled && bunStringWidth(option.label) <= STYLE_ROW_HEIGHT;
        return jsxProd_default(
          OrderedListWithItem.Item,
          {
            label: option.label,
            icon:
              option.value === initialStyle
                ? jsxProd_default(StatusIcon, {
                    status: "success",
                    "aria-label": "current:",
                  })
                : undefined,
            meta: isCompactRow ? [option.description] : undefined,
            description: isCompactRow ? undefined : option.description,
          },
          option.value,
        );
      };
      $[19] = initialStyle;
      $[20] = isRedesign;
      $[21] = isScreenReaderEnabled;
      $[22] = renderOption;
    } else renderOption = $[22];
    children = optionsResult.map(renderOption);
    $[14] = initialStyle;
    $[15] = isRedesign;
    $[16] = isScreenReaderEnabled;
    $[17] = optionsResult;
    $[18] = children;
  } else children = $[18];
  let orderedListWithItemElement;
  if ($[23] !== defaultFocusIndex || $[24] !== onSelect || $[25] !== children || $[26] !== visibleCount) {
    orderedListWithItemElement = jsxProd_default(OrderedListWithItem, {
      visibleCount,
      defaultFocusIndex,
      onSelect,
      children,
    });
    $[23] = defaultFocusIndex;
    $[24] = onSelect;
    $[25] = children;
    $[26] = visibleCount;
    $[27] = orderedListWithItemElement;
  } else orderedListWithItemElement = $[27];
  let fragmentElement;
  if ($[28] !== initialHint || $[29] !== orderedListWithItemElement) {
    fragmentElement = jsxProd_default_2(Fragment, {
      children: [initialHint, orderedListWithItemElement],
    });
    $[28] = initialHint;
    $[29] = orderedListWithItemElement;
    $[30] = fragmentElement;
  } else fragmentElement = $[30];
  return fragmentElement;
}
//@ chunk-9h8dr0qb.js:10273-10277 sole-consumer
init_react_production();
export { OutputStylePicker };
