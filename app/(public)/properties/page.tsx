'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Calendar, CheckCircle2, Home, Building2, ExternalLink, Loader2 } from 'lucide-react';
import PropertyBuildingCard from '@/components/PropertyBuildingCard';
import ImageWithLoader from '@/components/ImageWithLoader';
import { useGetPropertiesQuery } from '@/lib/store/api/propertyApi';

const SHORTLET_URL = process.env.NEXT_PUBLIC_SHORTLET_URL || 'http://localhost:3001';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.65, delay: i * 0.1, ease },
  }),
};

export default function PropertiesPage() {
  const { data: propertiesData, isLoading: loading } = useGetPropertiesQuery({ page_size: 3, ordering: '-created_at' });
  const properties = propertiesData?.results || [];

  return (
    <div className="pt-20 min-h-screen bg-gray-50">

      {/* ── Hero ── */}
      <section className="relative min-h-[40vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <ImageWithLoader
            src="/arusha-101/front-1.jpg"
            alt="Properties"
            fill
            className="object-cover brightness-50"
            priority
          />
        </div>
        <div className="relative z-10 text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/80 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5"
          >
            <Building2 className="w-3.5 h-3.5" />
            Our Portfolio
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight"
          >
            Featured Properties
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base sm:text-lg text-gray-200 max-w-xl mx-auto"
          >
            A curated selection of our premium property developments across Abuja.
          </motion.p>
        </div>
      </section>

      {/* ── Sequoia Stays Banner ── */}
      <section className="bg-gray-900 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Looking for a short-term stay?</p>
                <p className="text-white/50 text-xs">Browse bookable apartments on our dedicated platform</p>
              </div>
            </div>
            <a
              href={SHORTLET_URL}
              target="_blank" rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex-shrink-0"
            >
              Visit Sequoia Stays
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Properties Grid ── */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="mb-10">
            <p className="text-sm text-emerald-600 font-semibold uppercase tracking-widest mb-1">Featured Developments</p>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Handpicked properties across Abuja</h2>
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <Home className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">New properties coming soon</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {properties.map((property, index) => (
                <motion.div key={property.id} custom={index} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                  <PropertyBuildingCard property={property} index={index} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Sequoia Stays Full Promo ── */}
      <section className="relative bg-gray-950 py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)', backgroundSize: '48px 48px' }}
        />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/8 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/25 text-emerald-400 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Online Booking Available
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Want to book a short stay?
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mt-1">
                Visit Sequoia Stays
              </span>
            </h2>

            <p className="text-white/55 text-lg max-w-xl mx-auto leading-relaxed">
              Our dedicated booking platform lets you browse available apartments, check real-time prices, and reserve instantly — no phone calls needed.
            </p>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-white/60 py-2">
              {['Real-Time Availability', 'Instant Confirmation', 'Secure Payments', 'No Hidden Fees'].map(f => (
                <div key={f} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <a
                href={SHORTLET_URL}
                target="_blank" rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white px-9 py-4 rounded-2xl font-bold text-base shadow-xl shadow-emerald-500/20 transition-all duration-300"
              >
                <Calendar className="w-5 h-5" />
                Browse Available Apartments
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href={`${SHORTLET_URL}/booking`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-white/8 hover:bg-white/14 border border-white/15 text-white/80 px-7 py-4 rounded-2xl font-semibold text-base transition-all duration-300"
              >
                Check Availability
              </a>
            </div>

            <p className="text-white/25 text-xs pt-2">
              Powered by Sequoia Projects · Abuja, Nigeria
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
