// US Regional Classifications
// Based on US Census Bureau divisions + popular consensus
// Some states have ambiguous regional identity (noted)

var REGIONS = {
  'Northeast': {
    color: '#2E5090',
    states: [
      'Maine', 'New Hampshire', 'Vermont', // New England
      'Massachusetts', 'Rhode Island', 'Connecticut', // New England
      'New York', 'Pennsylvania', 'New Jersey' // Mid-Atlantic
    ],
    description: 'The Northeast includes New England (the original colonies) and the Mid-Atlantic states. Major cities: Boston, New York, Philadelphia.'
  },

  'Midwest': {
    color: '#4A7BA7',
    states: [
      'Ohio', // Ambiguous: Far east, but culturally Midwest
      'Indiana', 'Illinois', 'Michigan', 'Wisconsin', // Great Lakes
      'Minnesota', 'Iowa', 'Missouri', // Upper Midwest
      'North Dakota', 'South Dakota', 'Nebraska', 'Kansas' // Great Plains
    ],
    description: 'The Midwest is the heartland of America, known for agriculture, manufacturing, and Great Lakes shipping. Major cities: Chicago, Detroit, Minneapolis.'
  },

  'South': {
    color: '#C85A54',
    states: [
      'Maryland', 'Delaware', 'Virginia', 'West Virginia', // Border South
      'Kentucky', 'Tennessee', 'Arkansas', // Upper South
      'North Carolina', 'South Carolina', 'Georgia', 'Florida', // Carolinas & Deep South
      'Alabama', 'Mississippi', 'Louisiana', // Deep South
      'Texas', 'Oklahoma' // South/Southwest
    ],
    description: 'The South spans from the Border States through the Deep South and into Texas. Known for distinct culture, history, and cuisine. Major cities: Atlanta, New Orleans, Miami.'
  },

  'Southwest': {
    color: '#D4A574',
    states: [
      'Arizona', 'New Mexico', // Mountain Southwest
      'Nevada', 'Utah', 'Colorado' // Mountain West (sometimes grouped here)
    ],
    description: 'The Southwest is characterized by desert landscapes, Native American heritage, and Spanish colonial history. Major cities: Phoenix, Albuquerque, Denver.'
  },

  'West': {
    color: '#6B8E23',
    states: [
      'Washington', 'Oregon', 'California', // Pacific Coast
      'Idaho', 'Montana', 'Wyoming' // Mountain West
    ],
    description: 'The West includes the Pacific Coast and Rocky Mountain regions. Known for natural beauty, tech industry (California), and outdoor recreation. Major cities: Seattle, San Francisco, Los Angeles.'
  },

  'Alaska & Hawaii': {
    color: '#8B7355',
    states: ['Alaska', 'Hawaii'],
    description: 'Alaska and Hawaii are geographically and culturally distinct from the continental US, each with unique histories and indigenous populations.'
  }
};

// Regional aliases - states that could belong to multiple regions
var REGION_NOTES = {
  'Ohio': 'Often considered Midwest despite being east of the Mississippi River. Culturally identifies as Midwest.',
  'Missouri': 'Border state between Midwest and South; often considered part of the Midwest.',
  'Oklahoma': 'Bridge between South and Southwest; oil and agricultural ties to both.',
  'West Virginia': 'Border state; sometimes grouped with Appalachia (Border South) or Midwest.',
  'Kentucky': 'Border state with mixed Southern and Midwestern cultural elements.',
  'Colorado': 'Mountain state often grouped with West Coast or Southwest.',
  'Montana': 'Northern Mountain state; sometimes considered part of the West or its own region.',
  'Idaho': 'Mountain state with ties to both West Coast and Mountain regions.'
};

// Get the region for a given state
function getRegionForState(stateName) {
  for (const [regionName, regionData] of Object.entries(REGIONS)) {
    if (regionData.states.includes(stateName)) {
      return regionName;
    }
  }
  return null;
}

// Get all states in a region
function getStatesInRegion(regionName) {
  return REGIONS[regionName]?.states || [];
}

// Get color for a state based on its region
function getStateRegionColor(stateName) {
  const region = getRegionForState(stateName);
  return REGIONS[region]?.color || '#999999';
}
