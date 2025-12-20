
import { CLIEvent, SyncStatus } from '../types';

type Listener = (event: CLIEvent) => void;
type StatusListener = (status: SyncStatus) => void;

class CLISyncService {
  private static instance: CLISyncService;
  private ws: WebSocket | null = null;
  private status: SyncStatus = 'disconnected';
  private listeners: Listener[] = [];
  private statusListeners: StatusListener[] = [];
  private reconnectInterval: any = null;
  private port = 21337; // "Relai" in leetspeak

  private constructor() {}

  public static getInstance(): CLISyncService {
    if (!CLISyncService.instance) {
      CLISyncService.instance = new CLISyncService();
    }
    return CLISyncService.instance;
  }

  public connect() {
    if (this.status === 'connected' || this.status === 'connecting') return;

    this.updateStatus('connecting');
    
    try {
      this.ws = new WebSocket(`ws://localhost:${this.port}`);
      
      this.ws.onopen = () => {
        console.log("🔌 0relai Bridge Connected");
        this.updateStatus('connected');
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
      };

      this.ws.onclose = () => {
        console.log("🔌 0relai Bridge Disconnected");
        this.updateStatus('disconnected');
        this.ws = null;
        // Auto-reconnect if it was an unexpected close
        if (!this.reconnectInterval) {
            this.reconnectInterval = setInterval(() => this.connect(), 3000);
        }
      };

      this.ws.onerror = (e) => {
        // Silent error, will handle via close
      };

      this.ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data) as CLIEvent;
            this.notifyListeners(data);
        } catch (e) {
            console.error("Failed to parse CLI message", e);
        }
      };

    } catch (e) {
      this.updateStatus('disconnected');
    }
  }

  public disconnect() {
    if (this.reconnectInterval) clearInterval(this.reconnectInterval);
    if (this.ws) {
        this.ws.close();
        this.ws = null;
    }
    this.updateStatus('disconnected');
  }

  public subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => {
        this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public subscribeStatus(listener: StatusListener) {
    this.statusListeners.push(listener);
    listener(this.status); // Initial emit
    return () => {
        this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(event: CLIEvent) {
    this.listeners.forEach(l => l(event));
  }

  private updateStatus(newStatus: SyncStatus) {
    this.status = newStatus;
    this.statusListeners.forEach(l => l(newStatus));
  }

  // --- Mock Simulation for Demo ---
  public simulateConnection() {
      this.updateStatus('connecting');
      setTimeout(() => {
          this.updateStatus('connected');
          
          // Simulate incoming tree
          setTimeout(() => {
              const mockEvent: CLIEvent = {
                  type: 'tree',
                  payload: `.\n├── src\n│   ├── components\n│   │   ├── Header.tsx\n│   │   └── Footer.tsx\n│   ├── App.tsx\n│   └── index.tsx\n├── package.json\n└── README.md`,
                  timestamp: Date.now()
              };
              this.notifyListeners(mockEvent);
          }, 1000);

      }, 1000);
  }
}

export const cliSync = CLISyncService.getInstance();
