// Industrial Fan Airflow Simulator
// Properly implemented 3D fan model with perfect horizontal orientation,
// symmetrical blades attaching to hub, and drop tube centered on hub

// Global variables
let scene, camera, renderer, fan, blades = [], particles = [];
let animationId = null;
let isPlaying = true;
let currentView = '3d'; // Default view: '3d', 'top', or 'side'
let roomDimensions = { length: 50, width: 50, height: 20 };
let fanConfig = {
    model: 'powerfoil-x3',
    diameter: 14,
    cfm: 300000,
    rpm: 50,
    direction: 'down',
    position: { x: 25, y: 25, z: 18 }
};
let particleDensity = 'medium';
let particleCounts = { low: 500, medium: 1500, high: 3000 };

// Controls for camera manipulation
let controls;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let zoomLevel = 1;

// Initialize the simulator
function initSimulator() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    setCamera3DView();
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('simulator-canvas'), antialias: true });
    renderer.setSize(document.querySelector('.simulator-display').offsetWidth, document.querySelector('.simulator-display').offsetHeight);
    renderer.shadowMap.enabled = true;
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 15);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Create room
    createRoom();
    
    // Create fan
    createFan();
    
    // Create particles
    createParticles();
    
    // Add orbit controls for camera manipulation
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI;
    controls.minDistance = 5;
    controls.maxDistance = 100;
    
    // Start animation
    animate();
    
    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    
    // Add manipulation controls
    setupManipulationControls();
    
    // Hide loading overlay
    document.getElementById('loading-overlay').style.display = 'none';
}

// Create the room
function createRoom() {
    const roomGeometry = new THREE.BoxGeometry(
        roomDimensions.length, 
        roomDimensions.height, 
        roomDimensions.width
    );
    const roomMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x333333, 
        transparent: true, 
        opacity: 0.1,
        side: THREE.BackSide
    });
    const room = new THREE.Mesh(roomGeometry, roomMaterial);
    room.position.set(
        roomDimensions.length / 2, 
        roomDimensions.height / 2, 
        roomDimensions.width / 2
    );
    scene.add(room);
    
    // Add grid for floor
    const gridHelper = new THREE.GridHelper(
        Math.max(roomDimensions.length, roomDimensions.width), 
        Math.max(roomDimensions.length, roomDimensions.width) / 5
    );
    gridHelper.position.set(
        roomDimensions.length / 2, 
        0.01, 
        roomDimensions.width / 2
    );
    scene.add(gridHelper);
    
    // Add axes helper
    const axesHelper = new THREE.AxesHelper(5);
    axesHelper.position.set(0, 0, 0);
    scene.add(axesHelper);
}

