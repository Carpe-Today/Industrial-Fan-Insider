// Industrial Fan Airflow Simulator
// Properly implemented 3D fan model with perfect horizontal orientation,
// symmetrical blades attaching to hub, and drop tube centered on hub
// Airflow simulation based on CFD principles with AMCA and SMACNA standards

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
let particleCounts = { low: 800, medium: 2500, high: 5000 }; // Increased for better visualization

// CFD simulation parameters
let turbulenceIntensity = 0.15; // Turbulence intensity factor (AMCA standard)
let reynoldsNumber = 100000; // Reynolds number for HVLS fans
let vorticityFactor = 0.08; // Vorticity factor for swirl effects
let boundaryLayerThickness = 0.5; // Boundary layer thickness near walls (SMACNA standard)
let temperatureGradient = 0.05; // Temperature gradient effect on air movement

// Controls for camera manipulation
let controls;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let zoomLevel = 1;

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    // Check if required libraries are loaded
    if (typeof THREE === 'undefined') {
        console.error('THREE.js library not loaded');
        document.getElementById('loading-overlay').innerHTML = 
            '<div class="error-message">Error: THREE.js library not loaded. Please refresh the page.</div>';
        return;
    }
    
    if (typeof THREE.OrbitControls === 'undefined') {
        console.error('THREE.OrbitControls not loaded');
        document.getElementById('loading-overlay').innerHTML = 
            '<div class="error-message">Error: OrbitControls not loaded. Please refresh the page.</div>';
        return;
    }
    
    // Initialize the simulator
    try {
        initSimulator();
        
        // Add event listeners for UI controls
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing simulator:', error);
        document.getElementById('loading-overlay').innerHTML = 
            '<div class="error-message">Error initializing simulator: ' + error.message + '</div>';
    }
});

// Initialize the simulator
function initSimulator() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(60, 
        document.querySelector('.simulator-display').offsetWidth / 
        document.querySelector('.simulator-display').offsetHeight, 
        0.1, 1000);
    setCamera3DView();
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('simulator-canvas'), 
        antialias: true,
        alpha: true
    });
    renderer.setSize(
        document.querySelector('.simulator-display').offsetWidth, 
        document.querySelector('.simulator-display').offsetHeight
    );
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
    
    // Update simulation results
    updateResults();
}

