from __future__ import annotations

import json
import tempfile
import threading
import unittest
from pathlib import Path
from urllib import error, request

from http.server import ThreadingHTTPServer

from sif.api_server import ASLFOSINTApiHandler
from sif.auth import JwtAuthManager
from sif.multi_tenant import SuperControlSystem


class ApiSecurityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.server = None
        self.thread = None
        self.temp_dir = tempfile.TemporaryDirectory()
        self.repo_root = Path(self.temp_dir.name)

        handler = ASLFOSINTApiHandler
        handler.super_control = SuperControlSystem(self.repo_root)
        handler.auth_manager = JwtAuthManager("api-test-secret")
        handler.tenant_nodes = {}
        handler.ws_super = []
        handler.ws_tenant = {}
        handler.rate_windows = {}
        handler.allowed_origins = "*"

        try:
            self.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        except PermissionError:
            self.temp_dir.cleanup()
            self.skipTest("socket_bind_not_permitted_in_this_environment")
        self.base = f"http://127.0.0.1:{self.server.server_port}"
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self) -> None:
        if self.server is not None:
            self.server.shutdown()
            self.server.server_close()
        if self.thread is not None:
            self.thread.join(timeout=2)
        self.temp_dir.cleanup()

    def _request(self, method: str, path: str, payload: dict | None = None, token: str | None = None):
        data = None
        headers = {"Content-Type": "application/json"}
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
        if token:
            headers["Authorization"] = f"Bearer {token}"
        req = request.Request(f"{self.base}{path}", data=data, headers=headers, method=method)
        try:
            with request.urlopen(req, timeout=5) as resp:
                body = resp.read().decode("utf-8")
                return resp.status, json.loads(body)
        except error.HTTPError as exc:
            body = exc.read().decode("utf-8")
            parsed = json.loads(body) if body else {}
            return exc.code, parsed

    def test_auth_rbac_flow(self):
        status, _ = self._request("GET", "/super/dashboard")
        self.assertEqual(status, 401)

        status, login = self._request(
            "POST",
            "/auth/super/login",
            {"username": "admin", "password": "change-me-now"},
        )
        self.assertEqual(status, 200)
        super_token = login["token"]

        status, dashboard = self._request("GET", "/super/dashboard", token=super_token)
        self.assertEqual(status, 200)
        self.assertIn("tenant_count", dashboard)

        status, created = self._request(
            "POST",
            "/super/tenants",
            {"organization_name": "Acme Corp", "admin_email": "soc@acme.example"},
            token=super_token,
        )
        self.assertEqual(status, 201)
        tenant_id = created["tenant_id"]
        api_token = created["api_token"]

        status, tenant_login = self._request(
            "POST",
            "/auth/tenant/login",
            {"tenant_id": tenant_id, "api_token": api_token},
        )
        self.assertEqual(status, 200)
        tenant_token = tenant_login["token"]

        status, _ = self._request("GET", "/super/dashboard", token=tenant_token)
        self.assertEqual(status, 403)

        status, tenant_dash = self._request("GET", f"/tenant/{tenant_id}/dashboard", token=tenant_token)
        self.assertEqual(status, 200)
        self.assertIn("tenant", tenant_dash)

        status, _ = self._request("GET", "/tenant/tenant-other/dashboard", token=tenant_token)
        self.assertEqual(status, 403)

        sample_event = {
            "event_id": "evt-api-1",
            "provider": "aws",
            "src_ip": "198.51.100.20",
            "dst_service": "gateway",
            "protocol": "https",
            "requests_per_second": 700,
            "failed_auth": 6,
            "geo_velocity": 3,
            "anomaly_score": 81,
            "lateral_hops": 2,
            "policy_drift": 19,
            "payload_entropy": 7.7,
            "identity_confidence": 0.6,
            "mfa_verified": True,
            "user_id": "api-tester",
        }
        status, result = self._request("POST", f"/tenant/{tenant_id}/events", sample_event, token=tenant_token)
        self.assertEqual(status, 200)
        self.assertIn("decision", result)


if __name__ == "__main__":
    unittest.main()
