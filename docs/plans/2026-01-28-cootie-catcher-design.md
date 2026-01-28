# Cootie Catcher Design

A 3D paper fortune teller toy with themed fortune sets.

## Core Gameplay

1. **Theme Select** - Pick from Love, Fortune, Silly, or 8-Ball. Sets colors and fortunes.

2. **Pick a Color** - Four colored outer flaps shown. Tap one. Catcher animates open/close for each letter (e.g., "BLUE" = 4 times).

3. **Pick a Number** - Four numbers revealed (1-8 on inner flaps). Tap one. Catcher animates open/close that many times.

4. **Pick a Flap** - Four inner triangles shown with numbers. Tap one to "lift" the flap.

5. **Fortune Revealed** - Fortune text displayed with option to play again or change theme.

## 3D Visual Design

### CSS 3D Structure

Built from 4 triangular flaps using `transform-style: preserve-3d` and `perspective`.

**Animation states:**
- **Closed**: All 4 flaps folded inward (diamond shape), outer colors visible
- **Open horizontal**: Top/bottom flaps rotate outward on X-axis, shows numbers 1-4
- **Open vertical**: Left/right flaps rotate outward on Y-axis, shows numbers 5-8
- **Flap lift**: Selected inner triangle rotates up to reveal fortune

### Theme Color Palettes

| Theme | Colors |
|-------|--------|
| Love | Pink, Red, Hot Pink, Rose |
| Fortune | Gold, Green, Silver, Royal Blue |
| Silly | Lime, Orange, Cyan, Magenta |
| 8-Ball | Black, Purple, Dark Blue, Gray |

### Paper Aesthetic
- Off-white with subtle fold lines/creases
- Light drop shadow for depth
- Handwritten font (Patrick Hand) for numbers

## Fortune Content

### Love
1. Your crush likes you back
2. You'll get married at 25
3. Someone is thinking about you right now
4. A love letter is coming
5. You'll have 3 kids
6. Your first kiss is soon
7. A secret admirer watches
8. True love will find you

### Fortune
1. You will be rich
2. Fame awaits you
3. You'll travel the world
4. A promotion is coming
5. You'll live in a mansion
6. Luck is on your side
7. Success is near
8. Your dreams will come true

### Silly
1. You smell like cheese
2. A bird will poop on you
3. You'll step in gum today
4. Your face looks funny
5. You eat boogers secretly
6. A fart is coming
7. You'll trip in public
8. Someone saw you pick your nose

### 8-Ball
1. Yes
2. No
3. Ask again later
4. Outlook good
5. Don't count on it
6. Without a doubt
7. Reply hazy, try again
8. My sources say no

## Technical Details

### Sound Effects
- Theme select: `click`
- Color tap: `pop`
- Open/close animation: `whoosh` (quiet)
- Number tap: `pop`
- Flap lift: `whoosh`
- Fortune reveal: `ding`
- Play again: `pop`

### Mobile
- Touch-friendly tap targets
- 3D transforms work on mobile browsers
- Smaller scale on narrow screens

### Component
- File: `src/lib/toys/CootieCatcher.svelte`
- Props: `onClose: () => void`
- Local state only (no persistence)
- One beanie hiding spot (behind catcher)

### Shelf Entry
```javascript
{ id: 'cootiecatcher', name: 'Cootie Catcher', icon: '🔮', desc: 'Pick your fortune' }
```
