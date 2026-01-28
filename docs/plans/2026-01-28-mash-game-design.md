# MASH Game Design

A shelf toy recreating the classic paper fortune-telling game from school.

## Core Gameplay

1. **Setup Phase** - Player sees 6 categories with 4 options each:
   - **M.A.S.H.** (fixed): Mansion, Apartment, Shack, House
   - **Marry**: JTT, Devon Sawa, Leo DiCaprio, "your crush"
   - **Car**: Lamborghini, Geo Metro, VW Bug, Minivan
   - **Job**: Vet, Movie Star, Teacher, Garbage Collector
   - **Kids**: 0, 2, 7, 15
   - **Location**: Hollywood, Paris, Your hometown, The Moon

2. **Spiral Phase** - Player taps to auto-generate a spiral (animated), system counts loops to get the magic number (3-10)

3. **Elimination Phase** - System counts through all options, crossing them off with animated strikethroughs until one remains per category

4. **Result Phase** - Fortune displayed as narrative: *"You will live in a **Shack** in **Paris**, married to **JTT**, driving a **Geo Metro**, working as a **Movie Star** with **15 kids**."*

## Visual Design

### Notebook Paper Aesthetic
- Off-white lined paper background with red margin line on left
- Subtle paper texture, torn edge or hole punches on side
- Handwritten font (Patrick Hand or Indie Flower from Google Fonts)
- Blue or black "pen" color for text

### Margin Doodles
- Stars, hearts, spirals
- "Mrs. [crush name]" scribbles
- The cool S
- Small tic-tac-toe games

### Elimination Visuals
- Scribbly pen strikethroughs on eliminated options
- Final answers circled rather than struck through
- Spiral drawn in corner

## Interaction

### Category Editing
- Pre-filled nostalgic defaults shown on load
- Tap any option to edit inline
- Hybrid approach: easy to play immediately, customizable for personal touch

### Spiral Drawing
- Tap "Start" button to begin
- Spiral auto-draws with animation (2-3 seconds)
- Randomized size determines magic number

### Elimination Animation
- Display shows "Counting by [N]..."
- Highlight moves through options sequentially
- Brief pause on each, strikethrough animates on elimination
- Speed increases as fewer options remain
- Satisfying conclusion when final options are circled

## Sound Effects

- Pen scratching during spiral drawing
- Quick scratch sounds during elimination
- Triumphant/silly sound on fortune reveal

## Technical Details

- Standard Svelte 5 component: `src/lib/toys/MASH.svelte`
- Props: `onClose: () => void`
- Local state with `$state` runes (no persistence needed)
- One beanie hiding spot (behind spiral or in torn paper edge)
- Mobile-friendly: tap-to-edit, touch-friendly targets

## Shelf Entry

```javascript
{ id: 'mash', name: 'MASH', icon: '📝', desc: 'Predict your future' }
```

## Future Considerations

- Share fortune as image/text (optional)
- Cootie Catcher as companion toy (separate design)
