/**
 * components/pluginUi/render/RenderInstance.tsx
 *
 * 2.1.316 新增。插件 ui.render 渲染实例与宿主元素。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bc20zedk.js (48)
 * attribution: placement 48
 */
import {
  init_react_production,
  useState,
  useEffect,
  useContext,
  useRef,
  useLayoutEffect,
  useCallback,
  useMemo,
  createElement,
  createContext,
} from "../../../../vendor/react/cjs/react.production.js";
import { useApp, usePaintedRows } from "../../../ink/components/Input.js";
import { useStdin } from "../../design-system/ThemeProvider.js";
import { getTerminalImageFiles, getTerminalCapabilities } from "../../../ink/terminalCapabilities.js";
import {
  ensureImageFileProbe,
  itermImageSequenceThunk,
  terminalImagePainter,
  DETACHED,
  useImageProtocol,
  EMPTY_IMAGE_STATE,
  createRefusalLogger,
  itermImageSupport,
  PluginImageElement,
} from "./terminalImages.js";
import { RenderInstance } from "./actionKeys.js";
import { isNamedImageSource, isShmSource } from "../../../plugins/functionHooks/ui/imageSource.js";
import {
  rasterKey,
  KEY_SEPARATOR,
  rasterToAnsi,
  mountRaster,
  RasterStream,
  checkRasterCells,
} from "../../../plugins/functionHooks/ui/raster.js";
import { stableStringifySafe } from "../../../utils/hooks/hookSerialization.js";
import { useModalOrTerminalSize } from "../../../context/modalContext.js";
import { renderPluginImage } from "../../../plugins/functionHooks/imageApi.js";
import { buildImagePlaceholderGrid } from "../../../ink/termio/imagePlaceholders.js";
import { buildKittyPlaceholderGrid } from "../../../ink/termio/kittyGraphics.js";
import { Text, Box, Link } from "../../../ink/components/Text.js";
import { SCROLL_JUMP_LINES } from "../../../ink/scrollConstants.js";
import { markDirty, scheduleRenderFrom } from "../../../ink/dom.js";
import {
  useSiteFocus,
  InputField,
  CodeBlock,
  groupOf,
  HoverScope,
  withHexColors,
  HoverStyled,
  heldFor,
} from "./elements.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import {
  weightAndBold,
  drawnHref,
  writtenHref,
  spacingInCells,
  boxKeyProblem,
  hasPlacedBox,
} from "../../../plugins/functionHooks/ui/validateTree.js";
import { PressButton, MarkdownBlock } from "./MarkdownBlock.js";
import {
  thrownTeller,
  chainModules,
  firstThrowReport,
  renderDraws,
  tellThrown,
  valueKeyOf,
  siteVersionOf,
  hasRenderHooks,
  hasRenderHooksFor,
  onScreenOf,
} from "../../../plugins/functionHooks/ui/renderDispatch.js";
import { SentryErrorBoundary } from "../../SentryErrorBoundary.js";
import { ENGINE_ELEMENT } from "../../../plugins/functionHooks/sites/promptContextSites.js";
import { useIsFullscreen } from "../../../ink/renderModeContext.js";
import { logForDebugging } from "../../../utils/debug.js";
import { errorMessage } from "../../../utils/errors.js";
import { renderInstanceKey, mountStateReader } from "../../../plugins/functionHooks/api/state.js";
import { eventCallersWrapper2 } from "../../../plugins/functionHooks/eventCatalog.js";
import { HooksError } from "../../../plugins/functionHooks/hooksErrors.js";
import { useStoreSelector } from "../../../hooks/useStoreSelector.js";
import { renderVersions, VIEWPORT_KEY } from "../../../plugins/functionHooks/ui/renderInstances.js";
import { staticRenderStorageSlot } from "../../../utils/staticRender.js";
import { MESSAGE_COMPONENT_NAMES } from "../../../plugins/functionHooks/sites/uiSites.js";
import { RENDER_EVENT } from "../../../plugins/functionHooks/ui/renderSites.js";
import { logRejection } from "../../../plugins/functionHooks/uiApi.js";
import { dispatchInputQueued, dispatchSelectQueued } from "../../../plugins/functionHooks/ui/interactions.js";
import { paneHostSlot } from "../../../plugins/functionHooks/panes.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-bc20zedk.js:37224-37228 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:37224", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:37228-37428 placement
function useImageFileSupport(props) {
  let { terminalImages } = useApp();
  let { internal_querier: internalQuerier } = useStdin();
  let terminalImageFiles = getTerminalImageFiles();
  let [files, setFiles] = useState(() => terminalImageFiles.get());
  useEffect(() => {
    setFiles(terminalImageFiles.get());
    return terminalImageFiles.onSettle(() => setFiles(terminalImageFiles.get()));
  }, [terminalImageFiles]);
  useEffect(() => {
    if (props) {
      ensureImageFileProbe(internalQuerier, terminalImages);
      setFiles(terminalImageFiles.get());
    }
  }, [props, internalQuerier, terminalImages, terminalImageFiles]);
  return files;
}
//@ chunk-bc20zedk.js:37428-37466 placement
var imagePresenter = (protocol, props) =>
  protocol === "iterm" ? itermImageSequenceThunk(props) : terminalImagePainter(props);
