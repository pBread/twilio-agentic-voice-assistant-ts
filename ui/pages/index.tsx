import { selectCallById, selectCallIds } from "@/state/calls";
import { useAppSelector } from "@/state/hooks";
import {
  CopyButton,
  HoverCard,
  Paper,
  Table,
  Text,
  Title,
  Pagination,
} from "@mantine/core";
import Link from "next/link";
import { useState } from "react";

export default function Home() {
  return (
    <div>
      <CallTable />
    </div>
  );
}

function CallTable() {
  const callIds = useAppSelector(selectCallIds);
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
            <Table.Th>Phones</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Created At</Table.Th>
            <Table.Th>Feedback</Table.Th>
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
  const call = useAppSelector((state) => selectCallById(state, callSid));
  const [date, time] = new Date(call.dateCreated).toLocaleString().split(",");

  return (
    <Table.Tr>
      <Table.Td>
        <Link href={`/live/${callSid}`}>
          <Text size="sm">Some Call </Text>
        </Link>
      </Table.Td>
      <Table.Td>
        <Text size="xs">{call.id}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">
          +12223330001
          <br />
          +12223330002
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">N/A</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">
          {date}
          <br />
          {time}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">Some Call</Text>
      </Table.Td>
    </Table.Tr>
  );
}
