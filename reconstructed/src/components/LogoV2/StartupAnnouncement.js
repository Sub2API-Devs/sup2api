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
import { pickStartupAnnouncement } from "../../services/startupAnnouncements.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Me } from "../design-system/ThemeProvider.js";
import { Dt, at } from "./CondensedLogo.js";
import { y, Se } from "../../../vendor/react/cjs/react.production.js";
import { SlashLinkContexts } from "../SlashCommandLink.js";
import { logEvent } from "../../services/analytics/index.js";
import { ye } from "../../utils/startupMarks.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, BaseText, Box } from "../../ink/components/Text.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";

//@ chunk-ag5x7vhf.js:95169-95198 placement
function q0() {
  return pickStartupAnnouncement(!1);
}
//@ chunk-ag5x7vhf.js:95198-96305 placement
function StartupAnnouncementNotice() {
  let T = w(19),
    { storageV5: storageV5 } = Me(),
    h = Dt(),
    [x] = y(q0),
    k;
  if (T[0] !== h || T[1] !== x)
    ((k = h ? pickStartupAnnouncement(!0) : x), (T[0] = h), (T[1] = x), (T[2] = k));
  else k = T[2];
  let _ = k,
    I = Se(SlashLinkContexts),
    D;
  if (T[3] !== _ || T[4] !== storageV5)
    ((D = () => {
      if (!_) {
        return;
      }
      (logEvent("tengu_startup_announcement_shown", {
        announcement_id: ye(_.id),
        impression: (getGlobalConfig().announcementImpressions?.[_.id] ?? 0) + 1,
      }),
        saveGlobalConfig(
          (A) => ({
            ...A,
            announcementImpressions: {
              ...A.announcementImpressions,
              [_.id]: (A.announcementImpressions?.[_.id] ?? 0) + 1,
            },
          }),
          storageV5,
        ));
    }),
      (T[3] = _),
      (T[4] = storageV5),
      (T[5] = D));
  else D = T[5];
  const L = _ !== void 0;
  let V;
  if (T[6] !== L) ((V = { enabled: L }), (T[6] = L), (T[7] = V));
  else V = T[7];
  if ((at("startup-announcement", D, V), !_)) {
    return null;
  }
  const W = I ? "center" : void 0;
  let z;
  if (T[8] !== _.title)
    ((z = _.title ? e(Text, { color: "claude", children: _.title }) : null), (T[8] = _.title), (T[9] = z));
  else z = T[9];
  let K;
  if (T[10] !== _.text) ((K = e(MarkdownText_2, { children: _.text })), (T[10] = _.text), (T[11] = K));
  else K = T[11];
  let q;
  if (T[12] !== _.footer)
    ((q = _.footer ? e(BaseText, { dim: !0, children: _.footer }) : null), (T[12] = _.footer), (T[13] = q));
  else q = T[13];
  let Y;
  if (T[14] !== W || T[15] !== z || T[16] !== K || T[17] !== q)
    ((Y = r(Box, { flexDirection: "column", alignItems: W, children: [z, K, q] })),
      (T[14] = W),
      (T[15] = z),
      (T[16] = K),
      (T[17] = q),
      (T[18] = Y));
  else Y = T[18];
  return Y;
}

export { StartupAnnouncementNotice };
