/**
 * components/CustomSelect/use-select-navigation.ts
 *
 * Select 的导航 reducer（聚焦上/下/翻页、视口滚动、重置）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CustomSelect/use-select-navigation.ts
 * pieces: chunk-ey2qag4x.js (3)
 * attribution: fingerprint 2, affinity 1
 */
import { isDeepStrictEqual } from "util";
import { OptionMap, useLatestState } from "./option-map.js";
import { ce, Oo, R, y, Q, P } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-ey2qag4x.js:37574-41082 fingerprint = reducer (0.885)
/**
 * Select 导航 reducer：下一个/上一个（首尾循环）、翻页、reset、视口滚动、设焦点，保持聚焦项在 [visibleFromIndex, visibleToIndex) 内。同一声明的 cl 构造初始状态（尽量保留当前视口）。
 */
var selectNavigationReducer = (state, action) => {
  switch (action.type) {
    case "focus-next-option": {
      if (state.focusedValue === undefined) return state;
      let item = state.optionMap.get(state.focusedValue);
      if (!item) return state;
      let next = item.next || state.optionMap.first;
      if (!next) return state;
      if (!item.next && next === state.optionMap.first)
        return {
          ...state,
          focusedValue: next.value,
          visibleFromIndex: 0,
          visibleToIndex: state.visibleOptionCount,
        };
      if (!(next.index >= state.visibleToIndex))
        return {
          ...state,
          focusedValue: next.value,
        };
      let nextVisibleToIndex = Math.min(state.optionMap.size, state.visibleToIndex + 1);
      let nextVisibleFromIndex = nextVisibleToIndex - state.visibleOptionCount;
      return {
        ...state,
        focusedValue: next.value,
        visibleFromIndex: nextVisibleFromIndex,
        visibleToIndex: nextVisibleToIndex,
      };
    }
    case "focus-previous-option": {
      if (state.focusedValue === undefined) return state;
      let item = state.optionMap.get(state.focusedValue);
      if (!item) return state;
      let previous = item.previous || state.optionMap.last;
      if (!previous) return state;
      if (!item.previous && previous === state.optionMap.last) {
        let nextVisibleToIndex = state.optionMap.size;
        let nextVisibleFromIndex = Math.max(0, nextVisibleToIndex - state.visibleOptionCount);
        return {
          ...state,
          focusedValue: previous.value,
          visibleFromIndex: nextVisibleFromIndex,
          visibleToIndex: nextVisibleToIndex,
        };
      }
      if (!(previous.index <= state.visibleFromIndex))
        return {
          ...state,
          focusedValue: previous.value,
        };
      let nextVisibleFromIndex = Math.max(0, state.visibleFromIndex - 1);
      let nextVisibleToIndex = nextVisibleFromIndex + state.visibleOptionCount;
      return {
        ...state,
        focusedValue: previous.value,
        visibleFromIndex: nextVisibleFromIndex,
        visibleToIndex: nextVisibleToIndex,
      };
    }
    case "focus-next-page": {
      if (state.focusedValue === undefined) return state;
      let item = state.optionMap.get(state.focusedValue);
      if (!item) return state;
      let targetIndex = Math.min(state.optionMap.size - 1, item.index + state.visibleOptionCount);
      let targetItem = state.optionMap.first;
      while (targetItem && targetItem.index < targetIndex)
        if (targetItem.next) targetItem = targetItem.next;
        else break;
      if (!targetItem) return state;
      let nextVisibleToIndex = Math.min(state.optionMap.size, targetItem.index + 1);
      let nextVisibleFromIndex = Math.max(0, nextVisibleToIndex - state.visibleOptionCount);
      return {
        ...state,
        focusedValue: targetItem.value,
        visibleFromIndex: nextVisibleFromIndex,
        visibleToIndex: nextVisibleToIndex,
      };
    }
    case "focus-previous-page": {
      if (state.focusedValue === undefined) return state;
      let item = state.optionMap.get(state.focusedValue);
      if (!item) return state;
      let targetIndex = Math.max(0, item.index - state.visibleOptionCount);
      let targetItem = state.optionMap.first;
      while (targetItem && targetItem.index < targetIndex)
        if (targetItem.next) targetItem = targetItem.next;
        else break;
      if (!targetItem) return state;
      let nextVisibleFromIndex = Math.max(0, targetItem.index);
      let nextVisibleToIndex = Math.min(
        state.optionMap.size,
        nextVisibleFromIndex + state.visibleOptionCount,
      );
      return {
        ...state,
        focusedValue: targetItem.value,
        visibleFromIndex: nextVisibleFromIndex,
        visibleToIndex: nextVisibleToIndex,
      };
    }
    case "reset":
      return action.state;
    case "scroll-viewport": {
      let min = Math.min(
        Math.max(0, state.optionMap.size - state.visibleOptionCount),
        Math.max(0, state.visibleFromIndex + action.delta),
      );
      if (min === state.visibleFromIndex) return state;
      let min_2 = Math.min(state.optionMap.size, min + state.visibleOptionCount);
      let l = state.focusedValue === undefined ? undefined : state.optionMap.get(state.focusedValue);
      while (l?.next && l.index < min) l = l.next;
      while (l?.previous && l.index >= min_2) l = l.previous;
      return {
        ...state,
        focusedValue: l?.value,
        visibleFromIndex: min,
        visibleToIndex: min_2,
      };
    }
    case "set-focus": {
      if (state.focusedValue === action.value) return state;
      let item = state.optionMap.get(action.value);
      if (!item) return state;
      if (item.index >= state.visibleFromIndex && item.index < state.visibleToIndex)
        return {
          ...state,
          focusedValue: action.value,
        };
      let nextVisibleFromIndex;
      let nextVisibleToIndex;
      if (item.index < state.visibleFromIndex) {
        nextVisibleFromIndex = item.index;
        nextVisibleToIndex = Math.min(state.optionMap.size, nextVisibleFromIndex + state.visibleOptionCount);
      } else {
        nextVisibleToIndex = Math.min(state.optionMap.size, item.index + 1);
        nextVisibleFromIndex = Math.max(0, nextVisibleToIndex - state.visibleOptionCount);
      }
      return {
        ...state,
        focusedValue: action.value,
        visibleFromIndex: nextVisibleFromIndex,
        visibleToIndex: nextVisibleToIndex,
      };
    }
  }
};
var createSelectNavigationState = ({
  visibleOptionCount: customVisibleOptionCount,
  options,
  initialFocusValue,
  currentViewport,
}) => {
  let visibleOptionCount =
    typeof customVisibleOptionCount === "number"
      ? Math.min(customVisibleOptionCount, options.length)
      : options.length;
  let optionMap = new OptionMap(options);
  let focusedItem = initialFocusValue !== undefined && optionMap.get(initialFocusValue);
  let focusedValue = focusedItem ? initialFocusValue : optionMap.first?.value;
  let visibleFromIndex = 0;
  let visibleToIndex = visibleOptionCount;
  if (focusedItem) {
    let focusedIndex = focusedItem.index;
    if (currentViewport) {
      if (focusedIndex >= currentViewport.visibleFromIndex && focusedIndex < currentViewport.visibleToIndex) {
        visibleFromIndex = currentViewport.visibleFromIndex;
        visibleToIndex = Math.min(optionMap.size, visibleFromIndex + visibleOptionCount);
        if (focusedIndex >= visibleToIndex) {
          visibleToIndex = Math.min(optionMap.size, focusedIndex + 1);
          visibleFromIndex = Math.max(0, visibleToIndex - visibleOptionCount);
        }
        if (visibleToIndex - visibleFromIndex < visibleOptionCount)
          visibleFromIndex = Math.max(0, visibleToIndex - visibleOptionCount);
      } else if (focusedIndex < currentViewport.visibleFromIndex) {
        visibleFromIndex = focusedIndex;
        visibleToIndex = Math.min(optionMap.size, visibleFromIndex + visibleOptionCount);
        if (visibleToIndex - visibleFromIndex < visibleOptionCount)
          visibleFromIndex = Math.max(0, visibleToIndex - visibleOptionCount);
      } else {
        visibleToIndex = Math.min(optionMap.size, focusedIndex + 1);
        visibleFromIndex = Math.max(0, visibleToIndex - visibleOptionCount);
      }
    } else if (focusedIndex >= visibleOptionCount) {
      visibleToIndex = Math.min(optionMap.size, focusedIndex + 1);
      visibleFromIndex = Math.max(0, visibleToIndex - visibleOptionCount);
    }
    visibleFromIndex = Math.max(0, Math.min(visibleFromIndex, optionMap.size - 1));
    visibleToIndex = Math.min(optionMap.size, Math.max(visibleOptionCount, visibleToIndex));
  }
  return {
    optionMap,
    visibleOptionCount,
    focusedValue,
    visibleFromIndex,
    visibleToIndex,
  };
};
//@ chunk-ey2qag4x.js:41082-42666 fingerprint = useSelectNavigation (0.855)
/**
 * Select 导航：reducer 处理 focus-next/previous-option、翻页、视口滚动与重置，保证聚焦项在可见窗口内。
 */
