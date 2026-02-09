# Deploy na DigitalOcean (Droplet)

Guia para rodar o projeto inteiro (incluindo o sync) em uma Droplet de US$ 4/mês.

> **API DataRio e região:** a API dados.mobilidade.rio devolve dados só para IPs no Brasil. Na DigitalOcean (NYC, etc.) o sync retorna 0 ônibus. A DigitalOcean não tem datacenter no Brasil — para o sync funcionar, hospede o app em um provedor com servidor no Brasil (veja [Alternativa: servidor no Brasil](#alternativa-servidor-no-brasil) mais abaixo).

## 1. Na Droplet (primeira vez)

Conecte por SSH (o IP a DigitalOcean te dá no painel):

```bash
ssh root@SEU_IP
```

### Instalar Node 20, pnpm e PM2

```bash
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# pnpm
npm install -g pnpm

# PM2 (mantém o app rodando e reinicia se cair)
npm install -g pm2
```

### Clonar o projeto

Se o repositório for **público**:

```bash
cd /opt  # ou outro diretório
git clone https://github.com/SEU_USUARIO/meu-busao.git
cd meu-busao
```

Se for **privado**, use SSH key ou token:

```bash
git clone git@github.com:SEU_USUARIO/meu-busao.git
cd meu-busao
```

### Criar o arquivo .env

```bash
nano .env
```

Conteúdo mínimo (use sua `DATABASE_URL` do MongoDB, ex.: Atlas):

```env
DATABASE_URL="mongodb+srv://usuario:senha@cluster.mongodb.net/meu-busao"
```

Salve (Ctrl+O, Enter, Ctrl+X).

### Rodar o deploy

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

O app sobe na **porta 3000**. Para acessar de fora, abra a porta no firewall:

```bash
ufw allow 3000
ufw enable
```

Acesse: `http://SEU_IP:3000`

---

### Se você usou a Droplet 1-Click "Node.js" da DigitalOcean

Ela já vem com um app "hello" na porta 3000 e nginx na 80. Para mostrar **seu** app no lugar do "Sammy":

```bash
# 1. Parar e remover o app padrão (roda como usuário nodejs)
sudo -u nodejs pm2 delete hello 2>/dev/null || true
sudo -u nodejs pm2 save 2>/dev/null || true

# 2. Reiniciar seu app para ele pegar a porta 3000
cd ~/projeto/meu-busao   # ou o caminho onde está o projeto
pm2 restart meu-busao

# 3. Recarregar o nginx (já aponta 80 → 3000, agora será seu app)
sudo systemctl reload nginx
```

Depois acesse **`http://SEU_IP`** (porta 80, sem :3000). O nginx já encaminha para o app na 3000.

---

## 2. Sync dos ônibus (só no servidor)

O sync **não** roda mais no navegador de cada usuário. Um único processo no servidor chama a API a cada 15s.

Na Droplet, com o app já rodando (meu-busao na porta 3000):

```bash
cd ~/projeto/meu-busao   # ou o caminho do projeto

# Rodar sync uma vez (teste)
pnpm run sync

# Rodar sync a cada 15s em loop (deixar rodando)
pnpm run sync:loop
```

Para deixar o sync rodando para sempre (recomendado), use PM2:

```bash
pm2 start pnpm --name "sync-buses" -- run sync:loop
pm2 save
```

Assim só **um** sync roda no servidor e todos os usuários leem os mesmos dados.

---

## 3. Depois de mudanças no código

Na sua máquina, envia as alterações:

```bash
git push origin main
```

Na Droplet:

```bash
cd ~/projeto/meu-busao
git pull
./scripts/deploy.sh
```

---

## 4. Comandos úteis (na Droplet)

| Comando | O que faz |
|---------|-----------|
| `pm2 logs meu-busao` | Ver logs do app |
| `pm2 restart meu-busao` | Reiniciar sem fazer deploy de novo |
| `pm2 status` | Ver status do processo |
| `pnpm run sync` | Rodar sync uma vez |
| `pnpm run sync:loop` | Rodar sync a cada 15s (Ctrl+C para parar) |

---

### Alternativa: servidor no Brasil

A DigitalOcean **não tem datacenter no Brasil**. Para o sync do DataRio funcionar (API só responde para IPs no Brasil), use um provedor com servidor em **São Paulo**:

| Provedor | Região Brasil | Observação |
|----------|----------------|------------|
| **Vultr** | São Paulo | VPS barato, mesmo conceito da Droplet. [vultr.com](https://www.vultr.com) |
| **AWS** | sa-east-1 (São Paulo) | Free tier 12 meses; depois pago. |
| **Google Cloud** | southamerica-east1 | Créditos grátis para novos usuários. |
| **Oracle Cloud** | São Paulo | Tem tier "sempre grátis" (exige cartão). |
| **Locaweb, Hostinger, etc.** | Brasil | Hospedagem nacional. |

O deploy é o mesmo: Node, pnpm, PM2, clone do repo, `.env`, script de deploy. Só trocar o IP/host nas instruções.

---

## 5. URL gratuita + HTTPS (para teste, sem comprar domínio)

Duas opções **grátis** para ter link com cadeado (HTTPS):

### Opção A: sslip.io (zero cadastro)

O serviço **sslip.io** transforma seu IP em um nome que já aponta para o servidor. Use o IP da sua Droplet com hífens no lugar dos pontos:

- Exemplo: se o IP é `167.172.18.197`, a URL é **`167-172-18-197.sslip.io`**

Na Droplet (troque pelo **seu** IP com hífens):

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Criar config (substitua 167-172-18-197 pelo SEU IP com hífens)
echo 'server {
    listen 80;
    server_name 167-172-18-197.sslip.io;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}' | sudo tee /etc/nginx/sites-available/sslip

sudo ln -sf /etc/nginx/sites-available/sslip /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Certificado SSL (troque pelo seu IP com hífens)
sudo certbot --nginx -d 167-172-18-197.sslip.io --non-interactive --agree-tos -m seu@email.com
```

Acesse **https://167-172-18-197.sslip.io** (com seu IP). Cadastro em nenhum lugar.

---

### Opção B: DuckDNS (nome customizado, ex: meubusao.duckdns.org)

1. Crie uma conta em [duckdns.org](https://www.duckdns.org) (grátis).
2. Crie um subdomínio (ex.: `meubusao`) → você ganha **meubusao.duckdns.org**.
3. No painel do DuckDNS, coloque o **IP da sua Droplet** e salve.
4. Na Droplet:

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Troque meubusao.duckdns.org pelo subdomínio que você criou
echo 'server {
    listen 80;
    server_name meu-busao.duckdns.org;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}' | sudo tee /etc/nginx/sites-available/duckdns

sudo ln -sf /etc/nginx/sites-available/duckdns /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d meubusao.duckdns.org --non-interactive --agree-tos -m seu@email.com
```

Acesse **https://meubusao.duckdns.org**.

---

## 6. Domínio pago + HTTPS (meu-busao.com.br, etc.)

Para acessar com um domínio que você comprou (ex.: **https://meu-busao.com.br**):

### Passo 1: Ter um domínio

- **.com.br**: [Registro.br](https://registro.br) (barato, em reais).
- **.dev** ou **.com**: [Namecheap](https://www.namecheap.com), [Google Domains](https://domains.google), [Cloudflare](https://www.cloudflare.com/products/registrar/), etc.

Compre o domínio que quiser (ex.: `meu-busao.com.br`).

### Passo 2: Apontar o DNS para a Droplet

No painel de DNS do seu provedor (Registro.br, Namecheap, etc.):

| Tipo | Nome / Host | Valor / Aponta para |
|------|-------------|----------------------|
| **A** | `@` (ou em branco) | **IP da sua Droplet** (ex.: `167.172.18.197`) |
| **A** | `www` | O **mesmo IP** da Droplet |

Assim tanto `meu-busao.com.br` quanto `www.meu-busao.com.br` vão para o seu servidor. A propagação pode levar de alguns minutos a 24h.

### Passo 3: Na Droplet – Nginx + certificado SSL (HTTPS)

Conecte por SSH e rode (troque `meu-busao.com.br` pelo seu domínio):

```bash
# Instalar Certbot (Let's Encrypt, gratuito)
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Criar config do nginx para o seu domínio
sudo nano /etc/nginx/sites-available/meu-busao
```

Cole o conteúdo abaixo (e troque `meu-busao.com.br` pelo seu domínio):

```nginx
server {
    listen 80;
    server_name meu-busao.com.br www.meu-busao.com.br;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Salve (Ctrl+O, Enter, Ctrl+X). Depois:

```bash
# Ativar o site
sudo ln -sf /etc/nginx/sites-available/meu-busao /etc/nginx/sites-enabled/

# Remover o default se estiver atrapalhando (opcional)
sudo rm -f /etc/nginx/sites-enabled/default

# Testar config e recarregar
sudo nginx -t && sudo systemctl reload nginx

# Pedir certificado SSL (vai perguntar e-mail e termos – use o mesmo domínio)
sudo certbot --nginx -d meu-busao.com.br -d www.meu-busao.com.br
```

O Certbot vai:

- Obter o certificado (Let's Encrypt)
- Ajustar o Nginx para HTTPS
- Redirecionar HTTP → HTTPS

### Passo 4: Renovação automática do certificado

O Let's Encrypt expira em 90 dias. O Certbot instala um cron para renovar sozinho. Para testar:

```bash
sudo certbot renew --dry-run
```

Se não der erro, a renovação automática está ok.

---

Depois disso você acessa **https://meu-busao.com.br** (ou o domínio que configurou) com cadeado verde.

*(Para URL grátis com HTTPS, use a seção 5 acima: sslip.io ou DuckDNS.)*
