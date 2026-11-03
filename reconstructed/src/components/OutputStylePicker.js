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
import { j, y, fo, Qr } from "../../vendor/react/cjs/react.production.js";
import { OUTPUT_STYLE_CONFIG, getAllOutputStylesCached } from "../constants/outputStyles.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useProject } from "../context/session.js";
import { Me } from "./design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { Dialog } from "./design-system/Dialog.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { isCustomizationDisabled } from "../utils/settings/customizationDisabled.js";
import { getSafeModeExitHint } from "../utils/envUtils.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { OrderedListWithItem } from "./CustomSelect/selectTable.js";
import { StatusIcon } from "./design-system/StatusIcon.js";

//@ chunk-9h8dr0qb.js:7565-7569 placement
j();
//@ chunk-9h8dr0qb.js:7569-7597 layout
function Qc() {
  return mapConfigsToOptions(OUTPUT_STYLE_CONFIG);
}
//@ chunk-9h8dr0qb.js:7597-7754 fingerprint = DEFAULT_OUTPUT_STYLE_DESCRIPTION (0.529)
var DEFAULT = "Default",
  Ic = "Claude completes coding tasks efficiently and provides concise responses",
  ma = "This changes how Claude Code communicates with you",
  fa = 24;
//@ chunk-9h8dr0qb.js:7754-7869 file-local
function mapConfigsToOptions(styles) {
  return Object.entries(styles).map(([u, p]) => ({
    label: p?.name ?? DEFAULT,
    value: u,
    description: p?.description ?? Ic,
  }));
}
//@ chunk-9h8dr0qb.js:7869-8816 fingerprint = OutputStylePicker (0.601)
function OutputStylePicker(t0) {
  let $ = w(15),
    {
      initialStyle: initialStyle,
      onComplete: onComplete,
      onCancel: onCancel,
      isStandaloneCommand: isStandaloneCommand,
      visibleCount: visibleCount,
    } = t0,
    T = useProject(),
    { storageV5: storageV5 } = Me(),
    F;
  if ($[0] !== T.cwd || $[1] !== storageV5)
    ((F = () => getAllOutputStylesCached(T.cwd, storageV5).then(mapConfigsToOptions).catch(Qc)),
      ($[0] = T.cwd),
      ($[1] = storageV5),
      ($[2] = F));
  else F = $[2];
  let [U] = y(F);
  const t5 = !isStandaloneCommand,
    t6 = !isStandaloneCommand;
  let B;
  if ($[3] === MEMO_CACHE_SENTINEL)
    ((B = e(Box, { marginTop: 1, children: e(Text, { dimColor: !0, children: ma }) })), ($[3] = B));
  else B = $[3];
  let H;
  if ($[4] === MEMO_CACHE_SENTINEL)
    ((H = e(Text, { dimColor: !0, children: "Loading output styles\u2026" })), ($[4] = H));
  else H = $[4];
  let K;
  if ($[5] !== initialStyle || $[6] !== onComplete || $[7] !== U || $[8] !== visibleCount)
    ((K = r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        B,
        e(fo, {
          fallback: H,
          children: e(OutputStyleList, {
            styleOptionsPromise: U,
            initialStyle: initialStyle,
            onComplete: onComplete,
            visibleCount: visibleCount,
            isRedesign: !1,
          }),
        }),
      ],
    })),
      ($[5] = initialStyle),
      ($[6] = onComplete),
      ($[7] = U),
      ($[8] = visibleCount),
      ($[9] = K));
  else K = $[9];
  let ee;
  if ($[10] !== onCancel || $[11] !== t5 || $[12] !== t6 || $[13] !== K)
    ((ee = e(Dialog, {
      title: "Preferred output style",
      subtitle: void 0,
      onCancel: onCancel,
      hideInputGuide: t5,
      hideBorder: t6,
      children: K,
    })),
      ($[10] = onCancel),
      ($[11] = t5),
      ($[12] = t6),
      ($[13] = K),
      ($[14] = ee));
  else ee = $[14];
  return ee;
}
/**
 * /output-style 选项列表：等待样式选项加载，标出当前样式；安全模式下已保存的自定义样式被禁用时给出提示；宽屏 redesign 模式下描述放在 meta 列。
 */
