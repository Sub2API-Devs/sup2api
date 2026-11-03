/**
 * plugins/functionHooks/ui/elements.ts
 *
 * 钩子 UI 元素类型（Box/Text/Button/Input/Select/Image/Raster）校验（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (64)
 * attribution: placement 64
 */
import { uniq } from "../../../utils/collections.js";
import { Q5e, isPlainDataObject } from "../../../utils/hooks/functionHookMatchers.js";
import { buildVmElement, Bbi, Ny } from "../vm/boundaryCopy.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { fromCharCode } from "./raster.js";
import { computeContentHash } from "../../../utils/commitAttribution.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { Pf } from "../../../utils/untrustedValues.js";
import { HooksError } from "../hooksErrors.js";
import { withModifiers } from "../hostBridge.js";

//@ chunk-4121qate.js:69406-69747 placement
var UI_ELEMENT_TYPES = {
  terminal: [
    "Box",
    "Text",
    "Button",
    "Input",
    "Select",
    "Link",
    "Code",
    "Markdown",
    "Client",
    "Raster",
    "Image",
  ],
  desktop: ["Box", "Text", "Button", "Input", "Select", "Svg", "Link", "Code", "Markdown", "Client"],
  mobile: ["Box", "Text", "Button", "Svg", "Link", "Code", "Markdown"],
  vscode: ["Box", "Text", "Button", "Input", "Select", "Svg", "Link", "Code", "Markdown"],
};
//@ chunk-4121qate.js:69747-69783 placement
var Lt = uniq(Object.values(UI_ELEMENT_TYPES).flat());
//@ chunk-4121qate.js:69783-69810 placement
var ea = (e) => Q5e(buildVmElement(Bbi, e));
/**
 * 构建元素构造器表：包装已有构造器，缺失的元素类型以占位片段补齐并回调告警。
 */
//@ chunk-4121qate.js:69810-69957 placement
function buildElementTable(e, o, r) {
  let n = {};
  for (let [s, i] of Object.entries(e)) if (typeof i === "function") n[s] = o(i);
  for (let s of Lt) if (!n[s]) (r(s), (n[s] = o(ea)));
  return n;
}
//@ chunk-4121qate.js:69957-70054 placement
function Gbi(e) {
  let create = Object.create(null);
  for (let r of UI_ELEMENT_TYPES[e]) create[r] = Ny(r);
  return Object.freeze(create);
}
/**
 * 校验元素构造器表：每项都必须是函数。
 */
//@ chunk-4121qate.js:70054-70243 placement
function checkElementTable(e) {
  if (!isPlainObject(e)) return "something that is not a table of elements";
  for (let [o, r] of Object.entries(e))
    if (typeof r !== "function") return `an entry "${o}" that is not a constructor`;
  return;
}
//@ chunk-4121qate.js:70243-70291 placement
var Dy = (e) => typeof e === "string" && Lt.includes(e);
//@ chunk-4121qate.js:175433-175469 placement
var pn = (e) => e === "engine" || e === "Svg";
//@ chunk-4121qate.js:175469-175537 placement
var St = (e) => e === "Button" || e === "Input" || e === "Select" || e === "Markdown";
//@ chunk-4121qate.js:175537-175619 placement
var iu = (e) => e === "Button" || (!pn(e) && e !== "Client" && e !== "Raster" && e !== "Image" && !St(e));
//@ chunk-4121qate.js:175619-175706 placement
function $e(e, o) {
  let { children: children } = e;
  return Array.isArray(children) && iu(e.type) ? children.flatMap(o) : [];
}
//@ chunk-4121qate.js:175706-175877 placement
function optionValues(e) {
  if (!Array.isArray(e)) return;
  let mapped = e.map((n) => (typeof n === "object" && n !== null && "value" in n ? n.value : void 0));
  return mapped.every((n) => typeof n === "string") ? mapped : void 0;
}
//@ chunk-4121qate.js:175877-176390 placement
function checkElementProps(e) {
  if (typeof e !== "object" || !e || Array.isArray(e)) return [];
  let o = e,
    r = o.type,
    n = $e(o, checkElementProps);
  if (!St(r)) return n;
  let { press: press, props: props } = o;
  if (!(typeof press === "object" && press !== null)) return n;
  let { plugin: plugin, handle: handle } = press,
    m = props?.key;
  if (!(typeof plugin === "string" && typeof handle === "number" && typeof m === "string")) return n;
  let u = props?.pressableLinks,
    l = Array.isArray(u) && u.every((g) => typeof g === "string"),
    y = r === "Select" ? optionValues(props?.options) : void 0;
  return [
    {
      tag: r,
      plugin: plugin,
      handle: handle,
      element: m,
      ...(l && { pressableLinks: u }),
      ...(y !== void 0 && { options: y }),
    },
    ...n,
  ];
}
//@ chunk-4121qate.js:176390-176448 placement
var Lrs = (e) => ["client", e.plugin, e.key, e.module].join(fromCharCode);
//@ chunk-4121qate.js:176448-176481 placement
var me = (e) => (isPlainObject(e) ? e.plugin : void 0);
/**
 * 在渲染树中收集 Client 元素（插件、模块、key）。
 */
