"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PostPasswordWallProps {
  correctPassword: string;
  children: React.ReactNode;
}

export function PostPasswordWall({ correctPassword, children }: PostPasswordWallProps) {
  const [password, setPassword] = useState("");
  const [isLocked, setIsLocked] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === correctPassword) {
      setIsLocked(false);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center p-4 min-h-[400px]">
      <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm shadow-xl border-neutral-200">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">This post is protected</CardTitle>
          <CardDescription>
            Enter the password to view the content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                className={`pr-10 h-11 ${error ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-sm text-red-500 text-center">Incorrect password. Please try again.</p>
            )}
            <Button type="submit" className="w-full h-11 text-base font-medium">
              View Content
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
