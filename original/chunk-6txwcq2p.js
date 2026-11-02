
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{N}from"./chunk-2g090z7k.js";import{l}from"./chunk-bbtre4r8.js";import{sdr}from"./chunk-czx62zen.js";import{xe}from"./chunk-yf5m6p65.js";import{ZX}from"./chunk-pd0t5xas.js";import{Rbn}from"./chunk-a9ek44g8.js";import{y_}from"./chunk-c46jjxz1.js";import{oae}from"./chunk-7a5rgqvc.js";function n(){try{return ZX()&&Rbn()}catch(r){return l(N(r)),!0}}function q0(r){try{let o=xe(),e=o.hookRegistrationEpoch!==r.epoch||o.loadedModules!==r.modules;return r.wasUnknown||n()||e&&oae()&&Rbn()}catch(o){return l(N(o)),!0}}function S7e({isRunReached:r}){try{return n()||xe().loadedModules.some((o)=>!y_(o)&&sdr(o.args.pluginStorageId)&&(o.hooks("prompt.submit")||!r&&o.hooks("command.run")))}catch(o){return l(N(o)),!0}}function oW(){let r=xe();return{wasUnknown:n(),epoch:r.hookRegistrationEpoch,modules:r.loadedModules}}
export{q0,S7e,oW};
