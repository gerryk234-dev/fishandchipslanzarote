#!/usr/bin/env python3
"""
wp_client.py — zero-dependency WordPress REST API client + CLI.

Talks to a WordPress site's REST API using an Application Password.
Uses only the Python 3 standard library (no `pip install` needed).

Credentials are read from environment variables (or a local `.env` file):

    WP_URL           e.g. https://excursionsticketsdirect.com
    WP_USER          your WordPress username (or email)
    WP_APP_PASSWORD  an Application Password (Users -> Profile -> Application Passwords)

Never hard-code credentials in this file. Never commit your `.env`.

Quick start:
    cp .env.example .env      # then fill in your details
    python3 wp_client.py test

See README.md for the full command reference.
"""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any


# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #
def load_dotenv(path: str = ".env") -> None:
    """Load KEY=VALUE lines from a .env file into os.environ (no overwrite).

    Deliberately minimal: ignores blank lines and `#` comments, strips
    surrounding quotes. Existing environment variables take precedence.
    """
    p = Path(path)
    if not p.is_file():
        return
    for raw in p.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


class WPError(Exception):
    """Raised for HTTP / API errors, carrying status code and server body."""

    def __init__(self, message: str, status: int | None = None, body: Any = None):
        super().__init__(message)
        self.status = status
        self.body = body


class WPClient:
    """A tiny WordPress REST API client using Application Password auth."""

    def __init__(self, url: str, user: str, app_password: str, timeout: int = 30):
        if not url or not user or not app_password:
            raise WPError(
                "Missing credentials. Set WP_URL, WP_USER and WP_APP_PASSWORD "
                "(env vars or a .env file). See README.md."
            )
        self.base = url.rstrip("/")
        self.api = f"{self.base}/wp-json"
        # Application Passwords are shown with spaces for readability; the
        # spaces are not part of the secret, so strip them.
        app_password = app_password.replace(" ", "")
        token = base64.b64encode(f"{user}:{app_password}".encode()).decode()
        self._auth_header = f"Basic {token}"
        self.timeout = timeout

    # -- low-level request ------------------------------------------------- #
    def request(
        self,
        method: str,
        path: str,
        *,
        params: dict | None = None,
        data: Any = None,
        raw_body: bytes | None = None,
        content_type: str | None = None,
        authed: bool = True,
    ) -> Any:
        """Perform a request against the REST API and return decoded JSON.

        `path` may be absolute (starts with http) or relative to /wp-json,
        e.g. "/wp/v2/posts".
        """
        if path.startswith("http"):
            base_url = path
        else:
            base_url = f"{self.api}/{path.lstrip('/')}"
        if params:
            query = urllib.parse.urlencode(
                {k: v for k, v in params.items() if v is not None}, doseq=True
            )
            base_url = f"{base_url}?{query}"

        headers = {"Accept": "application/json", "User-Agent": "wp_client.py"}
        if authed:
            headers["Authorization"] = self._auth_header

        body: bytes | None = raw_body
        if raw_body is not None:
            if content_type:
                headers["Content-Type"] = content_type
        elif data is not None:
            body = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"

        req = urllib.request.Request(base_url, data=body, method=method.upper(), headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                payload = resp.read()
                if not payload:
                    return None
                try:
                    return json.loads(payload)
                except json.JSONDecodeError:
                    return payload.decode("utf-8", errors="replace")
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(detail)
                msg = parsed.get("message", detail) if isinstance(parsed, dict) else detail
            except json.JSONDecodeError:
                parsed, msg = detail, detail
            raise WPError(
                f"HTTP {exc.code} on {method.upper()} {base_url}: {msg}",
                status=exc.code,
                body=parsed,
            ) from None
        except urllib.error.URLError as exc:
            raise WPError(f"Network error contacting {base_url}: {exc.reason}") from None

    # -- convenience methods ---------------------------------------------- #
    def whoami(self) -> dict:
        """Return the authenticated user (verifies credentials)."""
        return self.request("GET", "/wp/v2/users/me", params={"context": "edit"})

    def site_info(self) -> dict:
        """Return the site's REST index (name, description, namespaces)."""
        return self.request("GET", "/", authed=False)

    def list_items(self, kind: str, **params) -> list:
        """List posts/pages/etc. `kind` is e.g. 'posts' or 'pages'."""
        params.setdefault("per_page", 20)
        params.setdefault("context", "edit")
        return self.request("GET", f"/wp/v2/{kind}", params=params)

    def get_item(self, kind: str, item_id: int) -> dict:
        return self.request("GET", f"/wp/v2/{kind}/{item_id}", params={"context": "edit"})

    def create_item(self, kind: str, fields: dict) -> dict:
        return self.request("POST", f"/wp/v2/{kind}", data=fields)

    def update_item(self, kind: str, item_id: int, fields: dict) -> dict:
        return self.request("POST", f"/wp/v2/{kind}/{item_id}", data=fields)

    def delete_item(self, kind: str, item_id: int, force: bool = False) -> dict:
        return self.request(
            "DELETE", f"/wp/v2/{kind}/{item_id}", params={"force": "true" if force else "false"}
        )

    def upload_media(self, file_path: str, title: str | None = None) -> dict:
        """Upload a file to the media library via multipart/form-data."""
        fp = Path(file_path)
        if not fp.is_file():
            raise WPError(f"File not found: {file_path}")
        mime, _ = mimetypes.guess_type(fp.name)
        mime = mime or "application/octet-stream"
        boundary = uuid.uuid4().hex
        preamble = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="{fp.name}"\r\n'
            f"Content-Type: {mime}\r\n\r\n"
        ).encode("utf-8")
        epilogue = f"\r\n--{boundary}--\r\n".encode("utf-8")
        body = preamble + fp.read_bytes() + epilogue
        media = self.request(
            "POST",
            "/wp/v2/media",
            raw_body=body,
            content_type=f"multipart/form-data; boundary={boundary}",
        )
        if title:
            media = self.update_item("media", media["id"], {"title": title})
        return media


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def _client_from_env() -> WPClient:
    return WPClient(
        os.environ.get("WP_URL", ""),
        os.environ.get("WP_USER", ""),
        os.environ.get("WP_APP_PASSWORD", ""),
    )