// Create the fan with perfect horizontal orientation and symmetrical blades
function createFan() {
    // Remove existing fan if any
    if (fan) {
        scene.remove(fan);
    }
    
    // Clear blades array
    blades = [];
    
    // Create fan group
    fan = new THREE.Group();
    
    // Create drop tube (vertical mounting pole)
    const tubeMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const tubeGeometry = new THREE.CylinderGeometry(0.15, 0.15, roomDimensions.height - fanConfig.position.z, 16);
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    // Position tube exactly vertical
    tube.rotation.set(0, 0, 0);
    tube.position.set(0, (roomDimensions.height - fanConfig.position.z) / 2, 0);
    fan.add(tube);
    
    // Create hub (central part where blades attach)
    const hubMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
    const hubGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.5, 32);
    const hub = new THREE.Mesh(hubGeometry, hubMaterial);
    // Ensure hub is perfectly horizontal (90 degrees to the tube)
    hub.rotation.x = Math.PI / 2;
    hub.rotation.y = 0;
    hub.rotation.z = 0;
    hub.position.set(0, 0, 0);
    fan.add(hub);
    
    // Create motor housing
    const motorMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
    const motorGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.8, 32);
    const motor = new THREE.Mesh(motorGeometry, motorMaterial);
    // Ensure motor is perfectly horizontal
    motor.rotation.x = Math.PI / 2;
    motor.rotation.y = 0;
    motor.rotation.z = 0;
    motor.position.set(0, 0.65, 0);
    fan.add(motor);
    
    // Create connection between hub and tube
    const connectorMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
    const connectorGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const connector = new THREE.Mesh(connectorGeometry, connectorMaterial);
    // Ensure connector is perfectly centered
    connector.position.set(0, 0, 0);
    fan.add(connector);
    
    // Create a rotating blade assembly
    const bladeAssembly = new THREE.Group();
    // Ensure blade assembly is perfectly horizontal
    bladeAssembly.rotation.x = Math.PI / 2;
    bladeAssembly.rotation.y = 0;
    bladeAssembly.rotation.z = 0;
    
    // Create perfectly symmetrical blades
    const bladeMaterial = new THREE.MeshPhongMaterial({ color: 0xCCCCCC, side: THREE.DoubleSide });
    
    // Function to create a single symmetrical blade
    function createSymmetricalBlade(angle) {
        // Create a perfectly symmetrical blade shape
        const bladeShape = new THREE.Shape();
        
        // Start at center point
        bladeShape.moveTo(0, 0);
        
        // Define blade with perfect symmetry along its length
        const bladeLength = fanConfig.diameter / 2;
        const maxWidth = 0.6; // Maximum width at the middle of the blade
        
        // Create symmetrical blade outline
        bladeShape.lineTo(bladeLength * 0.1, -maxWidth * 0.5);
        bladeShape.lineTo(bladeLength * 0.5, -maxWidth);
        bladeShape.lineTo(bladeLength, -maxWidth * 0.3);
        bladeShape.lineTo(bladeLength, maxWidth * 0.3);
        bladeShape.lineTo(bladeLength * 0.5, maxWidth);
        bladeShape.lineTo(bladeLength * 0.1, maxWidth * 0.5);
        bladeShape.lineTo(0, 0);
        
        const extrudeSettings = {
            steps: 1,
            depth: 0.1,
            bevelEnabled: true,
            bevelThickness: 0.05,
            bevelSize: 0.05,
            bevelSegments: 3
        };
        
        const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        
        // Ensure blade is perfectly flat (no pitch)
        blade.rotation.x = 0;
        blade.rotation.y = 0;
        blade.rotation.z = angle;
        
        return blade;
    }
    
    // Create 3 blades at exactly 120-degree intervals for perfect symmetry
    for (let i = 0; i < 3; i++) {
        const angle = (i * 2 * Math.PI) / 3; // Exactly 120 degrees apart
        const blade = createSymmetricalBlade(angle);
        bladeAssembly.add(blade);
    }
    
    // Add blade assembly to fan
    fan.add(bladeAssembly);
    
    // Store blade assembly reference for rotation
    blades.push(bladeAssembly);
    
    // Position fan in the room
    // Ensure fan is perfectly positioned with the hub centered on the drop tube
    fan.position.set(
        fanConfig.position.x,
        fanConfig.position.z,
        fanConfig.position.y
    );
    
    // Ensure fan is perfectly level (no tilt)
    fan.rotation.x = 0;
    fan.rotation.y = 0;
    fan.rotation.z = 0;
    
    scene.add(fan);
}

// Create airflow particles
function createParticles() {
    // Clear existing particles
    particles.forEach(particle => scene.remove(particle));
    particles = [];
    
    // Determine number of particles based on density setting
    const particleCount = particleCounts[particleDensity];
    
    // Create particle material
    const particleMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00aaff,
        transparent: true,
        opacity: 0.7
    });
    
    // Create particles distributed throughout the room
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Distribute particles throughout the room with higher concentration near fan
        let x, y, z;
        
        if (Math.random() < 0.7) {
            // 70% of particles near the fan or in circulation pattern
            const radius = (Math.random() * roomDimensions.length / 2);
            const angle = Math.random() * Math.PI * 2;
            const height = Math.random() * roomDimensions.height;
            
            x = fanConfig.position.x + radius * Math.cos(angle);
            y = height;
            z = fanConfig.position.y + radius * Math.sin(angle);
        } else {
            // 30% of particles randomly throughout the room
            x = Math.random() * roomDimensions.length;
            y = Math.random() * roomDimensions.height;
            z = Math.random() * roomDimensions.width;
        }
        
        particle.position.set(x, y, z);
        
        // Add velocity and age properties for animation
        particle.velocity = new THREE.Vector3(0, 0, 0);
        particle.age = Math.random() * 100;
        particle.phase = Math.floor(Math.random() * 4); // 0: under fan, 1: floor, 2: walls, 3: ceiling
        
        scene.add(particle);
        particles.push(particle);
    }
}

