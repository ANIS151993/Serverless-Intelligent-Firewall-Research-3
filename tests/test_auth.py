from __future__ import annotations

import os
import time
import unittest

from sif.auth import AuthClaims, JwtAuthManager, issue_super_admin_token, claims_allow_tenant, validate_super_credentials


class AuthTests(unittest.TestCase):
    def test_issue_and_verify_token(self):
        auth = JwtAuthManager("unit-test-secret")
        token = issue_super_admin_token(auth, "admin", ttl_seconds=120)
        payload = auth.verify_token(token)
        self.assertEqual(payload["role"], "super_admin")
        self.assertEqual(payload["sub"], "admin")

    def test_expired_token_rejected(self):
        auth = JwtAuthManager("unit-test-secret")
        claims = AuthClaims(sub="u", role="tenant_admin", tenant_id="tenant-1", iat=int(time.time()) - 10, exp=int(time.time()) - 1)
        token = auth.issue_token(claims)
        with self.assertRaises(ValueError):
            auth.verify_token(token)

    def test_tenant_scope_check(self):
        claims = {"role": "tenant_admin", "tenant_id": "tenant-a"}
        self.assertTrue(claims_allow_tenant(claims, "tenant-a"))
        self.assertFalse(claims_allow_tenant(claims, "tenant-b"))

    def test_super_credentials_env(self):
        old_user = os.getenv("ASLF_SUPER_ADMIN_USER")
        old_pass = os.getenv("ASLF_SUPER_ADMIN_PASS")
        try:
            os.environ["ASLF_SUPER_ADMIN_USER"] = "root-admin"
            os.environ["ASLF_SUPER_ADMIN_PASS"] = "very-secret"
            self.assertTrue(validate_super_credentials("root-admin", "very-secret"))
            self.assertFalse(validate_super_credentials("root-admin", "wrong"))
        finally:
            if old_user is None:
                os.environ.pop("ASLF_SUPER_ADMIN_USER", None)
            else:
                os.environ["ASLF_SUPER_ADMIN_USER"] = old_user
            if old_pass is None:
                os.environ.pop("ASLF_SUPER_ADMIN_PASS", None)
            else:
                os.environ["ASLF_SUPER_ADMIN_PASS"] = old_pass


if __name__ == "__main__":
    unittest.main()
