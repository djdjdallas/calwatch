import Link from 'next/link'

const DATA_SOURCES = [
  {
    name: 'Open FI$Cal',
    url: 'https://open.fiscal.ca.gov',
    description:
      "California's transparency portal for state financial data including contracts and expenditures.",
  },
  {
    name: 'HHAP Fiscal Dashboard',
    url: 'https://www.hcd.ca.gov',
    description:
      'Homeless Housing, Assistance, and Prevention program fiscal reporting from the Department of Housing and Community Development.',
  },
  {
    name: 'CA Secretary of State Business Filings',
    url: 'https://bizfileonline.sos.ca.gov',
    description:
      'Corporate registration records, officer filings, and business entity data for California organizations.',
  },
  {
    name: 'FPPC Campaign Finance Records',
    url: 'https://cal-access.sos.ca.gov',
    description:
      'Fair Political Practices Commission records of campaign contributions and political donations.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-2xl mx-auto px-6 py-20">
        {/* Header */}
        <Link
          href="/"
          className="text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          &larr; Back to graph
        </Link>

        <h1 className="text-3xl font-bold mt-6 mb-2">CalWatch</h1>
        <p className="text-sm text-white/40 mb-10">Follow the money</p>

        {/* What */}
        <section className="mb-12">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
            What is CalWatch?
          </h2>
          <p className="text-sm text-white/70 leading-relaxed">
            CalWatch is a transparency tool that cross-references public
            California government spending databases and visualizes the money
            connections between nonprofits, contractors, government agencies,
            and political figures involved in homelessness spending.
          </p>
          <p className="text-sm text-white/70 leading-relaxed mt-3">
            California&apos;s homelessness spending data is publicly available
            but scattered across multiple portals. CalWatch brings it together
            in a single visual interface so that journalists, researchers, and
            the public can follow the money and verify every connection.
          </p>
        </section>

        {/* Data Sources */}
        <section className="mb-12">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
            Data Sources
          </h2>
          <div className="space-y-4">
            {DATA_SOURCES.map((source) => (
              <div
                key={source.name}
                className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.06]"
              >
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1.5"
                >
                  {source.name}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path
                      d="M3.5 8.5l5-5M4.5 3.5h4v4"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
                <p className="text-xs text-white/40 mt-1.5">
                  {source.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Credibility */}
        <section className="mb-12 p-5 rounded-lg border border-white/10 bg-white/[0.02]">
          <p className="text-sm text-white/70 leading-relaxed">
            All data is sourced directly from public California government
            databases. Every connection shown in this tool is cited and
            verifiable. Each entity node links to the original government
            source so that any claim can be independently confirmed.
          </p>
        </section>

        {/* Contact */}
        <section className="mb-12">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
            Submit a Tip
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-3">
            If you&apos;re a journalist or researcher and have found connections
            that should be investigated, reach out:
          </p>
          <a
            href="mailto:tips@calwatch.org"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            tips@calwatch.org
          </a>
        </section>

        {/* Footer */}
        <div className="pt-8 border-t border-white/[0.06]">
          <p className="text-[10px] text-white/20 text-center">
            CalWatch is an open-source transparency project. Not affiliated
            with any government agency.
          </p>
        </div>
      </div>
    </div>
  )
}
