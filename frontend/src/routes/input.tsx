import { createFileRoute } from "@tanstack/react-router";
import Input from "@/components/pages/Input";

export const Route = createFileRoute("/input")({
  component: Input,
});
