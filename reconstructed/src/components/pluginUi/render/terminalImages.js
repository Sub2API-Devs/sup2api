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
import { Se, y, zt, yt, Vc, j, P } from "../../../../vendor/react/cjs/react.production.js";
import { RenderInstance } from "./actionKeys.js";
import { _T } from "../../../ink/components/ClockContext.js";
import { TDs } from "../../../plugins/functionHooks/surfaceClients.js";
import { createTicker, RenderHostElement } from "./MarkdownBlock.js";
import { SentryErrorBoundary } from "../../SentryErrorBoundary.js";
import { firstThrowReport, tellerOf } from "../../../plugins/functionHooks/ui/renderDispatch.js";
import { QNe } from "../../../plugins/hooksModules/loadedModuleFilters.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { generateTempFilePath } from "../../../utils/tempDir.js";
import { xIs, buildKittyTransmitSequence } from "../../../ink/termio/kittyGraphics.js";
import { getErrnoCode } from "../../../utils/errors.js";
import {
  Csn,
  u$s,
  EA,
  terminalImageProtocol,
  onImageProtocolSettled,
} from "../../../ink/terminalCapabilities.js";
import { LINE_SCRUB } from "../../../plugins/functionHooks/ui/textScrub.js";
import { logForDebugging } from "../../../utils/debug.js";
import { isDecstbmRendererEnabled } from "../../../ink/nativeCursor.js";
import { isFullscreenEnvEnabled } from "../../../utils/fullscreen.js";
import { env } from "../../../utils/env.js";
import { ZRt, toImageRequest } from "../../../plugins/functionHooks/ui/imageSource.js";
import { buildItermImageSequence, encodeRgbaPng } from "../../../ink/termio/iterm2Image.js";
import { getImagePath } from "../../../utils/imageStore.js";
import { sequential } from "../../../utils/sequential.js";

