# ⌨️ Keyboard Visualizer & Hardware Diagnostics 🖥️

A sleek, offline-ready desktop application for testing laptop keyboards, touchpads, mice, displays, and inspecting full hardware specifications. Built with **Electron**, **React**, and **Tailwind CSS**, it works out of the box on fresh Windows installations without internet access or third-party GPU drivers.

## 🚀 Features

### 1. ⌨️ Keyboard Input Visualizer
- **Real-time Visualization**: See every keypress on a full 104-key virtual keyboard with a live **Tested Keys** counter.
- **Terminal Log**: Scrolling history of key codes for precise input tracking.
- **Multi-key Support**: Accurately highlights modifier combinations (Shift, Ctrl, Alt, Win, Numpad).
- **Dark Theme**: True obsidian/zinc dark mode with crisp emerald and white active states.

### 2. 🖱️ Touchpad & Mouse Tester
- **Fading Straight-Line Trail**: Smoothly draws a continuous straight-line tail behind your cursor that fades out automatically so you can spot dead zones or connection drops without cluttering the screen.
- **Full Screen Mode**: Expand the sensor test area to full screen with a floating HUD (`ESC` to exit).
- **Multi-Touch & Scroll Detection**: Tracks simultaneous touch contacts (1, 2, 3+ fingers) and two-finger scroll deltas.
- **Left / Middle / Right Key Testing**: Real-time click counters and pass/pending status checklist.

### 3. 🖥️ Screen Diagnostics
- **Color Tests**: Cycle through Primary (RGB), All (CMYK/RGB), and Greyscale shades to check for dead/stuck pixels, banding, and uniformity.
- **Motion Testing**: Standard and High-speed pan tests to detect ghosting and panel response time.
- **Fullscreen & Keyboard Controls**: Enters fullscreen automatically; use `Click` / `Space` / `Arrow` keys to cycle and `ESC` to exit.

### 4. 💻 Laptop Hardware Info (Offline System Probe)
- **Zero-Internet Hardware Detection**: Reads system specs offline via built-in Windows WMI/CIM and Registry queries:
  - **Display & Graphics**: Screen Size / Type (EDID physical dimensions), Max Resolution, Video Memory (including >4 GB GPUs), Graphics Type
  - **Core Hardware**: CPU Type, CPU Speed, Memory RAM (per-stick speed/slots), Storage (NVMe/SATA/SSD/HDD & volumes), Optical Drive
  - **Connectivity & Ports**: Wireless WiFi, Bluetooth, Cellular WWAN, External Ports & Controllers
  - **Peripherals & Power**: Audio, Webcam, Battery Capacity, **Battery Health & Cycle Count**, AC Adapter status
  - **System & Input**: Keyboard Layout, Operating System, Manufacturer, Model, BIOS Version
- **Per-Part Serial Numbers & Hardware IDs**: Displays unique serial numbers / hardware IDs for monitors, RAM sticks, storage drives, battery, CPU, GPU, and network adapters where exposed.
- **Export Reports**: **Copy Report** to clipboard or **Save File** as a clean, human-readable `.txt` diagnostic report.

## 🛠️ Tech Stack
- **Runtime**: [Electron](https://www.electronjs.org/)
- **Frontend**: [React](https://reactjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (bundled locally for offline use)
- **Hardware Probe**: Windows PowerShell CIM/WMI, Registry, Node `os`, and Electron `screen` / `powerMonitor`

## 🚦 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

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
5. Run as an Electron Desktop App:
   ```bash
   npm run electron-dev
   ```

### Building the Windows `.exe` Installer
To build the React bundle and package the standalone Windows installer into `/dist`:
```bash
npm run electron-pack
```

## 📂 Project Structure
```text
/public
  ├── electron.js           # Electron main process, IPC handlers & GPU fallback
  ├── systemInfo.js         # Offline Windows WMI/CIM hardware & serial probe
  └── index.html            # App HTML template
/src
  ├── App.js                # Main application entry point & tab navigation
  ├── KeyboardVisualizer.js # Keyboard visualizer & key history log
  ├── TouchpadTester.js     # Touchpad, mouse button & fullscreen trail tester
  ├── ScreenTester.js       # Screen diagnostic tests & motion animations
  ├── SystemInfo.js         # Hardware info UI, serials table & report export
  ├── index.css             # Tailwind directives & dark scrollbar styling
  └── index.js              # React DOM rendering
```

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is open-source and available under the MIT License.

---
*Created with ❤️ for the hardware community.*
