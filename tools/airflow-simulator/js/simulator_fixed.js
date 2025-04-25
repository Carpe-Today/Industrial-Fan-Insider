/**
 * Industrial Fan Airflow Simulator
 * A visualization tool for industrial fan airflow patterns
 * 
 * For Industrial Fan Insider website
 * 
 * Uses Three.js for 3D visualization
 */

// Main simulation variables
let scene, camera, renderer, controls;
let room, fan, particles = [];
let animationId = null;
let isPlaying = true;
let currentView = 'top';
let gui, stats;

// Fan and room parameters
const params = {
    // Room dimensions
    roomLength: 50,
    roomWidth: 50,
    roomHeight: 20,
    
    // Fan parameters
    fanModel: 'powerfoil-x3',
    fanDiameter: 14,
    fanCFM: 300000,
    fanRPM: 50,
    fanDirection: 'down',
    fanX: 25,
    fanY: 25,
    fanHeight: 18,
    
    // Visualization parameters
    particleDensity: 'medium',
    
    // Simulation results
    coverageArea: 0,
    airChanges: 0,
    energyUsage: 0,
    coolingEffect: 0
};

// Particle settings based on density
const particleSettings = {
    'low': { count: 1000, size: 0.15 },
    'medium': { count: 3000, size: 0.12 },
    'high': { count: 6000, size: 0.1 }
};

// Fan model specifications
const fanModels = {
    'powerfoil-x3': {
        name: 'Big Ass Fans Powerfoil X3.0',
        maxDiameter: 24,
        maxCFM: 350000,
        powerConsumption: 1.2, // kW
        color: 0x3498db,
        bladeCount: 3
    },
    'hunter-eco': {
        name: 'Hunter Industrial ECO',
        maxDiameter: 14,
        maxCFM: 160000,
        powerConsumption: 0.75, // kW
        color: 0x2ecc71,
        bladeCount: 5
    },
    'macroair': {
        name: 'MacroAir AirVolution-D',
        maxDiameter: 20,
        maxCFM: 240000,
        powerConsumption: 1.0, // kW
        color: 0xe74c3c,
        bladeCount: 6
    },
    'custom': {
        name: 'Custom Fan',
        maxDiameter: 24,
        maxCFM: 400000,
        powerConsumption: 1.5, // kW
        color: 0xf39c12,
        bladeCount: 3
    }
};

// Initialize the simulation
function init() {
    // Show loading overlay
    document.getElementById('loading-overlay').style.display = 'flex';
    
    // Get parameters from UI
    updateParamsFromUI();
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(60, getAspectRatio(), 0.1, 1000);
    setCamera(currentView);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('simulator-canvas'), antialias: true });
    renderer.setSize(getCanvasWidth(), getCanvasHeight());
    renderer.shadowMap.enabled = true;
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Create room
    createRoom();
    
    // Create fan
    createFan();
    
    // Create particles
    createParticles();
    
    // Calculate simulation results
    calculateResults();
    
    // Update UI with results
    updateResultsUI();
    
    // Hide loading overlay
    document.getElementById('loading-overlay').style.display = 'none';
    
    // Start animation
    animate();
    
    // Add event listeners
    addEventListeners();
}

// Update parameters from UI inputs
function updateParamsFromUI() {
    // Room dimensions
    params.roomLength = parseFloat(document.getElementById('room-length').value);
    params.roomWidth = parseFloat(document.getElementById('room-width').value);
    params.roomHeight = parseFloat(document.getElementById('room-height').value);
    
    // Fan parameters
    params.fanModel = document.getElementById('fan-model').value;
    params.fanDiameter = parseFloat(document.getElementById('fan-diameter').value);
    params.fanCFM = parseFloat(document.getElementById('fan-cfm').value);
    params.fanRPM = parseFloat(document.getElementById('fan-rpm').value);
    params.fanDirection = document.getElementById('fan-direction').value;
    params.fanX = parseFloat(document.getElementById('fan-x').value);
    params.fanY = parseFloat(document.getElementById('fan-y').value);
    params.fanHeight = parseFloat(document.getElementById('fan-height').value);
    
    // Visualization parameters
    params.particleDensity = document.getElementById('particle-density').value;
    
    // Validate parameters
    validateParams();
}

