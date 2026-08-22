// Regions UI Handler - US Regional Classifications

(function() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const regionsBtn = document.getElementById('regionsBtn');
    const regionsPanel = document.getElementById('regionsPanel');
    const closeBtn = document.getElementById('closeRegionsBtn');
    const regionsList = document.getElementById('regionsList');

    if (!regionsBtn || !regionsPanel || !regionsList) {
      console.error('Regions: Missing DOM elements');
      return;
    }

    // Build regions list once
    buildRegionsList(regionsList);

    // Show regions panel
    regionsBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      regionsPanel.classList.add('show');
    });

    // Close button
    if (closeBtn) {
      closeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        regionsPanel.classList.remove('show');
      });
    }

    // Click on background to close
    regionsPanel.addEventListener('click', function(e) {
      if (e.target === regionsPanel) {
        regionsPanel.classList.remove('show');
      }
    });

    console.log('Regions panel initialized successfully');
  }

  function buildRegionsList(container) {
    container.innerHTML = '';

    for (const [regionName, regionData] of Object.entries(REGIONS)) {
      const regionDiv = document.createElement('div');
      regionDiv.className = 'region-item';

      const colorBar = document.createElement('div');
      colorBar.className = 'region-color-bar';
      colorBar.style.backgroundColor = regionData.color;

      const regionContent = document.createElement('div');
      regionContent.className = 'region-content';

      const regionTitle = document.createElement('h3');
      regionTitle.textContent = regionName;

      const regionDesc = document.createElement('p');
      regionDesc.className = 'region-description';
      regionDesc.textContent = regionData.description;

      const statesList = document.createElement('div');
      statesList.className = 'states-list';

      for (const stateName of regionData.states) {
        const stateTag = document.createElement('span');
        stateTag.className = 'state-tag';
        stateTag.textContent = stateName;

        if (REGION_NOTES[stateName]) {
          stateTag.title = REGION_NOTES[stateName];
          stateTag.classList.add('ambiguous');
        }

        statesList.appendChild(stateTag);
      }

      regionContent.appendChild(regionTitle);
      regionContent.appendChild(regionDesc);
      regionContent.appendChild(statesList);

      regionDiv.appendChild(colorBar);
      regionDiv.appendChild(regionContent);

      container.appendChild(regionDiv);
    }
  }
})();
