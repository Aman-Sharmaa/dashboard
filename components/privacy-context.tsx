"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface PrivacyContextType {
    isPrivacyMode: boolean;
    togglePrivacy: () => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: ReactNode }) {
    const [isPrivacyMode, setIsPrivacyMode] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Load privacy preference from localStorage on mount
    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem("privacy_mode");
        if (stored !== null) {
            setIsPrivacyMode(stored === "true");
        }
    }, []);

    const togglePrivacy = () => {
        setIsPrivacyMode((prev) => {
            const newValue = !prev;
            localStorage.setItem("privacy_mode", String(newValue));
            return newValue;
        });
    };

    // Prevent hydration mismatch
    // Prevent hydration mismatch
    // We render with default false privacy mode initially to match server
    // User preference is applied slightly after mount

    return (
        <PrivacyContext.Provider value={{ isPrivacyMode, togglePrivacy }}>
            {children}
        </PrivacyContext.Provider>
    );
}

export function usePrivacy() {
    const context = useContext(PrivacyContext);
    if (context === undefined) {
        throw new Error("usePrivacy must be used within a PrivacyProvider");
    }
    return context;
}
