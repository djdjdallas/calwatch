import { getEntityOgData } from '@/lib/ogData'
import EntityPageClient from './EntityPageClient'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const data = await getEntityOgData(slug)

  if (!data) {
    return {
      title: 'Entity Not Found — CalWatch',
      description: 'California homelessness spending transparency tool.',
    }
  }

  const amount = '$' + Math.round(data.totalAmount).toLocaleString('en-US')
  const desc = data.isFlagged
    ? `${amount} in flagged homelessness contracts.${data.politicians.length > 0 ? ` Connected to ${data.politicians.join(', ')}.` : ''}`
    : `${amount} in tracked homelessness contracts.`

  return {
    title: `${data.name} — CalWatch`,
    description: desc,
    openGraph: {
      title: `${data.name} | CalWatch`,
      description: desc,
      images: [`/entity/${slug}/opengraph-image`],
    },
    twitter: {
      card: 'summary_large_image',
    },
  }
}

export default async function EntityPage({ params }) {
  const { slug } = await params
  const data = await getEntityOgData(slug)

  return <EntityPageClient data={data} slug={slug} />
}
