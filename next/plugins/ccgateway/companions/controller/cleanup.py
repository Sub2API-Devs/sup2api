"""Owned runtime inventory and identity-checked, authoritative keep-list cleanup."""
import hashlib
import json

import docker

MAX_KEYS = 20000


def snapshot(manager, key):
    from manager import LABEL
    resources = []
    for kind, collection, roles in [('container', manager.docker.containers, ('app', 'egress')),
                                    ('network', manager.docker.networks, ('net', 'uplink')),
                                    ('volume', manager.docker.volumes, ('data',))]:
        for role in roles:
            try:
                item = collection.get(manager.name(key, role))
            except docker.errors.NotFound:
                continue
            labels = item.labels if kind == 'container' else item.attrs.get('Labels') or {}
            if labels.get(LABEL) != key:
                raise ValueError('resource ownership mismatch')
            resources.append([kind, role, getattr(item, 'id', None), item.attrs.get('CreatedAt'),
                              item.attrs.get('Created'), item.attrs.get('State', {}).get('StartedAt')])
    path = manager.dir(key)
    if path.is_symlink():
        raise ValueError('runtime directory is a symlink')
    if path.is_dir():
        st = path.stat()
        resources.append(['directory', st.st_ino, st.st_mtime_ns])
    state = path / 'state.json'
    if state.exists():
        if state.is_symlink():
            raise ValueError('runtime state is a symlink')
        st = state.stat()
        resources.append(['state', st.st_ino, st.st_mtime_ns, hashlib.sha256(state.read_bytes()).hexdigest()])
    backup = manager.root / 'backups' / (key + '.json')
    if backup.exists():
        if backup.is_symlink():
            raise ValueError('runtime backup is a symlink')
        resources.append(['backup', hashlib.sha256(backup.read_bytes()).hexdigest()])
    if (manager.root / 'shared-egress' / 'state.json').exists():
        binding = manager.shared.data['bindings'].get(key)
        if binding is not None:
            resources.append(['shared_binding', binding])
    if not resources:
        return None
    return hashlib.sha256(json.dumps(resources, sort_keys=True).encode()).hexdigest()


def inventory(manager):
    from manager import KEY, LABEL
    keys = {p.name for p in manager.root.iterdir() if KEY.fullmatch(p.name) and p.is_dir() and not p.is_symlink()}
    backups = manager.root / 'backups'
    if backups.is_dir() and not backups.is_symlink():
        keys.update(p.stem for p in backups.glob('*.json') if KEY.fullmatch(p.stem) and not p.is_symlink())
    if (manager.root / 'shared-egress' / 'state.json').exists():
        keys.update(key for key in manager.shared.data['bindings'] if KEY.fullmatch(key))
    for kind, items, roles in [
        ('container', manager.docker.containers.list(all=True, filters={'label': LABEL}), ('app', 'egress')),
        ('network', manager.docker.networks.list(), ('net', 'uplink')),
        ('volume', manager.docker.volumes.list(), ('data',)),
    ]:
        for item in items:
            labels = item.labels if kind == 'container' else item.attrs.get('Labels') or {}
            key = labels.get(LABEL, '')
            if isinstance(key, str) and KEY.fullmatch(key) and item.name in {manager.name(key, role) for role in roles}:
                keys.add(key)
    if len(keys) > MAX_KEYS:
        raise ValueError('runtime inventory too large')
    rows = []
    for key in sorted(keys):
        with manager.guard(key):
            identity = snapshot(manager, key)
            if identity:
                rows.append({'key': key, 'identity': identity})
    return {'runtimes': rows}


def cleanup(manager, desired):
    from manager import BadRequest, SHA256_HEX, check
    if not isinstance(desired, dict) or set(desired) != {'keep_keys', 'candidates'}:
        raise BadRequest('complete keep list and resource inventory required')
    keep, candidates = desired['keep_keys'], desired['candidates']
    if not isinstance(keep, list) or not isinstance(candidates, list) or max(len(keep), len(candidates)) > MAX_KEYS:
        raise BadRequest('invalid cleanup list')
    for key in keep:
        check(key)
    if len(set(keep)) != len(keep):
        raise BadRequest('duplicate keep key')
    seen = set()
    for row in candidates:
        if not isinstance(row, dict) or set(row) != {'key', 'identity'}:
            raise BadRequest('invalid cleanup candidate')
        check(row['key'])
        if row['key'] in seen or not isinstance(row['identity'], str) or not SHA256_HEX.fullmatch(row['identity']):
            raise BadRequest('invalid cleanup identity')
        seen.add(row['key'])
    keep = set(keep)
    results = []
    for row in candidates:
        key = row['key']
        if key in keep:
            results.append({'key': key, 'status': 'kept'})
            continue
        try:
            with manager.guard(key):
                current = snapshot(manager, key)
                if current is None:
                    status = 'absent'
                elif current != row['identity']:
                    status = 'changed'
                else:
                    manager.delete(key, account=True, purge=True)
                    status = 'deleted'
            results.append({'key': key, 'status': status})
        except Exception:
            results.append({'key': key, 'status': 'failed', 'reason': 'resource_cleanup_failed'})
    return {'results': results, 'deleted': sum(x['status'] == 'deleted' for x in results),
            'failed': sum(x['status'] == 'failed' for x in results)}
