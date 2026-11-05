/**
 * keybindings/dialogKeyHints.ts
 *
 * 2.1.316 新增：对话框按键提示与对话框作用域按键绑定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-zjxrz3f0.js (17)
 * attribution: placement 17
 */
import {
  init_react_production,
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useLayoutEffect,
  useId,
} from "../../vendor/react/cjs/react.production.js";
import { useKeybindingContext } from "./KeybindingContext.js";
import { APP_CONTEXT } from "../../vendor/convert-to-spaces/dist/index.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../ink/components/Text.js";
import { parseBindings, chordToString } from "./parser.js";
import { DEFAULT_BINDINGS } from "./defaultBindings.js";
import { pickDisplayChord } from "./resolver.js";
import { formatShortcutHint } from "../components/design-system/KeyboardShortcutHint.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { getFocusManager, isDescendantOf } from "../ink/focus.js";
import { BaseBox } from "../ink/components/Box.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-zjxrz3f0.js:964-968 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-zjxrz3f0.js:964", () => {
  init_react_production();
});
//@ chunk-zjxrz3f0.js:968-972 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-zjxrz3f0.js:968", () => {
  init_react_production();
});
//@ chunk-zjxrz3f0.js:972-3100 placement
var DIALOG_ACTION_HINTS = {
  "confirm:yes": {
    description: "confirm",
  },
  "confirm:no": {
    description: "cancel",
  },
  "confirm:previous": {
    description: "navigate",
  },
  "confirm:next": {
    description: "navigate",
  },
  "confirm:nextField": {
    description: "next field",
  },
  "confirm:previousField": {
    description: "previous field",
  },
  "confirm:toggle": {
    description: "toggle",
  },
  "confirm:cycleMode": {
    description: "cycle mode",
  },
  ...{},
  "select:next": {
    description: "navigate",
  },
  "select:previous": {
    description: "navigate",
  },
  "select:pageUp": {
    description: "page up",
  },
  "select:pageDown": {
    description: "page down",
  },
  "select:first": {
    description: "first",
  },
  "select:last": {
    description: "last",
  },
  "select:accept": {
    description: "select",
  },
  "select:cancel": {
    description: "cancel",
  },
  "abovePrompt:toggle": {
    description: "hide/show plugin panel",
  },
  "abovePrompt:focus": {
    description: "focus plugin buttons, inputs and selects",
  },
  "abovePrompt:next": {
    description: "navigate",
  },
  "abovePrompt:previous": {
    description: "navigate",
  },
  "abovePrompt:press": {
    description: "press / submit / pick",
  },
  "abovePrompt:leave": {
    description: "back to prompt",
  },
  "abovePrompt:highlightNext": {
    description: "next option",
  },
  "abovePrompt:highlightPrevious": {
    description: "previous option",
  },
  "pane:scrollUp": {
    description: "scroll",
  },
  "pane:scrollDown": {
    description: "scroll",
  },
  "pane:pageUp": {
    description: "page up",
  },
  "pane:pageDown": {
    description: "page down",
  },
  "pane:top": {
    description: "top",
  },
  "pane:bottom": {
    description: "bottom",
  },
  "pane:grow": {
    description: "widen / heighten plugin pane",
  },
  "pane:shrink": {
    description: "narrow / shorten plugin pane",
  },
  "pane:close": {
    description: "close plugin pane",
  },
  "pane:next": {
    description: "show next plugin pane",
  },
  "pane:previous": {
    description: "show previous plugin pane",
  },
  "tabs:next": {
    description: "switch tab",
  },
  "tabs:previous": {
    description: "switch tab",
  },
  "app:toggleReplTab": {
    description: "switch tab",
  },
  "app:toggleDiffNoiseFilter": {
    description: "show/hide tests in diff panel",
  },
  "app:diffFileListUp": {
    description: "scroll diff panel file list",
  },
  "app:diffFileListDown": {
    description: "scroll diff panel file list",
  },
  "app:toggleDiffPreSession": {
    description: "show/hide pre-session changes in diff panel",
  },
  "app:cycleDiffBase": {
    description: "switch diff panel base",
  },
  ...{},
  ...{},
};
//@ chunk-zjxrz3f0.js:3100-3187 placement
/**
 * 取对话框动作的提示
 */
function dialogActionHint(action) {
  if (action.startsWith("command:"))
    return {
      description: action.slice(8),
    };
  return DIALOG_ACTION_HINTS[action];
}
//@ chunk-zjxrz3f0.js:3187-3191 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-zjxrz3f0.js:3187", () => {
  init_react_production();
});
//@ chunk-zjxrz3f0.js:3191-3206 placement
/**
 * 对话框作用域上下文
 */
var DialogScopeContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-zjxrz3f0.js:3191", () => {
  DialogScopeContext = createContext(null);
});
//@ chunk-zjxrz3f0.js:3206-3320 placement
var MAX_DIALOG_HINTS = 4;
var PAIRED_HINT_ACTIONS = [
  ["select:previous", "select:next"],
  ["confirm:previous", "confirm:next"],
  ["tabs:next", "tabs:previous"],
];
//@ chunk-zjxrz3f0.js:3320-4193 placement
/**
 * 对话框底部按键提示：按当前焦点与绑定生成“键 动作”列表，可限制数量与宽度。
 */
function DialogKeyHints({
  boundary,
  fallback = null,
  order,
  omit,
  max = MAX_DIALOG_HINTS,
  maxWidth,
  terse = false,
  format,
}) {
  let keybindingContext = useKeybindingContext();
  let { focusManager, rootNode } = useContext(APP_CONTEXT);
  let dialogScope = useContext(DialogScopeContext);
  let [version, bumpVersion] = useState(0);
  useEffect(() => {
    if (!keybindingContext || !focusManager) return;
    let onChange = () => bumpVersion((version) => version + 1);
    let unsubFocus = focusManager.subscribe(onChange);
    let unsubScopes = keybindingContext.keyHandlerRegistry.scopesChanged.subscribe(onChange);
    onChange();
    return () => {
      unsubFocus();
      unsubScopes();
    };
  }, [keybindingContext, focusManager]);
  let hints = useMemo(
    () =>
      collectKeyHints({
        ctx: keybindingContext,
        activeElement: focusManager?.activeElement ?? null,
        boundaryNode: boundary ? boundary.current : (rootNode ?? null),
        rendered: boundary ? dialogScope : null,
        order,
        omit,
        max,
        maxWidth,
        terse,
        format,
      }),
    [
      keybindingContext,
      focusManager,
      boundary,
      rootNode,
      dialogScope,
      order,
      omit,
      max,
      maxWidth,
      terse,
      format,
      version,
    ],
  );
  let lastStatusRef = useRef(null);
  useEffect(() => {
    let status = hints.fellBack ? "fell_back" : hints.hadEntryWithoutDescription ? "no_description" : "ok";
    if (status === lastStatusRef.current) return;
    let isFirst = lastStatusRef.current === null;
    lastStatusRef.current = status;
    if (isFirst && status === "fell_back") return;
    if (status === "ok") logFeatureOk("keybinding_auto_hints");
    else logFeatureSad("keybinding_auto_hints", status);
  }, [hints.fellBack, hints.hadEntryWithoutDescription]);
  if (hints.fellBack) return fallback;
  return jsxProd_default(Text, {
    dimColor: true,
    italic: true,
    children: hints.text,
  });
}
//@ chunk-zjxrz3f0.js:4193-6022 placement
function collectKeyHints({
  ctx,
  activeElement,
  boundaryNode,
  rendered,
  order,
  omit,
  max,
  maxWidth,
  terse,
  format,
}) {
  let emptyResult = {
    fellBack: true,
    text: "",
    hadEntryWithoutDescription: false,
  };
  if (!ctx) return emptyResult;
  let entries = [];
  let hitBoundary = false;
  let depth = 0;
  let node = boundaryNode === null ? undefined : (activeElement ?? undefined);
  while (node) {
    let isBoundary = node === boundaryNode;
    let decls = ctx.keyHandlerRegistry.decls.get(node);
    if (decls) collectScopeHintEntries(entries, decls, depth, isBoundary);
    if (isBoundary) {
      hitBoundary = true;
      break;
    }
    node = node.parentNode;
    depth++;
  }
  if (!hitBoundary) {
    if (!rendered) return emptyResult;
    let lastChainIndex = rendered.chain.length - 1;
    let chain = rendered.chain;
    for (let layer of rendered.below[lastChainIndex]?.values() ?? [])
      if (layer.claimFocus && layer.chain.length > chain.length) chain = layer.chain;
    entries = [];
    for (let idx = chain.length - 1; idx >= lastChainIndex; idx--) {
      let scope = chain[idx];
      if (scope) collectScopeHintEntries(entries, scope, chain.length - 1 - idx, idx === lastChainIndex);
    }
  }
  if (!entries.some((entry) => !entry.isBoundary)) return emptyResult;
  let omitted = new Set(omit ?? []);
  let defaultBindings = parseBindings(DEFAULT_BINDINGS);
  let hadEntryWithoutDescription = false;
  let candidates = [];
  for (let entry of entries) {
    if (omitted.has(entry.action) || !entry.scope) continue;
    let chord = pickDisplayChord(entry.action, entry.scope, ctx.bindings, defaultBindings);
    if (!chord) continue;
    let description = entry.hint ?? dialogActionHint(entry.action)?.description;
    if (!description) {
      hadEntryWithoutDescription = true;
      continue;
    }
    candidates.push({
      action: entry.action,
      description,
      chord: chordToString(chord),
      depth: entry.depth,
    });
  }
  let orderIndex = new Map();
  (order ?? []).forEach((action, index) => orderIndex.set(action, index));
  let seenDescriptions = new Set();
  let hints = [];
  for (let candidate of candidates) {
    if (seenDescriptions.has(candidate.description)) continue;
    seenDescriptions.add(candidate.description);
    let flattened = PAIRED_HINT_ACTIONS.find((pair) =>
      pair.some((action) => action === candidate.action),
    )?.flatMap(
      (action) =>
        candidates.find((match) => match.action === action && match.description === candidate.description) ??
        [],
    );
    let group = flattened?.length === 2 ? flattened : [candidate];
    hints.push({
      order: Math.min(...group.map((item) => orderIndex.get(item.action) ?? 1 / 0)),
      text: formatShortcutHint({
        chord: group.map((item) => item.chord),
        action: candidate.description,
        terse,
        format,
      }),
      depth: candidate.depth,
    });
  }
  hints.sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order;
    return left.depth - right.depth;
  });
  let separator = " \xB7 ";
  let separatorWidth = bunStringWidth(separator);
  let reservedWidth = 0;
  let visible = [];
  for (;;) {
    visible = [];
    let lineWidth = 0;
    for (let hint of hints) {
      if (visible.length >= max) break;
      let extraWidth = (visible.length === 0 ? 0 : separatorWidth) + bunStringWidth(hint.text);
      if (maxWidth !== undefined && lineWidth + extraWidth + reservedWidth > maxWidth && visible.length > 0)
        break;
      visible.push(hint.text);
      lineWidth += extraWidth;
    }
    let hiddenCount = hints.length - visible.length;
    if (maxWidth === undefined || hiddenCount === 0) break;
    let moreWidth = bunStringWidth(`${separator}+${hiddenCount} more`);
    if (moreWidth <= reservedWidth) break;
    reservedWidth = moreWidth;
  }
  if (visible.length === 0) return emptyResult;
  let hiddenCount = hints.length - visible.length;
  return {
    fellBack: false,
    text:
      hiddenCount > 0
        ? `${visible.join(separator)}${separator}+${hiddenCount} more`
        : visible.join(separator),
    hadEntryWithoutDescription,
  };
}
//@ chunk-zjxrz3f0.js:6022-6178 placement
function collectScopeHintEntries(out, { scope, entriesRef }, depth, isBoundary) {
  for (let entry of entriesRef.current) {
    if (!entry.action) continue;
    out.push({
      action: entry.action,
      hint: entry.hint,
      scope,
      depth,
      isBoundary,
    });
  }
}
//@ chunk-zjxrz3f0.js:6178-6182 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-zjxrz3f0.js:6178", () => {
  init_react_production();
});
//@ chunk-zjxrz3f0.js:6182-7632 placement
/**
 * 注册对话框作用域的按键绑定，可抢占、吞掉其他按键或获取焦点。
 */
