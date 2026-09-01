# WordPress backend automation

A tiny, **zero-dependency** command-line client for automating a WordPress
site through its REST API. Pure Python 3 standard library — nothing to
`pip install`.

It authenticates with an **Application Password** (WordPress's built-in,
revocable credential for programmatic access) and can test the connection,
list/create/update/delete posts & pages, upload media, and make arbitrary
REST calls.

> **Where to run this:** run it from a machine that can reach the WordPress
> site (your laptop, or a server). It is intentionally decoupled from the
> Hippie Chippy static site — it just happens to live in this repo on the
> `wordpress-backend-automation` branch. The Claude Code web environment
> that generated it **cannot** reach the site (its network policy blocks the
> domain), so it was written but not run against the live site — the first
> `test` run is yours.

## 1. Get an Application Password

1. Log in to `https://excursionsticketsdirect.com/wp-admin/`.
2. Go to **Users → Profile** (or **Users → All Users → your user**).
3. Scroll to **Application Passwords**, enter a name (e.g. `automation`),
   and click **Add New Application Password**.
4. Copy the generated password. You'll only see it once. (The spaces in it
   are for readability — this tool strips them automatically.)

> Don't see the Application Passwords section? It's built into WordPress 5.6+
> but is often hidden or blocked by security plugins (Wordfence, iThemes/
> Solid Security, etc.) or only enabled over HTTPS. See **Troubleshooting**.

## 2. Configure credentials

```bash
cd wp-automation
cp .env.example .env
# edit .env and fill in WP_URL, WP_USER, WP_APP_PASSWORD
```

`.env` is gitignored so your secret never gets committed. Alternatively,
export the three variables in your shell instead of using a file.

## 3. Test the connection

```bash
python3 wp_client.py test
```

Expected output confirms the site name, that the `wp/v2` API is available,
and which user you're authenticated as (with whether you can publish).

## Command reference

```bash
# Verify credentials and print who you are
python3 wp_client.py test

# List content (default kind is "posts")
python3 wp_client.py list posts
python3 wp_client.py list pages --status draft
python3 wp_client.py list posts --search "excursion" --per-page 5
python3 wp_client.py list posts --raw            # full JSON

# Fetch one item
python3 wp_client.py get posts 123

# Create — as a safe draft first!
python3 wp_client.py create posts --title "Hello" --content "<p>Hi</p>" --status draft

# Create with extra fields (repeatable --field), or from a JSON file
python3 wp_client.py create posts --title "Sale" --field categories=12 --field status=publish
python3 wp_client.py create posts --json ./new-post.json

# Update an existing item
python3 wp_client.py update posts 123 --status publish
python3 wp_client.py update pages 45 --content "<p>Updated copy</p>"

# Delete (goes to trash unless --force)
python3 wp_client.py delete posts 123
python3 wp_client.py delete posts 123 --force

# Upload an image to the media library
python3 wp_client.py upload ../images/img1.jpg --title "Fish and chips"

# Escape hatch: any REST endpoint
python3 wp_client.py raw GET /wp/v2/categories
python3 wp_client.py raw POST /wp/v2/tags --data '{"name":"specials"}'
```

### Building fields from JSON

For anything beyond title/content/status, pass a JSON object. Fields map
directly to the [WordPress REST API](https://developer.wordpress.org/rest-api/reference/):

```json
{
  "title": "Weekly specials",
  "content": "<p>Two-for-one on catamaran trips.</p>",
  "status": "draft",
  "excerpt": "This week's offers",
  "categories": [12, 15]
}
```

```bash
python3 wp_client.py create posts --json ./specials.json
```

## Using it as a library

```python
from wp_client import WPClient, load_dotenv
import os

load_dotenv()  # reads ./.env
wp = WPClient(os.environ["WP_URL"], os.environ["WP_USER"], os.environ["WP_APP_PASSWORD"])

print(wp.whoami()["name"])
draft = wp.create_item("posts", {"title": "Batch job", "status": "draft"})
wp.update_item("posts", draft["id"], {"content": "<p>Generated.</p>"})
```

This is the building block for bulk / scheduled jobs — wrap it in a loop or a
cron job on your own machine.

## Troubleshooting

- **`401` / `403` on `test`** — wrong username or Application Password, or the
  REST API / Application Passwords are disabled by a security plugin. Confirm
  you can create an Application Password in wp-admin, and that the plugin
  isn't blocking `/wp-json/` or REST authentication.
- **`wp/v2 NOT found`** — the REST API is being filtered. A security plugin or
  server rule is likely returning a restricted index for anonymous requests.
- **`Network error` / timeouts** — check the URL, HTTPS, and that your machine
  can reach the site (a WAF/Cloudflare may block non-browser clients; you may
  need to allowlist your IP).
- **`rest_cannot_create` / `rest_forbidden`** — your user lacks the capability
  for that action (e.g. an Author can't publish others' posts). Use an account
  with sufficient role, or adjust the target.

## Security notes

- The Application Password only grants what your user's role allows, and can be
  revoked anytime from **Users → Profile** without changing your login password.
- Keep `.env` out of version control (it already is).
- Prefer `--status draft` while testing so nothing goes live by accident.
