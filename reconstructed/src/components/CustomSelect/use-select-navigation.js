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

/**
 * Select 导航 reducer：下一个/上一个（首尾循环）、翻页、reset、视口滚动、设焦点，保持聚焦项在 [visibleFromIndex, visibleToIndex) 内。同一声明的 cl 构造初始状态（尽量保留当前视口）。
 */
//@ chunk-ey2qag4x.js:37574-41082 fingerprint = reducer (0.885)
var selectNavigationReducer = (t, o) => {
    switch (o.type) {
      case "focus-next-option": {
        if (t.focusedValue === void 0) return t;
        let i = t.optionMap.get(t.focusedValue);
        if (!i) return t;
        let a = i.next || t.optionMap.first;
        if (!a) return t;
        if (!i.next && a === t.optionMap.first)
          return { ...t, focusedValue: a.value, visibleFromIndex: 0, visibleToIndex: t.visibleOptionCount };
        if (!(a.index >= t.visibleToIndex)) return { ...t, focusedValue: a.value };
        let min = Math.min(t.optionMap.size, t.visibleToIndex + 1),
          d = min - t.visibleOptionCount;
        return { ...t, focusedValue: a.value, visibleFromIndex: d, visibleToIndex: min };
      }
      case "focus-previous-option": {
        if (t.focusedValue === void 0) return t;
        let i = t.optionMap.get(t.focusedValue);
        if (!i) return t;
        let a = i.previous || t.optionMap.last;
        if (!a) return t;
        if (!i.previous && a === t.optionMap.last) {
          let size = t.optionMap.size,
            max = Math.max(0, size - t.visibleOptionCount);
          return { ...t, focusedValue: a.value, visibleFromIndex: max, visibleToIndex: size };
        }
        if (!(a.index <= t.visibleFromIndex)) return { ...t, focusedValue: a.value };
        let max = Math.max(0, t.visibleFromIndex - 1),
          d = max + t.visibleOptionCount;
        return { ...t, focusedValue: a.value, visibleFromIndex: max, visibleToIndex: d };
      }
      case "focus-next-page": {
        if (t.focusedValue === void 0) return t;
        let i = t.optionMap.get(t.focusedValue);
        if (!i) return t;
        let min = Math.min(t.optionMap.size - 1, i.index + t.visibleOptionCount),
          first = t.optionMap.first;
        while (first && first.index < min)
          if (first.next) first = first.next;
          else break;
        if (!first) return t;
        let min_2 = Math.min(t.optionMap.size, first.index + 1),
          max = Math.max(0, min_2 - t.visibleOptionCount);
        return { ...t, focusedValue: first.value, visibleFromIndex: max, visibleToIndex: min_2 };
      }
      case "focus-previous-page": {
        if (t.focusedValue === void 0) return t;
        let i = t.optionMap.get(t.focusedValue);
        if (!i) return t;
        let max = Math.max(0, i.index - t.visibleOptionCount),
          first = t.optionMap.first;
        while (first && first.index < max)
          if (first.next) first = first.next;
          else break;
        if (!first) return t;
        let max_2 = Math.max(0, first.index),
          min = Math.min(t.optionMap.size, max_2 + t.visibleOptionCount);
        return { ...t, focusedValue: first.value, visibleFromIndex: max_2, visibleToIndex: min };
      }
      case "reset":
        return o.state;
      case "scroll-viewport": {
        let min = Math.min(
          Math.max(0, t.optionMap.size - t.visibleOptionCount),
          Math.max(0, t.visibleFromIndex + o.delta),
        );
        if (min === t.visibleFromIndex) return t;
        let min_2 = Math.min(t.optionMap.size, min + t.visibleOptionCount),
          l = t.focusedValue === void 0 ? void 0 : t.optionMap.get(t.focusedValue);
        while (l?.next && l.index < min) l = l.next;
        while (l?.previous && l.index >= min_2) l = l.previous;
        return { ...t, focusedValue: l?.value, visibleFromIndex: min, visibleToIndex: min_2 };
      }
      case "set-focus": {
        if (t.focusedValue === o.value) return t;
        let i = t.optionMap.get(o.value);
        if (!i) return t;
        if (i.index >= t.visibleFromIndex && i.index < t.visibleToIndex)
          return { ...t, focusedValue: o.value };
        let a, l;
        if (i.index < t.visibleFromIndex)
          ((a = i.index), (l = Math.min(t.optionMap.size, a + t.visibleOptionCount)));
        else ((l = Math.min(t.optionMap.size, i.index + 1)), (a = Math.max(0, l - t.visibleOptionCount)));
        return { ...t, focusedValue: o.value, visibleFromIndex: a, visibleToIndex: l };
      }
    }
  },
  createSelectNavigationState = ({
    visibleOptionCount: visibleOptionCount,
    options: options,
    initialFocusValue: initialFocusValue,
    currentViewport: currentViewport,
  }) => {
    let l =
        typeof visibleOptionCount === "number"
          ? Math.min(visibleOptionCount, options.length)
          : options.length,
      f = new OptionMap(options),
      d = initialFocusValue !== void 0 && f.get(initialFocusValue),
      u = d ? initialFocusValue : f.first?.value,
      g = 0,
      c = l;
    if (d) {
      let index = d.index;
      if (currentViewport)
        if (index >= currentViewport.visibleFromIndex && index < currentViewport.visibleToIndex) {
          if (((g = currentViewport.visibleFromIndex), (c = Math.min(f.size, g + l)), index >= c))
            ((c = Math.min(f.size, index + 1)), (g = Math.max(0, c - l)));
          if (c - g < l) g = Math.max(0, c - l);
        } else if (index < currentViewport.visibleFromIndex) {
          if (((g = index), (c = Math.min(f.size, g + l)), c - g < l)) g = Math.max(0, c - l);
        } else ((c = Math.min(f.size, index + 1)), (g = Math.max(0, c - l)));
      else if (index >= l) ((c = Math.min(f.size, index + 1)), (g = Math.max(0, c - l)));
      ((g = Math.max(0, Math.min(g, f.size - 1))), (c = Math.min(f.size, Math.max(l, c))));
    }
    return { optionMap: f, visibleOptionCount: l, focusedValue: u, visibleFromIndex: g, visibleToIndex: c };
  };
