
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Ft}from"./chunk-ww9agm6g.js";import{qHe}from"./chunk-7kayq7nc.js";import{e4}from"./chunk-355mdh7x.js";var i=/^([a-z][a-z\d+\-.]*:)?\/\//i;function r(o,e){let s=e?.baseURL,n=i.test(o),t=null;if(n&&!e4(o))t=o;else if(s!=null&&!e4(s))t=s;else if(!n&&s==null)t=o;if(t!==null)throw Error(`downloads: request (url="${o}"`+(s!=null?`, baseURL="${s}"`:"")+") does not resolve to the public CDN (downloads.claude.ai). Use firstPartyApi for api.anthropic.com (residency-gated) or externalHttp for non-Anthropic hosts.")}var y9={get(o,e){return r(o,e),qHe(),Ft.get(o,e)}};
export{y9};
