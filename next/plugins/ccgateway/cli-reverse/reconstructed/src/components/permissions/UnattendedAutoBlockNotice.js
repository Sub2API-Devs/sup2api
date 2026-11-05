/**
 * components/permissions/UnattendedAutoBlockNotice.tsx
 *
 * 2.1.316 新增：无人值守时自动模式拦截与拒绝上限回退提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8prszgkd.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  createContext,
  useContext,
  useState,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import {
  BANNER_PADDING,
  promptModeBadgeText,
  PromptModeBadge,
  PromptBorderBanner,
  useTeammateBanner,
} from "../PromptInput/promptBorderColor.js";
import { Box, Text } from "../../ink/components/Text.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Divider } from "../design-system/Divider.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { showSwarmFooterGate } from "../PromptInput/footerGates.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useSessionBanner } from "../PromptInput/useSwarmBanner.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { cleanForDisplay, plural } from "../../utils/stringUtils.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import { truncateToWidth } from "../../utils/format.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useInterval } from "../../ink/components/Input.js";
import { WARNING_GLYPH } from "../../constants/figures.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-8prszgkd.js:21466-21470 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8prszgkd.js:21466", () => {
  init_react_production();
});
//@ chunk-8prszgkd.js:21479-22438 placement
/**
 * 无人值守时自动模式拦截的提示条，显示被阻止的会话与 tmux 提示。
 */
