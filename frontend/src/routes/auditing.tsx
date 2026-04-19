import { createFileRoute } from "@tanstack/react-router";
import Auditing from "@/components/pages/Auditing";

export const Route = createFileRoute("/auditing")({
  component: Auditing,
});
