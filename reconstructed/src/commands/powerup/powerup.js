/**
 * commands/powerup/powerup.tsx
 *
 * 2.1.316 新增：/powerup 教学的移动端二维码步骤组件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-19dk83fw.js (1), chunk-fxpvgzqn.js (1)
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

//@ chunk-19dk83fw.js:18639-19401 placement = MobileQRCode (0.23)
function MobileQRCode(props) {
  let $ = useMemoCache(15);
  let { lesson, isUnlocked, onDone, onBack } = props;
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
  if ($[8] !== statusIcon || $[9] !== titleText) {
    headerRow = jsxProd_default_2(Box, {
      children: [statusIcon, titleText],
    });
    $[8] = statusIcon;
    $[9] = titleText;
    $[10] = headerRow;
  } else headerRow = $[10];
  let footer;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    footer = jsxProd_default(LessonFooter, {});
    $[11] = footer;
  } else footer = $[11];
  let pane;
  if ($[12] !== lesson.body || $[13] !== headerRow) {
    pane = jsxProd_default(Pane, {
      color: "claude",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [headerRow, lesson.body, footer],
      }),
    });
    $[12] = lesson.body;
    $[13] = headerRow;
    $[14] = pane;
  } else pane = $[14];
  return pane;
}
//@ chunk-fxpvgzqn.js:13703-13764 placement = call (0.635)
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
