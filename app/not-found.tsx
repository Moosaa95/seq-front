'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, ArrowRight, Building2, Search, Phone } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const QUICK_LINKS = [
  { label: 'Browse Properties', href: '/properties', icon: Building2 },
  { label: 'Our Services', href: '/services', icon: Search },
  { label: 'Contact Us', href: '/contact', icon: Phone },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top accent bar */}
      <div className="h-1.5 bg-emerald-600 w-full" />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        {/* Decorative background number */}
        <div className="relative select-none">
          <span className="text-[160px] sm:text-[220px] font-black text-gray-100 leading-none tracking-tighter">
            404
          </span>
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="bg-emerald-600 rounded-2xl p-5 shadow-2xl shadow-emerald-200">
              <Building2 className="w-12 h-12 text-white" />
            </div>
          </motion.div>
        </div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6, ease }}
          className="text-center mt-4 max-w-md"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            Page not found
          </h1>
          <p className="text-gray-500 text-base leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved.
            Let&apos;s get you back on track.
          </p>
        </motion.div>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6, ease }}
          className="mt-8"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-emerald-100 transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </motion.div>

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6, ease }}
          className="mt-12 w-full max-w-md"
        >
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-4">
            Or explore
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between gap-2 bg-white border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:text-emerald-700 transition-all group"
              >
                <span className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-emerald-600" />
                  {label}
                </span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Brand footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-16 text-xs text-gray-400"
        >
          © {new Date().getFullYear()} Sequoia Projects Ltd · Abuja, Nigeria
        </motion.p>
      </div>
    </div>
  );
}
