#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

FBX2GLTF="$PROJECT_ROOT/node_modules/@cocos/fbx2gltf/bin/Darwin/FBX2glTF"

if [ ! -f "$FBX2GLTF" ]; then
    echo "❌ fbx2gltf Binary nicht gefunden: $FBX2GLTF"
    echo "   Bitte führe aus: npm install"
    exit 1
fi

INPUT_BASE="$PROJECT_ROOT/input/base"
INPUT_ANIM="$PROJECT_ROOT/input/animations"

OUT_BASE="$PROJECT_ROOT/converted/base"
OUT_ANIM="$PROJECT_ROOT/converted/animations"

mkdir -p "$OUT_BASE"
mkdir -p "$OUT_ANIM"

if [ ! -f "$INPUT_BASE/character.fbx" ]; then
    echo "⚠️  Keine character.fbx in $INPUT_BASE gefunden"
    exit 1
fi

"$FBX2GLTF" -i "$INPUT_BASE/character.fbx" -o "$OUT_BASE/character" -b

if [ ! -d "$INPUT_ANIM" ] || [ -z "$(ls -A "$INPUT_ANIM"/*.fbx 2>/dev/null)" ]; then
    echo "⚠️  Keine FBX-Animationen in $INPUT_ANIM gefunden"
    exit 1
fi

for f in "$INPUT_ANIM"/*.fbx
do
    name=$(basename "$f" .fbx)
    "$FBX2GLTF" -i "$f" -o "$OUT_ANIM/$name" -b
    echo "✅ Konvertiert: $name.glb"
done

echo "✅ Alle FBX-Dateien konvertiert"

