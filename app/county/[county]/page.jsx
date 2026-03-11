import { getCountyOgData } from '@/lib/ogData'
import CountyPageClient from './CountyPageClient'

export async function generateMetadata({ params }) {
  const { county } = await params
  const data = await getCountyOgData(county)

  if (!data) {
    return {
      title: 'County Not Found — CalWatch',
      description: 'California homelessness spending transparency tool.',
    }
  }

  const amount = '$' + Math.round(data.totalAmount).toLocaleString('en-US')
  const desc = `${amount} in flagged homelessness contracts across ${data.orgCount} organizations in ${data.county} County.`

  return {
    title: `${data.county} County — CalWatch`,
    description: desc,
    openGraph: {
      title: `${data.county} County | CalWatch`,
      description: desc,
      images: [`/county/${county}/opengraph-image`],
    },
    twitter: {
      card: 'summary_large_image',
    },
  }
}

export default async function CountyPage({ params }) {
  const { county } = await params
  const data = await getCountyOgData(county)

  return <CountyPageClient data={data} slug={county} />
}
