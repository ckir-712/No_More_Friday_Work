#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
test -f index.html
test -f css/app.css
test -f js/app.js
test -f js/store.js
test -f js/calendar.js
test -f js/roster.js
test -f js/leave.js
test -f js/dispatch.js
test -f js/duty.js
test -f js/egg.js
python3 -c 'import http.server; print("static app files and python http.server are ready")'
