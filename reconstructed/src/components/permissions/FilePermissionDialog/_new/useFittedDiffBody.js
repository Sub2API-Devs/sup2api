/**
 * components/permissions/FilePermissionDialog/_new/useFittedDiffBody.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: sole-consumer-new 3
 */
import { j, y, R } from "../../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../../../ink/components/ErrorBoundary.js";
import { MEMO_CACHE_SENTINEL } from "../../../../../runtime/bun-runtime.js";
import { measureElement } from "../../../../ink/hooks/useTerminalHooks.js";
import { useMeasured } from "../../../../ink/components/Input.js";
import { jsonStringify } from "../../../../utils/slowOperations.js";
import { FittedOfferBody } from "../../../AutocompactOfferDialog.js";
import { countCharInString } from "../../../../utils/stringUtils.js";
import { r, e } from "../../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../../../ink/components/Text.js";
import { PAe } from "../../FolderAccessPermissionRequest.js";
import { SeeMoreHint } from "../../BashPermissionRequest/commandDisplay.js";

//@ chunk-18hwfzwa.js:1377043-1377047 sole-consumer-new
j();
/**
 * 文件权限对话框的 diff 区测量与裁剪：测量高度、生成占位行、计算可见行与展开快捷键，返回 fitted 状态。
 */
//@ chunk-18hwfzwa.js:1377047-1378002 sole-consumer-new
function useFittedDiffBody(h, x) {
  let ke = w(18),
    D = useIsScreenReaderEnabled(),
    [L, ee] = y(!1),
    Re;
  if (ke[0] === MEMO_CACHE_SENTINEL) ((Re = () => ee(!0)), (ke[0] = Re));
  else Re = ke[0];
  let Be = Re,
    He = R(null),
    We;
  if (ke[1] === MEMO_CACHE_SENTINEL)
    ((We = () => (He.current === null ? 0 : measureElement(He.current).height)), (ke[1] = We));
  else We = ke[1];
  let ze = useMeasured(We),
    Xe;
  if (ke[2] !== h || ke[3] !== x) ((Xe = x ? jsonStringify(h) : ""), (ke[2] = h), (ke[3] = x), (ke[4] = Xe));
  else Xe = ke[4];
  let rt = Xe,
    kt;
  if (ke[5] !== ze)
    ((kt = `
`.repeat(Math.max(0, ze - 1))),
      (ke[5] = ze),
      (ke[6] = kt));
  else kt = ke[6];
  const At = !D,
    It = L ? "drawn" : "pending";
  let Ot;
  if (ke[7] !== rt || ke[8] !== x || ke[9] !== At || ke[10] !== It)
    ((Ot = { isActive: x, isCut: At, contentKey: rt, lateBody: It }),
      (ke[7] = rt),
      (ke[8] = x),
      (ke[9] = At),
      (ke[10] = It),
      (ke[11] = Ot));
  else Ot = ke[11];
  let Et = FittedOfferBody(kt, Ot),
    showNextRows = Et.showNextRows,
    Lt;
  if (ke[12] !== showNextRows)
    ((Lt = [{ action: "app:toggleTranscript", run: showNextRows }]), (ke[12] = showNextRows), (ke[13] = Lt));
  else Lt = ke[13];
  let oo = Lt;
  const Xt = x
    ? countCharInString(
        Et.text,
        `
`,
      ) + 1
    : void 0;
  let io;
  if (ke[14] !== Et || ke[15] !== oo || ke[16] !== Xt)
    ((io = { body: Et, rows: Xt, diffBox: He, moreBindings: oo, noteDrawn: Be }),
      (ke[14] = Et),
      (ke[15] = oo),
      (ke[16] = Xt),
      (ke[17] = io));
  else io = ke[17];
  return io;
}
/**
 * 按 fitted 状态裁剪显示 diff（负 marginTop 实现滚动），下方加 "see more" 提示。
 */
//@ chunk-18hwfzwa.js:1378002-1378346 sole-consumer-new
function FittedDiffBody({ fitted: fitted, children: children }) {
  return r(Box, {
    ref: fitted.body.box,
    flexDirection: "column",
    children: [
      e(Box, {
        ref: fitted.body.textBox,
        flexDirection: "column",
        overflowY: "hidden",
        height: fitted.rows,
        children: e(Box, {
          ref: fitted.diffBox,
          flexDirection: "column",
          flexShrink: 0,
          marginTop: -fitted.body.hiddenAbove,
          children: e(PAe, { value: fitted.noteDrawn, children: children }),
        }),
      }),
      e(SeeMoreHint, { body: fitted.body }),
    ],
  });
}

export { useFittedDiffBody, FittedDiffBody };