//@ chunk-bc20zedk.js:33069-33371 sole-consumer
var freeze = Object.freeze({
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
  acceptsPointer: () => !1,
  acceptsKeys: () => !1,
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
/**
 * 获取并持有插件图片渲染实例（卸载时释放）。
 */
//@ chunk-bc20zedk.js:33389-33708 placement
function usePluginImageInstance(o) {
  let { plugin: plugin, elementKey: elementKey, props: props } = o,
    f = Se(RenderInstance),
    u = Se(_T),
    [c, g] = y(freeze),
    [x] = y(() => props);
  return (
    zt(() => {
      let acquire = TDs.acquire({
        plugin: plugin,
        component: f?.component ?? "AbovePrompt",
        requestId: f?.requestId ?? DETACHED,
        surface: "terminal",
        key: elementKey,
        module: o.module,
        props: x,
        clock: createTicker(u),
      });
      return (g(acquire), () => acquire.release());
    }, [plugin, o.module, elementKey, f, u, x]),
    c
  );
}
/**
 * 插件图片元素（错误边界与占位回退）。
 */
//@ chunk-bc20zedk.js:33708-34097 placement
function PluginImageElement(o) {
  let p = usePluginImageInstance(o),
    a = yt(p.subscribe, p.getSnapshot),
    m = Se(RenderInstance)?.component ?? "AbovePrompt",
    { width: width, height: height, flexGrow: flexGrow } = o;
  return Vc(SentryErrorBoundary, {
    resetKey: a,
    telemetryMessage: () =>
      firstThrowReport(m, tellerOf([QNe(o.plugin)].filter((g) => g !== void 0)), "Client"),
    onError: p.threw,
    fallback: Vc(
      Box,
      { flexShrink: 0, width: width, height: height, flexGrow: flexGrow, overflow: "hidden" },
      Vc(Text, null, " "),
    ),
    children: Vc(RenderHostElement, { host: o, instance: p, snapshot: a }),
  });
}
//@ chunk-bc20zedk.js:34097-34101 placement
j();
//@ chunk-bc20zedk.js:34101-34105 placement
j();
//@ chunk-bc20zedk.js:34159-34247 placement
var Di = 24,
  _i = 4,
  Fi = 384,
  Wi = new Set(["EAGAIN", "EBUSY", "EINTR", "EMFILE", "ENFILE", "ENOSPC"]);
/**
 * 探测终端是否接受 Kitty 文件方式传图（写临时文件后查询）。
 */
//@ chunk-bc20zedk.js:34247-34920 placement
async function probeKittyFileTransfer(o, p) {
  let allocate = p.allocate(Di);
  if (allocate === void 0) return pr("probe: no image id to ask under");
  let m;
  try {
    ((m = generateTempFilePath("tty-graphics-protocol", ".rgba")),
      await writeFile(m, Buffer.alloc(_i), { mode: Fi }));
    let [f, u] = await Promise.all([
      o.send({ request: xIs(allocate, m), match: (c) => c.type === "kittyGraphics" && c.id === allocate }),
      o.flush(),
    ]);
    return f !== void 0
      ? ir({ value: f.message === "OK", source: `probe: file query answered ${f.message}` })
      : u
        ? ir({ value: !1, source: "probe: no reply to the file query" })
        : pr("probe: the query was dropped");
  } catch (error) {
    let u = getErrnoCode(error) ?? "error",
      c = `probe: could not write its file (${u})`;
    return Wi.has(u) ? pr(c) : ir({ value: !1, source: c });
  } finally {
    if ((p.free(allocate), m !== void 0)) await unlink(m).catch(() => {});
  }
}
//@ chunk-bc20zedk.js:34920-34968 placement
function ir(o) {
  return { kind: "answered", answer: o };
}
//@ chunk-bc20zedk.js:34968-35020 placement
function pr(o) {
  return { kind: "inconclusive", source: o };
}
/**
 * 需要时发起一次文件传图探测并记录结论（不确定时下次再问）。
 */
//@ chunk-bc20zedk.js:35020-35507 placement
function ensureImageFileProbe(o, p) {
  let a = Csn();
  if (!(o !== null && p !== null && u$s() && a.begin())) return;
  probeKittyFileTransfer(o, p)
    .then((f) => {
      let replaced = (f.kind === "inconclusive" ? f.source : f.answer.source).replace(LINE_SCRUB, "?");
      if (f.kind === "inconclusive") {
        (logForDebugging(`Terminal image files: not known yet (${replaced}); asked again when next needed`),
          a.unask());
        return;
      }
      let c = f.answer.value ? "yes" : "no";
      (logForDebugging(`Terminal image files: ${c} (${replaced})`),
        a.answer({ value: f.answer.value, source: replaced }));
    })
    .catch((f) => logForDebugging(`Terminal image files: a listener threw (${f})`, { level: "warn" }));
}
/**
 * iTerm2 图片支持判定（滚动区域模式、经典渲染器、全量重绘时不画）。
 */
//@ chunk-bc20zedk.js:35507-36001 placement
function itermImageSupport() {
  let o = EA().get("itermImages");
  if (o.state !== "settled" || !o.value) return o;
  if (isDecstbmRendererEnabled()) return lr("Claude Code's scroll-region display mode draws none");
  if (!isFullscreenEnvEnabled())
    return lr(
      "Claude Code's classic renderer would send the picture again for every new line; fullscreen rendering (/tui fullscreen) draws it",
    );
  if (env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT)
    return lr(
      "CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT is set, so every frame repaints the screen and would send the picture again each time",
    );
  return o;
}
//@ chunk-bc20zedk.js:36001-36058 placement
function lr(o) {
  return { state: "settled", value: !1, source: o };
}
//@ chunk-bc20zedk.js:36058-36294 placement
function itermImageSequenceThunk(o) {
  let { source: source, columns: columns, rows: rows } = o;
  if (ZRt(source))
    return () => {
      throw TypeError("iTerm2 image: a file or shm source is not sent");
    };
  let f;
  return () => (
    (f ??= buildItermImageSequence({
      pngBase64: getImagePath(source) ? source.png : encodeRgbaPng(source.rgba, source.width, source.height),
      columns: columns,
      rows: rows,
    })),
    f
  );
}
//@ chunk-bc20zedk.js:36294-36374 placement
var jo = (o) => (p) =>
  buildKittyTransmitSequence({ id: p, source: toImageRequest(o.source), columns: o.columns, rows: o.rows });
//@ chunk-bc20zedk.js:36374-36386 placement
var $o = 5000;
//@ chunk-bc20zedk.js:36386-36638 placement
function createRefusalLogger(o) {
  let { plugin: plugin, requestId: requestId, key: key } = o,
    f = key === void 0 ? "Image" : `Image "${key}"`,
    u = "",
    c = -1 / 0;
  return (g) => {
    let now = Date.now();
    if (g === u && now - c < $o) return;
    ((u = g),
      (c = now),
      logForDebugging(
        `${f} (${plugin}) in ${requestId}: the terminal refused its source: ` + g.replace(LINE_SCRUB, "?"),
        { level: "warn" },
      ));
  };
}
//@ chunk-bc20zedk.js:36638-36688 placement
var wt = { reactKey: void 0, source: void 0, box: void 0 };
//@ chunk-bc20zedk.js:36688-36692 placement
j();
//@ chunk-bc20zedk.js:36692-36753 placement
var Ee = { indexed: 2, truecolor: 3, smallIdWidth: 8, wideIdWidth: 24 };
//@ chunk-bc20zedk.js:36753-37034 placement
function useImageProtocol() {
  let [o, p] = y(terminalImageProtocol);
  if ((P(() => onImageProtocolSettled(p), []), o === "iterm")) {
    let m = itermImageSupport();
    return m.state === "settled" && m.value ? { protocol: o, width: Ee.smallIdWidth } : void 0;
  }
  if (o === void 0 || sequential.level < Ee.indexed) return;
  let a = sequential.level >= Ee.truecolor;
  return { protocol: o, width: a ? Ee.wideIdWidth : Ee.smallIdWidth };
}
//@ chunk-bc20zedk.js:37034-37038 placement
j();

export {
  ensureImageFileProbe,
  itermImageSequenceThunk,
  jo,
  DETACHED,
  useImageProtocol,
  wt,
  createRefusalLogger,
  itermImageSupport,
  PluginImageElement,
};
