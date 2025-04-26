// Add event listeners for export and comparison features
document.addEventListener('DOMContentLoaded', function() {
    // Export results button
    const exportButton = document.getElementById('export-results');
    if (exportButton) {
        exportButton.addEventListener('click', exportResultsToCSV);
    }
    
    // Compare fans button
    const compareButton = document.getElementById('compare-fans');
    if (compareButton) {
        compareButton.addEventListener('click', function() {
            const comparisonSection = document.getElementById('comparison-section');
            if (comparisonSection.style.display === 'none') {
                // Initialize comparison section
                initializeComparisonSection();
                comparisonSection.style.display = 'block';
                this.innerHTML = '<i class="fas fa-times"></i> Hide Comparison';
            } else {
                comparisonSection.style.display = 'none';
                this.innerHTML = '<i class="fas fa-exchange-alt"></i> Compare Fans';
            }
        });
    }
});

// Export results to CSV
function exportResultsToCSV() {
    // Show loading overlay during export
    document.getElementById('loading-overlay').style.display = 'flex';
    document.getElementById('loading-overlay').innerHTML = 
        '<div class="spinner"></div><div>Generating export file...</div>';
    
    // Use setTimeout to allow the loading overlay to render before processing
    setTimeout(function() {
        try {
            // Get current simulation parameters and results
            const data = {
                'Room Length (ft)': roomDimensions.length,
                'Room Width (ft)': roomDimensions.width,
                'Room Height (ft)': roomDimensions.height,
                'Fan Model': document.getElementById('fan-model').options[document.getElementById('fan-model').selectedIndex].text,
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
                'Cooling Effect (°F)': (fanConfig.cfm / 50000) * 2.5,
                'Date Generated': new Date().toLocaleString()
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
            
            // Hide loading overlay
            document.getElementById('loading-overlay').style.display = 'none';
            
            // Show success message
            const resultsPanel = document.querySelector('.results-panel');
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.textContent = 'Results exported successfully!';
            successMessage.style.color = '#28a745';
            successMessage.style.marginTop = '10px';
            successMessage.style.textAlign = 'center';
            resultsPanel.appendChild(successMessage);
            
            // Remove success message after 3 seconds
            setTimeout(function() {
                resultsPanel.removeChild(successMessage);
            }, 3000);
            
        } catch (error) {
            console.error('Error exporting results:', error);
            document.getElementById('loading-overlay').innerHTML = 
                '<div class="error-message">Error exporting results: ' + error.message + '</div>';
            
            // Hide error message after 3 seconds
            setTimeout(function() {
                document.getElementById('loading-overlay').style.display = 'none';
            }, 3000);
        }
    }, 50);
}

// Initialize comparison section
function initializeComparisonSection() {
    const comparisonSection = document.getElementById('comparison-section');
    
    // Create comparison content if it doesn't exist
    if (!comparisonSection.querySelector('.comparison-container')) {
        comparisonSection.innerHTML = `
            <div class="comparison-container">
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
            </div>
        `;
        
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
    const compareModelText = document.getElementById('compare-model').options[document.getElementById('compare-model').selectedIndex].text;
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
    
    // Create comparison chart
    createComparisonChart(
        document.getElementById('fan-model').options[document.getElementById('fan-model').selectedIndex].text,
        compareModelText,
        Math.round(Math.PI * Math.pow(fanConfig.diameter * 1.5, 2)),
        Math.round(compareCoverage),
        (fanConfig.cfm * 60) / roomVolume,
        compareAirChanges,
        (fanConfig.diameter / 10) * (fanConfig.rpm / 40) * 0.75,
        compareEnergy,
        (fanConfig.cfm / 50000) * 2.5,
        compareCooling
    );
}

// Create comparison chart
function createComparisonChart(fan1Name, fan2Name, coverage1, coverage2, airChanges1, airChanges2, energy1, energy2, cooling1, cooling2) {
    const ctx = document.getElementById('comparison-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.comparisonChart) {
        window.comparisonChart.destroy();
    }
    
    // Create new chart
    window.comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Coverage (sq ft)', 'Air Changes (ACH)', 'Energy (kW)', 'Cooling (°F)'],
            datasets: [
                {
                    label: fan1Name,
                    data: [coverage1, airChanges1, energy1, cooling1],
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: fan2Name,
                    data: [coverage2, airChanges2, energy2, cooling2],
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
