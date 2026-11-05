
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{ai}from"./chunk-z20c443b.js";import{hmt,tC,V0n}from"./chunk-6sf70a86.js";import{ar}from"./chunk-h1kvr8sm.js";var rPe="cc-plugin-you-should-know";var KGr={id:"you-should-know-plugin",providerAgnostic:!0,advertisedCommand:"plugin",cooldownSessions:10,maxLifetimeShows:3,content:async(o)=>`Want a side agent watching your back while Claude works? Turn on You should know:
${ar("suggestion",o.theme)(`/plugin enable ${rPe}@${ai}`)}`,isRelevant:async()=>hmt(rPe)&&tC(rPe)?.defaultEnabled===!1&&V0n(`${rPe}@${ai}`)===void 0};export{rPe,KGr};
