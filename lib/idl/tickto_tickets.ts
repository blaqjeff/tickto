/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/tickto_tickets.json`.
 */
export type TicktoTickets = {
  "address": "Fqqoja5BG9g4mY1mocc8YErH4kdgtzHnM1CrJVzQ5PZZ",
  "metadata": {
    "name": "ticktoTickets",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "cNFT ticketing program using Metaplex Bubblegum V2"
  },
  "instructions": [
    {
      "name": "burnTicket",
      "discriminator": [
        31,
        250,
        96,
        233,
        181,
        137,
        195,
        87
      ],
      "accounts": [
        {
          "name": "leafOwner",
          "signer": true
        },
        {
          "name": "treeConfig",
          "writable": true
        },
        {
          "name": "merkleTree",
          "writable": true
        },
        {
          "name": "bubblegumProgram"
        },
        {
          "name": "compressionProgram"
        },
        {
          "name": "logWrapper"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "root",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "dataHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "creatorHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "nonce",
          "type": "u64"
        },
        {
          "name": "index",
          "type": "u32"
        }
      ]
    },
    {
      "name": "createEvent",
      "discriminator": [
        49,
        219,
        29,
        203,
        22,
        98,
        100,
        87
      ],
      "accounts": [
        {
          "name": "organizer",
          "writable": true,
          "signer": true
        },
        {
          "name": "eventConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  118,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "eventId"
              }
            ]
          }
        },
        {
          "name": "treeConfig",
          "writable": true
        },
        {
          "name": "merkleTree",
          "writable": true
        },
        {
          "name": "bubblegumProgram"
        },
        {
          "name": "compressionProgram"
        },
        {
          "name": "logWrapper"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "eventId",
          "type": "string"
        },
        {
          "name": "eventName",
          "type": "string"
        },
        {
          "name": "metadataUri",
          "type": "string"
        },
        {
          "name": "ticketPriceLamports",
          "type": "u64"
        },
        {
          "name": "maxSupply",
          "type": "u32"
        }
      ]
    },
    {
      "name": "mintTicket",
      "discriminator": [
        159,
        167,
        223,
        60,
        138,
        6,
        23,
        29
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "organizer",
          "writable": true
        },
        {
          "name": "eventConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  118,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "eventId"
              }
            ]
          }
        },
        {
          "name": "treeConfig",
          "writable": true
        },
        {
          "name": "merkleTree",
          "writable": true
        },
        {
          "name": "bubblegumProgram"
        },
        {
          "name": "compressionProgram"
        },
        {
          "name": "logWrapper"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "eventId",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "eventConfig",
      "discriminator": [
        85,
        63,
        74,
        243,
        198,
        192,
        138,
        0
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "soldOut",
      "msg": "Event sold out"
    }
  ],
  "types": [
    {
      "name": "eventConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "organizer",
            "type": "pubkey"
          },
          {
            "name": "eventId",
            "type": "string"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "merkleTree",
            "type": "pubkey"
          },
          {
            "name": "maxSupply",
            "type": "u32"
          },
          {
            "name": "ticketsMinted",
            "type": "u32"
          }
        ]
      }
    }
  ]
};
