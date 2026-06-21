'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { clsx } from 'clsx';
import { Home, Map, Bell, Zap, Tornado, Flame, Cloud, User, MoreHorizontal, X } from 'lucide-react';
const NAV_ITEMS = [
  { href: '/dashboard',            label: 'Overview',    icon: Home },
  { href: '/dashboard/map',        label: 'Live Map',    icon: Map },
  { href: '/dashboard/alerts',     label: 'Alerts',      icon: Bell },
  { href: '/dashboard/earthquakes',label: 'Earthquakes', icon: Zap },
  { href: '/dashboard/cyclones',   label: 'Cyclones',    icon: Tornado },
  { href: '/dashboard/wildfires',  label: 'Wildfires',   icon: Flame },
  { href: '/dashboard/weather',    label: 'Weather',     icon: Cloud },
  { href: '/dashboard/profile',    label: 'Profile',     icon: User },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar — desktop */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={clsx(
          'hidden md:flex flex-col border-r border-gray-800 p-4 shrink-0 overflow-hidden',
          'transition-all duration-300 ease-in-out',
          expanded ? 'w-64' : 'w-20'
        )}
      >
        <div className="flex items-center gap-2 mb-8 px-2">
          <img src="/images/logo.png" alt="HazardWatch" className="w-7 h-7 object-contain shrink-0" />
          <span className={clsx(
            'font-bold text-lg whitespace-nowrap transition-opacity duration-300',
            expanded ? 'opacity-100' : 'opacity-0'
          )}>
            HazardWatch
          </span>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                pathname === item.href
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}>
              <item.icon className="w-5 h-5 shrink-0" />
              <span className={clsx(
                'whitespace-nowrap transition-opacity duration-300',
                expanded ? 'opacity-100' : 'opacity-0'
              )}>
                {item.label}
              </span>
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 px-3 py-2 border-t border-gray-800 mt-4 pt-4">
        {session?.user?.image && !imgError ? (
            <img
              src={session.user.image}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-8 h-8 rounded-full shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium shrink-0">
              {session?.user?.name?.[0] ?? '?'}
            </div>
          )}
          <span className={clsx(
            'text-sm text-gray-400 truncate flex-1 whitespace-nowrap transition-opacity duration-300',
            expanded ? 'opacity-100' : 'opacity-0'
          )}>
            {session?.user?.name ?? 'Account'}
          </span>
          {expanded && (
            <button onClick={() => signOut({ callbackUrl: '/sign-in' })}
              className="text-xs text-gray-500 hover:text-gray-300 shrink-0">
              Sign out
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* More menu sheet — mobile */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full bg-gray-900 border-t border-gray-800 rounded-t-2xl p-4"
            style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-400">More</span>
              <button onClick={() => setMoreOpen(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {NAV_ITEMS.slice(4).map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)}
                className={clsx('flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs text-center',
                  pathname === item.href ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800')}>
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="leading-tight">{item.label}</span>
              </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav — mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-gray-900 border-t border-gray-800 flex justify-around py-2 z-50">
        {NAV_ITEMS.slice(0, 4).map((item) => (
          <Link key={item.href} href={item.href}
            className={clsx('flex flex-col items-center gap-1 px-3 py-1 text-xs',
              pathname === item.href ? 'text-blue-400' : 'text-gray-500')}>
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        ))}
        <button onClick={() => setMoreOpen(true)}
          className={clsx('flex flex-col items-center gap-1 px-3 py-1 text-xs',
            moreOpen ? 'text-blue-400' : 'text-gray-500')}>
          <MoreHorizontal className="w-5 h-5" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
