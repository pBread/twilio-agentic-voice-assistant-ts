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
