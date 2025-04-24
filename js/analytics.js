// Google Analytics 4 Implementation Code
// Industrial Airflow Solutions - Analytics Setup

// Google Analytics 4 base code
document.addEventListener('DOMContentLoaded', function() {
  // Google Analytics 4 tracking code
  var gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-G08Q4SX3WL'; // Replace with actual GA4 ID when available
  document.head.appendChild(gaScript);

  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-G08Q4SX3WL'); // Replace with actual GA4 ID when available

  // Enhanced e-commerce tracking for affiliate links
  document.querySelectorAll('a[data-affiliate]').forEach(function(link) {
    link.addEventListener('click', function(e) {
      // Get affiliate data attributes
      var productName = this.getAttribute('data-product-name');
      var productBrand = this.getAttribute('data-product-brand');
      var productCategory = this.getAttribute('data-product-category');
      var productPrice = this.getAttribute('data-product-price');
      var affiliateProgram = this.getAttribute('data-affiliate');
      
      // Track outbound affiliate link click
      gtag('event', 'affiliate_link_click', {
        'affiliate_program': affiliateProgram,
        'product_name': productName,
        'product_brand': productBrand,
        'product_category': productCategory,
        'product_price': productPrice,
        'page_location': window.location.href,
        'link_url': this.href
      });
    });
  });

  // Track scroll depth
  var scrollDepthTracked = {};
  var scrollDepthMarks = [25, 50, 75, 100];
  
  function calculateScrollDepth() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var windowHeight = window.innerHeight;
    var documentHeight = Math.max(
      document.body.scrollHeight, 
      document.body.offsetHeight, 
      document.documentElement.clientHeight, 
      document.documentElement.scrollHeight, 
      document.documentElement.offsetHeight
    );
    
    if (documentHeight > 0) {
      var scrollPercent = Math.floor((scrollTop / (documentHeight - windowHeight)) * 100);
      
      scrollDepthMarks.forEach(function(mark) {
        if (scrollPercent >= mark && !scrollDepthTracked[mark]) {
          scrollDepthTracked[mark] = true;
          gtag('event', 'scroll_depth', {
            'depth_percentage': mark,
            'page_location': window.location.href,
            'page_title': document.title
          });
        }
      });
    }
  }
  
  window.addEventListener('scroll', function() {
    // Throttle scroll events
    if (!window.scrollThrottle) {
      window.scrollThrottle = setTimeout(function() {
        calculateScrollDepth();
        window.scrollThrottle = null;
      }, 500);
    }
  });

  // Track time on page
  var startTime = new Date();
  var timeOnPageTracked = {};
  var timeMarks = [30, 60, 120, 300]; // Time in seconds
  
  function trackTimeOnPage() {
    var currentTime = new Date();
    var timeOnPage = Math.floor((currentTime - startTime) / 1000); // Time in seconds
    
    timeMarks.forEach(function(mark) {
      if (timeOnPage >= mark && !timeOnPageTracked[mark]) {
        timeOnPageTracked[mark] = true;
        gtag('event', 'time_on_page', {
          'time_seconds': mark,
          'page_location': window.location.href,
          'page_title': document.title
        });
      }
    });
  }
  
  // Check time on page every 10 seconds
  setInterval(trackTimeOnPage, 10000);

  // Track form submissions
  document.querySelectorAll('form').forEach(function(form) {
    form.addEventListener('submit', function(e) {
      var formId = this.id || 'unknown_form';
      var formAction = this.action || 'unknown_action';
      
      gtag('event', 'form_submission', {
        'form_id': formId,
        'form_action': formAction,
        'page_location': window.location.href
      });
    });
  });

  // Track outbound links
  document.querySelectorAll('a').forEach(function(link) {
    if (link.hostname !== window.location.hostname && !link.hasAttribute('data-affiliate')) {
      link.addEventListener('click', function(e) {
        gtag('event', 'outbound_link_click', {
          'link_url': this.href,
          'page_location': window.location.href
        });
      });
    }
  });

  // Track file downloads
  document.querySelectorAll('a[href$=".pdf"], a[href$=".doc"], a[href$=".docx"], a[href$=".xls"], a[href$=".xlsx"], a[href$=".zip"]').forEach(function(link) {
    link.addEventListener('click', function(e) {
      var fileExtension = this.href.split('.').pop();
      
      gtag('event', 'file_download', {
        'file_extension': fileExtension,
        'file_name': this.href.split('/').pop(),
        'file_url': this.href,
        'page_location': window.location.href
      });
    });
  });

  // Track internal navigation
  document.querySelectorAll('a').forEach(function(link) {
    if (link.hostname === window.location.hostname) {
      link.addEventListener('click', function(e) {
        gtag('event', 'internal_link_click', {
          'link_text': this.innerText,
          'link_url': this.href,
          'page_location': window.location.href
        });
      });
    }
  });

  // Initialize custom dimensions
  gtag('set', {
    'content_type': document.querySelector('meta[name="content-type"]')?.content || 'unknown',
    'industry_focus': document.querySelector('meta[name="industry-focus"]')?.content || 'general',
    'fan_type': document.querySelector('meta[name="fan-type"]')?.content || 'unknown'
  });

  console.log('Industrial Airflow Solutions analytics tracking initialized');
});
