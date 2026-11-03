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
  y,
  P,
  Se,
  R,
  zt,
  ce,
  Q,
  Vc,
  qt,
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
  Vme,
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

//@ chunk-bc20zedk.js:37224-37228 placement
init_react_production();
//@ chunk-bc20zedk.js:37228-37428 placement
function useImageFileSupport(o) {
  let { terminalImages } = useApp();
  let { internal_querier: internalQuerier } = useStdin();
  let terminalImageFiles = getTerminalImageFiles();
  let [f, u] = y(() => terminalImageFiles.get());
  P(() => {
    u(terminalImageFiles.get());
    return terminalImageFiles.onSettle(() => u(terminalImageFiles.get()));
  }, [terminalImageFiles]);
  P(() => {
    if (o) {
      ensureImageFileProbe(internalQuerier, terminalImages);
      u(terminalImageFiles.get());
    }
  }, [o, internalQuerier, terminalImages, terminalImageFiles]);
  return f;
}
//@ chunk-bc20zedk.js:37428-37466 placement
var imagePresenter = (protocol, p) =>
  protocol === "iterm" ? itermImageSequenceThunk(p) : terminalImagePainter(p);
//@ chunk-bc20zedk.js:37466-39109 placement
function KittyImage(props) {
  let { plugin, elementKey, source, columns, rows } = props;
  let { terminalImages } = useApp();
  let { internal_querier: internalQuerier } = useStdin();
  let x = Se(RenderInstance);
  let requestId = x?.requestId ?? DETACHED;
  let component = x?.component;
  let imageProtocol = useImageProtocol();
  let width = imageProtocol?.width;
  let protocol = imageProtocol?.protocol;
  let L = isNamedImageSource(source);
  let A = protocol === "kitty";
  let imageFileSupport = useImageFileSupport(L && A);
  let N = !L || (A && imageFileSupport.state === "settled" && imageFileSupport.value);
  let [E, U] = y();
  let [Y, B] = y();
  let W = R(EMPTY_IMAGE_STATE);
  zt(() => {
    let D =
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
              : [component, rasterKey(requestId, elementKey ?? "", plugin)].join(Vme),
          );
    if (terminalImages === null || D === undefined || protocol === undefined) return;
    U({
      id: D,
      images: terminalImages,
      protocol,
    });
    return () => {
      terminalImages.free(D);
      W.current = EMPTY_IMAGE_STATE;
      U(undefined);
      B(undefined);
    };
  }, [terminalImages, width, protocol, plugin, component, requestId, elementKey]);
  zt(() => {
    if (E === undefined) return;
    if (!N) {
      W.current = EMPTY_IMAGE_STATE;
      B(undefined);
      return;
    }
    let M = stableStringifySafe(source);
    let D = `${columns}x${rows}`;
    let G = M !== W.current.reactKey;
    let q = G ? source : (W.current.source ?? source);
    let X = !G && D === W.current.box;
    let J = !G && isShmSource(q);
    if (X || J) return;
    let Z = E.images.transmit(
      E.id,
      imagePresenter(E.protocol, {
        source: q,
        columns,
        rows,
      }),
      {
        resend: !isShmSource(q),
        box: {
          columns,
          rows,
        },
      },
    );
    W.current = {
      reactKey: M,
      source: q,
      box: D,
    };
    B(Z ? E : undefined);
  }, [E, source, N, columns, rows]);
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
    ce(
      (M) => {
        let D = isNamedImageSource(M);
        if (D) ensureImageFileProbe(internalQuerier, terminalImages);
        let G = renderPluginImage({
          hasRoot: terminalImages !== null,
          placeholders: getTerminalCapabilities().get("kittyGraphics"),
          inlineImages: itermImageSupport(),
          hasId: E !== undefined,
          isReference: D,
          files: getTerminalImageFiles().get(),
        });
        if (G !== undefined || E === undefined) return G;
        let q = isShmSource(M);
        if (q && E.images.isBackedUp(E.id))
          return "the surface has not written its last frames (paused or busy); the object was not sent, unlink it and blit again later";
        if (
          !E.images.transmit(
            E.id,
            imagePresenter(E.protocol, {
              source: M,
              columns,
              rows,
            }),
            {
              resend: !q,
              box: {
                columns,
                rows,
              },
            },
          )
        )
          return "the terminal sink refused the source";
        W.current = {
          ...W.current,
          source: M,
          box: `${columns}x${rows}`,
        };
        B(E);
        return;
      },
      [internalQuerier, terminalImages, E, columns, rows],
    ),
  );
  return Y;
}
//@ chunk-bc20zedk.js:39109-39491 placement
/**
 * 插件图片元素（Kitty/iTerm 占位网格，无 id 时显示 alt）。
 */
