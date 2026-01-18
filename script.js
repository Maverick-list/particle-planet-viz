// --- Error Handling ---
window.onerror = function (msg, url, line) {
    const overlay = document.getElementById('error-overlay');
    const msgElem = document.getElementById('error-message');
    if (overlay && msgElem) {
        overlay.style.display = 'block';
        msgElem.innerHTML = `Error: ${msg}<br><br><small>(${url.split('/').pop()}:${line})</small><br><br><button onclick="document.getElementById('error-overlay').style.display='none'">Dismiss / Try Anyway</button>`;
    }
    console.error('Global Error:', msg, url, line);
    return false; // Let default handler run too
};

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Configuration ---
const isMobile = window.innerWidth < 768; // Simple check for mobile/tablet

const CONFIG = {
    particleCountSphere: isMobile ? 7000 : 20000, // Reduced for mobile
    particleCountRing: isMobile ? 5000 : 15000,   // Reduced for mobile
    planetRadius: 5,
    ringInnerRadius: 7,
    ringOuterRadius: 12,
    particleColor: new THREE.Color(0xFFFFFF),
    mouseRepulsionRadius: 4.0,
    mouseRepulsionStrength: 3.0
};

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.autoRotate = false; // We will rotate particles manually

// --- Shaders ---

const vertexShader = `
uniform float uTime;
uniform vec3 uMouse;
uniform float uHover;

attribute vec3 aRandom; // Random noise per particle

varying float vAlpha;

void main() {
    vec3 pos = position;

    // 1. Noise / Liveliness
    // Add subtle movement based on time and random noise
    float noiseFreq = 0.5;
    float noiseAmp = 0.05;
    pos.x += sin(uTime * noiseFreq + aRandom.x * 10.0) * noiseAmp;
    pos.y += cos(uTime * noiseFreq + aRandom.y * 10.0) * noiseAmp;
    pos.z += sin(uTime * noiseFreq + aRandom.z * 10.0) * noiseAmp;

    // 2. Mouse Interaction (Repulsion)
    // Calculate distance from particle to mouse position (in world space)
    float dist = distance(pos, uMouse);
    float radius = 4.0; // Influence radius
    float force = 3.0;  // Repulsion strength

    if (dist < radius) {
        vec3 dir = normalize(pos - uMouse);
        float influence = (1.0 - dist / radius); // 1 at center, 0 at edge
        // Push particle away along the direction vector
        // Use pow to make the falloff sharper
        pos += dir * influence * force * uHover;
    }

    // 3. Size Attenuation
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (30.0 / -mvPosition.z); // Scale by depth

    // Calculate alpha/shading based on "lighting" (simple fake shading)
    // Dot product with a fixed light source direction (e.g., from top right)
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    vec3 normal = normalize(pos); // For a sphere, normal is normalized position
    float light = max(0.2, dot(normal, lightDir)); // Ambient + Diffuse
    vAlpha = light;

    gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform vec3 uColor;
varying float vAlpha;

void main() {
    // Make particle round
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;

    // Soft edge
    float glow = 1.0 - (r * 2.0);
    glow = pow(glow, 1.5);

    gl_FragColor = vec4(uColor, vAlpha * glow);
}
`;

// --- Particle Generation ---

