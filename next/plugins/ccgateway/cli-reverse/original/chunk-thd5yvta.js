
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
var Zxn=/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u2800]|(?!\u0020)\p{Zs}/u;function $oo(n){return Zxn.test(n)}var o=/\p{Cs}/u;function Cre(n){return $oo(n)||o.test(n)}function wct(n,t){return n.split(/\r?\n/).some(Cre)?`${t} is not shown here because it holds hidden or control characters`:n}function DB(n){return Cre(n)?"a path not shown here because it holds hidden or control characters":n}
export{Zxn,$oo,Cre,wct,DB};
