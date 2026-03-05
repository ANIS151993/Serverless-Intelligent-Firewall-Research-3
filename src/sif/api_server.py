from __future__ import annotations

import base64
import hashlib
import json
import os
import socket
import struct
import threading
import time
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, urlparse

from .auth import (
    JwtAuthManager,
    claims_allow_tenant,
    has_role,
    issue_super_admin_token,
    issue_tenant_token,
    load_jwt_auth_manager_from_env,
    validate_super_credentials,
)
from .multi_tenant import SuperControlSystem, TenantSubsystem


WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"


@dataclass
class _WsClient:
    connection: socket.socket
    lock: threading.Lock = field(default_factory=threading.Lock)
    tenant_id: Optional[str] = None


class ASLFOSINTApiHandler(BaseHTTPRequestHandler):
    super_control: SuperControlSystem = None  # type: ignore[assignment]
    auth_manager: JwtAuthManager = None  # type: ignore[assignment]

    tenant_nodes: Dict[str, TenantSubsystem] = {}
    state_lock = threading.Lock()

    ws_super: List[_WsClient] = []
    ws_tenant: Dict[str, List[_WsClient]] = {}
    ws_lock = threading.Lock()

    rate_windows: Dict[str, List[float]] = {}
    rate_lock = threading.Lock()
    auth_failures: Dict[str, List[float]] = {}
    auth_lockouts: Dict[str, float] = {}
    auth_lock = threading.Lock()

    allowed_origins: str = "*"

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
        self.send_header("Access-Control-Allow-Origin", self.allowed_origins)
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def _route(self) -> Tuple[str, List[str], Dict[str, List[str]]]:
        parsed = urlparse(self.path)
        parts = [segment for segment in parsed.path.split("/") if segment]
        return parsed.path, parts, parse_qs(parsed.query)

    def _extract_bearer_token(self) -> Optional[str]:
        authz = self.headers.get("Authorization", "")
        if not authz.startswith("Bearer "):
            return None
        return authz.split(" ", 1)[1].strip() or None

    def _require_claims(self) -> Optional[Dict[str, Any]]:
        token = self._extract_bearer_token()
        if not token:
            self._send(401, {"error": "missing_bearer_token"})
            return None
        try:
            return self.auth_manager.verify_token(token)
        except ValueError as exc:
            self._send(401, {"error": str(exc)})
            return None

    def _check_role(self, claims: Dict[str, Any], roles: List[str]) -> bool:
        if has_role(claims, roles):
            return True
        self._send(403, {"error": "forbidden_role"})
        return False

    def _check_tenant_scope(self, claims: Dict[str, Any], tenant_id: str) -> bool:
        if claims_allow_tenant(claims, tenant_id):
            return True
        self._send(403, {"error": "forbidden_tenant_scope"})
        return False

    def _validate_payload(self, payload: Dict[str, Any], required: Dict[str, type]) -> Optional[str]:
        for key, expected_type in required.items():
            if key not in payload:
                return f"missing_field:{key}"
            if not isinstance(payload[key], expected_type):
                return f"invalid_type:{key}"
        return None

    def _rate_limit(self, bucket: str, max_per_minute: int) -> bool:
        now = time.time()
        with self.rate_lock:
            values = self.rate_windows.get(bucket, [])
            cutoff = now - 60
            values = [item for item in values if item >= cutoff]
            if len(values) >= max_per_minute:
                self.rate_windows[bucket] = values
                return False
            values.append(now)
            self.rate_windows[bucket] = values
            return True

    def _auth_bucket(self, kind: str, identifier: str) -> str:
        return f"{kind}:{self.client_address[0]}:{identifier}"

    def _check_auth_lockout(self, bucket: str) -> bool:
        now = time.time()
        with self.auth_lock:
            until = self.auth_lockouts.get(bucket, 0.0)
            if until > now:
                retry_after = max(int(until - now), 1)
                self._send(
                    423,
                    {
                        "error": "auth_temporarily_locked",
                        "retry_after_seconds": retry_after,
                    },
                )
                return False
            if bucket in self.auth_lockouts and until <= now:
                self.auth_lockouts.pop(bucket, None)
        return True

    def _register_auth_success(self, bucket: str) -> None:
        with self.auth_lock:
            self.auth_failures.pop(bucket, None)
            self.auth_lockouts.pop(bucket, None)

    def _register_auth_failure(self, bucket: str) -> None:
        now = time.time()
        window_seconds = 300
        lockout_seconds = 300
        max_failures = 5
        with self.auth_lock:
            failures = self.auth_failures.get(bucket, [])
            cutoff = now - window_seconds
            failures = [item for item in failures if item >= cutoff]
            failures.append(now)
            self.auth_failures[bucket] = failures
            if len(failures) >= max_failures:
                self.auth_lockouts[bucket] = now + lockout_seconds

    def _claims_actor(self, claims: Dict[str, Any]) -> str:
        role = str(claims.get("role", "unknown"))
        subject = str(claims.get("sub", "anonymous"))
        return f"{role}:{subject}"

    def _ws_send_json(self, client: _WsClient, payload: Dict[str, Any]) -> bool:
        data = json.dumps(payload).encode("utf-8")
        try:
            frame = bytearray()
            frame.append(0x81)  # FIN + text
            length = len(data)
            if length < 126:
                frame.append(length)
            elif length < 65536:
                frame.append(126)
                frame.extend(struct.pack("!H", length))
            else:
                frame.append(127)
                frame.extend(struct.pack("!Q", length))
            frame.extend(data)
            with client.lock:
                client.connection.sendall(frame)
            return True
        except OSError:
            return False

    @classmethod
    def _broadcast_super(cls, payload: Dict[str, Any]) -> None:
        with cls.ws_lock:
            survivors: List[_WsClient] = []
            for client in cls.ws_super:
                if cls._send_ws_frame(client, {"type": "super_dashboard", "payload": payload}):
                    survivors.append(client)
            cls.ws_super = survivors

    @classmethod
    def _broadcast_tenant(cls, tenant_id: str, payload: Dict[str, Any]) -> None:
        with cls.ws_lock:
            current = cls.ws_tenant.get(tenant_id, [])
            survivors: List[_WsClient] = []
            for client in current:
                if cls._send_ws_frame(client, {"type": "tenant_dashboard", "payload": payload}):
                    survivors.append(client)
            if survivors:
                cls.ws_tenant[tenant_id] = survivors
            elif tenant_id in cls.ws_tenant:
                cls.ws_tenant.pop(tenant_id, None)

    @staticmethod
    def _send_ws_frame(client: _WsClient, payload: Dict[str, Any]) -> bool:
        try:
            data = json.dumps(payload).encode("utf-8")
            frame = bytearray([0x81])
            if len(data) < 126:
                frame.append(len(data))
            elif len(data) < 65536:
                frame.append(126)
                frame.extend(struct.pack("!H", len(data)))
            else:
                frame.append(127)
                frame.extend(struct.pack("!Q", len(data)))
            frame.extend(data)
            with client.lock:
                client.connection.sendall(frame)
            return True
        except OSError:
            return False

    def _push_updates(self, tenant_id: Optional[str] = None) -> None:
        with self.state_lock:
            super_payload = self.super_control.super_dashboard()
        self._broadcast_super(super_payload)
        if tenant_id:
            with self.state_lock:
                if self.super_control.tenant_exists(tenant_id):
                    try:
                        tenant_payload = self.super_control.tenant_dashboard(tenant_id)
                    except PermissionError:
                        tenant_payload = None
                else:
                    tenant_payload = None
            if tenant_payload:
                self._broadcast_tenant(tenant_id, tenant_payload)

    def _recv_exact(self, conn: socket.socket, size: int) -> bytes:
        data = b""
        while len(data) < size:
            chunk = conn.recv(size - len(data))
            if not chunk:
                raise ConnectionError("socket_closed")
            data += chunk
        return data

    def _handle_websocket(self, parts: List[str], query: Dict[str, List[str]]) -> None:
        token = (query.get("token", [""])[0] or "").strip()
        if not token:
            self._send(401, {"error": "missing_ws_token"})
            return

        try:
            claims = self.auth_manager.verify_token(token)
        except ValueError as exc:
            self._send(401, {"error": str(exc)})
            return

        ws_kind = ""
        ws_tenant_id: Optional[str] = None
        if parts == ["ws", "super"]:
            if not has_role(claims, ["super_admin"]):
                self._send(403, {"error": "forbidden_role"})
                return
            ws_kind = "super"
        elif len(parts) == 3 and parts[0] == "ws" and parts[1] == "tenant":
            ws_tenant_id = parts[2]
            if not claims_allow_tenant(claims, ws_tenant_id):
                self._send(403, {"error": "forbidden_tenant_scope"})
                return
            ws_kind = "tenant"
        else:
            self._send(404, {"error": "not_found"})
            return

        key = self.headers.get("Sec-WebSocket-Key", "")
        if not key:
            self._send(400, {"error": "missing_sec_websocket_key"})
            return

        accept_raw = hashlib.sha1((key + WS_GUID).encode("utf-8")).digest()
        accept_val = base64.b64encode(accept_raw).decode("ascii")

        self.send_response(101, "Switching Protocols")
        self.send_header("Upgrade", "websocket")
        self.send_header("Connection", "Upgrade")
        self.send_header("Sec-WebSocket-Accept", accept_val)
        self.end_headers()

        client = _WsClient(connection=self.connection, tenant_id=ws_tenant_id)
        with self.ws_lock:
            if ws_kind == "super":
                self.ws_super.append(client)
            else:
                self.ws_tenant.setdefault(ws_tenant_id or "", []).append(client)

        # Initial snapshot push.
        with self.state_lock:
            if ws_kind == "super":
                initial = {"type": "super_dashboard", "payload": self.super_control.super_dashboard()}
            else:
                try:
                    initial = {
                        "type": "tenant_dashboard",
                        "payload": self.super_control.tenant_dashboard(ws_tenant_id or ""),
                    }
                except PermissionError:
                    initial = {
                        "type": "tenant_dashboard",
                        "payload": {"error": "tenant_not_active"},
                    }
        self._send_ws_frame(client, initial)

        self.connection.settimeout(1.0)
        try:
            while True:
                try:
                    header = self.connection.recv(2)
                except socket.timeout:
                    continue
                if not header:
                    break
                b1, b2 = header[0], header[1]
                opcode = b1 & 0x0F
                masked = (b2 & 0x80) != 0
                length = b2 & 0x7F

                if length == 126:
                    length = struct.unpack("!H", self._recv_exact(self.connection, 2))[0]
                elif length == 127:
                    length = struct.unpack("!Q", self._recv_exact(self.connection, 8))[0]

                mask = self._recv_exact(self.connection, 4) if masked else b""
                payload = self._recv_exact(self.connection, length) if length > 0 else b""

                if masked and payload:
                    payload = bytes(payload[i] ^ mask[i % 4] for i in range(len(payload)))

                if opcode == 0x8:  # close
                    break
                if opcode == 0x9:  # ping
                    pong = bytearray([0x8A, len(payload)])
                    pong.extend(payload)
                    with client.lock:
                        self.connection.sendall(pong)
        except (ConnectionError, OSError):
            pass
        finally:
            with self.ws_lock:
                if ws_kind == "super":
                    self.ws_super = [item for item in self.ws_super if item is not client]
                else:
                    items = self.ws_tenant.get(ws_tenant_id or "", [])
                    items = [item for item in items if item is not client]
                    if items:
                        self.ws_tenant[ws_tenant_id or ""] = items
                    elif ws_tenant_id:
                        self.ws_tenant.pop(ws_tenant_id, None)
            try:
                self.connection.close()
            except OSError:
                pass

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", self.allowed_origins)
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        _path, parts, query = self._route()

        if self.headers.get("Upgrade", "").lower() == "websocket":
            self._handle_websocket(parts, query)
            return

        if not self._rate_limit(f"{self.client_address[0]}:GET:{_path}", max_per_minute=240):
            self._send(429, {"error": "rate_limit_exceeded"})
            return

        if parts == ["health"]:
            self._send(200, {"status": "ok"})
            return

        claims: Optional[Dict[str, Any]] = None

        if parts == ["super", "dashboard"]:
            claims = self._require_claims()
            if not claims or not self._check_role(claims, ["super_admin"]):
                return
            with self.state_lock:
                payload = self.super_control.super_dashboard()
            self._send(200, payload)
            return

        if parts == ["super", "tenants"]:
            claims = self._require_claims()
            if not claims or not self._check_role(claims, ["super_admin"]):
                return
            with self.state_lock:
                tenants = self.super_control.list_tenants()
            self._send(200, {"tenants": tenants})
            return

        if len(parts) == 3 and parts[0] == "super" and parts[1] == "tenants":
            claims = self._require_claims()
            if not claims or not self._check_role(claims, ["super_admin"]):
                return
            tenant_id = parts[2]
            with self.state_lock:
                try:
                    tenant = self.super_control.get_tenant(tenant_id)
                except KeyError as exc:
                    self._send(404, {"error": str(exc)})
                    return
            self._send(200, tenant)
            return

        if parts == ["super", "audit"]:
            claims = self._require_claims()
            if not claims or not self._check_role(claims, ["super_admin"]):
                return
            tenant_id = (query.get("tenant_id", [""])[0] or "").strip() or None
            limit_raw = (query.get("limit", ["100"])[0] or "100").strip()
            try:
                limit = int(limit_raw)
            except ValueError:
                self._send(400, {"error": "invalid_limit"})
                return
            with self.state_lock:
                events = self.super_control.list_audit(limit=limit, tenant_id=tenant_id)
            self._send(200, {"events": events})
            return

        if len(parts) == 3 and parts[0] == "tenant" and parts[2] == "sync":
            tenant_id = parts[1]
            claims = self._require_claims()
            if not claims or not self._check_tenant_scope(claims, tenant_id):
                return
            installed = query.get("version", ["0.0.0"])[0]
            with self.state_lock:
                try:
                    payload = self.super_control.sync_tenant(tenant_id, installed)
                except KeyError as exc:
                    self._send(404, {"error": str(exc)})
                    return
                except PermissionError as exc:
                    self._send(403, {"error": str(exc)})
                    return
            self._push_updates(tenant_id)
            self._send(200, payload)
            return

        if len(parts) == 3 and parts[0] == "tenant" and parts[2] == "dashboard":
            tenant_id = parts[1]
            claims = self._require_claims()
            if not claims or not self._check_tenant_scope(claims, tenant_id):
                return
            with self.state_lock:
                try:
                    payload = self.super_control.tenant_dashboard(tenant_id)
                except KeyError as exc:
                    self._send(404, {"error": str(exc)})
                    return
                except PermissionError as exc:
                    self._send(403, {"error": str(exc)})
                    return
            self._send(200, payload)
            return

        self._send(404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        _path, parts, _query = self._route()

        if not self._rate_limit(f"{self.client_address[0]}:POST:{_path}", max_per_minute=180):
            self._send(429, {"error": "rate_limit_exceeded"})
            return

        payload = self._read_json()

        # Auth endpoints
        if parts == ["auth", "super", "login"]:
            if not self._rate_limit(f"{self.client_address[0]}:AUTH:SUPER", max_per_minute=30):
                self._send(429, {"error": "rate_limit_exceeded"})
                return
            err = self._validate_payload(payload, {"username": str, "password": str})
            if err:
                self._send(400, {"error": err})
                return
            auth_bucket = self._auth_bucket("super", payload["username"])
            if not self._check_auth_lockout(auth_bucket):
                return
            if not validate_super_credentials(payload["username"], payload["password"]):
                self._register_auth_failure(auth_bucket)
                self._send(401, {"error": "invalid_credentials"})
                return
            self._register_auth_success(auth_bucket)
            ttl_seconds = int(os.getenv("ASLF_SUPER_TOKEN_TTL_SECONDS", "3600"))
            token = issue_super_admin_token(self.auth_manager, payload["username"], ttl_seconds=ttl_seconds)
            self._send(200, {"token": token, "role": "super_admin"})
            return

        if parts == ["auth", "tenant", "login"]:
            if not self._rate_limit(f"{self.client_address[0]}:AUTH:TENANT", max_per_minute=45):
                self._send(429, {"error": "rate_limit_exceeded"})
                return
            err = self._validate_payload(payload, {"tenant_id": str, "api_token": str})
            if err:
                self._send(400, {"error": err})
                return
            tenant_id = payload["tenant_id"]
            auth_bucket = self._auth_bucket("tenant", tenant_id)
            if not self._check_auth_lockout(auth_bucket):
                return
            with self.state_lock:
                try:
                    valid = self.super_control.validate_tenant_api_token(tenant_id, payload["api_token"])
                except KeyError:
                    self._send(404, {"error": "unknown_tenant"})
                    return
            if not valid:
                self._register_auth_failure(auth_bucket)
                self._send(401, {"error": "invalid_tenant_credentials"})
                return
            self._register_auth_success(auth_bucket)
            ttl_seconds = int(os.getenv("ASLF_TENANT_TOKEN_TTL_SECONDS", "3600"))
            token = issue_tenant_token(self.auth_manager, tenant_id, ttl_seconds=ttl_seconds)
            self._send(200, {"token": token, "role": "tenant_admin", "tenant_id": tenant_id})
            return

        claims = self._require_claims()
        if not claims:
            return

        if parts == ["super", "tenants"]:
            if not self._check_role(claims, ["super_admin"]):
                return
            err = self._validate_payload(payload, {"organization_name": str, "admin_email": str})
            if err:
                self._send(400, {"error": err})
                return
            with self.state_lock:
                result = self.super_control.create_tenant(payload["organization_name"], payload["admin_email"])
                tenant_id = result["tenant_id"]
                self.tenant_nodes[tenant_id] = TenantSubsystem(
                    self.super_control.repo_root,
                    tenant_id,
                    self.super_control.platform_version,
                )
            self._push_updates(tenant_id)
            self._send(201, result)
            return

        if len(parts) == 4 and parts[0] == "super" and parts[1] == "tenants" and parts[3] == "assets":
            if not self._check_role(claims, ["super_admin"]):
                return
            tenant_id = parts[2]
            err = self._validate_payload(
                payload,
                {
                    "asset_type": str,
                    "provider": str,
                    "name": str,
                    "endpoint": str,
                },
            )
            if err:
                self._send(400, {"error": err})
                return
            with self.state_lock:
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
                except PermissionError as exc:
                    self._send(403, {"error": str(exc)})
                    return
            self._push_updates(tenant_id)
            self._send(201, asset)
            return

        if len(parts) == 4 and parts[0] == "super" and parts[1] == "tenants" and parts[3] == "disable":
            if not self._check_role(claims, ["super_admin"]):
                return
            tenant_id = parts[2]
            reason = str(payload.get("reason", "admin_request"))
            actor = self._claims_actor(claims)
            with self.state_lock:
                try:
                    result = self.super_control.disable_tenant(tenant_id, actor=actor, reason=reason)
                except KeyError as exc:
                    self._send(404, {"error": str(exc)})
                    return
                except PermissionError as exc:
                    self._send(403, {"error": str(exc)})
                    return
            self._push_updates(tenant_id)
            self._send(200, result)
            return

        if len(parts) == 4 and parts[0] == "super" and parts[1] == "tenants" and parts[3] == "reactivate":
            if not self._check_role(claims, ["super_admin"]):
                return
            tenant_id = parts[2]
            actor = self._claims_actor(claims)
            with self.state_lock:
                try:
                    result = self.super_control.reactivate_tenant(tenant_id, actor=actor)
                except KeyError as exc:
                    self._send(404, {"error": str(exc)})
                    return
                except PermissionError as exc:
                    self._send(403, {"error": str(exc)})
                    return
            self._push_updates(tenant_id)
            self._send(200, result)
            return

        if len(parts) == 4 and parts[0] == "super" and parts[1] == "tenants" and parts[3] == "rotate-token":
            if not self._check_role(claims, ["super_admin"]):
                return
            tenant_id = parts[2]
            actor = self._claims_actor(claims)
            with self.state_lock:
                try:
                    result = self.super_control.rotate_tenant_api_token(tenant_id, actor=actor)
                except KeyError as exc:
                    self._send(404, {"error": str(exc)})
                    return
                except PermissionError as exc:
                    self._send(403, {"error": str(exc)})
                    return
            self._push_updates(tenant_id)
            self._send(200, result)
            return

        if parts == ["super", "upgrades"]:
            if not self._check_role(claims, ["super_admin"]):
                return
            err = self._validate_payload(payload, {"version": str, "release_notes": str})
            if err:
                self._send(400, {"error": err})
                return
            with self.state_lock:
                result = self.super_control.publish_upgrade(payload["version"], payload["release_notes"], payload.get("policy_patch"))
            self._push_updates()
            self._send(200, result)
            return

        if len(parts) == 3 and parts[0] == "tenant" and parts[2] == "events":
            tenant_id = parts[1]
            if not self._check_tenant_scope(claims, tenant_id):
                return
            with self.state_lock:
                if tenant_id not in self.tenant_nodes:
                    self.tenant_nodes[tenant_id] = TenantSubsystem(
                        self.super_control.repo_root,
                        tenant_id,
                        self.super_control.platform_version,
                    )
                node = self.tenant_nodes[tenant_id]
                try:
                    result = node.protect_event(payload, self.super_control)
                except KeyError as exc:
                    self._send(404, {"error": str(exc)})
                    return
                except PermissionError as exc:
                    self._send(403, {"error": str(exc)})
                    return
            self._push_updates(tenant_id)
            self._send(200, result)
            return

        if len(parts) == 3 and parts[0] == "tenant" and parts[2] == "sync":
            tenant_id = parts[1]
            if not self._check_tenant_scope(claims, tenant_id):
                return
            with self.state_lock:
                if tenant_id not in self.tenant_nodes:
                    self.tenant_nodes[tenant_id] = TenantSubsystem(
                        self.super_control.repo_root,
                        tenant_id,
                        self.super_control.platform_version,
                    )
                node = self.tenant_nodes[tenant_id]
                try:
                    result = node.sync_with_super(self.super_control)
                except PermissionError as exc:
                    self._send(403, {"error": str(exc)})
                    return
            self._push_updates(tenant_id)
            self._send(200, result)
            return

        self._send(404, {"error": "not_found"})

    def do_DELETE(self) -> None:  # noqa: N802
        _path, parts, query = self._route()

        if not self._rate_limit(f"{self.client_address[0]}:DELETE:{_path}", max_per_minute=120):
            self._send(429, {"error": "rate_limit_exceeded"})
            return

        claims = self._require_claims()
        if not claims:
            return

        if len(parts) == 3 and parts[0] == "super" and parts[1] == "tenants":
            if not self._check_role(claims, ["super_admin"]):
                return
            tenant_id = parts[2]
            hard_delete = (query.get("hard", ["false"])[0] or "false").lower() in {"1", "true", "yes", "y"}
            actor = self._claims_actor(claims)
            with self.state_lock:
                try:
                    result = self.super_control.delete_tenant(tenant_id, actor=actor, hard_delete=hard_delete)
                except KeyError as exc:
                    self._send(404, {"error": str(exc)})
                    return
            self.tenant_nodes.pop(tenant_id, None)
            self._push_updates()
            self._send(200, result)
            return

        self._send(404, {"error": "not_found"})


def serve(repo_root: Path, host: str = "0.0.0.0", port: int = 9000) -> None:
    handler_cls = ASLFOSINTApiHandler
    handler_cls.super_control = SuperControlSystem(repo_root)

    handler_cls.auth_manager = load_jwt_auth_manager_from_env()
    handler_cls.allowed_origins = os.getenv("ASLF_ALLOWED_ORIGINS", "*")

    server = ThreadingHTTPServer((host, port), handler_cls)
    print(f"ASLF-OSINT API listening on http://{host}:{port}")
    print("Auth endpoints: POST /auth/super/login, POST /auth/tenant/login")
    server.serve_forever()
