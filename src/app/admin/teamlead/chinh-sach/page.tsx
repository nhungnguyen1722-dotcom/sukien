import AllocationPolicyManager from '@/components/admin/AllocationPolicyManager';
import FundManagementTabs from '@/components/admin/FundManagementTabs';

export default function AllocationPolicyPage() {
  return (
    <>
      <FundManagementTabs activeTab="teamlead" />
      <AllocationPolicyManager />
    </>
  );
}