function UnattendedAutoBlockNotice(props) {
  let $ = useMemoCache(25);
  let { hideSessionTitle } = props;
  let hideSessionTitle_2 = hideSessionTitle === undefined ? false : hideSessionTitle;
  let { columns } = useTerminalSize();
  let unattendedNoticeLines = useUnattendedNoticeLines(hideSessionTitle_2);
  if (unattendedNoticeLines === null) {
    return null;
  }
  if (unattendedNoticeLines.drawsPromptCharacter) {
    let agent = unattendedNoticeLines.banner;
    let maxWidth = columns - BANNER_PADDING;
    let containerComponent;
    let boxComponent;
    let textComponent;
    let titleElement;
    let flexDirection;
    let width;
    let promptModeBadgeElement;
    if ($[0] !== agent || $[1] !== maxWidth || $[2] !== columns) {
      let badgeText = promptModeBadgeText({
        mode: "prompt",
        agent,
        maxWidth,
      });
      boxComponent = Box;
      flexDirection = "row";
      width = "100%";
      if ($[10] !== agent || $[11] !== maxWidth) {
        promptModeBadgeElement = jsxProd_default(PromptModeBadge, {
          mode: "prompt",
          agent,
          maxWidth,
        });
        $[10] = agent;
        $[11] = maxWidth;
        $[12] = promptModeBadgeElement;
      } else promptModeBadgeElement = $[12];
      containerComponent = Divider;
      textComponent = columns;
      titleElement = bunStringWidth(badgeText);
      $[0] = agent;
      $[1] = maxWidth;
      $[2] = columns;
      $[3] = containerComponent;
      $[4] = boxComponent;
      $[5] = textComponent;
      $[6] = titleElement;
      $[7] = flexDirection;
      $[8] = width;
      $[9] = promptModeBadgeElement;
    } else {
      containerComponent = $[3];
      boxComponent = $[4];
      textComponent = $[5];
      titleElement = $[6];
      flexDirection = $[7];
      width = $[8];
      promptModeBadgeElement = $[9];
    }
    const width_2 = textComponent - titleElement;
    let containerComponentElement;
    if ($[13] !== containerComponent || $[14] !== width_2) {
      containerComponentElement = jsxProd_default(containerComponent, {
        width: width_2,
      });
      $[13] = containerComponent;
      $[14] = width_2;
      $[15] = containerComponentElement;
    } else containerComponentElement = $[15];
    let boxComponentElement;
    if (
      $[16] !== boxComponent ||
      $[17] !== flexDirection ||
      $[18] !== width ||
      $[19] !== promptModeBadgeElement ||
      $[20] !== containerComponentElement
    ) {
      boxComponentElement = jsxProd_default_2(boxComponent, {
        flexDirection,
        width,
        children: [promptModeBadgeElement, containerComponentElement],
      });
      $[16] = boxComponent;
      $[17] = flexDirection;
      $[18] = width;
      $[19] = promptModeBadgeElement;
      $[20] = containerComponentElement;
      $[21] = boxComponentElement;
    } else boxComponentElement = $[21];
    return boxComponentElement;
  }
  let promptBorderBannerElement;
  if ($[22] !== unattendedNoticeLines.banner || $[23] !== columns) {
    promptBorderBannerElement = jsxProd_default(PromptBorderBanner, {
      banner: unattendedNoticeLines.banner,
      columns,
      fastModeTag: undefined,
    });
    $[22] = unattendedNoticeLines.banner;
    $[23] = columns;
    $[24] = promptBorderBannerElement;
  } else promptBorderBannerElement = $[24];
  return promptBorderBannerElement;
}
//@ chunk-8prszgkd.js:22438-22478 placement
function unattendedNoticeRows(hideSessionTitle) {
  return useUnattendedNoticeLines(hideSessionTitle) === null ? 0 : 1;
}
//@ chunk-8prszgkd.js:22478-22492 placement
var UnattendedNoticeContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8prszgkd.js:22478", () => {
  UnattendedNoticeContext = createContext(0);
});
//@ chunk-8prszgkd.js:22492-22521 placement
function useUnattendedNotice() {
  return useContext(UnattendedNoticeContext);
}
//@ chunk-8prszgkd.js:22521-23160 placement
function useUnattendedNoticeLines(hideSessionTitle) {
  let $ = useMemoCache(16);
  let swarmFooterVisible = showSwarmFooterGate();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let { columns } = useTerminalSize();
  let { agent, tmuxHint } = useTeammateBanner();
  let bannerProps;
  if ($[0] !== hideSessionTitle) {
    bannerProps = {
      hideSessionTitle,
    };
    $[0] = hideSessionTitle;
    $[1] = bannerProps;
  } else bannerProps = $[1];
  let sessionBanner = useSessionBanner(bannerProps);
  let banner = swarmFooterVisible ? agent : (agent ?? tmuxHint ?? sessionBanner);
  if (!banner) {
    return null;
  }
  let containerComponent;
  let text;
  let drawsPromptCharacter;
  let resultElement;
  if ($[2] !== banner || $[3] !== columns || $[4] !== swarmFooterVisible || $[5] !== isScreenReaderEnabled) {
    resultElement = EARLY_RETURN_SENTINEL;
    N: {
      let badgeText = cleanForDisplay(stripAnsi(banner.text));
      if (!badgeText) {
        resultElement = null;
        break N;
      }
      drawsPromptCharacter = swarmFooterVisible;
      containerComponent = banner;
      text = isScreenReaderEnabled ? truncateToWidth(badgeText, Math.max(1, columns - 2)) : badgeText;
    }
    $[2] = banner;
    $[3] = columns;
    $[4] = swarmFooterVisible;
    $[5] = isScreenReaderEnabled;
    $[6] = containerComponent;
    $[7] = text;
    $[8] = drawsPromptCharacter;
    $[9] = resultElement;
  } else {
    containerComponent = $[6];
    text = $[7];
    drawsPromptCharacter = $[8];
    resultElement = $[9];
  }
  if (resultElement !== EARLY_RETURN_SENTINEL) return resultElement;
  let banner_2;
  if ($[10] !== containerComponent || $[11] !== text) {
    banner_2 = {
      ...containerComponent,
      text,
    };
    $[10] = containerComponent;
    $[11] = text;
    $[12] = banner_2;
  } else banner_2 = $[12];
  let bannerState;
  if ($[13] !== drawsPromptCharacter || $[14] !== banner_2) {
    bannerState = {
      drawsPromptCharacter,
      banner: banner_2,
    };
    $[13] = drawsPromptCharacter;
    $[14] = banner_2;
    $[15] = bannerState;
  } else bannerState = $[15];
  return bannerState;
}
//@ chunk-8prszgkd.js:23160-23164 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8prszgkd.js:23160", () => {
  init_react_production();
});
//@ chunk-8prszgkd.js:23164-23168 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8prszgkd.js:23164", () => {
  init_react_production();
});
//@ chunk-8prszgkd.js:23172-23198 placement
function incrementByOne(count) {
  return count + 1;
}
//@ chunk-8prszgkd.js:23198-24687 placement
function DenialLimitFallbackNotice(props) {
  let $ = useMemoCache(18);
  let { permissionResult } = props;
  let deadlineMs =
    permissionResult?.behavior === "ask"
      ? (permissionResult.denialLimitFallback?.deadlineEpochMs ??
        permissionResult.autoDenyWindow?.deadlineEpochMs)
      : undefined;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let clock = useClock();
  let clockAt;
  if ($[0] !== clock) {
    clockAt = clock.now();
    $[0] = clock;
    $[1] = clockAt;
  } else clockAt = $[1];
  let epochAt;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    epochAt = Date.now();
    $[2] = epochAt;
  } else epochAt = $[2];
  let clockState;
  if ($[3] !== clockAt) {
    clockState = {
      clockAt,
      epochAt,
    };
    $[3] = clockAt;
    $[4] = clockState;
  } else clockState = $[4];
  let clockSnapshot = clockState;
  let countdown;
  if ($[5] !== clockSnapshot.clockAt || $[6] !== clockSnapshot.epochAt || $[7] !== clock) {
    countdown = () => clockSnapshot.epochAt + (clock.now() - clockSnapshot.clockAt);
    $[5] = clockSnapshot.clockAt;
    $[6] = clockSnapshot.epochAt;
    $[7] = clock;
    $[8] = countdown;
  } else countdown = $[8];
  let remainingMs = countdown;
  let [, tick] = useState(0);
  let tickEffect;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    tickEffect = () => tick(incrementByOne);
    $[9] = tickEffect;
  } else tickEffect = $[9];
  useInterval(tickEffect, deadlineMs !== undefined && !isScreenReaderEnabled ? 1000 : null);
  if (deadlineMs === undefined) {
    return null;
  }
  if (isScreenReaderEnabled) {
    let max = Math.max(0, deadlineMs - remainingMs());
    let remainingLabel;
    if ($[10] !== max) {
      let rounded = Math.round(max / 60000);
      let max_2 = Math.max(1, Math.round(max / 1000));
      remainingLabel =
        max >= 60000
          ? `about ${rounded} ${plural(rounded, "minute")}`
          : `about ${max_2} ${plural(max_2, "second")}`;
      $[10] = max;
      $[11] = remainingLabel;
    } else remainingLabel = $[11];
    let countdownLabel = remainingLabel;
    const children = `${WARNING_GLYPH} Claude Code will automatically block this request in ${countdownLabel}, to avoid holding up an unattended session`;
    let noticeBox;
    if ($[12] !== children) {
      noticeBox = jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(Text, {
          color: "warning",
          children,
        }),
      });
      $[12] = children;
      $[13] = noticeBox;
    } else noticeBox = $[13];
    return noticeBox;
  }
  let max = Math.max(0, deadlineMs - remainingMs());
  let floored = Math.floor(max / 60000);
  let floored_2 = Math.floor((max % 60000) / 1000);
  const secondsText = String(floored_2);
  let paddedSeconds;
  if ($[14] !== secondsText) {
    paddedSeconds = secondsText.padStart(2, "0");
    $[14] = secondsText;
    $[15] = paddedSeconds;
  } else paddedSeconds = $[15];
  let clockText = `${floored}:${paddedSeconds}`;
  const children = `${WARNING_GLYPH} Claude Code will automatically block this request in ${clockText}, to avoid holding up an unattended session`;
  let noticeBox;
  if ($[16] !== children) {
    noticeBox = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        color: "warning",
        children,
      }),
    });
    $[16] = children;
    $[17] = noticeBox;
  } else noticeBox = $[17];
  return noticeBox;
}
export {
  DenialLimitFallbackNotice,
  useUnattendedNotice,
  UnattendedAutoBlockNotice,
  unattendedNoticeRows,
  UnattendedNoticeContext,
};
