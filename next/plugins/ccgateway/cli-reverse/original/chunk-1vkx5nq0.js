
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Z}from"./chunk-8824h7w7.js";import{Xfe}from"./chunk-dahajswd.js";var yWn=`

This is how Claude Code surfaces a prompt a plugin submits between `+"turns \u2014 it starts this turn in the user's place. Address the message above.",AHs=(t)=>"The "+t+` plugin sent a message:
`,vko=(t)=>`Prompt from the ${t} plugin`,m=(t)=>typeof t==="object"&&t!==null&&("text"in t)&&typeof t.text==="string"&&t.text!=="",_=(t)=>t.length>28&&t.startsWith("The ")&&t.endsWith(` plugin sent a message:
`);function Rin(t,n){let r=t.slice(0,t.indexOf(`
`)+1);return m(n)&&_(r)&&t===r+n.text+yWn?{label:r.slice(4,-24),text:n.text}:void 0}function l(t,n,r){let s=Rin(t,n);if(s===void 0)return t;return`${vko(s.label)}${r}${s.text}`}var Xee=(t,n)=>l(t,n,": "),CHs=(t,n)=>l(t,n,`
`);var RHs=/^(?:\s*<[a-z][\w-]*[\s>]|\[Request interrupted by user[^\]]*\])/,f=/<command-name>(.*?)<\/command-name>/;function C_t(t,n,r="stored"){if(t.type!=="user")return;if(t.isMeta===!0||t.isCompactSummary===!0)return;let s=t.message;if(!s)return;let i=s.content,u=r==="shown"&&typeof i==="string"?Xee(i,t.pluginPrompt):i,c=u!==i,p=[];if(typeof u==="string")p.push(u);else if(Array.isArray(i))for(let e of i){if(!e||typeof e!=="object")continue;if(e.type==="tool_result")return;if(e.type==="text"&&typeof e.text==="string")p.push(e.text)}for(let e of p){let o=Xfe(e).replaceAll(`
`," ").trim();if(!o)continue;let a=c?null:f.exec(o);if(a){if(!n.commandFallback)n.commandFallback=a[1];continue}let g=c?null:/<bash-input>([\s\S]*?)<\/bash-input>/.exec(o);if(g)return`! ${g[1].trim()}`;if(RHs.test(o))continue;if(o.length>200)o=Z(o,200).trim()+"\u2026";return o}return}
export{yWn,AHs,vko,Rin,Xee,CHs,RHs,C_t};
