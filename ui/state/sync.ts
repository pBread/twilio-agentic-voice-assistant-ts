import { isServer } from "@/util/env";
import {
  CALL_STREAM,
  makeContextMapName,
  makeTurnMapName,
} from "@/util/sync-ids";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TurnRecord } from "@shared/session/turns";
import { useEffect } from "react";
import { type ConnectionState, SyncClient } from "twilio-sync";
import { v4 as uuidV4 } from "uuid";
import { useAppDispatch, useAppSelector } from "./hooks";
import {
  addManySessions,
  addOneSession,
  SessionMetaData,
  setInSessionContext,
  setOneSession,
  SetSessionContext,
  StoreSessionContext,
} from "./sessions";
import type { AppDispatch, RootState } from "./store";
import { addOneTurn, removeOneTurn, setOneTurn } from "./turns";

const SLICE_NAME = "sync";

let syncClient: SyncClient | undefined;
const identity = `ui-${uuidV4()}`;

type SyncConnectionState = ConnectionState | "started";

interface InitialState {
  newCallSids: string[];
  syncConnectionState: SyncConnectionState;
  dataInitStatus: FetchStatus | undefined; // tracks the initialization of calls
  syncInitStatus: FetchStatus | undefined; // tracks whether the map subscribers have been added
  callFetchStatusMap: Record<
    string,
    { context: FetchStatus; turns: FetchStatus }
  >;
}

type FetchStatus = "started" | "done" | "error";

const initialState: InitialState = {
  newCallSids: [],
  dataInitStatus: undefined,
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

    setSyncConnectionState(
      state,
      { payload }: PayloadAction<SyncConnectionState>,
    ) {
      state.syncConnectionState = payload;
    },

    setDataInitStatus(state, { payload }: PayloadAction<FetchStatus>) {
      state.dataInitStatus = payload;
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

function getDataInitStatus(state: RootState) {
  return getSlice(state).dataInitStatus;
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
  setDataInitStatus,
  setSyncConnectionState,
  setSyncInitStatus,
} = syncSlice.actions;

/****************************************************
 Sync Client
****************************************************/
export function useSyncClient() {
  const connectionState = useAppSelector(getSyncConnectionState);

  if (connectionState !== "connected") return;

  return syncClient as SyncClient;
}

export async function fetchAllCalls(dispatch: AppDispatch) {
  if (isServer) return;
  try {
    dispatch(setDataInitStatus("started"));
    let pageNumber = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(`/api/calls?page=${pageNumber}`);
      if (!response.ok) throw new Error("Network response was not ok");

      const data = (await response.json()) as SessionMetaData[];

      if (data.length === 0) hasMore = false;
      else {
        dispatch(addManySessions(data as StoreSessionContext[]));
        pageNumber++;
      }
    }

    dispatch(setDataInitStatus("done"));
  } catch (error) {
    console.error("Error initializing call data.\n", error);
    dispatch(setDataInitStatus("error"));
    console.error("error occured while initializing calls", error);
  }
}

export async function initSyncClient(dispatch: AppDispatch) {
  if (isServer) return;
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

/****************************************************
 New Call Listener
****************************************************/

export function useListenForNewCalls() {
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
        const session = ev.message.data as SessionMetaData;
        dispatch(setOneSession(session as StoreSessionContext));
        dispatch(addNewCallId(session.id));
        setTimeout(() => {
          dispatch(removeNewCallId(session.id));
        }, 3000);

        // useInitializeCall will naturally add the subscribers to the maps for context & turns when a component is rendered that requires that data
      });
    })();
  }, [syncClient, syncInitStatus]);
}

/****************************************************
 Fetch Context & Turns for a Call
****************************************************/
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

    dispatch(
      setCallFetchStatus({ callSid, context: "started", turns: "started" }),
    );

    const initSyncContext = async () => {
      const uniqueName = makeContextMapName(callSid);

      const map = await syncClient.map(uniqueName);

      dispatch(
        addOneSession({ callSid: callSid, id: callSid } as StoreSessionContext),
      );

      map.on("itemAdded", (ev) =>
        dispatch(
          setInSessionContext({
            callSid,
            key: ev.item.key,
            value: ev.item.data,
          } as SetSessionContext),
        ),
      );

      map.on("itemUpdated", (ev) =>
        dispatch(
          setInSessionContext({
            callSid,
            key: ev.item.key,
            value: ev.item.data,
          } as SetSessionContext),
        ),
      );

      map.on("itemRemoved", (ev) =>
        dispatch(
          setInSessionContext({
            callSid,
            key: ev.key,
            value: ev?.undefined, // hack: undefined with item removed
          } as SetSessionContext),
        ),
      );

      const result = await map.getItems();
      for (const item of result.items)
        dispatch(
          setInSessionContext({
            callSid,
            key: item.key,
            value: item.data,
          } as SetSessionContext),
        );

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
