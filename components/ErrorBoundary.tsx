
import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    if(confirm("This will clear your local project cache. Continue?")) {
        localStorage.clear();
        window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0b0e14] flex flex-col items-center justify-center p-8 text-center font-sans">
          <div className="w-24 h-24 bg-red-900/20 rounded-full flex items-center justify-center mb-6 border border-red-500/50 animate-pulse">
            <span className="text-5xl">🛑</span>
          </div>
          
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">System Failure</h1>
          <p className="text-red-300 font-mono text-sm bg-red-900/10 px-4 py-2 rounded border border-red-900/50 max-w-lg overflow-x-auto">
            {this.state.error?.message || "Unknown Error"}
          </p>
          
          <p className="text-glass-text-secondary mt-6 max-w-md mb-8">
            The architect encountered a critical structural failure. Don't worry, your data is likely safe in local storage.
          </p>

          <div className="flex gap-4">
            <button 
                onClick={this.handleReload}
                className="px-6 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl shadow-lg transition-all"
            >
                Reload Interface
            </button>
            <button 
                onClick={this.handleReset}
                className="px-6 py-3 bg-slate-800 hover:bg-red-900/50 text-slate-300 hover:text-white font-bold rounded-xl border border-slate-700 hover:border-red-500 transition-all"
            >
                Emergency Reset
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
