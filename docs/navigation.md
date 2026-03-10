# How to Navigate the App

## First time / blank page

1. **Open the left menu**  
   Click the **☰ (hamburger)** icon in the top-left of the blue bar.  
   If you don’t see a sidebar, the menu is closed — click **☰** to open it.

2. **You should see**
   - **Top bar**: “Underwater Sonar Simulation Platform”, simulation controls (Play/Pause, Speed), and “Menu left · Space: start/stop”.
   - **Left panel** (after opening the menu): Tabs — **Environment**, **Sensors**, **Platform**, **Target**, **View**.
   - **Main area**: 3D underwater view (dark blue) and a right sidebar with metrics and charts.

## Tabs in the left panel

| Tab         | Use it for |
|------------|------------|
| **Environment** | Water properties, bathymetry, sound speed profile. |
| **Sensors**    | Sonar sensor settings (frequency, beam, range). |
| **Platform**   | Platform position, depth, heading, autopilot. |
| **Target**     | Place targets (Submarine, Vessel, Whale, Mine), set position, see detection table and area coverage. |
| **View**       | Toggle grid, sensor coverage, fog in the 3D view. |

## Running the simulation

1. Open the **Target** tab and **place a target** (choose type, X/Y/Depth, then “Place target”).
2. In the top bar, click **Play** (or press **Space**) to start the simulation.
3. Use **W/A/S/D** to move, **Q/E** to dive/rise, or use **Platform** tab / area coverage to move automatically.
4. When the sonar detects the target, it appears in the **Detection output** table and is highlighted in the 3D view.

## Other pages

- **Home (simulation)**: URL `/` — main 3D view and panels.
- **Sound speed profile (full size)**: In the right sidebar, click “Full size →” next to the sound speed chart, or go to `/sound-speed-profile`. Use “← Back to simulation” to return.

## If the main area is still blank

- Hard refresh: **Ctrl+F5** (Windows) or **Cmd+Shift+R** (Mac).
- Check the browser console (F12 → Console) for red errors.
- Make sure you’re at **http://localhost:5173/** (or your dev server URL) and not a different path.
