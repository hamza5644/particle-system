// 1. Initialize Particles
const particleCount = 5000;
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);

// Fill with initial random positions
for (let i = 0; i < particleCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 10;
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const material = new THREE.PointsMaterial({ size: 0.05, vertexColors: true });
const particleSystem = new THREE.Points(geometry, material);
scene.add(particleSystem);

// 2. Hand Tracking Integration
const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const hand = results.multiHandLandmarks[0];
        const indexTip = hand[8]; // Index finger tip landmark
        
        // Map MediaPipe (0 to 1) to Three.js (-5 to 5)
        const targetX = (indexTip.x - 0.5) * 10;
        const targetY = -(indexTip.y - 0.5) * 10;

        updateParticles(targetX, targetY, results.multiHandLandmarks.length);
    }
});

// 3. Dynamic Behavior
function updateParticles(tx, ty, handCount) {
    const posAttribute = geometry.attributes.position;
    for (let i = 0; i < particleCount; i++) {
        let ix = i * 3;
        // Ease particles toward the finger tip
        posAttribute.array[ix] += (tx - posAttribute.array[ix]) * 0.1;
        posAttribute.array[ix+1] += (ty - posAttribute.array[ix+1]) * 0.1;
    }
    posAttribute.needsUpdate = true;
}