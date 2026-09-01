import { fetchAPI } from '@/lib/api'
import type { ClaimDetail } from '@/lib/insuranceTypes'
import InsuranceClaimDetail from './InsuranceClaimDetail'

export default async function InsuranceClaimDetailPage({ params }: { params: { id: string } }) {
  const claim = await fetchAPI(`/insurance/claims/${params.id}`) as ClaimDetail
  return <InsuranceClaimDetail claim={claim}/>
}