function PluginImage(props) {
  let { plugin, elementKey, columns, rows, alt } = props;
  let c = KittyImage(props);
  let id = c?.id;
  let protocol = c?.protocol;
  let rawText = Q(
    () =>
      id === undefined
        ? ""
        : protocol === "iterm"
          ? buildImagePlaceholderGrid(id, columns, rows)
          : buildKittyPlaceholderGrid(id, columns, rows),
    [id, protocol, columns, rows],
  );
  if (id === undefined)
    return Vc(
      Text,
      {
        dimColor: true,
      },
      alt,
    );
  return Vc(
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
    Vc("ink-raw-ansi", {
      rawText,
      rawWidth: columns,
      rawHeight: rows,
    }),
  );
}
//@ chunk-bc20zedk.js:39491-39495 placement
init_react_production();
//@ chunk-bc20zedk.js:39495-39499 placement
init_react_production();
//@ chunk-bc20zedk.js:39499-39931 placement
/**
 * 按最小间隔合并重绘的调度器。
 */
function createPaintScheduler(o) {
  let p = -1 / 0;
  let a = null;
  let m = null;
  let f = 1 / 0;
  function u() {
    m = null;
    f = 1 / 0;
    if (a !== null) {
      let x = a;
      a = null;
      p = Date.now();
      o(x);
    }
  }
  function c(x) {
    let h = Date.now() + x;
    if (m !== null && f <= h) return;
    if (m !== null) clearTimeout(m);
    f = h;
    m = setTimeout(u, x);
  }
  function g(x, h) {
    let max = Math.max(h, p + SCROLL_JUMP_LINES - Date.now());
    a = x;
    if (max <= 0) {
      if (m !== null) clearTimeout(m);
      u();
    } else c(max);
  }
  return {
    paint: (x) => {
      g(x, 0);
    },
    schedule: g,
    cancel: () => {
      if (m !== null) clearTimeout(m);
      m = null;
      f = 1 / 0;
      a = null;
    },
  };
}
//@ chunk-bc20zedk.js:39931-39969 placement
var withPaintOverride = (o, p, paint) => ({
  ...o,
  ...p,
  paint,
});
//@ chunk-bc20zedk.js:39969-40067 placement
function setRawText(node, p) {
  if (node === null || node.attributes.rawText === p) return;
  node.attributes.rawText = p;
  markDirty(node);
  scheduleRenderFrom(node);
}
//@ chunk-bc20zedk.js:40067-40078 placement
var STANDING_REDRAW_MS = 250;
//@ chunk-bc20zedk.js:40078-40173 placement
function scheduleStandingRedraw(o, p, a) {
  let m = p.standing();
  if (m !== "complete") o?.schedule(a, m === "progressing" ? SCROLL_JUMP_LINES : STANDING_REDRAW_MS);
}
//@ chunk-bc20zedk.js:40173-40555 placement
/**
 * 订阅栅格流并把帧绘制到原始 ANSI 节点。
 */
function useRasterPainter(props, p, a) {
  let { plugin, elementKey, columns, rows } = props;
  let g = Se(RenderInstance);
  let x = R(null);
  let paintSchedulerRef = R(null);
  zt(() => {
    let C = {
      columns,
      rows,
    };
    let paintScheduler = createPaintScheduler((T) => {
      setRawText(x.current, rasterToAnsi(T, C, p));
      scheduleStandingRedraw(paintSchedulerRef.current, p, T);
    });
    let b = mountRaster(
      withPaintOverride(
        {
          plugin,
          requestId: g?.requestId ?? DETACHED,
          key: elementKey,
        },
        C,
        paintScheduler.paint,
      ),
    );
    paintSchedulerRef.current = paintScheduler;
    return () => {
      b();
      paintScheduler.cancel();
      paintSchedulerRef.current = null;
    };
  }, [plugin, elementKey, columns, rows, g, p]);
  zt(() => {
    paintSchedulerRef.current?.cancel();
    scheduleStandingRedraw(paintSchedulerRef.current, p, a);
  }, [a, p]);
  return x;
}
//@ chunk-bc20zedk.js:40555-40903 placement
/**
 * 插件栅格元素。
 */
