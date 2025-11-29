# FBX File Capabilities

The Autodesk **FBX** (Filmbox) format is a widely‑used container for 3D assets.  An FBX file can store a rich set of data that can be consumed by game engines, 3‑D software, and web‑based viewers such as three.js.

## Core Elements

- **Geometry / Meshes** – Vertex positions, normals, UVs, vertex colors, tangents, and optional custom attributes.
- **Skeleton / Armature** – Hierarchical bone structure (joint hierarchy) with bind‑pose matrices.
- **Skinning / Weights** – Per‑vertex bone influences (up to 4 weights per vertex in most exporters).
- **Animations** – One or more animation stacks, each containing:
  - **Keyframe tracks** for translation, rotation (quaternion or Euler), scale, and custom user‑defined properties.
  - **Blend shapes / Morph targets** (if present).
- **Materials** – References to material definitions (often exported as separate `.mtl` files for OBJ, but FBX can embed simple material data such as diffuse, specular, emissive colors, and texture file paths.
- **Textures** – Embedded image data or external file references (PNG, JPG, TGA, etc.).
- **Cameras** – Position, orientation, field‑of‑view, clipping planes.
- **Lights** – Type (point, directional, spot), color, intensity, attenuation.
- **Metadata / Custom Properties** – Arbitrary name/value pairs attached to nodes, meshes, or the scene (e.g., `UserData`, `AnimationLayer` information).

## Optional / Advanced Features

- **Blend Shapes / Morph Targets** – Vertex‑level deformations for facial animation or shape keys.
- **Vertex Cache Deformation** – For GPU‑based skinning pipelines.
- **Scene Nodes** – Empty transform nodes used for grouping or pivot points.
- **Constraints** – IK, look‑at, and other constraints (often ignored by exporters).
- **LOD Groups** – Level‑of‑detail information.
- **Embedded Audio** – Rare, but possible.

## What Three.js (FBXLoader) extracts

When using `THREE.FBXLoader` the following are parsed and exposed on the loaded `Object3D` hierarchy:

- Geometry (`THREE.BufferGeometry`)
- Materials (`THREE.MeshStandardMaterial` or similar)
- Skeleton (`THREE.Skeleton`)
- Animation clips (`THREE.AnimationClip`)
- Cameras (`THREE.Camera`)
- Lights (`THREE.Light`)

Anything outside this set (e.g., custom user properties, constraints) is ignored by the loader.

---

*This file serves as a quick reference for developers working with the `character-animation` project to understand what data can be expected from the source FBX files and what will be available after loading them with three.js.*
