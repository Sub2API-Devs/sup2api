/**
 * components/pluginUi/render/terminalImages.tsx
 *
 * 2.1.316 新增。插件渲染中的终端图片（Kitty 协议）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bc20zedk.js (22)
 * attribution: sole-consumer 1, placement 21
 */
import { writeFile, unlink } from "fs/promises";
import { formatSkillLoadingMetadata_2 } from "../../../utils/processUserInput/processSlashCommand.js";
import {
  Se,
  y,
  zt,
  yt,
  Vc,
  init_react_production,
  P,
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

//@ chunk-bc20zedk.js:33069-33371 sole-consumer
var _o = Object.freeze({
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
//@ chunk-bc20zedk.js:33371-33389 placement
var DETACHED = "detached";
//@ chunk-bc20zedk.js:33389-33708 placement
/**
 * 获取并持有插件图片渲染实例（卸载时释放）。
 */
function usePluginImageInstance(props) {
  let { plugin, elementKey, props: props_2 } = props;
  let f = Se(RenderInstance);
  let u = Se(clockContext);
  let [c, g] = y(_o);
  let [x] = y(() => props_2);
  zt(() => {
    let h = surfaceClientHost.acquire({
      plugin,
      component: f?.component ?? "AbovePrompt",
      requestId: f?.requestId ?? DETACHED,
      surface: "terminal",
      key: elementKey,
      module: props.module,
      props: x,
      clock: createTicker(u),
    });
    g(h);
    return () => h.release();
  }, [plugin, props.module, elementKey, f, u, x]);
  return c;
}
//@ chunk-bc20zedk.js:33708-34097 placement
/**
 * 插件图片元素（错误边界与占位回退）。
 */
function PluginImageElement(props) {
  let pluginImageInstance = usePluginImageInstance(props);
  let a = yt(pluginImageInstance.subscribe, pluginImageInstance.getSnapshot);
  let component = Se(RenderInstance)?.component ?? "AbovePrompt";
  let { width, height, flexGrow } = props;
  return Vc(SentryErrorBoundary, {
    resetKey: a,
    telemetryMessage: () =>
      firstThrowReport(
        component,
        tellerOf([findLoadedModule(props.plugin)].filter((g) => g !== undefined)),
        "Client",
      ),
    onError: pluginImageInstance.threw,
    fallback: Vc(
      Box,
      {
        flexShrink: 0,
        width,
        height,
        flexGrow,
        overflow: "hidden",
      },
      Vc(Text, null, " "),
    ),
    children: Vc(RenderHostElement, {
      host: props,
      instance: pluginImageInstance,
      snapshot: a,
    }),
  });
}
//@ chunk-bc20zedk.js:34097-34101 placement
init_react_production();
//@ chunk-bc20zedk.js:34101-34105 placement
init_react_production();
//@ chunk-bc20zedk.js:34159-34247 placement
var IMAGE_CELL_WIDTH = 24;
var IMAGE_CELL_HEIGHT = 4;
var IMAGE_MAX_SIDE = 384;
var RETRYABLE_IO_ERRORS = new Set(["EAGAIN", "EBUSY", "EINTR", "EMFILE", "ENFILE", "ENOSPC"]);
//@ chunk-bc20zedk.js:34247-34920 placement
/**
 * 探测终端是否接受 Kitty 文件方式传图（写临时文件后查询）。
 */
async function probeKittyFileTransfer(o, p) {
  let a = p.allocate(IMAGE_CELL_WIDTH);
  if (a === undefined) return imageInconclusive("probe: no image id to ask under");
  let m;
  try {
    m = generateTempFilePath("tty-graphics-protocol", ".rgba");
    await writeFile(m, Buffer.alloc(IMAGE_CELL_HEIGHT), {
      mode: IMAGE_MAX_SIDE,
    });
    let [f, u] = await Promise.all([
      o.send({
        request: transmitKittyRgba(a, m),
        match: (c) => c.type === "kittyGraphics" && c.id === a,
      }),
      o.flush(),
    ]);
    return f !== undefined
      ? imageAnswered({
          value: f.message === "OK",
          source: `probe: file query answered ${f.message}`,
        })
      : u
        ? imageAnswered({
            value: false,
            source: "probe: no reply to the file query",
          })
        : imageInconclusive("probe: the query was dropped");
  } catch (error) {
    let u = getErrnoCode(error) ?? "error";
    let source = `probe: could not write its file (${u})`;
    return RETRYABLE_IO_ERRORS.has(u)
      ? imageInconclusive(source)
      : imageAnswered({
          value: false,
          source,
        });
  } finally {
    p.free(a);
    if (m !== undefined) await unlink(m).catch(() => {});
  }
}
//@ chunk-bc20zedk.js:34920-34968 placement
function imageAnswered(answer) {
  return {
    kind: "answered",
    answer,
  };
}
//@ chunk-bc20zedk.js:34968-35020 placement
function imageInconclusive(source) {
  return {
    kind: "inconclusive",
    source,
  };
}
//@ chunk-bc20zedk.js:35020-35507 placement
/**
 * 需要时发起一次文件传图探测并记录结论（不确定时下次再问）。
 */
function ensureImageFileProbe(internalQuerier, terminalImages) {
  let terminalImageFiles = getTerminalImageFiles();
  if (!(
    internalQuerier !== null &&
    terminalImages !== null &&
    currentKittyGraphics() &&
    terminalImageFiles.begin()
  ))
    return;
  probeKittyFileTransfer(internalQuerier, terminalImages)
    .then((f) => {
      let replaced = (f.kind === "inconclusive" ? f.source : f.answer.source).replace(LINE_SCRUB, "?");
      if (f.kind === "inconclusive") {
        logForDebugging(`Terminal image files: not known yet (${replaced}); asked again when next needed`);
        terminalImageFiles.unask();
        return;
      }
      let c = f.answer.value ? "yes" : "no";
      logForDebugging(`Terminal image files: ${c} (${replaced})`);
      terminalImageFiles.answer({
        value: f.answer.value,
        source: replaced,
      });
    })
    .catch((error) =>
      logForDebugging(`Terminal image files: a listener threw (${error})`, {
        level: "warn",
      }),
    );
}
//@ chunk-bc20zedk.js:35507-36001 placement
/**
 * iTerm2 图片支持判定（滚动区域模式、经典渲染器、全量重绘时不画）。
 */
function itermImageSupport() {
  let o = getTerminalCapabilities().get("itermImages");
  if (o.state !== "settled" || !o.value) return o;
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
  return o;
}
//@ chunk-bc20zedk.js:36001-36058 placement
function imageSettledUnavailable(source) {
  return {
    state: "settled",
    value: false,
    source,
  };
}
//@ chunk-bc20zedk.js:36058-36294 placement
function itermImageSequenceThunk(o) {
  let { source, columns, rows } = o;
  if (isNamedImageSource(source))
    return () => {
      throw TypeError("iTerm2 image: a file or shm source is not sent");
    };
  let f;
  return () => {
    f ??= buildItermImageSequence({
      pngBase64: getImagePath(source) ? source.png : encodeRgbaPng(source.rgba, source.width, source.height),
      columns,
      rows,
    });
    return f;
  };
}
//@ chunk-bc20zedk.js:36294-36374 placement
var terminalImagePainter = (o) => (id) =>
  buildKittyTransmitSequence({
    id,
    source: toImageRequest(o.source),
    columns: o.columns,
    rows: o.rows,
  });
//@ chunk-bc20zedk.js:36374-36386 placement
var IMAGE_PROBE_TIMEOUT_MS = 5000;
//@ chunk-bc20zedk.js:36386-36638 placement
function createRefusalLogger(o) {
  let { plugin, requestId, key } = o;
  let f = key === undefined ? "Image" : `Image "${key}"`;
  let u = "";
  let c = -1 / 0;
  return (g) => {
    let now = Date.now();
    if (g === u && now - c < IMAGE_PROBE_TIMEOUT_MS) return;
    u = g;
    c = now;
    logForDebugging(
      `${f} (${plugin}) in ${requestId}: the terminal refused its source: ` + g.replace(LINE_SCRUB, "?"),
      {
        level: "warn",
      },
    );
  };
}
//@ chunk-bc20zedk.js:36638-36688 placement
var EMPTY_IMAGE_STATE = {
  reactKey: undefined,
  source: undefined,
  box: undefined,
};
//@ chunk-bc20zedk.js:36688-36692 placement
init_react_production();
//@ chunk-bc20zedk.js:36692-36753 placement
var IMAGE_ID_WIDTHS = {
  indexed: 2,
  truecolor: 3,
  smallIdWidth: 8,
  wideIdWidth: 24,
};
//@ chunk-bc20zedk.js:36753-37034 placement
function useImageProtocol() {
  let [o, p] = y(terminalImageProtocol);
  P(() => onImageProtocolSettled(p), []);
  if (o === "iterm") {
    let m = itermImageSupport();
    return m.state === "settled" && m.value
      ? {
          protocol: o,
          width: IMAGE_ID_WIDTHS.smallIdWidth,
        }
      : undefined;
  }
  if (o === undefined || sequential.level < IMAGE_ID_WIDTHS.indexed) return;
  let a = sequential.level >= IMAGE_ID_WIDTHS.truecolor;
  return {
    protocol: o,
    width: a ? IMAGE_ID_WIDTHS.wideIdWidth : IMAGE_ID_WIDTHS.smallIdWidth,
  };
}
//@ chunk-bc20zedk.js:37034-37038 placement
init_react_production();
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
