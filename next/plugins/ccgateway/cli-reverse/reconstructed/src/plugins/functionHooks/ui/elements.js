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
import { KEY_SEPARATOR } from "./raster.js";
import { computeContentHash } from "../../../utils/commitAttribution.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { isUntrustedObject } from "../../../utils/untrustedValues.js";
import { HooksError } from "../hooksErrors.js";
import { withModifiers } from "../hostBridge.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

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
var ALL_ELEMENT_TYPES; // deferred: uses UI_ELEMENT_TYPES of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:69747", () => {
  ALL_ELEMENT_TYPES = uniq(Object.values(UI_ELEMENT_TYPES).flat());
});
//@ chunk-4121qate.js:69783-69810 placement
/**
 * 构建占位元素
 */
var buildStaticElement = (definition) => deepFreezeInPlace(buildVmElement(vmFragment, definition));
//@ chunk-4121qate.js:69810-69957 placement
/**
 * 构建元素构造器表：包装已有构造器，缺失的元素类型以占位片段补齐并回调告警。
 */
function buildElementTable(overrides, wrap, onFallback) {
  let table = {};
  for (let [key, value] of Object.entries(overrides))
    if (typeof value === "function") table[key] = wrap(value);
  for (let typeName of ALL_ELEMENT_TYPES)
    if (!table[typeName]) {
      onFallback(typeName);
      table[typeName] = wrap(buildStaticElement);
    }
  return table;
}
//@ chunk-4121qate.js:69957-70054 placement
/**
 * 某类型元素的构造器表
 */
function elementBuildersFor(surface) {
  let builders = Object.create(null);
  for (let typeName of UI_ELEMENT_TYPES[surface]) builders[typeName] = namedVmElementBuilder(typeName);
  return Object.freeze(builders);
}
//@ chunk-4121qate.js:70054-70243 placement
/**
 * 校验元素构造器表：每项都必须是函数。
 */
function checkElementTable(table) {
  if (!isPlainObject(table)) return "something that is not a table of elements";
  for (let [key, value] of Object.entries(table))
    if (typeof value !== "function") return `an entry "${key}" that is not a constructor`;
  return;
}
//@ chunk-4121qate.js:70243-70291 placement
/**
 * 是否已知元素类型
 */
var isElementType_2 = (typeName) => typeof typeName === "string" && ALL_ELEMENT_TYPES.includes(typeName);
//@ chunk-4121qate.js:175433-175469 placement
/**
 * engine 或 Svg
 */
var isEngineOrSvg = (typeName) => typeName === "engine" || typeName === "Svg";
//@ chunk-4121qate.js:175469-175537 placement
/**
 * Button/Input/Select/Markdown
 */
var isPressableType = (typeName) =>
  typeName === "Button" || typeName === "Input" || typeName === "Select" || typeName === "Markdown";
//@ chunk-4121qate.js:175537-175619 placement
/**
 * 可承载子元素
 */
var hasChildrenContainer = (typeName) =>
  typeName === "Button" ||
  (!isEngineOrSvg(typeName) &&
    typeName !== "Client" &&
    typeName !== "Raster" &&
    typeName !== "Image" &&
    !isPressableType(typeName));
//@ chunk-4121qate.js:175619-175706 placement
/**
 * 取子元素
 */