//@ chunk-bc20zedk.js:37466-39109 placement
function KittyImage(props) {
  let { plugin, elementKey, source, columns, rows } = props;
  let { terminalImages } = useApp();
  let { internal_querier: internalQuerier } = useStdin();
  let renderInstance = useContext(RenderInstance);
  let requestId = renderInstance?.requestId ?? DETACHED;
  let component = renderInstance?.component;
  let imageProtocol = useImageProtocol();
  let width = imageProtocol?.width;
  let protocol = imageProtocol?.protocol;
  let isNamedSource = isNamedImageSource(source);
  let isKitty = protocol === "kitty";
  let imageFileSupport = useImageFileSupport(isNamedSource && isKitty);
  let canTransmit =
    !isNamedSource || (isKitty && imageFileSupport.state === "settled" && imageFileSupport.value);
  let [slot, setSlot] = useState();
  let [transmitted, setTransmitted] = useState();
  let lastState = useRef(EMPTY_IMAGE_STATE);
  useLayoutEffect(() => {
    let id =
      terminalImages === null || width === undefined || protocol === undefined
        ? undefined
        : terminalImages.allocate(
            width,
            createRefusalLogger({
              plugin,
              requestId,
              key: elementKey,
            }),
            protocol,
            elementKey === undefined && component === undefined
              ? undefined
              : [component, rasterKey(requestId, elementKey ?? "", plugin)].join(KEY_SEPARATOR),
          );
    if (terminalImages === null || id === undefined || protocol === undefined) return;
    setSlot({
      id,
      images: terminalImages,
      protocol,
    });
    return () => {
      terminalImages.free(id);
      lastState.current = EMPTY_IMAGE_STATE;
      setSlot(undefined);
      setTransmitted(undefined);
    };
  }, [terminalImages, width, protocol, plugin, component, requestId, elementKey]);
  useLayoutEffect(() => {
    if (slot === undefined) return;
    if (!canTransmit) {
      lastState.current = EMPTY_IMAGE_STATE;
      setTransmitted(undefined);
      return;
    }
    let sourceKey = stableStringifySafe(source);
    let boxKey = `${columns}x${rows}`;
    let sourceChanged = sourceKey !== lastState.current.reactKey;
    let effectiveSource = sourceChanged ? source : (lastState.current.source ?? source);
    let boxUnchanged = !sourceChanged && boxKey === lastState.current.box;
    let shmUnchanged = !sourceChanged && isShmSource(effectiveSource);
    if (boxUnchanged || shmUnchanged) return;
    let sent = slot.images.transmit(
      slot.id,
      imagePresenter(slot.protocol, {
        source: effectiveSource,
        columns,
        rows,
      }),
      {
        resend: !isShmSource(effectiveSource),
        box: {
          columns,
          rows,
        },
      },
    );
    lastState.current = {
      reactKey: sourceKey,
      source: effectiveSource,
      box: boxKey,
    };
    setTransmitted(sent ? slot : undefined);
  }, [slot, source, canTransmit, columns, rows]);
  useModalOrTerminalSize(
    {
      plugin,
      requestId,
      key: elementKey,
    },
    {
      columns,
      rows,
    },
    useCallback(
      (capabilities) => {
        let namedSource = isNamedImageSource(capabilities);
        if (namedSource) ensureImageFileProbe(internalQuerier, terminalImages);
        let refusal = renderPluginImage({
          hasRoot: terminalImages !== null,
          placeholders: getTerminalCapabilities().get("kittyGraphics"),
          inlineImages: itermImageSupport(),
          hasId: slot !== undefined,
          isReference: namedSource,
          files: getTerminalImageFiles().get(),
        });
        if (refusal !== undefined || slot === undefined) return refusal;
        let isShm = isShmSource(capabilities);
        if (isShm && slot.images.isBackedUp(slot.id))
          return "the surface has not written its last frames (paused or busy); the object was not sent, unlink it and blit again later";
        if (
          !slot.images.transmit(
            slot.id,
            imagePresenter(slot.protocol, {
              source: capabilities,
              columns,
              rows,
            }),
            {
              resend: !isShm,
              box: {
                columns,
                rows,
              },
            },
          )
        )
          return "the terminal sink refused the source";
        lastState.current = {
          ...lastState.current,
          source: capabilities,
          box: `${columns}x${rows}`,
        };
        setTransmitted(slot);
        return;
      },
      [internalQuerier, terminalImages, slot, columns, rows],
    ),
  );
  return transmitted;
}
//@ chunk-bc20zedk.js:39109-39491 placement
/**
 * 插件图片元素（Kitty/iTerm 占位网格，无 id 时显示 alt）。
 */
