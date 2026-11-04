
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{J4}from"./chunk-aepeg2w5.js";import{p}from"./chunk-kpa9nk58.js";import{nJ}from"./chunk-93zax7h2.js";import{E,u}from"./chunk-7vp249v4.js";var o=60000,r=1800000,t=2592000000,i=p(()=>u({recurringFrac:E().min(0).max(1),recurringCapMs:E().int().min(0).max(r),oneShotMaxMs:E().int().min(0).max(r),oneShotFloorMs:E().int().min(0).max(r),oneShotMinuteMod:E().int().min(1).max(60),recurringMaxAgeMs:E().int().min(0).max(t).default(nJ.recurringMaxAgeMs),cacheLeadMs:E().int().min(0).max(60000).default(nJ.cacheLeadMs)}).refine((n)=>n.oneShotFloorMs<=n.oneShotMaxMs));function A9(){let n=J4("tengu_kairos_cron_config",nJ,o),e=i().safeParse(n);return e.success?e.data:nJ}
export{A9};
