import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- KEYBOARD LAYOUT DATA ---
const mainKeysLayout = [
    // Function Row
    [
        { label: 'ESC', code: 'Escape', width: 1.5 }, { spacer: true, width: 0.5 },
        { label: 'F1', code: 'F1', width: 1 }, { label: 'F2', code: 'F2', width: 1 },
        { label: 'F3', code: 'F3', width: 1 }, { label: 'F4', code: 'F4', width: 1 }, { spacer: true, width: 0.5 },
        { label: 'F5', code: 'F5', width: 1 }, { label: 'F6', code: 'F6', width: 1 },
        { label: 'F7', code: 'F7', width: 1 }, { label: 'F8', code: 'F8', width: 1 }, { spacer: true, width: 0.5 },
        { label: 'F9', code: 'F9', width: 1 }, { label: 'F10', code: 'F10', width: 1 },
        { label: 'F11', code: 'F11', width: 1 }, { label: 'F12', code: 'F12', width: 1 },
    ],
    // Row 1
    [
        { label: '`', code: 'Backquote', width: 1 }, { label: '1', code: 'Digit1', width: 1 },
        { label: '2', code: 'Digit2', width: 1 }, { label: '3', code: 'Digit3', width: 1 },
        { label: '4', code: 'Digit4', width: 1 }, { label: '5', code: 'Digit5', width: 1 },
        { label: '6', code: 'Digit6', width: 1 }, { label: '7', code: 'Digit7', width: 1 },
        { label: '8', code: 'Digit8', width: 1 }, { label: '9', code: 'Digit9', width: 1 },
        { label: '0', code: 'Digit0', width: 1 }, { label: '-', code: 'Minus', width: 1 },
        { label: '=', code: 'Equal', width: 1 }, { label: 'Backspace', code: 'Backspace', width: 2.1 },
    ],
    // Row 2
    [
        { label: 'Tab', code: 'Tab', width: 1.5 }, { label: 'Q', code: 'KeyQ', width: 1 },
        { label: 'W', code: 'KeyW', width: 1 }, { label: 'E', code: 'KeyE', width: 1 },
        { label: 'R', code: 'KeyR', width: 1 }, { label: 'T', code: 'KeyT', width: 1 },
        { label: 'Y', code: 'KeyY', width: 1 }, { label: 'U', code: 'KeyU', width: 1 },
        { label: 'I', code: 'KeyI', width: 1 }, { label: 'O', code: 'KeyO', width: 1 },
        { label: 'P', code: 'KeyP', width: 1 }, { label: '[', code: 'BracketLeft', width: 1 },
        { label: ']', code: 'BracketRight', width: 1 }, { label: '\\', code: 'Backslash', width: 1.6 },
    ],
    // Row 3
    [
        { label: 'Caps Lock', code: 'CapsLock', width: 1.8 }, { label: 'A', code: 'KeyA', width: 1 },
        { label: 'S', code: 'KeyS', width: 1 }, { label: 'D', code: 'KeyD', width: 1 },
        { label: 'F', code: 'KeyF', width: 1 }, { label: 'G', code: 'KeyG', width: 1 },
        { label: 'H', code: 'KeyH', width: 1 }, { label: 'J', code: 'KeyJ', width: 1 },
        { label: 'K', code: 'KeyK', width: 1 }, { label: 'L', code: 'KeyL', width: 1 },
        { label: ';', code: 'Semicolon', width: 1 }, { label: "'", code: 'Quote', width: 1 },
        { label: 'Enter', code: 'Enter', width: 2.3 },
    ],
    // Row 4
    [
        { label: 'Shift', code: 'ShiftLeft', width: 2.3 }, { label: 'Z', code: 'KeyZ', width: 1 },
        { label: 'X', code: 'KeyX', width: 1 }, { label: 'C', code: 'KeyC', width: 1 },
        { label: 'V', code: 'KeyV', width: 1 }, { label: 'B', code: 'KeyB', width: 1 },
        { label: 'N', code: 'KeyN', width: 1 }, { label: 'M', code: 'KeyM', width: 1 },
        { label: ',', code: 'Comma', width: 1 }, { label: '.', code: 'Period', width: 1 },
        { label: '/', code: 'Slash', width: 1 }, { label: 'Shift', code: 'ShiftRight', width: 2.8 },
    ],
    // Row 5
    [
        { label: 'Ctrl', code: 'ControlLeft', width: 1.5 }, { label: 'Win', code: 'MetaLeft', width: 1.2 },
        { label: 'Alt', code: 'AltLeft', width: 1.5 }, { label: 'Space', code: 'Space', width: 6.25 },
        { label: 'Alt', code: 'AltRight', width: 1.5 }, { label: 'Win', code: 'MetaRight', width: 1.2 },
        { label: 'Menu', code: 'ContextMenu', width: 1.2 }, { label: 'Ctrl', code: 'ControlRight', width: 1.75 },
    ],
];

