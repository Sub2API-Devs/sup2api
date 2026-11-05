/**
 * components/artifacts/artifactFrames.ts
 *
 * 2.1.316 新增。Artifact 帧/预览渲染辅助。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (26)
 * attribution: placement 26
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { basename, parse } from "path";
import { init_react_production, useState } from "../../../vendor/react/cjs/react.production.js";
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
import { deleteDeferredSurface } from "../../services/liveReplica/liveReplica.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { Text, Box } from "../../ink/components/Text.js";
import { BOXED_DIAMOND_GLYPH } from "../../constants/figures.js";
import { formatRelativeTime, truncateToWidth } from "../../utils/format.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { isPublishToolEnabled } from "../../services/artifacts/artifactToolGates.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:561218-561222 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:561218", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:670714-671322 placement
function visibleArtifactFrames(frameUrls) {
  let frameBySlug = new Map();
  for (let [key, value] of Object.entries(frameUrls).reverse()) {
    let slug = uuidSlugFromUrl(value.url);
    if (slug === null || value.dismissed === true) continue;
    let existing = frameBySlug.get(slug);
    let preferNewKey = existing !== undefined && existing.key.startsWith(OPENED) && !key.startsWith(OPENED);
    if (existing !== undefined && !preferNewKey) continue;
    let sourceFile = isPersistableFrameUrl(key) ? undefined : stripAnsiAndControls(basename(key));
    let title = value.title !== undefined ? sanitizeFrameTitle(value.title) : null;
    frameBySlug.set(slug, {
      key,
      artifact: {
        slug,
        title:
          title ??
          (sourceFile !== undefined
            ? parse(sourceFile).name
            : stripAnsiAndControls(key.slice(key.indexOf(":") + 1))),
        ...(sourceFile !== undefined && {
          sourceFile,
        }),
        updatedAt: value.updatedAt,
        isAttached: value.mcpPublished === true || (!key.startsWith(OPENED) && !isCreatedFrameUrl(key)),
        ...(value.mcpPublished === true && {
          mcpPublished: true,
        }),
      },
    });
  }
  return Array.from(frameBySlug.values(), (entry) => entry.artifact);
}
//@ chunk-czq1j3j2.js:671322-671355 placement
function sanitizeFrameTitle(title) {
  return sanitizeDisplayTitle(stripAnsiAndControls(title));
}
//@ chunk-czq1j3j2.js:671355-671442 placement
/**
 * 按 slug 从 frameUrls 里找出对应条目（比较 URL 里的 uuid slug）。
 */
function framesForSlug(frameUrls, slug) {
  return Object.entries(frameUrls)
    .filter(([, value]) => uuidSlugFromUrl(value.url) === slug)
    .map(([key]) => key);
}
//@ chunk-czq1j3j2.js:671442-671652 placement
/**
 * 关闭某个 Artifact 帧：特定类型直接从 frameUrls 删除，否则标记 dismissed。
 */