//@ chunk-9h8dr0qb.js:8816-10273 sole-consumer
function OutputStyleList(props) {
  let $ = w(31),
    {
      styleOptionsPromise: styleOptionsPromise,
      initialStyle: initialStyle,
      onComplete: onComplete,
      visibleCount: visibleCount,
      isRedesign: isRedesign,
    } = props,
    T = Qr(styleOptionsPromise),
    A = useIsScreenReaderEnabled(),
    F;
  if ($[0] !== initialStyle || $[1] !== T)
    ((F = isCustomizationDisabled("outputStyles") && !T.some((U) => U.value === initialStyle)),
      ($[0] = initialStyle),
      ($[1] = T),
      ($[2] = F));
  else F = $[2];
  let W = F,
    M;
  if ($[3] !== initialStyle || $[4] !== W)
    ((M =
      W &&
      e(Text, {
        dimColor: !0,
        children: `Your saved output style "${initialStyle}" is a custom style disabled in safe mode \u2014 ${getSafeModeExitHint()} to use it; selecting a style here replaces it`,
      })),
      ($[3] = initialStyle),
      ($[4] = W),
      ($[5] = M));
  else M = $[5];
  let B;
  if ($[6] !== initialStyle || $[7] !== T) {
    let H;
    if ($[9] !== initialStyle) ((H = (K) => K.value === initialStyle), ($[9] = initialStyle), ($[10] = H));
    else H = $[10];
    B = T.findIndex(H);
    (($[6] = initialStyle), ($[7] = T), ($[8] = B));
  } else B = $[8];
  const max = Math.max(0, B);
  let ee;
  if ($[11] !== onComplete || $[12] !== T)
    ((ee = (ne) => {
      let V = T[ne]?.value;
      if (V !== void 0) onComplete(V);
    }),
      ($[11] = onComplete),
      ($[12] = T),
      ($[13] = ee));
  else ee = $[13];
  let L;
  if ($[14] !== initialStyle || $[15] !== isRedesign || $[16] !== A || $[17] !== T) {
    let J;
    if ($[19] !== initialStyle || $[20] !== isRedesign || $[21] !== A)
      ((J = (ae) => {
        let me = isRedesign && !A && bunStringWidth(ae.label) <= fa;
        return e(
          OrderedListWithItem.Item,
          {
            label: ae.label,
            icon:
              ae.value === initialStyle
                ? e(StatusIcon, { status: "success", "aria-label": "current:" })
                : void 0,
            meta: me ? [ae.description] : void 0,
            description: me ? void 0 : ae.description,
          },
          ae.value,
        );
      }),
        ($[19] = initialStyle),
        ($[20] = isRedesign),
        ($[21] = A),
        ($[22] = J));
    else J = $[22];
    L = T.map(J);
    (($[14] = initialStyle), ($[15] = isRedesign), ($[16] = A), ($[17] = T), ($[18] = L));
  } else L = $[18];
  let J;
  if ($[23] !== max || $[24] !== ee || $[25] !== L || $[26] !== visibleCount)
    ((J = e(OrderedListWithItem, {
      visibleCount: visibleCount,
      defaultFocusIndex: max,
      onSelect: ee,
      children: L,
    })),
      ($[23] = max),
      ($[24] = ee),
      ($[25] = L),
      ($[26] = visibleCount),
      ($[27] = J));
  else J = $[27];
  let fe;
  if ($[28] !== M || $[29] !== J)
    ((fe = r(Fragment, { children: [M, J] })), ($[28] = M), ($[29] = J), ($[30] = fe));
  else fe = $[30];
  return fe;
}
//@ chunk-9h8dr0qb.js:10273-10277 sole-consumer
j();

export { OutputStylePicker };
