import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/30 to-gray-950 pointer-events-none" />
        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-1.5 text-sm text-red-400 mb-8">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            Live monitoring active
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Stay ahead of{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              every hazard
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Real-time weather forecasting and multi-disaster monitoring for earthquakes, cyclones,
            wildfires, floods, and more — powered by AI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold text-lg transition-colors">
              Open Dashboard
            </Link>
            <Link href="/sign-up"
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold text-lg transition-colors">
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-16">Monitor everything, everywhere</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { emoji: '⚡', label: 'Earthquakes', desc: 'USGS real-time feed' },
            { emoji: '🌀', label: 'Cyclones',    desc: 'NOAA track & forecast' },
            { emoji: '🔥', label: 'Wildfires',   desc: 'NASA FIRMS hotspots' },
            { emoji: '🌊', label: 'Floods',      desc: 'GDACS + NASA data' },
            { emoji: '🌋', label: 'Volcanoes',   desc: 'Smithsonian GVP' },
            { emoji: '🏝️', label: 'Tsunamis',   desc: 'NOAA TWC warnings' },
            { emoji: '💨', label: 'Air Quality', desc: 'OpenAQ global' },
            { emoji: '⛰️', label: 'Landslides', desc: 'Terrain risk index' },
            { emoji: '🌤️', label: 'Weather',    desc: '7-day forecast' },
            { emoji: '🤖', label: 'AI Assistant',desc: 'Ask about any hazard' },
          ].map((f) => (
            <div key={f.label}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-600 transition-colors">
              <div className="text-3xl mb-3">{f.emoji}</div>
              <div className="font-semibold mb-1">{f.label}</div>
              <div className="text-sm text-gray-500">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
