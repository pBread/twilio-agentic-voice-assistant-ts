import { useAppSelector } from "@/state/hooks";
import { getGovernanceState } from "@/state/sessions";
import { Rating, Text, Title } from "@mantine/core";

export function GovernanceContainer({ callSid }: { callSid: string }) {
  const governance = useAppSelector((state) =>
    getGovernanceState(state, callSid),
  );

  let color = "";
  if (governance?.rating > 4) color = "green";
  else if (governance?.rating > 3) color = "green";
  else if (governance?.rating > 2) color = "yellow";
  else if (governance?.rating > 1) color = "orange";
  else if (governance?.rating > 0) color = "red";

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Title order={4}>Governance Bot</Title>
        <Rating value={governance?.rating ?? 0} readOnly color={color} />
      </div>
      <GovernanceDetails callSid={callSid} />
    </>
  );
}

function GovernanceDetails({ callSid }: { callSid: string }) {
  const governance = useAppSelector((state) =>
    getGovernanceState(state, callSid),
  );

  return (
    <div>
      <Text size="sm">
        <b>Summary: </b> {governance?.summary}
      </Text>
      <Text size="sm">
        <b>Guidance: </b> {governance?.guidance}
      </Text>
    </div>
  );
}

function GovernanceProcedures({ callSid }: { callSid: string }) {
  const governance = useAppSelector((state) =>
    getGovernanceState(state, callSid),
  );
}