function childElements(element, mapChild) {
  let { children } = element;
  return Array.isArray(children) && hasChildrenContainer(element.type) ? children.flatMap(mapChild) : [];
}
//@ chunk-4121qate.js:175706-175877 placement
function optionValues(options) {
  if (!Array.isArray(options)) return;
  let mapped = options.map((option) =>
    typeof option === "object" && option !== null && "value" in option ? option.value : undefined,
  );
  return mapped.every((value) => typeof value === "string") ? mapped : undefined;
}
//@ chunk-4121qate.js:175877-176390 placement
function checkElementProps(element) {
  if (typeof element !== "object" || !element || Array.isArray(element)) return [];
  let node = element;
  let typeName = node.type;
  let fromChildren = childElements(node, checkElementProps);
  if (!isPressableType(typeName)) return fromChildren;
  let { press, props } = node;
  if (!(typeof press === "object" && press !== null)) return fromChildren;
  let { plugin, handle } = press;
  let key = props?.key;
  if (!(typeof plugin === "string" && typeof handle === "number" && typeof key === "string"))
    return fromChildren;
  let pressableLinks = props?.pressableLinks;
  let hasPressableLinks =
    Array.isArray(pressableLinks) &&
    pressableLinks.every((pressableLink) => typeof pressableLink === "string");
  let selectValues = typeName === "Select" ? optionValues(props?.options) : undefined;
  return [
    {
      tag: typeName,
      plugin,
      handle,
      element: key,
      ...(hasPressableLinks && {
        pressableLinks,
      }),
      ...(selectValues !== undefined && {
        options: selectValues,
      }),
    },
    ...fromChildren,
  ];
}
//@ chunk-4121qate.js:176390-176448 placement
/**
 * client 元素键
 */
var clientKeyOf = (client) => ["client", client.plugin, client.key, client.module].join(KEY_SEPARATOR);
//@ chunk-4121qate.js:176448-176481 placement
/**
 * 元素的 plugin
 */
var pluginOfElement = (element) => (isPlainObject(element) ? element.plugin : undefined);
//@ chunk-4121qate.js:176481-176742 placement
/**
 * 在渲染树中收集 Client 元素（插件、模块、key）。
 */
function collectClientElements(element) {
  if (!isPlainObject(element)) return [];
  let node = element;
  if (node.type !== "Client") return childElements(node, collectClientElements);
  let { props } = node;
  let plugin = pluginOfElement(node.client);
  let key = isPlainObject(props) ? props.key : undefined;
  let moduleName = isPlainObject(props) ? props.module : undefined;
  return typeof plugin === "string" &&
    plugin !== "" &&
    typeof key === "string" &&
    typeof moduleName === "string"
    ? [
        {
          plugin,
          module: moduleName,
          key,
        },
      ]
    : [];
}
//@ chunk-4121qate.js:176742-176883 placement
function containsEngineNode(node) {
  if (typeof node === "string") return false;
  let children = "children" in node ? node.children : undefined;
  return node.type === "engine" || (Array.isArray(children) && children.some(containsEngineNode));
}
//@ chunk-4121qate.js:176883-176927 placement
/**
 * 字符串或 engine 类型
 */
var isStringOrEngineType = (element) => typeof element === "string" || isEngineOrSvg(element.type);
//@ chunk-4121qate.js:176927-176977 placement = withModifiers (0.799)
var withModifiers_2 = (element) =>
  isPressableType(element.type) && "press" in element && isPlainObject(element.press);
//@ chunk-4121qate.js:176977-177256 placement
function restampPress(element, handle) {
  let press = {
    plugin: element.press.plugin,
    handle,
  };
  switch (element.type) {
    case "Button":
      return {
        ...element,
        press,
      };
    case "Input":
      return {
        type: "Input",
        props: element.props,
        press,
      };
    case "Select":
      return {
        type: "Select",
        props: element.props,
        press,
      };
    case "Markdown":
      return {
        type: "Markdown",
        props: element.props,
        press,
      };
  }
}
//@ chunk-4121qate.js:177256-177367 placement = setAttribute (0.839)
function mapChildren(element, mapChild) {
  let node = element;
  let children = "children" in node ? node.children : undefined;
  return Array.isArray(children)
    ? {
        ...element,
        children: children.map(mapChild),
      }
    : element;
}
//@ chunk-4121qate.js:177367-177505 placement
function mapPressHandles_2(element, restamp) {
  if (isStringOrEngineType(element)) return element;
  if (withModifiers_2(element)) {
    let handle = restamp(element.press.plugin, element.press.handle);
    return handle === undefined ? element : restampPress(element, handle);
  }
  return mapChildren(element, (child) => mapPressHandles_2(child, restamp));
}
//@ chunk-4121qate.js:177505-177550 placement
/**
 * 渲染树内容哈希
 */
