
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Ie}from"./chunk-yn45f1gp.js";import{qt,Se,Q,j}from"./chunk-p86mcgbc.js";import{gCn}from"./chunk-2mbp91tg.js";j();var gM=qt(null),DRr=qt(null),LRr=qt(null);function Znn(){let e=Se(LRr);if(!e)throw ReferenceError("useMcpConnections cannot be called outside of an <AppStateProvider />");return e}var HRr=qt(null);function c5(){let e=Se(HRr);if(!e)throw ReferenceError("useActivePlugins cannot be called outside of an <AppStateProvider />");return e}function LS(){let e=Se(DRr);if(!e)throw ReferenceError("useAppStateSession cannot be called outside of an <AppStateProvider />");return e}function t(){let e=Se(gM);if(!e)throw ReferenceError("useAppState/useSetAppState cannot be called outside of an <AppStateProvider />");return e}function G(e){let n=t();return Ie(n,e)}function Xn(){return t().setState}function B_o(){let e=t();return Q(()=>gCn(e.setState),[e])}function Cr(){return t()}function rs(e){return Ie(Se(gM),e)}
export{gM,DRr,LRr,Znn,HRr,c5,LS,G,Xn,B_o,Cr,rs};
