(function () {
  if (typeof window.Event === 'function') return;

  abstract class Event {
    prototype: Event;
    readonly bubbles: boolean;
    cancelBubble: boolean;
    readonly cancelable: boolean;
    readonly composed: boolean;
    readonly currentTarget: EventTarget | null;
    readonly defaultPrevented: boolean;
    readonly eventPhase: number;
    readonly isTrusted: boolean;
    returnValue: boolean;
    /** @deprecated */
    readonly srcElement: EventTarget | null;
    readonly target: EventTarget | null;
    readonly timeStamp: number;
    readonly type: string;
    composedPath: () => EventTarget[] = () => [];
    initEvent: (type: string, bubbles?: boolean, cancelable?: boolean) => void = () => undefined;
    preventDefault: () => void = () => undefined;
    stopImmediatePropagation: () => void = () => undefined;
    stopPropagation: () => void = () => undefined;
    readonly AT_TARGET: number;
    readonly BUBBLING_PHASE: number;
    readonly CAPTURING_PHASE: number;
    readonly NONE: number;

    constructor(type: string, eventInitDict: EventInit = { bubbles: false, cancelable: false, composed: false }) {
      this.type = type;
      this.bubbles = eventInitDict?.bubbles;
      this.cancelable = eventInitDict?.cancelable;
      this.composed = eventInitDict?.composed;
    }
  }

  window.MessageEvent = class MessageEvent<T = any> extends Event {
    readonly data: T;
    readonly lastEventId: string;
    readonly origin: string;
    readonly ports: ReadonlyArray<MessagePort>;
    readonly source: MessageEventSource | null;

    constructor(type: string, eventInitDict?: MessageEventInit) {
      super(type, eventInitDict);
      this.data = eventInitDict?.data;
      this.lastEventId = eventInitDict?.lastEventId;
      this.origin = eventInitDict?.origin;
      this.ports = eventInitDict?.ports;
      this.source = eventInitDict?.source;
    }
  };

  window.ErrorEvent = class ErrorEvent extends Event {
    readonly colno: number;
    readonly error: any;
    readonly filename: string;
    readonly lineno: number;
    readonly message: string;

    constructor(type: string, eventInitDict?: ErrorEventInit) {
      super(type, eventInitDict);
      this.colno = eventInitDict?.colno;
      this.error = eventInitDict?.error;
      this.filename = eventInitDict?.filename;
      this.lineno = eventInitDict?.lineno;
      this.message = eventInitDict?.message;
    }
  };
})();
