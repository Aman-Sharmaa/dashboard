"use client";

import { motion } from "framer-motion";

const clientLogos = [
  "/clients/dm.svg",
  "/clients/as.svg",
  "/clients/medone.svg",
  "/clients/zuari.svg",
  "/clients/dmca.svg",
  "/clients/flp.svg",
  "/clients/smep.svg",
  "/clients/floro.svg",
  "/clients/serrisvg.svg",
  "/clients/pmc.png",
];

const LOGO_WIDTH = 80;
const LOGO_GAP = 24;
const MASK_STYLES = {
  maskImage:
    "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
} as const;

/** Width of one full set of logos for seamless loop */
const getTrackWidth = (count: number) => count * LOGO_WIDTH + (count - 1) * LOGO_GAP;

export function ClientMarquee({ logos = clientLogos }: { logos?: string[] }) {
  const displayLogos = logos && logos.length > 0 ? logos : clientLogos;
  const trackWidth = getTrackWidth(displayLogos.length);
  return (
    <div className="relative w-full overflow-hidden">
      <p className="text-sm text-gray-500 mb-5">Trusted by 100+ clients</p>
      <div
        className="relative w-full overflow-hidden h-11 sm:h-12"
        style={MASK_STYLES}
      >
        <motion.div
          className="flex items-center h-full w-max"
          style={{ gap: LOGO_GAP }}
          animate={{ x: [0, -trackWidth] }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {[...displayLogos, ...displayLogos].map((logo, index) => (
            <div
              key={`${logo}-${index}`}
              className="flex items-center justify-center h-full flex-shrink-0"
              style={{ width: LOGO_WIDTH }}
            >
              <img
                src={logo}
                alt=""
                className="object-contain h-8 sm:h-10 w-full max-w-[80px] opacity-70 hover:opacity-100 transition-opacity"
                style={{
                  filter: "grayscale(100%) brightness(0.5)",
                }}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
