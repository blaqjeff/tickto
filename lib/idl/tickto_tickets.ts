/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/tickto_tickets.json`.
 */
export type TicktoTickets = {
  "address": "Fqqoja5BG9g4mY1mocc8YErH4kdgtzHnM1CrJVzQ5PZZ",
  "metadata": {
    "name": "tickto_tickets",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "cNFT ticketing program using Metaplex Bubblegum V2"
  },
  "instructions": [
    {
      "name": "burn_ticket",
      "discriminator": number[],
      "accounts": any[],
      "args": any[]
    },
    {
      "name": "create_event",
      "discriminator": number[],
      "accounts": any[],
      "args": any[]
    },
    {
      "name": "mint_ticket",
      "discriminator": number[],
      "accounts": any[],
      "args": any[]
    },
    {
      "name": "resell_ticket",
      "discriminator": number[],
      "accounts": any[],
      "args": any[]
    }
  ],
  "accounts": [
    {
      "name": "EventConfig",
      "discriminator": number[]
    }
  ],
  "errors": [
    {
      "code": number,
      "name": string,
      "msg": string
    }
  ],
  "types": [
    {
      "name": "EventConfig",
      "type": {
        "kind": "struct",
        "fields": any[]
      }
    }
  ]
};
