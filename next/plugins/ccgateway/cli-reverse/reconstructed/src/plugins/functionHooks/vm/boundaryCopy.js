/**
 * plugins/functionHooks/vm/boundaryCopy.ts
 *
 * 工作流/钩子 VM 边界值复制（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hmaqgh0x.js (10), chunk-j8f885h1.js (6)
 * attribution: placement 16
 */
import "vm";
import * as vmModule_2 from "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import { describeThrownValue, createSealedError, vmImportOptions } from "./vmRealm.js";
import {
  CLONE_DEPTH_THRESHOLD,
  STACK_OVERFLOW_MESSAGES,
  STACK_EXHAUSTED_MESSAGE,
  MAX_STACK_NESTING_DEPTH,
  MAX_NESTING_DEPTH,
  STACK_NESTING_TOO_DEEP_MESSAGE,
  NESTING_TOO_DEEP_MESSAGE,
} from "../../../utils/structuredCloneLimits.js";
import { memoizeAlias } from "../../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import {
  withUseStrict,
  VM_BOOTSTRAP_SOURCE,
  requireElement,
  functionNameMarks,
} from "./vmBootstrapSource.js";
import { SubAgentContext } from "../../../components/CtrlOToExpand.js";
import { deepFreezeInPlace } from "../../../utils/hooks/functionHookMatchers.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-hmaqgh0x.js:13157-13318 placement
/**
 * 包装宿主异步函数供 VM 调用：抛出的错误转换为可跨边界的错误，函数原型设为 null。
 */
function wrapHostFnForVm(fn) {
  let wrapped = async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      let { msg, name: errorName, stack } = describeThrownValue(error);
      throw createSealedError(msg, errorName, stack);
    }
  };
  Object.setPrototypeOf(wrapped, null);
  return wrapped;
}
//@ chunk-hmaqgh0x.js:13318-13701 placement
/**
 * 跨 VM 边界读取数组长度（读取失败、非安全整数或超上限时抛错）。
 */
function readBoundaryArrayLength(array) {
  let length;
  try {
    length = array.length;
  } catch (error) {
    hostSideCopier().lost(error);
    throw Error("unable to read array length across the workflow VM boundary");
  }
  if (typeof length !== "number" || !Number.isSafeInteger(length))
    throw Error("array length is not a safe integer across the workflow VM boundary");
  if (length > CLONE_DEPTH_THRESHOLD)
    throw Error(
      `array length ${length} exceeds the maximum of ${CLONE_DEPTH_THRESHOLD} supported across the workflow VM boundary`,
    );
  return length;
}
//@ chunk-hmaqgh0x.js:13701-13736 placement
/**
 * 宿主侧复制
 */
function hostCopy(value) {
  return hostSideCopier().copy(value);
}
//@ chunk-hmaqgh0x.js:13736-13976 placement
var hostSideCopier; // deferred: uses copyAcrossVmBoundary of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hmaqgh0x.js:13736", () => {
  hostSideCopier = memoizeAlias(() =>
    vmModule_2.runInThisContext(
      `(() => {
        'use strict';
        ${copyAcrossVmBoundary({
          arrayLengthCap: CLONE_DEPTH_THRESHOLD,
          isLeaving: true,
          isListSeenFirst: true,
          protoKey: "left-out",
        })}
        return { __proto__: null, copy, lost }
      })()`,
      {
        filename: "primitivizeDeep",
      },
    ),
  );
});
//@ chunk-hmaqgh0x.js:13976-14126 placement
/**
 * 跨工作流 VM 边界复制数组元素（读取失败的元素为 undefined，长度受上限检查）。
 */
function snapshotArrayAcrossVm(array) {
  if (array === null || typeof array !== "object") return [];
  let boundaryArrayLength = readBoundaryArrayLength(array);
  let copy = [];
  for (let i = 0; i < boundaryArrayLength; i++)
    try {
      copy[i] = array[i];
    } catch (error) {
      hostSideCopier().lost(error);
      copy[i] = undefined;
    }
  return copy;
}
//@ chunk-hmaqgh0x.js:14126-14501 placement
function VM_STRING_BRIDGE_SOURCE(context) {
  return vmModule_2.runInContext(
    `((S, JS) => ({
      vmToStr: v => { try { return S(v) } catch { return '<unprintable>' } },
      vmStringify: v => JS(v),
      vmOwnString: (o, k) => {
        try { const v = o == null ? undefined : o[k]; return typeof v === 'string' ? v : undefined }
        catch { return undefined }
      },
    }))(String, JSON.stringify)`,
    context,
  );
}
//@ chunk-hmaqgh0x.js:14501-15205 placement
/**
 * 在目标 VM 上下文中创建复制工具：sanitize 深复制、snapshot 复制数组、getProp 安全读属性。
 */
