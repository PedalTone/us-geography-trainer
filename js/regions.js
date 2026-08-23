// Builds the region legend beside the map. The swatches are the same colours
// the canvas paints, read from the one source in data/regions.js so the legend
// can never drift from the map.

var regionsUI = (function () {
  function build(mapStates) {
    var list = document.getElementById('legendList');
    if (!list) return;

    // Only list regions that actually appear on the map. The game is the lower
    // 48, so Alaska & Hawaii would otherwise be a legend entry for nothing.
    var present = {};
    (mapStates || []).forEach(function (s) {
      var region = getRegionForState(s.name);
      if (region) present[region] = true;
    });

    list.innerHTML = '';
    Object.keys(REGIONS).forEach(function (regionName) {
      if (!present[regionName]) return;

      var li = document.createElement('li');
      li.className = 'legend-item';

      var swatch = document.createElement('span');
      swatch.className = 'legend-swatch';
      swatch.style.backgroundColor = REGIONS[regionName].color;

      var label = document.createElement('span');
      label.className = 'legend-name';
      label.textContent = regionName;

      li.appendChild(swatch);
      li.appendChild(label);
      list.appendChild(li);
    });
  }

  function setVisible(on) {
    var legend = document.getElementById('regionLegend');
    if (legend) legend.hidden = !on;
  }

  return { build: build, setVisible: setVisible };
})();
