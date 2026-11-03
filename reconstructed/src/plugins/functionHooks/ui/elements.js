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
import { deepFreezeInPlace, isPlainDataObject } from "../../../utils/hooks/functionHookMatchers.js";
import { buildVmElement, vmFragment, namedVmElementBuilder } from "../vm/boundaryCopy.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { Vme } from "./raster.js";
import { computeContentHash } from "../../../utils/commitAttribution.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { isUntrustedObject } from "../../../utils/untrustedValues.js";
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
/**
 * 全部 UI 元素类型
 */
var ALL_ELEMENT_TYPES = uniq(Object.values(UI_ELEMENT_TYPES).flat());
//@ chunk-4121qate.js:69783-69810 placement
/**
 * 构建占位元素
 */
var buildStaticElement = (e) => deepFreezeInPlace(buildVmElement(vmFragment, e));
//@ chunk-4121qate.js:69810-69957 placement
/**
 * 构建元素构造器表：包装已有构造器，缺失的元素类型以占位片段补齐并回调告警。
 */
function buildElementTable(e, o, r) {
  let n = {};
  for (let [key, value] of Object.entries(e)) if (typeof value === "function") n[key] = o(value);
  for (let s of ALL_ELEMENT_TYPES)
    if (!n[s]) {
      r(s);
      n[s] = o(buildStaticElement);
    }
  return n;
}
//@ chunk-4121qate.js:69957-70054 placement
/**
 * 某类型元素的构造器表
 */
function elementBuildersFor(e) {
  let o = Object.create(null);
  for (let r of UI_ELEMENT_TYPES[e]) o[r] = namedVmElementBuilder(r);
  return Object.freeze(o);
}
//@ chunk-4121qate.js:70054-70243 placement
/**
 * 校验元素构造器表：每项都必须是函数。
 */
function checkElementTable(e) {
  if (!isPlainObject(e)) return "something that is not a table of elements";
  for (let [key, value] of Object.entries(e))
    if (typeof value !== "function") return `an entry "${key}" that is not a constructor`;
  return;
}
//@ chunk-4121qate.js:70243-70291 placement
/**
 * 是否已知元素类型
 */
var isElementType_2 = (e) => typeof e === "string" && ALL_ELEMENT_TYPES.includes(e);
//@ chunk-4121qate.js:175433-175469 placement
/**
 * engine 或 Svg
 */
var isEngineOrSvg = (e) => e === "engine" || e === "Svg";
//@ chunk-4121qate.js:175469-175537 placement
/**
 * Button/Input/Select/Markdown
 */
var isPressableType = (e) => e === "Button" || e === "Input" || e === "Select" || e === "Markdown";
//@ chunk-4121qate.js:175537-175619 placement
/**
 * 可承载子元素
 */
var hasChildrenContainer = (type) =>
  type === "Button" ||
  (!isEngineOrSvg(type) &&
    type !== "Client" &&
    type !== "Raster" &&
    type !== "Image" &&
    !isPressableType(type));
//@ chunk-4121qate.js:175619-175706 placement
/**
 * 取子元素
 */
function childElements(e, o) {
  let { children } = e;
  return Array.isArray(children) && hasChildrenContainer(e.type) ? children.flatMap(o) : [];
}
//@ chunk-4121qate.js:175706-175877 placement
function optionValues(options) {
  if (!Array.isArray(options)) return;
  let mapped = options.map((n) =>
    typeof n === "object" && n !== null && "value" in n ? n.value : undefined,
  );
  return mapped.every((n) => typeof n === "string") ? mapped : undefined;
}
//@ chunk-4121qate.js:175877-176390 placement
function checkElementProps(e) {
  if (typeof e !== "object" || !e || Array.isArray(e)) return [];
  let o = e;
  let r = o.type;
  let n = childElements(o, checkElementProps);
  if (!isPressableType(r)) return n;
  let { press, props } = o;
  if (!(typeof press === "object" && press !== null)) return n;
  let { plugin, handle } = press;
  let key = props?.key;
  if (!(typeof plugin === "string" && typeof handle === "number" && typeof key === "string")) return n;
  let pressableLinks = props?.pressableLinks;
  let l =
    Array.isArray(pressableLinks) &&
    pressableLinks.every((pressableLink) => typeof pressableLink === "string");
  let y = r === "Select" ? optionValues(props?.options) : undefined;
  return [
    {
      tag: r,
      plugin,
      handle,
      element: key,
      ...(l && {
        pressableLinks,
      }),
      ...(y !== undefined && {
        options: y,
      }),
    },
    ...n,
  ];
}
//@ chunk-4121qate.js:176390-176448 placement
/**
 * client 元素键
 */
