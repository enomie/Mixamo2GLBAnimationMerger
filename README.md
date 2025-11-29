# Character Animation Pipeline

**System & Programmiersprachen:** Node.js, glTF, FBX, fbx2gltf CLI, glTF-Transform

## Credits

- **Base Character**: Kostenloser Download von [Quaternius - Ultimate Modular Characters](https://quaternius.com/packs/ultimatemodularcharacters.html)
- **Animationen**: Von [Mixamo](https://www.mixamo.com/)

## Installation

```bash
npm install
```

Installiert automatisch `@cocos/fbx2gltf` mit den fbx2gltf-Binärdateien für dein Betriebssystem.

## Verwendung

### 1. FBX-Dateien vorbereiten

**Empfehlung:** Lade dir zuerst alle Animationen von Mixamo herunter und benenne sie ordentlich, bevor du die Konvertierung startest. Mixamo exportiert alle Animationen standardmäßig als "mixamo.com" - benenne sie nach dem Dateinamen um (z.B. `walk.fbx`, `run.fbx`, etc.).

Kopiere deine FBX-Dateien in die entsprechenden Ordner:

```
input/base/character.fbx          ← T-Pose-FBX (mit Skin)
input/animations/idle.fbx         ← Animationen (ohne Skin)
input/animations/walk.fbx
input/animations/run.fbx
...
```

**Wichtig:** Alle FBX-Dateien müssen vom **gleichen Base-Character** stammen (z.B. alle von Mixamo für denselben Character).

### 2. FBX-Dateien debuggen (optional)

```bash
npm run debug
```

Analysiert FBX-Dateien und zeigt Kompatibilitätsprobleme.

### 3. Pipeline ausführen

```bash
npm run build
```

Führt alle Schritte aus: Konvertierung (FBX → GLB), Merge und Test.

**Oder einzeln:**
```bash
npm run convert    # FBX → GLB konvertieren
npm run merge      # GLB-Dateien zusammenführen
npm run test       # GLB mit Three.js testen
```

## Ergebnis

**`merged/character_all_animations.glb`** enthält:
- Das Mesh
- Das Skeleton
- Alle Animationen als einzelne Clips

Die Dokumentation wird automatisch in `merged/character_all_animations.md` erstellt.

## Demo testen

```bash
python3 -m http.server 8000
```

Öffne im Browser: `http://localhost:8000/playable_demo.html`

Die Demo zeigt:
- Character mit allen Animationen
- Steuerung: W/A/S/D (Bewegung), SHIFT (Laufen), SPACE (Springen)
- Console-Logs mit allen wichtigen Informationen

## Wichtige Hinweise

- **Base Character**: Exportiere mit Skin (Mesh + Skeleton)
- **Animationen**: Exportiere ohne Skin (nur Animation)
- **Animation-Namen**: Alle Animationen sollten benannt sein (nicht "Take 001")
- Das Merge-Skript entfernt automatisch unnamed Animationen wie "mixamo.com"

## Scripts

- `npm run debug` - FBX-Dateien analysieren
- `npm run convert` - FBX → GLB konvertieren
- `npm run merge` - Animationen zusammenführen
- `npm run test` - GLB testen
- `npm run build` - Komplette Pipeline
