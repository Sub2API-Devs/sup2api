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
import { j, y, P, Se, R, zt, ce, Q, Vc, qt } from "../../../../vendor/react/cjs/react.production.js";
import { useApp, usePaintedRows } from "../../../ink/components/Input.js";
import { useStdin } from "../../design-system/ThemeProvider.js";
import { Csn, EA } from "../../../ink/terminalCapabilities.js";
import {
  ensureImageFileProbe,
  itermImageSequenceThunk,
  jo,
  DETACHED,
  useImageProtocol,
  wt,
  createRefusalLogger,
  itermImageSupport,
  PluginImageElement,
} from "./terminalImages.js";
import { RenderInstance } from "./actionKeys.js";
import { ZRt, Prs } from "../../../plugins/functionHooks/ui/imageSource.js";
import {
  ext,
  fromCharCode,
  rasterToAnsi,
  mountRaster,
  RasterStream,
  checkRasterCells,
} from "../../../plugins/functionHooks/ui/raster.js";
import { Rs } from "../../../utils/hooks/hookSerialization.js";
import { useModalOrTerminalSize } from "../../../context/modalContext.js";
import { renderPluginImage } from "../../../plugins/functionHooks/imageApi.js";
import { buildImagePlaceholderGrid } from "../../../ink/termio/imagePlaceholders.js";
import { buildKittyPlaceholderGrid } from "../../../ink/termio/kittyGraphics.js";
import { Text, Box, Link } from "../../../ink/components/Text.js";
import { Xh } from "../../../ink/scrollConstants.js";
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
import { r, e } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
import { Lae } from "../../../plugins/functionHooks/sites/promptContextSites.js";
import { useIsFullscreen } from "../../../ink/renderModeContext.js";
import { logForDebugging } from "../../../utils/debug.js";
import { errorMessage } from "../../../utils/errors.js";
import { renderInstanceKey, mountStateReader } from "../../../plugins/functionHooks/api/state.js";
import { Jue } from "../../../plugins/functionHooks/eventCatalog.js";
import { HooksError } from "../../../plugins/functionHooks/hooksErrors.js";
import { useStoreSelector } from "../../../hooks/useStoreSelector.js";
import { JB, ier } from "../../../plugins/functionHooks/ui/renderInstances.js";
import { a0t } from "../../../utils/staticRender.js";
import { MESSAGE_COMPONENT_NAMES } from "../../../plugins/functionHooks/sites/uiSites.js";
import { RENDER_EVENT } from "../../../plugins/functionHooks/ui/renderSites.js";
import { SRe } from "../../../plugins/functionHooks/uiApi.js";
import { Cer, xer } from "../../../plugins/functionHooks/ui/interactions.js";
import { g2 } from "../../../plugins/functionHooks/panes.js";

