import { useEffect, useState } from 'react';
import './App.css'
import axios from 'axios'
import { Switch } from '@mui/material';


// Simple SVG Icons
const Icons = {
  RefreshCw: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2v6h-6"></path>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
      <path d="M3 22v-6h6"></path>
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
    </svg>
  ),
  Power: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
      <line x1="12" y1="2" x2="12" y2="12"></line>
    </svg>
  ),
  Shield: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  ),
  Zap: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  ),
  Activity: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  ),
  AlertTriangle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  ),
  Lock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  )
};

// Custom components
const StatusCard = ({ title, icon, children }) => (
  <div className="status-card">
    <div className="card-header">
      <div className="card-icon-wrapper">{icon}</div>
      <h3 className="card-title">{title}</h3>
    </div>
    <div className="card-content">
      {children}
    </div>
  </div>
);

const StatusButton = ({ active, onClick, disabled }) => (
  <Switch
    checked={active}
    onChange={onClick}
    disabled={disabled}
    color="primary"
    inputProps={{ 'aria-label': 'toggle switch' }}
  />
);

const StatusItem = ({ label, value, isToggle, onToggle, disabled }) => {
  const status = checkBit(value)
  return (
    <div className="status-item">
      <span className="status-label">{label}</span>
      {isToggle ? (
        <StatusButton active={status} onClick={onToggle} disabled={disabled} />
      ) : (
        <span className={`status-indicator-label ${status ? 'status-alert' : 'status-normal'}`}>
          {status ? 'Yes' : 'No'}
        </span>
      )}
    </div>
  );
};

const checkBit = (value) => {
  const status = value === '1' || value === 1 || value === true;
  return status
}

