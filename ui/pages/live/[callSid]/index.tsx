import { GovernanceContainer } from "@/components/GovernanceContainer";
import { useAppSelector } from "@/state/hooks";
import {
  getAuxMessageState,
  getQuestionState,
  getSummaryState,
} from "@/state/sessions";
import { selectCallTurns, selectTurnById } from "@/state/turns";
import {
  Badge,
  Paper,
  Table,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
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

      <Paper className="paper">
        <Title order={4}>Human Consultation</Title>
        <HumanConsultation />
      </Paper>

      <Paper className="paper">
        <Title order={4}>Auxiliary Messages</Title>

        <AuxiliaryMessageTable />
      </Paper>
    </div>
  );
}

/****************************************************
 Turns Table
****************************************************/

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
          <div style={{ flex: 1, minWidth: 0 }}>
            {content.map((item) => (
              <div key={`d93-${item}`}> {item} </div>
            ))}
          </div>
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
  if (turn.origin === "hack") return;

  return (
    <>
      <Table.Td> {turn.role}</Table.Td>
      <Table.Td> {turn.type}</Table.Td>
      <Table.Td> {turn.content}</Table.Td>
    </>
  );
}

/****************************************************
 Human Consultation
****************************************************/

function HumanConsultation() {
  const router = useRouter();
  const callSid = router.query.callSid as string;

  const questionState = useAppSelector((state) =>
    getQuestionState(state, callSid),
  );

  const questions = questionState ? Object.values(questionState) : [];

  return (
    <Table stickyHeader>
      <Table.Thead>
        <Table.Tr>
          <Table.Th style={{ width: "22%" }}>Question</Table.Th>
          <Table.Th style={{ width: "22%" }}>Explanation</Table.Th>
          <Table.Th style={{ width: "22%" }}>Recommendation</Table.Th>
          <Table.Th style={{ width: "22%" }}>Answer</Table.Th>
          <Table.Th style={{ width: "40px" }}>Status</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {questions.map((question) => (
          <QuestionRow
            key={`k3c-${question.id}`}
            callSid={callSid}
            questionId={question.id}
          />
        ))}
      </Table.Tbody>
    </Table>
  );
}

function QuestionRow({
  callSid,
  questionId,
}: {
  callSid: string;
  questionId: string;
}) {
  const questionState = useAppSelector((state) =>
    getQuestionState(state, callSid),
  );
  if (!questionState) return;

  const question = questionState[questionId];
  if (!question) return;

  return (
    <Table.Tr>
      <Table.Td style={{ width: "22%" }}> {question.question}</Table.Td>
      <Table.Td style={{ width: "22%" }}>{question.explanation}</Table.Td>
      <Table.Td style={{ width: "22%" }}>{question.recommendation}</Table.Td>
      <Table.Td style={{ width: "22%" }}> {question.answer}</Table.Td>
      <Table.Td style={{ width: "40px" }}> {question.status}</Table.Td>
    </Table.Tr>
  );
}

/****************************************************
 Auxiliary Messages
****************************************************/
function AuxiliaryMessageTable() {
  const router = useRouter();
  const callSid = router.query.callSid as string;

  const auxMessageState = useAppSelector((state) =>
    getAuxMessageState(state, callSid),
  );

  const messages = auxMessageState ? Object.values(auxMessageState) : [];

  return (
    <Table stickyHeader>
      <Table.Thead>
        <Table.Tr>
          <Table.Th style={{}}>Channel</Table.Th>
          <Table.Th style={{}}>From</Table.Th>
          <Table.Th style={{}}>To</Table.Th>
          <Table.Th style={{}}>Body</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {messages.map((msg) => (
          <AuxMessageRow
            key={`id3-${msg.id}`}
            callSid={callSid}
            msgId={msg.id}
          />
        ))}
      </Table.Tbody>
    </Table>
  );
}

function AuxMessageRow({ callSid, msgId }: { callSid: string; msgId: string }) {
  const auxMessageState = useAppSelector((state) =>
    getAuxMessageState(state, callSid),
  );
  if (!auxMessageState) return;

  const msg = auxMessageState[msgId];
  if (!msg) return;

  return (
    <Table.Tr>
      <Table.Td style={{}}> {msg.channel}</Table.Td>
      <Table.Td style={{}}> {msg.from}</Table.Td>
      <Table.Td style={{}}> {msg.to}</Table.Td>
      <Table.Td style={{}}> {msg.body}</Table.Td>
    </Table.Tr>
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
        <Title order={3}>Subconscious</Title>
      </Paper>

      <SummarySection />

      <Paper className="paper">
        <GovernanceContainer callSid={callSid} />
      </Paper>
    </div>
  );
}

function SummarySection() {
  const router = useRouter();
  const callSid = router.query.callSid as string;

  const summaryState = useAppSelector((state) =>
    getSummaryState(state, callSid),
  );

  return (
    <Paper
      className="paper"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2px",
      }}
    >
      <Title order={4}>Voice Operators</Title>
      <Text size="sm">
        <b>Call Summary: </b>
        {summaryState?.description}
      </Text>

      <Text size="sm">
        <b>Topics: </b>
        {summaryState?.topics.join(", ")}
      </Text>
    </Paper>
  );
}
