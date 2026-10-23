import unittest
from manager import upstream_headers


class HeadersTests(unittest.TestCase):
    def test_pass_through_carries_only_the_account_admin_key(self):
        # The model relay that forwarded anthropic-* and session headers is
        # gone (the core reaches the Worker through connection/tunnel).
        self.assertEqual(upstream_headers('account-key'),
                         {'Authorization': 'Bearer account-key', 'Content-Type': 'application/json'})
