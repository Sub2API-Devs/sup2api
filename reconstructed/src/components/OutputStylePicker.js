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
import { init_react_production, y, fo, Qr } from "../../vendor/react/cjs/react.production.js";
import { OUTPUT_STYLE_CONFIG, getAllOutputStylesCached } from "../constants/outputStyles.js";
import { w } from "../../vendor/react/compiler-runtime.js";
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
//@ chunk-9h8dr0qb.js:7597-7754 fingerprint = DEFAULT_OUTPUT_STYLE_DESCRIPTION (0.529)
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
//@ chunk-9h8dr0qb.js:7869-8816 fingerprint = OutputStylePicker (0.601)
function OutputStylePicker(props) {
  let $ = w(15);
  let { initialStyle, onComplete, onCancel, isStandaloneCommand, visibleCount } = props;
  let project = useProject();
  let { storageV5 } = useTheme_2();
  let F;
  if ($[0] !== project.cwd || $[1] !== storageV5) {
    F = () =>
      getAllOutputStylesCached(project.cwd, storageV5)
        .then(mapConfigsToOptions)
        .catch(getConcreteOutputStyle);
    $[0] = project.cwd;
    $[1] = storageV5;
    $[2] = F;
  } else F = $[2];
  let [U] = y(F);
  const hideInputGuide = !isStandaloneCommand;
  const hideBorder = !isStandaloneCommand;
  let B;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    B = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: OUTPUT_STYLE_EFFECT_NOTE,
      }),
    });
    $[3] = B;
  } else B = $[3];
  let fallback;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    fallback = jsxProd_default(Text, {
      dimColor: true,
      children: "Loading output styles\u2026",
    });
    $[4] = fallback;
  } else fallback = $[4];
  let children;
  if ($[5] !== initialStyle || $[6] !== onComplete || $[7] !== U || $[8] !== visibleCount) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        B,
        jsxProd_default(fo, {
          fallback,
          children: jsxProd_default(OutputStyleList, {
            styleOptionsPromise: U,
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
    $[7] = U;
    $[8] = visibleCount;
    $[9] = children;
  } else children = $[9];
  let ee;
  if ($[10] !== onCancel || $[11] !== hideInputGuide || $[12] !== hideBorder || $[13] !== children) {
    ee = jsxProd_default(Dialog, {
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
    $[14] = ee;
  } else ee = $[14];
  return ee;
}
//@ chunk-9h8dr0qb.js:8816-10273 sole-consumer
/**
 * /output-style 选项列表：等待样式选项加载，标出当前样式；安全模式下已保存的自定义样式被禁用时给出提示；宽屏 redesign 模式下描述放在 meta 列。
 */
function OutputStyleList(props) {
  let $ = w(31);
  let { styleOptionsPromise, initialStyle, onComplete, visibleCount, isRedesign } = props;
  let T = Qr(styleOptionsPromise);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let F;
  if ($[0] !== initialStyle || $[1] !== T) {
    F = isCustomizationDisabled("outputStyles") && !T.some((U) => U.value === initialStyle);
    $[0] = initialStyle;
    $[1] = T;
    $[2] = F;
  } else F = $[2];
  let W = F;
  let M;
  if ($[3] !== initialStyle || $[4] !== W) {
    M =
      W &&
      jsxProd_default(Text, {
        dimColor: true,
        children: `Your saved output style "${initialStyle}" is a custom style disabled in safe mode \u2014 ${getSafeModeExitHint()} to use it; selecting a style here replaces it`,
      });
    $[3] = initialStyle;
    $[4] = W;
    $[5] = M;
  } else M = $[5];
  let B;
  if ($[6] !== initialStyle || $[7] !== T) {
    let H;
    if ($[9] !== initialStyle) {
      H = (K) => K.value === initialStyle;
      $[9] = initialStyle;
      $[10] = H;
    } else H = $[10];
    B = T.findIndex(H);
    $[6] = initialStyle;
    $[7] = T;
    $[8] = B;
  } else B = $[8];
  const defaultFocusIndex = Math.max(0, B);
  let onSelect;
  if ($[11] !== onComplete || $[12] !== T) {
    onSelect = (ne) => {
      let V = T[ne]?.value;
      if (V !== undefined) onComplete(V);
    };
    $[11] = onComplete;
    $[12] = T;
    $[13] = onSelect;
  } else onSelect = $[13];
  let children;
  if ($[14] !== initialStyle || $[15] !== isRedesign || $[16] !== isScreenReaderEnabled || $[17] !== T) {
    let J;
    if ($[19] !== initialStyle || $[20] !== isRedesign || $[21] !== isScreenReaderEnabled) {
      J = (ae) => {
        let me = isRedesign && !isScreenReaderEnabled && bunStringWidth(ae.label) <= STYLE_ROW_HEIGHT;
        return jsxProd_default(
          OrderedListWithItem.Item,
          {
            label: ae.label,
            icon:
              ae.value === initialStyle
                ? jsxProd_default(StatusIcon, {
                    status: "success",
                    "aria-label": "current:",
                  })
                : undefined,
            meta: me ? [ae.description] : undefined,
            description: me ? undefined : ae.description,
          },
          ae.value,
        );
      };
      $[19] = initialStyle;
      $[20] = isRedesign;
      $[21] = isScreenReaderEnabled;
      $[22] = J;
    } else J = $[22];
    children = T.map(J);
    $[14] = initialStyle;
    $[15] = isRedesign;
    $[16] = isScreenReaderEnabled;
    $[17] = T;
    $[18] = children;
  } else children = $[18];
  let J;
  if ($[23] !== defaultFocusIndex || $[24] !== onSelect || $[25] !== children || $[26] !== visibleCount) {
    J = jsxProd_default(OrderedListWithItem, {
      visibleCount,
      defaultFocusIndex,
      onSelect,
      children,
    });
    $[23] = defaultFocusIndex;
    $[24] = onSelect;
    $[25] = children;
    $[26] = visibleCount;
    $[27] = J;
  } else J = $[27];
  let fe;
  if ($[28] !== M || $[29] !== J) {
    fe = jsxProd_default_2(Fragment, {
      children: [M, J],
    });
    $[28] = M;
    $[29] = J;
    $[30] = fe;
  } else fe = $[30];
  return fe;
}
//@ chunk-9h8dr0qb.js:10273-10277 sole-consumer
init_react_production();
export { OutputStylePicker };
