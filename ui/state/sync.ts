import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { type ConnectionState, SyncClient } from "twilio-sync";
import { v4 as uuidV4 } from "uuid";
import { useAppDispatch, useAppSelector } from "./hooks";
import type { AppDispatch, RootState } from "./store";
import { useEffect } from "react";

const SLICE_NAME = "sync";

let syncClient: SyncClient | undefined;
const identity = `ui-${uuidV4()}`;

interface InitialState {
  newCallSids: string[];
  syncConnectionState: ConnectionState;
  callFetchStatusMap: Record<
    string,
    { context: FetchStatus; turns: FetchStatus }
  >;
}

type FetchStatus = "started" | "done";

const initialState: InitialState = {
  newCallSids: [],
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
} = syncSlice.actions;

export async function initSync(dispatch: AppDispatch) {
  initSyncClient(dispatch);
}

export function useSyncClient() {
  const connectionState = useAppSelector(getSyncConnectionState);

  if (connectionState !== "connected") return;

  return syncClient as SyncClient;
}

async function initSyncClient(dispatch: AppDispatch) {
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

export function useInitializeCall(callSid: string) {
  const dispatch = useAppDispatch();
  const syncClient = useSyncClient();

  const callStatuses = useAppSelector((state) =>
    getCallFetchStatus(state, callSid),
  );

  return useEffect(() => {
    if (!syncClient) return;
    if (callStatuses) return;

    dispatch(
      setCallFetchStatus({ callSid, context: "started", turns: "started" }),
    );
  }, [callStatuses, syncClient]);
}