var clientKeyOf = (e) => ["client", e.plugin, e.key, e.module].join(Vme);
//@ chunk-4121qate.js:176448-176481 placement
/**
 * 元素的 plugin
 */
var pluginOfElement = (e) => (isPlainObject(e) ? e.plugin : undefined);
//@ chunk-4121qate.js:176481-176742 placement
/**
 * 在渲染树中收集 Client 元素（插件、模块、key）。
 */
function collectClientElements(e) {
  if (!isPlainObject(e)) return [];
  let o = e;
  if (o.type !== "Client") return childElements(o, collectClientElements);
  let { props } = o;
  let n = pluginOfElement(o.client);
  let key = isPlainObject(props) ? props.key : undefined;
  let i = isPlainObject(props) ? props.module : undefined;
  return typeof n === "string" && n !== "" && typeof key === "string" && typeof i === "string"
    ? [
        {
          plugin: n,
          module: i,
          key,
        },
      ]
    : [];
}
//@ chunk-4121qate.js:176742-176883 placement
function containsEngineNode(e) {
  if (typeof e === "string") return false;
  let children = "children" in e ? e.children : undefined;
  return e.type === "engine" || (Array.isArray(children) && children.some(containsEngineNode));
}
//@ chunk-4121qate.js:176883-176927 placement
/**
 * 字符串或 engine 类型
 */
var isStringOrEngineType = (e) => typeof e === "string" || isEngineOrSvg(e.type);
//@ chunk-4121qate.js:176927-176977 placement = withModifiers (0.799)
var withModifiers_2 = (e) => isPressableType(e.type) && "press" in e && isPlainObject(e.press);
//@ chunk-4121qate.js:176977-177256 placement
function restampPress(e, handle) {
  let press = {
    plugin: e.press.plugin,
    handle,
  };
  switch (e.type) {
    case "Button":
      return {
        ...e,
        press,
      };
    case "Input":
      return {
        type: "Input",
        props: e.props,
        press,
      };
    case "Select":
      return {
        type: "Select",
        props: e.props,
        press,
      };
    case "Markdown":
      return {
        type: "Markdown",
        props: e.props,
        press,
      };
  }
}
//@ chunk-4121qate.js:177256-177367 placement = setAttribute (0.839)
function mapChildren(e, o) {
  let r = e;
  let children = "children" in r ? r.children : undefined;
  return Array.isArray(children)
    ? {
        ...e,
        children: children.map(o),
      }
    : e;
}
//@ chunk-4121qate.js:177367-177505 placement
function mapPressHandles_2(e, o) {
  if (isStringOrEngineType(e)) return e;
  if (withModifiers_2(e)) {
    let handle = o(e.press.plugin, e.press.handle);
    return handle === undefined ? e : restampPress(e, handle);
  }
  return mapChildren(e, (r) => mapPressHandles_2(r, o));
}
//@ chunk-4121qate.js:177505-177550 placement
/**
 * 渲染树内容哈希
 */
var treeContentHash = (e) =>
  containsEngineNode(e) ? undefined : computeContentHash(jsonStringify(mapPressHandles_2(e, () => 0)));
//@ chunk-4121qate.js:177550-177628 placement
/**
 * 收集器状态
 */
var newCollectorState = () => ({
  seen: new Set(),
  groups: new Map(),
  parts: new Map(),
  counted: new WeakSet(),
});
//@ chunk-4121qate.js:177628-177678 placement
/**
 * 悬停作用域表的键 plugin\0scope，按插件与作用域名区分悬停计数。
 */
