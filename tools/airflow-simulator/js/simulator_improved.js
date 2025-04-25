// Industrial Fan Airflow Simulator
// Properly implemented 3D fan model with correct horizontal orientation,
// blades attaching to hub, and drop tube centered on hub

// Global variables
let scene, camera, renderer, fan, particles = [];
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
    renderer.setSize(document.getElementById('simulator-canvas').offsetWidth, document.getElementById('simulator-canvas').offsetHeight);
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
    
    // Start animation
    animate();
    
    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    
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

// Create the fan with proper horizontal orientation, blades attaching to hub, and drop tube
function createFan() {
    // Remove existing fan if any
    if (fan) {
        scene.remove(fan);
    }
    
    // Create fan group
    fan = new THREE.Group();
    
    // Create drop tube (vertical mounting pole)
    const tubeMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const tubeGeometry = new THREE.CylinderGeometry(0.15, 0.15, roomDimensions.height - fanConfig.position.z, 16);
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    tube.position.set(0, (roomDimensions.height - fanConfig.position.z) / 2, 0);
    fan.add(tube);
    
    // Create hub (central part where blades attach)
    const hubMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
    const hubGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.5, 32);
    const hub = new THREE.Mesh(hubGeometry, hubMaterial);
    hub.rotation.x = Math.PI / 2; // Rotate to horizontal position
    fan.add(hub);
    
    // Create motor housing
    const motorMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
    const motorGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.8, 32);
    const motor = new THREE.Mesh(motorGeometry, motorMaterial);
    motor.rotation.x = Math.PI / 2; // Rotate to horizontal position
    motor.position.set(0, 0.65, 0);
    fan.add(motor);
    
    // Create connection between hub and tube
    const connectorMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
    const connectorGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const connector = new THREE.Mesh(connectorGeometry, connectorMaterial);
    connector.position.set(0, 0, 0);
    fan.add(connector);
    
    // Create blades (3 blades properly attached to hub)
    const bladeMaterial = new THREE.MeshPhongMaterial({ color: 0xCCCCCC, side: THREE.DoubleSide });
    
    // Function to create a single blade
    function createBlade(angle) {
        const bladeGroup = new THREE.Group();
        
        // Create blade shape - tapered for aerodynamic design
        const bladeShape = new THREE.Shape();
        bladeShape.moveTo(0, 0);
        bladeShape.lineTo(0.5, -0.2);
        bladeShape.lineTo(fanConfig.diameter / 2 - 0.5, -0.3);
        bladeShape.lineTo(fanConfig.diameter / 2, 0);
        bladeShape.lineTo(fanConfig.diameter / 2 - 0.5, 0.3);
        bladeShape.lineTo(0.5, 0.2);
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
        
        // Rotate and position blade
        blade.rotation.z = angle;
        blade.rotation.y = Math.PI / 12; // Slight pitch for airflow
        
        bladeGroup.add(blade);
        bladeGroup.rotation.x = Math.PI / 2; // Rotate to horizontal position
        
        return bladeGroup;
    }
    
    // Create 3 blades at 120-degree intervals
    for (let i = 0; i < 3; i++) {
        const blade = createBlade((i * 2 * Math.PI) / 3);
        fan.add(blade);
    }
    
    // Position fan in the room
    fan.position.set(
        fanConfig.position.x,
        fanConfig.position.z,
        fanConfig.position.y
    );
    
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
    
    // Create particles
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Set initial position around the fan
        const radius = (Math.random() * fanConfig.diameter / 2) + 0.5;
        const angle = Math.random() * Math.PI * 2;
        
        particle.position.set(
            fanConfig.position.x + radius * Math.cos(angle),
            fanConfig.position.z,
            fanConfig.position.y + radius * Math.sin(angle)
        );
        
        // Add velocity and age properties for animation
        particle.velocity = new THREE.Vector3(0, 0, 0);
        particle.age = Math.random() * 100;
        
        scene.add(particle);
        particles.push(particle);
    }
}