// Animation loop
function animate() {
    animationId = requestAnimationFrame(animate);
    
    if (isPlaying) {
        // Rotate fan blades - all blades rotate together
        if (blades.length > 0) {
            const rotationSpeed = (fanConfig.rpm / 60) * 0.1 * (fanConfig.direction === 'down' ? 1 : -1);
            blades.forEach(blade => {
                blade.rotation.z += rotationSpeed;
            });
        }
        
        // Update particles
        updateParticles();
    }
    
    // Update controls
    if (controls) {
        controls.update();
    }
    
    // Render scene
    renderer.render(scene, camera);
}

// Update particle positions to simulate airflow
function updateParticles() {
    const fanCenter = new THREE.Vector3(
        fanConfig.position.x,
        fanConfig.position.z,
        fanConfig.position.y
    );
    
    particles.forEach(particle => {
        // Increase age
        particle.age += 0.5;
        
        // Calculate distance from fan center (horizontal distance only)
        const horizontalDistance = Math.sqrt(
            Math.pow(particle.position.x - fanCenter.x, 2) + 
            Math.pow(particle.position.z - fanCenter.z, 2)
        );
        
        // Determine flow pattern based on fan direction
        if (fanConfig.direction === 'down') {
            // Downward flow pattern with distinct phases
            
            // Phase 0: Directly under fan, moving downward
            if (particle.phase === 0) {
                // Strong downward velocity
                particle.velocity.y = -0.15 - (0.05 * fanConfig.rpm / 50);
                // Slight horizontal movement
                particle.velocity.x = (Math.random() - 0.5) * 0.02;
                particle.velocity.z = (Math.random() - 0.5) * 0.02;
                
                // Transition to floor phase when near floor
                if (particle.position.y < 1.0) {
                    particle.phase = 1;
                }
            }
            // Phase 1: Near floor, spreading outward
            else if (particle.phase === 1) {
                // Calculate direction away from fan center
                const directionFromCenter = new THREE.Vector3(
                    particle.position.x - fanCenter.x,
                    0,
                    particle.position.z - fanCenter.z
                ).normalize();
                
                // Strong outward velocity along floor
                particle.velocity.x = directionFromCenter.x * 0.15;
                particle.velocity.z = directionFromCenter.z * 0.15;
                // Keep close to floor
                particle.velocity.y = Math.min(0.01, particle.position.y * 0.1);
                
                // Transition to wall phase when far enough from center
                if (horizontalDistance > fanConfig.diameter * 1.5 || 
                    particle.position.x < 2 || 
                    particle.position.x > roomDimensions.length - 2 ||
                    particle.position.z < 2 || 
                    particle.position.z > roomDimensions.width - 2) {
                    particle.phase = 2;
                }
            }
            // Phase 2: Along walls, rising upward
            else if (particle.phase === 2) {
                // Strong upward velocity
                particle.velocity.y = 0.12;
                
                // Keep near walls by moving toward nearest wall
                const distToLeftWall = particle.position.x;
                const distToRightWall = roomDimensions.length - particle.position.x;
                const distToFrontWall = particle.position.z;
                const distToBackWall = roomDimensions.width - particle.position.z;
                
                const minDist = Math.min(distToLeftWall, distToRightWall, distToFrontWall, distToBackWall);
                
                if (minDist === distToLeftWall) {
                    particle.velocity.x = -0.05;
                } else if (minDist === distToRightWall) {
                    particle.velocity.x = 0.05;
                } else if (minDist === distToFrontWall) {
                    particle.velocity.z = -0.05;
                } else if (minDist === distToBackWall) {
                    particle.velocity.z = 0.05;
                }
                
                // Transition to ceiling phase when near ceiling
                if (particle.position.y > roomDimensions.height - 2) {
                    particle.phase = 3;
                }
            }
            // Phase 3: Along ceiling, moving toward fan
            else if (particle.phase === 3) {
                // Calculate direction toward fan center
                const directionToCenter = new THREE.Vector3(
                    fanCenter.x - particle.position.x,
                    0,
                    fanCenter.z - particle.position.z
                ).normalize();
                
                // Strong movement toward fan
                particle.velocity.x = directionToCenter.x * 0.12;
                particle.velocity.z = directionToCenter.z * 0.12;
                
                // Keep near ceiling
                particle.velocity.y = Math.max(-0.01, (roomDimensions.height - particle.position.y) * 0.1);
                
                // Transition back to under fan phase when near fan
                if (horizontalDistance < fanConfig.diameter / 2 && 
                    Math.abs(particle.position.y - fanCenter.y) < 2) {
                    particle.phase = 0;
                }
            }
        } else {
            // Upward flow pattern (reverse of downward) - similar phase-based approach
            // Phase 0: Directly under fan, moving upward
            if (particle.phase === 0) {
                particle.velocity.y = 0.15 + (0.05 * fanConfig.rpm / 50);
                particle.velocity.x = (Math.random() - 0.5) * 0.02;
                particle.velocity.z = (Math.random() - 0.5) * 0.02;
                
                if (particle.position.y > fanConfig.position.z + 1) {
                    particle.phase = 3;
                }
            }
            // Phase 3: Along ceiling, spreading outward
            else if (particle.phase === 3) {
                const directionFromCenter = new THREE.Vector3(
                    particle.position.x - fanCenter.x,
                    0,
                    particle.position.z - fanCenter.z
                ).normalize();
                
                particle.velocity.x = directionFromCenter.x * 0.15;
                particle.velocity.z = directionFromCenter.z * 0.15;
                particle.velocity.y = Math.max(-0.01, (roomDimensions.height - particle.position.y) * 0.1);
                
                if (horizontalDistance > fanConfig.diameter * 1.5 || 
                    particle.position.x < 2 || 
                    particle.position.x > roomDimensions.length - 2 ||
                    particle.position.z < 2 || 
                    particle.position.z > roomDimensions.width - 2) {
                    particle.phase = 2;
                }
            }
            // Phase 2: Along walls, falling downward
            else if (particle.phase === 2) {
                particle.velocity.y = -0.12;
                
                const distToLeftWall = particle.position.x;
                const distToRightWall = roomDimensions.length - particle.position.x;
                const distToFrontWall = particle.position.z;
                const distToBackWall = roomDimensions.width - particle.position.z;
                
                const minDist = Math.min(distToLeftWall, distToRightWall, distToFrontWall, distToBackWall);
                
                if (minDist === distToLeftWall) {
                    particle.velocity.x = -0.05;
                } else if (minDist === distToRightWall) {
                    particle.velocity.x = 0.05;
                } else if (minDist === distToFrontWall) {
                    particle.velocity.z = -0.05;
                } else if (minDist === distToBackWall) {
                    particle.velocity.z = 0.05;
                }
                
                if (particle.position.y < 2) {
                    particle.phase = 1;
                }
            }
            // Phase 1: Along floor, moving toward center
            else if (particle.phase === 1) {
                const directionToCenter = new THREE.Vector3(
                    fanCenter.x - particle.position.x,
                    0,
                    fanCenter.z - particle.position.z
                ).normalize();
                
                particle.velocity.x = directionToCenter.x * 0.12;
                particle.velocity.z = directionToCenter.z * 0.12;
                particle.velocity.y = Math.min(0.01, particle.position.y * 0.1);
                
                if (horizontalDistance < fanConfig.diameter / 2) {
                    particle.phase = 0;
                }
            }
        }
        
        // Apply velocity to position
        particle.position.x += particle.velocity.x;
        particle.position.y += particle.velocity.y;
        particle.position.z += particle.velocity.z;
        
        // Keep particles within room bounds
        particle.position.x = Math.max(0.5, Math.min(roomDimensions.length - 0.5, particle.position.x));
        particle.position.y = Math.max(0.5, Math.min(roomDimensions.height - 0.5, particle.position.y));
        particle.position.z = Math.max(0.5, Math.min(roomDimensions.width - 0.5, particle.position.z));
    });
}

