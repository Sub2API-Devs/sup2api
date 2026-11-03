/**
 * components/pluginUi/render/actionKeys.ts
 *
 * 2.1.316 新增。插件渲染元素的动作按键。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bc20zedk.js (18)
 * attribution: placement 18
 */
import { Ar } from "../../../../runtime/bun-runtime.js";
import {
  CodeBlock,
  DEFAULT_COLUMNS,
  FIELD_MIN_COLUMNS,
  FocusedNode,
  FocusedPress,
  HEX_COLOR_PROPS,
  HoverScope,
  HoverStyled,
  InputField,
  InputFields,
  ScopeHovered,
  SiteColumns,
  SiteRows,
  adjustHoverGroup,
  clippedHunks,
  clippedLines,
  focusClick,
  groupMember,
  groupOf,
  heldFor,
  highlightPath,
  hoverGroupsStore,
  hoverOverridesOf,
  rulerCut,
  useHoverGroup,
  useHoverLit,
  useSiteFocus,
  withHexColors,
} from "./elements.js";
import {
  DrawnTree,
  HOST_BOUNDED_COMPONENTS,
  SelectField,
  SelectFields,
  VISIBLE_OPTIONS,
  boundedDrawing,
  fieldKey,
  heldBack,
  heldOff,
  inputFromTerminal,
  listWindow,
  rebuild,
  renderInputKey,
  selectFromTerminal,
  siteFailed,
  useEngineDrew,
  useHasRenderHooks,
  useHeldRows,
  useOnScreenInput,
  useRenderAnswer,
  useRenderDrawing,
  useRenderHook,
  useRenderInput,
  useRenderVersion,
  useSettledDraw,
} from "./RenderInstance.js";
import {
  HotkeySeat,
  MARKDOWN_LINK_SCHEMES,
  MarkdownBlock,
  PressButton,
  releaseInkFocus,
} from "./MarkdownBlock.js";
import { PANE_COLORS, Ftr } from "../../../plugins/functionHooks/panes.js";
import { SRe } from "../../../plugins/functionHooks/uiApi.js";
import { j, qt, Se, y, Q, zt, P } from "../../../../vendor/react/cjs/react.production.js";
import { ge } from "../../../utils/identity.js";
import { uniq } from "../../../utils/collections.js";
import { handleUiPress } from "../../../plugins/functionHooks/ui/interactions.js";
import { useKeybindingContext } from "../../../keybindings/KeybindingContext.js";
import { useHasAutoDialog } from "../../../state/dialogQueue.js";