// Validate and adjust parameters if needed
function validateParams() {
    // Ensure fan is within room
    params.fanX = Math.min(Math.max(params.fanX, 0), params.roomLength);
    params.fanY = Math.min(Math.max(params.fanY, 0), params.roomWidth);
    params.fanHeight = Math.min(Math.max(params.fanHeight, 0), params.roomHeight);
    
    // Ensure fan diameter is within model limits
    const model = fanModels[params.fanModel];
    params.fanDiameter = Math.min(params.fanDiameter, model.maxDiameter);
    
    // Ensure CFM is within reasonable limits
    params.fanCFM = Math.min(params.fanCFM, model.maxCFM);
    
    // Update UI with validated values
    document.getElementById('fan-x').value = params.fanX;
    document.getElementById('fan-y').value = params.fanY;
    document.getElementById('fan-height').value = params.fanHeight;
    document.getElementById('fan-diameter').value = params.fanDiameter;
    document.getElementById('fan-cfm').value = params.fanCFM;
}

// Create the room
function createRoom() {
    // Remove existing room if any
    if (room) {
        scene.remove(room);
    }
    
    room = new THREE.Group();
    
    // Convert feet to meters for visualization (1:10 scale)
    const length = params.roomLength / 10;
    const width = params.roomWidth / 10;
    const height = params.roomHeight / 10;
    
    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(length, width);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x808080, 
        side: THREE.DoubleSide,
        roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2;
    floor.position.set(length/2, 0, width/2);
    floor.receiveShadow = true;
    room.add(floor);
    
    // Create ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(length, width);
    const ceilingMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xd3d3d3, 
        side: THREE.DoubleSide,
        roughness: 0.7
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(length/2, height, width/2);
    ceiling.receiveShadow = true;
    room.add(ceiling);
    
    // Create walls
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xe0e0e0, 
        side: THREE.DoubleSide,
        roughness: 0.7
    });
    
    // Wall 1 (back)
    const wall1Geometry = new THREE.PlaneGeometry(length, height);
    const wall1 = new THREE.Mesh(wall1Geometry, wallMaterial);
    wall1.position.set(length/2, height/2, 0);
    wall1.receiveShadow = true;
    room.add(wall1);
    
    // Wall 2 (front)
    const wall2Geometry = new THREE.PlaneGeometry(length, height);
    const wall2 = new THREE.Mesh(wall2Geometry, wallMaterial);
    wall2.position.set(length/2, height/2, width);
    wall2.rotation.y = Math.PI;
    wall2.receiveShadow = true;
    room.add(wall2);
    
    // Wall 3 (left)
    const wall3Geometry = new THREE.PlaneGeometry(width, height);
    const wall3 = new THREE.Mesh(wall3Geometry, wallMaterial);
    wall3.position.set(0, height/2, width/2);
    wall3.rotation.y = Math.PI / 2;
    wall3.receiveShadow = true;
    room.add(wall3);
    
    // Wall 4 (right)
    const wall4Geometry = new THREE.PlaneGeometry(width, height);
    const wall4 = new THREE.Mesh(wall4Geometry, wallMaterial);
    wall4.position.set(length, height/2, width/2);
    wall4.rotation.y = -Math.PI / 2;
    wall4.receiveShadow = true;
    room.add(wall4);
    
    // Add grid lines for floor
    const gridHelper = new THREE.GridHelper(Math.max(length, width), Math.max(length, width));
    gridHelper.position.set(length/2, 0.01, width/2);
    room.add(gridHelper);
    
    scene.add(room);
}

