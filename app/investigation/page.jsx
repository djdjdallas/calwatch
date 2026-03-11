import InvestigationClient from './InvestigationClient'

export const metadata = {
  title: 'The Investigation — CalWatch',
  description:
    '$7.1M in homelessness contracts. A convicted politician. CalWatch connected the dots.',
  openGraph: {
    title: 'The Investigation — CalWatch',
    description:
      '$7.1M in homelessness contracts. A convicted politician. CalWatch connected the dots.',
  },
  twitter: { card: 'summary_large_image' },
}

export default function InvestigationPage() {
  return <InvestigationClient />
}