var treeContentHash = (element) =>
  containsEngineNode(element)
    ? undefined
    : computeContentHash(jsonStringify(mapPressHandles_2(element, () => 0)));
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
var hoverScopeKey = (entry) => `${entry.plugin}\x00scope\x00${entry.scope}`;
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
function collectHoverScopes(element) {
  let node = isPlainObject(element) ? element : {};
  let { hover, press, group } = node;
  let scope = elementScope(hover);
  let typeName = node.type;
  let pressable = isPlainObject(press) && typeof press.handle === "number" ? press : undefined;
  let holder = isPressableType(typeName) ? pressable : isHoverableType(typeName) ? group : undefined;
  let plugin = pluginOfElement(holder);
  return [
    ...(scope !== undefined && typeof plugin === "string" && plugin !== ""
      ? [
          {
            plugin,
            scope,
          },
        ]
      : []),
    ...childElements(node, collectHoverScopes),
  ];
}
//@ chunk-4121qate.js:178035-178087 placement = _temp (1)
/**
 * image 元素键
 */
var imageKeyOf = (c) => ["image", c.plugin, c.key ?? ""].join(KEY_SEPARATOR);
//@ chunk-4121qate.js:178087-178345 placement
function describeForeignMedia(key, ownerPlugin, kind) {
  let isRaster = kind === "Raster";
  let noun = isRaster ? "a Raster" : "an Image";
  let editableField = isRaster ? "cells" : "source";
  return `returned ${noun} it did not draw (${String(ownerPlugin)}/${String(key)}); a render hook may keep the ones next(e) returned and change their ${editableField}, not which plugin or key they name`;
}
//@ chunk-4121qate.js:178345-178385 placement
/**
 * 标记图片所属插件
 */
var withImageOwner = (element, plugin) => ({
  ...element,
  image: {
    plugin,
  },
});
//@ chunk-4121qate.js:178385-178572 placement
var IMAGE_STAMP_RULES = {
  stampOf: (element) => element.image,
  restamp: withImageOwner,
  seenKeyOf: (element, plugin) => {
    let key = element.props.key;
    return key === undefined || typeof key === "string"
      ? imageKeyOf({
          plugin,
          key,
        })
      : undefined;
  },
  refusal: (element, ownerPlugin) => describeForeignMedia(element.props.key, ownerPlugin, "Image"),
};
//@ chunk-4121qate.js:178572-178784 placement
/**
 * 收集渲染树中的 Image 元素（图片与 key）。
 */
function collectImageElements(element) {
  if (!isPlainObject(element)) return [];
  let node = element;
  if (node.type !== "Image") return childElements(node, collectImageElements);
  let { props } = node;
  let plugin = pluginOfElement(node.image);
  let key = isPlainObject(props) ? props.key : undefined;
  return typeof plugin === "string" && plugin !== ""
    ? [
        {
          plugin,
          key: typeof key === "string" ? key : undefined,
        },
      ]
    : [];
}
//@ chunk-4121qate.js:178784-178835 placement
/**
 * onPress/onEvent
 */
function isPressHandlerProp(propName) {
  return propName === "onPress" || propName === "onEvent";
}
//@ chunk-4121qate.js:178835-178880 placement
/**
 * 纯数据且带 type
 */
var isPlainElement = (value) => isPlainDataObject(value) && typeof value.type === "string";
//@ chunk-4121qate.js:178880-178963 placement
/**
 * 带 key 的 Markdown
 */
var isKeyedMarkdown = (element) =>
  element.type === "Markdown" &&
  !withModifiers_2(element) &&
  isPlainObject(element.props) &&
  typeof element.props.key === "string";
//@ chunk-4121qate.js:178963-178987 placement
/**
 * 悬停作用域元素
 */
var isHoverScopeElement = (element) => isHoverableType(element.type);
//@ chunk-4121qate.js:178987-179084 placement
/**
 * 自有属性的值
 */
function ownValueOf(target, key) {
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(target, key);
  return ownPropertyDescriptor && "value" in ownPropertyDescriptor ? ownPropertyDescriptor.value : undefined;
}
//@ chunk-4121qate.js:179084-179123 placement
/**
 * 设置并返回
 */
