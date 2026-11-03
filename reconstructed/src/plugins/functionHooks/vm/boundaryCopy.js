/**
 * plugins/functionHooks/vm/boundaryCopy.ts
 *
 * 工作流/钩子 VM 边界值复制（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (16)
 * attribution: placement 16
 */
import * as vmModule from "vm";
import * as vmModule_2 from "vm";
import * as vmModule_3 from "vm";
import * as vmModule_4 from "vm";
import * as vmModule_5 from "vm";
import * as vmModule_6 from "vm";
import * as vmModule_7 from "vm";
import * as vmModule_8 from "vm";
import * as vmModule_9 from "vm";
import * as vmModule_10 from "vm";
import * as vmModule_11 from "vm";
import * as vmModule_12 from "vm";
import * as vmModule_13 from "vm";
import * as vmModule_14 from "vm";
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
import { io } from "../../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { BT, VM_BOOTSTRAP_SOURCE, requireElement, dfr } from "./vmBootstrapSource.js";
import { SubAgentContext } from "../../../components/CtrlOToExpand.js";
import { Q5e } from "../../../utils/hooks/functionHookMatchers.js";

/**
 * 包装宿主异步函数供 VM 调用：抛出的错误转换为可跨边界的错误，函数原型设为 null。
 */
//@ chunk-4121qate.js:62421-62582 placement
function wrapHostFnForVm(e) {
  let o = async (...r) => {
    try {
      return await e(...r);
    } catch (error) {
      let { msg: msg, name: i, stack: stack } = describeThrownValue(error);
      throw createSealedError(msg, i, stack);
    }
  };
  return (Object.setPrototypeOf(o, null), o);
}
/**
 * 跨 VM 边界读取数组长度（读取失败、非安全整数或超上限时抛错）。
 */
//@ chunk-4121qate.js:62582-62967 placement
function readBoundaryArrayLength(e) {
  let o;
  try {
    o = e.length;
  } catch (error) {
    throw (
      hostSideCopier().lost(error),
      Error("unable to read array length across the workflow VM boundary")
    );
  }
  if (typeof o !== "number" || !Number.isSafeInteger(o))
    throw Error("array length is not a safe integer across the workflow VM boundary");
  if (o > CLONE_DEPTH_THRESHOLD)
    throw Error(
      `array length ${o} exceeds the maximum of ${CLONE_DEPTH_THRESHOLD} supported across the workflow VM boundary`,
    );
  return o;
}
//@ chunk-4121qate.js:62967-63003 placement
function LZr(e) {
  return hostSideCopier().copy(e);
}
//@ chunk-4121qate.js:63003-63246 placement
var hostSideCopier = io(() =>
  vmModule_2.runInThisContext(
    `(() => {
        'use strict';
        ${copyAcrossVmBoundary({ arrayLengthCap: CLONE_DEPTH_THRESHOLD, isLeaving: !0, isListSeenFirst: !0, protoKey: "left-out" })}
        return { __proto__: null, copy, lost }
      })()`,
    { filename: "primitivizeDeep" },
  ),
);
/**
 * 跨工作流 VM 边界复制数组元素（读取失败的元素为 undefined，长度受上限检查）。
 */
//@ chunk-4121qate.js:63246-63398 placement
function snapshotArrayAcrossVm(e) {
  if (e === null || typeof e !== "object") return [];
  let o = readBoundaryArrayLength(e),
    r = [];
  for (let n = 0; n < o; n++)
    try {
      r[n] = e[n];
    } catch (error) {
      (hostSideCopier().lost(error), (r[n] = void 0));
    }
  return r;
}
//@ chunk-4121qate.js:63398-63774 placement
function VM_STRING_BRIDGE_SOURCE(e) {
  return vmModule_2.runInContext(
    `((S, JS) => ({
      vmToStr: v => { try { return S(v) } catch { return '<unprintable>' } },
      vmStringify: v => JS(v),
      vmOwnString: (o, k) => {
        try { const v = o == null ? undefined : o[k]; return typeof v === 'string' ? v : undefined }
        catch { return undefined }
      },
    }))(String, JSON.stringify)`,
    e,
  );
}
/**
 * 在目标 VM 上下文中创建复制工具：sanitize 深复制、snapshot 复制数组、getProp 安全读属性。
 */
