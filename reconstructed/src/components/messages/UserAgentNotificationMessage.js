/**
 * components/messages/UserAgentNotificationMessage.tsx
 *
 * 后台 agent 完成/失败通知消息（带状态颜色）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserAgentNotificationMessage.tsx
 * pieces: chunk-ah34pb7m.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { parseUpdates, renderResourceUpdateRow } from "./UserResourceUpdateMessage.js";
import { Box } from "../../ink/components/Text.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-ah34pb7m.js:118642-119088 fingerprint = UserAgentNotificationMessage (0.623)
function UserAgentNotificationMessage(props) {
  let $ = useMemoCache(12);
  let { addMargin, param } = props;
  let { text } = param;
  let containerComponent;
  let flexDirection;
  let marginTop;
  let children;
  let resultElement;
  if ($[0] !== addMargin || $[1] !== text) {
    resultElement = EARLY_RETURN_SENTINEL;
    E: {
      let updates = parseUpdates(text);
      if (updates.length === 0) {
        resultElement = null;
        break E;
      }
      containerComponent = Box;
      flexDirection = "column";
      marginTop = addMargin ? 1 : 0;
      children = updates.map(renderResourceUpdateRow);
    }
    $[0] = addMargin;
    $[1] = text;
    $[2] = containerComponent;
    $[3] = flexDirection;
    $[4] = marginTop;
    $[5] = children;
    $[6] = resultElement;
  } else {
    containerComponent = $[2];
    flexDirection = $[3];
    marginTop = $[4];
    children = $[5];
    resultElement = $[6];
  }
  if (resultElement !== EARLY_RETURN_SENTINEL) return resultElement;
  let containerComponentElement;
  if ($[7] !== containerComponent || $[8] !== flexDirection || $[9] !== marginTop || $[10] !== children) {
    containerComponentElement = jsxProd_default(containerComponent, {
      flexDirection,
      marginTop,
      children,
    });
    $[7] = containerComponent;
    $[8] = flexDirection;
    $[9] = marginTop;
    $[10] = children;
    $[11] = containerComponentElement;
  } else containerComponentElement = $[11];
  return containerComponentElement;
}
export { UserAgentNotificationMessage };
