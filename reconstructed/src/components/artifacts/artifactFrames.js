/**
 * components/artifacts/artifactFrames.ts
 *
 * 2.1.316 新增。Artifact 帧/预览渲染辅助。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (26)
 * attribution: placement 26
 */
import {
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  parse,
  parse as parse_2,
  parse as parse_3,
} from "path";
import { j, y } from "../../../vendor/react/cjs/react.production.js";
import {
  uuidSlugFromUrl,
  parseArtifactUrl,
  getArtifactPublishStubDir,
} from "../../tools/ArtifactTool/constants.js";
import { OPENED, rRe, Qet } from "../../tools/ArtifactTool/artifactResumeCarry.js";
import { stripAnsiAndControls } from "../../utils/printableName.js";
import { sanitizeDisplayTitle } from "../../utils/textNormalize.js";
import { probeArtifactForOpen, Bjn, describeOpenFailure } from "../../services/artifacts/openArtifact.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { openValidatedUrl } from "../../utils/browser.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { Text, Box } from "../../ink/components/Text.js";
import { hf } from "../../utils/permissions/autoModeRulesPrompt.js";
import { formatRelativeTime, truncateToWidth } from "../../utils/format.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { isPublishToolEnabled } from "../../services/artifacts/artifactToolGates.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-18hwfzwa.js:649982-649986 placement
j();
//@ chunk-18hwfzwa.js:650033-650641 placement
function visibleArtifactFrames(h) {
  let x = new Map();
  for (let [D, L] of Object.entries(h).reverse()) {
    let ee = uuidSlugFromUrl(L.url);
    if (ee === null || L.dismissed === !0) continue;
    let ke = x.get(ee),
      Re = ke !== void 0 && ke.key.startsWith(OPENED) && !D.startsWith(OPENED);
    if (ke !== void 0 && !Re) continue;
    let Be = rRe(D) ? void 0 : stripAnsiAndControls(basename_5(D)),
      He = L.title !== void 0 ? fYt(L.title) : null;
    x.set(ee, {
      key: D,
      artifact: {
        slug: ee,
        title: He ?? (Be !== void 0 ? parse(Be).name : stripAnsiAndControls(D.slice(D.indexOf(":") + 1))),
        ...(Be !== void 0 && { sourceFile: Be }),
        updatedAt: L.updatedAt,
        isAttached: L.mcpPublished === !0 || (!D.startsWith(OPENED) && !Qet(D)),
        ...(L.mcpPublished === !0 && { mcpPublished: !0 }),
      },
    });
  }
  return Array.from(x.values(), (D) => D.artifact);
}
//@ chunk-18hwfzwa.js:650641-650674 placement
function fYt(h) {
  return sanitizeDisplayTitle(stripAnsiAndControls(h));
}
//@ chunk-18hwfzwa.js:650674-650761 placement
function Dpo(h, x) {
  return Object.entries(h)
    .filter(([, D]) => uuidSlugFromUrl(D.url) === x)
    .map(([D]) => D);
}
/**
 * 关闭某个 Artifact 帧：特定类型直接从 frameUrls 删除，否则标记 dismissed。
 */