function createVmSideCopier(context, options) {
  return vmModule_2.runInContext(
    `(() => {
      'use strict';
      ${copyAcrossVmBoundary({
        arrayLengthCap: CLONE_DEPTH_THRESHOLD,
        isLeaving: true,
        isListSeenFirst: true,
        protoKey: "left-out",
      })}
      return { __proto__: null,
        sanitize: copy,
        snapshot: (v) => {
          if (v === null || typeof v !== 'object') return []
          const len = checkedLength(v)
          const out = []
          for (let i = 0; i < len; i++) {
            try { out[i] = v[i] } catch (e) { lost(e); out[i] = undefined }
          }
          return out
        },
        getProp: (o, k) => {
          try { return o === null || o === undefined ? undefined : o[k] } catch (e) { lost(e); return undefined }
        },
      }
    })()`,
    context,
    vmImportOptions(options),
  );
}
//@ chunk-hmaqgh0x.js:15205-15379 placement
/**
 * 把跨边界值描述为字符串：字符串原样，原始值转字符串，函数/对象给占位文本。
 */
function describeBoundaryValue(value) {
  if (typeof value === "string") return value;
  if (value === null || (typeof value !== "object" && typeof value !== "function")) return String(value);
  return typeof value === "function" ? "[function]" : "[object]";
}
//@ chunk-hmaqgh0x.js:15379-15994 placement
/**
 * 注入 VM 的源码片段：用 _WeakSet 标记捕获到的错误（capErr/isCap），以及用 message 匹配栈溢出结尾的 isStackEnd；这些片段在插件代码里展开执行，错误因此能跨 VM 边界被识别。
 */
var CAPPED_ERROR_SOURCE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var STACK_END_SOURCE;
deferInit("chunk-hmaqgh0x.js:15379", () => {
  CAPPED_ERROR_SOURCE = `
      const _capSet = new _WeakSet()
      function capErr(msg) {
        const e = new _Error(msg)
        _capSet.add(e)
        return e
      }
      function isCap(e) {
        try { return _capSet.has(e) } catch { return false }
      }`;
  STACK_END_SOURCE = `
      function isStackEnd(e) {
        if (_isError === null || !_isError(e)) return false
        const said = _ownDescriptor(e, 'message')
        return said !== undefined && (said.value === '${STACK_OVERFLOW_MESSAGES[0]}' || said.value === '${STACK_OVERFLOW_MESSAGES[1]}')
      }
      function lost(e) {
        if (isCap(e)) throw e
        if (isStackEnd(e)) throw capErr('${STACK_EXHAUSTED_MESSAGE}')
      }`;
});
//@ chunk-hmaqgh0x.js:15994-19839 placement
/**
 * 在工作流 VM 边界两侧复制值（数组长度、循环引用、深度上限）
 */
