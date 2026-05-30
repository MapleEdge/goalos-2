"use client";

import { useParams } from "next/navigation";
import { GoalDetail } from "@/components/goals/GoalDetail";

export default function GoalDetailPage() {
  const params = useParams<{ id: string }>();
  return <GoalDetail id={params.id} />;
}
