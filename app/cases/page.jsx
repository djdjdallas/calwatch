import { getCases } from '@/lib/getCases'
import CasesClient from './CasesClient'

export const metadata = {
  title: 'Case Files — CalWatch',
  description: '18 confirmed conflicts of interest in California homelessness contracts.',
}

export default async function CasesPage() {
  const cases = await getCases()
  return <CasesClient cases={cases} />
}
