"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Play, RefreshCw, Trash, Upload, Image as ImageIcon } from "lucide-react";
import * as UpChunk from "@mux/upchunk";
import { ConfirmDialog } from "@/components/confirm-dialog";

const STATUS_COLORS: Record<string, string> = {
  ready: "bg-emerald-500",
  uploading: "bg-amber-500",
  processing: "bg-blue-500",
  failed: "bg-red-500",
};

export default function MoviesClient({ initialMovies }: { initialMovies: any[] }) {
  const [movies, setMovies] = useState(initialMovies);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    } else {
      setThumbnailFile(null);
      setThumbnailPreview(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !file) return toast.error("Title and video file are required.");

    setUploading(true);
    setProgress(0);

    try {
      let thumbnailUrl = "";
      
      // 1. Upload thumbnail first if provided
      if (thumbnailFile) {
        const formData = new FormData();
        formData.append("file", thumbnailFile);
        const thumbRes = await fetch("/api/cms/upload", {
          method: "POST",
          body: formData,
        });
        if (thumbRes.ok) {
          const thumbData = await thumbRes.json();
          thumbnailUrl = thumbData.url;
        } else {
          toast.error("Failed to upload thumbnail. Proceeding without it.");
        }
      }

      // 2. Create movie record
      const res = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, thumbnail: thumbnailUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // 3. Upload video file to Mux
      const upload = UpChunk.createUpload({
        endpoint: data.uploadUrl,
        file: file,
        chunkSize: 5120,
      });

      upload.on("progress", (progressEvent) => {
        setProgress(Math.floor(progressEvent.detail));
      });

      upload.on("success", () => {
        toast.success("Upload complete! Mux is processing the video. Click 'Sync Status' in a minute to check when it's ready.");
        setMovies([data.movie, ...movies]);
        setIsUploadOpen(false);
        setUploading(false);
        setTitle("");
        setFile(null);
        setThumbnailFile(null);
        setThumbnailPreview(null);
      });

      upload.on("error", (err) => {
        console.error(err);
        toast.error("Upload failed.");
        setUploading(false);
      });

    } catch (err: any) {
      toast.error(err.message || "Failed to start upload");
      setUploading(false);
    }
  };

  const syncStatus = async (movieId: string) => {
    setSyncingId(movieId);
    try {
      const res = await fetch(`/api/movies/${movieId}/sync`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMovies(movies.map((m) => (m._id === movieId ? { ...m, ...data } : m)));
        if (data.status === "ready") {
          toast.success("Video is ready! You can now start a party.");
        } else {
          toast.info(`Status: ${data.status}. Still processing...`);
        }
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to sync status");
    } finally {
      setSyncingId(null);
    }
  };

  const startParty = async (movieId: string) => {
    try {
      const res = await fetch(`/api/movies/${movieId}/sessions`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        window.open(`/party/${data.shareId}`, "_blank");
        // Also fetch movies again to show active session
        const getRes = await fetch("/api/movies");
        if (getRes.ok) {
          const freshMovies = await getRes.json();
          setMovies(freshMovies);
        }
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to start party");
    }
  };

  const [deleteMovieTarget, setDeleteMovieTarget] = useState<{ id: string; hasActiveSession: boolean } | null>(null);
  const [deletingMovie, setDeletingMovie] = useState(false);

  const executeDeleteMovie = async () => {
    if (!deleteMovieTarget) return;
    setDeletingMovie(true);
    try {
      const res = await fetch(`/api/movies/${deleteMovieTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setMovies(movies.filter((m) => m._id !== deleteMovieTarget.id));
        toast.success("Movie deleted successfully");
        setDeleteMovieTarget(null);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete movie");
      }
    } catch {
      toast.error("Failed to delete movie");
    } finally {
      setDeletingMovie(false);
    }
  };

  const deleteMovie = (id: string, hasActiveSession: boolean) => {
    setDeleteMovieTarget({ id, hasActiveSession });
  };

  return (
    <div className="space-y-8 bg-slate-50 min-h-[80vh] p-8 rounded-xl border border-slate-200">
      {/* Delete Movie Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteMovieTarget}
        onOpenChange={(open) => { if (!open) setDeleteMovieTarget(null); }}
        title="Delete Movie?"
        description={
          deleteMovieTarget?.hasActiveSession
            ? "This movie has an active party session! Deleting it will end the ongoing session for all viewers. Are you sure?"
            : "Are you sure you want to delete this movie record?"
        }
        confirmLabel={deletingMovie ? "Deleting..." : "Delete Movie"}
        variant="destructive"
        isLoading={deletingMovie}
        onConfirm={executeDeleteMovie}
      />
      <div className="flex justify-between items-center pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Movie Library</h2>
          <p className="text-slate-500 mt-1">Manage your uploaded videos and watch parties.</p>
        </div>
        
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all">
              <Upload className="w-4 h-4 mr-2" /> Upload Movie
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-800">Upload New Movie</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-5 mt-2">
              <div className="space-y-2">
                <Label className="text-slate-700">Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={uploading} className="bg-white border-slate-300 text-slate-900" placeholder="e.g., Summer Recap 2026" />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Thumbnail (Optional)</Label>
                <div className="flex items-center gap-4">
                  {thumbnailPreview ? (
                    <div className="relative w-24 h-16 rounded overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                      <img src={thumbnailPreview} alt="Thumbnail preview" className="object-cover w-full h-full" />
                    </div>
                  ) : (
                    <div className="w-24 h-16 rounded border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-medium">Cover</span>
                    </div>
                  )}
                  <Input type="file" accept="image/*" onChange={handleThumbnailChange} disabled={uploading} className="bg-white border-slate-300 text-slate-700 text-sm" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">Video File (MP4)</Label>
                <Input type="file" accept="video/mp4,video/x-m4v,video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={uploading} className="bg-white border-slate-300 text-slate-700" />
              </div>

              {uploading && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-sm font-medium text-slate-600">
                    <span>Uploading to Mux...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                    <div className="bg-indigo-600 h-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {uploading ? "Processing..." : "Start Upload"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {movies.map((movie) => {
          const isReady = movie.status === "ready";
          const isSyncing = syncingId === movie._id;
          const hasActiveSession = !!movie.activeSession;
          
          return (
            <Card key={movie._id} className="overflow-hidden border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow group">
              <div className="aspect-video bg-slate-100 relative overflow-hidden border-b border-slate-100">
                {movie.thumbnail ? (
                  <img src={movie.thumbnail} alt={movie.title} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-slate-400 flex-col gap-2">
                    <ImageIcon className="w-8 h-8 opacity-50" />
                    <span className="text-xs font-medium uppercase tracking-wider">No Cover</span>
                  </div>
                )}
                
                {/* Status Badge */}
                <div className={`absolute top-3 left-3 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm ${STATUS_COLORS[movie.status] || "bg-slate-600"}`}>
                  {!isReady && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />}
                  {movie.status.toUpperCase()}
                </div>
                
                {/* Active Session Badge */}
                {hasActiveSession && (
                  <div className="absolute top-3 right-3 bg-red-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                    PARTY ACTIVE
                  </div>
                )}
              </div>
              
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-lg text-slate-800 line-clamp-1">{movie.title}</CardTitle>
              </CardHeader>
              
              <CardContent className="p-4 pt-0 text-sm text-slate-500 h-10">
                {!isReady && (
                  <p className="text-xs">
                    Video is processing. Click "Sync" to check status.
                  </p>
                )}
              </CardContent>
              
              <CardFooter className="p-4 pt-0 flex justify-between gap-2 border-t border-slate-50 bg-slate-50/50 mt-auto">
                {!isReady ? (
                  <Button variant="outline" size="sm" onClick={() => syncStatus(movie._id)} disabled={isSyncing} className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100">
                    {isSyncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    Sync Status
                  </Button>
                ) : hasActiveSession ? (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium" onClick={() => window.open(`/party/${movie.activeSession.shareId}`, "_blank")}>
                    <Play className="w-4 h-4 mr-2" /> Join Party
                  </Button>
                ) : (
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium" onClick={() => startParty(movie._id)}>
                    <Play className="w-4 h-4 mr-2" /> Start Party
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => deleteMovie(movie._id, hasActiveSession)} className="text-slate-400 hover:text-red-600 hover:bg-red-50">
                  <Trash className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
      
      {movies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Play className="w-6 h-6 text-slate-400 ml-1" />
          </div>
          <h3 className="text-lg font-medium text-slate-700">No movies found</h3>
          <p className="text-slate-500 mt-1 mb-6 text-sm">Upload your first video to start a watch party.</p>
          <Button onClick={() => setIsUploadOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Upload className="w-4 h-4 mr-2" /> Upload Movie
          </Button>
        </div>
      )}
    </div>
  );
}
