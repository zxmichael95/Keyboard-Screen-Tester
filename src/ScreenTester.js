import React, { useState, useEffect, useRef } from 'react';

export default function ScreenTester() {
    const [activeTest, setActiveTest] = useState(null); // 'grey', 'primary', 'all', 'motion', 'fast-motion'
    const [testStep, setTestStep] = useState(0);
    const containerRef = useRef(null);
    const requestRef = useRef();

    const colors = {
        grey: ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF'],
        primary: ['#FF0000', '#00FF00', '#0000FF'],
        all: ['#FF0000', '#00FF00', '#0000FF', '#00FFFF', '#FF00FF', '#FFFF00', '#FFFFFF', '#000000']
    };

    const startTest = (testName) => {
        setActiveTest(testName);
        setTestStep(0);
        if (containerRef.current) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        }
    };

    const handleFullscreenChange = () => {
        if (!document.fullscreenElement) {
            setActiveTest(null);
            cancelAnimationFrame(requestRef.current);
        }
    };

    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            cancelAnimationFrame(requestRef.current);
        };
    }, []);

    useEffect(() => {
        const animate = (time) => {
            if (activeTest === 'motion' || activeTest === 'fast-motion') {
                setTestStep(prev => {
                    const speed = activeTest === 'fast-motion' ? 25 : 5;
                    const width = window.screen.width;
                    return (prev + speed) % width;
                });
                requestRef.current = requestAnimationFrame(animate);
            }
        };

        if (activeTest === 'motion' || activeTest === 'fast-motion') {
            requestRef.current = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(requestRef.current);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [activeTest]);

    const handleClick = () => {
        if (activeTest === 'grey' || activeTest === 'primary' || activeTest === 'all') {
            setTestStep(prev => (prev + 1) % colors[activeTest].length);
        }
    };

    const renderTestContent = () => {
        if (!activeTest) return null;

        if (activeTest === 'motion' || activeTest === 'fast-motion') {
            return (
                <div className="w-full h-full bg-black relative cursor-none">
                    <div
                        style={{
                            position: 'absolute',
                            left: `${testStep}px`,
                            top: 0,
                            bottom: 0,
                            width: '50px',
                            backgroundColor: 'white'
                        }}
                    />
                </div>
            );
        }

        const currentColors = colors[activeTest];
        const color = currentColors[testStep % currentColors.length];

        return (
            <div
                className="w-full h-full cursor-pointer flex items-center justify-center"
                style={{ backgroundColor: color }}
                onClick={handleClick}
            >
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
        <div className="flex flex-col items-center w-full" ref={containerRef}>
            <header className="flex justify-between items-center mb-8 border-b-2 border-gray-500/30 pb-2 w-full">
                <div>
                    <h1 className="text-2xl font-bold tracking-widest" style={{ textShadow: '0 0 8px rgba(209, 213, 219, 0.5)' }}>SCREEN DIAGNOSTICS</h1>
                    <p className="text-xs text-gray-400">SYSTEM: DISPLAY-TEST v1.0</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
                <TestButton title="GREY SCALE" onClick={() => startTest('grey')} description="Cycle through grey shades to check for banding and uniformity." />
                <TestButton title="PRIMARY COLORS" onClick={() => startTest('primary')} description="Cycle RGB to check for dead pixels." />
                <TestButton title="ALL COLORS" onClick={() => startTest('all')} description="Cycle full spectrum (CMYK/RGB) for color accuracy." />
                <TestButton title="MOTION TEST" onClick={() => startTest('motion')} description="Standard speed pan to check for ghosting." />
                <TestButton title="HIGH SPEED" onClick={() => startTest('fast-motion')} description="High speed pan to check for response time." />
            </div>
        </div>
    );
}

const TestButton = ({ title, onClick, description }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center justify-center p-6 bg-gray-800/80 border-2 border-gray-700 rounded-lg hover:bg-gray-700/90 hover:border-gray-500 hover:shadow-[0_0_15px_3px_rgba(209,213,219,0.4)] transition-all duration-200 group"
    >
        <span className="text-xl font-bold text-gray-300 group-hover:text-white mb-2 font-mono">{title}</span>
        <span className="text-xs text-gray-500 text-center group-hover:text-gray-400">{description}</span>
    </button>
);
