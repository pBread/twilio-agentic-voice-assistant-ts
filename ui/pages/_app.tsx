import { Header } from "@/components/Header";
import { Helmet } from "@/components/Helmet";
import { AppStore, makeStore } from "@/state/store";
import {
  fetchAllCalls,
  initSyncClient,
  useInitializeCall,
  useListenForNewCalls,
} from "@/state/sync";
import "@/styles/globals.css";
import { theme } from "@/styles/theme";
import { isServer } from "@/util/env";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import type { AppProps } from "next/app";
import { useRef } from "react";
import { Provider } from "react-redux";

export default function App(props: AppProps) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
    if (!isServer) initSyncClient(storeRef.current.dispatch);
    if (!isServer) fetchAllCalls(storeRef.current.dispatch); // fetch the initial data needed for the app
  }

  return (
    <MantineProvider theme={theme}>
      <Provider store={storeRef.current}>
        <Main {...props} />
      </Provider>
    </MantineProvider>
  );
}

function Main({ Component, pageProps, router }: AppProps) {
  useListenForNewCalls(); // add a listener for new calls

  const callSid = router.query.callSid as string | undefined;
  useInitializeCall(callSid); // fetch the turns & context for calls

  return (
    <>
      <Helmet />
      <Header />

      <main>
        <Component {...pageProps} />
      </main>
    </>
  );
}
