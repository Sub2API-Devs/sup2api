/**
 * components/PromptInput/promptBorderColor.ts
 *
 * 2.1.316 新增：输入框边框横幅、模式徽标与队友横幅
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0e8j1zzj.js (9)
 * attribution: placement 9
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { collapseWhitespace } from "../../utils/stringUtils.js";
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { TagTabs } from "../TagTabs.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { truncateToWidth } from "../../utils/format.js";
import { init_react_production, y, P } from "../../../vendor/react/cjs/react.production.js";
import { useAppState, useAppStoreDirect } from "../../state/AppState.js";
import { isInsideTmux } from "../../utils/swarm/backends/detection.js";
import { useSwarmBanner, useStableBanner } from "./useSwarmBanner.js";
import { stripAnsiAndControls } from "../../utils/printableName.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { NO_BREAK_SPACE } from "../../utils/permissions/autoModeRulesPrompt.js";

//@ chunk-0e8j1zzj.js:12356-13587 placement
function PromptBorderBanner(props) {
  let i = w(27);
  let { banner, columns, fastModeTag, borderOnly } = props;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let color;
  let k;
  let f;
  let g;
  let M;
  if (
    i[0] !== banner.bgColor ||
    i[1] !== banner.text ||
    i[2] !== borderOnly ||
    i[3] !== columns ||
    i[4] !== fastModeTag ||
    i[5] !== isScreenReaderEnabled
  ) {
    M = EARLY_RETURN_SENTINEL;
    x: {
      let N = collapseWhitespace(stripAnsiPerLine(banner.text));
      color = banner.bgColor === "promptBorder" ? undefined : banner.bgColor;
      if (isScreenReaderEnabled) {
        if (borderOnly || (!N && !fastModeTag)) {
          M = null;
          break x;
        }
        let A;
        if (i[11] !== fastModeTag) {
          A =
            fastModeTag &&
            jsxProd_default_2(Text, {
              color: "fastMode",
              children: [" ", fastModeTag],
            });
          i[11] = fastModeTag;
          i[12] = A;
        } else A = i[12];
        M = jsxProd_default_2(Text, {
          color: banner.bgColor,
          children: [
            N &&
              jsxProd_default(TagTabs, {
                color,
                padded: true,
                children: N,
              }),
            A,
          ],
        });
        break x;
      }
      k = fastModeTag ? bunStringWidth(fastModeTag) + 2 : 0;
      let T = columns - k - 3;
      f = T > 0 ? truncateToWidth(N, T) : "";
      g = f ? bunStringWidth(f) + 2 : 0;
    }
    i[0] = banner.bgColor;
    i[1] = banner.text;
    i[2] = borderOnly;
    i[3] = columns;
    i[4] = fastModeTag;
    i[5] = isScreenReaderEnabled;
    i[6] = color;
    i[7] = k;
    i[8] = f;
    i[9] = g;
    i[10] = M;
  } else {
    color = i[6];
    k = i[7];
    f = i[8];
    g = i[9];
    M = i[10];
  }
  if (M !== EARLY_RETURN_SENTINEL) return M;
  let v = g;
  let I = k || v ? "\u2500" : "";
  let max = Math.max(0, columns - k - v - I.length);
  const color_2 = banner.bgColor;
  let b;
  if (i[13] !== max) {
    b = "\u2500".repeat(max);
    i[13] = max;
    i[14] = b;
  } else b = i[14];
  let E;
  if (
    i[15] !== borderOnly ||
    i[16] !== color ||
    i[17] !== v ||
    i[18] !== fastModeTag ||
    i[19] !== k ||
    i[20] !== f ||
    i[21] !== I
  ) {
    E = borderOnly
      ? "\u2500".repeat(k + v + I.length)
      : jsxProd_default_2(Fragment, {
          children: [
            fastModeTag ? ` ${fastModeTag} ` : null,
            f
              ? jsxProd_default(TagTabs, {
                  color,
                  padded: true,
                  children: f,
                })
              : null,
            I,
          ],
        });
    i[15] = borderOnly;
    i[16] = color;
    i[17] = v;
    i[18] = fastModeTag;
    i[19] = k;
    i[20] = f;
    i[21] = I;
    i[22] = E;
  } else E = i[22];
  let W;
  if (i[23] !== banner.bgColor || i[24] !== b || i[25] !== E) {
    W = jsxProd_default_2(Text, {
      color: color_2,
      children: [b, E],
    });
    i[23] = banner.bgColor;
    i[24] = b;
    i[25] = E;
    i[26] = W;
  } else W = i[26];
  return W;
}
//@ chunk-0e8j1zzj.js:13587-13591 placement
init_react_production();
//@ chunk-0e8j1zzj.js:13591-13825 placement
function useTeammateBanner() {
  let teamContext = useAppState((i) => i.teamContext);
  useAppState((i) => i.viewingAgentTaskId);
  let appStoreDirect = useAppStoreDirect();
  let [d, c] = y(null);
  P(() => {
    isInsideTmux().then(c);
  }, []);
  let { agent, tmuxHint } = useSwarmBanner({
    state: appStoreDirect.getState(),
    teamContext,
    insideTmux: d,
  });
  return {
    agent: useStableBanner(agent),
    tmuxHint: useStableBanner(tmuxHint),
  };
}
//@ chunk-0e8j1zzj.js:15402-15412 placement
var BORDER_COLOR_WIDTH = 24;
//@ chunk-0e8j1zzj.js:15412-15909 placement
function PromptModeBadge(props) {
  let m = w(11);
  let { mode, agent, maxWidth } = props;
  let u;
  if (m[0] !== agent || m[1] !== maxWidth || m[2] !== mode) {
    u = promptModeBadgeText({
      mode,
      agent,
      maxWidth,
    });
    m[0] = agent;
    m[1] = maxWidth;
    m[2] = mode;
    m[3] = u;
  } else u = m[3];
  let children = u;
  if (mode === "bash") {
    let h;
    if (m[4] !== children) {
      h = jsxProd_default(Text, {
        color: "bashBorder",
        children,
      });
      m[4] = children;
      m[5] = h;
    } else h = m[5];
    return h;
  }
  if (agent) {
    let h;
    if (m[6] !== agent.bgColor || m[7] !== children) {
      h = jsxProd_default(Text, {
        color: agent.bgColor,
        children,
      });
      m[6] = agent.bgColor;
      m[7] = children;
      m[8] = h;
    } else h = m[8];
    return h;
  }
  let h;
  if (m[9] !== children) {
    h = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    m[9] = children;
    m[10] = h;
  } else h = m[10];
  return h;
}
//@ chunk-0e8j1zzj.js:15909-16035 placement
function promptModeBadgeText({ mode, agent, maxWidth }) {
  return (
    (mode === "bash"
      ? "!"
      : agent
        ? truncateToWidth(
            stripAnsiAndControls(agent.text),
            Math.max(1, Math.min(BORDER_COLOR_WIDTH, maxWidth - 1)),
          )
        : figures_default.pointer) + NO_BREAK_SPACE
  );
}
//@ chunk-0e8j1zzj.js:16035-16066 placement
function badgeWidth(o) {
  return bunStringWidth(o) + 1;
}
//@ chunk-0e8j1zzj.js:16066-16070 placement
init_react_production();
//@ chunk-0e8j1zzj.js:16070-16079 placement
var BANNER_PADDING = 4;
export {
  BANNER_PADDING,
  promptModeBadgeText,
  PromptModeBadge,
  PromptBorderBanner,
  useTeammateBanner,
  badgeWidth,
};
