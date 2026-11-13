import React, { useState, useRef, useEffect, useCallback } from 'react';

const MAX_TRAIL_POINTS = 600;
const TRAIL_LIFETIME_MS = 1200;

export default function TouchpadTester() {
    // Button state
    const [buttonsState, setButtonsState] = useState({
        left: { pressed: false, clicks: 0, tested: false },
        middle: { pressed: false, clicks: 0, tested: false },
        right: { pressed: false, clicks: 0, tested: false },
    });

    // Touchpad / pointer tracking state
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, relX: 0, relY: 0 });
    const [isPointerInside, setIsPointerInside] = useState(false);
    const [activePointers, setActivePointers] = useState(new Map());
    const [maxSimultaneousFingers, setMaxSimultaneousFingers] = useState(0);
    const [scrollDelta, setScrollDelta] = useState({ deltaY: 0, deltaX: 0, totalScrolls: 0 });
    const [strokes, setStrokes] = useState([]);
    const [hasTrackedSurface, setHasTrackedSurface] = useState(false);
    const [renderNow, setRenderNow] = useState(() => Date.now());
    const [lastAction, setLastAction] = useState('Ready for testing');
    const [isFullscreen, setIsFullscreen] = useState(false);

    const padAreaRef = useRef(null);
    const fullscreenRef = useRef(null);
    const startNewStrokeRef = useRef(true);

    const totalTrailPoints = strokes.reduce((sum, s) => sum + s.length, 0);

    const updateMouseButton = useCallback((buttonIndex, isDown) => {
        const keyMap = { 0: 'left', 1: 'middle', 2: 'right' };
        const key = keyMap[buttonIndex];
        if (!key) return;

        setButtonsState(prev => ({
            ...prev,
            [key]: {
                pressed: isDown,
                clicks: isDown ? prev[key].clicks + 1 : prev[key].clicks,
                tested: true
            }
        }));
    }, []);

    // Track pointer movement & gestures within the touchpad area
    const handlePointerDown = (e) => {
        if (e.pointerType === 'mouse' || e.pointerType === 'touch' || e.pointerType === 'pen') {
            const padRect = padAreaRef.current?.getBoundingClientRect();
            const relX = padRect ? Math.round(e.clientX - padRect.left) : 0;
            const relY = padRect ? Math.round(e.clientY - padRect.top) : 0;

            setActivePointers(prev => {
                const next = new Map(prev);
                next.set(e.pointerId, { x: relX, y: relY, type: e.pointerType, pressure: e.pressure || 0 });
                if (next.size > maxSimultaneousFingers) {
                    setMaxSimultaneousFingers(next.size);
                }
                return next;
            });

            updateMouseButton(e.button, true);
            setLastAction(`Pointer Down: Button ${e.button} (${e.pointerType})`);
        }
    };

    const handlePointerMove = (e) => {
        const padRect = padAreaRef.current?.getBoundingClientRect();
        if (!padRect) return;

        const relX = Math.round(Math.max(0, Math.min(padRect.width, e.clientX - padRect.left)));
        const relY = Math.round(Math.max(0, Math.min(padRect.height, e.clientY - padRect.top)));

        setCursorPos({
            x: Math.round(e.clientX),
            y: Math.round(e.clientY),
            relX,
            relY
        });

        setActivePointers(prev => {
            if (prev.has(e.pointerId)) {
                const next = new Map(prev);
                next.set(e.pointerId, { x: relX, y: relY, type: e.pointerType, pressure: e.pressure || 0 });
                return next;
            }
            return prev;
        });

        const now = Date.now();
        setHasTrackedSurface(true);

        // Append to continuous fading straight-line stroke
        setStrokes(prev => {
            const next = prev.map(s => s);
            if (startNewStrokeRef.current || next.length === 0) {
                next.push([{ x: relX, y: relY, t: now }]);
                startNewStrokeRef.current = false;
            } else {
                const lastStroke = next[next.length - 1];
                const lastPt = lastStroke[lastStroke.length - 1];
                if (!lastPt || lastPt.x !== relX || lastPt.y !== relY) {
                    next[next.length - 1] = [...lastStroke, { x: relX, y: relY, t: now }];
                }
            }

            // Cap total points to keep rendering smooth
            let count = next.reduce((acc, s) => acc + s.length, 0);
            while (count > MAX_TRAIL_POINTS && next.length > 0) {
                const overflow = count - MAX_TRAIL_POINTS;
                if (next[0].length <= overflow) {
                    count -= next[0].length;
                    next.shift();
                } else {
                    next[0] = next[0].slice(overflow);
                    count -= overflow;
                }
            }
            return next;
        });
    };

    const handlePointerUp = (e) => {
        setActivePointers(prev => {
            const next = new Map(prev);
            next.delete(e.pointerId);
            return next;
        });
        updateMouseButton(e.button, false);
        setLastAction(`Pointer Released (${e.pointerType})`);
    };

    const handleWheel = (e) => {
        e.preventDefault();
        setScrollDelta(prev => ({
            deltaX: Math.round(e.deltaX),
            deltaY: Math.round(e.deltaY),
            totalScrolls: prev.totalScrolls + 1
        }));
        setLastAction(`Scroll Gesture: dX=${Math.round(e.deltaX)}, dY=${Math.round(e.deltaY)}`);
    };

    // Global listener for mouse buttons so physical buttons click anywhere works
    const handleGlobalMouseDown = useCallback((e) => {
        updateMouseButton(e.button, true);
    }, [updateMouseButton]);

    const handleGlobalMouseUp = useCallback((e) => {
        updateMouseButton(e.button, false);
    }, [updateMouseButton]);

    const handleContextMenu = (e) => {
        e.preventDefault();
    };

    useEffect(() => {
        window.addEventListener('mousedown', handleGlobalMouseDown);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        window.addEventListener('contextmenu', handleContextMenu);
        return () => {
            window.removeEventListener('mousedown', handleGlobalMouseDown);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [handleGlobalMouseDown, handleGlobalMouseUp]);

    const clearTrail = () => {
        setStrokes([]);
        startNewStrokeRef.current = true;
        setLastAction('Trail cleared.');
    };

    const resetTest = () => {
        setButtonsState({
            left: { pressed: false, clicks: 0, tested: false },
            middle: { pressed: false, clicks: 0, tested: false },
            right: { pressed: false, clicks: 0, tested: false },
        });
        setMaxSimultaneousFingers(0);
        setActivePointers(new Map());
        setScrollDelta({ deltaY: 0, deltaX: 0, totalScrolls: 0 });
        setStrokes([]);
        setHasTrackedSurface(false);
        startNewStrokeRef.current = true;
        setLastAction('Reset complete. Ready for testing.');
    };

    // Prune expired trail points so the tail fades and disappears naturally
    useEffect(() => {
        if (strokes.length === 0) return;
        let rafId;
        const tick = () => {
            const now = Date.now();
            setRenderNow(now);
            setStrokes((prev) => {
                let changed = false;
                const filtered = prev
                    .map((stroke) => {
                        const kept = stroke.filter((pt) => now - pt.t < TRAIL_LIFETIME_MS);
                        if (kept.length !== stroke.length) changed = true;
                        return kept;
                    })
                    .filter((stroke) => stroke.length > 0);
                if (filtered.length !== prev.length) changed = true;
                return changed ? filtered : prev;
            });
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [strokes.length]);

    const enterFullscreen = () => {
        setStrokes([]);
        startNewStrokeRef.current = true;
        setIsFullscreen(true);
        setTimeout(() => {
            if (fullscreenRef.current && fullscreenRef.current.requestFullscreen) {
                fullscreenRef.current.requestFullscreen().catch(() => {});
            }
        }, 0);
    };

    const exitFullscreen = useCallback(() => {
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
        setStrokes([]);
        startNewStrokeRef.current = true;
        setIsFullscreen(false);
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                setStrokes([]);
                startNewStrokeRef.current = true;
                setIsFullscreen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isFullscreen) {
                exitFullscreen();
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isFullscreen, exitFullscreen]);

    const pointerCount = activePointers.size;

    const renderPadSurface = (fullscreenMode) => (
        <div
            ref={padAreaRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerEnter={() => {
                setIsPointerInside(true);
                startNewStrokeRef.current = true;
            }}
            onPointerLeave={() => {
                setIsPointerInside(false);
                setActivePointers(new Map());
                startNewStrokeRef.current = true;
            }}
            onWheel={handleWheel}
            className={`relative w-full overflow-hidden flex flex-col items-center justify-center cursor-crosshair transition-all duration-150 ${
                fullscreenMode
                    ? 'flex-1 bg-zinc-950'
                    : `h-80 rounded-xl border ${
                        isPointerInside
                            ? 'bg-zinc-950 border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.12)]'
                            : 'bg-zinc-900/70 border-zinc-800 shadow-xl'
                    }`
            }`}
            style={{ touchAction: 'none' }}
        >
            {/* Grid texture for touchpad */}
            <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(to right, #27272a 1px, transparent 1px), linear-gradient(to bottom, #27272a 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                }}
            />

            {/* Straight-line fading motion trail */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {strokes.map((stroke, idx) => {
                    if (stroke.length === 0) return null;
                    if (stroke.length === 1) {
                        const opacity = Math.max(0, 1 - (renderNow - stroke[0].t) / TRAIL_LIFETIME_MS);
                        return (
                            <circle
                                key={idx}
                                cx={stroke[0].x}
                                cy={stroke[0].y}
                                r={2.5}
                                fill="#34d399"
                                opacity={opacity}
                            />
                        );
                    }
                    return stroke.slice(1).map((pt, segIdx) => {
                        const prevPt = stroke[segIdx];
                        const opacity = Math.max(0, 1 - (renderNow - pt.t) / TRAIL_LIFETIME_MS);
                        return (
                            <line
                                key={`${idx}-${segIdx}`}
                                x1={prevPt.x}
                                y1={prevPt.y}
                                x2={pt.x}
                                y2={pt.y}
                                stroke="#34d399"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                opacity={opacity * 0.95}
                            />
                        );
                    });
                })}
                {isPointerInside && (
                    <circle
                        cx={cursorPos.relX}
                        cy={cursorPos.relY}
                        r={4.5}
                        fill="#a7f3d0"
                        stroke="#059669"
                        strokeWidth="1.5"
                    />
                )}
            </svg>

            {/* Active Touch Contacts */}
            {Array.from(activePointers.entries()).map(([id, contact], index) => (
                <div
                    key={id}
                    className="absolute pointer-events-none flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2 transition-transform"
                    style={{ left: contact.x, top: contact.y }}
                >
                    <div className="w-12 h-12 rounded-full border-2 border-emerald-400 bg-emerald-500/20 animate-ping absolute" />
                    <div className="w-8 h-8 rounded-full border-2 border-emerald-300 bg-emerald-500/30 flex items-center justify-center text-[10px] font-mono font-bold text-white shadow-lg">
                        {index + 1}
                    </div>
                    <span className="text-[10px] font-mono text-emerald-300 mt-1 bg-zinc-950/80 px-1.5 rounded border border-zinc-800">
                        {contact.type}
                    </span>
                </div>
            ))}

            {/* Instruction text overlay */}
            {totalTrailPoints === 0 && pointerCount === 0 && (
                <div className="text-center z-10 pointer-events-none p-4">
                    <div className="text-zinc-300 font-mono text-sm mb-1 tracking-wider">
                        {fullscreenMode ? 'FULLSCREEN TOUCHPAD & MOUSE TEST AREA' : 'TOUCHPAD SENSOR TEST AREA'}
                    </div>
                    <p className="text-xs text-zinc-500 max-w-md">
                        Move across the surface to draw a continuous straight-line tail and spot any dead zones or connection drops. Tap or swipe with 2+ fingers to test multi-touch and scroll.
                    </p>
                </div>
            )}

            {/* Live Touch Counter pill (non-fullscreen) */}
            {!fullscreenMode && (
                <>
                    <div className="absolute top-3 left-3 bg-zinc-950/90 border border-zinc-800 text-xs font-mono px-2.5 py-1 rounded-md text-zinc-300 backdrop-blur-sm pointer-events-none">
                        TOUCH CONTACTS: <span className="font-bold text-emerald-400">{pointerCount}</span>
                    </div>
                    <div className="absolute top-3 right-3 bg-zinc-950/90 border border-zinc-800 text-xs font-mono px-2.5 py-1 rounded-md text-zinc-300 backdrop-blur-sm pointer-events-none">
                        X: <span className="text-emerald-400">{cursorPos.relX}</span> Y: <span className="text-emerald-400">{cursorPos.relY}</span>
                    </div>
                </>
            )}
        </div>
    );

    if (isFullscreen) {
        return (
            <div ref={fullscreenRef} className="fixed inset-0 z-50 bg-zinc-950 flex flex-col select-none">
                {/* Floating Top HUD */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-zinc-900/95 border-b border-zinc-800 font-mono text-xs z-20">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded text-zinc-300">
                            CONTACTS: <span className="font-bold text-emerald-400">{pointerCount}</span>
                        </div>
                        <div className="bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded text-zinc-300">
                            X: <span className="text-emerald-400">{cursorPos.relX}</span> Y: <span className="text-emerald-400">{cursorPos.relY}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-1 rounded border ${buttonsState.left.pressed ? 'bg-emerald-500 text-zinc-950 border-emerald-300 font-bold' : buttonsState.left.tested ? 'bg-emerald-950/70 text-emerald-400 border-emerald-700/60' : 'bg-zinc-950 text-zinc-500 border-zinc-800'}`}>
                                L ({buttonsState.left.clicks})
                            </span>
                            <span className={`px-2 py-1 rounded border ${buttonsState.middle.pressed ? 'bg-amber-500 text-zinc-950 border-amber-300 font-bold' : buttonsState.middle.tested ? 'bg-amber-950/70 text-amber-400 border-amber-700/60' : 'bg-zinc-950 text-zinc-500 border-zinc-800'}`}>
                                M ({buttonsState.middle.clicks})
                            </span>
                            <span className={`px-2 py-1 rounded border ${buttonsState.right.pressed ? 'bg-zinc-100 text-zinc-950 border-white font-bold' : buttonsState.right.tested ? 'bg-zinc-800 text-zinc-200 border-zinc-600' : 'bg-zinc-950 text-zinc-500 border-zinc-800'}`}>
                                R ({buttonsState.right.clicks})
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={clearTrail}
                            className="bg-zinc-800 text-zinc-200 border border-zinc-700 rounded px-3 py-1 hover:bg-zinc-700 hover:text-white transition-colors"
                        >
                            CLEAR TRAIL
                        </button>
                        <button
                            onClick={resetTest}
                            className="bg-zinc-800 text-zinc-200 border border-zinc-700 rounded px-3 py-1 hover:bg-zinc-700 hover:text-white transition-colors"
                        >
                            RESET
                        </button>
                        <button
                            onClick={exitFullscreen}
                            className="bg-red-950/80 text-red-200 border border-red-800/80 rounded px-3 py-1 hover:bg-red-700 hover:text-white transition-colors"
                        >
                            EXIT FULLSCREEN (ESC)
                        </button>
                    </div>
                </div>

                {renderPadSurface(true)}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center w-full select-none">
            {/* Header */}
            <header className="flex flex-wrap justify-between items-center mb-6 border-b border-zinc-800 pb-3 w-full gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-widest text-zinc-100">
                        TOUCHPAD &amp; MOUSE TESTER
                    </h1>
                    <p className="text-xs text-zinc-500 font-mono">SYSTEM: TOUCH-SENSE v1.2 • MULTI-TOUCH &amp; BUTTON DIAGNOSTICS</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={enterFullscreen}
                        className="bg-emerald-950/60 text-emerald-300 border border-emerald-700/70 rounded-lg px-4 py-2 text-sm font-mono hover:bg-emerald-500 hover:text-zinc-950 transition-all duration-150"
                    >
                        FULL SCREEN
                    </button>
                    <button
                        onClick={clearTrail}
                        className="bg-zinc-900 text-zinc-300 border border-zinc-700 rounded-lg px-4 py-2 text-sm font-mono hover:bg-zinc-100 hover:text-zinc-950 transition-all duration-150"
                    >
                        CLEAR TRAIL
                    </button>
                    <button
                        onClick={resetTest}
                        className="bg-zinc-900 text-zinc-300 border border-zinc-700 rounded-lg px-4 py-2 text-sm font-mono hover:bg-zinc-100 hover:text-zinc-950 transition-all duration-150"
                    >
                        RESET
                    </button>
                </div>
            </header>

            {/* Main Diagnostics Container */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
                {/* Left/Middle Column: Touchpad Interactive Area */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    {renderPadSurface(false)}

                    {/* Integrated Left / Middle / Right Physical Key Indicators */}
                    <div className="grid grid-cols-3 gap-3 w-full">
                        {/* Left Key */}
                        <div
                            onContextMenu={(e) => e.preventDefault()}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-100 cursor-pointer ${
                                buttonsState.left.pressed
                                    ? 'bg-emerald-500 text-zinc-950 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)] scale-[0.98]'
                                    : buttonsState.left.tested
                                        ? 'bg-zinc-900 border-emerald-600/70 text-emerald-400'
                                        : 'bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                            }`}
                        >
                            <span className="font-mono font-bold text-sm">LEFT KEY</span>
                            <span className="text-xs font-mono mt-1 opacity-80">
                                {buttonsState.left.pressed ? 'PRESSED' : buttonsState.left.tested ? `TESTED (${buttonsState.left.clicks})` : 'NOT TESTED'}
                            </span>
                        </div>

                        {/* Middle Key / Wheel Click */}
                        <div
                            onContextMenu={(e) => e.preventDefault()}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-100 cursor-pointer ${
                                buttonsState.middle.pressed
                                    ? 'bg-amber-500 text-zinc-950 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-[0.98]'
                                    : buttonsState.middle.tested
                                        ? 'bg-zinc-900 border-amber-600/70 text-amber-400'
                                        : 'bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                            }`}
                        >
                            <span className="font-mono font-bold text-sm">MIDDLE KEY</span>
                            <span className="text-xs font-mono mt-1 opacity-80">
                                {buttonsState.middle.pressed ? 'PRESSED' : buttonsState.middle.tested ? `TESTED (${buttonsState.middle.clicks})` : 'NOT TESTED'}
                            </span>
                        </div>

                        {/* Right Key */}
                        <div
                            onContextMenu={(e) => e.preventDefault()}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-100 cursor-pointer ${
                                buttonsState.right.pressed
                                    ? 'bg-zinc-100 text-zinc-950 border-white shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-[0.98]'
                                    : buttonsState.right.tested
                                        ? 'bg-zinc-900 border-zinc-500 text-zinc-100'
                                        : 'bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                            }`}
                        >
                            <span className="font-mono font-bold text-sm">RIGHT KEY</span>
                            <span className="text-xs font-mono mt-1 opacity-80">
                                {buttonsState.right.pressed ? 'PRESSED' : buttonsState.right.tested ? `TESTED (${buttonsState.right.clicks})` : 'NOT TESTED'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Sensor Metrics & Checklist */}
                <div className="flex flex-col gap-4">
                    {/* Status Checklist Card */}
                    <div className="p-4 bg-zinc-900/70 rounded-xl border border-zinc-800 shadow-xl flex flex-col gap-3 font-mono">
                        <div className="text-sm font-bold text-zinc-200 border-b border-zinc-800 pb-2 flex justify-between items-center">
                            <span>HARDWARE VERIFICATION</span>
                            <span className="text-xs font-normal text-emerald-400">STATUS</span>
                        </div>

                        {/* Item: Left Click */}
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-400">Left Click Sensor</span>
                            <span className={`px-2 py-0.5 rounded font-semibold ${buttonsState.left.tested ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50' : 'bg-zinc-800 text-zinc-500'}`}>
                                {buttonsState.left.tested ? 'PASSED' : 'PENDING'}
                            </span>
                        </div>

                        {/* Item: Right Click */}
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-400">Right Click Sensor</span>
                            <span className={`px-2 py-0.5 rounded font-semibold ${buttonsState.right.tested ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50' : 'bg-zinc-800 text-zinc-500'}`}>
                                {buttonsState.right.tested ? 'PASSED' : 'PENDING'}
                            </span>
                        </div>

                        {/* Item: Middle Click */}
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-400">Middle Click / Wheel</span>
                            <span className={`px-2 py-0.5 rounded font-semibold ${buttonsState.middle.tested ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50' : 'bg-zinc-800 text-zinc-500'}`}>
                                {buttonsState.middle.tested ? 'PASSED' : 'OPTIONAL'}
                            </span>
                        </div>

                        {/* Item: Touch Tracking */}
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-400">Touch Surface Tracking</span>
                            <span className={`px-2 py-0.5 rounded font-semibold ${hasTrackedSurface ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50' : 'bg-zinc-800 text-zinc-500'}`}>
                                {hasTrackedSurface ? 'PASSED' : 'PENDING'}
                            </span>
                        </div>

                        {/* Item: Multi-touch */}
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-400">Multi-Touch Detection</span>
                            <span className={`px-2 py-0.5 rounded font-semibold ${maxSimultaneousFingers >= 2 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50' : 'bg-zinc-800 text-zinc-500'}`}>
                                {maxSimultaneousFingers >= 2 ? `${maxSimultaneousFingers} FINGERS` : 'PENDING'}
                            </span>
                        </div>

                        {/* Item: Two-finger scroll */}
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-400">Touchpad Scroll Gesture</span>
                            <span className={`px-2 py-0.5 rounded font-semibold ${scrollDelta.totalScrolls > 0 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50' : 'bg-zinc-800 text-zinc-500'}`}>
                                {scrollDelta.totalScrolls > 0 ? 'DETECTED' : 'PENDING'}
                            </span>
                        </div>
                    </div>

                    {/* Sensor Telemetry Card */}
                    <div className="p-4 bg-zinc-900/70 rounded-xl border border-zinc-800 shadow-xl flex flex-col gap-2 font-mono text-xs">
                        <div className="text-sm font-bold text-zinc-200 border-b border-zinc-800 pb-2">
                            TOUCH TELEMETRY
                        </div>
                        <div className="flex justify-between text-zinc-400">
                            <span>Max Contacts Seen:</span>
                            <span className="text-emerald-400 font-bold">{maxSimultaneousFingers}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                            <span>Last Scroll Delta:</span>
                            <span className="text-zinc-200">X: {scrollDelta.deltaX} | Y: {scrollDelta.deltaY}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                            <span>Total Scroll Events:</span>
                            <span className="text-zinc-200">{scrollDelta.totalScrolls}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                            <span>Global Cursor:</span>
                            <span className="text-zinc-200">{cursorPos.x}, {cursorPos.y}</span>
                        </div>
                    </div>

                    {/* Event Log Output */}
                    <div className="p-3 bg-zinc-900/70 rounded-xl border border-zinc-800 font-mono text-xs text-left">
                        <span className="text-zinc-600">&gt; </span>
                        <span className="text-zinc-300">{lastAction}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
