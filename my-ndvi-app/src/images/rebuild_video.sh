#!/bin/sh
# Reconstruye el video desde el archivo base64
set -e
cd "$(dirname "$0")"
if [ -f vides_loop.mp4.b64 ]; then
  base64 -d vides_loop.mp4.b64 > vides_loop.mp4
  echo "Video reconstruido: vides_loop.mp4"
else
  echo "No se encontró vides_loop.mp4.b64"
  exit 1
fi
