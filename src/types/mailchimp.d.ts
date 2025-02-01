declare module '@mailchimp/mailchimp_marketing' {
  const mailchimp: {
    setConfig: (config: { apiKey: string; server?: string }) => void;
    lists: {
      addListMember: (listId: string, body: any) => Promise<any>;
      getListMember: (listId: string, subscriberHash: string) => Promise<any>;
      updateListMember: (listId: string, subscriberHash: string, body: any) => Promise<any>;
    };
  };
  export default mailchimp;
}

