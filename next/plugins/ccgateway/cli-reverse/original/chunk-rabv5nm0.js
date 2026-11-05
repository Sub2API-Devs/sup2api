
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{ai,Fn}from"./chunk-z20c443b.js";var bq=(o)=>o.endsWith(`@${ai}`);function zHt(o,e){let t=Fn(o);return[...e??[]].some((r)=>!bq(r)&&Fn(r)===t)}export{bq,zHt};
