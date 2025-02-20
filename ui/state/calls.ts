import { parseCallSid } from "@/util/sync-ids";
import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import type { SyncMapInstance } from "twilio/lib/rest/sync/v1/service/syncMap";
import type { AppDispatch, RootState } from "./store";
import { CallRecord } from "@shared/session/call";

const SLICE_NAME = "calls";

// todo: this slice is redundant. the context slice includes all of this information

const adapter = createEntityAdapter<CallRecord>({
  sortComparer: (a, b) =>
    new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime(),
});

interface InitialState {
  fetchStatus: "not-started" | "started" | "finished" | "error";
  fetchError?: string;
}

export const callsSlice = createSlice({
  name: SLICE_NAME,
  initialState: adapter.getInitialState({
    fetchError: undefined,
    fetchStatus: "not-started",
  } as InitialState),
  reducers: {
    setFetchStatus: (state, action) => {
      state.fetchStatus = action.payload;
    },
    setFetchError: (state, action) => {
      state.fetchError = action.payload;
    },

    addManyCalls: adapter.addMany,
    addOneCall: adapter.addOne,
    removeAllCalls: adapter.removeAll,
    removeManyCalls: adapter.removeMany,
    removeOneCall: adapter.removeOne,
    setAllCalls: adapter.setAll,
    setManyCalls: adapter.setMany,
    setOneCall: adapter.setOne,
    updateManyCalls: adapter.updateMany,
    updateOneCall: adapter.updateOne,
    upsertManyCalls: adapter.upsertMany,
    upsertOneCall: adapter.upsertOne,
  },
});

/****************************************************
 Selectors
****************************************************/
function getSlice(state: RootState) {
  return state[SLICE_NAME];
}

export const {
  selectAll: selectAllCalls,
  selectById: selectCallById,
  selectIds: selectCallIds,
  selectEntities: selectCallEntities,
  selectTotal: selectCallTotal,
} = adapter.getSelectors(getSlice);

/****************************************************
 Actions
****************************************************/
export const {
  addManyCalls,
  addOneCall,
  removeAllCalls,
  removeManyCalls,
  removeOneCall,
  setAllCalls,
  setManyCalls,
  setOneCall,
  updateManyCalls,
  updateOneCall,
  upsertManyCalls,
  upsertOneCall,
} = callsSlice.actions;

export async function fetchAllCalls(dispatch: AppDispatch) {
  dispatch(callsSlice.actions.setFetchStatus("started"));

  try {
    let pageNumber = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(`/api/calls?page=${pageNumber}`);
      if (!response.ok) throw new Error("Network response was not ok");

      const data = (await response.json()) as CallRecord[];

      if (data.length === 0) hasMore = false;
      else {
        dispatch(callsSlice.actions.upsertManyCalls(data));
        pageNumber++;
      }
    }

    dispatch(callsSlice.actions.setFetchStatus("finished"));
  } catch (error) {
    console.error("Error initializing call data.\n", error);
    dispatch(callsSlice.actions.setFetchStatus("error"));
    dispatch(
      callsSlice.actions.setFetchError(
        error instanceof Error ? error.message : "An unknown error occurred",
      ),
    );
  }
}

/****************************************************
 Misc
****************************************************/
// this is currently duplicated in the server
export function syncMapToCallRecord(map: SyncMapInstance): CallRecord {
  const callSid = parseCallSid(map.uniqueName) as string;

  return {
    accountSid: map.accountSid,
    callSid,
    createdBy: map.createdBy,
    dateCreated: map.dateCreated.toISOString(),
    dateUpdated: map.dateUpdated.toISOString(),
    id: callSid,
    serviceSid: map.serviceSid,
  };
}
