"use client";

import { trpc } from "@/app/utils/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import React, { useState } from "react";

export function TRPCReactProvider({
  children,
  headers,
}: {
  children: React.ReactNode;
  headers: Record<string, string>;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${
            typeof window !== "undefined" ? window.location.origin : ""
          }/api/trpc`,
          headers() {
            const heads = new Map(Object.entries(headers));
            heads.set("x-trpc-source", "react");
            return Object.fromEntries(heads);
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
