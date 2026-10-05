@echo off
REM Abre LUMA como una app. El servidor queda en una ventana minimizada
REM "LUMA - servidor": cerrando esa ventana se apaga.
setlocal
cd /d "%~dp0"
title LUMA

REM --- Java: si no esta en el PATH, usar el JDK de Eclipse Adoptium ---
if not defined JAVA_HOME (
    for /d %%D in ("%ProgramFiles%\Eclipse Adoptium\jdk-*") do set "JAVA_HOME=%%~D"
)
if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"
where java >nul 2>nul
if errorlevel 1 (
    echo No se encontro Java. Instala Java 17 o mas nuevo desde https://adoptium.net
    pause
    exit /b 1
)

if not exist .env (
    echo No existe el archivo .env
    echo Copia .env.example como .env y completa la clave de MySQL.
    pause
    exit /b 1
)

REM --- Si el servidor ya esta corriendo, solo abrir la ventana ---
curl -s -o nul http://localhost:8080/
if not errorlevel 1 goto abrir

REM --- Compilar si no existe el programa o si el codigo cambio ---
set "COMPILAR=0"
if not exist target\luma.jar set "COMPILAR=1"
if exist target\luma.jar (
    powershell -NoProfile -Command "$j = Get-Item 'target\luma.jar'; $n = Get-ChildItem src, pom.xml -Recurse -File | Where-Object { $_.LastWriteTime -gt $j.LastWriteTime } | Select-Object -First 1; if ($n) { exit 1 }"
    if errorlevel 1 set "COMPILAR=1"
)
if "%COMPILAR%"=="1" (
    echo Preparando LUMA, la primera vez puede tardar unos minutos...
    call mvnw.cmd -q -DskipTests package
    if errorlevel 1 (
        echo Hubo un error al compilar LUMA.
        pause
        exit /b 1
    )
)

echo Iniciando LUMA...
start "LUMA - servidor (cerra esta ventana para apagar)" /min java -jar target\luma.jar

REM --- Esperar a que responda (maximo 2 minutos) ---
set /a INTENTOS=0
:esperar
timeout /t 2 /nobreak >nul
curl -s -o nul http://localhost:8080/
if not errorlevel 1 goto abrir
set /a INTENTOS+=1
if %INTENTOS% lss 60 goto esperar
echo LUMA no arranco. Revisa la ventana "LUMA - servidor" (por ejemplo, si MySQL esta prendido).
pause
exit /b 1

:abrir
REM Edge en modo app: ventana propia, sin barra de direcciones
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%EDGE%" (
    start "" "%EDGE%" --app=http://localhost:8080
) else (
    start "" http://localhost:8080
)
exit /b 0