function setAndReturn(weakMap, target, value) {
  weakMap.set(target, value);
  return value;
}
//@ chunk-4121qate.js:179123-180041 placement
function checkElementList(result, caller) {
  let weakMap = new WeakMap();
  function copyContainer(source) {
    if (Array.isArray(source)) {
      let length = ownValueOf(source, "length");
      let count = typeof length === "number" ? length : 0;
      let copy = setAndReturn(weakMap, source, []);
      for (let index = 0; index < count; index += 1)
        copy[index] = copyElementValue(ownValueOf(source, String(index)));
      return copy;
    }
    let objectCopy = setAndReturn(weakMap, source, {});
    for (let key of Object.keys(source))
      if (key !== "__proto__") objectCopy[key] = copyValue(key, ownValueOf(source, key));
    return objectCopy;
  }
  function copyValue(key, value) {
    return !isUntrustedObject(value) && typeof value === "function" && isPressHandlerProp(key)
      ? value
      : copyElementValue(value);
  }
  function copyElementValue(value) {
    if (isUntrustedObject(value))
      throw new HooksError(
        `${caller}: returned a drawing that holds a Proxy or a vm context; an element, its props and its hover are plain objects and arrays`,
      );
    let isPlainValue = Array.isArray(value) || isPlainDataObject(value);
    if (typeof value === "function")
      throw new HooksError(
        `${caller}: returned a drawing with a function where plain data goes; a closure rides only in an element's onPress or onEvent`,
      );
    if (!isPlainValue && isPlainObject(value))
      throw new HooksError(
        `${caller}: returned a drawing that holds an object that is not plain data (a class instance); an element, its props and its hover are plain objects and arrays`,
      );
    return isPlainValue ? (weakMap.get(value) ?? copyContainer(value)) : value;
  }
  return copyElementValue(result);
}
//@ chunk-4121qate.js:180041-180090 placement
/**
 * markdown 片段键
 */
var markdownKeyOf = (key, plugin) => ["markdown", plugin, String(key)].join(KEY_SEPARATOR);
//@ chunk-4121qate.js:180090-180272 placement
/**
 * 收集渲染树中的 Markdown 片段（片段与 key）。
 */
function collectMarkdownParts(element) {
  let node = isPlainObject(element) ? element : {};
  if (node.type !== "Markdown") return childElements(node, collectMarkdownParts);
  let plugin = pluginOfElement(node.part);
  let key = isPlainObject(node.props) ? node.props.key : undefined;
  return typeof plugin === "string" && typeof key === "string" ? [markdownKeyOf(key, plugin)] : [];
}
//@ chunk-4121qate.js:180272-180389 placement
/**
 * 收集渲染树中文本类元素的片段文本。
 */
function collectTextParts(element) {
  let node = isPlainObject(element) ? element : {};
  let plugin = pluginOfElement(node.part);
  return [
    ...(isHoverableType(node.type) && typeof plugin === "string" && plugin !== "" ? [plugin] : []),
    ...childElements(node, collectTextParts),
  ];
}
//@ chunk-4121qate.js:180428-180477 placement
/**
 * raster 元素键
 */
var rasterKeyOf = (entry) => ["raster", entry.plugin, entry.key].join(KEY_SEPARATOR);
//@ chunk-4121qate.js:180477-180518 placement
/**
 * 标记 raster 所属插件
 */
var withRasterOwner = (element, plugin) => ({
  ...element,
  raster: {
    plugin,
  },
});
//@ chunk-4121qate.js:180518-180695 placement
var RASTER_STAMP_RULES = {
  stampOf: (element) => element.raster,
  restamp: withRasterOwner,
  seenKeyOf: (element, plugin) => {
    let key = element.props.key;
    return typeof key === "string"
      ? rasterKeyOf({
          plugin,
          key,
        })
      : undefined;
  },
  refusal: (element, ownerPlugin) => describeForeignMedia(element.props.key, ownerPlugin, "Raster"),
};
//@ chunk-4121qate.js:180695-180903 placement
/**
 * 收集渲染树中的 Raster 元素（栅格与 key）。
 */
