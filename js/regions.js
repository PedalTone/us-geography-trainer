// Regions UI Handler - US Regional Classifications

var regionsUI = (function() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function closePanel() {
    var p = document.getElementById('regionsPanel');
    if (p) p.classList.remove('show');
  }

  function init() {
    const regionsBtn = document.getElementById('regionsBtn');
    const regionsPanel = document.getElementById('regionsPanel');
    const closeBtn = document.getElementById('closeRegionsBtn');
    const regionsList = document.getElementById('regionsList');
    const paintBtn = document.getElementById('regionPaintBtn');

    if (!regionsBtn || !regionsPanel || !regionsList) {
      console.error('Regions: Missing DOM elements');
      return;
    }

    // Build regions list once
    buildRegionsList(regionsList);

    // The paint-the-map toggle needs the MapView, which lives in game.js's
    // closure — note `map` here would resolve to the canvas element, since it
    // carries id="map". game.js wires that button and calls back through
    // regionsUI.closePanel() so turning it on reveals the map underneath.
    if (paintBtn) {
      paintBtn.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    }

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

  return { closePanel: closePanel };
})();