//@ chunk-bc20zedk.js:37224-37228 placement
j();
//@ chunk-bc20zedk.js:37228-37428 placement
function useImageFileSupport(o) {
  let { terminalImages: terminalImages } = useApp(),
    { internal_querier: internal_querier } = useStdin(),
    m = Csn(),
    [f, u] = y(() => m.get());
  return (
    P(() => (u(m.get()), m.onSettle(() => u(m.get()))), [m]),
    P(() => {
      if (o) (ensureImageFileProbe(internal_querier, terminalImages), u(m.get()));
    }, [o, internal_querier, terminalImages, m]),
    f
  );
}
//@ chunk-bc20zedk.js:37428-37466 placement
var zo = (o, p) => (o === "iterm" ? itermImageSequenceThunk(p) : jo(p));
//@ chunk-bc20zedk.js:37466-39109 placement
function KittyImage(o) {
  let { plugin: plugin, elementKey: elementKey, source: source, columns: columns, rows: rows } = o,
    { terminalImages: terminalImages } = useApp(),
    { internal_querier: internal_querier } = useStdin(),
    x = Se(RenderInstance),
    h = x?.requestId ?? DETACHED,
    C = x?.component,
    I = useImageProtocol(),
    b = I?.width,
    T = I?.protocol,
    L = ZRt(source),
    A = T === "kitty",
    _ = useImageFileSupport(L && A),
    N = !L || (A && _.state === "settled" && _.value),
    [E, U] = y(),
    [Y, B] = y(),
    W = R(wt);
  return (
    zt(() => {
      let D =
        terminalImages === null || b === void 0 || T === void 0
          ? void 0
          : terminalImages.allocate(
              b,
              createRefusalLogger({ plugin: plugin, requestId: h, key: elementKey }),
              T,
              elementKey === void 0 && C === void 0
                ? void 0
                : [C, ext(h, elementKey ?? "", plugin)].join(fromCharCode),
            );
      if (terminalImages === null || D === void 0 || T === void 0) return;
      return (
        U({ id: D, images: terminalImages, protocol: T }),
        () => {
          (terminalImages.free(D), (W.current = wt), U(void 0), B(void 0));
        }
      );
    }, [terminalImages, b, T, plugin, C, h, elementKey]),
    zt(() => {
      if (E === void 0) return;
      if (!N) {
        ((W.current = wt), B(void 0));
        return;
      }
      let M = Rs(source),
        D = `${columns}x${rows}`,
        G = M !== W.current.reactKey,
        q = G ? source : (W.current.source ?? source),
        X = !G && D === W.current.box,
        J = !G && Prs(q);
      if (X || J) return;
      let transmit = E.images.transmit(E.id, zo(E.protocol, { source: q, columns: columns, rows: rows }), {
        resend: !Prs(q),
        box: { columns: columns, rows: rows },
      });
      ((W.current = { reactKey: M, source: q, box: D }), B(transmit ? E : void 0));
    }, [E, source, N, columns, rows]),
    useModalOrTerminalSize(
      { plugin: plugin, requestId: h, key: elementKey },
      { columns: columns, rows: rows },
      ce(
        (M) => {
          let D = ZRt(M);
          if (D) ensureImageFileProbe(internal_querier, terminalImages);
          let G = renderPluginImage({
            hasRoot: terminalImages !== null,
            placeholders: EA().get("kittyGraphics"),
            inlineImages: itermImageSupport(),
            hasId: E !== void 0,
            isReference: D,
            files: Csn().get(),
          });
          if (G !== void 0 || E === void 0) return G;
          let q = Prs(M);
          if (q && E.images.isBackedUp(E.id))
            return "the surface has not written its last frames (paused or busy); the object was not sent, unlink it and blit again later";
          if (
            !E.images.transmit(E.id, zo(E.protocol, { source: M, columns: columns, rows: rows }), {
              resend: !q,
              box: { columns: columns, rows: rows },
            })
          )
            return "the terminal sink refused the source";
          ((W.current = { ...W.current, source: M, box: `${columns}x${rows}` }), B(E));
          return;
        },
        [internal_querier, terminalImages, E, columns, rows],
      ),
    ),
    Y
  );
}
/**
 * 插件图片元素（Kitty/iTerm 占位网格，无 id 时显示 alt）。
 */
//@ chunk-bc20zedk.js:39109-39491 placement
function PluginImage(o) {
  let { plugin: plugin, elementKey: elementKey, columns: columns, rows: rows, alt: alt } = o,
    c = KittyImage(o),
    g = c?.id,
    x = c?.protocol,
    h = Q(
      () =>
        g === void 0
          ? ""
          : x === "iterm"
            ? buildImagePlaceholderGrid(g, columns, rows)
            : buildKittyPlaceholderGrid(g, columns, rows),
      [g, x, columns, rows],
    );
  if (g === void 0) return Vc(Text, { dimColor: !0 }, alt);
  return Vc(
    Box,
    {
      flexShrink: 0,
      width: columns,
      height: rows,
      overflow: "hidden",
      noSelect: !0,
      ...(elementKey !== void 0 && { elementKey: elementKey, elementPlugin: plugin }),
    },
    Vc("ink-raw-ansi", { rawText: h, rawWidth: columns, rawHeight: rows }),
  );
}
//@ chunk-bc20zedk.js:39491-39495 placement
j();
//@ chunk-bc20zedk.js:39495-39499 placement
j();
/**
 * 按最小间隔合并重绘的调度器。
 */
