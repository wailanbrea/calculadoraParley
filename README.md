# Calculadora de Parley & Comparador HCE (MLB) - BSolutions

Plataforma integral de cálculo de parleys y comparador de líneas de apuestas deportivas en tiempo real entre **BetOnline** y **Betcris**.

Desplegado en: [https://calcparley.bsolutions.dev](https://calcparley.bsolutions.dev)

---

## ⚡ Módulo de Sincronización Automática HCE (MLB)

Permite extraer y comparar en tiempo real las líneas de **Hits + Carreras + Errores (HCE / R+H+E)** de las Grandes Ligas de Béisbol entre BetOnline y Betcris con 1 solo clic.

Para detalles completos de arquitectura, ingeniería inversa de Betcris (Angular SPA), endpoints internos (`/gateway/BetslipProxy.aspx/`), selectores DOM y guía técnica para desarrolladores e IAs, consulta:

👉 **[HCE_SYNC_ARCHITECTURE.md](./HCE_SYNC_ARCHITECTURE.md)**

---

## 🚀 Despliegue y Comandos

### Desarrollo Local
```bash
npm install
npm run dev
```

### Compilar para Producción
```bash
npm run build
```

### Empaquetar Extensión de Chrome
```powershell
Compress-Archive -Path "public\extension\*" -DestinationPath "public\extension.zip" -Force
```

### Despliegue en Servidor VPS
```bash
ssh bsolutions-vps "cd /d C:\xampp\htdocs\calcparley && git pull origin main && npm run build"
```