function PluginImage(props) {
  let { plugin, elementKey, columns, rows, alt } = props;
  let kittyImage = KittyImage(props);
  let id = kittyImage?.id;
  let protocol = kittyImage?.protocol;
  let rawText = useMemo(
    () =>
      id === undefined
        ? ""
        : protocol === "iterm"
          ? buildImagePlaceholderGrid(id, columns, rows)
          : buildKittyPlaceholderGrid(id, columns, rows),
    [id, protocol, columns, rows],
  );
  if (id === undefined)
    return createElement(
      Text,
      {
        dimColor: true,
      },
      alt,
    );
  return createElement(
    Box,
    {
      flexShrink: 0,
      width: columns,
      height: rows,
      overflow: "hidden",
      noSelect: true,
      ...(elementKey !== undefined && {
        elementKey,
        elementPlugin: plugin,
      }),
    },
    createElement("ink-raw-ansi", {
      rawText,
      rawWidth: columns,
      rawHeight: rows,
    }),
  );
}
//@ chunk-bc20zedk.js:39491-39495 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:39491", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:39495-39499 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:39495", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:39499-39931 placement
/**
 * 按最小间隔合并重绘的调度器。
 */
function createPaintScheduler(draw) {
  let lastDrawAt = -1 / 0;
  let pending = null;
  let timer = null;
  let timerDueAt = 1 / 0;
  function flush() {
    timer = null;
    timerDueAt = 1 / 0;
    if (pending !== null) {
      let payload = pending;
      pending = null;
      lastDrawAt = Date.now();
      draw(payload);
    }
  }
  function scheduleAt(delayMs) {
    let dueAt = Date.now() + delayMs;
    if (timer !== null && timerDueAt <= dueAt) return;
    if (timer !== null) clearTimeout(timer);
    timerDueAt = dueAt;
    timer = setTimeout(flush, delayMs);
  }
  function schedule(payload, minimumDelayMs) {
    let max = Math.max(minimumDelayMs, lastDrawAt + SCROLL_JUMP_LINES - Date.now());
    pending = payload;
    if (max <= 0) {
      if (timer !== null) clearTimeout(timer);
      flush();
    } else scheduleAt(max);
  }
  return {
    paint: (delayMs) => {
      schedule(delayMs, 0);
    },
    schedule,
    cancel: () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      timerDueAt = 1 / 0;
      pending = null;
    },
  };
}
//@ chunk-bc20zedk.js:39931-39969 placement
var withPaintOverride = (base, extra, paint) => ({
  ...base,
  ...extra,
  paint,
});
//@ chunk-bc20zedk.js:39969-40067 placement
function setRawText(node, rawText) {
  if (node === null || node.attributes.rawText === rawText) return;
  node.attributes.rawText = rawText;
  markDirty(node);
  scheduleRenderFrom(node);
}
//@ chunk-bc20zedk.js:40067-40078 placement
var STANDING_REDRAW_MS = 250;
//@ chunk-bc20zedk.js:40078-40173 placement
function scheduleStandingRedraw(scheduler, standing, redraw) {
  let state = standing.standing();
  if (state !== "complete")
    scheduler?.schedule(redraw, state === "progressing" ? SCROLL_JUMP_LINES : STANDING_REDRAW_MS);
}
//@ chunk-bc20zedk.js:40173-40555 placement
/**
 * 订阅栅格流并把帧绘制到原始 ANSI 节点。
 */
