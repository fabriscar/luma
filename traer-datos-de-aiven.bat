@echo off
REM Copia la base de datos de Aiven (la que usaba Render) a tu MySQL local.
REM No borra nada de Aiven: solo hace una copia.
setlocal
cd /d "%~dp0"

REM --- Buscar mysql / mysqldump ---
where mysqldump >nul 2>nul
if errorlevel 1 (
    for /d %%D in ("%ProgramFiles%\MySQL\MySQL Server *") do set "PATH=%%D\bin;%PATH%"
)
where mysqldump >nul 2>nul
if errorlevel 1 (
    echo No se encontro mysqldump. Instala MySQL Server 8 ^(incluye mysql y mysqldump^).
    pause
    exit /b 1
)

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
pause
exit /b 1
