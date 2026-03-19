use anchor_lang::prelude::*;
use anchor_lang::system_program;
use mpl_bubblegum::instructions::{
    CreateTreeConfigV2CpiBuilder, MintV2CpiBuilder, BurnV2CpiBuilder,
};
use mpl_bubblegum::types::{MetadataArgsV2, TokenProgramVersion, TokenStandard, Creator};

declare_id!("Fqqoja5BG9g4mY1mocc8YErH4kdgtzHnM1CrJVzQ5PZZ");

#[program]
pub mod tickto_tickets {
    use super::*;

    pub fn create_event(
        ctx: Context<CreateEvent>,
        event_id: String,
        _event_name: String,
        _metadata_uri: String,
        _ticket_price_lamports: u64,
        max_supply: u32,
    ) -> Result<()> {
        let event_config = &mut ctx.accounts.event_config;
        event_config.organizer = ctx.accounts.organizer.key();
        event_config.event_id = event_id;
        event_config.bump = ctx.bumps.event_config;
        event_config.merkle_tree = ctx.accounts.merkle_tree.key();
        event_config.max_supply = max_supply;
        event_config.tickets_minted = 0;

        // Note: The actual Merkle tree account initialization (system program create account + spl-compression init)
        // and the Bubblegum create_tree_config are now handled OUTSIDE the program as a one-time global setup.
        // We simply store the designated shared tree pubkey in the EventConfig here.

        Ok(())
    }

    pub fn mint_ticket(
        ctx: Context<MintTicket>,
        _event_id: String,
    ) -> Result<()> {
        let event_config = &mut ctx.accounts.event_config;
        
        // Basic check for supply
        if event_config.tickets_minted >= event_config.max_supply {
            return err!(ErrorCode::SoldOut);
        }
        event_config.tickets_minted += 1;

        // Payment logic would go here (transfer SOL from buyer to organizer)
        // Skipped for MVP to focus on Minting

        // Mint cNFT
        // We look up the event metadata
        // In a real app, these would be passed as arguments or stored in EventConfig.
        // For now, we use placeholders or simple data.
        
        let metadata = MetadataArgsV2 {
            name: {
                let full = format!("TiCkTo #{}", &event_config.event_id[..8.min(event_config.event_id.len())]);
                if full.len() > 32 { full[..32].to_string() } else { full }
            },
            symbol: "TICK".to_string(),
            uri: "https://tickto.com/metadata/placeholder".to_string(),
            seller_fee_basis_points: 0,
            primary_sale_happened: false,
            is_mutable: true,
            // Removed: edition_nonce, uses, token_program_version (not in V2)
            token_standard: Some(TokenStandard::NonFungible),
            collection: None, // Can link to a collection NFT here
            creators: vec![Creator {
                address: ctx.accounts.organizer.key(),
                verified: false, // Organizer is not signer here, so can't verify unless we make them signer
                share: 100,
            }],
        };

        // Prepare AccountInfos for CPI
        let tree_config_info = ctx.accounts.tree_config.to_account_info();
        let leaf_owner_info = ctx.accounts.buyer.to_account_info();
        let leaf_delegate_info = ctx.accounts.master_tree_authority.to_account_info();
        let merkle_tree_info = ctx.accounts.merkle_tree.to_account_info();
        let payer_info = ctx.accounts.backend_authority.to_account_info();
        let tree_creator_or_delegate_info = ctx.accounts.master_tree_authority.to_account_info();
        let log_wrapper_info = ctx.accounts.log_wrapper.to_account_info();
        let compression_program_info = ctx.accounts.compression_program.to_account_info();
        let system_program_info = ctx.accounts.system_program.to_account_info();
        
        let bubblegum_program_info = ctx.accounts.bubblegum_program.to_account_info();
        let mpl_core_program_info = ctx.accounts.mpl_core_program.to_account_info();
        let mut cpi_builder = MintV2CpiBuilder::new(
            &bubblegum_program_info
        );

        cpi_builder
            .tree_config(&tree_config_info)
            .leaf_owner(&leaf_owner_info)
            .leaf_delegate(Some(&leaf_delegate_info)) // Optional
            .merkle_tree(&merkle_tree_info)
            .payer(&payer_info)
            .tree_creator_or_delegate(Some(&tree_creator_or_delegate_info)) // The Master PDA is the delegate
            .log_wrapper(&log_wrapper_info)
            .compression_program(&compression_program_info)
            .system_program(&system_program_info)
            .mpl_core_program(&mpl_core_program_info)
            .metadata(metadata)
            .invoke_signed(&[&[
                b"master_tree",
                &[ctx.bumps.master_tree_authority], // Use the PDA bump to sign
            ]])?;

        Ok(())
    }

