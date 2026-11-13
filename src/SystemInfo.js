import React, { useState, useEffect, useCallback } from 'react';

const CATEGORY_ORDER = [
    'Display & Graphics',
    'Core Hardware',
    'Connectivity & Ports',
    'Peripherals & Power',
    'System & Input',
];

let cachedSystemInfo = null;

function getBrowserFallbackSpecs() {
    const scr = typeof window !== 'undefined' ? window.screen : null;
    const nav = typeof navigator !== 'undefined' ? navigator : {};
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    return {
        platform: nav.platform || 'browser',
        collectedAt: new Date().toISOString(),
        isBrowserFallback: true,
        deviceIdentity: {
            manufacturer: 'Browser Mode',
            model: 'Run inside Electron (.exe) for full hardware WMI probe',
            serialNumber: 'Unavailable in Browser',
            biosVersion: 'Unavailable in Browser',
            hostname: 'localhost',
        },
        specs: [
            { key: 'screenSizeType', label: 'Screen Size / Type', category: 'Display & Graphics', value: scr ? `${scr.colorDepth}-bit Display (${Math.round(dpr * 100)}% scale)` : 'Unavailable', serial: '—' },
            { key: 'maxResolution', label: 'Max Resolution', category: 'Display & Graphics', value: scr ? `${Math.round(scr.width * dpr)} × ${Math.round(scr.height * dpr)} (Current)` : 'Unavailable', serial: '—' },
            { key: 'videoMemory', label: 'Video Memory', category: 'Display & Graphics', value: 'Requires Desktop App', serial: '—' },
            { key: 'graphicsType', label: 'Graphics Type', category: 'Display & Graphics', value: 'Requires Desktop App', serial: '—' },
            { key: 'cpuType', label: 'CPU Type', category: 'Core Hardware', value: nav.hardwareConcurrency ? `${nav.hardwareConcurrency} Logical Processors` : 'Unavailable', serial: '—' },
            { key: 'cpuSpeed', label: 'CPU Speed', category: 'Core Hardware', value: 'Requires Desktop App', serial: '—' },
            { key: 'memoryRam', label: 'Memory RAM', category: 'Core Hardware', value: nav.deviceMemory ? `~${nav.deviceMemory} GB (Browser Estimate)` : 'Requires Desktop App', serial: '—' },
            { key: 'storage', label: 'Storage', category: 'Core Hardware', value: 'Requires Desktop App', serial: '—' },
            { key: 'opticalDrive', label: 'Optical Drive', category: 'Core Hardware', value: 'Requires Desktop App', serial: '—' },
            { key: 'wirelessWifi', label: 'Wireless WiFi', category: 'Connectivity & Ports', value: nav.onLine ? 'Online (Adapter details require Desktop App)' : 'Offline', serial: '—' },
            { key: 'bluetooth', label: 'Bluetooth', category: 'Connectivity & Ports', value: 'Requires Desktop App', serial: '—' },
            { key: 'cellularWwan', label: 'Cellular WWAN', category: 'Connectivity & Ports', value: 'Requires Desktop App', serial: '—' },
            { key: 'ports', label: 'Ports', category: 'Connectivity & Ports', value: 'Requires Desktop App', serial: '—' },
            { key: 'audio', label: 'Audio', category: 'Peripherals & Power', value: 'Requires Desktop App', serial: '—' },
            { key: 'webcam', label: 'Webcam', category: 'Peripherals & Power', value: 'Requires Desktop App', serial: '—' },
            { key: 'batteryCapacity', label: 'Battery Capacity', category: 'Peripherals & Power', value: 'Requires Desktop App', serial: '—' },
            { key: 'batteryHealth', label: 'Battery Health & Cycles', category: 'Peripherals & Power', value: 'Requires Desktop App', serial: '—' },
            { key: 'acAdapterIncluded', label: 'AC Adapter Included', category: 'Peripherals & Power', value: 'Requires Desktop App', serial: '—' },
            { key: 'keyboardLayout', label: 'Keyboard Layout', category: 'System & Input', value: nav.language || 'Unknown', serial: '—' },
            { key: 'operatingSystem', label: 'Operating System', category: 'System & Input', value: nav.platform || 'Unknown', serial: '—' },
        ],
    };
}

