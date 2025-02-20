import { parseCallSid } from "@/util/sync-ids";
import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import type { SyncMapInstance } from "twilio/lib/rest/sync/v1/service/syncMap";
import type { AppDispatch, RootState } from "./store";
import type { SessionContext } from "@shared/session/context";

const SLICE_NAME = "context";

interface InitialState extends Partial<SessionContext> {}

const initialState: InitialState = {
  call: undefined,
  procedures: undefined,
  toolConfig: undefined,
  user: undefined,
};

export const contextSlice = createSlice({
  name: SLICE_NAME,
  initialState,
  reducers: {},
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
export const {} = contextSlice.actions;
