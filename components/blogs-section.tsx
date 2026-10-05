"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  image?: string;
  date: string;
  category?: string;
  href: string;
}

interface BlogsSectionProps {
  title?: string;
  subtitle?: string;
  showViewAll?: boolean;
  limit?: number;
}

const blogPosts: BlogPost[] = [
  {
    id: "1",
    title: "Building Scalable SaaS Products",
    excerpt:
      "Lessons from launching and scaling 20+ real-world B2B SaaS products.",
    image: "", // ❌ no image
    date: "2025",
    category: "Product",
    href: "/blogs/building-scalable-saas-products",
  },
  {
    id: "2",
    title: "AI Integration Best Practices",
    excerpt:
      "Architecture patterns and deployment strategies that actually work.",
    image: "",
    date: "2024",
    category: "AI",
    href: "/blogs/ai-integration-best-practices",
  },
  {
    id: "3",
    title: "The 45-Day Launch Framework",
    excerpt:
      "From idea to production using Rapydlaunch’s proven system.",
    image: "",
    date: "2024",
    category: "Strategy",
    href: "/blogs/rapydlaunch-framework",
  },
  {
    id: "4",
    title: "Designing UX That Converts",
    excerpt:
      "How thoughtful design improves engagement and conversion.",
    image: "",
    date: "2024",
    category: "Design",
    href: "/blogs/designing-converting-ux",
  },
];

export function BlogsSection({
  title = "Blogs",
  subtitle = "Real stories from building, scaling, and launching products.",
  showViewAll = true,
  limit,
}: BlogsSectionProps) {
  const postsToShow = limit ? blogPosts.slice(0, limit) : blogPosts;

  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-3">
            {title}
          </h2>
          <p className="text-base text-gray-600 max-w-xl mx-auto">
            {subtitle}
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {postsToShow.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <Link href={post.href} className="group block h-full">
                <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col">

                  {/* IMAGE / PLACEHOLDER */}
                  {post.image && (
                    <div className="relative aspect-[4/3] bg-neutral-100 flex items-center justify-center">
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

                      {/* Category */}
                      {post.category && (
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 text-[11px] font-medium text-gray-900">
                          {post.category}
                        </span>
                      )}

                      {/* Date */}
                      <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-white/90">
                        <Calendar className="w-3 h-3 text-gray-600" />
                        <span className="text-[11px] text-gray-700">
                          {post.date}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* CONTENT */}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-2 leading-snug group-hover:text-gray-700 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3 flex-1">
                      {post.excerpt}
                    </p>
                    <div className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 group-hover:gap-2 transition-all">
                      Read
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>

                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* View All */}
        {showViewAll && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-center mt-10"
          >
            <Link
              href="/blogs"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-gray-700"
            >
              View all blogs
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