function useRasterPainter(props, rasters, words) {
  let { plugin, elementKey, columns, rows } = props;
  let instance = useContext(RenderInstance);
  let nodeRef = useRef(null);
  let paintSchedulerRef = useRef(null);
  useLayoutEffect(() => {
    let size = {
      columns,
      rows,
    };
    let paintScheduler = createPaintScheduler((words) => {
      setRawText(nodeRef.current, rasterToAnsi(words, size, rasters));
      scheduleStandingRedraw(paintSchedulerRef.current, rasters, words);
    });
    let dispose = mountRaster(
      withPaintOverride(
        {
          plugin,
          requestId: instance?.requestId ?? DETACHED,
          key: elementKey,
        },
        size,
        paintScheduler.paint,
      ),
    );
    paintSchedulerRef.current = paintScheduler;
    return () => {
      dispose();
      paintScheduler.cancel();
      paintSchedulerRef.current = null;
    };
  }, [plugin, elementKey, columns, rows, instance, rasters]);
  useLayoutEffect(() => {
    paintSchedulerRef.current?.cancel();
    scheduleStandingRedraw(paintSchedulerRef.current, rasters, words);
  }, [words, rasters]);
  return nodeRef;
}
//@ chunk-bc20zedk.js:40555-40903 placement
/**
 * 插件栅格元素。
 */
