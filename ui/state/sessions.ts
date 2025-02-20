import {
  Action,
  createEntityAdapter,
  createSlice,
  ThunkAction,
} from "@reduxjs/toolkit";
import type { SessionContext } from "@shared/session/context";
import type { RootState } from "./store";

const SLICE_NAME = "sessions";

export interface SessionMetaData {
  id: string; // id is callSid
  callSid: string;
  dateCreated: string; // iso
}

export interface StoreSessionContext extends SessionMetaData, SessionContext {}

const adapter = createEntityAdapter<StoreSessionContext>({
  sortComparer: (a, b) => {
    const dateA = new Date(a.dateCreated).getTime();
    const dateB = new Date(b.dateCreated).getTime();
    return dateB - dateA;
  },
});

interface InitialState {}

const initialState: InitialState = {};

export const sessionsSlice = createSlice({
  name: SLICE_NAME,
  initialState: adapter.getInitialState(initialState),
  reducers: {
    addOneSession: adapter.addOne, // represents one entire call session, which aligns to the entire sync map
    addManySessions: adapter.addMany,

    removeOneSession: adapter.removeOne,
    setOneSession: adapter.setOne,
  },
});

/****************************************************
 Selectors
****************************************************/
const selectors = adapter.getSelectors(getSlice);
export const {
  selectAll: selectAllSessions,
  selectById: selectSessionById,
  selectEntities: selectSessionEntities,
  selectIds: selectSessionIds,
  selectTotal: selectSessionTotals,
} = selectors;

function getSlice(state: RootState) {
  return state[SLICE_NAME];
}

/****************************************************
 Actions
****************************************************/
export const {
  addOneSession,
  addManySessions,
  removeOneSession,
  setOneSession,
} = sessionsSlice.actions;

type SetInContextAction<K extends keyof SessionContext = keyof SessionContext> =
  {
    callSid: string;
    key: K;
    value: SessionContext[K];
  };

type SetInThunk = <K extends keyof SessionContext>(
  action: SetInContextAction<K>,
) => ThunkAction<void, RootState, unknown, Action>;

export const setCallContext: SetInThunk = (action) => (dispatch, getState) => {
  const currentContext = selectSessionById(getState(), action.callSid) ?? {
    id: action.callSid,
    callSid: action.callSid,
  };
  const nextContext = { ...currentContext, [action.key]: action.value };
  dispatch(setOneSession(nextContext));
};