// Animation loop
function animate() {
    animationId = requestAnimationFrame(animate);
    
    if (isPlaying) {
        // Rotate fan blades
        if (fan && fan.children) {
            // Find blade groups (indices 3, 4, 5 based on our creation order)
            for (let i = 3; i < 6; i++) {
                if (fan.children[i]) {
                    fan.children[i].rotation.z += (fanConfig.rpm / 60) * 0.1 * (fanConfig.direction === 'down' ? 1 : -1);
                }
            }
        }
        
        // Update particles
        updateParticles();
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
        
        // Calculate distance from fan center
        const distanceFromFan = particle.position.distanceTo(fanCenter);
        
        // Determine flow pattern based on fan direction
        if (fanConfig.direction === 'down') {
            // Downward flow pattern
            if (particle.position.y > 1 && distanceFromFan < fanConfig.diameter / 2) {
                // Particles directly under fan move downward
                particle.velocity.y = -0.1 - (0.05 * fanConfig.rpm / 50);
                particle.velocity.x = (Math.random() - 0.5) * 0.02;
                particle.velocity.z = (Math.random() - 0.5) * 0.02;
            } else if (particle.position.y < 1) {
                // Particles near floor spread outward
                const directionFromCenter = new THREE.Vector3(
                    particle.position.x - fanCenter.x,
                    0,
                    particle.position.z - fanCenter.z
                ).normalize();
                
                particle.velocity.x = directionFromCenter.x * 0.08;
                particle.velocity.z = directionFromCenter.z * 0.08;
                particle.velocity.y = 0;
                
                // Start rising when far enough from center
                if (distanceFromFan > fanConfig.diameter) {
                    particle.velocity.y = 0.05;
                }
            } else if (distanceFromFan > fanConfig.diameter && particle.position.y < fanConfig.position.z) {
                // Particles rise along walls
                particle.velocity.y = 0.08;
                
                // Move slightly toward fan at upper levels
                if (particle.position.y > fanConfig.position.z * 0.7) {
                    const directionToCenter = new THREE.Vector3(
                        fanCenter.x - particle.position.x,
                        0,
                        fanCenter.z - particle.position.z
                    ).normalize();
                    
                    particle.velocity.x = directionToCenter.x * 0.05;
                    particle.velocity.z = directionToCenter.z * 0.05;
                }
            } else if (particle.position.y >= fanConfig.position.z) {
                // Particles above fan level move toward fan
                const directionToCenter = new THREE.Vector3(
                    fanCenter.x - particle.position.x,
                    0,
                    fanCenter.z - particle.position.z
                ).normalize();
                
                particle.velocity.x = directionToCenter.x * 0.1;
                particle.velocity.z = directionToCenter.z * 0.1;
                particle.velocity.y = -0.02;
            }
        } else {
            // Upward flow pattern (reverse of downward)
            if (distanceFromFan < fanConfig.diameter / 2) {
                // Particles directly under fan move upward
                particle.velocity.y = 0.1 + (0.05 * fanConfig.rpm / 50);
                particle.velocity.x = (Math.random() - 0.5) * 0.02;
                particle.velocity.z = (Math.random() - 0.5) * 0.02;
            } else if (particle.position.y > fanConfig.position.z) {
                // Particles above fan spread outward
                const directionFromCenter = new THREE.Vector3(
                    particle.position.x - fanCenter.x,
                    0,
                    particle.position.z - fanCenter.z
                ).normalize();
                
                particle.velocity.x = directionFromCenter.x * 0.08;
                particle.velocity.z = directionFromCenter.z * 0.08;
                particle.velocity.y = 0;
                
                // Start falling when far enough from center
                if (distanceFromFan > fanConfig.diameter) {
                    particle.velocity.y = -0.05;
                }
            } else if (distanceFromFan > fanConfig.diameter) {
                // Particles fall along walls
                particle.velocity.y = -0.08;
                
                // Move slightly toward fan at lower levels
                if (particle.position.y < fanConfig.position.z * 0.3) {
                    const directionToCenter = new THREE.Vector3(
                        fanCenter.x - particle.position.x,
                        0,
                        fanCenter.z - particle.position.z
                    ).normalize();
                    
                    particle.velocity.x = directionToCenter.x * 0.05;
                    particle.velocity.z = directionToCenter.z * 0.05;
                }
            } else if (particle.position.y <= 1) {
                // Particles at floor level move toward fan
                const directionToCenter = new THREE.Vector3(
                    fanCenter.x - particle.position.x,
                    0,
                    fanCenter.z - particle.position.z
                ).normalize();
                
                particle.velocity.x = directionToCenter.x * 0.1;
                particle.velocity.z = directionToCenter.z * 0.1;
                particle.velocity.y = 0.02;
            }
        }
        
        // Apply velocity
        particle.position.x += particle.velocity.x;
        particle.position.y += particle.velocity.y;
        particle.position.z += particle.velocity.z;
        
        // Apply slight randomness for natural movement
        particle.position.x += (Math.random() - 0.5) * 0.02;
        particle.position.y += (Math.random() - 0.5) * 0.02;
        particle.position.z += (Math.random() - 0.5) * 0.02;
        
        // Reset particles that go out of bounds
        if (
            particle.position.x < 0 || 
            particle.position.x > roomDimensions.length ||
            particle.position.y < 0 || 
            particle.position.y > roomDimensions.height ||
            particle.position.z < 0 || 
            particle.position.z > roomDimensions.width ||
            particle.age > 200
        ) {
            // Reset position to near the fan
            const radius = (Math.random() * fanConfig.diameter / 2) + 0.5;
            const angle = Math.random() * Math.PI * 2;
            
            particle.position.set(
                fanConfig.position.x + radius * Math.cos(angle),
                fanConfig.position.z,
                fanConfig.position.y + radius * Math.sin(angle)
            );
            
            particle.velocity.set(0, 0, 0);
            particle.age = 0;
        }
        
        // Scale particle size based on velocity magnitude for visual effect
        const speed = Math.sqrt(
            particle.velocity.x * particle.velocity.x +
            particle.velocity.y * particle.velocity.y +
            particle.velocity.z * particle.velocity.z
        );
        
        const scale = 0.5 + speed * 5;
        particle.scale.set(scale, scale, scale);
    });
}

