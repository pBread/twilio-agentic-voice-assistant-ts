import { Action, configureStore, type Middleware } from "@reduxjs/toolkit";
import { createLogger } from "redux-logger";
import { callsSlice } from "./calls";
import { syncSlice } from "./sync";
import { turnsSlice } from "./turns";
import { contextSlice } from "./context";
import { ThunkAction } from "@reduxjs/toolkit";

const middleware: Middleware[] = [];
if (process.env.NODE_ENV === "development") middleware.push(createLogger());

export const makeStore = () => {
  return configureStore({
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(createLogger()),

    reducer: {
      [callsSlice.name]: callsSlice.reducer,
      [contextSlice.name]: contextSlice.reducer,
      [syncSlice.name]: syncSlice.reducer,
      [turnsSlice.name]: turnsSlice.reducer,
    },
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
export type AppThunkAction<T extends Action> = (
  action: T,
) => ThunkAction<void, RootState, unknown, T>;
