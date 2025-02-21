import { GovernanceContainer } from "@/components/GovernanceContainer";
import { useAppSelector } from "@/state/hooks";
import { getSummaryState } from "@/state/sessions";
import { selectCallTurns, selectTurnById } from "@/state/turns";
import { Badge, Paper, Table, Title, useMantineTheme } from "@mantine/core";
import { useRouter } from "next/router";

export default function LiveCallPage() {
  const theme = useMantineTheme();

  return (
    <div style={{ display: "flex", gap: theme.spacing.sm }}>
      <div style={{ flex: 2 }}>
        <Conscious />
      </div>

      <div style={{ flex: 1 }}>
        <Subconscious />
      </div>
    </div>
  );
}

function Conscious() {
  const router = useRouter();
  const callSid = router.query.callSid as string;

  const theme = useMantineTheme();

  const summaryState = useAppSelector((state) =>
    getSummaryState(state, callSid),
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <Paper
        className="paper"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Title order={3}>Conscious Bot</Title>
        <Title order={6}>{summaryState?.title}</Title>
      </Paper>

      <Paper
        className="paper"
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div>
          <Title order={4}>Turns</Title>
        </div>
        <div
          style={{ minHeight: "200px", maxHeight: "400px", overflow: "scroll" }}
        >
          <TurnsTable callSid={callSid} />
        </div>
      </Paper>
    </div>
  );
}

function TurnsTable({ callSid }: { callSid: string }) {
  const turns = useAppSelector((state) => selectCallTurns(state, callSid));

  return (
    <Table stickyHeader>
      <Table.Thead>
        <Table.Tr>
          <Table.Th style={{ width: "60px" }}>Role</Table.Th>
          <Table.Th style={{ width: "60px" }}>Origin</Table.Th>
          <Table.Th style={{ width: "100%" }}>Content</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {turns.map((turn) => (
          <Table.Tr key={`me7-${turn.id}`}>
            {turn.role === "bot" && <BotRow turnId={turn.id} />}
            {turn.role === "human" && <HumanRow turnId={turn.id} />}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

interface TurnRow {
  turnId: string;
}

function BotRow({ turnId }: TurnRow) {
  const turn = useAppSelector((state) => selectTurnById(state, turnId));
  if (turn.role !== "bot")
    throw Error(`Expected bot turn ${JSON.stringify(turn)}`); // typeguard

  let content: string[] = [];
  if (turn.type === "tool") {
    for (const tool of turn.tool_calls) {
      const fn = tool.function.name;
      const args = JSON.stringify(tool.function.arguments);
      content.push(`${fn}(${args})`.replaceAll("\\", ""));
    }
  } else content = [turn.content];

  const theme = useMantineTheme();

  return (
    <>
      <Table.Td>{turn.role}</Table.Td>
      <Table.Td>{turn.origin}</Table.Td>
      <Table.Td style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: theme.spacing.xs,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}> {content}</div>
          <span>
            {turn.status === "interrupted" && (
              <Badge color="yellow">Interrupted</Badge>
            )}
          </span>
        </div>
      </Table.Td>
    </>
  );
}

function HumanRow({ turnId }: TurnRow) {
  const turn = useAppSelector((state) => selectTurnById(state, turnId));
  if (turn.role !== "human")
    throw Error(`Expected human turn ${JSON.stringify(turn)}`); // typeguard

  return (
    <>
      <Table.Td> {turn.role}</Table.Td>
      <Table.Td> {turn.type}</Table.Td>
      <Table.Td> {turn.content}</Table.Td>
    </>
  );
}

/****************************************************
 Subconscious
****************************************************/

function Subconscious() {
  const router = useRouter();
  const callSid = router.query.callSid as string;

  const theme = useMantineTheme();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <Paper className="paper">
        <Title order={3}>Controls</Title>
      </Paper>

      <Paper className="paper">
        <GovernanceContainer callSid={callSid} />
      </Paper>
    </div>
  );
}
