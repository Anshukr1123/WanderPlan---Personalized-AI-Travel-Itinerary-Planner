"""Unified Async/Sync HTTP Client with automatic fallback to urllib when httpx is not yet installed."""
from __future__ import annotations
import json
import urllib.request
import urllib.error
import urllib.parse
from typing import Dict, Any, Optional

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False

class SimpleResponse:
    def __init__(self, status_code: int, content: bytes, headers: Optional[Dict[str, str]] = None):
        self.status_code = status_code
        self.content = content
        self.headers = headers or {}
        self.text = content.decode("utf-8", errors="replace")

    def json(self) -> Any:
        return json.loads(self.text)

class FallbackAsyncClient:
    """AsyncClient wrapper utilizing urllib when httpx is absent."""
    def __init__(self, timeout: float = 30.0):
        self.timeout = timeout

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

    async def get(self, url: str, headers: Optional[Dict[str, str]] = None, params: Optional[Dict[str, Any]] = None):
        if params:
            query = urllib.parse.urlencode(params)
            url = f"{url}?{query}" if "?" not in url else f"{url}&{query}"
        req = urllib.request.Request(url, headers=headers or {}, method="GET")
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                resp_headers = {k.lower(): v for k, v in resp.headers.items()}
                return SimpleResponse(resp.status, resp.read(), resp_headers)
        except urllib.error.HTTPError as err:
            resp_headers = {k.lower(): v for k, v in err.headers.items()}
            return SimpleResponse(err.code, err.read(), resp_headers)

    async def post(self, url: str, headers: Optional[Dict[str, str]] = None, json: Optional[Any] = None):
        data = None
        req_headers = headers.copy() if headers else {}
        if json is not None:
            import json as _json
            data = _json.dumps(json).encode("utf-8")
            if "content-type" not in [k.lower() for k in req_headers]:
                req_headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=data, headers=req_headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                resp_headers = {k.lower(): v for k, v in resp.headers.items()}
                return SimpleResponse(resp.status, resp.read(), resp_headers)
        except urllib.error.HTTPError as err:
            resp_headers = {k.lower(): v for k, v in err.headers.items()}
            return SimpleResponse(err.code, err.read(), resp_headers)

    async def patch(self, url: str, headers: Optional[Dict[str, str]] = None, json: Optional[Any] = None):
        data = None
        req_headers = headers.copy() if headers else {}
        if json is not None:
            import json as _json
            data = _json.dumps(json).encode("utf-8")
            if "content-type" not in [k.lower() for k in req_headers]:
                req_headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=data, headers=req_headers, method="PATCH")
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                resp_headers = {k.lower(): v for k, v in resp.headers.items()}
                return SimpleResponse(resp.status, resp.read(), resp_headers)
        except urllib.error.HTTPError as err:
            resp_headers = {k.lower(): v for k, v in err.headers.items()}
            return SimpleResponse(err.code, err.read(), resp_headers)

    async def delete(self, url: str, headers: Optional[Dict[str, str]] = None):
        req = urllib.request.Request(url, headers=headers or {}, method="DELETE")
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                resp_headers = {k.lower(): v for k, v in resp.headers.items()}
                return SimpleResponse(resp.status, resp.read(), resp_headers)
        except urllib.error.HTTPError as err:
            resp_headers = {k.lower(): v for k, v in err.headers.items()}
            return SimpleResponse(err.code, err.read(), resp_headers)


def get_async_client(timeout: float = 30.0):
    if HAS_HTTPX:
        return httpx.AsyncClient(timeout=timeout)
    return FallbackAsyncClient(timeout=timeout)
