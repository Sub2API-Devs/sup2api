"""Controller-wide administration as a Manager mixin: health and features,
target images for new containers, self-upgrade, orphan cleanup."""
import contextlib
import json
import posixpath

import docker

import cleanup
from common import (DOCKER_SOCKET, BadRequest, UpgradeInProgress, check_business_image, single_image, valid_image,
                    write_private)
from shared_egress import SCHEMA as SHARED_EGRESS_SCHEMA

FEATURES = ('tunnel', 'uploads', 'runtime-images', 'self-upgrade', 'worker-update', 'runtime-pair-update-v1',
            'shared-egress-v1', 'cli-profile-v1', 'runtime-cleanup-v1', 'account-disk-quota-v1', 'runtime-purge-v2')


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
        ref = single_image(desired)
        env_dir = posixpath.dirname(self.env_file)
        if not posixpath.isabs(self.env_file) or env_dir == '/':
            raise RuntimeError('invalid runtime environment file path')
        with self.upgrade_lock:
            self._check_downgrade(self.ensure_image(ref))
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

    def _check_downgrade(self, image):
        """A controller image without the shared gateway cannot take over accounts bound to it."""
        if ((image.attrs.get('Config') or {}).get('Labels') or {}).get(SHARED_EGRESS_SCHEMA) == '1':
            return
        if self.shared_bindings():
            raise BadRequest('migrate shared accounts back before controller downgrade')

    def cleanup_inventory(self):
        return cleanup.inventory(self)

    def cleanup_runtimes(self, desired):
        return cleanup.cleanup(self, desired)
