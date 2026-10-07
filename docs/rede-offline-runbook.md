# Runbook — Rodar o sistema offline no roteador LB-LINK

Cenário: um notebook Linux é o servidor (back + front + Postgres). Celulares,
tablets e outros notebooks conectam no wifi do LB-LINK e acessam pelo navegador.
O roteador **não tem internet** — é só um switch wifi.

---

## Fase 0 — ANTES do evento, ainda COM internet

Isso é obrigatório. Sem internet o `next build` quebra: `src/app/layout.tsx`
importa `next/font/google` (Geist), que baixa a fonte na hora do build.

```bash
cd Back                     && yarn build
cd ../Front/tournament-jj   && yarn build
```

Testar localmente antes de sair de casa:

```bash
./scripts/start-offline.sh
# abre http://<seu-ip>:3000 em outro aparelho da sua rede atual
```

Levar também: banco populado (`pg_dump` de backup num pendrive) e o carregador.

---

## Fase 1 — Conectar no LB-LINK e fixar o IP

O IP **não pode mudar** durante o evento. Primeiro descubra a faixa do roteador:

```bash
nmcli device wifi list                 # acha o SSID do LB-LINK
nmcli device wifi connect "<SSID>" password "<senha>"
ip route | grep default                # ex.: default via 192.168.16.1 dev wlo1
```

Com a faixa em mãos, pinar o IP no cliente (troque `<CON>` pelo nome da conexão
que aparece em `nmcli con show`, e o `192.168.16.x` pela faixa real):

```bash
nmcli con mod "<CON>" \
  ipv4.method manual \
  ipv4.addresses 192.168.16.50/24 \
  ipv4.gateway 192.168.16.1 \
  ipv4.dns "" \
  ipv4.ignore-auto-dns yes \
  connection.autoconnect yes \
  connection.autoconnect-priority 999
nmcli con up "<CON>"
ip -4 addr show wlo1                   # confirma 192.168.16.50
```

`autoconnect-priority 999` impede o notebook de pular para outra rede conhecida
que tenha internet no meio do campeonato.

---

## Fase 2 — Liberar as portas no firewall

```bash
sudo ufw allow from 192.168.16.0/24 to any port 3000 proto tcp
sudo ufw allow from 192.168.16.0/24 to any port 3333 proto tcp
sudo ufw status
```

Se o `ufw` estiver inativo (`Status: inactive`), não precisa fazer nada.

---

## Fase 3 — Subir tudo

```bash
sudo systemctl start postgresql        # confirme: systemctl is-active postgresql
cd /home/gabriel/Documents/SemeandoCampeoes/jiu-tournamnent
./scripts/start-offline.sh
```

O script valida Postgres + builds, sobe os dois processos e imprime a URL.
`Ctrl+C` derruba os dois juntos.

Teste de sanidade a partir de OUTRO aparelho na rede:

```
http://192.168.16.50:3333        -> responde algo do Nest
http://192.168.16.50:3000        -> carrega o front
```

---

## Fase 4 — Configurar os dispositivos clientes

1. Conectar no wifi do LB-LINK.
2. **Android:** aceitar "Rede sem internet, permanecer conectado?" e **desligar
   dados móveis** — senão o celular volta pro 4G e perde o servidor.
3. **iOS:** Ajustes > Wi-Fi > (i) na rede > desativar "Auto-Join" em outras redes.
4. Abrir `http://192.168.16.50:3000` e salvar como favorito / atalho na tela.
5. Não usar `localhost` nem `127.0.0.1` no celular — só o IP do notebook.

---

## Por que não precisa rebuildar o front por causa do IP

`Front/tournament-jj/src/shared/config/runtime-urls.ts` deriva a URL da API do
host que o navegador já está usando: quem abre `http://192.168.16.50:3000` fala
com `http://192.168.16.50:3333` sozinho, HTTP e WebSocket.

**Portanto: mantenha `NEXT_PUBLIC_API_BASE_URL` e `NEXT_PUBLIC_FIGHT_UPDATES_WS_URL`
COMENTADAS no `.env`.** Existe um `.env.bak-ip-fixo` com o IP antigo
`192.168.44.65` cravado — se ele virar `.env`, o sistema quebra na hora que o IP
mudar. Ele é só backup, não use.

---

## Checklist do dia (5 min antes de abrir)

- [ ] `ip -4 addr show wlo1` mostra o IP fixo esperado
- [ ] `systemctl is-active postgresql` → `active`
- [ ] `./scripts/start-offline.sh` rodando, sem erro no terminal
- [ ] Um celular qualquer abre `http://<IP>:3000` e faz login
- [ ] Notebook no carregador, suspensão automática desligada
      (`Configurações > Energia > Suspender: Nunca`)

---

## Problemas comuns

| Sintoma | Causa | Ação |
| --- | --- | --- |
| Celular não abre a página | Voltou pro 4G | Desligar dados móveis |
| "Não foi possível conectar" no front | IP do notebook mudou | Refazer Fase 1 |
| Front carrega mas fica vazio | Back caiu ou porta 3333 bloqueada | Ver terminal + Fase 2 |
| Placar não atualiza sozinho | WebSocket bloqueado na porta 3333 | Fase 2 |
| Notebook trocou de rede sozinho | Outra rede conhecida por perto | `autoconnect-priority 999` |