//@ chunk-bc20zedk.js:39499-39931 placement
function createPaintScheduler(o) {
  let p = -1 / 0,
    a = null,
    m = null,
    f = 1 / 0;
  function u() {
    if (((m = null), (f = 1 / 0), a !== null)) {
      let x = a;
      ((a = null), (p = Date.now()), o(x));
    }
  }
  function c(x) {
    let h = Date.now() + x;
    if (m !== null && f <= h) return;
    if (m !== null) clearTimeout(m);
    ((f = h), (m = setTimeout(u, x)));
  }
  function g(x, h) {
    let max = Math.max(h, p + Xh - Date.now());
    if (((a = x), max <= 0)) {
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
      ((m = null), (f = 1 / 0), (a = null));
    },
  };
}
//@ chunk-bc20zedk.js:39931-39969 placement
var Zo = (o, p, a) => ({ ...o, ...p, paint: a });
//@ chunk-bc20zedk.js:39969-40067 placement
function en(o, p) {
  if (o === null || o.attributes.rawText === p) return;
  ((o.attributes.rawText = p), markDirty(o), scheduleRenderFrom(o));
}
//@ chunk-bc20zedk.js:40067-40078 placement
var tn = 250;
//@ chunk-bc20zedk.js:40078-40173 placement
function ar(o, p, a) {
  let standing = p.standing();
  if (standing !== "complete") o?.schedule(a, standing === "progressing" ? Xh : tn);
}
/**
 * 订阅栅格流并把帧绘制到原始 ANSI 节点。
 */
//@ chunk-bc20zedk.js:40173-40555 placement
function useRasterPainter(o, p, a) {
  let { plugin: plugin, elementKey: elementKey, columns: columns, rows: rows } = o,
    g = Se(RenderInstance),
    x = R(null),
    h = R(null);
  return (
    zt(() => {
      let C = { columns: columns, rows: rows },
        I = createPaintScheduler((T) => {
          (en(x.current, rasterToAnsi(T, C, p)), ar(h.current, p, T));
        }),
        b = mountRaster(
          Zo({ plugin: plugin, requestId: g?.requestId ?? DETACHED, key: elementKey }, C, I.paint),
        );
      return (
        (h.current = I),
        () => {
          (b(), I.cancel(), (h.current = null));
        }
      );
    }, [plugin, elementKey, columns, rows, g, p]),
    zt(() => {
      (h.current?.cancel(), ar(h.current, p, a));
    }, [a, p]),
    x
  );
}
/**
 * 插件栅格元素。
 */