function PluginRaster(props) {
  let { plugin, elementKey, columns, rows, cells } = props;
  let [rasterStream] = useState(() => RasterStream());
  let words = useMemo(
    () => checkRasterCells(cells, columns, rows).words ?? new Uint32Array(),
    [cells, columns, rows],
  );
  let ref = useRasterPainter(props, rasterStream, words);
  let rawText = useMemo(
    () =>
      rasterToAnsi(
        words,
        {
          columns,
          rows,
        },
        rasterStream,
      ),
    [words, columns, rows, rasterStream],
  );
  return createElement(
    Box,
    {
      flexShrink: 0,
      width: columns,
      height: rows,
      overflow: "hidden",
      elementKey,
      elementPlugin: plugin,
    },
    createElement("ink-raw-ansi", {
      ref,
      rawText,
      rawWidth: columns,
      rawHeight: rows,
    }),
  );
}
//@ chunk-bc20zedk.js:40903-40912 placement
var VISIBLE_OPTIONS = 8;
//@ chunk-bc20zedk.js:40912-41043 placement
function listWindow(count, highlight) {
  let max = Math.max(0, highlight - VISIBLE_OPTIONS + 1);
  let max_2 = Math.max(0, Math.min(VISIBLE_OPTIONS, count - max));
  let hidden = count - max - max_2;
  return {
    first: max,
    size: max_2,
    hidden,
    rows: max_2 + (hidden > 0 ? 1 : 0),
  };
}
//@ chunk-bc20zedk.js:41043-41047 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:41043", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:41047-41051 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:41047", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:41051-41068 placement
var SelectFields; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:41051", () => {
  SelectFields = createContext(null);
});
//@ chunk-bc20zedk.js:41068-41893 placement
function SelectField(props) {
  let { plugin, handle, element, options } = props;
  let siteFocus = useSiteFocus({
    plugin,
    handle,
  });
  let selectFields = useContext(SelectFields);
  let selectedValue = selectFields?.pickedOf(plugin, element) ?? props.value;
  let found = options.find((option) => option.value === selectedValue);
  let children = props.label === undefined ? "" : `${props.label}: `;
  let { hasKeyboardFocus } = siteFocus;
  let open = selectFields?.open;
  let isOpen = open !== null && open !== undefined && open.plugin === plugin && open.handle === handle;
  let highlight = isOpen ? open.highlight : 0;
  let { first, size, hidden } = listWindow(isOpen ? options.length : 0, highlight);
  return jsxProd_default_2(Box, {
    ref: siteFocus.ref,
    flexDirection: "column",
    flexShrink: 0,
    elementKey: element,
    elementPlugin: plugin,
    onClick: siteFocus.onClick,
    children: [
      jsxProd_default_2(Text, {
        wrap: "truncate-end",
        children: [
          jsxProd_default(Text, {
            bold: hasKeyboardFocus,
            children,
          }),
          found === undefined
            ? jsxProd_default(Text, {
                dimColor: true,
                children: "none",
              })
            : jsxProd_default(Text, {
                inverse: hasKeyboardFocus && !isOpen,
                children: found.label ?? found.value,
              }),
          jsxProd_default(Text, {
            dimColor: true,
            children: isOpen ? " \u25B4" : " \u25BE",
          }),
        ],
      }),
      options.slice(first, first + size).map((option, index) =>
        jsxProd_default(
          Text,
          {
            inverse: first + index === highlight,
            wrap: "truncate-end",
            children: `  ${option.label ?? option.value}`,
          },
          option.value,
        ),
      ),
      hidden > 0 &&
        jsxProd_default(Text, {
          dimColor: true,
          children: `  \u2026 ${hidden} more`,
        }),
    ],
  });
}
//@ chunk-bc20zedk.js:41893-42026 placement
function textStyleProps(style) {
  let weightInfo = weightAndBold(style);
  if (weightInfo === undefined) return weightInfo;
  let { size, weight, mono, tabular, bold, ...restStyle } = weightInfo;
  return bold === true
    ? {
        ...restStyle,
        bold,
      }
    : restStyle;
}
//@ chunk-bc20zedk.js:42026-44565 placement
function rebuild(node, renderRef, visiting = new Set()) {
  if (typeof node === "string") return createElement(Text, null, node);
  if (node.type === "engine") return renderRef(node.ref);
  if (node.type === "Button")
    return createElement(PressButton, {
      plugin: node.press.plugin,
      handle: node.press.handle,
      element: node.props.key,
      label: node.props.label,
      hotkey: node.props.hotkey,
      action: node.props.action,
      plain: node.props.plain,
      dimColor: node.props.dimColor,
      variant: node.props.variant,
      role: node.props.role,
      hover: node.hover,
      held: (node.children ?? []).map((child) =>
        typeof child === "string" ? child : rebuild(child, renderRef),
      ),
    });
  if (node.type === "Input")
    return createElement(InputField, {
      plugin: node.press.plugin,
      handle: node.press.handle,
      element: node.props.key,
      label: node.props.label,
      placeholder: node.props.placeholder,
      value: node.props.value,
      submitLabel: node.props.submitLabel,
      rows: node.props.rows,
    });
  if (node.type === "Select")
    return createElement(SelectField, {
      plugin: node.press.plugin,
      handle: node.press.handle,
      element: node.props.key,
      label: node.props.label,
      options: node.props.options,
      value: node.props.value,
    });
  if (node.type === "Code") return createElement(CodeBlock, node.props);
  if (node.type === "Markdown")
    return createElement(MarkdownBlock, {
      text: node.props.text,
      dimColor: node.props.dimColor,
      press: "press" in node ? node.press : undefined,
      part: "part" in node ? node.part : undefined,
      elementKey: node.props.key,
      pressableLinks: node.props.pressableLinks,
    });
  if (node.type === "Client")
    return createElement(PluginImageElement, {
      key: `client:${node.client.plugin}:${node.props.key}`,
      rebuild: (child) => rebuild(child, () => null),
      plugin: node.client.plugin,
      module: node.props.module,
      elementKey: node.props.key,
      props: node.props.props,
      drawn: node.props,
      width: node.props.width,
      height: node.props.height,
      flexGrow: node.props.flexGrow,
    });
  if (node.type === "Svg")
    return createElement(
      Text,
      {
        dimColor: true,
      },
      node.props.alt,
    );
  if (node.type === "Image")
    return createElement(PluginImage, {
      ...(node.props.key !== undefined && {
        key: `image:${node.image.plugin}:${node.props.key}`,
      }),
      plugin: node.image.plugin,
      elementKey: node.props.key,
      source: node.props.source,
      columns: node.props.columns,
      rows: node.props.rows,
      alt: node.props.alt,
    });
  if (node.type === "Raster")
    return createElement(PluginRaster, {
      key: `raster:${node.raster.plugin}:${node.props.key}`,
      plugin: node.raster.plugin,
      elementKey: node.props.key,
      columns: node.props.columns,
      rows: node.props.rows,
      cells: node.props.cells,
    });
  let isInline = node.type === "Text" || node.type === "Link";
  let visitingSet = new Set();
  let mapped = (node.children ?? []).map((child) =>
    isInline && typeof child === "string" ? child : rebuild(child, renderRef, visitingSet),
  );
  if (node.type === "Link") {
    let { href, label } = node.props;
    let hrefLabel = drawnHref(href);
    let children = mapped.length > 0 ? mapped : [label ?? hrefLabel];
    let fallback =
      mapped.length === 0 && label === undefined
        ? undefined
        : createElement(
            Text,
            null,
            ...children,
            " ",
            createElement(
              Text,
              {
                dimColor: true,
              },
              hrefLabel,
            ),
          );
    return createElement(
      Link,
      {
        url: writtenHref(href),
        fallback,
      },
      ...children,
    );
  }
  let group = groupOf(node.group?.plugin, node.hover);
  let isText = node.type === "Text";
  let styleProps = isText ? textStyleProps(node.props) : spacingInCells(node.props);
  if (node.type === "Box" && styleProps?.key !== undefined) {
    let { key, ...layoutProps } = styleProps;
    let keyValid = boxKeyProblem(key, visiting) === undefined;
    return createElement(HoverScope, {
      key: keyValid ? String(key) : undefined,
      isLive: keyValid,
      elementKey: String(key),
      layout: layoutProps,
      hover: node.hover,
      group,
      children: mapped,
    });
  }
  let elementType = node.type === "Box" ? Box : Text;
  let { hover } = node;
  return hover === undefined
    ? createElement(elementType, withHexColors(styleProps), ...mapped)
    : createElement(HoverStyled, {
        isInline: isText,
        props: styleProps,
        hover,
        group,
        children: mapped,
      });
}
//@ chunk-bc20zedk.js:44565-44720 placement
function DrawnTree({ tree, input, draw }) {
  let { component, requestId } = input;
  return createElement(
    RenderInstance,
    {
      value: useMemo(
        () => ({
          component,
          requestId,
        }),
        [component, requestId],
      ),
    },
    rebuild(tree, (ref) => draw(heldFor(tree, ref, input))),
  );
}
//@ chunk-bc20zedk.js:44720-44745 placement
var HOST_BOUNDED_COMPONENTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:44720", () => {
  HOST_BOUNDED_COMPONENTS = new Set(["Pane"]);
});
//@ chunk-bc20zedk.js:44745-45115 placement
function boundedDrawing({ tree, input, draw, submittedBy, onThrown }) {
  let { component } = input;
  let treeElement = jsxProd_default(DrawnTree, {
    tree,
    input,
    draw,
  });
  let teller;
  let getTeller = () =>
    (teller ??= thrownTeller(
      chainModules(input, submittedBy === undefined ? undefined : [submittedBy]),
      tree,
    ));
  return HOST_BOUNDED_COMPONENTS.has(component)
    ? treeElement
    : jsxProd_default(SentryErrorBoundary, {
        resetKey: tree,
        fallback: jsxProd_default(DrawnTree, {
          tree: ENGINE_ELEMENT,
          input,
          draw,
        }),
        telemetryMessage: () => firstThrowReport(component, getTeller(), "answer"),
        onError: (error) => {
          onThrown(tree);
          renderDraws.noteThrown(input, tree);
          tellThrown({
            component,
            teller: getTeller(),
            error,
          });
        },
        children: treeElement,
      });
}
//@ chunk-bc20zedk.js:45115-45119 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:45115", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:45119-45123 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:45119", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:45123-45186 placement
function useEngineDrew(isActive) {
  let hasDrawnRef = useRef(false);
  if (!isActive) hasDrawnRef.current = true;
  return hasDrawnRef.current;
}
//@ chunk-bc20zedk.js:45186-45385 placement
function heldBack(held, props) {
  let { input, drawn, contentRows, isFallback } = props;
  return held.rows !== undefined &&
    (isFallback || held.drawn !== drawn || (contentRows !== undefined && contentRows >= held.rows))
    ? {
        rows: undefined,
        wasOff: false,
        input,
        drawn,
      }
    : held.wasOff
      ? {
          ...held,
          wasOff: false,
        }
      : held;
}
//@ chunk-bc20zedk.js:45385-45634 placement
function heldOff(held, props) {
  let { input, drawn, lastRows, contentRows } = props;
  let isContentEmpty = contentRows === 0;
  let wasOnScreen = !held.wasOff;
  let inputChanged = held.input !== input;
  let isNewlyOff = isContentEmpty && held.rows === undefined;
  return wasOnScreen
    ? {
        rows: lastRows,
        wasOff: true,
        input,
        drawn,
      }
    : inputChanged
      ? {
          rows: isContentEmpty ? lastRows : undefined,
          wasOff: true,
          input,
          drawn,
        }
      : isNewlyOff
        ? {
            ...held,
            rows: lastRows,
            drawn,
          }
        : {
            ...held,
            drawn,
          };
}
//@ chunk-bc20zedk.js:45634-45638 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:45634", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:45638-45870 placement
function useHeldRows(props) {
  let { isOff, input, drawn, lastRows } = props;
  let [heldRows, setHeldRows] = useState(() => ({
    rows: isOff ? lastRows : undefined,
    wasOff: isOff,
    input,
    drawn,
  }));
  let nextHeld = isOff ? heldOff(heldRows, props) : heldBack(heldRows, props);
  if (
    nextHeld.rows !== heldRows.rows ||
    nextHeld.wasOff !== heldRows.wasOff ||
    nextHeld.input !== heldRows.input ||
    nextHeld.drawn !== heldRows.drawn
  )
    setHeldRows(nextHeld);
  return nextHeld.rows;
}
//@ chunk-bc20zedk.js:45870-45874 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:45870", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:45874-46153 placement
function useOnScreenInput(component, shouldTrack, submittedBy) {
  let isActive = useIsFullscreen() && shouldTrack;
  let submitterList = submittedBy === undefined ? undefined : [submittedBy];
  let [heldRows] = useState(() => (isActive ? renderDraws.heldRowsOf(component, submitterList) : undefined));
  let [paintedRows, setPaintedRows, getPaintedRows, paintedRowsRef] = usePaintedRows(
    isActive,
    useState(() => (isActive ? renderDraws.askedOnScreen(component, submitterList) : undefined))[0],
  );
  return useMemo(
    () => ({
      site: paintedRows,
      input:
        setPaintedRows === undefined
          ? component
          : {
              ...component,
              props: {
                ...component.props,
                onScreen: setPaintedRows,
              },
            },
      lastRows: getPaintedRows ?? heldRows,
      contentRows: paintedRowsRef,
    }),
    [component, setPaintedRows, paintedRows, getPaintedRows, paintedRowsRef, heldRows],
  );
}
//@ chunk-bc20zedk.js:46153-46157 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:46153", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:46157-46222 placement
var renderInputKey = (isEnabled, input) =>
  isEnabled ? `${input.component}\x00${input.requestId}\x00` + valueKeyOf(input) : "";
