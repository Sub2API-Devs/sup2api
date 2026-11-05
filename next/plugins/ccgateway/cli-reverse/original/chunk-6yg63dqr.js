
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{SA,Lt}from"./chunk-8824h7w7.js";import{S}from"./chunk-zt8d60ng.js";import{ec}from"./chunk-8n1fbght.js";import{s,n}from"./chunk-emhzq435.js";import{Ce}from"./chunk-9n68jj1e.js";import{Ve}from"./chunk-h40h7b8f.js";import{vI}from"./chunk-5e7d3nv9.js";import{jSe}from"./chunk-egjtffvk.js";import{e,r}from"./chunk-6n4z8qxn.js";import{en}from"./chunk-j78f68ax.js";import{ml}from"./chunk-0eqmdcgk.js";import{w}from"./chunk-gehzbwn8.js";var L=5,H=5;function oqe(b){let t=S(27),{output:m,fullOutput:p,elapsedTimeSeconds:i,totalLines:l,totalBytes:u,timeoutMs:o,verbose:a}=b,{columns:c}=Ce(),A;if(t[0]!==c||t[1]!==m||t[2]!==a)A=a?null:C(m,c),t[0]=c,t[1]=m,t[2]=a,t[3]=A;else A=t[3];let g=A,E;if(t[4]!==p||t[5]!==g)E=g?g.text:ml(p.trim()),t[4]=p,t[5]=g,t[6]=E;else E=t[6];let M=E;if(!M){let d;if(t[7]===w)d=e(n,{dimColor:!0,children:"Running\u2026 "}),t[7]=d;else d=t[7];let f;if(t[8]!==i||t[9]!==o)f=e(Ve,{children:r(vI,{children:[d,e(jSe,{elapsedTimeSeconds:i,timeoutMs:o})]})}),t[8]=i,t[9]=o,t[10]=f;else f=t[10];return f}let _=g?L:Lt(p,`
`)+1,F=(l?Math.max(0,l-_):0)+(g?.dropped??0),x="";if(u&&l)x=`~${l} lines`;else if(F>0)x=`+${F} lines`;let d;if(t[11]!==M)d=e(n,{dimColor:!0,children:M}),t[11]=M,t[12]=d;else d=t[12];let f;if(t[13]!==x)f=x?e(n,{dimColor:!0,children:x}):null,t[13]=x,t[14]=f;else f=t[14];let B;if(t[15]!==i||t[16]!==o)B=e(jSe,{elapsedTimeSeconds:i,timeoutMs:o}),t[15]=i,t[16]=o,t[17]=B;else B=t[17];let O;if(t[18]!==u)O=u?e(n,{dimColor:!0,children:en(u)}):null,t[18]=u,t[19]=O;else O=t[19];let R;if(t[20]!==f||t[21]!==B||t[22]!==O)R=r(s,{flexDirection:"row",gap:1,children:[f,B,O]}),t[20]=f,t[21]=B,t[22]=O,t[23]=R;else R=t[23];let G;if(t[24]!==d||t[25]!==R)G=e(Ve,{children:e(vI,{children:r(s,{flexDirection:"column",children:[d,R]})})}),t[24]=d,t[25]=R,t[26]=G;else G=t[26];return G}function cOo({output:b,fullOutput:m,totalLines:p},i){if(!m.trim())return!1;return(p??0)>L||C(b,i).clipped}function C(b,m){let p=Math.max(1,m-H),i=ml(b.trim()).replace(/\r\n?/g,`
`).split(`
`).filter((a)=>a),l=[],u=0,o=i.length;while(o>0&&u<L){let a=i[--o],c=ec(a,p,{hard:!0,trim:!1}).split(`
`),t=L-u;if(c.length>t)return l.unshift(SA(c.slice(-t).join("")," ")),{text:l.join(`
`),clipped:!0,dropped:o};l.unshift(a),u+=c.length}return{text:l.join(`
`),clipped:o>0,dropped:o}}
export{oqe,cOo};