// Set camera to 3D view
function setCamera3DView() {
    camera.position.set(
        roomDimensions.length * 0.7,
        roomDimensions.height * 0.7,
        roomDimensions.width * 0.7
    );
    camera.lookAt(
        roomDimensions.length / 2,
        roomDimensions.height / 2,
        roomDimensions.width / 2
    );
    currentView = '3d';
    updateViewButtons();
}

// Set camera to top view
function setCameraTopView() {
    camera.position.set(
        roomDimensions.length / 2,
        roomDimensions.height * 2,
        roomDimensions.width / 2
    );
    camera.lookAt(
        roomDimensions.length / 2,
        0,
        roomDimensions.width / 2
    );
    currentView = 'top';
    updateViewButtons();
}

// Set camera to side view
function setCameraSideView() {
    camera.position.set(
        roomDimensions.length * 2,
        roomDimensions.height / 2,
        roomDimensions.width / 2
    );
    camera.lookAt(
        0,
        roomDimensions.height / 2,
        roomDimensions.width / 2
    );
    currentView = 'side';
    updateViewButtons();
}

// Update view buttons to show active state
function updateViewButtons() {
    document.querySelectorAll('.view-button').forEach(button => {
        button.classList.remove('active');
    });
    
    if (currentView === '3d') {
        document.getElementById('view-3d').classList.add('active');
    } else if (currentView === 'top') {
        document.getElementById('view-top').classList.add('active');
    } else if (currentView === 'side') {
        document.getElementById('view-side').classList.add('active');
    }
}

