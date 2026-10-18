"""Pinned CLI selection from the chosen, trusted worker image; never latest."""
import json
import re

VERSION = re.compile(r'[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}')

def validate_profile(value):
    if value is None:
        return None  # legacy configuration; new UI supplies an explicit version
    if (not isinstance(value, dict) or set(value) != {'version', 'request_mode', 'disable_auto_update'}
            or not isinstance(value['version'], str) or not VERSION.fullmatch(value['version'])
            or value['request_mode'] not in ('native', 'build', 'direct') or value['disable_auto_update'] is not True):
        raise ValueError('invalid pinned CLI profile')
    return dict(value)

# Runs before replacing any account container. The image owns the manifest and
# binary; credentials, host filesystem and network are not mounted in the probe.
PROBE = r'''
const fs=require('fs'),p=require('path'),c=require('crypto');
const version=process.argv[1],mode=process.argv[2],root='/opt/ccgateway/cli';
const manifest=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8'));
const item=manifest.versions?.[version];
if(!item||!Array.isArray(item.modes)||!item.modes.includes(mode))throw Error('requested CLI version/mode is not packaged in this image');
const file=fs.realpathSync(p.resolve(root,item.path));
if(!file.startsWith(root+'/')||!/^ccgateway-[a-z0-9-]+$/.test(item.patch)||! /^[a-f0-9]{64}$/.test(item.sha256))throw Error('invalid CLI manifest');
for(let q=file;;q=p.dirname(q)){const s=fs.statSync(q);if(s.uid!==0||(s.mode&18)!==0)throw Error('CLI path must be root-owned and immutable to worker');if(q==='/')break;}
if(c.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==item.sha256)throw Error('CLI checksum mismatch');
process.stdout.write(JSON.stringify({path:file,version,sha256:item.sha256,patch:item.patch}));
'''

def resolve_profile(manager, image, profile):
    if profile is None:
        return {}
    raw = manager.oneshot(image, entrypoint=['node'], command=['-e', PROBE, profile['version'], profile['request_mode']],
                          user='0', network_mode='none', cap_drop=['ALL'], security_opt=['no-new-privileges:true'])
    if len(raw) > 4096:
        raise ValueError('invalid CLI profile probe')
    item = json.loads(raw)
    if item.get('version') != profile['version']:
        raise ValueError('CLI profile version mismatch')
    return {'WORKER_CLI_PATH': item['path'], 'WORKER_CLI_VERSION': item['version'],
            'CCG_CLI_SHA256': item['sha256'], 'CCG_CLI_PATCH': item['patch'],
            'CCG_REQUEST_MODE': '' if profile['request_mode'] == 'native' else profile['request_mode']}