//@ chunk-bc20zedk.js:40555-40903 placement
function PluginRaster(o) {
  let { plugin: plugin, elementKey: elementKey, columns: columns, rows: rows, cells: cells } = o,
    [c] = y(() => RasterStream()),
    g = Q(() => checkRasterCells(cells, columns, rows).words ?? new Uint32Array(), [cells, columns, rows]),
    x = useRasterPainter(o, c, g),
    h = Q(() => rasterToAnsi(g, { columns: columns, rows: rows }, c), [g, columns, rows, c]);
  return Vc(
    Box,
    {
      flexShrink: 0,
      width: columns,
      height: rows,
      overflow: "hidden",
      elementKey: elementKey,
      elementPlugin: plugin,
    },
    Vc("ink-raw-ansi", { ref: x, rawText: h, rawWidth: columns, rawHeight: rows }),
  );
}
//@ chunk-bc20zedk.js:40903-40912 placement
var VISIBLE_OPTIONS = 8;
//@ chunk-bc20zedk.js:40912-41043 placement
function listWindow(o, p) {
  let max = Math.max(0, p - VISIBLE_OPTIONS + 1),
    max_2 = Math.max(0, Math.min(VISIBLE_OPTIONS, o - max)),
    f = o - max - max_2;
  return { first: max, size: max_2, hidden: f, rows: max_2 + (f > 0 ? 1 : 0) };
}
//@ chunk-bc20zedk.js:41043-41047 placement
j();
//@ chunk-bc20zedk.js:41047-41051 placement
j();
//@ chunk-bc20zedk.js:41051-41068 placement
var SelectFields = qt(null);
//@ chunk-bc20zedk.js:41068-41893 placement
function SelectField(o) {
  let { plugin: plugin, handle: handle, element: element, options: options } = o,
    u = useSiteFocus({ plugin: plugin, handle: handle }),
    c = Se(SelectFields),
    g = c?.pickedOf(plugin, element) ?? o.value,
    found = options.find((N) => N.value === g),
    h = o.label === void 0 ? "" : `${o.label}: `,
    { hasKeyboardFocus: hasKeyboardFocus } = u,
    I = c?.open,
    b = I !== null && I !== void 0 && I.plugin === plugin && I.handle === handle,
    T = b ? I.highlight : 0,
    { first: first, size: size, hidden: hidden } = listWindow(b ? options.length : 0, T);
  return r(Box, {
    ref: u.ref,
    flexDirection: "column",
    flexShrink: 0,
    elementKey: element,
    elementPlugin: plugin,
    onClick: u.onClick,
    children: [
      r(Text, {
        wrap: "truncate-end",
        children: [
          e(Text, { bold: hasKeyboardFocus, children: h }),
          found === void 0
            ? e(Text, { dimColor: !0, children: "none" })
            : e(Text, { inverse: hasKeyboardFocus && !b, children: found.label ?? found.value }),
          e(Text, { dimColor: !0, children: b ? " \u25B4" : " \u25BE" }),
        ],
      }),
      options
        .slice(first, first + size)
        .map((N, E) =>
          e(
            Text,
            { inverse: first + E === T, wrap: "truncate-end", children: `  ${N.label ?? N.value}` },
            N.value,
          ),
        ),
      hidden > 0 && e(Text, { dimColor: !0, children: `  \u2026 ${hidden} more` }),
    ],
  });
}
//@ chunk-bc20zedk.js:41893-42026 placement
function textStyleProps(o) {
  let p = weightAndBold(o);
  if (p === void 0) return p;
  let { size: size, weight: weight, mono: mono, tabular: tabular, bold: bold, ...g } = p;
  return bold === !0 ? { ...g, bold: bold } : g;
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
      press: "press" in o ? o.press : void 0,
      part: "part" in o ? o.part : void 0,
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
  if (o.type === "Svg") return Vc(Text, { dimColor: !0 }, o.props.alt);
  if (o.type === "Image")
    return Vc(PluginImage, {
      ...(o.props.key !== void 0 && { key: `image:${o.image.plugin}:${o.props.key}` }),
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
  let m = o.type === "Text" || o.type === "Link",
    f = new Set(),
    mapped = (o.children ?? []).map((b) => (m && typeof b === "string" ? b : rebuild(b, p, f)));
  if (o.type === "Link") {
    let { href: href, label: label } = o.props,
      L = drawnHref(href),
      A = mapped.length > 0 ? mapped : [label ?? L],
      N =
        mapped.length === 0 && label === void 0
          ? void 0
          : Vc(Text, null, ...A, " ", Vc(Text, { dimColor: !0 }, L));
    return Vc(Link, { url: writtenHref(href), fallback: N }, ...A);
  }
  let c = groupOf(o.group?.plugin, o.hover),
    g = o.type === "Text",
    x = g ? textStyleProps(o.props) : spacingInCells(o.props);
  if (o.type === "Box" && x?.key !== void 0) {
    let { key: key, ...T } = x,
      L = boxKeyProblem(key, a) === void 0;
    return Vc(HoverScope, {
      key: L ? String(key) : void 0,
      isLive: L,
      elementKey: String(key),
      layout: T,
      hover: o.hover,
      group: c,
      children: mapped,
    });
  }
  let h = o.type === "Box" ? Box : Text,
    { hover: hover } = o;
  return hover === void 0
    ? Vc(h, withHexColors(x), ...mapped)
    : Vc(HoverStyled, { isInline: g, props: x, hover: hover, group: c, children: mapped });
}
//@ chunk-bc20zedk.js:44565-44720 placement
function DrawnTree({ tree: tree, input: input, draw: draw }) {
  let { component: component, requestId: requestId } = input;
  return Vc(
    RenderInstance,
    { value: Q(() => ({ component: component, requestId: requestId }), [component, requestId]) },
    rebuild(tree, (u) => draw(heldFor(tree, u, input))),
  );
}
//@ chunk-bc20zedk.js:44720-44745 placement
var HOST_BOUNDED_COMPONENTS = new Set(["Pane"]);
//@ chunk-bc20zedk.js:44745-45115 placement
function boundedDrawing({
  tree: tree,
  input: input,
  draw: draw,
  submittedBy: submittedBy,
  onThrown: onThrown,
}) {
  let { component: component } = input,
    c = e(DrawnTree, { tree: tree, input: input, draw: draw }),
    g,
    x = () =>
      (g ??= thrownTeller(chainModules(input, submittedBy === void 0 ? void 0 : [submittedBy]), tree));
  return HOST_BOUNDED_COMPONENTS.has(component)
    ? c
    : e(SentryErrorBoundary, {
        resetKey: tree,
        fallback: e(DrawnTree, { tree: Lae, input: input, draw: draw }),
        telemetryMessage: () => firstThrowReport(component, x(), "answer"),
        onError: (h) => {
          (onThrown(tree),
            renderDraws.noteThrown(input, tree),
            tellThrown({ component: component, teller: x(), error: h }));
        },
        children: c,
      });
}
//@ chunk-bc20zedk.js:45115-45119 placement
j();
//@ chunk-bc20zedk.js:45119-45123 placement
j();
//@ chunk-bc20zedk.js:45123-45186 placement
function useEngineDrew(o) {
  let p = R(!1);
  if (!o) p.current = !0;
  return p.current;
}
//@ chunk-bc20zedk.js:45186-45385 placement
function heldBack(o, p) {
  let { input: input, drawn: drawn, contentRows: contentRows, isFallback: isFallback } = p;
  return o.rows !== void 0 &&
    (isFallback || o.drawn !== drawn || (contentRows !== void 0 && contentRows >= o.rows))
    ? { rows: void 0, wasOff: !1, input: input, drawn: drawn }
    : o.wasOff
      ? { ...o, wasOff: !1 }
      : o;
}
//@ chunk-bc20zedk.js:45385-45634 placement
function heldOff(o, p) {
  let { input: input, drawn: drawn, lastRows: lastRows, contentRows: contentRows } = p,
    c = contentRows === 0,
    g = !o.wasOff,
    x = o.input !== input,
    h = c && o.rows === void 0;
  return g
    ? { rows: lastRows, wasOff: !0, input: input, drawn: drawn }
    : x
      ? { rows: c ? lastRows : void 0, wasOff: !0, input: input, drawn: drawn }
      : h
        ? { ...o, rows: lastRows, drawn: drawn }
        : { ...o, drawn: drawn };
}
//@ chunk-bc20zedk.js:45634-45638 placement
j();
//@ chunk-bc20zedk.js:45638-45870 placement
function useHeldRows(o) {
  let { isOff: isOff, input: input, drawn: drawn, lastRows: lastRows } = o,
    [u, c] = y(() => ({ rows: isOff ? lastRows : void 0, wasOff: isOff, input: input, drawn: drawn })),
    g = isOff ? heldOff(u, o) : heldBack(u, o);
  if (g.rows !== u.rows || g.wasOff !== u.wasOff || g.input !== u.input || g.drawn !== u.drawn) c(g);
  return g.rows;
}
//@ chunk-bc20zedk.js:45870-45874 placement
j();
//@ chunk-bc20zedk.js:45874-46153 placement
function useOnScreenInput(o, p, a) {
  let m = useIsFullscreen() && p,
    f = a === void 0 ? void 0 : [a],
    [u] = y(() => (m ? renderDraws.heldRowsOf(o, f) : void 0)),
    [c, g, x, h] = usePaintedRows(m, y(() => (m ? renderDraws.askedOnScreen(o, f) : void 0))[0]);
  return Q(
    () => ({
      site: c,
      input: g === void 0 ? o : { ...o, props: { ...o.props, onScreen: g } },
      lastRows: x ?? u,
      contentRows: h,
    }),
    [o, g, c, x, h, u],
  );
}
//@ chunk-bc20zedk.js:46153-46157 placement
j();
//@ chunk-bc20zedk.js:46157-46222 placement
var renderInputKey = (o, p) => (o ? `${p.component}\x00${p.requestId}\x00` + valueKeyOf(p) : "");
//@ chunk-bc20zedk.js:46222-46321 placement
var siteFailed = (o, p) =>
  logForDebugging(`ui.render (${o.component} ${o.requestId}): site failed: ${errorMessage(p)}`, {
    level: "error",
  });
//@ chunk-bc20zedk.js:46321-46855 placement
function useRenderAnswer(o, p, { version: version, staticFrame: staticFrame, submittedBy: submittedBy }) {
  let u = submittedBy === void 0 ? void 0 : [submittedBy],
    [c, g] = y(() => (o ? renderDraws.settled(p, u) : void 0)),
    x = renderInputKey(o, p),
    C = o && p.requestId !== "" ? renderInstanceKey(p) : void 0;
  (P(() => (C !== void 0 ? mountStateReader(C) : void 0), [C]),
    P(() => {
      if (!o) {
        g(void 0);
        return;
      }
      if (staticFrame) return;
      let abortController = new AbortController();
      return (
        Jue({ signal: abortController.signal, origin: u })
          .ui.render(p)
          .then(
            (T) => {
              if (!abortController.signal.aborted) g(T);
            },
            (T) => {
              if ((siteFailed(p, T), !abortController.signal.aborted)) g(Lae);
            },
          ),
        () => {
          abortController.abort(new HooksError("ui.render: superseded"));
        }
      );
    }, [x, version, o, submittedBy, staticFrame]));
  let I = ce((b) => g((T) => (T === b ? Lae : T)), []);
  return { drawn: c, onThrown: I };
}
//@ chunk-bc20zedk.js:46855-46890 placement
var useRenderVersion = (o) => useStoreSelector(JB(), (p) => siteVersionOf(p, o));
//@ chunk-bc20zedk.js:46890-47671 placement
function useRenderDrawing(o, p, a) {
  let m = useRenderVersion(o),
    f = Se(a0t),
    {
      input: input,
      site: site,
      lastRows: lastRows,
      contentRows: contentRows,
    } = useOnScreenInput(o, !f && MESSAGE_COMPONENT_NAMES.has(o.component) && hasRenderHooks(o.component), a),
    h = Q(() => hasRenderHooksFor(input), [input, m]),
    { drawn: drawn, onThrown: onThrown } = useRenderAnswer(h, input, {
      version: m,
      staticFrame: f,
      submittedBy: a,
    }),
    b = R(void 0),
    T = ce((U) => U !== void 0 && b.current === U, []),
    L = useEngineDrew(h) || f,
    A = useHeldRows({
      isOff: h && onScreenOf(input) === null,
      input: h ? valueKeyOf(o) : void 0,
      drawn: drawn,
      isFallback: drawn === Lae,
      lastRows: lastRows,
      contentRows: contentRows,
    });
  P(() => {
    if (A !== void 0) renderDraws.noteHeldRows(input, A);
  }, [A, drawn, input]);
  let _ = useIsFullscreen(),
    N = Q(() => (f || !_) && drawn !== void 0 && hasPlacedBox(drawn), [f, _, drawn]);
  return {
    node: Vc(
      Box,
      {
        ref: site,
        flexDirection: "column",
        renderEvent: RENDER_EVENT,
        renderComponent: o.component,
        drawPending: (h && !drawn && !L) || void 0,
        minHeight: A,
        overflow: N ? "hidden" : void 0,
      },
      h
        ? drawn
          ? boundedDrawing({
              tree: drawn,
              input: input,
              draw: p,
              submittedBy: a,
              onThrown: (U) => {
                ((b.current = U), onThrown(U));
              },
            })
          : L
            ? p(input)
            : null
        : p(input),
    ),
    drawn: drawn,
    hasThrown: T,
  };
}
//@ chunk-bc20zedk.js:47671-47701 placement
var fieldKey = (o, p) => `${o}\x00${p}`;
//@ chunk-bc20zedk.js:47701-47773 placement
var inputFromTerminal = (o) => SRe(`ui.input ${o.plugin}`, Cer({ ...o, surface: "terminal" }));
//@ chunk-bc20zedk.js:47773-47846 placement
var selectFromTerminal = (o) => SRe(`ui.select ${o.plugin}`, xer({ ...o, surface: "terminal" }));
//@ chunk-bc20zedk.js:47846-47879 placement
var useHasRenderHooks = (o) => useStoreSelector(JB(), () => hasRenderHooks(o));
//@ chunk-bc20zedk.js:47879-47911 placement
var useRenderHook = (o, p, a) => useRenderDrawing(o, p, a).node;
//@ chunk-bc20zedk.js:47911-47915 placement
j();
//@ chunk-bc20zedk.js:47915-48217 placement
function useRenderInput(o, p, a) {
  let m = Q(p, a),
    f = useRenderVersion({ surface: "terminal", component: o, requestId: m.requestId }),
    u = useStoreSelector(JB(), (g) => g.get(ier) ?? 0),
    c = useIsFullscreen();
  return Q(() => {
    let g = g2.get();
    return {
      surface: "terminal",
      component: o,
      ...(g !== void 0 && { viewport: { columns: g.conversationColumns, rows: g.rows, isFullscreen: c } }),
      ...m,
    };
  }, [o, m, f, u, c]);
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
