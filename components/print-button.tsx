"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton() {
    return (
        <Button
            variant="outline"
            onClick={() => window.print()}
            className="print:hidden fixed top-4 right-4 md:top-8 md:right-8 shadow-md bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
        >
            <Printer className="mr-2 h-4 w-4" /> Print Proposal
        </Button>
    );
}
