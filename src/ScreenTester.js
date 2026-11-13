import React, { useState, useEffect, useRef, useCallback } from 'react';

const COLORS = {
    grey: ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF'],
    primary: ['#FF0000', '#00FF00', '#0000FF'],
    all: ['#FF0000', '#00FF00', '#0000FF', '#00FFFF', '#FF00FF', '#FFFF00', '#FFFFFF', '#000000'],
};

export default function ScreenTester() {
    const [activeTest, setActiveTest] = useState(null); // 'grey', 'primary', 'all', 'motion', 'fast-motion'
    const [testStep, setTestStep] = useState(0);
    const containerRef = useRef(null);
    const requestRef = useRef(null);

    const exitTest = useCallback(() => {
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
        setActiveTest(null);
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
        }
    }, []);

    const startTest = (testName) => {
        setActiveTest(testName);
        setTestStep(0);
        setTimeout(() => {
            if (containerRef.current && containerRef.current.requestFullscreen) {
                containerRef.current.requestFullscreen().catch(() => {});
            }
        }, 0);
    };

    const stepColor = useCallback((delta) => {
        if (activeTest === 'grey' || activeTest === 'primary' || activeTest === 'all') {
            const len = COLORS[activeTest].length;
            setTestStep((prev) => (prev + delta + len) % len);
        }
    }, [activeTest]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                setActiveTest(null);
                if (requestRef.current) {
                    cancelAnimationFrame(requestRef.current);
                }
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!activeTest) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                exitTest();
            } else if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') {
                e.preventDefault();
                stepColor(1);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                stepColor(-1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTest, exitTest, stepColor]);

    useEffect(() => {
        const animate = () => {
            if (activeTest === 'motion' || activeTest === 'fast-motion') {
                setTestStep((prev) => {
                    const speed = activeTest === 'fast-motion' ? 25 : 5;
                    const width = window.screen.width || window.innerWidth;
                    return (prev + speed) % width;
                });
                requestRef.current = requestAnimationFrame(animate);
            }
        };

        if (activeTest === 'motion' || activeTest === 'fast-motion') {
            requestRef.current = requestAnimationFrame(animate);
        } else if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
        }
        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [activeTest]);

    const renderTestContent = () => {
        if (!activeTest) return null;

        if (activeTest === 'motion' || activeTest === 'fast-motion') {
            return (
                <div className="w-full h-full bg-black relative cursor-none" onClick={exitTest}>
                    <div
                        style={{
                            position: 'absolute',
                            left: `${testStep}px`,
                            top: 0,
                            bottom: 0,
                            width: '50px',
                            backgroundColor: 'white',
                        }}
                    />
                </div>
            );
        }

        const currentColors = COLORS[activeTest];
        const color = currentColors[testStep % currentColors.length];

        return (
            <div
                className="w-full h-full cursor-pointer relative"
                style={{ backgroundColor: color }}
                onClick={() => stepColor(1)}
            >
                <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg bg-black/50 text-white/80 font-mono text-xs pointer-events-none backdrop-blur-sm border border-white/10">
                    Click / Space: Next ({(testStep % currentColors.length) + 1}/{currentColors.length}) • ESC: Exit
                </div>
            </div>
        );
    };

    if (activeTest) {
        return (
            <div ref={containerRef} className="w-full h-full fixed inset-0 z-50 bg-black">
                {renderTestContent()}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center w-full">
            <header className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-3 w-full">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-widest text-zinc-100">SCREEN DIAGNOSTICS</h1>
                    <p className="text-xs text-zinc-500 font-mono">SYSTEM: DISPLAY-TEST v1.1 • CLICK OR SPACE TO CYCLE • ESC TO EXIT</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                <TestButton title="GREY SCALE" onClick={() => startTest('grey')} description="Cycle through grey shades to check for banding and uniformity." />
                <TestButton title="PRIMARY COLORS" onClick={() => startTest('primary')} description="Cycle RGB to check for dead or stuck pixels." />
                <TestButton title="ALL COLORS" onClick={() => startTest('all')} description="Cycle full spectrum (CMYK/RGB) for color accuracy." />
                <TestButton title="MOTION TEST" onClick={() => startTest('motion')} description="Standard speed pan to check for ghosting." />
                <TestButton title="HIGH SPEED" onClick={() => startTest('fast-motion')} description="High speed pan to check panel response time." />
            </div>
        </div>
    );
}

const TestButton = ({ title, onClick, description }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center justify-center p-6 bg-zinc-900/70 border border-zinc-800 rounded-xl hover:bg-zinc-800/80 hover:border-zinc-600 transition-all duration-150 group shadow-lg"
    >
        <span className="text-lg font-bold text-zinc-200 group-hover:text-white mb-2 font-mono tracking-wide">{title}</span>
        <span className="text-xs text-zinc-500 text-center group-hover:text-zinc-400">{description}</span>
    </button>
);
