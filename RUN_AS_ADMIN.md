# PowerShell script futtatása Administrator módban

## Módszer 1: Start menüből (Egyszerű)

1. **Nyomd meg a Windows billentyűt** (vagy kattints a Start gombra)
2. **Írd be:** `PowerShell`
3. **Jobb klikk** a "Windows PowerShell" eredményre
4. **Válaszd:** "Run as administrator" (Futtatás rendszergazdaként)
5. **Kattints:** "Igen" a UAC (User Account Control) ablakban

## Módszer 2: Windows + X billentyűkombináció (Gyors)

1. **Nyomd meg:** `Windows + X`
2. **Válaszd:** "Windows PowerShell (Admin)" vagy "Terminal (Admin)"
3. **Kattints:** "Igen" a UAC ablakban

## Módszer 3: Futtatás (Run) ablakból

1. **Nyomd meg:** `Windows + R`
2. **Írd be:** `powershell`
3. **Nyomd meg:** `Ctrl + Shift + Enter` (ez automatikusan admin módban nyitja meg)
4. **Kattints:** "Igen" a UAC ablakban

## Módszer 4: Fájlkezelőből

1. **Nyisd meg a fájlkezelőt** (Windows + E)
2. **Navigálj:** `E:\ZedinArkManager`
3. **Jobb klikk** a `setup_ollama_network.ps1` fájlra
4. **Válaszd:** "Run with PowerShell" (ha van ilyen opció)
   - VAGY: "Run as administrator" → PowerShell

## Miután megnyitottad az Admin PowerShell-t:

```powershell
# Navigálj a mappába
cd E:\ZedinArkManager

# Futtasd a scriptet
.\setup_ollama_network.ps1
```

## Ha hibát kapsz: "execution policy"

Ha a PowerShell azt mondja, hogy "execution policy" hiba van, futtasd ezt:

```powershell
# Engedélyezd a scriptek futtatását (csak ebben a session-ben)
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process

# Vagy engedélyezd véglegesen (nem ajánlott)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Ellenőrzés: Admin módban vagy?

A PowerShell prompt elején látnod kell:
- `PS C:\WINDOWS\system32>` (vagy hasonló system32 mappa)
- A prompt előtt **nem** látod a felhasználóneved

Vagy futtasd ezt a parancsot:
```powershell
([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
```

Ha `True`-t ad vissza, akkor admin módban vagy! ✅