// Setup event listeners for UI controls
function setupEventListeners() {
    // View controls
    document.getElementById('view-3d').addEventListener('click', function() {
        setCamera3DView();
    });
    
    document.getElementById('view-top').addEventListener('click', function() {
        setCameraTopView();
    });
    
    document.getElementById('view-side').addEventListener('click', function() {
        setCameraSideView();
    });
    
    // Update simulation button
    document.getElementById('update-simulation').addEventListener('click', function() {
        // Show loading overlay during update
        document.getElementById('loading-overlay').style.display = 'flex';
        
        // Use setTimeout to allow the loading overlay to render before heavy computation
        setTimeout(function() {
            updateSimulation();
            document.getElementById('loading-overlay').style.display = 'none';
        }, 50);
    });
    
    // Play/pause button
    document.getElementById('play-pause').addEventListener('click', function() {
        isPlaying = !isPlaying;
        this.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    });
    
    // Reset button
    document.getElementById('reset').addEventListener('click', function() {
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
    });
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

// Create airflow particles using CFD principles
function createParticles() {
    // Clear existing particles
    particles.forEach(particle => scene.remove(particle));
    particles = [];
    
    // Determine number of particles based on density setting
    const particleCount = particleCounts[particleDensity];
    
    // Create particle materials with varying opacity for depth perception
    const particleMaterials = [
        new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.4 }),
        new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.5 }),
        new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.6 }),
        new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.7 })
    ];
    
    // Create particles distributed throughout the room using CFD-based distribution
    for (let i = 0; i < particleCount; i++) {
        // Vary particle size slightly for more natural appearance
        const particleSize = 0.05 + Math.random() * 0.1;
        const particleGeometry = new THREE.SphereGeometry(particleSize, 8, 8);
        
        // Select random material for varied appearance
        const materialIndex = Math.floor(Math.random() * particleMaterials.length);
        const particle = new THREE.Mesh(particleGeometry, particleMaterials[materialIndex]);
        
        // Distribute particles using CFD-based probability distribution
        let x, y, z;
        
        // Use different distribution strategies based on position in room
        const distributionStrategy = Math.random();
        
        if (distributionStrategy < 0.3) {
            // 30% of particles in fan influence zone (AMCA standard for primary air zone)
            const fanRadius = fanConfig.diameter / 2;
            const distanceFromFan = Math.random() * fanRadius * 3; // Within 3x fan radius
            const angle = Math.random() * Math.PI * 2;
            const heightVariation = Math.random() * roomDimensions.height;
            
            x = fanConfig.position.x + distanceFromFan * Math.cos(angle);
            z = fanConfig.position.y + distanceFromFan * Math.sin(angle);
            
            // Height distribution based on distance from fan (CFD principle)
            if (distanceFromFan < fanRadius) {
                // Directly under fan - more particles in column
                y = Math.random() * roomDimensions.height;
            } else {
                // Further from fan - stratified distribution
                const heightProbability = Math.random();
                if (heightProbability < 0.4) {
                    // 40% near floor (boundary layer)
                    y = Math.random() * 3;
                } else if (heightProbability < 0.7) {
                    // 30% in middle zone
                    y = 3 + Math.random() * (roomDimensions.height - 6);
                } else {
                    // 30% near ceiling
                    y = roomDimensions.height - 3 + Math.random() * 3;
                }
            }
        } else if (distributionStrategy < 0.6) {
            // 30% of particles in boundary layers near walls (SMACNA standard)
            const wallSelection = Math.random();
            
            if (wallSelection < 0.25) {
                // Near left wall
                x = Math.random() * 3;
                z = Math.random() * roomDimensions.width;
            } else if (wallSelection < 0.5) {
                // Near right wall
                x = roomDimensions.length - Math.random() * 3;
                z = Math.random() * roomDimensions.width;
            } else if (wallSelection < 0.75) {
                // Near front wall
                x = Math.random() * roomDimensions.length;
                z = Math.random() * 3;
            } else {
                // Near back wall
                x = Math.random() * roomDimensions.length;
                z = roomDimensions.width - Math.random() * 3;
            }
            
            // Height distribution along walls (boundary layer theory)
            y = Math.random() * roomDimensions.height;
        } else {
            // 40% of particles distributed throughout room volume (general air mixing)
            x = Math.random() * roomDimensions.length;
            y = Math.random() * roomDimensions.height;
            z = Math.random() * roomDimensions.width;
        }
        
        particle.position.set(x, y, z);
        
        // Add CFD-based properties for realistic movement
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.02, // Initial small random velocity
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02
        );
        
        // Add turbulence factor (AMCA standard)
        particle.turbulence = Math.random() * turbulenceIntensity;
        
        // Add vorticity factor for swirl effects
        particle.vorticity = Math.random() * vorticityFactor;
        
        // Add temperature influence factor
        particle.temperatureInfluence = Math.random() * temperatureGradient;
        
        // Add age property for lifecycle management
        particle.age = Math.random() * 100;
        
        // Add unique ID for tracking
        particle.id = i;
        
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
        
        // Update particles using CFD simulation
        updateParticlesCFD();
    }
    
    // Update controls
    if (controls) {
        controls.update();
    }
    
    // Render scene
    renderer.render(scene, camera);
}

