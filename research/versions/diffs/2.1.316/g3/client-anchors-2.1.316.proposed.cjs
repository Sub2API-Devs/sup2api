// Proposed client-factory anchors for patches/2.1.316.cjs (review group 3).
// Old K$ (chunk-yagw4eem.js) -> new MN (chunk-hwmsct5x.js); old Ml -> new Fl.
// NOTE: in the new module the provider route is Od (old Ud) and Ud is the old
// Od (first-party URL check): the anchor-2 replacement must call Od(s).
// Anchor 6 is new: 2.1.316 re-reads the stored login and re-decides OAuth
// after proxy auth (Pn/hUe/fl/sFe); API-key-only skips it like anchors 3-5.
module.exports = ({ edit, once, surround }) => {
  edit('chunk-hwmsct5x.js', 'MN', t => {
    t = once(t, 'async function MN(e){let{apiKey:n,', 'async function MN(e){let{ccgatewayAPIKeyOnly=false,apiKey:n,');
    t = once(t, '}=e,J=process.env.CLAUDE_CODE_CONTAINER_ID,', '}=e;if(ccgatewayAPIKeyOnly&&(!n||Od(s)!=="firstParty"))throw Error("request requires the API-key Anthropic-compatible route");let J=process.env.CLAUDE_CODE_CONTAINER_ID,');
    t = once(t, 'se=v4t(),', 'se=ccgatewayAPIKeyOnly?{}:v4t(),');
    t = once(t, 'let Qn=await fge({credentials:H,storageV5:j}),pt=Pn(),kt=hUe({anthropicAuthEnabled:fl(),oauthScopes:pt?.scopes}),', 'let Qn=ccgatewayAPIKeyOnly?void 0:await fge({credentials:H,storageV5:j}),pt=ccgatewayAPIKeyOnly?null:Pn(),kt=ccgatewayAPIKeyOnly?false:hUe({anthropicAuthEnabled:fl(),oauthScopes:pt?.scopes}),');
    t = once(t, 'if(!kt&&!Lr())Zn=await lw(ze,_e());await I8e();', 'if(!ccgatewayAPIKeyOnly&&!kt&&!Lr())Zn=await lw(ze,_e());if(!ccgatewayAPIKeyOnly)await I8e();else for(let name of Object.keys(ze))if(["authorization","x-api-key"].includes(name.toLowerCase()))delete ze[name];');
    return once(t, 'let Bl=Pn();if(pt&&Bl?.accessToken!==pt.accessToken||kt!==hUe({anthropicAuthEnabled:fl(),oauthScopes:Bl?.scopes})||lt(ze).value===void 0&&sFe())return MN(e);', 'if(!ccgatewayAPIKeyOnly){let Bl=Pn();if(pt&&Bl?.accessToken!==pt.accessToken||kt!==hUe({anthropicAuthEnabled:fl(),oauthScopes:Bl?.scopes})||lt(ze).value===void 0&&sFe())return MN(e)}');
  });
  edit('chunk-hwmsct5x.js', 'Fl', t => once(t, '"User-Agent":wU()', '"User-Agent":ccgatewayClientUserAgent()??wU()'));
  surround('chunk-hwmsct5x.js', { imports: 'import {clientUserAgent as ccgatewayClientUserAgent} from "./ccgateway-request-agent.js";\n' });
};
