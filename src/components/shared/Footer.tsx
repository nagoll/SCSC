import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-navy text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <span className="font-display text-xl tracking-wide uppercase">
              SCSC
            </span>
            <p className="mt-2 text-sm text-white/60">
              Every sporting event in LA County. Pro to prep, all on one calendar.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80">
              Navigate
            </h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/" className="text-sm text-white/60 hover:text-white">
                  Calendar
                </Link>
              </li>
              <li>
                <Link href="/featured" className="text-sm text-white/60 hover:text-white">
                  Featured Games
                </Link>
              </li>
              <li>
                <Link href="/newsletter" className="text-sm text-white/60 hover:text-white">
                  Newsletter
                </Link>
              </li>
            </ul>
          </div>

          {/* Levels */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80">
              Browse by Level
            </h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/?level=pro" className="text-sm text-white/60 hover:text-white">
                  Professional
                </Link>
              </li>
              <li>
                <Link href="/?level=college" className="text-sm text-white/60 hover:text-white">
                  College
                </Link>
              </li>
              <li>
                <Link href="/?level=juco" className="text-sm text-white/60 hover:text-white">
                  Junior College
                </Link>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80">
              About
            </h3>
            <ul className="mt-3 space-y-2">
              <li>
                <span className="text-sm text-white/60">
                  Built for LA County sports fans
                </span>
              </li>
              <li>
                <a href="mailto:hello@scsc.com" className="text-sm text-white/60 hover:text-white">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/40">
          &copy; {new Date().getFullYear()} Southern California Sports Calendar. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