var hoverScopeKey = (e) => `${e.plugin}\x00scope\x00${e.scope}`;
//@ chunk-4121qate.js:177678-177713 placement
/**
 * Box 或 Text
 */
var isHoverableType = (type) => type === "Box" || type === "Text";
//@ chunk-4121qate.js:177713-177791 placement
/**
 * 元素的 scope
 */
function elementScope(hover) {
  let scope = isPlainObject(hover) ? hover.scope : undefined;
  return typeof scope === "string" ? scope : undefined;
}
//@ chunk-4121qate.js:177791-178035 placement
/**
 * 收集渲染树中各插件的悬停作用域（Box/Text 组与可按元素）。
 */
function collectHoverScopes(e) {
  let o = isPlainObject(e) ? e : {};
  let { hover, press, group } = o;
  let i = elementScope(hover);
  let p = o.type;
  let a = isPlainObject(press) && typeof press.handle === "number" ? press : undefined;
  let m = isPressableType(p) ? a : isHoverableType(p) ? group : undefined;
  let c = pluginOfElement(m);
  return [
    ...(i !== undefined && typeof c === "string" && c !== ""
      ? [
          {
            plugin: c,
            scope: i,
          },
        ]
      : []),
    ...childElements(o, collectHoverScopes),
  ];
}
//@ chunk-4121qate.js:178035-178087 placement = _temp (1)
/**
 * image 元素键
 */
var imageKeyOf = (c) => ["image", c.plugin, c.key ?? ""].join(Vme);
//@ chunk-4121qate.js:178087-178345 placement
function describeForeignMedia(key, o, r) {
  let n = r === "Raster";
  let s = n ? "a Raster" : "an Image";
  let i = n ? "cells" : "source";
  return `returned ${s} it did not draw (${String(o)}/${String(key)}); a render hook may keep the ones next(e) returned and change their ${i}, not which plugin or key they name`;
}
//@ chunk-4121qate.js:178345-178385 placement
/**
 * 标记图片所属插件
 */
var withImageOwner = (e, plugin) => ({
  ...e,
  image: {
    plugin,
  },
});
//@ chunk-4121qate.js:178385-178572 placement
var IMAGE_STAMP_RULES = {
  stampOf: (e) => e.image,
  restamp: withImageOwner,
  seenKeyOf: (e, plugin) => {
    let key = e.props.key;
    return key === undefined || typeof key === "string"
      ? imageKeyOf({
          plugin,
          key,
        })
      : undefined;
  },
  refusal: (e, o) => describeForeignMedia(e.props.key, o, "Image"),
};
//@ chunk-4121qate.js:178572-178784 placement
/**
 * 收集渲染树中的 Image 元素（图片与 key）。
 */
function collectImageElements(e) {
  if (!isPlainObject(e)) return [];
  let o = e;
  if (o.type !== "Image") return childElements(o, collectImageElements);
  let { props } = o;
  let n = pluginOfElement(o.image);
  let key = isPlainObject(props) ? props.key : undefined;
  return typeof n === "string" && n !== ""
    ? [
        {
          plugin: n,
          key: typeof key === "string" ? key : undefined,
        },
      ]
    : [];
}
//@ chunk-4121qate.js:178784-178835 placement
/**
 * onPress/onEvent
 */
function isPressHandlerProp(e) {
  return e === "onPress" || e === "onEvent";
}
//@ chunk-4121qate.js:178835-178880 placement
/**
 * 纯数据且带 type
 */
var isPlainElement = (e) => isPlainDataObject(e) && typeof e.type === "string";
//@ chunk-4121qate.js:178880-178963 placement
/**
 * 带 key 的 Markdown
 */
var isKeyedMarkdown = (e) =>
  e.type === "Markdown" && !withModifiers_2(e) && isPlainObject(e.props) && typeof e.props.key === "string";
//@ chunk-4121qate.js:178963-178987 placement
/**
 * 悬停作用域元素
 */
var isHoverScopeElement = (e) => isHoverableType(e.type);
//@ chunk-4121qate.js:178987-179084 placement
/**
 * 自有属性的值
 */