def _print(obj: Any) -> None:
    print(json.dumps(obj, indent=2, ensure_ascii=False))


def _summarize(items: list, fields=("id", "status", "type", "link")) -> None:
    for it in items:
        title = ""
        if isinstance(it.get("title"), dict):
            title = it["title"].get("rendered") or it["title"].get("raw") or ""
        row = {f: it.get(f) for f in fields}
        row["title"] = title
        print(json.dumps(row, ensure_ascii=False))


def _read_fields(args) -> dict:
    """Assemble a fields dict from --field key=value pairs and/or --json file."""
    fields: dict[str, Any] = {}
    if getattr(args, "json", None):
        text = sys.stdin.read() if args.json == "-" else Path(args.json).read_text("utf-8")
        fields.update(json.loads(text))
    for pair in getattr(args, "field", []) or []:
        key, _, value = pair.partition("=")
        fields[key.strip()] = value
    return fields


def cmd_test(args) -> int:
    client = _client_from_env()
    info = client.site_info()
    print(f"Connected to: {info.get('name')}  ({info.get('url') or client.base})")
    print(f"Description : {info.get('description')}")
    ns = info.get("namespaces") or []
    print(f"wp/v2 API   : {'available' if 'wp/v2' in ns else 'NOT found — REST API may be restricted'}")
    me = client.whoami()
    print(f"Authenticated as: {me.get('name')} (id={me.get('id')}, roles={me.get('roles')})")
    caps = me.get("capabilities") or {}
    print(f"Can publish posts: {bool(caps.get('publish_posts'))}")
    return 0


def cmd_list(args) -> int:
    client = _client_from_env()
    items = client.list_items(
        args.kind, per_page=args.per_page, page=args.page, status=args.status, search=args.search
    )
    if args.raw:
        _print(items)
    else:
        _summarize(items)
    return 0


def cmd_get(args) -> int:
    _print(_client_from_env().get_item(args.kind, args.id))
    return 0


def cmd_create(args) -> int:
    client = _client_from_env()
    fields = _read_fields(args)
    if args.title:
        fields["title"] = args.title
    if args.content:
        fields["content"] = args.content
    if args.status:
        fields["status"] = args.status
    if not fields:
        raise WPError("Nothing to create. Provide --title/--content/--status, --field, or --json.")
    result = client.create_item(args.kind, fields)
    print(f"Created {args.kind[:-1]} id={result.get('id')} status={result.get('status')}")
    print(f"Link: {result.get('link')}")
    return 0


