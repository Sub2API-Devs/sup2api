/**
 * components/permissions/AskUserQuestionPermissionRequest/PreviewBox.tsx
 *
 * 问题选项预览框（等宽边框绘制，超出行数显示 "N lines hidden"）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/AskUserQuestionPermissionRequest/PreviewBox.tsx
 * pieces: chunk-18hwfzwa.js (10)
 * attribution: placement 8, fingerprint 2
 */
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link, Box } from "../../../ink/components/Text.js";
import { j } from "../../../../vendor/react/cjs/react.production.js";
import { QWe } from "../../../ink/layout/node.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { useTheme } from "../../design-system/ThemeProvider.js";
import { renderMarkdownToAnsi } from "../../../utils/markdown.js";
import { wrapAnsi } from "../../../ink/wrapAnsi.js";
import { repeatString } from "../../../utils/stringUtils.js";
import { truncate as truncate_2 } from "../../../ink/wrap-text.js";
import { ELLIPSIS } from "../../../ink/styles.js";
import { Ansi } from "../../../ink/components/AnsiText.js";

//@ chunk-18hwfzwa.js:1270669-1271136 placement
function PreviewBox(props) {
  let $ = w(7),
    settings = useIsScreenReaderEnabled(),
    L;
  if ($[0] !== settings || $[1] !== props.runs) {
    let ee;
    if ($[3] !== settings)
      ((ee = (ke, Re) => {
        switch (ke.kind) {
          case "text": {
            return e(Text, { children: ke.text }, Re);
          }
          case "fileLink": {
            return settings
              ? e(Text, { children: ke.label }, Re)
              : e(Link, { url: ke.url, fallback: `${ke.label} (${ke.path})`, children: ke.label }, Re);
          }
        }
      }),
        ($[3] = settings),
        ($[4] = ee));
    else ee = $[4];
    L = props.runs.map(ee);
    (($[0] = settings), ($[1] = props.runs), ($[2] = L));
  } else L = $[2];
  let ee;
  if ($[5] !== L) ((ee = e(Text, { color: "inactive", children: L })), ($[5] = L), ($[6] = ee));
  else ee = $[6];
  return ee;
}
//@ chunk-18hwfzwa.js:1271136-1271140 placement
j();
/**
 * 问题预览框的最大长度，以及预览无法完整显示时的提示文本。
 */
//@ chunk-18hwfzwa.js:1271140-1271251 placement
var MAX_PREVIEW_LENGTH = 2000,
  PREVIEW_WITHHELD_TEXT =
    "(preview cannot be shown in full \u2014 compare the option labels and descriptions instead)";
