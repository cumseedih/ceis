import type { NavigationDeclaration } from './navigation.types';

const MAIN_SCROLL = [{ name: 'main', direction: 'vertical', description: 'Main content' }] as const;

export const NAVIGATION_DECLARATION = {
  app: 'ceis',
  routes: [
    {
      path: '/',
      component: 'MusePage',
      params: {},
      entryPoint: 'home',
      scrollContainers: MAIN_SCROLL,
      uiStates: [
        { id: 'ceis.muse.base', search: {}, description: 'The ceis app (chat, feed, goals…)' },
        { id: 'ceis.muse.thread', search: { thread: '*' }, description: 'A specific chat' },
        { id: 'ceis.muse.tab', search: { tab: '*' }, description: 'A specific tab' },
      ],
      queryParams: { thread: 'string', tab: 'string' },
      description: 'ceis, full screen',
    },
    {
      path: '/setup',
      component: 'SetupPage',
      params: {},
      entryPoint: 'none',
      scrollContainers: MAIN_SCROLL,
      uiStates: [{ id: 'ceis.setup.base', search: {}, description: 'Connect to an ceis server' }],
      queryParams: {},
      description: 'Server address and access token',
    },
  ],
  transitions: [
    {
      id: 'muse.open',
      from: '*',
      to: '/',
      search: {},
      searchParams: {},
      mode: 'replace',
      params: {},
      label: 'Show ceis',
      ui: { placement: 'none', icon: 'home', gesture: 'tap' },
    },
    {
      id: 'setup.open',
      from: '*',
      to: '/setup',
      search: {},
      searchParams: {},
      mode: 'push',
      params: {},
      label: 'Change the server ceis connects to',
      ui: { placement: 'content', icon: 'settings', gesture: 'tap' },
    },
  ],
  capabilities: {
    historyBack: true,
  },
} as const satisfies NavigationDeclaration;

export type TransitionId = (typeof NAVIGATION_DECLARATION.transitions)[number]['id'];