function dismissFrameUrl(state, key) {
  let entry = state.frameUrls[key];
  if (entry === undefined || entry.dismissed === true) return state;
  if (isPersistableFrameUrl(key)) {
    let { [key]: removed, ...restFrames } = state.frameUrls;
    return {
      ...state,
      frameUrls: restFrames,
    };
  }
  return {
    ...state,
    frameUrls: {
      ...state.frameUrls,
      [key]: {
        ...entry,
        dismissed: true,
      },
    },
  };
}
//@ chunk-czq1j3j2.js:671652-671736 placement
function frameOpenFailed(state) {
  if (state.frameOpenFailedPath == null) return state.frameOpenFailedSeen;
  return true;
}
//@ chunk-czq1j3j2.js:672062-672095 placement
var CLOUD_ARTIFACT_CHECKING = "cloud-artifact-checking";
//@ chunk-czq1j3j2.js:672095-673218 placement
function openArtifactRow(row, store, notifications, cloudRowCheck) {
  if (row.fromCloudSession !== true && row.mcpPublished !== true) {
    openArtifactInBrowser(row.url, store.setState, notifications);
    return;
  }
  let feature = row.fromCloudSession === true ? "artifact_cloud_row_open" : "artifact_mcp_row_open";
  let target = parseArtifactUrl(row.url);
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
    if (!hasLiveFrameUrl(store.getState().frameUrls, row.url)) return;
    if (result.ok) {
      if (feature === "artifact_cloud_row_open") logFeatureOk("artifact_cloud_row_open");
      else logFeatureOk("artifact_mcp_row_open");
      notifications.removeNotification(CLOUD_ARTIFACT_CHECKING);
      openArtifactInBrowser(row.url, store.setState, notifications);
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
//@ chunk-czq1j3j2.js:673218-673299 placement
function hasLiveFrameUrl(frameUrls, url) {
  return Object.values(frameUrls).some((entry) => entry.url === url && entry.dismissed !== true);
}
//@ chunk-czq1j3j2.js:673299-673673 placement
function openArtifactInBrowser(url, setState, notifications) {
  openValidatedUrl(withBannerOpenVia(url)).then((validatedUrl) => {
    if (!validatedUrl.ok && validatedUrl.reason !== "timeout") {
      notifications.addNotification({
        key: "artifact-browser-not-opened",
        kind: "feedback",
        text: `Couldn't open your browser. Open ${stripAnsiAndControls(url)} yourself.`,
        priority: "medium",
        invalidates: [CLOUD_ARTIFACT_CHECKING],
      });
      return;
    }
    deleteDeferredSurface(uuidSlugFromUrl(url) ?? "");
  });
  logFeatureOk("frame_link_open");
  setState((prevState) => {
    let failed = frameOpenFailed(prevState);
    return failed === prevState.frameOpenFailedSeen
      ? prevState
      : {
          ...prevState,
          frameOpenFailedSeen: failed,
        };
  });
}
//@ chunk-czq1j3j2.js:673673-673766 placement
function liveFramesForSlug(frameUrls, slug) {
  return Object.values(frameUrls)
    .filter((entry) => entry.dismissed !== true && uuidSlugFromUrl(entry.url) === slug)
    .at(-1);
}
//@ chunk-czq1j3j2.js:673766-673861 placement
function visibleFrameUrls(frameUrls) {
  return Object.values(frameUrls)
    .filter((entry) => entry.dismissed !== true && uuidSlugFromUrl(entry.url) !== null)
    .at(-1);
}
//@ chunk-czq1j3j2.js:673861-673974 placement
function withBannerOpenVia(url) {
  try {
    let parsedUrl = new URL(url);
    parsedUrl.searchParams.set("via", "banner_open");
    return parsedUrl.toString();
  } catch {
    return url;
  }
}
//@ chunk-czq1j3j2.js:673974-674011 placement
function selectFrameUrls(appState) {
  return appState.frameUrls;
}
//@ chunk-czq1j3j2.js:674011-674180 placement
/**
 * 渲染 Artifact 列表中的一项：标题、图标、来源文件与相对更新时间。
 */
function renderArtifactListItem(artifact) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: artifact.title,
      icon: jsxProd_default(Text, {
        color: "claude",
        children: BOXED_DIAMOND_GLYPH,
      }),
      meta: [
        artifact.sourceFile ?? "",
        artifact.updatedAt > 0 ? formatRelativeTime(new Date(artifact.updatedAt)) : "",
      ],
    },
    artifact.slug,
  );
}
//@ chunk-czq1j3j2.js:729342-729346 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:729342", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:742624-742628 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:742624", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:746961-746965 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:746961", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:803450-803498 placement
function selectHasVisibleFrames(appState) {
  return visibleArtifactFrames(appState.frameUrls).length > 0;
}
//@ chunk-czq1j3j2.js:803498-803654 placement
function shouldShowFrameOpenFailure(appState) {
  let failedEntry =
    appState.frameOpenFailedPath != null ? appState.frameUrls[appState.frameOpenFailedPath] : undefined;
  return (
    failedEntry !== undefined && failedEntry.dismissed !== true && appState.frameOpenFailedSeen === false
  );
}
//@ chunk-czq1j3j2.js:803654-803691 placement
function selectFrameUrls2(appState) {
  return appState.frameUrls;
}
//@ chunk-czq1j3j2.js:803691-803744 placement
function selectFrameFooter(appState) {
  return appState.footerSelection === "frame";
}
//@ chunk-czq1j3j2.js:803744-803755 placement
var MAX_FRAME_TITLE_WIDTH = 24;
//@ chunk-czq1j3j2.js:803755-803849 placement
function useFrameFooterState() {
  let $ = useMemoCache(2);
  let appState = useAppState(selectHasVisibleFrames);
  let enabled;
  if ($[0] !== appState) {
    enabled = appState && isPublishToolEnabled();
    $[0] = appState;
    $[1] = enabled;
  } else enabled = $[1];
  return enabled;
}
//@ chunk-czq1j3j2.js:803849-803877 placement
function useFrameOpenFailure() {
  return useAppState(shouldShowFrameOpenFailure);
}
//@ chunk-czq1j3j2.js:803877-805001 placement
function ArtifactFramesPill(props) {
  let $ = useMemoCache(16);
  let { onOpen } = props;
  let frameFooterState = useFrameFooterState();
  let appState = useAppState(selectFrameUrls2);
  let artifacts;
  if ($[0] !== appState) {
    artifacts = visibleArtifactFrames(appState);
    $[0] = appState;
    $[1] = artifacts;
  } else artifacts = $[1];
  let visibleFrames = artifacts;
  let appState_2 = useAppState(selectFrameFooter);
  let frameOpenFailure = useFrameOpenFailure();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let [isHovered, setIsHovered] = useState(false);
  if (!frameFooterState) {
    return null;
  }
  let [firstFrame] = visibleFrames;
  let singleLabel;
  if ($[2] !== visibleFrames.length || $[3] !== firstFrame) {
    singleLabel =
      visibleFrames.length === 1 && firstFrame
        ? truncateToWidth(
            firstFrame.sourceFile !== undefined ? parse(firstFrame.sourceFile).name : firstFrame.title,
            MAX_FRAME_TITLE_WIDTH,
          )
        : null;
    $[2] = visibleFrames.length;
    $[3] = firstFrame;
    $[4] = singleLabel;
  } else singleLabel = $[4];
  let label = singleLabel;
  if (isScreenReaderEnabled) {
    const children = label !== null ? `artifact ${label}` : `${visibleFrames.length} artifacts`;
    let accessibleText;
    if ($[5] !== children) {
      accessibleText = jsxProd_default(Text, {
        children,
      });
      $[5] = children;
      $[6] = accessibleText;
    } else accessibleText = $[6];
    return accessibleText;
  }
  let countText = label ?? String(visibleFrames.length);
  let highlighted = appState_2 || isHovered;
  let pillText;
  if ($[7] !== highlighted || $[8] !== countText || $[9] !== frameOpenFailure) {
    pillText = highlighted
      ? jsxProd_default_2(Text, {
          color: "claude",
          inverse: true,
          children: [BOXED_DIAMOND_GLYPH, " ", countText],
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
              children: countText,
            }),
          ],
        });
    $[7] = highlighted;
    $[8] = countText;
    $[9] = frameOpenFailure;
    $[10] = pillText;
  } else pillText = $[10];
  let pill = pillText;
  if (!onOpen || getArtifactPublishStubDir() !== null) {
    return pill;
  }
  let onMouseEnter;
  let onMouseLeave;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => setIsHovered(true);
    onMouseLeave = () => setIsHovered(false);
    $[11] = onMouseEnter;
    $[12] = onMouseLeave;
  } else {
    onMouseEnter = $[11];
    onMouseLeave = $[12];
  }
  let clickablePill;
  if ($[13] !== onOpen || $[14] !== pill) {
    clickablePill = jsxProd_default(Box, {
      onClick: onOpen,
      onMouseEnter,
      onMouseLeave,
      children: pill,
    });
    $[13] = onOpen;
    $[14] = pill;
    $[15] = clickablePill;
  } else clickablePill = $[15];
  return clickablePill;
}
export {
  useFrameOpenFailure,
  visibleArtifactFrames,
  useFrameFooterState,
  ArtifactFramesPill,
  visibleFrameUrls,
  openArtifactRow,
  frameOpenFailed,
  liveFramesForSlug,
  selectFrameUrls,
  renderArtifactListItem,
  framesForSlug,
  dismissFrameUrl,
};
