
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{N}from"./chunk-63094ahz.js";import{a}from"./chunk-my2r02mp.js";import{Ace}from"./chunk-e698sy23.js";import{Kwr}from"./chunk-r7hswen6.js";import{xe}from"./chunk-90nja2dk.js";import{NQ}from"./chunk-tt36reb3.js";import{Txn}from"./chunk-4qbrxszq.js";import{hm}from"./chunk-ga8a8mhv.js";function n(){try{return NQ()&&Txn()}catch(r){return a(N(r)),!0}}function k$(r){try{let o=xe(),e=o.hookRegistrationEpoch!==r.epoch||o.loadedModules!==r.modules;return r.wasUnknown||n()||e&&Ace()&&Txn()}catch(o){return a(N(o)),!0}}function Lot({isRunReached:r}){try{return n()||xe().loadedModules.some((o)=>!hm(o)&&Kwr(o.args.pluginStorageId)&&(o.hooks("prompt.submit")||!r&&o.hooks("command.run")))}catch(o){return a(N(o)),!0}}function nz(){let r=xe();return{wasUnknown:n(),epoch:r.hookRegistrationEpoch,modules:r.loadedModules}}
export{k$,Lot,nz};
