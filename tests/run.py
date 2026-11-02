#!/usr/bin/env python3
"""Executa tests/regression.html em um navegador headless e retorna o resultado."""
import argparse
import functools
import http.server
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
import threading

ROOT = pathlib.Path(__file__).resolve().parent.parent
TIMEOUT_SECONDS = 240


class Handler(http.server.SimpleHTTPRequestHandler):
    finished = threading.Event()
    results = None

    def log_message(self, *args):
        pass

    def do_POST(self):
        body = self.rfile.read(int(self.headers['Content-Length']))
        Handler.results = json.loads(body)
        self.send_response(204)
        self.end_headers()
        Handler.finished.set()


def create_profile():
    # O Firefox instalado via snap só enxerga perfis dentro da própria área
    snap_area = pathlib.Path.home() / 'snap' / 'firefox' / 'common'
    return tempfile.mkdtemp(prefix='regression-', dir=snap_area if snap_area.is_dir() else None)


def browser_command(browser, profile, url):
    if browser == 'firefox':
        return ['firefox', '--headless', '--no-remote', '--profile', profile, url]
    executable = shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')
    if not executable:
        sys.exit('Chrome não encontrado. Abra tests/regression.html manualmente (veja o README).')
    return [executable, '--headless=new', '--no-sandbox', '--disable-gpu', f'--user-data-dir={profile}', url]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', choices=['firefox', 'chrome'], default='firefox')
    args = parser.parse_args()

    if args.browser == 'firefox' and not shutil.which('firefox'):
        sys.exit('Firefox não encontrado. Abra tests/regression.html manualmente (veja o README).')

    handler = functools.partial(Handler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()

    profile = create_profile()
    url = f'http://127.0.0.1:{server.server_address[1]}/tests/regression.html'
    browser = subprocess.Popen(
        browser_command(args.browser, profile, url),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    try:
        if not Handler.finished.wait(TIMEOUT_SECONDS):
            sys.exit(f'Os testes não terminaram em {TIMEOUT_SECONDS} segundos.')
    finally:
        browser.terminate()
        try:
            browser.wait(10)
        except subprocess.TimeoutExpired:
            browser.kill()
        server.shutdown()
        shutil.rmtree(profile, ignore_errors=True)

    failed = [r for r in Handler.results if r['error']]
    for result in Handler.results:
        print(f"{'FALHOU' if result['error'] else 'ok    '} {result['name']}")
        if result['error']:
            print(f"       {result['error']}")
    print(f"\n{len(Handler.results) - len(failed)} de {len(Handler.results)} testes passaram")
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
