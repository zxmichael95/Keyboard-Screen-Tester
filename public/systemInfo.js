const { execFile } = require('child_process');
const os = require('os');

const PS_SCRIPT = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'

function Decode-WmiString($arr) {
  if (-not $arr) { return $null }
  $chars = $arr | Where-Object { $_ -ne 0 } | ForEach-Object { [char]$_ }
  return (-join $chars).Trim()
}

$cs = Get-CimInstance Win32_ComputerSystem | Select-Object Manufacturer, Model, TotalPhysicalMemory, SystemType
$bios = Get-CimInstance Win32_BIOS | Select-Object SerialNumber, SMBIOSBIOSVersion, Manufacturer
$baseboard = Get-CimInstance Win32_BaseBoard | Select-Object SerialNumber, Product, Manufacturer
$csProduct = Get-CimInstance Win32_ComputerSystemProduct | Select-Object UUID
$osInfo = Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber, OSArchitecture, InstallDate, SerialNumber

$cpus = @(Get-CimInstance Win32_Processor | Select-Object Name, Manufacturer, MaxClockSpeed, CurrentClockSpeed, NumberOfCores, NumberOfLogicalProcessors, AddressWidth, ProcessorId)

$memModules = @(Get-CimInstance Win32_PhysicalMemory | Select-Object Capacity, Speed, ConfiguredClockSpeed, SMBIOSMemoryType, FormFactor, Manufacturer, DeviceLocator, SerialNumber, PartNumber)
$memArray = @(Get-CimInstance Win32_PhysicalMemoryArray | Select-Object MemoryDevices, MaxCapacity)

$physDisks = @(Get-CimInstance -Namespace root\\Microsoft\\Windows\\Storage -ClassName MSFT_PhysicalDisk | Select-Object FriendlyName, MediaType, BusType, Size, HealthStatus, SerialNumber)
$winDisks = @(Get-CimInstance Win32_DiskDrive | Select-Object Model, InterfaceType, MediaType, Size, SerialNumber)
$logicalDisks = @(Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object DeviceID, VolumeName, Size, FreeSpace, FileSystem)

$optical = @(Get-CimInstance Win32_CDROMDrive | Select-Object Name, Drive, MediaType, Status, PNPDeviceID)

# Video Controllers + Registry 64-bit VRAM
$regVideo = @()
$videoRegPath = 'HKLM:\\SYSTEM\\ControlSet001\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\00*'
Get-ItemProperty -Path $videoRegPath -ErrorAction SilentlyContinue | ForEach-Object {
  if ($_.DriverDesc -or $_.'HardwareInformation.qwMemorySize' -or $_.'HardwareInformation.MemorySize') {
    $vramBytes = $_.'HardwareInformation.qwMemorySize'
    if (-not $vramBytes) { $vramBytes = $_.'HardwareInformation.MemorySize' }
    if ($vramBytes -is [byte[]]) {
      if ($vramBytes.Length -ge 8) { $vramBytes = [BitConverter]::ToUInt64($vramBytes, 0) }
      elseif ($vramBytes.Length -ge 4) { $vramBytes = [BitConverter]::ToUInt32($vramBytes, 0) }
    }
    $regVideo += [PSCustomObject]@{
      DriverDesc = $_.DriverDesc
      MemoryBytes = $vramBytes
    }
  }
}

$gpus = @(Get-CimInstance Win32_VideoController | Select-Object Name, AdapterCompatibility, AdapterRAM, DriverVersion, VideoProcessor, CurrentHorizontalResolution, CurrentVerticalResolution, CurrentRefreshRate, Status, PNPDeviceID)

# Max supported resolution from CIM_VideoControllerResolution
$maxRes = Get-CimInstance CIM_VideoControllerResolution | Sort-Object -Property HorizontalResolution, VerticalResolution -Descending | Select-Object -First 1 HorizontalResolution, VerticalResolution, RefreshRate

# Monitor info (EDID physical size + connection type + friendly name + serial)
$monParams = @(Get-CimInstance -Namespace root\\wmi -ClassName WmiMonitorBasicDisplayParams)
$monConn = @(Get-CimInstance -Namespace root\\wmi -ClassName WmiMonitorConnectionParams)
$monIds = @(Get-CimInstance -Namespace root\\wmi -ClassName WmiMonitorID | ForEach-Object {
  [PSCustomObject]@{
    InstanceName = $_.InstanceName
    FriendlyName = (Decode-WmiString $_.UserFriendlyName)
    Manufacturer = (Decode-WmiString $_.ManufacturerName)
    SerialNumber = (Decode-WmiString $_.SerialNumberID)
  }
})
$desktopMons = @(Get-CimInstance Win32_DesktopMonitor | Select-Object Name, MonitorType, ScreenWidth, ScreenHeight, PNPDeviceID)

# Network adapters (WiFi, Ethernet, WWAN) via CIM
$netAdapters = @(Get-CimInstance -Namespace root\\StandardCimv2 -ClassName MSFT_NetAdapter | Select-Object Name, InterfaceDescription, InterfaceOperationalStatus, LinkSpeed, PermanentAddress, PhysicalMediaType, MediaType, HardwareInterface, Virtual, PnPDeviceID)
if ($netAdapters.Count -eq 0) {
  $netAdapters = @(Get-CimInstance Win32_NetworkAdapter | Select-Object Name, NetConnectionID, Description, PhysicalAdapter, NetEnabled, MACAddress, AdapterType, PNPDeviceID)
}

