import { fetchAPI } from '@/lib/api'
import type { Claim } from '@/lib/insuranceTypes'
import InsuranceApprovalWorkspace from './InsuranceApprovalWorkspace'

export default async function InsuranceApprovalsPage() {
  const claims = await fetchAPI('/insurance/approvals') as Claim[]
  return <InsuranceApprovalWorkspace claims={claims}/>
}
