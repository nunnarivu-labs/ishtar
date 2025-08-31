import { AppLayout } from './app-layout.tsx';
import { AiContent } from './ai-content.tsx';
import { useEffect, useState } from 'react';
import { ChatSettings } from './chat-settings.tsx';
import { useLoaderData } from '@tanstack/react-router';
import { Route } from '../routes/_authenticated/app/{-$conversationId}.tsx';

export const App = () => {
  const { conversationId } = Route.useParams();

  const [isSettingsOpen, setSettingsOpen] = useState(false);

  const user = useLoaderData({ from: '/_authenticated' });

  useEffect(() => {
    document.title = user.displayName;
  }, [user.displayName]);

  return (
    <>
      <AppLayout onSettingsClick={() => setSettingsOpen(true)}>
        <AiContent key={conversationId} />
      </AppLayout>
      <ChatSettings
        key={conversationId}
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
};