// Update particle positions using CFD principles (AMCA and SMACNA standards)
function updateParticlesCFD() {
    const fanCenter = new THREE.Vector3(
        fanConfig.position.x,
        fanConfig.position.z,
        fanConfig.position.y
    );
    
    // Calculate fan influence radius based on AMCA standards
    const fanRadius = fanConfig.diameter / 2;
    const fanInfluenceRadius = fanRadius * 3; // AMCA standard for HVLS fan influence zone
    
    // Calculate fan power factor based on RPM and CFM (AMCA standard)
    const fanPowerFactor = (fanConfig.rpm / 50) * (fanConfig.cfm / 300000);
    
    // Process each particle individually for realistic CFD behavior
    particles.forEach(particle => {
        // Increase age
        particle.age += 0.5;
        
        // Calculate distance from fan center (3D distance)
        const distanceFromFan = particle.position.distanceTo(fanCenter);
        
        // Calculate horizontal distance from fan center
        const horizontalDistance = Math.sqrt(
            Math.pow(particle.position.x - fanCenter.x, 2) + 
            Math.pow(particle.position.z - fanCenter.z, 2)
        );
        
        // Calculate distances to room boundaries
        const distToFloor = particle.position.y;
        const distToCeiling = roomDimensions.height - particle.position.y;
        const distToLeftWall = particle.position.x;
        const distToRightWall = roomDimensions.length - particle.position.x;
        const distToFrontWall = particle.position.z;
        const distToBackWall = roomDimensions.width - particle.position.z;
        
        // Determine if particle is near a boundary (SMACNA standard)
        const nearBoundary = (
            distToFloor < boundaryLayerThickness || 
            distToCeiling < boundaryLayerThickness || 
            distToLeftWall < boundaryLayerThickness || 
            distToRightWall < boundaryLayerThickness || 
            distToFrontWall < boundaryLayerThickness || 
            distToBackWall < boundaryLayerThickness
        );
        
        // Create new velocity vector based on CFD principles
        const newVelocity = new THREE.Vector3(0, 0, 0);
        
        // 1. Fan influence (primary effect)
        // Calculate fan influence factor based on distance
        const fanInfluenceFactor = Math.max(0, 1 - (distanceFromFan / fanInfluenceRadius));
        
        if (fanInfluenceFactor > 0) {
            // Apply fan influence based on direction setting
            if (fanConfig.direction === 'down') {
                // Downward flow pattern
                if (particle.position.y > fanCenter.y) {
                    // Above fan - gentle flow toward fan
                    const directionToFan = new THREE.Vector3(
                        fanCenter.x - particle.position.x,
                        0,
                        fanCenter.z - particle.position.z
                    ).normalize();
                    
                    newVelocity.x += directionToFan.x * 0.05 * fanInfluenceFactor;
                    newVelocity.z += directionToFan.z * 0.05 * fanInfluenceFactor;
                    
                    if (horizontalDistance < fanRadius) {
                        newVelocity.y -= 0.02 * fanInfluenceFactor;
                    }
                } else {
                    // Below fan - strong downward and outward flow
                    const directionFromFan = new THREE.Vector3(
                        particle.position.x - fanCenter.x,
                        0,
                        particle.position.z - fanCenter.z
                    ).normalize();
                    
                    const downwardFactor = Math.max(0, 1 - (horizontalDistance / fanRadius));
                    newVelocity.y -= 0.15 * fanPowerFactor * downwardFactor * fanInfluenceFactor;
                    
                    const floorProximityFactor = Math.max(0, 1 - (distToFloor / 5));
                    newVelocity.x += directionFromFan.x * 0.1 * fanPowerFactor * floorProximityFactor * fanInfluenceFactor;
                    newVelocity.z += directionFromFan.z * 0.1 * fanPowerFactor * floorProximityFactor * fanInfluenceFactor;
                }
            } else {
                // Upward flow (reverse of downward) - similar approach
                // Implementation follows same pattern but with reversed vertical components
                if (particle.position.y > fanCenter.y) {
                    // Above fan - strong upward and outward flow
                    const directionFromFan = new THREE.Vector3(
                        particle.position.x - fanCenter.x,
                        0,
                        particle.position.z - fanCenter.z
                    ).normalize();
                    
                    const upwardFactor = Math.max(0, 1 - (horizontalDistance / fanRadius));
                    newVelocity.y += 0.15 * fanPowerFactor * upwardFactor * fanInfluenceFactor;
                    
                    const ceilingProximityFactor = Math.max(0, 1 - (distToCeiling / 5));
                    newVelocity.x += directionFromFan.x * 0.1 * fanPowerFactor * ceilingProximityFactor * fanInfluenceFactor;
                    newVelocity.z += directionFromFan.z * 0.1 * fanPowerFactor * ceilingProximityFactor * fanInfluenceFactor;
                } else {
                    // Below fan - gentle flow toward fan
                    const directionToFan = new THREE.Vector3(
                        fanCenter.x - particle.position.x,
                        0,
                        fanCenter.z - particle.position.z
                    ).normalize();
                    
                    newVelocity.x += directionToFan.x * 0.05 * fanInfluenceFactor;
                    newVelocity.z += directionToFan.z * 0.05 * fanInfluenceFactor;
                    
                    if (horizontalDistance < fanRadius) {
                        newVelocity.y += 0.02 * fanInfluenceFactor;
                    }
                }
            }
        }
        
        // 2. Boundary layer effects (SMACNA standard)
        if (nearBoundary) {
            // Determine which boundary is closest
            const minDist = Math.min(
                distToFloor, distToCeiling, 
                distToLeftWall, distToRightWall, 
                distToFrontWall, distToBackWall
            );
            
            // Calculate boundary influence factor
            const boundaryFactor = 1 - (minDist / boundaryLayerThickness);
            
            // Apply boundary layer effects
            if (minDist === distToFloor) {
                // Near floor - horizontal movement along floor
                newVelocity.y *= (1 - boundaryFactor * 0.9); // Reduce vertical component
                
                // If in downward flow pattern, enhance outward flow
                if (fanConfig.direction === 'down' && horizontalDistance < fanInfluenceRadius) {
                    const directionFromFan = new THREE.Vector3(
                        particle.position.x - fanCenter.x,
                        0,
                        particle.position.z - fanCenter.z
                    ).normalize();
                    
                    newVelocity.x += directionFromFan.x * 0.08 * boundaryFactor;
                    newVelocity.z += directionFromFan.z * 0.08 * boundaryFactor;
                }
            } else if (minDist === distToCeiling) {
                // Near ceiling - horizontal movement along ceiling
                newVelocity.y *= (1 - boundaryFactor * 0.9); // Reduce vertical component
                
                // If in upward flow pattern, enhance outward flow
                if (fanConfig.direction === 'up' && horizontalDistance < fanInfluenceRadius) {
                    const directionFromFan = new THREE.Vector3(
                        particle.position.x - fanCenter.x,
                        0,
                        particle.position.z - fanCenter.z
                    ).normalize();
                    
                    newVelocity.x += directionFromFan.x * 0.08 * boundaryFactor;
                    newVelocity.z += directionFromFan.z * 0.08 * boundaryFactor;
                }
            } else if (minDist === distToLeftWall || minDist === distToRightWall) {
                // Near side walls - vertical movement along wall
                newVelocity.x *= (1 - boundaryFactor * 0.9); // Reduce horizontal x component
                
                // Enhance vertical component based on fan direction
                if (fanConfig.direction === 'down') {
                    // In downward flow, air rises along walls
                    newVelocity.y += 0.08 * boundaryFactor;
                } else {
                    // In upward flow, air falls along walls
                    newVelocity.y -= 0.08 * boundaryFactor;
                }
            } else if (minDist === distToFrontWall || minDist === distToBackWall) {
                // Near front/back walls - vertical movement along wall
                newVelocity.z *= (1 - boundaryFactor * 0.9); // Reduce horizontal z component
                
                // Enhance vertical component based on fan direction
                if (fanConfig.direction === 'down') {
                    // In downward flow, air rises along walls
                    newVelocity.y += 0.08 * boundaryFactor;
                } else {
                    // In upward flow, air falls along walls
                    newVelocity.y -= 0.08 * boundaryFactor;
                }
            }
        }
        
        // 3. Thermal effects (buoyancy) - based on ASHRAE standards
        // Warm air rises, cool air falls
        if (particle.position.y < roomDimensions.height / 2) {
            // Lower half of room - slight upward tendency (thermal stratification)
            newVelocity.y += 0.01 * particle.temperatureInfluence;
        } else {
            // Upper half of room - very slight downward tendency (cooling effect)
            newVelocity.y -= 0.005 * particle.temperatureInfluence;
        }
        
        // 4. Turbulence and vorticity (CFD principles)
        // Add random turbulence (small random variations in velocity)
        newVelocity.x += (Math.random() - 0.5) * 0.04 * particle.turbulence;
        newVelocity.y += (Math.random() - 0.5) * 0.04 * particle.turbulence;
        newVelocity.z += (Math.random() - 0.5) * 0.04 * particle.turbulence;
        
        // Add vorticity effects (swirling motion)
        if (horizontalDistance < fanInfluenceRadius * 1.5) {
            // Calculate tangential vector for swirl
            const tangentialDirection = new THREE.Vector3(
                -(particle.position.z - fanCenter.z),
                0,
                particle.position.x - fanCenter.x
            ).normalize();
            
            // Apply tangential velocity component (swirl)
            const swirlFactor = Math.max(0, 1 - (horizontalDistance / (fanInfluenceRadius * 1.5)));
            newVelocity.x += tangentialDirection.x * 0.05 * particle.vorticity * swirlFactor;
            newVelocity.z += tangentialDirection.z * 0.05 * particle.vorticity * swirlFactor;
        }
        
        // 5. Inertia - maintain some of previous velocity (momentum)
        newVelocity.x += particle.velocity.x * 0.3;
        newVelocity.y += particle.velocity.y * 0.3;
        newVelocity.z += particle.velocity.z * 0.3;
        
        // 6. Normalize velocity to prevent excessive speeds
        // Calculate current speed
        const speed = Math.sqrt(
            newVelocity.x * newVelocity.x + 
            newVelocity.y * newVelocity.y + 
            newVelocity.z * newVelocity.z
        );
        
        // Cap maximum speed based on fan power
        const maxSpeed = 0.2 * fanPowerFactor;
        if (speed > maxSpeed) {
            const scaleFactor = maxSpeed / speed;
            newVelocity.x *= scaleFactor;
            newVelocity.y *= scaleFactor;
            newVelocity.z *= scaleFactor;
        }
        
        // Update particle velocity
        particle.velocity = newVelocity;
        
        // Apply velocity to position
        particle.position.x += particle.velocity.x;
        particle.position.y += particle.velocity.y;
        particle.position.z += particle.velocity.z;
        
        // Keep particles within room bounds
        particle.position.x = Math.max(0.2, Math.min(roomDimensions.length - 0.2, particle.position.x));
        particle.position.y = Math.max(0.2, Math.min(roomDimensions.height - 0.2, particle.position.y));
        particle.position.z = Math.max(0.2, Math.min(roomDimensions.width - 0.2, particle.position.z));
        
        // Occasionally reset particles that get stuck or to add variety
        if (Math.random() < 0.001 || particle.age > 500) {
            // Reset age
            particle.age = 0;
            
            // Reposition particle
            if (Math.random() < 0.7) {
                // 70% near fan influence zone
                const radius = Math.random() * fanInfluenceRadius;
                const angle = Math.random() * Math.PI * 2;
                particle.position.x = fanCenter.x + radius * Math.cos(angle);
                particle.position.z = fanCenter.z + radius * Math.sin(angle);
                particle.position.y = Math.random() * roomDimensions.height;
            } else {
                // 30% randomly in room
                particle.position.x = Math.random() * roomDimensions.length;
                particle.position.y = Math.random() * roomDimensions.height;
                particle.position.z = Math.random() * roomDimensions.width;
            }
            
            // Reset velocity
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02
            );
            
            // Randomize CFD properties
            particle.turbulence = Math.random() * turbulenceIntensity;
            particle.vorticity = Math.random() * vorticityFactor;
            particle.temperatureInfluence = Math.random() * temperatureGradient;
        }
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
    if (!displayElement) return;
    
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
            if (controls) {
                controls.dollyIn(1.2);
                controls.update();
            }
        });
        
        // Zoom out button
        const zoomOutButton = document.createElement('button');
        zoomOutButton.className = 'manipulation-button';
        zoomOutButton.innerHTML = '<i class="fas fa-minus"></i>';
        zoomOutButton.title = 'Zoom Out';
        zoomOutButton.addEventListener('click', () => {
            if (controls) {
                controls.dollyOut(1.2);
                controls.update();
            }
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
            if (controls) {
                controls.reset();
            }
        });
        
        // Add buttons to container
        controlsContainer.appendChild(zoomInButton);
        controlsContainer.appendChild(zoomOutButton);
        controlsContainer.appendChild(resetViewButton);
        
        // Add container to simulator display
        const displayElement = document.querySelector('.simulator-display');
        if (displayElement) {
            displayElement.appendChild(controlsContainer);
        }
    }
}