function App() {
  const [ip, setIp] = useState('');
  const [httpData, setHttpData] = useState(null);
  const [tcpData, setTcpData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  const fetchData = async () => {
    if (!ip || !connected) return;

    try {
      // Fetch HTTP data
      const httpResponse = await fetch(`http://localhost:30002/http-status?ip=${ip}`);
      const text = await httpResponse.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      const parsedHttpData = {};
      Array.from(xmlDoc.documentElement.children).forEach((child) => {
        parsedHttpData[child.tagName] = child.textContent;
      });
      setHttpData(parsedHttpData);

      // Fetch TCP data
      const tcpRes = await fetch(`http://localhost:30002/tcp-status?ip=${ip}`);
      const tcpJson = await tcpRes.json();
      setTcpData(tcpJson.bufferData);
      if (httpResponse || tcpJson) {
        return httpResponse || tcpJson
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setConnected(false);
    }
  };

  const handleConnect = async () => {
    if (!ip) return;
    setLoading(true);

    try {
      await fetchData();
      setConnected(true);
    } catch (err) {
      console.error('Connection error:', err);
      setConnected(false);
    }

    setLoading(false);
  };

  // Set up interval for automatic refresh when connected
  useEffect(() => {
    let intervalId;

    if (connected) {
      // Fetch immediately and then set up interval
      fetchData();
      intervalId = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [connected, ip, refreshInterval]);

  const handleToggle = async (type, key) => {
    console.log(`Toggled ${key} from ${type}`);
    try {
      // await fetch(`http://localhost:3002/http?ip=${ip}?key=${key}`);
      // await fetch(`http://${ip}/leds.cgi?led=${key}`)
      await axios.get(`http://localhost:30002/http`, {
        params: { ip, key }
      });

      // After toggle, immediately fetch updated data
      await fetchData();
    } catch (error) {
      console.log(error);
    }
  };

  const handleToggleTcp = async (type, key) => {
    try {
      // Map the key to its corresponding TCP command based on current value
      const commandMap = {
        FenceStatus: {
          1: 'DISARM',
          0: 'ARM',
        },
        GadgetStatus: {
          1: 'GADGET_OFF',
          0: 'GADGET_ON',
        },
        ServiceMode: {
          1: 'SERVICE_MODE_OFF',
          0: 'SERVICE_MODE_ON',
        },
        Posponed: {
          1: 'SERVICE_MODE_OFF',
          0: 'SERVICE_MODE_ON',
        },
        AlarmStatus: {
          1: 'ACKNOWLEDGE',
          0: 'ACKNOWLEDGE',
        },
      };

      // Convert to number in case it's a string like "1" or "0"
      const currentValue = Number(tcpData?.[key]);

      const commandKey = commandMap[key]?.[currentValue];
      if (!commandKey) {
        console.warn(`Invalid TCP command for ${key} with value ${currentValue}`);
        return;
      }

      await fetch(`http://localhost:30002/tcp?ip=${ip}&key=${commandKey}`);
      console.log("first")
      // Refetch updated TCP data
      await fetchData();

    } catch (err) {
      console.error("TCP toggle error:", err);
    }
  };

  const handleIpChange = (e) => {
    let value = e.target.value;

    // // Remove any characters other than digits and dots
    // value = value.replace(/[^\d.]/g, '');

    // // Split current value into parts
    // const parts = value.split('.').filter((part) => part.length <= 3);

    // // Automatically insert a dot if the user types 3 digits in a segment
    // let formatted = '';
    // for (let i = 0; i < parts.length; i++) {
    //   if (parts[i].length === 3 && i < 3) {
    //     formatted += parts[i] + '.';
    //   } else {
    //     formatted += parts[i];
    //     if (i < parts.length - 1) formatted += '.';
    //   }
    // }

    // // Don't allow more than 4 parts
    // const finalValue = formatted.split('.').slice(0, 4).join('.');
    setIp(value);
  };

  return (
    <>
      <div className="dashboard-container">
        <div className="container">
          {/* Header */}
          <div className="header">
            <h1>Security Status Dashboard</h1>
            <p>Monitor and manage your security system status with real-time updates</p>
          </div>

          {/* Connection Panel */}
          <div className="connection-panel">
            <div className="panel-content">
              <div className="panel-title">
                <h2>Device Connection</h2>
                <p>Enter the IP address of your security device</p>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const ipPattern =
                    /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

                  if (!ipPattern.test(ip)) {
                    alert('Please enter a valid IPv4 address.');
                    return;
                  }

                  handleConnect();
                }}
              >
                <div className="input-group">
                  <input
                    type="text"
                    value={ip}
                    onChange={handleIpChange}
                    placeholder="IP address "
                    className="input-field"
                    maxLength={15} // 255.255.255.255
                  />
                  <button
                    type="submit"
                    disabled={loading || !ip}
                    className="connect-button"
                  >
                    <span className="button-icon">
                      {loading ? <Icons.RefreshCw /> : <Icons.Power />}
                    </span>
                    {loading ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              </form>


            </div>

            {connected && (httpData || tcpData) && (
              <div className="connection-status">
                <div className="status-indicator"></div>
                Connected to {ip}
              </div>
            )}
          </div>

          {/* Status Cards Grid */}
          {(httpData || tcpData) && (
            <div className="cards-grid">



              {/* HTTP Status Card */}
              <StatusCard title="HTTP Status Controls" icon={<Icons.Shield />}>
                <div className="status-group">
                  <div className="status-item-container">
                    <StatusItem
                      label="Fence System"
                      value={httpData?.FenceStaus}
                      isToggle
                      onToggle={() => handleToggle('HTTP', '1')}
                    />
                  </div>
                  <div className="status-item-container">
                    <StatusItem
                      label="Gadget System"
                      value={httpData?.LightStaus || '0'}
                      isToggle
                      onToggle={() => handleToggle('HTTP', '2')}
                    />
                  </div>
                  <div className="status-item-container">
                    <StatusItem
                      label="Acknowledge"
                      value={httpData?.IntrusionAlarm}
                      isToggle
                      disabled={!checkBit(httpData?.IntrusionAlarm || httpData?.DrainageIntrusionAlarm)}
                      onToggle={() => handleToggle('HTTP', '3')}
                    />
                  </div>
                  <div className="status-item-container">
                    <StatusItem
                      label="Postpone"
                      value={httpData?.ServiceMode}
                      isToggle
                      disabled={!checkBit(httpData?.IntrusionAlarm || httpData?.DrainageIntrusionAlarm)}
                      onToggle={() => handleToggle('HTTP', '4')}
                    />
                  </div>
                </div>
              </StatusCard>





              {/* TCP Status Card */}
              <StatusCard title="TCP Status Controls" icon={<Icons.Zap />}>
                <div className="status-group">
                  <div className="status-item-container">
                    <StatusItem
                      label="Fence System"
                      value={tcpData?.FenceStatus}
                      isToggle
                      onToggle={() => handleToggleTcp('TCP', 'FenceStatus')}
                    />
                  </div>
                  <div className="status-item-container">
                    <StatusItem
                      label="Gadget System"
                      value={tcpData?.GadgetStatus}
                      isToggle
                      onToggle={() => handleToggleTcp('TCP', 'GadgetStatus')}
                    />
                  </div>
                  <div className="status-item-container">
                    <StatusItem
                      label="Service Mode"
                      value={tcpData?.ServiceMode}
                      isToggle
                      onToggle={() => handleToggleTcp('TCP', 'ServiceMode')}
                    />
                  </div>
                  <div className="status-item-container">
                    <StatusItem
                      label="Acknowledge"
                      value={tcpData?.ServiceMode}
                      isToggle
                      disabled={!checkBit(tcpData?.AlarmStatus || tcpData?.DrinageIntrusion)}
                      onToggle={() => handleToggleTcp('TCP', 'AlarmStatus')}
                    />
                  </div>
                  <div className="status-item-container">
                    <StatusItem
                      label="Postpone"
                      value={tcpData?.ServiceMode}
                      isToggle
                      disabled={!checkBit(tcpData?.AlarmStatus || tcpData?.DrinageIntrusion)}
                      onToggle={() => handleToggleTcp('TCP', 'AlarmStatus')}
                    />
                  </div>
                </div>
              </StatusCard>

              {/* HTTP Status Indicators */}
              <StatusCard title="HTTP Status Indicators" icon={<Icons.Activity />}>
                <div className="indicators-grid">
                  {/* <StatusItem label="No Communication" value={httpData?.FVReturn === '0'} /> */}
                  <StatusItem label="Intrusion" value={httpData?.IntrusionAlarm} />
                  <StatusItem label="Drain Intrusion" value={httpData?.DrainageIntrusionAlarm} />
                  <StatusItem label="Enclosure Open" value={httpData?.EncloserAlarm} />
                  <StatusItem label="Lid Open" value={httpData?.LidAlarm} />
                  <StatusItem label="System Check" value={httpData?.Check} />
                </div>
              </StatusCard>

              {/* TCP Status Indicators */}
              <StatusCard title="TCP Status Indicators" icon={<Icons.AlertTriangle />}>
                <div className="indicators-grid">
                  {/* <StatusItem label="No Communication" value={tcpData?.FVReturn == '0'} /> */}
                  <StatusItem label="Intrusion" value={tcpData?.AlarmStatus} />
                  <StatusItem label="Drain Intrusion" value={tcpData?.DrinageIntrusion} />
                  <StatusItem label="Enclosure Open" value={tcpData?.EncloserStatus} />
                  <StatusItem label="Lid Open" value={tcpData?.LidStatus} />
                  <StatusItem label="System Check" value={tcpData?.Check} />
                </div>
              </StatusCard>
            </div>
          )}

          {/* Message when not connected */}
          {!httpData && !tcpData && !loading && (
            <div className="empty-state">
              <div className="empty-icon"><Icons.Lock /></div>
              <h3 className="empty-title">No Device Connected</h3>
              <p className="empty-text">
                Enter an IP address and click connect to monitor your security system status.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="footer">
            Security Status Dashboard © {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </>
  );
}

export default App;