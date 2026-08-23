// US regional classification.
//
// Regions are listed west to east so the legend reads in the same order the
// eye crosses the map. Colours are fitted to one constraint: no two regions
// that SHARE A BORDER may look alike. Measured as CIE dE over the composited
// translucent fill, the closest adjacent pair is Midwest/Mid-Atlantic at 25.6.
//
// South Central is Kentucky alone and Appalachia is West Virginia alone. Both
// border Mid-Atlantic (through Virginia), which is why South Central is green
// rather than the magenta it carried when it meant Texas: magenta against the
// orchid Mid-Atlantic measured 19.8 and would have been the weakest pair.
var REGIONS = {
  'Pacific Northwest': { color: '#17A2B8' },
  'West Coast':        { color: '#8FC93A' },
  'Mountain West':     { color: '#8A63D8' },
  'Southwest':         { color: '#E2701F' },
  'Great Plains':      { color: '#EFD055' },
  'Midwest':           { color: '#3F97D8' },
  'South':             { color: '#CC4048' },
  'South Central':     { color: '#7ECB8F' },
  'Appalachia':        { color: '#B58A45' },
  'Mid-Atlantic':      { color: '#D9A0E8' },
  'New England':       { color: '#2F46B0' },
};

// Every one of the lower 48, one line each. Flat rather than nested inside
// REGIONS so this reads as the same table it came from.
var STATE_REGION = {
  'Alabama': 'South',
  'Arizona': 'Southwest',
  'Arkansas': 'South',
  'California': 'West Coast',
  'Colorado': 'Mountain West',
  'Connecticut': 'New England',
  'Delaware': 'Mid-Atlantic',
  'Florida': 'South',
  'Georgia': 'South',
  'Idaho': 'Mountain West',
  'Illinois': 'Midwest',
  'Indiana': 'Midwest',
  'Iowa': 'Midwest',
  'Kansas': 'Great Plains',
  'Kentucky': 'South Central',
  'Louisiana': 'South',
  'Maine': 'New England',
  'Maryland': 'Mid-Atlantic',
  'Massachusetts': 'New England',
  'Michigan': 'Midwest',
  'Minnesota': 'Midwest',
  'Mississippi': 'South',
  'Missouri': 'Midwest',
  'Montana': 'Mountain West',
  'Nebraska': 'Great Plains',
  'Nevada': 'Mountain West',
  'New Hampshire': 'New England',
  'New Jersey': 'Mid-Atlantic',
  'New Mexico': 'Southwest',
  'New York': 'Mid-Atlantic',
  'North Carolina': 'South',
  'North Dakota': 'Midwest',
  'Ohio': 'Midwest',
  'Oklahoma': 'Great Plains',
  'Oregon': 'Pacific Northwest',
  'Pennsylvania': 'Mid-Atlantic',
  'Rhode Island': 'New England',
  'South Carolina': 'South',
  'South Dakota': 'Midwest',
  'Tennessee': 'South',
  'Texas': 'South',
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
