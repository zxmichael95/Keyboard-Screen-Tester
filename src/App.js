import React, { useState } from 'react';
import KeyboardVisualizer from './KeyboardVisualizer';
import ScreenTester from './ScreenTester';
import TouchpadTester from './TouchpadTester';
import SystemInfo from './SystemInfo';

const TABS = [
    { id: 'visualizer', label: 'INPUT VISUALIZER' },
    { id: 'touchpad', label: 'TOUCHPAD & MOUSE' },
    { id: 'tester', label: 'SCREEN TESTER' },
    { id: 'sysinfo', label: 'SYSTEM INFO' },
];

export default function App() {
    const [activeTab, setActiveTab] = useState('visualizer');

    return (
        <div className="flex flex-col items-center justify-start min-h-screen bg-zinc-950 text-zinc-200 p-4 md:p-6 font-sans relative overflow-x-hidden">
            {/* Subtle offline dot-matrix texture & ambient dark vignette */}
            <div
                className="fixed inset-0 pointer-events-none opacity-25"
                style={{
                    backgroundImage: 'radial-gradient(#27272a 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                }}
            />
            <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-zinc-900/20 via-transparent to-black/70" />

            <div className="z-10 w-full max-w-6xl mx-auto flex flex-col items-center">
                {/* Tab Navigation */}
                <nav className="flex flex-wrap justify-center gap-1.5 mb-6 bg-zinc-900/90 p-1.5 rounded-xl border border-zinc-800 shadow-lg backdrop-blur-md">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-mono tracking-wide transition-all duration-150 ${
                                    isActive
                                        ? 'bg-zinc-100 text-zinc-950 font-semibold shadow-sm'
                                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Content Area */}
                <div className="w-full">
                    {activeTab === 'visualizer' && <KeyboardVisualizer />}
                    {activeTab === 'touchpad' && <TouchpadTester />}
                    {activeTab === 'tester' && <ScreenTester />}
                    {activeTab === 'sysinfo' && <SystemInfo />}
                </div>
            </div>
        </div>
    );
}