function PluginRaster(props) {
  let { plugin, elementKey, columns, rows, cells } = props;
  let [c] = y(() => RasterStream());
  let g = Q(() => checkRasterCells(cells, columns, rows).words ?? new Uint32Array(), [cells, columns, rows]);
  let ref = useRasterPainter(props, c, g);
  let rawText = Q(
    () =>
      rasterToAnsi(
        g,
        {
          columns,
          rows,
        },
        c,
      ),
    [g, columns, rows, c],
  );
  return Vc(
    Box,
    {
      flexShrink: 0,
      width: columns,
      height: rows,
      overflow: "hidden",
      elementKey,
      elementPlugin: plugin,
    },
    Vc("ink-raw-ansi", {
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
function listWindow(o, highlight) {
  let max = Math.max(0, highlight - VISIBLE_OPTIONS + 1);
  let max_2 = Math.max(0, Math.min(VISIBLE_OPTIONS, o - max));
  let f = o - max - max_2;
  return {
    first: max,
    size: max_2,
    hidden: f,
    rows: max_2 + (f > 0 ? 1 : 0),
  };
}
//@ chunk-bc20zedk.js:41043-41047 placement
init_react_production();
//@ chunk-bc20zedk.js:41047-41051 placement
init_react_production();
//@ chunk-bc20zedk.js:41051-41068 placement
var SelectFields = qt(null);
//@ chunk-bc20zedk.js:41068-41893 placement
function SelectField(props) {
  let { plugin, handle, element, options } = props;
  let siteFocus = useSiteFocus({
    plugin,
    handle,
  });
  let c = Se(SelectFields);
  let g = c?.pickedOf(plugin, element) ?? props.value;
  let found = options.find((option) => option.value === g);
  let children = props.label === undefined ? "" : `${props.label}: `;
  let { hasKeyboardFocus } = siteFocus;
  let open = c?.open;
  let b = open !== null && open !== undefined && open.plugin === plugin && open.handle === handle;
  let highlight = b ? open.highlight : 0;
  let { first, size, hidden } = listWindow(b ? options.length : 0, highlight);
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
                inverse: hasKeyboardFocus && !b,
                children: found.label ?? found.value,
              }),
          jsxProd_default(Text, {
            dimColor: true,
            children: b ? " \u25B4" : " \u25BE",
          }),
        ],
      }),
      options.slice(first, first + size).map((option, E) =>
        jsxProd_default(
          Text,
          {
            inverse: first + E === highlight,
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
function textStyleProps(props) {
  let p = weightAndBold(props);
  if (p === undefined) return p;
  let { size, weight, mono, tabular, bold, ...g } = p;
  return bold === true
    ? {
        ...g,
        bold,
      }
    : g;
}
//@ chunk-bc20zedk.js:42026-44565 placement
function rebuild(o, p, a = new Set()) {
  if (typeof o === "string") return Vc(Text, null, o);
  if (o.type === "engine") return p(o.ref);
  if (o.type === "Button")
    return Vc(PressButton, {
      plugin: o.press.plugin,
      handle: o.press.handle,
      element: o.props.key,
      label: o.props.label,
      hotkey: o.props.hotkey,
      action: o.props.action,
      plain: o.props.plain,
      dimColor: o.props.dimColor,
      variant: o.props.variant,
      role: o.props.role,
      hover: o.hover,
      held: (o.children ?? []).map((b) => (typeof b === "string" ? b : rebuild(b, p))),
    });
  if (o.type === "Input")
    return Vc(InputField, {
      plugin: o.press.plugin,
      handle: o.press.handle,
      element: o.props.key,
      label: o.props.label,
      placeholder: o.props.placeholder,
      value: o.props.value,
      submitLabel: o.props.submitLabel,
      rows: o.props.rows,
    });
  if (o.type === "Select")
    return Vc(SelectField, {
      plugin: o.press.plugin,
      handle: o.press.handle,
      element: o.props.key,
      label: o.props.label,
      options: o.props.options,
      value: o.props.value,
    });
  if (o.type === "Code") return Vc(CodeBlock, o.props);
  if (o.type === "Markdown")
    return Vc(MarkdownBlock, {
      text: o.props.text,
      dimColor: o.props.dimColor,
      press: "press" in o ? o.press : undefined,
      part: "part" in o ? o.part : undefined,
      elementKey: o.props.key,
      pressableLinks: o.props.pressableLinks,
    });
  if (o.type === "Client")
    return Vc(PluginImageElement, {
      key: `client:${o.client.plugin}:${o.props.key}`,
      rebuild: (b) => rebuild(b, () => null),
      plugin: o.client.plugin,
      module: o.props.module,
      elementKey: o.props.key,
      props: o.props.props,
      drawn: o.props,
      width: o.props.width,
      height: o.props.height,
      flexGrow: o.props.flexGrow,
    });
  if (o.type === "Svg")
    return Vc(
      Text,
      {
        dimColor: true,
      },
      o.props.alt,
    );
  if (o.type === "Image")
    return Vc(PluginImage, {
      ...(o.props.key !== undefined && {
        key: `image:${o.image.plugin}:${o.props.key}`,
      }),
      plugin: o.image.plugin,
      elementKey: o.props.key,
      source: o.props.source,
      columns: o.props.columns,
      rows: o.props.rows,
      alt: o.props.alt,
    });
  if (o.type === "Raster")
    return Vc(PluginRaster, {
      key: `raster:${o.raster.plugin}:${o.props.key}`,
      plugin: o.raster.plugin,
      elementKey: o.props.key,
      columns: o.props.columns,
      rows: o.props.rows,
      cells: o.props.cells,
    });
  let m = o.type === "Text" || o.type === "Link";
  let f = new Set();
  let mapped = (o.children ?? []).map((b) => (m && typeof b === "string" ? b : rebuild(b, p, f)));
  if (o.type === "Link") {
    let { href, label } = o.props;
    let L = drawnHref(href);
    let A = mapped.length > 0 ? mapped : [label ?? L];
    let fallback =
      mapped.length === 0 && label === undefined
        ? undefined
        : Vc(
            Text,
            null,
            ...A,
            " ",
            Vc(
              Text,
              {
                dimColor: true,
              },
              L,
            ),
          );
    return Vc(
      Link,
      {
        url: writtenHref(href),
        fallback,
      },
      ...A,
    );
  }
  let group = groupOf(o.group?.plugin, o.hover);
  let g = o.type === "Text";
  let x = g ? textStyleProps(o.props) : spacingInCells(o.props);
  if (o.type === "Box" && x?.key !== undefined) {
    let { key, ...T } = x;
    let L = boxKeyProblem(key, a) === undefined;
    return Vc(HoverScope, {
      key: L ? String(key) : undefined,
      isLive: L,
      elementKey: String(key),
      layout: T,
      hover: o.hover,
      group,
      children: mapped,
    });
  }
  let h = o.type === "Box" ? Box : Text;
  let { hover } = o;
  return hover === undefined
    ? Vc(h, withHexColors(x), ...mapped)
    : Vc(HoverStyled, {
        isInline: g,
        props: x,
        hover,
        group,
        children: mapped,
      });
}
//@ chunk-bc20zedk.js:44565-44720 placement
function DrawnTree({ tree, input, draw }) {
  let { component, requestId } = input;
  return Vc(
    RenderInstance,
    {
      value: Q(
        () => ({
          component,
          requestId,
        }),
        [component, requestId],
      ),
    },
    rebuild(tree, (u) => draw(heldFor(tree, u, input))),
  );
}
//@ chunk-bc20zedk.js:44720-44745 placement
var HOST_BOUNDED_COMPONENTS = new Set(["Pane"]);
//@ chunk-bc20zedk.js:44745-45115 placement
function boundedDrawing({ tree, input, draw, submittedBy, onThrown }) {
  let { component } = input;
  let c = jsxProd_default(DrawnTree, {
    tree,
    input,
    draw,
  });
  let g;
  let x = () =>
    (g ??= thrownTeller(chainModules(input, submittedBy === undefined ? undefined : [submittedBy]), tree));
  return HOST_BOUNDED_COMPONENTS.has(component)
    ? c
    : jsxProd_default(SentryErrorBoundary, {
        resetKey: tree,
        fallback: jsxProd_default(DrawnTree, {
          tree: ENGINE_ELEMENT,
          input,
          draw,
        }),
        telemetryMessage: () => firstThrowReport(component, x(), "answer"),
        onError: (error) => {
          onThrown(tree);
          renderDraws.noteThrown(input, tree);
          tellThrown({
            component,
            teller: x(),
            error,
          });
        },
        children: c,
      });
}
//@ chunk-bc20zedk.js:45115-45119 placement
init_react_production();
//@ chunk-bc20zedk.js:45119-45123 placement
init_react_production();
//@ chunk-bc20zedk.js:45123-45186 placement
function useEngineDrew(o) {
  let p = R(false);
  if (!o) p.current = true;
  return p.current;
}
//@ chunk-bc20zedk.js:45186-45385 placement
function heldBack(o, props) {
  let { input, drawn, contentRows, isFallback } = props;
  return o.rows !== undefined &&
    (isFallback || o.drawn !== drawn || (contentRows !== undefined && contentRows >= o.rows))
    ? {
        rows: undefined,
        wasOff: false,
        input,
        drawn,
      }
    : o.wasOff
      ? {
          ...o,
          wasOff: false,
        }
      : o;
}
//@ chunk-bc20zedk.js:45385-45634 placement
function heldOff(o, props) {
  let { input, drawn, lastRows, contentRows } = props;
  let c = contentRows === 0;
  let g = !o.wasOff;
  let x = o.input !== input;
  let h = c && o.rows === undefined;
  return g
    ? {
        rows: lastRows,
        wasOff: true,
        input,
        drawn,
      }
    : x
      ? {
          rows: c ? lastRows : undefined,
          wasOff: true,
          input,
          drawn,
        }
      : h
        ? {
            ...o,
            rows: lastRows,
            drawn,
          }
        : {
            ...o,
            drawn,
          };
}
//@ chunk-bc20zedk.js:45634-45638 placement
init_react_production();
//@ chunk-bc20zedk.js:45638-45870 placement
function useHeldRows(props) {
  let { isOff, input, drawn, lastRows } = props;
  let [u, c] = y(() => ({
    rows: isOff ? lastRows : undefined,
    wasOff: isOff,
    input,
    drawn,
  }));
  let g = isOff ? heldOff(u, props) : heldBack(u, props);
  if (g.rows !== u.rows || g.wasOff !== u.wasOff || g.input !== u.input || g.drawn !== u.drawn) c(g);
  return g.rows;
}
//@ chunk-bc20zedk.js:45870-45874 placement
init_react_production();
//@ chunk-bc20zedk.js:45874-46153 placement
function useOnScreenInput(o, p, a) {
  let m = useIsFullscreen() && p;
  let f = a === undefined ? undefined : [a];
  let [u] = y(() => (m ? renderDraws.heldRowsOf(o, f) : undefined));
  let [c, g, x, h] = usePaintedRows(m, y(() => (m ? renderDraws.askedOnScreen(o, f) : undefined))[0]);
  return Q(
    () => ({
      site: c,
      input:
        g === undefined
          ? o
          : {
              ...o,
              props: {
                ...o.props,
                onScreen: g,
              },
            },
      lastRows: x ?? u,
      contentRows: h,
    }),
    [o, g, c, x, h, u],
  );
}
//@ chunk-bc20zedk.js:46153-46157 placement
init_react_production();
//@ chunk-bc20zedk.js:46157-46222 placement
var renderInputKey = (o, p) => (o ? `${p.component}\x00${p.requestId}\x00` + valueKeyOf(p) : "");
//@ chunk-bc20zedk.js:46222-46321 placement
var siteFailed = (o, error) =>
  logForDebugging(`ui.render (${o.component} ${o.requestId}): site failed: ${errorMessage(error)}`, {
    level: "error",
  });
//@ chunk-bc20zedk.js:46321-46855 placement
function useRenderAnswer(o, p, { version, staticFrame, submittedBy }) {
  let u = submittedBy === undefined ? undefined : [submittedBy];
  let [c, g] = y(() => (o ? renderDraws.settled(p, u) : undefined));
  let x = renderInputKey(o, p);
  let C = o && p.requestId !== "" ? renderInstanceKey(p) : undefined;
  P(() => (C !== undefined ? mountStateReader(C) : undefined), [C]);
  P(() => {
    if (!o) {
      g(undefined);
      return;
    }
    if (staticFrame) return;
    let abortController = new AbortController();
    eventCallersWrapper2({
      signal: abortController.signal,
      origin: u,
    })
      .ui.render(p)
      .then(
        (T) => {
          if (!abortController.signal.aborted) g(T);
        },
        (error) => {
          siteFailed(p, error);
          if (!abortController.signal.aborted) g(ENGINE_ELEMENT);
        },
      );
    return () => {
      abortController.abort(new HooksError("ui.render: superseded"));
    };
  }, [x, version, o, submittedBy, staticFrame]);
  let onThrown = ce((b) => g((T) => (T === b ? ENGINE_ELEMENT : T)), []);
  return {
    drawn: c,
    onThrown,
  };
}
//@ chunk-bc20zedk.js:46855-46890 placement
var useRenderVersion = (o) => useStoreSelector(renderVersions(), (p) => siteVersionOf(p, o));
//@ chunk-bc20zedk.js:46890-47671 placement
function useRenderDrawing(o, p, a) {
  let renderVersion = useRenderVersion(o);
  let f = Se(staticRenderStorageSlot);
  let { input, site, lastRows, contentRows } = useOnScreenInput(
    o,
    !f && MESSAGE_COMPONENT_NAMES.has(o.component) && hasRenderHooks(o.component),
    a,
  );
  let h = Q(() => hasRenderHooksFor(input), [input, renderVersion]);
  let { drawn, onThrown } = useRenderAnswer(h, input, {
    version: renderVersion,
    staticFrame: f,
    submittedBy: a,
  });
  let b = R(undefined);
  let hasThrown = ce((U) => U !== undefined && b.current === U, []);
  let L = useEngineDrew(h) || f;
  let heldRows = useHeldRows({
    isOff: h && onScreenOf(input) === null,
    input: h ? valueKeyOf(o) : undefined,
    drawn,
    isFallback: drawn === ENGINE_ELEMENT,
    lastRows,
    contentRows,
  });
  P(() => {
    if (heldRows !== undefined) renderDraws.noteHeldRows(input, heldRows);
  }, [heldRows, drawn, input]);
  let isFullscreen = useIsFullscreen();
  let N = Q(
    () => (f || !isFullscreen) && drawn !== undefined && hasPlacedBox(drawn),
    [f, isFullscreen, drawn],
  );
  return {
    node: Vc(
      Box,
      {
        ref: site,
        flexDirection: "column",
        renderEvent: RENDER_EVENT,
        renderComponent: o.component,
        drawPending: (h && !drawn && !L) || undefined,
        minHeight: heldRows,
        overflow: N ? "hidden" : undefined,
      },
      h
        ? drawn
          ? boundedDrawing({
              tree: drawn,
              input,
              draw: p,
              submittedBy: a,
              onThrown: (U) => {
                b.current = U;
                onThrown(U);
              },
            })
          : L
            ? p(input)
            : null
        : p(input),
    ),
    drawn,
    hasThrown,
  };
}
//@ chunk-bc20zedk.js:47671-47701 placement
var fieldKey = (plugin, element) => `${plugin}\x00${element}`;
//@ chunk-bc20zedk.js:47701-47773 placement
var inputFromTerminal = (o) =>
  logRejection(
    `ui.input ${o.plugin}`,
    dispatchInputQueued({
      ...o,
      surface: "terminal",
    }),
  );
//@ chunk-bc20zedk.js:47773-47846 placement
var selectFromTerminal = (o) =>
  logRejection(
    `ui.select ${o.plugin}`,
    dispatchSelectQueued({
      ...o,
      surface: "terminal",
    }),
  );
//@ chunk-bc20zedk.js:47846-47879 placement
var useHasRenderHooks = (o) => useStoreSelector(renderVersions(), () => hasRenderHooks(o));
//@ chunk-bc20zedk.js:47879-47911 placement
var useRenderHook = (o, p, a) => useRenderDrawing(o, p, a).node;
//@ chunk-bc20zedk.js:47911-47915 placement
init_react_production();
//@ chunk-bc20zedk.js:47915-48217 placement
function useRenderInput(o, p, a) {
  let m = Q(p, a);
  let renderVersion = useRenderVersion({
    surface: "terminal",
    component: o,
    requestId: m.requestId,
  });
  let u = useStoreSelector(renderVersions(), (g) => g.get(VIEWPORT_KEY) ?? 0);
  let isFullscreen = useIsFullscreen();
  return Q(() => {
    let g = paneHostSlot.get();
    return {
      surface: "terminal",
      component: o,
      ...(g !== undefined && {
        viewport: {
          columns: g.conversationColumns,
          rows: g.rows,
          isFullscreen,
        },
      }),
      ...m,
    };
  }, [o, m, renderVersion, u, isFullscreen]);
}
//@ chunk-bc20zedk.js:48217-48245 placement
var useSettledDraw = (o) => renderDraws.settled(o);
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
