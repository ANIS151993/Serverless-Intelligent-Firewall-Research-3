from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, Tuple
from urllib.parse import parse_qs, urlparse

from .multi_tenant import SuperControlSystem, TenantSubsystem


class ASLFOSINTApiHandler(BaseHTTPRequestHandler):
    super_control: SuperControlSystem = None  # type: ignore[assignment]
    tenant_nodes: Dict[str, TenantSubsystem] = {}

    def _read_json(self) -> Dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length > 0 else b"{}"
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            return {}

    def _send(self, status: int, payload: Dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _route(self) -> Tuple[str, list[str], Dict[str, list[str]]]:
        parsed = urlparse(self.path)
        parts = [segment for segment in parsed.path.split("/") if segment]
        return parsed.path, parts, parse_qs(parsed.query)

    def do_GET(self) -> None:  # noqa: N802
        _path, parts, query = self._route()

        if parts == ["health"]:
            self._send(200, {"status": "ok"})
            return

        if parts == ["super", "dashboard"]:
            self._send(200, self.super_control.super_dashboard())
            return

        if parts == ["super", "tenants"]:
            self._send(200, {"tenants": self.super_control.list_tenants()})
            return

        if len(parts) == 3 and parts[0] == "tenant" and parts[2] == "sync":
            tenant_id = parts[1]
            installed = query.get("version", ["0.0.0"])[0]
            try:
                payload = self.super_control.sync_tenant(tenant_id, installed)
            except KeyError as exc:
                self._send(404, {"error": str(exc)})
                return
            self._send(200, payload)
            return

        if len(parts) == 3 and parts[0] == "tenant" and parts[2] == "dashboard":
            tenant_id = parts[1]
            try:
                payload = self.super_control.tenant_dashboard(tenant_id)
            except KeyError as exc:
                self._send(404, {"error": str(exc)})
                return
            self._send(200, payload)
            return

        self._send(404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        _path, parts, _query = self._route()
        payload = self._read_json()

        if parts == ["super", "tenants"]:
            organization = payload.get("organization_name", "Unnamed Organization")
            email = payload.get("admin_email", "")
            result = self.super_control.create_tenant(organization, email)
            tenant_id = result["tenant_id"]
            self.tenant_nodes[tenant_id] = TenantSubsystem(Path.cwd(), tenant_id, self.super_control.platform_version)
            self._send(201, result)
            return

        if len(parts) == 4 and parts[0] == "super" and parts[1] == "tenants" and parts[3] == "assets":
            tenant_id = parts[2]
            try:
                asset = self.super_control.add_asset(
                    tenant_id,
                    asset_type=payload.get("asset_type", "service"),
                    provider=payload.get("provider", "unknown"),
                    name=payload.get("name", "Unnamed Asset"),
                    endpoint=payload.get("endpoint", ""),
                    criticality=payload.get("criticality", "medium"),
                    tags=payload.get("tags", []),
                )
            except KeyError as exc:
                self._send(404, {"error": str(exc)})
                return
            self._send(201, asset)
            return

        if parts == ["super", "upgrades"]:
            version = payload.get("version", "")
            notes = payload.get("release_notes", "")
            policy_patch = payload.get("policy_patch")
            result = self.super_control.publish_upgrade(version, notes, policy_patch)
            self._send(200, result)
            return

        if len(parts) == 3 and parts[0] == "tenant" and parts[2] == "events":
            tenant_id = parts[1]
            if tenant_id not in self.tenant_nodes:
                self.tenant_nodes[tenant_id] = TenantSubsystem(Path.cwd(), tenant_id, self.super_control.platform_version)
            node = self.tenant_nodes[tenant_id]
            try:
                result = node.protect_event(payload, self.super_control)
            except KeyError as exc:
                self._send(404, {"error": str(exc)})
                return
            self._send(200, result)
            return

        if len(parts) == 3 and parts[0] == "tenant" and parts[2] == "sync":
            tenant_id = parts[1]
            if tenant_id not in self.tenant_nodes:
                self.tenant_nodes[tenant_id] = TenantSubsystem(Path.cwd(), tenant_id, self.super_control.platform_version)
            node = self.tenant_nodes[tenant_id]
            result = node.sync_with_super(self.super_control)
            self._send(200, result)
            return

        self._send(404, {"error": "not_found"})


def serve(repo_root: Path, host: str = "0.0.0.0", port: int = 9000) -> None:
    handler_cls = ASLFOSINTApiHandler
    handler_cls.super_control = SuperControlSystem(repo_root)

    server = ThreadingHTTPServer((host, port), handler_cls)
    print(f"ASLF-OSINT API listening on http://{host}:{port}")
    server.serve_forever()
