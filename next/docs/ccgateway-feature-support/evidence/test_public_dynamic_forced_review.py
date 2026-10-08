"""Independent offline boundary tests; never contact a provider."""
import copy
import contextlib
import io
import json
import unittest
from unittest.mock import patch
import public_dynamic_mcp as dynamic
import public_forced_mixed as forced
from live_api_smoke import Probe
from test_public_dynamic_forced import FakeProbe, dynamic_message, message

class IndependentProbeReview(unittest.TestCase):
    def setUp(self):
        self.guard = patch('urllib.request.OpenerDirector.open', side_effect=AssertionError('network forbidden'))
        self.guard.start()
        self.addCleanup(self.guard.stop)

    def test_dynamic_second_failure_stops_and_no_future_history(self):
        for mode in ('changed-schema', 'repeat-id', 'foreign-server', 'pause'):
            first = dynamic_message(0)
            second = dynamic_message(1, mode == 'changed-schema')
            if mode == 'changed-schema': second['content'][0]['tools'][0]['input_schema'] = {'type':'array'}
            if mode == 'repeat-id': second = copy.deepcopy(first)
            if mode == 'foreign-server': second['content'][2]['server_name'] = 'foreign'
            if mode == 'pause': second['stop_reason'] = 'pause_turn'
            p = FakeProbe([first, second])
            report = dynamic.run(p)
            self.assertFalse(report['passed'], mode)
            self.assertEqual(len(p.requests), 2)
            self.assertEqual(p.requests[1]['messages'][1]['content'], first['content'])
            for request in p.requests:
                self.assertNotIn('tools', request['tools'][1])
                self.assertEqual(set(request['mcp_servers'][0]), {'name','type','url'})

    def test_forced_refusal_does_not_continue_and_catalog_unchanged(self):
        first = message([{'type':'tool_use','name':forced.TOOL,'id':'fixture-id','input':{'key':'fixture'}}], 'tool_use')
        refused = message([{'type':'text','text':'private response sentinel'}], 'refusal')
        p = FakeProbe([first,refused])
        report = forced.run(p)
        self.assertFalse(report['passed'])
        self.assertEqual(len(p.requests),2)
        self.assertEqual(p.requests[0]['tools'],p.requests[1]['tools'])
        self.assertEqual(p.requests[1]['messages'][1]['content'],first['content'])
        self.assertNotIn('private response sentinel',json.dumps(report))

    def test_actual_probe_http_failure_single_attempt_sanitized(self):
        class Reply:
            status=429
            headers={'Content-Type':'application/json','X-Request-Id':'raw-request-identity'}
            def __enter__(self): return self
            def __exit__(self,*args): pass
            def read(self,n): return json.dumps({'type':'error','error':{'type':'rate_limit_error','message':'secret-key-sentinel private-error-body'}}).encode()
        for runner in (dynamic.run,forced.run):
            p = Probe('https://offline.invalid','secret-key-sentinel','fixture')
            with patch.object(p.opener,'open',return_value=Reply()) as opening, contextlib.redirect_stdout(io.StringIO()):
                report = runner(p)
            self.assertEqual(opening.call_count,1)
            self.assertFalse(report['passed'])
            output=json.dumps(report)
            for raw in ('secret-key-sentinel','private-error-body','raw-request-identity'):
                self.assertNotIn(raw,output)
            self.assertEqual(report['results'][0]['status'],429)

    def test_actual_probe_refusal_is_protocol_success_fixture_failure(self):
        class Reply:
            status=200
            headers={'Content-Type':'application/json'}
            def __enter__(self): return self
            def __exit__(self,*args): pass
            def read(self,n): return json.dumps(message([{'type':'text','text':'private refusal text'}],'refusal')).encode()
        for runner in (dynamic.run,forced.run):
            p=Probe('https://offline.invalid','dummy-key','fixture')
            with patch.object(p.opener,'open',return_value=Reply()) as opening, contextlib.redirect_stdout(io.StringIO()):
                report=runner(p)
            self.assertEqual(opening.call_count,1)
            self.assertFalse(report['passed'])
            self.assertTrue(report['results'][0]['protocol_passed'])
            self.assertEqual(report['results'][0]['outcome'],'normal_provider_refusal')
            self.assertNotIn('private refusal text',json.dumps(report))

if __name__=='__main__': unittest.main()
