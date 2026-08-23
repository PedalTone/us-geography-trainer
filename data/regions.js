// US regional classification.
//
// Regions are listed west to east so the legend reads in the same order the
// eye crosses the map. Colours are chosen so that no two regions that SHARE A
// BORDER look alike — that is the constraint that matters on a map. With
// twelve categories some pairs are inevitably close in hue; where that happens
// they are always far apart geographically (Mountain West and Mid-Atlantic,
// say), so they never meet on screen.
var REGIONS = {
  'Pacific Northwest': { color: '#17A2B8' },
  'West Coast':        { color: '#8FC93A' },
  'Mountain West':     { color: '#8A63D8' },
  'Southwest':         { color: '#E2701F' },
  'Great Plains':      { color: '#EFD055' },
  'Midwest':           { color: '#3F97D8' },
  'South Central':     { color: '#D857A8' },
  'Gulf South':        { color: '#FF9E7A' },
  'Southeast':         { color: '#CC4048' },
  'Appalachia':        { color: '#B58A45' },
  'Mid-Atlantic':      { color: '#C79BE8' },
  'New England':       { color: '#2F46B0' },
};

// Every one of the lower 48, one line each. Flat rather than nested inside
// REGIONS so this reads as the same table it came from.
var STATE_REGION = {
  'Alabama': 'Southeast',
  'Arizona': 'Southwest',
  'Arkansas': 'Southeast',
  'California': 'West Coast',
  'Colorado': 'Mountain West',
  'Connecticut': 'New England',
  'Delaware': 'Mid-Atlantic',
  'Florida': 'Southeast',
  'Georgia': 'Southeast',
  'Idaho': 'Mountain West',
  'Illinois': 'Midwest',
  'Indiana': 'Midwest',
  'Iowa': 'Midwest',
  'Kansas': 'Great Plains',
  'Kentucky': 'Southeast',
  'Louisiana': 'Gulf South',
  'Maine': 'New England',
  'Maryland': 'Mid-Atlantic',
  'Massachusetts': 'New England',
  'Michigan': 'Midwest',
  'Minnesota': 'Midwest',
  'Mississippi': 'Southeast',
  'Missouri': 'Midwest',
  'Montana': 'Mountain West',
  'Nebraska': 'Great Plains',
  'Nevada': 'Mountain West',
  'New Hampshire': 'New England',
  'New Jersey': 'Mid-Atlantic',
  'New Mexico': 'Southwest',
  'New York': 'Mid-Atlantic',
  'North Carolina': 'Southeast',
  'North Dakota': 'Midwest',
  'Ohio': 'Midwest',
  'Oklahoma': 'Great Plains',
  'Oregon': 'Pacific Northwest',
  'Pennsylvania': 'Mid-Atlantic',
  'Rhode Island': 'New England',
  'South Carolina': 'Southeast',
  'South Dakota': 'Midwest',
  'Tennessee': 'Southeast',
  'Texas': 'South Central',
  'Utah': 'Mountain West',
  'Vermont': 'New England',
  'Virginia': 'Mid-Atlantic',
  'Washington': 'Pacific Northwest',
  'West Virginia': 'Appalachia',
  'Wisconsin': 'Midwest',
  'Wyoming': 'Mountain West',
};

function getRegionForState(stateName) {
  return STATE_REGION[stateName] || null;
}

// Map fills sit over shaded relief, so region colours are painted translucent —
// the terrain underneath is the whole point of the map.
var REGION_FILL = {};
Object.keys(REGIONS).forEach(function (regionName) {
  var hex = REGIONS[regionName].color;
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  REGION_FILL[regionName] = 'rgba(' + r + ',' + g + ',' + b + ',.55)';
});

function getStateRegionFill(stateName) {
  var region = STATE_REGION[stateName];
  return region ? REGION_FILL[region] : null;
}
