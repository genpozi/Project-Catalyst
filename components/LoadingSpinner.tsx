
import React from 'react';

const LoadingSpinner: React.FC = () => {
  const messages = [
    "Consulting with digital muses...",
    "Analyzing possibilities...",
    "Synthesizing creative strategies...",
    "Brewing a fresh pot of innovation...",
    "Engaging hyper-drive for research...",
    "Assembling action items...",
  ];
  const [message, setMessage] = React.useState(messages[0]);

  React.useEffect(() => {
    const intervalId = setInterval(() => {
      setMessage(messages[Math.floor(Math.random() * messages.length)]);
    }, 2500);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fade-in">
      <div className="w-16 h-16 border-4 border-t-brand-secondary border-r-brand-secondary border-b-brand-secondary border-l-brand-dark rounded-full animate-spin"></div>
      <p className="mt-6 text-xl text-brand-text">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
