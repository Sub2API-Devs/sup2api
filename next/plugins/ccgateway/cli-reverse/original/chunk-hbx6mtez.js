
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import"./chunk-ndkzc8d3.js";import"./chunk-3jnp0k38.js";import"./chunk-5ythzcas.js";import"./chunk-0993wma0.js";import"./chunk-vwtpw18x.js";import"./chunk-63094ahz.js";import"./chunk-yxxb6qww.js";import"./chunk-za46rn2f.js";import"./chunk-0qffyy27.js";import"./chunk-my2r02mp.js";import"./chunk-2k62t388.js";import"./chunk-tzbg5px3.js";import"./chunk-6hadbefe.js";import"./chunk-ajqq8a9j.js";import"./chunk-ndcj3jv5.js";import"./chunk-8824h7w7.js";import"./chunk-3gbv0jkm.js";import"./chunk-2jb250pa.js";import"./chunk-t046xvwq.js";import"./chunk-xjnnz630.js";import"./chunk-bb1a67wr.js";import"./chunk-f3md3zsc.js";import"./chunk-6xfdsap5.js";import"./chunk-9ys74nhz.js";import"./chunk-qxwk69tt.js";import{Ra}from"./chunk-bvz8t570.js";import"./chunk-72da5r6r.js";import"./chunk-rn8k2fjf.js";import{eo}from"./chunk-exqhz3vp.js";import"./chunk-0eqmdcgk.js";import"./chunk-r4yj9pae.js";function c(t,o,a,d){let e=(i,r)=>typeof i==="string"&&typeof r==="string"&&i===a(r),s=e(t.saved_pages_dir,o)?`[A quickstart in this conversation saved reference pages of this type on disk in ${eo([t.saved_pages_dir])}; its result lists them, so those are not attached here.]`:"";if(t.not_listed===!0)return s===""?"":`

${s}`;let n=s===""?"":` ${s}`;if(typeof t.saved_system==="string"&&e(t.saved_system_dir,t.saved_system))return`

[A quickstart in this conversation already listed the design systems and saved the files of ${Ra(t.saved_system,"(unrecognized address)")} on disk \u2014 skip the instructions' step that lists them and reads that README; its result lists the saved files.]${n}`;return s===""?null:`${d}${n}`}export{c as afterQuickstartSavedLine};
