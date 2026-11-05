/**
 * components/PromptInput/promptBorderColor.ts
 *
 * 2.1.316 新增：输入框边框横幅、模式徽标与队友横幅
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8prszgkd.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { init_react_production, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { useAppState, useAppStoreDirect } from "../../state/AppState.js";
import { isInsideTmux } from "../../utils/swarm/backends/detection.js";
import { useSwarmBanner, useStableBanner } from "./useSwarmBanner.js";
import { stripAnsiAndControls } from "../../utils/printableName.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { NO_BREAK_SPACE } from "../../constants/figures.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-8prszgkd.js:12622-13854 placement
function PromptBorderBanner(props) {
  let $ = useMemoCache(27);
  let { banner, columns, fastModeTag, borderOnly } = props;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let color;
  let fastModeWidth;
  let bannerText;
  let bannerWidth;
  let earlyResult;
  if (
    $[0] !== banner.bgColor ||
    $[1] !== banner.text ||
    $[2] !== borderOnly ||
    $[3] !== columns ||
    $[4] !== fastModeTag ||
    $[5] !== isScreenReaderEnabled
  ) {
    earlyResult = EARLY_RETURN_SENTINEL;
    k: {
      let bannerLabel = collapseWhitespace(stripAnsiPerLine(banner.text));
      color = banner.bgColor === "promptBorder" ? undefined : banner.bgColor;
      if (isScreenReaderEnabled) {
        if (borderOnly || (!bannerLabel && !fastModeTag)) {
          earlyResult = null;
          break k;
        }
        let fastModeElement;
        if ($[11] !== fastModeTag) {
          fastModeElement =
            fastModeTag &&
            jsxProd_default_2(Text, {
              color: "fastMode",
              children: [" ", fastModeTag],
            });
          $[11] = fastModeTag;
          $[12] = fastModeElement;
        } else fastModeElement = $[12];
        earlyResult = jsxProd_default_2(Text, {
          color: banner.bgColor,
          children: [
            bannerLabel &&
              jsxProd_default(TagTabs, {
                color,
                padded: true,
                children: bannerLabel,
              }),
            fastModeElement,
          ],
        });
        break k;
      }
      fastModeWidth = fastModeTag ? bunStringWidth(fastModeTag) + 2 : 0;
      let textBudget = columns - fastModeWidth - 3;
      bannerText = textBudget > 0 ? truncateToWidth(bannerLabel, textBudget) : "";
      bannerWidth = bannerText ? bunStringWidth(bannerText) + 2 : 0;
    }
    $[0] = banner.bgColor;
    $[1] = banner.text;
    $[2] = borderOnly;
    $[3] = columns;
    $[4] = fastModeTag;
    $[5] = isScreenReaderEnabled;
    $[6] = color;
    $[7] = fastModeWidth;
    $[8] = bannerText;
    $[9] = bannerWidth;
    $[10] = earlyResult;
  } else {
    color = $[6];
    fastModeWidth = $[7];
    bannerText = $[8];
    bannerWidth = $[9];
    earlyResult = $[10];
  }
  if (earlyResult !== EARLY_RETURN_SENTINEL) return earlyResult;
  let leftWidth = bannerWidth;
  let lineChar = fastModeWidth || leftWidth ? "\u2500" : "";
  let max = Math.max(0, columns - fastModeWidth - leftWidth - lineChar.length);
  const color_2 = banner.bgColor;
  let dashes;
  if ($[13] !== max) {
    dashes = "\u2500".repeat(max);
    $[13] = max;
    $[14] = dashes;
  } else dashes = $[14];
  let borderElement;
  if (
    $[15] !== borderOnly ||
    $[16] !== color ||
    $[17] !== leftWidth ||
    $[18] !== fastModeTag ||
    $[19] !== fastModeWidth ||
    $[20] !== bannerText ||
    $[21] !== lineChar
  ) {
    borderElement = borderOnly
      ? "\u2500".repeat(fastModeWidth + leftWidth + lineChar.length)
      : jsxProd_default_2(Fragment, {
          children: [
            fastModeTag ? ` ${fastModeTag} ` : null,
            bannerText
              ? jsxProd_default(TagTabs, {
                  color,
                  padded: true,
                  children: bannerText,
                })
              : null,
            lineChar,
          ],
        });
    $[15] = borderOnly;
    $[16] = color;
    $[17] = leftWidth;
    $[18] = fastModeTag;
    $[19] = fastModeWidth;
    $[20] = bannerText;
    $[21] = lineChar;
    $[22] = borderElement;
  } else borderElement = $[22];
  let dashedTextElement;
  if ($[23] !== banner.bgColor || $[24] !== dashes || $[25] !== borderElement) {
    dashedTextElement = jsxProd_default_2(Text, {
      color: color_2,
      children: [dashes, borderElement],
    });
    $[23] = banner.bgColor;
    $[24] = dashes;
    $[25] = borderElement;
    $[26] = dashedTextElement;
  } else dashedTextElement = $[26];
  return dashedTextElement;
}
//@ chunk-8prszgkd.js:13854-13858 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8prszgkd.js:13854", () => {
  init_react_production();
});
//@ chunk-8prszgkd.js:13858-14092 placement
function useTeammateBanner() {
  let teamContext = useAppState((state) => state.teamContext);
  useAppState((state) => state.viewingAgentTaskId);
  let appStoreDirect = useAppStoreDirect();
  let [insideTmux, setInsideTmux] = useState(null);
  useEffect(() => {
    isInsideTmux().then(setInsideTmux);
  }, []);
  let { agent, tmuxHint } = useSwarmBanner({
    state: appStoreDirect.getState(),
    teamContext,
    insideTmux,
  });
  return {
    agent: useStableBanner(agent),
    tmuxHint: useStableBanner(tmuxHint),
  };
}
//@ chunk-8prszgkd.js:15650-15660 placement
var BORDER_COLOR_WIDTH = 24;
//@ chunk-8prszgkd.js:15660-16157 placement
function PromptModeBadge(props) {
  let $ = useMemoCache(11);
  let { mode, agent, maxWidth } = props;
  let badgeText;
  if ($[0] !== agent || $[1] !== maxWidth || $[2] !== mode) {
    badgeText = promptModeBadgeText({
      mode,
      agent,
      maxWidth,
    });
    $[0] = agent;
    $[1] = maxWidth;
    $[2] = mode;
    $[3] = badgeText;
  } else badgeText = $[3];
  let children = badgeText;
  if (mode === "bash") {
    let badgeElement;
    if ($[4] !== children) {
      badgeElement = jsxProd_default(Text, {
        color: "bashBorder",
        children,
      });
      $[4] = children;
      $[5] = badgeElement;
    } else badgeElement = $[5];
    return badgeElement;
  }
  if (agent) {
    let borderColor;
    if ($[6] !== agent.bgColor || $[7] !== children) {
      borderColor = jsxProd_default(Text, {
        color: agent.bgColor,
        children,
      });
      $[6] = agent.bgColor;
      $[7] = children;
      $[8] = borderColor;
    } else borderColor = $[8];
    return borderColor;
  }
  let childrenElement;
  if ($[9] !== children) {
    childrenElement = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[9] = children;
    $[10] = childrenElement;
  } else childrenElement = $[10];
  return childrenElement;
}
//@ chunk-8prszgkd.js:16157-16283 placement
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
//@ chunk-8prszgkd.js:16283-16314 placement
function badgeWidth(badgeText) {
  return bunStringWidth(badgeText) + 1;
}
//@ chunk-8prszgkd.js:16314-16318 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8prszgkd.js:16314", () => {
  init_react_production();
});
//@ chunk-8prszgkd.js:21470-21479 placement
var BANNER_PADDING = 4;
export {
  BANNER_PADDING,
  promptModeBadgeText,
  PromptModeBadge,
  PromptBorderBanner,
  useTeammateBanner,
  badgeWidth,
};
