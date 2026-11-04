
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Fe,Ct}from"./chunk-bwbq4xvm.js";var r=new Set([Fe,Ct]);function xTe(e){return r.has(e)}function QOs(e,n){return xTe(e)?e:n}function KJe(e){return e===Ct?"Select-Object -First, Select-Object -Last or Select-String":"head, tail or grep"}function FL(e){return e.isMcp!==!0&&xTe(e.name)}
export{xTe,QOs,KJe,FL};
