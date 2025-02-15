export interface MapItemAddedEvent<T extends object = object> {
  item: MapItemDescriptor<T> & { descriptor: T };
  isLocal: boolean;
}

export interface MapItemUpdatedEvent<T extends object = object> {
  item: MapItemDescriptor<T> & { descriptor: T };
  isLocal: boolean;
  previousItemData: T;
}

export interface MapItemRemovedEvent<T extends object = object> {
  key: string;
  isLocal: boolean;
  previousItemData: T;
}

interface MapItemDescriptor<T extends object> {
  key: string;
  url: string;
  last_event_id: number;
  revision: string;
  data: T;
  date_updated: string;
  date_expires?: string | null;
}