//@ chunk-bc20zedk.js:46222-46321 placement
var siteFailed = (input, error) =>
  logForDebugging(`ui.render (${input.component} ${input.requestId}): site failed: ${errorMessage(error)}`, {
    level: "error",
  });
//@ chunk-bc20zedk.js:46321-46855 placement
function useRenderAnswer(isEnabled, input, { version, staticFrame, submittedBy }) {
  let submitterList = submittedBy === undefined ? undefined : [submittedBy];
  let [answer, setAnswer] = useState(() =>
    isEnabled ? renderDraws.settled(input, submitterList) : undefined,
  );
  let inputKey = renderInputKey(isEnabled, input);
  let hasRealRequest = isEnabled && input.requestId !== "" ? renderInstanceKey(input) : undefined;
  useEffect(
    () => (hasRealRequest !== undefined ? mountStateReader(hasRealRequest) : undefined),
    [hasRealRequest],
  );
  useEffect(() => {
    if (!isEnabled) {
      setAnswer(undefined);
      return;
    }
    if (staticFrame) return;
    let abortController = new AbortController();
    eventCallersWrapper2({
      signal: abortController.signal,
      origin: submitterList,
    })
      .ui.render(input)
      .then(
        (answer) => {
          if (!abortController.signal.aborted) setAnswer(answer);
        },
        (error) => {
          siteFailed(input, error);
          if (!abortController.signal.aborted) setAnswer(ENGINE_ELEMENT);
        },
      );
    return () => {
      abortController.abort(new HooksError("ui.render: superseded"));
    };
  }, [inputKey, version, isEnabled, submittedBy, staticFrame]);
  let onThrown = useCallback(
    (error) => setAnswer((previous) => (previous === error ? ENGINE_ELEMENT : previous)),
    [],
  );
  return {
    drawn: answer,
    onThrown,
  };
}
//@ chunk-bc20zedk.js:46855-46890 placement
var useRenderVersion = (component) =>
  useStoreSelector(renderVersions(), (versions) => siteVersionOf(versions, component));
