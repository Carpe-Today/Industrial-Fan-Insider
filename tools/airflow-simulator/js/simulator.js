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
        color: 0x3498db
    },
    'hunter-eco': {
        name: 'Hunter Industrial ECO',
        maxDiameter: 14,
        maxCFM: 160000,
        powerConsumption: 0.75, // kW
        color: 0x2ecc71
    },
    'macroair': {
        name: 'MacroAir AirVolution-D',
        maxDiameter: 20,
        maxCFM: 240000,
        powerConsumption: 1.0, // kW
        color: 0xe74c3c
    },
    'custom': {
        name: 'Custom Fan',
        maxDiameter: 24,
        maxCFM: 400000,
        powerConsumption: 1.5, // kW
        color: 0xf39c12
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

// Create the fan
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
    
    // Fan model color
    const fanColor = fanModels[params.fanModel].color;
    
    // Create fan body
    const bodyGeometry = new THREE.CylinderGeometry(diameter/10, diameter/10, diameter/5, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    fan.add(body);
    
    // Create fan blades
    const bladeCount = 6;
    const bladeGeometry = new THREE.BoxGeometry(diameter/2, diameter/40, diameter/8);
    const bladeMaterial = new THREE.MeshStandardMaterial({ color: fanColor });
    
    for (let i = 0; i < bladeCount; i++) {
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.x = diameter/4;
        blade.rotation.y = (i / bladeCount) * Math.PI * 2;
        blade.castShadow = true;
        body.add(blade);
    }
    
    // Create mounting bracket
    const bracketGeometry = new THREE.CylinderGeometry(diameter/20, diameter/20, diameter/2, 8);
    const bracketMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const bracket = new THREE.Mesh(bracketGeometry, bracketMaterial);
    bracket.position.y = diameter/4;
    bracket.rotation.x = Math.PI / 2;
    bracket.castShadow = true;
    fan.add(bracket);
    
    // Position fan
    fan.position.set(x, y, z);
    
    // Rotate fan based on direction
    if (params.fanDirection === 'up') {
        fan.rotation.x = Math.PI;
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
        fan.children[0].rotation.y += rotationSpeed;
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
        
        // Update particle color based on height (temperature gradient)
        const heightRatio = position.array[1] / roomHeight;
        const color = new THREE.Color();
        if (params.fanDirection === 'down') {
            // Blue (cool) at top, red (warm) at bottom
            color.setHSL(0.6 - heightRatio * 0.6, 1, 0.5);
        } else {
            // Red (warm) at top, blue (cool) at bottom
            color.setHSL(heightRatio * 0.6, 1, 0.5);
        }
        particle.material.color = color;
        
        // Mark position attribute as needing update
        position.needsUpdate = true;
    }
}

// Animation loop
function animate() {
    if (!isPlaying) return;
    
    animationId = requestAnimationFrame(animate);
    
    // Animate particles
    animateParticles();
    
    // Render scene
    renderer.render(scene, camera);
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
}

// Calculate simulation results
function calculateResults() {
    // Calculate coverage area (sq ft)
    params.coverageArea = Math.PI * Math.pow(params.fanDiameter * 2, 2);
    
    // Calculate air changes per hour
    const roomVolume = params.roomLength * params.roomWidth * params.roomHeight; // cubic feet
    params.airChanges = (params.fanCFM * 60) / roomVolume;
    
    // Calculate energy usage (kW/h)
    params.energyUsage = fanModels[params.fanModel].powerConsumption;
    
    // Calculate cooling effect (°F)
    // This is a simplified model - actual cooling effect depends on many factors
    const coverageRatio = Math.min(params.coverageArea / (params.roomLength * params.roomWidth), 1);
    params.coolingEffect = 10 * coverageRatio * (params.fanRPM / 100);
}

// Update UI with simulation results
function updateResultsUI() {
    document.getElementById('coverage-area').textContent = Math.round(params.coverageArea) + ' sq ft';
    document.getElementById('air-changes').textContent = params.airChanges.toFixed(1);
    document.getElementById('energy-usage').textContent = params.energyUsage.toFixed(1) + ' kW/h';
    document.getElementById('cooling-effect').textContent = params.coolingEffect.toFixed(1) + '°F';
    
    // Update observations
    const observations = document.getElementById('simulation-observations');
    observations.innerHTML = '';
    
    // Add observations based on results
    const roomArea = params.roomLength * params.roomWidth;
    const coverageRatio = params.coverageArea / roomArea;
    
    let observationItems = [];
    
    if (coverageRatio < 0.3) {
        observationItems.push('The fan provides limited coverage for this room size');
    } else if (coverageRatio < 0.7) {
        observationItems.push('The fan provides good coverage for the central area of the room');
    } else {
        observationItems.push('The fan provides excellent coverage for most of the room');
    }
    
    if (params.airChanges < 3) {
        observationItems.push('Air circulation is below recommended levels for industrial spaces');
    } else if (params.airChanges < 6) {
        observationItems.push('Air circulation is adequate for most industrial applications');
    } else {
        observationItems.push('Air circulation is excellent, exceeding recommended levels');
    }
    
    if (params.fanHeight < params.roomHeight * 0.6) {
        observationItems.push('Fan height is lower than optimal, consider raising it for better circulation');
    }
    
    if (Math.abs(params.fanX - params.roomLength/2) > params.roomLength * 0.3 || 
        Math.abs(params.fanY - params.roomWidth/2) > params.roomWidth * 0.3) {
        observationItems.push('Fan is positioned away from room center, which may create uneven airflow');
    }
    
    observationItems.push(`The current setup achieves approximately ${params.airChanges.toFixed(1)} air changes per hour`);
    observationItems.push(`Estimated cooling effect is approximately ${params.coolingEffect.toFixed(1)}°F (perceived temperature reduction)`);
    
    // Add observations to UI
    observationItems.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        observations.appendChild(li);
    });
    
    // Update recommended fans
    updateRecommendedFans();
}

