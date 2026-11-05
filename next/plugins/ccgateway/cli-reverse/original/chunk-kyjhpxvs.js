
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
var gIt="https://claude.com/claude-code",rmr="https://claude.ai";function i(t,e){return t?.includes("_staging_")===!0||e?.includes("staging")===!0}function Bro(t,e){return t?.includes("_local_")===!0||e?.includes("localhost")===!0}function m8e(t,e){if(Bro(t,e))return"http://localhost:4000";if(i(t,e))return"https://claude-ai.staging.ant.dev";return"https://claude.ai"}function sd(t,e,n){let{toCompatSessionId:s}=require("./chunk-6f3x4khs.js"),o=s(t),r=`${m8e(o,e)}/code/${o}`;return n?`${r}?${new URLSearchParams(n)}`:r}
export{gIt,rmr,Bro,m8e,sd};
