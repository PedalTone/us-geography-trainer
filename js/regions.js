// Regions UI Handler
// Displays and manages the US regions educational panel

var regionsUI = (function() {
  var regionsPanel = null;
  var regionsList = null;
  var regionsBtn = null;
  var closeBtn = null;

  function init() {
    regionsPanel = document.getElementById('regionsPanel');
    regionsList = document.getElementById('regionsList');
    regionsBtn = document.getElementById('regionsBtn');
    closeBtn = document.getElementById('closeRegionsBtn');

    if (!regionsPanel || !regionsBtn) return;

    regionsBtn.addEventListener('click', show);
    closeBtn.addEventListener('click', hide);
    regionsPanel.addEventListener('click', function(e) {
      if (e.target === regionsPanel) hide();
    });

    buildRegionsList();
  }

  function buildRegionsList() {
    if (!regionsList) return;

    regionsList.innerHTML = '';

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

      // Show states in this region
      regionData.states.forEach(function(stateName) {
        var stateTag = document.createElement('span');
        stateTag.className = 'state-tag';
        stateTag.textContent = stateName;

        // Add note if state has ambiguous regional identity
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

      regionsList.appendChild(regionDiv);
    });
  }

  function show() {
    if (regionsPanel) {
      regionsPanel.style.display = 'flex';
    }
  }

  function hide() {
    if (regionsPanel) {
      regionsPanel.style.display = 'none';
    }
  }

  return {
    init: init,
    show: show,
    hide: hide
  };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', regionsUI.init);
} else {
  regionsUI.init();
}
