import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "@/components/dashboard/Sidebar";
import MobileNav from "@/components/dashboard/MobileNav";

function DashboardLayout() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 px-6 py-8 pb-24 md:px-10 md:py-10 lg:pb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});
