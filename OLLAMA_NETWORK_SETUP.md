# Ollama hálózati elérhetőség beállítása

## Probléma

Az Ollama alapértelmezetten csak `127.0.0.1:11434`-en hallgat, így a hálózatról nem elérhető. A distributed computing működéséhez a szervernek el kell érnie a kliens Ollama-ját.

## Megoldás

### Windows

1. **Környezeti változó beállítása:**
   ```powershell
   # Rendszer szintű környezeti változó hozzáadása
   [System.Environment]::SetEnvironmentVariable("OLLAMA_HOST", "0.0.0.0:11434", "Machine")
   ```

2. **Vagy manuálisan:**
   - Nyisd meg a "Rendszerváltozók szerkesztése" (System Properties)
   - Rendszerváltozók → Új
   - Név: `OLLAMA_HOST`
   - Érték: `0.0.0.0:11434`
   - OK, majd indítsd újra az Ollama-t

3. **Ollama újraindítása:**
   ```powershell
   # Ollama leállítása
   taskkill /F /IM ollama.exe
   
   # Ollama újraindítása (automatikusan elindul)
   # Vagy manuálisan:
   ollama serve
   ```

4. **Ellenőrzés:**
   ```powershell
   # Ellenőrizd, hogy a hálózatról is elérhető-e
   netstat -an | findstr :11434
   # Látnod kell: 0.0.0.0:11434 (nem csak 127.0.0.1:11434)
   ```

### Linux

1. **Környezeti változó beállítása:**
   ```bash
   # Rendszer szintű (systemd service esetén)
   sudo systemctl edit ollama
   ```
   
   Adja hozzá:
   ```ini
   [Service]
   Environment="OLLAMA_HOST=0.0.0.0:11434"
   ```

2. **Vagy manuálisan:**
   ```bash
   export OLLAMA_HOST=0.0.0.0:11434
   ollama serve
   ```

3. **Ellenőrzés:**
   ```bash
   netstat -tlnp | grep 11434
   # Látnod kell: 0.0.0.0:11434
   ```

## Tűzfal beállítások

### Windows

1. **Windows Defender Tűzfal:**
   - Vezérlőpult → Rendszer és biztonság → Windows Defender Tűzfal
   - Bejövő szabályok → Új szabály
   - Port → TCP → 11434
   - Engedélyezés
   - Minden hálózat

2. **Vagy PowerShell:**
   ```powershell
   New-NetFirewallRule -DisplayName "Ollama" -Direction Inbound -LocalPort 11434 -Protocol TCP -Action Allow
   ```

### Linux

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 11434/tcp

# firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=11434/tcp
sudo firewall-cmd --reload
```

## Port forwarding (ha NAT mögött vagy)

Ha a kliens gép NAT mögött van (router), port forwarding kell:

1. **Router beállítások:**
   - Port forwarding: 11434 → kliens gép belső IP-je (pl. 192.168.1.100)
   - Protokoll: TCP

2. **Példa:**
   - Külső port: 11434
   - Belső IP: 192.168.1.100
   - Belső port: 11434

## Tesztelés

1. **Helyi teszt:**
   ```powershell
   # Kliens gépen
   curl http://localhost:11434/api/tags
   ```

2. **Hálózati teszt (másik gépről):**
   ```powershell
   # Szerverről vagy másik gépről
   curl http://84.0.200.125:11434/api/tags
   ```

3. **Ha sikeres, látnod kell:**
   ```json
   {"models":[...]}
   ```

## Biztonsági megjegyzések

⚠️ **FIGYELEM:** Ha az Ollama-t a hálózatról elérhetővé teszed, biztonsági kockázat jelenthet. Ajánlott:

1. **VPN használata** a kliens és szerver között
2. **API kulcs védelem** (ha az Ollama támogatja)
3. **IP whitelist** (csak bizonyos IP-kről engedélyezett hozzáférés)
4. **TLS/SSL** használata (ha lehetséges)

## Automatikus beállítás script (Windows)

Hozz létre egy `setup_ollama_network.ps1` fájlt:

```powershell
# Ollama hálózati elérhetőség beállítása
Write-Host "Ollama hálózati elérhetőség beállítása..." -ForegroundColor Green

# Környezeti változó beállítása
[System.Environment]::SetEnvironmentVariable("OLLAMA_HOST", "0.0.0.0:11434", "Machine")
Write-Host "✅ OLLAMA_HOST környezeti változó beállítva: 0.0.0.0:11434" -ForegroundColor Green

# Tűzfalszabály hozzáadása
try {
    New-NetFirewallRule -DisplayName "Ollama" -Direction Inbound -LocalPort 11434 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
    Write-Host "✅ Tűzfalszabály hozzáadva (11434 port)" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Tűzfalszabály már létezik vagy hiba történt" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "⚠️ FONTOS: Indítsd újra az Ollama-t!" -ForegroundColor Yellow
Write-Host "   - Leállítás: taskkill /F /IM ollama.exe" -ForegroundColor Yellow
Write-Host "   - Újraindítás: ollama serve" -ForegroundColor Yellow
Write-Host ""
Write-Host "Ellenőrzés:" -ForegroundColor Cyan
Write-Host "   netstat -an | findstr :11434" -ForegroundColor Cyan
Write-Host "   Látnod kell: 0.0.0.0:11434" -ForegroundColor Cyan
```

Futtatás:
```powershell
powershell -ExecutionPolicy Bypass -File setup_ollama_network.ps1
```

