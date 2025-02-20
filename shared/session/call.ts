// used by the user interface but the type is needed on the server

export interface CallRecord {
  id: string; // also callSid
  callSid: string;

  accountSid: string;

  createdBy: string;
  dateCreated: string;
  dateUpdated: string;

  serviceSid: string;
}
