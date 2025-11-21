#!/bin/bash
# SSL/HTTPS beállítás Let's Encrypt-tel

set -e

echo "========================================="
echo "SSL/HTTPS beállítás"
echo "========================================="

# Ellenőrzések
if ! command -v certbot &> /dev/null; then
    echo "📦 Certbot telepítése..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
else
    echo "✅ Certbot telepítve"
fi

if ! command -v nginx &> /dev/null; then
    echo "📦 Nginx telepítése..."
    sudo apt update
    sudo apt install -y nginx
else
    echo "✅ Nginx telepítve"
fi

# Domain vagy IP beállítása
read -p "Add meg a domain nevedet (vagy IP-t): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ Domain megadása kötelező!"
    exit 1
fi

# Nginx konfiguráció másolása
echo "📝 Nginx konfiguráció beállítása..."
sudo cp installers/nginx.conf /etc/nginx/sites-available/zedinark
sudo sed -i "s/your-domain/$DOMAIN/g" /etc/nginx/sites-available/zedinark
sudo sed -i "s/135.181.165.27/$DOMAIN/g" /etc/nginx/sites-available/zedinark

# Symlink létrehozása
sudo ln -sf /etc/nginx/sites-available/zedinark /etc/nginx/sites-enabled/

# Először HTTP-only verzió (Let's Encrypt számára)
echo "📝 HTTP-only konfiguráció létrehozása..."
sudo cp installers/nginx.conf /tmp/nginx_http.conf
sudo sed -i '/listen 443/d' /tmp/nginx_http.conf
sudo sed -i '/ssl_/d' /tmp/nginx_http.conf
sudo sed -i '/add_header Strict-Transport-Security/d' /tmp/nginx_http.conf
sudo cp /tmp/nginx_http.conf /etc/nginx/sites-available/zedinark

# Nginx újratöltése
echo "🔄 Nginx újratöltése..."
sudo nginx -t
sudo systemctl reload nginx

# SSL tanúsítvány lekérése
echo "🔒 SSL tanúsítvány lekérése..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Nginx újraindítása
echo "🔄 Nginx újraindítása..."
sudo systemctl restart nginx

echo ""
echo "========================================="
echo "✅ SSL/HTTPS beállítás befejezve!"
echo "========================================="
echo ""
echo "Az API most HTTPS-en elérhető:"
echo "  https://$DOMAIN"
echo "  https://$DOMAIN/docs"
echo ""

