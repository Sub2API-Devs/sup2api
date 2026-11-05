/**
 * components/LogoV2/StartupAnnouncement.tsx
 *
 * 2.1.316 新增：启动公告提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hnxhr3bs.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { pickStartupAnnouncement as pickStartupAnnouncement_2 } from "../../services/startupAnnouncements.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useNoticeImpressionEnabled, useNoticeImpression } from "./CondensedLogo.js";
import { useState, useContext } from "../../../vendor/react/cjs/react.production.js";
import { SlashLinkContexts } from "../SlashCommandLink.js";
import { logEvent } from "../../services/analytics/index.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, BaseText, Box } from "../../ink/components/Text.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";

//@ chunk-hnxhr3bs.js:98750-98779 placement
function pickStartupAnnouncement() {
  return pickStartupAnnouncement_2(false);
}
//@ chunk-hnxhr3bs.js:98779-99886 placement
function StartupAnnouncementNotice() {
  let $ = useMemoCache(19);
  let { storageV5 } = useTheme_2();
  let noticeImpressionEnabled = useNoticeImpressionEnabled();
  let [cached] = useState(pickStartupAnnouncement);
  let announcement;
  if ($[0] !== noticeImpressionEnabled || $[1] !== cached) {
    announcement = noticeImpressionEnabled ? pickStartupAnnouncement_2(true) : cached;
    $[0] = noticeImpressionEnabled;
    $[1] = cached;
    $[2] = announcement;
  } else announcement = $[2];
  let announcement_2 = announcement;
  let linkContexts = useContext(SlashLinkContexts);
  let onShown;
  if ($[3] !== announcement_2 || $[4] !== storageV5) {
    onShown = () => {
      if (!announcement_2) {
        return;
      }
      logEvent("tengu_startup_announcement_shown", {
        announcement_id: sanitizeMarkName(announcement_2.id),
        impression: (getGlobalConfig().announcementImpressions?.[announcement_2.id] ?? 0) + 1,
      });
      saveGlobalConfig(
        (config) => ({
          ...config,
          announcementImpressions: {
            ...config.announcementImpressions,
            [announcement_2.id]: (config.announcementImpressions?.[announcement_2.id] ?? 0) + 1,
          },
        }),
        storageV5,
      );
    };
    $[3] = announcement_2;
    $[4] = storageV5;
    $[5] = onShown;
  } else onShown = $[5];
  const enabled = announcement_2 !== undefined;
  let impressionOptions;
  if ($[6] !== enabled) {
    impressionOptions = {
      enabled,
    };
    $[6] = enabled;
    $[7] = impressionOptions;
  } else impressionOptions = $[7];
  useNoticeImpression("startup-announcement", onShown, impressionOptions);
  if (!announcement_2) {
    return null;
  }
  const alignItems = linkContexts ? "center" : undefined;
  let title;
  if ($[8] !== announcement_2.title) {
    title = announcement_2.title
      ? jsxProd_default(Text, {
          color: "claude",
          children: announcement_2.title,
        })
      : null;
    $[8] = announcement_2.title;
    $[9] = title;
  } else title = $[9];
  let text;
  if ($[10] !== announcement_2.text) {
    text = jsxProd_default(MarkdownText_2, {
      children: announcement_2.text,
    });
    $[10] = announcement_2.text;
    $[11] = text;
  } else text = $[11];
  let footer;
  if ($[12] !== announcement_2.footer) {
    footer = announcement_2.footer
      ? jsxProd_default(BaseText, {
          dim: true,
          children: announcement_2.footer,
        })
      : null;
    $[12] = announcement_2.footer;
    $[13] = footer;
  } else footer = $[13];
  let box;
  if ($[14] !== alignItems || $[15] !== title || $[16] !== text || $[17] !== footer) {
    box = jsxProd_default_2(Box, {
      flexDirection: "column",
      alignItems,
      children: [title, text, footer],
    });
    $[14] = alignItems;
    $[15] = title;
    $[16] = text;
    $[17] = footer;
    $[18] = box;
  } else box = $[18];
  return box;
}
export { StartupAnnouncementNotice };