function createParticles() {
    const totalParticles = CONFIG.particleCountSphere + CONFIG.particleCountRing;
    const positions = new Float32Array(totalParticles * 3);
    const randoms = new Float32Array(totalParticles * 3);

    // 1. Sphere Particles
    for (let i = 0; i < CONFIG.particleCountSphere; i++) {
        const phi = Math.acos(-1 + (2 * i) / CONFIG.particleCountSphere);
        const theta = Math.sqrt(CONFIG.particleCountSphere * Math.PI) * phi;

        const r = CONFIG.planetRadius;

        const x = r * Math.cos(theta) * Math.sin(phi);
        const y = r * Math.sin(theta) * Math.sin(phi);
        const z = r * Math.cos(phi);

        const idx = i * 3;
        positions[idx] = x;
        positions[idx + 1] = y;
        positions[idx + 2] = z;

        randoms[idx] = Math.random();
        randoms[idx + 1] = Math.random();
        randoms[idx + 2] = Math.random();
    }

    // 2. Ring Particles
    const ringOffset = CONFIG.particleCountSphere * 3;
    for (let i = 0; i < CONFIG.particleCountRing; i++) {
        // Random angle
        const angle = Math.random() * Math.PI * 2;
        // Random radius (distributed evenly by area)
        const innerR2 = CONFIG.ringInnerRadius * CONFIG.ringInnerRadius;
        const outerR2 = CONFIG.ringOuterRadius * CONFIG.ringOuterRadius;
        const r = Math.sqrt(Math.random() * (outerR2 - innerR2) + innerR2);

        const x = r * Math.cos(angle);
        const y = (Math.random() - 0.5) * 0.2; // Flattened on Y, slight variation
        const z = r * Math.sin(angle);

        const idx = ringOffset + i * 3;
        positions[idx] = x;
        positions[idx + 1] = y;
        positions[idx + 2] = z;

        randoms[idx] = Math.random();
        randoms[idx + 1] = Math.random();
        randoms[idx + 2] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3));

    return geometry;
}

// --- Material ---
const material = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector3(9999, 9999, 9999) }, // Init off-screen
        uHover: { value: 0 }, // 0 = no mouse interaction, 1 = max interaction
        uColor: { value: CONFIG.particleColor }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});

// --- Mesh ---
const geometry = createParticles();
const particles = new THREE.Points(geometry, material);
scene.add(particles);


// --- Interaction Logic (WebSocket + Mouse Fallback) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Plane facing Z for simple projection

// Function to update interaction based on normalized coordinates (-1 to 1)
function updateInteraction(x, y) {
    mouse.x = x;
    mouse.y = y;

    raycaster.setFromCamera(mouse, camera);
    const target = new THREE.Vector3();

    // Check intersection with the theoretical Z=0 plane
    raycaster.ray.intersectPlane(plane, target);

    if (target) {
        material.uniforms.uMouse.value.copy(target);
        material.uniforms.uHover.value = 1;
    } else {
        material.uniforms.uHover.value = 0;
    }
}

// --- 1. MediaPipe Hands Setup ---
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Draw Landmarks on minimal UI
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS,
                { color: '#00FF00', lineWidth: 2 });
            drawLandmarks(canvasCtx, landmarks,
                { color: '#FF0000', lineWidth: 1, radius: 2 });

            // --- Gesture Logic ---
            // 1. Repulsion (Index Finger Tip - Index 8)
            const indexTip = landmarks[8];
            // MediaPipe: x=0 (left) -> 1 (right), y=0 (top) -> 1 (bottom)
            // Three.js Logic requires: -1 to 1.
            // Note: Camera is mirrored by CSS transform: scaleX(-1), but logic perceives raw data.
            // If user moves hand right (in reality), raw X increases.
            // We want natural feeling.
            const x = indexTip.x * 2 - 1;
            const y = -(indexTip.y * 2 - 1);
            updateInteraction(x, y);

            // 2. Zoom Logic (Open Hand vs Closed Fist)
            // Distance: Wrist(0) to MiddleTip(12) vs Wrist(0) to IndexMCP(5)
            const wrist = landmarks[0];
            const middleTip = landmarks[12];
            const indexMcp = landmarks[5];

            const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
            const currentDist = dist(wrist, middleTip);
            const refScale = dist(wrist, indexMcp);

            // Ratio: ~2.0 is Open, ~0.8 is Closed
            const ratio = refScale > 0 ? currentDist / refScale : 0;
            let zoom = (ratio - 0.8) / (1.8 - 0.8);
            zoom = Math.max(0.0, Math.min(1.0, zoom));
            window.targetZoom = zoom;

            // 3. Rotation Logic (Hand Position X)
            // Left Edge (< 0.2) -> Rotate Left
            // Right Edge (> 0.8) -> Rotate Right
            if (indexTip.x < 0.2) {
                window.targetRotationSpeed = -0.05;
            } else if (indexTip.x > 0.8) {
                window.targetRotationSpeed = 0.05;
            } else {
                window.targetRotationSpeed = 0.002;
            }
        }
    } else {
        // No hand detected
        material.uniforms.uHover.value = 0;
        window.targetRotationSpeed = 0.002;
    }

    canvasCtx.restore();
}