// Handle window resize
function onWindowResize() {
    const canvas = document.getElementById('simulator-canvas');
    camera.aspect = canvas.offsetWidth / canvas.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
}

// Set camera position for 3D view
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
}

// Set camera position for top view
function setCameraTopView() {
    camera.position.set(
        roomDimensions.length / 2,
        roomDimensions.height * 1.5,
        roomDimensions.width / 2
    );
    camera.lookAt(
        roomDimensions.length / 2,
        0,
        roomDimensions.width / 2
    );
}

// Set camera position for side view
function setCameraSideView() {
    camera.position.set(
        roomDimensions.length * 1.5,
        roomDimensions.height / 2,
        roomDimensions.width / 2
    );
    camera.lookAt(
        roomDimensions.length / 2,
        roomDimensions.height / 2,
        roomDimensions.width / 2
    );
}

// Update simulation with current settings
function updateSimulation() {
    // Show loading overlay
    document.getElementById('loading-overlay').style.display = 'flex';
    
    // Get values from inputs
    roomDimensions.length = parseFloat(document.getElementById('room-length').value);
    roomDimensions.width = parseFloat(document.getElementById('room-width').value);
    roomDimensions.height = parseFloat(document.getElementById('room-height').value);
    
    fanConfig.model = document.getElementById('fan-model').value;
    fanConfig.diameter = parseFloat(document.getElementById('fan-diameter').value);
    fanConfig.cfm = parseFloat(document.getElementById('fan-cfm').value);
    fanConfig.rpm = parseFloat(document.getElementById('fan-rpm').value);
    fanConfig.direction = document.getElementById('fan-direction').value;
    fanConfig.position.x = parseFloat(document.getElementById('fan-x').value);
    fanConfig.position.y = parseFloat(document.getElementById('fan-y').value);
    fanConfig.position.z = parseFloat(document.getElementById('fan-height').value);
    
    particleDensity = document.getElementById('particle-density').value;
    
    // Recreate scene
    scene.clear();
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
    
    // Hide loading overlay
    document.getElementById('loading-overlay').style.display = 'none';
}

// Update simulation results
function updateResults() {
    // Calculate coverage area (simplified calculation)
    const coverageArea = Math.PI * Math.pow(fanConfig.diameter * 1.5, 2);
    document.getElementById('result-coverage').textContent = Math.round(coverageArea) + ' sq ft';
    
    // Calculate air changes per hour (simplified)
    const roomVolume = roomDimensions.length * roomDimensions.width * roomDimensions.height;
    const airChanges = (fanConfig.cfm * 60) / roomVolume;
    document.getElementById('result-air-changes').textContent = airChanges.toFixed(1) + ' ACH';
    
    // Calculate energy usage (simplified)
    const energyUsage = (fanConfig.diameter / 10) * (fanConfig.rpm / 50) * 0.75;
    document.getElementById('result-energy').textContent = energyUsage.toFixed(2) + ' kW';
    
    // Calculate cooling effect (simplified)
    const coolingEffect = (fanConfig.diameter / 10) * (fanConfig.rpm / 40) * 0.8;
    document.getElementById('result-cooling').textContent = coolingEffect.toFixed(1) + '°F';
}

// Toggle play/pause
function togglePlayPause() {
    isPlaying = !isPlaying;
    const playPauseButton = document.getElementById('play-pause');
    playPauseButton.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
}

// Reset simulation
function resetSimulation() {
    // Reset to default values
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

// Change view
function changeView(view) {
    currentView = view;
    
    // Update active button
    document.querySelectorAll('.view-button').forEach(button => {
        button.classList.remove('active');
    });
    document.getElementById('view-' + view).classList.add('active');
    
    // Set camera position
    if (view === '3d') {
        setCamera3DView();
    } else if (view === 'top') {
        setCameraTopView();
    } else if (view === 'side') {
        setCameraSideView();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize simulator
    initSimulator();
    
    // Add event listeners
    document.getElementById('update-simulation').addEventListener('click', updateSimulation);
    document.getElementById('play-pause').addEventListener('click', togglePlayPause);
    document.getElementById('reset').addEventListener('click', resetSimulation);
    
    document.getElementById('view-top').addEventListener('click', function() { changeView('top'); });
    document.getElementById('view-side').addEventListener('click', function() { changeView('side'); });
    document.getElementById('view-3d').addEventListener('click', function() { changeView('3d'); });
});
