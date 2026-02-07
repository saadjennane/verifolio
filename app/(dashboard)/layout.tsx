import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DashboardLayoutClient />
      {/* children kept for URL fallback routing */}
      <div className="hidden">{children}</div>
    </>
  );
}