//@ chunk-4121qate.js:176481-176742 placement
function collectClientElements(e) {
  if (!isPlainObject(e)) return [];
  let o = e;
  if (o.type !== "Client") return $e(o, collectClientElements);
  let { props: props } = o,
    n = me(o.client),
    s = isPlainObject(props) ? props.key : void 0,
    i = isPlainObject(props) ? props.module : void 0;
  return typeof n === "string" && n !== "" && typeof s === "string" && typeof i === "string"
    ? [{ plugin: n, module: i, key: s }]
    : [];
}
//@ chunk-4121qate.js:176742-176883 placement
function containsEngineNode(e) {
  if (typeof e === "string") return !1;
  let o = "children" in e ? e.children : void 0;
  return e.type === "engine" || (Array.isArray(o) && o.some(containsEngineNode));
}
//@ chunk-4121qate.js:176883-176927 placement
var an = (e) => typeof e === "string" || pn(e.type);
//@ chunk-4121qate.js:176927-176977 placement = withModifiers (0.799)
var withModifiers_2 = (e) => St(e.type) && "press" in e && isPlainObject(e.press);
//@ chunk-4121qate.js:176977-177256 placement
function restampPress(e, o) {
  let r = { plugin: e.press.plugin, handle: o };
  switch (e.type) {
    case "Button":
      return { ...e, press: r };
    case "Input":
      return { type: "Input", props: e.props, press: r };
    case "Select":
      return { type: "Select", props: e.props, press: r };
    case "Markdown":
      return { type: "Markdown", props: e.props, press: r };
  }
}
//@ chunk-4121qate.js:177256-177367 placement = setAttribute (0.839)
function mapChildren(e, o) {
  let r = e,
    n = "children" in r ? r.children : void 0;
  return Array.isArray(n) ? { ...e, children: n.map(o) } : e;
}
//@ chunk-4121qate.js:177367-177505 placement
function mapPressHandles(e, o) {
  if (an(e)) return e;
  if (withModifiers_2(e)) {
    let r = o(e.press.plugin, e.press.handle);
    return r === void 0 ? e : restampPress(e, r);
  }
  return mapChildren(e, (r) => mapPressHandles(r, o));
}
//@ chunk-4121qate.js:177505-177550 placement
var PUi = (e) =>
  containsEngineNode(e) ? void 0 : computeContentHash(jsonStringify(mapPressHandles(e, () => 0)));
//@ chunk-4121qate.js:177550-177628 placement
var IUi = () => ({ seen: new Set(), groups: new Map(), parts: new Map(), counted: new WeakSet() });
//@ chunk-4121qate.js:177628-177678 placement
var Ifr = (e) => `${e.plugin}\x00scope\x00${e.scope}`;
//@ chunk-4121qate.js:177678-177713 placement
var d3t = (e) => e === "Box" || e === "Text";
//@ chunk-4121qate.js:177713-177791 placement
function c3t(e) {
  let o = isPlainObject(e) ? e.scope : void 0;
  return typeof o === "string" ? o : void 0;
}
/**
 * 收集渲染树中各插件的悬停作用域（Box/Text 组与可按元素）。
 */
