"use client";

import { TeamCard } from "@/components/team-card";

export interface FoundersSectionProps {
  title?: string;
  subtitle?: string;
  founders?: any[];
  teamMembers?: any[];
}

export function FoundersSection({
  title = "Our Founders & Team",
  subtitle = "Our team combines deep industry knowledge with hands-on experience to help startups grow smarter and faster.",
  founders = [],
  teamMembers = [],
}: FoundersSectionProps) {
  return (
    <section className="pb-16 px-4 sm:px-6 pt-16">
      <div className="max-w-[1200px] mx-auto">
        {/* Text */}
        <div className="mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-4">
            {title}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 max-w-md leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Founders */}
        {founders && founders.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {founders.map((member) => (
              <TeamCard
                key={member.name}
                name={member.name}
                role={member.role}
                image={member.image}
                linkedin={member.linkedin}
                email={member.email}
                calendly={member.calendly}
              />
            ))}
          </div>
        )}

        {/* Team Members */}
        {teamMembers && teamMembers.length > 0 && (
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {teamMembers.map((member) => (
              <TeamCard
                key={member.name}
                name={member.name}
                role={member.role}
                image={member.image}
                linkedin={member.linkedin}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