function buildTextReport(data) {
    const lines = [];
    const divider = '='.repeat(72);
    const subDivider = '-'.repeat(72);

    lines.push(divider);
    lines.push('                   LAPTOP HARDWARE DIAGNOSTIC REPORT');
    lines.push(divider);

    const generatedDate = data.collectedAt
        ? new Date(data.collectedAt).toLocaleString()
        : new Date().toLocaleString();
    lines.push(`  Generated      : ${generatedDate}`);

    if (data.deviceIdentity) {
        const id = data.deviceIdentity;
        lines.push(`  Manufacturer   : ${id.manufacturer}`);
        lines.push(`  Model          : ${id.model}`);
        lines.push(`  System Serial  : ${id.serialNumber}`);
        if (id.baseboardSerial) lines.push(`  Baseboard SN   : ${id.baseboardSerial}`);
        if (id.systemUuid) lines.push(`  System UUID    : ${id.systemUuid}`);
        lines.push(`  BIOS Version   : ${id.biosVersion}`);
        lines.push(`  Hostname       : ${id.hostname}`);
    }

    CATEGORY_ORDER.forEach((category) => {
        const items = (data.specs || []).filter((s) => s.category === category);
        if (items.length === 0) return;

        lines.push('');
        lines.push(subDivider);
        lines.push(`  ${category.toUpperCase()}`);
        lines.push(subDivider);

        items.forEach((s) => {
            const parts = String(s.value || '').split(' | ').map((p) => p.trim()).filter(Boolean);
            if (parts.length <= 1) {
                lines.push(`  ${s.label.padEnd(23)}: ${parts[0] || '—'}`);
            } else {
                lines.push(`  ${s.label}:`);
                parts.forEach((p) => lines.push(`    - ${p}`));
            }
            if (s.serial && s.serial !== '—') {
                lines.push(`    Serial / ID  : ${s.serial}`);
            }
        });
    });

    lines.push('');
    lines.push(divider);
    return lines.join('\n');
}