//@ chunk-bc20zedk.js:46890-47671 placement
function useRenderDrawing(component, input, submittedBy) {
  let renderVersion = useRenderVersion(component);
  let staticStorage = useContext(staticRenderStorageSlot);
  let {
    input: input_2,
    site,
    lastRows,
    contentRows,
  } = useOnScreenInput(
    component,
    !staticStorage && MESSAGE_COMPONENT_NAMES.has(component.component) && hasRenderHooks(component.component),
    submittedBy,
  );
  let renderHooks = useMemo(() => hasRenderHooksFor(input_2), [input_2, renderVersion]);
  let { drawn, onThrown } = useRenderAnswer(renderHooks, input_2, {
    version: renderVersion,
    staticFrame: staticStorage,
    submittedBy,
  });
  let lastEngineRef = useRef(undefined);
  let hasThrown = useCallback((engine) => engine !== undefined && lastEngineRef.current === engine, []);
  let hasDrawn = useEngineDrew(renderHooks) || staticStorage;
  let heldRows = useHeldRows({
    isOff: renderHooks && onScreenOf(input_2) === null,
    input: renderHooks ? valueKeyOf(component) : undefined,
    drawn,
    isFallback: drawn === ENGINE_ELEMENT,
    lastRows,
    contentRows,
  });
  useEffect(() => {
    if (heldRows !== undefined) renderDraws.noteHeldRows(input_2, heldRows);
  }, [heldRows, drawn, input_2]);
  let isFullscreen = useIsFullscreen();
  let renderInput = useMemo(
    () => (staticStorage || !isFullscreen) && drawn !== undefined && hasPlacedBox(drawn),
    [staticStorage, isFullscreen, drawn],
  );
  return {
    node: createElement(
      Box,
      {
        ref: site,
        flexDirection: "column",
        renderEvent: RENDER_EVENT,
        renderComponent: component.component,
        drawPending: (renderHooks && !drawn && !hasDrawn) || undefined,
        minHeight: heldRows,
        overflow: renderInput ? "hidden" : undefined,
      },
      renderHooks
        ? drawn
          ? boundedDrawing({
              tree: drawn,
              input: input_2,
              draw: input,
              submittedBy,
              onThrown: (renderDeps) => {
                lastEngineRef.current = renderDeps;
                onThrown(renderDeps);
              },
            })
          : hasDrawn
            ? input(input_2)
            : null
        : input(input_2),
    ),
    drawn,
    hasThrown,
  };
}
//@ chunk-bc20zedk.js:47671-47701 placement
var fieldKey = (plugin, element) => `${plugin}\x00${element}`;
//@ chunk-bc20zedk.js:47701-47773 placement
var inputFromTerminal = (input) =>
  logRejection(
    `ui.input ${input.plugin}`,
    dispatchInputQueued({
      ...input,
      surface: "terminal",
    }),
  );
