@echo off
REM Abre LUMA como una app. El servidor queda en una ventana minimizada
REM "LUMA - servidor": cerrando esa ventana se apaga.
setlocal
cd /d "%~dp0"
title LUMA

REM --- Java: hace falta un JDK (trae javac para compilar), no alcanza con un JRE ---
REM (jshell.exe existe desde Java 9: descarta JDKs viejos como el 8)
REM 1) JAVA_HOME, solo si apunta a un JDK
if defined JAVA_HOME if not exist "%JAVA_HOME%\bin\javac.exe" set "JAVA_HOME="
if defined JAVA_HOME if not exist "%JAVA_HOME%\bin\jshell.exe" set "JAVA_HOME="
REM 2) El Java del PATH, si es un JDK
if not defined JAVA_HOME (
    for /f "tokens=1,* delims==" %%A in ('java -XshowSettings:properties -version 2^>^&1 ^| findstr /c:"java.home ="') do (
        for /f "tokens=*" %%H in ("%%B") do if exist "%%H\bin\javac.exe" if exist "%%H\bin\jshell.exe" set "JAVA_HOME=%%H"
    )
)
REM 3) Las carpetas donde se instalan los JDK
if not defined JAVA_HOME (
    for /d %%D in ("%ProgramFiles%\Java\jdk*" "%ProgramFiles%\Microsoft\jdk-*" "%ProgramFiles%\Amazon Corretto\jdk*" "%ProgramFiles%\Zulu\zulu*" "%ProgramFiles%\Eclipse Adoptium\jdk-*") do if exist "%%~D\bin\javac.exe" if exist "%%~D\bin\jshell.exe" set "JAVA_HOME=%%~D"
)
if not defined JAVA_HOME (
    echo No se encontro el JDK de Java. Tenes solo el JRE, que no alcanza para preparar LUMA.
    echo Instala "Temurin 21 LTS" eligiendo JDK ^(no JRE^) desde https://adoptium.net
    echo y volve a abrir LUMA.
    pause
    exit /b 1
)
set "PATH=%JAVA_HOME%\bin;%PATH%"

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