# PnP devices for Bluetooth, Camera, WWAN, Thunderbolt, SD Card
$pnpDevices = @(Get-CimInstance Win32_PnPEntity -Filter "PNPClass='Bluetooth' OR PNPClass='Camera' OR PNPClass='Image' OR Name LIKE '%WWAN%' OR Name LIKE '%Mobile Broadband%' OR Name LIKE '%Thunderbolt%' OR Name LIKE '%USB4%' OR Name LIKE '%SD %Card%' OR Name LIKE '%Realtek PCIe CardReader%'" | Select-Object Name, PNPClass, Manufacturer, Status, Present, DeviceID)

$sound = @(Get-CimInstance Win32_SoundDevice | Select-Object Name, Manufacturer, Status, PNPDeviceID)

$portConnectors = @(Get-CimInstance Win32_PortConnector | Select-Object ExternalReferenceDesignator, InternalReferenceDesignator, PortType, ConnectorType)
$usbControllers = @(Get-CimInstance Win32_USBController | Select-Object Name, Status)
$serialPorts = @(Get-CimInstance Win32_SerialPort | Select-Object DeviceID, Name, Description)

# Battery & AC Power
$batteries = @(Get-CimInstance Win32_Battery | Select-Object Name, EstimatedChargeRemaining, BatteryStatus, DesignVoltage, Chemistry, DeviceID)
$portableBatteries = @(Get-CimInstance Win32_PortableBattery | Select-Object Name, Manufacturer, DesignCapacity, FullChargeCapacity, ManufactureDate, DeviceID)
$batStatic = @(Get-CimInstance -Namespace root\\wmi -ClassName BatteryStaticData | Select-Object DesignedCapacity, ManufactureName, DeviceName, SerialNumber)
$batFull = @(Get-CimInstance -Namespace root\\wmi -ClassName BatteryFullChargedCapacity | Select-Object FullChargedCapacity)
$batCycle = @(Get-CimInstance -Namespace root\\wmi -ClassName BatteryCycleCount | Select-Object CycleCount)
$batStatusWmi = @(Get-CimInstance -Namespace root\\wmi -ClassName BatteryStatus | Select-Object PowerOnline, Charging, Discharging, RemainingCapacity)

# Keyboard Layout
$kbLayouts = @()
$preload = Get-ItemProperty -Path 'HKCU:\\Keyboard Layout\\Preload' -ErrorAction SilentlyContinue
if ($preload) {
  $preload.PSObject.Properties | Where-Object { $_.Name -match '^\\d+$' } | Sort-Object { [int]$_.Name } | ForEach-Object {
    $klid = $_.Value
    $layoutKey = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Keyboard Layouts\\$klid"
    $layoutText = (Get-ItemProperty -Path $layoutKey -ErrorAction SilentlyContinue).'Layout Text'
    $kbLayouts += [PSCustomObject]@{
      Order = $_.Name
      Id = $klid
      Name = $layoutText
    }
  }
}
$userProfileLangs = @((Get-ItemProperty -Path 'HKCU:\\Control Panel\\International\\User Profile' -ErrorAction SilentlyContinue).Languages)

[PSCustomObject]@{
  computerSystem = $cs
  bios = $bios
  baseboard = $baseboard
  csProduct = $csProduct
  os = $osInfo
  cpus = $cpus
  memoryModules = $memModules
  memoryArray = $memArray
  physicalDisks = $physDisks
  winDisks = $winDisks
  logicalDisks = $logicalDisks
  opticalDrives = $optical
  gpus = $gpus
  regVideo = $regVideo
  maxResolution = $maxRes
  monitorParams = $monParams
  monitorConnections = $monConn
  monitorIds = $monIds
  desktopMonitors = $desktopMons
  netAdapters = $netAdapters
  pnpDevices = $pnpDevices
  soundDevices = $sound
  portConnectors = $portConnectors
  usbControllers = $usbControllers
  serialPorts = $serialPorts
  batteries = $batteries
  portableBatteries = $portableBatteries
  batteryStatic = $batStatic
  batteryFull = $batFull
  batteryCycle = $batCycle
  batteryStatusWmi = $batStatusWmi
  keyboardLayouts = $kbLayouts
  userLanguages = $userProfileLangs
} | ConvertTo-Json -Depth 5 -Compress
`;

function toArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function formatPhysicalMediaType(val) {
  if (typeof val === 'string' && val !== 'Unspecified') return val;
  const map = { 3: 'HDD', 4: 'SSD', 5: 'SCM' };
  return map[Number(val)] || null;
}

function formatBusType(val) {
  if (typeof val === 'string' && val !== 'Unknown') return val;
  const map = { 3: 'ATA', 7: 'USB', 8: 'RAID', 10: 'SAS', 11: 'SATA', 17: 'NVMe' };
  return map[Number(val)] || null;
}

function formatNetStatus(a) {
  if (a.Status) return a.Status;
  if (a.InterfaceOperationalStatus !== undefined) {
    return Number(a.InterfaceOperationalStatus) === 1 ? 'Up' : 'Disconnected';
  }
  return a.NetEnabled ? 'Up' : 'Disconnected';
}

function formatLinkSpeed(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  const num = Number(val);
  if (!num || isNaN(num)) return null;
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)} Gbps`;
  if (num >= 1e6) return `${Math.round(num / 1e6)} Mbps`;
  return `${num} bps`;
}

function formatBytesGB(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return null;
  const gb = bytes / (1024 ** 3);
  return gb >= 100 ? `${Math.round(gb)} GB` : `${gb.toFixed(1)} GB`;
}

function formatMemoryType(code) {
  const map = {
    20: 'DDR',
    21: 'DDR2',
    22: 'DDR2 FB-DIMM',
    24: 'DDR3',
    26: 'DDR4',
    27: 'LPDDR',
    28: 'LPDDR2',
    29: 'LPDDR3',
    30: 'LPDDR4',
    34: 'DDR5',
    35: 'LPDDR5',
  };
  return map[code] || null;
}