//@ chunk-bc20zedk.js:47773-47846 placement
var selectFromTerminal = (select) =>
  logRejection(
    `ui.select ${select.plugin}`,
    dispatchSelectQueued({
      ...select,
      surface: "terminal",
    }),
  );
//@ chunk-bc20zedk.js:47846-47879 placement
var useHasRenderHooks = (component) => useStoreSelector(renderVersions(), () => hasRenderHooks(component));
//@ chunk-bc20zedk.js:47879-47911 placement
var useRenderHook = (component, input, submittedBy) => useRenderDrawing(component, input, submittedBy).node;
//@ chunk-bc20zedk.js:47911-47915 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:47911", () => {
  init_react_production();
});
//@ chunk-bc20zedk.js:47915-48217 placement
function useRenderInput(component, buildInput, inputDeps) {
  let input = useMemo(buildInput, inputDeps);
  let renderVersion = useRenderVersion({
    surface: "terminal",
    component,
    requestId: input.requestId,
  });
  let viewportVersion = useStoreSelector(renderVersions(), (state) => state.get(VIEWPORT_KEY) ?? 0);
  let isFullscreen = useIsFullscreen();
  return useMemo(() => {
    let paneHost = paneHostSlot.get();
    return {
      surface: "terminal",
      component,
      ...(paneHost !== undefined && {
        viewport: {
          columns: paneHost.conversationColumns,
          rows: paneHost.rows,
          isFullscreen,
        },
      }),
      ...input,
    };
  }, [component, input, renderVersion, viewportVersion, isFullscreen]);
}
//@ chunk-bc20zedk.js:48217-48245 placement
var useSettledDraw = (input) => renderDraws.settled(input);
export {
  useRenderDrawing,
  useRenderInput,
  SelectFields,
  fieldKey,
  inputFromTerminal,
  selectFromTerminal,
  listWindow,
  useHasRenderHooks,
  DrawnTree,
  HOST_BOUNDED_COMPONENTS,
  SelectField,
  VISIBLE_OPTIONS,
  boundedDrawing,
  heldBack,
  heldOff,
  rebuild,
  renderInputKey,
  siteFailed,
  useEngineDrew,
  useHeldRows,
  useOnScreenInput,
  useRenderAnswer,
  useRenderHook,
  useRenderVersion,
  useSettledDraw,
};
