import SignupBanner from '@/components/newsletter/SignupBanner';

export default function NewsletterPage() {
  return (
    <div className="pb-16">
      <section className="border-b border-border px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-display text-3xl tracking-wide text-navy uppercase sm:text-4xl">
            Newsletter
          </h1>
          <p className="mt-2 text-ink-light">
            Stay in the loop with the best LA County sporting events every week.
          </p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <SignupBanner />

          <div className="mt-12 space-y-6">
            <div className="rounded-lg border border-border bg-white p-6">
              <h3 className="font-semibold text-ink">What you&apos;ll get</h3>
              <ul className="mt-3 space-y-2 text-sm text-ink-light">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-live-green">&#10003;</span>
                  Weekly roundup of the best sporting events across LA County
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-live-green">&#10003;</span>
                  Hidden gems — JuCo rivalries, college matchups, and free events
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-live-green">&#10003;</span>
                  Featured games of the week with insider context
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-live-green">&#10003;</span>
                  Coverage from pro to prep — every level, every sport
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-white p-6">
              <h3 className="font-semibold text-ink">Our promise</h3>
              <p className="mt-2 text-sm text-ink-light">
                One email per week. No spam. Just sports. Unsubscribe anytime with one click.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
