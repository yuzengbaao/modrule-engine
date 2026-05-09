declare namespace Devvit {
  interface Context {
    reddit: RedditAPI;
    userId?: string;
    ui: UIAPI;
  }

  interface RedditAPI {
    getCurrentSubredditName(): string;
    remove(postId: string, spam?: boolean): Promise<void>;
    approve(postId: string): Promise<void>;
    banUser(options: any): Promise<void>;
    muteUser(options: any): Promise<void>;
    sendPrivateMessage(options: any): Promise<void>;
    setFlair(options: any): Promise<void>;
    lock(postId: string): Promise<void>;
    addRemovalReason(postId: string, reason: string): Promise<void>;
  }

  interface UIAPI {
    showForm(form: any): void;
    showToast(message: string): void;
    navigateTo(url: string): void;
  }

  function configure(config: any): void;
  function addMenuItem(item: any): void;
  function addTrigger(trigger: any): void;
  function addScheduler(scheduler: any): void;
  function addCustomPostType(postType: any): void;
}

declare module '@devvit/public-api' {
  export = Devvit;
}