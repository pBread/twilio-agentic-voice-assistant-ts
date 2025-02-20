import { parseCallSid } from "@/util/sync-ids";
import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import type { SyncMapInstance } from "twilio/lib/rest/sync/v1/service/syncMap";
import type { AppDispatch, RootState } from "./store";
import { CallRecord } from "@shared/session/call";

const SLICE_NAME = "calls";

interface InitialState {}

const initialState: InitialState = {};

export const callsSlice = createSlice({
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
export const {} = callsSlice.actions;
