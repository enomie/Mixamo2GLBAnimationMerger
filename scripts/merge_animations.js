import { NodeIO } from '@gltf-transform/core';
import { dedup, unpartition, prune, reorder } from '@gltf-transform/functions';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const basePath = path.resolve(__dirname, '../converted/base/character.glb');
const animDir = path.resolve(__dirname, '../converted/animations/');
const outputPath = path.resolve(__dirname, '../merged/character_all_animations.glb');

if (!fs.existsSync(basePath)) {
    console.error('❌ Base-Datei nicht gefunden:', basePath);
    process.exit(1);
}

if (!fs.existsSync(animDir)) {
    console.error('❌ Animations-Ordner nicht gefunden:', animDir);
    process.exit(1);
}

const io = new NodeIO();

async function mergeAnimations() {
    console.log('📖 Lade Base-Modell...');
    const baseDoc = await io.read(basePath);
    const root = baseDoc.getRoot();

    // 0. Sanitize Base Node Names (Remove dots to avoid Three.js PropertyBinding issues)
    root.listNodes().forEach(node => {
        const oldName = node.getName();
        const newName = oldName.replace(/\./g, ''); // Index4.L -> Index4L
        if (oldName !== newName) {
            node.setName(newName);
            // console.log(`Renamed: ${oldName} -> ${newName}`);
        }
    });

    // 1. Index Base Nodes with fuzzy matching support
    const baseNodeMap = new Map();
    const normalize = (name) => name.replace(/_\d+$/, '').replace(/\./g, '').toLowerCase();

    root.listNodes().forEach(node => {
        baseNodeMap.set(node.getName(), node);
        baseNodeMap.set(normalize(node.getName()), node);
    });
    
    const baseAnimations = root.listAnimations();
    baseAnimations.forEach(anim => {
        const animName = anim.getName();
        if (animName === 'mixamo.com' || !animName || animName === '(unnamed)') {
            console.log(`🗑️  Entferne Base-Animation: "${animName}"`);
            anim.dispose();
        }
    });
    
    console.log(`ℹ️  Base Model Nodes: ${root.listNodes().length} (Map size: ${baseNodeMap.size})`);

    const animFiles = fs.readdirSync(animDir).filter(f => f.endsWith('.glb'));
    if (animFiles.length === 0) {
        console.error('❌ Keine GLB-Animationen gefunden in:', animDir);
        process.exit(1);
    }

    console.log(`📖 Lade und verarbeite ${animFiles.length} Animation(en)...`);

    for (const file of animFiles) {
        const animPath = path.join(animDir, file);
        const animDoc = await io.read(animPath);
        const animRoot = animDoc.getRoot();
        const baseName = path.basename(file, '.glb');

        // 2. Tag Animation Nodes with Original Name
        animRoot.listNodes().forEach(node => {
            node.setExtras({ ...node.getExtras(), originalName: node.getName() });
        });

        // 3. Prepare Animation
        const animations = animRoot.listAnimations();
        animations.forEach(clip => {
            clip.setName(baseName);
        });

        // 4. Merge
        baseDoc.merge(animDoc);

        // 5. Retarget Animation Tracks
        const mergedAnim = root.listAnimations().find(a => a.getName() === baseName);

        if (mergedAnim) {
            let retargetedCount = 0;
            let removedCount = 0;

            mergedAnim.listChannels().forEach(channel => {
                const targetNode = channel.getTargetNode();
                if (!targetNode) return;

                const originalName = targetNode.getExtras()?.originalName;

                if (originalName) {
                    // Try exact match first, then normalized
                    let baseNode = baseNodeMap.get(originalName);
                    if (!baseNode) {
                        baseNode = baseNodeMap.get(normalize(originalName));
                    }

                    if (baseNode) {
                        channel.setTargetNode(baseNode);
                        retargetedCount++;
                    } else {
                        // Log failure
                        console.warn(`      ⚠️  Failed to retarget: ${originalName} (Norm: ${normalize(originalName)})`);
                        channel.dispose();
                        removedCount++;
                    }
                } else {
                    console.warn(`    ⚠️  Track has no originalName`);
                }
            });
            console.log(`  ✅ Merged: ${baseName} (Retargeted: ${retargetedCount}, Pruned: ${removedCount})`);
        }
    }

    console.log('🔄 Bereinige Szene (Prune & Dedup)...');

    // 6. Cleanup
    // Remove all Scenes except the first one (Base Scene)
    // The merge likely added new scenes for each animation file.
    const scenes = root.listScenes();
    scenes.forEach((scene, index) => {
        if (index > 0) scene.dispose();
    });

    // Run optimization to remove the now-orphaned nodes (the duplicate skeletons)
    await baseDoc.transform(
        unpartition(),
        prune(),
        dedup()
    );

    // Verify cleanup
    const finalNodeCount = root.listNodes().length;
    console.log(`📊 Nodes nach Bereinigung: ${finalNodeCount} (Original: ${baseNodeMap.size})`);

    if (finalNodeCount > baseNodeMap.size + 10) { // Tolerance for some extra nodes
        console.warn('⚠️  Warnung: Es scheinen noch duplizierte Nodes vorhanden zu sein.');
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    console.log('💾 Schreibe GLB-Datei...');
    await io.write(outputPath, baseDoc);
    console.log('✅ GLB-Datei geschrieben:', outputPath);

    const finalAnims = root.listAnimations();
    console.log(`✅ Fertig! ${finalAnims.length} Animationen im sauberen Modell.`);

    const docPath = path.resolve(__dirname, '../merged/character_all_animations.md');
    console.log('📝 Erstelle Animationen-Dokumentation...');
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    const meshes = root.listMeshes();
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let hasVertices = false;
    
    meshes.forEach(mesh => {
        mesh.listPrimitives().forEach(primitive => {
            const positionAccessor = primitive.getAttribute('POSITION');
            if (positionAccessor) {
                const array = positionAccessor.getArray();
                const count = positionAccessor.getCount();
                for (let i = 0; i < count * 3; i += 3) {
                    const x = array[i];
                    const y = array[i + 1];
                    const z = array[i + 2];
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                    minZ = Math.min(minZ, z);
                    maxZ = Math.max(maxZ, z);
                    hasVertices = true;
                }
            }
        });
    });
    
    if (!hasVertices) {
        minX = maxX = minY = maxY = minZ = maxZ = 0;
    }
    
    const characterHeight = maxY - minY;
    const characterWidth = maxX - minX;
    const characterDepth = maxZ - minZ;
    
    let md = `# Character Animations Documentation\n\n`;
    md += `**System & Programming Languages:** Node.js, glTF, glTF-Transform\n\n`;
    md += `**Created:** ${dateStr}\n\n`;
    md += `**Total Animations:** ${finalAnims.length}\n\n`;
    
    md += `## Character Specifications\n\n`;
    md += `- **Height:** ${characterHeight.toFixed(3)} units\n`;
    md += `- **Width:** ${characterWidth.toFixed(3)} units\n`;
    md += `- **Depth:** ${characterDepth.toFixed(3)} units\n`;
    md += `- **Bounding Box:** ${(maxX - minX).toFixed(3)} × ${(maxY - minY).toFixed(3)} × ${(maxZ - minZ).toFixed(3)} units\n`;
    md += `- **Center:** (${((minX + maxX) / 2).toFixed(3)}, ${((minY + maxY) / 2).toFixed(3)}, ${((minZ + maxZ) / 2).toFixed(3)})\n`;
    md += `- **Total Meshes:** ${meshes.length}\n`;
    md += `- **Total Nodes:** ${root.listNodes().length}\n\n`;
    
    md += `## Animation List\n\n`;
    md += `| Name | Duration (s) | Start (s) | End (s) | Channels | Samplers | Loop |\n`;
    md += `|------|-------------|-----------|---------|----------|----------|------|\n`;
    
    const animDetails = [];
    finalAnims.forEach(anim => {
        const name = anim.getName();
        const channels = anim.listChannels();
        const samplers = anim.listSamplers();
        
        let minTime = Infinity;
        let maxTime = -Infinity;
        
        samplers.forEach(sampler => {
            const input = sampler.getInput();
            if (input) {
                const times = input.getArray();
                if (times && times.length > 0) {
                    const firstTime = times[0];
                    const lastTime = times[times.length - 1];
                    minTime = Math.min(minTime, firstTime);
                    maxTime = Math.max(maxTime, lastTime);
                }
            }
        });
        
        const duration = maxTime - minTime;
        const isLoop = duration > 0 && (
            name.includes('idle') || 
            name.includes('walk') || 
            name.includes('run') || 
            name.includes('breathing') ||
            name.includes('swimming') ||
            name.includes('treading') ||
            name.includes('sneaking')
        ) && !name.includes('start') && !name.includes('stop');
        
        md += `| ${name} | ${duration.toFixed(3)} | ${minTime.toFixed(3)} | ${maxTime.toFixed(3)} | ${channels.length} | ${samplers.length} | ${isLoop ? 'Yes' : 'No'} |\n`;
        
        animDetails.push({
            name,
            duration,
            startTime: minTime,
            endTime: maxTime,
            channels: channels.length,
            samplers: samplers.length,
            isLoop
        });
    });
    
    md += `\n## Animation Details\n\n`;
    
    animDetails.forEach(anim => {
        md += `### ${anim.name}\n\n`;
        md += `- **Duration:** ${anim.duration.toFixed(3)}s\n`;
        md += `- **Start Time:** ${anim.startTime.toFixed(3)}s\n`;
        md += `- **End Time:** ${anim.endTime.toFixed(3)}s\n`;
        md += `- **Channels:** ${anim.channels}\n`;
        md += `- **Samplers:** ${anim.samplers}\n`;
        md += `- **Loop Recommended:** ${anim.isLoop ? 'Yes' : 'No'}\n\n`;
    });
    
    md += `## Usage Notes\n\n`;
    md += `### Base Animation Cycle\n`;
    md += `- **Idle:** Use "18-idle-berathing" (9.917s loop) as the default standing animation\n`;
    md += `- **Idle Variations:** "19-idle-turn-left" and "20-idle-turn-right" for idle head movements\n\n`;
    md += `### Movement Animations (Loop)\n`;
    md += `- **Walk:** "36-walk" (1.000s loop) - standard walking\n`;
    md += `- **Run:** "30-run" (0.625s loop) - standard running\n`;
    md += `- **Walk Start/Stop:** "32-walk-start" and "33-walk-stop" for transitions\n`;
    md += `- **Strafe:** "34-walk-strafe-left", "35-walk-strafe-right" for side movement\n`;
    md += `- **Backwards:** "31-walk-backwards", "27-run-backwards" for reverse movement\n\n`;
    md += `### Action Animations (One-Shot)\n`;
    md += `- **Jump:** "26-jump-simple" (3.208s), "24-jump-long" (1.875s), "25-jump-over-box" (2.125s)\n`;
    md += `- **Hit:** "14-hit-back" (3.667s), "16-hit-front" (2.250s), "15-hit-crouch" (2.333s)\n`;
    md += `- **Car:** "02-car-driving-b" (46.667s), "03-car-driving" (5.000s)\n`;
    md += `- **Water:** "37-water-swimming" (4.500s), "38-water-treading" (3.000s)\n\n`;
    md += `### Animation Blending\n`;
    md += `- Use fade transitions (0.2-0.3s) between different animation states\n`;
    md += `- Loop animations should be set to repeat indefinitely\n`;
    md += `- One-shot animations should be played once and return to idle\n\n`;
    
    fs.writeFileSync(docPath, md, 'utf8');
    console.log(`✅ Dokumentation erstellt: ${docPath}`);
}

mergeAnimations().catch(err => {
    console.error('❌ Fehler:', err);
    process.exit(1);
});
