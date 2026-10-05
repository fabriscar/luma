# LUMA – Gestión de impresión 3D

Spring Boot 3 (Java 17+) + MySQL 8, con el frontend en `src/main/resources/static`.

Antes corría en la nube: **Render** (la web), **Aiven** (la base MySQL) y **Cloudinary** (fotos y STL).
Esta guía es para usarlo en tu PC como una app, sin perder lo que ya cargaste.

## 1. Requisitos (una sola vez)
- **Java 17 o más nuevo** (anda con el JDK 25 de Eclipse Adoptium).
- **MySQL Server 8** instalado y corriendo en la PC (se instala como servicio y arranca solo con Windows).

## 2. Configuración (una sola vez)
Copiá `.env.example` como `.env` y completá:
- `MYSQL_PASSWORD`: la clave de tu MySQL local.
- `JWT_SECRET`: cualquier frase.
- `CLOUDINARY_URL` (opcional): la de Render, si querés que las fotos nuevas se sigan subiendo a Cloudinary.
  Si la dejás vacía, las fotos nuevas se guardan en la carpeta `uploads/`.
  Las fotos viejas andan igual en los dos casos.

## 3. Traer tus datos de la nube (una sola vez)
Tus pedidos, productos, filamentos y demás están en la base de **Aiven**.
1. Entrá a [Render](https://dashboard.render.com), abrí tu servicio de LUMA y andá a **Environment**.
   Ahí están `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD` y `MYSQL_DATABASE`.
   (También aparecen en [console.aiven.io](https://console.aiven.io), en tu servicio MySQL → *Overview*.)
2. Doble click en **`traer-datos-de-aiven.bat`** y pegá esos datos cuando te los pida.

El script no borra nada de Aiven: hace una copia (`luma_nube.sql`) y la importa en tu MySQL local.
Guardá ese archivo, es tu backup.

## 4. Usarlo como app
- Doble click en **`crear-acceso-directo.bat`** (una sola vez): crea el ícono **LUMA** en el escritorio.
- Desde ahí, abrís LUMA con doble click en el ícono. Se abre en su propia ventana, como un programa.
  - La primera vez tarda unos minutos porque compila el programa.
  - El servidor queda en una ventana minimizada, "LUMA - servidor". Si cerrás esa ventana, LUMA se apaga.
  - Si el código cambia (por ejemplo, después de actualizar desde GitHub), se vuelve a compilar solo.

Si la base está vacía, el usuario es `admin` / `admin123`. Si importaste tus datos, usá tu usuario de siempre.

### Usarlo desde el celular u otra PC (misma red WiFi)
1. En la PC, corré `ipconfig` y anotá la "Dirección IPv4" (por ejemplo `192.168.0.15`).
2. Desde el celular, entrá a `http://192.168.0.15:8080`.
3. Si no carga, permití Java en el Firewall de Windows (redes privadas). Windows suele preguntarlo la primera vez.

## Backups
Ahora los datos viven solo en tu PC, así que conviene hacer una copia seguido:

```bat
mysqldump -u root -p luma > backup_luma.sql
```

Renombrá cada backup con la fecha para no pisar el anterior, y guardá también la carpeta `uploads/`.
Si Windows no encuentra `mysqldump`, está en `C:\Program Files\MySQL\MySQL Server 8.0\bin`.
