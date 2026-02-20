'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-cream/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-2xl tracking-wide text-navy uppercase">
            SCSC
          </span>
          <span className="hidden text-xs text-ink-muted sm:block">
            Southern California<br />Sports Calendar
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/"
            className="text-sm font-medium text-ink-light transition-colors hover:text-burnt-orange"
          >
            Calendar
          </Link>
          <Link
            href="/featured"
            className="text-sm font-medium text-ink-light transition-colors hover:text-burnt-orange"
          >
            Featured
          </Link>
          <Link
            href="/newsletter"
            className="text-sm font-medium text-ink-light transition-colors hover:text-burnt-orange"
          >
            Newsletter
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="inline-flex items-center justify-center rounded-md p-2 text-ink-light hover:text-ink md:hidden"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-3">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-ink-light hover:bg-cream-dark"
            >
              Calendar
            </Link>
            <Link
              href="/featured"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-ink-light hover:bg-cream-dark"
            >
              Featured
            </Link>
            <Link
              href="/newsletter"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-ink-light hover:bg-cream-dark"
            >
              Newsletter
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
