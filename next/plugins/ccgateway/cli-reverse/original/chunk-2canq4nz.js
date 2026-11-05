
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{M5}from"./chunk-hmaqgh0x.js";import{Tm,Ku}from"./chunk-trds6g68.js";import{je}from"./chunk-gehzbwn8.js";import*as t from"vm";var l=`(() => {
  'use strict'
  Object.defineProperty(globalThis, 'pinned', { value: 0 })
  const isOwn = e => Object.getPrototypeOf(e) === TypeError.prototype
  let first = false
  let second = false
  let third = true
  try {
    Object.defineProperty(globalThis, 'pinned', { value: 1 })
  } catch (e) {
    first = isOwn(e)
  }
  try {
    class Base { constructor() { return globalThis } }
    class Derived extends Base { pinned = 1 }
    new Derived()
  } catch (e) {
    second = isOwn(e)
  }
  try {
    let receiver
    Object.defineProperty(globalThis, 'getter', { get() { receiver = this } })
    void globalThis.getter
    Object.preventExtensions(receiver)
    Object.defineProperty(globalThis, 'fresh', { value: 1 })
  } catch (e) {
    third = isOwn(e)
  }
  return first && second && third
})()`,h=`(pending, report) => {
  void (async () => {
    await pending
    await {
      then(resolve) {
        report(Object.getPrototypeOf(resolve) === Function.prototype)
        resolve()
      },
    }
  })()
}`,n;function Y7t(){return n??=d(),n}function khs(e){return e!=="passed"&&!Ku()}function Ths(){return n!==void 0}function d(){if(!Tm())return"not_bun";try{let{drainMicrotasks:e}=je("bun:jsc"),o=M5({__proto__:null},{codeGeneration:{strings:!1,wasm:!1}}),r=t.runInContext(l,o)===!0,i,{promise:c,resolve:a}=Promise.withResolvers();t.runInContext(h,o)(c,(u)=>{i=u}),queueMicrotask(a),e();let s=i===!0;if(r&&s)return"passed";if(!r&&!s)return"both";return r?"thenable_after_await":"rejected_definitions"}catch(e){switch(typeof e==="object"&&e!==null&&"name"in e&&e.name){case"TypeError":return"threw_type_error";case"ReferenceError":return"threw_reference_error";case"SyntaxError":return"threw_syntax_error";case"RangeError":return"threw_range_error";default:return"threw_other"}}}
export{Y7t,khs,Ths};
