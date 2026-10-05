# LUMA – Gestión de impresión 3D

Spring Boot 3 (Java 17+) + MySQL 8, con el frontend en `src/main/resources/static`.

## Correrlo en tu computadora (Windows)

### Requisitos
- **Java 17 o más nuevo** (anda con el JDK 25 de Eclipse Adoptium). Tiene que estar en el `PATH` o con `JAVA_HOME` configurado.
- **MySQL 8** corriendo en la PC. La base `luma` se crea sola la primera vez.

### Pasos
1. Copiá `.env.example` como `.env` y poné tu clave de MySQL en `MYSQL_PASSWORD` (y una frase cualquiera en `JWT_SECRET`).
2. Arrancalo de alguna de estas formas:
   - doble click en **`iniciar-luma.bat`**, o
   - en VS Code: *Run and Debug* → **▶ Luma - Spring Boot**, o
   - en una terminal: `mvnw.cmd spring-boot:run`
3. Abrí **http://localhost:8080**. Si la base está vacía se crea el usuario `admin` / `admin123`.

Sin `CLOUDINARY_URL`, las fotos y los STL se guardan en la carpeta `uploads/` del proyecto.
Las librerías JS están en `static/vendor`, así que no hace falta internet.

### Usarlo desde el celular u otra PC (misma red WiFi)
1. En la PC, corré `ipconfig` y anotá la "Dirección IPv4" (ej. `192.168.0.15`).
2. Desde el celular, entrá a `http://192.168.0.15:8080`.
3. Si no carga, permití Java en el Firewall de Windows (redes privadas). Windows suele preguntarlo la primera vez que arranca el servidor.

### Traer los datos que tenés en la nube (Railway)
Con los datos de conexión de la base de Railway (host, puerto, usuario y clave):

```bat
mysqldump -h HOST_RAILWAY -P PUERTO -u USUARIO -p --no-tablespaces --set-gtid-purged=OFF railway > luma_nube.sql
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS luma"
mysql -u root -p luma < luma_nube.sql
```

(`railway` es el nombre de la base en Railway. Cambialo si la tuya se llama distinto.
Si Windows no encuentra `mysql`/`mysqldump`, están en `C:\Program Files\MySQL\MySQL Server 8.0\bin`.)
Las fotos y STLs que ya están en Cloudinary siguen andando mientras exista esa cuenta.

### Backups
Ahora los datos viven solo en tu PC, así que conviene hacer una copia seguido:

```bat
mysqldump -u root -p luma > backup_luma.sql
```

Renombrá cada backup con la fecha para no pisar el anterior.

Guardá también la carpeta `uploads/`.
