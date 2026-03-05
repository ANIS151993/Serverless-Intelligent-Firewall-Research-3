from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from sif.multi_tenant import SuperControlSystem, TenantSubsystem


class MultiTenantTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.repo_root = Path(self.temp_dir.name)
        self.super_control = SuperControlSystem(self.repo_root)

        created = self.super_control.create_tenant("Acme Corp", "secops@acme.example")
        self.tenant_id = created["tenant_id"]
        self.tenant_api_token = created["api_token"]
        self.node = TenantSubsystem(self.repo_root, self.tenant_id, "3.0.0")

        source_event = Path(__file__).resolve().parents[1] / "examples" / "events" / "ddos.json"
        self.event = json.loads(source_event.read_text(encoding="utf-8"))

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_tenant_asset_and_dashboard_flow(self):
        self.super_control.add_asset(
            self.tenant_id,
            asset_type="local-network",
            provider="onprem",
            name="HQ subnet",
            endpoint="10.0.0.0/24",
            criticality="high",
            tags=["hq", "production"],
        )
        self.super_control.add_asset(
            self.tenant_id,
            asset_type="cloud-service",
            provider="aws",
            name="Payments API",
            endpoint="https://payments.acme.example",
            criticality="critical",
            tags=["finance"],
        )

        result = self.node.protect_event(self.event, self.super_control)
        self.assertIn(result["decision"]["action"], {"CHALLENGE", "BLOCK"})

        tenant_dash = self.super_control.tenant_dashboard(self.tenant_id)
        self.assertEqual(len(tenant_dash["assets"]), 2)
        self.assertEqual(sum(tenant_dash["decision_distribution"].values()), 1)

        super_dash = self.super_control.super_dashboard()
        self.assertEqual(super_dash["tenant_count"], 1)
        self.assertEqual(super_dash["total_events"], 1)

    def test_upgrade_publication_and_sync(self):
        published = self.super_control.publish_upgrade(
            "3.1.0",
            "Enable federated policy acceleration and tenant dashboard patches",
            {"challenge_threshold": 52},
        )
        self.assertEqual(published["status"], "published")

        sync = self.node.sync_with_super(self.super_control)
        self.assertTrue(sync["upgrade_available"])
        self.assertEqual(sync["installed_version"], "3.1.0")

        sync2 = self.super_control.sync_tenant(self.tenant_id, "3.1.0")
        self.assertFalse(sync2["upgrade_available"])

    def test_tenant_lifecycle_controls(self):
        first_token = self.tenant_api_token

        rotated = self.super_control.rotate_tenant_api_token(self.tenant_id, actor="super_admin:admin")
        self.assertNotEqual(first_token, rotated["api_token"])
        self.assertTrue(self.super_control.validate_tenant_api_token(self.tenant_id, rotated["api_token"]))

        disabled = self.super_control.disable_tenant(self.tenant_id, actor="super_admin:admin", reason="investigation")
        self.assertEqual(disabled["status"], "disabled")
        self.assertFalse(self.super_control.validate_tenant_api_token(self.tenant_id, rotated["api_token"]))

        with self.assertRaises(PermissionError):
            self.node.protect_event(self.event, self.super_control)

        reactivated = self.super_control.reactivate_tenant(self.tenant_id, actor="super_admin:admin")
        self.assertEqual(reactivated["status"], "active")

        deleted = self.super_control.delete_tenant(self.tenant_id, actor="super_admin:admin")
        self.assertEqual(deleted["status"], "deleted")
        with self.assertRaises(PermissionError):
            self.super_control.tenant_dashboard(self.tenant_id)

        audit_events = self.super_control.list_audit(limit=30, tenant_id=self.tenant_id)
        actions = {item["action"] for item in audit_events}
        self.assertIn("tenant_token_rotated", actions)
        self.assertIn("tenant_disabled", actions)
        self.assertIn("tenant_reactivated", actions)
        self.assertIn("tenant_deleted", actions)


if __name__ == "__main__":
    unittest.main()