function collectRasterElements(element) {
  if (!isPlainObject(element)) return [];
  let node = element;
  if (node.type !== "Raster") return childElements(node, collectRasterElements);
  let { props } = node;
  let plugin = pluginOfElement(node.raster);
  let key = isPlainObject(props) ? props.key : undefined;
  return typeof plugin === "string" && plugin !== "" && typeof key === "string"
    ? [
        {
          plugin,
          key,
        },
      ]
    : [];
}
//@ chunk-4121qate.js:180903-180926 placement
/**
 * 映射按键句柄
 */
var mapPressHandles = (element, restamp) => mapPressHandles_2(element, restamp);
//@ chunk-4121qate.js:180926-180967 placement
/**
 * 标记 client 所属插件
 */
var withClientOwner = (element, plugin) => ({
  ...element,
  client: {
    plugin,
  },
});
//@ chunk-4121qate.js:180967-181419 placement
function checkReturnedClient(element, context) {
  let plugin = pluginOfElement(element.client);
  let key = element.props.key;
  let moduleName = element.props.module;
  if (plugin === "" || plugin === undefined) return withClientOwner(element, context.plugin);
  if (!(
    typeof plugin === "string" &&
    typeof key === "string" &&
    typeof moduleName === "string" &&
    context.seen.has(
      clientKeyOf({
        plugin,
        key,
        module: moduleName,
      }),
    )
  ))
    throw new HooksError(
      `${context.plugin}: returned a Client it did not draw (${String(plugin)}/${String(key)} ${String(moduleName)}); a render hook may keep the ones next(e) returned and change their props, not which plugin, key or module they name`,
    );
  return element;
}
//@ chunk-4121qate.js:181419-181459 placement
/**
 * 标记分组所属插件
 */
var withGroupOwner = (element, plugin) => ({
  ...element,
  group: {
    plugin,
  },
});
//@ chunk-4121qate.js:181459-181745 placement
function takeHoverGroup(context, scopeEntry, type) {
  let scopeKey = hoverScopeKey(scopeEntry);
  let remaining = context.groups.get(scopeKey) ?? 0;
  if (remaining < 1)
    throw new HooksError(
      `${context.plugin}: returned a ${type} in another plugin's hover scope that next(e) did not hand it; a render hook may keep the ones next(e) returned and restyle them, not join another plugin's group`,
    );
  context.groups.set(scopeKey, remaining - 1);
}
//@ chunk-4121qate.js:181745-181929 placement
function stampHoverGroup(element, context) {
  let scope = elementScope(element.hover);
  if (scope === undefined) return element;
  let plugin = pluginOfElement(element.group);
  if (plugin === "" || plugin === undefined || plugin === context.plugin)
    return withGroupOwner(element, context.plugin);
  takeHoverGroup(
    context,
    {
      plugin: String(plugin),
      scope,
    },
    element.type,
  );
  return element;
}
//@ chunk-4121qate.js:181929-182160 placement
function stampMedia(element, context, rules) {
  let plugin = pluginOfElement(rules.stampOf(element));
  if (plugin === "" || plugin === undefined) return rules.restamp(element, context.plugin);
  let seenKey = typeof plugin === "string" ? rules.seenKeyOf(element, plugin) : undefined;
  if (!(seenKey !== undefined && context.seen.has(seenKey)))
    throw new HooksError(`${context.plugin}: ${rules.refusal(element, plugin)}`);
  return element;
}
//@ chunk-4121qate.js:182160-182185 placement
/**
 * 标记图片媒体
 */
var stampImageMedia = (element, context) => stampMedia(element, context, IMAGE_STAMP_RULES);
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
var withPartOwner = (element, plugin) => ({
  ...element,
  part: {
    plugin,
  },
});
//@ chunk-4121qate.js:182308-182351 placement
/**
 * 去掉 part
 */
