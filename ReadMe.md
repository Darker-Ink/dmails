# Overview

DMails library for node.js. Get notification when new email arrived to inbox or when message metadata (e.g. flags) changes externally. Uses IMAP protocol.

We are using these libraries: [node-imap](https://github.com/mscdex/node-imap), [mailparser](https://github.com/andris9/mailparser).


## Use

Install

`npm install dmails`

JavaScript Code:


```javascript
const { MailServerListener } = require('dmails');

const mailListener = new MailServerListener({
  username: 'email@example.com', // The Username (email) of the account you want to connect to (Required)
  password: 'xxx', // The Password of the account you want to connect to (Required)
  host: 'mail.example.com', // The Hostname of the IMAP-Server
  port: 993, // The Port of the IMAP-Server
  tls: true, // use secure connection
  searchFilter: ['UNSEEN'], // the search filter being used after an IDLE notification has been retrieved
  mailbox: 'INBOX', // mailbox to monitor
  markSeen: true, // all fetched email willbe marked as seen and not fetched next time
  fetchUnreadOnStart: true, // use it only if you want to get all unread email on lib start. Default is `false`,
  tlsOptions: { // TLS options
    rejectUnauthorized: false
  },
  authTimeout: 3000, // Default by node-imap
  connTimeout: 10000, // Default by node-imap,
  debug: console.log, // Or your custom function with only one incoming argument. Default: null
  mailParserOptions: {}, // options to be passed to mailParser lib.
  xoauth2: undefined // (idk lol)
});

mailListener.on("connected", () => {
  console.log('IMAP has been connected');
});

mailListener.on("disconnected", () => {
  console.log('IMAP has been disconnected');
});

mailListener.on("error", (err) => {
  console.log(err);
});

mailListener.on("mail", (mail, seq, attributes) => {
  console.log(mail); // Do something with the mail object

  console.log(seq) // get the sequence number of the mail

  console.log(attributes) // get all the attributes of the mail
});

mailListener.start();
```

That's easy!

## Credits

This project is a fork of [mail-listener2](https://github.com/chirag04/mail-listener2/) by [chirag04](https://github.com/chirag04).