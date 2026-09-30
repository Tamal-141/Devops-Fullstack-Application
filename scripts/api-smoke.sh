#!/bin/sh
# API smoke test: real HTTP requests against a running stack. Each check proves one
# layer actually works, not just that a container is "Up":
#   health 200      → backend can query MySQL
#   products listed → migrations ran and seeded data
#   login works     → seed user exists, bcrypt + JWT work
#   order placed    → a write reaches the database
# Stops at the first failure with a non-zero exit, so CI goes red.
#
# Runs inside the curlimages/curl container (see docker-compose.yml, profile "test").
set -eu

BASE_URL="${BASE_URL:-http://backend:3000}"
: "${SMOKE_EMAIL:?SMOKE_EMAIL is required (SEED_USER_EMAIL in .env)}"
: "${SMOKE_PASSWORD:?SMOKE_PASSWORD is required (SEED_USER_PASSWORD in .env)}"

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "ok   - $*"; }
# HTTP status only, body discarded.
status_of() { curl -sS -o /dev/null -w '%{http_code}' "$@"; }

echo "API smoke test against $BASE_URL"

# -f: HTTP 4xx/5xx → non-zero exit. -sS: no progress bar, but still print errors.
body=$(curl -fsS "$BASE_URL/api/health") || fail "GET /api/health"
echo "$body" | grep -q '"db":"up"' || fail "health: expected db up, got $body"
pass "health: $body"

body=$(curl -fsS "$BASE_URL/api/products") || fail "GET /api/products"
count=$(echo "$body" | grep -o '"slug":' | wc -l)
[ "$count" -ge 1 ] || fail "products: expected the seeded products, got $count"
pass "products: $count listed"

body=$(curl -fsS "$BASE_URL/api/products/1") || fail "GET /api/products/1"
pass "product 1: $(echo "$body" | sed -E 's/.*"name":"([^"]*)".*/\1/')"

code=$(status_of "$BASE_URL/api/products/999999")
[ "$code" = 404 ] || fail "unknown product: expected 404, got $code"
pass "unknown product -> 404"

body=$(curl -fsS -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SMOKE_EMAIL\",\"password\":\"$SMOKE_PASSWORD\"}") || fail "login as $SMOKE_EMAIL"
token=$(echo "$body" | sed -E 's/.*"token":"([^"]+)".*/\1/')
# If sed found no token it prints the whole body back unchanged.
[ -n "$token" ] && [ "$token" != "$body" ] || fail "login: no token in $body"
pass "login as $SMOKE_EMAIL"

code=$(status_of -X POST "$BASE_URL/api/orders" -H 'Content-Type: application/json' -d '{"productId":1,"quantity":1}')
[ "$code" = 401 ] || fail "order without token: expected 401, got $code"
pass "order without token -> 401"

body=$(curl -fsS -X POST "$BASE_URL/api/orders" \
  -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' \
  -d '{"productId":1,"quantity":2}') || fail "place order"
echo "$body" | grep -q '"totalCents"' || fail "order: unexpected response $body"
pass "order placed: $body"

echo "API smoke test passed"