//@ chunk-18hwfzwa.js:650761-650971 placement
function dismissFrameUrl(h, x) {
  let D = h.frameUrls[x];
  if (D === void 0 || D.dismissed === !0) return h;
  if (rRe(x)) {
    let { [x]: L, ...ee } = h.frameUrls;
    return { ...h, frameUrls: ee };
  }
  return { ...h, frameUrls: { ...h.frameUrls, [x]: { ...D, dismissed: !0 } } };
}
//@ chunk-18hwfzwa.js:650971-651055 placement
function k2(h) {
  if (h.frameOpenFailedPath == null) return h.frameOpenFailedSeen;
  return !0;
}
//@ chunk-18hwfzwa.js:651381-651414 placement
var CLOUD_ARTIFACT_CHECKING = "cloud-artifact-checking";
//@ chunk-18hwfzwa.js:651414-652537 placement
function openArtifactRow(h, x, D, L) {
  if (h.fromCloudSession !== !0 && h.mcpPublished !== !0) {
    openArtifactInBrowser(h.url, x.setState, D);
    return;
  }
  let ee = h.fromCloudSession === !0 ? "artifact_cloud_row_open" : "artifact_mcp_row_open",
    ke = parseArtifactUrl(h.url);
  if (ke === null) return;
  if (L.inFlight) {
    D.addNotification({
      key: CLOUD_ARTIFACT_CHECKING,
      kind: "feedback",
      text: "Still checking the last artifact you chose.",
      priority: "medium",
    });
    return;
  }
  ((L.inFlight = !0),
    (async () => {
      let Re;
      try {
        Re = await probeArtifactForOpen(ke, ee, AbortSignal.timeout(Bjn));
      } catch {
        if (ee === "artifact_cloud_row_open") logFeatureBad("artifact_cloud_row_open", "check_threw");
        else logFeatureBad("artifact_mcp_row_open", "check_threw");
        Re = { ok: !1, reason: "failed" };
      } finally {
        L.inFlight = !1;
      }
      if (!yYt(x.getState().frameUrls, h.url)) return;
      if (Re.ok) {
        if (ee === "artifact_cloud_row_open") logFeatureOk("artifact_cloud_row_open");
        else logFeatureOk("artifact_mcp_row_open");
        (D.removeNotification(CLOUD_ARTIFACT_CHECKING), openArtifactInBrowser(h.url, x.setState, D));
        return;
      }
      if (Re.reason === "public_outside_org")
        if (ee === "artifact_cloud_row_open") logFeatureBad("artifact_cloud_row_open", "public_outside_org");
        else logFeatureBad("artifact_mcp_row_open", "public_outside_org");
      D.addNotification({
        key: "cloud-artifact-not-opened",
        kind: "feedback",
        text: describeOpenFailure(Re),
        priority: "medium",
        invalidates: [CLOUD_ARTIFACT_CHECKING],
      });
    })().catch(() => {}));
}
//@ chunk-18hwfzwa.js:652537-652618 placement
function yYt(h, x) {
  return Object.values(h).some((D) => D.url === x && D.dismissed !== !0);
}
//@ chunk-18hwfzwa.js:652618-652969 placement
function openArtifactInBrowser(h, x, D) {
  (openValidatedUrl(withBannerOpenVia(h)).then((L) => {
    if (!L.ok && L.reason !== "timeout")
      D.addNotification({
        key: "artifact-browser-not-opened",
        kind: "feedback",
        text: `Couldn't open your browser. Open ${stripAnsiAndControls(h)} yourself.`,
        priority: "medium",
        invalidates: [CLOUD_ARTIFACT_CHECKING],
      });
  }),
    logFeatureOk("frame_link_open"),
    x((L) => {
      let ee = k2(L);
      return ee === L.frameOpenFailedSeen ? L : { ...L, frameOpenFailedSeen: ee };
    }));
}
//@ chunk-18hwfzwa.js:652969-653062 placement
function BO(h, x) {
  return Object.values(h)
    .filter((D) => D.dismissed !== !0 && uuidSlugFromUrl(D.url) === x)
    .at(-1);
}
//@ chunk-18hwfzwa.js:653062-653157 placement
function VKe(h) {
  return Object.values(h)
    .filter((x) => x.dismissed !== !0 && uuidSlugFromUrl(x.url) !== null)
    .at(-1);
}
//@ chunk-18hwfzwa.js:653157-653270 placement
function withBannerOpenVia(h) {
  try {
    let x = new URL(h);
    return (x.searchParams.set("via", "banner_open"), x.toString());
  } catch {
    return h;
  }
}
//@ chunk-18hwfzwa.js:653270-653307 placement
function selectFrameUrls(Lt) {
  return Lt.frameUrls;
}
/**
 * 渲染 Artifact 列表中的一项：标题、图标、来源文件与相对更新时间。
 */
