"""Controller-wide administration as a Manager mixin: health and features,
target images for new containers, self-upgrade, orphan cleanup."""
import contextlib
import json
import posixpath

import docker

import cleanup
from common import BadRequest, UpgradeInProgress, check_business_image, valid_image, write_private

FEATURES = ('tunnel', 'uploads', 'runtime-images', 'self-upgrade', 'worker-update', 'runtime-pair-update-v1',
            'shared-egress-v1', 'cli-profile-v1', 'runtime-cleanup-v1', 'account-disk-quota-v1', 'runtime-purge-v2')
DOCKER_SOCKET = '/var/run/docker.sock'


class RuntimeAdmin:
    def health(self):
        return {'version': self.version, 'app_image': self.app_image, 'egress_image': self.egress_image,
                'controller_image': self.controller_image, 'network_policy_version': 1,
                'features': list(FEATURES),
                'disk_quota': {'default_bytes': self.account_disk_bytes, 'support': self.disk_quota_support}}

    def runtime_images(self):
        return {'app': self.app_image, 'egress': self.egress_image, 'controller': self.controller_image}

    def set_runtime_images(self, desired):
        if not isinstance(desired, dict) or set(desired) - {'app', 'egress'}:
            raise BadRequest('invalid runtime images')
        if not all(valid_image(ref) for ref in desired.values()):
            raise BadRequest('invalid image reference')
        if not desired:
            return self.health()  # nothing to change: nothing is written
        with self.runtime_lock:
            for role, ref in desired.items():
                image = self.ensure_image(ref)
                if role == 'app':
                    check_business_image(image)
            app, egress = desired.get('app', self.app_image), desired.get('egress', self.egress_image)
            write_private(self.root / 'runtime.json',
                          json.dumps({'app': app, 'egress': egress, 'env': self.env_images}))
            self.app_image, self.egress_image = app, egress
            self.image_seen = (0.0, '')
        return self.health()

    def upgrade_controller(self, desired):
        ref = desired.get('image') if isinstance(desired, dict) and set(desired) == {'image'} else None
        if not valid_image(ref):
            raise BadRequest('invalid image reference')
        env_dir = posixpath.dirname(self.env_file)
        if not posixpath.isabs(self.env_file) or env_dir == '/':
            raise RuntimeError('invalid runtime environment file path')
        with self.upgrade_lock:
            image = self.ensure_image(ref)
            if (self.root / 'shared-egress' / 'state.json').exists():
                if image.attrs.get('Config', {}).get('Labels', {}).get('io.sup2api.ccgateway.shared-egress') != '1':
                    if self.shared.data['bindings']:
                        raise BadRequest('migrate shared accounts back before controller downgrade')
            helper_name = self.controller_name + '-upgrade'
            with contextlib.suppress(docker.errors.NotFound):
                helper = self.docker.containers.get(helper_name)
                if helper.status == 'running':
                    raise UpgradeInProgress('controller upgrade in progress')
                helper.remove(force=True)  # a finished helper that was not auto-removed
            # The new image runs its own upgrade.py. The environment file's
            # directory is mounted (not the file) so it can be replaced atomically.
            self.docker.containers.run(ref, ['python', 'upgrade.py', ref], name=helper_name,
                remove=True, detach=True, network_mode='host',
                environment={'CCG_RUNTIME_ENV_FILE': self.env_file, 'CCG_CONTROLLER_NAME': self.controller_name,
                             'CCG_CONTROLLER_PORT': str(self.controller_port)},
                volumes={DOCKER_SOCKET: {'bind': DOCKER_SOCKET, 'mode': 'rw'},
                         env_dir: {'bind': env_dir, 'mode': 'rw'}})
        return {'accepted': True}

    def cleanup_inventory(self):
        return cleanup.inventory(self)

    def cleanup_runtimes(self, desired):
        return cleanup.cleanup(self, desired)
