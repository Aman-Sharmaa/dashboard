import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { Routine } from "@/models/Routine";

const COOKIE_NAME = "kalp_auth_token";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

/**
 * POST /api/routines/[id]/complete
 * Marks a routine as completed for today. Updates streak.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;

  const routine = await Routine.findById(id);
  if (!routine) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const today = new Date();
  const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);

  // Check if already completed today
  const alreadyDone = routine.completions.some((c) => {
    const d = new Date(c.date);
    return d >= todayStart && d <= todayEnd;
  });

  if (alreadyDone) {
    return NextResponse.json({ message: "Already completed today", routine: { ...routine.toObject(), id: String(routine._id) } });
  }

  // Check streak continuity (was completed yesterday?)
  const yesterday = new Date(todayStart);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(23, 59, 59, 999);

  const completedYesterday = routine.completions.some((c) => {
    const d = new Date(c.date);
    return d >= yesterday && d <= yesterdayEnd;
  });

  // If last working day was completed, continue streak; otherwise reset to 1
  const newStreak = completedYesterday ? routine.streak + 1 : 1;

  routine.completions.push({
    date: todayStart,
    completedAt: today,
    completedBy: user.email,
  });

  // Keep only last 60 completions
  if (routine.completions.length > 60) {
    routine.completions = routine.completions.slice(-60);
  }

  routine.streak = newStreak;
  routine.lastCompletedAt = today;
  await routine.save();

  return NextResponse.json({
    routine: { ...routine.toObject(), id: String(routine._id) },
    streak: newStreak,
  });
}
