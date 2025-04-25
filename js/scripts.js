// Main JavaScript for Industrial Airflow Solutions

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });

    // Add animation classes to elements when they come into view
    const animateOnScroll = function() {
        const elements = document.querySelectorAll('.animate-on-scroll');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementPosition < windowHeight - 50) {
                const animationClass = element.dataset.animation || 'fade-in';
                element.classList.add(animationClass);
                element.classList.remove('animate-on-scroll');
            }
        });
    };

    // Run animation check on load and scroll
    animateOnScroll();
    window.addEventListener('scroll', animateOnScroll);

    // Fan comparison functionality
    const compareCheckboxes = document.querySelectorAll('.compare-checkbox');
    const compareButton = document.getElementById('compare-fans-button');
    
    if (compareCheckboxes.length > 0 && compareButton) {
        compareCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const checkedBoxes = document.querySelectorAll('.compare-checkbox:checked');
                
                if (checkedBoxes.length >= 2) {
                    compareButton.classList.remove('disabled');
                } else {
                    compareButton.classList.add('disabled');
                }
                
                // Update counter if it exists
                const counter = document.getElementById('compare-counter');
                if (counter) {
                    counter.textContent = checkedBoxes.length;
                }
            });
        });
        
        // Handle compare button click
        compareButton.addEventListener('click', function(e) {
            const checkedBoxes = document.querySelectorAll('.compare-checkbox:checked');
            
            if (checkedBoxes.length < 2) {
                e.preventDefault();
                alert('Please select at least 2 fans to compare.');
            } else {
                // Build the comparison URL with selected fan IDs
                let fanIds = [];
                checkedBoxes.forEach(box => {
                    fanIds.push(box.value);
                });
                
                const compareUrl = '/compare-fans?' + fanIds.map(id => 'id=' + id).join('&');
                window.location.href = compareUrl;
            }
        });
    }

    // ROI Calculator functionality
    const roiForm = document.getElementById('roi-calculator-form');
    
    if (roiForm) {
        roiForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const facilitySize = parseFloat(document.getElementById('facility-size').value);
            const ceilingHeight = parseFloat(document.getElementById('ceiling-height').value);
            const energyCost = parseFloat(document.getElementById('energy-cost').value);
            const hvacUsage = parseFloat(document.getElementById('hvac-usage').value);
            
            // Perform calculations
            const estimatedSavings = calculateROI(facilitySize, ceilingHeight, energyCost, hvacUsage);
            
            // Display results
            const resultsContainer = document.getElementById('roi-results');
            resultsContainer.innerHTML = `
                <div class="alert alert-success">
                    <h4>Estimated Annual Savings</h4>
                    <p class="display-4">$${estimatedSavings.toFixed(2)}</p>
                    <p>Based on your facility specifications, implementing industrial fans could save you approximately $${estimatedSavings.toFixed(2)} per year in energy costs.</p>
                    <a href="#" class="btn btn-primary">View Recommended Fans</a>
                </div>
            `;
            
            resultsContainer.classList.remove('d-none');
        });
    }

    // Simple ROI calculation function
    function calculateROI(facilitySize, ceilingHeight, energyCost, hvacUsage) {
        // This is a simplified calculation for demonstration
        // In a real implementation, this would be more sophisticated
        const baseEfficiency = 0.25; // 25% efficiency improvement
        const sizeFactor = facilitySize / 10000; // Scale based on facility size
        const heightFactor = ceilingHeight / 20; // Scale based on ceiling height
        
        // Calculate estimated annual savings
        const annualUsage = hvacUsage * 12; // Monthly to annual
        const savingsRate = baseEfficiency * sizeFactor * heightFactor;
        const annualSavings = annualUsage * energyCost * savingsRate;
        
        return annualSavings;
    }

    // Newsletter signup validation
    const newsletterForm = document.getElementById('newsletter-form');
    
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const emailInput = document.getElementById('newsletter-email');
            const email = emailInput.value.trim();
            
            if (validateEmail(email)) {
                // Success - would normally submit to server
                const formContainer = document.getElementById('newsletter-container');
                formContainer.innerHTML = `
                    <div class="alert alert-success">
                        <p class="mb-0">Thank you for subscribing! We've sent a confirmation email to ${email}.</p>
                    </div>
                `;
            } else {
                // Show error
                const errorElement = document.getElementById('newsletter-error');
                errorElement.textContent = 'Please enter a valid email address.';
                errorElement.classList.remove('d-none');
            }
        });
    }

    // Email validation helper
    function validateEmail(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }

    // Mobile menu enhancements
    const mobileMenuToggle = document.querySelector('.navbar-toggler');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            document.body.classList.toggle('menu-open');
        });
    }

    // Add smooth scrolling to all links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});
