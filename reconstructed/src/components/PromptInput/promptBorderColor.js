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
import { Dr } from "../../utils/stringUtils.js";
import { qa } from "../../utils/stripAnsi.js";
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { TagTabs } from "../TagTabs.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { truncateToWidth } from "../../utils/format.js";
import { j, y, P } from "../../../vendor/react/cjs/react.production.js";
import { useAppState, Cr } from "../../state/AppState.js";
import { isInsideTmux } from "../../utils/swarm/backends/detection.js";
import { useSwarmBanner, useStableBanner } from "./useSwarmBanner.js";
import { stripAnsiAndControls } from "../../utils/printableName.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { k_r } from "../../utils/permissions/autoModeRulesPrompt.js";

//@ chunk-0e8j1zzj.js:12356-13587 placement
function PromptBorderBanner(o) {
  let i = w(27),
    { banner: banner, columns: columns, fastModeTag: fastModeTag, borderOnly: borderOnly } = o,
    u = useIsScreenReaderEnabled(),
    h,
    k,
    f,
    g,
    M;
  if (
    i[0] !== banner.bgColor ||
    i[1] !== banner.text ||
    i[2] !== borderOnly ||
    i[3] !== columns ||
    i[4] !== fastModeTag ||
    i[5] !== u
  ) {
    M = EARLY_RETURN_SENTINEL;
    x: {
      let N = Dr(qa(banner.text));
      h = banner.bgColor === "promptBorder" ? void 0 : banner.bgColor;
      if (u) {
        if (borderOnly || (!N && !fastModeTag)) {
          M = null;
          break x;
        }
        let A;
        if (i[11] !== fastModeTag)
          ((A = fastModeTag && r(Text, { color: "fastMode", children: [" ", fastModeTag] })),
            (i[11] = fastModeTag),
            (i[12] = A));
        else A = i[12];
        M = r(Text, {
          color: banner.bgColor,
          children: [N && e(TagTabs, { color: h, padded: !0, children: N }), A],
        });
        break x;
      }
      k = fastModeTag ? bunStringWidth(fastModeTag) + 2 : 0;
      let T = columns - k - 3;
      f = T > 0 ? truncateToWidth(N, T) : "";
      g = f ? bunStringWidth(f) + 2 : 0;
    }
    ((i[0] = banner.bgColor),
      (i[1] = banner.text),
      (i[2] = borderOnly),
      (i[3] = columns),
      (i[4] = fastModeTag),
      (i[5] = u),
      (i[6] = h),
      (i[7] = k),
      (i[8] = f),
      (i[9] = g),
      (i[10] = M));
  } else ((h = i[6]), (k = i[7]), (f = i[8]), (g = i[9]), (M = i[10]));
  if (M !== EARLY_RETURN_SENTINEL) return M;
  let v = g,
    I = k || v ? "\u2500" : "",
    max = Math.max(0, columns - k - v - I.length);
  const bgColor = banner.bgColor;
  let b;
  if (i[13] !== max) ((b = "\u2500".repeat(max)), (i[13] = max), (i[14] = b));
  else b = i[14];
  let E;
  if (
    i[15] !== borderOnly ||
    i[16] !== h ||
    i[17] !== v ||
    i[18] !== fastModeTag ||
    i[19] !== k ||
    i[20] !== f ||
    i[21] !== I
  )
    ((E = borderOnly
      ? "\u2500".repeat(k + v + I.length)
      : r(Fragment, {
          children: [
            fastModeTag ? ` ${fastModeTag} ` : null,
            f ? e(TagTabs, { color: h, padded: !0, children: f }) : null,
            I,
          ],
        })),
      (i[15] = borderOnly),
      (i[16] = h),
      (i[17] = v),
      (i[18] = fastModeTag),
      (i[19] = k),
      (i[20] = f),
      (i[21] = I),
      (i[22] = E));
  else E = i[22];
  let W;
  if (i[23] !== banner.bgColor || i[24] !== b || i[25] !== E)
    ((W = r(Text, { color: bgColor, children: [b, E] })),
      (i[23] = banner.bgColor),
      (i[24] = b),
      (i[25] = E),
      (i[26] = W));
  else W = i[26];
  return W;
}
//@ chunk-0e8j1zzj.js:13587-13591 placement
j();
//@ chunk-0e8j1zzj.js:13591-13825 placement
function useTeammateBanner() {
  let o = useAppState((i) => i.teamContext);
  useAppState((i) => i.viewingAgentTaskId);
  let t = Cr(),
    [d, c] = y(null);
  P(() => {
    isInsideTmux().then(c);
  }, []);
  let { agent: agent, tmuxHint: tmuxHint } = useSwarmBanner({
    state: t.getState(),
    teamContext: o,
    insideTmux: d,
  });
  return { agent: useStableBanner(agent), tmuxHint: useStableBanner(tmuxHint) };
}
//@ chunk-0e8j1zzj.js:15402-15412 placement
var ys = 24;
//@ chunk-0e8j1zzj.js:15412-15909 placement
function PromptModeBadge(o) {
  let m = w(11),
    { mode: mode, agent: agent, maxWidth: maxWidth } = o,
    u;
  if (m[0] !== agent || m[1] !== maxWidth || m[2] !== mode)
    ((u = promptModeBadgeText({ mode: mode, agent: agent, maxWidth: maxWidth })),
      (m[0] = agent),
      (m[1] = maxWidth),
      (m[2] = mode),
      (m[3] = u));
  else u = m[3];
  let i = u;
  if (mode === "bash") {
    let h;
    if (m[4] !== i) ((h = e(Text, { color: "bashBorder", children: i })), (m[4] = i), (m[5] = h));
    else h = m[5];
    return h;
  }
  if (agent) {
    let h;
    if (m[6] !== agent.bgColor || m[7] !== i)
      ((h = e(Text, { color: agent.bgColor, children: i })), (m[6] = agent.bgColor), (m[7] = i), (m[8] = h));
    else h = m[8];
    return h;
  }
  let h;
  if (m[9] !== i) ((h = e(Text, { dimColor: !0, children: i })), (m[9] = i), (m[10] = h));
  else h = m[10];
  return h;
}
//@ chunk-0e8j1zzj.js:15909-16035 placement
function promptModeBadgeText({ mode: mode, agent: agent, maxWidth: maxWidth }) {
  return (
    (mode === "bash"
      ? "!"
      : agent
        ? truncateToWidth(stripAnsiAndControls(agent.text), Math.max(1, Math.min(ys, maxWidth - 1)))
        : re.pointer) + k_r
  );
}
//@ chunk-0e8j1zzj.js:16035-16066 placement
function badgeWidth(o) {
  return bunStringWidth(o) + 1;
}
//@ chunk-0e8j1zzj.js:16066-16070 placement
j();
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