// Create the fan - COMPLETELY REWRITTEN for proper horizontal orientation
function createFan() {
    // Remove existing fan if any
    if (fan) {
        scene.remove(fan);
    }
    
    fan = new THREE.Group();
    
    // Convert feet to meters for visualization (1:10 scale)
    const diameter = params.fanDiameter / 10;
    const x = params.fanX / 10;
    const y = params.fanHeight / 10;
    const z = params.fanY / 10;
    
    // Fan model color and blade count
    const fanColor = fanModels[params.fanModel].color;
    const bladeCount = fanModels[params.fanModel].bladeCount;
    
    // Create drop tube (vertical mounting tube)
    const dropTubeGeometry = new THREE.CylinderGeometry(diameter/20, diameter/20, diameter/2, 16);
    const dropTubeMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const dropTube = new THREE.Mesh(dropTubeGeometry, dropTubeMaterial);
    dropTube.castShadow = true;
    fan.add(dropTube);
    
    // Create hub (central connection point for blades)
    const hubGeometry = new THREE.CylinderGeometry(diameter/8, diameter/8, diameter/10, 16);
    const hubMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const hub = new THREE.Mesh(hubGeometry, hubMaterial);
    hub.rotation.x = Math.PI / 2; // Rotate to horizontal position
    hub.castShadow = true;
    fan.add(hub);
    
    // Create motor housing
    const motorGeometry = new THREE.CylinderGeometry(diameter/6, diameter/6, diameter/5, 16);
    const motorMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const motor = new THREE.Mesh(motorGeometry, motorMaterial);
    motor.rotation.x = Math.PI / 2; // Rotate to horizontal position
    motor.position.y = -diameter/10; // Position below hub
    motor.castShadow = true;
    fan.add(motor);
    
    // Create fan blades
    for (let i = 0; i < bladeCount; i++) {
        // Create blade shape - tapered for better aerodynamics
        const bladeShape = new THREE.Shape();
        bladeShape.moveTo(0, 0);
        bladeShape.lineTo(diameter/2, -diameter/16);
        bladeShape.lineTo(diameter/2, diameter/16);
        bladeShape.lineTo(0, 0);
        
        const extrudeSettings = {
            steps: 1,
            depth: diameter/40,
            bevelEnabled: true,
            bevelThickness: diameter/100,
            bevelSize: diameter/100,
            bevelOffset: 0,
            bevelSegments: 3
        };
        
        const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
        const bladeMaterial = new THREE.MeshStandardMaterial({ 
            color: fanColor,
            roughness: 0.7,
            metalness: 0.3
        });
        
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        
        // Position and rotate blade to attach to hub
        blade.position.z = -diameter/80; // Center the blade depth
        blade.rotation.z = (i / bladeCount) * Math.PI * 2; // Distribute blades evenly
        blade.castShadow = true;
        
        // Add blade to hub
        hub.add(blade);
    }
    
    // Position fan in the room
    fan.position.set(x, y, z);
    
    // Rotate fan based on direction (default is downward airflow)
    if (params.fanDirection === 'up') {
        hub.rotation.y = Math.PI; // Flip blades to point upward
    }
    
    scene.add(fan);
}

// Create airflow particles
function createParticles() {
    // Remove existing particles
    for (let i = 0; i < particles.length; i++) {
        scene.remove(particles[i]);
    }
    particles = [];
    
    // Get particle settings based on density
    const settings = particleSettings[params.particleDensity];
    
    // Convert feet to meters for visualization (1:10 scale)
    const fanX = params.fanX / 10;
    const fanY = params.fanHeight / 10;
    const fanZ = params.fanY / 10;
    const fanRadius = (params.fanDiameter / 2) / 10;
    
    // Create particle material
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x3498db,
        size: settings.size,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true
    });
    
    // Create particles
    for (let i = 0; i < settings.count; i++) {
        // Create random position within fan radius
        const theta = Math.random() * Math.PI * 2;
        const r = Math.random() * fanRadius;
        
        const positions = [];
        positions.push(fanX + r * Math.cos(theta));
        positions.push(fanY);
        positions.push(fanZ + r * Math.sin(theta));
        
        // Create particle geometry
        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        // Create particle system
        const particle = new THREE.Points(particleGeometry, particleMaterial);
        
        // Add velocity and lifecycle properties
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.01,
                params.fanDirection === 'down' ? -0.05 - Math.random() * 0.05 : 0.05 + Math.random() * 0.05,
                (Math.random() - 0.5) * 0.01
            ),
            lifecycle: 0,
            maxLifecycle: 100 + Math.random() * 100
        };
        
        particles.push(particle);
        scene.add(particle);
    }
}