//@ chunk-4121qate.js:63774-64481 placement
function createVmSideCopier(e, o) {
  return vmModule_2.runInContext(
    `(() => {
      'use strict';
      ${copyAcrossVmBoundary({ arrayLengthCap: CLONE_DEPTH_THRESHOLD, isLeaving: !0, isListSeenFirst: !0, protoKey: "left-out" })}
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
    e,
    vmImportOptions(o),
  );
}
/**
 * 把跨边界值描述为字符串：字符串原样，原始值转字符串，函数/对象给占位文本。
 */
//@ chunk-4121qate.js:64481-64655 placement
function describeBoundaryValue(e) {
  if (typeof e === "string") return e;
  if (e === null || (typeof e !== "object" && typeof e !== "function")) return String(e);
  return typeof e === "function" ? "[function]" : "[object]";
}
/**
 * VM 内上限错误的源码片段：capErr 创建可识别的上限错误，lost 处理栈溢出类错误。
 */
//@ chunk-4121qate.js:64655-65272 placement
var CAPPED_ERROR_SOURCE = `
      const _capSet = new _WeakSet()
      function capErr(msg) {
        const e = new _Error(msg)
        _capSet.add(e)
        return e
      }
      function isCap(e) {
        try { return _capSet.has(e) } catch { return false }
      }`,
  Sy = `
      function isStackEnd(e) {
        if (_isError === null || !_isError(e)) return false
        const said = _ownDescriptor(e, 'message')
        return said !== undefined && (said.value === '${STACK_OVERFLOW_MESSAGES[0]}' || said.value === '${STACK_OVERFLOW_MESSAGES[1]}')
      }
      function lost(e) {
        if (isCap(e)) throw e
        if (isStackEnd(e)) throw capErr('${STACK_EXHAUSTED_MESSAGE}')
      }`;
/**
 * 在工作流 VM 边界两侧复制值（数组长度、循环引用、深度上限）
 */
//@ chunk-4121qate.js:65272-69120 placement
function copyAcrossVmBoundary({
  arrayLengthCap: arrayLengthCap,
  isLeaving: isLeaving,
  isListSeenFirst: isListSeenFirst,
  protoKey: protoKey,
}) {
  let s =
      arrayLengthCap === void 0
        ? ""
        : `if (len > ${arrayLengthCap}) {
          throw capErr('array length ' + len + ' exceeds the maximum of ${arrayLengthCap} supported across the workflow VM boundary')
        }`,
    i = "const out = []; seen.set(v, out)";
  return `
      const _WeakMap = WeakMap, _WeakSet = WeakSet, _isArray = Array.isArray,
            _keys = Object.keys, _defineProperty = Object.defineProperty,
            _Error = Error, _isSafeInteger = Number.isSafeInteger,
            _isError = typeof Error.isError === 'function' ? Error.isError : null,
            _ownDescriptor = Object.getOwnPropertyDescriptor
      ${CAPPED_ERROR_SOURCE}
      ${Sy}
      function checkedLength(v) {
        let len
        try { len = v.length } catch (e) {
          lost(e)
          throw new _Error('unable to read array length across the workflow VM boundary')
        }
        if (typeof len !== 'number' || !_isSafeInteger(len)) {
          throw capErr('array length is not a safe integer across the workflow VM boundary')
        }
        ${s}
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
//@ chunk-4121qate.js:69120-69127 placement
var Qp;
//@ chunk-4121qate.js:69127-69189 placement
function rr() {
  return ((Qp ??= vmModule.runInContext(BT(VM_BOOTSTRAP_SOURCE), SubAgentContext({}))), Qp);
}
//@ chunk-4121qate.js:69189-69219 placement
var Bbi = (e) => rr().Fragment(e);
//@ chunk-4121qate.js:69219-69256 placement
var jbi = (e, o, ...r) => rr().h(e, o, ...r);
/**
 * 在 VM 中构建元素（children 规整为数组）。
 */
//@ chunk-4121qate.js:69256-69364 placement
function buildVmElement(e, o) {
  let { children: children, ...n } = o ?? {},
    s = children === void 0 ? [] : Array.isArray(children) ? children : [children];
  return requireElement(jbi(e, n, ...s));
}
//@ chunk-4121qate.js:69364-69406 placement
var Ny = (e) => dfr.mark((o) => Q5e(buildVmElement(e, o)), e);

export {
  copyAcrossVmBoundary,
  buildVmElement,
  Bbi,
  Ny,
  describeBoundaryValue,
  createVmSideCopier,
  VM_STRING_BRIDGE_SOURCE,
  wrapHostFnForVm,
  LZr,
  snapshotArrayAcrossVm,
  jbi,
};
