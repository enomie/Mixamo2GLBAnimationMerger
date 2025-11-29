// /Users/johann/MyBrew/car2/character-animation/scripts/debug_fbx.js

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { Mesh, SkinnedMesh, Bone, Object3D } from 'three';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const INPUT_BASE = path.join(PROJECT_ROOT, 'input/base');
const INPUT_ANIM = path.join(PROJECT_ROOT, 'input/animations');

function normalizeName(name) {
    return name.replace(/\./g, '').replace(/_\d+$/, '').toLowerCase();
}

function collectBones(object, boneMap = new Map(), parent = null) {
    if (object instanceof Bone) {
        boneMap.set(object.name, {
            name: object.name,
            normalized: normalizeName(object.name),
            parent: parent?.name || null,
            children: []
        });
        object.children.forEach(child => {
            collectBones(child, boneMap, object);
        });
    } else {
        object.children.forEach(child => {
            collectBones(child, boneMap, parent);
        });
    }
    return boneMap;
}

function collectNodes(object, nodeMap = new Map()) {
    nodeMap.set(object.name || '(unnamed)', {
        name: object.name || '(unnamed)',
        normalized: normalizeName(object.name || ''),
        type: object.constructor.name,
        hasMesh: object instanceof Mesh || object instanceof SkinnedMesh,
        isBone: object instanceof Bone
    });
    object.children.forEach(child => {
        collectNodes(child, nodeMap);
    });
    return nodeMap;
}

function analyzeFBX(fbxPath) {
    if (!fs.existsSync(fbxPath)) {
        throw new Error(`File not found: ${fbxPath}`);
    }

    const loader = new FBXLoader();
    const fileBuffer = fs.readFileSync(fbxPath);
    const arrayBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
    );
    const object = loader.parse(arrayBuffer);

    const bones = collectBones(object);
    const nodes = collectNodes(object);

    const skinnedMeshes = [];
    object.traverse((child) => {
        if (child instanceof SkinnedMesh) {
            const skeletonBones = child.skeleton ? child.skeleton.bones.map(b => b.name) : [];
            skinnedMeshes.push({
                name: child.name || '(unnamed)',
                boneCount: skeletonBones.length,
                bones: skeletonBones
            });
        }
    });

    const animations = [];
    if (object.animations && object.animations.length > 0) {
        object.animations.forEach((clip) => {
            const tracks = clip.tracks.map(track => ({
                name: track.name,
                targetNode: track.name.split('.')[0],
                property: track.name.split('.').slice(1).join('.')
            }));

            const targetNodes = [...new Set(tracks.map(t => t.targetNode))];

            animations.push({
                name: clip.name || '(unnamed)',
                duration: clip.duration,
                tracks: tracks.length,
                targetNodes: targetNodes,
                hasUnnamed: !clip.name || clip.name === '(unnamed)'
            });
        });
    }

    return {
        file: path.basename(fbxPath),
        path: fbxPath,
        bones: bones,
        nodes: nodes,
        skinnedMeshes: skinnedMeshes,
        animations: animations,
        hasUnnamedAnimations: animations.some(a => a.hasUnnamed)
    };
}