/**
 * Select 导航：reducer 处理 focus-next/previous-option、翻页、视口滚动与重置，保证聚焦项在可见窗口内。
 */
//@ chunk-ey2qag4x.js:41082-42666 fingerprint = useSelectNavigation (0.855)
function useSelectNavigation({
  visibleOptionCount: visibleOptionCount = 5,
  options: options,
  onFocus: onFocus,
  focusValue: focusValue,
}) {
  let [l, f, d] = useLatestState(() =>
      createSelectNavigationState({
        visibleOptionCount: visibleOptionCount,
        options: options,
        initialFocusValue: focusValue,
      }),
    ),
    u = ce(
      (v) => {
        f((ue) => selectNavigationReducer(ue, v));
      },
      [f],
    ),
    onFocusRef = Oo((v) => onFocus?.(v)),
    c = R(void 0),
    [b, V] = y(options),
    [x, C] = y(visibleOptionCount),
    B = options !== b && !isDeepStrictEqual(options, b),
    N = visibleOptionCount !== x;
  if (B || N) {
    let v = d();
    if (
      (u({
        type: "reset",
        state: createSelectNavigationState({
          visibleOptionCount: visibleOptionCount,
          options: options,
          initialFocusValue: B ? (focusValue ?? v.focusedValue) : (v.focusedValue ?? focusValue),
          currentViewport: { visibleFromIndex: v.visibleFromIndex, visibleToIndex: v.visibleToIndex },
        }),
      }),
      B)
    )
      V(options);
    if (N) C(visibleOptionCount);
  }
  let focusNextOption = ce(
      (v) => {
        u(v);
        let focusPreviousOption = Ai(d().focusedValue, options);
        if (focusPreviousOption !== void 0 && focusPreviousOption !== c.current)
          ((c.current = focusPreviousOption), onFocus?.(focusPreviousOption));
      },
      [u, d, options, onFocus],
    ),
    focusNextPage = ce(() => {
      focusNextOption({ type: "focus-next-option" });
    }, [focusNextOption]),
    focusPreviousPage = ce(() => {
      focusNextOption({ type: "focus-previous-option" });
    }, [focusNextOption]),
    focusOption = ce(() => {
      focusNextOption({ type: "focus-next-page" });
    }, [focusNextOption]),
    T = ce(() => {
      focusNextOption({ type: "focus-previous-page" });
    }, [focusNextOption]),
    D = ce(
      (value) => {
        let visibleFromIndex = d().visibleFromIndex;
        return (
          focusNextOption({ type: "scroll-viewport", delta: value }),
          d().visibleFromIndex !== visibleFromIndex
        );
      },
      [focusNextOption, d],
    ),
    visibleOptions = ce(
      (v) => {
        if (v !== void 0) focusNextOption({ type: "set-focus", value: v });
      },
      [focusNextOption],
    ),
    M = Q(
      () =>
        options
          .map((option, index) => ({ ...option, index: index }))
          .slice(l.visibleFromIndex, l.visibleToIndex),
      [options, l.visibleFromIndex, l.visibleToIndex],
    ),
    validatedFocusedValue = Q(() => Ai(l.focusedValue, options), [l.focusedValue, options]),
    isInInput = ce(() => Ai(d().focusedValue, options), [d, options]);
  return (
    P(() => {
      if (validatedFocusedValue === void 0) {
        c.current = void 0;
        return;
      }
      if (validatedFocusedValue !== c.current)
        ((c.current = validatedFocusedValue), onFocusRef(validatedFocusedValue));
    }, [validatedFocusedValue]),
    P(() => {
      if (focusValue !== void 0) u({ type: "set-focus", value: focusValue });
    }, [focusValue, u]),
    {
      focusedValue: validatedFocusedValue,
      getFocusedValue: isInInput,
      visibleFromIndex: l.visibleFromIndex,
      visibleToIndex: l.visibleToIndex,
      visibleOptions: M,
      focusNextOption: focusNextPage,
      focusPreviousOption: focusPreviousPage,
      focusNextPage: focusOption,
      focusPreviousPage: T,
      focusOption: visibleOptions,
      scrollViewport: D,
      options: options,
    }
  );
}
//@ chunk-ey2qag4x.js:42666-42760 affinity
function Ai(t, o) {
  if (t === void 0) return;
  if (o.some((i) => i.value === t)) return t;
  return o[0]?.value;
}

export { useSelectNavigation };
