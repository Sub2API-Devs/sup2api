
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{AsyncLocalStorage as i}from"async_hooks";var c="tengu_tingly_pearl";class o{reader=null;register(e){let r=this.reader;return this.reader=e,r}}var n=new o;function JCi(e){return n.register(e)}function zPn(){let e=n.reader;if(!e)return!0;try{let{value:r,source:t,defaultHost:a}=e(c,!0);return r!==!1||t!=="payload"||!a}catch{return!0}}var u=new i;async function BIt(e,r){let t={off:e,fired:!1};return{result:await u.run(t,r),fired:t.fired}}function Ndt(e){return u.run({off:!0,fired:!1},e)}function $dt(){return u.getStore()?.off===!0}function KPn(){let e=u.getStore();if(e)e.fired=!0}class d{reader=null}var l=new d;function QCi(e){l.reader=e}function $cs(){let e=l.reader;if(!e)return!0;try{let{value:r,source:t,defaultHost:a}=e("tengu_foamy_heron",!0);return r!==!1||t!=="payload"||!a}catch{return!0}}class f{reader=null;register(e){let r=this.reader;return this.reader=e,r}}var s=new f;function ZCi(e){return s.register(e)}function Fcs(){let e=s.reader;if(!e)return!0;try{let{value:r,source:t,defaultHost:a}=e("tengu_calm_nautilus",!0);return r!==!1||t!=="payload"||!a}catch{return!0}}
export{JCi,zPn,BIt,Ndt,$dt,KPn,QCi,$cs,ZCi,Fcs};