function compareStructures(baseAnalysis, animAnalysis) {
    const baseBoneNames = new Set(Array.from(baseAnalysis.bones.keys()));
    const baseNormalizedBones = new Map();
    baseAnalysis.bones.forEach((bone, name) => {
        const norm = bone.normalized;
        if (!baseNormalizedBones.has(norm)) {
            baseNormalizedBones.set(norm, []);
        }
        baseNormalizedBones.get(norm).push(name);
    });

    const animBoneNames = new Set(Array.from(animAnalysis.bones.keys()));
    const animNormalizedBones = new Map();
    animAnalysis.bones.forEach((bone, name) => {
        const norm = bone.normalized;
        if (!animNormalizedBones.has(norm)) {
            animNormalizedBones.set(norm, []);
        }
        animNormalizedBones.get(norm).push(name);
    });

    const missingInAnim = [];
    const extraInAnim = [];
    const nameMismatches = [];

    baseBoneNames.forEach(baseName => {
        const baseNorm = normalizeName(baseName);
        const matching = Array.from(animBoneNames).find(animName => 
            normalizeName(animName) === baseNorm
        );
        if (!matching) {
            missingInAnim.push(baseName);
        } else if (baseName !== matching) {
            nameMismatches.push({ base: baseName, anim: matching });
        }
    });

    animBoneNames.forEach(animName => {
        const animNorm = normalizeName(animName);
        const matching = Array.from(baseBoneNames).find(baseName => 
            normalizeName(baseName) === animNorm
        );
        if (!matching) {
            extraInAnim.push(animName);
        }
    });

    const animTargetNodes = new Set();
    animAnalysis.animations.forEach(anim => {
        anim.targetNodes.forEach(node => animTargetNodes.add(node));
    });

    const missingTargetNodes = [];
    animTargetNodes.forEach(targetNode => {
        const normalized = normalizeName(targetNode);
        const hasMatch = Array.from(baseBoneNames).some(baseName =>
            normalizeName(baseName) === normalized
        );
        if (!hasMatch) {
            missingTargetNodes.push(targetNode);
        }
    });

    return {
        missingInAnim,
        extraInAnim,
        nameMismatches,
        missingTargetNodes,
        baseBoneCount: baseBoneNames.size,
        animBoneCount: animBoneNames.size
    };
}

