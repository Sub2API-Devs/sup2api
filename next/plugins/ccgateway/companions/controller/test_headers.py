import unittest
from email.message import Message
from manager import upstream_headers


class HeadersTests(unittest.TestCase):
    def test_session_headers_survive_without_forwarding_caller_credentials(self):
        inbound = Message()
        inbound['X-CCGateway-Session-ID'] = 'conversation-a'
        inbound['X-CCGateway-Session-Scope'] = 'user:12:key:34'
        inbound['X-CCGateway-Request-Policy'] = '{"unknown_beta":"reject"}'
        inbound['Authorization'] = 'Bearer caller-secret'
        inbound['X-Api-Key'] = 'caller-key'
        result = upstream_headers(inbound, 'account-key')
        self.assertEqual(result['x-ccgateway-session-id'], 'conversation-a')
        self.assertEqual(result['x-ccgateway-session-scope'], 'user:12:key:34')
        self.assertEqual(result['Authorization'], 'Bearer account-key')
        self.assertEqual(result['x-ccgateway-request-policy'], '{"unknown_beta":"reject"}')
        self.assertNotIn('caller-secret', str(result))
        self.assertNotIn('caller-key', str(result))
