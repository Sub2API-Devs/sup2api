/**
 * buddy/CompanionSprite.tsx
 *
 * （316 已移除伴侣精灵功能）旧版文件名下匹配到的都是无关的 UI 小组件：计数动画 hook、带边框提示条、编辑器等待提示、端口状态解析
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/buddy/CompanionSprite.tsx
 * pieces: chunk-jdfzheem.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { use } from "../../vendor/react/cjs/react.production.js";
import { stripInvisibleKeepNewlines } from "../utils/settings/marketplaceSettingsAliases.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { RenderOnceAndExit } from "../utils/staticRender.js";
import { Text } from "../ink/components/Text.js";
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";

//@ chunk-jdfzheem.js:33421-33621 fingerprint (2.1.88 match: _temp2, 0.696)
function SuccessLine(s_0) {
  let $ = useMemoCache(4);
  let { promise } = s_0;
  let text = use(promise);
  let clean;
  if ($[0] !== text) {
    clean = stripInvisibleKeepNewlines(text);
    $[0] = text;
    $[1] = clean;
  } else clean = $[1];
  let element;
  if ($[2] !== clean) {
    element = jsxProd_default(RenderOnceAndExit, {
      children: jsxProd_default_2(Text, {
        children: [figures_default.tick, " ", clean],
      }),
    });
    $[2] = clean;
    $[3] = element;
  } else element = $[3];
  return element;
}
export { SuccessLine };