//@ chunk-4121qate.js:177791-178035 placement
function collectHoverScopes(e) {
  let o = isPlainObject(e) ? e : {},
    { hover: hover, press: press, group: group } = o,
    i = c3t(hover),
    p = o.type,
    a = isPlainObject(press) && typeof press.handle === "number" ? press : void 0,
    m = St(p) ? a : d3t(p) ? group : void 0,
    c = me(m);
  return [
    ...(i !== void 0 && typeof c === "string" && c !== "" ? [{ plugin: c, scope: i }] : []),
    ...$e(o, collectHoverScopes),
  ];
}
//@ chunk-4121qate.js:178035-178087 placement = _temp (1)
var Hrs = (c) => ["image", c.plugin, c.key ?? ""].join(fromCharCode);
//@ chunk-4121qate.js:178087-178345 placement
function describeForeignMedia(e, o, r) {
  let n = r === "Raster",
    s = n ? "a Raster" : "an Image",
    i = n ? "cells" : "source";
  return `returned ${s} it did not draw (${String(o)}/${String(e)}); a render hook may keep the ones next(e) returned and change their ${i}, not which plugin or key they name`;
}
//@ chunk-4121qate.js:178345-178385 placement
var mu = (e, o) => ({ ...e, image: { plugin: o } });
//@ chunk-4121qate.js:178385-178572 placement
var IMAGE_STAMP_RULES = {
  stampOf: (e) => e.image,
  restamp: mu,
  seenKeyOf: (e, o) => {
    let key = e.props.key;
    return key === void 0 || typeof key === "string" ? Hrs({ plugin: o, key: key }) : void 0;
  },
  refusal: (e, o) => describeForeignMedia(e.props.key, o, "Image"),
};
/**
 * 收集渲染树中的 Image 元素（图片与 key）。
 */
//@ chunk-4121qate.js:178572-178784 placement
function collectImageElements(e) {
  if (!isPlainObject(e)) return [];
  let o = e;
  if (o.type !== "Image") return $e(o, collectImageElements);
  let { props: props } = o,
    n = me(o.image),
    s = isPlainObject(props) ? props.key : void 0;
  return typeof n === "string" && n !== "" ? [{ plugin: n, key: typeof s === "string" ? s : void 0 }] : [];
}
//@ chunk-4121qate.js:178784-178835 placement
function cu(e) {
  return e === "onPress" || e === "onEvent";
}
//@ chunk-4121qate.js:178835-178880 placement
var Qbi = (e) => isPlainDataObject(e) && typeof e.type === "string";
//@ chunk-4121qate.js:178880-178963 placement
var Di = (e) =>
  e.type === "Markdown" && !withModifiers_2(e) && isPlainObject(e.props) && typeof e.props.key === "string";
//@ chunk-4121qate.js:178963-178987 placement
var Ko = (e) => d3t(e.type);
//@ chunk-4121qate.js:178987-179084 placement
function mn(e, o) {
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(e, o);
  return ownPropertyDescriptor && "value" in ownPropertyDescriptor ? ownPropertyDescriptor.value : void 0;
}
//@ chunk-4121qate.js:179084-179123 placement
function Bi(e, o, r) {
  return (e.set(o, r), r);
}
//@ chunk-4121qate.js:179123-180041 placement
function checkElementList(e, o) {
  let weakMap = new WeakMap();
  function n(p) {
    if (Array.isArray(p)) {
      let a = mn(p, "length"),
        m = typeof a === "number" ? a : 0,
        c = Bi(weakMap, p, []);
      for (let u = 0; u < m; u += 1) c[u] = i(mn(p, String(u)));
      return c;
    }
    let f = Bi(weakMap, p, {});
    for (let a of Object.keys(p)) if (a !== "__proto__") f[a] = s(a, mn(p, a));
    return f;
  }
  function s(p, f) {
    return !Pf(f) && typeof f === "function" && cu(p) ? f : i(f);
  }
  function i(p) {
    if (Pf(p))
      throw new HooksError(
        `${o}: returned a drawing that holds a Proxy or a vm context; an element, its props and its hover are plain objects and arrays`,
      );
    let f = Array.isArray(p) || isPlainDataObject(p);
    if (typeof p === "function")
      throw new HooksError(
        `${o}: returned a drawing with a function where plain data goes; a closure rides only in an element's onPress or onEvent`,
      );
    if (!f && isPlainObject(p))
      throw new HooksError(
        `${o}: returned a drawing that holds an object that is not plain data (a class instance); an element, its props and its hover are plain objects and arrays`,
      );
    return f ? (weakMap.get(p) ?? n(p)) : p;
  }
  return i(e);
}
//@ chunk-4121qate.js:180041-180090 placement
var un = (e, o) => ["markdown", o, String(e)].join(fromCharCode);
/**
 * 收集渲染树中的 Markdown 片段（片段与 key）。
 */
//@ chunk-4121qate.js:180090-180272 placement
function collectMarkdownParts(e) {
  let o = isPlainObject(e) ? e : {};
  if (o.type !== "Markdown") return $e(o, collectMarkdownParts);
  let r = me(o.part),
    n = isPlainObject(o.props) ? o.props.key : void 0;
  return typeof r === "string" && typeof n === "string" ? [un(n, r)] : [];
}
/**
 * 收集渲染树中文本类元素的片段文本。
 */
