from __future__ import annotations

import base64
import hmac
import json
import os
import secrets
import time
from dataclasses import dataclass
from hashlib import sha256
from typing import Any, Dict, Iterable, Optional


@dataclass
class AuthClaims:
    sub: str
    role: str
    tenant_id: Optional[str]
    exp: int
    iat: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sub": self.sub,
            "role": self.role,
            "tenant_id": self.tenant_id,
            "exp": self.exp,
            "iat": self.iat,
        }


class JwtAuthManager:
    def __init__(self, secret: str) -> None:
        if not secret:
            raise ValueError("JWT secret must not be empty")
        self.secret = secret.encode("utf-8")

    def issue_token(self, claims: AuthClaims) -> str:
        header = {"alg": "HS256", "typ": "JWT"}
        header_b64 = self._b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
        payload_b64 = self._b64url_encode(json.dumps(claims.to_dict(), separators=(",", ":")).encode("utf-8"))
        msg = f"{header_b64}.{payload_b64}".encode("utf-8")
        signature = hmac.new(self.secret, msg, sha256).digest()
        sig_b64 = self._b64url_encode(signature)
        return f"{header_b64}.{payload_b64}.{sig_b64}"

    def verify_token(self, token: str) -> Dict[str, Any]:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("invalid_token_format")

        header_b64, payload_b64, sig_b64 = parts
        msg = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(self.secret, msg, sha256).digest()
        provided_sig = self._b64url_decode(sig_b64)
        if not hmac.compare_digest(expected_sig, provided_sig):
            raise ValueError("invalid_token_signature")

        payload = json.loads(self._b64url_decode(payload_b64).decode("utf-8"))
        now = int(time.time())
        exp = int(payload.get("exp", 0))
        if exp <= now:
            raise ValueError("token_expired")
        return payload

    @staticmethod
    def _b64url_encode(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")

    @staticmethod
    def _b64url_decode(data: str) -> bytes:
        padding = "=" * ((4 - len(data) % 4) % 4)
        return base64.urlsafe_b64decode((data + padding).encode("ascii"))


def issue_super_admin_token(auth: JwtAuthManager, username: str, ttl_seconds: int = 3600) -> str:
    now = int(time.time())
    claims = AuthClaims(
        sub=username,
        role="super_admin",
        tenant_id=None,
        exp=now + ttl_seconds,
        iat=now,
    )
    return auth.issue_token(claims)


def issue_tenant_token(auth: JwtAuthManager, tenant_id: str, ttl_seconds: int = 3600) -> str:
    now = int(time.time())
    claims = AuthClaims(
        sub=f"tenant:{tenant_id}",
        role="tenant_admin",
        tenant_id=tenant_id,
        exp=now + ttl_seconds,
        iat=now,
    )
    return auth.issue_token(claims)


def has_role(claims: Dict[str, Any], allowed_roles: Iterable[str]) -> bool:
    return str(claims.get("role", "")) in set(allowed_roles)


def claims_allow_tenant(claims: Dict[str, Any], tenant_id: str) -> bool:
    role = str(claims.get("role", ""))
    if role == "super_admin":
        return True
    return role in {"tenant_admin", "tenant_viewer"} and str(claims.get("tenant_id", "")) == tenant_id


def validate_super_credentials(username: str, password: str) -> bool:
    expected_user = os.getenv("ASLF_SUPER_ADMIN_USER", "admin")
    expected_pass = os.getenv("ASLF_SUPER_ADMIN_PASS", "change-me-now")
    expected_hash = os.getenv("ASLF_SUPER_ADMIN_PASS_SHA256", "")

    if username != expected_user:
        return False

    if expected_hash:
        digest = sha256(password.encode("utf-8")).hexdigest()
        return hmac.compare_digest(digest, expected_hash)

    return hmac.compare_digest(password, expected_pass)


def generate_api_secret() -> str:
    return secrets.token_urlsafe(32)
