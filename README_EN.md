# Character Animation Pipeline

**System & Programming Languages:** Node.js, glTF, FBX, fbx2gltf CLI, glTF-Transform

## Credits

- **Base Character**: Free download from [Quaternius - Ultimate Modular Characters](https://quaternius.com/packs/ultimatemodularcharacters.html)
- **Animations**: From [Mixamo](https://www.mixamo.com/)

## Installation

```bash
npm install
```

Automatically installs `@cocos/fbx2gltf` with fbx2gltf binaries for your operating system.

## Usage

### 1. Prepare FBX Files

**Recommendation:** Download all animations from Mixamo first and name them properly before starting the conversion. Mixamo exports all animations as "mixamo.com" by default - rename them according to the filename (e.g., `walk.fbx`, `run.fbx`, etc.).

Copy your FBX files to the corresponding folders:

```
input/base/character.fbx          ← T-Pose FBX (with Skin)
input/animations/idle.fbx         ← Animations (without Skin)
input/animations/walk.fbx
input/animations/run.fbx
...
```

**Important:** All FBX files must be from the **same base character** (e.g., all from Mixamo for the same character).

### 2. Debug FBX Files (Optional)

```bash
npm run debug
```

Analyzes FBX files and shows compatibility issues.

### 3. Run Pipeline

```bash
npm run build
```

Executes all steps: Conversion (FBX → GLB), Merge, and Test.

**Or individually:**
```bash
npm run convert    # Convert FBX → GLB
npm run merge      # Merge GLB files
npm run test       # Test GLB with Three.js
```

## Output

**`merged/character_all_animations.glb`** contains:
- The Mesh
- The Skeleton
- All animations as individual clips

Documentation is automatically created in `merged/character_all_animations.md`.

## Test Demo

```bash
python3 -m http.server 8000
```

Open in browser: `http://localhost:8000/playable_demo.html`

The demo shows:
- Character with all animations
- Controls: W/A/S/D (Move), SHIFT (Run), SPACE (Jump)
- Console logs with all important information

## Important Notes

- **Base Character**: Export with Skin (Mesh + Skeleton)
- **Animations**: Export without Skin (animation only)
- **Animation Names**: All animations should be named (not "Take 001")
- The merge script automatically removes unnamed animations like "mixamo.com"

## Scripts

- `npm run debug` - Analyze FBX files
- `npm run convert` - Convert FBX → GLB
- `npm run merge` - Merge animations
- `npm run test` - Test GLB
- `npm run build` - Complete pipeline