// Update recommended fans based on room size
function updateRecommendedFans() {
    const recommendedFansDiv = document.querySelector('.recommended-fans');
    recommendedFansDiv.innerHTML = '';
    
    const roomArea = params.roomLength * params.roomWidth;
    
    // Determine best fan models based on room size
    let recommendations = [];
    
    if (roomArea < 2500) {
        recommendations.push({
            model: 'hunter-eco',
            reason: 'Ideal for smaller spaces'
        });
        recommendations.push({
            model: 'macroair',
            reason: 'Provides excellent coverage for this room size'
        });
    } else if (roomArea < 5000) {
        recommendations.push({
            model: 'powerfoil-x3',
            reason: 'Ideal for your space configuration'
        });
        recommendations.push({
            model: 'macroair',
            reason: 'Energy-efficient alternative'
        });
    } else {
        recommendations.push({
            model: 'powerfoil-x3',
            reason: 'Powerful option for large spaces'
        });
        recommendations.push({
            model: 'custom',
            reason: 'Maximum coverage for large facilities'
        });
    }
    
    // Create recommendation elements
    recommendations.forEach(rec => {
        const fanModel = fanModels[rec.model];
        const div = document.createElement('div');
        div.className = 'recommended-fan-item mb-3';
        div.innerHTML = `
            <h4 class="h5">${fanModel.name}</h4>
            <p class="small mb-2">${rec.reason}</p>
            <a href="../../reviews/${rec.model.replace('-', '-')}.html" class="btn btn-sm btn-outline-primary">View Review</a>
            <a href="https://www.amazon.com/dp/B07XYZ${Math.random().toString(36).substring(2, 7).toUpperCase()}" class="btn btn-sm btn-primary" target="_blank" rel="nofollow noopener">Buy Now</a>
        `;
        recommendedFansDiv.appendChild(div);
    });
}

// Helper functions
function getAspectRatio() {
    return getCanvasWidth() / getCanvasHeight();
}

function getCanvasWidth() {
    return document.getElementById('simulator-canvas-container').clientWidth;
}

function getCanvasHeight() {
    return document.getElementById('simulator-canvas-container').clientHeight;
}

