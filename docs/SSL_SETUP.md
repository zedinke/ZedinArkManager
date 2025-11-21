# 🔒 SSL/HTTPS beállítás

## 📋 Áttekintés

Nginx reverse proxy SSL/HTTPS támogatással.

## 🚀 Gyors telepítés

### Automatikus SSL beállítás

```bash
cd ~/ZedinArkManager
chmod +x installers/setup-ssl.sh
sudo ./installers/setup-ssl.sh
```

A script:
- ✅ Telepíti a Certbot-ot
- ✅ Telepíti az Nginx-t
- ✅ Lekéri az SSL tanúsítványt (Let's Encrypt)
- ✅ Beállítja az Nginx konfigurációt

## 📝 Manuális beállítás

### 1. Nginx telepítése

```bash
sudo apt update
sudo apt install -y nginx
```

### 2. Certbot telepítése

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 3. Nginx konfiguráció

```bash
# Konfiguráció másolása
sudo cp installers/nginx.conf /etc/nginx/sites-available/zedinark

# Domain/IP beállítása (szerkeszd a fájlt)
sudo nano /etc/nginx/sites-available/zedinark

# Symlink létrehozása
sudo ln -s /etc/nginx/sites-available/zedinark /etc/nginx/sites-enabled/

# Régi default törlése (ha van)
sudo rm /etc/nginx/sites-enabled/default

# Konfiguráció ellenőrzése
sudo nginx -t

# Nginx újratöltése
sudo systemctl reload nginx
```

### 4. SSL tanúsítvány lekérése

**Domain-nel:**
```bash
sudo certbot --nginx -d yourdomain.com --non-interactive --agree-tos --email your@email.com
```

**IP címre (Let's Encrypt nem támogat, használj önaláírt tanúsítványt):**
```bash
# Önaláírt tanúsítvány
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/zedinark.key \
  -out /etc/nginx/ssl/zedinark.crt
```

### 5. Nginx újraindítása

```bash
sudo systemctl restart nginx
```

## ⚙️ Konfiguráció testreszabása

Szerkeszd a `/etc/nginx/sites-available/zedinark` fájlt:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL tanúsítványok
    ssl_certificate /etc/letsencrypt/live/your-domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain/privkey.pem;
    
    # ... többi beállítás
}
```

## 🔄 Tanúsítvány megújítása

Let's Encrypt tanúsítványok 90 napig érvényesek. Automatikus megújítás:

```bash
# Cron job hozzáadása (automatikus megújítás)
sudo crontab -e

# Hozzáadás:
0 0 * * * certbot renew --quiet
```

## 🔍 Ellenőrzés

### Nginx státusz

```bash
sudo systemctl status nginx
```

### SSL ellenőrzés

```bash
curl -I https://your-domain.com/health
```

### Tanúsítvány információk

```bash
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

## 🛡️ Biztonsági beállítások

Az `nginx.conf` tartalmazza:

- ✅ TLS 1.2 és 1.3 támogatás
- ✅ Biztonságos cipher suite-ek
- ✅ HSTS (HTTP Strict Transport Security)
- ✅ Security headers
- ✅ Hosszabb timeout-ok (LLM válaszokhoz)

## ⚠️ Fontos megjegyzések

1. **Domain szükséges** - Let's Encrypt csak domain-nel működik, nem IP-vel
2. **Port 80 és 443** - Nyisd meg a tűzfalban
3. **Automatikus megújítás** - Állítsd be a cron job-ot

---

**Biztonságos HTTPS kapcsolat! 🔒**

