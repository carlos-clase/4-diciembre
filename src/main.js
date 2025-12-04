// --- Variables Globales Three.js ---
let scene, camera, renderer;
// Variables para el sistema de partículas de fondo (ambiente)
let particles, particleMaterial, particleGeometry;

// Variables para el sistema de partículas de Explosión (Burst)
let burstParticles = null;
let burstVelocities = []; // Almacena [vx, vy, vz] para cada partícula de la explosión
const BURST_COUNT = 500; // Número de partículas en la explosión
const BURST_LIFESPAN = 60; // Duración de la explosión en frames (aprox 1 segundo)
let currentBurstLife = 0;

let mouseX = 0, mouseY = 0;
const speedFactor = 0.00005; 
const interactionFactor = 0.00005;
const particleCount = 2000; // Partículas de fondo
let animationFrameId;

// --- Lógica de la Escena 3D (Three.js) ---

function init() {
    const container = document.getElementById('three-container');

    // 1. Scene
    scene = new THREE.Scene();

    // 2. Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0d0d1a, 1);
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // 5. Crear Sistema de Partículas de Fondo (ambiente)
    particleGeometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const color1 = new THREE.Color(0x4c7cff); // Azul principal
    const color2 = new THREE.Color(0xff4c7c); // Rosa acento

    for (let i = 0; i < particleCount; i++) {
        const x = (Math.random() - 0.5) * 10;
        const y = (Math.random() - 0.5) * 10;
        const z = (Math.random() - 0.5) * 10;
        positions.push(x, y, z);

        const color = i % 2 === 0 ? color1 : color2;
        colors.push(color.r, color.g, color.b);
    }

    particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    particleMaterial = new THREE.PointsMaterial({
        size: 0.02, // Partículas de fondo pequeñas
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8
    });

    particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    
    // 6. Event Listeners
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    document.addEventListener('touchmove', onDocumentTouchMove, { passive: false });
}

// --- Lógica de la Explosión de Partículas (Burst) ---

function startParticleBurst() {
    // Si ya hay una explosión activa, la removemos y empezamos una nueva
    if (burstParticles) {
        scene.remove(burstParticles);
        burstParticles.geometry.dispose();
        burstParticles.material.dispose();
    }

    const burstGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(BURST_COUNT * 3);
    const colors = new Float32Array(BURST_COUNT * 3);
    
    // Colores festivos
    const colorOptions = [0xff4c7c, 0x4c7cff, 0x00ffff, 0xffff00, 0xffa500, 0xffffff];
    burstVelocities = [];
    
    // Posición de la explosión: justo en el centro de la escena
    const centerPosition = [0, 0, 0]; 

    for (let i = 0; i < BURST_COUNT; i++) {
        const i3 = i * 3;
        
        // Posición inicial: centro
        positions[i3 + 0] = centerPosition[0];
        positions[i3 + 1] = centerPosition[1];
        positions[i3 + 2] = centerPosition[2];

        // Asignar color aleatorio
        const color = new THREE.Color(colorOptions[Math.floor(Math.random() * colorOptions.length)]);
        colors[i3 + 0] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
        
        // Generar velocidad aleatoria en una esfera (explosión radial)
        const speed = Math.random() * 0.2 + 0.05; // Velocidad inicial decente
        const angle1 = Math.random() * Math.PI * 2; // Ángulo horizontal
        const angle2 = Math.random() * Math.PI; // Ángulo vertical

        // Conversión de coordenadas esféricas a cartesianas (velocidad)
        const vX = speed * Math.sin(angle2) * Math.cos(angle1);
        const vY = speed * Math.sin(angle2) * Math.sin(angle1);
        const vZ = speed * Math.cos(angle2);
        
        burstVelocities.push(vX, vY, vZ);
    }

    burstGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    burstGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const burstMaterial = new THREE.PointsMaterial({
        size: 0.1, // Tamaño de las partículas de la explosión
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 1, 
    });

    burstParticles = new THREE.Points(burstGeometry, burstMaterial);
    scene.add(burstParticles);
    currentBurstLife = BURST_LIFESPAN;
}

function updateParticleBurst() {
    if (!burstParticles) return;

    const positions = burstParticles.geometry.attributes.position.array;
    
    // Gravedad ligera para que caigan después de la explosión
    const gravity = 0.001; 
    
    for (let i = 0; i < BURST_COUNT; i++) {
        const i3 = i * 3;

        // 1. Aplicar Gravedad
        burstVelocities[i3 + 1] -= gravity; 

        // 2. Aplicar un poco de fricción/desaceleración para simular el aire
        burstVelocities[i3 + 0] *= 0.98;
        burstVelocities[i3 + 1] *= 0.98;
        burstVelocities[i3 + 2] *= 0.98;
        
        // 3. Actualizar Posición
        positions[i3 + 0] += burstVelocities[i3 + 0];
        positions[i3 + 1] += burstVelocities[i3 + 1];
        positions[i3 + 2] += burstVelocities[i3 + 2];
    }

    burstParticles.geometry.attributes.position.needsUpdate = true;
    
    // Desvanecer el burst en los últimos 20 cuadros
    if (currentBurstLife < 20) {
        burstParticles.material.opacity = currentBurstLife / 20;
    }

    currentBurstLife--;

    if (currentBurstLife <= 0) {
        // Eliminar la explosión de la escena y limpiar memoria
        scene.remove(burstParticles);
        burstParticles.geometry.dispose();
        burstParticles.material.dispose();
        burstParticles = null; // Marcar como inactivo
        burstVelocities = []; // Limpiar las velocidades
    }
}

// --- Manejadores de Eventos ---

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseMove(event) {
    mouseX = (event.clientX / window.innerWidth) - 0.5;
    mouseY = (event.clientY / window.innerHeight) - 0.5;
}

function onDocumentTouchMove(event) {
    if (event.touches.length === 1) {
        event.preventDefault();
        mouseX = (event.touches[0].clientX / window.innerWidth) - 0.5;
        mouseY = (event.touches[0].clientY / window.innerHeight) - 0.5;
    }
}

// Función principal que se llama al pulsar el botón
function celebrate() {
    startParticleBurst(); 
}

// --- Bucle de Animación ---

function animate() {
    animationFrameId = requestAnimationFrame(animate);

    const time = Date.now() * 0.00005;

    // 1. Animación de Partículas de Fondo
    particles.rotation.y += speedFactor * 2;
    particles.rotation.x += speedFactor;

    particles.rotation.y += (mouseX * interactionFactor) * 20;
    particles.rotation.x += (mouseY * interactionFactor) * 20;

    const positions = particleGeometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3 + 1] += Math.sin(time + positions[i3] * 0.5 + positions[i3 + 2] * 0.5) * 0.001;
        if (positions[i3 + 1] > 5 || positions[i3 + 1] < -5) {
            positions[i3 + 1] = (Math.random() - 0.5) * 10;
        }
    }
    particleGeometry.attributes.position.needsUpdate = true;
    
    // 2. Animación de Explosión de Partículas
    updateParticleBurst();

    renderer.render(scene, camera);
}

// --- Inicialización al cargar la ventana ---
window.onload = function () {
    init();
    animate();
};
