"use client";

import { useState } from "react";
import { Copy, Check, Globe, Users, Lock, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShareDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    visibility: "me" | "org" | "shared" | "public";
    onVisibilityChange: (v: "me" | "org" | "shared" | "public") => void;
    sharedWith?: string[];
    onSharedWithChange?: (ids: string[]) => void;
    users?: { id: string; name: string }[];
    publicUrl?: string;
    itemName: string;
}

export function ShareDialog({
    isOpen, onOpenChange, visibility, onVisibilityChange, sharedWith = [],
    onSharedWithChange, users = [], publicUrl, itemName
}: ShareDialogProps) {
    const [copied, setCopied] = useState(false);
    const copyLink = () => {
        if (!publicUrl) return;
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        toast.success("Link copied");
        setTimeout(() => setCopied(false), 2000);
    };

    const levels = {
        public: { label: "Anyone with link", icon: Globe, color: "text-blue-500" },
        org: { label: "Organisation miembros", icon: Users, color: "text-green-500" },
        shared: { label: "Specific members", icon: UserPlus, color: "text-amber-500" },
        me: { label: "Only me", icon: Lock, color: "text-zinc-500" }
    };
    const Icon = levels[visibility].icon;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[460px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle>Share "{itemName}"</DialogTitle>
                    <DialogDescription>Control who can view this document.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">General Access</Label>
                        <div className="flex items-center gap-4 p-3 border rounded-xl bg-muted/20">
                            <div className={cn("p-2 rounded-lg bg-background border shadow-sm", levels[visibility].color)}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <Select value={visibility} onValueChange={(v: any) => onVisibilityChange(v)}>
                                    <SelectTrigger className="border-none bg-transparent p-0 h-8 shadow-none focus:ring-0 font-semibold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="public">Public</SelectItem>
                                        <SelectItem value="org">Organisation</SelectItem>
                                        <SelectItem value="shared">Specific members</SelectItem>
                                        <SelectItem value="me">Private</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">{levels[visibility].label}</p>
                            </div>
                        </div>
                    </div>
                    {visibility === "shared" && (
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Members</Label>
                            <div className="grid gap-1 max-h-[150px] overflow-y-auto p-2 border rounded-xl">
                                {users.map(u => (
                                    <div key={u.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{u.name[0]}</div>
                                            <span className="text-sm">{u.name}</span>
                                        </div>
                                        <input type="checkbox" className="rounded" checked={sharedWith.includes(u.id)}
                                            onChange={e => e.target.checked ? onSharedWithChange?.([...sharedWith, u.id]) : onSharedWithChange?.(sharedWith.filter(id => id !== u.id))} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {(visibility === "public" || visibility === "org") && publicUrl && (
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Copy Link</Label>
                            <div className="flex items-center gap-2 p-1 pl-3 border rounded-xl bg-background shadow-sm">
                                <p className="flex-1 text-xs text-muted-foreground truncate">{publicUrl}</p>
                                <Button variant="ghost" size="sm" onClick={copyLink} className="h-8 gap-2">
                                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                    <span>{copied ? "Copied" : "Copy"}</span>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-4 flex justify-end"><Button onClick={() => onOpenChange(false)}>Done</Button></div>
            </DialogContent>
        </Dialog>
    );
}
