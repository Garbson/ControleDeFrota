# Deploy — ControleDeFrota

## Pré-requisitos na VPS

- Docker + Docker Compose ✅ (já instalados)
- Rede `zlabs-nginx-proxy_default` existente ✅

## Passo a passo

### 1. Clonar / enviar arquivos

```bash
# Na VPS
mkdir -p /opt/apps/controlefrota
cd /opt/apps/controlefrota
# Copiar arquivos do projeto
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
nano .env
# Preencher MYSQL_ROOT_PASSWORD, DB_USER, DB_PASS, JWT_SECRET, JWT_REFRESH_SECRET
```

Gerar chaves JWT seguras:

```bash
openssl rand -base64 64  # JWT_SECRET
openssl rand -base64 64  # JWT_REFRESH_SECRET
```

### 3. Build e subir containers

```bash
docker compose up -d --build
```

### 4. Verificar saúde

```bash
docker compose ps
docker logs controlefrota-api --tail 20
curl http://localhost:4000/health
```

### 5. Configurar nginx reverso (zlabs-nginx-proxy)

Adicionar ao config do nginx proxy existente:

```nginx
# controlefrota.zlabs.com.br → frontend
upstream controlefrota_web {
    server controlefrota-web:80;
}

server {
    listen 80;
    server_name controlefrota.zlabs.com.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name controlefrota.zlabs.com.br;
    # ssl_certificate / ssl_certificate_key (Cloudflare origin cert)

    location /api/ {
        proxy_pass http://controlefrota-api:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://controlefrota_web;
        proxy_set_header Host $host;
    }
}
```

### 6. Cloudflare DNS

Adicionar registro A:

- Nome: `controlefrota`
- Tipo: A
- IP: 72.60.157.155
- Proxy: ✅ (laranja)

## Containers criados (isolados)

| Container           | Função                   | Rede interna                        | Porta externa   |
| ------------------- | ------------------------ | ----------------------------------- | --------------- |
| controlefrota-mysql | Banco de dados MySQL 8.0 | controlefrota-network               | 3310 (só debug) |
| controlefrota-api   | API Node.js Express      | controlefrota-network + zlabs-proxy | —               |
| controlefrota-web   | Frontend Vue (nginx)     | controlefrota-network + zlabs-proxy | —               |

## Credenciais iniciais

- E-mail: `admin@controlefrota.com`
- Senha: `Admin@2026` ← **Trocar imediatamente após primeiro login!**