function copyAcrossVmBoundary({ arrayLengthCap, isLeaving, isListSeenFirst, protoKey }) {
  let capCheck =
    arrayLengthCap === undefined
      ? ""
      : `if (len > ${arrayLengthCap}) {
          throw capErr('array length ' + len + ' exceeds the maximum of ${arrayLengthCap} supported across the workflow VM boundary')
        }`;
  let arraySeenFirst = "const out = []; seen.set(v, out)";
  return `
      const _WeakMap = WeakMap, _WeakSet = WeakSet, _isArray = Array.isArray,
            _keys = Object.keys, _defineProperty = Object.defineProperty,
            _Error = Error, _isSafeInteger = Number.isSafeInteger,
            _isError = typeof Error.isError === 'function' ? Error.isError : null,
            _ownDescriptor = Object.getOwnPropertyDescriptor
      ${CAPPED_ERROR_SOURCE}
      ${STACK_END_SOURCE}
      function checkedLength(v) {
        let len
        try { len = v.length } catch (e) {
          lost(e)
          throw new _Error('unable to read array length across the workflow VM boundary')
        }
        if (typeof len !== 'number' || !_isSafeInteger(len)) {
          throw capErr('array length is not a safe integer across the workflow VM boundary')
        }
        ${capCheck}
        return len
      }
      const copy = (rootVal) => {
        if (typeof rootVal === 'function') return undefined
        if (rootVal === null || typeof rootVal !== 'object') return rootVal
        const seen = new _WeakMap()
        let childKeys = null, childLength = 0
        function make(v, depth) {
          if (depth > ${isLeaving ? MAX_STACK_NESTING_DEPTH : MAX_NESTING_DEPTH}) {
            throw capErr('${isLeaving ? STACK_NESTING_TOO_DEEP_MESSAGE : NESTING_TOO_DEEP_MESSAGE}')
          }
          if (_isArray(v)) {
            ${isListSeenFirst ? "const out = []; seen.set(v, out)" : ""}
            const len = checkedLength(v)
            ${isListSeenFirst ? "" : "const out = []; seen.set(v, out)"}
            childKeys = null; childLength = len
            return out
          }
          const out = {}; seen.set(v, out)
          childLength = 0
          let ks; try { ks = _keys(v) } catch (e) { lost(e); return out }
          childKeys = ks; childLength = ks.length
          return out
        }
        const root = make(rootVal, 1)
        let src = rootVal, out = root, keys = childKeys, len = childLength, i = 0, depth = 1
        let own = null, below = null
        for (;;) {
          if (i >= len) {
            if (below === null) return root
            own = below; below = own.below
            src = own.src; out = own.out; keys = own.keys; len = own.len; i = own.i; depth = own.depth
            continue
          }
          const at = i++
          let down = null, made
          if (keys === null) {
            try {
              const vi = src[at]
              if (vi === null || typeof vi !== 'object') { out[at] = typeof vi === 'function' ? undefined : vi; continue }
              const hit = seen.get(vi)
              if (hit !== undefined) { out[at] = hit; continue }
              made = out[at] = make(vi, depth + 1)
              down = vi
            } catch (e) { lost(e); out[at] = undefined; continue }
          } else {
            const k = keys[at]
            ${protoKey === "carried" ? "" : "if (k === '__proto__') continue"}
            try {
              const vk = src[k]
              if (typeof vk === 'function') continue
              made = vk
              if (vk !== null && typeof vk === 'object') {
                const hit = seen.get(vk)
                if (hit !== undefined) made = hit
                else { made = make(vk, depth + 1); down = vk }
              }
              _defineProperty(out, k, { value: made, writable: true, enumerable: true, configurable: true })
            } catch (e) { lost(e); continue }
          }
          if (down === null || childLength === 0) continue
          if (own === null) own = { src, out, keys, len, i, depth, below }
          else own.i = i
          below = own; own = null
          src = down; out = made; keys = childKeys; len = childLength; i = 0; depth = depth + 1
        }
      }`;
}
//@ chunk-j8f885h1.js:49663-49670 placement
/**
 * 缓存的 VM 上下文
 */
var cachedVmContext;
//@ chunk-j8f885h1.js:49670-49731 placement
/**
 * 取（懒创建）VM 上下文
 */
function vmContext() {
  cachedVmContext ??= vmModule_2.runInContext(withUseStrict(VM_BOOTSTRAP_SOURCE), SubAgentContext({}));
  return cachedVmContext;
}
//@ chunk-j8f885h1.js:49731-49761 placement
/**
 * VM 中的 Fragment
 */
var vmFragment = (props) => vmContext().Fragment(props);
//@ chunk-j8f885h1.js:49761-49798 placement
/**
 * VM 中的元素构造
 */
var vmCreateElement = (type, props, ...children) => vmContext().h(type, props, ...children);
//@ chunk-j8f885h1.js:49798-49906 placement
/**
 * 在 VM 中构建元素（children 规整为数组）。
 */
function buildVmElement(type, props) {
  let { children, ...rest } = props ?? {};
  let childList = children === undefined ? [] : Array.isArray(children) ? children : [children];
  return requireElement(vmCreateElement(type, rest, ...childList));
}
//@ chunk-j8f885h1.js:49906-49948 placement
/**
 * 带名字的 VM 元素构造器
 */
var namedVmElementBuilder = (typeName) =>
  functionNameMarks.mark((props) => deepFreezeInPlace(buildVmElement(typeName, props)), typeName);
export {
  vmCreateElement,
  vmFragment,
  copyAcrossVmBoundary,
  buildVmElement,
  namedVmElementBuilder,
  describeBoundaryValue,
  createVmSideCopier,
  VM_STRING_BRIDGE_SOURCE,
  wrapHostFnForVm,
  hostCopy,
  snapshotArrayAcrossVm,
};
