#!/usr/bin/env bash
#
# Sobe back (3333) e front (3000) para operacao offline na rede do roteador.
# Uso: ./scripts/start-offline.sh [interface]   (default: interface do wifi)
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACK="$ROOT/Back"
FRONT="$ROOT/Front/tournament-jj"
IFACE="${1:-}"

# --- descobre o IP que os celulares/tablets vao usar --------------------------
if [ -n "$IFACE" ]; then
  IP="$(ip -4 -o addr show dev "$IFACE" scope global | awk '{print $4}' | cut -d/ -f1 | head -1)"
else
  # ignora docker/virbr/tailscale
  IP="$(ip -4 -o addr show scope global \
        | grep -vE ' (docker|br-|virbr|tailscale)' \
        | awk '{print $4}' | cut -d/ -f1 | head -1)"
fi

if [ -z "${IP:-}" ]; then
  echo "ERRO: nao achei IP de LAN. Conecte no wifi do roteador e rode de novo." >&2
  exit 1
fi

# --- pre-checagens ------------------------------------------------------------
if ! pg_isready -h localhost -p 5432 -q; then
  echo "ERRO: Postgres nao esta respondendo em localhost:5432." >&2
  echo "      sudo systemctl start postgresql" >&2
  exit 1
fi

[ -f "$BACK/dist/src/main.js" ] || [ -f "$BACK/dist/main.js" ] || {
  echo "ERRO: build do back nao existe. Rode 'yarn build' em Back/ COM internet." >&2
  exit 1
}
[ -d "$FRONT/.next" ] || {
  echo "ERRO: build do front nao existe. Rode 'yarn build' em Front/tournament-jj/ COM internet." >&2
  exit 1
}

MAIN="$BACK/dist/src/main.js"
[ -f "$MAIN" ] || MAIN="$BACK/dist/main.js"

# --- sobe os dois -------------------------------------------------------------
cleanup() { echo; echo "Parando..."; kill 0; }
trap cleanup EXIT INT TERM

echo "==> Back  em http://$IP:3333"
(cd "$BACK" && PORT=3333 node "$MAIN") &

echo "==> Front em http://$IP:3000"
(cd "$FRONT" && yarn start -H 0.0.0.0 -p 3000) &

sleep 6
echo
echo "-------------------------------------------------------------"
echo " Abra nos dispositivos:  http://$IP:3000"
echo " API (teste):            http://$IP:3333"
echo " Ctrl+C aqui derruba os dois."
echo "-------------------------------------------------------------"

wait
