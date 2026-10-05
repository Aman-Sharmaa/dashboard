import { Linkedin, Mail, Calendar } from "lucide-react";
export interface TeamCardProps {
  name: string;
  role: string;
  image: string;
  linkedin?: string;
  email?: string;
  calendly?: string;
}

export function TeamCard({
  name,
  role,
  image,
  linkedin,
  email,
  calendly,
}: TeamCardProps) {
  return (
    <div className="relative group mt-2">
      <div className="relative aspect-[3/4] rounded-[28px] overflow-hidden bg-gray-100">
        <img
          src={image || "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </div>

      {/* Info Card */}
      <div
        className="absolute -bottom-10 left-4 right-4 rounded-2xl px-4 py-4 shadow-sm
          bg-white/60 backdrop-blur-xl backdrop-saturate-150
          shadow-[0_8px_30px_rgba(0,120,255,0.08)]
          hover:shadow-[0_12px_40px_rgba(0,120,255,0.12)]
          transition-shadow mb-2"
      >
        <h3 className="text-base font-medium">{name}</h3>
        <p className="text-sm text-gray-500">{role}</p>

        {/* Links */}
        <div className="mt-3 flex gap-3">
          {linkedin && (
            <a
              href={linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-black transition"
              aria-label={`${name} on LinkedIn`}
            >
              <Linkedin size={18} />
            </a>
          )}
          {email && (
            <a
              href={email}
              className="text-gray-500 hover:text-black transition"
              aria-label={`Email ${name}`}
            >
              <Mail size={18} />
            </a>
          )}
          {calendly && (
            <a
              href={calendly}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-black transition"
              aria-label={`Book a call with ${name}`}
            >
              <Calendar size={18} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
