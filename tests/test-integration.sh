#!/bin/bash
# Tests d'intégration contre le backend local 127.0.0.1:8090
B="http://127.0.0.1:8090"; T="dev-token-123"; ok=0; ko=0
chk() { if [ "$2" = "$3" ]; then ok=$((ok+1)); else ko=$((ko+1)); echo "❌ $1 (attendu $3, reçu $2)"; fi }
chk "200 avec token"        "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $T" $B/)" 200
chk "401 sans token"         "$(curl -s -o /dev/null -w '%{http_code}' $B/)" 401
chk "401 mauvais token"      "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer faux" $B/)" 401
chk "200 via query param"    "$(curl -s -o /dev/null -w '%{http_code}' "$B/?aegis_token=$T")" 200
chk "CSS 200"                "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $T" $B/assets/css/style.css)" 200
chk "path traversal bloqué"  "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $T" --path-as-is "$B/../etc/passwd")" 403
r=$(curl -s -X POST -H "Authorization: Bearer $T" -H "Content-Type: application/json" -d '{"client_id":1,"total":10,"id":12345}' $B/payer_et_expedier)
echo "$r" | grep -q '"status":"Expediee"' && ok=$((ok+1)) || { ko=$((ko+1)); echo "❌ payer OK: $r"; }
r=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $T" -H "Content-Type: application/json" -d '{"client_id":2,"total":99999,"id":1}' $B/payer_et_expedier)
chk "payer client 2 = 400" "$r" 400
echo "Intégration : ✅ $ok OK, ❌ $ko échecs"
[ $ko -eq 0 ]