//@ chunk-4121qate.js:180272-180389 placement
function collectTextParts(e) {
  let o = isPlainObject(e) ? e : {},
    r = me(o.part);
  return [...(d3t(o.type) && typeof r === "string" && r !== "" ? [r] : []), ...$e(o, collectTextParts)];
}
//@ chunk-4121qate.js:180428-180477 placement
var $rs = (e) => ["raster", e.plugin, e.key].join(fromCharCode);
//@ chunk-4121qate.js:180477-180518 placement
var du = (e, o) => ({ ...e, raster: { plugin: o } });
//@ chunk-4121qate.js:180518-180695 placement
var RASTER_STAMP_RULES = {
  stampOf: (e) => e.raster,
  restamp: du,
  seenKeyOf: (e, o) => {
    let key = e.props.key;
    return typeof key === "string" ? $rs({ plugin: o, key: key }) : void 0;
  },
  refusal: (e, o) => describeForeignMedia(e.props.key, o, "Raster"),
};
/**
 * 收集渲染树中的 Raster 元素（栅格与 key）。
 */
//@ chunk-4121qate.js:180695-180903 placement
function collectRasterElements(e) {
  if (!isPlainObject(e)) return [];
  let o = e;
  if (o.type !== "Raster") return $e(o, collectRasterElements);
  let { props: props } = o,
    n = me(o.raster),
    s = isPlainObject(props) ? props.key : void 0;
  return typeof n === "string" && n !== "" && typeof s === "string" ? [{ plugin: n, key: s }] : [];
}
//@ chunk-4121qate.js:180903-180926 placement
var MUi = (e, o) => mapPressHandles(e, o);
//@ chunk-4121qate.js:180926-180967 placement
var yu = (e, o) => ({ ...e, client: { plugin: o } });
//@ chunk-4121qate.js:180967-181419 placement
function checkReturnedClient(e, o) {
  let r = me(e.client),
    key = e.props.key,
    s = e.props.module;
  if (r === "" || r === void 0) return yu(e, o.plugin);
  if (!(
    typeof r === "string" &&
    typeof key === "string" &&
    typeof s === "string" &&
    o.seen.has(Lrs({ plugin: r, key: key, module: s }))
  ))
    throw new HooksError(
      `${o.plugin}: returned a Client it did not draw (${String(r)}/${String(key)} ${String(s)}); a render hook may keep the ones next(e) returned and change their props, not which plugin, key or module they name`,
    );
  return e;
}
//@ chunk-4121qate.js:181419-181459 placement
var xu = (e, o) => ({ ...e, group: { plugin: o } });
//@ chunk-4121qate.js:181459-181745 placement
function takeHoverGroup(e, o, r) {
  let n = Ifr(o),
    s = e.groups.get(n) ?? 0;
  if (s < 1)
    throw new HooksError(
      `${e.plugin}: returned a ${r} in another plugin's hover scope that next(e) did not hand it; a render hook may keep the ones next(e) returned and restyle them, not join another plugin's group`,
    );
  e.groups.set(n, s - 1);
}
//@ chunk-4121qate.js:181745-181929 placement
function stampHoverGroup(e, o) {
  let r = c3t(e.hover);
  if (r === void 0) return e;
  let n = me(e.group);
  if (n === "" || n === void 0 || n === o.plugin) return xu(e, o.plugin);
  return (takeHoverGroup(o, { plugin: String(n), scope: r }, e.type), e);
}
//@ chunk-4121qate.js:181929-182160 placement
function stampMedia(e, o, r) {
  let n = me(r.stampOf(e));
  if (n === "" || n === void 0) return r.restamp(e, o.plugin);
  let i = typeof n === "string" ? r.seenKeyOf(e, n) : void 0;
  if (!(i !== void 0 && o.seen.has(i))) throw new HooksError(`${o.plugin}: ${r.refusal(e, n)}`);
  return e;
}
//@ chunk-4121qate.js:182160-182185 placement
var ku = (e, o) => stampMedia(e, o, IMAGE_STAMP_RULES);
//@ chunk-4121qate.js:182185-182269 placement
var wu = { Button: "a Button", Input: "an Input", Select: "a Select", Markdown: "a Markdown" };
//@ chunk-4121qate.js:182269-182308 placement
var Ht = (e, o) => ({ ...e, part: { plugin: o } });
//@ chunk-4121qate.js:182308-182351 placement
function ln(e) {
  let { part: part, ...r } = e;
  return r;
}
//@ chunk-4121qate.js:182351-182578 placement
function stampPart(e, o) {
  if (!("part" in e)) return e;
  let r = me(e.part);
  if (r === o.plugin) return Ht(e, o.plugin);
  let n = typeof r === "string" ? (o.parts.get(r) ?? 0) : 0;
  if (typeof r !== "string" || r === "" || n < 1) return ln(e);
  return (o.parts.set(r, n - 1), Ht(e, r));
}
//@ chunk-4121qate.js:182578-182603 placement
var Su = (e, o) => stampMedia(e, o, RASTER_STAMP_RULES);
/**
 * 把可按元素（Button/Input/Select/Markdown）转为带按键句柄的形状。
 */
