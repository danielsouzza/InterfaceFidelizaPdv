@echo off
title Instalacao - Sistema de Fidelidade
color 0B

echo ========================================
echo   INSTALACAO - Sistema de Fidelidade
echo ========================================
echo.
echo Este processo instala as dependencias
echo necessarias para o sistema funcionar.
echo.
echo Aguarde...
echo.

REM Ir para o diretório do script
cd /d "%~dp0"

REM Instalar dependências
echo Instalando dependencias do Node.js...
call npm install

echo.
echo ========================================
echo   INSTALACAO CONCLUIDA!
echo ========================================
echo.
echo Agora voce pode executar:
echo   Sistema-Fidelidade.bat
echo.
echo.
pause
