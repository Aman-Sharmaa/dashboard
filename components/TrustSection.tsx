"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

export function TrustSection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 bg-white/60
    backdrop-blur-xl     rounded-3xl
    backdrop-saturate-150
    shadow-[0_8px_30px_rgba(0,120,255,0.08)]
    border border-white/40
    hover:shadow-[0_12px_40px_rgba(0,120,255,0.12)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl border border-gray-100 p-6 sm:p-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">

            {/* Left content */}
            <div className="lg:col-span-1">
              <h3 className="text-2xl sm:text-3xl font-medium text-gray-900">
                Trusted by 25,000+
                <br />
                happy customers
              </h3>

              <p className="mt-4 text-gray-600 text-base max-w-md">
                Join thousands of businesses who trust us to fuel their growth
                and start maximizing growth.
              </p>
            </div>

            {/* Stat 1 */}
            <div className="bg-[#f8f6f2] rounded-2xl p-6">
              <h4 className="text-4xl font-semibold text-gray-900">15%</h4>
              <p className="mt-2 text-sm text-gray-600">
                Active users visiting us
                <br />
                every month!
              </p>
            </div>

            {/* Stat 2 */}
            <div className="bg-[#f8f6f2] rounded-2xl p-6">
              <div className="flex items-center gap-2">
                <h4 className="text-4xl font-semibold text-gray-900">4.9</h4>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className="fill-orange-500 text-orange-500"
                    />
                  ))}
                </div>
              </div>

              <p className="mt-2 text-sm text-gray-600">
                Rated 4.9 ★ by 1,938
                <br />
                happy customers.
              </p>
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  );
}