function formatFormFactor(code) {
  const map = {
    8: 'DIMM',
    12: 'SODIMM',
    13: 'SRIMM',
  };
  return map[code] || null;
}

function formatVideoOutputTech(code) {
  const map = {
    '-2': 'Uninitialized',
    '-1': 'Other',
    0: 'VGA',
    1: 'S-Video',
    2: 'Composite',
    3: 'Component',
    4: 'DVI',
    5: 'HDMI',
    6: 'LVDS (Internal Panel)',
    8: 'D-Jpn',
    9: 'SDI',
    10: 'DisplayPort (External)',
    11: 'eDP (Internal Panel)',
    12: 'UDI (External)',
    13: 'UDI (Internal)',
    14: 'SDTV',
    15: 'Miracast',
    2147483648: 'Internal',
  };
  return map[code] || null;
}

function formatPortType(code) {
  const map = {
    0: 'None',
    1: 'Parallel',
    2: 'Parallel (PS/2)',
    3: 'Parallel (ECP)',
    4: 'Parallel (EPP)',
    5: 'Parallel (ECP/EPP)',
    6: 'Serial (XT/AT)',
    7: 'Serial (16450)',
    8: 'Serial (16550)',
    9: 'Serial (16550A)',
    10: 'SCSI',
    11: 'MIDI',
    12: 'Joystick',
    13: 'Keyboard',
    14: 'Mouse',
    15: 'SSA SCSI',
    16: 'USB',
    17: 'FireWire (IEEE 1394)',
    18: 'PCMCIA Type I',
    19: 'PCMCIA Type II',
    20: 'PCMCIA Type III',
    21: 'Cardbus',
    22: 'Access Bus',
    23: 'SCSI II',
    24: 'SCSI Wide',
    25: 'PC-98',
    26: 'PC-98-Hireso',
    27: 'PC-H98',
    28: 'Video',
    29: 'Audio',
    30: 'Modem',
    31: 'Network (RJ45)',
    32: 'SATA',
    33: 'SAS',
    34: 'MFDP (USB-C / DisplayPort)',
    35: 'Thunderbolt',
    255: 'Other',
  };
  return map[code] || 'Port';
}

function runPowerShell() {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(PS_SCRIPT, 'utf16le').toString('base64');
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      { timeout: 15000, maxBuffer: 5 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          return reject(new Error(stderr || err.message));
        }
        try {
          if (!stdout || !stdout.trim()) {
            return reject(new Error(`Empty PowerShell output. ${stderr || ''}`.trim()));
          }
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch (parseErr) {
          reject(new Error(`Failed to parse system info JSON: ${parseErr.message}`));
        }
      }
    );
  });
}

function getElectronDisplayAndPower(electronModule) {
  let displays = [];
  let onBattery = null;
  try {
    if (electronModule && electronModule.screen) {
      displays = electronModule.screen.getAllDisplays().map((d) => ({
        id: d.id,
        width: Math.round(d.size.width * (d.scaleFactor || 1)),
        height: Math.round(d.size.height * (d.scaleFactor || 1)),
        logicalWidth: d.size.width,
        logicalHeight: d.size.height,
        scaleFactor: d.scaleFactor || 1,
        colorDepth: d.colorDepth,
        internal: d.internal,
        label: d.label,
      }));
    }
    if (electronModule && electronModule.powerMonitor) {
      onBattery = electronModule.powerMonitor.isOnBatteryPower();
    }
  } catch {
    // Ignore when running outside Electron
  }
  return { displays, onBattery };
}

function cleanSerial(val) {
  if (!val) return null;
  const s = String(val).trim();
  if (!s || /^(none|n\/a|unknown|not specified|to be filled.*|default string|0+|f+)$/i.test(s)) {
    return null;
  }
  return s;
}