// Handle window resize
function onWindowResize() {
    const displayElement = document.querySelector('.simulator-display');
    camera.aspect = displayElement.offsetWidth / displayElement.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(displayElement.offsetWidth, displayElement.offsetHeight);
}

// Setup manipulation controls
function setupManipulationControls() {
    // Create manipulation controls container if it doesn't exist
    if (!document.querySelector('.manipulation-controls')) {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'manipulation-controls';
        
        // Zoom in button
        const zoomInButton = document.createElement('button');
        zoomInButton.className = 'manipulation-button';
        zoomInButton.innerHTML = '<i class="fas fa-plus"></i>';
        zoomInButton.title = 'Zoom In';
        zoomInButton.addEventListener('click', () => {
            controls.dollyIn(1.2);
        });
        
        // Zoom out button
        const zoomOutButton = document.createElement('button');
        zoomOutButton.className = 'manipulation-button';
        zoomOutButton.innerHTML = '<i class="fas fa-minus"></i>';
        zoomOutButton.title = 'Zoom Out';
        zoomOutButton.addEventListener('click', () => {
            controls.dollyOut(1.2);
        });
        
        // Reset view button
        const resetViewButton = document.createElement('button');
        resetViewButton.className = 'manipulation-button';
        resetViewButton.innerHTML = '<i class="fas fa-home"></i>';
        resetViewButton.title = 'Reset View';
        resetViewButton.addEventListener('click', () => {
            if (currentView === '3d') {
                setCamera3DView();
            } else if (currentView === 'top') {
                setCameraTopView();
            } else if (currentView === 'side') {
                setCameraSideView();
            }
            controls.reset();
        });
        
        // Add buttons to container
        controlsContainer.appendChild(zoomInButton);
        controlsContainer.appendChild(zoomOutButton);
        controlsContainer.appendChild(resetViewButton);
        
        // Add container to simulator display
        document.querySelector('.simulator-display').appendChild(controlsContainer);
    }
}

