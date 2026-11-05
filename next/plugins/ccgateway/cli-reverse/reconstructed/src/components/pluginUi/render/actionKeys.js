/**
 * components/pluginUi/render/actionKeys.ts
 *
 * 2.1.316 新增。插件渲染元素的动作按键。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rkbsrtg1.js (18)
 * attribution: placement 18
 */
import { __export } from "../../../../runtime/bun-runtime.js";
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
import {
  init_react_production,
  createContext,
  useContext,
  useState,
  useMemo,
  useLayoutEffect,
  useEffect,
} from "../../../../vendor/react/cjs/react.production.js";
import { identity } from "../../../utils/identity.js";
import { normalizeCaseForComparison_2 } from "../../../utils/permissions/filesystem.js";
import { handleUiPress } from "../../../plugins/functionHooks/ui/interactions.js";
import { useKeybindingContext } from "../../../keybindings/KeybindingContext.js";
import { useHasAutoDialog } from "../../../state/dialogQueue.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-rkbsrtg1.js:2583-2593 placement
var actionKeysNamespace = {};
//@ chunk-rkbsrtg1.js:2593-4019 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rkbsrtg1.js:2593", () => {
  __export(actionKeysNamespace, {
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
});
//@ chunk-rkbsrtg1.js:4019-4023 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rkbsrtg1.js:4019", () => {
  init_react_production();
});
//@ chunk-rkbsrtg1.js:4023-4081 placement
var compareActionRank = (a, b) => a.rank > b.rank || (a.rank === b.rank && a.seq > b.seq);
//@ chunk-rkbsrtg1.js:4081-4343 placement
function createActionKeyRegistry() {
  let registrations = [];
  let seq = 0;
  function remove(registration) {
    let index = registrations.indexOf(registration);
    if (index >= 0) registrations.splice(index, 1);
  }
  return {
    add: (registration) => {
      remove(registration);
      registration.seq = ++seq;
      registrations.push(registration);
    },
    remove,
    winnerOf: (action) =>
      registrations
        .filter((state) => state.action === action)
        .reduce((acc, best) => (acc === undefined || compareActionRank(best, acc) ? best : acc), undefined),
    held: () => [...registrations],
    clear: () => {
      registrations.length = 0;
    },
  };
}
//@ chunk-rkbsrtg1.js:4343-4374 placement
var clearActionKeys; // deferred: uses createActionKeyRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rkbsrtg1.js:4343", () => {
  clearActionKeys = identity(createActionKeyRegistry(), (state) => state.clear());
});
//@ chunk-rkbsrtg1.js:4374-4439 placement
var contextsForAction = (action, registrations) =>
  normalizeCaseForComparison_2(
    registrations.filter((state) => state.action === action).map((state) => state.context),
  );
//@ chunk-rkbsrtg1.js:4439-4486 placement
var renderPriorityOf = (component) => (component === "Pane" ? 2 : component === "AbovePrompt" ? 1 : 0);
//@ chunk-rkbsrtg1.js:4486-4599 placement
var pressFromTerminal = (registration, link) =>
  void logRejection(
    `ui.press ${registration.plugin}`,
    handleUiPress({
      plugin: registration.plugin,
      handle: registration.handle,
      surface: "terminal",
      link,
    }),
  );
//@ chunk-rkbsrtg1.js:4599-4603 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rkbsrtg1.js:4599", () => {
  init_react_production();
});
//@ chunk-rkbsrtg1.js:4603-4619 placement
var RenderInstance; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rkbsrtg1.js:4603", () => {
  RenderInstance = createContext(null);
});
//@ chunk-rkbsrtg1.js:4619-5146 placement
function useActionKeys(props) {
  let { plugin, handle, action } = props;
  let renderInstance = useContext(RenderInstance);
  let keybindingContext = useKeybindingContext();
  let hasAutoDialog = useHasAutoDialog();
  let rank = renderPriorityOf(renderInstance?.component);
  let [registration] = useState(() => ({
    action,
    rank,
    seq: 0,
    plugin,
    handle,
  }));
  let bindings = keybindingContext?.bindings;
  let contexts = useMemo(() => contextsForAction(action, bindings ?? []), [action, bindings]);
  useLayoutEffect(() => {
    registration.plugin = plugin;
    registration.handle = handle;
    registration.rank = rank;
  });
  useEffect(() => {
    registration.action = action;
    clearActionKeys.add(registration);
    return () => clearActionKeys.remove(registration);
  }, [action, registration]);
  useEffect(() => {
    if (!keybindingContext || hasAutoDialog) return;
    let mapped = contexts.map((context) =>
      keybindingContext.registerHandler({
        action,
        context,
        handler: () => {
          let winner = clearActionKeys.winnerOf(action);
          if (winner === undefined) return false;
          pressFromTerminal({
            plugin: winner.plugin,
            handle: winner.handle,
          });
        },
        singleKey: true,
        fallback: true,
      }),
    );
    return () => {
      for (let bindings of mapped) bindings();
    };
  }, [keybindingContext, action, contexts, hasAutoDialog]);
}
//@ chunk-rkbsrtg1.js:5146-5179 placement
function ActionKeysSeat(props) {
  useActionKeys(props);
  return null;
}
//@ chunk-rkbsrtg1.js:5179-5183 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rkbsrtg1.js:5179", () => {
  init_react_production();
});
//@ chunk-rkbsrtg1.js:5183-5200 placement
var BodyColumns; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rkbsrtg1.js:5183", () => {
  BodyColumns = createContext(null);
});
//@ chunk-rkbsrtg1.js:5200-5204 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rkbsrtg1.js:5200", () => {
  init_react_production();
});
//@ chunk-rkbsrtg1.js:5204-5221 placement
var ClickedPress; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rkbsrtg1.js:5204", () => {
  ClickedPress = createContext(null);
});
//@ chunk-rkbsrtg1.js:5221-5225 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rkbsrtg1.js:5221", () => {
  init_react_production();
});
export { actionKeysNamespace, ClickedPress, BodyColumns, pressFromTerminal, ActionKeysSeat, RenderInstance };
