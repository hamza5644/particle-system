import * as THREE from 'three';

// --- 1. CORE SETUP ---
const scene = new THREE.Scene();
const camera3D = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
camera3D.position.z = 25;

// --- 2. PARTICLE DATA ---
const particleCount = 10000;
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
const targets = new Float32Array(particleCount * 3); // Where they should be
const colors = new Float32Array(particleCount * 3);

// Fill with initial random starfield
for (let i = 0; i < particleCount; i++) {
    const idx = i * 3;
    positions[idx] = (Math.random() - 0.5) * 50;
    positions[idx+1] = (Math.random() - 0.5) * 50;
    positions[idx+2] = (Math.random() - 0.5) * 50;
    
    colors[idx] = 0; colors[idx+1] = 0.7; colors[idx+2] = 1; // Cyan
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({ 
    size: 0.1, 
    vertexColors: true, 
    transparent: true, 
    opacity: 0.8,
    blending: THREE.AdditiveBlending 
});
const points = new THREE.Points(geometry, material);
scene.add(points);

// --- 3. SHAPE MATHEMATICS ---
function updateTargetShape(shapeName) {
    for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        const t = i / particleCount;
        let x, y, z;

        switch(shapeName) {
            case 'HEART':
                const angle = t * Math.PI * 2;
                x = 16 * Math.pow(Math.sin(angle), 3);
                y = 13 * Math.cos(angle) - 5 * Math.cos(2*angle) - 2 * Math.cos(3*angle) - Math.cos(4*angle);
                z = (Math.random() - 0.5) * 2;
                scale(0.6);
                break;

            case 'DNA':
                const phi = t * Math.PI * 10;
                x = Math.cos(phi) * 5;
                z = Math.sin(phi) * 5;
                y = (t - 0.5) * 40;
                if (i % 2 === 0) { x *= -1; z *= -1; } // Double helix
                break;

            case 'CUBE':
                x = (Math.random() - 0.5) * 15;
                y = (Math.random() - 0.5) * 15;
                z = (Math.random() - 0.5) * 15;
                break;

            case 'SATURN':
            default:
                const radius = 8 + Math.random() * 6;
                const theta = Math.random() * Math.PI * 2;
                x = Math.cos(theta) * radius;
                y = Math.sin(theta) * radius;
                z = (Math.random() - 0.5) * 2;
                // Add a core "planet"
                if(i < 2000) {
                    const sRadius = 5;
                    const u = Math.random();
                    const v = Math.random();
                    const thetaS = 2 * Math.PI * u;
                    const phiS = Math.acos(2 * v - 1);
                    x = sRadius * Math.sin(phiS) * Math.cos(thetaS);
                    y = sRadius * Math.sin(phiS) * Math.sin(thetaS);
                    z = sRadius * Math.cos(phiS);
                }
                break;
        }

        function scale(s) { x *= s; y *= s; z *= s; }
        targets[idx] = x; targets[idx+1] = y; targets[idx+2] = z;
    }
}

// Start with Saturn
updateTargetShape('SATURN');

// --- 4. HAND TRACKING ---
const videoElement = document.getElementById('input_video');
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // GESTURE RECOGNITION (Simple finger counting)
        const isIndexUp = landmarks[8].y < landmarks[6].y;
        const isMiddleUp = landmarks[12].y < landmarks[10].y;
        const isRingUp = landmarks[16].y < landmarks[14].y;

        if (isIndexUp && isMiddleUp && isRingUp) updateTargetShape('SATURN');
        else if (isIndexUp && isMiddleUp) updateTargetShape('CUBE');
        else if (isIndexUp) updateTargetShape('DNA');
        else updateTargetShape('HEART');

        // Follow hand position (Mirrored)
        points.position.x = (landmarks[8].x - 0.5) * -40;
        points.position.y = (landmarks[8].y - 0.5) * -30;
    }
});

// --- 5. CAMERA & ANIMATION LOOP ---
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 1280,
    height: 720
});
camera.start();

function animate() {
    requestAnimationFrame(animate);
    
    const pos = geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i++) {
        // SMOOTH MORPH: Move current position toward target by 10% each frame
        pos[i] += (targets[i] - pos[i]) * 0.1;
    }
    
    geometry.attributes.position.needsUpdate = true;
    points.rotation.y += 0.005; // Constant rotation for flair
    
    renderer.render(scene, camera3D);
}

window.addEventListener('resize', () => {
    camera3D.aspect = window.innerWidth / window.innerHeight;
    camera3D.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
