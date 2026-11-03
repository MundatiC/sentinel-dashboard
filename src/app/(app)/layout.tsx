import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

// The signed-in shell (sidebar + top bar). Authentication is added in the next step.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary-container focus:px-3 focus:py-2 focus:text-on-primary-container"
      >
        Skip to content
      </a>
      <Sidebar role="ADMIN" />
      <div className="pl-64">
        <Topbar />
        <main id="main" className="px-space-xl pb-space-xl pt-space-md">
          {children}
        </main>
      </div>
    </>
  );
}
