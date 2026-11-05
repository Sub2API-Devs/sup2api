/**
 * components/pluginUi/render/terminalImages.tsx
 *
 * 2.1.316 新增。插件渲染中的终端图片（Kitty 协议）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rkbsrtg1.js (22)
 * attribution: sole-consumer 1, placement 21
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { writeFile, unlink } from "fs/promises";
import { formatSkillLoadingMetadata_2 } from "../../../utils/processUserInput/processSlashCommand.js";
import {
  useContext,
  useState,
  useLayoutEffect,
  useSyncExternalStore,
  createElement,
  init_react_production,
  useEffect,
} from "../../../../vendor/react/cjs/react.production.js";
import { RenderInstance } from "./actionKeys.js";
import { clockContext } from "../../../ink/components/ClockContext.js";
import { surfaceClientHost } from "../../../plugins/functionHooks/surfaceClients.js";
import { createTicker, RenderHostElement } from "./MarkdownBlock.js";
import { SentryErrorBoundary } from "../../SentryErrorBoundary.js";
import { firstThrowReport, tellerOf } from "../../../plugins/functionHooks/ui/renderDispatch.js";
import { findLoadedModule } from "../../../plugins/hooksModules/loadedModuleFilters.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { generateTempFilePath } from "../../../utils/tempDir.js";
import { transmitKittyRgba, buildKittyTransmitSequence } from "../../../ink/termio/kittyGraphics.js";
import { getErrnoCode } from "../../../utils/errors.js";
import {
  getTerminalImageFiles,
  currentKittyGraphics,
  getTerminalCapabilities,
  terminalImageProtocol,
  onImageProtocolSettled,
} from "../../../ink/terminalCapabilities.js";
import { LINE_SCRUB } from "../../../plugins/functionHooks/ui/textScrub.js";
import { logForDebugging } from "../../../utils/debug.js";
import { isDecstbmRendererEnabled } from "../../../ink/nativeCursor.js";
import { isFullscreenEnvEnabled } from "../../../utils/fullscreen.js";
import { env } from "../../../utils/env.js";
import { isNamedImageSource, toImageRequest } from "../../../plugins/functionHooks/ui/imageSource.js";
import { buildItermImageSequence, encodeRgbaPng } from "../../../ink/termio/iterm2Image.js";
import { getImagePath } from "../../../utils/imageStore.js";
import { sequential } from "../../../utils/sequential.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-rkbsrtg1.js:33071-33373 sole-consumer
var placeholderImageInstance; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rkbsrtg1.js:33071", () => {
  placeholderImageInstance = Object.freeze({
    id: "",
    plugin: "",
    module: "",
    subscribe: () => () => {
      return;
    },
    getSnapshot: () => formatSkillLoadingMetadata_2,
    setProps: () => {
      return;
    },
    laidOut: () => {
      return;
    },
    resize: () => {
      return;
    },
    pointer: () => {
      return;
    },
    key: () => {
      return;
    },
    acceptsPointer: () => false,
    acceptsKeys: () => false,
    threw: () => {
      return;
    },
    drawnAgain: () => {
      return;
    },
    release: () => {
      return;
    },
  });
});
//@ chunk-rkbsrtg1.js:33373-33391 placement
var DETACHED = "detached";
//@ chunk-rkbsrtg1.js:33391-33710 placement
/**
 * 获取并持有插件图片渲染实例（卸载时释放）。
 */
function usePluginImageInstance(props) {
  let { plugin, elementKey, props: props_2 } = props;
  let renderInstance = useContext(RenderInstance);
  let clock = useContext(clockContext);
  let [instance, setInstance] = useState(placeholderImageInstance);
  let [initialProps] = useState(() => props_2);
  useLayoutEffect(() => {
    let host = surfaceClientHost.acquire({
      plugin,
      component: renderInstance?.component ?? "AbovePrompt",
      requestId: renderInstance?.requestId ?? DETACHED,
      surface: "terminal",
      key: elementKey,
      module: props.module,
      props: initialProps,
      clock: createTicker(clock),
    });
    setInstance(host);
    return () => host.release();
  }, [plugin, props.module, elementKey, renderInstance, clock, initialProps]);
  return instance;
}
//@ chunk-rkbsrtg1.js:33710-34099 placement
/**
 * 插件图片元素（错误边界与占位回退）。
 */