// Animate particles
function animateParticles() {
    // Convert feet to meters for visualization (1:10 scale)
    const roomLength = params.roomLength / 10;
    const roomWidth = params.roomWidth / 10;
    const roomHeight = params.roomHeight / 10;
    const fanX = params.fanX / 10;
    const fanY = params.fanHeight / 10;
    const fanZ = params.fanY / 10;
    const fanRadius = (params.fanDiameter / 2) / 10;
    
    // Update fan rotation based on RPM
    if (fan) {
        const rotationSpeed = params.fanRPM / 60 * Math.PI * 2 / 30; // Convert RPM to radians per frame
        // Find the hub (second child of fan group) and rotate it
        if (fan.children.length > 1) {
            fan.children[1].rotation.z += rotationSpeed; // Rotate around z-axis for horizontal fan
        }
    }
    
    // Update each particle
    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        const position = particle.geometry.attributes.position;
        const velocity = particle.userData.velocity;
        
        // Update position based on velocity
        position.array[0] += velocity.x;
        position.array[1] += velocity.y;
        position.array[2] += velocity.z;
        
        // Add some randomness to movement
        velocity.x += (Math.random() - 0.5) * 0.001;
        velocity.z += (Math.random() - 0.5) * 0.001;
        
        // Simulate air circulation
        // When particles reach floor or ceiling, spread outward
        if (params.fanDirection === 'down') {
            if (position.array[1] < 0.5) {
                // Near floor, move outward
                const dx = position.array[0] - fanX;
                const dz = position.array[2] - fanZ;
                velocity.x += dx * 0.001;
                velocity.z += dz * 0.001;
                velocity.y = Math.min(velocity.y + 0.001, 0.01);
            } else if (position.array[1] > roomHeight - 0.5) {
                // Near ceiling, move inward
                const dx = fanX - position.array[0];
                const dz = fanZ - position.array[2];
                velocity.x += dx * 0.001;
                velocity.z += dz * 0.001;
                velocity.y = Math.max(velocity.y - 0.001, -0.01);
            }
        } else {
            // Upward fan direction
            if (position.array[1] > roomHeight - 0.5) {
                // Near ceiling, move outward
                const dx = position.array[0] - fanX;
                const dz = position.array[2] - fanZ;
                velocity.x += dx * 0.001;
                velocity.z += dz * 0.001;
                velocity.y = Math.max(velocity.y - 0.001, -0.01);
            } else if (position.array[1] < 0.5) {
                // Near floor, move inward
                const dx = fanX - position.array[0];
                const dz = fanZ - position.array[2];
                velocity.x += dx * 0.001;
                velocity.z += dz * 0.001;
                velocity.y = Math.min(velocity.y + 0.001, 0.01);
            }
        }
        
        // Boundary checks - bounce off walls
        if (position.array[0] < 0 || position.array[0] > roomLength) {
            velocity.x *= -0.8;
        }
        if (position.array[1] < 0 || position.array[1] > roomHeight) {
            velocity.y *= -0.8;
        }
        if (position.array[2] < 0 || position.array[2] > roomWidth) {
            velocity.z *= -0.8;
        }
        
        // Lifecycle management
        particle.userData.lifecycle++;
        if (particle.userData.lifecycle > particle.userData.maxLifecycle) {
            // Reset particle to fan position
            position.array[0] = fanX + (Math.random() - 0.5) * fanRadius;
            position.array[1] = fanY;
            position.array[2] = fanZ + (Math.random() - 0.5) * fanRadius;
            
            // Reset velocity
            velocity.x = (Math.random() - 0.5) * 0.01;
            velocity.y = params.fanDirection === 'down' ? -0.05 - Math.random() * 0.05 : 0.05 + Math.random() * 0.05;
            velocity.z = (Math.random() - 0.5) * 0.01;
            
            // Reset lifecycle
            particle.userData.lifecycle = 0;
            particle.userData.maxLifecycle = 100 + Math.random() * 100;
        }
        
        // Update geometry
        position.needsUpdate = true;
    }
}