def cmd_update(args) -> int:
    client = _client_from_env()
    fields = _read_fields(args)
    if args.title:
        fields["title"] = args.title
    if args.content:
        fields["content"] = args.content
    if args.status:
        fields["status"] = args.status
    if not fields:
        raise WPError("Nothing to update. Provide --title/--content/--status, --field, or --json.")
    result = client.update_item(args.kind, args.id, fields)
    print(f"Updated {args.kind[:-1]} id={result.get('id')} status={result.get('status')}")
    print(f"Link: {result.get('link')}")
    return 0


def cmd_delete(args) -> int:
    result = _client_from_env().delete_item(args.kind, args.id, force=args.force)
    print(f"Deleted id={args.id} (force={args.force})")
    if isinstance(result, dict) and result.get("previous"):
        print(f"Previous status: {result['previous'].get('status')}")
    return 0


def cmd_upload(args) -> int:
    media = _client_from_env().upload_media(args.file, title=args.title)
    print(f"Uploaded media id={media.get('id')}")
    src = media.get("source_url") or (media.get("guid") or {}).get("rendered")
    print(f"URL: {src}")
    return 0


def cmd_raw(args) -> int:
    client = _client_from_env()
    data = None
    if args.data:
        data = json.loads(sys.stdin.read() if args.data == "-" else args.data)
    _print(client.request(args.method, args.path, data=data))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Zero-dependency WordPress REST API client.",
        epilog="Credentials come from WP_URL / WP_USER / WP_APP_PASSWORD (env or .env).",
    )
    parser.add_argument("--env", default=".env", help="path to .env file (default: .env)")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("test", help="verify connection and credentials").set_defaults(func=cmd_test)

    p = sub.add_parser("list", help="list posts/pages/etc.")
    p.add_argument("kind", nargs="?", default="posts", help="posts, pages, media, ... (default: posts)")
    p.add_argument("--status", help="e.g. publish, draft, pending, private, any")
    p.add_argument("--search", help="search term")
    p.add_argument("--per-page", type=int, default=20)
    p.add_argument("--page", type=int, default=1)
    p.add_argument("--raw", action="store_true", help="print full JSON")
    p.set_defaults(func=cmd_list)

    p = sub.add_parser("get", help="fetch one item by id")
    p.add_argument("kind")
    p.add_argument("id", type=int)
    p.set_defaults(func=cmd_get)

    for name, fn, verb in (("create", cmd_create, "create"), ("update", cmd_update, "update")):
        p = sub.add_parser(name, help=f"{verb} a post/page/etc.")
        p.add_argument("kind", help="posts, pages, ...")
        if name == "update":
            p.add_argument("id", type=int)
        p.add_argument("--title")
        p.add_argument("--content")
        p.add_argument("--status", help="e.g. draft, publish, pending, private")
        p.add_argument("--field", action="append", help="extra field as key=value (repeatable)")
        p.add_argument("--json", help="path to a JSON file of fields, or '-' for stdin")
        p.set_defaults(func=fn)

    p = sub.add_parser("delete", help="delete an item by id")
    p.add_argument("kind")
    p.add_argument("id", type=int)
    p.add_argument("--force", action="store_true", help="permanently delete (skip trash)")
    p.set_defaults(func=cmd_delete)

    p = sub.add_parser("upload", help="upload a file to the media library")
    p.add_argument("file")
    p.add_argument("--title")
    p.set_defaults(func=cmd_upload)

    p = sub.add_parser("raw", help="make an arbitrary REST request")
    p.add_argument("method", help="GET, POST, PUT, DELETE, ...")
    p.add_argument("path", help="e.g. /wp/v2/categories")
    p.add_argument("--data", help="JSON body string, or '-' for stdin")
    p.set_defaults(func=cmd_raw)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    load_dotenv(args.env)
    try:
        return args.func(args)
    except WPError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        if exc.status in (401, 403):
            print(
                "Hint: 401/403 usually means a bad Application Password, wrong "
                "username, or the REST API / Application Passwords are disabled "
                "(often a security plugin). See README.md -> Troubleshooting.",
                file=sys.stderr,
            )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