const navLayout = [
    [
        { label: 'PrtSc', code: 'PrintScreen', width: 1 },
        { label: 'ScrLk', code: 'ScrollLock', width: 1 },
        { label: 'Pause', code: 'Pause', width: 1 },
    ],
    [
        { label: 'Ins', code: 'Insert', width: 1 },
        { label: 'Home', code: 'Home', width: 1 },
        { label: 'PgUp', code: 'PageUp', width: 1 },
    ],
    [
        { label: 'Del', code: 'Delete', width: 1 },
        { label: 'End', code: 'End', width: 1 },
        { label: 'PgDn', code: 'PageDown', width: 1 },
    ],
];

const arrowLayout = [
    [{ spacer: true, width: 1 }, { label: '▲', code: 'ArrowUp', width: 1 }, { spacer: true, width: 1 }],
    [{ label: '◄', code: 'ArrowLeft', width: 1 }, { label: '▼', code: 'ArrowDown', width: 1 }, { label: '►', code: 'ArrowRight', width: 1 }],
];

const numpadLayout = [
    [
        { label: 'NumLk', code: 'NumLock', width: 1 }, { label: '/', code: 'NumpadDivide', width: 1 },
        { label: '*', code: 'NumpadMultiply', width: 1 }, { label: '-', code: 'NumpadSubtract', width: 1 },
    ],
    [
        { label: '7', code: 'Numpad7', width: 1 }, { label: '8', code: 'Numpad8', width: 1 },
        { label: '9', code: 'Numpad9', width: 1 }, { label: '+', code: 'NumpadAdd', width: 1, span: 2 },
    ],
    [
        { label: '4', code: 'Numpad4', width: 1 }, { label: '5', code: 'Numpad5', width: 1 },
        { label: '6', code: 'Numpad6', width: 1 },
    ],
    [
        { label: '1', code: 'Numpad1', width: 1 }, { label: '2', code: 'Numpad2', width: 1 },
        { label: '3', code: 'Numpad3', width: 1 }, { label: 'Enter', code: 'NumpadEnter', width: 1, span: 2 },
    ],
    [
        { label: '0', code: 'Numpad0', width: 2.1 }, { label: '.', code: 'NumpadDecimal', width: 1 },
    ],
];

/**
 * Key Component - Renders a single key
 */
const Key = ({ label, width, isPressed, isRePressed, span = 1 }) => {
    const baseStyle = "flex relative items-center justify-center h-12 rounded-lg border p-1 text-center text-xs sm:text-sm font-mono transition-all duration-100 ease-out select-none";

    const keyClasses = [baseStyle];
    if (isRePressed) {
        keyClasses.push("bg-white text-zinc-950 border-white shadow-[0_0_20px_4px_rgba(255,255,255,0.45)] scale-105 z-10 font-bold");
    } else if (isPressed) {
        keyClasses.push("bg-emerald-500/20 text-emerald-300 border-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.25)] font-semibold");
    } else {
        keyClasses.push("bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700");
    }

    const widthStyle = { flexBasis: `calc(${width * 3.25}rem - 6px)`, flexGrow: width };
    const spanStyle = { gridRow: `span ${span} / span ${span}` };

    return (
        <div style={{...widthStyle, ...spanStyle}} className={keyClasses.join(' ')}>
            <span>{label}</span>
        </div>
    );
};

/**
 * KeyboardSection Component - Renders a section of the keyboard
 */
