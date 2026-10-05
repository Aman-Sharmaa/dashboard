"use client";

import { useEffect, useState } from "react";
import { TeamCard } from "@/components/team-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export interface KalpFoundersSectionProps {
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  buttonHref?: string;
  member1Id?: string;
  member2Id?: string;
}

export function KalpFoundersSection({
  title = "Our Founders & Team",
  subtitle = "Our team combines deep industry knowledge with hands-on experience to help startups grow smarter and faster.",
  buttonLabel = "Learn more",
  buttonHref = "#",
  member1Id = "",
  member2Id = "",
}: KalpFoundersSectionProps) {
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeam() {
      try {
        const res = await fetch("/api/employees");
        if (res.ok) {
          const data = await res.json();
          // Sort or filter team members if specific ones are requested (by name or ID)
          let selected = data.employees || [];
          if (member1Id || member2Id) {
            selected = selected.filter((e: any) => e.name === member1Id || e.name === member2Id || e.id === member1Id || e.id === member2Id);
          }
          // Default to first 2 if none matched or none specified
          if (selected.length === 0) selected = data.employees || [];
          setTeam(selected.slice(0, 2));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchTeam();
  }, [member1Id, member2Id]);

  return (
    <section className="py-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Side */}
        <div className="space-y-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
            {title}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
            {subtitle}
          </p>
          <Button asChild size="lg" className="rounded-full px-8">
            <Link href={buttonHref}>{buttonLabel}</Link>
          </Button>
        </div>

        {/* Right Side */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : team.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {team.map((member) => (
                <TeamCard
                  key={member.id || member.name}
                  name={member.name}
                  role={member.title || "Team Member"}
                  image={member.avatarUrl}
                  email={member.email}
                />
              ))}
            </div>
          ) : (
            <div className="text-center p-8 border border-dashed rounded-xl bg-muted/20 text-muted-foreground">
              No team members found.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
