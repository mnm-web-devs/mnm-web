import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parent
ENV_FILE = ROOT / ".env"


def load_public_config():
    values = {}
    if not ENV_FILE.exists():
        return values

    for line_number, raw_line in enumerate(ENV_FILE.read_text(encoding="utf-8").splitlines(), 1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            raise ValueError(f"Invalid .env entry on line {line_number}")

        key, value = line.split("=", 1)
        key = key.strip()
        if key not in {"MNM_API_BASE_URL", "MNM_CLERK_PUBLISHABLE_KEY"}:
            continue

        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        values[key] = value
    return values


class FrontendHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_request(self, code="-", size="-"):
        requestline = self.requestline
        if "?" in requestline:
            path, query = requestline.split("?", 1)
            requestline = f"{path}?[query redacted]" if query else path
        self.log_message('"%s" %s %s', requestline, code, size)

    def is_private_env_path(self):
        parts = Path(unquote(urlsplit(self.path).path)).parts
        return any(part == ".env" or part.startswith(".env.") for part in parts)

    def do_GET(self):
        if self.is_private_env_path():
            self.send_error(404)
            return
        if self.path.split("?", 1)[0] == "/js/env.js":
            config = json.dumps(load_public_config())
            body = f"window.MNM_ENV = {config};\n".encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_HEAD(self):
        if self.is_private_env_path():
            self.send_error(404)
            return
        if self.path.split("?", 1)[0] == "/js/env.js":
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return
        super().do_HEAD()

    def list_directory(self, path):
        self.send_error(404)
        return None


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", int(os.environ.get("PORT", "3000"))), FrontendHandler).serve_forever()