// Set camera position based on view
function setCamera(view) {
    // Convert feet to meters for visualization (1:10 scale)
    const roomLength = params.roomLength / 10;
    const roomWidth = params.roomWidth / 10;
    const roomHeight = params.roomHeight / 10;
    
    switch (view) {
        case 'top':
            camera.position.set(roomLength/2, roomHeight * 1.5, roomWidth/2);
            camera.lookAt(roomLength/2, 0, roomWidth/2);
            break;
        case 'side':
            camera.position.set(roomLength * 1.5, roomHeight/2, roomWidth/2);
            camera.lookAt(roomLength/2, roomHeight/2, roomWidth/2);
            break;
        case '3d':
            camera.position.set(roomLength * 1.2, roomHeight * 1.2, roomWidth * 1.2);
            camera.lookAt(roomLength/2, roomHeight/2, roomWidth/2);
            break;
    }
    
    currentView = view;
    
    // Update view buttons
    document.getElementById('view-top').classList.remove('active');
    document.getElementById('view-side').classList.remove('active');
    document.getElementById('view-3d').classList.remove('active');
    document.getElementById('view-' + view).classList.add('active');
}

// Animation loop
function animate() {
    animationId = requestAnimationFrame(animate);
    
    if (isPlaying) {
        // Animate particles
        animateParticles();
    }
    
    // Render scene
    renderer.render(scene, camera);
    
    // Update stats if available
    if (stats) {
        stats.update();
    }
}

// Calculate simulation results
function calculateResults() {
    // Calculate coverage area
    params.coverageArea = Math.PI * Math.pow(params.fanDiameter * 1.5, 2);
    
    // Calculate air changes per hour
    const roomVolume = params.roomLength * params.roomWidth * params.roomHeight;
    params.airChanges = (params.fanCFM * 60) / roomVolume;
    
    // Calculate energy usage
    const model = fanModels[params.fanModel];
    params.energyUsage = model.powerConsumption * (params.fanRPM / 70); // Adjust based on RPM
    
    // Calculate cooling effect (perceived temperature reduction)
    params.coolingEffect = 4 * (params.fanDiameter / 20) * (params.fanRPM / 50);
}

// Update results UI
function updateResultsUI() {
    document.getElementById('result-coverage').textContent = Math.round(params.coverageArea) + ' sq ft';
    document.getElementById('result-air-changes').textContent = params.airChanges.toFixed(1) + ' ACH';
    document.getElementById('result-energy').textContent = params.energyUsage.toFixed(2) + ' kW';
    document.getElementById('result-cooling').textContent = params.coolingEffect.toFixed(1) + '°F';
}

// Get canvas aspect ratio
function getAspectRatio() {
    const canvas = document.getElementById('simulator-canvas');
    return canvas.clientWidth / canvas.clientHeight;
}

// Get canvas width
function getCanvasWidth() {
    const canvas = document.getElementById('simulator-canvas');
    return canvas.clientWidth;
}

// Get canvas height
function getCanvasHeight() {
    const canvas = document.getElementById('simulator-canvas');
    return canvas.clientHeight;
}