function withoutPart(element) {
  let { part, ...rest } = element;
  return rest;
}
//@ chunk-4121qate.js:182351-182578 placement
function stampPart(element, context) {
  if (!("part" in element)) return element;
  let plugin = pluginOfElement(element.part);
  if (plugin === context.plugin) return withPartOwner(element, context.plugin);
  let remaining = typeof plugin === "string" ? (context.parts.get(plugin) ?? 0) : 0;
  if (typeof plugin !== "string" || plugin === "" || remaining < 1) return withoutPart(element);
  context.parts.set(plugin, remaining - 1);
  return withPartOwner(element, plugin);
}
//@ chunk-4121qate.js:182578-182603 placement
/**
 * 标记 raster 媒体
 */
var stampRasterMedia = (element, context) => stampMedia(element, context, RASTER_STAMP_RULES);
//@ chunk-4121qate.js:182603-182993 placement
/**
 * 把可按元素（Button/Input/Select/Markdown）转为带按键句柄的形状。
 */
function toPressElement(element, plugin, handle) {
  let press = {
    plugin,
    handle,
  };
  switch (element.type) {
    case "Button": {
      let withPress = {
        type: "Button",
        props: element.props,
        press,
      };
      let withHover =
        element.hover === undefined
          ? withPress
          : {
              ...withPress,
              hover: element.hover,
            };
      return element.children === undefined
        ? withHover
        : {
            ...withHover,
            children: element.children,
          };
    }
    case "Input":
      return {
        type: "Input",
        props: element.props,
        press,
      };
    case "Select":
      return {
        type: "Select",
        props: element.props,
        press,
      };
    case "Markdown":
      return {
        type: "Markdown",
        props: element.props,
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
function validateElement(element, context) {
  if (typeof element === "object" && element !== null && element.type === "engine")
    return {
      type: "engine",
      ref: element.ref,
    };
  if (
    typeof element === "object" &&
    !isHoverScopeElement(element) &&
    !isKeyedMarkdown(element) &&
    "part" in element
  )
    return validateElement(withoutPart(element), context);
  if (isStringOrEngineType(element)) return element;
  if (element.type === "Client") return checkReturnedClient(element, context);
  if (element.type === "Raster") return stampRasterMedia(element, context);
  if (element.type === "Image") return stampImageMedia(element, context);
  if (isKeyedMarkdown(element)) {
    let partPlugin = pluginOfElement("part" in element ? element.part : undefined);
    let isKnown =
      typeof partPlugin === "string" && context.seen.has(markdownKeyOf(element.props.key, partPlugin));
    return withPartOwner(element, isKnown ? partPlugin : context.plugin);
  }
  if (!withModifiers_2(element)) {
    let stamped = isHoverScopeElement(element)
      ? stampPart(stampHoverGroup(element, context), context)
      : element;
    return mapChildren(stamped, (child) => validateElement(child, context));
  }
  let { press, onPress, onEvent } = element;
  let isButton = element.type === "Button";
  let handler = isButton ? onPress : onEvent;
  let withChildren = isButton ? mapChildren(element, (child) => validateElement(child, context)) : element;
  if (typeof press !== "object" || press === null) return withChildren;
  let { handle, plugin } = press;
  if (typeof handle !== "number") return withChildren;
  if (plugin === "") {
    if (typeof handler !== "function")
      throw new HooksError(`${context.plugin}: ${ELEMENT_HANDLER_ERRORS[withChildren.type]}`);
    context.take(handle, handler);
    return toPressElement(withChildren, context.plugin, handle);
  }
  if (typeof plugin !== "string" || !context.seen.has(withModifiers(plugin, handle)))
    throw new HooksError(
      `${context.plugin}: returned ${PRESSABLE_LABELS[withChildren.type]} it did not draw (${String(plugin)}#${handle}); a render hook may keep the ones next(e) returned, not address another plugin's`,
    );
  let { hover } = withChildren;
  let scope = elementScope(hover);
  if (scope !== undefined && plugin !== context.plugin)
    takeHoverGroup(
      context,
      {
        plugin,
        scope,
      },
      withChildren.type,
    );
  return withChildren;
}
//@ chunk-4121qate.js:184565-184654 placement
/**
 * 校验并标记元素
 */
function validateAndStampElement({ tree, ...context }) {
  let validated = validateElement(tree, context);
  return isHoverScopeElement(validated) && validated.part === undefined
    ? withPartOwner(validated, context.plugin)
    : validated;
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
