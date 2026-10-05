"use client";

import { ReactNode } from "react";
import { usePrivacy } from "./privacy-context";

interface PrivacyBlurProps {
    children: ReactNode;
}

export function PrivacyBlur({ children }: PrivacyBlurProps) {
    const { isPrivacyMode } = usePrivacy();

    return (
        <span
            className={`inline-block transition-all duration-200 ${isPrivacyMode ? "blur-[8px] select-none" : ""
                }`}
            style={isPrivacyMode ? { userSelect: "none" } : undefined}
        >
            {children}
        </span>
    );
}
