# XR-SF-R3F

A 3D e-commerce experience built with React Three Fiber and Rapier Physics.

## Features

- 🛍️ Interactive 3D Shopping Experience
- 🎮 First-Person Controls
- 🎯 Product Interaction
- 🛒 Shopping Cart Integration
- 💫 Smooth Animations
- 🌐 Multiplayer Support
- 📱 Mobile-Friendly Controls
- 🎨 Modern UI/UX

## Tech Stack

- React Three Fiber
- Three.js
- Rapier Physics
- Zustand (State Management)
- Socket.IO (Multiplayer)
- GSAP (Animations)
- Tailwind CSS

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Rohith2825/multiplayer-r3f.git
cd multiplayer-r3f
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Start the multiplayer server (in a separate terminal):
```bash
npm run server
```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Multiplayer Features

- Real-time player synchronization
- Smooth player movement interpolation
- Visual representation of other players
- Collision handling between players
- Mobile-friendly touch controls

## Controls

### Desktop
- WASD: Movement
- Mouse: Look around
- Space: Jump
- Click: Interact with products

### Mobile
- Virtual Joystick: Movement
- Touch and drag: Look around
- Tap: Interact with products

## Project Structure

```
src/
├── components/     # React components
├── hooks/         # Custom hooks
├── stores/        # Zustand stores
├── api/           # API services
├── App.jsx        # Main application component
└── main.tsx       # Application entry point
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
