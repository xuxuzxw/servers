@echo off
cd /d "%~dp0"
npm run build
node dist/index.js