import { useAppSelector } from "@/state/hooks";
import {
  getSummaryState,
  selectSessionById,
  selectSessionIds,
} from "@/state/sessions";
import { useInitializeCall, useIsCallLoaded } from "@/state/sync";
import { Loader, Pagination, Paper, Table, Text, Title } from "@mantine/core";
import Link from "next/link";
import { PropsWithChildren, useState } from "react";

export default function Home() {
  return (
    <div>
      <CallTable />
    </div>
  );
}

function CallTable() {
  const callIds = useAppSelector(selectSessionIds);
  const [activePage, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const chunks = chunk(callIds, pageSize);
  const visibleIds = chunks[activePage - 1] ?? [];

  return (
    <Paper className="paper">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Title order={3}>Calls</Title>
        <Pagination
          total={callIds.length / pageSize}
          value={activePage}
          onChange={setPage}
          size="sm"
        />
      </div>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Title</Table.Th>
            <Table.Th>CallSid</Table.Th>
            <Table.Th>Phones Last 4</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Created At</Table.Th>
            <Table.Th style={{ maxWidth: "100px" }}>Topics</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {visibleIds.map((callSid) => (
            <CallRow callSid={callSid} key={`${callSid}-92sj`} />
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}

function chunk<T>(array: T[], size: number): T[][] {
  if (!array.length) return [];

  const head = array.slice(0, size);
  const tail = array.slice(size);
  return [head, ...chunk(tail, size)];
}

function CallRow({ callSid }: { callSid: string }) {
  useInitializeCall(callSid);
  const session = useAppSelector((state) => selectSessionById(state, callSid));
  const [date, time] = new Date(session.dateCreated)
    .toLocaleString()
    .split(",");

  const from = session?.call?.from?.slice(-4) ?? "••••";
  const to = session?.call?.to?.slice(-4) ?? "••••";

  const direction = session?.call?.direction ?? "inbound";

  const summary = useAppSelector((state) => getSummaryState(state, callSid));

  const callStatus = session?.call?.status;

  return (
    <Table.Tr>
      <Table.Td>
        <CallLoader callSid={callSid}>
          <Link href={`/live/${callSid}`}>
            <Text size="sm">{summary?.title ?? `${direction} call`}</Text>
          </Link>
        </CallLoader>
      </Table.Td>
      <Table.Td>
        <Link href={`/live/${callSid}`}>
          <Text size="xs">{session.id}</Text>
        </Link>
      </Table.Td>
      <Table.Td>
        <CallLoader callSid={callSid}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex" }}>
              <Text size="sm" style={{ width: "64px" }}>
                {from}
              </Text>
              <Text size="sm">{to}</Text>
            </div>
          </div>
        </CallLoader>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{callStatus ?? "unknown"}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">
          {date}
          <br />
          {time}
        </Text>
      </Table.Td>
      <Table.Td style={{ overflow: "scroll" }}>
        <CallLoader callSid={callSid}>
          <Text size="sm" style={{ maxWidth: "125px", textWrap: "nowrap" }}>
            {summary?.topics.map((topic) => (
              <Text size="sm">{topic}</Text>
            ))}
          </Text>
        </CallLoader>
      </Table.Td>
    </Table.Tr>
  );
}

function CallLoader({
  callSid,
  children,
}: PropsWithChildren<{ callSid: string }>) {
  const isCallLoaded = useIsCallLoaded(callSid);

  return isCallLoaded ? children : <Loader size="sm" />;
}
