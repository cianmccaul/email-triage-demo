"use client";

import { Sidebar, Toast, TopBar } from "@/components/Chrome";
import { FolderView } from "@/components/FolderView";
import { InboxProvider, useInbox } from "@/components/InboxProvider";
import { HandbookView, SentView } from "@/components/OtherViews";
import { TestBench } from "@/components/TestBench";

function App() {
  const { view, hydrated } = useInbox();

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-4 p-3 sm:p-5">
      <TopBar />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="lg:sticky lg:top-5 lg:w-[240px] lg:shrink-0">
          <Sidebar />
        </div>
        <main className="min-w-0 flex-1">
          {!hydrated ? (
            <div className="panel h-[620px] rounded-[22px]" aria-busy="true" />
          ) : view.kind === "folder" ? (
            <FolderView key={view.folder} folder={view.folder} />
          ) : view.kind === "sent" ? (
            <SentView />
          ) : view.kind === "handbook" ? (
            <HandbookView />
          ) : (
            <TestBench />
          )}
        </main>
      </div>
      <Toast />
    </div>
  );
}

export default function Page() {
  return (
    <InboxProvider>
      <App />
    </InboxProvider>
  );
}
