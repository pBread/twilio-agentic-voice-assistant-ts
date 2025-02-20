import {
  Action,
  createEntityAdapter,
  createSlice,
  ThunkAction,
} from "@reduxjs/toolkit";
import type { SessionContext } from "@shared/session/context";
import type { RootState } from "./store";

const SLICE_NAME = "context";

export interface StoreSessionContext extends SessionContext {
  id: string; // id is callSid
  callSid: string;
}

const adapter = createEntityAdapter<StoreSessionContext>({
  sortComparer: (a, b) => {
    const dateA = a.call?.startedAt ? new Date(a.call.startedAt).getTime() : 0;
    const dateB = b.call?.startedAt ? new Date(b.call.startedAt).getTime() : 0;
    return dateB - dateA;
  },
});

interface InitialState {}

const initialState: InitialState = {};

export const contextSlice = createSlice({
  name: SLICE_NAME,
  initialState: adapter.getInitialState({} as InitialState),
  reducers: {
    addOneContext: adapter.addOne, // represents one entire call context, which aligns to the entire sync map
    removeOneContext: adapter.removeOne,
    setOneContext: adapter.setOne,
  },
});

/****************************************************
 Selectors
****************************************************/
const selectors = adapter.getSelectors(getSlice);
const { selectAll, selectById, selectEntities, selectTotal } = selectors;
export const selectCallContext = selectById;

function getSlice(state: RootState) {
  return state[SLICE_NAME];
}

/****************************************************
 Actions
****************************************************/
export const { addOneContext, removeOneContext, setOneContext } =
  contextSlice.actions;

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
  const currentContext = selectCallContext(getState(), action.callSid) ?? {
    id: action.callSid,
    callSid: action.callSid,
  };
  const nextContext = { ...currentContext, [action.key]: action.value };
  dispatch(setOneContext(nextContext));
};
