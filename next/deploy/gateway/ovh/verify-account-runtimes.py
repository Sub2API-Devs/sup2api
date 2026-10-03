#!/usr/bin/env python3
"""Read-only OVH account runtime/configuration verification; no model calls."""
import json,os,pathlib,re,subprocess,urllib.request
root=pathlib.Path.home()/'sup2api-managed'
env=dict(l.split('=',1) for l in (root/'.env').read_text().splitlines() if '=' in l)
def api(method,path,body=None,token=None,port=3130):
    headers={'Content-Type':'application/json'}
    if token:headers['Authorization']='Bearer '+token
    req=urllib.request.Request(f'http://127.0.0.1:{port}/api/v1'+path,method=method,data=None if body is None else json.dumps(body).encode(),headers=headers)
    with urllib.request.urlopen(req,timeout=65) as r:return json.load(r)['data']
token=api('POST','/auth/login',{'email':env['SUB2API_BOOTSTRAP_ADMIN_EMAIL'],'password':env['SUB2API_BOOTSTRAP_ADMIN_PASSWORD']})['access_token']
for port in range(3130,3134):assert api('GET','/system/version',token=token,port=port)['version']==os.getenv('EXPECTED_CORE_VERSION','0.1.19')
keydir=root/'ccgateway'
ssh=['ssh','-o','BatchMode=yes','-o','IdentitiesOnly=yes','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+str(keydir/'known_hosts'),'-i',str(keydir/'id_ed25519'),'root@130.94.122.254']
raw=subprocess.check_output(ssh+['cat /opt/ccgateway-runtime.env'],text=True)
remote=dict(l.split('=',1) for l in raw.splitlines() if '=' in l)
cfg=api('GET','/system/ccgateway/remote-config',token=token)
assert cfg.get('account_runtimes') is True
# Verify the actual SSH direct-tcpip path, not merely a remote shell command.
command=ssh[:-1]+['-W','127.0.0.1:8787',ssh[-1]]
request=('GET /accounts/1/status HTTP/1.1\r\nHost: 127.0.0.1:8787\r\nAuthorization: Bearer '+remote['CCG_CONTROLLER_KEY']+'\r\nConnection: close\r\n\r\n').encode()
process=subprocess.Popen(command,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
try:
    process.stdin.write(request);process.stdin.flush()
    response=process.stdout.readline()
    assert b' 200 ' in response, 'SSH controller HTTP forwarding failed'
    print('PINNED_SSH_CONTROLLER_HTTP_FORWARDING_PASS')
finally:
    process.terminate()
    process.communicate(timeout=10)
for port in range(3130,3134):
    version=api('GET','/system/version',token=token,port=port)
    config=api('GET','/system/ccgateway/remote-config',token=token,port=port)
    assert config['account_runtimes'] and config['mode']=='ssh'
    assert not any(k in config for k in ('password','private_key','passphrase','admin_key','api_key'))
    plugin=api('GET','/plugins/ccgateway',token=token,port=port)
    assert plugin['status']=='enabled' and plugin['node_summary']['states'].get('active')==4
    types=[v for v in api('GET','/account-types',token=token,port=port) if v['plugin_key']=='ccgateway']
    assert {v['type'] for v in types}=={'managed','apikey'}
    assert all(v['plugin_version']=='0.1.1' for v in types)
    form=api('GET','/account-types/ccgateway/apikey/form',token=token,port=port)
    assert set(form['schema']['properties'])=={'api_key','base_url'}
    assert form['ui_schema']['api_key']['ui:widget']=='secret'
    origin=f'http://127.0.0.1:{port}'
    def get(path):
        with urllib.request.urlopen(origin+path,timeout=10) as r:return r.read().decode()
    html=get('/')
    entry=re.search(r'<script[^>]+src="(/assets/index-[^\"]+\.js)"',html)[1]
    js=get(entry)
    detail=re.search(r'PluginDetailView-[a-zA-Z0-9_-]+\.js',js)[0]
    detailjs=get('/assets/'+detail)
    chunk=re.search(r'CCGatewayView-[a-zA-Z0-9_-]+\.js',detailjs)[0]
    page=get('/assets/'+chunk)
    assert 'account_runtimes' in page and '/system/ccgateway/accounts/' in page and 'apikey' in page
    print(json.dumps({'port':port,'version':version['version'],'node':version['core_node_id'],'account_runtimes':True,'ccgateway_active_nodes':4,'frontend_chunk':chunk}))

for i in range(1,5):
    container=f'sup2api-managed-sup2api-{i}-1'
    logs=subprocess.run(['docker','logs','--since',os.getenv('VERIFY_SINCE','5m'),container],capture_output=True,text=True)
    errors=sum('level=ERROR' in line or '"level":"ERROR"' in line for line in (logs.stdout+logs.stderr).splitlines())
    print(json.dumps({'container':container,'errors_since_release':errors}))
