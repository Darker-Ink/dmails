import type { ConnectionOptions } from 'tls';
import Imap from "imap";
import { EventEmitter } from "events";
import { simpleParser, MailParserOptions, ParsedMail } from "mailparser";

export interface MailSettings {
  xoauth2?: string | undefined;
  username: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  connTimeout?: number;
  authTimeout?: number;
  tlsOptions: ConnectionOptions;
  mailbox: string;
  searchFilter: string[];
  markSeen: boolean;
  fetchUnreadOnStart: boolean;
  mailParserOptions?: MailParserOptions;
  debug?: Function | undefined;
}

export interface MailServerListener {
  on(event: "disconnected", listener: () => void): this;
  on(event: "connected", listener: () => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  on(
    event: "mail",
    listener: (
      mail: ParsedMail,
      seqno: number,
      attributes: Imap.ImapMessageAttributes | null
    ) => void
  ): this;

  emit(event: "disconnected"): boolean;
  emit(event: "connected"): boolean;
  emit(event: "error", err: Error): boolean;
  emit(
    event: "mail",
    mail: ParsedMail,
    seqno: number,
    attributes: Imap.ImapMessageAttributes | null
  ): boolean;
}

export class MailServerListener extends EventEmitter {
  markSeen: boolean;
  mailbox: string;
  searchFilter: string[];
  fetchUnreadOnStart: boolean;
  mailParserOptions: MailParserOptions;
  imap: Imap;
  constructor(options: MailSettings) {
    super();

    this.markSeen = !!options.markSeen;

    this.mailbox = options.mailbox || "INBOX";

    this.searchFilter = Array.isArray(options.searchFilter)
      ? options.searchFilter
      : ["UNSEEN"];

    this.fetchUnreadOnStart = !!options.fetchUnreadOnStart;

    this.mailParserOptions = options.mailParserOptions || {};

    this.imap = new Imap({
      xoauth2: options.xoauth2,
      user: options.username,
      password: options.password,
      host: options.host,
      port: options.port,
      tls: options.tls,
      tlsOptions: options.tlsOptions || {},
      connTimeout: options.connTimeout,
      authTimeout: options.authTimeout,
      debug: options.debug,
    });

    this.imap.once("ready", () => this.imapReady());

    this.imap.once("close", () => this.emit("disconnected"));

    this.imap.on("error", (err: Error) => this.emit("error", err));
  }

  start() {
    this.imap.connect();
  }

  stop() {
    this.imap.end();
  }

  imapReady() {
    this.imap.openBox(this.mailbox, false, (err, mailbox) => {
      if (err) {
        this.emit("error", err);
        return;
      }

      this.emit("connected");

      if (this.fetchUnreadOnStart) {
        this.parseUnread();
      }

      this.imap.on("mail", () => this.parseUnread());

      this.imap.on("update", () => this.parseUnread());
    });
  }

  parseUnread(): void {
    this.imap.search(this.searchFilter, async (err, results) => {
      if (err) {
        this.emit("error", err);

        return;
      }

      for (const result of results) {
        const fetched = this.imap.fetch(result, {
          bodies: "",
          markSeen: this.markSeen,
        });

        let attributes: Imap.ImapMessageAttributes | null = null;
        let emlbuffer = Buffer.alloc(0);

        fetched.on("message", (msg, seqno) => {
          msg.on("attributes", (attrs) => {
            attributes = attrs;
          });

          msg.on("body", (stream) => {
            stream.on("data", (chunk) => {
              emlbuffer = Buffer.concat([emlbuffer, chunk]);
            });

            stream.once("end", async () => {
              simpleParser(emlbuffer, this.mailParserOptions, (err, mail) => {
                this.emit("mail", mail, seqno, attributes);
              });
            });
          });
        });
      }
    });
  }
}

export default MailServerListener;