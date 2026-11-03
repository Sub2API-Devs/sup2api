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
import { w } from "../../../vendor/react/compiler-runtime.js";
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
  let i = w(15);
  let { lesson, isUnlocked, onDone, onBack } = props;
  let x;
  if (i[0] !== onBack || i[1] !== onDone) {
    x = {
      "confirm:yes": onDone,
      "confirm:no": onBack,
    };
    i[0] = onBack;
    i[1] = onDone;
    i[2] = x;
  } else x = i[2];
  let g;
  if (i[3] === MEMO_CACHE_SENTINEL) {
    g = {
      context: "Confirmation",
    };
    i[3] = g;
  } else g = i[3];
  MessageActionsKeybindings(x, g);
  const status = isUnlocked ? "success" : "pending";
  let f;
  if (i[4] !== status) {
    f = jsxProd_default(StatusIcon, {
      status,
      withSpace: true,
    });
    i[4] = status;
    i[5] = f;
  } else f = i[5];
  let b;
  if (i[6] !== lesson.title) {
    b = jsxProd_default(Text, {
      bold: true,
      color: "claude",
      children: lesson.title,
    });
    i[6] = lesson.title;
    i[7] = b;
  } else b = i[7];
  let d;
  if (i[8] !== f || i[9] !== b) {
    d = jsxProd_default_2(Box, {
      children: [f, b],
    });
    i[8] = f;
    i[9] = b;
    i[10] = d;
  } else d = i[10];
  let R;
  if (i[11] === MEMO_CACHE_SENTINEL) {
    R = jsxProd_default(LessonFooter, {});
    i[11] = R;
  } else R = i[11];
  let C;
  if (i[12] !== lesson.body || i[13] !== d) {
    C = jsxProd_default(Pane, {
      color: "claude",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [d, lesson.body, R],
      }),
    });
    i[12] = lesson.body;
    i[13] = d;
    i[14] = C;
  } else C = i[14];
  return C;
}
//@ chunk-fxpvgzqn.js:13703-13764 placement = call (0.635)
/**
 * /powerup 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var call = async (onDone) =>
  jsxProd_default(PowerupLessons, {
    onExit: (m) =>
      onDone(m, {
        display: "system",
      }),
  });
export { MobileQRCode };