export default function SystemInfo() {
    const [data, setData] = useState(cachedSystemInfo);
    const [loading, setLoading] = useState(!cachedSystemInfo);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [savedStatus, setSavedStatus] = useState(null);

    const fetchSystemInfo = useCallback(async (force = false) => {
        if (!force && cachedSystemInfo) {
            setData(cachedSystemInfo);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const electron = window.require ? window.require('electron') : null;
            if (electron && electron.ipcRenderer) {
                const result = await electron.ipcRenderer.invoke('get-system-info');
                cachedSystemInfo = result;
                setData(result);
            } else {
                const fallback = getBrowserFallbackSpecs();
                cachedSystemInfo = fallback;
                setData(fallback);
            }
        } catch (err) {
            setError(err.message || 'Failed to read system hardware information.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSystemInfo(false);
    }, [fetchSystemInfo]);

    const handleCopyReport = () => {
        if (!data) return;
        const text = buildTextReport(data);
        navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {});
    };

    const handleSaveFile = async () => {
        if (!data) return;
        const text = buildTextReport(data);
        const safeModel = (data.deviceIdentity?.model || 'laptop')
            .replace(/[^a-z0-9_-]+/gi, '-')
            .replace(/^-|-$/g, '')
            .toLowerCase();
        const safeSerial = (data.deviceIdentity?.serialNumber || '')
            .replace(/[^a-z0-9_-]+/gi, '');
        const defaultName = `${safeModel}${safeSerial ? `-${safeSerial}` : ''}-report.txt`;

        try {
            const electron = window.require ? window.require('electron') : null;
            if (electron && electron.ipcRenderer) {
                const res = await electron.ipcRenderer.invoke('save-report-file', {
                    defaultName,
                    content: text,
                });
                if (res && res.saved) {
                    setSavedStatus('SAVED!');
                    setTimeout(() => setSavedStatus(null), 2500);
                }
                return;
            }
        } catch (err) {
            setError(err.message || 'Failed to save report file.');
            return;
        }

        // Browser fallback download
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        a.click();
        URL.revokeObjectURL(url);
        setSavedStatus('SAVED!');
        setTimeout(() => setSavedStatus(null), 2500);
    };

    const groupedSpecs = CATEGORY_ORDER.map((category) => ({
        category,
        items: (data?.specs || []).filter((item) => item.category === category),
    })).filter((g) => g.items.length > 0);

    return (
        <div className="flex flex-col items-center w-full">
            <header className="flex flex-wrap justify-between items-center mb-6 border-b border-zinc-800 pb-3 w-full gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-widest text-zinc-100">
                        LAPTOP HARDWARE INFO
                    </h1>
                    <p className="text-xs text-zinc-500 font-mono">
                        SYSTEM: SYS-PROBE v1.2 • OFFLINE WMI / CIM HARDWARE &amp; SERIAL DIAGNOSTICS
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleCopyReport}
                        disabled={!data || loading}
                        className="bg-zinc-900 text-zinc-200 border border-zinc-700 rounded-lg px-4 py-2 text-sm font-mono hover:bg-zinc-100 hover:text-zinc-950 transition-all duration-150 disabled:opacity-40"
                    >
                        {copied ? 'COPIED!' : 'COPY REPORT'}
                    </button>
                    <button
                        onClick={handleSaveFile}
                        disabled={!data || loading}
                        className="bg-emerald-950/60 text-emerald-300 border border-emerald-700/70 rounded-lg px-4 py-2 text-sm font-mono hover:bg-emerald-500 hover:text-zinc-950 transition-all duration-150 disabled:opacity-40"
                    >
                        {savedStatus || 'SAVE FILE'}
                    </button>
                    <button
                        onClick={() => fetchSystemInfo(true)}
                        disabled={loading}
                        className="bg-zinc-900 text-zinc-200 border border-zinc-700 rounded-lg px-4 py-2 text-sm font-mono hover:bg-zinc-100 hover:text-zinc-950 transition-all duration-150 disabled:opacity-40"
                    >
                        {loading ? 'SCANNING...' : 'REFRESH'}
                    </button>
                </div>
            </header>

            {error && (
                <div className="w-full mb-4 p-4 bg-red-950/50 border border-red-800/70 rounded-xl font-mono text-sm text-red-300">
                    ERROR: {error}
                </div>
            )}

            {loading && !data ? (
                <div className="w-full p-12 bg-zinc-900/70 border border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-3 font-mono">
                    <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-zinc-300 tracking-wider">PROBING HARDWARE SENSORS, SERIALS &amp; WMI...</span>
                </div>
            ) : data ? (
                <div className="w-full flex flex-col gap-5">
                    {/* Device Identity Banner */}
                    {data.deviceIdentity && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 p-4 bg-zinc-900/70 rounded-xl border border-zinc-800 shadow-xl font-mono">
                            <div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Manufacturer</div>
                                <div className="text-sm font-bold text-white truncate">{data.deviceIdentity.manufacturer}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Model</div>
                                <div className="text-sm font-bold text-emerald-400 truncate">{data.deviceIdentity.model}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">System Serial / Tag</div>
                                <div className="text-sm font-bold text-zinc-200 truncate">{data.deviceIdentity.serialNumber}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Baseboard Serial</div>
                                <div className="text-sm font-bold text-zinc-200 truncate">{data.deviceIdentity.baseboardSerial || 'Unavailable'}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">BIOS Version</div>
                                <div className="text-sm font-bold text-zinc-200 truncate">{data.deviceIdentity.biosVersion}</div>
                            </div>
                        </div>
                    )}

                    {/* Categorized Hardware Spec Cards with 3 Columns */}
                    <div className="grid grid-cols-1 gap-4">
                        {groupedSpecs.map((group) => (
                            <div key={group.category} className="bg-zinc-900/70 rounded-xl border border-zinc-800 shadow-xl overflow-hidden">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 font-mono text-xs font-bold tracking-widest uppercase">
                                    <div className="md:col-span-3 text-emerald-400">{group.category}</div>
                                    <div className="hidden md:block md:col-span-5 text-zinc-500">SPECIFICATION</div>
                                    <div className="hidden md:block md:col-span-4 text-zinc-500">SERIAL / HARDWARE ID</div>
                                </div>
                                <div className="divide-y divide-zinc-800/80">
                                    {group.items.map((item) => {
                                        const isMissing = /not present|not detected|unavailable|missing|none \//i.test(item.value);
                                        const hasSerial = item.serial && item.serial !== '—';
                                        return (
                                            <div key={item.key} className="grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-4 px-4 py-3 font-mono text-xs sm:text-sm items-start hover:bg-zinc-800/40 transition-colors">
                                                <div className="md:col-span-3 text-zinc-400 font-semibold">{item.label}</div>
                                                <div className={`md:col-span-5 break-words ${isMissing ? 'text-zinc-500' : 'text-zinc-100'}`}>
                                                    {item.value}
                                                </div>
                                                <div className={`md:col-span-4 break-all text-xs ${hasSerial ? 'text-emerald-300/90' : 'text-zinc-600'}`}>
                                                    {item.serial || '—'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
