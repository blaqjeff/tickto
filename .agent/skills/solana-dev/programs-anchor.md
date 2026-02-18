---
name: programs-anchor
description: Anchor program development patterns, macros, account types, constraints, CPIs, error handling, testing, and security best practices.
---

# Programs with Anchor (default choice)

## When to use Anchor
Use Anchor by default when:
- You want fast iteration with reduced boilerplate
- You want an IDL and TypeScript client story out of the box
- You want mature testing and workspace tooling
- You need built-in security through automatic account validation

## Core Macros

### `declare_id!()`
Declares the onchain address where the program resides.

### `#[program]`
Marks the module containing every instruction entrypoint.

### `#[derive(Accounts)]`
Lists accounts an instruction requires and enforces constraints.

### `#[error_code]`
Custom error types with `#[msg(...)]` attributes.

## Account Types

| Type | Purpose |
|------|---------|
| `Signer<'info>` | Verifies the account signed |
| `SystemAccount<'info>` | Confirms System Program ownership |
| `Program<'info, T>` | Validates executable program accounts |
| `Account<'info, T>` | Typed program account with validation |
| `UncheckedAccount<'info>` | Raw, manual validation needed |

## PDA-Signed CPIs
```rust
let seeds = &[b"vault".as_ref(), &[ctx.bumps.vault]];
let signer = &[&seeds[..]];
let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
```

## Compatibility Notes for Anchor 0.32.0
```bash
cargo update base64ct --precise 1.6.0
cargo update constant_time_eq --precise 0.4.1
cargo update blake3 --precise 1.5.5
```

Add `solana-program = "3"` to program's Cargo.toml if needed.
