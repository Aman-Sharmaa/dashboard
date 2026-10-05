"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { DEFAULT_HOME_PAGE_SETTINGS, type HomeFaqSettings } from "@/lib/home-page-defaults";

type FAQSectionProps = {
  settings?: HomeFaqSettings;
};

export function FAQSection({ settings = DEFAULT_HOME_PAGE_SETTINGS.faq }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqs = settings.items || [];

  return (
    <section className="py-24 sm:py-32">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Heading Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium text-gray-900 leading-tight">
            {settings.title}
          </h2>

          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
            {settings.subtitle}
          </p>

          <Link
            href={settings.ctaHref || "/contact"}
            className="inline-flex items-center justify-center mt-8 px-6 py-3 rounded-full border border-gray-900 text-sm font-medium text-gray-900 hover:bg-gray-900 hover:text-white transition-colors"
          >
            {settings.ctaLabel}
          </Link>
        </motion.div>

        {/* FAQ List */}
        <div className="max-w-4xl mx-auto">
          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="bg-[#f8f6f2] rounded-2xl px-6 py-5"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <span className="text-base font-medium text-gray-900 pr-4">
                      {faq.question}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex-shrink-0 text-xl text-gray-400"
                    >
                      +
                    </motion.span>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <p className="mt-4 text-gray-600 text-sm leading-relaxed">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}