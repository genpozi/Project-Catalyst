
import React, { useState, useEffect } from 'react';

const TOUR_STEPS = [
    {
        target: 'body', // Center modal
        title: 'Welcome to 0relai',
        content: 'I am your AI Architect. I will help you turn your idea into a production-ready technical blueprint.'
    },
    {
        target: '#app-sidebar',
        title: 'The Process',
        content: 'Follow this vertical roadmap. We start with your Vision and move through Architecture, Data, and Security step-by-step.'
    },
    {
        target: '#cmd-palette-trigger',
        title: 'Command Center',
        content: 'Press Cmd+K (or Ctrl+K) anytime to jump between phases, export data, or trigger actions.'
    },
    {
        target: '#chat-toggle',
        title: 'Your Copilot',
        content: 'Stuck? Click here or press the Assistant button to chat with the AI Architect about your project context.'
    },
    {
        target: '#settings-trigger',
        title: 'Local Privacy',
        content: 'Enable the Local Neural Engine here to run models directly in your browser for offline privacy.'
    }
];

const OnboardingTour: React.FC = () => {
    const [stepIndex, setStepIndex] = useState(-1);
    const [isVisible, setIsVisible] = useState(false);
    const [rect, setRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        const hasSeen = localStorage.getItem('0relai-onboarding-completed');
        if (!hasSeen) {
            // Delay start slightly for UI render
            setTimeout(() => {
                setStepIndex(0);
                setIsVisible(true);
            }, 1000);
        }
    }, []);

    useEffect(() => {
        if (stepIndex >= 0 && stepIndex < TOUR_STEPS.length) {
            const targetId = TOUR_STEPS[stepIndex].target;
            if (targetId === 'body') {
                setRect(null); // Center mode
            } else {
                const el = document.querySelector(targetId);
                if (el) {
                    setRect(el.getBoundingClientRect());
                    // Ensure visible
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    }, [stepIndex]);

    const handleNext = () => {
        if (stepIndex < TOUR_STEPS.length - 1) {
            setStepIndex(stepIndex + 1);
        } else {
            finishTour();
        }
    };

    const finishTour = () => {
        setIsVisible(false);
        localStorage.setItem('0relai-onboarding-completed', 'true');
    };

    if (!isVisible || stepIndex === -1) return null;

    const step = TOUR_STEPS[stepIndex];
    const isCenter = !rect;

    return (
        <div className="fixed inset-0 z-[9999] overflow-hidden pointer-events-auto">
            {/* Backdrop with cutout */}
            <div className="absolute inset-0 bg-black/60 transition-all duration-500 ease-in-out" 
                 style={rect ? {
                     clipPath: `polygon(
                        0% 0%, 
                        0% 100%, 
                        ${rect.left}px 100%, 
                        ${rect.left}px ${rect.top}px, 
                        ${rect.right}px ${rect.top}px, 
                        ${rect.right}px ${rect.bottom}px, 
                        ${rect.left}px ${rect.bottom}px, 
                        ${rect.left}px 100%, 
                        100% 100%, 
                        100% 0%
                     )`
                 } : {}}
            ></div>

            {/* Spotlight Border */}
            {rect && (
                <div 
                    className="absolute border-2 border-brand-primary rounded-lg shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all duration-300 pointer-events-none"
                    style={{
                        top: rect.top - 4,
                        left: rect.left - 4,
                        width: rect.width + 8,
                        height: rect.height + 8
                    }}
                ></div>
            )}

            {/* Popover */}
            <div 
                className="absolute bg-[#1e293b] border border-brand-primary/50 p-6 rounded-2xl shadow-2xl max-w-sm w-full transition-all duration-300"
                style={isCenter ? {
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                } : {
                    top: (rect?.bottom || 0) + 20,
                    left: Math.min(Math.max((rect?.left || 0) - 20, 20), window.innerWidth - 340) // Keep in bounds
                }}
            >
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-white">{step.title}</h3>
                    <span className="text-xs font-bold text-glass-text-secondary bg-white/5 px-2 py-1 rounded">
                        {stepIndex + 1} / {TOUR_STEPS.length}
                    </span>
                </div>
                
                <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                    {step.content}
                </p>

                <div className="flex justify-between items-center">
                    <button 
                        onClick={finishTour} 
                        className="text-xs text-slate-500 hover:text-white transition-colors"
                    >
                        Skip Tour
                    </button>
                    <button 
                        onClick={handleNext}
                        className="bg-brand-primary hover:bg-brand-secondary text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg transition-all"
                    >
                        {stepIndex === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingTour;
