import React, { useState } from 'react';
import KeyboardVisualizer from './KeyboardVisualizer';
import ScreenTester from './ScreenTester';

export default function App() {
    const [activeTab, setActiveTab] = useState('visualizer');

    return (
        <div className="flex flex-col items-center justify-start min-h-screen bg-gray-900 text-gray-300 p-4 font-sans relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/clean-gray-paper.png')] opacity-[0.04]"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-transparent to-black"></div>

            <div className="z-10 w-full max-w-fit mx-auto flex flex-col items-center">
                {/* Tab Navigation */}
                <nav className="flex gap-4 mb-6 bg-black/30 p-1 rounded-lg border border-gray-700/50 backdrop-blur-sm">
                    <button
                        onClick={() => setActiveTab('visualizer')}
                        className={`px-6 py-2 rounded-md text-sm font-mono transition-all duration-200 ${activeTab === 'visualizer'
                                ? 'bg-gray-700 text-white shadow-lg border border-gray-500'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                            }`}
                    >
                        INPUT VISUALIZER
                    </button>
                    <button
                        onClick={() => setActiveTab('tester')}
                        className={`px-6 py-2 rounded-md text-sm font-mono transition-all duration-200 ${activeTab === 'tester'
                                ? 'bg-gray-700 text-white shadow-lg border border-gray-500'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                            }`}
                    >
                        SCREEN TESTER
                    </button>
                </nav>

                {/* Content Area */}
                <div className="w-full">
                    {activeTab === 'visualizer' ? <KeyboardVisualizer /> : <ScreenTester />}
                </div>
            </div>
        </div>
    );
}
