import {
  CALL_STREAM,
  makeContextMapName,
  makeTurnMapName,
} from "@/util/sync-ids";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CallRecord } from "@shared/session/call";
import { TurnRecord } from "@shared/session/turns";
import { useEffect } from "react";
import { type ConnectionState, SyncClient } from "twilio-sync";
import { v4 as uuidV4 } from "uuid";
import { setOneCall } from "./calls";
import { useAppDispatch, useAppSelector } from "./hooks";
import type { AppDispatch, RootState } from "./store";
import { addOneTurn, removeOneTurn, setOneTurn } from "./turns";

const SLICE_NAME = "sync";

let syncClient: SyncClient | undefined;
const identity = `ui-${uuidV4()}`;

interface InitialState {
  newCallSids: string[];
  syncConnectionState: ConnectionState;
  syncInitStatus: FetchStatus | undefined; // tracks whether the map subscribers have been added
  callFetchStatusMap: Record<
    string,
    { context: FetchStatus; turns: FetchStatus }
  >;
}

type FetchStatus = "started" | "done";

const initialState: InitialState = {
  newCallSids: [],
  syncInitStatus: undefined,
  syncConnectionState: "unknown",
  callFetchStatusMap: {},
};

export const syncSlice = createSlice({
  name: SLICE_NAME,
  initialState,
  reducers: {
    addNewCallId(state, { payload }: PayloadAction<string>) {
      if (state.newCallSids.includes(payload)) return;
      state.newCallSids.push(payload);
    },

    removeNewCallId(state, { payload }: PayloadAction<string>) {
      state.newCallSids = state.newCallSids.filter(
        (callSid) => payload === callSid,
      );
    },

    setCallFetchStatus(
      state,
      {
        payload,
      }: PayloadAction<{
        callSid: string;
        context?: FetchStatus;
        turns?: FetchStatus;
      }>,
    ) {
      const current = state.callFetchStatusMap[payload.callSid];
      const context = payload.context ?? current?.context ?? "started";
      const turns = payload.turns ?? current?.turns ?? "started";
      state.callFetchStatusMap[payload.callSid] = { context, turns };
    },

    setSyncConnectionState(state, { payload }: PayloadAction<ConnectionState>) {
      state.syncConnectionState = payload;
    },

    setSyncInitStatus(state, { payload }: PayloadAction<FetchStatus>) {
      state.syncInitStatus = payload;
    },
  },
});

/****************************************************
 Selectors
****************************************************/
function getSlice(state: RootState) {
  return state[SLICE_NAME];
}

export function getSyncConnectionState(state: RootState) {
  return getSlice(state).syncConnectionState;
}

export function getSyncInitStatus(state: RootState) {
  return getSlice(state).syncInitStatus;
}

export function getNewCallSids(state: RootState) {
  return getSlice(state).newCallSids;
}

function getCallStatusMap(state: RootState) {
  return getSlice(state).callFetchStatusMap;
}

function getCallFetchStatus(state: RootState, callSid: string) {
  return getCallStatusMap(state)[callSid];
}

export function useIsCallLoaded(callSid: string) {
  return useAppSelector((state) => getIsCallLoaded(state, callSid));
}

function getIsCallLoaded(state: RootState, callSid: string) {
  const statusMap = getCallStatusMap(state)[callSid];
  return statusMap?.context === "done" && statusMap?.turns === "done";
}

/****************************************************
 Actions
****************************************************/
export const {
  addNewCallId,
  removeNewCallId,
  setCallFetchStatus,
  setSyncConnectionState,
  setSyncInitStatus,
} = syncSlice.actions;

export function useInitSyncListener() {
  const syncClient = useSyncClient();
  const syncInitStatus = useAppSelector(getSyncInitStatus);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!syncClient) return;
    if (syncInitStatus) return;
    dispatch(setSyncInitStatus("started"));

    (async () => {
      const stream = await syncClient.stream(CALL_STREAM);
      stream.on("messagePublished", async (ev) => {
        const call = ev.message.data as CallRecord;
        dispatch(setOneCall(call));
        dispatch(addNewCallId(call.id));
        setTimeout(() => {
          dispatch(removeNewCallId(call.id));
        }, 3000);

        // useInitializeCall will naturally add the subscribers to the maps for context & turns when a component is rendered that requires that data
      });
    })();
  }, [syncClient, syncInitStatus]);
}

export function useSyncClient() {
  const connectionState = useAppSelector(getSyncConnectionState);

  if (connectionState !== "connected") return;

  return syncClient as SyncClient;
}

export async function initSyncClient(dispatch: AppDispatch) {
  const initialToken = await fetchToken();

  syncClient = new SyncClient(initialToken);

  syncClient.on("tokenAboutToExpire", async () => {
    syncClient!.updateToken(await fetchToken());
  });

  syncClient.on("tokenExpired", async () => {
    syncClient!.updateToken(await fetchToken());
  });

  syncClient.on("connectionStateChanged", async (state) => {
    console.log("SyncClient connectionStateChanged", state);
    dispatch(setSyncConnectionState(state));
  });
}

async function fetchToken() {
  const url = `/api/sync-token?identity=${identity}`;

  try {
    const result = await fetch(url).then((res) => res.json());

    return result.token;
  } catch (error) {
    console.error("Error fetching sync token", error);
    throw error;
  }
}

const tracker: { [key: string]: number } = {};

export function useInitializeCall(callSid?: string) {
  const dispatch = useAppDispatch();
  const syncClient = useSyncClient();

  const callStatuses = useAppSelector(
    (state) => callSid && getCallFetchStatus(state, callSid),
  );

  return useEffect(() => {
    if (!callSid) return;
    if (!syncClient) return;
    if (callStatuses) return;

    tracker[callSid] = (tracker[callSid] ?? 0) + 1;

    dispatch(
      setCallFetchStatus({ callSid, context: "started", turns: "started" }),
    );

    const initSyncContext = async () => {
      const uniqueName = makeContextMapName(callSid);

      const map = await syncClient.map(uniqueName);
      // map.on("itemAdded", (ev) => dispatch(addOneCall(ev.item.data)));
      // map.on("itemRemoved", (ev) => dispatch(removeOneCall(ev.key)));
      // map.on("itemUpdated", (ev) => dispatch(setOneCall(ev.item.data)));

      const items = await map.getItems();

      dispatch(setCallFetchStatus({ callSid, context: "done" }));
    };

    const initTurns = async () => {
      const uniqueName = makeTurnMapName(callSid);

      const map = await syncClient.map(uniqueName);
      map.on("itemAdded", (ev) => {
        dispatch(addOneTurn(ev.item.data));
      });
      map.on("itemRemoved", (ev) => {
        dispatch(removeOneTurn(ev.key));
      });
      map.on("itemUpdated", (ev) => {
        dispatch(setOneTurn(ev.item.data));
      });

      const result = await map.getItems();

      for (const item of result.items)
        dispatch(addOneTurn(item.data as TurnRecord));

      dispatch(setCallFetchStatus({ callSid, turns: "done" }));
    };

    Promise.all([initSyncContext(), initTurns()]);
  }, [callSid, callStatuses, syncClient]);
}