    pub fn burn_ticket<'info>(
        ctx: Context<'_, '_, '_, 'info, BurnTicket<'info>>, 
        root: [u8; 32],
        data_hash: [u8; 32],
        creator_hash: [u8; 32],
        nonce: u64,
        index: u32,
    ) -> Result<()> {
        let bubblegum_program_info = ctx.accounts.bubblegum_program.to_account_info();
        let tree_config_info = ctx.accounts.tree_config.to_account_info();
        let leaf_owner_info = ctx.accounts.leaf_owner.to_account_info();
        let leaf_delegate_info = ctx.accounts.master_tree_authority.to_account_info();
        let merkle_tree_info = ctx.accounts.merkle_tree.to_account_info();
        let log_wrapper_info = ctx.accounts.log_wrapper.to_account_info();
        let compression_program_info = ctx.accounts.compression_program.to_account_info();
        let system_program_info = ctx.accounts.system_program.to_account_info();

        let mut cpi_builder = BurnV2CpiBuilder::new(&bubblegum_program_info);

        cpi_builder
            .tree_config(&tree_config_info)
            .leaf_owner(&leaf_owner_info)
            .leaf_delegate(Some(&leaf_delegate_info))
            .merkle_tree(&merkle_tree_info)
            .log_wrapper(&log_wrapper_info)
            .compression_program(&compression_program_info)
            .system_program(&system_program_info)
            .root(root)
            .data_hash(data_hash)
            .creator_hash(creator_hash)
            .nonce(nonce)
            .index(index);
            
        for account in ctx.remaining_accounts.iter() {
            cpi_builder.add_remaining_account(account, false, false);
        }

        cpi_builder.invoke_signed(&[&[
            b"master_tree",
            &[ctx.bumps.master_tree_authority],
        ]])?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(event_id: String)]
pub struct CreateEvent<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,

    #[account(
        init,
        payer = organizer,
        space = 8    // Anchor discriminator
             + 32   // organizer: Pubkey
             + (4 + 64) // event_id: String (4 byte len prefix + max 64 chars)
             + 1    // bump: u8
             + 32   // merkle_tree: Pubkey
             + 4    // max_supply: u32
             + 4,   // tickets_minted: u32
             // Total: 149 bytes
        seeds = [b"event", event_id.as_bytes()],
        bump
    )]
    pub event_config: Account<'info, EventConfig>,

    /// CHECK: Merely defining the associated tree, not interacting with it yet
    pub merkle_tree: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(event_id: String)]
pub struct MintTicket<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// The backend relayer that co-signs to authorize minting (prevents free ticket exploits)
    #[account(mut)]
    pub backend_authority: Signer<'info>,

    /// CHECK: Funds destination
    #[account(mut)]
    pub organizer: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"event", event_id.as_bytes()],
        bump = event_config.bump,
    )]
    pub event_config: Account<'info, EventConfig>,

    /// CHECK: The PDA acting as the global shared tree delegate
    #[account(
        seeds = [b"master_tree"],
        bump
    )]
    pub master_tree_authority: UncheckedAccount<'info>,

    /// CHECK: Validated by Bubblegum CPI
    #[account(mut)]
    pub tree_config: UncheckedAccount<'info>,

    /// CHECK: Validated by Bubblegum CPI
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: Metaplex Bubblegum Program ID
    pub bubblegum_program: UncheckedAccount<'info>,
    /// CHECK: SPL Account Compression Program ID
    pub compression_program: UncheckedAccount<'info>,
    /// CHECK: SPL Noop Program ID
    pub log_wrapper: UncheckedAccount<'info>,
    /// CHECK: MPL Core Program ID (required by Bubblegum V2)
    pub mpl_core_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BurnTicket<'info> {
    /// CHECK: The PDA acting as the global shared tree delegate
    #[account(
        mut,
        seeds = [b"master_tree"],
        bump
    )]
    pub master_tree_authority: UncheckedAccount<'info>,

    /// CHECK: Leaf owner doesn't need to sign since we have the PDA delegate
    pub leaf_owner: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>, // Backend admin wallet paying gas


    /// CHECK: Validated by Bubblegum CPI
    #[account(mut)]
    pub tree_config: UncheckedAccount<'info>,

    /// CHECK: Validated by Bubblegum CPI
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: Metaplex Bubblegum Program ID
    pub bubblegum_program: UncheckedAccount<'info>,
    /// CHECK: SPL Account Compression Program ID
    pub compression_program: UncheckedAccount<'info>,
    /// CHECK: SPL Noop Program ID
    pub log_wrapper: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct EventConfig {
    pub organizer: Pubkey,
    pub event_id: String, // Limit length?
    pub bump: u8,
    pub merkle_tree: Pubkey,
    pub max_supply: u32,
    pub tickets_minted: u32,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Event sold out")]
    SoldOut,
}
