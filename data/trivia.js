// Trivia clues: three per state, hardest first. A wrong guess buys the next
// one, so the question gets easier as tries run out.
//
// **bold** and *italic* markers are rendered as real elements by the clue
// formatter in game.js — never injected as HTML.
//
// Alaska and Hawaii are here for completeness but cannot be asked: the map is
// the lower 48, so there is nothing to click. buildQueue filters to the states
// the map actually draws.
var TRIVIA_CLUES = {
  'Alabama': [
    '**Conecuh sausage** has an unusually devoted local following',
    '**Yellowhammer** is a familiar state-identity word',
    '**White barbecue sauce** is the local mayo-and-vinegar alternative to red sauce',
  ],
  'Alaska': [
    '**“Termination dust”** means the season’s first snow on the mountains',
    'People may refer to everywhere beyond the state as **“Outside”**',
    'An old-timer is a **“sourdough”**; a newcomer a **“cheechako”**',
  ],
  'Arizona': [
    'A **cheese crisp** is an open-faced toasted tortilla covered in cheese',
    'A prickly-pear margarita is a familiar desert drink',
    'The **Sonoran dog** comes bacon-wrapped and loaded with beans, onions, tomatoes and more',
  ],
  'Arkansas': [
    '**Chocolate gravy and biscuits** is a traditional breakfast in parts of the Ozarks',
    '**Possum pie** contains no possum — it’s a layered chocolate-and-cream dessert',
    '**Cheese dip** is taken seriously enough to have its own local origin story and trail',
  ],
  'California': [
    '**Tri-tip** barbecue has especially strong roots along the central coast',
    'Ordering something **“animal style”** has a meaning almost everyone recognizes',
    'Highways become **“the 5,” “the 405,” “the 101”** in the southern part of the state',
  ],
  'Colorado': [
    'A **fourteener** is a mountain over 14,000 feet — and “doing a 14er” is normal conversation',
    'Food is often ordered **“smothered”** in green chile',
    'A **homegrown steel-town chile** is the fierce rival to the famous New Mexico one',
  ],
  'Connecticut': [
    'A **steamed cheeseburger** is a central-state specialty',
    'A long sandwich is commonly a **grinder**',
    'In one old shoreline city, pizza is **“apizza,” pronounced roughly ah-BEETZ**',
  ],
  'Delaware': [
    '**Scrapple** is perfectly normal breakfast food',
    '**Delmarva** describes the peninsula shared with two neighboring states',
    '**“Slower Lower”** refers to the southern part of the state',
  ],
  'Florida': [
    '**Cafecito** can mean a tiny, very strong Cuban coffee',
    'Key lime pie traditionally uses small, tart local limes',
    'A **“Pub Sub”** means a made-to-order sandwich from Publix',
  ],
  'Georgia': [
    '**Boiled peanuts** are a roadside snack, not a mistake',
    'Peach symbolism is everywhere despite another state producing far more peaches',
    '**“Lemon pepper wet”** is a recognizable wing order in the state’s biggest city',
  ],
  'Hawaii': [
    '**Spam musubi** is everyday convenience food',
    'A **plate lunch** typically means rice, macaroni salad and an entrée',
    'It’s **“shave ice,” not “shaved ice”**',
  ],
  'Idaho': [
    '**Huckleberries** have a cult following in the north',
    'Potatoes appear in candy-shaped desserts that aren’t actually made from potatoes',
    '**Finger steaks** are battered and fried strips of beef',
  ],
  'Illinois': [
    '**Giardiniera** is a standard topping for certain sandwiches in the big lakefront city',
    'Deep-dish isn’t the only local pizza; many residents eat thin **tavern-style** squares',
    'Italian beef is ordered **dry, wet, or dipped**',
  ],
  'Indiana': [
    'Basketball gyms can be enormous relative to the towns they serve',
    '**Hoosier** is used constantly even though its origin is disputed',
    'A **tenderloin** can mean a breaded pork cutlet comically larger than its bun',
  ],
  'Iowa': [
    '**Scotcheroos** are peanut-butter cereal bars topped with chocolate',
    '**Maid-Rite** is practically a category of sandwich',
    'A **loose-meat sandwich** is seasoned crumbled beef — but definitely not a sloppy joe',
  ],
  'Kansas': [
    '**Bierocks** reflect Volga-German food traditions',
    '**“Ad Astra”** is immediately recognizable shorthand',
    '**“To the Stars”** comes from the deeply embedded motto *Ad Astra Per Aspera*',
  ],
  'Kentucky': [
    '**Beer cheese** is a spread with strong local roots',
    '**Burgoo** is a thick communal meat-and-vegetable stew',
    'A **Hot Brown** is open-faced turkey and bacon covered in rich cheese sauce',
  ],
  'Louisiana': [
    '**Lagniappe** means a little something extra',
    'A sandwich might be a **po’boy**, not a sub or hoagie',
    'A divided street’s median can be called the **“neutral ground”**',
  ],
  'Maine': [
    '**Whoopie pies** are treated with near-official seriousness',
    'A lobster roll may be expected to be cold with mayo rather than warm with butter',
    'Ordering **“an Italian”** can mean a specific ham-and-vegetable sandwich',
  ],
  'Maryland': [
    '**Coddies** are old-school fish-and-potato cakes',
    'Seasoning gets put on everything from seafood to french fries',
    '**“Picking crabs”** describes a meal that can last for hours',
  ],
  'Massachusetts': [
    'A milkshake without ice cream and a **frappe** aren’t necessarily the same thing',
    '**“Wicked”** can simply intensify an adjective',
    '**“The packie”** means the package/liquor store',
  ],
  'Michigan': [
    '**Vernors** ginger ale is almost a cultural institution',
    'A resident may show where they’re from using a hand as a map',
    'A **“party store”** sells beer, snacks and convenience items — not balloons',
  ],
  'Minnesota': [
    '**Duck, duck, gray duck** replaces a children’s-game phrase used almost everywhere else',
    '**“Uff da”** survives from Scandinavian heritage',
    'It’s **hotdish**, not casserole',
  ],
  'Mississippi': [
    '**Slugburgers** contain meat extended with fillers and fried into patties',
    'Tamales have an unexpectedly deep Delta tradition',
    '**Comeback sauce** is a tangy pink dipping sauce/dressing',
  ],
  'Missouri': [
    '**Provel** is the distinctive processed cheese blend on the big river city’s pizza',
    'Barbecue can mean burnt ends in one city and a very different tradition elsewhere',
    '**Toasted ravioli** is actually breaded and deep-fried',
  ],
  'Montana': [
    'A **pastie/pasty** still evokes an old copper-mining city’s heritage',
    '**Flathead cherries** are a seasonal obsession in the northwest',
    '**Huckleberry everything** — jam, pie, candy, ice cream, drinks',
  ],
  'Nebraska': [
    'Chili and cinnamon rolls are sometimes served **together as a meal**',
    '**Cornhusker** functions far beyond merely describing agriculture',
    'A **Runza** is bread stuffed with beef, cabbage and onions',
  ],
  'Nevada': [
    '**Basque boardinghouse dinners** remain part of northern food culture',
    'Casinos aren’t only a tourist thing; gaming can turn up in ordinary neighborhood establishments',
    '**Picon Punch** is the bitter-orange cocktail tied to Basque communities',
  ],
  'New Hampshire': [
    'A **frappe** traditionally contains ice cream',
    'Maple syrup and sugarhouses are serious springtime business',
    '**“The Granite State”** is used constantly as an everyday identity',
  ],
  'New Jersey': [
    '**Disco fries** are fries with cheese and gravy',
    'Diners are such a fixture that the state is famous for their sheer abundance',
    '**“Taylor ham” vs. “pork roll”** can tell you what part of the state someone comes from',
  ],
  'New Mexico': [
    '**Sopapillas with honey** often arrive with a meal',
    'Chile can be treated almost as a food group rather than a condiment',
    'Asked **“red or green?”**, answer **“Christmas”** to get both',
  ],
  'New York': [
    'A corner convenience store may be a **bodega**',
    'A chopped-cheese sandwich is strongly associated with big-city neighborhood delis',
    'In the city, you may stand **“on line”** rather than *in line*',
  ],
  'North Carolina': [
    '**Cheerwine** is a cherry-flavored soft drink, not alcohol',
    'One barbecue tradition uses a thin vinegar-pepper sauce; another adds tomato',
    '**“Barbecue” traditionally means pork**, not just food cooked on a grill',
  ],
  'North Dakota': [
    '**Fleischkuechle** is a fried meat-filled pastry with German-Russian roots',
    '**Kuchen** regularly appears at community meals and family gatherings',
    '**Knoephla** means dumplings, especially in a creamy potato soup',
  ],
  'Ohio': [
    '**Buckeyes** are peanut-butter-and-chocolate candies as well as something else entirely',
    '**Goetta** is a southwestern river-city breakfast meat made with oats',
    'A **three-way** is chili over spaghetti topped with shredded cheese',
  ],
  'Oklahoma': [
    '**Calf fries** are not made from potatoes',
    '**Chicken-fried steak** has near-sacred diner status',
    'The **fried onion burger** cooks a pile of onions directly into the beef',
  ],
  'Oregon': [
    'A **jojo** can mean a thick, seasoned potato wedge',
    'Filberts and **hazelnuts** refer to the crop for which the state is famous',
    '**Marionberry** means a locally developed blackberry cultivar, not just a flavor',
  ],
  'Pennsylvania': [
    '**Lebanon bologna** is sweet, smoky and unlike ordinary bologna',
    '**Scrapple** is common in the southeastern part of the state',
    'Around the state’s biggest city, it’s a **hoagie**, not merely a sub',
  ],
  'Rhode Island': [
    '**Stuffies** are baked stuffed quahogs',
    'A **hot wiener “all the way”** has a very specific set of toppings',
    'A **“cabinet”** can mean a milkshake, and **coffee milk** is everyday vocabulary',
  ],
  'South Carolina': [
    '**Boiled peanuts** are sold warm from roadside stands',
    '**Mustard-based barbecue sauce** is especially associated with the Midlands',
    '**Hash and rice** means slow-cooked meat hash/gravy served over rice',
  ],
  'South Dakota': [
    '**Kuchen** has such strong immigrant roots that it became an official dessert',
    'Fry bread and wojapi reflect the state’s substantial Lakota/Dakota culture',
    '**Chislic** is bite-sized cubes of meat, traditionally lamb or mutton',
  ],
  'Tennessee': [
    'A **meat-and-three** means choose one meat and three side dishes',
    'The state’s two great music cities don’t mean quite the same thing by barbecue',
    '**Hot chicken** means the capital city’s cayenne-heavy preparation',
  ],
  'Texas': [
    '**Breakfast tacos** inspire serious opinions about tortillas and fillings',
    'Czech immigrant food culture made **kolaches** ubiquitous, including savory versions',
    'At the State Fair, you may hear **“corny dog” rather than corn dog**',
  ],
  'Utah': [
    '**Funeral potatoes** are cheesy potato casserole, not merely funeral food',
    '**Dirty soda** means customized fountain soda with cream, syrups and other additions',
    '**Fry sauce** is an utterly normal condiment for french fries',
  ],
  'Vermont': [
    '**Sugar on snow** pairs hot maple syrup with packed snow',
    '**Mud season** is treated almost like an additional season',
    'A **creemee** is soft-serve ice cream, ideally maple',
  ],
  'Virginia': [
    '**Peanut soup** survives from old Tidewater food traditions',
    '**Country ham biscuits** use intensely salty cured ham',
    'A **Virginia peanut** means the large crunchy variety commonly sold as a ballpark peanut',
  ],
  'Washington': [
    '**Teriyaki** is unusually embedded in the big port city’s everyday takeout culture',
    'Coffee drive-through stands are nearly part of the landscape',
    '**Geoduck** is pronounced **“gooey-duck”**',
  ],
  'West Virginia': [
    '**Ramps** — wild leeks — get their own spring festivals and community dinners',
    '**Tudor’s Biscuit World** has near-cult status locally',
    'A **pepperoni roll** has pepperoni baked inside the bread, rooted in coal-mining communities',
  ],
  'Wisconsin': [
    'A Friday **fish fry** is a weekly social institution',
    '**Cheese curds** should squeak when they’re fresh',
    'A drinking fountain can be a **“bubbler”**',
  ],
  'Wyoming': [
    '**Bison burgers** and game meat appear routinely on menus',
    '**Frontier Days** is treated as much more than just another rodeo',
    'The **jackalope** — a horned mythical rabbit — has an especially strong local folklore tradition',
  ],
};
