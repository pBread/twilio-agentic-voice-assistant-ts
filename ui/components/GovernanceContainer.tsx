import { useAppSelector } from "@/state/hooks";
import { getGovernanceState, getProcedures } from "@/state/sessions";
import { Rating, Text, Title, useMantineTheme } from "@mantine/core";
import startCase from "lodash.startcase";
import { useRef, useState } from "react";
import { TruncatedText } from "./TruncateText";

export function GovernanceContainer({ callSid }: { callSid: string }) {
  const governance = useAppSelector((state) =>
    getGovernanceState(state, callSid),
  );

  const theme = useMantineTheme();

  let color = "";
  // Default color when no rating exists
  if (!governance || governance.rating === undefined) color = "gray";
  else if (governance.rating > 3.5) color = "green";
  else if (governance.rating > 2.5) color = "yellow";
  else if (governance.rating > 1.5) color = "orange";
  else if (governance.rating > 0) color = "red";
  // For rating = 0
  else color = "red";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Title order={4}>Governance Bot</Title>
        <Rating
          value={governance?.rating ?? 0}
          readOnly
          color={color}
          fractions={10}
        />
      </div>
      <GovernanceDetails callSid={callSid} />

      <GovernanceProcedures callSid={callSid} />
    </div>
  );
}

function GovernanceDetails({ callSid }: { callSid: string }) {
  const governance = useAppSelector((state) =>
    getGovernanceState(state, callSid),
  );

  return (
    <div>
      <Text size="sm">
        <b>Summary: </b>
        <TruncatedText text={governance?.summary} maxLength={250} />
      </Text>
      <Text size="sm">
        <b>Guidance: </b>

        <TruncatedText text={governance?.guidance} maxLength={250} />
      </Text>
    </div>
  );
}

function GovernanceProcedures({ callSid }: { callSid: string }) {
  const procedures = useAppSelector((state) => getProcedures(state, callSid));

  const governance = useAppSelector((state) =>
    getGovernanceState(state, callSid),
  );

  const [closed, setClosed] = useState({});
  const previousStepsRef = useRef({});

  const toggle = (key: string) => {
    setClosed((state) => ({ ...state, [key]: false }));
  };

  const data = !governance
    ? []
    : Object.entries(governance.procedures)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([procedureId, stepStatuses]) => {
          const procedure = procedures[procedureId];
          const allSteps = procedure?.steps ?? stepStatuses;

          return {
            value: procedureId,
            label: startCase(procedureId),
            children: allSteps.map((step) => {
              return {
                value: step.id,
                label: startCase(step.id),
                status:
                  stepStatuses.find((stepStatus) => stepStatus.id === step.id)
                    ?.status ?? "not-started",
              };
            }),
          };
        });

  return (
    <div
      style={{
        maxHeight: "300px",
        overflow: "scroll",
      }}
    >
      {data.map((parent) => (
        <div key={`s82-${parent.value}`}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              cursor: "pointer",
            }}
            onClick={() => toggle(parent.value)}
          >
            <Text fw="bold" size="sm">
              {parent.label}
            </Text>
          </div>

          {true &&
            parent.children.map((child) => (
              <div
                key={`849-${parent.value}-${child.value}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingLeft: "24px",
                }}
              >
                <Text size="sm">{child.label}</Text>
                <Text
                  size="sm"
                  data-status-element
                  data-key={`${parent.value}-${child.value}`}
                  style={{
                    borderRadius: "0.25rem",
                    padding: "0 0.25rem",
                    transition: "background-color 0.5s",
                  }}
                >
                  {child.status}
                </Text>
              </div>
            ))}
        </div>
      ))}

      <style jsx global>{`
        .status-highlight {
          background-color: rgb(209 213 219);
          border-radius: 0.25rem;
          padding: 0 0.25rem;
        }
      `}</style>
    </div>
  );
}
