import { fetchAPI } from '@/lib/api'
import type { Claim, ClaimOptions } from '@/lib/insuranceTypes'
import InsuranceClaimWorkspace from './InsuranceClaimWorkspace'

export default async function InsuranceClaimsPage() {
  const [claims, options] = await Promise.all([
    fetchAPI('/insurance/claims') as Promise<Claim[]>,
    fetchAPI('/insurance/claim-options') as Promise<ClaimOptions>,
  ])
  return <InsuranceClaimWorkspace claims={claims} options={options}/>
}