//@ chunk-bc20zedk.js:2583-2593 placement
var actionKeysNamespace = {};
//@ chunk-bc20zedk.js:2593-4019 placement
Ar(actionKeysNamespace, {
  ActionKeysSeat: () => ActionKeysSeat,
  BodyColumns: () => BodyColumns,
  ClickedPress: () => ClickedPress,
  CodeBlock: () => CodeBlock,
  DEFAULT_COLUMNS: () => DEFAULT_COLUMNS,
  DrawnTree: () => DrawnTree,
  FIELD_MIN_COLUMNS: () => FIELD_MIN_COLUMNS,
  FocusedNode: () => FocusedNode,
  FocusedPress: () => FocusedPress,
  HEX_COLOR_PROPS: () => HEX_COLOR_PROPS,
  HOST_BOUNDED_COMPONENTS: () => HOST_BOUNDED_COMPONENTS,
  HotkeySeat: () => HotkeySeat,
  HoverScope: () => HoverScope,
  HoverStyled: () => HoverStyled,
  InputField: () => InputField,
  InputFields: () => InputFields,
  MARKDOWN_LINK_SCHEMES: () => MARKDOWN_LINK_SCHEMES,
  MarkdownBlock: () => MarkdownBlock,
  NAMED_TO_HEX: () => PANE_COLORS,
  PressButton: () => PressButton,
  RenderInstance: () => RenderInstance,
  ScopeHovered: () => ScopeHovered,
  SelectField: () => SelectField,
  SelectFields: () => SelectFields,
  SiteColumns: () => SiteColumns,
  SiteRows: () => SiteRows,
  VISIBLE_OPTIONS: () => VISIBLE_OPTIONS,
  adjustHoverGroup: () => adjustHoverGroup,
  boundedDrawing: () => boundedDrawing,
  clippedHunks: () => clippedHunks,
  clippedLines: () => clippedLines,
  default: () => actionKeysNamespace,
  fieldKey: () => fieldKey,
  focusClick: () => focusClick,
  groupMember: () => groupMember,
  groupOf: () => groupOf,
  heldBack: () => heldBack,
  heldFor: () => heldFor,
  heldOff: () => heldOff,
  hexOfNamed: () => Ftr,
  highlightPath: () => highlightPath,
  hoverGroupsStore: () => hoverGroupsStore,
  hoverOverridesOf: () => hoverOverridesOf,
  inputFromTerminal: () => inputFromTerminal,
  listWindow: () => listWindow,
  pressFromTerminal: () => pressFromTerminal,
  rebuild: () => rebuild,
  releaseInkFocus: () => releaseInkFocus,
  renderInputKey: () => renderInputKey,
  rulerCut: () => rulerCut,
  selectFromTerminal: () => selectFromTerminal,
  settleQuietly: () => SRe,
  siteFailed: () => siteFailed,
  useActionKeys: () => useActionKeys,
  useEngineDrew: () => useEngineDrew,
  useHasRenderHooks: () => useHasRenderHooks,
  useHeldRows: () => useHeldRows,
  useHoverGroup: () => useHoverGroup,
  useHoverLit: () => useHoverLit,
  useOnScreenInput: () => useOnScreenInput,
  useRenderAnswer: () => useRenderAnswer,
  useRenderDrawing: () => useRenderDrawing,
  useRenderHook: () => useRenderHook,
  useRenderInput: () => useRenderInput,
  useRenderVersion: () => useRenderVersion,
  useSettledDraw: () => useSettledDraw,
  useSiteFocus: () => useSiteFocus,
  withHexColors: () => withHexColors,
});
//@ chunk-bc20zedk.js:4019-4023 placement
j();
//@ chunk-bc20zedk.js:4023-4081 placement
var br = (o, p) => o.rank > p.rank || (o.rank === p.rank && o.seq > p.seq);
//@ chunk-bc20zedk.js:4081-4343 placement
function createActionKeyRegistry() {
  let o = [],
    p = 0;
  function a(m) {
    let index = o.indexOf(m);
    if (index >= 0) o.splice(index, 1);
  }
  return {
    add: (m) => {
      (a(m), (m.seq = ++p), o.push(m));
    },
    remove: a,
    winnerOf: (m) =>
      o.filter((f) => f.action === m).reduce((f, u) => (f === void 0 || br(u, f) ? u : f), void 0),
    held: () => [...o],
    clear: () => {
      o.length = 0;
    },
  };
}
//@ chunk-bc20zedk.js:4343-4374 placement
var bt = ge(createActionKeyRegistry(), (o) => o.clear());
//@ chunk-bc20zedk.js:4374-4439 placement
var hn = (o, p) => uniq(p.filter((a) => a.action === o).map((a) => a.context));
//@ chunk-bc20zedk.js:4439-4486 placement
var Tn = (o) => (o === "Pane" ? 2 : o === "AbovePrompt" ? 1 : 0);
//@ chunk-bc20zedk.js:4486-4599 placement
var pressFromTerminal = (o, p) =>
  void SRe(
    `ui.press ${o.plugin}`,
    handleUiPress({ plugin: o.plugin, handle: o.handle, surface: "terminal", link: p }),
  );
//@ chunk-bc20zedk.js:4599-4603 placement
j();
//@ chunk-bc20zedk.js:4603-4619 placement
var RenderInstance = qt(null);
//@ chunk-bc20zedk.js:4619-5146 placement
function useActionKeys(o) {
  let { plugin: plugin, handle: handle, action: action } = o,
    f = Se(RenderInstance),
    u = useKeybindingContext(),
    c = useHasAutoDialog(),
    g = Tn(f?.component),
    [x] = y(() => ({ action: action, rank: g, seq: 0, plugin: plugin, handle: handle })),
    h = u?.bindings,
    C = Q(() => hn(action, h ?? []), [action, h]);
  (zt(() => {
    ((x.plugin = plugin), (x.handle = handle), (x.rank = g));
  }),
    P(() => ((x.action = action), bt.add(x), () => bt.remove(x)), [action, x]),
    P(() => {
      if (!u || c) return;
      let mapped = C.map((b) =>
        u.registerHandler({
          action: action,
          context: b,
          handler: () => {
            let winnerOf = bt.winnerOf(action);
            if (winnerOf === void 0) return !1;
            pressFromTerminal({ plugin: winnerOf.plugin, handle: winnerOf.handle });
          },
          singleKey: !0,
          fallback: !0,
        }),
      );
      return () => {
        for (let b of mapped) b();
      };
    }, [u, action, C, c]));
}
//@ chunk-bc20zedk.js:5146-5179 placement
function ActionKeysSeat(o) {
  return (useActionKeys(o), null);
}
//@ chunk-bc20zedk.js:5179-5183 placement
j();
//@ chunk-bc20zedk.js:5183-5200 placement
var BodyColumns = qt(null);
//@ chunk-bc20zedk.js:5200-5204 placement
j();
//@ chunk-bc20zedk.js:5204-5221 placement
var ClickedPress = qt(null);
//@ chunk-bc20zedk.js:5221-5225 placement
j();

export { ClickedPress, BodyColumns, actionKeysNamespace, pressFromTerminal, ActionKeysSeat, RenderInstance };
