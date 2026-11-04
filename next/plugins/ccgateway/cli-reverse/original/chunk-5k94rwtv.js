
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{ne}from"./chunk-m41h77x8.js";import{Tde}from"./chunk-km6vv5ys.js";var kDn=`

This is how Claude Code surfaces a prompt a plugin submits between `+"turns \u2014 it starts this turn in the user's place. Address the message above.",Xys=(t)=>"The "+t+` plugin sent a message:
`,Edo=(t)=>`Prompt from the ${t} plugin`,m=(t)=>typeof t==="object"&&t!==null&&("text"in t)&&typeof t.text==="string"&&t.text!=="",_=(t)=>t.length>28&&t.startsWith("The ")&&t.endsWith(` plugin sent a message:
`);function vdo(t,n){let r=t.slice(0,t.indexOf(`
`)+1);return m(n)&&_(r)&&t===r+n.text+kDn?{label:r.slice(4,-24),text:n.text}:void 0}function l(t,n,r){let s=vdo(t,n);if(s===void 0)return t;return`${Edo(s.label)}${r}${s.text}`}var t7=(t,n)=>l(t,n,": "),Jys=(t,n)=>l(t,n,`
`);var Qys=/^(?:\s*<[a-z][\w-]*[\s>]|\[Request interrupted by user[^\]]*\])/,f=/<command-name>(.*?)<\/command-name>/;function Yut(t,n,r="stored"){if(t.type!=="user")return;if(t.isMeta===!0||t.isCompactSummary===!0)return;let s=t.message;if(!s)return;let i=s.content,u=r==="shown"&&typeof i==="string"?t7(i,t.pluginPrompt):i,c=u!==i,p=[];if(typeof u==="string")p.push(u);else if(Array.isArray(i))for(let e of i){if(!e||typeof e!=="object")continue;if(e.type==="tool_result")return;if(e.type==="text"&&typeof e.text==="string")p.push(e.text)}for(let e of p){let o=Tde(e).replaceAll(`
`," ").trim();if(!o)continue;let a=c?null:f.exec(o);if(a){if(!n.commandFallback)n.commandFallback=a[1];continue}let g=c?null:/<bash-input>([\s\S]*?)<\/bash-input>/.exec(o);if(g)return`! ${g[1].trim()}`;if(Qys.test(o))continue;if(o.length>200)o=ne(o,200).trim()+"\u2026";return o}return}
export{kDn,Xys,Edo,vdo,t7,Jys,Qys,Yut};