function PluginImageElement(props) {
  let pluginImageInstance = usePluginImageInstance(props);
  let snapshot = useSyncExternalStore(pluginImageInstance.subscribe, pluginImageInstance.getSnapshot);
  let component = useContext(RenderInstance)?.component ?? "AbovePrompt";
  let { width, height, flexGrow } = props;
  return createElement(SentryErrorBoundary, {
    resetKey: snapshot,
    telemetryMessage: () =>
      firstThrowReport(
        component,
        tellerOf([findLoadedModule(props.plugin)].filter((component) => component !== undefined)),
        "Client",
      ),
    onError: pluginImageInstance.threw,
    fallback: createElement(
      Box,
      {
        flexShrink: 0,
        width,
        height,
        flexGrow,
        overflow: "hidden",
      },
      createElement(Text, null, " "),
    ),
    children: createElement(RenderHostElement, {
      host: props,
      instance: pluginImageInstance,
      snapshot,
    }),
  });
}
//@ chunk-rkbsrtg1.js:34099-34103 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rkbsrtg1.js:34099", () => {
  init_react_production();
});
//@ chunk-rkbsrtg1.js:34103-34107 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rkbsrtg1.js:34103", () => {
  init_react_production();
});
//@ chunk-rkbsrtg1.js:34161-34249 placement
var IMAGE_CELL_WIDTH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var IMAGE_CELL_HEIGHT;
var IMAGE_MAX_SIDE;
var RETRYABLE_IO_ERRORS;
deferInit("chunk-rkbsrtg1.js:34161", () => {
  IMAGE_CELL_WIDTH = 24;
  IMAGE_CELL_HEIGHT = 4;
  IMAGE_MAX_SIDE = 384;
  RETRYABLE_IO_ERRORS = new Set(["EAGAIN", "EBUSY", "EINTR", "EMFILE", "ENFILE", "ENOSPC"]);
});
//@ chunk-rkbsrtg1.js:34249-34922 placement
/**
 * 探测终端是否接受 Kitty 文件方式传图（写临时文件后查询）。
 */
async function probeKittyFileTransfer(querier, images) {
  let imageId = images.allocate(IMAGE_CELL_WIDTH);
  if (imageId === undefined) return imageInconclusive("probe: no image id to ask under");
  let tempPath;
  try {
    tempPath = generateTempFilePath("tty-graphics-protocol", ".rgba");
    await writeFile(tempPath, Buffer.alloc(IMAGE_CELL_HEIGHT), {
      mode: IMAGE_MAX_SIDE,
    });
    let [fileResult, supportResult] = await Promise.all([
      querier.send({
        request: transmitKittyRgba(imageId, tempPath),
        match: (state) => state.type === "kittyGraphics" && state.id === imageId,
      }),
      querier.flush(),
    ]);
    return fileResult !== undefined
      ? imageAnswered({
          value: fileResult.message === "OK",
          source: `probe: file query answered ${fileResult.message}`,
        })
      : supportResult
        ? imageAnswered({
            value: false,
            source: "probe: no reply to the file query",
          })
        : imageInconclusive("probe: the query was dropped");
  } catch (error) {
    let errnoCode = getErrnoCode(error) ?? "error";
    let source = `probe: could not write its file (${errnoCode})`;
    return RETRYABLE_IO_ERRORS.has(errnoCode)
      ? imageInconclusive(source)
      : imageAnswered({
          value: false,
          source,
        });
  } finally {
    images.free(imageId);
    if (tempPath !== undefined) await unlink(tempPath).catch(() => {});
  }
}
//@ chunk-rkbsrtg1.js:34922-34970 placement
function imageAnswered(answer) {
  return {
    kind: "answered",
    answer,
  };
}
//@ chunk-rkbsrtg1.js:34970-35022 placement
function imageInconclusive(source) {
  return {
    kind: "inconclusive",
    source,
  };
}
//@ chunk-rkbsrtg1.js:35022-35509 placement
/**
 * 需要时发起一次文件传图探测并记录结论（不确定时下次再问）。
 */
function ensureImageFileProbe(querier, images) {
  let terminalImageFiles = getTerminalImageFiles();
  if (!(querier !== null && images !== null && currentKittyGraphics() && terminalImageFiles.begin())) return;
  probeKittyFileTransfer(querier, images)
    .then((probe) => {
      let replaced = (probe.kind === "inconclusive" ? probe.source : probe.answer.source).replace(
        LINE_SCRUB,
        "?",
      );
      if (probe.kind === "inconclusive") {
        logForDebugging(`Terminal image files: not known yet (${replaced}); asked again when next needed`);
        terminalImageFiles.unask();
        return;
      }
      let answer = probe.answer.value ? "yes" : "no";
      logForDebugging(`Terminal image files: ${answer} (${replaced})`);
      terminalImageFiles.answer({
        value: probe.answer.value,
        source: replaced,
      });
    })
    .catch((error) =>
      logForDebugging(`Terminal image files: a listener threw (${error})`, {
        level: "warn",
      }),
    );
}
//@ chunk-rkbsrtg1.js:35509-36003 placement
/**
 * iTerm2 图片支持判定（滚动区域模式、经典渲染器、全量重绘时不画）。
 */
