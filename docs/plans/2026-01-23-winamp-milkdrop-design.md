# Winamp Milkdrop Visualizer

## Overview
Replace the basic bars/wave/circle visualizer in Winamp.svelte with Butterchurn, an open-source WebGL port of Milkdrop. This gives authentic psychedelic visualizations that react to audio.

## Dependencies
```
npm install butterchurn butterchurn-presets
```

## Changes to Winamp.svelte

### Canvas
- Replace 2D canvas context with WebGL (Butterchurn manages this)
- Increase canvas size slightly for better visual detail (300x150)

### Visualizer Initialization
```typescript
import butterchurn from 'butterchurn';
import presets from 'butterchurn-presets';

const visualizer = butterchurn.createVisualizer(audioContext, canvas, {
  width: 300,
  height: 150
});
visualizer.connectAudio(analyserNode);
```

### Preset System
- Curate 15-20 presets from butterchurn-presets library
- Store current preset index in state
- Blend duration: 0.5s for smooth transitions

### UI Changes
Replace viz mode buttons with:
- Previous preset button (◀)
- Dropdown showing current preset name (clickable to show full list)
- Next preset button (▶)
- Shuffle toggle (🔀)

### Render Loop
```typescript
function render() {
  visualizer.render();
  animationId = requestAnimationFrame(render);
}
```

### Curated Presets
Selection criteria:
- Reacts well to audio frequencies
- Looks good at small canvas size
- Visual variety (geometric, organic, colorful, minimal)

## Files Modified
- `src/lib/toys/Winamp.svelte` - Main changes
- `package.json` - New dependencies

## Testing
1. Play a track, verify visualizer renders
2. Cycle through presets with arrows
3. Select preset from dropdown
4. Toggle shuffle mode
5. Verify smooth blending between presets
6. Test with different skins (colors shouldn't conflict)
