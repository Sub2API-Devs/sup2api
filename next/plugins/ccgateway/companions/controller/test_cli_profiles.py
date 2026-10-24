import os
from unittest.mock import patch
from test_manager import Base, BadRequest
from common import InvalidCLIProfile
from dockerfs import container_identity

PROFILE = {'version':'2.1.302','request_mode':'direct','disable_auto_update':True}

class ProfileTests(Base):
    def test_retired_agent_mode_requires_explicit_activation_and_keeps_data(self):
        with patch('manager.resolve_profile', return_value={}):
            self.apply('21', cli=PROFILE)
            old = self.app('21')
            volume = self.fake.volumes.get('ccg-21-data')
            state = self.m.state('21')
            state['cli']['request_mode'] = 'native'
            self.m.save('21', state)
            self.new_image()
            with self.assertRaises(InvalidCLIProfile):
                self.apply('21', revision='b'*64, cli={**PROFILE, 'request_mode': 'build'})
            self.assertFalse(old.removed)
            self.assertIs(self.app('21'), old)
            self.assertIs(self.fake.volumes.get('ccg-21-data'), volume)

    def test_new_authorization_runtime_uses_controller_default(self):
        with patch.dict(os.environ, {'CCG_DEFAULT_CLI_VERSION':'2.1.304'}), patch('manager.resolve_profile',return_value={'WORKER_CLI_VERSION':'2.1.304'}) as resolve:
            self.apply('22')
            self.assertEqual(self.m.state('22')['cli'],{**PROFILE,'version':'2.1.304','request_mode':'build'})
            self.assertEqual(resolve.call_args.args[2]['version'],'2.1.304')

    def test_new_default_does_not_upgrade_existing_302_container(self):
        with patch('manager.resolve_profile', return_value={}):
            self.apply('21', cli=PROFILE)
        old = self.app('21')
        with patch.dict(os.environ, {'CCG_DEFAULT_CLI_VERSION':'2.1.304'}), patch('manager.resolve_profile', side_effect=AssertionError('must reuse existing runtime')):
            self.apply('21', revision='b'*64)
        self.assertIs(self.app('21'), old)
        self.assertEqual(self.m.state('21')['cli'], PROFILE)
        self.assertFalse(old.removed)

    def test_creation_passes_version_and_disables_updaters(self):
        selected={'WORKER_CLI_PATH':'/opt/ccgateway/cli/2.1.302/claude','WORKER_CLI_VERSION':'2.1.302','CCG_CLI_PATCH':'ccgateway-v7-request-modes','CCG_CLI_SHA256':'a'*64,'CCG_REQUEST_MODE':'direct'}
        with patch('manager.resolve_profile', return_value=selected) as resolve, patch.object(self.fake.containers,'create',wraps=self.fake.containers.create) as create:
            self.apply('21',cli=PROFILE)
            call=next(x for x in create.call_args_list if x.kwargs.get('name')=='ccg-21-app')
            self.assertEqual(call.kwargs['environment']['DISABLE_AUTOUPDATER'],'1')
            for k,v in selected.items():self.assertEqual(call.kwargs['environment'][k],v)
            self.assertEqual(self.m.state('21')['cli'],PROFILE)
            resolve.assert_called_once()
            old=self.app('21')
            self.apply('21',cli=PROFILE)
            self.assertIs(self.app('21'),old)
            old_image = old.attrs['Image']
            self.fake.images.tags['app:retained'] = old_image  # Docker retains the running image after a tag moves.
            self.new_image()
            self.apply('21',revision='b'*64,cli={**PROFILE,'request_mode':'build'})
            self.assertFalse(old.removed)
            self.assertIs(self.app('21'),old)
            self.assertEqual(self.app('21').attrs['Image'],old_image)
            self.assertIn('ccg-21-data',self.fake.volumes.items)

    def test_active_runtime_version_does_not_recreate_account(self):
        with patch('manager.resolve_profile', return_value={}):
            self.apply('21', cli=PROFILE)
        old = self.app('21')
        state = self.m.state('21')
        state['active_runtime'] = {'version': '2.1.304', 'container_id': old.id,
                                   'container_identity': container_identity(old)}
        self.m.save('21', state)
        with patch('manager.resolve_profile', side_effect=AssertionError('must reuse activated runtime')):
            self.apply('21', revision='b'*64, cli={**PROFILE, 'version':'2.1.304','request_mode':'build'})
        self.assertIs(self.app('21'), old)
        self.assertFalse(old.removed)
        with self.assertRaises(InvalidCLIProfile):
            self.apply('21', revision='c'*64, cli={**PROFILE,'version':'2.1.305'})
        self.assertIs(self.app('21'), old)

    def test_bad_profile_does_not_replace_container(self):
        self.apply('21');old=self.app('21')
        for value in [{**PROFILE,'version':'../bad'},{**PROFILE,'disable_auto_update':False},{**PROFILE,'request_mode':'other'},{**PROFILE,'request_mode':'native'}]:
            with self.assertRaises(BadRequest):self.apply('21',cli=value)
            self.assertIs(self.app('21'),old)

    def test_missing_packaged_version_preserves_existing(self):
        self.apply('21');old=self.app('21')
        with patch('manager.resolve_profile',side_effect=ValueError('unavailable')):
            with self.assertRaises(ValueError):self.apply('21',cli=PROFILE)
        self.assertIs(self.app('21'),old)
