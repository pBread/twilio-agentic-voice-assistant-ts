import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { type ConnectionState, SyncClient } from "twilio-sync";
import { useAppSelector } from "./hooks";
import type { AppDispatch, RootState } from "./store";
import { v4 as uuidV4 } from "uuid";

const SLICE_NAME = "sync";

let syncClient: SyncClient | undefined;
const identity = `ui-${uuidV4()}`;

interface InitialState {
  syncConnectionState: ConnectionState;
  newCallSids: string[];
}

const initialState: InitialState = {
  syncConnectionState: "unknown",
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

export function getSyncConnectionState(state: RootState) {
  return getSlice(state).syncConnectionState;
}

export function getNewCallSids(state: RootState) {
  return getSlice(state).newCallSids;
}

/****************************************************
 Actions
****************************************************/
export const { setSyncConnectionState, addNewCallId, removeNewCallId } =
  syncSlice.actions;

export async function initSync(dispatch: AppDispatch) {
  initSyncClient(dispatch);
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