//@ chunk-4121qate.js:182603-182993 placement
function toPressElement(e, o, r) {
  let n = { plugin: o, handle: r };
  switch (e.type) {
    case "Button": {
      let s = { type: "Button", props: e.props, press: n },
        p = e.hover === void 0 ? s : { ...s, hover: e.hover };
      return e.children === void 0 ? p : { ...p, children: e.children };
    }
    case "Input":
      return { type: "Input", props: e.props, press: n };
    case "Select":
      return { type: "Select", props: e.props, press: n };
    case "Markdown":
      return { type: "Markdown", props: e.props, press: n };
  }
}
//@ chunk-4121qate.js:182993-183471 placement
var ELEMENT_HANDLER_ERRORS = {
  Button:
    "returned a Button without an onPress function; a render hook draws one with <Button key label onPress>",
  Input: "returned an Input without an onSubmit function; a render hook draws one with <Input key onSubmit>",
  Select:
    "returned a Select without an onSelect function; a render hook draws one with <Select key options onSelect>",
  Markdown:
    "returned a pressable Markdown without an onLinkPress function; a render hook draws one with <Markdown key text onLinkPress>",
};
//@ chunk-4121qate.js:183471-184565 placement
function validateElement(e, o) {
  if (typeof e === "object" && e !== null && e.type === "engine") return { type: "engine", ref: e.ref };
  if (typeof e === "object" && !Ko(e) && !Di(e) && "part" in e) return validateElement(ln(e), o);
  if (an(e)) return e;
  if (e.type === "Client") return checkReturnedClient(e, o);
  if (e.type === "Raster") return Su(e, o);
  if (e.type === "Image") return ku(e, o);
  if (Di(e)) {
    let h = me("part" in e ? e.part : void 0),
      v = typeof h === "string" && o.seen.has(un(e.props.key, h));
    return Ht(e, v ? h : o.plugin);
  }
  if (!withModifiers_2(e)) {
    let h = Ko(e) ? stampPart(stampHoverGroup(e, o), o) : e;
    return mapChildren(h, (v) => validateElement(v, o));
  }
  let { press: press, onPress: onPress, onEvent: onEvent } = e,
    p = e.type === "Button",
    f = p ? onPress : onEvent,
    a = p ? mapChildren(e, (h) => validateElement(h, o)) : e;
  if (typeof press !== "object" || press === null) return a;
  let { handle: handle, plugin: plugin } = press;
  if (typeof handle !== "number") return a;
  if (plugin === "") {
    if (typeof f !== "function") throw new HooksError(`${o.plugin}: ${ELEMENT_HANDLER_ERRORS[a.type]}`);
    return (o.take(handle, f), toPressElement(a, o.plugin, handle));
  }
  if (typeof plugin !== "string" || !o.seen.has(withModifiers(plugin, handle)))
    throw new HooksError(
      `${o.plugin}: returned ${wu[a.type]} it did not draw (${String(plugin)}#${handle}); a render hook may keep the ones next(e) returned, not address another plugin's`,
    );
  let { hover: hover } = a,
    x = c3t(hover);
  if (x !== void 0 && plugin !== o.plugin) takeHoverGroup(o, { plugin: plugin, scope: x }, a.type);
  return a;
}
//@ chunk-4121qate.js:184565-184654 placement
function DUi({ tree: tree, ...o }) {
  let r = validateElement(tree, o);
  return Ko(r) && r.part === void 0 ? Ht(r, o.plugin) : r;
}

export {
  UI_ELEMENT_TYPES,
  Gbi,
  checkElementProps,
  checkElementList,
  Qbi,
  DUi,
  collectClientElements,
  Lrs,
  collectRasterElements,
  $rs,
  collectImageElements,
  Hrs,
  collectMarkdownParts,
  collectHoverScopes,
  Ifr,
  collectTextParts,
  IUi,
  Lt,
  checkElementTable,
  me,
  Dy,
  buildElementTable,
  d3t,
  c3t,
  PUi,
  MUi,
};