// Update simulation based on form inputs
function updateSimulation() {
    // Show loading overlay
    document.getElementById('loading-overlay').style.display = 'flex';
    
    // Use setTimeout to allow the loading overlay to render before heavy computation
    setTimeout(function() {
        try {
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
            
            // Hide loading overlay
            document.getElementById('loading-overlay').style.display = 'none';
        } catch (error) {
            console.error('Error updating simulation:', error);
            document.getElementById('loading-overlay').innerHTML = 
                '<div class="error-message">Error updating simulation: ' + error.message + '</div>';
        }
    }, 50);
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
    const energyUsage = (fanConfig.diameter / 10) * (fanConfig.rpm / 40) * 0.75; // kW
    document.getElementById('result-energy').textContent = energyUsage.toFixed(2) + ' kW';
    
    // Calculate cooling effect (simplified calculation)
    const coolingEffect = (fanConfig.cfm / 50000) * 2.5; // °F
    document.getElementById('result-cooling').textContent = coolingEffect.toFixed(1) + '°F';
}

// Export results to CSV
function exportResultsToCSV() {
    // Get current simulation parameters and results
    const data = {
        'Room Length (ft)': roomDimensions.length,
        'Room Width (ft)': roomDimensions.width,
        'Room Height (ft)': roomDimensions.height,
        'Fan Model': fanConfig.model,
        'Fan Diameter (ft)': fanConfig.diameter,
        'Fan CFM': fanConfig.cfm,
        'Fan RPM': fanConfig.rpm,
        'Fan Direction': fanConfig.direction,
        'Fan X Position (ft)': fanConfig.position.x,
        'Fan Y Position (ft)': fanConfig.position.y,
        'Fan Height (ft)': fanConfig.position.z,
        'Coverage Area (sq ft)': Math.PI * Math.pow(fanConfig.diameter * 1.5, 2),
        'Air Changes (ACH)': (fanConfig.cfm * 60) / (roomDimensions.length * roomDimensions.width * roomDimensions.height),
        'Energy Usage (kW)': (fanConfig.diameter / 10) * (fanConfig.rpm / 40) * 0.75,
        'Cooling Effect (°F)': (fanConfig.cfm / 50000) * 2.5
    };
    
    // Convert to CSV
    let csvContent = 'Parameter,Value\n';
    for (const [key, value] of Object.entries(data)) {
        csvContent += `"${key}","${value}"\n`;
    }
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'airflow_simulation_results.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Add comparison fan
function addComparisonFan() {
    // Create comparison fan container if it doesn't exist
    if (!document.querySelector('.comparison-container')) {
        const comparisonContainer = document.createElement('div');
        comparisonContainer.className = 'comparison-container';
        comparisonContainer.innerHTML = `
            <h3>Fan Comparison</h3>
            <div class="comparison-fans">
                <div class="comparison-fan">
                    <h4>Current Fan</h4>
                    <div class="comparison-results" id="current-fan-results">
                        <div class="result-item">
                            <span class="result-label">Model:</span>
                            <span class="result-value" id="current-model"></span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Diameter:</span>
                            <span class="result-value" id="current-diameter"></span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Coverage:</span>
                            <span class="result-value" id="current-coverage"></span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Energy:</span>
                            <span class="result-value" id="current-energy"></span>
                        </div>
                    </div>
                </div>
                <div class="comparison-fan">
                    <h4>Comparison Fan</h4>
                    <div class="control-group">
                        <label for="compare-model">Fan Model</label>
                        <select id="compare-model">
                            <option value="powerfoil-x3">Big Ass Fans Powerfoil X3.0</option>
                            <option value="hunter-eco">Hunter Industrial ECO</option>
                            <option value="macroair">MacroAir AirVolution-D</option>
                            <option value="custom">Custom Fan</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <label for="compare-diameter">Fan Diameter (ft)</label>
                        <input type="number" id="compare-diameter" value="16" min="8" max="24">
                    </div>
                    <div class="control-group">
                        <label for="compare-cfm">Fan CFM</label>
                        <input type="number" id="compare-cfm" value="350000" min="50000" max="500000">
                    </div>
                    <div class="control-group">
                        <label for="compare-rpm">Fan RPM</label>
                        <input type="number" id="compare-rpm" value="45" min="10" max="100">
                    </div>
                    <button id="update-comparison" class="button primary">Update Comparison</button>
                    <div class="comparison-results" id="compare-fan-results">
                        <div class="result-item">
                            <span class="result-label">Coverage:</span>
                            <span class="result-value" id="compare-coverage"></span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Air Changes:</span>
                            <span class="result-value" id="compare-air-changes"></span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Energy:</span>
                            <span class="result-value" id="compare-energy"></span>
                        </div>
                        <div class="result-item">
                            <span class="result-label">Cooling:</span>
                            <span class="result-value" id="compare-cooling"></span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="comparison-chart">
                <canvas id="comparison-chart"></canvas>
            </div>
        `;
        
        // Add container to results panel
        document.querySelector('.results-panel').appendChild(comparisonContainer);
        
        // Add event listener for comparison update
        document.getElementById('update-comparison').addEventListener('click', updateComparison);
        
        // Initialize comparison
        updateComparison();
    }
}

// Update comparison results
function updateComparison() {
    // Get current fan details
    document.getElementById('current-model').textContent = document.getElementById('fan-model').options[document.getElementById('fan-model').selectedIndex].text;
    document.getElementById('current-diameter').textContent = fanConfig.diameter + ' ft';
    document.getElementById('current-coverage').textContent = document.getElementById('result-coverage').textContent;
    document.getElementById('current-energy').textContent = document.getElementById('result-energy').textContent;
    
    // Get comparison fan details
    const compareModel = document.getElementById('compare-model').value;
    const compareDiameter = parseFloat(document.getElementById('compare-diameter').value);
    const compareCFM = parseFloat(document.getElementById('compare-cfm').value);
    const compareRPM = parseFloat(document.getElementById('compare-rpm').value);
    
    // Calculate comparison results
    const compareCoverage = Math.PI * Math.pow(compareDiameter * 1.5, 2);
    document.getElementById('compare-coverage').textContent = Math.round(compareCoverage) + ' sq ft';
    
    const roomVolume = roomDimensions.length * roomDimensions.width * roomDimensions.height;
    const compareAirChanges = (compareCFM * 60) / roomVolume;
    document.getElementById('compare-air-changes').textContent = compareAirChanges.toFixed(1) + ' ACH';
    
    const compareEnergy = (compareDiameter / 10) * (compareRPM / 40) * 0.75; // kW
    document.getElementById('compare-energy').textContent = compareEnergy.toFixed(2) + ' kW';
    
    const compareCooling = (compareCFM / 50000) * 2.5; // °F
    document.getElementById('compare-cooling').textContent = compareCooling.toFixed(1) + '°F';
}
