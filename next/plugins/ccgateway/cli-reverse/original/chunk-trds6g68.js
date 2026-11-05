
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
function Tm(){return!0}function Ku(){return typeof Bun<"u"&&Bun.isStandaloneExecutable===!0}function XUt(){if(!Tm()||Ku())return!1;let n=Bun.main;if(sNs(n))return!1;return/\.[cm]?tsx?$/.test(n)}function sNs(n){return/^(?:\/\$bunfs|[a-z]:[\\/]~BUN)(?:[\\/]|$)/i.test(n)}
export{Tm,Ku,XUt,sNs};
