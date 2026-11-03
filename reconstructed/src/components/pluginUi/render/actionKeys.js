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
import { PANE_COLORS, paneColorOf } from "../../../plugins/functionHooks/panes.js";
import { logRejection } from "../../../plugins/functionHooks/uiApi.js";
import { init_react_production, qt, Se, y, Q, zt, P } from "../../../../vendor/react/cjs/react.production.js";
import { identity } from "../../../utils/identity.js";
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
  hexOfNamed: () => paneColorOf,
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
  settleQuietly: () => logRejection,
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
init_react_production();
//@ chunk-bc20zedk.js:4023-4081 placement
var compareActionRank = (o, p) => o.rank > p.rank || (o.rank === p.rank && o.seq > p.seq);
//@ chunk-bc20zedk.js:4081-4343 placement
function createActionKeyRegistry() {
  let o = [];
  let p = 0;
  function a(m) {
    let index = o.indexOf(m);
    if (index >= 0) o.splice(index, 1);
  }
  return {
    add: (m) => {
      a(m);
      m.seq = ++p;
      o.push(m);
    },
    remove: a,
    winnerOf: (m) =>
      o
        .filter((f) => f.action === m)
        .reduce((acc, u) => (acc === undefined || compareActionRank(u, acc) ? u : acc), undefined),
    held: () => [...o],
    clear: () => {
      o.length = 0;
    },
  };
}
//@ chunk-bc20zedk.js:4343-4374 placement
var clearActionKeys = identity(createActionKeyRegistry(), (o) => o.clear());
//@ chunk-bc20zedk.js:4374-4439 placement
var contextsForAction = (action, p) => uniq(p.filter((a) => a.action === action).map((a) => a.context));
//@ chunk-bc20zedk.js:4439-4486 placement
var renderPriorityOf = (component) => (component === "Pane" ? 2 : component === "AbovePrompt" ? 1 : 0);
//@ chunk-bc20zedk.js:4486-4599 placement
var pressFromTerminal = (o, link) =>
  void logRejection(
    `ui.press ${o.plugin}`,
    handleUiPress({
      plugin: o.plugin,
      handle: o.handle,
      surface: "terminal",
      link,
    }),
  );
//@ chunk-bc20zedk.js:4599-4603 placement
init_react_production();
//@ chunk-bc20zedk.js:4603-4619 placement
var RenderInstance = qt(null);
//@ chunk-bc20zedk.js:4619-5146 placement
function useActionKeys(props) {
  let { plugin, handle, action } = props;
  let f = Se(RenderInstance);
  let keybindingContext = useKeybindingContext();
  let hasAutoDialog = useHasAutoDialog();
  let rank = renderPriorityOf(f?.component);
  let [x] = y(() => ({
    action,
    rank,
    seq: 0,
    plugin,
    handle,
  }));
  let bindings = keybindingContext?.bindings;
  let C = Q(() => contextsForAction(action, bindings ?? []), [action, bindings]);
  zt(() => {
    x.plugin = plugin;
    x.handle = handle;
    x.rank = rank;
  });
  P(() => {
    x.action = action;
    clearActionKeys.add(x);
    return () => clearActionKeys.remove(x);
  }, [action, x]);
  P(() => {
    if (!keybindingContext || hasAutoDialog) return;
    let mapped = C.map((context) =>
      keybindingContext.registerHandler({
        action,
        context,
        handler: () => {
          let T = clearActionKeys.winnerOf(action);
          if (T === undefined) return false;
          pressFromTerminal({
            plugin: T.plugin,
            handle: T.handle,
          });
        },
        singleKey: true,
        fallback: true,
      }),
    );
    return () => {
      for (let b of mapped) b();
    };
  }, [keybindingContext, action, C, hasAutoDialog]);
}
//@ chunk-bc20zedk.js:5146-5179 placement
function ActionKeysSeat(props) {
  useActionKeys(props);
  return null;
}
//@ chunk-bc20zedk.js:5179-5183 placement
init_react_production();
//@ chunk-bc20zedk.js:5183-5200 placement
var BodyColumns = qt(null);
//@ chunk-bc20zedk.js:5200-5204 placement
init_react_production();
//@ chunk-bc20zedk.js:5204-5221 placement
var ClickedPress = qt(null);
//@ chunk-bc20zedk.js:5221-5225 placement
init_react_production();
export { ClickedPress, BodyColumns, actionKeysNamespace, pressFromTerminal, ActionKeysSeat, RenderInstance };
