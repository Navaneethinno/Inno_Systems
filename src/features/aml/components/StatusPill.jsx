import { TonePill } from "../../../components/ui/StatusBadge";

const TONES = {
  ACTIVE: "active",
  OK: "active",
  DONE: "active",
  LOADING: "pending",
  RUNNING: "pending",
  RETIRED: "inactive",
  FAILED: "rejected",
};

// Reuses the shared status pill so AML states look like every other
// status in the Console.
export function StatusPill({ status, label }) {
  return <TonePill tone={TONES[status] ?? "inactive"}>{label ?? (status || "Never run")}</TonePill>;
}
