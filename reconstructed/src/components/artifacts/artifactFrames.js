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
import { basename, parse } from "path";
import { init_react_production, y } from "../../../vendor/react/cjs/react.production.js";
import {
  uuidSlugFromUrl,
  parseArtifactUrl,
  getArtifactPublishStubDir,
} from "../../tools/ArtifactTool/constants.js";
import {
  OPENED,
  isPersistableFrameUrl,
  isCreatedFrameUrl,
} from "../../tools/ArtifactTool/artifactResumeCarry.js";
import { stripAnsiAndControls } from "../../utils/printableName.js";
import { sanitizeDisplayTitle } from "../../utils/textNormalize.js";
import {
  probeArtifactForOpen,
  OPEN_PROBE_TIMEOUT_MS,
  describeOpenFailure,
} from "../../services/artifacts/openArtifact.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { openValidatedUrl } from "../../utils/browser.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { Text, Box } from "../../ink/components/Text.js";
import { BOXED_DIAMOND_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";
import { formatRelativeTime, truncateToWidth } from "../../utils/format.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { isPublishToolEnabled } from "../../services/artifacts/artifactToolGates.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-18hwfzwa.js:649982-649986 placement
init_react_production();
//@ chunk-18hwfzwa.js:650033-650641 placement
function visibleArtifactFrames(frameUrls) {
  let x = new Map();
  for (let [key, value] of Object.entries(frameUrls).reverse()) {
    let ee = uuidSlugFromUrl(value.url);
    if (ee === null || value.dismissed === true) continue;
    let ke = x.get(ee);
    let Re = ke !== undefined && ke.key.startsWith(OPENED) && !key.startsWith(OPENED);
    if (ke !== undefined && !Re) continue;
    let Be = isPersistableFrameUrl(key) ? undefined : stripAnsiAndControls(basename(key));
    let He = value.title !== undefined ? sanitizeFrameTitle(value.title) : null;
    x.set(ee, {
      key,
      artifact: {
        slug: ee,
        title:
          He ?? (Be !== undefined ? parse(Be).name : stripAnsiAndControls(key.slice(key.indexOf(":") + 1))),
        ...(Be !== undefined && {
          sourceFile: Be,
        }),
        updatedAt: value.updatedAt,
        isAttached: value.mcpPublished === true || (!key.startsWith(OPENED) && !isCreatedFrameUrl(key)),
        ...(value.mcpPublished === true && {
          mcpPublished: true,
        }),
      },
    });
  }
  return Array.from(x.values(), (D) => D.artifact);
}
//@ chunk-18hwfzwa.js:650641-650674 placement
function sanitizeFrameTitle(title) {
  return sanitizeDisplayTitle(stripAnsiAndControls(title));
}
//@ chunk-18hwfzwa.js:650674-650761 placement
/**
 * 按 slug 从 frameUrls 里找出对应条目（比较 URL 里的 uuid slug）。
 */
function framesForSlug(frameUrls, slug) {
  return Object.entries(frameUrls)
    .filter(([, value]) => uuidSlugFromUrl(value.url) === slug)
    .map(([key]) => key);
}
//@ chunk-18hwfzwa.js:650761-650971 placement
/**
 * 关闭某个 Artifact 帧：特定类型直接从 frameUrls 删除，否则标记 dismissed。
 */
function dismissFrameUrl(h, x) {
  let D = h.frameUrls[x];
  if (D === undefined || D.dismissed === true) return h;
  if (isPersistableFrameUrl(x)) {
    let { [x]: L, ...ee } = h.frameUrls;
    return {
      ...h,
      frameUrls: ee,
    };
  }
  return {
    ...h,
    frameUrls: {
      ...h.frameUrls,
      [x]: {
        ...D,
        dismissed: true,
      },
    },
  };
}
//@ chunk-18hwfzwa.js:650971-651055 placement
function frameOpenFailed(h) {
  if (h.frameOpenFailedPath == null) return h.frameOpenFailedSeen;
  return true;
}
//@ chunk-18hwfzwa.js:651381-651414 placement
var CLOUD_ARTIFACT_CHECKING = "cloud-artifact-checking";
//@ chunk-18hwfzwa.js:651414-652537 placement
function openArtifactRow(h, x, notifications, cloudRowCheck) {
  if (h.fromCloudSession !== true && h.mcpPublished !== true) {
    openArtifactInBrowser(h.url, x.setState, notifications);
    return;
  }
  let feature = h.fromCloudSession === true ? "artifact_cloud_row_open" : "artifact_mcp_row_open";
  let target = parseArtifactUrl(h.url);
  if (target === null) return;
  if (cloudRowCheck.inFlight) {
    notifications.addNotification({
      key: CLOUD_ARTIFACT_CHECKING,
      kind: "feedback",
      text: "Still checking the last artifact you chose.",
      priority: "medium",
    });
    return;
  }
  cloudRowCheck.inFlight = true;
  (async () => {
    let result;
    try {
      result = await probeArtifactForOpen(target, feature, AbortSignal.timeout(OPEN_PROBE_TIMEOUT_MS));
    } catch {
      if (feature === "artifact_cloud_row_open") logFeatureBad("artifact_cloud_row_open", "check_threw");
      else logFeatureBad("artifact_mcp_row_open", "check_threw");
      result = {
        ok: false,
        reason: "failed",
      };
    } finally {
      cloudRowCheck.inFlight = false;
    }
    if (!hasLiveFrameUrl(x.getState().frameUrls, h.url)) return;
    if (result.ok) {
      if (feature === "artifact_cloud_row_open") logFeatureOk("artifact_cloud_row_open");
      else logFeatureOk("artifact_mcp_row_open");
      notifications.removeNotification(CLOUD_ARTIFACT_CHECKING);
      openArtifactInBrowser(h.url, x.setState, notifications);
      return;
    }
    if (result.reason === "public_outside_org")
      if (feature === "artifact_cloud_row_open")
        logFeatureBad("artifact_cloud_row_open", "public_outside_org");
      else logFeatureBad("artifact_mcp_row_open", "public_outside_org");
    notifications.addNotification({
      key: "cloud-artifact-not-opened",
      kind: "feedback",
      text: describeOpenFailure(result),
      priority: "medium",
      invalidates: [CLOUD_ARTIFACT_CHECKING],
    });
  })().catch(() => {});
}
//@ chunk-18hwfzwa.js:652537-652618 placement
function hasLiveFrameUrl(frameUrls, url) {
  return Object.values(frameUrls).some((D) => D.url === url && D.dismissed !== true);
}
//@ chunk-18hwfzwa.js:652618-652969 placement
function openArtifactInBrowser(url, setState, D) {
  openValidatedUrl(withBannerOpenVia(url)).then((validatedUrl) => {
    if (!validatedUrl.ok && validatedUrl.reason !== "timeout")
      D.addNotification({
        key: "artifact-browser-not-opened",
        kind: "feedback",
        text: `Couldn't open your browser. Open ${stripAnsiAndControls(url)} yourself.`,
        priority: "medium",
        invalidates: [CLOUD_ARTIFACT_CHECKING],
      });
  });
  logFeatureOk("frame_link_open");
  setState((L) => {
    let ee = frameOpenFailed(L);
    return ee === L.frameOpenFailedSeen
      ? L
      : {
          ...L,
          frameOpenFailedSeen: ee,
        };
  });
}
//@ chunk-18hwfzwa.js:652969-653062 placement
function liveFramesForSlug(frameUrls, slug) {
  return Object.values(frameUrls)
    .filter((D) => D.dismissed !== true && uuidSlugFromUrl(D.url) === slug)
    .at(-1);
}
//@ chunk-18hwfzwa.js:653062-653157 placement
function visibleFrameUrls(frameUrls) {
  return Object.values(frameUrls)
    .filter((x) => x.dismissed !== true && uuidSlugFromUrl(x.url) !== null)
    .at(-1);
}
//@ chunk-18hwfzwa.js:653157-653270 placement
function withBannerOpenVia(h) {
  try {
    let x = new URL(h);
    x.searchParams.set("via", "banner_open");
    return x.toString();
  } catch {
    return h;
  }
}
//@ chunk-18hwfzwa.js:653270-653307 placement
function selectFrameUrls(Lt) {
  return Lt.frameUrls;
}
//@ chunk-18hwfzwa.js:653307-653476 placement
/**
 * 渲染 Artifact 列表中的一项：标题、图标、来源文件与相对更新时间。
 */
function renderArtifactListItem(oo) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: oo.title,
      icon: jsxProd_default(Text, {
        color: "claude",
        children: BOXED_DIAMOND_GLYPH,
      }),
      meta: [oo.sourceFile ?? "", oo.updatedAt > 0 ? formatRelativeTime(new Date(oo.updatedAt)) : ""],
    },
    oo.slug,
  );
}
//@ chunk-18hwfzwa.js:770990-770994 placement
init_react_production();
//@ chunk-18hwfzwa.js:771025-771073 placement
function selectHasVisibleFrames(L) {
  return visibleArtifactFrames(L.frameUrls).length > 0;
}
//@ chunk-18hwfzwa.js:771073-771229 placement
function shouldShowFrameOpenFailure(h) {
  let x = h.frameOpenFailedPath != null ? h.frameUrls[h.frameOpenFailedPath] : undefined;
  return x !== undefined && x.dismissed !== true && h.frameOpenFailedSeen === false;
}
//@ chunk-18hwfzwa.js:771229-771266 placement
function selectFrameUrls2(io) {
  return io.frameUrls;
}
//@ chunk-18hwfzwa.js:771266-771319 placement
function selectFrameFooter(so) {
  return so.footerSelection === "frame";
}
//@ chunk-18hwfzwa.js:771319-771330 placement
var MAX_FRAME_TITLE_WIDTH = 24;
//@ chunk-18hwfzwa.js:771330-771424 placement
function useFrameFooterState() {
  let $ = w(2);
  let appState = useAppState(selectHasVisibleFrames);
  let D;
  if ($[0] !== appState) {
    D = appState && isPublishToolEnabled();
    $[0] = appState;
    $[1] = D;
  } else D = $[1];
  return D;
}
//@ chunk-18hwfzwa.js:771424-771452 placement
function useFrameOpenFailure() {
  return useAppState(shouldShowFrameOpenFailure);
}
//@ chunk-18hwfzwa.js:771452-772576 placement
function ArtifactFramesPill(props) {
  let $ = w(16);
  let { onOpen } = props;
  let frameFooterState = useFrameFooterState();
  let appState = useAppState(selectFrameUrls2);
  let ke;
  if ($[0] !== appState) {
    ke = visibleArtifactFrames(appState);
    $[0] = appState;
    $[1] = ke;
  } else ke = $[1];
  let Re = ke;
  let appState_2 = useAppState(selectFrameFooter);
  let frameOpenFailure = useFrameOpenFailure();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let [ze, Xe] = y(false);
  if (!frameFooterState) {
    return null;
  }
  let [rt] = Re;
  let kt;
  if ($[2] !== Re.length || $[3] !== rt) {
    kt =
      Re.length === 1 && rt
        ? truncateToWidth(
            rt.sourceFile !== undefined ? parse(rt.sourceFile).name : rt.title,
            MAX_FRAME_TITLE_WIDTH,
          )
        : null;
    $[2] = Re.length;
    $[3] = rt;
    $[4] = kt;
  } else kt = $[4];
  let At = kt;
  if (isScreenReaderEnabled) {
    const children = At !== null ? `artifact ${At}` : `${Re.length} artifacts`;
    let Ot;
    if ($[5] !== children) {
      Ot = jsxProd_default(Text, {
        children,
      });
      $[5] = children;
      $[6] = Ot;
    } else Ot = $[6];
    return Ot;
  }
  let Et = At ?? String(Re.length);
  let Dt = appState_2 || ze;
  let It;
  if ($[7] !== Dt || $[8] !== Et || $[9] !== frameOpenFailure) {
    It = Dt
      ? jsxProd_default_2(Text, {
          color: "claude",
          inverse: true,
          children: [BOXED_DIAMOND_GLYPH, " ", Et],
        })
      : jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              color: "claude",
              children: BOXED_DIAMOND_GLYPH,
            }),
            " ",
            jsxProd_default(Text, {
              color: frameOpenFailure ? "claude" : undefined,
              dimColor: !frameOpenFailure,
              children: Et,
            }),
          ],
        });
    $[7] = Dt;
    $[8] = Et;
    $[9] = frameOpenFailure;
    $[10] = It;
  } else It = $[10];
  let Lt = It;
  if (!onOpen || getArtifactPublishStubDir() !== null) {
    return Lt;
  }
  let onMouseEnter;
  let onMouseLeave;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => Xe(true);
    onMouseLeave = () => Xe(false);
    $[11] = onMouseEnter;
    $[12] = onMouseLeave;
  } else {
    onMouseEnter = $[11];
    onMouseLeave = $[12];
  }
  let Xt;
  if ($[13] !== onOpen || $[14] !== Lt) {
    Xt = jsxProd_default(Box, {
      onClick: onOpen,
      onMouseEnter,
      onMouseLeave,
      children: Lt,
    });
    $[13] = onOpen;
    $[14] = Lt;
    $[15] = Xt;
  } else Xt = $[15];
  return Xt;
}
//@ chunk-18hwfzwa.js:772576-772580 placement
init_react_production();
//@ chunk-18hwfzwa.js:772580-772584 placement
init_react_production();
export {
  useFrameFooterState,
  frameOpenFailed,
  visibleArtifactFrames,
  liveFramesForSlug,
  openArtifactRow,
  visibleFrameUrls,
  selectFrameUrls,
  renderArtifactListItem,
  useFrameOpenFailure,
  ArtifactFramesPill,
  framesForSlug,
  dismissFrameUrl,
};