//@ chunk-18hwfzwa.js:653307-653476 placement
function renderArtifactListItem(oo) {
  return e(
    OrderedListWithItem.Item,
    {
      label: oo.title,
      icon: e(Text, { color: "claude", children: hf }),
      meta: [oo.sourceFile ?? "", oo.updatedAt > 0 ? formatRelativeTime(new Date(oo.updatedAt)) : ""],
    },
    oo.slug,
  );
}
//@ chunk-18hwfzwa.js:770990-770994 placement
j();
//@ chunk-18hwfzwa.js:771025-771073 placement
function d8t(L) {
  return visibleArtifactFrames(L.frameUrls).length > 0;
}
//@ chunk-18hwfzwa.js:771073-771229 placement
function shouldShowFrameOpenFailure(h) {
  let x = h.frameOpenFailedPath != null ? h.frameUrls[h.frameOpenFailedPath] : void 0;
  return x !== void 0 && x.dismissed !== !0 && h.frameOpenFailedSeen === !1;
}
//@ chunk-18hwfzwa.js:771229-771266 placement
function selectFrameUrls2(io) {
  return io.frameUrls;
}
//@ chunk-18hwfzwa.js:771266-771319 placement
function p8t(so) {
  return so.footerSelection === "frame";
}
//@ chunk-18hwfzwa.js:771319-771330 placement
var w2e = 24;
//@ chunk-18hwfzwa.js:771330-771424 placement
function ZT() {
  let $ = w(2),
    h = useAppState(d8t),
    D;
  if ($[0] !== h) ((D = h && isPublishToolEnabled()), ($[0] = h), ($[1] = D));
  else D = $[1];
  return D;
}
//@ chunk-18hwfzwa.js:771424-771452 placement
function gj() {
  return useAppState(shouldShowFrameOpenFailure);
}
//@ chunk-18hwfzwa.js:771452-772576 placement
function ArtifactFramesPill(h) {
  let $ = w(16),
    { onOpen: onOpen } = h,
    D = ZT(),
    L = useAppState(selectFrameUrls2),
    ke;
  if ($[0] !== L) ((ke = visibleArtifactFrames(L)), ($[0] = L), ($[1] = ke));
  else ke = $[1];
  let Re = ke,
    Be = useAppState(p8t),
    He = gj(),
    We = useIsScreenReaderEnabled(),
    [ze, Xe] = y(!1);
  if (!D) {
    return null;
  }
  let [rt] = Re,
    kt;
  if ($[2] !== Re.length || $[3] !== rt)
    ((kt =
      Re.length === 1 && rt
        ? truncateToWidth(rt.sourceFile !== void 0 ? parse_2(rt.sourceFile).name : rt.title, w2e)
        : null),
      ($[2] = Re.length),
      ($[3] = rt),
      ($[4] = kt));
  else kt = $[4];
  let At = kt;
  if (We) {
    const It = At !== null ? `artifact ${At}` : `${Re.length} artifacts`;
    let Ot;
    if ($[5] !== It) ((Ot = e(Text, { children: It })), ($[5] = It), ($[6] = Ot));
    else Ot = $[6];
    return Ot;
  }
  let Et = At ?? String(Re.length),
    Dt = Be || ze,
    It;
  if ($[7] !== Dt || $[8] !== Et || $[9] !== He)
    ((It = Dt
      ? r(Text, { color: "claude", inverse: !0, children: [hf, " ", Et] })
      : r(Text, {
          children: [
            e(Text, { color: "claude", children: hf }),
            " ",
            e(Text, { color: He ? "claude" : void 0, dimColor: !He, children: Et }),
          ],
        })),
      ($[7] = Dt),
      ($[8] = Et),
      ($[9] = He),
      ($[10] = It));
  else It = $[10];
  let Lt = It;
  if (!onOpen || getArtifactPublishStubDir() !== null) {
    return Lt;
  }
  let Ot, oo;
  if ($[11] === MEMO_CACHE_SENTINEL) ((Ot = () => Xe(!0)), (oo = () => Xe(!1)), ($[11] = Ot), ($[12] = oo));
  else ((Ot = $[11]), (oo = $[12]));
  let Xt;
  if ($[13] !== onOpen || $[14] !== Lt)
    ((Xt = e(Box, { onClick: onOpen, onMouseEnter: Ot, onMouseLeave: oo, children: Lt })),
      ($[13] = onOpen),
      ($[14] = Lt),
      ($[15] = Xt));
  else Xt = $[15];
  return Xt;
}
//@ chunk-18hwfzwa.js:772576-772580 placement
j();
//@ chunk-18hwfzwa.js:772580-772584 placement
j();

export {
  VKe,
  openArtifactRow,
  selectFrameUrls,
  visibleArtifactFrames,
  BO,
  renderArtifactListItem,
  gj,
  ZT,
  ArtifactFramesPill,
  k2,
  Dpo,
  dismissFrameUrl,
};
