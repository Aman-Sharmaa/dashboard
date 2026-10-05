"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  category: string;
  categorySlug: string;
  href: string;
  readTime: string;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

interface BlogsPageClientProps {
  initialPosts: BlogPost[];
  categories: Category[];
  initialCategory?: string;
  categoryTitle?: string;
}

export function BlogsPageClient({
  initialPosts,
  categories,
  initialCategory,
  categoryTitle,
}: BlogsPageClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || "all");

  useEffect(() => {
    setSelectedCategory(initialCategory || "all");
  }, [initialCategory]);

  const filteredPosts = useMemo(() => {
    if (selectedCategory === "all") return initialPosts;
    return initialPosts.filter((p) => p.categorySlug === selectedCategory);
  }, [initialPosts, selectedCategory]);

  const featuredPost = useMemo(() => {
    return filteredPosts[0] || null;
  }, [filteredPosts]);

  const remainingPosts = useMemo(() => {
    return filteredPosts.slice(1);
  }, [filteredPosts]);

  // Group posts by category for organized section display matching AppLovin mockup
  const groupedSections = useMemo(() => {
    if (selectedCategory !== "all") {
      return [
        {
          title: categoryTitle || "Articles",
          posts: filteredPosts,
        },
      ];
    }

    const groups: { [key: string]: { title: string; posts: BlogPost[] } } = {};
    
    // Initialize groups in category sorting order
    categories.forEach((cat) => {
      groups[cat.slug] = { title: cat.name, posts: [] };
    });

    remainingPosts.forEach((post) => {
      if (groups[post.categorySlug]) {
        groups[post.categorySlug].posts.push(post);
      } else {
        groups[post.categorySlug] = { title: post.category, posts: [post] };
      }
    });

    return Object.values(groups).filter((g) => g.posts.length > 0);
  }, [filteredPosts, remainingPosts, selectedCategory, categories, categoryTitle]);

  return (
    <main className="min-h-screen bg-zinc-50/50 dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      <Header />

      <div className="max-w-[1100px] mx-auto px-6 sm:px-8 lg:px-12 pt-32 sm:pt-40 pb-24">
        {/* Header Title */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-none">
            Blog
          </h1>
        </div>

        {/* Featured Post (AppLovin Style) */}
        {featuredPost && (
          <div className="mb-16">
            <Link href={featuredPost.href} className="group block">
              <div className="grid grid-cols-1 md:grid-cols-12 rounded-3xl overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:shadow-2xl transition-all duration-500">
                {/* Left Column: Image Area */}
                <div className="relative md:col-span-7 aspect-[16/10] md:aspect-auto min-h-[300px] sm:min-h-[400px] bg-gradient-to-tr from-blue-500/20 via-red-500/20 to-orange-500/10">
                  {featuredPost.image ? (
                    <Image
                      src={
                        featuredPost.image.startsWith("http") || featuredPost.image.startsWith("/")
                          ? featuredPost.image
                          : `/${featuredPost.image}`
                      }
                      alt={featuredPost.title}
                      fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-102"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                      No Image
                    </div>
                  )}
                  {/* Category Label */}
                  {featuredPost.category && (
                    <div className="absolute top-6 left-6">
                      <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-white text-zinc-900 shadow-md uppercase tracking-wider">
                        {featuredPost.category}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Column: Text Details */}
                <div className="md:col-span-5 p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    Featured
                  </span>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-zinc-900 dark:text-white mt-3 mb-4 leading-tight group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors duration-200">
                    {featuredPost.title}
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 font-normal leading-relaxed line-clamp-3 mb-6">
                    {featuredPost.excerpt}
                  </p>
                  <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 mt-auto">
                    {featuredPost.date}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Dynamic Category Sections */}
        {groupedSections.length === 0 ? (
          <div className="text-center py-20 text-zinc-400 dark:text-zinc-500">
            No posts found. Please check back later.
          </div>
        ) : (
          <div className="space-y-16">
            {groupedSections.map((section, secIdx) => (
              <div key={secIdx} className="space-y-8">
                {/* Section Title */}
                <div className="border-b border-zinc-150 dark:border-zinc-850 pb-4 flex items-center justify-between">
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-none">
                    {section.title}
                  </h2>
                </div>

                {/* Post Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
                  {section.posts.map((post) => (
                    <Link key={post.id} href={post.href} className="group block">
                      <div className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 h-full flex flex-col hover:shadow-xl transition-all duration-300">
                        {/* Card Image */}
                        <div className="relative aspect-[16/10] bg-zinc-100 dark:bg-zinc-900">
                          {post.image ? (
                            <Image
                              src={
                                post.image.startsWith("http") || post.image.startsWith("/")
                                  ? post.image
                                  : `/${post.image}`
                              }
                              alt={post.title}
                              fill
                              className="object-cover group-hover:scale-102 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-400">
                              No Image
                            </div>
                          )}
                          {/* Category Badge */}
                          {post.category && (
                            <div className="absolute top-4 left-4">
                              <span className="inline-flex items-center px-3.5 py-1 rounded-full text-[10px] font-bold bg-white text-zinc-900 shadow uppercase tracking-wider">
                                {post.category}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Description */}
                        <div className="p-6 flex-1 flex flex-col">
                          <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors duration-250 leading-snug line-clamp-2">
                            {post.title}
                          </h3>
                          <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mt-4 block">
                            {post.date}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