// Add event listeners
function addEventListeners() {
    // View buttons
    document.getElementById('view-top').addEventListener('click', () => setCamera('top'));
    document.getElementById('view-side').addEventListener('click', () => setCamera('side'));
    document.getElementById('view-3d').addEventListener('click', () => setCamera('3d'));
    
    // Play/pause button
    document.getElementById('play-pause').addEventListener('click', togglePlayPause);
    
    // Reset button
    document.getElementById('reset').addEventListener('click', resetSimulation);
    
    // Room dimension inputs
    document.getElementById('room-length').addEventListener('change', updateSimulation);
    document.getElementById('room-width').addEventListener('change', updateSimulation);
    document.getElementById('room-height').addEventListener('change', updateSimulation);
    
    // Fan parameter inputs
    document.getElementById('fan-model').addEventListener('change', updateFanModel);
    document.getElementById('fan-diameter').addEventListener('change', updateSimulation);
    document.getElementById('fan-cfm').addEventListener('change', updateSimulation);
    document.getElementById('fan-rpm').addEventListener('change', updateSimulation);
    document.getElementById('fan-direction').addEventListener('change', updateSimulation);
    document.getElementById('fan-x').addEventListener('change', updateSimulation);
    document.getElementById('fan-y').addEventListener('change', updateSimulation);
    document.getElementById('fan-height').addEventListener('change', updateSimulation);
    
    // Visualization parameter inputs
    document.getElementById('particle-density').addEventListener('change', updateParticles);
    
    // Window resize event
    window.addEventListener('resize', onWindowResize);
}

// Toggle play/pause
function togglePlayPause() {
    isPlaying = !isPlaying;
    
    const button = document.getElementById('play-pause');
    if (isPlaying) {
        button.innerHTML = '<i class="fas fa-pause"></i>';
        button.setAttribute('title', 'Pause Simulation');
    } else {
        button.innerHTML = '<i class="fas fa-play"></i>';
        button.setAttribute('title', 'Play Simulation');
    }
}

// Reset simulation
function resetSimulation() {
    // Reset parameters to defaults
    params.roomLength = 50;
    params.roomWidth = 50;
    params.roomHeight = 20;
    params.fanModel = 'powerfoil-x3';
    params.fanDiameter = 14;
    params.fanCFM = 300000;
    params.fanRPM = 50;
    params.fanDirection = 'down';
    params.fanX = 25;
    params.fanY = 25;
    params.fanHeight = 18;
    params.particleDensity = 'medium';
    
    // Update UI inputs
    document.getElementById('room-length').value = params.roomLength;
    document.getElementById('room-width').value = params.roomWidth;
    document.getElementById('room-height').value = params.roomHeight;
    document.getElementById('fan-model').value = params.fanModel;
    document.getElementById('fan-diameter').value = params.fanDiameter;
    document.getElementById('fan-cfm').value = params.fanCFM;
    document.getElementById('fan-rpm').value = params.fanRPM;
    document.getElementById('fan-direction').value = params.fanDirection;
    document.getElementById('fan-x').value = params.fanX;
    document.getElementById('fan-y').value = params.fanY;
    document.getElementById('fan-height').value = params.fanHeight;
    document.getElementById('particle-density').value = params.particleDensity;
    
    // Update simulation
    updateSimulation();
}

// Update simulation
function updateSimulation() {
    // Get parameters from UI
    updateParamsFromUI();
    
    // Update room
    createRoom();
    
    // Update fan
    createFan();
    
    // Update particles
    createParticles();
    
    // Calculate results
    calculateResults();
    
    // Update results UI
    updateResultsUI();
}

// Update fan model
function updateFanModel() {
    // Get selected model
    const modelKey = document.getElementById('fan-model').value;
    const model = fanModels[modelKey];
    
    // Update fan parameters based on model
    document.getElementById('fan-diameter').value = model.maxDiameter / 2;
    document.getElementById('fan-cfm').value = model.maxCFM / 2;
    
    // Update simulation
    updateSimulation();
}

// Update particles
function updateParticles() {
    // Get particle density
    params.particleDensity = document.getElementById('particle-density').value;
    
    // Update particles
    createParticles();
}

// Handle window resize
function onWindowResize() {
    // Update camera aspect ratio
    camera.aspect = getAspectRatio();
    camera.updateProjectionMatrix();
    
    // Update renderer size
    renderer.setSize(getCanvasWidth(), getCanvasHeight());
}

// Initialize simulation when page loads
window.addEventListener('load', init);