//@ chunk-18hwfzwa.js:1271251-1271255 placement
j();
//@ chunk-18hwfzwa.js:1271255-1271287 placement
function pMo(_o) {
  return QWe(_o);
}
//@ chunk-18hwfzwa.js:1271287-1271318 placement
function fMo(cn) {
  return bunStringWidth(cn);
}
//@ chunk-18hwfzwa.js:1271318-1271476 fingerprint = BOX_CHARS (1)
var BOX_CHARS = {
  topLeft: "\u250C",
  topRight: "\u2510",
  bottomLeft: "\u2514",
  bottomRight: "\u2518",
  horizontal: "\u2500",
  vertical: "\u2502",
  teeLeft: "\u251C",
  teeRight: "\u2524",
};
//@ chunk-18hwfzwa.js:1271755-1274144 fingerprint = PreviewBoxBody (0.928)
function PreviewBoxBody(t0) {
  let $ = w(37),
    {
      content: content,
      maxLines: maxLines,
      minHeight: minHeight,
      minWidth: t1,
      maxWidth: maxWidth,
      highlight: highlight,
    } = t0,
    Be = t1 === void 0 ? 40 : t1,
    { columns: terminalWidth } = useTerminalSize(),
    [We] = useTheme(),
    ze = maxWidth ?? terminalWidth - 4,
    Xe = maxLines ?? 20,
    kt;
  if ($[0] !== content || $[1] !== highlight || $[2] !== We)
    ((kt = renderMarkdownToAnsi(content, We, highlight)),
      ($[0] = content),
      ($[1] = highlight),
      ($[2] = We),
      ($[3] = kt));
  else kt = $[3];
  let rendered = kt,
    max = Math.max(1, ze - 4),
    Ot,
    Et,
    Dt,
    Lt,
    oo,
    Xt;
  if ($[4] !== Xe || $[5] !== ze || $[6] !== minHeight || $[7] !== Be || $[8] !== rendered || $[9] !== max) {
    const mapped = rendered
      .split(
        `
`,
      )
      .map(pMo);
    let so;
    if ($[16] !== max)
      ((so = (po) =>
        bunStringWidth(po) > max
          ? wrapAnsi(po, max, { hard: !0, trim: !1 }).split(`
`)
          : po),
        ($[16] = max),
        ($[17] = so));
    else so = $[17];
    let flattened = mapped.flatMap(so);
    let co = flattened.length > Xe;
    let bo = co ? flattened.slice(0, Xe) : flattened;
    let effectiveMinHeight = Math.min(minHeight ?? 0, Xe);
    let paddingNeeded = Math.max(0, effectiveMinHeight - bo.length - (co ? 1 : 0));
    let Ro = paddingNeeded > 0 ? [...bo, ...Array(paddingNeeded).fill("")] : bo;
    let contentWidth = Math.max(Be, ...Ro.map(fMo));
    let max_2 = Math.max(4, Math.min(contentWidth + 4, ze));
    let Wo = max_2 - 4;
    const mn = max_2 - 2;
    let Cn;
    if ($[18] !== mn) ((Cn = repeatString(BOX_CHARS.horizontal, mn)), ($[18] = mn), ($[19] = Cn));
    else Cn = $[19];
    let topBorder = `${BOX_CHARS.topLeft}${Cn}${BOX_CHARS.topRight}`;
    const vo = max_2 - 2;
    let Yo;
    if ($[20] !== vo) ((Yo = repeatString(BOX_CHARS.horizontal, vo)), ($[20] = vo), ($[21] = Yo));
    else Yo = $[21];
    Et = `${BOX_CHARS.bottomLeft}${Yo}${BOX_CHARS.bottomRight}`;
    Xt = co
      ? (() => {
          let kn = flattened.length - Xe;
          let label = `${BOX_CHARS.horizontal.repeat(3)} \u2702 ${BOX_CHARS.horizontal.repeat(3)} ${kn} lines hidden `;
          let labelWidth = bunStringWidth(label);
          let fillWidth = Math.max(0, max_2 - 2 - labelWidth);
          return `${BOX_CHARS.teeLeft}${label}${BOX_CHARS.horizontal.repeat(fillWidth)}${BOX_CHARS.teeRight}`;
        })()
      : null;
    Ot = Box;
    Dt = "column";
    if ($[22] !== topBorder)
      ((Lt = e(Text, { dimColor: !0, children: topBorder })), ($[22] = topBorder), ($[23] = Lt));
    else Lt = $[23];
    let hn;
    if ($[24] !== Wo)
      ((hn = (line_0, index) => {
        let Sn = Wo > 0 ? truncate_2(line_0, Wo, "end") : null;
        let $n = Wo < 1 ? "" : Sn ? Sn.head + ELLIPSIS : line_0;
        let padding = " ".repeat(Math.max(0, Wo - bunStringWidth($n)));
        return r(
          Box,
          {
            flexDirection: "row",
            children: [
              r(Text, { dimColor: !0, children: [BOX_CHARS.vertical, " "] }),
              e(Ansi, { children: $n }),
              r(Text, { dimColor: !0, children: [padding, " ", BOX_CHARS.vertical] }),
            ],
          },
          index,
        );
      }),
        ($[24] = Wo),
        ($[25] = hn));
    else hn = $[25];
    oo = Ro.map(hn);
    (($[4] = Xe),
      ($[5] = ze),
      ($[6] = minHeight),
      ($[7] = Be),
      ($[8] = rendered),
      ($[9] = max),
      ($[10] = Ot),
      ($[11] = Et),
      ($[12] = Dt),
      ($[13] = Lt),
      ($[14] = oo),
      ($[15] = Xt));
  } else ((Ot = $[10]), (Et = $[11]), (Dt = $[12]), (Lt = $[13]), (oo = $[14]), (Xt = $[15]));
  let io;
  if ($[26] !== Xt) ((io = Xt && e(Text, { color: "warning", children: Xt })), ($[26] = Xt), ($[27] = io));
  else io = $[27];
  let so;
  if ($[28] !== Et) ((so = e(Text, { dimColor: !0, children: Et })), ($[28] = Et), ($[29] = so));
  else so = $[29];
  let mn;
  if ($[30] !== Ot || $[31] !== Dt || $[32] !== Lt || $[33] !== oo || $[34] !== io || $[35] !== so)
    ((mn = r(Ot, { flexDirection: Dt, children: [Lt, oo, io, so] })),
      ($[30] = Ot),
      ($[31] = Dt),
      ($[32] = Lt),
      ($[33] = oo),
      ($[34] = io),
      ($[35] = so),
      ($[36] = mn));
  else mn = $[36];
  return mn;
}
//@ chunk-18hwfzwa.js:1274144-1274148 placement
j();
//@ chunk-18hwfzwa.js:1274148-1274152 placement
j();

export { PreviewBoxBody, PREVIEW_WITHHELD_TEXT, PreviewBox, MAX_PREVIEW_LENGTH };
