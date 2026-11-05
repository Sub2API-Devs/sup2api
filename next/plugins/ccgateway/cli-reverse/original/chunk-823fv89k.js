
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{q5}from"./chunk-exfmq47h.js";import{p}from"./chunk-k6qypy1d.js";import{UQ}from"./chunk-mk7xxmed.js";import{E,u}from"./chunk-m4y44r15.js";var o=60000,r=1800000,t=2592000000,i=p(()=>u({recurringFrac:E().min(0).max(1),recurringCapMs:E().int().min(0).max(r),oneShotMaxMs:E().int().min(0).max(r),oneShotFloorMs:E().int().min(0).max(r),oneShotMinuteMod:E().int().min(1).max(60),recurringMaxAgeMs:E().int().min(0).max(t).default(UQ.recurringMaxAgeMs),cacheLeadMs:E().int().min(0).max(60000).default(UQ.cacheLeadMs)}).refine((n)=>n.oneShotFloorMs<=n.oneShotMaxMs));function i7(){let n=q5("tengu_kairos_cron_config",UQ,o),e=i().safeParse(n);return e.success?e.data:UQ}
export{i7};