function useSelectNavigation({ visibleOptionCount = 5, options, onFocus, focusValue }) {
  let [state, f, d] = useLatestState(() =>
    createSelectNavigationState({
      visibleOptionCount,
      options,
      initialFocusValue: focusValue,
    }),
  );
  let u = ce(
    (action) => {
      f((state) => selectNavigationReducer(state, action));
    },
    [f],
  );
  let onFocusRef = Oo((v) => onFocus?.(v));
  let c = R(undefined);
  let [lastOptions, setLastOptions] = y(options);
  let [x, C] = y(visibleOptionCount);
  let B = options !== lastOptions && !isDeepStrictEqual(options, lastOptions);
  let N = visibleOptionCount !== x;
  if (B || N) {
    let v = d();
    u({
      type: "reset",
      state: createSelectNavigationState({
        visibleOptionCount,
        options,
        initialFocusValue: B ? (focusValue ?? v.focusedValue) : (v.focusedValue ?? focusValue),
        currentViewport: {
          visibleFromIndex: v.visibleFromIndex,
          visibleToIndex: v.visibleToIndex,
        },
      }),
    });
    if (B) setLastOptions(options);
    if (N) C(visibleOptionCount);
  }
  let focusNextOption = ce(
    (v) => {
      u(v);
      let focusPreviousOption = validFocusedValue(d().focusedValue, options);
      if (focusPreviousOption !== undefined && focusPreviousOption !== c.current) {
        c.current = focusPreviousOption;
        onFocus?.(focusPreviousOption);
      }
    },
    [u, d, options, onFocus],
  );
  let focusNextPage = ce(() => {
    focusNextOption({
      type: "focus-next-option",
    });
  }, [focusNextOption]);
  let focusPreviousOption = ce(() => {
    focusNextOption({
      type: "focus-previous-option",
    });
  }, [focusNextOption]);
  let focusNextPage_2 = ce(() => {
    focusNextOption({
      type: "focus-next-page",
    });
  }, [focusNextOption]);
  let focusPreviousPage = ce(() => {
    focusNextOption({
      type: "focus-previous-page",
    });
  }, [focusNextOption]);
  let scrollViewport = ce(
    (value) => {
      let visibleFromIndex = d().visibleFromIndex;
      focusNextOption({
        type: "scroll-viewport",
        delta: value,
      });
      return d().visibleFromIndex !== visibleFromIndex;
    },
    [focusNextOption, d],
  );
  let visibleOptions = ce(
    (value) => {
      if (value !== undefined)
        focusNextOption({
          type: "set-focus",
          value,
        });
    },
    [focusNextOption],
  );
  let visibleOptions_2 = Q(
    () =>
      options
        .map((option, index) => ({
          ...option,
          index,
        }))
        .slice(state.visibleFromIndex, state.visibleToIndex),
    [options, state.visibleFromIndex, state.visibleToIndex],
  );
  let validatedFocusedValue = Q(
    () => validFocusedValue(state.focusedValue, options),
    [state.focusedValue, options],
  );
  let isInInput = ce(() => validFocusedValue(d().focusedValue, options), [d, options]);
  P(() => {
    if (validatedFocusedValue === undefined) {
      c.current = undefined;
      return;
    }
    if (validatedFocusedValue !== c.current) {
      c.current = validatedFocusedValue;
      onFocusRef(validatedFocusedValue);
    }
  }, [validatedFocusedValue]);
  P(() => {
    if (focusValue !== undefined)
      u({
        type: "set-focus",
        value: focusValue,
      });
  }, [focusValue, u]);
  return {
    focusedValue: validatedFocusedValue,
    getFocusedValue: isInInput,
    visibleFromIndex: state.visibleFromIndex,
    visibleToIndex: state.visibleToIndex,
    visibleOptions: visibleOptions_2,
    focusNextOption: focusNextPage,
    focusPreviousOption,
    focusNextPage: focusNextPage_2,
    focusPreviousPage,
    focusOption: visibleOptions,
    scrollViewport,
    options,
  };
}
//@ chunk-ey2qag4x.js:42666-42760 affinity
function validFocusedValue(focusedValue, options) {
  if (focusedValue === undefined) return;
  if (options.some((i) => i.value === focusedValue)) return focusedValue;
  return options[0]?.value;
}
export { useSelectNavigation };
