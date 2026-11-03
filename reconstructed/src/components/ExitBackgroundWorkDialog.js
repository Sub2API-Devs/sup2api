/**
 * components/ExitBackgroundWorkDialog.tsx
 *
 * 2.1.316 新增。退出时仍有后台工作的确认对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: placement 4
 */
import { j } from "../../vendor/react/cjs/react.production.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { logEvent } from "../services/analytics/index.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useScrollViewportSize, Tl } from "./ScrollViewportContext.js";
import { isFullscreenActive } from "../utils/fullscreen.js";
import { Dialog } from "./design-system/Dialog.js";
import { OverflowHint } from "./CtrlOToExpand.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { ModelSelector } from "./agents/ModelSelector.js";

//@ chunk-18hwfzwa.js:1690353-1690357 placement
j();
//@ chunk-18hwfzwa.js:1690357-1690522 placement
function renderBackgroundWorkItem(bn, Go) {
  return r(
    Box,
    {
      flexDirection: "row",
      children: [
        e(Text, { bold: !0, children: bn.label }),
        bn.detail ? r(Text, { dimColor: !0, children: [" \xB7 ", bn.detail] }) : null,
      ],
    },
    Go,
  );
}
//@ chunk-18hwfzwa.js:1690522-1692920 placement
function ExitBackgroundWorkDialog(h) {
  let $ = w(52),
    { items: items, onExit: onExit, onCancel: onCancel, onBackground: onBackground } = h,
    Re;
  if ($[0] !== items.length)
    ((Re = function He(Be) {
      logEvent("tengu_exit_background_work_prompt", {
        item_count: items.length,
        chose_exit: Be === "exit",
        chose_background: Be === "background",
      });
    }),
      ($[0] = items.length),
      ($[1] = Re));
  else Re = $[1];
  let He = Re,
    We;
  if ($[2] !== He || $[3] !== onBackground || $[4] !== onCancel || $[5] !== onExit)
    ((We = function Xe(ze) {
      switch ((He(ze), ze)) {
        case "exit": {
          return onExit();
        }
        case "background": {
          return onBackground?.();
        }
        case "stay": {
          return onCancel();
        }
      }
    }),
      ($[2] = He),
      ($[3] = onBackground),
      ($[4] = onCancel),
      ($[5] = onExit),
      ($[6] = We));
  else We = $[6];
  let Xe = We,
    rt;
  if ($[7] !== He || $[8] !== onCancel)
    ((rt = function kt() {
      (He("stay"), onCancel());
    }),
      ($[7] = He),
      ($[8] = onCancel),
      ($[9] = rt));
  else rt = $[9];
  let kt = rt,
    At = useTerminalSize(),
    { rows: rows } = useScrollViewportSize(At),
    Ot = Tl(),
    Et;
  if ($[10] !== Ot || $[11] !== rows)
    ((Et = !Ot && isFullscreenActive() ? Math.floor(rows / 2) : rows),
      ($[10] = Ot),
      ($[11] = rows),
      ($[12] = Et));
  else Et = $[12];
  let Dt = Et,
    Lt = (onBackground ? 13 : 12) - 0,
    max = Math.max(1, Dt - Lt),
    Xt,
    io,
    so,
    po,
    ao,
    co,
    bo,
    Ao,
    Bo,
    Ro;
  if ($[13] !== kt || $[14] !== items || $[15] !== max) {
    let sliced = items.slice(0, max);
    io = Dialog;
    Ro = "Background work is running";
    so = "The following will stop when you exit:";
    po = kt;
    ao = !0;
    Xt = Box;
    co = "column";
    bo = 0;
    Ao = 0;
    Bo = sliced.map(renderBackgroundWorkItem);
    (($[13] = kt),
      ($[14] = items),
      ($[15] = max),
      ($[16] = Xt),
      ($[17] = io),
      ($[18] = so),
      ($[19] = po),
      ($[20] = ao),
      ($[21] = co),
      ($[22] = bo),
      ($[23] = Ao),
      ($[24] = Bo),
      ($[25] = Ro));
  } else
    ((Xt = $[16]),
      (io = $[17]),
      (so = $[18]),
      (po = $[19]),
      (ao = $[20]),
      (co = $[21]),
      (bo = $[22]),
      (Ao = $[23]),
      (Bo = $[24]),
      (Ro = $[25]));
  const Io = items.length - max;
  let Wo;
  if ($[26] !== Io) ((Wo = e(OverflowHint, { count: Io, unit: "item" })), ($[26] = Io), ($[27] = Wo));
  else Wo = $[27];
  let mn;
  if ($[28] !== Xt || $[29] !== Wo || $[30] !== co || $[31] !== bo || $[32] !== Ao || $[33] !== Bo)
    ((mn = r(Xt, { flexDirection: co, gap: bo, paddingLeft: Ao, children: [Bo, Wo] })),
      ($[28] = Xt),
      ($[29] = Wo),
      ($[30] = co),
      ($[31] = bo),
      ($[32] = Ao),
      ($[33] = Bo),
      ($[34] = mn));
  else mn = $[34];
  let Cn;
  if ($[35] === MEMO_CACHE_SENTINEL) ((Cn = { label: "Exit and stop tasks", value: "exit" }), ($[35] = Cn));
  else Cn = $[35];
  let No;
  if ($[36] !== onBackground)
    ((No = onBackground ? [{ label: "Move to background and exit", value: "background" }] : []),
      ($[36] = onBackground),
      ($[37] = No));
  else No = $[37];
  let vo;
  if ($[38] === MEMO_CACHE_SENTINEL) ((vo = { label: "Stay", value: "stay" }), ($[38] = vo));
  else vo = $[38];
  let Yo;
  if ($[39] !== No) ((Yo = [Cn, ...No, vo]), ($[39] = No), ($[40] = Yo));
  else Yo = $[40];
  let kn;
  if ($[41] !== Xe || $[42] !== Yo)
    ((kn = e(ModelSelector, { options: Yo, onChange: Xe })), ($[41] = Xe), ($[42] = Yo), ($[43] = kn));
  else kn = $[43];
  let Fn;
  if (
    $[44] !== io ||
    $[45] !== so ||
    $[46] !== po ||
    $[47] !== ao ||
    $[48] !== mn ||
    $[49] !== kn ||
    $[50] !== Ro
  )
    ((Fn = r(io, { title: Ro, subtitle: so, onCancel: po, exitOnCtrlCD: ao, children: [mn, kn] })),
      ($[44] = io),
      ($[45] = so),
      ($[46] = po),
      ($[47] = ao),
      ($[48] = mn),
      ($[49] = kn),
      ($[50] = Ro),
      ($[51] = Fn));
  else Fn = $[51];
  return Fn;
}
//@ chunk-18hwfzwa.js:1693038-1693042 placement
j();

export { ExitBackgroundWorkDialog };
