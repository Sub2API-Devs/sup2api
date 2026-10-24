import unittest
from common import admin_headers


class HeadersTests(unittest.TestCase):
    def test_pass_through_carries_only_the_account_admin_key(self):
        # The model relay that forwarded anthropic-* and session headers is
        # gone (the core reaches the Worker through connection/tunnel).
        self.assertEqual(admin_headers({'admin_key': 'account-key', 'api_key': 'gateway-key'}),
                         {'Authorization': 'Bearer account-key', 'Content-Type': 'application/json'})