const hands = new Hands({
    locateFile: (file) => {
        // Use a specific, stable version to avoid CDN lookup failures
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

let handTrackingActive = false;
hands.onResults((results) => {
    handTrackingActive = true;
    onResults(results);
});

// Fallback: If Hand Tracking fails to load within 10 seconds, degrade gracefully
setTimeout(() => {
    if (!handTrackingActive) {
        console.warn("Hand tracking timed out. Switching to mouse/touch interaction.");

        // Hide Error Overlay if it was shown due to a delay
        const overlay = document.getElementById('error-overlay');
        if (overlay && overlay.style.display === 'block') {
            overlay.style.display = 'none'; // Dismiss error to show planet
        }

        // Show a small non-intrusive toast notification
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = 'rgba(255, 100, 0, 0.8)';
        toast.style.color = 'white';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '5px';
        toast.style.zIndex = '200';
        toast.style.fontFamily = 'sans-serif';
        toast.innerText = "Hand Tracking Slow/Failed. Touch & Mouse Enabled.";
        document.body.appendChild(toast);

        // Auto-remove after 5s
        setTimeout(() => toast.remove(), 5000);
    }
}, 10000);

// --- 2. Camera Setup (Manual for control) ---
// We use manual getUserMedia to force 'user' (front) facing mode on mobile
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user', // Force front camera
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });
        videoElement.srcObject = stream;
        videoElement.play();

        // Custom loop to process frames
        function sendFrame() {
            if (videoElement.readyState >= 2) { // 2 = HAVE_CURRENT_DATA
                hands.send({ image: videoElement }).catch(e => console.error(e));
            }
            requestAnimationFrame(sendFrame);
        }
        sendFrame();

    } catch (error) {
        console.error("Error accessing camera:", error);
        const overlay = document.getElementById('error-overlay');
        const msgElem = document.getElementById('error-message');
        if (overlay && msgElem) {
            overlay.style.display = 'block';
            msgElem.innerHTML = `Camera Access Failed:<br>${error.message}<br><br>Please allow camera usage.`;
        }
    }
}

startCamera();

// 2. Mouse Fallback (Standard interaction)
function handleInput(x, y) {
    updateInteraction(x, y);
}

window.addEventListener('mousemove', (event) => {
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1;
    handleInput(x, y);
});

// Touch (Mobile Fallback)
const onTouch = (event) => {
    // Prevent scrolling while interacting
    event.preventDefault();

    if (event.touches.length > 0) {
        const touch = event.touches[0];
        const x = (touch.clientX / window.innerWidth) * 2 - 1;
        const y = -(touch.clientY / window.innerHeight) * 2 + 1;
        handleInput(x, y);
    }
};

window.addEventListener('touchmove', onTouch, { passive: false });
window.addEventListener('touchstart', onTouch, { passive: false });

// --- Resize Handler ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation Loop ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // Update Uniforms
    material.uniforms.uTime.value = elapsedTime;

    // Rotation Logic
    if (window.targetRotationSpeed === undefined) window.targetRotationSpeed = 0.002;
    if (window.currentRotationSpeed === undefined) window.currentRotationSpeed = 0.002;

    // Smooth transition
    window.currentRotationSpeed += (window.targetRotationSpeed - window.currentRotationSpeed) * 0.05;
    particles.rotation.y += window.currentRotationSpeed;

    // Zoom Logic
    if (window.targetZoom === undefined) { window.targetZoom = 0; window.currentZoom = 0; }
    if (window.currentZoom === undefined) window.currentZoom = 0;

    window.currentZoom += (window.targetZoom - window.currentZoom) * 0.1;
    const minZ = 8;
    const maxZ = 25;
    const newZ = maxZ - (window.currentZoom * (maxZ - minZ));
    camera.position.z = newZ;

    controls.update();
    renderer.render(scene, camera);
}

animate();