// Event listeners
function addEventListeners() {
    // Run simulation button
    document.getElementById('run-simulation').addEventListener('click', function() {
        // Stop current animation
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        
        // Reinitialize simulation
        init();
    });
    
    // Reset simulation button
    document.getElementById('reset-simulation').addEventListener('click', function() {
        // Reset form to default values
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
        
        // Run simulation with default values
        document.getElementById('run-simulation').click();
    });
    
    // View buttons
    document.getElementById('view-top').addEventListener('click', function() {
        currentView = 'top';
        setCamera(currentView);
        
        // Update active button
        document.querySelectorAll('.view-controls button').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
    });
    
    document.getElementById('view-side').addEventListener('click', function() {
        currentView = 'side';
        setCamera(currentView);
        
        // Update active button
        document.querySelectorAll('.view-controls button').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
    });
    
    document.getElementById('view-3d').addEventListener('click', function() {
        currentView = '3d';
        setCamera(currentView);
        
        // Update active button
        document.querySelectorAll('.view-controls button').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
    });
    
    // Play/pause button
    document.getElementById('play-pause').addEventListener('click', function() {
        isPlaying = !isPlaying;
        
        // Update button icon
        this.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        
        // Start or stop animation
        if (isPlaying) {
            animate();
        } else if (animationId) {
            cancelAnimationFrame(animationId);
        }
    });
    
    // Fullscreen button
    document.getElementById('fullscreen').addEventListener('click', function() {
        const container = document.getElementById('simulator-canvas-container');
        
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    });
    
    // Save image button
    document.getElementById('save-image').addEventListener('click', function() {
        const canvas = document.getElementById('simulator-canvas');
        const link = document.createElement('a');
        link.download = 'industrial-fan-simulation.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
    
    // Share simulation button
    document.getElementById('share-simulation').addEventListener('click', function() {
        // Create URL with parameters
        const baseUrl = window.location.href.split('?')[0];
        const params = new URLSearchParams();
        params.append('roomLength', document.getElementById('room-length').value);
        params.append('roomWidth', document.getElementById('room-width').value);
        params.append('roomHeight', document.getElementById('room-height').value);
        params.append('fanModel', document.getElementById('fan-model').value);
        params.append('fanDiameter', document.getElementById('fan-diameter').value);
        params.append('fanCFM', document.getElementById('fan-cfm').value);
        params.append('fanRPM', document.getElementById('fan-rpm').value);
        params.append('fanDirection', document.getElementById('fan-direction').value);
        params.append('fanX', document.getElementById('fan-x').value);
        params.append('fanY', document.getElementById('fan-y').value);
        params.append('fanHeight', document.getElementById('fan-height').value);
        
        const shareUrl = `${baseUrl}?${params.toString()}`;
        
        // Copy to clipboard
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('Simulation URL copied to clipboard!');
        }).catch(err => {
            console.error('Could not copy URL: ', err);
            alert('Could not copy URL. Please copy this manually:\n\n' + shareUrl);
        });
    });
    
    // Fan model selection change
    document.getElementById('fan-model').addEventListener('change', function() {
        const model = fanModels[this.value];
        
        // Update max values
        document.getElementById('fan-diameter').max = model.maxDiameter;
        document.getElementById('fan-cfm').max = model.maxCFM;
        
        // If current values exceed max, adjust them
        if (parseFloat(document.getElementById('fan-diameter').value) > model.maxDiameter) {
            document.getElementById('fan-diameter').value = model.maxDiameter;
        }
        
        if (parseFloat(document.getElementById('fan-cfm').value) > model.maxCFM) {
            document.getElementById('fan-cfm').value = model.maxCFM;
        }
    });
    
    // Window resize event
    window.addEventListener('resize', function() {
        camera.aspect = getAspectRatio();
        camera.updateProjectionMatrix();
        renderer.setSize(getCanvasWidth(), getCanvasHeight());
    });
    
    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('roomLength')) {
        // Set form values from URL parameters
        document.getElementById('room-length').value = urlParams.get('roomLength');
        document.getElementById('room-width').value = urlParams.get('roomWidth');
        document.getElementById('room-height').value = urlParams.get('roomHeight');
        document.getElementById('fan-model').value = urlParams.get('fanModel');
        document.getElementById('fan-diameter').value = urlParams.get('fanDiameter');
        document.getElementById('fan-cfm').value = urlParams.get('fanCFM');
        document.getElementById('fan-rpm').value = urlParams.get('fanRPM');
        document.getElementById('fan-direction').value = urlParams.get('fanDirection');
        document.getElementById('fan-x').value = urlParams.get('fanX');
        document.getElementById('fan-y').value = urlParams.get('fanY');
        document.getElementById('fan-height').value = urlParams.get('fanHeight');
    }
}

// Initialize simulation when page loads
window.addEventListener('load', init);
