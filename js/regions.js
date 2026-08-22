// Regions UI Handler - Simple modal toggle

var regionsUI = (function() {
  var initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

    var regionsBtn = document.getElementById('regionsBtn');
    var regionsPanel = document.getElementById('regionsPanel');
    var closeBtn = document.getElementById('closeRegionsBtn');
    var regionsList = document.getElementById('regionsList');

    if (!regionsBtn || !regionsPanel) {
      console.error('Regions: Missing required elements');
      return;
    }

    // Build the regions list
    if (regionsList && regionsList.children.length === 0) {
      buildRegionsList(regionsList);
    }

    // Click handler for Regions button
    regionsBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      regionsPanel.classList.add('show');
    });

    // Click handler for close button
    if (closeBtn) {
      closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        regionsPanel.classList.remove('show');
      });
    }

    // Click on overlay background closes it
    regionsPanel.addEventListener('click', function(e) {
      if (e.target === regionsPanel) {
        regionsPanel.classList.remove('show');
      }
    });

    console.log('Regions UI ready');
  }

  function buildRegionsList(container) {
    container.innerHTML = '';

    Object.entries(REGIONS).forEach(function([regionName, regionData]) {
      var regionDiv = document.createElement('div');
      regionDiv.className = 'region-item';

      var colorBar = document.createElement('div');
      colorBar.className = 'region-color-bar';
      colorBar.style.backgroundColor = regionData.color;

      var regionContent = document.createElement('div');
      regionContent.className = 'region-content';

      var regionTitle = document.createElement('h3');
      regionTitle.textContent = regionName;

      var regionDesc = document.createElement('p');
      regionDesc.className = 'region-description';
      regionDesc.textContent = regionData.description;

      var statesList = document.createElement('div');
      statesList.className = 'states-list';

      // Add states
      regionData.states.forEach(function(stateName) {
        var stateTag = document.createElement('span');
        stateTag.className = 'state-tag';
        stateTag.textContent = stateName;

        if (REGION_NOTES[stateName]) {
          stateTag.title = REGION_NOTES[stateName];
          stateTag.classList.add('ambiguous');
        }

        statesList.appendChild(stateTag);
      });

      regionContent.appendChild(regionTitle);
      regionContent.appendChild(regionDesc);
      regionContent.appendChild(statesList);

      regionDiv.appendChild(colorBar);
      regionDiv.appendChild(regionContent);

      container.appendChild(regionDiv);
    });
  }

  return { init: init };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', regionsUI.init);
} else {
  regionsUI.init();
}
