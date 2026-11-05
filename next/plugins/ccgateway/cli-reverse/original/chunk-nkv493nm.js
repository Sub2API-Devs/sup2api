
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Jo}from"./chunk-5ythzcas.js";import{W}from"./chunk-0qffyy27.js";function Uin(t){let e;for(let n in t)if(n.startsWith("_PROTO_")){if(e===void 0)e={...t};delete e[n]}return e??t}var r=1000;function u(){return{eventQueue:[],sink:null,droppedEventCount:0}}function s(t,e){if(t.eventQueue.length>=r)t.eventQueue.shift(),t.droppedEventCount++;t.eventQueue.push(e)}class i{state=u()}var c=new W(()=>new i);function a(){return Jo(c)}function e0s(t){let e=a().state;if(e.sink!==null)return!1;if(e.sink=t,e.eventQueue.length>0){let n=e.eventQueue;e.eventQueue=[],queueMicrotask(()=>{for(let o of n)if(o.async)t.logEventAsync(o.eventName,o.metadata);else t.logEvent(o.eventName,o.metadata)})}return!0}function l(t,e){let n=a().state;if(n.sink===null){s(n,{eventName:t,metadata:e,async:!1});return}n.sink.logEvent(t,e)}async function li(t,e){let n=a().state;if(n.sink===null){s(n,{eventName:t,metadata:e,async:!0});return}await n.sink.logEventAsync(t,e)}
export{Uin,e0s,l,li};
