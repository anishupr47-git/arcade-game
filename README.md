# ARCADE-GAME: Ultimate AI vs Human Gaming

A massive, feature-rich application featuring an array of a classic board and matrix games powered by custom-built deterministic and heuristic AI algorithms. Built entirely with raw React.jsx and vanilla CSS, this project showcases high performance state management, complex algorithmic decision-making, and an immersive "Cyberpunk Glassmorphic" visuals aesthetic-all contained within a highly optimized architecture.

# FEATURES

The Arcade features a centralized dashboard that tracks lifetime statistics, toggles difficulty tiers, controls synthesized sound effects, and hosts two fully implemented games:

* **Advanced TIC-TAC-TOE**
* **CONNECT FOUR**

# TECH STACK & ARCHITECTURE
* **FRONTEND LIBRARY** React 18+(Functional Components. Hooks, Context, `useReducer`)
* **Styling** Pure Vanilla CSS (Custom Variables, Keyframe Animations, Flexbox/Grid Layouts)
* **State Architecture:** A unified imutable reducer pattern managing modular complex states across all nested board layouts.

# PROJECT STRUCTURE
This project bypasses dependency bloating by structuring its entire footprint into two core operational modules designed for rapid rendering and absolute control:
 
```text
arcade-game/
├── public/
├── src/
│   ├── Arcade.jsx    #  Structural React components & AI logic
│   ├── Arcade.css    #  Granular BEM cyberpunk layouts & keyframes
│   ├── main.jsx      # Vite mounting entrypoint
│   └── index.css     # Global reset baseline
├── package.json
└── README.md