function buildSpecsFromWindows(raw, electronEnv) {
  const cs = raw.computerSystem || {};
  const bios = raw.bios || {};
  const baseboard = raw.baseboard || {};
  const csProduct = raw.csProduct || {};
  const osInfo = raw.os || {};
  const cpus = toArray(raw.cpus);
  const memModules = toArray(raw.memoryModules);
  const memArray = toArray(raw.memoryArray);
  const physDisks = toArray(raw.physicalDisks);
  const winDisks = toArray(raw.winDisks);
  const logicalDisks = toArray(raw.logicalDisks);
  const optical = toArray(raw.opticalDrives);
  const gpus = toArray(raw.gpus);
  const regVideo = toArray(raw.regVideo);
  const monParams = toArray(raw.monitorParams);
  const monConn = toArray(raw.monitorConnections);
  const monIds = toArray(raw.monitorIds);
  const desktopMons = toArray(raw.desktopMonitors);
  const netAdapters = toArray(raw.netAdapters);
  const pnpDevices = toArray(raw.pnpDevices);
  const soundDevices = toArray(raw.soundDevices);
  const portConnectors = toArray(raw.portConnectors);
  const usbControllers = toArray(raw.usbControllers);
  const serialPorts = toArray(raw.serialPorts);
  const batteries = toArray(raw.batteries);
  const portableBatteries = toArray(raw.portableBatteries);
  const batStatic = toArray(raw.batteryStatic);
  const batFull = toArray(raw.batteryFull);
  const batCycle = toArray(raw.batteryCycle);
  const batStatusWmi = toArray(raw.batteryStatusWmi);
  const kbLayouts = toArray(raw.keyboardLayouts);
  const userLanguages = toArray(raw.userLanguages);

  // 1. Screen Size / Type
  const screenParts = [];
  monParams.forEach((mp, idx) => {
    const wCm = Number(mp.MaxHorizontalImageSize || 0);
    const hCm = Number(mp.MaxVerticalImageSize || 0);
    const diagInches = wCm > 0 && hCm > 0 ? (Math.hypot(wCm, hCm) / 2.54).toFixed(1) : null;
    const conn = monConn[idx] ? formatVideoOutputTech(monConn[idx].VideoOutputTechnology) : null;
    const idObj = monIds[idx];
    const name = idObj && idObj.FriendlyName ? idObj.FriendlyName : null;
    const pieces = [];
    if (diagInches) pieces.push(`${diagInches}"`);
    if (wCm > 0 && hCm > 0) pieces.push(`(${wCm} × ${hCm} cm)`);
    if (conn) pieces.push(`— ${conn}`);
    if (name) pieces.push(`[${name}]`);
    if (pieces.length) screenParts.push(pieces.join(' '));
  });
  if (screenParts.length === 0 && electronEnv.displays.length > 0) {
    electronEnv.displays.forEach((d, idx) => {
      screenParts.push(
        `Display ${idx + 1}: ${d.internal ? 'Internal Panel' : 'External Display'} (${d.colorDepth || 24}-bit, ${Math.round((d.scaleFactor || 1) * 100)}% scale)`
      );
    });
  } else if (screenParts.length === 0 && desktopMons.length > 0) {
    desktopMons.forEach((m) => {
      if (m.Name || m.MonitorType) screenParts.push(m.Name || m.MonitorType);
    });
  }
  const screenSizeType = screenParts.length > 0 ? screenParts.join(' | ') : 'Generic Display (Driver/EDID Unavailable)';

  // 2. Max Resolution
  const resParts = [];
  if (raw.maxResolution && raw.maxResolution.HorizontalResolution && raw.maxResolution.VerticalResolution) {
    const mr = raw.maxResolution;
    resParts.push(`Max: ${mr.HorizontalResolution} × ${mr.VerticalResolution}${mr.RefreshRate ? ` @ ${mr.RefreshRate} Hz` : ''}`);
  }
  const activeGpuRes = gpus.find((g) => g.CurrentHorizontalResolution && g.CurrentVerticalResolution);
  if (activeGpuRes) {
    const curStr = `Current: ${activeGpuRes.CurrentHorizontalResolution} × ${activeGpuRes.CurrentVerticalResolution}${activeGpuRes.CurrentRefreshRate ? ` @ ${activeGpuRes.CurrentRefreshRate} Hz` : ''}`;
    resParts.push(curStr);
  } else if (electronEnv.displays.length > 0) {
    const primary = electronEnv.displays[0];
    resParts.push(`Current: ${primary.width} × ${primary.height}`);
  }
  const maxResolution = resParts.length > 0 ? resParts.join(' | ') : 'Unavailable';

  // 3. CPU Type
  const primaryCpu = cpus[0] || {};
  const cpuName = (primaryCpu.Name || os.cpus()[0]?.model || 'Unknown CPU').replace(/\s+/g, ' ').trim();
  const cpuCores = primaryCpu.NumberOfCores ? `${primaryCpu.NumberOfCores} Cores` : null;
  const cpuThreads = primaryCpu.NumberOfLogicalProcessors ? `${primaryCpu.NumberOfLogicalProcessors} Threads` : `${os.cpus().length} Logical`;
  const cpuCountPrefix = cpus.length > 1 ? `${cpus.length}× ` : '';
  const cpuType = `${cpuCountPrefix}${cpuName} (${[cpuCores, cpuThreads].filter(Boolean).join(' / ')})`;

  // 4. CPU Speed
  const maxMhz = primaryCpu.MaxClockSpeed || os.cpus()[0]?.speed;
  const curMhz = primaryCpu.CurrentClockSpeed;
  let cpuSpeed = 'Unavailable';
  if (maxMhz) {
    const maxGhz = (maxMhz / 1000).toFixed(2);
    cpuSpeed = `${maxGhz} GHz Max`;
    if (curMhz) {
      cpuSpeed += ` (Current: ${(curMhz / 1000).toFixed(2)} GHz)`;
    }
  }

  // 5. Memory RAM
  const totalBytes = Number(cs.TotalPhysicalMemory || os.totalmem() || 0);
  const totalGb = totalBytes ? `${Math.round(totalBytes / (1024 ** 3))} GB` : 'Unknown';
  const freeGb = `${(os.freemem() / (1024 ** 3)).toFixed(1)} GB Free`;
  const totalSlots = memArray.reduce((acc, a) => acc + Number(a.MemoryDevices || 0), 0);
  let memDetail = '';
  if (memModules.length > 0) {
    const sticks = memModules.map((m) => {
      const cap = formatBytesGB(Number(m.Capacity || 0));
      const mType = formatMemoryType(Number(m.SMBIOSMemoryType));
      const ff = formatFormFactor(Number(m.FormFactor));
      const spd = m.ConfiguredClockSpeed || m.Speed;
      return [cap, mType, spd ? `${spd} MHz` : null, ff].filter(Boolean).join(' ');
    });
    const slotsInfo = totalSlots ? ` [${memModules.length}/${totalSlots} Slots]` : '';
    memDetail = ` — ${sticks.join(' + ')}${slotsInfo}`;
  }
  const memoryRam = `${totalGb} Total (${freeGb})${memDetail}`;

  // 6. Storage
  const storageItems = [];
  if (physDisks.length > 0) {
    physDisks.forEach((d) => {
      const size = formatBytesGB(Number(d.Size || 0));
      const media = formatPhysicalMediaType(d.MediaType);
      const bus = formatBusType(d.BusType);
      const typeStr = [bus, media].filter(Boolean).join(' ');
      storageItems.push(`${d.FriendlyName || 'Disk'}${size ? ` (${size}` : ''}${typeStr ? `, ${typeStr}` : ''}${size ? ')' : ''}`);
    });
  } else if (winDisks.length > 0) {
    winDisks.forEach((d) => {
      const size = formatBytesGB(Number(d.Size || 0));
      storageItems.push(`${d.Model || 'Disk'}${size ? ` (${size})` : ''}`);
    });
  }
  if (logicalDisks.length > 0) {
    const vols = logicalDisks.map((v) => `${v.DeviceID} ${formatBytesGB(Number(v.FreeSpace || 0))}/${formatBytesGB(Number(v.Size || 0))} free`);
    storageItems.push(`Volumes: ${vols.join(', ')}`);
  }
  const storage = storageItems.length > 0 ? storageItems.join(' | ') : 'No Storage Detected';

  // 7. Optical Drive
  const opticalDrive = optical.length > 0
    ? optical.map((o) => `${o.Name || 'Optical Drive'}${o.Drive ? ` (${o.Drive})` : ''}${o.MediaType ? ` [${o.MediaType}]` : ''}`).join(' | ')
    : 'None / Not Present';

  // 8 & 9. Video Memory & Graphics Type
  const gpuDescriptions = [];
  const vramDescriptions = [];
  gpus.forEach((g) => {
    const name = g.Name || 'Unknown GPU';
    const driver = g.DriverVersion ? `v${g.DriverVersion}` : null;
    const status = g.Status && g.Status !== 'OK' ? ` [${g.Status}]` : '';
    gpuDescriptions.push(`${name}${driver ? ` (Driver ${driver})` : ''}${status}`);

    const regMatch = regVideo.find(
      (rv) => rv.DriverDesc && g.Name && rv.DriverDesc.toLowerCase() === g.Name.toLowerCase() && rv.MemoryBytes
    );
    const bytes = Number((regMatch && regMatch.MemoryBytes) || g.AdapterRAM || 0);
    if (bytes > 0) {
      const mb = bytes / (1024 ** 2);
      const formatted = mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB` : `${Math.round(mb)} MB`;
      vramDescriptions.push(`${name}: ${formatted}`);
    } else {
      vramDescriptions.push(`${name}: Shared / Unknown`);
    }
  });
  const graphicsType = gpuDescriptions.length > 0 ? gpuDescriptions.join(' | ') : 'None / Basic Display';
  const videoMemory = vramDescriptions.length > 0 ? vramDescriptions.join(' | ') : 'Unavailable';

  // 10. Wireless WiFi
  const wifiAdapters = netAdapters.filter((a) => {
    const text = `${a.Name || ''} ${a.InterfaceDescription || a.Description || ''} ${a.PhysicalMediaType || ''}`.toLowerCase();
    return (
      text.includes('802.11') ||
      text.includes('wi-fi') ||
      text.includes('wifi') ||
      text.includes('wireless') ||
      text.includes('wlan')
    ) && !text.includes('virtual') && !text.includes('direct');
  });
  const wirelessWifi = wifiAdapters.length > 0
    ? wifiAdapters.map((a) => {
        const desc = a.InterfaceDescription || a.Description || a.Name;
        const st = formatNetStatus(a);
        const speed = formatLinkSpeed(a.LinkSpeed);
        return `${desc} (${st}${speed ? `, ${speed}` : ''})`;
      }).join(' | ')
    : 'Not Detected / Driver Missing';

  // 11. Bluetooth
  const btDevices = pnpDevices.filter((d) => d.PNPClass === 'Bluetooth');
  const btRadios = btDevices.filter((d) => {
    const n = (d.Name || '').toLowerCase();
    return (
      (n.includes('bluetooth') || n.includes('wireless') || n.includes('radio') || n.includes('adapter')) &&
      !n.includes('enumerator') &&
      !n.includes('generic') &&
      !n.includes('service') &&
      !n.includes('profile') &&
      !n.includes('transport') &&
      !n.includes('protocol') &&
      !n.includes('rfcomm') &&
      !n.includes('headset') &&
      !n.includes('mouse') &&
      !n.includes('keyboard')
    );
  });
  const btList = btRadios.length > 0 ? btRadios : btDevices.filter((d) => !(d.Name || '').toLowerCase().includes('service') && !(d.Name || '').toLowerCase().includes('profile'));
  const bluetooth = btList.length > 0
    ? [...new Set(btList.map((d) => `${d.Name}${d.Status ? ` (${d.Status})` : ''}`))].join(' | ')
    : 'Not Detected / Driver Missing';

  // 12. Cellular WWAN
  const wwanRegex = /\b(wwan|mobile broadband|cellular|lte|5g|fibocom|quectel|sierra wireless)\b/i;
  const wwanAdapters = netAdapters.filter((a) => {
    const text = `${a.Name || ''} ${a.InterfaceDescription || a.Description || ''} ${a.PhysicalMediaType || ''} ${a.MediaType || ''}`;
    return wwanRegex.test(text);
  });
  const wwanPnp = pnpDevices.filter((d) => wwanRegex.test(d.Name || ''));
  const wwanItems = [
    ...wwanAdapters.map((a) => `${a.InterfaceDescription || a.Name} (${formatNetStatus(a)})`),
    ...wwanPnp.map((d) => `${d.Name} (${d.Status || 'Detected'})`),
  ];
  const cellularWwan = wwanItems.length > 0 ? [...new Set(wwanItems)].join(' | ') : 'Not Present';

  // 13. Audio
  const audio = soundDevices.length > 0
    ? soundDevices.map((s) => `${s.Name}${s.Status ? ` (${s.Status})` : ''}`).join(' | ')
    : 'No Audio Device / Driver Missing';

  // 14. Ports
  const portSummary = [];
  if (portConnectors.length > 0) {
    const counts = {};
    portConnectors.forEach((p) => {
      const ext = (p.ExternalReferenceDesignator || '').trim();
      if (!ext || ext.toLowerCase() === 'none' || ext.toLowerCase() === 'not specified') return;
      counts[ext] = (counts[ext] || 0) + 1;
    });
    Object.entries(counts).forEach(([k, v]) => {
      portSummary.push(v > 1 ? `${v}× ${k}` : k);
    });
  }
  const ethAdapters = netAdapters.filter((a) => {
    const text = `${a.Name || ''} ${a.InterfaceDescription || a.Description || ''} ${a.PhysicalMediaType || ''}`.toLowerCase();
    return (text.includes('ethernet') || text.includes('gbe') || text.includes('802.3')) &&
      !text.includes('virtual') && !text.includes('bluetooth') && !text.includes('hyper-v') && !text.includes('vpn');
  });
  if (ethAdapters.length > 0) {
    portSummary.push(`Ethernet RJ45 (${ethAdapters.map((e) => e.InterfaceDescription || e.Name).join(', ')})`);
  }
  if (usbControllers.length > 0) {
    portSummary.push(`${usbControllers.length}× USB Host Controller(s)`);
  }
  const thunderboltOrSd = pnpDevices.filter((d) => {
    const n = (d.Name || '').toLowerCase();
    return n.includes('thunderbolt') || n.includes('usb4') || n.includes('cardreader') || n.includes('card reader') || n.includes('sd ');
  });
  thunderboltOrSd.forEach((d) => portSummary.push(d.Name));
  if (serialPorts.length > 0) {
    serialPorts.forEach((s) => portSummary.push(`Serial (${s.DeviceID})`));
  }
  const ports = portSummary.length > 0 ? [...new Set(portSummary)].join(' | ') : 'Standard Controllers Only';

  // 15. Webcam
  const cameras = pnpDevices.filter((d) => d.PNPClass === 'Camera' || d.PNPClass === 'Image');
  const webcam = cameras.length > 0
    ? [...new Set(cameras.map((c) => `${c.Name}${c.Status ? ` (${c.Status})` : ''}`))].join(' | ')
    : 'Not Detected / Driver Missing';

  // 16. Battery Capacity, Health & Cycle Count
  let batteryCapacity = 'No Battery Detected (Desktop / Removed)';
  let batteryHealth = 'No Battery Detected';
  if (batteries.length > 0 || portableBatteries.length > 0 || batStatic.length > 0) {
    const batCapParts = [];
    const batHealthParts = [];
    const count = Math.max(batteries.length, portableBatteries.length, batStatic.length);
    for (let i = 0; i < count; i++) {
      const b = batteries[i] || {};
      const pb = portableBatteries[i] || {};
      const st = batStatic[i] || {};
      const fl = batFull[i] || {};
      const cy = batCycle[i] || {};
      const label = count > 1 ? `Battery ${i + 1}: ` : '';

      const designedCap = Number(st.DesignedCapacity || pb.DesignCapacity || 0);
      const fullCap = Number(fl.FullChargedCapacity || pb.FullChargeCapacity || 0);
      const designStr = designedCap > 0 ? `${designedCap.toLocaleString()} mWh Design` : null;
      const fullStr = fullCap > 0 ? `${fullCap.toLocaleString()} mWh Full` : null;
      const chargeStr = b.EstimatedChargeRemaining !== undefined && b.EstimatedChargeRemaining !== null
        ? `${b.EstimatedChargeRemaining}% Charged`
        : null;
      const capDetails = [fullStr, designStr, chargeStr].filter(Boolean).join(' • ');
      batCapParts.push(`${label}${capDetails || b.Name || pb.Name || 'Battery Present'}`);

      let healthStr = 'Health Unavailable';
      if (designedCap > 0 && fullCap > 0) {
        const pct = Math.min(100, Math.round((fullCap / designedCap) * 100));
        const rating = pct >= 80 ? 'Good' : pct >= 60 ? 'Fair' : 'Poor';
        healthStr = `${pct}% Health (${rating})`;
      }
      const cycleStr = cy.CycleCount !== undefined && cy.CycleCount !== null
        ? `${cy.CycleCount} Cycles`
        : 'Cycle Count: Not Reported';
      batHealthParts.push(`${label}${healthStr} • ${cycleStr}`);
    }
    batteryCapacity = batCapParts.join(' | ');
    batteryHealth = batHealthParts.join(' | ');
  }

  // 17. AC Adapter Included (Power Status)
  let acAdapter = 'Unknown';
  const wmiOnline = batStatusWmi.some((s) => s.PowerOnline === true);
  const wmiOffline = batStatusWmi.length > 0 && batStatusWmi.every((s) => s.PowerOnline === false);
  const winBatStatus = batteries[0]?.BatteryStatus;
  if (batteries.length === 0 && electronEnv.onBattery === false) {
    acAdapter = 'Connected (AC Power Only / No Battery)';
  } else if (wmiOnline || electronEnv.onBattery === false || winBatStatus === 2 || winBatStatus === 6 || winBatStatus === 7 || winBatStatus === 8 || winBatStatus === 9) {
    acAdapter = 'Connected (On AC Power)';
  } else if (wmiOffline || electronEnv.onBattery === true || winBatStatus === 1) {
    acAdapter = 'Disconnected (Running on Battery)';
  }

  // 18. Keyboard Layout
  const kbParts = [];
  if (kbLayouts.length > 0) {
    kbLayouts.forEach((k) => {
      if (k.Name) kbParts.push(k.Name);
      else if (k.Id) kbParts.push(`Layout ${k.Id}`);
    });
  }
  if (userLanguages.length > 0) {
    const langs = userLanguages.map((l) => (typeof l === 'string' ? l : l.LocalizedName || l.LanguageTag)).filter(Boolean);
    if (langs.length > 0) kbParts.push(`Input Languages: ${langs.join(', ')}`);
  }
  const keyboardLayout = kbParts.length > 0 ? kbParts.join(' | ') : 'Standard US / Default';

  // 19. Operating System
  const osParts = [
    osInfo.Caption || `${os.type()} ${os.release()}`,
    osInfo.OSArchitecture || os.arch(),
    osInfo.Version ? `v${osInfo.Version}` : null,
    osInfo.BuildNumber ? `Build ${osInfo.BuildNumber}` : null,
  ].filter(Boolean);
  const operatingSystem = osParts.join(' • ');

  // Compute unique Serial Numbers / Hardware IDs per part
  const screenSerial = [...new Set(monIds.map((m) => cleanSerial(m.SerialNumber)).filter(Boolean))].join(' | ') || '—';
  const gpuSerial = [...new Set(gpus.map((g) => cleanSerial(g.PNPDeviceID)).filter(Boolean))].join(' | ') || '—';
  const cpuSerial = [...new Set(cpus.map((c) => cleanSerial(c.ProcessorId)).filter(Boolean))].join(' | ') || '—';
  const ramSerial = memModules
    .map((m, i) => {
      const sn = cleanSerial(m.SerialNumber);
      const pn = cleanSerial(m.PartNumber);
      if (!sn && !pn) return null;
      return `Slot ${i + 1}: ${[sn ? `SN ${sn}` : null, pn ? `PN ${pn}` : null].filter(Boolean).join(' / ')}`;
    })
    .filter(Boolean)
    .join(' | ') || '—';
  const diskSerial = [...new Set([
    ...physDisks.map((d) => cleanSerial(d.SerialNumber)),
    ...winDisks.map((d) => cleanSerial(d.SerialNumber)),
  ].filter(Boolean))].join(' | ') || '—';
  const opticalSerial = [...new Set(optical.map((o) => cleanSerial(o.PNPDeviceID)).filter(Boolean))].join(' | ') || '—';
  const wifiSerial = [...new Set(wifiAdapters.map((a) => cleanSerial(a.PermanentAddress || a.MACAddress || a.PnPDeviceID || a.PNPDeviceID)).filter(Boolean))].join(' | ') || '—';
  const btSerial = [...new Set(btList.map((d) => cleanSerial(d.DeviceID)).filter(Boolean))].join(' | ') || '—';
  const wwanSerial = [...new Set([
    ...wwanAdapters.map((a) => cleanSerial(a.PermanentAddress || a.MACAddress || a.PnPDeviceID || a.PNPDeviceID)),
    ...wwanPnp.map((d) => cleanSerial(d.DeviceID)),
  ].filter(Boolean))].join(' | ') || '—';
  const audioSerial = [...new Set(soundDevices.map((s) => cleanSerial(s.PNPDeviceID)).filter(Boolean))].join(' | ') || '—';
  const webcamSerial = [...new Set(cameras.map((c) => cleanSerial(c.DeviceID)).filter(Boolean))].join(' | ') || '—';
  const batterySerial = [...new Set([
    ...batStatic.map((b) => cleanSerial(b.SerialNumber)),
    ...batteries.map((b) => cleanSerial(b.DeviceID)),
  ].filter(Boolean))].join(' | ') || '—';
  const osSerial = cleanSerial(osInfo.SerialNumber) || '—';

  return {
    platform: process.platform,
    collectedAt: new Date().toISOString(),
    deviceIdentity: {
      manufacturer: cs.Manufacturer || 'Unknown',
      model: cs.Model || 'Unknown',
      serialNumber: cleanSerial(bios.SerialNumber) || 'Unavailable',
      baseboardSerial: cleanSerial(baseboard.SerialNumber) || 'Unavailable',
      systemUuid: cleanSerial(csProduct.UUID) || 'Unavailable',
      biosVersion: bios.SMBIOSBIOSVersion || 'Unavailable',
      hostname: os.hostname(),
    },
    specs: [
      { key: 'screenSizeType', label: 'Screen Size / Type', category: 'Display & Graphics', value: screenSizeType, serial: screenSerial },
      { key: 'maxResolution', label: 'Max Resolution', category: 'Display & Graphics', value: maxResolution, serial: '—' },
      { key: 'videoMemory', label: 'Video Memory', category: 'Display & Graphics', value: videoMemory, serial: '—' },
      { key: 'graphicsType', label: 'Graphics Type', category: 'Display & Graphics', value: graphicsType, serial: gpuSerial },
      { key: 'cpuType', label: 'CPU Type', category: 'Core Hardware', value: cpuType, serial: cpuSerial },
      { key: 'cpuSpeed', label: 'CPU Speed', category: 'Core Hardware', value: cpuSpeed, serial: '—' },
      { key: 'memoryRam', label: 'Memory RAM', category: 'Core Hardware', value: memoryRam, serial: ramSerial },
      { key: 'storage', label: 'Storage', category: 'Core Hardware', value: storage, serial: diskSerial },
      { key: 'opticalDrive', label: 'Optical Drive', category: 'Core Hardware', value: opticalDrive, serial: opticalSerial },
      { key: 'wirelessWifi', label: 'Wireless WiFi', category: 'Connectivity & Ports', value: wirelessWifi, serial: wifiSerial },
      { key: 'bluetooth', label: 'Bluetooth', category: 'Connectivity & Ports', value: bluetooth, serial: btSerial },
      { key: 'cellularWwan', label: 'Cellular WWAN', category: 'Connectivity & Ports', value: cellularWwan, serial: wwanSerial },
      { key: 'ports', label: 'Ports', category: 'Connectivity & Ports', value: ports, serial: '—' },
      { key: 'audio', label: 'Audio', category: 'Peripherals & Power', value: audio, serial: audioSerial },
      { key: 'webcam', label: 'Webcam', category: 'Peripherals & Power', value: webcam, serial: webcamSerial },
      { key: 'batteryCapacity', label: 'Battery Capacity', category: 'Peripherals & Power', value: batteryCapacity, serial: batterySerial },
      { key: 'batteryHealth', label: 'Battery Health & Cycles', category: 'Peripherals & Power', value: batteryHealth, serial: '—' },
      { key: 'acAdapterIncluded', label: 'AC Adapter Included', category: 'Peripherals & Power', value: acAdapter, serial: '—' },
      { key: 'keyboardLayout', label: 'Keyboard Layout', category: 'System & Input', value: keyboardLayout, serial: '—' },
      { key: 'operatingSystem', label: 'Operating System', category: 'System & Input', value: operatingSystem, serial: osSerial },
    ],
  };
}

function buildFallbackSpecs(electronEnv) {
  const cpus = os.cpus() || [];
  const primaryDisplay = electronEnv.displays[0];
  const totalMemGb = Math.round(os.totalmem() / (1024 ** 3));
  const freeMemGb = (os.freemem() / (1024 ** 3)).toFixed(1);

  return {
    platform: process.platform,
    collectedAt: new Date().toISOString(),
    deviceIdentity: {
      manufacturer: 'Unknown',
      model: os.machine ? os.machine() : 'Generic System',
      serialNumber: 'Unavailable',
      biosVersion: 'Unavailable',
      hostname: os.hostname(),
    },
    specs: [
      { key: 'screenSizeType', label: 'Screen Size / Type', category: 'Display & Graphics', value: primaryDisplay ? `${primaryDisplay.internal ? 'Internal Panel' : 'External Display'} (${primaryDisplay.colorDepth || 24}-bit)` : 'Unavailable' },
      { key: 'maxResolution', label: 'Max Resolution', category: 'Display & Graphics', value: primaryDisplay ? `${primaryDisplay.width} × ${primaryDisplay.height}` : 'Unavailable' },
      { key: 'videoMemory', label: 'Video Memory', category: 'Display & Graphics', value: 'Unavailable on this OS fallback' },
      { key: 'graphicsType', label: 'Graphics Type', category: 'Display & Graphics', value: 'Unavailable on this OS fallback' },
      { key: 'cpuType', label: 'CPU Type', category: 'Core Hardware', value: `${cpus[0]?.model || 'Unknown'} (${cpus.length} Threads)` },
      { key: 'cpuSpeed', label: 'CPU Speed', category: 'Core Hardware', value: cpus[0]?.speed ? `${(cpus[0].speed / 1000).toFixed(2)} GHz` : 'Unavailable' },
      { key: 'memoryRam', label: 'Memory RAM', category: 'Core Hardware', value: `${totalMemGb} GB Total (${freeMemGb} GB Free)` },
      { key: 'storage', label: 'Storage', category: 'Core Hardware', value: 'Unavailable on this OS fallback' },
      { key: 'opticalDrive', label: 'Optical Drive', category: 'Core Hardware', value: 'Unavailable on this OS fallback' },
      { key: 'wirelessWifi', label: 'Wireless WiFi', category: 'Connectivity & Ports', value: 'Unavailable on this OS fallback' },
      { key: 'bluetooth', label: 'Bluetooth', category: 'Connectivity & Ports', value: 'Unavailable on this OS fallback' },
      { key: 'cellularWwan', label: 'Cellular WWAN', category: 'Connectivity & Ports', value: 'Unavailable on this OS fallback' },
      { key: 'ports', label: 'Ports', category: 'Connectivity & Ports', value: 'Unavailable on this OS fallback' },
      { key: 'audio', label: 'Audio', category: 'Peripherals & Power', value: 'Unavailable on this OS fallback' },
      { key: 'webcam', label: 'Webcam', category: 'Peripherals & Power', value: 'Unavailable on this OS fallback' },
      { key: 'batteryCapacity', label: 'Battery Capacity', category: 'Peripherals & Power', value: 'Unavailable on this OS fallback', serial: '—' },
      { key: 'batteryHealth', label: 'Battery Health & Cycles', category: 'Peripherals & Power', value: 'Unavailable on this OS fallback', serial: '—' },
      { key: 'acAdapterIncluded', label: 'AC Adapter Included', category: 'Peripherals & Power', value: electronEnv.onBattery === null ? 'Unknown' : electronEnv.onBattery ? 'Disconnected (On Battery)' : 'Connected (On AC Power)' },
      { key: 'keyboardLayout', label: 'Keyboard Layout', category: 'System & Input', value: 'Unavailable on this OS fallback' },
      { key: 'operatingSystem', label: 'Operating System', category: 'System & Input', value: `${os.type()} ${os.release()} (${os.arch()})` },
    ],
  };
}

async function getSystemInfo(electronModule = null) {
  const electronEnv = getElectronDisplayAndPower(electronModule);
  if (process.platform === 'win32') {
    try {
      const raw = await runPowerShell();
      return buildSpecsFromWindows(raw, electronEnv);
    } catch (err) {
      const fallback = buildFallbackSpecs(electronEnv);
      fallback.error = err.message;
      return fallback;
    }
  }
  return buildFallbackSpecs(electronEnv);
}

module.exports = { getSystemInfo };
