# ⌨️ Keyboard Visualizer & Screen Tester 🖥️

A sleek, modern desktop application for visualizing keyboard inputs and diagnosing screen quality. Built with **Electron**, **React**, and **Tailwind CSS**, this tool provides real-time feedback for gamers, developers, and hardware enthusiasts.

## 🚀 Features

### 1. ⌨️ Keyboard Input Visualizer
- **Real-time Visualization**: See every keypress on a high-fidelity virtual keyboard.
- **Terminal Log**: A scrolling history of key codes for precise input tracking.
- **Multi-key Support**: Accurately shows combinations (Shift, Ctrl, Alt, etc.).
- **Modern Aesthetic**: Dark mode by default with glowing effects and a "terminal" feel.

### 2. 🖥️ Screen Diagnostics
- **Color Tests**: Cycle through Primary (RGB) and All (CMYK/RGB) colors to check for dead pixels and color accuracy.
- **Grayscale Test**: Check for display banding and backlight uniformity.
- **Motion Testing**: Standard and High-speed pan tests to detect ghosting and response time issues.
- **Fullscreen Mode**: Automatically enters full screen for immersive, distraction-free testing.
- **Desktop Ready**: Works as a standalone cross-platform desktop application.

## 🛠️ Tech Stack
- **Runtime**: [Electron](https://www.electronjs.org/)
- **Frontend**: [React](https://reactjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: React Hooks (`useState`, `useEffect`, `useCallback`)
- **Animation**: `requestAnimationFrame` for buttery-smooth motion tests.

## 🚦 Getting Started

### Prerequisites
- Node.js (v14+)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/zxmichael95/Keyboard-Screen-Tester.git
   ```
2. Navigate to the project directory:
   ```bash
   cd keyboard-visualizer
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the React development server:
   ```bash
   npm start
   ```
5. Running as a Desktop App:
   ```bash
   npm run electron-dev
   ```

### Building for Production
To package the app for your operating system:
```bash
npm run electron-pack
```
The packaged application will be available in the `/dist` directory.

## 📂 Project Structure
```text
/src
  ├── App.js               # Main application entry point & navigation
  ├── KeyboardVisualizer.js # Keyboard visualizer logic & styles
  ├── ScreenTester.js       # Screen diagnostic tests & animations
  └── index.js             # React DOM rendering
```

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is open-source and available under the MIT License.

---
*Created with ❤️ for the hardware community.*
