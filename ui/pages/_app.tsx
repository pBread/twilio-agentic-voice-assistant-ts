import { AppStore, makeStore } from "@/state/store";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useRef } from "react";
import { isDev } from "@/util/env";
import { Provider } from "react-redux";

export default function App(props: AppProps) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return (
    <Provider store={storeRef.current}>
      <Main {...props} />
    </Provider>
  );
}

function Main({ Component, pageProps, router }: AppProps) {
  return (
    <>
      <main>
        <Component {...pageProps} />
      </main>
    </>
  );
}
