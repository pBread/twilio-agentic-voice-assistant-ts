import { Header } from "@/components/Header";
import { Helmet } from "@/components/Helmet";
import { AppStore, makeStore } from "@/state/store";
import "@/styles/globals.css";
import { theme } from "@/styles/theme";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import type { AppProps } from "next/app";
import { useRef } from "react";
import { Provider } from "react-redux";

export default function App(props: AppProps) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
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
