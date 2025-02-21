import { useAppSelector } from "@/state/hooks";
import { getGovernanceState } from "@/state/sessions";
import { Paper, Title, Text, useMantineTheme } from "@mantine/core";
import { Rating } from "@mantine/core";

type CallParams = { callSid: string };

export function GovernanceContainer({ callSid }: CallParams) {
  const governance = useAppSelector((state) =>
    getGovernanceState(state, callSid),
  );

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Title order={4}>Governance Bot</Title>
        <Rating value={governance.rating ?? 0} readOnly />
      </div>
      <GovernanceDetails callSid={callSid} />
    </>
  );
}

function GovernanceDetails({ callSid }: CallParams) {
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
