"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type EmployeeMin = {
  _id: string;
  name: string;
};

type GigWorkerAPI = {
  id: string;
  name: string;
  photo?: string;
  role?: string;
  "joining date"?: string;
  manager?: string; // We'll add this
};

export function TeamSettingsClient({ employees }: { employees: EmployeeMin[] }) {
  const [apiUrl, setApiUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState<GigWorkerAPI[]>([]);
  const [bulkManager, setBulkManager] = useState<string>("none");

  const handleFetch = async () => {
    if (!apiUrl) {
      toast.error("Please enter an API URL");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error("Failed to fetch from API");
      const data = await res.json();
      if (!Array.isArray(data)) {
        toast.error("API must return a JSON array");
        setWorkers([]);
        return;
      }
      setWorkers(data);
      toast.success(`Fetched ${data.length} workers successfully.`);
    } catch (e: any) {
      toast.error(e.message || "Error fetching from API");
    } finally {
      setLoading(false);
    }
  };

  const updateWorkerManager = (index: number, managerName: string) => {
    const updated = [...workers];
    updated[index].manager = managerName === "none" ? "" : managerName;
    setWorkers(updated);
  };

  const handleBulkAssign = (managerName: string) => {
    setBulkManager(managerName);
    if (managerName === "none") return;
    const updated = workers.map((w) => ({ ...w, manager: managerName }));
    setWorkers(updated);
  };

  const handleImport = async () => {
    if (workers.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/gig-workers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workers }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setWorkers([]);
        setApiUrl("");
      } else {
        toast.error(data.message || "Import failed");
      }
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Connect Gig Workers API</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Connect an external API to fetch verified gig workers (delivery partners).
          <br />
          <strong>Expected JSON Array Format:</strong> <br />
          <code className="text-xs bg-muted px-2 py-1 rounded">
            {`[{ "id": "123", "name": "John Doe", "photo": "url", "role": "Delivery", "joining date": "2024-01-01" }]`}
          </code>
        </p>
        
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="apiUrl">API URL</Label>
            <Input 
              id="apiUrl" 
              placeholder="https://api.example.com/gig-workers" 
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
          </div>
          <Button onClick={handleFetch} disabled={loading || !apiUrl}>
            Fetch Workers
          </Button>
        </div>
      </div>

      {workers.length > 0 && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Fetched Workers ({workers.length})</h3>
            <div className="flex items-center gap-3">
              <Label className="text-sm">Bulk Assign Manager:</Label>
              <Select value={bulkManager} onValueChange={handleBulkAssign}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select Manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp._id} value={emp.name}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleImport} disabled={loading}>
                Save & Import
              </Button>
            </div>
          </div>

          <div className="border rounded-md divide-y">
            {workers.map((worker, i) => (
              <div key={i} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={worker.photo} />
                    <AvatarFallback>{worker.name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{worker.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{worker.role || "Gig Worker"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select 
                    value={worker.manager || "none"} 
                    onValueChange={(val) => updateWorkerManager(i, val)}
                  >
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="Assign Manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Manager</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp._id} value={emp.name}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