async function main() {
    console.log('🔍 FBX Debugging & Analysis\n');
    console.log('='.repeat(80));

    const baseFBX = path.join(INPUT_BASE, 'character.fbx');
    if (!fs.existsSync(baseFBX)) {
        console.error(`❌ Base FBX nicht gefunden: ${baseFBX}`);
        process.exit(1);
    }

    console.log('\n📦 BASE CHARACTER ANALYSIS');
    console.log('-'.repeat(80));
    const baseAnalysis = analyzeFBX(baseFBX);
    console.log(`File: ${baseAnalysis.file}`);
    console.log(`\nBones: ${baseAnalysis.bones.size}`);
    console.log(`Nodes: ${baseAnalysis.nodes.size}`);
    console.log(`Skinned Meshes: ${baseAnalysis.skinnedMeshes.length}`);
    console.log(`Animations: ${baseAnalysis.animations.length}`);

    if (baseAnalysis.bones.size > 0) {
        console.log('\nBone Hierarchy:');
        const boneNames = Array.from(baseAnalysis.bones.keys()).sort();
        boneNames.forEach(name => {
            const bone = baseAnalysis.bones.get(name);
            const indent = bone.parent ? '  ' : '';
            console.log(`${indent}- ${name} (normalized: ${bone.normalized})`);
        });
    }

    if (baseAnalysis.animations.length > 0) {
        console.log('\nBase Animations:');
        baseAnalysis.animations.forEach(anim => {
            console.log(`  - "${anim.name}" (${anim.tracks} tracks, ${anim.targetNodes.length} target nodes)`);
        });
    }

    if (!fs.existsSync(INPUT_ANIM)) {
        console.log(`\n⚠️  Animations-Ordner nicht gefunden: ${INPUT_ANIM}`);
        process.exit(0);
    }

    const animFiles = fs.readdirSync(INPUT_ANIM).filter(f => f.endsWith('.fbx'));
    if (animFiles.length === 0) {
        console.log(`\n⚠️  Keine FBX-Animationen gefunden in: ${INPUT_ANIM}`);
        process.exit(0);
    }

    console.log(`\n\n📦 ANIMATION FILES ANALYSIS (${animFiles.length} files)`);
    console.log('='.repeat(80));

    const issues = [];
    const animAnalyses = [];

    for (const file of animFiles.sort()) {
        const animPath = path.join(INPUT_ANIM, file);
        console.log(`\n${'-'.repeat(80)}`);
        console.log(`File: ${file}`);

        try {
            const animAnalysis = analyzeFBX(animPath);
            animAnalyses.push(animAnalysis);

            console.log(`  Bones: ${animAnalysis.bones.size}`);
            console.log(`  Animations: ${animAnalysis.animations.length}`);

            if (animAnalysis.hasUnnamedAnimations) {
                console.log(`  ⚠️  WARNING: Unnamed animations found!`);
                issues.push({
                    file: file,
                    type: 'unnamed_animation',
                    message: 'Animation has no name'
                });
            }

            animAnalysis.animations.forEach(anim => {
                console.log(`    - "${anim.name}" (${anim.tracks} tracks, ${anim.duration.toFixed(2)}s)`);
                if (anim.targetNodes.length > 0) {
                    console.log(`      Target nodes: ${anim.targetNodes.slice(0, 5).join(', ')}${anim.targetNodes.length > 5 ? '...' : ''}`);
                }
            });

            const comparison = compareStructures(baseAnalysis, animAnalysis);
            
            if (comparison.missingInAnim.length > 0) {
                console.log(`  ⚠️  Missing bones in animation: ${comparison.missingInAnim.slice(0, 5).join(', ')}${comparison.missingInAnim.length > 5 ? '...' : ''}`);
                issues.push({
                    file: file,
                    type: 'missing_bones',
                    message: `Missing ${comparison.missingInAnim.length} bones`,
                    details: comparison.missingInAnim
                });
            }

            if (comparison.extraInAnim.length > 0) {
                console.log(`  ℹ️  Extra bones in animation: ${comparison.extraInAnim.slice(0, 5).join(', ')}${comparison.extraInAnim.length > 5 ? '...' : ''}`);
            }

            if (comparison.nameMismatches.length > 0) {
                console.log(`  ⚠️  Name mismatches: ${comparison.nameMismatches.length}`);
                issues.push({
                    file: file,
                    type: 'name_mismatch',
                    message: `${comparison.nameMismatches.length} bone name mismatches`,
                    details: comparison.nameMismatches.slice(0, 3)
                });
            }

            if (comparison.missingTargetNodes.length > 0) {
                console.log(`  ⚠️  Animation targets missing bones: ${comparison.missingTargetNodes.slice(0, 5).join(', ')}${comparison.missingTargetNodes.length > 5 ? '...' : ''}`);
                issues.push({
                    file: file,
                    type: 'missing_targets',
                    message: `Animation targets ${comparison.missingTargetNodes.length} non-existent bones`,
                    details: comparison.missingTargetNodes
                });
            }

        } catch (error) {
            console.error(`  ❌ Error analyzing ${file}:`, error.message);
            issues.push({
                file: file,
                type: 'parse_error',
                message: error.message
            });
        }
    }

    console.log(`\n\n📊 SUMMARY`);
    console.log('='.repeat(80));
    console.log(`Base Character:`);
    console.log(`  - Bones: ${baseAnalysis.bones.size}`);
    console.log(`  - Nodes: ${baseAnalysis.nodes.size}`);
    console.log(`  - Animations: ${baseAnalysis.animations.length}`);
    console.log(`\nAnimation Files: ${animFiles.length}`);
    console.log(`Total Issues Found: ${issues.length}`);

    if (issues.length > 0) {
        console.log(`\n⚠️  ISSUES DETECTED:`);
        issues.forEach(issue => {
            console.log(`  [${issue.type}] ${issue.file}: ${issue.message}`);
        });
    } else {
        console.log(`\n✅ All animations appear compatible with base character!`);
    }

    const allAnimNames = new Set();
    animAnalyses.forEach(analysis => {
        analysis.animations.forEach(anim => {
            if (anim.name && anim.name !== '(unnamed)') {
                allAnimNames.add(anim.name);
            }
        });
    });

    console.log(`\nUnique Animation Names: ${allAnimNames.size}`);
    if (allAnimNames.size > 0) {
        Array.from(allAnimNames).sort().forEach(name => {
            console.log(`  - ${name}`);
        });
    }
}

main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});

