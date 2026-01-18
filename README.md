# The Universe at Your Fingertips 🌌

**[🔴 LIVE DEMO](https://maverick-list.github.io/particle-planet-viz/)**

**A 3D Interactive Particle Planet Visualization with In-Browser Hand Tracking.**

![Project Banner](https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop) 
*(Note: Replace with your actual screenshot)*

## Overview

This project is a stunning, interactive 3D visualization of a particle-based planet (reminiscent of Saturn) created using **Three.js**. It features a modern, fully client-side hand tracking system powered by **MediaPipe Hands**, allowing users to interact with the universe using simple gestures—no Python backend required!

## ✨ Key Features

-   **3D Particle System**: Thousands of individual particles rendered efficiently with custom GLSL shaders to create a volumetric planet and ring system.
-   **Pure JavaScript Hand Tracking**: Leveraging `@mediapipe/hands` to detect gestures directly in the browser with zero latency.
-   **Interactive Gestures**:
    -   ✋ **Zoom**: Open your hand to zoom in, close it to zoom out.
    -   👋 **Rotate**: Move your hand to the far left or right edges to spin the planet.
    -   👆 **Repel**: Point your finger to create a magnetic repulsion field that distorts the particles.
-   **Modern UI**: Sleek, transparent camera sensor preview and elegant typography.

## 🚀 How to Run

Since this project is fully client-side, running it is incredibly simple:

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Maverick-list/particle-planet-viz.git
    ```
2.  **Open `index.html`**:
    You can simply double-click `index.html` to open it in your browser.
    
    *Note: For the best experience (and to avoid CORS issues), it is recommended to use a local server (like Live Server in VS Code or Python's http.server).*

    ```bash
    # Using Python
    python3 -m http.server 8080
    ```

3.  **Allow Camera Access**: Grant the browser permission to use your webcam for the hand tracking magic to work.

## 🛠️ Technologies

*   **Three.js**: 3D rendering engine.
*   **MediaPipe Hands**: Machine Learning solution for high-fidelity hand and finger tracking.
*   **HTML5/CSS3**: UI and layout.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---
*Created with ❤️ by Maverick-list*