function ownValueOf(e, o) {
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(e, o);
  return ownPropertyDescriptor && "value" in ownPropertyDescriptor ? ownPropertyDescriptor.value : undefined;
}
//@ chunk-4121qate.js:179084-179123 placement
/**
 * 设置并返回
 */
function setAndReturn(weakMap, o, r) {
  weakMap.set(o, r);
  return r;
}
//@ chunk-4121qate.js:179123-180041 placement
function checkElementList(result, o) {
  let weakMap = new WeakMap();
  function n(p) {
    if (Array.isArray(p)) {
      let a = ownValueOf(p, "length");
      let m = typeof a === "number" ? a : 0;
      let c = setAndReturn(weakMap, p, []);
      for (let u = 0; u < m; u += 1) c[u] = i(ownValueOf(p, String(u)));
      return c;
    }
    let f = setAndReturn(weakMap, p, {});
    for (let key of Object.keys(p)) if (key !== "__proto__") f[key] = s(key, ownValueOf(p, key));
    return f;
  }
  function s(p, f) {
    return !isUntrustedObject(f) && typeof f === "function" && isPressHandlerProp(p) ? f : i(f);
  }
  function i(p) {
    if (isUntrustedObject(p))
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
  return i(result);
}
//@ chunk-4121qate.js:180041-180090 placement
/**
 * markdown 片段键
 */
var markdownKeyOf = (key, o) => ["markdown", o, String(key)].join(Vme);
//@ chunk-4121qate.js:180090-180272 placement
/**
 * 收集渲染树中的 Markdown 片段（片段与 key）。
 */
function collectMarkdownParts(e) {
  let o = isPlainObject(e) ? e : {};
  if (o.type !== "Markdown") return childElements(o, collectMarkdownParts);
  let r = pluginOfElement(o.part);
  let key = isPlainObject(o.props) ? o.props.key : undefined;
  return typeof r === "string" && typeof key === "string" ? [markdownKeyOf(key, r)] : [];
}
//@ chunk-4121qate.js:180272-180389 placement
/**
 * 收集渲染树中文本类元素的片段文本。
 */
function collectTextParts(e) {
  let o = isPlainObject(e) ? e : {};
  let r = pluginOfElement(o.part);
  return [
    ...(isHoverableType(o.type) && typeof r === "string" && r !== "" ? [r] : []),
    ...childElements(o, collectTextParts),
  ];
}
//@ chunk-4121qate.js:180428-180477 placement
/**
 * raster 元素键
 */
var rasterKeyOf = (e) => ["raster", e.plugin, e.key].join(Vme);
//@ chunk-4121qate.js:180477-180518 placement
/**
 * 标记 raster 所属插件
 */
var withRasterOwner = (e, plugin) => ({
  ...e,
  raster: {
    plugin,
  },
});
//@ chunk-4121qate.js:180518-180695 placement
var RASTER_STAMP_RULES = {
  stampOf: (e) => e.raster,
  restamp: withRasterOwner,
  seenKeyOf: (e, plugin) => {
    let key = e.props.key;
    return typeof key === "string"
      ? rasterKeyOf({
          plugin,
          key,
        })
      : undefined;
  },
  refusal: (e, o) => describeForeignMedia(e.props.key, o, "Raster"),
};
//@ chunk-4121qate.js:180695-180903 placement
/**
 * 收集渲染树中的 Raster 元素（栅格与 key）。
 */
function collectRasterElements(e) {
  if (!isPlainObject(e)) return [];
  let o = e;
  if (o.type !== "Raster") return childElements(o, collectRasterElements);
  let { props } = o;
  let n = pluginOfElement(o.raster);
  let key = isPlainObject(props) ? props.key : undefined;
  return typeof n === "string" && n !== "" && typeof key === "string"
    ? [
        {
          plugin: n,
          key,
        },
      ]
    : [];
}
//@ chunk-4121qate.js:180903-180926 placement
/**
 * 映射按键句柄
 */
var mapPressHandles = (e, o) => mapPressHandles_2(e, o);
//@ chunk-4121qate.js:180926-180967 placement
/**
 * 标记 client 所属插件
 */
var withClientOwner = (e, plugin) => ({
  ...e,
  client: {
    plugin,
  },
});
//@ chunk-4121qate.js:180967-181419 placement
function checkReturnedClient(e, o) {
  let r = pluginOfElement(e.client);
  let key = e.props.key;
  let s = e.props.module;
  if (r === "" || r === undefined) return withClientOwner(e, o.plugin);
  if (!(
    typeof r === "string" &&
    typeof key === "string" &&
    typeof s === "string" &&
    o.seen.has(
      clientKeyOf({
        plugin: r,
        key,
        module: s,
      }),
    )
  ))
    throw new HooksError(
      `${o.plugin}: returned a Client it did not draw (${String(r)}/${String(key)} ${String(s)}); a render hook may keep the ones next(e) returned and change their props, not which plugin, key or module they name`,
    );
  return e;
}
//@ chunk-4121qate.js:181419-181459 placement
/**
 * 标记分组所属插件
 */
var withGroupOwner = (e, plugin) => ({
  ...e,
  group: {
    plugin,
  },
});
//@ chunk-4121qate.js:181459-181745 placement
function takeHoverGroup(e, o, type) {
  let n = hoverScopeKey(o);
  let s = e.groups.get(n) ?? 0;
  if (s < 1)
    throw new HooksError(
      `${e.plugin}: returned a ${type} in another plugin's hover scope that next(e) did not hand it; a render hook may keep the ones next(e) returned and restyle them, not join another plugin's group`,
    );
  e.groups.set(n, s - 1);
}
//@ chunk-4121qate.js:181745-181929 placement
function stampHoverGroup(e, o) {
  let r = elementScope(e.hover);
  if (r === undefined) return e;
  let n = pluginOfElement(e.group);
  if (n === "" || n === undefined || n === o.plugin) return withGroupOwner(e, o.plugin);
  takeHoverGroup(
    o,
    {
      plugin: String(n),
      scope: r,
    },
    e.type,
  );
  return e;
}
//@ chunk-4121qate.js:181929-182160 placement
function stampMedia(e, o, r) {
  let n = pluginOfElement(r.stampOf(e));
  if (n === "" || n === undefined) return r.restamp(e, o.plugin);
  let i = typeof n === "string" ? r.seenKeyOf(e, n) : undefined;
  if (!(i !== undefined && o.seen.has(i))) throw new HooksError(`${o.plugin}: ${r.refusal(e, n)}`);
  return e;
}
//@ chunk-4121qate.js:182160-182185 placement
/**
 * 标记图片媒体
 */
var stampImageMedia = (e, o) => stampMedia(e, o, IMAGE_STAMP_RULES);
//@ chunk-4121qate.js:182185-182269 placement
/**
 * a Button/an Input…
 */
var PRESSABLE_LABELS = {
  Button: "a Button",
  Input: "an Input",
  Select: "a Select",
  Markdown: "a Markdown",
};
//@ chunk-4121qate.js:182269-182308 placement
/**
 * 标记部件所属插件
 */
var withPartOwner = (e, plugin) => ({
  ...e,
  part: {
    plugin,
  },
});
//@ chunk-4121qate.js:182308-182351 placement
/**
 * 去掉 part
 */
function withoutPart(e) {
  let { part, ...r } = e;
  return r;
}
//@ chunk-4121qate.js:182351-182578 placement
function stampPart(e, o) {
  if (!("part" in e)) return e;
  let r = pluginOfElement(e.part);
  if (r === o.plugin) return withPartOwner(e, o.plugin);
  let n = typeof r === "string" ? (o.parts.get(r) ?? 0) : 0;
  if (typeof r !== "string" || r === "" || n < 1) return withoutPart(e);
  o.parts.set(r, n - 1);
  return withPartOwner(e, r);
}
//@ chunk-4121qate.js:182578-182603 placement
/**
 * 标记 raster 媒体
 */
var stampRasterMedia = (e, o) => stampMedia(e, o, RASTER_STAMP_RULES);
//@ chunk-4121qate.js:182603-182993 placement
/**
 * 把可按元素（Button/Input/Select/Markdown）转为带按键句柄的形状。
 */
function toPressElement(e, plugin, handle) {
  let press = {
    plugin,
    handle,
  };
  switch (e.type) {
    case "Button": {
      let s = {
        type: "Button",
        props: e.props,
        press,
      };
      let p =
        e.hover === undefined
          ? s
          : {
              ...s,
              hover: e.hover,
            };
      return e.children === undefined
        ? p
        : {
            ...p,
            children: e.children,
          };
    }
    case "Input":
      return {
        type: "Input",
        props: e.props,
        press,
      };
    case "Select":
      return {
        type: "Select",
        props: e.props,
        press,
      };
    case "Markdown":
      return {
        type: "Markdown",
        props: e.props,
        press,
      };
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
  if (typeof e === "object" && e !== null && e.type === "engine")
    return {
      type: "engine",
      ref: e.ref,
    };
  if (typeof e === "object" && !isHoverScopeElement(e) && !isKeyedMarkdown(e) && "part" in e)
    return validateElement(withoutPart(e), o);
  if (isStringOrEngineType(e)) return e;
  if (e.type === "Client") return checkReturnedClient(e, o);
  if (e.type === "Raster") return stampRasterMedia(e, o);
  if (e.type === "Image") return stampImageMedia(e, o);
  if (isKeyedMarkdown(e)) {
    let h = pluginOfElement("part" in e ? e.part : undefined);
    let v = typeof h === "string" && o.seen.has(markdownKeyOf(e.props.key, h));
    return withPartOwner(e, v ? h : o.plugin);
  }
  if (!withModifiers_2(e)) {
    let h = isHoverScopeElement(e) ? stampPart(stampHoverGroup(e, o), o) : e;
    return mapChildren(h, (v) => validateElement(v, o));
  }
  let { press, onPress, onEvent } = e;
  let p = e.type === "Button";
  let f = p ? onPress : onEvent;
  let a = p ? mapChildren(e, (h) => validateElement(h, o)) : e;
  if (typeof press !== "object" || press === null) return a;
  let { handle, plugin } = press;
  if (typeof handle !== "number") return a;
  if (plugin === "") {
    if (typeof f !== "function") throw new HooksError(`${o.plugin}: ${ELEMENT_HANDLER_ERRORS[a.type]}`);
    o.take(handle, f);
    return toPressElement(a, o.plugin, handle);
  }
  if (typeof plugin !== "string" || !o.seen.has(withModifiers(plugin, handle)))
    throw new HooksError(
      `${o.plugin}: returned ${PRESSABLE_LABELS[a.type]} it did not draw (${String(plugin)}#${handle}); a render hook may keep the ones next(e) returned, not address another plugin's`,
    );
  let { hover } = a;
  let x = elementScope(hover);
  if (x !== undefined && plugin !== o.plugin)
    takeHoverGroup(
      o,
      {
        plugin,
        scope: x,
      },
      a.type,
    );
  return a;
}
//@ chunk-4121qate.js:184565-184654 placement
/**
 * 校验并标记元素
 */
function validateAndStampElement({ tree, ...o }) {
  let r = validateElement(tree, o);
  return isHoverScopeElement(r) && r.part === undefined ? withPartOwner(r, o.plugin) : r;
}
export {
  UI_ELEMENT_TYPES,
  elementBuildersFor,
  checkElementProps,
  checkElementList,
  isPlainElement,
  validateAndStampElement,
  collectClientElements,
  clientKeyOf,
  collectRasterElements,
  rasterKeyOf,
  collectImageElements,
  imageKeyOf,
  collectMarkdownParts,
  collectHoverScopes,
  hoverScopeKey,
  collectTextParts,
  newCollectorState,
  ALL_ELEMENT_TYPES,
  checkElementTable,
  pluginOfElement,
  isElementType_2,
  buildElementTable,
  isHoverableType,
  elementScope,
  treeContentHash,
  mapPressHandles,
};