function itermImageSupport() {
  let capability = getTerminalCapabilities().get("itermImages");
  if (capability.state !== "settled" || !capability.value) return capability;
  if (isDecstbmRendererEnabled())
    return imageSettledUnavailable("Claude Code's scroll-region display mode draws none");
  if (!isFullscreenEnvEnabled())
    return imageSettledUnavailable(
      "Claude Code's classic renderer would send the picture again for every new line; fullscreen rendering (/tui fullscreen) draws it",
    );
  if (env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT)
    return imageSettledUnavailable(
      "CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT is set, so every frame repaints the screen and would send the picture again each time",
    );
  return capability;
}
//@ chunk-rkbsrtg1.js:36003-36060 placement
function imageSettledUnavailable(source) {
  return {
    state: "settled",
    value: false,
    source,
  };
}
//@ chunk-rkbsrtg1.js:36060-36296 placement
function itermImageSequenceThunk(image) {
  let { source, columns, rows } = image;
  if (isNamedImageSource(source))
    return () => {
      throw TypeError("iTerm2 image: a file or shm source is not sent");
    };
  let sequence;
  return () => {
    sequence ??= buildItermImageSequence({
      pngBase64: getImagePath(source) ? source.png : encodeRgbaPng(source.rgba, source.width, source.height),
      columns,
      rows,
    });
    return sequence;
  };
}
//@ chunk-rkbsrtg1.js:36296-36376 placement
var terminalImagePainter = (image) => (id) =>
  buildKittyTransmitSequence({
    id,
    source: toImageRequest(image.source),
    columns: image.columns,
    rows: image.rows,
  });
//@ chunk-rkbsrtg1.js:36376-36388 placement
var IMAGE_PROBE_TIMEOUT_MS = 5000;
//@ chunk-rkbsrtg1.js:36388-36640 placement
function createRefusalLogger(info) {
  let { plugin, requestId, key } = info;
  let label = key === undefined ? "Image" : `Image "${key}"`;
  let lastMessage = "";
  let lastAt = -1 / 0;
  return (message) => {
    let now = Date.now();
    if (message === lastMessage && now - lastAt < IMAGE_PROBE_TIMEOUT_MS) return;
    lastMessage = message;
    lastAt = now;
    logForDebugging(
      `${label} (${plugin}) in ${requestId}: the terminal refused its source: ` +
        message.replace(LINE_SCRUB, "?"),
      {
        level: "warn",
      },
    );
  };
}
//@ chunk-rkbsrtg1.js:36640-36690 placement
var EMPTY_IMAGE_STATE = {
  reactKey: undefined,
  source: undefined,
  box: undefined,
};
//@ chunk-rkbsrtg1.js:36690-36694 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rkbsrtg1.js:36690", () => {
  init_react_production();
});
//@ chunk-rkbsrtg1.js:36694-36755 placement
var IMAGE_ID_WIDTHS = {
  indexed: 2,
  truecolor: 3,
  smallIdWidth: 8,
  wideIdWidth: 24,
};
//@ chunk-rkbsrtg1.js:36755-37036 placement
function useImageProtocol() {
  let [protocol, setProtocol] = useState(terminalImageProtocol);
  useEffect(() => onImageProtocolSettled(setProtocol), []);
  if (protocol === "iterm") {
    let itermSupport = itermImageSupport();
    return itermSupport.state === "settled" && itermSupport.value
      ? {
          protocol,
          width: IMAGE_ID_WIDTHS.smallIdWidth,
        }
      : undefined;
  }
  if (protocol === undefined || sequential.level < IMAGE_ID_WIDTHS.indexed) return;
  let isWide = sequential.level >= IMAGE_ID_WIDTHS.truecolor;
  return {
    protocol,
    width: isWide ? IMAGE_ID_WIDTHS.wideIdWidth : IMAGE_ID_WIDTHS.smallIdWidth,
  };
}
//@ chunk-rkbsrtg1.js:37036-37040 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rkbsrtg1.js:37036", () => {
  init_react_production();
});
export {
  ensureImageFileProbe,
  itermImageSequenceThunk,
  terminalImagePainter,
  DETACHED,
  useImageProtocol,
  EMPTY_IMAGE_STATE,
  createRefusalLogger,
  itermImageSupport,
  PluginImageElement,
};
