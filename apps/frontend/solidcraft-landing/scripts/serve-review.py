#!/usr/bin/env python3
"""Local static test server applying the built preview response policy."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
from urllib.parse import urlsplit

root = Path(__file__).resolve().parents[1] / 'dist'
redirects = {}
for line in (root / '_redirects').read_text().splitlines():
    parts = line.split()
    if len(parts) == 3 and parts[0].startswith('/solidcore/progress/'):
        redirects[parts[0]] = (parts[1], int(parts[2]))
headers = []
for line in (root / '_headers').read_text().split('\n\n')[0].splitlines()[1:]:
    if line.strip():
        key, value = line.strip().split(':', 1)
        headers.append((key, value.strip()))

class ReviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(root), **kwargs)
    def do_GET(self):
        url = urlsplit(self.path)
        if url.path in redirects:
            destination, status = redirects[url.path]
            self.send_response(status)
            self.send_header('Location', destination + ('?' + url.query if url.query else ''))
            self.send_header('Content-Length', '0')
            self.end_headers()
            return
        super().do_GET()
    def end_headers(self):
        for key, value in headers:
            self.send_header(key, value)
        super().end_headers()
    def send_error(self, code, message=None, explain=None):
        if code == 404:
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            data = (root/'404.html').read_bytes()
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        else:
            super().send_error(code, message, explain)
    def log_message(self, *args):
        pass
    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass  # A browser may cancel a video request after a pause or navigation.

port = int(os.environ.get('PORT', '4322'))
server = ThreadingHTTPServer(('127.0.0.1', port), ReviewHandler)
print(f'SolidCraft review: http://127.0.0.1:{port}', flush=True)
server.serve_forever()
