import { createFileRoute } from "@tanstack/react-router";
import Splash from "@/components/pages/Splash";

export const Route = createFileRoute("/")({
  component: Splash,
});
