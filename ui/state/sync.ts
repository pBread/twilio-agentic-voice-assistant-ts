import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { type ConnectionState, SyncClient } from "twilio-sync";
import type { RootState } from "./store";

let syncClient: SyncClient | undefined;

const SLICE_NAME = "sync";

interface InitialState {
  syncConnectionState: ConnectionState;
  callMessageListeners: Record<string, "new" | "done">;
  newCallSids: string[];
}

const initialState: InitialState = {
  syncConnectionState: "unknown",
  callMessageListeners: {},
  newCallSids: [],
};

export const syncSlice = createSlice({
  name: SLICE_NAME,
  initialState,
  reducers: {
    setSyncConnectionState(state, { payload }: PayloadAction<ConnectionState>) {
      state.syncConnectionState = payload;
    },

    addNewCallId(state, { payload }: PayloadAction<string>) {
      if (state.newCallSids.includes(payload)) return;
      state.newCallSids.push(payload);
    },

    removeNewCallId(state, { payload }: PayloadAction<string>) {
      state.newCallSids = state.newCallSids.filter(
        (callSid) => payload === callSid,
      );
    },
  },
});

/****************************************************
 Selectors
****************************************************/
function getSlice(state: RootState) {
  return state[SLICE_NAME];
}

/****************************************************
 Actions
****************************************************/
export const { setSyncConnectionState, addNewCallId, removeNewCallId } =
  syncSlice.actions;
