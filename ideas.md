# Geography Game Ideas

## US Regions Educational Feature (v32 - In Progress)

### Status
✅ **Implemented**: 
- Regional classification data (6 regions: Northeast, Midwest, South, Southwest, West, Alaska & Hawaii)
- UI button in topbar
- Color-coded regions with descriptions
- State listings with ambiguous-region highlighting
- CSS styling and modal structure

⚠️ **Issue**: Modal display not working in browser - the panel HTML/CSS/JS are present but the show/hide toggle isn't displaying the modal. Data and structure are complete; needs debugging of the display mechanism.

### How to Fix
- Check browser CSS rendering of `.regions-panel.show` class
- Verify fixed positioning and z-index are working properly
- Consider alternative modal implementation if current approach has conflicts

### What's There
- `/data/regions.js`: Complete region definitions with state lists
- `/js/regions.js`: Event handlers and modal logic
- `/index.html`: Regions button and modal panel structure
- `/style.css`: Full styling including `.regions-panel` and nested elements
- All deployed to v32 on GitHub Pages

---

## Multiplayer Mode (Future Enhancement)

### Overview
Add 2-player competitive gameplay where friends can play against each other in real-time.

### User Experience
1. Main menu button: "Play against a friend?"
2. Create session → generates unique 4-character code (e.g., "K7M2")
3. Friend enters code to join
4. Countdown: 5→4→3→2→1
5. Both players see same question, answer simultaneously
6. Opponent's score updates in real-time on split HUD
7. Results screen shows head-to-head comparison

### Technical Architecture
- **Backend**: Firebase Realtime Database (free tier)
- **Session Data**: Player scores, answers, game state synced via Firebase
- **UI**: Split HUD showing both players' scores, opponent answer visualization
- **Disconnect Handling**: 15-sec detection, 5-min grace period for reconnection

### Implementation Phases (~20 hours total)
- **Phase 1** (4-6 hrs): Firebase setup, session creation/joining UI
- **Phase 2** (3-4 hrs): Two-player HUD layout
- **Phase 3** (4-5 hrs): Real-time score sync and question progression
- **Phase 4** (3-4 hrs): Disconnect handling
- **Phase 5** (2-3 hrs): Results screen and match history

### Optional Enhancements
- Spectator mode (share read-only link)
- Lightweight voice chat (WebRTC)
- Match replay with both players' clicks visualized
- Leaderboards / head-to-head statistics
- Match history browser

### Notes
- Start this when single-player game is feature-complete
- Use Firebase free tier for development, scale if needed
- Consider auto-deletion of sessions after 24 hours
- Match history stored in localStorage per browser
