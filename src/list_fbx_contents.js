// list_fbx_contents.js
// Node.js script that loads an FBX file using three.js (FBXLoader) and prints a summary of its contents.
// Usage: node src/list_fbx_contents.js <path-to-fbx>

import * as fs from 'fs';
import * as path from 'path';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { Mesh, SkinnedMesh, Skeleton, AnimationClip, Camera, Light } from 'three';

if (process.argv.length < 3) {
    console.error('Usage: node src/list_fbx_contents.js <path-to-fbx>');
    process.exit(1);
}

const fbxPath = path.resolve(process.argv[2]);
if (!fs.existsSync(fbxPath)) {
    console.error(`File not found: ${fbxPath}`);
    process.exit(1);
}

const loader = new FBXLoader();
// Read the FBX file synchronously and parse it (avoids fetch in Node)
const fileBuffer = fs.readFileSync(fbxPath);
// Convert Node Buffer to a true ArrayBuffer
const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
const object = loader.parse(arrayBuffer);
// Continue with the same processing logic as the original callback

const summary = {
    meshes: [],
    skinnedMeshes: [],
    skeletons: [],
    animationClips: [],
    cameras: [],
    lights: [],
};

object.traverse((child) => {
    if (child instanceof Mesh && !(child instanceof SkinnedMesh)) {
        summary.meshes.push(child.name || '(unnamed)');
    } else if (child instanceof SkinnedMesh) {
        summary.skinnedMeshes.push(child.name || '(unnamed)');
        if (child.skeleton) {
            const boneNames = child.skeleton.bones.map((b) => b.name);
            summary.skeletons.push({ mesh: child.name, bones: boneNames });
        }
    } else if (child instanceof Camera) {
        summary.cameras.push(child.name || '(unnamed)');
    } else if (child instanceof Light) {
        summary.lights.push(child.name || '(unnamed)');
    }
});

if (object.animations && object.animations.length > 0) {
    object.animations.forEach((clip) => {
        summary.animationClips.push({ name: clip.name, tracks: clip.tracks.length });
    });
}

console.log('=== FBX Summary ===');
console.log(`File: ${fbxPath}`);
console.log(`Meshes: ${summary.meshes.length}`);
console.log(`Skinned Meshes: ${summary.skinnedMeshes.length}`);
console.log(`Skeletons: ${summary.skeletons.length}`);
console.log(`Animation Clips: ${summary.animationClips.length}`);
console.log(`Cameras: ${summary.cameras.length}`);
if (summary.animationClips.length > 0) {
    summary.animationClips.forEach((clip) => {
        console.log(`\nAnimation Clip: ${clip.name}`);
        console.log('Tracks:');
        // Find the corresponding clip object from the parsed FBX
        const matchingClip = object.animations.find(c => c.name === clip.name);
        if (matchingClip) {
            matchingClip.tracks.forEach((track) => {
                console.log(`  - ${track.name}`);
            });
        }
    });
}
console.log(`Lights: ${summary.lights.length}`);
console.log('\nDetailed lists (optional, uncomment if needed):');
// Uncomment the following lines for a verbose output:
// console.log('Meshes:', summary.meshes);
// console.log('Skinned Meshes:', summary.skinnedMeshes);
// console.log('Skeletons:', summary.skeletons);
// console.log('Animation Clips:', summary.animationClips);
// console.log('Cameras:', summary.cameras);
// console.log('Lights:', summary.lights);
// No longer needed: loader.load callbacks have been replaced with synchronous parsing.
