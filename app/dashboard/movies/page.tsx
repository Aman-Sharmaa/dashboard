import MoviesClient from "./movies-client";
import { connectDB } from "@/lib/db";
import { Movie } from "@/models/Movie";

export const dynamic = "force-dynamic";

export default async function MoviesPage() {
  await connectDB();
  // Fetch initial movies
  const movies = await Movie.find().sort({ createdAt: -1 }).lean();
  
  return (
    <div className="p-6 w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Movies</h1>
        <p className="text-muted-foreground">Manage your uploaded movies and start watch parties.</p>
      </div>
      
      <MoviesClient initialMovies={JSON.parse(JSON.stringify(movies))} />
    </div>
  );
}
