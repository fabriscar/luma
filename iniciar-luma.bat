@echo off
REM Inicia LUMA en http://localhost:8080 - para apagarlo, cerrá esta ventana.
cd /d "%~dp0"

if not exist .env (
    echo No existe el archivo .env
    echo Copia .env.example como .env y completa la clave de MySQL.
    pause
    exit /b 1
)

call mvnw.cmd spring-boot:run
pause
