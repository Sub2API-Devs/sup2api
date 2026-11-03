/**
 * components/LogoV2/StartupAnnouncement.tsx
 *
 * 2.1.316 新增：启动公告提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (2)
 * attribution: placement 2
 */
import { pickStartupAnnouncement as pickStartupAnnouncement_2 } from "../../services/startupAnnouncements.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useNoticeImpressionEnabled, useNoticeImpression } from "./CondensedLogo.js";
import { y, Se } from "../../../vendor/react/cjs/react.production.js";
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

//@ chunk-ag5x7vhf.js:95169-95198 placement
function pickStartupAnnouncement() {
  return pickStartupAnnouncement_2(false);
}
//@ chunk-ag5x7vhf.js:95198-96305 placement
function StartupAnnouncementNotice() {
  let T = w(19);
  let { storageV5 } = useTheme_2();
  let noticeImpressionEnabled = useNoticeImpressionEnabled();
  let [x] = y(pickStartupAnnouncement);
  let k;
  if (T[0] !== noticeImpressionEnabled || T[1] !== x) {
    k = noticeImpressionEnabled ? pickStartupAnnouncement_2(true) : x;
    T[0] = noticeImpressionEnabled;
    T[1] = x;
    T[2] = k;
  } else k = T[2];
  let _ = k;
  let I = Se(SlashLinkContexts);
  let D;
  if (T[3] !== _ || T[4] !== storageV5) {
    D = () => {
      if (!_) {
        return;
      }
      logEvent("tengu_startup_announcement_shown", {
        announcement_id: sanitizeMarkName(_.id),
        impression: (getGlobalConfig().announcementImpressions?.[_.id] ?? 0) + 1,
      });
      saveGlobalConfig(
        (A) => ({
          ...A,
          announcementImpressions: {
            ...A.announcementImpressions,
            [_.id]: (A.announcementImpressions?.[_.id] ?? 0) + 1,
          },
        }),
        storageV5,
      );
    };
    T[3] = _;
    T[4] = storageV5;
    T[5] = D;
  } else D = T[5];
  const enabled = _ !== undefined;
  let V;
  if (T[6] !== enabled) {
    V = {
      enabled,
    };
    T[6] = enabled;
    T[7] = V;
  } else V = T[7];
  useNoticeImpression("startup-announcement", D, V);
  if (!_) {
    return null;
  }
  const alignItems = I ? "center" : undefined;
  let z;
  if (T[8] !== _.title) {
    z = _.title
      ? jsxProd_default(Text, {
          color: "claude",
          children: _.title,
        })
      : null;
    T[8] = _.title;
    T[9] = z;
  } else z = T[9];
  let K;
  if (T[10] !== _.text) {
    K = jsxProd_default(MarkdownText_2, {
      children: _.text,
    });
    T[10] = _.text;
    T[11] = K;
  } else K = T[11];
  let q;
  if (T[12] !== _.footer) {
    q = _.footer
      ? jsxProd_default(BaseText, {
          dim: true,
          children: _.footer,
        })
      : null;
    T[12] = _.footer;
    T[13] = q;
  } else q = T[13];
  let Y;
  if (T[14] !== alignItems || T[15] !== z || T[16] !== K || T[17] !== q) {
    Y = jsxProd_default_2(Box, {
      flexDirection: "column",
      alignItems,
      children: [z, K, q],
    });
    T[14] = alignItems;
    T[15] = z;
    T[16] = K;
    T[17] = q;
    T[18] = Y;
  } else Y = T[18];
  return Y;
}
export { StartupAnnouncementNotice };
