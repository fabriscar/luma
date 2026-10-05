@echo off
REM Copia la base de datos de Aiven (la que usaba Render) a tu MySQL local.
REM No borra nada de Aiven: solo hace una copia.
setlocal
cd /d "%~dp0"

REM --- Buscar mysql / mysqldump ---
set "MYSQLBIN="
where mysqldump >nul 2>nul
if not errorlevel 1 goto mysql_ok

REM 1) La carpeta del servicio de MySQL instalado en Windows
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "$s = Get-CimInstance Win32_Service | Where-Object { $_.PathName -match 'mysqld' } | Select-Object -First 1; if ($s) { $p = $s.PathName.Trim(); if ($p.StartsWith([string][char]34)) { $p = $p.Substring(1, $p.IndexOf([char]34, 1) - 1) } else { $p = $p.Split(' ')[0] }; Split-Path $p }" 2^>nul`) do set "MYSQLBIN=%%P"
if defined MYSQLBIN if exist "%MYSQLBIN%\mysqldump.exe" goto mysql_ruta

REM 2) Las carpetas donde se instala normalmente (Server o Workbench)
set "MYSQLBIN="
for /d %%D in ("%ProgramFiles%\MySQL\MySQL Server *") do if exist "%%~D\bin\mysqldump.exe" set "MYSQLBIN=%%~D\bin"
if defined MYSQLBIN goto mysql_ruta
for /d %%D in ("%ProgramFiles%\MySQL\MySQL Workbench *") do if exist "%%~D\mysqldump.exe" set "MYSQLBIN=%%~D"
if defined MYSQLBIN goto mysql_ruta

REM 3) Preguntar
echo.
echo No encontre MySQL automaticamente.
echo Busca el archivo mysqldump.exe en el Explorador. Suele estar en
echo C:\Program Files\MySQL\MySQL Server 8.x\bin
echo Pega aca la carpeta donde esta y apreta Enter:
set /p "MYSQLBIN=Carpeta: "
if not defined MYSQLBIN goto sin_mysql
set "MYSQLBIN=%MYSQLBIN:"=%"
if /i "%MYSQLBIN:~-13%"=="mysqldump.exe" set "MYSQLBIN=%MYSQLBIN:~0,-13%"

:mysql_ruta
if not exist "%MYSQLBIN%\mysqldump.exe" goto sin_mysql
set "PATH=%MYSQLBIN%;%PATH%"

:mysql_ok
for /f "delims=" %%V in ('mysqldump --version') do echo Usando: %%V

echo.
echo Busca estos datos en Render: tu servicio ^> Environment
echo ^(o en console.aiven.io ^> tu servicio MySQL ^> Overview^)
echo.
set /p AHOST=MYSQL_HOST de Aiven:
set /p APORT=MYSQL_PORT de Aiven:
set /p AUSER=MYSQL_USER de Aiven (normalmente avnadmin):
set /p ADB=MYSQL_DATABASE de Aiven (normalmente defaultdb):

echo.
echo Ahora pega la clave de Aiven ^(MYSQL_PASSWORD^):
mysqldump -h %AHOST% -P %APORT% -u %AUSER% -p --ssl-mode=REQUIRED --single-transaction --no-tablespaces --set-gtid-purged=OFF --default-character-set=utf8mb4 --result-file=luma_nube.sql %ADB%
if errorlevel 1 (
    echo No se pudo descargar la base de Aiven. Revisa los datos e intenta de nuevo.
    pause
    exit /b 1
)
echo Copia guardada en luma_nube.sql ^(guardala, es tu backup^).

echo.
echo ATENCION: esto reemplaza lo que haya en la base "luma" de tu PC.
set /p SEGUIR=Escribi SI para importarla:
if /i not "%SEGUIR%"=="SI" (
    echo Cancelado. La copia quedo en luma_nube.sql
    pause
    exit /b 0
)

set /p LUSER=Usuario de tu MySQL local (Enter = root):
if "%LUSER%"=="" set "LUSER=root"
echo Clave de tu MySQL local ^(la de MYSQL_PASSWORD en .env^):
mysql -u %LUSER% -p -e "CREATE DATABASE IF NOT EXISTS luma CHARACTER SET utf8mb4"
if errorlevel 1 goto error
echo Otra vez la clave de tu MySQL local:
mysql -u %LUSER% -p --default-character-set=utf8mb4 luma < luma_nube.sql
if errorlevel 1 goto error

echo.
echo Listo! Tus datos ya estan en la base "luma" de tu PC.
pause
exit /b 0

:error
echo Hubo un error al importar. La copia sigue en luma_nube.sql
echo Si dice "Can't connect", MySQL Server no esta prendido: revisalo en Servicios ^(MySQL80 o MySQL84^).
pause
exit /b 1

:sin_mysql
echo No se encontro mysqldump.exe. Instala MySQL Server 8 ^(trae mysql y mysqldump^).
pause
exit /b 1