// Update simulation based on form inputs
function updateSimulation() {
    // Get room dimensions
    roomDimensions.length = parseFloat(document.getElementById('room-length').value);
    roomDimensions.width = parseFloat(document.getElementById('room-width').value);
    roomDimensions.height = parseFloat(document.getElementById('room-height').value);
    
    // Get fan configuration
    fanConfig.model = document.getElementById('fan-model').value;
    fanConfig.diameter = parseFloat(document.getElementById('fan-diameter').value);
    fanConfig.cfm = parseFloat(document.getElementById('fan-cfm').value);
    fanConfig.rpm = parseFloat(document.getElementById('fan-rpm').value);
    fanConfig.direction = document.getElementById('fan-direction').value;
    fanConfig.position.x = parseFloat(document.getElementById('fan-x').value);
    fanConfig.position.y = parseFloat(document.getElementById('fan-y').value);
    fanConfig.position.z = parseFloat(document.getElementById('fan-height').value);
    
    // Get particle density
    particleDensity = document.getElementById('particle-density').value;
    
    // Recreate scene
    createRoom();
    createFan();
    createParticles();
    
    // Update camera position based on current view
    if (currentView === '3d') {
        setCamera3DView();
    } else if (currentView === 'top') {
        setCameraTopView();
    } else if (currentView === 'side') {
        setCameraSideView();
    }
    
    // Update simulation results
    updateResults();
}

// Update simulation results
function updateResults() {
    // Calculate coverage area (simplified calculation)
    const coverageArea = Math.PI * Math.pow(fanConfig.diameter * 1.5, 2);
    document.getElementById('result-coverage').textContent = Math.round(coverageArea) + ' sq ft';
    
    // Calculate air changes per hour (simplified calculation)
    const roomVolume = roomDimensions.length * roomDimensions.width * roomDimensions.height;
    const airChanges = (fanConfig.cfm * 60) / roomVolume;
    document.getElementById('result-air-changes').textContent = airChanges.toFixed(1) + ' ACH';
    
    // Calculate energy usage (simplified calculation)
    const energyUsage = (fanConfig.diameter / 10) * (fanConfig.rpm / 40) * 0.75;
    document.getElementById('result-energy').textContent = energyUsage.toFixed(2) + ' kW';
    
    // Calculate cooling effect (simplified calculation)
    const coolingEffect = (fanConfig.cfm / 50000) * (fanConfig.rpm / 50) * 0.5;
    document.getElementById('result-cooling').textContent = coolingEffect.toFixed(1) + '°F';
}

// Toggle play/pause
function togglePlayPause() {
    isPlaying = !isPlaying;
    const playPauseButton = document.getElementById('play-pause');
    if (isPlaying) {
        playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
    }
}

// Reset simulation
function resetSimulation() {
    // Reset form inputs to defaults
    document.getElementById('room-length').value = 50;
    document.getElementById('room-width').value = 50;
    document.getElementById('room-height').value = 20;
    document.getElementById('fan-model').value = 'powerfoil-x3';
    document.getElementById('fan-diameter').value = 14;
    document.getElementById('fan-cfm').value = 300000;
    document.getElementById('fan-rpm').value = 50;
    document.getElementById('fan-direction').value = 'down';
    document.getElementById('fan-x').value = 25;
    document.getElementById('fan-y').value = 25;
    document.getElementById('fan-height').value = 18;
    document.getElementById('particle-density').value = 'medium';
    
    // Update simulation
    updateSimulation();
}

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize simulator
    initSimulator();
    
    // Add event listeners for controls
    document.getElementById('update-simulation').addEventListener('click', updateSimulation);
    document.getElementById('play-pause').addEventListener('click', togglePlayPause);
    document.getElementById('reset').addEventListener('click', resetSimulation);
    
    // Add event listeners for view buttons
    document.getElementById('view-top').addEventListener('click', setCameraTopView);
    document.getElementById('view-side').addEventListener('click', setCameraSideView);
    document.getElementById('view-3d').addEventListener('click', setCamera3DView);
    
    // Initialize results
    updateResults();
});

// Load OrbitControls from CDN if not available
if (typeof THREE.OrbitControls === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
    script.onload = function() {
        // Reinitialize simulator after OrbitControls is loaded
        if (typeof initSimulator === 'function') {
            initSimulator();
        }
    };
    document.head.appendChild(script);
}
