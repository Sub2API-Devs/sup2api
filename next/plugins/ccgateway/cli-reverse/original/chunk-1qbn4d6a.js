
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
var qbn=/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u2800]|(?!\u0020)\p{Zs}/u;function P5r(n){return qbn.test(n)}var o=/\p{Cs}/u;function Lee(n){return P5r(n)||o.test(n)}function Xrt(n,t){return n.split(/\r?\n/).some(Lee)?`${t} is not shown here because it holds hidden or control characters`:n}function zF(n){return Lee(n)?"a path not shown here because it holds hidden or control characters":n}
export{qbn,P5r,Lee,Xrt,zF};
