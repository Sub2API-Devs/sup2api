
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{qs}from"./chunk-dcmhvw5a.js";import{Nat,WT,aCn}from"./chunk-bfnfj4kx.js";import{rr}from"./chunk-agvt6ygy.js";var KTe="cc-plugin-you-should-know";var yMr={id:"you-should-know-plugin",providerAgnostic:!0,advertisedCommand:"plugin",cooldownSessions:10,maxLifetimeShows:3,content:async(o)=>`Want a side agent watching your back while Claude works? Turn on You should know:
${rr("suggestion",o.theme)(`/plugin enable ${KTe}@${qs}`)}`,isRelevant:async()=>Nat(KTe)&&WT(KTe)?.defaultEnabled===!1&&aCn(`${KTe}@${qs}`)===void 0};export{KTe,yMr};
