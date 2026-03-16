import httpx

from app.config import Settings


class CloudflareAccessManager:
    def __init__(self, settings: Settings):
        self._settings = settings

    @property
    def enabled(self) -> bool:
        return bool(self._settings.cloudflare_account_id and self._settings.cloudflare_api_token)

    @property
    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._settings.cloudflare_api_token}",
            "Content-Type": "application/json",
        }

    @property
    def _apps_url(self) -> str:
        return (
            f"{self._settings.cloudflare_access_api_base}/accounts/"
            f"{self._settings.cloudflare_account_id}/access/apps"
        )

    async def create_client_app(self, subdomain: str, email: str) -> dict[str, object] | None:
        if not self.enabled:
            return None

        hostname = f"{subdomain}.{self._settings.public_client_domain}"
        payload = {
            "name": f"Client Dashboard - {subdomain}",
            "type": "self_hosted",
            "domain": hostname,
            "session_duration": self._settings.cloudflare_access_session_duration,
            "policies": [
                {
                    "name": f"Allow {subdomain}",
                    "decision": "allow",
                    "include": [{"email": {"email": email}}],
                    "exclude": [],
                    "require": [],
                }
            ],
        }
        async with httpx.AsyncClient(timeout=30) as http:
            response = await http.post(self._apps_url, headers=self._headers, json=payload)
        response.raise_for_status()
        body = response.json()
        if not body.get("success"):
            raise RuntimeError(str(body.get("errors") or body))
        result = body["result"]
        return {
            "id": result["id"],
            "aud": result.get("aud"),
            "domain": result.get("domain"),
            "policy_ids": [policy["id"] for policy in result.get("policies", [])],
        }

    async def delete_app(self, app_id: str) -> bool:
        if not self.enabled or not app_id:
            return False

        async with httpx.AsyncClient(timeout=30) as http:
            response = await http.delete(f"{self._apps_url}/{app_id}", headers=self._headers)

        if response.status_code == 404:
            return False
        response.raise_for_status()
        body = response.json()
        if not body.get("success"):
            raise RuntimeError(str(body.get("errors") or body))
        return True