function useDialogKeybindings({
  scope,
  bindings,
  active = true,
  preemptive = false,
  swallowAll = false,
  claimFocus = false,
  ref,
  flexGrow = 0,
  flexDirection,
  flexShrink,
  children,
}) {
  let nodeRef = useRef(null);
  let keybindingContext = useKeybindingContext();
  let entriesRef = useRef([]);
  entriesRef.current = active ? bindings : [];
  let onAction = useCallback((action) => runMatchingKeyEntry(action, entriesRef.current), []);
  let hintsKey = dialogHintsKey(scope, active, preemptive, swallowAll, entriesRef.current);
  let isPreemptive = active && preemptive && Boolean(scope);
  let swallowsAll = isPreemptive && swallowAll;
  useLayoutEffect(() => {
    if (!keybindingContext) return;
    let node = nodeRef.current;
    if (!node) return;
    let {
      decls,
      scopesChanged,
      preemptiveScopes,
      swallowAll: swallowAll_2,
    } = keybindingContext.keyHandlerRegistry;
    let decl = {
      scope,
      active,
      preemptive,
      swallowAll,
      entriesRef,
    };
    decls.set(node, decl);
    if (isPreemptive && scope) {
      addRefCount(preemptiveScopes, scope);
      if (swallowsAll) addRefCount(swallowAll_2, scope);
    }
    scopesChanged.emit();
    return () => {
      decls.delete(node);
      if (isPreemptive && scope) {
        releaseRefCount(preemptiveScopes, scope);
        if (swallowsAll) releaseRefCount(swallowAll_2, scope);
      }
      scopesChanged.emit();
    };
  }, [keybindingContext, scope, isPreemptive, swallowsAll, hintsKey]);
  let dialogScope = useContext(DialogScopeContext);
  let nodeId = useId();
  let [belowMap] = useState(() => new Map());
  let scopeChain = useMemo(
    () => ({
      chain: [
        ...(dialogScope?.chain ?? []),
        {
          scope,
          entriesRef,
        },
      ],
      below: [...(dialogScope?.below ?? []), belowMap],
    }),
    [dialogScope, scope, belowMap],
  );
  for (let target of dialogScope?.below ?? [])
    target.set(nodeId, {
      chain: scopeChain.chain,
      claimFocus,
    });
  useEffect(() => {
    let below = dialogScope?.below ?? [];
    for (let map of below)
      map.set(nodeId, {
        chain: scopeChain.chain,
        claimFocus,
      });
    return () => {
      for (let map of below) map.delete(nodeId);
    };
  }, [dialogScope, nodeId, scopeChain, claimFocus]);
  useLayoutEffect(() => {
    if (!claimFocus) return;
    let node = nodeRef.current;
    if (!node) return;
    let focusManager = getFocusManager(node);
    let hasAutofocusedRef = false;
    let ensureFocus = () => {
      if (hasAutofocusedRef) return;
      let current = nodeRef.current;
      if (!current) return;
      let activeElement = focusManager.activeElement;
      if (activeElement && isDescendantOf(activeElement, current)) return;
      hasAutofocusedRef = true;
      try {
        focusManager.focus(current);
      } finally {
        hasAutofocusedRef = false;
      }
    };
    focusManager.pushAutoFocusFallback(node);
    ensureFocus();
    return focusManager.subscribe(ensureFocus);
  }, [claimFocus]);
  let isMountedRef = useRef(false);
  useLayoutEffect(() => {
    return;
  }, [scope, claimFocus, keybindingContext]);
  let ref_2 = useCallback(
    (node) => {
      nodeRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  return jsxProd_default(BaseBox, {
    ref: ref_2,
    keybindingScope: scope,
    onAction,
    tabIndex: claimFocus ? -1 : undefined,
    flexGrow,
    flexDirection,
    flexShrink,
    children: jsxProd_default(DialogScopeContext, {
      value: scopeChain,
      children,
    }),
  });
}
//@ chunk-zjxrz3f0.js:7632-7788 placement
function runMatchingKeyEntry(keyEntry, candidates) {
  for (let handler of candidates) {
    if (handler.action !== keyEntry.action) continue;
    if (handler.chordOnly && !keyEntry.isChordCompletion) continue;
    if (handler.run() === false) continue;
    keyEntry.consume();
    return;
  }
}
//@ chunk-zjxrz3f0.js:7788-7830 placement
/**
 * 计数 +1
 */
function addRefCount(refCounts, scope) {
  refCounts.set(scope, (refCounts.get(scope) ?? 0) + 1);
}
//@ chunk-zjxrz3f0.js:7830-7905 placement
/**
 * 计数 −1，归零时删除
 */
function releaseRefCount(refCounts, scope) {
  let nextCount = (refCounts.get(scope) ?? 0) - 1;
  if (nextCount <= 0) refCounts.delete(scope);
  else refCounts.set(scope, nextCount);
}
//@ chunk-zjxrz3f0.js:7905-8011 placement
function dialogHintsKey(scope, active, preemptive, swallowAll, entries) {
  return jsonStringify([
    scope ?? "",
    active,
    preemptive,
    swallowAll,
    entries.map((entry) => [entry.action ?? "", entry.hint ?? "", Boolean(entry.chordOnly)]),
  ]);
}
//@ chunk-zjxrz3f0.js:8011-8015 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-zjxrz3f0.js:8011", () => {
  init_react_production();
});
export { useDialogKeybindings, DialogKeyHints };
