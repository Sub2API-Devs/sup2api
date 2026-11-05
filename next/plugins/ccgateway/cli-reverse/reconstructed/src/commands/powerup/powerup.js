/**
 * commands/powerup/powerup.tsx
 *
 * 2.1.316 新增：/powerup 教学的移动端二维码步骤组件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-je0zymfm.js (1), chunk-zpw2qypj.js (1)
 * attribution: placement 2
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { MessageActionsKeybindings } from "../../components/messageActions.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { Text, Box } from "../../ink/components/Text.js";
import { LessonFooter, PowerupLessons } from "../../components/onboarding/PowerupLessons.js";
import { Pane } from "../../components/design-system/Pane.js";

//@ chunk-je0zymfm.js:19079-19885 placement (2.1.88 match: MobileQRCode, 0.225)
function MobileQRCode(props) {
  let $ = useMemoCache(17);
  let { lesson, isUnlocked, hint, onDone, onBack } = props;
  let confirmActions;
  if ($[0] !== onBack || $[1] !== onDone) {
    confirmActions = {
      "confirm:yes": onDone,
      "confirm:no": onBack,
    };
    $[0] = onBack;
    $[1] = onDone;
    $[2] = confirmActions;
  } else confirmActions = $[2];
  let keybindingsContext;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    keybindingsContext = {
      context: "Confirmation",
    };
    $[3] = keybindingsContext;
  } else keybindingsContext = $[3];
  MessageActionsKeybindings(confirmActions, keybindingsContext);
  const status = isUnlocked ? "success" : "pending";
  let statusIcon;
  if ($[4] !== status) {
    statusIcon = jsxProd_default(StatusIcon, {
      status,
      withSpace: true,
    });
    $[4] = status;
    $[5] = statusIcon;
  } else statusIcon = $[5];
  let iconRow = statusIcon;
  let titleText;
  if ($[6] !== lesson.title) {
    titleText = jsxProd_default(Text, {
      bold: true,
      color: "claude",
      children: lesson.title,
    });
    $[6] = lesson.title;
    $[7] = titleText;
  } else titleText = $[7];
  let headerRow;
  if ($[8] !== iconRow || $[9] !== titleText) {
    headerRow = jsxProd_default_2(Box, {
      children: [iconRow, titleText],
    });
    $[8] = iconRow;
    $[9] = titleText;
    $[10] = headerRow;
  } else headerRow = $[10];
  let footer;
  if ($[11] !== hint) {
    footer = jsxProd_default(LessonFooter, {
      hint,
    });
    $[11] = hint;
    $[12] = footer;
  } else footer = $[12];
  let pane;
  if ($[13] !== lesson.body || $[14] !== headerRow || $[15] !== footer) {
    pane = jsxProd_default(Pane, {
      color: "claude",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [headerRow, lesson.body, footer],
      }),
    });
    $[13] = lesson.body;
    $[14] = headerRow;
    $[15] = footer;
    $[16] = pane;
  } else pane = $[16];
  return pane;
}
//@ chunk-zpw2qypj.js:14963-15024 placement (2.1.88 match: call, 0.635)
/**
 * /powerup 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var call = async (onDone) =>
  jsxProd_default(PowerupLessons, {
    onExit: (result) =>
      onDone(result, {
        display: "system",
      }),
  });
export { MobileQRCode, call };
