
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Ut}from"./chunk-3jnp0k38.js";var a=/^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/,c="0".repeat(32),i="0".repeat(16),u=8;function d(n){if(typeof n!=="string")return!1;let t=a.exec(n);return t!==null&&t[1]!==c&&t[2]!==i}function Iri(n,{isCrossSession:t}){if(t||typeof n!=="object"||n===null)return;if(!("trace_context"in n)||!("uuid"in n))return;let r=n.trace_context,o=Ut(n.uuid);if(!d(r)||!o)return;return{traceparent:r,eventUuid:o}}function Ori(n){let t=n.findLast((e)=>e.traceContext)?.traceContext;if(!t)return{parent:void 0,linked:[]};let r=new Set([t.traceparent]),o=[];for(let{traceContext:e}of n)if(e&&!r.has(e.traceparent))r.add(e.traceparent),o.push(e);return{parent:t,linked:o.slice(-u)}}var s="anthropic/ccr-turn-event-uuid",T="anthropic/ccr-turn-linked-event-uuids";function ner(n){let t=Ut(n?.parent?.eventUuid);if(!n||!t)return{};let r=n.linked.flatMap((o)=>{let e=Ut(o.eventUuid);return e?[e]:[]});return{[s]:t,...r.length>0&&{[T]:r}}}
export{Iri,Ori,ner};