const KeyboardSection = ({ layout, pressedKeys, rePressedKey }) => (
    <div className="flex flex-col gap-1.5">
        {layout.map((row, rowIndex) => (
            <div key={rowIndex} className="flex w-full items-stretch justify-center gap-1.5">
                {row.map((key, keyIndex) => {
                    if (key.spacer) return <div key={keyIndex} style={{ flexBasis: `calc(${key.width * 3.5}rem - 6px)`, flexGrow: key.width }}></div>;

                    let isPressed = pressedKeys.has(key.code) ||
                        ((key.code === 'ShiftLeft' || key.code === 'ShiftRight') && (pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight'))) ||
                        ((key.code === 'ControlLeft' || key.code === 'ControlRight') && (pressedKeys.has('ControlLeft') || pressedKeys.has('ControlRight'))) ||
                        ((key.code === 'AltLeft' || key.code === 'AltRight') && (pressedKeys.has('AltLeft') || pressedKeys.has('AltRight'))) ||
                        ((key.code === 'Enter' || key.code === 'NumpadEnter') && (pressedKeys.has('Enter') || pressedKeys.has('NumpadEnter')));

                    let isRePressed = rePressedKey === key.code ||
                        ((key.code === 'ShiftLeft' || key.code === 'ShiftRight') && (rePressedKey === 'ShiftLeft' || rePressedKey === 'ShiftRight')) ||
                        ((key.code === 'ControlLeft' || key.code === 'ControlRight') && (rePressedKey === 'ControlLeft' || rePressedKey === 'ControlRight')) ||
                        ((key.code === 'AltLeft' || key.code === 'AltRight') && (rePressedKey === 'AltLeft' || rePressedKey === 'AltRight')) ||
                        ((key.code === 'Enter' || key.code === 'NumpadEnter') && (rePressedKey === 'Enter' || rePressedKey === 'NumpadEnter'));

                    return <Key key={key.code} {...key} isPressed={isPressed} isRePressed={isRePressed} />;
                })}
            </div>
        ))}
    </div>
);

export default function KeyboardVisualizer() {
    const [pressedKeys, setPressedKeys] = useState(new Set());
    const [rePressedKey, setRePressedKey] = useState(null);
    const [keyHistory, setKeyHistory] = useState([]);
    const terminalRef = useRef(null);
    const rePressTimeoutRef = useRef(null);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [keyHistory]);

    useEffect(() => {
        return () => {
            if (rePressTimeoutRef.current) {
                clearTimeout(rePressTimeoutRef.current);
            }
        };
    }, []);

    const handleKeyDown = useCallback((e) => {
        if (e.repeat) return;
        e.preventDefault();
        const { code } = e;
        setPressedKeys(current => {
            if (current.has(code)) {
                setRePressedKey(code);
                if (rePressTimeoutRef.current) {
                    clearTimeout(rePressTimeoutRef.current);
                }
                rePressTimeoutRef.current = setTimeout(() => setRePressedKey(null), 150);
            }
            return new Set(current).add(code);
        });
        setKeyHistory(prev => {
            const next = [...prev, code];
            return next.length > 200 ? next.slice(next.length - 200) : next;
        });
    }, []);

    const resetHighlights = () => {
        setPressedKeys(new Set());
        setRePressedKey(null);
        setKeyHistory([]);
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return (
        <div className="flex flex-col items-center w-full">
            <header className="flex justify-between items-center mb-5 border-b border-zinc-800 pb-3 w-full gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-widest text-zinc-100">KEYBOARD INPUT VISUALIZER</h1>
                    <p className="text-xs text-zinc-500 font-mono">SYSTEM: MONO-TERM v2.3 • TESTED KEYS: <span className="text-emerald-400 font-semibold">{pressedKeys.size}</span></p>
                </div>
                <button
                    onClick={resetHighlights}
                    className="bg-zinc-900 text-zinc-200 border border-zinc-700 rounded-lg px-4 py-2 text-sm font-mono hover:bg-zinc-100 hover:text-zinc-950 transition-all duration-150"
                >
                    RESET
                </button>
            </header>

            <div className="w-full overflow-x-auto pb-2">
                <main className="flex flex-row items-start justify-center gap-5 p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 shadow-2xl min-w-max mx-auto">
                    <KeyboardSection layout={mainKeysLayout} pressedKeys={pressedKeys} rePressedKey={rePressedKey} />
                    <div className="flex flex-col gap-4">
                        <KeyboardSection layout={navLayout} pressedKeys={pressedKeys} rePressedKey={rePressedKey} />
                        <KeyboardSection layout={arrowLayout} pressedKeys={pressedKeys} rePressedKey={rePressedKey} />
                    </div>
                    <KeyboardSection layout={numpadLayout} pressedKeys={pressedKeys} rePressedKey={rePressedKey} />
                </main>
            </div>

            <footer ref={terminalRef} className="mt-4 p-3 h-36 w-full bg-zinc-900/70 rounded-xl border border-zinc-800 overflow-y-auto font-mono text-left text-zinc-300 shadow-inner">
                {keyHistory.map((key, index) => (
                    <div key={index} className="leading-relaxed">
                        <span className="text-zinc-600 mr-2">&gt;</span>
                        <span className="text-sm">{key}</span>
                    </div>
                ))}
                <div className="flex items-center">
                    <span className="text-zinc-600 mr-2">&gt;</span>
                    <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse" style={{ animationDuration: '1.5s' }}></span>
                </div>
            </footer>
        </div>
    );
}
